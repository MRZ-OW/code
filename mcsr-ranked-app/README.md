# MCSR Ranked Explorer

A beautiful, MCSR-inspired Android app (web-based, Capacitor-wrapped) for browsing
the [MCSR Ranked](https://mcsrranked.com) leaderboard with **deep filtering, sorting,
and computed splits** that the official site doesn't offer.

> Built on the public [MCSR Ranked API](https://docs.mcsrranked.com). Not affiliated
> with Mojang. The same code base runs as a website (the API sends `Access-Control-Allow-Origin: *`).

## ✨ Features

- **Two ladders** — the season Elo leaderboard and the global Fastest-Times (record) board.
- **Custom data table** — add/remove columns to build your own view. Sort by any column.
- **Filter** by country (multi-select), rank tier (Coal → Netherite), elo range, and name search.
- **Sort** by elo, best ranked PB, win rate, peak elo, matches, playtime, phase points, and **computed splits**.
- **Computed splits** — best **Nether enter / Bastion / Fortress / Blaze / Blind / Eye Spy / End enter / Finish**
  times, derived from each player's run timelines.
- **Player profiles** — elo trajectory sparkline, season stats, best splits, recent ranked matches, social links.
- **MCSR theming** — dark green-tinted palette, hand-crafted pixel-art ore/ingot tier badges, Minecraft-head avatars.
- **Rate-limit friendly** — a concurrency-capped request queue plus a persistent on-device cache keep well under the
  API's 500 req / 10 min limit; computed splits are cached so re-runs are instant.

## 🧮 How splits are computed

Split times aren't exposed directly by the API — they live inside each match's per-player
**timeline events** (e.g. `story.enter_the_nether`, `nether.find_fortress`, `story.enter_the_end`).
Fetching every run for every player would blow the rate limit, so the engine uses a cheap, accurate heuristic:

1. Splits are only computed when you **add a split column** (or open a profile), and only for the
   players **currently in your filtered view**.
2. For each player we scan their recent ranked matches and take their **fastest tracked runs**
   (a personal-best split almost always lives inside a personal-best *run*; their winning time is in the
   match list, so no extra request is needed to rank them).
3. We fetch only those few match timelines, extract that player's milestone events, and keep the **minimum**
   time per milestone.
4. Results are cached on device for 12h. A "Compute splits for N players" action with a progress bar runs the batch.

See [`src/lib/splits.ts`](src/lib/splits.ts).

## 🏗️ Tech stack

Vite · React + TypeScript · Tailwind CSS · TanStack Query · Zustand · Capacitor (Android).

## 🚀 Build & run

### Web (dev)

```bash
npm install
npm run dev          # http://localhost:5173
```

### Web (production bundle)

```bash
npm run build        # -> dist/  (deploy anywhere static)
npm run preview
```

### Android APK

Requires a JDK 17+ and the Android SDK (platform 34, build-tools 34). With `ANDROID_HOME` set:

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# -> android/app/build/outputs/apk/debug/app-debug.apk
```

Or the shortcut: `npm run apk`.

A pre-built debug APK is included at
[`release/MCSR-Ranked-Explorer-v1.0.0-debug.apk`](release/MCSR-Ranked-Explorer-v1.0.0-debug.apk).
Install it on a device with “Install unknown apps” enabled.

## 📁 Project layout

```
src/
  api/        REST client (queue + cache), endpoint fns, response types
  lib/        ranks/tiers, splits engine, formatters, countries, columns registry
  store/      Zustand filter/sort/column state
  hooks/      usePlayerData — base load + filter + lazy enrichment + sort
  components/ Header, Toolbar, PlayerTable, FilterSheet, ColumnSheet,
              SplitsBar, PlayerDrawer, RankBadge/PixelOre, …
```
