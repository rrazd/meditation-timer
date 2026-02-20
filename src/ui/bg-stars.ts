// src/ui/bg-stars.ts
// Ambient twinkling star field + occasional shooting stars + distant planets.
// Pointer proximity effect: stars near the cursor grow and brighten (port of
// jh3y's CodePen starscape, re-implemented without React/GSAP).

interface BgStar {
  x: number;
  y: number;
  r: number;
  baseOpacity: number;
  // Two overlapping sine waves create organic, non-repeating shimmer
  freq1: number;        // rad/ms — primary slow oscillation
  freq2: number;        // rad/ms — secondary slightly-faster oscillation
  phase1: number;       // rad — random offset
  phase2: number;       // rad — random offset
  shimmerDepth: number; // fraction — how much brightness varies (kept narrow)
  // Proximity effect (lerped each frame toward target)
  scale: number;
  targetScale: number;
  proxyAlpha: number;        // brightness boosted by cursor proximity
  targetProxyAlpha: number;
}

interface Planet {
  xFrac: number;   // 0–1, fraction of canvas width  (fixed across resizes)
  yFrac: number;   // 0–1, fraction of canvas height
  r: number;       // disc radius px
  color: string;   // core rgba
  glowColor: string;
  glowRadius: number; // halo radius multiplier of r
  type?: 'earth';  // optional: triggers continent + cloud overlay
}

interface ShootingStar {
  headX: number;
  headY: number;
  angle: number;    // radians — direction of travel
  speed: number;    // px/ms
  trailLen: number; // px
  elapsed: number;  // ms into lifetime
  duration: number; // ms total
  isMeteor?: boolean; // true → shower member, drawn subtler
}

// Planets — fixed positions as fractions so they survive resize.
// Placed in the upper 55 % of the screen, away from the card centre.
const PLANETS: Planet[] = [
  // Pale cream gas giant (Jupiter-like) — upper-left quadrant
  { xFrac: 0.13, yFrac: 0.18, r: 4.2, color: 'rgba(210,200,175,0.82)', glowColor: 'rgba(200,188,150,0.18)', glowRadius: 6 },
  // Faint orange-red point (Mars-like) — upper-right
  { xFrac: 0.81, yFrac: 0.12, r: 2.2, color: 'rgba(215,155,110,0.78)', glowColor: 'rgba(200,120,70,0.14)', glowRadius: 7 },
  // Cold blue-white (ice giant, Uranus/Neptune-like) — right mid
  { xFrac: 0.91, yFrac: 0.38, r: 1.8, color: 'rgba(160,200,230,0.72)', glowColor: 'rgba(140,190,225,0.13)', glowRadius: 6 },
  // Earth — upper center, small and distant, blue oceans with continent patches
  { xFrac: 0.55, yFrac: 0.07, r: 4.0, color: 'rgba(45,110,195,0.86)', glowColor: 'rgba(80,160,235,0.13)', glowRadius: 7, type: 'earth' },
];

// Proximity effect constants — mirror the CodePen's default props
const PROXIMITY_RATIO = 0.12; // fraction of vmin defining the influence radius
const SCALE_LIMIT     = 2.5;  // max scale when cursor is directly on a star

// Cursor position — starts off-screen so no stars are affected until first move
let cursorX = -99999;
let cursorY = -99999;

const stars: BgStar[] = [];
let shootingStars: ShootingStar[] = [];
let nextShootingStarIn = 14000 + Math.random() * 16000;
let shootingStarAccum = 0;

// Meteor shower state
let nextMeteorShowerIn = 25000 + Math.random() * 25000; // 25–50 s
let meteorShowerAccum = 0;
let pendingMeteorSpawns: number[] = []; // ms offsets from shower start
let meteorShowerStartElapsed = 0;
let meteorShowerAngle = 0;
let inMeteorShower = false;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let lastTs = 0;
let elapsed = 0; // ms, monotonically increasing

export function initBgStars(): void {
  canvas = document.querySelector<HTMLCanvasElement>('#bg-stars')!;
  ctx = canvas.getContext('2d')!;
  handleResize();
  window.addEventListener('resize', handleResize);
  document.addEventListener('pointermove', (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
  });
  requestAnimationFrame(tick);
}

export function hideBgStars(): void {
  canvas.style.transition = 'opacity 0.5s ease';
  canvas.style.opacity = '0';
}

export function showBgStars(): void {
  canvas.style.transition = 'opacity 1.2s ease';
  canvas.style.opacity = '1';
}

// ── Private ──────────────────────────────────────────────────────────────────

function handleResize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  buildStars();
}

