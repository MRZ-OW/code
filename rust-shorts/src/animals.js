// animals.js: Rust's wildlife, painted: the boar and the chicken.
//
// References (in-game screenshots; copies in the session scratchpad, refimg/animals/): the Facepunch wiki's Animals page
// (today's boar and wild chicken), the fandom wiki's 2016 shots (the boar in profile; wild hens in white, buff and
// black) and the March 2025 Crafting Update devblog (the pet hen of the chicken coop).
//   Boar: a dark brown, bristly wild pig. A big wedge head with round upright ears, a pink-brown snout disc, small eyes
//   and short cream tusks curving up from the lower jaw; a high hunched shoulder under a dark bristle crest; a lighter,
//   grizzled shoulder and jowls; a smaller rump; short near-black legs on little hooves; a thin tufted tail.
//   Chicken: a plump hen with a red comb, red wattles and red skin by the eye. The wild one is dusty white (the 2016
//   variants: buff and black) with dark legs and a grey beak; the pet hen is clean white with a grey-speckled neck, a
//   yellow beak and orange legs.
//
//   boar(x, y, s, o)      (x, y) = the ground point under the middle of the body (between the front and hind legs; the
//                         head reaches further forward). s = 1 is about 300 px long. It works in u = 30·s, the unit of a
//                         survivor at u = 30, so their ink weights match side by side.
//     view   'side' (default) | 'q' (3/4, turned toward the camera). flip: face left. rot: tilt, pivoting at (x, y).
//     gait   'stand' | 'trot' | 'run'. phase = strides taken (the legs cycle once per 1.0; default T × the gait's rate).
//            Hooves stay planted on a moving boar when phase = distance travelled / boarStride(s, gait, view).
//     mood   (or eyes) 'neutral' | 'angry' (red-rimmed eyes, crest up, head down, snorting; pawing when standing) | 'scared' (ears back, tail
//            tucked, trembling, sweat) | 'happy' (^ ^ eyes, blush, wagging tail). eyes also takes any clawd.js eye name.
//     rump(u, sw, info)   a hook on its backside, in body space: the origin is the middle of the near haunch, +x points
//            toward the head, and flip, rot and the gait's bob all apply, so a red X drawn round (0, 0) rides along.
//            boarRump(x, y, s, o) gives that point in the world (to aim an arc at it).
//     emote, emoteK, emoteAge (as survivor()), noShadow, boilKey, seed (blink timing), t (time for the idle; default T)
//     acting (ep4): dy (lift off the ground, in u; negative = up; the shadow stays down and shrinks), sq (squash > 0 /
//            stretch < 0 about the ground point, keeping volume), head (an extra head pitch in radians, + = snout down,
//            e.g. rooting), squeal 0..1 (the jaw drops open: a squeal or an oink), stride 0..1 (scales a moving gait's
//            steps and bob: ease it to 0 as the boar comes to a stop, then switch to 'stand'). boarRump follows them too.
//     coat   'charcoal' (today's in-game boar: cooler, darker grey-brown); default: the warm brown 2016 boar
//   chicken(x, y, s, o)   (x, y) = the ground point between the feet. s = 1 is about 120 px tall (u = 30·s too).
//     pose   'stand' | 'walk' | 'sit' (nesting, legs hidden) | 'crow' (head up, beak open) | 'sleep' (sitting, head
//            sunk, eyes shut) | 'flap' (wings out and beating, running on the spot)
//     phase  strides for 'walk', wingbeats for 'flap' (default T × a natural rate). view 'side' | 'q'. flip, rot.
//     breed  'white' (wild, default) | 'buff' | 'black' (the other wild ones) | 'pet' (the 2025 coop hen).
//     eyes, emote, emoteK, emoteAge, noShadow, boilKey, seed, t
//   feathers(x, y, k, o)  a burst of feathers for a chicken bursting away: a puff at (x, y), then feathers flung out that
//                         drift down rocking like leaves and shrink away by k = 1. k 0..1, e.g. seg(t, t0, t0 + 2).
//                         o.n (12), o.s (size, 1), o.breed or o.col, o.spread (radians round straight up, 3.6),
//                         o.fall (px, 260·s), o.seed, o.boilKey.

// ---------- shared ----------
// A closed Catmull-Rom loop through P (n samples per span): one smooth outline for a wash and a partial ink line.
function critterLoop(P, n = 5) {
  const out = [], N = P.length;
  for (let i = 0; i < N; i++) {
    const p0 = P[(i + N - 1) % N], p1 = P[i], p2 = P[(i + 1) % N], p3 = P[(i + 2) % N];
    for (let k = 0; k < n; k++) {
      const a = k / n, a2 = a * a, a3 = a2 * a;
      out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * a + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * a2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * a3)));
    }
  }
  return out;
}
// Points i..j (in spans of n samples) of a critterLoop outline: the stretch of it that gets inked.
function critterArc(L, n, i, j) { const out = []; for (let k = i * n; k <= j * n; k++) out.push(L[((k % L.length) + L.length) % L.length]); return out; }
// Two-bone leg from hip h to foot f, segment lengths a and b. bend +1 puts the joint behind the hip→foot line (a hock),
// -1 in front of it (a front knee). Out of reach the leg goes straight and stretches, so a planted foot never floats.
function critterIK(h, f, a, b, bend) {
  const dx = f[0] - h[0], dy = f[1] - h[1], d = Math.hypot(dx, dy) || 1e-6;
  if (d >= a + b - 1e-6) return [h[0] + dx * a / (a + b), h[1] + dy * a / (a + b)];
  const ang = Math.atan2(dy, dx) + bend * Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  return [h[0] + Math.cos(ang) * a, h[1] + Math.sin(ang) * a];
}
// A stepping foot at leg phase p: [dx, lift, swing]. Stance (p < D): on the ground, sliding back under the body at a
// steady speed, so on a body moving S per cycle it stays planted. Swing: it lifts and swings forward. swing = 0 in stance,
// 0..1 through the swing.
function critterStep(p, D, S, lift) {
  if (p < D) return [S * D * (.5 - p / D), 0, 0];
  const k = (p - D) / (1 - D);
  return [S * D * (ease(k) - .5), -lift * Math.sin(Math.PI * Math.pow(k, .8)), k];
}
// An animal's eye at (ex, ey), e = its unit (clawd.js eyes are about 2e tall). Plain eyes are a dark oval with a glint,
// like the survivor's, and blink on their own timer; happy and closed are ink arcs; every other kind is clawd.js's eye().
// s = -1 makes slanted moods lean down toward +x (the snout, in profile).
function critterEye(kind, ex, ey, e, s, o, sw) {
  push(); translate(ex, ey);
  if (kind === 'happy') inkLine([[-.85 * e, .5 * e], [0, -.55 * e], [.85 * e, .5 * e]], sw, PAL.ink, 'ink', .7);
  else if (kind === 'closed' || kind === 'sleep') inkLine([[-.9 * e, -.15 * e], [0, .45 * e], [.9 * e, -.15 * e]], sw, PAL.ink, 'ink', .7);
  else if (['normal', 'look', 'wide'].includes(kind)) {
    if (((T * .9 + (o.seed || 0) * 1.7) % 3.3) < .12) inkLine([[-.8 * e, .2 * e], [.8 * e, .2 * e]], sw, PAL.ink, 'ink', 0);
    else {
      const g = kind === 'wide' ? 1.25 : 1, lx = (o.lookX || 0) * .35 * e, ly = (o.lookY || 0) * .3 * e;
      paint(ellPts(lx, ly, .72 * e * g, e * g, 14), { wash: PAL.ink, ink: null });
      paint(ellPts(lx - .24 * e * g, ly - .38 * e * g, .26 * e, .3 * e, 8), { wash: PAL.cream, washOp: 235, ink: null });
    }
  } else eye(kind, s, e, o, sw);
  pop();
}
const critterPts = (P, u, dx = 0, dy = 0) => P.map(([a, b]) => [(a + dx) * u, (b + dy) * u]);
// An ellipse turned by rot (ellPts' last argument only moves where its points start).
function critterEll(cx, cy, rx, ry, rot = 0, n = 18) { const c = Math.cos(rot), s = Math.sin(rot), P = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, px = Math.cos(a) * rx, py = Math.sin(a) * ry; P.push([cx + px * c - py * s, cy + px * s + py * c]); } return P; }

