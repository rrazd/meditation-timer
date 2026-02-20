// src/main.ts
import './styles/main.css';
import './styles/variables.css';

import { bus } from './event-bus.js';
import { state } from './state.js';
import { Timer } from './timer.js';
import { initSetupScreen } from './ui/setup-screen.js';
import { initSessionScreen } from './ui/session-screen.js';
import { transitionToSession, transitionToSetup } from './ui/transitions.js';
import { acquireWakeLock, releaseWakeLock } from './utils/wake-lock.js';
import { initAudio, playChime, stopChime, getAudioContext } from './audio.js';
import { startAmbient, stopAmbient } from './audio-ambient.js';
import { initSceneController } from './scenes/scene-controller.js';
import { initBgStars, hideBgStars, showBgStars } from './ui/bg-stars.js';
import type { SceneName } from './scenes/scene.interface.js';

const timer = new Timer();

// ── End-of-session affirmations ───────────────────────────────────────────────
const AFFIRMATIONS = [
  'You showed up for yourself today.',
  'Stillness is a gift you gave yourself.',
  'Peace lives within you.',
  'You are enough, exactly as you are.',
  'Every breath is a fresh beginning.',
  'The quiet within you is always there.',
  'Rest is not idle — it is sacred.',
  'Returning to yourself takes courage.',
  'Calmness is your natural state.',
  'In stillness, you find yourself.',
  'This moment of quiet belongs to you.',
  'You are whole, just as you are.',
  'Presence is the greatest gift.',
  'You chose peace today.',
  'Something beautiful is always unfolding for you.',
  'Your kindness makes the world softer.',
  'You are more resilient than you know.',
  'Good things are drawn to you.',
  'Your presence is a gift to those around you.',
  'You deserve every good thing coming your way.',
  'The best of you shows up when it matters most.',
  'You are capable of more than you imagine.',
  'Warmth and light follow you everywhere.',
  'You have everything within you that you need.',
  'Your calm is contagious — it steadies others.',
  'Growth is happening, even when you cannot see it.',
  'You are exactly where you are meant to be.',
  'Every step forward, however small, counts.',
  'You bring something irreplaceable to this world.',
  'Hope is always alive inside you.',
  'You have overcome every hard day so far.',
  'The universe is quietly rooting for you.',
  'Goodness flows through you and out into the world.',
  'You are seen, you are valued, you matter.',
  'Your heart knows the way — trust it.',
];

let resolveAffirmation: (() => void) | null = null;

function showAffirmation(): Promise<void> {
  const el   = document.querySelector<HTMLElement>('#session-affirmation')!;
  const text = document.querySelector<HTMLElement>('#affirmation-text')!;
  text.textContent = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];

  // Hide all session controls — only the End Session button in the affirmation remains
  document.querySelector<HTMLElement>('#timer-display')!.style.display = 'none';
  document.querySelector<HTMLElement>('#pause-button')!.style.display  = 'none';
  document.querySelector<HTMLElement>('#stop-button')!.style.display   = 'none';

  el.style.display = 'flex';
  el.style.opacity = '0';
  el.style.transition = 'opacity 1.2s ease';
  // Force reflow so transition fires
  void el.offsetHeight;
  el.style.opacity = '1';
  return new Promise(resolve => {
    resolveAffirmation = resolve;
    // No auto-timeout — user must click End Session to dismiss
  });
}

function hideAffirmation(): void {
  const el = document.querySelector<HTMLElement>('#session-affirmation')!;
  el.style.transition = 'opacity 0.6s ease';
  el.style.opacity = '0';
  setTimeout(() => { el.style.display = 'none'; }, 650);
}

// Initialise the canvas scene controller. The canvas element must exist in the
// DOM before this call (added to index.html in this plan).
const canvas = document.querySelector<HTMLCanvasElement>('#scene-canvas')!;
initSceneController(canvas);
initBgStars();

// Wire setup screen — the callback runs inside the Start button click handler (user gesture)
initSetupScreen(async (durationMs: number, sceneName: SceneName) => {
  state.sessionDurationMs = durationMs;
  state.sessionActive = true;
  state.sessionPaused = false;
  state.sceneName = sceneName;

  await initAudio(); // Must precede timer.start() — loads chime before session could complete

  timer.start(durationMs);
  // Emit session:start with sceneName so SceneController can start the correct scene
  bus.emit('session:start', { durationMs, sceneName });
  await startAmbient(getAudioContext()!, sceneName);
  await acquireWakeLock();
  // Push a history entry so the browser back button returns here instead of leaving the app
  history.pushState({ screen: 'session' }, '');
  hideBgStars();
  transitionToSession();
});

