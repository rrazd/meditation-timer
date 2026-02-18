---
phase: 01-timer-core
plan: 03
subsystem: ui
tags: [typescript, gsap, event-bus, css-custom-properties, prefers-reduced-motion, web-worker]

# Dependency graph
requires:
  - phase: 01-timer-core/01-01
    provides: "event-bus singleton (bus), AppState, formatTime utility, CSS design tokens, two-screen DOM structure"
  - phase: 01-timer-core/01-02
    provides: "Timer class wrapping Web Worker with start/stop, timer:tick and session:complete bus events"
provides:
  - setup-screen.ts: preset duration buttons (5/10/15/20 min) + custom input + inline validation + onStart callback
  - session-screen.ts: live countdown display via timer:tick bus events + stop button wired to onStop callback
  - transitions.ts: GSAP opacity fade between setup/session screens with prefers-reduced-motion support (0ms fallback)
  - main.ts: fully wired application — Timer + setup screen + session screen + bus listeners connected
affects: [02-wake-lock, 03-audio, 04-ambient, 05-breath-guide, 06-immersive, 07-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Callback-based UI wiring: UI modules receive callbacks (onStart, onStop) rather than importing main.ts or bus directly
    - GSAP display toggle in onComplete: display:none only set inside onComplete callback — never before animation starts
    - prefers-reduced-motion: getAnimDuration() helper returns 0 if OS reduced-motion preference active

key-files:
  created:
    - src/ui/setup-screen.ts
    - src/ui/session-screen.ts
    - src/ui/transitions.ts
  modified:
    - src/main.ts

key-decisions:
  - "UI modules accept callbacks (not bus imports) so they remain testable and decoupled from app wiring"
  - "GSAP display toggle deferred to onComplete callback — GSAP cannot animate opacity on display:none elements"
  - "getAnimDuration() helper centralizes prefers-reduced-motion check — both transitionToSession and transitionToSetup use it"
  - "main.ts holds the single Timer instance — UI modules never instantiate or reference Timer directly"

patterns-established:
  - "Callback pattern: UI init functions take callbacks for side-effects (start, stop) — keeps modules decoupled"
  - "GSAP pattern: opacity animations only; display property toggled only in onComplete to avoid invisible-element issue"
  - "Reduced motion pattern: window.matchMedia checked per animation call, not cached globally"

requirements-completed: [TIMER-01, TIMER-02, TIMER-05]

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 1 Plan 03: UI Screen Wiring Summary

**GSAP fade transitions between setup and session screens, with preset/custom duration picker and live Web Worker countdown display — completing the full Phase 1 interaction loop**

## Performance

- **Duration:** ~17 min (2 min auto-execution + human verification approval)
- **Started:** 2026-02-18T20:54:52Z
- **Completed:** 2026-02-18T22:57:44Z
- **Tasks:** 3 of 3 (all complete — Task 3 human-verify checkpoint approved)
- **Files modified:** 4

## Accomplishments
- Three UI modules created (setup-screen.ts, session-screen.ts, transitions.ts) with zero TypeScript errors
- main.ts smoke-test placeholder fully replaced with production wiring: Timer start/stop, state mutation, screen transitions, session:complete handler
- GSAP transitions correctly defer display:none to onComplete so invisible-element animation bug cannot occur
- prefers-reduced-motion support built into every transition call via getAnimDuration() helper
- Production build succeeds: worker chunk emitted at dist/assets/timer-worker-B6z4v1Wc.js (unchanged), all 15 modules bundled in 244ms
- All 18 human verification steps passed: preset buttons, custom input, GSAP fade transitions, live countdown display, background tab accuracy, inline validation, prefers-reduced-motion

## Task Commits

Each task was committed atomically:

1. **Task 1: Create UI modules (setup-screen, session-screen, transitions)** - `4d93344` (feat)
2. **Task 2: Wire main.ts — connect Timer, event bus, and UI screens** - `07766b9` (feat)
3. **Task 3: Human verification checkpoint** - Approved (no code commit — verification only; all 18 steps passed)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/ui/setup-screen.ts` - Preset buttons (5/10/15/20 min) fill input, custom input clears preset highlight, inline validation shows #duration-error on invalid (1-180), onStart callback fires with durationMs
- `src/ui/session-screen.ts` - bus.on('timer:tick') updates #timer-display using formatTime(), stop button calls onStop callback
- `src/ui/transitions.ts` - transitionToSession() and transitionToSetup() using gsap.timeline() opacity fades; getAnimDuration() returns 0 if prefers-reduced-motion is active
- `src/main.ts` - Application wiring: Timer instance, initSetupScreen callback (timer.start + state + transitionToSession), initSessionScreen callback (timer.stop + state + transitionToSetup), bus.on('session:complete')

## Decisions Made
- UI modules receive callbacks instead of directly importing bus — keeps modules decoupled and testable
- GSAP display toggle deferred to onComplete callback — GSAP cannot animate elements with display:none, so toggling before the animation would break the fade
- getAnimDuration() helper centralizes prefers-reduced-motion check and is called per animation (not cached) so OS setting changes are respected immediately
- Single Timer instance in main.ts — UI modules never instantiate Timer directly (avoids multiple Worker instances)

## Deviations from Plan

None — plan executed exactly as written. All three UI modules match the plan specification verbatim. main.ts wiring matches the plan specification exactly.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Run `npm run dev` to start the development server.

## Next Phase Readiness
- Phase 1 Timer Core is complete — all 3 plans delivered, all 18 verification steps approved
- Phase 2 (Screen Wake Lock) will add wake lock acquisition inside the initSetupScreen callback in main.ts — the callback structure is already in place
- Phase 3 (Audio) will add playChime() call in the bus.on('session:complete') handler — comment placeholder already in main.ts
- Timer, event bus, state, and all UI modules are production-ready
- TIMER-01, TIMER-02, and TIMER-05 requirements are fully delivered and verified

---
*Phase: 01-timer-core*
*Completed: 2026-02-18*

## Self-Check: PASSED

- src/ui/setup-screen.ts: FOUND
- src/ui/session-screen.ts: FOUND
- src/ui/transitions.ts: FOUND
- src/main.ts: FOUND
- .planning/phases/01-timer-core/01-03-SUMMARY.md: FOUND
- Commit 4d93344 (Task 1 - UI modules): FOUND
- Commit 07766b9 (Task 2 - wire main.ts): FOUND
- Task 3 human verification: APPROVED (all 18 steps passed)