// ---------- the boar ----------
const BOAR_COL = { body: '#6A5241', dk: '#3F332D', lt: '#AA9682', face: '#3A302D', socket: '#7A6253', snout: '#B08C80', nostril: '#4A3430',
  tusk: '#F3EAD3', hoof: '#2A2328', mane: '#2E2728', leg: '#4A3C34', inEar: '#8A6A62', dust: '#BBA88C' };
// o.coat 'charcoal': today's in-game boar, a cooler dark grey-brown with a grizzled lighter coat (refimg boar_fandom_view)
const BOAR_COATS = { charcoal: { body: '#57514C', dk: '#36312E', lt: '#9A928A', face: '#332E2C', socket: '#6E6560', snout: '#A3898A', nostril: '#3E3234', mane: '#262224', leg: '#3B3634', inEar: '#7E6A68' } };
// Key views (drawn, never projected), in u, +x toward the head; ox shifts the drawing so the middle of the body sits over
// (x, y). body: the torso outline; ham, grizzle, belly: soft shading ellipses; ticks: hair strokes [x, y, light?];
// crest: the spine the bristles grow along; neck: where the head pivots; head: its outline in head space, inked from
// point ink[0] to ink[1] (the rest hides in the neck); muzzle: the dark face; cheek: the grizzled jowl; disc, nostrils:
// the snout; eyes: [x, y, size, slant]; ears: [x, y, tilt, size], near first; legs: hip, rest foot x, ground y, bone
// lengths; axis: the way a leg swings; tail: its root; rump: the haunch (the rump hook); pivot: what the body pitches
// round; shadow: [x offset, rx, ry].
const BOAR_VIEWS = {
  side: {
    ox: .6, pivot: [-.6, -3.4],
    body: [[2.4, -4.75], [1.05, -5.45], [-.55, -5.08], [-2.1, -4.6], [-3.35, -4.28], [-4.12, -3.75], [-4.32, -3.0], [-3.95, -2.25], [-3.15, -1.98], [-1.7, -1.86], [.1, -1.7], [1.45, -1.6], [2.4, -1.85], [2.95, -2.8], [3.0, -3.95]],
    belly: [-.8, -2.02, 3.4, .48], ham: [-3.15, -3.05, 1.0, .95], grizzle: [1.15, -3.5, 1.5, 1.3],
    ticks: [[.55, -4.45, 1], [1.45, -4.65, 1], [.15, -3.55, 1], [1.05, -2.85, 1], [-1.55, -4.25, 0], [-2.55, -3.85, 0], [-1.1, -3.2, 0], [-2.05, -2.7, 0]],
    crest: [[2.75, -4.62], [1.95, -5.15], [1.0, -5.48], [-.1, -5.25], [-1.2, -4.92], [-2.2, -4.58]],
    neck: [2.3, -3.45],
    head: [[-.15, -1.38], [.75, -1.25], [1.5, -.78], [2.35, .05], [2.95, .62], [3.02, 1.34], [2.6, 1.52], [1.8, 1.74], [.7, 1.95], [-.25, 1.62], [-.7, .3]], ink: [0, 9],
    muzzle: [2.3, .66, .98, .62, .62], cheek: [.75, 1.0, 1.0, .66], disc: [2.98, 1.0, .26, .38], nostrils: [[3.05, 1.04, .07, .12]],
    eyes: [[1.22, -.08, 1, -1]], ears: [[.66, -1.05, -.12, 1.05], [.32, -1.12, -.34, .9]],
    tusks: [[[2.2, 1.42], [2.17, 1.0], [1.95, .6]]], mouth: [[2.92, 1.42], [2.4, 1.45], [1.85, 1.3]],
    legs: [
      { k: 'FF', hip: [1.95, -2.6], fx: 2.05, gy: 0, front: true, far: true, l: [1.3, 1.3] },
      { k: 'HF', hip: [-2.55, -2.75], fx: -2.7, gy: 0, front: false, far: true, l: [1.5, 1.45] },
      { k: 'FN', hip: [1.5, -2.6], fx: 1.55, gy: 0, front: true, far: false, l: [1.3, 1.3] },
      { k: 'HN', hip: [-3.0, -2.75], fx: -3.15, gy: 0, front: false, far: false, l: [1.5, 1.45] },
    ],
    axis: [1, 0], tail: [-4.2, -3.6], rump: [-3.3, -3.15], shadow: [.4, 4.3, .6],
  },
  q: {
    ox: .38, pivot: [-.4, -3.4],
    body: [[1.7, -4.68], [.55, -5.4], [-.85, -5.08], [-2.1, -4.58], [-2.82, -4.05], [-3.14, -3.4], [-2.96, -2.66], [-2.45, -2.18], [-1.4, -1.9], [.2, -1.72], [1.4, -1.6], [2.12, -1.98], [2.42, -2.95], [2.3, -4.05]],
    belly: [-.6, -2.02, 2.7, .48], ham: [-2.3, -3.1, .85, .8], grizzle: [.95, -3.55, 1.3, 1.2],
    ticks: [[.4, -4.55, 1], [1.15, -4.7, 1], [0, -3.7, 1], [-1.4, -4.3, 0], [-2.2, -3.9, 0], [-1.0, -3.2, 0]],
    crest: [[2.05, -4.6], [1.35, -5.05], [.5, -5.45], [-.55, -5.2], [-1.5, -4.85], [-2.2, -4.6]],
    neck: [1.7, -3.45],
    head: [[-.2, -1.38], [.72, -1.32], [1.52, -.88], [2.08, -.12], [2.45, .52], [2.52, 1.3], [2.15, 1.6], [1.45, 1.82], [.45, 1.98], [-.4, 1.65], [-.8, .3]], ink: [0, 9],
    muzzle: [1.98, .62, .9, .72, .7], cheek: [.45, 1.02, .9, .72], disc: [2.38, .98, .42, .45], nostrils: [[2.24, 1.03, .08, .12], [2.53, .99, .08, .12]],
    eyes: [[1.0, -.16, 1, -1], [1.66, -.3, .8, 1]], ears: [[.32, -1.08, -.32, 1.05], [1.1, -1.18, .26, .9]],
    tusks: [[[1.78, 1.47], [1.7, 1.05], [1.48, .76]], [[2.7, 1.42], [2.82, 1.05], [2.72, .8]]], mouth: [[2.25, 1.5], [1.95, 1.53], [1.5, 1.38]],
    legs: [
      { k: 'FF', hip: [1.8, -2.7], fx: 1.95, gy: -.32, front: true, far: true, l: [1.26, 1.26] },
      { k: 'HF', hip: [-1.6, -2.9], fx: -1.62, gy: -.4, front: false, far: true, l: [1.45, 1.4] },
      { k: 'FN', hip: [.95, -2.55], fx: 1.0, gy: .16, front: true, far: false, l: [1.36, 1.36] },
      { k: 'HN', hip: [-2.3, -2.75], fx: -2.45, gy: .02, front: false, far: false, l: [1.5, 1.45] },
    ],
    axis: [.85, .1], tail: [-3.05, -3.62], rump: [-2.35, -3.3], shadow: [.45, 3.7, .8],
  },
};
// Gaits: D = the share of a stride a hoof is down, S = stride length (u), lift = hoof lift (u), off = each leg's phase
// (FN/FF near/far front, HN/HF near/far hind). Trot: diagonal pairs. Run: a gallop, hind pair then front pair, then a
// gathered leap. bob/pitch/head/tail/ear: the body's motion through the stride.
const BOAR_GAITS = {
  stand: { rate: 0, D: 1, S: 0, lift: 0, off: {}, bob: () => 0, pitch: () => 0, head: () => 0, tail: () => .15, ear: () => 0 },
  trot: { rate: 2.2, D: .56, S: 3.4, lift: .62, off: { FN: 0, HF: .02, FF: .5, HN: .52 },
    bob: p => -.1 * (.5 + .5 * Math.cos(TAU * 2 * (p - .04))), pitch: p => .02 * Math.sin(TAU * p),
    head: p => .05 * Math.sin(TAU * 2 * p - 1.2), tail: p => .4 + .3 * Math.sin(TAU * 2 * p), ear: p => .12 * Math.sin(TAU * 2 * p - 1.6) },
  run: { rate: 2.6, D: .36, S: 6.2, lift: .95, off: { HN: 0, HF: .07, FN: .43, FF: .49 },
    bob: p => { const d = Math.abs(frac(p - .9 + .5) - .5); return -.07 * (.5 - .5 * Math.cos(TAU * (p - .41))) - (d < .12 ? .26 * Math.cos(Math.PI * d / .24) : 0); },
    pitch: p => .06 * Math.sin(TAU * (p - .35)), head: p => .1 + .06 * Math.sin(TAU * p - 2),
    tail: p => 1.3 + .12 * Math.sin(TAU * 2 * p), ear: p => -.5 + .08 * Math.sin(TAU * p) },
};
const BOAR_MOODS = {
  neutral: { eyes: 'normal' },
  angry: { eyes: 'angry', brow: 1, eye: 1.3, socket: '#B2513F', crest: 1.8, head: .13, tail: 1.0, ear: .22, snort: true, paw: true },
  scared: { eyes: 'scared', brow: -1, eye: 1.3, crest: .65, head: -.1, tail: -.6, ear: -.8, shake: true, lean: -.04, emote: 'sweat' },
  happy: { eyes: 'happy', eye: 1.15, blush: true, head: -.06, wag: true, ear: .12 },
};
const boarStride = (s = 1, gait = 'trot', view = 'side') => (BOAR_GAITS[gait] || BOAR_GAITS.trot).S * 30 * s * (view === 'q' ? BOAR_VIEWS.q.axis[0] : 1);

