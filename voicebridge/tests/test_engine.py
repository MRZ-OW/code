import numpy as np

from voicebridge.config import StreamConfig
from voicebridge.converter import VoiceConverter
from voicebridge.engine import ChunkProcessor


class IdentityConverter(VoiceConverter):
    """Length-preserving identity backend for testing the streaming math."""

    def __init__(self, sr: int) -> None:
        self.sample_rate = sr

    def convert(self, audio: np.ndarray) -> np.ndarray:
        return audio


class GainConverter(VoiceConverter):
    def __init__(self, sr: int, gain: float) -> None:
        self.sample_rate = sr
        self.gain = gain

    def convert(self, audio: np.ndarray) -> np.ndarray:
        return audio * self.gain


def _processor(sr=16000, block_ms=150, crossfade_ms=40, context_ms=200, conv=None):
    cfg = StreamConfig(block_ms=block_ms, crossfade_ms=crossfade_ms,
                       context_ms=context_ms, pipeline_samplerate=sr)
    conv = conv or IdentityConverter(sr)
    return ChunkProcessor(conv, cfg, device_sr=sr)


def test_output_block_matches_input_length():
    sr = 16000
    proc = _processor(sr=sr)
    block = (np.random.randn(int(0.15 * sr)) * 0.1).astype(np.float32)
    for _ in range(5):
        out = proc.process(block)
        assert len(out) == len(block)
        assert out.dtype == np.float32


def test_handles_resampling_between_device_and_pipeline():
    # device 48k, model wants 16k
    cfg = StreamConfig(block_ms=120, crossfade_ms=30, context_ms=200, pipeline_samplerate=16000)
    proc = ChunkProcessor(IdentityConverter(16000), cfg, device_sr=48000)
    block = (np.random.randn(int(0.12 * 48000)) * 0.1).astype(np.float32)
    out = proc.process(block)
    assert len(out) == len(block)  # comes back at device rate, same length


def test_steady_state_signal_passes_through_roughly():
    # A constant tone through identity should come out close to itself in the body.
    sr = 16000
    proc = _processor(sr=sr, conv=IdentityConverter(sr))
    tone = (0.2 * np.sin(2 * np.pi * 220 * np.arange(int(0.15 * sr)) / sr)).astype(np.float32)
    out = None
    for _ in range(4):  # let context/crossfade reach steady state
        out = proc.process(tone)
    # soft-clip(tanh) barely changes a 0.2-amplitude signal; energies should be close
    assert abs(float(np.sqrt(np.mean(out**2))) - float(np.sqrt(np.mean(tone**2)))) < 0.05


def test_gain_backend_changes_level():
    sr = 16000
    proc = _processor(sr=sr, conv=GainConverter(sr, 0.5))
    block = (0.4 * np.ones(int(0.15 * sr))).astype(np.float32)
    out = None
    for _ in range(4):
        out = proc.process(block)
    # halved (then mild tanh) -> clearly below the input level
    assert float(np.mean(np.abs(out))) < 0.4
