// src/utils/wake-lock.ts
// Screen Wake Lock API — MDN: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
// WakeLockSentinel cannot be reused after release. Always call navigator.wakeLock.request() for a new one.
// The 'release' event fires on both manual release and browser auto-release (tab hidden, low battery).

let wakeLock: WakeLockSentinel | null = null;

export async function acquireWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) return; // Unsupported — degrade silently; timer still works
  if (wakeLock !== null) return; // Already held — no-op (null-check is safer than .released cross-browser)
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      // Fires on both manual release and browser auto-release (tab hidden, low battery).
      // Clear reference so next acquireWakeLock() call requests a fresh sentinel.
      wakeLock = null;
    });
  } catch (err) {
    // NotAllowedError: low battery, power-save mode, or browser policy — non-fatal.
    // Session continues without wake lock.
    console.warn('[WakeLock] Request refused:', (err as Error).message);
    wakeLock = null;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (wakeLock !== null) {
    try {
      await wakeLock.release();
    } catch {
      // Sentinel may have already been auto-released — safe to ignore.
    }
    wakeLock = null;
  }
}
