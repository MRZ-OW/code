// rustsets.js: the Rust world, painted. World coordinates; a vertical frame is 1080 × 1920 (cameras pan wider sets).
//   rustSky(t, o)                 sky + sun/moon + clouds. o.tod: 0 day → 1 dusk → 2 night, o.sun [x, y]
//   seaBeach(t, o)                sea with rolling foam, wet sand and the beach. o.horizon, o.shore, o.far (x span)
//   hills(t, o)                   far forested hills on the horizon
//   pineTree(x, y, s, o)          o.hit = s since the last hit (it shakes), o.mark = the red X weak spot, o.fallK 0..1 timber
//   oreNode(x, y, s, kind, o)     kind: 'stone' | 'metal' | 'sulfur'; o.glint = the sparkling weak spot, o.crack 0..1
//   bush(x, y, s, o), grassTufts(x0, x1, y, t, n)
// Ground convention: (x, y) is the point where the object meets the ground.

const RUST = {
  sand: '#E9D3A1', sandDk: '#CDB07A', wet: '#C9B48A', sea: '#3E8EA6', seaDk: '#2C6E86', seaLt: '#7CC3CF', foam: '#F1F8F2',
  grass: '#86A75C', grassDk: '#5F8040', dirt: '#8C6C4A', pine: '#3E6B4B', pineDk: '#2B4E37', pineLt: '#5E8E62', bark: '#6E4B33',
  stone: '#A0A6AC', stoneDk: '#6F767D', metal: '#8F99A2', metalDk: '#5D666F', rusty: '#B5653A', sulfur: '#E2C541',
  wood: '#BB8C58', woodDk: '#7F5B37', twig: '#CDA76D', skyTop: '#86C3DD', skyLow: '#D4ECEB',
};

function rustSky(t, o = {}) {
  const tod = o.tod ?? 0, dusk = clamp(tod), night = clamp(tod - 1);
  const top = mixCol(mixCol(RUST.skyTop, '#E48A63', dusk), '#1E2550', night), low = mixCol(mixCol(RUST.skyLow, '#F6C487', dusk), '#3B3F6E', night);
  boilSeed('sky');
  paint(rectPts(-1600, -1800, W + 3200, 2800), { wash: top, ink: null });
  paint(rectPts(-1600, (o.horizon ?? 900) - 520, W + 3200, 560), { fill: low, fillOp: 190, bleed: .18, tex: .3, border: .2, ink: null });
  const [sx, sy] = o.sun || [800, 380];
  boilSeed('sun');
  if (night < .9) { glow(sx, sy, 300, dusk > .5 ? '#FFB46A' : '#FFF2C4', .5 + .3 * dusk); paint(ellPts(sx, sy, 70, 70, 24, 1.5), { wash: mixCol('#FFF6D8', '#FFB070', dusk), ink: null }); }
  if (night > .1) {   // moon and stars
    paint(ellPts(sx, sy, 60, 60, 24, 1.5), { wash: '#F4EED8', washOp: 255 * night, ink: null });
    for (let i = 0; i < 36; i++) { boilSeed('star' + i); const x = hash(i) * (W + 400) - 200, y = hash(i + 50) * 800 - 100, tw = .6 + .4 * Math.sin(t * (2 + 2 * hash(i + 3)) + i); paint(starPts(x, y, (3 + 4 * hash(i + 9)) * tw, .35, 4), { wash: PAL.cream, washOp: 230 * night, ink: null }); }
  }
  if (o.clouds !== false) for (let i = 0; i < 5; i++) {
    boilSeed('cloud' + i);
    const cx = -500 + i * 520 + 30 * Math.sin(t * .1 + i), cy = 160 + 120 * hash(i + 3), w = 150 + 60 * hash(i);
    const c = mixCol(mixCol('#F7FBF8', '#FFD9B8', dusk), '#5A5F8A', night);
    paint(ellPts(cx, cy, w, 34 + 10 * hash(i + 1), 18, 4), { wash: c, washOp: 220, ink: null });
    paint(ellPts(cx - w * .3, cy - 20, w * .45, 30, 14, 3), { wash: c, washOp: 220, ink: null });
  }
}

