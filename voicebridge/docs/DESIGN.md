# VoiceBridge — High-Level Design

> Goal: let your girlfriend speak into her own microphone and have games (Rust,
> Discord, anything) hear **your** voice instead, in real time, with no
> perceptible delay. The voice is an **AI voice clone of you**, not a pitch
> shifter.

This document is the architecture. If you only read one file, read this one.

---

## 1. What we're actually building (and what we're not)

There are three separable problems. It's important to keep them separate,
because conflating them is how this kind of project dies.

| # | Problem | Solved by | Runs when |
|---|---------|-----------|-----------|
| A | **Clone your voice** into a model file | RVC training on a recording of you | Once, offline, on your PC/GPU/cloud |
| B | **Convert audio in real time** through that model | The VoiceBridge real-time engine (this repo) + a neural backend | Live, on *her* PC, while she talks |
| C | **Make the game accept it as a microphone** | A virtual audio device (VB-CABLE) | Always, once installed |

The "magic" the user feels is B+C. The "it sounds like him" quality comes
from A. This repo **owns B and C**, **orchestrates A**, and is honest that the
neural quality lives in a well-established model family (RVC), not in code we
hand-wrote from scratch.

### Why not "just write the AI"?
Real-time neural voice conversion that is *good* and *low-latency* is a large,
already-solved research/engineering problem. The sane move — the one that
actually ships and sounds good — is to stand on:

- **RVC (Retrieval-based Voice Conversion)** for the cloned-voice model. It's
  the de-facto standard the gaming/VTuber community uses precisely because it
  does **speaker conversion** (timbre retargeting) rather than pitch shifting,
  trains from ~5–15 min of audio, and runs in real time on a consumer NVIDIA GPU.
- **VB-CABLE** for the virtual microphone.

What we add on top — and what makes this a *product* your girlfriend can use
instead of a pile of research scripts — is:

1. A clean **real-time streaming engine** (chunking, context windows,
   equal-power crossfade, device routing, latency accounting) with a
   **pluggable backend** interface.
2. A **guided recording tool** so capturing your training data is foolproof.
3. A **training playbook + automation** to turn that recording into a model.
4. A **one-button control panel** (GUI) she can run without touching a terminal.
5. A **passthrough backend** that proves the whole mic→cable→game path works on
   *any* machine before a GPU/model is in the picture.

---

## 2. Hard constraints & the reality check

| Requirement | Reality | Design consequence |
|---|---|---|
| "No latency, sub-300 ms" | Achievable with neural VC, but **only on a GPU**. CPU-only is ~seconds. | The engine targets NVIDIA CUDA. Latency is *budgeted* (see §5), not hoped for. |
| "AI voice clone, not a pitch changer" | RVC/Seed-VC do real timbre conversion. | Pitch-shift code exists **only** in the passthrough test backend, clearly labelled. |
| "She uses it in any game" | Games read whatever Windows mic is selected. | We expose a **virtual mic** (VB-CABLE). Game just picks "CABLE Output". Game-agnostic. |
| "Record me, then she uses my voice" | Two phases: train once (you), run live (her). | Model file (`.pth`, ~55 MB) is portable. You train, send it to her, she runs the client. |

### Where each piece runs
```
   YOU (one time)                         HER (every gaming session)
 ┌───────────────────┐                   ┌──────────────────────────────┐
 │ record your voice │                   │ VoiceBridge real-time engine │
 │   (record.py)     │                   │   + your_voice.pth model     │
 │        │          │   send the .pth   │            │                 │
 │        ▼          │ ───────────────►  │            ▼                 │
 │  train RVC model  │   (Discord/USB)   │   VB-CABLE virtual mic       │
 │  your_voice.pth   │                   │            │                 │
 └───────────────────┘                   │            ▼                 │
                                         │     Rust / Discord / etc.    │
                                         └──────────────────────────────┘
```
> **Critical hardware note:** the *real-time* model runs on **her** PC, so **her
> PC needs the NVIDIA GPU**, not yours. Training can happen anywhere (your PC, a
> rented cloud GPU, Colab). See §7.

---

## 3. System architecture

```
                          HER MICROPHONE (physical)
                                    │  WASAPI capture (sounddevice)
                                    ▼
                    ┌───────────────────────────────┐
                    │        AudioPipeline           │   src/voicebridge/audio_io.py
                    │  InputStream callback ──► in_q │
                    └───────────────┬───────────────┘
                                    │ float32 mono blocks @ device SR
                                    ▼
                    ┌───────────────────────────────┐
                    │        RealtimeEngine          │   src/voicebridge/engine.py
                    │  • resample to pipeline SR     │
                    │  • maintain context buffer     │
                    │  • call backend.convert()      │
                    │  • equal-power crossfade (OLA) │
                    │  • resample back to device SR  │
                    └───────────────┬───────────────┘
                                    │  calls
                                    ▼
                    ┌───────────────────────────────┐
                    │     VoiceConverter backend     │   src/voicebridge/backends/*
                    │  passthrough | rvc | seedvc    │
                    │   (RVC = HuBERT feats → f0 →   │
                    │    generator → your timbre)    │
                    └───────────────┬───────────────┘
                                    │ converted float32 blocks
                                    ▼
                    ┌───────────────────────────────┐
                    │        AudioPipeline           │
                    │  out_q ──► OutputStream cb     │──► (optional monitor to headphones)
                    └───────────────┬───────────────┘
                                    ▼
                         VB-CABLE "CABLE Input"  (a speaker that is secretly a wire)
                                    │
                                    ▼
                         VB-CABLE "CABLE Output"  (appears to Windows as a MICROPHONE)
                                    │
                                    ▼
                        RUST / DISCORD / OBS / anything
```

