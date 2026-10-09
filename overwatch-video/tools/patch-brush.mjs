// Builds lib/p5.brush.js from node_modules/p5.brush with one exact speed-up for CPU rendering (llvmpipe/SwiftShader):
// where a mask pixel is fully opaque, spectral_mix(bg, pigment, 1.0) equals the pigment exactly (KM(KS(R)) = R and the
// spectral round trip is the identity), so the 38-band Kubelka-Munk mix is skipped there. Partial coverage still mixes
// spectrally, so the look is unchanged. Run after npm install: node tools/patch-brush.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('node_modules/p5.brush/dist/p5.brush.js', 'utf8');
const find = 'float mixIntensity=min(maskColor.a,1.0);';
if (src.split(find).length !== 2) throw new Error('p5.brush shader changed: patch point not found exactly once');
const out = src.replace(find, find + 'if(maskColor.a>=1.0){outColor=vec4(pigment.rgb,1.);return;}');
writeFileSync('lib/p5.brush.js', '// p5.brush 2.2.3 (MIT, Alejandro Campos), patched by tools/patch-brush.mjs: opaque fast path in the blend shader.\n' + out);
console.log('wrote lib/p5.brush.js');
