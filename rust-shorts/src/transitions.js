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
const transActive = (t, list = TRANS) => list.filter(e => Math.abs(t - e.t) < transDur(e) / 2);
// Paints every running transition over the frame (screen space, no camera). Lettering queued by the shot is flushed
// first, so the cover goes over it.
function drawTransitions(t, list = TRANS) {
  const act = transActive(t, list); if (!act.length) return;
  flushLetters();
  for (const e of act) {
    const d = transDur(e), p = (t - e.t) / d + .5;
    push(); if (e.o.flip) { translate(W, 0); scale(-1, 1); }
    TRANS_FX[e.name].draw(p, d, e.o, t);
    pop();
  }
}
// The screen shake of the running transitions at t: [dx, dy] px, or null.
function transitionShake(t, list = TRANS) {
  let a = 0;
  for (const e of transActive(t, list)) { const fx = TRANS_FX[e.name]; if (!fx.shake) continue; const d = transDur(e); a += fx.shake((t - e.t) / d + .5, d, e.o) * (e.o.shake ?? 1); }
  return a > .5 ? shakeXY(t, a) : null;
}
// Hook for drawWorld: shifts (and slightly over-scales, so no paper edge shows) everything drawn until the matching pop().
function transShakeBegin(t, list = TRANS) {
  const s = transitionShake(t, list); if (!s) return false;
  const m = Math.max(Math.abs(s[0]), Math.abs(s[1]));
  push(); translate(W / 2 + s[0], H / 2 + s[1]); scale(1 + 2.4 * m / W); translate(-W / 2, -H / 2);
  return true;
}
// a closed ink loop (inkLine through the points and back to the first)
const trLoop = (P, sw, col, br = 'ink') => inkLine([...P, P[0]], sw, col, br, .5);
// Puffs painted as one silhouette: every rim first, then every fill, so only the outer edge keeps an outline.
// P = [[x, y, r, col], ...]
function trPuffs(P, op, rim = PAL.ink, rimW = 4, key = 'puffs') {
  if (op <= 2) return;
  if (rim) P.forEach(([x, y, r], i) => { boilSeed(key + 'r' + i); paint(ellPts(x, y, r + rimW, r * .9 + rimW, 26, r * .012), { wash: rim, washOp: op, ink: null }); });
  P.forEach(([x, y, r, c], i) => { boilSeed(key + 'r' + i); paint(ellPts(x, y, r, r * .9, 26, r * .012), { wash: c, washOp: op, ink: null }); });
}

