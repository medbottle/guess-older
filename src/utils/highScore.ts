const STORAGE_KEY = 'guess-older-high-streak';

export function getHighStreak(): number {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) {
      return 0;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  } catch {
    return 0;
  }
}

export function saveHighStreak(streak: number): number {
  const current = getHighStreak();
  const next = Math.max(current, streak);

  if (next > current) {
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      return current;
    }
  }

  return next;
}
