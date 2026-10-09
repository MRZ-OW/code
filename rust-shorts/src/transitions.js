// transitions.js: Rust-themed "cover" transitions between shots. An object sweeps in, covers the WHOLE frame at the cut,
// then sweeps off to reveal the next shot. Only one shot is drawn per frame (before the cut you see shot A under the
// incoming cover, after it shot B under the outgoing cover), so nothing needs masking.
//
//   transitions([[6.0, 'rockSpin'], [25.0, 'sleepingBag', { dur: .8 }], ...]);   // register next to shots(), episode times
//   drawWorld() calls drawTransitions(t) after the shot, in screen space; transShakeBegin(t) shakes the frame on impacts.
//
// Each runs from tCut - dur/2 to tCut + dur/2 and covers the frame 100% for at least tCut ± 0.06 s. Options (all optional):
//   dur    length in s, clamped to 0.4..0.9 (each has its own default, below; the busy ones read best at their default)
//   flip   true mirrors it left ↔ right (the rock comes from the lower right, the door hinges on the right, ...)
//   shake  scales the screen shake (0 = none)
//   in     the share of dur before the cut (default .5; e.g. .3 covers fast so the beat just before the cut stays visible)
//
//   rockSpin    .7  the hero's cream rock with its red smear tumbles at the lens from the lower left, fills the frame (THOCK),
//                   and tumbles away to the upper right
//   doorSlam    .8  an armoured door swings in from the left with perspective, slams flat (CLANG: ring lines, a 3-frame
//                   shake), then swings away into the scene
//   garageDoor  .7  a corrugated garage door rolls down out of its rusty housing, bounces, then rolls back up
//   c4Blast     .9  a C4 brick slaps onto the lens, blinks twice, BOOM: one flash, a fireball fills the frame, the smoke
//                   clears from the middle out
//   supplySmoke .9  a supply signal tumbles in and billows violet smoke that fills the frame, then drifts off to the left
//   sleepingBag .8  a burlap sleeping bag unrolls down like a blind, zips down and back up, and rolls back up
//   heliFlyover .7  the patrol heli comes in low with its searchlight sweeping, its belly fills the frame, its tail and
//                   rotor blur whip off the top
//   wallUpgrade .9  a twig wall rises, the hammer bonks it up twig → wood → stone → sheet metal → armoured, then it is
//                   raided apart and the chunks crumble away
//
// Pure functions of time. The demo loop plays all eight over two alternating backgrounds:
//   node render.mjs --ep=0 --loop=transitions --strip=0:12 ...     (cuts at 0.75 + 1.5 i s)
// and --loop=transitionsKey swaps the backgrounds for flat magenta / green, to check coverage pixel by pixel.

const TRANS = [], TRANS_FX = {};
function transitions(list) {
  for (const [t, name, o] of list) {
    if (!TRANS_FX[name]) { console.warn('transitions: unknown transition "' + name + '"'); continue; }
    TRANS.push({ t, name, o: o || {} });
  }
  TRANS.sort((a, b) => a.t - b.t);
}
const transDur = e => clamp(e.o.dur ?? TRANS_FX[e.name].dur, .4, .9);
// o.in: the share of dur spent covering, before the cut (default .5). A smaller one covers fast, so a gag just before
// the cut stays on screen; the reveal after the cut takes the rest of dur.
const transIn = e => clamp(e.o.in ?? TRANS_FX[e.name].in ?? .5, .2, .8);   // the episode's, else the transition's own default
const transSpan = e => { const d = transDur(e), k = transIn(e); return [e.t - d * k, e.t + d * (1 - k)]; };
const transActive = (t, list = TRANS) => list.filter(e => { const [a, b] = transSpan(e); return t > a && t < b; });
// the transition's own progress p (0..1, .5 = the cut) at time t
const transP = (e, t) => { const d = transDur(e), k = transIn(e); return t < e.t ? .5 * (t - (e.t - d * k)) / (d * k) : .5 + .5 * (t - e.t) / (d * (1 - k)); };
// Paints every running transition over the frame (screen space, no camera). Lettering queued by the shot is flushed
// first, so the cover goes over it.
function drawTransitions(t, list = TRANS) {
  const act = transActive(t, list); if (!act.length) return;
  flushLetters();
  for (const e of act) {
    const d = transDur(e), p = transP(e, t);
    push(); if (e.o.flip) { translate(W, 0); scale(-1, 1); }
    TRANS_FX[e.name].draw(p, d, { ...e.o, in: transIn(e) }, t);
    pop();
  }
}
// The screen shake of the running transitions at t: [dx, dy] px, or null.
function transitionShake(t, list = TRANS) {
  let a = 0;
  for (const e of transActive(t, list)) { const fx = TRANS_FX[e.name]; if (!fx.shake) continue; const d = transDur(e); a += fx.shake(transP(e, t), d, { ...e.o, in: transIn(e) }) * (e.o.shake ?? 1); }
  return a > .5 ? shakeXY(t, a) : null;
}
// Hook for drawWorld: shifts (and slightly over-scales, so no paper edge shows) everything drawn until the matching pop().
function transShakeBegin(t, list = TRANS) {
  const s = transitionShake(t, list); if (!s) return false;
  const m = Math.max(Math.abs(s[0]), Math.abs(s[1]));
  push(); translate(W / 2 + s[0], H / 2 + s[1]); scale(1 + 2.4 * m / W); translate(-W / 2, -H / 2);
  return true;
}
// Inside a transition p is piecewise linear in time (.5 = the cut; o.in, resolved, is the share of dur before it).
// trS: seconds from the cut at p; trA: seconds from p0 to p. Time anything that must hold for whole frames with these.
const trS = (p, d, o) => (p - .5) * 2 * d * (p < .5 ? o.in ?? .5 : 1 - (o.in ?? .5));
const trA = (p, p0, d, o) => trS(p, d, o) - trS(p0, d, o);
// p at s seconds from the cut (the inverse of trS)
const trPs = (s, d, o) => .5 + s / (2 * d * (s < 0 ? o.in ?? .5 : 1 - (o.in ?? .5)));
// An ink polyline in short pieces: p5.brush drops a stroke once it spans more than about 1100 px.
function trSegLine(P, sw, col, br = 'inkfine', maxLen = 450) {
  let run = [P[0]], len = 0;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(l / maxLen));
    for (let k = 1; k <= n; k++) {
      const q = [lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]; run.push(q); len += l / n;
      if (len >= maxLen) { inkLine(run, sw, col, br, 0); run = [q]; len = 0; }
    }
  }
  if (run.length > 1) inkLine(run, sw, col, br, 0);
}
// a closed ink loop (inkLine through the points and back to the first)
const trLoop = (P, sw, col, br = 'ink') => inkLine([...P, P[0]], sw, col, br, .5);
// A scalloped billow (cartoon smoke / fire puff): an outline of round lobes, slightly squashed.
function trBillow(x, y, r, sd, n = 44) {
  const P = [], lobes = 5 + Math.floor(hash(sd) * 4);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = .84 + .16 * Math.abs(Math.sin(a * lobes / 2 + sd)) + .04 * Math.sin(a * 3 + sd * 2); P.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * .9]); }
  return P;
}
// Billows painted as one mass: every rim first, then every fill, so only the outer edge keeps a full outline; then a
// curl line along the top of each billow (where it overlaps the one behind) and a soft highlight.
// P = [[x, y, r, col], ...] back to front. o.curl = curl colour, o.hi = highlight colour.
function trPuffs(P, op, rim = PAL.ink, rimW = 4, key = 'puffs', o = {}) {
  if (op <= 2) return;
  if (rim) P.forEach(([x, y, r], i) => { boilSeed(key + 'r' + i); paint(trBillow(x, y, r + rimW, i * 1.7 + 3), { wash: rim, washOp: op, ink: null }); });
  P.forEach(([x, y, r, c], i) => { boilSeed(key + 'f' + i); paint(trBillow(x, y, r, i * 1.7 + 3), { wash: c, washOp: op, ink: null }); });
  if (o.hi) P.forEach(([x, y, r], i) => {   // highlights vary in place, size and squash, so a mass of billows doesn't tile
    const hx = x - r * (.05 + .28 * hash(i + 71)), hy = y - r * (.2 + .2 * hash(i + 73)), hr = r * (.32 + .26 * hash(i + 77));
    boilSeed(key + 'h' + i); paint(trBillow(hx, hy, hr, i * 2.3 + 1, 30).map(([a, b]) => [a, hy + (b - hy) * (.7 + .4 * hash(i + 79))]), { wash: o.hi, washOp: op * (o.hiOp ?? .45), ink: null });
  });
  if (o.curl && (o.curlW ?? 1) > .05) P.forEach(([x, y, r], i) => {
    if (!i || r < 30) return;
    const B = trBillow(x, y, r, i * 1.7 + 3), n = B.length, a0 = Math.floor(n * (.55 + .1 * hash(i))), a1 = Math.floor(n * (.9 + .06 * hash(i + 1)));
    boilSeed(key + 'c' + i); inkLine(B.slice(a0, a1), clamp(r / 90, 1, 3.4) * (op / 255) * (o.curlW ?? 1), o.curl, 'inkfine', 0);
  });
}

