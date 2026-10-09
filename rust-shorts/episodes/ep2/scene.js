// ep2 "1234": code-lock guesses electrocute the Naked harder each time. The owner walks up and types 1234, then quietly
// changes it from inside. The Naked's 1234 earns the mega-zap, and the owner takes his rock too. Shot list: SCRIPT.md.
(() => {
  const G = 1300, U = 38, NK = 'naked', CH = 'chad', TOD = 1.15;
  const DOOR = [410, 690, 780], DW = DOOR[1] - DOOR[0], DH = G - DOOR[2];   // door x0, x1, top (it hinges on its right edge)
  const LOCK = [330, 1020], LS = .13;          // the code lock beside the door (bigLock at a small scale, so W matches K)
  const WALL_TOP = 560;                         // the wall's top edge: dusk sky above it
  const GLOVE = '#5A4A3A', SLEEVE = '#5F6B52', CUFF = '#8E908C';
  const WX = 400, WY = 1080, WZ = 1.2;          // the wide shot's camera: him, the lock and the door
  const NA = 222;                               // where he stands at the lock
  const NX = 150;                               // where the big zap drops him, sitting
  const RK = [86, G + 4];                       // his rock on the ground behind him
  const RD = [442, G - 14];                     // his rock at the door's foot after the mega zap
  const KCX = 468, KCY = 800, KS = 1.3;         // the keypad close-up's lock
  const SKIN = SKIN_TONES.light;
  const SEAT = 1.8;                             // sitting on the ground: the rig's sit is chair height, so drop him this far (u)
  const sootSkin = s => mixCol(SKIN.col, '#77757C', .32 * s);                // matches survivor()'s ash tint
  const sootHair = s => mixCol(HAIR_COLS.brown, '#2B2724', .55 * s);
  const grade = (col, op) => { staticSeed('grade' + col); paint(rectPts(-2000, -2000, 5000, 6000), { wash: col, washOp: op, ink: null }); };
  const dusk = () => grade('#5A3A6A', 38);

  // ---------- the lock ----------
  const keyOf = d => d === '0' ? 10 : +d - 1;   // key index on the pad (1–9 → 0–8, 0 → 10)
  // what's on the display, and which key is down, for a typing run: presses = [[t, digit], ...]
  function typing(t, presses) {
    let digits = '', press = -1, pressK = 0;
    for (const [tp, d] of presses) if (t >= tp) { digits += d; const age = t - tp; if (age < .16) { press = keyOf(d); pressK = age < .06 ? age / .06 : 1 - (age - .06) / .1; } }
    return { digits, press, pressK };
  }
  // where a key / the status LED is on bigLock(cx, cy, s)
  function keyPos(cx, cy, s, k) {
    const W2 = 260 * s, H2 = 340 * s, dy0 = cy - H2 + 60 * s, dh = 130 * s, kx0 = cx - W2 + 62 * s, ky0 = dy0 + dh + 50 * s, kw = 104 * s, kh = 78 * s, gap = 22 * s;
    const r = Math.floor(k / 3), c = k % 3;
    return [kx0 + c * (kw + gap) + kw / 2, ky0 + r * (kh + gap) + kh / 2];
  }
  const ledPos = (cx, cy, s) => [cx + 260 * s - 62 * s, cy - 340 * s + 60 * s + 65 * s];
  // states: 'locked' (red), 'entry' (amber: a code is being typed), 'open' (green), 'error' (blinking red, with a halo)
  function lockAt(cx, cy, s, o = {}) {
    const st = o.state || 'locked';
    bigLock(cx, cy, s, { digits: o.digits || '', press: o.press ?? -1, pressK: o.pressK || 0, state: st === 'entry' ? 'locked' : st });
    const [lx, ly] = ledPos(cx, cy, s), sw = clamp(2.2 * s, .8, 3);
    if (st === 'entry') {   // amber over the red LED
      boilSeed('ledamber' + Math.round(cx));
      glow(lx, ly, 70 * s, '#FFB23A', .8);
      paint(ellPts(lx, ly, 20 * s, 20 * s, 14), { wash: '#F2A62E', ink: PAL.ink, sw: sw * .7 });
      paint(ellPts(lx - 6 * s, ly - 6 * s, 6 * s, 5 * s, 8), { wash: '#FFFFFF', washOp: 180, ink: null });
    }
    if (st === 'error' && frac(T * 6) >= .5) glow(lx, ly, 230 * s, '#FF3A2A', .9);   // the error halo, on with the blink
    if (o.pop > .01) glow(lx, ly, (120 + 200 * o.pop) * s, st === 'open' ? '#7BFF8E' : '#FF4A3A', o.pop);
  }

  // ---------- sets ----------
  // The base's stone wall (stoneWall's look, without the moss, with a brick size for the close-up): rows of blocks
  // from top to ground y, a gap for the door.
  function wall(x0, x1, top, y, door, o = {}) {
    const rowH = o.rowH || 74, bl = o.brick || 140, lw = o.lw || .7, key = o.key || 'w';
    const col = mixCol('#A9ADB1', '#B49A92', clamp(TOD) * .35), dk = mixCol(col, PAL.ink, o.soft ? .18 : .35);
    staticSeed(key + 'wall');
    const pts = door ? [[x0, top], [x1, top], [x1, y], [door[1], y], [door[1], door[2]], [door[0], door[2]], [door[0], y], [x0, y]] : rectPts(x0, top, x1 - x0, y - top);
    paint(pts, { wash: col, ink: o.soft ? null : PAL.ink, sw: 1.4 });
    for (let r = 0, yy = y - rowH; yy > top + 10; r++, yy -= rowH) {
      boilSeed(key + 'row' + r);
      for (let xx = x0 + (r % 2 ? bl / 2 : 0); xx < x1; xx += bl) { if (!(door && xx > door[0] - 10 && xx < door[1] + 10 && yy + rowH > door[2])) inkLine([[xx, yy], [xx + (hash(xx + r) - .5) * 4, yy + rowH]], lw, dk, 'inkfine', 0); }
      if (!door || yy < door[2]) inkLine([[x0 + 4, yy], [x1 - 4, yy]], lw, dk, 'inkfine', 0);
      else { inkLine([[x0 + 4, yy], [door[0] - 4, yy]], lw, dk, 'inkfine', 0); inkLine([[door[1] + 4, yy], [x1 - 4, yy]], lw, dk, 'inkfine', 0); }
    }
    if (o.soft) return;
    boilSeed(key + 'coping'); paint(rectPts(x0, top, x1 - x0, 16), { wash: mixCol(col, PAL.ink, .14), ink: PAL.ink, sw: 1.1 });   // the wall's top course
    boilSeed(key + 'lip'); paint(rectPts(x0 - 20, y - 6, x1 - x0 + 40, 30, 1), { wash: mixCol(col, PAL.ink, .15), ink: PAL.ink, sw: 1.1 });   // foundation lip
  }
  // The wide set. Paint order is depth: sky, the room behind the doorway (o.inside: things in the room), the wall (it
  // clips the room to the opening), o.gap (an arm reaching out of the doorway), the door leaf, the lock.
  //   o.open 0..1 swings the door in (it narrows toward its hinge on the right); o.dark: an unlit room; o.shade: a dark
  //   wash over the room (someone walking deeper in); o.lock: the lock state; o.digits; o.press/pressK: a key being tapped
  function set(t, o = {}) {
    rustSky(t, { tod: TOD, horizon: 640, sun: [190, 480], clouds: true });
    hills(t, { horizon: 600, tod: TOD });
    staticSeed('dirt'); paint(rectPts(-800, 1290, 2600, 1000), { wash: mixCol('#8C7A5A', '#3E3A48', .35), ink: null });
    grassTufts(-300, 1200, 1334, t, 14, mixCol(RUST.grassDk, '#2A3040', .3));
    const open = o.open || 0, ww = DW * Math.max(.08, 1 - open), gx1 = DOOR[1] - ww;
    if (open > .01) {
      staticSeed('room'); paint(rectPts(DOOR[0] - 6, DOOR[2] - 6, DW + 12, DH + 12), { wash: o.dark ? '#17121A' : '#3A2A26', ink: null });
      if (!o.dark) {   // a warm glimpse: the furnace's glow, its flame, the corner of a box
        glow(DOOR[0] + 90, G - 120, 230, '#FF9A4A', .9);
        furnace(DOOR[0] + 84, G - 40, .5, 1, t);
        woodBox(DOOR[1] - 30, G - 34, .55);
      }
      if (o.inside) o.inside(gx1);
      if (o.shade > 0) { staticSeed('roomshade'); paint(rectPts(DOOR[0] - 6, DOOR[2] - 6, DW + 12, DH + 12), { wash: '#100C10', washOp: o.shade, ink: null }); }
    }
    wall(-300, 1150, WALL_TOP, G, DOOR);
    if (open > .01 && o.gap) o.gap(gx1);
    doorPanel(gx1, G, ww, DH, 'armor', { hingeRight: true });   // just the leaf, narrowed (the room is painted above)
    lockAt(LOCK[0], LOCK[1], LS, { state: o.lock || 'locked', digits: o.digits || '', press: o.press, pressK: o.pressK });
    // the LED lit at the wide's scale: red when locked, green when open, blazing red on a zap
    const st = o.lock || 'locked', [lx, ly] = ledPos(LOCK[0], LOCK[1], LS), on = st !== 'error' || frac(T * 6) >= .5, col = st === 'open' ? '#6BF07E' : '#FF4A3A';
    if (on) { glow(lx, ly, st === 'error' ? 70 : 28, col, st === 'error' ? 1 : .8); boilSeed('wled'); paint(ellPts(lx, ly, st === 'error' ? 5.5 : 4.2, st === 'error' ? 5.5 : 4.2, 10), { wash: st === 'open' ? '#B8FFC2' : '#FF8A7A', ink: null }); }
  }
  // the latch plate's centre on the leaf (doorPanel's layout), for a hand to push
  const plateAt = open => { const ww = DW * Math.max(.08, 1 - open), x0 = DOOR[1] - ww; return [x0 + ww * .11, DOOR[2] + DH * .505]; };

  // ---------- effects ----------
  // A zap bolt: a thin jagged zigzag, a cyan glow under a white core, no outline; short forks branch off it.
  function bolt(x0, y0, x1, y1, seed, o = {}) {
    const L = Math.hypot(x1 - x0, y1 - y0); if (L < 4) return;
    const n = Math.max(3, Math.round(L / (o.seg || 24))), nx = -(y1 - y0) / L, ny = (x1 - x0) / L, P = [], amp = o.amp ?? Math.min(L * .16, 20);
    for (let i = 0; i <= n; i++) { const k = i / n, off = (i === 0 || i === n) ? 0 : (i % 2 ? 1 : -1) * (.35 + .65 * hash(seed * 13.7 + i)) * amp; P.push([lerp(x0, x1, k) + nx * off, lerp(y0, y1, k) + ny * off]); }
    const w = o.w || .6;
    boilSeed('zap' + seed);
    if (o.halo) glow((x0 + x1) / 2, (y0 + y1) / 2, L * .45, '#8FE8FF', o.halo);
    inkLine(P, w * 2.4, o.glowCol || '#79E2FF', 'ink', 0);
    inkLine(P, w * .8, '#FFFFFF', 'ink', 0);
    for (let f = 0; f < (o.forks ?? 1); f++) {
      const i = 1 + Math.floor(hash(seed * 7.1 + f) * (n - 1)), [bx, by] = P[i], a = Math.atan2(y1 - y0, x1 - x0) + (hash(seed + f * 3.3) > .5 ? 1 : -1) * (.6 + .5 * hash(seed + f)), fl = L * (.2 + .15 * hash(seed + f * 5));
      const F = [[bx, by], [bx + Math.cos(a) * fl * .5 + nx * 6, by + Math.sin(a) * fl * .5 + ny * 6], [bx + Math.cos(a) * fl, by + Math.sin(a) * fl]];
      inkLine(F, w * 1.6, o.glowCol || '#79E2FF', 'ink', 0); inkLine(F, w * .55, '#FFFFFF', 'ink', 0);
    }
  }
  // bolts along a chain of points, plus little crackles round the body; re-drawn every 2 frames
  function zapChain(t, chain, aura, big) {
    const f = Math.floor(t * 12);
    for (let i = 1; i < chain.length; i++) bolt(chain[i - 1][0], chain[i - 1][1], chain[i][0], chain[i][1], i * 7 + f * 3, { w: big ? .8 : .6, forks: big ? 2 : 1, halo: big ? .5 : .3 });
    for (let i = 0; i < aura.length; i++) { const [x, y] = aura[i], a = hash(f * 5 + i) * TAU, L = 26 + 22 * hash(f + i * 9); bolt(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, 50 + i * 11 + f, { w: .45, forks: 0, seg: 9, amp: 7 }); }
  }
  // Soft pale smoke puffs rising from (x, y) (above his hair tips): no outlines, they swell and fade.
  function smoke(x, y, s, age, key, o = {}) {
    if (age < 0) return;
    const n = o.n || 4, life = o.life || 1.5;
    for (let i = 0; i < n; i++) {
      const k = frac(age / life + i / n), px = x + 14 * s * Math.sin(k * 4 + i * 2.1), py = y - (o.rise ?? 140) * s * k, r = (7 + 18 * k) * s;
      const a = (1 - k) * clamp(k / .12) * clamp(age / .25);
      boilSeed('smk' + key + i);
      paint(ellPts(px, py, r, r * .85, 12), { wash: mixCol('#C9C4CC', '#EFECF2', k), washOp: (o.op ?? 170) * a, ink: null });
    }
  }
  const dust = (x, y, r, age, key, life = .6) => puff(x, y, r, age, { col: '#D9CFBC', noInk: true, life, key, rise: .5 });
  // The x-ray: the frame goes dark (call inside the camera, after the set) ...
  const xrayDark = (cx, cy) => { staticSeed('xdark'); paint(rectPts(cx - 1200, cy - 1600, 2400, 3200), { wash: '#0B1226', washOp: 250, ink: null }); };
  // ... and his skeleton shows through a faint cyan body: a bright white skull with black sockets and teeth, bold ribs,
  // a spine, a pelvis and the limb bones. Same pose options as the rig's front view (rawArms aL/bendL/aR/bendR, rot, dx, dy).
  function skeleton(x, y, u, o = {}) {
    const B = '#F7FAFF', K = '#071022', sw = clamp(u / 16, .45, 2.4), key = o.key || '';
    const arm = (sd, a, b) => { const s0 = [sd * 1.8 * u, -7.75 * u], d1 = [sd * Math.cos(a), -Math.sin(a)], a2 = a - b, d2 = [sd * Math.cos(a2), -Math.sin(a2)], e = [s0[0] + d1[0] * 1.85 * u, s0[1] + d1[1] * 1.85 * u]; return [s0, e, [e[0] + d2[0] * 1.75 * u, e[1] + d2[1] * 1.75 * u]]; };
    const A = [arm(-1, o.aL ?? -1.3, o.bendL ?? .2), arm(1, o.aR ?? -1.3, o.bendR ?? .2)];
    const Lg = [-1, 1].map(sd => [[sd * .9 * u, -4.4 * u], [sd * 1.0 * u, -2.3 * u], [sd * .95 * u, -.35 * u]]);
    push(); translate(x + (o.dx || 0) * u, y + (o.dy || 0) * u); if (o.rot) rotate(o.rot);
    glow(0, -7.5 * u, 9 * u, '#3FC8FF', .85);
    const flesh = { wash: '#2E7AA6', washOp: 150, ink: null };
    boilSeed('xflesh' + key);
    for (const P of [...A, ...Lg]) paint(ribbon(P, 1.05 * u, .9 * u), flesh);
    paint([[-2.1 * u, -8.35 * u], [2.1 * u, -8.35 * u], [1.9 * u, -4.0 * u], [-1.9 * u, -4.0 * u]], { ...flesh, curv: .2 });
    paint(ellPts(0, -10.85 * u, 2.35 * u, 2.3 * u, 24), flesh);
    boilSeed('xbones' + key);
    const bone = (P, w) => { paint(ribbon(P, w * u, w * .8 * u), { wash: B, ink: K, sw: sw * .45 }); for (const p of [P[0], P[P.length - 1]]) paint(ellPts(p[0], p[1], w * .72 * u, w * .64 * u, 10), { wash: B, ink: K, sw: sw * .4 }); };
    for (const [s0, e, h] of A) { bone([s0, e], .36); bone([e, h], .3); for (let f = 0; f < 3; f++) { const dx = (h[0] - e[0]) / 1.75, dy = (h[1] - e[1]) / 1.75; paint(ellPts(h[0] + dx * .35 + (f - 1) * .2 * u, h[1] + dy * .35, .11 * u, .2 * u, 6), { wash: B, ink: K, sw: sw * .3 }); } }
    for (const [hp, k, f] of Lg) { bone([hp, k], .4); bone([k, f], .34); }
    for (let i = 0; i < 8; i++) paint(rrPts(-.24 * u, (-8.55 + i * .5) * u, .48 * u, .38 * u, .12 * u), { wash: B, ink: K, sw: sw * .35 });   // spine
    for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) { const y0 = (-7.95 + i * .6) * u; paint(ribbon([[sd * .22 * u, y0], [sd * 1.15 * u, y0 - .22 * u], [sd * 1.7 * u, y0 + .3 * u], [sd * 1.45 * u, y0 + .7 * u]], .3 * u, .2 * u), { wash: B, ink: K, sw: sw * .4 }); }   // bold ribs
    for (const sd of [-1, 1]) paint(ribbon([[sd * .2 * u, -8.45 * u], [sd * 1.75 * u, -8.05 * u]], .26 * u, .22 * u), { wash: B, ink: K, sw: sw * .35 });   // collarbones
    paint([[-1.5 * u, -4.95 * u], [-.3 * u, -4.55 * u], [0, -4.8 * u], [.3 * u, -4.55 * u], [1.5 * u, -4.95 * u], [1.15 * u, -3.85 * u], [.35 * u, -3.75 * u], [0, -4.05 * u], [-.35 * u, -3.75 * u], [-1.15 * u, -3.85 * u]], { wash: B, ink: K, sw: sw * .45, curv: .3 });   // pelvis
    // the skull
    const jaw = o.jaw || 0;
    paint(ellPts(0, -11.2 * u, 2.0 * u, 1.9 * u, 24), { wash: B, ink: K, sw: sw * .55 });
    paint(rrPts(-1.3 * u, -10.4 * u, 2.6 * u, 1.05 * u, .45 * u), { wash: B, ink: K, sw: sw * .5 });   // cheekbones and upper teeth
    paint(rrPts(-1.05 * u, (-9.55 + jaw * .5) * u, 2.1 * u, .7 * u, .3 * u), { wash: B, ink: K, sw: sw * .5 });   // the jaw
    paint(rectPts(-.95 * u, -9.75 * u, 1.9 * u, (.28 + jaw * .5) * u), { wash: K, ink: null });   // between the teeth
    for (let k = -2; k <= 2; k++) { inkLine([[k * .38 * u, -10.05 * u], [k * .38 * u, -9.75 * u]], sw * .45, K, 'inkfine', 0); inkLine([[k * .38 * u, (-9.47 + jaw * .5) * u], [k * .38 * u, (-9.2 + jaw * .5) * u]], sw * .45, K, 'inkfine', 0); }
    for (const sd of [-1, 1]) paint(ellPts(sd * .78 * u, -11.15 * u, .62 * u, .7 * u, 14), { wash: K, ink: null });   // eye sockets
    paint([[0, -10.75 * u], [-.26 * u, -10.3 * u], [.26 * u, -10.3 * u]], { wash: K, ink: null });   // nose hole
    pop();
  }

  // ---------- characters ----------
  // The Naked. The rig's frizz lets the hair cap's outline show through as a thin arc (a headband), so the crown is
  // covered with a hair-coloured band and the frizz is painted again on top.
  function naked(x, y, o = {}) {
    const O = { boilKey: NK, seed: 1, prop: 'none', rawArms: true, ...o };
    if ((O.frizz || 0) > 0 && O.view !== 'back') {
      const prev = O.draw;
      O.draw = (u, sw, V) => { const drop = clamp(O.crouch || 0) * 1.2 * u + clamp(O.sit || 0) * 2.05 * u; frizzBand(u, -10.85 * u + drop, 2.35 * u, sootHair(O.soot || 0)); frizzHalo(u, sw, { frizz: O.frizz, soot: O.soot || 0, hairCol: sootHair(O.soot || 0) }, 0, -10.85 * u + drop, 2.35 * u); if (prev) prev(u, sw, V); };
    }
    const sk = clamp(((O.soot || 0) - .45) / .45);   // a hard char: more ash, a few darker scorch marks, skin between
    if (sk > 0) {
      const pu = O.under, pf = O.face;
      O.under = (u, sw, V) => {
        const drop = clamp(O.crouch || 0) * 1.2 * u + clamp(O.sit || 0) * 2.05 * u, f = V.torsoW || 1;
        [[-1.05, -7.45, .62, '#55535B', 120], [.95, -6.75, .55, '#55535B', 120], [-.35, -5.95, .5, '#55535B', 110], [1.15, -7.95, .34, '#2E2C32', 120], [-1.35, -6.35, .3, '#2E2C32', 110], [.3, -7.2, .22, '#2E2C32', 100]].forEach(([px, py, r, c, op], i) => {
          boilSeed('scorch' + i); const P = []; for (let j = 0; j < 10; j++) { const a = j / 10 * TAU, rr = r * u * (.7 + .45 * hash(i * 7.7 + j)); P.push([px * u * f + Math.cos(a) * rr * 1.3, py * u + drop + Math.sin(a) * rr * .8]); }
          paint(P, { wash: c, washOp: op * sk, ink: null, curv: .5 });
        });
        if (pu) pu(u, sw, V);
      };
      O.face = (u, sw, V, head) => {
        [[-.8, .22, .5, '#55535B', 120], [.75, .25, .42, '#55535B', 110], [.25, -.5, .36, '#55535B', 100], [-.55, -.52, .2, '#2E2C32', 110], [.95, .05, .18, '#2E2C32', 100]].forEach(([lon, lat, r, c, op], i) => {
          const q = head.pt(lon, lat, 1); if (q[2] <= .08) return;
          boilSeed('fscorch' + i); paint(ellPts(q[0], q[1], r * u * clamp(q[2] + .2, .4, 1), r * u * .75, 10, r * u * .2), { wash: c, washOp: op * sk, ink: null });
        });
        if (pf) pf(u, sw, V, head);
      };
    }
    spawnling(x, y, U, O);
  }
  // a hair-coloured band over the crown (under the redrawn frizz), so no outline from the hair cap shows through it
  function frizzBand(u, hcy, R, col) {
    const P = [], a0 = Math.PI * 1.06, a1 = Math.PI * 1.94;
    for (let i = 0; i <= 20; i++) { const a = lerp(a0, a1, i / 20); P.push([Math.cos(a) * R * 1.12, hcy + Math.sin(a) * R * 1.12]); }
    for (let i = 20; i >= 0; i--) { const a = lerp(a0, a1, i / 20); P.push([Math.cos(a) * R * .86, hcy + Math.sin(a) * R * .86]); }
    boilSeed('frizzband'); paint(P, { wash: col, ink: null });
  }
  // the top of his frizz (for smoke), and his head centre
  const headY = (y, o) => y + (o.dy || 0) * U * (o.dy < 0 ? 1 - clamp(o.sit || 0) : 1) - 10.85 * U + clamp(o.sit || 0) * 2.05 * U;
  const tipsY = (y, o) => headY(y, o) - (1.25 + .45 * (o.frizz || 0)) * 2.35 * U;
  const rockAt = (x, y, rot = 2.6, s = 1, key = 'droppedrock') => { boilSeed(key); push(); translate(x, y); rotate(rot); rockProp(U * s, 2.2); pop(); };
  // a straight arm pointed at us, foreshortened so its hand lands on (tx, ty) (front view, body frame); k shortens it more
  function straightTo(which, tx, ty, k = 1) {
    const sd = which === 'R' ? 1 : -1, sx = sd * 1.8 * U, sy = -7.75 * U, dx = (tx - sx) * sd, dy = -(ty - sy), D = Math.hypot(dx, dy) * k;
    return which === 'L' ? { aL: Math.atan2(dy, dx), bendL: 0, armKL: D / (3.6 * U) } : { aR: Math.atan2(dy, dx), bendR: 0, armKR: D / (3.6 * U) };
  }
  // The Chad. His AK rides on his back (over the body in the back view). o.finger: his near glove points a finger.
  const akBack = (u, sw) => { push(); translate(-.6 * u, -6.6 * u); rotate(-2.3); akProp(u, sw * .9, 0); pop(); };
  // a bare index finger pointing up out of his fist (hand hook: +x forward, -y up)
  const fingerUp = (u, sw) => paint(ribbon([[.05 * u, -.3 * u], [.12 * u, -1.15 * u]], .34 * u, .28 * u), { wash: SKIN.col, ink: PAL.ink, sw: sw * .6 });
  const fingerHook = (u, sw) => paint(ribbon([[.25 * u, -.12 * u], [1.0 * u, -.2 * u]], .36 * u, .28 * u), { wash: GLOVE, ink: PAL.ink, sw: sw * .6 });
  function chad(x, y, o = {}) {
    const back = o.view === 'back';
    geared(x, y, U, { ...feel('neutral', T, { emote: null }), ...o, boilKey: CH, seed: 2, noGun: true, rawArms: true, [back ? 'draw' : 'behind']: akBack, ...(o.finger ? { handL: fingerHook } : {}) });
  }
  // The owner's arm out of the door: shoulder sh (hidden behind the leaf), wrist w, two-bone IK; the glove points
  // ('point'), reaches open ('open') or grips ('grip', with o.held drawn under the fist).
  function ownerArm(sh, w, o = {}) {
    const L1 = 1.95 * U, L2 = 1.85 * U, dx = w[0] - sh[0], dy = w[1] - sh[1], D = Math.hypot(dx, dy), d = clamp(D, .2 * U, (L1 + L2) * .995);
    const th = Math.atan2(dy, dx), phi = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)) * (o.elbow ?? 1);
    const el = [sh[0] + Math.cos(th + phi) * L1, sh[1] + Math.sin(th + phi) * L1], wr = D > (L1 + L2) * .995 ? [sh[0] + Math.cos(th) * d, sh[1] + Math.sin(th) * d] : w;
    const fa = o.handAng ?? Math.atan2(wr[1] - el[1], wr[0] - el[0]), c = Math.cos(fa), s = Math.sin(fa), P = (f, g) => [wr[0] + c * f * U - s * g * U, wr[1] + s * f * U + c * g * U];
    boilSeed('ownerarm' + (o.key || ''));
    paint(limb(sh, el, wr, 1.15 * U, .95 * U), { wash: SLEEVE, ink: PAL.ink, sw: 1.3 });
    const cf = Math.atan2(wr[1] - el[1], wr[0] - el[0]), cc = Math.cos(cf), cs = Math.sin(cf);   // the knit cuff, across the forearm
    paint([[wr[0] - cc * .45 * U + cs * .52 * U, wr[1] - cs * .45 * U - cc * .52 * U], [wr[0] + cs * .5 * U, wr[1] - cc * .5 * U], [wr[0] - cs * .5 * U, wr[1] + cc * .5 * U], [wr[0] - cc * .45 * U - cs * .52 * U, wr[1] - cs * .45 * U + cc * .52 * U]], { wash: CUFF, ink: PAL.ink, sw: 1 });
    boilSeed('ownerglove' + (o.key || ''));
    if (o.mode === 'open') {
      for (let f = 0; f < 4; f++) { const g = (-.42 + f * .28), len = f === 1 || f === 2 ? .85 : .7; paint(ribbon([P(.55, g), P(.55 + len, g * 1.25)], .26 * U, .22 * U), { wash: GLOVE, ink: PAL.ink, sw: .9 }); }
      paint(ellPts(...P(.45, 0), .62 * U, .55 * U, 14, 0, fa), { wash: GLOVE, ink: PAL.ink, sw: 1.1 });
      paint(ribbon([P(.3, .45), P(.75, .8)], .26 * U, .2 * U), { wash: GLOVE, ink: PAL.ink, sw: .9 });   // thumb
    } else {
      if (o.held) o.held(P(.75, .1));
      if (o.mode !== 'grip') paint(ribbon([P(.75, -.2), P(1.55, -.25)], .3 * U, .24 * U), { wash: GLOVE, ink: PAL.ink, sw: .9 });   // the index finger
      paint(ellPts(...P(.5, 0), .6 * U, .52 * U, 14, 0, fa), { wash: GLOVE, ink: PAL.ink, sw: 1.1 });
      for (let k = 0; k < 3; k++) inkLine([P(.62, -.1 + k * .2), P(.98, -.05 + k * .2)], .7, '#2E2620', 'inkfine', 0);   // knuckles
    }
  }
  // The Chad's gloved hand on the keypad close-up (pointingHand's hand, with a hoodie sleeve that tapers to a knit cuff,
  // with fold creases, running off the lower right of the frame)
  function kGlove(tx, ty, s) {
    const a = .85, c = Math.cos(a), sn = Math.sin(a), u = 40 * s, sw = clamp(1.8 * s, .7, 3), col = GLOVE, P = (fx, fy) => [tx + c * fx * u - sn * fy * u, ty + sn * fx * u + c * fy * u];
    boilSeed('chadsleeve');
    paint(ribbon([P(3.3, .15), P(7, .3), P(14, .7)], 2.05 * u, 3.1 * u), { wash: SLEEVE, ink: PAL.ink, sw });
    for (const [f, k] of [[5.4, 0], [7.6, 1], [9.9, 2]]) inkLine([P(f, -1.0 - .1 * k), P(f + .35, -.2), P(f + .1, .5 + .1 * k)], sw * .55, mixCol(SLEEVE, PAL.ink, .45), 'inkfine', .5);   // folds
    paint([P(2.75, -1.1), P(3.75, -1.15), P(3.75, 1.25), P(2.75, 1.2)], { wash: CUFF, ink: PAL.ink, sw: sw * .8 });   // the knit cuff
    for (let k = 0; k < 5; k++) inkLine([P(2.85, -.9 + k * .48), P(3.65, -.9 + k * .48)], sw * .35, '#6E706C', 'inkfine', 0);
    boilSeed('chadglove');
    paint(ellPts(...P(2.15, .15), 1.15 * u, 1.0 * u, 18, 0, a), { wash: col, ink: PAL.ink, sw });   // the fist
    for (const k of [0, 1, 2]) inkLine([P(1.45 + k * .02, .35 + k * .32), P(1.9, .4 + k * .32)], sw * .5, mixCol(col, PAL.ink, .5), 'inkfine', 0);
    paint(ribbon([P(1.4, -.55), P(.55, -.42), P(.06, -.3)], .62 * u, .52 * u), { wash: col, ink: PAL.ink, sw: sw * .9 });   // the index finger
    paint(ellPts(...P(1.95, -.95), .42 * u, .3 * u, 12, 0, a + .5), { wash: col, ink: PAL.ink, sw: sw * .7 });   // thumb
  }
  // a big hand on the keypad close-up: the Naked's bare hand from the lower left, the Chad's glove from the lower right
  function kHand(tx, ty, o = {}) {
    if (o.glove) { kGlove(tx, ty, 2.6); return; }
    push(); translate(tx, ty); if (o.rot) rotate(o.rot); scale(-1, 1);
    pointingHand(0, 0, 2.4, { col: sootSkin(o.soot || 0), from: .8, key: 'nakedhand' });
    pop();
  }

  // ---------- the keypad close-up ----------
  function keypad(t, presses, o = {}) {
    staticSeed('kpbg'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: mixCol('#A9ADB1', '#B49A92', clamp(TOD) * .35), ink: null });
    wall(-300, W + 300, -500, 2300, null, { rowH: 430, brick: 820, lw: 1.4, soft: true, key: 'k' });
    const tp = typing(t, presses), state = o.state || 'locked';
    lockAt(KCX, KCY, KS, { digits: o.digits ?? tp.digits, press: tp.press, pressK: tp.pressK, state, pop: o.pop || 0 });
    // the fingertip: on a key while it's pressed, gliding to the next between presses, hovering above when up
    let i = presses.findIndex(([tq]) => tq > t); if (i < 0) i = presses.length;
    const kp = j => keyPos(KCX, KCY, KS, keyOf(presses[clamp(j, 0, presses.length - 1)][1]));
    let [x, y] = kp(i - 1);
    if (i > 0 && i < presses.length) { const k = ease(seg(t, presses[i - 1][0] + .1, presses[i][0] - .02)), q = kp(i); x = lerp(x, q[0], k); y = lerp(y, q[1], k); }
    if (i === 0) [x, y] = kp(0);
    const dip = tp.press >= 0 ? clamp(tp.pressK) : 0, fl = o.flourish ? (1 - dip) : 0;
    x += 34 * fl * Math.sin(t * 18); y += -44 * (1 - dip) + 8 * dip;
    if (o.away) { x += 220 * o.away * (o.glove ? 1 : -1); y += 320 * o.away; }
    if (!o.noHand) kHand(x + 6, y + 10, { glove: o.glove, soot: o.soot, rot: .12 * fl * Math.sin(t * 18 + 1) });
    dusk();
  }

  // ---------- S1: guesses (0–6) ----------
  // 1A wide: at the lock, rubbing his hands at chest height, the rock tucked under his arm, a sneaky grin
  function s1a(t, lt) {
    camBegin(WX, WY, WZ);
    set(t, { lock: 'locked' });
    const r = Math.sin(t * 16), O = { view: 'q', eyes: 'sly', lookX: .9, mouth: 'grin', dy: -.06 * Math.abs(r), sq: .02 * Math.abs(r) };
    Object.assign(O, reachArm(U, O, 'L', (2.05 + .1 * r) * U, (-6.75 - .22 * r) * U), reachArm(U, O, 'R', (2.3 - .1 * r) * U, (-6.95 + .22 * r) * U));
    O.under = (u, sw) => { push(); translate(-1.25 * u, -6.0 * u); rotate(-.25); rockProp(u * .8, sw); pop(); };
    naked(NA, G, O);
    dusk();
    camEnd();
  }
  function s1b(t, lt) { keypad(t, [[1.0, '0'], [1.25, '0'], [1.5, '0'], [1.75, '0']]); }
  // the jolt pose: his right finger still stuck to the keypad, the left arm (with the rock) thrown up stiff
  function joltPose(t, x, o = {}) {
    const f = Math.floor(t * 12) % 2, O = { view: 'front', eyes: 'x', mouth: 'teeth', dx: .1 * (f ? 1 : -1), aL: (o.armUp ?? .9) + .15 * f, bendL: -.25, aR: -1.0, bendR: .3, ...o };
    if (o.onLock !== false) Object.assign(O, reachArm(U, O, 'R', ...toBody(x, G, U, O, LOCK[0] - 8, LOCK[1] + 6)));
    return O;
  }
  // where the bolts run: lock → fingertip → elbow → shoulder → chest → hips → knees (never across the face)
  function bodyChain(x, O, big) {
    const hR = survivorHand(x, G, U, O, 'R'), sh = [x + 1.8 * U, G - 7.75 * U], el = [(hR[0] + sh[0]) / 2 + 8, (hR[1] + sh[1]) / 2 + 22];
    const C = [[LOCK[0], LOCK[1]], hR, el, sh, [x + .3 * U, G - 6.4 * U], [x - .2 * U, G - 4.8 * U], [x - .9 * U, G - 2.4 * U]];
    if (big) { const hL = survivorHand(x, G, U, O, 'L'); C.push([x - .95 * U, G - .5 * U]); return [C, [[x + .3 * U, G - 6.4 * U], [x - 1.8 * U, G - 7.75 * U], hL], [[x + .9 * U, G - 2.4 * U], [x - 1.4 * U, G - 5.8 * U], [x + 1.4 * U, G - 5.2 * U], [x + 1.0 * U, G - .8 * U], hL]]; }
    return [C, null, [[x + 1.2 * U, G - 6 * U], [x - 1.1 * U, G - 3.6 * U]]];
  }
  // 1C wide: ZAP (2.0–2.6, two flickers); his finger lets go (in-betweens), he stumbles a real step back, frizzed, lightly sooty
  function s1c(t, lt) {
    camBegin(WX, WY, WZ);
    const a = t - 2.0, flick = (a < .08) || (a >= .3 && a < .38);
    set(t, { lock: a < .8 ? 'error' : 'locked', digits: '0000' });
    const rel = ease(seg(t, 2.55, 2.72)), back = seg(t, 2.6, 3.0), nx = NA - 95 * easeOut(back);
    const soot = .35 * clamp(a / .3), frizz = .75 * clamp(a / .08);
    const J = joltPose(t, NA, { soot, frizz, hold: { L: 'rock' }, armUp: .5 });
    const dz = feel('dizzy', t), S = { aL: -.7 + .2 * Math.sin(t * 9), bendL: 1.0, aR: -.2 - .3 * Math.sin(t * 9), bendR: .5, armKL: 1, armKR: 1 };
    const O = { ...J };
    for (const k of ['aL', 'bendL', 'aR', 'bendR', 'armKL', 'armKR']) O[k] = lerp(J[k] ?? 1, S[k], rel);
    if (rel > 0) { O.dx = 0; O.eyes = rel < 1 ? 'wide' : 'swirl'; O.mouth = rel < 1 ? 'o' : 'wobble'; }
    if (back > 0) Object.assign(O, { walk: -back * 1.0, rot: -.12 * Math.sin(back * Math.PI) + (back >= 1 ? dz.rot * .5 : 0), emote: 'stars', emoteK: seg(t, 2.65, 2.85) });
    naked(nx, G, O);
    smoke(nx, tipsY(G, O), .9, t - 2.3, 'z1');
    if (a < .55) { const [C, , aura] = bodyChain(NA, J, false); zapChain(t, C, aura, false); }
    dusk();
    camEnd();
    if (flick) flash(.2, '#DDF4FF');
  }
  // 1D reaction close-up: thinking (eyes up, finger on chin, three white dots), the lightbulb (3.6), a smug grin with
  // waggling brows
  const R1 = NA - 95;
  function s1d(t, lt) {
    const hy = G - 10.85 * U, Z = 3.0;
    camBegin(R1 + 40 / Z, hy + 100 / Z, Z);   // his head at about (500, 860) on screen
    set(t);
    const idea = t >= 3.6, waggle = Math.floor(t * 7) % 2;
    const O = { soot: .35, frizz: .6, view: 'front', hold: { L: 'rock' }, aR: -1.2, bendR: .3, aL: -1.05, bendL: 1.45 };
    if (!idea) Object.assign(O, { eyes: 'look', lookX: .35, lookY: -.9, mouth: 'flat' }, reachArm(U, O, 'R', .45 * U, -9.15 * U));   // fist on chin, eyes up
    else Object.assign(O, { eyes: t < 3.8 ? 'shine' : waggle ? 'sly' : 'happy', lookX: .01, mouth: 'grin', dy: -.3 * Math.exp(-(t - 3.6) * 8), aR: 1.2, bendR: .75, handR: fingerUp });   // eureka finger up at the bulb, then smug
    naked(R1, G, O);
    smoke(R1 - 10, tipsY(G, O), .7, t - 2.3, 'z1');
    const hx = R1, hc = headY(G, O);
    if (!idea) for (let i = 0; i < 3; i++) { const k = backOut(seg(t, 3.12 + i * .13, 3.22 + i * .13)); if (k > .02) { boilSeed('thinkdot' + i); paint(ellPts(hx + 100 + i * 30, hc - (118 + i * 28), (6 + i * 2.2) * k, (6 + i * 2.2) * k, 12), { wash: '#FBF7EE', ink: PAL.ink, sw: .5 }); } }
    else emote('bulb', hx + 112, hc - 100, U * .7, seg(t, 3.6, 3.75), t - 3.6);
    dusk();
    camEnd();
  }
  function s1e(t, lt) { keypad(t, [[4.0, '6'], [4.25, '9'], [4.5, '6'], [4.75, '9']], { flourish: true, soot: .35 }); }
  // 1F wide: the big zap with the x-ray (5.0, 5.5); blasted back on an arc, he lands on his butt with his legs out
  // (5.75), squashes, raises dust; his rock spins off on its own arc; charred ash-grey and smoking, frizzed, blinking
  function s1f(t, lt) {
    camBegin(WX, WY, WZ);
    const a = t - 5.0, skel = a < .17 || (a >= .5 && a < .58);
    set(t, { lock: a < .9 ? 'error' : 'locked', digits: '6969' });
    const J = joltPose(t, NA, { soot: lerp(.35, .7, clamp(a / .5)), frizz: 1, hold: { L: 'rock' }, armUp: 1.05 });
    if (a < .6) {
      if (skel) { xrayDark(WX, WY); skeleton(NA, G, U, { ...J, key: 'x1', jaw: .3 }); }
      else naked(NA, G, J);
      const [C, C2, aura] = bodyChain(NA, J, true); zapChain(t, C, aura, true); zapChain(t + .5, C2, [], true);
    } else {
      const k = seg(a, .6, .75), land = a >= .75, p = arcPt([NA, G], [NX, G], 110, k), age = a - .75;
      const O = { view: 'q', soot: .9, frizz: 1, sit: land ? 1 : ease(k), legsOut: true, hold: {}, dy: SEAT * (land ? 1 : ease(k)), noShadow: true };
      if (!land) Object.assign(O, { eyes: 'x', mouth: 'o', rot: -.3 * Math.sin(k * Math.PI), aL: 2.3, bendL: .3, aR: 2.0, bendR: .3 });
      else Object.assign(O, { eyes: (a > .95 && a < 1.0) || (a > 1.08 && a < 1.13) ? 'closed' : 'normal', lookX: .3, mouth: 'o', sq: .2 * Math.exp(-age * 9) * Math.cos(age * 20), aL: -1.0 - .3 * clamp(age / .15), bendL: .4, aR: -.9, bendR: .4 });
      seatShadow(p[0], land ? 1 : .4 + .6 * k);
      naked(p[0], p[1], O);
      if (land) dust(NX - 10, G - 6, 44, age, 'land');
      smoke(p[0] - 6, tipsY(p[1], O), 1.1, a - .62, 'z2');
      // the rock leaves his raised hand and spins off on its own arc, landing beside him
      const h0 = survivorHand(NA, G, U, J, 'L'), rl = seg(a, .6, .97), rk = 1 - (1 - rl) * (1 - rl) * .6 - (1 - rl) * .4, q = arcPt(h0, RK, 430, rk); q[0] -= 40 * Math.sin(rk * Math.PI);
      rockAt(q[0], q[1], 2.6 * rk + 9 * rk * (1 - rk));
      if (a >= .97) dust(RK[0], RK[1], 22, a - .97, 'rockland', .5);
    }
    dusk();
    camEnd();
  }

  // ---------- S2: the owner (6–13) ----------
  // the contact shadow under someone sitting on the ground with legs out (q view, facing right)
  const seatShadow = (x, k = 1) => { staticSeed('seatshadow'); paint(ellPts(x + 1.5 * U, G + 3, 3.4 * U * k, .42 * U * k, 20), { fill: PAL.ink, fillOp: 90 * k, bleed: .25, tex: .3, border: .1, ink: null }); };
  // the charred Naked, sitting slumped where the zap dropped him (q view, legs out), smoking
  const charred = (t, o = {}) => ({ view: 'q', soot: .9, frizz: 1, sit: 1, legsOut: true, dy: SEAT, noShadow: true, eyes: 'sleepy', mouth: 'flat', rot: .05, aL: -1.25, bendL: .25, aR: -1.05, bendR: .35, ...o });
  // the dropped jaw: a long dark mouth hanging open through the beard, on the turned head (face hook)
  const jawFace = k => (u, sw, V, head) => { const m = head.pt(0, .6, .97), h = (.25 + .62 * k) * u; boilSeed('jaw'); paint(ellPts(m[0], m[1] + h * .5, .36 * u, h * .6 + .12 * u, 16), { wash: '#4A1F2A', ink: PAL.ink, sw: sw * .6 }); };
  // 2A wide: he sits charred in the left foreground; the Chad walks in past him to the lock without a glance and
  // raises a finger to the keypad (7.75)
  function s2a(t, lt) {
    camBegin(WX, WY, WZ);
    set(t);
    const k = seg(t, 6.0, 7.5), cx = lerp(880, 465, k);
    const N = charred(t, { lookX: .7 });
    seatShadow(NX); naked(NX, G, N); rockAt(...RK);
    smoke(NX - 6, tipsY(G, N), 1.1, t - 5.62, 'z2');
    const O = { view: 'q', flip: true, walk: k < 1 ? (t - 6) * 1.0 : 0, aL: -1.3, aR: -1.3 + .08 * Math.sin((t - 6) * TAU), dy: k < 1 ? -.15 * Math.abs(Math.sin((t - 6) * TAU)) : 0 };
    const rk = ease(seg(t, 7.55, 7.8));
    if (rk > 0) { const R = reachArm(U, O, 'L', ...toBody(cx, G, U, O, LOCK[0] + 30, LOCK[1] - 2)); O.aL = lerp(-1.3, R.aL, rk); O.bendL = lerp(.2, R.bendL, rk); O.armKL = lerp(1, R.armKL, rk); O.finger = true; }
    chad(cx, G, O);
    dusk();
    camEnd();
  }
  // 2B keypad: the Chad's glove presses 1, 2, 3, 4 on the beat; at 10.0 the LED turns green with a glow pop (the chirp)
  function s2b(t, lt) { keypad(t, [[8.0, '1'], [8.5, '2'], [9.0, '3'], [9.5, '4']], { glove: true, state: t >= 10 ? 'open' : null, pop: t >= 10 ? Math.exp(-(t - 10) * 5) : 0, away: ease(seg(t, 10.08, 10.25)) * .4 }); }
  // 2C reaction close-up (chest up): his eyes go wide (10.3), the jaw drops on the slide whistle (10.42–10.72) and
  // lands on the thunk; a pale flake of ash drifts down from his singed hair
  function s2c(t, lt) {
    const Z = 3.4, hy = headY(G, { sit: 1, dy: SEAT });
    camBegin(NX + 2, hy + 140 / Z, Z);
    set(t, { lock: 'open' });
    const drop = ease(seg(t, 10.42, 10.72)), bump = t > 10.72 ? .1 * Math.exp(-(t - 10.72) * 10) * Math.sin((t - 10.72) * 40) : 0;
    const N = charred(t, { eyes: t < 10.3 ? 'normal' : 'wide', lookX: .6, mouth: drop > .05 ? null : 'o', rot: .02, dy: SEAT + .12 * drop });
    if (drop > .05) N.face = jawFace(drop + bump);
    seatShadow(NX); naked(NX, G, N); rockAt(...RK);
    smoke(NX - 6, tipsY(G, N), 1.1, t - 5.62, 'z2');
    if (t > 10.45) { const k = seg(t, 10.45, 11.0); boilSeed('ash'); paint(ellPts(NX - 30 + 14 * Math.sin(k * 8), hy - 2.9 * U + k * 150, 8, 5, 8, 1, Math.sin(k * 9)), { wash: '#E8E4E0', ink: '#8E8A90', sw: .5 }); }
    dusk();
    camEnd();
  }
  // 2D wide: the Chad turns (two in-betweens), pushes the latch plate (11.2), the door swings in on a warm room; he walks
  // in and away into the dark (12.0–12.35), the door shuts (12.5, CLANG) and the lock goes red
  function s2d(t, lt) {
    camBegin(WX, WY, WZ);
    const open = ease(seg(t, 11.2, 11.5)) * (1 - ease(seg(t, 12.3, 12.5)));
    const inK = seg(t, 11.65, 12.45), stepK = seg(t, 11.0, 11.22);
    const cx = lerp(465, 552, ease(stepK)), view = t < 11.08 ? 'q' : t < 11.16 ? 'side' : 'back';
    const O = { view, flip: view !== 'back', aL: -1.3, aR: -1.3, walk: stepK > 0 && stepK < 1 ? (t - 11.0) * 3 : inK > 0 ? (t - 11.65) * 1.4 : 0 };
    if (t < 11.08) { const k = 1 - ease(seg(t, 11.0, 11.08)), R = reachArm(U, O, 'L', ...toBody(465, G, U, O, LOCK[0] + 30, LOCK[1] - 2)); O.aL = lerp(-1.3, R.aL, k); O.bendL = lerp(.2, R.bendL, k); O.armKL = lerp(1, R.armKL, k); O.finger = k > .3; }
    else if (t < 11.5) { const k = ease(seg(t, 11.12, 11.2)) * (1 - ease(seg(t, 11.36, 11.5))), pl = plateAt(Math.min(open, .1)), R = reachArm(U, O, 'L', ...toBody(cx, G, U, O, pl[0], pl[1])); O.aL = lerp(-1.3, R.aL, k); O.bendL = lerp(.2, R.bendL, k); O.armKL = lerp(1, R.armKL, k); }
    const drawChad = () => chad(cx + 6 * inK, G - 14 * inK, { ...O, sx: 1 - .15 * inK, sy: 1 - .15 * inK, noShadow: inK > 0 });
    set(t, { open, lock: t < 12.5 ? 'open' : 'locked', shade: 170 * inK, inside: inK > 0 && t < 12.5 ? drawChad : null });
    const N = charred(t, { eyes: 'wide', lookX: .8, mouth: null, rot: .02, face: jawFace(1) });
    seatShadow(NX); naked(NX, G, N); rockAt(...RK);
    smoke(NX - 6, tipsY(G, N), 1.1, t - 5.62, 'z2');
    if (inK <= 0) drawChad();
    dusk();
    camEnd();
  }

  // ---------- S3: dramatic irony (13–24) ----------
  // 3A a little wider: he gets up, grabs his rock and dusts the soot off (puffs where his hand pats), tucks the rock
  // under his arm, smirks at us and cracks his knuckles (15.0). Behind him the door opens a crack (13.6): the Chad's
  // eyes peer out of the dark gap, his arm reaches out to the lock and re-keys it with four taps, and withdraws; the
  // door shuts (15.4). He notices nothing.
  const X3 = 364, Y3 = 1049, Z3 = 1.12;
  function s3a(t, lt) {
    camBegin(X3, Y3, Z3);
    const crack = ease(seg(t, 13.6, 13.8)) * (1 - ease(seg(t, 15.2, 15.4))), open = .15 * crack;
    const reach = ease(seg(t, 13.8, 14.0)) * (1 - ease(seg(t, 14.85, 15.1)));
    const taps = [14.0, 14.25, 14.5, 14.75], tapK = taps.reduce((m, tq) => Math.max(m, t >= tq && t < tq + .14 ? Math.sin((t - tq) / .14 * Math.PI) : 0), 0);
    const tapKey = [4, 2, 7, 0][taps.filter(tq => t >= tq).length - 1] ?? -1;
    set(t, {
      open, dark: true, lock: 'locked', press: tapK > .1 ? tapKey : -1, pressK: tapK,
      inside: gx1 => { if (crack > .5) { boilSeed('gapeyes'); const look = ease(seg(t, 13.85, 14.0)); for (const sd of [-1, 1]) { const ex = DOOR[0] + (gx1 - DOOR[0]) * .55 + sd * 9, ey = G - 10.9 * U; glow(ex, ey, 22, '#FFF2C4', .6); paint(ellPts(ex, ey, 5, 4.2, 8), { wash: '#F2E6D0', ink: null }); paint(ellPts(ex - 2.2 * look, ey + 1.2 * look, 2.2, 2.4, 6), { wash: PAL.ink, ink: null }); } } },
      gap: gx1 => { if (reach > 0) { const sh = [gx1 + 24, LOCK[1] - 34], tip = [lerp(gx1 + 60, LOCK[0] + 6, reach) - 3 * tapK, LOCK[1] + 6 + 4 * tapK]; ownerArm(sh, [tip[0] + 1.5 * U, tip[1] + .25 * U], { mode: 'point', handAng: Math.PI + .05, key: '3a', elbow: -1 }); } },
    });
    // him: up (13.0–13.4), the rock into his left hand; dusting with the right (13.4–14.5); rock under the arm (14.55);
    // the smirk (14.65); knuckles (15.0–15.45)
    const up = ease(seg(t, 13.0, 13.4)), dk = ease(seg(t, 13.2, 14.6)), soot = lerp(.9, .2, dk), frizz = lerp(1, .25, dk);
    const O = { view: 'front', soot, frizz, crouch: 1 - up, aL: -1.15, bendL: .35, aR: -1.15, bendR: .35, eyes: 'closed', mouth: 'smile' };
    if (t < 13.3) { Object.assign(O, reachArm(U, O, 'L', ...toBody(NX, G, U, O, RK[0] + 12, RK[1] - 16))); if (t >= 13.22) O.hold = { L: 'rock' }; }
    else if (t < 14.55) O.hold = { L: 'rock' };
    const rockUnder = (u, sw) => { push(); translate(-1.35 * u, -6.5 * u); rotate(.4); scale(-1, 1); rockProp(u * .8, sw); pop(); };
    if (t < 13.22) rockAt(...RK);
    const pats = [13.2, 13.5, 13.8, 14.1, 14.4], spots = [[.7, -6.9], [-.3, -5.7], [.9, -3.6], [-1.3, -7.3], [.4, -6.0]];
    let pi = -1; for (let i = 0; i < pats.length; i++) if (t >= pats[i] - .15) pi = i;
    if (t >= 13.3 && t < 14.6 && pi >= 0) {   // the right hand pats each spot, landing on the puff
      const tp = pats[pi], hit = 1 - Math.abs(clamp((t - tp) / .15, -1, 1)), [sx, sy] = spots[pi];
      Object.assign(O, reachArm(U, O, 'R', (sx + .35 - .35 * hit) * U, (sy - .6 * (1 - hit)) * U));
      Object.assign(O, reachArm(U, O, 'L', (-1.9 - .15 * Math.sin(t * 20)) * U, (-5.2 + .2 * Math.sin(t * 20)) * U));
    }
    if (t >= 14.55) {
      O.under = rockUnder; O.eyes = t < 14.65 ? 'closed' : 'sly'; O.lookX = .01; O.mouth = 'grin';
      const cr = [15.0, 15.13, 15.26].reduce((m, tq) => Math.max(m, t >= tq && t < tq + .12 ? 1 - (t - tq) / .12 : 0), 0), push_ = ease(seg(t, 14.75, 15.0));
      if (t >= 14.7) {   // fingers interlaced at the chest, pushed out on each crack
        const hy = lerp(-6.6, -6.2, cr) * U;
        if (push_ < 1) Object.assign(O, reachArm(U, O, 'L', lerp(-1.9, -.35, push_) * U, lerp(-5.4, -6.6, push_) * U), reachArm(U, O, 'R', lerp(1.9, .35, push_) * U, lerp(-5.4, -6.6, push_) * U));
        else Object.assign(O, straightTo('L', -.12 * U, hy, 1 - .12 * cr), straightTo('R', .12 * U, hy, 1 - .12 * cr), { sq: .05 * cr });
        O.draw = (u, sw) => { if (push_ < .9) return; boilSeed('interlace'); for (let f = 0; f < 4; f++) inkLine([[(-.45 + f * .3) * u, hy - .35 * u], [(-.3 + f * .3) * u, hy + .3 * u]], sw * .45, mixCol(SKIN.dk, PAL.ink, .5), 'inkfine', 0); if (cr > .2) for (const a of [-2.6, -1.6, -.5]) inkLine([[Math.cos(a) * .9 * u, hy + Math.sin(a) * .9 * u], [Math.cos(a) * 1.45 * u, hy + Math.sin(a) * 1.45 * u]], sw * .8, '#FFF6DA', 'ink', 0); };
      }
    }
    naked(NX, G, O);
    for (let i = 0; i < pats.length; i++) { const [sx, sy] = spots[i]; dust(NX + sx * U, G + sy * U, 26, t - pats[i], 'soot' + i); }
    if (t < 14.2) smoke(NX, tipsY(G, O), 1.0, t - 5.62, 'z2', { op: 170 * (1 - seg(t, 13.6, 14.2)) });
    dusk();
    camEnd();
  }
  // 3B keypad: he types 1-2-3-4 fast (amber while he types), a beat of silence, then the LED flashes red with a halo
  // and "1234" blinks (16.9)
  function s3b(t, lt) { keypad(t, [[16.0, '1'], [16.15, '2'], [16.3, '3'], [16.45, '4']], { flourish: true, soot: .2, state: t >= 16.9 ? 'error' : null, pop: t >= 16.9 ? .8 * Math.exp(-(t - 16.9) * 8) : 0 }); }
  // 3C reaction close-up (chest up): his confident grin freezes, the eyes slowly widen, a sweat drop, the grin wobbles
  // into a frown
  function s3c(t, lt) {
    const Z = 3.1, hy = G - 10.85 * U;
    camBegin(NA + 40, hy + 100 / Z, Z);
    set(t, { lock: 'error', digits: '1234' });
    const w = seg(t, 17.2, 17.55), O = { view: 'q', soot: .2, frizz: .25, hold: { L: 'rock' }, aL: -.3, bendL: 1.1, aR: -1.2, bendR: .3, lookX: .7 };
    Object.assign(O, t < 17.2 ? { eyes: 'narrow', mouth: 'grin' } : t < 17.42 ? { eyes: 'normal', mouth: 'grin' } : t < 17.6 ? { eyes: 'wide', mouth: 'wobble' } : { eyes: 'wide', mouth: 'frown' });
    O.sy = 1 + .03 * w; O.dy = -.15 * w;
    naked(NA, G, O);
    const hc = headY(G, O);
    if (t > 17.35) { const k = seg(t, 17.35, 17.75); emote('sweat', NA + 2.6 * U, hc - 1.5 * U + 30 * k, U * .45, seg(t, 17.35, 17.45), t - 17.35); }
    dusk();
    camEnd();
  }
  // 3D wide: the MEGA ZAP. A web of bolts from the lock, the x-ray (17.75, 18.4); he's launched up and out to the left
  // on one arc with speed lines (18.25–18.6); his rock spins in the air and lands at the door's foot (19.4)
  function s3d(t, lt) {
    camBegin(WX, WY, WZ);
    const a = t - 17.75, skel = (a < .17) || (t >= 18.4 && t < 18.48);
    set(t, { lock: t < 18.7 ? 'error' : 'locked', digits: '1234' });
    if (skel) xrayDark(WX, WY);
    const J = joltPose(t, NA, { soot: lerp(.2, .8, clamp(a / .4)), frizz: 1, hold: { L: 'rock' }, armUp: 1.1, eyes: 'x' });
    if (t < 18.25) {
      if (skel) skeleton(NA, G, U, { ...J, key: 'x2', jaw: .4 }); else naked(NA, G, J);
      const [C, C2, aura] = bodyChain(NA, J, true);
      zapChain(t, C, aura, true); zapChain(t + .5, C2, [], true);
      const f = Math.floor(t * 12);
      for (let i = 0; i < 3; i++) { const an = -2.2 + i * .9 + .3 * hash(f + i); bolt(LOCK[0], LOCK[1], LOCK[0] + Math.cos(an) * 120, LOCK[1] + Math.sin(an) * 120, 90 + i + f * 4, { w: .7, forks: 2 }); }   // the lock crackles
    } else {
      dust(NA, G - 6, 50, t - 18.25, 'blast', .6);
      if (!skel) puff(NA, G - 6 * U, 54, t - 18.25, { col: '#CFCBD3', noInk: true, life: .6, key: 'launchsmoke', n: 6, rise: .8 });
      const k = seg(t, 18.25, 18.72);
      if (k < 1) {   // launched: one arc up and out to the top left, spinning, at a steady size
        const c = arcPt([NA, G - 6.5 * U], [200, -380], 200, easeIn(k) * .35 + k * .65), rot = k * 6, p = [c[0] - 6.5 * U * Math.sin(rot), c[1] + 6.5 * U * Math.cos(rot)];   // it spins round his middle
        const vx = -45, vy = -1433, vl = Math.hypot(vx, vy);
        boilSeed('speed');
        for (let i = 0; i < 5; i++) { const off = (i - 2) * 22, L = 130 + 40 * hash(i), bx = c[0] - vy / vl * off - vx / vl * 90, by = c[1] + vx / vl * off - vy / vl * 90; inkLine([[bx, by], [bx - vx / vl * L, by - vy / vl * L]], 1.4, '#F4EEE6', 'ink', 0); }
        const O = { view: 'front', soot: .9, frizz: 1, eyes: 'x', mouth: 'o', rot, aL: 1.3, bendL: .1, aR: 1.2, bendR: .2, liftL: .6, liftR: .3, noShadow: true };
        if (skel) skeleton(p[0], p[1], U, { ...O, key: 'x3', jaw: .5 }); else naked(p[0], p[1], O);
      }
    }
    // the rock: it leaves his raised hand in the blast, spins up and lands at the door's foot
    if (t >= 18.25) {
      const h0 = survivorHand(NA, G, U, J, 'L'), k = seg(t, 18.25, 19.4), p = arcPt(h0, RD, 420, k);
      rockAt(p[0], p[1], t < 19.4 ? k * 14 : .3, 1, 'megarock');
      if (t >= 19.4) dust(RD[0], RD[1] + 10, 28, t - 19.4, 'thunk', .6);
    }
    dusk();
    camEnd();
  }
  // 3E medium on the door's foot: it opens a crack (20.2); low in the dark gap his eyes look down at the rock; his
  // arm reaches out from behind the door's edge, grabs it (21.0) and pulls it back in behind the door; it shuts (21.8)
  function s3e(t, lt) {
    const Z = 2.3;
    camBegin(460, G - 90 / Z, Z);
    const open = ease(seg(t, 20.2, 20.45)) * (1 - ease(seg(t, 21.6, 21.8))) * .25;
    const out = ease(seg(t, 20.5, 20.9)), back = ease(seg(t, 21.05, 21.5)), has = t >= 20.98;
    set(t, {
      open, dark: true, lock: 'locked',
      inside: gx1 => { if (open > .1) { boilSeed('gapeyes3'); const look = ease(seg(t, 20.45, 20.7)); for (const sd of [-1, 1]) { const ex = DOOR[0] + (gx1 - DOOR[0]) * .6 + sd * 10, ey = G - 7.6 * U; glow(ex, ey, 22, '#FFF2C4', .6); paint(ellPts(ex, ey, 6, 5, 8), { wash: '#F2E6D0', ink: null }); paint(ellPts(ex - 1.2 * look, ey + 2.6 * look, 2.6, 2.6, 6), { wash: PAL.ink, ink: null }); } } },
      gap: gx1 => {
        if (out > 0 && back < 1) {
          const sh = [gx1 + 40, G - 6.4 * U], grab = [RD[0] + 4, RD[1] - 30], inside = [gx1 + 70, G - 3.2 * U];
          const w = back > 0 ? [lerp(grab[0], inside[0], back), lerp(grab[1], inside[1], back)] : [lerp(inside[0], grab[0], out), lerp(inside[1], grab[1], out)];
          ownerArm(sh, w, { mode: has ? 'grip' : 'open', handAng: Math.PI / 2 + .25, key: '3e', elbow: 1, held: has ? p => rockAt(p[0] - 30, p[1] - 4, .3, 1, 'megarock') : null });
        }
      },
    });
    if (!has) rockAt(RD[0], RD[1], .3, 1, 'megarock');
    dusk();
    camEnd();
  }
  // 3F medium on the empty ground at the door's foot: his sooty, smoking hand creeps in from the lower left, feels for
  // the rock and pats the empty ground twice (22.8, 23.2)
  function s3f(t, lt) {
    const Z = 2.6;
    camBegin(430, G - 60 / Z, Z);
    set(t, { lock: 'locked' });
    const inK = easeOut(seg(t, 22.5, 22.68)), lift = [22.8, 23.2].reduce((m, tp) => Math.max(m, easeOut(seg(t, tp - .2, tp - .08)) * (1 - Math.pow(seg(t, tp - .05, tp), 2))), 0);   // lift high, hang, slap down
    const slap1 = t - 22.8, slap2 = t - 23.2, sq = Math.max(t >= 22.8 ? Math.exp(-slap1 * 12) : 0, t >= 23.2 ? Math.exp(-slap2 * 12) : 0);
    const wx = lerp(240, 400, inK) + 8 * Math.sin(t * 3) * seg(t, 23.3, 23.6), wy = G + 22 - 30 * lift;
    const ch = sootSkin(.9), dk = mixCol(SKIN.dk, '#4A484E', .3), sw = 1.3;
    // the arm: thin, from below the frame's lower-left corner to the wrist
    boilSeed('chararm'); paint(ribbon([[160, G + 240], [wx - 70, wy + 30], [wx - 8, wy + 4]], 1.0 * U, .8 * U), { wash: ch, ink: PAL.ink, sw });
    for (let i = 0; i < 3; i++) { boilSeed('armsoot' + i); paint(ellPts(wx - 50 - i * 34, wy + 26 + i * 22, 9, 5, 9, 2), { wash: '#3E3D43', washOp: 120, ink: null }); }
    // the hand, palm down: the back of the hand, four fingers spread toward the door, the thumb tucked in
    boilSeed('charhand');
    push(); translate(wx, wy); rotate(-.32 - .35 * lift); scale(1 + .18 * sq, 1 - .22 * sq + .1 * lift);
    for (let f = 0; f < 4; f++) { const fy = (-.48 + f * .32) * U, len = (f === 1 || f === 2 ? .95 : .8) * U * (1 - .55 * lift); paint(rrPts(.5 * U, fy - .13 * U, len + .2 * U, .27 * U, .13 * U), { wash: ch, ink: PAL.ink, sw: sw * .7 }); }
    paint(rrPts(-.45 * U, -.62 * U, 1.15 * U, 1.18 * U, .4 * U), { wash: ch, ink: PAL.ink, sw });
    paint(ribbon([[.05 * U, -.5 * U], [.45 * U, -.85 * U]], .3 * U, .24 * U), { wash: ch, ink: PAL.ink, sw: sw * .7 });   // thumb
    paint(ellPts(.1 * U, .05 * U, .3 * U, .2 * U, 9, 2), { wash: '#3E3D43', washOp: 110, ink: null });   // soot on the back of the hand
    for (let f = 0; f < 3; f++) inkLine([[.42 * U, (-.32 + f * .32) * U], [.55 * U, (-.32 + f * .32) * U]], .6, dk, 'inkfine', 0);   // knuckles
    pop();
    for (const [age, k] of [[slap1, 'pat1'], [slap2, 'pat2']]) if (age >= 0 && age < .12) for (const a of [-2.4, -1.6, -.8]) { boilSeed('slap' + k + a); inkLine([[wx + 30 + Math.cos(a) * 72, wy + Math.sin(a) * 52], [wx + 30 + Math.cos(a) * 98, wy + Math.sin(a) * 72]], .9, '#F4EEE2', 'ink', 0); }
    for (const [age, k] of [[slap1, 'pat1'], [slap2, 'pat2']]) puff(wx + 30, wy + 18, 15, age, { col: '#D9CFBC', noInk: true, life: .4, key: k, rise: .3, n: 6 });
    smoke(wx - 10, wy - 34, .55, t - 22.5, 'hand', { op: 140, life: 1.3 });
    dusk();
    camEnd();
  }
  shots([[0, s1a], [1, s1b], [2, s1c], [3, s1d], [4, s1e], [5, s1f], [6, s2a], [8, s2b], [10.25, s2c], [11, s2d], [13, s3a], [16, s3b], [17, s3c], [17.75, s3d], [20, s3e], [22.5, s3f]]);
})();
