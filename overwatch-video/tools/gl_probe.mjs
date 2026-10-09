// Which WebGL renderer does Chrome land on in each GL mode (SwiftShader vs. llvmpipe under Xvfb)? Needs Xvfb on :99.
// node tools/gl_probe.mjs
import puppeteer from 'puppeteer-core';
const chrome = process.env.CHROME_PATH || '/opt/pw-browsers/chromium';
const base = ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const cands = {
  'headless-swiftshader': [true, ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']],
  'xvfb-angle-gl': [false, ['--use-gl=angle', '--use-angle=gl', '--ozone-platform=x11']],
  'xvfb-angle-vulkan': [false, ['--use-gl=angle', '--use-angle=vulkan', '--enable-features=Vulkan', '--ozone-platform=x11']],
  'xvfb-desktop-gl': [false, ['--use-gl=desktop', '--ozone-platform=x11']],
};
for (const [name, [headless, flags]] of Object.entries(cands)) {
  let b;
  try {
    b = await puppeteer.launch({ executablePath: chrome, headless, args: [...base, ...flags], env: { ...process.env, DISPLAY: ':99' } });
    const p = await b.newPage();
    const info = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); if (!gl) return 'no webgl2'; const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
    console.log(name.padEnd(24), info);
  } catch (e) { console.log(name.padEnd(24), 'FAILED', e.message.split('\n')[0]); }
  finally { await b?.close(); }
}
