// rustcast.js: the cast of "Clawd plays Rust", all Clawds, plus the props they hold.
//   spawnling(x, y, u, o)   a fresh spawn: naked, holding a rock (o.prop 'rock' | 'torch' | 'none', o.propRot)
//   geared(x, y, u, o)      a geared player: metal facemask (glowing eyes), chestplate, AK (o.fire 0..1)
// Any player takes o.skin: a body colour set from SKINS (terracotta Clawd by default), plus every clawd() option.
// Props are drawn in arm space and held upright: their rotation undoes the arm's own angle (see heldRot).

const SKINS = {
  clawd: { col: PAL.clay, dk: PAL.clayDk, lt: '#F5B394' },
  teal: { col: '#5FA8A0', dk: '#3D7871', lt: '#9AD3C9' },
  plum: { col: '#9A6FA8', dk: '#6B4A78', lt: '#C9A6D6' },
  olive: { col: '#9AA25A', dk: '#6C7338', lt: '#C9CF8E' },
};
const U2 = (u, pts) => pts.map(([a, b]) => [a * u, b * u]);

// ---------- pose geometry (matches clawd()'s transform) ----------
function bodyToWorld(x, y, u, o, lx, ly) {
  const sq = (o.sq || 0) + (o.take || 0), sm = clamp(o.smear || 0);
  const fx = (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .6) * (1 + sm * .35), fy = (o.sy ?? 1) * (1 - sq);
  const px = lx * fx, py = ly * fy, r = o.rot || 0, c = Math.cos(r), s = Math.sin(r);
  return [x + (o.dx || 0) * u + px * c - py * s, y + (o.dy || 0) * u + px * s + py * c];
}
function armTipLocal(u, o, which) {
  const V = VIEWS[o.view] || VIEWS.front, A = V.arms.find(a => a[2] === which);
  if (!A) return [0, -4.5 * u];
  const [px, dir] = A, a = which === 'L' ? (o.aL ?? .2) : (o.aR ?? .2);
  if (dir === 0) { const th = .7 - a; return [px * u + 2.1 * u * Math.cos(th), -4.2 * u + 2.1 * u * Math.sin(th)]; }
  const root = (px + dir * .55 * clamp((Math.abs(a) - .7) / .9)) * u, th = dir < 0 ? a : -a, L = dir * 2.2 * u;
  return [root + L * Math.cos(th), -4.5 * u + L * Math.sin(th)];
}
const armTip = (x, y, u, o, which) => bodyToWorld(x, y, u, o, ...armTipLocal(u, o, which));
// rotation that turns a hook's arm space back to upright body space (see clawd()'s arm transform)
function heldRot(o, which) {
  const V = VIEWS[o.view] || VIEWS.front, A = V.arms.find(a => a[2] === which); if (!A) return 0;
  const a = which === 'L' ? (o.aL ?? .2) : (o.aR ?? .2);
  return A[1] === 0 ? a - .7 : a;
}
// Hold a prop upright in arm `which`, pointing forward (+x = the way the body faces): a left-side arm mirrors its hook,
// so the prop is mirrored back. extra = an added rotation (a swing, a gun's aim).
function upright(o, which, extra = 0) {
  const V = VIEWS[o.view] || VIEWS.front, A = V.arms.find(a => a[2] === which);
  rotate(heldRot(o, which) + (A && A[1] < 0 ? -extra : extra));
  if (A && A[1] < 0) scale(-1, 1);
}
const nearArm = o => (o.view === 'q' || o.view === 'side') ? 'L' : 'R';
const holdIn = (which, fn) => which === 'L' ? { armL: fn } : { armR: fn };

