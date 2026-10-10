// cast.js: the Overwatch cast, all Clawds in hero costume, plus their effects.
//   mercy(x, y, u, o)   our Clawd: winged gold headpiece, wings (o.wing 0 folded → 1 Valkyrie), Caduceus staff (o.staffTilt swings it)
//   rein(x, y, u, o)    steel helmet with crest, rocket hammer (o.hammer pose), barrier via barrier()
//   tracer(x, y, u, o)  spiky hair, amber goggles, glowing chronal disc; blinks via blinkTrail()
//   genji(x, y, u, o)   silver faceplate, dark visor with green eyes; o.blade 0..1 draws the glowing sword
//   cowboy(x, y, u, o)  the enemy: wide hat (o.hatTip 0 down → 1 up), red serape, cigar, revolver (o.fire 0..1 flash)
// Every wrapper takes the usual clawd() options (spread feel()/emotions()/move() into o) and draws with the same pose.
// Body-local front-view space: body x -5u..5u, y -8u..-2u; eyes (±2.5u, -6u); mouth (0, -4.3u); arm pivots (±4.9u, -4.5u).

const OW = {
  gold: '#F2C14E', goldDk: '#C98E26', goldLt: '#FFE7A3', white: '#FFF8EC', beam: '#FFD84D',
  steel: '#9AA5B1', steelDk: '#66717E', steelLt: '#D5DCE3', shield: '#7FD3F2',
  orange: '#EF8F3E', orangeDk: '#B85E1E', orangeLt: '#FFC08A', hair: '#6B4127', amber: '#FFB43C', chrono: '#9FEAFF',
  silver: '#D3D9E0', silverDk: '#8F99A5', silverLt: '#F4F6F8', visor: '#27303C', neon: '#8CF06A',
  cowboy: '#A4503D', cowboyDk: '#6E2E22', cowboyLt: '#D88A6E', hat: '#6B4A2E', hatDk: '#45301E', serape: '#C23B3B',
  call: '#E8505B', skull: '#E0283F',
};
const U = (u, pts) => pts.map(([a, b]) => [a * u, b * u]);

// ---------- pose geometry: where a body-local point lands in the world (matches clawd()'s transform) ----------
function bodyToWorld(x, y, u, o, lx, ly) {
  const sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
  const fx = (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6) * (1 + sm * .35), fy = (o.sy ?? 1) * (1 - sq);
  const px = lx * fx, py = ly * fy, r = o.rot || 0, c = Math.cos(r), s = Math.sin(r);
  return [x + (o.dx || 0) * u + px * c - py * s, y + (o.dy || 0) * u + px * s + py * c];
}
// Body-local position of an arm tip (which = 'L' | 'R'), for the pose's view and arm angle.
function armTipLocal(u, o, which) {
  const V = VIEWS[o.view] || VIEWS.front, A = V.arms.find(a => a[2] === which);
  if (!A) return [0, -4.5 * u];
  const [px, dir] = A, a = which === 'L' ? (o.aL ?? .2) : (o.aR ?? .2);
  if (dir === 0) { const th = .7 - a; return [px * u + 2.1 * u * Math.cos(th), -4.2 * u + 2.1 * u * Math.sin(th)]; }
  const root = (px + dir * .55 * clamp((Math.abs(a) - .7) / .9)) * u, th = dir < 0 ? a : -a, L = dir * 2.2 * u;
  return [root + L * Math.cos(th), -4.5 * u + L * Math.sin(th)];
}
const armTip = (x, y, u, o, which) => bodyToWorld(x, y, u, o, ...armTipLocal(u, o, which));
// which arm is the near (front) one for a view: the staff, sword and gun go there
const nearArm = o => (o.view === 'q' || o.view === 'side') ? 'L' : 'R';
function holdIn(o, which, fn) { return which === 'L' ? { armL: fn } : { armR: fn }; }

