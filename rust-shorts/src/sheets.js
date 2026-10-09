// sheets.js: model sheets as standalone loops (studio.html?ep=0&loop=kit). Not part of any episode.
(() => {
  LOOPS.kit = t => {
    rustSky(t, { horizon: 860, sun: [820, 300] });
    hills(t, { horizon: 860 });
    seaBeach(t, { horizon: 860, shore: 1060 });
    pineTree(150, 1160, 1.75, { hit: frac(t) * 1.2, mark: true, markK: 1, markY: -150 });
    oreNode(1050, 1180, .7, 'metal', { glint: true });
    bush(990, 1600, .8);
    spawnling(470, 1240, 26, { ...feel('happy', t), view: 'front', rawArms: true, aL: -1.25, aR: .9 + .2 * Math.sin(t * 9), bendR: -.6, prop: 'none', handR: (u, sw) => { push(); rotate(-.5); rockProp(u, sw); pop(); } });   // waving his rock
    spawnling(190, 1740, 44, { ...feel('neutral', t), skin: 'tan', prop: 'torch', view: 'front' });
    geared(800, 1740, 44, { ...feel('determined', t), view: 'q', flip: true, rawArms: true, aL: -.18, bendL: .08, gunRot: -.12, twoHand: true });   // shouldered, covering the beach
  };
  LOOPS.kit.len = 2;
})();
(() => {
  LOOPS.base = t => {
    boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE6D6', ink: null });
    // wall grades
    ['twig', 'wood', 'stone', 'metal', 'armor'].forEach((g, i) => wallPanel(30 + (i % 3) * 350, 520 + Math.floor(i / 3) * 420, 300, 360, g, { damage: i === 2 ? 1 : 0 }));
    // doors with locks
    ['wood', 'metal', 'garage', 'armor'].forEach((k, i) => { const x = 40 + i * 260, y = 1330; doorPanel(x, y, 200, 330, k, { open: 0 }); codeLock(x + 170, y - 180, .7, ['locked', 'open', 'set', 'locked'][i], { press: i === 2 ? 4 : -1 }); });
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
    ['happy', 'angry', 'scared', 'sad', 'surprised'].forEach((e, i) => { const f = feel(e, t + i); spawnling(125 + i * 207, 1170, 25, { ...f, aL: Math.min(f.aL ?? .2, .7), aR: Math.min(f.aR ?? .2, .7), view: 'front', prop: i === 0 ? 'torch' : 'rock' }); });
    // row 3: a side-view walk, the geared player, a hazmat
    spawnling(170, 1750, 30, { ...feel('determined', t), view: 'side', walk: t * 2, aL: .2 + .4 * Math.sin(t * TAU * 2) });
    geared(560, 1750, 30, { ...feel('determined', t), view: 'q', flip: true, rawArms: true, aL: -.25, bendL: .1, twoHand: true });
    survivor(900, 1750, 30, { ...feel('neutral', t), gear: { hazmat: true }, view: 'front' });
  };
  LOOPS.naked.len = 2;
})();
(() => {
  // the suits, true to the game icons: hazmat in three views, the scientist variants, and the sooted naked
  LOOPS.suits = t => {
    boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE6D6', ink: null });
    for (const yy of [610, 1180, 1760]) inkLine([[0, yy], [W, yy]], .6, PAL.ink, 'inkfine', 0);
    ['front', 'q', 'side', 'back'].forEach((v, i) => survivor(140 + i * 265, 600, 30, { ...feel('neutral', t), gear: { hazmat: true }, view: v, rawArms: true, aL: -1.25, aR: -1.25, boilKey: 'haz' + v }));
    ['peacekeeper', 'arctic', 'naval', 'nvgm', 'outbreak'].forEach((k, i) => survivor(115 + i * 212, 1170, 25, { ...feel('neutral', t), gear: { scientist: k }, view: i % 2 ? 'q' : 'front', rawArms: true, aL: -1.25, aR: -1.25, boilKey: 'sci' + k }));
    spawnling(180, 1750, 30, { ...feel('neutral', t), soot: .9, frizz: 1, view: 'front' });
    spawnling(470, 1750, 30, { ...feel('surprised', t), soot: .6, frizz: .6, view: 'q' });
    survivor(800, 1750, 30, { ...feel('determined', t), gear: { scientist: 'peacekeeper' }, view: 'side', rawArms: true, aL: -1.25, aR: -1.25, boilKey: 'sciside' });
  };
  LOOPS.suits.len = 2;
})();
