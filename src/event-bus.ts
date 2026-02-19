// src/event-bus.ts
// All inter-module communication flows through this singleton.
// Events:
//   'session:start'    — detail: { durationMs: number, sceneName: SceneName }
//   'session:stop'     — detail: {}
//   'session:complete' — detail: {}
//   'timer:tick'       — detail: { remaining: number, elapsed: number, progress: number, complete?: boolean }

class AppEventBus extends EventTarget {
  emit(name: string, detail: Record<string, unknown> = {}): void {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }

  on(name: string, handler: EventListenerOrEventListenerObject): () => void {
    this.addEventListener(name, handler);
    return () => this.removeEventListener(name, handler);
  }

  off(name: string, handler: EventListenerOrEventListenerObject): void {
    this.removeEventListener(name, handler);
  }
}

export const bus = new AppEventBus();
