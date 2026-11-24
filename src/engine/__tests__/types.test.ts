import { describe, expect, it } from 'vitest';
import {
  ALL_TOPICS,
  CEFR_LEVELS,
  getEffectiveLevelForEndless,
  makeWordKey,
} from '../types';

describe('engine types helpers', () => {
  it('exposes 8 topics and 5 CEFR levels', () => {
    expect(ALL_TOPICS).toEqual([
      'daily',
      'food',
      'travel',
      'nature',
      'work',
      'tech',
      'feelings',
      'culture',
    ]);
    expect(ALL_TOPICS).toHaveLength(8);
    expect(CEFR_LEVELS).toEqual(['A1', 'A2', 'B1', 'B2', 'C1']);
  });

  it('builds canonical word keys', () => {
    expect(makeWordKey('daily-apple')).toBe('word:daily-apple');
    expect(makeWordKey('tech-algorithm')).toBe('word:tech-algorithm');
  });

  it('escalates level every 5 puzzles and caps at C1', () => {
    expect(getEffectiveLevelForEndless('A1', 0)).toBe('A1');
    expect(getEffectiveLevelForEndless('A1', 4)).toBe('A1');
    expect(getEffectiveLevelForEndless('A1', 5)).toBe('A2');
    expect(getEffectiveLevelForEndless('A1', 9)).toBe('A2');
    expect(getEffectiveLevelForEndless('A1', 10)).toBe('B1');
    expect(getEffectiveLevelForEndless('A1', 15)).toBe('B2');
    expect(getEffectiveLevelForEndless('A1', 20)).toBe('C1');
    expect(getEffectiveLevelForEndless('A1', 25)).toBe('C1');

    expect(getEffectiveLevelForEndless('B1', 0)).toBe('B1');
    expect(getEffectiveLevelForEndless('B1', 5)).toBe('B2');
    expect(getEffectiveLevelForEndless('B1', 12)).toBe('C1');

    expect(getEffectiveLevelForEndless('C1', 0)).toBe('C1');
    expect(getEffectiveLevelForEndless('A2', -1)).toBe('A2');
  });
});