// ---------- 1. rockSpin ----------
// The rock flies at the lens from the lower left on a constant zoom (it doubles in size every few frames), fills the
// frame for the cut, THOCKs off the glass and tumbles away to the upper right, shrinking into the distance.
function trRockAt(p) {
  const rot = -2.6 + 5.4 * p;
  if (p <= .5) {
    const k = clamp(p / .42), u = p < .42 ? 60 * Math.pow(1500 / 60, k) : lerp(1500, 1650, seg(p, .42, .5));
    const e = easeOut(k);
    return { x: lerp(-170, 540, e), y: lerp(1850, 960, e) - 260 * Math.sin(Math.PI * e) * (1 - e), u, rot };
  }
  const q = seg(p, .5, 1), e = Math.pow(q, 1.25);
  return { x: lerp(540, 1430, e), y: lerp(960, -330, e), u: 1650 * Math.pow(95 / 1650, e), rot };
}
// The rock (reference: rock.png, rockProp in rustcast.js): an angular chunk with flat broken faces and the red smear on its
// lower striking edge. Straight edges with slightly rounded corners, flat facets in three values, and every line drawn
// in short pieces, so it stays readable (and keeps its outline) from a pebble to 4000 px across.
const trClosed = (P, n = 5) => { const L = P.length, C = through([P[L - 1], ...P, P[0], P[1]], n); return C.slice(n, n * (L + 1)); };
function trFacet(P, r = .12) {   // straight edges, each corner rounded over r of its edges with 3 points
  const out = [], n = P.length;
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n], p0 = [lerp(b[0], a[0], r), lerp(b[1], a[1], r)], p2 = [lerp(b[0], c[0], r), lerp(b[1], c[1], r)];
    for (const t of [0, .5, 1]) { const v = 1 - t; out.push([v * v * p0[0] + 2 * v * t * b[0] + t * t * p2[0], v * v * p0[1] + 2 * v * t * b[1] + t * t * p2[1]]); }
  }
  return out;
}
const TR_ROCK = [[-.3, -1.0], [.35, -1.32], [.95, -1.28], [1.7, -.78], [1.88, .2], [1.15, .95], [.15, .92], [-.45, .25], [-.48, -.45]];
function trRock(x, y, u, rot) {
  const sw = clamp(u / 34, 1, 5.5), R = trFacet(U2(u, TR_ROCK));
  push(); translate(x, y); rotate(rot); translate(-.7 * u, .17 * u);
  boilSeed('tr-rock');
  paint(R, { wash: '#DCCAA8', ink: null });                                                                                   // the front face
  paint(trFacet(U2(u, [[-.48, -.45], [-.3, -1.0], [.35, -1.32], [.95, -1.28], [1.7, -.78], [1.12, -.5], [.3, -.42]]), .08), { wash: '#EFE4CC', ink: null });   // the lit top facet
  paint(trFacet(U2(u, [[1.7, -.78], [1.88, .2], [1.15, .95], [.85, .3], [1.12, -.5]]), .08), { wash: '#C2AB88', ink: null });   // the shaded side facet
  // stone mottling and pits, so a frame-filling rock still reads as stone (kept well inside the outline)
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, d = .2 + .35 * hash(i + 4), mx = .7 + Math.cos(a) * d, my = -.2 + Math.sin(a) * d * .8;
    boilSeed('tr-rockm' + i);
    paint(ellPts(mx * u, my * u, (.1 + .12 * hash(i)) * u, (.07 + .08 * hash(i + 2)) * u, 12, u * .006, a), { wash: i % 3 ? '#CDB894' : '#B49C78', washOp: 60, ink: null });
  }
  for (let i = 0; i < 5; i++) { const px = .3 + .9 * hash(i + 20), py = -.75 + .9 * hash(i + 30); boilSeed('tr-rockp' + i); paint(ellPts(px * u, py * u, .025 * u, .018 * u, 8), { wash: '#8E7A5E', washOp: 150, ink: null }); }
  boilSeed('tr-rocks');
  paint(trClosed(U2(u, [[-.4, .25], [-.05, .55], [.3, .8], [.9, .88], [1.15, .86], [.8, .62], [.3, .52], [-.05, .32]])), { wash: '#A8322A', washOp: 230, ink: null });   // the red smear on the striking edge
  paint(U2(u, [[.2, .66], [.5, .7], [.42, .76]]), { wash: '#7E2420', ink: null });
  boilSeed('tr-rocke');
  const fw = clamp(u / 260, .7, 2.6);   // the facet ridges: fine ink
  trSegLine(U2(u, [[-.48, -.45], [.3, -.42], [1.12, -.5], [1.7, -.78]]), fw, '#7E6A4E');
  trSegLine(U2(u, [[1.12, -.5], [.85, .3], [1.15, .95]]), fw, '#7E6A4E');
  trSegLine([...R, R[0]], sw * .7, PAL.ink, 'ink');
  pop();
}
TRANS_FX.rockSpin = {
  dur: .7,
  draw(p, d, o) {
    const S = trRockAt(p), post = p > .5;
    // the whoosh: a pale smear back along the path, as wide as the rock, and (once it's big) dry-brush streaks
    const C = [[S.x, S.y]];
    for (let j = 1; j <= 6; j++) { const pj = p - j * .032; if (pj < 0 || (post && pj < .5 - .001)) break; const Q = trRockAt(pj); C.push([Q.x, Q.y]); }
    if (C.length > 2) {
      const w0 = S.u * 2.4, fade = post ? 1 - seg(p, .5, .7) : 1;
      boilSeed('tr-whoosh');
      paint(ribbon(C, w0, w0 * .35), { wash: '#F3E7CC', washOp: 140 * fade, ink: null });
      if (fade > .3 && S.u > 300) for (const k of [-.32, 0, .3]) {
        const L = C.map(([cx, cy], i) => { const a = C[Math.min(i + 1, C.length - 1)], b = C[Math.max(i - 1, 0)], dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1; return [cx - dy / l * k * w0 * (1 - i / C.length), cy + dx / l * k * w0 * (1 - i / C.length)]; });
        inkLine(L, clamp(S.u / 60, 1, 4), '#BFAE8C', 'dry', .5);
      }
    }
    trRock(S.x, S.y, S.u, S.rot);
    // THOCK: impact ticks round the frame as it hits the glass
    const a = trS(p, d, o);
    if (a >= 0 && a < .12) {
      const k = a / .12;
      for (let i = 0; i < 10; i++) {
        const ang = i / 10 * TAU + .3, r0 = 380 + 380 * k, r1 = r0 + 140 * (1 - k);
        boilSeed('tr-thock' + i);
        inkLine([[540 + Math.cos(ang) * r0 * .9, 960 + Math.sin(ang) * r0 * 1.4], [540 + Math.cos(ang) * r1 * .9, 960 + Math.sin(ang) * r1 * 1.4]], 3.4 * (1 - k), PAL.ink, 'ink', 0);
      }
    }
  },
  shake(p, d, o) { const a = trS(p, d, o); return a >= 0 && a < .09 ? 10 * (1 - a / .09) : 0; },
};

// ---------- 2. doorSlam ----------
// An armoured door (reference: door.hinged.toptier: dark rusty steel, rivet rows round the edges and across the middle,
// a viewing slot, a latch plate) hinged at the left frame edge. It's a real rotation in perspective: the camera sits
// D px in front of the closed door, so the free edge swells as it swings toward the lens and shrinks as it swings away.
const TR_DOOR = { D: 1500, w: 1160, h: 2040, hx: -580, T: 34 };
function trDoorPt(th, u, v, back = 0) {
  const s = u * TR_DOOR.w, X = TR_DOOR.hx + s * Math.cos(th) - Math.sin(th) * back, Z = TR_DOOR.D + s * Math.sin(th) + Math.cos(th) * back, k = TR_DOOR.D / Z;
  return [W / 2 + X * k, H / 2 + (v - .5) * TR_DOOR.h * k];
}
function trDoorAngle(p, d, o) {
  if (p < .34) return -1.32 * (1 - Math.pow(p / .34, 1.5));                                       // whips in from the lens side
  if (p < .62) { const a = trA(p, .34, d, o); return -.06 * Math.exp(-a * 18) * Math.abs(Math.sin(a * 38)); }   // the slam's rebound
  return 2.05 * Math.pow(seg(p, .62, 1), 1.4);                                                     // swings away into the scene
}
TRANS_FX.doorSlam = {
  dur: .8,
  draw(p, d, o) {
    const th = trDoorAngle(p, d, o), M = (u, v) => trDoorPt(th, u, v);
    const A = M(0, .5), B = M(1, .5); if (B[0] < A[0] + 3 || Math.max(A[0], B[0]) < -20) return;   // edge-on, from behind, or gone
    const Q = (u0, v0, u1, v1) => [M(u0, v0), M((u0 + u1) / 2, v0), M(u1, v0), M(u1, (v0 + v1) / 2), M(u1, v1), M((u0 + u1) / 2, v1), M(u0, v1), M(u0, (v0 + v1) / 2)];
    const sc = TR_DOOR.D / (TR_DOOR.D + TR_DOOR.w * .5 * Math.sin(th));   // the door's middle scale, for line weights
    // the free edge's thickness, when it faces the camera
    const s1 = TR_DOOR.w, X = TR_DOOR.hx + s1 * Math.cos(th), Z = TR_DOOR.D + s1 * Math.sin(th);
    if (-X * Math.cos(th) - Z * Math.sin(th) > 0) { boilSeed('tr-door-edge'); paint([M(1, 0), trDoorPt(th, 1, 0, TR_DOOR.T), trDoorPt(th, 1, 1, TR_DOOR.T), M(1, 1)], { wash: '#4A4440', ink: PAL.ink, sw: 2 }); }
    boilSeed('tr-door');
    paint(Q(0, 0, 1, 1), { wash: '#5A534C', ink: PAL.ink, sw: 2.4 });
    paint(Q(.05, .035, .95, .965), { wash: '#665E56', ink: PAL.ink, sw: 1.2 * sc });                    // the raised face
    paint(Q(.05, .475, .95, .525), { wash: '#4E4842', ink: PAL.ink, sw: 1 * sc });                        // the middle strap
    for (const [u0, v0, w, h] of [[.16, .26, .05, .2], [.55, .56, .06, .26], [.76, .18, .04, .2], [.32, .7, .05, .2], [.62, .06, .05, .14]]) {   // rust streaks
      boilSeed('tr-door-rust' + u0); paint([M(u0, v0), M(u0 + w, v0), M(u0 + w * .7, v0 + h), M(u0 + w * .3, v0 + h)], { wash: '#7E4A2E', washOp: 120, ink: null });
    }
    boilSeed('tr-door-grime'); paint(Q(.05, .78, .95, .965), { wash: '#3E3934', washOp: 70, ink: null });
    // hinges (left) and the latch plate with its lever (right)
    for (const v of [.15, .5, .85]) { boilSeed('tr-door-hinge' + v); paint(Q(0, v - .045, .07, v + .045), { wash: '#4A4440', ink: PAL.ink, sw: 1 * sc }); }
    boilSeed('tr-door-latch');
    paint(Q(.83, .42, .935, .58), { wash: '#4C4641', ink: PAL.ink, sw: 1.2 * sc });
    paint(Q(.865, .47, .9, .62), { wash: '#787068', ink: PAL.ink, sw: 1 * sc });
    const kn = M(.8825, .47), kr = 26 * sc * Math.max(.2, Math.abs(Math.cos(th)));
    paint(ellPts(kn[0], kn[1], kr, 26 * sc, 14), { wash: '#8A8178', ink: PAL.ink, sw: 1 * sc });
    // the viewing slot: a frame plate round a dark slit
    boilSeed('tr-door-slot');
    paint(Q(.24, .11, .76, .215), { wash: '#4E4842', ink: PAL.ink, sw: 1.2 * sc });
    paint(Q(.29, .138, .71, .188), { wash: '#141118', ink: PAL.ink, sw: 1 * sc });
    // rivet rows: round the face's edge and along the strap
    const rows = [];
    for (let i = 0; i <= 12; i++) { const u = .09 + .82 * i / 12; rows.push([u, .06], [u, .94], [u, .455], [u, .545]); }
    for (let i = 1; i < 18; i++) { const v = .06 + .88 * i / 18; if (Math.abs(v - .5) > .06) rows.push([.085, v], [.915, v]); }
    const dux = 11 / TR_DOOR.w;
    rows.forEach(([u, v], i) => {
      const c = M(u, v), e = M(u + dux, v), rx = Math.max(1.5, Math.abs(e[0] - c[0])), ry = 11 * TR_DOOR.D / (TR_DOOR.D + u * TR_DOOR.w * Math.sin(th));
      boilSeed('tr-rivet' + i);
      paint(ellPts(c[0], c[1], rx, ry, 8), { wash: i % 4 ? '#8E5C3C' : '#A88A70', ink: PAL.ink, sw: .45 * sc });
      paint(ellPts(c[0] - rx * .3, c[1] - ry * .35, rx * .35, ry * .3, 6), { wash: '#D2B394', washOp: 170, ink: null });
    });
    // CLANG: rings off the steel, a glint on the latch
    const a = trA(p, .34, d, o);
    if (a >= 0 && a < .24) {
      const k = a / .24, c = M(.5, .5), L = M(.8825, .5);
      for (let i = 0; i < 3; i++) { const r = (120 + 1000 * easeOut(k)) * (1 - i * .24); boilSeed('tr-clang' + i); trLoop(ellPts(c[0], c[1], r * .8, r, 36), 3.4 * (1 - k), '#EDE3CF'); }
      for (let i = 0; i < 7; i++) { const ang = Math.PI * (.62 + i * .13), r0 = 90 + 60 * k; boilSeed('tr-tick' + i); inkLine([[L[0] + Math.cos(ang) * r0, L[1] + Math.sin(ang) * r0], [L[0] + Math.cos(ang) * (r0 + 70), L[1] + Math.sin(ang) * (r0 + 70)]], 3 * (1 - k), '#F4ECD8', 'ink', 0); }
      glow(L[0], L[1], 160, '#FFF1C8', .8 * (1 - k));
    }
  },
  shake(p, d, o) { const a = trA(p, .34, d, o); return a >= 0 && a < .13 ? 18 * (1 - a / .13) : 0; },
};

