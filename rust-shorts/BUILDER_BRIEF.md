# Builder brief: first draft of a "Rock Bottom" episode

You are building the first draft of one episode of a vertical (1080 × 1920) watercolour cartoon series about the game
Rust. The director (the session that started you) reviews your draft with critics afterwards, so aim for a clean,
readable, well-staged draft that follows the script. Don't polish forever.

## Read first

- `SERIES.md`: the cast, the rules and the tone. `CRITIC_BRIEF.md`: what the critics will look for (read it: these
  are the weirdnesses you should catch yourself).
- `episodes/epN/SCRIPT.md`: your shot list with timings. `episodes/epN/cues.json`: the soundtrack is already cut to
  those timings, so keep every action time from the script unless you have a strong reason (then list the new times in
  your report).
- Engine and kit: `src/core.js` (paint, inkLine, shapes, camera, glow, flash, letter, timing helpers such as seg, ease,
  kf, arcPt, spring), `src/timeline.js` (shots), `src/survivor.js` (the character rig's body; the header documents its
  options), `src/heads.js` (its head: every view is one turned sphere, see below), `src/gear.js` (hazmat, scientists,
  facemask, chestplate, kilt), `src/transitions.js` (Rust-themed cover transitions, see TRANSITIONS.md), `src/rustcast.js` (spawnling = the Naked, geared = the Chad, rockProp, akProp, torchProp), `src/rustsets.js`
  (rustSky, seaBeach, hills, grassTufts, pineTree, bush, log, explosion and other sets), `src/props.js`, `src/fx.js`
  (bubble, emote helpers, puff, sparks, respawn, notePop, lightning, xray, smolder), `src/animals.js` (boar, chicken,
  feathers) and `src/heli.js` (patrolHeli, searchCone, scanLine, tracers, rocket).
- Worked examples: `episodes/ep1/scene.js` and `episodes/ep2/scene.js` show every convention below in use: shot
  functions, the camera, IK reaches (reachArm with toBody), held props (handL hooks), emotions, grades, glows, labels.

## Conventions

- A shot is `function s1a(t, lt) { camBegin(cx, cy, zoom); ...; camEnd(); }` where t is the episode time and lt the
  time since the shot began. Register them at the bottom with `shots([[0, s1a], [2, s1b], ...])`. Everything lives
  inside the episode's IIFE.
- Shots are pure functions of t: no state carried between frames, no Math.random. Call `boilSeed('key')` before each
  painted element so its wobble "boils" at 12 fps; use `staticSeed('key')` for big background fills that must not
  shimmer. Use `hash(i)` for per-item randomness.
- Paint order is depth order. Paint the background, then far things, then near things; a full-frame colour grade (see
  `grade` in ep1/ep2) goes last, with `glow()` for light sources after it.
- Units: characters are about 13.2u tall (u = 36 to 64 in practice); feet at the ground point (x, y). Body-local +x is
  forward in 'q' and 'side' views; `flip: true` faces left. `rawArms: true` with aL/bendL/aR/bendR in radians (0 = out,
  + up, -1.32 = hanging). For hands on targets use `reachArm(u, o, 'L', ...toBody(x, y, u, o, wx, wy))`. Held things
  go in `handL`/`handR` hooks (drawn at the hand, +x forward). Useful extras: `clutchL` (hold up a hurt foot), sit,
  legsOut, crouch, liftL/liftR, openL/openR (open palms), farFront, eyes/mouth/lookX/lookY, emote/emoteK, take, sq.
  `feel(mood, t, extra)` and `emotions(t, [[t0, mood, extra], ...])` give whole-body acting presets.
- Frame: keep faces, hands and props that tell the story inside x 48..888 and y 288..1248 (the right 192 px and the
  bottom 672 px are covered by Shorts UI and captions); eyes ideally y 600..950. Render with `--guides` to see the box.
- Rules: 18 to 30 s, cold open, a new beat every 2 to 4 s, the punchline in the last 1 to 2 s. At most 3 flashes per
  second. Labels 1 to 3 words. Bloodless slapstick (the rock's red stain is fine). Unofficial fan art: no Facepunch logos,
  no game UI, no game sounds.
- Look: copy shapes and colours from the original game's art. Reference images (view them with the Read tool):
  `/tmp/claude-0/-home-user-code/732e9791-0beb-54f9-8126-562ebb6852ac/scratchpad/refimg/` has item icons
  (`items/*.png`, `items/items.jpg`, `icons2/*.png`: eoka, beans, boonie hat, sunglasses, beach towel, campfire,
  chicken, supply signal, hoodie, pants, AK, rocket launcher...), game screenshots (`steam/`), the patrol heli (`heli/`)
  and animals (`animals/`: boar, chicken).

## Rendering (Chromium on a virtual display; the machine has 4 cores shared with other agents, so keep renders targeted)

```
cd /home/user/code/rust-shorts
R="node render.mjs --ep=N --chrome=/opt/pw-browsers/chromium --xvfb"
$R --sheet=0,0.5,1,1.5 --cols=4 --w=360 --out=out/epN/a.jpg           # contact sheet of chosen times
$R --strip=2.0:2.5 --cols=6 --w=300 --out=out/epN/strip.jpg            # every frame in a stretch (motion)
$R --sheet=2.1 --crop=300,500,500,500 --w=500 --out=out/epN/face.jpg   # a full-res crop
$R --sheet=1,5 --guides --cols=2 --w=540 --out=out/epN/guides.jpg      # with the safe box drawn
```

Look at every sheet you render (Read tool) and hunt for weirdness: props floating off hands, limbs through bodies,
hands that miss what they touch, heads or key props cut by the frame, outlines that touch (tangents), text over faces,
pops between frames, unreadable gestures, anything that looks broken. Fix, then re-check.

## Boundaries

- Write your episode in `episodes/epN/scene.js` only. Put any new props, sets or helpers inside that file.
- Don't edit any other file in `src/`, `studio.html`, `render.mjs` or other episodes, except the one file named in your
  task as yours to extend. If you need a rig change (survivor.js etc.), work around it in your scene and describe the
  change you'd want in your report.
- Don't commit or push; the director does that.
- Write renders only under `out/epN/`.

## Report (your final message)

Shot list as built (times), new assets, anything you deviated from in the script and why, known weak spots, any rig
changes you'd want, and the paths of your 2 or 3 best review sheets.

## Marks on a character's head

Anything you draw on a survivor's head (plasters, sunglasses, swirl eyes, a target on the forehead, paint) must sit on
the turned head, so it stays put in every view (front, qf, q, side, back) and through turns:

- Pass `face: (u, sw, V, head) => { ... }` in the survivor's options. It's drawn on the head after hair and gear, under
  the arms, in the body frame. `head.pt(lon, lat, k)` returns `[x, y, depth]`: lon 0 = the middle of the face,
  − = the near side, + = the far side; lat − = up, + = down; k > 1 pushes the point out from the skull. Skip a point
  whose depth is ≤ .08 (it has turned away). Landmarks: eyes lon ±.4, lat −.02, k .84; brows lat −.36; nose tip lon 0,
  lat .2, k 1.17; mouth lat .64; forehead lat −.45; ears lon ±π/2, lat .1. `head.th` is the turn (HEAD_TURN: front 0,
  qf .3, q .62, side π/2, back π).
- From a `draw` / `under` / `behind` hook, `headPoint(u, o, lon, lat, k)` gives the same point for the survivor whose
  options are `o`.
- Model sheet for heads: `node render.mjs --ep=0 --loop=heads ...` (see src/headsheet.js).

