// src/scenes/ocean.ts
// Cinematic moonlit seascape: twinkling star field, 4-layer moon halo,
// 14 perspective wave bands with foam highlights, wide shimmering reflection
// column with phosphorescent glow, and a cinematic radial vignette.
import { createNoise2D } from 'simplex-noise';
import type { IScene, SceneOptions } from './scene.interface.js';

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  seed: number;
}

interface ShimmerDot {
  seed: number;
  tY: number; // 0=horizon, 1=bottom — position along reflection column
}

const WAVE_COUNT = 14;
const SHIMMER_COUNT = 40;
const FOAM_PER_NEAR_WAVE = 10; // dots per near wave crest

export class OceanScene implements IScene {
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private noise2D!: ReturnType<typeof createNoise2D>;
  private stars: Star[] = [];
  private shimmer: ShimmerDot[] = [];
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
    this.noise2D = createNoise2D();
    this.timeOffset = 0;
    this.buildStars();
    this.buildShimmer();
  }

  update(dt: number, _progress: number): void {
    if (!this.reducedMotion) {
      this.timeOffset += dt * 0.000095; // slightly slower for 14 waves
    }
    this.drawBackground();
    this.drawStars();
    this.drawConstellations();
    this.drawMoon();
    if (!this.reducedMotion) {
      this.drawWaves();
      this.drawReflection();
    } else {
      this.drawStaticWater();
    }
    this.drawVignette();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.buildStars();
  }

  destroy(): void {
    this.stars = [];
    this.shimmer = [];
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private buildStars(): void {
    const rng = seededRng(97);
    const horizonY = this.height * 0.42;
    const count = Math.min(150, Math.floor(this.width * horizonY / 8000));
    this.stars = Array.from({ length: count }, (_, i) => ({
      x: rng() * this.width,
      y: rng() * horizonY * 0.90,
      r: 0.4 + rng() * 1.8,
      opacity: 0.14 + rng() * 0.60,
      seed: i * 5.3,
    }));
  }

  private buildShimmer(): void {
    this.shimmer = Array.from({ length: SHIMMER_COUNT }, (_, i) => ({
      seed: i * 6.4,
      tY: i / SHIMMER_COUNT,
    }));
  }

  private drawBackground(): void {
    const { ctx, width: w, height: h } = this;
    const horizonY = h * 0.42;

    // Night sky — deep zenith, dark navy horizon
    const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
    sky.addColorStop(0.0, '#010306');
    sky.addColorStop(0.55, '#020a16');
    sky.addColorStop(1.0, '#041226');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizonY);

    // Milky Way band — faint diagonal luminescence
    const mw = ctx.createLinearGradient(0, 0, w, horizonY * 0.7);
    mw.addColorStop(0.0, 'rgba(28,38,62,0)');
    mw.addColorStop(0.35, 'rgba(32,44,72,0.08)');
    mw.addColorStop(0.65, 'rgba(28,38,62,0.05)');
    mw.addColorStop(1.0, 'rgba(20,30,54,0)');
    ctx.fillStyle = mw; ctx.fillRect(0, 0, w, horizonY);

    // Water base
    const water = ctx.createLinearGradient(0, horizonY, 0, h);
    water.addColorStop(0.0, '#031e28');
    water.addColorStop(1.0, '#010d0e');
    ctx.fillStyle = water; ctx.fillRect(0, horizonY, w, h - horizonY);

    // Horizon atmospheric glow
    const horizGlow = ctx.createLinearGradient(0, horizonY - h * 0.10, 0, horizonY + h * 0.07);
    horizGlow.addColorStop(0.0, 'rgba(14,62,88,0)');
    horizGlow.addColorStop(0.5, 'rgba(20,80,105,0.18)');
    horizGlow.addColorStop(1.0, 'rgba(10,50,78,0)');
    ctx.fillStyle = horizGlow; ctx.fillRect(0, horizonY - h * 0.10, w, h * 0.17);

    // Phosphorescent horizon glow just above waterline
    const phos = ctx.createLinearGradient(0, horizonY - h * 0.02, 0, horizonY + h * 0.04);
    phos.addColorStop(0, 'rgba(16,85,95,0)');
    phos.addColorStop(0.5, 'rgba(24,110,118,0.11)');
    phos.addColorStop(1, 'rgba(10,65,78,0)');
    ctx.fillStyle = phos; ctx.fillRect(0, horizonY - h * 0.02, w, h * 0.06);
  }

  private drawStars(): void {
    const { ctx, noise2D, timeOffset, reducedMotion } = this;
    for (const s of this.stars) {
      const twinkle = reducedMotion ? 0 :
        (noise2D(s.seed, timeOffset * 1.6) + 1) * 0.5 * 0.32;
      ctx.globalAlpha = Math.max(0.05, s.opacity - twinkle);
      ctx.fillStyle = 'rgba(215,228,252,1)';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawMoon(): void {
    const { ctx, width: w, height: h } = this;
    const mx = w * 0.72, my = h * 0.12;
    const mr = Math.min(w, h) * 0.025;

    // 1. Wide atmospheric diffusion
    const diffusion = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 12);
    diffusion.addColorStop(0.0, 'rgba(168,206,255,0.20)');
    diffusion.addColorStop(0.5, 'rgba(140,182,245,0.06)');
    diffusion.addColorStop(1.0, 'rgba(110,160,230,0)');
    ctx.fillStyle = diffusion;
    ctx.fillRect(mx - mr * 12, my - mr * 12, mr * 24, mr * 24);

    // 2. Outer corona ring
    const outerCorona = ctx.createRadialGradient(mx, my, mr * 1.5, mx, my, mr * 5);
    outerCorona.addColorStop(0.0, 'rgba(200,225,255,0.12)');
    outerCorona.addColorStop(1.0, 'rgba(180,210,255,0)');
    ctx.fillStyle = outerCorona;
    ctx.beginPath(); ctx.arc(mx, my, mr * 5, 0, Math.PI * 2); ctx.fill();

    // 3. Inner corona
    const innerCorona = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 2.4);
    innerCorona.addColorStop(0.0, 'rgba(218,238,255,0.35)');
    innerCorona.addColorStop(1.0, 'rgba(198,222,255,0)');
    ctx.fillStyle = innerCorona;
    ctx.beginPath(); ctx.arc(mx, my, mr * 2.4, 0, Math.PI * 2); ctx.fill();

    // 4. Moon disc
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(222,238,255,0.92)'; ctx.fill();

    // Subtle surface shading — darker on one edge (crescent-like)
    const shade = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr);
    shade.addColorStop(0.0, 'rgba(240,248,255,0)');
    shade.addColorStop(1.0, 'rgba(40,60,100,0.18)');
    ctx.fillStyle = shade;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
  }

  private drawWaves(): void {
    const { ctx, width: w, height: h, noise2D, timeOffset } = this;
    const horizonY = h * 0.42;
    const waterH = h - horizonY;
    const segs = 90;
    const sw = w / segs;

    for (let wi = 0; wi < WAVE_COUNT; wi++) {
      const t = wi / (WAVE_COUNT - 1); // 0=far, 1=near
      const baseY = horizonY + t * waterH * 0.96;

      // Amplitude grows dramatically toward viewer (cinematic depth)
      const amplitude = (4 + t * t * 52) * (h / 900);
      const waveSpeed = 0.60 + wi * 0.048;
      const noiseSeed = wi * 2.6;

      const pts: [number, number][] = [];
      for (let si = 0; si <= segs; si++) {
        const x = si * sw;
        const n = noise2D(si * 0.065 + noiseSeed, timeOffset * waveSpeed);
        pts.push([x, baseY + n * amplitude]);
      }

      // Wave fill color: far=deep teal-navy, near=near-black deep
      const r = Math.round(6 - t * 3);
      const g = Math.round(36 - t * 18);
      const b = Math.round(48 - t * 22);
      const alpha = 0.68 + t * 0.28;

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let si = 1; si < pts.length; si++) {
        const [x0, y0] = pts[si - 1], [x1, y1] = pts[si];
        ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.fill();

      // Crest highlight (all but nearest wave)
      if (wi < WAVE_COUNT - 1) {
        const crestOp = 0.04 + t * 0.14;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let si = 1; si < pts.length; si++) {
          const [x0, y0] = pts[si - 1], [x1, y1] = pts[si];
          ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        }
        ctx.strokeStyle = `rgba(55,175,185,${crestOp})`;
        ctx.lineWidth = 0.8 + t * 1.0;
        ctx.stroke();
      }

      // Foam dots on near 4 waves
      if (wi >= WAVE_COUNT - 4) {
        const foamT = (wi - (WAVE_COUNT - 4)) / 3; // 0-1 for near 4 waves
        ctx.save();
        ctx.globalAlpha = 0.06 + foamT * 0.20;
        ctx.fillStyle = 'rgba(215,235,255,1)';
        for (let fi = 0; fi < FOAM_PER_NEAR_WAVE; fi++) {
          const frac = fi / FOAM_PER_NEAR_WAVE;
          const px = (frac + noise2D(wi * 8.5 + fi * 0.4, timeOffset * 3.2) * 0.06) * w;
          const [, ptY] = pts[Math.floor(frac * segs)] ?? pts[0];
          const foamR = 1.2 + foamT * 3.5;
          ctx.beginPath();
          ctx.arc(Math.abs(px) % w, ptY, foamR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
  }

  private drawReflection(): void {
    const { ctx, width: w, height: h, noise2D, timeOffset } = this;
    const mx = w * 0.72;
    const horizonY = h * 0.42;
    const waterH = h - horizonY;

    // Wider reflection column (widens toward viewer)
    const colW = 32 + waterH * 0.12;
    const refl = ctx.createLinearGradient(mx - colW, 0, mx + colW, 0);
    refl.addColorStop(0.0, 'rgba(100,218,230,0)');
    refl.addColorStop(0.5, 'rgba(100,218,230,0.10)');
    refl.addColorStop(1.0, 'rgba(100,218,230,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(mx - colW, horizonY, colW * 2, waterH);

    // Phosphorescent glow at horizon in reflection
    const reflGlow = ctx.createRadialGradient(mx, horizonY, 0, mx, horizonY, colW * 2.5);
    reflGlow.addColorStop(0, 'rgba(60,200,220,0.12)');
    reflGlow.addColorStop(1, 'rgba(30,155,175,0)');
    ctx.fillStyle = reflGlow;
    ctx.fillRect(mx - colW * 2.5, horizonY - h * 0.02, colW * 5, h * 0.08);

    // Shimmer dots — 40 glinting highlights in column
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(130,235,240,0.70)';
    for (const p of this.shimmer) {
      const y = horizonY + p.tY * waterH;
      const spread = 8 + p.tY * 55;
      const nx = noise2D(p.seed, timeOffset * 3.8) * spread;
      const brightness = (noise2D(p.seed + 50, timeOffset * 5.5) + 1) * 0.5;
      ctx.globalAlpha = 0.05 + brightness * 0.22;
      ctx.fillStyle = 'rgba(155,240,245,1)';
      ctx.beginPath();
      ctx.ellipse(mx + nx, y, 3.5 + p.tY * 7, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawStaticWater(): void {
    // Reduced-motion: simple flat water tones instead of animated waves
    const { ctx, width: w, height: h } = this;
    const horizonY = h * 0.42;
    const flat = ctx.createLinearGradient(0, horizonY, 0, h);
    flat.addColorStop(0.0, 'rgba(14, 34, 68, 0.90)');
    flat.addColorStop(1.0, 'rgba(4, 10, 22, 0.95)');
    ctx.fillStyle = flat;
    ctx.fillRect(0, horizonY, w, h - horizonY);
  }

  private drawConstellations(): void {
    const { ctx, width: w, height: h, noise2D, timeOffset, reducedMotion } = this;
    const horizonY = h * 0.42;

    // Orion — upper-left quadrant, well away from the moon at (0.72, 0.12)
    const cx    = w * 0.26;
    const cy    = horizonY * 0.46;
    const scale = Math.min(w, horizonY) * 0.24;

    // [normX, normY, brightness]  (0–1 within bounding box, 0.5=centre)
    type StarDef = [number, number, number];
    const sDefs: StarDef[] = [
      [0.28, 0.20, 1.00], // Betelgeuse — left shoulder (very bright)
      [0.68, 0.16, 0.68], // Bellatrix  — right shoulder
      [0.40, 0.55, 0.58], // Alnitak    — belt left
      [0.52, 0.51, 0.72], // Alnilam    — belt centre
      [0.63, 0.47, 0.60], // Mintaka    — belt right
      [0.80, 0.87, 1.00], // Rigel      — right foot (very bright, blue-white)
      [0.28, 0.84, 0.48], // Saiph      — left foot
    ];

    const edges: [number, number][] = [
      [0, 1], // shoulders
      [0, 2], [1, 4], // shoulders → belt
      [2, 3], [3, 4], // belt
      [2, 6], [4, 5], // belt → feet
    ];

    const toX = (nx: number) => cx + (nx - 0.5) * scale;
    const toY = (ny: number) => cy + (ny - 0.5) * scale;

    ctx.save();

    // Connecting lines — slightly visible bluish threads
    ctx.strokeStyle = 'rgba(180,210,255,0.20)';
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    for (const [a, b] of edges) {
      ctx.beginPath();
      ctx.moveTo(toX(sDefs[a][0]), toY(sDefs[a][1]));
      ctx.lineTo(toX(sDefs[b][0]), toY(sDefs[b][1]));
      ctx.stroke();
    }

    // Each star gets its own twinkle speed and phase so they flash asynchronously
    const twinkleSpeeds = [1.1, 1.7, 2.3, 0.9, 1.5, 1.3, 2.0];

    // Stars with glow — each one twinkles independently
    for (let si = 0; si < sDefs.length; si++) {
      const [nx, ny, bright] = sDefs[si];
      const x = toX(nx);
      const y = toY(ny);
      const twinkle = reducedMotion ? 0 :
        (noise2D(nx * 4.1 + 200 + si * 8.7, timeOffset * twinkleSpeeds[si] + ny * 6.1) + 1) * 0.5;
      const alpha = Math.min(1, (0.72 + twinkle * 0.28) * bright);

      ctx.globalAlpha = alpha;
      ctx.shadowBlur   = 8 + bright * 16 + twinkle * 10;
      ctx.shadowColor  = bright > 0.85
        ? 'rgba(200,225,255,0.95)'   // blue-white for Rigel / Betelgeuse
        : 'rgba(180,210,255,0.85)';
      ctx.fillStyle = bright > 0.85 ? 'rgba(235,245,255,1)' : 'rgba(215,232,255,1)';
      ctx.beginPath();
      ctx.arc(x, y, 0.7 + bright * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawVignette(): void {
    const { ctx, width: w, height: h } = this;
    const v = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.28, w * 0.5, h * 0.5, h * 0.80);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.52)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  }
}

function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}
