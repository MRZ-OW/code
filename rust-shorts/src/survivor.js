// survivor.js: the Rust player, painted. A small cartoon human with a big head and short limbs. Naked by default, like a
// fresh spawn: light skin, bare feet and Rust's worn charcoal boxer briefs with a lighter waistband (reference: Facepunch
// devblog 193's underwear renders: mid-grey boxer briefs to mid-thigh, darker waistband). Dress it in gear with o.gear. It takes the same acting options as clawd(), so feel(),
// emotions(), move(), jump(), take() and stroll() all work on it.
//
//   survivor(x, y, u, o)   (x, y) = the ground point between the feet; u = unit. The figure is about 13.2u tall.
//
// Body-local coordinates (front view, before flip): feet y 0; hips (±.9u, -4.4u); waist y -5.15u; shoulders (±1.8u, -7.75u);
// head centre (0, -10.85u), radius 2.35u. +x is "forward" in the side and 3/4 views (they face right; flip faces left).
// Options:
//   pose:  dx, dy (in u), sq, rot, flip, sx, sy, view ('front' | 'q' | 'side' | 'back'), walk (leg phase), crouch 0..1,
//          aL, aR: arm angles. By default they're in clawd() units (.2 = rest) so emotion bodies work; rawArms: true
//          takes them as shoulder angles in radians (0 = straight out, + up, -1.35 = hanging). bendL, bendR: elbow bends.
//   face:  eyes, mouth, lookX, lookY, squint, blush, tint/tintK/tintMix (skin shifts with the mood), seed (blink timing)
//   look:  skin ('light' | 'tan' | 'brown' | 'dark' or {col, dk, lt}), hair ('short' | 'buzz' | 'bald' | 'messy' | 'bun'),
//          hairCol, beard ('full' | 'stubble' | null), briefs colour, gear (see GEAR below)
//   hooks: handL(u, sw, info), handR(u, sw, info): called at each hand in an upright body-local frame (+x = forward);
//          behind(u, sw, V), under(u, sw, V) (on the torso, under the arms), draw(u, sw, V) (on top), boilKey
//   emote, emoteK, emoteAge as in clawd()

const SKIN_TONES = {
  light: { col: '#F3C9A8', dk: '#D99F7E', lt: '#FBDCC4' },
  tan:   { col: '#DDA77C', dk: '#B87F57', lt: '#EDC19C' },
  brown: { col: '#A86E4A', dk: '#7E4F33', lt: '#C68C66' },
  dark:  { col: '#6E4630', dk: '#4E3022', lt: '#8C5E44' },
};
const HAIR_COLS = { brown: '#5B3D29', dark: '#2E2420', blond: '#C9A15A', ginger: '#A5552E', grey: '#8E8A86' };
const BRIEFS = { col: '#74726D', band: '#4B4A4E', scuff: '#8E8B84' };   // Rust's default underwear: worn mid-grey boxer briefs, dark waistband

// Emotion bodies were written for Clawd's little arm nubs (.2 = resting, 1.5 = straight up). A person's arms hang at rest.
const humanArm = a => a >= .2 ? -1.3 + 2.4 * Math.pow(clamp((a - .2) / 1.3, 0, 1.4), 1.6) : -1.3 + (a - .2) * .5;

// Per-view layout. fx/fw place the face (offset and width in u); torso width; which arms are near (in front) or far.
const SV = {
  front: { face: { cx: 0, fw: 1, eyes: [-1, 1] }, torsoW: 1, near: ['L', 'R'], far: [], ears: [-1, 1], side: false },
  q:     { face: { cx: .7, fw: .8, eyes: [-1, 1] }, torsoW: .86, near: ['L'], far: ['R'], ears: [-1], side: true },
  side:  { face: { cx: 1.15, fw: .55, eyes: [1] }, torsoW: .62, near: ['L'], far: ['R'], ears: [-.1], side: true },
  back:  { face: null, torsoW: 1, near: ['L', 'R'], far: [], ears: [-1, 1], side: false, back: true },
};

