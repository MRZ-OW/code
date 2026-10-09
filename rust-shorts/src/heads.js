// heads.js: the survivor's head (survivor.js draws the body and calls survivorHead). Skull, ears, face, hair and beard
// for every view. The head is a sphere seen turned by th (front 0, qf .3, q .62, profile pi/2, back pi; see turnPt), so
// every feature sits in the same place in every view: a profile shows one eye and one ear, a 3/4 the far eye
// foreshortened beside the nose, and the hair and beard stay on the skull and jaw. The profile's leading edge (brow,
// nose, lips, bearded chin) is drawn from a fixed silhouette, since a sphere has no nose or chin. Gear worn on the head
// (masks, hoods) is in gear.js.
//
// Lines inside the head (hairline, beard edge, moustache) are thin and dark brown; the silhouette gets the black ink.

const hairCol = o => HAIR_COLS[o.hairCol] || o.hairCol || HAIR_COLS.brown;
const hairLine = o => mixCol(hairCol(o), PAL.ink, .55);

// ---------- the turned head ----------
// A feature sits at longitude lon (0 = the middle of the face, − = the near side, + = the far side) and latitude lat
// (− up, + down) on a surface set in (k < 1: eyes) or pushed out (k > 1: the nose) from the skull. turnPt gives
// [x, y, depth]: depth > 0 faces us.
const HEAD_TURN = { front: 0, qf: .3, q: .62, side: Math.PI / 2, back: Math.PI };
const headTurn = V => V === SV.side ? HEAD_TURN.side : V === SV.q ? HEAD_TURN.q : V === SV.qf ? HEAD_TURN.qf : V && V.back ? HEAD_TURN.back : 0;
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
// A point on a survivor's head in its body frame (for draw / under / behind hooks; o = the survivor's options):
// [x, y, depth]. The o.face hook gets the same thing as head.pt.
function headPoint(u, o, lon, lat, k = 1) {
  const V = SV[o.view] || SV.front, drop = clamp(o.crouch || 0) * 1.2 * u + clamp(o.sit || 0) * 2.05 * u;
  return turnPt(0, -10.85 * u + drop, 2.35 * u, headTurn(V), lon, lat, k);
}
const lerpKeys = (K, x) => { x = Math.abs(x); for (let i = 1; i < K.length; i++) if (x <= K[i][0]) return lerp(K[i - 1][1], K[i][1], (x - K[i - 1][0]) / (K[i][0] - K[i - 1][0])); return K[K.length - 1][1]; };
const wrapLon = lon => { while (lon > Math.PI) lon -= TAU; while (lon < -Math.PI) lon += TAU; return lon; };

// The hairline: the latitude of the hair's edge by |longitude|. Forehead, temple, the sideburn in front of the ear (a
// strip down to the beard), up over the ear, down behind it to the nape. The sideburn's front edge moves back as the
// head turns: it reads as a strip beside the cheek from the front and stays a narrow strip in front of the ear in
// profile (the side of the head is foreshortened from the front).
const sideburnLon = th => 1.05 + .13 * Math.sin(Math.min(th, Math.PI / 2));   // the sideburn's front edge
function hairLat(lon, th, style) {
  const a = Math.abs(wrapLon(lon)), sb = sideburnLon(th);
  const fr = style === 'messy' ? .08 : style === 'buzz' ? 0 : .035;   // the fringe's edge is a few soft tufts
  const tuft = a < sb - .2 ? fr * (.5 + .5 * Math.cos(a * 13)) * (1 - clamp((a - (sb - .45)) / .25)) : 0;
  return lerpKeys([[0, -.6], [.6, -.55], [sb - .14, -.44], [sb - .03, -.3], [sb, 0], [sb + .02, .4], [1.36, .36], [1.41, -.12],
    [1.47, -.18], [1.57, -.21], [1.67, -.18], [1.75, -.12], [1.86, .2], [1.95, .6], [2.4, .62], [Math.PI, .64]], a) - tuft - (style === 'buzz' ? .04 : 0);
}
// The beard (a short full beard, as on Rust's default male model): its top edge by |longitude| (under the lower lip,
// up round the mouth corners to the moustache, over the cheek into the sideburn), and its back edge from the sideburn
// down past the ear to the jaw corner. The jaw silhouette closes it.
const BEARD_TOP = [[0, .7], [.2, .7], [.3, .62], [.36, .56], [.55, .5], [.85, .45], [1.05, .39], [1.36, .3]];
const JAW_BACK = [[1.36, .3], [1.5, .44], [1.62, .62], [1.7, .85]];
const MOUSTACHE = [[-.33, .575], [-.28, .505], [-.15, .47], [-.04, .485], [0, .495], [.04, .485], [.15, .47], [.28, .505], [.33, .575],
  [.3, .61], [.2, .59], [.08, .58], [0, .585], [-.08, .58], [-.2, .59], [-.3, .61]];