// ---------- 3. garageDoor ----------
// Reference: wall.frame.garagedoor: off-white corrugated slats with patches of old paint, a rusty roll housing on top.
function trGarageBottom(p) {
  const top = 70, bot = H + 12;   // at rest its bottom rail sits along the frame's bottom edge
  if (p < .28) return lerp(top, bot, Math.pow(p / .28, 2));                // falls, gathering speed
  if (p < .38) return bot - 75 * Math.sin(Math.PI * (p - .28) / .1);       // one small bounce
  if (p < .6) return bot;
  return lerp(bot, top, ease(seg(p, .6, .95)));
}
TRANS_FX.garageDoor = {
  dur: .7,
  draw(p, d, o) {
    const hy = -150 * (1 - easeOut(seg(p, 0, .08))) - 150 * easeIn(seg(p, .93, 1));   // the housing slides in and out at the top
    const yb = trGarageBottom(p) + hy, top = hy + 90, sh = 104;
    if (yb > top + 4) {
      boilSeed('tr-gd');
      paint(rectPts(-40, top, W + 80, yb - top), { wash: '#D7D1C1', ink: null });
      const n = Math.ceil((yb - top) / sh) + 1;
      for (let i = 0; i < n; i++) {
        const y1 = yb - 76 - i * sh, y0 = y1 - sh; if (y1 < top) break;
        const yA = Math.max(y0, top), c = ['#DCD7C8', '#D2CCBA', '#E3DFD2', '#CFC8B4'][i % 4];
        boilSeed('tr-gd' + i);
        paint(rectPts(-40, yA, W + 80, y1 - yA), { wash: c, ink: null });
        if (y0 + sh * .38 > top) paint(rectPts(-40, Math.max(top, y0 + 8), W + 80, sh * .3), { wash: '#F1EEE4', washOp: 150, ink: null });   // the rib's lit top
        paint(rectPts(-40, y1 - sh * .22, W + 80, sh * .22), { wash: '#A49C88', washOp: 120, ink: null });                                     // its shadowed underside
        // old paint patches and rust (fixed to each slat)
        for (let k = 0; k < 2; k++) if (hash(i * 7 + k) < .45) {
          const px = -40 + hash(i * 3 + k) * 900, pw = 160 + 360 * hash(i * 5 + k), pc = ['#7F9CB4', '#B9A27A', '#C7BFA6', '#A9653F'][Math.floor(hash(i * 11 + k) * 4)];
          paint(rectPts(px, Math.max(top, y0 + 10), pw, sh * .7, 2), { wash: pc, washOp: pc === '#A9653F' ? 110 : 150, ink: null });
        }
        if (hash(i * 13) < .3) paint(rectPts(150 + hash(i) * 700, y0 + sh * .38, 70, 24), { wash: '#3A3632', ink: PAL.ink, sw: 1 });   // a little grip
        if (y0 > top) inkLine([[-40, y0], [W + 40, y0]], 1.6, '#5E5850', 'ink', 0);
        for (const ex of [-40, W - 30]) { const rw = 50 + 40 * hash(i + ex); paint([[ex, Math.max(top, y0 + 4)], [ex + rw, Math.max(top, y0 + 4)], [ex + rw * .6, y1 - 6], [ex, y1 - 6]], { wash: '#8E5A38', washOp: 100, ink: null }); }   // rusty edges
      }
      boilSeed('tr-gd-bar');   // the bottom rail and its handle
      paint(rectPts(-40, yb - 76, W + 80, 76), { wash: '#6E675E', ink: PAL.ink, sw: 2.2 });
      paint(rectPts(-40, yb - 76, W + 80, 14), { wash: '#8E877C', washOp: 180, ink: null });
      paint(rectPts(-40, yb - 24, W + 80, 24), { wash: '#2E2A28', ink: null });
      paint(rrPts(450, yb - 66, 180, 34, 12), { wash: '#3A3632', ink: PAL.ink, sw: 1.4 });
      paint(rrPts(472, yb - 58, 136, 14, 6), { wash: '#8A847A', ink: null });
      // dust knocked out from under the rail on impact, spreading along the floor
      const a = trA(p, .28, d, o);
      if (a > 0 && a < .3) for (let i = 0; i < 7; i++) puff(-20 + i * 186, Math.min(yb, H + 6) - 4, 95, a, { life: .3, col: '#D6C8A8', key: 'tr-gd' + i, rot: i, rise: .45, noInk: true });
    }
    // the rusty roll housing
    if (hy > -148) {
      boilSeed('tr-gd-house');
      paint(rrPts(-60, hy - 40, W + 120, 150, 40), { wash: '#8E4E32', ink: PAL.ink, sw: 2.4 });
      paint(rrPts(-60, hy - 10, W + 120, 34, 14), { wash: '#B9714A', washOp: 170, ink: null });
      paint(rrPts(-60, hy + 66, W + 120, 30, 12), { wash: '#5E3020', washOp: 160, ink: null });
      for (let i = 0; i < 5; i++) { boilSeed('tr-gd-hs' + i); paint(ellPts(80 + i * 230 + 60 * hash(i), hy + 40 + 30 * hash(i + 3), 60, 16, 10, 2), { wash: '#6E3A26', washOp: 120, ink: null }); }
    }
  },
  shake(p, d, o) { const a = trA(p, .28, d, o); return a >= 0 && a < .09 ? 9 * (1 - a / .09) : 0; },
};

