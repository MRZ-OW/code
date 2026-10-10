# Rust-themed transitions: spec

Fun, dynamic transitions between scenes, each built from something iconic in Rust. They're "cover" transitions:
an object or effect sweeps in and covers the whole frame at the cut, then sweeps off to reveal the next shot. Only one
shot is drawn per frame, so no masking is needed: before the cut you see shot A under the incoming cover, after it you
see shot B under the outgoing cover.

## API (src/transitions.js)

```js
// register for an episode, next to shots():
transitions([[6.0, 'rockSpin'], [25.0, 'sleepingBag', { dur: .8 }], ...]);
// timeline.js drawWorld(t) calls drawTransitions(t) after the shot, in screen space (origin top-left, no camera)
```

- Each transition runs from `tCut - dur/2` to `tCut + dur/2` (default `dur` about 0.6 s; keep them 0.4–0.9 s). The
  frame must be **100% covered** from about `tCut - 0.03` to `tCut + 0.03`, so the cut is never visible.
- Pure functions of time (no state); use `boilSeed()` per element, `hash()` for randomness, the project's `paint()`,
  `inkLine()`, `glow()`, `flash()` and shape helpers, and the existing prop drawings where they exist (`rockProp`,
  `doorPanel`, `explosion`, `sleepingBag`, `c4`, `patrolHeli`, `pineTree`, `boar`, `beancan`...). Look at
  `brushWipe()` in `src/timeline.js` for a worked example of a cover transition in this style.
- Optional screen shake: transitions may return or set a small screen offset for the impact frames (e.g. the door's
  CLANG). If that needs a hook in `drawWorld`, add it.
- Respect the series rules: at most 3 flashes per second, no game UI, no text, bloodless.
- Look: match the series' painted watercolour and ink style, true to the game's items (compare with
  `https://rust-app.com/items/img/<shortname>.png`, e.g. `door.hinged.toptier`, `wall.frame.garagedoor`,
  `explosive.timed`, `supply.signal`, `sleepingbag`, `rock`, `grenade.beancan`). The patrol heli is in `src/heli.js`.

## The set (build all of these)

1. **rockSpin**: the hero's cream rock with its red smear tumbles toward the camera from the lower left, growing until
   it fills the frame (a whoosh smear behind it), then tumbles away to the upper right, revealing the next shot.
2. **doorSlam**: an armoured door (dark steel, rivet rows, viewing hatch, handle plate) swings shut across the frame
   from one side, with perspective foreshortening on its swing. CLANG: ring lines and 2–3 frames of screen shake.
   Then it swings open the other way.
3. **garageDoor**: a corrugated metal garage door rolls down from the top with a small bounce, then rolls back up.
4. **c4Blast**: a C4 brick slaps onto the middle of the frame (squash on impact), its red light blinks twice, then it
   explodes: one bright flash, a fireball that fills the frame, then smoke that thins to reveal the next shot.
5. **supplySmoke**: a supply signal canister rolls in and billows thick coloured smoke (check the game's signal smoke
   colour) that fills the frame, then drifts off.
6. **sleepingBag**: the respawn transition. A tan, quilted sleeping bag unrolls down over the frame like a blind. Its
   zipper runs down and back up, then the bag rolls away up.
7. **heliFlyover**: the patrol heli flies low across the camera. Its dark underside and rotor blur fill the frame for
   the cut, with its searchlight sweeping before it.
8. **wallUpgrade**: a building wall rises to fill the frame and gets upgraded in quick hammer-sparkle steps (twig →
   wood → stone → sheet metal → armoured), then is raided apart, crumbling down to reveal the next shot.

## Deliverables

- `src/transitions.js` with the eight transitions, `transitions(list)`, `drawTransitions(t)`, and a demo loop
  `LOOPS.transitions` that plays all eight back to back over two alternating test backgrounds, so each is easy to
  review (`node render.mjs --ep=0 --loop=transitions ...`).
- One `<script>` line in `studio.html` (after `heli.js`) and one call in `drawWorld()` in `src/timeline.js`. No other
  shared-file edits.
- Review each transition with every-frame strips and fix what looks wrong or silly before reporting.
