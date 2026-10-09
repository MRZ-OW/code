// props.js: small held and set props for the episodes (references: the official item icons in scratchpad/refimg).
// Held props are drawn in hand space like rustcast.js's: (0, 0) = the hand, +x = forward, u = the holder's unit.
// Set props take a ground point (x, y) and a scale s.
//   campfire(x, y, s, t, o)       ring of grey stones, a teepee of logs, a flickering flame. o.fire 0..1 (0 = embers + smoke)
//   beanCan(u, sw, o)             held "OH WOW! BEANS!" can: a maroon label, a silver lid. o.open, o.spoon, o.rot
//   beanCanAt(x, y, s, o)         the same can standing or lying on the ground (o.lying)
//   flower(x, y, s, o)            a little white wildflower on a stem (o.rot, o.stem 0..1)

function campfire(x, y, s = 1, t = T, o = {}) {
  const fire = o.fire ?? 1, u = 100 * s, sw = clamp(s * 2.2, .6, 3);
  boilSeed('campfire-glow');
  if (fire > .02) glow(x, y - .5 * u, 2.6 * u * (.7 + .3 * fire), '#FFB04A', .85 * fire);
  // back stones
  const stone = (i, front) => {
    const a = i / 9 * TAU, sx = x + Math.cos(a) * 1.05 * u, sy = y + Math.sin(a) * .32 * u;
    if ((Math.sin(a) > 0) !== front) return;
    boilSeed('cf-stone' + i);
    paint(ellPts(sx, sy - .12 * u, (.3 + .08 * hash(i)) * u, (.2 + .05 * hash(i + 3)) * u, 10, u * .02), { wash: mixCol('#9EA1A3', '#6D7175', hash(i + 7)), ink: PAL.ink, sw: sw * .8 });
  };
  for (let i = 0; i < 9; i++) stone(i, false);
  // logs in a teepee, charred at the tips
  const logs = [[-.75, .05, -.12, -1.0], [.8, .08, .1, -1.0], [-.25, .18, .25, -.95], [.35, .2, -.3, -.9]];
  logs.forEach(([x0, y0, x1, y1], i) => {
    boilSeed('cf-log' + i);
    paint(ribbon([[x + x0 * u, y + y0 * u], [x + x1 * u, y + y1 * u]], .2 * u, .14 * u), { wash: i % 2 ? '#7A5534' : '#8C6440', ink: PAL.ink, sw: sw * .7 });
    inkLine([[x + lerp(x0, x1, .65) * u, y + lerp(y0, y1, .65) * u], [x + x1 * u, y + y1 * u]], .14 * u, '#2E2620', 'ink', 0);
  });
  // flames: three layered tongues that flicker; at low fire only embers glow and smoke rises
  if (fire > .02) {
    const f = k => 1 + .14 * Math.sin(t * 17 + k) + .09 * Math.sin(t * 29 + k * 2);
    const tongue = (cx, w, h, col, k) => {
      const hh = h * fire * f(k), sway = .12 * u * Math.sin(t * 7 + k);
      return [[cx - w, y - .1 * u], [cx - w * .7, y - hh * .45], [cx - w * .2 + sway, y - hh * .8], [cx + sway * 1.4, y - hh], [cx + w * .35 + sway, y - hh * .7], [cx + w * .75, y - hh * .35], [cx + w, y - .1 * u]];
    };
    boilSeed('cf-flame');
    paint(tongue(x, .62 * u, 1.9 * u, '#E8692C', 0), { wash: '#E8692C', ink: PAL.ink, sw: sw * .6, curv: .45 });
    paint(tongue(x - .05 * u, .42 * u, 1.45 * u, '#F7A23B', 1.3), { wash: '#F7A23B', ink: null, curv: .45 });
    paint(tongue(x + .02 * u, .22 * u, .9 * u, '#FFE38A', 2.1), { wash: '#FFE38A', ink: null, curv: .45 });
    for (let i = 0; i < 3; i++) {   // embers flying up
      const k = frac(t * .9 + i / 3), ex = x + (hash(i + Math.floor(t * .9 + i / 3) * 3) - .5) * 1.2 * u + .3 * u * Math.sin(k * 5 + i), ey = y - (1 + 2.4 * k) * u;
      boilSeed('cf-ember' + i); paint(ellPts(ex, ey, .05 * u * (1 - k), .05 * u * (1 - k), 6), { wash: '#FFD27A', ink: null });
    }
  } else {
    boilSeed('cf-embers');
    paint(ellPts(x, y - .05 * u, .55 * u, .16 * u, 12), { wash: '#C2462A', washOp: 220, ink: null });
    glow(x, y - .1 * u, 1.1 * u, '#FF7A3A', .5);
  }
  if (o.smoke ?? (1 - fire) > .1) for (let i = 0; i < 4; i++) {
    const k = frac(t * .35 + i / 4), sx = x + .4 * u * Math.sin(k * 4 + i), sy = y - (1.2 + 4.5 * k) * u, r = (.25 + .7 * k) * u;
    boilSeed('cf-smoke' + i); paint(ellPts(sx, sy, r, r * .8, 12), { wash: '#9B9AA6', washOp: 120 * (1 - k) * (o.smoke ?? 1), ink: null });
  }
  for (let i = 0; i < 9; i++) stone(i, true);
}