// ---------- 4. c4Blast ----------
// Reference: explosive.timed: a squat brick wrapped in black tape over off-white, a cross strap, a little detonator board
// with a red light and coloured wires on top.
function trC4(x, y, s, sx, sy, rot, led) {
  push(); translate(x, y); rotate(rot); scale(s * sx, s * sy);
  boilSeed('tr-c4');
  paint(rrPts(-180, -140, 360, 280, 18), { wash: '#E4DDC8', ink: PAL.ink, sw: 2.2 });
  // wide black tape wraps slanting round the brick, the off-white wrap peeking out between them in uneven gaps
  const cl = v => clamp(v, -176, 176);
  [[-180, 74], [-96, 92], [22, 58], [92, 96]].forEach(([x0, w], i) => {
    boilSeed('tr-c4t' + i);
    paint([[cl(x0), -137], [cl(x0 + w), -137], [cl(x0 + w + 44), 137], [cl(x0 + 44), 137]], { wash: '#222127', ink: null });
    inkLine([[cl(x0 + w * .3), -122], [cl(x0 + w * .3 + 38), 118]], 1.1, '#6E6C76', 'inkfine', 0);   // its sheen
  });
  boilSeed('tr-c4x');
  paint([[-177, 34], [177, -70], [177, -10], [-177, 94]], { wash: '#1A191E', ink: PAL.ink, sw: 1 });   // the cross strap
  inkLine([[-160, 48], [160, -46]], 1.1, '#7A7882', 'inkfine', 0);
  paint(rrPts(-180, -140, 360, 280, 18), { ink: PAL.ink, sw: 2.6 });
  // the detonator: a green board on the top face, a red light, short wires looped tight against the top edge
  boilSeed('tr-c4d');
  inkLine([[-40, -118], [-62, -158], [-104, -156], [-118, -132]], 2, '#C8322C', 'ink', .5);
  inkLine([[136, -112], [158, -150], [176, -134]], 2, '#3E8E4A', 'ink', .5);
  inkLine([[-40, -100], [-84, -126], [-130, -124]], 1.6, '#2E6E3A', 'ink', .5);
  paint(rrPts(-46, -142, 190, 96, 8), { wash: '#3D5A3A', ink: PAL.ink, sw: 1.6 });
  for (let i = 0; i < 4; i++) paint(rectPts(-30 + i * 26, -126, 16, 12), { wash: '#C9B48A', ink: null });   // chips
  paint(rectPts(-30, -94, 90, 28), { wash: '#1E2A1E', ink: PAL.ink, sw: .8 });                            // a little display
  for (let i = 0; i < 6; i++) paint(ellPts(-30 + i * 34, -56, 4, 4, 6), { wash: '#C9B48A', ink: null });   // solder pins
  if (led) { glow(118, -94, 190, '#FF3048', 1); glow(118, -94, 70, '#FFD0D0', .8); }
  paint(ellPts(118, -94, 19, 19, 12), { wash: led ? '#FF5A66' : '#6A2026', ink: PAL.ink, sw: .9 });
  pop();
}
// the smoke that the fireball turns into: a grid of overlapping billows that covers the frame, then breaks apart from
// the middle out (q 0..1) while it rises and thins
function trBlastSmoke(q, key) {
  // every billow stays opaque; the mass thins by shrinking billows away from the middle out, rising and lightening to
  // warm grey wisps, and only the last few frames fade
  const P = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
    const i = r * 4 + c, bx = -60 + c * 400 + 70 * (hash(i + 3) - .5), by = -20 + r * 392 + 60 * (hash(i + 7) - .5);
    const dx = bx - 540, dy = by - 960, dn = clamp(Math.hypot(dx * 1.6, dy) / 1600), l = Math.hypot(dx, dy) || 1;
    const e = ease(q), rad = 360 * (1 + .25 * hash(i)) * clamp(1 - q * (1.5 - .75 * dn));
    if (rad < 10) continue;
    P.push([bx + dx / l * 600 * e, by + dy / l * 450 * e - 380 * q, rad, mixCol('#4E4954', '#C8BFB2', clamp(q * 1.5 + .15 * hash(i + 1)))]);
  }
  P.sort((a, b) => b[2] - a[2]);
  trPuffs(P, 255 * (1 - seg(q, .72, 1)), q < .15 ? PAL.ink : null, 5, key, { curl: '#2E2A34', curlW: 1 - q / .3, hi: mixCol('#9A96A0', '#E2DACE', q), hiOp: .35 });
}
// the fireball, R px across, heat 0..1 (white-yellow → orange → red), op 0..1
function trFireball(x, y, R, heat, op, key) {
  const P = [[x, y, R, mixCol('#F08A34', '#B8402A', heat)]];   // the body: on its own it covers the frame once R > 1150
  for (let i = 0; i < 13; i++) { const ang = i / 13 * TAU + hash(i) * .5, dd = R * (.58 + .2 * hash(i + 1)); P.push([x + Math.cos(ang) * dd, y + Math.sin(ang) * dd * 1.3, R * (.28 + .14 * hash(i + 2)), mixCol('#EC7A30', '#A8361F', heat * .7 + .3 * hash(i + 3))]); }
  trPuffs(P, 255 * op, heat < .8 ? '#6A2418' : PAL.ink, 7, key, { curl: mixCol('#B8452A', '#6A2418', heat) });
  const M = []; for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU + 1 + hash(i + 9), dd = R * (.2 + .2 * hash(i + 5)); M.push([x + Math.cos(ang) * dd, y - R * .05 + Math.sin(ang) * dd * 1.3, R * (.24 + .1 * hash(i + 6)), mixCol('#FFC24A', '#E8692C', heat)]); }
  trPuffs(M, 255 * op, null, 0, key + 'm', { curl: mixCol('#E8822C', '#B8452A', heat), hi: '#FFE9A8', hiOp: .6 * (1 - heat) });
  const core = clamp(1 - heat * 1.2);
  if (core > 0) { const C = []; for (let i = 0; i < 4; i++) { const ang = i / 4 * TAU + .5; C.push([x + Math.cos(ang) * R * .1, y - R * .08 + Math.sin(ang) * R * .12, R * .18, '#FFF3C8']); } trPuffs(C, 255 * op * core, null, 0, key + 'c'); }
  glow(x, y, R * .9, '#FF9A3A', .8 * op);
}
TRANS_FX.c4Blast = {
  dur: .9,
  draw(p, d, o) {
    const pb = .38;
    if (p < pb) {   // flies at the lens, slaps on, blinks twice (each blink a third of the wait, so it holds for frames)
      const k = seg(p, 0, .1), a = trA(p, .1, d, o), sq = a > 0 ? .3 * Math.exp(-a * 20) * Math.cos(a * 44) : 0;
      const s = 1.25 * Math.pow(.2, 1 - k), x = lerp(900, 540, easeOut(k)), y = lerp(1420, 930, easeOut(k)) - 160 * Math.sin(Math.PI * k);
      const led = (p > .142 && p < .218) || (p > .262 && p < .338);
      trC4(x, y, s, 1 + sq, 1 - sq, lerp(.9, -.06, easeOut(k)), led);
      if (a > 0 && a < .12) for (let i = 0; i < 9; i++) {   // splat ticks
        const ang = i / 9 * TAU + .2, kk = a / .12, r0 = 290 + 80 * kk;
        boilSeed('tr-c4tick' + i); inkLine([[540 + Math.cos(ang) * r0, 930 + Math.sin(ang) * r0 * .85], [540 + Math.cos(ang) * (r0 + 70), 930 + Math.sin(ang) * (r0 + 70) * .85]], 3.4 * (1 - kk), PAL.ink, 'ink', 0);
      }
      return;
    }
    const a = trA(p, pb, d, o);
    if (p > .43) trBlastSmoke(seg(p, .63, 1), 'tr-c4s');   // smoke under the fireball once it fills the frame
    const fire = 1 - seg(p, .5, .63);                         // it burns, then thins away into the smoke
    if (fire > 0) {
      trFireball(540, 930, 1380 * easeOut(clamp(a / .07)) + 140 * a, clamp(a / .2), clamp(fire * 1.4), 'tr-fire');
      if (a < .25) for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU + 1, r = 200 + 2600 * a; push(); translate(540 + Math.cos(ang) * r, 930 + Math.sin(ang) * r); rotate(a * 18 + i); boilSeed('tr-shred' + i); paint(rectPts(-26, -14, 52, 28), { wash: i % 2 ? '#222127' : '#E4DDC8', ink: PAL.ink, sw: 1 }); pop(); }   // shreds of tape
    }
    flash(1 - a / .09);   // the one bright flash
  },
  shake(p, d, o) { const a1 = trA(p, .1, d, o), a2 = trA(p, .38, d, o); return (a1 >= 0 && a1 < .08 ? 7 * (1 - a1 / .08) : 0) + (a2 >= 0 && a2 < .2 ? 20 * (1 - a2 / .2) : 0); },
};

// ---------- 5. supplySmoke ----------
// Reference: supply.signal (an M18 smoke grenade): an olive can with a purple band, the spoon lever along its side, the
// pull ring and a short vented fuze on top; the smoke pours out of the fuze. It tumbles in close to the lens, in the
// foreground (cut by the bottom edge), so it reads as near, not giant.
function trSignal(x, y, s, rot) {
  push(); translate(x, y); rotate(rot); scale(s);
  boilSeed('tr-sig');
  paint(rrPts(-130, -50, 240, 100, 14), { wash: '#5D6936', ink: PAL.ink, sw: 1.8 });
  paint(rrPts(-124, 12, 228, 32, 10), { wash: '#465128', washOp: 210, ink: null });
  paint(rrPts(-120, -40, 222, 16, 8), { wash: '#808C52', washOp: 180, ink: null });
  paint(rectPts(-104, -50, 30, 100), { wash: '#8B3FA6', ink: PAL.ink, sw: 1 });                        // the purple band
  for (const yy of [-14, 6]) inkLine([[-50, yy], [50, yy]], 1.6, '#9AA46C', 'inkfine', 0);              // stencilled marks
  paint(rrPts(108, -30, 26, 60, 6), { wash: '#6E7A46', ink: PAL.ink, sw: 1.4 });                      // the fuze neck
  paint(rrPts(132, -24, 30, 48, 6), { wash: '#4A4E46', ink: PAL.ink, sw: 1.4 });                      // the fuze head
  for (const yy of [-12, 0, 12]) paint(ellPts(160, yy, 3.5, 4.5, 6), { wash: '#141216', ink: null });  // its vents
  paint([[134, -26], [124, -60], [-20, -66], [-58, -58], [-40, -50], [112, -50]], { wash: '#6E7A42', ink: PAL.ink, sw: 1.4 });   // the spoon
  inkLine([[-50, -56], [118, -55]], 1, '#9AA46C', 'inkfine', 0);
  inkLine([[150, -26], [160, -44]], 2, '#5E6066', 'inkfine', 0);                                      // the pin
  trLoop(ellPts(170, -58, 17, 15, 14), 3, '#A8AEB2');                                                 // the pull ring
  pop();
}
function trSignalAt(p) {
  const k = seg(p, 0, .3), e = easeOut(k), x = lerp(1380, 600, e), hop = Math.abs(Math.sin(e * Math.PI * 2.2)) * 90 * (1 - e);
  return { x, y: 1800 - hop, rot: -(1380 - x) / 150, s: 1.55 };
}
TRANS_FX.supplySmoke = {
  dur: .9,
  draw(p, d) {
    const nozzle = pp => { const S = trSignalAt(pp), r = 165 * S.s; return [S.x + Math.cos(S.rot) * r, S.y + Math.sin(S.rot) * r]; };
    // billows leave the fuze and swell to their places: first wisps along the roll, then three deep billows that back
    // the whole frame, then a column of varied billows, bottom rows first. After the cut the wind takes them off to the
    // left one by one, each at its own speed, shrinking as they go, the edges first.
    const q = seg(p, .56, 1);
    const tg = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) { const i = r * 3 + c; tg.push([170 + c * 370 + 110 * (hash(i) - .5) + (r % 2 ? 70 : -50), 1790 - r * 330 + 60 * (hash(i + 9) - .5), 330 * (.65 + .7 * hash(i + 4))]); }
    const wisps = [[1180, 1760, 100], [1010, 1720, 150], [840, 1680, 200]], deep = [[540, 1600, 950], [540, 960, 950], [540, 320, 950]];
    const all = [...wisps, ...deep, ...tg], P = [];
    all.forEach(([tx, ty, R], i) => {
      const pe = .03 + i * .0135, age = seg(p, pe, pe + .1); if (p < pe) return;
      const e = easeOut(age), [nx, ny] = nozzle(pe), h = hash(i + 40), isDeep = i >= 3 && i < 6;
      const delay = isDeep ? 0 : clamp(.28 * tx / W + .12 * hash(i + 60), 0, .4), qi = seg(q, delay, 1), f = .6 + .8 * hash(i + 50), m = ease(qi);
      const edge = clamp(Math.hypot((tx - 540) / 540, (ty - 960) / 960) / 1.2);
      const x = lerp(nx, tx, e) - 2100 * m * f, y = lerp(ny, ty, e) - 700 * m * (.6 + .8 * h);
      const rad = lerp(40, R, e) * (isDeep ? clamp(1 - 1.3 * ease(q)) : (1 + .25 * qi) * clamp(1 - Math.pow(qi, 1.4) * (.55 + .5 * edge)));
      if (rad > 8) P.push([x, y, rad, isDeep ? '#6E4294' : mixCol('#7A4AA0', '#9A70C2', h), i]);
    });
    const op = 255 * (1 - seg(q, .75, 1)), o = { curl: '#55337A', hi: '#C9A8E4', hiOp: .5 };
    const back = P.filter(b => b[4] < 6), front = P.filter(b => b[4] >= 6);
    trPuffs(back, op, '#3A2350', 5, 'tr-smk', { curl: '#55337A' });
    if (p < .5) { const S = trSignalAt(p); trSignal(S.x, S.y, S.s, S.rot); }   // the canister, until the column engulfs it
    trPuffs(front, op, '#3A2350', 5, 'tr-smk2', o);
    // thin wisps trailing off on the wind
    if (q > .25) for (let i = 0; i < 4; i++) {
      const k = seg(q, .25 + .1 * hash(i + 3), 1), x0 = W + 120 - 1700 * ease(k) * (.8 + .4 * hash(i)), y0 = 300 + i * 420 + 80 * hash(i + 7) - 300 * k;
      const L = []; for (let j = 0; j < 6; j++) L.push([x0 + j * 90, y0 + 40 * Math.sin(j * 1.3 + i + q * 4)]);
      boilSeed('tr-smkw' + i); paint(ribbon(L, 46 * (1 - k * .5), 6), { wash: '#A07ACB', washOp: 150 * Math.sin(Math.PI * k), ink: null });
    }
  },
};

