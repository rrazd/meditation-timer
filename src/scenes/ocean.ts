// src/scenes/ocean.ts
import { createNoise2D } from 'simplex-noise';
import type { IScene, SceneOptions } from './scene.interface.js';

const WAVE_COUNT_FULL = 12;
const WAVE_COUNT_REDUCED = 0;
const WAVE_AMPLITUDE = 40; // physical px max displacement

export class OceanScene implements IScene {
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private noise2D!: ReturnType<typeof createNoise2D>;
  private timeOffset = 0;
  private waveCount = 0;
  private width = 0;
  private height = 0;
  private reducedMotion = false;

  init(canvas: HTMLCanvasElement, options: SceneOptions): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.reducedMotion = options.reducedMotion;
    // Create noise function ONCE in init — not per frame
    this.noise2D = createNoise2D();
    this.timeOffset = 0;
    this.waveCount = this.reducedMotion ? WAVE_COUNT_REDUCED : WAVE_COUNT_FULL;
  }

  update(dt: number, _progress: number): void {
    // Background gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#050f1a'); // deepest navy — top
    gradient.addColorStop(1, '#0a1e30'); // slightly lighter deep navy — bottom
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (this.reducedMotion) return;

    // Advance time — 0.00015 scale gives a slow, rolling swell
    this.timeOffset += dt * 0.00015;

    const segmentCount = 80; // horizontal resolution of each wave line
    const segmentWidth = this.width / segmentCount;

    for (let wi = 0; wi < this.waveCount; wi++) {
      // Spread waves across the lower 70% of the canvas
      const baseY = this.height * (0.3 + (wi / this.waveCount) * 0.7);
      const opacity = 0.2 + (wi / this.waveCount) * 0.4; // deeper waves are more opaque
      const waveSpeed = 0.7 + wi * 0.05; // slightly different speed per layer

      this.ctx.beginPath();

      for (let si = 0; si <= segmentCount; si++) {
        const x = si * segmentWidth;
        // noise2D x-axis: spatial position along wave; y-axis: time
        const noiseVal = this.noise2D(si * 0.08 + wi * 3.1, this.timeOffset * waveSpeed);
        const y = baseY + noiseVal * WAVE_AMPLITUDE;

        if (si === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.strokeStyle = `rgba(91, 168, 201, ${opacity})`; // cool teal-blue
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
  }

  destroy(): void {
    // No particle arrays to clear — stateless wave calculation
  }
}