// The near front hoof pawing the ground (angry, standing): it scrapes back, then lifts and reaches forward. Every .8 s.
function boarPaw(t) {
  const c = frac(t / .8);
  if (c < .4) return [.45 - .95 * (c / .4), 0, 0];
  const k = (c - .4) / .6; return [-.5 + .95 * ease(k), -.55 * Math.sin(Math.PI * k), k];
}
// The body's pose this frame: bob, pitch, head, tail and ear angles (body units and radians).
function boarPose(o, t, id) {
  const G = BOAR_GAITS[o.gait] || BOAR_GAITS.stand, M = BOAR_MOODS[o.mood] || BOAR_MOODS[o.eyes] || BOAR_MOODS.neutral, moving = G !== BOAR_GAITS.stand;
  const ph = o.phase ?? t * G.rate, p = frac(ph), k = clamp(o.stride ?? 1);
  const P = { G, M, moving, ph, p, k, dy: G.bob(p) * k, pitch: G.pitch(p) * k + (M.lean || 0), head: G.head(p) * k + (M.head || 0) + (o.head || 0), tail: G.tail(p), ear: G.ear(p) + (M.ear || 0) };
  if (!moving) {   // standing: breathing, a slow sniff, a tail swish and the odd ear flick
    P.dy += -.03 * (.5 + .5 * Math.sin(t * TAU * .5));
    P.head += .035 * Math.sin(t * TAU * .4 + 1);
    P.tail = (M.tail ?? .15) + (M.wag ? .55 * Math.sin(t * TAU * 3) : M.shake ? .05 * Math.sin(t * TAU * 17) : .22 * Math.sin(t * TAU * .8));
    P.ear += .4 * spring((t + hash(id) * 5) % 3.1, 2.55, 7, 34);
  } else {
    if (M.tail != null && !M.wag) P.tail = lerp(P.tail, M.tail, .6);
    if (M.wag) P.tail += .45 * Math.sin(t * TAU * 3);
  }
  return P;
}
// Body space → the boar's ground frame (before ox, flip and rot), after the bob and pitch: [x, y] in px.
function boarBody(V, P, u, bx, by) {
  const [vx, vy] = V.pivot, c = Math.cos(P.pitch), s = Math.sin(P.pitch), ax = bx - vx, ay = by - vy;
  return [(vx + ax * c - ay * s) * u, (vy + ax * s + ay * c + P.dy) * u];
}
// Where the rump hook's origin lands in the world.
function boarRump(x, y, s = 1, o = {}) {
  const u = 30 * s, V = o.view === 'q' ? BOAR_VIEWS.q : BOAR_VIEWS.side, P = boarPose(o, o.t ?? T, 0);
  let [bx, by] = boarBody(V, P, u, V.rump[0], V.rump[1]); bx += V.ox * u; if (o.flip) bx = -bx;
  const sq = o.sq || 0; bx *= 1 + sq * .55; by *= 1 - sq;
  const r = o.rot || 0, c = Math.cos(r), sn = Math.sin(r);
  return [x + bx * c - by * sn, y + (o.dy || 0) * u + bx * sn + by * c];
}

