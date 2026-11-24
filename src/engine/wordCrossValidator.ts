import type { WordCrossPuzzle } from './types';

export interface WordCrossValidationResult {
  isComplete: boolean;
  isValid: boolean;
  invalidCellIds: string[];
  solvedWordIds: string[];
}

function normalizeLetter(value: string | undefined): string {
  if (typeof value !== 'string') return '';
  return value.trim().toUpperCase();
}

export function validateWordCross(
  puzzle: WordCrossPuzzle,
  placements: Record<string, string>
): WordCrossValidationResult {
  const invalidCellIds: string[] = [];
  let filledCount = 0;

  for (const cellId of puzzle.blankCellIds) {
    const cell = puzzle.cells[cellId];
    if (!cell) continue;
    const placed = normalizeLetter(placements[cellId]);
    if (placed.length === 0) {
      continue;
    }
    filledCount += 1;
    if (placed !== cell.solution.toUpperCase()) {
      invalidCellIds.push(cellId);
    }
  }

  const isComplete = filledCount === puzzle.blankCellIds.length;
  const isValid = isComplete && invalidCellIds.length === 0;

  const solvedWordIds: string[] = [];
  for (const entry of puzzle.entries) {
    let allCorrect = true;
    for (const cellId of entry.cellIds) {
      const cell = puzzle.cells[cellId];
      if (!cell) {
        allCorrect = false;
        break;
      }
      if (cell.kind === 'fixed') {
        continue;
      }
      const placed = normalizeLetter(placements[cellId]);
      if (placed !== cell.solution.toUpperCase()) {
        allCorrect = false;
        break;
      }
    }
    if (allCorrect) {
      solvedWordIds.push(entry.vocab.id);
    }
  }

  return {
    isComplete,
    isValid,
    invalidCellIds,
    solvedWordIds,
  };
}
