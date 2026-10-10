// armsheet.js: the arm rig's torture sheet (survivor.js armGeom). Every pose the rig gets asked for, in every view and
// both facings, so a wrong elbow, a hand in the crotch or inside the body, a sliver of a far arm, a stick arm over the
// chest, a dark hand or an outline end inside a limb shows up at once.
//   pages t = 0..7: front, qf, q, side, each facing right then left (flip). Each page is 6 x 4 cells:
//     row 1  his L arm: hanging, on the hip, on the belly, at the chest, to the opposite shoulder, raised (R hangs)
//     row 2  his R arm, the same (in 3/4 and profile that's the far arm, with farFront)
//     row 3  folded arms, the rock held at the chest in both hands, both arms raised, hands behind the back,
//            a hand on the head (the other on the hip), reaching forward + pointing up
//     row 4  seated: hands on the knees, a can at the chest; the old EP1 14.9 pose; the geared Chad: hanging, a can hugged
//            at the belly, the AK shouldered
//   t = 12..15: thumbs (open hands up, backs to us, waving, pushing out, presenting, on the knees...) in every view.
//   t = 8..12: motion. Rows of front, qf, q and side figures whose hands travel continuously through the row-1 targets
//   (near arm, then the far arm with farFront, then both arms folding and rising) for --strip checks.
//   node render.mjs --soft-gl --loop=arms --sheet=2 --cols=1 --w=1080 --out=out/arms3/sheet_q.jpg
(() => {
  const VIEWS = ['front', 'qf', 'q', 'side'];
  // the same targets on an older rig (for before/after sheets): reachArm aimed at armPose's points, nothing else
  const POSES0 = { hang: [2.2, -4.45, .35], hip: [2.25, -5.05, .1], belly: [.55, -6.0, 1.45], chest: [-.2, -7.0, 1.55], shoulder: [-1.15, -7.75, 1.25], fold: [-.3, -6.15, 1.6], hold: [.45, -6.7, 1.9], forward: [1.4, -7.6, 3.4], point: [1.9, -12.0, 1.8], raise: [2.0, -12.6, .2], head: [2.0, -11.3, .45], back: [-.35, -5.15, -1.5], knee: [1.0, -4.05, 2.1], lap: [.5, -4.7, 1.6] };
  const armPose = typeof window.armPose === 'function' ? window.armPose : (u, o, w, n, k = 1) => {
    const p = POSES0[n], th = { front: 0, qf: .3, q: .62, side: Math.PI / 2 }[o.view] || 0, s = w === 'R' ? 1 : -1, dr = clamp(o.crouch || 0) * 1.2 + clamp(o.sit || 0) * 2.05;
    const r = reachArm(u, o, w, (s * p[0] * Math.cos(th) + p[2] * Math.sin(th)) * u, (p[1] + dr) * u), key = w === 'L' ? ['aL', 'bendL', 'armKL'] : ['aR', 'bendR', 'armKR'];
    return { [key[0]]: lerp(o[key[0]] ?? -1.32, r[key[0]], k), [key[1]]: lerp(o[key[1]] ?? .22, r[key[1]], k), [key[2]]: lerp(o[key[2]] ?? 1, r[key[2]], k) };
  };
  const can = (u, sw) => beanCan(u * .9, sw, { open: true });
  const LAB1 = ['hang', 'hip', 'belly', 'chest', 'shoulder', 'raise'];
  const cell = (col, row) => [90 + col * 180, 430 + row * 480];
  const U = 25;
  function naked(x, y, o) { survivor(x, y, U, { ...HERO, eyes: 'normal', seed: 3, noShadow: false, rawArms: true, ...o }); }
  function chad(x, y, o) { survivor(x, y, U, { skin: 'tan', hair: 'buzz', hairCol: 'dark', gear: { mask: 'metal', chest: 'metal', kilt: 'roadsign', hoodie: true, hoodieCol: '#5F6B52', pants: true, boots: true, gloves: true }, seed: 4, rawArms: true, ...o }); }
  const label = (x, y, s) => letter(s, x, y + 26, 17, '#3A3040', { ink: false, screen: true });

  function page(view, flip) {
    const base = (k, extra = {}) => ({ view, flip, boilKey: `arms ${view} ${flip} ${k}`, ...extra });
    const pose = (o, ...pairs) => { for (const [w, n] of pairs) Object.assign(o, armPose(U, o, w, n)); return o; };
    // rows 1 and 2: one arm through the progression (the other hangs)
    ['L', 'R'].forEach((w, row) => LAB1.forEach((n, i) => {
      const [x, y] = cell(i, row), o = pose(base(row * 10 + i, { farFront: true, ['open' + w]: n === 'raise' }), [w, n]);
      naked(x, y, o); label(x, y, `${w} ${n}`);
    }));
    // row 3
    const r3 = [
      ['fold', o => pose(o, ['L', 'fold'], ['R', 'fold'])],
      ['hold rock', o => { pose(o, ['L', 'hold'], ['R', 'hold']); o[view === 'back' ? 'handR' : 'handL'] = (u, sw) => { push(); scale(.8); rockProp(u, sw); pop(); }; }],
      ['raise both', o => { pose(o, ['L', 'raise'], ['R', 'raise']); o.openL = o.openR = true; }],
      ['back both', o => pose(o, ['L', 'back'], ['R', 'back'])],
      ['head + hip', o => { pose(o, ['L', 'head'], ['R', 'hip']); o.openL = true; }],
      ['forward + point', o => { pose(o, ['L', 'forward'], ['R', 'point']); o.openR = true; }],
    ];
    r3.forEach(([lab, f], i) => { const [x, y] = cell(i, 2), o = base(20 + i, { farFront: true }); f(o); naked(x, y, o); label(x, y, lab); });
    // row 4
    const [x0, y0] = cell(0, 3), [x1, y1] = cell(1, 3), [x2, y2] = cell(2, 3);
    { const o = pose(base(30, { sit: 1, farFront: true }), ['L', 'knee'], ['R', 'knee']); naked(x0, y0, o); label(x0, y0, 'sit: knees'); }
    { const o = pose(base(31, { sit: 1, farFront: true }), ['L', 'hold'], ['R', 'lap']); o.handL = can; naked(x1, y1, o); label(x1, y1, 'sit: can'); }
    { const o = base(32, { aL: -1.2, bendL: .4, farFront: true, openR: true, crouch: .35 }); Object.assign(o, reachArm(U, o, 'R', 3.0 * U, -3.6 * U)); naked(x2, y2, o); label(x2, y2, 'EP1 14.9 pose'); }
    const [x3, y3] = cell(3, 3), [x4, y4] = cell(4, 3), [x5, y5] = cell(5, 3);
    chad(x3, y3, base(33)); label(x3, y3, 'Chad hang');
    { const o = base(34, { farFront: true }); Object.assign(o, reachArm(U, o, 'L', .15 * U, -5.7 * U), reachArm(U, o, 'R', -.35 * U, -6.1 * U)); o.handR = (u, sw) => beanCan(u * .9, sw, { open: true, rot: .25 }); chad(x4, y4, o); label(x4, y4, 'Chad can'); }
    { geared(x5, y5, U, { view, flip, boilKey: `arms ${view} ${flip} 35`, seed: 4, rawArms: true, aL: view === 'front' || view === 'qf' ? -.9 : -.18, bendL: view === 'front' || view === 'qf' ? 1.2 : .08, twoHand: true }); label(x5, y5, 'Chad AK'); }
  }
  // motion: the hand eases from target to target, 0.5 s each
  function motion(t) {
    const k = (t - 8) % 3.6, seq = ['hang', 'hip', 'belly', 'chest', 'shoulder', 'raise', 'hang'], i0 = Math.min(5, Math.floor(k / .6)), f = ease(clamp((k - i0 * .6) / .45));
    const step = (o, w) => { Object.assign(o, armPose(U * 1.2, o, w, seq[i0])); Object.assign(o, armPose(U * 1.2, o, w, seq[i0 + 1], f)); return o; };
    VIEWS.forEach((view, i) => {
      const x = 135 + i * 270, uu = U * 1.2;
      survivor(x, 600, uu, { ...HERO, seed: 3, ...step({ view, rawArms: true, boilKey: 'mo n ' + view }, 'L') });
      survivor(x, 1200, uu, { ...HERO, seed: 3, ...step({ view, rawArms: true, farFront: true, boilKey: 'mo f ' + view }, 'R') });
      const o = { view, flip: true, rawArms: true, farFront: true, boilKey: 'mo b ' + view }, g = .5 - .5 * Math.cos((t - 8) * TAU / 2.4);
      for (const w of ['L', 'R']) { Object.assign(o, armPose(uu, o, w, 'fold')); Object.assign(o, armPose(uu, o, w, 'raise', g)); }
      survivor(x, 1800, uu, { ...HERO, seed: 3, ...o });
    });
  }
  // thumbs: open hands in every view, both facings, bigger (U2) so the fingers are drawn. Palms to us with the hands up,
  // the thumbs point in (toward the head); the backs of the hands to us, out.
  //   pages 12, 14: front, qf, q, side; 13, 15: back, front flip, q flip, side flip.
  //   columns, pages 12-13: hands up, backs to us, wave, push out; 14-15: present (palm up), seated hands on the knees,
  //   a hand on the head (the other hanging open), the EP1 grip reach (open hand over a low point ahead).
  function thumbs(t) {
    const U2 = 30, p = Math.floor(t);
    const rows = p % 2 === 0 ? [['front', false], ['qf', false], ['q', false], ['side', false]] : [['back', false], ['front', true], ['q', true], ['side', true]];
    const pose = (o, ...pairs) => { for (const [w, n] of pairs) Object.assign(o, armPose(U2, o, w, n)); return o; };
    // a point ahead of his chest (body frame: X across, Y height, Z forward) on screen
    const fwdPt = (o, X, Z, Y) => { const th = { front: 0, qf: .3, q: .62, side: Math.PI / 2, back: 0 }[o.view], zs = o.view === 'back' ? -1 : 1; return [(X * Math.cos(th) + Z * zs * Math.sin(th)) * U2, Y * U2]; };
    const cols = p < 14 ? [
      ['hands up', o => { pose(o, ['L', 'raise'], ['R', 'raise']); o.openL = o.openR = true; }],
      ['backs to us', o => { pose(o, ['L', 'raise'], ['R', 'raise']); o.openL = o.openR = true; o.palmL = o.palmR = 'back'; }],
      ['wave', o => { pose(o, ['L', 'point']); o.openL = true; }],
      ['push out', o => { Object.assign(o, reachArm(U2, o, 'R', ...fwdPt(o, 1.7, 3.0, -8.4))); o.openR = true; }],
    ] : [
      ['present', o => { Object.assign(o, reachArm(U2, o, 'R', ...fwdPt(o, 1.9, 2.8, -6.2))); o.openR = true; o.palmR = 'up'; }],
      ['sit: knees', o => { o.sit = 1; pose(o, ['L', 'knee'], ['R', 'knee']); o.openL = o.openR = true; }],
      ['head + hang', o => { pose(o, ['L', 'head']); o.openL = o.openR = true; }],
      ['grip reach', o => { o.crouch = .35; o.aL = -1.2; o.bendL = .4; Object.assign(o, reachArm(U2, o, 'R', ...fwdPt(o, 1.0, 2.0, -3.6))); o.openR = true; }],
    ];
    for (let r = 1; r < 4; r++) inkLine([[0, r * 480], [W, r * 480]], .6, PAL.ink, 'inkfine', 0);
    letter('thumbs', 540, 24, 22, '#3A3040', { ink: false, screen: true });
    rows.forEach(([view, flip], row) => cols.forEach(([lab, f], i) => {
      const x = 135 + i * 270, y = 462 + row * 480, o = { view, flip, boilKey: `th ${p} ${view} ${flip} ${i}`, farFront: true };
      f(o); survivor(x, y, U2, { ...HERO, eyes: 'normal', seed: 3, rawArms: true, ...o }); label(x, y - 8, `${view}${flip ? ' F' : ''} ${lab}`);
    }));
  }
  LOOPS.arms = t => {
    boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE6D6', ink: null });
    if (t >= 12) return thumbs(t);
    if (t >= 8) return motion(t);
    const p = Math.floor(t), view = VIEWS[p >> 1], flip = !!(p & 1);
    for (let r = 1; r < 4; r++) inkLine([[0, r * 480], [W, r * 480]], .6, PAL.ink, 'inkfine', 0);
    letter(`${view}${flip ? ' (flip)' : ''}`, 540, 24, 22, '#3A3040', { ink: false, screen: true });
    page(view, flip);
  };
  LOOPS.arms.len = 16;
})();