// ---------- 1. rockSpin ----------
// The rock flies at the lens from the lower left on a constant zoom (it doubles in size every few frames), fills the
// frame for the cut, THOCKs off the glass and tumbles away to the upper right, shrinking into the distance.
function trRockAt(p) {
  const rot = -2.6 + 5.4 * p;
  if (p <= .5) {
    const k = clamp(p / .4), u = p < .4 ? 60 * Math.pow(1500 / 60, k) : lerp(1500, 1750, seg(p, .4, .5));
    const e = easeOut(k);
    return { x: lerp(-170, 540, e), y: lerp(1850, 960, e) - 260 * Math.sin(Math.PI * e) * (1 - e), u, rot };
  }
  const q = seg(p, .5, 1), e = Math.pow(q, 1.5);
  return { x: lerp(540, 1430, e), y: lerp(960, -330, e), u: 1750 * Math.pow(95 / 1750, e), rot };
}
// The rock, drawn like rockProp (rustcast.js) but with its curves smoothed here: p5.brush drops curved shapes (curv > 0)
// once they're more than about 1100 px across, and this one gets to 4000.
const trClosed = (P, n = 5) => { const L = P.length, C = through([P[L - 1], ...P, P[0], P[1]], n); return C.slice(n, n * (L + 1)); };
const TR_ROCK = [[-.25, -1.05], [.85, -1.3], [1.7, -.75], [1.85, .25], [1.15, .95], [.1, .9], [-.45, .2]];
function trRock(x, y, u, rot) {
  const sw = clamp(u / 34, 1, 5.5), R = trClosed(U2(u, TR_ROCK));
  push(); translate(x, y); rotate(rot); translate(-.7 * u, .17 * u);
  boilSeed('tr-rock');
  paint(R, { wash: '#E3D3B6', ink: null });
  paint(U2(u, [[.95, -.2], [1.75, -.45], [1.8, .25], [1.15, .9], [.7, .55]]), { wash: '#C9B391', ink: null });          // the shaded side
  // stone mottling and pits, so a frame-filling rock still reads as stone (kept well inside the outline)
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, d = .2 + .35 * hash(i + 4), mx = .7 + Math.cos(a) * d, my = -.2 + Math.sin(a) * d * .8;
    boilSeed('tr-rockm' + i);
    paint(ellPts(mx * u, my * u, (.1 + .12 * hash(i)) * u, (.07 + .08 * hash(i + 2)) * u, 12, u * .006, a), { wash: i % 3 ? '#CDB894' : '#B49C78', washOp: 70, ink: null });
  }
  for (let i = 0; i < 5; i++) { const px = .3 + .9 * hash(i + 20), py = -.75 + .9 * hash(i + 30); boilSeed('tr-rockp' + i); paint(ellPts(px * u, py * u, .025 * u, .018 * u, 8), { wash: '#8E7A5E', washOp: 150, ink: null }); }
  boilSeed('tr-rocks');
  paint(trClosed(U2(u, [[-.4, .25], [-.1, .52], [.35, .78], [.9, .86], [1.15, .82], [.8, .6], [.3, .5], [-.05, .3]])), { wash: '#A8322A', washOp: 230, ink: null });   // the red smear on the striking edge
  paint(U2(u, [[.2, .62], [.5, .66], [.42, .72]]), { wash: '#7E2420', ink: null });
  paint(R, { ink: PAL.ink, sw: sw * .7 });
  inkLine(through(U2(u, [[-.05, -.62], [.35, -.42], [.62, -.66]]), 5), sw * .38, '#8E7A5E', 'inkfine', 0);                 // creases
  inkLine(U2(u, [[1.2, -.95], [1.45, -.6]]), sw * .3, '#8E7A5E', 'inkfine', 0);
  pop();
}
TRANS_FX.rockSpin = {
  dur: .7,
  draw(p, d) {
    const S = trRockAt(p), post = p > .5;
    // the whoosh: a pale smear back along the path, and dry-brush streaks
    const C = [[S.x, S.y]], wd = [];
    for (let j = 1; j <= 6; j++) { const pj = p - j * .032; if (pj < 0 || (post && pj < .5 - .001)) break; const Q = trRockAt(pj); C.push([Q.x, Q.y]); }
    if (C.length > 2) {
      const w0 = S.u * 1.9, fade = post ? 1 - seg(p, .5, .85) : 1;
      boilSeed('tr-whoosh');
      paint(ribbon(C, w0, w0 * .15), { wash: '#EFE3C8', washOp: 110 * fade, ink: null });
      for (const k of [-.32, 0, .3]) {
        const L = C.map(([cx, cy], i) => { const a = C[Math.min(i + 1, C.length - 1)], b = C[Math.max(i - 1, 0)], dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) || 1; return [cx - dy / l * k * w0 * (1 - i / C.length), cy + dx / l * k * w0 * (1 - i / C.length)]; });
        inkLine(L, clamp(S.u / 60, 1, 4), '#BFAE8C', 'dry', .5);
      }
    }
    trRock(S.x, S.y, S.u, S.rot);
    // THOCK: impact ticks round the frame as it hits the glass
    const a = (p - .5) * d;
    if (a >= 0 && a < .12) {
      const k = a / .12;
      for (let i = 0; i < 10; i++) {
        const ang = i / 10 * TAU + .3, r0 = 380 + 380 * k, r1 = r0 + 140 * (1 - k);
        boilSeed('tr-thock' + i);
        inkLine([[540 + Math.cos(ang) * r0 * .9, 960 + Math.sin(ang) * r0 * 1.4], [540 + Math.cos(ang) * r1 * .9, 960 + Math.sin(ang) * r1 * 1.4]], 3.4 * (1 - k), PAL.ink, 'ink', 0);
      }
    }
  },
  shake(p, d) { const a = (p - .5) * d; return a >= 0 && a < .09 ? 10 * (1 - a / .09) : 0; },
};

