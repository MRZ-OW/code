// ep5 "Naked Privilege": the patrol heli scans the Naked and lets him go (it only hunts geared players). He tests the
// rule one clothing piece at a time, trolls the heli while it shreds everyone else, then picks up one AK. Boom. The heli
// scans him again and moves on. Shot list: SCRIPT.md.
(() => {
  const G = 1360, U = 36, NX = 450;     // the Naked's ground line (world y), his unit, and his spot in S1–S2
  const NK = 'naked';
  const CHAD_GEAR = { gear: { mask: 'metal', chest: 'metal', kilt: 'roadsign', hoodie: true, hoodieCol: '#5F6B52', pants: true, boots: true, gloves: true }, skin: 'tan', hair: 'buzz', hairCol: 'dark' };
  const SOOT = { soot: 1, frizz: 1 };   // after the blast: the rig's soot (ash-grey skin, soot patches, singed hair) and frizz
  const HOODIE = '#A8382E', PANTS = '#3D4248', HAT = '#9A9C96', HAT_DK = '#74766F', HAT_BAND = '#45453F', HAT_IN = '#5E5F58';
  const TWITCH = '#8C55E6', TWITCH_DK = '#4F2C93';

  // ---------- camera helpers ----------
  // Every shot uses one camera (world space). scr(fn) draws fn in SCREEN space at that point of the paint order (the
  // backdrop, the heli and its weapons are laid out on the screen); sc() / ws() convert world ↔ screen.
  function scr(fn) { if (!CAM) return fn(); push(); translate(CAM.cx, CAM.cy); scale(1 / CAM.zoom); translate(-W / 2, -H / 2); fn(); pop(); }
  const sc = (x, y) => toScreen(x, y);
  const ws = (sx, sy) => [CAM.cx + (sx - W / 2) / CAM.zoom, CAM.cy + (sy - H / 2) / CAM.zoom];
  // The ground's horizon (world y) for the shot being drawn, and a person's unit standing at ground line y (perspective).
  let HZc = 1180;
  const depthU = y => U * (y - HZc) / (G - HZc);
  // Frame a shot: zoom z, his ground line G lands at screen y gs (so the props he stands among stay inside the safe box,
  // y ≤ 1248), the horizon at screen y hs, world x xw at screen x xs. Sets HZc; returns [cx, cy, zoom] for camBegin.
  function stage(z, gs, hs, xw, xs) { const cy = G - (gs - 960) / z; HZc = cy + (hs - 960) / z; return [xw - (xs - 540) / z, cy, z]; }

  // ---------- the set: a grassy plain, a monument in the haze ----------
  // Backdrop in screen space (sky, far hills, the oil tanks and the radio tower, a treeline), so it stays far away
  // whatever the camera's zoom: hy = where the horizon lands on screen. o.tanks / o.tower = their screen x: each shot puts
  // them clear of heads and of the heli. o.pan = a small sideways drift.
  function backdrop(t, hy, o = {}) {
    const pan = o.pan || 0;
    rustSky(t, { horizon: hy, sun: [905 + pan * .2, 230], clouds: true });
    staticSeed('e5farhills');
    const P = [[-200, hy + 6]]; for (let i = 0; i <= 18; i++) { const x = -200 + i * 85 + pan * .3; P.push([x, hy - 34 - 30 * Math.sin(i * 1.1 + .5) - 22 * hash(i + 4)]); }
    P.push([W + 200, hy + 6]);
    paint(P, { wash: '#A9C0B4', ink: null, curv: .4 });
    monument(t, hy, (o.tanks ?? 70) + pan * .35, (o.tower ?? 795) + pan * .35);
    for (const [h, op] of [[150, 22], [95, 24], [45, 26]]) { staticSeed('e5haze' + h); paint(rectPts(-100, hy - h, W + 200, h + 2), { wash: '#E4EEEA', washOp: op, ink: null }); }   // haze, thicker low down
    staticSeed('e5treeline');
    const Q = [[-200, hy + 8]]; for (let i = 0; i <= 44; i++) { const x = -200 + i * 34 + pan * .5; Q.push([x, hy - 6 - 14 * hash(i + 21) - (i % 7 === 3 ? 10 : 0)], [x + 17, hy - 3 - 5 * hash(i + 40)]); }
    Q.push([W + 200, hy + 8]);
    paint(Q, { wash: '#7E9C78', ink: null });
  }
  // The monument (reference: Rust's oil refinery and its storage tanks): three big squat grey tanks with domed tops,
  // bands and a ladder, pipes between them (x0 = the first tank's middle), and a lattice radio tower with a blinking red
  // light at tx. Pale and inkless: it's hazy.
  function monument(t, hy, x0, tx) {
    const line = '#7E898E';
    const tank = (cx, w, h, k) => {
      staticSeed('e5tank' + k);
      const l = cx - w / 2, top = hy - h, dome = w * .16;
      paint([[l, hy + 4], [l, top], [l + w * .2, top - dome * .7], [cx, top - dome], [l + w * .8, top - dome * .7], [l + w, top], [l + w, hy + 4]], { wash: k % 2 ? '#B3BBBD' : '#A9B2B5', ink: line, sw: .5, curv: .25 });
      paint(rectPts(l + w * .62, top - dome * .5, w * .38, h + dome * .5 + 4), { wash: '#98A2A6', washOp: 150, ink: null });   // the shaded side
      for (const f of [.3, .62]) inkLine([[l + 2, top + h * f], [l + w - 2, top + h * f]], .45, line, 'inkfine', 0);
      inkLine([[l + w * .28, hy], [l + w * .36, top + 4], [l + w * .44, top - dome * .7]], .5, '#6E787D', 'inkfine', .3);   // the ladder
      paint(rectPts(l + w * .14, top + h * .36, w * .09, h * .4), { wash: '#B08A70', washOp: 110, ink: null });   // a rust streak
    };
    tank(x0, 150, 96, 0); tank(x0 + 145, 120, 74, 1); tank(x0 + 262, 96, 58, 2);
    staticSeed('e5pipes'); inkLine([[x0 - 10, hy - 24], [x0 + 310, hy - 24]], .9, line, 'inkfine', 0); inkLine([[x0 + 80, hy - 40], [x0 + 90, hy - 40], [x0 + 90, hy - 10]], .7, line, 'inkfine', 0);
    if (tx < -60 || tx > W + 60) return;
    const th = 330, top = hy - th, w0 = 34, w1 = 7;
    staticSeed('e5tower');
    const L = k => [tx - lerp(w0, w1, k), hy - th * k], R = k => [tx + lerp(w0, w1, k), hy - th * k];
    inkLine([L(0), L(1)], 1.4, '#8A959A', 'ink', 0); inkLine([R(0), R(1)], 1.4, '#8A959A', 'ink', 0);
    for (let i = 0; i < 7; i++) { const a = i / 7, b = (i + 1) / 7; inkLine([L(a), R(b)], .6, '#8A959A', 'inkfine', 0); inkLine([R(a), L(b)], .6, '#8A959A', 'inkfine', 0); inkLine([L(b), R(b)], .5, '#8A959A', 'inkfine', 0); }
    paint(rectPts(tx - 18, top + 40, 36, 7), { wash: '#8A959A', ink: null });   // a platform with a dish
    paint(ellPts(tx - 22, top + 30, 7, 10, 10), { wash: '#A3ACB0', ink: line, sw: .4 });
    inkLine([[tx, top], [tx, top - 46]], .8, '#8A959A', 'inkfine', 0);
    const blink = frac(t * .8) < .5;
    paint(ellPts(tx, top - 48, 3.5, 3.5, 8), { wash: blink ? '#FF5A4A' : '#9A4A44', ink: null });
    if (blink) glow(tx, top - 48, 22, '#FF5A4A', .6);
  }
  // The ground plane (world space): grass from the horizon down, hazier far away, with tufts. wind: [x, k] blows the
  // tufts away from x (a heli's downwash). Flat washes only: watercolour fills over the whole frame cost too much.
  function ground(t, o = {}) {
    const d = G - HZc;
    staticSeed('e5ground');
    paint(rectPts(-1600, HZc - 3, 4300, 2900), { wash: '#8DAA62', ink: null });
    paint(rectPts(-1600, HZc - 3, 4300, d * .3), { wash: '#B4C49A', washOp: 110, ink: null });   // hazier toward the horizon
    paint(rectPts(-1600, HZc - 3, 4300, d * .12), { wash: '#C8D6B4', washOp: 110, ink: null });
    for (let i = 0; i < 6; i++) {   // darker patches of grass
      staticSeed('e5patch' + i); const py = HZc + d * (.35 + 2.4 * hash(i + 9)), px = -400 + hash(i + 3) * 1900, r = (60 + 90 * hash(i + 1)) * (py - HZc) / d + 30;
      paint(ellPts(px, py, r * 1.6, r * .26, 14, 3), { wash: '#7A9A56', washOp: 80, ink: null });
    }
    const [vx0] = ws(-60, 0), [vx1] = ws(W + 60, 0);
    for (const [f, n] of [[.28, 12], [.7, 12], [1.3, 11], [2.1, 10]]) tufts(t, -700, 1800, HZc + d * f, n, .3 + .62 * f, o.wind, f < .5 ? 2 : 3, vx0, vx1);
  }
  // A row of grass tufts at ground line y (n of them along x0..x1, s = size); only the ones in view (cx0..cx1) are drawn.
  function tufts(t, x0, x1, y, n, s, wind, blades = 3, cx0 = -1e9, cx1 = 1e9) {
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, hash(i * 3.1 + y * .37)), h = (18 + 14 * hash(i + y)) * s;
      if (x < cx0 || x > cx1) continue;
      boilSeed('e5tuft' + i + ',' + Math.round(y));
      let lean = Math.sin(t * 1.4 + i) * 3 * s;
      if (wind) { const dd = x - wind[0], f = wind[1] * Math.exp(-Math.abs(dd) / 420); lean += Math.sign(dd || 1) * f * (14 + 6 * Math.sin(t * 19 + i)) * s; }
      const col = mixCol('#5F8040', '#86A06A', clamp((1.1 - s) * .8));
      for (const k of blades === 2 ? [-.5, .5] : [-1, 0, 1]) inkLine([[x + k * 6 * s, y], [x + k * 11 * s + lean, y - h * (k && blades === 3 ? .8 : 1)]], .75 * Math.min(1.2, s + .2), col, 'inkfine', .4);
    }
  }

  // ---------- props ----------
  // The boonie hat (reference: hat.boonie): grey cloth, a round crown with a dark band and an eyelet, a wide floppy
  // brim. (x, y) = the brim's centre, r = the brim's half-width; o.view 'front' | 'q' (crown shifted toward +x) | 'side'.
  function boonie(x, y, r, o = {}) {
    const sw = o.sw ?? clamp(r / 40, .5, 1.6), q = o.view === 'q' ? .12 : 0, side = o.view === 'side', tilt = o.rot || 0;
    push(); translate(x, y); rotate(tilt);
    const bw = r * (side ? 1.08 : 1), bh = r * (o.flat ? .55 : .22), cx = r * (q + (side ? .05 : 0));
    paint(ellPts(0, 0, bw, bh, 24), { wash: HAT_DK, ink: PAL.ink, sw: sw * .8 });   // the back half of the brim
    const cw = r * .6, ch = r * .62, C = [[cx - cw, 0], [cx - cw * .98, -ch * .55], [cx - cw * .7, -ch * .92], [cx, -ch], [cx + cw * .7, -ch * .92], [cx + cw * .98, -ch * .55], [cx + cw, 0]];
    paint(C, { wash: HAT, ink: PAL.ink, sw: sw * .85, curv: .35 });   // the crown
    paint([[cx - cw * .9, -ch * .2], [cx - cw * .75, -ch * .8], [cx - cw * .25, -ch * .9], [cx - cw * .45, -ch * .3]], { wash: '#B4B6B0', washOp: 140, ink: null, curv: .3 });
    inkLine([[cx - cw * .05, -ch * .96], [cx + cw * .1, -ch * .55]], sw * .35, HAT_DK, 'inkfine', .3);   // a seam
    paint([[cx - cw * 1.01, -ch * .1], [cx + cw * 1.01, -ch * .1], [cx + cw * 1.0, -ch * .36], [cx - cw * 1.0, -ch * .36]], { wash: HAT_BAND, ink: PAL.ink, sw: sw * .5 });   // the band
    paint(ellPts(cx + cw * (q ? .55 : .5), -ch * .52, r * .035, r * .035, 8), { wash: '#3A3A36', ink: null });   // eyelet
    const F = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI, dr = 1 + .05 * Math.sin(a * 3); F.push([Math.cos(a) * bw * dr, Math.sin(a) * bh * dr + bh * .12 * Math.pow(Math.cos(a), 2)]); }
    paint([F[0], ...F.slice(1, 16), F[16], [-bw * .92, -bh * .05], [0, -bh * .02], [bw * .92, -bh * .05]].reverse(), { wash: HAT, ink: PAL.ink, sw: sw * .85, curv: .2 });   // the front of the brim
    inkLine(F.slice(2, 15).map(([a, b]) => [a * .86, b * .86 - bh * .1]), sw * .3, HAT_DK, 'inkfine', .3);   // stitching on the brim
    pop();
  }
  // A boonie tumbling through the air, seen from a turning angle so it never flattens into a disc: phase a opens and
  // closes the brim; for half the turn we see the crown on top, for the other half up into the hat. rot spins it.
  function boonieTumble(x, y, r, a, rot) {
    const open = Math.abs(Math.sin(a)), up = Math.cos(a) >= 0, sw = clamp(r / 40, .5, 1.6), bh = r * (.3 + .6 * open);
    push(); translate(x, y); rotate(rot);
    paint(ellPts(0, 0, r, bh, 22), { wash: up ? HAT : HAT_DK, ink: PAL.ink, sw: sw * .85 });
    inkLine(ellPts(0, 0, r * .86, bh * .86, 18), sw * .3, up ? HAT_DK : '#56584F', 'inkfine', .3);   // stitching round the brim
    if (up) {   // the crown on top: a dome that stands up out of the brim when edge-on, a round cap seen from above
      const cw = r * .58, ch = r * (.62 - .3 * open), base = bh * .15 * open;
      paint([[-cw, base], [-cw * .98, base - ch * .55], [-cw * .7, base - ch * .92], [0, base - ch], [cw * .7, base - ch * .92], [cw * .98, base - ch * .55], [cw, base], [0, base + bh * .28]], { wash: HAT, ink: PAL.ink, sw: sw * .85, curv: .35 });
      paint([[-cw * 1.01, base - ch * .08], [cw * 1.01, base - ch * .08], [cw, base - ch * .34], [-cw, base - ch * .34]], { wash: HAT_BAND, ink: PAL.ink, sw: sw * .5 });
    } else {   // upside down: we look up into it
      paint(ellPts(0, 0, r * .6, bh * .62, 18), { wash: HAT_IN, ink: PAL.ink, sw: sw * .6 });
      paint(ellPts(0, bh * .1, r * .42, bh * .38, 14), { wash: '#3E3F3A', ink: null });
    }
    pop();
  }
  // the hat on a survivor's head (a draw hook): drop = how far crouch/sit lowered the head; o.dy lifts it (u), o.rot tips it
  function hatOn(u, V, drop = 0, o = {}) {
    const R = 2.35 * u, hcy = -10.85 * u + drop, q = V === SV.q;
    boilSeed('e5hat-on' + (o.key || ''));
    boonie(q ? .2 * u : 0, hcy - .68 * R + (o.dy || 0) * u, 1.3 * R, { view: q ? 'q' : 'front', rot: (o.rot || 0) + (q ? .05 : 0), sw: clamp(u / 16, .45, 2.4) });
  }

  // ---------- on the head: o.face(u, sw, V, head) hooks, placed on the turned head so they sit right in every view ----------
  const faces = (...F) => (u, sw, V, head) => { for (const f of F) if (f) f(u, sw, V, head); };
  // Rust's Twitch sunglasses (refimg/rustapp/twitchsunglasses.png): pixel-art black frames with stepped lower corners,
  // dark lenses with stepped highlights, purple arms. Each lens is laid out in "pixels" over its eye (lon ±.4, lat -.02)
  // on the head's surface; slide 0..1 lowers them down his nose so his eyes show over the top.
  const LENS = [[0, 0], [8, 0], [8, 2], [7, 2], [7, 3], [6, 3], [6, 4], [1, 4], [1, 3], [0, 3]];   // x 0 = the outer side
  function twitchShades(slide = 0) {
    return (u, sw, V, head) => {
      const px = .068, sl = slide * .34, k = 1.0;
      const pt = (lonE, X, Y) => { const p = head.pt(lonE + (X - 4) * px * (lonE < 0 ? 1 : -1), -.02 + (Y - 1.55) * px + sl, k); return [p[0], p[1]]; };
      const lenses = [-.4, .4].filter(lonE => head.pt(lonE, -.02 + sl, .84)[2] > .08);
      boilSeed('e5shades');
      for (const lonE of lenses) {   // the arms first, back to the ears (the far one is hidden behind the head when it turns)
        const ear = head.pt(Math.sign(lonE) * Math.PI / 2, .06, 1); if (ear[2] < -.02) continue;
        const a = pt(lonE, 0, .45), A = [a, [lerp(a[0], ear[0], .55), lerp(a[1], ear[1], .55) - .06 * u], [ear[0], ear[1]]];
        inkLine(A, sw * 1.55, TWITCH_DK, 'ink', .4); inkLine(A, sw * .85, TWITCH, 'ink', .4);
      }
      if (lenses.length === 2) inkLine([pt(-.4, 8, .5), pt(.4, 8, .5)], sw * 1.3, '#16141A', 'ink', 0);   // the bridge
      for (const lonE of lenses) {
        paint(LENS.map(([X, Y]) => pt(lonE, X, Y)), { wash: '#1A181E', ink: PAL.ink, sw: sw * .5 });   // the frame
        paint(LENS.map(([X, Y]) => pt(lonE, lerp(X, 4, .2), lerp(Y, 1.75, .28))), { wash: '#3E3D47', ink: null });   // the lens
        for (const [X, Y] of [[1.5, .85], [2.5, .85], [1.5, 1.8]]) paint([pt(lonE, X, Y), pt(lonE, X + .9, Y), pt(lonE, X + .9, Y + .8), pt(lonE, X, Y + .8)], { wash: '#9A98A4', ink: null });   // pixel glints
      }
    };
  }
  // Nervous sweat: small filled drops pop off his temple on side s (-1 = the near side, toward his back in 3/4) and fly
  // outward and down, one after another, at rate drops/s.
  function sweatDrops(t, s = -1, rate = 2.4) {
    return (u, sw, V, head) => {
      const T0 = head.pt(s * 1.15, -.34, 1.02); if (T0[2] < -.05) return;
      const ox = T0[0] - head.hcx, oy = T0[1] - head.hcy, L = Math.hypot(ox, oy) || 1, d = [ox / L, oy / L];
      for (let i = 0; i < 2; i++) {
        const ph = frac(t * rate + i * .5); if (ph > .8) continue;
        const x = T0[0] + d[0] * ph * 1.5 * u, y = T0[1] + d[1] * ph * 1.5 * u + ph * ph * 2.2 * u, r = .2 * u * (1 - .3 * ph), va = Math.atan2(d[1] * 1.5 + 4.4 * ph, d[0] * 1.5);
        boilSeed('e5sweat' + i); push(); translate(x, y); rotate(va - Math.PI / 2);
        paint([[0, -1.7 * r], [.95 * r, .1 * r], [.6 * r, .8 * r], [0, r], [-.6 * r, .8 * r], [-.95 * r, .1 * r]], { wash: PAL.sky, ink: PAL.ink, sw: sw * .4, curv: .6 });
        paint(ellPts(-.3 * r, .1 * r, .22 * r, .3 * r, 8), { wash: '#FFFFFF', washOp: 220, ink: null });
        pop();
      }
    };
  }
  // The jaw drop: a big open mouth hanging down into his beard (k 0..1), drawn over the rig's own mouth.
  function jawDrop(k = 1) {
    return (u, sw, V, head) => {
      if (k <= .02) return;
      const m = head.pt(0, .66, .98); if (m[2] < .1) return;
      const f = clamp(Math.cos(head.th * .75), .55, 1), w = .52 * u * f, h = (.35 + .75 * k) * u;
      boilSeed('e5jaw');
      paint(ellPts(m[0], m[1] + h * .42, w, h * .55, 16), { wash: '#4A1F2A', ink: PAL.ink, sw: sw * .7 });
      paint(ellPts(m[0], m[1] + h * .75, w * .6, h * .18, 12), { wash: PAL.rose, ink: null });   // the tongue
    };
  }
  // the 'spark' emote beside his eyes, on the head (so it stays by them as he moves)
  const eyeSpark = (k, age) => (u, sw, V, head) => { const p = head.pt(.9, -.75, 1.25); emote('spark', p[0], p[1], u * .55, k, age); };

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
    if (o.singe) { boilSeed('e5singe'); paint(ellPts(...P(-.55, .1), w * .2, d * .42, 16, 4), { wash: '#2E2622', washOp: 200 * o.singe, ink: null }); }
  }
  // The remains sack (Rust's dropped player bag): a lumpy brown cloth sack with its drawstring loose, an AK poking
  // out of its mouth. (x, y) = ground point, s = 1 ≈ 120 px wide. glint 0..1 flashes a star on the AK.
  function sack(x, y, s = 1, o = {}) {
    const sw = clamp(1.6 * s, .6, 2.2);
    boilSeed('e5sack' + (o.key || ''));
    push(); translate(x, y); scale(s);
    paint(ellPts(0, 4, 72, 12, 16), { wash: PAL.ink, washOp: 50, ink: null });
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
  // A blast crater in the grass: scorched rays, the black scorch, a bright lip of turned-up earth, the dark pit.
  function crater(x, y, r) {
    boilSeed('e5crater');
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + .3, l = r * (1.6 + .6 * hash(i)); paint([[x + Math.cos(a - .1) * r * .9, y + Math.sin(a - .1) * r * .3], [x + Math.cos(a) * l, y + Math.sin(a) * l * .3], [x + Math.cos(a + .1) * r * .9, y + Math.sin(a + .1) * r * .3]], { wash: '#2E2A26', washOp: 170, ink: null }); }
    paint(ellPts(x, y, r * 1.22, r * .38, 24, 2), { wash: '#3A322C', washOp: 210, ink: null });   // the scorch
    paint(ellPts(x, y - r * .03, r, r * .31, 22, 2), { wash: '#B98E62', ink: PAL.ink, sw: 1.3 });   // the lip of turned-up earth
    paint(ellPts(x, y + r * .03, r * .76, r * .2, 20, 2), { wash: '#1E1A18', ink: PAL.ink, sw: .9 });   // the pit
    paint(ellPts(x - r * .12, y - r * .21, r * .62, r * .07, 14), { wash: '#DDB98A', washOp: 230, ink: null });   // sun on the far lip
    for (let i = 0; i < 6; i++) paint(ellPts(x + (hash(i + 5) - .5) * r * 2.3, y - r * .32 + hash(i + 8) * r * .12, r * .1, r * .065, 8), { wash: '#8C6C4A', ink: PAL.ink, sw: .6 });
  }
  // What's left of the AK after the rockets: still an AK (the red D-handle stock and its blue tape, the black receiver,
  // the banana magazine, the orange handguard), scorched, with the barrel bent up and back over itself in a U. It lies
  // across the crater, tipped up. s = 1: the held AK at U.
  function bentAK(x, y, s = 1, rot = -.22) {
    const u = U * .8 * s, sw = clamp(2.2 * s, .8, 2.6);
    boilSeed('e5bentak');
    push(); translate(x, y); rotate(rot);
    inkLine(U2(u, [[-1.05, -.3], [-2.75, -.5], [-2.9, .6], [-1.05, .28]]), sw * 1.3, '#A3352A', 'ink', 0);   // the red D-handle stock
    for (const k of [-.22, .06, .34]) inkLine(U2(u, [[-3.0, k - .08], [-2.66, k + .02]]), sw * 1.15, '#3E6FB8', 'ink', 0);   // its blue tape
    paint(rectPts(-1.1 * u, -.55 * u, 2.6 * u, .8 * u, u * .02), { wash: '#26252B', ink: PAL.ink, sw: sw * .55 });   // receiver
    paint(ellPts(.15 * u, -.2 * u, .16 * u, .16 * u, 10), { wash: '#B8962A', ink: null });   // the smiley sticker, scorched
    paint(U2(u, [[-.55, .2], [-.15, .2], [-.25, 1.0], [-.65, 1.0]]), { wash: '#7A5034', ink: PAL.ink, sw: sw * .45 });   // grip
    paint(U2(u, [[.3, .22], [.85, .22], [1.3, .85], [1.62, 1.35], [1.18, 1.55], [.82, 1.02]]), { wash: '#2E2D33', ink: PAL.ink, sw: sw * .5, curv: .35 });   // the magazine
    inkLine(U2(u, [[.98, .9], [.62, 1.0]]), sw * .9, '#8E949A', 'ink', 0);   // its tape
    paint(rectPts(1.4 * u, -.38 * u, 1.35 * u, .5 * u, u * .02), { wash: '#A55E36', ink: PAL.ink, sw: sw * .5 });   // the handguard, singed
    const B = U2(u, [[2.65, -.13], [3.35, -.15], [3.95, -.32], [4.3, -.8], [4.2, -1.4], [3.75, -1.72], [3.15, -1.72], [2.75, -1.45]]);
    paint(ribbon(B, .3 * u, .26 * u), { wash: '#2A292E', ink: PAL.ink, sw: sw * .45 });   // the barrel, bent back on itself
    paint(ellPts(B[B.length - 1][0], B[B.length - 1][1], .15 * u, .15 * u, 8), { wash: '#121014', ink: null });   // the muzzle, looking back at the gun
    for (let i = 0; i < 4; i++) paint(ellPts((-2.2 + i * 1.3) * u, (-.15 + .25 * hash(i)) * u, .45 * u, .2 * u, 9, u * .05), { wash: '#1E1C1E', washOp: 100, ink: null });   // soot
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
    paint([[-22, -34], [-16, -58], [16, -58], [22, -34]], { wash: '#B9B6AE', ink: PAL.ink, sw: .8, curv: .3 });   // the hood
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
  // The clothes lying in the grass (S1–S2): the same pants, hoodie and boonie that fly off him later, laid out flat so
  // each reads as itself. o.hat / o.hoodie / o.pants = false once taken.
  function clothesPile(x, y, s = 1, o = {}) {
    boilSeed('e5pileshadow'); paint(ellPts(x, y + 6 * s, 130 * s, 18 * s, 16), { wash: PAL.ink, washOp: 40, ink: null });
    push(); translate(x, y); scale(s, s * .6);
    if (o.pants !== false) flyPants(-62, -22, .9, -1.3, .8);
    if (o.hoodie !== false) flyHoodie(40, -40, .9, .12);
    pop();
    if (o.hat !== false) { boilSeed('e5pilehat'); boonie(x + 30 * s, y - 40 * s, 50 * s, { flat: true, rot: -.1, sw: clamp(s * 1.1, .6, 1.4) }); }
  }
  // The panic: a cartoon fight cloud of dust with arms and legs flailing out of it, k 0..1 its size, op 0..1 its
  // opacity (it thins out over him at the end).
  function fightCloud(x, y, r, t, k = 1, op = 1) {
    if (k <= .01 || op <= .01) return;
    const f = Math.floor(t * 12);
    if (op > .55) for (let i = 0; i < 4; i++) {   // limbs poking out, a new pose every boil
      const a = hash(f * 3 + i) * TAU, l = r * (1 + .25 * hash(f + i * 7)), skin = SKIN_TONES.light.col;
      boilSeed('e5limb' + i);
      const P = [[x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .45], [x + Math.cos(a + .15) * l * .85, y + Math.sin(a + .15) * l * .7], [x + Math.cos(a - .1) * l * 1.08, y + Math.sin(a - .1) * l * .86]];
      paint(ribbon(P, 26 * k, 20 * k), { wash: skin, ink: PAL.ink, sw: 1.3 });
      paint(ellPts(P[2][0], P[2][1], 15 * k, 15 * k, 10), { wash: i % 2 ? skin : '#F0E3C8', ink: PAL.ink, sw: 1.1 });
    }
    const B = []; for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + f * .4, d = r * .5 * (.8 + .3 * hash(f + i)) * (1 + (1 - op) * .5); B.push([x + Math.cos(a) * d, y + Math.sin(a) * d * .8, r * (.42 + .12 * hash(i + f * 2)) * k * (.7 + .3 * op)]); }
    if (op > .6) { boilSeed('e5cloudrim'); for (const [px, py, pr] of B) paint(ellPts(px, py, pr + 4, pr * .9 + 4, 14), { wash: PAL.ink, washOp: 255 * op, ink: null }); }
    boilSeed('e5cloud'); for (const [px, py, pr] of B) paint(ellPts(px, py, pr, pr * .9, 14), { wash: '#E2D6BC', washOp: 255 * op, ink: null });
    for (const [px, py, pr] of B.slice(0, 5)) paint(ellPts(px - pr * .2, py - pr * .25, pr * .5, pr * .35, 10), { wash: '#F2EAD6', washOp: 200 * op, ink: null });
    if (op > .55) for (let i = 0; i < 3; i++) { const a = hash(f + i * 5) * TAU; boilSeed('e5cstar' + i); paint(starPts(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .4, 14 * k, .4, 5, f), { wash: PAL.ochre, ink: PAL.ink, sw: .8 }); }
  }
  // a pair of sunglasses lying on the towel (the Twitch ones: black pixel frames, purple arms folded behind)
  function shadesProp(x, y, s) {
    boilSeed('e5shadesprop');
    for (const d of [-1, 1]) inkLine([[x + d * 20 * s, y - 6 * s], [x + d * 4 * s, y - 12 * s]], 2.6 * s, TWITCH, 'ink', 0);
    for (const d of [-1, 1]) paint([[x + d * 4 * s, y - 8 * s], [x + d * 24 * s, y - 8 * s], [x + d * 24 * s, y - 1 * s], [x + d * 21 * s, y - 1 * s], [x + d * 21 * s, y + 3 * s], [x + d * 7 * s, y + 3 * s], [x + d * 7 * s, y - 1 * s], [x + d * 4 * s, y - 1 * s]], { wash: '#1A181E', ink: PAL.ink, sw: .7 });
  }
  const rockAt = (x, y, uu, sw, r = 0) => { push(); translate(x, y); rotate(r); translate(-.7 * uu, .17 * uu); rockProp(uu, sw); pop(); };
  function rockGround(x, y, s = 1) { boilSeed('e5rockground'); rockAt(x, y - .55 * U * s, U * s, 2.2 * s, .15); }
  // an AK lying in the grass, barrel to the left
  function akGround(x, y, r = 0, s = 1) { boilSeed('e5akground'); push(); translate(x, y); scale(-1, 1); rotate(r); akProp(U * .8 * s, 2.2 * s, 0); pop(); }

  // ---------- acting helpers (they fill in a survivor's options; body-local, +x = the way he faces) ----------
  const dropOf = (o, u) => clamp(o.crouch || 0) * 1.2 * u + clamp(o.sit || 0) * 2.05 * u;
  const reach = (o, u, w, x, y, down = false) => Object.assign(o, reachArm(u, o, w, x, y, down));   // elbows out, for hands near the body
  const fingerTo = (h, tgt) => (uu, sw) => { const a = Math.atan2(tgt[1] - h[1], tgt[0] - h[0]); paint(ribbon([[Math.cos(a) * .25 * uu, Math.sin(a) * .25 * uu], [Math.cos(a) * 1.0 * uu, Math.sin(a) * 1.0 * uu]], .34 * uu, .28 * uu), { wash: SKIN_TONES.light.col, ink: PAL.ink, sw: sw * .6 }); };
  // 3/4 view: both hands hold the rock to his chest, in front of him (k = 1); as k → 0 it drops to his side in the near hand
  function clutchQ(o, u, k = 1) {
    const d = dropOf(o, u);
    reach(o, u, 'L', lerp(.35 * u, 1.45 * u, k), lerp(-4.3 * u, -6.15 * u, k) + d);
    if (k > .3) { reach(o, u, 'R', 2.05 * u, -6.7 * u + d); o.farFront = true; }
    o.handOver = true;
    o.handL = (uu, sw) => rockAt(.45 * uu, -.25 * uu, uu * 1.05, sw, lerp(.3, -.15, k));
    return o;
  }
  // Front view: the AK hugged to his chest like a baby, on the diagonal: the barrel and the orange handguard up past
  // his shoulder, the red stock at his hip, the magazine hanging clear; his arms wrap round the receiver.
  function hugAK(o, u) {
    const d = dropOf(o, u);
    o.under = (uu, sw) => { push(); translate(-.3 * uu, -6.1 * uu + d); rotate(-.82); akProp(uu * .8, sw, 0); pop(); };
    reach(o, u, 'L', -.55 * u, -6.0 * u + d); reach(o, u, 'R', .8 * u, -7.0 * u + d);
    return o;
  }
  // both index fingers point down at his briefs: "see? naked"
  function pointBriefs(o, u) {
    const d = dropOf(o, u), L = [-1.55 * u, -5.25 * u + d], R = [1.55 * u, -5.3 * u + d], tgt = [0, -3.9 * u + d];
    reach(o, u, 'L', ...L); reach(o, u, 'R', ...R);
    o.handL = fingerTo(L, tgt); o.handR = fingerTo(R, tgt);
    return o;
  }
  // 3/4 view: hands clasped behind his back (the near hand just shows behind his back, the far one is hidden)
  function handsBehind(o, u) {
    const d = dropOf(o, u);
    reach(o, u, 'L', -2.35 * u, -5.45 * u + d, true); reach(o, u, 'R', -1.5 * u, -5.5 * u + d, true);
    return o;
  }
  // The moonwalk (3/4, facing right while he glides left): every quarter second the legs swap, one knee popping forward
  // (heel up) while the other leg stays straight with its foot flat, sliding back. Returns pose options.
  function moonwalk(t, t0) {
    const ph = (t - t0) / .25, n = Math.floor(ph), f = frac(ph), k = ease(clamp(f / .4));   // the swap takes the first 40%
    const pop = i => ((n + i) % 2 ? 1 - k : k) * .34;
    return { liftL: pop(0), liftR: pop(1), dy: -.06 * Math.sin(Math.PI * clamp(f / .4)), slide: n % 2 };
  }
  // Sunbathing on the towel: sitting, 3/4 view facing left, legs out along the towel, leaning back on his far hand,
  // head tipped back to the sun; o.can (the beans in the near hand), o.shadesHand (the near hand on his shades' temple),
  // o.slide (the shades lowered), o.lean (how far back), o.face = face options. (hx, gy) = where he sits.
  function sunbathe(hx, gy, u, t, o = {}) {
    const lean = o.lean ?? .14, S = { ...HERO, boilKey: NK, seed: 1, view: 'q', flip: true, sit: 1, legsOut: true, dy: 2.3, rawArms: true, rot: lean, dx: -2.35 * Math.sin(lean), eyes: 'normal', mouth: 'smile', ...o.face };
    reach(S, u, 'R', -2.1 * u, -2.2 * u, true);   // the far hand planted on the towel behind him (the ground is at -2.3u: he sits)
    if (o.shadesHand) reach(S, u, 'L', -.15 * u, -9.0 * u + (o.slide || 0) * .8 * u);   // his fist on the shades' temple
    else { reach(S, u, 'L', 1.5 * u, -3.5 * u); if (o.can !== false) S.handL = (uu, sw) => beanCan(uu * .9, sw, { open: true, spoon: true, rot: -.25 }); }
    S.face = faces(twitchShades(o.slide || 0), o.extraFace);
    survivor(hx, gy, u, S);
  }

  // ---------- shot helpers ----------
  const tremble = (t, a) => (Math.floor(t * 24) % 2 ? a : -a);      // a shiver that flips every frame
  const flick = (t, pat) => pat[Math.floor(t * 24) % pat.length];   // a frame-by-frame flicker pattern
  // just the face out of an emotions() result (for poses that set their own body)
  const faceOnly = N => ({ eyes: N.eyes, mouth: N.mouth, lookX: N.lookX, lookY: N.lookY, squint: N.squint, blush: N.blush, tint: N.tint, tintK: N.tintK, tintMix: N.tintMix, gloom: N.gloom });
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
  const light = (tx, ty, r, on) => { if (on > .01) scr(() => glow(tx, ty, r, '#FFF4D6', .4 * on)); };
  // the minigun's barrel angle for a spin-up from t0 over ramp s (then full speed), or a spin-down
  const spinUp = (t, t0, ramp) => { const a = t - t0; if (a <= 0) return 0; const w = TAU * 2.1; return a < ramp ? w * a * a / (2 * ramp) : w * (ramp / 2 + a - ramp); };
  const spinDown = (t, t0, ramp) => { const a = clamp(t - t0, 0, ramp), w = TAU * 2.1; return w * (a - a * a / (2 * ramp)); };
  // "hmph": one small, quick, pale puff from the exhaust
  function snort(h, age) {
    if (age < 0 || age > .4) return;
    const [ex, ey] = heliPt(h.x, h.y, h.s, h, 'engine');
    scr(() => puff(ex, ey - 6 * h.s, 24 * h.s, age, { col: '#D8D4DA', key: 'snort' + (h.key || ''), n: 4, life: .4, rise: 1.3 }));
  }
  // red lock-on brackets closing on a screen box (blinking with the beeps until they lock)
  function lockOn(cx, cy, w, h, k, t) {
    if (k <= 0) return;
    const q = easeOut(clamp(k)), ww = lerp(w * 1.7, w, q), hh = lerp(h * 1.35, h, q);
    if (k < 1 && frac(t * 10) > .6) return;
    scr(() => {
      boilSeed('lockon'); const L = Math.min(ww, hh) * .2, red = '#E8202E';
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
  // Soft smoke, no outlines: puffs of different sizes that swell, drift up and aside and thin out (age from 0 s).
  function softSmoke(x, y, r, age, key, n = 7, life = 1.5) {
    if (age < 0 || age > life) return;
    for (let i = 0; i < n; i++) {
      const st = i * .05, a2 = age - st; if (a2 < 0) continue;
      const kk = clamp(a2 / (life - st)), ang = -Math.PI / 2 + (hash(i + 11) - .5) * 2.4, d = r * (.25 + 1.0 * easeOut(kk));
      const px = x + Math.cos(ang) * d + r * .5 * kk * (hash(i + 3) - .5), py = y + Math.sin(ang) * d * .6 - a2 * r * .8, pr = r * (.35 + .5 * easeOut(kk)) * (.6 + .6 * hash(i)), op = 215 * (1 - kk * kk) * (1 - .3 * kk);
      boilSeed(key + i);
      paint(ellPts(px, py, pr, pr * .86, 16, pr * .04), { wash: mixCol('#4E4A54', '#8E8A94', kk), washOp: op, ink: null });
      paint(ellPts(px - pr * .15, py - pr * .3, pr * .6, pr * .42, 12), { wash: mixCol('#8E8A94', '#C4C0C8', kk), washOp: op * .8, ink: null });
    }
  }
  // A blast in the painted style (world or screen): a white-yellow starburst, a layered fireball (a dark rim, red,
  // orange, yellow, a white-hot core) that rises as it burns out, then soft charcoal smoke. r = size, age in s.
  function boom(x, y, r, age, key = 'boom') {
    if (age < 0 || age > 1.8) return;
    if (age < .12) { const k = age / .12; glow(x, y - r * .3, r * 3, '#FFF1C0', 1 - k); boilSeed(key + 'star'); paint(starPts(x, y - r * .3, r * (1.15 + .5 * k), .42, 11, hash(x) * 3), { wash: '#FFF2C2', ink: '#E8892E', sw: 1.2 }); }
    const fk = clamp(age / .6), fire = 1 - fk;
    if (fire > 0 && age > .03) {
      glow(x, y - r * .4, r * 2.2, '#FF9A3A', .8 * fire);
      const lift = r * .9 * easeOut(fk), grow = easeOut(clamp(age / .18)), P = [];
      for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .5, d = r * .55 * grow; P.push([x + Math.cos(a) * d * 1.15, y - r * .1 - lift + Math.sin(a) * d * .7, r * (.46 + .14 * hash(i + 3)) * grow * (1 - .35 * fk)]); }
      P.push([x, y - lift * .6, r * .6 * grow * (1 - .3 * fk)]);
      const op = 255 * clamp(fire * 1.6), layer = (col, kr, k2) => { boilSeed(key + k2); for (const [px, py, pr] of P) paint(ellPts(px, py, pr * kr, pr * kr * .88, 14), { wash: col, washOp: op, ink: null }); };
      layer(mixCol('#3A2A2E', '#4A3A3A', fk), 1.08, 'rim');   // the dark rim: only its outer edge shows
      layer(mixCol('#E2532A', '#8E3A2A', fk), 1.0, 'red');
      layer(mixCol('#F79A36', '#C2542C', fk), .76, 'orange');
      layer(mixCol('#FFD45A', '#E89038', fk), .5, 'yellow');
      if (age < .3) { boilSeed(key + 'core'); paint(ellPts(x, y - r * .2 - lift * .5, r * .32 * (1 - age / .3), r * .27 * (1 - age / .3), 12), { wash: '#FFF6D8', ink: null }); }
    }
    softSmoke(x, y - r * .5, r, age - .22, key + 'smk', 7, 1.5);
  }
  // the AK's pickup sparkle, a 'spark' at a world point
  // The patrol heli's opening hover (1A–1B), echoed at the end (3F): above and right of him, looming.
  const HOVER = (t, o = {}) => heliAt({ x: 615 + 8 * Math.sin(t * 1.3), y: 425 + 7 * Math.sin(t * 2.1), s: 1.36, hd: 1.12, elev: .5, pitch: -.1, bank: .04 * Math.sin(t * 1.7), key: 'hover', ...o });
  // The disdainful exit, from t0: the light clicks off, the nose tips up ("hmph"), it banks round to the right and is
  // gone off the right edge in under a second (fast < 1 squeezes it).
  function leaving(h, t, t0, fast = 1) {
    const T1 = x => t0 + x * fast;
    const turn = ease(seg(t, T1(.35), T1(.68))), fly = easeIn(seg(t, T1(.45), T1(.95)));
    return heliAt({ ...h, x: h.x + 1400 * fly, y: h.y - 160 * fly, hd: lerp(h.hd, .06, turn), elev: lerp(h.elev, .3, turn),
      pitch: t < T1(.05) ? h.pitch : t < T1(.35) ? lerp(h.pitch, .17, ease(seg(t, T1(.05), T1(.3)))) : lerp(.17, -.28, ease(seg(t, T1(.35), T1(.72)))),
      bank: (h.bank || 0) + .3 * Math.sin(Math.PI * seg(t, T1(.35), T1(.95))) });
  }
  const PILE = [285, 1352];   // the clothes lying in the grass by him (S1C–S2C)

  // ---------- S1: the scan (0–6) ----------
  // 1A–1B low angle, the camera down in the grass: he crouches clutching his rock, the heli looms right over him and
  // sweeps a red scan line down him (0.6–2.0); he squeezes his eyes shut. At 2.5 the light clicks off, the heli tips its
  // nose up ("hmph", one puff) and banks off to the right.
  function s1(t, lt) {
    const z = 1.15 + .03 * ease(seg(t, 0, 3.5));
    camBegin(...stage(z, 1238, 1238 - 77 * z, NX, 450));
    const h = leaving(HOVER(t), t, 2.5), windK = 1 - seg(t, 2.9, 3.45), hx = ws(h.x, 0)[0];
    scr(() => backdrop(t, sc(0, HZc)[1], { tower: 840 }));
    ground(t, { wind: [hx, windK] });
    downwash(t, hx, G, windK);
    const on = t < 2.5 ? 1 : t < 2.56 ? .3 : 0, [cx, cy] = sc(NX + .5 * U, G - 6.2 * U);
    beam(h, cx, cy, on, { over: 1.15 });
    const N = emotions(t, [[0, 'scared', { lookY: -1, lookX: .5, emote: null }], [.55, 'scared', { eyes: 'squeeze', mouth: 'wobble', emote: null }]], { take: .35 });
    const No = { ...N, boilKey: NK, seed: 1, view: 'q', crouch: 1, sq: (N.sq || 0) + .03, dx: tremble(t, .04 * (1 - .6 * seg(t, 2.6, 3.4))), rot: -.05, rawArms: true, prop: 'none', face: sweatDrops(t, -1, 2.0) };
    clutchQ(No, U, 1);
    spawnling(NX, G, U, No);
    tufts(t, NX - 170, NX + 170, G + 28, 5, 1.2, [hx, windK]);
    light(cx, cy, 200, on);
    drawHeli(h);
    snort(h, t - 2.62);
    const k = seg(t, .6, 2.0), fade = 1 - seg(t, 2.0, 2.45);
    if (t >= .6 && fade > 0) scr(() => scanLine(sc(NX + .3 * U, 0)[0], sc(0, G - 12.4 * U)[1], sc(0, G + .2 * U)[1], ease(k), 230 * CAM.zoom, { from: lens(h), a: fade, key: 'scan1' }));
    camEnd();
  }

  // 1C wide, high: he peeks with one eye, then both ("?"). A fully geared Chad sprints across the field behind him; the
  // heli swings back in, lights him up and rakes him with tracers; he dives out of frame left and its rocket goes off
  // there. The Naked's jaw drops (5.3), his eyes go to the clothes lying in the grass beside him: lightbulb (5.55).
  function s1c(t, lt) {
    camBegin(...stage(.85, 1238, 590, NX, 650));
    scr(() => backdrop(t, sc(0, HZc)[1], { pan: -20, tower: 892 }));
    ground(t);
    // the heli: off the frame until it swings back in from the right at 4.3
    const sw = ease(seg(t, 4.3, 4.68)), sx = easeOut(seg(t, 4.3, 4.7)), dr = seg(t, 4.7, 5.4);
    const h = heliAt({ x: lerp(1580, 585, sx) - 70 * ease(dr), y: lerp(330, 415, sx) + 6 * Math.sin(t * 2.3), s: .74, hd: lerp(.15, 2.5, sw), elev: .32, pitch: -.22, bank: -.35 * Math.sin(Math.PI * sw),
      spin: t > 4.45 ? 1 : 0, fire: t > 4.6 && t < 5.2 ? .6 + .4 * flick(t, [1, .4, .9, .2]) : 0, key: 'h1c' });
    // the runner, already sprinting at the cut (so he never enters under the UI column): from the far right of the
    // field, forward and left, bigger as he comes; he dives out of frame left at 5.08
    const run = seg(t, 3.5, 5.08), dive = seg(t, 5.08, 5.36);
    const [rsx, rsy] = t < 5.08 ? [lerp(815, 300, run), lerp(690, 860, run)] : [lerp(300, -230, easeIn(dive)), lerp(860, 885, dive)];
    const [rx, RY] = ws(rsx, rsy), RU = depthU(RY), lit = t > 4.45 && t < 5.28, aimY = rsy - 6 * RU * CAM.zoom;
    if (lit) beam(h, rsx, aimY, 1, { over: 1.12 });
    clothesPile(...PILE, .85);
    if (dive < 1) geared(rx, RY, RU, { ...CHAD_GEAR, ...feel('scared', t, { emote: null }), boilKey: 'runner', seed: 3, view: 'q', flip: true, walk: (t - 3.5) * 3.6, rawArms: true, aL: -.5, bendL: 1.2, aR: -.15, bendR: 1.5, gunRot: -.8, rot: -1.3 * easeOut(dive), dy: -2.2 * Math.sin(Math.PI * dive) });
    // the rocket's blast, far left (5.4), inside the frame
    const [bx, by] = ws(150, 868), br = 105 / CAM.zoom;
    clods(bx, by + 8, br, t - 5.4, 6, 'clod1c');
    boom(bx, by, br, t - 5.4, 'b1c');
    // the Naked: one eye open (3.5), the "?" held till the heli comes back (4.3), his eyes follow the runner, the jaw
    // drop (5.3), a glance down at the clothes (5.48), the lightbulb and a raised finger (5.55)
    const N = emotions(t, [[3.5, 'scared', { eyes: ['closed', 'normal'], mouth: 'wobble', emote: null }], [3.75, 'confused', { eyes: 'wide', mouth: 'o' }], [4.3, 'scared', { emote: null, mouth: 'wobble' }], [5.3, 'surprised', { emote: null, eyes: 'wide', mouth: 'O' }], [5.55, 'idea', { eyes: 'shine', mouth: 'grin' }]], { take: .45 });
    if (t > 5.2) { N.squint = 0; N.sq = clamp(N.sq || 0, -.03, .06); N.dy = Math.max(-.35, N.dy || 0); }
    const look = t < 3.75 ? { lookX: -.4, lookY: -.3 } : t < 4.3 ? { lookX: -.85, lookY: -.6 } : t < 5.3 ? { lookX: lerp(-.85, .9, seg(t, 4.3, 5.1)), lookY: -.45 } : t < 5.48 ? { lookX: .9, lookY: -.15 } : t < 5.55 ? { lookX: .75, lookY: .9 } : { lookX: .5, lookY: -.3 };
    const up = ease(seg(t, 5.55, 5.7));
    const No = { ...N, ...look, boilKey: NK, seed: 1, view: 'q', flip: true, crouch: 1 - .45 * up, sq: (N.sq || 0) + .03 * (1 - up), dx: t < 5.3 ? tremble(t, .02) : 0, rot: 0, rawArms: true, prop: 'none', emoteDx: -.5, emoteDy: .9,
      face: faces(t > 4.3 && t < 5.3 ? sweatDrops(t, -1) : null, t >= 5.3 && t < 5.62 ? jawDrop(ease(seg(t, 5.3, 5.38)) * (1 - ease(seg(t, 5.5, 5.6)))) : null) };
    clutchQ(No, U, 1 - up);
    if (up > 0) { reach(No, U, 'R', 2.1 * U, lerp(-6.7, -11.6, up) * U + dropOf(No, U)); No.farFront = true; No.handR = (uu, sw2) => fingerTo([0, 0], [.15, -1])(uu, sw2); }
    spawnling(NX, G, U, No);
    tufts(t, NX - 170, NX + 170, G + 28, 5, 1.1);
    if (t >= 4.3) drawHeli(h);
    scr(() => {
      const [gx, gy] = heliPt(h.x, h.y, h.s, h, 'gun');
      tracers(gx, gy, rsx + 60, rsy, t, { t0: 4.6, t1: 5.2, rate: 18, spread: 70, dirt: '#9C8A66', key: 'tr1c' });
      const [px, py] = heliPt(h.x, h.y, h.s, h, 'podL');
      rocket(px, py, 150, 868, (t - 5.12) / .28, { s: .8, dur: .28, arc: -30, key: 'rk1c' });
    });
    if (lit) light(rsx, aimY, 110, 1);
    camEnd();
  }

  // ---------- S2: the rule (6–14) ----------
  // The medium shot of 2A–2C: him left of centre, the clothes on the grass to his left, the heli up in the sky on the right.
  const ROCK2 = [575, 1350];
  const GEAR_ON = t => ({ hat: t >= 6.4 && t < 9.4, hoodie: t >= 7.2 && t < 9.65, pants: t >= 8.4 && t < 9.9 });
  // the hat: settles with a bounce when he puts it on (6.4); the hoodie going over his head knocks it up off his head at
  // 7.04, tumbling, and it drops back on at 7.32
  const hatHop = t => t >= 7.04 && t < 7.32 ? { dy: -3.2 * Math.sin(Math.PI * seg(t, 7.04, 7.32)), rot: .55 * Math.sin(TAU * seg(t, 7.04, 7.32)) } : { dy: t >= 7.32 ? spring(t, 7.32, 9, 30) * .35 : spring(t, 6.4, 9, 26) * .3, rot: 0 };
  // His clothes as survivor options at time t (the rig draws the hoodie with its hood; the hat and the zip are hooks).
  function dressOpts(t, o) {
    const g = GEAR_ON(t), d = dropOf(o, U), zipK = ease(seg(t, 7.2, 7.35)), hh = hatHop(t);
    return { gear: { hoodie: g.hoodie, pants: g.pants }, under: g.hoodie ? (u, sw, V) => zipUnder(u, V, d, zipK) : undefined, draw: g.hat ? (u, sw, V) => hatOn(u, V, d, hh) : undefined };
  }
  function zipUnder(u, V, drop = 0, k = 1) {
    if (V.back) return;
    const sw = clamp(u / 16, .45, 2.4), cx = V === SV.q ? .45 * u : V === SV.side ? .9 * u : 0, y0 = -5.1 * u + drop, y1 = lerp(y0, -8.15 * u + drop, k);
    boilSeed('e5zip'); inkLine([[cx, y0], [cx, y1]], sw * .7, '#CFCBC0', 'inkfine', 0);
    for (const s of V.side ? [1] : [-1, 1]) inkLine([[cx + s * .4 * u, -8.15 * u + drop], [cx + s * .45 * u, -7.05 * u + drop]], sw * .6, '#DAD6CB', 'inkfine', 0);
  }
  // where his hands go while he dresses (body-local targets for reachArm), and what the left hand carries
  function dressing(t, o) {
    const B = (wx, wy) => toBody(NX, G, U, o, wx, wy);
    const hatP = B(PILE[0] + 26, PILE[1] - 34), hoodP = B(PILE[0] + 30, PILE[1] - 22), pantsP = B(PILE[0] - 30, PILE[1] - 12);
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
    const tight = ease(seg(t, 10.0, 10.25)), z = lerp(1.6, 1.74, tight);
    camBegin(...stage(z, 1236, 1236 - 180 * z, NX, 508));
    scr(() => backdrop(t, sc(0, HZc)[1], { pan: -10, tower: 250 }));
    ground(t);
    rockGround(...ROCK2);
    // ----- the heli (screen): far off and bored → its nose turns (7.6) → closer → snaps round (8.8) → light locks on
    // (9.0) → minigun spins (9.3) → hesitates (10.0, "?") → light off (10.3) → turns away (10.45)
    const near = ease(seg(t, 7.9, 8.8)), snap = t < 8.8 ? 0 : backOut(seg(t, 8.8, 8.95)), away = ease(seg(t, 10.45, 10.95));
    let hd = t < 7.6 ? .2 : lerp(.2, .75, ease(seg(t, 7.6, 7.9)));
    hd = lerp(hd, .95, near); hd = lerp(hd, 1.55, snap); hd = lerp(hd, -.3, away);
    const hes = t > 10.0 && t < 10.45 ? Math.sin((t - 10.0) * 22) * .16 * (1 - seg(t, 10.0, 10.45)) : 0;
    const h = heliAt({ x: lerp(lerp(800 + 30 * seg(t, 6, 7.6), 800, near), 930, away), y: lerp(470, 405, near) - 40 * away + 6 * Math.sin(t * 2.3), s: lerp(lerp(.3, .6, near), .42, away), hd,
      elev: lerp(.2, .3, near), pitch: lerp(-.15, -.08, near) - .15 * away, bank: hes, spin: t > 9.3 ? 1 : 0,
      spinAng: t < 10.0 ? spinUp(t, 9.3, .35) : spinUp(10.0, 9.3, .35) + spinDown(t, 10.0, .9), key: 'h2' });
    const [cx2, cy2] = sc(NX, G - 6.6 * U), lockedOn = t >= 9.0 && t < 10.36 ? (t < 10.3 ? 1 : flick(t, [.5, 0])) : 0;
    if (t > 7.6 && t < 7.86) beam(h, cx2, cy2, flick(t, [1, 0, 0, 1, .6, 0]), { over: .45 });
    if (lockedOn) beam(h, cx2, cy2, lockedOn, { over: 1.12 });
    const pile = { hat: t < 6.18, hoodie: t < 6.92, pants: t < 8.12 };
    if (pile.hat || pile.hoodie || pile.pants) clothesPile(...PILE, .85, pile);
    // ----- the Naked
    const strip = t >= 9.4 && t < 9.86, after = t >= 9.86;
    if (!strip) {
      let No;
      if (!after) {
        const N = emotions(t, [[6.0, 'mischief', { eyes: 'sly', mouth: 'smirk' }], [6.45, 'nervous', { emote: null, mouth: 'flat' }], [6.62, 'hopeful', { emote: null }], [7.68, 'nervous', { emote: null }], [8.4, 'proud', { emote: null, eyes: 'narrow', mouth: 'smirk', tint: null }], [8.82, 'scared', { emote: null }]], { take: .45 });
        const bend = t < 6.4 ? Math.sin(Math.PI * seg(t, 6.0, 6.32)) : t < 7.08 ? Math.sin(Math.PI * seg(t, 6.75, 7.06)) : t < 8.3 ? Math.sin(Math.PI * seg(t, 8.0, 8.24)) : 0;
        const hop = jump(t, 8.2, 8.36, 1.0), look = t < 6.18 ? { lookX: -.6, lookY: .8 } : (t > 6.45 && t < 6.62) || (t > 7.45 && t < 8.1) || t > 8.45 ? { lookX: .85, lookY: -.75 } : { lookX: 0, lookY: -.2 };
        const sweaty = (t > 7.68 && t < 8.4) || t > 8.82;
        No = { ...N, ...look, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', crouch: bend, sit: .6 * bend, rot: -.25 * bend, dy: (N.dy || 0) + hop.dy, sq: (N.sq || 0) + hop.sq + spring(t, 6.4, 9, 26) * .06,
          liftL: t > 8.2 && t < 8.36 ? .45 : 0, liftR: t > 8.22 && t < 8.36 ? .35 : 0, dx: t > 8.82 ? tremble(t, .04) : 0, face: sweaty ? sweatDrops(t, -1, t > 8.82 ? 3.2 : 2.2) : null };
        const dr = dressing(t, No);
        reach(No, U, 'L', ...dr.L); reach(No, U, 'R', ...dr.R);
        Object.assign(No, dressOpts(t, No));
        if (dr.carry === 'hat') No.handL = (uu, sw) => boonie(2.75 * uu, .2 * uu, 1.3 * 2.35 * uu, { rot: .1 });
        if (dr.carry === 'pants') No.handL = (uu, sw) => flyPants(1.4 * uu, 1.8 * uu, uu / 36 * 1.95, 0, .1);   // held open by the waistband
        if (dr.carry === 'hoodieUp') No.handL = (uu, sw) => flyHoodie(1.45 * uu, -2.2 * uu, uu / 36 * 1.9, 0);   // held up by the hem, over his head
        if (dr.carry === 'hoodieOn') {   // mid-pull: the hoodie hangs from his raised fists over his head, sliding down to his shoulders
          const hh = hatHop(t);
          No.draw = (uu, sw, V) => {
            const k = seg(t, 7.08, 7.2), hem = lerp(-9.6, -7.9, k) * uu, [lx, ly] = handLocal(uu, No, 'L'), [rx, ry] = handLocal(uu, No, 'R'); boilSeed('midpull');
            paint([[lx - .3 * uu, ly], [rx + .3 * uu, ry], [2.75 * uu, -11.2 * uu], [2.7 * uu, hem], [-2.7 * uu, hem], [-2.75 * uu, -11.2 * uu]], { wash: HOODIE, ink: PAL.ink, sw: sw * .9, curv: .3 });
            paint(rectPts(-2.7 * uu, hem - .45 * uu, 5.4 * uu, .45 * uu), { wash: '#9A9C98', ink: PAL.ink, sw: sw * .5 });
            inkLine([[-.9 * uu, -11.9 * uu], [-.3 * uu, -10.9 * uu]], sw * .5, '#7A2A22', 'inkfine', .3); inkLine([[.8 * uu, -11.6 * uu], [.35 * uu, -10.6 * uu]], sw * .5, '#7A2A22', 'inkfine', .3);   // his face pushing at the cloth
            for (const [hx, hy] of [[lx, ly], [rx, ry]]) paint(ellPts(hx, hy, .55 * uu, .55 * uu, 14), { wash: SKIN_TONES.light.col, ink: PAL.ink, sw: sw * .7 });
            hatOn(uu, V, 0, { dy: hh.dy - 1.6, rot: hh.rot });   // knocked up off his head by the hoodie
          };
        }
      } else {
        // back in his briefs as the dust thins: hands clasped behind his back, rocking on his heels, the innocent smile...
        // that turns smug
        const N = emotions(t, [[9.86, 'happy', { eyes: 'happy', mouth: 'smile', blush: .6, emote: null }], [10.62, 'smug', { eyes: 'sly', mouth: 'smirk', lookX: .8, lookY: -.5 }]], { take: .5 });
        const heh = t > 10.8 && t < 11 ? Math.abs(Math.sin((t - 10.8) * 30)) * .15 : 0;
        No = { ...faceOnly(N), emote: N.emote, emoteK: N.emoteK, emoteAge: N.emoteAge, boilKey: NK, seed: 1, view: 'q', rawArms: true, prop: 'none', sq: (N.sq || 0) * .6 - .03 - heh * .2, dy: -heh, rot: .045 * Math.sin(t * 7.5) };
        handsBehind(No, U);
      }
      spawnling(NX, G, U, No);
    }
    tufts(t, NX - 150, NX + 230, G + 30, 5, 1.15);
    light(cx2, cy2, 230, lockedOn);
    drawHeli(h);
    lockOn(cx2, cy2 - 12, 300, 700, t < 10.0 ? seg(t, 9.0, 9.4) : 0, t);
    // the panic: a dust cloud, his clothes flying out of it (hat 9.4, hoodie 9.65, pants 9.9), thinning out over him
    scr(() => {
      const [bx, by] = sc(NX, G - 6.3 * U), ck = seg(t, 9.4, 9.46), cop = 1 - seg(t, 9.86, 10.08);
      if (t >= 9.4 && t < 10.08) fightCloud(bx, by, 260, t, .6 + .4 * ck, cop);
      if (t >= 9.4 && t < 9.85) { const k = seg(t, 9.4, 9.85), p = arcPt([bx - 40, by - 320], [-160, 240], 160, k); boilSeed('flyhat'); boonieTumble(p[0], p[1], 120, 1.2 + k * 9, -k * 5); }
      if (t >= 9.65 && t < 10.15) { const k = seg(t, 9.65, 10.15), p = arcPt([bx + 60, by - 40], [1320, 1150], 170, k); flyHoodie(p[0], p[1], 1.45, k * 9); }
      if (t >= 9.9 && t < 10.4) { const k = seg(t, 9.9, 10.4), p = arcPt([bx - 60, by + 110], [-280, 1260], 120, k); flyPants(p[0], p[1], 1.45, -k * 8, Math.sin(k * 30)); }
      // the heli's "?"
      if (t > 10.05 && t < 10.55) emote('?', h.x + 110 * h.s / .5, h.y - 150 * h.s / .5, 26, seg(t, 10.05, 10.2) * (1 - seg(t, 10.45, 10.55)), t - 10.05);
    });
    camEnd();
  }

  // 2D wide, a higher camera: the heli shreds two geared players out on the field (tracers; booms at 12.5 and 13.5)
  // while the Naked moonwalks under it (11–12), flexes (12–13) and flops onto a beach towel with shades and beans (13).
  const TOWEL = [400, 1352], ROCK = [575, 1368], SIT = 470;   // the towel (2D–S3), his rock beside it, where he sits on it
  function s2d(t, lt) {
    camBegin(...stage(1, 1215, 880, 540, 540));
    scr(() => backdrop(t, sc(0, HZc)[1], { tower: 945 }));
    ground(t);
    const PY = HZc + (G - HZc) * .39, PU = depthU(PY), P1X = 790, P2X = t < 12.5 ? 250 : lerp(250, 120, seg(t, 12.5, 13.45));
    // the heli: facing right, it fires at P1 (12.0), a rocket (12.25 → 12.5); swings round (12.5–12.95); fires at P2
    // (13.0), a rocket (13.22 → 13.5)
    const swing = ease(seg(t, 12.5, 12.95));
    const h = heliAt({ x: lerp(600 + 50 * seg(t, 11, 12.5), 610, swing), y: 440 + 8 * Math.sin(t * 2.2), s: .62, hd: lerp(.35, 2.75, swing), elev: .32, pitch: -.2, bank: -.3 * Math.sin(Math.PI * swing) + .05 * Math.sin(t * 1.6),
      spin: 1, fire: (t > 12.0 && t < 12.4) || (t > 13.0 && t < 13.35) ? .6 + .4 * flick(t, [1, .3, .8, .2]) : 0, key: 'h2d' });
    // the geared players, small, shooting up at it: one standing (P1, right), one crouched (P2, left), out of step;
    // P2 runs for it after P1 goes up
    const shooter = (flip, crouch, burst, key, seed, skin) => {
      const o = { ...feel('determined', t, { emote: null }), ...CHAD_GEAR, skin, boilKey: key, seed, view: 'q', flip, crouch, rawArms: true };
      Object.assign(o, reachArm(PU, o, 'L', 1.45 * PU, -7.9 * PU + dropOf(o, PU)));
      return { ...o, gunRot: -.62 - .15 * crouch, twoHand: true, fire: burst ? flick(t, [1, 0, .7, 0]) : 0, dy: burst ? -.05 : 0 };
    };
    if (t < 12.52) geared(P1X, PY, PU, shooter(true, 0, t > 11.15 && t < 11.95 && frac(t * 2) < .55, 'p1', 4, 'tan'));
    if (t < 13.52) {
      if (t < 12.5) geared(P2X, PY, PU, shooter(false, .45, t > 11.45 && t < 12.35 && frac(t * 2.6 + .3) < .45, 'p2', 6, 'brown'));
      else geared(P2X, PY, PU, { ...feel('scared', t), ...CHAD_GEAR, skin: 'brown', boilKey: 'p2run', seed: 6, view: 'q', flip: true, walk: (t - 12.5) * 3.6, rawArms: true, aL: -.5, bendL: 1.2, aR: -.2, bendR: 1.3, gunRot: -.8, emote: null });
    }
    clods(P1X, PY, 80, t - 12.5, 5, 'clodp1'); boom(P1X, PY - 6, 80, t - 12.5, 'b2d1');
    clods(120, PY, 80, t - 13.5, 5, 'clodp2'); boom(120, PY - 6, 80, t - 13.5, 'b2d2');
    // the towel, with the shades and the beans waiting on it, and his rock beside it
    towel(...TOWEL, 300, 58);
    if (t < 13.06) { shadesProp(TOWEL[0] + 40, TOWEL[1] - 6, 1.1); beanCanAt(TOWEL[0] - 60, TOWEL[1] - 2, .6, { key: 'towel' }); }
    rockGround(...ROCK, .9);
    // the Naked
    if (t < 12.0) {   // the moonwalk: facing right, gliding left at a steady speed, knees popping in turn
      const k = seg(t, 11.0, 12.0), x = lerp(700, 540, .2 * ease(k) + .8 * k), mw = moonwalk(t, 11.0);
      spawnling(x, G, U, { ...feel('cool', t), eyes: 'sly', mouth: 'smirk', lookX: -.3, emote: null, boilKey: NK, seed: 1, view: 'q', rawArms: true, prop: 'none', liftL: mw.liftL, liftR: mw.liftR, dy: mw.dy, aL: -1.05 + .3 * Math.sin(t * TAU * 2), bendL: .9, aR: -1.25 - .25 * Math.sin(t * TAU * 2), bendR: .6, rot: -.06 });
      boilSeed('slide'); for (let i = 0; i < 3; i++) { const fx = x + (1.2 + i * .8) * U, a = .7 - i * .2; inkLine([[fx, G - 4 + i * 3], [fx + (22 + 10 * i), G - 4 + i * 3]], 1.2, mixCol('#C9BC98', '#8DAA62', 1 - a), 'inkfine', 0); }   // the slide, trailing behind his flat foot
    } else if (t < 12.95) {   // flex, on the beat
      const pump = pulse(t, 5);
      spawnling(540, G, U, { ...feel('proud', t), emote: 'spark', emoteK: seg(t, 12.05, 12.25), tint: null, boilKey: NK, seed: 1, view: t < 12.06 ? 'qf' : 'front', rawArms: true, prop: 'none', aL: .05 + .12 * pump, bendL: -1.45, aR: .1 + .12 * pump, bendR: -1.5, sq: -.04 + .05 * pump, emoteDx: .2 });
    } else if (t < 13.08) {   // the flop: a hop sideways onto the towel, landing sitting
      const k = seg(t, 12.95, 13.08), x = lerp(540, SIT, ease(k));
      spawnling(x, G, U, { ...feel('happy', t), emote: null, boilKey: NK, seed: 1, view: 'q', flip: true, sit: ease(seg(t, 12.97, 13.06)), legsOut: true, dy: 2.3 * ease(seg(t, 13.0, 13.08)) - 1.2 * Math.sin(Math.PI * k), rawArms: true, prop: 'none', aL: .7, bendL: .3, aR: .6, bendR: .3 });
    } else sunbathe(SIT, G, U, t, { lean: .14 + .02 * Math.sin(t * 4), face: { ...faceOnly(feel('cool', t)), eyes: 'normal', mouth: 'smile', lookX: .3, lookY: -.6 } });
    puff(SIT - 30, G - 1.6 * U, 120, t - 13.04, { col: '#E8E0C8', key: 'flop', n: 6, life: .4, rise: .3 });
    drawHeli(h);
    scr(() => {
      const [gx, gy] = heliPt(h.x, h.y, h.s, h, 'gun'), [a1, b1] = sc(P1X, PY), [a2, b2] = sc(P2X, PY);
      tracers(gx, gy, a1 - 30, b1, t, { t0: 12.0, t1: 12.4, rate: 16, spread: 60, dirt: '#9C8A66', key: 'tr2d1' });
      tracers(gx, gy, a2 + 60, b2, t, { t0: 13.0, t1: 13.35, rate: 16, spread: 60, dirt: '#9C8A66', key: 'tr2d2' });
      const [r1x, r1y] = heliPt(h.x, h.y, h.s, h, 'podR'); rocket(r1x, r1y, a1, b1 - 10, (t - 12.25) / .25, { s: .7, dur: .25, key: 'rk2d1' });
      const [r2x, r2y] = heliPt(h.x, h.y, h.s, h, 'podL'); rocket(r2x, r2y, ...sc(120, PY - 10), (t - 13.22) / .28, { s: .7, dur: .28, key: 'rk2d2' });
    });
    camEnd();
  }

  // ---------- S3: greed (14–24) ----------
  const SACK = [130, 1346], AKDROP = [125, 1362], NX3 = 230;   // the dead player's sack, where his AK lands, where he stands
  // the patrol heli, far off and busy: strafing something beyond the right of the frame
  function busyHeli(t, x, y, s, key) {
    const h = heliAt({ x: x + 10 * Math.sin(t * .9), y: y + 4 * Math.sin(t * 2), s, hd: .25, elev: .25, pitch: -.22, spin: 1, fire: frac(t * 1.3) < .35 ? flick(t, [1, .3, .8]) : 0, key });
    drawHeli(h);
    scr(() => { const [gx, gy] = heliPt(h.x, h.y, h.s, h, 'gun'); if (frac(t * 1.3) < .45) tracers(gx, gy, Math.min(W - 10, x + 180), y + 240, t, { rate: 12, spread: 40, hits: false, key: key + 'tr' }); });
    return h;
  }
  const beansDown = () => beanCanAt(SIT + 55, TOWEL[1] + 14, .55, { key: 'down', lying: true, rot: .25 });   // the beans, put down on the towel
  // a drool drop at the corner of his mouth (an o.face hook), k 0..1 how far it's run
  const drool = k => (u, sw, V, head) => { const m = head.pt(.22, .72, 1.0); if (m[2] < .05) return; boilSeed('e5drool'); paint([[m[0] - .1 * u, m[1]], [m[0] + .1 * u, m[1]], [m[0] + .17 * u, m[1] + (.3 + .6 * k) * u], [m[0], m[1] + (.45 + .75 * k) * u], [m[0] - .17 * u, m[1] + (.3 + .6 * k) * u]], { wash: PAL.sky, washOp: 230, ink: PAL.ink, sw: sw * .4, curv: .5 }); };

  // 3A medium, a high camera on the towel: sunbathing. The sack in the grass glints (14.62); he sits up (14.88), takes
  // his shades by the temple and slides them down his nose (15.12–15.28): sparkling eyes over the top.
  function s3a(t, lt) {
    camBegin(...stage(1.45, 1236, 1236 - 330 * 1.45, SIT, 700));
    scr(() => backdrop(t, sc(0, HZc)[1], { pan: 10, tower: 300 }));
    ground(t);
    scr(() => boom(860, sc(0, HZc)[1] - 6, 24, t - 14.3, 'far3a'));   // a far-off boom on the horizon
    busyHeli(t, 790, 395, .2, 'h3a');
    sack(...SACK, .8, { glint: Math.max(0, Math.sin(Math.PI * seg(t, 14.62, 15.0))) + .8 * Math.max(0, Math.sin(Math.PI * seg(t, 15.5, 15.9))) });
    towel(...TOWEL, 300, 58);
    rockGround(...ROCK, .9);
    const notice = t >= 14.88, sparkle = t >= 15.28;
    const N = emotions(t, [[14.0, 'cool', { eyes: 'normal', mouth: 'smile', emote: null, lookX: .3, lookY: -.6 }], [14.88, 'surprised', { emote: null, mouth: 'o', eyes: 'wide', lookX: .8, lookY: .5 }], [15.28, 'starstruck', { mouth: 'open', emote: null, tint: null, lookX: .8, lookY: .5 }]], { take: .6 });
    sunbathe(SIT, G, U, t, { lean: notice ? lerp(.14, -.04, ease(seg(t, 14.88, 14.98))) : .14 + .02 * Math.sin(t * 4), can: !notice, shadesHand: t > 14.98 && t < 15.45, slide: ease(seg(t, 15.12, 15.28)),
      face: { ...faceOnly(N), sq: (N.sq || 0) * .6 }, extraFace: sparkle ? eyeSpark(seg(t, 15.3, 15.5), t - 15.3) : null });
    if (notice) beansDown();
    camEnd();
  }
  // 3B medium: a glance up at the heli (busy, far off), three tiptoe steps on the plucks (16.75, 17.0, 17.25), the
  // drool and the wipe, and he pulls the AK out of the sack (17.6) and hugs it, beaming.
  function s3b(t, lt) {
    const pan = ease(seg(t, 16.4, 17.35));
    camBegin(...stage(1.55, 1236, 1236 - 180 * 1.55, lerp(440, NX3, pan), lerp(560, 520, pan)));
    scr(() => backdrop(t, sc(0, HZc)[1], { pan: 30 * pan, tower: 960 }));
    ground(t);
    busyHeli(t, 800, 410, .22, 'h3b');
    sack(...SACK, .8, { ak: t < 17.6, glint: Math.max(0, Math.sin(Math.PI * seg(t, 15.95, 16.35))) });
    towel(...TOWEL, 300, 58);
    beansDown();
    rockGround(...ROCK, .9);
    const st = (t - 16.5) / .25, n = Math.floor(st), f = frac(st), stepping = t >= 16.5 && t < 17.25;
    const x = t < 16.5 ? 440 : lerp(440, NX3, clamp((Math.min(n, 3) + (stepping ? ease(f) : 0)) / 3));
    const glance = t > 16.05 && t < 16.45, hug = t >= 17.75, lift = stepping ? Math.sin(Math.PI * f) : 0;
    const N = emotions(t, [[16.0, 'mischief', { eyes: 'shine', mouth: 'grin', lookX: .8, lookY: .5 }], [16.05, 'nervous', { emote: null, lookX: .9, lookY: -.9, mouth: 'flat' }], [16.45, 'mischief', { eyes: 'sly', mouth: 'grin', lookX: .8, lookY: .5 }], [16.95, 'mischief', { eyes: 'shine', mouth: 'open', lookY: .6, lookX: .9, gloom: 0 }], [17.62, 'love', { emote: 'hearts' }]], { take: .45 });
    let No;
    if (!hug) {
      const view = glance ? (t < 16.1 || t > 16.4 ? 'qf' : 'front') : 'q', bend = ease(seg(t, 17.45, 17.58)) * (1 - ease(seg(t, 17.62, 17.75)));
      No = { ...N, boilKey: NK, seed: 1, view, flip: !glance || view === 'qf', rawArms: true, prop: 'none', crouch: .3 + .7 * bend, rot: -.08 - .32 * bend, dy: (N.dy || 0) - .25 * lift,
        liftL: n % 2 ? 0 : .7 * lift, liftR: n % 2 ? .7 * lift : 0, aL: -.6, bendL: -1.5, aR: -.5, bendR: -1.6, emoteDx: .3, emoteDy: .6 };
      if (glance) Object.assign(No, { aL: -1.2, bendL: .3, aR: -1.2, bendR: .3, rot: 0 });
      if (t >= 17.26 && t < 17.47) { const k = seg(t, 17.26, 17.45); reach(No, U, 'L', lerp(.55 * U, 1.9 * U, k), lerp(-9.0 * U, -9.6 * U, k) + dropOf(No, U)); }   // the wipe
      if (t >= 17.47 && t < 17.62) { const [tx, ty] = toBody(x, G, U, No, SACK[0] - 14, SACK[1] - 74); reach(No, U, 'L', tx, ty); }
      if (t >= 17.6) { reach(No, U, 'L', lerp(1.2 * U, .9 * U, seg(t, 17.6, 17.75)), lerp(-4.6 * U, -6.4 * U, seg(t, 17.6, 17.75))); No.handOver = true; No.handL = (uu, sw) => { push(); rotate(lerp(-.95, -.32, ease(seg(t, 17.6, 17.75)))); translate(.3 * uu, -.45 * uu); akProp(uu * .8, sw, 0); pop(); }; }   // out by the grip, barrel up, as it lay in the sack
    } else {
      No = { ...N, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', rot: .05 * Math.sin((t - 17.75) * 9), sq: (N.sq || 0) + .05 * Math.exp(-(t - 17.75) * 8), emoteDx: .3, emoteDy: .2 };
      hugAK(No, U);
    }
    No.face = faces(twitchShades(1), t > 16.95 && t < 17.4 ? drool(seg(t, 16.95, 17.25) * (1 - seg(t, 17.3, 17.4))) : null);
    spawnling(x, G, U, No);
    if (t >= 17.6 && t < 17.95) sparks(...[SACK[0] - 14, SACK[1] - 74], 1, t - 17.6, { n: 6, key: 'akout' });
    camEnd();
  }
  // 3C wide: the heli stops dead mid-air, turns slowly toward him (creak), and its searchlight swings onto him (18.6).
  function s3c(t, lt) {
    camBegin(...stage(.95, 1226, 1226 - 300 * .95, NX3, 431));
    scr(() => backdrop(t, sc(0, HZc)[1], { tower: 150 }));
    ground(t);
    sack(...SACK, .8, { ak: false });
    towel(...TOWEL, 300, 58);
    beansDown();
    rockGround(...ROCK, .9);
    const turn = ease(seg(t, 18.3, 18.95)), lightK = ease(seg(t, 18.6, 18.76));
    const h = heliAt({ x: 700, y: 430 + (t < 18.0 ? 4 * Math.sin(t * 2) : 0), s: .48, hd: lerp(.25, 2.15, turn), elev: .3, pitch: lerp(-.22, -.12, turn), spin: t < 18.0 ? 1 : 0, key: 'h3c' });
    const [tx, ty] = sc(NX3, G - 6.5 * U);
    if (lightK > 0) { const [lx, ly] = lens(h); beam(h, tx, ty, 1, { over: 1.12, aim: lerp(Math.PI / 2 - .6, Math.atan2(ty - ly, tx - lx), lightK) }); }
    const hit = t >= 18.7;
    const N = hit ? emotions(t, [[18.7, 'scared', { emote: null }]], { take: .6 }) : feel('love', t, { emote: 'hearts', emoteK: 1 - seg(t, 18.55, 18.7) });
    const No = { ...N, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', rot: hit ? 0 : .05 * Math.sin((t - 17.75) * 9), emoteDx: .3, emoteDy: .2, face: faces(twitchShades(1), hit ? sweatDrops(t, -1, 3) : null) };
    hugAK(No, U);
    spawnling(NX3, G, U, No);
    light(tx, ty, 150, lightK > .9 ? 1 : 0);
    drawHeli(h);
    camEnd();
  }
  // 3D medium: he drops the AK (19.1), throws his hands up and holds them there, then points at his briefs and
  // whistles. The light stays on him; the minigun spins up (20.0) and the rocket pods glow hot (20.5).
  function s3d(t, lt) {
    camBegin(...stage(1.5, 1236, 1236 - 180 * 1.5, NX3, 420));
    scr(() => backdrop(t, sc(0, HZc)[1], { tower: 130 }));
    ground(t);
    sack(...SACK, .8, { ak: false });
    towel(...TOWEL, 300, 58);
    const h = heliAt({ x: 680, y: 380 + 5 * Math.sin(t * 2.1), s: .74, hd: 2.1, elev: .3, pitch: -.15, spin: t > 20.0 ? 1 : 0, spinAng: spinUp(t, 20.0, 1.0), pods: ease(seg(t, 20.5, 20.7)), key: 'h3d' });
    const [tx, ty] = sc(NX3, G - 6.5 * U);
    beam(h, tx, ty, 1, { over: 1.12 });
    // the AK, dropped: it falls from his chest to the grass at his side
    const fall = seg(t, 19.1, 19.32);
    if (t >= 19.1 && fall < 1) {   // it leaves his arms as he held it (barrel up-right) and flips over as it drops
      const p = arcPt([NX3 - .3 * U, G - 6.1 * U], [AKDROP[0], AKDROP[1] - 10], 30, easeIn(fall));
      boilSeed('e5akground'); push(); translate(p[0], p[1]); scale(lerp(1, -1, ease(fall)), 1); rotate(lerp(-.82, .1, fall)); akProp(U * .8, 2.2, 0); pop();
    }
    if (fall >= 1) akGround(AKDROP[0], AKDROP[1] - 10, .1 + .03 * spring(t, 19.32, 8, 30));
    if (t >= 19.32) puff(AKDROP[0], AKDROP[1], 40, t - 19.32, { col: '#D9CDB4', key: 'akthud', n: 5, life: .45 });
    const N = emotions(t, [[19.0, 'scared', { emote: null }], [19.45, 'hopeful', { eyes: 'look', mouth: 'o', lookX: -.5, lookY: -.95, emote: 'music', blush: .3 }], [20.35, 'nervous', { mouth: 'o', emote: null, lookX: .95, lookY: -.75 }], [20.85, 'scared', { mouth: 'wobble', emote: null, lookX: .95, lookY: -.75 }]], { take: .45 });
    const No = { ...N, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', emoteDx: -.6, emoteDy: .5 };
    // the arms: from the hug, out to the sides and up (never across his face), held up, then down to point at his briefs
    const HUG = { L: [-.55 * U, -6.0 * U], R: [.8 * U, -7.0 * U] }, OUT = { L: [-3.0 * U, -6.6 * U], R: [3.0 * U, -6.6 * U] }, UP = { L: [-2.9 * U, -10.6 * U], R: [2.9 * U, -10.6 * U] };
    if (t < 19.1) hugAK(No, U);
    else if (t < 19.62) {
      const k1 = ease(seg(t, 19.1, 19.2)), k2 = ease(seg(t, 19.18, 19.3));
      for (const w of ['L', 'R']) reach(No, U, w, lerp(lerp(HUG[w][0], OUT[w][0], k1), UP[w][0], k2), lerp(lerp(HUG[w][1], OUT[w][1], k1), UP[w][1], k2));
      No.openL = No.openR = k2 > .3;
    } else {
      pointBriefs(No, U);
      const k = ease(seg(t, 19.62, 19.78));
      if (k < 1) { const up = { ...No }; reach(up, U, 'L', ...UP.L); reach(up, U, 'R', ...UP.R); for (const f of ['aL', 'bendL', 'aR', 'bendR', 'armKL', 'armKR']) No[f] = lerp(up[f] ?? 1, No[f] ?? 1, k); }
    }
    if (t > 20.6) No.dx = tremble(t, .025);
    No.face = faces(twitchShades(1), t > 20.35 ? sweatDrops(t, -1, t > 20.85 ? 3.4 : 2.4) : null);
    spawnling(NX3, G, U, No);
    light(tx, ty, 230, 1);
    drawHeli(h);
    camEnd();
  }
  // 3E wide: four rockets (21.0) streak at the AK at his side; a white flash and BOOM (21.4).
  function s3e(t, lt) {
    const sh = t >= 21.4 ? shakeXY(t, 22 * Math.exp(-(t - 21.4) * 4)) : [0, 0], cam = stage(.95, 1226, 1226 - 300 * .95, NX3, 431);
    camBegin(cam[0] - sh[0], cam[1] - sh[1], cam[2]);
    scr(() => backdrop(t, sc(0, HZc)[1], { tower: 150 }));
    ground(t);
    const boomed = t >= 21.4;
    if (!boomed) { sack(...SACK, .8, { ak: false }); akGround(AKDROP[0], AKDROP[1] - 10, .1); }
    towel(...TOWEL, 300, 58);
    rockGround(...ROCK, .9);
    const h = heliAt({ x: 700 + (boomed ? sh[0] * .5 : 0), y: 430, s: .48, hd: 2.15, elev: .3, pitch: -.14, spin: 1, pods: t < 21.25 ? 1 : .3, key: 'h3e' });
    const [tx, ty] = sc(NX3, G - 6.5 * U);
    if (!boomed) beam(h, tx, ty, 1, { over: 1.12 });
    const N = emotions(t, [[21.0, 'surprised', { emote: '!!', lookX: .9, lookY: -.6 }]], { take: .7 });
    const look = t < 21.2 ? { lookX: .9, lookY: -.6 } : { lookX: -.8, lookY: .8 };
    const No = boomed ? { eyes: 'blank', mouth: 'O', ...SOOT, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', aL: .9, bendL: -.4, aR: .85, bendR: -.4, openL: true, openR: true }
      : { ...N, ...look, boilKey: NK, seed: 1, view: 'front', rawArms: true, prop: 'none', aL: lerp(-1.25, .9, ease(seg(t, 21.05, 21.25))), bendL: -.4, aR: lerp(-1.25, .85, ease(seg(t, 21.08, 21.28))), bendR: -.4, openL: true, openR: true, emoteDx: .4, emoteDy: .3, face: twitchShades(1) };
    spawnling(NX3, G, U, No);
    if (!boomed) light(tx, ty, 150, 1);
    clods(AKDROP[0], AKDROP[1], 180, t - 21.4, 9, 'clod3e');
    boom(AKDROP[0], AKDROP[1] - 20, 210, t - 21.4, 'b3e');
    drawHeli(h);
    scr(() => {
      const [ax, ay] = sc(AKDROP[0], AKDROP[1] - 16);
      [[21.0, 'podL'], [21.07, 'podR'], [21.14, 'podL'], [21.21, 'podR']].forEach(([t0, p], i) => {
        const [px, py] = heliPt(h.x, h.y, h.s, h, p), dur = 21.4 - t0;
        rocket(px, py, ax + (i - 1.5) * 18, ay, (t - t0) / dur, { s: .8, dur, arc: 30 + 20 * i, key: 'rk3e' + i });
      });
    });
    camEnd();
    if (boomed) flash(Math.exp(-(t - 21.4) * 9));
  }
  // 3F the opening's low angle again: the smoke clears on him, sooty and smoking beside a crater, the AK bent into a U.
  // The heli comes back and scans him (22.4–23.2), lets him go ("hmph") and is gone. He turns to watch it go and falls
  // flat on his face, away from us: his back, the soles of his feet (23.6).
  function s3f(t, lt) {
    camBegin(...stage(.9, 1150, 1150 - 160 * .9, NX3, 330));
    scr(() => backdrop(t, sc(0, HZc)[1], { tower: 120 }));
    const arrive = easeOut(seg(t, 22.0, 22.42)), hov = HOVER(t, { s: 1.15, key: 'h3f' });
    hov.x = lerp(1260, 560 + 8 * Math.sin(t * 1.3), arrive); hov.y = lerp(330, 470 + 7 * Math.sin(t * 2.1), arrive); hov.hd = lerp(2.2, 1.12, arrive);
    const h = leaving(heliAt(hov), t, 23.2, .8), windK = arrive * (1 - seg(t, 23.5, 23.9)), hx = ws(h.x, 0)[0];
    ground(t, { wind: [hx, windK] });
    downwash(t, hx, G, windK * .7);
    crater(AKDROP[0], AKDROP[1] + 4, 95);
    bentAK(AKDROP[0] + 14, AKDROP[1] - 16, 1.05);
    clods(AKDROP[0], AKDROP[1], 180, 9, 9, 'clod3e');   // where they landed
    towel(...TOWEL, 300, 58, { singe: 1 });
    rockGround(...ROCK, .9);   // rocks don't burn
    const on = t > 22.3 && t < 23.2 ? 1 : t >= 23.2 && t < 23.26 ? .3 : 0, [tx, ty] = sc(NX3, G - 6.5 * U);
    beam(h, tx, ty, on, { over: 1.15 });
    // the Naked, sooty: stands through the scan, turns his back to watch it go (23.24–23.34), and falls flat on his
    // face, away from us (23.38–23.6): his body foreshortens to a heap, the soles of his feet toward us
    const view = t < 23.24 ? 'front' : t < 23.28 ? 'qf' : t < 23.32 ? 'q' : 'back', fall = easeIn(seg(t, 23.38, 23.6)), down = t >= 23.6;
    const blink = t > 22.7 && t < 22.78;
    spawnling(NX3, G, U, { eyes: blink ? 'closed' : 'blank', mouth: t < 23.2 ? 'flat' : 'o', ...SOOT, boilKey: NK, seed: 1, view, rawArms: true, prop: 'none', aL: lerp(-1.2, -.5, fall), bendL: .2, aR: lerp(-1.22, -.45, fall), bendR: .2,
      sy: lerp(1, .17, fall) * (down ? 1 - .25 * Math.exp(-(t - 23.6) * 12) : 1), sx: 1 + .08 * fall, noShadow: fall > .5 });
    if (fall > .55) {   // the soles of his feet, toes in the dirt
      boilSeed('soles');
      for (const s of [-1, 1]) { const fx = NX3 + s * .75 * U, fy = G - .25 * U, k = clamp((fall - .55) / .45); paint(ellPts(fx, fy - .45 * U * k, .42 * U, .62 * U * k, 14), { wash: '#C9B9AE', ink: PAL.ink, sw: 1.2 }); paint(ellPts(fx, fy - .75 * U * k, .24 * U, .2 * U * k, 10), { wash: '#B3A398', ink: null }); }
    }
    if (down) { puff(NX3, G - 2.6 * U, 70, t - 23.6, { col: '#D9CDB4', key: 'faceplant', n: 6, life: .5, rise: .4 }); puff(NX3 + .5 * U, G - 2.8 * U, 40, t - 23.62, { col: '#3E3A38', key: 'ash', n: 4, life: .5 }); }
    smolder(AKDROP[0] + 20, AKDROP[1] - 40, .9, t - 21.4, { key: 'akwisp' });
    if (!down) smolder(NX3 + 6, G - 12.8 * U * lerp(1, .17, fall), 1.2, t - 21.5, { key: 'him' });
    softSmoke(NX3 - 40, G - 6 * U, 150, t - 21.75, 'clear3f', 7, 1.0);   // the blast's smoke, clearing off him
    light(tx, ty, 170, on);
    drawHeli(h);
    snort(h, t - 23.28);
    const k = seg(t, 22.4, 23.2), fade = 1 - seg(t, 23.2, 23.4);
    if (t >= 22.4 && fade > 0) scr(() => scanLine(sc(NX3, 0)[0], sc(0, G - 13.2 * U)[1], sc(0, G + .2 * U)[1], ease(k), 230 * CAM.zoom, { from: lens(h), a: fade, key: 'scan3' }));
    camEnd();
  }

  // ---------- asset sheet (render with --ep=5 --loop=e5kit): the episode's new props, for review ----------
  LOOPS.e5kit = t => {
    HZc = 760; camBegin(540, 960, 1);
    backdrop(t, 760, { tower: 795 });
    staticSeed('kitground'); paint(rectPts(-100, 757, W + 200, 1300), { wash: '#8DAA62', ink: null });
    clothesPile(200, 900, .9); boilSeed('kithat'); boonie(470, 860, 80, {}); boonieTumble(700, 860, 80, t * 3, t); shadesProp(930, 860, 2);
    towel(300, 1065, 420, 110); sack(780, 1110, 1.1, { glint: .8 + .2 * Math.sin(t * 6) });
    crater(280, 1260, 120); bentAK(780, 1265, 1.2);
    flyHoodie(170, 1460, 1.1, .3); flyPants(450, 1460, 1.1, -.4, .6); fightCloud(820, 1440, 130, t);
    spawnling(170, 1880, 30, { ...feel('cool', t), view: 'front', prop: 'none', eyes: 'normal', gear: { hoodie: true, pants: true }, under: (u, sw, V) => zipUnder(u, V), draw: (u, sw, V) => hatOn(u, V), face: twitchShades(0) });
    spawnling(420, 1880, 30, { ...feel('happy', t), view: 'q', prop: 'none', draw: (u, sw, V) => hatOn(u, V), face: twitchShades(.5 + .5 * Math.sin(t * 3)) });
    spawnling(680, 1880, 30, { ...feel('neutral', t), view: 'side', prop: 'none', face: twitchShades(0) });
    spawnling(930, 1880, 30, { eyes: 'blank', mouth: 'flat', ...SOOT, view: 'front', prop: 'none' });
    camEnd();
  };
  LOOPS.e5kit.len = 2;

  shots([[0, s1], [2.5, s1], [3.5, s1c], [6, s2], [8, s2], [10, s2], [11, s2d], [14, s3a], [16, s3b], [18, s3c], [19, s3d], [21, s3e], [22, s3f]]);
  transitions([[6.0, 'heliFlyover', { in: .3 }], [14.0, 'supplySmoke', { in: .35 }]]);
})();
