import { describe, expect, it } from 'vitest';
import { getVocabularyByFilter } from '../../data/vocabulary';
import {
  ALL_TOPICS,
  CEFR_LEVELS,
  makeWordKey,
  type CefrLevel,
  type VocabTopic,
} from '../types';
import { generateSentencePop } from '../sentencePopGenerator';

const EXPECTED_CHOICES: Record<CefrLevel, number> = {
  A1: 4,
  A2: 4,
  B1: 5,
  B2C1: 6,
};

describe('generateSentencePop', () => {
  it('is deterministic for the same seed and options', () => {
    const opts = {
      level: 'B1' as CefrLevel,
      topics: ['travel', 'nature'] as VocabTopic[],
      seed: 98765,
    };
    const p1 = generateSentencePop(opts);
    const p2 = generateSentencePop(opts);
    expect(p1).toEqual(p2);
  });

  it('reconstructs vocab.example and provides unique tier-sized choices across all levels', () => {
    for (let i = 0; i < 40; i++) {
      const level = CEFR_LEVELS[i % CEFR_LEVELS.length];
      const topic = ALL_TOPICS[i % ALL_TOPICS.length];
      const puzzle = generateSentencePop({
        level,
        topics: [topic],
        seed: 2000 + i * 19,
      });

      const reconstructed = `${puzzle.sentenceBefore}${puzzle.vocab.word}${puzzle.sentenceAfter}`;
      expect(reconstructed.toLowerCase()).toBe(puzzle.vocab.example.toLowerCase());

      expect(puzzle.choices.length).toBe(EXPECTED_CHOICES[level]);
      expect(new Set(puzzle.choices).size).toBe(puzzle.choices.length);
      expect(puzzle.choices).toContain(puzzle.vocab.word.toLowerCase());
      for (const choice of puzzle.choices) {
        expect(choice).toBe(choice.toLowerCase());
      }
    }
  });

  it('handles narrow single topic x level sessions cleanly with relaxation', () => {
    const excludeWordIds: string[] = [];
    // Run 15 rounds on a 12-word bucket (daily x B2C1) so relaxation is exercised
    for (let round = 0; round < 15; round++) {
      const puzzle = generateSentencePop({
        level: 'B2C1',
        topics: ['daily'],
        seed: 3000 + round,
        excludeWordIds: [...excludeWordIds],
      });

      const reconstructed = `${puzzle.sentenceBefore}${puzzle.vocab.word}${puzzle.sentenceAfter}`;
      expect(reconstructed.toLowerCase()).toBe(puzzle.vocab.example.toLowerCase());
      expect(puzzle.choices.length).toBe(EXPECTED_CHOICES.B2C1);
      expect(new Set(puzzle.choices).size).toBe(EXPECTED_CHOICES.B2C1);
      expect(puzzle.choices).toContain(puzzle.vocab.word.toLowerCase());

      if (round < 12) {
        // Primary pool has 12 words in daily x B2C1
        expect(puzzle.vocab.topic).toBe('daily');
        expect(puzzle.vocab.level).toBe('B2C1');
        expect(excludeWordIds).not.toContain(puzzle.vocab.id);
      } else {
        // Relax 1 keeps topic focus ('daily') at adjacent CEFR level
        expect(puzzle.vocab.topic).toBe('daily');
        expect(excludeWordIds).not.toContain(puzzle.vocab.id);
      }

      excludeWordIds.push(puzzle.vocab.id);
    }
  });

  it('picks prioritizedWordKeys first when eligible', () => {
    const pool = getVocabularyByFilter(['work'], 'A2');
    const target = pool[pool.length - 1];
    const puzzle = generateSentencePop({
      level: 'A2',
      topics: ['work'],
      seed: 4444,
      prioritizedWordKeys: [makeWordKey(target.id)],
    });
    expect(puzzle.vocab.id).toBe(target.id);
  });
});
