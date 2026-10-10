#!/usr/bin/env node
// tools/music.mjs: the "Rock Bottom" audio tool. Original score + sound effects for every episode.
//
// Everything is synthesized here from oscillators, noise, envelopes, filters, reverb and delay.
// No samples, no downloads, no game audio, no voices, no npm dependencies.
//
//   node tools/music.mjs --ep=1             render episodes/ep1/cues.json -> episodes/ep1/soundtrack.wav
//   node tools/music.mjs --all              render every episode (in parallel), then a summary table
//   node tools/music.mjs --ep=1 --report    also print each cue's margin over the bed (phone band), short-term loudness, spectrum
//   node tools/music.mjs --ep=1 --cues=try.json --out=try.wav   render a variant cue sheet to another file
//   node tools/music.mjs --list             list the cue types and music styles with their params
//   node tools/music.mjs --audition=boing,zap [--out=x.wav]   render cue types alone, print their levels and spectrum,
//                                           write them to x.wav (default $TMPDIR/rock-bottom-audition.wav)
//
// Output: 48 kHz / 16-bit / stereo WAV of exactly `duration` seconds, mastered to -14 LUFS integrated
// with true peak <= -1 dBTP. Loudness and true peak are measured with ffmpeg's ebur128 filter after writing.
//
// cues.json (one per episode, see AUDIO.md):
//   { "title": "...", "duration": 28, "bpm": 120, "loop": true,
//     "sections": [ { "name": "...", "t0": 4.5, "t1": 10, "style": "theme", "gain": 0, "key": "G", ...style params } ],
//     "cues": [ [t, "type", { ...params }] ] }
//   * Every SFX is a cue [t, type, params]; every music section is { name, t0, t1, style, ... }.
//   * Common section params: gain (dB), fadeIn / fadeOut (s), cut (hard stop at t1, reverb tail gated too),
//     key ("G", "Dm"...), thin ([[a, b], ...] windows where melodic layers rest so a gag can read).
//   * Common cue params: gain (dB), pan (-1..1), duck (dB the music dips under it), and dur for anything with a length.
//   * Optional "mix": { "music": dB, "amb": dB, "sfx": dB } trims the three buses for one episode (defaults in MIX).
//   * Loop episodes ("loop": true) are rendered on a circle: anything past `duration` (a section with
//     t1 > duration, an ambience bed, a reverb tail) wraps to t = 0, and t0 < 0 means "started in the previous lap".
//     So the last frame flows into the first with the same bed and no click.
//
// File layout: 1 cli + config, 2 dsp, 3 buses, 4 instruments, 5 theory + signature tune, 6 music styles,
//              7 sfx, 8 mixdown + master + loudness, 9 reports, 10 main.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { cpus } from 'node:os';

// ════════════════════════════ 1. cli + config ════════════════════════════
const SELF = fileURLToPath(import.meta.url);
const ROOT = join(dirname(SELF), '..');
const ARGS = {};
for (const a of process.argv.slice(2)) { const m = /^--([\w-]+)(?:=(.*))?$/.exec(a); if (m) ARGS[m[1]] = m[2] ?? true; }

const SR = 48000;
const TAU = Math.PI * 2;
const TARGET_LUFS = -14;      // integrated loudness target (YouTube)
const TP_LIMIT = -1.0;         // dBTP, measured by ffmpeg
const TP_CEIL = -1.4;          // internal limiter ceiling (4x oversampled), leaves margin for ffmpeg's resampler

// Episode state (one episode per process; --all spawns one process per episode).
let EP = 0, CUES = null, DUR = 0, N = 0, NB = 0, EXT = 0, LOOP = false, BPM = 120, BEAT = 0.5, BAR = 2;
let SECTIONS = [], CUE_LIST = [];

// ════════════════════════════ 2. dsp ════════════════════════════
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const db = (x) => Math.pow(10, x / 20);
const DB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const sec2n = (t) => Math.round(t * SR);
const newBuf = (dur) => new Float32Array(Math.max(1, Math.ceil(dur * SR)));
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '-inf');

// Deterministic RNG (mulberry32), reseeded per section / cue so moving one cue never changes another's sound.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(0x5eed);
function reseed(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } rnd = mulberry32(h >>> 0); }
const rand = (a = 0, b = 1) => a + (b - a) * rnd();
const white = () => rnd() * 2 - 1;

/** Pink-ish noise (Paul Kellett's filter). */
function pinkGen() {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = white();
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    const y = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
    return y * 0.11;
  };
}

// ── envelopes (t in seconds since note start) ──
/** ADSR held for `hold` s, linear attack/decay, quadratic release to exactly 0. */
function adsr(t, a, d, s, r, hold) {
  if (t <= 0) return 0;
  const lvl = (u) => (u < a ? u / a : u < a + d ? 1 - (1 - s) * ((u - a) / d) : s);
  if (t <= hold) return lvl(t);
  const u = (t - hold) / r;
  if (u >= 1) return 0;
  const k = 1 - u;
  return lvl(hold) * k * k;
}
/** Percussive: linear attack `a`, exponential decay with time-constant `tau`. */
const perc = (t, a, tau) => (t <= 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / tau));
/** Piecewise-linear automation [[t, v], ...] evaluated at t. */
function curve(pts, t) {
  if (t <= pts[0][0]) return pts[0][1];
  for (let k = 1; k < pts.length; k++) if (t < pts[k][0]) return lerp(pts[k - 1][1], pts[k][1], (t - pts[k - 1][0]) / (pts[k][0] - pts[k - 1][0]));
  return pts[pts.length - 1][1];
}

// ── band-limited oscillators (PolyBLEP) ──
function blep(p, dt) {
  if (p < dt) { p /= dt; return p + p - p * p - 1; }
  if (p > 1 - dt) { p = (p - 1) / dt; return p * p + p + p + 1; }
  return 0;
}
class Osc {
  constructor(phase = rnd()) { this.p = phase; }
  step(f) { this.p += f / SR; if (this.p >= 1) this.p -= Math.floor(this.p); else if (this.p < 0) this.p -= Math.floor(this.p); }
  sin(f) { const y = Math.sin(TAU * this.p); this.step(f); return y; }
  saw(f) { const dt = Math.abs(f) / SR, p = this.p; const y = 2 * p - 1 - blep(p, dt); this.step(f); return y; }
  pulse(f, w = 0.5) {
    const dt = Math.abs(f) / SR, p = this.p;
    const y = (p < w ? 1 : -1) + blep(p, dt) - blep((p - w + 1) % 1, dt);
    this.step(f); return y - (2 * w - 1);
  }
  tri(f) { const y = 4 * Math.abs(this.p - 0.5) - 1; this.step(f); return y; }
}
/** Phase-accumulating sine whose frequency can change every sample. */
const sweepSine = (ph = rnd()) => (f) => { const y = Math.sin(TAU * ph); ph += f / SR; if (ph >= 1) ph -= Math.floor(ph); return y; };

// ── filters ──
/** Topology-preserving state-variable filter (Zavalishin). Stable under fast cutoff modulation. */
class SVF {
  constructor() { this.s1 = 0; this.s2 = 0; this.lp = 0; this.bp = 0; this.hp = 0; }
  run(x, fc, q = 0.707) {
    const g = Math.tan(Math.PI * clamp(fc, 10, SR * 0.45) / SR), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - this.s2;
    const v1 = a1 * this.s1 + a2 * v3;
    const v2 = this.s2 + a2 * this.s1 + a3 * v3;
    this.s1 = 2 * v1 - this.s1; this.s2 = 2 * v2 - this.s2;
    this.lp = v2; this.bp = v1 * k; this.hp = x - k * v1 - v2; // bp normalised to 0 dB peak
    return v2;
  }
}
/** RBJ biquad for static EQ / filtering. type: lp hp bp peak lowshelf highshelf */
class Biquad {
  constructor(type, f, q = 0.707, gainDb = 0) {
    const w = TAU * clamp(f, 5, SR * 0.49) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (type) {
      case 'lp': b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break;
      case 'hp': b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break;
      case 'bp': b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; break;
      case 'peak': b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; break;
      case 'lowshelf': case 'highshelf': {
        const sq = 2 * Math.sqrt(A) * al, sg = type === 'lowshelf' ? 1 : -1;
        b0 = A * ((A + 1) - sg * (A - 1) * c + sq); b1 = sg * 2 * A * ((A - 1) - sg * (A + 1) * c);
        b2 = A * ((A + 1) - sg * (A - 1) * c - sq); a0 = (A + 1) + sg * (A - 1) * c + sq;
        a1 = -sg * 2 * ((A - 1) + sg * (A + 1) * c); a2 = (A + 1) + sg * (A - 1) * c - sq; break;
      }
      default: throw new Error('biquad type ' + type);
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}
/** One-pole low/high-pass (6 dB/oct). */
class OnePole {
  constructor(fc) { this.y = 0; this.set(fc); }
  set(fc) { this.a = Math.exp(-TAU * clamp(fc, 1, SR * 0.45) / SR); return this; }
  lp(x) { return (this.y = x + this.a * (this.y - x)); }
  hp(x) { return x - this.lp(x); }
}
/** Filter a whole buffer in place with a chain of fresh biquads [[type, f, q, gain], ...]. */
function filt(b, chain) {
  const fs = chain.map(([ty, f, q, g]) => new Biquad(ty, f, q ?? 0.707, g ?? 0));
  for (let i = 0; i < b.length; i++) { let x = b[i]; for (const f of fs) x = f.run(x); b[i] = x; }
  return b;
}

// ── Freeverb-style stereo reverb (8 damped combs + 4 allpasses per side) ──
const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const APS = [556, 441, 341, 225];
const SPREAD = 23;
class Freeverb {
  constructor({ fb = 0.84, damp = 0.3, width = 1, size = 1 } = {}) {
    const sc = (SR / 44100) * size;
    this.fb = fb; this.damp = damp; this.width = width;
    const mk = (sizes, off) => sizes.map((s) => ({ b: new Float32Array(Math.round((s + off) * sc)), i: 0, z: 0 }));
    this.cL = mk(COMBS, 0); this.cR = mk(COMBS, SPREAD); this.aL = mk(APS, 0); this.aR = mk(APS, SPREAD);
  }
  static comb(c, x, fb, damp) {
    const y = c.b[c.i]; c.z = y * (1 - damp) + c.z * damp; c.b[c.i] = x + c.z * fb;
    if (++c.i >= c.b.length) c.i = 0; return y;
  }
  static ap(a, x) {
    const b = a.b[a.i]; const y = b - x; a.b[a.i] = x + b * 0.5;
    if (++a.i >= a.b.length) a.i = 0; return y;
  }
  run(x) {
    let l = 0, r = 0;
    for (let k = 0; k < 8; k++) { l += Freeverb.comb(this.cL[k], x, this.fb, this.damp); r += Freeverb.comb(this.cR[k], x, this.fb, this.damp); }
    for (let k = 0; k < 4; k++) { l = Freeverb.ap(this.aL[k], l); r = Freeverb.ap(this.aR[k], r); }
    const w1 = 0.5 + this.width / 2, w2 = (1 - this.width) / 2;
    this._l = l * w1 + r * w2; this._r = r * w1 + l * w2;
  }
}
const RV_NORM = new Map();
/** Energy gain of a reverb's impulse response, used to calibrate wet level to ~unity power. */
function reverbNorm(opts) {
  const key = JSON.stringify(opts);
  if (!RV_NORM.has(key)) {
    const rv = new Freeverb(opts); let e = 0;
    for (let n = 0; n < SR * 5; n++) { rv.run(n === 0 ? 1 : 0); e += rv._l * rv._l; }
    RV_NORM.set(key, 1 / Math.sqrt(e));
  }
  return RV_NORM.get(key);
}
/** Run a mono send through a reverb and ADD the wet result into outL/outR (pre-filtered, pre-delayed). */
function applyReverb(send, outL, outR, { fb = 0.84, damp = 0.3, width = 1, size = 1, predelay = 0.02, hp = 180, lp = 9000, gain = 1 } = {}) {
  const first = send.findIndex((v) => v !== 0);
  if (first < 0) return;
  const rv = new Freeverb({ fb, damp, width, size });
  const norm = reverbNorm({ fb, damp, width, size }) * gain;
  const pd = Math.max(1, sec2n(predelay)), dl = new Float32Array(pd); let di = 0;
  const h = new Biquad('hp', hp, 0.7), l = new Biquad('lp', lp, 0.7);
  let quiet = 0;
  for (let n = first; n < send.length; n++) {
    const x = l.run(h.run(send[n]));
    const d = dl[di]; dl[di] = x; if (++di >= pd) di = 0;
    rv.run(d);
    const yl = rv._l * norm, yr = rv._r * norm;
    outL[n] += yl; outR[n] += yr;
    // stop early once the send has been silent for 6 s and the tail has died
    if (send[n] === 0 && Math.abs(yl) < 1e-7) { if (++quiet > SR * 6) { const nx = send.findIndex((v, k) => k > n && v !== 0); if (nx < 0) break; n = nx - 1; quiet = 0; } } else quiet = 0;
  }
}
/** Ping-pong delay on a mono send, wet added into outL/outR. */
function applyPingPong(send, outL, outR, { time = 0.375, fb = 0.35, lp = 3800, hp = 300, gain = 1 } = {}) {
  const D = sec2n(time), bl = new Float32Array(D), br = new Float32Array(D);
  const fl = new OnePole(lp), fr = new OnePole(lp), h = new Biquad('hp', hp, 0.7);
  let i = 0;
  for (let n = 0; n < send.length; n++) {
    const x = h.run(send[n]);
    const dl = bl[i], dr = br[i];
    bl[i] = fl.lp(x + dr * fb); br[i] = fr.lp(dl * fb);
    outL[n] += dl * gain; outR[n] += dr * gain;
    if (++i >= D) i = 0;
  }
}

// ── WAV writer (16-bit PCM, interleaved stereo, TPDF dither) ──
function writeWav(path, L, R) {
  const n = L.length, bytes = n * 4, b = Buffer.alloc(44 + bytes);
  b.write('RIFF', 0); b.writeUInt32LE(36 + bytes, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(bytes, 40);
  const d = mulberry32(0xd17e);
  const q = (x) => clamp(Math.round(x * 32767 + (d() - d())), -32768, 32767);
  for (let i = 0, o = 44; i < n; i++, o += 4) { b.writeInt16LE(q(L[i]), o); b.writeInt16LE(q(R[i]), o + 2); }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, b);
}

// ════════════════════════════ 3. buses ════════════════════════════
// A target holds dry stereo + mono sends (room, hall, delay). Instruments and SFX mix into the current
// target TGT: a section's private buffer (so the section can be faded, trimmed or cut), or a global bus.
// Global buses span [0, NB) = the episode plus EXT seconds of overhang (folded back to t = 0 in loop episodes).
function mkTarget(t0, dur) {
  const n = Math.max(1, Math.ceil(dur * SR));
  return { t0, n, L: new Float32Array(n), R: new Float32Array(n), room: new Float32Array(n), hall: new Float32Array(n), delay: new Float32Array(n) };
}
let BUS = null;   // { music, amb, sfx }
let TGT = null;   // current target
let LVL = 1;      // extra linear gain applied by place() (per-cue trims)

/**
 * Mix a rendered voice into TGT at time t0 (s). 0.5 ms fade-in / 4 ms fade-out on every voice (click insurance),
 * gain, pan (mono voices: equal-power, unity at centre; stereo: balance) and reverb/delay sends.
 */
function place(L, R, t0, o, mono) {
  const T = TGT, gain = (o.gain ?? 1) * LVL, pan = clamp(o.pan ?? 0, -1, 1);
  let gl = gain, gr = gain;
  if (mono) { const a = ((pan + 1) * Math.PI) / 4; gl *= Math.cos(a) * Math.SQRT2; gr *= Math.sin(a) * Math.SQRT2; }
  else { gl *= Math.min(1, 1 - pan); gr *= Math.min(1, 1 + pan); }
  const sr = (o.room ?? 0) * gain, sh = (o.hall ?? 0) * gain, sd = (o.delay ?? 0) * gain;
  const len = L.length, i0 = Math.round((t0 - T.t0) * SR);
  const fin = Math.max(1, Math.round(0.0005 * SR)), fout = Math.max(1, Math.round(0.004 * SR));
  for (let j = Math.max(0, -i0); j < len; j++) {
    const n = i0 + j;
    if (n >= T.n) break;
    let w = j < fin ? j / fin : 1;
    const k = len - 1 - j;
    if (k < fout) w = Math.min(w, k / fout);
    const l = L[j] * w, r = R[j] * w;
    T.L[n] += l * gl; T.R[n] += r * gr;
    const m = mono ? l : (l + r) * 0.5;
    if (sr) T.room[n] += m * sr;
    if (sh) T.hall[n] += m * sh;
    if (sd) T.delay[n] += m * sd;
  }
}
const out = (buf, t0, o = {}) => place(buf, buf, t0, o, true);
const outSt = (L, R, t0, o = {}) => place(L, R, t0, o, false);

// ════════════════════════════ 4. instruments ════════════════════════════
// Each instrument renders one note/event into a fresh buffer and mixes it with out()/outSt().
const gen = (len, fn) => { const b = newBuf(len); for (let i = 0; i < b.length; i++) b[i] = fn(i / SR, i); return b; };
const gen2 = (len, mk) => [0, 1].map((s) => gen(len, mk(s)));
function autoPan(b, panAt) {
  const L = new Float32Array(b.length), R = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) {
    const a = ((clamp(panAt(i / b.length), -1, 1) + 1) * Math.PI) / 4;
    L[i] = b[i] * Math.cos(a) * Math.SQRT2; R[i] = b[i] * Math.sin(a) * Math.SQRT2;
  }
  return [L, R];
}
/** Sum of exponentially decaying sine partials: [[ratio, amp, tau], ...] */
function partials(f, parts, len, attack = 0.002, pitchEnv) {
  const b = newBuf(len);
  for (const [r, a, tau] of parts) {
    let ph = rand(0, 1);
    const fr = f * r;
    if (fr > SR * 0.42) continue;
    const n = Math.min(b.length, Math.ceil((attack + tau * 9) * SR));
    if (pitchEnv) {
      for (let i = 0; i < n; i++) { const t = i / SR; b[i] += a * Math.sin(TAU * ph) * perc(t, attack, tau); ph += (fr * pitchEnv(t)) / SR; }
      continue;
    }
    // recursive sine + multiplicative decay (same sound as sin()*perc(), ~10x cheaper)
    const w = (TAU * fr) / SR, c2 = 2 * Math.cos(w), na = Math.max(1, Math.round(attack * SR)), dec = Math.exp(-1 / (tau * SR));
    let s1 = Math.sin(TAU * ph - w), s2 = Math.sin(TAU * ph - 2 * w), env = 1;
    for (let i = 0; i < n; i++) {
      const s0 = c2 * s1 - s2; s2 = s1; s1 = s0;
      let e;
      if (i < na) e = i / na; else { e = env; env *= dec; }
      b[i] += a * s0 * e;
    }
  }
  return b;
}
function peakOf(b) { let m = 0; for (let i = 0; i < b.length; i++) { const a = Math.abs(b[i]); if (a > m) m = a; } return m; }
function normPeak(b, pk = 1) { const m = peakOf(b); if (m > 0) for (let i = 0; i < b.length; i++) b[i] *= pk / m; return b; }
/** Band-passed noise burst (mono): centre f, q, attack a, decay tau. */
const nburst = (len, f, q, a, tau, gain = 1) => { const s = new SVF(); return gen(len, (t) => { s.run(white(), f, q); return s.bp * perc(t, a, tau) * gain; }); };

/** Warm detuned-saw pad / string section (stereo). cut: Hz or t => Hz. vib: vibrato depth (semitones). */
function pad(t0, dur, notes, o = {}) {
  const { gain = 0.1, attack = 0.6, release = 1.0, cut = 1800, q = 0.8, voices = 3, detune = 0.12,
    room = 0.3, hall = 0, delay = 0, pan = 0, sus = 0.9, vib = 0, vibRate = 5.2, decay = 0.4 } = o;
  const len = dur + release + 0.05, L = newBuf(len), R = newBuf(len);
  [[-1, L], [1, R]].forEach(([side, buf]) => {
    const os = [], fq = [], vp = [];
    for (const m of notes) for (let v = 0; v < voices; v++) {
      os.push(new Osc());
      fq.push(mtof(m + (v - (voices - 1) / 2) * detune + side * 0.03 + rand(-0.02, 0.02)));
      vp.push(rand(0, TAU));
    }
    const f1 = new SVF(), f2 = new SVF(), norm = 1 / Math.sqrt(os.length);
    for (let i = 0; i < buf.length; i++) {
      const t = i / SR;
      let x = 0;
      if (vib) { const vd = vib * 0.0578 * smooth((t - 0.25) / 0.5); for (let k = 0; k < os.length; k++) x += os[k].saw(fq[k] * (1 + vd * Math.sin(TAU * vibRate * t + vp[k]))); }
      else for (let k = 0; k < os.length; k++) x += os[k].saw(fq[k]);
      const fc = typeof cut === 'function' ? cut(t) : cut;
      buf[i] = f2.run(f1.run(x * norm, fc, q), fc * 1.2, 0.6) * adsr(t, attack, decay, sus, release, dur);
    }
  });
  outSt(L, R, t0, { gain, room, hall, delay, pan });
}

/** Saw + sub-sine synth bass with a short filter pluck. */
function bass(t0, midi, dur, o = {}) {
  const { gain = 0.3, cut = 500, env = 1400, sub = 0.7, q = 1.0, room = 0.02, drive = 1.4, pan = 0 } = o;
  const b = newBuf(dur + 0.08), o1 = new Osc(0), o2 = new Osc(0), f = new SVF(), fr = mtof(midi);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const x = o1.saw(fr) * 0.55 + o2.sin(fr) * sub;
    const y = f.run(x, cut + env * Math.exp(-t / 0.07), q) * adsr(t, 0.004, 0.18, 0.7, 0.06, dur);
    b[i] = Math.tanh(drive * y) / drive;
  }
  out(b, t0, { gain, room, pan });
}

/** Brass section: 3 detuned saws per note, "blat" filter envelope tracking pitch, delayed vibrato. */
function brass(t0, notes, dur, o = {}) {
  notes = [].concat(notes);
  const { gain = 0.12, attack = 0.025, release = 0.18, bright = 1, spread = 0.5, pan = 0, sus = 0.75,
    room = 0.25, hall = 0, delay = 0, vib = 1, bend = 0, bendTime = 0.1, fall = 0, fallTime = 0.3 } = o;
  const len = dur + release + 0.02, L = newBuf(len), R = newBuf(len);
  notes.forEach((m, ni) => {
    const p = notes.length > 1 ? lerp(-spread, spread, ni / (notes.length - 1)) + pan : pan;
    const a = ((clamp(p, -1, 1) + 1) * Math.PI) / 4, gl = Math.cos(a) * Math.SQRT2, gr = Math.sin(a) * Math.SQRT2;
    const os = [new Osc(), new Osc(), new Osc()], det = [-0.09, 0, 0.08].map((d) => Math.pow(2, (d + rand(-0.02, 0.02)) / 12));
    const f = new SVF(), base = mtof(m), vph = rand(0, TAU);
    for (let i = 0; i < L.length; i++) {
      const t = i / SR;
      const vb = vib * 0.0045 * smooth((t - 0.22) / 0.3) * Math.sin(TAU * 5.3 * t + vph);
      const bendF = Math.pow(2, (-bend * (1 - smooth(t / bendTime)) - fall * smooth((t - dur + fallTime) / fallTime)) / 12);
      const fq = base * bendF * (1 + vb) * (1 - 0.015 * Math.exp(-t / 0.025));
      const x = (os[0].saw(fq * det[0]) + os[1].saw(fq * det[1]) + os[2].saw(fq * det[2])) / 3;
      const e = adsr(t, attack, 0.3, sus, release, dur);
      const fc = fq * (1.2 + bright * (2.2 * e + 5.5 * Math.exp(-t / 0.08) * Math.min(1, t / attack)));
      const y = f.run(x, Math.min(fc, 9000), 0.75) * e;
      L[i] += y * gl; R[i] += y * gr;
    }
  });
  outSt(L, R, t0, { gain: gain / Math.sqrt(notes.length), room, hall, delay });
}

/** Filtered synth pluck. */
function pluck(t0, midi, o = {}) {
  const { gain = 0.1, pan = 0, decay = 0.16, cut = 1500, env = 3500, q = 1.4, wave = 'saw', room = 0.15, delay = 0, hall = 0 } = o;
  const b = newBuf(decay * 6 + 0.02), os = new Osc(), f = new SVF(), fr = mtof(midi);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const x = wave === 'saw' ? os.saw(fr) : wave === 'tri' ? os.tri(fr) : os.pulse(fr, 0.25);
    b[i] = f.run(x, cut + env * Math.exp(-t / (decay * 0.45)), q) * perc(t, 0.002, decay);
  }
  out(b, t0, { gain, pan, room, delay, hall });
}

/** Karplus-Strong plucked string buffer. decay = T60-ish seconds, bright 0..1. */
function ksBuf(midi, { decay = 1.2, bright = 0.6, drive = 1, len } = {}) {
  const f = mtof(midi), D = SR / f - 0.5, M = Math.ceil(D) + 4;
  const line = new Float32Array(M), b = newBuf(len ?? Math.min(decay * 1.3, 4) + 0.05);
  const g = Math.pow(10, -3 / (decay * f)), lpE = new OnePole(lerp(700, 9000, bright)), dc = new OnePole(20);
  // the delay D is constant: read(i - D) = line[i - di - 1] + (line[i - di] - line[i - di - 1]) * (1 - fd)
  const di = Math.floor(D), fd = D - di, w1 = 1 - fd, hg = g * 0.5, lin = drive === 1;
  for (let i = 0; i < b.length; i++) {
    const exc = i < D ? lpE.lp(white()) * (1 - i / D) : 0;
    const k0 = (((i - di) % M) + M) % M, k1 = (k0 + M - 1) % M, k2 = (k0 + M - 2) % M;
    const a0 = line[k0], a1 = line[k1], a2 = line[k2];
    const y = exc + hg * (a1 + (a0 - a1) * w1 + a2 + (a1 - a2) * w1);
    line[i % M] = y;
    b[i] = dc.hp(lin ? y : Math.tanh(drive * y) / drive);
  }
  return b;
}
/** Plucked string (pizzicato, twang, harp). */
function ks(t0, midi, o = {}) {
  const { gain = 0.2, pan = 0, decay = 1.2, bright = 0.6, room = 0.1, hall = 0, delay = 0, drive = 1, damp } = o;
  const b = ksBuf(midi, { decay, bright, drive });
  if (damp !== undefined) for (let i = 0; i < b.length; i++) b[i] *= adsr(i / SR, 0.0005, 0, 1, 0.06, damp);
  out(b, t0, { gain, pan, room, hall, delay });
}
/** Orchestral pizzicato: short KS + a little body knock so it reads on small speakers. */
function pizz(t0, midi, o = {}) {
  const { gain = 0.2, pan = 0, decay = 0.35, bright = 0.5, room = 0.18, hall = 0.1 } = o;
  const b = ksBuf(midi, { decay, bright, len: decay * 1.6 + 0.05 });
  const lp = new OnePole(900), f = mtof(midi);
  for (let i = 0; i < SR * 0.025; i++) b[i] += lp.lp(white()) * Math.exp(-i / (SR * 0.006)) * 0.35 + Math.sin(TAU * f * i / SR) * Math.exp(-i / (SR * 0.03)) * 0.2;
  out(b, t0, { gain, pan, room, hall });
}
/** Harp: soft, darker, longer KS. */
const harp = (t0, midi, o = {}) => ks(t0, midi, { decay: 1.8, bright: 0.38, room: 0.2, hall: 0.35, ...o, gain: o.gain ?? 0.14 });
/** Plucked upright bass, damped after `dur`: KS + sub sine for weight + finger thump (reads on phones). */
function upright(t0, midi, dur, o = {}) {
  const { gain = 0.35, pan = 0, room = 0.08, bright = 0.45, decay = 1.4 } = o;
  const f = mtof(midi), b = ksBuf(midi, { decay, bright, len: dur + 0.15 }), s = sweepSine(0), bp = new SVF();
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    bp.run(white(), 750, 1.2);
    b[i] = (b[i] * 1.1 + s(f) * 0.35 * perc(t, 0.003, 0.3) + bp.bp * perc(t, 0.001, 0.014) * 0.9) * adsr(t, 0.001, 0, 1, 0.08, dur);
  }
  out(b, t0, { gain, pan, room });
}

/** Music box tine. */
function musicBox(t0, midi, o = {}) {
  const { gain = 0.1, pan = 0, decay = 1.4, room = 0.3, hall = 0.25 } = o;
  out(partials(mtof(midi), [[1, 1, decay], [2, 0.1, decay * 0.4], [3, 0.22, decay * 0.22], [5.4, 0.07, 0.1], [8.9, 0.05, 0.04]], decay * 4), t0, { gain, pan, room, hall });
}
/** Glockenspiel / celesta bar. */
function glock(t0, midi, o = {}) {
  const { gain = 0.08, pan = 0, decay = 0.9, room = 0.25, hall = 0.4, delay = 0 } = o;
  out(partials(mtof(midi), [[1, 1, decay], [2.76, 0.35, decay * 0.3], [5.4, 0.15, decay * 0.12], [8.93, 0.06, 0.05]], decay * 4), t0, { gain, pan, room, hall, delay });
}
/** Celesta: softer, rounder glock. */
function celesta(t0, midi, o = {}) {
  const { gain = 0.09, pan = 0, decay = 1.1, room = 0.25, hall = 0.4 } = o;
  out(partials(mtof(midi), [[1, 1, decay], [2, 0.18, decay * 0.4], [3, 0.06, decay * 0.2], [4.1, 0.05, 0.05]], decay * 4, 0.003), t0, { gain, pan, room, hall });
}
/** Marimba: tuned bar (1 : 3.93 : 9.2) + soft mallet click. */
function marimba(t0, midi, o = {}) {
  const { gain = 0.16, pan = 0, decay = 0.45, room = 0.18, hall = 0, delay = 0 } = o;
  const b = partials(mtof(midi), [[1, 1, decay], [3.93, 0.28, 0.07], [9.2, 0.07, 0.02]], decay * 5);
  const lp = new OnePole(2500);
  for (let i = 0; i < SR * 0.006; i++) b[i] += lp.lp(white()) * 0.25 * (1 - i / (SR * 0.006));
  out(b, t0, { gain, pan, room, hall, delay });
}
/** Xylophone: harder, brighter, shorter bar (1 : 3 : 6). */
function xylo(t0, midi, o = {}) {
  const { gain = 0.12, pan = 0, decay = 0.22, room = 0.15, hall = 0.05 } = o;
  const b = partials(mtof(midi), [[1, 1, decay], [3.0, 0.4, decay * 0.35], [6.1, 0.12, 0.02]], decay * 5, 0.0008);
  const bp = new SVF();
  for (let i = 0; i < SR * 0.004; i++) { bp.run(white(), 3000, 1); b[i] += bp.bp * 0.4 * (1 - i / (SR * 0.004)); }
  out(b, t0, { gain, pan, room, hall });
}
/** Vibraphone: bar partials with the motor tremolo. */
function vibes(t0, midi, o = {}) {
  const { gain = 0.1, pan = 0, decay = 1.6, room = 0.2, hall = 0.3, rate = 5.5 } = o;
  const b = partials(mtof(midi), [[1, 1, decay], [4.0, 0.2, decay * 0.25], [10, 0.05, 0.03]], decay * 3, 0.002);
  const ph = rand(0, TAU);
  for (let i = 0; i < b.length; i++) b[i] *= 1 - 0.3 * (0.5 + 0.5 * Math.sin(TAU * rate * i / SR + ph));
  out(b, t0, { gain, pan, room, hall });
}