### Threading model
Real-time audio is unforgiving: the audio callbacks **must never block** (no
model inference, no allocation storms, no logging) or you get crackles/dropouts.
So:

- **Input callback** (PortAudio thread): copy incoming frames into a bounded
  `in_q`. Nothing else.
- **Worker thread** (`RealtimeEngine.run`): the only place the model runs.
  Pulls from `in_q`, does resample → context assembly → `convert()` → crossfade
  → resample, pushes finished blocks to `out_q`.
- **Output callback** (PortAudio thread): pop a block from `out_q` and write it.
  On underflow (worker fell behind) it writes silence rather than blocking.

Bounded queues give us back-pressure and a measurable, fixed latency budget.

---

## 4. The streaming algorithm (chunking + crossfade)

Neural VC is not sample-by-sample; it processes a *chunk*. Naively chopping the
mic into chunks and converting each independently produces clicks at the seams
and loses continuity. We fix both with a **context window** and **overlap-add
crossfade** — the same idea proven in w-okada's voice changer.

Per tick we receive a new block of `B` samples (`block_ms`). Let `X` =
`crossfade_ms`, `C` = `context_ms`, all in samples at the pipeline SR.

```
1. model_in   = concat(context_history, new_block)      # length C + B
2. context_history = last C samples of model_in          # slide the window
3. model_out  = backend.convert(model_in)                # length C + B (length-preserving)
4. seg        = last (B + X) samples of model_out         # the part we'll actually use
5. play[:X]   = prev_tail * fade_out  +  seg[:X] * fade_in   # equal-power crossfade
   play[X:B]  = seg[X:B]                                  # untouched body
6. prev_tail  = seg[B:B+X]                                # save overlap for next tick
7. emit play  (B samples) to out_q
```

- **Context (C)** gives the model lookback so pitch/timbre stay coherent across
  chunk boundaries; it is *not* played, only fed in.
- **Crossfade (X)** blends the end of the previous output with the start of the
  current one using an equal-power (sin/cos) curve, eliminating seam clicks.
- The body `play[X:B]` is emitted verbatim.

This is implemented in `engine.py` (`ChunkProcessor`) and the crossfade math is
unit-tested in `tests/test_dsp.py` (runs without a GPU or audio hardware).

---

## 5. Latency budget (the "sub-300 ms" claim, made concrete)

End-to-end latency = capture buffering + algorithmic + inference + playback
buffering + the game's own pipeline. We control the first four.

| Component | Source | Typical |
|---|---|---|
| Capture block | `block_ms` (we hold a block before processing) | 150 ms |
| Crossfade hold | `crossfade_ms` (we delay by the overlap tail) | 40 ms |
| Inference | RVC forward pass on a mid-range NVIDIA GPU | 30–90 ms |
| Output buffer | one block in `out_q` + WASAPI | ~20–40 ms |
| **VoiceBridge subtotal** | | **~240–320 ms** |
| Game/Discord network + jitter | out of our hands | +50–150 ms |

**Tuning levers** (see `docs/LATENCY.md`):
- Lower `block_ms` (e.g. 96 ms) → less latency, but inference must keep up or you
  get dropouts. The dominant lever.
- Lower `crossfade_ms` toward ~25 ms.
- A faster GPU shrinks the inference term directly.
- `f0_method: rmvpe` is the best quality/speed tradeoff for pitch.

Honest expectation: on a decent NVIDIA card (RTX 3060+), **~200–280 ms
mouth-to-game** is realistic and feels "live" in voice chat. On an older/weaker
GPU you push `block_ms` up and live with ~300–400 ms. CPU-only is not viable for
real time — it's there only so the pipeline runs for testing.

---

## 6. The conversion backends (pluggable)

All backends implement one interface (`VoiceConverter` in `converter.py`):

```python
class VoiceConverter(ABC):
    sample_rate: int                       # SR it wants audio at
    def warmup(self) -> None: ...          # run a dummy forward pass (JIT/CUDA warmup)
    def convert(self, audio: np.ndarray) -> np.ndarray: ...   # mono float32 in/out, length-preserving
    def close(self) -> None: ...
```

