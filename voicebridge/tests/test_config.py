import pytest

from voicebridge.config import Config, StreamConfig


def test_defaults():
    c = Config()
    assert c.backend == "passthrough"
    assert c.audio.samplerate == 48000
    assert c.stream.block_ms == 150


def test_from_dict_nested_and_unknown_key():
    c = Config.from_dict({"backend": "rvc", "audio": {"samplerate": 44100}})
    assert c.backend == "rvc"
    assert c.audio.samplerate == 44100
    assert isinstance(c.stream, StreamConfig)  # untouched -> default

    with pytest.raises(ValueError):
        Config.from_dict({"audio": {"bogus_key": 1}})


def test_crossfade_must_be_smaller_than_block():
    with pytest.raises(ValueError):
        StreamConfig(block_ms=40, crossfade_ms=40)
    StreamConfig(block_ms=150, crossfade_ms=40)  # ok
