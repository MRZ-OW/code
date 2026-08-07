"""Training orchestration for the RVC cloned-voice model.

Training a good RVC model is an interactive, GPU-bound process that the RVC
project's own WebUI does well, so this module does NOT reimplement training.
Instead it (a) sanity-checks your recorded dataset and (b) prints the exact,
ordered steps to produce ``your_voice.pth`` — either via the RVC WebUI (easiest)
or the RVC CLI. See docs/TRAINING.md for the full walkthrough.

    python -m voicebridge train --check       # validate the dataset
    python -m voicebridge train               # print the step-by-step plan
"""

from __future__ import annotations

import logging
from pathlib import Path

log = logging.getLogger("voicebridge.train")


def check_dataset(dataset_dir: str = "recordings/dataset") -> bool:
    """Validate the recorded dataset and warn about common quality problems."""
    import numpy as np
    import soundfile as sf

    d = Path(dataset_dir)
    wavs = sorted(d.glob("*.wav"))
    if not wavs:
        print(f"No .wav files in {d}. Record first: python -m voicebridge record")
        return False

    total_s = 0.0
    clipped = 0
    quiet = 0
    for wav in wavs:
        audio, sr = sf.read(str(wav), dtype="float32")
        if audio.ndim > 1:
            audio = audio[:, 0]
        total_s += len(audio) / sr
        peak = float(np.max(np.abs(audio))) if audio.size else 0.0
        if peak >= 0.999:
            clipped += 1
        if peak < 0.05:
            quiet += 1

    print(f"Dataset: {len(wavs)} clips, ~{total_s/60:.1f} min total.")
    ok = True
    if total_s < 5 * 60:
        print("  ! Only %.1f min. Aim for 5-15 min; more varied speech = better clone." % (total_s / 60))
        ok = False
    if clipped:
        print(f"  ! {clipped} clip(s) appear clipped (peak ~1.0). Re-record those a bit quieter.")
        ok = False
    if quiet:
        print(f"  ! {quiet} clip(s) are very quiet. Move closer to the mic / raise input gain.")
    if ok:
        print("  Looks good. Proceed to training (see the plan below / docs/TRAINING.md).")
    return ok


def print_plan(dataset_dir: str = "recordings/dataset", model_name: str = "your_voice") -> None:
    plan = f"""
=== Training plan: turn your recordings into {model_name}.pth ===

Recommended (easiest): RVC WebUI
  1. Get the WebUI:
       git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
       cd Retrieval-based-Voice-Conversion-WebUI
       (install torch with CUDA + requirements per its README; download the
        pretrained base models it links — hubert/contentvec + rmvpe.)
  2. Launch:  python infer-web.py   (opens a browser UI)
  3. Train tab:
       - Experiment name: {model_name}
       - Point the trainer at your dataset folder:
             {Path(dataset_dir).resolve()}
       - Target sample rate: 48k (or 40k)
       - Pitch guidance: YES (needed for speech), f0 method: rmvpe
       - Epochs: start ~150-250; save frequency every ~25 epochs
       - Run "Process data" -> "Feature extraction" -> "Train model" ->
         "Train feature index".
  4. Collect the outputs:
       - generator weights  ->  {model_name}.pth
       - feature index      ->  added_*.index   (rename to {model_name}.index)
  5. Copy both into VoiceBridge's  models/  folder and set in config.yaml:
       backend: rvc
       rvc.model_path: models/{model_name}.pth
       rvc.index_path: models/{model_name}.index

No local GPU? Train on a rented cloud GPU or Colab (search "RVC training
colab"), then download the .pth/.index and use them locally.

Quick test WITHOUT training: set `backend: seedvc` and record a reference clip
(`python -m voicebridge record --reference`). Lower quality, but instant.

After deploying: `python -m voicebridge run` (or `gui`), then tune
rvc.f0_up_key / index_rate / protect by ear (docs/TRAINING.md §Tuning).
"""
    print(plan)
