// sets.js: the places and big props, all in world coordinates.
//   spawnRoom(t, o)          the team's spawn room; o.lamps 0..3 lit, o.gate 0 closed → 1 open, o.warm 0..1 (ending light)
//   westSky(t, o)            sky + sun + mesas for the payload map; o.noon 0 turquoise → 1 burning orange, o.sun [x, y], o.gold
//   street(t, o)             ground, rails, saloon (Genji's roof), water tower, cacti, the checkpoint arch (o.arch)
//   payload(x, y, s, t, o)   the cart; o.roll = wheel turn (radians), o.core glow
//   tumbleweed(x, y, r, t), confetti(t, t0, area), firework(x, y, age, col), speedBands(t, k) for Play of the Game
// World layout of the street: horizon y 600; rails y 872-892; payload rides at y 884; saloon x 0-560 (roof y 520);
// water tower x 2300-2420 (tank top y 330); checkpoint arch at x 2880.

const STREET = { horizon: 600, rail: 884, roof: 520, saloon: [0, 560], tower: 2360, arch: 2880 };

// ---------- spawn room ----------
function spawnRoom(t, o = {}) {
  const lamps = o.lamps ?? 0, gate = clamp(o.gate ?? 0), warm = o.warm ?? 0;
  boilSeed('spawn-wall');
  paint(rectPts(-400, -300, W + 2400, 1130), { wash: mixCol('#3E5C6B', '#6B5A4A', warm * .5), ink: null });
  paint(rectPts(-400, -300, W + 2400, 360), { fill: '#2C4250', fillOp: 120, bleed: .12, tex: .5, ink: null });
  for (let i = 0; i < 9; i++) { boilSeed('panel' + i); const x = -200 + i * 230; inkLine([[x, 120], [x + 2, 820]], .7, '#2C4250', 'inkfine', 0); }
  inkLine([[-300, 470], [1290, 472]], .8, '#2C4250', 'inkfine', 0);
  // the emblem: a painted plus in a ring (the support's room)
  boilSeed('emblem');
  paint(ellPts(560, 330, 120, 120, 30, 2), { wash: '#4F7484', ink: '#2C4250', sw: 1.2 });
  paint([[-.22, -.7], [.22, -.7], [.22, -.22], [.7, -.22], [.7, .22], [.22, .22], [.22, .7], [-.22, .7], [-.22, .22], [-.7, .22], [-.7, -.22], [-.22, -.22]].map(([a, b]) => [560 + a * 120, 330 + b * 120]), { wash: '#C9DDE2', ink: null });
  // floor
  boilSeed('spawn-floor');
  paint(rectPts(-400, 820, W + 2400, 500), { wash: '#2B3B47', fill: '#1F2A33', fillOp: 90, bleed: .05, tex: .6, ink: PAL.ink, sw: 1.2 });
  for (let i = -6; i <= 6; i++) inkLine([[960 + i * 170, 824], [960 + i * 290, 1300]], .5, '#3E5160', 'inkfine', 0);
  // the gate: daylight behind it, a door that slides up
  const gx = 1330, gy = 250, gw = 470, gh = 572;
  boilSeed('gate-light');
  paint(rectPts(gx, gy, gw, gh), { wash: mixCol('#FFE9B8', '#FFF6DE', gate), ink: null });
  if (gate > .02) glow(gx + gw / 2, gy + gh * .6, 520 * gate, '#FFE2A0', gate);
  const lift = gh * easeIn(gate) * 1.02;
  push(); // clip the door to the frame by drawing it only where it still covers the opening
  if (lift < gh - 4) {
    boilSeed('gate-door');
    paint(rectPts(gx, gy, gw, gh - lift, 1), { wash: '#6F8796', ink: PAL.ink, sw: 1.2 });
    for (let k = 0; k < 5; k++) { const yy = gy + gh - lift - 40 - k * 104; if (yy > gy + 20) inkLine([[gx + 12, yy], [gx + gw - 12, yy]], .7, '#4C6270', 'inkfine', 0); }
    const by = gy + gh - lift - 70; if (by > gy) for (let k = 0; k < 6; k++) paint([[gx + 20 + k * 76, by], [gx + 58 + k * 76, by], [gx + 30 + k * 76, by + 46], [gx - 8 + k * 76, by + 46]], { wash: k % 2 ? '#2B2233' : '#F2C53D', ink: null });
  }
  pop();
  boilSeed('gate-frame');
  paint([[gx - 40, gy - 60], [gx + gw + 40, gy - 60], [gx + gw + 40, gy + gh], [gx + gw, gy + gh], [gx + gw, gy], [gx, gy], [gx, gy + gh], [gx - 40, gy + gh]], { wash: '#55707F', ink: PAL.ink, sw: 1.3 });
  // three lamps over the gate
  for (let i = 0; i < 3; i++) {
    boilSeed('lamp' + i);
    const lx = gx + 110 + i * 125, on = lamps > i, lit = on ? clamp((lamps - i) * 4) : 0;
    if (on) glow(lx, gy - 30, 90, '#7CFF8A', .8 * lit);
    paint(ellPts(lx, gy - 30, 24, 24, 16), { wash: on ? '#6BE07A' : '#C8323F', ink: PAL.ink, sw: .9 });
    paint(ellPts(lx - 7, gy - 37, 7, 6, 8), { wash: '#FFFFFF', washOp: 160, ink: null });
  }
}

