// Simple limit on repeated failed logins: 5 failures, then locked for 15 minutes.
//
// The counters live in memory. On Vercel each serverless instance has its own
// memory, so this slows down guessing but is not a perfect lock. That is fine
// for this project. A production bank would keep the counters in a database.

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

type Entry = { count: number; firstFailureAt: number };
const failures = new Map<string, Entry>();

// How many seconds this key must still wait. 0 means "allowed to try".
export function getLockSeconds(key: string): number {
  const entry = failures.get(key);
  if (!entry) return 0;

  const age = Date.now() - entry.firstFailureAt;
  if (age >= WINDOW_MS) {
    failures.delete(key);
    return 0;
  }
  return entry.count >= MAX_FAILURES ? Math.ceil((WINDOW_MS - age) / 1000) : 0;
}

export function recordFailure(key: string): void {
  const now = Date.now();

  // Keep memory small: forget old entries once the map gets big.
  if (failures.size > 1000) {
    for (const [oldKey, entry] of failures) {
      if (now - entry.firstFailureAt >= WINDOW_MS) failures.delete(oldKey);
    }
  }

  const entry = failures.get(key);
  if (!entry || now - entry.firstFailureAt >= WINDOW_MS) {
    failures.set(key, { count: 1, firstFailureAt: now });
  } else {
    entry.count += 1;
  }
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
