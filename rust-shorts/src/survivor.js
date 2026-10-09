// survivor.js: the Rust player, painted. A small cartoon human with a big head and short limbs. Naked by default, like a
// fresh spawn: light skin, bare feet and Rust's Purple Underwear (the Twitch-drop recolour of the default boxer briefs:
// to mid-thigh, darker waistband). Dress it in gear with o.gear. It takes the same acting options as clawd(), so feel(),
// emotions(), move(), jump(), take() and stroll() all work on it.
//
//   survivor(x, y, u, o)   (x, y) = the ground point between the feet; u = unit. The figure is about 13.2u tall.
//
// Body-local coordinates (front view, before flip): feet y 0; hips (±.9u, -4.4u); waist y -5.15u; shoulders (±1.8u, -7.75u);
// head centre (0, -10.85u), radius 2.35u. +x is "forward" in the side and 3/4 views (they face right; flip faces left).
// Options:
//   pose:  dx, dy (in u), sq, rot, flip, sx, sy, view ('front' | 'q' | 'side' | 'back'), walk (leg phase), crouch 0..1, sit 0..1,
//          aL, aR: arm angles. By default they're in clawd() units (.2 = rest) so emotion bodies work; rawArms: true
//          takes them as shoulder angles in radians (0 = straight out, + up, -1.35 = hanging). bendL, bendR: elbow bends.
//   face:  eyes, mouth, lookX, lookY, squint, blush, tint/tintK/tintMix (skin shifts with the mood), seed (blink timing)
//   look:  skin ('light' | 'tan' | 'brown' | 'dark' or {col, dk, lt}), hair ('short' | 'buzz' | 'bald' | 'messy' | 'bun'),
//          hairCol, beard ('full' | 'stubble' | null), briefs colour, gear (see GEAR below)
//   hooks: handL(u, sw, info), handR(u, sw, info): called at each hand in an upright body-local frame (+x = forward);
//          handOver: true draws the fist after the hook (wrapping a gun's grip);
//          behind(u, sw, V), under(u, sw, V) (on the torso, under the arms), draw(u, sw, V) (on top), boilKey
//   emote, emoteK, emoteAge as in clawd()

const SKIN_TONES = {
  light: { col: '#F3C9A8', dk: '#D99F7E', lt: '#FBDCC4' },
  tan:   { col: '#DDA77C', dk: '#B87F57', lt: '#EDC19C' },
  brown: { col: '#A86E4A', dk: '#7E4F33', lt: '#C68C66' },
  dark:  { col: '#6E4630', dk: '#4E3022', lt: '#8C5E44' },
};
const HAIR_COLS = { brown: '#5B3D29', dark: '#2E2420', blond: '#C9A15A', ginger: '#A5552E', grey: '#8E8A86' };
// The hero's underwear: Rust's Purple Underwear (the first Twitch drop), the default boxer-brief cut in Twitch purple
// with a darker waistband.
const BRIEFS = { col: '#8C55E6', band: '#4F2C93', scuff: '#B08CF2' };

// Emotion bodies were written for Clawd's little arm nubs (.2 = resting, 1.5 = straight up). A person's arms hang at rest.
const humanArm = a => a >= .2 ? -1.3 + 2.4 * Math.pow(clamp((a - .2) / 1.3, 0, 1.4), 1.6) : -1.3 + (a - .2) * .5;

// Per-view layout. fx/fw place the face (offset and width in u); torso width; which arms are near (in front) or far.
const SV = {
  front: { face: { cx: 0, fw: 1, eyes: [-1, 1] }, torsoW: 1, near: ['L', 'R'], far: [], ears: [-1, 1], side: false },
  q:     { face: { cx: .7, fw: .8, eyes: [-1, 1] }, torsoW: .86, near: ['L'], far: ['R'], ears: [-1], side: true },
  qf:    { face: { cx: .35, fw: .9, eyes: [-1, 1] }, torsoW: .94, near: ['L', 'R'], far: [], ears: [-1, 1], side: false },   // the in-between of a turn
  side:  { face: { cx: 1.15, fw: .55, eyes: [1] }, torsoW: .62, near: ['L'], far: ['R'], ears: [-.1], side: true },
  back:  { face: null, torsoW: 1, near: ['L', 'R'], far: [], ears: [-1, 1], side: false, back: true },
};

// Where each shoulder is (body frame x): profile both near the middle; 3/4 the near one toward the back, the far one
// toward the chest; front and back at the torso's edges.
const shoulderX = (V, sideSign, far, u) => V === SV.q ? (far ? .7 : -.75) * u : V.side ? (far ? .25 : -.15) * u : sideSign * 1.8 * u * V.torsoW;
// A seated body keeps its seat (no upward bob) and squashes half as much. Shared by survivor() and its helpers.
const bodySq = o => ((o.sq || 0) + (o.take || 0)) * (1 - .5 * clamp(o.sit || 0));
const bodyDy = o => (o.dy || 0) < 0 ? (o.dy || 0) * (1 - clamp(o.sit || 0)) : (o.dy || 0);
function skinCols(o) {
  const base = typeof o.skin === 'object' ? o.skin : (SKIN_TONES[o.skin] || SKIN_TONES.light);
  return tintCols({ ...o, col: base.col, dk: base.dk, lt: base.lt });
}

