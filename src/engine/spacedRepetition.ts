import type { WordRecord } from './types';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const LEITNER_INTERVALS_MS: Record<number, number> = {
  1: 10 * MINUTE_MS,
  2: 1 * DAY_MS,
  3: 3 * DAY_MS,
};
const MAX_LEITNER_INTERVAL_MS = 7 * DAY_MS;

export type MasteryLevel = 'unseen' | 'struggling' | 'practicing' | 'mastered';

function getLeitnerIntervalMs(streak: number): number {
  return LEITNER_INTERVALS_MS[streak] ?? MAX_LEITNER_INTERVAL_MS;
}

/**
 * Updates or initializes a word's spaced-repetition record after an attempt.
 * Hint-assisted answers count as lapses for streak/scheduling so mastery
 * requires unassisted recall.
 */
export function recordWordAttempt(
  existing: WordRecord | undefined,
  key: string,
  outcome: { correct: boolean; usedHint: boolean; now?: number },
): WordRecord {
  const now = outcome.now ?? Date.now();
  const prevAttempts = existing?.attempts ?? 0;
  const prevCorrect = existing?.correct ?? 0;
  const prevStreak = existing?.streak ?? 0;
  const isCleanCorrect = outcome.correct && !outcome.usedHint;

  if (!isCleanCorrect) {
    return {
      key,
      attempts: prevAttempts + 1,
      correct: prevCorrect,
      streak: 0,
      lastMissedOrHint: true,
      dueAt: now,
    };
  }

  const nextStreak = prevStreak + 1;
  return {
    key,
    attempts: prevAttempts + 1,
    correct: prevCorrect + 1,
    streak: nextStreak,
    lastMissedOrHint: false,
    dueAt: now + getLeitnerIntervalMs(nextStreak),
  };
}

/**
 * Computes the mastery tier of a word record from accuracy and recency.
 */
export function computeMasteryLevel(record: WordRecord | undefined): MasteryLevel {
  if (!record || record.attempts === 0) {
    return 'unseen';
  }

  const accuracy = record.correct / record.attempts;
  if (record.lastMissedOrHint || accuracy < 0.65) {
    return 'struggling';
  }

  if (record.correct >= 3 && accuracy >= 0.9) {
    return 'mastered';
  }

  return 'practicing';
}

/**
 * Returns word keys needing review, prioritizing `lastMissedOrHint` words first,
 * followed by overdue words (`dueAt <= now`), sorted by earliest `dueAt`.
 */
export function getPrioritizedWordKeys(
  words: Record<string, WordRecord>,
  now: number = Date.now(),
): string[] {
  const candidates: Array<{ key: string; missed: boolean; dueAt: number }> = [];

  for (const [key, record] of Object.entries(words)) {
    if (record.lastMissedOrHint || record.dueAt <= now) {
      candidates.push({
        key,
        missed: record.lastMissedOrHint,
        dueAt: record.dueAt,
      });
    }
  }

  candidates.sort((a, b) => {
    if (a.missed !== b.missed) {
      return a.missed ? -1 : 1;
    }
    if (a.dueAt !== b.dueAt) {
      return a.dueAt - b.dueAt;
    }
    return a.key.localeCompare(b.key);
  });

  return candidates.map((item) => item.key);
}