// The profile (head radii from the head centre, +x forward, +y down). PROFILE_FACE runs down the leading edge from the
// forehead (on the skull circle) past the brow, nose, upper lip, lips and chin to the jaw (back on the circle).
const PROFILE_FACE = [[.9, -.43], [.945, -.3], [.972, -.17], [.982, -.1], [.968, -.03], [1.0, .03], [1.06, .1], [1.125, .165], [1.165, .215],
  [1.15, .258], [1.1, .282], [1.03, .295], [.97, .315], [.955, .36], [.952, .43], [.95, .5], [.945, .545], [.9, .575], [.865, .588],
  [.905, .6], [.94, .625], [.925, .655], [.875, .675], [.87, .72], [.86, .79], [.81, .85], [.7, .9], [.55, .925], [.38, .94], [.2, .96]];
// the profile beard: top edge (sideburn → cheek → mouth corner → under the lower lip), then the leading edge and the
// jaw (silhouette, from index PB_SIL to PB_BACK), then the back edge up past the ear
const PROFILE_BEARD = [[.17, .25], [.34, .33], [.5, .41], [.66, .48], [.79, .55], [.83, .64], [.865, .678], [.92, .69], [.935, .73], [.905, .79], [.845, .85],
  [.74, .91], [.58, .955], [.4, .968], [.2, .985], [0, .99], [-.1, .975], [-.13, .75], [-.07, .5], [-.01, .36], [.08, .27]];
const PB_SIL = 7, PB_BACK = 16;
const PROFILE_MOUSTACHE = [[.7, .47], [.8, .452], [.9, .458], [.945, .49], [.962, .53], [.945, .565], [.89, .578], [.8, .57], [.72, .548]];
const PROFILE_MOUTH = { corner: [.8, .59], lips: [.865, .588] };
const PROFILE_OPEN = { o: .03, O: .1, open: .07, grin: .055, teeth: .055, laugh: .09, wail: .12, yawn: .15 };   // how far each mouth opens (R)

function survivorHead(u, sw, o, V, S, SB, gear, shY, drop, soot, rs) {
  const hcx = 0, hcy = -10.85 * u + drop, R = 2.35 * u, th = headTurn(V);
  paint(rectPts(-.5 * u, shY - 1.1 * u, 1.0 * u, 1.2 * u), { wash: mixCol(SB.col, SB.dk, .45), ink: null });   // the neck
  if (gear.hazmat || gear.scientist) suitHeadGear(u, sw, o, V, S, hcx, hcy, R, gear, shY);
  else {
    const P = (lon, lat, k = 1) => turnPt(hcx, hcy, R, th, lon, lat, k);
    const prof = V === SV.side, jaw = prof ? .6 * (PROFILE_OPEN[o.mouth] || 0) : 0;   // an open mouth drops the jaw (profile)
    const H = { u, sw, o, V, S, hcx, hcy, R, th, prof, back: !!V.back, P, jaw,
      sk: (a, r = 1) => [hcx + Math.cos(a) * r * R, hcy + Math.sin(a) * r * R * .98],   // a point on the skull's outline
      ang: p => Math.atan2((p[1] - hcy) / .98, p[0] - hcx),                              // ...and the angle of one
      pr: ([x, y]) => [hcx + x * R, hcy + y * R],                                         // a profile point
      prJ: ([x, y]) => [hcx + x * R, hcy + (y > .585 ? y + jaw * clamp((x - .15) / .65) : y) * R] };   // ...below the mouth, on the dropped jaw
    headEars(H, true);
    headSkull(H);
    if (soot > 0 && !H.back) sootFace(H, soot, 'face' + (o.boilKey || ''));
    if (!H.back) headFace(H);
    if (o.frizz > 0) frizzHalo(u, sw, o, hcx, hcy, R, ...frizzRange(th));   // electrocuted: the hair stands on end
    headHair(H);
    headEars(H, false);
  }
  if (gear.mask === 'metal') metalMaskGear(u, sw, V, hcx, hcy, R, o);   // from behind: just the cap and straps
  // o.face(u, sw, V, head): drawn on the head, after hair and gear but under the arms (plasters, paint, overlays).
  // head = { hcx, hcy, R, th, pt(lon, lat, k) }, where pt places a point on the turned head (see turnPt).
  if (o.face) { rs('face'); o.face(u, sw, V, { hcx, hcy, R, th, pt: (lon, lat, k = 1) => turnPt(hcx, hcy, R, th, lon, lat, k) }); }
}

