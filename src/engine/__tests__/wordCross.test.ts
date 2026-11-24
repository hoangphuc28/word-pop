import { describe, expect, it } from 'vitest';
import { getVocabularyByFilter } from '../../data/vocabulary';
import {
  ALL_TOPICS,
  CEFR_LEVELS,
  makeWordKey,
  type CefrLevel,
  type VocabTopic,
  type WordCrossPuzzle,
} from '../types';
import { generateWordCross } from '../wordCrossGenerator';
import { validateWordCross } from '../wordCrossValidator';

const EXPECTED_DISTRACTORS: Record<CefrLevel, number> = {
  A1: 0,
  A2: 1,
  B1: 2,
  B2C1: 3,
};

function assertValidCrosswordInvariants(
  puzzle: WordCrossPuzzle,
  expectedDistractors: number
): void {
  expect(puzzle.rows).toBeGreaterThanOrEqual(1);
  expect(puzzle.rows).toBeLessThanOrEqual(9);
  expect(puzzle.cols).toBeGreaterThanOrEqual(1);
  expect(puzzle.cols).toBeLessThanOrEqual(9);

  expect(puzzle.entries.length).toBeGreaterThanOrEqual(2);
  expect(puzzle.entries.length).toBeLessThanOrEqual(4);
  expect(puzzle.blankCellIds.length).toBeGreaterThanOrEqual(2);

  const cells = Object.values(puzzle.cells);
  expect(cells.length).toBeGreaterThan(0);

  // Normalized to minRow = 0, minCol = 0
  const minRow = Math.min(...cells.map((c) => c.row));
  const minCol = Math.min(...cells.map((c) => c.col));
  const maxRow = Math.max(...cells.map((c) => c.row));
  const maxCol = Math.max(...cells.map((c) => c.col));
  expect(minRow).toBe(0);
  expect(minCol).toBe(0);
  expect(maxRow + 1).toBe(puzzle.rows);
  expect(maxCol + 1).toBe(puzzle.cols);

  // Every cell solution is single uppercase ASCII letter
  for (const cell of cells) {
    expect(cell.solution).toMatch(/^[A-Z]$/);
    expect(puzzle.cells[cell.id]).toBe(cell);
  }

  // Single connected component via BFS over orthogonal adjacency
  const coordMap = new Map<string, string>();
  for (const cell of cells) {
    coordMap.set(`${cell.row},${cell.col}`, cell.id);
  }
  const visited = new Set<string>();
  const queue: Array<[number, number]> = [[cells[0].row, cells[0].col]];
  visited.add(`${cells[0].row},${cells[0].col}`);
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const key = `${r + dr},${c + dc}`;
      if (coordMap.has(key) && !visited.has(key)) {
        visited.add(key);
        queue.push([r + dr, c + dc]);
      }
    }
  }
  expect(visited.size).toBe(cells.length);

  // Entry letters match cells[id].solution, clue numbering ordered top-to-bottom then left-to-right
  const usedVocabIds = new Set<string>();
  const acrossRuns = new Set<string>();
  const downRuns = new Set<string>();

  for (let i = 0; i < puzzle.entries.length; i++) {
    const entry = puzzle.entries[i];
    expect(entry.number).toBe(i + 1);
    expect(usedVocabIds.has(entry.vocab.id)).toBe(false);
    usedVocabIds.add(entry.vocab.id);

    if (i > 0) {
      const prev = puzzle.entries[i - 1];
      const ordered =
        prev.row < entry.row || (prev.row === entry.row && prev.col <= entry.col);
      expect(ordered).toBe(true);
    }

    const startCell = puzzle.cells[entry.cellIds[0]];
    expect(startCell.row).toBe(entry.row);
    expect(startCell.col).toBe(entry.col);
    expect(startCell.clueNumbers).toContain(entry.number);

    const upperWord = entry.vocab.word.toUpperCase();
    expect(entry.length).toBe(upperWord.length);
    expect(entry.cellIds.length).toBe(upperWord.length);

    let hasFixed = false;
    for (let k = 0; k < upperWord.length; k++) {
      const cell = puzzle.cells[entry.cellIds[k]];
      expect(cell).toBeDefined();
      expect(cell.solution).toBe(upperWord[k]);
      const expectedRow = entry.direction === 'down' ? entry.row + k : entry.row;
      const expectedCol = entry.direction === 'across' ? entry.col + k : entry.col;
      expect(cell.row).toBe(expectedRow);
      expect(cell.col).toBe(expectedCol);
      if (cell.kind === 'fixed') hasFixed = true;
    }

    if (puzzle.level !== 'B2C1') {
      expect(hasFixed).toBe(true);
    }

    const sig = `${entry.row},${entry.col}:${entry.length}`;
    if (entry.direction === 'across') acrossRuns.add(sig);
    else downRuns.add(sig);
  }

  // No invalid adjacent collisions: every maximal horizontal/vertical run of len >= 2 must be an entry
  for (let r = 0; r < puzzle.rows; r++) {
    let c = 0;
    while (c < puzzle.cols) {
      if (!coordMap.has(`${r},${c}`)) {
        c++;
        continue;
      }
      const startC = c;
      while (c < puzzle.cols && coordMap.has(`${r},${c}`)) c++;
      const len = c - startC;
      if (len >= 2) {
        expect(acrossRuns.has(`${r},${startC}:${len}`)).toBe(true);
      }
    }
  }
  for (let c = 0; c < puzzle.cols; c++) {
    let r = 0;
    while (r < puzzle.rows) {
      if (!coordMap.has(`${r},${c}`)) {
        r++;
        continue;
      }
      const startR = r;
      while (r < puzzle.rows && coordMap.has(`${r},${c}`)) r++;
      const len = r - startR;
      if (len >= 2) {
        expect(downRuns.has(`${startR},${c}:${len}`)).toBe(true);
      }
    }
  }

  // blankCellIds matches cells with kind === 'blank'
  const actualBlankIds = cells.filter((c) => c.kind === 'blank').map((c) => c.id);
  expect([...puzzle.blankCellIds].sort()).toEqual([...actualBlankIds].sort());

  // trayLetters is a superset of all blank cell solutions with exact distractor count
  expect(puzzle.trayLetters.length).toBe(
    puzzle.blankCellIds.length + expectedDistractors
  );
  const trayCounts = new Map<string, number>();
  for (const ch of puzzle.trayLetters) {
    expect(ch).toMatch(/^[A-Z]$/);
    trayCounts.set(ch, (trayCounts.get(ch) ?? 0) + 1);
  }
  for (const blankId of puzzle.blankCellIds) {
    const letter = puzzle.cells[blankId].solution;
    const count = trayCounts.get(letter) ?? 0;
    expect(count).toBeGreaterThanOrEqual(1);
    trayCounts.set(letter, count - 1);
  }
}

