// heads.js: the survivor's head (survivor.js draws the body and calls survivorHead). Skull, ears, face, hair and beard,
// for every view. The head is a sphere seen turned (front 0, qf .3, q .62, profile pi/2; see turnPt), so features sit
// in the same places in every view: a profile shows one eye and one ear, a 3/4 the far eye foreshortened beside the
// nose, and the hair and beard stay on the skull and jaw. Gear on the head (masks, hoods) is in gear.js.

// (hcx, hcy) = head centre, R = head radius, in survivor()'s body frame (+x = the way the face points).
function survivorHead(u, sw, o, V, S, SB, gear, shY, drop, soot, rs) {
  const hcx = 0, hcy = -10.85 * u + drop, R = 2.35 * u;
  paint(rectPts(-.5 * u, shY - 1.1 * u, 1.0 * u, 1.2 * u), { wash: mixCol(SB.col, SB.dk, .45), ink: null });
  const hooded = gear.hazmat || gear.scientist;
  if (hooded) { suitHeadGear(u, sw, o, V, S, hcx, hcy, R, gear, shY); }
  else {
  if (!V.side) for (const e of V.ears) paint(ellPts(hcx + e * R * .98, hcy + .1 * u, .48 * u, .62 * u, 12), { wash: S.col, ink: PAL.ink, sw: sw * .6 });
  paint(ellPts(hcx, hcy, R, R * .98, 28, u * .02), { wash: S.col, ink: PAL.ink, sw: sw * .9 });
  if (soot > 0 && !V.back) sootFace(u, V, hcx, hcy, R, soot, 'face' + (o.boilKey || ''));
  if (V.side) {   // 3/4 and profile: features placed on the turned head (turnedHead)
    turnedHead(u, sw, o, V, S, hcx, hcy, R, 'face');
    turnedHead(u, sw, o, V, S, hcx, hcy, R, 'hair');
    if (o.frizz > 0) frizzHalo(u, sw, o, hcx, hcy, R);   // electrocuted
    turnedHead(u, sw, o, V, S, hcx, hcy, R, 'ear');
  } else {
    if (V.face) faceOf(u, sw, o, V, S, hcx, hcy, R);
    hairOf(u, sw, o, V, hcx, hcy, R);
  }
  }
  if (gear.mask === 'metal' && !V.back) metalMaskGear(u, sw, V, hcx, hcy, R, o);
  // o.face(u, sw, V, head): drawn on the head, after hair and gear but under the arms (plasters, paint, overlays).
  // head = { hcx, hcy, R, th, pt(lon, lat, k) } where pt places a point on the turned head (see turnPt).
  if (o.face) { rs('face'); const th = V === SV.side ? HEAD_TURN.side : V === SV.q ? HEAD_TURN.q : 0; o.face(u, sw, V, { hcx, hcy, R, th, pt: (lon, lat, k = 1) => turnPt(hcx, hcy, R, th, lon, lat, k) }); }

}