// Ears. From the front (or the back) both ears stick out from behind the skull. Turned (qf and on) the near ear sits on
// the head, on its back half, and the far ear's tip peeks out behind the skull until the turn hides it.
function headEars(H, behind) {
  const { u, sw, S, th, P } = H, front = th < .2 || th > Math.PI - .35;
  const rim = (cx, cy, w, h, s, a0, a1) => inkLine(Array.from({ length: 9 }, (_, i) => { const a = lerp(a0, a1, i / 8); return [cx + s * Math.cos(a) * w, cy + Math.sin(a) * h]; }), sw * .4, S.dk, 'inkfine', .5);
  if (behind) {
    if (front) for (const s of [-1, 1]) { const p = P(s * Math.PI / 2, .1); paint(ellPts(p[0], p[1], .48 * u, .62 * u, 12), { wash: S.col, ink: PAL.ink, sw: sw * .6 }); rim(p[0] + s * .06 * u, p[1] + .02 * u, .26 * u, .38 * u, s, -1.25, 1.35); }
    else if (th < .45) { const p = P(Math.PI / 2, .1), k = 1 - th / .45; paint(ellPts(p[0] - .12 * H.R * (1 - k), p[1], .44 * u, .58 * u, 12), { wash: S.col, ink: PAL.ink, sw: sw * .6 }); }   // the far ear's tip
    return;
  }
  if (front) return;
  const p = P(-Math.PI / 2, .1), w = .46 * u * clamp(Math.sin(th), .35, 1);
  paint(ellPts(p[0], p[1], w, .6 * u, 12), { wash: S.col, ink: mixCol(S.dk, PAL.ink, .55), sw: sw * .4 });
  rim(p[0] + .05 * w, p[1] - .02 * u, .55 * w, .4 * u, -1, -1.3, 1.45);   // the rim curls round the back, open toward the face
  inkLine([[p[0] + .3 * w, p[1] + .05 * u], [p[0] + .1 * w, p[1] + .16 * u]], sw * .35, S.dk, 'inkfine', 0);
}

// The skull: a circle, or in profile the circle's back and top joined to the face's leading edge.
function headSkull(H) {
  const { u, sw, S, prof, sk, pr } = H;
  if (!prof) { paint(ellPts(H.hcx, H.hcy, H.R, H.R * .98, 28, u * .02), { wash: S.col, ink: PAL.ink, sw: sw * .9 }); return; }
  const a0 = Math.acos(PROFILE_FACE[PROFILE_FACE.length - 1][0]), a1 = TAU - .45, pts = [];
  for (let i = 0; i <= 26; i++) pts.push(sk(lerp(a0, a1, i / 26)));
  const back = pts.length; for (const p of PROFILE_FACE) pts.push(H.prJ(p));
  paint(pts, { wash: S.col, ink: null });
  inkLine([...pts.slice(back - 1), pts[0]], sw * .62, PAL.ink, 'ink', 0);   // the face's edge: finer ink, so the lips and nose read
  inkLine(pts.slice(0, back), sw * .9, PAL.ink, 'ink', 0);
  inkLine([pr([.995, .225]), pr([1.035, .262]), pr([1.0, .29])], sw * .4, S.dk, 'inkfine', .5);   // the nostril
}

