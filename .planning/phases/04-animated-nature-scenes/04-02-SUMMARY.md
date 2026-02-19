---
phase: 04-animated-nature-scenes
plan: 02
subsystem: ui
tags: [canvas2d, simplex-noise, animation, requestAnimationFrame, prefers-reduced-motion, typescript]

# Dependency graph
requires:
  - phase: 04-01
    provides: IScene interface, SceneController rAF loop, canvas wiring, simplex-noise installed

provides:
  - RainScene: 200 animated rain drops with diagonal wind effect on dark slate-blue gradient
  - ForestScene: 80 simplex-noise motes with organic drift on deep forest green gradient
  - OceanScene: 12 simplex-noise wave lines with rolling swell on deep navy gradient
  - All three scenes implement prefers-reduced-motion (static gradient only when reducedMotion=true)

affects:
  - 04-03-scene-picker-ui (scene implementations are now live, picker will surface them)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Canvas 2D scenes use { alpha: false } context for opaque background performance"
    - "fillRect with gradient clears and redraws background each frame (not clearRect)"
    - "createNoise2D() called once in init(), stored as instance property, called in update()"
    - "resize() re-acquires canvas.getContext() after dimension change to reset context transform"
    - "import type for IScene/SceneOptions (verbatimModuleSyntax: true requires type-only imports)"

key-files:
  created: []
  modified:
    - src/scenes/rain.ts
    - src/scenes/forest.ts
    - src/scenes/ocean.ts

key-decisions:
  - "import type used for IScene/SceneOptions in all three scene files — verbatimModuleSyntax: true in tsconfig requires type-only imports for types (consistent with Phase 1-3 pattern)"
  - "Rain uses linear motion only (no simplex-noise) — simplest reference implementation; drops wrapped to top when exiting bottom"
  - "Forest motes use fixed base positions + noise2D displacement (not true random walk) — organic appearance without unbounded drift"
  - "Ocean waves spread across lower 70% of canvas; deeper waves more opaque (opacity 0.2 to 0.6 gradient across layers)"

patterns-established:
  - "Scene pattern: init() fetches context + initialises particles, update() redraws gradient then particles, resize() re-fetches context, destroy() clears arrays"
  - "Noise pattern: createNoise2D() factory in init(), timeOffset incremented in update() via dt * scalar"

requirements-completed: [IMRS-02]

# Metrics
duration: 4min
completed: 2026-02-19
---

# Phase 4 Plan 02: Animated Scene Implementations Summary

**Three Canvas 2D nature scenes (Rain, Forest, Ocean) replacing Plan 01 stubs — simplex-noise organic motion with prefers-reduced-motion static fallback**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-19T21:27:29Z
- **Completed:** 2026-02-19T21:31:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- RainScene: 200 animated diagonal rain drops batch-stroked in a single path on dark slate-blue gradient (#0d1b2a to #1a2e40)
- ForestScene: 80 motes with independent simplex-noise displacement (seed-offset per particle) on deep forest gradient (#0a1a12 to #0f2d1a)
- OceanScene: 12 wave lines sampled from simplex-noise with per-layer speed variation on deep navy gradient (#050f1a to #0a1e30)
- All three scenes compile cleanly (TypeScript strict, verbatimModuleSyntax) and respect prefers-reduced-motion

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement RainScene** - `ed59b06` (feat)
2. **Task 2: Implement ForestScene and OceanScene** - `27b5908` (feat)

**Plan metadata:** (docs commit — created after summary)

## Files Created/Modified
- `src/scenes/rain.ts` - Full RainScene: animated drops with diagonal wind effect, dark slate-blue gradient
- `src/scenes/forest.ts` - Full ForestScene: simplex-noise organic mote drift, deep forest green gradient
- `src/scenes/ocean.ts` - Full OceanScene: simplex-noise wave undulation across 12 layered wave lines, deep navy gradient

## Decisions Made
- `import type` used for IScene/SceneOptions in all three scene files — verbatimModuleSyntax: true in tsconfig requires type-only imports (consistent with all prior phases). Plan snippet used plain `import` which was auto-fixed.
- Rain uses linear motion only (no simplex-noise) — clearest reference implementation; drops wrap from bottom to top.
- Forest motes use fixed base positions + noise displacement — prevents unbounded drift while maintaining organic appearance.
- Ocean wave opacity scales from 0.2 (top/distant) to 0.6 (bottom/closer) — depth layering cue.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed import type for IScene and SceneOptions in rain.ts**
- **Found during:** Task 1 (RainScene implementation)
- **Issue:** Plan code snippet used `import { IScene, SceneOptions }` — plain import. tsconfig has `verbatimModuleSyntax: true` which requires `import type` for type-only imports. TypeScript errored: TS1484 'IScene' is a type and must be imported using a type-only import.
- **Fix:** Changed to `import type { IScene, SceneOptions }` in rain.ts. Preemptively applied same fix to forest.ts and ocean.ts.
- **Files modified:** src/scenes/rain.ts (Task 1 commit); src/scenes/forest.ts and src/scenes/ocean.ts (Task 2 commit — preemptive)
- **Verification:** `npx tsc --noEmit` exits with 0 after fix
- **Committed in:** ed59b06 (Task 1), 27b5908 (Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 1 - import type enforcement)
**Impact on plan:** Required for TypeScript compilation — zero scope change to visual implementation.

## Issues Encountered
None — all three scenes implemented as specified, TypeScript compiled cleanly after import type fix.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three scene implementations are live and wired to SceneController via the existing IScene interface
- SceneController startScene() will correctly instantiate and animate any of the three scenes on session:start
- Ready for 04-03: scene picker UI to let users select rain/forest/ocean from the setup screen

---
*Phase: 04-animated-nature-scenes*
*Completed: 2026-02-19*
