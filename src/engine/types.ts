export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export type VocabTopic =
  | 'daily'
  | 'food'
  | 'travel'
  | 'nature'
  | 'work'
  | 'tech'
  | 'feelings'
  | 'culture';

export type PartOfSpeech = 'n.' | 'v.' | 'adj.' | 'adv.';

export type GameMode = 'word-cross' | 'sentence-pop';

export type SessionMode = 'quick' | 'endless' | 'practice';

export type InputMode = 'tray' | 'keyboard';

export type WordDirection = 'across' | 'down';

export interface VocabEntry {
  id: string;
  word: string;
  ipa: string;
  pos: PartOfSpeech;
  level: CefrLevel;
  topic: VocabTopic;
  en: string;
  vi: string;
  example: string;
  exampleVi: string;
  /** Optional native pronunciation MP3 URL (e.g. from Free Dictionary API) */
  audioUrl?: string;
  /** Origin of this vocabulary entry */
  source?: 'curated' | 'online' | 'custom';
}

export type DeckColor = 'coral' | 'lavender' | 'mint' | 'sunny' | 'sky';

export interface WordDeck {
  id: string;
  name: string;
  description: string;
  author: string;
  level: CefrLevel;
  color: DeckColor;
  words: VocabEntry[];
  origin: 'mine' | 'community' | 'downloaded';
  published?: boolean;
  downloads?: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlayConfig {
  mode: GameMode;
  sessionMode: SessionMode;
  inputMode: InputMode;
  level: CefrLevel;
  topics: VocabTopic[];
  /** Optional custom or downloaded deck ID */
  deckId?: string;
  /** Display name of the selected deck */
  deckName?: string;
  /** Words from the selected deck to prioritize in puzzle generation */
  customWords?: VocabEntry[];
}

export interface WordCrossCell {
  id: string;
  row: number;
  col: number;
  kind: 'fixed' | 'blank';
  solution: string;
  clueNumbers?: number[];
}

export interface WordCrossEntry {
  number: number;
  direction: WordDirection;
  row: number;
  col: number;
  length: number;
  cellIds: string[];
  vocab: VocabEntry;
}

export interface WordCrossPuzzle {
  id: string;
  seed: number;
  rows: number;
  cols: number;
  cells: Record<string, WordCrossCell>;
  entries: WordCrossEntry[];
  blankCellIds: string[];
  trayLetters: string[];
  level: CefrLevel;
}

export interface SentencePopPuzzle {
  id: string;
  seed: number;
  vocab: VocabEntry;
  sentenceBefore: string;
  sentenceAfter: string;
  choices: string[];
  level: CefrLevel;
}

export interface WordRecord {
  key: string;
  attempts: number;
  correct: number;
  streak: number;
  lastMissedOrHint: boolean;
  dueAt: number;
}

export interface LevelStat {
  attempts: number;
  correct: number;
}

export interface PlayerStats {
  puzzlesSolved: number;
  totalAttempts: number;
  totalCorrect: number;
  currentStreak: number;
  bestStreak: number;
  byLevel: Record<CefrLevel, LevelStat>;
}

export interface ProgressSettings {
  lang: 'en' | 'vi';
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume?: number;
  musicVolume?: number;
}

export interface ProgressState {
  version: 1;
  words: Record<string, WordRecord>;
  totalStars: number;
  bestEndlessScore: number;
  dailyStreak: number;
  lastPlayedDate: string | null;
  stats: PlayerStats;
  settings: ProgressSettings;
}

export const ALL_TOPICS: readonly VocabTopic[] = [
  'daily',
  'food',
  'travel',
  'nature',
  'work',
  'tech',
  'feelings',
  'culture',
];

export const CEFR_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

/** Returns the canonical spaced-repetition storage key for a vocabulary entry. */
export function makeWordKey(wordId: string): string {
  return `word:${wordId}`;
}

/** Computes the effective CEFR level in Endless mode, bumping one tier every 5 puzzles solved. */
export function getEffectiveLevelForEndless(base: CefrLevel, solved: number): CefrLevel {
  const baseIdx = CEFR_LEVELS.indexOf(base);
  const safeBaseIdx = baseIdx >= 0 ? baseIdx : 0;
  const bumps = Math.max(0, Math.floor(solved / 5));
  const targetIdx = Math.min(CEFR_LEVELS.length - 1, safeBaseIdx + bumps);
  return CEFR_LEVELS[targetIdx];
}
