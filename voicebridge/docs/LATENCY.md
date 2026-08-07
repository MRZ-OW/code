# Hitting sub-300 ms (latency tuning)

End-to-end delay = how long after she speaks the game hears it. VoiceBridge
controls everything up to the virtual mic; the game/Discord adds its own
network buffer on top.

## Where the milliseconds go

```
block_ms      we hold one block before processing        (biggest lever)
crossfade_ms  we delay by the overlap tail
inference     model forward pass on the GPU              (GPU speed)
output buffer one block sitting in the output queue + WASAPI
```
VoiceBridge subtotal ≈ `block_ms + crossfade_ms + inference + ~one block`.

## The levers (in `config.yaml` → `stream:`)

| Lever | Lower it to... | Cost |
|---|---|---|
| `block_ms` | cut latency the most | GPU must convert a block faster than its real-time duration, or you get dropouts/crackle |
| `crossfade_ms` | shave a bit more | too low (<20 ms) brings back faint seam clicks |
| `context_ms` | (minor) | too low hurts continuity; doesn't add output latency, only compute |
| GPU | cut the inference term directly | hardware |

## Recommended starting points

| Her GPU | block_ms | crossfade_ms | Expect |
|---|---|---|---|
| RTX 4070 / 4080+ | 96 | 25 | ~150–220 ms, very live |
| RTX 3060 / 3070 | 128 | 30 | ~200–280 ms |
| GTX 1660 / older | 192 | 40 | ~300–380 ms (usable) |
| CPU only | — | — | not real-time; testing only |

## Method
1. Start with the row for her GPU.
2. Run with `logging.show_latency: true`. Watch the `infer ... ms` and
   `dropouts` counters it prints every ~2s.
3. **Lower `block_ms` until `dropouts` start climbing**, then back off one step.
   `infer_ms` should stay comfortably below `block_ms`.
4. Trim `crossfade_ms` toward 25 ms if you can't hear seams.

## Other wins
- Close other GPU apps (browsers with lots of tabs, OBS encoding on GPU, other
  games). Inference time is the variable that blows the budget.
- In Discord, turn **off** "Echo Cancellation", "Noise Suppression", and
  "Automatic Gain Control" on the CABLE Output mic — they add latency and fight
  the converted audio. Keep the input sensitivity manual.
- Prefer a wired headset/mic; some Bluetooth mics add 100 ms+ on their own.
- A noise gate (engine-side block gate, or the game's) stops it voicing silence.
