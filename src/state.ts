// src/state.ts
interface AppState {
  sessionDurationMs: number;
  sessionActive: boolean;
  sessionPaused: boolean;
}

export const state: AppState = {
  sessionDurationMs: 10 * 60 * 1000, // default 10 minutes
  sessionActive: false,
  sessionPaused: false,
};