// ---------- Mercy ----------
// Wings in body-local space. k: 0 folded (small, pointing up and back) → 1 Valkyrie (a huge golden fan). flap: radians.
function mercyWings(u, sw, k, flap = 0) {
  for (const s of [-1, 1]) for (let i = 4; i >= 0; i--) {
    const a0 = .28 + i * .13, a1 = .55 + i * .34, ang = s * (lerp(a0, a1, k) + flap * (1 - i * .12));
    const len = lerp(4.8 - i * .45, 10.5 - i * 1.0, k) * u, wd = lerp(1.25, 1.7, k) * u;
    const rx = s * 3.2 * u, ry = -6.6 * u, tx = rx + Math.sin(ang) * len, ty = ry - Math.cos(ang) * len;
    const mx = (rx + tx) / 2 + Math.cos(ang) * s * .25 * u, my = (ry + ty) / 2 + Math.sin(ang) * s * .25 * u;
    const col = mixCol(OW.white, OW.gold, .25 + .6 * k + .08 * i);
    paint(ribbon([[rx, ry], [mx, my], [tx, ty]], wd, wd * .18), { wash: col, ink: PAL.ink, sw: sw * .7 });
    inkLine([[rx + (tx - rx) * .2, ry + (ty - ry) * .2], [rx + (tx - rx) * .82, ry + (ty - ry) * .82]], sw * .45, mixCol(OW.goldDk, PAL.ink, .2), 'inkfine', 0);
  }
}
function mercyHeadpiece(u, sw, V) {
  const cx = V && V.face ? V.face.cx * u * .6 : 0;
  // gold band along the top edge, two little swept wings at the temples, a hovering halo ring
  paint(rectPts(-4.6 * u + cx, -8.55 * u, 9.2 * u, .75 * u, u * .03), { wash: OW.gold, ink: PAL.ink, sw: sw * .6 });
  for (const s of [-1, 1]) paint(U(u, [[s * 4.2 + cx / u, -8.2], [s * 6.2 + cx / u, -10.3], [s * 5.6 + cx / u, -8.9], [s * 6.0 + cx / u, -8.6], [s * 4.9 + cx / u, -7.9]]), { wash: OW.white, fill: OW.gold, fillOp: 0, ink: PAL.ink, sw: sw * .55 });
  paint(ellPts(cx, -8.2 * u, .55 * u, .45 * u, 10), { wash: OW.shield, ink: PAL.ink, sw: sw * .45 });
}
// The Caduceus staff in arm space, held upright (rot undoes the arm angle). glowK lights the head.
function caduceus(u, sw, rot, glowK = 0) {
  push(); rotate(rot);
  paint(rectPts(-.22 * u, -7.2 * u, .44 * u, 10 * u, u * .02), { wash: OW.white, ink: PAL.ink, sw: sw * .55 });
  paint(rectPts(-.3 * u, -1.0 * u, .6 * u, 1.3 * u, u * .02), { wash: OW.gold, ink: PAL.ink, sw: sw * .45 });
  if (glowK > .01) glow(0, -8.3 * u, 3.2 * u, '#FFE27A', glowK);
  for (const s of [-1, 1]) paint(U(u, [[0, -7.6], [s * 1.9, -9.1], [s * 1.6, -8.1], [s * 1.1, -7.7], [0, -7.1]]), { wash: OW.gold, ink: PAL.ink, sw: sw * .45 });
  paint(ellPts(0, -8.3 * u, .75 * u, .75 * u, 14), { wash: OW.goldLt, ink: PAL.ink, sw: sw * .5 });
  paint(ellPts(0, -8.3 * u, .32 * u, .32 * u, 10), { wash: OW.beam, ink: null });
  pop();
}
// world position of the staff's glowing head, for beams
function staffHead(x, y, u, o) {
  const which = nearArm(o), local = armTipLocal(u, o, which), [hx, hy] = bodyToWorld(x, y, u, o, ...local);
  const sq = (o.sq || 0) + (o.take || 0), up = 8.3 * u * (1 - sq), r = o.rot || 0;
  return [hx + Math.sin(r) * up, hy - Math.cos(r) * up];
}
function mercy(x, y, u, o = {}) {
  const which = nearArm(o), wing = o.wing ?? 0, flap = o.flap ?? 0;
  clawd(x, y, u, {
    ...o, behind: (uu, sw, V) => { mercyWings(uu, sw, wing, flap); if (o.behind) o.behind(uu, sw, V); },
    draw: (uu, sw) => { mercyHeadpiece(uu, sw, VIEWS[o.view] || VIEWS.front); if (o.draw) o.draw(uu, sw); },
    ...(o.noStaff ? {} : holdIn(o, which, (uu, sw) => caduceus(uu, sw, staffRot(o, which) + (o.staffTilt || 0), o.staffGlow || 0))),
  });
}
// rotation that turns arm space back to upright, for a prop held in arm `which`
function staffRot(o, which) {
  const V = VIEWS[o.view] || VIEWS.front, A = V.arms.find(a => a[2] === which); if (!A) return 0;
  const a = which === 'L' ? (o.aL ?? .2) : (o.aR ?? .2);
  if (A[1] === 0) return -(.7 - a);   // side view: the arm was rotated by (.7 - a)
  // front/q arms: rotate(dir < 0 ? a : -a), and a left-side arm is also mirrored before the hook; either way, rotate(a) undoes it
  return a;
}

