"""Seed-VC backend — zero-shot conversion, no training step.

Seed-VC converts your girlfriend's speech toward a *reference clip* of your
voice without any fine-tuning: point it at `recordings/reference.wav` and go.
It is the fastest way to a first "wait, that sounds like him" moment. Quality
and stability are below a properly fine-tuned RVC model, so treat it as the
quick-start / fallback, and graduate to the `rvc` backend for production.

-----------------------------------------------------------------------------
INTEGRATION NOTE
-----------------------------------------------------------------------------
Seed-VC ships as a GitHub project (Plachtaa/seed-vc) rather than a stable pip
package, and exposes its real-time path through `real-time-gui.py` helpers. This
class defines the seam: load the model + reference embedding once, then convert
chunks. Wire `_load_model` / `_infer` to the Seed-VC version you vendor or
install, and validate on the target GPU. Kept intentionally thin so it's obvious
where to plug in.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np

from ..config import SeedVCConfig
from ..converter import VoiceConverter

log = logging.getLogger("voicebridge.seedvc")


class SeedVCConverter(VoiceConverter):
    def __init__(self, cfg: SeedVCConfig) -> None:
        self.cfg = cfg
        self.sample_rate = 16000
        ref = Path(cfg.reference_wav)
        if not ref.exists():
            raise FileNotFoundError(
                f"Seed-VC reference clip not found: {ref}. Record one with "
                f"`python -m voicebridge record --reference`."
            )
        self._model = self._load_model()
        self._ref_embedding = self._embed_reference(ref)

    def _load_model(self):
        raise NotImplementedError(
            "Seed-VC integration seam: install/vendor Plachtaa/seed-vc and load "
            "its real-time model + vocoder here (checkpoint=%r, device=%r, "
            "diffusion_steps=%d). See backends/seedvc.py docstring."
            % (self.cfg.checkpoint, self.cfg.device, self.cfg.diffusion_steps)
        )

    def _embed_reference(self, ref_path: Path):
        # Compute the speaker embedding of your reference clip once, up front.
        raise NotImplementedError("Seed-VC integration seam: embed the reference clip.")

    def convert(self, audio: np.ndarray) -> np.ndarray:  # pragma: no cover - needs model
        out = self._infer(audio.astype(np.float32))
        out = np.asarray(out, dtype=np.float32).reshape(-1)
        if len(out) > len(audio):
            out = out[: len(audio)]
        elif len(out) < len(audio):
            out = np.pad(out, (0, len(audio) - len(out)))
        return out

    def _infer(self, audio: np.ndarray) -> np.ndarray:
        raise NotImplementedError(
            "Seed-VC integration seam: run zero-shot conversion of `audio` toward "
            "self._ref_embedding and return mono float32 at self.sample_rate."
        )
