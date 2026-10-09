// props.js: small held and set props for the episodes (references: the official item icons in scratchpad/refimg).
// Held props are drawn in hand space like rustcast.js's: (0, 0) = the hand, +x = forward, u = the holder's unit.
// Set props take a ground point (x, y) and a scale s.
//   campfire(x, y, s, t, o)       ring of grey stones, a teepee of logs, a flickering flame. o.fire 0..1 (0 = embers + smoke)
//   beanCan(u, sw, o)             held "OH WOW! BEANS!" can: a maroon label, a silver lid. o.open, o.spoon, o.rot
//   beanCanAt(x, y, s, o)         the same can standing or lying on the ground (o.lying)
//   flower(x, y, s, o)            a little white wildflower on a stem (o.rot, o.stem 0..1)

function campfire(x, y, s = 1, t = T, o = {}) {
  const fire = o.fire ?? 1, u = 100 * s, sw = clamp(s * 2.2, .6, 3);
  boilSeed('campfire-glow');
  if (fire > .02) glow(x, y - .5 * u, 2.6 * u * (.7 + .3 * fire), '#FFB04A', .85 * fire * (o.glow ?? 1));
  // back stones
  const stone = (i, front) => {
    const a = i / 9 * TAU, sx = x + Math.cos(a) * 1.05 * u, sy = y + Math.sin(a) * .32 * u;
    if ((Math.sin(a) > 0) !== front) return;
    boilSeed('cf-stone' + i);
    paint(ellPts(sx, sy - .12 * u, (.3 + .08 * hash(i)) * u, (.2 + .05 * hash(i + 3)) * u, 10, u * .02), { wash: mixCol('#9EA1A3', '#6D7175', hash(i + 7)), ink: PAL.ink, sw: sw * .8 });
  };
  for (let i = 0; i < 9; i++) stone(i, false);
  // logs (reference: the campfire icon): two crossed logs lying in the ring, their cut ends showing, and a short
  // teepee of sticks over them, charred at the tips
  [[-1.0, -.13, .75, -.37], [.95, -.11, -.7, -.35]].forEach(([x0, y0, x1, y1], i) => {
    boilSeed('cf-xlog' + i);
    paint(ribbon([[x + x0 * u, y + y0 * u], [x + x1 * u, y + y1 * u]], .34 * u, .3 * u), { wash: i ? '#7A5534' : '#8C6440', ink: PAL.ink, sw: sw * .8 });
    paint(ellPts(x + x0 * u, y + y0 * u, .14 * u, .17 * u, 12), { wash: '#D9B37C', ink: PAL.ink, sw: sw * .5 });   // end grain
    inkLine(ellPts(x + x0 * u, y + y0 * u, .06 * u, .08 * u, 8), .5, '#8C6440', 'inkfine', .5);
  });
  const logs = [[-.55, .0, -.08, -.85], [.55, .02, .08, -.85], [-.15, .1, .2, -.8]];
  logs.forEach(([x0, y0, x1, y1], i) => {
    boilSeed('cf-log' + i);
    paint(ribbon([[x + x0 * u, y + y0 * u], [x + x1 * u, y + y1 * u]], .18 * u, .12 * u), { wash: i % 2 ? '#7A5534' : '#8C6440', ink: PAL.ink, sw: sw * .7 });
    inkLine([[x + lerp(x0, x1, .6) * u, y + lerp(y0, y1, .6) * u], [x + x1 * u, y + y1 * u]], sw * .9, '#2E2620', 'ink', 0);   // charred tips
  });
  // flames: three layered tongues that flicker; at low fire only embers glow and smoke rises
  if (fire > .02) {
    const f = k => 1 + .14 * Math.sin(t * 17 + k) + .09 * Math.sin(t * 29 + k * 2);
    const tongue = (cx, w, h, col, k) => {
      const hh = h * fire * f(k), sway = .12 * u * Math.sin(t * 7 + k);
      return [[cx - w, y - .1 * u], [cx - w * .7, y - hh * .45], [cx - w * .2 + sway, y - hh * .8], [cx + sway * 1.4, y - hh], [cx + w * .35 + sway, y - hh * .7], [cx + w * .75, y - hh * .35], [cx + w, y - .1 * u]];
    };
    boilSeed('cf-flame');
    paint(tongue(x, .5 * u, 1.7 * u, '#E8692C', 0), { wash: '#E8692C', ink: PAL.ink, sw: sw * .6, curv: .45 });
    paint(tongue(x - .05 * u, .34 * u, 1.3 * u, '#F7A23B', 1.3), { wash: '#F7A23B', ink: null, curv: .45 });
    paint(tongue(x + .02 * u, .22 * u, .9 * u, '#FFE38A', 2.1), { wash: '#FFE38A', ink: null, curv: .45 });
    for (let i = 0; i < 3; i++) {   // embers flying up
      const k = frac(t * .9 + i / 3), ex = x + (hash(i + Math.floor(t * .9 + i / 3) * 3) - .5) * 1.2 * u + .3 * u * Math.sin(k * 5 + i), ey = y - (1 + 2.4 * k) * u;
      boilSeed('cf-ember' + i); paint(ellPts(ex, ey, .05 * u * (1 - k), .05 * u * (1 - k), 6), { wash: '#FFD27A', ink: null });
    }
  } else {
    boilSeed('cf-embers');
    paint(ellPts(x, y - .05 * u, .55 * u, .16 * u, 12), { wash: '#C2462A', washOp: 220, ink: null });
    glow(x, y - .1 * u, 1.1 * u, '#FF7A3A', .5);
  }
  if (o.smoke ?? (1 - fire) > .1) for (let i = 0; i < 4; i++) {
    const k = frac(t * .35 + i / 4), sx = x + .4 * u * Math.sin(k * 4 + i), sy = y - (1.2 + 4.5 * k) * u, r = (.25 + .7 * k) * u;
    boilSeed('cf-smoke' + i); paint(ellPts(sx, sy, r, r * .8, 12), { wash: '#9B9AA6', washOp: 120 * (1 - k) * (o.smoke ?? 1), ink: null });
  }
  for (let i = 0; i < 9; i++) stone(i, true);
}

