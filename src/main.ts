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

const timer = new Timer();

// Wire setup screen — the callback runs inside the Start button click handler (user gesture)
initSetupScreen(async (durationMs: number) => {
  state.sessionDurationMs = durationMs;
  state.sessionActive = true;
  state.sessionPaused = false;

  timer.start(durationMs);
  await acquireWakeLock();
  transitionToSession();
});

// Wire session screen — stop button handler
const { reset: resetSessionScreen } = initSessionScreen(async () => {
  state.sessionActive = false;
  state.sessionPaused = false;
  timer.stop();
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
  // Phase 3 will call playChime() here
  transitionToSetup();
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
