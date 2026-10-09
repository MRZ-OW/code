// sheets.js: model sheets as standalone loops (studio.html?ep=0&loop=kit). Not part of any episode.
(() => {
  LOOPS.kit = t => {
    rustSky(t, { horizon: 860, sun: [820, 300] });
    hills(t, { horizon: 860 });
    seaBeach(t, { horizon: 860, shore: 1060 });
    pineTree(170, 1150, .75, { hit: frac(t) * 1.2, mark: true, markK: 1 });
    oreNode(900, 1180, .7, 'metal', { glint: true });
    bush(980, 1650, .8);
    spawnling(420, 1330, 34, { ...feel('happy', t), view: 'q', aL: .9 + .5 * Math.sin(t * 6), propRot: .3 });
    spawnling(300, 1720, 26, { ...feel('neutral', t), skin: 'tan', prop: 'torch', view: 'front', aR: .3 });
    geared(760, 1720, 34, { ...feel('determined', t), view: 'q', flip: true, aL: .15, fire: frac(t * 4) < .25 ? 1 : 0 });
  };
  LOOPS.kit.len = 2;
})();
(() => {
  LOOPS.base = t => {
    boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE6D6', ink: null });
    // wall grades
    ['twig', 'wood', 'stone', 'metal', 'armor'].forEach((g, i) => wallPanel(30 + (i % 3) * 350, 520 + Math.floor(i / 3) * 420, 300, 360, g, { damage: i === 2 ? 1 : 0 }));
    // doors with locks
    ['wood', 'metal', 'garage', 'armor'].forEach((k, i) => { const x = 40 + i * 260, y = 1330; doorPanel(x, y, 200, 330, k, { open: i === 1 ? .6 : 0 }); codeLock(x + 170, y - 180, .7, ['locked', 'open', 'set', 'locked'][i], { press: i === 2 ? 4 : -1 }); });
    foundation(40, 1040, 1380);
    toolCupboard(130, 1700, .9); sleepingBag(400, 1700, .8); furnace(640, 1700, .8, 1, t); woodBox(900, 1700, .7);
    c4(160, 1830, 1.1, 1, 2); beancan(330, 1870, 1.1, .6 + .3 * Math.sin(t * 3));
    explosion(780, 1780, 90, frac(t / 1.8) * 1.8);
  };
  LOOPS.base.len = 1.8;
})();
(() => {
  LOOPS.naked = t => {
    boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE6D6', ink: null });
    for (const yy of [610, 1180, 1760]) inkLine([[0, yy], [W, yy]], .6, PAL.ink, 'inkfine', 0);
    // row 1: the four views of the hero, holding the rock
    ['front', 'q', 'side', 'back'].forEach((v, i) => spawnling(140 + i * 265, 600, 32, { ...feel('neutral', t), view: v }));
    // row 2: emotions
    ['happy', 'angry', 'scared', 'sad', 'surprised'].forEach((e, i) => spawnling(110 + i * 215, 1170, 27, { ...feel(e, t + i), view: 'front', prop: i === 0 ? 'torch' : 'rock' }));
    // row 3: a side-view walk, the geared player, a hazmat
    spawnling(170, 1750, 30, { ...feel('determined', t), view: 'side', walk: t * 2, aL: .2 + .4 * Math.sin(t * TAU * 2) });
    geared(560, 1750, 30, { ...feel('determined', t), view: 'q', flip: true, aL: .9 });
    survivor(900, 1750, 30, { ...feel('neutral', t), gear: { hazmat: true }, view: 'front' });
  };
  LOOPS.naked.len = 2;
})();
