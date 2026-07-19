# RageBait Guard

A small personal-use Android app that makes TikTok calmer. It runs **alongside
the real TikTok app** (normal login, normal account — no third-party client,
no unofficial APIs) and does two things while TikTok is on screen:

1. **Auto-skip** — reads the visible video's caption, hashtags, and creator
   handle through Android's accessibility APIs, and if they match your
   blocklist it swipes to the next video for you.
2. **The 😤 button** — a tiny draggable floating button. Tap it on any
   rage-bait video: the video is skipped *and* saved as a training example.
   Terms that show up in **3+** flagged videos become active blockers
   automatically; a creator flagged **twice** is blocked outright. Everything
   learned is visible and removable in the app.

All data stays on the phone. Nothing is uploaded anywhere.

## How the filtering works

Matching is deliberately transparent (no black-box model):

| Source | Behavior |
| --- | --- |
| **Custom blocklist** | Words (word-boundary match), phrases and `#hashtags` (substring match). Editable in-app. |
| **Topic packs** | Prebuilt toggleable lists: *Engagement bait*, *Gender wars / dating drama*, *Outrage politics*. |
| **Learned terms** | From 😤 flags. Activate at 3+ sightings (`TrainingStore.LEARN_THRESHOLD`). Pending terms shown greyed-out. |
| **Blocked creators** | Auto-added after 2 flags (`TrainingStore.CREATOR_THRESHOLD`), or removable in-app. |

Safety valves in `SkipController`: a 1.6 s cooldown between auto-skips, and a
hard stop after 5 consecutive skips (10 s pause) so the guard can never
spiral into an endless swipe loop — that both feels broken and looks
bot-like to TikTok.

## Optional AI judge (OCR + fast LLM)

For videos the lists don't catch, an escalation pipeline can be enabled in
the app (off by default, needs a [Gemini API key](https://aistudio.google.com)):

1. **Screenshot** the video via the accessibility API (Android 11+).
2. **On-device ML Kit OCR** (~100–250 ms) reads text baked into the frames —
   the classic rage-bait headline overlay that never appears in
   accessibility nodes. The image never leaves the phone.
3. The blocklist is re-checked against the OCR text (free — many videos
   resolve right here with no API call).
4. Only if still unresolved, the recognized *text* plus the blocked-topic
   list goes to a fast Gemini model, which answers a single word: Yes (skip)
   or No.

The default model id is **`gemini-flash-lite-latest`** — an alias that
auto-tracks Google's newest stable flash-lite, so the app doesn't 404 when a
specific version is retired (Google gives ~2 weeks' notice before the alias
moves). To pin a fixed version, type one in the app (e.g.
`gemini-3.1-flash-lite`). Retired ids saved by older installs (e.g.
`gemini-2.5-flash-lite`) are auto-migrated to the default on read.

Latency is ~0.5–1.5 s end-to-end — the skip lands within the first second
or two of a video someone would otherwise watch for 10+. Cost is ~400
prompt tokens + 1 output token per judged video ≈ **~10 cents per 1,000
videos** at flash-lite pricing. One request in flight at a time, one
judgement per video (LRU-cached verdicts), and every failure fails *open* —
a network hiccup can never block scrolling.

## Z Fold 6 support

Built fold-aware from the start:

- **Swipe gestures** are computed from the *live* display bounds at dispatch
  time — correct on the narrow cover screen and the big inner screen.
- **The 😤 button** stores its position as *fractions* of the screen and
  re-anchors on every fold/unfold/rotation (`onConfigurationChanged`), so it
  never strands off-screen.
- **The settings screen** is `resizeableActivity` with a 640 dp max-width
  centered column — fills the cover screen, doesn't stretch on the inner one.

## Build & install

Requires JDK 17+ and the Android SDK (platform 35). From this directory:

```bash
./gradlew assembleDebug        # → app/build/outputs/apk/debug/app-debug.apk
./gradlew testDebugUnitTest    # classifier/tokenizer unit tests
adb install app/build/outputs/apk/debug/app-debug.apk
```

## Phone setup (one-time)

1. Install the APK (sideload; you may need to allow "install unknown apps").
2. Open **RageBait Guard** → *Open Accessibility settings*. The app tries to
   deep-link straight to its own toggle; if your phone opens the general
   Accessibility page instead (Samsung One UI does this), go to
   **Installed apps → RageBait Guard → On → Allow**. Android will warn that
   the service can read screen content — that is exactly what it does, for
   TikTok only, on-device only.
3. Samsung aggressively kills background services: in phone Settings →
   Apps → RageBait Guard → Battery, set **Unrestricted**.
4. Open TikTok. The 😤 button appears; drag it wherever it's least annoying.

## Tuning

- Blocklist, topic packs, learned terms, blocked creators: all in the app UI.
- Thresholds: `TrainingStore.LEARN_THRESHOLD` / `CREATOR_THRESHOLD`.
- Skip pacing: constants in `SkipController`.
- Debounce for screen reads: `GuardService.DEBOUNCE_MS`.

## Honest limitations

- **Text-only.** It sees captions/hashtags/handles plus (with the AI judge
  enabled) OCR of on-screen text — but not the imagery or audio itself.
  Rage bait with a totally clean screen sails through until it's flagged a
  few times.
- **Reactive, not predictive.** TikTok decides the feed server-side a video
  at a time; there is no sanctioned way to peek ahead. The guard skips fast
  rather than pre-filtering.
- **UI-coupled.** A TikTok redesign can change accessibility node structure;
  heuristics live in `ScreenReader` and may need occasional touch-ups.
- **English-leaning defaults.** Stopwords and topic packs are English; add
  your own terms for other languages.

## Use responsibly

This is a personal accessibility/wellbeing tool for a consenting user on
their own device — the person using the phone should know it's running and
control its lists (that's why everything is visible in the app). Note that
auto-dispatched swipes are still automation of the TikTok UI; the built-in
pacing keeps it human-ish, but use it at your own judgement. If you ever
distribute this beyond personal use, Google Play requires a prominent
disclosure flow for accessibility-service data access (and TikTok's terms
frown on UI automation generally).

For best results, pair it with TikTok's own tools first (Settings → Content
preferences → *Filter keywords*, *Manage topics*, and long-press → *Not
interested*): they shape what the server sends; this guard mops up what
slips through.
