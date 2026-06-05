"""RVC backend — real cloned-voice conversion (the actual product).

RVC (Retrieval-based Voice Conversion) takes incoming speech, extracts
speaker-independent content features (HuBERT/ContentVec) and a pitch (F0) track,
then a generator trained on YOUR voice resynthesizes that content in your
timbre. It is speaker conversion, not pitch shifting — which is exactly the
requirement.

-----------------------------------------------------------------------------
INTEGRATION NOTE (read me)
-----------------------------------------------------------------------------
This module wraps the `rvc-python` package (`pip install rvc-python` + a CUDA
build of torch). The package's public API has shifted across versions, so we
probe at runtime for an in-memory (numpy in -> numpy out) inference entry point
rather than hard-coding one, and fail with a clear message if we can't find one.

Because real-time RVC is hardware-bound (NVIDIA GPU) and version-sensitive, this
backend is written to be correct in shape but MUST be validated on the target
Windows+GPU machine. If you want a zero-risk runner for the very same trained
`.pth`, w-okada/voice-changer loads it directly — see docs/SETUP_WINDOWS.md.
The trained model file is the asset; this is just one way to run it.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np

from ..config import RVCConfig
from ..converter import VoiceConverter

log = logging.getLogger("voicebridge.rvc")


class RVCConverter(VoiceConverter):
    def __init__(self, cfg: RVCConfig) -> None:
        self.cfg = cfg
        self.sample_rate = 16000  # RVC content features are extracted at 16 kHz
        self._impl = None  # the loaded rvc-python inference object
        self._infer_array = None  # resolved numpy->numpy callable
        self._load()

    # -- model loading -----------------------------------------------------
    def _load(self) -> None:
        model_path = Path(self.cfg.model_path)
        if not model_path.exists():
            raise FileNotFoundError(
                f"RVC model not found: {model_path}. Train one (docs/TRAINING.md) "
                f"or point rvc.model_path at your .pth."
            )
        try:
            from rvc_python.infer import RVCInference  # type: ignore
        except Exception as exc:  # pragma: no cover - depends on optional install
            raise RuntimeError(
                "The 'rvc' backend needs the rvc-python package and a CUDA build "
                "of torch. Install per docs/SETUP_WINDOWS.md (`pip install rvc-python`). "
                f"Underlying import error: {exc}"
            ) from exc

        log.info("Loading RVC model %s on %s", model_path, self.cfg.device)
        self._impl = RVCInference(device=self.cfg.device)
        self._impl.load_model(str(model_path))
        # Common parameter names across rvc-python versions; set what exists.
        _try_set_params(
            self._impl,
            f0method=self.cfg.f0_method,
            f0up_key=self.cfg.f0_up_key,
            index_path=self.cfg.index_path,
            index_rate=self.cfg.index_rate,
            protect=self.cfg.protect,
        )
        self._infer_array = _resolve_array_infer(self._impl)
        if self._infer_array is None:
            raise RuntimeError(
                "Could not find an in-memory inference method on rvc-python "
                "(looked for infer_array / infer_audio / infer_numpy / vc / infer). "
                "Your installed version may only support file-based inference, "
                "which is unsuitable for real time. Use the w-okada runner with "
                "this same .pth instead (docs/SETUP_WINDOWS.md), or pin a "
                "compatible rvc-python version."
            )

    # -- inference ---------------------------------------------------------
    def convert(self, audio: np.ndarray) -> np.ndarray:
        if self._infer_array is None:
            raise RuntimeError("RVC backend not initialized")
        out = self._infer_array(audio.astype(np.float32))
        out = np.asarray(out, dtype=np.float32).reshape(-1)
        # Length-preserve so the engine's crossfade math stays exact.
        if len(out) > len(audio):
            out = out[: len(audio)]
        elif len(out) < len(audio):
            out = np.pad(out, (0, len(audio) - len(out)))
        return out

    def close(self) -> None:
        self._impl = None
        self._infer_array = None
        try:
            import torch  # type: ignore

            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except Exception:
            pass


def _try_set_params(impl, **params) -> None:
    """Best-effort parameter setting across rvc-python API variants."""
    setter = getattr(impl, "set_params", None)
    if callable(setter):
        try:
            setter(**{k: v for k, v in params.items() if v is not None})
            return
        except TypeError:
            pass  # fall through to attribute assignment
    for key, value in params.items():
        if value is None:
            continue
        for attr in (key, key.replace("_", "")):
            if hasattr(impl, attr):
                try:
                    setattr(impl, attr, value)
                except Exception:
                    pass
                break


def _resolve_array_infer(impl):
    """Find a numpy-in/numpy-out inference callable on the impl, or None."""
    for name in ("infer_array", "infer_audio", "infer_numpy", "vc", "infer"):
        fn = getattr(impl, name, None)
        if callable(fn):
            return fn
    return None
