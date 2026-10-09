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
//          behind(u, sw, V), under(u, sw, V) (on the torso, under the arms), lap(u, sw, V) (over the body, gear and head,
//          under the arms: a rifle across the lap), draw(u, sw, V) (on top), boilKey
//   emote, emoteK, emoteAge as in clawd()
// GEAR (o.gear): hoodie (+ hoodieCol), pants (+ pantsCol), boots, gloves (burlap, fingerless), hazmat, scientist (variant
// key), mask, chest, kilt. Suit colours come from gear.js (HAZ, SCI, suitCols); this file draws the body under them:
// sleeves, trouser legs, gloves, boots, tape and folds on the limbs.

const SKIN_TONES = {
  light: { col: '#F3C9A8', dk: '#D99F7E', lt: '#FBDCC4' },
  tan:   { col: '#DDA77C', dk: '#B87F57', lt: '#EDC19C' },
  brown: { col: '#A86E4A', dk: '#7E4F33', lt: '#C68C66' },
  dark:  { col: '#6E4630', dk: '#4E3022', lt: '#8C5E44' },
};
const HAIR_COLS = { brown: '#5B3D29', dark: '#2E2420', blond: '#C9A15A', ginger: '#A5552E', grey: '#8E8A86' };
// The hero's underwear: Rust's Purple Underwear (the first Twitch drop), the default boxer-brief cut in Twitch purple
// with a darker waistband, a darker hem at the leg cuffs and one soft fold down the front.
const BRIEFS = { col: '#8C55E6', band: '#4F2C93', scuff: '#B08CF2', hem: '#6E3FC0', fold: '#7A45D0' };

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

// Where each shoulder is (body frame x): profile both near the middle; 3/4 the near one on the torso's back edge (the arm
// overlaps the edge) and the far one far enough forward that its outer edge shows past the chest; front and back at the
// torso's edges.
// a: the shoulder angle, when known. A near 3/4 arm raised above the shoulder moves its joint back toward the torso's
// back corner (up to .45u), so a raised arm grows out of a shoulder, not out from under the chin and beard.
const svRaise = (V, far, a) => V === SV.q && !far && a != null ? .45 * clamp(Math.sin(a) / .8) : 0;
const shoulderX = (V, sideSign, far, u, a = null) => V === SV.q ? (far ? 1.35 : -1.1 - svRaise(V, far, a)) * u : V.side ? (far ? .25 : -.15) * u : sideSign * 1.8 * u * V.torsoW;
// A seated body keeps its seat (no upward bob) and squashes half as much. Shared by survivor() and its helpers.
const bodySq = o => ((o.sq || 0) + (o.take || 0)) * (1 - .5 * clamp(o.sit || 0));
const bodyDy = o => (o.dy || 0) < 0 ? (o.dy || 0) * (1 - clamp(o.sit || 0)) : (o.dy || 0);
function skinCols(o) {
  const base = typeof o.skin === 'object' ? o.skin : (SKIN_TONES[o.skin] || SKIN_TONES.light);
  return tintCols({ ...o, col: base.col, dk: base.dk, lt: base.lt });
}

