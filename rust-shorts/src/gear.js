// gear.js: what the players wear, drawn over the survivor rig (survivor.js calls these). Each piece follows its item
// image on rust-app.com (https://rust-app.com/items/img/<shortname>.png): metal facemask, metal chestplate, roadsign
// kilt, hazmat suit, the scientist suits (peacekeeper, arctic, naval, nvgm, outbreak) and the heavy scientist suit.
// Body-local coordinates as in survivor.js (feet at y 0, +x forward in 3/4 and profile); head pieces get the head centre
// (hcx, hcy) and radius R and are placed on the turned head with the helpers below, so every view agrees.

// ---------- placing things on a turned head ----------
// The head as a sphere turned by th (0 = facing us, π/2 = a profile facing right). gearTurn(V, u, R) gives th for a view.
function gearTurn(V, u, R) {
  if (V.back) return Math.PI;
  if (V === SV.side) return HEAD_TURN.side;
  if (V === SV.q) return HEAD_TURN.q;
  if (V === SV.qf) return HEAD_TURN.qf ?? .3;
  return 0;
}
// a point at (lon, lat) on a sphere of radius R·k, pushed out kz along the face's axis: [x, y, depth] (depth > 0 faces us).
// Points that have turned away are clamped to the silhouette (gearPtC) so outlines stay on the head.
function gearPt(H, lon, lat, k = 1, kz = 1) {
  const r = H.R * k, cl = Math.cos(lat), X = Math.sin(lon) * cl, Z = Math.cos(lon) * cl * kz, s = Math.sin(H.th), c = Math.cos(H.th);
  return [H.hcx + r * (X * c + Z * s), H.hcy + r * Math.sin(lat), -X * s + Z * c];
}
function gearPtC(H, lon, lat, k = 1) { const l = Math.min(lon, Math.PI / 2 - H.th); return gearPt(H, Math.max(l, -Math.PI / 2 - H.th), lat, k); }
// wrap a shape drawn as seen from the front (x, y in px from the head centre) onto the turned head, on a sphere R·k
function gearWrap(H, x, y, k = 1) {
  const r = H.R * k, lat = Math.asin(clamp(y / r, -1, 1)), cr = r * Math.cos(lat), lon = cr > 1e-6 ? Math.asin(clamp(x / cr, -1, 1)) : 0;
  return gearPtC(H, lon, lat, k);
}
const gearWrapPts = (H, P, k = 1) => P.map(([x, y]) => { const p = gearWrap(H, x, y, typeof k === 'function' ? k(x, y) : k); return [p[0], p[1]]; });
// a lon/lat window on the head (the old panel() shape)
function gearPanel(H, l0, l1, a0, a1, k = 1, n = 8) {
  const P = [], q = (lon, lat) => { const p = gearPtC(H, lon, lat, k); P.push([p[0], p[1]]); };
  for (let i = 0; i <= n; i++) q(lerp(l0, l1, i / n), a0);
  for (let i = 1; i < n; i++) q(l1, lerp(a0, a1, i / n));
  for (let i = 0; i <= n; i++) q(lerp(l1, l0, i / n), a1);
  for (let i = 1; i < n; i++) q(l0, lerp(a1, a0, i / n));
  return P;
}
// a polygon with its corners rounded (r in px, or one r per corner)
function gearRound(P, r, n = 5) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[(i - 1 + P.length) % P.length], b = P[i], c = P[(i + 1) % P.length], rr = Array.isArray(r) ? r[i] : r;
    const la = Math.hypot(a[0] - b[0], a[1] - b[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]), k0 = Math.min(rr / la, .5), k1 = Math.min(rr / lc, .5);
    const p0 = [lerp(b[0], a[0], k0), lerp(b[1], a[1], k0)], p1 = [lerp(b[0], c[0], k1), lerp(b[1], c[1], k1)];
    for (let j = 0; j <= n; j++) { const t = j / n, m = 1 - t; out.push([m * m * p0[0] + 2 * m * t * b[0] + t * t * p1[0], m * m * p0[1] + 2 * m * t * b[1] + t * t * p1[1]]); }
  }
  return out;
}
// a straight strip (tape, a strap) from A to B, w wide, as a polygon
function gearStrip(A, B, w) {
  const dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2;
  return [[A[0] + nx, A[1] + ny], [B[0] + nx, B[1] + ny], [B[0] - nx, B[1] - ny], [A[0] - nx, A[1] - ny]];
}
// a ribbed hose along a path: a dark tube with light rib ticks every `step`
function gearHose(P, w, col, rib, step, sw) {
  paint(ribbon(P, w), { wash: col, ink: PAL.ink, sw: sw * .4 });
  const C = through(P); let acc = 0;
  for (let i = 1; i < C.length; i++) {
    const dx = C[i][0] - C[i - 1][0], dy = C[i][1] - C[i - 1][1], l = Math.hypot(dx, dy); acc += l;
    if (acc >= step && i < C.length - 1) { acc = 0; const nx = -dy / (l || 1) * w * .36, ny = dx / (l || 1) * w * .36; inkLine([[C[i][0] - nx, C[i][1] - ny], [C[i][0] + nx, C[i][1] + ny]], sw * .32, rib, 'inkfine', 0); }
  }
}
// irregular camo blotches inside an ellipse (arctic, naval scientists)
function gearCamo(cx, cy, rx, ry, col, key, n, u) {
  if (typeof key === 'string') key = [...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7);
  for (let i = 0; i < n; i++) {
    const h1 = hash(key + i * 7.3), h2 = hash(key + i * 3.1 + 11), h3 = hash(key + i * 5.7 + 23), a = h1 * TAU, d = Math.sqrt(h2) * .8;
    const x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d, r = (.22 + .22 * h3) * u;
    paint(ellPts(x, y, r * 1.3, r * .8, 7, r * .25, h3 * 3), { wash: col, washOp: 210, ink: null });
  }
}

