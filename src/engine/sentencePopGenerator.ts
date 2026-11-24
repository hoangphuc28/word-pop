import { getVocabularyByFilter, VOCABULARY } from '../data/vocabulary';
import {
  ALL_TOPICS,
  CEFR_LEVELS,
  makeWordKey,
  type CefrLevel,
  type SentencePopPuzzle,
  type VocabEntry,
  type VocabTopic,
} from './types';

export interface SentencePopOptions {
  level: CefrLevel;
  topics: VocabTopic[];
  seed: number;
  prioritizedWordKeys?: string[];
  excludeWordIds?: string[];
  /** Optional custom deck words — prioritized ahead of standard CEFR pool */
  customPool?: VocabEntry[];
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

function shuffleDeterministic<T>(items: readonly T[], rng: () => number): T[] {
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

function orderCandidates(
  entries: VocabEntry[],
  priorityIndex: Map<string, number>,
  rng: () => number
): VocabEntry[] {
  const prioritized: VocabEntry[] = [];
  const regular: VocabEntry[] = [];
  for (const entry of entries) {
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
  return [...prioritized, ...shuffleDeterministic(regular, rng)];
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitSentenceByWord(
  example: string,
  word: string
): { before: string; after: string } | null {
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  const match = regex.exec(example);
  if (!match || match.index === undefined) return null;
  return {
    before: example.slice(0, match.index),
    after: example.slice(match.index + match[0].length),
  };
}

function getChoiceCount(level: CefrLevel): number {
  switch (level) {
    case 'A1':
      return 4;
    case 'A2':
      return 4;
    case 'B1':
      return 5;
    case 'B2':
      return 6;
    case 'C1':
      return 6;
  }
}

function pickTargetCandidate(
  level: CefrLevel,
  topics: VocabTopic[],
  excludeWordIds: string[],
  priorityIndex: Map<string, number>,
  rng: () => number,
  customPool?: VocabEntry[]
): { vocab: VocabEntry; before: string; after: string } {
  const effectiveTopics: VocabTopic[] =
    topics.length > 0 ? topics : [...ALL_TOPICS];
  const excludeSet = new Set(excludeWordIds);
  const seenIds = new Set<string>();

  const tryList = (
    raw: VocabEntry[]
  ): { vocab: VocabEntry; before: string; after: string } | null => {
    const fresh = raw.filter((e) => !seenIds.has(e.id));
    for (const e of fresh) seenIds.add(e.id);
    const ordered = orderCandidates(fresh, priorityIndex, rng);
    for (const entry of ordered) {
      const split = splitSentenceByWord(entry.example, entry.word);
      if (split) {
        return { vocab: entry, before: split.before, after: split.after };
      }
    }
    return null;
  };

  // 0. Custom Deck pool first
  if (customPool && customPool.length > 0) {
    const freshCustom = customPool.filter((e) => !excludeSet.has(e.id));
    const hitCustomFresh = tryList(freshCustom);
    if (hitCustomFresh) return hitCustomFresh;

    const hitCustomAny = tryList(customPool);
    if (hitCustomAny) return hitCustomAny;
  }

  // 1. Primary pool: selectedTopics ∩ targetLevel (excluding excludeWordIds)
  const primary = getVocabularyByFilter(effectiveTopics, level).filter(
    (e) => !excludeSet.has(e.id)
  );
  const hit0 = tryList(primary);
  if (hit0) return hit0;

  // 2. Relax 1: adjacent CEFR levels within selectedTopics (excluding excludeWordIds)
  for (const adjLevel of getAdjacentLevels(level)) {
    const adjPool = getVocabularyByFilter(effectiveTopics, adjLevel).filter(
      (e) => !excludeSet.has(e.id)
    );
    const hit1 = tryList(adjPool);
    if (hit1) return hit1;
  }

  // 3. Relax 2: all topics at targetLevel (excluding excludeWordIds)
  const allTopicsAtLevel = getVocabularyByFilter(ALL_TOPICS, level).filter(
    (e) => !excludeSet.has(e.id)
  );
  const hit2 = tryList(allTopicsAtLevel);
  if (hit2) return hit2;

  // 4. Relax 3: allow previously seen words (keep only last 2 excluded, then none)
  const lastTwoExcluded = new Set(excludeWordIds.slice(-2));
  const relaxedPrimary = getVocabularyByFilter(effectiveTopics, level).filter(
    (e) => !lastTwoExcluded.has(e.id)
  );
  const hit3a = tryList(relaxedPrimary);
  if (hit3a) return hit3a;

  const fullPrimary = getVocabularyByFilter(effectiveTopics, level);
  const hit3b = tryList(fullPrimary);
  if (hit3b) return hit3b;

  const hitFallback = tryList([...VOCABULARY]);
  if (hitFallback) return hitFallback;

  throw new Error(
    `Failed to find a SentencePop candidate with matching example for level=${level}`
  );
}

function pickDistractors(
  target: VocabEntry,
  needed: number,
  rng: () => number,
  customPool?: VocabEntry[]
): string[] {
  const chosen = new Set<string>([target.word.toLowerCase()]);
  const distractors: string[] = [];

  const addFrom = (pool: readonly VocabEntry[]) => {
    if (distractors.length >= needed) return;
    const shuffled = shuffleDeterministic(pool, rng);
    for (const entry of shuffled) {
      if (distractors.length >= needed) break;
      const w = entry.word.toLowerCase();
      if (!chosen.has(w)) {
        chosen.add(w);
        distractors.push(w);
      }
    }
  };

  // 0. Same custom deck first
  if (customPool && customPool.length > 0) {
    addFrom(customPool.filter((e) => e.pos === target.pos));
    addFrom(customPool);
  }

  // 1. Same level + same topic + same pos
  addFrom(
    VOCABULARY.filter(
      (e) =>
        e.level === target.level &&
        e.topic === target.topic &&
        e.pos === target.pos
    )
  );

  // 2. Same level + same pos
  addFrom(
    VOCABULARY.filter((e) => e.level === target.level && e.pos === target.pos)
  );

  // 3. Same level across all topics
  addFrom(VOCABULARY.filter((e) => e.level === target.level));

  // 4. Any vocab entry
  addFrom(VOCABULARY);

  return distractors;
}

export function generateSentencePop(
  options: SentencePopOptions
): SentencePopPuzzle {
  const {
    level,
    topics,
    seed,
    prioritizedWordKeys = [],
    excludeWordIds = [],
    customPool,
  } = options;

  const rng = mulberry32(seed);
  const priorityIndex = new Map<string, number>();
  prioritizedWordKeys.forEach((key, idx) => {
    if (!priorityIndex.has(key)) priorityIndex.set(key, idx);
  });

  const { vocab, before, after } = pickTargetCandidate(
    level,
    topics,
    excludeWordIds,
    priorityIndex,
    rng,
    customPool
  );

  const choiceCount = getChoiceCount(level);
  const distractors = pickDistractors(vocab, choiceCount - 1, rng, customPool);
  const choices = shuffleDeterministic(
    [vocab.word.toLowerCase(), ...distractors],
    rng
  );

  return {
    id: `sp-${level}-${seed}`,
    seed,
    vocab,
    sentenceBefore: before,
    sentenceAfter: after,
    choices,
    level,
  };
}
