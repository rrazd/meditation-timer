// src/timer-worker.ts
// Runs in a dedicated Web Worker thread — no DOM access, no module imports.
// Communicates with main thread via postMessage only.
//
// Commands received (from main thread):
//   { command: 'start', durationMs: number }
//   { command: 'pause' }
//   { command: 'resume', durationMs: number }
//   { command: 'stop' }
//
// Messages posted (to main thread) on each 250ms tick:
//   { remaining: number, elapsed: number, progress: number, complete?: boolean }

let intervalId: ReturnType<typeof setInterval> | null = null;
let endTime = 0;
let totalDurationMs = 0;
let remainingAtPause = 0;

function tick(): void {
  const remaining = Math.max(0, endTime - Date.now());
  const elapsed = totalDurationMs - remaining;
  const progress = totalDurationMs > 0 ? elapsed / totalDurationMs : 0;

  self.postMessage({ remaining, elapsed, progress });

  if (remaining <= 0) {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    // Post complete message so main thread can emit session:complete
    self.postMessage({ remaining: 0, elapsed: totalDurationMs, progress: 1, complete: true });
  }
}

self.onmessage = (e: MessageEvent<{ command: string; durationMs?: number }>) => {
  const { command, durationMs } = e.data;

  if (command === 'start' && durationMs != null) {
    // Clear any existing interval before starting fresh
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    totalDurationMs = durationMs;
    remainingAtPause = 0;
    endTime = Date.now() + durationMs;
    intervalId = setInterval(tick, 250);
  }

  if (command === 'pause') {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    remainingAtPause = Math.max(0, endTime - Date.now());
  }

  if (command === 'resume') {
    if (remainingAtPause > 0 && intervalId == null) {
      // totalDurationMs is already set from the original start command
      endTime = Date.now() + remainingAtPause;
      remainingAtPause = 0;
      intervalId = setInterval(tick, 250);
    }
  }

  if (command === 'stop') {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    endTime = 0;
    totalDurationMs = 0;
    remainingAtPause = 0;
  }
};