/** Tremolo string section. cresc(t) -> amplitude multiplier. */
function tremolo(t0, notes, dur, o = {}) {
  const { gain = 0.1, rate = 8, cut = 1300, attack = 0.6, release = 0.35, depth = 0.8, cresc = () => 1, room = 0.2, hall = 0.35, bend } = o;
  const len = dur + release + 0.02, L = newBuf(len), R = newBuf(len);
  [[-1, L], [1, R]].forEach(([side, buf]) => {
    const os = notes.flatMap(() => [new Osc(), new Osc()]);
    const fq = notes.flatMap((m) => [mtof(m - 0.06 + side * 0.02), mtof(m + 0.07 - side * 0.02)]);
    const f = new SVF(), ph = side * 0.13;
    for (let i = 0; i < buf.length; i++) {
      const t = i / SR, bf = bend ? Math.pow(2, bend(t) / 12) : 1;
      let x = 0;
      for (let k = 0; k < os.length; k++) x += os[k].saw(fq[k] * bf);
      const tr = 1 - depth * Math.pow(Math.abs(Math.sin(Math.PI * (rate * t + ph))), 3);
      buf[i] = f.run(x / os.length, cut, 0.9) * tr * cresc(t) * adsr(t, attack, 0.1, 1, release, dur);
    }
  });
  outSt(L, R, t0, { gain, room, hall });
}

// Formant tables: [centre Hz, gain, bandwidth Hz]
const VOWELS = {
  ah: [[800, 1, 90], [1150, 0.55, 110], [2900, 0.22, 160], [3900, 0.1, 200]],
  oh: [[450, 1, 80], [800, 0.45, 90], [2830, 0.12, 150], [3800, 0.06, 200]],
  oo: [[330, 1, 70], [700, 0.3, 90], [2600, 0.05, 150]],
};
/** Synth choir pad (detuned saw voices through vowel formants): an instrument, not a voice. */
function choir(t0, notes, dur, o = {}) {
  const { gain = 0.12, attack = 0.35, release = 0.9, voices = 4, vowel = 'ah', width = 0.85, room = 0.3, hall = 0.45, env, bend = 0, bendTime = 0.2 } = o;
  const len = dur + release + 0.05, sL = newBuf(len), sR = newBuf(len);
  for (const m of notes) for (let v = 0; v < voices; v++) {
    const os = new Osc(), det = rand(-0.12, 0.12), vr = rand(4.6, 6.0), vd = rand(0.003, 0.006), vp = rand(0, TAU);
    const dr = rand(0.2, 0.5), dp = rand(0, TAU), att = attack * rand(0.8, 1.3);
    const a = ((rand(-width, width) + 1) * Math.PI) / 4, gl = Math.cos(a), gr = Math.sin(a), f0 = mtof(m + det);
    for (let i = 0; i < sL.length; i++) {
      const t = i / SR;
      const fq = (bend ? mtof(m + det - bend * (1 - smooth(t / bendTime))) : f0) * (1 + vd * Math.sin(TAU * vr * t + vp) + 0.002 * Math.sin(TAU * dr * t + dp));
      const e = env ? env(t) : adsr(t, att, 0.3, 0.9, release, dur);
      const x = (os.saw(fq) + 0.08 * white()) * e;
      sL[i] += x * gl; sR[i] += x * gr;
    }
  }
  const fmtz = VOWELS[vowel];
  for (const s of [sL, sR]) {
    const fs = fmtz.map(() => new SVF()), body = new OnePole(500), air = new SVF();
    for (let i = 0; i < s.length; i++) {
      const x = s[i];
      let y = 0.12 * body.lp(x);
      for (let k = 0; k < fs.length; k++) { fs[k].run(x, fmtz[k][0], fmtz[k][0] / fmtz[k][2]); y += fs[k].bp * fmtz[k][1]; }
      s[i] = air.run(y, 4800, 0.6);
    }
  }
  outSt(sL, sR, t0, { gain: gain / Math.sqrt(notes.length * voices), room, hall });
}

/** Drawbar organ (additive) with a slow rotary tremolo; soft key click. */
function organ(t0, notes, dur, o = {}) {
  const { gain = 0.08, draw = [0.5, 1, 0.45, 0.5, 0.2, 0.25], attack = 0.04, release = 0.25, room = 0.25, hall = 0.45, rot = 0.9 } = o;
  const RAT = [0.5, 1, 1.5, 2, 3, 4], len = dur + release + 0.05, L = newBuf(len), R = newBuf(len);
  const ph = notes.flatMap(() => RAT.map(() => rand(0, 1))), inc = notes.flatMap((m) => RAT.map((r) => (mtof(m) * r) / SR));
  for (let i = 0; i < L.length; i++) {
    const t = i / SR, wob = 1 + 0.0007 * Math.sin(TAU * rot * t);
    let x = 0;
    for (let k = 0; k < ph.length; k++) { const dw = draw[k % 6]; if (dw) x += dw * Math.sin(TAU * ph[k]); ph[k] += inc[k] * wob; if (ph[k] > 1) ph[k] -= 1; }
    const e = (adsr(t, attack, 0.1, 1, release, dur) * x) / (notes.length * 1.6), tr = 0.18 * (0.5 + 0.5 * Math.sin(TAU * rot * t));
    L[i] = e * (1 - tr); R[i] = e * (0.82 + tr); // the rotary tremolo swings between the sides
  }
  outSt(L, R, t0, { gain, room, hall });
}

/** Electric piano (tine + FM bark) with a stereo tremolo. */
function epiano(t0, midi, dur, o = {}) {
  const { gain = 0.1, pan = 0, decay = 1.6, room = 0.2, hall = 0.15, trem = 4.5, bark = 1.6 } = o;
  const f = mtof(midi), len = dur + 0.5, L = newBuf(len), R = newBuf(len);
  let pc = rand(0, 1), pm = rand(0, 1), pt = rand(0, 1);
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    const idx = bark * (0.25 + Math.exp(-t / 0.15));
    const y = (Math.sin(TAU * pc + idx * Math.sin(TAU * pm)) * perc(t, 0.002, decay) + 0.12 * Math.sin(TAU * pt) * perc(t, 0.001, 0.04)) * adsr(t, 0.002, 0, 1, 0.18, dur);
    pc += f / SR; pm += f / SR; pt += f * 7.1 / SR;
    const p = 0.35 * Math.sin(TAU * trem * t);
    L[i] = y * (1 - p); R[i] = y * (1 + p);
  }
  outSt(L, R, t0, { gain, pan, room, hall });
}

/** Accordion: three musette-tuned reeds per note, bellows swell. */
function accordion(t0, notes, dur, o = {}) {
  const { gain = 0.06, attack = 0.03, release = 0.08, pan = 0, room = 0.15, hall = 0.05, bright = 3200 } = o;
  notes = [].concat(notes);
  const len = dur + release + 0.02, b = newBuf(len), f = new SVF(), pk = new Biquad('peak', 1100, 1.2, 4);
  const os = notes.flatMap(() => [new Osc(), new Osc(), new Osc()]), fq = notes.flatMap((m) => [0, 0.13, -0.11].map((d) => mtof(m + d)));
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let x = 0;
    for (let k = 0; k < os.length; k++) x += os[k].pulse(fq[k], 0.38);
    b[i] = pk.run(f.run(x / os.length, bright, 0.7)) * adsr(t, attack, 0.15, 0.85, release, dur) * (1 + 0.05 * Math.sin(TAU * 3 * t));
  }
  out(b, t0, { gain, pan, room, hall });
}

/** Piano: inharmonic partials, two detuned strings per note, hammer thump. */
function piano(t0, midi, o = {}) {
  const { gain = 0.12, pan = 0, decay = 2.2, room = 0.25, hall = 0.4, bright = 1 } = o;
  const f = mtof(midi), B = 0.00035, parts = [];
  for (let n = 1; n <= 10; n++) {
    const fn = n * Math.sqrt(1 + B * n * n);
    const a = Math.pow(n, -1.1) * (n === 1 ? 1 : bright * Math.exp(-(n * f) / 5000));
    parts.push([fn, a, decay / (1 + 0.45 * (n - 1))], [fn * 1.0007, a * 0.8, decay / (1 + 0.45 * (n - 1)) * 0.9]);
  }
  const b = partials(f, parts, decay * 3, 0.002), lp = new OnePole(1200);
  for (let i = 0; i < SR * 0.03; i++) b[i] += lp.lp(white()) * Math.exp(-i / (SR * 0.006)) * 0.4;
  out(b, t0, { gain, pan, room, hall });
}

/** Heartbeat: lub-dub thumps (low body + a mid knock so phones hear it). */
function heart(t0, o = {}) {
  const { gain = 0.5, pitch = 1, dub = 0.17, room = 0.05 } = o;
  const one = () => { const s = sweepSine(0), s2 = sweepSine(0), bp = new SVF(); return gen(0.4, (t) => { bp.run(white(), 520, 0.9); return Math.tanh(1.8 * (s((60 + 55 * Math.exp(-t / 0.02)) * pitch) * perc(t, 0.005, 0.07) * 0.6 + s2(230 * pitch) * perc(t, 0.002, 0.03) * 0.5 + bp.bp * perc(t, 0.002, 0.022) * 1.8)); }); };
  out(one(), t0, { gain, room });
  out(one(), t0 + dub, { gain: gain * 0.7, room });
}

// ── drums ──
function kick(t0, o = {}) {
  const { gain = 0.55, tune = 48, punch = 1, decay = 0.26, room = 0.02, click = 1, attack = 0.0015 } = o;
  const b = newBuf(decay * 3 + 0.05), hp = new OnePole(3000);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    ph += (tune + 120 * punch * Math.exp(-t / 0.032)) / SR;
    const body = Math.sin(TAU * ph) * perc(t, attack, decay);
    const cl = click ? hp.hp(white()) * Math.exp(-t / 0.004) * 0.35 * punch * click : 0;
    b[i] = Math.tanh(1.7 * (body + cl)) / Math.tanh(1.7);
  }
  out(b, t0, { gain, room });
}
function snare(t0, o = {}) {
  const { gain = 0.28, tone = 190, decay = 0.13, pan = 0.05, room = 0.2, hall = 0 } = o;
  const b = newBuf(decay * 5 + 0.05), hp = new Biquad('hp', 1400, 0.7), lp = new OnePole(8000);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    p1 += tone * (1 + 0.4 * Math.exp(-t / 0.01)) / SR; p2 += tone * 1.62 / SR;
    const body = (Math.sin(TAU * p1) + 0.45 * Math.sin(TAU * p2)) * perc(t, 0.001, 0.045);
    const nz = lp.lp(hp.run(white())) * perc(t, 0.001, decay);
    b[i] = body * 0.55 + nz * 1.1;
  }
  out(b, t0, { gain, pan, room, hall });
}
function clap(t0, o = {}) {
  const { gain = 0.22, pan = -0.05, room = 0.25, hall = 0, f = 1150 } = o;
  const b = newBuf(0.45), bp = new Biquad('bp', f, 1.1), hp = new OnePole(500);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let e = Math.exp(-t / 0.12) * 0.55;
    for (const d of [0, 0.011, 0.023, 0.034]) if (t >= d) e = Math.max(e, Math.exp(-(t - d) / 0.006));
    b[i] = bp.run(hp.hp(white())) * e * 2.2;
  }
  out(b, t0, { gain, pan, room, hall });
}
const HAT_FREQS = [205.3, 304.4, 369.6, 522.7, 540, 800];
function hat(t0, o = {}) {
  const { gain = 0.07, open = false, pan = 0.22, room = 0.08, tau } = o;
  const tt = tau ?? (open ? 0.2 : 0.028), b = newBuf(tt * 6 + 0.02), hp1 = new Biquad('hp', 7000, 0.8), hp2 = new Biquad('hp', 7000, 0.8), lp = new Biquad('lp', 12000, 0.7);
  const os = HAT_FREQS.map(() => new Osc());
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let m = 0;
    for (let k = 0; k < 6; k++) m += os[k].pulse(HAT_FREQS[k] * 2.4);
    b[i] = lp.run(hp2.run(hp1.run(m * 0.12 + white() * 0.7))) * perc(t, 0.0008, tt);
  }
  out(b, t0, { gain, pan, room });
}
function tom(t0, midi, o = {}) {
  const { gain = 0.35, pan = 0, decay = 0.3, room = 0.25, hall = 0.1, skin = 0.6 } = o;
  const b = newBuf(decay * 4), f = mtof(midi), lp = new OnePole(900);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    ph += f * (1 + 0.6 * Math.exp(-t / 0.05)) / SR;
    b[i] = Math.tanh(1.3 * (Math.sin(TAU * ph) * perc(t, 0.001, decay) + lp.lp(white()) * perc(t, 0.001, 0.03) * skin));
  }
  out(b, t0, { gain, pan, room, hall });
}
/** Timpani: membrane modes (1, 1.5, 1.74, 2.0, 2.24) + soft mallet thump. */
function timpani(t0, midi, o = {}) {
  const { gain = 0.35, pan = 0, decay = 1.3, room = 0.25, hall = 0.25 } = o;
  const b = partials(mtof(midi), [[1, 1, decay], [1.504, 0.55, decay * 0.6], [1.742, 0.3, decay * 0.4], [2.0, 0.22, decay * 0.35], [2.245, 0.12, decay * 0.25]],
    decay * 3.5, 0.003, (t) => 1 + 0.03 * Math.exp(-t / 0.05));
  const lp = new OnePole(300);
  for (let i = 0; i < SR * 0.08; i++) b[i] += lp.lp(white()) * Math.exp(-i / (SR * 0.02)) * 1.2;
  out(b, t0, { gain, pan, room, hall });
}
/** Snare roll from 16ths accelerating to 32nds with a crescendo. */
function snareRoll(t0, dur, o = {}) {
  const { g0 = 0.06, g1 = 0.3, room = 0.25 } = o;
  let t = 0;
  while (t < dur - 0.01) {
    const u = t / dur;
    snare(t0 + t, { gain: lerp(g0, g1, u * u), decay: 0.09, room, pan: (rnd() - 0.5) * 0.2 });
    t += lerp(BEAT / 4, BEAT / 8, smooth(u * 1.4));
  }
}
/** Cymbal crash: decorrelated stereo noise + metallic cluster, splash then wash. */
function cymbal(t0, o = {}) {
  const { gain = 0.2, decay = 1.8, pan = 0, room = 0.2, hall = 0.1, tone = 1 } = o;
  const len = decay * 3.2, L = newBuf(len), R = newBuf(len);
  [L, R].forEach((buf, side) => {
    const os = HAT_FREQS.map(() => new Osc()), hp = new Biquad('hp', 3200 * tone, 0.6), pk = new Biquad('peak', 6500, 1, 3);
    const lp = new OnePole(lerp(8000, 11000, side));
    for (let i = 0; i < buf.length; i++) {
      const t = i / SR;
      let m = 0;
      for (let k = 0; k < 6; k++) m += os[k].pulse(HAT_FREQS[k] * (1.7 + side * 0.03) * tone);
      const e = perc(t, 0.0015, decay) * 0.75 + perc(t, 0.001, 0.06) * 0.6;
      buf[i] = lp.lp(pk.run(hp.run(white() + m * 0.1))) * e;
    }
  });
  outSt(L, R, t0, { gain, pan, room, hall });
}
/** Noise riser: band-passed stereo noise sweeping up with a crescendo. */
function riser(t0, dur, o = {}) {
  const { gain = 0.12, f0 = 300, f1 = 6000, q = 2, room = 0.2, hall = 0, curve: cv = 2 } = o;
  const L = newBuf(dur + 0.03), R = newBuf(dur + 0.03);
  [L, R].forEach((buf) => {
    const f = new SVF();
    for (let i = 0; i < buf.length; i++) {
      const u = clamp(i / SR / dur, 0, 1);
      f.run(white(), f0 * Math.pow(f1 / f0, u), q);
      buf[i] = f.bp * Math.pow(u, cv) * Math.min(1, (dur + 0.03 - i / SR) / 0.03);
    }
  });
  outSt(L, R, t0, { gain, room, hall });
}
function woodblock(t0, o = {}) {
  const { gain = 0.12, pan = 0, f = 1050, room = 0.12 } = o;
  out(partials(f, [[1, 1, 0.045], [2.45, 0.35, 0.018], [3.9, 0.15, 0.008]], 0.3, 0.0005), t0, { gain, pan, room });
}
function shaker(t0, o = {}) {
  const { gain = 0.05, pan = 0.3, room = 0.08, len = 0.07 } = o;
  const hp = new Biquad('hp', 4500, 0.7), lp = new Biquad('lp', 10000, 0.7);
  out(gen(len + 0.02, (t) => lp.run(hp.run(white())) * adsr(t, len * 0.35, 0.01, 1, len * 0.6, len * 0.35)), t0, { gain, pan, room });
}
/** Brushed snare swish (jazz). */
function brush(t0, o = {}) {
  const { gain = 0.06, pan = -0.15, dur = 0.18, room = 0.15 } = o;
  const bp = new SVF();
  out(gen(dur + 0.05, (t) => { bp.run(white(), 2600 + 1500 * t / dur, 0.7); return bp.bp * adsr(t, dur * 0.3, 0.02, 0.8, dur * 0.6, dur * 0.4); }), t0, { gain, pan, room });
}
function snap(t0, o = {}) {
  const { gain = 0.14, pan = 0.25, room = 0.2 } = o;
  const bp = new SVF();
  out(gen(0.08, (t) => { bp.run(white(), 2300, 2.2); return bp.bp * perc(t, 0.0005, 0.008) * 2 + Math.sin(TAU * 1700 * t) * perc(t, 0.0005, 0.004) * 0.4; }), t0, { gain, pan, room });
}
function rim(t0, o = {}) {
  const { gain = 0.2, pan = 0.1, room = 0.2 } = o;
  const b = partials(1750, [[1, 1, 0.02], [1.6, 0.6, 0.012], [2.9, 0.35, 0.006]], 0.15, 0.0003);
  const bp = new SVF();
  for (let i = 0; i < SR * 0.02; i++) { bp.run(white(), 3200, 1.5); b[i] += bp.bp * Math.exp(-i / (SR * 0.003)) * 1.4; }
  out(b, t0, { gain, pan, room });
}

/**
 * Monophonic phrase voice (legato lead). notes: [[t (s, from t0), dur (s), midi, amp = 1, glide (s)], ...] in time order.
 * A note that starts within `legato` s of the previous one's end glides from it (portamento) instead of re-attacking.
 * timbre: whistle | clarinet | bassoon | violin | flute | mutetp (harmon trumpet) | trombone | tuba
 */
const TIMBRES = {
  whistle: { def: { attack: 0.035, release: 0.09, vib: 22, vibRate: 5.6, vibDelay: 0.16, glide: 0.045, breath: 0.1 },
    make: (o) => { const os = new Osc(0), bp = new SVF(), hp = new OnePole(900); return (f, a) => { const p = os.p; os.step(f); bp.run(white(), f, 9); return (Math.sin(TAU * p) + 0.035 * Math.sin(2 * TAU * p)) * a + bp.bp * o.breath * 3 * a + hp.hp(white()) * 0.012 * a; }; } },
  flute: { def: { attack: 0.05, release: 0.1, vib: 18, vibRate: 5, vibDelay: 0.2, glide: 0.04, breath: 0.12 },
    make: (o) => { const os = new Osc(0), bp = new SVF(); return (f, a) => { const p = os.p; os.step(f); bp.run(white(), f * 2, 4); return (Math.sin(TAU * p) + 0.12 * Math.sin(2 * TAU * p) + 0.04 * Math.sin(3 * TAU * p)) * a + bp.bp * o.breath * 2 * a; }; } },
  clarinet: { def: { attack: 0.03, release: 0.08, vib: 8, vibRate: 5, vibDelay: 0.25, glide: 0.035, bright: 1 },
    make: (o) => { const os = new Osc(), f1 = new SVF(), hp = new OnePole(1200); return (f, a) => f1.run(os.pulse(f, 0.5), Math.min(f * (1.5 + 4.5 * a * o.bright), 7000), 0.7) * a + hp.hp(white()) * 0.015 * a; } },
  bassoon: { def: { attack: 0.025, release: 0.07, vib: 6, vibRate: 5, vibDelay: 0.3, glide: 0.04 },
    make: () => { const os = new Osc(), bp = new SVF(), lp = new SVF(); return (f, a) => { const x = os.pulse(f, 0.17); bp.run(x, 520, 1.3); lp.run(x, 1700, 0.7); return (bp.bp * 0.9 + lp.lp * 0.45) * a; }; } },
  violin: { def: { attack: 0.07, release: 0.18, vib: 18, vibRate: 5.8, vibDelay: 0.12, glide: 0.06 },
    make: () => { const os = new Osc(), os2 = new Osc(), lp = new SVF(), b1 = new Biquad('peak', 290, 1.2, 5), b2 = new Biquad('peak', 2800, 1.3, 4), b3 = new Biquad('peak', 1100, 2, -3); return (f, a) => b3.run(b2.run(b1.run(lp.run(os.saw(f) * 0.7 + os2.saw(f * 1.004) * 0.3, Math.min(f * 7, 5200), 0.6)))) * a; } },
  mutetp: { def: { attack: 0.02, release: 0.07, vib: 10, vibRate: 6, vibDelay: 0.15, glide: 0.04, wah: null },
    make: (o) => { const os = new Osc(), bp = new SVF(), pk = new Biquad('peak', 2500, 2, 6), hp = new Biquad('hp', 400, 0.7); return (f, a, t) => { const c = o.wah ? o.wah(t) : 1500; bp.run(os.saw(f), c, 2.4); return pk.run(hp.run(bp.bp)) * a * 1.4; }; } },
  trombone: { def: { attack: 0.04, release: 0.12, vib: 14, vibRate: 5.2, vibDelay: 0.2, glide: 0.12, bright: 1 },
    make: (o) => { const os = new Osc(), os2 = new Osc(), lp = new SVF(); return (f, a) => lp.run(os.saw(f) * 0.6 + os2.saw(f * 1.003) * 0.4, Math.min(f * (1.3 + 4 * a * a * o.bright), 6000), 0.9) * a; } },
  tuba: { def: { attack: 0.03, release: 0.1, vib: 10, vibRate: 5, vibDelay: 0.2, glide: 0.08 },
    make: () => { const os = new Osc(), lp = new SVF(), s = sweepSine(); return (f, a) => Math.tanh(1.6 * (lp.run(os.saw(f), Math.min(f * (1.5 + 3 * a), 2400), 1.1) + 0.5 * s(f))) * a; } },
};
function mono(t0, notes, o = {}) {
  const T = TIMBRES[o.timbre ?? 'whistle'], opt = { ...T.def, ...o };
  const { attack, release, vib, vibRate, vibDelay, glide: gDef, legato = 0.03, gain = 0.12, pan = 0, room = 0.15, hall = 0.25, delay = 0 } = opt;
  if (!notes.length) return;
  const lastEnd = Math.max(...notes.map((n) => n[0] + n[1]));
  const b = newBuf(lastEnd + release + 0.05), voice = T.make(opt);
  const leg = notes.map((n, i) => i > 0 && n[0] - (notes[i - 1][0] + notes[i - 1][1]) < legato);
  const vph = rand(0, TAU);
  let k = -1, fromM = notes[0][2], curM = notes[0][2], aEnv = 0, aFrom = 0, lastM = NaN, lastF = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    while (k + 1 < notes.length && t >= notes[k + 1][0]) { k++; fromM = curM; aFrom = aEnv; }
    if (k < 0) continue;
    const [nt, nd, nm, na = 1, ng] = notes[k], u = t - nt;
    const g = ng ?? (leg[k] ? gDef : 0);
    const m = g > 0 ? lerp(fromM, nm, smooth(u / g)) : nm;
    curM = m;
    const nextLeg = k + 1 < notes.length && leg[k + 1];
    if (u < nd) { // re-articulate with a short smooth dip (never an instant step: that would click)
      const lo = leg[k] ? Math.min(aFrom, na) * 0.8 : aFrom * 0.3, dip = leg[k] ? 0.01 : 0.006;
      aEnv = u < dip ? lerp(aFrom, lo, smooth(u / dip)) : leg[k] ? lerp(lo, na, smooth((u - dip) / 0.03)) : lerp(lo, na, Math.min(1, (u - dip) / attack));
    }
    else if (!nextLeg) { const r = (u - nd) / release; aEnv = r >= 1 ? 0 : na * (1 - r) * (1 - r); }
    if (m !== lastM) { lastM = m; lastF = mtof(m); }
    const vd = (vib / 1200) * smooth((u - vibDelay) / 0.25) * Math.sin(TAU * vibRate * t + vph);
    b[i] = voice(lastF * (1 + 0.6931 * vd), aEnv, t);
  }
  out(b, t0, { gain, pan, room, hall, delay });
}
/** Convert [beat, beats, midi] phrase rows at origin into mono() rows (times relative to `t0`). */
const rows = (notes, origin, t0, legatoGap = 0.92) => notes.map(([b, l, m, a]) => [origin + b * BEAT - t0, l * BEAT * legatoGap, m, a ?? 1]);

