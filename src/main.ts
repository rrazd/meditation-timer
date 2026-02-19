// src/main.ts
import './styles/main.css';
import './styles/variables.css';

import { bus } from './event-bus.js';
import { state } from './state.js';
import { Timer } from './timer.js';
import { initSetupScreen } from './ui/setup-screen.js';
import { initSessionScreen } from './ui/session-screen.js';
import { transitionToSession, transitionToSetup } from './ui/transitions.js';

const timer = new Timer();

// Wire setup screen — the callback runs inside the Start button click handler (user gesture)
initSetupScreen((durationMs: number) => {
  state.sessionDurationMs = durationMs;
  state.sessionActive = true;
  state.sessionPaused = false;

  timer.start(durationMs);
  transitionToSession();
});

// Wire session screen — stop button handler
const { reset: resetSessionScreen } = initSessionScreen(() => {
  state.sessionActive = false;
  state.sessionPaused = false;
  timer.stop();
  resetSessionScreen();
  transitionToSetup();
});

// Session complete — timer reached zero
bus.on('session:complete', () => {
  if (!state.sessionActive) return; // Stop already handled this — ignore
  state.sessionActive = false;
  state.sessionPaused = false;
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

bus.on('session:resume', () => {
  timer.resume();
  state.sessionPaused = false;
  // Note: acquireWakeLock() called here in Plan 02-02 after wake-lock.ts exists
});
