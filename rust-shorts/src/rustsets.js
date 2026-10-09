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

// A Rust pine (reference: the in-game landscapes): a tall thin trunk and ragged, drooping branch tiers that thin out
// toward the top, dark blue-green. s = scale (1 ≈ 560 px tall). hit = seconds since the last rock hit (it shakes);
// mark = the red X weak spot; fallK 0..1 topples it.
function pineTree(x, y, s = 1, o = {}) {
  const hit = o.hit ?? 99, shake = hit < .5 ? Math.exp(-hit * 9) * Math.sin(hit * 50) * 10 * s : 0, fall = clamp(o.fallK ?? 0);
  const key = Math.round(x) * 7 + Math.round(y);
  boilSeed('pine' + key);
  push(); translate(x, y); rotate(fall * 1.45 * (o.fallDir ?? 1)); translate(shake, 0);
  const night = clamp((o.tod ?? 0) - 1), dk = mixCol(RUST.pineDk, '#18263A', night), md = mixCol(RUST.pine, '#1E3248', night), lt = mixCol(RUST.pineLt, '#2C4460', night);
  paint([[-20 * s, 0], [20 * s, 0], [8 * s, -540 * s], [-8 * s, -540 * s]], { wash: mixCol(RUST.bark, '#2A2230', night), ink: PAL.ink, sw: 1.1 });
  for (let k = 0; k < 7; k++) {   // branch tiers, widest low, each a ragged drooping fan
    const yy = (-150 - k * 62) * s, w = (175 - k * 21) * s * (.85 + .3 * hash(k + key)), h = 105 * s, lean = (hash(k * 3 + key) - .5) * 30 * s;
    const P = [[-w + lean, yy + h * .15]];
    for (let i = 1; i < 7; i++) { const fx = -w + lean + (2 * w) * i / 7; P.push([fx, yy + h * (.05 + .22 * (i % 2)) + 6 * s * Math.sin(i * 2.3 + k)]); }
    P.push([w + lean, yy + h * .15], [w * .35 + lean * .5, yy - h * .55], [0, yy - h * .85], [-w * .35 + lean * .5, yy - h * .55]);
    paint(P, { wash: k % 2 ? md : dk, ink: PAL.ink, sw: .9, curv: .15 });
    paint([[-w * .5 + lean, yy - h * .05], [w * .05, yy - h * .1], [-w * .1, yy - h * .6]], { wash: lt, washOp: 110, ink: null });
  }
  paint([[-16 * s, -560 * s], [16 * s, -560 * s], [0, -640 * s]], { wash: dk, ink: PAL.ink, sw: .8 });
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
// A door in a w × h doorway (reference: the in-game icons). kind: wood (pale planks, Z brace) | metal (sheet metal: a
// scrap patchwork of rusty, painted sheets) | garage (corrugated roll-up) | armor (dark riveted steel with a vent slot).
// open 0..1 swings it (it narrows, like a turn).
function doorPanel(x, y, w, h, kind = 'wood', o = {}) {
  const open = clamp(o.open ?? 0), ww = w * Math.max(.08, 1 - open), x0 = x, y0 = y - h;
  boilSeed('door' + Math.round(x) + kind);
  if (open > .02) paint(rectPts(x0, y0, w, h, 1), { wash: o.inside || '#2A2430', ink: PAL.ink, sw: 1 });   // the dark room behind
  if (kind === 'wood') {
    paint(rectPts(x0, y0, ww, h, 1), { wash: '#C9A27A', ink: PAL.ink, sw: 1.1 });
    for (let k = 1; k < 4; k++) inkLine([[x0 + ww * k / 4, y0 + 6], [x0 + ww * k / 4, y - 6]], .7, '#8E6A46', 'inkfine', 0);
    for (const yy of [y0 + h * .12, y - h * .12]) paint(rectPts(x0 + 6, yy - h * .05, ww - 12, h * .1), { wash: '#B48C62', ink: PAL.ink, sw: .6 });
    paint([[x0 + 10, y - h * .17], [x0 + ww - 10, y0 + h * .22], [x0 + ww - 10, y0 + h * .3], [x0 + 10, y - h * .09]], { wash: '#B48C62', ink: PAL.ink, sw: .6 });
  } else if (kind === 'metal') {
    paint(rectPts(x0, y0, ww, h, 1), { wash: '#6E6A66', ink: PAL.ink, sw: 1.1 });
    const patches = [[.05, .06, .9, .2, '#8E5A3A'], [.1, .3, .55, .16, '#B9B2A2'], [.6, .28, .32, .22, '#7F8C96'], [.08, .52, .4, .14, '#4E7FA8'], [.5, .55, .44, .12, '#C9C4B8'], [.08, .7, .85, .22, '#7A4A34']];
    for (const [px, py, pw, ph, c] of patches) { paint(rectPts(x0 + ww * px, y0 + h * py, ww * pw, h * ph, 1), { wash: c, ink: PAL.ink, sw: .5 }); }
    for (let k = 0; k < 4; k++) inkLine([[x0 + ww * .62, y0 + h * (.3 + k * .045)], [x0 + ww * .9, y0 + h * (.3 + k * .045)]], .6, '#3E4A54', 'inkfine', 0);
    for (const yy of [y0 + 10, y - 10]) for (let k = 0; k < 4; k++) paint(ellPts(x0 + 10 + (ww - 20) * k / 3, yy, 3.5, 3.5, 6), { wash: '#D8D2C4', ink: null });
  } else if (kind === 'garage') {
    paint(rectPts(x0, y0, ww, h, 1), { wash: '#A9B1B8', ink: PAL.ink, sw: 1.1 });
    for (let k = 1; k < 12; k++) inkLine([[x0 + 4, y0 + h * k / 12], [x0 + ww - 4, y0 + h * k / 12]], .8, '#6E7882', 'inkfine', 0);
    paint(rectPts(x0 + ww * .1, y0 + h * .4, ww * .3, h * .12), { wash: '#5E87A8', washOp: 170, ink: null });
    paint(rectPts(x0 + ww * .55, y0 + h * .62, ww * .35, h * .1), { wash: '#B5653A', washOp: 150, ink: null });
  } else {   // armor
    paint(rectPts(x0, y0, ww, h, 1), { wash: '#4A4E54', ink: PAL.ink, sw: 1.2 });
    paint(rectPts(x0 + ww * .1, y0 + h * .06, ww * .8, h * .88), { wash: '#5A6068', ink: PAL.ink, sw: .7 });
    paint(rectPts(x0 + ww * .25, y0 + h * .2, ww * .5, h * .05), { wash: '#1E1B22', ink: null });   // the vent slot
    for (let r = 0; r < 4; r++) for (const xx of [x0 + ww * .16, x0 + ww * .84]) paint(ellPts(xx, y0 + h * (.15 + r * .23), 5, 5, 8), { wash: '#A3ABB3', ink: PAL.ink, sw: .4 });
  }
  if (ww > w * .3 && kind !== 'garage') paint(rectPts(x0 + ww * .8, y0 + h * .48, 10, 30), { wash: '#2E2B30', ink: PAL.ink, sw: .5 });   // handle
}
// Code lock (reference icon): a green keypad box with a little display and a status light. state: 'locked' (red) |
// 'open' (green) | 'set' (blinking yellow). press = the key being pressed (0..11) or -1. s = 1 ≈ 64 × 92 px.
function codeLock(x, y, s = 1, state = 'locked', o = {}) {
  boilSeed('lock' + Math.round(x));
  const led = state === 'open' ? '#5BE07A' : state === 'set' ? (frac(T * 3) < .5 ? '#FFD84D' : '#6B5A2A') : '#E8334A';
  push(); translate(x, y); scale(s);
  paint(rrPts(-32, -46, 64, 92, 8, .5), { wash: '#3F5A3A', ink: PAL.ink, sw: 1 });
  paint(rrPts(-24, -40, 48, 16, 3), { wash: '#2A1A1A', ink: null });
  for (let i = 0; i < 4; i++) paint(rectPts(-20 + i * 10, -36, 6, 8), { wash: state === 'open' ? '#7FE08A' : '#E8484A', washOp: 200, ink: null });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const k = r * 3 + c, on = o.press === k; paint(rrPts(-22 + c * 16, -18 + r * 14, 12, 10, 3), { wash: on ? '#F2E2A0' : '#B9BDB4', ink: null }); }
  glow(22, 38, 16, led, .9);
  paint(ellPts(22, 38, 4.5, 4.5, 8), { wash: led, ink: null });
  pop();
}
// Tool cupboard (reference icon): a tall wooden cabinet with notes pinned to its doors.
function toolCupboard(x, y, s = 1) {
  boilSeed('tc' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint(rectPts(-62, -240, 124, 240, 1), { wash: '#8A5E3C', ink: PAL.ink, sw: 1.1 });
  for (const xx of [-56, 4]) paint(rectPts(xx, -232, 52, 224, 1), { wash: '#9C6E48', ink: PAL.ink, sw: .7 });
  for (const [px, py, r] of [[-40, -200, .1], [-22, -150, -.15], [20, -190, .08], [30, -120, -.1]]) { push(); translate(px, py); rotate(r); paint(rectPts(-12, -16, 24, 30), { wash: '#E9E1CF', ink: PAL.ink, sw: .4 }); inkLine([[-7, -8], [7, -8]], .5, '#6E6A60', 'inkfine', 0); inkLine([[-7, -1], [5, -1]], .5, '#6E6A60', 'inkfine', 0); pop(); }
  pop();
}
// Sleeping bag (reference icon): a tan canvas roll-mat with patches.
function sleepingBag(x, y, s = 1, col = '#B3A07C') {
  boilSeed('bag' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint(rrPts(-130, -30, 260, 30, 14), { wash: col, ink: PAL.ink, sw: 1 });
  paint(rrPts(-130, -38, 60, 38, 16), { wash: mixCol(col, '#FFFFFF', .2), ink: PAL.ink, sw: .8 });
  paint(rectPts(10, -26, 50, 18), { wash: '#8E5A3A', washOp: 140, ink: null });
  inkLine([[-60, -28], [120, -28]], .6, mixCol(col, PAL.ink, .4), 'inkfine', 0);
  pop();
}
// Furnace (reference: the devblog photo and icon): a bottle-shaped clay kiln on a ring of dark stones, glowing inside.
function furnace(x, y, s = 1, lit = 1, t = T) {
  boilSeed('furnace' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint(ellPts(0, -28, 92, 34, 20, 2), { wash: '#4E4A48', ink: PAL.ink, sw: 1 });
  for (let i = 0; i < 7; i++) paint(ellPts(-72 + i * 24, -30 + 6 * Math.sin(i), 16, 13, 10, 1), { wash: '#6A6560', ink: PAL.ink, sw: .5 });
  paint([[-70, -40], [-78, -130], [-50, -190], [-28, -215], [-26, -250], [26, -250], [28, -215], [50, -190], [78, -130], [70, -40]], { wash: '#B9714A', ink: PAL.ink, sw: 1.1, curv: .3 });
  paint(rrPts(-30, -262, 60, 18, 6), { wash: '#A8643F', ink: PAL.ink, sw: .8 });
  paint([[-40, -60], [-55, -150], [-30, -195], [-10, -150]], { wash: '#CC8A60', washOp: 140, ink: null });
  paint(rrPts(-30, -130, 60, 52, 18), { wash: '#2A1E1A', ink: PAL.ink, sw: .8 });
  if (lit > .02) { glow(0, -104, 110 * lit, '#FFB347', lit); paint(rrPts(-24, -124, 48, 40, 14), { wash: mixCol('#F28A2E', '#FFE08A', .5 + .5 * Math.sin(t * 9)), ink: null }); }
  pop();
}
// Large wood box (reference icon): a pale wooden chest with dark metal edges and corners.
function woodBox(x, y, s = 1) {
  boilSeed('box' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint(rectPts(-120, -120, 240, 120, 1), { wash: '#C9A27A', ink: PAL.ink, sw: 1.1 });
  paint(rectPts(-120, -120, 240, 26), { wash: '#B48C62', ink: PAL.ink, sw: .8 });
  for (const yy of [-64, -30]) inkLine([[-114, yy], [114, yy]], .7, '#8E6A46', 'inkfine', 0);
  for (const xx of [-120, 102]) paint(rectPts(xx, -120, 18, 120), { wash: '#4A4E54', ink: PAL.ink, sw: .6 });
  paint(rectPts(-12, -100, 24, 18), { wash: '#4A4E54', ink: PAL.ink, sw: .5 });
  pop();
}

// ---------- explosives and booms ----------
// C4 / timed explosive (reference icon): a bundle of black sticks wrapped in silver tape, with a blinking red light.
function c4(x, y, s = 1, armed = 1, rate = 2) {
  boilSeed('c4' + Math.round(x));
  push(); translate(x, y); scale(s);
  for (let i = 0; i < 3; i++) paint(rrPts(-50, -34 + i * 22, 100, 22, 8), { wash: '#26252B', ink: PAL.ink, sw: .8 });
  for (const xx of [-30, 18]) paint(rectPts(xx, -38, 14, 76), { wash: '#B9BEC4', ink: PAL.ink, sw: .6 });
  const on = armed > 0 && frac(T * rate) < .3;
  if (on) glow(0, -2, 44, '#FF3048', 1);
  paint(rrPts(-10, -12, 20, 16, 3), { wash: '#3A3A40', ink: PAL.ink, sw: .5 });
  paint(ellPts(0, -4, 5, 5, 8), { wash: on ? '#FF5A6A' : '#6A2A30', ink: null });
  pop();
}
// Beancan grenade (reference icon): a rusty brown can scrawled with white, a rope fuse. fuse 0..1 (1 = full).
function beancan(x, y, s = 1, fuse = 1, lit = true) {
  boilSeed('bean' + Math.round(x));
  push(); translate(x, y); scale(s);
  paint(rrPts(-26, -64, 52, 64, 6), { wash: '#7A4A34', ink: PAL.ink, sw: 1 });
  paint(ellPts(0, -64, 26, 7, 12), { wash: '#9A6A50', ink: PAL.ink, sw: .6 });
  inkLine([[-16, -40], [-8, -28], [0, -42], [8, -27], [16, -40]], 1.6, '#F2EFE6', 'ink', .3);   // the white scrawl
  inkLine([[0, -66], [6, -66 - 30 * fuse], [-4, -72 - 34 * fuse]], 1.6, '#C9B48A', 'ink', .5);
  if (lit && fuse > 0) { const fx = -4, fy = -72 - 34 * fuse; glow(fx, fy, 30, '#FFC85A', .9); paint(starPts(fx, fy, 10 + 3 * Math.sin(T * 40), .4, 6, T * 20), { wash: '#FFE08A', ink: null }); }
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