// ---------- the payload map ----------
function westSky(t, o = {}) {
  const noon = clamp(o.noon ?? 0), gold = clamp(o.gold ?? 0);
  const top = mixCol(mixCol('#4FB3C8', '#E2622E', noon), '#F2B84A', gold), low = mixCol(mixCol('#BDE6DA', '#FFC46B', noon), '#FFE7A8', gold);
  boilSeed('sky');
  paint(rectPts(-1200, -1600, 5200, 2300), { wash: top, ink: null });
  paint(rectPts(-1200, 300, 5200, 420), { fill: low, fillOp: 200, bleed: .2, tex: .3, border: .2, ink: null });
  const [sx, sy] = o.sun || [1500, 330];
  boilSeed('sun');
  glow(sx, sy, 330 + 120 * noon, noon > .5 ? '#FFD27A' : '#FFF2C4', .55 + .45 * noon);
  paint(ellPts(sx, sy, 78, 78, 26, 1.5), { wash: mixCol('#FFF6D8', '#FFE08A', noon), ink: null });
  // a few soft clouds that fade out at noon
  if (noon < .9) for (let i = 0; i < 4; i++) {
    boilSeed('cloud' + i);
    const cx = -300 + i * 900 + 40 * Math.sin(t * .1 + i), cy = 150 + 70 * hash(i + 3);
    paint(ellPts(cx, cy, 170 + 40 * hash(i), 38, 18, 4), { wash: '#F4FBF7', washOp: 200 * (1 - noon), ink: null });
  }
  // mesas along the horizon (far = paler)
  const mesa = (x, w, h, col, key) => {
    boilSeed('mesa' + key);
    const y = STREET.horizon + 10;
    paint([[x - w * .55, y], [x - w * .42, y - h * .55], [x - w * .36, y - h], [x + w * .34, y - h], [x + w * .4, y - h * .6], [x + w * .55, y]], { wash: col, ink: mixCol(col, PAL.ink, .4), sw: .8 });
    inkLine([[x - w * .3, y - h * .62], [x + w * .32, y - h * .64]], .6, mixCol(col, PAL.ink, .25), 'inkfine', 0);
  };
  const far = mixCol(mixCol('#D9A07A', '#E0705A', noon), '#F0C27A', gold), near = mixCol(mixCol('#C4683F', '#B4442C', noon), '#D8903E', gold);
  mesa(-200, 700, 150, far, 'a'); mesa(1250, 900, 120, far, 'b'); mesa(2700, 800, 170, far, 'c');
  mesa(600, 520, 230, near, 'd'); mesa(2050, 640, 260, near, 'e'); mesa(3500, 600, 220, near, 'f');
}

