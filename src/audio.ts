// src/audio.ts
// Web Audio API — lazy AudioContext, chime playback via AudioBufferSourceNode + GainNode
// Sources:
//   MDN Web Audio API Best Practices: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
//   MDN AudioBufferSourceNode: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
//   MDN GainNode: https://developer.mozilla.org/en-US/docs/Web/API/GainNode
//   MDN decodeAudioData: https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData

let audioCtx: AudioContext | null = null;
let chimeBuffer: AudioBuffer | null = null;

/**
 * Initialize the Web Audio API context and pre-load the chime buffer.
 *
 * MUST be called inside a user gesture handler (the Start button click).
 * AudioContext created there starts in "running" state — no resume() needed.
 * Idempotent: safe to call on every session start; only initializes once.
 */
export async function initAudio(): Promise<void> {
  if (audioCtx !== null) return; // Already initialized — reuse existing context

  // Created inside user gesture — state is "running" immediately (Chrome 71+ autoplay policy)
  audioCtx = new AudioContext();

  // Load and decode chime now — before the session could fire session:complete.
  // decodeAudioData is CPU-intensive; doing it at init time (not at playback time) avoids
  // a race where a very short test session fires session:complete before the buffer is ready.
  try {
    const response = await fetch('/audio/chime.mp3');
    const arrayBuffer = await response.arrayBuffer();
    chimeBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    // Non-fatal: if the file fails to load, playChime() resolves immediately and
    // the session transitions to setup silently. The timer still functions correctly.
    console.warn('[Audio] Chime failed to load:', (err as Error).message);
  }
}

/**
 * Play the chime once. Returns a Promise that resolves when playback ends.
 *
 * The caller (main.ts session:complete handler) awaits this before calling
 * transitionToSetup() — ensuring the screen transitions AFTER the chime finishes,
 * not simultaneously with it.
 *
 * A new AudioBufferSourceNode is created on each call because nodes are single-use:
 * calling start() a second time throws InvalidStateError. The AudioBuffer (chimeBuffer)
 * is reused — only the node must be new.
 */
export function playChime(): Promise<void> {
  return new Promise((resolve) => {
    if (!audioCtx || !chimeBuffer) {
      // Audio unavailable (not initialized, or file load failed) — resolve immediately
      // so the caller's post-chime logic (transitionToSetup) still runs.
      resolve();
      return;
    }

    // GainNode: smooth fade-in prevents the click/pop that occurs when a GainNode
    // jumps discontinuously from 0 to target volume.
    // NEVER set gainNode.gain.value directly — always use AudioParam scheduling methods.
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, audioCtx.currentTime + 0.5);

    // New AudioBufferSourceNode per play — nodes cannot be restarted after start()
    const source = audioCtx.createBufferSource();
    source.buffer = chimeBuffer;
    source.connect(gainNode);

    // Resolve the Promise exactly when the chime finishes — not before, not after.
    // { once: true } auto-removes the listener after it fires.
    source.addEventListener('ended', () => resolve(), { once: true });

    source.start();
  });
}
