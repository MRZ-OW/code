// video.js: "Support Main", the shots. See STORYBOARD.md for the plan and the reads; times here are video seconds.
(() => {
  // ---------- shared helpers ----------
  // Whip-pan smear (screen space): broad smear bands in the scene's colours that cover the frame as k → 1, with fine
  // dry-brush streaks on top. Cut under full cover. k 0..1 strength, dir ±1, cols = the scene's palette.
  const WHIP_SPAWN = ['#5B7A88', '#C9DDE2', '#3E5C6B', '#F2C14E'], WHIP_STREET = ['#E8C48E', '#8FD0DA', '#FFF5E2', '#C4683F'];
  function whipLines(k, dir = 1, cols = WHIP_STREET) {
    if (k <= .02) return;
    const n = 11;
    for (let i = 0; i < n; i++) {
      boilSeed('whipb' + i);
      const y = (i + .5) / n * H + (hash(i + 1) - .5) * 30, h = H / n * (.3 + .85 * k) * (.7 + .5 * hash(i + 4));
      const x0 = -150 + (1 - k) * W * .7 * hash(i + 2), x1 = W + 150 - (1 - k) * W * .7 * hash(i + 5);
      if (x1 - x0 < 40) continue;
      paint([[x0, y - h / 2 + jit(4)], [x1, y - h / 2 + jit(4)], [x1 + 70 * dir, y + jit(4)], [x1, y + h / 2 + jit(4)], [x0, y + h / 2 + jit(4)], [x0 - 70 * dir, y + jit(4)]], { wash: cols[i % cols.length], washOp: 255 * clamp(k * 1.4 - .15), ink: null });
    }
    for (let i = 0; i < 16; i++) {
      boilSeed('whip' + i);
      const y = (i + .5) / 16 * H + (hash(i) - .5) * 40, L = (500 + 900 * hash(i + 3)) * k, x = hash(i + 7) * W;
      inkLine([[x - dir * L / 2, y], [x + dir * L / 2, y + (hash(i + 9) - .5) * 8]], 3 + 5 * k, i % 3 ? PAL.cream : mixCol(cols[0], PAL.ink, .4), 'dry', .2);
    }
  }
  // A puff of dust where a runner leaves. age in s.
  function dust(x, y, age, s = 1) {
    if (age < 0 || age > .8) return;
    const k = age / .8;
    boilSeed('dust' + Math.round(x));
    for (let i = 0; i < 5; i++) { const dx = (i - 2) * 34 * s * (.5 + k), r = (26 + 18 * hash(i)) * s * (.5 + k); paint(ellPts(x + dx, y - r * .6 - k * 30 * s, r, r * .7, 14, 2), { wash: '#D9C8AE', washOp: 220 * (1 - k), ink: null }); }
  }
  const flapOf = (t, rate = 9, amt = .3) => Math.sin(t * TAU * rate / 4) * amt;

  // ---------- A · spawn room (0–6) ----------
  // The team waits by the gate; three lamps count down; the gate flies up; everyone dashes out and leaves Mercy behind.
  const A = { G: 905, mercy: 330, genji: 610, tracer: 870, rein: 1120, gateOpen: 3.5 };
  function shotSpawn(t, lt, dur) {
    const G = A.G, lamps = lt < 2 ? 0 : lt < 2.5 ? 1 : lt < 3 ? 2 : 3;
    const gate = seg(lt, A.gateOpen, A.gateOpen + .28);
    // Mercy: polishing its staff, then alone, then flapping off after them
    const mFly = seg(lt, 5.0, 5.95), mx = lerp(A.mercy, 1900, easeIn(mFly));
    const shake = lt > 3.25 && lt < 3.5 ? shakeXY(t, 4) : lt >= 3.5 ? shakeXY(t, 12 * Math.exp(-(lt - 3.5) * 5)) : [0, 0];
    const alone = seg(lt, 4.1, 4.5), follow = seg(lt, 5.0, 5.6);
    const cx = lerp(lerp(lerp(900, 930, seg(lt, 0, 3.5)), A.mercy + 160, ease(alone)), mx + 260, ease(follow)) + 500 * easeIn(seg(lt, 5.6, 6.0));
    const cy = lerp(lerp(600, 700, ease(alone)), 640, ease(follow));
    const zoom = lerp(lerp(1.16 + .04 * seg(lt, 0, 3.5), 1.55, ease(alone)), 1.25, ease(follow));
    camBegin(cx + shake[0], cy + shake[1], zoom);
    spawnRoom(t, { lamps, gate });

    // the dashers: each runs right out through the gate with a smear and a dust puff
    const dash = (t0, x0, u) => { const k = seg(lt, t0, t0 + .45); return { x: lerp(x0, 2300, easeIn(k)), k, gone: k >= 1 }; };
    const look = lt > 1.95 ? { lookX: .9, lookY: -.5 } : {};
    // Genji: bounces on the beat, cool
    const gd = dash(3.9, A.genji, 21);
    if (!gd.gone) genji(gd.x, G, 25, { ...move('hop', t, 2), ...feel('cool', t), emote: null, eyes: 'normal', view: 'q', ...look, ...(gd.k > 0 ? { view: 'side', walk: lt * 6, smear: .8, smearDir: 1, dy: -.5 } : {}) });
    dust(A.genji, G, lt - 3.9);
    // Tracer: blinks back and forth on every beat until the lamps, then faces the gate
    const td = dash(3.75, A.tracer, 21), bi = beatN(t), side = bi % 2 ? 1 : 0;
    const tx = lt < 1.9 ? A.tracer + (side ? 70 : -70) : A.tracer;
    if (lt < 1.9) { const age = (bpOf(t) - bi) * BEAT; blinkTrail(A.tracer + (side ? -70 : 70), G, tx, G, 25, age); }
    if (!td.gone) tracer(td.k > 0 ? td.x : tx, G, 25, { ...feel('playful', t), emote: null, view: 'q', flip: lt < 1.9 && side === 0, ...look, ...(td.k > 0 ? { view: 'side', walk: lt * 6, smear: .9, smearDir: 1 } : {}) });
    if (td.k > 0 && td.k < 1) blinkTrail(A.tracer, G, td.x, G, 25, (lt - 3.75) * .5);
    // Rein: stomps impatiently, hammer on the shoulder
    const rd = dash(3.6, A.rein, 27);
    if (!rd.gone) rein(rd.x, G, 31, { ...move('stomp', t, 1), ...feel('determined', t), view: 'q', aR: .9, hammer: -.6, ...look, ...(rd.k > 0 ? { view: 'side', walk: lt * 5, smear: .7, smearDir: 1, aL: .5 } : {}) });
    dust(A.rein, G, lt - 3.6, 1.3);
    // Mercy
    const mood = emotions(lt, [[0, 'happy', { lookX: .6, lookY: .4 }], [4.15, 'surprised', { lookX: .9 }], [4.5, 'nervous'], [4.95, 'determined']]);
    const crouch = lt > 4.8 && lt < 5.0 ? .2 * ease(seg(lt, 4.8, 5.0)) : 0;
    const flying = lt >= 5.0;
    const polish = lt < 4.1 ? Math.sin(lt * TAU * 2) * .25 : 0;
    const mo = { ...mood, view: 'q', aL: flying ? .4 : (lt < 4.1 ? .55 + polish : mood.aL ?? .4), aR: flying ? .8 : .1 + polish * .5,
      wing: flying ? .35 : .05, flap: flying ? flapOf(t, 12, .35) : 0, staffGlow: lt < 4.1 ? .35 + .3 * pulse(t) : .2,
      dy: (mood.dy || 0) - (flying ? 2.6 * easeOut(seg(lt, 5.0, 5.3)) + .4 * Math.sin(lt * 14) : 0), sq: (mood.sq || 0) + crouch,
      ...(flying ? { smear: .45 * seg(lt, 5.2, 5.6), smearDir: 1, rot: .12 } : {}) };
    if (lt < 4.1) mo.emote = 'music';
    mercy(mx, G, 25, mo);
    if (lt > 4.15 && lt < 4.9) { mo.lookX = Math.sin((lt - 4.15) * 9) > 0 ? .9 : -.9; }
    const mEye = toScreen(A.mercy, G - 4 * 25);
    camEnd();
    whipLines(easeIn(seg(lt, 5.55, 6.0)), 1, WHIP_SPAWN);
    if (lt < .5) iris(...mEye, lerp(0, 1500, easeIn(lt / .5)));
  }

  // ---------- B · main street, "I need healing" (6–16) ----------
  // Everyone runs ahead; one by one they call for healing, then all of them spam it. Mercy zips from one to the next,
  // heals them all — and Genji calls again at once. A bell tolls; the light turns; tilt up to the sun.
  const B = { t0: 6, G: 990, genji: [330, STREET.roof - 4], tracer: [1290, 1430], rein: 1680, mercy: 640,
    calls: { genji: 7.5, tracer: 8.5, rein: 9.0 }, healed: { tracer: 11.0, rein: 12.0, genji: 13.0 }, genji2: 13.5 };
  // Mercy's path in shot time: [t, x, y] keys, flown with ease (Guardian Angel zips are the fast bits)
  const B_PATH = [[0, -200, 640], [.8, 640, 990], [4.5, 640, 990], [4.95, 1120, 985], [5.5, 1120, 985], [5.95, 1470, 800], [6.5, 1470, 800], [6.95, 620, 560], [10, 620, 560]];
  function mercyPathB(lt) {
    let i = 0; while (i + 1 < B_PATH.length && lt >= B_PATH[i + 1][0]) i++;
    const a = B_PATH[i], b = B_PATH[Math.min(i + 1, B_PATH.length - 1)], k = b === a ? 1 : ease(seg(lt, a[0], b[0]));
    const moving = b !== a && lt > a[0] && lt < b[0] && (a[1] !== b[1] || a[2] !== b[2]);
    return { x: lerp(a[1], b[1], k), y: lerp(a[2], b[2], k) - (moving ? Math.sin(k * Math.PI) * 60 : 0), moving, dir: Math.sign(b[1] - a[1]) || 1, k };
  }
  function shotStreet(t, lt, dur) {
    const G = B.G, noon = .25 * seg(lt, 9.0, 10);
    const cam = kf(lt, [[0, [-200, 660, 1.0]], [.45, [990, 660, 1.0]], [4.5, [990, 660, 1.0]], [4.9, [1200, 740, 1.2]], [5.9, [1380, 740, 1.2]], [6.5, [1420, 720, 1.15]],
      [6.95, [560, 580, 1.15]], [7.6, [500, 560, 1.22]], [8.6, [600, 470, 1.85]], [9.1, [600, 470, 1.85]], [9.35, [640, 380, 1.5]], [10, [900, 0, 1.0]]]);
    camBegin(cam[0], cam[1], cam[2]);
    westSky(t, { noon, sun: [lerp(1700, 1560, seg(lt, 9, 10)), lerp(250, 120, seg(lt, 9, 10))] });
    street(t, { noon, arch: false });
    payload(960, STREET.rail, 1, t, {});

    const call = (name, t0, x, y, s, healAt) => {       // a "+" over a head: pops in at t0, pops off with a sparkle when healed
      if (lt < t0) return;
      if (healAt != null && lt >= healAt) { burst(x, y, 60, lt - healAt, '#FFE27A', 8, t0); return; }
      healCall(x, y, s, seg(lt, t0, t0 + .25), lt - t0);
    };
    const spam = (t0, x, y, s) => { const a = lt - t0; if (a < 0 || a > 1.1) return; healCall(x + 20 * Math.sin(a * 5), y - a * 160, s * (1 - a * .3), seg(a, 0, .2) * (1 - seg(a, .8, 1.1)), a); };

    // Genji, on the saloon roof: poses; calls at 7.5 (he's fine); healed 13.0; calls again at 13.5
    const [gx, gy] = B.genji;
    const gMood = emotions(lt, [[0, 'cool', { emote: null, eyes: 'normal' }], [1.4, 'playful', { emote: null }], [7.05, 'happy', { emote: null }], [7.45, 'playful', { emote: null }], [9.0, 'surprised', { lookX: 1, lookY: -.8, emote: null }]]);
    genji(gx, gy, 22, { ...gMood, view: 'q', aR: lt > 1.4 ? 1.3 : .2, eyes: gMood.eyes === 'normal' ? 'normal' : gMood.eyes });
    // Tracer: zips between two spots by the payload on every beat
    const bi = beatN(t), side = bi % 2, tx = B.tracer[side], age = (bpOf(t) - bi) * BEAT;
    const tHealed = lt >= B.healed.tracer - B.t0;
    if (!tHealed) blinkTrail(B.tracer[1 - side], G - 5, tx, G - 5, 24, age);
    const tPos = tHealed ? 1340 : tx;
    tracer(tPos, G - 5, 24, { ...(tHealed ? feel('happy', t) : feel('excited', t)), emote: null, view: 'q', flip: !tHealed && side === 0, ...(lt > 9.0 ? { view: 'q', flip: false, lookX: 1, lookY: -.6 } : {}) });
    // Rein: barrier up, facing right
    const rHealed = lt >= B.healed.rein - B.t0;
    barrier(1900, G - 20, 260, 330, t, seg(lt, .2, .7));
    rein(B.rein, G - 20, 30, { ...feel(rHealed ? 'proud' : 'determined', t), emote: null, view: 'q', aL: 1.0, aR: .9, hammer: -.7 });

    const ct = B.calls, h = B.healed;
    call('genji', ct.genji - B.t0, gx, gy - 22 * 11.5, 42, h.genji - B.t0);
    call('tracer', ct.tracer - B.t0, tPos, G - 5 - 24 * 11.5, 42, h.tracer - B.t0);
    call('rein', ct.rein - B.t0, B.rein, G - 20 - 30 * 12.8, 46, h.rein - B.t0);
    spam(3.5, gx, gy - 22 * 11.5, 36); spam(3.75, tPos, G - 5 - 24 * 11.5, 36); spam(4.0, B.rein, G - 20 - 30 * 12.8, 38); spam(4.25, gx, gy - 22 * 11.5, 36);
    spam(4.4, tPos, G - 5 - 24 * 11.5, 34); spam(4.6, B.rein, G - 20 - 30 * 12.8, 34);
    call('genji2', B.genji2 - B.t0, gx, gy - 22 * 11.5, 42, null);

    // Mercy: lands, watches the calls pile up, zips and heals, then gets the second call from Genji
    const p = mercyPathB(lt);
    const mood = emotions(lt, [[0, 'happy'], [2.0, 'neutral', { lookX: -.9, lookY: -.9 }], [2.5, 'neutral', { lookX: .9, lookY: -.4 }], [3.6, 'surprised', { lookX: .5, lookY: -.6 }],
      [4.2, 'nervous'], [4.5, 'determined'], [7.55, 'surprised', { lookX: -.9, lookY: -.3 }], [7.75, 'angry', { lookX: -.6 }], [8.4, 'bored', { lookX: -.4 }], [9.0, 'surprised', { lookX: .7, lookY: -.9 }]]);
    const inAir = lt < .8 || lt >= 5.5 || p.moving;
    const beamOn = (a) => lt >= a && lt < a + .5;
    const healing = beamOn(h.tracer - B.t0) || beamOn(h.rein - B.t0) || beamOn(h.genji - B.t0);
    const land = lt > .8 && lt < 1.3 ? .22 * Math.exp(-(lt - .8) * 8) * Math.cos((lt - .8) * 20) : 0;
    const flipM = p.moving ? p.dir < 0 : lt >= 6.95;
    const mo = { ...mood, view: 'q', flip: flipM, wing: inAir ? (p.moving ? .55 : .3) : .05, flap: inAir ? flapOf(t, 12, .3) : 0,
      aL: healing ? .9 : (p.moving ? .3 : mood.aL), aR: .3, staffGlow: healing ? 1 : .2, sq: (mood.sq || 0) + land,
      ...(p.moving ? { smear: .6 * Math.sin(p.k * Math.PI), smearDir: p.dir, rot: .15 * p.dir } : {}),
      dy: (mood.dy || 0) * (inAir ? .4 : 1) + (lt >= 6.95 ? Math.sin(lt * 5) * .3 : 0) };
    mercy(p.x, p.y, 24, mo);
    const head = staffHead(p.x, p.y, 24, mo);
    if (beamOn(h.tracer - B.t0)) healBeam(head[0], head[1], tPos, G - 5 - 24 * 4.5, t, seg(lt, h.tracer - B.t0, h.tracer - B.t0 + .12));
    if (beamOn(h.rein - B.t0)) healBeam(head[0], head[1], B.rein, G - 20 - 30 * 4.5, t, seg(lt, h.rein - B.t0, h.rein - B.t0 + .12));
    if (beamOn(h.genji - B.t0)) healBeam(head[0], head[1], gx, gy - 22 * 4.5, t, seg(lt, h.genji - B.t0, h.genji - B.t0 + .12));
    camEnd();
    whipLines(1 - easeOut(seg(lt, 0, .45)), 1, WHIP_STREET);
  }

  // ---------- C · High Noon (16–23.6) ----------
  // The sun climbs to the top of the sky and everything burns orange. The Cowboy on the water tower tips his hat.
  // Cut to the team: scared; dead-eye skulls lock on; Mercy dives behind the payload; BANG BANG BANG. Cut to the
  // Cowboy blowing the smoke off his barrel.
  const C = { t0: 16, G: 990, genji: 860, tracer: 1170, rein: 1460, mercy: 600, towerTop: 345, bang: [5.5, 6.0, 6.5] };
  const sunAt = lt => [lerp(1560, 980, ease(seg(lt, 0, 1.5))), lerp(120, -330, ease(seg(lt, 0, 1.5)))];
  function shotNoon(t, lt, dur) {
    const noon = lerp(.25, 1, ease(seg(lt, 0, 1.4))), ding = lt > 1.0 ? Math.exp(-(lt - 1.0) * 3) : 0;
    const cam = kf(lt, [[0, [900, 0, 1.0]], [1.5, [960, -110, 1.0]], [2.05, [2370, 300, 1.75]], [3.0, [2380, 290, 1.85]]], ease);
    camBegin(cam[0], cam[1], cam[2]);
    westSky(t, { noon, sun: sunAt(lt) });
    street(t, { noon, arch: false });
    const [sx, sy] = sunAt(lt);
    if (ding > .02) { glow(sx, sy, 420 * (1 + .5 * (1 - ding)), '#FFE7A0', ding); sparkle(sx, sy, 220, seg(lt, 1.0, 1.6)); }
    // the Cowboy, hat pulled down, then tipped up: a red glint
    const tip = ease(seg(lt, 2.05, 2.35)), glint = lt > 2.25 && lt < 2.75;
    cowboy(STREET.tower, C.towerTop, 24, { ...feel('cool', t), emote: null, view: 'q', flip: true, hatTip: tip, eyes: glint ? 'red' : 'narrow', aL: -.4, gunRot: 1.1, noShadow: true });
    if (glint) { const e = bodyToWorld(STREET.tower, C.towerTop, 24, { view: 'q', flip: true }, (1.5 + 2.5 * .74) * 24, -6 * 24); sparkle(e[0], e[1], 60, seg(lt, 2.25, 2.7), '#FFD0C0'); }
    camEnd();
  }
  // Team in front of the payload. KO = falls over backwards with x eyes.
  function koPose(lt, tb, u) {
    if (lt < tb) return {};
    const k = seg(lt, tb, tb + .4), a = lt - tb - .4, r = -Math.PI * ease(k);
    const settle = k >= 1 ? .2 * Math.exp(-a * 8) * Math.cos(a * 22) : 0;            // squash-bounce on landing
    return { ...feel('ko', lt), emote: null, rot: r, dy: -8 * ease(k) - 3.2 * Math.sin(k * Math.PI), sq: settle, aL: -.9 + .3 * Math.sin(lt * 9), aR: -.9 - .3 * Math.sin(lt * 9 + 1), walk: lt * 3 };
  }
  function bangFx(lt, tb, fromXY, toXY) {
    const a = lt - tb; if (a < 0 || a > .45) return;
    boilSeed('bang' + tb);
    if (a < .07) { inkLine([fromXY, toXY], 3, '#FFF1C4', 'ink', 0); glow(toXY[0], toXY[1], 160, '#FFD27A', 1); }
    burst(toXY[0], toXY[1], 90, a, '#FF6A5A', 8, tb * 10);
  }
  function shotDeadeye(t, lt0, dur) {
    const lt = lt0 + 3.0, G = C.G;                        // keep C's clock: this shot runs 3.0–7.0
    const shake = C.bang.reduce((s, b) => lt > b ? s + 14 * Math.exp(-(lt - b) * 9) : s, 0);
    const sh = shakeXY(t, shake);
    camBegin(1150 + sh[0] + 30 * seg(lt, 3, 7), 790 + sh[1], lerp(1.2, 1.3, seg(lt, 3, 7)));
    westSky(t, { noon: 1, sun: sunAt(9) });
    street(t, { noon: 1, arch: false });
    // Mercy dives behind the payload: drawn before the cart while hiding
    const dive = seg(lt, 4.7, 5.15), hidden = dive >= 1;
    const mPos = arcPt([C.mercy, G], [1010, STREET.rail + 10], 120, easeOut(dive));
    const mMood = emotions(lt, [[3.0, 'surprised', { lookX: 1 }], [3.45, 'scared'], [4.55, 'scared', { lookX: 1, lookY: -.6 }]]);
    const mo = { ...mMood, view: dive > 0 ? 'side' : 'q', wing: .15, aL: .9, ...(dive > 0 && dive < 1 ? { smear: .6, smearDir: 1, rot: .4 } : {}) };
    if (hidden) mercy(mPos[0], mPos[1], 24, mo);
    payload(960, STREET.rail, 1, t, {});
    if (!hidden) mercy(mPos[0], mPos[1], 24, mo);
    tumbleweed(lerp(2100, -300, seg(lt, 3.0, 5.2)), G + 70, 64, t);
    // the team: looking right; scared take at 3.0; skulls at 4.0/4.25/4.5; KO at the bangs
    const team = [['genji', C.genji, 23, 4.0, C.bang[0]], ['tracer', C.tracer, 23, 4.25, C.bang[1]], ['rein', C.rein, 28, 4.5, C.bang[2]]];
    for (const [who, x, u, ts, tb] of team) {
      const base = emotions(lt, [[3.0, 'neutral', { lookX: 1 }], [3.05, 'surprised', { lookX: 1 }], [3.6, 'scared', { lookX: 1 }]]);
      const o = { ...base, view: 'q', ...koPose(lt, tb, u) };
      if (who === 'genji') genji(x, G, u, o);
      if (who === 'tracer') tracer(x, G, u, o);
      if (who === 'rein') rein(x, G, u, { ...o, hammer: lt < tb ? -.5 : 1.2 });
      if (lt < tb) skullMark(x, G - u * 11.5, 46, seg(lt, ts, ts + .2), seg(lt, 4.5, 5.45));
      bangFx(lt, tb, [x + 1400, G - 600], [x, G - u * 4.5]);
    }
    camEnd();
    for (const b of C.bang) { const a = lt - b; if (a >= 0 && a < .1) flash(.55 * (1 - a / .1), '#FFF4DA'); }
    if (lt < 3.06) flash(.4 * (1 - (lt - 3.0) / .06));
  }
  function shotSmoke(t, lt, dur) {
    const G = C.towerTop, u = 24;
    camBegin(2340, 240, 2.0 + .1 * lt);
    westSky(t, { noon: 1, sun: sunAt(9) });
    street(t, { noon: 1, arch: false });
    const o = { ...emotions(lt, [[0, 'smug', { emote: null, eyes: 'narrow' }], [.3, 'smug', { emote: null }]]), view: 'q', flip: true, hatTip: 1, aL: .05, noShadow: true };
    const twirl = easeOut(seg(lt, .3, .58)) * TAU * 2;
    o.gunRot = staffRot(o, 'L') - Math.PI / 2 - twirl;   // barrel up beside him, then a two-turn twirl
    cowboy(STREET.tower, G, u, o);
    // smoke curling up from the barrel tip
    const hand = armTip(STREET.tower, G, u, o, 'L'), tip = [hand[0], hand[1] - 3.2 * u];
    for (let i = 0; i < 3; i++) {
      boilSeed('smoke' + i);
      const a = clamp(lt * 1.6 - i * .2); if (a <= 0) continue;
      const P = []; for (let k = 0; k < 6; k++) { const q = k / 5 * a; P.push([tip[0] + Math.sin(q * 6 + i * 2 + lt * 3) * 16 * q + 30 * q, tip[1] - q * 170]); }
      paint(ribbon(P, 8, 24), { wash: '#F3ECE6', washOp: 190 * (1 - a * .5) * (1 - seg(lt, .3, .5)), ink: null });
    }
    camEnd();
  }

  // ---------- D · Heroes never die (23.6–32) ----------
  // Mercy peeks out at the fallen team, cries, steels itself, leaps up, unfolds golden wings and brings everyone back.
  // Cut to the Cowboy, shocked. Cut to the revived team, lined up and glowing; whip to the Cowboy.
  const D = { t0: 23.6, G: 990, rez: [4.4, 4.6, 4.8], up: [5.4, 5.6, 5.8] };
  const TEAM = [['genji', C.genji, 23], ['tracer', C.tracer, 23], ['rein', C.rein, 28]];
  function drawHero(who, x, y, u, o) { if (who === 'genji') genji(x, y, u, o); else if (who === 'tracer') tracer(x, y, u, o); else rein(x, y, u, { hammer: 1.2, ...o }); }
  function shotRise(t, lt, dur) {
    const G = D.G, gold = ease(seg(lt, 3.9, 4.5));
    // Mercy: hidden behind the cart → peeks over the top (24.0), looks left and right → sad (25.0) → determined (26.0)
    // → a little crouch → leaps (26.5) → golden wings (27.5) → pose while the team comes back
    const peek = ease(seg(lt, .4, .75)), leap = seg(lt, 2.9, 3.9), dip = lt > 2.6 && lt < 2.9 ? 18 * Math.sin(seg(lt, 2.6, 2.9) * Math.PI) : 0;
    const air = arcPt([960, 760], [1080, 470], 120, easeOut(leap));
    const x = leap > 0 ? air[0] : 960, y = leap > 0 ? air[1] : lerp(900, 760, peek) + dip;
    const cam = kf(lt, [[0, [1000, 800, 1.25]], [.4, [960, 740, 1.5]], [.9, [960, 700, 1.75]], [2.9, [960, 700, 1.8]], [3.9, [1070, 430, 1.55]], [4.4, [1080, 420, 1.6]], [5.0, [1160, 690, 1.12]], [6.4, [1160, 690, 1.16]]]);
    camBegin(cam[0], cam[1], cam[2]);
    westSky(t, { noon: 1, gold, sun: sunAt(9) });
    street(t, { noon: 1, gold, arch: false });
    if (gold > .01) {   // golden sunburst behind Mercy
      boilSeed('rays');
      for (let i = 0; i < 14; i++) { const a0 = i / 14 * TAU + lt * .15, a1 = a0 + TAU / 14 * .5; paint([[1080, 400], [1080 + Math.cos(a0) * 2600, 400 + Math.sin(a0) * 2600], [1080 + Math.cos(a1) * 2600, 400 + Math.sin(a1) * 2600]], { wash: '#FFE9A8', washOp: 90 * gold, ink: null }); }
    }
    const mood = emotions(lt, [[0, 'scared', { lookX: -.8 }], [.75, 'nervous', { lookX: -1, lookY: .5 }], [1.05, 'nervous', { lookX: 1, lookY: .5 }], [1.4, 'sad', { lookX: 0, lookY: .6, eyes: 'teary', emote: null }], [2.4, 'determined'], [3.9, 'starstruck'], [5.6, 'proud']]);
    const hidden = leap <= .15;
    const wing = lerp(lerp(.1, .45, leap), 1, ease(seg(lt, 3.9, 4.3)));
    const mo = { ...mood, view: leap > 0 && lt < 3.9 ? 'q' : 'front', wing, flap: leap > 0 ? flapOf(t, 10, .2 * (1 - gold)) : 0,
      aL: lt >= 3.9 ? 1.2 : (lt > 2.4 ? 1.0 : mood.aL), aR: lt >= 3.9 ? 1.2 : mood.aR, staffGlow: lt > 2.4 ? .5 + .5 * gold : 0,
      dy: (mood.dy || 0) * (leap > 0 ? .3 : 1) + (lt >= 3.9 ? Math.sin(lt * 3) * .4 : 0), sq: (mood.sq || 0) + (lt > 2.75 && lt < 2.9 ? .2 : 0),
      ...(leap > 0 && leap < 1 ? { smear: .4 * Math.sin(leap * Math.PI), smearDir: 0, rot: .1 } : {}) };
    if (hidden) mercy(x, y, 24, mo);
    payload(960, STREET.rail, 1, t, { core: 1 });
    // the fallen team, raised by the light
    TEAM.forEach(([who, tx, u], i) => {
      const r0 = D.rez[i], r1 = D.up[i], rise = ease(seg(lt, r1, r1 + .5));
      rezPillar(tx, G, 150, seg(lt, r0, r0 + .2) * (1 - seg(lt, r1 + .6, r1 + 1.1)), t);
      const ko = koPose(9, 0, u);   // lying upside down
      const o = lt < r1 ? { ...ko, tint: 'pale', tintK: .3 * (1 - seg(lt, r0, r1)) }
        : { ...emotions(lt, [[r1, 'surprised'], [r1 + .45, 'starstruck']]), view: 'q', rot: lerp(ko.rot, 0, rise), dy: lerp(ko.dy, 0, rise) - 3 * Math.sin(rise * Math.PI), sq: rise < 1 ? -.1 : 0 };
      if (lt > r1 && lt < r1 + .5) burst(tx, G - u * 4, 120, lt - r1, '#FFE27A', 10, i * 7);
      drawHero(who, tx, G, u, o);
    });
    if (!hidden) mercy(x, y, 24, mo);
    if (lt >= 3.9) { const h = staffHead(x, y, 24, mo); glow(h[0], h[1], 200 * gold, '#FFE27A', gold); }
    TEAM.forEach(([who, tx, u], i) => { const r0 = D.rez[i]; if (lt > r0 - .2 && lt < r0 + .45 && lt >= 3.9) { const h = staffHead(x, y, 24, mo); healBeam(h[0], h[1], tx, G - 200, t, seg(lt, r0 - .2, r0), '#FFE27A'); } });
    camEnd();
    if (lt > 3.9 && lt < 4.15) flash(.6 * (1 - (lt - 3.9) / .25), '#FFF3C8');
  }
  function shotShock(t, lt, dur) {
    const u = 24;
    camBegin(2360, 250, 2.2);
    westSky(t, { noon: 1, gold: 1, sun: sunAt(9) });
    street(t, { noon: 1, gold: 1, arch: false });
    const mood = emotions(lt, [[0, 'smug', { emote: null }], [.05, 'surprised', { lookX: -1 }], [.5, 'scared', { lookX: -1 }]]);
    cowboy(STREET.tower, C.towerTop, u, { ...mood, view: 'front', hatTip: 1, noCigar: lt > .2, noGun: true, aL: 1.0, aR: 1.0 });
    if (lt > .2) {   // the cigar drops
      boilSeed('cigar');
      const k = seg(lt, .2, .9), cx = STREET.tower + 2 * u + 30 * k, cy = C.towerTop - 4.4 * u + 700 * k * k;
      push(); translate(cx, cy); rotate(k * 8);
      paint([[-1 * u, -.15 * u], [1 * u, -.25 * u], [1 * u, .15 * u], [-1 * u, .2 * u]], { wash: '#8A5A3A', ink: PAL.ink, sw: .8 });
      pop();
    }
    camEnd();
  }
  function shotLineup(t, lt, dur) {
    const G = D.G, whip = seg(lt, .6, 1.0);
    camBegin(1150 + 1600 * easeIn(whip), 760, 1.25);
    westSky(t, { noon: 1, gold: 1 - .5 * seg(lt, 0, 1), sun: sunAt(9) });
    street(t, { noon: 1, gold: 1 - .5 * seg(lt, 0, 1), arch: false });
    payload(960, STREET.rail, 1, t, {});
    TEAM.forEach(([who, tx, u], i) => { glow(tx, G - u * 4, 160, '#FFE27A', .5); drawHero(who, tx, G, u, { ...feel('determined', t + i * .3), emote: null, view: 'q', ...(who === 'genji' ? { blade: .8, aL: 1.1 } : {}) }); });
    mercy(680, G - 120, 24, { ...feel('determined', t), emote: null, view: 'q', wing: .6, flap: flapOf(t, 8, .2), aL: 1.0, staffGlow: .6, dy: Math.sin(lt * 4) * .3 });
    camEnd();
    whipLines(easeIn(whip), 1, WHIP_STREET);
  }

  // ---------- E · push (32–38) ----------
  // Rein charges the tower, Tracer blinks round it, Genji leaps up and slashes: the Cowboy is launched into the sky and
  // twinkles out. Tilt down: everyone pushes the payload under the checkpoint arch. Fireworks. A banner swipes in.
  const E = { t0: 32, G: 990 };
  const payX = lt => lerp(1900, STREET.arch, ease(seg(lt, 2.1, 4.0)));
  function shotPush(t, lt, dur) {
    const G = E.G, hit = lt > .6 ? Math.exp(-(lt - .6) * 6) : 0, sh = shakeXY(t, 16 * hit + 10 * (lt > 1.0 ? Math.exp(-(lt - 1.0) * 7) : 0));
    const px = payX(lt);
    const cam = kf(lt, [[0, [1850, 700, 1.25]], [.6, [2150, 600, 1.3]], [1.0, [2300, 470, 1.35]], [1.3, [2560, 120, 1.15]], [1.9, [2700, -60, 1.05]], [2.2, [2700, -60, 1.05]], [2.6, [2130, 760, 1.3]]]);
    const cx = lt > 2.6 ? px - 80 : cam[0];
    const after = seg(lt, 4.0, 4.6);
    camBegin(lerp(cx, STREET.arch - 60, after) + sh[0], lerp(cam[1], 640, after) + sh[1], lerp(cam[2], 1.1, after));
    westSky(t, { noon: .3, gold: .55, sun: [2600, -200] });
    street(t, { noon: .3, gold: .55, towerShake: 14 * hit * Math.sin(lt * 60) });
    // the Cowboy: wobbles on the hit, launched by the slash, twinkles out
    const launch = seg(lt, 1.0, 2.0);
    if (lt < 1.0) cowboy(STREET.tower + 14 * hit * Math.sin(lt * 60), C.towerTop, 24, { ...emotions(lt, [[0, 'scared', { lookX: -1 }], [.6, 'dizzy']]), view: 'front', hatTip: 1, noCigar: true, noGun: true, noShadow: true });
    else if (launch < .85) {
      const p = arcPt([STREET.tower, C.towerTop], [2760, -150], 260, easeOut(launch));
      cowboy(p[0], p[1], 24 * (1 - .75 * launch), { ...feel('ko', t), view: 'front', rot: lt * 14, hatTip: 1, noCigar: true, noGun: true, noShadow: true });
    }
    if (lt > 1.85 && lt < 2.45) { boilSeed('twinkle'); const k = seg(lt, 1.85, 2.4); glow(2760, -150, 140 * (1 - k), '#FFF2C4', 1 - k); paint(starPts(2760, -150, 80 * backOut(k) * (1 - k * .7), .3, 4, k * 2), { wash: '#FFF8E0', ink: PAL.ink, sw: .8 }); }
    // the team
    if (lt < 2.0) {
      // Rein charges into the tower legs
      const rk = seg(lt, 0, .6), rx = lerp(1460, 2200, easeIn(rk)) - (lt > .6 ? 60 * Math.sin(Math.min(1, (lt - .6) * 3) * Math.PI) : 0);
      rein(rx, G, 28, { ...feel('determined', t), emote: null, view: 'side', walk: lt * 7, smear: lt < .6 ? .8 * rk : 0, smearDir: 1, aL: .4, hammer: 1.4, sq: lt > .6 ? .25 * Math.exp(-(lt - .6) * 6) : 0 });
      dust(1460, G, lt, 1.4); if (lt > .6) burst(2250, G - 160, 160, lt - .6, '#FFE2A0', 10, 3);
      // Tracer blinks round the tower
      const tk = seg(lt, .35, .55), tx = lerp(1700, 2560, tk);
      if (tk > 0 && tk < 1) blinkTrail(1700, G, tx, G, 23, 0); else if (lt > .55) blinkTrail(1700, G, 2560, G, 23, lt - .55);
      tracer(tx, G, 23, { ...feel('excited', t), emote: null, view: 'q', flip: tk >= 1 });
      // Genji leaps up the tower and slashes
      const gk = seg(lt, .5, 1.0), gp = arcPt([1200, G], [2250, C.towerTop + 10], 420, ease(gk));
      genji(gp[0], gp[1], 23, { ...feel('determined', t), emote: null, view: gk > 0 ? 'side' : 'q', blade: 1, aL: lt > .9 ? -.4 : 1.3, bladeRot: lt > .9 ? 1.6 : .2, ...(gk > 0 && gk < 1 ? { smear: .5, smearDir: 1, rot: .2 } : {}) });
      if (lt > .9 && lt < 1.35) {   // the green slash
        boilSeed('slash'); const a = seg(lt, .9, 1.35), P = [];
        for (let i = 0; i <= 8; i++) { const q = -1.2 + i / 8 * 2.2 * easeOut(clamp(a * 2)); P.push([2330 + Math.cos(q) * 170, C.towerTop - 90 + Math.sin(q) * 170]); }
        glow(2330, C.towerTop - 90, 260, '#8CF06A', 1 - a);
        paint(ribbon(P, 4, 34), { wash: '#B8FF9E', washOp: 230 * (1 - a), ink: null });
      }
      mercy(1300 + 300 * ease(seg(lt, 0, 1.5)), 640 + 30 * Math.sin(lt * 4), 22, { ...feel('determined', t), emote: null, view: 'q', wing: .55, flap: flapOf(t, 10, .25), aL: .9, staffGlow: .6 });
    } else {
      // everyone pushes the payload to the arch; Mercy keeps Rein healed from above
      const walk = lt * 4.5, cheer = lt > 4.0;
      const pose = (name, i) => cheer ? { ...feel('excited', t + i * .37), emote: null, view: 'front' } : { ...feel('determined', t + i * .2), emote: null, view: 'side', walk, aL: .9 };
      rein(px - 300, G, 28, { ...pose('rein', 0), hammer: 1.2, ...(cheer ? {} : { aL: 1.4 }) });
      payload(px, STREET.rail, 1, t, { roll: -(px - 1900) / 30 });
      genji(px - 120, G + 30, 23, pose('genji', 1));
      tracer(px + 150, G + 40, 23, pose('tracer', 2));
      const mo = { ...(cheer ? feel('starstruck', t) : feel('happy', t)), emote: null, view: cheer ? 'front' : 'q', wing: .6, flap: flapOf(t, 9, .25), aL: 1.0, aR: cheer ? 1.3 : .3, staffGlow: .6 };
      const mx = px - 120, my = 520 + 30 * Math.sin(lt * 3);
      mercy(mx, my, 22, mo);
      if (!cheer) { const h = staffHead(mx, my, 22, mo); healBeam(h[0], h[1], px - 300, G - 140, t, seg(lt, 2.4, 2.6)); }
      for (const [k, fx, fy, col] of [[4.0, STREET.arch - 300, 300, '#F2C14E'], [4.4, STREET.arch + 280, 260, '#4FB3C8'], [4.8, STREET.arch - 20, 220, '#E2476E']]) firework(fx, fy, lt - k, col);
    }
    camEnd();
    whipLines(1 - easeOut(seg(lt, 0, .4)), 1, WHIP_STREET);
    if (lt > 4.0) confetti(t, E.t0 + 4.0, 70);
    if (lt > 5.5) speedBands(t, seg(lt, 5.5, 6.0));
  }

  // ---------- F · Play of the Game (38–44) ----------
  function shotPOTG(t, lt, dur) {
    speedBands(t, 1);
    const slide = easeOut(seg(lt, 0, .45)), rot = -.05 + .02 * Math.sin(lt * .8);
    camBegin(960, 540, 1.0 + .03 * lt, rot);
    // the team bounces in behind at 41.0
    const pop = (t0, x, u, fn, extra) => { const k = seg(lt, t0, t0 + .35); if (k <= 0) return; fn(x, 1030 + 300 * (1 - backOut(k)), u, { ...feel('excited', t + x), emote: null, view: 'front', ...extra }); };
    pop(3.0, 420, 30, rein, { hammer: .9 }); pop(3.2, 760, 26, tracer, {}); pop(3.4, 1560, 26, genji, {});
    const mood = emotions(lt, [[0, 'starstruck', { emote: null }], [3.0, 'proud']]);
    mercy(lerp(2400, 1150, slide), 900, 44, { ...mood, view: 'front', wing: 1, flap: .05 * Math.sin(lt * 3), aL: 1.25, aR: .9, staffGlow: 1, dy: (mood.dy || 0) * .5 - .4 * Math.sin(lt * 2.5), ...(slide < 1 ? { smear: .8 * (1 - slide), smearDir: -1 } : {}) });
    camEnd();
    if (lt > 3.0) confetti(t, 38 + 3.0, 70);
    const k = seg(lt, 1.0, 1.25);
    if (k > 0) { letter('PLAY OF THE GAME', 960, 190, 118, '#FFF5E2', { pop: k, rot: -.05, stroke: '#2F3C7A' }); flushLetters(); }
    if (lt > 1.0 && lt < 1.2) flash(.5 * (1 - (lt - 1.0) / .2), '#FFF5E2');
    boilSeed('transition');
    if (lt > dur - .3) brushWipe((lt - (dur - .3)) / .6, ['#E2622E', '#F2C14E']);
  }

  // ---------- G · back in the spawn room (44–50) ----------
  function shotHome(t, lt, dur) {
    const G = 905, gate = 1 - ease(seg(lt, 4.6, 5.4));
    camBegin(960 + 10 * Math.sin(lt * .7), 640, 1.12 + .02 * lt);
    spawnRoom(t, { lamps: 3, gate, warm: 1 });
    // hearts at 44.5 / 45.0 / 45.5 instead of the "+"; then Genji's last "+" at 46.5; BONK at 47.5
    const bonk = lt >= 3.5, gHit = bonk ? Math.exp(-(lt - 3.5) * 5) : 0;
    rein(420, G, 31, { ...emotions(lt, [[0, 'happy'], [1.4, 'love', { emote: null }], [3.0, 'neutral', { lookX: 1 }], [4.0, 'laugh']]), view: 'q', hammer: -.5, aR: .8 });
    tracer(700, G, 26, { ...emotions(lt, [[0, 'happy'], [.9, 'love', { emote: null }], [3.0, 'neutral', { lookX: 1 }], [4.0, 'laugh']]), view: 'q' });
    const gMood = emotions(lt, [[0, 'happy'], [.4, 'love', { emote: null }], [2.3, 'playful', { emote: null }], [3.5, 'dizzy'], [4.1, 'laugh']]);
    genji(1245, G, 26, { ...gMood, view: 'q', flip: true, sq: (gMood.sq || 0) + .38 * gHit });
    // Mercy: in love → the last "+" → deadpan at the camera → wind up and BONK → smug → happy
    const mMood = emotions(lt, [[0, 'happy'], [1.0, 'shy'], [1.5, 'love'], [2.55, 'surprised', { lookX: 1, lookY: -.5 }], [3.0, 'bored', { lookX: 0, lookY: 0 }], [3.55, 'smug', { lookX: .6 }], [4.1, 'happy']]);
    const tilt = lt < 3.15 ? 0 : lt < 3.42 ? -.8 * ease(seg(lt, 3.15, 3.42)) : lt < 3.5 ? lerp(-.8, 1.0, easeIn(seg(lt, 3.42, 3.5))) : lerp(1.0, 0, ease(seg(lt, 3.75, 4.2)));
    const mo = { ...mMood, view: 'front', wing: .2, staffGlow: .3, aR: lt > 3.1 && lt < 4.2 ? .5 : mMood.aR, staffTilt: tilt, sq: (mMood.sq || 0) + (lt > 3.38 && lt < 3.48 ? -.1 : 0) };
    mercy(960, G, 30, mo);
    const hs = [[.5, 1245, G - 26 * 11], [1.0, 700, G - 26 * 11], [1.5, 420, G - 31 * 12]];
    for (const [h0, hx, hy] of hs) if (lt > h0) heartCall(lerp(hx, 960, ease(seg(lt, h0 + .3, h0 + 1.4))), lerp(hy, G - 30 * 10, ease(seg(lt, h0 + .3, h0 + 1.4))), 34, seg(lt, h0, h0 + .2) * (1 - seg(lt, h0 + 1.3, h0 + 1.5)), lt - h0);
    if (lt > 2.5 && lt < 3.5) healCall(1245, G - 26 * 11.5, 42, seg(lt, 2.5, 2.75), lt - 2.5);
    if (bonk) { burst(1245, G - 26 * 11.5, 70, lt - 3.5, '#FFE27A', 8, 2); burst(1240, G - 26 * 8, 120, lt - 3.5, PAL.cream, 7, 5); }
    const eye = toScreen(960, G - 30 * 5);
    camEnd();
    boilSeed('transition');
    if (lt < .3) brushWipe(.5 + lt / .6, ['#E2622E', '#F2C14E']);
    if (lt > 4.5) {   // iris to Mercy, hold, shut
      const r = lt < 5.0 ? lerp(1500, 280, ease(seg(lt, 4.5, 5.0))) : lt < 5.55 ? lerp(280, 255, seg(lt, 5.0, 5.55)) : lerp(255, 0, easeIn(seg(lt, 5.55, 5.85)));
      iris(...eye, r);
    }
  }

  shots([[0, shotSpawn], [6, shotStreet], [16, shotNoon], [19, shotDeadeye], [23, shotSmoke], [23.6, shotRise], [30, shotShock], [31, shotLineup],
         [32, shotPush], [38, shotPOTG], [44, shotHome]]);
})();
