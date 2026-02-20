// src/scenes/rain.ts
// Cinematic rain scene: 5 depth layers, 3 mountain ridges, lightning system,
// puddle ripples, and a vignette overlay for dramatic depth.
import type { IScene, SceneOptions } from './scene.interface.js';
import { bus } from '../event-bus.js';

interface RainDrop {
  x: number; y: number; speed: number; length: number; layer: 0|1|2|3|4;
}
interface PuddleRipple {
  x: number; y: number;
  r: number;       // current radius
  maxR: number;    // final radius
  life: number;    // 0→1 (0=fresh, 1=gone)
}

// Visual properties per depth layer (0=farthest, 4=nearest)
const LAYER = [
  { lineWidth: 0.35, opacity: 0.12, dx: -0.15, speed: [0.14, 0.20] as [number,number], len: [5,  10] as [number,number] },
  { lineWidth: 0.55, opacity: 0.20, dx: -0.50, speed: [0.22, 0.32] as [number,number], len: [10, 17] as [number,number] },
  { lineWidth: 0.90, opacity: 0.30, dx: -1.00, speed: [0.34, 0.46] as [number,number], len: [17, 26] as [number,number] },
  { lineWidth: 1.30, opacity: 0.45, dx: -1.70, speed: [0.50, 0.66] as [number,number], len: [26, 38] as [number,number] },
  { lineWidth: 1.80, opacity: 0.62, dx: -2.60, speed: [0.70, 0.90] as [number,number], len: [36, 52] as [number,number] },
];
const DROPS_PER_LAYER = [55, 70, 80, 65, 45];

export class RainScene implements IScene {
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private drops: RainDrop[] = [];
  private ridgePts: [number,number][][] = []; // 3 ridges
  private ripples: PuddleRipple[] = [];
  private width = 0;
  private height = 0;
  private reducedMotion = false;
  // Lightning state
  private lightningBrightness = 0;   // 0-1
  private lightningAccumX = 0;       // ms accumulator
  private lightningInterval = 10000; // ms until next flash
  // Cursor proximity effect
  private cursorX = -99999;
  private cursorY = -99999;
  private dpr = 1;
  private readonly CURSOR_PROX_CSS = 160; // px influence radius in CSS pixels
  private boundOnPointerMove!: (e: PointerEvent) => void;

