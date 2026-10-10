// heli.js: the patrol helicopter and its weapons (searchlight, scan line, minigun tracers, rockets).
//
// Reference: the in-game Patrol Helicopter (Facepunch devblogs "Waves of Change", Apr 2024, and "Friends with Benefits",
// Jul 2025, plus gameplay thumbnails): a UH-1Y-style utility helicopter in slate grey with a mustard-yellow cockpit and nose,
// a big sliding side door with two windows, a hump of engine cowling with a round intake and two exhausts, a long thin tail
// boom with little swept stabilisers and a swept fin, the tail rotor on the fin's left side, four-blade rotors with yellow
// tips, skids, a stub pylon on each side carrying an olive rocket pod (a honeycomb of tubes at the front), a ball searchlight
// under the nose and a minigun under the chin. It's built as one small 3D model, so every view comes from the same shapes.
//
//   patrolHeli(x, y, s, o)   (x, y) = the centre of the fuselage (the cabin, under the rotor mast); s = 1 ≈ 640 px long in profile.
//     view: 'side' (profile, nose right) | 'q' (3/4 from the front and slightly below: hovering overhead) | 'below' (belly)
//           | 'front' (nearly head-on, from a little below)
//     yaw, elev: turn it in 3D instead, for swings and turns (radians; yaw 0 = profile, π/2 = nose at camera, -π/2 = tail;
//                elev 0 = level, π/2 = straight below). They override the view's own.
//     flip: face left. rot: pitch in radians, + = nose up (the "disdain" tilt), whichever way it faces. It turns the
//           finished drawing, which only reads as a pitch near profile; pitch and bank turn the model itself:
//     pitch: nose up (+) or down (-) in 3D, radians (reads from any view, even head-on). bank: roll in 3D, + = right side
//           (the pilot's right, starboard) down, as in a turn to the right.
//     t: time for the rotors (default T). They're always a blur with streaks, never still blades.
//     light: { on 0..1, aim: world angle (π/2 = straight down), len: px, w: half-angle, cone: false } the searchlight cone
//           from the ball (cone: false lights the lens only, so a scene can paint the beam later, over what it lights).
//     spin 0..1: minigun barrels spinning (spinAng: pass the barrel angle yourself for a slow spin-up); fire 0..1: muzzle flash.
//     gunAim: the minigun's pitch down (radians). pods 0..1: rocket pods glowing and arming. smoke 0..1: damage smoke from
//     the engine (flames from .5). tod: 0 day → 2 night, as rustSky(). key: a boil key if two helis share a frame.
//   heliPt(x, y, s, o, which)       world point of 'light' (lens) | 'gun' (muzzle) | 'podL' | 'podR' (the near and far pod
//                                   mouths) | 'engine' (exhaust) | 'tail', with the same options: aim tracers() and rocket() with it.
//   searchCone(x0, y0, aim, len, k, o)   the searchlight beam on its own (o.w = half-angle, o.col = the light, o.haze = its wash)
//   scanLine(x, yTop, yBottom, k, w, o)  a red laser line sweeping down a character (k 0..1 from yTop to yBottom), w px wide,
//                                   with a faint red wash over what it has scanned. o.from = [x, y]: a fan in from the heli.
//   tracers(x0, y0, x1, y1, t, o)   minigun tracers from the muzzle to the target with dirt kicks where they land. o.rate
//                                   (rounds/s), o.spread (px at the target), o.k 0..1 (thins them out), o.t0/o.t1 (start/stop
//                                   firing: rounds in flight finish), o.hits (false = no kicks)
//   rocket(x0, y0, x1, y1, k, o)    a rocket flying (x0, y0) → (x1, y1), k 0..1 along the flight, with a smoke trail. After k = 1
//                                   it's gone and the trail drifts and fades (gone by k ≈ 2). o.arc (px bulge), o.s (size),
//                                   o.dur (flight seconds, for the smoke's age). Use explosion() (rustsets.js) at (x1, y1).

const HELI = {
  body: '#7D8892', bodyDk: '#5B666F', bodyLt: '#A3AEB6', nose: '#C99A3C', noseDk: '#9A7229', noseLt: '#E2BF6C',
  glass: '#344C58', glassLt: '#8DB2C0', inside: '#24212A', pod: '#66703F', podDk: '#4B5331', podLt: '#87915A', podFace: '#2F3420',
  gun: '#33363C', gunLt: '#7A7F87', metal: '#4B5259', rotor: '#3C4148', tip: '#E3B23A', lamp: '#FFF5D2',
};
const HELI_VIEWS = { side: { yaw: 0, elev: .06, F: 4000 }, q: { yaw: .72, elev: .4, F: 1700 }, front: { yaw: 1.42, elev: .3, F: 1700 },
  below: { yaw: 0, elev: Math.PI / 2, F: 2600 } };

// ---------- the model ----------
// Model space, in px at s = 1: X forward (to the nose), Y up, Z to starboard. Origin = the fuselage centre, under the mast.
// Lofts are stations [X, top, bottom, half-width, roundness]; each cross-section is a rounded box (a superellipse).
const HCAB = [[-128, 56, -38, 44, 2.6], [-110, 62, -50, 50, 2.8], [-80, 66, -62, 56, 3], [-40, 68, -66, 58, 3], [20, 68, -68, 58, 3],
  [70, 68, -68, 58, 3], [100, 66, -68, 56, 3], [125, 57, -66, 54, 2.8], [150, 44, -63, 50, 2.6], [172, 29, -58, 44, 2.4],
  [190, 13, -51, 37, 2.2], [204, -1, -43, 28, 2.1], [214, -13, -35, 18, 2], [220, -23, -30, 8, 2]];
const HCAB_CUTS = [-128, -90, -50, 0, 50, 96, 130, 160, 190, 220];   // shading is painted in these slices; the nose is yellow from 96
const HHUMP = [[-114, 86, 54, 22, 2.4], [-98, 99, 54, 33, 2.6], [-62, 108, 56, 40, 2.8], [20, 110, 58, 40, 2.8], [62, 105, 60, 37, 2.6],
  [86, 90, 60, 28, 2.4], [100, 70, 60, 14, 2.2]];
const HBOOM = [[-100, 62, -12, 28, 2.2], [-236, 61, 8, 20, 2.2], [-372, 58, 27, 13, 2.2]];
const HFIN = [[-334, 56], [-390, 154], [-420, 154], [-410, 66], [-400, 10], [-372, 14], [-354, 30]];
const HSTAB = [[-288, 12, 0], [-310, 76, 12], [-334, 76, 12], [-328, 12, 0]];   // (X, |Z|, lift) of one stabiliser, from the boom's centre height
const HROTOR = { y: 134, R: 280 }, HTAIL = { c: [-396, 122, -18], R: 50 };
const HPOD = { y: -64, z: 106, x0: -76, x1: 56, r: 19 }, HBALL = { c: [197, -57, 0], r: 14 }, HGUN = { pivot: [124, -80, 0] };

