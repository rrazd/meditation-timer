// src/ui/setup-screen.ts
import type { SceneName } from '../scenes/scene.interface.js';

export function initSetupScreen(onStart: (durationMs: number, sceneName: SceneName) => void): void {
  const container = document.querySelector<HTMLElement>('#setup-screen')!;
  const durationInput = container.querySelector<HTMLInputElement>('#duration-input')!;
  const startButton = container.querySelector<HTMLButtonElement>('#start-button')!;
  const errorMsg = container.querySelector<HTMLElement>('#duration-error')!;

  const presetMinutes = [5, 10, 15, 20];
  let selectedScene: SceneName = 'rain'; // Plan 03 adds scene picker UI that updates this

  // Wire preset buttons — clicking fills input and marks button active
  presetMinutes.forEach((minutes) => {
    const btn = container.querySelector<HTMLButtonElement>(`[data-preset="${minutes}"]`);
    if (!btn) return;
    btn.addEventListener('click', () => {
      durationInput.value = String(minutes);
      clearError();
      setActivePreset(btn);
    });
  });

  // Custom input clears active preset highlight
  durationInput.addEventListener('input', () => {
    clearActivePresets();
    clearError();
  });

  startButton.addEventListener('click', () => {
    const raw = parseInt(durationInput.value, 10);
    if (isNaN(raw) || raw < 1 || raw > 180) {
      showError();
      return;
    }
    clearError();
    onStart(raw * 60 * 1000, selectedScene);
  });

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

  function showError(): void {
    errorMsg.style.display = 'block';
    durationInput.style.borderColor = '#f87171';
  }

  function clearError(): void {
    errorMsg.style.display = 'none';
    durationInput.style.borderColor = 'var(--color-border)';
  }
}
