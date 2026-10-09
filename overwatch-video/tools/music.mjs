#!/usr/bin/env node
// tools/music.mjs: original score + SFX for "Support Main" (50 s, 120 BPM).
//
// Everything is synthesized here: oscillators, noise, envelopes, filters,
// reverb and delay. No samples and no npm dependencies.
// Timing comes from assets/cues.json (sections + SFX cues) and the 120 BPM grid
// (beat = 0.5 s, bar = 2 s, first downbeat at t = 0), so the track can be
// re-rendered whenever cues move.
//
//   node tools/music.mjs                -> writes assets/soundtrack.wav (48 kHz / 16-bit / stereo) + prints stats
//   CUE_REPORT=1 node tools/music.mjs   -> also prints, per cue, how far each SFX sits above the music
//
// File layout:
//   1. config + cue access    2. dsp utils (rng, envelopes, oscillators, filters, reverb, delay, wav)
//   3. mixer / buses          4. instruments      5. sfx      6. arrangement (score)
//   7. mixdown + master + stats

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ════════════════════════════ 1. config + cues ════════════════════════════
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CUE_FILE = join(ROOT, 'assets', 'cues.json');
const OUT_FILE = join(ROOT, 'assets', 'soundtrack.wav');
const CUES = JSON.parse(readFileSync(CUE_FILE, 'utf8'));

const SR = 48000;
const DUR = CUES.duration ?? 50;
const N = Math.round(DUR * SR);
const BPM = CUES.bpm ?? 120;
const BEAT = 60 / BPM;          // 0.5 s
const BAR = 4 * BEAT;           // 2.0 s
const TAU = Math.PI * 2;

/** Section by name prefix, e.g. sec('C') -> "C high noon", sec('B->C') -> the turn. */
function sec(prefix) {
  const s = CUES.sections.find((x) => x.name === prefix || x.name.startsWith(prefix + ' '));
  if (!s) throw new Error(`cues.json: no section "${prefix}"`);
  return s;
}
const CUE_LIST = CUES.cues.map(([t, type, p]) => ({ t, type, p: p ?? {} }));
/** Time of the first cue of `type` at/after `after` seconds (falls back to `fallback`). */
function cueT(type, after = 0, fallback) {
  const c = CUE_LIST.find((c) => c.type === type && c.t >= after - 1e-9);
  if (c) return c.t;
  if (fallback !== undefined) return fallback;
  throw new Error(`cues.json: no "${type}" cue after ${after}s`);
}
/** All cue times of `type` in [from, to). */
const cueTimes = (type, from = 0, to = Infinity) =>
  CUE_LIST.filter((c) => c.type === type && c.t >= from && c.t < to).map((c) => c.t);

// ════════════════════════════ 2. dsp utils ════════════════════════════
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const db = (x) => Math.pow(10, x / 20);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const sec2n = (t) => Math.round(t * SR);
const newBuf = (dur) => new Float32Array(Math.max(1, Math.ceil(dur * SR)));

// Deterministic RNG (mulberry32) so every render is identical.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = mulberry32(0x5eed1e);
const rand = (a = 0, b = 1) => a + (b - a) * rnd();
const white = () => rnd() * 2 - 1;

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

// ── band-limited oscillators (PolyBLEP) ──
function blep(p, dt) {
  if (p < dt) { p /= dt; return p + p - p * p - 1; }
  if (p > 1 - dt) { p = (p - 1) / dt; return p * p + p + p + 1; }
  return 0;
}
class Osc {
  constructor(phase = rnd()) { this.p = phase; }
  step(f) { this.p += f / SR; if (this.p >= 1) this.p -= Math.floor(this.p); }
  sin(f) { const y = Math.sin(TAU * this.p); this.step(f); return y; }
  saw(f) { const dt = f / SR, p = this.p; const y = 2 * p - 1 - blep(p, dt); this.step(f); return y; }
  pulse(f, w = 0.5) {
    const dt = f / SR, p = this.p;
    let y = (p < w ? 1 : -1) + blep(p, dt) - blep((p - w + 1) % 1, dt);
    this.step(f); return y - (2 * w - 1); // remove the DC of asymmetric pulses
  }
  tri(f) { const y = 4 * Math.abs(this.p - 0.5) - 1; this.step(f); return y; }
}

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

// ── Freeverb-style stereo reverb (8 damped combs + 4 allpasses per side) ──
const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const APS = [556, 441, 341, 225];
const SPREAD = 23;
class Freeverb {
  constructor({ fb = 0.84, damp = 0.3, width = 1 } = {}) {
    const sc = SR / 44100;
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
  /** Process mono x -> [l, r] (wet only). */
  run(x) {
    let l = 0, r = 0;
    for (let k = 0; k < 8; k++) { l += Freeverb.comb(this.cL[k], x, this.fb, this.damp); r += Freeverb.comb(this.cR[k], x, this.fb, this.damp); }
    for (let k = 0; k < 4; k++) { l = Freeverb.ap(this.aL[k], l); r = Freeverb.ap(this.aR[k], r); }
    const w1 = 0.5 + this.width / 2, w2 = (1 - this.width) / 2;
    this._l = l * w1 + r * w2; this._r = r * w1 + l * w2;
  }
}
/** Energy gain of a reverb's impulse response, used to calibrate wet level to ~unity power. */
function reverbNorm(opts) {
  const rv = new Freeverb(opts); let e = 0;
  for (let n = 0; n < SR * 6; n++) { rv.run(n === 0 ? 1 : 0); e += rv._l * rv._l; }
  return 1 / Math.sqrt(e);
}
/**
 * Run a mono send bus through a reverb and ADD the wet result into outL/outR.
 * Pre-filters the send (hp/lp), adds pre-delay, and starts at the first non-silent sample.
 */
function applyReverb(send, outL, outR, { fb = 0.84, damp = 0.3, width = 1, predelay = 0.02, hp = 180, lp = 9000, gain = 1 } = {}) {
  let first = send.findIndex((v) => v !== 0);
  if (first < 0) return;
  const rv = new Freeverb({ fb, damp, width });
  const norm = reverbNorm({ fb, damp, width }) * gain;
  const pd = Math.max(1, sec2n(predelay)), dl = new Float32Array(pd); let di = 0;
  const h = new Biquad('hp', hp, 0.7), l = new Biquad('lp', lp, 0.7);
  for (let n = first; n < N; n++) {
    const x = l.run(h.run(send[n]));
    const d = dl[di]; dl[di] = x; if (++di >= pd) di = 0;
    rv.run(d);
    outL[n] += rv._l * norm; outR[n] += rv._r * norm;
  }
}
/** Ping-pong delay on a mono send, wet added into outL/outR. */
function applyPingPong(send, outL, outR, { time = 0.375, fb = 0.38, lp = 3800, hp = 300, gain = 1 } = {}) {
  const D = sec2n(time), bl = new Float32Array(D), br = new Float32Array(D);
  const fl = new OnePole(lp), fr = new OnePole(lp), h = new Biquad('hp', hp, 0.7);
  let i = 0;
  for (let n = 0; n < N; n++) {
    const x = h.run(send[n]);
    const dl = bl[i], dr = br[i];
    bl[i] = fl.lp(x + dr * fb); br[i] = fr.lp(dl * fb);
    outL[n] += dl * gain; outR[n] += dr * gain;
    if (++i >= D) i = 0;
  }
}

// ── WAV writer (16-bit PCM, interleaved stereo) ──
function writeWav(path, L, R) {
  const bytes = N * 4, b = Buffer.alloc(44 + bytes);
  b.write('RIFF', 0); b.writeUInt32LE(36 + bytes, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(bytes, 40);
  const q = (x) => clamp(Math.round(x * 32767), -32768, 32767);
  for (let n = 0, o = 44; n < N; n++, o += 4) { b.writeInt16LE(q(L[n]), o); b.writeInt16LE(q(R[n]), o + 2); }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, b);
}

// ════════════════════════════ 3. mixer / buses ════════════════════════════
// Groups (stereo dry buses):
//   music  - the score; ducked under big SFX and gated at the dead stop
//   groove - the B-section band (own sends); filtered down in the B->C turn, then summed into music
//   sfx    - sound effects, always on top
//   coda   - the final chord after the dead stop (own reverb, not gated)
// Each family has mono send buses feeding its own reverbs / delay.
const mkBus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const BUS = { music: mkBus(), groove: mkBus(), sfx: mkBus(), coda: mkBus() };
const FAMILY = { music: 'music', groove: 'groove', sfx: 'sfx', coda: 'coda' };
const SEND = {
  music: { room: new Float32Array(N), hall: new Float32Array(N), delay: new Float32Array(N) },
  groove: { room: new Float32Array(N), hall: new Float32Array(N), delay: new Float32Array(N) },
  sfx: { room: new Float32Array(N), hall: new Float32Array(N), delay: new Float32Array(N) },
  coda: { room: new Float32Array(N), hall: new Float32Array(N), delay: new Float32Array(N) },
};

/**
 * Mix a rendered voice into a group at time t0 (s).
 * Applies a 0.5 ms fade-in / 4 ms fade-out to every voice (click insurance), gain,
 * pan (mono voices: equal-power, unity at centre; stereo: balance) and reverb/delay sends.
 */
function place(group, L, R, t0, o, mono) {
  const bus = BUS[group], sends = SEND[FAMILY[group]];
  const gain = (o.gain ?? 1) * (group === 'sfx' ? sfxLevel : 1), pan = clamp(o.pan ?? 0, -1, 1);
  let gl = gain, gr = gain;
  if (mono) { const a = ((pan + 1) * Math.PI) / 4; gl *= Math.cos(a) * Math.SQRT2; gr *= Math.sin(a) * Math.SQRT2; }
  else { gl *= Math.min(1, 1 - pan); gr *= Math.min(1, 1 + pan); }
  const sr = (o.room ?? 0) * gain, sh = (o.hall ?? 0) * gain, sd = (o.delay ?? 0) * gain;
  const len = L.length, i0 = Math.round(t0 * SR);
  const fin = Math.max(1, Math.round(0.0005 * SR)), fout = Math.max(1, Math.round(0.004 * SR));
  for (let j = 0; j < len; j++) {
    const n = i0 + j;
    if (n < 0) continue;
    if (n >= N) break;
    let w = j < fin ? j / fin : 1;
    const k = len - 1 - j;
    if (k < fout) w = Math.min(w, k / fout);
    const l = L[j] * w, r = R[j] * w;
    bus.L[n] += l * gl; bus.R[n] += r * gr;
    const m = mono ? l : (l + r) * 0.5;
    if (sr) sends.room[n] += m * sr;
    if (sh) sends.hall[n] += m * sh;
    if (sd) sends.delay[n] += m * sd;
  }
}
const out = (group, buf, t0, o = {}) => place(group, buf, buf, t0, o, true);
const outSt = (group, L, R, t0, o = {}) => place(group, L, R, t0, o, false);

// ════════════════════════════ 4. instruments ════════════════════════════
// Each instrument renders one note/event into a fresh buffer and mixes it with out()/outSt().

/** Warm detuned-saw pad (stereo: each side gets its own detuned stack). cut: Hz or t => Hz. */
function pad(group, t0, dur, notes, o = {}) {
  const { gain = 0.1, attack = 0.6, release = 1.0, cut = 1800, q = 0.8, voices = 3, detune = 0.12,
    room = 0.3, hall = 0, delay = 0, pan = 0, sus = 0.9 } = o;
  const len = dur + release + 0.05, L = newBuf(len), R = newBuf(len);
  [[-1, L], [1, R]].forEach(([side, buf]) => {
    const os = [], fq = [];
    for (const m of notes) for (let v = 0; v < voices; v++) {
      os.push(new Osc());
      fq.push(mtof(m + (v - (voices - 1) / 2) * detune + side * 0.03 + rand(-0.02, 0.02)));
    }
    const f1 = new SVF(), f2 = new SVF(), norm = 1 / Math.sqrt(os.length);
    for (let i = 0; i < buf.length; i++) {
      const t = i / SR;
      let x = 0;
      for (let k = 0; k < os.length; k++) x += os[k].saw(fq[k]);
      const fc = typeof cut === 'function' ? cut(t) : cut;
      buf[i] = f2.run(f1.run(x * norm, fc, q), fc * 1.2, 0.6) * adsr(t, attack, 0.4, sus, release, dur);
    }
  });
  outSt(group, L, R, t0, { gain, room, hall, delay, pan });
}

/** Saw + sub-sine bass with a short filter pluck. */
function bass(group, t0, midi, dur, o = {}) {
  const { gain = 0.3, cut = 500, env = 1400, sub = 0.7, q = 1.0, room = 0.02 } = o;
  const b = newBuf(dur + 0.08), o1 = new Osc(0), o2 = new Osc(0), f = new SVF(), fr = mtof(midi);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const x = o1.saw(fr) * 0.55 + o2.sin(fr) * sub;
    const y = f.run(x, cut + env * Math.exp(-t / 0.07), q) * adsr(t, 0.004, 0.18, 0.7, 0.06, dur);
    b[i] = Math.tanh(1.4 * y) / 1.4;
  }
  out(group, b, t0, { gain, room, pan: o.pan ?? 0 });
}