// ---------- 6. sleepingBag ----------
// Reference: sleepingbag: grey-brown burlap quilted in long round tubes, stitched patches. It unrolls down over the frame
// like a blind (the roll shrinks as it pays out), its zipper runs down and back up, then it rolls away up. Timed in
// seconds so the zip always gets its frames: the unroll and roll-up take what they need, the hold between gets the rest.
function trBagPhases(p, d, o) {
  const k = o.in ?? .5, pre = d * k, post = d * (1 - k), s = trS(p, d, o);
  const un = Math.min(Math.max(.55 * pre, pre - .22), pre - .045), ru = Math.max(.55 * post, post - .2), h0 = -pre + un, h1 = post - ru;
  const r = k2 => lerp(170, 100, k2);
  let yr, rr;
  if (s < h0) { const k2 = ease((s + pre) / un); yr = lerp(-190, H + 120, k2); rr = r(k2); }
  else if (s < h1) { yr = H + 120; rr = 100; }
  else { const k2 = 1 - ease((s - h1) / ru); yr = lerp(-190, H + 120, k2); rr = r(k2); }
  const zk = s < h0 || s > h1 ? 0 : s < (h0 + h1) / 2 ? ease((s - h0) / ((h1 - h0) / 2)) : 1 - ease((s - (h0 + h1) / 2) / ((h1 - h0) / 2));
  return { yr, rr, zk };
}
const TR_BAG = { x0: -50, x1: W + 50, seams: [-50, 360, 720, W + 50], zx: 720 };
// how far the quilted tube bulges at x: 1 mid-tube, 0 at a seam
const trBagBulge = x => { const S = TR_BAG.seams; for (let k = 0; k + 1 < S.length; k++) if (x <= S[k + 1]) return Math.sin(Math.PI * clamp((x - S[k]) / (S[k + 1] - S[k]))); return 0; };
// the soft wander of a seam at height y (the fabric isn't ruler-straight)
const trBagWave = (sx, y) => sx < 0 || sx > W ? 0 : 12 * Math.sin(y / 170 + sx * .01) + 4 * Math.sin(y / 61 + sx);
TRANS_FX.sleepingBag = {
  dur: .8, in: .6,
  draw(p, d, o) {
    const { yr, rr, zk } = trBagPhases(p, d, o), { x0, x1, seams, zx } = TR_BAG;
    if (yr + rr < 0) return;
    const yf = yr, top = -80, hgt = yf - top;
    // a strip that follows a seam's wander: from offset a to offset b px off the seam
    const strip = (sx, a, b) => { const L = [], R = []; for (let y = top; y <= yf + 40; y += 60) { const w = trBagWave(sx, y); L.push([sx + a + w, y]); R.push([sx + b + w, y]); } return [...L, ...R.reverse()]; };
    if (yf > -60) {
      // burlap: a grey-brown wash woven with fine hatching both ways
      boilSeed('tr-bag');
      paint(rectPts(x0, top, x1 - x0, hgt), { wash: '#8E806A', ink: null, hatch: { d: 18, a: Math.PI / 2, o: { rand: .3 }, b: 'HB', c: '#6E6250', w: .8 } });
      paint(rectPts(x0, top, x1 - x0, hgt), { ink: null, hatch: { d: 22, a: 0, o: { rand: .3 }, b: 'HB', c: '#7A6E5A', w: .7 } });
      // each quilted tube is round: deep shade where the seams pinch it, a wide soft light down the middle, and sags
      for (let k = 0; k + 1 < seams.length; k++) {
        const a = seams[k], b = seams[k + 1], w = b - a;
        boilSeed('tr-bagq' + k);
        paint(strip(a, 0, 46), { wash: '#4E4436', washOp: 150, ink: null }); paint(strip(a, 46, 110), { wash: '#5E5242', washOp: 80, ink: null });
        paint(strip(b, -46, 0), { wash: '#4E4436', washOp: 150, ink: null }); paint(strip(b, -110, -46), { wash: '#5E5242', washOp: 80, ink: null });
        paint(strip(a, w * .24, w * .76), { wash: '#AA9C80', washOp: 100, ink: null }); paint(strip(a, w * .36, w * .64), { wash: '#BCAF94', washOp: 100, ink: null });
        for (let y = 140 + 120 * hash(k * 5); y < yf - 60; y += 250 + 60 * hash(y + k)) {   // the stuffing sags between the stitches
          const wa = trBagWave(a, y), xa = a + w * .18 + wa, xb = b - w * .18 + wa;
          boilSeed('tr-bagf' + k + ',' + Math.round(y));
          inkLine([[xa, y], [lerp(xa, xb, .5), y + 24], [xb, y]], 1.4, '#4E4436', 'inkfine', .5);
          inkLine([[xa + 20, y + 12], [lerp(xa, xb, .5), y + 36], [xb - 20, y + 12]], 1.1, '#C7BB9E', 'inkfine', .5);
        }
      }
      // the stitched seam
      boilSeed('tr-bagst');
      const L = []; for (let y = top; y <= yf; y += 60) L.push([360 + trBagWave(360, y), y]);
      if (L.length > 1) inkLine(L, 1.8, '#3E3428', 'inkfine', .3);
      for (let y = -40; y < yf - 20; y += 40) inkLine([[369 + trBagWave(360, y), y], [369 + trBagWave(360, y + 20), y + 20]], 1.4, '#D2C6A8', 'inkfine', 0);
      // patches, stitched on askew (reference: the icon's darker brown patches)
      for (const [px, py, pw, ph, rot, c] of [[160, 380, 210, 260, -.08, '#6E4632'], [520, 1180, 230, 190, .1, '#5E4C34'], [905, 600, 180, 230, .06, '#7A4E36'], [190, 1560, 190, 170, .12, '#6A4430']]) {
        if (py + ph / 2 > yf - 10) continue;
        push(); translate(px, py); rotate(rot);
        boilSeed('tr-bagp' + px);
        const Pp = [[-pw / 2, -ph / 2], [pw * .1, -ph / 2 - 8], [pw / 2, -ph / 2 + 10], [pw / 2 - 6, ph / 2], [-pw * .2, ph / 2 + 6], [-pw / 2 + 4, ph / 2 - 6]];
        paint(Pp, { wash: c, washOp: 220, ink: '#3E2E20', sw: 1.4 });
        for (let e = 0; e < Pp.length; e++) { const A = Pp[e], B = Pp[(e + 1) % Pp.length], n = Math.round(Math.hypot(B[0] - A[0], B[1] - A[1]) / 34); for (let k = 0; k < n; k++) { const t0 = (k + .2) / n, t1 = (k + .65) / n, ins = .84; inkLine([[lerp(A[0], B[0], t0) * ins, lerp(A[1], B[1], t0) * ins], [lerp(A[0], B[0], t1) * ins, lerp(A[1], B[1], t1) * ins]], 1.6, '#D9C8A2', 'inkfine', 0); } }
        pop();
      }
      // the zipper: a dark tape, two rows of brass teeth interlocking round a thin centre line, and the slider + pull
      boilSeed('tr-bagz');
      paint(strip(zx, -26, 26), { wash: '#3A3226', ink: null });
      for (let y = -60, i = 0; y < yf - 10; y += 11, i++) { const w = trBagWave(zx, y), sd = i % 2 ? 1 : -1; paint(rrPts(zx + w + (sd > 0 ? -3 : -15), y, 18, 9, 3), { wash: '#C9AE6C', ink: '#5E4A20', sw: .5 }); }
      const Lz = []; for (let y = top; y <= yf; y += 60) Lz.push([zx + trBagWave(zx, y), y]);
      if (Lz.length > 1) inkLine(Lz, 1, '#2A2218', 'inkfine', .3);
      const zy = Math.min(yf - 40, lerp(110, H - 160, zk)), zw = zx + trBagWave(zx, zy);
      boilSeed('tr-bagzs');
      paint(rrPts(zw - 32, zy - 46, 64, 92, 14), { wash: '#C9A44E', ink: PAL.ink, sw: 1.6 });
      paint(rrPts(zw - 17, zy + 20, 34, 100, 12), { wash: '#B48C3A', ink: PAL.ink, sw: 1.4 });
      paint(ellPts(zw, zy + 96, 8, 12, 8), { wash: '#3E3628', ink: null });
    }
    // the roll: a fat soft tube, bulging with the quilting and pinched at the seams, its turns rolling as it pays out
    const ry = (x, f) => yr + f * rr * (.84 + .16 * trBagBulge(x)), xs = []; for (let x = x0; x <= x1; x += 30) xs.push(x);
    const band = (f0, f1) => [...xs.map(x => [x, ry(x, f0)]), ...xs.slice().reverse().map(x => [x, ry(x, f1)])];
    boilSeed('tr-bagroll');
    paint(rectPts(x0, yr + rr * .7, x1 - x0, rr * .7), { wash: '#2B2233', washOp: 45, ink: null });   // its shadow
    paint(band(-1, 1), { wash: '#887A62', ink: PAL.ink, sw: 2.4 });
    paint(band(-.78, -.3), { wash: '#B2A588', washOp: 150, ink: null });
    paint(band(.35, .92), { wash: '#4E4436', washOp: 140, ink: null });
    for (const sx of [360, zx]) paint(rectPts(sx - 14, ry(sx, -1) + 4, 28, 2 * rr * .84 - 8), { wash: sx === zx ? '#3E3628' : '#7E6848', washOp: 200, ink: null });
    const ph = yr / rr;
    for (let i = 0; i < 3; i++) { const ang = ph + i * TAU / 3; if (Math.sin(ang) < 0) continue; boilSeed('tr-bagturn' + i); inkLine(xs.map(x => [x, ry(x, -Math.cos(ang) * .92)]), 1.6, '#5E4A30', 'inkfine', 0); }
  },
};

