"""Pure-DSP helpers used by the real-time engine.

Everything here is plain NumPy with no audio-hardware or GPU dependency, so it
runs and is unit-tested anywhere (see tests/test_dsp.py). Audio is always
float32, mono, in the range [-1, 1] unless noted.
"""

from __future__ import annotations

import numpy as np

try:  # soxr is the high-quality real-time resampler; fall back to linear if absent.
    import soxr  # type: ignore

    _HAVE_SOXR = True
except Exception:  # pragma: no cover - optional dependency
    _HAVE_SOXR = False


def equal_power_fades(n: int) -> tuple[np.ndarray, np.ndarray]:
    """Return (fade_in, fade_out) curves of length ``n`` whose squares sum to 1.

    Equal-power (constant-energy) crossfades avoid the volume dip you get from a
    naive linear blend, which matters because consecutive model chunks are
    correlated. fade_in rises as sin, fade_out falls as cos, and
    fade_in**2 + fade_out**2 == 1 everywhere.
    """
    if n <= 0:
        empty = np.zeros(0, dtype=np.float32)
        return empty, empty.copy()
    t = np.linspace(0.0, np.pi / 2.0, n, endpoint=True, dtype=np.float32)
    fade_in = np.sin(t).astype(np.float32)
    fade_out = np.cos(t).astype(np.float32)
    return fade_in, fade_out


def crossfade(prev_tail: np.ndarray, new_head: np.ndarray) -> np.ndarray:
    """Equal-power blend of the previous chunk's tail with the new chunk's head.

    Both inputs must be the same length (the crossfade region). Returns the
    blended region.
    """
    if prev_tail.shape != new_head.shape:
        raise ValueError(
            f"crossfade regions must match: {prev_tail.shape} vs {new_head.shape}"
        )
    fade_in, fade_out = equal_power_fades(len(new_head))
    return (prev_tail * fade_out + new_head * fade_in).astype(np.float32)


def resample(audio: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
    """Resample mono float32 audio. Uses soxr when available, else linear interp.

    Linear interpolation is only a fallback for environments without soxr; it is
    fine for the passthrough test path but you want soxr installed for quality.
    """
    if src_sr == dst_sr or audio.size == 0:
        return audio.astype(np.float32, copy=False)
    if _HAVE_SOXR:
        return soxr.resample(audio, src_sr, dst_sr).astype(np.float32)
    # Linear fallback.
    duration = audio.shape[0] / float(src_sr)
    dst_len = int(round(duration * dst_sr))
    if dst_len <= 0:
        return np.zeros(0, dtype=np.float32)
    src_idx = np.linspace(0.0, audio.shape[0] - 1, dst_len, dtype=np.float64)
    return np.interp(src_idx, np.arange(audio.shape[0]), audio).astype(np.float32)


def rms(audio: np.ndarray) -> float:
    """Root-mean-square level of a block (0.0 for empty)."""
    if audio.size == 0:
        return 0.0
    return float(np.sqrt(np.mean(np.square(audio, dtype=np.float64))))


def dbfs(audio: np.ndarray) -> float:
    """RMS level in dBFS (decibels relative to full scale). -inf for silence."""
    r = rms(audio)
    if r <= 1e-9:
        return float("-inf")
    return 20.0 * float(np.log10(r))


def noise_gate(audio: np.ndarray, threshold_db: float = -45.0) -> np.ndarray:
    """Hard noise gate: silence a whole block whose RMS is below ``threshold_db``.

    Real-time VC happily "voices" room hiss, keyboard noise, and a roommate's TV
    as you. Gating sub-threshold blocks keeps the virtual mic quiet when she is
    not actually speaking. Block-level (not sample-level) on purpose: it's cheap
    and avoids chopping word onsets.
    """
    if audio.size == 0:
        return audio
    if dbfs(audio) < threshold_db:
        return np.zeros_like(audio)
    return audio


def soft_clip(audio: np.ndarray) -> np.ndarray:
    """Tanh soft-clip to keep output inside [-1, 1] without harsh digital clipping."""
    return np.tanh(audio).astype(np.float32)


def pitch_shift_naive(audio: np.ndarray, semitones: float) -> np.ndarray:
    """A *toy* pitch shift (resample-based) for the passthrough test backend ONLY.

    This is the thing the project is explicitly NOT: it does not preserve
    formants and will sound like a chipmunk/giant. It exists solely so you can
    audibly confirm the mic->cable->game routing is alive before a real model is
    installed. The neural backends do proper timbre conversion instead.
    """
    if semitones == 0 or audio.size == 0:
        return audio.astype(np.float32, copy=False)
    ratio = 2.0 ** (semitones / 12.0)
    # Resample to change pitch+length, then restore original length.
    stretched = resample(audio, src_sr=int(1e6), dst_sr=int(1e6 / ratio))
    if len(stretched) >= len(audio):
        return stretched[: len(audio)].astype(np.float32)
    out = np.zeros(len(audio), dtype=np.float32)
    out[: len(stretched)] = stretched
    return out
