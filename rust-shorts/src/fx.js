// fx.js: effects shared by the episodes. Screen-agnostic: draw them in world space (inside a camera) unless noted.
//   bubble(x, y, s, icon, k, o)     a pictogram speech bubble popping in (k 0..1, overshoots); the tail points down-left
//                                   (o.tail = -1 for down-right). icon: 'smile' | '?' | 'smile?' | 'heart' | 'rock' | 'zzz'
//   sleepBubble(x, y, s, t)         a snot bubble that inflates and deflates with the snore
//   respawn(x, y, s, age)           the soft sparkle a player wakes up in
//   puff(x, y, r, age, o)           a dust/soot/sand puff that expands and fades (o.col)
//   notePop(x, y, s, age)           a music note bursting like a balloon
//   shootingStar(x0, y0, x1, y1, k) a star streaking across the sky, k 0..1
//   lightning(x0, y0, x1, y1, o)    a jagged zap bolt between two points (o.seed, o.w, o.col, o.forks)
//   sparks(x, y, s, age, o)         a burst of flint sparks (o.n, o.dir, o.spread), lit with glow()

function bubble(x, y, s, icon, k = 1, o = {}) {
  if (k <= .01) return;
  const p = backOut(clamp(k)), r = 62 * s * p, tail = o.tail ?? 1, sw = 1.05 * s * p, q = r / 62;   // q = icon unit
  boilSeed('bubble ' + icon + (o.key || ''));
  push(); translate(x, y);
  paint(ellPts(0, 0, r * 1.15, r * .92, 24), { wash: PAL.cream, ink: PAL.ink, sw });
  // the tail: filled over the bubble's edge so it joins without a seam, with only its two outer sides inked
  const T0 = [-tail * r * .3, r * .7], T1 = [-tail * r * .62, r * 1.3], T2 = [tail * r * .05, r * .82];
  paint([[-tail * r * .34, r * .6], T1, [tail * r * .1, r * .72]], { wash: PAL.cream, ink: null });
  inkLine([T0, T1, T2], sw, PAL.ink, 'ink', 0);
  const smile = (cx, sc = 1) => {
    paint(ellPts(cx, 0, 26 * q * sc, 26 * q * sc, 18), { wash: PAL.ochre, ink: PAL.ink, sw: sw * .7 });
    for (const e of [-1, 1]) paint(ellPts(cx + e * 9 * q * sc, -6 * q * sc, 2.8 * q * sc, 4.4 * q * sc, 8), { wash: PAL.ink, ink: null });
    inkLine([[cx - 13 * q * sc, 5 * q * sc], [cx, 14 * q * sc], [cx + 13 * q * sc, 5 * q * sc]], sw * .7, PAL.ink, 'ink', .6);
  };
  const quest = (cx, sc = 1) => {   // the same painted "?" as the emotes, smaller
    const S = 12 * q * sc, P = pts => pts.map(([a, b]) => [cx + a * S, b * S + .9 * S]);
    paint(ribbon(P([[-1, -1.3], [-.55, -2.15], [.35, -2.3], [1, -1.6], [.7, -.75], [.05, -.3], [0, .4]]), .75 * S, .5 * S), { wash: PAL.sky, fill: PAL.cream, fillOp: 60, ink: PAL.ink, sw: sw * .6 });
    paint(ellPts(cx, 2.15 * S, .42 * S, .42 * S, 12), { wash: PAL.sky, ink: PAL.ink, sw: sw * .5 });
  };
  if (icon === 'smile') smile(0, 1.2);
  else if (icon === '?') quest(0, 1.3);
  else if (icon === 'smile?') { smile(-20 * q, .95); quest(34 * q, .85); }
  else if (icon === 'heart') paint(heartPts(0, 4 * q, 26 * q), { wash: '#E2476E', ink: PAL.ink, sw: sw * .7 });
  else if (icon === 'zzz') for (let i = 0; i < 3; i++) inkLine([[-14 * q + i * 12 * q, -10 * q - i * 8 * q], [-2 * q + i * 12 * q, -10 * q - i * 8 * q], [-14 * q + i * 12 * q, 2 * q - i * 8 * q], [-2 * q + i * 12 * q, 2 * q - i * 8 * q]], sw * .8, PAL.indigo, 'ink', 0);
  pop();
}

function sleepBubble(x, y, s, t) {
  const b = .35 + .65 * Math.max(0, Math.sin(t * Math.PI));   // grows on the in-breath, shrinks back
  boilSeed('sleepbubble');
  paint(ellPts(x + 10 * s * b, y, 16 * s * b, 15 * s * b, 14), { wash: '#CFE9F2', washOp: 170, ink: PAL.ink, sw: 1.1 * s });
  paint(ellPts(x + 6 * s * b, y - 5 * s * b, 4 * s * b, 3 * s * b, 8), { wash: '#FFFFFF', washOp: 220, ink: null });
}

