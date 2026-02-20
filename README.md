# Meditation Timer

A cinematic, browser-based meditation timer with immersive nature scenes and ambient audio.

## Features

- **Three nature environments** — Rain, Forest, Ocean, each with a fully animated canvas scene
- **Ambient audio** — Procedurally synthesized soundscapes for each environment (no audio files)
- **Session end tone** — OM harmonic tone that fades in as the session completes
- **Preset & custom durations** — Quick-select 10 / 15 / 20 minutes or enter any value from 1–60
- **Pause & resume** — Full session control with wake lock to keep the screen on
- **End-of-session affirmations** — A randomly chosen positive message after each session
- **Cursor proximity effect** — Rain drops near your cursor brighten and lengthen during meditation
- **Star field home screen** — Twinkling stars, shooting stars, meteor showers, and planets with a pointer proximity glow effect
- **Constellation** — Orion constellation in the ocean scene with independent star twinkling

## Tech Stack

- **Vite** + **TypeScript**
- **Tailwind CSS v4**
- **Web Audio API** — all sound synthesized in the browser, no audio files
- **Canvas 2D API** — all scenes rendered frame-by-frame
- **simplex-noise** — organic wave and shimmer animation

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── main.ts                 # App entry — session lifecycle, event wiring
├── audio.ts                # Session-end OM tone synthesis
├── audio-ambient.ts        # Ambient soundscape per scene
├── timer.ts                # Countdown timer with tick/complete events
├── state.ts                # Shared session state
├── event-bus.ts            # Lightweight typed event bus
├── scenes/
│   ├── rain.ts             # Rain scene — drops, lightning, ridges, ripples
│   ├── forest.ts           # Forest scene — trees, mist, fireflies
│   ├── ocean.ts            # Ocean scene — waves, moon, constellation, reflection
│   └── scene-controller.ts # Scene lifecycle and rAF loop
├── ui/
│   ├── setup-screen.ts     # Home screen — duration, scene selection, animations
│   ├── session-screen.ts   # Session screen — timer display, pause/stop
│   ├── bg-stars.ts         # Star field background with proximity effect
│   ├── bg-rain-lines.ts    # (unused) Rain line effect prototype
│   └── transitions.ts      # Screen fade transitions
└── styles/
    ├── main.css            # Global styles, floating label, button animations
    └── variables.css       # CSS custom properties
```

## License

MIT