// ════════════════════════════ 5. theory + the signature tune ════════════════════════════
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
/** "G", "Dm", "F#m" -> { pc, minor } */
function parseKey(k) {
  const m = /^([A-G][#b]?)(m?)$/.exec(String(k).trim());
  if (!m) throw new Error(`bad key "${k}" (use e.g. "G", "Dm", "F#m")`);
  return { pc: PC[m[1]], minor: m[2] === 'm' };
}
/** Tonic MIDI note of key k in octave oct (C4 = 60). */
const tonic = (k, oct = 3) => 12 * (oct + 1) + parseKey(k).pc;
/** Chords as semitones above the tonic. Upper case = major, lower = minor; "/m" = borrowed into minor keys. */
const DEG = {
  I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16],
  V7: [7, 11, 14, 17], ii7: [2, 5, 9, 12], Imaj7: [0, 4, 7, 11], IVmaj7: [5, 9, 12, 16], vi7: [9, 12, 16, 19], I6: [0, 4, 7, 9],
  Iadd9: [0, 4, 7, 14], bVII: [10, 14, 17], I7: [0, 4, 7, 10], sus4: [0, 5, 7], V7sus: [7, 12, 14, 17],
  i: [0, 3, 7], iv: [5, 8, 12], v: [7, 10, 14], VI: [8, 12, 15], VII: [10, 14, 17], III: [3, 7, 10],
  i7: [0, 3, 7, 10], i9: [0, 3, 7, 10, 14], iv7: [5, 8, 12, 15], 'V/m': [7, 11, 14], 'V7/m': [7, 11, 14, 17],
};
const chordAt = (prog, beat) => { let c = prog[0][1]; for (const [b, d] of prog) if (beat >= b - 1e-6) c = d; return c; };
/** Bass note for a chord root `iv` (semitones above the tonic) placed within B-5..B+6. */
const bassFor = (B, iv) => { let m = B + (((iv % 12) + 12) % 12); if (m > B + 6) m -= 12; return m; };

// The Naked's whistle, the series signature (original). Written in G major as semitones above the tonic (G4):
// [beat, beats, semitones]; beat 0 = the bar-1 downbeat, -0.5 = its pickup. The hook is the dotted
// "da-di-DAA" (G. A B) that climbs to the fifth and skips back; bars 1-2 end open on the dominant,
// bars 3-4 answer, reach the high E and come home.
const SIG = [
  [-0.5, 0.5, 7],
  [0, 0.75, 12], [0.75, 0.25, 14], [1, 1, 16], [2, 0.5, 19], [2.5, 0.5, 16], [3, 1, 12],
  [4, 0.75, 14], [4.75, 0.25, 16], [5, 0.5, 14], [5.5, 0.5, 11], [6, 1.5, 7], [7.5, 0.5, 7],
  [8, 0.75, 12], [8.75, 0.25, 14], [9, 1, 16], [10, 0.5, 21], [10.5, 0.5, 19], [11, 1, 16],
  [12, 0.5, 17], [12.5, 0.5, 14], [13, 0.5, 11], [13.5, 0.5, 14], [14, 2, 12],
];
const SIG_CH = [[-99, 'I'], [4, 'V'], [6, 'V7'], [8, 'I'], [10, 'vi'], [12, 'ii'], [13, 'V7'], [14, 'I']];
const SIG_CH_MINOR = [[-99, 'i'], [4, 'v'], [6, 'V7/m'], [8, 'i'], [10, 'VI'], [12, 'iv'], [13, 'V7/m'], [14, 'i']];
const MINOR_OF = { 4: 3, 9: 8, 11: 10 };
/** Signature notes of bars (0..3); a bar owns its pickup. minor: natural-minor version (for the western). */
function sig(bars = [0, 1, 2, 3], minor = false) {
  return SIG.filter(([b]) => bars.includes(Math.floor((b + 0.5) / 4))).map(([b, l, m]) => {
    const pc = ((m % 12) + 12) % 12;
    return [b, l, minor && MINOR_OF[pc] !== undefined ? m - (pc - MINOR_OF[pc]) : m];
  });
}

// ── section helpers ──
const inS = (s, t) => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6;
const thinAt = (s, t) => (s.thin ?? []).some(([a, b]) => t >= a - 1e-6 && t < b - 1e-6);
/** Melodic / upper layers: inside the section and not in one of its `thin` windows. */
const okTop = (s, t) => inS(s, t) && !thinAt(s, t);
/** Times on a grid of `step` s (aligned to `off`) inside [from, to). */
function grid(s, step, off = 0, from = s.t0, to = s.t1) {
  const r = [];
  for (let t = Math.ceil((from - off) / step - 1e-6) * step + off; t < to - 1e-6; t += step) r.push(Math.round(t * 1e6) / 1e6);
  return r;
}
const beatIdx = (t, org) => Math.round((t - org) / BEAT);
const posInBar = (t, org) => ((beatIdx(t, org) % 4) + 4) % 4;
/** Play phrase rows [beat, beats, semis, amp?] at origin from tonic T as one legato mono() voice. */
function phrase(s, notes, origin, T, o = {}, keep = okTop) {
  const sel = notes.filter(([b]) => keep(s, origin + b * BEAT));
  if (!sel.length) return;
  const t00 = origin + sel[0][0] * BEAT, gate = o.gate ?? 0.92;
  mono(t00, sel.map(([b, l, m, a, g]) => [origin + b * BEAT - t00, l * BEAT * gate, T + m, a ?? 1, g]), o);
}
/** A pad per chord span of `prog` (beats from origin) inside the section. */
function padProg(s, org, T, prog, o = {}) {
  const spans = [];
  for (const t of grid(s, BEAT, org)) {
    const d = chordAt(prog, (t - org) / BEAT);
    if (!spans.length || spans[spans.length - 1][2] !== d) spans.push([t, t + BEAT, d]); else spans[spans.length - 1][1] = t + BEAT;
  }
  if (spans.length) spans[0][0] = Math.min(spans[0][0], s.t0);
  spans.forEach(([a, b, d], j) => pad(a, Math.min(b, s.t1) - a, DEG[d].map((x) => T + x), { gain: 0.06, attack: j ? 0.12 : 0.4, release: 0.5, cut: 2000, room: 0.3, hall: 0.3, ...o }));
}
/** Oom-pah accompaniment: upright bass on 1 and 3 (root, fifth), chord pluck on 2 and 4. */
function oompah(s, org, T, prog, o = {}) {
  const B = T - 24;
  for (const t of grid(s, BEAT, org)) {
    const p = posInBar(t, org), ch = DEG[chordAt(prog, (t - org) / BEAT)];
    if (o.bass && (p === 0 || p === 2)) upright(t, bassFor(B, ch[0] + (p === 2 ? 7 : 0)), BEAT * 0.85, { gain: o.bass });
    if (o.pluck && (p === 1 || p === 3)) ch.slice(0, 3).forEach((iv, j) => ks(t + j * 0.011, T - 12 + iv, { gain: o.pluck, decay: 0.55, bright: 0.58, pan: 0.32 - j * 0.12, room: 0.15, hall: 0.1 }));
  }
}

// ════════════════════════════ 6. music styles ════════════════════════════
// Each style renders a section { t0, t1, key, ... } into the section's private target. Notes start inside [t0, t1);
// tails ring past t1 unless the section has cut or fadeOut.
const STYLES = {};
const style = (name, doc, fn) => { fn.doc = doc; STYLES[name] = fn; };

style('drone', 'low tense drone + heartbeat bass. key = pedal (D); hb = beats per heartbeat (1; 0 off)', (s) => {
  const R = tonic(s.key ?? 'D', 2), D = s.t1 - s.t0, hb = s.hb ?? 1;
  pad(s.t0, D, [R, R + 7, R + 12], { gain: 0.09, attack: 0.9, release: 0.6, cut: 380, voices: 3, detune: 0.1, room: 0.15, hall: 0.2 });
  tremolo(s.t0, [R + 12, R + 13, R + 19], D, { gain: 0.1, rate: 6, cut: 1700, attack: 1.0, release: 0.5, depth: 0.55, room: 0.2, hall: 0.3 });
  tremolo(s.t0, [R + 31, R + 32], D, { gain: 0.03, rate: 9, cut: 3200, attack: 1.6, release: 0.5, depth: 0.4, hall: 0.4 });
  if (hb) for (const t of grid(s, hb * BEAT)) heart(t, { gain: 0.42, pitch: mtof(R) / 60 });
});

style('suspend', 'suspended sus4 chord on key (D), tremolo strings swelling; heartbeat every 2 beats until hbUntil', (s) => {
  const R = tonic(s.key ?? 'D', 2), D = s.t1 - s.t0;
  tremolo(s.t0, [R + 12, R + 17, R + 19, R + 24], D, { gain: 0.1, rate: 7, cut: 2000, attack: 0.3, release: 0.6, depth: 0.55, cresc: (t) => 0.55 + 0.6 * smooth(t / (D * 0.75)), room: 0.2, hall: 0.35 });
  pad(s.t0, D, [R, R + 7], { gain: 0.08, attack: 0.25, release: 0.7, cut: 420, room: 0.15 });
  const until = s.hbUntil ?? s.t1;
  for (const t of grid(s, BAR / 2)) if (t < until - 1e-6) heart(t, { gain: 0.38, pitch: mtof(R) / 60 });
});

style('theme', 'warm main theme: the whistle over plucked strings. key (G), origin (bar-1 downbeat), bars ([0,1]), lead (whistle|flute|clarinet)', (s) => {
  const K = s.key ?? 'G', T = tonic(K, 4), B = T - 24, org = s.origin ?? s.t0;
  if (s.t0 < org - 0.6) { // the resolution: a warm swell and a harp roll before the tune starts
    pad(s.t0, org - s.t0 + 0.3, [B + 12, B + 19, B + 24, B + 28], { gain: 0.08, attack: 0.25, release: 1.0, cut: 2200, vib: 0.08, room: 0.3, hall: 0.35 });
    [0, 7, 12, 16, 19, 24].forEach((iv, j) => harp(s.t0 + j * 0.05, B + 12 + iv, { gain: 0.13, pan: -0.45 + j * 0.18 }));
    upright(s.t0, B, 1.2, { gain: 0.3 });
  }
  phrase(s, sig(s.bars ?? [0, 1]), org, T, { timbre: s.lead ?? 'whistle', gain: 0.2, pan: 0.05, room: 0.12, hall: 0.3, gate: 0.97 });
  oompah({ ...s, t0: Math.max(s.t0 + 0.5, org - 2 * BEAT) }, org, T, SIG_CH, { bass: 0.3, pluck: 0.07 });
  padProg({ ...s, t0: Math.max(s.t0, org - 0.2) }, org, T - 12, SIG_CH, { gain: 0.04, cut: 1700, vib: 0.06 });
});

style('lullaby', 'music-box lullaby over a rocking harp. key (G), origin, bars (signature bars; [] = chords only), prog [[beat, degree]]', (s) => {
  const K = s.key ?? 'G', T = tonic(K, 4), org = s.origin ?? s.t0, D = s.t1 - s.t0, prog = s.prog ?? SIG_CH;
  for (const [b, , m] of sig(s.bars ?? [2])) { const t = org + b * BEAT; if (okTop(s, t)) musicBox(t, T + m, { gain: 0.12, pan: 0.1, decay: 1.2, room: 0.3, hall: 0.35 }); }
  grid(s, BEAT / 2, org).forEach((t) => {
    const j = Math.round((t - org) / (BEAT / 2)), ch = DEG[chordAt(prog, (t - org) / BEAT)];
    harp(t, T - 12 + [ch[0], ch[2], ch[1] + 12, ch[2]][((j % 4) + 4) % 4], { gain: 0.06, pan: -0.2, decay: 1.4 });
  });
  const ch0 = DEG[chordAt(prog, (s.t0 - org) / BEAT)];
  pad(s.t0, D, ch0.map((x) => T - 12 + x), { gain: 0.04, attack: 0.5, release: 0.9, cut: 1000, room: 0.3, hall: 0.3 });
});

style('sneaky', 'sneaky pizzicato: creeping chromatic pizz bass on the beat + tiptoe pizz on the off-beats. key (Em)', (s) => {
  const T = tonic(s.key ?? 'Em', 2), walk = [0, 3, 5, 6, 7, 6, 5, 3];
  grid(s, BEAT).forEach((t, j) => pizz(t, T + walk[j % 8], { gain: 0.27, decay: 0.3, bright: 0.42 }));
  grid(s, BEAT, BEAT / 2).forEach((t, j) => { if (okTop(s, t)) pizz(t, T + [24, 19, 27, 26][j % 4], { gain: 0.14, decay: 0.2, bright: 0.6, pan: 0.35 }); });
});

style('suspense', 'held suspense: a high trembling string rub over a soft low pizz pulse, growing. key (Em)', (s) => {
  const T = tonic(s.key ?? 'Em', 2), D = s.t1 - s.t0;
  tremolo(s.t0, [T + 31, T + 32], D, { gain: 0.04, rate: 9, cut: 3200, attack: 0.6, release: 0.25, depth: 0.5, cresc: (t) => 0.5 + t / D, hall: 0.3 });
  pad(s.t0, D, [T, T + 7, T + 12], { gain: 0.07, attack: 0.5, release: 0.3, cut: 600 });
});

style('tender', 'soft tender chord: strings + two celesta notes. key (G), chord (IVmaj7)', (s) => {
  const T = tonic(s.key ?? 'G', 3), D = s.t1 - s.t0, ch = DEG[s.chord ?? 'IVmaj7'];
  pad(s.t0, D, ch.map((x) => T + x), { gain: 0.075, attack: 0.3, release: 0.9, cut: 1600, vib: 0.06, room: 0.3, hall: 0.4 });
  celesta(s.t0 + 0.25, T + 24 + ch[ch.length - 1], { gain: 0.08 });
  celesta(s.t0 + 0.5, T + 24 + ch[2], { gain: 0.06 });
});

style('reprise', 'sweetest reprise: strings swell + harp glissando, rocking harp, then the whistle from origin. key (G), origin, bars', (s) => {
  const K = s.key ?? 'G', T = tonic(K, 4), B = T - 24, org = s.origin ?? s.t0;
  const prog = [[-99, 'I'], [-2, 'IV'], ...SIG_CH.filter(([b]) => b >= 0)];
  padProg(s, org, T - 12, prog, { gain: 0.065, attack: 0.7, cut: 2400, vib: 0.1, hall: 0.45 });
  for (let j = 0; j < 12; j++) harp(s.t0 + j * 0.04, T - 12 + [0, 4, 7][j % 3] + 12 * Math.floor(j / 3), { gain: 0.07 + 0.004 * j, pan: -0.5 + j * 0.08 });
  grid(s, BEAT / 2, org, s.t0 + 0.6).forEach((t) => {
    const j = Math.round((t - org) / (BEAT / 2)), ch = DEG[chordAt(prog, (t - org) / BEAT)];
    harp(t, T - 12 + [ch[0], ch[1], ch[2], ch[1] + 12][((j % 4) + 4) % 4], { gain: 0.06, pan: 0.25 });
  });
  grid(s, BAR / 2, org, Math.max(s.t0, org)).forEach((t) => upright(t, bassFor(B, DEG[chordAt(prog, (t - org) / BEAT)][0]), BEAT * 1.6, { gain: 0.2 }));
  phrase(s, sig(s.bars ?? [0, 1]), org, T, { timbre: 'whistle', gain: 0.21, room: 0.12, hall: 0.35, gate: 0.97 });
});

style('heist', 'sneaky pizzicato heist theme (Dm): staccato pizz tune with rests, pizz bass, soft brushes. accent: chord hit at t0. thin rests the tune', (s) => {
  const T = tonic(s.key ?? 'Dm', 4), B = T - 24, org = s.origin ?? s.t0;
  const MEL = [0, null, 3, null, 7, 6, 7, null, 8, null, 7, null, 6, null, 7, null,
    12, null, 10, null, 8, null, 7, null, 5, 3, 2, null, -1, null, 0, null];
  const BAS = [0, null, -5, null, 0, null, -5, -2, -4, null, 3, null, -5, null, 2, -1];
  if (s.accent !== false && inS(s, s.t0)) {
    [B, B + 12, T - 12 + 3, T - 12 + 7, T].forEach((m, j) => pizz(s.t0 + j * 0.006, m, { gain: 0.34, decay: 0.45, bright: 0.65, pan: -0.4 + j * 0.2 }));
    xylo(s.t0, T + 12, { gain: 0.14, pan: 0.3 }); mono(s.t0, [[0, 0.16, T - 12 + 3]], { timbre: 'bassoon', gain: 0.16 });
    timpani(s.t0, B, { gain: 0.3, decay: 0.8 });
  }
  grid(s, BEAT / 2, org).forEach((t) => {
    const j = ((Math.round((t - org) / (BEAT / 2)) % 32) + 32) % 32, m = MEL[j];
    if (m !== null && okTop(s, t)) pizz(t, T + m, { gain: 0.2, decay: 0.24, bright: 0.55, pan: 0.2 });
  });
  tremolo(s.t0, [T - 12, T - 5], s.t1 - s.t0, { gain: 0.03, rate: 8, cut: 1400, attack: 0.05, release: 0.4, depth: 0.6, room: 0.2, hall: 0.25 });
  grid(s, BEAT, org).forEach((t) => {
    const j = ((beatIdx(t, org) % 16) + 16) % 16, m = BAS[j];
    if (m !== null) pizz(t, B + m, { gain: 0.36, decay: 0.3, bright: 0.38, pan: -0.1 });
    if (j % 4 === 0) mono(t, [[0, 0.2, B + 12 + m]], { timbre: 'bassoon', gain: 0.09, room: 0.1, hall: 0.05 });
    if (j % 2 === 1 && okTop(s, t)) brush(t, { gain: 0.05 });
  });
});

style('walkbass', "the Chad's walk: upright bass walking quarters (Dm). swagger: finger snaps on 2 and 4 + a muted-trumpet growl each bar; double: a deadpan staccato bassoon an octave up", (s) => {
  const B = tonic(s.key ?? 'Dm', 2), org = s.origin ?? s.t0;
  const WALK = [0, 3, 5, 6, 7, 10, 7, 5, 0, 3, 5, 6, 7, 5, 3, 2];
  grid(s, BEAT, org).forEach((t) => {
    const j = ((beatIdx(t, org) % 16) + 16) % 16;
    upright(t, B + WALK[j], BEAT * 0.82, { gain: 0.46 });
    if (s.double && okTop(s, t)) mono(t, [[0, BEAT * 0.32, B + 12 + WALK[j]]], { timbre: 'bassoon', gain: 0.24, room: 0.1, hall: 0.08 });
    if (j % 2 === 1 && okTop(s, t)) s.swagger ? snap(t, { gain: 0.16 }) : brush(t, { gain: 0.05 });
    if (s.swagger && j % 4 === 3 && okTop(s, t + BEAT / 2)) mono(t + BEAT / 2, [[0, 0.3, B + 24 + WALK[j] - 1, 1], [0.3, 0.1, B + 24 + WALK[j] - 3, 0.6, 0.2]], { timbre: 'mutetp', gain: 0.08, room: 0.15 });
  });
});

style('cocky', "the Naked's cocky riff: the signature on a swaggering clarinet over pizz bass + snaps. key (D), origin, bars, thin", (s) => {
  const K = s.key ?? 'D', T = tonic(K, 4), org = s.origin ?? s.t0;
  phrase(s, sig(s.bars ?? [0, 1]), org, T, { timbre: 'clarinet', gain: 0.17, bright: 1.15, room: 0.15, hall: 0.15, gate: 0.82 });
  grid(s, BEAT, org).forEach((t) => {
    const p = posInBar(t, org), ch = DEG[chordAt(SIG_CH, (t - org) / BEAT)];
    if (p === 0 || p === 2) pizz(t, bassFor(T - 24, ch[0] + (p === 2 ? 7 : 0)), { gain: 0.34, decay: 0.3, bright: 0.4 });
    else if (okTop(s, t)) snap(t, { gain: 0.13 });
  });
});

style('western', 'western standoff: twangy guitar with echo, the whistle (signature in minor), low string drone, a brass accent on the first downbeat (accent: false to drop it). key (Am), origin, bars', (s) => {
  const K = s.key ?? 'Am', T = tonic(K, 4), B = T - 24, org = s.origin ?? s.t0, D = s.t1 - s.t0;
  const tw = (t, m, g) => ks(t, m, { gain: g, decay: 1.6, bright: 0.8, drive: 2.6, pan: -0.25, room: 0.1, hall: 0.25, delay: 0.3 });
  grid(s, BAR, org).forEach((t) => { [B, B + 7, B + 12, B + 15].forEach((m, j) => tw(t + j * 0.016, m, 0.15)); timpani(t, B - 12, { gain: 0.3, decay: 1.0 }); });
  grid(s, BAR, org + 1.5 * BEAT).forEach((t) => tw(t, B - 5, 0.2));
  grid(s, BAR, org + 3 * BEAT).forEach((t) => tw(t, B - 2, 0.16));
  tremolo(s.t0, [B, B + 7], D, { gain: 0.05, rate: 6, cut: 900, attack: 0.2, release: 0.5, depth: 0.5, hall: 0.3 });
  if (s.accent !== false && inS(s, org)) { brass(org, [B, B + 7, B + 12], 0.12, { gain: 0.26, bright: 1.3, attack: 0.004, release: 0.1, vib: 0, hall: 0.2 }); cymbal(org, { gain: 0.07, decay: 0.5, tone: 0.8 }); }
  phrase(s, sig(s.bars ?? [0], true), org, T, { timbre: 'whistle', gain: 0.2, vib: 30, room: 0.08, hall: 0.5, gate: 0.97 });
});

style('bassoon', 'comic bassoon line in minor: plodding staccato, its first note sags (deflating). key (Am), origin, thin', (s) => {
  const T = tonic(s.key ?? 'Am', 3), org = s.origin ?? s.t0;
  const LINE = [[0, 0.6, 0], [0.6, 0.9, -2, 0.8, 0.45], [2, 0.5, -5], [2.5, 0.5, -4], [3, 0.5, -5], [3.5, 0.5, -7],
    [4, 0.5, -9], [4.5, 0.5, -10], [5, 0.5, -9], [5.5, 0.5, -7], [6, 1, -5], [7, 0.5, -17], [7.5, 0.5, -12]];
  phrase(s, LINE, org, T, { timbre: 'bassoon', gain: 0.22, room: 0.12, hall: 0.12, gate: 0.7 });
  grid(s, BEAT * 2, org).forEach((t, j) => pizz(t, T - 12 + (j % 2 ? -5 : 0), { gain: 0.26, decay: 0.3, bright: 0.35 }));
});

style('organ', 'gentle prayer organ chords. key (C), prog (degrees spread evenly over the section)', (s) => {
  const T = tonic(s.key ?? 'C', 3), prog = s.prog ?? ['IV', 'I'], D = s.t1 - s.t0, step = D / prog.length;
  prog.forEach((d, j) => organ(s.t0 + j * step, [T + DEG[d][0] - 12, ...DEG[d].map((x) => T + x), T + DEG[d][0] + 12], step + 0.05,
    { gain: 0.11, attack: j ? 0.06 : 0.3, release: j === prog.length - 1 ? 0.7 : 0.12 }));
});

style('timelapse', 'sped-up pizzicato "time passes" arpeggio loop that slows over slow [a, b] (rate0 -> rate1 notes/s). key (C), prog', (s) => {
  const T = tonic(s.key ?? 'C', 4), B = T - 24, prog = s.prog ?? ['I', 'vi', 'IV', 'V'];
  const s0 = s.slow?.[0] ?? s.t1, s1 = s.slow?.[1] ?? s.t1, r0 = s.rate0 ?? 8, r1 = s.rate1 ?? 2;
  const ARP = [0, 1, 2, 3, 2, 1, 0, 1];
  for (let t = s.t0, j = 0; t < s.t1 - 1e-6; j++) {
    const ch = DEG[prog[Math.floor(j / 8) % prog.length]], tones = [ch[0], ch[1], ch[2], ch[0] + 12], u = clamp((t - s0) / Math.max(1e-3, s1 - s0), 0, 1);
    pizz(t, T + tones[ARP[j % 8]], { gain: 0.13 + 0.03 * u, decay: lerp(0.14, 0.4, u), bright: 0.55, pan: j % 2 ? 0.3 : -0.1 });
    if (j % 4 === 0) pizz(t, bassFor(B, ch[0]), { gain: 0.26, decay: lerp(0.2, 0.5, u), bright: 0.35, pan: -0.2 });
    t += 1 / (r0 * Math.pow(r1 / r0, smooth(u)));
  }
});

style('sunrise', 'warm sunrise chord: strings + horns swell, harp glissando, glockenspiel shimmer. key (C), chord (I)', (s) => {
  const T = tonic(s.key ?? 'C', 3), ch = DEG[s.chord ?? 'I'], D = s.t1 - s.t0;
  pad(s.t0, D, [T - 12 + ch[0], T + ch[0], T + ch[1], T + ch[2], T + 12 + ch[0], T + 12 + ch[1]], { gain: 0.09, attack: 0.45, release: 1.0, cut: (t) => 900 + 1900 * smooth(t / 1.2), vib: 0.06, room: 0.3, hall: 0.45 });
  brass(s.t0 + 0.05, [T + ch[0], T + ch[2], T + 12 + ch[1]], D * 0.75, { gain: 0.08, attack: 0.4, bright: 0.55, release: 0.8, hall: 0.4, spread: 0.3 });
  for (let j = 0; j < 12; j++) harp(s.t0 + j * 0.045, T + 12 + ch[j % 3] + 12 * Math.floor(j / 3), { gain: 0.07, pan: -0.5 + j * 0.08 });
  [0, 1, 2, 3, 2, 1].forEach((k, j) => glock(s.t0 + 0.3 + j * BEAT / 2, T + 24 + [ch[0], ch[1], ch[2], ch[0] + 12][k], { gain: 0.045, pan: j % 2 ? 0.4 : -0.4, hall: 0.5 }));
});

style('drums', 'tense drums. pattern taiko (16th-note toms, locks to the heli rotor) | build (timpani crescendo, toms + snare roll into t1). key: drone note', (s) => {
  const T = tonic(s.key ?? 'Em', 1), D = s.t1 - s.t0, org = s.origin ?? s.t0;
  if ((s.pattern ?? 'taiko') === 'taiko') {
    const PAT = { 0: [T + 12, 1], 3: [T + 19, 0.6], 6: [T + 12, 0.8], 8: [T + 12, 1], 10: [T + 19, 0.55], 11: [T + 19, 0.7], 13: [T + 24, 0.6], 14: [T + 12, 0.8] };
    grid(s, BEAT / 4, org).forEach((t) => {
      const j = ((Math.round((t - org) / (BEAT / 4)) % 16) + 16) % 16, p = PAT[j];
      if (p) tom(t, p[0] + 12, { gain: 0.34 * p[1], decay: 0.22, room: 0.2, hall: 0.12, skin: 0.8 });
      if (j === 0 || j === 8) kick(t, { gain: 0.42, tune: 44, punch: 0.9, decay: 0.3 });
      if (j === 4 || j === 12) snare(t, { gain: 0.16, decay: 0.1, room: 0.2 });
      else if (j % 2 === 1) snare(t, { gain: 0.03, decay: 0.05 });
    });
    if (s.drone !== false) tremolo(s.t0, [T + 12, T + 13, T + 24], D, { gain: 0.06, rate: 8, cut: 900, attack: 0.15, release: 0.4, depth: 0.5, hall: 0.25 });
  } else {
    grid(s, BEAT, org).forEach((t, j) => timpani(t, T + 12, { gain: 0.16 + 0.07 * j, decay: 0.5 }));
    grid(s, BEAT / 2, org, s.t1 - 2 * BEAT).forEach((t, j) => tom(t, T + 24 + [7, 5, 3, 0][j % 4], { gain: 0.2 + 0.05 * j, decay: 0.2 }));
    snareRoll(s.t1 - BEAT * 2, BEAT * 2, { g0: 0.04, g1: 0.26 });
    tremolo(s.t0, [T + 24, T + 25], D, { gain: 0.05, rate: 10, cut: 1500, attack: 0.3, release: 0.05, cresc: (t) => 0.5 + t / D, hall: 0.2 });
  }
});

style('romance', 'swooning romance: lush strings, triplet harp, a solo violin sings the signature. key (F), origin, bars', (s) => {
  const K = s.key ?? 'F', T = tonic(K, 4), B = T - 24, org = s.origin ?? s.t0;
  const prog = [[-99, 'Imaj7'], [-2, 'IV'], ...SIG_CH.filter(([b]) => b >= 0)];
  padProg(s, org, T - 12, prog, { gain: 0.075, vib: 0.14, cut: 2600, attack: 0.35, hall: 0.45 });
  for (let j = 0; j < 14; j++) harp(s.t0 + j * 0.035, B + 12 + [0, 4, 7, 11][j % 4] + 12 * Math.floor(j / 4), { gain: 0.06 + 0.004 * j, pan: -0.6 + j * 0.09 });
  grid(s, BEAT / 3, org, s.t0 + 0.5).forEach((t) => {
    const j = Math.round((t - org) / (BEAT / 3)), ch = DEG[chordAt(prog, (t - org) / BEAT)];
    harp(t, T - 12 + [ch[0], ch[1], ch[2], ch[1] + 12, ch[2] + 12, ch[1] + 12][((j % 6) + 6) % 6], { gain: 0.045, pan: -0.3 });
  });
  grid(s, BAR / 2, org).forEach((t) => upright(t, bassFor(B, DEG[chordAt(prog, (t - org) / BEAT)][0]), BEAT * 1.8, { gain: 0.2 }));
  phrase(s, sig(s.bars ?? [0, 1]), org, T, { timbre: 'violin', gain: 0.17, room: 0.2, hall: 0.5, gate: 0.98 });
});

style('polka', 'polka: tuba oom, accordion pah + off-beat snare, xylophone + clarinet tune. variant hop (the signature) | chase (running arpeggios). key (F), origin', (s) => {
  const K = s.key ?? 'F', T = tonic(K, 4), B = T - 24, org = s.origin ?? s.t0, chase = s.variant === 'chase';
  const prog = chase ? [[-99, 'I'], [0, 'I'], [4, 'V7'], [8, 'I'], [12, 'V7'], [16, 'I'], [20, 'V7'], [24, 'I']] : SIG_CH;
  grid(s, BEAT, org).forEach((t) => {
    const b = (t - org) / BEAT, ch = DEG[chordAt(prog, b)], alt = ((Math.round(b) % 2) + 2) % 2;
    mono(t, [[0, BEAT * 0.4, bassFor(B, ch[0] + (alt ? 7 : 0))]], { timbre: 'tuba', gain: 0.24, room: 0.08, hall: 0.05 });
    if (alt === 0) kick(t, { gain: 0.2, tune: 50, punch: 0.6, decay: 0.15 });
  });
  grid(s, BEAT, org + BEAT / 2).forEach((t) => {
    const ch = DEG[chordAt(prog, (t - org) / BEAT)];
    accordion(t, ch.map((x) => T - 12 + x), BEAT * 0.28, { gain: 0.07, pan: 0.25 });
    snare(t, { gain: 0.07, decay: 0.06, pan: -0.2 });
  });
  if (chase) {
    const RUN = [[7, 12, 16, 12, 19, 16, 12, 16], [5, 11, 14, 11, 19, 17, 14, 11]];
    grid(s, BEAT / 2, org).forEach((t) => {
      if (!okTop(s, t)) return;
      const j = Math.round((t - org) / (BEAT / 2)), bar = Math.floor(j / 8), m = T + RUN[((bar % 2) + 2) % 2][((j % 8) + 8) % 8];
      xylo(t, m, { gain: 0.11, pan: 0.2 });
      mono(t, [[0, BEAT * 0.3, m]], { timbre: 'clarinet', gain: 0.06, room: 0.1 });
    });
  } else {
    sig(s.bars ?? [0, 1]).forEach(([b, , m]) => { const t = org + b * BEAT; if (okTop(s, t)) xylo(t, T + m, { gain: 0.12, pan: 0.2 }); });
    phrase(s, sig(s.bars ?? [0, 1]), org, T, { timbre: 'clarinet', gain: 0.1, room: 0.1, hall: 0.1, gate: 0.6 });
  }
});

style('marimba', 'bouncy marimba theme: the signature on marimba over a bouncy bass, woodblock and shaker; vamps before origin and rolls up into it. key (F), origin, bars', (s) => {
  const K = s.key ?? 'F', T = tonic(K, 4), B = T - 24, org = s.origin ?? s.t0;
  for (const [b, l, m] of sig(s.bars ?? [0, 1])) {
    const t = org + b * BEAT;
    if (!okTop(s, t)) continue;
    marimba(t, T + m, { gain: 0.24, pan: 0.12, decay: 0.5, room: 0.15 });
    if (l >= 1) for (let r = BEAT / 2; r < l * BEAT - 0.05; r += BEAT / 2) marimba(t + r, T + m, { gain: 0.12, pan: 0.12, decay: 0.35 });
  }
  grid(s, BEAT, org).forEach((t) => {
    const p = posInBar(t, org), ch = DEG[chordAt(SIG_CH, (t - org) / BEAT)];
    if (p === 0 || p === 2) { const bm = bassFor(B + 12, ch[0] + (p === 2 ? 7 : 0)); marimba(t, bm, { gain: 0.26, decay: 0.55, pan: -0.15 }); pizz(t, bm - 12, { gain: 0.24, decay: 0.3, bright: 0.35 }); }
    else { marimba(t, T + ch[1] - 12 * (ch[1] > 9), { gain: 0.12, decay: 0.3, pan: -0.3 }); marimba(t, T + ch[2] - 12 * (ch[2] > 9), { gain: 0.12, decay: 0.3, pan: -0.3 }); }
  });
  grid(s, BEAT, org + BEAT / 2).forEach((t) => woodblock(t, { gain: 0.06, f: 1150, pan: 0.35 }));
  grid(s, BEAT / 4, org).forEach((t, j) => shaker(t, { gain: j % 2 ? 0.018 : 0.03, pan: 0.4 }));
  if (s.t0 <= org - 1 && s.t1 >= org - 1e-6) // a marimba roll that winds up into the downbeat
    for (let t = org - 1, j = 0; t < org - 0.3; t += BEAT / 4, j++) { const u = (t - org + 1) / 0.7; [T - 12, T - 5, T].forEach((m) => marimba(t, m, { gain: 0.03 + 0.09 * u * u, decay: 0.25, pan: j % 2 ? 0.25 : -0.25 })); }
});

style('ominous', 'ominous low: tuba/contrabass drone, low brass swelling, timpani on the beat growing. key (Cm), hit (a low "dun" at t0)', (s) => {
  const T = tonic(s.key ?? 'Cm', 2), D = s.t1 - s.t0;
  pad(s.t0, D, [T, T + 7], { gain: 0.16, attack: 0.3, release: 0.4, cut: 380, room: 0.15 });
  brass(s.t0, [T, T + 3, T + 7, T + 12], D, { gain: 0.1, attack: D * 0.85, bright: 0.45, release: 0.15, vib: 0, room: 0.2, hall: 0.2 });
  if (s.hit !== false) { mono(s.t0, [[0, 0.5, T]], { timbre: 'tuba', gain: 0.3, room: 0.15, hall: 0.2 }); timpani(s.t0, T, { gain: 0.4, decay: 0.9 }); }
  grid(s, BEAT, s.origin ?? 0, s.t0 + 0.2).forEach((t, j) => timpani(t, T, { gain: 0.14 + 0.04 * j, decay: 0.55 }));
});

style('tension', 'rising tension: tremolo strings climbing, timpani roll and noise riser into t1 (use cut for a hard stop). key (Cm), rise (semitones)', (s) => {
  const T = tonic(s.key ?? 'Cm', 3), D = s.t1 - s.t0, rise = s.rise ?? 5;
  tremolo(s.t0, [T - 12, T, T + 1], D + 0.05, { gain: 0.08, rate: 10, cut: 2400, attack: 0.25, release: 0.02, cresc: (t) => 0.45 + 0.8 * t / D, bend: (t) => rise * t / D, room: 0.2, hall: 0.25 });
  riser(s.t0, D, { gain: 0.06, f0: 300, f1: 5000, curve: 2.2 });
  for (let t = s.t0; t < s.t1 - 0.02; t += BEAT / 6) timpani(t, T - 12, { gain: 0.04 + 0.16 * ((t - s.t0) / D) ** 2, decay: 0.35, hall: 0.1 });
});

style('layers', 'tension that adds a layer at each time in adds: 8th pulse -> hats -> string ostinato -> brass + snare + riser. key (Em)', (s) => {
  const T = tonic(s.key ?? 'Em', 2), adds = s.adds ?? [], on = (k, t) => adds[k] !== undefined && t >= adds[k] - 1e-6;
  grid(s, BEAT / 2).forEach((t, j) => bass(t, T + (j % 2 ? 12 : 0), BEAT * 0.4, { gain: 0.22, cut: 280, env: 900, drive: 2 }));
  pad(s.t0, s.t1 - s.t0, [T + 12, T + 19, T + 24], { gain: 0.035, attack: 0.8, release: 0.1, cut: 900 });
  grid(s, BEAT / 4).forEach((t, j) => { if (on(0, t)) hat(t, { gain: j % 4 === 2 ? 0.055 : 0.03 }); });
  grid(s, BEAT / 4).forEach((t, j) => { if (on(1, t)) pluck(t, T + 24 + [0, 3, 7, 10, 7, 3, 0, -2][j % 8], { gain: 0.07, decay: 0.08, cut: 900, env: 2500, pan: j % 2 ? 0.3 : -0.3 }); });
  grid(s, BEAT / 2).forEach((t, j) => {
    if (!on(2, t)) return;
    snare(t, { gain: 0.09 + 0.012 * (j % 8), decay: 0.08 });
    if (j % 2 === 0) brass(t, [T + 12, T + 15, T + 19], 0.18, { gain: 0.09, bright: 1.2, attack: 0.01, release: 0.1 });
  });
  if (adds[2] !== undefined && adds[2] < s.t1) riser(adds[2], s.t1 - adds[2], { gain: 0.07, f0: 400, f1: 6000 });
});

style('release', 'relieved chord: a soft swell with a harp roll that settles. key (G), chord (Iadd9)', (s) => {
  const T = tonic(s.key ?? 'G', 3), ch = DEG[s.chord ?? 'Iadd9'], D = s.t1 - s.t0;
  pad(s.t0, D, ch.map((x) => T + x), { gain: 0.08, attack: 0.15, release: 1.0, cut: (t) => 2400 - 1200 * smooth(t / D), vib: 0.05, room: 0.3, hall: 0.4 });
  ch.concat(ch.map((x) => x + 12)).forEach((x, j) => harp(s.t0 + j * 0.05, T + 12 + x, { gain: 0.07, pan: -0.4 + j * 0.1 }));
  upright(s.t0, T - 12 + ch[0], 0.8, { gain: 0.25 });
});

style('funk', 'funky bass-and-clap groove (E dorian): slap-ish 16th bass, claps on 2 and 4, kick, hats, e-piano stabs. key (Em), origin', (s) => {
  const T = tonic(s.key ?? 'Em', 2), org = s.origin ?? s.t0;
  const BS = [0, null, 12, 0, null, 10, 12, null, 0, null, 3, 5, 7, null, 10, 9];
  grid(s, BEAT / 4, org).forEach((t) => {
    const j = ((Math.round((t - org) / (BEAT / 4)) % 16) + 16) % 16, m = BS[j];
    if (m !== null) bass(t, T + m, BEAT * (j % 4 === 0 ? 0.4 : 0.18), { gain: 0.3, cut: 380, env: 2600, q: 1.6, drive: 2.2 });
    if (j === 0 || j === 6 || j === 8) kick(t, { gain: 0.5, punch: 1.1 });
    if (j === 4 || j === 12) { clap(t, { gain: 0.22 }); snare(t, { gain: 0.08 }); }
    hat(t, { gain: j % 2 ? 0.02 : 0.045, open: j === 14 });
    if (j === 3 || j === 10) [T + 24, T + 27, T + 31, T + 34, T + 38].forEach((x) => epiano(t, x, BEAT * 0.3, { gain: 0.05, bark: 2 }));
    if (j % 4 === 2) ks(t, T + 31, { gain: 0.05, decay: 0.08, bright: 0.9, pan: 0.45 });
  });
});

style('lounge', 'relaxed lounge: e-piano maj7 chords, walking upright, brushes, vibraphone plays the signature. key (G), origin, bars', (s) => {
  const K = s.key ?? 'G', T = tonic(K, 4), B = T - 24, org = s.origin ?? s.t0;
  const prog = [[-99, 'Imaj7'], [2, 'vi7'], [4, 'ii7'], [6, 'V7'], [8, 'Imaj7']];
  grid(s, BEAT * 2, org).forEach((t) => DEG[chordAt(prog, (t - org) / BEAT)].forEach((x, j) => epiano(t + j * 0.01, T - 12 + x, BEAT * 1.9, { gain: 0.06, bark: 1.1 })));
  const WALK = [0, 4, 7, 9, 9, 7, 4, 2];
  grid(s, BEAT, org).forEach((t) => {
    const j = ((beatIdx(t, org) % 8) + 8) % 8;
    upright(t, B + WALK[j], BEAT * 0.8, { gain: 0.26 });
    if (j % 2 === 1) brush(t, { gain: 0.06 }); else brush(t, { gain: 0.03, dur: 0.35 });
  });
  for (const [b, , m] of sig(s.bars ?? [0])) { const t = org + b * BEAT; if (okTop(s, t)) vibes(t, T + m, { gain: 0.12, pan: 0.15 }); }
});

style('tiptoe', 'tiptoe pizzicato: staccato pizz steps on the 8ths over a low pizz bass, a bassoon creeping. key (Em)', (s) => {
  const T = tonic(s.key ?? 'Em', 3);
  grid(s, BEAT).forEach((t, j) => pizz(t, T - 12 + [0, 7, 3, 7][j % 4], { gain: 0.28, decay: 0.3, bright: 0.38 }));
  grid(s, BEAT / 2).forEach((t, j) => { if (okTop(s, t)) pizz(t, T + 12 + [0, 3, 7, 3, 5, 3, 2, -1][j % 8], { gain: 0.11, decay: 0.15, bright: 0.6, pan: 0.3 }); });
  grid(s, BAR).forEach((t) => { if (okTop(s, t)) mono(t, [[0, 0.2, T], [0.5, 0.2, T + 3], [1.0, 0.2, T + 7]], { timbre: 'bassoon', gain: 0.08 }); });
});

// ════════════════════════════ 7. sfx ════════════════════════════
// One function per cue type: SFX[type](t, p). cat decides the bus and how far the music ducks under it:
//   amb (ambience bed -> amb bus, no duck), hit (big, -6 dB), fx (-3 dB), soft (-1.5 dB), music (stinger, -1 dB).
// Every cue also takes gain (dB), and most take pan; anything with a length takes dur.
const SFX = {};
const DUCK = { amb: 0, hit: 6, fx: 3, soft: 1.5, music: 1 };
const sfx = (name, cat, doc, fn) => { fn.doc = doc; fn.cat = cat; SFX[name] = fn; };
/** The key of the music section playing at time t (or the nearest one), for tuned SFX. */
function keyAt(t) {
  const ks = SECTIONS.filter((s) => s.key);
  const s = ks.find((x) => t >= x.t0 - 1e-6 && t < x.t1) ?? [...ks].reverse().find((x) => x.t0 <= t) ?? ks[0];
  return s?.key ?? 'C';
}
const tonicAt = (p, t, oct) => tonic(p.key ?? keyAt(t), oct);
/** Tonic for bright major-chord stingers: in a minor key, the relative major (stays diatonic). */
const majorAt = (p, t, oct) => { const k = parseKey(p.key ?? keyAt(t)); return 12 * (oct + 1) + k.pc + (k.minor ? 3 : 0); };
const P = (p, d) => p.pan ?? d;

/**
 * Ambience bed helper. mk(len) -> [L, R] continuous noise-like process. Fades in/out, follows p.level
 * [[t, dB], ...] (episode time) and, in a loop episode when it covers the whole lap, crossfades its own
 * overhang onto its start so the loop point is seamless.
 */
function bed(t, p, mk, o = {}) {
  const dur = p.dur ?? DUR - t, full = LOOP && dur >= DUR - 1e-6, xf = full ? 1.0 : 0;
  const len = (full ? DUR : dur) + xf, [L, R] = mk(len);
  const fi = full ? 0 : p.fadeIn ?? 0.3, fo = full ? 0 : p.fadeOut ?? 0.6, lv = p.level;
  for (let i = 0; i < L.length; i++) {
    const tt = i / SR, ta = t + tt;
    let e = lv ? db(curve(lv, LOOP ? ((ta % DUR) + DUR) % DUR : ta)) : 1;
    if (full) { if (tt < xf) e *= Math.sin((Math.PI / 2) * (tt / xf)); else if (tt >= DUR) e *= Math.cos((Math.PI / 2) * ((tt - DUR) / xf)); }
    else { if (fi > 0 && tt < fi) e *= smooth(tt / fi); if (fo > 0 && tt > dur - fo) e *= 1 - smooth((tt - (dur - fo)) / fo); }
    L[i] *= e; R[i] *= e;
  }
  outSt(L, R, t, { gain: o.gain ?? 1, room: o.room ?? 0, hall: o.hall ?? 0 });
}
/** Slow random wobble 0..1 made of a few sines (for gusts, flicker). */
const wob = (rates) => { const ph = rates.map(() => rand(0, TAU)); return (t) => 0.5 + 0.5 * rates.reduce((a, r, k) => a + Math.sin(TAU * r * t + ph[k]), 0) / rates.length; };

// ── ambience ──
sfx('waves', 'amb', 'beach waves: swell, break and foam on a period (s, default ~4.5, fits the loop). dur, level [[t, dB]]', (t, p) => {
  const per = p.period ?? (LOOP ? DUR / Math.max(1, Math.round(DUR / 4.5)) : 4.5);
  bed(t, p, (len) => gen2(len, (side) => {
    const pk = pinkGen(), lp = new SVF(), hp = new SVF(), rum = new SVF(), off = side * 0.13 + rand(0, 0.05);
    return (tt) => {
      const ph = ((((t + tt + off) / per) % 1) + 1) % 1;
      const sw = ph < 0.6 ? smooth(ph / 0.6) : 1 - smooth((ph - 0.6) / 0.4);
      const foam = ph >= 0.58 ? Math.pow(1 - (ph - 0.58) / 0.42, 1.6) : 0;
      const x = pk();
      lp.run(x, 220 + 1500 * sw * sw, 0.6); hp.run(x, 2200, 0.6); rum.run(x, 130, 0.7);
      return lp.lp * (0.3 + 1.3 * sw) + hp.hp * foam * 0.3 + rum.lp * 0.3;
    };
  }), { gain: db(-14) });
});
sfx('wind', 'amb', 'soft wind with slow gusts and a faint whistle. dur, gust (0..1), level', (t, p) => {
  const gust = p.gust ?? 0.6;
  bed(t, p, (len) => gen2(len, () => {
    const pk = pinkGen(), bp = new SVF(), wh = new SVF(), g = wob([0.11, 0.23, 0.37]);
    return (tt) => { const u = g(t + tt) * gust; const x = pk(); bp.run(x, 380 + 900 * u, 0.7); wh.run(x, 1050 + 300 * u, 14); return bp.bp * (0.45 + 0.8 * u) + wh.bp * u * u * 0.5; };
  }), { gain: db(-15) });
});
/** One bird call into TGT. kind: meadow | forest. */
function birdCall(t0, kind, o = {}) {
  const v = Math.floor(rand(0, kind === 'forest' ? 4 : 3)), pan = o.pan ?? rand(-0.8, 0.8), g = (o.gain ?? 1) * rand(0.5, 1);
  const s = sweepSine();
  let b;
  if (v === 0) { // "tsee-tsee-tsee": quick down-glides
    const n = Math.floor(rand(2, 5)), f0 = rand(3200, 4600), d = rand(0.05, 0.08), gap = rand(0.08, 0.13);
    b = gen(n * gap + 0.1, (tt) => { const k = Math.floor(tt / gap), u = tt - k * gap; if (k >= n || u > d) return 0; return s(f0 * (1 - 0.25 * u / d)) * Math.sin(Math.PI * u / d); });
  } else if (v === 1) { // trill
    const f0 = rand(2800, 3800), d = rand(0.25, 0.45), r = rand(18, 26);
    b = gen(d + 0.05, (tt) => s(f0 * (1 + 0.04 * Math.sin(TAU * r * tt))) * Math.pow(Math.abs(Math.sin(Math.PI * r * tt)), 2) * Math.sin(Math.PI * Math.min(1, tt / d)));
  } else if (v === 2) { // "tee-oo" whistle
    const f0 = rand(2200, 2900), d = 0.14;
    b = gen(0.4, (tt) => { const k = tt < d ? 0 : tt > d + 0.04 && tt < 2 * d + 0.04 ? 1 : -1; if (k < 0) return 0; const u = tt - k * (d + 0.04); return s(f0 * (k ? 0.75 : 1) * (1 + 0.03 * u / d)) * Math.sin(Math.PI * u / d); });
  } else { // forest: soft two-note "coo-coo"
    const f0 = rand(520, 700);
    b = gen(0.75, (tt) => { const k = tt < 0.22 ? 0 : tt > 0.3 && tt < 0.6 ? 1 : -1; if (k < 0) return 0; const u = tt - (k ? 0.3 : 0), d = k ? 0.3 : 0.22; return s(f0 * (k ? 0.84 : 1)) * Math.sin(Math.PI * u / d) * 2.2; });
  }
  filt(b, [['lp', 6500, 0.7]]);
  out(b, t0, { gain: 0.05 * g, pan, room: 0.2, hall: 0.35 });
}
sfx('birds', 'amb', 'distant birdsong, random calls. dur, density (calls/s), kind (meadow|forest), level', (t, p) => {
  const dur = p.dur ?? DUR - t, dens = p.density ?? 0.9, kind = p.kind ?? 'meadow';
  for (let tt = rand(0, 0.4); tt < dur - 0.4; tt += rand(0.4, 1.6) / dens) {
    const ta = t + tt, lv = p.level ? db(curve(p.level, LOOP ? ta % DUR : ta)) : 1;
    const fe = Math.min(1, tt / (p.fadeIn ?? 0.01), (dur - tt) / (p.fadeOut ?? 0.01));
    birdCall(ta, kind, { gain: lv * fe });
  }
});
sfx('forest', 'amb', 'forest bed: songbirds + soft leaves. dur, density, level', (t, p) => {
  SFX.birds(t, { density: 1.3, ...p, kind: 'forest' });
  bed(t, p, (len) => gen2(len, () => { const pk = pinkGen(), bp = new SVF(), g = wob([0.17, 0.31]); return (tt) => { bp.run(pk(), 2400, 0.6); return bp.bp * (0.3 + 0.7 * g(t + tt)); }; }), { gain: db(-24) });
});
/** One cricket chirp group into TGT. */
function cricketChirp(t0, o = {}) {
  const f = o.f ?? rand(4200, 5000), n = o.n ?? Math.floor(rand(3, 5)), s = sweepSine();
  const b = gen(n * 0.035 + 0.03, (tt) => { const u = (tt % 0.035) / 0.035; return Math.floor(tt / 0.035) < n ? s(f) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.4)), 2) : 0; });
  out(b, t0, { gain: o.gain ?? 0.03, pan: o.pan ?? 0, room: 0.15, hall: 0.2 });
}
sfx('crickets', 'amb', 'evening crickets (n of them, each chirping on its own period). dur, n, level', (t, p) => {
  const dur = p.dur ?? DUR - t, n = p.n ?? 3;
  for (let c = 0; c < n; c++) {
    const per = rand(0.45, 0.85), f = rand(4100, 5100), pan = rand(-0.85, 0.85), g = rand(0.018, 0.034);
    for (let tt = rand(0, per); tt < dur - 0.1; tt += per * rand(0.95, 1.05)) {
      const ta = t + tt, lv = p.level ? db(curve(p.level, LOOP ? ta % DUR : ta)) : 1, fe = Math.min(1, tt / (p.fadeIn ?? 0.3), (dur - tt) / (p.fadeOut ?? 0.3));
      cricketChirp(ta, { f, pan, gain: g * lv * fe });
    }
  }
});
sfx('cricket', 'soft', 'one lone cricket chirp (an awkward-silence gag). pan', (t, p) => cricketChirp(t, { gain: 0.3, pan: P(p, 0.4), f: 4300, n: 3 }));
sfx('fire', 'amb', 'campfire: low flicker roar + crackles and pops. dur, level', (t, p) => {
  bed(t, p, (len) => gen2(len, () => {
    const br = new OnePole(260), fl = wob([0.7, 1.3, 2.9]), cr = new SVF(), pp = new SVF();
    let c = 0, cf = 3000, q = 0, qf = 1200;
    return (tt) => {
      if (rnd() < 14 / SR) { c = rand(0.3, 1); cf = rand(2500, 6000); }
      if (rnd() < 2.2 / SR) { q = rand(0.5, 1); qf = rand(700, 1800); }
      c *= 0.992; q *= 0.9965;
      cr.run(white() * c, cf, 2); pp.run(white() * q, qf, 1.5);
      return br.lp(white()) * (0.9 + 1.2 * fl(t + tt)) + cr.bp * 1.6 + pp.bp * 2.2;
    };
  }), { gain: db(-13), room: 0.1 });
});
sfx('rotor', 'amb', 'patrol-heli rotor: blade thumps on 16ths (8/s) + turbine whine + tail buzz. dur, level/pitch/pan/lp [[t, v]] automation (episode time)', (t, p) => {
  const dur = p.dur ?? DUR - t, rate = p.rate ?? 8;
  const lv = p.level ?? [[0, 0]], pi = p.pitch ?? [[0, 1]], pn = p.pan ?? [[0, 0]], lpA = p.lp ?? [[0, 7000]];
  const len = dur + 0.05, L = newBuf(len), R = newBuf(len);
  const thump = sweepSine(0), whine = sweepSine(), tail = new Osc(), bpN = new SVF(), slapN = new SVF(), midN = new SVF(), tailF = new SVF(), rum = new OnePole(170);
  const fLs = new SVF(), fRs = new SVF(), dec = new OnePole(900);
  let ph = 0, env = 0, slap = 0, since = 1;
  const kEnv = Math.exp(-1 / (0.038 * SR)), kSlap = Math.exp(-1 / (0.006 * SR)), att = 0.0025 * SR;
  for (let i = 0; i < L.length; i++) {
    const tt = i / SR, ta = t + tt, pf = curve(pi, ta);
    ph += (rate * pf) / SR;
    if (ph >= 1) { ph -= 1; since = 0; }
    if (since < att) { const a = (since + 1) / att; env = Math.max(env * kEnv, a); slap = Math.max(slap * kSlap, a); } else { env *= kEnv; slap *= kSlap; }
    since++;
    const n = white();
    bpN.run(n, 260 * pf, 1.1); slapN.run(n, 1300 * pf, 1.4); tailF.run(tail.saw(47 * pf), 420, 2);
    midN.run(n, 620 * pf, 1.2);
    const blade = (thump(72 * pf * (1 + 0.5 * env)) * 0.6 + bpN.bp * 2.4 + midN.bp * 2.2) * env + slapN.bp * slap * 2.6;
    const cont = whine(2150 * pf * (1 + 0.003 * Math.sin(TAU * 0.7 * ta))) * 0.022 + tailF.bp * 0.12 + rum.lp(white()) * 0.9;
    const x = Math.tanh(1.3 * (blade + cont));
    const fc = curve(lpA, ta), g = db(curve(lv, ta)) * Math.min(1, tt / 0.05, (dur - tt) / 0.3), pnv = clamp(curve(pn, ta), -1, 1);
    const a = ((pnv + 1) * Math.PI) / 4, d2 = dec.lp(n) * 0.05;
    L[i] = fLs.run(x + d2, fc, 0.6) * g * Math.cos(a) * Math.SQRT2; R[i] = fRs.run(x - d2, fc, 0.6) * g * Math.sin(a) * Math.SQRT2;
  }
  outSt(L, R, t, { gain: db(-6), room: 0.12 });
});
sfx('seagulls', 'soft', 'a few distant seagull calls ("kee-ow"). n, dur (spread), pan', (t, p) => {
  const n = p.n ?? 3, spread = p.dur ?? 2.5;
  for (let k = 0; k < n; k++) {
    const t0 = t + (k / n) * spread + rand(0, 0.2), f0 = rand(850, 1050), d = rand(0.32, 0.42), os = new Osc(), b1 = new SVF(), b2 = new SVF();
    const b = gen(d + 0.05, (tt) => { const u = tt / d; const f = f0 * (1 + 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.3)) - 0.15 * u); const x = os.pulse(f, 0.3); b1.run(x, 1700, 3); b2.run(x, 3000, 4); return (b1.bp + 0.5 * b2.bp) * Math.sin(Math.PI * Math.min(1, u)) * (1 + 0.2 * white()); });
    filt(b, [['lp', 4500, 0.7]]);
    out(b, t0, { gain: 0.17, pan: P(p, rand(-0.8, 0.8)), room: 0.2, hall: 0.45 });
  }
});
sfx('owl', 'soft', 'owl hoots "hoo... hoo-hoo" (distant). n (2-3), pan', (t, p) => {
  [0, 0.5, 0.72].slice(0, p.n ?? 3).forEach((d, k) => {
    const s = sweepSine(), bp = new SVF(), f = 470 * (k ? 0.97 : 1);
    const b = gen(0.45, (tt) => { bp.run(white(), f, 5); const e = adsr(tt, 0.04, 0.05, 0.85, 0.2, k ? 0.12 : 0.22); const y = s(f * (1 - 0.02 * tt)); return (y + 0.25 * y * y * y + 0.1 * bp.bp * 6) * e; });
    out(b, t + d, { gain: 0.26, pan: P(p, -0.5), room: 0.2, hall: 0.6 });
  });
});
sfx('wolf', 'soft', 'a distant wolf howl (2 s). pan', (t, p) => {
  const s = sweepSine(), bp = new SVF(), d = p.dur ?? 2.2, vph = rand(0, TAU);
  const b = gen(d + 0.1, (tt) => {
    const u = tt / d, f = (u < 0.25 ? lerp(360, 600, smooth(u / 0.25)) : u < 0.75 ? 600 + 15 * Math.sin(TAU * 0.6 * tt) : lerp(600, 430, smooth((u - 0.75) / 0.25))) * (1 + 0.012 * Math.sin(TAU * 5.5 * tt + vph));
    const y = s(f); bp.run(white(), f * 2, 6);
    return (y + 0.18 * y * y * y + 0.06 * bp.bp) * adsr(tt, 0.25, 0.2, 0.85, 0.45, d - 0.45);
  });
  filt(b, [['lp', 2200, 0.7]]);
  out(b, t, { gain: 0.06, pan: P(p, 0.6), room: 0.2, hall: 0.8 });
});