// The can (reference: can.beans): a maroon label with a pale stripe and a white scrawl, silver rims, a pull-tab lid.
function beanCanShape(u, sw, o = {}) {
  const w = .62 * u, h = .95 * u, rim = '#B9BDC1';
  paint(ellPts(0, h / 2, w, .18 * u, 16), { wash: '#8E9297', ink: PAL.ink, sw: sw * .6 });                       // bottom rim
  paint(rectPts(-w, -h / 2, w * 2, h), { wash: '#8C2A2E', ink: null });                                           // label
  inkLine([[-w, -h / 2], [-w, h / 2]], sw * .6, PAL.ink, 'ink', 0); inkLine([[w, -h / 2], [w, h / 2]], sw * .6, PAL.ink, 'ink', 0);
  paint(rectPts(-w, -.06 * u, w * 2, .2 * u), { wash: '#C9B79A', washOp: 200, ink: null });                       // label stripe
  inkLine([[-.38 * w, .32 * u], [-.1 * w, .24 * u], [.2 * w, .33 * u], [.5 * w, .25 * u]], sw * .5, '#F4ECDD', 'inkfine', .5);   // the "BEANS!" scrawl
  paint(ellPts(-.45 * w, .2 * u, .07 * u, .05 * u, 6), { wash: '#D8873E', ink: null });
  paint(ellPts(.55 * w, .1 * u, .07 * u, .05 * u, 6), { wash: '#D8873E', ink: null });
  paint(ellPts(0, -h / 2, w, .2 * u, 18), { wash: o.open ? '#7A3B22' : rim, ink: PAL.ink, sw: sw * .6 });         // the top
  if (o.open) {
    for (let i = 0; i < 6; i++) paint(ellPts((hash(i) - .5) * 1.2 * w, -h / 2 + (hash(i + 4) - .5) * .18 * u, .09 * u, .06 * u, 6), { wash: '#C9733A', ink: null });
    paint([[-w * .9, -h / 2 - .05 * u], [-w * .3, -h / 2 - .45 * u], [w * .3, -h / 2 - .5 * u], [w * .6, -h / 2 - .1 * u]], { wash: rim, ink: PAL.ink, sw: sw * .5, curv: .4 });   // curled-back lid
  } else paint(ellPts(.3 * w, -h / 2, .12 * u, .06 * u, 8), { wash: '#8E9297', ink: null });                    // pull tab
  if (o.spoon) { inkLine([[.1 * u, -h / 2 + .05 * u], [.35 * u, -h / 2 - .55 * u]], sw * 1.2, '#9DA3A8', 'ink', 0); paint(ellPts(.38 * u, -h / 2 - .62 * u, .1 * u, .14 * u, 8, 0, .4), { wash: '#B9BDC1', ink: PAL.ink, sw: sw * .4 }); }
}
function beanCan(u, sw, o = {}) { push(); translate(.25 * u, -.35 * u); rotate(o.rot || 0); beanCanShape(u, sw, o); pop(); }
function beanCanAt(x, y, s = 1, o = {}) {
  const u = 60 * s, sw = clamp(s * 2, .6, 3);
  boilSeed('beancan-at' + (o.key || ''));
  push(); translate(x, y - (o.lying ? .62 * u : .55 * u)); rotate(o.lying ? Math.PI / 2 + (o.rot || 0) : (o.rot || 0)); beanCanShape(u, sw, o); pop();
}

function flower(x, y, s = 1, o = {}) {
  const u = 40 * s, sw = clamp(s * 1.6, .5, 2.5), st = o.stem ?? 1;
  boilSeed('flower' + (o.key || ''));
  push(); translate(x, y); rotate(o.rot || 0);
  if (st > 0) {
    inkLine([[0, 0], [.08 * u, -.6 * u * st], [0, -1.2 * u * st]], sw * 1.2, '#4E7A3A', 'ink', .5);
    paint(ellPts(.22 * u, -.45 * u * st, .2 * u, .08 * u, 8, 0, -.5), { wash: '#6E9F58', ink: PAL.ink, sw: sw * .4 });
  }
  const cy = -1.2 * u * st;
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3; paint(ellPts(Math.cos(a) * .26 * u, cy + Math.sin(a) * .26 * u, .2 * u, .12 * u, 10, 0, a), { wash: '#FBF6EC', ink: PAL.ink, sw: sw * .45 }); }
  paint(ellPts(0, cy, .13 * u, .13 * u, 10), { wash: '#F2C230', ink: PAL.ink, sw: sw * .4 });
  pop();
}
