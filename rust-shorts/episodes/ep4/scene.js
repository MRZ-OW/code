// ep4 "Hit the X": Rust's red tree marker keeps hopping away from the Naked's rock: up the trunk, round it, onto a
// boar's backside, onto the Chad's facemask (CLANG) and at last onto his own forehead, where the Chad hits it. Loop.
// Shot list: SCRIPT.md.
(() => {
  const G = 1380, U = 40, NK = 'naked', CH = 'chad', BO = 'boar';
  const TX = 380;                                   // the big pine's centre (about 180 px wide)
  const NX = 620;                                   // the Naked's mark in the opening composition
  const BASE = { cx: 540, cy: 1010, z: 1 };         // the opening composition's camera
  const BUSH = { x: 990, y: 1365, w: 520, h: 400 }; // the bush the boar loses the X in (big enough to hide it)
  const BS = 1.33;                                  // the boar's scale (u = 40, like the Naked)
  const XR = 31;                                    // the red X's half-size
  const RED = '#E3263A', REDDK = '#5C0F1C', REDLT = '#FF9A8C';

  // ---------- camera and depth layers ----------
  // Each shot passes a camera { cx, cy, z }. The far forest is drawn through cameras that move and zoom less (parallax),
  // so a wide or a close shot keeps a believable background behind the foreground.
  const cam = (cx, cy, z) => ({ cx, cy, z });
  const camLerp = (a, b, k) => cam(lerp(a.cx, b.cx, k), lerp(a.cy, b.cy, k), lerp(a.z, b.z, k));
  function layer(c, d, fn) { camBegin(lerp(c.cx, BASE.cx, d), lerp(c.cy, BASE.cy, d), lerp(c.z, 1, d)); fn(); camEnd(); }
  const view = (c, m = 60) => ({ x0: c.cx - W / 2 / c.z - m, x1: c.cx + W / 2 / c.z + m, y0: c.cy - H / 2 / c.z - m, y1: c.cy + H / 2 / c.z + m });
  // sway that repeats exactly every 20 s (the episode loops)
  const sway = (t, k = 1, ph = 0) => Math.sin(t * Math.PI * k + ph);
  // a camera kick on impacts (screen px, decaying)
  const kick = (t, t0, amt, dur = .22) => t < t0 || t > t0 + dur ? [0, 0] : shakeXY(t, amt * (1 - (t - t0) / dur));

  // ---------- the forest ----------
  // Far: a hazy ridge of pine tips and a row of pale pine silhouettes. Mid: Rust pines (pineTree), hazed.
  const FAR = [[-420, .62], [-250, .7], [-80, .58], [90, .72], [260, .6], [430, .7], [600, .62], [770, .74], [940, .6], [1110, .7], [1280, .62], [1450, .68]];
  const MID = [[-330, 1.1], [-20, .95], [250, 1.15], [700, 1.05], [1030, 1.2], [1350, 1.0]];
  function farPine(x, y, s, col, key) {   // one pale silhouette: the tiers of pineTree() merged into one outline
    staticSeed('farpine' + key);
    const L = [], R = [];
    for (let k = 0; k < 7; k++) {
      const yy = y + (-150 - k * 62) * s, w = (175 - k * 21) * s * (.85 + .3 * hash(k + key)), h = 105 * s;
      L.push([x - w, yy + h * .15], [x - w * .45, yy - h * .4]); R.push([x + w, yy + h * .15], [x + w * .45, yy - h * .4]);
    }
    paint([[x - 16 * s, y], ...L, [x, y - 640 * s], ...R.reverse(), [x + 16 * s, y]], { wash: col, ink: null });
  }
  function backdrop(c) {
    const V = view(c, 300);
    layer(c, .85, () => {
      rustSky(0, { tod: 0, horizon: 1120, sun: [960, -90], clouds: true });
      staticSeed('farridge');
      const Q = [[-1700, 1220]]; for (let i = 0; i <= 96; i++) { const x = -1700 + i * 48; Q.push([x, 1050 - 46 * hash(i + 3) - 26 * Math.sin(i * .37)], [x + 24, 1104 - 18 * hash(i + 5)]); }
      Q.push([2900, 1220]); paint(Q, { wash: '#A8C2BA', ink: null });
      FAR.forEach(([px, ps], i) => farPine(px, 1178, ps, i % 2 ? '#7FA294' : '#88AA9C', i));
      staticSeed('haze'); paint(rectPts(-2400, -2600, 6000, 3780), { wash: '#E2EEF4', washOp: 70, ink: null });
      staticSeed('farfloor'); paint([[-1700, 1172], [-400, 1166], [600, 1174], [1600, 1168], [2900, 1172], [2900, 2600], [-1700, 2600]], { wash: '#B5BC92', ink: null });
    });
    layer(c, .55, () => {
      const Vm = view(camLerp(c, BASE, .55), 300);
      for (const [px, ps] of MID) if (px > Vm.x0 - 200 && px < Vm.x1 + 200) pineTree(px, 1252, ps);
      staticSeed('mhaze'); paint(rectPts(-2400, -2600, 6000, 3850), { wash: '#E2EEF2', washOp: 80, ink: null });
      staticSeed('midfloor'); paint([[-1700, 1244], [-300, 1238], [700, 1248], [1700, 1240], [2900, 1246], [2900, 2600], [-1700, 2600]], { wash: '#A4AE7C', ink: null });
      grass(1262, 16, '#7E8C58', 'mid', .7);
    });
  }
  function grass(y, n, col, key, s = 1) {   // tufts along a ground line
    for (let i = 0; i < n; i++) {
      boilSeed('tuft' + key + i);
      const x = -900 + hash(i * 3.1 + y) * 2800, yy = y + hash(i * 1.7 + y) * 40 * s, sw = sway(T, .5, i) * 5 * s;
      for (const k of [-1, 0, 1]) inkLine([[x + k * 9 * s, yy], [x + k * 15 * s + sw, yy - (28 + 12 * hash(i + k + 3)) * s]], .9, col, 'inkfine', .4);
    }
  }
  // The clearing: an olive forest floor with dry-needle patches, tufts, pebbles and a few ferns.
  function floor() {
    staticSeed('floor');
    paint([[-1000, 1290], [0, 1284], [800, 1292], [2200, 1286], [2200, 2900], [-1000, 2900]], { wash: '#8F9C5F', ink: null });
    staticSeed('floorband'); paint(rectPts(-1000, 1470, 3200, 1500), { fill: '#6E7D46', fillOp: 110, bleed: .2, tex: .35, border: .3, ink: null });
    for (let i = 0; i < 9; i++) {
      staticSeed('needles' + i);
      const px = -500 + hash(i + 40) * 2000, py = 1320 + hash(i + 50) * 420, r = 90 + 70 * hash(i + 2);
      paint(ellPts(px, py, r, r * .16, 16, 3), { fill: '#B49C64', fillOp: 120, bleed: .2, tex: .5, border: .4, ink: null });
    }
    for (let i = 0; i < 7; i++) { boilSeed('pebble' + i); const px = -300 + hash(i + 70) * 1700, py = 1330 + hash(i + 80) * 380; paint(ellPts(px, py, 12 + 8 * hash(i), 7 + 4 * hash(i + 1), 10, 1), { wash: '#A39C88', ink: PAL.ink, sw: .6 }); }
    grass(1300, 22, '#5F7040', 'fg', 1.1);
    fern(150, 1400, .9, 'f1'); fern(1010, 1420, 1.1, 'f2'); fern(-120, 1440, 1.2, 'f3');
  }
  function fern(x, y, s, key) {
    boilSeed('fern' + key);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * .42 + .04 * sway(T, .5, i + x), L = (70 + 18 * (2 - Math.abs(i - 2))) * s;
      const tip = [x + Math.cos(a) * L, y + Math.sin(a) * L * .8], mid = [x + Math.cos(a) * L * .55, y + Math.sin(a) * L * .55 - 10 * s];
      paint(ribbon([[x, y], mid, tip], 16 * s, 3 * s), { wash: i % 2 ? '#5E8A4A' : '#6E9A55', ink: '#2E4A2C', sw: .7 });
    }
  }

  // ---------- the big pine (a close-up trunk with bark plates, and its lowest branches) ----------
  const BARK = { gap: '#3E2D25', dk: '#6A4E3B', md: '#8A6A4F', lt: '#AE8C6A', rim: '#CDAE86' };
  const halfW = y => { const base = 90 - 9 * clamp((G - 300 - y) / 2200); const f = clamp((y - (G - 170)) / 170); return base + 50 * f * f; };
  const edgeWob = (y, s) => 3 * Math.sin(y * .011 + s) + 2 * Math.sin(y * .037 + s * 2);
  const edgeR = y => TX + halfW(y) + edgeWob(y, 1), edgeL = y => TX - halfW(y) + edgeWob(y, 4);
  // how wide a mark on the bark at x looks (1 facing us, 0 at the edges: it wraps round the trunk)
  const wrapK = (x, y) => Math.sqrt(Math.max(0, 1 - Math.pow((x - TX) / halfW(y), 2)));
  function bigPine(c) {
    const V = view(c), y0 = Math.max(V.y0, -2600);
    if (V.x1 < TX - 240 || V.x0 > TX + 240) { canopy(c); return; }
    const R = [], L = [];
    for (let y = y0; y < G - 60; y += 36) { R.push([edgeR(y), y]); L.push([edgeL(y), y]); }
    R.push([TX + 118, G - 46], [TX + 136, G - 22], [TX + 170, G - 6], [TX + 206, G + 6]);
    L.push([TX - 120, G - 44], [TX - 142, G - 20], [TX - 178, G - 4], [TX - 214, G + 8]);
    const bottom = [[TX + 150, G + 14], [TX + 96, G + 8], [TX + 40, G + 16], [TX - 30, G + 10], [TX - 100, G + 14], [TX - 160, G + 16]];
    boilSeed('trunk');
    paint([...R, ...bottom, ...L.slice().reverse()], { wash: BARK.gap, ink: null });
    // bark plates in six columns round the cylinder: narrower toward the edges, lit from the upper right. Plates of a
    // column share a few tones (fewer colour changes for p5.brush to composite).
    for (let j = 0; j < 6; j++) {
      const ph = -1.22 + j * .49, lightK = clamp(.48 + .42 * Math.sin(ph + .3)), tones = [mixCol(BARK.dk, BARK.lt, lightK), mixCol(mixCol(BARK.dk, BARK.lt, lightK), BARK.md, .35)];
      let y = G - 10 - 50 * hash(j * 7.7), n = 0;
      while (y > y0 - 200 && n < 60) {
        const len = 110 + 120 * hash(j * 31 + n * 7.3), ya = y - len, gap = 7 + 5 * hash(j + n * 3.1);
        n++;
        if (y < V.y0 - 40 || ya > V.y1 + 40) { y = ya - gap; continue; }
        boilSeed('plate' + j + '.' + n);
        const P = [], seg = 5;
        for (let k = 0; k <= seg; k++) {
          const yy = lerp(ya, y, k / seg), w = halfW(yy) * (yy > G - 120 ? .9 : 1), cx = TX + w * Math.sin(ph) + edgeWob(yy, 2) * .5, hw = w * .23 * Math.cos(ph) * (.82 + .3 * hash(j * 13 + n * 5 + k));
          P.push([cx + hw + 2 * Math.sin(yy * .05 + j), yy]);
        }
        for (let k = seg; k >= 0; k--) {
          const yy = lerp(ya, y, k / seg), w = halfW(yy) * (yy > G - 120 ? .9 : 1), cx = TX + w * Math.sin(ph) + edgeWob(yy, 2) * .5, hw = w * .23 * Math.cos(ph) * (.82 + .3 * hash(j * 17 + n * 3 + k));
          P.push([cx - hw + 2 * Math.sin(yy * .04 + j * 2), yy]);
        }
        paint(P, { wash: tones[n % 2], ink: null });
        if (hash(j * 3 + n * 11) > .45) { const yc = lerp(ya, y, .3 + .4 * hash(n + j)), w = halfW(yc), cx = TX + w * Math.sin(ph), hw = w * .2 * Math.cos(ph); inkLine([[cx - hw, yc], [cx + hw * .2, yc + 4], [cx + hw, yc - 2]], .8, BARK.gap, 'inkfine', .3); }
        y = ya - gap;
      }
    }
    // shading: the left side in shadow, a rim of light down the right
    staticSeed('trunkshade');
    const SL = [], SR = [];
    for (let y = y0; y < G - 20; y += 60) { SL.push([edgeL(y) - 4, y]); SR.push([TX - halfW(y) * .3, y]); }
    paint([...SL, ...SR.reverse()], { fill: '#2A1E1A', fillOp: 120, bleed: .1, tex: .35, border: .3, ink: null });
    const RL = []; for (let y = y0; y < G - 70; y += 60) RL.push([edgeR(y) - 13, y]);
    boilSeed('trunkrim'); for (let i = 0; i + 1 < RL.length; i += 6) inkLine(RL.slice(i, i + 7), 3.2, BARK.rim, 'ink', .3);
    // ink down both sides (in canvas-sized pieces)
    boilSeed('trunkink');
    for (const P of [R, L]) for (let i = 0; i + 1 < P.length; i += 20) inkLine(P.slice(i, i + 21), 1.8, PAL.ink, 'ink', .3);
    // soil and grass over the roots, so the trunk grows out of the ground
    boilSeed('trunksoil');
    paint([[TX - 230, G + 10], [TX - 150, G - 2], [TX - 60, G + 4], [TX + 60, G + 2], [TX + 150, G - 3], [TX + 230, G + 10], [TX + 220, G + 30], [TX - 220, G + 30]], { wash: '#7E8A52', ink: null });
    for (let i = 0; i < 7; i++) { const gx = TX - 190 + i * 62 + 10 * hash(i), s2 = sway(T, .5, i) * 3; inkLine([[gx, G + 12], [gx + 4 + s2, G - 16 - 8 * hash(i + 4)]], .9, '#55673A', 'inkfine', .4); inkLine([[gx + 8, G + 12], [gx + 14 + s2, G - 10]], .9, '#55673A', 'inkfine', .4); }
    // dead branch stubs (a pine sheds its low branches)
    if (V.y0 < 640) { boilSeed('stub1'); paint(ribbon([[TX - 80, 560], [TX - 150, 520], [TX - 196, 486]], 26, 10), { wash: BARK.md, ink: PAL.ink, sw: 1.3 }); inkLine([[TX - 196, 486], [TX - 210, 470], [TX - 192, 478]], 1.2, PAL.ink, 'ink', 0); }
    if (V.y0 < 420) { boilSeed('stub2'); paint(ribbon([[TX + 82, 380], [TX + 140, 350], [TX + 172, 318]], 22, 9), { wash: BARK.dk, ink: PAL.ink, sw: 1.2 }); }
    canopy(c);
  }
  function canopy(c) {   // the pine's lowest branch tiers, drooping over the top of the frame
    const V = view(c);
    for (let k = 0; k < 8; k++) {
      const yy = 300 - k * 240, w = 470 - k * 30, h = 210, lean = (hash(k * 3 + 1) - .5) * 60;
      if (yy - h > V.y1 || yy + h < V.y0 || TX + w < V.x0 || TX - w > V.x1) continue;
      boilSeed('tier' + k);
      const P = [[TX - w + lean, yy + h * .2]];
      for (let i = 1; i < 9; i++) { const fx = TX - w + lean + 2 * w * i / 9; P.push([fx, yy + h * (.06 + .26 * (i % 2)) + 10 * Math.sin(i * 2.3 + k)]); }
      P.push([TX + w + lean, yy + h * .2], [TX + w * .4 + lean * .5, yy - h * .5], [TX, yy - h * .9], [TX - w * .4 + lean * .5, yy - h * .5]);
      paint(P, { wash: k % 2 ? '#2E5A40' : '#264D37', ink: PAL.ink, sw: 1.2 });
      paint([[TX - w * .5 + lean, yy - h * .02], [TX + w * .1, yy - h * .08], [TX - w * .1, yy - h * .6]], { wash: '#4E7E58', washOp: 120, ink: null });
    }
  }
  // pine needles shaken loose by a THOCK, fluttering down past the camera
  function needles(t, t0, n = 7) {
    const a = t - t0; if (a < 0 || a > 1.6) return;
    for (let i = 0; i < n; i++) {
      const k = clamp((a - .06 * i) / 1.4); if (k <= 0 || k >= 1) continue;
      boilSeed('needle' + Math.round(t0 * 10) + i);
      const x = TX + (hash(i + t0) - .5) * 380 + 30 * Math.sin(k * 9 + i), y = 330 + k * 900 + 40 * hash(i * 3 + t0), r = k * 7 + i;
      inkLine([[x - Math.cos(r) * 11, y - Math.sin(r) * 11], [x + Math.cos(r) * 11, y + Math.sin(r) * 11]], 1.6, i % 2 ? '#7E6A3A' : '#4E6E3E', 'ink', 0);
    }
  }

  // ---------- the bush ----------
  function bushX(o = {}) {
    const { x, y, w, h } = BUSH, r = o.rustle || 0, sw = sway(T, .5, 2) * 4 + r * 10 * Math.sin(T * 61);
    boilSeed('bushx');
    const P = [];
    for (let i = 0; i <= 30; i++) {   // a dome of round leafy lobes
      const a = Math.PI + i / 30 * Math.PI, lobe = 1 + .06 * Math.abs(Math.sin(i * Math.PI / 5)) - .03;
      P.push([x + Math.cos(a) * w / 2 * lobe + sw * (-Math.sin(a)), y + Math.sin(a) * h * lobe]);
    }
    paint(P, { wash: '#3F6B3A', ink: PAL.ink, sw: 1.2 });
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.12 + .76 * hash(i * 2.7 + 1)), d = .35 + .45 * hash(i * 1.3 + 4), lx = x + Math.cos(a) * w / 2 * d + sw * .6, ly = y + Math.sin(a) * h * d;
      paint(ellPts(lx, ly, 38 + 16 * hash(i), 24 + 8 * hash(i + 3), 12, 2, -.4 + hash(i) * .8), { wash: i % 3 ? '#5E8C4C' : '#6E9A56', washOp: 210, ink: null });
    }
    for (let i = 0; i < 5; i++) { const fx = x - w * .32 + i * w * .16 + sw * .5, fy = y - h * (.45 + .25 * hash(i + 9)); paint(ellPts(fx, fy, 7, 7, 8), { wash: '#F2E6C8', ink: null }); }
    if (r > .05) for (let i = 0; i < 4; i++) {   // leaves knocked loose
      const k = frac(T * 1.7 + i * .25), lx = x - w * .3 + i * w * .2 + 30 * Math.sin(k * 7 + i), ly = y - h * (.9 + .5 * k) + 140 * k * k;
      paint(ellPts(lx, ly, 9, 5, 8, 0, k * 6 + i), { wash: '#6E9A56', washOp: 255 * r * (1 - k), ink: null });
    }
  }

  // ---------- the red X ----------
  // Rust's tree marker: a bright red painted X. Here it has a life of its own: it hops (squash and stretch), slides
  // round the trunk and peeks out. r = half-size; o.sx/sy scale it, o.rot, o.stretch along o.dir (radians) for flight,
  // o.glow (0..1), o.drip (paint running from one arm, when it's on the bark).
  const XARMS = (() => {
    const P = [], w = .27, wt = .19;
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k * Math.PI / 2, d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
      P.push([d[0] - n[0] * wt, d[1] - n[1] * wt], [d[0] * 1.06, d[1] * 1.06], [d[0] + n[0] * wt, d[1] + n[1] * wt]);
      const b = a + Math.PI / 4; P.push([Math.cos(b) * w * 1.414, Math.sin(b) * w * 1.414]);
    }
    return P;
  })();
  function xMark(x, y, r, o = {}) {
    if (r < 1 || (o.sx ?? 1) < .04) return;
    boilSeed('xmark' + (o.key || ''));
    push(); translate(x, y);
    if (o.stretch) { rotate(o.dir || 0); scale(1 + o.stretch, 1 - o.stretch * .55); rotate(-(o.dir || 0)); }
    rotate(o.rot || 0); scale(o.sx ?? 1, o.sy ?? 1);
    if ((o.glow ?? .5) > 0) glow(0, 0, r * 2.4, '#FF4A3A', o.glow ?? .5);
    const P = XARMS.map(([a, b]) => [a * r + jit(r * .02), b * r + jit(r * .02)]);
    paint(P, { wash: RED, ink: REDDK, sw: clamp(r / 22, .6, 2.2) });
    for (const a of [Math.PI / 4 + Math.PI, -Math.PI / 4]) {   // a lighter brush stroke down each arm
      const d = [Math.cos(a), Math.sin(a)], n = [-d[1] * .08, d[0] * .08];
      inkLine([[(-d[0] * .7 + n[0]) * r, (-d[1] * .7 + n[1]) * r], [(d[0] * .7 + n[0]) * r, (d[1] * .7 + n[1]) * r]], clamp(r / 14, .7, 3), REDLT, 'inkfine', 0);
    }
    if (o.drip) inkLine([[.55 * r, .7 * r], [.58 * r, (1.0 + .25 * o.drip) * r]], clamp(r / 12, .8, 3), RED, 'ink', 0);
    pop();
  }
  // the X on the bark at (x, y): squeezed as it wraps round the trunk
  const xOnBark = (x, y, o = {}) => xMark(x, y, XR, { key: 'tree', ...o, sx: (o.sx ?? 1) * wrapK(x, y) });
  // a hop from p0 to p1 (k 0..1): position, a stretch along the flight and the direction it's going
  function hopX(p0, p1, h, k) {
    const p = arcPt(p0, p1, h, k), q = arcPt(p0, p1, h, Math.min(1, k + .02)), d = Math.atan2(q[1] - p[1], q[0] - p[0]);
    return { p, dir: d, stretch: .45 * Math.sin(Math.PI * k) };
  }
  // squash on landing / at take-off: [sx, sy]
  const xSquash = (t, t0, amt = 1) => { const a = t - t0; if (a < 0) return [1, 1]; const s = .35 * amt * Math.exp(-a * 9) * Math.cos(a * 26); return [1 + s, 1 - s]; };

  // ---------- chips, ticks and dust ----------
  function chips(x, y, age, dir = 1, o = {}) {
    if (age < 0 || age > .75) return;
    const n = o.n ?? 9, seed = o.seed ?? 0;
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 7.1 + seed), h2 = hash(i * 3.3 + seed + 2), a = -Math.PI / 2 + dir * (.35 + 1.25 * h1) - (dir < 0 ? 0 : 0), sp = 260 + 380 * h2;
      const px = x + Math.cos(a) * sp * age, py = y + Math.sin(a) * sp * age + 1300 * age * age, sz = (5 + 6 * hash(i + seed * 3)) * (1 - seg(age, .5, .75));
      if (sz < 1) continue;
      boilSeed('chip' + seed + '.' + i);
      push(); translate(px, py); rotate(age * (8 + 10 * h1) + i);
      paint([[-sz, -sz * .5], [sz * .9, -sz * .7], [sz, sz * .5], [-sz * .7, sz * .6]], { wash: i % 3 === 0 ? BARK.md : i % 3 === 1 ? '#E8CB94' : '#D6B276', ink: PAL.ink, sw: .7 });
      pop();
    }
  }
  function ticks(x, y, age, o = {}) {   // impact lines round a hit, three frames
    if (age < 0 || age > (o.life ?? .14)) return;
    const k = age / (o.life ?? .14), n = o.n ?? 7, a0 = o.a0 ?? 0, spread = o.spread ?? TAU;
    boilSeed('ticks' + Math.round(x) + Math.round(y));
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / (n - (spread < TAU ? 1 : 0)) - (spread < TAU ? .5 : 0)) * spread, r0 = (o.r ?? 40) + 26 * k, r1 = (o.r ?? 40) + 26 + 40 * k;
      const P = [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]];
      inkLine(P, 4 * (1 - k * .6), PAL.ink, 'ink', 0); inkLine(P, 2.2 * (1 - k * .6), o.col || '#FFE27A', 'ink', 0);
    }
  }
  // dust kicked up off the forest floor: soft grey-green puffs with no outline (cream ones read as spare rocks)
  // (flattened: low arcs hugging the ground, gone in under half a second)
  const dust = (x, y, r, age, key, o = {}) => { if (age < 0 || age > (o.life ?? .42)) return; push(); translate(x, y); scale(1, .7); puff(0, 0, r, age, { col: o.col || '#AEB68F', noInk: true, key, n: o.n ?? 5, life: o.life ?? .42, rise: o.rise ?? .35 }); pop(); };
  // speed lines behind a dash: n strokes trailing back from (x, y) along dir (+1 = they trail to the right)
  function speedLines(x, y, len, k, dir, key, n = 4) {
    if (k <= 0) return;
    boilSeed('speed' + key);
    for (let i = 0; i < n; i++) { const yy = y + (i - (n - 1) / 2) * 46 + 10 * hash(i + 7), x0 = x + dir * (20 + 30 * hash(i)), L = len * k * (.6 + .4 * hash(i + 3)); inkLine([[x0, yy], [x0 + dir * L, yy]], 2.2, mixCol(PAL.ink, '#8F9C5F', .25), 'inkfine', 0); }
  }

  // ---------- posing helpers (survivor() maths) ----------
  const dropOf = o => clamp(o.crouch || 0) * 1.2 * U + clamp(o.sit || 0) * 2.05 * U;
  function bodyPt(x, y, o, lx, ly) {   // a body-local point in the world
    const sq = (o.sq || 0) + (o.take || 0);
    lx *= (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .55); ly *= (o.sy ?? 1) * (1 - sq);
    const r = o.rot || 0, c = Math.cos(r), s = Math.sin(r);
    return [x + (o.dx || 0) * U + lx * c - ly * s, y + (o.dy || 0) * U + lx * s + ly * c];
  }
  // a point k·U past the near hand along the forearm (k ≈ 1.45: the rock's striking face)
  function alongArm(x, y, o, k) {
    const [hx, hy] = survivorHand(x, y, U, o, 'L'), a2 = o.aL - o.bendL, sq = (o.sq || 0) + (o.take || 0);
    const lx = Math.cos(a2) * k * U * (o.flip ? -1 : 1) * (1 + sq * .55), ly = -Math.sin(a2) * k * U * (1 - sq), r = o.rot || 0;
    return [hx + lx * Math.cos(r) - ly * Math.sin(r), hy + lx * Math.sin(r) + ly * Math.cos(r)];
  }
  // Swing the near arm (keeping its bend) and shift the body (dx) so the rock's face lands on (tx, ty).
  function strike(x, y, o, tx, ty, k = 1.45) {
    const p = { ...o, dx: o.dx || 0 }, shx = (o.view === 'side' ? -.15 : -.75) * U;
    for (let i = 0; i < 10; i++) {
      const [sx, sy] = bodyPt(x, y, p, shx, -7.75 * U + dropOf(p)), tip = alongArm(x, y, p, k);
      let da = Math.atan2(ty - sy, tx - sx) - Math.atan2(tip[1] - sy, tip[0] - sx); da = Math.atan2(Math.sin(da), Math.cos(da));
      p.aL += p.flip ? da : -da;
      const tip2 = alongArm(x, y, p, k);
      p.dx += (tx - tip2[0]) / U * .8;
    }
    return { aL: p.aL, dx: p.dx };
  }
  // A swoosh trailing a fast swing: the path of the rock's face over the last `back` seconds (pos(t) gives it).
  function swoosh(t, t0, t1, pos, key, back = .09) {
    if (t <= t0 || t > t1 + .04) return;
    const ta = Math.max(t0, Math.min(t, t1) - back), tb = Math.min(t, t1), P = [];
    for (let i = 0; i <= 6; i++) P.push(pos(lerp(ta, tb, i / 6)));
    if (Math.hypot(P[6][0] - P[0][0], P[6][1] - P[0][1]) < 30) return;
    const fade = t > t1 ? 1 - (t - t1) / .04 : 1;
    boilSeed('swoosh' + key);
    paint(ribbon(P, 4, 34 * fade), { wash: '#FFF6E2', washOp: 210, ink: null });
    inkLine(P.slice(2), 1.4, mixCol(PAL.ink, '#FFF6E2', .4), 'inkfine', .4);
  }
  // the face only, from an acted emotion timeline (the arms, sway and takes are posed by hand here)
  const FACE = ['eyes', 'mouth', 'squint', 'blush', 'tint', 'tintK', 'tintMix', 'gloom', 'lid', 'emote', 'emoteK', 'emoteAge'];
  function face(t, keys) { const E = emotions(t, keys), F = {}; for (const k of FACE) if (E[k] !== undefined) F[k] = E[k]; return F; }
  // the rock in the Naked's near hand, along his forearm (the fist wraps it: handOver)
  const rockHand = (u, sw, info) => { push(); rotate(info.ang); translate(-.12 * u, 0); rockProp(u, sw); pop(); };
  // ---------- on the head: o.face(u, sw, V, head) hooks (drawn on the head, under the arms). head.pt(lon, lat, k) puts a
  // spot on the turned head (lon 0 = the middle of the face, − = the near side; lat − = up) in every view, and returns
  // [x, y, depth]; depth ≤ 0 has turned away from us.
  const fore = (head, lon) => clamp(Math.cos(lon + head.th) / Math.cos(lon), .3, 1);   // how flat-on a spot is (as heads.js's eyes)
  const BROW = [.05, -.5], XBROW = [.05, -.8], MASKX = [0, .27, 1.17];   // the plaster, the X above it, the X on a facemask (under the slits)
  function plasterOn(u, sw, head, big) {   // the plaster cross; big: the one he wears after the bonk
    const p = head.pt(...BROW); if (p[2] <= .05) return;
    const L = (big ? 1.05 : .72) * u, wd = (big ? .38 : .28) * u;
    push(); translate(p[0], p[1]); scale(fore(head, BROW[0]), 1);
    if (big) paint(ellPts(0, .1 * u, L * .7, L * .45, 14), { wash: '#F2A890', ink: null });   // the bump under it
    for (const a of [.62, -.62]) {
      push(); rotate(a);
      paint(rrPts(-L, -wd / 2, 2 * L, wd, wd * .45), { wash: '#E0BE8E', ink: PAL.ink, sw: sw * .45 });
      paint(rrPts(-L * .32, -wd * .38, L * .64, wd * .76, wd * .3), { wash: '#C9A06E', ink: null });
      for (const d of [-.7, .7]) for (const e of [-.2, .2]) paint(ellPts(d * L, e * wd, wd * .07, wd * .07, 6), { wash: '#A88358', ink: null });
      pop();
    }
    pop();
  }
  function xOnBrow(u, head, k, o = {}) { const p = head.pt(...XBROW); if (p[2] > .05) xMark(p[0], p[1], .8 * u * k, { key: 'brow', glow: .35, ...o }); }
  // the red X reflected in each eye (lookX/lookY as the rig moves the pupils)
  function eyeGlints(u, head, o, k) {
    for (const s of [-1, 1]) {
      const p = head.pt(s * .4, -.02, .84); if (p[2] <= .08) continue;
      const f = fore(head, s * .4), x = p[0] + (o.lookX || 0) * u * .25 * f, y = p[1] + (o.lookY || 0) * u * .15;
      xMark(x - .05 * u * f, y + .02 * u, .13 * u * k, { key: 'eyex' + s, glow: .5, sx: Math.max(.6, f) });
    }
  }
  // dizzy swirl eyes, drawn over blank eyes
  function swirlEyes(u, sw, head, t) {
    for (const s of [-1, 1]) {
      const p = head.pt(s * .4, -.02, .84); if (p[2] <= .08) continue;
      const f = fore(head, s * .4), P = [];
      for (let i = 0; i < 18; i++) { const a = i * .72 + t * 7 * s, r = i * .019 * u; P.push([p[0] + Math.cos(a) * r * f, p[1] + Math.sin(a) * r * .95]); }
      inkLine(P, sw * .9, PAL.ink, 'inkfine', .6);
    }
  }
  // a wide-eyed stare (over blank eyes): pupils pushed toward d = [forward, down] (−1..1), so the aim reads
  function starePupils(u, head, d) {
    for (const s of [-1, 1]) {
      const p = head.pt(s * .4, -.02, .84); if (p[2] <= .08) continue;
      const f = fore(head, s * .4), x = p[0] + d[0] * .18 * u * f, y = p[1] + d[1] * .15 * u;
      paint(ellPts(x, y, .16 * u * f, .21 * u, 12), { wash: PAL.ink, ink: null });
      paint(ellPts(x - .05 * u * f, y - .08 * u, .05 * u * f, .06 * u, 8), { wash: PAL.cream, ink: null });
    }
  }
  // a wide, trembling forced grin of gritted teeth, corners up
  function grinOn(u, sw, head, t) {
    const top = [], bot = [], n = 7, wob = .025 * Math.sin(t * 33);
    for (let i = -n; i <= n; i++) {
      const k = i / n, lon = k * .5, c = k * k, tw = Math.abs(i) >= n - 1 ? wob * Math.sign(i || 1) : 0;
      const a = head.pt(lon, .63 - .07 * c + tw, 1), b = head.pt(lon, .79 - .14 * c + tw, 1);
      if (a[2] > .03) { top.push([a[0], a[1]]); bot.push([b[0], b[1]]); }
    }
    if (top.length < 4) return;
    paint([...top, ...bot.slice().reverse()], { wash: '#FFF8EA', ink: PAL.ink, sw: sw * .65 });
    inkLine(top.map((p, i) => [p[0], lerp(p[1], bot[i][1], .5)]), sw * .4, PAL.ink, 'inkfine', .4);   // between the rows of teeth
    for (let i = 2; i < top.length - 2; i += 2) inkLine([top[i], bot[i]], sw * .3, mixCol(PAL.ink, '#FFF8EA', .3), 'inkfine', 0);
  }
  // the Naked's head: plaster (big after the bonk), the X on his brow, X glints, swirls, a grin
  const nakedFace = (o = {}) => (u, sw, V, head) => {
    plasterOn(u, sw, head, o.big);
    if (o.swirl) swirlEyes(u, sw, head, T);
    if (o.grin) grinOn(u, sw, head, T);
    if (o.stare) starePupils(u, head, o.stare);
    if (o.glints) eyeGlints(u, head, o.look || {}, o.glints);
    if (o.xOn > 0) xOnBrow(u, head, o.xOn, o.xS ? { sx: o.xS[0], sy: o.xS[1] } : {});
  };
  // a spot on a survivor's turned head, in the world (for aiming things at it)
  function worldHeadPt(x, y, o, lon, lat, k = 1) { const p = headPoint(U, o, lon, lat, k); return bodyPt(x, y, o, p[0], p[1]); }
  // How the Naked carries his rock: clutched at the chest under the beard (never at the mouth or over the briefs), or
  // cocked back over his head (charging), so his face stays clear. FAR_CLUTCH: the far hand on the rock too.
  const CHEST = [-6.9, -.95], RAISED = { aL: -4.45, bendL: -.3, armKL: 1.2 };
  const clutch = (o, k = 1) => { const [hx, hy] = handLocal(U, o, 'L'), r = reachArm(U, o, 'R', hx - .25 * U, hy + .35 * U); return { aR: lerp(o.aR ?? -1.2, r.aR, k), bendR: lerp(o.bendR ?? .3, r.bendR, k), armKR: lerp(1, r.armKR, k) }; };

  // ---------- S1: the X (0–7) ----------
  const XA = [416, 1080], XB = [402, 880], XPEEK = 780, XLOW = 1132;   // chest, head height, the peek (over his head), the low exit
  const RX = 600, HITB = [edgeR(1010) + 3, 1010];   // where he swings at the peek from; where his chop ends on the bark (below it)
  const BOARO = { boilKey: BO, seed: 3, coat: 'charcoal' };
  const COCK = [-4.43, -1.1];   // elbow up, forearm cocked back, the rock behind his head (≡ 1.85 rad): frame 0
  const N1 = [[0, 'determined', { eyes: 'determined', mouth: 'flat' }], [.46, 'determined', { eyes: 'determined', mouth: 'teeth' }], [.62, 'surprised', { emote: null }],
    [1.02, 'determined', { mouth: 'flat' }], [1.68, 'surprised', { emote: null }], [2.0, 'mischief', { eyes: 'sly', mouth: 'smirk' }], [2.86, 'surprised', { emote: null }],
    [3.04, 'determined', { mouth: 'teeth' }], [3.32, 'disgusted', { eyes: 'squeeze', mouth: 'wobble', tint: null }], [3.62, 'suspicious', { eyes: 'look', mouth: 'frown' }],
    [3.9, 'surprised', { eyes: 'blank', mouth: 'o', emote: null }], [4.2, 'surprised', { eyes: 'blank', mouth: 'o', emote: '!' }], [4.42, 'angry', { mouth: 'open', emote: null, tint: null }]];
  // The opening swing (t in -.5 .. 1 around the first THOCK at 0.5): 3D's last half second runs it from -.5.
  function swing1(t, big) {
    const base = { view: 'q', flip: true, rawArms: true, crouch: 0 };
    const hit = strike(NX, G, { ...base, rot: -.1, aL: -6.25, bendL: .02 }, XA[0] + 4, XA[1] + 2);
    const A = [...kf(t, [[-.5, [-.1, .05]], [0, COCK], [.3, [-4.55, -1.25]], [.5, [hit.aL, .02]], [.62, [hit.aL + .38, .3]], [1.0, CHEST]], (k) => k < 0 ? 0 : ease(k))];
    // the strike itself accelerates into the trunk
    if (t > .3 && t < .5) { const k = easeIn(seg(t, .3, .5)); A[0] = lerp(-4.55, hit.aL, k); A[1] = lerp(-1.25, .02, k); }
    const rot = kf(t, [[-.5, 0], [0, .12], [.3, .17], [.5, -.1], [.75, 0]]), dx = kf(t, [[.3, 0], [.5, hit.dx], [1, hit.dx * .6]]);
    return { ...base, aL: A[0], bendL: A[1], rot, dx, aR: kf(t, [[-.5, -.9], [0, -.45], [.5, -1.05], [.8, -1.2]]), bendR: kf(t, [[0, .5], [.5, .25]]),
      openR: t < .42, walk: t > .32 && t < .55 ? .12 * seg(t, .32, .5) : undefined, lookX: .45, lookY: .45 };
  }
  function nakedS1(t) {
    // returns { x, behind (drawn before the trunk), o }
    const F = face(t, N1), S = { ...F, boilKey: NK, seed: 1, prop: 'none', handOver: true, handL: rockHand };
    if (t > 3.85 && t < 4.46) S.squint = 0;   // the stare: eyes wide open (no blink between the expressions)
    if (t < 1.0) return { x: NX, o: { ...S, ...swing1(t) } };
    const x0 = NX + swing1(1).dx * U;   // where the first swing left him
    if (t < 2.0) {
      // looks up at it, crouches, jumps and hits it at the top of the hop (1.6), lands with the rock back at his chest
      const J = jump(t, 1.4, 1.8, 2.2), crouch = .35 * ease(seg(t, 1.15, 1.38)) * (1 - seg(t, 1.38, 1.42));
      const pre = { view: 'q', flip: true, rawArms: true, crouch, dy: J.dy, rot: kf(t, [[1.38, 0], [1.6, -.12], [1.85, 0]]), bendL: kf(t, [[1.0, CHEST[1]], [1.3, -.5], [1.6, .05], [1.67, .2], [1.8, CHEST[1]]]) };
      const hitPose = { ...pre, dy: -2.2, rot: -.12, crouch: 0, bendL: .05, aL: -5.75 };
      const hit = strike(x0, G, hitPose, XB[0] + 6, XB[1] + 4);
      const aL = t < 1.3 ? kf(t, [[1.0, CHEST[0] + TAU], [1.3, COCK[0]]]) : t < 1.6 ? lerp(COCK[0], hit.aL, easeIn(seg(t, 1.42, 1.6))) : kf(t, [[1.6, hit.aL], [1.67, hit.aL + .22], [1.8, CHEST[0]]]);
      const dx = kf(t, [[1.4, 0], [1.6, hit.dx], [2.0, hit.dx]]);
      return { x: x0, o: { ...S, ...pre, aL, dx, sq: J.sq, aR: kf(t, [[1.0, -1.2], [1.4, -.2], [1.8, -1.0]]), bendR: .4, lookX: t < 1.66 ? .2 : kf(t, [[1.66, .2], [1.9, 1]]), lookY: t < 1.66 ? -1 : kf(t, [[1.66, -1], [1.9, 0]]) } };
    }
    const x1 = x0 + strike(x0, G, { view: 'q', flip: true, rawArms: true, dy: -2.2, rot: -.12, bendL: .05, aL: -5.75 }, XB[0] + 6, XB[1] + 4).dx * U;
    if (t < 2.9) {
      // tiptoes behind the trunk, then leans out from its left edge to look for it
      const k = ease(seg(t, 2.0, 2.35)), x = lerp(x1, 404, k), lean = ease(seg(t, 2.35, 2.5)) * (1 - ease(seg(t, 2.84, 2.9)));
      return { x, behind: true, o: { ...S, view: 'q', flip: true, rawArms: true, crouch: .3 * (1 - .4 * lean), walk: (x1 - x) / (3 * U), dy: -.25 * Math.abs(Math.sin(k * Math.PI * 3)), rot: -.4 * lean,
        aL: CHEST[0], bendL: CHEST[1], aR: -.9 + .5 * lean, bendR: 1.0, lookX: .9, lookY: .1 } };
    }
    // he senses it behind him: dashes back round the trunk (2.9–3.04, smeared), skids round, and chops overhead at the X
    // peeking over his head: it ducks (3.2), the chop comes on down through where it was and thuds into the bark (3.3)
    const side = { view: 'q', flip: true, rawArms: true };
    const hitBark = strike(RX, G, { ...side, rot: -.12, aL: -6.0, bendL: .02 }, HITB[0], HITB[1]);
    if (t < 3.6) {
      if (t < 3.04) {
        const k = ease(seg(t, 2.9, 3.04)), x = lerp(404, RX, k);
        return { x, behind: x < RX - 4, dash: k, o: { ...S, view: 'side', flip: false, rawArms: true, walk: (x - 404) / (2.4 * U), smear: .85 * Math.sin(Math.PI * Math.min(1, k * 1.1)), smearDir: -1,
          rot: .14, ...RAISED, aR: -.3, bendR: 1.2, lookX: .9 } };
      }
      // a snap turn on the skid (the rock stays up behind his head), the wind-up, the chop
      const aL = t < 3.12 ? kf(t, [[3.04, RAISED.aL], [3.12, COCK[0]]]) : t < 3.3 ? lerp(COCK[0], hitBark.aL, easeIn(seg(t, 3.12, 3.3))) : hitBark.aL + .1 * Math.sin(t * 90) * Math.exp(-(t - 3.3) * 9);
      const bendL = t < 3.12 ? kf(t, [[3.04, RAISED.bendL], [3.12, COCK[1]]]) : t < 3.3 ? lerp(COCK[1], .02, easeIn(seg(t, 3.12, 3.3))) : .02;
      const armKL = t < 3.12 ? kf(t, [[3.04, RAISED.armKL], [3.12, 1]]) : 1;
      const dx = kf(t, [[3.14, 0], [3.3, hitBark.dx], [3.6, hitBark.dx]]), skid = Math.exp(-(t - 3.04) * 14);
      return { x: RX, o: { ...S, ...side, sq: .14 * skid, crouch: kf(t, [[3.04, .3], [3.14, .12], [3.3, 0]]), rot: kf(t, [[3.04, .1], [3.14, .14], [3.3, -.12], [3.6, -.04]]), aL, bendL, armKL, dx,
        aR: kf(t, [[3.04, -.9], [3.12, -.5], [3.3, -1.1]]), bendR: .5, lookX: .55, lookY: -.55 } };
    }
    const xs = RX + hitBark.dx * U;
    if (t < 4.48) {
      // shakes out his arm, looks round for it; spots it low on the trunk (3.9) and follows its hop onto the boar: a wide-
      // eyed stare at the boar's backside (4.2, a small take); raises his rock over his head (4.3)
      const tk = take(t, 4.2, .3), up = ease(seg(t, 4.26, 4.44)), rest = ease(seg(t, 3.6, 3.85));
      const look = t < 3.9 ? [kf(t, [[3.62, .2], [3.76, -.6], [3.88, .5]]), .1] : t < 4.0 ? [.75, .75] : [lerp(.75, 1, seg(t, 4.0, 4.2)), lerp(.75, .95, seg(t, 4.0, 4.2))];
      const stare = t < 3.9 ? null : t < 4.0 ? [.55, .45] : [lerp(.55, .95, ease(seg(t, 4.0, 4.2))), lerp(.45, .85, ease(seg(t, 4.0, 4.2)))];
      return { x: xs, face: stare && t < 4.42 ? { stare } : null, o: { ...S, view: 'q', flip: true, rawArms: true, sq: tk.sq, dy: tk.dy, crouch: .3 * up, rot: lerp(-.04, .08, up) - .05 * seg(t, 3.9, 4.2) * (1 - up),
        aL: lerp(lerp(hitBark.aL, CHEST[0], rest) + TAU, RAISED.aL, up), bendL: lerp(lerp(.02, CHEST[1], rest), RAISED.bendL, up), armKL: lerp(1, RAISED.armKL, up), aR: lerp(-1.25, -.6, up), bendR: .3,
        lookX: look[0], lookY: look[1] } };
    }
    return null;   // the chase (4.48–) is posed by chaseNaked()
  }

  // ---------- the chase round the tree (4.5–6.7) ----------
  // A loop round the tree wider than the frame: off to the left in front, back across behind the trunk, off to the
  // right, and round the front again. Runners move at a steady speed along it (arc length), so they never bunch up.
  const ELL = { cx: 400, cy: 1380, R: 720, ry: 62 };
  const ellPt = th => [ELL.cx + ELL.R * Math.cos(th), ELL.cy + ELL.ry * Math.sin(th)];
  const ELLS = (() => { const n = 1440, S = [0]; for (let i = 1; i <= n; i++) { const a0 = (i - 1) / n * TAU, a1 = i / n * TAU; S.push(S[i - 1] + Math.hypot(ELL.R * (Math.cos(a1) - Math.cos(a0)), ELL.ry * (Math.sin(a1) - Math.sin(a0)))); } return S; })();
  const PERIM = ELLS[1440];
  const sOf = th => { const k = ((th % TAU) + TAU) % TAU / TAU * 1440, i = Math.floor(k); return Math.floor(th / TAU) * PERIM + lerp(ELLS[i], ELLS[Math.min(1440, i + 1)], k - i); };
  const thOf = s => { const lap = Math.floor(s / PERIM), r = s - lap * PERIM; let lo = 0, hi = 1440; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ELLS[m] <= r) lo = m; else hi = m; } return (lap + (lo + (r - ELLS[lo]) / Math.max(1e-6, ELLS[lo + 1] - ELLS[lo])) / 1440) * TAU; };
  const S0 = sOf(Math.acos((240 - 400) / 720)), SN = sOf(Math.acos((550 - 400) / 720));   // where the boar stood, where he stood
  const RUNV = 1750, run = t => t < 4.62 ? 0 : RUNV * (t - 4.62) - RUNV * .12 * (1 - Math.exp(-(t - 4.62) / .12));
  const sBoar = t => S0 + run(t) + (t < 4.62 ? 0 : 110 * (1 - Math.exp(-(t - 4.62) / .2)));   // it bolts with a head start
  const sNaked = t => { const k = Math.exp(-Math.max(0, t - 4.62) / .35); return S0 + run(t) - (S0 - SN) * k - 240 * (1 - k); };   // he hangs on its tail
  const ZOOM = 6.5;   // both break off the loop and zoom off to the left
  // where a runner is: on the loop until 6.3, then straight on to the left, zipping off at 6.5
  function runner(t, sFn) {
    const T0 = 6.3;
    if (t <= T0) { const d = sFn(t), th = thOf(d), p = ellPt(th), s = Math.sin(th); return { p, front: s >= 0, s: s >= 0 ? 1 + .03 * s : 1 + .2 * s, flip: s >= -.04, turn: Math.abs(s) < .3, d, sp: 1 }; }
    const p0 = ellPt(thOf(sFn(T0))), x = p0[0] - RUNV * (t - T0) - (t > ZOOM ? 2600 * (t - ZOOM) : 0);
    return { p: [x, p0[1]], front: true, s: 1, flip: true, turn: false, d: sFn(T0) + (p0[0] - x), sp: t > ZOOM ? 2 : 1 };
  }

  // ---------- the boar in S1 ----------
  const YELPS = [5.2, 5.62, 6.04, 6.46];
  function boarS1(t, X) {
    if (t < 3.5) return;
    const squeal = Math.max(0, ...YELPS.map(ty => t > ty ? Math.exp(-(t - ty) * 7) : 0));
    const rump = X.onBoar ? (u, sw) => { const [sx, sy] = xSquash(t, X.landed ?? 99, .8); xMark(0, 0, .78 * u, { key: 'rump', glow: .35, sx, sy }); } : null;
    if (t < 4.66) {
      const k = easeOut(seg(t, 3.5, 4.35)), x = lerp(-300, 240, k), stride = 1 - seg(t, 4.2, 4.35);
      const look = ease(seg(t, 4.5, 4.56)), tk = t > 4.52 ? { dy: -.7 * Math.sin(Math.PI * seg(t, 4.52, 4.66)), sq: -.18 * Math.sin(Math.PI * seg(t, 4.52, 4.66)) } : { dy: 0, sq: 0 };
      const turnV = t < 4.6 ? 'side' : 'q', flip = t >= 4.63;
      const o = { gait: t < 4.35 ? 'trot' : 'stand', phase: (x + 300) / boarStride(BS, 'trot'), stride, mood: t > 4.52 ? 'scared' : 'neutral', ...BOARO,
        head: t < 4.5 ? .32 * ease(seg(t, 4.3, 4.45)) + .06 * Math.sin(t * 24) * seg(t, 4.35, 4.45) : -.12 * look, dy: tk.dy, sq: tk.sq, squeal: t > 4.53 && t < 4.66 ? .8 : 0, view: turnV, flip, rump, emote: null };
      return { x, y: 1425, o, front: true };
    }
    const r = runner(t, sBoar), sc = r.s;
    return { x: r.p[0], y: r.p[1], front: r.front, s: BS * sc, o: { gait: 'run', phase: r.d / (boarStride(BS, 'run') * 1.7), mood: 'scared', ...BOARO, view: r.turn ? 'q' : 'side', flip: r.flip, squeal, rump, emote: t > 6.4 ? null : 'sweat', emoteK: 1 } };
  }
  // the X in S1: where it is and how it looks. layer: 'tree' (on the bark), 'behind' (behind the trunk), 'air', or onBoar
  function xS1(t) {
    if (t < .5) return { layer: 'tree', p: XA, sx: 1 + .05 * Math.sin(t * TAU * 2), sy: 1 - .05 * Math.sin(t * TAU * 2), drip: 1 };
    if (t < .56) return { layer: 'tree', p: XA, sx: 1.35, sy: .55, drip: 1 };
    if (t < .86) { const h = hopX(XA, XB, 50, ease(seg(t, .56, .86))); return { layer: 'air', p: h.p, stretch: h.stretch, dir: h.dir, wrap: true }; }
    if (t < 1.6) { const [sx, sy] = xSquash(t, .86); return { layer: 'tree', p: XB, sx: sx * (1 + .08 * Math.sin(t * 20) * seg(t, 1.05, 1.3)), sy, rot: .12 * Math.sin(t * 14) * seg(t, 1.0, 1.5) }; }
    if (t < 1.66) return { layer: 'tree', p: XB, sx: 1.35, sy: .55 };
    if (t < 1.97) { const k = easeIn(seg(t, 1.66, 1.97)), x = lerp(XB[0], edgeL(XB[1]) + 2, k); return { layer: 'tree', p: [x, XB[1] + 6 * Math.sin(k * 9)], rot: -.35 * Math.sin(Math.PI * Math.min(1, k * 1.6)), sx: 1.12 }; }
    if (t < 2.8) return null;
    if (t < 3.25) {   // peeks right out past the trunk's right edge (over his head), wiggling; ducks back as the rock comes (3.2)
      const out = backOut(seg(t, 2.8, 2.9)) * (1 - easeIn(seg(t, 3.2, 3.25))), ex = edgeR(XPEEK), a = t - 2.8;
      return { layer: 'behind', p: [ex - XR * 1.2 + out * XR * 2.35, XPEEK + 5 * Math.sin(a * 26) * out], rot: .22 * out + .16 * Math.sin(a * 22) * out, sx: 1 + .06 * Math.sin(a * 30) * out, sy: 1 - .06 * Math.sin(a * 30) * out };
    }
    if (t < 3.62) return null;
    if (t < 4.0) {   // creeps back round the left edge onto the front of the trunk, low
      const k = ease(seg(t, 3.62, 3.86)), x = lerp(edgeL(XLOW) + 3, TX - 52, k), [sx, sy] = t > 3.9 ? [1.2, .7] : [1, 1];
      return { layer: 'tree', p: [x, XLOW], sx, sy: sy };
    }
    // the hop onto the boar's backside (4.0 → 4.2)
    const land = 4.2, B = boarS1(land, { onBoar: false }), target = boarRump(B.x, B.y, BS, { ...B.o, t: land });
    if (t < land) { const h = hopX([TX - 52, XLOW], target, 90, seg(t, 4.0, land)); return { layer: 'air', p: h.p, stretch: h.stretch, dir: h.dir }; }
    return { onBoar: true, landed: land };
  }
  function drawX(X) {
    if (!X || X.onBoar) return;
    const o = { key: 'x1', sx: X.sx ?? 1, sy: X.sy ?? 1, rot: X.rot || 0, stretch: X.stretch, dir: X.dir, drip: X.drip };
    if (X.layer === 'air' || X.layer === 'behind') xMark(X.p[0], X.p[1], XR, o); else xOnBark(X.p[0], X.p[1], o);
  }
  function nakedChase(t) {
    const r = runner(t, sNaked), ph = r.d / (8 * U);
    const k = ease(seg(t, 4.48, 4.62));   // blend out of the stare pose onto the loop
    if (k < 1) { const s0 = nakedS1(4.47); r.p = [lerp(s0.x + (s0.o.dx || 0) * U, r.p[0], k), lerp(G, r.p[1], k)]; }
    return { x: r.p[0], y: r.p[1], front: r.front, s: r.s, o: { ...face(t, N1), boilKey: NK, seed: 1, prop: 'none', handOver: true, handL: rockHand, view: r.turn ? 'q' : 'side', flip: r.flip, rawArms: true,
      walk: ph, dy: -.55 * Math.abs(Math.sin(ph * Math.PI)), rot: (r.flip ? -1 : 1) * (.18 + .05 * Math.sin(ph * TAU)), ...RAISED, aL: RAISED.aL + .12 * Math.sin(ph * TAU) * k,
      aR: -.5 + .9 * Math.sin(ph * TAU + Math.PI), bendR: 1.1, mouth: Math.max(0, ...YELPS.map(ty => t > ty - .02 && t < ty + .25 ? 1 : 0)) ? 'O' : 'open', eyes: 'angry', lookX: .8 } };
  }

  function s1(t, lt) {
    const sh = [kick(t, .5, 7), kick(t, 1.6, 7), kick(t, 3.3, 4)].reduce((a, b) => [a[0] + b[0], a[1] + b[1]], [0, 0]);
    const c0 = camLerp(BASE, cam(420, 1040, .88), ease(seg(t, 3.35, 3.85))), c = cam(c0.cx + sh[0], c0.cy + sh[1], c0.z);
    backdrop(c);
    camBegin(c.cx, c.cy, c.z);
    floor();
    const X = xS1(t), N = t < 4.48 ? nakedS1(t) : nakedChase(t), B = boarS1(t, X || {});
    const drawNaked = () => { if (!N) return; const o = { ...N.o, face: nakedFace(N.face || {}) }; if (N.y) survivor(N.x, N.y, U * N.s, { ...HERO, ...o }); else spawnling(N.x, G, U, o); };
    const drawBoar = () => { if (B) boar(B.x, B.y, B.s || BS, B.o); };
    // behind the trunk: the X peeking, the Naked sneaking, runners on the far side of the loop
    if (B && !B.front) drawBoar();
    if (N && N.front === false) drawNaked();
    bushX();
    if (X && X.layer === 'behind') drawX(X);
    if (N && N.behind) drawNaked();
    if (N && N.dash > 0) speedLines(N.x - 70, G - 260, 360, Math.sin(Math.PI * Math.min(1, N.dash * 1.2)), -1, 'dash');   // his path round the back of the trunk
    bigPine(c);
    needles(t, .5); needles(t, 1.6, 5);
    if (X && X.layer === 'tree') drawX(X);
    // the dash round the trunk: a puff where he vanished, speed lines behind him, a skid where he stops
    dust(edgeL(G - 40) - 10, G + 4, 40, t - 2.88, 'zip', { n: 5 });
    dust(RX - 20, G + 8, 46, t - 3.03, 'skid', { n: 6 }); 
    if (t > 6.5) for (let i = 0; i < 4; i++) dust(60 + 150 * i, 1418, 54, t - 6.5 - .04 * (3 - i), 'zoom' + i, { life: .65, n: 6 });
    if (t > 6.48 && t < 6.75) { boilSeed('zoomlines'); const k = seg(t, 6.48, 6.75); for (let i = 0; i < 4; i++) { const y = 1130 + i * 70 + 20 * hash(i), x0 = -150 + 260 * k + 80 * hash(i), L = 300 * (1 - k); inkLine([[x0, y], [x0 + L, y]], 1.1, mixCol(PAL.ink, '#8F9C5F', .35), 'inkfine', 0); } }
    if (B && B.front) drawBoar();
    if (N && !N.behind && N.front !== false) drawNaked();
    if (X && X.layer === 'air') drawX(X);
    const tipAt = tt => { const n = nakedS1(tt); return n ? alongArm(n.x, G, n.o, 1.3) : [0, 0]; };
    swoosh(t, .36, .5, tipAt, 'h1'); swoosh(t, 1.47, 1.6, tipAt, 'h2'); swoosh(t, 3.13, 3.3, tipAt, 'h3');
    // hits: chips, impact ticks
    chips(XA[0] + 20, XA[1], t - .5, 1, { seed: 1 }); ticks(XA[0] + 10, XA[1], t - .5, { r: 36 });
    chips(XB[0] + 20, XB[1], t - 1.6, 1, { seed: 2 }); ticks(XB[0] + 10, XB[1], t - 1.6, { r: 36 });
    chips(HITB[0], HITB[1], t - 3.3, 1, { seed: 3, n: 6 }); ticks(HITB[0], HITB[1], t - 3.3, { r: 30, n: 5 });
    if (t > 1.78 && t < 2.4) dust(nakedS1(1.8).x + 10, G + 6, 40, t - 1.8, 'land');
    if (t > 4.48 && t < 5.2) { const n0 = nakedS1(4.47); dust(n0.x + (n0.o.dx || 0) * U, G + 10, 50, t - 4.5, 'charge', { n: 6 }); }
    camEnd();
    if (t < 2.5) titleCard(t);
  }
  // the premise tag: "Hit the" in lettering, then a painted X (the real one)
  function titleCard(t) {
    const k = backOut(seg(t, 0, .25)) * (1 - ease(seg(t, 2.25, 2.5)));
    if (k < .02) return;
    letter('Hit the', 400, 392, 112 * k, PAL.cream, { screen: true, stroke: PAL.ink, rot: -.05 });
    xMark(400 + 248 * k, 384, 46 * k, { key: 'title', glow: .3, rot: -.05 });
  }

  // ---------- S2: wrong target (7–14) ----------
  const CX = 556, CY = 1376;   // the Chad's mark once he's out from behind the trunk
  const NX2 = 790;             // the Naked's mark by the bush
  // the Chad, facing right, AK held low in both hands (o: extra options; x: where he stands)
  function chadPose(o = {}) {
    const base = { view: 'q', rawArms: true, crouch: o.crouch ?? 0 }, low = reachArm(U, base, 'L', 1.25 * U, -5.75 * U + dropOf(base));
    return { boilKey: CH, seed: 2, ...base, ...low, aR: -1.3, bendR: .3, gunRot: .62, twoHand: true, eyes: 'normal', ...o };
  }
  // what the Chad wears on his facemask this frame (an o.face hook, so it sits on the plate in any view): the X, and
  // the dent after the CLANG
  const chadFace = (xOn, dent, xS = [1, 1]) => (u, sw, V, head) => {
    const p = head.pt(...MASKX); if (p[2] <= .05) return;
    const f = fore(head, 0);
    if (dent > 0) {   // a dimple knocked into the steel: a dark crescent, a lit lower rim and creases
      push(); translate(p[0] + .05 * u, p[1] + .05 * u); scale(dent * f, dent);
      const D = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * TAU, r = (i % 2 ? .36 : .52) * u; return [Math.cos(a) * r * 1.1, Math.sin(a) * r * .85]; });
      paint(D, { wash: '#6E767C', ink: '#3A4044', sw: sw * .5 });   // the crumpled crater
      paint(ellPts(.08 * u, .1 * u, .24 * u, .18 * u, 10), { wash: '#565E64', ink: null });
      inkLine([[-.4 * u, .2 * u], [-.1 * u, .37 * u], [.28 * u, .33 * u]], sw * .7, '#DCE2E6', 'ink', .4);   // light catching its lower lip
      for (const a of [-.7, 1.0, 2.3, 3.7]) inkLine([[Math.cos(a) * .52 * u, Math.sin(a) * .42 * u], [Math.cos(a + .15) * .88 * u, Math.sin(a + .15) * .72 * u]], sw * .45, '#3A4044', 'inkfine', 0);
      pop();
    }
    if (xOn > 0) xMark(p[0], p[1], .6 * u * xOn, { key: 'mask', glow: .4, sx: xS[0] * f, sy: xS[1] });
  };

  // a smooth path through timed keys [t, x, y] (Catmull-Rom)
  function pathAt(K, t) {
    if (t <= K[0][0]) return [K[0][1], K[0][2]];
    if (t >= K[K.length - 1][0]) return [K[K.length - 1][1], K[K.length - 1][2]];
    let i = 0; while (t > K[i + 1][0]) i++;
    const a = K[Math.max(0, i - 1)], b = K[i], c = K[i + 1], d = K[Math.min(K.length - 1, i + 2)], u = (t - b[0]) / (c[0] - b[0]);
    const cr = j => .5 * (2 * b[j] + (-a[j] + c[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u * u + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * u * u * u);
    return [cr(1), cr(2)];
  }
  const depthS = y => 1 + (y - G) / 450;   // further back (smaller y) is smaller

  // 2A wide (behind the rock transition until ~7.45): the boar runs back in from the left with the X on its backside,
  // swerves away from us round behind the bush and stops there (the bush shakes: it scrapes the X off), then trots out
  // of the far side without it (8.3). The Naked runs in after it, skids to a stop by the bush and looks round: "?" (8.4).
  // Behind his back, the X peeks out of the top of the bush (8.5–8.72) and ducks before he turns.
  const WIDE = cam(820, 930, .9);
  const B2A = [[7.0, -80, 1462], [7.2, 160, 1440], [7.5, 520, 1376], [7.72, 760, 1324], [7.88, 890, 1302], [8.1, 970, 1298], [8.32, 1150, 1314], [8.7, 1420, 1334], [9.0, 1600, 1344]];
  function boar2A(t) {
    const p = pathAt(B2A, t), q = pathAt(B2A, t + .02), sp = Math.hypot(q[0] - p[0], q[1] - p[1]) / .02;
    let d = 0; for (let tt = 7.0; tt < t; tt += .02) { const a = pathAt(B2A, tt), b = pathAt(B2A, Math.min(t, tt + .02)); d += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    const s = BS * depthS(p[1]), gait = sp > 820 ? 'run' : 'trot', calm = t > 8.15;
    return { x: p[0], y: p[1], s, rustle: clamp(1 - Math.abs(t - 8.0) / .28) * (t > 7.72 ? 1 : 0),
      o: { gait, phase: d / boarStride(s, gait), stride: clamp(sp / 380, .35, 1), mood: calm ? 'happy' : 'scared', ...BOARO, emote: calm ? null : undefined,
        rump: t < 7.95 ? (u, sw) => xMark(0, 0, .78 * u, { key: 'rump', glow: .35 }) : null, squeal: t < 7.5 ? .7 : 0 } };
  }
  function s2a(t, lt) {
    const c = WIDE;
    backdrop(c);
    camBegin(c.cx, c.cy, c.z);
    floor();
    bigPine(c);
    const B = boar2A(t), behindBush = B.y < BUSH.y - 12;
    if (behindBush) boar(B.x, B.y, B.s, B.o);
    // the X peeking out of the top of the bush, behind the Naked's back
    if (t > 8.48 && t < 8.76) {
      const out = backOut(seg(t, 8.5, 8.58)) * (1 - easeIn(seg(t, 8.68, 8.74))), a = t - 8.5;
      xMark(BUSH.x + 40, BUSH.y - BUSH.h + 30 - out * 60, XR * .9, { key: 'bushpeek', rot: .2 * Math.sin(a * 24) * out, sx: 1 + .06 * Math.sin(a * 30), sy: 1 - .06 * Math.sin(a * 30) });
    }
    bushX({ rustle: Math.max(B.rustle, t > 8.5 && t < 8.74 ? .25 : 0) });
    if (!behindBush) boar(B.x, B.y, B.s, B.o);
    // the Naked runs in from the left (7.55), rock cocked over his head, and skids to a stop by the bush (8.15)
    if (t >= 7.55) {
      const k = seg(t, 7.55, 8.15), x = lerp(-260, NX2, 1 - Math.pow(1 - k, 2.2)), run = k < 1, stop = ease(seg(t, 8.15, 8.45));
      const F = face(t, [[7.5, 'angry', { mouth: 'open', emote: null }], [8.22, 'surprised', { emote: null }], [8.4, 'confused', { emote: null }]]);
      const look = t > 8.4 ? (t < 8.76 ? -.75 : .9) : .8, ph = (x + 300) / (3.4 * U);
      spawnling(x, G, U, { ...F, boilKey: NK, seed: 1, prop: 'none', handOver: true, handL: rockHand, face: nakedFace(), view: run ? 'side' : 'q', rawArms: true, walk: run ? ph : undefined,
        dy: run ? -.5 * Math.abs(Math.sin(ph * Math.PI)) : 0, rot: run ? .16 : kf(t, [[8.15, -.12], [8.3, 0]]),
        aL: run ? RAISED.aL + .12 * Math.sin(ph * TAU) : lerp(RAISED.aL, CHEST[0] + TAU, stop), bendL: run ? RAISED.bendL : lerp(RAISED.bendL, CHEST[1], stop), armKL: run ? RAISED.armKL : lerp(RAISED.armKL, 1, stop),
        aR: run ? -.5 + .9 * Math.sin(ph * TAU + Math.PI) : -1.2, bendR: run ? 1.1 : .3, lookX: look });
      dust(x + 40, G + 8, 52, t - 8.1, 'skid2a', { n: 6 }); dust(x - 30, G + 10, 40, t - 8.16, 'skid2b', { n: 5 });
      if (t > 8.4) emote('?', NX2 + 24, G - 16.6 * U, U * 1.7, seg(t, 8.4, 8.6), t - 8.4);   // a big "?"
    }
    camEnd();
  }

  // 2B medium: the X jumps out of the bush (9.0) in an arc over the Naked; the Chad sneaks out from behind the trunk
  // (heavy steps 9.2, 9.7, 10.2) and the X lands in the middle of his facemask (9.9). He doesn't notice.
  const MED = cam(640, 1000, .9), XLAND = 9.9;
  function chad2B(t) {
    const steps = [9.2, 9.7, 10.2], xs = [380, 418, 488, CX];
    let i = 0; while (i < 3 && t >= steps[i]) i++;
    const from = i === 0 ? 8.9 : steps[i - 1], to = i < 3 ? steps[i] : steps[2] + .3, k = ease(seg(t, from + .05, to)), x = lerp(xs[i], xs[Math.min(3, i + 1)], i < 3 ? k : 0);
    const plant = steps.reduce((a, s2) => a + (t > s2 ? Math.exp(-(t - s2) * 12) : 0), 0);
    return { x: i < 3 ? x : CX, o: chadPose({ crouch: .22, walk: i < 3 ? (i + k) * .5 : 1.5, dy: .12 * plant - .1 * Math.sin(Math.PI * k) * (i < 3 ? 1 : 0), eyes: 'normal', lookX: .4 }) };
  }
  const maskPt = C => worldHeadPt(C.x, CY, C.o, ...MASKX);   // the X's spot on the Chad's facemask, in the world
  function xArc2B(t) {   // the X's flight from the bush to the facemask
    const target = maskPt(chad2B(XLAND)), from = [BUSH.x + 70, BUSH.y - BUSH.h + 40];
    const k = seg(t, 9.0, XLAND), h = hopX(from, target, 380, k);
    return { ...h, k };
  }
  function s2b(t, lt) {
    const c = cam(MED.cx - 15 * ease(lt / 1.5), MED.cy, MED.z);
    backdrop(c);
    camBegin(c.cx, c.cy, c.z);
    floor();
    bushX({ rustle: t < 9.15 ? 1 - seg(t, 9.0, 9.15) : 0 });
    const C = chad2B(t), onMask = t >= XLAND, [sx, sy] = xSquash(t, XLAND, 1);
    geared(C.x, CY, U, { ...C.o, face: chadFace(onMask ? 1 : 0, 0, [sx, sy]) });   // he comes out from behind the trunk
    bigPine(c);
    // the Naked: a take as it pops out, follows its flight over his head, turns round, locks on
    const turned = t > 9.36, F = face(t, [[9.0, 'confused', { emote: null }], [9.05, 'surprised', { emote: null }], [9.95, 'determined', { eyes: 'determined', mouth: 'flat' }]]);
    const A = !onMask ? xArc2B(t) : null, tk = take(t, 9.05, .9);
    const lk = A ? [clamp((A.p[0] - NX2) / 160, -1, 1) * (turned ? -1 : 1), clamp((A.p[1] - 940) / 220, -1, 1)] : [.9, .25];
    spawnling(NX2, G, U, { ...F, boilKey: NK, seed: 1, prop: 'none', handOver: true, handL: rockHand, face: nakedFace(), view: t > 9.3 && t < 9.42 ? 'qf' : 'q', flip: turned, rawArms: true,
      aL: CHEST[0], bendL: CHEST[1], aR: -1.2, bendR: .3, sq: tk.sq, dy: tk.dy, lookX: lk[0], lookY: lk[1] });
    if (A && A.k > 0) xMark(A.p[0], A.p[1], XR, { key: 'flight', stretch: A.stretch, dir: A.dir, rot: A.k * 4 });
    camEnd();
  }

  // 2C close: his eyes lock on the X. Tunnel vision: the world darkens to a ring, pulsing with his heartbeat; all he
  // sees is the X, glowing at the edge of frame (it's on the Chad's facemask, lost in the dark), and its red in his eyes.
  function s2c(t, lt) {
    const c = cam(lerp(768, 762, ease(lt)), lerp(960, 945, ease(lt)), lerp(2.3, 3.0, ease(lt)));
    backdrop(c);
    camBegin(c.cx, c.cy, c.z);
    floor();
    bushX();
    const C = chad2B(10.5);
    geared(C.x, CY, U, { ...C.o, face: chadFace(1, 0) });
    const No = { ...face(t, [[10.5, 'determined', { eyes: 'determined', mouth: 'flat' }]]), boilKey: NK, seed: 1, prop: 'none', handOver: true, handL: rockHand, view: 'q', flip: true, rawArms: true,
      aL: CHEST[0] + .04 * Math.sin(t * 9), bendL: CHEST[1] - .1, aR: -1.2, bendR: .3, lookX: .9, lookY: .05, squint: .28 * ease(seg(t, 10.6, 11.0)) };
    No.face = nakedFace({ glints: 1, look: No });
    spawnling(NX2, G, U, No);
    const mp = maskPt(C), sx = (mp[0] - c.cx) * c.z + W / 2, sy = (mp[1] - c.cy) * c.z + H / 2;
    camEnd();
    const beat = [10.5, 11.0].reduce((a, b) => a + (t > b ? Math.exp(-(t - b) * 7) : 0), 0);
    tunnel(lerp(330, 270, ease(lt)) - 28 * beat, [540, 905]);
    xMark(sx, sy, .6 * U * c.z * (1 + .06 * beat), { key: 'tunnelx', glow: .9, sx: .82 });   // over the dark: the target
  }
  // tunnel vision: everything outside a soft ellipse round (cx, cy) darkens (screen space), in fine steps
  function tunnel(r, [cx, cy]) {
    for (let i = 0; i < 28; i++) { staticSeed('tunnel' + i); ringOutside(cx, cy, r * (1 + i * .045) * 1.1, r * (1 + i * .045) * 1.45, '#221A1C', 13 + .75 * i); }
  }
  // everything outside an ellipse, as ONE polygon (the hole joined to the outer frame by a hairline slit), translucent
  function ringOutside(cx, cy, rx, ry, col, op, far = 3000) {
    const P = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * TAU; P.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    P.push([cx + far, cy], [cx + far, cy - far], [cx - far, cy - far], [cx - far, cy + far], [cx + far, cy + far], [cx + far, cy + .01]);
    paint(P, { wash: col, washOp: op, ink: null });
  }

  // 2D/2E two-shot: he winds up and swings, CLANG (12.0): the mask dents, the X pops off, ring lines; the rock bounces
  // off and he recoils, his arm buzzing. Freeze. The Chad's eyes narrow; the Naked looks at the X floating between them,
  // at the Chad, sweats, hugs his rock; the X hops onto his forehead (13.6).
  const TWO = cam(672, 1010, 1.3), CLANG = 12.0, XFLOAT = [692, 790], XHEAD = 13.6, XHEADLAND = 13.76;
  const nakedForehead = (o, x = NX2) => worldHeadPt(x, G, o, ...XBROW);
  function chad2D(t) {
    const hitK = t > CLANG ? Math.exp(-(t - CLANG) * 9) * Math.sin((t - CLANG) * 40) : 0;
    // the eyes in the slits: unaware, then wide at the hit, then they come back and narrow
    const eyes = t < CLANG ? 'normal' : t < 12.45 ? 'wide' : t < 13.25 ? 'normal' : 'angry';
    return { x: CX, o: chadPose({ crouch: .12, rot: -.05 * hitK, eyes, lookX: t > 12.45 ? .25 : .4, lookY: t > 12.45 ? .2 : 0, squint: t > 12.45 ? .4 * ease(seg(t, 12.45, 13.9)) : 0 }) };
  }
  const OUT = [-6.55, .2];   // after the CLANG: his rock arm held out stiff, low in front of him, buzzing
  function naked2D(t) {
    const target = maskPt(chad2D(CLANG));
    const base = { view: 'q', flip: true, rawArms: true };
    const hit = strike(NX2, G, { ...base, rot: -.06, aL: -6.2, bendL: .02, armKL: 1.2 }, target[0] + 8, target[1]);
    const buzz = t > CLANG ? .09 * Math.exp(-(t - CLANG) * 3.2) * (Math.floor(t * 24) % 2 ? 1 : -1) : 0;
    let aL, bendL, dx, rot, armK, hug = 0;
    if (t < CLANG) {   // winds up from his chest (11.5–11.78), swings (11.85–12.0)
      aL = t < 11.85 ? kf(t, [[11.5, CHEST[0] + TAU], [11.78, COCK[0]], [11.85, -4.55]]) : lerp(-4.55, hit.aL, easeIn(seg(t, 11.85, CLANG)));
      bendL = t < 11.85 ? kf(t, [[11.5, CHEST[1]], [11.78, COCK[1]], [11.85, -1.25]]) : lerp(-1.25, .02, easeIn(seg(t, 11.85, CLANG)));
      dx = kf(t, [[11.8, 0], [CLANG, hit.dx]]); rot = kf(t, [[11.5, 0], [11.8, .16], [CLANG, -.06]]); armK = lerp(1, 1.2, easeIn(seg(t, 11.85, CLANG)));
    } else {   // the rock bounces off: he recoils back past his mark (by 12.25), arm buzzing; then pulls the rock in and hugs it (13.0–13.5)
      const rec = easeOut(seg(t, CLANG, 12.25)), back = ease(seg(t, 13.0, 13.5));
      aL = lerp(lerp(hit.aL, OUT[0], rec), CHEST[0], back) + buzz * (1 - back); bendL = lerp(lerp(.02, OUT[1], rec), CHEST[1], back);
      dx = lerp(hit.dx, .8, rec); rot = lerp(-.06, .1, rec) * (1 - back) + .02 * back; armK = lerp(1.2, 1, rec); hug = back;
    }
    const F = face(t, [[11.5, 'determined', { eyes: 'determined', mouth: 'teeth' }], [12.05, 'surprised', { emote: null, mouth: 'flat' }], [12.6, 'neutral', { eyes: 'look' }], [13.05, 'nervous', { emote: 'sweat', mouth: 'wobble' }]]);
    const look = t < 12.6 ? [.9, 0] : t < 13.0 ? [.45, -1] : t < 13.6 ? [.9, -.3] : [.2, -1];
    const o = { ...F, boilKey: NK, seed: 1, prop: 'none', handOver: true, handL: rockHand, ...base, aL, bendL, armKL: armK, dx, rot, aR: -1.2, bendR: .3, lookX: look[0], lookY: look[1], crouch: t > 13.1 ? .12 * ease(seg(t, 13.1, 13.5)) : 0, emoteDx: 4.8, emoteDy: .3 };
    if (hug > 0) Object.assign(o, clutch(o, hug));
    return { x: NX2, o };
  }
  function s2d(t, lt) {
    const sh = kick(t, CLANG, 12, .3), push_ = ease(seg(t, 12.6, 14)) * .12;
    const c = cam(TWO.cx + sh[0], TWO.cy + sh[1] - 20 * push_, TWO.z + push_);
    backdrop(c);
    camBegin(c.cx, c.cy, c.z);
    floor();
    bushX();
    bigPine(c);
    const C = chad2D(t), N = naked2D(t), dent = t >= CLANG ? Math.min(1, .6 + (t - CLANG) * 8) : 0;
    const [mx, my] = maskPt(C);
    geared(C.x, CY, U, { ...C.o, face: chadFace(t < CLANG ? 1 : 0, dent) });
    // the Naked; from 13.76 the X rides on his forehead (over the plaster) and he looks up at it cross-eyed
    const onHead = t >= XHEADLAND, cross = t > XHEADLAND;
    const No = { ...N.o };
    if (cross) { No.eyes = 'cross'; No.squint = 0; }
    No.face = nakedFace({ xOn: onHead ? 1 : 0 });
    spawnling(N.x, G, U, No);
    swoosh(t, 11.88, CLANG, tt => { const n = naked2D(tt); return alongArm(n.x, G, n.o, 1.3); }, 'h4');
    // CLANG: sparks, ring lines round the mask, a short flash
    if (t >= CLANG) { sparks(mx + 30, my - 10, 1.1, t - CLANG, { dir: -Math.PI * .6, spread: 2.6, n: 11, key: 'clang' }); rings(mx + 10, my, t - CLANG); }
    // the X: pops off the mask, floats between them (above their heads), hops onto his forehead
    if (t >= CLANG && t < XHEADLAND) {
      let p, o = { key: 'float' };
      if (t < 12.3) { const h = hopX([mx, my], XFLOAT, 120, ease(seg(t, CLANG, 12.3))); p = h.p; o = { ...o, stretch: h.stretch, dir: h.dir, rot: (t - CLANG) * 14 }; }
      else if (t < XHEAD) { p = [XFLOAT[0] + 8 * Math.sin((t - 12.3) * 4), XFLOAT[1] + 10 * Math.sin((t - 12.3) * 6)]; o.rot = .15 * Math.sin((t - 12.3) * 5); const [a, b] = xSquash(t, 12.3, .7); o.sx = a; o.sy = b; }
      else { const h = hopX(XFLOAT, nakedForehead(No), 70, seg(t, XHEAD, XHEADLAND)); p = h.p; o = { ...o, stretch: h.stretch, dir: h.dir }; }
      xMark(p[0], p[1], XR * .95, o);
    }
    camEnd();
    if (t >= CLANG) flash(.2 * Math.exp(-(t - CLANG) * 18), '#FFF6E0');
  }
  // vibration rings round the clanged mask: arcs either side, spreading and fading
  function rings(x, y, age) {
    if (age > .9) return;
    boilSeed('rings');
    for (let j = 0; j < 3; j++) {
      const k = clamp((age - j * .1) / .7); if (k <= 0 || k >= 1) continue;
      for (const s2 of [-1, 1]) {
        const r = 70 + 120 * k, P = [];
        for (let i = 0; i <= 8; i++) { const a = (s2 > 0 ? 0 : Math.PI) + (i / 8 - .5) * 1.3; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r * .9]); }
        inkLine(P, 3.2 * (1 - k), PAL.ink, 'ink', .4);
      }
    }
  }

  // ---------- S3: bonk (14–20) ----------
  // 3A two-shot: the Chad slings his AK onto his back, takes out a rock of his own (14.8) and raises it high.
  // The Naked smiles a wobbly, awkward smile, hugging his own rock.
  const slungAK = (u, sw) => { push(); translate(-.6 * u, -6.6 * u); rotate(-2.3); akProp(u, sw * .9, 0); pop(); };
  const N3 = () => naked2D(13.99).o.dx || 0;   // where 2E left him
  const UP3 = [-1.95, -12.27];                 // the Chad's rock hand at the top: up and back, clear of his mask
  function s3a(t, lt) {
    const c = cam(668, 990, lerp(1.24, 1.3, ease(lt / 1.5)));
    backdrop(c);
    camBegin(c.cx, c.cy, c.z);
    floor();
    bushX();
    bigPine(c);
    // the Chad: the sling (14.0–14.5) as in Ep. 1, a reach behind his hip, the rock (14.72, glint 14.8), raised high
    // over his head (15.33) and held there
    const C0 = chadPose({ crouch: 0, eyes: 'angry', squint: .4, lookX: .25, lookY: .25 });
    let CA;
    if (t < 14.5) {
      const k = ease(seg(t, 14.05, 14.32)), k2 = ease(seg(t, 14.32, 14.45));
      const low = handLocal(U, C0, 'L'), high = [-3.2 * U, -8.1 * U];
      if (t < 14.32) { const g = [lerp(low[0], high[0], k), lerp(low[1], high[1], k)]; CA = { ...reachArm(U, { view: 'q', rawArms: true }, 'L', g[0], g[1]), gunRot: lerp(.62, TAU - 1.75, k), twoHand: false, aR: -1.3 }; }
      else { const p = [lerp(high[0], -.6 * U, k2), lerp(high[1], -6.6 * U, k2)], r = lerp(TAU - 1.75, TAU - 2.3, k2), hp = reachArm(U, { view: 'q', rawArms: true }, 'L', high[0], high[1]), fall = ease(seg(t, 14.32, 14.5));
        CA = { aL: lerp(hp.aL, -1.32, fall), bendL: lerp(hp.bendL, .22, fall), armKL: lerp(hp.armKL, 1, fall), noGun: true, twoHand: false, aR: -1.3, behind: (u, sw) => { push(); translate(p[0] * u / U, p[1] * u / U); rotate(r); akProp(u, sw * .9, 0); pop(); } }; }
    } else {
      // the hand goes back to the hip for it, then carries it up behind his back and over his shoulder (never across the mask)
      const reach = ease(seg(t, 14.5, 14.66)), up = ease(seg(t, 14.8, 15.33));
      const hp = up > 0 ? kf(up, [[0, [-1.3, -4.9]], [.35, [-2.75, -7.7]], [.72, [-2.55, -10.9]], [1, UP3]], k => k) : [lerp(-.4, -1.3, reach), lerp(-5.6, -4.9, reach)];
      const H = reachArm(U, { view: 'q', rawArms: true }, 'L', hp[0] * U, hp[1] * U, up < .3);
      CA = { aL: H.aL, bendL: H.bendL, armKL: H.armKL, rot: -.08 * up, noGun: true, twoHand: false, aR: -1.3, behind: slungAK, handOver: true,
        handL: t >= 14.72 ? (u, sw) => { push(); rotate(-.6 - .95 * up); translate(-.1 * u, 0); rockProp(u * .95, sw); pop(); } : null };
    }
    const Co = { ...C0, ...CA, rawArms: true, view: 'q', face: chadFace(0, 1) };
    geared(CX, CY, U, Co);
    // the glint as the rock comes out (the "tink", 14.8)
    if (t > 14.7 && t < 15.0) { const [hx, hy] = survivorHand(CX, CY, U, Co, 'L'), g = t < 14.8 ? seg(t, 14.7, 14.8) : 1 - seg(t, 14.8, 15.0); glow(hx + 20, hy - 40, 80, '#FFF6D8', g); boilSeed('rockglint'); paint(starPts(hx + 24, hy - 44, 34 * g, .25, 4), { wash: '#FFFDF2', ink: null }); }
    // the Naked: hugging his rock to his chest, the X on his forehead; a wobbly, toothy forced grin, sweat
    const F = face(t, [[14.0, 'nervous', { emote: 'sweat', mouth: null, eyes: 'wide' }], [14.75, 'scared', { mouth: null, emote: 'sweat', tint: 'pale' }]]);
    const No = { ...F, boilKey: NK, seed: 1, prop: 'none', handOver: true, handL: rockHand, view: 'q', flip: true, rawArms: true, aL: CHEST[0], bendL: CHEST[1], crouch: .12 + .08 * ease(seg(t, 14.8, 15.4)), emoteDx: 4.8, emoteDy: .3,
      dx: N3() + .03 * Math.sin(t * 47), lookX: t < 14.3 ? .2 : .6, lookY: t < 14.3 ? -1 : lerp(-.2, -.8, ease(seg(t, 14.9, 15.4))), dy: .03 * Math.sin(t * 40) };
    Object.assign(No, clutch(No));
    if (t < 14.3) { No.eyes = 'cross'; No.squint = 0; No.mouth = 'wobble'; }
    No.face = nakedFace({ xOn: 1, grin: t >= 14.3 });
    spawnling(NX2, G, U, No);
    camEnd();
  }
  // 3B close: the rock comes down on the X (from 15.54) and lands (15.667): his head squashes, a small burst. Cut to
  // black on the THOCK (15.75).
  const BONK = 15.667;
  function s3b(t, lt) {
    const No = { ...face(t, [[15.5, 'scared', { mouth: null, emote: 'sweat' }], [15.6, 'scared', { eyes: 'squeeze', mouth: null, emote: 'sweat' }]]), boilKey: NK, seed: 1, prop: 'none', handOver: true, handL: rockHand, view: 'q', flip: true, rawArms: true,
      aL: CHEST[0], bendL: CHEST[1], crouch: .2, dx: N3(), lookX: .3, lookY: -1, emoteDx: 3.4, emoteDy: 1.2 };
    Object.assign(No, clutch(No));
    const hc = worldHeadPt(NX2, G, No, 0, 0, 0);   // frame on his head (before the squash)
    const c = cam(hc[0] - 15, hc[1] + 4, 2.3);
    backdrop(c);
    camBegin(c.cx, c.cy, c.z);
    floor();
    bushX();
    const hit = t >= BONK, sq = hit ? .13 + .03 * seg(t, BONK, 15.72) : 0;
    No.sq = sq; No.dy = hit ? .1 : 0;
    No.face = nakedFace({ xOn: 1, grin: true, xS: hit ? [1.35, .5] : null });
    spawnling(NX2, G, U, No);
    // the Chad's arm: a sleeve and gloved fist with the rock, swinging down from the top left
    const fh = nakedForehead(No), ra = 1.35, dyK = kf(t, [[15.5, 460], [15.542, 330], [15.583, 205], [15.625, 95], [BONK, 34]], k => k);
    const hand = [fh[0] - Math.cos(ra) * 64 - 18 * dyK / 460, fh[1] - Math.sin(ra) * 64 - dyK], sh = [hand[0] - 70, hand[1] - 420];
    boilSeed('chadarm');
    if (!hit && t > 15.55) for (let i = 0; i < 3; i++) inkLine([[hand[0] - 50 + i * 40, hand[1] - 130 - .4 * dyK], [hand[0] - 46 + i * 40, hand[1] - 44]], 1.8, PAL.ink, 'inkfine', 0);   // motion lines
    paint(ribbon([sh, [lerp(sh[0], hand[0], .5) - 10, lerp(sh[1], hand[1], .5)], hand], 70, 56), { wash: '#5F6B52', ink: PAL.ink, sw: 2.2 });
    inkLine([[hand[0] - 30, hand[1] - 44], [hand[0] + 26, hand[1] - 38]], 6, PAL.ink, 'ink', 0); inkLine([[hand[0] - 30, hand[1] - 44], [hand[0] + 26, hand[1] - 38]], 4.4, '#8E908C', 'ink', 0);   // the grey cuff
    push(); translate(hand[0], hand[1]); rotate(ra); translate(-.1 * U, 0); rockProp(U * 1.05, 2.2); pop();
    paint(ellPts(hand[0], hand[1], 30, 27, 14), { wash: '#5A4A3A', ink: PAL.ink, sw: 2 });
    // contact: impact lines and a little burst round the rock
    if (hit) { ticks(fh[0] + 4, fh[1] + 6, t - BONK, { r: 52, n: 8, life: .1 }); sparks(fh[0], fh[1], .7, t - BONK + .02, { n: 7, key: 'bonk', spread: 2.4, dir: -Math.PI / 2 }); }
    camEnd();
    if (hit) flash(.22 * (1 - seg(t, BONK, 15.74)), '#FFF6E0');
  }
  // 3C: out cold. Black, then a ring of big KO stars spinning round (from 15.85).
  function s3c(t, lt) {
    boilSeed('black'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#1E1A24', ink: null });
    const a = t - 15.85; if (a < 0) return;
    const n = 8, cx = 560, cy = 840, rx = 215, ry = 118, S = [];
    for (let i = 0; i < n; i++) { const th = i / n * TAU + a * 2.2; S.push([i, th, Math.sin(th)]); }
    S.sort((p, q) => p[2] - q[2]);   // the far side of the ring first
    for (const [i, th, front] of S) {
      const pop_ = backOut(clamp((a - i * .035) / .22)); if (pop_ < .02) continue;
      const x = cx + Math.cos(th) * rx, y = cy + Math.sin(th) * ry, tw = .85 + .15 * Math.sin(a * 14 + i * 2), r = (42 + 12 * front) * tw * pop_;
      boilSeed('kostar' + i);
      glow(x, y, r * 2.3, '#FFE7A0', .95);
      paint(starPts(x, y, r, .45, 5, a * 3 + i), { wash: i % 2 ? '#FFD84A' : '#FFF4C8', ink: '#8A6A1E', sw: 2.2 });
      paint(ellPts(x - r * .18, y - r * .2, r * .16, r * .12, 8), { wash: '#FFFFFF', ink: null });   // a sparkle
    }
  }
  // 3D: the opening composition again, with a bigger plaster. He shakes it off (swirly eyes), squints at the X (18.0),
  // raises his rock and aims (18.6), and winds up (19.5): at 20.0 this is frame 0 again.
  function s3d(t, lt) {
    const c = BASE;
    backdrop(c);
    camBegin(c.cx, c.cy, c.z);
    floor();
    bushX();
    bigPine(c);
    xOnBark(XA[0], XA[1], { key: 'x1', sx: 1 + .05 * Math.sin(t * TAU * 2), sy: 1 - .05 * Math.sin(t * TAU * 2), drip: 1 });
    const F = face(t, [[17, 'dizzy', { emote: null, eyes: 'blank' }], [17.75, 'neutral', { emote: null }], [18.0, 'suspicious', { eyes: 'narrow', mouth: 'flat' }], [18.55, 'determined', { eyes: 'determined', mouth: 'flat' }]]);
    let o;
    if (t >= 19.5) o = swing1(t - 20);
    else {
      const aim = ease(seg(t, 18.55, 19.0)), shake = t > 17.6 && t < 17.95 ? .12 * Math.sin((t - 17.6) * 50) * (1 - seg(t, 17.6, 17.95)) : 0;
      o = { view: 'q', flip: true, rawArms: true, aL: lerp(CHEST[0] + TAU, -.1, aim), bendL: lerp(CHEST[1], .05, aim), aR: lerp(-1.2, -.9, aim), bendR: lerp(.4, .5, aim), rot: shake, crouch: 0,
        lookX: t < 18 ? .2 : .45, lookY: t < 18 ? 0 : .45, openR: aim > .5 };
    }
    const swirl = t < 17.75;
    if (swirl) F.squint = 0;
    spawnling(NX, G, U, { ...F, ...o, boilKey: NK, seed: 1, prop: 'none', handOver: true, handL: rockHand, face: nakedFace({ big: true, swirl }) });
    if (t < 17.75) emote('stars', NX - 20, G - 14.6 * U, U * 1.05, 1 - seg(t, 17.5, 17.75), t - 17);
    camEnd();
    if (t < 17.4) { const [hx, hy] = [NX - 20, G - 10.8 * U - BASE.cy + H / 2], r = lerp(0, 1300, Math.pow(seg(t, 17.0, 17.4), 1.6)); iris(hx, hy, r, '#1E1A24'); }
  }

  shots([[0, s1], [7, s2a], [9, s2b], [10.5, s2c], [11.5, s2d], [14, s3a], [15.5, s3b], [15.75, s3c], [17, s3d]]);
  transitions([[7.0, 'rockSpin', { in: .3 }]]);   // his rock tumbles at the lens between S1 and S2 (covers ~6.79–7.49)
})();
