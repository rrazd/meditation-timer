---
phase: 04-animated-nature-scenes
plan: 01
subsystem: ui
tags: [canvas, animation, scenes, simplex-noise, strategy-pattern, typescript]

# Dependency graph
requires:
  - phase: 03-session-audio-foundation
    provides: audio wiring in main.ts, event bus shape, state.ts structure
provides:
  - IScene strategy interface with init/update/resize/destroy contract
  - SceneName union type ('rain' | 'forest' | 'ocean')
  - SceneController with rAF loop, 30fps cap, event bus integration
  - Canvas element (#scene-canvas) fixed full-screen behind UI
  - Transparent session screen overlay (rgba(0,0,0,0.35))
  - stub scene files (rain.ts, forest.ts, ocean.ts) for Plan 02 to fill
affects: [04-02-PLAN.md, 04-03-PLAN.md]

# Tech tracking
tech-stack:
  added: [simplex-noise@4.0.3]
  patterns: [IScene strategy interface, SceneController rAF loop with 30fps cap, event bus scene lifecycle wiring]

key-files:
  created:
    - src/scenes/scene.interface.ts
    - src/scenes/scene-controller.ts
    - src/scenes/rain.ts
    - src/scenes/forest.ts
    - src/scenes/ocean.ts
  modified:
    - src/state.ts
    - src/event-bus.ts
    - src/ui/setup-screen.ts
    - src/main.ts
    - index.html
    - package.json

key-decisions:
  - "import type used for all type-only imports — verbatimModuleSyntax: true in tsconfig requires this (consistent with Phase 1-3 pattern)"
  - "sessionPaused field preserved in state.ts despite plan template omitting it — main.ts depends on it (Phase 2 addition)"
  - "session:start bus.emit called after timer.start() in main.ts so SceneController starts scene with correct timing"
  - "Canvas placed before session-screen in HTML DOM so z-index stacking works correctly (canvas z:0, session-screen z:1)"

patterns-established:
  - "SceneController pattern: rAF loop with FRAME_INTERVAL_MS guard (1000/30 = 33.33ms) for 30fps cap on any display refresh rate"
  - "Scene lifecycle: startScene() calls stopScene() first to tear down previous scene before initialising next"
  - "Reduced motion checked once at SceneController init — canvas drawing is pure JS, browser cannot suppress it automatically"
  - "DPR-aware canvas sizing: canvas.width = Math.floor(w * dpr), CSS width set separately — scenes must re-apply ctx.scale on resize"

requirements-completed: [IMRS-01, IMRS-02]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 4 Plan 01: Animated Nature Scenes Infrastructure Summary

**IScene strategy interface + SceneController rAF loop with simplex-noise installed, canvas wired into DOM, session screen transparent overlay applied**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T21:22:09Z
- **Completed:** 2026-02-19T21:24:09Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Installed simplex-noise@4.0.3 (peer dependency for all scene implementations in Plan 02)
- Created IScene strategy interface with init/update/resize/destroy contract and SceneName union type
- Created SceneController with 30fps-capped rAF loop, scene lifecycle management, and event bus subscriptions (session:start, session:stop, session:complete, timer:tick)
- Added #scene-canvas element to DOM (fixed, full-screen, z-index 0, hidden by default) and changed session screen background to rgba(0,0,0,0.35)
- Extended state.ts with sceneName field and updated initSetupScreen signature to pass sceneName to session:start

## Task Commits

Each task was committed atomically:

1. **Task 1: Install simplex-noise and create IScene interface** - `33eddf6` (feat)
2. **Task 2: Create SceneController + extend state/event-bus/main/HTML** - `57a0892` (feat)

## Files Created/Modified
- `src/scenes/scene.interface.ts` - IScene interface, SceneOptions type, SceneName union ('rain' | 'forest' | 'ocean')
- `src/scenes/scene-controller.ts` - rAF loop with 30fps cap, scene lifecycle, event bus wiring
- `src/scenes/rain.ts` - compilable stub implementing IScene (Plan 02 fills the implementation)
- `src/scenes/forest.ts` - compilable stub implementing IScene (Plan 02 fills the implementation)
- `src/scenes/ocean.ts` - compilable stub implementing IScene (Plan 02 fills the implementation)
- `src/state.ts` - added sceneName: SceneName field defaulting to 'rain'
- `src/event-bus.ts` - updated comment block: session:start now documents sceneName in detail
- `src/ui/setup-screen.ts` - updated initSetupScreen to accept (durationMs, sceneName) callback; selectedScene defaults to 'rain'
- `src/main.ts` - added initSceneController(canvas); bus.emit('session:start', { durationMs, sceneName }) in onStart callback
- `index.html` - added #scene-canvas (fixed, z-index 0), session-screen background changed to rgba(0,0,0,0.35)
- `package.json` / `package-lock.json` - simplex-noise@4.0.3 added

## Decisions Made
- `import type` used for all type-only imports across new files — verbatimModuleSyntax: true in tsconfig requires it (same pattern established in Phases 1-3)
- sessionPaused preserved in state.ts — the plan template omitted it but main.ts references it from Phase 2; preserved for correctness
- bus.emit('session:start') placed after timer.start() in main.ts — SceneController receives the event with the scene already ready to begin
- Canvas placed before session-screen in HTML DOM order — necessary for z-index layering (canvas z:0, session-screen z:1)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Applied import type for verbatimModuleSyntax compatibility**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** Plan code samples used `import { IScene, SceneOptions }` but tsconfig has verbatimModuleSyntax: true, which requires `import type` for type-only imports — caused 12 TS errors
- **Fix:** Changed all type-only imports to `import type { ... }` in rain.ts, forest.ts, ocean.ts, scene-controller.ts, state.ts, setup-screen.ts, main.ts
- **Files modified:** All 7 new/modified TypeScript files
- **Verification:** `npx tsc --noEmit` exits with 0 errors
- **Committed in:** 57a0892 (Task 2 commit)

**2. [Rule 1 - Bug] Preserved sessionPaused in state.ts**
- **Found during:** Task 2 (reading existing state.ts before overwriting)
- **Issue:** Plan's state.ts template omitted sessionPaused field, but main.ts (Phase 2 additions) reads and writes state.sessionPaused
- **Fix:** Kept sessionPaused: boolean in AppState interface and initialised to false
- **Files modified:** src/state.ts
- **Verification:** `npx tsc --noEmit` exits with 0 errors; main.ts compiles without missing property errors
- **Committed in:** 57a0892 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep — all changes stay within plan's intended scope.

## Issues Encountered
None beyond the auto-fixed import type and state field issues above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 can now implement RainScene, ForestScene, OceanScene by replacing stub files — all infrastructure in place
- Plan 03 can add scene picker UI to setup-screen.ts — selectedScene local variable already exists and is passed to callback
- TypeScript compiles cleanly with 0 errors across all new and modified files
- Canvas is in the DOM hidden by default; SceneController handles show/hide on session:start/stop/complete

---
*Phase: 04-animated-nature-scenes*
*Completed: 2026-02-19*

## Self-Check: PASSED

- All 11 files verified present on disk
- Task commits 33eddf6 and 57a0892 verified in git log
- `npx tsc --noEmit` exits with 0 errors