// ---------- metal facemask (reference: metal.facemask) ----------
// A tall welded plate with a flat, slightly flared bottom edge and a raised tab at the top, warm grey with rust spots, two
// eye slits; a rounded leather skullcap that ends at the ears, and two leather straps from the cap down to the plate.
// The eyes in the slits follow the mood (o.eyes), so a masked player can still act: a glint, a glare, happy arcs, shut.
function maskEye(ex, ey, u, sw, k, s, o) {
  const lx = (o.lookX || 0) * .1 * u, ly = (o.lookY || 0) * .06 * u, W2 = '#F2E6D0';
  if (['happy', 'closed', 'sleepy', 'squeeze', 'cry'].includes(k)) { inkLine([[ex - .2 * u, ey + .05 * u], [ex, ey - .08 * u], [ex + .2 * u, ey + .05 * u]], sw * .55, W2, 'ink', .5); return; }
  if (k === 'x') { inkLine([[ex - .14 * u, ey - .1 * u], [ex + .14 * u, ey + .1 * u]], sw * .45, W2, 'ink', 0); inkLine([[ex + .14 * u, ey - .1 * u], [ex - .14 * u, ey + .1 * u]], sw * .45, W2, 'ink', 0); return; }
  const big = ['wide', 'scared', 'blank', 'shine', 'spark'].includes(k), r = (big ? .15 : .1) * u;
  const red = k === 'red' || o.eyeCol === 'red';
  if (red) glow(ex + lx, ey + ly, .5 * u, '#FF4A3A', .9);
  paint(ellPts(ex + lx, ey + ly, r, r * (big ? 1.1 : 1), 8), { wash: red ? '#FF5A45' : W2, ink: null });
  if (['angry', 'determined', 'red'].includes(k)) inkLine([[ex - .3 * u, ey - (s < 0 ? .2 : .02) * u], [ex + .3 * u, ey - (s < 0 ? .02 : .2) * u]], sw * .7, '#1E1B22', 'ink', 0);   // a lid slanting down to the middle
  if (['sad', 'teary', 'nervous'].includes(k)) inkLine([[ex - .3 * u, ey - (s < 0 ? .02 : .2) * u], [ex + .3 * u, ey - (s < 0 ? .2 : .02) * u]], sw * .7, '#1E1B22', 'ink', 0);
}
const MASK_COL = { plate: '#A8A3A0', plateLt: '#C4C0BC', plateDk: '#86817E', rust: '#8A5A40', cap: '#6B4529', capLt: '#87603F', strap: '#5E3E26' };
function metalMaskGear(u, sw, V, hcx, hcy, R, o = {}) {
  const H = { hcx, hcy, R, th: gearTurn(V, u, R) }, kz = (x, y) => lerp(1.08, 1.2, clamp((y / u + 1.45) / 3.2));
  // the plate in profile is cheated toward us (turned 1.2 rad, nudged forward) so it covers the eye and reads as a plate
  const Hm = H.th > 1.2 && !V.back ? { hcx: hcx + .25 * u, hcy, R, th: 1.2 } : H;
  // the leather skullcap: the head's top, down to the ears at the sides, a little lower at the nape
  const capLat = lon => { const a = Math.abs(lon); return a < 1.2 ? lerp(-.62, -.12, a / 1.2) : a < 2 ? lerp(-.12, .05, (a - 1.2) / .8) : lerp(.05, .18, (a - 2) / 1.14); };
  const cap = [], l0 = -Math.PI / 2 - H.th, l1 = Math.PI / 2 - H.th;
  for (let i = 0; i <= 24; i++) { const lon = lerp(l0, l1, i / 24), p = gearPt(H, lon, capLat(lon), 1.07); cap.push([p[0], p[1]]); }
  const e1 = Math.atan2(cap[cap.length - 1][1] - hcy, cap[cap.length - 1][0] - hcx), e0 = Math.atan2(cap[0][1] - hcy, cap[0][0] - hcx);
  let a1 = e0; while (a1 > e1) a1 -= TAU;   // over the top, from the far end back to the near end
  for (let i = 1; i < 16; i++) { const a = lerp(e1, a1, i / 16); cap.push([hcx + Math.cos(a) * R * 1.07, hcy + Math.sin(a) * R * 1.07]); }
  paint(cap, { wash: MASK_COL.cap, ink: PAL.ink, sw: sw * .8 });
  { const S = []; for (let i = 0; i <= 8; i++) { const lon = lerp(-1.0, .2, i / 8) - H.th * .3; const p = gearPt(H, lon, -1.05 + .12 * Math.sin(i / 8 * Math.PI), 1.07); S.push([p[0], p[1]]); } inkLine(S, sw * 1.1, MASK_COL.capLt, 'ink', .5); }   // a sheen on the leather
  { const S = []; for (let i = 0; i <= 10; i++) { const lon = lerp(-1.4, 1.4, i / 10); if (Math.cos(lon + H.th) < .05) continue; const p = gearPt(H, lon, -.95, 1.07); S.push([p[0], p[1]]); } if (S.length > 1) inkLine(S, sw * .4, '#4A3020', 'inkfine', .5); }   // a seam over the crown
  // two leather straps from the cap's sides down to the plate's sides
  for (const s of [-1, 1]) {
    const A = gearWrap(Hm, s * .9 * R, -.35 * u, 1.07), B = gearWrap(Hm, s * 1.6 * u, .8 * u, kz(0, .8 * u));
    if (Math.min(A[2], B[2]) < .02 && s > 0 && !V.back) continue;
    paint(gearStrip([A[0], A[1]], [B[0], B[1]], .35 * u * clamp(.4 + .6 * Math.max(A[2], .3), .4, 1)), { wash: MASK_COL.strap, ink: PAL.ink, sw: sw * .45 });
  }
  if (V.back) return;   // from behind: the cap and the straps
  // the plate: flat bottom with flared corners, a tab at the top centre
  const F = [[-.35, -1.8], [.35, -1.8], [.38, -1.45], [1.55, -1.45], [1.62, 1.5], [1.75, 1.75], [-1.75, 1.75], [-1.62, 1.5], [-1.55, -1.45], [-.38, -1.45]].map(([x, y]) => [x * u, y * u]);
  const plate = gearWrapPts(Hm, densify(gearRound(F, [.12 * u, .12 * u, .05 * u, .3 * u, .1 * u, .08 * u, .08 * u, .1 * u, .3 * u, .05 * u], 3), 2), kz);
  paint(plate, { wash: MASK_COL.plate, ink: PAL.ink, sw: sw * .85 });
  paint(gearWrapPts(Hm, [[-1.4 * u, -1.3 * u], [-.6 * u, -1.3 * u], [-.95 * u, 1.55 * u], [-1.5 * u, 1.55 * u]], kz), { wash: MASK_COL.plateLt, washOp: 130, ink: null });   // the light catching one side
  paint(gearWrapPts(Hm, [[1.1 * u, -1.3 * u], [1.5 * u, -1.3 * u], [1.6 * u, 1.6 * u], [1.25 * u, 1.6 * u]], kz), { wash: MASK_COL.plateDk, washOp: 120, ink: null });
  for (const [x, y, r] of [[1.0, .75, .26], [-1.05, 1.25, .2], [.25, -1.1, .14]]) { const p = gearWrap(Hm, x * u, y * u, kz(0, y * u)); if (p[2] > .1) paint(ellPts(p[0], p[1], r * u * clamp(p[2], .4, 1), r * u * .8, 8, r * u * .2), { wash: MASK_COL.rust, washOp: 200, ink: null }); }   // rust spots
  for (const [x, y] of [[-1.3, -1.1], [1.3, -1.1], [-1.35, 1.45], [1.35, 1.45], [0, -1.62]]) { const p = gearWrap(Hm, x * u, y * u, kz(0, y * u)); if (p[2] > .15) paint(ellPts(p[0], p[1], .09 * u, .09 * u, 6), { wash: '#6E6865', ink: null }); }   // rivets
  // eye slits, and the eyes in them
  const e = o.eyes || 'normal', kinds = Array.isArray(e) ? e : [e, e];
  for (const s of [-1, 1]) {
    const ex = s * .8 * u, c = gearWrap(Hm, ex, -.17 * u, kz(0, -.17 * u)), f = clamp(c[2], 0, 1);
    if (f < .2) continue;
    paint(gearWrapPts(Hm, gearRound([[ex - .33 * u, -.4 * u], [ex + .33 * u, -.4 * u], [ex + .33 * u, .04 * u], [ex - .33 * u, .04 * u]], .14 * u, 3), kz), { wash: '#1E1B22', ink: PAL.ink, sw: sw * .4 });
    push(); translate(c[0], c[1]); scale(clamp(f * 1.1, .45, 1), 1); maskEye(.02 * u, -.02 * u, u, sw, (o.squint || 0) > .8 ? 'closed' : kinds[s < 0 ? 0 : 1], s, o); pop();
  }
}

// ---------- hazmat suit (references: hazmatsuit icon, in-game shot refimg/uw/db_02.jpg) ----------
// A mustard-yellow coverall; a soft red cloth hood (a rounded monk hood, taller than wide) that flows into a cape over the
// shoulders with a torn hem; a near-square dark visor with duct tape on its top corner and a taped X with the hose fitting
// below it; a black corrugated hose looping down the chest, a grey-green hose from the belt, black backpack straps, an
// irregular blue panel on the chest, a black cord belt. One black rubber gauntlet and one blue glove; dark boots.
const HAZ = { suit: '#C9A13A', suitDk: '#A8852C', hood: '#C0412E', hoodDk: '#8E2E22', hoodLt: '#D86A55', visor: '#2B2A2E', visorLt: '#8C8C91',
  tape: '#9A9A96', metal: '#7E848A', hose: '#1E1D20', hose2: '#7F8A78', patch: '#3560AE', patchLt: '#5A84C6', belt: '#1E1D20', strap: '#1E1D20',
  boot: '#2B2E2A', bootDk: '#1E201D', bootBand: '#D6B23A', gloveA: '#2A2729', gloveB: '#6FA6DA' };
