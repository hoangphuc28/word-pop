import type { CefrLevel, VocabEntry, VocabTopic } from '../engine/types';
import { CULTURE_VOCAB } from './vocab/culture';
import { DAILY_VOCAB } from './vocab/daily';
import { FEELINGS_VOCAB } from './vocab/feelings';
import { FOOD_VOCAB } from './vocab/food';
import { NATURE_VOCAB } from './vocab/nature';
import { TECH_VOCAB } from './vocab/tech';
import { TRAVEL_VOCAB } from './vocab/travel';
import { WORK_VOCAB } from './vocab/work';

export const VOCABULARY: readonly VocabEntry[] = [
  ...DAILY_VOCAB,
  ...FOOD_VOCAB,
  ...TRAVEL_VOCAB,
  ...NATURE_VOCAB,
  ...WORK_VOCAB,
  ...TECH_VOCAB,
  ...FEELINGS_VOCAB,
  ...CULTURE_VOCAB,
];

const CURATED_WORD_SET = new Set(VOCABULARY.map((e) => e.word.toLowerCase()));
const onlineEntriesByWord = new Map<string, VocabEntry>();

export const VOCAB_BY_ID: ReadonlyMap<string, VocabEntry> = new Map(
  VOCABULARY.map((entry) => [entry.id, entry])
);

export function registerOnlineVocabulary(entries: readonly VocabEntry[]): number {
  let added = 0;
  for (const entry of entries) {
    const normalized = entry.word.toLowerCase();
    if (
      !/^[a-z]{3,8}$/.test(normalized) ||
      CURATED_WORD_SET.has(normalized) ||
      onlineEntriesByWord.has(normalized)
    ) {
      continue;
    }
    onlineEntriesByWord.set(normalized, {
      ...entry,
      word: normalized,
      source: 'online',
    });
    added += 1;
  }
  return added;
}

export function clearOnlineVocabulary(): void {
  onlineEntriesByWord.clear();
}

export function getOnlineVocabularyCount(): number {
  return onlineEntriesByWord.size;
}

export function getAllVocabulary(): VocabEntry[] {
  if (onlineEntriesByWord.size === 0) {
    return [...VOCABULARY];
  }
  return [...VOCABULARY, ...onlineEntriesByWord.values()];
}

export function getVocabularyByFilter(
  topics: readonly VocabTopic[],
  level?: CefrLevel
): VocabEntry[] {
  if (topics.length === 0) return [];
  const topicSet = new Set<VocabTopic>(topics);
  const pool = getAllVocabulary();
  return pool.filter(
    (entry) =>
      topicSet.has(entry.topic) && (level === undefined || entry.level === level)
  );
}