function street(t, o = {}) {
  const noon = clamp(o.noon ?? 0), gold = clamp(o.gold ?? 0), hz = STREET.horizon;
  const sand = mixCol(mixCol('#E8C48E', '#E0A060', noon), '#F0CC80', gold);
  boilSeed('ground');
  paint(rectPts(-1200, hz, 5200, 1100), { wash: sand, ink: null });
  paint(rectPts(-1200, hz, 5200, 120), { fill: mixCol(sand, '#B97A4A', .5), fillOp: 110, bleed: .15, tex: .5, ink: null });
  inkLine([[-1200, hz + 2], [4000, hz + 4]], .8, mixCol(sand, PAL.ink, .5), 'inkfine', 0);
  // the payload track
  boilSeed('rails');
  paint(rectPts(-1200, STREET.rail - 22, 5200, 50), { wash: mixCol(sand, '#9C7450', .45), ink: null });
  for (let i = 0; i < 40; i++) { const x = -1100 + i * 130; paint(rectPts(x, STREET.rail - 16, 26, 40), { wash: '#7A5236', ink: null }); }
  inkLine([[-1200, STREET.rail - 10], [4000, STREET.rail - 10]], 1.5, '#5B5F66', 'ink', 0);
  inkLine([[-1200, STREET.rail + 14], [4000, STREET.rail + 14]], 1.5, '#5B5F66', 'ink', 0);
  // cacti
  for (const [cx, h, k] of [[760, 120, 0], [1720, 90, 1], [2650, 140, 2], [-300, 110, 3], [3300, 120, 4]]) {
    boilSeed('cactus' + k);
    const cy = hz + 70 + 20 * hash(k), col = mixCol('#6E9F58', '#7F8F3A', noon);
    paint(rrPts(cx - 14, cy - h, 28, h, 13), { wash: col, ink: PAL.ink, sw: .8 });
    paint(rrPts(cx - 46, cy - h * .7, 20, h * .38, 10), { wash: col, ink: PAL.ink, sw: .7 });
    paint(rrPts(cx + 24, cy - h * .82, 20, h * .32, 10), { wash: col, ink: PAL.ink, sw: .7 });
  }
  // water tower (the Cowboy's perch)
  boilSeed('tower');
  const tx = STREET.tower + (o.towerShake || 0), wood = mixCol('#8A5A3A', '#7A3A22', noon);
  for (const lx of [-70, -24, 24, 70]) inkLine([[tx + lx * .6, 470], [tx + lx, 850]], 2.4, wood, 'ink', 0);
  inkLine([[tx - 64, 640], [tx + 64, 760]], 1.2, wood, 'ink', 0); inkLine([[tx + 64, 640], [tx - 64, 760]], 1.2, wood, 'ink', 0);
  paint(rrPts(tx - 105, 340, 210, 140, 16), { wash: mixCol('#A8714A', '#94502E', noon), ink: PAL.ink, sw: 1.1 });
  for (const yy of [370, 420, 465]) inkLine([[tx - 104, yy], [tx + 104, yy]], .9, '#5A3A22', 'inkfine', 0);
  paint([[tx - 118, 345], [tx, 290], [tx + 118, 345]], { wash: mixCol('#7A4A30', '#6A3420', noon), ink: PAL.ink, sw: 1 });
  // the saloon (Genji's roof)
  boilSeed('saloon');
  const [x0, x1] = STREET.saloon, base = 860, top = STREET.roof, plank = mixCol(mixCol('#C98B55', '#B86A3E', noon), '#E0A060', gold);
  paint([[x0, base], [x0, top - 70], [x0 + 120, top - 70], [x0 + 150, top - 120], [x1 - 150, top - 120], [x1 - 120, top - 70], [x1, top - 70], [x1, base]], { wash: plank, ink: PAL.ink, sw: 1.3 });
  for (let k = 1; k < 9; k++) inkLine([[x0 + 8, top - 70 + k * 55], [x1 - 8, top - 70 + k * 55 + 3]], .6, mixCol(plank, PAL.ink, .35), 'inkfine', 0);
  paint(rectPts(x0 - 30, top - 8, x1 - x0 + 60, 26, 1), { wash: mixCol(plank, PAL.ink, .3), ink: PAL.ink, sw: 1.1 });   // the roof ledge
  for (const px of [x0 + 20, x1 - 30]) paint(rectPts(px - 6, top + 18, 16, base - top - 18), { wash: mixCol(plank, PAL.ink, .2), ink: PAL.ink, sw: .8 });
  paint(rectPts(x0 + 200, base - 190, 160, 190, 1), { wash: '#3A2A22', ink: PAL.ink, sw: 1 });           // doorway
  for (const s of [-1, 1]) paint(rectPts(x0 + 280 + s * 6 - (s < 0 ? 74 : 0), base - 160, 74, 100, 1), { wash: plank, ink: PAL.ink, sw: .9 });   // swinging doors
  for (const wx of [x0 + 60, x1 - 150]) { paint(rectPts(wx, base - 300, 90, 110, 1), { wash: '#F7D79A', ink: PAL.ink, sw: .9 }); inkLine([[wx + 45, base - 300], [wx + 45, base - 190]], .7, PAL.ink, 'inkfine', 0); }
  paint(rrPts(x0 + 130, top - 40, x1 - x0 - 260, 70, 10), { wash: '#7A3A2A', ink: PAL.ink, sw: 1 });         // blank sign board
  inkLine([[x0 + 160, top - 5], [x1 - 160, top - 5]], 1.4, PAL.gold || '#E8B23A', 'ink', 0);
  // the checkpoint arch
  if (o.arch !== false) {
    boilSeed('arch');
    const ax = STREET.arch, ac = mixCol('#5A86A8', '#4A6A90', noon);
    for (const s of [-1, 1]) paint(rectPts(ax + s * 230 - 24, 430, 48, 470, 1), { wash: ac, ink: PAL.ink, sw: 1.1 });
    paint(rrPts(ax - 270, 395, 540, 70, 18), { wash: ac, ink: PAL.ink, sw: 1.2 });
    paint(rectPts(ax - 250, 418, 500, 22), { wash: '#F2C53D', ink: null });
    for (let k = 0; k < 7; k++) { const fx = ax - 210 + k * 70, fl = Math.sin(t * 5 + k) * 6; paint([[fx, 465], [fx + 44, 465], [fx + 22 + fl, 515]], { wash: k % 2 ? '#F2F2F2' : '#4FB3C8', ink: PAL.ink, sw: .6 }); }
  }
}