function boar(x, y, s = 1, o = {}) {
  const id = o.boilKey ?? ++CLAWD_N, rs = part => boilSeed(`boar ${id} ${part}`);
  const u = 30 * s, sw = clamp(u / 16, .45, 2.4) * (o.swMul || 1), t = o.t ?? T, C = BOAR_COATS[o.coat] ? { ...BOAR_COL, ...BOAR_COATS[o.coat] } : BOAR_COL, dir = o.flip ? -1 : 1;
  const vn = o.view === 'q' ? 'q' : 'side', V = BOAR_VIEWS[vn], P = boarPose(o, t, id), { G, M, moving } = P;
  const eyeKind = o.eyes && !BOAR_MOODS[o.eyes] ? o.eyes : M.eyes, eo = { ...o, seed: o.seed ?? hash(id) * 3 };
  const U = pts => critterPts(pts, u), E = (a, b, rx, ry, n, j = 0, r = 0) => ellPts(a * u, b * u, rx * u, ry * u, n, j, r);
  const shake = M.shake ? .045 * Math.sin(t * TAU * 21) * u : 0, paw = M.paw && !moving;
  const soft = (pts, col, op, tex = .6) => paint(pts, { fill: col, fillOp: op, bleed: .12, tex, border: .5, ink: null });

  rs('shadow');
  const lift = Math.min(0, o.dy || 0), sqk = o.sq || 0;
  if (!o.noShadow) { const f = (1 + Math.min(0, P.dy) * .3) * Math.max(.45, 1 + lift * .12) * (1 + sqk * .4); paint(ellPts(x + dir * V.shadow[0] * u, y + .1 * u, V.shadow[1] * u * f, V.shadow[2] * u * f, 24), { fill: PAL.ink, fillOp: 90, bleed: .25, tex: .3, border: .1, ink: null }); }

  push(); translate(x + shake, y + (o.dy || 0) * u); if (o.rot) rotate(o.rot); scale(dir * (1 + sqk * .55), 1 - sqk); translate(V.ox * u, 0);
  // ---------- legs (all under the body; far ones darker) ----------
  const leg = L => {
    rs('leg' + L.k);
    const [fdx, lift, sk] = paw && L.k === 'FN' ? boarPaw(t) : moving ? critterStep(frac(P.ph + (G.off[L.k] || 0)), G.D, G.S, G.lift * (L.front ? 1 : .85)).map(v => v * P.k) : [0, 0, 0];
    const fx = (L.fx + fdx * V.axis[0]) * u, fy = (L.gy + fdx * V.axis[1] + lift) * u, h = boarBody(V, P, u, L.hip[0], L.hip[1]), F = [fx, fy - .3 * u];
    const J = critterIK(h, F, L.l[0] * u, L.l[1] * u, L.front ? -1 : 1), col = L.far ? mixCol(C.leg, PAL.ink, .45) : C.leg;
    paint(ribbon([h, J, F], (L.front ? .8 : .95) * u, .3 * u), { wash: col, ink: PAL.ink, sw: sw * .75 });
    const la = Math.atan2(F[1] - J[1], F[0] - J[0]) - Math.PI / 2;   // the hoof stays flat on the ground, and tips with the leg in the air
    push(); translate(F[0], F[1]); rotate(la * Math.sin(Math.PI * sk));
    paint(U([[-.2, -.1], [.18, -.1], [.36, .3], [-.21, .3]]), { wash: L.far ? mixCol(C.hoof, PAL.ink, .3) : C.hoof, ink: PAL.ink, sw: sw * .55 });
    if (!L.far) inkLine(U([[.12, .02], [.19, .28]]), sw * .5, C.lt, 'inkfine', 0);   // the cloven split
    pop();
  };
  V.legs.filter(L => L.far).forEach(leg);
  V.legs.filter(L => !L.far).forEach(leg);
  if (paw) {   // dust kicked back by the scraping hoof
    rs('dust');
    const c = frac(t / .8), L = V.legs.find(L => L.k === 'FN');
    for (let i = 0; i < 3; i++) {
      const k = clamp((c - .07 * i) / .55); if (k <= 0 || k >= 1) continue;
      paint(E(L.fx - .35 - (.3 + 1.1 * k + .25 * i) * V.axis[0], L.gy - .22 - .5 * k - .1 * i, .22 + .3 * k, .16 + .2 * k, 14), { wash: C.dust, washOp: 225 * (1 - k), ink: k < .45 ? PAL.ink : null, sw: sw * .8, br: 'inkfine' });
    }
  }

  // ---------- body ----------
  push(); translate(V.pivot[0] * u, (V.pivot[1] + P.dy) * u); rotate(P.pitch); translate(-V.pivot[0] * u, -V.pivot[1] * u);
  rs('tail');
  push(); translate(V.tail[0] * u, V.tail[1] * u); rotate(P.tail);
  const TL = U([[0, 0], [-.3, .3], [-.42, .72], [-.36, 1.1]]);
  paint(ribbon(TL, .26 * u, .12 * u), { wash: C.dk, ink: PAL.ink, sw: sw * .6 });
  push(); translate(TL[3][0], TL[3][1]); rotate(.25);
  paint(critterLoop(U([[0, -.14], [.17, .1], [.09, .42], [0, .52], [-.1, .42], [-.17, .1]]), 3), { wash: C.mane, ink: PAL.ink, sw: sw * .55 });
  pop(); pop();

  rs('body');
  const BL = critterLoop(U(V.body), 6);
  paint(BL, { wash: C.body, ink: null });
  soft(E(...V.belly, 20), C.dk, 120, .5);
  soft(E(...V.ham, 18, u * .03), C.dk, 70);
  soft(E(...V.grizzle, 20, u * .04), C.lt, 130, .7);
  paint(BL, { ink: PAL.ink, sw: sw * .95 });
  for (const [bx, by, light] of V.ticks) inkLine(U([[bx, by], [bx - .3, by + .22]]), sw * .5, light ? mixCol(C.lt, '#FFFFFF', .15) : C.dk, 'inkfine', 0);

  // the bristle crest along the spine, swept back; it stands up when the boar is angry
  rs('crest');
  {
    const S = through(U(V.crest), 4), n = S.length, top = [], bot = [], k = M.crest || 1;
    for (let i = 0; i < n; i++) {
      const a = S[Math.max(0, i - 1)], b = S[Math.min(n - 1, i + 1)], tx = b[0] - a[0], ty = b[1] - a[1], d = Math.hypot(tx, ty) || 1, nx = -ty / d, ny = tx / d;
      const h = i % 2 ? .06 * u : (.15 + .38 * Math.pow(Math.sin(Math.PI * clamp(i / (n - 1) * 1.06)), .7)) * u * k * (.85 + .3 * hash(i * 3.7 + 1));
      top.push([S[i][0] + nx * h + tx / d * h * .5, S[i][1] + ny * h + ty / d * h * .5]);
      bot.push([S[i][0] - nx * .18 * u, S[i][1] - ny * .18 * u]);
    }
    paint([...top, ...bot.reverse()], { wash: C.mane, ink: null });
    inkLine(top, sw * .75, PAL.ink, 'ink', 0);
  }

  // ---------- head ----------
  rs('head');
  push(); translate(V.neck[0] * u, V.neck[1] * u); rotate(P.head);
  const ear = (EA, far) => {
    push(); translate(EA[0] * u, EA[1] * u); rotate(EA[2] + P.ear * (far ? .7 : 1));
    const e = u * EA[3];
    paint(critterLoop(critterPts([[-.3, .06], [-.32, -.5], [-.18, -.98], [.04, -1.12], [.22, -.88], [.31, -.36], [.31, .06]], e), 4), { wash: far ? mixCol(C.face, PAL.ink, .25) : mixCol(C.body, C.face, .5), ink: PAL.ink, sw: sw * .7 });
    if (!far) paint(critterLoop(critterPts([[-.16, -.14], [-.15, -.62], [-.04, -.9], [.12, -.66], [.15, -.16]], e), 4), { wash: C.inEar, ink: null });
    pop();
  };
  for (let i = V.ears.length - 1; i >= 1; i--) ear(V.ears[i], true);   // the far ear, behind the head
  const HL = critterLoop(U(V.head), 5);
  paint(HL, { wash: C.body, ink: null });
  paint(critterEll(V.muzzle[0] * u, V.muzzle[1] * u, V.muzzle[2] * u, V.muzzle[3] * u, V.muzzle[4], 22), { wash: C.face, washOp: 120, ink: null });   // the dark face
  soft(critterEll(V.muzzle[0] * u, V.muzzle[1] * u, V.muzzle[2] * u * 1.15, V.muzzle[3] * u * 1.2, V.muzzle[4], 22), C.face, 110, .5);
  soft(E(...V.cheek, 18, u * .03), C.lt, 125);   // grizzled jowl
  inkLine(critterArc(HL, 5, V.ink[0], V.ink[1]), sw * .95, PAL.ink, 'ink', 0);
  if (V.tusks.length > 1) paint(ribbon(U(V.tusks[1]), .24 * u, .07 * u), { wash: mixCol(C.tusk, C.face, .15), ink: PAL.ink, sw: sw * .7, br: 'inkfine' });   // the far tusk
  const [dx0, dy0, drx, dry] = V.disc;
  paint(E(dx0, dy0, drx, dry, 16), { wash: C.snout, ink: PAL.ink, sw: sw * .65 });
  for (const [nx, ny, nrx, nry] of V.nostrils) paint(E(nx, ny, nrx, nry, 10), { wash: C.nostril, ink: null });
  const mo = V.mouth, mood = o.mood || o.eyes;
  const mouthPts = mood === 'happy' ? [mo[0], mo[1], [mo[2][0], mo[2][1] - .22]] : mood === 'angry' ? [mo[0], mo[1], [mo[2][0], mo[2][1] + .12]] : mo;
  const sq2 = clamp(o.squeal || 0);
  if (sq2 > .02) {   // the jaw drops: a dark open mouth with a pink tongue, hinged at the back corner of the mouth
    const jaw = mouthPts.map(([mx, my], i) => [mx - .06 * sq2 * (2 - i), my + .5 * sq2 * (1 - i / 2)]);
    paint(U([...mouthPts, ...jaw.slice().reverse()]), { wash: '#4A1F2A', ink: PAL.ink, sw: sw * .6 });
    paint(E(lerp(mouthPts[0][0], mouthPts[1][0], .6), mouthPts[1][1] + .3 * sq2, .32, .1 + .08 * sq2, 10), { wash: '#D9707A', ink: null });
  } else inkLine(U(mouthPts), sw * .6, PAL.ink, 'ink', .4);
  paint(ribbon(U(V.tusks[0]), .3 * u, .08 * u), { wash: C.tusk, ink: PAL.ink, sw: sw * .8, br: 'inkfine' });
  // eyes: a lighter socket so a dark eye reads on the dark face, then the mood's eye and brow
  rs('eyes');
  for (const [ex, ey, es0, sl] of V.eyes) {
    const es = es0 * (M.eye || 1);
    paint(E(ex, ey, .27 * es, .3 * es, 14), { wash: M.socket || mixCol(C.body, C.lt, .3), ink: null });
    critterEye(eyeKind, ex * u, ey * u, .25 * u * es, sl, eo, sw * .8);
    if (M.brow) {
      const hi = M.brow > 0 ? -.52 : -.3, lo = M.brow > 0 ? -.2 : -.6, l = sl < 0 ? hi : lo, r = sl < 0 ? lo : hi;
      inkLine(U([[ex - .5 * es, ey + l * es], [ex + .45 * es, ey + r * es]]), sw * 1.35, PAL.ink, 'ink', 0);
    }
  }
  if (M.blush) soft(E(V.cheek[0] + .3, V.cheek[1] - .2, .5, .26, 14), PAL.rose, 170);
  ear(V.ears[0], false);
  if (M.snort) {   // angry snorts: two puffs blown from the snout, over and over
    rs('snort');
    for (let i = 0; i < 2; i++) {
      const k = frac(t * 1.4 + i * .5); if (k > .85) continue;
      const r = .22 + .4 * k;
      paint(E(dx0 + .5 + 1.4 * k, dy0 + .2 + .45 * k, r, r * .78, 14), { wash: PAL.cream, washOp: 240 * (1 - k), ink: k < .5 ? PAL.ink : null, sw: sw * .9, br: 'inkfine' });
    }
  }
  pop();   // head
  if (o.rump) { rs('rump'); push(); translate(V.rump[0] * u, V.rump[1] * u); o.rump(u, sw, { view: vn, gait: o.gait || 'stand' }); pop(); }
  pop();   // body
  pop();

  rs('emote');
  const em = o.emote ?? M.emote;
  if (em) {
    const top = EMOTE_TOP.includes(em), hx = (V.neck[0] + V.ox + (top ? .9 : 2.6)) * u, hy = (V.neck[1] + P.dy - (top ? 3.2 : 2.0)) * u;
    emote(em, x + dir * hx, y + hy, u * .7, o.emoteK ?? 1, o.emoteAge ?? T);
  }
  rs('after');
}

