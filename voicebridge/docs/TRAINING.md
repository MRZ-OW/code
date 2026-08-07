# Cloning your voice (training the RVC model)

This produces `your_voice.pth` (+ `your_voice.index`) — the file that makes the
output sound like **you**. You do this once. Then your girlfriend just runs the
real-time engine with that file.

## TL;DR
1. `python -m voicebridge record` — read the prompts, get 5–15 min of clean audio.
2. `python -m voicebridge train --check` — make sure the dataset is good.
3. Train with the **RVC WebUI** (`python -m voicebridge train` prints exact steps).
4. Copy `your_voice.pth` + `.index` into `models/`, set `backend: rvc`.

---

## 1. Record good data (this matters most)

Garbage in, garbage out — final quality tracks recording quality more than any
setting. The recorder enforces mono / level / trimming; you handle the room:

- **Quiet room.** No fan, TV, music, or roommates. Background noise gets cloned.
- **One consistent mic, consistent distance** (a hand-span away). Don't move
  closer/farther between clips.
- **Normal speaking energy** — talk like you're in a game, not whispering, not
  shouting. Avoid clipping (the recorder normalizes, but don't redline the mic).
- **Variety helps:** statements, questions, callouts, numbers, your actual slang.
  Edit `docs/sentences.txt` to add lines you really say in Rust/Discord.
- **5–15 minutes total.** More varied (not just longer) is better. ~10 min is a
  sweet spot.

```powershell
python -m voicebridge record
```
Clips land in `recordings/dataset/`. Run it again any time to add more.

Validate:
```powershell
python -m voicebridge train --check
```
Fix anything it flags (clipped/quiet/too short) by re-recording those bits.

---

## 2. Train (RVC WebUI — easiest)

Run `python -m voicebridge train` to print the exact, current steps. In short:

1. Clone the RVC WebUI:
   ```
   git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI
   ```
   Install its requirements (CUDA torch) and download the pretrained base models
   it links (ContentVec/HuBERT + the `rmvpe` pitch model).
2. `python infer-web.py` → opens a browser UI.
3. **Train** tab:
   - Experiment name: `your_voice`
   - Dataset path: your `recordings/dataset` folder (absolute path)
   - Sample rate: **48k** (or 40k), **Pitch guidance: yes**, f0 method **rmvpe**
   - Epochs: ~**150–250** to start; save every ~25
   - Run **Process data → Feature extraction → Train model → Train feature index**
4. Outputs:
   - generator → `your_voice.pth`
   - feature index → `added_*.index` → rename to `your_voice.index`

**No GPU?** Train on a rented cloud GPU (vast.ai/runpod) or a "RVC training
Colab" notebook, then download the two files.

---

## 3. Deploy

Copy both files into `voicebridge/models/`, then in `config.yaml`:
```yaml
backend: rvc
rvc:
  model_path: models/your_voice.pth
  index_path: models/your_voice.index
  f0_up_key: 0
  index_rate: 0.5
  protect: 0.33
  device: cuda:0
```
Run `python -m voicebridge run` (or `gui`).

---

## 4. Tuning by ear

| Knob | What it does | Try |
|---|---|---|
| `f0_up_key` | Shifts pitch in semitones. Her natural pitch differs from yours; the model retargets timbre but pitch can sit high/low. | Start `0`. If it sounds too high/squeaky, `-2` to `-5`. Too deep, `+2`. |
| `index_rate` | How hard it pulls toward your trained timbre vs. clarity. | `0.5` default. Higher = more "you" but can smear; lower = clearer but less you. |
| `protect` | Protects unvoiced consonants (s, t, breaths) from artifacts. | `0.33`. Raise toward `0.5` if consonants sound weird. |
| `f0_method` | Pitch tracker. `rmvpe` is the best all-rounder. | Keep `rmvpe`. |

Change one thing at a time, say the same sentence, compare. A **noise gate** and
a decent mic on her end do more for realism than any of these.

---

## Ethics reminder
Train on **your own** voice, with your consent, for your partner, in games.
Don't clone people who didn't agree, don't use it for fraud/impersonation, and
follow each game's rules. See the README.
