// src/timer.ts
import { bus } from './event-bus.js';

interface TimerTickData {
  remaining: number;
  elapsed: number;
  progress: number;
  complete?: boolean;
}

export class Timer {
  readonly #worker: Worker;

  constructor() {
    // URL literal is required — Vite static analysis bundles the worker file
    // based on this exact pattern. Extracting to a variable breaks production builds.
    this.#worker = new Worker(
      new URL('./timer-worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.#worker.onmessage = (e: MessageEvent<TimerTickData>) => {
      const data = e.data;
      bus.emit('timer:tick', data as unknown as Record<string, unknown>);
      if (data.complete) {
        bus.emit('session:complete', {});
      }
    };

    this.#worker.onerror = (err: ErrorEvent) => {
      console.error('[Timer] Worker error:', err.message);
    };
  }

  start(durationMs: number): void {
    this.#worker.postMessage({ command: 'start', durationMs });
  }

  pause(): void {
    this.#worker.postMessage({ command: 'pause' });
  }

  resume(): void {
    this.#worker.postMessage({ command: 'resume' });
  }

  stop(): void {
    this.#worker.postMessage({ command: 'stop' });
  }

  destroy(): void {
    this.#worker.terminate();
  }
}
