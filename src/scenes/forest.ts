// src/scenes/forest.ts
// Cinematic night forest: 6-layer parallax pine silhouettes, twinkling star field,
// volumetric mist bands, crepuscular moon shaft, clustering firefly particles,
// per-tree sway driven by simplex noise, and a cinematic vignette frame.
import { createNoise2D } from 'simplex-noise';
import type { IScene, SceneOptions } from './scene.interface.js';

interface Firefly {
  baseX: number;
  baseY: number;
  seed: number;
  size: number;
  cluster: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  opacity: number;
  seed: number;
}

interface Tree {
  x: number;
  groundY: number;
  height: number;
  width: number;
  layer: 0 | 1 | 2 | 3 | 4 | 5;
  swayAmplitude: number; // px, how much tip moves
}

const FIREFLY_COUNT = 50;
const STAR_COUNT = 140;

// 6 depth layers: far(0) → near(5)
// Colors get progressively darker (atmospheric perspective: far=lighter, near=darker)
const TREE_COLORS = [
  '#1e3020', // layer 0 far-far: slightly gray-green haze
  '#162618', // layer 1 far
  '#0f1c10', // layer 2 mid-far
  '#0a1509', // layer 3 mid
  '#060f07', // layer 4 near
  '#020603', // layer 5 frame: near-black
] as const;

// Per-layer parallax: noise speed and horizontal drift amplitude
// Far layers barely move; near layers drift clearly
const LAYER_DRIFT_SPEED  = [0.18, 0.30, 0.46, 0.64, 0.84, 0.0] as const;
const LAYER_DRIFT_AMOUNT = [10,   18,   30,   44,   62,   0  ] as const; // pixels