// ---------- face ----------
// Lines inside the head (hairline, beard edge, moustache) are thin and dark brown; only the silhouette gets the black ink.
const hairCol = o => HAIR_COLS[o.hairCol] || o.hairCol || HAIR_COLS.brown;
const hairLine = o => mixCol(hairCol(o), PAL.ink, .55);
function faceOf(u, sw, o, V, S, hcx, hcy, R) {
  const F = V.face, fx = hcx + F.cx * u, e = o.eyes || 'normal', kinds = Array.isArray(e) ? e : [e, e];
  const sq = clamp(o.squint || 0), q = V === SV.q, side = V === SV.side;
  // brows follow the mood of the eyes
  const browOf = k => ['angry', 'determined', 'red', 'sly'].includes(k) ? 'angry' : ['sad', 'teary', 'cry', 'scared'].includes(k) ? 'worried' : ['wide', 'shine', 'spark', 'blank'].includes(k) ? 'up' : 'flat';
  if (o.blush) for (const s of F.eyes) paint(ellPts(fx + s * 1.25 * u * F.fw, hcy + .75 * u, .5 * u, .26 * u, 12), { fill: PAL.rose, fillOp: 170 * clamp(o.blush === true ? 1 : o.blush), bleed: .2, ink: null });
  EYE_INK = o.eyeCol || PAL.ink;
  for (const s of F.eyes) {
    const ex = fx + s * .85 * u * F.fw, ey = hcy - .05 * u, k = kinds[s < 0 ? 0 : 1];
    push(); translate(ex, ey); scale(.46 * F.fw + .04, .38);   // clawd.js eye moods, scaled down; the plain eyes are ovals
    if (sq > .8) inkLine([[-.8 * u, 0], [.8 * u, 0]], sw * 2.2, EYE_INK, 'ink', 0);
    else { if (sq > 0) scale(1, 1 - sq); humanEye(k, s, u, o, sw * 2.2); }
    pop();
    // brows: angry ones slant down toward the nose, worried ones up
    const b = browOf(k), by = ey - .78 * u - (b === 'up' ? .22 * u : 0), tilt = b === 'angry' ? .28 : b === 'worried' ? -.25 : 0;
    const arch = b === 'flat' || b === 'up' ? .12 * u : .04 * u;
    inkLine([[ex - .42 * u * F.fw, by + tilt * s * .5 * u], [ex, by - arch], [ex + .42 * u * F.fw, by - tilt * s * .5 * u]], sw * .95, hairCol(o), 'ink', .5);
  }
  EYE_INK = PAL.ink;
  // nose: a bump on the profile, a little hook between the eyes in 3/4, a tick from the front
  if (side) { const N = through([[hcx + R * .92, hcy - .22 * u], [hcx + R * 1.06, hcy + .22 * u], [hcx + R * 1.07, hcy + .44 * u], [hcx + R * .96, hcy + .58 * u], [hcx + R * .86, hcy + .56 * u]], 4); paint(N, { wash: S.col, ink: null }); inkLine(N, sw * .4, mixCol(S.dk, PAL.ink, .5), 'inkfine', 0); }
  else if (q) inkLine([[fx + .1 * u, hcy + .14 * u], [fx + .36 * u, hcy + .5 * u], [fx + .1 * u, hcy + .62 * u]], sw * .55, S.dk, 'inkfine', .5);
  else inkLine([[fx - .05 * u, hcy + .2 * u], [fx + .14 * u, hcy + .5 * u], [fx - .06 * u, hcy + .58 * u]], sw * .55, S.dk, 'inkfine', .5);
  // beard and moustache (under the mouth, so every mouth stays readable)
  const mx = side ? hcx + R * .76 : q ? fx + .25 * u : fx, my = hcy + 1.42 * u;
  if (o.beard) beardOf(u, sw, o, V, hcx, hcy, R, fx, mx);
  // clawd.js mouths sit at y -4.3u around their origin; scaled by MS, they land on the mouth line (my)
  const MS = .42, m = o.mouth;
  if (m) { push(); translate(mx, my + 4.3 * u * MS); scale(MS * F.fw + .08, MS); mouth(u, m, sw * 2.2); pop(); }
  else inkLine([[mx - .26 * u * F.fw, my - .01 * u], [mx, my + .07 * u], [mx + .26 * u * F.fw, my - .01 * u]], sw * .45, mixCol(S.dk, PAL.ink, .5), 'inkfine', .5);   // a small resting smile
  if (o.beard && o.beard !== 'stubble') moustacheOf(u, sw, o, V, mx, my);
}
// The plain eyes are dark ovals with a glint (Clawd's are tall slits); happy and shut eyes are thin arcs; every other
// mood uses clawd.js's eye shapes. Runs inside the face's eye frame (scaled .5 × .38), so lines are drawn thinner here.
function humanEye(k, s, u, o, sw) {
  if (k === 'happy') { inkLine([[-.85 * u, .55 * u], [0, -.55 * u], [.85 * u, .55 * u]], sw * .5, EYE_INK, 'ink', .7); return; }
  if (k === 'sly') {   // half-lidded, looking sideways: scheming
    const lx = (o.lookX ?? .7) * u * .45, ly = (o.lookY || 0) * u * .3;
    paint(ellPts(lx, ly + .2 * u, .66 * u, .62 * u, 16), { wash: EYE_INK, ink: null });
    inkLine([[-.95 * u, -.12 * u], [.95 * u, -.12 * u]], sw * .55, EYE_INK, 'ink', 0);
    return;
  }
  if (k === 'closed' || k === 'sleep') { inkLine([[-.85 * u, -.1 * u], [0, .55 * u], [.85 * u, -.1 * u]], sw * .5, EYE_INK, 'ink', .7); return; }
  if (k === 'cross') {   // cross-eyed: each pupil rolls in toward the nose
    paint(ellPts(0, 0, .7 * u, 1.0 * u, 18), { wash: PAL.cream, ink: EYE_INK, sw: sw * .35 });
    paint(ellPts(-s * .32 * u, .1 * u, .42 * u, .6 * u, 14), { wash: EYE_INK, ink: null });
    return;
  }
  if (!['normal', 'look', 'wide'].includes(k)) return eye(k, s, u, o, sw);
  if (((T * .9 + (o.seed || 0) * 1.7) % 3.3) < .12) { inkLine([[-.75 * u, .3 * u], [.75 * u, .3 * u]], sw * .6, EYE_INK, 'ink', 0); return; }
  const lx = (o.lookX || 0) * u * .5, ly = (o.lookY || 0) * u * .4, w = k === 'wide' ? 1.2 : 1;
  paint(ellPts(lx, ly, .66 * u * w, 1.0 * u * w, 18), { wash: EYE_INK, ink: null });
  if (u > 9) paint(ellPts(lx - .22 * u * w, ly - .36 * u * w, .22 * u, .28 * u, 10), { wash: PAL.cream, washOp: 235, ink: null });
}
// Head-relative point lists: [x, y] in head radii from the head's centre, +x = the way the face points.
const HR = (hcx, hcy, R, P) => P.map(([a, b]) => [hcx + a * R, hcy + b * R]);
const headArc = (hcx, hcy, R, r, a0, a1, n = 14, bump = null) => {
  const P = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), k = bump ? r + bump[1] * Math.exp(-(((a - bump[0]) / .35) ** 2)) : r; P.push([hcx + Math.cos(a) * k * R, hcy + Math.sin(a) * k * R]); }
  return P;
};
// A short full beard (reference: Rust's default male model): sideburns into a jaw beard that ends at the chin. The top
// edge dips under the mouth. Filled first, then the jaw silhouette in black ink and the cheek edge in thin brown.
function beardOf(u, sw, o, V, hcx, hcy, R, fx, mx) {
  const col = hairCol(o);
  if (o.beard === 'stubble') { for (let i = 0; i < 14; i++) { const a = .5 + i / 13 * (Math.PI - 1), r = R * .8; paint(ellPts(hcx + Math.cos(a) * r * (V.side ? .45 : 1) + (V.side ? .9 * u : 0), hcy + .3 * u + Math.sin(a) * r * .75, .07 * u, .07 * u, 6), { wash: col, ink: null }); } return; }
  let top, jaw, back = [];   // jaw may be re-assigned (frizz)
  if (V === SV.side) {
    top = HR(hcx, hcy, R, [[.08, .28], [.2, .46], [.42, .6], [.6, .74], [.78, .78], [.9, .68]]);
    jaw = headArc(hcx, hcy, R, 1.05, .6, 1.62, 12, [.88, .09]);
    back = HR(hcx, hcy, R, [[-.08, .8], [-.12, .52], [-.02, .32]]);
  } else if (V === SV.q) {
    top = HR(hcx, hcy, R, [[-.26, .26], [-.18, .46], [0, .58], [.2, .72], [.38, .8], [.56, .8], [.74, .68], [.86, .5]]);
    jaw = headArc(hcx, hcy, R, 1.05, .55, 2.1, 14, [1.15, .08]);
    back = HR(hcx, hcy, R, [[-.46, .62], [-.38, .32]]);
  } else {
    const w = R * .9 * V.face.fw + .12 * u;
    top = [[fx - w, hcy + .35 * u], [fx - w * .72, hcy + 1.0 * u], [fx - w * .3, hcy + 1.64 * u], [fx, hcy + 1.76 * u], [fx + w * .3, hcy + 1.64 * u], [fx + w * .72, hcy + 1.0 * u], [fx + w, hcy + .35 * u]];
    jaw = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; jaw.push([fx + Math.cos(a) * w * .98, hcy + .45 * u + Math.sin(a) * 2.05 * u]); }
  }
  if (o.frizz > 0) jaw = jaw.map(([x, y], i) => { const dx = x - hcx, dy = y - hcy, d = Math.hypot(dx, dy) || 1, k = (i % 2 ? .05 : .2) * o.frizz * R; return [x + dx / d * k, y + dy / d * k]; });   // bristling
  const Tp = through(top, 3), Jw = o.frizz > 0 ? jaw : through(jaw, 2), Bk = back.length ? through([jaw[jaw.length - 1], ...back, top[0]], 3) : [];
  paint([...Tp, ...Jw, ...Bk], { wash: col, ink: null });
  inkLine(Jw, sw * (V === SV.side ? .4 : .6), V === SV.side ? hairLine(o) : PAL.ink, 'ink', 0);
  inkLine(Tp, sw * .32, hairLine(o), 'inkfine', 0);
  if (Bk.length) inkLine(Bk, sw * .32, hairLine(o), 'inkfine', 0);
}
// The moustache sits on the upper lip and joins the beard at the mouth corners.
function moustacheOf(u, sw, o, V, mx, my) {
  const f = V === SV.side ? .55 : V === SV.q ? .8 : 1, P = [[-.58, -.24], [-.42, -.36], [-.15, -.39], [0, -.34], [.15, -.39], [.42, -.36], [.58, -.24], [.46, -.18], [.28, -.16], [.1, -.14], [0, -.11], [-.1, -.14], [-.28, -.16], [-.46, -.18]];
  const pts = P.map(([a, b]) => [mx + a * u * f, my + b * u]);
  paint(pts, { wash: hairCol(o), ink: null, curv: .35 });
  inkLine(pts.slice(0, 7), sw * .3, hairLine(o), 'inkfine', .4);
}
// Hair. Front: a cap with a ragged fringe. 3/4 and profile: it covers the crown and the back of the head down to the
// nape, curving over the ear into a sideburn in front of it. Back: all hair down to the nape.
function hairOf(u, sw, o, V, hcx, hcy, R) {
  const style = o.hair || 'short', col = hairCol(o), curv = style === 'buzz' ? .4 : .2;
  if (style === 'bald') return;
  const r = style === 'buzz' ? 1.01 : style === 'messy' ? 1.1 : 1.05;
  let outer, inner;
  if (V.back) { outer = headArc(hcx, hcy, R, r, Math.PI - .62, TAU + .62, 22); inner = HR(hcx, hcy, R, [[.5, .62], [.25, .72], [0, .78], [-.25, .72], [-.5, .62]]); }
  else if (V.side) {
    const q = V === SV.q, m = style === 'messy' ? .08 : 0;
    outer = headArc(hcx, hcy, R, r, q ? -.72 : -.62, -Math.PI - (q ? .85 : .75), 18);
    inner = HR(hcx, hcy, R, q ? [[-.6, .64], [-.74, .3], [-.74, -.02], [-.64, -.24], [-.46, -.32], [-.3, -.24], [-.25, .02], [-.24, .3], [-.14, .26], [-.08, -.3], [.1, -.5 - m], [.24, -.43], [.4, -.58 - m], [.58, -.5], [.76, -.6]]
                              : [[-.48, .66], [-.44, .3], [-.36, -.02], [-.26, -.26], [-.06, -.32], [.08, -.2], [.12, .06], [.13, .3], [.25, .26], [.28, -.3], [.44, -.5 - m], [.58, -.44], [.7, -.56 - m], [.82, -.5]]);
  } else {
    outer = []; const a0 = Math.PI * 1.08, a1 = Math.PI * 1.92;
    for (let i = 0; i <= 14; i++) { const a = a0 + (a1 - a0) * i / 14; outer.push([hcx + Math.cos(a) * R * r, hcy + Math.sin(a) * R * r]); }
    const fringe = style === 'messy' ? 6 : style === 'buzz' ? 2 : 4; inner = [];
    for (let i = 0; i <= fringe; i++) { const fxx = lerp(hcx + R * .95, hcx - R * .95, i / fringe), up = (i % 2 ? .1 : .3) * u * (style === 'messy' ? 1.6 : 1); inner.push([fxx, hcy - R * .6 + up]); }
  }
  if (o.frizz > 0 && !V.back) frizzHalo(u, sw, o, hcx, hcy, R);
  const O = through(outer, 3), I = through([outer[outer.length - 1], ...inner, outer[0]], 3);
  paint([...O, ...I], { wash: col, ink: null });
  inkLine(O, sw * .7, PAL.ink, 'ink', 0);
  inkLine(I, sw * .32, hairLine(o), 'inkfine', 0);
  if (style === 'bun') paint(ellPts(hcx - R * (V.side ? .75 : .6), hcy - R * .95, .8 * u, .7 * u, 12), { wash: col, ink: PAL.ink, sw: sw * .7 });
}