  init(canvas: HTMLCanvasElement, options: SceneOptions): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.reducedMotion = options.reducedMotion;
    this.buildRidges();
    if (!this.reducedMotion) this.drops = this.buildDrops();
    this.dpr = window.devicePixelRatio ?? 1;
    this.boundOnPointerMove = (e: PointerEvent) => {
      // Store in physical pixels to match the canvas drawing coordinate space
      this.cursorX = e.clientX * this.dpr;
      this.cursorY = e.clientY * this.dpr;
    };
    document.addEventListener('pointermove', this.boundOnPointerMove);
  }

  update(dt: number, _progress: number): void {
    if (!this.reducedMotion) {
      // Lightning timer
      this.lightningAccumX += dt;
      if (this.lightningAccumX >= this.lightningInterval) {
        this.lightningBrightness = 0.55 + Math.random() * 0.35;
        this.lightningAccumX = 0;
        this.lightningInterval = 9000 + Math.random() * 14000;
        bus.emit('lightning:strike', {});
      }
      if (this.lightningBrightness > 0.001) {
        this.lightningBrightness *= 0.74; // exponential decay, ~8 frames
      } else {
        this.lightningBrightness = 0;
      }

      // Ripple spawning
      if (Math.random() < dt * 0.0018 && this.ripples.length < 24) {
        this.ripples.push({
          x: Math.random() * this.width,
          y: this.height * 0.88 + Math.random() * this.height * 0.09,
          r: 0,
          maxR: 10 + Math.random() * 22,
          life: 0,
        });
      }
      // Advance ripples
      for (const rp of this.ripples) {
        const growRate = 0.016; // radius per ms
        rp.r = Math.min(rp.maxR, rp.r + dt * growRate);
        rp.life = rp.r / rp.maxR;
      }
      this.ripples = this.ripples.filter(rp => rp.life < 0.99);
    }

    this.drawBackground();
    if (!this.reducedMotion) {
      this.advanceAndDraw(dt);
      this.drawCursorGlow();
    }
    this.drawVignette();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.buildRidges();
    if (!this.reducedMotion) this.drops = this.buildDrops();
  }

  destroy(): void {
    this.drops = [];
    this.ripples = [];
    document.removeEventListener('pointermove', this.boundOnPointerMove);
    this.cursorX = -99999;
    this.cursorY = -99999;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private buildRidges(): void {
    const seeds = [37, 61, 83];
    const configs = [
      // far ridge: high placement, small amplitude
      { baseFrac: 0.62, amp1: 0.09, amp2: 0.04, noise: 0.022 },
      // mid ridge
      { baseFrac: 0.70, amp1: 0.11, amp2: 0.05, noise: 0.028 },
      // near ridge: lowest, tallest bumps
      { baseFrac: 0.78, amp1: 0.14, amp2: 0.07, noise: 0.034 },
    ];
    this.ridgePts = configs.map((cfg, ri) => {
      const rng = seededRng(seeds[ri]);
      const steps = 52;
      const pts: [number,number][] = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = t * this.width;
        const base = this.height * cfg.baseFrac;
        const y = base
          - Math.sin(t * Math.PI * 4.4 + 0.5 + ri * 0.8) * this.height * cfg.amp1
          - Math.sin(t * Math.PI * 9.5 + 1.2 + ri * 0.4) * this.height * cfg.amp2
          - rng() * this.height * cfg.noise;
        pts.push([x, y]);
      }
      return pts;
    });
  }

  private buildDrops(): RainDrop[] {
    const drops: RainDrop[] = [];
    for (let l = 0; l < 5; l++) {
      const cfg = LAYER[l];
      for (let i = 0; i < DROPS_PER_LAYER[l]; i++) {
        drops.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          speed: cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]),
          length: cfg.len[0] + Math.random() * (cfg.len[1] - cfg.len[0]),
          layer: l as 0|1|2|3|4,
        });
      }
    }
    return drops;
  }

  private drawBackground(): void {
    const { ctx, width: w, height: h } = this;

    // Deep overcast sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0.0, '#07061a');
    sky.addColorStop(0.45, '#0c0920');
    sky.addColorStop(1.0, '#120f2a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Lightning flash overlay (drawn before ridges so it lights them up)
    if (this.lightningBrightness > 0.005) {
      ctx.fillStyle = `rgba(185,210,255,${this.lightningBrightness * 0.28})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Diffuse moonlight / cloud glow upper-left
    const glow = ctx.createRadialGradient(w * 0.30, h * 0.03, 0, w * 0.30, h * 0.03, h * 0.85);
    glow.addColorStop(0.00, 'rgba(72,58,118,0.13)');
    glow.addColorStop(0.50, 'rgba(50,40,88,0.05)');
    glow.addColorStop(1.00, 'rgba(32,25,60,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // 3 mountain ridges: far → near, lighter → darker
    const ridgeFills = [
      // far: desaturated blue-purple
      { top: '#1e2245', bottom: '#12152e' },
      // mid: darker violet-slate
      { top: '#13152e', bottom: '#0d1028' },
      // near: very dark with slight purple
      { top: '#0e0d20', bottom: '#080a1a' },
    ];
    for (let ri = 0; ri < this.ridgePts.length; ri++) {
      const pts = this.ridgePts[ri];
      if (pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1];
        const [x1, y1] = pts[i];
        ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const fill = ctx.createLinearGradient(0, h * 0.50, 0, h);
      fill.addColorStop(0, ridgeFills[ri].top);
      fill.addColorStop(1, ridgeFills[ri].bottom);
      ctx.fillStyle = fill;
      ctx.fill();
    }

    // Ground: wet surface reflection strip
    const wetGround = ctx.createLinearGradient(0, h * 0.87, 0, h);
    wetGround.addColorStop(0.0, 'rgba(12,28,50,0)');
    wetGround.addColorStop(0.5, 'rgba(16,36,62,0.55)');
    wetGround.addColorStop(1.0, 'rgba(8,18,34,0.90)');
    ctx.fillStyle = wetGround;
    ctx.fillRect(0, h * 0.87, w, h * 0.13);

    // Ground mist
    const mist = ctx.createLinearGradient(0, h * 0.76, 0, h * 0.90);
    mist.addColorStop(0, 'rgba(16,32,52,0)');
    mist.addColorStop(1, 'rgba(14,28,46,0.55)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, h * 0.76, w, h * 0.14);

    // Puddle ripples
    for (const rp of this.ripples) {
      const alpha = (1 - rp.life) * 0.22;
      ctx.strokeStyle = `rgba(118,128,210,${alpha})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private advanceAndDraw(dt: number): void {
    const { ctx } = this;
    for (let layer = 0; layer < 5; layer++) {
      const cfg = LAYER[layer];
      ctx.strokeStyle = `rgba(172,195,240,${cfg.opacity})`;
      ctx.lineWidth = cfg.lineWidth;
      ctx.beginPath();
      for (const d of this.drops) {
        if (d.layer !== layer) continue;
        d.y += d.speed * dt;
        d.x += cfg.dx * (dt / 16); // horizontal drift scales with time
        if (d.y > this.height + d.length) {
          d.y = -d.length;
          d.x = Math.random() * this.width;
        }
        if (d.x < -10) d.x = this.width + 10;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + cfg.dx * (d.length / 16), d.y + d.length);
      }
      ctx.stroke();
    }
  }

  private drawCursorGlow(): void {
    const { ctx } = this;
    // Scale radius to physical pixels so it matches the drawing coordinate space
    const r = this.CURSOR_PROX_CSS * this.dpr;

    for (const d of this.drops) {
      const cfg = LAYER[d.layer];
      // Measure from mid-point of the streak (drop falls downward: top=d.y, bottom=d.y+length)
      const midX = d.x + cfg.dx * (d.length * 0.5 / 16);
      const midY = d.y + d.length * 0.5;
      const dx = midX - this.cursorX;
      const dy = midY - this.cursorY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= r) continue;

      const t = dist / r;          // 0 = cursor, 1 = edge of radius
      const boost = 1 - t;

      const alpha = cfg.opacity + boost * (1 - cfg.opacity) * 0.88;
      const len   = d.length * (1 + boost * 1.6);
      const lw    = cfg.lineWidth * (1 + boost * 0.7);

      ctx.save();
      ctx.strokeStyle = `rgba(210,228,255,${alpha.toFixed(3)})`;
      ctx.lineWidth   = lw;
      ctx.lineCap     = 'round';
      if (boost > 0.45) {
        ctx.shadowBlur  = 5 * boost * this.dpr;
        ctx.shadowColor = 'rgba(180,205,255,0.55)';
      }
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + cfg.dx * (len / 16), d.y + len);
      ctx.stroke();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  private drawVignette(): void {
    const { ctx, width: w, height: h } = this;
    const v = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.22, w * 0.5, h * 0.5, h * 0.85);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.60)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }
}

function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}