function hills(t, o = {}) {
  const y0 = o.horizon ?? 900, night = clamp((o.tod ?? 0) - 1), dusk = clamp(o.tod ?? 0);
  const far = mixCol(mixCol('#7FA38C', '#9C7F86', dusk), '#2C3556', night), near = mixCol(mixCol('#5E8A62', '#7A6050', dusk), '#232B45', night);
  boilSeed('hills-far');
  const P = [[-1600, y0 + 10]]; for (let i = 0; i <= 24; i++) { const x = -1600 + i * 220; P.push([x, y0 - 90 - 60 * Math.sin(i * 1.3) - 40 * hash(i)]); }
  P.push([W + 1700, y0 + 10]);
  paint(P, { wash: far, ink: null });
  boilSeed('hills-near');   // a band of distant pine tips
  const Q = [[-1600, y0 + 12]]; for (let i = 0; i <= 80; i++) { const x = -1600 + i * 62; Q.push([x, y0 - 30 - 22 * hash(i + 7)], [x + 31, y0 - 6 - 10 * hash(i + 9)]); }
  Q.push([W + 1700, y0 + 12]);
  paint(Q, { wash: near, ink: null });
}

// The sea and beach. horizon: where sea meets sky; shore: where the sea's edge meets the sand (y).
function seaBeach(t, o = {}) {
  const hz = o.horizon ?? 900, shore = o.shore ?? 1180, x0 = o.x0 ?? -1600, x1 = o.x1 ?? W + 1600, night = clamp((o.tod ?? 0) - 1), dusk = clamp(o.tod ?? 0);
  const sea = mixCol(mixCol(RUST.sea, '#5C7FA0', dusk), '#1C2D4C', night), seaLt = mixCol(mixCol(RUST.seaLt, '#E8A98A', dusk), '#2E4468', night);
  boilSeed('sea');
  paint(rectPts(x0, hz, x1 - x0, shore - hz + 40), { wash: sea, ink: null });
  paint(rectPts(x0, hz, x1 - x0, 60), { wash: seaLt, washOp: 150, ink: null });
  for (let i = 0; i < 7; i++) {   // glints on the water
    boilSeed('glint' + i); const gx = x0 + 300 + hash(i) * (x1 - x0 - 600), gy = hz + 40 + hash(i + 4) * (shore - hz - 120);
    inkLine([[gx, gy], [gx + 50 + 40 * hash(i + 8), gy]], .8, mixCol(seaLt, '#FFFFFF', .4), 'inkfine', 0);
  }
  // sand, with the wet band and a rolling foam line
  const sand = mixCol(mixCol(RUST.sand, '#E8B58A', dusk * .6), '#4A4C66', night * .8), wet = mixCol(mixCol(RUST.wet, '#C49A80', dusk * .6), '#3A3D58', night * .8);
  boilSeed('sand');
  paint(rectPts(x0, shore, x1 - x0, 2200), { wash: sand, ink: null });
  paint(rectPts(x0, shore, x1 - x0, 46), { wash: wet, ink: null });
  const surge = 14 * Math.sin(t * 1.6), P = [];
  for (let i = 0; i <= 30; i++) { const x = x0 + (x1 - x0) * i / 30; P.push([x, shore + 6 + surge + 8 * Math.sin(i * 1.7 + t * 2)]); }
  boilSeed('foam');
  paint(ribbon(P, 16, 16), { wash: mixCol(RUST.foam, '#7A86A8', night), washOp: 230, ink: null });
  inkLine([[x0, shore - 1], [x1, shore - 1]], .7, mixCol(sea, PAL.ink, .4), 'inkfine', 0);
  // pebbles and driftwood
  for (let i = 0; i < 9; i++) { boilSeed('pebble' + i); const px = x0 + 200 + hash(i + 20) * (x1 - x0 - 400), py = shore + 140 + hash(i + 30) * 520; paint(ellPts(px, py, 14 + 10 * hash(i), 9 + 5 * hash(i + 2), 10, 1), { wash: mixCol(sand, PAL.ink, .25), ink: null }); }
}