// Brows, eyes, nose, blush, beard, mouth and moustache.
function headFace(H) {
  const { u, sw, o, S, R, th, prof, P } = H;
  const fore = lon => clamp(Math.cos(lon + th) / Math.cos(lon), .3, 1);   // how flat-on a spot is, relative to the front view
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
    const b = browOf(k);
    if (prof) {   // a short wedge on the brow ridge, thicker toward the nose; angry slants down to the nose, worried up
      const up = b === 'up' ? -.06 : 0, tl = b === 'angry' ? .05 : b === 'worried' ? -.04 : 0;
      paint([[.69, -.325 + up - tl * .5], [.925, -.36 + up + tl], [.92, -.295 + up + tl], [.7, -.3 + up - tl * .5]].map(H.pr), { wash: hairCol(o), ink: null });
      continue;
    }
    const bp = P(lon, b === 'up' ? -.45 : -.36, .9), tilt = b === 'angry' ? .28 : b === 'worried' ? -.25 : 0, arch = b === 'flat' || b === 'up' ? .12 * u : .04 * u, bw = .44 * u * f;
    inkLine([[bp[0] - bw, bp[1] + tilt * s * .5 * u], [bp[0], bp[1] - arch], [bp[0] + bw, bp[1] - tilt * s * .5 * u]], sw * .95, hairCol(o), 'ink', .5);
  }
  EYE_INK = PAL.ink;
  // the nose: in profile it's part of the silhouette; otherwise a little hook toward the far cheek
  if (!prof) { const n0 = P(0, .02), n1 = P(0, .2, 1.17), n2 = P(0, .29, 1.02); inkLine([[n0[0] - .05 * u, n0[1] + .12 * u], [n1[0] + .14 * u * Math.cos(th), n1[1]], [n2[0] - .1 * u, n2[1]]], sw * .55, S.dk, 'inkfine', .5); }
  if (o.beard === 'stubble') for (let i = 0; i < 16; i++) { const lon = lerp(-1.2, 1.2, i / 15), p = P(lon, lerp(.55, .95, hash(i)), 1); if (p[2] > .05) paint(ellPts(p[0], p[1], .07 * u, .07 * u, 6), { wash: hairCol(o), ink: null }); }
  const full = o.beard && o.beard !== 'stubble';
  if (full) headBeard(H);
  if (prof) profileMouth(H, o.mouth);
  else {
    const mp = P(0, .64, .96), sN = Math.cos(th * .4), sF = Math.cos(th * 1.56), MS = .42;   // the far half of the mouth foreshortens
    if (o.mouth) { push(); translate(mp[0], mp[1] + 4.3 * u * MS); scale(.5, MS); MOUTH_WARP = ([x, y]) => [x * (x < 0 ? sN : sF), y]; mouth(u, o.mouth, sw * 2.2); MOUTH_WARP = null; pop(); }
    else inkLine([-2, -1, 0, 1, 2].map(i => [mp[0] + .15 * u * i * (i < 0 ? sN : sF), mp[1] + (.065 * (1 - (i / 2) ** 2) - .01) * u]), sw * .45, mixCol(S.dk, PAL.ink, .5), 'inkfine', .5);   // a small resting smile
  }
  if (full) headMoustache(H);
}