| Backend | What it is | Needs | Use it for |
|---|---|---|---|
| `passthrough` | Identity (+ optional toy pitch shift). **Not AI.** | nothing | Verifying mic→cable→game routing on any machine, today. |
| `rvc` | Your fine-tuned cloned-voice model. The real product. | NVIDIA GPU + trained `.pth` | Production. Best quality. |
| `seedvc` | Zero-shot conversion from a reference clip — no training. | NVIDIA GPU + reference wav | Instant first test before you commit to training. |

Swap with one line in `config.yaml` (`backend: rvc`). New backends (e.g. a
future faster model) drop into `backends/` and register themselves — the engine
doesn't change.

> **Recommended path for "working tonight":** if you want zero risk, the
> battle-tested **w-okada/voice-changer** app can load the very same RVC `.pth`
> this repo helps you train, and route to VB-CABLE. See `docs/SETUP_WINDOWS.md`
> §"Fast path". VoiceBridge's own engine is the integrated, scriptable option;
> w-okada is the safety net. They are interchangeable because the **model file
> is the asset**, not the runner.

---

## 7. Voice cloning workflow (problem A)

1. **Record** 5–15 minutes of you, clean mic, quiet room, varied sentences.
   `python -m voicebridge record` reads prompts aloud-style from
   `docs/sentences.txt`, auto-splits clips, normalizes, and saves a dataset.
2. **Train** an RVC model from that dataset (`docs/TRAINING.md`). Outputs
   `your_voice.pth` (+ `.index`). ~20–60 min on a GPU; doable on free/cheap
   cloud GPUs if you don't have one. `train.py` wraps the steps.
3. **Deploy**: copy `your_voice.pth`/`.index` into her `models/`, set
   `backend: rvc`, run.

Data quality dominates final quality. The recording tool enforces the boring
things that matter: mono, consistent level, no clipping, no long silences,
16 kHz+ source. See `docs/TRAINING.md` for the do's and don'ts.

---

## 8. The girlfriend-facing experience

She should never see a terminal. `python -m voicebridge gui` (or a desktop
shortcut / packaged `.exe`) opens a small control panel:

- Pick **microphone** (her mic) and confirm **output** = CABLE Input.
- **Big Start/Stop** button. Live input/output level meters + latency readout.
- A model dropdown (in case you make her several voices).
- "Monitor in headphones" toggle so she can hear herself as you.

In the game (Rust/Discord) she sets **microphone = "CABLE Output (VB-Audio
Virtual Cable)"** once, and forgets it.

---

## 9. Risks, limitations, and honest caveats

- **GPU is non-negotiable for real time.** Her PC needs a reasonably modern
  NVIDIA GPU. AMD/Intel GPUs are a rough road (DirectML/ONNX) and out of scope
  for v1.
- **Quality ≠ perfect.** Cloned RVC voices are convincing but can wobble on
  whispers, shouting, laughter, and heavy background noise. A noise gate and a
  good mic help a lot.
- **It converts *whatever* it hears.** Background TV, a roommate, keyboard
  clatter all get "voiced" as you. Quiet room + push-to-talk in the game helps.
- **Latency is real, just small.** It will never be literally zero; the design
  goal is "feels live in voice chat," ~200–300 ms.
- **Consent & ethics.** This clones *your* voice with your consent, for your
  partner, in games. Don't use it to impersonate people who didn't agree, for
  fraud, or to evade bans. See `README.md` §Ethics.
- **Anti-cheat:** VoiceBridge only touches audio devices (a virtual mic). It
  does not inject into or modify any game process, so it's not a game cheat —
  but always follow each game's and platform's rules.

---

## 10. Repository map

```
voicebridge/
├── README.md                 # quickstart + ethics
├── config.example.yaml       # all tunables, documented
├── docs/
│   ├── DESIGN.md             # this file
│   ├── SETUP_WINDOWS.md      # step-by-step install (VB-CABLE, GPU torch, run)
│   ├── TRAINING.md           # record -> train -> deploy your cloned voice
│   ├── LATENCY.md            # how to hit sub-300 ms
│   └── sentences.txt         # the script you read while recording
├── src/voicebridge/
│   ├── config.py             # typed config + YAML loader
│   ├── dsp.py                # crossfade / resample / gate / level helpers (pure, tested)
│   ├── audio_io.py           # real-time duplex pipeline (streams + queues + worker)
│   ├── converter.py          # VoiceConverter interface
│   ├── backends/
│   │   ├── passthrough.py     # works today; routing test
│   │   ├── rvc.py            # cloned-voice inference
│   │   └── seedvc.py         # zero-shot inference
│   ├── engine.py             # ChunkProcessor + RealtimeEngine (the §4 algorithm)
│   ├── record.py             # guided recording tool
│   ├── train.py              # RVC training orchestration
│   ├── gui.py                # Tkinter control panel
│   └── cli.py                # `python -m voicebridge {devices,record,run,gui,train}`
├── scripts/
│   ├── list_devices.py       # standalone device enumerator
│   └── bootstrap_private_repo.sh
└── tests/                    # pure-Python unit tests (no GPU/audio needed)
```