function buildStars(): void {
  stars.length = 0;
  const count = Math.min(200, Math.floor(canvas.width * canvas.height / 7500));
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.88,
      r: 0.3 + Math.random() * 1.1,
      baseOpacity: 0.12 + Math.random() * 0.52,
      freq1: 0.000285 + Math.random() * 0.000497, // period ~8–22s
      freq2: 0.000185 + Math.random() * 0.000340, // period ~12–34s
      phase1: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      shimmerDepth: 0.18 + Math.random() * 0.32,
      scale: 1,
      targetScale: 1,
      proxyAlpha: 0,
      targetProxyAlpha: 0,
    });
  }
}

function spawnShootingStar(): ShootingStar {
  // Streak diagonally downward, angle 20–50° below horizontal
  const angle = (20 + Math.random() * 30) * (Math.PI / 180);
  const speed = 0.55 + Math.random() * 0.35; // px/ms
  return {
    headX: Math.random() * canvas.width * 0.75,
    headY: Math.random() * canvas.height * 0.40,
    angle,
    speed,
    trailLen: 90 + Math.random() * 110,
    elapsed: 0,
    duration: 1100 + Math.random() * 700, // 1.1–1.8s
  };
}

function spawnMeteor(baseAngle: number): ShootingStar {
  return {
    headX: Math.random() * canvas.width * 0.88,
    headY: Math.random() * canvas.height * 0.38,
    angle: baseAngle + (Math.random() - 0.5) * 0.10, // tight radiant
    speed: 0.35 + Math.random() * 0.22,              // gentler than single star
    trailLen: 50 + Math.random() * 60,
    elapsed: 0,
    duration: 850 + Math.random() * 500,
    isMeteor: true,
  };
}