// ---------- 7. heliFlyover ----------
// The patrol heli (heli.js) comes in low and head-on from the distance, its searchlight sweeping the ground before it.
// It swells as it closes and the view swings under it. For the cut we're right under it: its dark belly down the middle,
// the skids and rocket pods either side, and the rotor blur blotting out the sky behind, blade shadows sweeping across.
// Then it climbs away off the top, shrinking, its rotor blur dragging over the next shot.
const TR_HELI_S = 5.2;   // its scale right overhead: the rotor disc (280 px × s) then covers the frame
function trHeliAt(p) {
  const S = TR_HELI_S;
  if (p <= .5) {
    // a constant zoom (it doubles in size every few frames), and the view swings under it as it closes
    const k = p / .5, kk = clamp(k / .8), s = .45 * Math.pow(S / .45, kk), zd = Math.sqrt(Math.max(0, (S / s) ** 2 - 1));
    return { s, elev: Math.atan2(1, zd), yaw: lerp(1.28, Math.PI / 2, ease(kk)), y: lerp(560, 960, ease(kk)), light: 1 - seg(kk, .62, .85), k: kk, disc: seg(kk, .7, .9) };
  }
  const q = seg(p, .5, 1);
  return { s: S * Math.pow(.6 / S, q * q), elev: Math.PI / 2, yaw: Math.PI / 2, y: 960 - 1700 * Math.pow(q, 1.5), light: 0, k: 1, disc: 1 - .75 * seg(q, .1, .45) };   // climbs away up the frame
}
// The main rotor's blur seen from below: a dark disc (op 255 blots out the sky), soft lighter blade sweeps turning in it
// and a faint line where the yellow tips run.
function trRotorBlur(mx, my, R, op, t, key) {
  if (op <= 2) return;
  boilSeed(key); paint(ellPts(mx, my, R, R, 56), { wash: '#2C323C', washOp: op, ink: null });
  const a0 = (t * 3.3 + .13) * TAU;
  for (let b = 0; b < 4; b++) {
    const a = a0 + b * Math.PI / 2, W2 = [[mx, my]]; for (let i = 0; i <= 8; i++) { const aa = a - .55 * i / 8; W2.push([mx + Math.cos(aa) * R * .98, my + Math.sin(aa) * R * .98]); }
    boilSeed(key + 'sw' + b); paint(W2, { wash: '#5E6670', washOp: .3 * op, ink: null });
  }
  const T = []; for (let i = 0; i <= 64; i++) { const aa = i / 64 * TAU; T.push([mx + Math.cos(aa) * R * .95, my + Math.sin(aa) * R * .95]); }
  boilSeed(key + 'tip'); trSegLine(T, 1.4, '#B89A4E');
}
// Belly details over patrolHeli's hull, in its own model space (so they sit right in every view): panel seams and
// rivets, the cargo hook, a red beacon, an access hatch, oil streaks.
function trHeliBelly(x, y, s, o) {
  const C = heliCam(o); if (hFacing(C, [0, -1, 0]) < .5) return;
  const by = X => hStation(HCAB, X)[1] + .5, pt = (X, Z) => hWorld(x, y, s, o, hProj(C, [X, by(X), Z])), hw = X => hStation(HCAB, X)[2] * .78;
  const sw = clamp(s * .3, 1, 3.6);
  boilSeed('tr-belly');
  for (const [z, X0] of [[10, -30], [-14, -10]]) paint([pt(X0, z), pt(X0, z + 6), pt(-118, z + 9), pt(-118, z - 2)], { wash: '#3A3E44', washOp: 110, ink: null });   // oil streaks
  for (const z of [-27, 27]) { const L = []; for (let X = -112; X <= 150; X += 12) L.push(pt(X, z)); inkLine(L, sw, '#3E464E', 'inkfine', 0); L.forEach((q, i) => { if (i % 2) paint(ellPts(q[0] + s * 1.8, q[1], s * 1.1, s * 1.1, 6), { wash: '#9AA3AB', ink: null }); }); }
  for (const X of [-92, -40, 30, 96]) { const L = []; for (let z = -hw(X); z <= hw(X); z += 8) L.push(pt(X, z)); inkLine(L, sw, '#3E464E', 'inkfine', 0); L.forEach((q, i) => { if (i % 2) paint(ellPts(q[0], q[1] + s * 1.8, s * 1.1, s * 1.1, 6), { wash: '#9AA3AB', ink: null }); }); }
  paint([pt(48, -18), pt(80, -18), pt(80, 14), pt(48, 14)], { wash: '#4E565E', ink: PAL.ink, sw: sw * .8 });   // access hatch
  paint([pt(60, -6), pt(68, -6), pt(68, 2), pt(60, 2)], { wash: '#2E3238', ink: null });
  const hk = pt(0, 0);   // the cargo hook's round housing
  paint(ellPts(hk[0], hk[1], s * 12, s * 12, 18), { wash: '#454C53', ink: PAL.ink, sw: sw * .7 });
  paint(ellPts(hk[0], hk[1], s * 6, s * 6, 14), { wash: '#2A2E33', ink: null });
  const bc = pt(-62, 0); glow(bc[0], bc[1], s * 26, '#FF3048', .9);   // the red beacon
  paint(ellPts(bc[0], bc[1], s * 7, s * 7, 14), { wash: '#E23A3A', ink: PAL.ink, sw: sw * .7 });
  paint(ellPts(bc[0] - s * 2, bc[1] - s * 2, s * 2.4, s * 2, 8), { wash: '#FFB0A0', ink: null });
}
TRANS_FX.heliFlyover = {
  dur: .7,
  draw(p, d, o, t) {
    const S = trHeliAt(p);
    const ho = { yaw: S.yaw, elev: S.elev, t, key: 'tr', light: S.light > .01 ? { on: S.light, aim: Math.PI / 2 + .55 * Math.sin(p * 9 - 1), len: 700 + 900 * S.k, w: .2 } : null };
    const C = heliCam(ho), under = clamp((hFacing(C, [0, -1, 0]) - .5) / .4);
    // its shadow darkens the frame as it comes over
    const sh = seg(p, .3, .46) * (1 - seg(p, .6, .85));
    if (sh > 0) { boilSeed('tr-heli-shade'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#1E2230', washOp: 90 * sh, ink: null }); }
    // the rotor blur behind it (it's above the heli, and we're below)
    const [mx, my] = hWorld(540, S.y, S.s, ho, hProj(C, [0, 134, 0])), R = 280 * S.s * .93;
    trRotorBlur(mx, my, R, 255 * S.disc * under, t, 'tr-rotor');
    patrolHeli(540, S.y, S.s, ho);
    if (under > .02) {
      // the belly in its own shade
      const hull = hThin(hullOf(hLoft(HCAB, HCAB_CUTS, 2, 16).map(q => hWorld(540, S.y, S.s, ho, hProj(C, q.P)))), 6);
      boilSeed('tr-belly-shade'); paint(hull, { wash: '#141A26', washOp: 85 * under, ink: null });
      // the tail rotor, edge-on from below: a small blurred disc at the end of the boom
      const [tx, ty] = heliPt(540, S.y, S.s, ho, 'tail');
      boilSeed('tr-trotor'); paint(ellPts(tx, ty, 14 * S.s, 50 * S.s, 18), { wash: '#3C4148', washOp: 110 * under, ink: null });
      inkLine([[tx, ty - 48 * S.s], [tx, ty + 48 * S.s]], clamp(S.s * .5, .8, 3), '#B89A4E', 'inkfine', 0);
    }
    trHeliBelly(540, S.y, S.s, ho);
    // blade shadows sweeping across the belly while we're under it
    if (under * S.disc > .05) {
      const a0 = (t * 3.3 + .4) * TAU;
      for (let b = 0; b < 2; b++) {
        const a = a0 + b * Math.PI, W2 = [[mx, my]]; for (let i = 0; i <= 6; i++) { const aa = a - .3 * i / 6; W2.push([mx + Math.cos(aa) * R, my + Math.sin(aa) * R]); }
        boilSeed('tr-bladesh' + b); paint(W2, { wash: '#0E121A', washOp: 55 * under * S.disc, ink: null });
      }
    }
  },
};

// ---------- 8. wallUpgrade ----------
// A twig wall rises; the hammer (reference: hammer: a pale wooden mallet) bonks it up a grade four times (twig → wood →
// stone → sheet metal → armoured, each with a burst of sparkles and dust), then a raid charge cracks it and it crumbles.
const TR_WALL = { x0: -50, y0: -60, w: 1180, h: 2050, cols: 4, rows: 6, hit: [560, 1010], steps: [.19, .32, .45, .58] };   // steps: s after the start at in .7, d .9
function trWallVert(i, j) {
  const { x0, y0, w, h, cols, rows } = TR_WALL, edge = i === 0 || j === 0 || i === cols || j === rows;
  return [x0 + w * i / cols + (edge ? 0 : 110 * (hash(i * 17 + j * 5) - .5)), y0 + h * j / rows + (edge ? 0 : 100 * (hash(i * 7 + j * 19 + 3) - .5))];
}
// a jagged break line between two grid vertices (the same for both cells that share it)
function trWallEdge(a, b, id) {
  const A = trWallVert(...a), B = trWallVert(...b), dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l, P = [A];
  for (let k = 1; k < 4; k++) { const o = 34 * (hash(id * 3 + k) - .5) * 2; P.push([A[0] + dx * k / 4 + nx * o, A[1] + dy * k / 4 + ny * o]); }
  P.push(B); return P;
}
function trWallCells() {
  const { cols, rows } = TR_WALL, C = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const top = trWallEdge([i, j], [i + 1, j], 100 + i * 13 + j * 7), bot = trWallEdge([i, j + 1], [i + 1, j + 1], 100 + i * 13 + (j + 1) * 7);
    const lef = trWallEdge([i, j], [i, j + 1], 500 + i * 13 + j * 7), rig = trWallEdge([i + 1, j], [i + 1, j + 1], 500 + (i + 1) * 13 + j * 7);
    const poly = [...top, ...rig.slice(1), ...bot.slice(0, -1).reverse(), ...lef.slice(1, -1).reverse()];
    let cx = 0, cy = 0; for (const q of poly) { cx += q[0]; cy += q[1]; } cx /= poly.length; cy /= poly.length;
    C.push({ i, j, poly, cx, cy, lef, rig, top });
  }
  return C;
}
// one armoured cell: dark steel, its stretch of the two riveted straps, a rust stain
function trArmorCell(c, dx, dy, rot, inkW, op = 255) {
  const { x0, y0, w, h } = TR_WALL;
  push(); translate(c.cx + dx, c.cy + dy); rotate(rot); translate(-c.cx, -c.cy);
  boilSeed('tr-wc' + c.i + ',' + c.j);
  if (op < 255 && inkW) inkW = 0;
  paint(c.poly, { wash: '#5E6670', washOp: op, ink: inkW ? PAL.ink : null, sw: inkW });
  if (inkW || op < 255) paint(c.poly.map(([x, y]) => [lerp(c.cx, x, .8), lerp(c.cy, y, .8) - 10]), { wash: '#69717B', washOp: 90 * op / 255, ink: null });   // a broken chunk catches the light
  const xAt = (E, y) => { for (let k = 0; k + 1 < E.length; k++) if ((E[k][1] - y) * (E[k + 1][1] - y) <= 0) return lerp(E[k][0], E[k + 1][0], (y - E[k][1]) / ((E[k + 1][1] - E[k][1]) || 1)); return E[0][0]; };
  for (const fy of [.25, .75]) {
    const by = y0 + h * fy; if (Math.abs(by - (y0 + h * (c.j + .5) / TR_WALL.rows)) > 60) continue;
    const xl = xAt(c.lef, by) + 26, xr = xAt(c.rig, by) - 26; if (xr - xl < 40) continue;
    paint(rectPts(xl, by - 30, xr - xl, 60), { wash: '#474D55', washOp: op, ink: op < 255 ? null : PAL.ink, sw: 1.2 });
    for (let x = x0 + 40; x < x0 + w; x += 74) if (x > xl + 18 && x < xr - 18) { paint(ellPts(x, by, 9, 9, 8), { wash: '#A3ABB3', washOp: op, ink: op < 255 ? null : PAL.ink, sw: .5 }); }
  }
  if (hash(c.i * 5 + c.j * 3) < .5) paint(ellPts(c.cx + 40 * (hash(c.i + c.j) - .5), c.cy + 50, 70, 34, 12, 3), { wash: '#8E5A3A', washOp: 110 * op / 255, ink: null });
  pop();
}
// the twig frame, sized for the full frame: rough lashed sticks (wallPanel's own is drawn for 300 px walls)
function trTwigFrame(off) {
  const S = [[[30, -80], [50, 2000]], [[370, -80], [356, 2000]], [[712, -80], [726, 2000]], [[1050, -80], [1036, 2000]],
    [[-60, 90], [1140, 70]], [[-60, 660], [1140, 690]], [[-60, 1260], [1140, 1240]], [[-60, 1850], [1140, 1870]], [[30, 90], [1040, 1850]], [[1040, 90], [40, 1850]]];
  S.forEach(([a, b], i) => {
    a = [a[0], a[1] + off]; b = [b[0], b[1] + off];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, bend = (hash(i * 5) - .5) * 70;
    const P = [a, [lerp(a[0], b[0], .35) + nx * bend, lerp(a[1], b[1], .35) + ny * bend], [lerp(a[0], b[0], .7) + nx * bend * .5, lerp(a[1], b[1], .7) + ny * bend * .5], b];
    boilSeed('tr-twig' + i);
    paint(ribbon(P, 50, 36), { wash: i % 3 ? '#CDA76D' : '#BE9860', ink: PAL.ink, sw: 2.2 });
    inkLine(through(P, 4).map(([x, y]) => [x + nx * 8, y + ny * 8]), 1, '#8E6B3D', 'inkfine', .3);   // the grain
    for (let k = 0; k < 2; k++) { const q = .25 + .5 * hash(i + k * 7), c = through(P, 4)[Math.floor(q * 12)]; paint(ellPts(c[0], c[1], 13, 9, 8), { wash: '#8E6B3D', ink: PAL.ink, sw: .8 }); }
  });
  for (const x of [40, 363, 719, 1043]) for (const y of [80, 675, 1250, 1860]) {   // rope lashings where they cross
    boilSeed('tr-lash' + x + y);
    for (let k = 0; k < 3; k++) inkLine([[x - 30, y + off - 14 + k * 13], [x + 30, y + off - 6 + k * 13]], 2.6, '#E2D3A6', 'ink', 0);
  }
}
function trMallet(px, py, rot, sq) {   // pivot at the end of the handle; the head points along -y
  push(); translate(px, py); rotate(rot);
  boilSeed('tr-mallet');
  paint(rrPts(-22, -700, 44, 720, 18), { wash: '#B08A58', ink: PAL.ink, sw: 2 });
  inkLine([[-6, -640], [-8, -60]], 1, '#8E6A40', 'inkfine', .3);
  push(); translate(0, -730); scale(1 + sq, 1 - sq * .6);
  paint(rrPts(-150, -90, 300, 180, 16), { wash: '#D1AC72', ink: PAL.ink, sw: 2.4 });
  paint(rrPts(-150, -90, 60, 180, 14), { wash: '#B48A52', washOp: 200, ink: null });
  paint(rrPts(90, -90, 60, 180, 14), { wash: '#E2C48E', washOp: 160, ink: null });
  for (const yy of [-40, 10, 50]) inkLine([[-120, yy], [120, yy + 6]], .9, '#9A7444', 'inkfine', .3);
  pop(); pop();
}
// The middle grades at full-frame size, true to the game's walls: wood is planks with two nailed cross boards, stone is
// chunky blocks in mortar, sheet metal is corrugated, bolted, rusty panels.
function trWallGrade(g) {
  const { x0, y0, w, h } = TR_WALL;
  boilSeed('tr-grade' + g);
  if (g === 1) {   // wood
    for (let i = 0; i < 6; i++) { const px = x0 + i * w / 6; boilSeed('tr-plank' + i); paint(rectPts(px, y0, w / 6, h, 2), { wash: i % 2 ? '#B98A57' : '#AD7E4C', ink: PAL.ink, sw: 1.6 }); inkLine([[px + 50 + 30 * hash(i), y0 + 40], [px + 60 + 30 * hash(i), y0 + h - 40]], 1, '#8A6238', 'inkfine', .3); paint(ellPts(px + 100, 300 + 1300 * hash(i + 3), 16, 26, 10), { wash: '#7E5A36', ink: PAL.ink, sw: .6 }); }
    for (const by of [360, 1500]) {
      boilSeed('tr-board' + by); paint([[x0, by - 70], [x0 + w, by - 60], [x0 + w, by + 66], [x0, by + 58]], { wash: '#9E7044', ink: PAL.ink, sw: 2 });
      inkLine([[x0 + 20, by - 20], [x0 + w - 20, by - 12]], 1, '#7E5630', 'inkfine', .3);
      for (let i = 0; i < 6; i++) for (const dy of [-26, 26]) paint(ellPts(x0 + (i + .5) * w / 6, by + dy, 8, 8, 8), { wash: '#3A3632', ink: null });   // nail heads
    }
  } else if (g === 2) {   // stone: chunky blocks in light mortar
    paint(rectPts(x0, y0, w, h), { wash: '#8E8B84', ink: null });
    for (let r = 0; r < 7; r++) {
      const by = y0 + r * h / 7; let bx = x0 - (r % 2 ? 180 : 40);
      for (let c = 0; bx < x0 + w; c++) {
        const bw = 330 + 140 * hash(r * 7 + c), i = r * 7 + c, j = () => 7 * (hash(i * 3 + bx) - .5);
        boilSeed('tr-stone' + i);
        paint([[bx + 12 + j(), by + 12 + j()], [bx + bw - 12 + j(), by + 14 + j()], [bx + bw - 10 + j(), by + h / 7 - 12 + j()], [bx + 14 + j(), by + h / 7 - 10 + j()]], { wash: ['#A9ADB1', '#9EA2A6', '#B3B5B4', '#A2A49F'][i % 4], ink: PAL.ink, sw: 1.3 });
        paint([[bx + 24, by + 24], [bx + bw * .6, by + 26], [bx + bw * .45, by + 70], [bx + 26, by + 74]], { wash: '#C2C4C4', washOp: 110, ink: null });   // the lit top face
        if (hash(i + 50) < .35) inkLine([[bx + bw * .3, by + 20], [bx + bw * .36, by + 90], [bx + bw * .3, by + 150]], 1.2, '#5E6066', 'inkfine', 0);   // a crack
        bx += bw;
      }
    }
  } else {   // sheet metal: corrugated, bolted, rusty
    for (let i = 0; i < 2; i++) {
      const px = x0 + i * w / 2;
      boilSeed('tr-sheet' + i); paint(rectPts(px, y0, w / 2 + 6, h, 2), { wash: i ? '#8F9AA4' : '#86919B', ink: PAL.ink, sw: 2 });
      for (let x = px + 30; x < px + w / 2; x += 58) { paint(rectPts(x, y0, 18, h), { wash: '#B4BEC6', washOp: 150, ink: null }); paint(rectPts(x + 24, y0, 16, h), { wash: '#5E6872', washOp: 120, ink: null }); }   // the ribs
    }
    for (const [rx, ry, rw, rh] of [[120, 520, 260, 180], [700, 1180, 300, 240], [260, 1560, 200, 160], [880, 260, 180, 200]]) { boilSeed('tr-rust' + rx); paint(ellPts(rx, ry, rw / 2, rh / 2, 16, 8), { wash: '#9A5A36', washOp: 150, ink: null }); paint(ellPts(rx + 20, ry + 30, rw / 4, rh / 3, 12, 6), { wash: '#7A4228', washOp: 130, ink: null }); }
    for (const by of [140, 960, 1790]) { boilSeed('tr-bolts' + by); paint(rectPts(x0, by - 22, w, 44), { wash: '#6E7882', ink: PAL.ink, sw: 1.2 }); for (let x = x0 + 30; x < x0 + w; x += 82) paint(ellPts(x, by, 11, 11, 8), { wash: '#C9D0D6', ink: PAL.ink, sw: .6 }); }
  }
}
TRANS_FX.wallUpgrade = {
  dur: .9, in: .7,
  draw(p, d, o) {
    // timed in seconds: tt from the start, sc scales the default (in .7, d .9: .63 s before the cut) to this one
    const { x0, y0, w, h, hit } = TR_WALL, pre = d * o.in, post = d * (1 - o.in), s = trS(p, d, o), tt = s + pre, sc = pre / .63;
    const steps = TR_WALL.steps.map(v => v * sc), HOLD = .045, BACK = .04;
    let g = 0; for (const st of steps) if (tt >= st) g++;
    const rise = steps[0] - .06 * sc;
    if (g < 4) {
      const off = (H + 2200) * (1 - easeOut(clamp(tt / rise)));   // the twig frame rises out of the ground
      if (g) trWallGrade(g); else trTwigFrame(off);
    } else {
      const C = trWallCells(), crack = clamp(s / .06), out = 1 - seg(s, post - .09, post);
      // the raid charge's dust, behind the chunks
      if (s > 0) {
        const dk = clamp(s / post), D = [];
        for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU + .3, dd = 120 + 520 * easeOut(dk); D.push([540 + Math.cos(ang) * dd, 980 + Math.sin(ang) * dd * .8 - 200 * dk, 160 + 120 * dk, mixCol('#8C8274', '#CFC4AE', dk)]); }
        trPuffs(D, 230 * (1 - dk), null, 0, 'tr-raid', { curl: '#6E6658' });
      }
      if (s <= .04) { boilSeed('tr-wall-armor'); paint(rectPts(x0, y0, w, h), { wash: '#5E6670', ink: null }); }
      for (const c of C) {   // blasted out from the middle and falling; they fade in the last frames
        const dn = clamp(Math.hypot((c.cx - 540) * 1.5, c.cy - 960) / 1500), a = s - (.03 + .04 * dn);
        if (a <= 0) { trArmorCell(c, 0, 0, 0, crack > dn ? 2.2 : 0); continue; }
        const l = Math.hypot(c.cx - 540, c.cy - 960) || 1, vx = (c.cx - 540) / l * 2400, vy = (c.cy - 960) / l * 1400 + 300;
        trArmorCell(c, vx * a, vy * a + 40000 * a * a, (hash(c.i * 3 + c.j) - .5) * 9 * a, 2.2, 255 * out);
      }
      if (s > 0 && s < .2) trFireball(540, 980, 330 * easeOut(s / .06), clamp(s / .15), 1 - seg(s, .08, .2), 'tr-raidf');
      if (crack > 0 && s < .08) glow(540, 980, 500 * crack, '#FFB060', .4 * (1 - s / .08));   // light through the cracks
    }
    // the hammer: in during the rise, then four bonks. Each impact holds for a frame (HOLD) with the head on the hit,
    // then it springs back up (BACK) and swings down again, so every bonk lands on a rendered frame.
    const [mx, my] = [1010, 1590], imp = -.68, wind = .15, last = steps[3] + HOLD;
    if (tt > .03 * sc && tt < last + .14) {
      let rot = wind, sq = 0;
      const prev = steps.filter(st => st <= tt).pop(), next = steps.find(st => st > tt);
      if (prev !== undefined && tt - prev < HOLD) { rot = imp; sq = .22 * (1 - (tt - prev) / HOLD); }
      else if (prev !== undefined && tt - prev < HOLD + BACK) rot = lerp(imp, wind, easeOut((tt - prev - HOLD) / BACK));
      else if (next !== undefined) { const s0 = Math.max(prev !== undefined ? prev + HOLD + BACK : 0, next - .07); rot = tt < s0 ? wind : lerp(wind, imp, easeIn((tt - s0) / (next - s0))); }
      const slide = 900 * (1 - easeOut(clamp((tt - .03 * sc) / (.09 * sc)))) + 900 * easeIn(clamp((tt - last) / .14));
      trMallet(mx + slide * .7, my + slide, rot, sq);
    }
    // the upgrade burst on each impact frame: sparkles off the hit, a puff of dust
    steps.forEach((st, k) => {
      const a = tt - st; if (a < 0 || a > .16) return;
      const kk = a / .16;
      glow(hit[0], hit[1], 130 * (1 - kk), '#FFF2C4', .5 * (1 - kk));
      for (let i = 0; i < 9; i++) {
        const ang = i / 9 * TAU + k, r = 60 + 420 * easeOut(kk) * (.7 + .5 * hash(i + k * 9));
        boilSeed('tr-spark' + i);
        paint(starPts(hit[0] + Math.cos(ang) * r, hit[1] + Math.sin(ang) * r, 34 * (1 - kk * .8), .3, 4, kk * 2), { wash: i % 2 ? '#FFF6D6' : '#FFD86A', ink: null });
      }
      puff(hit[0], hit[1] + 40, 170, a, { life: .09, col: '#E6DCC4', key: 'tr-up' + k, n: 6, noInk: true });
    });
  },
};

