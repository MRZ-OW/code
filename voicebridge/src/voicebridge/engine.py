"""The real-time conversion engine: chunking, context, crossfade, latency.

``ChunkProcessor`` is the pure streaming algorithm (NumPy only, unit-testable):
it turns a stream of device-rate audio blocks into a stream of converted blocks,
hiding chunk seams with an equal-power overlap-add crossfade and giving the model
lookback via a context window. It is exactly the algorithm in docs/DESIGN.md §4.

``RealtimeEngine`` wires a ChunkProcessor to a backend and the audio pipeline,
and exposes live meters for the GUI.
"""

from __future__ import annotations

import logging
import time

import numpy as np

from . import dsp
from .audio_io import AudioPipeline
from .config import Config
from .converter import VoiceConverter, build_converter

log = logging.getLogger("voicebridge.engine")


class ChunkProcessor:
    """Stateful, single-threaded streaming converter.

    All internal buffers live at the converter's sample rate ("pipeline SR").
    Device-rate audio is resampled in on the way through ``process`` and back out.
    """

    def __init__(self, converter: VoiceConverter, stream_cfg, device_sr: int) -> None:
        self.converter = converter
        self.pipeline_sr = converter.sample_rate
        self.device_sr = device_sr

        self.crossfade_n = max(0, int(round(stream_cfg.crossfade_ms / 1000.0 * self.pipeline_sr)))
        self.context_n = max(0, int(round(stream_cfg.context_ms / 1000.0 * self.pipeline_sr)))

        self._context = np.zeros(self.context_n, dtype=np.float32)
        self._prev_tail = np.zeros(self.crossfade_n, dtype=np.float32)

        # live telemetry (read by the GUI/CLI; written here)
        self.last_infer_ms: float = 0.0
        self.input_rms: float = 0.0
        self.output_rms: float = 0.0

    def process(self, device_block: np.ndarray) -> np.ndarray:
        """Convert one device-rate mono block; returns a device-rate mono block
        of the same length."""
        out_frames = len(device_block)
        self.input_rms = dsp.rms(device_block)

        # 1. device SR -> pipeline SR
        x = dsp.resample(device_block, self.device_sr, self.pipeline_sr)
        b = len(x)
        xf = min(self.crossfade_n, b)  # crossfade can't exceed the block

        # 2. prepend context (lookback) and slide the window
        model_in = np.concatenate([self._context, x]) if self.context_n else x
        if self.context_n:
            self._context = model_in[-self.context_n:].astype(np.float32, copy=True)

        # 3. run the model
        t0 = time.perf_counter()
        y = self.converter.convert(model_in)
        self.last_infer_ms = (time.perf_counter() - t0) * 1000.0
        # defensively length-preserve
        if len(y) != len(model_in):
            y = _fit(y, len(model_in))

        # 4. take the tail corresponding to (block + crossfade overlap)
        seg = y[-(b + xf):] if (b + xf) > 0 else y
        seg = _fit(seg, b + xf)

        # 5. equal-power crossfade the head with the previous tail; body verbatim
        play = np.empty(b, dtype=np.float32)
        if xf > 0:
            prev = _fit(self._prev_tail, xf)
            play[:xf] = dsp.crossfade(prev, seg[:xf])
        play[xf:] = seg[xf:b]

        # 6. remember the overlap tail for next time
        self._prev_tail = seg[b:b + xf].astype(np.float32, copy=True) if xf > 0 else self._prev_tail

        # 7. pipeline SR -> device SR, match the requested block length, protect output
        out = dsp.resample(play, self.pipeline_sr, self.device_sr)
        out = _fit(out, out_frames)
        out = dsp.soft_clip(out)
        self.output_rms = dsp.rms(out)
        return out


def _amp_to_db(amplitude: float) -> float:
    """Convert a linear RMS amplitude to dBFS."""
    return 20.0 * float(np.log10(max(amplitude, 1e-9)))


def _fit(a: np.ndarray, n: int) -> np.ndarray:
    """Trim or zero-pad ``a`` to exactly length ``n`` (real-time safety net)."""
    if len(a) == n:
        return a.astype(np.float32, copy=False)
    if len(a) > n:
        return a[:n].astype(np.float32, copy=False)
    out = np.zeros(n, dtype=np.float32)
    out[: len(a)] = a
    return out


class RealtimeEngine:
    """Owns the converter, the chunk processor, and the audio pipeline."""

    def __init__(self, config: Config) -> None:
        self.config = config
        self.converter: VoiceConverter | None = None
        self.processor: ChunkProcessor | None = None
        self.pipeline: AudioPipeline | None = None
        self._last_report = 0.0

    # -- lifecycle ---------------------------------------------------------
    def start(self) -> None:
        cfg = self.config
        log.info("Building backend: %s", cfg.backend)
        self.converter = build_converter(cfg)
        log.info("Warming up backend ...")
        self.converter.warmup()

        self.processor = ChunkProcessor(self.converter, cfg.stream, cfg.audio.samplerate)
        block_frames = int(round(cfg.stream.block_ms / 1000.0 * cfg.audio.samplerate))

        self.pipeline = AudioPipeline(
            audio_cfg=cfg.audio,
            block_frames=block_frames,
            processor=self.processor.process,
            on_tick=self._maybe_report if cfg.logging.show_latency else None,
        )
        algo = cfg.stream.block_ms + cfg.stream.crossfade_ms
        log.info(
            "Starting engine | block=%dms crossfade=%dms context=%dms "
            "| pipeline_sr=%d device_sr=%d | est. added latency ~%dms + inference",
            cfg.stream.block_ms, cfg.stream.crossfade_ms, cfg.stream.context_ms,
            self.processor.pipeline_sr, cfg.audio.samplerate, algo,
        )
        self.pipeline.start()

    def stop(self) -> None:
        if self.pipeline is not None:
            self.pipeline.stop()
            self.pipeline = None
        if self.converter is not None:
            self.converter.close()
            self.converter = None

    @property
    def running(self) -> bool:
        return self.pipeline is not None and self.pipeline.running

    # -- telemetry ---------------------------------------------------------
    def levels(self) -> tuple[float, float, float]:
        """(input_rms, output_rms, last_infer_ms) for the GUI meters."""
        if self.processor is None:
            return 0.0, 0.0, 0.0
        return self.processor.input_rms, self.processor.output_rms, self.processor.last_infer_ms

    def _maybe_report(self) -> None:
        now = time.perf_counter()
        if now - self._last_report < 2.0 or self.processor is None:
            return
        self._last_report = now
        in_db = _amp_to_db(self.processor.input_rms)
        out_db = _amp_to_db(self.processor.output_rms)
        drops = self.pipeline.dropouts if self.pipeline else 0
        log.info(
            "in %5.1f dBFS | out %5.1f dBFS | infer %5.1f ms | dropouts %d",
            in_db, out_db, self.processor.last_infer_ms, drops,
        )
