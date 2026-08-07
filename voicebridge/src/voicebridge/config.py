"""Typed configuration for VoiceBridge, loaded from a YAML file.

Keeping config as plain dataclasses (rather than passing dicts around) means the
engine, backends, and GUI all agree on field names and types, and a typo in the
YAML fails loudly at load time instead of deep inside a real-time callback.
"""

from dataclasses import dataclass, field, fields, is_dataclass
from pathlib import Path
from typing import Any, Optional

import yaml


@dataclass
class AudioConfig:
    input_device: str = "default"
    output_device: str = "CABLE Input"
    monitor_device: Optional[str] = None
    samplerate: int = 48000
    channels: int = 1


@dataclass
class StreamConfig:
    block_ms: int = 150
    crossfade_ms: int = 40
    context_ms: int = 200
    pipeline_samplerate: int = 16000

    def __post_init__(self) -> None:
        if self.crossfade_ms >= self.block_ms:
            raise ValueError(
                f"crossfade_ms ({self.crossfade_ms}) must be smaller than "
                f"block_ms ({self.block_ms}); the crossfade is an overlap inside a block."
            )


@dataclass
class PassthroughConfig:
    pitch_semitones: float = 0.0


@dataclass
class RVCConfig:
    model_path: str = "models/your_voice.pth"
    index_path: Optional[str] = "models/your_voice.index"
    index_rate: float = 0.5
    f0_method: str = "rmvpe"
    f0_up_key: int = 0
    protect: float = 0.33
    device: str = "cuda:0"


@dataclass
class SeedVCConfig:
    reference_wav: str = "recordings/reference.wav"
    checkpoint: Optional[str] = None
    diffusion_steps: int = 4
    device: str = "cuda:0"


@dataclass
class LoggingConfig:
    level: str = "INFO"
    show_latency: bool = True


@dataclass
class Config:
    audio: AudioConfig = field(default_factory=AudioConfig)
    stream: StreamConfig = field(default_factory=StreamConfig)
    backend: str = "passthrough"
    passthrough: PassthroughConfig = field(default_factory=PassthroughConfig)
    rvc: RVCConfig = field(default_factory=RVCConfig)
    seedvc: SeedVCConfig = field(default_factory=SeedVCConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)

    # -- loading -----------------------------------------------------------
    @classmethod
    def load(cls, path: str | Path) -> "Config":
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(
                f"Config file not found: {path}. Copy config.example.yaml to config.yaml first."
            )
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return cls.from_dict(raw)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Config":
        return _build(cls, raw)


def _build(dc_type: type, raw: dict[str, Any]) -> Any:
    """Recursively construct a (possibly nested) dataclass from a dict,
    rejecting unknown keys so config typos surface immediately."""
    kwargs: dict[str, Any] = {}
    known = {f.name: f for f in fields(dc_type)}
    unknown = set(raw) - set(known)
    if unknown:
        raise ValueError(f"Unknown config keys for {dc_type.__name__}: {sorted(unknown)}")
    for name, f in known.items():
        if name not in raw:
            continue
        value = raw[name]
        if is_dataclass(f.type) and isinstance(value, dict):
            kwargs[name] = _build(f.type, value)  # type: ignore[arg-type]
        else:
            kwargs[name] = value
    return dc_type(**kwargs)