function survivor(x, y, u, o = {}) {
  const id = o.boilKey ?? ++CLAWD_N, rs = part => boilSeed(`surv ${id} ${part}`);
  const V = SV[o.view] || SV.front, view = SV[o.view] ? o.view : 'front';
  x += (o.dx || 0) * u;
  const dy = bodyDy(o) * u, sq = bodySq(o), sm = clamp(o.smear || 0);
  const sw = clamp(u / 16, .45, 2.4) * (o.swMul || 1);
  // mood tints colour the face only (a flushed face, not a different skin tone); o.tintBody tints all of him (soot)
  const soot = clamp(o.soot || 0);   // blackened by a blast or a zap: ash-grey skin with darker soot patches, singed hair
  if (soot > 0) o = { ...o, hairCol: mixCol(hairCol(o), '#2B2724', .55 * soot) };
  const ash = c => soot > 0 ? { col: mixCol(c.col, '#77757C', .32 * soot), dk: mixCol(c.dk, '#4A484E', .32 * soot), lt: mixCol(c.lt, '#9A989E', .3 * soot) } : c;
  const S = ash(skinCols(o)), SB = o.tintBody ? S : ash(skinCols({ ...o, tint: null, tintMix: null })), gear = o.gear || {}, crouch = clamp(o.crouch || 0);
  const suitOf = g => g.hazmat ? HAZ.suit : g.scientist ? (SCI[g.scientist] || SCI.peacekeeper) : null, suit = suitOf(gear);
  const aL = o.rawArms ? (o.aL ?? -1.32) : humanArm(o.aL ?? .2), aR = o.rawArms ? (o.aR ?? -1.32) : humanArm(o.aR ?? .2);
  const legC = mixCol(SB.col, SB.dk, .15);

  rs('shadow');
  if (!o.noShadow) { const f = 1 - Math.min(.5, Math.abs(o.dy || 0) * .05); paint(ellPts(x, y + u * .12, u * 2.9 * f, u * .55 * f, 20), { fill: PAL.ink, fillOp: 90, bleed: .25, tex: .3, border: .1, ink: null }); }
  if (sm > .05) smearTrail(x, y + dy, u * .8, { R: 3, L: -3 }, sm, o.smearDir ?? (o.flip ? -1 : 1), SB.col);

  push();
  translate(x, y + dy);
  if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .55) * (1 + sm * .3), (o.sy ?? 1) * (1 - sq));
  if (o.behind) { rs('behind'); o.behind(u, sw, V); }

  const st = clamp(o.sit || 0), drop = crouch * 1.2 * u + st * 2.05 * u;   // crouching bends the knees; sitting drops the hips to seat height
  const hipY = -4.4 * u + drop;
  // ---------- legs ----------
  const leg = (side, i, far) => {
    rs('leg' + i);
    const ph = o.walk != null ? (o.walk + (i ? .5 : 0)) * TAU : null;
    let swing = 0, lift = 0, knee = .08 + crouch * .9;
    if (ph != null) {
      if (V.side) { swing = Math.sin(ph) * .5; knee = Math.max(knee, Math.max(0, -Math.cos(ph)) * .75 + .05); }
      else { lift = Math.max(0, Math.sin(ph)) * .75; knee = Math.max(knee, lift * .9); }
    }
    const lk = clamp(i === 0 ? o.liftL || 0 : o.liftR || 0);   // leg 0 is the near (L) leg in side views
    if (lk > 0) { if (V.side) { swing = lerp(swing, -1.0, lk); knee = lerp(knee, 1.7, lk); } else { lift = lerp(lift, 1, lk); knee = lerp(knee, 1.2, lk); } }
    const hk = V.side ? clamp(i === 0 ? o.heelL || 0 : o.heelR || 0) : 0;   // the foot bent up behind him (a hurt foot held in his hand)
    if (hk > 0) { swing = lerp(swing, 1.13, hk); knee = lerp(knee, 1.47, hk); }
    const hx = (V.side ? side * .35 : side * .9) * u * V.torsoW, hy = hipY, th = 2.05 * u, sh = 2.0 * u;
    const a1 = Math.PI / 2 + swing - (V.side ? knee * .5 : 0) * 1; let kx = hx + Math.cos(a1) * th * (V.side ? 1 : 0) + (V.side ? 0 : side * knee * .25 * u), ky = hy + Math.sin(a1) * th * (V.side ? 1 : 1 - lift * .25);
    const a2 = Math.PI / 2 + swing + (V.side ? knee : 0) * 1; let ax = kx + Math.cos(a2) * sh * (V.side ? 1 : 0) - (V.side ? 0 : side * knee * .2 * u), ay = Math.min(-.25 * u, ky + Math.sin(a2) * sh * (V.side ? 1 : 1 - lift * .3));
    if (st > 0) {   // sitting: the thigh swings forward to level (side) or foreshortens toward us (front), the shin hangs down
      const skx = V.side ? hx + th * .98 : hx + side * .25 * u, sky = V.side ? hy + th * .06 : hy + th * .2;
      kx = lerp(kx, skx, st); ky = lerp(ky, sky, st);
      if (o.legsOut && V.side) { ax = lerp(ax, skx + sh * .98, st); ay = lerp(ay, sky + .05 * u, st); }   // sitting on the ground, legs out straight
      else { ax = lerp(ax, skx + (V.side ? .1 : side * .05) * u, st); ay = lerp(ay, -.25 * u, st); }
    }
    const ck = clamp(i === 0 ? o.clutchL || 0 : o.clutchR || 0);
    if (ck > 0) [kx, ky, ax, ay] = clutchLeg(u, hx, hy, ck, kx, ky, ax, ay, V.side);
    const col = far ? mixCol(legC, SB.dk, .45) : st > .5 ? mixCol(legC, SB.dk, .55) : legC;   // seated legs sit in the body's shade
    if (gear.pants || suit) {
      const pc = suit || (gear.pantsCol || '#3D4248');
      paint(limb([hx, hy], [kx, ky], [ax, ay], 1.45 * u, 1.15 * u), { wash: far ? mixCol(pc, PAL.ink, .25) : pc, ink: PAL.ink, sw: sw * .8, curv: .15 });
    } else paint(limb([hx, hy], [kx, ky], [ax, ay], 1.2 * u, .95 * u), { wash: col, ink: PAL.ink, sw: sw * (st > .5 ? .9 : .8), curv: .15 });
    // foot (or boot)
    const boot = gear.boots || suit, fcol = boot ? (gear.hazmat ? HAZ.boot : gear.scientist ? '#232227' : '#6B4A30') : col;
    if (V.side && o.legsOut && st > .5) paint(ellPts(ax + .15 * u, ay - .35 * u, (boot ? 1.05 : .9) * u, .42 * u, 14, 0, -1.35), { wash: far ? mixCol(fcol, PAL.ink, .25) : fcol, ink: PAL.ink, sw: sw * .7 });   // heel down, toes up
    else if (V.side && hk > .3) paint(ellPts(ax - .35 * u, ay + .25 * u, .9 * u, .42 * u, 14, 0, -.54), { wash: fcol, ink: PAL.ink, sw: sw * .7 });   // sole up, toes down behind him
    else if (V.side) paint(ellPts(ax + .45 * u, ay + .02 * u, (boot ? 1.05 : .9) * u, .42 * u, 14, 0, swing * .3), { wash: far ? mixCol(fcol, PAL.ink, .25) : fcol, ink: PAL.ink, sw: sw * .7 });
    else if (ck > .3) paint(ellPts(ax + .2 * u, ay + .05 * u, .85 * u, .42 * u, 14, 0, .25), { wash: fcol, ink: PAL.ink, sw: sw * .7 });   // the hurt foot, held up
    else paint(ellPts(ax + side * .12 * u, ay + .05 * u, (boot ? .82 : .7) * u, .4 * u, 14), { wash: fcol, ink: PAL.ink, sw: sw * .7 });
    return [[hx, hy], [kx, ky]];
  };
  const thighs = [];
  if (V.back && st > .5) { const hx = .9 * u; thighs[0] = [[-hx, hipY], [-hx, hipY + .3 * u]]; thighs[1] = [[hx, hipY], [hx, hipY + .3 * u]]; }   // seated, seen from behind: the legs are out in front of him
  else if (V.side) { thighs[1] = leg(1, 1, true); thighs[0] = leg(-1, 0, false); }
  else if (o.clutchL > 0) { thighs[1] = leg(1, 1, false); thighs[0] = leg(-1, 0, false); }   // the held-up leg crosses in front
  else { thighs[0] = leg(-1, 0, false); thighs[1] = leg(1, 1, false); }

  // ---------- arms (far ones go behind the torso) ----------
  const arm = (which, far, inFront = false) => {   // inFront: a far arm drawn over the body (reaching across it)
    rs('arm' + which);
    const sideSign = V.side ? 1 : (which === 'R' ? 1 : -1), a = which === 'L' ? aL : aR, b = (which === 'L' ? o.bendL : o.bendR) ?? (.22 + .55 * clamp((a + .6) / 1.6));   // raised arms bend in
    const shx = shoulderX(V, sideSign, far, u), shy = -7.75 * u + drop;
    const d1 = [sideSign * Math.cos(a), -Math.sin(a)], a2 = a - b, d2 = [sideSign * Math.cos(a2), -Math.sin(a2)], ak = (which === 'L' ? o.armKL : o.armKR) ?? 1;
    const ex = shx + d1[0] * 1.85 * u * ak, ey = shy + d1[1] * 1.85 * u * ak, hx = ex + d2[0] * 1.75 * u * ak, hy = ey + d2[1] * 1.75 * u * ak;
    const top = gear.hoodie || suit, col = top ? (suit || (gear.hoodieCol || '#A8382E')) : SB.col;
    const w0 = (top ? 1.15 : .95) * u, [SA, SBd] = limbSides([shx, shy], [ex, ey], [hx, hy], w0, (top ? .95 : .78) * u), RB = SA.concat([...SBd].reverse());
    if (far && !inFront) paint(RB, { wash: mixCol(col, PAL.ink, .28), ink: PAL.ink, sw: sw * .8 });
    else {   // a near arm grows out of a round shoulder: no outline across the joint
      const r = w0 * .55, a0 = V.side ? -Math.PI - .3 : -Math.PI / 2 - .35 * sideSign, a1 = V.side ? .3 : (sideSign > 0 ? .35 : -Math.PI - .35);
      paint(ellPts(shx, shy, r, r, 16), { wash: col, ink: null });
      inkLine(Array.from({ length: 11 }, (_, i) => { const t = lerp(a0, a1, i / 10); return [shx + Math.cos(t) * r, shy + Math.sin(t) * r]; }), sw * .8, PAL.ink, 'ink', 0);   // the shoulder's outer edge
      paint(RB, { wash: col, ink: null });
      const out = P => P.filter(p => Math.hypot(p[0] - shx, p[1] - shy) > w0 * .5);
      const sideA = out(densify(SA)), sideB = out(densify(SBd).reverse()), meanX = P => P.reduce((a, p) => a + p[0], 0) / (P.length || 1);
      const backIsA = V.side && meanX(sideA) < meanX(sideB), soft = [sw * .45, mixCol(SB.dk, PAL.ink, .45)];   // the edge toward his back
      inkLine(sideA, backIsA ? soft[0] : sw * .8, backIsA ? soft[1] : PAL.ink, 'ink', 0); inkLine(sideB, V.side && !backIsA ? soft[0] : sw * .8, V.side && !backIsA ? soft[1] : PAL.ink, 'ink', 0);
    }
    const hand = gear.hazmat ? (which === 'L' ? HAZ.gloveA : HAZ.gloveB) : gear.scientist ? '#26252A' : (gear.gloves ? '#5A4A3A' : SB.col), hc = far && !inFront ? mixCol(hand, PAL.ink, .28) : hand, open = which === 'L' ? o.openL : o.openR;
    const fist = () => {
      if (!open) { paint(ellPts(hx, hy, .55 * u, .55 * u, 14), { wash: hc, ink: PAL.ink, sw: sw * .7 }); return; }
      // an open palm, fingers spread along the forearm, thumb out to the side
      const fa = Math.atan2(d2[1], d2[0]), P = [];
      push(); translate(hx, hy); rotate(fa + Math.PI / 2);
      for (let f = 0; f < 4; f++) { const fx = (-.36 + f * .24) * u, len = (f === 1 || f === 2 ? .62 : .5) * u; paint(rrPts(fx - .1 * u, -.25 * u - len, .2 * u, len + .2 * u, .1 * u), { wash: hc, ink: PAL.ink, sw: sw * .55 }); }
      paint(rrPts(-.5 * u, -.42 * u, 1.0 * u, .85 * u, .3 * u), { wash: hc, ink: PAL.ink, sw: sw * .65 });
      paint(rrPts(.36 * u * sideSign - .1 * u, -.15 * u, .5 * u, .2 * u, .1 * u), { wash: hc, ink: PAL.ink, sw: sw * .5 });
      paint(rrPts(-.44 * u, -.36 * u, .88 * u, .5 * u, .25 * u), { wash: hc, ink: null });   // cover the finger roots
      pop();
    };
    // the grey hoodie cuff, with an ink rim so it reads as a band and not a smear
    if (gear.hoodie && !gear.gloves) { const C = [[hx - d2[0] * .55 * u - d2[1] * .5 * u, hy - d2[1] * .55 * u + d2[0] * .5 * u], [hx - d2[0] * .55 * u + d2[1] * .5 * u, hy - d2[1] * .55 * u - d2[0] * .5 * u]]; inkLine(C, sw * 3.1, PAL.ink, 'ink', 0); inkLine(C, sw * 2.3, '#9A9C98', 'ink', 0); }
    else if (gear.hoodie) { const cx = hx - d2[0] * .62 * u, cy = hy - d2[1] * .62 * u, C = [[cx - d2[1] * .55 * u, cy + d2[0] * .55 * u], [cx + d2[1] * .55 * u, cy - d2[0] * .55 * u]]; inkLine(C, sw * 2.9, PAL.ink, 'ink', 0); inkLine(C, sw * 2.1, '#8E908C', 'ink', 0); }
    const hook = which === 'L' ? (o.handL || o.armL) : (o.handR || o.armR);
    if (!(hook && o.handOver)) fist();
    if (hook) { push(); translate(hx, hy); hook(u, sw, { ang: Math.atan2(d2[1], d2[0]), side: sideSign, far }); pop(); if (o.handOver) fist(); }   // handOver: the fist wraps a grip
  };
  if (!o.farFront) for (const w of V.far) arm(w, true);

  // ---------- underwear (over the tops of the legs) ----------
  rs('briefs');
  const bw = 2.05 * u * V.torsoW, wy = -5.15 * u + drop, briefsCol = o.briefs || BRIEFS.col;
  if (gear.pants || suit) {
    const pc = suit || (gear.pantsCol || '#3D4248');
    paint([[-bw, wy], [bw, wy], [bw * 1.02, hipY + .35 * u], [0, hipY + .6 * u], [-bw * 1.02, hipY + .35 * u]], { wash: pc, ink: PAL.ink, sw: sw * .8, curv: .15 });
  } else {
    // boxer legs to mid-thigh, then the seat, then the waistband
    for (const [h, k] of thighs) { const mx = lerp(h[0], k[0], .68), my = lerp(h[1], k[1], .68); paint(ribbon([h, [mx, my]], 1.38 * u, 1.34 * u), { wash: briefsCol, ink: PAL.ink, sw: sw * .7 }); }
    paint([[-bw, wy], [bw, wy], [bw * 1.02, hipY + .35 * u], [0, hipY + .55 * u], [-bw * 1.02, hipY + .35 * u]], { wash: briefsCol, ink: PAL.ink, sw: sw * .8, curv: .15 });
    paint(rectPts(-bw, wy, bw * 2, .28 * u, u * .02), { wash: BRIEFS.band, ink: PAL.ink, sw: sw * .45 });
    for (let k = 0; k < 3; k++) inkLine([[(-1.1 + k * .9) * u * V.torsoW, wy + (.85 + .25 * k) * u], [(-.7 + k * .9) * u * V.torsoW, wy + (1.05 + .2 * k) * u]], sw * .35, BRIEFS.scuff, 'inkfine', 0);
  }

  // ---------- torso ----------
  rs('torso');
  const tw = 2.1 * u * V.torsoW, shY = -8.35 * u + drop;
  const torso = [[-tw * .88, wy + .1 * u], [tw * .88, wy + .1 * u], [tw * .98, wy - 1.4 * u], [tw, shY + .55 * u], [tw * .78, shY], [-tw * .78, shY], [-tw, shY + .55 * u], [-tw * .98, wy - 1.4 * u]];
  const topCol = suit || (gear.hoodie ? (gear.hoodieCol || '#A8382E') : SB.col);
  paint(torso, { wash: topCol, ink: PAL.ink, sw: sw * .9, curv: .2 });
  if (!gear.hoodie && !suit && !V.back) {   // a little anatomy so it reads as a bare chest
    const cx = view === 'side' ? .2 * u : view === 'q' ? .25 * u : 0, reach = tw * .82 - Math.abs(cx);   // pec lines end inside the torso
    for (const s of view === 'side' ? [1] : [-1, 1]) { const L = Math.min(1.5 * u, reach) * (view === 'q' && s < 0 ? .8 : 1); inkLine([[cx + s * .2 * u, shY + 1.15 * u], [cx + s * (.2 * u + (L - .2 * u) * .55), shY + 1.45 * u], [cx + s * L, shY + 1.15 * u]], sw * .45, SB.dk, 'inkfine', .5); }
    paint(ellPts(cx + (view === 'side' ? .5 * u : 0), wy - .55 * u, .11 * u, .14 * u, 8), { wash: SB.dk, ink: null });
  }
  if (soot > 0 && !suit && !gear.hoodie) sootPatches(0, (shY + wy) / 2, tw * .8, (wy - shY) * .42, soot, 'torso' + (o.boilKey || ''), u);
  if (gear.hazmat) hazmatBodyGear(u, sw, V, tw, shY, wy);
  if (gear.scientist) scientistBodyGear(u, sw, V, tw, shY, wy, bw);
  if (o.under) { rs('under'); o.under(u, sw, V); }
  if (gear.chest === 'metal') chestplateGear(u, sw, V, tw, shY, wy);
  if (gear.kilt === 'roadsign') roadsignKiltGear(u, sw, V, bw, wy);

  // ---------- neck and head ----------
  rs('head');
  const hcx = 0, hcy = -10.85 * u + drop, R = 2.35 * u;
  paint(rectPts(-.5 * u, shY - 1.1 * u, 1.0 * u, 1.2 * u), { wash: mixCol(SB.col, SB.dk, .45), ink: null });
  const hooded = gear.hazmat || gear.scientist;
  if (hooded) { suitHeadGear(u, sw, o, V, S, hcx, hcy, R, gear, shY); }
  else {
  if (!V.side) for (const e of V.ears) paint(ellPts(hcx + e * R * .98, hcy + .1 * u, .48 * u, .62 * u, 12), { wash: S.col, ink: PAL.ink, sw: sw * .6 });
  paint(ellPts(hcx, hcy, R, R * .98, 28, u * .02), { wash: S.col, ink: PAL.ink, sw: sw * .9 });
  if (soot > 0 && !V.back) sootFace(u, V, hcx, hcy, R, soot, 'face' + (o.boilKey || ''));
  if (V.side) {   // 3/4 and profile: features placed on the turned head (turnedHead)
    turnedHead(u, sw, o, V, S, hcx, hcy, R, 'face');
    turnedHead(u, sw, o, V, S, hcx, hcy, R, 'hair');
    if (o.frizz > 0) frizzHalo(u, sw, o, hcx, hcy, R);   // electrocuted
    turnedHead(u, sw, o, V, S, hcx, hcy, R, 'ear');
  } else {
    if (V.face) faceOf(u, sw, o, V, S, hcx, hcy, R);
    hairOf(u, sw, o, V, hcx, hcy, R);
  }
  }
  if (gear.mask === 'metal' && !V.back) metalMaskGear(u, sw, V, hcx, hcy, R, o);
  // o.face(u, sw, V, head): drawn on the head, after hair and gear but under the arms (plasters, paint, overlays).
  // head = { hcx, hcy, R, th, pt(lon, lat, k) } where pt places a point on the turned head (see turnPt).
  if (o.face) { rs('face'); const th = V === SV.side ? HEAD_TURN.side : V === SV.q ? HEAD_TURN.q : 0; o.face(u, sw, V, { hcx, hcy, R, th, pt: (lon, lat, k = 1) => turnPt(hcx, hcy, R, th, lon, lat, k) }); }

  if (o.farFront) for (const w of V.far) arm(w, true, true);   // over the body, under the near arm and what it holds
  for (const w of V.near) arm(w, false);
  if (o.draw) { rs('draw'); o.draw(u, sw, V); }
  pop();

  rs('emote');
  if (o.emote) {
    const top = EMOTE_TOP.includes(o.emote), dir = o.flip ? -1 : 1;
    emote(o.emote, x + dir * (top ? 0 : 2.9 * u) + (o.emoteDx || 0) * u, y + dy + drop + (top ? -15.4 : -12.8) * u * (1 - sq) + (o.emoteDy || 0) * u, u * 1.05, o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');
}

// ---------- face ----------
// Lines inside the head (hairline, beard edge, moustache) are thin and dark brown; only the silhouette gets the black ink.
const hairCol = o => HAIR_COLS[o.hairCol] || o.hairCol || HAIR_COLS.brown;
const hairLine = o => mixCol(hairCol(o), PAL.ink, .55);
function faceOf(u, sw, o, V, S, hcx, hcy, R) {
  const F = V.face, fx = hcx + F.cx * u, e = o.eyes || 'normal', kinds = Array.isArray(e) ? e : [e, e];
  const sq = clamp(o.squint || 0), q = V === SV.q, side = V === SV.side;
  // brows follow the mood of the eyes
  const browOf = k => ['angry', 'determined', 'red', 'sly'].includes(k) ? 'angry' : ['sad', 'teary', 'cry', 'scared'].includes(k) ? 'worried' : ['wide', 'shine', 'spark', 'blank'].includes(k) ? 'up' : 'flat';
  if (o.blush) for (const s of F.eyes) paint(ellPts(fx + s * 1.25 * u * F.fw, hcy + .75 * u, .5 * u, .26 * u, 12), { fill: PAL.rose, fillOp: 170 * clamp(o.blush === true ? 1 : o.blush), bleed: .2, ink: null });
  EYE_INK = o.eyeCol || PAL.ink;
  for (const s of F.eyes) {
    const ex = fx + s * .85 * u * F.fw, ey = hcy - .05 * u, k = kinds[s < 0 ? 0 : 1];
    push(); translate(ex, ey); scale(.46 * F.fw + .04, .38);   // clawd.js eye moods, scaled down; the plain eyes are ovals
    if (sq > .8) inkLine([[-.8 * u, 0], [.8 * u, 0]], sw * 2.2, EYE_INK, 'ink', 0);
    else { if (sq > 0) scale(1, 1 - sq); humanEye(k, s, u, o, sw * 2.2); }
    pop();
    // brows: angry ones slant down toward the nose, worried ones up
    const b = browOf(k), by = ey - .78 * u - (b === 'up' ? .22 * u : 0), tilt = b === 'angry' ? .28 : b === 'worried' ? -.25 : 0;
    const arch = b === 'flat' || b === 'up' ? .12 * u : .04 * u;
    inkLine([[ex - .42 * u * F.fw, by + tilt * s * .5 * u], [ex, by - arch], [ex + .42 * u * F.fw, by - tilt * s * .5 * u]], sw * .95, hairCol(o), 'ink', .5);
  }
  EYE_INK = PAL.ink;
  // nose: a bump on the profile, a little hook between the eyes in 3/4, a tick from the front
  if (side) { const N = through([[hcx + R * .92, hcy - .22 * u], [hcx + R * 1.06, hcy + .22 * u], [hcx + R * 1.07, hcy + .44 * u], [hcx + R * .96, hcy + .58 * u], [hcx + R * .86, hcy + .56 * u]], 4); paint(N, { wash: S.col, ink: null }); inkLine(N, sw * .4, mixCol(S.dk, PAL.ink, .5), 'inkfine', 0); }
  else if (q) inkLine([[fx + .1 * u, hcy + .14 * u], [fx + .36 * u, hcy + .5 * u], [fx + .1 * u, hcy + .62 * u]], sw * .55, S.dk, 'inkfine', .5);
  else inkLine([[fx - .05 * u, hcy + .2 * u], [fx + .14 * u, hcy + .5 * u], [fx - .06 * u, hcy + .58 * u]], sw * .55, S.dk, 'inkfine', .5);
  // beard and moustache (under the mouth, so every mouth stays readable)
  const mx = side ? hcx + R * .76 : q ? fx + .25 * u : fx, my = hcy + 1.42 * u;
  if (o.beard) beardOf(u, sw, o, V, hcx, hcy, R, fx, mx);
  // clawd.js mouths sit at y -4.3u around their origin; scaled by MS, they land on the mouth line (my)
  const MS = .42, m = o.mouth;
  if (m) { push(); translate(mx, my + 4.3 * u * MS); scale(MS * F.fw + .08, MS); mouth(u, m, sw * 2.2); pop(); }
  else inkLine([[mx - .26 * u * F.fw, my - .01 * u], [mx, my + .07 * u], [mx + .26 * u * F.fw, my - .01 * u]], sw * .45, mixCol(S.dk, PAL.ink, .5), 'inkfine', .5);   // a small resting smile
  if (o.beard && o.beard !== 'stubble') moustacheOf(u, sw, o, V, mx, my);
}
// The plain eyes are dark ovals with a glint (Clawd's are tall slits); happy and shut eyes are thin arcs; every other
// mood uses clawd.js's eye shapes. Runs inside the face's eye frame (scaled .5 × .38), so lines are drawn thinner here.
function humanEye(k, s, u, o, sw) {
  if (k === 'happy') { inkLine([[-.85 * u, .55 * u], [0, -.55 * u], [.85 * u, .55 * u]], sw * .5, EYE_INK, 'ink', .7); return; }
  if (k === 'sly') {   // half-lidded, looking sideways: scheming
    const lx = (o.lookX ?? .7) * u * .45, ly = (o.lookY || 0) * u * .3;
    paint(ellPts(lx, ly + .2 * u, .66 * u, .62 * u, 16), { wash: EYE_INK, ink: null });
    inkLine([[-.95 * u, -.12 * u], [.95 * u, -.12 * u]], sw * .55, EYE_INK, 'ink', 0);
    return;
  }
  if (k === 'closed' || k === 'sleep') { inkLine([[-.85 * u, -.1 * u], [0, .55 * u], [.85 * u, -.1 * u]], sw * .5, EYE_INK, 'ink', .7); return; }
  if (k === 'cross') {   // cross-eyed: each pupil rolls in toward the nose
    paint(ellPts(0, 0, .7 * u, 1.0 * u, 18), { wash: PAL.cream, ink: EYE_INK, sw: sw * .35 });
    paint(ellPts(-s * .32 * u, .1 * u, .42 * u, .6 * u, 14), { wash: EYE_INK, ink: null });
    return;
  }
  if (!['normal', 'look', 'wide'].includes(k)) return eye(k, s, u, o, sw);
  if (((T * .9 + (o.seed || 0) * 1.7) % 3.3) < .12) { inkLine([[-.75 * u, .3 * u], [.75 * u, .3 * u]], sw * .6, EYE_INK, 'ink', 0); return; }
  const lx = (o.lookX || 0) * u * .5, ly = (o.lookY || 0) * u * .4, w = k === 'wide' ? 1.2 : 1;
  paint(ellPts(lx, ly, .66 * u * w, 1.0 * u * w, 18), { wash: EYE_INK, ink: null });
  if (u > 9) paint(ellPts(lx - .22 * u * w, ly - .36 * u * w, .22 * u, .28 * u, 10), { wash: PAL.cream, washOp: 235, ink: null });
}
// Head-relative point lists: [x, y] in head radii from the head's centre, +x = the way the face points.
const HR = (hcx, hcy, R, P) => P.map(([a, b]) => [hcx + a * R, hcy + b * R]);
const headArc = (hcx, hcy, R, r, a0, a1, n = 14, bump = null) => {
  const P = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), k = bump ? r + bump[1] * Math.exp(-(((a - bump[0]) / .35) ** 2)) : r; P.push([hcx + Math.cos(a) * k * R, hcy + Math.sin(a) * k * R]); }
  return P;
};
// A short full beard (reference: Rust's default male model): sideburns into a jaw beard that ends at the chin. The top
// edge dips under the mouth. Filled first, then the jaw silhouette in black ink and the cheek edge in thin brown.
function beardOf(u, sw, o, V, hcx, hcy, R, fx, mx) {
  const col = hairCol(o);
  if (o.beard === 'stubble') { for (let i = 0; i < 14; i++) { const a = .5 + i / 13 * (Math.PI - 1), r = R * .8; paint(ellPts(hcx + Math.cos(a) * r * (V.side ? .45 : 1) + (V.side ? .9 * u : 0), hcy + .3 * u + Math.sin(a) * r * .75, .07 * u, .07 * u, 6), { wash: col, ink: null }); } return; }
  let top, jaw, back = [];   // jaw may be re-assigned (frizz)
  if (V === SV.side) {
    top = HR(hcx, hcy, R, [[.08, .28], [.2, .46], [.42, .6], [.6, .74], [.78, .78], [.9, .68]]);
    jaw = headArc(hcx, hcy, R, 1.05, .6, 1.62, 12, [.88, .09]);
    back = HR(hcx, hcy, R, [[-.08, .8], [-.12, .52], [-.02, .32]]);
  } else if (V === SV.q) {
    top = HR(hcx, hcy, R, [[-.26, .26], [-.18, .46], [0, .58], [.2, .72], [.38, .8], [.56, .8], [.74, .68], [.86, .5]]);
    jaw = headArc(hcx, hcy, R, 1.05, .55, 2.1, 14, [1.15, .08]);
    back = HR(hcx, hcy, R, [[-.46, .62], [-.38, .32]]);
  } else {
    const w = R * .9 * V.face.fw + .12 * u;
    top = [[fx - w, hcy + .35 * u], [fx - w * .72, hcy + 1.0 * u], [fx - w * .3, hcy + 1.64 * u], [fx, hcy + 1.76 * u], [fx + w * .3, hcy + 1.64 * u], [fx + w * .72, hcy + 1.0 * u], [fx + w, hcy + .35 * u]];
    jaw = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; jaw.push([fx + Math.cos(a) * w * .98, hcy + .45 * u + Math.sin(a) * 2.05 * u]); }
  }
  if (o.frizz > 0) jaw = jaw.map(([x, y], i) => { const dx = x - hcx, dy = y - hcy, d = Math.hypot(dx, dy) || 1, k = (i % 2 ? .05 : .2) * o.frizz * R; return [x + dx / d * k, y + dy / d * k]; });   // bristling
  const Tp = through(top, 3), Jw = o.frizz > 0 ? jaw : through(jaw, 2), Bk = back.length ? through([jaw[jaw.length - 1], ...back, top[0]], 3) : [];
  paint([...Tp, ...Jw, ...Bk], { wash: col, ink: null });
  inkLine(Jw, sw * (V === SV.side ? .4 : .6), V === SV.side ? hairLine(o) : PAL.ink, 'ink', 0);
  inkLine(Tp, sw * .32, hairLine(o), 'inkfine', 0);
  if (Bk.length) inkLine(Bk, sw * .32, hairLine(o), 'inkfine', 0);
}
// The moustache sits on the upper lip and joins the beard at the mouth corners.
function moustacheOf(u, sw, o, V, mx, my) {
  const f = V === SV.side ? .55 : V === SV.q ? .8 : 1, P = [[-.58, -.24], [-.42, -.36], [-.15, -.39], [0, -.34], [.15, -.39], [.42, -.36], [.58, -.24], [.46, -.18], [.28, -.16], [.1, -.14], [0, -.11], [-.1, -.14], [-.28, -.16], [-.46, -.18]];
  const pts = P.map(([a, b]) => [mx + a * u * f, my + b * u]);
  paint(pts, { wash: hairCol(o), ink: null, curv: .35 });
  inkLine(pts.slice(0, 7), sw * .3, hairLine(o), 'inkfine', .4);
}
// Hair. Front: a cap with a ragged fringe. 3/4 and profile: it covers the crown and the back of the head down to the
// nape, curving over the ear into a sideburn in front of it. Back: all hair down to the nape.
function hairOf(u, sw, o, V, hcx, hcy, R) {
  const style = o.hair || 'short', col = hairCol(o), curv = style === 'buzz' ? .4 : .2;
  if (style === 'bald') return;
  const r = style === 'buzz' ? 1.01 : style === 'messy' ? 1.1 : 1.05;
  let outer, inner;
  if (V.back) { outer = headArc(hcx, hcy, R, r, Math.PI - .62, TAU + .62, 22); inner = HR(hcx, hcy, R, [[.5, .62], [.25, .72], [0, .78], [-.25, .72], [-.5, .62]]); }
  else if (V.side) {
    const q = V === SV.q, m = style === 'messy' ? .08 : 0;
    outer = headArc(hcx, hcy, R, r, q ? -.72 : -.62, -Math.PI - (q ? .85 : .75), 18);
    inner = HR(hcx, hcy, R, q ? [[-.6, .64], [-.74, .3], [-.74, -.02], [-.64, -.24], [-.46, -.32], [-.3, -.24], [-.25, .02], [-.24, .3], [-.14, .26], [-.08, -.3], [.1, -.5 - m], [.24, -.43], [.4, -.58 - m], [.58, -.5], [.76, -.6]]
                              : [[-.48, .66], [-.44, .3], [-.36, -.02], [-.26, -.26], [-.06, -.32], [.08, -.2], [.12, .06], [.13, .3], [.25, .26], [.28, -.3], [.44, -.5 - m], [.58, -.44], [.7, -.56 - m], [.82, -.5]]);
  } else {
    outer = []; const a0 = Math.PI * 1.08, a1 = Math.PI * 1.92;
    for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; outer.push([hcx + Math.cos(a) * R * r, hcy + Math.sin(a) * R * r]); }
    const fringe = style === 'messy' ? 6 : style === 'buzz' ? 2 : 4; inner = [];
    for (let i = 0; i <= fringe; i++) { const fxx = lerp(hcx + R * .95, hcx - R * .95, i / fringe), up = (i % 2 ? .1 : .3) * u * (style === 'messy' ? 1.6 : 1); inner.push([fxx, hcy - R * .6 + up]); }
  }
  if (o.frizz > 0 && !V.back) frizzHalo(u, sw, o, hcx, hcy, R);
  const O = through(outer, 3), I = through([outer[outer.length - 1], ...inner, outer[0]], 3);
  paint([...O, ...I], { wash: col, ink: null });
  inkLine(O, sw * .7, PAL.ink, 'ink', 0);
  inkLine(I, sw * .32, hairLine(o), 'inkfine', 0);
  if (style === 'bun') paint(ellPts(hcx - R * (V.side ? .75 : .6), hcy - R * .95, .8 * u, .7 * u, 12), { wash: col, ink: PAL.ink, sw: sw * .7 });
}