function drawShootingStar(ss: ShootingStar): void {
  const t = ss.elapsed / ss.duration;
  // Envelope: fast fade-in (first 15%), hold, then gentle fade-out (last 40%)
  const opacity = t < 0.15
    ? t / 0.15
    : t > 0.60
      ? 1 - (t - 0.60) / 0.40
      : 1.0;

  if (opacity <= 0) return;

  // Meteor shower members are subtler than a lone shooting star — shorter glow,
  // dimmer trail — but visible enough to read as a distinct cluster event.
  const trailPeak  = ss.isMeteor ? 0.55 : 0.85;
  const trailMid   = ss.isMeteor ? 0.18 : 0.25;
  const headAlpha  = ss.isMeteor ? 0.55 : 0.70;
  const headRadius = ss.isMeteor ? 0.75 : 1.0;

  const tailX = ss.headX - Math.cos(ss.angle) * ss.trailLen;
  const tailY = ss.headY - Math.sin(ss.angle) * ss.trailLen;

  const grad = ctx.createLinearGradient(tailX, tailY, ss.headX, ss.headY);
  grad.addColorStop(0.0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.5, `rgba(210,228,255,${(opacity * trailMid).toFixed(3)})`);
  grad.addColorStop(1.0, `rgba(255,255,255,${(opacity * trailPeak).toFixed(3)})`);

  ctx.save();
  ctx.strokeStyle = grad;
  ctx.lineWidth = ss.isMeteor ? 0.85 : 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(ss.headX, ss.headY);
  ctx.stroke();

  // Bright point at the head
  ctx.globalAlpha = opacity * headAlpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ss.headX, ss.headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function tick(ts: number): void {
  const dt = lastTs === 0 ? 0 : ts - lastTs;
  lastTs = ts;
  elapsed += dt;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ── Static stars with pointer proximity effect ────────────────────────────
  const vmin = Math.min(canvas.width, canvas.height);
  const proximityRadius = vmin * PROXIMITY_RATIO;
  // Lerp factor — tuned so a star reaches its target in ~180 ms (matches GSAP default)
  const lerpK = dt > 0 ? 1 - Math.exp(-dt * 0.009) : 0;

  for (const s of stars) {
    // ── Proximity: how close is the cursor? ──
    const dx = s.x - cursorX;
    const dy = s.y - cursorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const t = Math.min(dist, proximityRadius) / proximityRadius; // 0=at cursor, 1=outside radius
    s.targetScale      = SCALE_LIMIT + t * (1 - SCALE_LIMIT);               // SCALE_LIMIT→1
    s.targetProxyAlpha = s.baseOpacity + (1 - t) * (1 - s.baseOpacity);     // boosted→natural

    s.scale      += (s.targetScale      - s.scale)      * lerpK;
    s.proxyAlpha += (s.targetProxyAlpha - s.proxyAlpha) * lerpK;

    // ── Shimmer (existing twinkling) ──
    const w1 = (Math.sin(elapsed * s.freq1 + s.phase1) + 1) * 0.5;
    const w2 = (Math.sin(elapsed * s.freq2 + s.phase2) + 1) * 0.5;
    const shimmer = (w1 + w2) * 0.5;
    const shimmerAlpha = s.baseOpacity * (1 - s.shimmerDepth * (1 - shimmer));

    // Proximity always wins if it pushes brightness higher than the shimmer
    const finalAlpha  = Math.max(shimmerAlpha, s.proxyAlpha);
    const finalRadius = s.r * s.scale;

    ctx.globalAlpha = Math.max(0, finalAlpha);
    ctx.shadowBlur  = (finalRadius * 8 + s.baseOpacity * 6) * (0.3 + shimmer * 0.7) * Math.max(1, s.scale * 0.7);
    ctx.shadowColor = 'rgba(200,218,255,0.85)';
    ctx.fillStyle   = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, finalRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // ── Planets ───────────────────────────────────────────────────────────────
  for (const p of PLANETS) {
    const px = p.xFrac * canvas.width;
    const py = p.yFrac * canvas.height;

    // Soft atmospheric halo
    const halo = ctx.createRadialGradient(px, py, 0, px, py, p.r * p.glowRadius);
    halo.addColorStop(0.0, p.glowColor);
    halo.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, p.r * p.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Disc — radial gradient gives slight limb-darkening
    const disc = ctx.createRadialGradient(px - p.r * 0.28, py - p.r * 0.28, 0, px, py, p.r);
    disc.addColorStop(0.0, p.color);
    disc.addColorStop(0.65, p.color);
    disc.addColorStop(1.0, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();

    // Earth-specific overlay — continent patches + cloud wisps clipped to disc
    if (p.type === 'earth') {
      ctx.save();
      // Establish clip region = disc circle
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.clip();

      const R = p.r;
      // Main continent (Eurasia/Africa-like) — upper-right of disc
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = 'rgba(62,108,55,0.88)';
      ctx.beginPath();
      ctx.ellipse(px + R * 0.18, py - R * 0.12, R * 0.38, R * 0.26, 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Secondary continent (Americas-like) — left side
      ctx.fillStyle = 'rgba(55,100,50,0.76)';
      ctx.beginPath();
      ctx.ellipse(px - R * 0.28, py + R * 0.14, R * 0.22, R * 0.32, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Cloud streak across upper portion
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = 'rgba(235,245,255,0.90)';
      ctx.beginPath();
      ctx.ellipse(px - R * 0.06, py - R * 0.30, R * 0.52, R * 0.13, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Thin atmosphere rim — bright blue ring at edge
      ctx.globalAlpha = 0.28;
      const atmo = ctx.createRadialGradient(px, py, R * 0.78, px, py, R);
      atmo.addColorStop(0.0, 'rgba(0,0,0,0)');
      atmo.addColorStop(1.0, 'rgba(120,190,255,0.55)');
      ctx.fillStyle = atmo;
      ctx.beginPath();
      ctx.arc(px, py, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ── Shooting stars ────────────────────────────────────────────────────────
  shootingStarAccum += dt;
  if (shootingStarAccum >= nextShootingStarIn) {
    shootingStarAccum = 0;
    nextShootingStarIn = 14000 + Math.random() * 16000; // next in 14–30s
    shootingStars.push(spawnShootingStar());
  }

  // ── Meteor shower — only when no single shooting star is active ──────────
  meteorShowerAccum += dt;
  const noActiveSingleStar = !shootingStars.some(s => !s.isMeteor);
  if (!inMeteorShower && meteorShowerAccum >= nextMeteorShowerIn && noActiveSingleStar) {
    inMeteorShower = true;
    meteorShowerStartElapsed = elapsed;
    meteorShowerAccum = 0;
    nextMeteorShowerIn = 95000 + Math.random() * 95000;
    // Pick a shared radiant direction for this shower
    meteorShowerAngle = (22 + Math.random() * 20) * (Math.PI / 180);
    const count = 6 + Math.floor(Math.random() * 5); // 6–10 meteors
    pendingMeteorSpawns = [];
    let offset = 0;
    for (let i = 0; i < count; i++) {
      pendingMeteorSpawns.push(offset);
      offset += 280 + Math.random() * 520;
    }
  }

  if (inMeteorShower) {
    const showerAge = elapsed - meteorShowerStartElapsed;
    while (pendingMeteorSpawns.length > 0 && showerAge >= pendingMeteorSpawns[0]) {
      pendingMeteorSpawns.shift();
      shootingStars.push(spawnMeteor(meteorShowerAngle));
    }
    if (pendingMeteorSpawns.length === 0) inMeteorShower = false;
  }

  for (const ss of shootingStars) {
    ss.elapsed += dt;
    ss.headX += Math.cos(ss.angle) * ss.speed * dt;
    ss.headY += Math.sin(ss.angle) * ss.speed * dt;
    drawShootingStar(ss);
  }
  shootingStars = shootingStars.filter(ss => ss.elapsed < ss.duration);

  requestAnimationFrame(tick);
}
