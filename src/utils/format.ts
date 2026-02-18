// src/utils/format.ts
// Converts milliseconds to "mm:ss" string.
// Uses Math.ceil so display shows current second ticking down
// (avoids displaying 00:00 for a full second before timer is truly done).
export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
