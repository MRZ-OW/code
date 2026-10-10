# Arm fixes (arms5) — progress log

Render: `node render.mjs --soft-gl --loop=arms --sheet=<page> --cols=1 --w=1080 --out=out/arms5/...` (~45 s/page).
Scratch tools (session scratchpad a5/, recreate if lost): g.js (armGeom of an armPose + trace), all.js (every pose,
every view: tucks), jump.js (frame-to-frame jumps through a pose sequence), grid.js (hands collapsing onto the shoulder).

## Done
- Rig: `unhead` in armGeom: a far hand raised by the head (q / side) slides out past the head's outline (q: face side,
  profile: back of the head; hands well forward, e.g. pointing, go ahead) so a raised far arm shows rising behind the
  head; raised far arms are never tucked (raisedK).

## Left
- side view + farFront: far hand inside the silhouette collapses onto the shoulder (pre-existing; pullIn) — fixing.
- scene fixes: ep4 1.6, ep3 17.0, ep3 22.4, raise tweens (all eps); full sheets; regression; 0.5 s sweeps.
