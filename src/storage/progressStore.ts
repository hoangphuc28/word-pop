import {
  CEFR_LEVELS,
  type CefrLevel,
  type PlayerStats,
  type ProgressState,
  type WordRecord,
} from '../engine/types';

export const STORAGE_KEY = 'wordpop_progress_v1';

const DEFAULT_VOLUME = 0.85;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeNonNegInt(val: unknown): number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0
    ? Math.floor(val)
    : 0;
}

function sanitizeVolume(val: unknown, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > 1) {
    return fallback;
  }
  return val;
}

function isValidWordRecord(value: unknown): value is WordRecord {
  if (!isPlainRecord(value)) {
    return false;
  }
  return (
    typeof value.key === 'string' &&
    typeof value.attempts === 'number' &&
    Number.isFinite(value.attempts) &&
    value.attempts >= 0 &&
    typeof value.correct === 'number' &&
    Number.isFinite(value.correct) &&
    value.correct >= 0 &&
    typeof value.streak === 'number' &&
    Number.isFinite(value.streak) &&
    value.streak >= 0 &&
    typeof value.lastMissedOrHint === 'boolean' &&
    typeof value.dueAt === 'number' &&
    Number.isFinite(value.dueAt) &&
    value.dueAt >= 0
  );
}

function sanitizeWords(rawWords: unknown): Record<string, WordRecord> {
  if (!isPlainRecord(rawWords)) {
    return {};
  }
  const clean: Record<string, WordRecord> = {};
  for (const [key, record] of Object.entries(rawWords)) {
    if (isValidWordRecord(record)) {
      clean[key] = record;
    }
  }
  return clean;
}

function sanitizeStats(raw: unknown): PlayerStats {
  const defaults = createDefaultStats();
  if (!isPlainRecord(raw)) {
    return defaults;
  }

  const rawByLevel = isPlainRecord(raw.byLevel) ? raw.byLevel : {};
  const byLevel = { ...defaults.byLevel };
  for (const level of CEFR_LEVELS) {
    const entry = rawByLevel[level as CefrLevel];
    if (isPlainRecord(entry)) {
      byLevel[level] = {
        attempts: sanitizeNonNegInt(entry.attempts),
        correct: sanitizeNonNegInt(entry.correct),
      };
    }
  }

  return {
    puzzlesSolved: sanitizeNonNegInt(raw.puzzlesSolved),
    totalAttempts: sanitizeNonNegInt(raw.totalAttempts),
    totalCorrect: sanitizeNonNegInt(raw.totalCorrect),
    currentStreak: sanitizeNonNegInt(raw.currentStreak),
    bestStreak: sanitizeNonNegInt(raw.bestStreak),
    byLevel,
  };
}

/**
 * Returns zeroed player statistics broken down by CEFR level.
 */
export function createDefaultStats(): PlayerStats {
  return {
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
  };
}

/**
 * Returns a clean version-1 default progress state with zero PII.
 */
export function createDefaultProgress(): ProgressState {
  return {
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
      soundVolume: DEFAULT_VOLUME,
      musicVolume: DEFAULT_VOLUME,
    },
  };
}

/**
 * Formats a Date into a local `YYYY-MM-DD` calendar key.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Computes the updated daily streak and last-played date when a puzzle is solved.
 */
export function computeNextDailyStreak(
  currentStreak: number,
  lastPlayedDate: string | null | undefined,
  now: Date = new Date(),
): { dailyStreak: number; lastPlayedDate: string } {
  const safeStreak = sanitizeNonNegInt(currentStreak);
  const today = getLocalDateKey(now);

  if (lastPlayedDate === today) {
    return { dailyStreak: Math.max(1, safeStreak), lastPlayedDate: today };
  }

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateKey(yesterdayDate);

  if (lastPlayedDate === yesterday) {
    return { dailyStreak: safeStreak + 1, lastPlayedDate: today };
  }

  return { dailyStreak: 1, lastPlayedDate: today };
}

/**
 * Loads progress from `localStorage`, recovering cleanly to default state if
 * storage is missing, malformed, has an incompatible version, or invalid values.
 */
export function loadProgress(): ProgressState {
  try {
    if (typeof localStorage === 'undefined') {
      return createDefaultProgress();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultProgress();
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isPlainRecord(parsed) || parsed.version !== 1) {
      return createDefaultProgress();
    }

    const defaults = createDefaultProgress();
    const rawSettings = isPlainRecord(parsed.settings) ? parsed.settings : {};

    return {
      version: 1,
      words: sanitizeWords(parsed.words),
      totalStars: sanitizeNonNegInt(parsed.totalStars),
      bestEndlessScore: sanitizeNonNegInt(parsed.bestEndlessScore),
      dailyStreak: sanitizeNonNegInt(parsed.dailyStreak),
      lastPlayedDate:
        typeof parsed.lastPlayedDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.lastPlayedDate)
          ? parsed.lastPlayedDate
          : null,
      stats: sanitizeStats(parsed.stats),
      settings: {
        lang:
          rawSettings.lang === 'en' || rawSettings.lang === 'vi'
            ? rawSettings.lang
            : defaults.settings.lang,
        soundEnabled:
          typeof rawSettings.soundEnabled === 'boolean'
            ? rawSettings.soundEnabled
            : defaults.settings.soundEnabled,
        musicEnabled:
          typeof rawSettings.musicEnabled === 'boolean'
            ? rawSettings.musicEnabled
            : defaults.settings.musicEnabled,
        soundVolume: sanitizeVolume(rawSettings.soundVolume, DEFAULT_VOLUME),
        musicVolume: sanitizeVolume(rawSettings.musicVolume, DEFAULT_VOLUME),
      },
    };
  } catch {
    return createDefaultProgress();
  }
}

/**
 * Persists the versioned progress state to `localStorage`.
 */
export function saveProgress(state: ProgressState): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or restricted context errors without crashing gameplay.
  }
}

/**
 * Resets stored progress back to a clean default state and returns it.
 */
export function resetProgress(): ProgressState {
  const fresh = createDefaultProgress();
  saveProgress(fresh);
  return fresh;
}
