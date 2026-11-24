import { getAllVocabulary, getVocabularyByFilter } from '../data/vocabulary';
import {
  ALL_TOPICS,
  CEFR_LEVELS,
  makeWordKey,
  type CefrLevel,
  type VocabEntry,
  type VocabTopic,
} from './types';

export interface PopMatchOptions {
  level: CefrLevel;
  topics: VocabTopic[];
  seed: number;
  pairCount?: number;
  prioritizedWordKeys?: string[];
  excludeWordIds?: string[];
  customPool?: VocabEntry[];
}

export interface PopMatchSession {
  id: string;
  seed: number;
  level: CefrLevel;
  entries: VocabEntry[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getAdjacentLevels(target: CefrLevel): CefrLevel[] {
  const idx = CEFR_LEVELS.indexOf(target);
  const others: Array<{ level: CefrLevel; dist: number }> = [];
  for (let i = 0; i < CEFR_LEVELS.length; i++) {
    if (i === idx) continue;
    others.push({ level: CEFR_LEVELS[i], dist: Math.abs(i - idx) });
  }
  others.sort((a, b) => a.dist - b.dist);
  return others.map((o) => o.level);
}

/**
 * Generates a deterministic Pop Match session of unique vocabulary pairs,
 * honoring custom decks, spaced-repetition priority, and progressive pool relaxation.
 */
export function generatePopMatch(options: PopMatchOptions): PopMatchSession {
  const {
    level,
    topics,
    seed,
    pairCount = 10,
    prioritizedWordKeys = [],
    excludeWordIds = [],
    customPool,
  } = options;

  const rng = mulberry32(seed);
  const effectiveTopics: VocabTopic[] =
    topics.length > 0 ? topics : [...ALL_TOPICS];
  const excludeSet = new Set(excludeWordIds);
  const priorityIndex = new Map<string, number>();
  prioritizedWordKeys.forEach((key, idx) => {
    if (!priorityIndex.has(key)) priorityIndex.set(key, idx);
  });

  const targetCount = Math.max(4, Math.min(pairCount, 20));
  const selected: VocabEntry[] = [];
  const usedWords = new Set<string>();

  const takeFrom = (pool: readonly VocabEntry[]): void => {
    if (selected.length >= targetCount) return;
    const prioritized: VocabEntry[] = [];
    const regular: VocabEntry[] = [];
    for (const entry of pool) {
      const w = entry.word.toLowerCase();
      if (usedWords.has(w)) continue;
      if (priorityIndex.has(makeWordKey(entry.id))) {
        prioritized.push(entry);
      } else {
        regular.push(entry);
      }
    }
    prioritized.sort(
      (a, b) =>
        (priorityIndex.get(makeWordKey(a.id)) ?? 0) -
        (priorityIndex.get(makeWordKey(b.id)) ?? 0)
    );
    const shuffledRegular = [...regular];
    for (let i = shuffledRegular.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffledRegular[i], shuffledRegular[j]] = [
        shuffledRegular[j],
        shuffledRegular[i],
      ];
    }
    for (const entry of [...prioritized, ...shuffledRegular]) {
      if (selected.length >= targetCount) break;
      const w = entry.word.toLowerCase();
      if (!usedWords.has(w)) {
        usedWords.add(w);
        selected.push(entry);
      }
    }
  };

  // 0. Custom Deck pool first (if user picked a custom/community deck)
  if (customPool && customPool.length > 0) {
    takeFrom(customPool.filter((e) => !excludeSet.has(e.id)));
    takeFrom(customPool);
    // If custom deck has >= 4 words, stop here so the round stays 100% focused on the deck!
    if (selected.length >= 4) {
      return {
        id: `pm-${level}-${seed}`,
        seed,
        level,
        entries: selected,
      };
    }
  }

  // 1. Primary: selectedTopics ∩ level (fresh)
  takeFrom(
    getVocabularyByFilter(effectiveTopics, level).filter(
      (e) => !excludeSet.has(e.id)
    )
  );

  // 2. Relax 1: adjacent CEFR levels within selectedTopics
  for (const adj of getAdjacentLevels(level)) {
    takeFrom(
      getVocabularyByFilter(effectiveTopics, adj).filter(
        (e) => !excludeSet.has(e.id)
      )
    );
  }

  // 3. Relax 2: all topics at target level
  takeFrom(
    getVocabularyByFilter(ALL_TOPICS, level).filter(
      (e) => !excludeSet.has(e.id)
    )
  );

  // 4. Relax 3: allow previously seen words
  takeFrom(getVocabularyByFilter(effectiveTopics, level));
  takeFrom(getAllVocabulary());

  return {
    id: `pm-${level}-${seed}`,
    seed,
    level,
    entries: selected,
  };
}
