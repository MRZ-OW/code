# Arm fixes (arms5) — progress log

Render: `node render.mjs --soft-gl --loop=arms --sheet=<page> --cols=1 --w=1080 --out=out/arms5/...` (~45 s/page;
episode frames 10-80 s each).
Scratch tools (session scratchpad a5/, recreate if lost): g.js (armGeom of an armPose + trace), all.js (every pose,
every view: tucks), jump.js (frame-to-frame jumps through a pose sequence), grid.js (hands collapsing onto the shoulder),
pt.js (armGeom for a screen target), **scan.js EP [t0 t1]** (runs an episode headless at 24 fps with drawing stubbed and
flags FACE = near bone/held prop over the face guard, SHRK = hand collapsed on the shoulder, POP = rig hand jumps much
more than the asked hand, CROT = front hand over the briefs). Output scratchpad a5/scan_epN.txt.

## Done
- Rig (survivor.js armGeom):
  - `unhead`: a far hand raised by the head (q / side; from a little above the eyes up) slides out past the head's
    outline at the same height (q: the face side, the far shoulder's side; profile: past the back of the head, except
    hands well forward, e.g. pointing, which go ahead), so a raised far arm shows rising from behind the head. Raised
    far arms are never tucked away (raisedK).
  - profile + farFront: a far hand inside the silhouette is no longer put on OUR side of the body ("deep" needs the
    hand on his front, Z > .5): it used to collapse onto the shoulder (hand == shoulder) and pop between frames.
  - pullIn: if the hand can't get there on its side of the body (bisection would shrink it onto the shoulder), it goes
    round the other side instead.
- EP4 1.6 jump-hit: higher hop (HOP 4.6), rock swung down behind him in the crouch (LOWBACK) and up from below/the side
  onto the X at shoulder level; rebounds down and out (1.67) before returning to the chest. Hit time unchanged (1.6).
- EP3 17.0 toss wind-up: DIP -> SWINGBK (behind his back, 16.93) -> BACK (behind head, 17.0): never crosses the face; the
  far arm now shows behind the head holding the eoka (unhead). Toss time unchanged.
- EP3 22.4: LOOKAT (s4a and s4b) moved forward to [3.2, -5.6]: the far arm holds the eoka out in front, whole arm shows.

## Left
- item 5 (raise tweens across face, all eps): scan.js running -> fix each flagged span, verify with --strip.
- full torture sheet (8 pages) -> final_p0..7.jpg; regression reg_ep*.jpg (times in scratchpad/times.txt + fixed shots);
  0.5 s sweeps per episode (sweep_epN_*.jpg).
