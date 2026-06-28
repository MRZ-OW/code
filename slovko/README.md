# Slovko 🦊 — *Po našom.*

A beautiful, gamified, **offline-first Android app for learning modern spoken Slovak** — built to get you chatting with your Slovak friends.

Meet **Líška Maja**, your fox guide, and learn the Slovak people *actually* speak: texting slang, café orders, banter — not textbook formal register.

## Features

- **Skill-tree curriculum** — A0 → A2, 13 units from *Zvuky* (sounds) to *Píšeme si* (real WhatsApp chats), with explicit teaching of the 6 grammatical cases, verb aspect, and *vykať/tykať*.
- **FSRS spaced repetition** — a pure-Kotlin FSRS-4.5 scheduler decides exactly when to review each word, on-device.
- **The Daily Brew** — a ~7-minute daily ritual: warm-up → lesson → reviews → a chat moment.
- **Chat track** — branching scenario dialogues + a searchable texting phrasebook + an optional, pluggable AI conversation partner.
- **Gamification, done ethically** — XP, levels, streaks (with freezes), daily quests, 15 achievements, and a backend-free simulated **league**. No lockouts, no shame, nothing pay-to-win.
- **Smart notifications** — daily reminder at your chosen time, review-due nudges, evening streak-rescue — all local, reboot-safe.
- **Home-screen widget** — streak + word of the day + one-tap practice.
- **Beautiful & accessible** — Material 3, light/dark, dynamic color, Čičmany folk-art accents, reduced-motion support, full TTS.

## Architecture

Single-module, clean layering — `ui → domain → data`. Jetpack Compose, Hilt, Room, DataStore, WorkManager, Coroutines/Flow. The `domain` layer is pure Kotlin and JVM-unit-tested (FSRS, grading, XP, league).

See [`DESIGN.md`](DESIGN.md) for the full product + technical design.

## Building the APK

Requires the Android SDK + JDK 17/21.

```bash
cd slovko
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

**No local Android SDK?** Push to GitHub — the workflow at `.github/workflows/android-ci.yml`
runs the unit tests and builds the debug APK on every push, uploading it as the
**`slovko-debug-apk`** artifact (downloadable from the Actions run).

## Tests

```bash
./gradlew testDebugUnitTest
```
