// src/ui/session-screen.ts
import { bus } from '../event-bus.js';
import { formatTime } from '../utils/format.js';

export function initSessionScreen(onStop: () => void): void {
  const timerDisplay = document.querySelector<HTMLElement>('#timer-display')!;
  const stopButton = document.querySelector<HTMLButtonElement>('#stop-button')!;

  // Update display on every tick posted by the Web Worker (via timer.ts and the bus)
  bus.on('timer:tick', (e: Event) => {
    const { remaining } = (e as CustomEvent<{ remaining: number }>).detail;
    timerDisplay.textContent = formatTime(remaining);
  });

  stopButton.addEventListener('click', onStop);
}
