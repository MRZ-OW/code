"""The backend interface every voice-conversion engine implements.

The real-time engine (engine.py) only ever talks to this interface, so swapping
``passthrough`` -> ``rvc`` -> ``seedvc`` (or a future model) changes nothing in
the streaming/audio code.

Contract:
  * ``convert`` receives mono float32 audio at ``self.sample_rate`` and returns
    mono float32 audio at the same sample rate.
  * Output length SHOULD equal input length (length-preserving). The engine
    trims/pads defensively, but backends that drift will hurt latency.
  * ``convert`` is called from a single worker thread, never from an audio
    callback, so it may use the GPU and block — but it must keep up with
    real time (process a block faster than the block's wall-clock duration).
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np


class VoiceConverter(ABC):
    #: sample rate (Hz) this backend wants audio delivered at
    sample_rate: int = 16000

    @abstractmethod
    def convert(self, audio: np.ndarray) -> np.ndarray:
        """Convert one chunk of mono float32 audio. Length-preserving."""
        raise NotImplementedError

    def warmup(self) -> None:
        """Optional: run a dummy forward pass so the first real chunk isn't slow.

        GPU kernels, cuDNN autotuning, and lazy weight loading otherwise make the
        first ``convert`` call take hundreds of ms and cause an audible hitch.
        """
        try:
            self.convert(np.zeros(self.sample_rate // 4, dtype=np.float32))
        except Exception:
            # Warmup is best-effort; a failure here will resurface (loudly) on
            # the first real chunk where we can report it in context.
            pass

    def close(self) -> None:
        """Release models / GPU memory. Safe to call multiple times."""
        return None


def build_converter(config) -> VoiceConverter:
    """Factory: instantiate the backend named in ``config.backend``.

    Imports are done lazily inside each branch so that, e.g., running the
    passthrough backend on a machine without torch/CUDA never imports torch.
    """
    name = config.backend.lower()
    if name == "passthrough":
        from .backends.passthrough import PassthroughConverter

        return PassthroughConverter(config.passthrough, config.stream.pipeline_samplerate)
    if name == "rvc":
        from .backends.rvc import RVCConverter

        return RVCConverter(config.rvc)
    if name == "seedvc":
        from .backends.seedvc import SeedVCConverter

        return SeedVCConverter(config.seedvc)
    raise ValueError(
        f"Unknown backend '{config.backend}'. Expected one of: passthrough, rvc, seedvc."
    )
