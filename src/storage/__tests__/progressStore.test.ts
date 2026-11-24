import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  STORAGE_KEY,
  computeNextDailyStreak,
  createDefaultProgress,
  createDefaultStats,
  getLocalDateKey,
  loadProgress,
  resetProgress,
  saveProgress,
} from '../progressStore';
import type { ProgressState } from '../../engine/types';

describe('progressStore (WordPop)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('uses wordpop_progress_v1 storage key and creates clean default state with zero PII', () => {
    expect(STORAGE_KEY).toBe('wordpop_progress_v1');

    expect(createDefaultStats()).toEqual({
      puzzlesSolved: 0,
      totalAttempts: 0,
      totalCorrect: 0,
      currentStreak: 0,
      bestStreak: 0,
      byLevel: {
        A1: { attempts: 0, correct: 0 },
        A2: { attempts: 0, correct: 0 },
        B1: { attempts: 0, correct: 0 },
        B2C1: { attempts: 0, correct: 0 },
      },
    });

    expect(createDefaultProgress()).toEqual({
      version: 1,
      words: {},
      totalStars: 0,
      bestEndlessScore: 0,
      dailyStreak: 0,
      lastPlayedDate: null,
      stats: createDefaultStats(),
      settings: {
        lang: 'vi',
        soundEnabled: true,
        musicEnabled: true,
        soundVolume: 0.85,
        musicVolume: 0.85,
      },
    });
  });

  it('round-trips saved progress through localStorage', () => {
    const state: ProgressState = {
      version: 1,
      totalStars: 18,
      bestEndlessScore: 11,
      dailyStreak: 4,
      lastPlayedDate: '2026-11-23',
      stats: {
        puzzlesSolved: 7,
        totalAttempts: 10,
        totalCorrect: 8,
        currentStreak: 3,
        bestStreak: 5,
        byLevel: {
          A1: { attempts: 4, correct: 4 },
          A2: { attempts: 3, correct: 2 },
          B1: { attempts: 2, correct: 1 },
          B2C1: { attempts: 1, correct: 1 },
        },
      },
      words: {
        'word:daily-morning': {
          key: 'word:daily-morning',
          attempts: 3,
          correct: 3,
          streak: 3,
          lastMissedOrHint: false,
          dueAt: 1_700_000_000_000,
        },
      },
      settings: {
        lang: 'en',
        soundEnabled: false,
        musicEnabled: true,
        soundVolume: 0.4,
        musicVolume: 0.65,
      },
    };

    saveProgress(state);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(loadProgress()).toEqual(state);
  });

  it('resets progress back to default state', () => {
    saveProgress({
      ...createDefaultProgress(),
      totalStars: 50,
      bestEndlessScore: 12,
      settings: {
        lang: 'en',
        soundEnabled: false,
        musicEnabled: false,
        soundVolume: 0.2,
        musicVolume: 0.3,
      },
    });

    const reset = resetProgress();
    expect(reset).toEqual(createDefaultProgress());
    expect(loadProgress()).toEqual(createDefaultProgress());
  });

  it('recovers cleanly from malformed JSON, wrong schema version, and non-object payloads', () => {
    localStorage.setItem(STORAGE_KEY, '{bad json');
    expect(loadProgress()).toEqual(createDefaultProgress());

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, totalStars: 100 }));
    expect(loadProgress()).toEqual(createDefaultProgress());

    localStorage.setItem(STORAGE_KEY, 'null');
    expect(loadProgress()).toEqual(createDefaultProgress());

    localStorage.setItem(STORAGE_KEY, '["not", "an", "object"]');
    expect(loadProgress()).toEqual(createDefaultProgress());
  });

  it('sanitizes negative, NaN-like, and out-of-range numeric fields back to safe defaults', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        totalStars: -10,
        bestEndlessScore: -3,
        dailyStreak: 'invalid',
        lastPlayedDate: 'not-a-date',
        words: {
          'word:bad-neg': {
            key: 'word:bad-neg',
            attempts: -1,
            correct: 0,
            streak: 0,
            lastMissedOrHint: false,
            dueAt: 1000,
          },
          'word:bad-type': {
            key: 'word:bad-type',
            attempts: 'five',
            correct: 1,
            streak: 1,
            lastMissedOrHint: false,
            dueAt: 1000,
          },
          'word:good': {
            key: 'word:good',
            attempts: 2,
            correct: 2,
            streak: 2,
            lastMissedOrHint: false,
            dueAt: 5000,
          },
        },
        stats: {
          puzzlesSolved: -5,
          totalAttempts: null,
          totalCorrect: 3.7,
          currentStreak: -1,
          bestStreak: 4,
          byLevel: {
            A1: { attempts: -2, correct: 1 },
            A2: { attempts: 5, correct: 4 },
            B1: 'corrupt',
          },
        },
        settings: {
          lang: 'fr',
          soundEnabled: 'yes',
          musicEnabled: false,
          soundVolume: -0.5,
          musicVolume: 2.5,
        },
      }),
    );

    const loaded = loadProgress();
    expect(loaded.totalStars).toBe(0);
    expect(loaded.bestEndlessScore).toBe(0);
    expect(loaded.dailyStreak).toBe(0);
    expect(loaded.lastPlayedDate).toBeNull();
    expect(Object.keys(loaded.words)).toEqual(['word:good']);
    expect(loaded.stats).toEqual({
      puzzlesSolved: 0,
      totalAttempts: 0,
      totalCorrect: 3,
      currentStreak: 0,
      bestStreak: 4,
      byLevel: {
        A1: { attempts: 0, correct: 1 },
        A2: { attempts: 5, correct: 4 },
        B1: { attempts: 0, correct: 0 },
        B2C1: { attempts: 0, correct: 0 },
      },
    });
    expect(loaded.settings).toEqual({
      lang: 'vi',
      soundEnabled: true,
      musicEnabled: false,
      soundVolume: 0.85,
      musicVolume: 0.85,
    });
  });

  it('formats local YYYY-MM-DD keys and computes daily streaks for first-time, same-day, consecutive, and gap days', () => {
    const day1 = new Date(2026, 10, 20, 14, 30);
    const day2 = new Date(2026, 10, 21, 9, 0);
    const day4 = new Date(2026, 10, 23, 18, 0);

    expect(getLocalDateKey(day1)).toBe('2026-11-20');

    // First play ever
    expect(computeNextDailyStreak(0, null, day1)).toEqual({
      dailyStreak: 1,
      lastPlayedDate: '2026-11-20',
    });

    // Same-day replay keeps streak (at least 1)
    expect(computeNextDailyStreak(3, '2026-11-20', day1)).toEqual({
      dailyStreak: 3,
      lastPlayedDate: '2026-11-20',
    });
    expect(computeNextDailyStreak(0, '2026-11-20', day1)).toEqual({
      dailyStreak: 1,
      lastPlayedDate: '2026-11-20',
    });

    // Consecutive day increments streak
    expect(computeNextDailyStreak(3, '2026-11-20', day2)).toEqual({
      dailyStreak: 4,
      lastPlayedDate: '2026-11-21',
    });

    // Gap of 2+ days resets streak to 1
    expect(computeNextDailyStreak(4, '2026-11-21', day4)).toEqual({
      dailyStreak: 1,
      lastPlayedDate: '2026-11-23',
    });
  });
});