/** Brass section: 3 detuned saws per note, "blat" filter envelope tracking pitch, delayed vibrato. */
function brass(group, t0, notes, dur, o = {}) {
  notes = [].concat(notes);
  const { gain = 0.12, attack = 0.025, release = 0.18, bright = 1, spread = 0.5, pan = 0, sus = 0.75,
    room = 0.25, hall = 0, delay = 0, vib = 1 } = o;
  const len = dur + release + 0.02, L = newBuf(len), R = newBuf(len);
  notes.forEach((m, ni) => {
    const p = notes.length > 1 ? lerp(-spread, spread, ni / (notes.length - 1)) + pan : pan;
    const a = ((clamp(p, -1, 1) + 1) * Math.PI) / 4, gl = Math.cos(a) * Math.SQRT2, gr = Math.sin(a) * Math.SQRT2;
    const os = [new Osc(), new Osc(), new Osc()], det = [-0.09, 0, 0.08].map((d) => Math.pow(2, (d + rand(-0.02, 0.02)) / 12));
    const f = new SVF(), base = mtof(m), vph = rand(0, TAU);
    for (let i = 0; i < L.length; i++) {
      const t = i / SR;
      const vb = vib * 0.0045 * smooth((t - 0.22) / 0.3) * Math.sin(TAU * 5.3 * t + vph);
      const fq = base * (1 + vb) * (1 - 0.015 * Math.exp(-t / 0.025)); // small scoop into the note
      const x = (os[0].saw(fq * det[0]) + os[1].saw(fq * det[1]) + os[2].saw(fq * det[2])) / 3;
      const e = adsr(t, attack, 0.3, sus, release, dur);
      const fc = base * (1.2 + bright * (2.2 * e + 5.5 * Math.exp(-t / 0.08) * Math.min(1, t / attack)));
      const y = f.run(x, Math.min(fc, 11000), 0.75) * e;
      L[i] += y * gl; R[i] += y * gr;
    }
  });
  const nrm = 1 / Math.sqrt(notes.length);
  outSt(group, L, R, t0, { gain: gain * nrm, room, hall, delay });
}

/** Hook lead: saw + narrow pulse, glide in from `from`, delayed vibrato, gentle lowpass. */
function lead(group, t0, midi, dur, o = {}) {
  const { gain = 0.1, pan = 0, from = midi, glide = 0.045, cut = 3200, room = 0.2, delay = 0.15, hall = 0,
    vib = 0.005, release = 0.09 } = o;
  const b = newBuf(dur + release + 0.02), o1 = new Osc(), o2 = new Osc(), f = new SVF(), vph = rand(0, TAU);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const m = lerp(from, midi, smooth(t / glide));
    const fq = mtof(m) * (1 + vib * smooth((t - 0.18) / 0.25) * Math.sin(TAU * 5.6 * t + vph));
    const x = o1.saw(fq) * 0.6 + o2.pulse(fq * 1.003, 0.3) * 0.4;
    const fc = cut * (0.7 + 0.6 * Math.exp(-t / 0.12));
    b[i] = f.run(x, fc, 0.8) * adsr(t, 0.008, 0.2, 0.8, release, dur);
  }
  out(group, b, t0, { gain, pan, room, delay, hall });
}

/** Filtered synth pluck (arp ticks, sparkles). */
function pluck(group, t0, midi, o = {}) {
  const { gain = 0.1, pan = 0, decay = 0.16, cut = 1500, env = 3500, q = 1.4, wave = 'saw',
    room = 0.15, delay = 0, hall = 0 } = o;
  const b = newBuf(decay * 6 + 0.02), os = new Osc(), f = new SVF(), fr = mtof(midi);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const x = wave === 'saw' ? os.saw(fr) : wave === 'tri' ? os.tri(fr) : os.pulse(fr, 0.25);
    b[i] = f.run(x, cut + env * Math.exp(-t / (decay * 0.45)), q) * perc(t, 0.002, decay);
  }
  out(group, b, t0, { gain, pan, room, delay, hall });
}

/** Karplus-Strong plucked string (western twang / pizzicato bass). decay = T60-ish seconds. */
function ks(group, t0, midi, o = {}) {
  const { gain = 0.2, pan = 0, decay = 1.2, bright = 0.6, room = 0.1, hall = 0, delay = 0, drive = 1 } = o;
  const f = mtof(midi), D = SR / f - 0.5, M = Math.ceil(D) + 4;
  const line = new Float32Array(M), b = newBuf(Math.min(decay * 1.3, 4) + 0.05);
  const g = Math.pow(10, -3 / (decay * f)), lpE = new OnePole(lerp(700, 9000, bright)), dc = new OnePole(20);
  const read = (p) => { const i = Math.floor(p), fr = p - i; const a = line[((i % M) + M) % M], c = line[(((i + 1) % M) + M) % M]; return a + (c - a) * fr; };
  for (let i = 0; i < b.length; i++) {
    const exc = i < D ? lpE.lp(white()) * (1 - i / D) : 0;
    const y = exc + g * 0.5 * (read(i - D) + read(i - D - 1));
    line[i % M] = y;
    b[i] = dc.hp(Math.tanh(drive * y) / drive);
  }
  out(group, b, t0, { gain, pan, room, hall, delay });
}

/** Sum of exponentially decaying sine partials: [[ratio, amp, tau], ...] */
function partials(f, parts, len, attack = 0.002, pitchEnv) {
  const b = newBuf(len);
  for (const [r, a, tau] of parts) {
    let ph = rand(0, 1);
    const fr = f * r;
    if (fr > SR * 0.45) continue;
    for (let i = 0; i < b.length; i++) {
      const t = i / SR;
      b[i] += a * Math.sin(TAU * ph) * perc(t, attack, tau);
      ph += (pitchEnv ? fr * pitchEnv(t) : fr) / SR;
    }
  }
  return b;
}
/** Music box tine. */
function musicBox(group, t0, midi, o = {}) {
  const { gain = 0.1, pan = 0, decay = 1.4, room = 0.3, hall = 0.25 } = o;
  const b = partials(mtof(midi), [[1, 1, decay], [2, 0.1, decay * 0.4], [3, 0.22, decay * 0.22], [5.4, 0.07, 0.1], [8.9, 0.05, 0.04]], decay * 4);
  out(group, b, t0, { gain, pan, room, hall });
}
/** Glockenspiel / celesta-like bell bar (angelic shimmer). */
function glock(group, t0, midi, o = {}) {
  const { gain = 0.08, pan = 0, decay = 0.9, room = 0.25, hall = 0.4, delay = 0 } = o;
  const b = partials(mtof(midi), [[1, 1, decay], [2.76, 0.35, decay * 0.3], [5.4, 0.15, decay * 0.12], [8.93, 0.06, 0.05]], decay * 4);
  out(group, b, t0, { gain, pan, room, hall, delay });
}
/** Marimba: tuned bar (1 : 3.93 : 9.2) + soft mallet click. */
function marimba(group, t0, midi, o = {}) {
  const { gain = 0.16, pan = 0, decay = 0.45, room = 0.18, hall = 0, delay = 0 } = o;
  const b = partials(mtof(midi), [[1, 1, decay], [3.93, 0.28, 0.07], [9.2, 0.07, 0.02]], decay * 5);
  const lp = new OnePole(2500);
  for (let i = 0; i < SR * 0.006; i++) b[i] += lp.lp(white()) * 0.25 * (1 - i / (SR * 0.006));
  out(group, b, t0, { gain, pan, room, hall, delay });
}

/** Whistle: sine + breath noise, glide from `from`, delayed vibrato, optional fall to `to` at the end. */
function whistle(group, t0, midi, dur, o = {}) {
  const { gain = 0.12, from = midi, glide = 0.09, to, fall = 0.18, pan = 0, room = 0.1, hall = 0.6 } = o;
  const b = newBuf(dur + 0.2), os = new Osc(0), bp = new SVF(), vph = rand(0, TAU);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let m = lerp(from, midi, smooth(t / glide));
    if (to !== undefined) m = lerp(m, to, smooth((t - (dur - fall)) / fall));
    const fq = mtof(m) * (1 + 0.011 * smooth((t - 0.15) / 0.35) * Math.sin(TAU * 5.4 * t + vph));
    const tone = os.sin(fq) + 0.04 * Math.sin(2 * TAU * os.p);
    bp.run(white(), fq, 6); const breath = bp.bp;
    b[i] = (tone + breath * 0.35) * adsr(t, 0.05, 0.12, 0.85, 0.14, dur);
  }
  out(group, b, t0, { gain, pan, room, hall });
}

/** Tremolo string drone (bowed 16th-ish tremolo). cresc(t) -> amplitude multiplier. */
function tremolo(group, t0, notes, dur, o = {}) {
  const { gain = 0.1, rate = 8, cut = 1300, attack = 0.6, release = 0.35, depth = 0.8, cresc = () => 1,
    room = 0.2, hall = 0.35 } = o;
  const len = dur + release + 0.02, L = newBuf(len), R = newBuf(len);
  [[-1, L], [1, R]].forEach(([side, buf]) => {
    const os = notes.flatMap(() => [new Osc(), new Osc()]);
    const fq = notes.flatMap((m) => [mtof(m - 0.06 + side * 0.02), mtof(m + 0.07 - side * 0.02)]);
    const f = new SVF(), ph = side * 0.13;
    for (let i = 0; i < buf.length; i++) {
      const t = i / SR;
      let x = 0;
      for (let k = 0; k < os.length; k++) x += os[k].saw(fq[k]);
      const tr = 1 - depth * Math.pow(Math.abs(Math.sin(Math.PI * (rate * t + ph))), 3);
      buf[i] = f.run(x / os.length, cut, 0.9) * tr * cresc(t) * adsr(t, attack, 0.1, 1, release, dur);
    }
  });
  outSt(group, L, R, t0, { gain, room, hall });
}

// Formant tables: [centre Hz, gain, bandwidth Hz]
const VOWELS = {
  ah: [[800, 1, 90], [1150, 0.55, 110], [2900, 0.22, 160], [3900, 0.1, 200]],
  oh: [[450, 1, 80], [800, 0.45, 90], [2830, 0.12, 150], [3800, 0.06, 200]],
};
/** Formant choir "aah": detuned saw voices with vibrato/drift, summed per side, then formant-filtered. */
function choir(group, t0, notes, dur, o = {}) {
  const { gain = 0.12, attack = 0.35, release = 0.9, voices = 4, vowel = 'ah', width = 0.85,
    room = 0.3, hall = 0.45, env, bend = 0, bendTime = 0.2 } = o;
  const len = dur + release + 0.05, sL = newBuf(len), sR = newBuf(len);
  for (const m of notes) for (let v = 0; v < voices; v++) {
    const os = new Osc(), det = rand(-0.12, 0.12), vr = rand(4.6, 6.0), vd = rand(0.003, 0.006), vp = rand(0, TAU);
    const dr = rand(0.2, 0.5), dp = rand(0, TAU), att = attack * rand(0.8, 1.3);
    const a = ((rand(-width, width) + 1) * Math.PI) / 4, gl = Math.cos(a), gr = Math.sin(a);
    for (let i = 0; i < sL.length; i++) {
      const t = i / SR;
      const b = bend * (1 - smooth(t / bendTime));
      const fq = mtof(m + det - b) * (1 + vd * Math.sin(TAU * vr * t + vp) + 0.002 * Math.sin(TAU * dr * t + dp));
      const e = env ? env(t) : adsr(t, att, 0.3, 0.9, release, dur);
      const x = (os.saw(fq) + 0.08 * white()) * e;
      sL[i] += x * gl; sR[i] += x * gr;
    }
  }
  const fmt = VOWELS[vowel];
  for (const s of [sL, sR]) {
    const fs = fmt.map(() => new SVF()), body = new OnePole(500), air = new SVF();
    for (let i = 0; i < s.length; i++) {
      const x = s[i];
      let y = 0.12 * body.lp(x);
      for (let k = 0; k < fs.length; k++) { fs[k].run(x, fmt[k][0], fmt[k][0] / fmt[k][2]); y += fs[k].bp * fmt[k][1]; }
      s[i] = air.run(y, 4800, 0.6);
    }
  }
  outSt(group, sL, sR, t0, { gain: gain / Math.sqrt(notes.length * voices), room, hall });
}

