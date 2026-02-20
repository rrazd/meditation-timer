// src/ui/session-screen.ts
import { bus } from '../event-bus.js';
import { formatTime } from '../utils/format.js';

export function initSessionScreen(
  onStop: () => void,
  onRestart: () => void,
  onToggleMute: (muted: boolean) => void,
): { reset: () => void; setMuted: (muted: boolean) => void } {
  const timerDisplay   = document.querySelector<HTMLElement>('#timer-display')!;
  const stopButton     = document.querySelector<HTMLButtonElement>('#stop-button')!;
  const pauseButton    = document.querySelector<HTMLButtonElement>('#pause-button')!;
  const restartButton  = document.querySelector<HTMLButtonElement>('#restart-button')!;
  const speakerButton  = document.querySelector<HTMLButtonElement>('#speaker-button')!;
  const speakerOnIcon  = document.querySelector<SVGElement>('#speaker-on-icon')!;
  const speakerMutedIcon = document.querySelector<SVGElement>('#speaker-muted-icon')!;
  const muteToast      = document.querySelector<HTMLElement>('#mute-toast')!;

  let isPaused = false;
  let isMuted  = false;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

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
      restartButton.style.display = ''; // show restart only while paused
      bus.emit('session:pause', {});
    } else {
      isPaused = false;
      pauseButton.textContent = 'Pause';
      pauseButton.setAttribute('aria-label', 'Pause session');
      timerDisplay.style.opacity = '1';
      restartButton.style.display = 'none'; // hide restart when running
      bus.emit('session:resume', {});
    }
  });

  // Speaker mute toggle
  speakerButton.addEventListener('click', () => {
    isMuted = !isMuted;
    speakerButton.dataset['muted'] = isMuted ? '1' : '0';
    onToggleMute(isMuted);
    applySpeakerState();
    if (isMuted) showToast('Ambiance muted. The end-of-meditation signal will still sound.');
  });

  function applySpeakerState(): void {
    speakerOnIcon.style.display    = isMuted ? 'none' : '';
    speakerMutedIcon.style.display = isMuted ? '' : 'none';
    speakerButton.style.background = isMuted ? 'rgba(55,30,120,0.22)' : 'rgba(90,55,185,0.32)';
    speakerButton.style.color      = isMuted ? 'rgba(160,130,220,0.40)' : 'rgba(205,175,255,0.82)';
  }

  function showToast(message: string): void {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    muteToast.textContent = message;
    muteToast.style.transition = 'none';
    muteToast.style.opacity = '1';
    // Hold for 10.5 s then fade out over 0.9 s
    toastTimer = setTimeout(() => {
      muteToast.style.transition = 'opacity 0.9s ease';
      muteToast.style.opacity = '0';
      toastTimer = null;
    }, 10500);
  }

  // Externally settable — used by restart handler to reset mute state
  function setMuted(muted: boolean): void {
    isMuted = muted;
    speakerButton.dataset['muted'] = muted ? '1' : '0';
    applySpeakerState();
    // Dismiss toast if visible
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    muteToast.style.transition = 'none';
    muteToast.style.opacity = '0';
  }

  stopButton.addEventListener('click', onStop);
  restartButton.addEventListener('click', onRestart);

  function reset(): void {
    isPaused = false;
    pauseButton.textContent = 'Pause';
    pauseButton.setAttribute('aria-label', 'Pause session');
    timerDisplay.style.opacity = '1';
    restartButton.style.display = 'none'; // hidden until paused
    // Restore elements that showAffirmation() hides — must be cleared for next session
    timerDisplay.style.display  = '';
    pauseButton.style.display   = '';
    stopButton.style.display    = '';
    // Reset speaker
    setMuted(false);
  }

  return { reset, setMuted };
}
