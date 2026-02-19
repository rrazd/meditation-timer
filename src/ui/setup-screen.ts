// src/ui/setup-screen.ts
import type { SceneName } from '../scenes/scene.interface.js';

const SCENE_NAMES: SceneName[] = ['rain', 'forest', 'ocean'];

export function initSetupScreen(onStart: (durationMs: number, sceneName: SceneName) => void): void {
  const container = document.querySelector<HTMLElement>('#setup-screen')!;
  const durationInput = container.querySelector<HTMLInputElement>('#duration-input')!;
  const startButton = container.querySelector<HTMLButtonElement>('#start-button')!;
  const errorMsg = container.querySelector<HTMLElement>('#duration-error')!;

  const presetMinutes = [5, 10, 15, 20];
  let selectedScene: SceneName = 'rain'; // defaults to Rain (matches HTML active state)

  // --- Duration preset buttons ---
  presetMinutes.forEach((minutes) => {
    const btn = container.querySelector<HTMLButtonElement>(`[data-preset="${minutes}"]`);
    if (!btn) return;
    btn.addEventListener('click', () => {
      durationInput.value = String(minutes);
      clearError();
      setActivePreset(btn);
    });
  });

  durationInput.addEventListener('input', () => {
    clearActivePresets();
    clearError();
  });

  // --- Scene selector buttons ---
  SCENE_NAMES.forEach((sceneName) => {
    const btn = container.querySelector<HTMLButtonElement>(`[data-scene="${sceneName}"]`);
    if (!btn) return;
    btn.addEventListener('click', () => {
      selectedScene = sceneName;
      setActiveScene(btn);
    });
  });

  // --- Start button ---
  startButton.addEventListener('click', () => {
    const raw = parseInt(durationInput.value, 10);
    if (isNaN(raw) || raw < 1 || raw > 180) {
      showError();
      return;
    }
    clearError();
    onStart(raw * 60 * 1000, selectedScene);
  });

  // --- Helpers ---

  function setActivePreset(activeBtn: HTMLButtonElement): void {
    clearActivePresets();
    activeBtn.style.borderColor = 'var(--color-accent)';
    activeBtn.style.color = 'var(--color-accent)';
  }

  function clearActivePresets(): void {
    presetMinutes.forEach((minutes) => {
      const btn = container.querySelector<HTMLButtonElement>(`[data-preset="${minutes}"]`);
      if (btn) {
        btn.style.borderColor = 'var(--color-border)';
        btn.style.color = 'var(--color-text-primary)';
      }
    });
  }

  function setActiveScene(activeBtn: HTMLButtonElement): void {
    // Clear all scene buttons to inactive style
    SCENE_NAMES.forEach((name) => {
      const btn = container.querySelector<HTMLButtonElement>(`[data-scene="${name}"]`);
      if (btn) {
        btn.style.borderColor = 'var(--color-border)';
        btn.style.color = 'var(--color-text-primary)';
      }
    });
    // Apply active style to the clicked button
    activeBtn.style.borderColor = 'var(--color-accent)';
    activeBtn.style.color = 'var(--color-accent)';
  }

  function showError(): void {
    errorMsg.style.display = 'block';
    durationInput.style.borderColor = '#f87171';
  }

  function clearError(): void {
    errorMsg.style.display = 'none';
    durationInput.style.borderColor = 'var(--color-border)';
  }
}
