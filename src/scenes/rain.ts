// src/scenes/rain.ts
import type { IScene, SceneOptions } from './scene.interface.js';

interface RainDrop {
  x: number;
  y: number;
  speed: number;    // physical px per ms
  length: number;   // physical px
  opacity: number;
}

const DROP_COUNT_FULL = 200;
const DROP_COUNT_REDUCED = 0; // static gradient only when prefers-reduced-motion

export class RainScene implements IScene {
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private drops: RainDrop[] = [];
  private width = 0;
  private height = 0;
  private reducedMotion = false;

  init(canvas: HTMLCanvasElement, options: SceneOptions): void {
    this.canvas = canvas;
    // { alpha: false } — opaque background scene; skip alpha compositing for perf
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.reducedMotion = options.reducedMotion;

    const count = this.reducedMotion ? DROP_COUNT_REDUCED : DROP_COUNT_FULL;
    this.drops = Array.from({ length: count }, () => this.createDrop());
  }

  update(dt: number, _progress: number): void {
    // Background gradient (drawn every frame to clear previous frame)
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0d1b2a');  // dark slate-navy — top
    gradient.addColorStop(1, '#1a2e40');  // slightly lighter slate — bottom
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.reducedMotion) return; // static gradient only

    // Draw all drops in a single path for performance
    this.ctx.strokeStyle = 'rgba(147, 197, 220, 0.5)'; // cool blue-grey rain
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();

    for (const drop of this.drops) {
      // Advance drop position
      drop.y += drop.speed * dt;
      // Wrap to top when drop exits bottom
      if (drop.y > this.height + drop.length) {
        drop.y = -drop.length;
        drop.x = Math.random() * this.width;
      }
      // Slight diagonal angle (wind effect)
      this.ctx.moveTo(drop.x, drop.y);
      this.ctx.lineTo(drop.x - 1.5, drop.y + drop.length);
    }

    this.ctx.stroke();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    // Re-acquire context after canvas dimension change (reset clears the context state)
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
  }

  destroy(): void {
    this.drops = [];
  }

  private createDrop(): RainDrop {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      speed: 0.3 + Math.random() * 0.5, // physical px/ms (at 2x DPR, will appear ~0.15–0.4 logical px/ms)
      length: 12 + Math.random() * 18,   // physical px
      opacity: 0.3 + Math.random() * 0.5,
    };
  }
}
