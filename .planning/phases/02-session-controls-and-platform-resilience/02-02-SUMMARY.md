---
phase: 02-session-controls-and-platform-resilience
plan: "02"
subsystem: ui
tags: [screen-wake-lock, mobile, ios-safari, dvh, safe-area, touch-targets]

# Dependency graph
requires:
  - phase: 02-01-session-controls-and-platform-resilience
    provides: state.sessionPaused and state.sessionActive flags; session:pause, session:resume, session:complete bus events; initSessionScreen returning reset function

provides:
  - src/utils/wake-lock.ts with acquireWakeLock and releaseWakeLock exports
  - Wake lock lifecycle wiring in main.ts (acquire on start, release on stop/complete, re-acquire on tab return when not paused)
  - visibilitychange listener for re-acquiring wake lock on tab return
  - Mobile-safe 100dvh layout on both screens
  - viewport-fit=cover for safe-area inset support
  - 44px touch targets on pointer:coarse devices
  - touch-action: manipulation on all interactive elements (no 300ms tap delay)

affects:
  - 03-ambient-audio (wake lock must remain active during chime playback)
  - 04-immersive-visuals (full-screen layout builds on safe-area inset foundation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Screen Wake Lock API with null-sentinel guard pattern (null-check instead of .released for cross-browser safety)
    - WakeLockSentinel release event clears module-level reference so next acquire gets fresh sentinel
    - visibilitychange registered once at startup (not added/removed per session)
    - 100dvh (Dynamic Viewport Height) instead of 100vh for iOS Safari compatibility
    - env(safe-area-inset-*) with 0px fallback for notch/Dynamic Island/home indicator padding
    - pointer:coarse media query for touch-specific styles (not hover:none — covers hybrid devices)

key-files:
  created:
    - src/utils/wake-lock.ts
  modified:
    - src/main.ts
    - index.html
    - src/styles/variables.css

key-decisions:
  - "Null-check (wakeLock !== null) used instead of .released property for wake lock guard — more consistent across browser implementations"
  - "visibilitychange listener registered once at startup, not conditionally — avoids listener leak from add/remove on session transitions"
  - "100dvh used instead of 100vh — fixes iOS Safari overflow when address bar is visible (100dvh adjusts dynamically)"
  - "pointer:coarse used for touch target media query (not hover:none) — correctly covers hybrid touchscreen/mouse devices"
  - "user-scalable=no deliberately omitted from viewport meta — violates WCAG SC 1.4.4 Resize Text"

patterns-established:
  - "Wake lock module uses module-level singleton with null guard — one sentinel at a time, safe to call acquireWakeLock idempotently"
  - "Wake lock errors are non-fatal (warn + continue) — timer works even without wake lock (low battery, power-save mode)"
  - "Safe-area insets applied via CSS variables.css on screen containers, not inline styles — keeps HTML clean"

requirements-completed: [UX-05, UX-06]

# Metrics
duration: 2min
completed: 2026-02-19
---

# Phase 2 Plan 02: Screen Wake Lock and Mobile Platform Resilience Summary

**Screen Wake Lock with correct acquire/release/re-acquire lifecycle wired to session state, plus iOS Safari 100dvh layout, safe-area insets, and 44px touch targets via pointer:coarse**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-19T00:48:16Z
- **Completed:** 2026-02-19T00:50:09Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `src/utils/wake-lock.ts` — self-contained module with `acquireWakeLock` and `releaseWakeLock` using null-sentinel guard pattern
- Wired wake lock lifecycle into `main.ts`: acquire on session start, release on stop/complete, re-acquire on session:resume and on tab return when not paused
- Fixed iOS Safari viewport overflow by changing `min-height: 100vh` to `min-height: 100dvh` on both screens
- Added `viewport-fit=cover`, safe-area inset padding, `touch-action: manipulation`, and 44px `@media (pointer: coarse)` touch targets

## Task Commits

Each task was committed atomically:

1. **Task 1: Create wake-lock.ts and wire lifecycle into main.ts** - `f7254f6` (feat)
2. **Task 2: Mobile viewport, safe-area insets, touch targets, and dvh layout** - `90d5647` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/utils/wake-lock.ts` - Screen Wake Lock API module; exports acquireWakeLock and releaseWakeLock; null-sentinel guard; release event clears reference for fresh sentinel on next acquire
- `src/main.ts` - Wake lock wiring: acquire on session start and resume, release on stop/complete; visibilitychange listener for re-acquire on tab return (active, non-paused sessions only)
- `index.html` - viewport-fit=cover added to meta viewport; min-height changed from 100vh to 100dvh on both screens
- `src/styles/variables.css` - Safe-area inset padding on screen containers; touch-action: manipulation on button/input/a; @media (pointer: coarse) with 44px min-height/width on buttons and inputs

## Decisions Made

- Null-check (`wakeLock !== null`) used instead of `.released` property — more consistent across browser implementations (`.released` can have cross-browser inconsistency immediately after manual release)
- `visibilitychange` listener registered unconditionally at startup — avoids listener leak from add/remove on session transitions; idle when no session is active (state guard)
- `100dvh` (Dynamic Viewport Height) instead of `100vh` — iOS Safari `100vh` equals max viewport height (chrome retracted), causing overflow when address bar visible; `100dvh` adjusts dynamically
- `pointer: coarse` for touch target media query instead of `hover: none` — covers hybrid devices (tablet with keyboard/mouse) correctly
- `user-scalable=no` deliberately omitted — violates WCAG SC 1.4.4 Resize Text

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wake lock foundation is in place for Phase 3 (ambient audio) — wake lock remains active during chime playback
- Safe-area inset infrastructure is ready for Phase 4 (immersive visuals / full-screen layout)
- All UX-05 and UX-06 requirements delivered

---
*Phase: 02-session-controls-and-platform-resilience*
*Completed: 2026-02-19*

## Self-Check: PASSED

- src/utils/wake-lock.ts: FOUND
- src/main.ts: FOUND
- index.html: FOUND
- src/styles/variables.css: FOUND
- 02-02-SUMMARY.md: FOUND
- Commit f7254f6: FOUND
- Commit 90d5647: FOUND
