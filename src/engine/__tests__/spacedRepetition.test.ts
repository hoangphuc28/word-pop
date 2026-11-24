import { describe, expect, it } from 'vitest';
import {
  computeMasteryLevel,
  getPrioritizedWordKeys,
  recordWordAttempt,
} from '../spacedRepetition';
import type { WordRecord } from '../types';

const MIN = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

describe('spacedRepetition engine (WordPop)', () => {
  describe('recordWordAttempt & Leitner intervals', () => {
    it('initializes and advances streak and Leitner dueAt intervals on clean correct attempts', () => {
      const t0 = 1_700_000_000_000;

      const r1 = recordWordAttempt(undefined, 'word:daily-apple', {
        correct: true,
        usedHint: false,
        now: t0,
      });
      expect(r1).toEqual({
        key: 'word:daily-apple',
        attempts: 1,
        correct: 1,
        streak: 1,
        lastMissedOrHint: false,
        dueAt: t0 + 10 * MIN,
      });
      expect(computeMasteryLevel(r1)).toBe('practicing');

      const r2 = recordWordAttempt(r1, 'word:daily-apple', {
        correct: true,
        usedHint: false,
        now: t0 + 10 * MIN,
      });
      expect(r2.streak).toBe(2);
      expect(r2.attempts).toBe(2);
      expect(r2.correct).toBe(2);
      expect(r2.lastMissedOrHint).toBe(false);
      expect(r2.dueAt).toBe(t0 + 10 * MIN + 1 * DAY);
      expect(computeMasteryLevel(r2)).toBe('practicing');

      const r3 = recordWordAttempt(r2, 'word:daily-apple', {
        correct: true,
        usedHint: false,
        now: t0 + 2 * DAY,
      });
      expect(r3.streak).toBe(3);
      expect(r3.dueAt).toBe(t0 + 2 * DAY + 3 * DAY);
      expect(computeMasteryLevel(r3)).toBe('mastered');

      const r4 = recordWordAttempt(r3, 'word:daily-apple', {
        correct: true,
        usedHint: false,
        now: t0 + 6 * DAY,
      });
      expect(r4.streak).toBe(4);
      expect(r4.dueAt).toBe(t0 + 6 * DAY + 7 * DAY);

      const r5 = recordWordAttempt(r4, 'word:daily-apple', {
        correct: true,
        usedHint: false,
        now: t0 + 14 * DAY,
      });
      expect(r5.streak).toBe(5);
      expect(r5.dueAt).toBe(t0 + 14 * DAY + 7 * DAY);
    });

    it('resets streak, sets lastMissedOrHint, and schedules immediately on miss or hint', () => {
      const t0 = 1_700_000_000_000;
      const existing: WordRecord = {
        key: 'word:tech-algorithm',
        attempts: 3,
        correct: 3,
        streak: 3,
        lastMissedOrHint: false,
        dueAt: t0 + 3 * DAY,
      };

      const missed = recordWordAttempt(existing, 'word:tech-algorithm', {
        correct: false,
        usedHint: false,
        now: t0 + 1000,
      });
      expect(missed).toEqual({
        key: 'word:tech-algorithm',
        attempts: 4,
        correct: 3,
        streak: 0,
        lastMissedOrHint: true,
        dueAt: t0 + 1000,
      });
      expect(computeMasteryLevel(missed)).toBe('struggling');

      const hinted = recordWordAttempt(existing, 'word:tech-algorithm', {
        correct: true,
        usedHint: true,
        now: t0 + 2000,
      });
      expect(hinted).toEqual({
        key: 'word:tech-algorithm',
        attempts: 4,
        correct: 3,
        streak: 0,
        lastMissedOrHint: true,
        dueAt: t0 + 2000,
      });
      expect(computeMasteryLevel(hinted)).toBe('struggling');
    });
  });

  describe('computeMasteryLevel', () => {
    it('distinguishes unseen, struggling, practicing, and mastered words', () => {
      expect(computeMasteryLevel(undefined)).toBe('unseen');
      expect(
        computeMasteryLevel({
          key: 'word:a',
          attempts: 0,
          correct: 0,
          streak: 0,
          lastMissedOrHint: false,
          dueAt: 0,
        }),
      ).toBe('unseen');

      expect(
        computeMasteryLevel({
          key: 'word:b',
          attempts: 5,
          correct: 5,
          streak: 0,
          lastMissedOrHint: true,
          dueAt: 1000,
        }),
      ).toBe('struggling');

      expect(
        computeMasteryLevel({
          key: 'word:c',
          attempts: 10,
          correct: 6,
          streak: 1,
          lastMissedOrHint: false,
          dueAt: 1000,
        }),
      ).toBe('struggling');

      expect(
        computeMasteryLevel({
          key: 'word:d',
          attempts: 2,
          correct: 2,
          streak: 2,
          lastMissedOrHint: false,
          dueAt: 1000,
        }),
      ).toBe('practicing');

      expect(
        computeMasteryLevel({
          key: 'word:e',
          attempts: 10,
          correct: 9,
          streak: 3,
          lastMissedOrHint: false,
          dueAt: 1000,
        }),
      ).toBe('mastered');
    });
  });

  describe('getPrioritizedWordKeys', () => {
    it('prioritizes lastMissedOrHint first, then overdue dueAt <= now, sorted by earliest dueAt', () => {
      const now = 10_000;
      const words: Record<string, WordRecord> = {
        'word:not-due': {
          key: 'word:not-due',
          attempts: 3,
          correct: 3,
          streak: 3,
          lastMissedOrHint: false,
          dueAt: 20_000,
        },
        'word:due-later': {
          key: 'word:due-later',
          attempts: 2,
          correct: 2,
          streak: 2,
          lastMissedOrHint: false,
          dueAt: 5_000,
        },
        'word:due-earlier': {
          key: 'word:due-earlier',
          attempts: 1,
          correct: 1,
          streak: 1,
          lastMissedOrHint: false,
          dueAt: 3_000,
        },
        'word:missed-later': {
          key: 'word:missed-later',
          attempts: 4,
          correct: 2,
          streak: 0,
          lastMissedOrHint: true,
          dueAt: 9_000,
        },
        'word:missed-earlier': {
          key: 'word:missed-earlier',
          attempts: 2,
          correct: 1,
          streak: 0,
          lastMissedOrHint: true,
          dueAt: 6_000,
        },
        'word:due-exact': {
          key: 'word:due-exact',
          attempts: 3,
          correct: 3,
          streak: 3,
          lastMissedOrHint: false,
          dueAt: 10_000,
        },
      };

      expect(getPrioritizedWordKeys(words, now)).toEqual([
        'word:missed-earlier',
        'word:missed-later',
        'word:due-earlier',
        'word:due-later',
        'word:due-exact',
      ]);
    });

    it('returns empty array when no words are missed or due', () => {
      const words: Record<string, WordRecord> = {
        'word:future': {
          key: 'word:future',
          attempts: 2,
          correct: 2,
          streak: 2,
          lastMissedOrHint: false,
          dueAt: 50_000,
        },
      };
      expect(getPrioritizedWordKeys(words, 10_000)).toEqual([]);
    });
  });
});