// Wire session screen — stop and restart handlers
const { reset: resetSessionScreen } = initSessionScreen(
  // onStop
  async () => {
    state.sessionActive = false;
    state.sessionPaused = false;
    chimeScheduled = false;
    timer.stop();
    bus.emit('session:stop', {});
    const stopCtx = getAudioContext();
    if (stopCtx) stopAmbient(stopCtx);
    await releaseWakeLock();
    showBgStars();
    // Reset session screen state only after it's hidden — prevents buttons flashing
    transitionToSetup(() => resetSessionScreen());
  },
  // onRestart
  async () => {
    // If paused, resume the audio context before stopping ambient
    if (state.sessionPaused) {
      state.sessionPaused = false;
      await getAudioContext()?.resume();
    }
    chimeScheduled = false;
    timer.stop();
    const restartCtx = getAudioContext();
    if (restartCtx) stopAmbient(restartCtx);
    resetSessionScreen(); // resets pause button label and opacity
    timer.start(state.sessionDurationMs);
    bus.emit('session:start', { durationMs: state.sessionDurationMs, sceneName: state.sceneName });
    if (restartCtx) await startAmbient(restartCtx, state.sceneName);
  },
);

// Gong pre-start — begins fading in 1 s before the timer hits zero.
// A flag prevents it firing more than once per session.
let chimeScheduled = false;
bus.on('timer:tick', (e: Event) => {
  const { remaining } = (e as CustomEvent<{ remaining: number }>).detail;
  if (!chimeScheduled && state.sessionActive && !state.sessionPaused && remaining <= 1000) {
    chimeScheduled = true;
    void playChime();
  }
});

// Session complete — timer reached zero
bus.on('session:complete', async () => {
  if (!state.sessionActive) return; // Stop already handled this — ignore
  state.sessionActive = false;
  state.sessionPaused = false;
  chimeScheduled = false; // reset for next session
  await releaseWakeLock();

  // Ambient fades out now (t=0); gong has already been rising for 1 s
  const completeCtx = getAudioContext();
  if (completeCtx) stopAmbient(completeCtx, 3.0);

  // Wire End Session button on affirmation screen to dismiss early
  const affirmBtn = document.querySelector<HTMLButtonElement>('#affirmation-end-button')!;
  const onAffirmEnd = () => { resolveAffirmation?.(); resolveAffirmation = null; };
  affirmBtn.addEventListener('click', onAffirmEnd, { once: true });

  await showAffirmation();
  affirmBtn.removeEventListener('click', onAffirmEnd);

  // Gracefully fade out the OM if the user dismissed before it finished naturally
  stopChime();

  hideAffirmation();
  // Fully stop and hide the scene canvas now that the user has dismissed
  bus.emit('session:stop', {});
  showBgStars();
  transitionToSetup(() => resetSessionScreen());
});

bus.on('session:pause', () => {
  timer.pause();
  state.sessionPaused = true;
  getAudioContext()?.suspend();
  // Wake lock intentionally NOT released on pause — screen stays on
  // so user can see the frozen timer. Browser auto-releases if tab is hidden.
});

bus.on('session:resume', async () => {
  timer.resume();
  state.sessionPaused = false;
  await getAudioContext()?.resume();
  await acquireWakeLock(); // Re-acquire: may have been released during paused tab-switch
});



// Back button during a session returns to the setup screen instead of leaving the app.
// The pushState in the start handler created a history entry; popstate fires when it's popped.
window.addEventListener('popstate', () => {
  if (state.sessionActive) {
    document.querySelector<HTMLButtonElement>('#stop-button')?.click();
  }
});

// Re-acquire wake lock when returning to an active, non-paused session.
// Registered once at startup. The browser auto-releases the sentinel when a tab is hidden.
document.addEventListener('visibilitychange', async () => {
  if (
    document.visibilityState === 'visible' &&
    state.sessionActive &&
    !state.sessionPaused
  ) {
    await acquireWakeLock();
  }
});
