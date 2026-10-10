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

## Scanner results, all 5 episodes at 24 fps (out/arms6/scans/, before = 7ab46c0, after = current)
| ep | before: state changes / A-B-A flips / visibility jumps / position jumps / jerks | after |
|----|----|----|
| 1 | 26 / 13 / 28 / 8 / 40 | 1 / 0 / 0 / 0 / 10 |
| 2 | 5 / 2 / 0 / 1 / 3 | 0 / 0 / 0 / 0 / 1 |
| 3 | 21 / 10 / 8 / 11 / 52 | 2 / 0 / 0 / 0 / 15 |
| 4 | 34 / 30 / 3 / 10 / 54 | 0 / 0 / 0 / 4 / 29 |
| 5 | 8 / 7 / 8 / 0 / 29 | 0 / 0 / 0 / 0 / 11 |
Torture motion pages (LOOP=arms 8-12): 46 / 24 / 15 / 35 -> 9 / 1 / 1 / 7.
Deliberate layer changes left (all at the silhouette edge, hand within .25u of it, so the far hand goes round the edge):
EP1 17.17 Naked R (s3c, far hand leaves his belly), EP3 23.17 and 24.88 Naked R (far hand comes onto / leaves his front).
Position jumps left: EP4 0.5 (the smeared strike, asked hand moves 4.1u in a frame), EP4 1.13, 11.63, 19.67 (rock
wind-ups: the near hand swings from in front to behind him 1.4-1.7u per frame and the no-hands-over-the-briefs push
moves it to his hip side a frame early; 2.4-2.7u vs 1.4-1.7u asked). Jerks left: fast swings / throws, and elbows of
far arms hidden behind the body; none is a visibility change.

## Renders (out/arms6/)
- strip_<moment>_{before,after}.jpg: EP1 13.8-15.8 (the creep, cropped), EP1 11.4-11.8, 16.9-17.25, 18.8-19.05,
  EP2 7.5-7.8, EP3 2.95-3.3, 19.8-20.0, 23.0-23.3, 27.55-27.75, EP4 5.2-5.9, 8.0-8.25, 11.55-11.7, EP5 12.6-13.45
  (the scanner's worst baseline moments per episode); strip_reg_ep*_{before,after}.jpg: one regression stretch per ep.
- palms_*.jpg: every open-hand moment, top row before, bottom row after.
- sheet_p0..7.jpg (torture pages), sheet_p12..15.jpg (thumbs), sheet_motion_*.jpg (motion strips).