// The payload: a cream capsule on a dark chassis with a glowing teal core. (x, y) = ground centre on the rails.
function payload(x, y, s, t, o = {}) {
  const roll = o.roll || 0, core = o.core ?? 1, sw = clamp(1.2 * s, .6, 1.8);
  boilSeed('payload');
  push(); translate(x, y); scale(s);
  paint(ellPts(0, 6, 210, 18, 20), { wash: PAL.ink, washOp: 70, ink: null });
  for (const wx of [-125, -50, 50, 125]) {                                   // wheels
    paint(ellPts(wx, -22, 30, 30, 16, .5), { wash: '#2E3238', ink: PAL.ink, sw });
    for (let k = 0; k < 3; k++) { const a = roll + k * TAU / 3; inkLine([[wx, -22], [wx + Math.cos(a) * 24, -22 + Math.sin(a) * 24]], 1, '#8A9099', 'inkfine', 0); }
    paint(ellPts(wx, -22, 8, 8, 10), { wash: '#B8BEC6', ink: null });
  }
  paint(rrPts(-180, -78, 360, 46, 12, .5), { wash: '#3D434C', ink: PAL.ink, sw });                    // chassis
  for (let k = 0; k < 9; k++) paint([[-170 + k * 38, -70], [-150 + k * 38, -70], [-168 + k * 38, -40], [-188 + k * 38, -40]], { wash: k % 2 ? '#2B2233' : '#F2C53D', ink: null });
  paint(rrPts(-165, -235, 330, 165, 70, .5), { wash: '#F3EEE4', ink: PAL.ink, sw });                   // capsule body
  paint(rrPts(-150, -128, 300, 40, 18), { wash: '#D9D2C4', ink: null });
  paint(rectPts(-165, -170, 330, 16), { wash: '#F28A3E', ink: null });                                 // orange stripe
  if (core > .02) glow(0, -158, 170 * core, '#7FF0E0', .9 * core);
  paint(ellPts(0, -158, 52, 52, 20, .5), { wash: '#2F5F66', ink: PAL.ink, sw });                      // core window
  paint(ellPts(0, -158, 36, 36, 18), { wash: mixCol('#5FC7BD', '#BFFFF4', core * (.6 + .4 * Math.sin(t * 6))), ink: null });
  paint(rectPts(-10, -268, 20, 34), { wash: '#5B616A', ink: PAL.ink, sw: sw * .7 });                   // beacon
  const blink = .5 + .5 * Math.sin(t * 8);
  if (o.beacon !== false) glow(0, -276, 60, '#FFB84A', .5 + .5 * blink);
  paint(ellPts(0, -276, 14, 12, 10), { wash: mixCol('#E8A33A', '#FFE6A8', blink), ink: PAL.ink, sw: sw * .6 });
  pop();
}