// The full beard. Turned views: the top edge on the sphere (visible part), the back edge past the ear, and the jaw
// silhouette with a chin bump, inked as the head's outline. Profile: the fixed profile beard.
function headBeard(H) {
  const { u, sw, o, R, th, prof, P, sk, ang, pr } = H, col = hairCol(o), fz = clamp(o.frizz || 0);
  const bristle = (pts, cx, cy) => fz > 0 ? pts.map(([x, y], i) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, k = (i % 2 ? .01 : .12 + .06 * hash(i)) * fz * R; return [x + dx / d * k, y + dy / d * k]; }) : pts;   // sharp spikes, like the frizz halo
  if (prof) {
    const B = PROFILE_BEARD.map(H.prJ), sil = bristle(through(B.slice(PB_SIL, PB_BACK + 1), 2), H.hcx, H.hcy);
    const top = through(B.slice(0, PB_SIL + 1), 3), back = through([...B.slice(PB_BACK), B[0]], 3);
    paint([...top, ...sil, ...back], { wash: col, ink: null });
    inkLine(sil, sw * (fz > 0 ? .55 : .75), PAL.ink, fz > 0 ? 'inkfine' : 'ink', 0);   // bristles: a fine line (the thick brush blobs on spikes)
    inkLine(top, sw * .32, hairLine(o), 'inkfine', 0);
    inkLine(back.slice(0, -2), sw * .32, hairLine(o), 'inkfine', 0);
    return;
  }
  const xy = p => [p[0], p[1]], limbF = Math.PI / 2 - th - .015, lonF = Math.min(1.36, limbF), top = [];
  for (let i = 0; i <= 60; i++) { const lon = lerp(-1.36, lonF, i / 60); top.push(xy(P(lon, lerpKeys(BEARD_TOP, lon)))); }
  const backEdge = s => JAW_BACK.map(([lon, lat]) => P(s * lon, lat)).filter(p => p[2] > .01).map(xy);   // sideburn → jaw corner
  const drop = p => { const x = clamp((p[0] - H.hcx) / R, -1, 1); return [p[0], H.hcy + Math.sqrt(1 - x * x) * R * .98]; };   // straight down onto the jaw
  const nb = backEdge(-1), nD = drop(nb[nb.length - 1]);
  const fb = lonF >= 1.36 ? backEdge(1) : [], fD = fb.length ? drop(fb[fb.length - 1]) : top[top.length - 1];
  // the jaw: the skull outline from the far end round under the chin to the near end, with the chin pushing out
  const aF = ang(fD), aN = ang(nD), chinA = Math.PI / 2 - .45 * th, jaw = [];
  const nj = fz > 0 ? 22 : 30; for (let i = 0; i <= nj; i++) { const a = lerp(aF, aN, i / nj); jaw.push(sk(a, 1 + .05 * Math.exp(-(((a - chinA) / .35) ** 2)))); }
  const J = bristle(jaw, H.hcx, H.hcy);
  const edge = [...nb.slice().reverse(), ...top, ...fb];   // near jaw corner → sideburn → across the face → far side
  paint([nD, ...edge, fD, ...J], { wash: col, ink: null });
  inkLine(J, sw * (fz > 0 ? .6 : .9), PAL.ink, fz > 0 ? 'inkfine' : 'ink', 0);
  inkLine([nD, ...edge, ...(fb.length ? [fD] : [])], sw * .32, hairLine(o), 'inkfine', 0);
}

// The moustache rides the upper lip and meets the beard at the mouth corners.
function headMoustache(H) {
  const { sw, o, prof, P, pr } = H;
  if (prof) {
    const M = PROFILE_MOUSTACHE.map(pr);
    paint(through([...M, M[0]], 3), { wash: hairCol(o), ink: null });
    inkLine(M.slice(0, 7), sw * .32, hairLine(o), 'inkfine', .4);   // thin: the skull's silhouette ink runs just under it
    return;
  }
  const M = MOUSTACHE.map(([lon, lat]) => P(lon, lat, 1.0));
  if (M.filter(p => p[2] > .02).length < MOUSTACHE.length) return;   // (never: it spans lon ±.33)
  const n = 9, pts = [...through(M.slice(0, n).map(p => [p[0], p[1]]), 3), ...through(M.slice(n - 1).concat([M[0]]).map(p => [p[0], p[1]]), 3)];
  paint(pts, { wash: hairCol(o), ink: null });
  inkLine(through(M.slice(0, n).map(p => [p[0], p[1]]), 3), sw * .3, hairLine(o), 'inkfine', 0);
}