// ---------- the chicken ----------
const HEN_BREEDS = {
  white: { col: '#F8F4EC', dk: '#D6CCBC', wing: '#EAE2D4', leg: '#B07258', beak: '#A9A196', smudge: '#B49B7F' },
  buff: { col: '#E2AF66', dk: '#B98543', wing: '#D29C51', leg: '#C08058', beak: '#DCC28C', tail: '#9E6B33' },
  black: { col: '#4A454F', dk: '#2C292F', wing: '#595058', leg: '#DE9045', beak: '#77706A', tail: '#2F4136' },
  pet: { col: '#FBF8F2', dk: '#DCD5CA', wing: '#EFEAE1', leg: '#E99E48', beak: '#E9C46A', speck: '#77716D' },
};
const HEN_RED = '#D83C3A', HEN_POSES = ['stand', 'walk', 'sit', 'crow', 'sleep', 'flap'];
// Key views, in u. body: from the throat round the breast, belly and tail to the nape (the head's arc closes it); head:
// its centre (radius hr); wing: the folded near wing; shoulder: where an open wing pivots; legs: near then far, hip,
// rest foot x, ground y; toes: [angle, length]; beak: [length, angle]; eye and wattles [x, y, rx, ry]: from the head
// centre; comb: its width.
const HEN_VIEWS = {
  side: {
    body: [[1.15, -2.55], [1.42, -1.95], [1.2, -1.15], [.5, -.74], [-.5, -.78], [-1.2, -1.12], [-1.7, -1.6], [-2.08, -2.1], [-2.15, -2.55], [-1.98, -2.55], [-2.1, -2.95], [-1.9, -2.95], [-1.82, -3.28], [-1.45, -2.86], [-.85, -2.48], [-.05, -2.5], [.42, -2.75]],
    head: [.92, -3.12], hr: .55,
    wing: [[.82, -2.15], [.2, -2.42], [-.62, -2.28], [-1.22, -1.92], [-1.5, -1.54], [-.95, -1.4], [-.15, -1.28], [.58, -1.5]],
    shoulder: [.35, -2.2], tailLines: [[[-1.55, -2.3], [-1.86, -2.85]], [[-1.42, -1.85], [-1.9, -2.35]]],
    legs: [{ hip: [.22, -1.0], fx: .24, gy: 0 }, { hip: [-.1, -1.0], fx: -.12, gy: 0 }], toes: [[0, .5], [.22, .38], [Math.PI, .22]],
    beak: [1, 0], eye: [.2, -.08], wattles: [[.48, .5, .16, .27]], comb: 1,
  },
  q: {
    body: [[.98, -2.6], [1.3, -2.0], [1.18, -1.2], [.55, -.76], [-.4, -.8], [-1.0, -1.12], [-1.42, -1.62], [-1.75, -2.15], [-1.82, -2.6], [-1.66, -2.6], [-1.76, -2.98], [-1.58, -2.98], [-1.52, -3.26], [-1.15, -2.88], [-.65, -2.52], [-.05, -2.52], [.35, -2.75]],
    head: [.74, -3.12], hr: .55,
    wing: [[.42, -2.14], [-.08, -2.4], [-.7, -2.24], [-1.12, -1.9], [-1.32, -1.54], [-.82, -1.4], [-.22, -1.3], [.28, -1.48]],
    shoulder: [.05, -2.18], tailLines: [[[-1.3, -2.35], [-1.55, -2.9]], [[-1.18, -1.9], [-1.56, -2.4]]],
    legs: [{ hip: [-.12, -1.0], fx: -.16, gy: .06 }, { hip: [.42, -1.05], fx: .46, gy: -.14 }], toes: [[.08, .42], [.7, .3], [Math.PI + .25, .18]],
    beak: [.72, .38], eye: [.06, -.1], wattles: [[.3, .5, .13, .24], [.56, .44, .12, .22]], comb: .78,
  },
};
// The comb, sitting on the head: TOP is its inked edge (a row of round lobes, from the head's outline at the back to the
// front; no spline, so no loops); the wash closes along an arc inside the head, so no line crosses the forehead.
const HEN_COMB_TOP = (() => {
  const lobes = [[-.3, -.6, .16], [-.1, -.74, .17], [.12, -.75, .17], [.31, -.62, .15]], P = [[-.4, -.37]];
  for (let i = 0; i <= 28; i++) { const x = lerp(-.46, .46, i / 28); let y = -.3; for (const [cx, cy, r] of lobes) { const d = x - cx; if (Math.abs(d) < r) y = Math.min(y, cy - Math.sqrt(r * r - d * d)); } P.push([x, y]); }
  return [...P, [.42, -.35]];
})();
const HEN_COMB = [...HEN_COMB_TOP, ...Array.from({ length: 9 }, (_, i) => { const a = lerp(-.62, -2.52, i / 8); return [Math.cos(a) * .42, Math.sin(a) * .42]; })];
const HEN_WING_OPEN = [[.18, .1], [.32, -.45], [.28, -1.05], [.12, -1.55], [-.02, -1.3], [-.16, -1.62], [-.28, -1.28], [-.46, -1.5], [-.52, -1.12], [-.74, -1.22], [-.7, -.82], [-.62, -.4], [-.38, .05]];