// ---------- small drawing helpers (sv*: survivor body only) ----------
// The same hue, k darker (for far limbs and folds: never toward grey or ink).
const svShade = (c, k) => { const n = parseInt(c.slice(1), 16), f = v => Math.round(v * (1 - k)); return '#' + ((1 << 24) + (f((n >> 16) & 255) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1); };
const svAlong = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
// A quad from c0 to c1, w0 wide at c0 and w1 at c1 (boot shafts, cuffs, tape on a limb).
function svQuad(c0, c1, w0, w1 = w0) {
  const dx = c1[0] - c0[0], dy = c1[1] - c0[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  return [[c0[0] + nx * w0 / 2, c0[1] + ny * w0 / 2], [c1[0] + nx * w1 / 2, c1[1] + ny * w1 / 2], [c1[0] - nx * w1 / 2, c1[1] - ny * w1 / 2], [c0[0] - nx * w0 / 2, c0[1] - ny * w0 / 2]];
}
// Suit colours: gear.js's suitCols() when it's there; fallbacks so nothing breaks while gear.js changes.
function svSuit(gear) {
  if (!gear.hazmat && !gear.scientist) return null;
  let c = null;
  try { if (typeof suitCols === 'function') c = suitCols(gear); } catch (e) { c = null; }
  if (gear.hazmat) {
    const suit = (c && c.suit) || HAZ.suit;
    return { suit, dk: (c && c.dk) || HAZ.suitDk || svShade(suit, .2), glove: (c && c.glove) || [HAZ.gloveA || '#2A2729', HAZ.gloveB || '#4F86C8'],
      boot: HAZ.boot || '#2F3529', tape: HAZ.tape || '#A9ADAB', band: HAZ.bootBand || '#D6B23A', patch: HAZ.patch || '#4F7FC0' };
  }
  const raw = SCI[gear.scientist] || SCI.peacekeeper, suit = (c && c.suit) || (typeof raw === 'object' ? raw.suit || raw.col : raw);
  const dkT = typeof SCI_DK === 'object' && SCI_DK[gear.scientist], dk = (c && c.dk) || dkT || svShade(suit, .28);
  // the scientists' gloves and boots are the suit's own colour, darker (hazmatsuit_scientist_* icons)
  return { suit, dk, glove: [svShade(dk, .12), svShade(dk, .12)], boot: svShade(dk, .3), ring: '#B98A3E' };
}

// ---------- feet ----------
// Foot shapes in a local frame: the ankle at (0, 0), +x = toes, the sole at y ≈ +.4 (units of u). The washed shape runs up
// inside the leg (hiding the leg's end); only the outline from the leg's back edge round to its front edge is inked.
const FOOT_SIDE = [[-.34, -.42], [-.5, -.12], [-.55, .14], [-.46, .33], [-.26, .41], [.65, .41], [.98, .38], [1.12, .28], [1.1, .14], [.96, .06], [.66, -.03], [.44, -.15], [.26, -.42]];
const FOOT_SIDE_INK = [[-.48, -.16], [-.55, .12], [-.47, .32], [-.26, .41], [.65, .41], [.98, .38], [1.12, .28], [1.1, .14], [.96, .06], [.66, -.03], [.47, -.13]];
const FOOT_FRONT = [[-.42, -.55], [.42, -.55], [.5, -.25], [.64, .02], [.84, .22], [.84, .4], [0, .46], [-.84, .4], [-.84, .22], [-.64, .02], [-.5, -.25]];
const FOOT_FRONT_INK = [[-.47, -.42], [-.53, -.17], [-.67, .04], [-.85, .23], [-.8, .41], [0, .46], [.8, .41], [.85, .23], [.67, .04], [.53, -.17], [.47, -.42]];
// Boots: the upper (a shaft painted over it hides its top), then the sole.
const BOOT_SIDE = [[-.56, -.5], [-.64, -.05], [-.64, .3], [1.06, .3], [1.2, .18], [1.14, -.02], [.92, -.14], [.62, -.22], [.52, -.5]];
const BOOT_SIDE_SOLE = [[-.68, .26], [1.22, .26], [1.24, .38], [1.18, .46], [-.64, .46], [-.7, .38]];
const BOOT_FRONT = [[-.94, .3], [.94, .3], [.92, .06], [.72, -.14], [.42, -.27], [0, -.31], [-.42, -.27], [-.72, -.14], [-.92, .06]];
const BOOT_FRONT_SOLE = [[-1.0, .26], [1.0, .26], [1.0, .46], [-1.0, .46]];
const U1 = (u, P, k = 1) => P.map(([a, b]) => [a * u * k, b * u]);
// How a foot sits: profile shape or front mound, and its rotation about the ankle. Shared by the drawing and footLocal.
function svFootPose(V, o, st, hk, ck, swing, kx, ky, ax, ay) {
  const shinA = Math.atan2(ay - ky, ax - kx);
  if (V.side && o.legsOut && st > .5) return { prof: true, rot: shinA - 1.0 };   // heel down, toes up but laid over a little (straight up, the two feet read as prongs)
  if (V.side && hk > .3) return { prof: true, rot: shinA - Math.PI / 2 };       // sole up, toes down behind him
  if (V.side) return { prof: true, rot: swing * .3 };
  if (ck > .3) return { prof: true, rot: .25 };                                 // the hurt foot, held up
  return { prof: false, rot: 0 };
}
// Crouched in 3/4 or profile, both legs bend forward from near the middle and merge into one shape: the far leg (i 1)
// kneels a little further forward, so its knee and shin show past the near one (its own shade and outline separate them).
const svStagger = (V, i, crouch, u) => V.side && i === 1 ? .55 * u * clamp(crouch * 1.6) : 0;
// The middle of the foot (local), rotated into the body frame: what footLocal returns.
function svFootMid(pose, side, u) {
  const m = pose.prof ? [.3 * u, .05 * u] : [side * .06 * u, .05 * u], c = Math.cos(pose.rot), s = Math.sin(pose.rot);
  return [m[0] * c - m[1] * s, m[0] * s + m[1] * c];
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
  const SC = svSuit(gear), suit = SC ? SC.suit : null;
  const aL = o.rawArms ? (o.aL ?? -1.32) : humanArm(o.aL ?? .2), aR = o.rawArms ? (o.aR ?? -1.32) : humanArm(o.aR ?? .2);
  const heavy = gear.scientist === 'heavy', legW = heavy ? [1.75 * u, 1.4 * u] : [1.45 * u, 1.15 * u];   // trouser legs (the heavy suit is padded)
  const legC = mixCol(SB.col, SB.dk, .15), farSkin = mixCol(SB.col, SB.dk, .6);   // far limbs: the same skin, in shade

  staticSeed(`surv ${id} shadow`);   // the soft shadow keeps its shape (a re-rolled watercolour bleed shimmers under the feet)
  if (!o.noShadow) { const f = 1 - Math.min(.5, Math.abs(o.dy || 0) * .05); paint(ellPts(x, y + u * .12, u * 2.9 * f, u * .55 * f, 20), { fill: PAL.ink, fillOp: 90, bleed: .25, tex: .3, border: .1, ink: null }); }
  if (sm > .05) smearTrail(x, y + dy, u * .8, { R: 3, L: -3 }, sm, o.smearDir ?? (o.flip ? -1 : 1), SB.col);

  push();
  translate(x, y + dy);
  if (o.rot) rotate(o.rot);
  scale((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .55) * (1 + sm * .3), (o.sy ?? 1) * (1 - sq));
  if (o.behind) { rs('behind'); o.behind(u, sw, V); }

  const st = clamp(o.sit || 0), drop = crouch * 1.2 * u + st * 2.05 * u;   // crouching bends the knees; sitting drops the hips to seat height
  const hipY = -4.4 * u + drop;

  // ---------- a foot, bare or booted ----------
  const foot = (i, side, far, pose, kx, ky, ax, ay, skinCol) => {
    const sd = (() => { const dx = ax - kx, dy2 = ay - ky, l = Math.hypot(dx, dy2) || 1; return [dx / l, dy2 / l]; })();   // down the shin
    const kind = gear.hazmat ? 'haz' : gear.scientist ? 'sci' : gear.boots ? 'boot' : 'bare';
    const P = pts => { const c = Math.cos(pose.rot), s = Math.sin(pose.rot); return pts.map(([a, b]) => { const px = (pose.prof ? a : a + side * .06) * u, py = b * u; return [ax + px * c - py * s, ay + px * s + py * c]; }); };
    if (kind === 'bare') {
      paint(P(pose.prof ? FOOT_SIDE : FOOT_FRONT), { wash: skinCol, ink: null, curv: .3 });
      inkLine(P(pose.prof ? FOOT_SIDE_INK : FOOT_FRONT_INK), sw * .7, PAL.ink, 'ink', .5);
      const tc = mixCol(SB.dk, PAL.ink, .4);
      if (pose.prof) inkLine(P([[.9, .2], [.95, .34]]), sw * .35, tc, 'inkfine', 0);   // the big toe
      else if (!V.back) for (const tx of [-.2, .12, .42]) inkLine(P([[side * tx, .45], [side * tx, .27]]), sw * .42, tc, 'inkfine', 0);   // toes (the big toe on the inside)
      return;
    }
    // boots: Chad's brown leather lace-ups with a rolled grey sock (shoes.boots); the hazmat's olive-black rubber boots,
    // yellow tape on one (hazmatsuit); the scientists' boots in the suit's own colour, darker
    const bc0 = kind === 'boot' ? '#6B4A30' : SC.boot, bc = far ? svShade(bc0, .14) : bc0;
    const soleC = far ? svShade('#2A2422', .1) : '#2A2422', H = (kind === 'boot' ? 1.0 : kind === 'haz' ? 1.25 : 1.15) * u, wSh = Math.max(1.26 * u, legW[1] + .1 * u), wTop = wSh + (kind === 'haz' ? .16 : .1) * u;
    const top = [ax - sd[0] * H, ay - sd[1] * H], low = [ax + sd[0] * .12 * u, ay + sd[1] * .12 * u];
    paint(P(pose.prof ? BOOT_SIDE : BOOT_FRONT), { wash: bc, ink: PAL.ink, sw: sw * .7, curv: .25 });
    const Q = svQuad(low, top, wSh, wTop);
    paint(Q, { wash: bc, ink: null });
    // the shaft's sides start where the boot's own outline ends (not down inside the boot, where their ends would show)
    const Qs = svQuad([ax - sd[0] * .42 * u, ay - sd[1] * .42 * u], top, wSh, wTop);
    inkLine([Qs[1], Qs[0]], sw * .7, PAL.ink, 'ink', 0); inkLine([Qs[2], Qs[3]], sw * .7, PAL.ink, 'ink', 0);
    const sole = pose.prof ? BOOT_SIDE_SOLE.map(([a, b]) => kind === 'haz' ? [a < 0 ? a - .06 : a + .06, b < .3 ? b - .03 : b + .02] : [a, b]) : BOOT_FRONT_SOLE.map(([a, b]) => [a * (kind === 'haz' ? 1.08 : 1), b]);
    paint(P(sole), { wash: soleC, ink: PAL.ink, sw: sw * .55 });
    const fwd = V.side ? [sd[1], -sd[0]] : [0, 0], at = (k, off) => [ax - sd[0] * k * H + fwd[0] * off, ay - sd[1] * k * H + fwd[1] * off], nrm = [-sd[1], sd[0]];
    const across = (k, w) => { const c = at(k, 0); return [[c[0] - nrm[0] * w / 2, c[1] - nrm[1] * w / 2], [c[0] + nrm[0] * w / 2, c[1] + nrm[1] * w / 2]]; };
    inkLine(across(.28, 1.0 * u), sw * .35, svShade(bc, .35), 'inkfine', .5);   // a crease at the ankle
    if (kind === 'boot') {
      if (!V.back) {   // the laces up the front
        const lo = V.side ? .42 * u : 0, lc = svShade(bc, .5);
        for (const k of [.3, .55, .8]) { const c = at(k, lo), hw = (V.side ? .16 : .24) * u; inkLine([[c[0] - nrm[0] * hw, c[1] - nrm[1] * hw], [c[0] + nrm[0] * hw, c[1] + nrm[1] * hw]], sw * .4, lc, 'inkfine', 0); }   // three short rungs (no centre line)
      }
      const sk = far ? svShade('#A9AAA6', .14) : '#A9AAA6';   // the rolled grey sock over the top
      paint(svQuad([top[0] + sd[0] * .1 * u, top[1] + sd[1] * .1 * u], [top[0] - sd[0] * .26 * u, top[1] - sd[1] * .26 * u], wTop * 1.04, wTop * .98), { wash: sk, ink: PAL.ink, sw: sw * .5, curv: .3 });
      inkLine(across(1.08, .8 * u), sw * .3, svShade(sk, .3), 'inkfine', .5);
    } else {
      inkLine([Q[1], Q[2]], sw * .55, PAL.ink, 'ink', 0);   // the boot's mouth
      if (kind === 'haz' && i === 0) for (const k of [.62, .82]) paint(svQuad(at(k - .07, 0), at(k + .07, 0), wTop * .97), { wash: far ? svShade(SC.band, .14) : SC.band, ink: null });   // yellow tape bands
    }
  };

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
    const stag = svStagger(V, i, crouch, u); kx += stag; ax += stag;
    const col = far ? mixCol(legC, SB.dk, .45) : st > .5 ? mixCol(legC, SB.dk, .55) : legC;   // seated legs sit in the body's shade
    if (gear.pants || suit) {
      const pc0 = suit || (gear.pantsCol || '#3D4248'), pc = far ? svShade(pc0, .14) : pc0;
      paint(limb([hx, hy], [kx, ky], [ax, ay], legW[0], legW[1]), { wash: pc, ink: PAL.ink, sw: sw * .8, curv: .15 });
      if (gear.hazmat) {   // the baggy hazmat legs: grey tape on one knee and thigh, a blue patch on the other shin, folds at the knees
        const tA = Math.atan2(ky - hy, kx - hx), dir = a => [Math.cos(a), Math.sin(a)], tape = far ? svShade(SC.tape, .14) : SC.tape;
        const patch = (c, a, l, w) => { const d = dir(a); return svQuad([c[0] - d[0] * l / 2, c[1] - d[1] * l / 2], [c[0] + d[0] * l / 2, c[1] + d[1] * l / 2], w, w * .92); };
        if (i === 0) {
          paint(patch([kx, ky + .05 * u], tA + .35, .48 * u, .8 * u), { wash: tape, ink: null });
          paint(patch(svAlong([hx, hy], [kx, ky], .42), tA - 1.1, .3 * u, .9 * u), { wash: tape, washOp: 230, ink: null });
        } else {
          const c = svAlong([kx, ky], [ax, ay], .17), P = []; for (let j = 0; j < 9; j++) { const a = j / 9 * TAU, r = (.26 + .08 * hash(j * 3.7 + 1)) * u; P.push([c[0] + Math.cos(a) * r * 1.15, c[1] + Math.sin(a) * r * .8]); }
          paint(P, { wash: far ? svShade(SC.patch, .14) : SC.patch, washOp: 210, ink: null, curv: .3 });
        }
        const fc = svShade(pc, .28), sA = Math.atan2(ay - ky, ax - kx);
        for (const [pp, a, k] of [[svAlong([hx, hy], [kx, ky], .82), tA, .38], [svAlong([kx, ky], [ax, ay], .14), sA, .3]]) { const n = [-Math.sin(a), Math.cos(a)], d = dir(a); inkLine([[pp[0] - n[0] * k * u, pp[1] - n[1] * k * u], [pp[0] + d[0] * .08 * u, pp[1] + d[1] * .08 * u], [pp[0] + n[0] * k * u * .9, pp[1] + n[1] * k * u * .9 - .04 * u]], sw * .45, fc, 'inkfine', .5); }
      }
      if (gear.scientist && typeof suitLimbGear === 'function') suitLimbGear(u, sw, gear, 'leg', [hx, hy], [kx, ky], [ax, ay], far, i === 0 ? 'L' : 'R');   // camo, the heavy suit's knee plates (gear.js)
    } else paint(limb([hx, hy], [kx, ky], [ax, ay], 1.2 * u, .95 * u), { wash: col, ink: PAL.ink, sw: sw * (st > .5 ? .9 : .8), curv: .15 });
    foot(i, side, far, svFootPose(V, o, st, hk, ck, swing, kx, ky, ax, ay), kx, ky, ax, ay, col);
    return [[hx, hy], [kx, ky]];
  };
  const thighs = [];
  if (V.back && st > .5) { const hx = .9 * u; thighs[0] = [[-hx, hipY], [-hx, hipY + .3 * u]]; thighs[1] = [[hx, hipY], [hx, hipY + .3 * u]]; }   // seated, seen from behind: the legs are out in front of him
  else if (V.side) { thighs[1] = leg(1, 1, true); thighs[0] = leg(-1, 0, false); }
  else if (o.clutchL > 0) { thighs[1] = leg(1, 1, false); thighs[0] = leg(-1, 0, false); }   // the held-up leg crosses in front
  else { thighs[0] = leg(-1, 0, false); thighs[1] = leg(1, 1, false); }

  // ---------- arms ----------
  // armGeom() (below) solves each arm in the body's own 3D frame and projects it for this view: shoulder, elbow and hand,
  // and which parts lie behind the torso. A far arm (3/4, profile) is drawn behind the body; when it reaches across the
  // front (farFront), its upper arm stays behind and only the forearm is laid over the body. A hand put behind the back
  // (handBackL / handBackR) draws its whole arm behind the torso. Everything else is drawn over the body, after the head.
  const AG = { L: armGeom(u, o, 'L'), R: armGeom(u, o, 'R') };
  const arm = (which, part) => {   // part: 'all' | 'upper' (the shoulder to the elbow only) | 'fore' (the elbow to the hand)
    rs('arm' + which + part);
    const G = AG[which], sideSign = G.sideSign, [shx, shy] = G.S, [ex, ey] = G.E, [hx, hy] = G.H;
    const d2 = G.d2, d1 = (() => { const dx = ex - shx, dy2 = ey - shy, l = Math.hypot(dx, dy2) || 1; return [dx / l, dy2 / l]; })();
    const top = gear.hoodie || suit, col0 = top ? (suit || (gear.hoodieCol || '#A8382E')) : SB.col;
    // Tones: an arm in front of the body is a step darker than the chest (so an arm laid over the torso separates from it,
    // fully outlined on both sides); one behind the body is in shade; a far forearm laid over the front sits between.
    const back = G.far ? part !== 'fore' : G.back ? part === 'fore' : false, shade = back;
    const col = back ? (top ? svShade(col0, .14) : farSkin) : part === 'fore' && G.far ? (top ? svShade(col0, .1) : mixCol(SB.col, SB.dk, .4)) : (top ? svShade(col0, .07) : mixCol(SB.col, SB.dk, .26));
    const w0 = (heavy ? 1.45 : top ? 1.15 : .95) * u, w1 = (heavy ? 1.2 : top ? .95 : .78) * u, wm = (w0 + w1) / 2;
    const mid = (P, Q) => [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2];
    // Each piece is ONE closed silhouette inked as one stroke (limbLoop: a round shoulder cap, a round elbow outside and a
    // crease inside), so no outline ends or doubled lines show inside the limb. Folded tight (the forearm back over the
    // upper arm on screen), the upper arm is its own shape with a round elbow and the forearm is laid over it.
    const turn = Math.acos(clamp(d1[0] * d2[0] + d1[1] * d2[1], -1, 1));
    if (part === 'upper') paint(limbLoop([shx, shy], mid([shx, shy], [ex, ey]), [ex, ey], w0, wm, true), { wash: col, ink: PAL.ink, sw: sw * .8 });
    else if (part === 'fore') paint(limbLoop([ex, ey], mid([ex, ey], [hx, hy]), [hx, hy], wm, w1), { wash: col, ink: PAL.ink, sw: sw * .8 });
    else if (turn > 2.2) {
      paint(limbLoop([shx, shy], mid([shx, shy], [ex, ey]), [ex, ey], w0, wm, true), { wash: col, ink: PAL.ink, sw: sw * .8 });
      paint(limbLoop([ex, ey], mid([ex, ey], [hx, hy]), [hx, hy], wm, w1), { wash: col, ink: PAL.ink, sw: sw * .8 });
    } else paint(limbLoop([shx, shy], [ex, ey], [hx, hy], w0, w1), { wash: col, ink: PAL.ink, sw: sw * .8 });
    if (part === 'upper') return;
    if (gear.hazmat && part === 'all') {   // a baggy fold at the elbow
      const n = [-d1[1], d1[0]], fc = svShade(col, .28), c = [ex - d1[0] * .3 * u, ey - d1[1] * .3 * u];
      inkLine([[c[0] - n[0] * .4 * u, c[1] - n[1] * .4 * u], [c[0] + d1[0] * .1 * u, c[1] + d1[1] * .1 * u], [c[0] + n[0] * .35 * u, c[1] + n[1] * .35 * u]], sw * .45, fc, 'inkfine', .5);
    }
    if (gear.scientist && typeof suitLimbGear === 'function') suitLimbGear(u, sw, gear, 'arm', [shx, shy], [ex, ey], [hx, hy], shade, which);
    // hands: bare, burlap gloves (fingerless), the hazmat's black gauntlet (his right) and blue glove, the scientists' gloves
    const kind = gear.hazmat ? (which === (V.back ? 'R' : 'L') ? 'gauntlet' : 'glove') : gear.scientist ? 'sci' : gear.gloves ? 'burlap' : 'bare';
    const hand0 = gear.hazmat ? SC.glove[kind === 'gauntlet' ? 0 : 1] : gear.scientist ? SC.glove[0] : gear.gloves ? '#6B4A32' : null;
    // a bare hand is the arm's own skin tone (never lighter or darker than its wrist); gloves keep their colour, in shade behind
    const hc = kind === 'bare' ? (top ? (shade ? farSkin : part === 'fore' && G.far ? mixCol(SB.col, SB.dk, .4) : mixCol(SB.col, SB.dk, .26)) : col) : shade ? svShade(hand0, .14) : hand0;
    const open = which === 'L' ? o.openL : o.openR, fingers = shade ? farSkin : SB.col;   // the finger stubs out of a fingerless glove
    const wr = k => [hx - d2[0] * k * u, hy - d2[1] * k * u];   // a point k u back up the forearm from the hand
    const small = u < 26, detC = kind === 'bare' ? mixCol(SB.dk, PAL.ink, .15) : svShade(hc, .45);
    // The hand is washed whole, then inked round its outside only: never across the wrist (a line there reads as a ring or
    // a cuff) and never as several overlapping outlines (they pile up into a dark blob on a small hand).
    const handShape = (P, swk) => { paint(P, { wash: hc, ink: null, curv: .25 }); inkLine(P.slice(1, -1), sw * swk, PAL.ink, 'ink', .25); };
    const fist = () => {
      if (!open) {
        // a fist: a rounded mitten along the forearm, the knuckles at its end, the thumb wrapped over the forward side
        const fwd = V.side ? [1, -.35] : [-sideSign, -.35], ts = (-d2[1] * fwd[0] + d2[0] * fwd[1]) >= 0 ? 1 : -1;
        push(); translate(hx, hy); rotate(Math.atan2(d2[1], d2[0])); scale(1, ts);
        const F = [[-.3, -.36], [-.05, -.42], [.3, -.42], [.52, -.32], [.62, -.1], [.6, .14], [.5, .3], [.36, .44], [.12, .5], [-.1, .44], [-.3, .38]].map(([a, b]) => [a * u, b * u]);
        handShape(F, small ? .5 : .55);
        if (!small) {
          if (kind === 'burlap') for (let f = 0; f < 3; f++) { const fy = (-.28 + f * .2) * u; paint(rrPts(.3 * u, fy, .3 * u, .17 * u, .08 * u), { wash: fingers, ink: null }); }   // finger stubs over the grip
          inkLine([[.36 * u, .34 * u], [.18 * u, .2 * u], [-.04 * u, .2 * u]], sw * .35, detC, 'inkfine', .5);   // the thumb's edge over the fingers
        }
        pop();
        return;
      }
      // an open palm, fingers spread along the forearm, thumb out to the side: ONE silhouette with one outline. Small hands
      // are a mitten: the four fingers as one rounded block, the thumb out.
      const fa = Math.atan2(d2[1], d2[0]), mitten = small, ts = sideSign;
      const Hh = [[-.42, .43], [.42, .43]];
      const thumb = sd => sd > 0 ? [[.5, .12], [.8, .0], [.88, -.1], [.8, -.2], [.5, -.16]] : [[-.5, -.16], [-.8, -.2], [-.88, -.1], [-.8, .0], [-.5, .12]];
      Hh.push([.5, .3]); if (ts > 0) Hh.push(...thumb(1)); Hh.push([.48, -.32]);
      if (mitten) Hh.push([.42, -.78], [.2, -.9], [-.2, -.9], [-.42, -.78]);
      else for (let f = 3; f >= 0; f--) {
        const fx = -.36 + f * .24, tip = -.25 - (f === 1 || f === 2 ? .62 : .5);
        if (f < 3) Hh.push([fx + .12, -.4]);   // the valley between two fingers
        Hh.push([fx + .1, tip + .08], [fx + .05, tip], [fx - .05, tip], [fx - .1, tip + .08]);
      }
      Hh.push([-.48, -.32]); if (ts < 0) Hh.push(...thumb(-1)); Hh.push([-.5, .3]);
      push(); translate(hx, hy); rotate(fa + Math.PI / 2);
      const P = Hh.map(([a, b]) => [a * u, b * u]);
      paint(P, { wash: hc, ink: null }); inkLine(P.slice(1), sw * (mitten ? .5 : .55), PAL.ink, 'ink', 0);   // not across the wrist
      if (kind === 'burlap' && !mitten) for (const f of [0, 3]) { const fx = (-.36 + f * .24) * u; paint(rrPts(fx - .07 * u, -.7 * u, .14 * u, .25 * u, .06 * u), { wash: fingers, ink: null }); }   // bare fingertips out of the fingerless glove
      pop();
    };
    // cuffs on the forearm (before the hook, so a held prop sits over them)
    if (gear.hoodie) paint(svQuad(wr(.5), wr(.76), w1 * 1.06), { wash: shade ? svShade('#9A9C98', .14) : '#9A9C98', ink: PAL.ink, sw: sw * .45 });   // the grey ribbed hoodie cuff: a flat band
    if (kind === 'gauntlet') {   // the black rubber gauntlet: flares to 1.2u, 1.3u up the forearm, a grey tape band
      const gw = k => lerp(w1 * 1.02, 1.3 * u, Math.pow((k - .2) / 1.35, 1.6));   // its width k u up the forearm
      const gn = [-d2[1], d2[0]], ks = [.2, .6, 1.0, 1.3, 1.55], gside = s => ks.map(k => { const c = wr(k); return [c[0] + gn[0] * s * gw(k) / 2, c[1] + gn[1] * s * gw(k) / 2]; });
      paint(gside(1).concat(gside(-1).reverse()), { wash: hc, ink: PAL.ink, sw: sw * .6, curv: .1 });
      paint(svQuad(wr(.32), wr(1.4), .16 * u, .3 * u).map(([px, py]) => [px - d2[1] * .22 * u * sideSign, py + d2[0] * .22 * u * sideSign]), { wash: mixCol(hc, '#8A8A90', .35), washOp: 170, ink: null });   // rubber sheen
      paint(svQuad(wr(1.0), wr(1.24), gw(1.0) * .97, gw(1.24) * .97), { wash: shade ? svShade(SC.tape, .14) : SC.tape, ink: null });   // grey tape
      const rim = svQuad(wr(1.52), wr(1.55), gw(1.55));
      inkLine([rim[1], rim[2]], sw * .5, '#4A4648', 'inkfine', 0);   // the open top
    } else if (kind === 'glove') paint(svQuad(wr(.2), wr(.75), w1 * 1.02, w1 * 1.1), { wash: hc, ink: PAL.ink, sw: sw * .55 });   // the blue glove's short cuff
    else if (kind === 'sci') {
      paint(svQuad(wr(.2), wr(.68), w1 * 1.02, w1 * 1.06), { wash: hc, ink: PAL.ink, sw: sw * .55 });
      paint(svQuad(wr(.48), wr(.7), w1 * 1.12), { wash: shade ? svShade(SC.ring, .14) : SC.ring, ink: PAL.ink, sw: sw * .35 });   // the brass wrist ring
    } else if (kind === 'burlap') paint(svQuad(wr(.2), wr(.55), w1 * .98, w1 * 1.02), { wash: hc, ink: PAL.ink, sw: sw * .5 });
    const hook = which === 'L' ? (o.handL || o.armL) : (o.handR || o.armR);
    if (!(hook && o.handOver)) fist();
    if (hook) { push(); translate(hx, hy); hook(u, sw, { ang: Math.atan2(d2[1], d2[0]), side: sideSign, far: G.far && !G.front }); pop(); if (o.handOver) fist(); }   // handOver: the fist wraps a grip
  };
  // behind the torso: the far arms (only the upper arm of one reaching across the front) and any hand behind the back
  for (const w of V.far) arm(w, AG[w].front ? 'upper' : 'all');
  for (const w of V.near) if (AG[w].back) arm(w, 'fore');   // a near hand behind the back: the forearm goes behind, the upper arm stays in front

  // ---------- underwear (over the tops of the legs) ----------
  rs('briefs');
  const tw = 2.1 * u * V.torsoW, shY = -8.35 * u + drop;
  const bw = 2.05 * u * V.torsoW, wy = -5.15 * u + drop, briefsCol = o.briefs || BRIEFS.col;
  const prof = V.side, wt = tw * .9, bh = 2.0 * u * V.torsoW, fcx = view === 'q' ? .35 * u : 0;   // waist and hip half-widths; the front centre
  const custom = briefsCol !== BRIEFS.col, BR = { band: custom ? mixCol(briefsCol, PAL.ink, .4) : BRIEFS.band, hem: custom ? svShade(briefsCol, .2) : BRIEFS.hem, fold: custom ? svShade(briefsCol, .12) : BRIEFS.fold };
  if (gear.pants || suit) {
    const pc = suit || (gear.pantsCol || '#3D4248');
    const lo = Math.max(wt * .95, (V.side ? .35 : .9) * u * V.torsoW + legW[0] / 2);   // the waist as wide as the torso, the hips as wide as the legs (not a kilt)
    paint([[-wt, wy], [wt, wy], [lo, hipY + .35 * u], [0, hipY + .6 * u], [-lo, hipY + .35 * u]], { wash: pc, ink: PAL.ink, sw: sw * .8, curv: .15 });
  } else {
    // boxer legs from the hip line to mid-thigh (the cuff square to the thigh, a darker hem), then the seat over their tops
    for (const [h, k] of (prof ? [...thighs].reverse() : thighs)) {   // the far leg first
      if (!h) continue;
      const m = svAlong(h, k, .68); if (!prof) m[1] = Math.max(m[1], hipY + .62 * u);   // a seated front view foreshortens the thigh
      const dx = k[0] - h[0], dy2 = prof ? k[1] - h[1] : Math.max(.05 * u, k[1] - h[1]), l = Math.hypot(dx, dy2) || 1, n = [-dy2 / l * .66 * u, dx / l * .66 * u];
      const s = Math.sign(h[0]) || 1, nw = lerp(bh * .95, .7 * u, Math.abs(dx / l)), nb = [-dy2 / l * nw, dx / l * nw];   // 3/4 and profile: the top spans the hip, square to the thigh (toward the back/seat is +nb); a level (seated) thigh only its own depth
      const T0 = prof ? [h[0] - nb[0], hipY + .1 * u - nb[1]] : [s * bh, hipY + .3 * u], T1 = prof ? [h[0] + nb[0], hipY + .1 * u + nb[1]] : [s * .1 * u, hipY + .58 * u];
      let c1 = [m[0] + n[0], m[1] + n[1]], c2 = [m[0] - n[0], m[1] - n[1]];
      if (Math.hypot(c1[0] - T1[0], c1[1] - T1[1]) > Math.hypot(c2[0] - T1[0], c2[1] - T1[1])) [c1, c2] = [c2, c1];
      paint([T0, T1, c1, c2], { wash: briefsCol, ink: PAL.ink, sw: sw * .7, curv: .1 });
      const d = [dx / l, dy2 / l];
      paint(svQuad([m[0] - d[0] * .15 * u, m[1] - d[1] * .15 * u], [m[0] - d[0] * .03 * u, m[1] - d[1] * .03 * u], 1.34 * u), { wash: BR.hem, ink: null });   // the hem
    }
    if (!prof) {
      paint([[-wt, wy - .05 * u], [wt, wy - .05 * u], [bh, hipY + .34 * u], [0, hipY + .72 * u], [-bh, hipY + .34 * u]], { wash: briefsCol, ink: null, curv: .15 });
      for (const s of [-1, 1]) inkLine([[s * wt, wy], [s * (wt + bh) * .52, (wy + hipY) / 2 + .1 * u], [s * bh, hipY + .32 * u]], sw * .8, PAL.ink, 'ink', .5);
      if (!V.back) inkLine([[fcx + .42 * u, wy + .3 * u], [fcx + .4 * u, wy + .8 * u], [fcx + .14 * u, hipY + .52 * u]], sw * .45, BR.fold, 'inkfine', .5);   // one soft fold down the front
      else inkLine([[0, wy + .3 * u], [0, hipY + .55 * u]], sw * .4, BR.fold, 'inkfine', 0);   // the seat seam
    } else {   // 3/4 and profile: the seat curves out behind (+x is forward)
      const back = [[-wt, wy - .12 * u], [-bh - .15 * u, hipY - .02 * u], [-bh * .9, hipY + .34 * u]], front = [[wt, wy], [bh, hipY + .12 * u], [bh * .92, hipY + .36 * u]];
      paint([...front, [0, hipY + .52 * u], ...[...back].reverse()], { wash: briefsCol, ink: null, curv: .3 });
      inkLine(back, sw * .8, PAL.ink, 'ink', .5); inkLine(front, sw * .8, PAL.ink, 'ink', .5);
      if (view === 'q') inkLine([[fcx + .45 * u, wy + .3 * u], [fcx + .45 * u, wy + .8 * u], [fcx + .2 * u, hipY + .5 * u]], sw * .45, BR.fold, 'inkfine', .5);
    }
  }

  // ---------- torso ----------
  rs('torso');
  // round shoulders (a square corner showed past the 3/4 view's round shoulder cap)
  const torso = [[-tw * .88, wy + .1 * u], [tw * .88, wy + .1 * u], [tw * .98, wy - 1.4 * u], [tw, shY + .62 * u], [tw * .95, shY + .22 * u], [tw * .8, shY + .02 * u], [-tw * .8, shY + .02 * u], [-tw * .95, shY + .22 * u], [-tw, shY + .62 * u], [-tw * .98, wy - 1.4 * u]];
  const topCol = suit || (gear.hoodie ? (gear.hoodieCol || '#A8382E') : SB.col);
  paint(torso, { wash: topCol, ink: PAL.ink, sw: sw * .9, curv: .2 });
  if (!gear.hoodie && !suit && !V.back) {   // a little anatomy so it reads as a bare chest
    const cx = view === 'side' ? .2 * u : view === 'q' ? .25 * u : 0, reach = tw * .82 - Math.abs(cx);   // pec lines end inside the torso
    for (const s of view === 'side' ? [1] : [-1, 1]) { const L = Math.min(1.5 * u, reach) * (view === 'q' && s < 0 ? .8 : 1); inkLine([[cx + s * .2 * u, shY + 1.15 * u], [cx + s * (.2 * u + (L - .2 * u) * .55), shY + 1.45 * u], [cx + s * L, shY + 1.15 * u]], sw * .45, SB.dk, 'inkfine', .5); }
    paint(ellPts(cx + (view === 'side' ? .5 * u : 0), wy - .55 * u, .11 * u, .14 * u, 8), { wash: SB.dk, ink: null });
  }
  if (soot > 0 && !suit && !gear.hoodie) sootPatches(0, (shY + wy) / 2, tw * .8, (wy - shY) * .42, soot, 'torso' + (o.boilKey || ''), u);
  if (!gear.pants && !suit) {   // the waistband, over the torso's bottom edge: a slight dip at the front centre, higher at the back
    rs('band');
    const fc = prof ? (view === 'side' ? wt : wt * .7) : 0, Tp = [], Bt = [];
    for (let k = 0; k <= 12; k++) {
      const bx = lerp(-wt, wt, k / 12), up = prof ? .1 * u * (1 - k / 12) : 0, dip = V.back ? 0 : .07 * u * Math.exp(-Math.pow((bx - fc) / (.8 * u), 2));
      Tp.push([bx, wy - .22 * u - up + dip]); Bt.push([bx, wy + .2 * u - up * .6 + dip]);
    }
    paint(Tp.concat(Bt.reverse()), { wash: BR.band, ink: PAL.ink, sw: sw * .55, curv: .2 });
  }
  if (gear.hoodie) { rs('hood'); svHood(u, sw, V, view, gear.hoodieCol || '#A8382E', shY); }
  if (gear.hazmat) hazmatBodyGear(u, sw, V, tw, shY, wy);
  if (gear.scientist) scientistBodyGear(u, sw, V, tw, shY, wy, bw, gear);
  if (o.under) { rs('under'); o.under(u, sw, V); }
  if (gear.chest === 'metal') chestplateGear(u, sw, V, tw, shY, wy);
  if (gear.kilt === 'roadsign') roadsignKiltGear(u, sw, V, bw, wy);

  // ---------- neck and head (heads.js) ----------
  rs('head');
  survivorHead(u, sw, o, V, S, SB, gear, shY, drop, soot, rs);
  if (o.lap) { rs('lap'); o.lap(u, sw, V); }   // a prop over the body and gear (a rifle across the lap), under the arms and hands

  for (const w of V.far) if (AG[w].front) arm(w, 'fore');   // a far forearm laid over the body, under the near arm and what it holds
  for (const w of V.near) arm(w, AG[w].back ? 'upper' : 'all');
  if (gear.hazmat) hazmatCapeOver(u, sw, o, V, shY);   // gear.js: the hood's cape over the tops of the sleeves
  if (o.draw) { rs('draw'); o.draw(u, sw, V); }
  pop();

  rs('emote');
  if (o.emote) {
    const top = EMOTE_TOP.includes(o.emote), dir = o.flip ? -1 : 1;
    emote(o.emote, x + dir * (top ? 0 : 2.9 * u) + (o.emoteDx || 0) * u, y + dy + drop + (top ? -15.4 : -12.8) * u * (1 - sq) + (o.emoteDy || 0) * u, u * 1.05, o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');
}

// ---- the hoodie's hood, bunched behind the neck (hoodie icon: the hoodie's colour outside, grey lining). Drawn before the
// head, which covers its middle; it shows round the neck and on the shoulders (from behind, it hangs down the back).
function svHood(u, sw, V, view, col, shY) {
  const pr = view === 'side', q = view === 'q', bx = pr ? -1.0 * u : q ? -.5 * u : 0, hw = (pr ? 1.25 : q ? 1.6 : 1.85) * u, low = V.back ? 1.6 * u : .5 * u;
  const P = [[bx - hw, shY + .3 * u], [bx - hw * 1.05, shY - .35 * u], [bx - hw * .72, shY - 1.0 * u], [bx - hw * .1, shY - 1.2 * u], [bx + hw * .55, shY - 1.08 * u], [bx + hw * 1.04, shY - .4 * u], [bx + hw * .96, shY + .3 * u], [bx + hw * .2, shY + low]];
  paint(P, { wash: col, ink: PAL.ink, sw: sw * .8, curv: .35 });
  const dk = svShade(col, .3);
  inkLine([[bx - hw * .78, shY - .55 * u], [bx - hw * .55, shY - .05 * u]], sw * .4, dk, 'inkfine', .5);   // folds, not mirrored
  inkLine([[bx + hw * .7, shY - .7 * u], [bx + hw * .62, shY - .25 * u], [bx + hw * .7, shY + .1 * u]], sw * .4, dk, 'inkfine', .5);
  if (V.back) { inkLine([[0, shY - .9 * u], [.05 * u, shY + 1.3 * u]], sw * .4, dk, 'inkfine', .5); return; }
  if (pr) return;
  const lx = q ? .55 * u : 0, lw = q ? .95 * u : 1.15 * u;   // the grey lining round the front of the neck
  inkLine(through([[lx - lw, shY - .25 * u], [lx - lw * .55, shY + .22 * u], [lx, shY + .38 * u], [lx + lw * .55, shY + .22 * u], [lx + lw, shY - .25 * u]], 5), sw * 2.2, '#9A9C98', 'ink', 0);
}

// ---- soot (o.soot 0..1): irregular ash-grey smudges with no outline, at uneven spots and sizes so no two pair up ----
function sootPatches(cx, cy, w, h, k, key, u) {
  const SMUDGE = [[-.62, -.5, .78, .3], [.38, .18, .56, 2.1], [.74, -.82, .3, 1.0], [-.18, .86, .44, 4.0], [-.9, .62, .26, 5.2]];
  SMUDGE.forEach(([px, py, r0, rot], i) => {
    boilSeed('soot' + key + i);
    const x = cx + px * w, y = cy + py * h, r = r0 * u, P = [];
    for (let j = 0; j < 12; j++) { const a = rot + j / 12 * TAU, rr = r * (.62 + .5 * hash(i * 17.3 + j * 2.9)); P.push([x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr * (.7 + .25 * hash(i + 4))]); }
    paint(P, { wash: '#4A4850', washOp: 110 * k, ink: null, curv: .5 });
    paint(ellPts(x + (hash(i + 9) - .5) * r * .6, y + (hash(i + 2) - .5) * r * .4, r * .5, r * .3, 9, r * .12, rot), { wash: '#34333A', washOp: 70 * k, ink: null });
  });
}
// ---------- the arm, solved in the body's own 3D frame ----------
// The pose options (aL/bendL/armKL..., or reachArm's result) say where the HAND goes on screen: they're aimed with a 2D
// two-bone arm from shoulderX(), as every scene was authored. Everything else is worked out here, the same way in every
// view and facing, so an arm can't come out wrong whatever it's asked for:
//   1. the body frame: X across the body (+ = his R arm's side, which is screen right in the front view), y down, Z forward.
//      Each view is the body turned by a yaw (front 0, qf .3, q .62 as the head turns, side 90°; back = front seen from
//      behind). The shoulder sockets sit at the sides of the chest (X ±1.72u, a little behind its middle).
//   2. the hand's depth: the point along the view ray nearest a relaxed hand at its own side; a hand that would be inside
//      the torso or hips goes to their surface (in front for a near arm, behind for a far one, unless farFront, or for any
//      hand put behind the back with handBackL / handBackR).
//   3. hands are kept out of the crotch: a hand between the waist and mid-thigh, in front of the hips (not reaching well
//      forward, not seated or crouched), slides out to beside the hip and thigh (freeHands: true turns that off).
//   4. the elbow is a hinge: of the circle of elbow points that join the shoulder to the hand, the one nearest a pole out,
//      back and down from the shoulder (so the point of the elbow faces back or out and down, never forward or inward,
//      and the forearm folds only toward the front), swung round just far enough to keep the arm out of the torso.
//   5. projection and layering: a far arm (3/4 and profile) is behind the body. One that would only show as a sliver past
//      the chest is tucked fully behind it. With farFront and its hand in front of the chest, its forearm is drawn over
//      the body and its upper arm stays behind.
// Returns body-frame screen points (before flip/scale, in px) S (shoulder), E (elbow), H (hand), d2 (the forearm's unit
// direction), and far / front / back flags for the drawing.
const ARM_L1 = 1.85, ARM_L2 = 1.75, ARM_SX = 1.72, ARM_SZ = -.15;
const svYaw = V => V === SV.side ? Math.PI / 2 : V === SV.q ? .62 : V === SV.qf ? .3 : 0;
// the body's cross-section (half width X, half depth Z, in u) at height y (body frame, u), or null above the shoulders
// and below mid-thigh
const svBodyEll = (y, dr) => { const yy = y - dr; return yy < -8.45 || yy > -3.2 ? null : yy < -5.1 ? [2.0, 1.2] : [1.95, 1.15]; };
function armGeom(u, o, which) {
  const V = SV[o.view] || SV.front, far = V.far.includes(which), sideSign = V.side ? 1 : (which === 'R' ? 1 : -1), s = which === 'R' ? 1 : -1;
  const dr = clamp(o.crouch || 0) * 1.2 + clamp(o.sit || 0) * 2.05, ys = -7.75 + dr;
  const a = o.rawArms ? (which === 'L' ? o.aL ?? -1.32 : o.aR ?? -1.32) : humanArm(which === 'L' ? o.aL ?? .2 : o.aR ?? .2);
  const b = (which === 'L' ? o.bendL : o.bendR) ?? (.22 + .55 * clamp((a + .6) / 1.6)), ak0 = (which === 'L' ? o.armKL : o.armKR) ?? 1;
  // where the pose puts the hand (u, body frame)
  let x = shoulderX(V, sideSign, far, 1, a) + sideSign * (Math.cos(a) * ARM_L1 + Math.cos(a - b) * ARM_L2) * ak0, y = ys - (Math.sin(a) * ARM_L1 + Math.sin(a - b) * ARM_L2) * ak0;
  const th = svYaw(V), c = Math.cos(th), sn = Math.sin(th), zs = V.back ? -1 : 1;
  const toV = (X, Z) => [X * c + Z * zs * sn, Z * zs * c - X * sn];   // body (X, Z) → screen x and depth w (+ = toward us)
  const toB = (px, w) => [px * c - w * sn, (px * sn + w * c) * zs];
  const S = [s * ARM_SX, ys, ARM_SZ], [xs, ws] = toV(S[0], S[2]);
  const back = !!(which === 'L' ? o.handBackL : o.handBackR), wantFront = !back && (!far || !!o.farFront);
  // the hand's depth
  let w = toV(s * 1.95, .35)[1];
  const E0 = svBodyEll(y, dr);
  if (E0) {
    const A = E0[0] + .4, C = E0[1] + .4, qa = sn * sn / (A * A) + c * c / (C * C), qb = 2 * x * c * sn * (1 / (C * C) - 1 / (A * A)), qc = x * x * (c * c / (A * A) + sn * sn / (C * C)) - 1, disc = qb * qb - 4 * qa * qc;
    if (disc > 0) {
      const r1 = (-qb - Math.sqrt(disc)) / (2 * qa), r2 = (-qb + Math.sqrt(disc)) / (2 * qa);
      if (w > r1 && w < r2) w = wantFront ? r2 : r1;
      else if (back && w >= r2) w = r1;
    }
  }
  let [X, Z] = toB(x, w);
  // no hand in front of the briefs
  if (!o.freeHands && !back) {
    const yy = y - dr, kY = clamp((yy + 5.3) / .35) * clamp((-2.3 - yy) / .4), kS = (1 - clamp(o.sit || 0)) * (1 - .85 * clamp(o.crouch || 0)), kZ = 1 - clamp((Z - 1.4) / .6), k = kY * kS * kZ;
    if (k > 0) { X = lerp(X, s * Math.max(s * X, 2.3), k); Z = lerp(Z, Math.min(Z, .45), k); }
  }
  [x, w] = toV(X, Z);
  // in reach (the depth gives way first; then the arm stretches up to 10% more than asked, then the hand is pulled in)
  let ak = ak0;
  const reach = k => (ARM_L1 + ARM_L2) * k * .995;
  if (Math.hypot(x - xs, y - ys, w - ws) > reach(ak)) {
    const d2 = Math.hypot(x - xs, y - ys);
    if (d2 < reach(ak)) w = ws + Math.sign(w - ws) * Math.sqrt(reach(ak) ** 2 - d2 * d2);
    else {
      w = ws; ak = Math.min(ak * 1.1, d2 / reach(1));
      if (d2 > reach(ak)) { x = xs + (x - xs) * reach(ak) / d2; y = ys + (y - ys) * reach(ak) / d2; }
    }
    [X, Z] = toB(x, w);
  }
  // an arm hanging down is never locked dead straight: it lengthens a hair (up to 6%) to keep a soft bend at the elbow
  { const D3 = Math.hypot(x - xs, y - ys, w - ws), down = clamp(((y - ys) / (D3 || 1) - .6) / .3), rt = lerp(.995, .955, down);
    if (D3 > rt * (ARM_L1 + ARM_L2) * ak) ak = Math.min(ak * 1.06, D3 / (rt * (ARM_L1 + ARM_L2))); }
  // the elbow
  const H = [X, y, Z], L1 = ARM_L1 * ak, L2 = ARM_L2 * ak;
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]], dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const nz = p => { const l = Math.hypot(p[0], p[1], p[2]) || 1; return [p[0] / l, p[1] / l, p[2] / l]; };
  const dv = sub(H, S), D0 = Math.hypot(dv[0], dv[1], dv[2]), n = D0 > 1e-6 ? nz(dv) : [0, 1, 0], D = clamp(D0, Math.abs(L1 - L2) + .05, L1 + L2 - .001);
  const cd = (L1 * L1 - L2 * L2 + D * D) / (2 * D), r = Math.sqrt(Math.max(0, L1 * L1 - cd * cd)), C0 = [S[0] + n[0] * cd, S[1] + n[1] * cd, S[2] + n[2] * cd];
  const perp = p => { const k = dot(p, n); return [p[0] - k * n[0], p[1] - k * n[1], p[2] - k * n[2]]; };
  const P1 = perp([s * .55, .45, -.7]), P2 = perp([s * .25, 1, .15]);
  const e1 = nz([P1[0] + .3 * P2[0], P1[1] + .3 * P2[1], P1[2] + .3 * P2[2]]), e2 = [n[1] * e1[2] - n[2] * e1[1], n[2] * e1[0] - n[0] * e1[2], n[0] * e1[1] - n[1] * e1[0]];
  const elbowAt = f => [C0[0] + r * (Math.cos(f) * e1[0] + Math.sin(f) * e2[0]), C0[1] + r * (Math.cos(f) * e1[1] + Math.sin(f) * e2[1]), C0[2] + r * (Math.cos(f) * e1[2] + Math.sin(f) * e2[2])];
  const inBody = p => { const E = svBodyEll(p[1], dr); if (!E) return 0; const q = 1 - Math.hypot(p[0] / (E[0] - .15), p[2] / (E[1] - .15)); return q > 0 ? q * q : 0; };
  const cost = f => {
    const E = elbowAt(f), at = (P, Q, t) => [lerp(P[0], Q[0], t), lerp(P[1], Q[1], t), lerp(P[2], Q[2], t)];
    return f * f + 60 * (inBody(at(S, E, .6)) + inBody(at(S, E, .85)) + inBody(E) + inBody(at(E, H, .35)) + inBody(at(E, H, .7)));
  };
  let bf = 0, bc = cost(0);
  if (r > 1e-4 && bc > 1e-9) {
    const N = 90; for (let i = 1; i < N; i++) { const f = -Math.PI + i * TAU / N, cc = cost(f); if (cc < bc - 1e-9) { bc = cc; bf = f; } }
    const h = TAU / N, cm = cost(bf - h), cp = cost(bf + h), den = cm - 2 * bc + cp;   // a parabola through the best sample and its neighbours
    if (den > 1e-9) bf += clamp(.5 * h * (cm - cp) / den, -h, h);
  }
  const E = elbowAt(bf);
  // project
  const [Sx, Sw] = toV(S[0], S[2]), [Ex, Ew] = toV(E[0], E[2]);
  let Hx = x, Exx = Ex;
  // the far arm (3/4 and profile): in front of the chest only when it reaches across with farFront; otherwise behind it,
  // and tucked in when it would only peek out past the chest as a sliver
  const front = far && !!o.farFront && Z > 1.0;
  if (far && !front) {
    const p = Math.max(Ex, Hx) + .45 - 2.1 * V.torsoW, kk = clamp((Math.min(E[1], y) - (ys - .3)) / .8);
    const tuck = (p < .3 ? Math.max(0, p + .1) : lerp(.4, 0, clamp((p - .3) / .4))) * kk;
    Hx -= tuck; Exx -= tuck;
  }
  const fl = Math.hypot(Hx - Exx, y - E[1]) || 1;
  return { S: [Sx * u, ys * u], E: [Exx * u, E[1] * u], H: [Hx * u, y * u], d2: [(Hx - Exx) / fl, (y - E[1]) / fl], wS: Sw, wE: Ew, wH: w, ak, far, front, back: back && !far, sideSign };
}
// Where a survivor's hand is, in its upright body frame (before flip, scale and rotation).
function handLocal(u, o, which) { return armGeom(u, o, which).H; }
// Named hand placements, worked out in the body's 3D frame for whatever view o is in, as reachArm options to spread into
// a survivor's options (rawArms on): survivor(x, y, u, { ...o, ...armPose(u, o, 'L', 'hip') }). k blends from the current
// pose (0) to the named one (1). Seated and crouched bodies are followed. Names:
//   hang, hip (hand on the side of the hip, elbow out), belly, chest, shoulder (the opposite shoulder), fold (folded arms:
//   the hand tucked by the other elbow), hold (both hands together at the chest: a rock, a can), forward (reaching ahead at
//   shoulder height), point (up and forward), raise (straight up), head (on the side of the head: the cartoon head is
//   too big for a hand to reach its top), face (a hand at the chin),
//   back (behind the back: also sets handBackL/R), knee (seated: on the knee), lap (seated: in the lap).
const ARM_POSES = {
  hang: [2.2, -4.45, .35], hip: [2.25, -5.05, .1], belly: [.55, -6.0, 1.45], chest: [-.2, -7.0, 1.55], shoulder: [-1.15, -7.75, 1.25],
  fold: [-.3, -6.15, 1.6], hold: [.45, -6.7, 1.9], forward: [1.4, -7.6, 3.4], point: [1.9, -12.0, 1.8], raise: [2.0, -12.6, .2],
  head: [2.0, -11.3, .45], face: [.35, -9.2, 2.6], back: [-.35, -5.15, -1.5], knee: [1.0, -4.05, 2.1], lap: [.5, -4.7, 1.6],
};
function armPose(u, o, which, name, k = 1) {
  const p = ARM_POSES[name]; if (!p) return {};
  const V = SV[o.view] || SV.front, th = svYaw(V), zs = V.back ? -1 : 1, s = which === 'R' ? 1 : -1;
  const dr = clamp(o.crouch || 0) * 1.2 + clamp(o.sit || 0) * 2.05, X = s * p[0], Y = p[1] + dr + (name === 'fold' && which === 'R' ? .4 : 0), Z = p[2] + (name === 'fold' && which === 'R' ? .15 : 0);   // folded: his R forearm lies just under and in front of the L
  const r = reachArm(u, o, which, (X * Math.cos(th) + Z * zs * Math.sin(th)) * u, Y * u), key = which === 'L' ? ['aL', 'bendL', 'armKL'] : ['aR', 'bendR', 'armKR'];
  const cur = [o[key[0]] ?? -1.32, o[key[1]] ?? .22, o[key[2]] ?? 1];
  const out = { [key[0]]: lerp(cur[0], r[key[0]], k), [key[1]]: lerp(cur[1], r[key[1]], k), [key[2]]: lerp(cur[2], r[key[2]], k) };
  if (name === 'back' && k > .5) out[which === 'L' ? 'handBackL' : 'handBackR'] = true;
  return out;
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
// Two-bone IK in the body frame: the raw shoulder angle and elbow bend that put arm `which`'s hand (side views: +x
// forward) on the point (tx, ty). Spread the result into a survivor's options (rawArms must be on). Only the hand's place
// matters: armGeom() then solves the real elbow in 3D (elbowDown is kept for old calls and no longer changes anything).
function reachArm(u, o, which, tx, ty, elbowDown = true) {
  const V = SV[o.view] || SV.front, far = V.far.includes(which), sideSign = V.side ? 1 : (which === 'R' ? 1 : -1);
  const drop = clamp(o.crouch || 0) * 1.2 * u + clamp(o.sit || 0) * 2.05 * u;
  const sy = -7.75 * u + drop;
  let r = solve(shoulderX(V, sideSign, far, u));
  if (svRaise(V, far, r.a) > 0) for (let i = 0; i < 3; i++) r = solve(shoulderX(V, sideSign, far, u, r.a));   // a raised 3/4 arm's shoulder moves back (see shoulderX)
  return which === 'L' ? { aL: r.a, bendL: r.a - r.a2, armKL: r.ak } : { aR: r.a, bendR: r.a - r.a2, armKR: r.ak };
  function solve(sx) {
    const dx = (tx - sx) * sideSign, dy = -(ty - sy), D = Math.hypot(dx, dy), ak = clamp(D / (3.6 * u * .97), 1, 1.3);   // out of reach: the arm stretches (up to 30%)
    const L1 = 1.85 * u * ak, L2 = 1.75 * u * ak, d = clamp(D, .2 * u, (L1 + L2) * .999);
    const th = Math.atan2(dy, dx), phi = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    // Which of the two elbows. 3/4 and profile (+x forward): elbowDown = the elbow below the shoulder-hand line reaching
    // forward, back behind him reaching back. Front, qf and back (+x = out from the body): the elbow that sits out and down
    // (the larger of x - .35y), so a hand across the chest, on the belly or near the hip keeps its elbow down and out at
    // his side instead of cocked up over the shoulder or crossed inward over the body. That choice only flips where both
    // solutions mirror each other about an out-and-slightly-down line, which a bent arm rarely crosses, so it doesn't pop.
    const outDown = q => Math.cos(q) - .35 * Math.sin(q);
    const lo = V.side ? true : outDown(th - phi) >= outDown(th + phi);
    const a = th + ((lo === elbowDown) ? -phi : phi), ex = L1 * Math.cos(a), ey = L1 * Math.sin(a), a2 = Math.atan2(dy * d / (D || 1) - ey, dx * d / (D || 1) - ex);
    return { a, a2, ak };
  }
}

// The inverse: a world point in a survivor's body frame (for reachArm targets in the world).
function toBody(x, y, u, o, wx, wy) {
  const sq = bodySq(o), dx = wx - (x + (o.dx || 0) * u), dy = wy - (y + bodyDy(o) * u);
  const r = -(o.rot || 0), c = Math.cos(r), s = Math.sin(r);
  return [(dx * c - dy * s) / ((o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .55)), (dx * s + dy * c) / ((o.sy ?? 1) * (1 - sq))];
}

// Where foot i is (0 = near/left leg, 1 = far/right), in the body frame: the middle of the foot (just above the sole).
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
  const a1 = Math.PI / 2 + swing - (V.side ? knee * .5 : 0); let kx = hx + Math.cos(a1) * th * (V.side ? 1 : 0) + (V.side ? 0 : side * knee * .25 * u), ky = hipY + Math.sin(a1) * th * (V.side ? 1 : 1 - lift * .25);
  const a2 = Math.PI / 2 + swing + (V.side ? knee : 0); let ax = kx + Math.cos(a2) * sh * (V.side ? 1 : 0) - (V.side ? 0 : side * knee * .2 * u), ay = Math.min(-.25 * u, ky + Math.sin(a2) * sh * (V.side ? 1 : 1 - lift * .3));
  if (st > 0) {   // as in survivor()
    const skx = V.side ? hx + th * .98 : hx + side * .25 * u, sky = V.side ? hipY + th * .06 : hipY + th * .2;
    kx = lerp(kx, skx, st); ky = lerp(ky, sky, st);
    if (o.legsOut && V.side) { ax = lerp(ax, skx + sh * .98, st); ay = lerp(ay, sky + .05 * u, st); }
    else { ax = lerp(ax, skx + (V.side ? .1 : side * .05) * u, st); ay = lerp(ay, -.25 * u, st); }
  }
  const ck = clamp(i === 0 ? o.clutchL || 0 : o.clutchR || 0);
  if (ck > 0) [kx, ky, ax, ay] = clutchLeg(u, hx, hipY, ck, kx, ky, ax, ay, V.side);
  const stag = svStagger(V, i, crouch, u); kx += stag; ax += stag;
  const m = svFootMid(svFootPose(V, o, st, hk, ck, swing, kx, ky, ax, ay), side, u);
  return [ax + m[0], ay + m[1]];
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
