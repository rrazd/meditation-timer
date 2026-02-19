// src/scenes/forest.ts
import { createNoise2D } from 'simplex-noise';
import type { IScene, SceneOptions } from './scene.interface.js';

interface Mote {
  baseX: number;
  baseY: number;
  seed: number;      // unique noise offset per particle
  size: number;      // physical px radius
  opacity: number;
}

const MOTE_COUNT_FULL = 80;
const MOTE_COUNT_REDUCED = 0;

export class ForestScene implements IScene {
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private noise2D!: ReturnType<typeof createNoise2D>;
  private motes: Mote[] = [];
  private timeOffset = 0;
  private width = 0;
  private height = 0;
  private reducedMotion = false;

  init(canvas: HTMLCanvasElement, options: SceneOptions): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.reducedMotion = options.reducedMotion;
    // Create noise function ONCE in init — not per frame (has initialisation cost)
    this.noise2D = createNoise2D();
    this.timeOffset = 0;

    const count = this.reducedMotion ? MOTE_COUNT_REDUCED : MOTE_COUNT_FULL;
    this.motes = Array.from({ length: count }, (_, i) => ({
      baseX: Math.random() * this.width,
      baseY: Math.random() * this.height,
      seed: i * 7.3, // unique seed offset per particle so they move independently
      size: 2 + Math.random() * 3,
      opacity: 0.4 + Math.random() * 0.4,
    }));
  }

  update(dt: number, _progress: number): void {
    // Background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a1a12'); // very dark forest green — top
    gradient.addColorStop(1, '#0f2d1a'); // slightly lighter deep green — bottom
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.reducedMotion) return;

    // Advance time — 0.0002 scale gives slow, meditative drift
    this.timeOffset += dt * 0.0002;

    for (const mote of this.motes) {
      // noise2D returns -1..1; multiply by amplitude for displacement in physical px
      const offsetX = this.noise2D(mote.seed, this.timeOffset) * 30;
      const offsetY = this.noise2D(mote.seed + 50, this.timeOffset) * 20;

      const x = mote.baseX + offsetX;
      const y = mote.baseY + offsetY;

      this.ctx.beginPath();
      this.ctx.arc(x, y, mote.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(107, 158, 122, ${mote.opacity})`; // muted sage-green
      this.ctx.fill();
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
  }

  destroy(): void {
    this.motes = [];
  }
}
