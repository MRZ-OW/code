// ep2 "1234": code-lock guesses electrocute the Naked harder each time. The owner walks up and types 1234, then quietly
// changes it from inside. The Naked's 1234 earns the mega-zap, and the owner takes his rock too. Shot list: SCRIPT.md.
(() => {
  const G = 1300, U = 38, NK = 'naked', CH = 'chad', TOD = 1.15;
  const DOOR = [420, 700, 780], LOCK = [330, 1020];   // door x0, x1, top; the lock beside it
  const CHAD_GEAR = { gear: { mask: 'metal', chest: 'metal', kilt: 'roadsign', hoodie: true, hoodieCol: '#5F6B52', pants: true, boots: true, gloves: true }, skin: 'tan', hair: 'buzz', hairCol: 'dark' };
  const GLOVE = '#5A4A3A', SLEEVE = '#5F6B52';
  const WX = 400, WY = 1040, WZ = 1.55;   // the wide shot's camera: him, the lock and the door
  // key index on the pad for a digit (1–9 → 0–8, 0 → 10)
  const keyOf = d => d === '0' ? 10 : +d - 1;
  // what's on the display, and which key is down, for a typing run: presses = [[t, digit], ...]
  function typing(t, presses) {
    let digits = '', press = -1, pressK = 0;
    for (const [tp, d] of presses) if (t >= tp) { digits += d; const age = t - tp; if (age < .16) { press = keyOf(d); pressK = age < .06 ? age / .06 : 1 - (age - .06) / .1; } }
    return { digits, press, pressK };
  }
  // where a key is on the big lock (for the fingertip), matching bigLock's layout at (cx, cy, s)
  function keyPos(cx, cy, s, k) {
    const W2 = 260 * s, H2 = 340 * s, dy0 = cy - H2 + 60 * s, dh = 130 * s, kx0 = cx - W2 + 62 * s, ky0 = dy0 + dh + 50 * s, kw = 104 * s, kh = 78 * s, gap = 22 * s;
    const r = Math.floor(k / 3), c = k % 3;
    return [kx0 + c * (kw + gap) + kw / 2, ky0 + r * (kh + gap) + kh / 2];
  }

  // ---------- sets ----------
  function base(t, o = {}) {
    rustSky(t, { tod: TOD, horizon: 900, sun: [900, 260], clouds: true });
    hills(t, { horizon: 900, tod: TOD });
    boilSeed('dirt'); paint(rectPts(-200, 1290, W + 400, 900), { wash: mixCol('#8C7A5A', '#3E3A48', .35), ink: null });
    grassTufts(-100, 1180, 1330, t, 16, mixCol(RUST.grassDk, '#2A3040', .3));
    stoneWall(-120, 1200, 170, G, DOOR, TOD);
    doorPanel(DOOR[0], G, DOOR[1] - DOOR[0], G - DOOR[2], 'armor', { open: o.open || 0, inside: o.dark ? '#16121A' : '#3A2A26', hatch: o.hatch || 0, hatchIn: o.hatchIn, hingeRight: true });
    if ((o.open || 0) > .02 && !o.dark) {   // a glimpse inside: furnace glow, boxes
      const gx = DOOR[0] + 70, gy = G - 160;
      glow(gx, gy, 200 * o.open, '#FF9A4A', .8 * o.open);
    }
    codeLock(LOCK[0], LOCK[1], 1.0, o.lockState || 'locked');
  }
  // a zap: thin bolts along a chain of points (the lock → his hand → shoulder → head), plus a crackle round his body;
  // the bolts re-draw every 2 frames
  function zapBolts(t, chain, aura, big) {
    const f = Math.floor(t * 12);
    for (let i = 1; i < chain.length; i++) lightning(chain[i - 1][0], chain[i - 1][1], chain[i][0], chain[i][1], { seed: i * 7 + f * 3, w: big ? 2.6 : 2.0, n: 4, forks: 1, glowA: .45 });
    for (let i = 0; i < aura.length; i++) { const [x, y] = aura[i], a = hash(f * 5 + i) * TAU, L = 40 + 30 * hash(f + i * 9); lightning(x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, { seed: 50 + i * 11 + f, w: 1.6, n: 4, forks: 0, glowA: .3 }); }
  }
  const CHAR = '#242327';   // soot: a cool near-black, so he reads burnt, not darker-skinned
  const sooty = k => ({ col: mixCol(SKIN_TONES.light.col, '#3B3739', k), dk: mixCol(SKIN_TONES.light.dk, '#232125', k), lt: mixCol(SKIN_TONES.light.lt, '#5C565A', k) });
  const NX = 200;           // where the Naked lands and sits after the big zap (inside the frame)
  const grade = (col, op) => { boilSeed('grade' + col); paint(rectPts(-60, -60, W + 120, H + 120), { wash: col, washOp: op, ink: null }); };
  const dusk = () => grade('#5A3A6A', 38);

  // The close-up keypad shot: the big lock, a finger pressing the keys of a run.
  function keypad(t, presses, o = {}) {
    boilSeed('kpbg'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: mixCol('#9A9EA6', '#4A4660', .35), ink: null });
    stoneWall(-120, 1200, -200, 2200, null, TOD);
    const tp = typing(t, presses), s = 1.3, cx = 468, cy = 800;
    bigLock(cx, cy, s, { digits: o.digits ?? tp.digits, press: tp.press, pressK: tp.pressK, state: o.state || 'locked', zap: o.zap || 0 });
    // the finger: hovers over the next key, dips onto it when it's pressed
    let next = presses.find(([tq]) => tq + .16 > t) || presses[presses.length - 1];
    const [kx, ky] = keyPos(cx, cy, s, keyOf(next[1])), dip = tp.press >= 0 ? 1 : 0;
    const hoverY = ky - 30 + 22 * dip, flourish = o.flourish ? 30 * Math.sin(t * 18) * (1 - dip) : 0;
    if (!o.noHand) pointingHand(kx + 8 + flourish, hoverY, o.glove ? 1.25 : 1.15, { col: o.glove ? GLOVE : SKIN_TONES.light.col, sleeve: o.glove ? SLEEVE : null, cuff: o.glove ? '#9A9C98' : null, from: .95, key: o.glove ? 'chadhand' : 'nakedhand' });
    dusk();
  }

  // ---------- S1: guesses (0–6) ----------
  // 1A wide: he sizes up the lock, cracks his fingers, a sneaky grin
  function s1a(t, lt) {
    camBegin(WX, WY, WZ);
    base(t);
    const N = feel('mischief', t, { emote: null });
    spawnling(215, G, U, { ...N, eyes: 'sly', mouth: 'smirk', lookX: .6, boilKey: NK, seed: 1, view: 'q', rawArms: true, aL: -.3 + .25 * Math.sin(t * 14), bendL: 1.6, aR: -1.25, bendR: .3, prop: 'none', hold: { R: 'rock' } });
    dusk();
    camEnd();
  }
  function s1b(t, lt) { keypad(t, [[1.0, '0'], [1.25, '0'], [1.5, '0'], [1.75, '0']]); }
  // the zap: lightning from the lock into his hand, he jolts and frizzes, staggers back, sooty
  function zapPose(t, t0, big) {
    const a = t - t0, jolt = a < .6, k = seg(a, .6, 1.0);
    return { jolt, frizz: clamp(a / .1) * (big ? 1 : .7), skin: sooty(big ? clamp(a / .4) * .9 : clamp(a / .4) * .35), sk: k };
  }
  function s1c(t, lt) {
    camBegin(WX, WY, WZ);
    base(t, { lockState: 'locked' });
    const z = zapPose(t, 2.0, false), flick = Math.floor((t - 2.0) * 12) % 2;
    const nx = 215 - 70 * easeOut(z.sk);
    const N = z.jolt ? { eyes: 'x', mouth: 'teeth' } : feel('dizzy', t, { emote: 'stars' });
    const No = { ...N, ...z, boilKey: NK, seed: 1, view: z.jolt ? 'front' : 'q', rawArms: true, aL: z.jolt ? .55 + .2 * flick : -1.0, bendL: z.jolt ? -.3 : .3, aR: -1.25, bendR: .3, dx: z.jolt ? .12 * (flick ? 1 : -1) : 0, prop: 'none', hold: { L: 'rock' } };
    if (z.jolt) Object.assign(No, reachArm(U, No, 'R', ...toBody(nx, G, U, No, LOCK[0] - 14, LOCK[1] + 6)));   // his finger still on the keypad
    spawnling(nx, G, U, No);
    if (z.jolt) {
      const hand = survivorHand(nx, G, U, No, 'R');
      zapBolts(t, [[LOCK[0], LOCK[1]], hand, [nx + 1.6 * U, G - 7.8 * U], [nx + .4 * U, G - 12.6 * U]], [[nx - 1.2 * U, G - 6 * U], [nx + .8 * U, G - 3 * U]], false);
      flash(.16 * (1 - flick), '#DDF4FF');
    }
    if (t > 2.35) smolder(nx + 10, G - 13 * U, 1, t - 2.35, { key: 'z1' });
    dusk();
    camEnd();
  }
  // 1D reaction: thinking, a lightbulb, a smug grin with waggling brows
  function s1d(t, lt) {
    camBegin(215, G - 9.2 * U, 1.9);
    base(t);
    const idea = t >= 3.6, N = idea ? feel('idea', t, { eyes: 'sly', mouth: 'grin' }) : feel('thinking', t);
    const Nd = { ...N, skin: sooty(.3), frizz: .5, boilKey: NK, seed: 1, view: 'front', rawArms: true, aL: -1.2, bendL: .3, aR: -1.25, bendR: .3, dy: idea ? -.25 * Math.abs(Math.sin(t * 12)) : 0, prop: 'none', hold: { R: 'rock' } };
    if (!idea) Object.assign(Nd, reachArm(U, Nd, 'L', -.35 * U, -9.15 * U), { lookX: .3, lookY: -.8 });   // finger on chin, eyes up
    spawnling(215, G, U, Nd);
    if (t > 3.0) smolder(230, G - 13.2 * U, 1, t - 2.35, { key: 'z1' });
    dusk();
    camEnd();
  }
  function s1e(t, lt) { keypad(t, [[4.0, '6'], [4.25, '9'], [4.5, '6'], [4.75, '9']], { flourish: true }); }
  // 1F the big zap: skeleton flashes (5.0, 5.5), blasted back, lands sitting, charred, smoking
  function s1f(t, lt) {
    camBegin(WX, WY, WZ);
    base(t);
    const a = t - 5.0, skel = (a < .2) || (a >= .5 && a < .7), fly = seg(a, .6, .75), nx = lerp(215, NX, easeOut(fly)), ny = G - 120 * Math.sin(fly * Math.PI);
    if (a < .6) {
      if (skel) xray(215, G, U, { rawArms: true, aL: .7, bendL: -.4, aR: .6, bendR: -.3, key: 'x1' });
      else spawnling(215, G, U, { eyes: 'x', mouth: 'teeth', frizz: 1, skin: sooty(.5), boilKey: NK, seed: 1, view: 'front', rawArms: true, aL: .7, bendL: -.4, aR: .6, bendR: -.3, prop: 'none', hold: { L: 'rock' } });
      zapBolts(t, [[LOCK[0], LOCK[1]], [215 + 3.2 * U, G - 9.6 * U], [215 + 1.6 * U, G - 7.8 * U], [215, G - 12.8 * U], [215 - 1.6 * U, G - 7.8 * U], [215 - 3.2 * U, G - 9.6 * U]], [[215 - .8 * U, G - 2.5 * U], [215 + .8 * U, G - 2.5 * U], [215, G - 5.5 * U]], true);
      flash(skel ? .3 : 0, '#DDF4FF');
    } else spawnling(nx, ny, U, { eyes: 'blank', mouth: 'o', frizz: 1, skin: sooty(.85), hairCol: 'dark', briefs: '#3E3C3A', boilKey: NK, seed: 1, view: 'front', sit: seg(a, .6, .7), sq: .12 * Math.exp(-(a - .75) * 9) * (a > .75 ? 1 : 0), rawArms: true, aL: -1.0, bendL: .3, aR: -1.0, bendR: .3, prop: 'none' });
    if (a >= .6) smolder(nx + 6, ny - 11 * U, 1.2, a - .6, { key: 'z2' });
    if (a >= .6) { const k = seg(a, .6, .85), p = arcPt([215 - 3.4 * U, G - 9 * U], [NX + 2.4 * U, G - .3 * U], 140, k); boilSeed('droppedrock'); push(); translate(p[0], p[1]); rotate(2.6 * k + (1 - k) * 8 * k); rockProp(U, 2.2); pop(); }   // his rock flies out of his hand and lands beside him
    dusk();
    camEnd();
  }

  // ---------- S2: the owner (6–13) ----------
  const droppedRock = () => { boilSeed('droppedrock'); push(); translate(NX + 2.4 * U, G - .3 * U); rotate(2.6); rockProp(U, 2.2); pop(); };
  const charred = (t, o = {}) => ({ eyes: (t * .7) % 2.6 < .1 ? 'closed' : 'blank', mouth: 'flat', frizz: 1, skin: sooty(.95), hairCol: 'dark', briefs: '#3E3C3A', boilKey: NK, seed: 1, prop: 'none', ...o });
  // 2A wide: he sits charred in the left foreground; the Chad walks past him to the lock without a glance
  function s2a(t, lt) {
    camBegin(WX, WY, WZ);
    base(t);
    spawnling(NX, G, U, { ...charred(t), view: 'front', sit: 1, rawArms: true, aL: -1.0, bendL: .3, aR: -1.0, bendR: .3 });
    smolder(NX + 6, G - 8.9 * U, 1.2, t - 5.6, { key: 'z2' }); droppedRock();
    const k = seg(t, 6.0, 7.7), cx = lerp(1150, 420, ease(k));
    geared(cx, G, U, { ...feel('neutral', t, { emote: null }), ...CHAD_GEAR, boilKey: CH, seed: 2, view: 'q', flip: true, walk: k < 1 ? (t - 6) * 1.6 : 0, rawArms: true, aL: -1.3, aR: -1.3, noGun: true, behind: (u, sw) => { push(); translate(-.6 * u, -6.6 * u); rotate(-2.3); akProp(u, sw * .9, 0); pop(); } });
    dusk();
    camEnd();
  }
  function s2b(t, lt) { keypad(t, [[8.0, '1'], [8.5, '2'], [9.0, '3'], [9.5, '4']], { glove: true, state: t >= 10 ? 'open' : 'locked' }); }
  // 2C reaction: the charred face — jaw drops, white eyes wide, a flake of ash falls from his hair
  function s2c(t, lt) {
    camBegin(NX + 30, G - 7.6 * U, 2.1);
    base(t, { lockState: 'open' });
    const drop = ease(seg(t, 10.05, 10.3));
    spawnling(NX, G, U, { ...charred(t, { eyes: 'blank', mouth: drop > .5 ? 'O' : 'flat' }), view: 'front', sit: 1, dy: .5 * drop, rawArms: true, aL: -1.0, bendL: .3, aR: -1.0, bendR: .3 });
    if (t > 10.3) { const k = seg(t, 10.3, 11); boilSeed('ash'); paint(ellPts(NX + 30 + 18 * Math.sin(k * 9), G - 11.4 * U + k * 160, 7, 5, 8, 0, k * 4), { wash: '#3A3634', ink: null }); }
    smolder(NX + 6, G - 8.9 * U, 1.2, t - 5.6, { key: 'z2' }); droppedRock();
    dusk();
    camEnd();
  }
  // 2D wide: the Chad opens the door (warm light, boxes inside), steps in, it shuts behind him
  function s2d(t, lt) {
    camBegin(WX, WY, WZ);
    const open = ease(seg(t, 11.15, 11.5)) * (1 - ease(seg(t, 12.3, 12.5)));
    base(t, { open, lockState: 'open' });
    spawnling(NX, G, U, { ...charred(t, { eyes: 'blank', mouth: 'O' }), view: 'front', sit: 1, dy: .5, rawArms: true, aL: -1.0, bendL: .3, aR: -1.0, bendR: .3 });
    smolder(NX + 6, G - 8.9 * U, 1.2, t - 5.6, { key: 'z2' }); droppedRock();
    const k = seg(t, 11.5, 12.3), cx = lerp(450, 640, ease(k));
    if (t < 12.3) geared(cx, G, U, { ...feel('neutral', t, { emote: null }), ...CHAD_GEAR, boilKey: CH, seed: 2, view: k > 0 ? 'back' : 'q', flip: true, walk: k > 0 && k < 1 ? (t - 11.5) * 1.6 : 0, rawArms: true, aL: -1.3, aR: -1.3, noGun: true, behind: (u, sw) => { push(); translate(-.6 * u, -6.6 * u); rotate(-2.3); akProp(u, sw * .9, 0); pop(); }, sy: 1 - .1 * k, sx: 1 - .1 * k });
    dusk();
    camEnd();
  }

  // ---------- S3: dramatic irony (13–24) ----------
  // 3A wide: he gets up, takes his rock, dusts off the soot, and smirks at us, cracking his knuckles. Behind him the
  // door opens a crack on the lock's side: the Chad's eyes peer out of the dark gap, and a gloved hand slips out and
  // quietly re-keys the lock with four taps, then the door shuts.
  function s3a(t, lt) {
    camBegin(WX + 20, WY, WZ * .95);
    const crackK = ease(seg(t, 13.6, 13.8)) * (1 - ease(seg(t, 15.2, 15.4))), gapW = (DOOR[1] - DOOR[0]) * .14 * crackK;
    base(t, { open: .14 * crackK, dark: true });
    if (crackK > .3) {   // eyes in the dark gap, at head height
      boilSeed('gapeyes'); for (const dy2 of [0]) for (const sd of [-1, 1]) { const ex = DOOR[0] + gapW * .5 + sd * 9, ey = DOOR[2] + 120 + dy2; glow(ex, ey, 20, '#FFF2C4', .5); paint(ellPts(ex, ey, 5, 4.5, 8), { wash: '#F2E6D0', ink: null }); }
    }
    const dust = seg(t, 13.2, 14.5), up = ease(seg(t, 13.0, 13.4)), XA = 150;
    const N = t < 14.6 ? feel('neutral', t, { eyes: 'closed' }) : feel('mischief', t, { eyes: 'sly', mouth: 'smirk' });
    const pat = Math.sin(t * 22) * (dust > 0 && dust < 1 ? 1 : 0), crack = t > 14.9 && t < 15.3 ? Math.sin((t - 14.9) * 40) * .1 : 0;
    const Na = { ...N, frizz: lerp(1, .3, dust), skin: sooty(lerp(.88, .2, dust)), hairCol: dust < .5 ? 'dark' : 'brown', briefs: dust < .7 ? '#3E3C3A' : undefined, boilKey: NK, seed: 1, view: 'front', sit: 1 - up,
      rawArms: true, aL: t < 14.6 ? .1 + .5 * pat : -.2 + crack, bendL: t < 14.6 ? 1.4 : 1.9, aR: t < 14.6 ? -.4 - .3 * pat : -.2 - crack, bendR: t < 14.6 ? .9 : 1.9, prop: 'none' };
    // he scoops his rock up as he rises (13.0–13.3), then holds it through the knuckle crack
    const rockW = [NX + 2.4 * U, G - .3 * U];
    if (t < 13.3) { Object.assign(Na, reachArm(U, Na, 'R', ...toBody(XA, G, U, Na, rockW[0], rockW[1] - .3 * U))); if (t < 13.15) { boilSeed('droppedrock'); push(); translate(rockW[0], rockW[1]); rotate(2.6); rockProp(U, 2.2); pop(); } else Na.hold = { R: 'rock' }; }
    else Na.hold = { R: 'rock' };
    spawnling(XA, G, U, Na);
    for (let i = 0; i < 4; i++) puff(XA - 20 + (i - 1.5) * 40, G - (4 + i * 1.8) * U, 30, t - 13.2 - i * .3, { col: '#3E3A38', key: 'soot' + i, life: .8, rise: .4 });
    // the Chad's gloved hand out of the gap: four quiet taps on the keypad
    const reach = ease(seg(t, 13.8, 14.0)) * (1 - ease(seg(t, 14.85, 15.1)));
    if (reach > 0) {
      const sx = DOOR[0] + gapW * .45, sy = LOCK[1] - 4, tap = Math.max(0, Math.sin((t - 14.0) * TAU * 2.7)) * (t > 14.0 && t < 14.8 ? 1 : 0);
      const tip = [lerp(sx, LOCK[0] + 8, reach), lerp(sy, LOCK[1] + 4 + 10 * tap, reach)];
      boilSeed('gaparm'); paint(ribbon([[sx, sy - 6], [tip[0] + 24, tip[1] - 8]], 30, 26), { wash: SLEEVE, ink: PAL.ink, sw: 1.1 });
      pointingHand(tip[0], tip[1], .5, { col: GLOVE, cuff: '#9A9C98', from: -.15, key: 'gaphand' });
    }
    dusk();
    camEnd();
  }
  function s3b(t, lt) {
    const tp = typing(t, [[16.0, '1'], [16.15, '2'], [16.3, '3'], [16.45, '4']]);
    keypad(t, [[16.0, '1'], [16.15, '2'], [16.3, '3'], [16.45, '4']], { flourish: true, state: t >= 16.9 ? 'error' : 'locked', digits: tp.digits });
  }
  // 3C reaction: his confident grin freezes; the eyes slowly widen; a sweat drop; the grin wobbles into a frown
  function s3c(t, lt) {
    camBegin(215, G - 9.2 * U, 1.95);
    base(t);
    const N = emotions(t, [[17.0, 'happy', { eyes: 'sly', mouth: 'grin' }], [17.35, 'nervous', { eyes: 'wide', mouth: 'wobble', emote: 'sweat' }]], { take: .4 });
    spawnling(215, G, U, { ...N, skin: sooty(.2), frizz: .3, boilKey: NK, seed: 1, view: 'q', rawArms: true, aL: -.1, bendL: 1.0, aR: -1.25, bendR: .3, prop: 'none', hold: { R: 'rock' } });
    dusk();
    camEnd();
  }
  // 3D wide: the MEGA ZAP. Skeleton flashes (17.75, 18.4); he's launched up and out of frame to the left; his rock
  // spins in the air and lands at the door's foot (19.4)
  function s3d(t, lt) {
    camBegin(WX, WY, WZ);
    base(t, { lockState: 'error' });
    const a = t - 17.75, skel = (a < .15) || (a >= .32 && a < .47);
    if (skel) flash(.32, '#DDF4FF');
    if (t < 18.25) {
      if (skel) xray(215, G, U, { rawArms: true, aL: .8, bendL: -.4, aR: .7, bendR: -.3, key: 'x2' });
      else spawnling(215, G, U, { eyes: 'x', mouth: 'teeth', frizz: 1, skin: sooty(.6), boilKey: NK, seed: 1, view: 'front', rawArms: true, aL: .8, bendL: -.4, aR: .7, bendR: -.3, prop: 'none' });
      zapBolts(t, [[LOCK[0], LOCK[1]], [215 + 3.4 * U, G - 10 * U], [215 + 1.6 * U, G - 7.8 * U], [215, G - 13 * U], [215 - 1.6 * U, G - 7.8 * U], [215 - 3.4 * U, G - 10 * U]], [[215 - .8 * U, G - 2.5 * U], [215 + .8 * U, G - 2.5 * U], [215, G - 5.5 * U], [215 - 2.2 * U, G - 11 * U], [215 + 2.2 * U, G - 11 * U]], true);
      zapBolts(t + .5, [[LOCK[0], LOCK[1] - 20], [215 + .8 * U, G - 2.5 * U]], [], true);
    } else if (t < 18.6) {   // launched: up and away to the left, spinning
      const k = seg(t, 18.25, 18.6), p = arcPt([215, G], [-160, G - 760], 260, k);
      spawnling(p[0], p[1], U, { eyes: 'x', mouth: 'O', frizz: 1, skin: sooty(.85), boilKey: NK, seed: 1, view: 'front', rot: -k * 5, rawArms: true, aL: 1.2, bendL: 0, aR: 1.2, bendR: 0, prop: 'none' });
    }
    if (t >= 18.25) smolder(215, G - 6 * U, 1.6, t - 18.25, { key: 'z3' });
    // the rock: it stays where he stood, spins up in the blast and lands at the door's foot
    if (t >= 18.25 && t < 19.4) { const k = seg(t, 18.25, 19.4), p = arcPt([235, G - 4.3 * U], [470, G - 18], 520, k); boilSeed('megarock'); push(); translate(p[0], p[1]); rotate(k * 14); rockProp(U, 2); pop(); }
    if (t >= 19.4) { boilSeed('megarock'); push(); translate(470, G - 18); rotate(.3); rockProp(U, 2); pop(); puff(470, G - 10, 26, t - 19.4, { col: '#B9A88A', key: 'thunk' }); }
    dusk();
    camEnd();
  }
  // 3E medium on the door: it opens a crack on the lock's side; in the dark gap his eyes look down at the rock; a gloved
  // hand slips out low, takes it, and the door shuts
  function s3e(t, lt) {
    camBegin(520, 1100, 1.6);
    const open = ease(seg(t, 20.2, 20.45)) * (1 - ease(seg(t, 21.6, 21.8))), gapW = (DOOR[1] - DOOR[0]) * .2 * open;
    base(t, { open: open * .2, lockState: 'locked', dark: true });
    if (open > .3) { boilSeed('gapeyes3'); const look = ease(seg(t, 20.45, 20.7)); for (const sd of [-1, 1]) { const ex = DOOR[0] + gapW * .5 + sd * 10, ey = DOOR[2] + 130; glow(ex, ey, 20, '#FFF2C4', .5); paint(ellPts(ex, ey, 6, 5, 8), { wash: '#F2E6D0', ink: null }); paint(ellPts(ex + 2 * look, ey + 2.5 * look, 2.6, 2.6, 6), { wash: PAL.ink, ink: null }); } }
    smolder(215, G - 6 * U, 1.6, t - 18.0, { key: 'z3' });
    const grab = ease(seg(t, 20.5, 20.9)) * (1 - ease(seg(t, 21.05, 21.45))), has = t >= 20.9;
    const rx = 470, ry = G - 18, sx = DOOR[0] + gapW * .55, sy = G - 70;
    if (!has) { boilSeed('megarock'); push(); translate(rx, ry); rotate(.3); rockProp(U, 2); pop(); }
    if (grab > 0) {   // the arm comes out of the gap, low, to the rock and back
      const tip = [lerp(sx, rx + 4, grab), lerp(sy, ry - 22, grab)];
      boilSeed('grabarm'); paint(ribbon([[sx + 20, sy - 10], [tip[0] + 18, tip[1] - 6]], 30, 26), { wash: SLEEVE, ink: PAL.ink, sw: 1.2 });
      inkLine([[tip[0] + 14, tip[1] - 22], [tip[0] + 14, tip[1] + 12]], 2.6, PAL.ink, 'ink', 0); inkLine([[tip[0] + 14, tip[1] - 20], [tip[0] + 14, tip[1] + 10]], 1.8, '#9A9C98', 'ink', 0);   // the cuff
      if (has) { boilSeed('megarock'); push(); translate(tip[0] - 6, tip[1] + 14); rotate(.3); rockProp(U * .9, 2); pop(); }
      paint(ellPts(tip[0], tip[1], 24, 21, 14), { wash: GLOVE, ink: PAL.ink, sw: 1.2 });   // the glove, closed over it
      for (let f = 0; f < 3; f++) inkLine([[tip[0] - 16 + f * 9, tip[1] + 6], [tip[0] - 14 + f * 9, tip[1] + 18]], .9, PAL.ink, 'ink', 0);   // fingers
    }
    dusk();
    camEnd();
  }
  // 3F medium on the empty ground: his charred, smoking hand pokes in from the lower left and feels around for the
  // rock, patting the empty ground twice
  function s3f(t, lt) {
    camBegin(470, 1220, 1.9);
    base(t);
    const inK = ease(seg(t, 22.5, 22.8)), pat = t > 22.8 ? Math.max(0, Math.sin((t - 22.8) * TAU * 1.25)) : 0;
    const wx = lerp(250, 400, inK) + 10 * Math.sin(t * 2.2), wy = G - 22 - 30 * pat;   // the wrist
    const ch = '#38363B', chL = '#5A585E';
    boilSeed('chararm'); paint(ribbon([[150, G + 30], [wx - 60, wy + 12], [wx + 4, wy]], 46, 40), { wash: ch, ink: PAL.ink, sw: 1.3 });
    for (let i = 0; i < 3; i++) paint(ellPts(wx - 40 - i * 32, wy + 8 + i * 6, 6, 3.5, 8), { wash: chL, ink: null });   // ash flecks
    boilSeed('charhand');
    for (let f = 0; f < 4; f++) { const fy = wy - 22 + f * 15, len = f === 1 || f === 2 ? 50 : 40; paint(rrPts(wx + 44, fy - 6, len, 15, 7), { wash: ch, ink: PAL.ink, sw: .9 }); }   // fingers, flat out
    paint(rrPts(wx - 4, wy - 30, 62, 58, 18), { wash: ch, ink: PAL.ink, sw: 1.2 });   // the palm, flat on the ground
    paint(rrPts(wx + 16, wy - 50, 34, 15, 7, 0), { wash: ch, ink: PAL.ink, sw: .9 });   // thumb
    for (let f = 0; f < 3; f++) inkLine([[wx + 48, wy - 14 + f * 15], [wx + 56, wy - 14 + f * 15]], .6, chL, 'inkfine', 0);   // knuckle creases
    smolder(wx - 10, wy - 30, .7, t - 22.5, { key: 'hand' });
    dusk();
    camEnd();
  }
  shots([[0, s1a], [1, s1b], [2, s1c], [3, s1d], [4, s1e], [5, s1f], [6, s2a], [8, s2b], [10, s2c], [11, s2d], [13, s3a], [16, s3b], [17, s3c], [17.75, s3d], [20, s3e], [22.5, s3f]]);
})();
