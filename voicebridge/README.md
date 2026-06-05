# VoiceBridge

**Real-time AI voice conversion that turns one person's microphone into a
cloned-voice virtual mic for games on Windows.** Sub-300 ms, neural speaker
conversion (RVC / Seed-VC) — *not* a pitch shifter.

> Built for a specific use: record yourself, train a model of your voice, and
> let your girlfriend speak with **your** voice in Rust, Discord, or any app —
> live, through a virtual microphone.

```
   Her real mic ──► VoiceBridge engine ──► your cloned voice ──► VB-CABLE ──► Rust / Discord
                    (GPU, ~200-300 ms)        (RVC model)         (virtual mic)
```

---

## How it works (30-second version)

Three independent pieces (full detail in **[docs/DESIGN.md](docs/DESIGN.md)**):

1. **Clone your voice** — record ~10 min of yourself, train an **RVC** model →
   `your_voice.pth`. Done once. ([docs/TRAINING.md](docs/TRAINING.md))
2. **Convert in real time** — this repo's engine captures her mic, runs it
   through the model on her GPU, and hides chunk boundaries with a context
   window + equal-power crossfade for clean, low-latency audio.
3. **Become a microphone** — output goes to **VB-CABLE**, a virtual audio
   device, so any game/app can select it as the mic. Game-agnostic.

The neural quality comes from the RVC model family (the community standard for
voice cloning); VoiceBridge is the real-time engine, the recording/training
workflow, the routing, and a one-click control panel around it.

## Requirements

- **Windows 10/11** on the PC that uses the voice.
- **NVIDIA GPU** (RTX 2060/3060 or better recommended) for real-time. CPU works
  only for the no-AI `passthrough` test.
- **Python 3.10/3.11**, and **VB-CABLE** (free virtual mic).

## Quickstart

```powershell
# 1. install
python -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -e .

# 2. see your devices
python -m voicebridge devices

# 3. configure
copy config.example.yaml config.yaml      # then edit input/output devices

# 4a. PROVE THE ROUTING (no GPU, no model): backend: passthrough
python -m voicebridge run
#     -> set the game's mic to "CABLE Output"; you should hear yourself routed.

# 4b. THE REAL THING: train a voice (docs/TRAINING.md), set backend: rvc, then:
python -m voicebridge gui        # friendly control panel, or `run` for headless
```

Full step-by-step (VB-CABLE, GPU PyTorch, model deploy):
**[docs/SETUP_WINDOWS.md](docs/SETUP_WINDOWS.md)**.

## Commands

| Command | Does |
|---|---|
| `python -m voicebridge devices` | list audio input/output devices |
| `python -m voicebridge record` | guided recording of your training data |
| `python -m voicebridge record --reference` | one ~30s clip for zero-shot Seed-VC |
| `python -m voicebridge train --check` | validate your dataset |
| `python -m voicebridge train` | print the exact training plan |
| `python -m voicebridge run` | start the real-time engine (headless) |
| `python -m voicebridge gui` | open the control panel |

## Backends

Set `backend:` in `config.yaml`:

- **`passthrough`** — not AI; proves mic→cable→game works on any machine today.
- **`rvc`** — your fine-tuned cloned voice. The real product. Needs a GPU + `.pth`.
- **`seedvc`** — zero-shot from a reference clip, no training. Quick first test.

## Latency

Target is "feels live in voice chat," ~200–300 ms mouth-to-game on a decent
NVIDIA GPU. Tune it in **[docs/LATENCY.md](docs/LATENCY.md)**. It will never be
literally zero — neural conversion needs a small chunk of audio to work on.

## Project layout

See [docs/DESIGN.md §10](docs/DESIGN.md). The streaming algorithm is in
`src/voicebridge/engine.py`; the audio plumbing in `audio_io.py`; backends in
`backends/`. Pure-DSP/streaming logic is unit-tested in `tests/` (no GPU needed):

```powershell
pip install pytest ; pytest
```

## Ethics & fair use

This exists to let you share **your own** voice, with your consent, with your
partner, for fun in games. Don't:
- impersonate real people who haven't agreed,
- use it for fraud, harassment, scams, or to evade bans/identity checks,
- record or convert anyone without their knowledge.

VoiceBridge only creates/uses a virtual **audio device** — it does not inject
into or modify any game process, so it isn't a game hack. Still, follow each
game's and platform's rules on voice/streaming software.

## Status

v0.1. The real-time engine, audio routing, recording tool, config, GUI, and the
passthrough backend are implemented and unit-tested. The `rvc`/`seedvc` neural
backends are wired as clearly-marked integration seams that must be validated on
a Windows + NVIDIA GPU machine (see notes in `backends/`); the trained model
also runs as-is in w-okada/voice-changer if you want a turnkey runner. License: MIT.
