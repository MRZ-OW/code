// ep5 "Naked Privilege": the patrol heli scans the Naked and lets him go (it only hunts geared players). He tests the
// rule one clothing piece at a time, trolls the heli while it shreds everyone else, then picks up one AK. Boom. The heli
// scans him again and moves on. Shot list: SCRIPT.md.
(() => {
  const G = 1360, U = 36, NX = 450;     // the Naked's ground line, unit and spot (the wide shots of S1)
  const NK = 'naked';
  const CHAD_GEAR = { gear: { mask: 'metal', chest: 'metal', kilt: 'roadsign', hoodie: true, hoodieCol: '#5F6B52', pants: true, boots: true, gloves: true }, skin: 'tan', hair: 'buzz', hairCol: 'dark' };
  const SOOT = { tint: '#2E2622', tintK: .85, tintBody: true, briefs: mixCol(BRIEFS.col, '#2E2622', .7), frizz: 1 };   // scorched: his briefs too, whatever colour the rig gives them
  const HOODIE = '#A8382E', HOODIE_LN = '#B9B6AE', PANTS = '#3D4248', HAT = '#9A9C96', HAT_DK = '#74766F', HAT_BAND = '#45453F';

  // ---------- camera helpers ----------
  // Every shot uses one camera (world space). scr(fn) draws fn in SCREEN space at that point of the paint order (the
  // backdrop, the heli and its weapons are laid out on the screen); sc() / ws() convert world ↔ screen.
  function scr(fn) { if (!CAM) return fn(); push(); translate(CAM.cx, CAM.cy); scale(1 / CAM.zoom); translate(-W / 2, -H / 2); fn(); pop(); }
  const sc = (x, y) => toScreen(x, y);
  const ws = (sx, sy) => [CAM.cx + (sx - W / 2) / CAM.zoom, CAM.cy + (sy - H / 2) / CAM.zoom];
  const grade = (col, op) => scr(() => { boilSeed('grade' + col); paint(rectPts(-60, -60, W + 120, H + 120), { wash: col, washOp: op, ink: null }); });

  // ---------- the set: a grassy plain, a monument in the haze ----------
  // Backdrop in screen space (sky, far hills, the oil tanks and the radio tower, a treeline), so it stays far away
  // whatever the camera's zoom: hy = where the horizon lands on screen, pan = a small sideways shift (parallax).
  function backdrop(t, hy, pan = 0) {
    rustSky(t, { horizon: hy, sun: [905 + pan * .2, 230], clouds: true });
    staticSeed('e5farhills');
    const P = [[-200, hy + 6]]; for (let i = 0; i <= 18; i++) { const x = -200 + i * 85 + pan * .3; P.push([x, hy - 34 - 30 * Math.sin(i * 1.1 + .5) - 22 * hash(i + 4)]); }
    P.push([W + 200, hy + 6]);
    paint(P, { wash: '#A9C0B4', ink: null, curv: .4 });
    monument(t, hy, pan);
    staticSeed('e5haze'); paint(rectPts(-100, hy - 150, W + 200, 152), { fill: '#E4EEEA', fillOp: 70, bleed: .2, tex: .2, border: .4, ink: null });
    staticSeed('e5treeline');
    const Q = [[-200, hy + 8]]; for (let i = 0; i <= 44; i++) { const x = -200 + i * 34 + pan * .5; Q.push([x, hy - 6 - 14 * hash(i + 21) - (i % 7 === 3 ? 10 : 0)], [x + 17, hy - 3 - 5 * hash(i + 40)]); }
    Q.push([W + 200, hy + 8]);
    paint(Q, { wash: '#7E9C78', ink: null });
  }
  // The monument (reference: Rust's oil refinery and its storage tanks): three big squat grey tanks with domed tops,
  // bands and a ladder, pipes between them, and a lattice radio tower with a red light. Pale and inkless: it's hazy.
  function monument(t, hy, pan) {
    const ox = pan * .35, line = '#7E898E';
    const tank = (cx, w, h, k) => {
      staticSeed('e5tank' + k);
      const x0 = cx - w / 2, top = hy - h, dome = w * .16;
      paint([[x0, hy + 4], [x0, top], [x0 + w * .2, top - dome * .7], [cx, top - dome], [x0 + w * .8, top - dome * .7], [x0 + w, top], [x0 + w, hy + 4]], { wash: k % 2 ? '#B3BBBD' : '#A9B2B5', ink: line, sw: .5, curv: .25 });
      paint(rectPts(x0 + w * .62, top - dome * .5, w * .38, h + dome * .5 + 4), { wash: '#98A2A6', washOp: 150, ink: null });   // the shaded side
      for (const f of [.3, .62]) inkLine([[x0 + 2, top + h * f], [x0 + w - 2, top + h * f]], .45, line, 'inkfine', 0);
      inkLine([[x0 + w * .28, hy], [x0 + w * .36, top + 4], [x0 + w * .44, top - dome * .7]], .5, '#6E787D', 'inkfine', .3);   // the ladder
      paint(rectPts(x0 + w * .14, top + h * .36, w * .09, h * .4), { wash: '#B08A70', washOp: 110, ink: null });   // a rust streak
    };
    tank(70 + ox, 150, 96, 0); tank(215 + ox, 120, 74, 1); tank(332 + ox, 96, 58, 2);
    staticSeed('e5pipes'); inkLine([[60 + ox, hy - 24], [380 + ox, hy - 24]], .9, line, 'inkfine', 0); inkLine([[150 + ox, hy - 40], [160 + ox, hy - 40], [160 + ox, hy - 10]], .7, line, 'inkfine', 0);
    // the radio tower: a tall tapering lattice on the right
    const tx = 795 + ox, th = 330, top = hy - th, w0 = 34, w1 = 7;
    staticSeed('e5tower');
    const L = k => [tx - lerp(w0, w1, k), hy - th * k], R = k => [tx + lerp(w0, w1, k), hy - th * k];
    inkLine([L(0), L(1)], 1.4, '#8A959A', 'ink', 0); inkLine([R(0), R(1)], 1.4, '#8A959A', 'ink', 0);
    for (let i = 0; i < 9; i++) { const a = i / 9, b = (i + 1) / 9; inkLine([L(a), R(b)], .6, '#8A959A', 'inkfine', 0); inkLine([R(a), L(b)], .6, '#8A959A', 'inkfine', 0); inkLine([L(b), R(b)], .5, '#8A959A', 'inkfine', 0); }
    paint(rectPts(tx - 18, top + 40, 36, 7), { wash: '#8A959A', ink: null });   // a platform with dishes
    paint(ellPts(tx - 22, top + 30, 7, 10, 10), { wash: '#A3ACB0', ink: line, sw: .4 });
    inkLine([[tx, top], [tx, top - 46]], .8, '#8A959A', 'inkfine', 0);
    const blink = frac(t * .8) < .5;
    paint(ellPts(tx, top - 48, 3.5, 3.5, 8), { wash: blink ? '#FF5A4A' : '#9A4A44', ink: null });
    if (blink) glow(tx, top - 48, 22, '#FF5A4A', .6);
  }
  // The ground plane (world space): grass from the horizon down, hazier far away, with tufts. Each shot sets HZc, its
  // horizon (world y): how high its camera sits above his ground line G. wind: [x, k] blows the tufts away from x (a
  // heli's downwash). depthU(y) = a person's unit standing at ground line y (perspective).
  let HZc = 1180;
  const depthU = y => U * (y - HZc) / (G - HZc);
  function ground(t, o = {}) {
    const d = G - HZc;
    staticSeed('e5ground');
    paint(rectPts(-1600, HZc - 3, 4300, 2900), { wash: '#8DAA62', ink: null });
    paint(rectPts(-1600, HZc - 3, 4300, d * .25), { fill: '#B4C49A', fillOp: 170, bleed: .15, tex: .2, border: .3, ink: null });
    paint(rectPts(-1600, HZc + d * .18, 4300, d * .55), { fill: '#A5BA86', fillOp: 110, bleed: .2, tex: .3, border: .3, ink: null });
    for (let i = 0; i < 8; i++) {   // darker patches of grass
      staticSeed('e5patch' + i); const py = HZc + d * (.35 + 2.6 * hash(i + 9)), px = -500 + hash(i + 3) * 2100, r = (60 + 90 * hash(i + 1)) * (py - HZc) / d + 30;
      paint(ellPts(px, py, r * 1.6, r * .26, 16, 3), { fill: '#7A9A56', fillOp: 110, bleed: .2, tex: .3, border: .3, ink: null });
    }
    for (const f of [.22, .5, .85, 1.3, 1.85, 2.5]) tufts(t, -700, 1800, HZc + d * f, f < .6 ? 12 : 10, .3 + .62 * f, o.wind);
  }
  function tufts(t, x0, x1, y, n, s, wind) {
    for (let i = 0; i < n; i++) {
      boilSeed('e5tuft' + i + ',' + y);
      const x = lerp(x0, x1, hash(i * 3.1 + y * .37)), h = (18 + 14 * hash(i + y)) * s;
      let lean = Math.sin(t * 1.4 + i) * 3 * s;
      if (wind) { const d = x - wind[0], f = wind[1] * Math.exp(-Math.abs(d) / 420); lean += Math.sign(d || 1) * f * (14 + 6 * Math.sin(t * 19 + i)) * s; }
      const col = mixCol('#5F8040', '#86A06A', clamp((1.1 - s) * .8));
      for (const k of [-1, 0, 1]) inkLine([[x + k * 6 * s, y], [x + k * 11 * s + lean, y - h * (k ? .8 : 1)]], .75 * Math.min(1.2, s + .2), col, 'inkfine', .4);
    }
  }

  // ---------- props ----------
  // The boonie hat (reference: hat.boonie): grey cloth, a round crown with a dark band and an eyelet, a wide floppy
  // brim. (x, y) = the brim's centre, r = the brim's half-width; o.view 'front' | 'q' (crown shifted toward +x) | 'side'.
  function boonie(x, y, r, o = {}) {
    const sw = o.sw ?? clamp(r / 40, .5, 1.6), q = o.view === 'q' ? .12 : 0, side = o.view === 'side', tilt = o.rot || 0;
    push(); translate(x, y); rotate(tilt);
    const bw = r * (side ? 1.08 : 1), bh = r * (o.flat ? .55 : .22), cx = r * (q + (side ? .05 : 0));
    // back half of the brim
    paint(ellPts(0, 0, bw, bh, 24), { wash: HAT_DK, ink: PAL.ink, sw: sw * .8 });
    // crown
    const cw = r * .6, ch = r * .62, C = [[cx - cw, 0], [cx - cw * .98, -ch * .55], [cx - cw * .7, -ch * .92], [cx, -ch], [cx + cw * .7, -ch * .92], [cx + cw * .98, -ch * .55], [cx + cw, 0]];
    paint(C, { wash: HAT, ink: PAL.ink, sw: sw * .85, curv: .35 });
    paint([[cx - cw * .9, -ch * .2], [cx - cw * .75, -ch * .8], [cx - cw * .25, -ch * .9], [cx - cw * .45, -ch * .3]], { wash: '#B4B6B0', washOp: 140, ink: null, curv: .3 });
    inkLine([[cx - cw * .05, -ch * .96], [cx + cw * .1, -ch * .55]], sw * .35, HAT_DK, 'inkfine', .3);   // a seam
    paint([[cx - cw * 1.01, -ch * .1], [cx + cw * 1.01, -ch * .1], [cx + cw * 1.0, -ch * .36], [cx - cw * 1.0, -ch * .36]], { wash: HAT_BAND, ink: PAL.ink, sw: sw * .5 });   // the band
    paint(ellPts(cx + cw * (q ? .55 : .5), -ch * .52, r * .035, r * .035, 8), { wash: '#3A3A36', ink: null });   // eyelet
    // the front of the brim, drooping a little at the sides
    const F = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI, dr = 1 + .05 * Math.sin(a * 3); F.push([Math.cos(a) * bw * dr, Math.sin(a) * bh * dr + bh * .12 * Math.pow(Math.cos(a), 2)]); }
    F.push([-bw * .7, -bh * .1], [bw * .7, -bh * .1]);
    paint([F[0], ...F.slice(1, 16), F[16], [-bw * .92, -bh * .05], [0, -bh * .02], [bw * .92, -bh * .05]].reverse(), { wash: HAT, ink: PAL.ink, sw: sw * .85, curv: .2 });
    inkLine(F.slice(2, 15).map(([a, b]) => [a * .86, b * .86 - bh * .1]), sw * .3, HAT_DK, 'inkfine', .3);   // stitching on the brim
    pop();
  }
  // the hat on a survivor's head (a draw hook): drop = how far crouch/sit lowered the head
  function hatOn(u, V, drop = 0, o = {}) {
    const R = 2.35 * u, hcy = -10.85 * u + drop, q = V === SV.q, side = V === SV.side;
    boilSeed('e5hat-on' + (o.key || ''));
    boonie(q ? .35 * u : side ? .2 * u : 0, hcy - .68 * R + (o.dy || 0) * u, 1.3 * R, { view: q ? 'q' : side ? 'side' : 'front', rot: (o.rot || 0) + (q ? .05 : 0), sw: clamp(u / 16, .45, 2.4) });
  }
  // Sunglasses (reference: the sunglasses icon): black wayfarers with dark lenses and a glint. A draw hook on the face;
  // slide 0..1 slides them down the nose so the eyes show over the top.
  function shadesOn(u, sw, V, drop = 0, slide = 0) {
    if (V.back) return;
    const hcy = -10.85 * u + drop, R = 2.35 * u, dy = slide * .78 * u;
    boilSeed('e5shades');
    const lens = (cx, cy, w) => [[cx - w, cy - .42 * u], [cx + w, cy - .46 * u], [cx + w * .92, cy + .12 * u], [cx + w * .55, cy + .4 * u], [cx - w * .6, cy + .4 * u], [cx - w * .95, cy + .1 * u]];
    const pane = (cx, cy, w) => {
      paint(lens(cx, cy, w), { wash: '#26232C', ink: PAL.ink, sw: sw * .8 });
      inkLine([[cx - w * .55, cy - .2 * u], [cx - w * .15, cy - .36 * u]], sw * .45, PAL.cream, 'inkfine', 0);   // glints
      inkLine([[cx + w * .1, cy + .18 * u], [cx + w * .35, cy + .02 * u]], sw * .3, '#8A8794', 'inkfine', 0);
    };
    let eyes, ear;
    if (V.side && typeof turnPt === 'function' && typeof HEAD_TURN !== 'undefined') {   // the rig's turned head: eyes on the sphere
      const th = V === SV.side ? HEAD_TURN.side : HEAD_TURN.q, P = (lon, lat, k) => turnPt(0, hcy, R, th, lon, lat, k);
      eyes = [-1, 1].map(sd => ({ p: P(sd * .4, -.02, .9), f: clamp(Math.cos(sd * .4 + th), .3, 1) })).filter(e => e.p[2] > .08).map(e => ({ x: e.p[0], y: e.p[1], w: (.62 * e.f + .08) * u }));
      ear = P(-Math.PI / 2, .1);
    } else {
      const F = V.face; if (!F) return;
      eyes = F.eyes.map(sd => ({ x: F.cx * u + sd * .85 * u * F.fw, y: hcy - .02 * u, w: (.62 * F.fw + .08) * u * (V === SV.q && sd < 0 ? .8 : 1) }));
      ear = V.side ? [-.2 * u, hcy] : null;
    }
    eyes.sort((a, b) => a.x - b.x);
    if (V.side) inkLine([[eyes[0].x - eyes[0].w * .9, eyes[0].y - .3 * u + dy], [ear[0], ear[1] - .25 * u + dy * .3]], sw * 1.1, '#1C1A20', 'ink', 0);   // the arm back to his ear
    else for (const sd of [-1, 1]) { const e = eyes[sd < 0 ? 0 : eyes.length - 1]; inkLine([[e.x + sd * e.w * .9, e.y - .3 * u + dy], [sd * R * .97, e.y - .25 * u + dy * .3]], sw * 1.1, '#1C1A20', 'ink', 0); }
    if (eyes.length > 1) inkLine([[eyes[0].x + eyes[0].w * .8, eyes[0].y - .3 * u + dy], [(eyes[0].x + eyes[1].x) / 2, Math.min(eyes[0].y, eyes[1].y) - .38 * u + dy], [eyes[1].x - eyes[1].w * .8, eyes[1].y - .3 * u + dy]], sw * 1.1, '#1C1A20', 'ink', .4);   // bridge
    for (const e of eyes) pane(e.x, e.y + dy, e.w);
  }
  // The beach towel (reference: the beachtowel icon): teal with paler stripes and orange anchors, lying flat on the
  // grass. (x, y) = its centre on the ground, w = width, d = how deep it looks (foreshortened), sk = skew.
  function towel(x, y, w, d, o = {}) {
    const sk = o.sk ?? w * .08, P = (a, b) => [x + a * w / 2 - b * sk, y + b * d / 2];   // a: -1..1 across, b: -1 (far) .. 1 (near)
    boilSeed('e5towel' + (o.key || ''));
    paint([P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)], { wash: '#4AA9B8', ink: PAL.ink, sw: o.sw ?? 1.1 });
    for (let i = 0; i < 6; i++) { const a0 = -1 + (2 * i + .5) / 6.5, a1 = a0 + .16; paint([P(a0, -.94), P(a1, -.94), P(a1, .94), P(a0, .94)], { wash: '#7DCAD2', washOp: 210, ink: null }); }
    paint([P(-1, .78), P(1, .78), P(1, 1), P(-1, 1)], { wash: '#3B8E9C', washOp: 200, ink: null });   // the hem
    for (let i = 0; i < 7; i++) {   // anchors
      const a = -.82 + (i % 4) * .52 + (i > 3 ? .26 : 0), b = i > 3 ? .35 : -.4, [cx, cy] = P(a, b), s = d * .16;
      inkLine([[cx, cy - s], [cx, cy + s * .7]], 1.3, '#C9643A', 'ink', 0);
      inkLine([[cx - s * .7, cy + s * .2], [cx - s * .4, cy + s * .75], [cx, cy + s * .85], [cx + s * .4, cy + s * .75], [cx + s * .7, cy + s * .2]], 1.2, '#C9643A', 'ink', .5);
      inkLine([[cx - s * .35, cy - s * .55], [cx + s * .35, cy - s * .55]], 1, '#C9643A', 'ink', 0);
    }
  }
  // The remains sack (Rust's dropped player bag): a lumpy brown cloth sack with its drawstring loose, an AK poking
  // out of its mouth. (x, y) = ground point, s = 1 ≈ 120 px wide. glint 0..1 flashes a star on the AK.
  function sack(x, y, s = 1, o = {}) {
    const sw = clamp(1.6 * s, .6, 2.2);
    boilSeed('e5sack' + (o.key || ''));
    push(); translate(x, y); scale(s);
    paint(ellPts(0, 4, 72, 12, 16), { fill: PAL.ink, fillOp: 70, bleed: .2, ink: null });
    paint(ellPts(-6, -78, 34, 12, 14), { wash: '#3A2A1E', ink: PAL.ink, sw: sw * .6 });   // the dark mouth
    if (o.ak !== false) { push(); translate(-10, -82); scale(-1, 1); rotate(-.95); akProp(22, sw * .8, 0); pop(); }   // barrel up and out to the left
    const B = [[-62, -6], [-70, -40], [-50, -70], [-30, -76], [-6, -70], [18, -78], [40, -72], [62, -46], [66, -12], [40, 2], [-30, 2]];
    paint(B, { wash: '#8A6440', ink: PAL.ink, sw, curv: .4 });
    paint([[-52, -14], [-58, -44], [-40, -64], [-26, -40]], { wash: '#A07A52', washOp: 160, ink: null, curv: .4 });
    paint([[20, -60], [52, -40], [50, -10], [30, -20]], { wash: '#6E4E30', washOp: 150, ink: null, curv: .4 });
    for (const [a, b] of [[[-30, -30], [-8, -18]], [[10, -40], [30, -26]]]) inkLine([a, b], sw * .4, '#5A4028', 'inkfine', .3);   // folds
    paint(rectPts(14, -36, 22, 18), { wash: '#6E5A3A', ink: PAL.ink, sw: sw * .4 });   // a patch
    inkLine([[-40, -66], [-8, -62], [26, -70]], sw * 1.2, '#C9B48A', 'ink', .5);   // the drawstring
    inkLine([[26, -70], [38, -54], [32, -40]], sw * .9, '#C9B48A', 'ink', .5);
    pop();
    if ((o.glint || 0) > .02) { const g = o.glint, gx = x - 45 * s, gy = y - 128 * s; glow(gx, gy, 60 * s, '#FFF6D8', g); boilSeed('e5sackglint'); paint(starPts(gx, gy, 26 * s * g, .25, 4), { wash: '#FFFDF2', ink: null }); }
  }
  // A blast crater in the grass: scorched rays, a dark pit, a lip of turned-up dirt.
  function crater(x, y, r, k = 1) {
    boilSeed('e5crater');
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + .3, l = r * (1.55 + .6 * hash(i)); paint([[x + Math.cos(a - .1) * r * .9, y + Math.sin(a - .1) * r * .3], [x + Math.cos(a) * l, y + Math.sin(a) * l * .3], [x + Math.cos(a + .1) * r * .9, y + Math.sin(a + .1) * r * .3]], { wash: '#2E2A26', washOp: 170 * k, ink: null }); }   // scorch rays
    paint(ellPts(x, y, r * 1.18, r * .36, 24, 2), { wash: '#3A322C', washOp: 200, ink: null });   // the scorched ground
    paint(ellPts(x, y - r * .03, r, r * .3, 22, 2), { wash: '#A07E58', ink: PAL.ink, sw: 1.2 });   // the lip of turned-up dirt
    paint(ellPts(x, y + r * .02, r * .78, r * .2, 20, 2), { wash: '#1E1A18', ink: PAL.ink, sw: .8 });   // the pit
    paint(ellPts(x - r * .15, y - r * .2, r * .5, r * .07, 14), { wash: '#C29A6C', washOp: 220, ink: null });   // light on the far lip
    for (let i = 0; i < 6; i++) paint(ellPts(x + (hash(i + 5) - .5) * r * 2.3, y - r * .32 + hash(i + 8) * r * .12, r * .1, r * .065, 8), { wash: '#8C6C4A', ink: PAL.ink, sw: .6 });
  }
  // What's left of the AK: a blackened stick with its barrel curled into a loop and the stock bent over.
  function twistedAK(x, y, s = 1) {
    boilSeed('e5twisted');
    push(); translate(x, y); scale(s);
    paint(ribbon([[-70, -6], [-40, -14], [-6, -10], [18, -18], [40, -40], [36, -66], [14, -70], [8, -50], [30, -34], [62, -30], [84, -46]], 9, 6), { wash: '#2A2628', ink: PAL.ink, sw: 1 });
    paint(ribbon([[-70, -6], [-92, -2], [-104, -20], [-88, -30]], 11, 9), { wash: '#4A2622', ink: PAL.ink, sw: 1 });   // the scorched stock
    paint(rrPts(-30, -26, 30, 16, 5), { wash: '#26252B', ink: PAL.ink, sw: .8 });
    paint([[-10, -12], [2, -12], [8, 8], [-2, 10]], { wash: '#26252B', ink: PAL.ink, sw: .7 });   // a bent magazine
    pop();
  }
  // A clothes pile on the grass (boonie, red hoodie, dark pants); o.hat / o.hoodie / o.pants = false once taken.
  function clothesPile(x, y, s = 1, o = {}) {
    boilSeed('e5pile');
    push(); translate(x, y); scale(s);
    paint(ellPts(0, 2, 120, 14, 16), { fill: PAL.ink, fillOp: 60, bleed: .2, ink: null });
    if (o.pants !== false) {
      paint([[-110, -8], [-60, -30], [10, -26], [60, -8], [56, 2], [-104, 4]], { wash: PANTS, ink: PAL.ink, sw: 1.1, curv: .3 });
      inkLine([[-58, -26], [-48, 0]], .6, '#25282C', 'inkfine', .3); paint(rectPts(-108, -10, 14, 12), { wash: '#2C2F33', ink: null });
    }
    if (o.hoodie !== false) {
      paint([[-40, -30], [-10, -58], [40, -60], [80, -36], [96, -8], [70, 2], [-30, 0]], { wash: HOODIE, ink: PAL.ink, sw: 1.1, curv: .3 });
      paint(ribbon([[60, -40], [96, -26], [110, -6]], 22, 18), { wash: HOODIE, ink: PAL.ink, sw: 1 });   // a sleeve
      inkLine([[100, -4], [116, -10]], 4, '#9A9C98', 'ink', 0);   // its cuff
      paint([[-6, -54], [20, -66], [40, -58], [18, -48]], { wash: HOODIE_LN, ink: PAL.ink, sw: .6, curv: .3 });   // the hood's lining
    }
    if (o.hat !== false) boonie(-30, -44, 52, { flat: true, rot: -.12, sw: 1 });
    pop();
  }
  // Clothes flying off (screen or world): a hoodie with its arms out, a pair of pants, legs kicking. r = rotation.
  function flyHoodie(x, y, s, r) {
    boilSeed('e5flyhoodie'); push(); translate(x, y); rotate(r); scale(s);
    paint(ribbon([[-30, -24], [-62, -4], [-80, 22]], 22, 18), { wash: HOODIE, ink: PAL.ink, sw: 1 });
    paint(ribbon([[30, -24], [64, -10], [86, 10]], 22, 18), { wash: HOODIE, ink: PAL.ink, sw: 1 });
    for (const [a, b] of [[[-84, 18], [-72, 30]], [[80, 16], [94, 4]]]) inkLine([a, b], 5, '#9A9C98', 'ink', 0);
    paint([[-36, -34], [36, -34], [40, 40], [-40, 40]], { wash: HOODIE, ink: PAL.ink, sw: 1.1, curv: .15 });
    paint(rectPts(-40, 32, 80, 10), { wash: '#9A9C98', ink: PAL.ink, sw: .6 });
    paint([[-22, -34], [-16, -58], [16, -58], [22, -34]], { wash: HOODIE_LN, ink: PAL.ink, sw: .8, curv: .3 });   // the hood
    inkLine([[0, -30], [0, 30]], .8, '#C9C6BC', 'inkfine', 0);
    pop();
  }
  function flyPants(x, y, s, r, kick = 0) {
    boilSeed('e5flypants'); push(); translate(x, y); rotate(r); scale(s);
    paint(ribbon([[-14, -10], [-26 - 10 * kick, 34], [-30 - 18 * kick, 74]], 30, 26), { wash: PANTS, ink: PAL.ink, sw: 1 });
    paint(ribbon([[14, -10], [26 + 8 * kick, 34], [24 + 22 * kick, 72]], 30, 26), { wash: PANTS, ink: PAL.ink, sw: 1 });
    paint([[-32, -28], [32, -28], [34, 0], [-34, 0]], { wash: PANTS, ink: PAL.ink, sw: 1.1 });
    paint(rectPts(-34, -32, 68, 10), { wash: '#2A2D31', ink: PAL.ink, sw: .6 });   // the belt
    paint(rectPts(-6, -33, 12, 12), { wash: '#B9A27A', ink: null });
    pop();
  }
  // The panic: a cartoon fight cloud of dust with arms and legs flailing out of it, k 0..1 (in and out).
  function fightCloud(x, y, r, t, k = 1) {
    if (k <= .01) return;
    const f = Math.floor(t * 12);
    for (let i = 0; i < 4; i++) {   // limbs poking out, a new pose every boil
      const a = hash(f * 3 + i) * TAU, l = r * (1 + .25 * hash(f + i * 7)), skin = SKIN_TONES.light.col;
      boilSeed('e5limb' + i);
      const P = [[x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .45], [x + Math.cos(a + .15) * l * .85, y + Math.sin(a + .15) * l * .7], [x + Math.cos(a - .1) * l * 1.08, y + Math.sin(a - .1) * l * .86]];
      paint(ribbon(P, 26 * k, 20 * k), { wash: skin, ink: PAL.ink, sw: 1.3 });
      paint(ellPts(P[2][0], P[2][1], 15 * k, 15 * k, 10), { wash: i % 2 ? skin : '#F0E3C8', ink: PAL.ink, sw: 1.1 });
    }
    const B = []; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + f * .4, d = r * .5 * (.8 + .3 * hash(f + i)); B.push([x + Math.cos(a) * d, y + Math.sin(a) * d * .8, r * (.42 + .12 * hash(i + f * 2)) * k]); }
    boilSeed('e5cloudrim'); for (const [px, py, pr] of B) paint(ellPts(px, py, pr + 4, pr * .9 + 4, 14), { wash: PAL.ink, ink: null });
    boilSeed('e5cloud'); for (const [px, py, pr] of B) paint(ellPts(px, py, pr, pr * .9, 14), { wash: '#E2D6BC', ink: null });
    for (const [px, py, pr] of B.slice(0, 5)) paint(ellPts(px - pr * .2, py - pr * .25, pr * .5, pr * .35, 10), { wash: '#F2EAD6', washOp: 200, ink: null });
    for (let i = 0; i < 3; i++) { const a = hash(f + i * 5) * TAU; boilSeed('e5cstar' + i); paint(starPts(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .4, 14 * k, .4, 5, f), { wash: PAL.ochre, ink: PAL.ink, sw: .8 }); }
  }

  // ---------- acting helpers (front view unless noted; they fill in a survivor's options) ----------
  const dropOf = (o, u) => clamp(o.crouch || 0) * 1.2 * u + clamp(o.sit || 0) * 2.05 * u;
  const reach = (o, u, w, x, y) => Object.assign(o, reachArm(u, o, w, x, y, false));   // elbows out and down, for hands near the body
  // both hands hold the rock to his chest: the rock is painted on the torso, under the arms
  function clutch(o, u) {
    const d = dropOf(o, u), cy = -6.75 * u + d;
    reach(o, u, 'L', -.95 * u, cy + .3 * u); reach(o, u, 'R', 1.0 * u, cy + .1 * u);
    o.under = (uu, sw) => { push(); translate(-.75 * uu, cy + .25 * uu); rotate(-.08); rockProp(uu * 1.05, sw); pop(); };
    return o;
  }
  // the AK hugged to his chest like a baby, both arms wrapped round it
  function hugAK(o, u) {
    const d = dropOf(o, u), cy = -6.25 * u + d;
    o.under = (uu, sw) => { push(); translate(.45 * uu, cy + .1 * uu); scale(-1, 1); rotate(-.32); akProp(uu * .8, sw, 0); pop(); };   // cradled: the barrel out left, the stock out right
    reach(o, u, 'L', 1.05 * u, cy + .35 * u); reach(o, u, 'R', -1.15 * u, cy - .55 * u);
    return o;
  }
  // both index fingers point down at his briefs: "see? naked"
  function pointBriefs(o, u) {
    const d = dropOf(o, u), L = [-1.55 * u, -5.25 * u + d], R = [1.55 * u, -5.3 * u + d], tgt = [0, -3.9 * u + d];
    reach(o, u, 'L', ...L); reach(o, u, 'R', ...R);
    o.handL = fingerTo(L, tgt); o.handR = fingerTo(R, tgt);
    return o;
  }
  // a pointing index finger drawn from a hand at h toward tgt (both body-local), for a hand hook
  const fingerTo = (h, tgt) => (uu, sw) => { const a = Math.atan2(tgt[1] - h[1], tgt[0] - h[0]); paint(ribbon([[Math.cos(a) * .25 * uu, Math.sin(a) * .25 * uu], [Math.cos(a) * 1.0 * uu, Math.sin(a) * 1.0 * uu]], .34 * uu, .28 * uu), { wash: SKIN_TONES.light.col, ink: PAL.ink, sw: sw * .6 }); };
  // Lying back on the towel, sunbathing: profile, head to the right, face up; the far hand behind his head, the near
  // hand holding the beans on his chest (or lowering the shades), the far knee up. (hx, gy) = where his hips lie on
  // the towel; lean lifts his head and shoulders (radians).
  function sunbather(hx, gy, u, t, o = {}) {
    const lean = o.lean ?? .12, rot = Math.PI / 2 - lean;
    const S = { ...HERO, ...feel('cool', t), emote: null, eyes: o.eyes || 'normal', mouth: o.mouth || 'smile', lookX: o.lookX ?? 0, lookY: o.lookY ?? 0, squint: 0, boilKey: NK, seed: 1, view: 'side', flip: true, rot, noShadow: true,
      rawArms: true, aR: 1.6, bendR: 2.6, liftR: .55, dy: 0, sq: 0, dx: 0 };
    const slide = o.slide || 0, bridge = [1.95 * u, -11.25 * u + slide * .78 * u];   // the top of the shades, body-local
    if (o.hand === 'shades') { reach(S, u, 'L', bridge[0] + .55 * u, bridge[1] - .35 * u); S.handL = (uu, sw) => fingerTo([0, 0], [-.55, .3])(uu, sw); }
    else { reach(S, u, 'L', 1.15 * u, -6.3 * u); if (o.can !== false) S.handL = (uu, sw) => beanCan(uu * .9, sw, { open: true, spoon: true, rot: -.2 }); }
    S.draw = (uu, sw, V) => shadesOn(uu, sw, V, 0, slide);
    Object.assign(S, o.pose || {});
    const px = hx - 4.4 * u * Math.cos(lean), py = gy - 1.3 * u + 4.4 * u * Math.sin(lean);
    survivor(px, py, u, S);
    // where his eye is in the world (for a sparkle): body-local (1.62u, -10.9u), flipped, then turned with him
    const lx = -1.62 * u, ly = -10.9 * u, c = Math.cos(rot), sn = Math.sin(rot);
    return [px + lx * c - ly * sn, py + lx * sn + ly * c];
  }

  // Sitting up on the towel, legs out, facing left (3/4): the reaction to the glint. The far hand props him up behind;
  // the near hand holds the shades by the temple and slides them down his nose (slide). (hx, gy) = where he sits.
  function seated(hx, gy, u, t, o = {}) {
    const d = 2.05 * u, slide = o.slide || 0;
    const S = { ...HERO, ...o.face, boilKey: NK, seed: 1, view: 'q', flip: true, sit: 1, legsOut: true, dy: 2.3, rawArms: true, rot: -.04, noShadow: false, ...o.pose };
    reach(S, u, 'R', -1.5 * u, -2.6 * u + d);
    if (o.hand) reach(S, u, 'L', -.42 * u, -8.92 * u + slide * .78 * u);   // his fist on the temple of the shades, by his ear
    else reach(S, u, 'L', 1.7 * u, -4.4 * u + d);
    S.draw = (uu, sw, V) => shadesOn(uu, sw, V, d, slide);
    survivor(hx, gy, u, S);
    return [hx - .7 * u, gy - 8.85 * u + d * 0 + 2.3 * u - .02 * u];   // his face, in the world
  }

  // ---------- shots ----------
  const tremble = (t, a) => (Math.floor(t * 24) % 2 ? a : -a);      // a shiver that flips every frame
  const flick = (t, pat) => pat[Math.floor(t * 24) % pat.length];   // a frame-by-frame flicker pattern
  // The heli. hd = its heading (0 = nose right, π/2 = nose at us, π = nose left); past π/2 it's drawn mirrored, so its
  // windowed side stays toward us and a swing reads as one turn. Laid out in SCREEN space (it's far away).
  function heliAt(o) { const hd = o.hd ?? 0, f = hd > Math.PI / 2; return { t: T, ...o, yaw: f ? Math.PI - hd : hd, flip: f }; }
  const drawHeli = h => scr(() => patrolHeli(h.x, h.y, h.s, h));
  const lens = h => heliPt(h.x, h.y, h.s, h, 'light');
  // Point the searchlight at a screen point. The beam is painted here, UNDER whatever is painted next (him), so it
  // doesn't wash out his face; light() then adds the glow on him after he's painted.
  function beam(h, tx, ty, on, o = {}) {
    h.light = { on, aim: Math.PI / 2, cone: false, ...o };
    for (let i = 0; i < 2; i++) { const [lx, ly] = lens(h); h.light.aim = o.aim ?? Math.atan2(ty - ly, tx - lx); h.light.len = (o.len ?? Math.hypot(tx - lx, ty - ly)) * (o.over ?? 1.08); }
    if (on > .01) { const [lx, ly] = lens(h); scr(() => searchCone(lx, ly, h.light.aim, h.light.len, on * (o.k ?? 1), { key: (h.key || '') + ' beam', w: o.w })); }
    return h;
  }
  const light = (tx, ty, r, on) => { if (on > .01) scr(() => glow(tx, ty, r, '#FFF4D6', .55 * on)); };
  // the minigun's barrel angle for a spin-up from t0 over ramp s (then full speed), or a spin-down
  const spinUp = (t, t0, ramp) => { const a = t - t0; if (a <= 0) return 0; const w = TAU * 2.1; return a < ramp ? w * a * a / (2 * ramp) : w * (ramp / 2 + a - ramp); };
  const spinDown = (t, t0, ramp) => { const a = clamp(t - t0, 0, ramp), w = TAU * 2.1; return w * (a - a * a / (2 * ramp)); };
  // "hmph": two snorts of exhaust
  function snort(h, age) {
    if (age < 0 || age > .75) return;
    const [ex, ey] = heliPt(h.x, h.y, h.s, h, 'engine');
    scr(() => { for (const [d, k] of [[0, 0], [.14, 1]]) puff(ex + (h.flip ? 14 : -14) * k, ey - 8 * k, 44 * h.s, age - d, { col: '#6A666E', key: 'snort' + k + (h.key || ''), n: 5, life: .55, rise: .9 }); });
  }
  // red lock-on brackets closing on a screen box, blinking with the beeps
  function lockOn(cx, cy, w, h, k, t) {
    if (k <= 0) return;
    const q = easeOut(clamp(k)), ww = lerp(w * 1.9, w, q), hh = lerp(h * 1.5, h, q);
    if (k < 1 && frac(t * 10) > .6) return;
    scr(() => {
      boilSeed('lockon'); const L = Math.min(ww, hh) * .22, red = '#E8202E';
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const x = cx + sx * ww / 2, y = cy + sy * hh / 2; inkLine([[x - sx * L, y], [x, y], [x, y - sy * L]], 2.6, red, 'ink', 0); glow(x, y, 40, '#FF3040', .5); }
    });
  }
  // rotor downwash: pale dust swirling out along the ground from x (world)
  function downwash(t, x, y, k) {
    if (k <= .02) return;
    for (let i = 0; i < 8; i++) {
      const ph = frac(t * .8 + i / 8), d = (i % 2 ? 1 : -1) * (50 + 380 * ph), px = x + d, py = y + 8 - 22 * ph, r = 30 + 50 * ph, [sx] = sc(px, py);
      if (sx < -120 || sx > W + 120) continue;   // p5.brush can't composite a see-through shape that's wholly off the canvas
      boilSeed('wash' + i); paint(ellPts(px, py, r, r * .32, 14, 2), { wash: '#E2DCC6', washOp: 120 * k * (1 - ph) * Math.min(1, ph * 4), ink: null });
    }
  }
  // dirt clods thrown up by a blast, landing back on the ground around it (world; they stay where they land)
  function clods(x, y, r, age, n = 7, key = 'clod') {
    if (age < 0) return;
    for (let i = 0; i < n; i++) {
      const lx = x + (hash(i * 3.3 + x) - .5) * r * 3.2, ly = y + (hash(i * 1.7 + 4) - .3) * r * .35, fl = .45 + .3 * hash(i + 9), k = clamp(age / fl);
      const p = arcPt([x + (hash(i) - .5) * r * .4, y - r * .2], [lx, ly], r * (1.2 + 1.2 * hash(i + 2)), k), s = (7 + 7 * hash(i + 5)) * r / 120;
      boilSeed(key + i); push(); translate(p[0], p[1]); rotate(k < 1 ? age * 9 + i : i);
      paint(ellPts(0, 0, s * 1.3, s, 8, s * .15), { wash: i % 3 ? '#7A5E42' : '#5E4A36', ink: PAL.ink, sw: .8 }); pop();
    }
  }
  // his shades, worn low on his nose from 3A on (a draw hook)
  const lowShades = o => (uu, sw, V) => shadesOn(uu, sw, V, dropOf(o, U), .95);
  // the hoodie's hood, bunched behind his neck (behind hook), and its zip and drawstrings (under hook)
  function hoodBehind(u, V, drop = 0) {
    if (V.back) return;
    boilSeed('e5hood');
    const y = -8.5 * u + drop, cx = V === SV.q ? -.5 * u : V === SV.side ? -.7 * u : 0, w = V.side ? 1.55 * u : 2.1 * u;
    paint(ellPts(cx, y, w, 1.05 * u, 18), { wash: HOODIE, ink: PAL.ink, sw: clamp(u / 16, .45, 2.4) * .8 });
    paint(ellPts(cx, y - .1 * u, w * .7, .55 * u, 14), { wash: HOODIE_LN, ink: null });
  }
  function zipUnder(u, V, drop = 0, k = 1) {
    if (V.back) return;
    const sw = clamp(u / 16, .45, 2.4), cx = V === SV.q ? .45 * u : V === SV.side ? .9 * u : 0, y0 = -5.1 * u + drop, y1 = lerp(y0, -8.15 * u + drop, k);
    boilSeed('e5zip'); inkLine([[cx, y0], [cx, y1]], sw * .7, '#CFCBC0', 'inkfine', 0);
    for (const s of V.side ? [1] : [-1, 1]) inkLine([[cx + s * .4 * u, -8.15 * u + drop], [cx + s * .45 * u, -7.05 * u + drop]], sw * .6, '#DAD6CB', 'inkfine', 0);
  }
  // a pair of sunglasses lying on the towel, and the rock lying in the grass
  function shadesProp(x, y, s) {
    boilSeed('e5shadesprop');
    for (const d of [-1, 1]) paint([[x + d * 6 * s, y - 7 * s], [x + d * 24 * s, y - 8 * s], [x + d * 22 * s, y + 3 * s], [x + d * 8 * s, y + 4 * s]], { wash: '#26232C', ink: PAL.ink, sw: .8 });
    inkLine([[x - 7 * s, y - 6 * s], [x + 7 * s, y - 6 * s]], 1.4 * s, '#1C1A20', 'ink', .4);
  }
  const rockAt = (x, y, uu, sw, r = 0) => { push(); translate(x, y); rotate(r); translate(-.7 * uu, .17 * uu); rockProp(uu, sw); pop(); };
  function rockGround(x, y, s = 1) { boilSeed('e5rockground'); rockAt(x, y - .55 * U * s, U * s, 2.2 * s, .15); }
  // an AK lying in the grass
  function akGround(x, y, r = 0, s = 1) { boilSeed('e5akground'); push(); translate(x, y); scale(-1, 1); rotate(r); akProp(U * .8 * s, 2.2 * s, 0); pop(); }   // barrel to the left

  // Both hands hold the rock to his chest (k = 1); as k → 0 his left hand lowers it to his side and the right lets go.
  function clutchK(o, u, k = 1) {
    const d = dropOf(o, u), cy = -6.75 * u + d;
    const side = handLocal(u, { ...o, rawArms: true, aL: -1.25, bendL: .3 }, 'L'), L = [lerp(side[0], -.95 * u, k), lerp(side[1], cy + .3 * u, k)];
    reach(o, u, 'L', ...L);
    if (k > .02) reach(o, u, 'R', lerp(1.9 * u, 1.0 * u, k), lerp(-4.2 * u, cy + .1 * u, k));
    o.handOver = true;
    o.handL = (uu, sw) => rockAt(lerp(-.45 * uu, .95 * uu, k), lerp(.25 * uu, -.05 * uu, k), uu * 1.05, sw, lerp(.3, -.08, k));
    return o;
  }
  // The patrol heli's opening scan (1A–1B) and its echo at the end (3F) share this hover, above and right of him.
  const HOVER = (t, o = {}) => heliAt({ x: 570 + 8 * Math.sin(t * 1.3), y: 500 + 7 * Math.sin(t * 2.1), s: 1.2, hd: 1.12, elev: .5, pitch: -.1, bank: .04 * Math.sin(t * 1.7), key: 'hover', ...o });
  // the disdainful exit: the light clicks off at t0, nose up ("hmph"), a turn to the right and away
  function leaving(h, t, t0) {
    const turn = ease(seg(t, t0 + .35, t0 + .7)), fly = easeIn(seg(t, t0 + .5, t0 + 1.05));
    return heliAt({ ...h, x: h.x + 1000 * fly, y: h.y - 120 * fly, hd: lerp(h.hd, .06, turn), elev: lerp(h.elev, .3, turn),
      pitch: t < t0 + .05 ? h.pitch : t < t0 + .35 ? lerp(h.pitch, .3, ease(seg(t, t0 + .05, t0 + .3))) : lerp(.3, -.28, ease(seg(t, t0 + .35, t0 + .75))), bank: (h.bank || 0) + .3 * Math.sin(Math.PI * seg(t, t0 + .35, t0 + .95)) });
  }

  // ---------- S1: the scan (0–6) ----------
  // 1A–1B low-angle wide: the heli hovers over the crouching Naked and sweeps a red scan line down him; he squeezes his
  // eyes shut. At 2.5 the light clicks off, the heli tips its nose up ("hmph", two snorts) and flies off right.
  function s1(t, lt) {
    HZc = G - 180;
    camBegin(540, 960, 1 + .02 * ease(seg(t, 0, 3.5)));
    const h = leaving(HOVER(t), t, 2.5), windK = 1 - seg(t, 2.9, 3.45), hx = ws(h.x, 0)[0];
    scr(() => backdrop(t, sc(0, HZc)[1], 0));
    ground(t, { wind: [hx, windK] });
    downwash(t, hx, G, windK);
    const on = t < 2.5 ? 1 : t < 2.56 ? .3 : 0, [cx, cy] = sc(NX, G - 6.6 * U);
    beam(h, cx, cy, on, { over: 1.15 });
    // the Naked: crouched, his rock clutched to his chest, staring up; he squeezes his eyes shut as the scan starts
    const N = emotions(t, [[0, 'scared', { lookY: -1, lookX: .3, emote: 'sweat' }], [.55, 'scared', { eyes: 'squeeze', mouth: 'wobble', emote: 'sweat', lookX: 0 }]], { take: .35 });
    const No = { ...N, boilKey: NK, seed: 1, view: 'front', crouch: 1, sq: (N.sq || 0) + .05, dx: tremble(t, .045 * (1 - .6 * seg(t, 2.6, 3.4))), rot: 0, rawArms: true, prop: 'none', emoteDx: .4, emoteDy: .8 };
    clutchK(No, U, 1);
    spawnling(NX, G, U, No);
    tufts(t, NX - 150, NX + 150, G + 34, 5, 1.15, [hx, windK]);
    light(cx, cy, 190, on);
    drawHeli(h);
    snort(h, t - 2.6);
    const k = seg(t, .6, 2.0), fade = 1 - seg(t, 2.0, 2.45);
    if (t >= .6 && fade > 0) scr(() => scanLine(sc(NX, 0)[0], sc(0, G - 11.8 * U)[1], sc(0, G + .2 * U)[1], ease(k), 250 * CAM.zoom, { from: lens(h), a: fade, key: 'scan1' }));
    camEnd();
  }

  // 1C wide, a high camera over his shoulder: he peeks with one eye, then both ("?"). A player in a boonie, a red hoodie and pants sprints across
  // the field behind him; the heli swings back in, lights him up and rakes him with tracers; he dives out of frame left,
  // where its rocket goes off. His clothes come flying over and land in a heap by the Naked: jaw drop; the lightbulb.
  const C1 = [317, 1043, 1.2], PILE = [285, 1372];
  const RUNNER = { gear: { mask: null, chest: null, kilt: null, hoodie: true, hoodieCol: HOODIE, pants: true, boots: true, gloves: false }, skin: 'brown', hair: 'short', hairCol: 'dark', beard: 'stubble' };
  function s1c(t, lt) {
    HZc = G - 567;
    camBegin(...C1);
    scr(() => backdrop(t, sc(0, HZc)[1], -20));
    ground(t);
    // the heli swings back in from the right (4.3), lights the runner, fires (4.6–5.2), and a rocket (5.12 → 5.4)
    const sw = ease(seg(t, 4.3, 4.68)), dr = seg(t, 4.68, 5.4), sx = easeOut(seg(t, 4.3, 4.7));
    const h = heliAt({ x: lerp(1330, 800, sx) - 90 * ease(dr), y: lerp(330, 430, sx) + 6 * Math.sin(t * 2.3), s: .72, hd: lerp(.15, 2.45, sw), elev: .32, pitch: -.22, bank: -.35 * Math.sin(Math.PI * sw),
      spin: t > 4.45 ? 1 : 0, fire: t > 4.6 && t < 5.2 ? .6 + .4 * flick(t, [1, .4, .9, .2]) : 0, key: 'h1c' });
    // the runner (world): in from the right at 4.0, sprinting left; dives out at 5.08
    // the runner (world): in at the far right at 4.0, sprinting left and forward across the field, above his head;
    // dives out of frame at the left edge at 5.08
    const run = seg(t, 4.0, 5.08), dive = seg(t, 5.08, 5.36), path = k => ws(lerp(1150, 120, k), 742 + 218 * Math.pow(k, 1.8));
    const [rx0, RY] = path(run), [rx1] = ws(-240, 0), rx = t < 5.08 ? rx0 : lerp(path(1)[0], rx1, dive), RU = depthU(RY);
    if (t >= 4.0 && dive < 1) {
      geared(rx, RY, RU, { ...feel('scared', t), ...RUNNER, boilKey: 'runner', seed: 3, view: 'q', flip: true, walk: (t - 4) * 4.2, rawArms: true, aL: -.55, bendL: 1.1, aR: -.3, bendR: 1.4, gunRot: -.7,
        rot: -1.3 * easeOut(dive), dy: -2.2 * Math.sin(Math.PI * dive), emote: null, draw: (u, sw2, V) => hatOn(u, V) });
    }
    // the rocket's blast, far left (5.4)
    const [bx, by] = ws(85, sc(0, path(1)[1])[1] - 6);
    explosion(bx, by, 110 / CAM.zoom, t - 5.4, { debris: 0 });
    clods(bx, by + 10, 110 / CAM.zoom, t - 5.4, 6, 'clod1c');
    // the Naked
    const N = emotions(t, [[3.5, 'scared', { eyes: ['squeeze', 'normal'], mouth: 'wobble', emote: null }], [3.75, 'confused', { mouth: 'wobble' }], [4.15, 'nervous', { emote: null }], [5.42, 'surprised', { emote: null }], [5.8, 'idea']], { take: .5 });
    const look = t < 3.75 ? { lookX: .5, lookY: -.5 } : t < 4.15 ? { lookX: Math.floor(t * 5) % 2 ? .7 : -.6, lookY: 0 } : t < 5.42 ? { lookX: lerp(.95, -.95, seg(t, 4.1, 5.3)), lookY: lerp(-.6, -.1, seg(t, 4.1, 5.3)) } : t < 5.8 ? { lookX: lerp(-.95, -.7, seg(t, 5.5, 5.72)), lookY: lerp(-.1, .9, seg(t, 5.5, 5.72)) } : { lookX: .2, lookY: -.6 };
    const up = ease(seg(t, 5.8, 6.0));
    const No = { ...N, ...look, boilKey: NK, seed: 1, view: 'front', crouch: 1 - up, sq: (N.sq || 0) + .05 * (1 - up), dx: t < 5.42 ? tremble(t, .02) : 0, rot: 0, rawArms: true, prop: 'none', emoteDx: .4, emoteDy: .9 };
    clutchK(No, U, 1 - up);
    if (up > 0) { reach(No, U, 'R', lerp(1.0 * U, 2.2 * U, up), lerp(-6.6 * U, -10.4 * U, up)); No.handR = (uu, sw2) => fingerTo([0, 0], [.25, -1])(uu, sw2); }
    spawnling(NX, G, U, No);
    if (t >= 5.72) clothesPile(PILE[0], PILE[1], .85);
    if (t >= 5.72) puff(PILE[0], PILE[1] - 20, 46, t - 5.72, { col: '#D9CDB4', key: 'pileland', n: 5, life: .45 });
    tufts(t, NX - 150, NX + 150, G + 34, 5, 1.15);
    // light, tracers, rocket (screen)
    const [rsx, rsy] = sc(rx, RY), lit = t > 4.45 && t < 5.28 ? 1 : 0;
    if (lit) beam(h, rsx, rsy - 6 * RU * CAM.zoom, 1, { over: 1.15 });
    drawHeli(h);
    if (lit) light(rsx, rsy - 6 * RU * CAM.zoom, 110, 1);
    scr(() => {
      const [gx, gy] = heliPt(h.x, h.y, h.s, h, 'gun');
      tracers(gx, gy, rsx + 70, rsy, t, { t0: 4.6, t1: 5.2, rate: 18, spread: 70, dirt: '#9C8A66', key: 'tr1c' });
      const [px, py] = heliPt(h.x, h.y, h.s, h, 'podL'), [ex, ey] = sc(bx, by);
      rocket(px, py, ex, ey, (t - 5.12) / .28, { s: .8, dur: .28, arc: -30, key: 'rk1c' });
      if (t >= 5.45 && t < 5.72) {   // the runner's clothes, tumbling over in a bundle
        const k = seg(t, 5.45, 5.72), [lx, ly] = sc(PILE[0], PILE[1] - 30), p = arcPt([ex + 40, ey - 60], [lx, ly], 320, k), r = k * 9;
        flyPants(p[0] - 10, p[1] + 14, .6, r + 1, .5); flyHoodie(p[0] + 8, p[1], .6, -r); boilSeed('flyhat1c'); boonie(p[0], p[1] - 22, 42, { rot: r * 1.3 });
      }
    });
    camEnd();
  }

  // ---------- S2: the rule (6–14) ----------
  // The medium two-shot of 2A–2C: him left of centre, the pile at his feet, the heli up in the sky on the right.
  const C2 = [470, 1131, 1.6], ROCK2 = [548, 1384];
  const GEAR_ON = t => ({ hat: t >= 6.4 && t < 9.4, hoodie: t >= 7.2 && t < 9.65, pants: t >= 8.4 && t < 9.9 });
  // His clothes as survivor options at time t (the hat and the hood are hooks; the zip runs up at 7.2).
  function dressOpts(t, o) {
    const g = GEAR_ON(t), d = dropOf(o, U), zipK = ease(seg(t, 7.2, 7.35)), hatDy = t >= 7.08 && t < 7.4 ? -1.6 * Math.sin(Math.PI * seg(t, 7.08, 7.4)) : spring(t, 6.4, 9, 26) * .3;
    return { gear: { hoodie: g.hoodie, pants: g.pants }, behind: g.hoodie ? (u, sw, V) => hoodBehind(u, V, d) : undefined, under: g.hoodie ? (u, sw, V) => zipUnder(u, V, d, zipK) : undefined,
      draw: g.hat ? (u, sw, V) => hatOn(u, V, d, { dy: hatDy }) : undefined };
  }
  // where his hands go while he dresses (body-local targets for reachArm), and what the right hand carries
  function dressing(t, o) {
    const B = (wx, wy) => toBody(NX, G, U, o, wx, wy);
    const hatP = B(PILE[0] + 26, PILE[1] - 34), hoodP = B(PILE[0] - 10, PILE[1] - 30), pantsP = B(PILE[0] + 40, PILE[1] - 12);
    const d = dropOf(o, U), rest = { L: [-1.95 * U, -4.25 * U + d], R: [1.95 * U, -4.25 * U + d] }, HB = [-2.75 * U, -12.5 * U];
    let L = rest.L, R = rest.R, carry = null;
    if (t < 6.18) L = kf(t, [[6.0, rest.L], [6.18, hatP]]);
    else if (t < 6.4) { L = kf(t, [[6.18, hatP], [6.32, [-2.4 * U, -15.0 * U]], [6.4, HB]]); carry = 'hat'; }
    else if (t < 6.75) L = kf(t, [[6.45, HB], [6.65, rest.L]]);
    else if (t < 6.92) L = kf(t, [[6.75, rest.L], [6.92, hoodP]]);
    else if (t < 7.2) { L = kf(t, [[6.92, hoodP], [7.06, [-1.5 * U, -14.8 * U]], [7.2, [-1.3 * U, -14.4 * U]]]); R = kf(t, [[6.92, rest.R], [7.06, [1.5 * U, -14.8 * U]], [7.2, [1.3 * U, -14.4 * U]]]); carry = t < 7.08 ? 'hoodieUp' : 'hoodieOn'; }
    else if (t < 7.4) { R = kf(t, [[7.2, [.55 * U, -5.2 * U]], [7.35, [.55 * U, -8.0 * U]], [7.4, [.6 * U, -7.8 * U]]]); L = kf(t, [[7.2, [-1.3 * U, -12 * U]], [7.32, rest.L]]); }
    else if (t < 8.0) R = kf(t, [[7.4, [.6 * U, -7.8 * U]], [7.6, rest.R]]);
    else if (t < 8.12) L = kf(t, [[8.0, rest.L], [8.12, pantsP]]);
    else if (t < 8.38) { const k = seg(t, 8.12, 8.2); L = [lerp(pantsP[0], -1.4 * U, k), lerp(pantsP[1], -4.6 * U, k)]; R = kf(t, [[8.12, rest.R], [8.2, [1.4 * U, -4.6 * U]]]); carry = 'pants'; }
    else { L = [-2.05 * U, -5.6 * U + d]; R = [2.05 * U, -5.6 * U + d]; }   // hands on hips
    return { L, R, carry };
  }
  function s2(t, lt) {
    HZc = G - 180;
    const tight = ease(seg(t, 10.0, 10.25));
    camBegin(lerp(C2[0], 475, tight), lerp(C2[1], 1105, tight), lerp(C2[2], 1.74, tight));
    scr(() => backdrop(t, sc(0, HZc)[1], -10));
    ground(t);
    rockGround(...ROCK2);
    // ----- the heli (screen): far off and bored → its nose turns (7.6) → closer → snaps round (8.8) → light locks on
    // (9.0) → minigun spins (9.3) → hesitates (10.0, "?") → light off (10.3) → turns away (10.45)
    const near = ease(seg(t, 7.9, 8.8)), snap = t < 8.8 ? 0 : backOut(seg(t, 8.8, 8.95)), away = ease(seg(t, 10.45, 10.95));
    let hd = t < 7.6 ? .2 : lerp(.2, .75, ease(seg(t, 7.6, 7.9)));
    hd = lerp(hd, .95, near); hd = lerp(hd, 1.55, snap); hd = lerp(hd, -.3, away);
    const hes = t > 10.0 && t < 10.45 ? Math.sin((t - 10.0) * 22) * .16 * (1 - seg(t, 10.0, 10.45)) : 0;
    const h = heliAt({ x: lerp(lerp(790 + 40 * seg(t, 6, 7.6), 750, near), 930, away), y: lerp(455, 500, near) - 50 * away + 6 * Math.sin(t * 2.3), s: lerp(lerp(.3, .66, near), .42, away), hd,
      elev: lerp(.2, .3, near), pitch: lerp(-.15, -.08, near) - .15 * away, bank: hes, spin: t > 9.3 ? 1 : 0,
      spinAng: t < 10.0 ? spinUp(t, 9.3, .35) : spinUp(10.0, 9.3, .35) + spinDown(t, 10.0, .9), key: 'h2' });
    const [cx2, cy2] = sc(NX, G - 6.5 * U), lockedOn = t >= 9.0 && t < 10.36 ? (t < 10.3 ? 1 : flick(t, [.5, 0])) : 0;
    if (t > 7.6 && t < 7.86) beam(h, cx2, cy2, flick(t, [1, 0, 0, 1, .6, 0]), { over: .45 });
    if (lockedOn) beam(h, cx2, cy2, lockedOn, { over: 1.12 });
    const pile = { hat: t < 6.18, hoodie: t < 6.92, pants: t < 8.12 };
    // ----- the Naked
    const strip = t >= 9.4 && t < 9.97, after = t >= 9.97;
    if (!strip) {
      let No;
      if (!after) {
        const N = emotions(t, [[6.0, 'mischief', { eyes: 'sly', mouth: 'smirk' }], [6.45, 'nervous', { emote: null, mouth: 'flat' }], [6.62, 'hopeful', { emote: null }], [7.68, 'nervous', { emote: 'sweat' }], [8.4, 'proud', { emote: null, eyes: 'narrow', mouth: 'smirk', tint: null }], [8.82, 'scared', { emote: 'sweat' }]], { take: .45 });
        const bend = t < 6.4 ? Math.sin(Math.PI * seg(t, 6.0, 6.32)) : t < 7.08 ? Math.sin(Math.PI * seg(t, 6.75, 7.06)) : t < 8.3 ? Math.sin(Math.PI * seg(t, 8.0, 8.24)) : 0;
        const hop = jump(t, 8.2, 8.36, 1.0), look = t < 6.18 ? { lookX: -.6, lookY: .8 } : (t > 6.45 && t < 6.62) || (t > 7.45 && t < 8.1) || t > 8.45 ? { lookX: .85, lookY: -.75 } : { lookX: 0, lookY: -.2 };
        No = { ...N, ...look, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', crouch: bend, sit: .6 * bend, rot: -.25 * bend, dy: (N.dy || 0) + hop.dy, sq: (N.sq || 0) + hop.sq + spring(t, 6.4, 9, 26) * .06,
          liftL: t > 8.2 && t < 8.36 ? .45 : 0, liftR: t > 8.22 && t < 8.36 ? .35 : 0, dx: t > 8.82 ? tremble(t, .04) : 0, emoteDx: .5, emoteDy: .4 };
        const dr = dressing(t, No);
        reach(No, U, 'L', ...dr.L); reach(No, U, 'R', ...dr.R);
        Object.assign(No, dressOpts(t, No));
        if (dr.carry === 'hat') No.handL = (uu, sw) => boonie(2.75 * uu, .2 * uu, 1.3 * 2.35 * uu, { rot: .1 });
        if (dr.carry === 'pants') No.handL = (uu, sw) => flyPants(1.4 * uu, 2.4 * uu, uu / 36 * .95, 0, .1);
        if (dr.carry === 'hoodieUp') No.handL = (uu, sw) => flyHoodie(1.4 * uu, -.6 * uu, uu / 36 * .9, Math.PI);
        if (dr.carry === 'hoodieOn') {   // mid-pull: the hoodie hangs from his raised fists over his head, sliding down to his shoulders
          No.draw = (uu, sw, V) => {
            const k = seg(t, 7.08, 7.2), hem = lerp(-9.6, -7.9, k) * uu, [lx, ly] = handLocal(uu, No, 'L'), [rx, ry] = handLocal(uu, No, 'R'); boilSeed('midpull');
            paint([[lx - .3 * uu, ly], [rx + .3 * uu, ry], [2.75 * uu, -11.2 * uu], [2.7 * uu, hem], [-2.7 * uu, hem], [-2.75 * uu, -11.2 * uu]], { wash: HOODIE, ink: PAL.ink, sw: sw * .9, curv: .3 });
            paint(rectPts(-2.7 * uu, hem - .45 * uu, 5.4 * uu, .45 * uu), { wash: '#9A9C98', ink: PAL.ink, sw: sw * .5 });
            inkLine([[-.9 * uu, -11.9 * uu], [-.3 * uu, -10.9 * uu]], sw * .5, '#7A2A22', 'inkfine', .3); inkLine([[.8 * uu, -11.6 * uu], [.35 * uu, -10.6 * uu]], sw * .5, '#7A2A22', 'inkfine', .3);   // his face pushing at the cloth
            for (const [hx, hy] of [[lx, ly], [rx, ry]]) paint(ellPts(hx, hy, .55 * uu, .55 * uu, 14), { wash: SKIN_TONES.light.col, ink: PAL.ink, sw: sw * .7 });
            hatOn(uu, V, 0, { dy: -1.6 * Math.sin(Math.PI * seg(t, 7.08, 7.4)) - .6 });
          };
        }
      } else {
        // back in his briefs: hands behind his back, the innocent smile... that turns smug
        const N = emotions(t, [[9.97, 'happy', { eyes: 'happy', mouth: 'smile', blush: .6, emote: null }], [10.62, 'smug', { eyes: 'sly', mouth: 'smirk', lookX: .8, lookY: -.5 }]], { take: .5 });
        const heh = t > 10.8 && t < 11 ? Math.abs(Math.sin((t - 10.8) * 30)) * .15 : 0;
        No = { ...N, boilKey: NK, seed: 1, view: 'q', rawArms: true, prop: 'none', aL: -1.85, bendL: -.3, aR: -1.8, bendR: -.3, sq: -.04 - heh * .2, dy: (N.dy || 0) - heh, rot: -.04 + .03 * Math.sin(t * 6) };
      }
      spawnling(NX, G, U, No);
    }
    if (pile.hat || pile.hoodie || pile.pants) clothesPile(PILE[0], PILE[1], .85, pile);
    tufts(t, NX - 150, NX + 230, G + 34, 5, 1.15);
    light(cx2, cy2, 230, lockedOn);
    drawHeli(h);
    lockOn(cx2, cy2 - 40, 380, 780, t < 10.0 ? seg(t, 9.0, 9.4) : 0, t);
    // the panic: a dust cloud, his clothes flying out of it (hat 9.4, hoodie 9.65, pants 9.9)
    scr(() => {
      const [bx, by] = sc(NX, G - 6.3 * U), ck = strip ? Math.min(seg(t, 9.4, 9.46), 1 - seg(t, 9.88, 9.97)) : 0;
      if (ck > 0) fightCloud(bx, by, 260, t, .6 + .4 * ck);
      if (t >= 9.4 && t < 9.85) { const k = seg(t, 9.4, 9.85), p = arcPt([bx - 40, by - 320], [-160, 240], 160, k); boilSeed('flyhat'); boonie(p[0], p[1], 120, { rot: -k * 14 }); }
      if (t >= 9.65 && t < 10.15) { const k = seg(t, 9.65, 10.15), p = arcPt([bx + 60, by - 40], [1320, 1150], 170, k); flyHoodie(p[0], p[1], 1.45, k * 9); }
      if (t >= 9.9 && t < 10.4) { const k = seg(t, 9.9, 10.4), p = arcPt([bx - 60, by + 110], [-280, 1260], 120, k); flyPants(p[0], p[1], 1.45, -k * 8, Math.sin(k * 30)); }
      if (t > 9.95 && t < 10.5) puff(bx, by + 300, 140, t - 9.95, { col: '#E2D6BC', key: 'cloudout', n: 6, life: .55, rise: .5 });
      // the heli's "?"
      if (t > 10.05 && t < 10.55) emote('?', h.x + 110 * h.s / .5, h.y - 150 * h.s / .5, 26, seg(t, 10.05, 10.2) * (1 - seg(t, 10.45, 10.55)), t - 10.05);
    });
    camEnd();
  }

  // 2D wide, a higher camera: the heli shreds two geared players out on the field (tracers; booms at 12.5 and 13.5)
  // while the Naked moonwalks under it (11–12), flexes (12–13) and flops onto a beach towel with shades and beans (13–14).
  const TOWEL = [480, 1412], P1X = 900, P2X = [430, 275];
  function s2d(t, lt) {
    HZc = G - 330;
    camBegin(540, 1110, 1);
    scr(() => backdrop(t, sc(0, HZc)[1], 0));
    ground(t);
    const PY = HZc + (G - HZc) * 14 / 36, PU = depthU(PY);
    // the heli: facing right, it fires at P1 (12.0), a rocket (12.25 → 12.5); swings round (12.5–12.95); fires at P2
    // (13.0), a rocket (13.22 → 13.5)
    const swing = ease(seg(t, 12.5, 12.95));
    const h = heliAt({ x: lerp(600 + 60 * seg(t, 11, 12.5), 590, swing), y: 440 + 8 * Math.sin(t * 2.2), s: .62, hd: lerp(.35, 2.75, swing), elev: .32, pitch: -.2, bank: -.3 * Math.sin(Math.PI * swing) + .05 * Math.sin(t * 1.6),
      spin: 1, fire: (t > 12.0 && t < 12.4) || (t > 13.0 && t < 13.35) ? .6 + .4 * flick(t, [1, .3, .8, .2]) : 0, key: 'h2d' });
    const p2x = t < 12.5 ? P2X[0] : lerp(P2X[0], P2X[1], seg(t, 12.5, 13.45));
    // the geared players (CHAD_GEAR, small), shooting up at it; P2 runs for it after P1 goes up
    const shooter = (x, flip, burst, key) => {
      const o = { ...feel('determined', t, { emote: null }), ...CHAD_GEAR, boilKey: key, seed: 4, view: 'q', flip, rawArms: true };
      Object.assign(o, reachArm(PU, o, 'L', 1.45 * PU, -7.9 * PU));
      return { ...o, gunRot: -.62, twoHand: true, fire: burst ? flick(t, [1, 0, .7, 0]) : 0 };
    };
    if (t < 12.52) geared(P1X, PY, PU, shooter(P1X, true, t > 11.2 && t < 11.9 && frac(t * 2) < .6, 'p1'));
    if (t < 13.52) {
      if (t < 12.5) geared(p2x, PY, PU, shooter(p2x, false, t > 11.5 && t < 12.3 && frac(t * 2.3) < .5, 'p2'));
      else geared(p2x, PY, PU, { ...feel('scared', t), ...CHAD_GEAR, boilKey: 'p2run', seed: 5, view: 'q', flip: true, walk: (t - 12.5) * 3.6, rawArms: true, aL: -.5, bendL: 1.2, aR: -.2, bendR: 1.3, gunRot: -.8, emote: null });
    }
    explosion(P1X, PY - 20, 80, t - 12.5, { debris: 0 }); clods(P1X, PY, 80, t - 12.5, 5, 'clodp1');
    explosion(P2X[1], PY - 20, 80, t - 13.5, { debris: 0 }); clods(P2X[1], PY, 80, t - 13.5, 5, 'clodp2');
    // the towel, with the shades and the beans waiting on it, and his rock beside it
    towel(TOWEL[0], TOWEL[1], 380, 66);
    if (t < 13.0) { shadesProp(TOWEL[0] + 70, TOWEL[1] - 8, 1); beanCanAt(TOWEL[0] - 40, TOWEL[1] - 2, .6, { key: 'towel' }); }
    rockGround(TOWEL[0] + 205, TOWEL[1] + 2, .9);
    // the Naked
    if (t < 12.0) {   // moonwalk: facing right, gliding left
      const k = seg(t, 11.0, 12.0), x = lerp(765, 600, k), ph = (t - 11) * 2;
      spawnling(x, G, U, { ...feel('cool', t), eyes: 'sly', mouth: 'smirk', lookX: -.6, boilKey: NK, seed: 1, view: 'q', walk: -ph, dy: -.25 * pulse(t, 5), rawArms: true, prop: 'none', aL: -1.0, bendL: -1.0 + .3 * Math.sin(t * 9), aR: -1.15, bendR: -.8, emote: null, rot: -.05 });
    } else if (t < 12.95) {   // flex, on the beat
      const pump = pulse(t, 5);
      spawnling(600, G, U, { ...feel('proud', t), emote: 'spark', emoteK: seg(t, 12.05, 12.25), tint: null, boilKey: NK, seed: 1, view: t < 12.06 ? 'qf' : 'front', rawArms: true, prop: 'none', aL: .05 + .12 * pump, bendL: -1.45, aR: .1 + .12 * pump, bendR: -1.5, sq: -.04 + .05 * pump, emoteDx: .2 });
    } else {   // flopped onto the towel: shades on, beans in hand
      if (t >= 13.03) sunbather(TOWEL[0] + 10, TOWEL[1] - 4, U, t, { lean: .14 + .02 * Math.sin(t * 4), mouth: 'smile', pose: { liftR: .5 + .08 * Math.sin(t * TAU) } });
      puff(560, G - 60, 80, t - 12.95, { col: '#E8E0C8', key: 'flop', n: 6, life: .4, rise: .3 });
    }
    drawHeli(h);
    scr(() => {
      const [gx, gy] = heliPt(h.x, h.y, h.s, h, 'gun'), [a1, b1] = sc(P1X, PY), [a2, b2] = sc(p2x, PY);
      tracers(gx, gy, a1 - 30, b1, t, { t0: 12.0, t1: 12.4, rate: 16, spread: 60, dirt: '#9C8A66', key: 'tr2d1' });
      tracers(gx, gy, a2 + 60, b2, t, { t0: 13.0, t1: 13.35, rate: 16, spread: 60, dirt: '#9C8A66', key: 'tr2d2' });
      const [r1x, r1y] = heliPt(h.x, h.y, h.s, h, 'podR'); rocket(r1x, r1y, a1, b1 - 20, (t - 12.25) / .25, { s: .7, dur: .25, key: 'rk2d1' });
      const [r2x, r2y] = heliPt(h.x, h.y, h.s, h, 'podL'); rocket(r2x, r2y, ...sc(P2X[1], PY - 20), (t - 13.22) / .28, { s: .7, dur: .28, key: 'rk2d2' });
    });
    camEnd();
  }

  // ---------- S3: greed (14–24) ----------
  const SACK = [275, 1352], AKDROP = [205, 1372], ROCK3 = [TOWEL[0] + 205, TOWEL[1] + 2], NX3 = 328;
  // the patrol heli, far off and busy: strafing something beyond the right edge
  function busyHeli(t, x, y, s, key) {
    const h = heliAt({ x: x + 10 * Math.sin(t * .9), y: y + 4 * Math.sin(t * 2), s, hd: .25, elev: .25, pitch: -.22, spin: 1, fire: frac(t * 1.3) < .35 ? flick(t, [1, .3, .8]) : 0, key });
    drawHeli(h);
    scr(() => { const [gx, gy] = heliPt(h.x, h.y, h.s, h, 'gun'); if (frac(t * 1.3) < .45) tracers(gx, gy, Math.min(W - 10, x + 200), y + 260, t, { rate: 12, spread: 40, hits: false, key: key + 'tr' }); });
    return h;
  }
  // 3A medium, looking down on him: sunbathing. The sack in the grass glints; he lifts his head, lowers his shades
  // (15.2) and his eyes sparkle.
  function s3a(t, lt) {
    HZc = G - 330;
    camBegin(515, 1404, 1.6);
    scr(() => backdrop(t, sc(0, HZc)[1], 10));
    ground(t);
    scr(() => explosion(860, sc(0, HZc)[1] - 8, 30, t - 14.3, { debris: 0 }));   // a far-off boom on the horizon
    busyHeli(t, 800, 345, .2, 'h3a');
    sack(...SACK, .8, { glint: Math.max(0, Math.sin(Math.PI * seg(t, 14.55, 15.0))) + .7 * Math.max(0, Math.sin(Math.PI * seg(t, 15.5, 15.9))) });
    towel(TOWEL[0], TOWEL[1], 380, 66);
    rockGround(...ROCK3, .9);
    const lower = ease(seg(t, 15.14, 15.28)), spark = t >= 15.28, up = t >= 14.88;
    if (!up) sunbather(TOWEL[0] + 10, TOWEL[1] - 4, U, t, { lean: .14 + .02 * Math.sin(t * 4), mouth: 'smile', lookY: seg(t, 14.6, 14.8) * .6, pose: { liftR: .5 + .08 * Math.sin(t * TAU) } });
    else {
      const N = emotions(t, [[14.88, 'surprised', { emote: null, mouth: 'o' }], [15.28, 'starstruck', { mouth: 'open', emote: null, tint: null }]], { take: .7 });
      const face = { ...N, lookX: .7, lookY: .45, aL: undefined, aR: undefined, rot: undefined, dx: 0 };
      const eye = seated(TOWEL[0] - 10, TOWEL[1] - 2, U, t, { face, slide: .95 * lower, hand: t > 14.98 && t < 15.5, pose: { dy: 2.3 + (N.dy || 0) * .3, sq: (N.sq || 0) * .7 } });
      if (t < 15.1) puff(TOWEL[0] - 10, TOWEL[1] - 30, 60, t - 14.88, { col: '#E8E0C8', key: 'situp', n: 5, life: .35, rise: .4 });
      if (spark) { boilSeed('e5eyespark'); emote('spark', eye[0] - 2.4 * U, eye[1] - 2.6 * U, U * .7, seg(t, 15.3, 15.5), t - 15.3); glow(eye[0], eye[1], 90, '#FFF1B0', .5 * seg(t, 15.28, 15.4)); }
    }
    if (t >= 14.88) beanCanAt(TOWEL[0] + 112, TOWEL[1] + 8, .55, { key: 'down', lying: true, rot: .25 });   // the beans, dropped on the towel
    camEnd();
  }
  // 3B medium: he tiptoes over, glances up at the heli (busy, far off), wipes his drool, pulls the AK out of the sack
  // (17.6) and hugs it, beaming.
  function s3b(t, lt) {
    HZc = G - 180;
    const pan = ease(seg(t, 16.0, 17.3));
    camBegin(lerp(480, 405, pan), 1150, 1.55);
    scr(() => backdrop(t, sc(0, HZc)[1], 30 * pan));
    ground(t);
    busyHeli(t, 840, 420, .22, 'h3b');
    sack(...SACK, .8, { ak: t < 17.6 });
    towel(TOWEL[0], TOWEL[1], 380, 66);
    beanCanAt(TOWEL[0] + 20, TOWEL[1] - 4, .55, { key: 'left', lying: true, rot: .3 });
    rockGround(...ROCK3, .9);
    // the path: tiptoeing on the plucks, paused for the glance
    const x = kf(t, [[16.0, 470], [16.52, 425], [16.9, 425], [17.18, NX3]]), moving = (t < 16.52) || (t > 16.9 && t < 17.18);
    const ph = (Math.min(t, 16.52) - 16.0 + Math.max(0, Math.min(t, 17.18) - 16.9)) * 4.2;
    const glance = t > 16.55 && t < 16.9, hug = t >= 17.75;
    const N = emotions(t, [[16.0, 'mischief', { eyes: 'sly', mouth: 'grin', lookX: .8, lookY: .5 }], [16.55, 'nervous', { emote: null, lookX: .9, lookY: -.9, mouth: 'flat' }], [16.9, 'mischief', { eyes: 'shine', mouth: 'open', lookY: .6, lookX: .9, gloom: 0 }], [17.62, 'love', { emote: 'hearts' }]], { take: .45 });
    let No;
    if (!hug) {
      const view = glance ? (t < 16.6 || t > 16.85 ? 'qf' : 'front') : 'q', bend = ease(seg(t, 17.38, 17.55)) * (1 - ease(seg(t, 17.62, 17.75)));
      No = { ...N, boilKey: NK, seed: 1, view, flip: !glance || view === 'qf', rawArms: true, prop: 'none', crouch: .3 + .7 * bend, rot: -.08 - .32 * bend, dy: (N.dy || 0) - (moving ? .25 * Math.abs(Math.sin(ph * Math.PI)) : 0),
        liftL: moving ? Math.max(0, Math.sin(ph * Math.PI)) * .7 : 0, liftR: moving ? Math.max(0, -Math.sin(ph * Math.PI)) * .7 : 0, aL: -.6, bendL: -1.5, aR: -.5, bendR: -1.6, emoteDx: .3, emoteDy: .6 };
      if (glance) Object.assign(No, { aL: -1.2, bendL: .3, aR: -1.2, bendR: .3, rot: 0 });
      if (t >= 17.15 && t < 17.4) { const k = seg(t, 17.15, 17.38); reach(No, U, 'L', lerp(.55 * U, 1.7 * U, k), lerp(-9.2 * U, -9.7 * U, k)); }   // the wipe
      if (t >= 17.38 && t < 17.62) { const [tx, ty] = toBody(x, G, U, No, SACK[0] - 22, SACK[1] - 100); reach(No, U, 'L', tx, ty); }
      if (t >= 17.6) { reach(No, U, 'L', lerp(1.2 * U, .9 * U, seg(t, 17.6, 17.75)), lerp(-4.6 * U, -6.4 * U, seg(t, 17.6, 17.75))); No.handOver = true; No.handL = (uu, sw) => { push(); rotate(lerp(-.95, -.32, ease(seg(t, 17.6, 17.75)))); translate(.3 * uu, -.45 * uu); akProp(uu * .8, sw, 0); pop(); }; }   // out by the grip, barrel up and forward, as it lay in the sack
    } else {
      const rock = .05 * Math.sin((t - 17.75) * 9);
      No = { ...N, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', rot: rock, sq: (N.sq || 0) + .05 * Math.exp(-(t - 17.75) * 8), emoteDx: .3, emoteDy: .2 };
      hugAK(No, U);
    }
    No.draw = lowShades(No);
    spawnling(x, G, U, No);
    // the drool, wiped away
    if (t > 16.92 && t < 17.3) { const k = seg(t, 16.92, 17.15), dx = x - .7 * U, dy = G - 9.3 * U + dropOf(No, U); boilSeed('drool'); paint([[dx - 4, dy], [dx + 4, dy], [dx + 7, dy + 10 + 22 * k], [dx, dy + 16 + 26 * k], [dx - 7, dy + 10 + 22 * k]], { wash: PAL.sky, washOp: 230, ink: PAL.ink, sw: .9, curv: .5 }); }
    if (t >= 17.6 && t < 17.95) scr(() => sparks(...sc(SACK[0] + 20, SACK[1] - 60), 1, t - 17.6, { n: 6, key: 'akout' }));
    camEnd();
  }
  // 3C wide: the heli freezes mid-air, turns slowly toward him (creak), and its searchlight swings onto him (18.6).
  const C3 = [420, 1050, .95];
  function s3c(t, lt) {
    HZc = G - 300;
    camBegin(...C3);
    scr(() => backdrop(t, sc(0, HZc)[1], 0));
    ground(t);
    sack(...SACK, .8, { ak: false });
    towel(TOWEL[0], TOWEL[1], 380, 66);
    beanCanAt(TOWEL[0] + 20, TOWEL[1] - 4, .55, { key: 'left', lying: true, rot: .3 });
    rockGround(...ROCK3, .9);
    const turn = ease(seg(t, 18.3, 18.95)), lightK = ease(seg(t, 18.6, 18.76));
    const h = heliAt({ x: 770, y: 440 + (t < 18.0 ? 4 * Math.sin(t * 2) : 0), s: .46, hd: lerp(.25, 2.15, turn), elev: .3, pitch: lerp(-.22, -.12, turn), spin: t < 18.0 ? 1 : 0, key: 'h3c' });
    const [tx, ty] = sc(NX3, G - 6.5 * U);
    if (lightK > 0) { const [lx, ly] = lens(h); beam(h, tx, ty, 1, { over: 1.12, aim: lerp(Math.PI / 2 - .6, Math.atan2(ty - ly, tx - lx), lightK) }); }
    const hit = t >= 18.7;
    const N = hit ? emotions(t, [[18.7, 'scared', { emote: 'sweat' }]], { take: .6 }) : feel('love', t, { emote: 'hearts', emoteK: 1 - seg(t, 18.55, 18.7) });
    const No = { ...N, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', rot: hit ? 0 : .05 * Math.sin((t - 17.75) * 9), emoteDx: .3, emoteDy: .2 };
    hugAK(No, U);
    No.draw = lowShades(No);
    spawnling(NX3, G, U, No);
    light(tx, ty, 150, lightK > .9 ? 1 : 0);
    drawHeli(h);
    camEnd();
  }
  // 3D medium: he drops the AK (19.1), raises his hands, points at his briefs and whistles. The light stays on him; the
  // minigun spins up (20.0) and the rocket pods glow (20.5).
  function s3d(t, lt) {
    HZc = G - 180;
    camBegin(420, 1135, 1.6);
    scr(() => backdrop(t, sc(0, HZc)[1], 0));
    ground(t);
    sack(...SACK, .8, { ak: false });
    towel(TOWEL[0], TOWEL[1], 380, 66);
    const h = heliAt({ x: 790, y: 470 + 5 * Math.sin(t * 2.1), s: .58, hd: 2.1, elev: .3, pitch: -.15, spin: t > 20.0 ? 1 : 0, spinAng: spinUp(t, 20.0, 1.0), pods: ease(seg(t, 20.5, 20.8)), key: 'h3d' });
    const [tx, ty] = sc(NX3, G - 6.5 * U);
    beam(h, tx, ty, 1, { over: 1.12 });
    // the AK, dropped: it falls from his chest to the grass at his side
    const fall = seg(t, 19.1, 19.32);
    if (t >= 19.1) { const p = arcPt([NX3 + .45 * U, G - 6.15 * U], [AKDROP[0], AKDROP[1] - 10], 30, easeIn(fall)); akGround(p[0], p[1], lerp(-.32, .12, fall) + (fall >= 1 ? .03 * spring(t, 19.32, 8, 30) : 0)); }
    if (t >= 19.32) puff(AKDROP[0], AKDROP[1], 40, t - 19.32, { col: '#D9CDB4', key: 'akthud', n: 5, life: .45 });
    const N = emotions(t, [[19.0, 'scared', { emote: null }], [19.45, 'hopeful', { eyes: 'look', mouth: 'o', lookX: -.5, lookY: -.95, emote: 'music', blush: .3 }], [20.35, 'nervous', { mouth: 'o', emote: 'sweat', lookX: .95, lookY: -.75 }], [20.85, 'scared', { mouth: 'wobble', emote: 'sweat', lookX: .95, lookY: -.75 }]], { take: .45 });
    const No = { ...N, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', emoteDx: t < 20.35 ? -.3 : .4, emoteDy: .5 };
    const UP = { L: [-2.9 * U, -10.6 * U], R: [2.9 * U, -10.6 * U] };
    if (t < 19.1) hugAK(No, U);
    else if (t < 19.5) { const k = ease(seg(t, 19.1, 19.28)); reach(No, U, 'L', lerp(1.15 * U, UP.L[0], k), lerp(-6.8 * U, UP.L[1], k)); reach(No, U, 'R', lerp(-1.05 * U, UP.R[0], k), lerp(-5.9 * U, UP.R[1], k)); No.openL = No.openR = k > .5; }
    else { pointBriefs(No, U); const k = ease(seg(t, 19.5, 19.66)); if (k < 1) { const up = { ...No }; reach(up, U, 'L', ...UP.L); reach(up, U, 'R', ...UP.R); for (const f of ['aL', 'bendL', 'aR', 'bendR', 'armKL', 'armKR']) No[f] = lerp(up[f] ?? 1, No[f] ?? 1, k); } }
    if (t > 20.6) No.dx = tremble(t, .025);
    No.draw = lowShades(No);
    spawnling(NX3, G, U, No);
    light(tx, ty, 230, 1);
    drawHeli(h);
    camEnd();
  }
  // 3E wide: four rockets (21.0) streak at the AK at his side; a white flash and BOOM (21.4).
  function s3e(t, lt) {
    HZc = G - 300;
    const sh = t >= 21.4 ? shakeXY(t, 22 * Math.exp(-(t - 21.4) * 4)) : [0, 0];
    camBegin(C3[0] - sh[0], C3[1] - sh[1], C3[2]);
    scr(() => backdrop(t, sc(0, HZc)[1], 0));
    ground(t);
    const boom = t >= 21.4;
    if (!boom) { sack(...SACK, .8, { ak: false }); akGround(AKDROP[0], AKDROP[1] - 10, .12); }
    towel(TOWEL[0], TOWEL[1], 380, 66);
    rockGround(...ROCK3, .9);
    const h = heliAt({ x: 770 + (boom ? sh[0] * .5 : 0), y: 440, s: .46, hd: 2.15, elev: .3, pitch: -.14, spin: 1, pods: t < 21.25 ? 1 : .3, key: 'h3e' });
    const [tx, ty] = sc(NX3, G - 6.5 * U);
    if (!boom) beam(h, tx, ty, 1, { over: 1.12 });
    const N = emotions(t, [[21.0, 'surprised', { emote: '!!', lookX: .9, lookY: -.6 }]], { take: .7 });
    const look = t < 21.2 ? { lookX: .9, lookY: -.6 } : { lookX: -.8, lookY: .8 };
    const No = boom ? { eyes: 'blank', mouth: 'O', ...SOOT, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', aL: .9, bendL: -.4, aR: .85, bendR: -.4, openL: true, openR: true }
      : { ...N, ...look, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', aL: lerp(-1.25, .9, ease(seg(t, 21.05, 21.25))), bendL: -.4, aR: lerp(-1.25, .85, ease(seg(t, 21.08, 21.28))), bendR: -.4, openL: true, openR: true, emoteDx: .4, emoteDy: .3 };
    if (!boom) No.draw = lowShades(No);
    spawnling(NX3, G, U, No);
    if (!boom) light(tx, ty, 150, 1);
    explosion(AKDROP[0], AKDROP[1] - 30, 235, t - 21.4, { debris: 0 });
    clods(AKDROP[0], AKDROP[1], 200, t - 21.4, 9, 'clod3e');
    drawHeli(h);
    scr(() => {
      const [ax, ay] = sc(AKDROP[0], AKDROP[1] - 16);
      [[21.0, 'podL'], [21.07, 'podR'], [21.14, 'podL'], [21.21, 'podR']].forEach(([t0, p], i) => {
        const [px, py] = heliPt(h.x, h.y, h.s, h, p), dur = 21.4 - t0;
        rocket(px, py, ax + (i - 1.5) * 18, ay, (t - t0) / dur, { s: .8, dur, arc: 30 + 20 * i, key: 'rk3e' + i });
      });
    });
    camEnd();
    if (boom) flash(Math.exp(-(t - 21.4) * 9));
  }
  // 3F the opening's low angle again: the smoke clears on the sooty Naked beside a crater, the AK a twisted stick. The
  // heli hovers in and scans him (22.4–23.2), lets him go and flies off. He keels over, flat on his face (23.6).
  function s3f(t, lt) {
    HZc = G - 180;
    camBegin(518, 993, .9);
    scr(() => backdrop(t, sc(0, HZc)[1], 0));
    const arrive = easeOut(seg(t, 22.0, 22.42)), hov = HOVER(t, { s: 1.08, key: 'h3f' });
    hov.x = lerp(1180, 500 + 8 * Math.sin(t * 1.3), arrive); hov.y = lerp(360, 495 + 7 * Math.sin(t * 2.1), arrive); hov.hd = lerp(2.2, 1.12, arrive);
    const h = leaving(heliAt(hov), t, 23.2), windK = arrive * (1 - seg(t, 23.6, 24.1)), hx = ws(h.x, 0)[0];
    ground(t, { wind: [hx, windK] });
    downwash(t, hx, G, windK * .7);
    crater(AKDROP[0], AKDROP[1] + 4, 92);
    twistedAK(AKDROP[0] + 6, AKDROP[1] - 2, 1.05);
    clods(AKDROP[0], AKDROP[1], 200, 9, 9, 'clod3e');   // where they landed
    // the towel, singed, and his rock (rocks don't burn)
    towel(TOWEL[0], TOWEL[1], 380, 66);
    boilSeed('singe'); paint(ellPts(TOWEL[0] - 140, TOWEL[1] - 6, 90, 26, 16, 4), { wash: '#2E2622', washOp: 200, ink: null });
    rockGround(...ROCK3, .9);
    const on = t > 22.3 && t < 23.2 ? 1 : t >= 23.2 && t < 23.26 ? .3 : 0, [tx, ty] = sc(NX3, G - 6.5 * U);
    beam(h, tx, ty, on, { over: 1.15 });
    // the Naked, sooty: stands through the scan, turns to watch it go, and keels over on his face
    const fallK = easeIn(seg(t, 23.38, 23.6)), down = t >= 23.6, view = t < 23.24 ? 'front' : t < 23.3 ? 'qf' : 'q';
    const blink = t > 22.7 && t < 22.78;
    const No = { eyes: blink ? 'closed' : 'blank', mouth: t < 23.2 ? 'flat' : 'o', ...SOOT, boilKey: NK, seed: 1, view, rawArms: true, prop: 'none', aL: -1.2, bendL: .2, aR: -1.22, bendR: .2,
      rot: (t > 23.3 && t < 23.38 ? -.08 * Math.sin(Math.PI * seg(t, 23.3, 23.38)) : 0) + (Math.PI / 2) * fallK, sq: down ? .1 * Math.exp(-(t - 23.6) * 10) : 0, noShadow: fallK > .3 };
    if (fallK > 0) { No.aL = lerp(-1.2, -.3, fallK); No.aR = lerp(-1.22, -.2, fallK); }
    spawnling(NX3, G - (down ? .6 * U : 0), U, No);
    if (down) { puff(NX3 + 7.5 * U, G - 10, 70, t - 23.6, { col: '#D9CDB4', key: 'faceplant', n: 6, life: .5, rise: .4 }); puff(NX3 + 9 * U, G - 30, 40, t - 23.62, { col: '#3E3A38', key: 'ash', n: 4, life: .5 }); }
    smolder(AKDROP[0] + 10, AKDROP[1] - 30, .9, t - 21.4, { key: 'akwisp' });
    smolder(down ? NX3 + 5 * U : NX3 + 6, down ? G - 1.5 * U : G - 12.6 * U, 1.2, t - 21.5, { key: 'him' });
    // the smoke clearing
    for (let i = 0; i < 6; i++) {
      const k = seg(t, 22.0, 22.55 + .06 * i), px = AKDROP[0] + 60 + (i - 2.5) * 95 - 160 * k * (i % 2 ? 1 : -.3), py = G - 160 - 70 * hash(i + 3) - 120 * k, r = (120 + 40 * hash(i)) * (1 + .4 * k);
      if (k < 1) { boilSeed('clear' + i); paint(ellPts(px, py, r, r * .85, 18, 4), { wash: mixCol('#5A565E', '#A8A4AC', k), washOp: 235 * (1 - k * k), ink: k < .3 ? PAL.ink : null, sw: .8 }); }
    }
    light(tx, ty, 170, on);
    drawHeli(h);
    snort(h, t - 23.28);
    const k = seg(t, 22.4, 23.2), fade = 1 - seg(t, 23.2, 23.4);
    if (t >= 22.4 && fade > 0) scr(() => scanLine(sc(NX3, 0)[0], sc(0, G - 13.0 * U)[1], sc(0, G + .2 * U)[1], ease(k), 250 * CAM.zoom, { from: lens(h), a: fade, key: 'scan3' }));
    camEnd();
  }

  shots([[0, s1], [2.5, s1], [3.5, s1c], [6, s2], [8, s2], [10, s2], [11, s2d], [14, s3a], [16, s3b], [18, s3c], [19, s3d], [21, s3e], [22, s3f]]);
})();
