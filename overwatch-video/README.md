# Support Main — a Clawd × Overwatch short

A 50-second hand-painted cartoon: Clawd mains Mercy. The team spams "I need healing", gets wiped by a High Noon, and Clawd brings everyone back with "Heroes never die", earning Play of the Game. Then Genji asks for healing one more time.

**Watch it:** [`support_main.mp4`](support_main.mp4) (1920×1080, 24 fps, with an original soundtrack).

The plan is in [STORYBOARD.md](STORYBOARD.md), with every shot, read and transition timed to a 120 BPM grid.

*Unofficial fan animation. Overwatch and its heroes belong to Blizzard Entertainment. No game assets, audio or logos are used: everything is painted in code, and the music is synthesized from scratch.*

## How these videos are made

The trending Clawd videos ([I'm Upping My P(doom)](https://github.com/JohnHeibel/PDoomVideo), built on the [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) kit) aren't drawn in an animation app. Claude writes them as code:

1. **Storyboard first.** The model writes a shot list where each shot has an *event* and a timed list of *reads*: what the viewer must understand, and when.
2. **Paint with code.** Every frame is painted by [p5.js](https://p5js.org) and [p5.brush](https://github.com/acamposuribe/p5.brush), which give watercolour fills, ink strokes and pigment mixing. The character is Clawd, a terracotta block with legs, acting through a library of 31 emotions, drawn key views (no 3D) and beat-locked dances.
3. **Pure functions of time.** A shot is `fn(t)`, so any frame can be rendered alone, in parallel and out of order. The linework is reseeded 12 times a second, so it "boils" like hand-drawn animation.
4. **Look, then fix.** Headless Chrome renders contact sheets, frame strips and crops. The model opens them and checks timing, contacts, transitions and readability, then iterates.
5. **Render.** Puppeteer renders every frame and ffmpeg encodes them with the music.

This short follows that method. The engine (`src/core.js`, `src/clawd.js`, `src/timeline.js`, `render.mjs`, `ANIMATION_GUIDE.md`) comes from ClaudeAnimationBase (MIT). Everything else is new:

| path | what it is |
|---|---|
| [`src/cast.js`](src/cast.js) | The heroes as Clawds in costume: Mercy (wings, Valkyrie spread, Caduceus staff, heal beam), Reinhardt (helmet, rocket hammer, hex barrier), Tracer (goggles, chronal disc, blink trails), Genji (visor, green eyes, glowing blade) and the enemy Cowboy (hat, serape, cigar, revolver). Also the "+" healing call, hearts, dead-eye skulls and rez pillars. |
| [`src/sets.js`](src/sets.js) | The spawn room, the western payload map (sky, mesas, saloon, water tower, rails, checkpoint arch), the payload, tumbleweed, confetti, fireworks and the Play of the Game bands. |
| [`src/scenes/video.js`](src/scenes/video.js) | The 11 shots. |
| [`src/scenes/castsheet.js`](src/scenes/castsheet.js) | A model sheet of the cast (`studio.html?loop=cast`). |
| [`tools/music.mjs`](tools/music.mjs) | The soundtrack: a dependency-free Node synthesizer that composes the score and every sound effect from [`assets/cues.json`](assets/cues.json). |
| [`lib/p5.brush.js`](lib/p5.brush.js) | p5.brush with one exact speed-up (below), built by [`tools/patch-brush.mjs`](tools/patch-brush.mjs). |

`src/clawd.js` gained three small hooks for costumes: `behind` (wings drawn behind the body), `under` (visors and emblems drawn under the eyes) and `eyeCol` (Genji's green eyes). Emotion colour cross-fades now respect each hero's own body colour.

## Rendering without a GPU

The kit expects a GPU. This video was rendered on a 4-core cloud VM with none. Software WebGL (SwiftShader) took about 35 s a frame, so a few changes were needed:

- **llvmpipe instead of SwiftShader.** `--xvfb` runs a headful Chrome on a virtual X display. WebGL then goes through ANGLE to desktop GL and lands on Mesa's llvmpipe. That's about 5× faster. `node tools/gl_probe.mjs` shows which renderer you get.
- **CPU 2D canvas.** p5.brush paints every watercolour fill on a 2D canvas before compositing it. "Accelerating" that canvas through llvmpipe is 4–7× slower than leaving it on the CPU, so `--xvfb` adds `--disable-accelerated-2d-canvas`.
- **Opaque fast path.** The blend shader runs a 38-band spectral Kubelka–Munk pigment mix on every covered pixel. Where the paint is fully opaque, that mix returns the pigment exactly (KM(KS(R)) = R), so the patched shader skips it there. Frames are pixel-identical (max difference 0), and every fully opaque pixel skips the spectral maths.

The result is about 1.5–3.5 s per frame, and the whole film renders in under an hour.

## Run it

You need Node.js, Chrome or Chromium, and ffmpeg. With no GPU, you also need Xvfb.

```bash
npm install && node tools/patch-brush.mjs          # deps + the patched p5.brush
node tools/music.mjs                               # synthesize assets/soundtrack.wav
Xvfb :99 -screen 0 1920x1080x24 &                  # only for --xvfb (no GPU)
node render.mjs --xvfb --sheet=7,9.8,13.2,21.6,27.8,39.3 --cols=3 --out=out/check/sheet.jpg   # look at it
node render.mjs --xvfb --frames --workers=1        # all frames → out/frames (resumable)
node render.mjs --encode --crf=23 --audio=assets/soundtrack.wav --out=support_main.mp4
```

Add `--chrome=<path>` if Chrome isn't found. To scrub the film, open `studio.html` in Chrome, or `studio.html?loop=cast` for the model sheet.

## Credits and licences

- Animation engine and guide: [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) by John Heibel, MIT ([LICENSE](LICENSE)).
- [p5.brush](https://github.com/acamposuribe/p5.brush) by Alejandro Campos, MIT ([lib/p5.brush.LICENSE.md](lib/p5.brush.LICENSE.md)). [p5.js](https://p5js.org), LGPL.
- Font: Permanent Marker by Font Diner, Apache 2.0.
- Story, cast, sets, shots and music: written for this video, all made in code.