function chicken(x, y, s = 1, o = {}) {
  const id = o.boilKey ?? ++CLAWD_N, rs = part => boilSeed(`hen ${id} ${part}`);
  const u = 30 * s, sw = clamp(u / 16, .45, 2.4) * .55 * (o.swMul || 1), t = o.t ?? T, dir = o.flip ? -1 : 1, U = pts => critterPts(pts, u);   // a hen is small: finer lines
  const pose = HEN_POSES.includes(o.pose) ? o.pose : 'stand', vn = o.view === 'q' ? 'q' : 'side', V = HEN_VIEWS[vn], K = HEN_BREEDS[o.breed] || HEN_BREEDS.white;
  const seated = pose === 'sit' || pose === 'sleep', stepping = pose === 'walk' || pose === 'flap';
  const ph = o.phase ?? t * (pose === 'flap' ? 4.5 : 2.2), p = frac(ph), lp = pose === 'flap' ? ph * .5 : ph;
  const eo = { ...o, seed: o.seed ?? hash(id + 7) * 3 }, fine = { ink: PAL.ink, sw: sw * 1.1, br: 'inkfine' };
  // ---- this frame's pose (u) ----
  let by = seated ? .76 : 0, sy = 1, hx = V.head[0], hy = V.head[1], hrot = 0, open = 0, lean = 0;
  if (pose === 'stand') {   // a hen's head moves in little snaps, then holds still
    const st = t * 1.3 + hash(id) * 4, i0 = Math.floor(st), k = ease(clamp(frac(st) / .1)), v = i => [(hash(i * 2.1 + id) - .5) * .16, (hash(i * 3.3 + id) - .5) * .5];
    hx += lerp(v(i0 - 1)[0], v(i0)[0], k); hrot = lerp(v(i0 - 1)[1], v(i0)[1], k);
  } else if (pose === 'walk') {   // the head holds still in the world, then thrusts forward: twice a stride
    const f = frac(2 * p); hx += f < .7 ? .16 - .32 * f / .7 : -.16 + .32 * ease((f - .7) / .3); by -= .05 * Math.abs(Math.sin(TAU * p)); hrot = .06;
  } else if (pose === 'crow') { hx += .22; hy -= .5; hrot = -.62; open = .85 + .15 * Math.sin(t * 31); sy = 1.02; }
  else if (pose === 'sit') { hy += .84; hrot = .05 * Math.sin(t * TAU * .3); sy = 1 + .015 * Math.sin(t * TAU * .4); }
  else if (pose === 'sleep') { hx -= .16; hy += 1.18; hrot = .42; sy = 1 + .03 * Math.sin(t * TAU * .3); }
  else if (pose === 'flap') { hy -= .06; hrot = -.22; open = .55 + .45 * Math.abs(Math.sin(t * TAU * 3)); by -= .1 * Math.abs(Math.sin(Math.PI * p)); lean = -.08; }
  if (!seated) hy += by;
  const H = [hx, hy * sy], hr = V.hr;
  const BP = V.body.map(([a, b]) => [a, (b + by) * sy]);

  rs('shadow');
  if (!o.noShadow) paint(ellPts(x - dir * .15 * u, y + .06 * u, (seated ? 1.8 : 1.35) * u, .3 * u, 18), { fill: PAL.ink, fillOp: 90, bleed: .25, tex: .3, border: .1, ink: null });

  push(); translate(x, y); if (o.rot) rotate(o.rot); scale(dir, 1); if (lean) rotate(lean);
  const flapA = lerp(-.15, -1.85, .5 + .5 * Math.sin(TAU * p));
  const openWing = (far) => {
    rs(far ? 'wingF' : 'wingN');
    const [sx0, sy0] = V.shoulder;
    push(); translate((sx0 + (far ? .18 : 0)) * u, (sy0 + by - (far ? .12 : 0)) * u); rotate(flapA + (far ? .12 : 0));
    paint(critterLoop(U(HEN_WING_OPEN), 3), { wash: far ? mixCol(K.wing, PAL.ink, .2) : K.wing, ink: PAL.ink, sw: sw * .9 });
    if (!far) for (const [a, b] of [[[.05, -.35], [-.12, -1.1]], [[-.28, -.2], [-.44, -.95]]]) inkLine(U([a, b]), sw * .9, mixCol(K.dk, PAL.ink, .25), 'inkfine', 0);
    pop();
  };
  if (pose === 'flap') openWing(true);

  // ---- legs (under the body) ----
  if (!seated) [1, 0].forEach(i => {
    rs('leg' + i);
    const L = V.legs[i], far = i === 1;
    const [fdx, lift, sk] = stepping ? critterStep(frac(lp + (far ? .5 : 0)), .58, 1.15, .38) : [0, 0, 0];
    const F = [(L.fx + fdx) * u, (L.gy + lift) * u], hip = [L.hip[0] * u, (L.hip[1] + by) * u];
    const J = critterIK(hip, F, .5 * u, .62 * u, 1), col = far ? mixCol(K.leg, PAL.ink, .3) : K.leg;
    paint(ribbon([hip, J, F], .3 * u, .17 * u), { wash: col, ...fine });
    const curl = Math.sin(Math.PI * sk) * 1.1;
    for (const [a, len] of V.toes) {
      const aa = a + (Math.cos(a) > 0 ? curl : -curl * .4), y0 = F[1] - .05 * u;
      paint(ribbon([[F[0], y0], [F[0] + Math.cos(aa) * len * u, y0 + Math.sin(aa) * len * u * (sk ? 1 : .35)]], .16 * u, .09 * u), { wash: col, ...fine, sw: sw * .9 });
    }
  });

  // ---- body and head: one silhouette ----
  rs('body');
  const sep = pose === 'sleep';   // a sunk head sits in front of the body instead of growing out of it
  let SIL;
  if (sep) SIL = [...BP, [(BP[BP.length - 1][0] + BP[0][0]) / 2, BP[0][1] - .12]];
  else {
    const n0 = [(BP[0][0] + BP[BP.length - 1][0]) / 2, (BP[0][1] + BP[BP.length - 1][1]) / 2], gap = Math.atan2(n0[1] - H[1], n0[0] - H[0]), arc = [];
    for (let i = 0; i <= 10; i++) { const a = gap + 1.0 + (TAU - 2.0) * i / 10; arc.push([H[0] + Math.cos(a) * hr, H[1] + Math.sin(a) * hr]); }
    SIL = [...arc, ...BP];
  }
  const SL = critterLoop(U(SIL), 4);
  paint(SL, { wash: K.col, ink: null });
  paint(ellPts(.1 * u, (-.95 + by) * u, 1.15 * u, .32 * u, 16), { fill: K.dk, fillOp: 120, bleed: .08, tex: .5, border: .4, ink: null });   // shade under the belly
  if (K.tail) paint(critterLoop(U([[-1.45, -2.3 + by], [-1.95, -2.5 + by], [-1.85, -3.05 + by], [-1.5, -2.75 + by]]), 3), { fill: K.tail, fillOp: 150, bleed: .1, tex: .5, border: .4, ink: null });
  if (K.smudge) for (const [a, b, rx, ry] of [[-.75, -1.45, .42, .22], [.55, -1.2, .28, .18]]) paint(ellPts(a * u, (b + by) * u, rx * u, ry * u, 12, u * .03), { fill: K.smudge, fillOp: 80, bleed: .15, tex: .6, border: .5, ink: null });
  if (K.speck && !sep) for (let i = 0; i < 11; i++) {   // the pet hen's grey-speckled hackles
    const a = hash(i * 5.3 + 2), b = hash(i * 2.9 + 7), px = lerp(BP[BP.length - 1][0], BP[0][0], .15 + .7 * a), py = lerp(H[1] + hr * .75, BP[0][1] + .35, b);
    inkLine(U([[px, py], [px - .04, py + .14]]), sw * 1.0, K.speck, 'inkfine', 0);
  }
  paint(SL, { ink: PAL.ink, sw: sw * 1.05 });
  for (const L of V.tailLines) inkLine(U(L.map(([a, b]) => [a, (b + by) * sy])), sw * .9, mixCol(K.dk, PAL.ink, .3), 'inkfine', .3);

  // ---- the near wing ----
  if (pose === 'flap') openWing(false);
  else {
    rs('wing');
    const WP = critterLoop(U(V.wing.map(([a, b]) => [a, (b + by) * sy])), 4);
    paint(WP, { wash: K.wing, ink: PAL.ink, sw: sw * 1.4, br: 'inkfine' });
    for (const [a, b] of [[[-.35, -1.6], [-.95, -1.7]], [[.15, -1.53], [-.45, -1.93]]]) inkLine(U([[a[0], (a[1] + by) * sy], [b[0], (b[1] + by) * sy]]), sw * .9, mixCol(K.dk, PAL.ink, .3), 'inkfine', .3);
  }
  if (sep) { rs('head'); paint(ellPts(H[0] * u, H[1] * u, hr * u, hr * u, 20), { wash: K.col, ink: PAL.ink, sw: sw * 1.05 }); }

  // ---- comb (on the head), then the face: red skin under the eye, wattles, beak, eye ----
  rs('face');
  push(); translate(H[0] * u, H[1] * u); rotate(hrot);
  paint(HEN_COMB.map(([a, b]) => [a * V.comb * u, b * u]), { wash: HEN_RED, ink: null });
  inkLine(HEN_COMB_TOP.map(([a, b]) => [a * V.comb * u, b * u]), sw * 1.2, PAL.ink, 'inkfine', 0);
  const [ex, ey] = V.eye;
  paint(critterLoop(U([[ex - .14, ey + .1], [ex + .08, ey + .04], [ex + .3, ey + .06], [ex + .34, ey + .3], [ex + .12, ey + .42], [ex - .1, ey + .3]]), 3), { wash: mixCol(HEN_RED, K.col, .3), ink: null });
  for (const [wx, wy, wr, wh] of V.wattles) paint(critterLoop(U([[wx - wr, wy - wh * .6], [wx + wr, wy - wh * .6], [wx + wr * .8, wy + wh * .5], [wx, wy + wh], [wx - wr * .8, wy + wh * .5]]), 3), { wash: HEN_RED, ...fine });
  const [bl, ba] = V.beak, B = (pts, rotK = 0) => pts.map(([a, b]) => { const r = ba + rotK, c = Math.cos(r), sn = Math.sin(r), px = .42 + (a - .42) * bl, py = b; return [(.42 + (px - .42) * c - py * sn) * u, ((px - .42) * sn + py * c) * u]; });
  if (open > .02) {
    paint(B([[.44, -.06], [.86, -.18 - .1 * open], [.84, .2 + .18 * open], [.44, .12]]), { wash: '#4A1F2A', ink: null });
    paint(B([[.44, .04], [.82, .16], [.46, .19]], .42 * open), { wash: K.beak, ...fine });
    paint(B([[.42, -.19], [.8, -.12], [.95, .0], [.46, .0]], -.25 * open), { wash: K.beak, ...fine });
  } else paint(B([[.42, -.19], [.8, -.12], [.97, .03], [.8, .1], [.42, .18]]), { wash: K.beak, ...fine });
  critterEye(sep ? 'closed' : (o.eyes || 'normal'), ex * u, ey * u, .22 * u, -1, eo, sw * 1.3);
  pop();

  if (pose === 'crow') {   // the crow: rings of sound rolling out of the open beak
    rs('crow');
    const a0 = hrot + V.beak[1], bx = H[0] + Math.cos(a0) * 1.05, byy = H[1] + Math.sin(a0) * 1.05;
    for (let i = 0; i < 3; i++) {
      const k = frac(t * 1.6 + i / 3); if (k > .8) continue;
      const r = .3 + 1.0 * k, A = []; for (let j = 0; j <= 6; j++) { const a = a0 - .65 + 1.3 * j / 6; A.push([(bx + Math.cos(a) * r) * u, (byy + Math.sin(a) * r) * u]); }
      inkLine(A, sw * 1.3 * (1 - k * .7), PAL.ink, 'ink', .5);
    }
  }
  pop();

  rs('emote');
  if (o.emote) emote(o.emote, x + dir * (H[0] + (EMOTE_TOP.includes(o.emote) ? 0 : 1.2)) * u, y + (H[1] - (EMOTE_TOP.includes(o.emote) ? 1.6 : 1.0)) * u, u * .55, o.emoteK ?? 1, o.emoteAge ?? T);
  rs('after');
}