// The can (reference: can.beans): a maroon label with a pale stripe and a white scrawl, silver rims, a pull-tab lid.
function beanCanShape(u, sw, o = {}) {
  const w = .62 * u, h = .95 * u, rim = '#B9BDC1';
  paint(ellPts(0, h / 2, w, .18 * u, 16), { wash: '#8E9297', ink: PAL.ink, sw: sw * .6 });                       // bottom rim
  paint(rectPts(-w, -h / 2, w * 2, h), { wash: '#8C2A2E', ink: null });                                           // label
  inkLine([[-w, -h / 2], [-w, h / 2]], sw * .6, PAL.ink, 'ink', 0); inkLine([[w, -h / 2], [w, h / 2]], sw * .6, PAL.ink, 'ink', 0);
  paint(rectPts(-w, -.06 * u, w * 2, .2 * u), { wash: '#C9B79A', washOp: 200, ink: null });                       // label stripe
  inkLine([[-.38 * w, .32 * u], [-.1 * w, .24 * u], [.2 * w, .33 * u], [.5 * w, .25 * u]], sw * .5, '#F4ECDD', 'inkfine', .5);   // the "BEANS!" scrawl
  paint(ellPts(-.45 * w, .2 * u, .07 * u, .05 * u, 6), { wash: '#D8873E', ink: null });
  paint(ellPts(.55 * w, .1 * u, .07 * u, .05 * u, 6), { wash: '#D8873E', ink: null });
  paint(ellPts(0, -h / 2, w, .2 * u, 18), { wash: o.open ? '#7A3B22' : rim, ink: PAL.ink, sw: sw * .6 });         // the top
  if (o.open) {
    for (let i = 0; i < 6; i++) paint(ellPts((hash(i) - .5) * 1.2 * w, -h / 2 + (hash(i + 4) - .5) * .18 * u, .09 * u, .06 * u, 6), { wash: '#C9733A', ink: null });
    paint([[-w * .9, -h / 2 - .05 * u], [-w * .3, -h / 2 - .45 * u], [w * .3, -h / 2 - .5 * u], [w * .6, -h / 2 - .1 * u]], { wash: rim, ink: PAL.ink, sw: sw * .5, curv: .4 });   // curled-back lid
  } else paint(ellPts(.3 * w, -h / 2, .12 * u, .06 * u, 8), { wash: '#8E9297', ink: null });                    // pull tab
  if (o.spoon) { inkLine([[.1 * u, -h / 2 + .05 * u], [.35 * u, -h / 2 - .55 * u]], sw * 1.2, '#9DA3A8', 'ink', 0); paint(ellPts(.38 * u, -h / 2 - .62 * u, .1 * u, .14 * u, 8, 0, .4), { wash: '#B9BDC1', ink: PAL.ink, sw: sw * .4 }); }
}
function beanCan(u, sw, o = {}) { push(); translate(.25 * u, -.35 * u); rotate(o.rot || 0); beanCanShape(u, sw, o); pop(); }
function beanCanAt(x, y, s = 1, o = {}) {
  const u = 60 * s, sw = clamp(s * 2, .6, 3);
  boilSeed('beancan-at' + (o.key || ''));
  push(); translate(x, y - (o.lying ? .62 * u : .55 * u)); rotate(o.lying ? Math.PI / 2 + (o.rot || 0) : (o.rot || 0)); beanCanShape(u, sw, o); pop();
}

