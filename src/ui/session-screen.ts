// src/ui/session-screen.ts
import { bus } from '../event-bus.js';
import { formatTime } from '../utils/format.js';

export function initSessionScreen(onStop: () => void): { reset: () => void } {
  const timerDisplay = document.querySelector<HTMLElement>('#timer-display')!;
  const stopButton = document.querySelector<HTMLButtonElement>('#stop-button')!;
  const pauseButton = document.querySelector<HTMLButtonElement>('#pause-button')!;

  let isPaused = false;

  // Update display on every tick posted by the Web Worker (via timer.ts and the bus)
  bus.on('timer:tick', (e: Event) => {
    const { remaining } = (e as CustomEvent<{ remaining: number }>).detail;
    timerDisplay.textContent = formatTime(remaining);
  });

  pauseButton.addEventListener('click', () => {
    if (!isPaused) {
      isPaused = true;
      pauseButton.textContent = 'Resume';
      pauseButton.setAttribute('aria-label', 'Resume session');
      timerDisplay.style.opacity = '0.5';
      bus.emit('session:pause', {});
    } else {
      isPaused = false;
      pauseButton.textContent = 'Pause';
      pauseButton.setAttribute('aria-label', 'Pause session');
      timerDisplay.style.opacity = '1';
      bus.emit('session:resume', {});
    }
  });

  stopButton.addEventListener('click', onStop);

  function reset(): void {
    isPaused = false;
    pauseButton.textContent = 'Pause';
    pauseButton.setAttribute('aria-label', 'Pause session');
    timerDisplay.style.opacity = '1';
  }

  return { reset };
}
