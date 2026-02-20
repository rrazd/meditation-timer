// src/audio-ambient.ts
// Procedural ambient audio paired 1:1 with nature scenes.
// Uses AudioBufferSourceNode with loop=true for gapless playback.
// Each scene uses filtered white noise shaped by a BiquadFilterNode.
import type { SceneName } from './scenes/scene.interface.js';

const BUFFER_DURATION_S = 90;    // 90 s makes looping imperceptible
const FADE_IN_S = 2.0;
const FADE_OUT_S = 1.5;
const PEAK_GAIN = 0.55;          // below chime's 0.72 — ambient must not mask the chime
const LOOP_FADE_SAMPLES = 512;   // ~11.6 ms cosine fade at loop boundary — eliminates click

// Module-level state — one ambient session at a time
let activeSource: AudioBufferSourceNode | null = null;
let activeMasterGain: GainNode | null = null;

// Cache buffers across sessions — buffer content is equivalent each regeneration,
// but caching avoids ~10–30 ms main-thread work on session restart.
const bufferCache = new Map<SceneName, AudioBuffer>();

/**
 * Start looping ambient audio for the given scene.
 * Stops any currently playing ambient first.
 * Safe to call before initAudio only if ctx is guaranteed non-null by the caller.
 */
export async function startAmbient(ctx: AudioContext, sceneName: SceneName): Promise<void> {
  stopAmbient(ctx); // clean up any running session

  let buffer = bufferCache.get(sceneName);
  if (!buffer) {
    buffer = await buildSceneBuffer(ctx, sceneName);
    bufferCache.set(sceneName, buffer);
  }

  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  const now = ctx.currentTime;
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(PEAK_GAIN, now + FADE_IN_S);

  const { input, output } = createFilterChain(ctx, sceneName);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.loopStart = 0;
  source.loopEnd = buffer.duration;
  source.connect(input);
  output.connect(masterGain);
  source.start();

  activeSource = source;
  activeMasterGain = masterGain;
}

/**
 * Fade out and stop the current ambient session.
 * fadeDurationS defaults to FADE_OUT_S (1.5 s) for normal stops.
 * Pass a longer value (e.g. 8 s) for the end-of-session crossfade with the OM.
 * Safe to call when nothing is playing (no-op).
 */
export function stopAmbient(ctx: AudioContext, fadeDurationS: number = FADE_OUT_S): void {
  // Capture references before nulling — prevents source node leak if called twice
  const src = activeSource;
  const gain = activeMasterGain;
  activeSource = null;
  activeMasterGain = null;

  if (!src || !gain) return;

  const now = ctx.currentTime;

  // cancelAndHoldAtTime safely interrupts an in-progress fade-in
  try {
    gain.gain.cancelAndHoldAtTime(now);
  } catch {
    // Fallback for browsers that don't support cancelAndHoldAtTime
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
  }

  gain.gain.linearRampToValueAtTime(0, now + fadeDurationS);
  src.stop(now + fadeDurationS + 0.05);
}

// ── Private ─────────────────────────────────────────────────────────────────

async function loadFileBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

async function buildSceneBuffer(ctx: AudioContext, sceneName: SceneName): Promise<AudioBuffer> {
  switch (sceneName) {
    case 'rain':
      try { return await loadFileBuffer(ctx, '/audio/rain-ambient.mp3'); }
      catch { return buildRainBuffer(ctx); }
    case 'forest':
      try { return await loadFileBuffer(ctx, '/audio/forest-ambient.mp3'); }
      catch { return buildForestBuffer(ctx); }
    case 'ocean':
      try { return await loadFileBuffer(ctx, '/audio/ocean-ambient.mp3'); }
      catch { return makeNoiseBuffer(ctx); }
  }
}

