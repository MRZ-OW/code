"""Real-time duplex audio plumbing built on sounddevice (PortAudio / WASAPI).

The golden rule of real-time audio: **audio callbacks must never block**. So the
model never runs inside a callback. Instead:

  input callback  ──► in_q  ──► worker thread (runs the model) ──► out_q ──► output callback

Bounded queues give back-pressure and a fixed, measurable latency. On overrun
(model can't keep up) or underrun (model fell behind) we drop/feed-silence and
count it, rather than blocking and crackling the whole stream.

sounddevice is imported lazily so the rest of the package imports fine on
headless machines without PortAudio.
"""

from __future__ import annotations

import logging
import queue
import threading
from typing import Callable, Optional

import numpy as np

from .config import AudioConfig

log = logging.getLogger("voicebridge.audio")

Processor = Callable[[np.ndarray], np.ndarray]


def list_devices() -> str:
    """Human-readable table of audio devices (for the CLI/GUI and docs)."""
    import sounddevice as sd

    return str(sd.query_devices())


def resolve_device(spec, kind: str) -> Optional[int]:
    """Resolve a device spec to a PortAudio index.

    ``spec`` may be: "default"/None (-> system default), an int / numeric string
    (-> that index), or a case-insensitive substring of the device name. ``kind``
    is "input" or "output" and restricts matches to devices with the right
    channel direction.
    """
    import sounddevice as sd

    if spec is None or (isinstance(spec, str) and spec.strip().lower() in ("", "default")):
        return None
    if isinstance(spec, int) or (isinstance(spec, str) and spec.strip().lstrip("-").isdigit()):
        return int(spec)

    want = "max_input_channels" if kind == "input" else "max_output_channels"
    needle = str(spec).lower()
    matches = []
    for idx, dev in enumerate(sd.query_devices()):
        if dev[want] > 0 and needle in dev["name"].lower():
            matches.append((idx, dev["name"]))
    if not matches:
        raise ValueError(
            f"No {kind} device matching {spec!r}. Run `python -m voicebridge devices` "
            f"to see available devices."
        )
    if len(matches) > 1:
        log.warning(
            "Multiple %s devices match %r: %s — using the first (%s).",
            kind, spec, [m[1] for m in matches], matches[0][1],
        )
    return matches[0][0]


class AudioPipeline:
    def __init__(
        self,
        audio_cfg: AudioConfig,
        block_frames: int,
        processor: Processor,
        on_tick: Optional[Callable[[], None]] = None,
        queue_blocks: int = 8,
    ) -> None:
        self.cfg = audio_cfg
        self.block_frames = block_frames
        self.processor = processor
        self.on_tick = on_tick

        self.in_q: "queue.Queue[np.ndarray]" = queue.Queue(maxsize=queue_blocks)
        self.out_q: "queue.Queue[np.ndarray]" = queue.Queue(maxsize=queue_blocks)
        self.monitor_q: "queue.Queue[np.ndarray]" = queue.Queue(maxsize=queue_blocks)

        self.dropouts = 0
        self.running = False
        self._worker: Optional[threading.Thread] = None
        self._in_stream = None
        self._out_stream = None
        self._mon_stream = None

    # -- lifecycle ---------------------------------------------------------
    def start(self) -> None:
        import sounddevice as sd

        in_dev = resolve_device(self.cfg.input_device, "input")
        out_dev = resolve_device(self.cfg.output_device, "output")
        mon_dev = (
            resolve_device(self.cfg.monitor_device, "output")
            if self.cfg.monitor_device
            else None
        )
        log.info(
            "Audio devices | in=%s out=%s monitor=%s @ %d Hz",
            _name(in_dev), _name(out_dev), _name(mon_dev) if mon_dev is not None else "off",
            self.cfg.samplerate,
        )

        self.running = True
        self._worker = threading.Thread(target=self._run_worker, name="vb-worker", daemon=True)
        self._worker.start()

        self._in_stream = sd.InputStream(
            samplerate=self.cfg.samplerate,
            blocksize=self.block_frames,
            device=in_dev,
            channels=1,
            dtype="float32",
            callback=self._on_input,
        )
        self._out_stream = sd.OutputStream(
            samplerate=self.cfg.samplerate,
            blocksize=self.block_frames,
            device=out_dev,
            channels=self.cfg.channels,
            dtype="float32",
            callback=self._on_output,
        )
        self._in_stream.start()
        self._out_stream.start()
        if mon_dev is not None:
            self._mon_stream = sd.OutputStream(
                samplerate=self.cfg.samplerate,
                blocksize=self.block_frames,
                device=mon_dev,
                channels=self.cfg.channels,
                dtype="float32",
                callback=self._on_monitor,
            )
            self._mon_stream.start()

    def stop(self) -> None:
        self.running = False
        for stream in (self._in_stream, self._out_stream, self._mon_stream):
            if stream is not None:
                try:
                    stream.stop()
                    stream.close()
                except Exception:
                    pass
        self._in_stream = self._out_stream = self._mon_stream = None
        if self._worker is not None:
            self._worker.join(timeout=1.0)
            self._worker = None

    # -- callbacks (run on PortAudio threads; keep them tiny) --------------
    def _on_input(self, indata, frames, time_info, status) -> None:
        if status:
            log.debug("input status: %s", status)
        mono = np.ascontiguousarray(indata[:, 0], dtype=np.float32)
        try:
            self.in_q.put_nowait(mono.copy())
        except queue.Full:
            self.dropouts += 1  # overrun: worker is behind; drop this block

    def _on_output(self, outdata, frames, time_info, status) -> None:
        if status:
            log.debug("output status: %s", status)
        block = self._pop_output()
        self._write(outdata, block, frames)

    def _on_monitor(self, outdata, frames, time_info, status) -> None:
        try:
            block = self.monitor_q.get_nowait()
        except queue.Empty:
            block = None
        self._write(outdata, block, frames)

    def _pop_output(self) -> Optional[np.ndarray]:
        try:
            return self.out_q.get_nowait()
        except queue.Empty:
            self.dropouts += 1  # underrun: nothing ready, play silence
            return None

    def _write(self, outdata, block: Optional[np.ndarray], frames: int) -> None:
        if block is None:
            outdata.fill(0.0)
            return
        if len(block) != frames:
            fitted = np.zeros(frames, dtype=np.float32)
            n = min(frames, len(block))
            fitted[:n] = block[:n]
            block = fitted
        for ch in range(outdata.shape[1]):
            outdata[:, ch] = block

    # -- worker thread (the only place the model runs) ---------------------
    def _run_worker(self) -> None:
        while self.running:
            try:
                block = self.in_q.get(timeout=0.1)
            except queue.Empty:
                continue
            try:
                out = self.processor(block)
            except Exception:
                log.exception("processor error; emitting silence for this block")
                out = np.zeros_like(block)
            _offer(self.out_q, out)
            if self._mon_stream is not None:
                _offer(self.monitor_q, out)
            if self.on_tick is not None:
                self.on_tick()


def _offer(q: "queue.Queue[np.ndarray]", item: np.ndarray) -> None:
    """Put without blocking; if full, drop the oldest to favour fresh audio."""
    try:
        q.put_nowait(item)
    except queue.Full:
        try:
            q.get_nowait()
            q.put_nowait(item)
        except queue.Empty:
            pass


def _name(idx: Optional[int]) -> str:
    if idx is None:
        return "default"
    try:
        import sounddevice as sd

        return f"[{idx}] {sd.query_devices(idx)['name']}"
    except Exception:
        return f"[{idx}]"
