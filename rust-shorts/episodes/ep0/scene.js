// ep0: engine test — Clawd on a beach in a vertical frame.
(() => {
  function test(t, lt, dur) {
    boilSeed('sky'); paint(rectPts(-100, -100, W + 200, 1200), { wash: '#9BCFE0', ink: null });
    boilSeed('sea'); paint(rectPts(-100, 1000, W + 200, 260), { wash: '#4E9DB5', ink: null });
    boilSeed('sand'); paint(rectPts(-100, 1240, W + 200, 800), { wash: '#E8D2A2', ink: PAL.ink, sw: 1 });
    clawd(540, 1380, 40, feel('happy', t));
  }
  shots([[0, test]]);
})();