// The profile mouth, on the leading edge between the moustache and the lower lip. Open shapes drop the jaw (H.jaw, set
// in survivorHead) and show a dark wedge between the lips.
function profileMouth(H, m) {
  const { sw, S, pr, jaw } = H, C = PROFILE_MOUTH.corner, L = PROFILE_MOUTH.lips, line = (P, w = .6) => inkLine(P.map(pr), sw * w, mixCol(S.dk, PAL.ink, .6), 'ink', .5);
  if (PROFILE_OPEN[m] != null) {
    const W = [[.8, .59], [.87, .572], [.945, .575], [.935, .6 + jaw], [.87, .608 + jaw * .9]];
    paint(W.map(pr), { wash: '#4A1F2A', ink: PAL.ink, sw: sw * .5 });
    if (['grin', 'teeth', 'laugh'].includes(m)) paint([[.88, .574], [.942, .577], [.94, .59], [.885, .589]].map(pr), { wash: PAL.cream, ink: null });
    if (['open', 'laugh', 'wail', 'yawn'].includes(m)) paint(ellPts(...pr([.89, .596 + jaw * .8]), .04 * H.R, .018 * H.R, 10), { wash: PAL.rose, ink: null });
    return;
  }
  switch (m) {
    case 'smile': line([[C[0], C[1] - .02], [.835, .593], L]); break;
    case 'smirk': line([[C[0], C[1] - .035], [.835, .591], L]); break;
    case 'frown': line([[C[0], C[1] + .02], [.835, .588], L]); break;
    case 'wobble': case 'cat': line([C, [.825, .582], [.845, .594], L], .55); break;
    case 'pout': line([C, L], .55); paint([[.9, .576], [.952, .59], [.948, .626], [.905, .632]].map(pr), { wash: mixCol(S.col, PAL.rose, .4), ink: PAL.ink, sw: sw * .45 }); break;
    case 'tongue': line([C, L]); paint([[.9, .59], [.97, .6], [.975, .64], [.92, .645]].map(pr), { wash: PAL.rose, ink: PAL.ink, sw: sw * .45 }); break;
    default: line([C, [.835, .591], L], .45);   // flat or resting
  }
}

// Hair: the cap above the hairline, over the top of the skull. Its outline is the skull's outline (a little fuller at
// the crown, tapering back to the skull at both ends, so nothing steps where the hair ends).
function headHair(H) {
  const { u, sw, o, R, th, P, sk, ang } = H, style = o.hair || 'short';
  if (style === 'bald') return;
  const col = hairCol(o), loV = -Math.PI / 2 - th + .015, hiV = Math.PI / 2 - th - .015, line = [];
  const N = Math.ceil((hiV - loV) / .025);
  for (let i = 0; i <= N; i++) { const lon = lerp(loV, hiV, i / N), p = P(lon, hairLat(lon, th, style)); line.push([p[0], p[1]]); }
  const a0 = ang(line[line.length - 1]), a1 = ang(line[0]);
  let da = a1 - a0; while (da > 0) da -= TAU;   // over the top: from the far end, round to the near end
  const crown = style === 'buzz' ? 0 : style === 'messy' ? .05 : .03, arc = [];
  for (let i = 0; i <= 30; i++) {
    const a = a0 + da * i / 30, d = Math.min(i, 30 - i) / 30 * Math.abs(da), taper = clamp(d / .35);
    arc.push(sk(a, 1 + taper * (crown + (style === 'messy' ? .03 * Math.sin(i * 2.7) : 0))));
  }
  paint([...line, ...arc], { wash: col, ink: null });
  inkLine(arc, sw * .9, PAL.ink, 'ink', 0);
  // the hairline in thin brown, except along the sideburn's foot where a full beard carries on below it
  const sb = sideburnLon(th), joins = o.beard && o.beard !== 'stubble';
  let run = [];
  const flush = () => { if (run.length > 1) inkLine(run, sw * .32, hairLine(o), 'inkfine', 0); run = []; };
  for (let i = 0; i <= N; i++) { const a = Math.abs(wrapLon(lerp(loV, hiV, i / N))); if (joins && a > sb + .03 && a < 1.355) { run.push(line[i]); flush(); } else run.push(line[i]); }
  flush();
  if (H.back) {   // the crown's whorl and a few strands, so the back of the head isn't a plain brown ball
    const c = sk(-Math.PI / 2, .55), w = [];
    for (let i = 0; i <= 10; i++) { const a = i / 10 * 4.4, r = (.03 + .1 * i / 10) * R; w.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * .8]); }
    inkLine(w, sw * .35, hairLine(o), 'inkfine', .5);
    for (const a of [-2.5, -.6, 1.9]) { const q = [c[0] + Math.cos(a) * .2 * R, c[1] + Math.sin(a) * .16 * R]; inkLine([q, [q[0] + Math.cos(a + .5) * .14 * R, q[1] + Math.sin(a + .5) * .12 * R], [q[0] + Math.cos(a + .8) * .26 * R, q[1] + Math.sin(a + .8) * .22 * R]], sw * .3, hairLine(o), 'inkfine', .5); }
  }
  if (style === 'bun') paint(ellPts(H.hcx - R * (th > .35 ? .75 : .6), H.hcy - R * .95, .8 * u, .7 * u, 12), { wash: col, ink: PAL.ink, sw: sw * .7 });
}