// The healing beam from (x0, y0) to (x1, y1): a wavy golden ribbon with light. k: 0..1 how far it has shot out.
function healBeam(x0, y0, x1, y1, t, k = 1, col = OW.beam) {
  if (k <= .01) return;
  const n = 9, P = [], dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 0; i <= n; i++) { const q = i / n * k, w = Math.sin(q * Math.PI) * (10 + 6 * Math.sin(t * 9 + i)) * Math.sin(i * 1.3 + t * 14); P.push([x0 + dx * q + nx * w, y0 + dy * q + ny * w]); }
  boilSeed('beam' + Math.round(x1));
  for (let i = 1; i < n; i += 2) glow(P[i][0], P[i][1], 46, col, .55);
  paint(ribbon(P, 16, 9), { wash: col, washOp: 210, ink: null });
  paint(ribbon(P, 6, 4), { wash: '#FFF6CF', ink: null });
  for (let j = 0; j < 4; j++) { const q = frac(t * 1.6 + j / 4) * k, i = Math.min(n, Math.floor(q * n)); paint(starPts(lerp(x0, x1, q) + nx * 6, lerp(y0, y1, q) + ny * 6, 9, .3, 4, t * 3), { wash: '#FFFBEA', ink: null }); }
}

// ---------- Reinhardt ----------
function reinHelmet(u, sw) {
  // crest fin, brow plate with gold trim, nose guard between the eyes (the eye slit stays open)
  paint(U(u, [[-1.4, -8], [-1.1, -10.6], [0, -11.6], [1.1, -10.6], [1.4, -8]]), { wash: OW.steelLt, ink: PAL.ink, sw: sw * .7, curv: .25 });
  inkLine(U(u, [[0, -8.1], [0, -11.3]]), sw * .6, OW.goldDk, 'inkfine', 0);
  paint(rrPts(-5.4 * u, -8.7 * u, 10.8 * u, 1.55 * u, .5 * u, u * .03), { wash: OW.steel, ink: PAL.ink, sw: sw * .7 });
  inkLine(U(u, [[-5.2, -7.35], [5.2, -7.35]]), sw * .7, OW.gold, 'ink', 0);
  paint(U(u, [[-.55, -7.25], [.55, -7.25], [.42, -4.9], [0, -4.6], [-.42, -4.9]]), { wash: OW.steelLt, ink: PAL.ink, sw: sw * .55 });
}
// Rocket hammer in arm space, posed by rot (0 = head straight up from the hand).
function rocketHammer(u, sw, rot) {
  push(); rotate(rot);
  paint(rectPts(-.3 * u, -6.8 * u, .6 * u, 8 * u, u * .02), { wash: '#5A4A3E', ink: PAL.ink, sw: sw * .55 });
  paint(rrPts(-2.4 * u, -9.6 * u, 4.8 * u, 2.9 * u, .45 * u, u * .03), { wash: OW.steelDk, ink: PAL.ink, sw: sw * .7 });
  paint(rectPts(-2.4 * u, -8.5 * u, 4.8 * u, .7 * u), { wash: OW.orange, ink: null });
  paint(rrPts(2.2 * u, -9.1 * u, 1.0 * u, 1.9 * u, .3 * u), { wash: '#3D4550', ink: PAL.ink, sw: sw * .5 });
  paint(rrPts(-3.2 * u, -9.3 * u, 1.0 * u, 2.3 * u, .3 * u), { wash: OW.steel, ink: PAL.ink, sw: sw * .5 });
  pop();
}
function rein(x, y, u, o = {}) {
  clawd(x, y, u, {
    col: OW.steel, dk: OW.steelDk, lt: OW.steelLt, ...o,
    draw: (uu, sw) => { reinHelmet(uu, sw); if (o.draw) o.draw(uu, sw); },
    ...(o.noHammer ? {} : { armR: (uu, sw) => rocketHammer(uu, sw, staffRot(o, 'R') + (o.hammer ?? .5)) }),
  });
}
// Reinhardt's barrier: a translucent blue panel of hexes standing at (x, y) ground, w × h. k: 0..1 deploy.
function barrier(x, y, w, h, t, k = 1) {
  if (k <= .02) return;
  const hh = h * easeOut(k), ww = w * (.6 + .4 * easeOut(k)), x0 = x - ww / 2, y0 = y - hh;
  boilSeed('barrier' + Math.round(x));
  glow(x, y - hh * .5, Math.max(ww, hh) * .75, '#9BE3FF', .35 * k);
  const pts = []; for (let i = 0; i <= 10; i++) pts.push([x0 + ww * i / 10, y0 + Math.sin(i / 10 * Math.PI) * -18]);
  pts.push([x0 + ww, y], [x0, y]);
  paint(pts, { wash: OW.shield, washOp: 95, ink: '#3A8FC0', sw: 1.4 });
  const r = 34, dx = r * 1.5, dy = r * Math.sqrt(3);
  for (let cx = x0 + r; cx < x0 + ww - r * .5; cx += dx) for (let cy = y0 + dy * .7 + ((Math.round((cx - x0 - r) / dx) % 2) ? dy / 2 : 0); cy < y - r * .6; cy += dy) {
    const hp = []; for (let a = 0; a < 6; a++) hp.push([cx + Math.cos(a * Math.PI / 3) * r * .86, cy + Math.sin(a * Math.PI / 3) * r * .86]);
    hp.push(hp[0]);
    inkLine(hp, .55, '#E4F7FF', 'inkfine', 0);
  }
}