// ── tools and doors ──
/** Wood chips: tiny clicks scattered after an impact. */
function chips(t0, amt = 1, pan = 0) {
  for (let k = 0; k < Math.round(7 * amt); k++) {
    const f = rand(2500, 5500), b = partials(f, [[1, 1, rand(0.004, 0.01)], [1.7, 0.5, 0.004]], 0.05, 0.0003);
    out(b, t0 + rand(0.02, 0.3), { gain: rand(0.03, 0.08) * amt, pan: clamp(pan + rand(-0.6, 0.6), -1, 1), room: 0.15 });
  }
  for (let k = 0; k < Math.round(2 * amt); k++) out(partials(rand(500, 900), [[1, 1, 0.012], [2.3, 0.4, 0.006]], 0.06, 0.0005), t0 + rand(0.3, 0.55), { gain: 0.05 * amt, pan: clamp(pan + rand(-0.5, 0.5), -1, 1), room: 0.2 });
}
sfx('thock', 'hit', 'rock "thock" on wood: hollow knock + click + low thump, with wood chips. pitch (1), chips (0..1), pan', (t, p) => {
  const pf = p.pitch ?? 1, f0 = 310 * pf, th = sweepSine(0), bp = new SVF();
  const body = partials(f0, [[1, 1, 0.07], [1.58, 0.65, 0.045], [2.31, 0.45, 0.03], [3.12, 0.3, 0.02], [4.4, 0.14, 0.012]], 0.45, 0.0008, (tt) => 1 + 0.08 * Math.exp(-tt / 0.008));
  const b = gen(0.45, (tt, i) => { bp.run(white(), 2600, 1.1); return Math.tanh(1.6 * (body[i] * 0.9 + bp.bp * Math.exp(-tt / 0.003) * 1.6 + th((115 + 70 * Math.exp(-tt / 0.012)) * pf) * perc(tt, 0.001, 0.05) * 1.1)); });
  out(b, t, { gain: 0.75, pan: P(p, 0), room: 0.14, hall: 0.05 });
  if ((p.chips ?? 1) > 0) chips(t, p.chips ?? 1, P(p, 0));
});
sfx('knock', 'fx', 'dull bark thud on a trunk (after a miss). pitch, pan', (t, p) => {
  const pf = p.pitch ?? 1, th = sweepSine(0), lp = new OnePole(900);
  const body = partials(290 * pf, [[1, 1, 0.05], [1.7, 0.5, 0.03], [2.6, 0.3, 0.015]], 0.3, 0.001), bp = new SVF();
  out(gen(0.3, (tt, i) => { bp.run(white(), 900, 1); return Math.tanh(1.4 * (body[i] + bp.bp * perc(tt, 0.001, 0.015) * 1.4 + lp.lp(white()) * perc(tt, 0.001, 0.012) * 0.5 + th(110 * pf) * perc(tt, 0.002, 0.04) * 0.4)); }), t, { gain: 0.6, pan: P(p, -0.1), room: 0.12 });
  chips(t, 0.35, P(p, -0.1));
});
sfx('thunk', 'fx', 'rock drops on something: dull thud + rock click (+ dirt). soft (a foot: fleshier), pitch, pan', (t, p) => {
  const pf = p.pitch ?? 1, th = sweepSine(0), bp = new SVF(), dirt = new SVF(), md = new SVF();
  out(gen(0.35, (tt) => { bp.run(white(), 1900, 1.4); dirt.run(white(), 1000, 0.9); md.run(white(), 520, 1);
    return Math.tanh(1.5 * (th((p.soft ? 160 : 190) * pf * (1 + 0.5 * Math.exp(-tt / 0.01))) * perc(tt, 0.001, p.soft ? 0.06 : 0.045) * 0.8 + md.bp * perc(tt, 0.001, 0.03) * 2.2 + bp.bp * perc(tt, 0.0005, 0.004) * 1.6 + (p.soft ? 0 : dirt.bp * perc(tt, 0.002, 0.04) * 0.8)));
  }), t, { gain: 0.6, pan: P(p, 0), room: 0.12 });
});
sfx('clang', 'hit', 'rock on a metal facemask: bell-like ring with a long decay, the dented wobble. pitch, ring (decay x), wobble (0..1), pan', (t, p) => {
  const pf = p.pitch ?? 1, ring = p.ring ?? 1, wobA = p.wobble ?? 1;
  const M = [[1, 1, 2.4], [1.47, 0.75, 1.8], [2.09, 0.6, 1.4], [2.56, 0.5, 1.1], [3.2, 0.38, 0.8], [4.1, 0.28, 0.55], [5.4, 0.18, 0.35], [6.9, 0.1, 0.2]].map(([r, a, d]) => [r, a, d * ring]);
  const [L, R] = [0, 1].map((s) => partials(520 * pf * (1 + s * 0.004), M, 3.6 * ring, 0.0008));
  const bp = new SVF(), th = sweepSine(0);
  const hit = gen(0.3, (tt) => { bp.run(white(), 3300, 1.2); return bp.bp * Math.exp(-tt / 0.005) * 2.2 + th(190 * pf) * perc(tt, 0.001, 0.04) * 0.9; });
  for (let i = 0; i < L.length; i++) {
    const tt = i / SR, w = 1 + 0.4 * wobA * Math.exp(-tt / 0.7) * Math.sin(TAU * 8.5 * tt), h = i < hit.length ? hit[i] : 0;
    L[i] = Math.tanh(0.55 * L[i] * w + h); R[i] = Math.tanh(0.55 * R[i] * w + h);
  }
  filt(L, [['lp', 9000, 0.7]]); filt(R, [['lp', 9000, 0.7]]);
  outSt(L, R, t, { gain: 0.62, pan: P(p, 0), room: 0.2, hall: 0.35 });
});
sfx('whiff', 'fx', 'a swing that misses: fast air swish. dur (0.22), pan', (t, p) => {
  const d = p.dur ?? 0.22, f = new SVF(), f2 = new SVF();
  const b = gen(d, (tt) => { const u = tt / d, s = Math.sin(Math.PI * u); f.run(white(), 380 * Math.pow(4, s), 1.4); f2.run(f.bp, 380 * Math.pow(4, s) * 1.2, 1.2); return f2.bp * s * s * 2.2; });
  const [L, R] = autoPan(b, (u) => lerp(0.5, -0.5, u) + (p.pan ?? 0));
  outSt(L, R, t, { gain: 0.8, room: 0.08 });
});
sfx('creak', 'fx', 'stick-slip creak (door hinge, or a metal creak). dur (0.9), f0 -> f1 (slip rate Hz), tone (wood|metal), pan', (t, p) => {
  const d = p.dur ?? 0.9, f0 = p.f0 ?? 70, f1 = p.f1 ?? 150, metal = p.tone === 'metal';
  const RES = metal ? [[880, 30, 1], [1710, 34, 0.7], [3050, 22, 0.35]] : [[640, 9, 1], [1260, 11, 0.7], [2280, 7, 0.4]];
  const fs = RES.map(() => new SVF());
  let ph = 0, amp = 0;
  const b = gen(d + 0.1, (tt) => {
    const u = clamp(tt / d, 0, 1), r = f0 * Math.pow(f1 / f0, u) * (1 + 0.25 * Math.sin(TAU * 3.1 * tt));
    ph += r / SR; let x = 0;
    if (ph >= 1) { ph -= 1 + rand(-0.12, 0.12); amp = rand(0.5, 1); x = amp; }
    let y = 0; for (let k = 0; k < fs.length; k++) { fs[k].run(x, RES[k][0] * (1 + 0.05 * u), RES[k][1]); y += fs[k].bp * RES[k][2]; }
    return y * adsr(tt, 0.08, 0.1, 0.9, 0.12, d);
  });
  out(normPeak(b, 1), t, { gain: 0.5, pan: P(p, 0.2), room: 0.2, hall: 0.15 });
});
sfx('doorclang', 'hit', 'heavy armoured door slam: low boom, steel-plate ring, rattle, then the lock click (+lock s). pan', (t, p) => {
  const th = sweepSine(0), bpb = new SVF(), cr = new SVF();
  const plate = partials(150, [[1, 1, 0.9], [1.73, 0.75, 0.7], [2.41, 0.6, 0.55], [3.3, 0.45, 0.42], [4.6, 0.35, 0.3], [6.2, 0.2, 0.2], [8.1, 0.12, 0.12]], 2.2, 0.001);
  const b = gen(2.2, (tt, i) => { bpb.run(white(), 240, 1); cr.run(white(), 2400, 0.8);
    return Math.tanh(1.5 * (th(60 + 40 * Math.exp(-tt / 0.03)) * perc(tt, 0.001, 0.25) * 0.75 + bpb.bp * perc(tt, 0.001, 0.09) * 2.0 + cr.bp * perc(tt, 0.0005, 0.005) * 1.8 + plate[i] * 0.95)); });
  filt(b, [['lp', 8000, 0.7]]);
  out(b, t, { gain: 0.85, pan: P(p, 0), room: 0.25, hall: 0.3 });
  [0.07, 0.13, 0.2].forEach((d, k) => out(partials(rand(320, 520), [[1, 1, 0.05], [2.3, 0.5, 0.03], [3.9, 0.3, 0.015]], 0.2, 0.0005), t + d, { gain: 0.2 / (k + 1), pan: rand(-0.3, 0.3), room: 0.2 }));
  const lk = t + (p.lock ?? 0.32);
  [0, 0.028].forEach((d, k) => { const bp = new SVF(); const c = partials(2350, [[1, 1, 0.03], [1.6, 0.6, 0.015]], 0.12, 0.0003); for (let i = 0; i < c.length; i++) { bp.run(white(), 3600, 2); c[i] += bp.bp * Math.exp(-i / (SR * 0.002)) * 1.5; } out(c, lk + d, { gain: k ? 0.32 : 0.24, pan: 0.15, room: 0.2 }); });
  out(nburst(0.05, 600, 1.5, 0.0005, 0.008, 1.2), lk + 0.028, { gain: 0.3, pan: 0.15 });
});
sfx('hatch', 'fx', 'armoured-door hatch slide "shk" (open), or shut with a clack (shut: true). pan', (t, p) => {
  const shut = !!p.shut, d = 0.14, f1 = new SVF(), f2 = new SVF();
  const b = gen(d + 0.02, (tt) => { const u = tt / d; f1.run(white(), (shut ? 2600 : 1600) * (shut ? 1 - 0.3 * u : 1 + 0.4 * u), 3); f2.run(white(), 3600, 4); return (f1.bp + 0.6 * f2.bp) * Math.sin(Math.PI * Math.min(1, u)) ** 0.7 * 1.6; });
  out(b, t, { gain: 0.32, pan: P(p, 0.1), room: 0.2 });
  if (shut || p.clack) {
    const c = partials(880, [[1, 1, 0.05], [2.4, 0.6, 0.03], [3.8, 0.35, 0.015]], 0.2, 0.0004), bp = new SVF();
    for (let i = 0; i < SR * 0.01; i++) { bp.run(white(), 3000, 1.2); c[i] += bp.bp * Math.exp(-i / (SR * 0.002)) * 1.2; }
    out(c, t + d * 0.9, { gain: 0.38, pan: P(p, 0.1), room: 0.2 });
  }
});