export class ForestScene implements IScene {
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private noise2D!: ReturnType<typeof createNoise2D>;
  private fireflies: Firefly[] = [];
  private stars: Star[] = [];
  private trees: Tree[] = [];
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
    this.buildStatic();
    if (!this.reducedMotion) this.buildFireflies();
  }

  update(dt: number, _progress: number): void {
    this.timeOffset += dt * 0.00014;
    this.drawBackground();
    this.drawStars();
    this.drawMoon();
    this.drawTrees();
    this.drawCampfire();
    if (!this.reducedMotion) {
      this.drawFireflies();
    }
    this.drawVignette();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.buildStatic();
    if (!this.reducedMotion) this.buildFireflies();
  }

  destroy(): void {
    this.fireflies = [];
    this.stars = [];
    this.trees = [];
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private buildStatic(): void {
    this.buildStars();
    this.buildTrees();
  }

  private buildStars(): void {
    const rng = seededRng(73);
    const count = Math.min(STAR_COUNT, Math.floor(this.width * this.height / 12000));
    // Stars only appear above the canopy line
    this.stars = Array.from({ length: count }, (_, i) => ({
      x: rng() * this.width,
      y: rng() * this.height * 0.35,
      r: 0.5 + rng() * 1.6,
      opacity: 0.18 + rng() * 0.52,
      seed: i * 4.1,
    }));
  }

  private buildTrees(): void {
    const rng = seededRng(19);
    this.trees = [];

    // Six depth layers — back to front, each progressively darker and larger
    const layers: Array<{
      count: number;
      groundFrac: number;
      heightRange: [number, number];
      widthRange: [number, number];
      layer: 0 | 1 | 2 | 3 | 4 | 5;
      swayAmp: number;
    }> = [
      { count: 18, groundFrac: 0.60, heightRange: [0.07, 0.13], widthRange: [0.035, 0.065], layer: 0, swayAmp: 1.2 },
      { count: 14, groundFrac: 0.66, heightRange: [0.11, 0.17], widthRange: [0.055, 0.095], layer: 1, swayAmp: 2.0 },
      { count: 11, groundFrac: 0.73, heightRange: [0.17, 0.25], widthRange: [0.08,  0.13 ], layer: 2, swayAmp: 3.0 },
      { count:  9, groundFrac: 0.81, heightRange: [0.25, 0.36], widthRange: [0.10,  0.17 ], layer: 3, swayAmp: 4.5 },
      { count:  6, groundFrac: 0.89, heightRange: [0.36, 0.52], widthRange: [0.14,  0.22 ], layer: 4, swayAmp: 6.0 },
      // layer 5: 2 frame trees anchored at left and right edges
      { count:  2, groundFrac: 1.00, heightRange: [0.68, 0.82], widthRange: [0.26,  0.34 ], layer: 5, swayAmp: 0.0 },
    ];

    for (const l of layers) {
      for (let i = 0; i < l.count; i++) {
        let x: number;
        if (l.layer === 5) {
          // Frame trees: pin one to far left, one to far right
          x = i === 0 ? -this.width * 0.08 : this.width * 1.08;
        } else {
          x = rng() * this.width;
        }
        this.trees.push({
          x,
          groundY: l.groundFrac * this.height,
          height: (l.heightRange[0] + rng() * (l.heightRange[1] - l.heightRange[0])) * this.height,
          width: (l.widthRange[0] + rng() * (l.widthRange[1] - l.widthRange[0])) * this.width,
          layer: l.layer,
          swayAmplitude: l.swayAmp,
        });
      }
    }
    // Sort by groundY ascending — painter's order, nearer trees drawn on top
    this.trees.sort((a, b) => a.groundY - b.groundY);
  }

  private buildFireflies(): void {
    // 50 fireflies assigned to 9 clusters; they drift through the mid-forest zone
    this.fireflies = Array.from({ length: FIREFLY_COUNT }, (_, i) => ({
      baseX: Math.random() * this.width,
      baseY: this.height * 0.38 + Math.random() * this.height * 0.48,
      seed: i * 8.7,
      size: 1.8 + Math.random() * 2.8,
      cluster: Math.floor(Math.random() * 9),
    }));
  }

  private drawBackground(): void {
    const { ctx, width: w, height: h } = this;

    // Deep forest night sky — near-black green-black
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0.0, '#060b07');
    bg.addColorStop(0.5, '#081409');
    bg.addColorStop(1.0, '#040904');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Bioluminescent / moonlight canopy glow from within the forest
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.58, 0, w * 0.5, h * 0.58, w * 0.58);
    glow.addColorStop(0.00, 'rgba(28, 75, 32, 0.24)');
    glow.addColorStop(0.45, 'rgba(18, 48, 20, 0.10)');
    glow.addColorStop(1.00, 'rgba(8,  24, 9,  0.00)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    this.drawMistLayers();
  }

  private drawMistLayers(): void {
    const { ctx, width: w, height: h, noise2D, timeOffset } = this;
    const bands = [
      { y: h * 0.58, speed: 0.22, opacity: 0.07, thick: h * 0.065 },
      { y: h * 0.71, speed: 0.38, opacity: 0.11, thick: h * 0.085 },
      { y: h * 0.83, speed: 0.58, opacity: 0.18, thick: h * 0.10  },
    ];
    for (const b of bands) {
      const shiftX = this.reducedMotion ? 0 :
        noise2D(b.y * 0.01, timeOffset * b.speed) * w * 0.08;
      const mist = ctx.createLinearGradient(0, b.y - b.thick, 0, b.y + b.thick);
      mist.addColorStop(0,   'rgba(8,22,10,0)');
      mist.addColorStop(0.5, `rgba(12,32,14,${b.opacity})`);
      mist.addColorStop(1,   'rgba(6,18,8,0)');
      ctx.fillStyle = mist;
      ctx.fillRect(shiftX - w * 0.1, b.y - b.thick, w * 1.2, b.thick * 2);
    }
  }

  private drawMoon(): void {
    const { ctx, width: w, height: h } = this;
    const mx = w * 0.66;
    const my = h * 0.09;
    const mr = Math.min(w, h) * 0.020;

    // Wide diffusion haze (moonlight through forest atmosphere)
    const haze = ctx.createRadialGradient(mx, my, mr, mx, my, mr * 16);
    haze.addColorStop(0,   'rgba(130,190,130,0.22)');
    haze.addColorStop(0.5, 'rgba(80,140,80,0.07)');
    haze.addColorStop(1,   'rgba(40,80,40,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(mx - mr * 16, my - mr * 16, mr * 32, mr * 32);

    // Inner corona
    const corona = ctx.createRadialGradient(mx, my, mr * 0.7, mx, my, mr * 3.2);
    corona.addColorStop(0, 'rgba(190,230,190,0.30)');
    corona.addColorStop(1, 'rgba(140,190,140,0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(mx, my, mr * 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Disc
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(210,238,210,0.90)';
    ctx.fill();

    // Crepuscular shaft down through canopy
    const sw = w * 0.038;
    const shaft = ctx.createLinearGradient(mx, my + mr, mx, h * 0.65);
    shaft.addColorStop(0, 'rgba(140,200,140,0.10)');
    shaft.addColorStop(1, 'rgba(100,160,100,0)');
    ctx.fillStyle = shaft;
    ctx.beginPath();
    ctx.moveTo(mx - sw * 0.25, my + mr);
    ctx.lineTo(mx - sw, h * 0.65);
    ctx.lineTo(mx + sw, h * 0.65);
    ctx.lineTo(mx + sw * 0.25, my + mr);
    ctx.closePath();
    ctx.fill();
  }

  private drawStars(): void {
    const { ctx, noise2D, timeOffset, reducedMotion } = this;
    for (const s of this.stars) {
      const twinkle = reducedMotion ? 0 :
        (noise2D(s.seed, timeOffset * 1.4) + 1) * 0.5 * 0.28;
      ctx.globalAlpha = Math.max(0.05, s.opacity - twinkle);
      ctx.fillStyle = 'rgba(200,225,200,1)';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawTrees(): void {
    const { ctx, width: w, height: h } = this;

    // Compute per-layer drift once — far layers barely move, near layers drift clearly
    const layerDriftX: number[] = LAYER_DRIFT_SPEED.map((speed, li) =>
      this.reducedMotion ? 0 :
      this.noise2D(li * 47.3, this.timeOffset * speed) * LAYER_DRIFT_AMOUNT[li]
    );

    for (const tree of this.trees) {
      ctx.fillStyle = TREE_COLORS[tree.layer];

      // Per-tree sway at tip driven by noise
      const swayX = this.reducedMotion ? 0 :
        this.noise2D(tree.x * 0.008 + tree.layer * 13, this.timeOffset * (0.28 + tree.layer * 0.10))
        * tree.swayAmplitude;

      const cx = tree.x + layerDriftX[tree.layer] + swayX;
      this.drawPineTree(cx, tree.groundY, tree.width, tree.height);
    }

    // Dark forest floor
    const ground = ctx.createLinearGradient(0, h * 0.88, 0, h);
    ground.addColorStop(0, 'rgba(2,6,2,0)');
    ground.addColorStop(1, 'rgba(1,4,1,0.97)');
    ctx.fillStyle = ground;
    ctx.fillRect(0, h * 0.88, w, h * 0.12);

    // Bioluminescent moss glow at root level
    const moss = ctx.createLinearGradient(0, h * 0.84, 0, h * 0.97);
    moss.addColorStop(0,   'rgba(6,30,10,0)');
    moss.addColorStop(0.5, 'rgba(10,44,16,0.14)');
    moss.addColorStop(1,   'rgba(4,20,7,0)');
    ctx.fillStyle = moss;
    ctx.fillRect(0, h * 0.84, w, h * 0.13);
  }

  // Five-tier pine silhouette — each tier is a triangle, overlapping downward
  private drawPineTree(cx: number, groundY: number, width: number, height: number): void {
    const { ctx } = this;
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const frac = t / tiers;
      const apexY = groundY - height + frac * height * 0.50;
      const tierH = height * (0.52 - frac * 0.06);
      const baseY = apexY + tierH;
      const halfW = (width / 2) * (0.25 + frac * 0.80);
      ctx.beginPath();
      ctx.moveTo(cx, apexY);
      ctx.lineTo(cx - halfW, baseY);
      ctx.lineTo(cx + halfW, baseY);
      ctx.closePath();
      ctx.fill();
    }
    // Trunk stub
    const tw = width * 0.055;
    const th = height * 0.09;
    ctx.fillRect(cx - tw / 2, groundY - th, tw, th);
  }

  private drawCampfire(): void {
    const { ctx, width: w, height: h, timeOffset } = this;

    // Fire sits on the dark forest floor, slightly above the very bottom edge
    const cx = w * 0.50;
    const cy = h * 0.895;
    // R is the base unit — everything is expressed as multiples of R
    const R  = Math.min(w, h) * 0.072;
    // Ground-plane perspective: horizontal circles appear as ellipses
    // with y-radius compressed to P * x-radius (camera slightly elevated)
    const P  = 0.38;

    // Very slow flicker — meditative fire barely breathes
    const flicker = this.reducedMotion ? 1 :
      0.93 + 0.04 * Math.sin(timeOffset * 22 + 0.30)
           + 0.03 * Math.sin(timeOffset * 37 + 2.10);

    // The two logs cross at this point — flames emerge from here
    const fireBase = cy - R * 0.10;

    // ── 1. Wide ground-light ellipse ──────────────────────────────────────
    const glRx = R * 4.8, glRy = glRx * P * 0.88;
    const gl   = ctx.createRadialGradient(cx, cy + R * 0.04, 0, cx, cy, glRx);
    gl.addColorStop(0.00, `rgba(60,210,90,${(0.06 * flicker).toFixed(3)})`);
    gl.addColorStop(0.18, `rgba(30,160,60,${(0.03 * flicker).toFixed(3)})`);
    gl.addColorStop(0.55, `rgba(15,100,38,${(0.012 * flicker).toFixed(3)})`);
    gl.addColorStop(1.00, 'rgba(5,60,20,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.ellipse(cx, cy, glRx, glRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Stone ring in perspective ──────────────────────────────────────────
    // Stones are placed on a perspective ellipse around the fire.
    // Far stones (top of ring) are drawn first so logs overlap them;
    // near stones (bottom of ring) are drawn later so they overlap logs.
    const stoneCount = 9;
    const stRx = R * 1.30, stRy = stRx * P;
    const stoneAngles = Array.from({ length: stoneCount },
      (_, i) => (i / stoneCount) * Math.PI * 2 + 0.45);

    const drawStone = (i: number) => {
      const ang  = stoneAngles[i];
      const sx   = cx + Math.cos(ang) * stRx;
      const sy   = cy + Math.sin(ang) * stRy;
      // Near stones (bottom of ring) appear slightly larger — perspective scale
      const nearness = (Math.sin(ang) + 1) * 0.5;
      const sw   = R * (0.175 + nearness * 0.080);
      const sh   = sw * 0.50;
      const tilt = Math.sin(i * 2.1 + 0.7) * 0.28;

      ctx.save();
      const warmLit = Math.round(52 + nearness * 24);
      const stG = ctx.createLinearGradient(sx, sy - sh, sx, sy + sh * 0.6);
      stG.addColorStop(0.0, `rgba(${warmLit + 14},${Math.round(warmLit * 0.54)},${Math.round(warmLit * 0.17)},0.90)`);
      stG.addColorStop(0.5, 'rgba(20,9,2,0.94)');
      stG.addColorStop(1.0, 'rgba(7,3,1,0.90)');
      ctx.fillStyle = stG;
      ctx.beginPath();
      ctx.ellipse(sx, sy, sw, sh, tilt, 0, Math.PI * 2);
      ctx.fill();

      // Inner face firelight highlight
      const innerAng = ang + Math.PI;
      const hlX = sx + Math.cos(innerAng) * sw * 0.40;
      const hlY = sy + Math.sin(innerAng) * sh * 0.40;
      ctx.globalAlpha = (0.03 + nearness * 0.02) * flicker;
      ctx.fillStyle = 'rgba(80,220,110,1)';
      ctx.beginPath();
      ctx.ellipse(hlX, hlY, sw * 0.44, sh * 0.38, tilt, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    // ── 2. Far stones (behind logs) ───────────────────────────────────────
    for (let i = 0; i < stoneCount; i++) {
      if (Math.sin(stoneAngles[i]) <= 0.12) drawStone(i);
    }

    // ── 3. Logs as 3D cylinders in perspective ────────────────────────────
    // Each log is a cylinder resting on the ground, viewed from above.
    // Near ends point toward the viewer (bottom of screen, larger);
    // far ends recede into the scene (top of screen, smaller gap).
    // The y-coordinates use the ground-plane P compression.
    const logR = R * 0.112;
    // Log 1: near-left → far-right
    this.drawCylindricalLog(
      cx - R * 1.02, cy + R * P * 0.20,  // near end (left)
      cx + R * 0.72, cy - R * P * 0.62,  // far end  (right)
      logR, flicker
    );
    // Log 2: near-right → far-left
    this.drawCylindricalLog(
      cx + R * 1.02, cy + R * P * 0.20,  // near end (right)
      cx - R * 0.72, cy - R * P * 0.62,  // far end  (left)
      logR, flicker
    );

    // ── 4. Ember / coal bed at the crossing ───────────────────────────────
    const embRx = R * 0.70, embRy = embRx * P * 0.88;
    const embG  = ctx.createRadialGradient(cx, fireBase, 0, cx, fireBase, embRx);
    embG.addColorStop(0.00, `rgba(140,255,120,${(0.18 * flicker).toFixed(3)})`);
    embG.addColorStop(0.22, `rgba(60,210,90,${(0.12 * flicker).toFixed(3)})`);
    embG.addColorStop(0.55, `rgba(20,140,55,${(0.07 * flicker).toFixed(3)})`);
    embG.addColorStop(1.00, 'rgba(5,80,25,0)');
    ctx.fillStyle = embG;
    ctx.beginPath();
    ctx.ellipse(cx, fireBase, embRx, embRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Individual pulsing embers — stable positions, independent pulse rates
    const rng = seededRng(99);
    for (let i = 0; i < 14; i++) {
      const ea    = rng() * Math.PI * 2;
      const er    = rng() * embRx * 0.66;
      const ex    = cx     + Math.cos(ea) * er;
      const ey    = fireBase + Math.sin(ea) * embRy * 0.66;
      const freq  = 280 + rng() * 420;
      const ph    = rng() * Math.PI * 2;
      const brt   = 0.30 + rng() * 0.70;
      const pulse = this.reducedMotion ? brt :
        brt * (0.50 + 0.50 * Math.sin(timeOffset * freq + ph));
      ctx.globalAlpha = Math.max(0, pulse * flicker * 0.18);
      ctx.fillStyle   = rng() > 0.45 ? 'rgba(180,255,150,1)' : 'rgba(80,220,100,1)';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.4 + rng() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── 5. Near stones (in front of logs) ────────────────────────────────
    for (let i = 0; i < stoneCount; i++) {
      if (Math.sin(stoneAngles[i]) > 0.12) drawStone(i);
    }

    // ── 6. Flame tongues ──────────────────────────────────────────────────
    const flames = [
      { ox: -R*0.24, fh: R*0.80, ph: 0.00, fw: R*0.20, al: 0.14 },
      { ox: -R*0.09, fh: R*1.10, ph: 1.10, fw: R*0.25, al: 0.16 },
      { ox:  R*0.03, fh: R*1.26, ph: 0.40, fw: R*0.29, al: 0.18 },
      { ox:  R*0.16, fh: R*1.00, ph: 2.10, fw: R*0.23, al: 0.15 },
      { ox:  R*0.28, fh: R*0.70, ph: 1.70, fw: R*0.18, al: 0.12 },
    ];

    if (this.reducedMotion) {
      // Static reduced-motion flame
      const sfG = ctx.createLinearGradient(cx, fireBase, cx, fireBase - R * 0.80);
      sfG.addColorStop(0, `rgba(100,240,120,${(0.16 * flicker).toFixed(3)})`);
      sfG.addColorStop(1, 'rgba(20,140,55,0)');
      ctx.fillStyle = sfG;
      ctx.beginPath();
      ctx.ellipse(cx, fireBase - R * 0.35, R * 0.26, R * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (const f of flames) {
        // Slow, meditative movement — fire drifts gently in still air
        const t    = timeOffset * 28 + f.ph;
        const lean = Math.sin(t) * R * 0.022 + Math.sin(t * 1.25 + 0.9) * R * 0.010;
        const fh   = f.fh * (0.95 + 0.05 * Math.sin(t * 0.75)) * flicker;
        const fx   = cx + f.ox + lean;
        const base = fireBase;

        // Outer glow — wide, low opacity
        const ogG = ctx.createLinearGradient(fx, base, fx, base - fh * 1.35);
        ogG.addColorStop(0.0, `rgba(60,200,80,${(f.al * 0.22).toFixed(3)})`);
        ogG.addColorStop(0.4, `rgba(30,150,55,${(f.al * 0.10).toFixed(3)})`);
        ogG.addColorStop(1.0, 'rgba(10,90,30,0)');
        ctx.fillStyle = ogG;
        ctx.beginPath();
        ctx.moveTo(fx - f.fw * 1.55, base);
        ctx.bezierCurveTo(
          fx - f.fw * 0.95, base - fh * 0.42,
          fx + lean * 0.50, base - fh * 0.90,
          fx + lean,        base - fh * 1.35
        );
        ctx.bezierCurveTo(
          fx + lean * 0.50 + f.fw * 0.95, base - fh * 0.90,
          fx + f.fw * 0.95,               base - fh * 0.42,
          fx + f.fw * 1.55,               base
        );
        ctx.closePath();
        ctx.fill();

        // Core flame — pale green-white base → emerald → deep green tip
        const cfG = ctx.createLinearGradient(fx, base, fx, base - fh);
        cfG.addColorStop(0.00, `rgba(210,255,200,${f.al.toFixed(3)})`);
        cfG.addColorStop(0.18, `rgba(100,240,120,${(f.al * 0.93).toFixed(3)})`);
        cfG.addColorStop(0.45, `rgba(40,190,75,${(f.al * 0.72).toFixed(3)})`);
        cfG.addColorStop(0.75, `rgba(15,130,50,${(f.al * 0.40).toFixed(3)})`);
        cfG.addColorStop(1.00, 'rgba(5,80,25,0)');
        ctx.fillStyle = cfG;
        ctx.beginPath();
        ctx.moveTo(fx - f.fw * 0.50, base);
        ctx.bezierCurveTo(
          fx - f.fw * 0.58, base - fh * 0.36,
          fx + lean * 0.40, base - fh * 0.76,
          fx + lean,        base - fh
        );
        ctx.bezierCurveTo(
          fx + lean * 0.40 + f.fw * 0.28, base - fh * 0.76,
          fx + f.fw * 0.58,               base - fh * 0.36,
          fx + f.fw * 0.50,               base
        );
        ctx.closePath();
        ctx.fill();
      }

      // ── 7. Sparks ──────────────────────────────────────────────────────
      for (let i = 0; i < 12; i++) {
        // Slow rise — each spark takes ~5 seconds to travel up
        const st     = (timeOffset * 1.4 + i * (1 / 12)) % 1;
        if (st > 0.92) continue;
        const lifeT  = st / 0.92;
        const drift  = Math.sin(i * 2.5 + timeOffset * 12) * R * 0.14;
        const sideOff = Math.sin(i * 1.3) * R * 0.16;
        const sparkX = cx + sideOff + drift;
        const sparkY = fireBase - lifeT * R * 1.65;
        const size   = (1.5 - lifeT * 0.9) * Math.max(1.2, R * 0.028);
        ctx.globalAlpha = (1 - lifeT) * 0.14;
        ctx.fillStyle = lifeT < 0.35 ? 'rgba(180,255,160,1)' : 'rgba(60,200,85,1)';
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // Draws a single log as a 3D cylinder — top face, front side face,
  // and end-grain circle at the near end (x1,y1). Far end (x2,y2) recedes.
  private drawCylindricalLog(
    x1: number, y1: number,
    x2: number, y2: number,
    radius: number,
    flicker: number
  ): void {
    const { ctx } = this;
    ctx.save();

    const dx  = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    // Unit perpendicular; flip so it points toward top of screen
    let px = -dy / len, py = dx / len;
    if (py > 0) { px = -px; py = -py; }

    // Four corners of the visible top face
    const tl = { x: x1 + px * radius, y: y1 + py * radius };
    const tr = { x: x2 + px * radius, y: y2 + py * radius };
    const br = { x: x2 - px * radius, y: y2 - py * radius };
    const bl = { x: x1 - px * radius, y: y1 - py * radius };

    // Front side face — the narrow strip of cylinder facing the viewer
    const sideH = radius * 0.42;
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(br.x, br.y + sideH);
    ctx.lineTo(bl.x, bl.y + sideH);
    ctx.closePath();
    const sideG = ctx.createLinearGradient(0, bl.y, 0, bl.y + sideH);
    sideG.addColorStop(0, 'rgba(8,22,10,0.97)');
    sideG.addColorStop(1, 'rgba(2,6,3,0.99)');
    ctx.fillStyle = sideG;
    ctx.fill();

    // Top face — main visible surface, lit warm near fire end,
    // cooling to near-black at the far end
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    const topG = ctx.createLinearGradient(x1, y1, x2, y2);
    topG.addColorStop(0.0, `rgba(18,52,22,${(0.88 * flicker).toFixed(3)})`);
    topG.addColorStop(0.45, 'rgba(10,34,14,0.91)');
    topG.addColorStop(1.0,  'rgba(4,12,5,0.95)');
    ctx.fillStyle = topG;
    ctx.fill();

    // Specular ridge along the crown of the cylinder — catches fire glow
    const hx1 = (tl.x + bl.x) * 0.5, hy1 = (tl.y + bl.y) * 0.5;
    const hx2 = (tr.x + br.x) * 0.5, hy2 = (tr.y + br.y) * 0.5;
    ctx.beginPath();
    ctx.moveTo(hx1, hy1);
    ctx.lineTo(hx2, hy2);
    ctx.strokeStyle = `rgba(40,180,70,${(0.12 * flicker).toFixed(3)})`;
    ctx.lineWidth   = radius * 0.22;
    ctx.lineCap     = 'round';
    ctx.stroke();

    // ── Near end-grain circle ──────────────────────────────────────────────
    // A log's cut face: dark wood, concentric growth rings, fire-lit glow.
    // The face is an ellipse oriented perpendicular to the log direction.
    const logAngle = Math.atan2(dy, dx);
    const endRy    = radius * 0.50;  // perspective compression of end circle

    // Bark fill
    ctx.beginPath();
    ctx.ellipse(x1, y1, radius, endRy, logAngle + Math.PI / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5,14,6,0.94)';
    ctx.fill();

    // Bark outer ring (wide stroke)
    ctx.beginPath();
    ctx.ellipse(x1, y1, radius, endRy, logAngle + Math.PI / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(8,24,10,0.82)';
    ctx.lineWidth   = radius * 0.18;
    ctx.stroke();

    // Concentric growth rings
    for (let ring = 1; ring <= 3; ring++) {
      const rf = ring / 3.6;
      ctx.beginPath();
      ctx.ellipse(x1, y1, radius * rf, endRy * rf, logAngle + Math.PI / 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(10,28,12,${0.18 + ring * 0.09})`;
      ctx.lineWidth   = 0.7;
      ctx.stroke();
    }

    // Warm glow from the fire reflected on the end face
    const endGlowG = ctx.createRadialGradient(x1, y1, 0, x1, y1, radius * 1.25);
    endGlowG.addColorStop(0, `rgba(60,200,80,${(0.10 * flicker).toFixed(3)})`);
    endGlowG.addColorStop(1, 'rgba(30,150,55,0)');
    ctx.fillStyle = endGlowG;
    ctx.beginPath();
    ctx.ellipse(x1, y1, radius * 1.25, endRy * 1.25, logAngle + Math.PI / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawFireflies(): void {
    const { ctx, noise2D, timeOffset } = this;
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(130,230,100,0.92)';

    // Pre-compute cluster drifts — each cluster moves together as a swarm
    const clusterDriftX = Array.from({ length: 9 }, (_, ci) =>
      noise2D(ci * 5.3, timeOffset * 0.55) * 60
    );
    const clusterDriftY = Array.from({ length: 9 }, (_, ci) =>
      noise2D(ci * 5.3 + 100, timeOffset * 0.55) * 38
    );

    for (const fly of this.fireflies) {
      const nx = noise2D(fly.seed,       timeOffset) * 28 + clusterDriftX[fly.cluster];
      const ny = noise2D(fly.seed + 100, timeOffset) * 18 + clusterDriftY[fly.cluster];
      const pulse = 0.28 + 0.72 * ((noise2D(fly.seed + 200, timeOffset * 2.8) + 1) * 0.5);
      const groupPulse = 0.55 + 0.45 * ((noise2D(fly.cluster * 3.7 + 400, timeOffset * 1.0) + 1) * 0.5);

      ctx.globalAlpha = Math.min(1, pulse * groupPulse * 0.88);
      // Slight warm/cool color variation per firefly
      ctx.fillStyle = noise2D(fly.seed + 300, timeOffset * 0.3) > 0
        ? 'rgba(188,250,136,1)'
        : 'rgba(136,230,188,1)';
      ctx.beginPath();
      ctx.arc(fly.baseX + nx, fly.baseY + ny, fly.size * (0.62 + pulse * 0.38), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore(); // resets shadowBlur and globalAlpha
  }

  private drawVignette(): void {
    const { ctx, width: w, height: h } = this;
    const v = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.25, w * 0.5, h * 0.5, h * 0.82);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.58)');
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
