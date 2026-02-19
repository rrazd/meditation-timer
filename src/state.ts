// src/state.ts
import type { SceneName } from './scenes/scene.interface.js';

interface AppState {
  sessionDurationMs: number;
  sessionActive: boolean;
  sessionPaused: boolean;
  sceneName: SceneName; // selected nature scene; set by setup-screen before session:start
}

export const state: AppState = {
  sessionDurationMs: 10 * 60 * 1000, // default 10 minutes
  sessionActive: false,
  sessionPaused: false,
  sceneName: 'rain', // default scene
};