// Where a front-view point on the torso lands in each view (x in u from the body's centre line, as seen from the front;
// + = the wearer's left). 3/4 and profile squeeze it and push it forward (the chest is toward +x).
const gearBodyX = (V, x, u) => V === SV.side ? (.45 + x * .42) * u : V === SV.q ? (.3 + x * .72) * u : V.back ? -x * u : x * u * (V.torsoW || 1);
function hazmatBodyGear(u, sw, V, tw, shY, wy) {
  const X = x => gearBodyX(V, x, u), hipY = wy + .75 * u;
  if (!V.back) {
    // the irregular blue panel on the wearer's right chest (it peeks out under the cape's hem), two grey tape strips on it
    if (V !== SV.side || true) {
      const P = [[-1.18, 1.78], [-.7, 1.7], [-.12, 1.84], [-.08, 2.45], [-.12, 3.06], [-.6, 2.98], [-1.1, 3.08], [-1.22, 2.5]].map(([x, y]) => [X(x), shY + y * u]);
      paint(P, { wash: HAZ.patch, ink: mixCol(HAZ.patch, PAL.ink, .5), sw: sw * .4 });
      paint([[X(-.92), shY + 2.0 * u], [X(-.55), shY + 1.95 * u], [X(-.85), shY + 2.35 * u]], { wash: HAZ.patchLt, washOp: 200, ink: null });
      paint([[X(-.8), shY + 2.75 * u], [X(-.3), shY + 2.65 * u], [X(-.45), shY + 2.95 * u]], { wash: HAZ.patchLt, washOp: 160, ink: null });
      for (const [a, b] of [[[-1.15, 2.25], [-.4, 2.4]], [[-1.0, 2.88], [-.3, 2.66]]]) paint(gearStrip([X(a[0]), shY + a[1] * u], [X(b[0]), shY + b[1] * u], .17 * u), { wash: HAZ.tape, ink: mixCol(HAZ.tape, PAL.ink, .5), sw: sw * .3 });
    }
    // baggy folds: on the belly and at the crotch
    inkLine([[X(.35), wy - .75 * u], [X(.9), wy - .45 * u], [X(1.3), wy - .55 * u]], sw * .5, HAZ.suitDk, 'inkfine', .5);
    inkLine([[X(.6), wy - .35 * u], [X(1.15), wy - .1 * u]], sw * .45, HAZ.suitDk, 'inkfine', .5);
    if (!V.side) { inkLine([[X(-.15), wy + .35 * u], [X(-.35), hipY + .2 * u], [X(-.25), hipY + .5 * u]], sw * .5, HAZ.suitDk, 'inkfine', .5); inkLine([[X(.25), wy + .4 * u], [X(.5), hipY + .25 * u]], sw * .45, HAZ.suitDk, 'inkfine', .5); }
    else inkLine([[X(.6), wy + .4 * u], [X(.3), hipY + .4 * u]], sw * .45, HAZ.suitDk, 'inkfine', .5);
    // the grey-green hose: from the belt on the wearer's right hip up into the blue panel
    if (V !== SV.side) gearHose([[X(-1.3), wy + .1 * u], [X(-1.15), wy - .4 * u], [X(-.95), shY + 2.98 * u]], .24 * u, HAZ.hose2, '#B4BDA8', .22 * u, sw);
    else gearHose([[X(-.6), wy + .1 * u], [X(-.2), wy - .6 * u], [X(.2), shY + 2.75 * u]], .24 * u, HAZ.hose2, '#B4BDA8', .22 * u, sw);
  } else {
    inkLine([[X(-.4), wy - .9 * u], [X(.2), wy - .5 * u], [X(.8), wy - .7 * u]], sw * .5, HAZ.suitDk, 'inkfine', .5);
    inkLine([[0, wy + .3 * u], [.1 * u, hipY + .45 * u]], sw * .5, HAZ.suitDk, 'inkfine', .5);
  }
  // the belt: a black cord tied in a knot, two ends hanging
  const bx0 = -tw * .97, bx1 = tw * .97;
  paint(ribbon([[bx0, wy - .1 * u], [0, wy - .02 * u], [bx1, wy - .1 * u]], .2 * u), { wash: HAZ.belt, ink: PAL.ink, sw: sw * .35 });
  if (!V.back) {
    const kx = X(.25);
    paint(ellPts(kx, wy - .06 * u, .17 * u, .14 * u, 10), { wash: HAZ.belt, ink: PAL.ink, sw: sw * .35 });
    inkLine([[kx - .05 * u, wy + .05 * u], [kx - .14 * u, wy + .6 * u], [kx - .08 * u, wy + 1.0 * u]], sw * .8, HAZ.belt, 'ink', .5);
    inkLine([[kx + .07 * u, wy + .05 * u], [kx + .2 * u, wy + .5 * u], [kx + .26 * u, wy + .78 * u]], sw * .8, HAZ.belt, 'ink', .5);
  }
}
// The hood and its cape as one outline (the hood a rounded monk hood, a little narrower at the top; the cape over the
// shoulder caps, then down to a torn hem). Shared by hazmatHeadGear and hazmatCapeOver.
function hazmatCapeOutline(u, V, hcx, hcy, shY) {
  const back = !!V.back, th = gearTurn(V, u, 2.35 * u), tw = 2.1 * u * (V.torsoW || 1), cw = tw + .2 * u, ox = back ? 0 : Math.sin(th) * .3 * u, hemY = shY + 1.75 * u;
  const H = { th };
  const hoodR = [[0, -3.05], [1.15, -2.98], [1.95, -2.55], [2.38, -1.7], [2.48, -.4], [2.42, 1.0], [2.2, 1.95], [1.8, 2.5]];
  const side = s => through(hoodR.map(([x, y]) => [hcx + ox + s * x * u * (s > 0 ? 1 : 1 - .06 * Math.sin(H.th)), hcy + y * u]), 4);
  const cs = tw + .25 * u;   // over the shoulder caps
  const right = side(1).concat(through([[hcx + ox + 1.8 * u, hcy + 2.5 * u], [cs - .35 * u, shY - .02 * u], [cs, shY + .25 * u], [cs + .02 * u, shY + .9 * u], [cw + .02 * u, shY + 1.5 * u], [cw, hemY - .1 * u]], 4).slice(1));
  const left = side(-1).concat(through([[hcx + ox - 1.8 * u, hcy + 2.5 * u], [-cs + .35 * u, shY - .02 * u], [-cs, shY + .25 * u], [-cs - .02 * u, shY + .9 * u], [-cw - .02 * u, shY + 1.5 * u], [-cw, hemY - .1 * u]], 4).slice(1));
  const hem = []; for (let i = 0; i <= 10; i++) hem.push([lerp(cw, -cw, i / 10) + (hash(i + 3) - .5) * .12 * u, hemY + (i % 2 ? .26 + .1 * hash(i) : -.08 - .06 * hash(i + 7)) * u]);
  return right.concat(hem.slice(1, -1), left.slice().reverse());
}
const gearInside = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
// The hood and cape, the visor, the hoses and straps (drawn after the torso, as one piece with no ink at the neck)
function hazmatHeadGear(u, sw, o, V, hcx, hcy, R, shY) {
  const H = { hcx, hcy, R, th: gearTurn(V, u, R) }, back = !!V.back, turned = !!V.side;
  const tw = 2.1 * u * (V.torsoW || 1), wy = shY + 3.2 * u, cw = tw + .2 * u, ox = back ? 0 : Math.sin(H.th) * .3 * u, hemY = shY + 1.75 * u;
  // in profile the window is cheated a little toward us (turned 1.2 rad, not π/2) so it still reads as a window
  const Hf = H.th > 1.2 && !back ? { hcx: hcx + .45 * u, hcy, R, th: 1.2 } : H;
  const outline = hazmatCapeOutline(u, V, hcx, hcy, shY);
  // the backpack straps go under the cape (they show below its hem)
  const X = x => gearBodyX(V, x, u);
  if (back) for (const s of [-1, 1]) paint(gearStrip([s * tw * .5, shY - .05 * u], [s * tw * .42, shY + 2.4 * u], .3 * u), { wash: HAZ.strap, ink: PAL.ink, sw: sw * .4 });
  else for (const s of V === SV.side ? [-.55] : [-1, 1]) { const x0 = V === SV.side ? s * u : X(s * 1.22), x1 = V === SV.side ? s * u - .1 * u : X(s * 1.3); paint(gearStrip([x0, shY - .15 * u], [x1, shY + 2.9 * u], .3 * u), { wash: HAZ.strap, ink: PAL.ink, sw: sw * .4 }); }
  paint(outline, { wash: HAZ.hood, ink: PAL.ink, sw: sw * .85 });
  // shading and folds: a darker underside of the hood, folds down the cape
  for (const s of [-1, 1]) inkLine([[hcx + ox + s * 2.0 * u, hcy + .3 * u], [hcx + ox + s * 1.85 * u, hcy + 1.65 * u], [hcx + ox + s * 1.35 * u, hcy + 2.35 * u]], sw * .55, HAZ.hoodDk, 'inkfine', .5);
  for (const [x0, x1, y1] of [[-1.25, -1.45, 1.7], [-.35, -.3, 1.8], [.85, 1.1, 1.75], [1.6, 1.8, 1.5]]) inkLine([[x0 * cw / 2.3, shY + .45 * u], [x1 * cw / 2.3, shY + y1 * u]], sw * .45, HAZ.hoodDk, 'inkfine', .5);
  paint(ellPts(hcx + ox - .9 * u, hcy - 2.35 * u, .75 * u, .28 * u, 10, 0, -.45), { wash: HAZ.hoodLt, washOp: 120, ink: null });   // the cloth's sheen
  for (let i = 0; i < 6; i++) { const x = lerp(-.4, 1.9, hash(i + 40)) * cw / 2.3, y = hemY + (-.55 + .5 * hash(i + 50)) * u; paint(ellPts(x, y, (.07 + .07 * hash(i + 60)) * u, (.05 + .05 * hash(i + 70)) * u, 6, .02 * u), { wash: '#D9B23E', ink: null }); }   // yellow paint flecks
  if (back) {   // folds on the back of the hood, and the backpack straps over the cape to a small pack
    inkLine([[hcx - .3 * u, hcy - 2.7 * u], [hcx - .1 * u, hcy - .5 * u], [hcx + .2 * u, hcy + 1.9 * u]], sw * .5, HAZ.hoodDk, 'inkfine', .5);
    inkLine([[hcx + 1.2 * u, hcy - 2.0 * u], [hcx + 1.45 * u, hcy + .6 * u]], sw * .45, HAZ.hoodDk, 'inkfine', .5);
    inkLine([[hcx - 1.5 * u, hcy - 1.6 * u], [hcx - 1.6 * u, hcy + 1.4 * u]], sw * .45, HAZ.hoodDk, 'inkfine', .5);
    paint(rrPts(-1.0 * u, shY + 2.0 * u, 2.0 * u, 1.15 * u, .25 * u), { wash: '#2A2A2C', ink: PAL.ink, sw: sw * .6 });
    inkLine([[-.7 * u, shY + 2.45 * u], [.7 * u, shY + 2.45 * u]], sw * .4, '#4A4A4E', 'inkfine', 0);
    return;
  }
  // the visor: a near-square dark window, slightly wider at the top, set in the hood
  const vk = 1.12, vis = gearRound([[-1.65 * u, -1.4 * u], [1.65 * u, -1.4 * u], [1.45 * u, 1.5 * u], [-1.45 * u, 1.5 * u]], .5 * u, 4);
  const rim = gearRound([[-1.95 * u, -1.72 * u], [1.95 * u, -1.72 * u], [1.72 * u, 1.85 * u], [-1.72 * u, 1.85 * u]], .7 * u, 4);
  paint(gearWrapPts(Hf, densify(rim, 2), 1.1), { wash: HAZ.hoodDk, washOp: 150, ink: null });   // the hood's opening, in shadow
  const VP = gearWrapPts(Hf, densify(vis, 2), vk);
  paint(VP, { wash: HAZ.visor, ink: PAL.ink, sw: sw * .85 });
  // the face behind it, only just visible (no glints), so he can still emote a little
  const e = o.eyes || 'normal', kinds = Array.isArray(e) ? e : [e, e], ghost = mixCol(HAZ.visor, '#D8D4CC', .2);
  for (const s of [-1, 1]) {
    const p = gearWrap(Hf, s * .72 * u, -.1 * u, .98); if (p[2] < .25) continue;
    const k = kinds[s < 0 ? 0 : 1], f = clamp(p[2], .4, 1);
    if (['happy', 'closed', 'sleepy', 'squeeze', 'cry'].includes(k) || (o.squint || 0) > .8) inkLine([[p[0] - .22 * u * f, p[1] + .05 * u], [p[0], p[1] - .08 * u], [p[0] + .22 * u * f, p[1] + .05 * u]], sw * .5, ghost, 'inkfine', .5);
    else paint(ellPts(p[0] + (o.lookX || 0) * .1 * u, p[1] + (o.lookY || 0) * .06 * u, .15 * u * f, .2 * u, 8), { wash: ghost, ink: null });
  }
  paint(gearWrapPts(Hf, [[.45 * u, -1.25 * u], [.95 * u, -1.25 * u], [.05 * u, .55 * u], [-.4 * u, .55 * u]], vk), { wash: HAZ.visorLt, washOp: 120, ink: null });   // one diagonal highlight
  paint(gearWrapPts(Hf, [[1.1 * u, -1.1 * u], [1.3 * u, -1.1 * u], [.85 * u, -.2 * u], [.68 * u, -.2 * u]], vk), { wash: HAZ.visorLt, washOp: 90, ink: null });
  // duct tape across the top-left corner; a taped X with the metal fitting at the bottom
  const tape = (A, B, w) => paint(gearWrapPts(Hf, densify(gearStrip(A.map(v => v * u), B.map(v => v * u), w * u), 3), vk + .01), { wash: HAZ.tape, ink: mixCol(HAZ.tape, PAL.ink, .55), sw: sw * .35 });
  if (Hf.th > 1) tape([-.75, -1.3], [-1.95, -.7], .42);   // profile: one end on the visor, wrapping round its near edge
  else tape([-2.05, -.65], [-.85, -1.85], .42);
  tape([-.5, 1.25], [.5, 2.05], .3); tape([.5, 1.25], [-.5, 2.05], .3);
  const fit = gearWrap(Hf, 0, 1.68 * u, 1.18);
  paint(ellPts(fit[0], fit[1], .26 * u * clamp(fit[2], .5, 1), .22 * u, 10), { wash: HAZ.metal, ink: PAL.ink, sw: sw * .45 });
  // the black corrugated hose: from the fitting down the chest in a U and back up under the strap on the wearer's left
  const fx = fit[0], fy = fit[1] + .2 * u;
  const hp = V === SV.side
    ? [[fx, fy], [fx - .1 * u, shY + .5 * u], [X(1.2), shY + 1.9 * u], [X(.3), wy - .7 * u], [X(-.6), wy - 1.0 * u], [X(-.9), shY + 1.4 * u], [X(-1.0), shY + .2 * u]]
    : [[fx, fy], [fx + .05 * u, shY + .5 * u], [X(.02), shY + 1.6 * u], [X(-.05), shY + 2.5 * u], [X(.28), shY + 2.95 * u], [X(.6), shY + 2.6 * u], [X(.75), shY + 1.4 * u], [X(.8), shY + .2 * u], [X(.72), shY - .25 * u]];
  gearHose(hp, .28 * u, HAZ.hose, '#5A595F', .25 * u, sw);
  if (V !== SV.side) { const e = hp[hp.length - 1]; paint(rrPts(e[0] - .2 * u, e[1] - .12 * u, .4 * u, .24 * u, .08 * u), { wash: HAZ.metal, ink: PAL.ink, sw: sw * .4 }); }   // where it plugs into the hood
}