function respawn(x, y, s, age) {
  if (age < 0 || age > 1.2) return;
  const k = seg(age, 0, 1.2), a = 1 - k;
  glow(x, y, 160 * s * (.6 + .6 * k), '#FFF2C4', .9 * a);
  for (let i = 0; i < 7; i++) {
    boilSeed('respawn' + i);
    const ang = i / 7 * TAU + .4, d = (40 + 120 * easeOut(k)) * s, r = 10 * s * (1 - k * .7);
    paint(starPts(x + Math.cos(ang) * d, y + Math.sin(ang) * d * .6 - 60 * s * k, r, .35, 4), { wash: PAL.cream, washOp: 255 * a, ink: null });
  }
}

function puff(x, y, r, age, o = {}) {
  const life = o.life ?? .9; if (age < 0 || age > life) return;
  const k = age / life, col = o.col || '#D9CDB4';
  for (let i = 0; i < (o.n || 5); i++) {
    boilSeed('puff' + (o.key || '') + i);
    const a = i / (o.n || 5) * TAU + (o.rot || 0), d = r * (.3 + .9 * easeOut(k)), rr = r * (.42 + .25 * hash(i + 3)) * (1 - .5 * k);
    paint(ellPts(x + Math.cos(a) * d, y + Math.sin(a) * d * .55 - r * .6 * k * (o.rise ?? 1), rr, rr * .85, 12), { wash: col, washOp: 230 * (1 - k), ink: k < .45 ? PAL.ink : null, sw: 1 });
  }
}

function notePop(x, y, s, age) {
  if (age < 0 || age > .5) return;
  const k = age / .5;
  boilSeed('notepop');
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, d = (10 + 60 * easeOut(k)) * s; inkLine([[x + Math.cos(a) * d * .5, y + Math.sin(a) * d * .5], [x + Math.cos(a) * d, y + Math.sin(a) * d]], 2.4 * s * (1 - k), PAL.ink, 'ink', 0); }
}

function shootingStar(x0, y0, x1, y1, k) {
  if (k <= 0 || k >= 1) return;
  const [hx, hy] = [lerp(x0, x1, easeOut(k)), lerp(y0, y1, easeOut(k))], [tx, ty] = [lerp(x0, x1, easeOut(Math.max(0, k - .25))), lerp(y0, y1, easeOut(Math.max(0, k - .25)))];
  glow(hx, hy, 50, '#FFF6D0', 1 - k * .6);
  boilSeed('shootingstar');
  inkLine([[tx, ty], [hx, hy]], 2.5, '#FFF6D8', 'ink', 0);
  paint(starPts(hx, hy, 9, .4, 4), { wash: '#FFFDF2', ink: null });
}

// A jagged bolt from (x0, y0) to (x1, y1), drawn as a bright core over a darker outline; forks branch off it.
function lightning(x0, y0, x1, y1, o = {}) {
  const n = o.n || 9, seed = o.seed || 0, w = o.w || 6, P = [];
  const L = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
  for (let i = 0; i <= n; i++) { const k = i / n, off = (i === 0 || i === n) ? 0 : (hash(seed * 13 + i) - .5) * L * .22; P.push([lerp(x0, x1, k) + nx * off, lerp(y0, y1, k) + ny * off]); }
  glow((x0 + x1) / 2, (y0 + y1) / 2, L * .55, o.glowCol || '#BFE6FF', o.glowA ?? .8);
  boilSeed('bolt' + seed);
  inkLine(P, w * 2.2, PAL.ink, 'ink', 0);
  inkLine(P, w, o.col || '#EAF8FF', 'ink', 0);
  for (let f = 0; f < (o.forks ?? 2); f++) {
    const i = 2 + Math.floor(hash(seed * 7 + f) * (n - 4)), [bx, by] = P[i], a = Math.atan2(y1 - y0, x1 - x0) + (hash(seed + f * 3) - .5) * 2.2, fl = L * (.18 + .14 * hash(seed + f));
    const F = [[bx, by], [bx + Math.cos(a) * fl * .5 + nx * 8, by + Math.sin(a) * fl * .5 + ny * 8], [bx + Math.cos(a) * fl, by + Math.sin(a) * fl]];
    inkLine(F, w * 1.4, PAL.ink, 'ink', 0); inkLine(F, w * .6, o.col || '#EAF8FF', 'ink', 0);
  }
}

function sparks(x, y, s, age, o = {}) {
  const life = o.life ?? .35; if (age < 0 || age > life) return;
  const k = age / life, n = o.n || 9, dir = o.dir ?? -Math.PI / 2, spread = o.spread ?? 2.2;
  glow(x, y, 70 * s * (1 - k), '#FFC766', 1 - k);
  boilSeed('sparks' + (o.key || ''));
  for (let i = 0; i < n; i++) {
    const a = dir + (hash(i + (o.seed || 0) * 17) - .5) * spread, sp = (60 + 110 * hash(i + 5 + (o.seed || 0))) * s, d = sp * easeOut(k), g = 140 * s * k * k;
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + g, tl = 14 * s * (1 - k);
    inkLine([[px - Math.cos(a) * tl, py - Math.sin(a) * tl], [px, py]], 2.4 * s, i % 3 ? '#FFD36A' : '#FFF4C8', 'ink', 0);
  }
}