// ── drums ──
function kick(group, t0, o = {}) {
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
  out(group, b, t0, { gain, room });
}
function snare(group, t0, o = {}) {
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
  out(group, b, t0, { gain, pan, room, hall });
}
function clap(group, t0, o = {}) {
  const { gain = 0.22, pan = -0.05, room = 0.25 } = o;
  const b = newBuf(0.45), bp = new Biquad('bp', 1150, 1.1), hp = new OnePole(500);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let e = Math.exp(-t / 0.12) * 0.55;
    for (const d of [0, 0.011, 0.023, 0.034]) if (t >= d) e = Math.max(e, Math.exp(-(t - d) / 0.006));
    b[i] = bp.run(hp.hp(white())) * e * 2.2;
  }
  out(group, b, t0, { gain, pan, room });
}
const HAT_FREQS = [205.3, 304.4, 369.6, 522.7, 540, 800];
/** Metallic hat: 808-style square cluster + noise, high-passed. */
function hat(group, t0, o = {}) {
  const { gain = 0.07, open = false, pan = 0.22, room = 0.08 } = o;
  const tau = open ? 0.2 : 0.028, b = newBuf(tau * 6 + 0.02), hp1 = new Biquad('hp', 7000, 0.8), hp2 = new Biquad('hp', 7000, 0.8);
  const os = HAT_FREQS.map(() => new Osc());
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let m = 0;
    for (let k = 0; k < 6; k++) m += os[k].pulse(HAT_FREQS[k] * 2.4);
    b[i] = hp2.run(hp1.run(m * 0.12 + white() * 0.7)) * perc(t, 0.0008, tau);
  }
  out(group, b, t0, { gain, pan, room });
}
function tom(group, t0, midi, o = {}) {
  const { gain = 0.35, pan = 0, decay = 0.3, room = 0.25, hall = 0.1 } = o;
  const b = newBuf(decay * 4), f = mtof(midi), lp = new OnePole(900);
  let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    ph += f * (1 + 0.6 * Math.exp(-t / 0.05)) / SR;
    b[i] = Math.sin(TAU * ph) * perc(t, 0.001, decay) + lp.lp(white()) * perc(t, 0.001, 0.03) * 0.6;
  }
  out(group, b, t0, { gain, pan, room, hall });
}
/** Timpani: membrane modes (1, 1.5, 1.74, 2.0, 2.24) + soft mallet thump. */
function timpani(group, t0, midi, o = {}) {
  const { gain = 0.35, pan = 0, decay = 1.3, room = 0.25, hall = 0.25 } = o;
  const b = partials(mtof(midi), [[1, 1, decay], [1.504, 0.55, decay * 0.6], [1.742, 0.3, decay * 0.4], [2.0, 0.22, decay * 0.35], [2.245, 0.12, decay * 0.25]],
    decay * 3.5, 0.003, (t) => 1 + 0.03 * Math.exp(-t / 0.05));
  const lp = new OnePole(300);
  for (let i = 0; i < SR * 0.08; i++) b[i] += lp.lp(white()) * Math.exp(-i / (SR * 0.02)) * 1.2;
  out(group, b, t0, { gain, pan, room, hall });
}
/** Snare roll from 16ths accelerating to 32nds with a crescendo. */
function snareRoll(group, t0, dur, o = {}) {
  const { g0 = 0.06, g1 = 0.3, room = 0.25 } = o;
  let t = 0;
  while (t < dur - 0.01) {
    const u = t / dur;
    snare(group, t0 + t, { gain: lerp(g0, g1, u * u), decay: 0.09, room, pan: (rnd() - 0.5) * 0.2 });
    t += lerp(BEAT / 4, BEAT / 8, smooth(u * 1.4));
  }
}
/** Cymbal crash: decorrelated stereo noise + metallic cluster, bright splash then long wash. */
function cymbal(group, t0, o = {}) {
  const { gain = 0.2, decay = 1.8, pan = 0, room = 0.2, hall = 0.1, tone = 1 } = o;
  const len = decay * 3.2, L = newBuf(len), R = newBuf(len);
  [L, R].forEach((buf, side) => {
    const os = HAT_FREQS.map(() => new Osc()), hp = new Biquad('hp', 3200 * tone, 0.6), pk = new Biquad('peak', 7500, 1, 4);
    const lp = new OnePole(lerp(9000, 14000, side));
    for (let i = 0; i < buf.length; i++) {
      const t = i / SR;
      let m = 0;
      for (let k = 0; k < 6; k++) m += os[k].pulse(HAT_FREQS[k] * (1.7 + side * 0.03) * tone);
      const e = perc(t, 0.0015, decay) * 0.75 + perc(t, 0.001, 0.06) * 0.6;
      buf[i] = lp.lp(pk.run(hp.run(white() + m * 0.1))) * e;
    }
  });
  outSt(group, L, R, t0, { gain, pan, room, hall });
}
/** Noise riser: band-passed stereo noise sweeping up with a crescendo. */
function riser(group, t0, dur, o = {}) {
  const { gain = 0.12, f0 = 300, f1 = 6000, q = 2, room = 0.2, hall = 0, curve = 2 } = o;
  const L = newBuf(dur + 0.03), R = newBuf(dur + 0.03);
  [L, R].forEach((buf) => {
    const f = new SVF();
    for (let i = 0; i < buf.length; i++) {
      const u = clamp(i / SR / dur, 0, 1);
      f.run(white(), f0 * Math.pow(f1 / f0, u), q);
      buf[i] = f.bp * Math.pow(u, curve) * Math.min(1, (dur + 0.03 - i / SR) / 0.03);
    }
  });
  outSt(group, L, R, t0, { gain, room, hall });
}

// ════════════════════════════ 5. sfx ════════════════════════════
// One function per cue type: SFX[type](t, params). All render into the 'sfx' group.
// DUCK: how far (dB) the music dips under each SFX so the cartoon timing reads on top.
const DUCK = { gunshot: 5, clank: 4.5, slam: 5, boom: 4, crash: 2.5, bell: 3, sting: 3, choirhit: 3, fwoosh: 2.5,
  fireworks: 2, charge: 2.5, thud: 2.5, swoosh: 2, whoosh: 3, scratch: 0, bonk: 0, rumble: 1.5, cheer: 2.5 };
const DUCK_DEFAULT = 2;
// Per-type level trims (dB) so every effect reads on top of the score.
const SFX_TRIM = { whoosh: 11, flap: 8, swoosh: 6, charge: 4, fwoosh: 3, shimmer: 6, fireworks: 5, cheer: 4, heartpop: 7,
  ding: 5, beam: 3, grr: 4, scratch: 8, twinkle: 6, rumble: 3, bloop: 4, pop: 3, tick: 4, smoke: 2, clank: 3 };
let sfxLevel = 1; // set per cue while rendering SFX (see main)
// Music fader automation [time s, dB], linear in dB between points (leaves room for the SFX in busy scenes).
const MUSIC_FADER = [[0, 0], [3.9, 0], [4.0, -4], [6, -3], [15, -3], [16, 0], [27.4, 0], [27.5, -2], [31.9, -2], [32, -4], [38, -3.5], [44, -1.5]];
function faderAt(t) {
  const F = MUSIC_FADER;
  if (t <= F[0][0]) return db(F[0][1]);
  for (let k = 1; k < F.length; k++) if (t < F[k][0]) return db(lerp(F[k - 1][1], F[k][1], (t - F[k - 1][0]) / (F[k][0] - F[k - 1][0])));
  return db(F[F.length - 1][1]);
}

/** Mono buffer from fn(t, i). */
const gen = (len, fn) => { const b = newBuf(len); for (let i = 0; i < b.length; i++) b[i] = fn(i / SR, i); return b; };
/** Stereo pair; mk(side) returns a fresh per-side generator (t, i) => sample (side: 0 = L, 1 = R). */
const gen2 = (len, mk) => [0, 1].map((s) => gen(len, mk(s)));
/** Phase-accumulating sine whose frequency is a function of time. */
const sweepSine = () => { let ph = rand(0, 1); return (f) => { const y = Math.sin(TAU * ph); ph += f / SR; return y; }; };
/** Equal-power auto-pan of a mono buffer: panAt(u) with u = 0..1 across the buffer -> [L, R]. */
function autoPan(b, panAt) {
  const L = new Float32Array(b.length), R = new Float32Array(b.length);
  for (let i = 0; i < b.length; i++) {
    const a = ((clamp(panAt(i / b.length), -1, 1) + 1) * Math.PI) / 4;
    L[i] = b[i] * Math.cos(a) * Math.SQRT2; R[i] = b[i] * Math.sin(a) * Math.SQRT2;
  }
  return [L, R];
}

