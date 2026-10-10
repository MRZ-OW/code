// headsheet.js: a model sheet for heads.js. The head in every view, big: three rows of moods (calm; shouting; furious,
// electrocuted and sooty), five views each (front, qf, q, side, back).
//   node render.mjs --ep=0 --loop=heads --chrome=/opt/pw-browsers/chromium --xvfb --sheet=0.2 --cols=1 --crop=0,200,1080,240 --w=1600 --out=...
// (rows of heads at y 200-440, 800-1040 and 1400-1640)
(() => {
  LOOPS.heads = t => {
    boilSeed('bg'); paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE6D6', ink: null });
    const rows = [{ eyes: 'normal' }, { eyes: 'wide', mouth: 'O' }, { eyes: 'angry', mouth: 'grin', frizz: .8, soot: .7 }];
    rows.forEach((r, j) => ['front', 'qf', 'q', 'side', 'back'].forEach((v, i) =>
      survivor(112 + i * 214, 700 + j * 600, 36, { ...HERO, ...r, view: v, seed: 9, noShadow: true, boilKey: 'hd' + i + j })));
  };
  LOOPS.heads.len = 1;
})();
