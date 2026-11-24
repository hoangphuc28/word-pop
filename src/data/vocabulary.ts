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

export const VOCAB_BY_ID: ReadonlyMap<string, VocabEntry> = new Map(
  VOCABULARY.map((entry) => [entry.id, entry])
);

export function getVocabularyByFilter(
  topics: readonly VocabTopic[],
  level?: CefrLevel
): VocabEntry[] {
  if (topics.length === 0) return [];
  const topicSet = new Set<VocabTopic>(topics);
  return VOCABULARY.filter(
    (entry) =>
      topicSet.has(entry.topic) && (level === undefined || entry.level === level)
  );
}