const hcr = (a, b, c, d, u) => .5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
function hStation(st, X) {
  let i = 0; while (i < st.length - 2 && X > st[i + 1][0]) i++;
  const a = st[Math.max(0, i - 1)], b = st[i], c = st[i + 1], d = st[Math.min(st.length - 1, i + 2)], u = clamp((X - b[0]) / (c[0] - b[0]));
  return [1, 2, 3, 4].map(k => hcr(a[k], b[k], c[k], d[k], u));
}
// a point on a loft: phi 0 = starboard side, π/2 = top, π = port side (the side we see in profile), 3π/2 = belly
function hSurf(st, X, phi) {
  const [top, bot, hw, n] = hStation(st, X), e = 2 / n, c = Math.cos(phi), s = Math.sin(phi);
  return [X, (top + bot) / 2 + (top - bot) / 2 * Math.sign(s) * Math.pow(Math.abs(s), e), hw * Math.sign(c) * Math.pow(Math.abs(c), e)];
}
function hNormal(st, X, phi) {
  const a = hSurf(st, X + 1.5, phi), b = hSurf(st, X - 1.5, phi), c = hSurf(st, X, phi + .03), d = hSurf(st, X, phi - .03), P = hSurf(st, X, phi);
  const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
  let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const [top, bot] = hStation(st, X);
  if (n[1] * (P[1] - (top + bot) / 2) + n[2] * P[2] < 0) n = n.map(q => -q);
  return n;
}
// sample a loft between the given X cuts (m steps per slice, so neighbouring slices share their edge samples)
function hLoft(st, cuts, m, nphi) {
  const out = [];
  for (let i = 0; i + 1 < cuts.length; i++) for (let j = i ? 1 : 0; j <= m; j++) {
    const X = lerp(cuts[i], cuts[i + 1], j / m);
    for (let k = 0; k < nphi; k++) { const phi = k / nphi * TAU; out.push({ X, phi, P: hSurf(st, X, phi) }); }
  }
  return out;
}
const hNorm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const hCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const hAdd = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
// a circle of radius r around centre c, facing along axis ax
function hCirc(c, ax, r, n = 20, a0 = 0, a1 = TAU) {
  const a = hNorm(ax), u = hNorm(hCross(a, Math.abs(a[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), v = hCross(a, u), out = [];
  const closed = a1 - a0 >= TAU - 1e-6, m = closed ? n : n - 1;
  for (let i = 0; i < n; i++) { const t = lerp(a0, a1, i / m), cs = Math.cos(t) * r, sn = Math.sin(t) * r; out.push([c[0] + u[0] * cs + v[0] * sn, c[1] + u[1] * cs + v[1] * sn, c[2] + u[2] * cs + v[2] * sn]); }
  return out;
}
function hullOf(P) {   // convex hull (monotone chain), counter-clockwise
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
function hThin(P, step) { const out = [P[0]]; for (let i = 1; i < P.length; i++) { const q = out[out.length - 1]; if (Math.hypot(P[i][0] - q[0], P[i][1] - q[1]) >= step) out.push(P[i]); } return out.length >= 3 ? out : P; }

// ---------- camera ----------
function heliCam(o) {
  const v = HELI_VIEWS[o.view] || HELI_VIEWS.side, yaw = o.yaw ?? v.yaw, elev = o.elev ?? v.elev, p = o.pitch || 0, b = o.bank || 0;
  return { cy: Math.cos(yaw), sy: Math.sin(yaw), ce: Math.cos(elev), se: Math.sin(elev), F: o.persp ?? v.F,
    att: !!(p || b), pc: Math.cos(p), ps: Math.sin(p), bc: Math.cos(b), bs: Math.sin(b) };
}
// the model's own attitude: roll about its long axis (X), then pitch about its side axis (Z)
function hAtt(C, P) {
  if (!C.att) return P;
  const y1 = P[1] * C.bc - P[2] * C.bs, z1 = P[1] * C.bs + P[2] * C.bc;
  return [P[0] * C.pc - y1 * C.ps, P[0] * C.ps + y1 * C.pc, z1];
}
// model point → [x, y (screen, down), depth (+ = nearer)] at s = 1, before the 2D rot and flip
function hProj(C, P) {
  P = hAtt(C, P);
  const u = P[0] * C.cy + P[2] * C.sy, d1 = P[0] * C.sy - P[2] * C.cy, v = P[1] * C.ce + d1 * C.se, d = d1 * C.ce - P[1] * C.se, k = C.F / (C.F - d);
  return [u * k, -v * k, d];
}
const hFacing = (C, n) => { n = hAtt(C, n); const l = Math.hypot(n[0], n[1], n[2]) || 1; return ((n[0] * C.sy - n[2] * C.cy) * C.ce - n[1] * C.se) / l; };
// a local (projected) point → world, through the heli's pitch, flip, scale and position
function hWorld(x, y, s, o, p) {
  const r = -(o.rot || 0), c = Math.cos(r), sn = Math.sin(r);
  return [x + (o.flip ? -1 : 1) * s * (p[0] * c - p[1] * sn), y + s * (p[0] * sn + p[1] * c)];
}
function hGunAxis(o) { const g = o.gunAim ?? .07; return { dir: [Math.cos(g), -Math.sin(g), 0], up: [Math.sin(g), Math.cos(g), 0] }; }
function heliPt(x, y, s, o, which) {
  const C = heliCam(o), G = hGunAxis(o);
  if (which === 'light') {
    const [bx, by] = hWorld(x, y, s, o, hProj(C, HBALL.c)), a = o.light?.aim ?? Math.PI / 2, r = HBALL.r * s * .62;
    return [bx + Math.cos(a) * r, by + Math.sin(a) * r];
  }
  const P = which === 'gun' ? hAdd(HGUN.pivot, G.dir, 92) : which === 'podL' ? [HPOD.x1 + 4, HPOD.y, -HPOD.z] : which === 'podR' ? [HPOD.x1 + 4, HPOD.y, HPOD.z]
    : which === 'engine' ? [-138, 104, -33] : which === 'tail' ? HTAIL.c : [0, 0, 0];
  return hWorld(x, y, s, o, hProj(C, P));
}

// ---------- light (additive, like glow(): paint can't brighten) ----------
function lightPoly(pts, col, a, flushed = false) {
  if (a <= .002 || pts.length < 3) return;
  if (!flushed) flushBrush();
  const c = color(col);
  push(); blendMode(ADD); noStroke(); fill(red(c), green(c), blue(c), 255 * clamp(a));
  beginShape(); for (const p of pts) vertex(p[0], p[1]); endShape(CLOSE);
  blendMode(BLEND); pop();
}
function searchCone(x0, y0, aim, len, k = 1, o = {}) {
  k = clamp(k); if (k <= .01 || len < 4) return;
  const half = o.w ?? .16, r0 = o.r0 ?? 8, col = o.col || '#FFF1BE', ca = Math.cos(aim), sa = Math.sin(aim), tn = Math.tan(half);
  const at = (l, w) => [x0 + ca * l - sa * w, y0 + sa * l + ca * w], wid = (l, wk) => (r0 + l * tn) * wk;
  boilSeed((o.key || 'cone') + ' wash');
  const R1 = wid(len, 1), P = [at(0, -r0)];
  for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + Math.PI * i / 12; P.push(at(len + Math.cos(a) * R1 * .32 + jit(2), Math.sin(a) * R1 + jit(2))); }
  P.push(at(0, r0));
  paint(P, { wash: o.haze || '#FFFDF4', washOp: 85 * k, ink: null });   // a near-white haze: a yellow wash would go green over a blue sky
  // the beam: nested wedges, brightest in the core and near the lamp
  flushBrush();
  for (const [wk, a] of [[1, .05], [.75, .055], [.5, .065], [.28, .08]]) for (let i = 0; i < 6; i++) {
    const l0 = len * i / 6, l1 = len * (i + 1) / 6;
    lightPoly([at(l0, -wid(l0, wk)), at(l1, -wid(l1, wk)), at(l1, wid(l1, wk)), at(l0, wid(l0, wk))], col, a * k * (1 - .45 * i / 6), true);
  }
  glow(...at(len, 0), R1 * 1.15, col, .36 * k);   // the pool where it lands
  glow(x0, y0, r0 * 5, col, k);                   // the lamp's flare
}

// ---------- the helicopter ----------
function patrolHeli(x, y, s = 1, o = {}) {
  const C = heliCam(o), t = o.t ?? T, key = 'heli' + (o.key ?? ''), night = clamp((o.tod ?? 0) - 1);
  const K = c => night > 0 ? mixCol(c, '#1C2440', night * .5) : c;
  const sw = clamp(1.95 * s, .6, 2.3) / s;   // the outline weight in model px (the frame is scaled by s), about a character's
  const bs = part => boilSeed(key + ' ' + part);
  const pr = P => hProj(C, P), p2 = P => { const q = hProj(C, P); return [q[0], q[1]]; }, dep = P => hProj(C, P)[2];
  const hullP = Ps => hThin(hullOf(Ps.map(p2)), 5);
  const shape = (Ps, wash, ink = sw, op = 255, j = .6) => { const H2 = hullP(Ps).map(([a, b]) => [a + jit(j), b + jit(j)]); paint(H2, { wash, washOp: op, ink: ink ? PAL.ink : null, sw: ink }); return H2; };
  const outline = (H2, w = sw) => paint(H2, { ink: PAL.ink, sw: w });
  const ring = (Ps, w, col = PAL.ink) => inkLine([...Ps, Ps[0]].map(p2), w, col, 'inkfine', 0);
  const lit = o.light ? clamp(o.light.on ?? 1) : 0, aim = o.light?.aim ?? Math.PI / 2, G = hGunAxis(o);

  // the searchlight beam goes first, so the heli covers where it starts
  if (lit > .01 && o.light.cone !== false) { const [lx, ly] = heliPt(x, y, s, o, 'light'); searchCone(lx, ly, aim, o.light.len ?? 700 * s, lit, { key: key + ' cone', w: o.light.w, col: o.light.col }); }

  push(); translate(x, y); scale((o.flip ? -1 : 1) * s, s); rotate(-(o.rot || 0));
  const parts = [], part = (d, draw) => parts.push({ d, draw });

  // main rotor: a translucent disc behind everything, with blurred blade streaks and yellow tips. Seen nearly level, the
  // streaks on its near half pass in front of the mast; from below, the whole disc is behind the heli.
  const rot = (t * 3.3 + .13) * TAU, hubD = dep([0, HROTOR.y, 0]), split = C.se < .2;
  const disc = Array.from({ length: 48 }, (_, i) => { const a = i / 48 * TAU; return [Math.cos(a) * HROTOR.R, HROTOR.y, Math.sin(a) * HROTOR.R]; });
  const streaks = near => {
    for (let b = 0; b < 4; b++) for (const [rk, span, col, w] of [[.97, .42, HELI.tip, .55], [.84, .62, HELI.rotor, .5], [.6, .5, HELI.rotor, .38]]) {
      const a1 = rot + b * Math.PI / 2, A = Array.from({ length: 9 }, (_, i) => { const a = a1 - span * i / 8; return [Math.cos(a) * HROTOR.R * rk, HROTOR.y, Math.sin(a) * HROTOR.R * rk]; });
      if ((split && dep(A[4]) > hubD + .5) !== near) continue;
      bs('streak' + b + rk); inkLine(A.map(p2), sw * w, K(col), 'ink', .5);
    }
  };
  part(-1e5, () => { bs('rotor'); paint(hullOf(disc.map(p2)), { wash: K(HELI.rotor), washOp: 58, ink: null }); streaks(false); });
  part(1e5, () => streaks(true));

  // tail: boom, fin, stabilisers and the tail rotor on the fin's port side
  part(dep([-330, 40, 0]) - 60, () => {
    const stab = sz => { bs('stab' + sz); const Ps = []; for (const [X, Z, l] of HSTAB) for (const dy of [-3.5, 3.5]) Ps.push([X, 40 + l + dy, Z * sz]); shape(Ps, K(HELI.body), sw * .7); };
    stab(1);
    bs('fin'); const fin = []; for (const [X, Y] of HFIN) for (const z of [-5, 5]) fin.push([X, Y, z]);
    shape(fin, K(HELI.body), sw * .85);
    bs('boom'); const boom = hLoft(HBOOM, [-100, -236, -372], 5, 18);
    const BH = shape(boom.map(q => q.P), K(HELI.body), 0);
    const low = boom.filter(q => Math.sin(q.phi) < -.4 && hFacing(C, hNormal(HBOOM, q.X, q.phi)) > -.1).map(q => q.P);
    if (low.length > 2) paint(hullP(low), { wash: K(HELI.bodyDk), washOp: 255, ink: null });
    outline(BH, sw * .9);
    stab(-1);
    // tail rotor: gearbox hub, a blurred disc, streaks
    bs('trotor'); const tc = HTAIL.c, td = hCirc(tc, [0, 0, 1], HTAIL.R, 28);
    paint(hullP(td), { wash: K(HELI.rotor), washOp: 62, ink: null });
    ring(td, sw * .22, K(HELI.rotor));
    const tr = (t * 3.75 + .4) * TAU;
    for (let b = 0; b < 4; b++) for (const [rk, span, col, w] of [[.95, .7, HELI.tip, .5], [.66, .8, HELI.rotor, .4]]) {
      const a1 = tr + b * Math.PI / 2; bs('tstreak' + b + rk);
      inkLine(Array.from({ length: 7 }, (_, i) => p2([tc[0] + Math.cos(a1 - span * i / 6) * HTAIL.R * rk, tc[1] + Math.sin(a1 - span * i / 6) * HTAIL.R * rk, tc[2]])), sw * w, K(col), 'ink', .5);
    }
    bs('thub'); shape([...hCirc([tc[0], tc[1], -5], [0, 0, 1], 9, 12), ...hCirc(tc, [0, 0, 1], 7, 12)], K(HELI.metal), sw * .5);
  });

  // engine cowling on the roof, with its exhausts, intake and roundel; the mast and hub on top
  part(dep([0, 90, 0]) - 40, () => {
    const exhaust = sz => { bs('exh' + sz); const a = [-96, 94, 17 * sz], b = [-138, 104, 33 * sz], ax = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      shape([...hCirc(a, ax, 12, 14), ...hCirc(b, ax, 12.5, 14)], K(HELI.metal), sw * .7);
      const E = hCirc(b, ax, 9.5, 14); if (hFacing(C, ax) > -.3) paint(hullP(E), { wash: '#211E22', ink: null }); };
    exhaust(1);
    bs('hump'); const hump = hLoft(HHUMP, [-114, -62, 20, 62, 100], 3, 20);
    const HH = shape(hump.map(q => q.P), K(HELI.body), 0);
    const up = hump.filter(q => q.phi > Math.PI / 2 + .35 && q.phi < Math.PI - .1 && hFacing(C, hNormal(HHUMP, q.X, q.phi)) > .05).map(q => q.P);
    if (up.length > 2) paint(hullP(up), { wash: K(HELI.bodyLt), washOp: 150, ink: null });
    outline(HH, sw * .9);
    if (hFacing(C, hNormal(HHUMP, 60, Math.PI - .2)) > .12) {   // the intake on the near side
      bs('intake'); const ip = (X, ph) => hSurf(HHUMP, X, ph);
      const IN = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * TAU; return ip(64 + Math.cos(a) * 11, Math.PI - .25 + Math.sin(a) * .42); });
      paint(IN.map(p2), { wash: '#26232A', ink: PAL.ink, sw: sw * .45 });
    }
    exhaust(-1);
    bs('mast'); shape([...hCirc([0, 100, 0], [0, 1, 0], 7, 10), ...hCirc([0, 128, 0], [0, 1, 0], 7, 10)], K(HELI.metal), sw * .55);
    bs('hub'); shape([...hCirc([0, 126, 0], [0, 1, 0], 21, 16), ...hCirc([0, 136, 0], [0, 1, 0], 18, 16)], K(HELI.metal), sw * .6);
    shape([...hCirc([0, 136, 0], [0, 1, 0], 8, 10), ...hCirc([0, 143, 0], [0, 1, 0], 5, 10)], K(HELI.gunLt), sw * .4);
  });

  // the fuselage: grey cabin, yellow cockpit, darker belly and a light band along the upper side, then the outline and details
  part(0, () => {
    bs('cabin'); const cab = hLoft(HCAB, HCAB_CUTS, 4, 28);
    const H0 = hullP(cab.map(q => q.P)).map(([a, b]) => [a + jit(.6), b + jit(.6)]);
    paint(H0, { wash: K(HELI.body), ink: null });
    paint(hullP(cab.filter(q => q.X >= 96).map(q => q.P)), { wash: K(HELI.nose), ink: null });
    for (const q of cab) q.f = hFacing(C, hNormal(HCAB, q.X, q.phi));
    const bands = (sel, gc, yc, op) => { for (let i = 0; i + 1 < HCAB_CUTS.length; i++) {
      const Q = cab.filter(q => q.X >= HCAB_CUTS[i] - .01 && q.X <= HCAB_CUTS[i + 1] + .01 && sel(q)).map(q => q.P);
      if (Q.length > 2) paint(hullP(Q), { wash: K(HCAB_CUTS[i] >= 96 ? yc : gc), washOp: op, ink: null }); } };
    bands(q => Math.sin(q.phi) < -.45 && q.f > -.1, HELI.bodyDk, HELI.noseDk, 255);
    bands(q => q.phi > Math.PI / 2 + .5 && q.phi < Math.PI - .3 && q.f > .05, HELI.bodyLt, HELI.noseLt, 170);
    outline(H0);
    // details are drawn in surface coordinates (X, phi) and only where that bit of hull faces us
    const lift = (Q, n = 4) => { const out = []; for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length]; for (let k = 0; k < n; k++) out.push(hSurf(HCAB, lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n))); } return out; };
    const faces = Q => { let X = 0, ph = 0; for (const q of Q) { X += q[0]; ph += q[1]; } return hFacing(C, hNormal(HCAB, X / Q.length, ph / Q.length)); };
    const PI = Math.PI;
    const glass = (Q, nm) => { if (faces(Q) < .1) return; bs('glass' + nm); paint(lift(Q).map(p2), { wash: K(HELI.glass), ink: PAL.ink, sw: sw * .42 });
      const xs = Q.map(q => q[0]), ps = Q.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), f0 = Math.min(...ps), f1 = Math.max(...ps), w = x1 - x0;
      paint(lift([[x0 + w * .3, f0 + .06], [x0 + w * .46, f0 + .06], [x0 + w * .3, f1 - .04], [x0 + w * .14, f1 - .04]], 2).map(p2), { wash: K(HELI.glassLt), washOp: 150, ink: null }); };
    const panel = (Q, col, nm, w = .42) => { if (faces(Q) < .1) return; bs('panel' + nm); paint(lift(Q).map(p2), { wash: K(col), ink: PAL.ink, sw: sw * w }); };
    panel([[22, PI - .92], [94, PI - .92], [94, PI + .86], [22, PI + .86]], HELI.inside, 'door');               // the open doorway
    if (faces([[50, PI]]) > .1) { bs('seat'); inkLine(lift([[30, PI + .2], [86, PI + .2]], 3).slice(0, 4).map(p2), sw * .3, '#4A4550', 'inkfine', 0); }
    panel([[-74, PI - .97], [22, PI - .97], [22, PI + .86], [-74, PI + .86]], mixCol(HELI.body, HELI.bodyLt, .3), 'slide');   // the slid-back door
    glass([[-64, PI - .8], [-30, PI - .8], [-30, PI - .2], [-64, PI - .2]], 'w1');
    glass([[-22, PI - .8], [12, PI - .8], [12, PI - .2], [-22, PI - .2]], 'w2');
    glass([[-120, PI - .62], [-100, PI - .62], [-100, PI - .2], [-120, PI - .2]], 'w3');
    glass([[100, PI - .98], [130, PI - 1.06], [160, PI - 1.1], [181, PI - 1.04], [190, PI - .55], [186, PI - .02], [100, PI - .02]], 'cockpit');
    glass([[148, PI + .22], [184, PI + .14], [200, PI + .5], [192, PI + .95], [164, PI + 1.02], [148, PI + .7]], 'chin');
    glass([[104, PI / 2 + .08], [166, PI / 2 + .08], [168, PI / 2 + .44], [104, PI / 2 + .44]], 'wsP');
    glass([[104, PI / 2 - .44], [168, PI / 2 - .44], [166, PI / 2 - .08], [104, PI / 2 - .08]], 'wsS');
    // seams: the yellow cockpit's edge, the rear cabin and a belly line
    bs('seams');
    const seam = (Q, w) => { const L = lift(Q, 6).slice(0, (Q.length - 1) * 6 + 1); let run = []; const flush = () => { if (run.length > 1) inkLine(run.map(p2), w, PAL.ink, 'inkfine', 0); run = []; };
      for (let i = 0; i < L.length; i++) { const q = cabQ(L[i]); if (q > .05) run.push(L[i]); else flush(); } flush(); };
    const cabQ = P => { const ph = Math.atan2(P[1] - (hStation(HCAB, P[0])[0] + hStation(HCAB, P[0])[1]) / 2, P[2]); return hFacing(C, hNormal(HCAB, P[0], ph < 0 ? ph + TAU : ph)); };
    seam([[96, PI / 2 + .02], [96, PI], [96, 3 * PI / 2 - .05]], sw * .35);
    seam([[-92, PI - .9], [-92, PI + .8]], sw * .3);
    seam([[-124, PI + .45], [-74, PI + .45]], sw * .3);
    // the pitot probe on the nose
    bs('pitot'); inkLine([hSurf(HCAB, 212, PI / 2), [236, -8, 0]].map(p2), sw * .4, PAL.ink, 'inkfine', 0);
  });

  // stub pylons and rocket pods (an olive cylinder, a darker band, a honeycomb of tubes in front)
  const pod = sz => {
    const zc = HPOD.z * sz, yc = HPOD.y, ar = [1, 0, 0], arm = clamp(o.pods || 0);
    bs('pylon' + sz); const py = []; for (const X of [-26, 30]) { py.push([X, -36, 50 * sz], [X, -26, 50 * sz], [X, -42, 108 * sz], [X, -32, 108 * sz]); }
    shape(py, K(sz > 0 ? HELI.bodyDk : HELI.body), sw * .6);
    bs('strut' + sz); const st = []; for (const X of [-12, 18]) for (const Y of [-48, -38]) for (const Z of [-4, 4]) st.push([X, Y, zc + Z]); shape(st, K(HELI.metal), sw * .4);
    bs('pod' + sz); const c0 = [HPOD.x0, yc, zc], c1 = [HPOD.x1, yc, zc];
    const body = [...hCirc(c0, ar, HPOD.r, 20), ...hCirc(c1, ar, HPOD.r, 20), ...hCirc([HPOD.x0 - 18, yc, zc], ar, 9, 12)];
    const PH = shape(body, K(sz > 0 ? HELI.podDk : HELI.pod), 0);
    paint(hullP([...hCirc([HPOD.x0 + 10, yc + 6, zc], ar, HPOD.r - 7, 12), ...hCirc([HPOD.x1 - 30, yc + 6, zc], ar, HPOD.r - 7, 12)]), { wash: K(HELI.podLt), washOp: 120, ink: null });
    paint(hullP([...hCirc([30, yc, zc], ar, HPOD.r + .5, 18), ...hCirc([40, yc, zc], ar, HPOD.r + .5, 18)]), { wash: K(HELI.podDk), ink: null });
    outline(PH, sw * .7);
    const face = hFacing(C, ar), holes = [[0, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos(i / 6 * TAU) * 11, Math.sin(i / 6 * TAU) * 11])];
    const ht = mixCol('#C0442E', '#FFB050', arm);
    for (const [hy, hz] of holes) {   // rocket noses peeking out (they slide out as the pods arm)
      const tip = [[HPOD.x1, yc + hy - 3, zc + hz], [HPOD.x1, yc + hy + 3, zc + hz], [HPOD.x1 + 5 + 7 * arm, yc + hy, zc + hz]];
      if (face < .35) { bs('tip' + sz + hy + hz); paint(tip.map(p2), { wash: K(ht), ink: PAL.ink, sw: sw * .25 }); }
    }
    if (face > .05) {
      bs('face' + sz); const F = hCirc(c1, ar, HPOD.r - 1, 20); paint(F.map(p2), { wash: K(HELI.podFace), ink: PAL.ink, sw: sw * .45 });
      for (const [hy, hz] of holes) { const Hc = hCirc([HPOD.x1 + .5, yc + hy, zc + hz], ar, 4.2, 10); paint(Hc.map(p2), { wash: arm > .05 ? mixCol('#3A1C14', '#FFB050', arm) : '#18161A', ink: null }); }
    }
    if (arm > .02) {   // armed: the mouths glow hot orange, pulsing, and a little red light blinks on the pylon
      const m = p2([HPOD.x1 + 4, yc, zc]), fl = .7 + .3 * Math.sin(t * 14), hot = mixCol('#FF6A1E', '#FFD27A', .5 + .5 * Math.sin(t * 14));
      bs('hot' + sz); paint(hCirc([HPOD.x1 + 1, yc, zc], ar, HPOD.r + 1, 18).map(p2), { wash: hot, washOp: 235 * arm, ink: PAL.ink, sw: sw * .4 });   // the pod's mouth, red-hot
      for (const [hy, hz] of holes) { const c = p2([HPOD.x1 + 2, yc + hy, zc + hz]); paint(ellPts(c[0], c[1], 2.6, 2.6, 6), { wash: '#FFF2B0', washOp: 255 * arm, ink: null }); }
      glow(m[0], m[1], (46 + 30 * arm) * fl, '#FF8A3A', arm * fl);
      glow(m[0], m[1], 18 * fl, '#FFE0A0', arm);
      if (frac(t * 3) < .5) { const L = p2([20, -44, 104 * sz]); glow(L[0], L[1], 14, '#FF3048', arm); paint(ellPts(L[0], L[1], 3, 3, 8), { wash: '#FF5A6A', ink: null }); }
    }
  };
  part(dep([-10, -50, -106]), () => pod(-1));
  part(dep([-10, -50, 106]), () => pod(1));

  // skids and their cross tubes. Seen from the front or below, the struts are drawn about half as long (skL), so the skids
  // sit close under the belly as in the game shots instead of splaying out like a lander's legs; the profile is unchanged.
  const skL = 26 * clamp((C.se - .12) / .25);
  const skid = sz => {
    bs('skid' + sz); const P = [[-112, -118 + skL, 66 * sz], [146, -118 + skL, 66 * sz], [164, -114 + skL, 66 * sz], [176, -104 + skL, 66 * sz], [182, -96 + skL, 66 * sz]];
    paint(ribbon(P.map(p2), 11, 10), { wash: K(sz > 0 ? '#3E444A' : HELI.metal), ink: PAL.ink, sw: sw * .55 });
  };
  const tubes = sz => { for (const X of [-62, 82]) {
    bs('tube' + sz + X); const b = hStation(HCAB, X)[1];
    paint(ribbon([[X, -118 + skL, 66 * sz], [X, -101 + skL, 64 * sz], [X, b - 3, 46 * sz], [X, b + 1, 20 * sz], [X, b + 2, 0]].map(p2), 8.5, 8), { wash: K(sz > 0 ? '#3E444A' : HELI.metal), ink: PAL.ink, sw: sw * .45 });
  } };
  part(dep([120, -112, -66]), () => skid(-1));
  part(dep([120, -112, 66]), () => skid(1));
  part(dep([17, -96, -44]), () => tubes(-1));
  part(dep([17, -96, 44]), () => tubes(1));

  // chin minigun: a mount, a housing and six barrels that really turn
  part(dep([160, -84, 0]) + 5, () => {
    const pv = HGUN.pivot, g = G.dir, at = k => hAdd(pv, g, k), spin = clamp(o.spin || 0), spA = o.spinAng ?? t * TAU * 2.1 * spin;   // ~30° a frame at full spin: six barrels strobe into a blur
    bs('gmount'); const dome = []; for (let i = 0; i <= 4; i++) for (let j = 0; j < 12; j++) { const a = i / 4 * Math.PI / 2, b = j / 12 * TAU; dome.push([126 + Math.cos(a) * Math.cos(b) * 16, -64 - Math.sin(a) * 15, Math.cos(a) * Math.sin(b) * 16]); }
    shape(dome, K(HELI.gun), sw * .5);
    bs('ghouse'); shape([...hCirc(at(-16), g, 11, 14), ...hCirc(at(28), g, 10, 14)], K(HELI.gun), sw * .6);
    bs('gcluster'); shape([...hCirc(at(28), g, 8, 14), ...hCirc(at(92), g, 7.5, 14)], K('#2A2C31'), sw * .5);
    // barrels, back to front: the near ones light, the far ones dark
    const e2 = [0, 0, 1], B = [];
    for (let i = 0; i < 6; i++) { const a = spA + i / 6 * TAU, off = hAdd(hAdd([0, 0, 0], G.up, Math.cos(a) * 5.2), e2, Math.sin(a) * 5.2); B.push({ a: hAdd(at(30), off), b: hAdd(at(91), off), d: dep(hAdd(at(60), off)) }); }
    B.sort((p, q) => p.d - q.d);
    const blur = spin > .35;
    B.forEach((br, i) => { if (i < 3) return; bs('barrel' + i); inkLine([p2(br.a), p2(br.b)], sw * (blur ? .32 : .42), K(i > 4 ? HELI.gunLt : '#5A5E66'), 'inkfine', 0); });
    if (blur) {   // spinning: a pale blur round the barrels and spin arcs at the muzzle
      bs('gblur'); shape([...hCirc(at(32), g, 8.5, 14), ...hCirc(at(93), g, 8.5, 14)], K('#C4C8CE'), 0, 120);
      for (const k of [-3.5, 0, 3.5]) inkLine([p2(hAdd(at(34), G.up, k)), p2(hAdd(at(88), G.up, k))], sw * .22, K('#8A8E96'), 'inkfine', 0);
      const sa = t * 23;
      for (const [k, r] of [[60, 12], [86, 14]]) { bs('garc' + k); inkLine(hCirc(at(k), g, r, 9, sa + k, sa + k + 2.4).map(p2), sw * .3, K('#6E737B'), 'inkfine', .4); inkLine(hCirc(at(k), g, r, 9, sa + k + Math.PI, sa + k + Math.PI + 2.4).map(p2), sw * .3, K('#6E737B'), 'inkfine', .4); }
    }
    bs('gring'); shape([...hCirc(at(74), g, 9, 14), ...hCirc(at(81), g, 9, 14)], K(HELI.gunLt), sw * .35);
    if (hFacing(C, g) > .15) { bs('gface'); paint(hCirc(at(92), g, 7.5, 14).map(p2), { wash: '#1E1D22', ink: PAL.ink, sw: sw * .3 });
      for (let i = 0; i < 6; i++) { const a = spA + i / 6 * TAU, c = p2(hAdd(hAdd(at(92.5), G.up, Math.cos(a) * 5.2), e2, Math.sin(a) * 5.2)); paint(ellPts(c[0], c[1], 1.6, 1.6, 6), { wash: '#6A6E76', ink: null }); } }
  });

  // the ball searchlight under the nose, its lens turned to the beam
  part(dep(HBALL.c) + 6, () => {
    bs('ball'); const c = pr(HBALL.c), r = HBALL.r * C.F / (C.F - c[2]);
    paint(ellPts(c[0], c[1], r, r, 18), { wash: K('#454A51'), ink: PAL.ink, sw: sw * .55 });
    paint(ellPts(c[0] - r * .3, c[1] - r * .35, r * .42, r * .3, 10), { wash: K('#6E747C'), washOp: 200, ink: null });
    const fx = o.flip ? -1 : 1, wx = fx * Math.cos(aim), wy = Math.sin(aim), rr = o.rot || 0, la = Math.atan2(wx * Math.sin(rr) + wy * Math.cos(rr), wx * Math.cos(rr) - wy * Math.sin(rr));
    const lx = c[0] + Math.cos(la) * r * .5, ly = c[1] + Math.sin(la) * r * .5;
    paint(ellPts(lx, ly, r * .42, r * .7, 14, 0, la), { wash: lit > .05 ? mixCol('#8A9298', HELI.lamp, lit) : K('#2E3A42'), ink: PAL.ink, sw: sw * .35 });
    if (lit > .05) glow(lx, ly, r * 3.4, '#FFF1BE', lit);
  });

  // muzzle flash on top of everything
  if ((o.fire || 0) > .01) part(2e5, () => {
    const f = clamp(o.fire), fl = .65 + .35 * hash(Math.floor(t * 24) + 7), m = p2(hAdd(HGUN.pivot, G.dir, 94)), m2 = p2(hAdd(HGUN.pivot, G.dir, 120));
    const ang = Math.atan2(m2[1] - m[1], m2[0] - m[0]), L = 46 * f * fl;
    glow(m[0], m[1], 80 * f * fl, '#FFD27A', f);
    bs('flash'); push(); translate(m[0], m[1]); rotate(ang);
    const P = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, out = i % 2 ? .32 : (i === 0 ? 1 : .5 + .2 * hash(i + Math.floor(t * 24))); P.push([Math.cos(a) * L * out * (Math.cos(a) > 0 ? 1 : .45), Math.sin(a) * L * out * .62]); }
    paint(P, { wash: '#FFE9A8', ink: PAL.ink, sw: sw * .45 });
    paint(P.map(([a, b]) => [a * .45, b * .45]), { wash: '#FFFBEA', ink: null });
    pop();
  });

  parts.sort((a, b) => a.d - b.d); for (const p of parts) p.draw();
  pop();
  if ((o.smoke || 0) > .01) heliSmoke(x, y, s, o, t, key);
}