const SFX = {
  beep(t, p) { // spawn countdown blip
    const f = mtof(p.pitch ?? 72), os = new Osc(0), sq = new Osc(0), lp = new OnePole(4500);
    const b = gen(0.24, (tt) => (os.sin(f) * 0.75 + lp.lp(sq.pulse(f)) * 0.3) * adsr(tt, 0.003, 0.06, 0.7, 0.06, 0.13));
    out('sfx', b, t, { gain: 0.42, room: 0.18 });
  },
  clank(t) { // heavy metal gate: inharmonic plate modes + impact noise + low thump + rattles
    const modes = [[1, 1, 0.9], [1.52, 0.6, 0.55], [2.76, 0.7, 0.5], [3.9, 0.4, 0.3], [5.4, 0.45, 0.25], [8.93, 0.3, 0.14], [13.3, 0.2, 0.08]];
    const [L, R] = [0, 1].map((s) => partials(92 * (1 + s * 0.006), modes, 2.4, 0.001));
    const bp = new Biquad('bp', 1700, 0.7), th = sweepSine();
    const hit = gen(2.4, (tt) => bp.run(white()) * Math.exp(-tt / 0.035) * 2.2 + th(42 + 60 * Math.exp(-tt / 0.03)) * Math.exp(-tt / 0.18) * 1.4);
    const lpL = new Biquad('lp', 12000, 0.7), lpR = new Biquad('lp', 12000, 0.7);
    for (let i = 0; i < L.length; i++) { L[i] = lpL.run(Math.tanh(0.5 * L[i] + hit[i])); R[i] = lpR.run(Math.tanh(0.5 * R[i] + hit[i])); }
    outSt('sfx', L, R, t, { gain: 0.5, room: 0.3, hall: 0.25 });
    for (const [d, g] of [[0.085, 0.25], [0.16, 0.14], [0.23, 0.08]]) { // gate rattle
      const r = partials(240 * rand(0.9, 1.1), [[1, 1, 0.08], [2.3, 0.6, 0.05], [4.1, 0.4, 0.03]], 0.3, 0.0008);
      out('sfx', r, t + d, { gain: g, pan: rand(-0.4, 0.4), room: 0.3 });
    }
  },
  crash(t) { cymbal('sfx', t, { gain: 0.36, decay: 2.0, room: 0.2, hall: 0.15 }); },
  whoosh(t, p) { // band-pass noise sweep with a pan move
    const dur = p.dur ?? 0.42, dir = rnd() < 0.5 ? -1 : 1, f = new SVF(), f2 = new SVF();
    const b = gen(dur, (tt) => { const u = tt / dur, s = Math.sin(Math.PI * u); f.run(white(), 350 * Math.pow(7, s), 1.1); f2.run(f.bp, 350 * Math.pow(7, s) * 1.3, 0.9); return f2.bp * s * s * 1.6; });
    const [L, R] = autoPan(b, (u) => dir * lerp(-0.6, 0.6, u));
    outSt('sfx', L, R, t, { gain: 0.3, room: 0.12 });
  },
  boing(t) { // pitch-bent spring wobble
    const s1 = sweepSine();
    const b = gen(0.7, (tt) => { const f = 170 * (1 + 0.5 * (1 - Math.exp(-tt / 0.1))) * (1 + 0.28 * Math.exp(-tt / 0.2) * Math.sin(TAU * 13 * tt)); const y = s1(f); return (y + 0.3 * y * y * y) * perc(tt, 0.004, 0.24); });
    out('sfx', b, t, { gain: 0.4, room: 0.15 });
  },
  flap(t) { // wing flap: two soft low thumps + feather air
    const lp = new Biquad('lp', 900, 0.9), hp = new OnePole(2500);
    const b = gen(0.35, (tt) => { const e = perc(tt, 0.006, 0.035) + 0.7 * perc(tt - 0.11, 0.006, 0.04); return lp.run(white()) * e * 2.0 + hp.hp(white()) * e * 0.5; });
    out('sfx', b, t, { gain: 0.42, room: 0.12 });
  },
  thud(t) { // landing
    const s = sweepSine(), lp = new OnePole(380);
    const b = gen(0.5, (tt) => s(38 + 70 * Math.exp(-tt / 0.04)) * perc(tt, 0.002, 0.13) + lp.lp(white()) * perc(tt, 0.001, 0.03) * 1.5);
    out('sfx', b, t, { gain: 0.42, room: 0.1 });
  },
  bloop(t, p) { // "I need healing": rising sine glide + vibrato + a touch of 2nd harmonic
    const m = p.pitch ?? 79, s = sweepSine();
    const b = gen(0.32, (tt) => { const mm = m - 6 + 6 * smooth(tt / 0.07); const f = mtof(mm) * (1 + 0.012 * smooth((tt - 0.08) / 0.05) * Math.sin(TAU * 9 * tt)); const y = s(f); return (y + 0.22 * (2 * y * y - 1)) * adsr(tt, 0.005, 0.06, 0.8, 0.09, 0.2); });
    out('sfx', b, t, { gain: 0.34, pan: rand(-0.25, 0.25), room: 0.2 });
  },
  ding(t) { // bright heal ping + a fifth-up echo ping
    const b = partials(mtof(98), [[1, 1, 0.55], [2.0, 0.3, 0.25], [3.0, 0.15, 0.12], [4.2, 0.1, 0.06]], 2.2, 0.001);
    const c = partials(mtof(105), [[1, 1, 0.4], [2.0, 0.2, 0.15]], 1.6, 0.001);
    out('sfx', b, t, { gain: 0.2, room: 0.2, hall: 0.3 });
    out('sfx', c, t + 0.06, { gain: 0.11, pan: 0.3, room: 0.2, hall: 0.3 });
  },
  beam(t, p) { // healing beam hum: warm detuned sines with shimmer
    const dur = p.dur ?? 0.5, notes = [62, 69, 74, 78, 86];
    const [L, R] = gen2(dur + 0.3, (side) => {
      const ss = notes.flatMap(() => [sweepSine(), sweepSine()]), ph = notes.map(() => rand(0, TAU));
      return (tt) => { let y = 0; notes.forEach((m, k) => { const am = 1 + 0.3 * Math.sin(TAU * (9 + k * 1.7) * tt + ph[k] + side); const w = k === 4 ? 0.25 : 1; y += w * am * (ss[2 * k](mtof(m) * (1.002 + side * 0.001)) + ss[2 * k + 1](mtof(m) * 0.998)); }); return y * 0.12 * adsr(tt, 0.06, 0.1, 0.9, 0.25, dur); };
    });
    outSt('sfx', L, R, t, { gain: 0.5, room: 0.2, hall: 0.25 });
  },
  grr(t) { // low growly buzz
    const os = new Osc(), f = new SVF();
    const b = gen(0.5, (tt) => { const am = 1 - 0.75 * Math.abs(Math.sin(TAU * 14 * tt)); return f.run(os.saw(78 * (1 - 0.1 * tt)), 600 + 500 * Math.sin(TAU * 3 * tt), 1.4) * am * adsr(tt, 0.02, 0.1, 0.9, 0.08, 0.38); });
    out('sfx', b, t, { gain: 0.36, room: 0.1 });
  },
  bell(t) { // big church bell (D): hum, prime, minor-third tierce, quint, nominal... + strike
    const P = [[0.5, 0.55, 4.0], [1, 1, 2.8], [1.183, 0.65, 2.2], [1.497, 0.35, 1.6], [2.0, 0.75, 1.7], [2.51, 0.3, 1.1], [2.66, 0.28, 0.9], [3.01, 0.22, 0.7], [4.0, 0.16, 0.5], [5.33, 0.09, 0.3], [6.5, 0.05, 0.2]];
    const [L, R] = [0, 1].map((s) => partials(mtof(50) * (1 + s * 0.0015), P, 5.5, 0.002));
    const bp = new Biquad('bp', 1200, 0.8);
    for (let i = 0; i < SR * 0.05; i++) { const x = bp.run(white()) * Math.exp(-i / (SR * 0.008)); L[i] += x; R[i] += x; }
    outSt('sfx', L, R, t, { gain: 0.3, room: 0.2, hall: 0.5 });
  },
  rustle(t, p) { // tumbleweed: soft crackles + rolling filtered noise, moving left to right
    const dur = p.dur ?? 2;
    const [L, R] = gen2(dur, (side) => {
      const bp = new SVF(), lp = new SVF(); let crack = 0;
      return (tt) => { const u = tt / dur, pan = side ? u : 1 - u; if (rnd() < 70 / SR) crack = rand(0.3, 1); crack *= 0.9985; bp.run(white() * crack, 3200, 1.2); lp.run(white(), 500, 0.7); const roll = 0.5 + 0.5 * Math.sin(TAU * 2.6 * tt); return (bp.bp * 1.4 + lp.lp * 0.35 * roll) * Math.sin(Math.PI * u) * (0.3 + 0.7 * pan); };
    });
    outSt('sfx', L, R, t, { gain: 0.32, room: 0.2 });
  },
  shing(t) { // metallic glint
    const b = partials(2350, [[1, 1, 0.6], [1.47, 0.7, 0.45], [2.09, 0.5, 0.35], [2.56, 0.4, 0.25], [3.2, 0.3, 0.18]], 1.8, 0.002);
    const f = new SVF();
    for (let i = 0; i < SR * 0.12; i++) { const tt = i / SR; f.run(white(), 3000 * Math.pow(3, tt / 0.12), 2); b[i] += f.bp * Math.sin(Math.PI * tt / 0.12) * 0.8; }
    out('sfx', b, t, { gain: 0.16, pan: 0.2, room: 0.2, hall: 0.4 });
  },
  sting(t) { // orchestral scare stab: dissonant brass cluster + high screech + timpani
    brass('sfx', t, [38, 50, 51, 57, 62, 63, 68], 0.32, { gain: 0.55, bright: 1.8, attack: 0.008, release: 0.5, sus: 0.6, room: 0.25, hall: 0.4, vib: 0 });
    tremolo('sfx', t, [87, 86, 92], 0.5, { gain: 0.09, rate: 12, cut: 6000, attack: 0.01, release: 0.4, depth: 0.5, hall: 0.4 });
    timpani('sfx', t, 38, { gain: 0.5, decay: 1.0 });
  },
  pop(t) { // bubbly pop
    const s = sweepSine();
    const b = gen(0.12, (tt) => s(300 + 900 * smooth(tt / 0.025)) * perc(tt, 0.001, 0.03) + (tt < 0.002 ? white() * 0.4 : 0));
    out('sfx', b, t, { gain: 0.36, pan: rand(-0.35, 0.35), room: 0.12 });
  },
  whine(t, p) { // rising tense whine
    const dur = p.dur ?? 1, s1 = sweepSine(), s2 = sweepSine(), os = new Osc(), lp = new OnePole(3000);
    const b = gen(dur + 0.05, (tt) => { const u = clamp(tt / dur, 0, 1); const f = 650 * Math.pow(3.2, u * u) * (1 + 0.01 * u * Math.sin(TAU * 11 * tt)); return (s1(f) + s2(f * 1.012) + lp.lp(os.saw(f)) * 0.3) * (0.15 + 0.85 * u * u) * adsr(tt, 0.05, 0.1, 1, 0.04, dur); });
    out('sfx', b, t, { gain: 0.11, room: 0.15, hall: 0.2 });
  },
  gunshot(t) { // crack + noise burst + low thump, long hall tail, two canyon echoes
    const hp = new Biquad('hp', 900, 0.7), bp = new Biquad('bp', 1800, 0.6), s = sweepSine();
    const lp1 = new Biquad('lp', 11000, 0.7), lp2 = new Biquad('lp', 11000, 0.7); // tame near-Nyquist grit (true peak)
    const b = gen(0.9, (tt, i) => {
      const crack = hp.run(white()) * Math.exp(-tt / 0.005) * 1.6 + (i < 30 ? Math.sin((Math.PI * i) / 30) * 0.8 : 0);
      const body = bp.run(white()) * Math.exp(-tt / 0.04) * 1.2;
      const thump = s(42 + 90 * Math.exp(-tt / 0.03)) * perc(tt, 0.0008, 0.11) * 1.3;
      return lp2.run(lp1.run(Math.tanh(1.8 * (crack + body + thump)) * 0.9));
    });
    out('sfx', b, t, { gain: 1.25, room: 0.2, hall: 0.8 });
    const lp = new OnePole(1600), echo = b.map((x) => lp.lp(x));
    out('sfx', echo, t + 0.38, { gain: 0.16, pan: -0.6, hall: 0.4 });
    out('sfx', echo, t + 0.79, { gain: 0.08, pan: 0.6, hall: 0.4 });
  },
  smoke(t) { // soft breathy whoosh (blowing the barrel)
    const f = new SVF();
    const b = gen(1.3, (tt) => { f.run(white(), 1200 - 600 * clamp(tt / 1.2, 0, 1), 0.8); return f.bp * adsr(tt, 0.18, 0.4, 0.5, 0.6, 0.45); });
    out('sfx', b, t, { gain: 0.3, pan: 0.15, room: 0.25, hall: 0.3 });
  },
  fwoosh(t) { // big wing-unfold air rush: wide noise sweep + whump + feather flutter
    const [L, R] = gen2(1.4, () => { const f = new SVF(); return (tt) => { f.run(white(), 280 * Math.pow(14, smooth(tt / 0.35)) * (1 - 0.5 * smooth((tt - 0.4) / 0.9)), 0.8); const fl = 1 - 0.35 * Math.exp(-tt / 0.4) * (0.5 + 0.5 * Math.sin(TAU * 19 * tt)); return f.lp * fl * adsr(tt, 0.08, 0.3, 0.55, 0.8, 0.3); }; });
    const s = sweepSine();
    const w = gen(0.4, (tt) => s(55 + 30 * Math.exp(-tt / 0.05)) * perc(tt, 0.01, 0.12));
    outSt('sfx', L, R, t, { gain: 0.42, room: 0.2, hall: 0.3 });
    out('sfx', w, t, { gain: 0.45 });
  },
  choirhit(t) { // big choir "aah" chord hit (D major)
    choir('sfx', t, [50, 57, 62, 66, 69, 74, 78, 81], 0.25, { gain: 0.9, voices: 3, release: 1.6, width: 0.95, hall: 0.6,
      env: (tt) => perc(tt, 0.012, 0.9) * 0.8 + perc(tt, 0.005, 0.12) * 0.4 });
  },
  shimmer(t, p) { // sparkly rising arpeggio
    const dur = p.dur ?? 1.8, scale = [74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98, 100, 102, 105];
    const n = Math.max(6, Math.round(dur / 0.09));
    for (let k = 0; k < n; k++) glock('sfx', t + (k / n) * dur, scale[k % scale.length],
      { gain: 0.06 + 0.03 * Math.sin(Math.PI * k / n), pan: k % 2 ? 0.55 : -0.55, decay: 0.6, room: 0.2, hall: 0.5 });
    const hp = new OnePole(7000), b = gen(dur, (tt) => (rnd() < 0.02 ? white() : 0) * Math.sin(Math.PI * tt / dur));
    out('sfx', b.map((x) => hp.hp(x)), t, { gain: 0.35, hall: 0.4 });
  },
  tick(t) { // small click
    const bp = new Biquad('bp', 3400, 2), s = sweepSine();
    const b = gen(0.05, (tt) => bp.run(white()) * Math.exp(-tt / 0.003) * 1.5 + s(1100) * perc(tt, 0.0005, 0.008) * 0.4);
    out('sfx', b, t, { gain: 0.32, pan: 0.2, room: 0.1 });
  },
  charge(t, p) { // rising low roar
    const dur = p.dur ?? 0.62, f = new SVF(), os = new Osc();
    const b = gen(dur + 0.08, (tt) => { const u = clamp(tt / dur, 0, 1); f.run(white() + os.saw(42 * (1 + u)) * 0.6, 150 * Math.pow(9, u), 1.2); return Math.tanh(2 * f.lp) * (0.2 + 0.8 * u * u) * adsr(tt, 0.05, 0.1, 1, 0.07, dur); });
    out('sfx', b, t, { gain: 0.45, room: 0.15 });
  },
  boom(t) { // deep impact
    const s = sweepSine(), lp = new OnePole(450);
    const b = gen(2.2, (tt) => Math.tanh(1.6 * (s(28 + 40 * Math.exp(-tt / 0.07)) * perc(tt, 0.002, 0.55) + lp.lp(white()) * perc(tt, 0.001, 0.07) * 1.5)));
    out('sfx', b, t, { gain: 0.5, room: 0.15, hall: 0.35 });
  },
  slash(t) { // sword swish + metallic ring
    const f = new SVF();
    const sw = gen(0.16, (tt) => { const u = tt / 0.16; f.run(white(), 1500 * Math.pow(5, u), 1.5); return f.bp * Math.sin(Math.PI * u) * 1.5; });
    out('sfx', sw, t - 0.08, { gain: 0.32, pan: 0.4, room: 0.1 });
    const ring = partials(1850, [[1, 1, 0.55], [1.41, 0.7, 0.4], [2.13, 0.5, 0.3], [2.71, 0.35, 0.2], [3.4, 0.25, 0.12]], 1.6, 0.001);
    out('sfx', ring, t, { gain: 0.15, pan: -0.2, room: 0.2, hall: 0.35 });
  },
  twinkle(t) { // high sparkle "ting-ting-ting"
    [[98, 0], [105, 0.07], [110, 0.14]].forEach(([m, d], k) => {
      const b = partials(mtof(m), [[1, 1, 0.35], [2.76, 0.2, 0.08]], 1.2, 0.001);
      out('sfx', b, t + d, { gain: 0.16 - k * 0.03, pan: 0.3 + k * 0.15, room: 0.2, hall: 0.55 });
    });
  },
  rumble(t, p) { // payload cart rumble with rail-joint clacks
    const dur = p.dur ?? 2;
    const [L, R] = gen2(dur, () => {
      const lp = new SVF(), lp2 = new SVF(), s = sweepSine();
      return (tt) => { const ph = (tt * 2) % 1; const clack = Math.exp(-ph / 0.012) + 0.7 * Math.exp(-((ph + 0.88) % 1) / 0.012); lp.run(white(), 110, 0.9); lp2.run(white(), 900, 1); return (lp.lp * 2.4 + lp2.bp * clack * 0.8 + s(44 + 3 * Math.sin(TAU * 7 * tt)) * 0.25) * adsr(tt, 0.3, 0.1, 1, 0.45, dur - 0.45); };
    });
    outSt('sfx', L, R, t, { gain: 0.4, room: 0.1 });
  },
  fireworks(t) { // whistle up + boom + crackle burst
    const s = sweepSine(), hp = new OnePole(600), wd = 0.32;
    const w = gen(wd, (tt) => (s(900 * Math.pow(2.9, tt / wd) * (1 + 0.01 * Math.sin(TAU * 25 * tt))) + hp.hp(white()) * 0.15) * adsr(tt, 0.03, 0.1, 0.9, 0.04, wd - 0.04));
    const pan = rand(-0.5, 0.5);
    out('sfx', w, t, { gain: 0.1, pan, room: 0.1, hall: 0.2 });
    const s2 = sweepSine(), lp = new OnePole(1500);
    const b = gen(0.6, (tt) => s2(45 + 50 * Math.exp(-tt / 0.03)) * perc(tt, 0.001, 0.12) + lp.lp(white()) * perc(tt, 0.001, 0.09) * 1.2);
    out('sfx', b, t + wd, { gain: 0.42, pan, room: 0.15, hall: 0.4 });
    const [L, R] = gen2(1.1, () => { const bp = new SVF(); let c = 0; return (tt) => { if (rnd() < 55 / SR) c = rand(0.4, 1); c *= 0.996; bp.run(white() * c, 4200, 1.5); return bp.bp * 1.6 * Math.exp(-tt / 0.6); }; });
    outSt('sfx', L, R, t + wd + 0.05, { gain: 0.28, pan, room: 0.15, hall: 0.3 });
  },
  swoosh(t, p) { // big transition swoosh: wide pan sweep + low body
    const dur = p.dur ?? 0.6, f = new SVF(), f2 = new SVF();
    const b = gen(dur, (tt) => { const u = tt / dur, s = Math.sin(Math.PI * u); f.run(white(), 220 * Math.pow(10, s), 0.9); f2.run(white(), 180, 0.7); return (f.bp * 1.4 + f2.lp * 0.8) * s * s; });
    const [L, R] = autoPan(b, (u) => lerp(-0.85, 0.85, u));
    outSt('sfx', L, R, t, { gain: 0.42, room: 0.15 });
  },
  slam(t) { // huge cinematic hit: reverse swell, sub boom, transient, metallic clang
    const f = new SVF(), pre = 0.22;
    const sw = gen(pre, (tt) => { const u = tt / pre; f.run(white(), 300 * Math.pow(12, u), 1.2); return f.bp * u * u * u; });
    out('sfx', sw, t - pre, { gain: 0.5, room: 0.2 });
    const s = sweepSine(), lp = new OnePole(800), bp = new Biquad('bp', 320, 1.2), lpo = new Biquad('lp', 12000, 0.7);
    const b = gen(2.8, (tt) => lpo.run(Math.tanh(1.4 * (s(30 + 55 * Math.exp(-tt / 0.06)) * perc(tt, 0.002, 0.8) * 1.2 + lp.lp(white()) * perc(tt, 0.0005, 0.05) * 1.6 + bp.run(white()) * perc(tt, 0.001, 0.12) * 1.4))));
    const [L, R] = [0, 1].map((sd) => partials(68 * (1 + sd * 0.008), [[1, 1, 1.0], [2.76, 0.6, 0.6], [5.4, 0.35, 0.35], [8.9, 0.2, 0.18]], 2.8, 0.001));
    for (let i = 0; i < b.length; i++) { L[i] = b[i] + 0.3 * L[i]; R[i] = b[i] + 0.3 * R[i]; }
    outSt('sfx', L, R, t, { gain: 0.8, room: 0.2, hall: 0.55 });
  },
  cheer(t, p) { // crowd cheer: many jittery, breathy formant "yaaay" voices + scattered claps
    const dur = p.dur ?? 1.5, len = dur + 0.4, src = [0, 1].map(() => [newBuf(len), newBuf(len)]); // [vowel][side]
    for (let v = 0; v < 40; v++) {
      const os = new Osc(), f0 = rand(170, 440), on = rand(0, 0.3), d = rand(0.5, 1) * (dur - on), vr = rand(5, 9), up = rand(2, 7);
      const jit = new OnePole(12), pn = rand(0, 1), bufs = src[v % 2];
      for (let i = sec2n(on); i < bufs[0].length; i++) {
        const tt = i / SR - on, u = tt / d;
        const f = f0 * Math.pow(2, (up * Math.sin(Math.PI * clamp(u, 0, 1) * 0.8)) / 12) * (1 + 0.025 * Math.sin(TAU * vr * tt) + 2 * jit.lp(white()));
        const x = (os.pulse(f, 0.3) * 0.6 + white() * 0.9) * adsr(tt, 0.06, 0.2, 0.75, 0.3, d);
        bufs[0][i] += x * (1 - pn); bufs[1][i] += x * pn;
      }
    }
    const V = [[[750, 1, 150], [1200, 0.5, 180], [2700, 0.2, 250]], [[550, 1, 130], [1800, 0.45, 200], [2600, 0.2, 250]]];
    const LR = [newBuf(len), newBuf(len)];
    src.forEach((pair, vw) => pair.forEach((s, side) => {
      const fs = V[vw].map(() => new SVF());
      for (let i = 0; i < s.length; i++) { let y = 0; for (let k = 0; k < fs.length; k++) { fs[k].run(s[i], V[vw][k][0], V[vw][k][0] / V[vw][k][2]); y += fs[k].bp * V[vw][k][1]; } LR[side][i] += y; }
    }));
    outSt('sfx', LR[0], LR[1], t, { gain: 0.085, room: 0.3, hall: 0.2 });
    for (let k = 0; k < 60; k++) { // scattered claps
      const bp = new Biquad('bp', rand(900, 1700), 1.2), c = gen(0.06, (tt) => bp.run(white()) * Math.exp(-tt / 0.01));
      out('sfx', c, t + rand(0.05, dur), { gain: rand(0.03, 0.07), pan: rand(-0.85, 0.85), room: 0.3 });
    }
  },
  heartpop(t) { // cute high pop with a little upward chirp
    const s = sweepSine(), s2 = sweepSine();
    const b = gen(0.22, (tt) => s(500 + 1100 * smooth(tt / 0.02)) * perc(tt, 0.001, 0.025) + s2(1300 + 900 * smooth((tt - 0.03) / 0.08)) * adsr(tt - 0.03, 0.005, 0.03, 0.7, 0.05, 0.08) * 0.6);
    out('sfx', b, t, { gain: 0.32, pan: rand(-0.3, 0.3), room: 0.2, hall: 0.15 });
  },
  scratch(t) { // record scratch: two strokes (forward, back) of a buzzy source with varying rate
    const os = new Osc(), os2 = new Osc(), f = new SVF(), dur = 0.34;
    const rate = (tt) => (tt < 0.13 ? 2.6 * Math.sin(Math.PI * tt / 0.13) : tt < 0.3 ? -1.8 * Math.sin(Math.PI * (tt - 0.13) / 0.17) : 0);
    const b = gen(dur, (tt) => { const r = Math.abs(rate(tt)); const x = os.saw(140 * r + 1) * 0.6 + os2.saw(211 * r + 1) * 0.4 + white() * 0.5; f.run(x, 500 + 2200 * r, 2.5); return f.bp * Math.pow(r / 2.6, 0.6) * 1.6; });
    out('sfx', b, t, { gain: 0.42, room: 0.03 });
  },
  bonk(t) { // cartoon bonk: woodblock + falling "boink"
    const wb = partials(880, [[1, 1, 0.05], [2.42, 0.5, 0.025], [3.9, 0.25, 0.012]], 0.3, 0.0005);
    const s = sweepSine();
    const dn = gen(0.4, (tt) => s(620 * Math.pow(0.28, smooth(tt / 0.3))) * perc(tt, 0.003, 0.14));
    out('sfx', wb, t, { gain: 0.6, room: 0.08 });
    out('sfx', dn, t + 0.01, { gain: 0.4, room: 0.08 });
  },
};

