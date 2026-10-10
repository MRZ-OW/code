// ep1 "Friendly?": a naked meets a geared player, they bond by a campfire, he spares the man's AK and leaves him a
// flower, and gets shot in the back for it. Respawn, and here comes the next stranger. Shot list: SCRIPT.md.
(() => {
  const G = 1310, U = 48;                              // ground line and unit of the two-shots (eyes land near y 790)
  const NK = 'naked', CH = 'chad';
  const say = (t, t0, t1) => clamp(seg(t, t0, t0 + .3)) * (1 - seg(t, t1 - .15, t1));   // a bubble's pop-in/out

  // The beach. tod: 0 day → 1 sunset → 2 night (rustsets.js). The pine and the driftwood frame the left edge.
  function beach(t, tod, o = {}) {
    rustSky(t, { tod, horizon: 772, sun: o.sun || [820, 350] });
    seaBeach(t, { horizon: 772, shore: 1230, tod });
    pineTree(-30, 1330, 1.9, { tod });
    log(10, 1300, 190, 60, tod);
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
  const NX = 262, CXA = 740;   // where they stand in the standoff
  function s1(t, lt) {
    camBegin(540, 1080, 1 + .05 * ease(lt / 6));
    beach(t, 0);
    // ----- the Naked -----
    const walkK = seg(t, 5.0, 5.6), nx = lerp(NX, 345, ease(walkK));
    const N = emotions(t, [[0, 'surprised', { emote: '!' }], [.9, 'nervous', { emote: 'sweat' }], [1.38, 'scared', { eyes: 'squeeze', mouth: 'wobble', emote: null }], [2.0, 'hopeful', { emote: null }], [4.45, 'happy']], { take: .45 });
    if (t < .9) N.emoteK = 1 - seg(t, .7, .9);                                  // the "!" is already up in frame 1
    const view = t < 2.0 || t >= 4.95 ? 'q' : t < 2.09 ? 'qf' : t < 4.86 ? 'front' : 'qf';   // turn to face us, and back
    const hop = t > 1.5 && t < 2.0 ? -.75 * Math.abs(Math.sin((t - 1.5) * TAU * 2)) : 0, liftL = ease(seg(t, 1.55, 1.66)) * (1 - ease(seg(t, 1.92, 2.0)));
    const upL = ease(seg(t, 2.1, 2.45)), upR = ease(seg(t, 2.18, 2.53)), downL = ease(seg(t, 4.45, 4.8)), downR = ease(seg(t, 4.53, 4.88)), down = downL;
    const tremble = t > 2.45 && t < 4.4 ? .035 * Math.sin(t * 46) : 0;
    // hands: hanging (rock in hand) → clutch the hurt foot → in front of the chest → up beside his head, palms open
    const armUp = k => k < .5 ? { a: lerp(-1.32, -.8, ease(k * 2)), b: lerp(.22, 1.5, ease(k * 2)) } : { a: lerp(-.8, -.42, ease(k * 2 - 1)), b: lerp(1.5, 4.25, ease(k * 2 - 1)) };   // forearm turns up across the chest
    // ...and back down: the forearms flop outward to his sides (never back across the chest)
    const armDown = (up, k) => { if (!(k > 0)) return armUp(up); const a = lerp(-.42, -1.32, easeOut(k)); return { a, b: a - lerp(1.61, -1.54, k) }; };   // the elbow drops first, so the hand stays in frame
    const L = armDown(upL, downL), R = armDown(upR, downR);
    const No = { ...N, boilKey: NK, seed: 1, view, rawArms: true, prop: 'none', walk: t < .8 ? .12 * (1 - seg(t, .4, .8)) : t >= 5.0 ? walkK * 3 : undefined, dy: (N.dy || 0) + hop, heelL: liftL, emoteDx: .9, emoteDy: 2.6,
      aL: L.a + tremble, bendL: L.b, aR: R.a - tremble, bendR: R.b, openL: upL > .6 && downL < .6, openR: upR > .6 && downR < .6,
      lookX: t > 2.6 && t < 4.4 ? (Math.floor(t * 1.6) % 2 ? .9 : .35) : N.lookX, lookY: t > 2.6 && t < 4.4 ? (Math.floor(t * 1.6) % 2 ? .5 : 0) : N.lookY };
    if (t < 1.22) { No.aL = lerp(-1.2, -1.32, ease(seg(t, .5, 1.15)));   // (the rock by his thigh, not held over his briefs) No.bendL = .25; No.hold = { L: 'rock' }; }
    if (liftL > 0) {   // the hurt foot bent up behind him, held in his near hand; the far arm flails for balance
      const [ax, ay] = footLocal(U, No, 0), gl = reachArm(U, No, 'L', ax + .1 * U, ay - .1 * U);
      Object.assign(No, { aL: lerp(No.aL, gl.aL, liftL), bendL: lerp(No.bendL, gl.bendL, liftL), armKL: lerp(1, gl.armKL, liftL), aR: lerp(No.aR, .95 + .25 * Math.sin(t * 22), liftL), bendR: lerp(No.bendR, .35, liftL) });
    }
    if (t >= 5.0) Object.assign(No, { aL: lerp(-1.32, -.35, ease(seg(t, 5.0, 5.6))) + (t > 5.6 ? .12 * Math.sin((t - 5.6) * 30) : 0), bendL: .05 });
    spawnling(nx, G, U, No);
    if (liftL > .5) {   // throbbing pain ticks round the held-up foot
      const [fx, fy] = survivorFoot(nx, G, U, No, 0), th = .5 + .5 * Math.sin(t * 38);
      boilSeed('throb'); for (const a of [-.5, .3, 1.1]) { const r0 = 46 + 6 * th, r1 = 70 + 10 * th, P = [[fx + Math.cos(a) * r0, fy - 18 + Math.sin(a) * r0], [fx + Math.cos(a) * r1, fy - 18 + Math.sin(a) * r1]]; inkLine(P, 3.4, PAL.ink, 'ink', 0); inkLine(P, 1.9, '#FFE27A', 'ink', 0); }
    }
    // the rock: slips at 1.22, lands on his foot at 1.38 (impact ticks, held 3 frames), tips off backwards when he
    // grabs the foot, and settles behind him
    if (t >= 1.22) {
      const foot = survivorFoot(NX, G, U, { ...No, view: 'q', liftL: 0, heelL: 0, walk: 0, dy: 0 }, 0), onFoot = [foot[0] + .1 * U, foot[1] - .75 * U], rest = [NX - 1.9 * U, G + .15 * U];
      const [hx, hy] = survivorHand(NX, G, U, { ...No, view: 'q', aL: -1.32, bendL: .25, dy: 0, liftL: 0 }, 'L');
      let p, r;
      if (t < 1.38) { const k = seg(t, 1.22, 1.38); p = [lerp(hx, onFoot[0], k), lerp(hy, onFoot[1], k * k)]; r = (t - 1.22) * 4; }
      else if (t < 1.5) { p = onFoot; r = .64; }
      else { const k = seg(t, 1.5, 1.8); p = arcPt(onFoot, rest, 40, k); r = .64 - k * 4; }
      boilSeed('droprock'); push(); translate(p[0], p[1]); rotate(r); rockProp(U, 2.4); pop();
      if (t >= 1.38 && t < 1.62) { const k = seg(t, 1.38, 1.62); boilSeed('ticks'); for (const a of [-2.5, -1.9, -1.25, -.65]) { const r0 = 44 + 30 * k, r1 = 82 + 30 * k, P = [[onFoot[0] + Math.cos(a) * r0, onFoot[1] + Math.sin(a) * r0], [onFoot[0] + Math.cos(a) * r1, onFoot[1] + Math.sin(a) * r1]]; inkLine(P, 4.2 * (1 - k * .6), PAL.ink, 'ink', 0); inkLine(P, 2.4 * (1 - k * .6), '#FFE27A', 'ink', 0); } }
    }
    // the sweat drops fall away when he turns to face us
    if (t >= 2.0 && t < 2.4) { const k = seg(t, 2.0, 2.4); boilSeed('fallingsweat'); for (const [dx, d0] of [[3.1, 0], [3.9, .8]]) paint(ellPts(NX + dx * U, G - (12.6 - d0) * U + 260 * k * k, 9 * (1 - .4 * k), 13 * (1 - .4 * k), 10), { wash: PAL.sky, washOp: 255 * (1 - k), ink: PAL.ink, sw: 1 }); }
    // ----- the Chad: aims, wonders, lowers the gun, relief; swings it over his shoulder onto his back; walks in -----
    const cwalk = seg(t, 5.0, 5.6), cx = lerp(CXA, 655, ease(cwalk));
    const C = emotions(t, [[-1, 'determined'], [2.7, 'confused'], [3.55, 'neutral'], [4.45, 'happy']], { take: .5 });   // no take on frame 0 (the loop lands here)
    const lower = ease(seg(t, 3.55, 4.35));
    let CA;
    const aimPose = reachArm(U, { view: 'q', rawArms: true }, 'L', 1.75 * U, -6.95 * U);
    if (t < 4.6) CA = { aL: lerp(aimPose.aL, -1.05, lower), bendL: lerp(aimPose.bendL, .35, lower), gunRot: lerp(.03, .95, lower), twoHand: lower < .5 };
    else {
      // the sling: his hand stays on the grip and twirls the rifle muzzle-down, back and up on his back side (away from
      // the Naked), out past his shoulder; at 4.8 he lets go and it drops onto his back, slung; the hand falls to his side
      const k = ease(seg(t, 4.6, 4.8)), k2 = ease(seg(t, 4.8, 4.92));
      const low = handLocal(U, { view: 'q', rawArms: true, aL: -1.05, bendL: .35 }, 'L'), high = [-3.2 * U, -8.1 * U], slungAt = [-.6 * U, -6.6 * U];
      if (t < 4.8) {
        const g = [lerp(low[0], high[0], k), lerp(low[1], high[1], k)];
        CA = { ...reachArm(U, { view: 'q', rawArms: true }, 'L', g[0], g[1]), gunRot: lerp(.95, TAU - 1.75, k), handOver: true };
      } else {
        const p = [lerp(high[0], slungAt[0], k2), lerp(high[1], slungAt[1], k2)], r = lerp(TAU - 1.75, TAU - 2.3, k2), fall = ease(seg(t, 4.8, 4.97));
        const hp = reachArm(U, { view: 'q', rawArms: true }, 'L', high[0], high[1]);
        CA = { aL: t >= 5.0 ? lerp(-1.32, -.35, ease(seg(t, 5.0, 5.6))) + (t > 5.6 ? .12 * Math.sin((t - 5.6) * 30) : 0) : lerp(hp.aL, -1.32, fall), bendL: t >= 5.0 ? .05 : lerp(hp.bendL, .22, fall), armKL: t >= 5.0 ? 1 : lerp(hp.armKL, 1, fall), noGun: true,
          behind: (u, sw) => { push(); translate(p[0] * u / U, p[1] * u / U); rotate(r); akProp(u, sw * .9, 0); pop(); } };
      }
    }
    geared(cx, G, U, { ...C, ...CA, rawArms: true, aR: -1.32, bendR: .22, boilKey: CH, seed: 2, view: 'q', flip: true, walk: t < 5.0 ? 0 : cwalk * 3, emoteK: C.emote ? C.emoteK : 0, emoteDy: -2.45 });
    // the handshake: his thumb over the clasp, and pump lines
    if (t > 5.6) {
      const [sx, sy] = survivorHand(nx, G, U, No, 'L'), pump = Math.sin((t - 5.6) * 30);
      boilSeed('shake'); paint(rrPts(sx - .05 * U, sy - .5 * U, .5 * U, .28 * U, .12 * U), { wash: SKIN_TONES.light.col, ink: PAL.ink, sw: 1.6 });
      for (const k of [-1, 1]) for (const j of [0, 1]) { const r = (.85 + .32 * j + .06 * pump) * U, c0 = sy - .25 * U, c1 = sx + .2 * U; inkLine(Array.from({ length: 7 }, (_, i) => { const a = k * Math.PI / 2 + (i / 6 - .5) * .95; return [c1 + Math.cos(a) * r, c0 + Math.sin(a) * r * .85]; }), 1.3, PAL.ink, 'ink', 0); }
    }
    bubble(nx + 70, 540, 1.55, 'smile?', say(t, 2.2, 4.75), { key: 'n' });
    bubble(cx - 70, 540, 1.45, 'smile', say(t, 3.9, 5.05), { key: 'c', tail: -1 });
    camEnd();
    if (t < 1.3) letter('Friendly?', 468, 400, 118, PAL.cream, { screen: true, stroke: PAL.ink, rot: -.05, pop: t < 1.1 ? 1 : 1 - seg(t, 1.1, 1.3) * 1.0 });   // shrinks away before the hop
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
  // A log stood on end as a seat: (x, y) = ground under its middle, r = radius, h = height
  function stump(x, y, r, h, tod = 1) {
    boilSeed('stump' + Math.round(x));
    const night = clamp(tod - 1), col = mixCol('#7E5A3A', '#2E2A3A', night * .7), top = mixCol('#D9B37C', '#4A4456', night * .7);
    paint([[x - r, y - h], [x + r, y - h], [x + r * 1.04, y - r * .1], [x, y + r * .22], [x - r * 1.04, y - r * .1]], { wash: col, ink: PAL.ink, sw: 1.4, curv: .2 });
    for (let k = 0; k < 4; k++) inkLine([[x - r * .7 + k * r * .45, y - h + r * .3], [x - r * .72 + k * r * .45, y - r * .2]], .7, mixCol(col, PAL.ink, .4), 'inkfine', .3);   // bark
    paint(ellPts(x, y - h, r, r * .3, 18), { wash: top, ink: PAL.ink, sw: 1.1 });
    for (const k of [.66, .36]) inkLine(ellPts(x, y - h, r * k, r * .3 * k, 14), .6, mixCol(top, PAL.ink, .35), 'inkfine', .5);   // rings
  }
  const groundAK = (x, y, r = 0, s = 1) => { boilSeed('groundak'); push(); translate(x, y); rotate(r); scale(-1, 1); akProp(U * .9 * s, 2.3, 0); pop(); };
  // the sunset beach: a sun glitter path across the water ties sky and sea together
  const campSet = (t, tod, fire) => {
    rustSky(t, { tod, horizon: 880, sun: tod < 1.5 ? [540, 905] : [820, 260], clouds: tod < 1.5 });
    seaBeach(t, { horizon: 880, shore: 1070, tod });
    if (tod < 1.5) {
      staticSeed('farsea'); paint(rectPts(-200, 878, W + 400, 70), { wash: '#F0A27E', washOp: 120, ink: null });   // the far sea takes the sunset's colour
      for (let i = 0; i < 6; i++) for (let j = -1; j <= 1; j++) {   // broken glints, sparser and dimmer toward the horizon
        if ((i + j * 2 + Math.floor(t * 3)) % 3 === 0) continue;
        boilSeed('glitter' + i + j); const gy = 894 + i * 26, gw = (14 + 9 * i) * (1 + .3 * Math.sin(t * 2 + i + j)), gx = 540 + j * (30 + 14 * i) + 8 * Math.sin(t * 3 + i * 1.7);
        inkLine([[gx - gw / 2, gy], [gx + gw / 2, gy]], .9 + .15 * i, mixCol('#F0A27E', i % 2 ? '#FFD08A' : '#FFE9B8', .45 + .08 * i), 'ink', 0);
      }
    }
  };
  const SEAT = 2.35 * U;   // a stump as tall as his lower leg
  // 2A sunset: the Chad pops a can of beans and tosses it over the fire; the Naked catches it and digs in
  function s2a(t, lt) {
    camBegin(540, 1180, 1.25);
    campSet(t, .95, 1);
    stump(330, 1400, 70, SEAT, .95); stump(750, 1400, 70, SEAT, .95);
    const tossK = seg(t, 6.62, 6.95);
    const C = feel('happy', t), cArm = t < 6.55 ? { aL: -.55, bendL: .9 } : t < 6.7 ? { aL: lerp(-.55, .7, seg(t, 6.55, 6.7)), bendL: .2 } : { aL: lerp(.7, -1.1, seg(t, 6.7, 7.1)), bendL: .3 };
    const Co = { ...C, rawArms: true, ...cArm, aR: -1.32, bendR: .22, boilKey: CH, seed: 2, view: 'q', flip: true, sit: 1, noGun: true, eyes: 'happy', lap: lapAK, handL: t < 6.62 ? (u, sw) => beanCan(u * .9, sw, { open: t >= 6.4, rot: .1 }) : null };
    if (t >= 6.7) {   // after the toss his hand comes down onto the rifle's grip (the fist over it), not through the gun
      const g = reachArm(U, Co, 'L', ...toBody(750, 1400, U, Co, ...LAP_GRIP(750, 1400))), k = ease(seg(t, 6.75, 7.15));
      Object.assign(Co, { aL: lerp(.7, g.aL, k), bendL: lerp(.2, g.bendL, k), armKL: lerp(1, g.armKL, k) });
    }
    geared(750, 1400, U, Co);
    if (t >= 6.4 && t < 6.9) puff(...survivorHand(750, 1400, U, Co, 'L').map((v, i) => v - (i ? 30 : 0)), 22, t - 6.4, { col: '#E8E2D2', key: 'canpop', n: 4, life: .45 });
    const eat = t > 7.15, N = eat ? feel('happy', t, { eyes: 'happy', mouth: (Math.floor(t * 6) % 2) ? 'cat' : 'o' }) : feel('hopeful', t);
    const catchUp = ease(seg(t, 6.75, 6.95)), toMouth = ease(seg(t, 7.1, 7.4));
    const No = { ...N, rawArms: true, aL: lerp(-1.1, .1, catchUp), bendL: lerp(.4, .2, catchUp), aR: -1.2, bendR: .3, boilKey: NK, seed: 1, view: 'q', sit: 1, prop: 'none', handOver: true,
      handL: t >= 6.95 ? (u, sw) => { push(); translate(.3 * u * toMouth, -.15 * u * toMouth); beanCan(u * .9, sw, { open: true, spoon: eat, rot: -.2 * (1 - toMouth) }); pop(); } : null };   // held by its side, so the can shows past his fist
    // the can comes up in front of his chest, under the beard (elbow down, his hand round it), not folded up at his
    // mouth with the elbow cocked and the hand hidden behind the can; the far hand rests on his knee (it hung as a lone
    // white ball by the fire)
    // (seated, his shoulder is at -5.7u: a target above it cocked the upper arm out level across his chest)
    const eatAt = reachArm(U, No, 'L', 1.65 * U, -4.75 * U), knee = reachArm(U, No, 'R', 2.05 * U, -2.75 * U);
    Object.assign(No, { aL: lerp(No.aL, eatAt.aL, toMouth), bendL: lerp(No.bendL, eatAt.bendL, toMouth), armKL: lerp(1, eatAt.armKL, toMouth), ...knee, openR: true });   // an open palm on his knee
    spawnling(330, 1400, U, No);
    if (t >= 6.62 && t < 6.95) {   // the can in flight, over the fire
      const a = survivorHand(750, 1400, U, { ...Co, aL: .7, bendL: .2 }, 'L'), b = survivorHand(330, 1400, U, { ...No, aL: .1, bendL: .2 }, 'L');
      const p = arcPt(a, b, 260, tossK); boilSeed('flyingcan'); push(); translate(p[0], p[1]); rotate(tossK * 6); beanCanShape(U * .9, 2.2, { open: true }); pop();
    }
    campfire(540, 1405, 1.05, t, { fire: 1, glow: .55 });
    grade('#F08A4B', 38);
    glow(540, 1330, 330, '#FFB04A', .4);
    camEnd();
  }
  // his AK across the Chad's lap (sitting, facing left): the stock under his near arm, the barrel out to the right
  // (a lap hook: drawn in his flipped body frame over his kilt and under his arms, so the gun lies on his lap and his
  // hands sit on it; drawn after him it ran through his hands, kilt and body). LAP_GRIP: its grip in the world.
  function lapAK(u, sw) { push(); scale(-1, 1); translate(.25 * u, -(SEAT / U + .7) * u); rotate(-.04); akProp(u * .9, 2.3, 0); pop(); }
  const LAP_GRIP = (cx, gy) => [cx + .25 * U - .33 * .9 * U, gy - SEAT - .7 * U + .55 * .9 * U];
  // 2B: show and tell. He presents his rock in both hands; the Chad pats it, gently (a small heart); the Chad lifts his
  // AK off his lap and holds it up level, side-on, with a sparkle; stars in the naked's eyes
  function s2b(t, lt) {
    camBegin(540, 1150, 1.5);
    campSet(t, 1.05, 1);
    stump(330, 1400, 70, SEAT, 1.05); stump(700, 1400, 70, SEAT, 1.05);
    const lift = ease(seg(t, 8.0, 8.3)), rk = [330 + 3.0 * U, 1400 - 6.6 * U];   // where the rock is held up (world): chest high, so the Chad's pat reaches it under his mask, not across it
    // the Naked: rock held up in both hands like a treasure; starstruck at the AK
    const star = t > 9.45, N = star ? feel('starstruck', t, { aL: 0, aR: 0 }) : feel('hopeful', t, { blush: .5 });
    const No = { ...N, boilKey: NK, seed: 1, view: 'q', sit: 1, prop: 'none', rawArms: true };
    const toB = (wx, wy) => toBody(330, 1400, U, No, wx, wy);
    Object.assign(No, reachArm(U, No, 'L', ...toB(lerp(330 + 1.2 * U, rk[0], lift), lerp(1400 - 4.6 * U, rk[1], lift))), reachArm(U, No, 'R', ...toB(lerp(330 + 1.2 * U, rk[0] + .9 * U, lift), lerp(1400 - 4.6 * U, rk[1] + .3 * U, lift))));
    No.handL = (u, sw) => { push(); translate(.3 * u, -.3 * u); rotate(-.15); rockProp(u * 1.05, sw); pop(); };
    // the Chad: two pats on top of the rock (8.55–9.05), then the AK from his lap, up level and side-on (9.15–9.45)
    const Cb = { ...feel('happy', t), eyes: 'happy', boilKey: CH, seed: 2, view: 'q', flip: true, sit: 1, rawArms: true, aR: -1.32, bendR: .22 };
    const rockTop = [rk[0] + 1.8 * U, rk[1] - .9 * U],   // the pat lands on the rock's near shoulder: his arm reaches it without stretching across his mask
      pat = t > 8.55 && t < 9.05 ? Math.max(0, Math.sin((t - 8.55) * TAU * 2)) : 0;
    if (t < 9.1) {
      const reach = ease(seg(t, 8.3, 8.55)) * (1 - ease(seg(t, 9.0, 9.1)));
      const tgt = [lerp(700 - 1.2 * U, rockTop[0], reach), lerp(1400 - 4.4 * U, rockTop[1] - 40 * pat, reach)];
      Object.assign(Cb, reachArm(U, Cb, 'L', ...toBody(700, 1400, U, Cb, tgt[0], tgt[1])));
      geared(700, 1400, U, { ...Cb, noGun: true, lap: lapAK });
    } else {
      const up = ease(seg(t, 9.15, 9.45));
      Object.assign(Cb, reachArm(U, Cb, 'L', ...toBody(700, 1400, U, Cb, lerp(700 + .25 * U, 700 - .6 * U, up), lerp(1400 - SEAT - .7 * U, 1400 - 5.8 * U, up))));
      geared(700, 1400, U, { ...Cb, gunFlip: true, gunRot: lerp(.04, -.02, up) });
      const [mx, my] = [700 - .6 * U + 1.0 * U, 1400 - 5.8 * U - .55 * U];   // a glint on top of the receiver
      if (up > .9) { const g = Math.max(0, Math.sin((t - 9.45) * 9)); glow(mx, my, 70, '#FFF6D8', g); boilSeed('aksparkle'); paint(starPts(mx, my, 26 * g, .28, 4), { wash: '#FFFBEA', ink: null }); }
    }
    spawnling(330, 1400, U, No);
    if (t > 8.7) emote('heart', rockTop[0] - .3 * U, rockTop[1] - 2.2 * U, U * .55, seg(t, 8.7, 8.85) * (1 - seg(t, 9.05, 9.2)), t - 8.7);
    campfire(540, 1405, 1.05, t, { fire: 1, glow: .55 });
    grade('#E9785A', 34);
    glow(540, 1330, 330, '#FFB04A', .4);
    camEnd();
  }
  // Lying on his back: rot ±π/2 lays a survivor down around his feet, head on the sand.
  const lying = (x, y, u, headDir, o) => survivor(x, y - 2.3 * u, u, { ...o, view: 'side', rot: headDir < 0 ? -Math.PI / 2 : Math.PI / 2, flip: headDir > 0, noShadow: true });
  // a flower tucked behind his ear: its bloom at body point (bx, by) (in u), the short stem down behind the ear
  const earFlower = (u, bx, by, s, r, key) => { const L = 48 * s * .45; flower(bx * u - L * Math.sin(r), by * u + L * Math.cos(r), s, { key, rot: r, stem: .45 }); };
  const CHAD_GEAR = { gear: { mask: 'metal', chest: 'metal', kilt: 'roadsign', hoodie: true, hoodieCol: '#5F6B52', pants: true, boots: true, gloves: true }, skin: 'tan', hair: 'buzz', hairCol: 'dark' };
  // 2C night: stargazing from behind them on the log. A shooting star lands in a constellation shaped exactly like his
  // rock; he holds his rock up beside it to compare. The Chad stretches.
  const ROCKSTARS = [[-.25, -1.05], [.85, -1.3], [1.7, -.75], [1.85, .25], [1.15, .95], [.1, .9], [-.45, .2]];
  function s2c(t, lt) {
    camBegin(540, 960, 1);
    rustSky(t, { tod: 2, horizon: 1040, sun: [880, 210], clouds: false });
    seaBeach(t, { horizon: 1040, shore: 1180, tod: 2 });
    const cs = 120, ox = 250, oy = 470;
    shootingStar(760, 230, ox + .7 * cs, oy - .1 * cs, seg(t, 10.45, 10.9));
    const tr = seg(t, 10.85, 11.55) * ROCKSTARS.length;
    ROCKSTARS.forEach(([a, b], i) => {
      const k = clamp(tr - i), x = ox + a * cs, y = oy + b * cs;
      if (k > 0) { glow(x, y, 46, '#FFF6D0', .9 * k); boilSeed('cstar' + i); paint(starPts(x, y, 10 + 6 * k, .4, 4), { wash: '#FFFBEA', ink: null }); }
      if (k >= 1 && i > 0) { const [pa, pb] = ROCKSTARS[i - 1]; inkLine([[ox + pa * cs, oy + pb * cs], [x, y]], 1.2, '#E8E4FF', 'inkfine', 0); }
    });
    if (tr >= ROCKSTARS.length) { inkLine([[ox + ROCKSTARS[6][0] * cs, oy + ROCKSTARS[6][1] * cs], [ox + ROCKSTARS[0][0] * cs, oy + ROCKSTARS[0][1] * cs]], 1.2, '#E8E4FF', 'inkfine', 0); const rx = ox + .55 * cs, ry = oy + .75 * cs; glow(rx, ry, 50, '#FF6A5A', 1); boilSeed('redstar'); paint(starPts(rx, ry, 15, .4, 4), { wash: '#FF9A8A', ink: null }); }   // and a red star where the smear is
    campfire(560, 1290, .8, t, { fire: .45 });
    log(550, 1600, 640, 120, 2);
    // both from behind, seated into the log: the Naked (left) raises his rock toward the stars; the Chad stretches up
    const point = ease(seg(t, 10.7, 10.95)) * (1 - ease(seg(t, 11.85, 12)));
    spawnling(400, 1580, 52, { ...feel('happy', t), boilKey: NK, seed: 1, view: 'back', sit: 1, prop: 'none', rawArms: true, aL: lerp(-1.3, 1.2, point), bendL: lerp(.22, -.15, point), aR: -1.25, bendR: .3, rot: -.05 * point,
      handL: (u, sw) => { push(); scale(-1, 1); rockProp(u, sw); pop(); } });   // his rock, in hand all along
    const yawn = ease(seg(t, 11.45, 11.75));   // held through the cut
    const st = k => k < .5 ? { a: lerp(-1.25, -.75, k * 2), b: lerp(.3, 2.1, k * 2) } : { a: lerp(-.75, 1.45, k * 2 - 1), b: lerp(2.1, 0, k * 2 - 1) }, S2 = st(yawn);
    survivor(710, 1560, 52, { ...feel('happy', t, { emote: null }), ...CHAD_GEAR, boilKey: CH, seed: 2, view: 'back', sit: 1, rawArms: true, aL: S2.a, bendL: S2.b, aR: S2.a, bendR: S2.b, sy: 1 + .05 * yawn });
    grade('#1A2348', 58);
    glow(560, 1240, 300, '#FF8A3A', .55);
    camEnd();
  }

  // ---------- the night camp, seen from the front (2D, 3A–3C, 4A) ----------
  // Inland, behind the dunes. The Chad dozed off sitting at the left end of the log, hugging the empty can. His AK lies
  // along the log top, barrel toward him, stock toward the right end where the Naked sat.
  const LOGX = 520, LOGY = 1420, LOGD = 112, CX = 205, CU = 48;
  const chadHead = () => [CX + .25 * CU, LOGY - (10.85 - 2.05) * CU];
  // The gun's origin on the log, and its grip. A little smaller than in his hands (it's further back, on the log) and
  // placed so its muzzle stops short of the sleeping Chad and its stock short of the Naked's knees (it ran through the
  // Chad's hands and kilt, and its stock clipped the Naked).
  const AKO = [532, LOGY - LOGD - 8], GRIP = [544, LOGY - LOGD - 4], AKU = CU * .85;
  function nightCamp(t, tod = 2, o = {}) {
    const dawn = tod < 1.5;
    rustSky(t, { tod, horizon: 1080, sun: dawn ? [900, 1060] : [860, 240], clouds: dawn });
    const HILL = through([[-200, 1120], [180, 1050], [520, 1085], [860, 1030], [1280, 1090]], 8), gcol = dawn ? '#B98E7E' : '#3E4160';
    for (let c = 0; c + 1 < HILL.length; c += 4) {   // the hill in narrow ink-free strips down to the flat ground
      const top = HILL.slice(c, Math.min(HILL.length, c + 5)); staticSeed('nighthill' + c);
      paint([...top, [top[top.length - 1][0], 1380], [top[0][0], 1380]], { wash: gcol, ink: null });
    }
    staticSeed('nightground'); paint(rectPts(-200, 1360, 1480, 800), { wash: gcol, ink: null });
    if (!o.noInk) for (let c = 0; c + 1 < HILL.length; c += 6) { boilSeed('hillline' + c); inkLine(HILL.slice(c, Math.min(HILL.length, c + 7)), 1.2, PAL.ink, 'ink', .4); }
    for (const [px, ps] of [[40, 1.1], [930, 1.25], [1040, .9]]) pineTree(px, 1090, ps, { tod });
    grassTufts(-100, 1180, 1440, t, 14, dawn ? '#6E7A50' : '#2A3A44');
  }
  const logAK = () => { boilSeed('logak'); push(); translate(AKO[0], AKO[1]); scale(-1, 1); akProp(AKU, 2.3, 0); pop(); };
  const camLog = (tod = 2) => log(LOGX, LOGY, 700, LOGD, tod);
  function sleeper(t, o = {}) {
    const br = Math.sin((t - 12) * 2.6) * .5 + .5;   // breathing
    const C = { ...feel('sleepy', t, { emote: null }), ...CHAD_GEAR, eyes: 'happy', boilKey: CH, seed: 2, view: 'front', sit: 1, rot: .1, rawArms: true, sy: 1 + .015 * br, ...o };
    Object.assign(C, reachArm(CU, C, 'L', .15 * CU, -5.7 * CU + 2.05 * CU), reachArm(CU, C, 'R', -.35 * CU, -6.1 * CU + 2.05 * CU));
    C.handR = (u, sw) => beanCan(u * .9, sw, { open: true, rot: .25 });   // in the hand laid over the other, so the hugged can shows (in the under hand it clipped under the other forearm)
    if (o.flower) C.draw = (u, sw) => earFlower(u, 2.25, -11.35 + 2.05, .8, .5, 'gift');   // tucked behind his ear
    survivor(CX, LOGY, CU, C);
    return C;
  }
  // the wide shots' snore: just the Zzz (a sleep bubble under the mask's flat bottom edge read as a white ball stuck on
  // his chest at this size; the close-up, 3B, keeps its big bubble)
  const snore = (t, s = 1) => { const [hx, hy] = chadHead(); emote('zzz', hx - 70, hy - 150, 34 * s, 1, t); };
  const gunGlint = (t, t0) => { const g = t > t0 ? Math.max(0, Math.sin((t - t0) * 5)) : 0; if (g > .05) { const gx = AKO[0] - 20, gy = AKO[1] - 14; glow(gx, gy, 70, '#FFF2C4', g); boilSeed('akglint'); paint(starPts(gx, gy, 20 * g, .28, 4), { wash: '#FFFBEA', ink: null }); } };
  // 2D: he looks at the sleeping Chad, then at the AK on the log (a glint), and his eyes go sly. Push in.
  function s2d(t, lt) {
    const push_ = ease(seg(t, 12.9, 14));
    camBegin(lerp(540, 640, push_), lerp(1150, 1130, push_), lerp(1.2, 1.55, push_));
    nightCamp(t);
    camLog();
    sleeper(t);
    snore(t);
    logAK();
    const look = t < 12.9 ? { lookX: .9, lookY: .1 } : { lookX: .7, lookY: .9 };
    const N = emotions(t, [[12, 'neutral'], [13.35, 'mischief', { eyes: 'sly', mouth: 'smirk' }]]);
    spawnling(805, LOGY, 48, { ...N, ...look, boilKey: NK, seed: 1, view: 'q', flip: true, sit: 1, prop: 'none', rawArms: true, aL: -1.15, bendL: .3, aR: -1.32, bendR: .3 });
    gunGlint(t, 12.95);
    grade('#1A2348', 50);
    camEnd();
  }

  // ---------- S3: the choice (14–22) ----------
  // 3A: he slips behind the log and creeps toward the gun; his open, trembling hand hovers over the grip, not touching
  function s3a(t, lt) {
    camBegin(520, 1170, 1.3);
    nightCamp(t);
    const k = ease(seg(t, 14, 15.1)), nx = lerp(770, 640, k);
    const N = { ...feel('nervous', t, { emote: null }), eyes: 'look', lookX: .7, lookY: .8, boilKey: NK, seed: 1, view: 'q', flip: true, crouch: .35, walk: k < 1 ? (t - 14) * 1.4 : undefined, rot: -.12 * k, prop: 'none', rawArms: true, aL: -1.2, bendL: .4, farFront: true, openR: true };
    const hover = 128 - 18 * ease(seg(t, 15.1, 15.6)), tremble = t > 15.1 ? 5 * Math.sin(t * 40) : 0;   // fingertips stay ~40 px above the receiver
    // the hand comes out toward the grip as he arrives (reaching for it the whole walk, the arm stretched into a long tube)
    const R = reachArm(48, N, 'R', ...toBody(nx, LOGY - 30, 48, N, GRIP[0] + 10 + tremble, GRIP[1] - hover)), rk = ease(seg(t, 14.55, 15.1));
    Object.assign(N, { aR: lerp(-1.2, R.aR, rk), bendR: lerp(.35, R.bendR, rk), armKR: lerp(1, R.armKR, rk) });
    spawnling(nx, LOGY - 30, 48, N);   // behind the log: the log and the gun are drawn in front of him
    camLog();
    sleeper(t);
    snore(t, .8);
    logAK();
    gunGlint(t, 15.2);
    grade('#1A2348', 50);
    camEnd();
  }
  // 3B: close on the sleeping Chad: happy shut eyes in the mask, the can hugged, a Zzz
  function s3b(t, lt) {
    const [hx, hy] = chadHead();
    camBegin(hx - 10, hy + 130, 2.7);
    nightCamp(t);
    camLog();
    sleeper(t);
    // no sleep bubble: under the facemask there's no nose or mouth for it to come from (at the mask's bottom edge it
    // read as a white ball stuck on his chest), so the snore is a bigger Zzz
    emote('zzz', hx - 125, hy - 15, 36, 1, t);
    grade('#1A2348', 44); glow(hx, hy, 240, '#FFB46A', .2);
    camEnd();
  }
  // 3C: he kneels in front of the log beside the sleeping Chad. His face softens. He picks a little flower growing at
  // the foot of the log, stands, tucks it behind the Chad's ear, and pats his shoulder twice. Hearts.
  function s3c(t, lt) {
    camBegin(470, 1230, 1.45);
    nightCamp(t);
    camLog();
    const NXc = 575, NYc = 1490, placed = t >= 18.05;
    const [hx, hy] = chadHead(), cr = .1, wp = (bx, by) => [CX + bx * Math.cos(cr) - by * Math.sin(cr), LOGY + bx * Math.sin(cr) + by * Math.cos(cr)];   // the sleeper's body → world
    const ear = wp(2.25 * CU, (-11.35 + 2.05) * CU), shoulder = wp(1.9 * CU, (-7.95 + 2.05) * CU);
    sleeper(t, { flower: placed });
    snore(t, .8);
    logAK();
    const fl = [442, 1462], bloomY = fl[1] - 48 * .7 * 1.4;   // the flower growing in the sand in front of his knees
    const N = emotions(t, [[17, 'nervous', { emote: null }], [17.3, 'hopeful', { emote: 'hearts' }]], { take: 0 });
    const rise = ease(seg(t, 17.65, 17.9)), bow = ease(seg(t, 17.05, 17.3)) * (1 - ease(seg(t, 17.5, 17.65)));
    const No = { ...N, boilKey: NK, seed: 1, view: 'q', flip: true, sit: .8 * (1 - rise), crouch: .2 * (1 - rise), rot: -.07 * bow, prop: 'none', rawArms: true, aL: -1.25, bendL: .3, farFront: true, openR: t >= 18.1 && t < 18.75,
      lookX: t < 17.6 ? .6 : .9, lookY: t < 17.6 ? .9 : .1 };
    const pats = t > 18.15 && t < 18.65 ? Math.abs(Math.sin((t - 18.15) * TAU * 2)) : 0;
    const path = [[17.0, [NXc - 60, 1330]], [17.3, [fl[0] + 8, bloomY + 4]], [17.5, [fl[0] + 8, bloomY + 4]], [17.68, [NXc - 90, 1235]], [17.95, [ear[0] + 26, ear[1] + 6]], [18.05, [ear[0] + 16, ear[1] + 4]], [18.15, [shoulder[0] + 6, shoulder[1] + 16]], [18.65, [shoulder[0] + 6, shoulder[1] + 16]], [18.9, [NXc - 60, 1250]]];
    const [px, py] = kf(t, path);
    Object.assign(No, reachArm(48, No, 'R', ...toBody(NXc, NYc, 48, No, px, py - 26 * pats)));
    if (t >= 17.5 && t < 18.05) No.handR = (u, sw) => flower(.15 * u, .35 * u, .6, { key: 'held', rot: .15, stem: .8 });
    No.emoteDy = 2.4;   // the hearts sit lower, clear of the top band
    spawnling(NXc, NYc, 48, No);
    if (t < 17.5) flower(fl[0], fl[1], .7, { key: 'pick', stem: 1.4 });   // in the open, in front of his knees
    if (t >= 17.5 && t < 17.85) puff(fl[0], fl[1] - 6, 16, t - 17.5, { col: '#B9B2C8', key: 'pickpuff', n: 4, life: .35, noInk: true });
    grade('#1A2348', 48); glow(hx, hy, 260, '#FFB46A', .15);
    camEnd();
  }
  // 3D dawn: he walks off along the beach toward the sunrise, whistling, swinging his rock; far behind him the Chad
  // still sleeps on his log, hugging the can, the flower on his chest
  const dawnSet = (t, hz = 1000) => { rustSky(t, { tod: .72, horizon: hz, sun: [930, hz - 15] }); seaBeach(t, { horizon: hz, shore: hz + 130, tod: .72 }); };
  function s3d(t, lt) {
    camBegin(540, 960, 1);
    dawnSet(t);
    pineTree(70, 1250, .85, { tod: .72 });
    log(200, 1262, 230, 42, .72);
    survivor(170, 1262, 19, { ...feel('sleepy', t, { emote: null }), ...CHAD_GEAR, eyes: 'happy', boilKey: CH, seed: 2, view: 'front', sit: 1, rot: .1, rawArms: true, aL: -.55, bendL: 1.9, aR: -.6, bendR: 1.8,
      handL: (u, sw) => beanCan(u * .9, sw, { open: true, rot: -.3 }), draw: (u, sw) => earFlower(u, 2.25, -11.35 + 2.05, .36, .5, 'gift3d') });
    emote('zzz', 200, 1020, 16, 1, t);
    const k = seg(t, 19, 22), nx = lerp(460, 760, k), ph = (t - 19) * 1.7;
    spawnling(nx, 1470, 46, { ...feel('happy', t, { emote: null }), boilKey: NK, seed: 1, view: 'q', walk: ph, dy: -.25 * Math.pow(Math.sin(ph * Math.PI), 2), rawArms: true, aL: -1.0 + .5 * Math.sin(ph * Math.PI), bendL: .3, aR: -1.2 - .3 * Math.sin(ph * Math.PI), bendR: .3 });
    emote('music', nx - 175, 1470 - 16.4 * 46, 24, 1, t);   // the notes float up-left, clear of his head
    grade('#F2A27A', 24); glow(930, 985, 380, '#FFC488', .5);
    camEnd();
  }

  // ---------- S4: Rust. (22–28) ----------
  // 4A: dawn, extreme close-up on the Chad's mask: one eye snaps open (22.4), a sharp glint on it, and it narrows
  function s4a(t, lt) {
    const [hx, hy] = chadHead();
    camBegin(hx + 40, hy + 10, 3.2);
    nightCamp(t, .72, { noInk: true });
    camLog(.72);
    const eyes = t < 22.4 ? 'happy' : t < 22.75 ? ['happy', 'wide'] : ['happy', 'angry'];
    sleeper(t, { eyes, flower: true });
    const ex = hx + .85 * CU + 4, ey = hy - .2 * CU;   // his (viewer's) right eye slit
    if (t > 22.4 && t < 22.62) { const g = 1 - seg(t, 22.4, 22.62); glow(ex, ey, 40, '#FFFBEA', g); boilSeed('eyeglint'); paint(starPts(ex + 8, ey - 8, 26 * g, .2, 4), { wash: '#FFFDF2', ink: null }); }
    grade('#F2A27A', 22); glow(hx - 60, hy - 40, 220, '#FFC488', .3);
    camEnd();
  }
  // 4B–4C: dawn, wide. The Chad on his log in the left foreground raises his AK, a little upward, at the tiny Naked
  // whistling far down the beach. BANG (24.5): a flash of light, the note pops away from his head, he tips over a dune.
  function s4b(t, lt) {
    camBegin(540, 960, 1);
    dawnSet(t, 820);
    const shot = t >= 24.5, tip = seg(t, 24.55, 24.72), FX = 840, FY = 1002, fu = 16;
    // far down the beach he stands just behind a dune, whistling; shot in the back, he tips forward over it (4 frames)
    // and drops out of sight behind it
    if (t < 24.74) spawnling(FX + 22 * seg(t, 23, 24.5), FY, fu, { ...feel('happy', t, { emote: shot ? null : 'music' }), boilKey: NK, seed: 1, view: 'q', walk: shot ? undefined : (t - 19) * 1.7, rot: 1.45 * easeIn(tip), dy: 1.6 * easeIn(tip) + 1.8 * easeIn(seg(t, 24.7, 24.8)), prop: shot ? 'none' : 'rock' });   // ...and sinks behind the crest
    boilSeed('farDune');   // the dune: a soft mound with a lit crest and a shaded face; only its crest is inked
    paint([[560, 1080], [700, 1060], [900, 1058], [1120, 1076], [1120, 1100], [560, 1100]], { wash: '#B98F68', washOp: 90, ink: null, curv: .5 });   // its shadow on the beach
    paint([[590, 1068], [690, 1016], [800, 990], [920, 994], [1040, 1030], [1120, 1066], [1120, 1078], [590, 1080]], { wash: '#E2BE8C', ink: null, curv: .5 });
    paint([[660, 1046], [770, 1024], [900, 1025], [1040, 1046], [1090, 1068], [640, 1072]], { wash: '#C99C6A', washOp: 170, ink: null, curv: .5 });   // the shaded face toward us
    paint([[690, 1018], [800, 993], [915, 997], [860, 1009], [750, 1013]], { wash: '#FBEACB', ink: null, curv: .5 });   // the crest, lit from behind
    inkLine([[690, 1017], [800, 991], [920, 995], [985, 1009]], .6, '#B98E5E', 'ink', .4);   // only the lit crest, in a sand shade (a dark full-length line read as a stick)
    for (const [gx, gs] of [[720, 1], [940, .8], [985, 1.1]]) { boilSeed('dunegrass' + gx); const gy = gx < 800 ? 1012 : 1000 + (gx - 920) * .35; for (let i = -2; i <= 2; i++) inkLine([[gx + i * 4, gy], [gx + i * 7 * gs, gy - (12 + 5 * (2 - Math.abs(i))) * gs]], .8, '#7A7A4A', 'ink', .3); }
    if (shot) { notePop(FX + 62, FY - 15.8 * fu, 1.1, t - 24.5); puff(FX + 12, FY - 6, 24, t - 24.6, { col: '#F2DDB8', key: 'sand' }); }
    if (t > 24.55) { const k = seg(t, 24.55, 25), p = arcPt([FX + 12, FY - 3 * fu], [FX + 66, FY + 26], 80, k); if (k < 1) { boilSeed('flyrock'); push(); translate(p[0], p[1]); rotate(k * 9); rockProp(11, 1); pop(); } }
    // the Chad, close in the left foreground (his cap runs off the frame edge): wakes, raises the AK (23.3–24.1),
    // aims a little up the beach at the far Naked, fires; the muzzle stops well short of him
    const CXb = 120, CYb = 1330, CUb = 56;
    log(CXb + 90, CYb, 480, 128, .72);
    const aim = ease(seg(t, 23.3, 24.1)), kick = shot ? Math.exp(-(t - 24.5) * 10) : 0;
    const C = { ...feel('determined', t, { emote: null }), eyes: 'angry', ...CHAD_GEAR, boilKey: CH, seed: 2, view: 'side', sit: 1, rawArms: true, aL: lerp(-1.1, .05, aim) + .25 * kick, bendL: lerp(.6, .1, aim), aR: -1.2, bendR: .3, gunRot: lerp(1.1, -.16, aim) - .2 * kick, twoHand: aim > .7, fire: shot ? .55 * clamp(1 - (t - 24.5) * 6) : 0,
      draw: (u, sw) => earFlower(u, -.95, -11.0 + 2.05, .85, -.35, 'gift4b') };
    geared(CXb, CYb, CUb, C);
    grade('#F2A27A', 20);
    camEnd();
    if (shot) flash(.32 * Math.exp(-(t - 24.5) * 14), '#FFF1C8');
  }
  // 4D: cut to the morning beach, the opening composition. He respawns lying in the sand (25.0), sits up in profile,
  // rubs an eye, takes his rock, gets up — and the Chad walks in from the right, AK raised, the flower in his strap
  // (a sparkle catches it at 26.9). Freeze, "!" (27.2): frame 1 again.
  function s4d(t, lt) {
    camBegin(540, 1080, 1);
    beach(t, 0);
    const rockAt = [NX - 1.45 * U, G - .3 * U];
    if (t < 26.35) {   // waking up sitting on the sand, legs out; a knuckle rubs one scrunched eye; he reaches back for
      // his rock (25.95–26.1) and pushes himself up through a crouch (26.1–26.35)
      const rub = t > 25.45 && t < 25.95, up = ease(seg(t, 26.1, 26.35)), grabbed = t >= 26.1;
      const Ns = { ...feel('sleepy', t, { emote: null }), eyes: rub ? 'squeeze' : t < 25.95 ? 'closed' : 'normal', boilKey: NK, seed: 1, view: 'side', sit: 1 - up, legsOut: true, dy: 2.3 * (1 - up), crouch: .5 * Math.sin(up * Math.PI), rawArms: true, aL: -1.0, bendL: .4, aR: lerp(-1.0, -1.25, up), bendR: .4, prop: 'none', sq: .06 * Math.sin(clamp((t - 25.3) * 3) * Math.PI) };
      if (rub) {   // a solid fist, knuckles up, half over the eye, rubbing on twos
        Ns.onFace = 'L';   // on the eye on purpose (the rig otherwise keeps hands off the face)
        Object.assign(Ns, reachArm(U, Ns, 'L', 1.9 * U + 6 * Math.sin(Math.floor(t * 12) * 2.1), -10.85 * U + 2.05 * U + .35 * U));
        Ns.handL = (u, sw) => { paint(ellPts(0, 0, .56 * u, .56 * u, 14), { wash: SKIN_TONES.light.dk, washOp: 120, ink: null }); for (const k of [-1, 0, 1]) inkLine(Array.from({ length: 5 }, (_, i) => { const a = Math.PI + i / 4 * Math.PI; return [k * .3 * u + Math.cos(a) * .15 * u, -.4 * u + Math.sin(a) * .15 * u]; }), sw * .5, PAL.ink, 'ink', 0); };
      } else if (t >= 25.95) {   // reach back for the rock, then carry it up
        const reach = reachArm(U, Ns, 'L', ...toBody(NX, G, U, Ns, rockAt[0] + .2 * U, rockAt[1] - .4 * U));
        Object.assign(Ns, grabbed ? { aL: lerp(reach.aL, -1.32, up), bendL: lerp(reach.bendL, .25, up), armKL: lerp(reach.armKL, 1, up) } : reach);
        if (grabbed) Ns.hold = { L: 'rock' };
      }
      spawnling(NX, G, U, Ns);
    } else {
      const N = emotions(t, [[26.35, 'neutral'], [27.2, 'surprised', { emote: '!' }]], { take: .45 });
      spawnling(NX, G, U, { ...N, boilKey: NK, seed: 1, view: 'q', walk: t < 26.5 ? undefined : .12 * seg(t, 26.5, 26.85), emoteDx: .9, emoteDy: 2.6, rawArms: true, aL: lerp(-1.32, -1.2, seg(t, 26.9, 27.2)), bendL: .25, aR: -1.32, bendR: .22, prop: 'none', hold: { L: 'rock' } });
    }
    if (t < 26.1) { boilSeed('respawnrock'); push(); translate(rockAt[0], rockAt[1]); rotate(3.5); rockProp(U, 2.2); pop(); }
    if (t >= 25.3 && t < 25.7) respawn(NX + .3 * U, G - 4.6 * U, 1.2, (t - 25.3) * 3);   // on his chest as the sleeping bag lifts, gone by 25.7
    const cin = ease(seg(t, 26.5, 26.95)), cx = lerp(1480, CXA, cin);   // the gun enters first; nothing in frame before 26.5
    const aimPose = reachArm(U, { view: 'q', rawArms: true }, 'L', 1.75 * U, -6.95 * U);
    geared(cx, G, U, { ...feel('determined', t), boilKey: CH, seed: 2, view: 'q', flip: true, walk: seg(t, 26.5, 26.95), rawArms: true, ...aimPose, aR: -1.32, bendR: .22, gunRot: .03, twoHand: true,
      draw: (u, sw) => earFlower(u, -1.75, -11.7, 1.0, -.45, 'ear4d') });   // his gift, still behind his ear
    if (t > 26.9 && t < 27.2) { const g = Math.sin(seg(t, 26.9, 27.2) * Math.PI), fx = CXA + 1.75 * U, fy = G - 11.7 * U; glow(fx, fy, 50, '#FFF6D8', g); boilSeed('flowerspark'); paint(starPts(fx + 16, fy - 16, 18 * g, .25, 4), { wash: '#FFFDF2', ink: null }); }
    camEnd();
  }

  shots([[0, s1], [6, s2a], [8, s2b], [10, s2c], [12, s2d], [14, s3a], [16, s3b], [17, s3c], [19, s3d], [22, s4a], [23, s4b], [25, s4d]]);
  // sunset to night: his rock tumbles at the lens; the respawn: the sleeping bag rolls down and up (he wakes as it lifts)
  transitions([[10.0, 'rockSpin', { in: .4 }], [25.0, 'sleepingBag', { dur: .6, in: .35 }]]);
})();
