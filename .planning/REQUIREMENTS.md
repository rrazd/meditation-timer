# Requirements: Meditation Timer

**Defined:** 2026-02-17
**Core Value:** A distraction-free, visually immersive meditation session that starts in seconds and gets out of the way.

## v1 Requirements

### Timer

- [x] **TIMER-01**: User can set a custom meditation duration before starting (preset options: 5, 10, 15, 20 min; plus custom numeric input)
- [x] **TIMER-02**: User can start a meditation session from the setup screen
- [x] **TIMER-03**: User can pause a session when interrupted and resume it
- [x] **TIMER-04**: User can stop a session early and return to the setup screen
- [x] **TIMER-05**: User sees a subtle countdown display of remaining time during the session
- [ ] **TIMER-06**: A gentle chime sounds when the timer reaches zero and the session ends

### Immersion

- [ ] **IMRS-01**: User can select from 2-3 animated nature scene environments (e.g. rain, forest, ocean) before starting
- [ ] **IMRS-02**: The selected nature scene plays as an animated full-screen background during the session
- [ ] **IMRS-03**: Ambient background sound matching the selected scene plays during the session (gapless loop)
- [ ] **IMRS-04**: Scene and ambient sound are paired — selecting a scene automatically selects the matching audio

### UX & Polish

- [ ] **UX-01**: The scene animation and ambient audio fade in gently (2–3 seconds) when a session starts
- [ ] **UX-02**: The scene animation and ambient audio fade out gently when a session ends, followed by the chime
- [ ] **UX-03**: The session screen enters full-screen mode when started, with a distraction-free view
- [ ] **UX-04**: Session controls (pause, stop) are hidden during immersion and revealed by tapping/clicking the screen
- [ ] **UX-05**: Screen wake lock prevents the device from sleeping during an active session
- [ ] **UX-06**: The app is responsive and fully usable on mobile browsers (touch targets, viewport handling)

## v2 Requirements

### Audio Controls

- **AUDIO-01**: User can adjust the volume of ambient sounds independently
- **AUDIO-02**: User can choose to mute ambient sounds without stopping the session

### Expansion

- **EXP-01**: 2+ additional scene+sound pairs (beyond the initial 2-3)
- **EXP-02**: User can optionally hide the countdown timer for a fully watchless experience

### Offline / PWA

- **PWA-01**: App installs to home screen (PWA manifest + service worker)
- **PWA-02**: App works offline after first visit (audio and scenes cached)

### Session Tracking

- **HIST-01**: App saves last 7 sessions (date, duration, scene) in localStorage with no account required
- **HIST-02**: User can see a minimal recent sessions list

## Out of Scope

| Feature | Reason |
|---------|--------|
| User accounts / login | Adds friction; no backend in v1; out-of-scope by design |
| Guided meditation audio | Different product scope — content platform, not a timer |
| Social / community features | Requires backend, moderation; wrong audience (casual solo meditators) |
| Gamification / streaks / badges | Antithetical to calm ethos; creates anxiety around missing sessions |
| Interval bells during session | Advanced feature for committed practitioners; not target audience |
| Breathing exercise guide | Different interaction model; separate product scope |
| Meditation courses / programs | Content production pipeline; out of scope |
| Analytics dashboard | Over-engineering; casual users don't need stats |
| Dark mode toggle | App design is already dark/immersive by default |
| Native mobile app | Web-first; browser covers the use case |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TIMER-01 | Phase 1 | Complete |
| TIMER-02 | Phase 1 | Complete |
| TIMER-03 | Phase 2 | Complete |
| TIMER-04 | Phase 2 | Complete |
| TIMER-05 | Phase 1 | Complete |
| TIMER-06 | Phase 3 | Pending |
| IMRS-01 | Phase 4 | Pending |
| IMRS-02 | Phase 4 | Pending |
| IMRS-03 | Phase 5 | Pending |
| IMRS-04 | Phase 5 | Pending |
| UX-01 | Phase 6 | Pending |
| UX-02 | Phase 6 | Pending |
| UX-03 | Phase 7 | Pending |
| UX-04 | Phase 7 | Pending |
| UX-05 | Phase 2 | Pending |
| UX-06 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-18 after 01-01 execution (project scaffold + foundation modules)*