// ---------- demo loops: studio.html?ep=0&loop=transitions ----------
// transitions: all eight at their defaults; transitionsEp: the options the episodes use (ep1 rockSpin { in: .4 } and
// sleepingBag { dur: .6, in: .35 }, ep2 doorSlam { dur: .6, in: .3 }, ep4 rockSpin { in: .3 }, ep5 heliFlyover { in: .3 }
// and supplySmoke { in: .35 }). Cuts at 0.75 + 1.5 i s. The ...Key twins swap the backgrounds for flat magenta / green.
(() => {
  const ORDER = ['rockSpin', 'doorSlam', 'garageDoor', 'c4Blast', 'supplySmoke', 'sleepingBag', 'heliFlyover', 'wallUpgrade'], SLOT = 1.5;
  const EP = [['rockSpin', { in: .4 }], ['sleepingBag', { dur: .6, in: .35 }], ['doorSlam', { dur: .6, in: .3 }], ['rockSpin', { in: .3 }], ['heliFlyover', { in: .3 }], ['supplySmoke', { in: .35 }]];
  const lists = { demo: ORDER.map((name, i) => ({ t: SLOT / 2 + i * SLOT, name, o: {} })), ep: EP.map(([name, o], i) => ({ t: SLOT / 2 + i * SLOT, name, o })) };
  const beach = t => {   // A: day on the beach
    rustSky(t, { horizon: 900, sun: [800, 330] });
    hills(t, { horizon: 900 });
    seaBeach(t, { horizon: 900, shore: 1160 });
    pineTree(150, 1560, 1.5);
    spawnling(600, 1480, 40, { ...feel('happy', t), view: 'front' });
  };
  const base = t => {   // B: a base at night, a campfire
    rustSky(t, { tod: 1.8, horizon: 1050, sun: [260, 300] });
    hills(t, { horizon: 1050, tod: 1.8 });
    boilSeed('tr-demo-ground'); paint(rectPts(-60, 1040, W + 120, 1000), { wash: '#2E3A34', ink: null });
    foundation(150, 960, 1420, 46, 'stone');
    wallPanel(150, 1374, 270, 380, 'stone'); doorPanel(420, 1374, 270, 380, 'armor'); wallPanel(690, 1374, 270, 380, 'metal');
    codeLock(640, 1190, .9, 'locked');
    campfire(540, 1700, 1.3, t);
  };
  const keyA = () => { boilSeed('tr-keyA'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#FF00FF', ink: null }); };
  const keyB = () => { boilSeed('tr-keyB'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#00FF00', ink: null }); };
  const loop = (L, bgs) => { const f = t => { const sh = transShakeBegin(t, L); bgs[L.filter(e => t >= e.t).length % 2](t); drawTransitions(t, L); if (sh) pop(); }; f.len = L.length * SLOT; return f; };
  LOOPS.transitions = loop(lists.demo, [beach, base]); LOOPS.transitionsKey = loop(lists.demo, [keyA, keyB]);
  LOOPS.transitionsEp = loop(lists.ep, [beach, base]); LOOPS.transitionsEpKey = loop(lists.ep, [keyA, keyB]);
})();