// ---------- 2. doorSlam ----------
// An armoured door (reference: door.hinged.toptier: dark rusty steel, rivet rows round the edges and across the middle,
// a viewing slot, a latch plate) hinged at the left frame edge. It's a real rotation in perspective: the camera sits
// D px in front of the closed door, so the free edge swells as it swings toward the lens and shrinks as it swings away.
const TR_DOOR = { D: 1500, w: 1160, h: 2040, hx: -580, T: 70 };
function trDoorPt(th, u, v, back = 0) {
  const s = u * TR_DOOR.w, X = TR_DOOR.hx + s * Math.cos(th) - Math.sin(th) * back, Z = TR_DOOR.D + s * Math.sin(th) + Math.cos(th) * back, k = TR_DOOR.D / Z;
  return [W / 2 + X * k, H / 2 + (v - .5) * TR_DOOR.h * k];
}
function trDoorAngle(p, d) {
  if (p < .34) return -1.32 * (1 - Math.pow(p / .34, 1.5));                                       // whips in from the lens side
  if (p < .62) { const a = (p - .34) * d; return -.06 * Math.exp(-a * 18) * Math.abs(Math.sin(a * 38)); }   // the slam's rebound
  return 2.05 * Math.pow(seg(p, .62, 1), 1.4);                                                     // swings away into the scene
}
TRANS_FX.doorSlam = {
  dur: .8,
  draw(p, d) {
    const th = trDoorAngle(p, d), M = (u, v) => trDoorPt(th, u, v);
    const A = M(0, .5), B = M(1, .5); if (B[0] < A[0] + 3 || Math.max(A[0], B[0]) < -20) return;   // edge-on, from behind, or gone
    const Q = (u0, v0, u1, v1) => [M(u0, v0), M((u0 + u1) / 2, v0), M(u1, v0), M(u1, (v0 + v1) / 2), M(u1, v1), M((u0 + u1) / 2, v1), M(u0, v1), M(u0, (v0 + v1) / 2)];
    const sc = TR_DOOR.D / (TR_DOOR.D + TR_DOOR.w * .5 * Math.sin(th));   // the door's middle scale, for line weights
    // the free edge's thickness, when it faces the camera
    const s1 = TR_DOOR.w, X = TR_DOOR.hx + s1 * Math.cos(th), Z = TR_DOOR.D + s1 * Math.sin(th);
    if (-X * Math.cos(th) - Z * Math.sin(th) > 0) { boilSeed('tr-door-edge'); paint([M(1, 0), trDoorPt(th, 1, 0, TR_DOOR.T), trDoorPt(th, 1, 1, TR_DOOR.T), M(1, 1)], { wash: '#2E2A28', ink: PAL.ink, sw: 2 }); }
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
    const a = (p - .34) * d;
    if (a >= 0 && a < .24) {
      const k = a / .24, c = M(.5, .5), L = M(.8825, .5);
      for (let i = 0; i < 3; i++) { const r = (120 + 1000 * easeOut(k)) * (1 - i * .24); boilSeed('tr-clang' + i); trLoop(ellPts(c[0], c[1], r * .8, r, 36), 3.4 * (1 - k), '#EDE3CF'); }
      for (let i = 0; i < 7; i++) { const ang = Math.PI * (.62 + i * .13), r0 = 90 + 60 * k; boilSeed('tr-tick' + i); inkLine([[L[0] + Math.cos(ang) * r0, L[1] + Math.sin(ang) * r0], [L[0] + Math.cos(ang) * (r0 + 70), L[1] + Math.sin(ang) * (r0 + 70)]], 3 * (1 - k), '#F4ECD8', 'ink', 0); }
      glow(L[0], L[1], 160, '#FFF1C8', .8 * (1 - k));
    }
  },
  shake(p, d) { const a = (p - .34) * d; return a >= 0 && a < .13 ? 18 * (1 - a / .13) : 0; },
};