// ── code lock ──
sfx('beep', 'fx', 'keypad beep. pitch (MIDI, 88), dur (0.09), soft (quiet sneaky beep), pan', (t, p) => {
  const f = mtof(p.pitch ?? 88), d = p.dur ?? 0.09, os = new Osc(0), sq = new Osc(0), lp = new OnePole(p.soft ? 2500 : 5000);
  const b = gen(d + 0.05, (tt) => (os.sin(f) * 0.75 + lp.lp(sq.pulse(f)) * (p.soft ? 0.08 : 0.32)) * adsr(tt, 0.002, 0.03, 0.75, 0.03, d));
  out(b, t, { gain: p.soft ? 0.17 : 0.34, pan: P(p, 0.15), room: 0.15 });
});
sfx('buzz', 'fx', 'error buzz "ERRT". dur (0.34), small (a quiet ominous bzzt), pan', (t, p) => {
  const d = p.dur ?? (p.small ? 0.16 : 0.34), o1 = new Osc(), o2 = new Osc(), f = new SVF(), pk = new Biquad('peak', 900, 1.1, 8), hp = new Biquad('hp', 220, 0.7);
  const b = gen(d + 0.04, (tt) => hp.run(pk.run(f.run(o1.saw(104) + o2.pulse(110.5, 0.4) * 0.8, 3000, 0.8))) * (1 - 0.25 * (0.5 + 0.5 * Math.sin(TAU * 50 * tt))) * adsr(tt, 0.003, 0.02, 0.9, 0.03, d));
  out(b, t, { gain: p.small ? 0.1 : 0.2, pan: P(p, 0.15), room: 0.12 });
});
sfx('chirp', 'fx', 'success two-tone chirp (up). pitch (MIDI of the first tone, 88)', (t, p) => {
  const m = p.pitch ?? 88;
  [[0, 0.08, m], [0.09, 0.14, m + 7]].forEach(([d, l, mm]) => { const os = new Osc(0), sq = new Osc(0), lp = new OnePole(4500), f = mtof(mm); out(gen(l + 0.05, (tt) => (os.sin(f) * 0.8 + lp.lp(sq.pulse(f)) * 0.22) * adsr(tt, 0.002, 0.03, 0.8, 0.04, l)), t + d, { gain: 0.32, pan: P(p, 0.15), room: 0.15, hall: 0.1 }); });
});
sfx('zap', 'hit', 'code-lock ZAP: electric crackle + buzz on each flash; size small|big|mega (mega adds thunder). flashes [s after t], pan', (t, p) => {
  const size = p.size ?? 'small', big = size !== 'small', mega = size === 'mega';
  const fl = p.flashes ?? (mega ? [0, 0.65] : big ? [0, 0.5] : [0, 0.3]);
  const d = p.dur ?? (mega ? 1.7 : big ? 1.05 : 0.62);
  const [L, R] = gen2(d + 0.1, (side) => {
    const bp = new SVF(), hp = new OnePole(900), lp = new SVF(), o1 = new Osc(), o2 = new Osc(), bf = new SVF(), pew = sweepSine();
    let c = 0;
    return (tt) => {
      let e = 0, ep = 0, last = 0;
      for (const f of fl) { const u = tt - f; if (u >= 0) { last = f; e = Math.max(e, perc(u, 0.002, mega ? 0.35 : big ? 0.25 : 0.14)); ep = Math.max(ep, perc(u, 0.0005, 0.03)); } }
      const sus = (mega ? 0.35 : big ? 0.25 : 0.12) * adsr(tt, 0.01, 0.1, 1, 0.12, d - 0.12);
      const lvl = Math.max(e, sus);
      if (rnd() < (300 + 900 * lvl) / SR) c = rand(0.4, 1) * (rnd() < 0.5 ? -1 : 1);
      c *= 0.82;
      bp.run(c + white() * 0.12 * lvl, 2600 + side * 300, 0.8);
      const crackle = hp.hp(bp.bp) * lvl * 2.6;
      const fl30 = 0.55 + 0.45 * Math.sin(TAU * 31 * tt);
      const buzz = bf.run(o1.saw(120) * 0.7 + o2.saw(241) * 0.4, 2400, 0.9) * lvl * fl30 * (big ? 1.2 : 0.8);
      const arc = pew(400 + 2200 * Math.exp(-(tt - last) / 0.025)) * ep * 0.5;
      return lp.run(crackle + buzz + arc, 7000, 0.7);
    };
  });
  for (let i = 0; i < L.length; i++) { L[i] = Math.tanh(1.4 * L[i]); R[i] = Math.tanh(1.4 * R[i]); }
  outSt(L, R, t, { gain: mega ? 0.95 : big ? 0.8 : 0.6, pan: P(p, 0.1), room: 0.15, hall: mega ? 0.3 : 0.15 });
  if (mega) { // thunder: a crack, then a long rolling rumble
    const [tL, tR] = gen2(3.4, () => { const lp = new SVF(), cr = new SVF(), rl = wob([1.3, 2.1, 3.7]), s = sweepSine(); return (tt) => { lp.run(white(), 260 + 200 * rl(tt), 0.8); cr.run(white(), 1800, 0.7); return Math.tanh(1.6 * (lp.lp * 3.2 * adsr(tt, 0.06, 0.4, 0.6, 2.4, 0.5) * (0.5 + rl(tt)) + cr.bp * perc(tt, 0.001, 0.05) * 1.5 + s(48) * perc(tt, 0.01, 0.4) * 0.8)); }; });
    outSt(tL, tR, t + 0.08, { gain: 0.75, room: 0.1, hall: 0.4 });
  }
});
sfx('hiss', 'soft', 'smoke hiss. dur (1.0), pan', (t, p) => {
  const d = p.dur ?? 1.0, bp = new SVF(), g = wob([5, 9]);
  out(gen(d + 0.05, (tt) => { bp.run(white(), 2600 - 900 * tt / d, 0.7); return bp.bp * adsr(tt, 0.06, 0.15, 0.6, d * 0.6, d * 0.35) * (0.7 + 0.3 * g(tt)); }), t, { gain: 0.42, pan: P(p, 0.1), room: 0.15, hall: 0.15 });
});

// ── guns and explosives ──
sfx('scrape', 'fx', 'eoka strike: gritty rock-on-metal scrape + spark fizzle. dur (0.16), fizz (0..1), pan', (t, p) => {
  const d = p.dur ?? 0.16, fz = p.fizz ?? 1, f1 = new SVF(), f2 = new SVF(), gr = new OnePole(250);
  let g = 0;
  const b = gen(d + 0.03, (tt) => { if (rnd() < 600 / SR) g = rand(0.3, 1); g = gr.lp(g * 0.999 + 0.0005); const x = white() * (0.4 + 2.5 * g); f1.run(x, 2100 + 900 * tt / d, 2); f2.run(x, 4200, 3); return (f1.bp + 0.5 * f2.bp) * adsr(tt, 0.006, 0.03, 0.85, 0.025, d); });
  filt(b, [['lp', 7500, 0.7]]);
  out(b, t, { gain: 0.4, pan: P(p, -0.2), room: 0.1 });
  if (fz > 0) {
    for (let k = 0; k < Math.round(16 * fz); k++) { const tt = Math.pow(rnd(), 1.6) * 0.38; out(partials(rand(3000, 6000), [[1, 1, rand(0.002, 0.006)], [1.4, 0.5, 0.002]], 0.03, 0.0002), t + 0.03 + tt, { gain: rand(0.05, 0.12) * fz * (1 - tt * 1.8), pan: clamp(P(p, -0.2) + rand(-0.5, 0.5), -1, 1), room: 0.12 }); }
    const hp = new Biquad('hp', 3500, 0.7), lp = new Biquad('lp', 8000, 0.7);
    out(gen(0.4, (tt) => lp.run(hp.run(white())) * perc(tt, 0.01, 0.1)), t + 0.02, { gain: 0.05 * fz, pan: P(p, -0.2) });
  }
});
sfx('click', 'fx', 'dry eoka "click" (nothing happens). pan', (t, p) => {
  [0, 0.007].forEach((d, k) => { const c = partials(2100, [[1, 1, 0.008], [1.76, 0.6, 0.004], [3.1, 0.3, 0.002]], 0.04, 0.0002); out(c, t + d, { gain: k ? 0.95 : 0.7, pan: P(p, -0.2), room: 0.1 }); });
  out(nburst(0.03, 620, 1.5, 0.0005, 0.006, 1), t, { gain: 0.8, pan: P(p, -0.2) });
});
sfx('tick', 'soft', 'tiny high ticks (a wristwatch). n (2), gap (0.25), pan', (t, p) => {
  for (let k = 0; k < (p.n ?? 2); k++) out(partials(3300, [[1, 1, 0.004], [1.9, 0.5, 0.002], [0.45, 0.4, 0.004]], 0.03, 0.0002), t + k * (p.gap ?? 0.25), { gain: 0.32, pan: P(p, 0.3), room: 0.1 });
});
sfx('eokabang', 'hit', 'eoka BANG: a dry crack with a pipe ring and a puff of smoke. pan', (t, p) => {
  const hp = new Biquad('hp', 1100, 0.7), bp = new Biquad('bp', 1150, 0.7), bp2 = new Biquad('bp', 520, 1), s = sweepSine(0), lp1 = new Biquad('lp', 10000, 0.7), hpo = new Biquad('hp', 90, 0.7);
  const b = gen(0.6, (tt) => hpo.run(lp1.run(Math.tanh(2.0 * (hp.run(white()) * Math.exp(-tt / 0.004) * 2.0 + bp.run(white()) * Math.exp(-tt / 0.03) * 2.4 + bp2.run(white()) * perc(tt, 0.001, 0.035) * 2.2 + s(70 + 90 * Math.exp(-tt / 0.015)) * perc(tt, 0.0008, 0.045) * 0.55)) * 0.95)));
  out(b, t, { gain: 1.0, pan: P(p, -0.15), room: 0.18, hall: 0.2 });
  out(partials(1180, [[1, 1, 0.45], [2.03, 0.5, 0.3], [3.1, 0.3, 0.18], [4.25, 0.15, 0.1]], 1.6, 0.001), t + 0.002, { gain: 0.09, pan: P(p, -0.15), room: 0.15, hall: 0.25 });
  const lp = new OnePole(700); out(gen(0.4, (tt) => lp.lp(white()) * perc(tt, 0.02, 0.12)), t + 0.01, { gain: 0.2, pan: P(p, -0.15) });
  const ec = new OnePole(1400); out(b.map((x) => ec.lp(x)), t + 0.21, { gain: 0.16, pan: -P(p, -0.15), hall: 0.2 });
});
sfx('ping', 'fx', 'ricochet PING "pyeeew" off metal. pan (start), dir', (t, p) => {
  const s = sweepSine(), d = 0.5, vph = rand(0, TAU);
  const b = gen(d + 0.05, (tt) => s(3300 * Math.pow(0.36, Math.pow(tt / d, 0.7)) * (1 + 0.006 * Math.sin(TAU * 35 * tt + vph))) * perc(tt, 0.002, 0.18) * 0.8);
  const hitb = partials(2650, [[1, 1, 0.06], [1.48, 0.6, 0.04], [2.2, 0.4, 0.02]], 0.2, 0.0003);
  for (let i = 0; i < hitb.length; i++) b[i] += hitb[i] * 0.7;
  const st = P(p, 0.4), dir = p.dir ?? 1, [L, R] = autoPan(b, (u) => st + dir * 0.5 * u);
  outSt(L, R, t, { gain: 0.36, room: 0.15, hall: 0.25 });
});
sfx('rack', 'fx', 'AK charging-handle rack "shk-CHAK". pan', (t, p) => {
  const pn = P(p, 0), f = new SVF();
  out(gen(0.07, (tt) => { f.run(white(), 2600, 2.2); return f.bp * Math.sin(Math.PI * tt / 0.07) * 1.4; }), t, { gain: 0.32, pan: pn, room: 0.12 });
  out(partials(1900, [[1, 1, 0.02], [2.3, 0.6, 0.012]], 0.08, 0.0003), t, { gain: 0.22, pan: pn });
  [0.15, 0.163].forEach((d, k) => {
    const c = partials(1450, [[1, 1, 0.028], [2.31, 0.7, 0.018], [3.7, 0.45, 0.01], [5.2, 0.2, 0.006]], 0.15, 0.0003), bp = new SVF(), lp = new SVF();
    for (let i = 0; i < c.length; i++) { const tt = i / SR; bp.run(white(), 3100, 1.5); lp.run(white(), 320, 1.2); c[i] = Math.tanh(1.3 * (c[i] + bp.bp * Math.exp(-tt / 0.003) * 1.4 + lp.bp * perc(tt, 0.001, 0.015) * 1.5)); }
    out(c, t + d, { gain: k ? 0.5 : 0.38, pan: pn, room: 0.15, hall: 0.05 });
  });
});
sfx('akbang', 'hit', 'AK BANG with outdoor echo. pan', (t, p) => {
  const hp = new Biquad('hp', 900, 0.7), bp = new Biquad('bp', 1250, 0.6), bp2 = new Biquad('bp', 450, 0.9), s = sweepSine(0), lp1 = new Biquad('lp', 10500, 0.7), lp2 = new Biquad('lp', 10500, 0.7), hpo = new Biquad('hp', 60, 0.7);
  const b = gen(0.9, (tt) => hpo.run(lp2.run(lp1.run(Math.tanh(1.9 * (hp.run(white()) * Math.exp(-tt / 0.005) * 1.8 + bp.run(white()) * Math.exp(-tt / 0.06) * 2.2 + bp2.run(white()) * perc(tt, 0.001, 0.07) * 2.4 + s(55 + 95 * Math.exp(-tt / 0.02)) * perc(tt, 0.0008, 0.08) * 0.75)) * 0.92))));
  out(b, t, { gain: 1.15, pan: P(p, 0), room: 0.2, hall: 0.55 });
  const lp = new OnePole(1500), echo = b.map((x) => lp.lp(x));
  out(echo, t + 0.34, { gain: 0.22, pan: -0.55, hall: 0.4 });
  out(echo, t + 0.72, { gain: 0.11, pan: 0.55, hall: 0.4 });
  out(echo, t + 1.15, { gain: 0.05, pan: -0.3, hall: 0.4 });
});
/** Motor whine (minigun barrel) f(u) -> Hz over dur, with the barrel rattle. */
function whineBuf(dur, fAt, ampAt) {
  const o1 = new Osc(), s = sweepSine(), bp = new SVF(), rb = new SVF();
  let ph = 0;
  return gen(dur, (tt) => { const u = tt / dur, f = fAt(u); ph += f / 6 / SR; let c = 0; if (ph >= 1) { ph -= 1; c = 1; } rb.run(c, 2100, 6); bp.run(o1.saw(f), f * 3, 2);
    return (s(f) * 0.5 + bp.bp * 0.5 + rb.bp * 1.2) * ampAt(u); });
}
sfx('minigun', 'hit', 'heli minigun. mode brrrt (fire for dur, spinning up `pre` s before t) | spinup | spindown. dur, pre, far (0..1), pan', (t, p) => {
  const mode = p.mode ?? 'brrrt', far = p.far ?? 0, pn = P(p, 0.2), d = p.dur ?? (mode === 'spindown' ? 1.0 : mode === 'spinup' ? 0.7 : 0.6);
  const lpf = lerp(9000, 2200, far);
  if (mode === 'spinup' || mode === 'brrrt') {
    const pre = mode === 'brrrt' ? p.pre ?? 0.25 : d, w = whineBuf(pre + (mode === 'brrrt' ? d : 0) + 0.05, (u) => 140 * Math.pow(7, Math.min(1, u * (mode === 'brrrt' ? (pre + d) / pre : 1))), (u) => smooth(u * 3) * 0.9);
    filt(w, [['lp', lpf, 0.7]]);
    out(w, t - (mode === 'brrrt' ? pre : 0), { gain: 0.32, pan: pn, room: 0.1 });
  }
  if (mode === 'brrrt') {
    const L = newBuf(d + 0.3), R = newBuf(d + 0.3);
    for (let tt = 0, k = 0; tt < d; tt += 1 / 46 * rand(0.92, 1.08), k++) {
      const hp = new OnePole(1200), bp = new SVF(), s = sweepSine(0), a = rand(0.7, 1);
      const r = gen(0.06, (x) => { bp.run(white(), 800, 0.9); return Math.tanh(2.2 * (hp.hp(white()) * Math.exp(-x / 0.002) * 1.5 + bp.bp * Math.exp(-x / 0.014) * 2.2 + s(140) * perc(x, 0.0005, 0.012) * 0.5)) * a; });
      const i0 = sec2n(tt), sp = rand(-0.15, 0.15);
      for (let i = 0; i < r.length && i0 + i < L.length; i++) { L[i0 + i] += r[i] * (1 - sp); R[i0 + i] += r[i] * (1 + sp); }
    }
    filt(L, [['lp', lpf, 0.7]]); filt(R, [['lp', lpf, 0.7]]);
    outSt(L, R, t, { gain: lerp(0.55, 0.35, far), pan: pn, room: 0.15, hall: 0.2 + 0.3 * far });
    p = { ...p, mode: 'spindown', dur: 0.7 }; t += d;
  }
  if (p.mode === 'spindown') {
    const sd = p.dur ?? 1.0, w = whineBuf(sd, (u) => 980 * Math.pow(0.12, u), (u) => (1 - u) * 0.9);
    filt(w, [['lp', lpf, 0.7]]);
    out(w, t, { gain: 0.32, pan: pn, room: 0.1 });
  }
});
sfx('rocket', 'fx', 'rocket launch whooshes. n (4), gap (0.09 s), pan', (t, p) => {
  for (let k = 0; k < (p.n ?? 4); k++) {
    const d = 0.8, bp = new SVF(), hp = new OnePole(2500), s = sweepSine(), dir = k % 2 ? 1 : -1;
    const b = gen(d + 0.05, (tt) => { const u = tt / d; bp.run(white() * (1 + 0.6 * white()), 1000 * Math.pow(0.4, u), 0.8); return Math.tanh(1.5 * (bp.bp * 2.2 * adsr(tt, 0.01, 0.1, 0.8, d * 0.6, d * 0.35) + hp.hp(white()) * perc(tt, 0.001, 0.03) * 1.2 + s(1500 * Math.pow(0.5, u)) * 0.08 * (1 - u))); });
    const [L, R] = autoPan(b, (u) => clamp(P(p, 0) + dir * 0.7 * u, -1, 1));
    outSt(L, R, t + k * (p.gap ?? 0.09), { gain: 0.36, room: 0.12, hall: 0.2 });
  }
});
sfx('boom', 'hit', 'explosion BOOM: sub thump + mid crunch + crack + debris rumble. size far|mid|big, pan', (t, p) => {
  const size = p.size ?? 'big', far = size === 'far', mid = size === 'mid';
  const [L, R] = gen2(far ? 2.4 : 2.8, () => {
    const s = sweepSine(0), lp = new SVF(), cr = new Biquad('hp', 1200, 0.7), rum = new SVF(), mid = new SVF(), hpo = new Biquad('hp', 38, 0.7), att = far ? 0.012 : 0.002;
    return (tt) => { lp.run(white(), 1600 * Math.exp(-tt / 0.35) + 300, 0.7); rum.run(white(), 260, 0.8); mid.run(white(), 650, 0.8);
      const x = s(40 + 50 * Math.exp(-tt / 0.05)) * perc(tt, att, 0.3) * 0.9 + lp.lp * perc(tt, att, 0.25) * 3.6 + mid.bp * perc(tt, att, 0.14) * 3.0 + (far ? 0 : cr.run(white()) * perc(tt, 0.0005, 0.006) * 1.6) + rum.lp * adsr(tt, 0.05, 0.3, 0.5, 1.6, 0.4) * 2.4;
      return hpo.run(Math.tanh(1.7 * x)); };
  });
  if (far || mid) { filt(L, [['lp', far ? 900 : 2500, 0.7]]); filt(R, [['lp', far ? 900 : 2500, 0.7]]); }
  outSt(L, R, t, { gain: far ? 0.38 : mid ? 0.62 : 0.95, pan: P(p, far ? -0.5 : 0), room: 0.15, hall: far ? 0.55 : 0.35 });
  if (!far) for (let k = 0; k < 9; k++) out(partials(rand(600, 2400), [[1, 1, 0.01], [2.2, 0.4, 0.005]], 0.05, 0.0004), t + rand(0.35, 1.5), { gain: rand(0.02, 0.06), pan: rand(-0.7, 0.7), room: 0.2 });
});
sfx('arming', 'fx', 'rocket-arming beeps: accelerating and rising. n (6), dur (0.5)', (t, p) => {
  const n = p.n ?? 6, d = p.dur ?? 0.5;
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1), tk = t + d * (1 - Math.pow(1 - u, 1.6)) * 0.9, f = mtof(84 + 9 * u), os = new Osc(0), lp = new OnePole(4000);
    out(gen(0.08, (tt) => lp.lp(os.pulse(f, 0.5)) * adsr(tt, 0.002, 0.01, 0.8, 0.015, 0.04)), tk, { gain: 0.16, pan: P(p, 0.2), room: 0.1 });
  }
});

// ── helicopter ──
sfx('scan', 'fx', 'rising scanner sweep with a scan-line flicker. dur (1.4), pan', (t, p) => {
  const d = p.dur ?? 1.4, os = new Osc(), s = sweepSine(), f = new SVF();
  const b = gen(d + 0.05, (tt) => { const u = clamp(tt / d, 0, 1), fr = 420 * Math.pow(5.2, u); const am = 0.6 + 0.4 * Math.sin(TAU * 16 * tt); return f.run(os.tri(fr) * 0.7 + s(fr / 2) * 0.4, fr * 3, 1.2) * am * adsr(tt, 0.05, 0.1, 1, 0.08, d); });
  out(b, t, { gain: 0.24, pan: P(p, 0.05), room: 0.15, hall: 0.15 });
});
sfx('nottarget', 'fx', 'dismissive two-tone "not a target" (high -> low, the low one sags). pitch (MIDI, 81)', (t, p) => {
  const m = p.pitch ?? 81;
  [[0, 0.13, m, 0], [0.16, 0.3, m - 7, -1.5]].forEach(([d, l, mm, bend]) => { const os = new Osc(), f = new SVF(); out(gen(l + 0.06, (tt) => f.run(os.pulse(mtof(mm + bend * smooth((tt - l * 0.4) / (l * 0.6))), 0.3), 2800, 0.8) * adsr(tt, 0.004, 0.04, 0.75, 0.05, l)), t + d, { gain: 0.24, pan: P(p, 0.05), room: 0.15, hall: 0.1 }); });
});
sfx('lockon', 'fx', 'fast lock-on beeps accelerating into a held tone. dur (0.5), pitch (MIDI 95)', (t, p) => {
  const d = p.dur ?? 0.5, f = mtof(p.pitch ?? 95);
  let tt = 0, k = 0;
  while (tt < d - 0.12) { const os = new Osc(0), lp = new OnePole(5000); out(gen(0.05, (x) => lp.lp(os.pulse(f, 0.5)) * adsr(x, 0.002, 0.005, 0.8, 0.01, 0.025)), t + tt, { gain: 0.14, pan: P(p, 0.1) }); tt += lerp(0.075, 0.035, tt / d); k++; }
  const os = new Osc(0), lp = new OnePole(5000);
  out(gen(0.2, (x) => lp.lp(os.pulse(f, 0.5)) * adsr(x, 0.003, 0.01, 0.8, 0.04, 0.14)), t + tt, { gain: 0.15, pan: P(p, 0.1) });
});
sfx('heliwhoosh', 'fx', 'heli swings round: big Doppler air whoosh with rotor chop. dur (0.9), dir (+1 L->R), pan', (t, p) => {
  const d = p.dur ?? 0.9, dir = p.dir ?? 1, f = new SVF(), lo = new SVF();
  let ph = 0;
  const b = gen(d, (tt) => { const u = tt / d, s = Math.sin(Math.PI * u); const fc = 300 * Math.pow(3.2, s) * (u < 0.5 ? 1 : lerp(1, 0.7, (u - 0.5) * 2)); f.run(white(), fc, 0.8); ph += (7 + 4 * s) / SR; const chop = 0.5 + 0.5 * Math.pow(Math.abs(Math.sin(Math.PI * ph)), 4); lo.run(white(), 260, 1); return (f.bp * 1.8 + lo.bp * 2.5 * chop) * Math.pow(s, 1.5); });
  const [L, R] = autoPan(b, (u) => clamp(P(p, 0) + dir * lerp(-0.7, 0.7, u), -1, 1));
  outSt(L, R, t, { gain: 0.42, room: 0.12, hall: 0.15 });
});
sfx('whir', 'fx', 'heli turbine whir rising. dur (1.0), pan', (t, p) => {
  const d = p.dur ?? 1.0, s = sweepSine(), os = new Osc(), lp = new SVF(), bp = new SVF();
  const b = gen(d + 0.1, (tt) => { const u = clamp(tt / d, 0, 1), f = 900 * Math.pow(2.1, u); bp.run(white(), f * 1.5, 3); return (s(f) * 0.5 + lp.run(os.saw(f / 2), f * 2, 0.8) * 0.35 + bp.bp * 0.4) * adsr(tt, 0.2, 0.1, 1, 0.1, d) * (0.4 + 0.6 * u); });
  out(b, t, { gain: 0.2, pan: P(p, 0.3), room: 0.1, hall: 0.1 });
});
sfx('clunk', 'fx', 'heavy relay "ka-CHUNK" (searchlight on), with a short electric hum. pan', (t, p) => {
  const pn = P(p, 0.1);
  out(partials(2400, [[1, 1, 0.006], [1.7, 0.5, 0.003]], 0.03, 0.0002), t, { gain: 0.2, pan: pn });
  const th = sweepSine(0), c = partials(720, [[1, 1, 0.06], [2.2, 0.5, 0.035], [3.6, 0.25, 0.02]], 0.3, 0.0005);
  out(gen(0.3, (tt, i) => Math.tanh(1.5 * (c[i] + th(130 * (1 + 0.4 * Math.exp(-tt / 0.01))) * perc(tt, 0.001, 0.05) * 1.3))), t + 0.035, { gain: 0.5, pan: pn, room: 0.15, hall: 0.1 });
  const os = new Osc(), lp = new OnePole(900);
  out(gen(0.35, (tt) => lp.lp(os.saw(100 + 25 * smooth(tt / 0.15))) * adsr(tt, 0.03, 0.05, 0.6, 0.15, 0.15)), t + 0.06, { gain: 0.12, pan: pn });
});

