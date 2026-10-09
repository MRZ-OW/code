// gear.js: what the players wear, drawn over the survivor rig (survivor.js calls these). Each piece follows its item
// image on rust-app.com (https://rust-app.com/items/img/<shortname>.png): metal facemask, metal chestplate, roadsign
// kilt, hazmat suit, the scientist suits. Body-local coordinates as in survivor.js (feet at y 0, +x forward in 3/4 and
// profile); head pieces get the head centre (hcx, hcy) and radius R, and can use turnPt() to sit on a turned head.
// ---------- gear (reference: the in-game item icons) ----------
// Metal facemask: a welded steel plate with two eye holes, on a brown leather cap.
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
function metalMaskGear(u, sw, V, hcx, hcy, R, o = {}) {
  const F = V.face || { cx: 0, fw: 1 }, fx = hcx + F.cx * u * .8;
  const cap = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * 1.02 + i / 14 * Math.PI * .96; cap.push([hcx + Math.cos(a) * R * 1.08, hcy + Math.sin(a) * R * 1.08]); }
  paint(cap, { wash: '#6E4A2E', ink: PAL.ink, sw: sw * .8 });
  const w = 1.85 * u * F.fw + .2 * u;
  paint([[fx - w, hcy - 1.25 * u], [fx + w, hcy - 1.25 * u], [fx + w * .95, hcy + 1.55 * u], [fx, hcy + 1.9 * u], [fx - w * .95, hcy + 1.55 * u]], { wash: '#9CA3A8', ink: PAL.ink, sw: sw * .85 });
  paint([[fx - w * .9, hcy - 1.15 * u], [fx - w * .2, hcy - 1.15 * u], [fx - w * .4, hcy + 1.5 * u], [fx - w * .85, hcy + 1.35 * u]], { wash: '#B9C0C4', washOp: 150, ink: null });
  const e = o.eyes || 'normal', kinds = Array.isArray(e) ? e : [e, e];
  for (const s of V.face ? V.face.eyes : [-1, 1]) { const ex = fx + s * .85 * u * F.fw; paint(rrPts(ex - .32 * u, hcy - .4 * u, .64 * u, .42 * u, .15 * u), { wash: '#1E1B22', ink: PAL.ink, sw: sw * .4 }); maskEye(ex + .02 * u, hcy - .19 * u, u, sw, (o.squint || 0) > .8 ? 'closed' : kinds[s < 0 ? 0 : 1], s, o); }
  for (const [rx, ry] of [[-.8, -1], [.8, -1], [-.8, 1.3], [.8, 1.3]]) paint(ellPts(fx + rx * w, hcy + ry * u, .12 * u, .12 * u, 6), { wash: '#5E656B', ink: null });
}
// ---- hazmat suit and scientist suits (reference: rust-app.com hazmatsuit and hazmatsuit_scientist_* icons) ----
// Hazmat: a red hood that drapes over the shoulders, a big grey visor window, a mustard-yellow coverall with worn blue
// patches, a dark belt, a black breathing hose, one black rubber gauntlet and one blue glove, dark boots with a yellow band.
const HAZ = { suit: '#D3AA36', hood: '#B83A2D', hoodDk: '#8C2A22', visor: '#8D99A2', visorLt: '#D2DCE2', patch: '#4F7FC0', belt: '#36302E', boot: '#2E3631', gloveA: '#2A2729', gloveB: '#4F86C8' };
// Scientists: a full coverall in the variant colour, a black helmet-hood, a gas mask with two dark lenses and a round
// filter, chest webbing, a belt with pouches, black gloves and boots.
const SCI = { peacekeeper: '#4E5843', arctic: '#B9BDBE', naval: '#4F5E6E', nvgm: '#2E2E33', outbreak: '#3E77B6' };
function hazmatBodyGear(u, sw, V, tw, shY, wy) {
  if (!V.back) for (const [px, py, pw, ph, r] of [[-.55, .35, .5, .32, .4], [.1, .5, .42, .28, -.3], [-.2, .72, .36, .2, .2]]) paint(ellPts(px * tw, shY + py * (wy - shY), pw * tw, ph * (wy - shY) * .5, 9, .1 * u, r), { wash: HAZ.patch, washOp: 200, ink: null });   // worn blue patches
  paint(rectPts(-tw * .92, wy - .45 * u, tw * 1.84, .5 * u), { wash: HAZ.belt, ink: PAL.ink, sw: sw * .5 });   // belt
  const s = V.side ? -1 : -1;   // the breathing hose: from behind the hood on the near side, looping down to the belt
  inkLine(through([[s * tw * .7, shY + .3 * u], [s * tw * 1.08, shY + 1.8 * u], [s * tw * .95, wy - 1.0 * u], [s * tw * .7, wy - .3 * u]], 4), sw * 1.6, '#232025', 'ink', 0);
}
function scientistBodyGear(u, sw, V, tw, shY, wy, bw) {
  const web = '#232227';
  if (!V.back) {   // chest webbing: two straps over the shoulders to the belt, a radio pouch on the chest
    for (const s of V.side ? [1] : [-1, 1]) inkLine([[s * tw * .45, shY + .1 * u], [s * tw * .4, wy - .4 * u]], sw * 1.5, web, 'ink', 0);
    paint(rrPts(-tw * .25 + (V.side ? .4 * u : 0), shY + 1.1 * u, tw * .5, .9 * u, .15 * u), { wash: mixCol(web, '#555', .25), ink: PAL.ink, sw: sw * .45 });
  }
  paint(rectPts(-tw * .94, wy - .5 * u, tw * 1.88, .55 * u), { wash: web, ink: PAL.ink, sw: sw * .5 });   // belt
  for (const s of [-1, 1]) paint(rrPts(s * tw * .62 - .38 * u, wy - .3 * u, .76 * u, .8 * u, .12 * u), { wash: mixCol(web, '#5A5650', .3), ink: PAL.ink, sw: sw * .4 });   // pouches
}
function suitHeadGear(u, sw, o, V, S, hcx, hcy, R, gear, shY) {
  const turned = V.side, th = V === SV.side ? HEAD_TURN.side : HEAD_TURN.q;
  // the window or mask outline on the face, projected on the turned head (lon −.78..+.78, lat −.5..+.62)
  const panel = (l0, l1, a0, a1) => {
    const P = [], push_ = (lon, lat) => { const p = turned ? turnPtClamped(hcx, hcy, R, th, lon, lat, 1.04) : [hcx + Math.sin(lon) * Math.cos(lat) * R * 1.04, hcy + Math.sin(lat) * R]; P.push([p[0], p[1]]); };
    for (let i = 0; i <= 8; i++) push_(lerp(l0, l1, i / 8), a0);
    for (let i = 0; i <= 6; i++) push_(l1, lerp(a0, a1, i / 6));
    for (let i = 0; i <= 8; i++) push_(lerp(l1, l0, i / 8), a1);
    for (let i = 0; i <= 6; i++) push_(l0, lerp(a1, a0, i / 6));
    return P;
  };
  if (gear.hazmat) {
    // the hood drapes over the shoulders like a bib, then domes over the head
    paint([[-2.1 * u, shY + .4 * u], [2.1 * u, shY + .4 * u], [1.5 * u, shY + 1.9 * u], [0, shY + 2.4 * u], [-1.5 * u, shY + 1.9 * u]], { wash: HAZ.hood, ink: PAL.ink, sw: sw * .8, curv: .3 });
    paint(ellPts(hcx, hcy - .05 * u, R * 1.1, R * 1.1, 28, u * .03), { wash: HAZ.hood, ink: PAL.ink, sw: sw * .9 });
    if (!V.back) {
      paint(ellPts(hcx - (turned ? .3 * R : 0), hcy - .7 * R, R * .5, R * .25, 12, 0, -.3), { wash: mixCol(HAZ.hood, '#FFFFFF', .2), washOp: 120, ink: null });   // a sheen on the hood
      const W_ = panel(-.8, .8, -.48, .58);
      paint(W_, { wash: HAZ.visor, ink: PAL.ink, sw: sw * .8, curv: .25 });
      // the face shows faintly through the visor, so he can still act
      const e = o.eyes || 'normal', kinds = Array.isArray(e) ? e : [e, e];
      for (const s of [-1, 1]) {
        const lon = s * .4, p = turned ? turnPt(hcx, hcy, R, th, lon, -.02, .84) : [hcx + s * .85 * u, hcy - .05 * u, 1];
        if (p[2] <= .08) continue;
        push(); translate(p[0], p[1]); scale(.46 * (turned ? clamp(Math.cos(lon + th), .3, 1) : 1), .38); humanEye(kinds[s < 0 ? 0 : 1], s, u, { ...o, eyeCol: '#2A2F36' }, sw * 2.2); pop();
      }
      const c = W_.reduce((a, p) => [a[0] + p[0] / W_.length, a[1] + p[1] / W_.length], [0, 0]);
      paint([[c[0] - .9 * u, c[1] - .9 * u], [c[0] - .45 * u, c[1] - .95 * u], [c[0] - 1.3 * u, c[1] + .6 * u], [c[0] - 1.6 * u, c[1] + .4 * u]], { wash: HAZ.visorLt, washOp: 150, ink: null });   // reflection
    }
    return;
  }
  // scientist: a black helmet-hood and a gas mask
  const sc = SCI[gear.scientist] || SCI.peacekeeper;
  paint(ellPts(hcx, hcy - .05 * u, R * 1.06, R * 1.06, 28, u * .02), { wash: '#1F1E23', ink: PAL.ink, sw: sw * .9 });
  inkLine(headArc(hcx, hcy, R, .9, Math.PI * 1.1, Math.PI * 1.9, 12), sw * .5, '#3A3940', 'inkfine', 0);   // helmet seam
  if (V.back) return;
  const M = panel(-.82, .82, -.42, .9);
  paint(M, { wash: '#2C2B31', ink: PAL.ink, sw: sw * .8, curv: .25 });   // the rubber mask
  for (const s of [-1, 1]) {   // two dark lenses
    const lon = s * .42, p = turned ? turnPt(hcx, hcy, R, th, lon, -.05, .95) : [hcx + s * .95 * u, hcy - .12 * u, 1];
    if (p[2] <= .08) continue;
    const f = turned ? clamp(Math.cos(lon + th), .3, 1) : 1;
    paint(ellPts(p[0], p[1], .58 * u * f, .52 * u, 14), { wash: '#4A5662', ink: PAL.ink, sw: sw * .6 });
    paint(ellPts(p[0] - .16 * u * f, p[1] - .16 * u, .14 * u * f, .1 * u, 8), { wash: '#C6D2DA', ink: null });   // glint
  }
  const fp = turned ? turnPt(hcx, hcy, R, th, 0, .62, 1.22) : [hcx, hcy + 1.45 * u, 1];   // the round filter canister
  paint(ellPts(fp[0], fp[1], .72 * u * (turned ? .8 : 1), .66 * u, 16), { wash: '#56545C', ink: PAL.ink, sw: sw * .7 });
  paint(ellPts(fp[0], fp[1], .38 * u * (turned ? .8 : 1), .34 * u, 12), { wash: '#34333A', ink: PAL.ink, sw: sw * .4 });
  if (gear.scientist === 'arctic' || gear.scientist === 'outbreak') paint(ellPts(hcx - (turned ? .5 * R : 0), hcy - .75 * R, R * .4, R * .2, 10), { wash: sc, washOp: 160, ink: null });   // a coloured stripe on the hood
}
function gasMaskGear(u, sw, V, hcx, hcy, R) {   // reference: hazmatsuit icon — a black respirator mask framed by the red hood
  const F = V.face, fx = hcx + F.cx * u * .9;
  paint(ellPts(fx, hcy + .25 * u, 1.45 * u * F.fw + .22 * u, 1.45 * u, 20), { wash: '#2E2B30', ink: PAL.ink, sw: sw * .8 });
  for (const s of F.eyes) { paint(ellPts(fx + s * .66 * u * F.fw, hcy - .15 * u, .42 * u * F.fw + .08 * u, .4 * u, 14), { wash: '#7FA9B8', ink: PAL.ink, sw: sw * .5 }); paint(ellPts(fx + s * .66 * u * F.fw - .12 * u, hcy - .28 * u, .11 * u, .09 * u, 8), { wash: '#DDEEF2', ink: null }); }
  paint(ellPts(fx + (V.side ? .75 : 0) * u, hcy + 1.05 * u, .55 * u, .48 * u, 14), { wash: '#4A464E', ink: PAL.ink, sw: sw * .6 });
  paint(ellPts(fx + (V.side ? .75 : 0) * u, hcy + 1.05 * u, .25 * u, .22 * u, 10), { wash: '#26232A', ink: null });
}
// Metal chestplate: a steel vest with brown leather straps and buckles.
function chestplateGear(u, sw, V, tw, shY, wy) {
  paint([[-tw * .82, shY + .4 * u], [tw * .82, shY + .4 * u], [tw * .92, wy - .2 * u], [-tw * .92, wy - .2 * u]], { wash: '#9BA2A7', ink: PAL.ink, sw: sw * .8 });
  paint([[-tw * .7, shY + .55 * u], [-tw * .1, shY + .55 * u], [-tw * .25, wy - .4 * u], [-tw * .78, wy - .4 * u]], { wash: '#C2C8CC', washOp: 120, ink: null });
  for (const s of [-1, 1]) { paint(rectPts(s * tw * .55 - .3 * u, shY - .1 * u, .6 * u, 1.2 * u), { wash: '#7A5032', ink: PAL.ink, sw: sw * .5 }); paint(rectPts(s * tw * .92 - .2 * u, shY + 1.8 * u, .4 * u, 1.4 * u), { wash: '#7A5032', ink: PAL.ink, sw: sw * .5 }); }
  paint(rectPts(-.25 * u, wy - 1.0 * u, .5 * u, .35 * u), { wash: '#C9B27A', ink: PAL.ink, sw: sw * .4 });
}
// Roadsign kilt: road-sign panels on a leather belt.
function roadsignKiltGear(u, sw, V, bw, wy) {
  const cols = ['#3E6FB8', '#E8E4DA', '#5E8A6E', '#3E6FB8'];
  for (let i = 0; i < 4; i++) {
    const x0 = lerp(-bw * 1.08, bw * 1.08, i / 4), x1 = lerp(-bw * 1.08, bw * 1.08, (i + 1) / 4);
    paint([[x0, wy + .2 * u], [x1, wy + .2 * u], [x1 + (i - 1.5) * .12 * u, wy + 2.2 * u], [x0 + (i - 1.5) * .12 * u, wy + 2.3 * u]], { wash: cols[i], ink: PAL.ink, sw: sw * .6 });
    const cx = lerp(x0, x1, .5), cy = wy + 1.2 * u, r = (x1 - x0) * .26;   // sign icons: an arrow, a no-entry disc, a stripe
    if (i === 0) inkLine([[cx - r, cy + r * .4], [cx + r * .6, cy - r * .4], [cx + r * .1, cy - r * .7], [cx + r * .6, cy - r * .4], [cx + r * .3, cy + r * .2]], sw * .8, '#F2EFE6', 'ink', 0);
    else if (i === 1) { paint(ellPts(cx, cy, r, r, 12), { wash: '#C8402E', ink: null }); paint(rectPts(cx - r * .7, cy - r * .2, r * 1.4, r * .4), { wash: '#F2EFE6', ink: null }); }
    else if (i === 2) inkLine([[cx - r, cy], [cx + r, cy]], sw * .8, '#F2EFE6', 'ink', 0);
    else paint(rectPts(cx - r * .55, cy - r * .7, r * 1.1, r * 1.4), { wash: '#F2EFE6', washOp: 220, ink: null });
  }
  paint(rectPts(-bw * 1.1, wy - .05 * u, bw * 2.2, .45 * u), { wash: '#6E4A2E', ink: PAL.ink, sw: sw * .6 });
}

