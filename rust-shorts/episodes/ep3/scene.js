// ep3 "Eoka": in a standoff the Naked's eoka won't fire. The Chad is so unimpressed that he eats beans and sleeps
// through a whole day and night. The Naked gives up and tosses it: it fires. Then it fires first try. Then it fires
// again, mid-hug, into his own foot. Shot list: SCRIPT.md.
//
// As built (cameras: STAND = the script's 2S at zoom 1; WIDE = zoom .85, needed once the Chad lies down, since lying
// he reaches far to the right; N = the Naked waist up, about u 64; C = the Chad's mask):
//   0    1A STAND  strikes .3 (both flinch) and 1.2 (click, a wisp); the Chad leans in: "?"
//   2    1B STAND  strikes 2.0 2.4 2.8; the Chad lowers his AK, checks his wrist (ticks 3.3, 3.55), "..."
//   4    1C N      shakes it, peers down the barrel (4.6–5.2), blows (5.3), dust out of the touch hole (5.6), two taps
//   6    1D STAND  kiss + heart (6.2), prayer under a halo (6.6–7.6), back to aiming; the Chad sits (6.5), lays his AK
//                  in the grass, pulls out a can of beans, pops it (7.5)
//   8    S2 WIDE   the time-lapse: day → sunset → night → dawn, sun arc and cast shadows, racing clouds; strikes every
//                  .25 s, then .5 s, then two feeble ones at night that light the scene; beans per beat, can tossed
//                  (9.5–9.6), he lies down (10.0), the chicken walks in and settles on his chest (11.0), sleeps, the
//                  cobweb (12.2–13.9), crows (14.8); the Naked slumps, sighs (15.5)
//   16   3A N      heartbroken, sighs, tosses it over his shoulder (17.0)
//   17.5 3B WIDE   it lands by the barrel and fires (17.6); ping off the mask (17.66); feathers (17.75); the Chad jolts up
//   18.5 3C C      red eyes, steam; snatches the AK out of the cobweb, swings it up, racks it (19.2)
//   19.5 3D WIDE   the Naked hops back onto his seat by the eoka, grabs it, eyes shut, strike (20.36), BANG (20.44),
//                  ping (20.5); the Chad flips over backwards, legs in the air (thud 20.72), KO stars
//   21   4A N      eyes open, the smoking eoka, "?" (21.5), a look at the Chad, back, love (22.4)
//   23   4B N      (closer) pulls it into a hug, hearts, heartbeats, a kiss (24.4)
//   25   4C N      BANG (25.0) into his foot; eyes wide; he springs up
//   26   4D WIDE   hops in a circle on one foot, toes smoking; the eoka he flung comes down on the Chad's mask (27.6)
(() => {
  const G = 1330, U = 36, NX = 260, CX = 790, HZ = 1170;   // the two-shot: ground line, unit, the Naked, the Chad, horizon
  // Where the Chad sits: SX1 in 1D; after the wall transition (8.0) at SX, closer in, so the wide shots can frame tighter
  // (lying down he reaches about 330 px right of his seat). The barrel stands at BX1 in S1 and BX2 after.
  const SX1 = 765, SX = 680, BX1 = 80, BX2 = 150;
  const NK = 'naked', CH = 'chad';
  const CHAD_GEAR = { gear: { mask: 'metal', chest: 'metal', kilt: 'roadsign', hoodie: true, hoodieCol: '#5F6B52', pants: true, boots: true, gloves: true }, skin: 'tan', hair: 'buzz', hairCol: 'dark' };
  const P2 = (u, pts) => pts.map(([a, b]) => [a * u, b * u]);
  // A full-frame colour grade, painted in screen space (a world-sized wash under a zoomed-out camera loses its edges):
  // it ends the camera and starts it again, so glows for the lights can still go on top in world space.
  const grade = (col, op) => {
    if (op < 1 || !CAM) return;
    const c = CAM; camEnd();
    boilSeed('grade'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: col, washOp: op, ink: null });
    camBegin(c.cx, c.cy, c.zoom, c.rot);
  };

  // ---------- the set: a meadow with a gravel road, a rusty barrel, distant power lines ----------
  // tod: 0 day → 1 sunset → 2 night (rustSky); a dawn is tod ≈ .7 again. Everything darkens and cools with it.
  const nightOf = tod => clamp(tod - 1), duskOf = tod => clamp(tod) * (1 - clamp(tod - 1));
  const tone = (day, tod, duskCol = '#C98A62', nightCol = '#262C4A', nk = .8) => mixCol(mixCol(day, duskCol, duskOf(tod) * .35), nightCol, nightOf(tod) * nk);
  function powerLines(tod) {
    const xs = [-410, 30, 470, 910, 1350], top = HZ - 84, wood = tone('#6A5444', tod, '#6A4A3A', '#1E2236', .85), wire = tone('#4A4450', tod, '#5A4048', '#1A1D30', .8);
    xs.forEach((px, i) => {
      boilSeed('pole' + i);
      paint([[px - 3, HZ + 4], [px + 3, HZ + 4], [px + 2, top], [px - 2, top]], { wash: wood, ink: null });
      paint(rectPts(px - 16, top + 6, 32, 4), { wash: wood, ink: null });
    });
    for (let i = 0; i < xs.length - 1; i++) for (const d of [-14, 14]) {
      boilSeed('wire' + i + d);
      const a = [xs[i] + d, top + 7], b = [xs[i + 1] + d, top + 7], P = [];
      for (let k = 0; k <= 8; k++) { const f = k / 8; P.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f) + 26 * 4 * f * (1 - f)]); }
      inkLine(P, .55, wire, 'inkfine', .4);
    }
  }
  // A rusty oil barrel standing at (x, y); s = 1 ≈ 108 × 165 px.
  function barrel(x, y, s, tod) {
    const body = tone('#9C4C30', tod, '#A0503A', '#2E2840', .78), dk = mixCol(body, PAL.ink, .35), lt = tone('#D07A4C', tod, '#E08A5A', '#4A4060', .78);
    boilSeed('barrel');
    push(); translate(x, y); scale(s);
    paint(rrPts(-54, -165, 108, 165, 9), { wash: body, ink: PAL.ink, sw: 1.2 });
    paint(rectPts(-42, -152, 20, 140), { wash: lt, washOp: 130, ink: null });
    for (const yy of [-118, -54]) paint(rectPts(-55, yy - 6, 110, 12), { wash: dk, ink: PAL.ink, sw: .6 });
    paint(ellPts(0, -165, 54, 11, 18), { wash: mixCol(dk, PAL.ink, .2), ink: PAL.ink, sw: .9 });
    paint(ellPts(22, -88, 17, 25, 12, 2), { wash: tone('#C9733A', tod, '#C9733A', '#40384E', .78), washOp: 150, ink: null });
    paint(ellPts(-14, -30, 15, 10, 10, 2), { wash: mixCol(body, PAL.ink, .5), washOp: 140, ink: null });
    pop();
  }
  // Drifting clouds; ct = the clock that moves them (the time-lapse runs it fast).
  function clouds(ct, tod) {
    const c = mixCol(mixCol('#F7FBF8', '#FFD2B0', duskOf(tod)), '#4A5080', nightOf(tod)), op = 225 * (1 - .55 * nightOf(tod));
    for (let i = 0; i < 6; i++) {
      boilSeed('cloud' + i);
      const span = 2600, cx = -700 + ((i * 470 + ct * (22 + 9 * hash(i + 4))) % span + span) % span, cy = 120 + 170 * hash(i + 3), w = 130 + 70 * hash(i);
      paint(ellPts(cx, cy, w, 30 + 10 * hash(i + 1), 18, 4), { wash: c, washOp: op, ink: null });
      paint(ellPts(cx - w * .3, cy - 20, w * .45, 28, 14, 3), { wash: c, washOp: op, ink: null });
    }
  }
  function moonAt(x, y, k) {
    if (k <= .02) return;
    glow(x, y, 170, '#DCE4FF', .55 * k);
    boilSeed('moon');
    paint(ellPts(x, y, 46, 46, 22, 1), { wash: '#F2EED8', washOp: 255 * k, ink: null });
    paint(ellPts(x + 12, y - 8, 12, 10, 10), { wash: '#D8D2BC', washOp: 200 * k, ink: null });
    paint(ellPts(x - 14, y + 12, 8, 7, 8), { wash: '#D8D2BC', washOp: 200 * k, ink: null });
  }
  // A sky with keyed colours (rustSky mixes blue into orange through grey): sky = { top, low, night }; the sun's colour
  // follows its height; stars come out with night.
  // The low sky is stacked soft washes, each a little lower and stronger (a textured fill here bled into a jagged band
  // with a ghostly star in it).
  function skyPaint(t, sky, sun, moon) {
    boilSeed('sky'); paint(rectPts(-1600, -1800, W + 3200, 4400), { wash: sky.top, ink: null });
    for (let i = 0; i < 12; i++) { staticSeed('skyband' + i); const y0 = HZ - 580 + i * 48; paint([[-1600, y0 + 10], [540, y0 - 8], [W + 1600, y0 + 10], [W + 1600, HZ + 60], [-1600, HZ + 60]], { wash: sky.low, washOp: 34 + 4 * i, ink: null, curv: .2 }); }
    const nk = sky.night || 0;
    if (nk > .05) for (let i = 0; i < 40; i++) { boilSeed('star' + i); const x = hash(i) * 1700 - 150, y = hash(i + 50) * 950 - 150, tw = .6 + .4 * Math.sin(t * (2 + 2 * hash(i + 3)) + i); paint(starPts(x, y, (3 + 4 * hash(i + 9)) * tw, .35, 4), { wash: PAL.cream, washOp: 230 * nk, ink: null }); }
    if (sun && sun[1] < HZ + 80) {
      const hi = clamp((HZ - sun[1]) / 650);
      glow(sun[0], sun[1], 300, mixCol('#FFB46A', '#FFF2C4', hi), .55 + .3 * (1 - hi));
      boilSeed('sun'); paint(ellPts(sun[0], sun[1], 70, 70, 24, 1.5), { wash: mixCol('#FFB070', '#FFF6D8', hi), ink: null });
    }
    if (moon) moonAt(...moon);
  }
  // The whole place. o.sun = [x, y] (hidden under the meadow when it's below the horizon), o.moon = [x, y, k],
  // o.ct = the cloud clock.
  function meadow(t, o = {}) {
    const tod = o.tod ?? 0;
    if (o.sky) skyPaint(t, o.sky, o.sun, o.moon);
    else { rustSky(t, { tod, horizon: HZ, sun: o.sun || [300, 230], clouds: false }); if (o.moon) moonAt(...o.moon); }
    clouds(o.ct ?? t, tod);
    hills(t, { horizon: HZ, tod });
    powerLines(tod);
    // the meadow, the road across it, the foreground grass
    staticSeed('meadow');
    paint(rectPts(-1600, HZ - 4, W + 3200, 2400), { wash: tone('#93AE63', tod, '#B49A5E', '#26304A', .85), ink: null });
    staticSeed('meadow-far');
    paint(rectPts(-1600, HZ - 4, W + 3200, 46), { fill: tone('#B4C47E', tod, '#D0A870', '#323A58', .85), fillOp: 150, bleed: .12, tex: .3, border: .2, ink: null });
    const road = tone('#A99C88', tod, '#B4927A', '#3A3A54', .82), roadDk = mixCol(road, PAL.ink, .25);
    boilSeed('road');
    paint([[-1600, 1292], [W + 1600, 1288], [W + 1600, 1388], [-1600, 1392]], { wash: road, ink: null });
    inkLine([[-200, 1291], [1500, 1289]], .8, roadDk, 'inkfine', 0);
    inkLine([[-200, 1390], [1500, 1388]], .8, roadDk, 'inkfine', 0);
    for (const ry of [1312, 1366]) { boilSeed('rut' + ry); paint(rectPts(-1600, ry - 5, W + 3200, 10), { wash: mixCol(road, PAL.ink, .12), washOp: 150, ink: null }); }
    for (let i = 0; i < 26; i++) { boilSeed('gravel' + i); const px = -240 + hash(i + 40) * 1700, py = 1298 + hash(i + 70) * 86; paint(ellPts(px, py, 4 + 4 * hash(i + 2), 3 + 2 * hash(i + 5), 8, .5), { wash: mixCol(road, i % 3 ? PAL.ink : '#FFFFFF', .22), ink: null }); }
    tufts(-260, 1500, 1290, t, 16, tone(RUST.grassDk, tod, '#7A6A3A', '#1E2A3C', .85), .7, 'far');
    tufts(-260, 1500, 1398, t, 14, tone(RUST.grassDk, tod, '#7A6A3A', '#1E2A3C', .85), .85, 'near');
    for (const [bx, bs] of [[-120, .55], [610, .42], [1240, .5]]) bush(bx, HZ + 34, bs, { tod });
    barrel(o.barrelX ?? BX2, 1296, 1, tod);
    foreground(t, tod);
  }
  // Grass tufts along a line (3-point blades: a 2-point curved inkLine doesn't render).
  function tufts(x0, x1, y, t, n, col, s = 1, key = '') {
    for (let i = 0; i < n; i++) {
      boilSeed('tuft' + key + i);
      const x = lerp(x0, x1, hash(i * 3.1 + y)), w = Math.sin(t * 1.5 + i) * 4 * s;
      for (const k of [-1, 0, 1]) { const h = (24 + 12 * hash(i + k + 3)) * s, tx = x + k * 11 * s + w; inkLine([[x + k * 6 * s, y], [lerp(x + k * 6 * s, tx, .5) - w * .3, y - h * .55], [tx, y - h]], .9, col, 'ink', .5); }
    }
  }
  // The near meadow below the road: a darker band, big tufts that sway, a few white wildflowers.
  function foreground(t, tod) {
    staticSeed('fg-band');
    paint(rectPts(-1600, 1470, W + 3200, 1400), { fill: tone('#6F9450', tod, '#8A7A48', '#1C2438', .85), fillOp: 120, bleed: .1, tex: .45, border: .3, ink: null });
    const dk = tone('#4E7038', tod, '#6A5A30', '#18202E', .85), lt = tone('#7FA25A', tod, '#9A8A50', '#222C40', .85);
    for (let i = 0; i < 16; i++) {
      boilSeed('fgtuft' + i);
      const x = -150 + hash(i + 91) * 1650, y = 1450 + hash(i + 17) * 520, s = .7 + .6 * hash(i + 5), sw = Math.sin(t * 1.4 + i * 1.7) * 6 * s;
      for (let k = -2; k <= 2; k++) { const h = (34 + 12 * hash(i + k + 9)) * s, tx = x + k * 13 * s + sw; inkLine([[x + k * 7 * s, y], [lerp(x + k * 7 * s, tx, .5) - sw * .3, y - h * .55], [tx, y - h]], 1.2, k % 2 ? lt : dk, 'ink', .5); }
    }
    for (let i = 0; i < 9; i++) { const fx = -100 + hash(i + 300) * 1500, fy = 1430 + hash(i + 310) * 480; flower(fx, fy, .32 + .12 * hash(i + 320), { key: 'fg' + i, rot: (hash(i + 330) - .5) * .4, stem: .6 }); }
  }
  // A long soft shadow cast on the ground from (x, y), len px toward dir (±1), op 0..1.
  function castShadow(x, y, len, dir, w, op, key) {
    if (op <= .02 || len < 4) return;
    boilSeed('cast' + key);
    paint(ellPts(x + dir * len / 2, y + 4, len / 2 + w * .5, w * .3, 20), { wash: '#3A3550', washOp: 105 * op, ink: null });
  }

  // ---------- the eoka (reference: the pistol.eoka icon) ----------
  // A long, thick, bent wooden stick that is more than half the gun: held low on its grip, it rises, bends and runs
  // forward under a dark grey pipe barrel tied onto its top with two wraps of tape; a pale cap closes the pipe's back, and
  // a grey flint hangs under the bend. Eoka space, u: (0, 0) = the fist on the grip, +x = where the barrel points; it
  // spans about x -.45..3.35u, y -2.55..1.0u. ES scales it (1.3 in the two-shots, where it would read small); each shot
  // sets it before drawing anything.
  let ES = 1;
  const MUZZLE = [3.24, -2.22], HOLE = [1.62, -2.5], TAPE = [2.45, -2.5];   // the barrel's mouth, its touch hole, the front tape's top
  const STICK = [[-.2, .98], [-.13, .3], [-.03, -.42], [.14, -1.03], [.5, -1.5], [1.06, -1.8], [1.8, -1.93], [2.5, -1.93], [3.04, -1.9]];
  function eokaProp(u, sw) {
    const v = u * ES, P = pts => P2(v, pts);
    paint(P([[.98, -1.42], [1.72, -1.5], [1.97, -1.05], [1.76, -.6], [1.2, -.5], [.94, -.9]]), { wash: '#686A72', ink: PAL.ink, sw: sw * .55, curv: .35 });   // the flint
    paint(P([[1.1, -1.3], [1.52, -1.36], [1.38, -1.0], [1.1, -.96]]), { wash: '#A2A5AC', washOp: 170, ink: null, curv: .3 });
    paint(ribbon(P(STICK), .9 * v, .66 * v), { wash: '#80593A', ink: PAL.ink, sw: sw * .8 });                                             // the stick
    inkLine(P([[-.42, .82], [-.35, .2], [-.23, -.42], [-.06, -1.1], [.34, -1.64], [1.0, -1.98]]), sw * 1.1, '#AC825A', 'inkfine', .5);      // light down its outer edge
    inkLine(P([[.04, .78], [.1, .15], [.19, -.42], [.34, -.92], [.67, -1.3], [1.12, -1.52]]), sw * .6, '#5A3B22', 'inkfine', .5);          // grain on the inside of the bend
    inkLine(P([[-.2, .6], [-.13, -.2], [.04, -.85]]), sw * .45, '#9A7048', 'inkfine', .5);
    paint(rrPts(1.42 * v, -2.5 * v, 1.82 * v, .56 * v, .16 * v), { wash: '#50525A', ink: PAL.ink, sw: sw * .65 });                     // the pipe, dark grey
    inkLine([[1.62 * v, -2.38 * v], [3.1 * v, -2.38 * v]], sw * .55, '#8C929B', 'inkfine', 0);
    for (const k of [2.2, 2.74]) {   // two wraps of tape round the pipe and the wood, striped by its turns
      paint(P([[k, -2.57], [k + .27, -2.57], [k + .3, -1.5], [k + .03, -1.5]]), { wash: '#A39E92', ink: PAL.ink, sw: sw * .45 });
      for (let j = 0; j < 4; j++) { const y0 = -2.46 + j * .26; inkLine(P([[k + .03, y0 + .13], [k + .28, y0]]), sw * .35, '#605C55', 'inkfine', 0); }
    }
    paint(ellPts(1.42 * v, -2.22 * v, .15 * v, .29 * v, 10), { wash: '#DCD8CE', ink: PAL.ink, sw: sw * .45 });                          // the pale cap
    paint(ellPts(MUZZLE[0] * v, MUZZLE[1] * v, .1 * v, .24 * v, 10), { wash: '#1E1B22', ink: PAL.ink, sw: sw * .35 });                   // its mouth
  }
  // A point of the eoka (eoka space, u) held in a survivor's hand `w`, in the world. e = { g, aim, ys } as for nakedPose.
  const eYs = e => { const v = e.ys ?? 1; return Math.abs(v) < .06 ? (v < 0 ? -.06 : .06) : v; };
  function eokaPt(x, y, u, o, e, p, w = 'R') {
    const [hx, hy] = handLocal(u, o, w), px = p[0] * u * ES, py = p[1] * u * ES * eYs(e), c = Math.cos(e.aim || 0), s = Math.sin(e.aim || 0);
    return bodyPt(x, y, u, o, hx + px * c - py * s, hy + px * s + py * c);
  }
  // A hold that puts eoka point p on the body point m (u), turned to aim (ys -1: turned over).
  const holdAt = (p, m, aim, ys = 1) => { const c = Math.cos(aim), s = Math.sin(aim), px = p[0] * ES, py = p[1] * ES * ys; return { g: [m[0] - (px * c - py * s), m[1] - (px * s + py * c)], aim, ys }; };
  // body frame → world, matching survivor()'s transform (a seated body squashes half as much and doesn't bob up)
  function bodyPt(x, y, u, o, lx, ly) {
    const sq = bodySq(o), fx = (o.flip ? -1 : 1) * (o.sx ?? 1) * (1 + sq * .55), fy = (o.sy ?? 1) * (1 - sq);
    const px = lx * fx, py = ly * fy, r = o.rot || 0, c = Math.cos(r), s = Math.sin(r);
    return [x + (o.dx || 0) * u + px * c - py * s, y + bodyDy(o) * u + px * s + py * c];
  }
  // The muzzle flash: a dry white-yellow star with a hot core, k 0..1 (gone in ~.12 s), pointing along ang.
  function muzzleFlash(x, y, s, k, ang, key) {
    if (k <= .02) return;
    glow(x, y, 160 * s * k, '#FFD27A', k);
    boilSeed('flash' + key);
    push(); translate(x, y); rotate(ang);
    const B = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = (i % 2 ? .32 : .75 + .55 * hash(i + 3)) * 46 * s * k; B.push([Math.cos(a) * r * (Math.cos(a) > 0 ? 1.6 : .8) + 26 * s * k, Math.sin(a) * r * .8]); }
    paint(B, { wash: '#FFE9A8', ink: '#E8892E', sw: 1.1 * s });
    paint(ellPts(18 * s * k, 0, 16 * s * k, 11 * s * k, 12), { wash: '#FFFDF2', ink: null });
    pop();
  }
  // A sigh: a soft breath cloud drifting out and down from the mouth at (x, y); dir = which way he faces.
  function sighCloud(x, y, s, age, dir, key) {
    if (age < 0 || age > .8) return;
    const k = age / .8;
    for (let i = 0; i < 3; i++) {
      const a = clamp(k * 1.3 - i * .15); if (a <= 0 || a >= 1) continue;
      boilSeed('sigh' + key + i);
      const r = (10 + 9 * i) * s * (.5 + .7 * easeOut(a));
      paint(ellPts(x + dir * (14 + 34 * i) * s * easeOut(a), y + (6 + 16 * i) * s * a, r, r * .7, 14), { wash: '#F6F2EA', washOp: 150 * (1 - a), ink: a < .4 ? mixCol(PAL.ink, '#F6F2EA', .5) : null, sw: .6 * s });
    }
  }
  // A grey-white powder-smoke puff curling up from (x, y), age in s.
  function gunSmoke(x, y, s, age, key, life = 1.4) {
    if (age < 0 || age > life) return;
    const k = age / life;
    for (let i = 0; i < 4; i++) {
      const a = clamp(k * 1.25 - i * .08); if (a <= 0 || a >= 1) continue;
      boilSeed('gsmoke' + key + i);
      const px = x + (10 + 26 * i) * s * easeOut(a) + 10 * s * Math.sin(a * 5 + i), py = y - (8 + 70 * i) * s * a - 30 * s * a, r = (9 + 7 * i) * s * (.5 + .8 * easeOut(a));
      paint(ellPts(px, py, r, r * .85, 12), { wash: mixCol('#E8E4DC', '#A8A4AC', a), washOp: 220 * (1 - a), ink: a < .35 ? PAL.ink : null, sw: .7 * s });
    }
  }

  // ---------- the Naked: rock in his near hand (L), eoka in his far hand (R) ----------
  // One strike (contact at 0), in eoka space: the rock comes up from below, its top edge scrapes forward along the flint
  // under the bend (flint and steel: sparks), then drops away. These are the rock's top edge; times are scaled by sp.
  const STRIKE = [[-.14, [1.08, .78]], [-.07, [.86, .96]], [0, [1.14, -.48]], [.06, [1.82, -.58]], [.15, [2.0, -.2]], [.32, [1.08, .78]]];
  const ROCKTOP = [.85, -1.25], FLINT = [1.46, -.56];   // the rock's top edge (rock space); where the sparks fly from (eoka space)
  // Which strike is under way at t (strikes = contact times): { t0, rel } or null
  function strikeAt(t, strikes, sp = 1) {
    let best = null;
    for (const t0 of strikes) if (t >= t0 + STRIKE[0][0] * sp) best = t0;
    if (best == null) return null;
    const rel = (t - best) / sp;
    return rel > STRIKE[STRIKE.length - 1][0] ? null : { t0: best, rel };
  }
  // The pose for a Naked holding the eoka in his far hand: e = { g: grip (body frame, u), aim, ys (1, or -1 turned over) }.
  // The rock hand strikes (r.strikes, r.sp, r.t), or goes to r.at (body, u), or blends from striking to r.at by r.atK.
  // Returns options for survivor(), with ._e (the eoka) for eokaPt().
  function nakedPose(u, o, e, r = {}) {
    o = { ...HERO, boilKey: NK, seed: 1, rawArms: true, handOver: true, ...o };
    if (e) {
      Object.assign(o, reachArm(u, o, 'R', e.g[0] * u, e.g[1] * u, e.elbowDown ?? true));
      o.handR = (uu, sw) => { push(); rotate(e.aim || 0); scale(1, eYs(e)); eokaProp(uu, sw); pop(); };
    }
    const ra = (e ? e.aim || 0 : 0) + (r.tilt ?? 0);
    let hand = null, rr = r.rot ?? 0;
    if (r.strikes && e) {
      const st = strikeAt(r.t ?? T, r.strikes, r.sp ?? 1), c0 = st ? kf(st.rel, STRIKE, x => x) : STRIKE[0][1], c = [c0[0] * ES, c0[1] * ES];
      const ca = Math.cos(e.aim || 0), sa = Math.sin(e.aim || 0), cr = Math.cos(ra), sr = Math.sin(ra), ys = eYs(e);
      const cx = e.g[0] + c[0] * ca - c[1] * ys * sa, cy = e.g[1] + c[0] * sa + c[1] * ys * ca;
      hand = [cx - (ROCKTOP[0] * cr - ROCKTOP[1] * sr), cy - (ROCKTOP[0] * sr + ROCKTOP[1] * cr)];
      rr = ra;
    }
    if (r.at) {
      const k = hand && r.atK != null ? clamp(r.atK) : 1;
      hand = hand ? [lerp(hand[0], r.at[0], k), lerp(hand[1], r.at[1], k)] : r.at;
      rr = lerp(rr, r.rot ?? 0, k);
    }
    if (hand) Object.assign(o, reachArm(u, o, 'L', hand[0] * u, hand[1] * u, r.elbowDown ?? true));
    if (r.rock !== false) o.handL = (uu, sw) => { push(); rotate(rr); rockProp(uu * (r.rs ?? 1), sw); pop(); };
    o._e = e;
    return o;
  }
  // Flint sparks: a hot white flash at the strike, then streaks flung out that arc down; a warm rim on each streak so they
  // read against a bright sky (fx.js's sparks() are drawn for night scenes).
  function flintSparks(x, y, s, age, o = {}) {
    const life = o.life ?? .4; if (age < 0 || age > life) return;
    const k = age / life, n = o.n || 10, dir = o.dir ?? -Math.PI / 2, spread = o.spread ?? 2.2, key = o.key || '';
    glow(x, y, 90 * s * (1 - k), '#FFC766', 1 - k);
    if (age < .08) { boilSeed('sflash' + key); paint(starPts(x, y, 38 * s * (1 - age / .08), .22, 4, .35), { wash: '#FFF8DC', ink: '#E8892E', sw: .8 * s }); }
    for (let i = 0; i < n; i++) {
      boilSeed('spark' + key + i);
      const a = dir + (hash(i + (o.seed || 0) * 17) - .5) * spread, sp = (80 + 130 * hash(i + 5 + (o.seed || 0))) * s, d = sp * easeOut(k), g = 170 * s * k * k;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + g, tl = 30 * s * (1 - k * .5), P = [[px - Math.cos(a) * tl, py - Math.sin(a) * tl], [px, py]];
      inkLine(P, 3.0 * s * (1 - k * .4), '#C8642A', 'inkfine', 0);
      inkLine(P, 1.7 * s * (1 - k * .4), i % 3 ? '#FFE07A' : '#FFF8DA', 'inkfine', 0);
    }
  }
  // Sparks for every strike in the list (at the flint), each with its own scatter.
  function strikeSparks(t, x, y, u, o, strikes, s = 1, n = 9, night = 0) {
    for (let i = 0; i < strikes.length; i++) {
      const age = t - strikes[i]; if (age < 0 || age > .4) continue;
      const [sx, sy] = eokaPt(x, y, u, o, o._e, FLINT);
      flintSparks(sx, sy, s, age, { n, dir: (o.flip ? Math.PI + 1.0 : -1.0) + (o._e.aim || 0) * (o.flip ? -1 : 1), spread: 2.2, seed: i + 3, key: 'strike' + i });
      if (night > 0) glow(sx, sy, 520 * s, '#FFB050', night * Math.exp(-age * 7));
    }
  }

  // ---------- the Chad: like geared(), but his far arm is free (o.farFront) and the AK can be put down (o.noGun) ----------
  function chad(x, y, u, o = {}) {
    if (o.twoHand && !o.noGun) {
      const [hx, hy] = handLocal(u, o, 'L'), g = o.gunRot || 0;
      o = { ...o, ...reachArm(u, o, 'R', hx + Math.cos(g) * 2.1 * u - Math.sin(g) * .05 * u, hy + Math.sin(g) * 2.1 * u + Math.cos(g) * .05 * u), farFront: true };
    }
    survivor(x, y, u, { ...CHAD_GEAR, boilKey: CH, seed: 2, rawArms: true, handOver: true, ...o, gear: CHAD_GEAR.gear,
      handL: o.handL !== undefined ? o.handL : (o.noGun ? null : (uu, sw) => { push(); rotate(o.gunRot || 0); akProp(uu, sw, o.fire || 0); pop(); }) });
  }
  const chadAim = (u, o) => reachArm(u, { view: 'side', rawArms: true, ...o }, 'L', 1.8 * u, -7.0 * u);

  // ---------- S1: standoff (0–8) ----------
  // The morning the episode ends on, so the loop closes: same sky and clouds, and the sun where 4D has it on screen.
  const MORNING = { top: '#8EC4DE', low: '#DDEDE6', night: 0 }, MSUN = [455, 700], SUN1 = [357, 639];
  const day1 = t => meadow(t, { tod: .25, sun: SUN1, sky: MORNING, ct: 228 + t, barrelX: BX1 });
  const STAND = () => { ES = 1.3; camBegin(540, 960, 1); };   // the two-shot (a two-shot sets the eoka's scale too)
  const label = t => { if (t < 2.5) letter('Eoka', 468, 420, 132, PAL.cream, { screen: true, stroke: PAL.ink, rot: -.05, pop: t < 2.25 ? 1 : 1 - seg(t, 2.25, 2.5) }); };
  const AIM = { g: [2.9, -7.0], aim: -.05, ys: 1 };   // the standoff: the eoka held out at the Chad
  const ROCK_DOWN = [.75, -4.75];                       // the rock hand resting in front of his hip (body, u)
  const kick = (t, t0, k = 6) => t > t0 ? Math.exp(-(t - t0) * k) * Math.min(1, (t - t0) / .04) : 0;   // a flinch, a recoil
  // Blend two eoka holds; the y-scale passes through 0 when it turns over, so the gun flips in his hand.
  const eBlend = (A, B, k) => ({ g: [lerp(A.g[0], B.g[0], k), lerp(A.g[1], B.g[1], k)], aim: lerp(A.aim, B.aim, k), ys: lerp(A.ys ?? 1, B.ys ?? 1, clamp((k - .44) / .12)) });   // the turn-over is a quick flip
  // The Chad's far hand on the AK's handguard, for a near-arm pose o (with o.gunRot).
  const handguard = (u, o) => { const [hx, hy] = handLocal(u, o, 'L'), g = o.gunRot || 0; return reachArm(u, o, 'R', hx + Math.cos(g) * 2.1 * u - Math.sin(g) * .05 * u, hy + Math.sin(g) * 2.1 * u + Math.cos(g) * .05 * u); };
  const armLerp = (A, B, k, w) => ({ ['a' + w]: lerp(A['a' + w], B['a' + w], k), ['bend' + w]: lerp(A['bend' + w], B['bend' + w], k), ['armK' + w]: lerp(A['armK' + w] ?? 1, B['armK' + w] ?? 1, k) });
  // "...": three small light dots popping in one by one
  function dots(x, y, s, age) {
    if (age < 0) return;
    for (let i = 0; i < 3; i++) { const q = backOut(clamp((age - i * .16) / .12)); if (q < .02) continue; boilSeed('dots' + i); paint(ellPts(x + (i - 1) * 1.2 * s, y, .34 * s * q, .34 * s * q, 12), { wash: PAL.cream, ink: PAL.ink, sw: 1 }); }
  }
  // A wristwatch on a hand hook: a dark strap and a round cream face, .8u back up the forearm (the fist covers the hand end).
  const watchHook = (uu, sw, info) => {
    const a = info.ang, wx = -Math.cos(a) * .8 * uu, wy = -Math.sin(a) * .8 * uu;
    push(); translate(wx, wy); rotate(a); paint(rectPts(-.2 * uu, -.56 * uu, .4 * uu, 1.12 * uu), { wash: '#3A3430', ink: PAL.ink, sw: sw * .45 }); pop();
    paint(ellPts(wx, wy, .4 * uu, .4 * uu, 14), { wash: '#F4ECDA', ink: PAL.ink, sw: sw * .6 });
    inkLine([[wx, wy], [wx, wy - .27 * uu]], sw * .5, PAL.ink, 'inkfine', 0); inkLine([[wx, wy], [wx + .2 * uu, wy + .05 * uu]], sw * .5, PAL.ink, 'inkfine', 0);
  };

  // 1A: cold open, both aiming. Strike (0.3): sparks, nothing, both flinch. Strike (1.2): sparks, a click and a wisp of
  // smoke from the touch hole. The Chad leans in: "?"
  function s1a(t, lt) {
    STAND();
    day1(t);
    const strikes = [.3, 1.2, 2.0], fl = kick(t, .3, 5);   // 2.0's wind-up starts before the cut
    const N = emotions(t, [[0, 'determined'], [.3, 'scared', { eyes: 'squeeze', mouth: 'wobble', emote: null }], [.68, 'determined'], [1.32, 'hopeful', { eyes: 'wide', mouth: 'o' }], [1.62, 'confused', { emote: null }]], { take: .25 });
    const watching = t > .68 && t < 1.32;
    const No = nakedPose(U, { ...N, view: 'side', rot: -.08 * fl, dx: -.3 * fl, lookX: watching ? .5 : N.lookX, lookY: watching ? .45 : N.lookY }, AIM, { strikes, t, sp: t > 1.8 ? .85 : 1 });
    survivor(NX, G, U, No);
    strikeSparks(t, NX, G, U, No, [.3, 1.2], 1.25, 12);
    if (t > 1.32) { const [hx, hy] = eokaPt(NX, G, U, No, No._e, HOLE); gunSmoke(hx, hy, .5, t - 1.32, 'click', .9); }
    const C = emotions(t, [[0, 'determined'], [.3, 'neutral', { eyes: 'closed' }], [.62, 'determined'], [1.42, 'confused', { emote: '?' }]], { take: .3 });
    const cf = kick(t, .3, 9), lean = ease(seg(t, 1.42, 1.7));   // the flinch: a sharp jerk of the head back, 3 frames
    chad(CX, G, U, { ...C, view: 'side', flip: true, ...chadAim(U), gunRot: .03 - .22 * cf, twoHand: true, rot: .24 * cf - .07 * lean, dx: .55 * cf, emoteK: C.emote ? C.emoteK : 0, emoteDx: -.3, emoteDy: -.5 });
    camEnd();
    label(t);
  }

  // 1B: three frantic strikes (2.0, 2.4, 2.8), nothing. The Chad lowers his AK, raises his wrist to his face, looks down
  // at the watch on it and taps it twice (3.3, 3.55): "..."
  function s1b(t, lt) {
    STAND();
    day1(t);
    const strikes = [2.0, 2.4, 2.8];
    const N = emotions(t, [[1.62, 'confused', { emote: null }], [2.0, 'determined', { emote: null }], [2.42, 'nervous', { emote: 'sweat' }], [3.02, 'confused', { emote: null }]], { take: .3 });
    // after the third strike he lifts the eoka to look at it, and starts to shake it (the shake carries over the cut)
    const look = ease(seg(t, 3.0, 3.35)), sh = t > 3.6 ? Math.sin((t - 3.6) * TAU * 7) * ease(seg(t, 3.6, 3.8)) : 0;
    const LOOK = { g: [2.7, -7.7], aim: -.55, ys: 1 }, e0 = eBlend(AIM, LOOK, look);
    const e = { ...e0, g: [e0.g[0] + .1 * sh, e0.g[1] - .08 * Math.abs(sh)], aim: e0.aim + .25 * sh };
    const No = nakedPose(U, { ...N, view: 'side', lookX: look > .4 ? .55 : N.lookX, lookY: look > .4 ? -.2 : N.lookY }, e, { strikes, sp: .85, t, at: ROCK_DOWN, atK: ease(seg(t, 3.05, 3.4)) });
    survivor(NX, G, U, No);
    strikeSparks(t, NX, G, U, No, strikes, 1.15, 11);
    // the Chad: the '?' fades; he lowers the AK (2.88–3.2), brings his wrist up to his face (3.12–3.3), leans over it and
    // taps the watch with his gun hand on each tick
    const C = emotions(t, [[1.42, 'confused', { emote: '?' }], [2.5, 'neutral', { emote: '?' }], [3.05, 'bored', { emote: null }]], { take: .3 });
    const lower = ease(seg(t, 2.88, 3.2)), watch = ease(seg(t, 3.12, 3.3)), base = { view: 'side', flip: true, rawArms: true };
    const tap = [3.3, 3.55].reduce((a, t0) => Math.max(a, Math.sin(Math.PI * clamp((t - t0 + .07) / .15))), 0);
    const aimP = chadAim(U), down = armLerp(aimP, { aL: -1.05, bendL: .35 }, lower, 'L');
    const W = [2.25, -9.75], wr = reachArm(U, base, 'R', W[0] * U, W[1] * U);
    const near = tap > 0 ? armLerp(down, reachArm(U, base, 'L', (W[0] - .55) * U, (W[1] + .7) * U), tap, 'L') : down;
    const gunRot = lerp(.03, 1.05, lower) + .3 * tap;
    const hg = handguard(U, { ...base, ...down, gunRot });
    let far = armLerp(hg, { aR: -1.32, bendR: .22 }, ease(seg(t, 2.95, 3.12)), 'R');
    if (watch > 0) far = armLerp(far, wr, watch, 'R');
    const rot = -.07 * (1 - ease(seg(t, 2.2, 2.6))) - .2 * watch;
    chad(CX, G, U, { ...C, ...base, ...near, ...far, gunRot, handR: watch > .3 ? watchHook : null, farFront: lower < .5 || watch > .2, lookX: watch > .5 ? .6 : C.lookX, lookY: watch > .5 ? 1 : C.lookY,
      rot, emote: t < 2.62 ? '?' : null, emoteK: t < 2.62 ? 1 - seg(t, 2.42, 2.62) : 0, emoteDx: -.3, emoteDy: -.5 });
    if (t > 3.62) { const [dx, dy] = bodyPt(CX, G, U, { flip: true, rot }, -.3 * U, -14.6 * U); dots(dx, dy, U * .62, t - 3.62); }
    camEnd();
    label(t);
  }

  // 1C (N): he shakes the eoka, then holds its muzzle to his eye (4.46): an insert looks back up the barrel at his wide
  // eye (4.64–5.1, the other one squeezed shut). He blows into the barrel (5.3), dust puffs out of the touch hole (5.45),
  // and taps it with the rock (5.84, 5.96).
  const REST = { g: [2.9, -7.0], aim: -.08, ys: 1 };
  function boreShot(t) {
    const ex = NX + .915 * U, ey = G - 10.9 * U, k = ease(seg(t, 4.64, 4.76)), r = lerp(66, 52, k);
    camBegin(ex - 2, ey + 6, 6.2);
    day1(t);
    survivor(NX, G, U, { ...HERO, boilKey: NK, seed: 1, view: 'front', rawArms: true, eyes: ['squeeze', 'wide'], mouth: 'flat', lookX: -.05, lookY: .1, tint: 'pale', tintK: .3 });
    boilSeed('bore');
    irisShape(ellPts(ex, ey, r, r, 40), '#16141A');                                                     // inside the pipe
    const ring = ellPts(ex, ey, r + 3, r + 3, 40); inkLine([...ring, ring[0]], 8, '#4A4C54', 'ink', 0);    // its mouth, end on
    inkLine(ellPts(ex, ey, r + 9, r + 9, 40).slice(23, 37), 2.2, '#8C929B', 'inkfine', .5);                  // light on the rim
    inkLine(ellPts(ex, ey, r + 22, r + 22, 40).slice(4, 14), 1.4, '#3A3A42', 'inkfine', .5);                // the bore's shine, further in
    camEnd();
  }
  // wispy tan rings of dust drifting off along dir
  function dustRings(x, y, s, age, dir) {
    const life = .75; if (age < 0 || age > life) return;
    for (let i = 0; i < 4; i++) {
      const a = clamp((age - i * .07) / (life - .21)); if (a <= 0 || a >= 1) continue;
      boilSeed('dustring' + i);
      const r = (5 + 15 * easeOut(a)) * s, cx = x + dir[0] * 70 * s * easeOut(a) + 7 * s * Math.sin(a * 6 + i * 2), cy = y + dir[1] * 70 * s * easeOut(a) - 12 * s * a + 6 * s * (i - 1.5), E = ellPts(cx, cy, r, r * .62, 16);
      paint(E, { wash: '#CDBB98', washOp: 110 * (1 - a), ink: null });
      inkLine([...E, E[0]], 1.5 * s * (1 - a * .7), '#A68E68', 'inkfine', .3);
    }
  }
  function s1c(t, lt) {
    ES = 1;
    if (t >= 4.64 && t < 5.1) { boreShot(t); return; }
    const pin = ease(seg(t, 4.44, 4.62)) * (1 - ease(seg(t, 5.56, 5.74)));   // pushed in for the peer and the blow
    camBegin(lerp(300, 345, pin), lerp(1000, 945, pin), lerp(1.78, 2.7, pin));
    day1(t);
    const SHAKE = { g: [3.0, -7.4], aim: -.55, ys: 1 }, PEER = holdAt(MUZZLE, [2.22, -10.9], Math.PI + .6, -1), BLOW = holdAt(MUZZLE, [2.5, -9.5], Math.PI + .75, -1);
    const sh = t < 4.5 ? Math.sin((t - 3.6) * TAU * 7) * (1 - ease(seg(t, 4.36, 4.48))) : 0;
    let e = t < 4.44 ? SHAKE : t < 5.1 ? eBlend(SHAKE, PEER, ease(seg(t, 4.44, 4.6))) : t < 5.56 ? eBlend(PEER, BLOW, ease(seg(t, 5.1, 5.24))) : eBlend(BLOW, REST, ease(seg(t, 5.56, 5.74)));
    e = { ...e, g: [e.g[0] + .1 * sh, e.g[1] - .08 * Math.abs(sh)], aim: e.aim + .25 * sh };
    const N = emotions(t, [[3.02, 'confused', { emote: null }], [4.44, 'scared', { eyes: 'wide', mouth: 'flat', emote: null }], [5.12, 'neutral', { eyes: 'closed', mouth: 'o', blush: .7 }], [5.6, 'surprised', { eyes: 'squeeze', mouth: 'wobble', emote: null }], [5.74, 'determined', { emote: null }]], { take: .3 });
    const peer = t > 4.5 && t < 5.12, blow = t > 5.3 && t < 5.56, taps = [5.84, 5.96];
    const No = nakedPose(U, { ...N, view: 'side', farFront: true, swMul: .8, dx: peer ? 0 : N.dx, lookX: peer ? .9 : t < 4.44 ? .5 : N.lookX, lookY: peer ? .5 : t < 4.44 ? -.3 : N.lookY, sq: (N.sq || 0) + (blow ? .05 + .02 * Math.sin(t * 40) : 0) },
      e, t > 5.6 ? { strikes: taps, sp: .55, t, at: ROCK_DOWN, atK: 1 - ease(seg(t, 5.64, 5.76)) } : { at: ROCK_DOWN });
    survivor(NX, G, U, No);
    if (blow) { const [mx, my] = bodyPt(NX, G, U, No, 2.6 * U, -9.2 * U); for (let i = 0; i < 3; i++) { const f = frac((t - 5.3) * 5 + i / 3); boilSeed('blow' + i); inkLine([[mx + 6 + 20 * f, my - 22 + 14 * i], [mx + 16 + 20 * f, my - 22 + 14 * i - 4], [mx + 26 + 20 * f, my - 22 + 14 * i]], 1.2, '#8EB4C8', 'inkfine', .5); } }
    if (t > 5.45) { const [hx, hy] = eokaPt(NX, G, U, No, No._e, HOLE); dustRings(hx, hy, .9, t - 5.45, [.55, -.8]); }
    strikeSparks(t, NX, G, U, No, taps, .45, 4);
    camEnd();
  }

  // 1D: he kisses the eoka (6.2, a heart at his lips), drops the rock and prays, palms together round the upright eoka,
  // head bowed, under a halo (6.6–8.0). The Chad sits (6.3), lays his AK in the grass, pulls a can of beans out of his
  // hoodie, holds it up and pulls the ring (7.12: pop, the lid flips up). The wall transition covers 7.37–8.27.
  const AKG_ROT = .27, akGround = sx => [sx - 4.3 * U, G + 14 - 1.35 * U];   // the AK lying by the seated Chad's boots, on its stock and magazine
  function groundAK(sx = SX, sw = 2.25) { const [ax, ay] = akGround(sx); boilSeed('groundak'); push(); translate(ax, ay); rotate(AKG_ROT); scale(-1, 1); akProp(U, sw, 0); pop(); }
  const CAN1 = [2.3, -5.6], CAN_S = 1.6;   // the can held up in front of his chest in 1D (seated body, u), and its size
  // the lid tearing off on its ring and flipping up, at (x, y) = the can's top
  function lidFlip(x, y, s, age) {
    if (age < 0 || age > .22) return;
    const k = age / .22, rise = 46 * s * Math.sin(k * Math.PI * .85), ang = -1.9 * easeOut(k), sq = Math.abs(Math.cos(k * 4));
    boilSeed('lidflip'); push(); translate(x - 10 * s * k, y - rise); rotate(ang);
    paint(ellPts(0, 0, 22 * s, 22 * s * (.25 + .75 * sq), 16), { wash: '#C2C6CA', ink: PAL.ink, sw: 1.1 });
    paint(ellPts(9 * s, 0, 6 * s, 4 * s * (.3 + .7 * sq), 8), { wash: '#8E9297', ink: PAL.ink, sw: .7 });
    pop();
    if (age < .12) for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .5, r0 = 26 * s, r1 = (40 + 40 * age / .12) * s; inkLine([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * (r0 + r1) / 2, y + Math.sin(a) * (r0 + r1) / 2], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], 2.2, PAL.ink, 'ink', 0); }
  }
  function s1d(t, lt) {
    STAND();
    day1(t);
    // ----- the Chad -----
    const C = emotions(t, [[3.05, 'bored', { emote: null }], [6.4, 'neutral', { emote: null }], [7.14, 'happy', { emote: null }]], { take: .3 });
    const face = { eyes: C.eyes, mouth: C.mouth, squint: C.squint, lookX: t > 6.8 ? .3 : C.lookX, lookY: t > 6.8 ? .75 : C.lookY };
    let B;
    if (t < 6.5) {   // sits, plopping forward a little onto his seat
      const sitK = ease(seg(t, 6.3, 6.5)), x = lerp(CX, SX1, sitK), Co = { ...C, ...face, view: 'side', flip: true, rawArms: true, sit: sitK, legsOut: true, dy: 2.3 * sitK, boilKey: CH, seed: 2 };
      const [ax, ay] = toBody(x, G, U, Co, ...handWorld(chadAimSit(6.5, .35, {}, SX1))), g0 = lerp(-AKG_ROT, .02, .35);
      Object.assign(Co, armLerp({ aL: -1.05, bendL: .35 }, reachArm(U, Co, 'L', ax, ay), sitK, 'L'), { gunRot: lerp(1.05, g0, sitK), aR: lerp(-1.32, -.95, sitK), bendR: lerp(.22, .45, sitK) });
      Co.handL = akHook(Co.gunRot);
      B = { x, y: G, o: Co };
    } else if (t < 6.65) B = chadAimSit(t, .35 * (1 - ease(seg(t, 6.5, 6.65))), face, SX1);
    else {
      B = chadSitB(.38 * (1 - ease(seg(t, 6.65, 6.78))), face, SX1);
      const o = B.o, [gx, gy] = toBody(B.x, B.y, U, o, ...akGround(SX1)), pocket = ease(seg(t, 6.65, 6.78)), up = ease(seg(t, 6.84, 7.0));
      const canAt = [lerp(1.0, CAN1[0], up), lerp(-3.65, CAN1[1], up)];
      Object.assign(o, armLerp(reachArm(U, o, 'L', gx, gy), reachArm(U, o, 'L', canAt[0] * U, canAt[1] * U), pocket, 'L'));
      const canK = t < 6.78 ? 0 : backOut(seg(t, 6.78, 6.86)), open = t >= 7.22;
      o.handL = canK > 0 ? (uu, sw) => { push(); scale(canK); beanCan(uu * CAN_S, sw, { open, rot: -.05 }); pop(); } : null;
      const tab = ease(seg(t, 7.0, 7.1)) * (1 - ease(seg(t, 7.14, 7.34)));   // the far hand to the ring pull and back
      Object.assign(o, armLerp({ aR: -.95, bendR: .45 }, reachArm(U, o, 'R', (canAt[0] + .45) * U, (canAt[1] - 1.55 + .5 * ease(seg(t, 7.12, 7.16))) * U), tab, 'R'), { farFront: tab > .05 });
    }
    chadAt(B);
    if (t >= 6.65) groundAK(SX1);
    if (t >= 7.12) {
      const [hx, hy] = handWorld(B), top = [hx - .25 * CAN_S * U, hy - .82 * CAN_S * U];
      lidFlip(top[0], top[1], 1, t - 7.12);
      puff(top[0], top[1] - 6, 22, t - 7.12, { col: '#EAE4D4', key: 'canpop', n: 4, life: .4, noInk: true });
    }
    // ----- the Naked: kiss, then the rock drops and he prays -----
    const KISS = holdAt([2.35, -1.5], [2.55, -9.45], -Math.PI / 2, -1), PRAY = holdAt([2.35, -1.5], [3.0, -9.2], -Math.PI / 2 + .12, -1);
    const e = t < 6.42 ? eBlend(REST, KISS, ease(seg(t, 6.0, 6.17))) : eBlend(KISS, PRAY, ease(seg(t, 6.42, 6.62)));
    const N = emotions(t, [[5.74, 'determined', { emote: null }], [6.08, 'love', { eyes: 'closed', mouth: 'pout', emote: null }], [6.45, 'proud', { eyes: 'closed', mouth: 'smile', emote: null }]], { take: .25 });
    const pray = ease(seg(t, 6.42, 6.62)), drop = t >= 6.42;
    const No = nakedPose(U, { ...N, view: 'side', farFront: true, rot: .07 * pray, lookX: N.lookX, lookY: pray > .5 ? .9 : N.lookY, openL: pray > .5 }, e,
      { at: drop ? [lerp(ROCK_DOWN[0], e.g[0] + .1, pray), lerp(ROCK_DOWN[1], e.g[1] + .15, pray)] : ROCK_DOWN, rock: !drop, rot: -1.2 * pray });
    // the rock falls from his hand to the grass by his toes (6.42–6.56) and lies there
    if (drop) { const from = bodyPt(NX, G, U, { view: 'side' }, ...handLocal(U, nakedPose(U, { view: 'side' }, REST, { at: ROCK_DOWN }), 'L')), to = [NX + 1.6 * U, G - .9 * U], k = seg(t, 6.42, 6.56); rockAt(lerp(from[0], to[0], k), lerp(from[1], to[1], k * k), .3 * k, 'drop'); }
    survivor(NX, G, U, No);
    if (t > 6.2) { const [kx, ky] = eokaPt(NX, G, U, No, No._e, [2.35, -1.5]); emote('heart', kx + 4, ky - 30 - 70 * seg(t, 6.2, 6.8), U * .6, seg(t, 6.2, 6.28) * (1 - seg(t, 6.6, 6.8)), t - 6.2); }
    // the halo
    const hk = backOut(seg(t, 6.6, 6.8));
    if (hk > .02) {
      const [hx, hy] = bodyPt(NX, G, U, No, .15 * U, (-14.3 + .15 * Math.sin(t * 5)) * U);
      glow(hx, hy, 150 * hk, '#FFE7A0', .7 * hk);
      boilSeed('halo'); inkLine(ellPts(hx, hy, 1.75 * U * hk, .45 * U * hk, 22).concat([ellPts(hx, hy, 1.75 * U * hk, .45 * U * hk, 22)[0]]), 3.2, '#E8AA38', 'ink', 0);
    }
    camEnd();
  }

  // ---------- S2: time passes (8–16), one static wide time-lapse ----------
  // The wide two-shot from here on (the Chad sits at SX now): everything key stays in the safe box.
  const WIDE = () => { ES = 1.3; camBegin(652, 1045, .93); };
  const lin = x => x;
  const kfCol = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return mixCol(keys[i - 1][1], keys[i][1], seg(t, keys[i - 1][0], keys[i][0])); return keys[keys.length - 1][1]; };
  // The day, run fast: time of day, the sun's arc (left to right, setting on the right; next morning it rises again from
  // the left edge), the moon (high on the left, clear of his head), racing clouds, how much sunlight there is for cast
  // shadows, and the colour grade.
  function lapse(t) {
    const tod = kf(t, [[8, 0], [9.6, .1], [10.4, .6], [10.9, 1.0], [11.5, 1.4], [12.2, 1.9], [12.5, 2], [14, 2], [14.4, 1.4], [14.9, .9], [15.6, .45], [16, .25], [99, .25]], lin);
    const sun = t < 12.5 ? kf(t, [[8, [120, 330]], [9, [560, 200]], [10, [990, 395]], [10.7, [1140, 820]], [11.15, [1190, 1250]]], lin) : kf(t, [[14.1, [20, 1260]], [14.6, [55, 1040]], [15.3, [110, 640]], [16, MSUN], [99, MSUN]], lin);
    const moon = kf(t, [[11.6, [110, 900]], [12.4, [200, 470]], [13.4, [560, 300]], [14.5, [950, 450]]], lin), mk = seg(t, 11.7, 12.3) * (1 - seg(t, 14.0, 14.5));
    const sky = {
      top: kfCol(t, [[8, '#86C3DD'], [9.6, '#7DB0D8'], [10.2, '#9A9AC8'], [10.7, '#D88A88'], [11.2, '#B05A78'], [11.7, '#5A3A78'], [12.1, '#2C2F66'], [12.5, '#1E2550'], [14.0, '#1E2550'], [14.4, '#5A4080'], [14.9, '#D88A96'], [15.4, '#9EB8DC'], [16, MORNING.top]]),
      low: kfCol(t, [[8, '#D4ECEB'], [9.6, '#F2E2B0'], [10.2, '#F8C080'], [10.7, '#F7A060'], [11.2, '#E0705E'], [11.7, '#9A4A6A'], [12.1, '#4A3E78'], [12.5, '#33386A'], [14.0, '#33386A'], [14.4, '#D88A7A'], [14.9, '#FAD08E'], [15.4, '#F6E6C8'], [16, MORNING.low]]),
      night: seg(t, 11.6, 12.3) * (1 - seg(t, 14.05, 14.5)) };
    const light = t < 12 ? 1 - seg(t, 10.6, 11.1) : seg(t, 14.4, 15.2);
    const gradeOp = kf(t, [[8, 0], [9.8, 0], [10.5, 16], [11.0, 24], [11.6, 30], [12.3, 40], [14, 40], [14.5, 28], [15.2, 14], [16, 6], [99, 6]], lin);
    const gradeCol = kfCol(t, [[10, '#F08A4B'], [11.2, '#E0704A'], [12.0, '#3A2A6A'], [12.4, '#1A2348'], [14.0, '#1A2348'], [14.5, '#7A4A80'], [15.0, '#F2A27A']]);
    return { tod, sun, sky, moon: [moon[0], moon[1], mk], ct: 8 + (t - 8) * 26, light, gradeOp, gradeCol };
  }
  // A shadow cast away from the sun: short at noon, long at sunset and dawn.
  function sunShadow(L, x, y, h, w, key) {
    if (L.light <= .02) return;
    const elev = clamp((HZ - L.sun[1]) / 900, .06, 1), len = Math.min(3.2 * h, h * .3 / elev);
    castShadow(x, y, len, x < L.sun[0] ? -1 : 1, w, .75 * L.light, key);
  }
  // The Chad going down, k 0 → 1: sitting up (legs out) → flat on his back with his head to the right. legsUp keeps the
  // seated L, so his legs swing up into the air instead (the KO). Placed by his hips (sx). Returns { x, y, o } for survivor().
  function chadDown(k, o = {}, legsUp = false, sx = SX) {
    const sit = legsUp ? 1 : 1 - k, P = { ...o, dx: 0, dy: 0, view: 'side', flip: true, rawArms: true, sit, legsOut: true, rot: 1.43 * k, noShadow: k > .3 };
    const hip = [0, -4.4 * U + 2.05 * U * sit], at = [sx + .25 * U * k, G - .05 * U - 1.25 * U * Math.min(1, k) - 1.0 * U * Math.sin(Math.PI * clamp(k))], [ox, oy] = bodyPt(0, 0, U, P, ...hip);   // lifted mid-way, so the legs swing clear of the road
    return { x: at[0] - ox, y: at[1] - oy, o: P };
  }
  const chadAt = B => survivor(B.x, B.y, U, { ...CHAD_GEAR, boilKey: CH, seed: 2, handOver: true, ...B.o, gear: CHAD_GEAR.gear });
  // a point of a posed survivor (body frame, u) in the world
  const ptOf = (B, lx, ly) => bodyPt(B.x, B.y, U, B.o, lx * U, ly * U);
  const CAN_AT = [2.05, -4.95], CAN_REST = [985, G + 22];   // the can in his hand (seated body frame); where it lands
  // A spoon in a hand, ang = where it points (hand space).
  const spoon = ang => (u, sw) => { push(); rotate(ang); inkLine([[0, 0], [.45 * u, 0], [.85 * u, 0]], sw * 1.1, '#9DA3A8', 'ink', 0); paint(ellPts(1.0 * u, 0, .2 * u, .13 * u, 10), { wash: '#B9BDC1', ink: PAL.ink, sw: sw * .4 }); pop(); };
  // The Chad through the time-lapse: a spoonful of beans per beat (in the can 8.5, 9.0), the can tossed over his shoulder
  // (9.5), flat on his back (10.0), asleep with his hands on his belly.
  function chadLapse(t) {
    const C = t < 9.5 ? feel('happy', t, { eyes: 'happy', emote: null }) : feel('sleepy', t, { eyes: t < 10 ? 'normal' : 'closed', emote: null });
    const down = ease(seg(t, 10.0, 10.14)), B = chadDown(down, { ...C, boilKey: CH, seed: 2 });
    const o = B.o, sitK = o.sit, eat = t < 9.45;
    if (eat) {
      const k = .5 - .5 * Math.cos((t - 8.5) * TAU * 2);   // 0 in the can (on the beat: clink), 1 at his mouth
      Object.assign(o, reachArm(U, o, 'L', CAN_AT[0] * U, CAN_AT[1] * U), reachArm(U, o, 'R', lerp(2.3, 2.45, k) * U, lerp(-6.55, -6.35, k) * U), { farFront: true });
      o.handL = (uu, sw) => beanCan(uu * 1.2, sw, { open: true, rot: -.05 });
      o.handR = spoon(lerp(Math.PI / 2 + .15, -2.25, k));
    } else if (t < 10.0) {
      const fl = ease(seg(t, 9.45, 9.52)) * (1 - ease(seg(t, 9.55, 9.75)));   // the flick back over his shoulder
      Object.assign(o, reachArm(U, o, 'L', lerp(2.6, -.4, fl) * U, lerp(-3.1, -8.4, fl) * U), { aR: -1.0, bendR: .4 });
    } else {
      Object.assign(o, napArms(o, sitK));
      o.sy = 1 + .02 * Math.sin((t - 10) * TAU * .55);   // breathing
    }
    return B;
  }
  // Asleep on his back, hands folded on his belly.
  const napArms = (o, sitK = 0) => ({ ...reachArm(U, o, 'L', 1.15 * U, (-5.25 + 2.05 * sitK) * U), ...reachArm(U, o, 'R', 1.35 * U, (-5.75 + 2.05 * sitK) * U) });
  // The tossed can: from his hand (9.52) over his shoulder to the road (9.6, clatter), a bounce, then lying there.
  function canFlight(t, from) {
    if (t < 9.52) return;
    let p, r;
    if (t < 9.6) { const k = seg(t, 9.52, 9.6); p = arcPt(from, [CAN_REST[0] - 30, CAN_REST[1]], 120, k); r = k * 7; }
    else if (t < 9.8) { const k = seg(t, 9.6, 9.8); p = arcPt([CAN_REST[0] - 30, CAN_REST[1]], CAN_REST, 30, k); r = 7 + k * 3; }
    else { beanCanAt(CAN_REST[0], CAN_REST[1] + 4, .6, { lying: true, open: true, key: 'tossed' }); return; }
    boilSeed('flyingcan'); push(); translate(p[0], p[1]); rotate(r); beanCanShape(60 * .6, 1.8, { open: true }); pop();
  }
  // The chicken: wanders in (10.0), hops onto his chest (10.62), settles (11.0), sleeps (12.2, a little z), wakes (14.3),
  // crows (14.8).
  function henLapse(t, chest) {
    if (t < 10) return;
    const start = [1150, G + 10], foot = [chest[0] + 85, G + 10];
    let p, pose, ph;
    if (t < 10.62) { const k = seg(t, 10.0, 10.62); p = [lerp(start[0], foot[0], k), start[1]]; pose = 'walk'; ph = (t - 10) * 3.6; }
    else if (t < 10.85) { p = arcPt(foot, chest, 110, ease(seg(t, 10.62, 10.85))); pose = 'flap'; ph = (t - 10.62) * 6; }
    else { p = chest; pose = t < 11.0 ? 'stand' : t < 12.2 ? 'sit' : t < 14.3 ? 'sleep' : t < 14.75 ? 'stand' : t < 15.45 ? 'crow' : 'stand'; }
    chicken(p[0], p[1], 1.05, { pose, phase: ph, flip: true, boilKey: 77, noShadow: t >= 10.62 });   // a numeric key: chicken() hashes it
    if (pose === 'sleep') emote('zzz', p[0] - 40, p[1] - 120, 16, seg(t, 12.2, 12.4), t - 12.2);
  }
  // The cobweb: spun from the AK's muzzle up to a tall weed beside it and down to the grass; k 0..1 = how much is spun.
  // Big and bright enough to read on a phone, with a tiny spider; at night it catches the spark light (glint 0..1).
  const akMuzzle = (sx = SX) => { const [ax, ay] = akGround(sx), c = Math.cos(AKG_ROT), s = Math.sin(AKG_ROT), lx = -4.45 * U, ly = -.15 * U; return [ax + lx * c - ly * s, ay + lx * s + ly * c]; };
  const MZ = akMuzzle(), WEED = [[MZ[0] + 62, G + 10], [MZ[0] + 54, G - 80], [MZ[0] + 70, G - 190]];
  function cobweb(k, glint = 0) {
    boilSeed('weed'); inkLine(WEED, 1.6, '#5E7A44', 'ink', .5);
    paint([[WEED[2][0], WEED[2][1]], [WEED[2][0] + 16, WEED[2][1] + 10], [WEED[2][0] + 3, WEED[2][1] + 16]], { wash: '#7E9A58', ink: PAL.ink, sw: .6 });
    if (k <= 0) return;
    const [mx, my] = MZ, col = '#F6F4FC';
    const ends = [[mx - 2, my + 2], [mx + 4, my - 60], [WEED[2][0] - 2, WEED[2][1] + 22], [WEED[1][0], WEED[1][1] - 20], [WEED[1][0] + 2, WEED[1][1] + 34], [WEED[0][0] - 6, G - 2], [mx + 22, G + 4], [mx + 6, my + 38]];
    const cx = mx + 34, cy = my - 40;
    if (glint > .02) glow(cx, cy, 120, '#FFE8B0', .6 * glint);
    boilSeed('cobweb');
    ends.forEach(([ex, ey], i) => { const sk = clamp(k * 3 - i * .25); if (sk > 0) inkLine([[cx, cy], [lerp(cx, ex, sk * .5), lerp(cy, ey, sk * .5)], [lerp(cx, ex, sk), lerp(cy, ey, sk)]], 1.2, col, 'inkfine', 0); });
    const rings = Math.floor(clamp((k - .3) / .7) * 5.999);
    for (let r = 1; r <= rings; r++) { const P = ends.map(([ex, ey]) => [lerp(cx, ex, r * .16), lerp(cy, ey, r * .16)]); inkLine([...P, P[0]], .95, col, 'inkfine', .15); }
    if (k > .6) {   // the spider, in the middle
      const sy = cy + 2 * Math.sin(T * 3);
      for (const s of [-1, 1]) for (let j = 0; j < 3; j++) inkLine([[cx, sy], [cx + s * 7, sy - 4 + j * 4], [cx + s * 11, sy - 1 + j * 5]], .9, PAL.ink, 'inkfine', 0);
      paint(ellPts(cx, sy, 5, 6, 10), { wash: '#2E2A30', ink: null });
    }
  }
  // Sweat flicked off his head: big drops that arc out and fall, age in s.
  function sweatFly(x, y, age, seed) {
    if (age < 0 || age > .5) return;
    for (let i = 0; i < 2; i++) {
      const a = -Math.PI / 2 + (i ? -.9 : .6) + (hash(seed + i) - .5) * .5, p = arcPt([x, y], [x + Math.cos(a) * 120, y + 100], 70, age / .5);
      boilSeed('sweat' + seed + i);
      paint([[p[0], p[1] - 18], [p[0] + 10, p[1] + 3], [p[0], p[1] + 11], [p[0] - 10, p[1] + 3]], { wash: PAL.sky, ink: PAL.ink, sw: 1.2, curv: .7 });
    }
  }
  const FAST = [8.5, 8.75, 9, 9.25, 9.5, 9.75], SLOW = [10, 10.5, 11, 11.5], FEEBLE = [12, 13.1];   // the wall transition covers up to 8.27
  function s2(t, lt) {
    const L = lapse(t);
    WIDE();
    meadow(t, { tod: L.tod, sun: L.sun, sky: L.sky, moon: L.moon, ct: L.ct });
    sunShadow(L, BX2, 1296, 165, 110, 'barrel');
    // the Chad, his can and the chicken
    const B = chadLapse(t), chest = ptOf(B, 1.25, -6.05 + 2.05 * B.o.sit);
    sunShadow(L, SX - .6 * U, G, t < 10 ? 7 * U : 2.4 * U, 6 * U, 'chad');
    const glint = FEEBLE.reduce((a, s0) => a + (t >= s0 && t < s0 + .5 ? Math.exp(-(t - s0) * 6) : 0), 0);
    cobweb(seg(t, 12.15, 13.9), glint);
    groundAK();
    chadAt(B);
    if (t >= 9.52) canFlight(t, ptOf(chadDown(0), -.4, -8.4));
    henLapse(t, chest);
    if (t > 10.3) { const [hx, hy] = ptOf(B, .3, -10.85 + 2.05 * B.o.sit), [mx, my] = ptOf(B, 2.5, -9.6 + 2.05 * B.o.sit); emote('zzz', hx - 70, hy - 150, 30, seg(t, 10.3, 10.6), t - 10.3); sleepBubble(mx - 8, my - 10, 1.3, (t - 10.3) * 1.1); }
    // the Naked: frantic strikes, slowing, feeble at night with bloodshot eyes, then slumped at dawn
    const strikes = [...FAST, ...SLOW, ...FEEBLE], sp = t < 10 ? .5 : t < 12 ? .8 : 1.25;
    const N = emotions(t, [[8, 'determined', { emote: null }], [10, 'nervous', { emote: null }], [12, 'sleepy', { eyes: 'red', squint: .35, mouth: 'flat', emote: null, tint: 'blue', tintK: .3 }], [14.2, 'sad', { emote: null }]], { take: .3 });
    const slump = ease(seg(t, 14.2, 14.9)), sigh = t > 15.5 ? Math.exp(-(t - 15.5) * 4) * Math.sin(Math.min(1, (t - 15.5) * 3) * Math.PI) : 0;
    const DROOP = { g: [1.5, -4.5], aim: 1.15, ys: 1 }, e = eBlend(AIM, DROOP, slump);
    const No = nakedPose(U, { ...N, view: 'side', crouch: .28 * slump, sq: (N.sq || 0) + .06 * slump + .04 * sigh, rot: .13 * slump + (t > 12 && t < 14.2 ? .03 : 0), lookY: t > 14.2 ? 1 : N.lookY },
      e, { strikes, sp, t, at: [.3, -3.9], atK: slump, rot: .5 });
    sunShadow(L, NX, G, 13.2 * U, 2.6 * U, 'naked');
    survivor(NX, G, U, No);
    strikeSparks(t, NX, G, U, No, strikes, t < 10 ? .9 : t < 12 ? .85 : .7, t < 12 ? 9 : 6);
    if (t > 10 && t < 12) for (const s0 of SLOW) { const [hx, hy] = bodyPt(NX, G, U, No, .2 * U, -12.2 * U); sweatFly(hx, hy, t - s0 - .05, s0 * 10); }
    { const [mx, my] = bodyPt(NX, G, U, No, 1.9 * U, -9.4 * U); sighCloud(mx, my, 1, t - 15.5, 1, 's2'); }
    grade(L.gradeCol, L.gradeOp);
    // at night every spark lights up the whole scene
    for (const s0 of FEEBLE) { const a = t - s0; if (a >= 0 && a < .5) { const [sx, sy] = eokaPt(NX, G, U, No, No._e, FLINT); glow(sx, sy, 560, '#FFB050', .85 * Math.exp(-a * 6)); glow(sx, sy, 160, '#FFE8B0', Math.exp(-a * 9)); } }
    const night = clamp(seg(t, 11.6, 12.2) * (1 - seg(t, 14.0, 14.4)));
    if (night > 0) glow(L.moon[0], L.moon[1], 120, '#DCE4FF', .25 * night);
    camEnd();
  }

  // The seated Chad leaning forward by `lean` (radians) about his hips; his near hand in the world.
  function chadSitB(lean, extra = {}, sx = SX) {
    const B = chadDown(0, { boilKey: CH, seed: 2, ...extra }, false, sx);
    B.o.rot = -lean;
    const [ox, oy] = bodyPt(0, 0, U, B.o, 0, -2.35 * U);
    B.x = sx - ox; B.y = G - .05 * U - oy;
    return B;
  }
  const handWorld = B => bodyPt(B.x, B.y, U, B.o, ...handLocal(U, B.o, 'L'));
  // ---------- S3: gave up (16–21) and S4: true faith (21–28), the next morning ----------
  const morning = t => meadow(t, { tod: .25, sun: MSUN, sky: MORNING, ct: 216 + (t - 16) });
  // After his dive he sits at SEATX, by the eoka. SCAM / HCAM: the N framings for that (HCAM keeps his feet above the captions).
  const SEATX = 262, SCAM = () => { ES = 1; camBegin(SEATX + 55, 1160, 1.78); }, HCAM = () => { ES = 1; camBegin(SEATX + 80, 1195, 1.8); };
  const SEAT = { sit: 1, legsOut: true, dy: 2.3 };
  const akHook = g => (uu, sw) => { push(); rotate(g); akProp(uu, sw, 0); pop(); };
  // the eoka on its own: grip at (x, y)
  function eokaAt(x, y, aim, key, ys = 1) { boilSeed('eokafree' + key); push(); translate(x, y); rotate(aim); scale(1, ys); eokaProp(U, 2.25); pop(); }
  const eokaFreePt = (x, y, aim, p) => { const c = Math.cos(aim), s = Math.sin(aim), px = p[0] * ES, py = p[1] * ES; return [x + (px * c - py * s) * U, y + (px * s + py * c) * U]; };
  // the bullet: a short bright streak along the path, k 0..1
  function tracer(x0, y0, x1, y1, k, key) {
    if (k <= 0 || k >= 1) return;
    const a = clamp(k - .45), b = clamp(k + .05), P = [0, .5, 1].map(f => { const q = lerp(a, b, f); return [lerp(x0, x1, q), lerp(y0, y1, q)]; });
    glow(P[2][0], P[2][1], 70, '#FFE7A0', .9);
    boilSeed('tracer' + key); inkLine(P, 2.6, '#FFF3C8', 'inkfine', 0);
  }
  // the ricochet off a facemask: a white-hot star, sparks, and a streak glancing off along dir
  function ping(x, y, s, age, key, dir) {
    if (age < 0 || age > .45) return;
    flintSparks(x, y, s, age, { n: 9, dir, spread: 1.7, seed: 9, key: 'ping' + key });
    if (age < .1) { glow(x, y, 110 * s, '#FFFFFF', 1 - age / .1); boilSeed('pingstar' + key); paint(starPts(x, y, 40 * s * (1 - age / .1), .22, 4, .2), { wash: '#FFFFFF', ink: '#9AA6B0', sw: .9 }); }
    if (age < .2) { const k = age / .2, L = 280 * s, P = [.6, .7, .8].map(f => [x + Math.cos(dir) * L * (k * .6 + f - .6), y + Math.sin(dir) * L * (k * .6 + f - .6)]); boilSeed('rico' + key); inkLine(P, 2.2 * s, '#FFF6D8', 'inkfine', 0); }
  }
  // a cartoon "bonk": a white star and ticks radiating up from the impact
  function bonk(x, y, s, age, key) {
    if (age < 0 || age > .3) return;
    const k = age / .3;
    boilSeed('bonk' + key);
    paint(starPts(x, y, 46 * s * (1 - k * .5), .4, 6, .3), { wash: '#FFF8DC', washOp: 255 * (1 - k), ink: PAL.ink, sw: 1.4 * s });
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * .3, r0 = (50 + 40 * k) * s, r1 = (80 + 50 * k) * s; inkLine([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * (r0 + r1) / 2, y + Math.sin(a) * (r0 + r1) / 2], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], 3 * s * (1 - k * .6), PAL.ink, 'ink', 0); }
  }

  // 3A (N): he looks at the eoka, heartbroken, sighs (16.0) and tosses it over his shoulder without looking: the arm
  // swings up past his face (16.86), lets go above and behind his head (17.0), and follows through before it falls.
  const LOOK3 = { g: [2.45, -5.6], aim: .12, ys: 1 }, DIP = { g: [2.7, -5.2], aim: .3, ys: 1 }, BACK = { g: [-1.0, -12.6], aim: -2.6, ys: 1 }, SLUMP = { g: [1.5, -4.5], aim: 1.15, ys: 1 };
  function pose3a(t) {
    const N = emotions(t, [[16, 'sad', { eyes: 'teary', mouth: 'frown', emote: null, gloom: 0 }], [16.62, 'sad', { eyes: 'closed', mouth: 'frown', emote: null, gloom: 0 }]], { take: .2 });
    const sigh = t < 16.6 ? Math.sin(seg(t, 16.0, 16.6) * Math.PI) : 0;
    const e = t < 16.5 ? eBlend(SLUMP, LOOK3, ease(seg(t, 16.05, 16.4))) : t < 16.86 ? eBlend(LOOK3, DIP, ease(seg(t, 16.7, 16.86))) : eBlend(DIP, BACK, easeIn(seg(t, 16.86, 17.0)));
    const up = t < 17.24;   // over the top and through the follow-through his arm is drawn over his head; dropping, it goes behind him
    const No = nakedPose(U, { ...N, view: 'side', farFront: up, swMul: .8, sq: (N.sq || 0) + .07 * sigh, rot: t > 16.86 ? -.06 * Math.sin(seg(t, 16.86, 17.3) * Math.PI) : 0, lookX: t < 16.62 ? .5 : -.2, lookY: t < 16.62 ? .6 : .2 }, t < 17.0 ? e : null, { at: ROCK_DOWN });
    if (t >= 17.0) Object.assign(No, armLerp(reachArm(U, No, 'R', BACK.g[0] * U, BACK.g[1] * U), { aR: TAU - 1.32, bendR: .25 }, ease(seg(t, 17.2, 17.45)), 'R'));   // held up behind his head, then down the back way
    return No;
  }
  function s3a(t, lt) {
    ES = 1;
    camBegin(300, 1000, 1.78 + .1 * ease(seg(t, 16, 17.5)));
    morning(t);
    const No = pose3a(t);
    // after the throw the eoka sails up and back, spinning, out of the top of the frame
    if (t >= 17.0) { const P0 = pose3a(16.999), [gx, gy] = eokaPt(NX, G, U, P0, P0._e, [0, 0]), k = easeOut(seg(t, 17.0, 17.3)); eokaAt(gx - 160 * k, gy - 900 * k, -2.6 - k * 7, 'toss'); }
    survivor(NX, G, U, No);
    { const [mx, my] = bodyPt(NX, G, U, No, 1.3 * U, -9.35 * U); sighCloud(mx, my, 1.1, t - 16.05, 1, '3a'); }
    camEnd();
  }
  // Where the tossed eoka is (grip, aim), 17.5–19.92: it drops in from high up, lands upright on its butt behind his
  // heels (in depth) with the barrel past his toes and fires (17.6); the kick bounces it back a little; then it stands
  // there. Null once it's back in his hand.
  const EOKA_LAND = [222, G + 2 - .98 * 1.3 * U], EOKA_REST = [210, G + 2 - .98 * 1.3 * U, -.04];
  function eokaFree(t) {
    if (t < 17.5 || t >= 19.92) return null;
    if (t < 17.6) { const k = seg(t, 17.5, 17.6); return { x: lerp(170, EOKA_LAND[0], k), y: lerp(440, EOKA_LAND[1], k * k), aim: (1 - k) * 2.6 }; }
    if (t < 17.8) { const k = seg(t, 17.6, 17.8), p = arcPt(EOKA_LAND, EOKA_REST, 22, k); return { x: p[0], y: p[1], aim: -.3 * Math.sin(k * Math.PI) - .04 * k }; }
    return { x: EOKA_REST[0], y: EOKA_REST[1], aim: EOKA_REST[2] };
  }
  // the Chad asleep, as the time-lapse left him; a point on his mask's face plate; where the chicken burst
  const sleeperAt = t => { const B = chadDown(1, { ...feel('sleepy', t, { eyes: 'closed', emote: null }), boilKey: CH, seed: 2 }); Object.assign(B.o, napArms(B.o)); return B; };
  const maskFront = B => ptOf(B, 1.6, -10.4 + 2.05 * B.o.sit);
  const BURST = (() => { const c = ptOf(sleeperAt(17.75), 1.25, -6.05); return [c[0] + 10, c[1] - 40]; })();
  // 3B (WIDE): the eoka drops in behind him and fires as it lands (17.6): the shot passes behind his legs and pings off
  // the Chad's facemask (17.66), the chicken bursts into feathers and flees, the Chad jolts upright. The Naked jumps and
  // turns to look down at it.
  function s3b(t, lt) {
    WIDE();
    morning(t);
    // the Chad: asleep, then the ping (17.66) and up he jolts (17.78–17.92), stunned, arms up
    const up = ease(seg(t, 17.78, 17.92)), jt = take(t, 17.86, 1);
    const B = chadDown(1 - up, { ...(t < 17.78 ? feel('sleepy', t, { eyes: 'closed', emote: null }) : { eyes: 'wide' }), boilKey: CH, seed: 2, sq: jt.sq, lookX: .8 });
    const lie = napArms(B.o, B.o.sit), startled = { aL: .35, bendL: 1.0, aR: .15, bendR: .9 };
    Object.assign(B.o, armLerp(lie, startled, up, 'L'), armLerp(lie, startled, up, 'R'));
    cobweb(1);
    groundAK();
    chadAt(B);
    beanCanAt(CAN_REST[0], CAN_REST[1] + 4, .6, { lying: true, open: true, key: 'tossed' });
    // the chicken: on his chest until the ping, then a burst of feathers (17.75) and it flaps off to the right
    const chest = ptOf(sleeperAt(t), 1.25, -6.05);
    if (t < 17.75) chicken(chest[0], chest[1], 1.05, { pose: 'stand', flip: true, boilKey: 77, noShadow: true, eyes: t > 17.66 ? 'wide' : 'normal' });
    else { const k = seg(t, 17.75, 18.3); chicken(lerp(chest[0], 1250, easeIn(k)), chest[1] - 150 * Math.sin(Math.min(1, k * 1.6) * Math.PI * .5) + 70 * k, 1.05, { pose: 'flap', phase: (t - 17.75) * 7, boilKey: 77, eyes: 'wide', noShadow: true }); }
    feathers(BURST[0], BURST[1], seg(t, 17.75, 19.75), { seed: 3, n: 12, s: 1.1, boilKey: 'burst' });
    // the eoka, the flash, the shot and its smoke: all behind him
    const E = eokaFree(t), LM = eokaFreePt(EOKA_LAND[0], EOKA_LAND[1], 0, MUZZLE), [px, py] = maskFront(sleeperAt(17.66));
    if (E) eokaAt(E.x, E.y, E.aim, 'free');
    if (t >= 17.6) { muzzleFlash(LM[0], LM[1], 1.1, clamp(1 - (t - 17.6) / .12), 0, 'b'); gunSmoke(LM[0] + 30, LM[1], .9, t - 17.6, 'b', .35); }
    tracer(LM[0], LM[1], px, py, seg(t, 17.6, 17.66), 'b');
    // the Naked: slumped, eyes shut; the bang makes him jump; then he turns to look back down at it
    const jp = jump(t, 17.62, 17.86, 1.8), tk = take(t, 17.62, 1.1), turned = t > 17.92, view3b = t < 17.84 ? 'side' : t < 17.88 ? 'q' : t < 17.92 ? 'qf' : 'front';   // a drawn turn
    const N = t < 17.62 ? feel('sad', t, { eyes: 'closed', mouth: 'frown', emote: null, gloom: 0 }) : { eyes: 'wide', mouth: t < 17.92 ? 'O' : 'o' };
    const No = nakedPose(U, { ...N, view: view3b, dy: jp.dy, sq: jp.sq + tk.sq, lookX: turned ? -.7 : .3, lookY: turned ? .9 : 0, rot: 0 }, null, { at: turned ? [-1.6, -5.2] : ROCK_DOWN });
    Object.assign(No, turned ? { aR: -.6, bendR: .5 } : t < 17.62 ? { aR: -1.32, bendR: .25 } : { aR: .9, bendR: .6 });
    survivor(NX, G, U, No);
    ping(px, py, 1, t - 17.66, 'b', -1.3);
    camEnd();
    if (t >= 17.6 && t < 17.68) flash(.22, '#FFF1C8');
  }

  // The seated Chad holding his AK: swing 0 = his near hand on the AK lying in the grass (leaning forward to it), 1 = aimed
  // at the Naked with both hands.
  function chadAimSit(t, swing, extra = {}, sx = SX) {
    const B = chadSitB(.38 * (1 - swing), extra, sx), o = B.o, [gx, gy] = toBody(B.x, B.y, U, o, ...akGround(sx));
    Object.assign(o, armLerp(reachArm(U, o, 'L', gx, gy), reachArm(U, o, 'L', 2.1 * U, -4.7 * U), swing, 'L'), { gunRot: lerp(-AKG_ROT, .02, swing) });
    o.handL = akHook(o.gunRot);
    if (swing > .75) Object.assign(o, handguard(U, o), { farFront: true });
    else Object.assign(o, { aR: -.95, bendR: .45 });
    return B;
  }
  // 3C (C): close on the Chad's mask. His eyes go furious red, steam rises off the mask; he snatches the AK out of the
  // grass (cobweb and all), swings it up and racks it (19.2).
  function steamWisps(x, y, s, age) {   // thin curls rising off the mask
    for (let i = 0; i < 4; i++) {
      const f = frac(age * 1.4 + i / 4), bx = x + (i - 1.5) * 26 * s, by = y - 90 * s * f, a = 1 - f;
      boilSeed('wisp' + i);
      inkLine([[bx, by + 30 * s], [bx + 8 * s * Math.sin(f * 7 + i), by + 15 * s], [bx - 6 * s * Math.sin(f * 5 + i), by]], 3 * s * a, mixCol('#FFFFFF', '#C8C4CC', f), 'inkfine', .6);
    }
  }
  function s3c(t, lt) {
    ES = 1;
    camBegin(SX + 8, G - 5.0 * U, 3.0);
    morning(t);
    const swing = ease(seg(t, 18.86, 19.12)), rack = t > 19.2 ? Math.exp(-(t - 19.2) * 10) * Math.sin(Math.min(1, (t - 19.2) * 8) * Math.PI) : 0;
    const C = emotions(t, [[18.5, 'angry', { eyes: 'angry', emote: null }], [18.62, 'furious', { eyes: 'red', emote: null }]], { take: .4 });
    const grab = t >= 18.78;
    const B = grab ? chadAimSit(t, swing, { eyes: C.eyes }) : chadDown(0, { boilKey: CH, seed: 2, eyes: C.eyes });
    if (!grab) { const dn = ease(seg(t, 18.5, 18.7)); Object.assign(B.o, { aL: lerp(.35, -.9, dn), bendL: lerp(1.0, .4, dn), aR: lerp(.15, -.95, dn), bendR: lerp(.9, .45, dn) }); }
    B.o.sq = (C.sq || 0) * .4; B.o.dx = -.15 * rack + (t > 18.62 ? .05 * Math.sin(t * 70) : 0);
    if (!grab) groundAK();
    chadAt(B);
    if (grab && swing < 1) { const [ax, ay] = bodyPt(B.x, B.y, U, B.o, ...handLocal(U, B.o, 'L')); boilSeed('websnag'); inkLine([[ax - 130, ay - 20], [ax - 150, ay + 50 * (1 - swing)], [ax - 165, ay + 130 * (1 - swing) + 20]], .9, '#F6F4FC', 'inkfine', .5); }
    const [hx, hy] = ptOf(B, .6, -8.8);
    if (t >= 18.62) { emote('steam', hx, hy - 1.7 * U, U * .45, backOut(seg(t, 18.62, 18.8)), t - 18.62); steamWisps(hx, hy - 2.6 * U, 1, t - 18.62); }
    feathers(BURST[0], BURST[1], seg(t, 17.75, 19.75), { seed: 3, n: 12, s: 1.1, boilKey: 'burst' });
    camEnd();
  }

  // 3D (WIDE): the Chad aims from where he sits, eyes red. The terrified Naked throws his hands up (19.5), then drops onto
  // his backside by the eoka (19.66–19.86) and grabs it (19.9), squeezes his eyes shut and strikes once (20.36): BANG,
  // first try (20.44). PING off the facemask (20.5); the Chad flips over backwards, legs in the air (thud 20.72), KO stars.
  const GRAB_G = toBody(SEATX, G, U, { view: 'side', ...SEAT }, EOKA_REST[0], EOKA_REST[1]).map(v => v / U);
  const AIMS = { g: [2.45, -4.6], aim: -.06, ys: 1 }, REST_SIT = [1.35, -3.55];
  function nakedDive(t) {
    const land = ease(seg(t, 19.66, 19.86)), x = lerp(NX, SEATX, land), air = t > 19.66 && t < 19.86 ? Math.sin(seg(t, 19.66, 19.86) * Math.PI) : 0;
    const N = emotions(t, [[19.5, 'scared', { emote: 'sweat' }], [20.08, 'scared', { eyes: 'squeeze', mouth: 'wobble', emote: null }]], { take: .4 });
    const view = t < 19.66 ? 'front' : t < 19.69 ? 'qf' : t < 19.72 ? 'q' : 'side';
    const o = { ...N, view, sit: land, legsOut: true, dy: 2.3 * land - .9 * air, rot: -.05 * air, farFront: t >= 19.86, dx: t < 19.66 ? .12 * Math.sin(t * 90) : 0, lookX: t < 20.08 ? .8 : -.6, emoteDx: -1 };
    const e = t >= 19.9 ? eBlend({ g: GRAB_G, aim: EOKA_REST[2], ys: 1 }, AIMS, ease(seg(t, 19.95, 20.25))) : null;
    const hands = ease(seg(t, 19.5, 19.56)) * (1 - ease(seg(t, 19.64, 19.74)));   // hands up!
    const r = t >= 20.2 ? { strikes: [20.36], t, sp: .9, at: REST_SIT, atK: 1 - ease(seg(t, 20.2, 20.28)) } : hands > .02 ? { at: [lerp(ROCK_DOWN[0], -1.1, hands), lerp(ROCK_DOWN[1], -12.2, hands)] } : { at: [lerp(ROCK_DOWN[0], REST_SIT[0], land), lerp(ROCK_DOWN[1], REST_SIT[1], land)] };
    const No = nakedPose(U, o, e, r);
    if (!e) Object.assign(No, hands > .02 && t < 19.7 ? { aR: lerp(-1.32, 1.25, hands), bendR: -.5 * hands } : armLerp({ aR: .2, bendR: .3 }, reachArm(U, No, 'R', GRAB_G[0] * U, GRAB_G[1] * U), ease(seg(t, 19.74, 19.9)), 'R'));
    const kk = kick(t, 20.44, 9);   // the recoil kicks the eoka hand up
    if (e && kk > 0) { const ee = { ...e, aim: e.aim - .55 * kk, g: [e.g[0] - .3 * kk, e.g[1] - .5 * kk] }; Object.assign(No, reachArm(U, No, 'R', ee.g[0] * U, ee.g[1] * U)); No.handR = (uu, sw) => { push(); rotate(ee.aim); eokaProp(uu, sw); pop(); }; No._e = ee; }
    return { x, No };
  }
  const KO_AK = [SX - 3.4 * U, G + 16 - 1.35 * U];   // where his AK lands: back in the grass in front of him
  function koChad(t, extra = {}) {
    const fall = backOut(seg(t, 20.5, 20.72)), wob = spring(t, 20.72, 7, 22) + 1.4 * spring(t, 27.6, 9, 26);
    const B = chadDown(Math.min(1.08, fall), { boilKey: CH, seed: 2, eyes: t < 20.62 ? 'wide' : 'x', ...extra }, true);
    Object.assign(B.o, { aL: -1.05 + .35 * wob, bendL: .35, aR: -.75 - .3 * wob, bendR: .45 });   // limp, twitching
    return B;
  }
  const koStars = (B, t, s = 1) => { const [hx, hy] = ptOf(B, 0, -8.8); emote('stars', hx - 6, hy - 30, U * .52 * s, 1, t); };
  function s3d(t, lt) {
    WIDE();
    morning(t);
    cobweb(0);
    beanCanAt(CAN_REST[0], CAN_REST[1] + 4, .6, { lying: true, open: true, key: 'tossed' });
    // the Chad: aiming, pinged (20.5), over backwards
    const ko = t >= 20.5, B = ko ? koChad(t) : chadAimSit(t, 1, { eyes: 'red' });
    if (!ko) B.o.dx = .04 * Math.sin(t * 70);   // trembling with rage
    chadAt(B);
    const [hx, hy] = ptOf(B, 0, -8.8);
    if (!ko) emote('steam', hx, hy - 3.1 * U, U * .9, 1, t - 18.62);
    else { puff(SX + 2.2 * U, G - 14, 58, t - 20.72, { col: '#E2D6BE', key: 'thud', n: 6, life: .6, rise: .5, noInk: true }); if (t >= 20.72) koStars(B, t - 20.72); }
    // his AK flies out of his hands and lands in front of him
    if (ko) { const k = seg(t, 20.5, 20.95), p = arcPt([SX - 2 * U, G - 4.6 * U], KO_AK, 300, k); boilSeed('flyak'); push(); translate(p[0], p[1]); rotate(-k * (TAU - AKG_ROT)); scale(-1, 1); akProp(U, 2.25, 0); pop(); }
    feathers(BURST[0], BURST[1], seg(t, 17.75, 19.75), { seed: 3, n: 12, s: 1.1, boilKey: 'burst' });   // the last of them settling
    // the Naked
    const D = nakedDive(t), E = eokaFree(t);
    if (E) eokaAt(E.x, E.y, E.aim, 'free');
    survivor(D.x, G, U, D.No);
    strikeSparks(t, D.x, G, U, D.No, [20.36], .9, 10);
    if (t >= 20.44 && D.No._e) {
      const [mx, my] = eokaPt(D.x, G, U, D.No, D.No._e, MUZZLE), [px, py] = ptOf(chadAimSit(20.5, 1), 1.85, -8.75);
      muzzleFlash(mx, my, 1.15, clamp(1 - (t - 20.44) / .12), D.No._e.aim, 'd');
      gunSmoke(mx, my, 1, t - 20.44, 'd', 1.6);
      tracer(mx, my, px, py, seg(t, 20.44, 20.5), 'd');
      ping(px, py, 1.1, t - 20.5, 'd', -2.0);
    }
    camEnd();
    if (t >= 20.44 && t < 20.52) flash(.2, '#FFF1C8');
  }

  // ---------- S4: true faith (21–28) ----------
  // In 4A he sets his rock down on the grass behind his hip (its smear away from his feet).
  const ROCK_GROUND = [SEATX - 1.75 * U, G - .95 * U], ROCK_T = toBody(SEATX, G, U, { view: 'q', ...SEAT }, ...ROCK_GROUND).map(v => v / U);
  const rockAt = (x, y, r, key) => { boilSeed('rockgnd' + key); push(); translate(x, y); rotate(r); rockProp(U, 2.25); pop(); };
  const restRock = () => rockAt(ROCK_GROUND[0], ROCK_GROUND[1], 0, 'a');
  // 4A (N): he opens his eyes and looks at the smoking eoka in disbelief (wide eyes), "?" (21.5), then at the KO'd Chad,
  // then back; love (22.4)
  function s4a(t, lt) {
    SCAM();
    morning(t);
    const N = emotions(t, [[21.0, 'scared', { eyes: 'squeeze', mouth: 'wobble', emote: null }], [21.14, 'surprised', { eyes: 'wide', mouth: 'o', emote: null }], [21.5, 'confused', { eyes: ['narrow', 'wide'], mouth: 'wobble', emote: '?' }], [22.4, 'love', { eyes: 'shine', mouth: 'cat', emote: 'spark' }]], { take: .35 });
    if (t > 21.72 && t < 22.4) N.eyes = 'wide';   // narrow only for the "?"
    const atChad = t > 21.82 && t < 22.18, pull = ease(seg(t, 21.15, 21.45));
    const LOOKAT = { g: [2.05, -5.4], aim: -.3, ys: 1 }, e = eBlend(AIMS, LOOKAT, pull);
    const down = ease(seg(t, 21.15, 21.45));   // the rock hand goes down behind his hip and lets go
    const No = nakedPose(U, { ...N, ...SEAT, view: 'q', swMul: .8, farFront: true, rot: (N.rot || 0) + .06 * Math.sin(seg(t, 21.5, 22.0) * Math.PI), lookX: atChad ? 1 : .55, lookY: atChad ? -.1 : .45, emoteDx: .4, emoteDy: 1.2 },
      e, { at: [lerp(REST_SIT[0], ROCK_T[0], down), lerp(REST_SIT[1], ROCK_T[1], down)], rot: 0, rock: t < 21.45 });
    if (t >= 21.45) restRock();
    survivor(SEATX, G, U, No);
    const [mx, my] = eokaPt(SEATX, G, U, No, No._e, MUZZLE);
    gunSmoke(mx, my, .8, (t - 21.0) % 1.1, 'a' + Math.floor((t - 21) / 1.1), 1.1);
    if (t > 22.4) { const k = seg(t, 22.4, 22.6); glow(mx - 30, my - 20, 120 * k, '#FFF2C4', .6 * k); boilSeed('eokashine'); paint(starPts(mx - 50, my - 40, 26 * backOut(k), .25, 4), { wash: '#FFFBEA', ink: null }); }
    camEnd();
  }
  // 4B (N): he hugs the eoka upright to his cheek, eyes closed, hearts floating; heartbeats (23.0–24.4); he turns and
  // kisses its tape (24.4, a heart pops off it); then cradles it in his lap, barrel down at his feet (24.62–24.9).
  const KISSPT = [2.35, -1.5];   // on the front tape, wood side
  function hugPose(t, o = {}) {
    const beat = [23.0, 23.5, 24.0].reduce((a, b) => a + (t > b ? Math.exp(-(t - b) * 9) : 0), 0);
    const N = feel('love', t, { eyes: 'closed', mouth: t > 24.25 && t < 24.6 ? 'pout' : 'cat', emote: 'hearts', blush: 1 });
    const pull = ease(seg(t, 23.0, 23.3)), kiss = ease(seg(t, 24.22, 24.36)) * (1 - ease(seg(t, 24.5, 24.62))), cradle = ease(seg(t, 24.62, 24.9));
    const LOOKAT = { g: [2.05, -5.4], aim: -.3, ys: 1 }, HUG = holdAt(KISSPT, [2.0, -8.15], -Math.PI / 2 - .08, -1), KISSH = holdAt(KISSPT, [1.62, -7.55], -Math.PI / 2 - .2, -1), CRADLE = { g: [2.0, -5.0], aim: 1.22, ys: 1 };
    let e = eBlend(LOOKAT, HUG, pull);
    if (kiss > 0) e = eBlend(e, KISSH, kiss);
    if (cradle > 0) e = eBlend(e, CRADLE, cradle);
    const No = nakedPose(U, { ...N, ...SEAT, view: 'q', swMul: .8, farFront: true, rot: .1 * pull * (1 - cradle) + .06 * kiss, dx: 0, dy: 2.3, sq: .05 * beat, lookX: .6, lookY: .5 + .4 * cradle, ...o }, e, { at: [lerp(lerp(1.75, 2.0, pull), 2.4, cradle), lerp(lerp(-2.55, -5.6, pull), -4.4, cradle)], rock: false, elbowDown: true });
    No.emoteK = 1; No.emoteAge = t - 23; No.emoteDx = .3; No.emoteDy = .2;
    return No;
  }
  function s4b(t, lt) {
    HCAM();
    morning(t);
    restRock();
    const No = hugPose(t);
    survivor(SEATX, G, U, No);
    if (t > 24.38) { const [kx, ky] = eokaPt(SEATX, G, U, No, No._e, KISSPT); emote('heart', kx + 14, ky - 30 - 80 * seg(t, 24.38, 25), U * .5, seg(t, 24.38, 24.46) * (1 - seg(t, 24.85, 25)), t - 24.38); }
    camEnd();
  }
  // 4C (N): BANG, it goes off in his lap, into his foot (25.0). His eyes go wide; he flings it away (25.82) and springs up.
  function s4c(t, lt) {
    HCAM();
    morning(t);
    restRock();
    const tk = take(t, 25.02, 1.2), spring_ = jump(t, 25.86, 26.4, 9), fling = ease(seg(t, 25.74, 25.84));
    const No = hugPose(t, { eyes: t < 25.04 ? 'closed' : t < 25.5 ? 'wide' : 'blank', mouth: t < 25.04 ? 'cat' : t < 25.5 ? 'flat' : 'wobble', emote: null, blush: t < 25.04 ? 1 : .2, tint: t < 25.04 ? 'rosy' : 'pale', tintK: .4,
      sq: tk.sq + spring_.sq, dy: 2.3 + tk.dy + spring_.dy, rot: t < 25.04 ? .05 : .02 });
    const kk = kick(t, 25.0, 8), CR = { g: [2.0, -5.0], aim: 1.22, ys: 1 };
    let ee = { ...CR, aim: CR.aim + .4 * kk };
    if (fling > 0) ee = eBlend(ee, { g: [1.2, -12.0], aim: -1.2, ys: 1 }, fling);   // flung up and away
    if (t < 25.84) { Object.assign(No, reachArm(U, No, 'R', ee.g[0] * U, ee.g[1] * U)); No.handR = (uu, sw) => { push(); rotate(ee.aim); eokaProp(uu, sw); pop(); }; No._e = ee; }
    else { Object.assign(No, reachArm(U, No, 'R', 1.2 * U, -12.0 * U)); No.handR = null; No._e = null; No.openR = true; }
    survivor(SEATX, G, U, No);
    if (No._e) {
      const [mx, my] = eokaPt(SEATX, G, U, No, No._e, MUZZLE);
      muzzleFlash(mx, my, 1.2, clamp(1 - (t - 25.0) / .12), No._e.aim, 'c');
      gunSmoke(mx, my, .9, t - 25.0, 'c', 1.2);
    } else { const k = seg(t, 25.84, 26.0); eokaAt(SEATX + 1.2 * U + 40 * k, G - 12 * U - 700 * k, -1.2 - 5 * k, 'fling'); }
    // smoke curling up from his toes
    const [fx, fy] = survivorFoot(SEATX, G, U, No, 0);
    for (let i = 0; i < 3; i++) gunSmoke(fx + .5 * U, fy - .6 * U, 1.0, t - 25.1 - i * .22, 'foot' + i, 1.0);
    camEnd();
    if (t < 25.08) flash(.28, '#FFF1C8');
  }
  // 4D (WIDE): he hops round in a circle on one foot, clutching the other up in front of him, the sole out and smoke
  // puffing from its toes, crying. The eoka he flung up comes back down and bonks the KO'd Chad (27.6). Rimshot (27.8).
  function tears(x, y, dir, t, key) {   // light blue tears streaming off backwards
    for (let i = 0; i < 4; i++) {
      const f = frac(t * 2.6 + i / 4), p = arcPt([x, y], [x - dir * 70, y + 60], 40, f);
      boilSeed('tear' + key + i); paint(ellPts(p[0], p[1], 5 * (1 - f * .5), 7 * (1 - f * .5), 8), { wash: '#A8D8F4', washOp: 230 * (1 - f), ink: null });
    }
  }
  function hopper(t) {
    const th = (t - 26) * TAU * .5 - .5, x = 360 + 85 * Math.sin(th), gy = G + 14 * Math.cos(th), dir = Math.cos(th) >= 0 ? 1 : -1;
    const ph = frac((t - 26) / .5), dy = -2.1 * Math.sin(ph * Math.PI), land = Math.exp(-ph * 9) * (t > 26.05 ? 1 : 0);
    const o = { eyes: 'squeeze', mouth: 'wail', view: 'side', flip: dir < 0, dy, sq: .14 * land - .05 * Math.sin(ph * Math.PI), clutchL: 1, farFront: true, rawArms: true, rot: -.05 * dir, sx: 1 + .05 * Math.cos(th), sy: 1 + .05 * Math.cos(th), tint: 'flush', tintK: .3 };
    const No = nakedPose(U, o, null, { rock: false });
    const [ax, ay] = footLocal(U, No, 0), gl = reachArm(U, No, 'L', 1.9 * U, -4.9 * U), gr = reachArm(U, No, 'R', ax - .7 * U, ay - .55 * U);
    Object.assign(No, gl, gr);
    return { x, gy, No, ph, dir };
  }
  function s4d(t, lt) {
    WIDE();
    morning(t);
    cobweb(0);
    beanCanAt(CAN_REST[0], CAN_REST[1] + 4, .6, { lying: true, open: true, key: 'tossed' });
    restRock();
    boilSeed('koak'); push(); translate(KO_AK[0], KO_AK[1]); rotate(AKG_ROT); scale(-1, 1); akProp(U, 2.25, 0); pop();
    // the KO'd Chad, legs in the air
    const B = koChad(t);
    chadAt(B);
    const [hx, hy] = ptOf(B, 0, -8.8);
    koStars(B, t < 27.6 ? t - 20.72 : 6.88 + (t - 27.6) * 1.8, 1 + .25 * spring(t, 27.6, 6, 18));
    // the eoka: up and out of the top of the frame (26.0–26.3), back down onto his mask (27.3–27.6), a bounce, then still
    const top = [hx - 20, hy - 1.4 * U], rest = [hx - 4.4 * U, G + 2 - .98 * 1.3 * U];
    if (t < 26.32) { const k = easeOut(seg(t, 25.95, 26.32)); eokaAt(lerp(300, 380, k), lerp(900, -300, k), -1.6 - k * 9, 'up'); }
    else if (t >= 27.1 && t < 27.6) { const k = seg(t, 27.1, 27.6), f = .35 * k + .65 * k * k; eokaAt(lerp(top[0] + 70, top[0], k), lerp(-90, top[1], f), 1.2 + k * 6, 'down'); }   // whistling down from the top of the frame
    else if (t >= 27.6) { const k = seg(t, 27.6, 27.86), p = t < 27.86 ? arcPt(top, rest, 110, k) : rest; eokaAt(p[0], p[1], t < 27.86 ? 7.2 + k * 5 : -.04 + TAU * 2, 'bounced'); if (t > 27.86) gunSmoke(...eokaFreePt(rest[0], rest[1], -.04, MUZZLE), .7, t - 27.86, 'last', 1.0); }
    bonk(hx, top[1] + 10, 1, t - 27.6, 'd');
    // the Naked, hopping
    const Hp = hopper(t);
    puff(Hp.x, Hp.gy - 4, 22, Hp.ph * .5, { col: '#C9B89A', key: 'hopdust' + Math.floor((t - 26) / .5), n: 4, life: .3, rise: .2, noInk: true });
    survivor(Hp.x, Hp.gy, U, Hp.No);
    const [fx, fy] = survivorFoot(Hp.x, Hp.gy, U, Hp.No, 0);
    for (let i = 0; i < 3; i++) gunSmoke(fx + Hp.dir * .55 * U, fy - .7 * U, .8, (t - 26 + i * .3) % .9, 'toe' + i + Math.floor((t - 26 + i * .3) / .9), .9);
    const [ex, ey] = bodyPt(Hp.x, Hp.gy, U, Hp.No, 1.7 * U, -10.9 * U);
    tears(ex, ey, Hp.dir, t, 'h');
    camEnd();
  }

  // ---------- a model sheet of the new props: studio.html?ep=3&loop=ep3kit ----------
  LOOPS.ep3kit = t => {
    ES = 1;
    boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE6D6', ink: null });
    push(); translate(640, 380); eokaProp(110, 4); pop();
    barrel(150, 380, 1.1, 0);
    const e = { g: [2.9, -7.6], aim: -.05, ys: 1 };
    const s = [0.5, 1.5, 2.5];
    const o1 = nakedPose(48, { view: 'side', ...feel('determined', t) }, e, { strikes: s, t });
    survivor(250, 1250, 48, o1);
    strikeSparks(t, 250, 1250, 48, o1, s, 1.2);
    const o2 = nakedPose(48, { view: 'q', ...feel('hopeful', t) }, e, { strikes: s.map(v => v + .3), t });
    survivor(700, 1250, 48, o2);
    chad(700, 1850, 40, { ...feel('determined', t), view: 'side', flip: true, ...chadAim(40), gunRot: .03, twoHand: true });
  };
  LOOPS.ep3kit.len = 3;

  shots([[0, s1a], [2, s1b], [4, s1c], [6, s1d], [8, s2], [16, s3a], [17.5, s3b], [18.5, s3c], [19.5, s3d], [21, s4a], [23, s4b], [25, s4c], [26, s4d]]);
  transitions([[8.0, 'wallUpgrade']]);   // a twig wall bonked up to armoured, then raided: covers 7.37–8.27
})();