// Synthesises a forest ambient buffer — rustling leaves, distant wind through
// canopy, and occasional soft scurrying textures.
//
// The key to not sounding like rain: leaf rustle lives in a narrow high-mid band
// (1.5–5 kHz) with very uneven amplitude modulation (gusts), while the overall
// level is LOW so the space feels open rather than enveloping.
//
// Layer 1 — Wind through canopy: brown-ish (LP at 900 Hz) noise, very slow AM
// Layer 2 — Leaf rustle: narrow bandpass 1.8–4.5 kHz, gust-modulated
// Layer 3 — Distant air movement: sub-bass rumble <120 Hz, extremely quiet
function buildForestBuffer(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * BUFFER_DURATION_S);
  const buf = ctx.createBuffer(1, length, sr);
  const data = buf.getChannelData(0);

  // ── Layer 1: Wind body — lowpass filtered pink noise <900 Hz ─────────────
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  const aWind = 1 - Math.exp(-2 * Math.PI * 900 / sr);
  let lpWind = 0;
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1;
    b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
    b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
    b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
    const pink = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
    b6 = w*0.115926;
    lpWind = aWind * pink + (1 - aWind) * lpWind;
    // Very slow gust envelope (0.1–0.4 Hz)
    const t = i / sr;
    const gust = 0.55 + 0.30*Math.sin(2*Math.PI*0.18*t+0.4)
                      + 0.15*Math.sin(2*Math.PI*0.37*t+1.8);
    data[i] = lpWind * gust * 0.55;
  }

  // ── Layer 2: Leaf rustle — bandpass 1.8–4.5 kHz, burst-modulated ─────────
  const aHi2 = 1 - Math.exp(-2 * Math.PI * 4500 / sr);
  const aLo2 = 1 - Math.exp(-2 * Math.PI * 1800 / sr);
  let lpH2 = 0, lpL2 = 0;
  for (let i = 0; i < length; i++) {
    const n = Math.random() * 2 - 1;
    lpH2 = aHi2 * n + (1 - aHi2) * lpH2;
    lpL2 = aLo2 * n + (1 - aLo2) * lpL2;
    const t = i / sr;
    // Irregular gust bursts — 3 sine waves with incommensurate periods
    const rustle = Math.max(0,
      0.30*Math.sin(2*Math.PI*0.22*t+0.7) +
      0.40*Math.sin(2*Math.PI*0.51*t+2.1) +
      0.30*Math.sin(2*Math.PI*0.13*t+1.3)
    );
    data[i] += (lpH2 - lpL2) * rustle * 0.28;
  }

  // ── Layer 3: Deep air rumble <120 Hz ─────────────────────────────────────
  const aRumble = 1 - Math.exp(-2 * Math.PI * 120 / sr);
  let lpRumble = 0;
  for (let i = 0; i < length; i++) {
    lpRumble = aRumble * (Math.random()*2-1) + (1-aRumble)*lpRumble;
    data[i] += lpRumble * 0.04;
  }

  // Normalise and loop fade
  let peak = 0;
  for (let i = 0; i < length; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; }
  if (peak > 0) { const s = 0.82/peak; for (let i = 0; i < length; i++) data[i] *= s; }
  for (let i = 0; i < LOOP_FADE_SAMPLES; i++) {
    const fade = 0.5 - 0.5*Math.cos(Math.PI*i/LOOP_FADE_SAMPLES);
    data[i] *= fade; data[length-1-i] *= fade;
  }
  return buf;
}

// Synthesises a 25-second rain buffer using pink noise + spectral shaping.
// Individual resonator drops sound like a concentrated stream; rain is actually
// the aggregate of thousands of overlapping micro-impacts, which is perceptually
// indistinguishable from shaped noise.
//
// Approach:
//   1. Pink noise (Paul Kellet 7-stage IIR) — natural −3 dB/oct slope.
//   2. Bandpass via LP subtraction: LP@7 kHz minus LP@180 Hz removes sub-bass
//      and harsh hiss, leaving the 200 Hz–7 kHz "rain window".
//   3. Slow AM (0.3–1 Hz composite) — gentle intensity swell, like gusts.
function buildRainBuffer(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const length = Math.floor(sr * BUFFER_DURATION_S);
  const buf = ctx.createBuffer(1, length, sr);
  const data = buf.getChannelData(0);

  // ── Pink noise (Paul Kellet approximation) ────────────────────────────────
  let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
  for (let i = 0; i < length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886*b0 + w*0.0555179;
    b1 = 0.99332*b1 + w*0.0750759;
    b2 = 0.96900*b2 + w*0.1538520;
    b3 = 0.86650*b3 + w*0.3104856;
    b4 = 0.55000*b4 + w*0.5329522;
    b5 = -0.7616*b5 - w*0.0168980;
    data[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362) * 0.11;
    b6 = w * 0.115926;
  }

  // ── Bandpass: LP@7 kHz minus LP@180 Hz ───────────────────────────────────
  const aHi  = 1 - Math.exp(-2 * Math.PI * 7000 / sr);
  const aLo  = 1 - Math.exp(-2 * Math.PI * 180  / sr);
  let lpHi = 0, lpLo = 0;
  for (let i = 0; i < length; i++) {
    lpHi = aHi * data[i] + (1 - aHi) * lpHi;
    lpLo = aLo * data[i] + (1 - aLo) * lpLo;
    data[i] = lpHi - lpLo;
  }

  // ── Slow amplitude modulation — organic gust variation ────────────────────
  for (let i = 0; i < length; i++) {
    const t = i / sr;
    const mod = 0.84
      + 0.10 * Math.sin(2 * Math.PI * 0.38 * t + 0.6)
      + 0.06 * Math.sin(2 * Math.PI * 0.91 * t + 2.0);
    data[i] *= mod;
  }

  // Normalise to peak 0.85
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0) {
    const scale = 0.85 / peak;
    for (let i = 0; i < length; i++) data[i] *= scale;
  }

  // Cosine fade at loop boundary
  for (let i = 0; i < LOOP_FADE_SAMPLES; i++) {
    const fade = 0.5 - 0.5 * Math.cos(Math.PI * i / LOOP_FADE_SAMPLES);
    data[i] *= fade;
    data[length - 1 - i] *= fade;
  }

  return buf;
}

