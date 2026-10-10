# Arm stability + thumbs (arms6) — progress log

Render: `node render.mjs --xvfb ...` → out/arms6/. Scanner: scratchpad a6/scan6.js EP [t0 t1] (per character, per arm,
per frame: layer state up/fo/split/tuck, visible length, hand/elbow position; flags STATE, FLIP (A>B>A in 0.5 s), VIS
(visible length jump > .7 + 1.6 x asked motion), JUMP (hand/elbow jump > asked + 1u)). Baseline = git 7ab46c0 (worktree
a6/base): before_epN.txt.

## Root cause of the popping
- armGeom's far-arm "tuck": a far arm whose visible length (measured from its own solved pose) was under ~2u was folded
  down behind the torso, k = 1 - ease(vis - 1). Visible length depends on the hand, which walks/trembles, and folding
  changes it: a feedback with a steep threshold, so the arm flicked between shown and hidden (EP1 14.9-15.8, runs).
- farFront "deep" gate: a far hand inside the outline went in front only if well inside (<.78 of the half width) and on
  his front (Z > .5); otherwise behind. A hand near that line jumped between behind him and on his belly.

## Done
- Tuck removed: far arms are always drawn, behind the torso/head where they are behind it (natural occlusion).
- deep gate removed: a farFront hand is in front wherever it is inside the outline; it changes side only at the
  outline's edge (both depths meet there; the forearm's front piece grows from the edge).
- Crotch push ramps widened (kY over .8u eased, kZ over 1u eased): hands sweeping down past the briefs no longer jump.
- EP1 s2c Chad yawn-stretch (11.45-11.75, back view): arms go up through the sides instead of folding in front of his
  chest (the forearms dropped out of sight behind his back for 2 frames). Scene pose only, no timing change.
- Thumbs: armGeom returns G.thumb (signed side + size) from the 3D palm normal and which hand it is; open palms use it.
  Default palm: forward (raised/waving/pushing), turning down below the chest, a little inward. o.palmL/o.palmR override
  ('fwd','back','up','down','in','out', or [X,y,Z]). Torture pages 12-15 (thumbs) in src/armsheet.js.
- Thumbs: hands laid on his front (pats, hand on heart) turn the palm to the body (back of the hand to us); seated
  hands on the lap/knees stay palm down. EP1 18.1-18.75 shoulder pat: palmR 'down'. EP3 6.5-8 prayer: palmL/R 'in'.
- EP1 s3a (14-16) restaged: creep ends at nx 700 (was 640), so the gun's grip is ahead of him and the far arm reaches
  forward-down over it, open hand clear of his body (it used to sit on his belly/waistband). Times unchanged.
- Scans (a6/before_epN.txt vs after_epN.txt): see table below. Old a5 scan.js: FACE/BEARD frames identical, no
  CROT/SHRK, POPs 22 -> 1 (EP4 0.5 strike, asked hand moves 4.1u in that frame: deliberate smear).
- Open-hand moments listed by a6/open.js; before/after crops out/arms6/palms_*.jpg (top row before, bottom after).
- More continuity fixes found by the torture sheet's motion pages (scan6 LOOP=arms 8..12; were 46 state changes, 24
  flips, 35 jumps; now 9 / 1 / 7, the rest is the far upper arm coming in front of the chest in q, see Left):
  - unhead (raised far hand slid out past the head) is a projection from the asked x, not a step from the current one:
    inside the push/reach loop it compounded into a snap, by however many passes ran. Its fade is 1u wide (was .35u).
  - pullIn: the largest fitting share of the line is found stepping down from the hand (halving from the shoulder
    assumed one fitting piece and threw the hand halfway in, or round the other side, on a hair's change).
  - "straight arm through the body" shortens the reach smoothly (thruK) instead of by 16% at a threshold.
- Scanner now also flags JERK (2nd difference of hand/elbow >> asked). Remaining jerks are fast swings/throws (asked
  hand moving > 1u per frame) or elbows of far arms hidden behind the body; none new vs baseline except 3 hidden ones.