// Electrocuted: a spiky halo of hair standing on end, round the crown (a ring, so the face stays clear).
function frizzHalo(u, sw, o, hcx, hcy, R) {
  const F = [], n = 26, fz = clamp(o.frizz), a0 = Math.PI * .92, a1 = Math.PI * 2.08;
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), rr = R * (1.1 + (i % 2 ? .12 : .42 + .1 * hash(i + 3)) * fz); F.push([hcx + Math.cos(a) * rr, hcy + Math.sin(a) * rr]); }
  for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n); F.push([hcx + Math.cos(a) * R * .97, hcy + Math.sin(a) * R * .97]); }
  paint(F, { wash: hairCol(o), ink: null });
  inkLine(F.slice(0, n + 1), sw * .7, PAL.ink, 'ink', 0);
  if (o.soot > .3) for (let i = 0; i <= n; i += 4) { const [x, y] = F[i], fl = .5 + .5 * Math.sin(T * 14 + i); glow(x, y, .5 * u, '#FF9A3A', .5 * fl * o.soot); paint(ellPts(x, y, .1 * u, .1 * u, 6), { wash: '#FFB04A', ink: null }); }   // singed tips still glowing
}

// ---------- turned heads (3/4 and profile) ----------
// The head is a sphere seen turned by th (0 = facing us, π/2 = a profile facing right). A feature sits at longitude
// lon (0 = the middle of the face, − = the near side, + = the far side) and latitude lat (− up, + down) on a surface
// set in (k < 1: eyes) or pushed out (k > 1: the nose) from the skull. turnPt gives [x, y, depth]: depth > 0 faces us.
// Everything (eyes, brows, nose, mouth, ear, hairline, beard) is placed this way, so the views always agree: a profile
// shows one eye and one ear, a 3/4 shows the far eye foreshortened beside the nose, and the hair and beard stay on the
// skull and jaw.
const HEAD_TURN = { q: .62, side: Math.PI / 2 };
function turnPt(hcx, hcy, R, th, lon, lat, k = 1) {
  const X = Math.sin(lon) * Math.cos(lat), Y = Math.sin(lat), Z = Math.cos(lon) * Math.cos(lat) * k;
  return [hcx + R * (X * Math.cos(th) + Z * Math.sin(th)), hcy + R * Y, -X * Math.sin(th) + Z * Math.cos(th)];
}
// a point on the skull, or (if it has turned away) the silhouette at the same height on that side
function turnPtClamped(hcx, hcy, R, th, lon, lat, k = 1) {
  const p = turnPt(hcx, hcy, R, th, lon, lat, k);
  if (p[2] >= 0) return p;
  const Y = Math.sin(lat) * k, w = Math.sqrt(Math.max(0, 1 - Math.min(1, Y * Y))) * R, side = Math.sin(lon + th) >= 0 ? 1 : -1;
  return [hcx + side * w, hcy + R * Math.min(1, Y), 0];
}
const lerpKeys = (K, x) => { x = Math.abs(x); for (let i = 1; i < K.length; i++) if (x <= K[i][0]) return lerp(K[i - 1][1], K[i][1], (x - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); return K[K.length - 1][1]; };
// the hairline (latitude of the hair's edge, by |longitude|): forehead, temple, sideburn, up over the ear, nape
const HAIRLINE = [[0, -.5], [.6, -.46], [.9, -.3], [1.12, .02], [1.28, .3], [1.36, .3], [1.42, -.06], [1.57, -.2], [1.74, -.06], [1.95, .3], [2.4, .55], [Math.PI, .62]];
// the beard: its top edge (under the lip, up to the mouth corners, the cheek, into the sideburn) and its jaw edge
const BEARD_TOP = [[0, .86], [.18, .84], [.3, .66], [.55, .46], [.9, .31], [1.2, .24], [1.36, .2]];
const BEARD_JAW = [[0, 1.26], [.6, 1.16], [1.0, 1.04], [1.2, .94], [1.36, .84]], BEARD_JAW_K = [[0, 1.13], [.6, 1.07], [1.36, 1.0]];
function turnedHead(u, sw, o, V, S, hcx, hcy, R, part) {
  const th = V === SV.side ? HEAD_TURN.side : HEAD_TURN.q, P = (lon, lat, k) => turnPt(hcx, hcy, R, th, lon, lat, k);
  const fore = lon => clamp(Math.cos(lon + th), .3, 1);   // how flat-on a spot of the face is to us
  if (part === 'hair') {
    const style = o.hair || 'short'; if (style === 'bald') return;
    const col = hairCol(o), loV = -Math.PI / 2 - th + .02, hiV = Math.PI / 2 - th - .02, line = [];
    for (let i = 0; i <= 40; i++) { const lon = lerp(-Math.PI, Math.PI, i / 40); if (lon < loV || lon > hiV) continue; const p = P(lon, lerpKeys(HAIRLINE, lon) - (style === 'buzz' ? .04 : 0)); line.push([p[0], p[1]]); }
    for (const lon of [loV, hiV]) { const p = turnPtClamped(hcx, hcy, R, th, lon, lerpKeys(HAIRLINE, lon)); if (lon === loV) line.unshift([p[0], p[1]]); else line.push([p[0], p[1]]); }
    const r = style === 'buzz' ? 1.01 : style === 'messy' ? 1.08 : 1.04, a0 = Math.atan2(line[line.length - 1][1] - hcy, line[line.length - 1][0] - hcx), a1 = Math.atan2(line[0][1] - hcy, line[0][0] - hcx);
    let da = a1 - a0; while (da > 0) da -= TAU;   // over the top: from the front end, anticlockwise, round to the back end
    const arc = []; for (let i = 0; i <= 22; i++) { const a = a0 + da * i / 22, rr = R * (r + (style === 'messy' ? .05 * Math.sin(i * 2.7) : 0)); arc.push([hcx + Math.cos(a) * rr, hcy + Math.sin(a) * rr]); }
    const I = through(line, 3);
    paint([...I, ...arc], { wash: col, ink: null });
    inkLine(arc, sw * .7, PAL.ink, 'ink', 0);
    inkLine(I, sw * .32, hairLine(o), 'inkfine', 0);
    return;
  }
  if (part === 'ear') {   // the near ear, in the notch of the hairline
    const p = P(-Math.PI / 2, .1), w = .46 * u * clamp(Math.sin(th), .35, 1);
    paint(ellPts(p[0], p[1], w, .6 * u, 12), { wash: S.col, ink: mixCol(S.dk, PAL.ink, .55), sw: sw * .4 });
    inkLine([[p[0] + .25 * w, p[1] - .3 * u], [p[0] - .3 * w, p[1] - .02 * u], [p[0] + .15 * w, p[1] + .26 * u]], sw * .4, S.dk, 'inkfine', .5);
    return;
  }
  // ---- the face ----
  const e = o.eyes || 'normal', kinds = Array.isArray(e) ? e : [e, e], sq = clamp(o.squint || 0);
  const browOf = k => ['angry', 'determined', 'red', 'sly'].includes(k) ? 'angry' : ['sad', 'teary', 'cry', 'scared'].includes(k) ? 'worried' : ['wide', 'shine', 'spark', 'blank'].includes(k) ? 'up' : 'flat';
  if (o.blush) for (const s of [-1, 1]) { const p = P(s * .62, .3, .96); if (p[2] > .1) paint(ellPts(p[0], p[1], .5 * u * fore(s * .62), .26 * u, 12), { fill: PAL.rose, fillOp: 170 * clamp(o.blush === true ? 1 : o.blush), bleed: .2, ink: null }); }
  EYE_INK = o.eyeCol || PAL.ink;
  for (const s of [-1, 1]) {
    const lon = s * .4, p = P(lon, -.02, .84); if (p[2] <= .08) continue;   // the far eye is hidden in profile
    const f = fore(lon), k = kinds[s < 0 ? 0 : 1];
    push(); translate(p[0], p[1]); scale(.5 * f, .38);
    if (sq > .8) inkLine([[-.8 * u, 0], [.8 * u, 0]], sw * 2.2, EYE_INK, 'ink', 0);
    else { if (sq > 0) scale(1, 1 - sq); humanEye(k, s, u, o, sw * 2.2); }
    pop();
    const b = browOf(k), bp = P(lon, b === 'up' ? -.45 : -.36, .9), tilt = b === 'angry' ? .28 : b === 'worried' ? -.25 : 0, arch = b === 'flat' || b === 'up' ? .12 * u : .04 * u, bw = .44 * u * f;
    inkLine([[bp[0] - bw, bp[1] + tilt * s * .5 * u], [bp[0], bp[1] - arch], [bp[0] + bw, bp[1] - tilt * s * .5 * u]], sw * .95, hairCol(o), 'ink', .5);
  }
  EYE_INK = PAL.ink;
  // the nose: a hook toward the far cheek in 3/4; in profile it stands out past the head's outline
  const n0 = P(0, .02, 1.0), n1 = P(0, .2, 1.17), n2 = P(0, .29, 1.02);
  if (V === SV.side) { const N = through([n0, n1, n2, P(.02, .3, .94)].map(p => [p[0], p[1]]), 4); paint(N, { wash: S.col, ink: null }); inkLine(N.slice(0, -2), sw * .45, mixCol(S.dk, PAL.ink, .5), 'inkfine', 0); }
  else inkLine([[n0[0] - .05 * u, n0[1] + .12 * u], [n1[0], n1[1]], [n2[0] - .1 * u, n2[1]]], sw * .55, S.dk, 'inkfine', .5);
  // beard and moustache, under the mouth
  const mp = P(0, .64, .96), mw = clamp(Math.cos(th) * 1.05, .3, 1);
  if (o.beard && o.beard !== 'stubble') {
    const col = hairCol(o), top = [], jaw = [];
    for (let i = -14; i <= 14; i++) { const lon = i / 14 * 1.36, a = turnPtClamped(hcx, hcy, R, th, lon, lerpKeys(BEARD_TOP, lon)), b = turnPtClamped(hcx, hcy, R, th, lon, lerpKeys(BEARD_JAW, lon), lerpKeys(BEARD_JAW_K, lon)); top.push([a[0], a[1]]); jaw.push([b[0], b[1]]); }
    let J = jaw.slice().reverse();
    if (o.frizz > 0) J = J.map(([x, y], i) => { const dx = x - hcx, dy = y - hcy, d = Math.hypot(dx, dy) || 1, kk = (i % 2 ? .05 : .2) * o.frizz * R; return [x + dx / d * kk, y + dy / d * kk]; });
    const T = through(top, 2), Jt = o.frizz > 0 ? J : through(J, 2);
    paint([...T, ...Jt], { wash: col, ink: null });
    inkLine(Jt, sw * .6, PAL.ink, 'ink', 0);
    inkLine(T, sw * .32, hairLine(o), 'inkfine', 0);
  } else if (o.beard === 'stubble') for (let i = 0; i < 16; i++) { const lon = lerp(-1.2, 1.2, i / 15), p = P(lon, lerp(.55, .95, hash(i)), 1); if (p[2] > .05) paint(ellPts(p[0], p[1], .07 * u, .07 * u, 6), { wash: hairCol(o), ink: null }); }
  const MS = .42, m = o.mouth;
  if (m) { push(); translate(mp[0], mp[1] + 4.3 * u * MS); scale(MS * mw + .06, MS); mouth(u, m, sw * 2.2); pop(); }
  else inkLine([[mp[0] - .26 * u * mw, mp[1] - .01 * u], [mp[0], mp[1] + .07 * u], [mp[0] + .26 * u * mw, mp[1] - .01 * u]], sw * .45, mixCol(S.dk, PAL.ink, .5), 'inkfine', .5);
  if (o.beard && o.beard !== 'stubble') {   // the moustache rides the upper lip and meets the beard at the mouth corners
    const up = [], lo = []; for (let i = -6; i <= 6; i++) { const lon = i / 6 * .34, a = P(lon, .545 - .03 * Math.cos(i / 6 * Math.PI / 2), .99), b = P(lon, .605, .98); if (a[2] > .02) { up.push([a[0], a[1]]); lo.push([b[0], b[1]]); } }
    if (up.length > 2) { const pts = [...up, ...lo.reverse()]; paint(pts, { wash: hairCol(o), ink: null, curv: .3 }); inkLine(up, sw * .3, hairLine(o), 'inkfine', .4); }
  }
}

// ---- soot (o.soot 0..1): patchy ash-grey smudges, kept off the eyes so the face still acts ----
function sootPatches(cx, cy, w, h, k, key, u) {
  for (let i = 0; i < 6; i++) {
    boilSeed('soot' + key + i);
    const x = cx + (hash(i * 7.3 + 1) - .5) * w * 1.6, y = cy + (hash(i * 3.1 + 5) - .5) * h * 1.6, r = (.45 + .5 * hash(i + 11)) * u;
    paint(ellPts(x, y, r * 1.3, r, 9, r * .35, hash(i) * 3), { wash: '#3E3D43', washOp: 150 * k, ink: null });
  }
  for (let i = 0; i < 2; i++) { const x = cx + (hash(i + 21) - .5) * w, y = cy + (hash(i + 31) - .5) * h; inkLine([[x - .3 * u, y], [x, y + .15 * u], [x + .25 * u, y - .1 * u]], .5, '#B7B4BC', 'inkfine', 0); }   // ash cracks
}
function sootFace(u, V, hcx, hcy, R, k, key) {
  const off = V === SV.side ? .55 : V === SV.q ? .3 : 0;
  for (const [dx, dy, r] of [[-.55, .45, .55], [.6, .5, .5], [.1, -.75, .5], [-.3, .9, .4]]) { boilSeed('sootf' + key + dx); paint(ellPts(hcx + (dx + off) * R * .7, hcy + dy * R * .7, r * u * 1.2, r * u, 9, r * u * .3), { wash: '#3E3D43', washOp: 130 * k, ink: null }); }
}

// Where a survivor's hand is, in its upright body frame (before flip, scale and rotation) and in the world.
function handLocal(u, o, which) {
  const V = SV[o.view] || SV.front, drop = clamp(o.crouch || 0) * 1.2 * u + clamp(o.sit || 0) * 2.05 * u;
  const a = o.rawArms ? (which === 'L' ? o.aL ?? -1.32 : o.aR ?? -1.32) : humanArm(which === 'L' ? o.aL ?? .2 : o.aR ?? .2);
  const b = (which === 'L' ? o.bendL : o.bendR) ?? (.22 + .55 * clamp((a + .6) / 1.6));
  const far = V.far.includes(which), sideSign = V.side ? 1 : (which === 'R' ? 1 : -1);
  const shx = shoulderX(V, sideSign, far, u), shy = -7.75 * u + drop, a2 = a - b, ak = (which === 'L' ? o.armKL : o.armKR) ?? 1;
  return [shx + sideSign * (Math.cos(a) * 1.85 + Math.cos(a2) * 1.75) * u * ak, shy - (Math.sin(a) * 1.85 + Math.sin(a2) * 1.75) * u * ak];
}
// For props that leave the hand (a dropped rock, a handshake, a handover). Follows survivor()'s maths: view, arms,
// crouch, sit, flip, dx, dy, rot, sq.
function survivorHand(x, y, u, o, which) {
  let [lx, ly] = handLocal(u, o, which);
  const sq = bodySq(o);
  lx *= (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .55); ly *= (o.sy ?? 1) * (1 - sq);
  const r = o.rot || 0, c = Math.cos(r), s = Math.sin(r);
  return [x + (o.dx || 0) * u + lx * c - ly * s, y + bodyDy(o) * u + lx * s + ly * c];
}
// Two-bone IK in the body frame: the raw shoulder angle and elbow bend that put arm `which` (side views: +x forward)
// on the point (tx, ty). Spread the result into a survivor's options (rawArms must be on).
function reachArm(u, o, which, tx, ty, elbowDown = true) {
  const V = SV[o.view] || SV.front, far = V.far.includes(which), sideSign = V.side ? 1 : (which === 'R' ? 1 : -1);
  const drop = clamp(o.crouch || 0) * 1.2 * u + clamp(o.sit || 0) * 2.05 * u;
  const sx = shoulderX(V, sideSign, far, u), sy = -7.75 * u + drop;
  const dx = (tx - sx) * sideSign, dy = -(ty - sy), D = Math.hypot(dx, dy), ak = clamp(D / (3.6 * u * .97), 1, 1.3);   // out of reach: the arm stretches (up to 30%)
  const L1 = 1.85 * u * ak, L2 = 1.75 * u * ak, d = clamp(D, .2 * u, (L1 + L2) * .999);
  const th = Math.atan2(dy, dx), phi = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const a = th + (elbowDown ? -phi : phi), ex = L1 * Math.cos(a), ey = L1 * Math.sin(a), a2 = Math.atan2(dy * d / (D || 1) - ey, dx * d / (D || 1) - ex);
  return which === 'L' ? { aL: a, bendL: a - a2, armKL: ak } : { aR: a, bendR: a - a2, armKR: ak };
}

// The inverse: a world point in a survivor's body frame (for reachArm targets in the world).
function toBody(x, y, u, o, wx, wy) {
  const sq = bodySq(o), dx = wx - (x + (o.dx || 0) * u), dy = wy - (y + bodyDy(o) * u);
  const r = -(o.rot || 0), c = Math.cos(r), s = Math.sin(r);
  return [(dx * c - dy * s) / ((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .55)), (dx * s + dy * c) / ((o.sy ?? 1) * (1 - sq))];
}

// Where foot i is (0 = near/left leg, 1 = far/right), in the body frame: the ground point under the foot's middle.
function footLocal(u, o, i) {
  const V = SV[o.view] || SV.front, crouch = clamp(o.crouch || 0), st = clamp(o.sit || 0), hipY = -4.4 * u + crouch * 1.2 * u + st * 2.05 * u, side = i ? 1 : -1;
  const ph = o.walk != null ? (o.walk + (i ? .5 : 0)) * TAU : null;
  let swing = 0, lift = 0, knee = .08 + crouch * .9;
  if (ph != null) { if (V.side) { swing = Math.sin(ph) * .5; knee = Math.max(knee, Math.max(0, -Math.cos(ph)) * .75 + .05); } else { lift = Math.max(0, Math.sin(ph)) * .75; knee = Math.max(knee, lift * .9); } }
  const lk = clamp(i === 0 ? o.liftL || 0 : o.liftR || 0);
  if (lk > 0) { if (V.side) { swing = lerp(swing, -1.0, lk); knee = lerp(knee, 1.7, lk); } else { lift = lerp(lift, 1, lk); knee = lerp(knee, 1.2, lk); } }
  const hk = V.side ? clamp(i === 0 ? o.heelL || 0 : o.heelR || 0) : 0;
  if (hk > 0) { swing = lerp(swing, 1.13, hk); knee = lerp(knee, 1.47, hk); }
  const hx = (V.side ? side * .35 : side * .9) * u * V.torsoW, th = 2.05 * u, sh = 2.0 * u;
  const a1 = Math.PI / 2 + swing - (V.side ? knee * .5 : 0), kx = hx + Math.cos(a1) * th * (V.side ? 1 : 0) + (V.side ? 0 : side * knee * .25 * u), ky = hipY + Math.sin(a1) * th * (V.side ? 1 : 1 - lift * .25);
  const a2 = Math.PI / 2 + swing + (V.side ? knee : 0), ax = kx + Math.cos(a2) * sh * (V.side ? 1 : 0) - (V.side ? 0 : side * knee * .2 * u), ay = Math.min(-.25 * u, ky + Math.sin(a2) * sh * (V.side ? 1 : 1 - lift * .3));
  const ck = clamp(i === 0 ? o.clutchL || 0 : o.clutchR || 0);
  if (ck > 0) { const [, , cx, cy] = clutchLeg(u, hx, hipY, ck, kx, ky, ax, ay, V.side); return V.side ? [cx + .45 * u, cy + .02 * u] : [cx + (ck > .3 ? .2 * u : side * .12 * u), cy + .05 * u]; }
  if (hk > .3) return [ax - .35 * u, ay + .25 * u];   // the held-up foot's middle
  return V.side ? [ax + .45 * u, ay + .02 * u] : [ax + side * .12 * u, ay + .05 * u];
}
// A hurt leg pulled up (o.clutchL / o.clutchR 0..1): the knee comes up in front and the shin hangs under it, so the
// foot is held up clear of the body (in front of the standing leg), where the hands can grab the knee and the ankle.
function clutchLeg(u, hx, hipY, k, kx, ky, ax, ay, prof) {
  const K = prof ? [1.9 * u, hipY - .6 * u] : [hx + 2.3 * u, hipY - .1 * u], F = prof ? [2.55 * u, hipY + 1.25 * u] : [hx + 2.05 * u, hipY + 1.15 * u];
  return [lerp(kx, K[0], k), lerp(ky, K[1], k), lerp(ax, F[0], k), lerp(ay, F[1], k)];
}
// The same in the world (flip, dx, dy, rot, sq).
function survivorFoot(x, y, u, o, i) {
  let [lx, ly] = footLocal(u, o, i);
  const sq = bodySq(o);
  lx *= (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .55); ly *= (o.sy ?? 1) * (1 - sq);
  const r = o.rot || 0, c = Math.cos(r), s2 = Math.sin(r);
  return [x + (o.dx || 0) * u + lx * c - ly * s2, y + bodyDy(o) * u + lx * s2 + ly * c];
}
