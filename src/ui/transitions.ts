// src/ui/transitions.ts
import gsap from 'gsap';

function getAnimDuration(defaultDuration: number): number {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return prefersReduced ? 0 : defaultDuration;
}

export function transitionToSession(): void {
  const setupScreen = document.querySelector<HTMLElement>('#setup-screen')!;
  const sessionScreen = document.querySelector<HTMLElement>('#session-screen')!;

  const dur = getAnimDuration(0.4);
  const tl = gsap.timeline();

  tl.to(setupScreen, {
    opacity: 0,
    duration: dur,
    onComplete: () => {
      setupScreen.style.display = 'none';
      sessionScreen.style.display = 'flex';
      gsap.set(sessionScreen, { opacity: 0 });
    },
  }).to(sessionScreen, { opacity: 1, duration: getAnimDuration(0.5) });
}

export function transitionToSetup(): void {
  const setupScreen = document.querySelector<HTMLElement>('#setup-screen')!;
  const sessionScreen = document.querySelector<HTMLElement>('#session-screen')!;

  const dur = getAnimDuration(0.4);
  const tl = gsap.timeline();

  tl.to(sessionScreen, {
    opacity: 0,
    duration: dur,
    onComplete: () => {
      sessionScreen.style.display = 'none';
      setupScreen.style.display = 'flex';
      gsap.set(setupScreen, { opacity: 0 });
    },
  }).to(setupScreen, { opacity: 1, duration: getAnimDuration(0.5) });
}