describe('generateWordCross', () => {
  it('is deterministic for the same seed and options', () => {
    const opts = {
      level: 'B1' as CefrLevel,
      topics: ['daily', 'tech'] as VocabTopic[],
      seed: 123456,
    };
    const p1 = generateWordCross(opts);
    const p2 = generateWordCross(opts);
    expect(p1).toEqual(p2);
  });

  it('produces valid compact connected puzzles across 50 seeds, all 4 CEFR tiers, and single-topic buckets', () => {
    for (let i = 0; i < 50; i++) {
      const level = CEFR_LEVELS[i % CEFR_LEVELS.length];
      const topic = ALL_TOPICS[i % ALL_TOPICS.length];
      const puzzle = generateWordCross({
        level,
        topics: [topic],
        seed: 1000 + i * 37,
      });
      assertValidCrosswordInvariants(puzzle, EXPECTED_DISTRACTORS[level]);
    }
  });

  it('supports endlessTierBonus on B2C1 with increased distractors up to 4', () => {
    const puzzle = generateWordCross({
      level: 'B2C1',
      topics: [...ALL_TOPICS],
      seed: 4242,
      endlessTierBonus: 2,
    });
    assertValidCrosswordInvariants(puzzle, 4);
  });

  it('handles narrow Study Lab 5-puzzle session on daily x B2C1 with pool relaxation', () => {
    const excludeWordIds: string[] = [];
    for (let round = 0; round < 5; round++) {
      const puzzle = generateWordCross({
        level: 'B2C1',
        topics: ['daily'],
        seed: 7000 + round,
        excludeWordIds: [...excludeWordIds],
      });
      assertValidCrosswordInvariants(puzzle, EXPECTED_DISTRACTORS.B2C1);
      // First 3 rounds should stay in daily topic (relaxing to adjacent level in daily on round 4+)
      if (round < 4) {
        expect(puzzle.entries.every((e) => e.vocab.topic === 'daily')).toBe(true);
      }
      for (const entry of puzzle.entries) {
        excludeWordIds.push(entry.vocab.id);
      }
    }
  });

  it('preferentially selects prioritizedWordKeys when eligible', () => {
    const pool = getVocabularyByFilter(['tech'], 'A1');
    const target = pool[pool.length - 1];
    const puzzle = generateWordCross({
      level: 'A1',
      topics: ['tech'],
      seed: 9001,
      prioritizedWordKeys: [makeWordKey(target.id)],
    });
    const entryIds = puzzle.entries.map((e) => e.vocab.id);
    expect(entryIds).toContain(target.id);
  });
});