// ---------- feathers ----------
function feathers(x, y, k, o = {}) {
  if (!(k > 0 && k < 1)) return;
  const s = o.s ?? 1, n = o.n ?? 12, sd = o.seed ?? 0, K = HEN_BREEDS[o.breed] || HEN_BREEDS.white, col = o.col || K.col, alt = o.col ? mixCol(o.col, PAL.ink, .1) : K.wing;
  const key = o.boilKey ?? `${Math.round(x)},${Math.round(y)}`, sw = clamp(30 * s / 16, .45, 2.4);
  if (k < .3) {   // the poof
    boilSeed('poof ' + key);
    const pk = k / .3, r = 36 * s * easeOut(clamp(pk * 1.7));
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .4, d = r * .7; paint(ellPts(x + Math.cos(a) * d, y + Math.sin(a) * d * .8, r * (.55 + .2 * hash(i + sd)), r * (.5 + .15 * hash(i + 4 + sd)), 14), { wash: PAL.cream, washOp: 245 * (1 - pk), ink: pk < .4 ? PAL.ink : null, sw: sw * .6, br: 'inkfine' }); }
  }
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 7.31 + sd), h2 = hash(i * 3.17 + sd + 5), h3 = hash(i * 11.7 + sd + 9);
    const a = -Math.PI / 2 + (h1 - .5) * (o.spread ?? 3.6), dist = (70 + 110 * h2) * s;
    const kb = easeOut(clamp(k / .28)), kf = clamp((k - .1) / .9), fall = (o.fall ?? 260 * s) * (.6 + .6 * h3), w = kf * (6 + 4 * h3) + i * 1.7;
    const px = x + Math.cos(a) * dist * kb + Math.sin(w) * 22 * s * kf, py = y + Math.sin(a) * dist * .85 * kb + fall * (.55 * kf + .45 * kf * kf);
    const rot = a + Math.PI / 2 + (1 - kb) * (h2 - .5) * 6 + Math.cos(w) * .7 * kf;
    const sz = (16 + 8 * h3) * s * (1 - ease(seg(k, .82, 1))) * clamp(k / .05);
    if (sz < 2) continue;
    boilSeed(`feather ${key} ${i}`);
    push(); translate(px, py); rotate(rot);
    const F = [[0, -1], [.3, -.55], [.3, .1], [.13, .6], [0, .7], [-.13, .6], [-.3, .1], [-.3, -.55]].map(([fx, fy]) => [(fx + .14 * fy * fy) * sz, fy * sz]);
    paint(critterLoop(F, 3), { wash: i % 3 === 2 ? alt : col, ink: PAL.ink, sw: sw * .55, br: 'inkfine' });
    inkLine([[.13 * sz, -.8 * sz], [.02 * sz, .1 * sz], [.1 * sz, .98 * sz]], sw * .45, mixCol(K.dk, PAL.ink, .3), 'inkfine', .4);
    pop();
  }
}