// ════════════════════════════ 6. arrangement ════════════════════════════
// Original material (D major, 120 BPM):
//   HOOK: 4 bars over D | C | G | A ("I - bVII - IV - V", the adventure-movie Mixolydian lift).
//         Bars 1 and 3 form a sequence (long note, leap up, stepwise run down and back);
//         bar 2 answers over C; bar 4 hangs on the dominant and wants to resolve to D.
//   [beat, length in beats, MIDI] with D5 = 74.
const HOOK = [
  [0, 1.5, 74], [1.5, 0.5, 81], [2, 0.5, 79], [2.5, 0.5, 78], [3, 0.5, 76], [3.5, 0.5, 78],
  [4, 1, 74], [5, 0.5, 71], [5.5, 0.5, 74], [6, 1.5, 78], [7.5, 0.5, 76],
  [8, 1.5, 79], [9.5, 0.5, 83], [10, 0.5, 81], [10.5, 0.5, 79], [11, 0.5, 78], [11.5, 0.5, 79],
  [12, 1, 81], [13, 0.5, 79], [13.5, 0.5, 78], [14, 2, 76],
];
const CH = { // bass root + mid-register stab voicing
  D: { root: 38, stab: [57, 62, 66, 69] },
  C: { root: 36, stab: [55, 60, 64, 67] },
  G: { root: 31, stab: [55, 59, 62, 67] },
  Asus: { root: 33, stab: [57, 62, 64, 67] }, // A7sus4: no C#, so the C6 "+" calls never clash
  A: { root: 33, stab: [57, 61, 64, 69] },
  Dm: { root: 38, stab: [57, 62, 65, 69] },
};
/** Notes of hook bar `bi` (0..3) as [beatInBar, lenBeats, midi]. */
const hookBar = (bi) => HOOK.filter((n) => n[0] >= bi * 4 && n[0] < bi * 4 + 4).map(([b, l, m]) => [b - bi * 4, l, m]);
/** Play hook bars `bars` back to back from t0. voice(t, durSec, midi, prevMidi). Notes at/after `until` are skipped. */
function playHook(t0, bars, voice, until = Infinity) {
  let prev;
  bars.forEach((bi, k) => {
    for (const [b, l, m] of hookBar(bi)) {
      const t = t0 + k * BAR + b * BEAT;
      if (t < until - 1e-6) voice(t, l * BEAT, m, prev);
      prev = m;
    }
  });
}
/** Glide only between neighbouring notes (legato steps), otherwise attack fresh. */
const glideFrom = (prev, m) => (prev !== undefined && Math.abs(prev - m) <= 2 ? prev : m);