// ---------- 3. garageDoor ----------
// Reference: wall.frame.garagedoor: off-white corrugated slats with patches of old paint, a rusty roll housing on top.
function trGarageBottom(p) {
  const top = 70, bot = H + 50;
  if (p < .28) return lerp(top, bot, Math.pow(p / .28, 2));                // falls, gathering speed
  if (p < .38) return bot - 75 * Math.sin(Math.PI * (p - .28) / .1);       // one small bounce
  if (p < .6) return bot;
  return lerp(bot, top, ease(seg(p, .6, .95)));
}
TRANS_FX.garageDoor = {
  dur: .7,
  draw(p, d) {
    const hy = -150 * (1 - easeOut(seg(p, 0, .08))) - 150 * easeIn(seg(p, .93, 1));   // the housing slides in and out at the top
    const yb = trGarageBottom(p) + hy, top = hy + 90, sh = 104;
    if (yb > top + 4) {
      boilSeed('tr-gd');
      paint(rectPts(-40, top, W + 80, yb - top), { wash: '#D7D1C1', ink: null });
      const n = Math.ceil((yb - top) / sh) + 1;
      for (let i = 0; i < n; i++) {
        const y1 = yb - 58 - i * sh, y0 = y1 - sh; if (y1 < top) break;
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
      paint(rectPts(-40, yb - 58, W + 80, 58), { wash: '#6E675E', ink: PAL.ink, sw: 2 });
      paint(rectPts(-40, yb - 14, W + 80, 14), { wash: '#2E2A28', ink: null });
      paint(rrPts(470, yb - 46, 140, 26, 10), { wash: '#3A3632', ink: PAL.ink, sw: 1.2 });
      // dust knocked out at the bottom on impact
      const a = (p - .28) * d;
      if (a > 0 && a < .4) for (let i = 0; i < 6; i++) puff(60 + i * 192, Math.min(yb, H) - 10, 70, a, { life: .4, col: '#D9CDB4', key: 'tr-gd' + i, rot: i, rise: .8 });
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
  shake(p, d) { const a = (p - .28) * d; return a >= 0 && a < .09 ? 9 * (1 - a / .09) : 0; },
};

// ---------- 4. c4Blast ----------
// Reference: explosive.timed: a squat brick wrapped in black tape over off-white, a cross strap, a little detonator board
// with a red light and coloured wires on top.
function trC4(x, y, s, sx, sy, rot, led) {
  push(); translate(x, y); rotate(rot); scale(s * sx, s * sy);
  boilSeed('tr-c4');
  paint(rrPts(-180, -140, 360, 280, 46), { wash: '#E4DDC8', ink: PAL.ink, sw: 2.2 });
  for (let i = 0; i < 4; i++) {   // the black tape wraps, slanting round the brick
    const x0 = -128 + i * 78;
    boilSeed('tr-c4t' + i);
    paint([[x0 - 30, -136], [x0 + 26, -136], [x0 + 52, 136], [x0 - 4, 136]], { wash: '#222127', ink: null });
    inkLine([[x0 - 12, -120], [x0 + 22, 110]], 1.1, '#6E6C76', 'inkfine', 0);   // its sheen
  }
  boilSeed('tr-c4x');
  paint([[-176, 40], [176, -64], [176, -12], [-176, 92]], { wash: '#1A191E', ink: PAL.ink, sw: 1 });   // the cross strap
  inkLine([[-160, 52], [160, -42]], 1.1, '#7A7882', 'inkfine', 0);
  paint(rrPts(-180, -140, 360, 280, 46), { ink: PAL.ink, sw: 2.6 });
  // the detonator: a green board, a red light, two wires looping over the top edge
  boilSeed('tr-c4d');
  inkLine([[30, -120], [-30, -172], [-110, -150], [-120, -112]], 3.2, '#C8322C', 'ink', .5);
  inkLine([[70, -120], [96, -178], [150, -160], [140, -120]], 3.2, '#3E8E4A', 'ink', .5);
  paint(rrPts(10, -150, 120, 62, 8), { wash: '#3D5A3A', ink: PAL.ink, sw: 1.4 });
  for (let i = 0; i < 3; i++) paint(rectPts(24 + i * 22, -136, 12, 10), { wash: '#C9B48A', ink: null });
  if (led) glow(104, -120, 90, '#FF3048', 1);
  paint(ellPts(104, -120, 12, 12, 10), { wash: led ? '#FF5A66' : '#6A2026', ink: PAL.ink, sw: .8 });
  pop();
}
// the smoke that the fireball turns into: a grid of overlapping puffs that covers the frame, then breaks apart from the
// middle out (q 0..1) while it rises and thins
function trBlastSmoke(q, key) {
  const P = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) {
    const i = r * 4 + c, bx = -60 + c * 400 + 70 * (hash(i + 3) - .5), by = -20 + r * 392 + 60 * (hash(i + 7) - .5);
    const dx = bx - 540, dy = by - 960, dn = clamp(Math.hypot(dx * 1.6, dy) / 1600), l = Math.hypot(dx, dy) || 1;
    const e = easeOut(q), rad = 345 * (1 + .25 * hash(i)) * clamp(1 - q * (1.65 - dn));
    if (rad < 8) continue;
    P.push([bx + dx / l * 650 * e, by + dy / l * 500 * e - 260 * q, rad, mixCol('#4A4650', '#7E7A86', clamp(q * 1.3 + .25 * hash(i + 1)))]);
  }
  P.sort((a, b) => b[2] - a[2]);
  trPuffs(P, 250 * (1 - Math.pow(q, 1.6)), q < .5 ? PAL.ink : null, 5, key);
}
TRANS_FX.c4Blast = {
  dur: .9,
  draw(p, d) {
    const pb = .38;
    if (p < pb) {   // flies at the lens, slaps on, blinks twice
      const k = seg(p, 0, .1), a = (p - .1) * d, sq = a > 0 ? .3 * Math.exp(-a * 20) * Math.cos(a * 44) : 0;
      const s = 1.25 * Math.pow(.2, 1 - k), x = lerp(900, 540, easeOut(k)), y = lerp(1420, 930, easeOut(k)) - 160 * Math.sin(Math.PI * k);
      const led = (p > .17 && p < .22) || (p > .28 && p < .33);
      trC4(x, y, s, 1 + sq, 1 - sq, lerp(.9, -.06, easeOut(k)), led);
      if (a > 0 && a < .12) for (let i = 0; i < 9; i++) {   // splat ticks
        const ang = i / 9 * TAU + .2, kk = a / .12, r0 = 290 + 80 * kk;
        boilSeed('tr-c4tick' + i); inkLine([[540 + Math.cos(ang) * r0, 930 + Math.sin(ang) * r0 * .85], [540 + Math.cos(ang) * (r0 + 70), 930 + Math.sin(ang) * (r0 + 70) * .85]], 3.4 * (1 - kk), PAL.ink, 'ink', 0);
      }
      return;
    }
    const a = (p - pb) * d;
    // smoke under the fireball once it fills the frame
    if (p > .43) trBlastSmoke(seg(p, .62, 1), 'tr-c4s');
    // the fireball: grows to fill the frame in ~2 frames, burns, then thins away into the smoke
    const fire = 1 - seg(p, .5, .63);
    if (fire > 0) {
      const R = 1350 * easeOut(clamp(a / .07)) + 140 * a, heat = clamp(a / .2), P = [];
      for (let i = 0; i < 11; i++) { const ang = i / 11 * TAU + .4, dd = R * (.45 + .1 * hash(i)); P.push([540 + Math.cos(ang) * dd, 930 + Math.sin(ang) * dd * 1.3, R * (.48 + .14 * hash(i + 3)), mixCol('#F29A3A', '#C8432A', heat * .8 + .2 * hash(i))]); }
      P.push([540, 930, R * .98, mixCol('#FFC24A', '#E8692C', heat)]);
      trPuffs(P, 255 * clamp(fire * 1.4), fire > .7 ? '#7A2A1E' : null, 6, 'tr-fire');
      const C2 = []; for (let i = 0; i < 6; i++) { const ang = i / 6 * TAU, dd = R * .3; C2.push([540 + Math.cos(ang) * dd, 900 + Math.sin(ang) * dd * 1.2, R * .32, mixCol('#FFE9A0', '#F7A23B', heat)]); }
      trPuffs(C2, 230 * fire, null, 0, 'tr-firec');
      glow(540, 930, R * .9, '#FF9A3A', .8 * fire);
      // shreds of tape flung out
      if (a < .25) for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU + 1, r = 200 + 2600 * a; push(); translate(540 + Math.cos(ang) * r, 930 + Math.sin(ang) * r); rotate(a * 18 + i); boilSeed('tr-shred' + i); paint(rectPts(-26, -14, 52, 28), { wash: i % 2 ? '#222127' : '#E4DDC8', ink: PAL.ink, sw: 1 }); pop(); }
    }
    flash(1 - a / .09);   // the one bright flash
  },
  shake(p, d) { const a1 = (p - .1) * d, a2 = (p - .38) * d; return (a1 >= 0 && a1 < .08 ? 7 * (1 - a1 / .08) : 0) + (a2 >= 0 && a2 < .2 ? 20 * (1 - a2 / .2) : 0); },
};

// ---------- 5. supplySmoke ----------
// Reference: supply.signal: an olive M18-style smoke canister with a purple band, a cap on top; it pours violet smoke.
function trSignal(x, y, s, rot) {
  push(); translate(x, y); rotate(rot); scale(s);
  boilSeed('tr-sig');
  paint(rrPts(-130, -52, 250, 104, 20), { wash: '#5D6936', ink: PAL.ink, sw: 1.8 });
  paint(rrPts(-122, 10, 236, 34, 12), { wash: '#465128', washOp: 210, ink: null });
  paint(rrPts(-118, -42, 228, 18, 8), { wash: '#808C52', washOp: 180, ink: null });
  paint(rectPts(-100, -52, 34, 104), { wash: '#8B3FA6', ink: PAL.ink, sw: 1 });                        // the purple band
  for (const yy of [-16, 4]) inkLine([[-40, yy], [60, yy]], 1.6, '#9AA46C', 'inkfine', 0);              // stencilled marks
  paint(rrPts(116, -40, 40, 80, 10), { wash: '#6E7A46', ink: PAL.ink, sw: 1.4 });                     // the fuse cap
  paint(rrPts(150, -20, 24, 40, 6), { wash: '#43473C', ink: PAL.ink, sw: 1.2 });
  pop();
}
function trSignalAt(p) {
  const k = seg(p, 0, .3), e = easeOut(k), x = lerp(1260, 560, e), hop = Math.abs(Math.sin(e * Math.PI * 2.2)) * 130 * (1 - e);
  return { x, y: 1330 - hop, rot: -(1260 - x) / 120, s: 1.25 };
}
TRANS_FX.supplySmoke = {
  dur: .9,
  draw(p, d) {
    const nozzle = pp => { const S = trSignalAt(pp), r = 162 * S.s; return [S.x + Math.cos(S.rot) * r, S.y + Math.sin(S.rot) * r]; };
    if (p < .52) { const S = trSignalAt(p); trSignal(S.x, S.y, S.s, S.rot); }
    // billows: each puff leaves the nozzle and swells to its place in a column that fills the frame, bottom rows first
    const q = seg(p, .56, 1), dq = easeIn(q), P = [], hi = [];
    const tg = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) tg.push([180 + c * 360 + 90 * (hash(r * 3 + c) - .5) + (r % 2 ? 60 : -40), 1760 - r * 372 + 50 * (hash(r * 3 + c + 9) - .5), 440 + 80 * hash(r * 3 + c + 4)]);
    const trail = [[1150, 1300, 120], [960, 1250, 170], [780, 1210, 220]];   // early wisps along the roll
    const all = [...trail, ...tg];
    all.forEach(([tx, ty, R], i) => {
      const pe = .03 + i * .018, age = seg(p, pe, pe + .12); if (p < pe) return;
      const e = easeOut(age), [nx, ny] = nozzle(pe), h = hash(i + 40);
      const x = lerp(nx, tx, e) - 1500 * dq * (.75 + .5 * h), y = lerp(ny, ty, e) - 120 * Math.sin(p * 6 + i) * .2 - 650 * dq * (.6 + .8 * h);
      const rad = lerp(40, R, e) * (1 + .5 * q);
      P.push([x, y, rad, mixCol('#7C4DA2', '#9C6BC4', h)]);
      hi.push([x - rad * .22, y - rad * .3, rad * .5]);
    });
    const op = 252 * (1 - Math.pow(q, 1.4));
    trPuffs(P, op, '#3A2350', 5, 'tr-smk');
    hi.forEach(([x, y, r], i) => { boilSeed('tr-smkh' + i); paint(ellPts(x, y, r, r * .75, 18, 2), { wash: '#C7A4E2', washOp: op * .55, ink: null }); });
  },
};