// ── creatures ──
sfx('oink', 'fx', 'boar oinks: nasal grunts. n (2), pitch (1), pan', (t, p) => {
  const pf = p.pitch ?? 1;
  for (let k = 0; k < (p.n ?? 2); k++) {
    const d = rand(0.13, 0.18), os = new Osc(), b1 = new SVF(), b2 = new SVF(), lp = new SVF(), f0 = rand(170, 200) * pf;
    const b = gen(d + 0.04, (tt) => { const u = tt / d; const f = f0 * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, u * 1.2))) * (1 + 0.03 * white()); const x = os.pulse(f, 0.22) * (0.8 + 0.4 * rnd()); b1.run(x, 680, 3); b2.run(x, 1650, 4); return lp.run(b1.bp * 1.2 + b2.bp * 0.6, 3000, 0.7) * adsr(tt, 0.012, 0.03, 0.85, 0.04, d); });
    out(b, t + k * 0.24, { gain: 0.42, pan: P(p, -0.3), room: 0.12 });
  }
});
sfx('trot', 'soft', 'hoof steps: trot (pairs) or gallop (triplets). dur (1.0), gallop (bool), rate (patterns/s), pan', (t, p) => {
  const d = p.dur ?? 1.0, gal = !!p.gallop, per = 1 / (p.rate ?? (gal ? 3.2 : 4)), offs = gal ? [0, 0.07, 0.14] : [0, 0.09];
  for (let tt = 0; tt < d; tt += per) offs.forEach((o, k) => {
    const s = sweepSine(0), c = partials(rand(800, 1050), [[1, 1, 0.015], [2.4, 0.4, 0.008]], 0.06, 0.0004), dirt = new SVF();
    const b = gen(0.06, (x, i) => { dirt.run(white(), 2000, 1); return c[i] * 0.8 + s(150) * perc(x, 0.001, 0.02) * 0.8 + dirt.bp * perc(x, 0.0005, 0.008) * 0.6; });
    out(b, t + tt + o + rand(-0.006, 0.006), { gain: (k === offs.length - 1 ? 0.42 : 0.3) * rand(0.8, 1), pan: P(p, 0) + lerp(-0.2, 0.2, tt / d), room: 0.1 });
  });
});
sfx('cluck', 'soft', 'chicken clucks "buk-buk-buk-BAAK". n (4), pan', (t, p) => {
  const n = p.n ?? 4;
  for (let k = 0; k < n; k++) {
    const last = k === n - 1, d = last ? 0.18 : rand(0.05, 0.07), os = new Osc(), b1 = new SVF(), b2 = new SVF(), f0 = last ? 560 : rand(380, 440);
    const b = gen(d + 0.03, (tt) => { const u = tt / d; const x = os.pulse(f0 * (1 + (last ? 0.3 * Math.sin(Math.PI * u) : -0.15 * u)), 0.25); b1.run(x, 1250, 3); b2.run(x, 2600, 4); return (b1.bp + 0.6 * b2.bp) * adsr(tt, 0.005, 0.02, 0.8, 0.02, d); });
    out(b, t + k * rand(0.13, 0.17), { gain: 0.3, pan: P(p, 0.3), room: 0.12 });
  }
});
sfx('squawk', 'fx', 'chicken squawk + wing flaps + feather flutter. pan', (t, p) => {
  const d = 0.38, os = new Osc(), b1 = new SVF(), b2 = new SVF(), pn = P(p, 0.3);
  const b = gen(d + 0.04, (tt) => { const u = tt / d; const f = 680 * (1 + 0.6 * Math.sin(Math.PI * Math.min(1, u * 1.4)) - 0.2 * u) * (1 + 0.04 * white()); const x = os.pulse(f, 0.2) * (0.7 + 0.6 * rnd()); b1.run(x, 1500, 2.5); b2.run(x, 3000, 3); return (b1.bp + 0.7 * b2.bp) * adsr(tt, 0.01, 0.05, 0.8, 0.06, d); });
  filt(b, [['lp', 6000, 0.7]]);
  out(b, t, { gain: 0.42, pan: pn, room: 0.15 });
  for (let k = 0; k < 6; k++) { const lp = new SVF(); out(gen(0.08, (tt) => { lp.run(white(), 700, 0.8); return lp.lp * perc(tt, 0.006, 0.025) * 2; }), t + 0.05 + k * 0.07, { gain: 0.2, pan: clamp(pn + rand(-0.3, 0.3), -1, 1), room: 0.1 }); }
  const hp = new OnePole(3000); out(gen(0.6, (tt) => hp.hp(white()) * (0.5 + 0.5 * Math.sin(TAU * 24 * tt)) * perc(tt, 0.02, 0.2)), t + 0.08, { gain: 0.06, pan: pn });
});
sfx('crow', 'fx', 'rooster crow "er-er-er-errrr" (buzzy nasal bird). pan', (t, p) => {
  const SEG = [[0, 0.09, 640], [0.12, 0.09, 820], [0.24, 0.1, 900], [0.37, 0.36, 1000]], os = new Osc(), b1 = new SVF(), b2 = new SVF();
  const b = gen(0.8, (tt) => {
    const sgi = SEG.findIndex(([a, l]) => tt >= a && tt < a + l); if (sgi < 0) { os.step(500); return 0; }
    const [a, l, f0] = SEG[sgi], u = (tt - a) / l, f = f0 * (sgi === 3 ? 1 + 0.12 * Math.sin(Math.PI * Math.min(1, u * 2)) - 0.25 * smooth((u - 0.5) * 2) : 1 + 0.1 * u) * (1 + 0.02 * Math.sin(TAU * 7 * tt));
    const x = os.pulse(f, 0.25) * (0.85 + 0.3 * rnd()); b1.run(x, 1100, 2.5); b2.run(x, 2500, 3.5);
    return (b1.bp + 0.6 * b2.bp) * Math.sin(Math.PI * Math.min(1, u)) ** 0.5;
  });
  filt(b, [['lp', 6000, 0.7]]);
  out(b, t, { gain: 0.26, pan: P(p, 0.25), room: 0.15, hall: 0.35 });
});
sfx('steps', 'soft', 'footsteps every `every` s for dur: kind boot (heavy boots) | heavy | run | bare. n overrides dur. pan', (t, p) => {
  const kind = p.kind ?? 'boot', ev = p.every ?? (kind === 'run' ? 0.16 : BEAT), n = p.n ?? Math.max(1, Math.round((p.dur ?? 1) / ev));
  for (let k = 0; k < n; k++) {
    const s = sweepSine(0), bp = new SVF(), gr = new SVF(), heavy = kind === 'heavy' || kind === 'boot', run = kind === 'run';
    const b = gen(0.25, (tt) => { bp.run(white(), heavy ? 850 : 1300, 1); gr.run(white(), 2600, 1.2);
      return Math.tanh(1.4 * (s((heavy ? 95 : 130) * (1 + 0.4 * Math.exp(-tt / 0.01))) * perc(tt, 0.002, heavy ? 0.05 : 0.03) * (heavy ? 0.9 : 0.6) + bp.bp * perc(tt, 0.002, heavy ? 0.045 : 0.025) * 2.4 + gr.bp * perc(tt, 0.003, run ? 0.03 : 0.025) * (kind === 'bare' ? 0 : 1.0))); });
    out(b, t + k * ev + rand(-0.005, 0.005), { gain: (kind === 'heavy' ? 0.5 : kind === 'boot' ? 0.45 : run ? 0.24 : 0.18) * rand(0.85, 1), pan: P(p, 0) + (k % 2 ? 0.06 : -0.06), room: 0.14, hall: kind === 'heavy' ? 0.15 : 0.04 });
  }
});
sfx('tiptoe', 'soft', 'tiptoe plucks: two-note pizzicato steps every `every` s (0.25) for dur. key (section key), pan', (t, p) => {
  const T = tonicAt(p, t, 5), ev = p.every ?? BEAT / 2, n = p.n ?? Math.max(1, Math.round((p.dur ?? 1.5) / ev) + 1);
  for (let k = 0; k < n; k++) pizz(t + k * ev, T + (k % 2 ? 7 : 0) - (k % 4 === 3 ? 2 : 0), { gain: 0.6, decay: 0.12, bright: 0.65, pan: P(p, 0) + (k % 2 ? 0.15 : -0.15), room: 0.1, hall: 0.05 });
});

// ── character gestures (all instrumental: the series has no voices) ──
sfx('snore', 'fx', 'rhythmic snoring on the beat: a buzzy reed rattle in, a soft flute "fwee-oo" out. dur, period (1.0 s), pitch (1), pan', (t, p) => {
  const per = p.period ?? 1.0, d = p.dur ?? 2, pf = p.pitch ?? 1, pn = P(p, -0.25);
  for (let c = 0; c * per < d - 0.2; c++) {
    const t0 = t + c * per, li = per * 0.42, os = new Osc(), os2 = new Osc(), bp = new SVF(), lp = new SVF(), nb = new SVF();
    const b = gen(li + 0.05, (tt) => { const u = tt / li, f = (78 + 18 * u) * pf; const fl = Math.pow(0.5 + 0.5 * Math.sin(TAU * 31 * tt), 2); const x = (os.saw(f) * 0.7 + os2.pulse(f * 2.01, 0.3) * 0.3) * (0.35 + 0.65 * fl); bp.run(x, 620, 1.4); lp.run(x, 1400, 0.7); nb.run(white(), 1100, 1); return (bp.bp * 1.4 + lp.lp * 0.5 + nb.bp * 0.25 * fl) * Math.sin(Math.PI * Math.min(1, u)) ** 0.8; });
    out(b, t0, { gain: 0.6, pan: pn, room: 0.12 });
    mono(t0 + per * 0.5, [[0, 0.05, 80 + 12 * Math.log2(pf)], [0.05, per * 0.33, 73 + 12 * Math.log2(pf), 0.7, per * 0.28]], { timbre: 'flute', gain: 0.14, breath: 0.35, vib: 0, pan: pn, room: 0.12, hall: 0.1, attack: 0.06, release: 0.12 });
  }
});
sfx('yawn', 'fx', 'instrumental yawn: a trombone sliding up then sagging down, wide vibrato. key, pan', (t, p) => {
  const m = tonicAt(p, t, 4), wah = (tt) => 450 + 1500 * Math.sin(Math.PI * clamp(tt / 1.2, 0, 1)) ** 1.5;
  mono(t, [[0, 0.22, m], [0.22, 0.5, m + 5, 1, 0.38], [0.72, 0.55, m - 5, 0.55, 0.5]], { timbre: 'mutetp', wah, gain: 0.42, vib: 45, vibRate: 4.6, vibDelay: 0.3, attack: 0.12, release: 0.2, pan: P(p, 0), room: 0.15, hall: 0.15 });
});
sfx('sigh', 'fx', 'instrumental sigh: a breathy flute falling away + a puff of air. mood relief | tired | sad, double (two sighs: flute + bassoon), key, pan', (t, p) => {
  const mood = p.mood ?? 'relief', m = tonicAt(p, t, 5) + (mood === 'sad' ? -5 : 0), d = mood === 'relief' ? 0.55 : 0.8, pn = P(p, 0);
  mono(t, [[0, 0.06, m + 2], [0.06, d, m - (mood === 'relief' ? 5 : 8), 0.55, d * 0.85]], { timbre: 'flute', gain: 0.26, breath: 0.3, vib: 0, attack: 0.05, release: 0.2, pan: pn, room: 0.15, hall: 0.2 });
  if (p.double) mono(t + 0.07, [[0, 0.06, m - 10], [0.06, d, m - 15, 0.55, d * 0.85]], { timbre: 'bassoon', gain: 0.22, vib: 0, attack: 0.05, release: 0.2, pan: -pn - 0.3, room: 0.15, hall: 0.15 });
  const lp = new SVF(); out(gen(d + 0.2, (tt) => { lp.run(white(), 1300 - 500 * tt / d, 0.6); return lp.lp * adsr(tt, 0.08, 0.1, 0.6, d * 0.6, d * 0.4); }), t, { gain: 0.12, pan: pn });
});
sfx('munch', 'fx', 'cartoon munching: crunchy chews with a cheek "mf". dur (1.2), rate (chews/s, 4), pan', (t, p) => {
  const d = p.dur ?? 1.2, rate = p.rate ?? 4;
  for (let tt = 0; tt < d - 0.05; tt += (1 / rate) * rand(0.85, 1.15)) {
    const bp = new SVF(), md = new SVF(), s = sweepSine(0), l = rand(0.06, 0.09);
    const b = gen(l + 0.03, (x) => { bp.run(white() * (rnd() < 0.25 ? 2.5 : 0.6), 1500 + rand(-200, 200), 1.3); md.run(white(), 600, 1); return bp.bp * adsr(x, 0.004, 0.02, 0.7, 0.02, l) + md.bp * perc(x, 0.003, 0.02) * 0.8 + s(170) * perc(x, 0.004, 0.025) * 0.4; });
    out(b, t + tt, { gain: 0.85 * rand(0.75, 1), pan: P(p, -0.2), room: 0.1 });
  }
});
sfx('canpop', 'fx', 'tin can opening: tab click, pressure hiss and a pop. pan', (t, p) => {
  const pn = P(p, 0.15);
  out(partials(3200, [[1, 1, 0.01], [1.6, 0.6, 0.006]], 0.05, 0.0002), t, { gain: 0.45, pan: pn, room: 0.1 });
  const hp = new Biquad('hp', 3000, 0.7), lp = new Biquad('lp', 8000, 0.7); out(gen(0.25, (tt) => lp.run(hp.run(white())) * perc(tt, 0.003, 0.06)), t + 0.01, { gain: 0.22, pan: pn });
  const s = sweepSine(); out(gen(0.06, (tt) => s(420 + 600 * smooth(tt / 0.02)) * perc(tt, 0.001, 0.018)), t + 0.012, { gain: 0.55, pan: pn, room: 0.12 });
  out(partials(2150, [[1, 1, 0.15], [2.4, 0.4, 0.06]], 0.6, 0.0005), t + 0.012, { gain: 0.06, pan: pn, hall: 0.2 });
});
sfx('clink', 'soft', 'spoon on a tin can: small metallic clinks. n (1), every (s, 0.5), pitch (1), pan', (t, p) => {
  for (let k = 0; k < (p.n ?? 1); k++) out(partials(2600 * (p.pitch ?? 1) * rand(0.97, 1.03), [[1, 1, 0.12], [2.42, 0.45, 0.05], [3.9, 0.25, 0.02]], 0.5, 0.0004), t + k * (p.every ?? BEAT), { gain: 0.16, pan: P(p, 0.25), room: 0.12, hall: 0.1 });
});
sfx('clatter', 'fx', 'something tossed clattering to a stop: kind can (tin) | wood (the eoka on gravel). n (bounces, 4), pan', (t, p) => {
  const can = (p.kind ?? 'can') === 'can', n = p.n ?? 4, pn = P(p, -0.3);
  let dt = 0;
  for (let k = 0; k < n; k++) {
    const g = Math.pow(0.7, k), f = can ? rand(950, 1250) : rand(500, 700);
    const c = partials(f, can ? [[1, 1, 0.07], [2.31, 0.6, 0.05], [3.7, 0.4, 0.03], [5.2, 0.2, 0.015]] : [[1, 1, 0.03], [2.6, 0.4, 0.015]], 0.4, 0.0004), bp = new SVF();
    for (let i = 0; i < SR * 0.012; i++) { bp.run(white(), can ? 3000 : 1500, 1); c[i] += bp.bp * Math.exp(-i / (SR * 0.002)) * (can ? 0.8 : 1.4); }
    out(c, t + dt, { gain: (can ? 0.3 : 0.4) * g, pan: pn + k * 0.05, room: 0.15 });
    if (!can) { const d2 = new SVF(); out(gen(0.06, (x) => { d2.run(white(), 2200, 1); return d2.bp * perc(x, 0.001, 0.015); }), t + dt, { gain: 0.25 * g, pan: pn }); }
    dt += (can ? 0.13 : 0.1) * Math.pow(0.78, k);
  }
  if (can) { const bp = new SVF(); out(gen(0.35, (x) => { bp.run(white() * (rnd() < 0.1 ? 1 : 0.1), 2500, 2); return bp.bp * (1 - x / 0.35); }), t + dt, { gain: 0.12, pan: pn }); }
});