// Damage smoke: dark puffs pour out of the engine, rise and trail behind; from smoke .5, flames lick at the exhaust.
function heliSmoke(x, y, s, o, t, key) {
  const k = clamp(o.smoke), [ex, ey] = heliPt(x, y, s, o, 'engine'), back = o.flip ? 1 : -1;
  if (k > .5) {
    const f = (k - .5) * 2, fl = 1 + .18 * Math.sin(t * 31) + .1 * Math.sin(t * 47);
    glow(ex, ey, 60 * s * f, '#FF9A3A', .9 * f);
    boilSeed(key + ' flame');
    paint([[ex - 10 * s, ey + 4 * s], [ex + back * 26 * s * fl, ey - 6 * s], [ex + back * 34 * s * fl, ey - 30 * s * fl], [ex + 4 * s, ey - 16 * s]], { wash: '#F28A2E', ink: PAL.ink, sw: .6, curv: .4 });
    paint([[ex - 4 * s, ey], [ex + back * 18 * s * fl, ey - 8 * s], [ex + 2 * s, ey - 12 * s]], { wash: '#FFE08A', ink: null });
  }
  const P = [];
  for (let i = 0; i < 9; i++) { const ph = frac(t * .75 + i / 9); P.push({ i, ph }); }
  P.sort((a, b) => b.ph - a.ph);
  for (const { i, ph } of P) {
    const sx = ex + back * 150 * s * ph + 14 * s * Math.sin(i * 2.1 + t * 2), sy = ey - 170 * s * ph * (.8 + .3 * hash(i)), r = (10 + 44 * Math.sqrt(ph)) * s * (.55 + .45 * k);
    boilSeed(key + ' smoke' + i);
    paint(ellPts(sx, sy, r, r * .88, 14, 1.5 * s), { wash: mixCol('#3B3739', '#A29EA0', ph), washOp: 235 * k * Math.pow(1 - ph, .8), ink: ph < .3 ? PAL.ink : null, sw: .6 });
  }
}