/** One bar of drums. style: B playful groove, E heavy push, F half-time anthem, G light & cute. */
function drumBar(group, t0, style, o = {}) {
  const b = (x) => t0 + x * BEAT;
  if (style === 'B') {
    for (const k of o.alt ? [0, 1.5, 2, 3.5] : [0, 2, 2.5]) kick(group, b(k), { gain: 0.5 });
    for (const s of [1, 3]) { snare(group, b(s), { gain: 0.2 }); clap(group, b(s), { gain: 0.15 }); }
    for (let h = 0; h < 8; h++) hat(group, b(h / 2), { gain: h % 2 ? 0.045 : 0.065, open: h === 7 });
    for (let h = 0; h < 8; h++) hat(group, b(h / 2 + 0.25), { gain: 0.022, pan: -0.25 });
  } else if (style === 'E') {
    for (const k of [0, 1, 2, 3, 3.75]) kick(group, b(k), { gain: k === 3.75 ? 0.35 : 0.55, punch: 1.2 });
    for (const s of [1, 3]) { snare(group, b(s), { gain: 0.27 }); clap(group, b(s), { gain: 0.18 }); }
    for (let h = 0; h < 16; h++) hat(group, b(h / 4), { gain: h % 2 ? 0.03 : 0.055, open: h === 14 });
  } else if (style === 'F') {
    for (const k of [0, 1.5, 2.5]) kick(group, b(k), { gain: k ? 0.42 : 0.6, punch: 1.15 });
    snare(group, b(2), { gain: 0.32, decay: 0.2, room: 0.3, hall: 0.15 }); clap(group, b(2), { gain: 0.2 });
    for (let h = 0; h < 8; h++) hat(group, b(h / 2), { gain: h % 2 ? 0.06 : 0.04, open: h % 2 === 1 });
  } else if (style === 'G') {
    for (const k of [0, 2]) kick(group, b(k), { gain: 0.32, punch: 0.6, decay: 0.18 });
    for (const s of [1, 3]) clap(group, b(s), { gain: 0.09, room: 0.15 });
    for (let h = 0; h < 16; h++) hat(group, b(h / 4), { gain: h % 4 === 2 ? 0.03 : 0.015, pan: 0.35 });
  }
}
/** One bar of driving 8th-note bass with octave pops. */
function bassBar(group, t0, root, o = {}) {
  const pat = o.pat ?? [0, 0, 12, 0, 0, 12, 0, 7];
  pat.forEach((iv, k) => bass(group, t0 + (k * BEAT) / 2, root + iv, BEAT * 0.42, { gain: o.gain ?? 0.26 }));
}
/** Off-beat brass chord stabs (the "and" of 2 and beat 4). */
function stabBar(group, t0, chord, o = {}) {
  for (const x of o.at ?? [1.5, 3]) brass(group, t0 + x * BEAT, CH[chord].stab, 0.16, { gain: o.gain ?? 0.07, bright: 1.1, release: 0.12, room: 0.2 });
}
/** Clock tick / tock for the High Noon countdown. */
function clockTick(t, hi, g = 1) {
  const b = partials(hi ? 2600 : 1850, [[1, 1, 0.012], [1.72, 0.5, 0.007], [2.9, 0.3, 0.004]], 0.08, 0.0004);
  out('music', b, t, { gain: (hi ? 0.15 : 0.12) * g, pan: hi ? 0.18 : -0.18, room: 0.08, hall: 0.15 });
}

// ── A: spawn room (0-6) ─────────────────────────────────────────────
function scoreA() {
  const A = sec('A'), gate = cueT('clank', A.start, A.start + 1.75 * BAR), go = Math.ceil(gate / BAR - 1e-9) * BAR; // drums start on the next bar line
  // low Dsus2 pad, filter opening toward the gate
  pad('music', A.start, gate - A.start, [38, 45, 50, 52], { gain: 0.16, attack: 1.6, release: 0.25, cut: (t) => 220 * Math.pow(9, clamp(t / (gate - A.start), 0, 1)), room: 0.3 });
  // ticking filtered 16th arp that builds (no C#: it sits under the C-E-G spawn beeps)
  const arp = [62, 69, 74, 76, 74, 69, 64, 69];
  for (let k = 0, t = A.start; t < gate - 1e-6; k++, t += BEAT / 4) {
    const u = (t - A.start) / (gate - A.start);
    pluck('music', t, arp[k % 8] + (u > 0.6 && k % 8 === 3 ? 5 : 0), { gain: 0.025 + 0.075 * u * u, decay: 0.07 + 0.05 * u, cut: 500 + 3500 * u * u, env: 1500 + 2500 * u, pan: k % 2 ? 0.3 : -0.3, room: 0.2, delay: 0.1 });
  }
  // countdown build: soft timpani under each beep, roll into the gate
  cueTimes('beep', A.start, gate).forEach((t, k) => timpani('music', t, 38, { gain: 0.12 + 0.06 * k, decay: 0.6 }));
  snareRoll('music', gate - BEAT, BEAT, { g0: 0.03, g1: 0.18 });
  riser('music', gate - 1.0, 1.0, { gain: 0.07, f0: 400, f1: 7000 });
  // GATE HIT: kick + timpani + full brass stab (crash/clank come from the SFX cues)
  kick('music', gate, { gain: 0.55, punch: 1.4, decay: 0.35 });
  timpani('music', gate, 38, { gain: 0.5, decay: 1.4 });
  brass('music', gate, [38, 50, 57, 62, 66, 69, 74], 0.4, { gain: 0.24, bright: 1.6, attack: 0.006, release: 0.4, room: 0.25, hall: 0.3 });
  // heroic intro riff + band from the next bar line
  const RIFF = [[0, 0.5, 62], [0.5, 0.25, 62], [0.75, 0.25, 62], [1, 0.5, 66], [1.5, 0.5, 69], [2, 1, 74], [3, 0.5, 72], [3.5, 0.5, 69]];
  for (let bar = go; bar < A.end - 1e-6; bar += BAR) {
    for (const [b, l, m] of RIFF) brass('music', bar + b * BEAT, [m - 12, m], l * BEAT * 0.9, { gain: 0.14, bright: 1.2, spread: 0.3, room: 0.2 });
    drumBar('music', bar, 'B', { alt: true });
    bassBar('music', bar, 38);
    pad('music', bar, BAR, [50, 57, 62, 66], { gain: 0.05, attack: 0.2, release: 0.3, cut: 2000 });
  }
  // fill into B
  for (let k = 0; k < 4; k++) snare('music', A.end - BEAT + (k * BEAT) / 4, { gain: 0.12 + 0.05 * k });
}

// ── B: main street groove (6-15) + B->C turn (15-16) ────────────────
function scoreB() {
  const B = sec('B'), turn = sec('B->C');
  cymbal('groove', B.start, { gain: 0.16, decay: 1.6 });
  const prog = ['D', 'C', 'G', 'Asus', 'D'];
  for (let k = 0; B.start + k * BAR < turn.end - 1e-6; k++) {
    const t = B.start + k * BAR, c = prog[k % prog.length];
    drumBar('groove', t, 'B', { alt: k % 2 === 1 });
    bassBar('groove', t, CH[c].root);
    stabBar('groove', t, c);
    pad('groove', t, BAR, CH[c].stab, { gain: 0.04, attack: 0.15, release: 0.4, cut: 1600, room: 0.3 });
  }
  // hook, an octave down so the high "+" bloops sit on top of it
  playHook(B.start, [0, 1, 2, 3], (t, d, m, p) => lead('groove', t, m - 12, d * 0.92, { gain: 0.11, from: glideFrom(p, m) - 12, cut: 2600, delay: 0.12 }));
  // resolution on D after the hook, plus a little pickup tag
  const end = B.start + 4 * BAR;
  brass('groove', end, [50, 57, 62, 66, 69], 0.5, { gain: 0.16, bright: 1.3, release: 0.25 });
  [[0.5, 74], [0.75, 76], [1, 78], [1.5, 81]].forEach(([b, m]) => lead('groove', end + b * BEAT, m - 12, BEAT * 0.4, { gain: 0.09, cut: 2600 }));
}

// ── C: High Noon (16-24) ─────────────────────────────────────────────
function scoreC() {
  const C = sec('C'), turn = sec('B->C');
  const sting = cueT('sting', C.start, C.start + 1.5 * BAR), shot = cueT('gunshot', C.start, C.start + 2.75 * BAR);
  // tremolo low drone from under the bell to the first shot (cut hidden by the gunshot)
  tremolo('music', turn.start + BEAT, [38, 45, 50], shot - turn.start - BEAT, { gain: 0.15, attack: 1.2, release: 0.04, cut: 1100,
    cresc: (t) => 1 + 0.9 * smooth((t + turn.start + BEAT - sting) / (shot - sting)), hall: 0.3 });
  // tension layer: flat-2 rubs in from the sting
  tremolo('music', sting, [51, 63], shot - sting, { gain: 0.07, attack: 1.4, release: 0.04, cut: 1800, rate: 12, depth: 0.6, cresc: (t) => smooth(t / (shot - sting)) + 0.2 });
  // lonely whistle (D minor): [beat from C.start, beats, midi, glide-from, fall-to]
  const WHISTLE = [[0.5, 1.4, 74, 72], [2, 0.9, 77, 76], [3, 0.45, 76], [3.5, 0.45, 72], [4, 1.6, 81, 79, 77]];
  for (const [b, l, m, from, to] of WHISTLE) whistle('music', C.start + b * BEAT, m, l * BEAT, { gain: 0.15, from: from ?? m, to, pan: -0.15 });
  // sparse twangy plucks
  [[1, 50], [2.5, 45], [3, 50], [4.5, 53], [5, 52], [5.5, 50]].forEach(([b, m]) =>
    ks('music', C.start + b * BEAT, m, { gain: 0.24, decay: 1.4, bright: 0.75, drive: 2.5, pan: 0.25, room: 0.15, hall: 0.35 }));
  // ticking clock: 8ths, then 16ths for the last bar-half before the shots (feels like it speeds up)
  const accel = shot - 2 * BEAT;
  let k = 0;
  for (let t = sting; t < shot - 1e-6; k++) {
    const u = (t - sting) / (shot - sting);
    clockTick(t, k % 2 === 0, 0.7 + 0.5 * u);
    t += t < accel - 1e-6 ? BEAT / 2 : BEAT / 4;
  }
  // low pulse on the beats, growing
  for (let t = sting, j = 0; t < shot - 1e-6; t += BEAT, j++) timpani('music', t, 38, { gain: 0.1 + 0.035 * j, decay: 0.5, hall: 0.1 });
}

// ── D: Heroes never die (24-32) ─────────────────────────────────────
function scoreD() {
  const D = sec('D'), lift = cueT('choirhit', D.start, D.start + 1.75 * BAR), heart = D.start + BAR;
  const w = cueT('whoosh', heart + 0.01, lift - 2 * BEAT), swell = w < lift ? w : lift - 2 * BEAT; // the leap's whoosh starts the swell
  // sad music box (D minor, harmonic-minor C# for the ache)
  const BOX = [[0, 81], [1, 77], [1.5, 76], [2, 77], [2.5, 74], [3, 73], [4, 74]];
  BOX.forEach(([b, m]) => musicBox('music', D.start + b * BEAT, m, { gain: 0.13, pan: 0.1 }));
  [[0, 62], [0.5, 69], [1, 65], [1.5, 69], [2, 58], [2.5, 65], [3, 57], [3.5, 64]].forEach(([b, m]) => musicBox('music', D.start + b * BEAT, m, { gain: 0.07, pan: -0.15, decay: 1.0 }));
  pad('music', D.start, BAR, [50, 53, 57], { gain: 0.035, attack: 0.6, release: 0.8, cut: 900 });
  // heartbeat: lub-dub
  kick('music', heart, { gain: 0.55, tune: 44, punch: 0.35, decay: 0.2, click: 0, attack: 0.006 });
  kick('music', heart + 0.24, { gain: 0.4, tune: 42, punch: 0.3, decay: 0.2, click: 0, attack: 0.006 });
  // rising swell into the wings: noise sweep, gliding choir, brass crescendo, timpani roll
  const sw = lift - swell;
  riser('music', swell, sw, { gain: 0.1, f0: 250, f1: 8000, curve: 1.6, hall: 0.2 });
  choir('music', swell, [57, 64, 69, 73], sw, { gain: 0.35, attack: sw * 0.9, release: 0.1, bend: 2, bendTime: sw, hall: 0.3 });
  brass('music', swell, [45, 57, 64], sw, { gain: 0.1, attack: sw * 0.85, release: 0.05, bright: 0.8 });
  for (let t = swell, j = 0; t < lift - 0.02; t += BEAT / 8, j++) timpani('music', t, 33, { gain: 0.04 + 0.12 * ((t - swell) / sw), decay: 0.4 });
  // TRIUMPHANT D major: choir + brass + timpani + crash
  const hold = D.start + 3 * BAR - lift; // ring until the cowboy's reaction (30.0)
  choir('music', lift, [50, 57, 62, 66, 69, 74, 78], hold, { gain: 0.5, attack: 0.05, release: 1.2, voices: 4, width: 0.95, hall: 0.5 });
  brass('music', lift, [38, 50, 57, 62, 66, 69], 1.2, { gain: 0.24, bright: 1.4, attack: 0.012, release: 0.6 });
  timpani('music', lift, 38, { gain: 0.5, decay: 0.9 });
  kick('music', lift, { gain: 0.55, punch: 1.2, decay: 0.4 });
  cymbal('music', lift, { gain: 0.22, decay: 2.4, hall: 0.2 });
  pad('music', lift, hold, [50, 57, 62, 66, 69], { gain: 0.06, attack: 0.3, release: 1.0, cut: 2400, hall: 0.2 });
  // angelic shimmer: high glock arpeggios over the held chord
  const ARP = [86, 90, 93, 98, 93, 90, 88, 93];
  for (let t = lift + BEAT, j = 0; t < D.start + 3 * BAR - 1e-6; t += BEAT / 4, j++)
    glock('music', t, ARP[j % 8] + (j >= 8 ? 2 * (j % 2) : 0), { gain: 0.05, pan: j % 2 ? 0.5 : -0.5, decay: 0.7, hall: 0.5, delay: 0.1 });
  // the cowboy, shocked: dominant pedal, quiet
  const shock = D.start + 3 * BAR;
  pad('music', shock, BAR - 0.1, [45, 52, 57, 61], { gain: 0.085, attack: 0.4, release: 0.1, cut: 1500 });
  tremolo('music', shock, [45, 57], BAR - 0.05, { gain: 0.06, attack: 0.5, release: 0.05, cresc: (t) => 0.5 + t / BAR, hall: 0.2 });
  // snare roll + bass build into E
  const roll = D.end - BAR / 2;
  snareRoll('music', roll, D.end - roll, { g0: 0.05, g1: 0.3 });
  for (let t = roll, j = 0; t < D.end - 1e-6; t += BEAT / 2, j++) bass('music', t, 33, BEAT * 0.4, { gain: 0.14 + 0.04 * j });
  brass('music', roll, [57, 61, 64, 67], D.end - roll, { gain: 0.12, attack: 0.8, release: 0.03, bright: 1.0 });
}

