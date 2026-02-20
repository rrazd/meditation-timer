// src/ui/transitions.ts
import gsap from 'gsap';

export function transitionToSession(): void {
  const setupScreen = document.querySelector<HTMLElement>('#setup-screen')!;
  const sessionScreen = document.querySelector<HTMLElement>('#session-screen')!;
  const sceneCanvas = document.querySelector<HTMLCanvasElement>('#scene-canvas');
  setupScreen.style.display = 'none';
  if (sceneCanvas) sceneCanvas.style.display = 'block';
  gsap.set(sessionScreen, { opacity: 1 });
  sessionScreen.style.display = 'flex';
}

export function transitionToSetup(onHidden?: () => void): void {
  const setupScreen = document.querySelector<HTMLElement>('#setup-screen')!;
  const sessionScreen = document.querySelector<HTMLElement>('#session-screen')!;
  sessionScreen.style.display = 'none';
  onHidden?.();
  gsap.set(setupScreen, { opacity: 1 });
  setupScreen.style.display = 'flex';
}