// ---------- 6. sleepingBag ----------
// Reference: sleepingbag: tan burlap, quilted in long tubes, stitched patches. It unrolls down over the frame like a
// blind (the roll shrinks as it pays out), its zipper runs down and back up, then it rolls away up.
function trBagRoll(p) {   // [roll centre y, radius]
  const r = k => lerp(170, 100, k);
  if (p < .36) { const k = ease(p / .36); return [lerp(-190, H + 120, k), r(k)]; }
  if (p < .64) return [H + 120, 100];
  const k = 1 - ease(seg(p, .64, 1)); return [lerp(-190, H + 120, k), r(k)];
}
TRANS_FX.sleepingBag = {
  dur: .8,
  draw(p, d) {
    const [yr, rr] = trBagRoll(p), x0 = -50, x1 = W + 50, zx = 720;
    if (yr + rr < 0) return;
    const yf = yr;   // the unrolled part hangs from above the frame down to the roll
    boilSeed('tr-bag');
    if (yf > -60) {
      paint(rectPts(x0, -80, x1 - x0, yf + 80), { wash: '#B09A73', ink: null, hatch: { d: 22, a: Math.PI / 2, o: { rand: .2 }, b: 'HB', c: '#8C7754', w: .7 } });
      for (const [cx, cw] of [[180, 300], [540, 300], [900, 260]]) {   // the quilted tubes: lighter in the middle, dark at the seams
        boilSeed('tr-bagq' + cx);
        paint(rectPts(cx - cw * .22, -80, cw * .44, yf + 80), { wash: '#CBB68E', washOp: 120, ink: null });
      }
      for (const sx of [360, zx]) { boilSeed('tr-bags' + sx); paint(rectPts(sx - 28, -80, 56, yf + 80), { wash: '#8E7752', washOp: 140, ink: null }); }
      boilSeed('tr-bagst');   // the stitched seam
      for (let y = -40; y < yf - 20; y += 46) inkLine([[360 + jit(1), y], [360 + jit(1), y + 24]], 1.4, '#5E4A30', 'inkfine', 0);
      // patches, stitched on
      for (const [px, py, pw, ph, c] of [[110, 330, 170, 210, '#8A5A3E'], [430, 1140, 200, 150, '#7E5A3C'], [850, 520, 150, 190, '#9A6A46'], [140, 1560, 150, 140, '#86603F']]) {
        if (py > yf - 30) continue;
        const h2 = Math.min(ph, yf - 10 - py);
        boilSeed('tr-bagp' + px); paint(rectPts(px, py, pw, h2, 3), { wash: c, washOp: 190, ink: '#4A3A26', sw: 1 });
        inkLine([[px + 10, py + 10], [px + pw - 10, py + 10]], .8, '#E2D3B0', 'inkfine', 0);
      }
      // the zipper: a dark tape with teeth, and the slider + pull tab, which runs down and back up while it's shut
      boilSeed('tr-bagz');
      paint(rectPts(zx - 20, -80, 40, yf + 80), { wash: '#3E3628', ink: null });
      for (let y = -60, i = 0; y < yf - 10; y += 22, i++) paint(rectPts(zx - (i % 2 ? 2 : 14), y, 16, 12), { wash: '#B8A06A', ink: null });
      const zk = p < .5 ? ease(seg(p, .38, .5)) : 1 - ease(seg(p, .5, .62)), zy = Math.min(yf - 40, lerp(110, H - 160, zk));
      boilSeed('tr-bagzs');
      paint(rrPts(zx - 30, zy - 44, 60, 88, 14), { wash: '#C9A44E', ink: PAL.ink, sw: 1.6 });
      paint(rrPts(zx - 16, zy + 20, 32, 96, 12), { wash: '#B48C3A', ink: PAL.ink, sw: 1.4 });
      paint(ellPts(zx, zy + 92, 8, 12, 8), { wash: '#3E3628', ink: null });
    }
    // the roll: a fat tube across the frame, its turns and seams rolling with it, and its shadow below
    boilSeed('tr-bagroll');
    paint(rectPts(x0, yr + rr * .6, x1 - x0, rr * .7), { wash: '#2B2233', washOp: 50, ink: null });
    paint(rrPts(x0, yr - rr, x1 - x0, 2 * rr, rr * .9), { wash: '#A38C66', ink: PAL.ink, sw: 2.4 });
    paint(rectPts(x0 + 10, yr - rr * .7, x1 - x0 - 20, rr * .35), { wash: '#D1BD96', washOp: 160, ink: null });
    paint(rectPts(x0 + 10, yr + rr * .35, x1 - x0 - 20, rr * .5), { wash: '#6E5C40', washOp: 140, ink: null });
    for (const sx of [360, zx]) paint(rectPts(sx - 14, yr - rr * .95, 28, rr * 1.9), { wash: sx === zx ? '#3E3628' : '#7E6848', washOp: 200, ink: null });
    const ph = yr / rr;   // the turns roll as it pays out
    for (let i = 0; i < 3; i++) { const ang = ph + i * TAU / 3, c = Math.cos(ang); if (Math.sin(ang) < 0) continue; boilSeed('tr-bagturn' + i); inkLine([[x0, yr - c * rr * .9], [x1, yr - c * rr * .9]], 1.6, '#5E4A30', 'inkfine', 0); }
  },
};