// ── E: push (32-38) ─────────────────────────────────────────────────
function scoreE() {
  const E = sec('E'), fan = cueT('fireworks', E.start, E.start + 2 * BAR);
  cymbal('music', E.start, { gain: 0.2, decay: 1.8 });
  // hook bars 1 and 3: D for a bar, then G -> A, landing on the fanfare
  const chords = [['D', 'D'], ['G', 'A']];
  for (let k = 0; E.start + k * BAR < fan - 1e-6; k++) {
    const t = E.start + k * BAR;
    drumBar('music', t, 'E');
    chords[k % 2].forEach((c, h) => {
      for (let j = 0; j < 4; j++) bass('music', t + h * BAR / 2 + (j * BEAT) / 2, CH[c].root + (j % 2 ? 12 : 0), BEAT * 0.42, { gain: 0.28 });
      for (const x of [0.5, 1.5]) brass('music', t + h * BAR / 2 + x * BEAT, CH[c].stab, 0.16, { gain: 0.09, bright: 1.3 });
      pad('music', t + (h * BAR) / 2, BAR / 2, CH[c].stab, { gain: 0.045, attack: 0.05, release: 0.2, cut: 2200 });
    });
  }
  playHook(E.start, [0, 2], (t, d, m, p) => {
    lead('music', t, m, d * 0.92, { gain: 0.12, from: glideFrom(p, m), cut: 4200, delay: 0.14 });
    brass('music', t, [m - 12], d * 0.9, { gain: 0.1, bright: 1.2, room: 0.25 });
  }, fan);
  // VICTORY FANFARE: ta-ta-TAAA on D major + timpani, then a tom fill into F
  const F = sec('F');
  [[0, 0.22], [0.5, 0.22], [1, F.start - fan - BEAT * 1.6]].forEach(([b, l], j) => {
    brass('music', fan + b * BEAT, [38, 50, 57, 62, 66, 69, 74], l, { gain: 0.3, bright: 1.5, attack: 0.008, release: 0.25, hall: 0.25 });
    lead('music', fan + b * BEAT, j === 2 ? 81 : 74, l, { gain: 0.1, cut: 5000 });
    timpani('music', fan + b * BEAT, j === 2 ? 38 : 45, { gain: 0.4, decay: 1.0 });
    kick('music', fan + b * BEAT, { gain: 0.5, punch: 1.2 });
  });
  choir('music', fan + BEAT, [62, 66, 69, 74], F.start - fan - BEAT * 1.6, { gain: 0.3, attack: 0.08, release: 0.5 });
  [45, 43, 41, 38, 45, 41, 38, 36].forEach((m, j) => tom('music', F.start - BEAT * 1.2 + j * BEAT / 4 * 0.6, m + 12, { gain: 0.16 + 0.03 * j, pan: 0.5 - j * 0.14 }));
}

// ── F: Play of the Game (38-44) ─────────────────────────────────────
function scoreF() {
  const F = sec('F'), slam = cueT('slam', F.start, F.start + BAR / 2), theme = Math.ceil(slam / BAR - 1e-9) * BAR;
  // sting: short orchestral hit
  brass('music', F.start, [38, 50, 57, 62, 66, 69, 74], 0.28, { gain: 0.3, bright: 1.6, attack: 0.005, release: 0.35, hall: 0.3 });
  choir('music', F.start, [62, 66, 69, 74], 0.2, { gain: 0.3, voices: 3, release: 0.6, env: (t) => perc(t, 0.01, 0.35) });
  timpani('music', F.start, 38, { gain: 0.45 });
  // speed-band build into the slam
  riser('music', F.start + BEAT / 2, slam - F.start - BEAT / 2, { gain: 0.09, f0: 500, f1: 9000 });
  snareRoll('music', F.start + BEAT, slam - F.start - BEAT, { g0: 0.05, g1: 0.26 });
  // SLAM: massive D major held to the next bar line
  const hold = theme - slam;
  brass('music', slam, [38, 50, 57, 62, 66, 69, 74, 78], hold, { gain: 0.32, bright: 1.6, attack: 0.006, release: 0.3, hall: 0.3 });
  choir('music', slam, [50, 57, 62, 66, 69, 74, 78], hold, { gain: 0.42, attack: 0.03, release: 0.4, hall: 0.4 });
  timpani('music', slam, 38, { gain: 0.55 }); timpani('music', slam + BEAT, 45, { gain: 0.35 });
  cymbal('music', slam, { gain: 0.2, decay: 2.0 });
  // the theme, brass + choir in octaves, half-time drums
  const G = sec('G');
  cymbal('music', theme, { gain: 0.2, decay: 1.8 });
  const chords = [['D', 'D'], ['G', 'A']];
  for (let k = 0; theme + k * BAR < F.end - 1e-6; k++) {
    const t = theme + k * BAR;
    drumBar('music', t, 'F');
    chords[k % 2].forEach((c, h) => {
      const th = t + (h * BAR) / 2;
      for (let j = 0; j < 4; j++) bass('music', th + (j * BEAT) / 2, CH[c].root + (j === 2 ? 12 : 0), BEAT * 0.45, { gain: 0.28 });
      pad('music', th, BAR / 2, CH[c].stab, { gain: 0.06, attack: 0.05, release: 0.3, cut: 2400 });
      choir('music', th, CH[c].stab.map((x) => x - 12), BAR / 2, { gain: 0.16, attack: 0.08, release: 0.3, vowel: 'oh', voices: 2 });
    });
  }
  playHook(theme, [0, 3], (t, d, m) => {
    brass('music', t, [m - 12, m], d * 0.92, { gain: 0.2, bright: 1.35, spread: 0.25, hall: 0.2 });
    choir('music', t, [m], d * 0.95, { gain: 0.16, attack: 0.04, release: 0.25, voices: 3, hall: 0.3 });
  }, F.end);
  // tom fill + swell into the outro
  [50, 47, 45, 43, 41, 38].forEach((m, j) => tom('music', G.start - BEAT + (j * BEAT) / 6, m, { gain: 0.18 + 0.03 * j, pan: -0.5 + j * 0.2 }));
}

// ── G: outro (44-50) ─────────────────────────────────────────────────
function scoreG() {
  const G = sec('G'), stop = cueT('scratch', G.start, G.start + 1.5 * BAR), coda = cueT('crash', stop, stop + BAR / 2);
  // cute plucky hook: marimba melody + pizzicato octave, light percussion, pizz bass
  playHook(G.start, [0, 1], (t, d, m) => {
    marimba('music', t, m, { gain: 0.24, pan: 0.15, delay: 0.08 });
    ks('music', t, m - 12, { gain: 0.1, decay: 0.35, bright: 0.45, pan: -0.2 });
  }, stop);
  const prog = ['D', 'C'];
  for (let k = 0; G.start + k * BAR < stop - 1e-6; k++) {
    const t = G.start + k * BAR, c = CH[prog[k % 2]];
    drumBar('music', t, 'G');
    for (let j = 0; j < 4; j++) if (t + j * BEAT < stop - 1e-6) {
      ks('music', t + j * BEAT, c.root + (j % 2 ? 7 : 0), { gain: 0.3, decay: 0.5, bright: 0.35 });
      marimba('music', t + j * BEAT + BEAT / 2, c.stab[1 + (j % 3)], { gain: 0.08, pan: -0.35 });
    }
  }
  // final warm D major chord after the dead stop (coda bus: not gated), rings into the master fade
  const ring = DUR - coda;
  pad('coda', coda, ring, [38, 50, 57, 62, 66, 69], { gain: 0.11, attack: 0.03, release: 0.3, cut: (t) => 2600 - 1400 * smooth(t / ring), hall: 0.35 });
  choir('coda', coda, [62, 66, 69, 74], ring, { gain: 0.28, attack: 0.12, release: 0.5, hall: 0.4 });
  brass('coda', coda, [50, 57, 62, 66], ring - 0.4, { gain: 0.12, attack: 0.05, bright: 0.8, release: 0.6, hall: 0.3 });
  [50, 57, 62, 66, 69, 74, 78, 81, 86].forEach((m, j) => ks('coda', coda + j * 0.035, m, { gain: 0.11, decay: 2.5, bright: 0.6, pan: -0.6 + j * 0.15, hall: 0.3 }));
  [86, 90, 93, 98].forEach((m, j) => glock('coda', coda + 0.25 + j * 0.12, m, { gain: 0.05, pan: j % 2 ? 0.4 : -0.4, hall: 0.5 }));
  timpani('coda', coda, 38, { gain: 0.3, decay: 1.6 });
  bass('coda', coda, 38, ring - 0.3, { gain: 0.18, cut: 300, env: 400 });
}

// ════════════════════════════ 7. mixdown + master ════════════════════════════
// Chain: buses -> reverbs/delay -> groove filter-down -> music fader x duck x dead-stop gate -> sum with SFX + coda
//        -> 22 Hz DC/subsonic HPF -> soft-knee compressor -> tanh soft clip -> 18.5 kHz LPF -> -1 dBTP normalise -> fade.
const DB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '-inf');

/** Gain curve (linear) that dips the music under each SFX cue by DUCK[type] dB. */
function duckCurve() {
  const g = new Float32Array(N).fill(1);
  for (const c of CUE_LIST) {
    const depth = DUCK[c.type] ?? DUCK_DEFAULT;
    if (!depth) continue;
    const hold = 0.08 + (c.p.dur ?? 0), pre = c.type === 'slam' ? 0.2 : 0.012, rel = 0.35;
    const i0 = Math.max(0, sec2n(c.t - pre)), i1 = Math.min(N, sec2n(c.t + hold + rel * 4));
    for (let i = i0; i < i1; i++) {
      const t = i / SR - c.t;
      const amt = t < 0 ? smooth((t + pre) / pre) : t < hold ? 1 : Math.exp(-(t - hold) / rel);
      g[i] = Math.min(g[i], db(-depth * amt));
    }
  }
  const sm = new OnePole(40); // smooth any corners
  sm.y = 1;
  for (let i = 0; i < N; i++) g[i] = sm.lp(g[i]);
  return g;
}

/** Run every family's sends through its reverbs/delay into its dry bus. */
function processSends() {
  const room = { fb: 0.82, damp: 0.35, predelay: 0.012, hp: 200, lp: 8000 };
  const hall = { fb: 0.905, damp: 0.28, predelay: 0.03, hp: 160, lp: 7000 };
  for (const fam of ['music', 'groove', 'sfx', 'coda']) {
    const s = SEND[fam], b = BUS[fam];
    applyReverb(s.room, b.L, b.R, room);
    applyReverb(s.hall, b.L, b.R, fam === 'sfx' ? { ...hall, fb: 0.925, predelay: 0.04 } : hall);
    if (s.delay.some((v) => v !== 0)) applyPingPong(s.delay, b.L, b.R, { time: 0.75 * BEAT, fb: 0.38 });
  }
}

