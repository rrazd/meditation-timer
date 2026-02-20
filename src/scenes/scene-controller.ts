// src/scenes/scene-controller.ts
import { bus } from '../event-bus.js';
import type { IScene, SceneName, SceneOptions } from './scene.interface.js';
// Scene implementations added in Plan 02
import { RainScene } from './rain.js';
import { ForestScene } from './forest.js';
import { OceanScene } from './ocean.js';

const SCENE_MAP: Record<SceneName, () => IScene> = {
  rain: () => new RainScene(),
  forest: () => new ForestScene(),
  ocean: () => new OceanScene(),
};

const FRAME_INTERVAL_MS = 1000 / 30; // 33.33ms — 30fps cap

export function initSceneController(canvas: HTMLCanvasElement): void {
  let activeScene: IScene | null = null;
  let rafId: number | null = null;
  let lastFrameTime: number | null = null;
  let sessionProgress = 0;

  // Checked once at init — canvas drawing is pure JS; the browser cannot
  // suppress it automatically. We must query matchMedia and honor the result.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const options: SceneOptions = { reducedMotion };

  function resizeCanvas(): void {
    const dpr = window.devicePixelRatio ?? 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Internal resolution (actual pixels drawn)
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    // CSS display size
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    // canvas.width assignment resets the context transform matrix — scenes
    // must re-apply ctx.scale(dpr, dpr) inside their resize() implementation.
    activeScene?.resize(canvas.width, canvas.height);
  }

  function loop(timestamp: number): void {
    if (lastFrameTime === null) lastFrameTime = timestamp;

    const dt = timestamp - lastFrameTime;

    // 30fps cap: only render if at least 33ms have elapsed.
    // Update lastFrameTime ONLY when a frame is rendered — not every tick —
    // otherwise the skip logic compounds on high-refresh-rate displays.
    if (dt >= FRAME_INTERVAL_MS) {
      lastFrameTime = timestamp;
      activeScene?.update(dt, sessionProgress);
    }

    rafId = requestAnimationFrame(loop);
  }

  function startScene(sceneName: SceneName): void {
    const wasVisible = canvas.style.display !== 'none';
    stopScene(); // cancel any previous rAF loop and destroy previous scene
    activeScene = SCENE_MAP[sceneName]?.() ?? SCENE_MAP.rain();
    activeScene.init(canvas, options);
    // Canvas is revealed by transitionToSession() on first session start — not here —
    // to prevent the scene bleeding through the setup card's backdrop-filter glass effect.
    // On restart the canvas was already visible, so restore it immediately.
    if (wasVisible) canvas.style.display = 'block';
    lastFrameTime = null; // reset so first frame dt is 0
    rafId = requestAnimationFrame(loop);
  }

  function stopScene(): void {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    activeScene?.destroy();
    activeScene = null;
    canvas.style.display = 'none';
  }

  // Event bus wiring
  bus.on('session:start', (e: Event) => {
    const { sceneName, durationMs } = (e as CustomEvent<{ sceneName: SceneName; durationMs: number }>).detail;
    sessionProgress = 0;
    resizeCanvas();
    startScene(sceneName);
    // durationMs is not used by SceneController but destructured to confirm the shape
    void durationMs;
  });

  bus.on('timer:tick', (e: Event) => {
    const { progress } = (e as CustomEvent<{ progress: number }>).detail;
    sessionProgress = progress;
  });

  bus.on('session:stop', stopScene);

  // On complete: freeze animation (cancel rAF) but keep the canvas visible so the
  // affirmation overlays the last rendered frame. main.ts emits session:stop after
  // the user dismisses the affirmation to do final cleanup.
  bus.on('session:complete', () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  // rAF pauses automatically in background tabs (correct behavior by design).
  // No visibilitychange handler needed — the canvas stops, the Web Worker
  // timer continues. Pause/resume are not wired yet (Phase 2 adds that).

  window.addEventListener('resize', resizeCanvas);
}
