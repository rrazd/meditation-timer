// src/ui/bg-rain-lines.ts
// Linescape-inspired rain-streak effect for the home screen.
// A grid of falling rain streaks respond to cursor proximity:
//   near cursor — brighter, longer, slightly angled toward cursor (wind-blown)
//   far from cursor — thin, near-invisible ambient rain

interface RainStreak {
  colX: number;        // fixed x column (with small jitter)
  y: number;           // head y — advances downward, wraps at bottom
  speed: number;       // px/ms
  baseLen: number;     // rest length in px
  baseAlpha: number;   // rest opacity (unique per streak so grid feels organic)
  // Lerped state
  len: number;
  targetLen: number;
  alpha: number;
  targetAlpha: number;
  tilt: number;        // x offset per px of length — lean toward cursor
  targetTilt: number;
}

const COL_SPACING  = 28;   // px between grid columns
const PROX_RADIUS  = 200;  // px — cursor influence radius
const LERP_RATE    = 0.008; // exp lerp factor (reaches target in ~180ms)

let rainCanvas: HTMLCanvasElement;
let rainCtx: CanvasRenderingContext2D;
let streaks: RainStreak[] = [];
let cursorX = -99999;
let cursorY = -99999;
let lastTs  = 0;

export function initBgRainLines(): void {
  rainCanvas = document.createElement('canvas');
  rainCanvas.id = 'bg-rain-lines';
  rainCanvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';

  // Insert after #bg-stars so it layers above stars but below card
  const bgStars = document.querySelector('#bg-stars');
  if (bgStars?.parentNode) {
    bgStars.parentNode.insertBefore(rainCanvas, bgStars.nextSibling);
  } else {
    document.body.prepend(rainCanvas);
  }

  rainCtx = rainCanvas.getContext('2d')!;
  handleResize();
  window.addEventListener('resize', handleResize);
  document.addEventListener('pointermove', (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
  });
  requestAnimationFrame(tick);
}

export function hideBgRainLines(): void {
  rainCanvas.style.transition = 'opacity 0.5s ease';
  rainCanvas.style.opacity    = '0';
}

export function showBgRainLines(): void {
  rainCanvas.style.transition = 'opacity 1.2s ease';
  rainCanvas.style.opacity    = '1';
}

// ── Private ──────────────────────────────────────────────────────────────────

function handleResize(): void {
  rainCanvas.width  = window.innerWidth;
  rainCanvas.height = window.innerHeight;
  buildStreaks();
}

function buildStreaks(): void {
  streaks = [];
  const w = rainCanvas.width;
  const h = rainCanvas.height;
  const cols = Math.ceil(w / COL_SPACING) + 2;

  for (let c = 0; c < cols; c++) {
    // Small random jitter so columns aren't perfectly aligned
    const colX = c * COL_SPACING + (Math.random() - 0.5) * 10;
    // 2–3 streaks per column staggered vertically
    const count = Math.random() < 0.45 ? 3 : 2;
    for (let s = 0; s < count; s++) {
      const baseLen   = 20 + Math.random() * 34;     // 20–54 px
      const baseAlpha = 0.07 + Math.random() * 0.08;  // 0.07–0.15 at rest — clearly visible
      streaks.push({
        colX,
        y:    Math.random() * (h + 60) - 60,  // spread across full height at init
        speed: 0.05 + Math.random() * 0.08,   // 0.05–0.13 px/ms (gentle rain pace)
        baseLen,
        baseAlpha,
        len:          baseLen,
        targetLen:    baseLen,
        alpha:        baseAlpha,
        targetAlpha:  baseAlpha,
        tilt:         0,
        targetTilt:   0,
      });
    }
  }
}

function tick(ts: number): void {
  const dt = lastTs === 0 ? 16 : ts - lastTs;
  lastTs = ts;

  const w = rainCanvas.width;
  const h = rainCanvas.height;
  rainCtx.clearRect(0, 0, w, h);

  const lerpK = dt > 0 ? 1 - Math.exp(-dt * LERP_RATE) : 0;

  for (const s of streaks) {
    // Advance downward — wrap when fully below screen
    s.y += s.speed * dt;
    if (s.y - s.len > h + 10) {
      s.y = -s.len - Math.random() * 30;
    }

    // Proximity to cursor — measure from mid-point of streak
    const midX = s.colX + s.tilt * (s.len * 0.5);
    const midY = s.y - s.len * 0.5;
    const dx   = midX - cursorX;
    const dy   = midY - cursorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const t    = Math.min(dist, PROX_RADIUS) / PROX_RADIUS; // 0=cursor, 1=outside

    // Targets: boost alpha + length near cursor
    s.targetAlpha = s.baseAlpha + (1 - t) * 0.50;           // max ~0.65 near cursor
    s.targetLen   = s.baseLen   + (1 - t) * s.baseLen * 2.2; // up to 3.2× longer

    // Tilt: lean slightly toward cursor (wind-blown rain effect)
    const cursorDirX  = dist > 1 ? -dx / dist : 0;
    s.targetTilt = (1 - t) * cursorDirX * 0.10; // max 0.10 px lean per px length

    // Lerp
    s.alpha += (s.targetAlpha - s.alpha) * lerpK;
    s.len   += (s.targetLen   - s.len)   * lerpK;
    s.tilt  += (s.targetTilt  - s.tilt)  * lerpK;

    if (s.alpha < 0.005) continue;

    // Streak geometry: head (brightest) at bottom, tail fades upward
    const headX = s.colX + s.tilt * s.len;
    const headY = s.y;
    const tailX = s.colX;
    const tailY = s.y - s.len;

    // Linear gradient: transparent at tail → bright at head
    const grad = rainCtx.createLinearGradient(tailX, tailY, headX, headY);
    grad.addColorStop(0.0, 'rgba(190,170,255,0)');
    grad.addColorStop(0.55, `rgba(200,180,255,${(s.alpha * 0.50).toFixed(3)})`);
    grad.addColorStop(1.0,  `rgba(220,210,255,${s.alpha.toFixed(3)})`);

    // Thickness also grows near cursor
    const thick = 0.45 + (1 - t) * 0.85;

    rainCtx.save();
    rainCtx.strokeStyle = grad;
    rainCtx.lineWidth   = thick;
    rainCtx.lineCap     = 'round';
    rainCtx.beginPath();
    rainCtx.moveTo(tailX, tailY);
    rainCtx.lineTo(headX, headY);
    rainCtx.stroke();
    rainCtx.restore();
  }

  requestAnimationFrame(tick);
}