describe('validateWordCross', () => {
  it('handles incomplete board, wrong letters, partial solve, and complete valid case-insensitive board', () => {
    const puzzle = generateWordCross({
      level: 'A2',
      topics: ['daily', 'food'],
      seed: 555,
    });

    // Empty placements -> incomplete, not valid, no invalid cells
    const emptyRes = validateWordCross(puzzle, {});
    expect(emptyRes.isComplete).toBe(false);
    expect(emptyRes.isValid).toBe(false);
    expect(emptyRes.invalidCellIds).toEqual([]);

    // Wrong letter on first blank cell
    const wrongCellId = puzzle.blankCellIds[0];
    const correctLetter = puzzle.cells[wrongCellId].solution;
    const wrongLetter = correctLetter === 'Z' ? 'A' : 'Z';
    const wrongRes = validateWordCross(puzzle, { [wrongCellId]: wrongLetter });
    expect(wrongRes.isComplete).toBe(false);
    expect(wrongRes.isValid).toBe(false);
    expect(wrongRes.invalidCellIds).toEqual([wrongCellId]);

    // Partially solved: fill all blanks of the first entry correctly
    const firstEntry = puzzle.entries[0];
    const partialPlacements: Record<string, string> = {};
    for (const cid of firstEntry.cellIds) {
      if (puzzle.cells[cid].kind === 'blank') {
        partialPlacements[cid] = puzzle.cells[cid].solution.toLowerCase();
      }
    }
    const partialRes = validateWordCross(puzzle, partialPlacements);
    expect(partialRes.solvedWordIds).toContain(firstEntry.vocab.id);
    expect(partialRes.invalidCellIds).toEqual([]);

    // Complete valid board with lowercase + whitespace
    const fullPlacements: Record<string, string> = {};
    for (const cid of puzzle.blankCellIds) {
      fullPlacements[cid] = ` ${puzzle.cells[cid].solution.toLowerCase()} `;
    }
    const fullRes = validateWordCross(puzzle, fullPlacements);
    expect(fullRes.isComplete).toBe(true);
    expect(fullRes.isValid).toBe(true);
    expect(fullRes.invalidCellIds).toEqual([]);
    expect(fullRes.solvedWordIds.sort()).toEqual(
      puzzle.entries.map((e) => e.vocab.id).sort()
    );
  });
});
