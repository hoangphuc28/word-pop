import { describe, expect, it } from 'vitest';
import { ALL_TOPICS, CEFR_LEVELS, type PartOfSpeech } from '../../engine/types';
import {
  VOCABULARY,
  VOCAB_BY_ID,
  getVocabularyByFilter,
} from '../vocabulary';

const VALID_POS = new Set<PartOfSpeech>(['n.', 'v.', 'adj.', 'adv.']);
const WORD_PATTERN = /^[a-z]{3,8}$/;

describe('Curated Bilingual Vocabulary Bank', () => {
  it('contains at least 480 curated entries (8 topics × 5 CEFR levels × 12 words)', () => {
    expect(VOCABULARY.length).toBeGreaterThanOrEqual(480);
    expect(VOCABULARY.length).toBe(480);
  });

  it('has globally unique ids and globally unique words', () => {
    const ids = new Set<string>();
    const words = new Set<string>();
    const duplicateIds: string[] = [];
    const duplicateWords: string[] = [];

    for (const entry of VOCABULARY) {
      if (ids.has(entry.id)) duplicateIds.push(entry.id);
      ids.add(entry.id);

      if (words.has(entry.word)) duplicateWords.push(entry.word);
      words.add(entry.word);
    }

    expect(duplicateIds).toEqual([]);
    expect(duplicateWords).toEqual([]);
  });

  it('enforces strict word format, canonical id, valid metadata, and bilingual fields', () => {
    const violations: string[] = [];

    for (const entry of VOCABULARY) {
      if (!WORD_PATTERN.test(entry.word)) {
        violations.push(`Invalid word format: ${entry.id} (${entry.word})`);
      }
      if (entry.id !== `${entry.topic}-${entry.word}`) {
        violations.push(`Non-canonical id: ${entry.id} expected ${entry.topic}-${entry.word}`);
      }
      if (!VALID_POS.has(entry.pos)) {
        violations.push(`Invalid pos: ${entry.id} (${entry.pos})`);
      }
      if (!ALL_TOPICS.includes(entry.topic)) {
        violations.push(`Invalid topic: ${entry.id} (${entry.topic})`);
      }
      if (!CEFR_LEVELS.includes(entry.level)) {
        violations.push(`Invalid level: ${entry.id} (${entry.level})`);
      }
      if (!entry.ipa.startsWith('/') || !entry.ipa.endsWith('/') || entry.ipa.length <= 2) {
        violations.push(`Invalid IPA: ${entry.id} (${entry.ipa})`);
      }
      if (!entry.en.trim()) {
        violations.push(`Empty en clue: ${entry.id}`);
      }
      if (!entry.vi.trim()) {
        violations.push(`Empty vi meaning: ${entry.id}`);
      }
      if (!entry.example.trim()) {
        violations.push(`Empty example: ${entry.id}`);
      }
      if (!entry.exampleVi.trim()) {
        violations.push(`Empty exampleVi: ${entry.id}`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('ensures every example contains the exact target word and no English clue leaks its answer', () => {
    const missingInExample: string[] = [];
    const leakedInClue: string[] = [];

    for (const entry of VOCABULARY) {
      const wholeWordRegex = new RegExp(`\\b${entry.word}\\b`, 'i');
      if (!wholeWordRegex.test(entry.example)) {
        missingInExample.push(`${entry.id}: "${entry.example}"`);
      }
      if (wholeWordRegex.test(entry.en)) {
        leakedInClue.push(`${entry.id}: "${entry.en}"`);
      }
    }

    expect(missingInExample).toEqual([]);
    expect(leakedInClue).toEqual([]);
  });

  it('populates all 40 topic × CEFR level buckets with exactly 12 entries', () => {
    const mismatched: string[] = [];
    let bucketCount = 0;

    for (const topic of ALL_TOPICS) {
      for (const level of CEFR_LEVELS) {
        bucketCount += 1;
        const count = VOCABULARY.filter(
          (entry) => entry.topic === topic && entry.level === level
        ).length;
        if (count !== 12) {
          mismatched.push(`${topic}:${level}=${count}`);
        }
      }
    }

    expect(bucketCount).toBe(40);
    expect(mismatched).toEqual([]);
  });

  it('resolves every entry cleanly via VOCAB_BY_ID', () => {
    expect(VOCAB_BY_ID.size).toBe(VOCABULARY.length);
    for (const entry of VOCABULARY) {
      expect(VOCAB_BY_ID.get(entry.id)).toBe(entry);
    }
  });

  it('filters vocabulary accurately via getVocabularyByFilter', () => {
    const dailyA1 = getVocabularyByFilter(['daily'], 'A1');
    expect(dailyA1.length).toBe(12);
    expect(dailyA1.every((e) => e.topic === 'daily' && e.level === 'A1')).toBe(true);

    const foodAndTravel = getVocabularyByFilter(['food', 'travel']);
    expect(foodAndTravel.length).toBe(120);
    expect(
      foodAndTravel.every((e) => e.topic === 'food' || e.topic === 'travel')
    ).toBe(true);

    const empty = getVocabularyByFilter([], 'B1');
    expect(empty).toEqual([]);
  });
});