// ---------- model sheet: studio.html?ep=0&loop=animals ----------
(() => {
  LOOPS.animals = t => {
    boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE6D6', ink: null });
    for (const yy of [535, 875, 1215, 1535, 1845]) { boilSeed('line' + yy); inkLine([[0, yy], [W, yy]], .6, PAL.ink, 'inkfine', 0); }
    // row 1, for scale: the hero, a hen, the boar standing (profile and 3/4)
    spawnling(95, 520, 30, { ...feel('neutral', t), view: 'q' });
    chicken(235, 520, 1, { pose: 'stand' });
    boar(500, 520, 1, { gait: 'stand' });
    boar(860, 520, 1, { gait: 'stand', view: 'q' });
    // row 2: profile trot and gallop, and an angry boar pawing the ground
    boar(150, 860, .95, { gait: 'trot', phase: t * 2, rump: (u, sw) => { glow(0, 0, 1.3 * u, '#FF5A4A', .5); for (const d of [1, -1]) inkLine([[-.42 * u, -.42 * u * d], [.42 * u, .42 * u * d]], u * .065, '#E0283F', 'ink', 0); } });   // ep4: the X on its rump
    boar(505, 860, .95, { gait: 'run', phase: t * 2.5 });
    boar(860, 860, .95, { gait: 'stand', mood: 'angry' });
    // row 3: 3/4 trot and gallop, scared and happy
    boar(130, 1200, .85, { gait: 'trot', view: 'q', phase: t * 2 });
    boar(400, 1200, .85, { gait: 'run', view: 'q', phase: t * 2.5 });
    boar(735, 1200, .75, { gait: 'stand', mood: 'scared', flip: true });
    boar(945, 1200, .72, { gait: 'stand', mood: 'happy', view: 'q' });
    // row 4: every chicken pose
    ['stand', 'walk', 'sit', 'crow', 'sleep', 'flap'].forEach((pose, i) => chicken(95 + i * 178, 1520, 1, { pose, phase: pose === 'flap' ? t * 4.5 : t * 2 }));
    // row 5: the 3/4 view, the other breeds (wild buff and black, the 2025 pet hen), and a feather burst (once a loop)
    chicken(80, 1830, 1, { pose: 'stand', view: 'q' });
    chicken(220, 1830, 1, { pose: 'walk', view: 'q', phase: t * 2 });
    chicken(360, 1830, 1, { pose: 'stand', breed: 'buff', flip: true });
    chicken(495, 1830, 1, { pose: 'walk', breed: 'black', phase: t * 2 + .3 });
    chicken(625, 1830, 1, { pose: 'sit', breed: 'pet', view: 'q' });
    feathers(880, 1680, frac(t / 2 + .05), { seed: 1, spread: 3.2 });
  };
  LOOPS.animals.len = 2;
})();