function flower(x, y, s = 1, o = {}) {
  const u = 40 * s, sw = clamp(s * 1.6, .5, 2.5), st = o.stem ?? 1;
  boilSeed('flower' + (o.key || ''));
  push(); translate(x, y); rotate(o.rot || 0);
  if (st > 0) {
    inkLine([[0, 0], [.08 * u, -.6 * u * st], [0, -1.2 * u * st]], sw * 1.2, '#4E7A3A', 'ink', .5);
    paint(ellPts(.22 * u, -.45 * u * st, .2 * u, .08 * u, 8, 0, -.5), { wash: '#6E9F58', ink: PAL.ink, sw: sw * .4 });
  }
  const cy = -1.2 * u * st;
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3; paint(ellPts(Math.cos(a) * .26 * u, cy + Math.sin(a) * .26 * u, .2 * u, .12 * u, 10, 0, a), { wash: '#FBF6EC', ink: PAL.ink, sw: sw * .45 }); }
  paint(ellPts(0, cy, .13 * u, .13 * u, 10), { wash: '#F2C230', ink: PAL.ink, sw: sw * .4 });
  pop();
}

// ---------- ep2: the code lock up close, a pointing hand, the stone base ----------
// Seven-segment digit (the lock's display, and the faint key labels): c = centre, h = height.
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function sevenSeg(d, cx, cy, h, col, sw = 2, ghost = null) {
  const w = h * .5, P = { a: [[-w / 2, -h / 2], [w / 2, -h / 2]], b: [[w / 2, -h / 2], [w / 2, 0]], c: [[w / 2, 0], [w / 2, h / 2]], d: [[-w / 2, h / 2], [w / 2, h / 2]], e: [[-w / 2, 0], [-w / 2, h / 2]], f: [[-w / 2, -h / 2], [-w / 2, 0]], g: [[-w / 2, 0], [w / 2, 0]] };
  for (const k of 'abcdefg') {
    const on = (SEG[d] || '').includes(k), [[x0, y0], [x1, y1]] = P[k], ins = .14;
    if (!on && !ghost) continue;
    inkLine([[cx + lerp(x0, x1, ins), cy + lerp(y0, y1, ins)], [cx + lerp(x0, x1, 1 - ins), cy + lerp(y0, y1, 1 - ins)]], sw, on ? col : ghost, 'ink', 0);
  }
}
// The code lock, close up (reference: lock.code icon): a green metal box, a dark display with four red digits and a
// status LED, a 3 × 4 keypad of cream keys, a battery taped to its side with red and black wires.
//   o.digits: what's been typed ('69'); o.state: 'locked' | 'open' | 'error'; o.press: key index (0–8 = 1–9,
//   9 = *, 10 = 0, 11 = #) and o.pressK 0..1 (how far it's pushed); o.zap 0..1 crackles it
function bigLock(cx, cy, s = 1, o = {}) {
  const W2 = 260 * s, H2 = 340 * s, sw = clamp(2.2 * s, .8, 3);
  const state = o.state || 'locked', red = '#FF4A3A', grn = '#6BF07E', on = state === 'open' ? grn : red;
  boilSeed('biglock');
  paint(rrPts(cx - W2, cy - H2, W2 * 2, H2 * 2, 34 * s), { wash: '#4E6B45', ink: PAL.ink, sw: sw * 1.3 });
  paint(rrPts(cx - W2 + 18 * s, cy - H2 + 18 * s, W2 * 2 - 36 * s, H2 * 2 - 36 * s, 24 * s), { wash: '#5E7E52', ink: null });
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { paint(ellPts(cx + sx * (W2 - 38 * s), cy + sy * (H2 - 38 * s), 11 * s, 11 * s, 10), { wash: '#AEB4AA', ink: PAL.ink, sw: sw * .5 }); inkLine([[cx + sx * (W2 - 38 * s) - 6 * s, cy + sy * (H2 - 38 * s)], [cx + sx * (W2 - 38 * s) + 6 * s, cy + sy * (H2 - 38 * s)]], sw * .5, PAL.ink, 'inkfine', 0); }
  // the display
  const dx0 = cx - W2 + 50 * s, dy0 = cy - H2 + 60 * s, dw = W2 * 2 - 170 * s, dh = 130 * s;
  paint(rrPts(dx0, dy0, dw, dh, 12 * s), { wash: '#1E1416', ink: PAL.ink, sw: sw * .8 });
  const digits = (o.digits || '').slice(0, 4), blinkOff = state === 'error' && frac(T * 6) < .5;
  for (let i = 0; i < 4; i++) {
    const x = dx0 + dw * (i + .5) / 4, y = dy0 + dh / 2;
    if (i < digits.length && !blinkOff) { glow(x, y, 50 * s, on, .35); sevenSeg(digits[i], x, y, dh * .6, on, sw * 1.6, '#3A2224'); }
    else sevenSeg(8, x, y, dh * .6, '#3A2224', sw * 1.6);
  }
  // the status LED, right of the display
  const lx = cx + W2 - 62 * s, ly = dy0 + dh / 2, lc = state === 'open' ? grn : blinkOff ? '#5A1E22' : red;
  glow(lx, ly, 70 * s, lc, .8);
  paint(ellPts(lx, ly, 20 * s, 20 * s, 14), { wash: lc, ink: PAL.ink, sw: sw * .7 });
  paint(ellPts(lx - 6 * s, ly - 6 * s, 6 * s, 5 * s, 8), { wash: '#FFFFFF', washOp: 180, ink: null });
  // keypad
  const kx0 = cx - W2 + 62 * s, ky0 = dy0 + dh + 50 * s, kw = 104 * s, kh = 78 * s, gap = 22 * s, labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const k = r * 3 + c, pk = o.press === k ? clamp(o.pressK ?? 1) : 0, x = kx0 + c * (kw + gap), y = ky0 + r * (kh + gap) + 6 * s * pk;
    paint(rrPts(x, y + 8 * s, kw, kh, 14 * s), { wash: '#2E3A2A', ink: null });   // the key's shadow / depth
    paint(rrPts(x, y + 8 * s * pk, kw, kh, 14 * s), { wash: pk > 0 ? '#F4E6B0' : '#E6DFCB', ink: PAL.ink, sw: sw * .7 });
    const lab = labels[k], lxk = x + kw / 2, lyk = y + 8 * s * pk + kh / 2;
    if (lab === '*') for (const a of [0, 1.05, 2.1]) inkLine([[lxk - Math.cos(a) * 14 * s, lyk - Math.sin(a) * 14 * s], [lxk + Math.cos(a) * 14 * s, lyk + Math.sin(a) * 14 * s]], sw * .7, '#6A6456', 'inkfine', 0);
    else if (lab === '#') { for (const d of [-7, 7]) { inkLine([[lxk + d * s, lyk - 16 * s], [lxk + d * s, lyk + 16 * s]], sw * .6, '#6A6456', 'inkfine', 0); inkLine([[lxk - 16 * s, lyk + d * s], [lxk + 16 * s, lyk + d * s]], sw * .6, '#6A6456', 'inkfine', 0); } }
    else sevenSeg(lab, lxk, lyk, kh * .5, '#6A6456', sw * .7);
  }
  // the battery taped to its side, wired in (from the icon)
  const bx = cx + W2 - 20 * s, by = cy + 40 * s;
  inkLine([[bx - 10 * s, by - 120 * s], [bx - 40 * s, by - 150 * s], [bx - 80 * s, by - 170 * s]], sw * 1.1, '#C8402E', 'ink', .5);
  inkLine([[bx - 10 * s, by + 120 * s], [bx - 40 * s, by + 150 * s], [bx - 70 * s, by + 190 * s]], sw * 1.1, '#26232A', 'ink', .5);
  paint(rrPts(bx - 34 * s, by - 120 * s, 68 * s, 240 * s, 18 * s), { wash: '#2E2B30', ink: PAL.ink, sw: sw * .8 });
  paint(rrPts(bx - 34 * s, by - 120 * s, 68 * s, 70 * s, 18 * s), { wash: '#E2B23C', ink: PAL.ink, sw: sw * .6 });
  paint(rectPts(bx - 40 * s, by - 10 * s, 80 * s, 22 * s), { wash: '#9A9C98', washOp: 210, ink: null });   // tape
  if (o.zap > 0) for (let i = 0; i < 3; i++) { const a = hash(i + Math.floor(T * 12)) * TAU, r0 = W2 * .7, r1 = W2 * 1.15; lightning(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * .8, cx + Math.cos(a + .3) * r1, cy + Math.sin(a + .3) * r1 * .9, { seed: i + Math.floor(T * 12) * 7, w: 4 * s, forks: 1 }); }
}
// A hand pointing a finger at (tx, ty), coming in from the direction `from` (radians, from the fingertip toward the
// wrist; default: from the lower right). s = 1 ≈ a 70 px wide hand. o.col (skin or glove), o.sleeve (colour or null),
// o.cuff (a grey hoodie cuff).
function pointingHand(tx, ty, s = 1, o = {}) {
  const a = o.from ?? .85, c = Math.cos(a), sn = Math.sin(a), u = 40 * s, sw = clamp(1.8 * s, .7, 3), col = o.col || SKIN_TONES.light.col;
  const P = (fx, fy) => [tx + c * fx * u - sn * fy * u, ty + sn * fx * u + c * fy * u];   // fx along the arm, fy across
  boilSeed('pointhand' + (o.key || ''));
  if (o.sleeve) paint(ribbon([P(3.0, .1), P(12, .4)], 2.2 * u, 2.5 * u), { wash: o.sleeve, ink: PAL.ink, sw });
  else paint(ribbon([P(3.0, .1), P(12, .4)], 1.5 * u, 1.8 * u), { wash: col, ink: PAL.ink, sw });
  if (o.cuff) inkLine([P(3.1, -1.0), P(3.1, 1.15)], sw * 4, o.cuff, 'ink', 0);
  paint(ellPts(...P(2.15, .15), 1.15 * u, 1.0 * u, 18, 0, a), { wash: col, ink: PAL.ink, sw });   // the fist
  for (const k of [0, 1, 2]) inkLine([P(1.45 + k * .02, .35 + k * .32), P(1.9, .4 + k * .32)], sw * .5, mixCol(col, PAL.ink, .5), 'inkfine', 0);   // curled fingers
  paint(ribbon([P(1.4, -.55), P(.55, -.42), P(.06, -.3)], .62 * u, .52 * u), { wash: col, ink: PAL.ink, sw: sw * .9 });   // the index finger
  paint(ellPts(...P(1.95, -.95), .42 * u, .3 * u, 12, 0, a + .5), { wash: col, ink: PAL.ink, sw: sw * .7 });   // thumb
}
// The base's outer wall: two storeys of stone blocks from x0 to x1, standing on a foundation at ground y. A gap is left
// for the door (door: [dx0, dx1, top]); tod darkens it.
function stoneWall(x0, x1, top, y, door, tod = 0) {
  const night = clamp(tod - 1), dusk = clamp(tod), col = mixCol(mixCol('#A9ADB1', '#B49A92', dusk * .35), '#3A3F55', night * .75), dk = mixCol(col, PAL.ink, .35);
  boilSeed('stonewall');
  const pts = door ? [[x0, top], [x1, top], [x1, y], [door[1], y], [door[1], door[2]], [door[0], door[2]], [door[0], y], [x0, y]] : [[x0, top], [x1, top], [x1, y], [x0, y]];
  paint(pts, { wash: col, ink: PAL.ink, sw: 1.4 });
  const rowH = 74;
  for (let r = 0, yy = y - rowH; yy > top + 10; r++, yy -= rowH) {
    const inDoor = xx => door && xx > door[0] - 4 && xx < door[1] + 4 && yy > door[2] - 4;
    const L = []; for (let xx = x0 + 6; xx < x1 - 6; xx += 20) if (!inDoor(xx)) L.push(xx);
    boilSeed('stonerow' + r);
    for (let xx = x0 + (r % 2 ? 70 : 0); xx < x1; xx += 140) { if (!inDoor(xx) && !(door && xx > door[0] - 10 && xx < door[1] + 10 && yy + rowH > door[2])) inkLine([[xx, yy], [xx + (hash(xx + r) - .5) * 4, yy + rowH]], .7, dk, 'inkfine', 0); }
    // the mortar line, broken around the door
    if (!door || yy < door[2]) inkLine([[x0 + 4, yy], [x1 - 4, yy]], .7, dk, 'inkfine', 0);
    else { inkLine([[x0 + 4, yy], [door[0] - 4, yy]], .7, dk, 'inkfine', 0); inkLine([[door[1] + 4, yy], [x1 - 4, yy]], .7, dk, 'inkfine', 0); }
  }
  for (let i = 0; i < 6; i++) { boilSeed('moss' + i); const mx = x0 + 80 + hash(i + 3) * (x1 - x0 - 160), my = y - 20 - hash(i + 9) * 40; if (door && mx > door[0] - 30 && mx < door[1] + 30) continue; paint(ellPts(mx, my, 30 + 20 * hash(i), 12, 10, 2), { wash: mixCol('#6E8A4E', '#2A3A40', night), washOp: 170, ink: null }); }
  paint(rectPts(x0 - 20, y - 6, x1 - x0 + 40, 30, 1), { wash: mixCol(col, PAL.ink, .15), ink: PAL.ink, sw: 1.1 });   // foundation lip
}
