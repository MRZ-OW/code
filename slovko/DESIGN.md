# Slovko — DESIGN.md

> **Slovko** — *"Po našom."* (In our way / the way we speak.)
> An offline-first, beautiful, gamified Android app for learning **modern spoken Slovak**, A0 → A2, with chatting-with-friends as the north star.

---

## Table of Contents

1. [Vision & Product Principles](#1-vision--product-principles)
2. [The Daily Loop ("Daily Brew")](#2-the-daily-loop-daily-brew)
3. [Learning Design & Curriculum](#3-learning-design--curriculum)
4. [Spaced Repetition (FSRS)](#4-spaced-repetition-fsrs)
5. [Exercise Types & Grading](#5-exercise-types--grading)
6. [Chat / Conversation Track](#6-chat--conversation-track)
7. [Gamification System](#7-gamification-system)
8. [Visual & UX Design System](#8-visual--ux-design-system)
9. [Screen-by-Screen](#9-screen-by-screen)
10. [Accessibility](#10-accessibility)
11. [Technical Architecture](#11-technical-architecture)
12. [Data Layer (Room schema)](#12-data-layer-room-schema)
13. [Content Shipping & Seeding](#13-content-shipping--seeding)
14. [Notifications & Retention](#14-notifications--retention)
15. [Widget & Quick Actions](#15-widget--quick-actions)
16. [Build, Versions & CI](#16-build-versions--ci)
17. [Resolved Cross-Section Decisions](#17-resolved-cross-section-decisions)

---

## 1. Vision & Product Principles

Slovko teaches the Slovak people actually speak — texting, café orders, banter — not textbook formal register. The product is a small, daily, ~7-minute ritual that compounds into real conversational ability.

**Pillars**
- **Spoken-first, modern register by default.** Formal (*vykanie*) is a labeled variant, never the baseline.
- **Offline-first.** 100% of learning, progress, SRS, streaks, achievements and chat transcripts live on-device. Fully functional in airplane mode. The *only* optional network touchpoint is a user-supplied AI chat partner.
- **Reward effort, never punish learning.** Mistakes are data; the default model never locks a learner out.
- **English scaffolding, Slovak personality.** Slovak words are always the visual heroes — bigger, colored, never buried in English.
- **Habit by design.** Same cue, same ritual, same reward; a fixed-shape daily session with a bounded time ceiling.
- **Ethical gamification.** Variable rewards add texture only; nothing purchasable gates learning; no shame copy.

**Brand voice:** Warm, casual, witty — a Slovak friend texting you. Correct → *"Presne tak! Nailed it."* Wrong → *"Skoro. Try this one again — you've got it."* (never "Wrong!").

**Mascot — Líška Maja**, a small modern fox (Slavic trickster-but-kind, clever with words). Rust-orange (`#E2603B`), cream belly (`#FFF3E6`), one charcoal ear tip, and a signature woven **Čičmany-pattern scarf**. 8 poses: waving, thinking, celebrating, sleepy, proud, worried, listening, reading. She speaks like a friend, not a teacher.

---

## 2. The Daily Loop ("Daily Brew")

One session = one **Daily Brew** (~7 min ceiling). Fixed shape so the brain stops deciding and just shows up.

| Phase | Time | Content | Purpose |
|---|---|---|---|
| 1. Warm-up | 0:45 | 3 SRS review cards (fast, known) | Instant win / dopamine |
| 2. Core lesson | 4:00 | 1 skill node = 8–12 exercises, mixed types | New material in context |
| 3. SRS review | 1:30 | 6–10 due cards | The actual learning engine |
| 4. Chat moment | 0:45 | 1 micro-dialogue or texting phrase | Goal-relevant reward |
| Wrap | 0:15 | Streak +1, XP tally, "+3 words you can now text" | Progress made visible |

Why it works: low activation energy (bounded ~7 min), variable-but-bounded reward (XP/streak), and the closing Chat moment ties every session to the real goal — chatting with friends. **Streak freeze** (2 banked, earn 1 per 7-day streak) prevents all-or-nothing collapse.

---

## 3. Learning Design & Curriculum

Linear-with-branches **skill tree**. Each **Unit** ≈ a CEFR can-do cluster → 3–5 **Skills** (crown-able nodes) → each Skill = 4–6 **Lessons** → each Lesson = 8–12 **Exercises**. Modern spoken register is default; formal forms are labeled variants.

### CEFR Curriculum A0 → A2

- **Unit 0 — Zvuky (Sounds) [A0]** — pre-vocab phonics. Skills: *Alphabet & diacritics* (dĺžeň/mäkčeň), *The hard ones* (ä, ô, ľ, ď, ť, ň, dz/dž), *Stress always on syllable 1*, *Read-aloud drills*. Pure listening + speaking, no SRS pressure.
- **Unit 1 — Ahoj! [A0–A1]** — *ahoj/čau/nazdar* vs *dobrý deň*; *Ako sa máš?/máte?*; *Volám sa…*; *Ďakujem/prosím/prepáč*; Texting openers. First *vykať/tykať* contrast.
- **Unit 2 — Ja a ty [A1]** — pronouns; *byť* present; nationalities/*Som z…*; *Hovoríš po anglicky?*; numbers 0–20; *hej* vs *áno*.
- **Unit 3 — Rodina [A1]** — family nouns + diminutives (*mama→mamka*); possessives (*môj/moja/moje*); *Mám…* (accusative intro); age; pets.
- **Unit 4 — Jedlo & Káva [A1]** — foods/drinks; *Chcem/Dám si…*; *Máte…?*; café & krčma phrases; *Mám rád/rada*; accusative of food objects.
- **Unit 5 — V meste [A1–A2]** — places; *Kde je…?*; directions; prepositions + locative (*v meste*); transport (instrumental, *idem autobusom*); *Idem do/na…*.
- **Unit 6 — Čas & Plány [A2]** — clock & *o koľkej?*; days/months; making plans; **verb aspect intro** (*robiť/urobiť*, *ísť/prísť*). Texting: *o 5ke*, *si voľný?*.
- **Unit 7 — Každý deň [A2]** — routine verbs; reflexives (*umývam sa*); frequency adverbs; modals (*musím/chcem/môžem*); aspect drilled.
- **Unit 8 — Nakupovanie [A2]** — *Koľko to stojí?*; euros/cents; clothing/sizes; *Môžem zaplatiť kartou?*; genitive of quantity (*dve kávy*).
- **Unit 9 — Počasie & Pocity [A2]** — weather; *Je mi…* (dative of state); emotions; small talk; reactions.
- **Unit 10 — Práca & Škola [A2]** — jobs/studies; *Čím si?/Kde robíš?*; instrumental of profession.
- **Unit 11 — Cestovanie [A2]** — train/bus/booking; accommodation; emergencies; **past tense intro** (*bol som, kúpil som*).
- **Unit 12 — Píšeme si [A2, capstone]** — pulls everything into real WhatsApp-style conversations (the "Chat with Friends" north-star unit, tied to the **Kamarát** badge).

### Slovak-Specific Challenges (taught explicitly)

- **Pronunciation:** Unit 0 + recurring "Zvuk dňa" micro-lessons; minimal-pair drills (*ľúbiť/lúka*, *mäso/päť*, *kôň/stôl*). Rule: **mäkčeň** softens (d→ď), **dĺžeň** lengthens — with audio A/B.
- **6 cases, one per need** (never paradigm dumps), ordered by utility: Nominative → Accusative (U3/U4) → Locative (U5) → Instrumental (U5/U10) → Genitive (U8) → Dative (U9). Each gets `fill-in-the-case` exercises and a **color-coded case chip** UI, always anchored to a function.
- **Verb aspect** (hardest A2): process vs. result, paired verbs, visual (imperfective = ongoing arrow; perfective = checkmark). Intro U6, drilled U7/U11; exercises force aspect by context.
- **vykať vs tykať:** persistent **formality toggle** on dialogues. Rule: friends/peers/online = *tykať*; strangers/elders/officials = *vykať*. Chat track is mostly *tykať*; a dedicated "Formal mode" skill covers *vykanie*.

A card is **only "born"** (added to SRS) after the learner has *produced* it once correctly in-lesson — never from passive exposure.

---

## 4. Spaced Repetition (FSRS)

**We use FSRS (v4/v5), not SM-2.** FSRS models per-card memory **stability + difficulty** and schedules at a target retention; for vocabulary with wildly varying difficulty it yields ~20–30% fewer reviews at equal retention. It is a pure deterministic function of review history → fully offline, on-device. *(This supersedes the SM-2 fields in the original arch draft — see [§17](#17-resolved-cross-section-decisions).)*

**Card states:** `New → Learning → Review → Relearning`. Each card stores `stability`, `difficulty`, `due`, `lastReview`, `reps`, `lapses`, `state`.

**Grades (4 buttons):** `Again(1) / Hard(2) / Good(3) / Easy(4)`. Auto-grade from exercises: correct first try → `Good`; correct with hint/slow → `Hard`; wrong → `Again`; trivially fast → `Easy`.

**Steps & targets**
- Learning steps (intra-day): `Again → 1 min`, `Good → 10 min`, then graduate (FSRS computes first interval from initial stability).
- Target retention **0.90** (user-adjustable 0.85–0.95).
- Relearning step on lapse: `10 min`, then FSRS post-lapse stability.
- Daily caps: **15 new/day** (presets 8/12/20), **120 review cap**. New cards gated behind review load: if >80 reviews due, suppress new cards that day.

**Mix:** Phase 2 introduces new cards interleaved with immediate practice (i+1). Phases 1 & 3 pull pure due cards (`due <= now`, ordered by overdue ratio).

**Granularity:** one card per `(lemma, sense, direction)`. Recognition (SK→EN) graduates before production (EN→SK) unlocks. Grammar patterns get "concept cards" tested via fill-in-the-case / aspect-choice.

The FSRS scheduler is implemented as a pure-Kotlin, JVM-unit-testable engine in `domain` (`FsrsScheduler`), independent of Android.

---

## 5. Exercise Types & Grading

| Type (DB enum) | Tests | SRS grade source |
|---|---|---|
| `MCQ` (SK→EN / EN→SK / image) | recognition | first-try → Good |
| `LISTEN_CHOOSE` | aural recognition | yes |
| `LISTEN_TYPE` | spelling + diacritics | strict (diacritics count) |
| `WORD_BANK` | syntax/word order/agreement | yes (production) |
| `TRANSLATE_EN_SK` (free type) | full production | strictest |
| `TRANSLATE_SK_EN` | comprehension | yes |
| `SPEAK` (on-device ASR or self-rated) | output, hard phonemes | self-grade Hard/Good |
| `MATCH_PAIRS` | form↔meaning linking | low weight |
| `FILL_CASE` | morphology | concept cards |
| `ASPECT_CHOICE` | aspect | concept cards |
| `DIALOGUE_FILL` | pragmatic use | participation |

Each Skill declares a weighted exercise pool: `Skill ⟶ {exerciseType: weight}`.

**Grading** lives in domain (`GradeAnswerUseCase`): diacritic-insensitive, whitespace/punctuation-normalized matching against an `acceptable` set (learners won't type č/š/ž early; word order is flexible). `LISTEN_TYPE` is strict on diacritics where the lesson teaches them.

---

## 6. Chat / Conversation Track

A parallel, always-accessible track (unlocked after U1) — the app's north star. Two components:

**1. Scenario dialogues** (branching, replayable, formality-toggle, 6–12 turns): *Making plans, At the café, Running late, Weekend recap, Light banter, Asking a favor, Group-chat reactions.* Learner picks replies from a word bank, then graduates to free-type. Natural-speed audio + optional 0.7× slow replay.

**2. Texting phrasebook** (searchable, copyable, SRS-eligible) — modern WhatsApp Slovak: *čau, čo robíš?, daj vedieť, dohodnuté, hej/jasné/v pohode, no nevadí, vďaka/dik, meškám trochu, sorry/prepáč, vidíme sa, maj sa/pa, haha/xd, no (filler)*. Conventions taught explicitly: dropped diacritics (*caw*), English loanwords (*sorry, ok, lol*), vowel-stretching (*ahojkaaa*), diminutive overload as friendliness.

**Partner abstraction:** `ChatPartner` interface with `suspend fun reply(history): Result<String>`. **Default build = on-device scripted branching partner** (deterministic responses from `ChatScenario` + intent matching) — fully offline. Optional Retrofit impl is opt-in via Settings; the user supplies endpoint/key (stored in DataStore). A subtle "naturalness" toast rewards colloquial choices.

---

## 7. Gamification System

All constants live in a single `GamificationConfig.kt` (tunable without touching logic). All loops resolve **on-device**.

### XP (earned, never spent)

| Exercise | Base XP |
|---|---|
| Tap-to-translate / word bank | 6 |
| Listening | 8 |
| Type-what-you-hear | 9 |
| Speaking | 10 |
| Conversation turn | 12 |
| SRS review card | 5 |

```kotlin
object XpRules {
    const val LESSON_COMPLETE_BONUS = 10
    const val PERFECT_LESSON_BONUS  = 15
    const val FAST_LESSON_BONUS     = 8
    const val COMBO_STEP            = 1   // +1/correct beyond 3
    const val COMBO_MAX_BONUS       = 10
    const val FIRST_LESSON_OF_DAY   = 5
}
```
A 12-exercise lesson pays ~90–110 XP. **Level curve:** `xpForLevel(n) = 50*n^2 + 50*n` (front-loaded dopamine, level ring around avatar).

**Daily XP goals** (a floor that defines a "win", never auto-escalated): Casual 30 / Regular 60 / Serious 120 / Intense 250.

### Streaks (the #1 retention lever)
A streak day = **meeting the selected daily XP goal** (not merely opening). Day boundary = local midnight + 3h grace.

```kotlin
object StreakRules {
    const val GRACE_HOURS = 3
    const val FREEZE_MAX_HELD = 2
    const val FREEZE_GEM_COST = 200
    const val REPAIR_WINDOW_DAYS = 2
    const val REPAIR_GEM_COST = 350
    const val WEEKEND_AMULET_COST = 100
}
```
- **Streak Freeze:** auto-consumed on a missed day (preserves count, does *not* count as a learning day; UI: "Streak protected — jump back in today").
- **Streak Repair:** within 2 days, free via a "comeback" lesson (offered first) or 350 gems.
- **Weekend Amulet:** 100 gems; one weekend day covers the other.
- Milestone confetti + rewards at 3/7/14/30/50/100/365 (gems, freezes, badges, chests).

### Focus model (default) — **Hearts rejected as the default**
No lockout, no life loss. Each mistake: (1) re-queues the item later in the same lesson (mastery, not punishment), (2) schedules it sooner in SRS. A **Perfect Lesson** grants bonus XP — accuracy is *aspirational*, not *enforced*. An opt-in **Challenge Mode** offers 3 hearts + 1.5× XP for users who want tension.

```kotlin
object MistakeRules {
    const val REQUEUE_AFTER_N_ITEMS = 3
    const val MAX_REQUEUE = 2
    const val CHALLENGE_MODE_HEARTS = 3
    const val CHALLENGE_MODE_XP_MULT = 1.5
}
```

### Leagues (backend-free, simulated, honest)
Week-long league, cohort of 15 = user + 14 deterministic **bots**. Tiers Bronze→Silver→Gold→Sapphire→Ruby→Emerald→Diamond; top 5 promote, bottom 4 demote. Bot `dailyMeanXp` is seeded each week clustered around the user's trailing 7-day average (`MEAN_FACTOR_RANGE = 0.55..1.35`, `MIN_BOT_MEAN = 20`) so the race is always winnable. Bot XP accrues **lazily from elapsed time on app open** (no background work). Disclosed honestly: "Your league is a private practice cohort." A separate **personal-bests** board always exists.

### Achievements (15, Slovak-flavored)
Prvé slovo, Ranné vtáča, Nočná sova, Bezchybný (5/25/100), Ohnivák (7/30/100), Ukecaný, Dobré ucho, Hlas národa, Slovník (500/1500/3000), Maratónec, Týždeň víťazstva, Povýšený, Verný, Zberateľ, **Kamarát** (complete the Chat-with-Friends unit — north-star milestone). Grayscale locked → colored + burst + 10–50 gems on unlock.

### Daily Quests (3 rotating)
Refresh at local midnight; one volume + one skill + one flavor, weighted by tier. Completing all 3 fills the **Daily Chest** (variable-ratio). Weekly meta ("5 of 7 days") grants a rare chest + freeze.

### Variable-ratio rewards (ethical guardrails — hard rules in code comments)
**Gems** = spendable soft currency (freezes, repairs, amulets, cosmetics, optional Challenge entries). **Chests** loot XP/gems only (no pay-to-win). Hard rules: no real-money loot boxes; no FOMO timers on learning; no streak-shaming; loss-aversion reminders factual & ≤2/day; learning path fully deterministic and always available.

### End-of-Lesson Celebration (≤3–4s, skippable, reduce-motion collapses to instant)
Card slide-in → XP count-up → staggered bonus rows → combo flare → streak panel (flame grows, milestone confetti) → quest/chest bars → league strip tick → CTA ("Continue" + "Done for today"). Timing constants in `CelebrationTiming`.

---

## 8. Visual & UX Design System

### Color (Material 3 tonal) — warm earthy-premium, distinctly Central-European

**Light:** Primary Folk Red `#C0392B` / On `#FFFFFF` / Container `#FFDAD4` / OnContainer `#410001`; Secondary Pine `#2E6E4E` / Container `#B4F1C8`; Tertiary Sky Slate `#3E6B8C`; Accent/Streak Gold `#F2A900` / On-Gold `#3A2A00`; Success `#2E7D32`; Error `#BA1A1A`; Background/Surface `#FFFBF5`; Surface Container `#F7EFE3`; Surface Container High `#F1E6D6`; On-Surface `#231A14`; On-Surface Variant `#5A5046`; Outline `#857466`.

**Dark (Tatra night, warm charcoal):** Primary `#FFB4A8` / On `#690002` / Container `#93000A`; Secondary `#99D4AD` / Container `#0F5132`; Tertiary `#A6CBEF`; Gold `#FFC93C`; Success `#7FCB83`; Error `#FFB4AB`; Background/Surface `#1A140F`; Surface Container `#271E18`; High `#332821`; On-Surface `#EFE0D5`; Variant `#D6C3B5`; Outline `#9F8D7E`.

**Folk-art tokens:** Čičmany ornament line `#E6D2C0` (light) / `#3D3026` (dark) at 6% opacity behind hero areas and as the skill-tree path texture. Celebration gradient `#F2A900 → #C0392B`. Dynamic color on Android 12+ with this scheme as the custom fallback.

### Typography (Google Fonts)
- **Display/headings: Fraunces** (literary serif) — screen titles, the big Slovak target word, celebration numbers.
- **Body/UI: Inter** — excellent diacritic rendering (ľ, š, č, ô); tabular figures for streak/XP.

| Token | Font | Size/Line | Weight |
|---|---|---|---|
| Display L | Fraunces | 44/50 | 600 |
| Display M (target word) | Fraunces | 34/40 | 600 |
| Headline | Fraunces | 26/32 | 600 |
| Title | Inter | 20/26 | 600 |
| Body L | Inter | 17/24 | 400 |
| Body M | Inter | 15/22 | 400 |
| Label | Inter | 13/16 | 600 (+0.4 tracking) |

### Foundations
- **Spacing 4dp grid:** 4/8/12/16/24/32/48/64; screen edge 20dp; card padding 16dp; section rhythm 24dp.
- **Radii:** xs 8 (chips) · sm 12 (buttons) · md 20 (cards) · lg 28 (sheets/dialogs) · full (pills/FAB/avatars).
- **Elevation:** tonal surface layers over shadows; cards = Surface Container (no rest shadow); pressed = High + 1dp; bottom nav = 3dp tonal; dialogs = lg radius + 40% scrim.
- **Motion (springy):** default spring `dampingRatio 0.7, stiffness 380`; button press scale 0.96/90ms; correct-answer pulse 1.0→1.06 + green sweep; node unlock 1.15 overshoot + gold shimmer; page transitions shared-axis X 250ms; physics confetti (Čičmany/diamond/heart particles). **All gated behind Reduced Motion** → springs become 120ms fades, confetti becomes a static badge.

### Component Inventory
Primary Button (56dp, radius 12, 3dp darker "ledge" `#9B2C20` that compresses on press); Secondary/Ghost (2dp outline); Lesson Card (88dp, medallion icon, progress ring); Skill-Tree Node (72dp circle: locked/available-breathing/complete-gold-crown, connected by Čičmany-stitch dashed path that fills gold); Progress Ring (4dp stroke); XP Bar (gold pill, floating `+10`); Streak Flame (gold→red, 2px y-bob flicker; frozen = cyan ice `#7FB3D5`); Hearts (Challenge Mode only — shatter + shake on loss); Exercise Option Chip (selected/correct/wrong states + optional number key); Bottom Nav (5 items, pill indicator, labels always visible); Celebration Screen (honey→madder, Maja, count-up stats); Word/Phrase Tile (pill + speaker icon → TTS).

---

## 9. Screen-by-Screen

**Onboarding** (5 swipeable steps, progress dots, bottom-docked primary, no account): 1) Maja waving hero; 2) Why (goal chips — selecting "Chat with friends" themes copy toward conversation); 3) Level (beginner/some/get-by, phrase previews); 4) Daily goal (segmented, Maja reacts); 5) Notification opt-in (friendly time picker, default 19:00) → confetti → Home.

**Home — Learn (skill tree):** vertical winding path over a stylized Tatra silhouette (subtle parallax). Sticky top bar: streak flame · gold/XP · (Challenge hearts if on) · settings gear. Next node auto-centered with "START" bubble + Maja peeking. Unit section headers as Fraunces banners with Čičmany divider. Tap node → bottom sheet (intro, est. time, Start).

**Lesson Player:** top segmented progress bar (one per exercise) + close X (→ "Save progress?" sheet). Body changes per exercise type. Persistent bottom action zone: "Check" → slides up colored result banner ("Správne!"/"Skoro") + explanation + auto-playing correct audio → "Continue."

**Exercise screens:** Translate (tap-to-build word bank, reorderable); MCQ (big Fraunces target, 2–4 chips, audio); Listen & choose (speaker tile, slow 0.7× toggle); Speak (waveform circle, skippable); Match pairs (two columns, fade on match); Fill-the-gap (faux chat bubble teaching register).

**Lesson-Complete:** honey→madder takeover; three count-up stat cards (XP · Accuracy% · Time); flame leap if streak extended; Maja proud; confetti; Continue → path node animates to gold, stitch fills forward.

**Profile/Stats:** header card (avatar with unlockable Maja frames, "Member since", big streak flame); **calendar heatmap** (gold tones); stat tiles (XP, words, lessons, longest streak); **achievement shelf** (folk-medallion badges); league rank summary.

**Leaderboard:** weekly league as a folk-festival ranking; league name + days-remaining banner; rows (rank/avatar/name/XP tabular); user row pinned + highlighted; promotion (green) / demotion (red) zones marked; low-data state uses Maja "thinking" + honest tooltip.

**Chat / Conversation Practice (flagship):** real messaging-app look (incoming = Surface Container left; yours = Primary Container right). Scenario picker first. Two modes: **Guided** (suggested-reply chips, long-press for English hint) and **Free** (type/speak; dynamic if AI plugin installed, scripted branching otherwise). Tap a message → TTS; long-press → translation + grammar note; naturalness toast for colloquial choices.

**Settings:** grouped lg-radius sections — *Learning* (daily goal, target retention, SFX, autoplay audio, speaking on/off, Challenge Mode); *Notifications* (reminder time + "Let Slovko pick", streak/review/re-engage toggles, quiet hours, link to OS channel settings); *Appearance* (Light/Dark/System, Reduced Motion, system font scale); *Account & Data* (export/backup progress JSON, wipe); *AI partner* (optional pluggable card); *About*.

---

## 10. Accessibility

- **Contrast:** all on-color pairs meet WCAG AA (≥4.5:1 text, ≥3:1 large/UI). Never body text on gold; gold uses `#3A2A00` on-color. Status **never color-only** — always color + icon (check/x) + text.
- **Touch targets:** ≥48×48dp; primary buttons & chips 56dp; nav items 80dp; ≥8dp spacing.
- **Font scaling:** all type in `sp`; tested to 200% without truncation; the big Fraunces target word caps growth and reflows.
- **Reduced motion:** honor `Settings.Global.TRANSITION_ANIMATION_SCALE == 0` and an in-app toggle → fades, static badges, loops/parallax off.
- **Screen reader:** content descriptions on all icon-buttons; "Exercise 3 of 8" announced; Slovak spans tagged `lang="sk"` for correct TalkBack pronunciation; result banners use `liveRegion`.
- **Audio-independent:** every listening exercise has a transcript toggle; captions on spoken content; haptics on correct/wrong.

---

## 11. Technical Architecture

**Single Gradle module (`:app`)** with strict internal package layering (multi-module overhead isn't justified for a solo build). Layering enforced by packages + lint convention.

```
com.slovko
├─ SlovkoApp.kt                 // @HiltAndroidApp
├─ MainActivity.kt              // single-Activity, setContent { SlovkoApp() }
├─ core/{designsystem, common, notification}
├─ data/{db, datastore, seed, audio, ai, repository}
├─ domain/{model, repository, usecase}
├─ ui/{navigation, home, lesson, lessoncomplete, practice, chat, chathub,
│       profile, onboarding, achievements, leaderboard, settings}
└─ work/                        // WorkManager workers + scheduling + boot receiver
```

**Dependency rule:** `ui → domain → data` at the interface level; `data` implements `domain.repository`. UI never touches Room/DataStore directly. Domain has zero Android dependencies (pure Kotlin/coroutines) → JVM-unit-testable use cases (FSRS, grading, XP, streak, league).

**DI: Hilt (KSP).** `@HiltViewModel`, `hiltViewModel()` in Compose, `@HiltWorker` via `androidx.hilt:hilt-work`. The graph (Room + 11 DAOs + DataStore + repos + injected workers + TTS/audio singletons + pluggable AI partner) justifies Hilt over manual DI.

**State management:** each screen has a ViewModel exposing `val uiState: StateFlow<XUiState>` (sealed interface). Events go up via plain functions (`onAnswerSelected`, `onSubmit`). Repositories return `Flow`; ViewModels `combine/map` then `.stateIn(viewModelScope, WhileSubscribed(5_000), Loading)`.

```kotlin
sealed interface LessonUiState {
  data object Loading : LessonUiState
  data class Active(val exercises: List<ExerciseUi>, val index: Int,
                    val focus: FocusState, val progress: Float,
                    val feedback: Feedback? = null) : LessonUiState
  data class Completed(val xpEarned: Int, val accuracy: Float, val durationMs: Long,
                       val streakDelta: Int, val newAchievements: List<String>) : LessonUiState
  data class Error(val message: String) : LessonUiState
}
```

**Audio:** abstract behind `PronunciationPlayer`. Default = Android `TextToSpeech` (sk-SK, offline once voice installed, zero APK weight). High-frequency phrases ship as bundled native-speaker MP3s (`assets/audio/<audioKey>.mp3`) played via Media3/ExoPlayer; missing key → TTS fallback.

**Navigation:** single `NavHost`, `@Serializable` route types — Onboarding, Home, Lesson(lessonId), LessonComplete(lessonId), Practice, ChatHub, Chat(scenarioId), Profile, Achievements, Leaderboard, Settings. Bottom bar: **Learn · Practice · Chat · Leaderboard · Profile** (5 items). Lesson/Chat are full-screen pushes.

**Offline-first guarantees:** Room is the single source of truth; UI renders only from DB `Flow`s; TTS + MP3s are local; the only network touchpoint is the optional AI partner; WorkManager reads Room locally with no server.

---

## 12. Data Layer (Room schema)

Entities live in `data.db.entity`; domain models are separate (no Room annotations). Seeded content uses stable **String slug** PKs (clean re-seed across versions); runtime rows use autogen `Long`. Read POJOs via `@Relation`/`@Transaction` (`SkillWithLessons`, `LessonWithExercises`). DAOs expose `Flow<…>` for reads; `suspend` for writes.

**Content entities:** `SkillEntity(id, unitId, title, description, iconKey, colorKey, orderIndex, cefrLevel)` → `LessonEntity(id, skillId, title, orderIndex, type, xpReward)` → `ExerciseEntity(id, lessonId, orderIndex, type, promptSk?, promptEn?, answer, acceptableJson, choicesJson?, audioKey?, vocabCardId?, hint?, caseTag?, aspectTag?, register)`. `VocabCardEntity(id, sk, en, partOfSpeech, ipa?, exampleSk?, exampleEn?, gender?, audioKey?, register, frequencyRank)`. `ChatScenarioEntity(id, title, description, cefrLevel, systemPromptSk, starterLineSk, targetVocabJson, iconKey, locked)`. `PhraseEntity(id, sk, en, register, note?, vocabCardId?)`.

**SRS state — FSRS fields** (supersedes SM-2):
```kotlin
@Entity(tableName = "srs_state",
  foreignKeys = [ForeignKey(VocabCardEntity::class, ["id"], ["cardId"], onDelete = CASCADE)],
  indices = [Index("cardId", unique = true), Index("due"), Index("state")])
data class SrsStateEntity(
  @PrimaryKey(autoGenerate = true) val id: Long = 0,
  val cardId: String,
  val state: Int = 0,            // 0 New 1 Learning 2 Review 3 Relearning
  val stability: Float = 0f,     // FSRS S
  val difficulty: Float = 0f,    // FSRS D
  val due: Long,                 // epoch millis; drives "what's due today"
  val lastReview: Long? = null,
  val reps: Int = 0,
  val lapses: Int = 0,
  val direction: Int = 0         // 0 SK→EN recognition, 1 EN→SK production
)
```

**Progress/gamification entities:** `UserProfileEntity(id=1 singleton, displayName, level, totalXp, gems, crowns, createdAt, timezoneId, avatarKey)`; `DailyGoalEntity(date ISO, goalXp, earnedXp, lessonsCompleted, met)`; `StreakLogEntity(date ISO, practiced, frozen)` (current streak = derived query over consecutive practiced/frozen days ending today); `AchievementEntity(id, title, description, iconKey, threshold, progress, unlockedAt?, tier)`; `LeagueWeekEntity(weekId, tier, userXp, botsJson, startTs, endTs)`; `QuestEntity(id, dateAssigned, title, target, progress, rewardGems, completed)`; `ChatMessageEntity(id autogen, scenarioId, role, textSk, textEnGloss?, createdAt)`; `SessionLogEntity(id autogen, startTs, durationMs, xpEarned)` (analytics for smart timing).

**Relationships:** `Skill 1—* Lesson 1—* Exercise`; `Exercise *—1 VocabCard` (optional); `VocabCard 1—* SrsState` (per direction); `ChatScenario 1—* ChatMessage`. Migrations are explicit (no destructive fallback in release).

---

## 13. Content Shipping & Seeding

Content ships as **bundled JSON in `app/src/main/assets/curriculum/`**, split per skill + a manifest. On first launch and on version bump, `ContentSeeder` parses with kotlinx-serialization and bulk-inserts inside one Room transaction. Seed version tracked in DataStore (`seed_version`); if bundled `version > stored`, re-seed **content tables only** with `OnConflictStrategy.REPLACE` on stable slug PKs — user/SRS/streak/profile tables are never touched, so progress survives content updates.

`manifest.json`: `{ "version": 1, "skillFiles": [...], "scenarioFile": "scenarios.json", "phrasebookFile": "phrasebook.json" }`. Per-skill JSON nests `skill`, `vocab[]`, `lessons[].exercises[]`. See [contentPlan] for the full schema.

---

## 14. Notifications & Retention

Single `NotificationScheduler` reads DataStore + Room and (re)enqueues all work; called after every session, on app open, on settings change, on `BOOT_COMPLETED`, and on `TIMEZONE_CHANGED`. All work idempotent via unique names.

**Workers**
1. **`DailyReminderWorker`** — self-rescheduling one-time work (hits precise local time, immune to periodic drift). If user already practiced today (check `SessionLogEntity`), suppress; always re-enqueue for tomorrow.
2. **`SmartTimingWorker`** — periodic ~03:00; reads last ~14 days of sessions, picks the **modal practice hour** (needs ≥5 sessions and ≥40% confidence to override the onboarding choice), schedules the reminder 30 min ahead of the habit window; clamps to 07:00–22:00 and never into quiet hours.
3. **`StreakRiskWorker`** — one-time, armed for 20:30 (or quietHoursStart−1h). Fires only if `streak.current > 0` and not practiced today; silent otherwise. Own channel; gated by `streakRemindersOn`.
4. **`ReviewDueWorker`** — SRS-driven; schedules at the next "≥10 cards due" timestamp, clamped outside quiet hours, ≤1/day; deep-links into the review queue; re-evaluated after each session.
5. **`ReengageWorker`** — daily-checking chain for lapsed users (no session 24h+). Escalates *down* in frequency; cancelled instantly on next open.

**Channels** (created once, `NotificationChannelGroup "Slovko"`): `daily_practice` (DEFAULT), `streak` (HIGH, vibrate), `reviews` (LOW, silent), `reengage` (DEFAULT), `achievements` (DEFAULT). In-app toggles gate enqueue/post; OS channels own sound/visibility — Settings *links out* to system channel settings rather than faking toggles.

**Copy** via `NotificationCopyProvider`: rotate variants (store `lastCopyId`, never repeat back-to-back); always include a real, useful Slovak phrase (so even an ignored notification teaches); never shame words; cap exclamation marks. 10 seed copies across Daily/Streak/Review/Re-engage.

**POST_NOTIFICATIONS (Android 13+):** never prompt on first launch. Soft pre-prompt on the first-lesson celebration ("Want a gentle daily nudge? You pick the time." Yes/Maybe later); only on Yes fire the system request. If permanently denied, deep-link to app notification settings. Pre-API-33: implicitly granted. Re-surface the pre-prompt at most once more ~day 3 if still active.

**Re-engagement ladder:** Day 1 (light, one word + audio) → Day 3 (progress hook to in-progress unit) → Day 7 (low-friction comeback challenge + freeze) → Day 14 (final soft touch, then **mute the ladder** until return). Never two re-engage notifs in 24h; respect quiet hours; cancel all pending on next session.

**Quiet hours** enforced app-side (never schedule into them) as belt-and-suspenders over OS DND.

**Reboot:** `BootReceiver` (`ACTION_BOOT_COMPLETED`, `RECEIVE_BOOT_COMPLETED`) calls `NotificationScheduler.rescheduleAll()` so self-rescheduling chains survive a device off at fire time.

---

## 15. Widget & Quick Actions

**Glance widget** (`GlanceAppWidget`, fully offline, reads Room/DataStore):
- **Small 2×1:** 🔥 streak + tap → `slovko://practice`.
- **Medium 4×2:** streak/flame, "X cards due", word-of-the-day + translation, prominent "Practice now"; tapping the word plays TTS via pending intent.
- Updates after each session via `GlanceAppWidgetManager.update()` and on the smart-timing tick.

**Quick actions:** `ShortcutManager` long-press shortcuts (Practice now / Review due / Word of the day). Daily reminder carries `"Practice"` (deep link) + `"Snooze 1h"` (re-enqueues that one reminder +1h) actions.

---

## 16. Build, Versions & CI

- **minSdk 26, targetSdk 35, compileSdk 35.** Gradle Kotlin DSL + version catalog. KSP for Room + Hilt. Compose Compiler via `org.jetbrains.kotlin.plugin.compose`.

**Known-compatible pairing (Gradle 8.14, JDK 21):** AGP 8.7.3 · Kotlin 2.0.21 · KSP 2.0.21-1.0.28 · Hilt 2.52 · Compose BOM 2024.12.01 · Room 2.6.1 · Nav 2.8.5 · DataStore 1.1.1 · WorkManager 2.10.0 + hilt-work 1.2.0 · Coroutines 1.9.0 · kotlinx-serialization-json 1.7.3 · Media3 1.5.1 · Turbine 1.2.0. `jvmToolchain(21)`.

**Testing:** JUnit4, Turbine, Room in-memory, Compose UI test, Robolectric. Domain (FSRS, grading, XP, streak, league bots) is pure-Kotlin JVM-tested.

**gradle.properties:** `org.gradle.jvmargs=-Xmx4g`, `org.gradle.caching=true`.

**CI** (`.github/workflows/android-ci.yml`): checkout → setup-java 21 (temurin) → setup-gradle → `chmod +x gradlew` → `testDebugUnitTest` → `assembleDebug` → upload `app-debug.apk`.

---

## 17. Resolved Cross-Section Decisions

These conflicts between source sections were resolved as follows (canonical):

1. **SRS algorithm — FSRS wins over SM-2.** The pedagogy section's FSRS is authoritative; the arch draft's SM-2 `SrsStateEntity` (`easeFactor/intervalDays/repetitions`) is **replaced** by the FSRS schema in [§12](#12-data-layer-room-schema) (`state/stability/difficulty/due/reps/lapses/direction`). FSRS is implemented as a pure-Kotlin `FsrsScheduler` in domain.
2. **Hearts vs Focus — Focus is the default; Hearts is opt-in Challenge Mode.** The gamification "no-lockout" Focus model is the default learning experience; the visual section's hearts UI is retained but scoped to Challenge Mode. `LessonUiState.Active` carries a `FocusState` (not mandatory hearts).
3. **Bottom nav — 5 items.** Visual's 5-item bar (Learn · Practice · Chat · Leaderboard · Profile) supersedes arch's 4-item bar, since simulated leagues are a core retention feature.
4. **Card direction is first-class.** `(lemma, sense, direction)` granularity from pedagogy is encoded as `SrsStateEntity.direction` (recognition graduates before production unlocks).
5. **Exercise enum is the union** of both sections, adding `FILL_CASE`, `ASPECT_CHOICE`, `LISTEN_CHOOSE`, `DIALOGUE_FILL` to the arch baseline, plus `caseTag`/`aspectTag`/`register` columns on `ExerciseEntity`.
6. **Audio:** TTS default + per-card MP3 override behind `PronunciationPlayer` (both sections agree; abstraction made explicit).
7. **Daily goal tiers:** the gamification XP tiers (30/60/120/250) are canonical; onboarding presents them as Casual/Regular/Serious/Intense.


---

# Appendix A — Content Plan

## Curriculum JSON schema (bundled in app/src/main/assets/curriculum/)

### manifest.json
```json
{
  "version": 1,
  "skillFiles": [
    "unit0-zvuky.json","unit1-ahoj.json","unit2-ja-a-ty.json","unit3-rodina.json",
    "unit4-jedlo-kava.json","unit5-v-meste.json","unit6-cas-plany.json",
    "unit7-kazdy-den.json","unit8-nakupovanie.json","unit9-pocasie-pocity.json",
    "unit10-praca-skola.json","unit11-cestovanie.json","unit12-piseme-si.json"
  ],
  "scenarioFile": "scenarios.json",
  "phrasebookFile": "phrasebook.json"
}
```

### Per-unit skill file schema (each file = one Unit; contains multiple skills)
```json
{
  "unit": { "id": "u1", "name": "Ahoj!", "cefr": "A1", "order": 1 },
  "skills": [
    {
      "id": "greetings",                 // stable slug PK
      "unitId": "u1",
      "title": "Greetings & Small Talk",
      "description": "Say hi like a local.",
      "iconKey": "wave",                 // -> designsystem vector
      "colorKey": "teal",
      "orderIndex": 0,
      "cefrLevel": "A1",
      "exercisePool": { "MCQ": 3, "LISTEN_CHOOSE": 2, "WORD_BANK": 2, "SPEAK": 1 },
      "vocab": [
        {
          "id": "ahoj", "sk": "ahoj", "en": "hi / bye (informal)",
          "partOfSpeech": "phrase", "ipa": "ˈaɦoj",
          "exampleSk": "Ahoj, ako sa máš?", "exampleEn": "Hi, how are you?",
          "gender": null, "audioKey": "ahoj",
          "register": "informal", "frequencyRank": 3
        }
      ],
      "lessons": [
        {
          "id": "greetings-1", "title": "First hellos", "orderIndex": 0,
          "type": "teach",                 // teach | practice | checkpoint
          "xpReward": 15,
          "exercises": [
            {
              "id": "greetings-1-e1", "orderIndex": 0, "type": "MCQ",
              "promptEn": "How do you informally say 'hi'?", "promptSk": null,
              "answer": "ahoj", "acceptable": ["ahoj"],
              "choices": ["ahoj","dovidenia","prosím","ďakujem"],
              "audioKey": "ahoj", "vocabCardId": "ahoj",
              "hint": "Same word for hi and bye.",
              "register": "informal", "caseTag": null, "aspectTag": null
            },
            {
              "id": "greetings-1-e2", "orderIndex": 1, "type": "LISTEN_TYPE",
              "promptSk": "Ako sa máš?", "promptEn": null,
              "answer": "Ako sa máš?", "acceptable": ["ako sa mas","ako sa máš"],
              "choices": null, "audioKey": "ako_sa_mas",
              "vocabCardId": null, "hint": "'How are you?'",
              "register": "informal", "caseTag": null, "aspectTag": null
            }
          ]
        }
      ]
    }
  ]
}
```

**Field rules / enums**
- `type` (exercise): MCQ | TRANSLATE_SK_EN | TRANSLATE_EN_SK | LISTEN_CHOOSE | LISTEN_TYPE | WORD_BANK | SPEAK | MATCH_PAIRS | FILL_CASE | ASPECT_CHOICE | DIALOGUE_FILL.
- `register`: informal | neutral | formal.
- `caseTag`: NOM | ACC | LOC | INS | GEN | DAT | null.
- `aspectTag`: IMPF | PERF | null.
- `acceptable[]`: lowercased, diacritic- and word-order-tolerant accepted variants. `LISTEN_TYPE` keeps a diacritic-correct variant for strict grading where taught.
- `choices` required for MCQ/WORD_BANK/MATCH_PAIRS, else null.
- `audioKey`: maps to assets/audio/<key>.mp3; missing → TTS.
- A card is SRS-eligible only once a `vocabCardId`-linked production exercise is answered correctly (the "born after produced" rule is enforced at runtime, not in JSON).

### scenarios.json schema (Chat track)
```json
{ "scenarios": [
  { "id":"ordering-coffee","title":"Coffee with a friend","description":"Order and chat at a café.",
    "cefrLevel":"A1","systemPromptSk":"Si kamarát v kaviarni...","starterLineSk":"Čau! Čo si dáš?",
    "targetVocab":["kava","dam-si","prosim"],"iconKey":"coffee","locked":false,
    "turns":[ {"role":"partner","sk":"Čau! Čo si dáš?","enGloss":"Hey! What'll you have?",
      "replies":[{"sk":"Dám si kávu, prosím.","enGloss":"I'll have a coffee, please.","natural":true},
                 {"sk":"Chcem čaj.","enGloss":"I want tea.","natural":false}]} ] } ] }
```

### phrasebook.json schema
```json
{ "phrases": [
  { "id":"caw","sk":"čau","en":"hi / bye","register":"informal","note":"most casual","vocabCardId":"caw" },
  { "id":"daj-vediet","sk":"daj vedieť","en":"let me know","register":"informal","note":null,"vocabCardId":null }
] }
```

## Units / Lessons / Exercises to author (counts)

Author all 13 unit files. Per skill: 4–6 lessons; per lesson: 8–12 exercises drawn from the skill's weighted `exercisePool`. Recognition exercises (SK→EN, LISTEN_CHOOSE, MCQ) lead each skill; production (WORD_BANK, TRANSLATE_EN_SK, SPEAK) follow; grammar skills add FILL_CASE / ASPECT_CHOICE.

| Unit file | Skills (3–5 each) | New vocab cards (approx) | Special exercise focus |
|---|---|---|---|
| unit0-zvuky | Alphabet & diacritics; The hard ones (ä,ô,ľ,ď,ť,ň,dz/dž); Stress on syll.1; Read-aloud | 0 SRS (phoneme drills) | LISTEN_TYPE, SPEAK, minimal-pair MCQ; **no SRS** |
| unit1-ahoj | Informal vs formal greetings; Ako sa máš/máte; Volám sa; Ďakujem/prosím/prepáč; Texting openers | ~25 | DIALOGUE_FILL (vykať/tykať toggle), MCQ, SPEAK |
| unit2-ja-a-ty | Pronouns; byť present; Som z…/nationalities; Hovoríš po…?; Numbers 0–20 | ~35 | WORD_BANK (byť agreement), LISTEN_TYPE |
| unit3-rodina | Family nouns + diminutives; Possessives môj/moja/moje; Mám… (ACC intro); Age; Pets | ~40 | FILL_CASE (ACC), MATCH_PAIRS (diminutive↔base) |
| unit4-jedlo-kava | Foods/drinks; Chcem/Dám si; Máte…?; Mám rád/rada; café & krčma | ~45 | FILL_CASE (ACC of food), DIALOGUE_FILL |
| unit5-v-meste | Places; Kde je…?; Directions; Locative (v/na); Transport (instrumental); Idem do/na | ~45 | FILL_CASE (LOC, INS) |
| unit6-cas-plany | Clock & o koľkej; Days/months; dnes/zajtra/víkend; Making plans; **Aspect intro** | ~40 | ASPECT_CHOICE (robiť/urobiť), texting |
| unit7-kazdy-den | Routine verbs; Reflexives (umývam sa); Frequency adverbs; Modals (musím/chcem/môžem) | ~45 | ASPECT_CHOICE drilled, WORD_BANK |
| unit8-nakupovanie | Koľko to stojí; Euros/cents; Clothing/sizes; Zaplatiť kartou; Genitive of quantity | ~40 | FILL_CASE (GEN of quantity) |
| unit9-pocasie-pocity | Weather; Je mi… (dative of state); Emotions; Small talk; Reactions | ~40 | FILL_CASE (DAT), DIALOGUE_FILL |
| unit10-praca-skola | Jobs/studies; Čím si/Kde robíš; Workplace vocab; Instrumental of profession | ~35 | FILL_CASE (INS of profession) |
| unit11-cestovanie | Train/bus/booking; Accommodation; Asking help; Emergencies; **Past tense intro** | ~45 | WORD_BANK (past perfective), DIALOGUE_FILL |
| unit12-piseme-si | Capstone: real WhatsApp conversations pulling all units together (north-star Kamarát unit) | ~30 review-heavy | DIALOGUE_FILL, TRANSLATE_EN_SK, SPEAK |

**Totals (target):** 13 units, ~50 skills, ~250 lessons (avg 5/skill), ~2,500 exercises (avg 10/lesson), ~500 unique vocab cards (aligns with the "Slovník" Bronze 500-word badge).

**scenarios.json:** author 8 scenarios — Coffee with a friend, Texting plans, Running late, Weekend recap, At the pub, Asking a favor, Meeting the family, Group-chat reactions. Each 6–12 turns, ≥2 reply options per turn with a `natural` flag.

**phrasebook.json:** author ~40 modern texting entries (čau, čo robíš?, ako šlo?, si tam?, daj vedieť, dohodnuté, hej/jasné/v pohode, no nevadí, vďaka/dik, meškám trochu, sorry/prepáč, vidíme sa, maj sa/pa, haha/xd, no, plus diacritic-dropping and vowel-stretching examples).