// ---------- Tracer ----------
function tracerHair(u, sw) {
  const P = [[-4.9, -7.7]]; for (let i = 0; i < 6; i++) { const bx = -4.6 + i * 1.75; P.push([bx + .2, -9.4 - .5 * Math.sin(i * 1.7)], [bx + 1.5, -8.3]); }
  P.push([5.1, -9.0], [5.0, -7.5], [1.5, -7.9], [-1.5, -7.6]);
  paint(U(u, P), { wash: OW.hair, ink: PAL.ink, sw: sw * .65 });
}
function tracerGoggles(u, sw, V) {
  const cx = V && V.face ? V.face.cx * u : 0, fw = V && V.face ? V.face.fw : 1;
  paint(rrPts(cx - 4.4 * u * fw, -7.45 * u, 8.8 * u * fw, 2.9 * u, 1.1 * u, u * .02), { wash: OW.amber, washOp: 120, ink: PAL.ink, sw: sw * .85 });
  inkLine([[cx - 4.4 * u * fw, -6.2 * u], [V && V.L ? V.L * u : -5 * u, -6.3 * u]], sw * 1.2, '#3B3A44', 'ink', 0);
  inkLine([[cx + 4.4 * u * fw, -6.2 * u], [V && V.R ? V.R * u : 5 * u, -6.3 * u]], sw * 1.2, '#3B3A44', 'ink', 0);
}
function chronalDisc(u, sw, t) {
  paint(ellPts(0, -3.15 * u, 1.05 * u, 1.05 * u, 18), { wash: '#3B4A5A', ink: PAL.ink, sw: sw * .5 });
  glow(0, -3.15 * u, 2.8 * u, '#7FE4FF', .7 + .3 * Math.sin(t * 7));
  paint(ellPts(0, -3.15 * u, .72 * u, .72 * u, 16), { wash: OW.chrono, ink: null });
  paint(ellPts(0, -3.15 * u, .3 * u, .3 * u, 10), { wash: '#F2FDFF', ink: null });
}
function tracer(x, y, u, o = {}) {
  clawd(x, y, u, {
    col: OW.orange, dk: OW.orangeDk, lt: OW.orangeLt, ...o,
    under: (uu, sw, V) => { if (V.face) chronalDisc(uu, sw, T); },
    draw: (uu, sw) => { tracerHair(uu, sw); tracerGoggles(uu, sw, VIEWS[o.view] || VIEWS.front); if (o.draw) o.draw(uu, sw); },
  });
}
// A blink: a blue streak from (x0, y0) to (x1, y1), fading with age (s). u = the character's unit.
function blinkTrail(x0, y0, x1, y1, u, age) {
  const k = 1 - clamp(age / .35); if (k <= 0) return;
  boilSeed('blink' + Math.round(x0));
  const P = [[x0, y0 - 4 * u], [lerp(x0, x1, .5), lerp(y0, y1, .5) - 4.3 * u], [x1, y1 - 4 * u]];
  glow(lerp(x0, x1, .5), lerp(y0, y1, .5) - 4 * u, Math.abs(x1 - x0) * .4 + 40, '#7FE4FF', .6 * k);
  paint(ribbon(P, 1.0 * u * k, 4.5 * u * k), { wash: '#9FEAFF', washOp: 200, ink: null });
  for (let i = 0; i < 3; i++) inkLine([[lerp(x0, x1, .1 + i * .25), y0 - (2 + i * 2) * u], [lerp(x0, x1, .3 + i * .25), y0 - (2 + i * 2) * u]], 1, '#4FB7E0', 'inkfine', 0);
}

