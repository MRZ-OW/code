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
const nearArm = o => o.view === 'back' ? 'R' : 'L';   // always his right hand: front view 'L' is on our left
const holdIn = (which, fn) => which === 'L' ? { armL: fn } : { armR: fn };

// ---------- held props (arm space, (0, 0) = the hand) ----------
// The rock (reference: the in-game icon): a pale cream stone with darker creases and the famous red smear.
function rockProp(u, sw) {
  const P = [[-.25, -1.05], [.85, -1.3], [1.7, -.75], [1.85, .25], [1.15, .95], [.1, .9], [-.45, .2]];
  paint(U2(u, P), { wash: '#E3D3B6', ink: null, curv: .35 });
  paint(U2(u, [[.95, -.2], [1.75, -.45], [1.8, .25], [1.15, .9], [.7, .55]]), { wash: '#C9B391', ink: null });          // the shaded side
  paint(U2(u, [[-.4, .25], [-.1, .52], [.35, .78], [.9, .86], [1.15, .82], [.8, .6], [.3, .5], [-.05, .3]]), { wash: '#A8322A', washOp: 230, ink: null, curv: .4 });   // blood along the striking edge
  paint(U2(u, [[.2, .62], [.5, .66], [.42, .72]]), { wash: '#7E2420', ink: null });
  paint(U2(u, P), { ink: PAL.ink, sw: sw * .7, curv: .35 });
  inkLine(U2(u, [[-.05, -.62], [.35, -.42], [.62, -.66]]), sw * .38, '#8E7A5E', 'inkfine', .4);                        // creases, off-centre
  inkLine(U2(u, [[1.2, -.95], [1.45, -.6]]), sw * .3, '#8E7A5E', 'inkfine', 0);
}
function torchProp(u, sw, t = T, lit = 1) {
  paint(rectPts(-.25 * u, -3.4 * u, .5 * u, 4.4 * u, u * .02), { wash: '#8A5A36', ink: PAL.ink, sw: sw * .6 });
  paint(rectPts(-.38 * u, -3.6 * u, .76 * u, 1.0 * u, u * .03), { wash: '#C9B38A', ink: PAL.ink, sw: sw * .5 });
  if (lit > .02) {
    const f = 1 + .12 * Math.sin(t * 23) + .08 * Math.sin(t * 37), sway = .15 * Math.sin(t * 9);
    glow(0, -4.5 * u, 3.6 * u * lit, '#FFB347', .9 * lit);
    const flame = through(U2(u, [[-.55, -3.55], [-.68, -3.85], [-.62, -4.35], [-.32 + sway, -4.95 * f], [-.12 + sway, -4.6 * f], [.1 + sway * 1.5, -5.75 * f], [.34 + sway, -4.8 * f], [.62, -4.3], [.66, -3.85], [.5, -3.55], [.28, -3.72], [0, -3.6], [-.28, -3.72]]), 4);
    paint(flame, { wash: '#F28A2E', ink: '#B5501E', sw: sw * .35 });
    paint(through(U2(u, [[-.3, -3.75], [-.32, -4.25], [.04 + sway, -5.0 * f], [.3, -4.2], [.28, -3.75]]), 4), { wash: '#FFD86A', ink: null });
    paint(ellPts(0, -4.05 * u, .16 * u, .3 * u, 10), { wash: '#FFF8DC', ink: null });
  }
}
// AK (reference icon): a black receiver with a smiley sticker, an orange taped handguard, a curved black magazine with
// silver tape and a red D-handle stock wrapped in blue tape. Barrel along +x. fire 0..1 = muzzle flash.
function akProp(u, sw, fire = 0, o = {}) {
  inkLine(U2(u, [[-1.05, -.3], [-2.75, -.5], [-2.9, .6], [-1.05, .28]]), sw * 1.3, '#C43A2E', 'ink', 0);                  // the red D-handle stock
  for (const k of [-.22, .06, .34]) inkLine(U2(u, [[-3.0, k - .08], [-2.66, k + .02]]), sw * 1.15, '#3E6FB8', 'ink', 0);  // blue tape bands
  paint(rectPts(-1.1 * u, -.55 * u, 2.6 * u, .8 * u, u * .02), { wash: '#2E2D33', ink: PAL.ink, sw: sw * .55 });   // receiver
  paint(ellPts(.15 * u, -.2 * u, .16 * u, .16 * u, 10), { wash: '#F2C230', ink: null });                             // the smiley sticker
  paint(U2(u, [[-.55, .2], [-.15, .2], [-.25, 1.0], [-.65, 1.0]]), { wash: '#A8643F', ink: PAL.ink, sw: sw * .45 });  // grip
  paint(U2(u, [[.3, .22], [.85, .22], [1.25, .95], [1.4, 1.6], [.95, 1.72], [.78, 1.05]]), { wash: '#2E2D33', ink: PAL.ink, sw: sw * .5, curv: .35 });   // banana magazine
  inkLine(U2(u, [[.98, .9], [.58, 1.02]]), sw * .9, '#AEB4BA', 'ink', 0);                                            // silver tape round the mag
  paint(rectPts(1.4 * u, -.38 * u, 1.5 * u, .5 * u, u * .02), { wash: '#C2703E', ink: PAL.ink, sw: sw * .5 });    // taped handguard
  paint(rectPts(2.8 * u, -.28 * u, 1.7 * u, .26 * u), { wash: '#26252B', ink: PAL.ink, sw: sw * .45 });          // barrel
  if (o.twoHand === 'fist') paint(ellPts(2.1 * u, .05 * u, .5 * u, .45 * u, 14), { wash: o.glove || '#5A4A3A', ink: PAL.ink, sw: sw * .7 });   // a lone fist (no arm drawn)
  if (fire > .02) {   // a spiky white-yellow burst
    glow(5.0 * u, -.15 * u, 2.6 * u * fire, '#FFD27A', fire);
    const B = []; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, r = (i % 2 ? .35 : (.8 + .7 * hash(i + Math.floor(T * 24)))) * u * 1.4 * fire; B.push([5.1 * u + Math.cos(a) * r * 1.25, -.15 * u + Math.sin(a) * r * .8]); }
    paint(B, { wash: '#FFE9A8', ink: '#E8892E', sw: sw * .4 });
    paint(ellPts(5.0 * u, -.15 * u, .45 * u * fire, .3 * u * fire, 10), { wash: '#FFFDF2', ink: null });
  }
}