// A Rust pine. s = scale (1 ≈ 520 px tall). hit = seconds since the last rock hit (shakes), mark = draw the red X weak spot.
function pineTree(x, y, s = 1, o = {}) {
  const hit = o.hit ?? 99, shake = hit < .5 ? Math.exp(-hit * 9) * Math.sin(hit * 50) * 10 * s : 0, fall = clamp(o.fallK ?? 0);
  boilSeed('pine' + Math.round(x) + ',' + Math.round(y));
  push(); translate(x, y); rotate(fall * 1.45 * (o.fallDir ?? 1)); translate(shake, 0);
  const night = clamp((o.tod ?? 0) - 1), dk = mixCol(RUST.pineDk, '#18263A', night), md = mixCol(RUST.pine, '#1E3248', night), lt = mixCol(RUST.pineLt, '#2C4460', night);
  paint(rectPts(-22 * s, -150 * s, 44 * s, 152 * s, 2), { wash: mixCol(RUST.bark, '#2A2230', night), ink: PAL.ink, sw: 1.1 });
  for (let k = 0; k < 4; k++) {
    const yy = -130 * s - k * 95 * s, w = (190 - k * 38) * s, h = 170 * s;
    paint([[-w, yy], [w, yy], [w * .55, yy - h * .45], [w * .7, yy - h * .42], [0, yy - h], [-w * .7, yy - h * .42], [-w * .55, yy - h * .45]], { wash: k % 2 ? md : dk, ink: PAL.ink, sw: 1.1 });
    paint([[-w * .55, yy - 8 * s], [w * .1, yy - 8 * s], [-w * .05, yy - h * .5]], { wash: lt, washOp: 120, ink: null });
  }
  if (o.mark) {   // the red X that tells you where to hit next
    const mk = backOut(clamp(o.markK ?? 1)), mx = (o.markX ?? 4) * s, my = (o.markY ?? -80) * s;
    glow(mx, my, 50 * s, '#FF5A4A', .6 * mk);
    for (const d of [1, -1]) inkLine([[mx - 16 * s * mk, my - 16 * s * mk * d], [mx + 16 * s * mk, my + 16 * s * mk * d]], 3.2 * s, '#E0283F', 'ink', 0);
  }
  pop();
}

// Ore nodes: a lumpy boulder with coloured veins. kind: stone | metal | sulfur. s = 1 ≈ 300 px wide.
function oreNode(x, y, s = 1, kind = 'stone', o = {}) {
  const base = kind === 'metal' ? '#7C7B7A' : kind === 'sulfur' ? '#9C9A86' : RUST.stone, spot = kind === 'metal' ? '#B5653A' : kind === 'sulfur' ? RUST.sulfur : '#E4E7EA';
  const hit = o.hit ?? 99, shake = hit < .35 ? Math.exp(-hit * 12) * Math.sin(hit * 60) * 6 * s : 0;
  boilSeed('node' + Math.round(x));
  push(); translate(x + shake, y);
  const P = [[-150, 0], [-165, -60], [-120, -140], [-40, -175], [50, -165], [130, -120], [160, -50], [150, 0]].map(([a, b]) => [a * s, b * s]);
  paint(P, { wash: base, ink: PAL.ink, sw: 1.2 });
  paint([[-110 * s, -40 * s], [-60 * s, -150 * s], [10 * s, -160 * s], [-20 * s, -90 * s]], { wash: mixCol(base, '#FFFFFF', .2), washOp: 160, ink: null });
  for (let i = 0; i < 6; i++) paint(ellPts((-90 + i * 36) * s, (-40 - 90 * hash(i + 3)) * s, (14 + 8 * hash(i)) * s, (9 + 5 * hash(i + 1)) * s, 10, 1, hash(i) * 3), { wash: spot, ink: PAL.ink, sw: .6 });
  if (o.crack) inkLine([[-20 * s, -170 * s], [0, -110 * s], [-30 * s, -60 * s], [10 * s, 0]], 1.6, PAL.ink, 'ink', 0);
  if (o.glint) {   // the sparkle that marks the sweet spot
    const gx = (o.glintX ?? 60) * s, gy = (o.glintY ?? -100) * s, k = .8 + .2 * Math.sin(T * 12);
    glow(gx, gy, 60 * s, '#FFF1B0', .9);
    paint(starPts(gx, gy, 24 * s * k, .25, 4, T), { wash: '#FFF8DC', ink: null });
  }
  pop();
}

