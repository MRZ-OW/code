# Arm rig rebuild (arms4) — progress log

Render: `node render.mjs --soft-gl --loop=arms --sheet=<page> --cols=1 --w=1080 --out=out/arms4/...` (pages 0..7 =
front, front flip, qf, qf flip, q, q flip, side, side flip; 8..12 motion). ~50 s per render.
Scratch tools (in the session scratchpad, recreate if lost): dbg.js / motion.js / trace.js load core+clawd+survivor+heads
in a node vm and print armGeom for armsheet poses, and scan the motion sequences for elbow/hand spikes and layer flips.

## Done (src/survivor.js armGeom + arm drawing rewritten)
- Body = rounded cylinder (svBodyAx, tapers at shoulders/thighs; ends at the seat when seated), head = sphere.
  Shoulder sockets at X ±1.95 (protract forward/in when the hand reaches in front or across).
- Hand: face kept clear (svFace: whole head front-on, face+beard turned) by a push along the line from the chin;
  straight arm also kept off the face/beard (own side only, weighted by the incoming target so it can't jump);
  depth from a relaxed reference slid clear of body/head (continuous round the edges); back view = his front is far;
  handBack in profile stays on own side; seated hands rest forward. Reach fit by bisection (continuous).
- Elbow: hinge circle, pole out/back/down, soft clearance cost vs body/head, no-forward/inward elbow point,
  far-hand-on-belly pushes elbow past the body edge, bones kept off the face+beard (GUARD).
- Layers per bone: B (behind torso), H (behind head; near arm only with hand behind head), F; wrapping arms drawn
  whole behind + open-ended front piece ('part') from the silhouette edge. Far arms that would be slivers fold down
  out of sight (area-based). Front arms cast a soft shadow clipped to the torso (svClip).
- Front-seated knees drawn as round knee caps under the cuff.
- Regression: before renders of cf315f2 in scratchpad/reg/before_ep*.jpg (worktree scratchpad/before).
  Times in scratchpad/times.txt (8 per ep). After renders out/arms4/after1_ep*.jpg.

- Face push is now horizontal (to the arm's own side / back of head), fading over the far part of the face so it is
  continuous; elbow swivel is a soft-min (circular mean, T=3) so it never jumps; face-guard cost smoothed.
- Far hands holding a prop (hook) are never folded away. Near hand behind back pushes elbow out past the body edge.
- Final torture pages: out/arms4/final_p0..7.jpg, thumbs out/arms4/final_thumbs.jpg.
- Motion strips queued (scratchpad/strips.sh) -> out/arms4/motion_*.jpg; regression after2 (scratchpad/reg2.sh).

## Left
- regression review, side-by-side sheets out/arms4/reg_epN.jpg, list of scene shots needing pose changes
- final torture pages, motion strips, EP1 14.9 before/after