// ---------- Genji ----------
function genjiVisor(u, sw, V) {
  const cx = V && V.face ? V.face.cx * u : 0, fw = V && V.face ? V.face.fw : 1;
  paint(rrPts(cx - 4.3 * u * fw, -7.4 * u, 8.6 * u * fw, 2.8 * u, .9 * u, u * .02), { wash: OW.visor, ink: PAL.ink, sw: sw * .6 });
  inkLine([[cx - 3.8 * u * fw, -4.3 * u], [cx + 3.8 * u * fw, -4.3 * u]], sw * .9, OW.neon, 'ink', 0);
  for (const s of [-1, 1]) inkLine([[s * 4.6 * u, -3.6 * u], [s * 4.6 * u, -2.4 * u]], sw * .8, OW.neon, 'ink', 0);
}
function genjiHelmet(u, sw) {
  paint(U(u, [[2.6, -8], [3.6, -10.2], [4.3, -8]]), { wash: OW.silverLt, ink: PAL.ink, sw: sw * .55 });
  paint(rectPts(-5.1 * u, -8.45 * u, 10.2 * u, .6 * u), { wash: OW.silverDk, ink: PAL.ink, sw: sw * .5 });
}
function katana(u, sw, rot, k = 0) {
  push(); rotate(rot);
  paint(rectPts(-.25 * u, -.4 * u, .5 * u, 1.9 * u), { wash: '#3B3550', ink: PAL.ink, sw: sw * .5 });
  paint(rectPts(-.8 * u, -.6 * u, 1.6 * u, .35 * u), { wash: OW.goldDk, ink: PAL.ink, sw: sw * .4 });
  if (k > .02) glow(0, -4.5 * u, 4 * u, '#8CF06A', .9 * k);
  paint(U(u, [[-.2, -.6], [.2, -.6], [.25, -7.4], [0, -8.2], [-.15, -7.4]]), { wash: k > .02 ? mixCol('#EAF2F6', '#B8FF9E', k) : '#EAF2F6', ink: PAL.ink, sw: sw * .45 });
  pop();
}
function genji(x, y, u, o = {}) {
  const which = nearArm(o);
  clawd(x, y, u, {
    col: OW.silver, dk: OW.silverDk, lt: OW.silverLt, eyeCol: OW.neon, ...o,
    under: (uu, sw, V) => { if (V.face) genjiVisor(uu, sw, V); },
    draw: (uu, sw) => { genjiHelmet(uu, sw); if (o.draw) o.draw(uu, sw); },
    ...(o.blade != null ? holdIn(o, which, (uu, sw) => katana(uu, sw, staffRot(o, which) + (o.bladeRot ?? .3), o.blade)) : {}),
  });
}

