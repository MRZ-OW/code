"""Guided recording tool — capture clean training data for your voice clone.

Final model quality is dominated by the quality of *this* recording, not by
clever settings later. So this tool enforces the boring essentials: mono, a
consistent and non-clipping level, light silence trimming, and a known sample
rate. It walks you sentence-by-sentence through docs/sentences.txt.

Usage:
    python -m voicebridge record                 # full guided dataset
    python -m voicebridge record --reference     # one ~30s clip for zero-shot Seed-VC
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np

log = logging.getLogger("voicebridge.record")

DEFAULT_SR = 48000  # record high; training tools downsample as needed


def _record_until_enter(samplerate: int) -> np.ndarray:
    """Record mono audio from the default input until the user presses Enter."""
    import sounddevice as sd

    chunks: list[np.ndarray] = []

    def cb(indata, frames, time_info, status):
        if status:
            log.debug("rec status: %s", status)
        chunks.append(indata[:, 0].copy())

    with sd.InputStream(samplerate=samplerate, channels=1, dtype="float32", callback=cb):
        input()  # blocks here while audio accumulates in the callback
    if not chunks:
        return np.zeros(0, dtype=np.float32)
    return np.concatenate(chunks).astype(np.float32)


def _postprocess(audio: np.ndarray, peak: float = 0.97, silence_db: float = -45.0,
                 samplerate: int = DEFAULT_SR) -> np.ndarray:
    """Trim leading/trailing silence and peak-normalize without clipping."""
    if audio.size == 0:
        return audio
    # trim silence based on a short-window envelope
    win = max(1, samplerate // 100)  # 10 ms
    env = np.convolve(np.abs(audio), np.ones(win) / win, mode="same")
    thresh = 10.0 ** (silence_db / 20.0)
    voiced = np.where(env > thresh)[0]
    if voiced.size:
        audio = audio[voiced[0]: voiced[-1] + 1]
    peak_now = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak_now > 1e-6:
        audio = audio * (peak / peak_now)
    return audio.astype(np.float32)


def _save(audio: np.ndarray, path: Path, samplerate: int) -> None:
    import soundfile as sf

    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), audio, samplerate)
    log.info("saved %s (%.1fs)", path, len(audio) / samplerate)


def record_reference(out_path: str = "recordings/reference.wav", samplerate: int = DEFAULT_SR) -> None:
    print("\n=== Reference clip (zero-shot Seed-VC) ===")
    print("Read ~30 seconds of natural speech. Press Enter to START, Enter again to STOP.")
    input("Press Enter to start... ")
    print("Recording... (Enter to stop)")
    audio = _record_until_enter(samplerate)
    audio = _postprocess(audio, samplerate=samplerate)
    _save(audio, Path(out_path), samplerate)
    print("Done. Set seedvc.reference_wav to this file.\n")


def record_dataset(
    out_dir: str = "recordings/dataset",
    sentences_file: str = "docs/sentences.txt",
    samplerate: int = DEFAULT_SR,
) -> None:
    sentences = _load_sentences(sentences_file)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    print("\n=== Voice dataset recording ===")
    print("Tips: quiet room, consistent distance from the mic, normal speaking voice.")
    print(f"You'll read {len(sentences)} prompts. For each: Enter to start, Enter to stop.")
    print("Type 'r' then Enter to redo the previous one, 'q' to quit early.\n")

    saved = 0
    i = 0
    while i < len(sentences):
        sentence = sentences[i]
        print(f"[{i + 1}/{len(sentences)}]  {sentence}")
        cmd = input("  Enter=record  r=redo last  q=quit : ").strip().lower()
        if cmd == "q":
            break
        if cmd == "r" and i > 0:
            i -= 1
            continue
        print("  recording... (Enter to stop)")
        audio = _record_until_enter(samplerate)
        audio = _postprocess(audio, samplerate=samplerate)
        if audio.size < samplerate // 2:  # < 0.5s -> probably a misfire
            print("  too short, let's try that one again.")
            continue
        _save(audio, out / f"clip_{i + 1:03d}.wav", samplerate)
        saved += 1
        i += 1

    total_s = _dataset_seconds(out)
    print(f"\nSaved {saved} clips (~{total_s/60:.1f} min) to {out}.")
    if total_s < 5 * 60:
        print("Heads up: aim for 5-15 minutes total for a good clone. Run again to add more.")
    print("Next: docs/TRAINING.md to turn this into your_voice.pth.\n")


def _load_sentences(path: str) -> list[str]:
    p = Path(path)
    if not p.exists():
        # fall back to a tiny built-in set so the tool still works
        return [
            "The quick brown fox jumps over the lazy dog near the riverbank.",
            "I never expected the weather to change so quickly this afternoon.",
            "Could you pass me the controller? I think it is your turn now.",
            "Numbers like one, seven, twelve, and ninety-nine are easy to say.",
            "She sells seashells by the seashore on a bright summer morning.",
        ]
    lines = [ln.strip() for ln in p.read_text(encoding="utf-8").splitlines()]
    return [ln for ln in lines if ln and not ln.startswith("#")]


def _dataset_seconds(out: Path) -> float:
    import soundfile as sf

    total = 0.0
    for wav in out.glob("*.wav"):
        try:
            info = sf.info(str(wav))
            total += info.frames / info.samplerate
        except Exception:
            pass
    return total