// ---------- the scan, tracers and rockets (world space) ----------
function scanLine(x, yTop, yBottom, k, w = 220, o = {}) {
  if (k < 0 || k > 1) return;
  const y = lerp(yTop, yBottom, k), x0 = x - w / 2, x1 = x + w / 2, a = o.a ?? 1, red = '#E8202E', key = o.key ?? 'scan';
  boilSeed(key);
  if (o.from) {   // the scanner's fan, in from the heli
    const [fx, fy] = o.from;
    paint([[fx, fy], [x1, y], [x0, y]], { wash: '#E8484A', washOp: 24 * a, ink: null });
    lightPoly([[fx, fy], [x1, y], [x0, y]], '#FF3040', .1 * a);
    for (const ex of [x0, x1]) inkLine([[fx, fy], [ex, y]], .4, red, 'inkfine', 0);
  }
  // what it has scanned: a faint red wash that fades upward from the line (graded bands, a little red light), and a few
  // fading scan lines
  const h = y - yTop;
  if (h > 3) {
    const cuts = [0, Math.min(30, h), Math.min(80, h), h], ops = [30, 12, 0];
    for (let i = 0; i < 3; i++) { const b0 = cuts[i], b1 = cuts[i + 1], ww = w * (1 - .04 * i); if (b1 - b0 > 2) paint(rectPts(x - ww / 2, y - b1, ww, b1 - b0, 1), { wash: '#E5333D', washOp: ops[i] * a, ink: null }); }
    lightPoly([[x0, y - Math.min(60, h)], [x1, y - Math.min(60, h)], [x1, y], [x0, y]], '#FF3A46', .05 * a);
  }
  for (let i = 1; i <= 3; i++) if (y - i * 17 > yTop + 2) inkLine([[x0 + 10, y - i * 17], [x1 - 10, y - i * 17]], .35, mixCol(red, '#F6D7D2', .25 + i * .18), 'inkfine', 0);
  // the beam itself: a glowing red line with a hot core and bracket ends
  lightPoly([[x0, y - 9], [x1, y - 9], [x1, y + 9], [x0, y + 9]], '#FF2A3A', .22 * a);
  for (let i = 0; i < 4; i++) glow(lerp(x0, x1, (i + .5) / 4), y, w * .2, '#FF2A3A', .6 * a);
  inkLine([[x0, y], [x1, y]], 1.6, red, 'ink', 0);
  inkLine([[x0 + 8, y], [x1 - 8, y]], .55, '#FFE6E2', 'inkfine', 0);
  for (const [ex, d] of [[x0, 1], [x1, -1]]) inkLine([[ex + d * 14, y - 12], [ex, y - 12], [ex, y + 12], [ex + d * 14, y + 12]], .75, red, 'inkfine', 0);
}