/** B->C turn: groove lowpass sweeps down and fades out; then it joins the music bus. */
function mergeGroove() {
  const turn = sec('B->C'), g = BUS.groove, m = BUS.music;
  const fl = new SVF(), fr = new SVF(), fl2 = new SVF(), fr2 = new SVF();
  for (let i = 0; i < N; i++) {
    const t = i / SR, u = clamp((t - turn.start) / (turn.end - turn.start), 0, 1);
    const fc = 18000 * Math.pow(160 / 18000, u), amp = 1 - smooth(u * 1.05);
    let l = g.L[i], r = g.R[i];
    if (u > 0) { l = fl2.run(fl.run(l, fc, 0.9), fc, 0.6); r = fr2.run(fr.run(r, fc, 0.9), fc, 0.6); }
    else { fl.run(l, fc, 0.9); fl2.run(fl.lp, fc, 0.6); fr.run(r, fc, 0.9); fr2.run(fr.lp, fc, 0.6); }
    m.L[i] += l * amp; m.R[i] += r * amp;
  }
}

/** Debug: per-cue SFX level vs the (ducked, gated) music under it, over the first 150 ms of the cue. */
function cueReport(duck, gateN) {
  console.log('cue report: loudest 20 ms block of the SFX bus near each cue vs the music in that block (dB)');
  const blk = sec2n(0.02);
  for (const c of CUE_LIST) {
    let best = { s: -Infinity, m: -Infinity, at: c.t };
    for (let a = sec2n(c.t - 0.02); a < sec2n(c.t + 0.5 + Math.min(1, c.p.dur ?? 0)); a += blk) {
      let es = 0, em = 0;
      for (let i = Math.max(0, a); i < Math.min(N, a + blk); i++) {
        const g = (i < gateN ? 1 : 0) * duck[i] * faderAt(i / SR);
        es += BUS.sfx.L[i] ** 2 + BUS.sfx.R[i] ** 2;
        em += (BUS.music.L[i] * g + BUS.coda.L[i]) ** 2 + (BUS.music.R[i] * g + BUS.coda.R[i]) ** 2;
      }
      const s = DB(Math.sqrt(es / (2 * blk))), m = DB(Math.sqrt(em / (2 * blk)));
      if (s > best.s) best = { s, m, at: a / SR };
    }
    best.pk = peakDb(BUS.sfx.L, BUS.sfx.R, c.t - 0.02, c.t + 0.5);
    console.log(`  ${c.t.toFixed(2).padStart(6)} ${c.type.padEnd(10)} @${best.at.toFixed(2)}  sfx ${fmt(best.s).padStart(6)}  music ${fmt(best.m).padStart(6)}  margin ${fmt(best.s - best.m).padStart(6)}   sfx peak ${fmt(best.pk).padStart(5)}`);
  }
}

function master() {
  const stop = cueT('scratch', sec('G').start, sec('G').start + 1.5 * BAR), duck = duckCurve();
  const gateN = sec2n(stop), ramp = sec2n(0.006);
  if (process.env.CUE_REPORT) cueReport(duck, gateN);
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const gate = i < gateN ? 1 : i < gateN + ramp ? 1 - (i - gateN) / ramp : 0; // the dead stop
    const mg = gate * duck[i] * faderAt(i / SR);
    L[i] = BUS.music.L[i] * mg + BUS.sfx.L[i] + BUS.coda.L[i];
    R[i] = BUS.music.R[i] * mg + BUS.sfx.R[i] + BUS.coda.R[i];
  }
  // DC blocker / subsonic filter
  const hl = new Biquad('hp', 22, 0.7), hr = new Biquad('hp', 22, 0.7);
  for (let i = 0; i < N; i++) { L[i] = hl.run(L[i]); R[i] = hr.run(R[i]); }
  // pre-normalise so the compressor threshold means something
  let pk = 0;
  for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const pre = 0.9 / pk;
  // gentle stereo-linked compressor (soft knee) then tanh soft clip
  const thr = -13, ratio = 2.2, knee = 6, att = Math.exp(-1 / (0.004 * SR)), rel = Math.exp(-1 / (0.16 * SR));
  let env = 0, maxGR = 0;
  for (let i = 0; i < N; i++) {
    const l = L[i] * pre, r = R[i] * pre, lvl = Math.max(Math.abs(l), Math.abs(r));
    env = lvl > env ? att * env + (1 - att) * lvl : rel * env + (1 - rel) * lvl;
    const x = DB(env + 1e-12) - thr;
    const over = x <= -knee / 2 ? 0 : x >= knee / 2 ? x : ((x + knee / 2) ** 2) / (2 * knee);
    const gr = over * (1 - 1 / ratio);
    maxGR = Math.max(maxGR, gr);
    const g = db(-gr);
    L[i] = Math.tanh(1.15 * l * g) / Math.tanh(1.15);
    R[i] = Math.tanh(1.15 * r * g) / Math.tanh(1.15);
  }
  // gentle 18.5 kHz lowpass (keeps clipped/saturated grit away from Nyquist), then normalise to -1 dBTP
  const ll = new Biquad('lp', 18500, 0.7), lr = new Biquad('lp', 18500, 0.7);
  for (let i = 0; i < N; i++) { L[i] = ll.run(L[i]); R[i] = lr.run(R[i]); }
  const norm = db(-1) / truePeak(L, R).peak;
  // fade to digital silence over the last second (exact zeros for the final 20 ms)
  const f0 = DUR - 1.0, f1 = DUR - 0.02;
  for (let i = 0; i < N; i++) {
    const t = i / SR, u = clamp((t - f0) / (f1 - f0), 0, 1), fg = t >= f1 ? 0 : Math.cos((Math.PI / 2) * u) ** 2;
    L[i] *= norm * fg; R[i] *= norm * fg;
  }
  return { L, R, maxGR };
}

/** True-peak estimate via 4x oversampling (Hann-windowed sinc, 32 taps per phase). Returns { peak, at }. */
function truePeak(L, R) {
  const P = 4, T = 16, rows = [];
  for (let ph = 1; ph < P; ph++) {
    const row = new Float64Array(2 * T);
    for (let j = 0; j < 2 * T; j++) { const x = ph / P - (j - T + 1); row[j] = (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)) * (0.5 + 0.5 * Math.cos((Math.PI * x) / T)); }
    rows.push(row);
  }
  let peak = 0, at = 0;
  for (const ch of [L, R]) for (let n = T; n < N - T; n++) {
    if (Math.abs(ch[n]) > peak) { peak = Math.abs(ch[n]); at = n; }
    let loc = 0;
    for (let j = -2; j <= 3; j++) loc = Math.max(loc, Math.abs(ch[n + j]));
    if (loc * 1.8 < peak) continue; // interpolation can't reach the current peak from here
    for (const row of rows) {
      let y = 0;
      for (let j = 0; j < 2 * T; j++) y += row[j] * ch[n + j - T + 1];
      if (Math.abs(y) > peak) { peak = Math.abs(y); at = n; }
    }
  }
  return { peak, at: at / SR };
}

function rmsDb(L, R, t0, t1) {
  const a = Math.max(0, sec2n(t0)), b = Math.min(N, sec2n(t1));
  let s = 0;
  for (let i = a; i < b; i++) s += L[i] * L[i] + R[i] * R[i];
  return DB(Math.sqrt(s / Math.max(1, 2 * (b - a))));
}
function peakDb(L, R, t0, t1) {
  const a = Math.max(0, sec2n(t0)), b = Math.min(N, sec2n(t1));
  let p = 0;
  for (let i = a; i < b; i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i]));
  return DB(p);
}

function main() {
  const t0 = Date.now();
  const lap = (msg) => console.log(`  ${((Date.now() - t0) / 1000).toFixed(1).padStart(5)}s  ${msg}`);
  console.log(`Support Main soundtrack: ${DUR}s @ ${SR} Hz, ${BPM} BPM, ${CUE_LIST.length} cues`);
  for (const [name, fn] of [['A spawn room', scoreA], ['B main street', scoreB], ['C high noon', scoreC], ['D heroes never die', scoreD],
    ['E push', scoreE], ['F play of the game', scoreF], ['G outro', scoreG]]) { fn(); lap('score ' + name); }
  const missing = new Set();
  for (const c of CUE_LIST) {
    sfxLevel = db(SFX_TRIM[c.type] ?? 0);
    if (SFX[c.type]) SFX[c.type](c.t, c.p); else missing.add(c.type);
  }
  sfxLevel = 1;
  if (missing.size) console.warn('  WARNING: no SFX for cue types: ' + [...missing].join(', '));
  lap('sfx');
  // pre-master bus levels (for balancing)
  const busStats = CUES.sections.map((s) => `${s.name.split(' ')[0].padEnd(5)} music ${fmt(rmsDb(BUS.music.L, BUS.music.R, s.start, s.end)).padStart(6)}  groove ${fmt(rmsDb(BUS.groove.L, BUS.groove.R, s.start, s.end)).padStart(6)}  sfx ${fmt(rmsDb(BUS.sfx.L, BUS.sfx.R, s.start, s.end)).padStart(6)} (pk ${fmt(peakDb(BUS.sfx.L, BUS.sfx.R, s.start, s.end))})`);
  processSends(); lap('reverbs + delay');
  mergeGroove();
  const { L, R, maxGR } = master(); lap('master');
  writeWav(OUT_FILE, L, R); lap('wrote ' + OUT_FILE);

  // ── stats ──
  let nan = 0, clip = 0, sumL = 0, sumR = 0, pk = 0;
  for (let i = 0; i < N; i++) {
    if (!Number.isFinite(L[i]) || !Number.isFinite(R[i])) nan++;
    if (Math.abs(L[i]) >= 0.9999 || Math.abs(R[i]) >= 0.9999) clip++;
    sumL += L[i]; sumR += R[i]; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  }
  console.log(`\nformat     : ${N} frames = ${(N / SR).toFixed(3)} s, ${SR} Hz, 2 ch, 16-bit PCM`);
  console.log(`peak       : ${fmt(DB(pk), 2)} dBFS   NaN/Inf: ${nan}   clipped samples: ${clip}   max comp GR: ${fmt(maxGR, 1)} dB`);
  console.log(`DC offset  : L ${(sumL / N).toExponential(2)}  R ${(sumR / N).toExponential(2)}`);
  const tp = truePeak(L, R);
  console.log(`true peak  : ${fmt(DB(tp.peak), 2)} dBTP at ${tp.at.toFixed(3)} s (4x oversampled)`);
  console.log('pre-master bus RMS (dBFS, before normalisation):');
  busStats.forEach((s) => console.log('  ' + s));
  console.log('final RMS / peak per section:');
  for (const s of CUES.sections) console.log(`  ${s.name.padEnd(22)} ${String(s.start).padStart(4)}-${String(s.end).padEnd(4)}  RMS ${fmt(rmsDb(L, R, s.start, s.end)).padStart(6)} dB   peak ${fmt(peakDb(L, R, s.start, s.end)).padStart(6)} dB`);
  const peaks = [];
  for (let a = 0; a < N; a += sec2n(0.25)) peaks.push([a / SR, peakDb(L, R, a / SR, a / SR + 0.25)]);
  console.log('loudest 0.25 s windows: ' + peaks.sort((x, y) => y[1] - x[1]).slice(0, 10).map(([t, p]) => `${t.toFixed(2)}s ${fmt(p)}`).join(', '));
  // hit alignment: onset = 1 ms step with the largest energy jump (next 5 ms vs previous 20 ms) near each cue
  const hits = CUE_LIST.filter((c) => ['clank', 'gunshot', 'slam', 'boom', 'bonk', 'bell', 'sting', 'thud'].includes(c.type));
  const energy = (a, b) => { let e = 0; for (let i = Math.max(0, sec2n(a)); i < Math.min(N, sec2n(b)); i++) e += L[i] * L[i] + R[i] * R[i]; return e; };
  console.log('hit onsets (ms offset from cue): ' + hits.map((c) => {
    let best = -Infinity, on = c.t;
    for (let a = c.t - 0.03; a < c.t + 0.05; a += 0.001) {
      const jump = energy(a, a + 0.005) / 5 / (energy(a - 0.02, a) / 20 + 1e-9);
      if (jump > best) { best = jump; on = a; }
    }
    return `${c.type}@${c.t} ${((on - c.t) * 1000).toFixed(0)}`;
  }).join(', '));
  const stop = cueT('scratch', sec('G').start, sec('G').start + 1.5 * BAR), lastShot = Math.max(...cueTimes('gunshot'), sec('C').start);
  console.log('checkpoints:');
  for (const [label, a, b] of [['after the shots', lastShot + 0.6, sec('C').end], ['dead stop (after scratch)', stop + 0.36, stop + 0.5],
    ['fade 49.0-49.5', DUR - 1, DUR - 0.5], ['fade 49.5-50.0', DUR - 0.5, DUR], ['last 20 ms', DUR - 0.02, DUR]])
    console.log(`  ${label.padEnd(26)} ${a.toFixed(2)}-${b.toFixed(2)}  RMS ${fmt(rmsDb(L, R, a, b)).padStart(7)} dB   peak ${fmt(peakDb(L, R, a, b)).padStart(7)} dB`);
}

main();
