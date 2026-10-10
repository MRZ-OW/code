// Builds lib/p5.brush.js from node_modules/p5.brush with a seam fix (below) and one exact speed-up for CPU rendering (llvmpipe/SwiftShader):
// where a mask pixel is fully opaque, spectral_mix(bg, pigment, 1.0) equals the pigment exactly (KM(KS(R)) = R and the
// spectral round trip is the identity), so the 38-band Kubelka-Munk mix is skipped there. Partial coverage still mixes
// spectrally, so the look is unchanged. Run after npm install: node tools/patch-brush.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('node_modules/p5.brush/dist/p5.brush.js', 'utf8');
const find = 'float mixIntensity=min(maskColor.a,1.0);';
if (src.split(find).length !== 2) throw new Error('p5.brush shader changed: patch point not found exactly once');
let out = src.replace(find, find + 'if(maskColor.a>=1.0){outColor=vec4(pigment.rgb,1.);return;}');
// Seam fix: where the mask is empty the shader copied the "source" snapshot of the canvas back over it. The composite
// rect is padded a few pixels past the snapshot that was blitted, so along its left and bottom edges it copied stale
// pixels, leaving 1-px light lines around shapes painted over darker ones. Leaving those pixels untouched is exact.
const empty = 'if(maskColor.a==0.0){outColor=source;return;}';
if (out.split(empty).length !== 2) throw new Error('p5.brush shader changed: seam patch point not found exactly once');
out = out.replace(empty, 'if(maskColor.a==0.0){discard;}');
writeFileSync('lib/p5.brush.js', '// p5.brush 2.2.3 (MIT, Alejandro Campos), patched by tools/patch-brush.mjs: opaque fast path and seam fix in the blend shader.\n' + out);
console.log('wrote lib/p5.brush.js');
