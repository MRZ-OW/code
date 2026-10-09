// ep1 "Friendly?": a naked meets a geared player, they bond by a campfire, he spares the man's AK and leaves him a
// flower, and gets shot in the back for it. Respawn, and here comes the next stranger. Shot list: SCRIPT.md.
(() => {
  const G = 1310, U = 48;                              // ground line and unit of the two-shots (eyes land near y 790)
  const NK = 'naked', CH = 'chad';
  const say = (t, t0, t1) => clamp(seg(t, t0, t0 + .3)) * (1 - seg(t, t1 - .15, t1));   // a bubble's pop-in/out

  // The beach. tod: 0 day → 1 sunset → 2 night (rustsets.js). The pine and the driftwood frame the left edge.
  function beach(t, tod, o = {}) {
    rustSky(t, { tod, horizon: 880, sun: o.sun || [820, 330] });
    seaBeach(t, { horizon: 880, shore: 1070, tod });
    pineTree(-30, 1180, 1.7, { tod });
    log(70, 1300, 190, 60, tod);
  }
  function driftwood(x, y, s, tod = 0) {
    boilSeed('driftwood');
    const night = clamp(tod - 1), col = mixCol('#B9A386', '#3E4058', night * .8);
    paint(ribbon([[x - 120 * s, y], [x - 20 * s, y - 14 * s], [x + 110 * s, y - 6 * s]], 34 * s, 26 * s), { wash: col, ink: PAL.ink, sw: 1 });
    inkLine([[x - 60 * s, y - 6 * s], [x + 40 * s, y - 14 * s]], .6, mixCol(col, PAL.ink, .4), 'inkfine', .4);
  }
  // The Chad's AK slung across his back (drawn behind him).
  const slung = (u, sw) => { push(); translate(-.6 * u, -6.6 * u); rotate(-2.3); akProp(u, sw * .9, 0); pop(); };

  // ---------- S1: standoff (0–6) ----------
  const NX = 215, CXA = 740;   // where they stand in the standoff
  function s1(t, lt) {
    camBegin(540, 990, 1 + .05 * ease(lt / 6));
    beach(t, 0);
    // ----- the Naked -----
    const walkK = seg(t, 5.0, 5.6), nx = lerp(NX, 345, ease(walkK));
    const N = emotions(t, [[0, 'surprised', { emote: '!' }], [.9, 'nervous', { emote: 'sweat' }], [1.38, 'scared', { eyes: 'squeeze', mouth: 'wobble', emote: null }], [2.0, 'hopeful', { emote: null }], [4.45, 'happy']], { take: .45 });
    if (t < .9) N.emoteK = 1 - seg(t, .7, .9);                                  // the "!" is already up in frame 1
    const view = t < 2.0 || t >= 4.95 ? 'q' : t < 2.09 ? 'qf' : t < 4.86 ? 'front' : 'qf';   // turn to face us, and back
    const hop = t > 1.5 && t < 2.0 ? -.9 * Math.abs(Math.sin((t - 1.5) * TAU)) : 0, liftL = ease(seg(t, 1.46, 1.56)) * (1 - ease(seg(t, 1.92, 2.0)));
    const upL = ease(seg(t, 2.1, 2.45)), upR = ease(seg(t, 2.18, 2.53)), down = ease(seg(t, 4.45, 4.8));
    const tremble = t > 2.45 && t < 4.4 ? .035 * Math.sin(t * 46) : 0;
    // hands: hanging (rock in hand) → clutch the hurt foot → in front of the chest → up beside his head, palms open
    const armUp = (k, kd) => k < .5 ? { a: lerp(-1.32, -.45, ease(k * 2)), b: lerp(.22, 1.4, ease(k * 2)) } : { a: lerp(-.45, .78, ease(k * 2 - 1)), b: lerp(1.4, -.82, ease(k * 2 - 1)) };
    const L = armUp(upL * (1 - down)), R = armUp(upR * (1 - down));
    const No = { ...N, boilKey: NK, seed: 1, view, rawArms: true, prop: 'none', walk: t < 5.0 ? .12 * (1 - seg(t, .4, .8)) : walkK * 3, dy: (N.dy || 0) + hop, liftL, emoteDx: .9,
      aL: L.a + tremble, bendL: L.b, aR: R.a - tremble, bendR: R.b, openL: upL > .6 && down < .5, openR: upR > .6 && down < .5,
      lookX: t > 2.6 && t < 4.4 ? (Math.floor(t * 1.6) % 2 ? .9 : .35) : N.lookX, lookY: t > 2.6 && t < 4.4 ? (Math.floor(t * 1.6) % 2 ? .5 : 0) : N.lookY };
    if (t < 1.22) { No.aL = lerp(-.95, -1.32, ease(seg(t, .5, 1.15))); No.bendL = .25; No.hold = { L: 'rock' }; }
    if (liftL > 0) Object.assign(No, reachArm(U, No, 'L', ...footLocal(U, No, 0).map((v, i) => v - (i ? .4 * U : 0))));   // clutching the hurt foot
    if (t >= 5.0) Object.assign(No, { aL: lerp(-1.32, -.35, ease(seg(t, 5.0, 5.6))) + (t > 5.6 ? .12 * Math.sin((t - 5.6) * 30) : 0), bendL: .05 });
    spawnling(nx, G, U, No);
    // the rock: slips at 1.22, lands on his foot at 1.38 (impact ticks, held 3 frames), tips off backwards when he
    // grabs the foot, and settles behind him
    if (t >= 1.22) {
      const foot = survivorFoot(NX, G, U, { ...No, view: 'q', liftL: 0, walk: 0, dy: 0 }, 0), onFoot = [foot[0] + .1 * U, foot[1] - .75 * U], rest = [NX - 2.3 * U, G - .3 * U];
      const [hx, hy] = survivorHand(NX, G, U, { ...No, view: 'q', aL: -1.32, bendL: .25, dy: 0, liftL: 0 }, 'L');
      let p, r;
      if (t < 1.38) { const k = seg(t, 1.22, 1.38); p = [lerp(hx, onFoot[0], k), lerp(hy, onFoot[1], k * k)]; r = (t - 1.22) * 4; }
      else if (t < 1.5) { p = onFoot; r = .64; }
      else { const k = seg(t, 1.5, 1.8); p = arcPt(onFoot, rest, 40, k); r = .64 - k * 4; }
      boilSeed('droprock'); push(); translate(p[0], p[1]); rotate(r); rockProp(U, 2.4); pop();
      if (t >= 1.38 && t < 1.62) { const k = seg(t, 1.38, 1.62); boilSeed('ticks'); for (const a of [-2.4, -1.57, -.7]) inkLine([[onFoot[0] + Math.cos(a) * (30 + 26 * k), onFoot[1] + Math.sin(a) * (30 + 26 * k)], [onFoot[0] + Math.cos(a) * (52 + 26 * k), onFoot[1] + Math.sin(a) * (52 + 26 * k)]], 2.2 * (1 - k), PAL.ink, 'ink', 0); }
    }
    // the sweat drops fall away when he turns to face us
    if (t >= 2.0 && t < 2.4) { const k = seg(t, 2.0, 2.4); boilSeed('fallingsweat'); for (const [dx, d0] of [[3.1, 0], [3.9, .8]]) paint(ellPts(NX + dx * U, G - (12.6 - d0) * U + 260 * k * k, 9 * (1 - .4 * k), 13 * (1 - .4 * k), 10), { wash: PAL.sky, washOp: 255 * (1 - k), ink: PAL.ink, sw: 1 }); }
    // ----- the Chad: aims, wonders, lowers the gun, relief; swings it over his shoulder onto his back; walks in -----
    const cwalk = seg(t, 5.0, 5.6), cx = lerp(CXA, 655, ease(cwalk));
    const C = emotions(t, [[0, 'determined'], [2.7, 'confused'], [3.55, 'neutral'], [4.45, 'happy']], { take: .5 });
    const lower = ease(seg(t, 3.55, 4.35)), swing = ease(seg(t, 4.6, 4.82)), stow = ease(seg(t, 4.82, 4.98));
    let CA;
    if (t < 4.82) CA = { aL: lerp(lerp(-.2, -1.05, lower), .95, swing), bendL: lerp(lerp(.1, .35, lower), .4, swing), gunRot: lerp(lerp(.04, .95, lower), TAU - 1.75, swing), twoHand: lower < .5 };   // the barrel swings down and back, never at him
    else CA = { aL: t >= 5.0 ? lerp(-1.32, -.35, ease(seg(t, 5.0, 5.6))) + (t > 5.6 ? .12 * Math.sin((t - 5.6) * 30) : 0) : lerp(.95, -1.32, stow), bendL: t >= 5.0 ? .05 : .3, noGun: true,
      behind: (u, sw) => { push(); translate(lerp(.5, -.6, stow) * u, lerp(-10.2, -6.6, stow) * u); rotate(lerp(-1.75, -2.3, stow)); akProp(u, sw * .9, 0); pop(); } };
    geared(cx, G, U, { ...C, ...CA, rawArms: true, aR: -1.32, bendR: .22, boilKey: CH, seed: 2, view: 'q', flip: true, walk: t < 5.0 ? 0 : cwalk * 3, emoteK: C.emote ? C.emoteK : 0, emoteDy: -1.25 });
    // the handshake: his thumb over the clasp, and pump lines
    if (t > 5.6) {
      const [sx, sy] = survivorHand(nx, G, U, No, 'L'), pump = Math.sin((t - 5.6) * 30);
      boilSeed('shake'); paint(rrPts(sx - .05 * U, sy - .5 * U, .5 * U, .28 * U, .12 * U), { wash: SKIN_TONES.light.col, ink: PAL.ink, sw: 1.6 });
      for (const k of [-1, 1]) inkLine([[sx + .1 * U, sy + k * (.9 + .15 * pump) * U - .2 * U], [sx + .45 * U, sy + k * (.9 + .15 * pump) * U - .2 * U]], 1.8, PAL.ink, 'ink', 0);
    }
    bubble(nx + 70, 540, 1.55, 'smile?', say(t, 2.2, 4.75), { key: 'n' });
    bubble(cx - 70, 540, 1.45, 'smile', say(t, 3.9, 5.05), { key: 'c', tail: -1 });
    camEnd();
    if (t < 1.38) letter('Friendly?', 468, 400, 118, PAL.cream, { screen: true, stroke: PAL.ink, rot: -.05, alpha: 1 - seg(t, 1.1, 1.38) });   // gone before the hop
  }

  // ---------- S2: bonding (6–14), four vignettes cut on the bar ----------
  // A full-frame colour grade: a translucent wash that pulls everything (characters included) into the light of the
  // moment. Paint it last, then add glow() for any light source so it shines through.
  const grade = (col, op) => { boilSeed('grade' + col); paint(rectPts(-60, -60, W + 120, H + 120), { wash: col, washOp: op, ink: null }); };
  function log(x, y, w, d, tod = 1) {   // a log lying across the frame: (x, y) = ground under its middle, d = diameter
    boilSeed('log' + Math.round(x));
    const night = clamp(tod - 1), col = mixCol('#8C6440', '#2E2A3A', night * .7);
    paint(rrPts(x - w / 2, y - d, w, d, d * .45), { wash: col, ink: PAL.ink, sw: 1.4 });
    paint(ellPts(x + w / 2 - d * .2, y - d / 2, d * .26, d * .48, 16), { wash: mixCol('#D9B37C', '#3E3A4A', night * .7), ink: PAL.ink, sw: 1 });   // the cut end
    for (const k of [.28, .14]) inkLine(ellPts(x + w / 2 - d * .2, y - d / 2, d * k * .5, d * k, 12), .5, mixCol(col, PAL.ink, .3), 'inkfine', .5);
    inkLine([[x - w * .35, y - d * .62], [x + w * .1, y - d * .7]], .6, mixCol(col, PAL.ink, .45), 'inkfine', .4);
  }
  const groundAK = (x, y, r = 0, s = 1) => { boilSeed('groundak'); push(); translate(x, y); rotate(r); scale(-1, 1); akProp(U * .9 * s, 2.3, 0); pop(); };
  const campSet = (t, tod, fire) => {
    rustSky(t, { tod, horizon: 880, sun: tod < 1.5 ? [800, 905] : [820, 260], clouds: tod < 1.5 });
    seaBeach(t, { horizon: 880, shore: 1070, tod });
    driftwood(110, 1180, .8, tod);
  };
  // 2A sunset: the Chad pops a can of beans and tosses it over the fire; the Naked catches it and digs in
  function s2a(t, lt) {
    camBegin(540, 1180, 1.25);
    campSet(t, .95, 1);
    log(330, 1400, 240, 2.35 * U * .95, .95); log(750, 1400, 240, 2.35 * U * .95, .95);
    const tossK = seg(t, 6.62, 6.95);
    // the Chad (right, facing left): holds the can, pops it, tosses
    const C = feel('happy', t), cArm = t < 6.55 ? { aL: -.55, bendL: .9 } : t < 6.7 ? { aL: lerp(-.55, .7, seg(t, 6.55, 6.7)), bendL: .2 } : { aL: lerp(.7, -1.1, seg(t, 6.7, 7.1)), bendL: .3 };
    const Co = { ...C, rawArms: true, ...cArm, aR: -1.32, bendR: .22, boilKey: CH, seed: 2, view: 'q', flip: true, sit: 1, noGun: true, eyes: 'happy', handL: t < 6.62 ? (u, sw) => beanCan(u * .9, sw, { open: t >= 6.4, rot: .1 }) : null };
    geared(750, 1400, U, Co);
    groundAK(800, 1432, -.06);   // his AK, on the sand by his log
    if (t >= 6.4 && t < 6.9) puff(...survivorHand(750, 1400, U, Co, 'L').map((v, i) => v - (i ? 30 : 0)), 22, t - 6.4, { col: '#E8E2D2', key: 'canpop', n: 4, life: .45 });
    // the Naked (left, facing right): catches it and eats, cheeks bobbing
    const eat = t > 7.15, N = eat ? feel('happy', t, { eyes: 'happy', mouth: (Math.floor(t * 6) % 2) ? 'cat' : 'o' }) : feel('hopeful', t);
    const catchUp = ease(seg(t, 6.75, 6.95)), toMouth = ease(seg(t, 7.1, 7.4));
    const No = { ...N, rawArms: true, aL: lerp(lerp(-1.1, .1, catchUp), .55, toMouth), bendL: lerp(lerp(.4, .2, catchUp), 1.6, toMouth), aR: -1.2, bendR: .3, boilKey: NK, seed: 1, view: 'q', sit: 1, prop: 'none',
      handL: t >= 6.95 ? (u, sw) => beanCan(u * .9, sw, { open: true, spoon: eat, rot: -.2 - .3 * toMouth }) : null };
    spawnling(330, 1400, U, No);
    if (t >= 6.62 && t < 6.95) {   // the can in flight, over the fire
      const a = survivorHand(750, 1400, U, { ...Co, aL: .7, bendL: .2 }, 'L'), b = survivorHand(330, 1400, U, { ...No, aL: .1, bendL: .2 }, 'L');
      const p = arcPt(a, b, 260, tossK); boilSeed('flyingcan'); push(); translate(p[0], p[1]); rotate(tossK * 6); beanCanShape(U * .9, 2.2, { open: true }); pop();
    }
    campfire(540, 1405, 1.05, t, { fire: 1 });
    grade('#F08A4B', 38);
    glow(540, 1330, 330, '#FFB04A', .55);
    camEnd();
  }

  // 2B: show and tell. He presents his rock in both hands; the Chad pats it (a heart); the Chad lifts his AK; stars in his eyes
  function s2b(t, lt) {
    camBegin(540, 1150, 1.5);
    campSet(t, 1.05, 1);
    log(330, 1400, 240, 2.35 * U * .95, 1.05); log(750, 1400, 240, 2.35 * U * .95, 1.05);
    const showAK = ease(seg(t, 9.15, 9.45));
    const pat = t > 8.55 && t < 9.1 ? Math.max(0, Math.sin((t - 8.55) * TAU * 3.6)) : 0;
    // the Chad: pats (8.55–9.1), then lifts his AK off the sand and holds it up, proud
    const Cbase = { ...feel('happy', t), boilKey: CH, seed: 2, view: 'q', flip: true, sit: 1, rawArms: true };
    if (t < 9.15) geared(750, 1400, U, { ...Cbase, aL: lerp(-1.1, .05 + .25 * pat, ease(seg(t, 8.3, 8.55)) * (1 - ease(seg(t, 9.0, 9.15)))), bendL: .25, aR: -1.32, bendR: .22, noGun: true, eyes: 'happy' });
    else geared(750, 1400, U, { ...Cbase, aL: lerp(-1.2, .55, showAK), bendL: lerp(.3, -.5, showAK), aR: -1.32, bendR: .22, gunRot: lerp(.9, -1.45, showAK), eyes: 'happy', emote: showAK > .8 ? 'spark' : null, emoteK: seg(t, 9.4, 9.6) });
    if (t < 9.2) groundAK(800, 1432, -.06);
    // the Naked: rock held up in both hands like a treasure; starstruck at the AK
    const star = t > 9.4, N = star ? feel('starstruck', t, { aL: 0, aR: 0, dy: -.2 * Math.abs(Math.sin(t * 9)) }) : feel('hopeful', t, { blush: .5 });
    const lift = ease(seg(t, 8.0, 8.3)), [rx, ry] = [3.0 * U, -7.6 * U];   // where the rock is held, body frame
    const No = { ...N, boilKey: NK, seed: 1, view: 'q', sit: 1, prop: 'none', rawArms: true };
    Object.assign(No, reachArm(U, No, 'L', lerp(1.2 * U, rx, lift), lerp(-4.6 * U, ry, lift)), reachArm(U, No, 'R', lerp(1.2 * U, rx + .9 * U, lift), lerp(-4.6 * U, ry + .3 * U, lift)));
    No.handL = (u, sw) => { push(); translate(.3 * u, -.3 * u); rotate(-.15); rockProp(u * 1.05, sw); pop(); };
    spawnling(330, 1400, U, No);
    const [hx, hy] = survivorHand(330, 1400, U, No, 'L');
    if (t > 8.85) emote('heart', hx + 1.2 * U, hy - 1.6 * U, U * .9, seg(t, 8.85, 9.05), t - 8.85);
    campfire(540, 1405, 1.05, t, { fire: 1 });
    grade('#E9785A', 34);
    glow(540, 1330, 330, '#FFB04A', .55);
    camEnd();
  }
  // Lying on his back: rot ±π/2 lays a survivor down around his feet, head on the sand.
  const lying = (x, y, u, headDir, o) => survivor(x, y - 2.3 * u, u, { ...o, view: 'side', rot: headDir < 0 ? -Math.PI / 2 : Math.PI / 2, flip: headDir > 0, noShadow: true });
  const CHAD_GEAR = { gear: { mask: 'metal', chest: 'metal', kilt: 'roadsign', hoodie: true, hoodieCol: '#5F6B52', pants: true, boots: true, gloves: true }, skin: 'tan', hair: 'buzz', hairCol: 'dark' };
  // 2C night: stargazing from behind them on the log. A shooting star; he traces a rock-shaped constellation; the
  // Chad stretches and yawns
  const ROCKSTARS = [[-.25, -1.05], [.85, -1.3], [1.7, -.75], [1.85, .25], [1.15, .95], [.1, .9], [-.45, .2]];
  function s2c(t, lt) {
    camBegin(540, 960, 1);
    rustSky(t, { tod: 2, horizon: 1040, sun: [860, 230], clouds: false });
    seaBeach(t, { horizon: 1040, shore: 1180, tod: 2 });
    shootingStar(140, 240, 720, 470, seg(t, 10.55, 11.0));
    const tr = seg(t, 10.95, 11.75) * ROCKSTARS.length, cs = 105, ox = 600, oy = 440;
    ROCKSTARS.forEach(([a, b], i) => {
      const k = clamp(tr - i), x = ox + a * cs, y = oy + b * cs;
      if (k > 0) { glow(x, y, 46, i === 5 ? '#FF8A7A' : '#FFF6D0', .9 * k); boilSeed('cstar' + i); paint(starPts(x, y, 10 + 6 * k, .4, 4), { wash: i === 5 ? '#FFB3A8' : '#FFFBEA', ink: null }); }
      if (k >= 1 && i > 0) { const [pa, pb] = ROCKSTARS[i - 1]; inkLine([[ox + pa * cs, oy + pb * cs], [x, y]], 1.1, '#E8E4FF', 'inkfine', 0); }
    });
    if (tr >= ROCKSTARS.length) inkLine([[ox + ROCKSTARS[6][0] * cs, oy + ROCKSTARS[6][1] * cs], [ox + ROCKSTARS[0][0] * cs, oy + ROCKSTARS[0][1] * cs]], 1.1, '#E8E4FF', 'inkfine', 0);
    campfire(560, 1290, .8, t, { fire: .45 });
    // both from behind, sitting: the Naked (left) points up and traces; the Chad (right) leans in, then stretches
    const trace = t > 10.95 && t < 11.75 ? .25 * Math.sin((t - 10.95) * 7.5) : 0, point = ease(seg(t, 10.75, 10.95)) * (1 - ease(seg(t, 11.8, 12)));
    spawnling(400, 1560, 52, { ...feel('happy', t), boilKey: NK, seed: 1, view: 'back', sit: 1, prop: 'none', rawArms: true, aL: lerp(-1.3, 1.25 + trace, point), bendL: lerp(.22, .1, point), aR: -1.25, bendR: .3, rot: -.04 });
    const yawn = ease(seg(t, 11.45, 11.75)) * (1 - ease(seg(t, 11.95, 12)));
    survivor(700, 1560, 52, { ...feel('happy', t, { emote: null }), ...CHAD_GEAR, boilKey: CH, seed: 2, view: 'back', sit: 1, rawArms: true, aL: lerp(-1.25, 1.35, yawn), bendL: lerp(.3, -.6, yawn), aR: lerp(-1.25, 1.35, yawn), bendR: lerp(.3, -.6, yawn), rot: .05 - .05 * yawn, sy: 1 + .05 * yawn });
    log(550, 1600, 620, 120, 2);
    grade('#1A2348', 58);
    glow(560, 1240, 300, '#FF8A3A', .55);
    camEnd();
  }
  // ---------- the night camp, seen from the front (2D, 3A–3C, 4A) ----------
  // The Chad has dozed off sitting on the log, head lolling, hugging the empty can. His AK rests across the log beside
  // him. The Naked sat at the log's other end.
  const LOGX = 560, LOGY = 1420, LOGD = 112, CX = 400, CU = 48;
  const chadHead = () => [CX + .25 * CU, LOGY - (10.85 - 2.05) * CU];
  function nightCamp(t) {
    campSet(t, 2, .2);
    campfire(70, 1470, .75, t, { fire: .22 });
    log(LOGX, LOGY, 620, LOGD, 2);
  }
  function sleeper(t, o = {}) {
    const br = Math.sin((t - 12) * 2.6) * .5 + .5;   // breathing
    const C = { ...feel('sleepy', t, { emote: null }), ...CHAD_GEAR, eyes: 'happy', boilKey: CH, seed: 2, view: 'front', sit: 1, rot: .1, rawArms: true, sy: 1 + .015 * br, ...o };
    Object.assign(C, reachArm(CU, C, 'L', .15 * CU, -5.7 * CU + 2.05 * CU), reachArm(CU, C, 'R', -.35 * CU, -6.1 * CU + 2.05 * CU));
    C.handL = (u, sw) => beanCan(u * .9, sw, { open: true, rot: -.3 });
    if (o.flower) C.draw = (u, sw) => flower(-.6 * u, -5.9 * u + 2.05 * u, .85, { key: 'gift', rot: .5, stem: .8 });
    survivor(CX, LOGY, CU, C);
    return C;
  }
  // the AK lying along the top of the log, right of him: grip at about (GRIPX, GRIPY)
  const GRIPX = 640, GRIPY = 1312;
  const logAK = () => { boilSeed('logak'); push(); translate(GRIPX + 30, LOGY - LOGD - 8); rotate(-.04); akProp(CU * .95, 2.3, 0); pop(); };
  // 2D: the Chad has dozed off; the Naked, at the log's other end, looks at him, then at the AK; his eyes narrow
  function s2d(t, lt) {
    const push_ = ease(seg(t, 12.9, 14));
    camBegin(lerp(560, 780, push_), lerp(1150, 1010, push_), lerp(1.2, 1.85, push_));
    nightCamp(t);
    sleeper(t);
    emote('zzz', chadHead()[0] + 70, chadHead()[1] - 120, 40, 1, t);
    sleepBubble(chadHead()[0] + 34, chadHead()[1] + 40, 1.3, (t - 12) * .42);
    logAK();
    const gl = t > 12.95 ? Math.max(0, Math.sin((t - 12.95) * 5)) : 0;   // a glint on the gun catches his eye
    if (gl > .05) { glow(GRIPX + 120, GRIPY - 10, 70, '#FFF2C4', gl); boilSeed('akglint'); paint(starPts(GRIPX + 120, GRIPY - 10, 16 * gl, .3, 4), { wash: '#FFFBEA', ink: null }); }
    const look = t < 12.9 ? { lookX: .9, lookY: .1 } : { lookX: .5, lookY: .9 };
    const N = emotions(t, [[12, 'neutral'], [13.35, 'mischief', { eyes: 'sly', mouth: 'smirk' }]]);
    spawnling(810, LOGY, 48, { ...N, ...look, boilKey: NK, seed: 1, view: 'q', flip: true, sit: 1, prop: 'none', rawArms: true, aL: -1.15, bendL: .3, aR: -1.32, bendR: .3 });
    grade('#1A2348', 52); glow(70, 1420, 230, '#FF8A3A', .4);
    camEnd();
  }

  // ---------- S3: the choice (14–22) ----------
  // 3A: he slides off the log and creeps in, crouched, and his trembling hand hovers over the AK's grip
  function s3a(t, lt) {
    camBegin(600, 1180, 1.4);
    nightCamp(t);
    sleeper(t);
    sleepBubble(chadHead()[0] + 34, chadHead()[1] + 40, 1.3, (t - 12) * .42);
    logAK();
    const k = ease(seg(t, 14, 15.2)), nx = lerp(860, 760, k);
    const N = { ...feel('nervous', t, { emote: null }), eyes: 'look', lookX: .7, lookY: .7, boilKey: NK, seed: 1, view: 'q', flip: true, crouch: .5, walk: (t - 14) * 1.4 * (1 - seg(t, 15, 15.2)), rot: -.18 * k, prop: 'none', rawArms: true, aR: -1.2, bendR: .5, dy: -.2 * Math.abs(Math.sin((t - 14) * 4.4)) * (1 - k) };
    const hover = 34 * ease(seg(t, 15.2, 15.6)) + 6 * Math.sin(t * 38) * seg(t, 15.2, 15.4);
    Object.assign(N, reachArm(48, N, 'L', ...toBody(nx, 1500, 48, N, GRIPX, GRIPY - 10 - hover)));
    spawnling(nx, 1500, 48, N);
    grade('#1A2348', 52); glow(70, 1420, 230, '#FF8A3A', .4);
    camEnd();
  }
  // 3B: close on the sleeping Chad: happy shut eyes in the mask, the can hugged, a sleep bubble
  function s3b(t, lt) {
    const [hx, hy] = chadHead();
    camBegin(hx + 10, hy + 70, 2.7);
    nightCamp(t);
    sleeper(t);
    sleepBubble(hx + 34, hy + 40, 1.1, (t - 12) * .42);
    logAK();
    grade('#1A2348', 46); glow(hx, hy, 240, '#FFB46A', .22);
    camEnd();
  }
  // 3C: his face softens; he lets go of the gun, picks a little flower from the sand, lays it on the Chad's chest and
  // pats his helmet twice. Hearts.
  function s3c(t, lt) {
    camBegin(560, 1150, 1.45);
    nightCamp(t);
    const [hx, hy] = chadHead(), chest = [CX - .5 * CU, LOGY - (5.9 - 2.05) * CU];
    sleeper(t, { flower: t >= 18.15 });
    sleepBubble(hx + 34, hy + 40, 1.3, (t - 12) * .42);
    logAK();
    if (t < 17.75) flower(735, 1505, .75, { key: 'pick' });   // a flower growing in the sand by his feet
    const N = emotions(t, [[17, 'nervous', { emote: null }], [17.25, 'hopeful', { emote: 'hearts' }]]);
    const No = { ...N, boilKey: NK, seed: 1, view: 'q', flip: true, crouch: .45, rot: -.12, prop: 'none', rawArms: true, aR: -1.2, bendR: .5 };
    const pats = t > 18.3 ? Math.abs(Math.sin((t - 18.3) * TAU * 2)) : 0;
    const path = [[17.0, [GRIPX, GRIPY - 44]], [17.3, [700, 1250]], [17.55, [735, 1460]], [17.8, [735, 1460]], [18.0, [chest[0] + 60, chest[1] - 30]], [18.15, chest], [18.3, [hx + 70, hy - 40]], [18.85, [hx + 70, hy - 40]], [19, [700, 1260]]];
    const [px, py] = kf(t, path);
    Object.assign(No, reachArm(48, No, 'L', ...toBody(640, 1500, 48, No, px, py + (t > 18.3 && t < 18.85 ? 30 * pats : 0))));
    if (t >= 17.75 && t < 18.15) No.handL = (u, sw) => flower(0, .3 * u, .65, { key: 'held', rot: .3, stem: .8 });
    spawnling(640, 1500, 48, No);
    grade('#1A2348', 50); glow(70, 1420, 230, '#FF8A3A', .4);
    camEnd();
  }
  // 3D dawn: he walks off along the beach toward the sunrise, whistling, swinging his rock; far behind him the Chad
  // still sleeps on his log with the flower
  const dawnSet = (t, hz = 1000) => { rustSky(t, { tod: .72, horizon: hz, sun: [930, hz - 15] }); seaBeach(t, { horizon: hz, shore: hz + 130, tod: .72 }); };
  function s3d(t, lt) {
    camBegin(540, 960, 1);
    dawnSet(t);
    campfire(70, 1262, .4, t, { fire: 0, smoke: .8 });
    log(200, 1262, 230, 42, .72);
    survivor(170, 1262, 19, { ...feel('sleepy', t, { emote: null }), ...CHAD_GEAR, eyes: 'happy', boilKey: CH, seed: 2, view: 'front', sit: 1, rot: .1, rawArms: true, aL: .1, bendL: 1.6, aR: .1, bendR: 1.6,
      draw: (u, sw) => flower(-.6 * u, -3.85 * u, .4, { key: 'gift', rot: .5, stem: .8 }) });
    const k = seg(t, 19, 22), nx = lerp(380, 760, k), ph = (t - 19) * 1.7;
    spawnling(nx, 1470, 46, { ...feel('happy', t, { emote: 'music' }), boilKey: NK, seed: 1, view: 'q', walk: ph, dy: -.4 * Math.abs(Math.sin(ph * Math.PI)), rawArms: true, aL: -1.0 + .5 * Math.sin(ph * Math.PI), bendL: .3, aR: -1.2 - .3 * Math.sin(ph * Math.PI), bendR: .3 });
    grade('#F2A27A', 24); glow(930, 985, 380, '#FFC488', .5);
    camEnd();
  }

  // ---------- S4: Rust. (22–28) ----------
  // 4A: extreme close-up on the Chad's mask at dawn: one eye snaps open (22.4) and narrows
  function s4a(t, lt) {
    const [hx, hy] = chadHead();
    camBegin(hx + 6, hy + 10, 4.2);
    nightCamp(t);
    const eyes = t < 22.4 ? 'happy' : t < 22.75 ? ['happy', 'wide'] : ['happy', 'angry'];
    sleeper(t, { eyes, flower: true });
    logAK();
    if (t > 22.4 && t < 22.75) glow(hx + 26, hy - 8, 70, '#FFFBEA', 1 - seg(t, 22.4, 22.75));
    grade('#F2A27A', 20);
    camEnd();
  }
  // 4B–4C: wide at dawn. The Chad, sitting on his log in the left foreground, raises his AK at the tiny Naked
  // whistling far away down the beach. BANG (24.5): a flash, his note pops, he topples behind a dune, the rock tumbles.
  function s4b(t, lt) {
    camBegin(540, 960, 1);
    dawnSet(t);
    const shot = t >= 24.5, fall = seg(t, 24.55, 24.85), nx = 690 + 40 * seg(t, 23, 24.5);
    if (fall < 1) spawnling(nx, 1212, 15, { ...feel('happy', t, { emote: shot ? null : 'music' }), boilKey: NK, seed: 1, view: 'q', walk: shot ? 0 : (t - 19) * 1.7, rot: 1.4 * easeIn(fall), prop: shot ? 'none' : 'rock' });
    if (shot) { notePop(nx + 35, 1040, 1, t - 24.5); puff(nx + 6, 1206, 30, t - 24.55, { col: '#E9D3A1', key: 'sand' }); }
    if (t > 24.55) { const k = seg(t, 24.55, 25), p = arcPt([nx + 12, 1160], [nx + 60, 1220], 90, k); boilSeed('flyrock'); push(); translate(p[0], p[1]); rotate(k * 9); rockProp(12, 1); pop(); }
    boilSeed('farDune'); paint([[560, 1252], [640, 1222], [760, 1212], [900, 1220], [990, 1252], [990, 1300], [560, 1300]], { wash: '#E4C397', ink: null, curv: .5 });
    inkLine([[560, 1252], [640, 1222], [760, 1212], [900, 1220], [990, 1252]], 1.1, PAL.ink, 'ink', .5);
    // the Chad: wakes (eyes), raises the AK (23.4–24.2), aims down the beach, fires
    log(250, 1690, 520, 150, .72);
    const aim = ease(seg(t, 23.3, 24.1)), kick = shot ? Math.exp(-(t - 24.5) * 10) : 0;
    const C = { ...feel('determined', t, { emote: null }), eyes: 'angry', ...CHAD_GEAR, boilKey: CH, seed: 2, view: 'side', sit: 1, rawArms: true, aL: lerp(-1.1, -.03, aim) + .25 * kick, bendL: lerp(.6, .05, aim), aR: -1.2, bendR: .3, gunRot: lerp(1.1, -.06, aim) - .2 * kick, twoHand: aim > .7, fire: shot ? clamp(1 - (t - 24.5) * 6) : 0,
      draw: (u, sw) => flower(.75 * u, -6.0 * u + 2.05 * u, .9, { key: 'gift4b', rot: -.2, stem: .6 }) };
    geared(210, 1690, 66, C);
    grade('#F2A27A', 20);
    camEnd();
    if (shot) flash(.5 * Math.exp(-(t - 24.5) * 14), '#FFF1C8');
  }
  // 4D: cut to the morning beach, the opening composition. He respawns lying in the sand (25.0), sits up, rubs his
  // eyes, grabs his rock, gets up — and the Chad walks in from the right, AK raised, the flower tucked in his chest
  // strap (26.8). Freeze, "!" (27.2): frame 1 again.
  function s4d(t, lt) {
    camBegin(540, 1080, 1);
    beach(t, 0);
    const sitK = ease(seg(t, 25.35, 25.55)), standK = ease(seg(t, 26.05, 26.35));
    if (t < 25.35) lying(250 - 4.4 * U, G, U, 1, { ...HERO, ...feel('sleepy', t, { emote: null }), eyes: 'closed', boilKey: NK, seed: 1, rawArms: true, aL: -1.3, aR: -1.3 });
    else if (t < 26.05) spawnling(250, G, U, { ...feel('sleepy', t, { emote: null }), eyes: t < 25.9 ? 'closed' : 'normal', boilKey: NK, seed: 1, view: 'front', sit: 1, prop: 'none', rawArms: true, aL: t > 25.6 && t < 25.95 ? .7 : -1.1, bendL: t > 25.6 && t < 25.95 ? 2.2 + .3 * Math.sin(t * 30) : .4, aR: -1.1, bendR: .4, sq: .1 * (1 - sitK) });
    else {
      const N = emotions(t, [[26.05, 'neutral'], [27.2, 'surprised', { emote: '!' }]]);
      spawnling(250, G, U, { ...N, boilKey: NK, seed: 1, view: 'q', walk: .12 * seg(t, 26.5, 26.85), sit: 1 - standK, rawArms: true, aL: lerp(-1.32, -.95, seg(t, 26.9, 27.2)), bendL: .25, aR: -1.32, bendR: .22, prop: 'none', hold: { L: 'rock' } });
    }
    if (t < 26.05) { boilSeed('respawnrock'); push(); translate(250 + 2.6 * U, G - .3 * U); rotate(3.5); rockProp(U, 2.2); pop(); }
    respawn(250, G - 2.5 * U, 1.3, t - 25);
    const cin = ease(seg(t, 26.5, 26.95)), cx = lerp(1480, 770, cin);   // the gun enters first; nothing in frame before 26.5
    geared(cx, G, U, { ...feel('determined', t), boilKey: CH, seed: 2, view: 'q', flip: true, walk: t < 26.95 ? (t - 26.5) * 3 : 0, rawArms: true, aL: -.2, bendL: .1, aR: -1.32, bendR: .22, gunRot: .04, twoHand: true,
      draw: (u, sw) => flower(.75 * u, -6.0 * u, .85, { key: 'strap', rot: -.3, stem: .55 }) });
    camEnd();
  }

  shots([[0, s1], [6, s2a], [8, s2b], [10, s2c], [12, s2d], [14, s3a], [16, s3b], [17, s3c], [19, s3d], [22, s4a], [23, s4b], [25, s4d]]);
})();