// ── cartoon ──
sfx('sting', 'music', '"!" pizzicato sting: a sharp tense pizz cluster + xylophone plink + low "dun". key', (t, p) => {
  const R = tonicAt(p, t, 3);
  [R, R + 6, R + 12, R + 13, R + 18].forEach((m, j) => pizz(t + j * 0.004, m, { gain: 0.34, decay: 0.4, bright: 0.8, pan: -0.4 + j * 0.2, room: 0.15, hall: 0.2 }));
  xylo(t, R + 36, { gain: 0.2, pan: 0.2 }); xylo(t + 0.06, R + 37, { gain: 0.12, pan: 0.3 });
  timpani(t, R - 12, { gain: 0.14, decay: 0.6 });
});
sfx('pop', 'soft', 'bubble pop (speech bubble, flower, a music note). pitch (1), pan', (t, p) => {
  const pf = p.pitch ?? 1, s = sweepSine();
  out(gen(0.14, (tt) => s((320 + 1000 * smooth(tt / 0.022)) * pf) * perc(tt, 0.001, 0.032) + (tt < 0.0015 ? white() * 0.4 : 0)), t, { gain: 0.6, pan: P(p, rand(-0.25, 0.25)), room: 0.12, hall: 0.05 });
});
sfx('boing', 'fx', 'cartoon spring boing. pitch (1), dur (0.7), pan', (t, p) => {
  const pf = p.pitch ?? 1, d = p.dur ?? 0.7, s1 = sweepSine();
  const bp = new SVF();
  const b = gen(d, (tt) => { const f = 230 * pf * (1 + 0.5 * (1 - Math.exp(-tt / 0.1))) * (1 + 0.3 * Math.exp(-tt / 0.2) * Math.sin(TAU * 13 * tt)); const y = Math.tanh(2.2 * s1(f)); bp.run(y, f * 4, 2); return (y * 0.7 + bp.bp * 0.8) * perc(tt, 0.004, d * 0.34); });
  out(b, t, { gain: 0.5, pan: P(p, 0), room: 0.15 });
});
sfx('slide', 'fx', 'slide whistle. from -> to (MIDI), dur, shape glide | huh (down-up "huh?") | wiggle, fade (gets quieter, flying away), pan', (t, p) => {
  const a = p.from ?? 84, z = p.to ?? 67, d = p.dur ?? 0.5, sh = p.shape ?? 'glide';
  let notes;
  if (sh === 'huh') notes = [[0, 0.04, a], [0.04, 0.14, a - 3, 1, 0.12], [0.18, d - 0.18, z, 1, d - 0.2]];
  else if (sh === 'wiggle') notes = [[0, 0.03, a], [0.03, d * 0.3, z, 1, d * 0.28], [0.03 + d * 0.3, d * 0.3, a, 1, d * 0.28], [0.03 + d * 0.6, d * 0.37, z, 1, d * 0.35]];
  else notes = [[0, 0.03, a], [0.03, d - 0.03, z, p.fade ? 0.25 : 1, d - 0.04]];
  mono(t, notes, { timbre: 'whistle', vib: 0, gain: 0.2, pan: P(p, 0), room: 0.1, hall: p.fade ? 0.4 : 0.15, attack: 0.02, release: 0.06, glide: 0.02 });
});
sfx('ding', 'fx', 'lightbulb ding (bright bell + a fifth echo). pan', (t, p) => {
  out(partials(mtof(96), [[1, 1, 0.55], [2.0, 0.3, 0.25], [3.0, 0.15, 0.12], [4.2, 0.1, 0.06]], 2.2, 0.001), t, { gain: 0.24, pan: P(p, 0.1), room: 0.2, hall: 0.3 });
  out(partials(mtof(103), [[1, 1, 0.4], [2.0, 0.2, 0.15]], 1.6, 0.001), t + 0.06, { gain: 0.12, pan: P(p, 0.1) + 0.2, room: 0.2, hall: 0.3 });
});
sfx('sparkle', 'soft', 'sparkle chime: a rising glockenspiel twinkle + shimmer. key', (t, p) => {
  const T = majorAt(p, t, 6);
  [0, 4, 7, 11, 14, 19].forEach((x, k) => glock(t + k * 0.045, T + x, { gain: 0.16 - k * 0.012, pan: k % 2 ? 0.45 : -0.45, decay: 0.7, hall: 0.5 }));
  const hp = new OnePole(6500); out(gen(0.5, (tt) => hp.hp(rnd() < 0.03 ? white() : 0) * Math.sin(Math.PI * tt / 0.5)), t, { gain: 0.1, hall: 0.4 });
});
sfx('shootingstar', 'fx', 'shooting-star whoosh: a falling whistle across the sky + glittery trail. dur (0.9), dir', (t, p) => {
  const d = p.dur ?? 0.9, s = sweepSine(), f = new SVF(), dir = p.dir ?? 1;
  const b = gen(d + 0.05, (tt) => { const u = clamp(tt / d, 0, 1); f.run(white(), 5000 * Math.pow(0.3, u), 2); return (s(2900 * Math.pow(0.45, u)) * 0.4 + f.bp * 0.8) * Math.sin(Math.PI * u) ** 0.8; });
  const [L, R] = autoPan(b, (u) => dir * lerp(-0.8, 0.8, u));
  outSt(L, R, t, { gain: 0.38, room: 0.15, hall: 0.45 });
  [91, 88, 86, 84, 81].forEach((m, k) => glock(t + 0.15 + k * 0.1, m + 12, { gain: 0.08, pan: dir * lerp(-0.6, 0.8, k / 4), decay: 0.6, hall: 0.6 }));
});
sfx('kiss', 'fx', 'cartoon kiss chirp: a smack + a quick rising chirp. pan', (t, p) => {
  out(nburst(0.03, 2100, 2, 0.0004, 0.003, 1.5), t, { gain: 0.3, pan: P(p, 0) });
  const s = sweepSine(); out(gen(0.12, (tt) => s(900 * Math.pow(2.6, smooth(tt / 0.07))) * adsr(tt, 0.004, 0.02, 0.8, 0.03, 0.07)), t + 0.012, { gain: 0.24, pan: P(p, 0), room: 0.15, hall: 0.15 });
  glock(t + 0.06, 100, { gain: 0.04, pan: P(p, 0) + 0.2, hall: 0.4 });
});
sfx('love', 'fx', 'heart / love chime: harp glissando up a maj7 + warm celesta chord + shimmer. key', (t, p) => {
  const T = majorAt(p, t, 4);
  [0, 4, 7, 11, 12, 16, 19, 23].forEach((x, k) => harp(t + k * 0.04, T + 12 + x, { gain: 0.42, pan: -0.5 + k * 0.13, hall: 0.4 }));
  [12, 16, 19, 23].forEach((x, k) => celesta(t + 0.32 + k * 0.01, T + 24 + x, { gain: 0.24, pan: k % 2 ? 0.3 : -0.3, hall: 0.5 }));
  glock(t + 0.3, T + 36, { gain: 0.08, hall: 0.5 });
});
sfx('heartbeat', 'fx', 'heartbeat thumps (lub-dub) at bpm for dur, getting louder. dur (1.5), bpm (100)', (t, p) => {
  const d = p.dur ?? 1.5, per = 60 / (p.bpm ?? 100);
  for (let tt = 0; tt < d - 1e-6; tt += per) heart(t + tt, { gain: 0.6 * (0.7 + 0.3 * tt / d), pitch: 1.1 });
});
sfx('whoosh', 'soft', 'air whoosh (swing, toss, dash, clothes flying). dur (0.35), pitch (1), dir, shape swing | rise (a wind-up that swells into the next hit), pan', (t, p) => {
  const d = p.dur ?? 0.35, pf = p.pitch ?? 1, dir = p.dir ?? (rnd() < 0.5 ? -1 : 1), f = new SVF(), f2 = new SVF(), rise = p.shape === 'rise';
  const b = gen(d, (tt) => { const u = tt / d, s = rise ? Math.pow(u, 1.6) * Math.min(1, (1 - u) * 12) : Math.sin(Math.PI * u); f.run(white(), 330 * pf * Math.pow(6, rise ? u : s), 1.1); f2.run(f.bp, 330 * pf * Math.pow(6, rise ? u : s) * 1.25, 0.9); return f2.bp * s * s * 1.7; });
  const [L, R] = autoPan(b, (u) => clamp(P(p, 0) + dir * lerp(-0.55, 0.55, u), -1, 1));
  outSt(L, R, t, { gain: rise ? 0.8 : 0.55, room: 0.1 });
});
sfx('zip', 'fx', 'zipper "zzzrip". dur (0.32), pan', (t, p) => {
  const d = p.dur ?? 0.32, bp = new SVF(), bp2 = new SVF();
  let ph = 0;
  const b = gen(d + 0.02, (tt) => { const u = clamp(tt / d, 0, 1); ph += (70 * Math.pow(3.4, u)) / SR; let c = 0; if (ph >= 1) { ph -= 1; c = rand(0.6, 1); } bp.run(c, 2700 + 1300 * u, 3); bp2.run(c, 5200, 3); return (bp.bp + 0.4 * bp2.bp) * adsr(tt, 0.01, 0.05, 1, 0.02, d); });
  out(normPeak(b, 1), t, { gain: 0.55, pan: P(p, 0), room: 0.1 });
});
sfx('fwump', 'soft', 'soft cloth "fwump" (a hat going on). pan', (t, p) => {
  const lp = new SVF(), s = sweepSine(0);
  out(gen(0.2, (tt) => { lp.run(white(), 750, 0.7); return lp.bp * perc(tt, 0.012, 0.05) * 3 + s(150) * perc(tt, 0.006, 0.04) * 0.4; }), t, { gain: 0.6, pan: P(p, 0), room: 0.1 });
});
sfx('swish', 'soft', 'cloth swish (pulling on pants). dur (0.25), pan', (t, p) => {
  const d = p.dur ?? 0.25, bp = new SVF();
  out(gen(d, (tt) => { const u = tt / d; bp.run(white(), 1300 + 900 * u, 0.8); return bp.bp * Math.sin(Math.PI * u) ** 2 * 1.4; }), t, { gain: 0.55, pan: P(p, 0), room: 0.08 });
});
sfx('thud', 'fx', 'body / object thud on the ground. weight (1), pan', (t, p) => {
  const w = p.weight ?? 1, s = sweepSine(0), lp = new OnePole(380), bp = new SVF();
  out(gen(0.5, (tt) => { bp.run(white(), 480, 1); return Math.tanh(1.5 * (s((55 + 80 * Math.exp(-tt / 0.03)) / Math.sqrt(w)) * perc(tt, 0.002, 0.09 * w) * 0.75 + lp.lp(white()) * perc(tt, 0.001, 0.03) * 1.0 + bp.bp * perc(tt, 0.001, 0.04) * 2.8)); }), t, { gain: 0.7 * Math.min(1.3, w), pan: P(p, 0), room: 0.12 });
});
sfx('faceplant', 'fx', 'faceplant: a thud + a dull slap + a dust puff. pan', (t, p) => {
  SFX.thud(t, { weight: 1.1, pan: p.pan });
  out(nburst(0.08, 720, 1.2, 0.0006, 0.022, 2), t + 0.005, { gain: 0.5, pan: P(p, 0), room: 0.1 });
  const lp = new OnePole(1500); out(gen(0.35, (tt) => lp.lp(white()) * perc(tt, 0.02, 0.1)), t + 0.02, { gain: 0.1, pan: P(p, 0) });
});
sfx('rimshot', 'music', 'rimshot "ba-dum-TSS": t is the TSS. lead (s before t for ba, 0.25; 0 = only dum-TSS), pan', (t, p) => {
  const lead = p.lead ?? 0.25;
  if (lead > 0) { snare(t - lead, { gain: 0.24, decay: 0.08 }); tom(t - lead, 62, { gain: 0.25, decay: 0.15 }); }
  tom(t - Math.max(lead, 0.25) / 2, 55, { gain: 0.36, decay: 0.2 }); kick(t - Math.max(lead, 0.25) / 2, { gain: 0.18 });
  rim(t, { gain: 0.45 }); snare(t, { gain: 0.3 }); kick(t, { gain: 0.2 }); cymbal(t, { gain: 0.28, decay: 1.6, room: 0.2 });
});
sfx('bwomp', 'music', 'deflating tuba "bwomp": a low note that sags and wobbles away. note (MIDI, default the key\'s 5th below), dur (0.7)', (t, p) => {
  const m = p.note ?? tonicAt(p, t, 3) + 7, d = p.dur ?? 0.7;
  mono(t, [[0, 0.12, m], [0.12, d - 0.12, m - 8, 0.85, d - 0.15]], { timbre: 'trombone', bright: 1.3, gain: 0.34, vib: 45, vibRate: 7, vibDelay: 0.15, room: 0.12, hall: 0.15 });
  mono(t, [[0, 0.12, m - 12], [0.12, d - 0.12, m - 20, 0.85, d - 0.15]], { timbre: 'tuba', gain: 0.22, vib: 45, vibRate: 7, vibDelay: 0.15, room: 0.12 });
});
sfx('heh', 'music', 'smug muted-trumpet "heh-heh" (harmon mute wah). key', (t, p) => {
  const T = tonicAt(p, t, 4) + 7;
  const wah = (tt) => 700 + 1600 * Math.min(smooth(tt / 0.05), 1) * (tt < 0.12 ? 1 : 0.6);
  mono(t, [[0, 0.09, T, 1], [0.13, 0.17, T - 3, 0.8]], { timbre: 'mutetp', gain: 0.24, wah: (tt) => (tt < 0.13 ? wah(tt) : wah(tt - 0.13)), room: 0.12, hall: 0.12 });
});
sfx('aah', 'music', 'short heavenly synth-choir "aah" chord (a halo), with a glockenspiel glint. key, dur (0.9)', (t, p) => {
  const T = majorAt(p, t, 4), d = p.dur ?? 0.9;
  choir(t, [T, T + 4, T + 7, T + 12, T + 16], d, { gain: 0.5, attack: 0.08, release: 0.7, voices: 3, hall: 0.6 });
  glock(t + 0.05, T + 31, { gain: 0.05, hall: 0.6 });
});
sfx('crack', 'soft', 'knuckle cracks. n (3), gap (0.16), pan', (t, p) => {
  for (let k = 0; k < (p.n ?? 3); k++) {
    const t0 = t + k * (p.gap ?? 0.16);
    for (let j = 0; j < 4; j++) out(partials(rand(2400, 4400), [[1, 1, 0.0015], [1.5, 0.6, 0.001]], 0.01, 0.0001), t0 + j * rand(0.002, 0.005), { gain: rand(0.25, 0.4), pan: P(p, 0.1), room: 0.1 });
    out(gen(0.03, (tt) => Math.sin(TAU * 520 * tt) * perc(tt, 0.0005, 0.006)), t0, { gain: 0.3, pan: P(p, 0.1) });
  }
});
sfx('puff', 'soft', 'dusting / blowing puffs: soft air bursts with a cloth pat. n (1), gap (0.3), pan', (t, p) => {
  for (let k = 0; k < (p.n ?? 1); k++) {
    const lp = new SVF(), lp2 = new OnePole(380);
    out(gen(0.3, (tt) => { lp.run(white(), 1100, 0.7); return lp.lp * perc(tt, 0.008, 0.08) * 2 + lp2.lp(white()) * perc(tt, 0.001, 0.012) * 1.2; }), t + k * (p.gap ?? 0.3) + rand(-0.02, 0.02), { gain: 0.7, pan: P(p, 0) + rand(-0.2, 0.2), room: 0.12 });
  }
});
sfx('boop', 'soft', 'soft round "boop" (a pat on the rock, a head pat). pitch (MIDI, default the key\'s 5th), pan', (t, p) => {
  const m = p.pitch ?? tonicAt(p, t, 5) + 7, s = sweepSine();
  out(gen(0.2, (tt) => { const y = s(mtof(m) * (1 + 0.12 * Math.exp(-tt / 0.02))); return (y + 0.15 * y * y) * perc(tt, 0.003, 0.06); }), t, { gain: 0.34, pan: P(p, 0), room: 0.15, hall: 0.1 });
});
sfx('chime', 'fx', 'warm chime: mood aww (falling celesta + harp + a soft swell) | ooh (rising glock + shimmer). key', (t, p) => {
  const T = majorAt(p, t, 5);
  if ((p.mood ?? 'aww') === 'aww') {
    [19, 16, 11, 7].forEach((x, k) => celesta(t + k * 0.09, T + x, { gain: 0.1, pan: 0.3 - k * 0.2, hall: 0.5 }));
    [0, 4, 7, 11].forEach((x, k) => harp(t + k * 0.03, T - 12 + x, { gain: 0.06, hall: 0.4 }));
    pad(t, 0.6, [T - 12, T - 8, T - 5, T - 1], { gain: 0.03, attack: 0.2, release: 0.8, cut: 2000, hall: 0.4 });
  } else {
    [0, 4, 7, 12, 16].forEach((x, k) => glock(t + k * 0.06, T + x, { gain: 0.08, pan: -0.4 + k * 0.2, hall: 0.5 }));
    choir(t, [T - 12, T - 8, T - 5], 0.4, { gain: 0.25, attack: 0.1, release: 0.6, vowel: 'oo', hall: 0.5 });
  }
});
sfx('tink', 'soft', 'tiny metallic ting (eye glint, sunglasses, a rock tap). pitch (MIDI 100), ring (1), glint (adds a shimmer), pan', (t, p) => {
  const m = p.pitch ?? 100, r = p.ring ?? 1;
  out(partials(mtof(m), [[1, 1, 0.35 * r], [2.76, 0.3, 0.1 * r], [5.4, 0.12, 0.04]], 1.4 * r, 0.0005), t, { gain: 0.16, pan: P(p, 0.1), room: 0.15, hall: 0.35 });
  if (p.glint) { const f = new SVF(); out(gen(0.15, (tt) => { f.run(white(), 3000 * Math.pow(3, tt / 0.15), 3); return f.bp * Math.sin(Math.PI * tt / 0.15); }), t - 0.05, { gain: 0.08, pan: P(p, 0.1), hall: 0.4 }); }
});
sfx('respawn', 'fx', 'soft respawn chime: a rising celesta arpeggio over an airy swell. key', (t, p) => {
  const T = majorAt(p, t, 4);
  [0, 7, 12, 16, 19, 24].forEach((x, k) => celesta(t + k * 0.08, T + x, { gain: 0.09, pan: -0.4 + k * 0.16, hall: 0.5 }));
  choir(t, [T, T + 7, T + 12], 0.3, { gain: 0.14, attack: 0.2, release: 0.45, vowel: 'oo', hall: 0.6 });
});
sfx('clap', 'fx', 'a single palm clap / handshake slap. pan', (t, p) => {
  clap(t, { gain: 1.0, pan: P(p, 0), room: 0.18, f: 1300 });
  const bp = new SVF(); out(gen(0.06, (tt) => { bp.run(white(), 700, 1); return bp.bp * perc(tt, 0.0008, 0.012) * 3; }), t, { gain: 0.45, pan: P(p, 0) });
});
sfx('dun', 'music', 'low "dun": mood sly (pizz + bassoon, a sly slide up) | tense (low brass + timpani). key, note', (t, p) => {
  const R = p.note ?? tonicAt(p, t, 2);
  if ((p.mood ?? 'sly') === 'sly') { pizz(t, R, { gain: 0.5, decay: 0.5, bright: 0.5 }); mono(t, [[0, 0.06, R + 10], [0.06, 0.32, R + 12, 1, 0.05]], { timbre: 'bassoon', gain: 0.38, room: 0.12, hall: 0.1 }); }
  else { brass(t, [R + 12, R + 19, R + 24], 0.35, { gain: 0.34, bright: 1.1, attack: 0.008, release: 0.4, hall: 0.3 }); piano(t, R, { gain: 0.08, decay: 1.5 }); piano(t, R + 12, { gain: 0.08, decay: 1.5 }); timpani(t, R, { gain: 0.3, decay: 1.0 }); }
});
sfx('wobble', 'soft', 'trembling wobble: a quivering flexatone-like tone (a shaky hand). dur (0.8), pitch (MIDI 79), pan', (t, p) => {
  const d = p.dur ?? 0.8, f0 = mtof(p.pitch ?? 79), s = sweepSine(), vph = rand(0, TAU);
  out(gen(d + 0.05, (tt) => { const y = s(f0 * Math.pow(2, (55 * Math.sin(TAU * 11 * tt + vph)) / 1200)); return (y + 0.12 * y * y * y) * Math.sin(Math.PI * Math.min(1, tt / d)) * (0.8 + 0.2 * Math.sin(TAU * 11 * tt)); }), t, { gain: 0.24, pan: P(p, 0), room: 0.15, hall: 0.2 });
});
sfx('squeak', 'soft', 'snot-bubble squeak: a rubbery inflate then a little deflate. dur (0.7), pan', (t, p) => {
  const d = p.dur ?? 0.7, s = sweepSine();
  out(gen(d + 0.05, (tt) => { const u = tt / d; const f = u < 0.65 ? lerp(480, 1250, smooth(u / 0.65)) : lerp(1250, 600, smooth((u - 0.65) / 0.35)); const y = s(f * (1 + 0.02 * Math.sin(TAU * 30 * tt))); return y * Math.sin(Math.PI * Math.min(1, u)) * (0.7 + 0.3 * Math.sin(TAU * 23 * tt)); }), t, { gain: 0.22, pan: P(p, -0.2), room: 0.15, hall: 0.2 });
});
sfx('rub', 'soft', 'hands rubbing (back and forth). dur (0.6), rate (7), pan', (t, p) => {
  const d = p.dur ?? 0.6, r = p.rate ?? 7, bp = new SVF();
  out(gen(d + 0.03, (tt) => { bp.run(white(), 1700, 0.8); return bp.bp * (0.3 + 0.7 * Math.abs(Math.sin(Math.PI * r * tt))) * adsr(tt, 0.04, 0.05, 1, 0.05, d); }), t, { gain: 0.3, pan: P(p, -0.1), room: 0.1 });
});
sfx('grab', 'soft', 'a quick grab: swish + a solid closing "tock". pan', (t, p) => {
  const bp = new SVF(); out(gen(0.07, (tt) => { bp.run(white(), 1200, 1); return bp.bp * Math.sin(Math.PI * tt / 0.07) * 1.5; }), t - 0.05, { gain: 0.25, pan: P(p, 0) });
  out(partials(520, [[1, 1, 0.025], [2.1, 0.4, 0.012]], 0.12, 0.0005), t, { gain: 0.42, pan: P(p, 0), room: 0.12 });
});
sfx('bonk', 'fx', 'cartoon bonk: a woodblock knock + a falling "boink" (metal: on a facemask, adds a small ring). pan', (t, p) => {
  out(partials(880, [[1, 1, 0.05], [2.42, 0.5, 0.025], [3.9, 0.25, 0.012]], 0.3, 0.0005), t, { gain: 0.55, pan: P(p, 0), room: 0.1 });
  const s = sweepSine(); out(gen(0.4, (tt) => s(640 * Math.pow(0.3, smooth(tt / 0.3))) * perc(tt, 0.003, 0.14)), t + 0.01, { gain: 0.36, pan: P(p, 0), room: 0.1 });
  if (p.metal) out(partials(1400, [[1, 1, 0.35], [1.47, 0.6, 0.25], [2.09, 0.4, 0.15]], 1.2, 0.0005), t, { gain: 0.1, pan: P(p, 0), room: 0.15, hall: 0.2 });
});
sfx('clack', 'fx', 'metallic gun-handling clack (picking up / setting down a rifle). pan', (t, p) => {
  [0, 0.035].forEach((d, k) => { const c = partials(k ? 2900 : 1600, [[1, 1, 0.03], [1.9, 0.5, 0.015], [3.1, 0.25, 0.008]], 0.12, 0.0003), bp = new SVF(); for (let i = 0; i < SR * 0.02; i++) { bp.run(white(), 450, 1.2); c[i] += bp.bp * Math.exp(-i / (SR * 0.008)) * 1.2; } out(c, t + d, { gain: k ? 0.3 : 0.42, pan: P(p, 0), room: 0.15 }); });
});
sfx('pat', 'soft', 'a muffled pat on the ground (sad). pan', (t, p) => {
  const lp = new OnePole(450), s = sweepSine(0), bp = new SVF();
  out(gen(0.12, (tt) => { bp.run(white(), 650, 1); return lp.lp(white()) * perc(tt, 0.002, 0.025) * 1.2 + bp.bp * perc(tt, 0.002, 0.03) * 2.4 + s(150) * perc(tt, 0.002, 0.025) * 0.4; }), t, { gain: 0.5, pan: P(p, -0.2), room: 0.1 });
});
sfx('sling', 'soft', 'gun slung onto a back: strap swish + metal jingle + a thump. pan', (t, p) => {
  const bp = new SVF(), pn = P(p, 0.1);
  out(gen(0.22, (tt) => { bp.run(white(), 1500, 0.9); return bp.bp * Math.sin(Math.PI * tt / 0.22) ** 2 * 1.4; }), t, { gain: 0.6, pan: pn });
  [0.08, 0.15].forEach((d) => out(partials(rand(2500, 3800), [[1, 1, 0.04], [1.5, 0.5, 0.02]], 0.12, 0.0004), t + d, { gain: 0.2, pan: pn, room: 0.15 }));
  const bq = new SVF(); out(gen(0.08, (tt) => { bq.run(white(), 500, 1); return bq.bp * perc(tt, 0.002, 0.02) * 3; }), t + 0.27, { gain: 0.5, pan: pn });
});
sfx('pip', 'soft', 'tiny cute blip (a peek); q: rising like a "?". pitch (MIDI 91), pan', (t, p) => {
  const m = p.pitch ?? 91, s = sweepSine();
  out(gen(p.q ? 0.16 : 0.08, (tt) => s(mtof(m) * (p.q ? Math.pow(2, (4 * smooth(tt / 0.12)) / 12) : 1)) * adsr(tt, 0.003, 0.02, 0.8, 0.02, p.q ? 0.12 : 0.05)), t, { gain: 0.4, pan: P(p, 0.2), room: 0.12, hall: 0.1 });
});
sfx('blow', 'soft', 'blowing into the barrel: a breathy hollow pipe tone. dur (0.45), pitch (MIDI 67), pan', (t, p) => {
  const d = p.dur ?? 0.45, f = mtof(p.pitch ?? 67), r = new SVF(), br = new SVF();
  out(gen(d + 0.1, (tt) => { const x = white(); r.run(x, f, 25); br.run(x, 1500, 0.7); return (r.bp * 2.2 + br.bp * 0.35) * adsr(tt, 0.05, 0.05, 0.9, 0.12, d); }), t, { gain: 0.85, pan: P(p, -0.1), room: 0.15 });
});
sfx('yelp', 'fx', 'instrumental yelps: squeaky-toy up-glides "eep!". n (3), gap (0.4), pitch (MIDI 84), pan', (t, p) => {
  for (let k = 0; k < (p.n ?? 3); k++) { const m = (p.pitch ?? 84) + rand(-1, 2); mono(t + k * (p.gap ?? 0.4), [[0, 0.02, m], [0.02, 0.11, m + 7, 1, 0.08], [0.13, 0.05, m + 4, 0.7, 0.04]], { timbre: 'whistle', vib: 0, gain: 0.15, pan: P(p, 0) + rand(-0.3, 0.3), room: 0.1, attack: 0.008, release: 0.04 }); }
});
sfx('grr', 'music', 'low brass growl (flutter-tongue tuba) "grrr". dur (0.6), key', (t, p) => {
  const m = tonicAt(p, t, 2), d = p.dur ?? 0.6, os = new Osc(), os2 = new Osc(), lp = new SVF();
  const pk = new Biquad('peak', 750, 1, 8), hp = new Biquad('hp', 150, 0.7);
  out(gen(d + 0.1, (tt) => hp.run(pk.run(lp.run((os.saw(mtof(m + 12)) + os2.saw(mtof(m) * 1.006)) * 0.5, 1100 + 900 * tt / d, 1.1))) * (0.45 + 0.55 * Math.abs(Math.sin(Math.PI * 27 * tt))) * adsr(tt, 0.05, 0.1, 1, 0.08, d) * (0.6 + 0.4 * tt / d)), t, { gain: 0.36, room: 0.15, hall: 0.15 });
});
sfx('twinkle', 'soft', 'high "ting-ting-ting" twinkles (KO stars), repeating for dur. dur (0.3)', (t, p) => {
  const d = p.dur ?? 0.3;
  for (let tt = 0, k = 0; tt < d; tt += 0.45, k++) [[98, 0], [105, 0.07], [110, 0.14]].forEach(([m, o], j) => out(partials(mtof(m + (k % 2 ? 2 : 0)), [[1, 1, 0.35], [2.76, 0.2, 0.08]], 1.2, 0.001), t + tt + o, { gain: 0.11 - j * 0.02, pan: Math.sin(k * 2 + j) * 0.6, room: 0.2, hall: 0.55 }));
});
sfx('tweets', 'fx', 'cartoon KO birds: "tweet-tweet" chirps circling the head (auto-pan). dur (1.5)', (t, p) => {
  const d = p.dur ?? 1.5;
  for (let tt = 0, k = 0; tt < d - 0.15; tt += 0.32, k++) {
    const s = sweepSine(), f0 = rand(2400, 2900);
    const b = gen(0.2, (x) => { const kk = x < 0.07 ? 0 : x > 0.1 && x < 0.17 ? 1 : -1; if (kk < 0) return 0; const u = (x - kk * 0.1) / 0.07; return s(f0 * (1 + 0.35 * u) * (kk ? 1.08 : 1)) * Math.sin(Math.PI * u); });
    out(b, t + tt, { gain: 0.08, pan: Math.sin(TAU * 0.8 * tt) * 0.75, room: 0.15, hall: 0.3 });
  }
  if (p.twinkle !== false) SFX.twinkle(t + 0.2, { dur: d * 0.7 });
});
sfx('piano', 'music', 'one high piano note ringing in the silence. note (MIDI 94)', (t, p) => piano(t, p.note ?? 94, { gain: 0.05, decay: 2.6, hall: 0.55 }));
sfx('stab', 'music', 'orchestral stab: mood zap (dissonant cluster) | triumph (major chord + timpani + cymbal) | shock. key', (t, p) => {
  const mood = p.mood ?? 'zap', R = mood === 'triumph' ? majorAt(p, t, 3) : tonicAt(p, t, 3);
  if (mood === 'triumph') {
    brass(t, [R, R + 4, R + 7, R + 12, R + 16, R + 19], 0.5, { gain: 0.36, bright: 1.5, attack: 0.008, release: 0.5, hall: 0.3 });
    timpani(t, R - 12, { gain: 0.22 }); cymbal(t, { gain: 0.18, decay: 1.5 }); kick(t, { gain: 0.2 });
  } else {
    brass(t, [R, R + 1, R + 6, R + 12, R + 13, R + 18], 0.22, { gain: 0.36, bright: 1.6, attack: 0.006, release: 0.3, vib: 0, hall: 0.25 });
    tremolo(t, [R + 24, R + 25], 0.3, { gain: 0.07, rate: 12, cut: 4000, attack: 0.01, release: 0.25, depth: 0.5 });
    timpani(t, R - 12, { gain: 0.18, decay: 0.7 });
  }
});
sfx('crash', 'music', 'cymbal crash. decay (1.8)', (t, p) => cymbal(t, { gain: 0.3, decay: p.decay ?? 1.8, room: 0.2, hall: 0.15 }));
sfx('wahwah', 'music', 'sad trombone "wah-waaah" falling (harmon-muted). key, n (2)', (t, p) => {
  const T = tonicAt(p, t, 3) + 7, n = p.n ?? 2, notes = [];
  for (let k = 0; k < n; k++) notes.push([k * 0.3, k === n - 1 ? 0.55 : 0.25, T - k]);
  notes.push([notes[n - 1][0] + 0.3, 0.3, T - n - 5, 0.6, 0.3]);
  const wah = (tt) => { const u = (tt % 0.3) / 0.3; return 600 + 1500 * Math.sin(Math.PI * Math.min(1, u * 1.5)); };
  mono(t, notes, { timbre: 'mutetp', gain: 0.32, wah, vib: 35, vibRate: 5, vibDelay: 0.25, legato: 0.06, room: 0.15, hall: 0.15 });
});
sfx('clarinet', 'music', 'smug clarinet lick (0.4 s): a quick run up, a trill and a sly scoop. key', (t, p) => {
  const T = majorAt(p, t, 4), N = [[0, 0.05, 0], [0.05, 0.05, 4], [0.1, 0.05, 7], [0.15, 0.04, 9], [0.19, 0.04, 7], [0.23, 0.04, 9], [0.27, 0.13, 12, 1, 0.05]];
  mono(t, N.map(([a, l, x, g, gl]) => [a, l, T + x, g ?? 1, gl]), { timbre: 'clarinet', gain: 0.3, room: 0.15, hall: 0.2, vib: 20, vibDelay: 0.1 });
});
sfx('tada', 'music', 'mocking brass "ta-DAAA" (V -> I, the long chord sags at the end). key', (t, p) => {
  const T = majorAt(p, t, 3);
  brass(t, [T + 7, T + 11, T + 14, T + 19], 0.09, { gain: 0.42, bright: 1.4, attack: 0.006, release: 0.05 });
  brass(t + 0.12, [T + 12, T + 16, T + 19, T + 24], 0.26, { gain: 0.5, bright: 1.4, attack: 0.008, release: 0.15, fall: 1.5, fallTime: 0.14 });
});
sfx('reveal', 'music', 'sneaky reveal sting: two low pizz notes and a muted trumpet "hmm?" rising. key', (t, p) => {
  const T = tonicAt(p, t, 3);
  pizz(t, T, { gain: 0.9, decay: 0.4, bright: 0.6 }); pizz(t + 0.18, T + 3, { gain: 0.9, decay: 0.4, bright: 0.6 });
  mono(t + 0.3, [[0, 0.05, T + 19], [0.05, 0.35, T + 22, 1, 0.25]], { timbre: 'mutetp', gain: 0.6, wah: (tt) => 800 + 1200 * smooth(tt / 0.3), room: 0.15, hall: 0.2 });
});
sfx('eureka', 'music', 'eureka sting: harp glissando up + glockenspiel + a bright brass chord. key', (t, p) => {
  const T = majorAt(p, t, 4);
  for (let k = 0; k < 10; k++) harp(t + k * 0.025, T - 12 + [0, 4, 7][k % 3] + 12 * Math.floor(k / 3), { gain: 0.08, pan: -0.5 + k * 0.1 });
  brass(t + 0.24, [T - 5, T, T + 4, T + 7, T + 12], 0.45, { gain: 0.36, bright: 1.4, attack: 0.01, release: 0.4, hall: 0.3 });
  [12, 16, 19, 24].forEach((x, k) => glock(t + 0.24 + k * 0.05, T + x, { gain: 0.12, pan: k % 2 ? 0.4 : -0.4, hall: 0.5 }));
});
sfx('uhoh', 'music', 'bassoon "uh-oh": two notes down a minor third. key', (t, p) => {
  const T = tonicAt(p, t, 3) + 7;
  mono(t, [[0, 0.17, T], [0.24, 0.42, T - 3, 0.9], [0.66, 0.15, T - 4, 0.5, 0.12]], { timbre: 'bassoon', gain: 0.32, room: 0.15, hall: 0.15, legato: 0.02 });
});
sfx('whistle', 'music', "the Naked's whistle (signature tune). key (G), bars ([0]), len (s: stop early), innocent (softer, a little shaky), fall (last note falls off)", (t, p) => {
  const T = tonic(p.key ?? 'G', 4), len = p.len ?? Infinity, rowsW = sig(p.bars ?? [0]), b0 = rowsW[0][0];
  const sel = rowsW.map(([b, l, m]) => [(b - b0) * BEAT, l * BEAT * 0.97, T + m]).filter(([a]) => a < len - 0.02).map(([a, l, m]) => [a, Math.min(l, len - a), m]);
  if (p.fall && sel.length) { const last = sel[sel.length - 1]; sel.push([last[0] + last[1], 0.35, last[2] - 7, 0.4, 0.3]); }
  mono(t, sel, { timbre: 'whistle', gain: p.innocent ? 0.17 : 0.2, vib: p.innocent ? 40 : 22, vibRate: p.innocent ? 6.5 : 5.6, room: 0.12, hall: 0.3, pan: P(p, 0) });
});

// ════════════════════════════ 8. mixdown + master + loudness ════════════════════════════
function loadEpisode(n) {
  EP = n;
  const dir = join(ROOT, 'episodes', 'ep' + n), file = ARGS.cues ? String(ARGS.cues) : join(dir, 'cues.json');
  if (!existsSync(file)) throw new Error(`no ${relative(ROOT, file)}`);
  CUES = JSON.parse(readFileSync(file, 'utf8'));
  DUR = CUES.duration; BPM = CUES.bpm ?? 120; BEAT = 60 / BPM; BAR = 4 * BEAT; LOOP = !!CUES.loop;
  if (!(DUR > 0)) throw new Error('cues.json: duration must be > 0');
  N = Math.round(DUR * SR);
  SECTIONS = (CUES.sections ?? []).map((s, k) => {
    if (!STYLES[s.style]) throw new Error(`section ${k} "${s.name}": unknown style "${s.style}" (styles: ${Object.keys(STYLES).join(', ')})`);
    if (!(s.t1 > s.t0)) throw new Error(`section "${s.name}": t1 must be > t0`);
    let { t0, t1 } = s;
    if (LOOP && t0 < 0) { t0 += DUR; t1 += DUR; }
    return { ...s, t0, t1 };
  });
  CUE_LIST = (CUES.cues ?? []).map((c, k) => {
    if (!Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'string') throw new Error(`cue ${k}: expected [t, "type", {params}], got ${JSON.stringify(c)}`);
    const [t, type, p] = c;
    return { t: LOOP && t < 0 ? t + DUR : t, type, p: p ?? {} };
  });
  const maxEnd = Math.max(DUR, ...SECTIONS.map((s) => s.t1), ...CUE_LIST.map((c) => c.t + (c.p.dur ?? 0) + (c.type in SFX && SFX[c.type].cat === 'amb' && LOOP ? 1 : 0)));
  EXT = LOOP ? Math.min(DUR - 0.01, maxEnd - DUR + 6) : 3;
  NB = N + Math.ceil(EXT * SR);
  return { dir, wav: ARGS.out ? String(ARGS.out) : join(dir, 'soundtrack.wav') };
}

function addTarget(dst, src) {
  const off = Math.round(src.t0 * SR);
  for (let i = Math.max(0, -off); i < src.n; i++) {
    const n = off + i;
    if (n >= dst.n) break;
    dst.L[n] += src.L[i]; dst.R[n] += src.R[i]; dst.room[n] += src.room[i]; dst.hall[n] += src.hall[i]; dst.delay[n] += src.delay[i];
  }
}

/** Render one music section into a private target, apply its gain / fades / cut, add it to the music bus. */
function renderSection(s) {
  const pre = 0.75, tail = s.cut ? 0.05 : s.tail ?? 4;
  TGT = mkTarget(s.t0 - pre, s.t1 - s.t0 + pre + tail);
  LVL = 1;
  reseed(`sec|${s.name}|${s.style}`);
  STYLES[s.style](s);
  const T = TGT, g = db(s.gain ?? 0), fi = s.fadeIn ?? 0, fo = s.fadeOut ?? 0, cr = 0.012;
  for (let i = 0; i < T.n; i++) {
    const t = T.t0 + i / SR;
    let e = g;
    if (fi > 0) e *= t < s.t0 ? 0 : t < s.t0 + fi ? smooth((t - s.t0) / fi) : 1;
    if (fo > 0) e *= t >= s.t1 ? 0 : t > s.t1 - fo ? 1 - smooth((t - (s.t1 - fo)) / fo) : 1;
    if (s.cut) e *= t < s.t1 ? 1 : t < s.t1 + cr ? 1 - (t - s.t1) / cr : 0;
    if (e !== 1) { T.L[i] *= e; T.R[i] *= e; T.room[i] *= e; T.hall[i] *= e; T.delay[i] *= e; }
  }
  addTarget(BUS.music, T);
}

function renderAllParts() {
  BUS = { music: mkTarget(0, NB / SR), amb: mkTarget(0, NB / SR), sfx: mkTarget(0, NB / SR) };
  for (const s of SECTIONS) renderSection(s);
  const counts = {}, missing = new Set();
  for (const c of [...CUE_LIST].sort((a, b) => a.t - b.t)) {
    const fn = SFX[c.type];
    if (!fn) { missing.add(c.type); continue; }
    const key = c.type + JSON.stringify(c.p);
    counts[key] = (counts[key] ?? 0) + 1;
    reseed(key + '#' + counts[key]);
    TGT = fn.cat === 'amb' ? BUS.amb : BUS.sfx;
    LVL = db(c.p.gain ?? 0);
    fn(c.t, c.p);
    if (ARGS.report && fn.cat !== 'amb') { // the same cue again, alone (same seed = same sound), for the cue report
      TGT = mkTarget(c.t - 0.05, Math.min(c.p.dur ?? 0, 4) + 2.5);
      reseed(key + '#' + counts[key]);
      fn(c.t, c.p);
      c.iso = TGT;
    }
  }
  LVL = 1;
  return missing;
}

function processSends() {
  const room = { fb: 0.8, damp: 0.38, predelay: 0.01, hp: 220, lp: 7000 };
  const hall = { fb: 0.885, damp: 0.32, predelay: 0.025, hp: 200, lp: 6000 };
  for (const k of ['room', 'hall', 'delay']) { const a = BUS.amb[k], s = BUS.sfx[k]; for (let i = 0; i < a.length; i++) if (a[i] !== 0) { s[i] += a[i]; a[i] = 0; } } // one shared reverb
  for (const [name, b] of Object.entries(BUS)) {
    applyReverb(b.room, b.L, b.R, room);
    applyReverb(b.hall, b.L, b.R, { ...hall, gain: name === 'sfx' ? 0.85 : 1 });
    if (b.delay.some((v) => v !== 0)) applyPingPong(b.delay, b.L, b.R, { time: 0.75 * BEAT, fb: 0.3, lp: 3200 });
  }
}