function skinCols(o) {
  const base = typeof o.skin === 'object' ? o.skin : (SKIN_TONES[o.skin] || SKIN_TONES.light);
  return tintCols({ ...o, col: base.col, dk: base.dk, lt: base.lt });
}

function survivor(x, y, u, o = {}) {
  const id = o.boilKey ?? ++CLAWD_N, rs = part => boilSeed(`surv ${id} ${part}`);
  const V = SV[o.view] || SV.front, view = SV[o.view] ? o.view : 'front';
  x += (o.dx || 0) * u;
  const dy = (o.dy || 0) * u, sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
  const sw = clamp(u / 16, .45, 2.4) * (o.swMul || 1);
  const S = skinCols(o), gear = o.gear || {}, crouch = clamp(o.crouch || 0);
  const aL = o.rawArms ? (o.aL ?? -1.32) : humanArm(o.aL ?? .2), aR = o.rawArms ? (o.aR ?? -1.32) : humanArm(o.aR ?? .2);
  const legC = mixCol(S.col, S.dk, .15);

  rs('shadow');
  if (!o.noShadow) { const f = 1 - Math.min(.5, Math.abs(o.dy || 0) * .05); paint(ellPts(x, y + u * .12, u * 2.9 * f, u * .55 * f, 20), { fill: PAL.ink, fillOp: 90, bleed: .25, tex: .3, border: .1, ink: null }); }
  if (sm > .05) smearTrail(x, y + dy, u * .8, { R: 3, L: -3 }, sm, o.smearDir ?? (o.flip ? -1 : 1), S.col);

  push();
  translate(x, y + dy);
  if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .55) * (1 + sm * .3), (o.sy ?? 1) * (1 - sq));
  if (o.behind) { rs('behind'); o.behind(u, sw, V); }

  const hipY = -4.4 * u + crouch * 1.2 * u;
  // ---------- legs ----------
  const leg = (side, i, far) => {
    rs('leg' + i);
    const ph = o.walk != null ? (o.walk + (i ? .5 : 0)) * TAU : null;
    let swing = 0, lift = 0, knee = .08 + crouch * .9;
    if (ph != null) {
      if (V.side) { swing = Math.sin(ph) * .5; knee = Math.max(knee, Math.max(0, -Math.cos(ph)) * .75 + .05); }
      else { lift = Math.max(0, Math.sin(ph)) * .75; knee = Math.max(knee, lift * .9); }
    }
    const hx = (V.side ? side * .35 : side * .9) * u * V.torsoW, hy = hipY, th = 2.05 * u, sh = 2.0 * u;
    const a1 = Math.PI / 2 + swing - (V.side ? knee * .5 : 0) * 1, kx = hx + Math.cos(a1) * th * (V.side ? 1 : 0) + (V.side ? 0 : side * knee * .25 * u), ky = hy + Math.sin(a1) * th * (V.side ? 1 : 1 - lift * .25);
    const a2 = Math.PI / 2 + swing + (V.side ? knee : 0) * 1, ax = kx + Math.cos(a2) * sh * (V.side ? 1 : 0) - (V.side ? 0 : side * knee * .2 * u), ay = Math.min(-.25 * u, ky + Math.sin(a2) * sh * (V.side ? 1 : 1 - lift * .3));
    const col = far ? mixCol(legC, S.dk, .45) : legC;
    if (gear.pants || gear.hazmat) {
      const pc = gear.hazmat ? '#D8B83C' : (gear.pantsCol || '#3D4248');
      paint(ribbon([[hx, hy], [kx, ky], [ax, ay]], 1.45 * u, 1.15 * u), { wash: far ? mixCol(pc, PAL.ink, .25) : pc, ink: PAL.ink, sw: sw * .8 });
    } else paint(ribbon([[hx, hy], [kx, ky], [ax, ay]], 1.2 * u, .95 * u), { wash: col, ink: PAL.ink, sw: sw * .8 });
    // foot (or boot)
    const boot = gear.boots || gear.hazmat, fcol = boot ? (gear.hazmat ? '#2E2B30' : '#6B4A30') : col;
    if (V.side) paint(ellPts(ax + .45 * u, ay + .02 * u, (boot ? 1.05 : .9) * u, .42 * u, 14, 0, swing * .3), { wash: far ? mixCol(fcol, PAL.ink, .25) : fcol, ink: PAL.ink, sw: sw * .7 });
    else paint(ellPts(ax + side * .12 * u, ay + .05 * u, (boot ? .82 : .7) * u, .4 * u, 14), { wash: fcol, ink: PAL.ink, sw: sw * .7 });
    return [[hx, hy], [kx, ky]];
  };
  const thighs = [];
  if (V.side) { thighs[1] = leg(1, 1, true); thighs[0] = leg(-1, 0, false); }
  else { thighs[0] = leg(-1, 0, false); thighs[1] = leg(1, 1, false); }

  // ---------- arms (far ones go behind the torso) ----------
  const arm = (which, far) => {
    rs('arm' + which);
    const sideSign = V.side ? 1 : (which === 'R' ? 1 : -1), a = which === 'L' ? aL : aR, b = (which === 'L' ? o.bendL : o.bendR) ?? (.22 + .55 * clamp((a + .6) / 1.6));   // raised arms bend in
    const shx = V.side ? (far ? .25 : -.15) * u : sideSign * 1.8 * u * V.torsoW, shy = -7.75 * u + crouch * 1.2 * u;
    const d1 = [sideSign * Math.cos(a), -Math.sin(a)], a2 = a - b, d2 = [sideSign * Math.cos(a2), -Math.sin(a2)];
    const ex = shx + d1[0] * 1.85 * u, ey = shy + d1[1] * 1.85 * u, hx = ex + d2[0] * 1.75 * u, hy = ey + d2[1] * 1.75 * u;
    const top = gear.hoodie || gear.hazmat, col = top ? (gear.hazmat ? '#D8B83C' : (gear.hoodieCol || '#A8382E')) : S.col;
    const w0 = (top ? 1.15 : .95) * u, RB = ribbon([[shx, shy], [ex, ey], [hx, hy]], w0, (top ? .95 : .78) * u);
    if (far) paint(RB, { wash: mixCol(col, PAL.ink, .28), ink: PAL.ink, sw: sw * .8 });
    else {   // a near arm grows out of a round shoulder: no outline across the joint
      const r = w0 * .55, a0 = V.side ? -Math.PI - .3 : -Math.PI / 2 - .35 * sideSign, a1 = V.side ? .3 : (sideSign > 0 ? .35 : -Math.PI - .35);
      paint(ellPts(shx, shy, r, r, 16), { wash: col, ink: null });
      inkLine(Array.from({ length: 11 }, (_, i) => { const t = lerp(a0, a1, i / 10); return [shx + Math.cos(t) * r, shy + Math.sin(t) * r]; }), sw * .8, PAL.ink, 'ink', 0);   // the shoulder's outer edge
      paint(RB, { wash: col, ink: null });
      const n = RB.length / 2, out = P => P.filter(p => Math.hypot(p[0] - shx, p[1] - shy) > w0 * .5);
      inkLine(out(RB.slice(0, n)), sw * .8, PAL.ink, 'ink', 0); inkLine(out(RB.slice(n)), sw * .8, PAL.ink, 'ink', 0);
    }
    const hand = gear.hazmat ? '#2E2B30' : (gear.gloves ? '#5A4A3A' : S.col);
    paint(ellPts(hx, hy, .55 * u, .55 * u, 14), { wash: far ? mixCol(hand, PAL.ink, .28) : hand, ink: PAL.ink, sw: sw * .7 });
    const hook = which === 'L' ? (o.handL || o.armL) : (o.handR || o.armR);
    if (hook) { push(); translate(hx, hy); hook(u, sw, { ang: Math.atan2(d2[1], d2[0]), side: sideSign, far }); pop(); }
  };
  for (const w of V.far) arm(w, true);

  // ---------- underwear (over the tops of the legs) ----------
  rs('briefs');
  const bw = 2.05 * u * V.torsoW, wy = -5.15 * u + crouch * 1.2 * u, briefsCol = o.briefs || BRIEFS.col;
  if (!gear.pants && !gear.hazmat) {
    // boxer legs to mid-thigh, then the seat, then the waistband
    for (const [h, k] of thighs) { const mx = lerp(h[0], k[0], .56), my = lerp(h[1], k[1], .56); paint(ribbon([h, [mx, my]], 1.38 * u, 1.36 * u), { wash: briefsCol, ink: PAL.ink, sw: sw * .7 }); }
    paint([[-bw, wy], [bw, wy], [bw * 1.02, hipY + .35 * u], [0, hipY + .55 * u], [-bw * 1.02, hipY + .35 * u]], { wash: briefsCol, ink: PAL.ink, sw: sw * .8, curv: .15 });
    paint(rectPts(-bw, wy, bw * 2, .42 * u, u * .02), { wash: BRIEFS.band, ink: PAL.ink, sw: sw * .55 });
    for (let k = 0; k < 3; k++) inkLine([[(-1.1 + k * .9) * u * V.torsoW, wy + (.85 + .25 * k) * u], [(-.7 + k * .9) * u * V.torsoW, wy + (1.05 + .2 * k) * u]], sw * .35, BRIEFS.scuff, 'inkfine', 0);
  }

  // ---------- torso ----------
  rs('torso');
  const tw = 2.1 * u * V.torsoW, shY = -8.35 * u + crouch * 1.2 * u;
  const torso = [[-tw * .88, wy + .1 * u], [tw * .88, wy + .1 * u], [tw * .98, wy - 1.4 * u], [tw, shY + .55 * u], [tw * .78, shY], [-tw * .78, shY], [-tw, shY + .55 * u], [-tw * .98, wy - 1.4 * u]];
  const topCol = gear.hazmat ? '#D8B83C' : gear.hoodie ? (gear.hoodieCol || '#A8382E') : S.col;
  paint(torso, { wash: topCol, ink: PAL.ink, sw: sw * .9, curv: .2 });
  if (!gear.hoodie && !gear.hazmat && !V.back) {   // a little anatomy so it reads as a bare chest
    const cx = V.side ? .6 * u : (view === 'q' ? .35 * u : 0);
    for (const s of V.side ? [1] : [-1, 1]) inkLine([[cx + s * .25 * u, shY + 1.15 * u], [cx + s * .95 * u, shY + 1.45 * u], [cx + s * 1.5 * u, shY + 1.15 * u]], sw * .45, S.dk, 'inkfine', .5);
    paint(ellPts(cx, wy - .55 * u, .11 * u, .14 * u, 8), { wash: S.dk, ink: null });
  }
  if (gear.hazmat && !V.back) { paint(rectPts(-tw * .5, shY + .6 * u, tw, .5 * u), { wash: '#4F83B8', ink: null }); }
  if (o.under) { rs('under'); o.under(u, sw, V); }
  if (gear.chest === 'metal') chestplateGear(u, sw, V, tw, shY, wy);
  if (gear.kilt === 'roadsign') roadsignKiltGear(u, sw, V, bw, wy);

  // ---------- neck and head ----------
  rs('head');
  const hcx = 0, hcy = -10.85 * u + crouch * 1.2 * u, R = 2.35 * u;
  paint(rectPts(-.5 * u, shY - .6 * u, 1.0 * u, .7 * u), { wash: mixCol(S.col, S.dk, .45), ink: null });
  if (gear.hazmat) paint(ellPts(hcx - .15 * u, hcy - .05 * u, R * 1.16, R * 1.1, 26), { wash: '#A82E22', ink: PAL.ink, sw: sw * .9 });   // the red hood around the head
  if (!gear.hazmat && !V.side) for (const e of V.ears) paint(ellPts(hcx + e * R * .98, hcy + .1 * u, .48 * u, .62 * u, 12), { wash: S.col, ink: PAL.ink, sw: sw * .6 });
  paint(ellPts(hcx, hcy, R, R * .98, 28, u * .02), { wash: gear.hazmat ? '#C0392B' : S.col, ink: PAL.ink, sw: sw * .9 });
  if (V.face && !gear.hazmat) faceOf(u, sw, o, V, S, hcx, hcy, R);
  if (!gear.hazmat) hairOf(u, sw, o, V, hcx, hcy, R);
  if (!gear.hazmat && V.side) {   // in profile and 3/4 the ear sits on the side of the head, over the hair
    const ex = hcx + (V === SV.q ? -.5 : -.1) * R, ey = hcy + .12 * u;
    paint(ellPts(ex, ey, .44 * u, .6 * u, 12), { wash: S.col, ink: PAL.ink, sw: sw * .6 });
    inkLine([[ex + .1 * u, ey - .3 * u], [ex - .14 * u, ey - .02 * u], [ex + .06 * u, ey + .26 * u]], sw * .4, S.dk, 'inkfine', .5);
  }
  if (gear.mask === 'metal' && !V.back) metalMaskGear(u, sw, V, hcx, hcy, R);
  if (gear.hazmat && !V.back) gasMaskGear(u, sw, V, hcx, hcy, R);

  for (const w of V.near) arm(w, false);
  if (o.draw) { rs('draw'); o.draw(u, sw, V); }
  pop();

  rs('emote');
  if (o.emote) {
    const top = EMOTE_TOP.includes(o.emote), dir = o.flip ? -1 : 1;
    emote(o.emote, x + dir * (top ? 0 : 2.9 * u), y + dy + (top ? -14.2 : -12.6) * u * (1 - sq), u * 1.05, o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');
}

// ---------- face ----------
function faceOf(u, sw, o, V, S, hcx, hcy, R) {
  const F = V.face, fx = hcx + F.cx * u, e = o.eyes || 'normal', kinds = Array.isArray(e) ? e : [e, e];
  const lx = (o.lookX || 0) * .22 * u, ly = (o.lookY || 0) * .2 * u, sq = clamp(o.squint || 0);
  // brows follow the mood of the eyes
  const browOf = k => ['angry', 'determined', 'red'].includes(k) ? 'angry' : ['sad', 'teary', 'cry', 'scared'].includes(k) ? 'worried' : ['wide', 'shine', 'spark', 'blank'].includes(k) ? 'up' : 'flat';
  if (o.blush) for (const s of F.eyes) paint(ellPts(fx + s * 1.25 * u * F.fw, hcy + .75 * u, .5 * u, .26 * u, 12), { fill: PAL.rose, fillOp: 170 * clamp(o.blush === true ? 1 : o.blush), bleed: .2, ink: null });
  EYE_INK = o.eyeCol || PAL.ink;
  for (const s of F.eyes) {
    const ex = fx + s * .85 * u * F.fw, ey = hcy - .05 * u, k = kinds[s < 0 ? 0 : 1];
    push(); translate(ex, ey); scale(.46 * F.fw + .04, .38);   // clawd.js eye moods, scaled down; the plain eyes are ovals
    if (sq > .8) inkLine([[-.8 * u, 0], [.8 * u, 0]], sw * 2.2, EYE_INK, 'ink', 0);
    else { if (sq > 0) scale(1, 1 - sq); humanEye(k, s, u, o, sw * 2.2); }
    pop();
    const b = browOf(k), by = ey - .78 * u - (b === 'up' ? .22 * u : 0), tilt = b === 'angry' ? .28 : b === 'worried' ? -.25 : 0;
    inkLine([[ex - .42 * u * F.fw, by - tilt * s * .5 * u], [ex + .42 * u * F.fw, by + tilt * s * .5 * u]], sw * .95, HAIR_COLS[o.hairCol] || o.hairCol || HAIR_COLS.brown, 'ink', 0);
  }
  EYE_INK = PAL.ink;
  // nose: a bump on the profile, a little hook in 3/4, a tick from the front
  if (V === SV.side) paint([[hcx + R * .9, hcy - .2 * u], [hcx + R * 1.09, hcy + .38 * u], [hcx + R * 1.0, hcy + .55 * u], [hcx + R * .88, hcy + .58 * u]], { wash: S.col, ink: PAL.ink, sw: sw * .45, curv: .4 });
  else if (V === SV.q) inkLine([[fx + .45 * u, hcy + .02 * u], [fx + .78 * u, hcy + .48 * u], [fx + .45 * u, hcy + .6 * u]], sw * .55, S.dk, 'inkfine', .5);
  else inkLine([[fx - .05 * u, hcy + .2 * u], [fx + .14 * u, hcy + .5 * u], [fx - .06 * u, hcy + .58 * u]], sw * .55, S.dk, 'inkfine', .5);
  // beard (under the mouth, so the mouth stays visible), then the mouth
  if (o.beard) beardOf(u, sw, o, V, hcx, hcy, R, fx);
  // clawd.js mouths sit at y -4.3u around their origin; scaled by MS, they land at the face's mouth line (hcy + 1.25u)
  const MS = .42;
  push(); translate(fx + (V.side ? .55 * u : 0), hcy + 1.25 * u + 4.3 * u * MS); scale(MS * F.fw + .08, MS); mouth(u, o.mouth, sw * 2.2); pop();
}
// The plain eyes are dark ovals with a glint (Clawd's are tall slits); every other mood uses clawd.js's eye shapes.
function humanEye(k, s, u, o, sw) {
  if (!['normal', 'look', 'wide'].includes(k)) return eye(k, s, u, o, sw);
  if (((T * .9 + (o.seed || 0) * 1.7) % 3.3) < .12) { inkLine([[-.75 * u, .3 * u], [.75 * u, .3 * u]], sw, EYE_INK, 'ink', 0); return; }
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
// A short full beard: sideburns into a jaw beard and chin, the top edge dipping under the mouth so it stays readable.
function beardOf(u, sw, o, V, hcx, hcy, R, fx) {
  const col = HAIR_COLS[o.hairCol] || o.hairCol || HAIR_COLS.brown;
  if (o.beard === 'stubble') { for (let i = 0; i < 14; i++) { const a = .5 + i / 13 * (Math.PI - 1), r = R * .8; paint(ellPts(hcx + Math.cos(a) * r * (V.side ? .45 : 1) + (V.side ? .9 * u : 0), hcy + .3 * u + Math.sin(a) * r * .75, .07 * u, .07 * u, 6), { wash: col, ink: null }); } return; }
  let P;
  if (V === SV.side) P = [...HR(hcx, hcy, R, [[.1, .26], [.2, .46], [.4, .6], [.56, .74], [.74, .78], [.88, .68]]),
    ...headArc(hcx, hcy, R, 1.05, .62, 1.95, 12, [.85, .1]), ...HR(hcx, hcy, R, [[-.26, .66], [-.02, .3]])];
  else if (V === SV.q) P = [...HR(hcx, hcy, R, [[-.26, .26], [-.18, .46], [0, .58], [.22, .7], [.4, .8], [.6, .8], [.76, .68], [.86, .5]]),
    ...headArc(hcx, hcy, R, 1.05, .55, 2.12, 14, [1.15, .1]), ...HR(hcx, hcy, R, [[-.45, .6], [-.36, .3]])];
  else {           // cheeks to chin: the top edge dips under the mouth, the bottom is a rounded chin
    const w = R * .9 * V.face.fw + .12 * u;
    P = [[fx - w, hcy + .35 * u], [fx - w * .72, hcy + 1.0 * u], [fx - w * .3, hcy + 1.62 * u], [fx, hcy + 1.72 * u], [fx + w * .3, hcy + 1.62 * u], [fx + w * .72, hcy + 1.0 * u], [fx + w, hcy + .35 * u]];
    for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; P.push([fx + Math.cos(a) * w * .98, hcy + .45 * u + Math.sin(a) * 2.05 * u]); }
  }
  paint(P, { wash: col, ink: PAL.ink, sw: sw * .6, curv: .3 });
}
// Hair. Front: a cap with a ragged fringe. 3/4 and profile: it covers the crown and the back of the head down to the
// nape, with a hairline over the ear and a sideburn in front of it. Back: all hair down to the nape.
function hairOf(u, sw, o, V, hcx, hcy, R) {
  const style = o.hair || 'short', col = HAIR_COLS[o.hairCol] || o.hairCol || HAIR_COLS.brown, look = { wash: col, ink: PAL.ink, sw: sw * .7, curv: style === 'buzz' ? .4 : .15 };
  if (style === 'bald') return;
  const r = style === 'buzz' ? 1.01 : style === 'messy' ? 1.1 : 1.05;
  if (V.back) { paint([...headArc(hcx, hcy, R, r, Math.PI - .62, TAU + .62, 22), ...HR(hcx, hcy, R, [[.45, .66], [0, .56], [-.45, .66]])], look); }
  else if (V.side) {
    const q = V === SV.q, m = style === 'messy' ? .08 : 0;
    const line = q ? [[-.62, .62], [-.7, .22], [-.62, -.26], [-.36, -.3], [-.26, -.14], [-.26, .28], [-.13, .26], [-.08, -.32], [.1, -.5 - m], [.24, -.43], [.4, -.58 - m], [.58, -.5], [.76, -.6]]
                   : [[-.5, .64], [-.38, .22], [-.26, -.28], [.04, -.3], [.12, -.15], [.13, .28], [.25, .25], [.28, -.3], [.44, -.5 - m], [.58, -.44], [.7, -.56 - m], [.82, -.5]];
    paint([...headArc(hcx, hcy, R, r, q ? -.72 : -.62, -Math.PI - (q ? .85 : .75), 18), ...HR(hcx, hcy, R, line)], look);
  } else {
    const P = [], a0 = Math.PI * 1.08, a1 = Math.PI * 1.92;
    for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; P.push([hcx + Math.cos(a) * R * r, hcy + Math.sin(a) * R * r]); }
    const fringe = style === 'messy' ? 6 : style === 'buzz' ? 2 : 4;
    for (let i = 0; i <= fringe; i++) { const fxx = lerp(hcx + R * .95, hcx - R * .95, i / fringe), up = (i % 2 ? .1 : .35) * u * (style === 'messy' ? 1.6 : 1); P.push([fxx, hcy - R * .52 + up]); }
    paint(P, look);
  }
  if (style === 'bun') paint(ellPts(hcx - R * (V.side ? .75 : .6), hcy - R * .95, .8 * u, .7 * u, 12), look);
}