/**
 * Synthesise a distant wolf howl: pitch sweeps up from ~230 Hz to ~500 Hz,
 * holds with 5 Hz vibrato, then slowly descends.  Low-pass filtered and quiet
 * so it sits far back in the forest soundscape.
 */
export function playWolfHowl(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const durS      = 2.4 + Math.random() * 1.2;   // 2.4–3.6 s
  const f0Start   = 220 + Math.random() * 70;     // 220–290 Hz
  const f0Peak    = 420 + Math.random() * 140;    // 420–560 Hz
  const riseTime  = 0.38 + Math.random() * 0.22;  // 0.38–0.6 s pitch rise
  const holdEnd   = durS - 0.55;                  // start of final fall

  // Master envelope — soft, distant
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(0.066, now + 0.28);      // attack (70% quieter)
  env.gain.setValueAtTime(0.066, now + holdEnd);
  env.gain.linearRampToValueAtTime(0, now + durS);          // release

  // Distance filter — lowpass strips high harmonics
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 1100;
  lpf.Q.value = 0.6;

  // Fundamental (sine)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(f0Start, now);
  osc1.frequency.linearRampToValueAtTime(f0Peak, now + riseTime);
  osc1.frequency.setValueAtTime(f0Peak, now + holdEnd);
  osc1.frequency.linearRampToValueAtTime(f0Peak * 0.82, now + durS);
  const g1 = ctx.createGain(); g1.gain.value = 0.70;

  // Second harmonic — adds warmth
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(f0Start * 2, now);
  osc2.frequency.linearRampToValueAtTime(f0Peak * 2, now + riseTime);
  osc2.frequency.setValueAtTime(f0Peak * 2, now + holdEnd);
  osc2.frequency.linearRampToValueAtTime(f0Peak * 2 * 0.82, now + durS);
  const g2 = ctx.createGain(); g2.gain.value = 0.22;

  // Vibrato LFO — 5 Hz, starts after pitch rise so the climb is clean
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0, now + riseTime);
  lfoGain.gain.linearRampToValueAtTime(9, now + riseTime + 0.18); // ramp in vibrato
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);
  lfoGain.connect(osc2.frequency);

  osc1.connect(g1); g1.connect(lpf);
  osc2.connect(g2); g2.connect(lpf);
  lpf.connect(env);
  env.connect(ctx.destination);

  osc1.start(now); osc1.stop(now + durS + 0.05);
  osc2.start(now); osc2.stop(now + durS + 0.05);
  lfo.start(now);  lfo.stop(now + durS + 0.05);
}


function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * BUFFER_DURATION_S);
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);

  // White noise: uniform random samples in [-1, 1]
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  // Cosine fade at loop boundary — guarantees zero-crossing so loop=true produces no click
  for (let i = 0; i < LOOP_FADE_SAMPLES; i++) {
    const fade = 0.5 - 0.5 * Math.cos(Math.PI * i / LOOP_FADE_SAMPLES); // 0 → 1
    data[i] *= fade;                   // fade in at buffer start
    data[length - 1 - i] *= fade;     // fade out at buffer end
  }

  return buf;
}

function createFilterChain(
  ctx: AudioContext,
  sceneName: SceneName,
): { input: AudioNode; output: AudioNode } {
  switch (sceneName) {
    case 'rain': {
      // Drops are pre-shaped by the resonator in buildRainBuffer.
      // A highpass at 80 Hz removes DC offset and sub-bass rumble only.
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 80;
      f.Q.value = 0.5;
      return { input: f, output: f };
    }
    case 'forest': {
      // Buffer is pre-shaped by buildForestBuffer.
      // A gentle highpass removes DC; the buffer content provides all timbre.
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 60;
      f.Q.value = 0.5;
      return { input: f, output: f };
    }
    case 'ocean': {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 200; // low oceanic rumble
      f.Q.value = 0.5;         // wide band
      return { input: f, output: f };
    }
  }
}
