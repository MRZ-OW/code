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
function rockProp(u, sw) {
  paint(U2(u, [[-.2, -1.1], [.9, -1.3], [1.7, -.7], [1.8, .3], [1.1, 1.0], [.1, .9], [-.4, .2]]), { wash: '#9EA3A8', ink: PAL.ink, sw: sw * .7, curv: .35 });
  paint(U2(u, [[.2, -.8], [1.0, -.95], [1.3, -.5], [.5, -.3]]), { wash: '#C7CBCF', ink: null });
  inkLine(U2(u, [[.6, .2], [1.2, .5]]), sw * .4, '#6E737A', 'inkfine', 0);
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
// AK-47: wooden stock and handguard, dark receiver, curved magazine. Barrel along +x. fire 0..1 = muzzle flash.
function akProp(u, sw, fire = 0) {
  paint(U2(u, [[-2.6, -.2], [-1.0, -.45], [-1.0, .35], [-2.5, .75]]), { wash: '#8A5A36', ink: PAL.ink, sw: sw * .55 });          // stock
  paint(rectPts(-1.1 * u, -.55 * u, 2.6 * u, .8 * u, u * .02), { wash: '#3B3A40', ink: PAL.ink, sw: sw * .55 });                   // receiver
  paint(U2(u, [[.2, .25], [.75, .25], [.95, 1.5], [.45, 1.6]]), { wash: '#4A4650', ink: PAL.ink, sw: sw * .5, curv: .2 });         // magazine
  paint(rectPts(1.4 * u, -.35 * u, 1.5 * u, .45 * u, u * .02), { wash: '#8A5A36', ink: PAL.ink, sw: sw * .5 });                    // handguard
  paint(rectPts(2.8 * u, -.28 * u, 1.6 * u, .26 * u), { wash: '#2E2D33', ink: PAL.ink, sw: sw * .45 });                            // barrel
  if (fire > .02) { glow(4.9 * u, -.15 * u, 2.6 * u * fire, '#FFD27A', fire); paint(starPts(5.0 * u, -.15 * u, 1.3 * u * fire, .4, 5, T * 40), { wash: '#FFE9A8', ink: PAL.ink, sw: sw * .4 }); }
}

// ---------- players ----------
function skinOf(o) { return SKINS[o.skin] || (typeof o.skin === 'object' ? o.skin : SKINS.clawd); }
// A fresh spawn: naked (a plain Clawd), holding a rock or a torch in the near hand.
function spawnling(x, y, u, o = {}) {
  const which = nearArm(o), prop = o.prop ?? 'rock';
  const hook = prop === 'rock' ? (uu, sw) => { push(); upright(o, which, o.propRot || 0); rockProp(uu, sw); pop(); }
    : prop === 'torch' ? (uu, sw) => { push(); upright(o, which, o.propRot || 0); torchProp(uu, sw, T, o.lit ?? 1); pop(); } : null;
  clawd(x, y, u, { ...skinOf(o), ...o, ...(hook ? holdIn(which, hook) : {}) });
}
// The metal facemask (on the body, under the eyes: the eyes glow through its slit) and chestplate.
function facemask(u, sw, V) {
  const cx = V && V.face ? V.face.cx * u : 0, fw = V && V.face ? V.face.fw : 1;
  paint(rrPts(cx - 4.6 * u * fw, -7.8 * u, 9.2 * u * fw, 3.9 * u, .7 * u, u * .03), { wash: '#5E646B', ink: PAL.ink, sw: sw * .8 });
  paint(rrPts(cx - 3.9 * u * fw, -7.0 * u, 7.8 * u * fw, 2.0 * u, .5 * u, u * .02), { wash: '#25222B', ink: PAL.ink, sw: sw * .5 });
  for (const s of [-1, 1]) for (const yy of [-7.45, -4.35]) paint(ellPts(cx + s * 3.9 * u * fw, yy * u, .2 * u, .2 * u, 8), { wash: '#9AA2AA', ink: null });
  inkLine([[cx - 4.4 * u * fw, -4.8 * u], [cx + 4.4 * u * fw, -4.8 * u]], sw * .5, '#3E434A', 'inkfine', 0);
}
function chestplate(u, sw, V) {
  const L = (V ? V.L : -5) * u, R = (V ? V.R : 5) * u;
  paint(rectPts(L + .2 * u, -4.2 * u, R - L - .4 * u, 2.1 * u, u * .03), { wash: '#7B838B', ink: PAL.ink, sw: sw * .6 });
  for (let i = 0; i < 4; i++) paint(ellPts(lerp(L + .8 * u, R - .8 * u, i / 3), -3.85 * u, .17 * u, .17 * u, 8), { wash: '#C2C8CE', ink: null });
}
function geared(x, y, u, o = {}) {
  const which = nearArm(o);
  clawd(x, y, u, {
    ...skinOf(o), eyeCol: o.eyeCol || '#F4E9D2', ...o,
    under: (uu, sw, V) => { if (V.face) facemask(uu, sw, V); chestplate(uu, sw, V); if (o.under) o.under(uu, sw, V); },
    ...(o.noGun ? {} : holdIn(which, (uu, sw) => { push(); upright(o, which, o.gunRot ?? 0); akProp(uu, sw, o.fire || 0); pop(); })),
  });
}