// ---------- gear (reference: the in-game item icons) ----------
// Metal facemask: a welded steel plate with two eye holes, on a brown leather cap.
function metalMaskGear(u, sw, V, hcx, hcy, R) {
  const F = V.face || { cx: 0, fw: 1 }, fx = hcx + F.cx * u * .8;
  const cap = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * 1.02 + i / 14 * Math.PI * .96; cap.push([hcx + Math.cos(a) * R * 1.08, hcy + Math.sin(a) * R * 1.08]); }
  paint(cap, { wash: '#6E4A2E', ink: PAL.ink, sw: sw * .8 });
  const w = 1.85 * u * F.fw + .2 * u;
  paint([[fx - w, hcy - 1.25 * u], [fx + w, hcy - 1.25 * u], [fx + w * .95, hcy + 1.55 * u], [fx, hcy + 1.9 * u], [fx - w * .95, hcy + 1.55 * u]], { wash: '#9CA3A8', ink: PAL.ink, sw: sw * .85 });
  paint([[fx - w * .9, hcy - 1.15 * u], [fx - w * .2, hcy - 1.15 * u], [fx - w * .4, hcy + 1.5 * u], [fx - w * .85, hcy + 1.35 * u]], { wash: '#B9C0C4', washOp: 150, ink: null });
  for (const s of V.face ? V.face.eyes : [-1, 1]) { const ex = fx + s * .85 * u * F.fw; paint(rrPts(ex - .32 * u, hcy - .4 * u, .64 * u, .42 * u, .15 * u), { wash: '#1E1B22', ink: PAL.ink, sw: sw * .4 }); paint(ellPts(ex + .05 * u, hcy - .2 * u, .1 * u, .1 * u, 6), { wash: '#F2E6D0', ink: null }); }
  for (const [rx, ry] of [[-.8, -1], [.8, -1], [-.8, 1.3], [.8, 1.3]]) paint(ellPts(fx + rx * w, hcy + ry * u, .12 * u, .12 * u, 6), { wash: '#5E656B', ink: null });
}
function gasMaskGear(u, sw, V, hcx, hcy, R) {
  const F = V.face, fx = hcx + F.cx * u;
  paint(ellPts(fx, hcy + .2 * u, 1.9 * u * F.fw + .3 * u, 1.75 * u, 20), { wash: '#2E2B30', ink: PAL.ink, sw: sw * .8 });
  for (const s of F.eyes) { paint(ellPts(fx + s * .8 * u * F.fw, hcy - .3 * u, .55 * u * F.fw + .1 * u, .5 * u, 14), { wash: '#7FA9B8', ink: PAL.ink, sw: sw * .5 }); paint(ellPts(fx + s * .8 * u * F.fw - .15 * u, hcy - .45 * u, .14 * u, .12 * u, 8), { wash: '#DDEEF2', ink: null }); }
  paint(ellPts(fx + (V.side ? .9 : 0) * u, hcy + 1.25 * u, .65 * u, .55 * u, 14), { wash: '#4A464E', ink: PAL.ink, sw: sw * .6 });
}
// Metal chestplate: a steel vest with brown leather straps and buckles.
function chestplateGear(u, sw, V, tw, shY, wy) {
  paint([[-tw * .82, shY + .4 * u], [tw * .82, shY + .4 * u], [tw * .92, wy - .2 * u], [-tw * .92, wy - .2 * u]], { wash: '#9BA2A7', ink: PAL.ink, sw: sw * .8 });
  paint([[-tw * .7, shY + .55 * u], [-tw * .1, shY + .55 * u], [-tw * .25, wy - .4 * u], [-tw * .78, wy - .4 * u]], { wash: '#C2C8CC', washOp: 120, ink: null });
  for (const s of [-1, 1]) { paint(rectPts(s * tw * .55 - .3 * u, shY - .1 * u, .6 * u, 1.2 * u), { wash: '#7A5032', ink: PAL.ink, sw: sw * .5 }); paint(rectPts(s * tw * .92 - .2 * u, shY + 1.8 * u, .4 * u, 1.4 * u), { wash: '#7A5032', ink: PAL.ink, sw: sw * .5 }); }
  paint(rectPts(-.25 * u, wy - 1.0 * u, .5 * u, .35 * u), { wash: '#C9B27A', ink: PAL.ink, sw: sw * .4 });
}
// Roadsign kilt: road-sign panels on a leather belt.
function roadsignKiltGear(u, sw, V, bw, wy) {
  const cols = ['#3E6FB8', '#E8E4DA', '#5E8A6E', '#3E6FB8'];
  for (let i = 0; i < 4; i++) {
    const x0 = lerp(-bw * 1.08, bw * 1.08, i / 4), x1 = lerp(-bw * 1.08, bw * 1.08, (i + 1) / 4);
    paint([[x0, wy + .2 * u], [x1, wy + .2 * u], [x1 + (i - 1.5) * .12 * u, wy + 2.2 * u], [x0 + (i - 1.5) * .12 * u, wy + 2.3 * u]], { wash: cols[i], ink: PAL.ink, sw: sw * .6 });
    if (cols[i] !== '#E8E4DA') inkLine([[lerp(x0, x1, .25), wy + 1.1 * u], [lerp(x0, x1, .75), wy + 1.1 * u]], sw * .9, '#F2EFE6', 'ink', 0);
  }
  paint(rectPts(-bw * 1.1, wy - .05 * u, bw * 2.2, .45 * u), { wash: '#6E4A2E', ink: PAL.ink, sw: sw * .6 });
}