// The hood's cape over the tops of the near sleeves (survivor.js draws the near arms after suitHeadGear, so this goes
// after them): a red cap over each near shoulder, down to about shY + .9u, with a torn edge. It shrinks away as the arm
// rises (a raised arm comes out from under it). Call: if (gear.hazmat) hazmatCapeOver(u, sw, o, V, shY);
function hazmatCapeOver(u, sw, o, V, shY) {
  const sy = shY + .6 * u, r = .63 * u, turned = !!V.side, C = hazmatCapeOutline(u, V, 0, shY - 2.5 * u, shY);
  for (const w of V.near) {
    const sideSign = V.side ? 1 : (w === 'R' ? 1 : -1);
    const sx = typeof shoulderX === 'function' ? shoulderX(V, sideSign, false, u) : sideSign * 1.8 * u * (V.torsoW || 1);
    const a = o.rawArms ? ((w === 'L' ? o.aL : o.aR) ?? -1.32) : (typeof humanArm === 'function' ? humanArm((w === 'L' ? o.aL : o.aR) ?? .2) : -1.32);
    const k = clamp((-a - .25) / .75, 0, 1); if (k < .15) continue;   // 1 = arm hanging, 0 = raised to level
    const s = turned ? -1 : sideSign, R2 = r + .14 * u, drop = (.3 + .35 * k) * u;   // s: the outer side (toward the back in 3/4 and profile)
    const arc = []; for (let i = 0; i <= 10; i++) { const t = lerp(-Math.PI / 2 - s * .9, -Math.PI / 2 + s * 1.45, i / 10); arc.push([sx + Math.cos(t) * R2, sy + Math.sin(t) * R2 * .95]); }
    const ox = sx + s * (turned ? .6 * u : R2 + .02 * u), ix = sx - s * .54 * u, hem = [];   // the hem spans the sleeve
    for (let i = 0; i <= 4; i++) hem.push([lerp(ox, ix, i / 4), sy + drop + (i % 2 ? .18 : i === 4 ? .1 : -.04) * u * k + (i === 4 ? 0 : (hash(i + (w === 'L' ? 5 : 9)) - .5) * .08 * u)]);   // ends level on the sleeve's inner edge
    const P = arc.concat([[ox, sy + .2 * u]], hem, [[ix - s * .2 * u, sy - .1 * u]]);
    paint(P, { wash: HAZ.hood, ink: null });
    // ink: the shoulder's outline only where it sticks out past the hood and cape, then the torn hem; nothing where the
    // drape meets the cape, so it all reads as one cloth
    const A = arc.concat([[ox, sy + .2 * u]]), outside = p => !gearInside(C, p[0], p[1] + .02 * u);
    let i0 = A.length; while (i0 > 0 && outside(A[i0 - 1])) i0--;   // only the run that reaches the outer side, never a stray flick
    // front and back: start the stroke at the hood/cape junction so it runs on over the cape's own shoulder line (two
    // tapered stroke ends meeting there leave a gap that reads as a flick)
    const run = A.length - i0 > 1 ? (turned ? [] : [[s * 1.75 * u, shY + .02 * u]]).concat(A.slice(i0)) : [];
    const out = run.length ? run.concat(hem) : hem;
    inkLine(out, sw * .8, PAL.ink, 'ink', .3);
    inkLine([[sx + s * .1 * u, sy - .35 * u], [sx + s * .35 * u, sy + drop * .7]], sw * .4, HAZ.hoodDk, 'inkfine', .5);   // a fold
    paint(ellPts(sx + s * .3 * u, sy + drop * .55, .06 * u, .05 * u, 6), { wash: '#D9B23E', ink: null });   // a paint fleck
  }
}