function tracers(x0, y0, x1, y1, t, o = {}) {
  const k = o.k ?? 1; if (k <= 0) return;
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, dx = (x1 - x0) / L, dy = (y1 - y0) / L, rate = o.rate ?? 16, spread = o.spread ?? 50;
  const fly = o.fly ?? clamp(L / 2600, .06, .4), len = o.len ?? Math.min(120, L * .22), n0 = Math.floor(t * rate), key = o.key ?? 'tr';
  for (let j = Math.ceil((fly + .25) * rate); j >= 0; j--) {
    const i = n0 - j, t0 = i / rate, age = t - t0;
    if (age < 0 || (o.t0 != null && t0 < o.t0) || (o.t1 != null && t0 > o.t1) || hash(i * 1.37 + 5) > k) continue;
    const off = (hash(i * 7.13 + 3) - .5) * spread, along = (hash(i * 2.91 + 1) - .5) * spread * .5;
    const tx = x1 - dy * off + dx * along, ty = y1 + dx * off + dy * along, p = age / fly;
    boilSeed(key + i);
    if (p < 1) {
      const q0 = Math.max(0, p - len / L), hx = lerp(x0, tx, p), hy = lerp(y0, ty, p), sx = lerp(x0, tx, q0), sy = lerp(y0, ty, q0);
      // a short yellow-orange streak, tapered to its tail, a pale-yellow core and only a small glow at the tip (a big
      // round glow per round read as a string of pearls)
      const w = o.w ?? 3.2, nx = -(hy - sy), ny = hx - sx, nl = Math.hypot(nx, ny) || 1, ox = nx / nl * w, oy = ny / nl * w;
      paint([[sx, sy], [lerp(sx, hx, .7) + ox, lerp(sy, hy, .7) + oy], [hx + ox * .6, hy + oy * .6], [hx + dx * w * 1.5, hy + dy * w * 1.5], [hx - ox * .6, hy - oy * .6], [lerp(sx, hx, .7) - ox, lerp(sy, hy, .7) - oy]], { wash: '#FFAE34', washOp: 235, ink: null });
      inkLine([[lerp(sx, hx, .45), lerp(sy, hy, .45)], [hx, hy]], .7, '#FFF4B8', 'inkfine', 0);
      glow(hx, hy, 12, '#FFC24A', .55);
    } else if (o.hits !== false) {
      const a = age - fly; if (a > .28) continue;
      const kk = a / .28, r = 8 + 34 * Math.sqrt(kk);
      if (a < .06) glow(tx, ty, 40, '#FFC24A', 1 - a / .06);
      paint(ellPts(tx, ty - 30 * kk, r, r * .8, 12, 1.5), { wash: o.dirt || '#A88E6A', washOp: 230 * (1 - kk), ink: kk < .4 ? PAL.ink : null, sw: .5 });
      if (a < .12) for (let m = 0; m < 3; m++) { const an = -Math.PI / 2 + (m - 1) * .6 + (hash(i + m) - .5) * .4, l0 = 6 + 50 * a / .12; inkLine([[tx + Math.cos(an) * l0 * .4, ty + Math.sin(an) * l0 * .4], [tx + Math.cos(an) * l0, ty + Math.sin(an) * l0]], .6, '#FFD46A', 'inkfine', 0); }
    }
  }
}