// Electrocuted: a spiky halo of hair standing on end, round the crown (a ring, so the face stays clear).
function frizzHalo(u, sw, o, hcx, hcy, R) {
  const F = [], n = 26, fz = clamp(o.frizz), a0 = Math.PI * .92, a1 = Math.PI * 2.08;
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), rr = R * (1.1 + (i % 2 ? .12 : .42 + .1 * hash(i + 3)) * fz); F.push([hcx + Math.cos(a) * rr, hcy + Math.sin(a) * rr]); }
  for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n); F.push([hcx + Math.cos(a) * R * .97, hcy + Math.sin(a) * R * .97]); }
  paint(F, { wash: hairCol(o), ink: null });
  inkLine(F.slice(0, n + 1), sw * .7, PAL.ink, 'ink', 0);
  if (o.soot > .3) for (let i = 0; i <= n; i += 4) { const [x, y] = F[i], fl = .5 + .5 * Math.sin(T * 14 + i); glow(x, y, .5 * u, '#FF9A3A', .5 * fl * o.soot); paint(ellPts(x, y, .1 * u, .1 * u, 6), { wash: '#FFB04A', ink: null }); }   // singed tips still glowing
}

// ---------- turned heads (3/4 and profile) ----------
// The head is a sphere seen turned by th (0 = facing us, π/2 = a profile facing right). A feature sits at longitude
// lon (0 = the middle of the face, − = the near side, + = the far side) and latitude lat (− up, + down) on a surface
// set in (k < 1: eyes) or pushed out (k > 1: the nose) from the skull. turnPt gives [x, y, depth]: depth > 0 faces us.
// Everything (eyes, brows, nose, mouth, ear, hairline, beard) is placed this way, so the views always agree: a profile
// shows one eye and one ear, a 3/4 shows the far eye foreshortened beside the nose, and the hair and beard stay on the
// skull and jaw.
const HEAD_TURN = { q: .62, side: Math.PI / 2 };
function turnPt(hcx, hcy, R, th, lon, lat, k = 1) {
  const X = Math.sin(lon) * Math.cos(lat), Y = Math.sin(lat), Z = Math.cos(lon) * Math.cos(lat) * k;
  return [hcx + R * (X * Math.cos(th) + Z * Math.sin(th)), hcy + R * Y, -X * Math.sin(th) + Z * Math.cos(th)];
}
// a point on the skull, or (if it has turned away) the silhouette at the same height on that side
function turnPtClamped(hcx, hcy, R, th, lon, lat, k = 1) {
  const p = turnPt(hcx, hcy, R, th, lon, lat, k);
  if (p[2] >= 0) return p;
  const Y = Math.sin(lat) * k, w = Math.sqrt(Math.max(0, 1 - Math.min(1, Y * Y))) * R, side = Math.sin(lon + th) >= 0 ? 1 : -1;
  return [hcx + side * w, hcy + R * Math.min(1, Y), 0];
}
const lerpKeys = (K, x) => { x = Math.abs(x); for (let i = 1; i < K.length; i++) if (x <= K[i][0]) return lerp(K[i - 1][1], K[i][1], (x - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); return K[K.length - 1][1]; };
// the hairline (latitude of the hair's edge, by |longitude|): forehead, temple, sideburn, up over the ear, nape
const HAIRLINE = [[0, -.5], [.6, -.46], [.9, -.3], [1.12, .02], [1.28, .3], [1.36, .3], [1.42, -.06], [1.57, -.2], [1.74, -.06], [1.95, .3], [2.4, .55], [Math.PI, .62]];
// the beard: its top edge (under the lip, up to the mouth corners, the cheek, into the sideburn) and its jaw edge
const BEARD_TOP = [[0, .86], [.18, .84], [.3, .66], [.55, .46], [.9, .31], [1.2, .24], [1.36, .2]];
const BEARD_JAW = [[0, 1.26], [.6, 1.16], [1.0, 1.04], [1.2, .94], [1.36, .84]], BEARD_JAW_K = [[0, 1.13], [.6, 1.07], [1.36, 1.0]];
function turnedHead(u, sw, o, V, S, hcx, hcy, R, part) {
  const th = V === SV.side ? HEAD_TURN.side : HEAD_TURN.q, P = (lon, lat, k) => turnPt(hcx, hcy, R, th, lon, lat, k);
  const fore = lon => clamp(Math.cos(lon + th), .3, 1);   // how flat-on a spot of the face is to us
  if (part === 'hair') {
    const style = o.hair || 'short'; if (style === 'bald') return;
    const col = hairCol(o), loV = -Math.PI / 2 - th + .02, hiV = Math.PI / 2 - th - .02, line = [];
    for (let i = 0; i <= 40; i++) { const lon = lerp(-Math.PI, Math.PI, i / 40); if (lon < loV || lon > hiV) continue; const p = P(lon, lerpKeys(HAIRLINE, lon) - (style === 'buzz' ? .04 : 0)); line.push([p[0], p[1]]); }
    for (const lon of [loV, hiV]) { const p = turnPtClamped(hcx, hcy, R, th, lon, lerpKeys(HAIRLINE, lon)); if (lon === loV) line.unshift([p[0], p[1]]); else line.push([p[0], p[1]]); }
    const r = style === 'buzz' ? 1.01 : style === 'messy' ? 1.08 : 1.04, a0 = Math.atan2(line[line.length - 1][1] - hcy, line[line.length - 1][0] - hcx), a1 = Math.atan2(line[0][1] - hcy, line[0][0] - hcx);
    let da = a1 - a0; while (da > 0) da -= TAU;   // over the top: from the front end, anticlockwise, round to the back end
    const arc = []; for (let i = 0; i <= 22; i++) { const a = a0 + da * i / 22, rr = R * (r + (style === 'messy' ? .05 * Math.sin(i * 2.7) : 0)); arc.push([hcx + Math.cos(a) * rr, hcy + Math.sin(a) * rr]); }
    const I = through(line, 3);
    paint([...I, ...arc], { wash: col, ink: null });
    inkLine(arc, sw * .7, PAL.ink, 'ink', 0);
    inkLine(I, sw * .32, hairLine(o), 'inkfine', 0);
    return;
  }
  if (part === 'ear') {   // the near ear, in the notch of the hairline
    const p = P(-Math.PI / 2, .1), w = .46 * u * clamp(Math.sin(th), .35, 1);
    paint(ellPts(p[0], p[1], w, .6 * u, 12), { wash: S.col, ink: mixCol(S.dk, PAL.ink, .55), sw: sw * .4 });
    inkLine([[p[0] + .25 * w, p[1] - .3 * u], [p[0] - .3 * w, p[1] - .02 * u], [p[0] + .15 * w, p[1] + .26 * u]], sw * .4, S.dk, 'inkfine', .5);
    return;
  }
  // ---- the face ----
  const e = o.eyes || 'normal', kinds = Array.isArray(e) ? e : [e, e], sq = clamp(o.squint || 0);
  const browOf = k => ['angry', 'determined', 'red', 'sly'].includes(k) ? 'angry' : ['sad', 'teary', 'cry', 'scared'].includes(k) ? 'worried' : ['wide', 'shine', 'spark', 'blank'].includes(k) ? 'up' : 'flat';
  if (o.blush) for (const s of [-1, 1]) { const p = P(s * .62, .3, .96); if (p[2] > .1) paint(ellPts(p[0], p[1], .5 * u * fore(s * .62), .26 * u, 12), { fill: PAL.rose, fillOp: 170 * clamp(o.blush === true ? 1 : o.blush), bleed: .2, ink: null }); }
  EYE_INK = o.eyeCol || PAL.ink;
  for (const s of [-1, 1]) {
    const lon = s * .4, p = P(lon, -.02, .84); if (p[2] <= .08) continue;   // the far eye is hidden in profile
    const f = fore(lon), k = kinds[s < 0 ? 0 : 1];
    push(); translate(p[0], p[1]); scale(.5 * f, .38);
    if (sq > .8) inkLine([[-.8 * u, 0], [.8 * u, 0]], sw * 2.2, EYE_INK, 'ink', 0);
    else { if (sq > 0) scale(1, 1 - sq); humanEye(k, s, u, o, sw * 2.2); }
    pop();
    const b = browOf(k), bp = P(lon, b === 'up' ? -.45 : -.36, .9), tilt = b === 'angry' ? .28 : b === 'worried' ? -.25 : 0, arch = b === 'flat' || b === 'up' ? .12 * u : .04 * u, bw = .44 * u * f;
    inkLine([[bp[0] - bw, bp[1] + tilt * s * .5 * u], [bp[0], bp[1] - arch], [bp[0] + bw, bp[1] - tilt * s * .5 * u]], sw * .95, hairCol(o), 'ink', .5);
  }
  EYE_INK = PAL.ink;
  // the nose: a hook toward the far cheek in 3/4; in profile it stands out past the head's outline
  const n0 = P(0, .02, 1.0), n1 = P(0, .2, 1.17), n2 = P(0, .29, 1.02);
  if (V === SV.side) { const N = through([n0, n1, n2, P(.02, .3, .94)].map(p => [p[0], p[1]]), 4); paint(N, { wash: S.col, ink: null }); inkLine(N.slice(0, -2), sw * .45, mixCol(S.dk, PAL.ink, .5), 'inkfine', 0); }
  else inkLine([[n0[0] - .05 * u, n0[1] + .12 * u], [n1[0], n1[1]], [n2[0] - .1 * u, n2[1]]], sw * .55, S.dk, 'inkfine', .5);
  // beard and moustache, under the mouth
  const mp = P(0, .64, .96), mw = clamp(Math.cos(th) * 1.05, .3, 1);
  if (o.beard && o.beard !== 'stubble') {
    const col = hairCol(o), top = [], jaw = [];
    for (let i = -14; i <= 14; i++) { const lon = i / 14 * 1.36, a = turnPtClamped(hcx, hcy, R, th, lon, lerpKeys(BEARD_TOP, lon)), b = turnPtClamped(hcx, hcy, R, th, lon, lerpKeys(BEARD_JAW, lon), lerpKeys(BEARD_JAW_K, lon)); top.push([a[0], a[1]]); jaw.push([b[0], b[1]]); }
    let J = jaw.slice().reverse();
    if (o.frizz > 0) J = J.map(([x, y], i) => { const dx = x - hcx, dy = y - hcy, d = Math.hypot(dx, dy) || 1, kk = (i % 2 ? .05 : .2) * o.frizz * R; return [x + dx / d * kk, y + dy / d * kk]; });
    const T = through(top, 2), Jt = o.frizz > 0 ? J : through(J, 2);
    paint([...T, ...Jt], { wash: col, ink: null });
    inkLine(Jt, sw * .6, PAL.ink, 'ink', 0);
    inkLine(T, sw * .32, hairLine(o), 'inkfine', 0);
  } else if (o.beard === 'stubble') for (let i = 0; i < 16; i++) { const lon = lerp(-1.2, 1.2, i / 15), p = P(lon, lerp(.55, .95, hash(i)), 1); if (p[2] > .05) paint(ellPts(p[0], p[1], .07 * u, .07 * u, 6), { wash: hairCol(o), ink: null }); }
  const MS = .42, m = o.mouth;
  if (m) { push(); translate(mp[0], mp[1] + 4.3 * u * MS); scale(MS * mw + .06, MS); mouth(u, m, sw * 2.2); pop(); }
  else inkLine([[mp[0] - .26 * u * mw, mp[1] - .01 * u], [mp[0], mp[1] + .07 * u], [mp[0] + .26 * u * mw, mp[1] - .01 * u]], sw * .45, mixCol(S.dk, PAL.ink, .5), 'inkfine', .5);
  if (o.beard && o.beard !== 'stubble') {   // the moustache rides the upper lip and meets the beard at the mouth corners
    const up = [], lo = []; for (let i = -6; i <= 6; i++) { const lon = i / 6 * .34, a = P(lon, .545 - .03 * Math.cos(i / 6 * Math.PI / 2), .99), b = P(lon, .605, .98); if (a[2] > .02) { up.push([a[0], a[1]]); lo.push([b[0], b[1]]); } }
    if (up.length > 2) { const pts = [...up, ...lo.reverse()]; paint(pts, { wash: hairCol(o), ink: null, curv: .3 }); inkLine(up, sw * .3, hairLine(o), 'inkfine', .4); }
  }
}

function sootFace(u, V, hcx, hcy, R, k, key) {
  const off = V === SV.side ? .55 : V === SV.q ? .3 : 0;
  for (const [dx, dy, r] of [[-.55, .45, .55], [.6, .5, .5], [.1, -.75, .5], [-.3, .9, .4]]) { boilSeed('sootf' + key + dx); paint(ellPts(hcx + (dx + off) * R * .7, hcy + dy * R * .7, r * u * 1.2, r * u, 9, r * u * .3), { wash: '#3E3D43', washOp: 130 * k, ink: null }); }
}

