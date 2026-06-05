"""Passthrough backend — the "is the plumbing alive?" backend.

It is deliberately NOT AI. It returns the input untouched, or, if you set a
non-zero ``pitch_semitones``, applies a crude resample-based pitch shift so you
can *hear* that audio is flowing mic -> engine -> virtual cable -> game before
any GPU or trained model is involved. Use it to validate device routing and
latency on literally any machine.
"""

from __future__ import annotations

import numpy as np

from ..config import PassthroughConfig
from ..converter import VoiceConverter
from ..dsp import pitch_shift_naive


class PassthroughConverter(VoiceConverter):
    def __init__(self, cfg: PassthroughConfig, sample_rate: int) -> None:
        self.sample_rate = sample_rate
        self.pitch_semitones = float(cfg.pitch_semitones)

    def convert(self, audio: np.ndarray) -> np.ndarray:
        if self.pitch_semitones == 0.0:
            return audio
        return pitch_shift_naive(audio, self.pitch_semitones)