function rocket(x0, y0, x1, y1, k, o = {}) {
  if (k < 0 || k > 2.2) return;
  const s = o.s ?? 1, arc = o.arc ?? 0, wob = (o.wob ?? 7) * s, dur = o.dur ?? .6, key = o.key ?? 'rkt', L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  const at = q => { const [ax, ay] = arcPt([x0, y0], [x1, y1], arc, q), w = wob * Math.sin(q * 11 + x0 * .01) * Math.sin(q * Math.PI); return [ax + nx * w, ay + ny * w]; };
  // the smoke trail: one soft streak along the flown path (no outline), thin and white at the rocket, wider and greyer
  // toward the launcher, the oldest end fading first; after impact it spreads and thins out (gone by k ≈ 2)
  const head = Math.min(k, 1), qmin = Math.max(0, k - 1.15 / dur), after = Math.max(0, k - 1);
  if (head - qmin > .02) {
    const n = 14, P = [], Pn = [];
    for (let i = 0; i <= n; i++) { const q = lerp(qmin, head, i / n), age = (k - q) * dur, [px, py] = at(q); P.push([px + 6 * s * Math.sin(q * 17 + x0 * .01) * Math.min(1, age * 3), py - age * 30 * s]); }
    const wOld = (14 + 34 * Math.sqrt(Math.min(1.15, (k - qmin) * dur))) * s * (1 + after * 1.2), fade = clamp(1 - after * 1.05);
    boilSeed(key + ' trail');
    paint(ribbon(P, wOld, 4 * s), { wash: '#C9C5CC', washOp: 120 * fade, ink: null });
    for (let i = Math.floor(n * .45); i <= n; i++) Pn.push(P[i]);   // the young end: brighter, narrower
    if (Pn.length > 2) paint(ribbon(Pn, wOld * .5, 2.5 * s), { wash: '#FBF8F2', washOp: 190 * fade, ink: null });
    for (let i = 1; i < 4; i++) {   // a few soft lumps along the older part, for texture
      const j = Math.floor(n * i / 7), [px, py] = P[j], r = wOld * (.42 - .06 * i);
      boilSeed(key + ' lump' + i); paint(ellPts(px, py, r, r * .8, 12, 1.5 * s), { wash: '#B4B0B8', washOp: 70 * fade, ink: null });
    }
  }
  if (k > 1) return;
  const [rx, ry] = at(k), [bx, by] = at(Math.max(0, k - .015)), ang = Math.atan2(ry - by, rx - bx) || Math.atan2(y1 - y0, x1 - x0);
  const fl = 1 + .25 * Math.sin(k * 90) + .15 * hash(Math.floor(k * 200));
  glow(rx - Math.cos(ang) * 28 * s, ry - Math.sin(ang) * 28 * s, 50 * s, '#FFB347', 1);
  boilSeed(key + ' body');
  push(); translate(rx, ry); rotate(ang); scale(s);
  paint([[-20, -6], [-20 - 30 * fl, 0], [-20, 6]], { wash: '#F28A2E', ink: null });
  paint([[-20, -3.5], [-20 - 17 * fl, 0], [-20, 3.5]], { wash: '#FFF0A0', ink: null });
  for (const d of [-1, 1]) paint([[-20, 4 * d], [-28, 11 * d], [-12, 5 * d]], { wash: '#4A4E44', ink: PAL.ink, sw: .5 });
  paint(rrPts(-21, -5, 36, 10, 4), { wash: '#9AA08A', ink: PAL.ink, sw: .7 });
  paint([[14, -5], [27, 0], [14, 5]], { wash: '#C0442E', ink: PAL.ink, sw: .6 });
  pop();
}

