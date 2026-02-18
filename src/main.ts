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

  timer.start(durationMs);
  transitionToSession();
});

// Wire session screen — stop button handler
initSessionScreen(() => {
  state.sessionActive = false;
  timer.stop();
  transitionToSetup();
});

// Session complete — timer reached zero
bus.on('session:complete', () => {
  state.sessionActive = false;
  // Phase 3 will call playChime() here
  transitionToSetup();
});
