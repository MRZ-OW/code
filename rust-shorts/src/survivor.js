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

  // ---------- neck and head (heads.js) ----------
  rs('head');
  survivorHead(u, sw, o, V, S, SB, gear, shY, drop, soot, rs);

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

// ---- soot (o.soot 0..1): patchy ash-grey smudges, kept off the eyes so the face still acts ----
function sootPatches(cx, cy, w, h, k, key, u) {
  for (let i = 0; i < 6; i++) {
    boilSeed('soot' + key + i);
    const x = cx + (hash(i * 7.3 + 1) - .5) * w * 1.6, y = cy + (hash(i * 3.1 + 5) - .5) * h * 1.6, r = (.45 + .5 * hash(i + 11)) * u;
    paint(ellPts(x, y, r * 1.3, r, 9, r * .35, hash(i) * 3), { wash: '#3E3D43', washOp: 150 * k, ink: null });
  }
  for (let i = 0; i < 2; i++) { const x = cx + (hash(i + 21) - .5) * w, y = cy + (hash(i + 31) - .5) * h; inkLine([[x - .3 * u, y], [x, y + .15 * u], [x + .25 * u, y - .1 * u]], .5, '#B7B4BC', 'inkfine', 0); }   // ash cracks
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