// ---------- scientist suits (references: hazmatsuit_scientist_peacekeeper, _arctic, _naval, _nvgm, oubreak_scientist) ----------
// A full coverall in the variant colour with a hood of the same fabric (a rounded rect, taller than wide). Inside it a
// black rubber full-face mask with one wide dark visor band (a small white mark at its top), narrowing to the chin, and one
// big round filter canister on the wearer's left at chin level; a coiled hose over the shoulder. Black harness straps,
// a radio puck on the left strap, a belt with a holster and pouches. Black gloves and boots.
// SCI[k] is the suit colour (survivor.js reads it); SCI_DK[k] a darker shade for seams, gloves' cuffs and boots.
const SCI = { peacekeeper: '#4A4E3E', arctic: '#C9CBCB', naval: '#4F5E6E', nvgm: '#2B2B2F', outbreak: '#3D84C4', heavy: '#2E2E27' };
const SCI_DK = { peacekeeper: '#34372B', arctic: '#9C9EA0', naval: '#38434F', nvgm: '#1C1C1F', outbreak: '#2B6098', heavy: '#1F1F1A' };
const SCI_CAMO = { arctic: '#8E9092', naval: '#38434F' };
const SCI_WEB = '#1E1D21', SCI_MASK = '#1C1C1F', SCI_VISOR = '#121215', SCI_GLINT = '#6E7880';
// The colours survivor.js should use for a suit: { suit, dk, glove: [L, R], boot, bootDk } (null when no suit is worn).
function suitCols(gear = {}) {
  if (gear.hazmat) return { suit: HAZ.suit, dk: HAZ.suitDk, glove: [HAZ.gloveA, HAZ.gloveB], boot: HAZ.boot, bootDk: HAZ.bootDk };
  if (gear.scientist) {
    const k = SCI[gear.scientist] ? gear.scientist : 'peacekeeper';
    if (k === 'heavy') return { suit: SCI.heavy, dk: SCI_DK.heavy, glove: ['#24241F', '#24241F'], boot: '#262620', bootDk: '#171713' };
    return { suit: SCI[k], dk: SCI_DK[k], glove: ['#1F1E22', '#1F1E22'], boot: '#1E1D21', bootDk: '#121114' };
  }
  return null;
}
const sciKey = gear => SCI[gear.scientist] ? gear.scientist : 'peacekeeper';
// survivor.js should pass gear (8th argument). Called without it (the old call), it draws nothing and suitHeadGear draws
// the body details itself, before the hood, so the variant is always right.
let SCI_BODY_DONE = false;
function scientistBodyGear(u, sw, V, tw, shY, wy, bw, gear) {
  if (!gear) { SCI_BODY_DONE = false; return; }
  SCI_BODY_DONE = true;
  const k = sciKey(gear), X = x => gearBodyX(V, x, u), suit = SCI[k], dk = SCI_DK[k], hipY = wy + .75 * u;
  if (k === 'heavy') return heavyBodyGear(u, sw, V, tw, shY, wy);
  if (SCI_CAMO[k]) gearCamo(0, (shY + wy) / 2, tw * .85, (wy - shY) * .45, SCI_CAMO[k], 'camo' + k, 9, u);
  if (!V.back) {
    // seams and a chest pocket, a darker crotch fold
    inkLine([[X(0), shY + .5 * u], [X(0), wy - .1 * u]], sw * .4, dk, 'inkfine', 0);
    paint(rrPts(X(-1.2), shY + 1.0 * u, .8 * u * (V.side ? .6 : 1), .6 * u, .1 * u), { wash: dk, washOp: 120, ink: null });
    if (!V.side) inkLine([[0, wy + .3 * u], [-.2 * u, hipY + .45 * u]], sw * .45, dk, 'inkfine', .5);
  }
  // the belt, a holster on the wearer's right hip, pouches
  paint(rectPts(-tw * .96, wy - .45 * u, tw * 1.92, .5 * u), { wash: SCI_WEB, ink: PAL.ink, sw: sw * .5 });
  paint(rectPts(X(-.15) - .2 * u, wy - .42 * u, .4 * u, .42 * u), { wash: '#5A5A5E', ink: PAL.ink, sw: sw * .35 });   // the buckle
  if (V.back) { for (const s of [-1, 1]) paint(rrPts(s * tw * .5 - .38 * u, wy - .3 * u, .76 * u, .75 * u, .12 * u), { wash: '#2C2B30', ink: PAL.ink, sw: sw * .4 }); return; }
  const hol = X(-1.55), pou = [X(-.75), X(.85), X(1.5)];
  for (const px of pou) if (Math.abs(px) < tw * 1.0) paint(rrPts(px - .3 * u, wy - .35 * u, .6 * u, .72 * u, .1 * u), { wash: '#2C2B30', ink: PAL.ink, sw: sw * .4 });
  if (V !== SV.side || true) paint(rrPts(hol - .3 * u, wy - .3 * u, .6 * u, 1.55 * u, .14 * u), { wash: '#232226', ink: PAL.ink, sw: sw * .45 });   // holster
}
// the heavy scientist (scientistsuit_heavy): an olive-black bomb suit with a front armour plate, webbing rows, a lighter
// groin flap and belt pouches
function heavyBodyGear(u, sw, V, tw, shY, wy) {
  const X = x => gearBodyX(V, x, u), base = SCI.heavy, plate = '#3A3A31', web = '#1C1C17', flap = '#5C5A4C';
  if (V.back) {
    paint(rrPts(-tw * .75, shY + .6 * u, tw * 1.5, wy - shY - .8 * u, .4 * u), { wash: plate, ink: PAL.ink, sw: sw * .6 });
    paint(rectPts(-tw * .97, wy - .5 * u, tw * 1.94, .55 * u), { wash: web, ink: PAL.ink, sw: sw * .5 });
    for (const s of [-1, 1]) paint(rrPts(s * tw * .55 - .4 * u, wy - .35 * u, .8 * u, .85 * u, .12 * u), { wash: '#33332B', ink: PAL.ink, sw: sw * .45 });
    return;
  }
  // the groin flap (over the crotch, down to mid-thigh)
  const fc = X(0), fw = (V.side ? .7 : 1.0) * u;
  paint(gearRound([[fc - fw, wy - .2 * u], [fc + fw, wy - .2 * u], [fc + fw * .9, wy + 1.9 * u], [fc, wy + 2.25 * u], [fc - fw * .9, wy + 1.9 * u]], [.1 * u, .1 * u, .5 * u, .6 * u, .5 * u], 4), { wash: flap, ink: PAL.ink, sw: sw * .6 });
  inkLine([[fc - fw * .6, wy + .4 * u], [fc - fw * .5, wy + 1.6 * u]], sw * .4, '#47463A', 'inkfine', .5);
  // the front armour plate with webbing rows
  const pw = (V.side ? .55 : .66) * tw, pc = V === SV.side ? X(.6) : X(0);
  paint(gearRound([[pc - pw, shY + .55 * u], [pc + pw, shY + .55 * u], [pc + pw * 1.05, wy - .3 * u], [pc - pw * 1.05, wy - .3 * u]], .45 * u, 4), { wash: plate, ink: PAL.ink, sw: sw * .65 });
  paint(rectPts(pc - pw * .8, shY + .8 * u, pw * .5, .9 * u), { wash: '#4A4A3F', washOp: 120, ink: null });
  for (let i = 0; i < 6; i++) {
    const y = shY + (1.25 + i * .3) * u, x0 = pc - pw * .72, x1 = pc + pw * .72;
    paint(rectPts(x0, y, x1 - x0, .15 * u), { wash: web, ink: null });
    for (const t of [.33, .66]) inkLine([[lerp(x0, x1, t), y - .02 * u], [lerp(x0, x1, t), y + .17 * u]], sw * .3, '#55554A', 'inkfine', 0);
  }
  // the belt with pouches
  paint(rectPts(-tw * .97, wy - .5 * u, tw * 1.94, .55 * u), { wash: web, ink: PAL.ink, sw: sw * .5 });
  for (const px of V.side ? [X(-.9), X(.9)] : [X(-1.55), X(-.95), X(.95), X(1.55)]) paint(rrPts(px - .3 * u, wy - .55 * u, .6 * u, .9 * u, .1 * u), { wash: '#33332B', ink: PAL.ink, sw: sw * .45 });
}
// The scientist's (or heavy scientist's) head: hood, mask, visor, filter, hose; then the harness over the shoulders.
function scientistHeadGear(u, sw, o, V, hcx, hcy, R, shY, gear) {
  const k = sciKey(gear);
  if (!SCI_BODY_DONE) scientistBodyGear(u, sw, V, 2.1 * u * (V.torsoW || 1), shY, shY + 3.2 * u, 2.05 * u * (V.torsoW || 1), gear);
  SCI_BODY_DONE = false;
  if (k === 'heavy') return heavyHeadGear(u, sw, o, V, hcx, hcy, R, shY);
  const H0 = { hcx, hcy, R, th: gearTurn(V, u, R) }, back = !!V.back, suit = SCI[k], dk = SCI_DK[k];
  const tw = 2.1 * u * (V.torsoW || 1), ox = back ? 0 : Math.sin(H0.th) * .2 * u, X = x => gearBodyX(V, x, u);
  // in profile the face is cheated a little toward us (1.2 rad, not π/2) so the mask, visor and filter still read
  const H = H0.th > 1.2 && !back ? { hcx: hcx + .4 * u, hcy, R, th: 1.2 } : H0;
  // the hood: suit fabric, a rounded rect taller than wide, its bottom running into the shoulders (no ink there)
  const hoodR = [[0, -3.0], [1.1, -2.95], [1.85, -2.55], [2.3, -1.7], [2.4, -.4], [2.36, 1.1], [2.2, 2.0]];
  const sideP = s => through(hoodR.map(([x, y]) => [hcx + ox + s * x * u, hcy + y * u]), 4);
  const R_ = sideP(1).concat(through([[hcx + ox + 2.2 * u, hcy + 2.0 * u], [tw * .9, shY + .1 * u], [tw * .98, shY + .55 * u]], 4).slice(1));
  const L_ = sideP(-1).concat(through([[hcx + ox - 2.2 * u, hcy + 2.0 * u], [-tw * .9, shY + .1 * u], [-tw * .98, shY + .55 * u]], 4).slice(1));
  const hood = R_.concat(L_.slice().reverse());
  paint(hood, { wash: suit, ink: null });
  inkLine(R_.slice().reverse().concat(L_.slice(1)), sw * .85, PAL.ink, 'ink', 0);
  if (SCI_CAMO[k]) gearCamo(hcx + ox, hcy - 1.2 * u, 1.9 * u, 1.4 * u, SCI_CAMO[k], 'hood' + k, 7, u);
  paint(ellPts(hcx + ox - .8 * u, hcy - 2.3 * u, .7 * u, .26 * u, 10, 0, -.4), { wash: mixCol(suit, '#FFFFFF', .25), washOp: 110, ink: null });   // sheen
  for (const s of [-1, 1]) inkLine([[hcx + ox + s * 1.95 * u, hcy + .2 * u], [hcx + ox + s * 1.85 * u, hcy + 1.6 * u], [hcx + ox + s * 1.5 * u, hcy + 2.3 * u]], sw * .5, dk, 'inkfine', .5);   // folds
  if (back) {
    inkLine([[hcx, hcy - 2.6 * u], [hcx + .1 * u, hcy + 2.2 * u]], sw * .45, dk, 'inkfine', .5);   // the hood's back seam
    for (const s of [-1, 1]) paint(gearStrip([s * tw * .5, shY - .05 * u], [s * tw * .42, shY + 3.0 * u], .32 * u), { wash: SCI_WEB, ink: PAL.ink, sw: sw * .4 });   // harness
    gearHose([[X(1.35), shY - .2 * u], [X(1.15), shY + .9 * u], [X(.75), shY + 2.0 * u], [X(.55), shY + 2.75 * u]], .22 * u, '#232227', '#55545C', .16 * u, sw);   // the hose over the shoulder, down to a canister pouch
    paint(rrPts(X(.55) - .35 * u, shY + 2.6 * u, .7 * u, .75 * u, .14 * u), { wash: '#2C2B30', ink: PAL.ink, sw: sw * .45 });
    return;
  }
  // the filter on the wearer's left at chin level; in profile it pokes out past the face, behind the mask
  const fl = .35, fla = .55, fp = gearPt(H, fl, fla, 1, 1.45), fsx = clamp(Math.cos(fl + H.th) * 1.2, .5, 1), fr = .62 * u;
  const filter = () => {   // a big round canister: its body toward the mask, its face (a pale rim round a dark grille) forward
    const c = gearPt(H, fl * .8, fla - .03, 1, 1.15), bx = lerp(c[0], fp[0], .45), by = lerp(c[1], fp[1], .45);
    paint(ellPts(bx, by, fr * .95 * Math.max(fsx, .7), fr * .95, 16), { wash: '#5E6458', ink: PAL.ink, sw: sw * .55 });
    paint(ellPts(fp[0], fp[1], fr * fsx, fr, 18), { wash: '#8E9488', ink: PAL.ink, sw: sw * .65 });
    paint(ellPts(fp[0] + .03 * u * fsx, fp[1] + .03 * u, fr * .58 * fsx, fr * .58, 14), { wash: '#2A2C28', ink: PAL.ink, sw: sw * .35 });
    for (const dy of [-.14, 0, .14]) inkLine([[fp[0] - .2 * u * fsx, fp[1] + (dy + .03) * u], [fp[0] + .25 * u * fsx, fp[1] + (dy + .03) * u]], sw * .3, '#4E524A', 'inkfine', 0);   // the grille
    paint(ellPts(fp[0] - .32 * u * fsx, fp[1] - .32 * u, .14 * u * fsx, .08 * u, 6, 0, -.6), { wash: '#C2C7BA', ink: null });
  };
  if (fp[2] < .15) filter();
  // the black rubber mask: wide across the eyes, narrowing to the chin
  const MF = [[0, -1.5], [1.0, -1.48], [1.6, -1.2], [1.75, -.3], [1.62, .6], [1.2, 1.5], [.6, 2.0], [0, 2.12], [-.6, 2.0], [-1.2, 1.5], [-1.62, .6], [-1.75, -.3], [-1.6, -1.2], [-1.0, -1.48]];
  paint(gearWrapPts(H, through(MF.map(([x, y]) => [x * u, y * u]).concat([[0, -1.5 * u]]), 3), 1.05), { wash: SCI_MASK, ink: PAL.ink, sw: sw * .8 });
  // one wide dark visor band, a cool glint, a small white mark at its top centre
  paint(gearPanel(H, -.7, .7, -.35, .12, 1.08), { wash: SCI_VISOR, ink: PAL.ink, sw: sw * .55 });
  const g = [[-.55, -.3], [-.32, -.3], [-.48, .06], [-.66, .06]].map(([lo, la]) => { const p = gearPtC(H, lo, la, 1.09); return [p[0], p[1]]; });
  paint(g, { wash: SCI_GLINT, washOp: 200, ink: null });
  { const a = gearPt(H, 0, -.3, 1.09), b = gearPt(H, 0, -.19, 1.09); if (a[2] > .3) paint(gearStrip([a[0], a[1]], [b[0], b[1]], .11 * u), { wash: '#E8E8E4', ink: null }); }   // the small white mark
  // the night-vision mount on the hood above the visor
  if (k === 'nvgm') {
    const m = gearPt(H, 0, -.72, 1.05, 1.12), w = clamp(Math.cos(H.th), .45, 1);
    paint(rrPts(m[0] - .5 * u * w, m[1] - .28 * u, 1.0 * u * w, .5 * u, .1 * u), { wash: '#3A3A3F', ink: PAL.ink, sw: sw * .5 });
    const t = gearPt(H, 0, -.78, 1.05, 1.32);
    for (const s of V.side ? [0] : [-1, 1]) paint(ellPts(t[0] + s * .28 * u * w, t[1] - .02 * u, .2 * u * (V.side ? .7 : 1), .2 * u, 10), { wash: '#26262A', ink: PAL.ink, sw: sw * .45 });
    if (V.side) paint(rrPts(t[0] - .05 * u, t[1] - .2 * u, .6 * u, .38 * u, .08 * u), { wash: '#26262A', ink: PAL.ink, sw: sw * .45 });
  }
  if (fp[2] >= .15) filter();
  // the coiled hose from the filter over the wearer's left shoulder
  const h0 = [fp[0] + fr * .7 * fsx, fp[1] + fr * .6];
  const hp = V === SV.side ? [h0, [h0[0] - .4 * u, shY + .2 * u], [.6 * u, shY + .7 * u], [-.2 * u, shY + .5 * u]]
    : V === SV.q ? [h0, [h0[0] - .15 * u, shY + .2 * u], [1.1 * u, shY + .9 * u], [.6 * u, shY + .5 * u]]
    : [h0, [h0[0] + .45 * u, hcy + 2.75 * u], [X(1.45), shY + .5 * u], [X(1.75), shY + .25 * u]];
  gearHose(hp, .22 * u, '#232227', '#55545C', .16 * u, sw);
  // the harness: black straps over both shoulders to the belt, a radio puck on the wearer's left strap
  const st = V === SV.side ? [[-.15, -.25]] : [[-.95, -.85], [.95, .85]];
  for (const [a, b] of st) paint(gearStrip([X(a), shY - .1 * u], [X(b), shY + 3.0 * u], .32 * u * (V === SV.side ? 1 : 1)), { wash: SCI_WEB, ink: PAL.ink, sw: sw * .4 });
  if (V !== SV.side) {
    const px = X(.9), py = shY + 1.5 * u;
    paint(ellPts(px, py, .34 * u, .34 * u, 12), { wash: '#2C2C30', ink: PAL.ink, sw: sw * .5 });
    paint(ellPts(px, py, .16 * u, .16 * u, 8), { wash: '#4A4A50', ink: null });
    inkLine([[px + .15 * u, py - .3 * u], [px + .2 * u, py - .65 * u]], sw * .6, '#2C2C30', 'ink', 0);
  }
}
// the heavy scientist's head: a round dome helmet, a thick-rimmed black visor band, a tall padded collar
function heavyHeadGear(u, sw, o, V, hcx, hcy, R, shY) {
  const H = { hcx, hcy, R, th: gearTurn(V, u, R) }, back = !!V.back, base = SCI.heavy, coll = '#34342C', ox = back ? 0 : Math.sin(H.th) * .3 * u;
  const tw = 2.1 * u * (V.torsoW || 1);
  // dome
  paint(ellPts(hcx + ox * .3, hcy - .15 * u, R * 1.08, R * 1.08, 28, u * .02), { wash: base, ink: PAL.ink, sw: sw * .9 });
  paint(ellPts(hcx + ox * .3 - .7 * u, hcy - 1.75 * u, .85 * u, .38 * u, 12, 0, -.35), { wash: '#6A6A5E', washOp: 140, ink: null });   // the sheen on the dome
  inkLine(headArc(hcx + ox * .3, hcy - .15 * u, R, 1.0, Math.PI * 1.15, Math.PI * 1.85, 12), sw * .45, '#4E4E44', 'inkfine', 0);   // a ridge over the crown
  if (!back) {   // the visor: a thick black rim and the dark glass
    paint(gearPanel(H, -.95, .95, -.55, .3, 1.1), { wash: '#16161A', ink: PAL.ink, sw: sw * .7 });
    paint(gearPanel(H, -.78, .78, -.42, .17, 1.12), { wash: '#0D0D10', ink: null });
    const g = [[-.6, -.38], [-.38, -.38], [-.5, .1], [-.68, .1]].map(([lo, la]) => { const p = gearPtC(H, lo, la, 1.13); return [p[0], p[1]]; });
    paint(g, { wash: '#5E6870', washOp: 180, ink: null });
  }
  // the padded collar, rising around the helmet below the visor, spreading over the shoulders
  const cx = hcx + ox, sq = 1 - .12 * Math.sin(H.th);
  const C = [[-2.8, -.15], [-2.0, .6], [-1.0, .85], [0, .9], [1.0, .85], [2.0, .6], [2.8, -.15], [3.05, 1.2], [2.95, 2.5], [tw / u * 1.12, 3.15], [1.4, 3.6], [0, 3.7], [-1.4, 3.6], [-tw / u * 1.12, 3.15], [-2.95, 2.5], [-3.05, 1.2]];
  const CP = through(C.map(([x, y]) => [cx + x * u * sq, hcy + y * u]).concat([[cx - 2.8 * u * sq, hcy - .15 * u]]), 3);
  paint(CP, { wash: coll, ink: PAL.ink, sw: sw * .85 });
  if (back) { inkLine([[cx - 2.6 * u, hcy + 1.2 * u], [cx, hcy + 1.9 * u], [cx + 2.6 * u, hcy + 1.2 * u]], sw * .45, '#22221C', 'inkfine', .5); return; }
  for (const yy of [1.7, 2.6]) inkLine(through([[cx - 2.75 * u * sq, hcy + (yy - .6) * u], [cx, hcy + (yy + .35) * u], [cx + 2.75 * u * sq, hcy + (yy - .6) * u]], 4), sw * .45, '#22221C', 'inkfine', .5);
  for (const x of [-1.6, 1.6]) inkLine([[cx + x * u * sq, hcy + 1.0 * u], [cx + x * 1.05 * u * sq, hcy + 3.3 * u]], sw * .4, '#22221C', 'inkfine', 0);
  paint(ellPts(cx - 1.5 * u, hcy + 1.1 * u, .7 * u, .22 * u, 10, 0, .25), { wash: '#4A4A40', washOp: 120, ink: null });
  // a radio puck on the wearer's left chest and a wire up to the collar
  const px = gearBodyX(V, V === SV.side ? -.4 : .95, u), py = shY + 1.35 * u;
  inkLine(through([[px, py], [px + .3 * u, shY + .6 * u], [cx + 1.2 * u, hcy + 3.3 * u]], 4), sw * .5, '#1C1C17', 'ink', .5);
  paint(ellPts(px, py, .32 * u, .32 * u, 12), { wash: '#26261F', ink: PAL.ink, sw: sw * .5 });
}
function suitHeadGear(u, sw, o, V, S, hcx, hcy, R, gear, shY) {
  if (gear.hazmat) return hazmatHeadGear(u, sw, o, V, hcx, hcy, R, shY);
  return scientistHeadGear(u, sw, o, V, hcx, hcy, R, shY, gear);
}
// Optional, for the rig: details on a suit's arms and legs. Call after painting each sleeve or trouser leg, with the joint
// points it was painted through (kind 'arm': shoulder, elbow, hand; 'leg': hip, knee, ankle), far = the shaded far limb,
// which = 'L' | 'R'. Camo blotches (arctic, naval), the heavy suit's forearm guards and knee plates, the hazmat's tape.
function suitLimbGear(u, sw, gear, kind, P0, P1, P2, far = false, which = 'L') {
  const lp = (A, B, t) => [lerp(A[0], B[0], t), lerp(A[1], B[1], t)];
  const sh = c => far ? mixCol(c, PAL.ink, .28) : c;
  if (gear.scientist && SCI_CAMO[sciKey(gear)]) {
    const col = sh(SCI_CAMO[sciKey(gear)]), key = (kind === 'arm' ? 3 : 9) + (which === 'L' ? 0 : 50);
    for (let i = 0; i < 4; i++) { const seg = i < 2 ? [P0, P1] : [P1, P2], p = lp(seg[0], seg[1], .25 + .5 * hash(key + i)), r = (.18 + .12 * hash(key + i + 20)) * u; paint(ellPts(p[0] + (hash(key + i + 30) - .5) * .4 * u, p[1], r * 1.2, r * .8, 7, r * .2, hash(i) * 3), { wash: col, washOp: 210, ink: null }); }
  }
  if (gear.scientist === 'heavy') {
    if (kind === 'arm') paint(ribbon([lp(P1, P2, .12), lp(P1, P2, .78)], 1.1 * u, .95 * u), { wash: sh('#45453A'), ink: PAL.ink, sw: sw * .55 });   // forearm guard
    else { paint(ellPts(P1[0], P1[1] - .05 * u, .78 * u, .62 * u, 14), { wash: sh('#45453A'), ink: PAL.ink, sw: sw * .55 }); inkLine([[P1[0] - .5 * u, P1[1] + .1 * u], [P1[0] + .5 * u, P1[1] + .1 * u]], sw * .4, '#1C1C17', 'inkfine', 0); }   // knee plate
  }
  if (gear.hazmat && kind === 'leg') {   // grey tape round the shin; a worn blue patch on the wearer's right knee
    const a = lp(P1, P2, .5), dx = P2[0] - P1[0], dy = P2[1] - P1[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * .62 * u, ny = dx / l * .62 * u;
    paint(gearStrip([a[0] - nx, a[1] - ny], [a[0] + nx, a[1] + ny], .3 * u), { wash: sh(HAZ.tape), ink: null });
    if (which === 'L') paint(ellPts(P1[0], P1[1] + .15 * u, .45 * u, .38 * u, 9, .05 * u), { wash: sh(HAZ.patch), washOp: 200, ink: null });
  }
}

// ---------- metal chestplate (reference: metal.plate.torso) ----------
// A steel vest with brown leather shoulder straps, and a horizontal leather strap with a grey buckle low on each side.
function chestplateGear(u, sw, V, tw, shY, wy) {
  paint([[-tw * .82, shY + .4 * u], [tw * .82, shY + .4 * u], [tw * .92, wy - .2 * u], [-tw * .92, wy - .2 * u]], { wash: '#9BA2A7', ink: PAL.ink, sw: sw * .8 });
  paint([[-tw * .7, shY + .55 * u], [-tw * .1, shY + .55 * u], [-tw * .25, wy - .4 * u], [-tw * .78, wy - .4 * u]], { wash: '#C2C8CC', washOp: 120, ink: null });
  for (const s of [-1, 1]) {
    paint(rectPts(s * tw * .55 - .3 * u, shY - .1 * u, .6 * u, 1.2 * u), { wash: '#7A5032', ink: PAL.ink, sw: sw * .5 });   // shoulder strap
    paint(ellPts(s * tw * .55, shY + .85 * u, .07 * u, .07 * u, 6), { wash: '#5E656B', ink: null });   // rivet
    if (V.back || !V.side || s < 0) {   // the side strap, across the plate's lower edge, with its buckle
      const x0 = s * tw * .92, y = wy - 1.4 * u, xa = x0 - s * .62 * u, xb = x0 + s * .28 * u;
      paint(rectPts(Math.min(xa, xb), y - .175 * u, Math.abs(xb - xa), .35 * u), { wash: '#7A5032', ink: PAL.ink, sw: sw * .5 });
      paint(rectPts(x0 - s * .45 * u - .11 * u, y - .23 * u, .22 * u, .46 * u), { wash: '#8E959A', ink: PAL.ink, sw: sw * .35 });
    }
  }
}

// ---------- roadsign kilt (reference: roadsign.kilt) ----------
// Irregular, overlapping, slightly tilted road signs on two crossed leather belts: a big blue parking sign (a white
// wheelchair-style symbol and a white text bar), a white sign with red text bars, a green street-name sign with a white
// stripe, and the grey backs of signs. No legible words.
function roadsignKiltGear(u, sw, V, bw, wy) {
  const W = bw * 1.08, top = wy + .05 * u, back = !!V.back;
  const sign = (x0, x1, h, tilt, col, deco) => {   // a sign panel: top corners on the belt line, bottom tilted
    const P = [[x0, top - .1 * u], [x1, top - .1 * u + tilt * .3 * u], [x1 + tilt * .25 * u, top + h * u + tilt * .15 * u], [x0 + tilt * .25 * u, top + h * u - tilt * .2 * u]];
    paint(P, { wash: col, ink: PAL.ink, sw: sw * .6 });
    if (deco) deco(P);
  };
  const cen = P => [(P[0][0] + P[1][0] + P[2][0] + P[3][0]) / 4, (P[0][1] + P[1][1] + P[2][1] + P[3][1]) / 4];
  const greyBack = P => { const c = cen(P); inkLine([[c[0] - .25 * u, c[1] - .6 * u], [c[0] - .2 * u, c[1] + .6 * u]], sw * .35, '#8A8E92', 'inkfine', 0); paint(ellPts(c[0] + .1 * u, P[0][1] + .4 * u, .08 * u, .08 * u, 6), { wash: '#6E7276', ink: null }); };
  const green = P => { const c = cen(P); paint(rectPts(P[0][0] + .1 * u, c[1] - .55 * u, Math.abs(P[1][0] - P[0][0]) - .2 * u, .14 * u), { wash: '#EDEDE4', ink: null }); for (let i = 0; i < 3; i++) paint(rectPts(P[0][0] + (.15 + i * .3) * u, c[1] - .1 * u + (i % 2) * .05 * u, .2 * u, .3 * u), { wash: '#EDEDE4', washOp: 230, ink: null }); };
  const white = P => { const c = cen(P), w = Math.abs(P[1][0] - P[0][0]); paint(P.map(([x, y]) => [lerp(x, c[0], .14), lerp(y, c[1], .1)]), { ink: '#C8402E', sw: sw * .5 }); for (const [x, y, l] of [[-.34, -.62, .42], [.14, -.62, .2], [-.34, -.3, .58], [-.34, .02, .26], [-.02, .02, .3], [-.34, .5, .36]]) paint(rectPts(c[0] + x * w, c[1] + y * u, l * w, .11 * u), { wash: '#C8402E', ink: null }); };
  const blue = P => {
    const c = cen(P), r = .42 * u;
    paint(P.map(([x, y]) => [lerp(x, c[0], .1), lerp(y, c[1], .07)]), { ink: '#EDEDE4', sw: sw * .45 });   // the white border
    inkLine(Array.from({ length: 9 }, (_, i) => { const a = .5 + i / 8 * 4.2; return [c[0] - .15 * u + Math.cos(a) * r, c[1] - .2 * u + Math.sin(a) * r]; }), sw * .85, '#F2F0E8', 'ink', .5);   // the wheel
    paint(ellPts(c[0] - .1 * u, c[1] - .85 * u, .13 * u, .13 * u, 8), { wash: '#F2F0E8', ink: null });   // the figure's head
    inkLine([[c[0] - .1 * u, c[1] - .65 * u], [c[0] - .05 * u, c[1] - .15 * u], [c[0] + .35 * u, c[1] - .12 * u], [c[0] + .45 * u, c[1] + .2 * u]], sw * .8, '#F2F0E8', 'ink', 0);
    paint(rectPts(c[0] - .55 * u, c[1] + .45 * u, 1.15 * u, .2 * u), { wash: '#F2F0E8', ink: null });   // the text bar
  };
  if (back) {
    sign(-W, -W * .2, 2.1, .3, '#B9BCBE', greyBack); sign(-W * .35, W * .45, 2.35, -.2, '#5E8A6E', null); sign(W * .3, W, 2.0, -.35, '#B9BCBE', greyBack);
  } else if (V.side) {   // 3/4 and profile: the blue parking sign on the front, the others round the side
    sign(-W, -W * .15, 2.0, .3, '#B9BCBE', greyBack);
    sign(-W * .45, W * .4, 2.35, .2, '#ECEAE2', white);
    sign(W * .05, W * 1.05, 2.15, -.3, '#3E63B4', blue);
  } else {
    sign(-W * .2, W * .55, 2.2, .25, '#5E8A6E', green);   // the green street sign (behind)
    sign(W * .4, W, 2.0, -.4, '#B9BCBE', greyBack);   // a grey sign back
    sign(-W * .62, W * .1, 2.45, .35, '#ECEAE2', white);   // the white sign with red text
    sign(-W * 1.02, -W * .1, 2.15, -.3, '#3E63B4', blue);   // the big blue parking sign in front
  }
  // two brown leather belts crossing at an angle, a buckle and a dangling end
  const B1 = [[-W * 1.04, top - .05 * u], [W * 1.04, top + .2 * u]], B2 = [[-W * 1.04, top + .55 * u], [W * 1.04, top - .15 * u]];
  for (const [A, B] of [B1, B2]) paint(gearStrip(A, B, .32 * u), { wash: '#6E4A2E', ink: PAL.ink, sw: sw * .5 });
  if (!back) {
    const bxp = V.side ? -W * .45 : W * .3, by = lerp(B2[0][1], B2[1][1], (bxp + W * 1.04) / (W * 2.08));
    paint(rectPts(bxp - .2 * u, by - .25 * u, .4 * u, .5 * u), { wash: '#9A9C98', ink: PAL.ink, sw: sw * .4 });
    paint(rectPts(bxp - .1 * u, by - .14 * u, .2 * u, .28 * u), { wash: '#6E4A2E', ink: null });
    paint(ribbon([[bxp + .12 * u, by + .2 * u], [bxp + .28 * u, by + .75 * u], [bxp + .22 * u, by + 1.15 * u]], .24 * u, .2 * u), { wash: '#6E4A2E', ink: PAL.ink, sw: sw * .4 });   // the dangling strap end
  }
}