// ---------- model sheet (studio.html?ep=0&loop=heli) ----------
(() => {
  LOOPS.heli = t => {
    boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE6D6', ink: null });
    // 1. profile: rotors blurring, minigun spinning and firing, then the pods arm and it tips its nose up in disdain
    patrolHeli(590, 318, 1.25, { view: 'side', t, spin: 1, fire: t < .6 ? 1 : 0, pods: t < .6 ? 0 : 1, rot: .2 * ease(seg(t, .5, .85)) });
    boilSeed('div'); for (const yy of [575, 1335]) inkLine([[0, yy], [W, yy]], .6, PAL.ink, 'inkfine', 0);
    // 2. the scan: hovering overhead in 3/4 from below, searchlight on the Naked, the red line sweeping him head to toe
    boilSeed('skyB'); paint(rectPts(-20, 590, W + 40, 620), { wash: '#A9D2E3', ink: null });
    paint(rectPts(-20, 1080, W + 40, 120), { wash: '#CFE7E8', washOp: 200, ink: null });
    boilSeed('hillB'); const hl = [[-20, 1196]]; for (let i = 0; i <= 12; i++) hl.push([i * 95 - 20, 1150 - 26 * Math.sin(i * 1.3) - 14 * hash(i)]); hl.push([W + 20, 1196]); paint(hl, { wash: '#7FA38C', ink: null });
    boilSeed('grassB'); paint(rectPts(-20, 1190, W + 40, 140), { wash: '#86A75C', ink: PAL.ink, sw: .8 });
    const nx = 420, ny = 1305, u = 27, hx = 610 + 8 * Math.sin(t * 2.1), hy = 800 + 7 * Math.sin(t * 3.2);
    spawnling(nx, ny, u, { ...feel('scared', t), view: 'front', prop: 'rock' });
    const ho = { view: 'q', t, light: { on: 1, aim: 0 }, spin: 0 };
    const lp = heliPt(hx, hy, .85, ho, 'light'); ho.light = { on: 1, aim: Math.atan2(ny - 230 - lp[1], nx - lp[0]), len: Math.hypot(ny - 200 - lp[1], nx - lp[0]) };
    patrolHeli(hx, hy, .85, ho);
    scanLine(nx, ny - 13.6 * u, ny + 4, ease(clamp(t / 1.7)), 230, { from: heliPt(hx, hy, .85, ho, 'light') });
    // 3. from below, and a strafing run: tracers raking the ground and a rocket on its way down
    boilSeed('skyC'); paint(rectPts(-20, 1350, W + 40, 460), { wash: '#A9D2E3', ink: null });
    boilSeed('groundC'); paint(rectPts(-20, 1800, W + 40, 140), { wash: '#86A75C', ink: PAL.ink, sw: .8 });
    paint(ellPts(560, 1830, 190, 22, 18, 3), { wash: '#9C8160', washOp: 200, ink: null });
    patrolHeli(245, 1560, .5, { view: 'below', t, key: 'b', spin: 1 });
    const so = { view: 'side', flip: true, rot: -.2, t, spin: 1, fire: 1, pods: 1, smoke: .9, key: 's' }, sx = 830, sy = 1460;
    const rk = ((t + .25) % 1.3) / .8, [px, py] = heliPt(sx, sy, .42, so, 'podL'), [gx, gy] = heliPt(sx, sy, .42, so, 'gun');
    rocket(px, py, 650, 1832, rk, { arc: 30, s: .9, dur: .9 });
    explosion(650, 1832, 70, (rk - 1) * .9);
    tracers(gx, gy, 470, 1835, t, { spread: 80 });
    patrolHeli(sx, sy, .42, so);
  };
  LOOPS.heli.len = 2;
})();