// The plain eyes are dark ovals with a glint (Clawd's are tall slits); happy and shut eyes are thin arcs; every other
// mood uses clawd.js's eye shapes. Runs inside the face's eye frame (scaled .5 × .38), so lines are drawn thinner here.
function humanEye(k, s, u, o, sw) {
  if (k === 'happy') { inkLine([[-.85 * u, .55 * u], [0, -.55 * u], [.85 * u, .55 * u]], sw * .5, EYE_INK, 'ink', .7); return; }
  if (k === 'sly') {   // half-lidded, looking sideways: scheming. The lower half of the eye shows under a heavy lid.
    const lx = (o.lookX ?? .7) * u * .45, lid = -.05 * u + (o.lookY || 0) * u * .2, P = [];
    for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; P.push([lx + Math.cos(a) * .62 * u, lid + Math.sin(a) * .72 * u]); }
    paint(P, { wash: EYE_INK, ink: null });
    if (u > 9) paint(ellPts(lx - .2 * u, lid + .22 * u, .17 * u, .19 * u, 10), { wash: PAL.cream, washOp: 235, ink: null });
    inkLine([[-.95 * u, lid - .02 * u], [.95 * u, lid - .1 * u]], sw * .6, EYE_INK, 'ink', 0);
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

// A ring of the skull's outline, radius r head radii, between angles a0 and a1 (gear.js uses it for seams and ridges).
const headArc = (hcx, hcy, R, r, a0, a1, n = 14, bump = null) => {
  const P = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), k = bump ? r + bump[1] * Math.exp(-(((a - bump[0]) / .35) ** 2)) : r; P.push([hcx + Math.cos(a) * k * R, hcy + Math.sin(a) * k * R]); }
  return P;
};

// Electrocuted: a spiky halo of hair standing on end, round the crown (a ring, so the face stays clear). a0..a1 = the
// angles it spans (default: over the top, from side to side); frizzRange(th) keeps it off a turned face.
const frizzRange = th => th > .35 && th < Math.PI - .35 ? [Math.PI * .92, TAU - (th > 1.2 ? .55 : .4)] : [Math.PI * .92, Math.PI * 2.08];
function frizzHalo(u, sw, o, hcx, hcy, R, a0 = Math.PI * .92, a1 = Math.PI * 2.08) {
  const F = [], n = 26, fz = clamp(o.frizz);
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n), rr = R * (1.1 + (i % 2 ? .12 : .42 + .1 * hash(i + 3)) * fz); F.push([hcx + Math.cos(a) * rr, hcy + Math.sin(a) * rr]); }
  for (let i = n; i >= 0; i--) { const a = lerp(a0, a1, i / n); F.push([hcx + Math.cos(a) * R * .97, hcy + Math.sin(a) * R * .97]); }
  paint(F, { wash: hairCol(o), ink: null });
  inkLine(F.slice(0, n + 1), sw * .7, PAL.ink, 'ink', 0);
  if (o.soot > .3) for (let i = 0; i <= n; i += 4) { const [x, y] = F[i], fl = .5 + .5 * Math.sin(T * 14 + i); glow(x, y, .5 * u, '#FF9A3A', .5 * fl * o.soot); paint(ellPts(x, y, .1 * u, .1 * u, 6), { wash: '#FFB04A', ink: null }); }   // singed tips still glowing
}

// Soot on the face (o.soot 0..1; survivor.js sootPatches does the body): uneven ash-grey smudges on the turned head,
// kept off the eyes so the face still acts.
function sootFace(H, k, key) {
  const { u, P } = H;
  for (const [lon, lat, r, rot] of [[-.72, .4, .55, .4], [.66, .52, .45, -.3], [.18, -.7, .5, .15], [-.3, .88, .38, .9], [.95, -.1, .3, 0]]) {
    const p = P(lon, lat); if (p[2] < .15) continue;
    boilSeed('sootf' + key + lon);
    const f = clamp(p[2] * 1.3, .45, 1);
    paint(ellPts(p[0], p[1], r * u * 1.25 * f, r * u, 9, r * u * .3, rot), { wash: '#3E3D43', washOp: 130 * k, ink: null });
  }
}