function bush(x, y, s = 1, o = {}) {
  boilSeed('bush' + Math.round(x));
  const sway = Math.sin(T * 1.3 + x) * 4 * s, night = clamp((o.tod ?? 0) - 1);
  for (let i = 0; i < 4; i++) paint(ellPts(x + (-60 + i * 40) * s + sway, y - (40 + 18 * Math.sin(i * 2)) * s, (55 - 6 * i) * s, 45 * s, 16, 2), { wash: mixCol(i % 2 ? RUST.grassDk : RUST.grass, '#1C2A3E', night), ink: PAL.ink, sw: .8 });
}
function grassTufts(x0, x1, y, t, n = 12, col = RUST.grassDk) {
  for (let i = 0; i < n; i++) {
    boilSeed('tuft' + i + ',' + Math.round(y));
    const x = lerp(x0, x1, hash(i + y) ), sw = Math.sin(t * 1.5 + i) * 5;
    for (const k of [-1, 0, 1]) inkLine([[x + k * 8, y], [x + k * 13 + sw, y - 26 - 10 * hash(i + k + 3)]], .8, col, 'inkfine', .4);
  }
}

// ---------- base building (front elevation) ----------
// Grades, cheapest to strongest. Each wall/door is drawn as a w × h panel whose bottom-left is (x, y - h).
const GRADES = {
  twig:  { col: '#CDA76D', dk: '#8E6B3D' },
  wood:  { col: '#B98A57', dk: '#7E5A36' },
  stone: { col: '#A9ADB1', dk: '#74797F' },
  metal: { col: '#8E9AA6', dk: '#5C6772' },
  armor: { col: '#5E6670', dk: '#3B4249' },
};
// foundation slab under a base: x0..x1 at ground y, thickness h
function foundation(x0, x1, y, h = 46, grade = 'stone') {
  const g = GRADES[grade] || GRADES.stone;
  boilSeed('found' + Math.round(x0));
  paint(rectPts(x0 - 10, y - h, x1 - x0 + 20, h + 6, 1), { wash: g.col, ink: PAL.ink, sw: 1.1 });
  inkLine([[x0 - 6, y - h + 12], [x1 + 6, y - h + 12]], .6, g.dk, 'inkfine', 0);
}
// One wall panel. damage 0..1 adds cracks; grade picks the material pattern.
function wallPanel(x, y, w, h, grade = 'wood', o = {}) {
  const g = GRADES[grade] || GRADES.wood, x0 = x, y0 = y - h, sw = o.sw ?? 1.1;
  boilSeed('wall' + Math.round(x) + ',' + Math.round(y) + grade);
  if (grade === 'twig') {   // a see-through frame of sticks
    const sticks = [[[x0, y0], [x0, y]], [[x0 + w, y0], [x0 + w, y]], [[x0, y0], [x0 + w, y0]], [[x0, y], [x0 + w, y]], [[x0, y0], [x0 + w, y]], [[x0 + w, y0], [x0, y]], [[x0, y0 + h / 2], [x0 + w, y0 + h / 2]]];
    for (const [a, b] of sticks) paint(ribbon([a, [lerp(a[0], b[0], .5) + jit(4), lerp(a[1], b[1], .5) + jit(4)], b], 9, 7), { wash: g.col, ink: PAL.ink, sw: .7 });
    return;
  }
  paint(rectPts(x0, y0, w, h, 1.5), { wash: g.col, ink: PAL.ink, sw });
  if (grade === 'wood') for (let k = 1; k < 6; k++) inkLine([[x0 + w * k / 6, y0 + 4], [x0 + w * k / 6 + jit(2), y - 4]], .7, g.dk, 'inkfine', 0);
  if (grade === 'stone') for (let r = 0; r < 5; r++) { const yy = y0 + h * (r + 1) / 5; inkLine([[x0 + 4, yy], [x0 + w - 4, yy]], .6, g.dk, 'inkfine', 0); for (let c = 0; c < 3; c++) { const xx = x0 + w * (c + (r % 2 ? .5 : .25)) / 3; if (yy - h / 5 > y0) inkLine([[xx, yy - h / 5], [xx, yy]], .6, g.dk, 'inkfine', 0); } }
  if (grade === 'metal') { for (let k = 1; k < 9; k++) inkLine([[x0 + w * k / 9, y0 + 3], [x0 + w * k / 9, y - 3]], .6, g.dk, 'inkfine', 0); for (const yy of [y0 + 16, y - 16]) for (let k = 0; k < 6; k++) paint(ellPts(x0 + 14 + (w - 28) * k / 5, yy, 4, 4, 6), { wash: '#C9D0D6', ink: null }); paint(ellPts(x0 + w * .7, y0 + h * .35, 26, 14, 10, 2), { wash: '#B5653A', washOp: 140, ink: null }); }
  if (grade === 'armor') { paint(rectPts(x0 + 14, y0 + 14, w - 28, h - 28), { wash: g.dk, washOp: 140, ink: PAL.ink, sw: .7 }); for (const [ax, ay] of [[x0 + 24, y0 + 24], [x0 + w - 24, y0 + 24], [x0 + 24, y - 24], [x0 + w - 24, y - 24]]) paint(ellPts(ax, ay, 7, 7, 8), { wash: '#A3ABB3', ink: PAL.ink, sw: .5 }); }
  if (o.damage) for (let i = 0; i < 3 * o.damage; i++) { const cx = x0 + w * (.3 + .4 * hash(i + x)), cy = y0 + h * (.2 + .6 * hash(i + 3 + x)); inkLine([[cx, cy], [cx + 30, cy + 22], [cx + 12, cy + 50]], 1, PAL.ink, 'inkfine', 0); }
}
// A door in a w × h doorway. kind: wood | metal (sheet metal) | garage | armor. open 0..1 swings it (narrows it, like a turn).
function doorPanel(x, y, w, h, kind = 'wood', o = {}) {
  const open = clamp(o.open ?? 0), ww = w * Math.max(.08, 1 - open), x0 = x, y0 = y - h;
  boilSeed('door' + Math.round(x) + kind);
  if (open > .02) paint(rectPts(x0, y0, w, h, 1), { wash: o.inside || '#2A2430', ink: PAL.ink, sw: 1 });   // the dark room behind
  const col = kind === 'wood' ? '#A97A48' : kind === 'garage' ? '#9AA3AC' : kind === 'armor' ? '#4E555D' : '#7F8B96';
  paint(rectPts(x0, y0, ww, h, 1), { wash: col, ink: PAL.ink, sw: 1.1 });
  if (kind === 'wood') for (let k = 1; k < 4; k++) inkLine([[x0 + ww * k / 4, y0 + 6], [x0 + ww * k / 4, y - 6]], .7, '#6E4A2A', 'inkfine', 0);
  if (kind === 'garage') for (let k = 1; k < 10; k++) inkLine([[x0 + 4, y0 + h * k / 10], [x0 + ww - 4, y0 + h * k / 10]], .8, '#6B747D', 'inkfine', 0);
  if (kind === 'metal') { paint(rectPts(x0 + ww * .12, y0 + h * .1, ww * .76, h * .8), { wash: '#6E7984', washOp: 160, ink: PAL.ink, sw: .6 }); for (const yy of [y0 + 14, y - 14]) for (let k = 0; k < 4; k++) paint(ellPts(x0 + 12 + (ww - 24) * k / 3, yy, 4, 4, 6), { wash: '#C9D0D6', ink: null }); }
  if (kind === 'armor') { paint(rectPts(x0 + ww * .1, y0 + h * .08, ww * .8, h * .84), { wash: '#3B4249', ink: PAL.ink, sw: .8 }); for (let k = 0; k < 3; k++) paint(rectPts(x0 + ww * .1, y0 + h * (.2 + .3 * k), ww * .8, 10), { wash: '#6A727B', ink: null }); }
  if (ww > w * .3 && kind !== 'garage') paint(ellPts(x0 + ww * .82, y0 + h * .52, 7, 7, 8), { wash: '#D8C27A', ink: PAL.ink, sw: .6 });   // handle
}
// Code lock: a small keypad box with a status light. state: 'locked' (red) | 'open' (green) | 'set' (blinking yellow).
// press = index of the key being pressed (0..11) or -1; s = scale (1 ≈ 64 × 92 px).
function codeLock(x, y, s = 1, state = 'locked', o = {}) {
  boilSeed('lock' + Math.round(x));
  const led = state === 'open' ? '#5BE07A' : state === 'set' ? (frac(T * 3) < .5 ? '#FFD84D' : '#6B5A2A') : '#E8334A';
  push(); translate(x, y); scale(s);
  paint(rrPts(-32, -46, 64, 92, 10, .5), { wash: '#4A5058', ink: PAL.ink, sw: 1 });
  paint(rrPts(-24, -38, 48, 18, 4), { wash: '#1F2A24', ink: null });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const k = r * 3 + c, on = o.press === k; paint(rrPts(-22 + c * 16, -14 + r * 14, 12, 10, 3), { wash: on ? '#F2E2A0' : '#A9B1B9', ink: null }); }
  glow(18, -29, 22, led, .9);
  paint(ellPts(18, -29, 5, 5, 8), { wash: led, ink: null });
  pop();
}
function toolCupboard(x, y, s = 1) {
  boilSeed('tc' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint(rectPts(-60, -190, 120, 190, 1), { wash: '#9C6E45', ink: PAL.ink, sw: 1.1 });
  paint(rectPts(-50, -180, 100, 80), { wash: '#B98A57', ink: PAL.ink, sw: .8 });
  paint(rectPts(-50, -92, 100, 80), { wash: '#B98A57', ink: PAL.ink, sw: .8 });
  paint(rrPts(-24, -164, 48, 44, 6), { wash: '#E9DFC9', ink: PAL.ink, sw: .6 });   // the posted building-privilege notice (a blank card)
  inkLine([[-10, -152], [12, -132]], 1.6, '#7E5A36', 'ink', 0); paint(rectPts(4, -160, 14, 9), { wash: '#6E737A', ink: null });   // a little hammer
  pop();
}
function sleepingBag(x, y, s = 1, col = '#4E7FA8') {
  boilSeed('bag' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint(rrPts(-120, -34, 240, 34, 16), { wash: col, ink: PAL.ink, sw: 1 });
  paint(rrPts(-120, -40, 70, 40, 16), { wash: '#E9DFC9', ink: PAL.ink, sw: .8 });
  inkLine([[-40, -30], [110, -30]], .6, mixCol(col, PAL.ink, .4), 'inkfine', 0);
  pop();
}
function furnace(x, y, s = 1, lit = 1, t = T) {
  boilSeed('furnace' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint([[-80, 0], [-70, -150], [-40, -190], [40, -190], [70, -150], [80, 0]], { wash: '#8E8F92', ink: PAL.ink, sw: 1.1 });
  for (let i = 0; i < 6; i++) paint(ellPts(-50 + (i % 3) * 50, -40 - Math.floor(i / 3) * 70, 26, 18, 10, 2), { wash: '#A6A8AC', ink: PAL.ink, sw: .5 });
  paint(rrPts(-34, -86, 68, 50, 12), { wash: '#2A2024', ink: PAL.ink, sw: .8 });
  if (lit > .02) { glow(0, -60, 110 * lit, '#FF9A3A', lit); paint(rrPts(-28, -80, 56, 40, 10), { wash: mixCol('#C9502A', '#FFB45A', .5 + .5 * Math.sin(t * 9)), ink: null }); }
  pop();
}
function woodBox(x, y, s = 1) {
  boilSeed('box' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint(rectPts(-110, -110, 220, 110, 1), { wash: '#B98A57', ink: PAL.ink, sw: 1.1 });
  for (const yy of [-80, -40]) inkLine([[-104, yy], [104, yy]], .7, '#7E5A36', 'inkfine', 0);
  for (const xx of [-100, 100]) paint(rectPts(xx - 8, -110, 16, 110), { wash: '#7E5A36', ink: null });
  pop();
}

// ---------- explosives and booms ----------
// C4: a putty brick with a timer and a blinking red light. armed 0..1; beep phase quickens as it nears 0.
function c4(x, y, s = 1, armed = 1, rate = 2) {
  boilSeed('c4' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint(rrPts(-46, -30, 92, 60, 8), { wash: '#C9BE96', ink: PAL.ink, sw: 1 });
  paint(rectPts(-46, -8, 92, 14), { wash: '#4A5058', ink: null });
  paint(rrPts(-20, -24, 40, 18, 3), { wash: '#1F2A24', ink: PAL.ink, sw: .5 });
  const on = armed > 0 && frac(T * rate) < .3;
  if (on) glow(0, -15, 40, '#FF3048', 1);
  paint(ellPts(0, -15, 5, 5, 8), { wash: on ? '#FF5A6A' : '#6A2A30', ink: null });
  pop();
}
// Beancan grenade: a tin can with a burning fuse. fuse 0..1 (1 = full).
function beancan(x, y, s = 1, fuse = 1, lit = true) {
  boilSeed('bean' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint(rrPts(-24, -60, 48, 60, 6), { wash: '#B8BEC6', ink: PAL.ink, sw: 1 });
  paint(rectPts(-24, -46, 48, 26), { wash: '#C8423A', ink: null });
  inkLine([[0, -60], [6, -60 - 30 * fuse], [-4, -66 - 34 * fuse]], 1.4, '#6B4A2E', 'ink', .5);
  if (lit && fuse > 0) { const fx = -4, fy = -66 - 34 * fuse; glow(fx, fy, 30, '#FFC85A', .9); paint(starPts(fx, fy, 10 + 3 * Math.sin(T * 40), .4, 6, T * 20), { wash: '#FFE08A', ink: null }); }
  pop();
}
// A cartoon explosion: a starburst flash, a puffy fireball, then grey smoke puffs that rise, swell and thin out, with
// chunks flying on arcs and a shockwave ring. age in s; r = size.
function explosion(x, y, r, age, o = {}) {
  if (age < 0 || age > 1.8) return;
  boilSeed('boom' + Math.round(x));
  if (age < .14) { glow(x, y, r * 3.2, '#FFF1C0', 1 - age / .14); paint(starPts(x, y, r * 1.5 * easeOut(age / .1), .45, 9, x), { wash: '#FFF3B8', ink: PAL.ink, sw: 1.2 }); }
  if (age < .3) inkLine(ellPts(x, y, r * (1 + 5 * age), r * (.7 + 3.5 * age), 28), 2.2 * (1 - age / .3), '#FFF3D0', 'ink', .4);   // shockwave
  // fireball: overlapping puffs, yellow → orange, gone by .55 s
  const fk = clamp(age / .55), fire = 1 - fk;
  if (fire > 0) {
    glow(x, y, r * 2.2, '#FF9A3A', .9 * fire);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + x, d = r * .55 * easeOut(clamp(age / .25)), pr = r * (.55 + .2 * hash(i + 3)) * easeOut(clamp(age / .2)) * (1 - .3 * fk);
      paint(ellPts(x + Math.cos(a) * d, y + Math.sin(a) * d * .8 - age * 80, pr, pr * .9, 16, 2), { wash: mixCol('#FFE48A', '#F27A2E', fk + .3 * hash(i)), washOp: 255 * clamp(fire * 1.6), ink: fk < .5 ? PAL.ink : null, sw: 1 });
    }
  }
  // smoke: puffs that take over from the fire, rise, swell and fade
  for (let i = 0; i < 6; i++) {
    const st = .18 + .04 * i, a2 = age - st; if (a2 < 0) continue;
    const k = clamp(a2 / 1.3), ang = -Math.PI / 2 + (hash(i + 11) - .5) * 2.2, d = r * (.4 + 1.1 * easeOut(k));
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d * .7 - a2 * 120, pr = r * (.45 + .5 * easeOut(k)) * (.8 + .4 * hash(i));
    paint(ellPts(px, py, pr, pr * .85, 16, 2), { wash: mixCol('#8E8A90', '#C9C4C8', k), washOp: 230 * (1 - k * k) * clamp(a2 * 6), ink: k < .35 ? PAL.ink : null, sw: .8 });
  }
  for (let i = 0; i < (o.debris ?? 8); i++) {   // chunks flying out on arcs
    const a = -Math.PI / 2 + (hash(i + x) - .5) * 2.6, sp = r * (2.2 + 2 * hash(i + 7)), dx = Math.cos(a) * sp * age, dy = Math.sin(a) * sp * age + 900 * age * age;
    if (age > 1.1) continue;
    push(); translate(x + dx, y + dy); rotate(age * 10 + i);
    paint(rectPts(-10, -8, 20 + 10 * hash(i), 16), { wash: o.debrisCol || '#8E7A62', ink: PAL.ink, sw: .7 });
    pop();
  }
}
