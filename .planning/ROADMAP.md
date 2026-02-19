# Roadmap: Meditation Timer

## Overview

This roadmap delivers a browser-based meditation timer through seven phases that move from a working countdown engine to a fully immersive experience. Phase 1 establishes the project scaffold alongside a functional timer loop. Phase 2 hardens session controls and platform resilience. Phase 3 introduces Web Audio API through the end-of-session chime, establishing the audio architecture everything else depends on. Phases 4 and 5 deliver the product's differentiators -- animated Canvas nature scenes and gapless ambient audio -- as two tightly coupled phases. Phase 6 adds transition polish (fade in/out). Phase 7 completes the immersive experience with Fullscreen API integration and auto-hiding session controls.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Timer Core** - Project scaffold, duration input, session start, and countdown display (completed 2026-02-18)
- [x] **Phase 2: Session Controls and Platform Resilience** - Pause/resume, stop early, screen wake lock, and responsive mobile layout (completed 2026-02-19)
- [x] **Phase 3: Session Audio Foundation** - End-of-session chime via Web Audio API with lazy AudioContext (completed 2026-02-19)
- [ ] **Phase 4: Animated Nature Scenes** - Scene selection UI and Canvas-rendered animated backgrounds
- [ ] **Phase 5: Ambient Audio and Scene Pairing** - Gapless ambient sound loops paired to selected scenes
- [ ] **Phase 6: Session Transitions** - Gentle fade-in and fade-out for animation and audio
- [ ] **Phase 7: Full-Screen Immersion** - Fullscreen API integration and auto-hiding session controls

## Phase Details

### Phase 1: Timer Core
**Goal**: User can set a meditation duration and watch a countdown tick down on screen
**Depends on**: Nothing (first phase)
**Requirements**: TIMER-01, TIMER-02, TIMER-05
**Success Criteria** (what must be TRUE):
  1. User can choose a preset duration (5, 10, 15, or 20 minutes) or type a custom number of minutes
  2. User can press a start button and see the session screen replace the setup screen
  3. User sees remaining time counting down in minutes and seconds during the session
  4. Timer remains accurate after 15 minutes even if the browser tab is backgrounded (Web Worker + wall-clock delta)
  5. Setup screen is calm, centered, and minimal with muted cool tones
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Vite + Tailwind v4 scaffold, event bus, app state, formatTime utility
- [ ] 01-02-PLAN.md — Web Worker timer engine (timer-worker.ts + timer.ts wrapper)
- [ ] 01-03-PLAN.md — UI screens (setup + session), GSAP transitions, main.ts wiring + human verify

### Phase 2: Session Controls and Platform Resilience
**Goal**: User can pause, resume, and stop sessions with confidence that their device will stay awake and the app works on mobile
**Depends on**: Phase 1
**Requirements**: TIMER-03, TIMER-04, UX-05, UX-06
**Success Criteria** (what must be TRUE):
  1. User can pause an active session and the countdown freezes; user can resume and the countdown continues from where it left off
  2. User can stop a session early and return to the setup screen
  3. Device screen does not dim or lock during an active session (Screen Wake Lock active)
  4. Wake lock is re-acquired when the user returns to the tab after switching away
  5. App is fully usable on mobile browsers with appropriate touch targets and viewport handling
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Pause/resume controls: state extension, pause button HTML, session-screen.ts toggle, main.ts bus wiring
- [ ] 02-02-PLAN.md — Wake lock lifecycle (wake-lock.ts + main.ts), mobile viewport (100dvh, safe-area, touch targets)

### Phase 3: Session Audio Foundation
**Goal**: User hears a gentle chime when the session ends, establishing the Web Audio API architecture for all future audio work
**Depends on**: Phase 2
**Requirements**: TIMER-06
**Success Criteria** (what must be TRUE):
  1. A gentle chime sounds when the timer reaches zero
  2. Chime plays even if the browser tab was backgrounded during the session
  3. AudioContext is created lazily on the first user gesture (start button), not at page load, so autoplay policies are satisfied
  4. Session returns to setup screen after the chime completes
**Plans**: 1 plan

Plans:
- [x] 03-01-PLAN.md — Chime audio asset (public/audio/chime.mp3), src/audio.ts (initAudio + playChime), src/main.ts wiring + human verify (approved)

### Phase 4: Animated Nature Scenes
**Goal**: User selects from curated nature environments and sees a procedurally animated Canvas scene during meditation
**Depends on**: Phase 3
**Requirements**: IMRS-01, IMRS-02
**Success Criteria** (what must be TRUE):
  1. User can choose from 2-3 nature scene environments (e.g., rain, forest, ocean) on the setup screen before starting
  2. The selected scene plays as a full-screen animated background during the session, rendered on Canvas
  3. Animations are smooth and organic (using procedural noise), capped at 30fps for battery efficiency
  4. Scenes respect prefers-reduced-motion by reducing or disabling particle effects
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — simplex-noise install, IScene interface, SceneController, state/event-bus/main wiring, canvas in HTML, session screen transparency fix
- [ ] 04-02-PLAN.md — RainScene, ForestScene, OceanScene full implementations
- [ ] 04-03-PLAN.md — Scene selector UI (Rain/Forest/Ocean buttons on setup screen) + human verify

### Phase 5: Ambient Audio and Scene Pairing
**Goal**: Each nature scene is accompanied by its matching ambient sound, creating a unified immersive environment
**Depends on**: Phase 4
**Requirements**: IMRS-03, IMRS-04
**Success Criteria** (what must be TRUE):
  1. Ambient background sound matching the selected scene plays during the session (e.g., rain sounds for rain scene)
  2. Ambient audio loops seamlessly with no audible gap or click at the loop point
  3. Selecting a scene on the setup screen automatically selects the matching audio -- they are paired, not independent choices
  4. Ambient audio uses Web Audio API AudioBufferSourceNode (not HTML audio element) for gapless looping
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Session Transitions
**Goal**: Sessions start and end with gentle, polished transitions rather than abrupt cuts
**Depends on**: Phase 5
**Requirements**: UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. When a session starts, the scene animation and ambient audio fade in gently over 2-3 seconds
  2. When a session ends, the scene animation and ambient audio fade out gently, followed by the end-of-session chime
  3. Fade-out on session end feels intentional and calm, not jarring (audio volume ramps down via GainNode scheduling)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Full-Screen Immersion
**Goal**: The session experience is distraction-free with full-screen mode and auto-hiding controls
**Depends on**: Phase 6
**Requirements**: UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. Session screen enters full-screen mode (via Fullscreen API) when started, providing a distraction-free view
  2. Session controls (pause, stop) are hidden during immersion to avoid visual clutter
  3. Tapping or clicking anywhere on the screen reveals the session controls temporarily
  4. Full-screen exit returns the user to the setup screen gracefully
**Plans**: TBD

Plans:
- [ ] 07-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Timer Core | 3/3 | Complete    | 2026-02-18 |
| 2. Session Controls and Platform Resilience | 0/2 | Complete    | 2026-02-19 |
| 3. Session Audio Foundation | 1/1 | Complete    | 2026-02-19 |
| 4. Animated Nature Scenes | 0/3 | Not started | - |
| 5. Ambient Audio and Scene Pairing | 0/2 | Not started | - |
| 6. Session Transitions | 0/1 | Not started | - |
| 7. Full-Screen Immersion | 0/1 | Not started | - |
