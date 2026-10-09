// castsheet.js: model sheet of the cast and effects (?loop=cast), for checking designs. Not part of the video.
(() => {
  LOOPS.cast = t => {
    boilSeed('bg');
    paint(rectPts(-50, -50, W + 100, H + 100), { wash: '#EFE6D6', ink: null });
    inkLine([[0, 470], [W, 470]], .6, PAL.ink, 'inkfine', 0); inkLine([[0, 1000], [W, 1000]], .6, PAL.ink, 'inkfine', 0);
    // row 1: neutral poses
    mercy(220, 470, 22, { ...feel('happy', t) });
    rein(590, 470, 24, { ...feel('determined', t) });
    tracer(960, 470, 22, { ...feel('playful', t) });
    genji(1320, 470, 22, { ...feel('cool', t), eyes: 'normal' });
    cowboy(1690, 470, 22, { ...feel('smug', t), hatTip: .8 });
    // row 2: action poses + effects
    const mo = { ...feel('starstruck', t), wing: 1, aL: 1.3, aR: 1.3, staffGlow: 1 };
    mercy(260, 960, 20, mo);
    const head = staffHead(260, 960, 20, mo);
    healBeam(head[0], head[1], 520, 700, t, 1);
    barrier(760, 1000, 300, 380, t, 1);
    rein(640, 1000, 20, { ...feel('determined', t), aR: .4, hammer: .9 });
    blinkTrail(880, 1000, 1080, 1000, 20, .1);
    tracer(1080, 1000, 20, { ...feel('excited', t), view: 'q' });
    genji(1360, 1000, 20, { ...feel('determined', t), view: 'q', blade: 1, aL: 1.0, bladeRot: .2 });
    cowboy(1680, 1000, 20, { ...feel('cool', t), view: 'q', flip: true, aL: .3, fire: .9, eyes: 'red' });
    healCall(1320, 640, 34, 1, t);
    heartCall(1460, 640, 30, 1, .2);
    skullMark(1600, 640, 34, 1, .7);
    healCall(560, 330, 26, 1, t);
  };
  LOOPS.cast.len = 2;
})();
