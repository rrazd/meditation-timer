// src/audio.ts
// Web Audio API — lazy AudioContext, session-end tone synthesized via oscillators (no audio file).
//
// Two sounds available — swap ENDING_SOUND to switch:
//   'gong' : inharmonic partials modeled on Tibetan singing bowl/gong acoustics
//   'om'   : sustained harmonic tone at the "cosmic OM" frequency (136.1 Hz)

type EndingSound = 'gong' | 'om';
const ENDING_SOUND: EndingSound = 'om';

let audioCtx: AudioContext | null = null;
// Tracks the sustained OM/gong master gain so it can be faded early if the
// user dismisses the affirmation before the tone finishes naturally.
let activeChimeMasterGain: GainNode | null = null;
let activeChimeOscillators: OscillatorNode[] = [];

/**
 * Initialize the Web Audio API context.
 * MUST be called inside a user gesture handler (the Start button click).
 * AudioContext starts in "running" state immediately — no resume() needed.
 * Idempotent: safe to call on every session start; only initializes once.
 */
export async function initAudio(): Promise<void> {
  if (audioCtx !== null) {
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    return;
  }
  audioCtx = new AudioContext();
  // iOS WebKit (Safari + Chrome) requires audio to start within the synchronous
  // part of the gesture handler. Any `await` before start() breaks the gesture window.
  // Start the silent buffer FIRST (synchronous), then await resume().
  const silentBuf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
  const silentSrc = audioCtx.createBufferSource();
  silentSrc.buffer = silentBuf;
  silentSrc.connect(audioCtx.destination);
  silentSrc.start(0); // Must be before any await — stays within iOS gesture window
  await audioCtx.resume();
}

/**
 * Returns the AudioContext singleton if it has been initialised, null otherwise.
 * Call only after initAudio() has been awaited.
 */
export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

/**
 * Synthesize and play the session-end tone.
 * Returns a Promise that resolves when the tone fades out completely.
 * Call playChime() without awaiting to start it concurrently with other work.
 */
export function playChime(): Promise<void> {
  return new Promise((resolve) => {
    if (!audioCtx) {
      resolve();
      return;
    }
    if (ENDING_SOUND === 'om') {
      playOm(audioCtx, resolve);
    } else {
      playGong(audioCtx, resolve);
    }
  });
}

/**
 * Gracefully fade out the active chime if it is still playing.
 * Call after the user dismisses the affirmation screen.
 */
export function stopChime(): void {
  const gain = activeChimeMasterGain;
  const oscs = activeChimeOscillators;
  activeChimeMasterGain = null;
  activeChimeOscillators = [];
  if (!audioCtx || !gain) return;
  const now = audioCtx.currentTime;
  const fadeOut = 1.5;
  try {
    gain.gain.cancelAndHoldAtTime(now);
  } catch {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
  }
  gain.gain.linearRampToValueAtTime(0, now + fadeOut);
  oscs.forEach(osc => { try { osc.stop(now + fadeOut + 0.05); } catch { /* already stopped */ } });
}

// ---------------------------------------------------------------------------
// Gong synthesis
// Inharmonic partials (real gong acoustics — NOT integer multiples).
// Higher partials decay much faster, leaving a pure deep ring — classic gong shape.
// Fundamental at 220 Hz (A3) reproduces well on phone and laptop speakers.
// peakGain kept below ambient PEAK_GAIN (0.55) so it never drowns the scene.
// ---------------------------------------------------------------------------
function playGong(ctx: AudioContext, resolve: () => void): void {
  const now = ctx.currentTime;
  const totalDuration = 20.0;
  const fadeInDuration = 8.0;  // slow rise — never overtakes ambient
  const fadeOutStart   = 16.0;
  const peakGain       = 0.28; // well below ambient PEAK_GAIN of 0.55

  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  activeChimeMasterGain = masterGain;
  masterGain.gain.setValueAtTime(0.00001, now);
  masterGain.gain.exponentialRampToValueAtTime(peakGain, now + fadeInDuration);
  masterGain.gain.setValueAtTime(peakGain, now + fadeOutStart);
  masterGain.gain.linearRampToValueAtTime(0, now + totalDuration);

  const partials: Array<{ freq: number; amp: number; decay: number }> = [
    { freq:  220, amp: 1.00, decay: 22.0 },
    { freq:  552, amp: 0.65, decay: 10.0 },
    { freq: 1078, amp: 0.40, decay:  5.5 },
    { freq: 1786, amp: 0.22, decay:  3.0 },
    { freq: 2662, amp: 0.12, decay:  1.6 },
    { freq: 3718, amp: 0.07, decay:  0.8 },
  ];

  partials.forEach(({ freq, amp, decay }) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  });

  setTimeout(() => resolve(), totalDuration * 1000 + 50);
}

// ---------------------------------------------------------------------------
// OM synthesis
//
// Structure: a short Tibetan bowl strike fires immediately at clock=0 to draw
// the meditator's attention; the sustained OM harmonic pad then rises very
// slowly underneath it, never louder than the ambient scene noise.
//
// Ambient PEAK_GAIN = 0.55.  Bowl peak = 0.30, OM peak = 0.25 — always softer.
// ---------------------------------------------------------------------------
function playOm(ctx: AudioContext, resolve: () => void): void {
  const now = ctx.currentTime;

  // ── OM sustain — fades in linearly from an audible start value so there is
  // no perceived silence. Oscillators run indefinitely; stopChime() fades them
  // out when the user dismisses the affirmation, so there is never a gap.
  const fadeInDuration = 3.0;  // matches ambient fade-out duration
  const peakGain       = 0.039;

  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  activeChimeMasterGain = masterGain;
  // Fade in over 3 s, hold briefly, then fade out — total 4 s
  masterGain.gain.setValueAtTime(0.004, now);
  masterGain.gain.linearRampToValueAtTime(peakGain, now + fadeInDuration);
  masterGain.gain.linearRampToValueAtTime(0, now + 4.0);

  // Harmonic stack at 136.1 Hz — "cosmic OM" / Earth year frequency
  const fundamental = 136.1;
  const harmonics: Array<{ ratio: number; amp: number }> = [
    { ratio: 1, amp: 0.70 },
    { ratio: 2, amp: 0.35 },
    { ratio: 3, amp: 0.22 },
    { ratio: 4, amp: 0.14 },
    { ratio: 5, amp: 0.09 },
    { ratio: 6, amp: 0.06 },
  ];

  activeChimeOscillators = [];
  harmonics.forEach(({ ratio, amp }) => {
    [-1.5, 1.5].forEach((centOffset) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = fundamental * ratio * Math.pow(2, centOffset / 1200);
      gain.gain.value = amp * 0.5;
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 4.1);
      activeChimeOscillators.push(osc);
    });
  });

  // Resolve immediately — caller does not await playChime(); stopChime() handles exit
  resolve();
}