// ---------- the Cowboy (enemy) ----------
function cowboyHat(u, sw, tip) {
  const dy = lerp(1.9, 0, tip) * u, r = lerp(.08, -.12, tip);
  push(); translate(0, dy); rotate(r);
  paint(U(u, [[-7.6, -7.9], [-4, -8.7], [0, -8.9], [4, -8.7], [7.6, -7.9], [6.2, -7.3], [0, -7.6], [-6.2, -7.3]]), { wash: OW.hat, ink: PAL.ink, sw: sw * .8, curv: .3 });
  paint(U(u, [[-3.6, -8.5], [-3.3, -11.9], [-1.2, -12.4], [0, -11.6], [1.2, -12.4], [3.3, -11.9], [3.6, -8.5]]), { wash: OW.hat, ink: PAL.ink, sw: sw * .8, curv: .25 });
  paint(rectPts(-3.55 * u, -9.6 * u, 7.1 * u, .85 * u), { wash: OW.hatDk, ink: null });
  inkLine(U(u, [[-3.3, -11.6], [-1.6, -11.9]]), sw * .5, mixCol(OW.hat, '#FFFFFF', .3), 'inkfine', 0);
  pop();
}
function serape(u, sw) {
  paint(U(u, [[-5.3, -4.9], [5.3, -4.9], [5.1, -2.5], [2.5, -1.6], [0, -1.2], [-2.5, -1.6], [-5.1, -2.5]]), { wash: OW.serape, ink: PAL.ink, sw: sw * .6 });
  for (const [yy, c] of [[-4.35, PAL.cream], [-3.75, OW.gold], [-3.15, PAL.teal], [-2.55, PAL.cream]]) inkLine(U(u, [[-5.1, yy], [5.1, yy]]), sw * 1.4, c, 'ink', 0);
}
function revolver(u, sw, rot, fire = 0) {
  push(); rotate(rot);
  paint(rectPts(-.2 * u, -.5 * u, .9 * u, 1.6 * u), { wash: '#6B4A2E', ink: PAL.ink, sw: sw * .5 });
  paint(ellPts(.8 * u, -.35 * u, .55 * u, .5 * u, 12), { wash: '#4A4F58', ink: PAL.ink, sw: sw * .5 });
  paint(rectPts(.5 * u, -.75 * u, 2.6 * u, .5 * u), { wash: '#5A616C', ink: PAL.ink, sw: sw * .5 });
  if (fire > .02) {
    glow(3.6 * u, -.5 * u, 3.5 * u * fire, '#FFD27A', fire);
    paint(starPts(3.9 * u, -.5 * u, 2.2 * u * fire, .4, 6, T * 30), { wash: '#FFE9A8', ink: PAL.ink, sw: sw * .5 });
  }
  pop();
}
function cowboy(x, y, u, o = {}) {
  const which = nearArm(o);
  clawd(x, y, u, {
    col: OW.cowboy, dk: OW.cowboyDk, lt: OW.cowboyLt, ...o,
    under: (uu, sw) => serape(uu, sw),
    draw: (uu, sw) => {
      if (!o.noCigar) {
        paint(U(uu, [[1.0, -4.55], [3.0, -4.85], [3.05, -4.45], [1.05, -4.2]]), { wash: '#8A5A3A', ink: PAL.ink, sw: sw * .45 });
        paint(ellPts(3.1 * uu, -4.65 * uu, .28 * uu, .26 * uu, 8), { wash: '#FF7A3A', ink: null });
      }
      cowboyHat(uu, sw, o.hatTip ?? 1); if (o.draw) o.draw(uu, sw);
    },
    ...(o.noGun ? {} : holdIn(o, which, (uu, sw) => revolver(uu, sw, o.gunRot ?? 0, o.fire || 0))),
  });
}

