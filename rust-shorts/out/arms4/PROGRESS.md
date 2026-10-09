# Arm rig rebuild (arms4) — progress log

Task: systematic arm fix (elbow hinge, arms over body, far arm, joints, hands, no pops). Rig files + src/armsheet.js only.
Render: `node render.mjs --soft-gl --loop=arms --sheet=<page> --cols=1 --w=1080 --out=out/arms4/...` (pages 0..7 =
front, front flip, qf, qf flip, q, q flip, side, side flip; 8..12 motion). ~50 s per render.

## Done
- (start) Read 8ecd2cf state; baseline q page = out/arms4/base_q.jpg.

## Plan / in progress
- Rewrite armGeom: hard non-penetration (inflated body cylinder + head sphere), hand-on-head pushed to side of head,
  per-segment layering (behind torso / behind head / front) with split pieces for wrap-around far forearms,
  sliver tuck for far arms, cast shadow of front arms on torso.
- Then seated legs/briefs, Chad cells, motion strips, regression per episode (cf315f2 vs now).

## Left
- everything above
