// src/scenes/scene.interface.ts
// Strategy interface for Canvas 2D nature scenes.
// Every scene class implements these four methods.
// SceneController calls them without knowing which scene is active.

export interface SceneOptions {
  /** True when OS prefers-reduced-motion: reduce. Scenes must skip particle effects. */
  reducedMotion: boolean;
}

export interface IScene {
  /** Called once when the scene is made active. Get the 2D context here. */
  init(canvas: HTMLCanvasElement, options: SceneOptions): void;
  /**
   * Called on every rendered frame (after the 30fps guard passes).
   * @param dt   milliseconds elapsed since the last rendered frame
   * @param progress  session progress 0..1 (from timer:tick events)
   */
  update(dt: number, progress: number): void;
  /**
   * Called when the canvas is resized. canvas.width/height are already updated
   * before this is called — re-fetch the context and re-apply DPR scale inside.
   */
  resize(width: number, height: number): void;
  /** Tear down: clear particles, cancel timers, release canvas context reference. */
  destroy(): void;
}

export type SceneName = 'rain' | 'forest' | 'ocean';