// ---------- held props (arm space, (0, 0) = the hand) ----------
// The rock (reference: the in-game icon): a pale cream stone with darker creases and the famous red smear.
function rockProp(u, sw) {
  const P = [[-.25, -1.05], [.85, -1.3], [1.7, -.75], [1.85, .25], [1.15, .95], [.1, .9], [-.45, .2]];
  paint(U2(u, P), { wash: '#E3D3B6', ink: PAL.ink, sw: sw * .7, curv: .35 });
  paint(U2(u, [[.95, -.2], [1.75, -.45], [1.8, .25], [1.15, .9], [.7, .55]]), { wash: '#C9B391', ink: null });
  paint(U2(u, [[.2, .25], [.75, .05], [1.05, .45], [.7, .8], [.2, .7]]), { wash: '#B23A2E', washOp: 210, ink: null, curv: .4 });
  inkLine(U2(u, [[.1, -.5], [.55, -.2], [.95, -.55]]), sw * .4, '#8E7A5E', 'inkfine', .4);
}
function torchProp(u, sw, t = T, lit = 1) {
  paint(rectPts(-.25 * u, -3.4 * u, .5 * u, 4.4 * u, u * .02), { wash: '#8A5A36', ink: PAL.ink, sw: sw * .6 });
  paint(rectPts(-.38 * u, -3.6 * u, .76 * u, 1.0 * u, u * .03), { wash: '#C9B38A', ink: PAL.ink, sw: sw * .5 });
  if (lit > .02) {
    const f = 1 + .12 * Math.sin(t * 23) + .08 * Math.sin(t * 37);
    glow(0, -4.4 * u, 3.6 * u * lit, '#FFB347', .9 * lit);
    paint(U2(u, [[-.55, -3.6], [.55, -3.6], [.35, -4.6 * f], [0, -5.6 * f], [-.3, -4.7 * f]]), { wash: '#F28A2E', ink: null, curv: .4 });
    paint(U2(u, [[-.25, -3.65], [.25, -3.65], [0, -4.6 * f]]), { wash: '#FFE08A', ink: null });
  }
}
// AK (reference icon): a black receiver and barrel, an orange-brown wooden handguard and grip, a curved black
// magazine and a skeletal red-and-blue stock. Barrel along +x. fire 0..1 = muzzle flash.
function akProp(u, sw, fire = 0) {
  inkLine(U2(u, [[-1.0, -.25], [-2.4, -.45], [-2.6, .55], [-1.0, .3]]), sw * 1.5, '#B8392E', 'ink', 0);          // skeletal stock
  inkLine(U2(u, [[-2.5, -.35], [-2.65, .5]]), sw * 1.6, '#3E6FB8', 'ink', 0);
  paint(rectPts(-1.1 * u, -.55 * u, 2.6 * u, .8 * u, u * .02), { wash: '#2E2D33', ink: PAL.ink, sw: sw * .55 });   // receiver
  paint(U2(u, [[-.55, .2], [-.15, .2], [-.25, 1.0], [-.65, 1.0]]), { wash: '#A8643F', ink: PAL.ink, sw: sw * .45 });  // grip
  paint(U2(u, [[.25, .25], [.8, .25], [1.0, 1.55], [.5, 1.65]]), { wash: '#2E2D33', ink: PAL.ink, sw: sw * .5, curv: .2 });  // magazine
  paint(rectPts(1.4 * u, -.38 * u, 1.5 * u, .5 * u, u * .02), { wash: '#C2703E', ink: PAL.ink, sw: sw * .5 });    // handguard
  paint(rectPts(2.8 * u, -.28 * u, 1.7 * u, .26 * u), { wash: '#26252B', ink: PAL.ink, sw: sw * .45 });          // barrel
  if (fire > .02) { glow(5.0 * u, -.15 * u, 2.6 * u * fire, '#FFD27A', fire); paint(starPts(5.1 * u, -.15 * u, 1.3 * u * fire, .4, 5, T * 40), { wash: '#FFE9A8', ink: PAL.ink, sw: sw * .4 }); }
}

// ---------- players (survivor.js draws them) ----------
// The hero: a fresh spawn. Light skin, short brown hair, a short beard, Rust's grey boxer briefs, a rock in the near hand.
const HERO = { skin: 'light', hair: 'short', hairCol: 'brown', beard: 'full' };
const PROPS = { rock: (u, sw) => rockProp(u, sw), torch: (u, sw) => torchProp(u, sw, T, 1), ak: (u, sw) => akProp(u, sw, 0) };
// hold: { R: 'rock' } or { L: fn } — a prop name or a function drawn at that hand (+x = forward). propRot rotates it.
function holding(o) {
  const out = {}, H = o.hold || {};
  for (const w of ['L', 'R']) {
    const p = H[w]; if (!p) continue;
    const fn = typeof p === 'function' ? p : PROPS[p];
    out['hand' + w] = (u, sw, info) => { push(); rotate((o.propRot || 0) * (info.side < 0 && !(o.view === 'q' || o.view === 'side') ? -1 : 1)); if (info.side < 0 && !(o.view === 'q' || o.view === 'side')) scale(-1, 1); fn(u, sw, info); pop(); };
  }
  return out;
}
// A fresh spawn: naked, holding a rock (o.prop 'rock' | 'torch' | 'none', in the near hand).
function spawnling(x, y, u, o = {}) {
  const near = nearArm(o), prop = o.prop ?? 'rock';
  survivor(x, y, u, { ...HERO, ...o, ...holding({ ...o, hold: { ...(prop !== 'none' ? { [near]: prop } : {}), ...(o.hold || {}) } }) });
}
// A geared player: metal facemask on a leather cap, metal chestplate, roadsign kilt, hoodie, pants, boots, an AK.
function geared(x, y, u, o = {}) {
  const near = nearArm(o);
  survivor(x, y, u, { skin: 'tan', hair: 'buzz', hairCol: 'dark', ...o,
    gear: { mask: 'metal', chest: 'metal', kilt: 'roadsign', hoodie: true, hoodieCol: '#3F4A3C', pants: true, boots: true, gloves: true, ...(o.gear || {}) },
    ...(o.noGun ? {} : holding({ ...o, hold: { [near]: (uu, sw) => { push(); rotate(o.gunRot || 0); akProp(uu, sw, o.fire || 0); pop(); } } })) });
}
