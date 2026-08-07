# Windows Setup — from zero to a cloned-voice mic in a game

This is the install + run guide for the PC that will **use** the voice (your
girlfriend's PC). It needs a reasonably modern **NVIDIA GPU** for real-time
neural conversion.

> If you just want to prove the plumbing works first (no GPU, no model), do
> Parts 1–3 with `backend: passthrough`. You'll hear your routed audio in the
> game immediately, then come back for the AI model.

---

## Part 1 — Virtual microphone (VB-CABLE)

The game needs a "microphone" to read from. VB-CABLE creates one.

1. Download **VB-CABLE** (free) from https://vb-audio.com/Cable/ .
2. Unzip, right-click `VBCABLE_Setup_x64.exe` → **Run as administrator** → Install.
3. **Reboot.**
4. Now Windows has two new devices:
   - **CABLE Input** — a "speaker." VoiceBridge plays the converted voice here.
   - **CABLE Output** — a "microphone." The game listens to this.

> Want her to *also* hear game audio + herself naturally? VB-CABLE is enough for
> v1. For fancier routing (hear yourself, mix multiple sources) install
> **VoiceMeeter** later — same idea, more knobs.

---

## Part 2 — Python + VoiceBridge

1. Install **Python 3.10 or 3.11** (64-bit) from python.org. Tick **"Add Python
   to PATH"** during install.
2. Open **PowerShell** in the `voicebridge` folder and create a virtual env:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install --upgrade pip
   pip install -e .
   ```
3. Check audio is visible:
   ```powershell
   python -m voicebridge devices
   ```
   You should see her mic, **CABLE Input**, and **CABLE Output** in the list.

---

## Part 3 — Configure and test the routing (no GPU yet)

1. Make your config:
   ```powershell
   copy config.example.yaml config.yaml
   ```
2. Edit `config.yaml`:
   - `audio.input_device`: a unique part of her mic's name (e.g. `"Microphone (USB"`).
   - `audio.output_device`: `"CABLE Input"`.
   - `backend: passthrough` and (optional) `passthrough.pitch_semitones: -4` so
     you can clearly hear a change.
3. Run it:
   ```powershell
   python -m voicebridge run
   ```
4. In **Discord** (or Rust) set **Input Device / Microphone = "CABLE Output
   (VB-Audio Virtual Cable)"**. Talk — your voice should come through (pitched
   down if you set that). Routing works. Stop with `Ctrl+C`.

---

## Part 4 — GPU PyTorch (for the real AI model)

1. Confirm the NVIDIA driver is installed (`nvidia-smi` in PowerShell shows the GPU).
2. Install the CUDA build of PyTorch — get the exact command from
   https://pytorch.org (pick Stable → Windows → Pip → CUDA). For example:
   ```powershell
   pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
   ```
3. Verify CUDA is seen by torch:
   ```powershell
   python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
   ```
   It must print `True` and the GPU name.

---

## Part 5 — The cloned voice

You need a trained model `your_voice.pth` (+ `.index`). Make one with
`docs/TRAINING.md` (record with `python -m voicebridge record`, train, copy the
files into `models/`). Then:

1. In `config.yaml`:
   ```yaml
   backend: rvc
   rvc:
     model_path: models/your_voice.pth
     index_path: models/your_voice.index
     device: cuda:0
   ```
2. Install the RVC runtime:
   ```powershell
   pip install rvc-python
   ```
3. Run:
   ```powershell
   python -m voicebridge run        # or:  python -m voicebridge gui
   ```
   Game mic = **CABLE Output**. She talks; the game hears you.

Tune latency in `docs/LATENCY.md` and voice quality in `docs/TRAINING.md`.

---

## Fast path / safety net — w-okada voice changer

If the integrated `rvc` backend gives you trouble on a specific driver/version,
you can run the **same** `your_voice.pth` in the well-established
**w-okada/voice-changer** app instead:

1. Download w-okada's prebuilt Windows release (it bundles everything).
2. Load `your_voice.pth` (+ `.index`) as an RVC model.
3. Set its **output device = CABLE Input**, input = her mic, tune chunk/extra.
4. Game mic = **CABLE Output**.

VoiceBridge and w-okada are interchangeable runners — the trained model is the
asset. Use whichever is smoother on her machine.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Game doesn't list the mic | Reboot after VB-CABLE install; pick "CABLE Output". |
| Robotic/crackly audio | Worker can't keep up: raise `stream.block_ms`, or use a faster GPU. See LATENCY.md. |
| `torch.cuda.is_available()` is False | Wrong torch build or driver. Reinstall the CUDA wheel matching your driver. |
| Too much delay | Lower `block_ms`/`crossfade_ms` (LATENCY.md); close GPU-hungry apps. |
| It voices background noise | Quiet room; use push-to-talk in the game; a noise gate helps. |
| Multiple devices match a name | Use a more specific substring, or the numeric id from `devices`. |