// ---------- 7. heliFlyover ----------
// The patrol heli (heli.js) comes in low and head-on from the distance, its searchlight sweeping the ground before it.
// It swells as it closes, the view swings under it, its belly fills the frame for the cut, then it whips away over the
// top with its tail boom last and the rotor blur dragging over the next shot.
function trHeliAt(p) {
  if (p <= .5) {
    const k = p / .5, zd = 15 * Math.pow(1 - k, 1.6), dist = Math.hypot(1, zd);
    return { s: 11 / dist, elev: Math.atan2(1, zd), yaw: lerp(1.28, Math.PI / 2, ease(k)), y: lerp(1060, 960, ease(k)), light: 1 - seg(k, .62, .9), k };
  }
  const q = seg(p, .5, 1);
  return { s: 11, elev: Math.PI / 2, yaw: Math.PI / 2, y: 960 - 5800 * Math.pow(q, 1.6), light: 0, k: 1 };
}
TRANS_FX.heliFlyover = {
  dur: .7,
  draw(p, d, o, t) {
    const S = trHeliAt(p);
    const ho = { yaw: S.yaw, elev: S.elev, t, key: 'tr', light: S.light > .01 ? { on: S.light, aim: Math.PI / 2 + .55 * Math.sin(p * 9 - 1), len: 700 + 900 * S.k, w: .2 } : null };
    // its shadow darkens the frame as it comes over
    const sh = seg(p, .3, .48) * (1 - seg(p, .6, .85));
    if (sh > 0) { boilSeed('tr-heli-shade'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#1E2230', washOp: 90 * sh, ink: null }); }
    patrolHeli(540, S.y, S.s, ho);
  },
};

// ---------- 8. wallUpgrade ----------
// A twig wall rises; the hammer (reference: hammer: a pale wooden mallet) bonks it up a grade four times (twig → wood →
// stone → sheet metal → armoured, each with a burst of sparkles and dust), then a raid charge cracks it and it crumbles.
const TR_WALL = { x0: -50, y0: -60, w: 1180, h: 2050, cols: 4, rows: 6, hit: [560, 1010], steps: [.2, .3, .4, .5] };
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
function trArmorCell(c, dx, dy, rot, inkW) {
  const { x0, y0, w, h } = TR_WALL;
  push(); translate(c.cx + dx, c.cy + dy); rotate(rot); translate(-c.cx, -c.cy);
  boilSeed('tr-wc' + c.i + ',' + c.j);
  paint(c.poly, { wash: '#5E6670', ink: inkW ? PAL.ink : null, sw: inkW });
  if (inkW) paint(c.poly.map(([x, y]) => [lerp(c.cx, x, .8), lerp(c.cy, y, .8) - 10]), { wash: '#69717B', washOp: 90, ink: null });   // a broken chunk catches the light
  const xAt = (E, y) => { for (let k = 0; k + 1 < E.length; k++) if ((E[k][1] - y) * (E[k + 1][1] - y) <= 0) return lerp(E[k][0], E[k + 1][0], (y - E[k][1]) / ((E[k + 1][1] - E[k][1]) || 1)); return E[0][0]; };
  for (const fy of [.25, .75]) {
    const by = y0 + h * fy; if (Math.abs(by - (y0 + h * (c.j + .5) / TR_WALL.rows)) > 60) continue;
    const xl = xAt(c.lef, by) + 26, xr = xAt(c.rig, by) - 26; if (xr - xl < 40) continue;
    paint(rectPts(xl, by - 30, xr - xl, 60), { wash: '#474D55', ink: PAL.ink, sw: 1.2 });
    for (let x = x0 + 40; x < x0 + w; x += 74) if (x > xl + 18 && x < xr - 18) { paint(ellPts(x, by, 9, 9, 8), { wash: '#A3ABB3', ink: PAL.ink, sw: .5 }); }
  }
  if (hash(c.i * 5 + c.j * 3) < .5) paint(ellPts(c.cx + 40 * (hash(c.i + c.j) - .5), c.cy + 50, 70, 34, 12, 3), { wash: '#8E5A3A', washOp: 110, ink: null });
  pop();
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
TRANS_FX.wallUpgrade = {
  dur: .9,
  draw(p, d) {
    const { x0, y0, w, h, hit, steps } = TR_WALL, grades = ['twig', 'wood', 'stone', 'metal', 'armor'];
    let g = 0; for (const s of steps) if (p >= s) g++;
    const crumble = seg(p, .64, 1);
    if (g < 4) {
      const off = (H + 2200) * (1 - easeOut(seg(p, 0, .17)));   // it rises out of the ground
      push(); translate(x0, y0 + off); scale(2);
      if (g > 0) { boilSeed('tr-wall-back'); paint(rectPts(-4, -4, w / 2 + 8, h / 2 + 8), { wash: GRADES[grades[g]].col, ink: null }); }
      wallPanel(0, h / 2, w / 2, h / 2, grades[g], { sw: 1.4 });
      pop();
    } else {
      const C = trWallCells(), crack = seg(p, .6, .66);
      if (crumble <= 0) { boilSeed('tr-wall-armor'); paint(rectPts(x0, y0, w, h), { wash: '#5E6670', ink: null }); }
      for (const c of C) {
        const dn = clamp(Math.hypot((c.cx - 540) * 1.5, c.cy - 960) / 1500), a = (p - (.64 + .1 * dn)) * d;
        if (a <= 0) { trArmorCell(c, 0, 0, 0, crack > dn ? 2.2 : 0); continue; }
        const l = Math.hypot(c.cx - 540, c.cy - 960) || 1, vx = (c.cx - 540) / l * 1600, vy = (c.cy - 960) / l * 900 - 400;
        trArmorCell(c, vx * a, vy * a + 26000 * a * a, (hash(c.i * 3 + c.j) - .5) * 9 * a, 2.2);
      }
      // the raid charge going off in the middle
      if (p > .6) explosion(540, 980, 170, (p - .6) * d, { debris: 10, debrisCol: '#5E6670' });
      // a few bright cracks of light through the gaps as it breaks
      if (crack > 0 && crumble <= .2) glow(540, 980, 500 * crack, '#FFB060', .5 * (1 - crumble * 5));
    }
    // the hammer: in from the lower right, four bonks, out again
    const [mx, my] = [1010, 1590], imp = -.68, wind = .1;
    if (p > .07 && p < .62) {
      let rot = wind, sq = 0;
      const prev = steps.filter(s => s <= p).pop(), next = steps.find(s => s > p);
      if (prev !== undefined && p - prev < .035) { rot = lerp(imp, wind, easeOut((p - prev) / .035)); sq = .25 * (1 - (p - prev) / .035); }
      else if (next !== undefined) { const s0 = prev !== undefined ? prev + .035 : .14; rot = lerp(wind, imp, easeIn(seg(p, s0, next))); }
      const slide = 900 * (1 - easeOut(seg(p, .07, .14))) + 900 * easeIn(seg(p, .53, .62));
      trMallet(mx + slide * .7, my + slide, rot, sq);
    }
    // the upgrade burst: sparkles flying off the hit, a ring of dust
    steps.forEach((s, k) => {
      const a = (p - s) * d; if (a < 0 || a > .16) return;
      const kk = a / .16;
      glow(hit[0], hit[1], 220 * (1 - kk), '#FFF2C4', .7 * (1 - kk));
      for (let i = 0; i < 9; i++) {
        const ang = i / 9 * TAU + k, r = 60 + 420 * easeOut(kk) * (.7 + .5 * hash(i + k * 9));
        boilSeed('tr-spark' + i);
        paint(starPts(hit[0] + Math.cos(ang) * r, hit[1] + Math.sin(ang) * r, 34 * (1 - kk * .8), .3, 4, kk * 2), { wash: i % 2 ? '#FFF6D6' : '#FFD86A', ink: null });
      }
      puff(hit[0], hit[1] + 40, 200, a, { life: .2, col: '#E6DCC4', key: 'tr-up' + k, n: 6, noInk: true });
    });
  },
};

// ---------- demo loop: studio.html?ep=0&loop=transitions ----------
(() => {
  const ORDER = ['rockSpin', 'doorSlam', 'garageDoor', 'c4Blast', 'supplySmoke', 'sleepingBag', 'heliFlyover', 'wallUpgrade'], SLOT = 1.5;
  const DEMO = ORDER.map((name, i) => ({ t: SLOT / 2 + i * SLOT, name, o: {} }));
  const side = t => DEMO.filter(e => t >= e.t).length % 2;
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
  const loop = bgs => t => { const sh = transShakeBegin(t, DEMO); bgs[side(t)](t); drawTransitions(t, DEMO); if (sh) pop(); };
  LOOPS.transitions = loop([beach, base]); LOOPS.transitions.len = ORDER.length * SLOT;
  LOOPS.transitionsKey = loop([keyA, keyB]); LOOPS.transitionsKey.len = ORDER.length * SLOT;
})();
// TEMP-DEBUG
LOOPS.trdbg = t => { boilSeed('bg'); paint(rectPts(-60,-60,W+120,H+120),{wash:'#88AACC',ink:null}); const u=[800,1100,1300,1500,1750,2000][Math.round(t*10)%6]; const curv=Math.round(t*10)>=6; push(); translate(540,960); translate(-.7*u,.17*u); const P=[[-.25, -1.05], [.85, -1.3], [1.7, -.75], [1.85, .25], [1.15, .95], [.1, .9], [-.45, .2]]; boilSeed('x'); paint(U2(u,P),{wash:'#E3D3B6', ink:PAL.ink, sw:4, curv: curv? .35: 0}); pop(); };
LOOPS.trdbg.len = 2;