function tumbleweed(x, y, r, t) {
  boilSeed('tumble');
  push(); translate(x, y - r); rotate(t * 5);
  for (let i = 0; i < 7; i++) { const a = i * 1.3; inkLine(ellPts(0, 0, r * (.7 + .3 * hash(i)), r * (.55 + .4 * hash(i + 3)), 12, 0, a).concat([[r * .5, 0]]), .9, '#9C7A4A', 'inkfine', .6); }
  pop();
}

// Confetti falling from t0 over the frame (screen space if no camera). Deterministic per piece.
function confetti(t, t0, n = 60, area = [0, -100, W, H]) {
  const a = t - t0; if (a < 0) return;
  const cols = ['#F2C14E', '#E2476E', '#4FB3C8', '#8CF06A', '#FFF5E2', '#F28A3E'];
  for (let i = 0; i < n; i++) {
    boilSeed('conf' + i);
    const x = area[0] + hash(i) * area[2] + Math.sin(a * 3 + i) * 30, y = area[1] + (hash(i + 50) * .5 - .5) * area[3] + a * (260 + 160 * hash(i + 9));
    if (y > area[1] + area[3] + 40) continue;
    push(); translate(x, y); rotate(a * (4 + 4 * hash(i + 2)) + i); scale(1, Math.cos(a * 7 + i));
    paint(rectPts(-9, -5, 18, 10), { wash: cols[i % cols.length], ink: null });
    pop();
  }
}
// A firework at (x, y): with rise > 0 a rocket streaks up from below for `rise` seconds before age 0 (the whistle), then
// it bursts at age 0 (the boom).
function firework(x, y, age, col = '#F2C14E', n = 12, rise = 0) {
  if (age < 0 && age > -rise) {
    const k = easeOut(1 + age / rise), ry = lerp(y + 650, y, k);
    boilSeed('rocket' + Math.round(x));
    glow(x, ry, 50, col, .8);
    inkLine([[x + 6 * Math.sin(age * 40), ry + 90], [x, ry]], 2.4, '#FFF5E2', 'ink', 0);
    return;
  }
  if (age < 0 || age > 1.1) return;
  const k = clamp(age / 1.1);
  boilSeed('fw' + Math.round(x));
  if (age < .15) glow(x, y, 240 * age / .15, col, 1);
  glow(x, y, 200, col, .6 * (1 - k));
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, d = 190 * easeOut(k), gx = x + Math.cos(a) * d, gy = y + Math.sin(a) * d + 60 * k * k;
    inkLine([[lerp(x, gx, .55), lerp(y, gy, .55)], [gx, gy]], 2.2 * (1 - k * .7), col, 'ink', 0);
    paint(starPts(gx, gy, 12 * (1 - k * .5), .35, 4, k * 3), { wash: '#FFF5E2', washOp: 255 * (1 - k), ink: null });
  }
}
// Play of the Game: diagonal speed bands sweeping across. k 0..1 how much of the frame they cover.
function speedBands(t, k = 1) {
  const cols = ['#F28A3E', '#FFF5E2', '#2F3C7A', '#F2C14E', '#FFF5E2', '#E2622E'];
  for (let i = 0; i < 6; i++) {
    boilSeed('band' + i);
    const y0 = -400 + i * 330, sh = 260 * Math.sin(t * .6 + i) * 0;
    const x1 = lerp(-800, W + 900, easeOut(clamp(k * 1.3 - i * .06)));
    if (x1 < -700) continue;
    paint([[-800, y0 + sh], [x1, y0 - 420 + sh], [x1, y0 - 90 + sh], [-800, y0 + 330 + sh]], { wash: cols[i], ink: null });
  }
  for (let i = 0; i < 14; i++) {
    boilSeed('speed' + i);
    const y = hash(i) * H, x = frac(hash(i + 7) + t * 1.8) * (W + 600) - 300, L = 160 + 220 * hash(i + 3);
    inkLine([[x, y], [x + L, y - L * .55]], 1.1, '#FFF5E2', 'inkfine', 0);
  }
}
