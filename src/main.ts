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
import { initAudio, playChime } from './audio.js';
import { initSceneController } from './scenes/scene-controller.js';
import type { SceneName } from './scenes/scene.interface.js';

const timer = new Timer();

// Initialise the canvas scene controller. The canvas element must exist in the
// DOM before this call (added to index.html in this plan).
const canvas = document.querySelector<HTMLCanvasElement>('#scene-canvas')!;
initSceneController(canvas);

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
  await acquireWakeLock();
  transitionToSession();
});

// Wire session screen — stop button handler
const { reset: resetSessionScreen } = initSessionScreen(async () => {
  state.sessionActive = false;
  state.sessionPaused = false;
  timer.stop();
  bus.emit('session:stop', {});
  await releaseWakeLock();
  resetSessionScreen();
  transitionToSetup();
});

// Session complete — timer reached zero
bus.on('session:complete', async () => {
  if (!state.sessionActive) return; // Stop already handled this — ignore
  state.sessionActive = false;
  state.sessionPaused = false;
  await releaseWakeLock();
  resetSessionScreen();
  await playChime();    // Wait for chime to finish — Promise resolves on 'ended' event
  transitionToSetup();  // Screen transitions after chime, not simultaneously
});

bus.on('session:pause', () => {
  timer.pause();
  state.sessionPaused = true;
  // Wake lock intentionally NOT released on pause — screen stays on
  // so user can see the frozen timer. Browser auto-releases if tab is hidden.
});

bus.on('session:resume', async () => {
  timer.resume();
  state.sessionPaused = false;
  await acquireWakeLock(); // Re-acquire: may have been released during paused tab-switch
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