// ---------- calls and markers ----------
// "I need healing": a white plus on a red badge, popping in (k 0..1) and bobbing. s = size in px (badge half-width).
function healCall(x, y, s, k, age = 0) {
  const p = backOut(clamp(k)); if (p < .02) return;
  boilSeed('call' + Math.round(x) + ',' + Math.round(y));
  push(); translate(x, y - Math.sin(age * 6) * s * .08); scale(p); rotate(.08 * Math.sin(age * 5));
  paint(rrPts(-s, -s, 2 * s, 2 * s, s * .45, s * .03), { wash: OW.call, ink: PAL.ink, sw: clamp(s / 22, .5, 1.4) });
  paint([[-.22, -.68], [.22, -.68], [.22, -.22], [.68, -.22], [.68, .22], [.22, .22], [.22, .68], [-.22, .68], [-.22, .22], [-.68, .22], [-.68, -.22], [-.22, -.22]].map(([a, b]) => [a * s, b * s]), { wash: PAL.cream, ink: null });
  pop();
}
// A heart that pops up and floats (the thank-you that replaces the "+").
function heartCall(x, y, s, k, age = 0) {
  const p = backOut(clamp(k)); if (p < .02) return;
  boilSeed('heart' + Math.round(x));
  push(); translate(x, y - age * s * .6); scale(p * (1 + .08 * Math.sin(age * 10)));
  paint(heartPts(0, 0, s), { wash: '#E2476E', fill: PAL.rose, fillOp: 0, ink: PAL.ink, sw: clamp(s / 22, .5, 1.4) });
  paint(ellPts(-s * .4, -s * .25, s * .22, s * .14, 8, 0, -.5), { wash: '#FFD1DC', ink: null });
  pop();
}
// Dead-eye marker: a red ring that closes (fill 0..1) around a skull, popping in with k.
function skullMark(x, y, s, k, fill) {
  const p = backOut(clamp(k)); if (p < .02) return;
  boilSeed('skull' + Math.round(x));
  push(); translate(x, y); scale(p);
  glow(0, 0, s * 2.2, '#FF3048', .5 + .5 * fill);
  const n = Math.max(2, Math.round(24 * fill)), arc = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / 24 * TAU; arc.push([Math.cos(a) * s * 1.25, Math.sin(a) * s * 1.25]); }
  if (fill > .03) inkLine(arc, 2.4, OW.skull, 'ink', 0);
  paint(ellPts(0, -s * .15, s * .72, s * .62, 16), { wash: '#FFE3E3', ink: PAL.ink, sw: .9 });
  paint(rectPts(-s * .42, s * .25, s * .84, s * .42, 1), { wash: '#FFE3E3', ink: PAL.ink, sw: .8 });
  for (const sx of [-1, 1]) paint(ellPts(sx * s * .28, -s * .12, s * .2, s * .22, 10), { wash: OW.skull, ink: null });
  paint([[0, s * .1], [s * .1, s * .28], [-s * .1, s * .28]], { wash: PAL.ink, ink: null });
  pop();
}
// Little sparkle burst (pops, revives, impacts). k 0..1.
const sparkle = (x, y, r, k, col = PAL.cream) => { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: col, washOp: 255 * (1 - k * k), ink: null }); };
function burst(x, y, r, age, col = PAL.cream, n = 8, seed = 0) {
  const k = clamp(age / .5); if (k <= 0 || k >= 1) return;
  for (let i = 0; i < n; i++) { const a = i / n * TAU + hash(i + seed) * .5, d = r * easeOut(k) * (.7 + .5 * hash(i + seed + 9)); sparkle(x + Math.cos(a) * d, y + Math.sin(a) * d, r * .18, k, col); }
}
// Golden light pillar falling on a fallen hero (rez). k 0..1 brightness.
function rezPillar(x, y, w, k, t) {
  if (k <= .02) return;
  boilSeed('pillar' + Math.round(x));
  glow(x, y - 160, 260 * k, '#FFE08A', k);
  paint([[x - w * .25, -200], [x + w * .25, -200], [x + w * .6, y + 10], [x - w * .6, y + 10]], { wash: '#FFE9A8', washOp: 120 * k, ink: null });
  for (let i = 0; i < 6; i++) { const q = frac(t * .9 + i / 6), yy = lerp(y, y - 420, q); paint(starPts(x + (hash(i) - .5) * w, yy, 10 * (1 - q), .3, 4, t), { wash: '#FFFBEA', washOp: 255 * k * (1 - q), ink: null }); }
}
