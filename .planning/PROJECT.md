# Meditation Timer

## What This Is

A minimal web-based meditation timer for casual meditators. Users set a custom duration, then enter a full-screen immersive experience — animated nature scenes with ambient sound — that ends with a gentle chime. No accounts, no tracking, no clutter. Just a clean space to sit.

## Core Value

A distraction-free, visually immersive meditation session that starts in seconds and gets out of the way.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can set a custom meditation duration before starting
- [ ] Full-screen animated nature scene plays during the session
- [ ] Ambient background sounds (e.g. rain, ocean, forest) play during the session
- [ ] A subtle timer countdown is visible during the session
- [ ] A gentle chime sounds when the timer ends
- [ ] The session can be paused or stopped early
- [ ] Setup screen is calm, centered, and minimal

### Out of Scope

- Session history / streaks — not core to the casual meditator experience
- User accounts — unnecessary friction for the use case
- Multiple selectable scenes — single curated nature animation for v1
- Mobile native app — web-first, browser covers the need

## Context

- Platform: Web browser (desktop + mobile responsive)
- Visual aesthetic: Minimal and clean — muted cool tones (soft blues, slate, misty whites)
- Color philosophy: UI chrome is near-monochrome; the animated nature scene provides the only rich color
- Typography: Clean, understated — supports calm rather than competing with it
- Setup screen: Duration input centered on screen, calm and uncluttered
- Active session: Full-screen animation with a subtle timer tucked in a corner

## Constraints

- **Tech stack**: Web (HTML/CSS/JS or lightweight framework) — no backend required for v1
- **Ambient audio**: Must work within browser autoplay policies (user interaction before audio)
- **Scope**: Single nature scene animation in v1 — no scene picker

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single nature scene for v1 | Keeps scope tight; curated experience beats choice overload | — Pending |
| No user accounts | Casual meditators don't want friction; session data not needed | — Pending |
| Timer subtle, not hidden | Full immersion vs. user awareness — subtle corner timer balances both | — Pending |

---
*Last updated: 2026-02-17 after initialization*