/** Bus -> exactly N samples: loop episodes fold the overhang back onto the start (the circle). */
function foldBus(b) {
  const L = b.L.slice(0, N), R = b.R.slice(0, N);
  if (LOOP) for (let i = N; i < b.n; i++) { L[i - N] += b.L[i]; R[i - N] += b.R[i]; }
  return { L, R };
}

/** Music gain curve: dips by DUCK[cat] (or the cue's duck) dB under each cue; circular in loop episodes. */
function duckCurve() {
  const g = new Float32Array(N);
  for (const c of CUE_LIST) {
    const fn = SFX[c.type];
    if (!fn) continue;
    const depth = c.p.duck ?? DUCK[fn.cat] ?? 0;
    if (!depth) continue;
    const hold = 0.08 + Math.min(c.p.dur ?? 0, 3), pre = 0.015, rel = 0.3;
    for (let i = sec2n(c.t - pre), b = sec2n(c.t + hold + rel * 4); i < b; i++) {
      const idx = LOOP ? ((i % N) + N) % N : i;
      if (idx < 0 || idx >= N) continue;
      const t = i / SR - c.t, amt = t < 0 ? smooth((t + pre) / pre) : t < hold ? 1 : Math.exp(-(t - hold) / rel);
      if (-depth * amt < g[idx]) g[idx] = -depth * amt;
    }
  }
  const o = new Float32Array(N), sm = new OnePole(25);
  for (let pass = 0; pass < (LOOP ? 2 : 1); pass++) for (let i = 0; i < N; i++) o[i] = sm.lp(g[i]);
  for (let i = 0; i < N; i++) o[i] = db(o[i]);
  return o;
}

/** Gate for "cut" sections: closes the whole music bus (reverb tails too) from t1 until the next section starts. */
function musicGate() {
  const g = new Float32Array(N).fill(1), ramp = sec2n(0.012);
  for (const s of SECTIONS) {
    if (!s.cut) continue;
    const others = SECTIONS.filter((x) => x !== s);
    let next = Math.min(...others.map((x) => x.t0).filter((t0) => t0 >= s.t1 - 1e-6), Infinity);
    if (next === Infinity) next = LOOP ? Math.min(...SECTIONS.map((x) => x.t0)) + DUR : DUR + 1;
    const a = sec2n(s.t1), b = sec2n(next);
    for (let i = a; i < b; i++) {
      const t = i / SR;
      if (others.some((x) => t >= x.t0 && t < x.t1)) continue;
      const idx = LOOP ? i % N : i;
      if (idx >= N) break;
      const v = i - a < ramp ? 1 - (i - a) / ramp : 0;
      const w = Math.max(v, b - i < ramp ? 1 - (b - i) / ramp : 0);
      if (w < g[idx]) g[idx] = w;
    }
  }
  return g;
}

const MIX = { music: -3, amb: 0, sfx: 0 }; // bus trims (dB); cues.json "mix" overrides per episode
function mixdown() {
  const mus = foldBus(BUS.music), amb = foldBus(BUS.amb), fx = foldBus(BUS.sfx);
  const duck = duckCurve(), gate = musicGate(), tr = { ...MIX, ...(CUES.mix ?? {}) };
  const km = db(tr.music), ka = db(tr.amb), ks = db(tr.sfx);
  for (const b of [mus.L, mus.R]) for (let i = 0; i < N; i++) b[i] *= km;
  for (const b of [amb.L, amb.R]) for (let i = 0; i < N; i++) b[i] *= ka;
  for (const b of [fx.L, fx.R]) for (let i = 0; i < N; i++) b[i] *= ks;
  const L = new Float32Array(N), R = new Float32Array(N), bedL = new Float32Array(N), bedR = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const gm = duck[i] * gate[i], ga = Math.sqrt(duck[i]);
    bedL[i] = mus.L[i] * gm + amb.L[i] * ga; bedR[i] = mus.R[i] * gm + amb.R[i] * ga;
    L[i] = bedL[i] + fx.L[i]; R[i] = bedR[i] + fx.R[i];
  }
  return { L, R, bedL, bedR, duck, gate };
}

/** Run a stateful processor p(l, r, i, warm) over [0, N); loop episodes warm it up on the last `warm` s first. */
function runCirc(L, R, p, warm = 1) {
  if (LOOP) for (let i = N - Math.min(N, sec2n(warm)); i < N; i++) p(L[i], R[i], i, true);
  for (let i = 0; i < N; i++) p(L[i], R[i], i, false);
}
/** Master EQ: 30 Hz high-pass + -2 dB below 90 Hz (headroom, phone balance), -2 dB above 8.5 kHz, 16 kHz low-pass (no harsh highs). */
function masterEq(L, R) {
  const oL = new Float32Array(N), oR = new Float32Array(N);
  const mk = () => [new Biquad('hp', 30, 0.707), new Biquad('lowshelf', 90, 0.7, -2), new Biquad('highshelf', 8500, 0.7, -2), new Biquad('lp', 16000, 0.707)];
  const fl = mk(), fr = mk();
  runCirc(L, R, (l, r, i, warm) => { for (const f of fl) l = f.run(l); for (const f of fr) r = f.run(r); if (!warm) { oL[i] = l; oR[i] = r; } }, 1.5);
  return [oL, oR];
}
/** Gentle stereo-linked glue compressor (soft knee), in place. */
function glue(L, R, { thr = -15, ratio = 2, knee = 8, att = 0.006, rel = 0.16 } = {}) {
  const a = Math.exp(-1 / (att * SR)), r = Math.exp(-1 / (rel * SR));
  let env = 0, maxGR = 0;
  runCirc(L, R, (l, rr, i, warm) => {
    const lvl = Math.max(Math.abs(l), Math.abs(rr));
    env = lvl > env ? a * env + (1 - a) * lvl : r * env + (1 - r) * lvl;
    const x = DB(env + 1e-12) - thr;
    const over = x <= -knee / 2 ? 0 : x >= knee / 2 ? x : ((x + knee / 2) ** 2) / (2 * knee);
    const gr = over * (1 - 1 / ratio);
    if (!warm) { const g = db(-gr); L[i] = l * g; R[i] = rr * g; if (gr > maxGR) maxGR = gr; }
  }, 1);
  return maxGR;
}

// ── BS.1770-4 loudness (the same K-weighting and gating as ffmpeg's ebur128) ──
class RawBQ {
  constructor(b0, b1, b2, a1, a2) { Object.assign(this, { b0, b1, b2, a1, a2 }); this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  run(x) { const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; }
}
const kWeight = () => [new RawBQ(1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585), new RawBQ(1, -2, 1, -1.99004745483398, 0.99007225036621)];
/** Integrated loudness (LUFS) of L/R scaled by gain g(i) (number or array). */
function lufs(L, R, gain = 1) {
  const [a1, a2] = kWeight(), [b1, b2] = kWeight(), n = L.length;
  const cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const g = typeof gain === 'number' ? gain : gain[i];
    const l = a2.run(a1.run(L[i] * g)), r = b2.run(b1.run(R[i] * g));
    cum[i + 1] = cum[i] + l * l + r * r;
  }
  const blk = sec2n(0.4), hop = sec2n(0.1), z = [];
  for (let s = 0; s + blk <= n; s += hop) z.push((cum[s + blk] - cum[s]) / blk);
  const L_ = (e) => -0.691 + 10 * Math.log10(e);
  const abs = z.filter((e) => L_(e) > -70);
  if (!abs.length) return -Infinity;
  const rel = L_(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((e) => L_(e) > rel);
  return L_(gated.reduce((a, b) => a + b, 0) / gated.length);
}
/** Loudness (LUFS, ungated) of [t0, t1). */
function windowLufs(L, R, t0, t1) {
  const [a1, a2] = kWeight(), [b1, b2] = kWeight(), a = sec2n(t0), b = Math.min(L.length, sec2n(t1));
  let e = 0;
  for (let i = 0; i < b; i++) { const l = a2.run(a1.run(L[i])), r = b2.run(b1.run(R[i])); if (i >= a) e += l * l + r * r; }
  return -0.691 + 10 * Math.log10(e / Math.max(1, b - a) + 1e-12);
}
/** Short-term (3 s window) loudness at the end of each 0.5 s step. */
function shortTerm(L, R) {
  const [a1, a2] = kWeight(), [b1, b2] = kWeight(), n = L.length, cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) { const l = a2.run(a1.run(L[i])), r = b2.run(b1.run(R[i])); cum[i + 1] = cum[i] + l * l + r * r; }
  const res = [];
  for (let e = sec2n(0.5); e <= n; e += sec2n(0.5)) { const s = Math.max(0, e - sec2n(3)); res.push([e / SR, -0.691 + 10 * Math.log10((cum[e] - cum[s]) / (e - s) + 1e-12)]); }
  return res;
}

// ── true peak: 4x oversampled (windowed-sinc polyphase), per sample, max over both channels ──
const TP_ROWS = (() => {
  const P = 4, T = 16, rows = [];
  for (let ph = 1; ph < P; ph++) {
    const row = new Float64Array(2 * T);
    for (let j = 0; j < 2 * T; j++) { const x = ph / P - (j - T + 1); row[j] = (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)) * (0.5 + 0.5 * Math.cos((Math.PI * x) / T)); }
    rows.push(row);
  }
  return rows;
})();
function tpEnvelope(L, R, thr = 0) {
  const T = 16, env = new Float32Array(N);
  const at = (ch, k) => (LOOP ? ch[((k % N) + N) % N] : k < 0 || k >= N ? 0 : ch[k]);
  for (const ch of [L, R]) for (let n = 0; n < N; n++) {
    let m = Math.abs(ch[n]);
    if (thr > 0) { // inter-sample peaks stay well under 2x the nearby samples: skip the interpolation when far below thr
      let loc = 0;
      for (let j = -3; j <= 4; j++) { const v = Math.abs(at(ch, n + j)); if (v > loc) loc = v; }
      if (loc * 2 < thr) { if (m > env[n]) env[n] = m; continue; }
    }
    const fast = n >= T && n < N - T;
    for (const row of TP_ROWS) {
      let y = 0;
      if (fast) for (let j = 0; j < 2 * T; j++) y += row[j] * ch[n + j - T + 1];
      else for (let j = 0; j < 2 * T; j++) y += row[j] * at(ch, n + j - T + 1);
      const a = Math.abs(y); if (a > m) m = a;
    }
    if (m > env[n]) env[n] = m;
  }
  return env;
}
const maxOf = (a) => { let m = 0; for (let i = 0; i < a.length; i++) if (a[i] > m) m = a[i]; return m; };

/** Look-ahead limiter gain (never lets g * tp exceed ceil): forward min over `la`, exponential release, la-box smoothing. */
function limiterGain(tp, g, ceil, la = sec2n(0.003), relS = 0.09) {
  const W = LOOP ? Math.min(N, sec2n(1.5)) : 0, M = N + 2 * W;
  const r = new Float32Array(M);
  for (let k = 0; k < M; k++) { const i = LOOP ? (((k - W) % N) + N) % N : k; const x = tp[i] * g; r[k] = x > ceil ? ceil / x : 1; }
  const h = new Float32Array(M), dq = new Int32Array(M);
  let head = 0, tail = 0;
  for (let k = M - 1; k >= 0; k--) {
    while (tail > head && r[dq[tail - 1]] >= r[k]) tail--;
    dq[tail++] = k;
    while (dq[head] > k + la) head++;
    h[k] = r[dq[head]];
  }
  const a = Math.exp(-1 / (relS * SR)), e = new Float32Array(M);
  let v = 1;
  for (let k = 0; k < M; k++) { v = Math.min(h[k], 1 - (1 - v) * a); e[k] = v; }
  const o = new Float32Array(N);
  let s = 0;
  for (let k = 0; k < M; k++) {
    s += e[k]; if (k > la) s -= e[k - la - 1];
    if (k >= W && k < W + N) o[k - W] = s / Math.min(k + 1, la + 1);
  }
  return o;
}

/** Master: EQ -> pre-normalise to -20 LUFS -> glue compressor -> gain search into the true-peak limiter for the target. */
function master(Lin, Rin, target = TARGET_LUFS, ceilDb = TP_CEIL) {
  const [L, R] = masterEq(Lin, Rin);
  const l0 = lufs(L, R), pre = db(-20 - l0);
  for (let i = 0; i < N; i++) { L[i] *= pre; R[i] *= pre; }
  const glueGR = glue(L, R), ceil = db(ceilDb), l1 = lufs(L, R);
  const tp = tpEnvelope(L, R, ceil / db(target - l1 + 6)); // exact wherever a gain up to 6 dB above the unlimited estimate could hit the ceiling
  // regula falsi on (gain dB -> loudness): the limiter makes loudness grow less than 1:1 with gain
  let g = db(target - l1), G = null, l = 0, lo = null, hi = null;
  const gg = new Float32Array(N);
  for (let it = 0; it < 16; it++) {
    G = limiterGain(tp, g, ceil);
    for (let i = 0; i < N; i++) gg[i] = g * G[i];
    l = lufs(L, R, gg);
    const err = target - l;
    if (Math.abs(err) < 0.02) break;
    if (err > 0) lo = [DB(g), l]; else hi = [DB(g), l];
    g = lo && hi ? db(lo[0] + ((target - lo[1]) * (hi[0] - lo[0])) / (hi[1] - lo[1])) : g * db(err * 1.25);
  }
  const oL = new Float32Array(N), oR = new Float32Array(N);
  let minG = 1;
  for (let i = 0; i < N; i++) { const k = g * G[i]; oL[i] = L[i] * k; oR[i] = R[i] * k; if (G[i] < minG) minG = G[i]; }
  if (!LOOP) { // click-free ends: 2 ms in, 40 ms out (the Short cuts here)
    const fi = sec2n(0.002), fo = sec2n(0.04);
    for (let i = 0; i < fi; i++) { oL[i] *= i / fi; oR[i] *= i / fi; }
    for (let i = 0; i < fo; i++) { const w = Math.sin((Math.PI / 2) * (i / fo)); oL[N - 1 - i] *= w; oR[N - 1 - i] *= w; }
  }
  return { L: oL, R: oR, glueGR, limGR: -DB(minG), lufsInternal: l, gain: g * pre };
}

function ffmpegMeasure(path) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const num = (re) => { const m = re.exec(s); return m ? parseFloat(m[1]) : NaN; };
  return { I: num(/I:\s+(-?[\d.]+) LUFS/), LRA: num(/LRA:\s+(-?[\d.]+) LU/), TP: num(/Peak:\s+(-?[\d.]+) dBFS/) };
}

// ════════════════════════════ 9. reports ════════════════════════════
function rmsDb(L, R, t0, t1) {
  const a = Math.max(0, sec2n(t0)), b = Math.min(L.length, sec2n(t1));
  let s = 0;
  for (let i = a; i < b; i++) s += L[i] * L[i] + R[i] * R[i];
  return DB(Math.sqrt(s / Math.max(1, 2 * (b - a))));
}
function peakDb(L, R, t0, t1) {
  const a = Math.max(0, sec2n(t0)), b = Math.min(L.length, sec2n(t1));
  let p = 0;
  for (let i = a; i < b; i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i]));
  return DB(p);
}
/** Phone-speaker band (small drivers: ~350 Hz - 7 kHz). */
function phoneBand(L, R) {
  const mk = () => [new Biquad('hp', 350, 0.707), new Biquad('hp', 350, 0.707), new Biquad('lp', 7000, 0.707)];
  const fl = mk(), fr = mk(), oL = new Float32Array(L.length), oR = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) { let l = L[i], r = R[i]; for (const f of fl) l = f.run(l); for (const f of fr) r = f.run(r); oL[i] = l; oR[i] = r; }
  return [oL, oR];
}
/** Per cue: its own loudest 20 ms (rendered alone, phone band) vs the rest of the mix at that moment. */
function cueReport(mx, k) {
  const [mL, mR] = phoneBand(mx.L, mx.R), [bL, bR] = phoneBand(mx.bedL, mx.bedR), blk = sec2n(0.02);
  console.log('\ncue report (phone band 350 Hz-7 kHz, dB after mastering gain): each cue alone at its loudest 20 ms vs the bed (music + ambience) and vs everything else (bed + other sfx)');
  for (const c of [...CUE_LIST].sort((a, b) => a.t - b.t)) {
    if (!c.iso) continue;
    const [iL, iR] = phoneBand(c.iso.L, c.iso.R), off = Math.round(c.iso.t0 * SR);
    let best = { s: -Infinity, r: -Infinity, b: -Infinity, at: c.t };
    const a0 = Math.max(0, sec2n(c.t - 0.01) - off), a1 = Math.min(c.iso.n - blk, sec2n(c.t + 0.3 + Math.min(1, c.p.dur ?? 0)) - off);
    for (let a = a0; a < a1; a += blk) {
      let es = 0, er = 0, eb = 0;
      for (let i = a; i < a + blk; i++) {
        const j0 = off + i, j = LOOP ? ((j0 % N) + N) % N : j0;
        if (j < 0 || j >= N) continue;
        es += iL[i] ** 2 + iR[i] ** 2; er += (mL[j] - iL[i]) ** 2 + (mR[j] - iR[i]) ** 2; eb += bL[j] ** 2 + bR[j] ** 2;
      }
      const s = DB(Math.sqrt(es / (2 * blk))) + DB(k), r = DB(Math.sqrt(er / (2 * blk))) + DB(k), b = DB(Math.sqrt(eb / (2 * blk))) + DB(k);
      if (s > best.s) best = { s, r, b, at: (off + a) / SR };
    }
    const mb = best.s - best.b, m = best.s - best.r, flag = mb < 4 ? '  <-- under the bed' : m < 0 ? '  (masked by other sfx)' : '';
    console.log(`  ${c.t.toFixed(2).padStart(6)} ${c.type.padEnd(13)} cue ${fmt(best.s).padStart(6)}   vs bed ${fmt(mb).padStart(6)}   vs all ${fmt(m).padStart(6)} dB  @${best.at.toFixed(2)}${flag}`);
  }
}
function spectrumReport(L, R) {
  const bands = [[20, 120], [120, 350], [350, 1000], [1000, 2500], [2500, 5000], [5000, 8000], [8000, 20000]];
  const tot = rmsDb(L, R, 0, DUR);
  const parts = bands.map(([a, b]) => {
    const mk = () => [new Biquad('hp', a, 0.707), new Biquad('hp', a, 0.707), new Biquad('lp', b, 0.707), new Biquad('lp', b, 0.707)], fl = mk(), fr = mk();
    let e = 0;
    for (let i = 0; i < N; i++) { let l = L[i], r = R[i]; for (const f of fl) l = f.run(l); for (const f of fr) r = f.run(r); e += l * l + r * r; }
    return `${a >= 1000 ? a / 1000 + 'k' : a}-${b >= 1000 ? b / 1000 + 'k' : b} ${fmt(DB(Math.sqrt(e / (2 * N))) - tot).padStart(5)}`;
  });
  console.log('spectrum (band RMS vs full RMS, dB): ' + parts.join(' | '));
}

// ════════════════════════════ 10. main ════════════════════════════
function renderEpisode(n) {
  const t0 = Date.now(), lap = (msg) => process.env.VERBOSE && console.log(`  ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s  ${msg}`);
  const { wav } = loadEpisode(n);
  console.log(`ep${n} "${CUES.title ?? ''}": ${DUR}s, ${BPM} BPM${LOOP ? ', loop' : ''}, ${SECTIONS.length} sections, ${CUE_LIST.length} cues`);
  const missing = renderAllParts(); lap('render');
  if (missing.size) console.warn(`  WARNING: unknown cue types (skipped): ${[...missing].join(', ')}`);
  processSends(); lap('reverbs');
  const mx = mixdown(); lap('mixdown');
  let target = TARGET_LUFS, ceilDb = TP_CEIL, m, meas;
  for (let attempt = 0; attempt < 3; attempt++) {
    m = master(mx.L, mx.R, target, ceilDb); lap('master');
    writeWav(wav, m.L, m.R);
    meas = ffmpegMeasure(wav); lap('ffmpeg');
    if (!meas) break;
    const dI = TARGET_LUFS - meas.I, over = meas.TP - (TP_LIMIT - 0.05);
    if (Math.abs(dI) <= 0.15 && over <= 0) break;
    if (Math.abs(dI) > 0.15) target += dI;
    if (over > 0) ceilDb -= over + 0.1;
  }
  let clip = 0, nan = 0;
  for (let i = 0; i < N; i++) { if (!Number.isFinite(m.L[i]) || !Number.isFinite(m.R[i])) nan++; if (Math.abs(m.L[i]) > 0.999 || Math.abs(m.R[i]) > 0.999) clip++; }
  const open1 = windowLufs(m.L, m.R, 0, 0.4), open3 = windowLufs(m.L, m.R, 0, 3), open5 = rmsDb(m.L, m.R, 0, 0.5);
  const shown = relative(ROOT, wav).startsWith('..') ? wav : relative(ROOT, wav);
  console.log(`  wrote ${shown} (${N} frames = ${(N / SR).toFixed(3)} s, 48 kHz, 16-bit, stereo) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  if (meas) console.log(`  ffmpeg ebur128: integrated ${meas.I.toFixed(1)} LUFS, true peak ${meas.TP.toFixed(1)} dBTP, LRA ${meas.LRA.toFixed(1)} LU`);
  else console.log(`  (ffmpeg not found) internal: integrated ${m.lufsInternal.toFixed(2)} LUFS`);
  console.log(`  dynamics: glue GR max ${fmt(m.glueGR)} dB, limiter GR max ${fmt(m.limGR)} dB; clipped ${clip}, NaN ${nan}`);
  console.log(`  opening: ${fmt(open1)} LUFS momentary (0-0.4 s), ${fmt(open3)} LUFS short-term (0-3 s)${open1 < TARGET_LUFS - 6 ? '  <-- quiet opening' : ''}`);
  if (LOOP) {
    let d = 0; for (let i = N - 200; i < N - 1; i++) d = Math.max(d, Math.abs(m.L[i + 1] - m.L[i]), Math.abs(m.R[i + 1] - m.R[i]));
    const seam = Math.max(Math.abs(m.L[0] - m.L[N - 1]), Math.abs(m.R[0] - m.R[N - 1]));
    console.log(`  loop seam: step ${(seam * 32767).toFixed(0)} LSB (largest step in the last 200 samples ${(d * 32767).toFixed(0)}), RMS last 0.5 s ${fmt(rmsDb(m.L, m.R, DUR - 0.5, DUR))} dB vs first 0.5 s ${fmt(open5)} dB`);
  }
  const secs = SECTIONS.map((s) => `${s.name} ${fmt(rmsDb(m.L, m.R, Math.max(0, Math.min(s.t0, DUR)), Math.min(s.t1, DUR)))}`);
  if (ARGS.report) {
    console.log('  section RMS (dB): ' + secs.join(' | '));
    const st = shortTerm(m.L, m.R);
    console.log('  short-term loudness (LUFS, 3 s window, every 0.5 s): ' + st.map(([t, v]) => `${t.toFixed(1)}:${v.toFixed(0)}`).join(' '));
    cueReport(mx, m.gain);
    spectrumReport(m.L, m.R);
  }
  console.log('@@STATS ' + JSON.stringify({ ep: n, title: CUES.title, dur: DUR, loop: LOOP, I: meas?.I, TP: meas?.TP, LRA: meas?.LRA, lim: m.limGR }));
}

async function renderAllEpisodes() {
  const eps = readdirSync(join(ROOT, 'episodes')).map((d) => /^ep(\d+)$/.exec(d)).filter((m) => m && existsSync(join(ROOT, 'episodes', m[0], 'cues.json'))).map((m) => +m[1]).sort((a, b) => a - b);
  const extra = process.argv.slice(2).filter((a) => !/^--(all|ep)(=|$)/.test(a));
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < eps.length) {
      const n = eps[next++];
      results.push(await new Promise((res) => {
        const ch = spawn(process.execPath, [SELF, `--ep=${n}`, ...extra]);
        let outp = '';
        ch.stdout.on('data', (d) => (outp += d)); ch.stderr.on('data', (d) => (outp += d));
        ch.on('close', (code) => res({ n, outp, code }));
      }));
    }
  };
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(eps.length, Math.max(1, cpus().length)) }, worker));
  results.sort((a, b) => a.n - b.n);
  const rowsS = [];
  for (const r of results) {
    process.stdout.write(r.outp.split('\n').filter((l) => !l.startsWith('@@STATS')).join('\n'));
    const m = /@@STATS (.*)/.exec(r.outp);
    if (m) rowsS.push(JSON.parse(m[1])); else console.log(`  ep${r.n} FAILED (exit ${r.code})`);
  }
  console.log(`\nall episodes rendered in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log('ep  title              dur    loop  LUFS    TP (dBTP)');
  for (const s of rowsS) console.log(`${String(s.ep).padEnd(3)} ${String(s.title ?? '').padEnd(18)} ${String(s.dur).padEnd(6)} ${s.loop ? 'yes ' : 'no  '}  ${fmt(s.I)}   ${fmt(s.TP)}`);
  if (rowsS.length < results.length) process.exitCode = 1;
}

function listTypes() {
  console.log('MUSIC STYLES (section.style):');
  for (const [k, f] of Object.entries(STYLES)) console.log(`  ${k.padEnd(10)} ${f.doc}`);
  console.log('\nCUE TYPES ([t, type, {params}]; all take gain dB, duck dB):');
  for (const [k, f] of Object.entries(SFX)) console.log(`  ${k.padEnd(13)} [${f.cat}] ${f.doc}`);
}

/** Render cue types one at a time (default params, each in isolation) and report how loud / where in the spectrum each sits. */
function audition(list) {
  const types = list === true ? Object.keys(SFX) : String(list).split(',');
  const outs = [], BANDS = [[20, 150], [150, 400], [400, 1000], [1000, 2500], [2500, 6000], [6000, 20000]];
  console.log('type          peak dBFS  max momentary LUFS  phone-band 100ms   band energy vs total (dB): <150 150-400 400-1k 1-2.5k 2.5-6k >6k');
  for (const ty of types) {
    if (!SFX[ty]) { console.warn('unknown type ' + ty); continue; }
    const amb = SFX[ty].cat === 'amb', slot = amb ? 3.5 : 2.5;
    DUR = slot; N = Math.round(DUR * SR); NB = N + SR; LOOP = false; SECTIONS = []; CUE_LIST = [];
    BUS = { music: mkTarget(0, NB / SR), amb: mkTarget(0, NB / SR), sfx: mkTarget(0, NB / SR) };
    reseed(ty); TGT = amb ? BUS.amb : BUS.sfx; LVL = 1;
    SFX[ty](0.6, amb ? { dur: 2.5 } : {});
    processSends();
    const a = foldBus(BUS.amb), f = foldBus(BUS.sfx), L = new Float32Array(N), R = new Float32Array(N);
    for (let i = 0; i < N; i++) { L[i] = a.L[i] + f.L[i]; R[i] = a.R[i] + f.R[i]; }
    const [pL, pR] = phoneBand(L, R);
    let ph = -Infinity, mom = -Infinity;
    for (let x = 0; x < DUR - 0.1; x += 0.02) ph = Math.max(ph, rmsDb(pL, pR, x, x + 0.1));
    const [a1, a2] = kWeight(), [b1, b2] = kWeight(), cum = new Float64Array(N + 1);
    for (let i = 0; i < N; i++) { const l = a2.run(a1.run(L[i])), r = b2.run(b1.run(R[i])); cum[i + 1] = cum[i] + l * l + r * r; }
    for (let e = sec2n(0.4); e <= N; e += sec2n(0.02)) mom = Math.max(mom, -0.691 + 10 * Math.log10((cum[e] - cum[e - sec2n(0.4)]) / sec2n(0.4) + 1e-12));
    const tot = rmsDb(L, R, 0, DUR);
    const bands = BANDS.map(([lo, hi]) => { const mk = () => [new Biquad('hp', lo, 0.707), new Biquad('hp', lo, 0.707), new Biquad('lp', hi, 0.707), new Biquad('lp', hi, 0.707)], fl = mk(), fr = mk(); let e = 0; for (let i = 0; i < N; i++) { let l = L[i], r = R[i]; for (const q of fl) l = q.run(l); for (const q of fr) r = q.run(r); e += l * l + r * r; } return DB(Math.sqrt(e / (2 * N))) - tot; });
    console.log(`${ty.padEnd(13)} ${fmt(peakDb(L, R, 0, DUR)).padStart(6)}     ${fmt(mom).padStart(6)}             ${fmt(ph).padStart(6)}          ${bands.map((b) => fmt(b).padStart(6)).join(' ')}`);
    outs.push([L, R]);
  }
  const total = outs.reduce((s, [L]) => s + L.length + SR * 0.3, 0), oL = new Float32Array(total), oR = new Float32Array(total);
  let o = 0;
  for (const [L, R] of outs) { oL.set(L, o); oR.set(R, o); o += L.length + SR * 0.3; }
  const pk = Math.max(peakOf(oL), peakOf(oR)), k = pk > 0.89 ? 0.89 / pk : 1;
  for (let i = 0; i < total; i++) { oL[i] *= k; oR[i] *= k; }
  const outPath = ARGS.out ?? join(process.env.TMPDIR ?? '/tmp', 'rock-bottom-audition.wav');
  writeWav(outPath, oL, oR);
  console.log(`wrote ${outPath} (${(total / SR).toFixed(1)} s, scaled ${fmt(DB(k))} dB)`);
}

async function main() {
  if (ARGS.list) return listTypes();
  if (ARGS.audition) return audition(ARGS.audition);
  if (ARGS.all) return renderAllEpisodes();
  if (ARGS.ep) return renderEpisode(parseInt(ARGS.ep, 10));
  console.log('usage: node tools/music.mjs --ep=N | --all   [--report]   (also: --list, --audition=type1,type2 [--out=file.wav])');
}
main().catch((e) => { console.error('ERROR: ' + (e?.stack ?? e)); process.exit(1); });