// ---------- players (survivor.js draws them) ----------
// The hero: a fresh spawn. Light skin, short brown hair, a short beard, Rust's grey boxer briefs, a rock in the near hand.
const HERO = { skin: 'light', hair: 'short', hairCol: 'brown', beard: 'full' };
const PROPS = { rock: (u, sw) => rockProp(u, sw), torch: (u, sw) => { push(); translate(.35 * u, 0); torchProp(u, sw, T, 1); pop(); }, ak: (u, sw) => akProp(u, sw, 0) };
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
  if (o.twoHand && o.rawArms && !o.noGun) {   // the other hand reaches for the handguard (2.1u along the gun from the grip)
    const [hx, hy] = handLocal(u, o, near), g = (o.gunRot || 0) + (o.propRot || 0), farW = near === 'L' ? 'R' : 'L';
    o = { ...o, ...reachArm(u, o, farW, hx + Math.cos(g) * 2.1 * u - Math.sin(g) * .05 * u, hy + Math.sin(g) * 2.1 * u + Math.cos(g) * .05 * u) };
  }
  survivor(x, y, u, { skin: 'tan', hair: 'buzz', hairCol: 'dark', ...o,
    gear: { mask: 'metal', chest: 'metal', kilt: 'roadsign', hoodie: true, hoodieCol: '#5F6B52', pants: true, boots: true, gloves: true, ...(o.gear || {}) },
    handOver: true, farFront: !!(o.twoHand && o.rawArms && !o.noGun), ...(o.noGun ? {} : holding({ ...o, hold: { [near]: (uu, sw) => { push(); rotate(o.gunRot || 0); if (o.gunFlip) scale(-1, 1); akProp(uu, sw, o.fire || 0); pop(); } } })) });
}
