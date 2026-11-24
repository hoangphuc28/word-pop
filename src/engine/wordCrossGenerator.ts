import { getVocabularyByFilter, VOCABULARY } from '../data/vocabulary';
import {
  ALL_TOPICS,
  CEFR_LEVELS,
  makeWordKey,
  type CefrLevel,
  type VocabEntry,
  type VocabTopic,
  type WordCrossCell,
  type WordCrossEntry,
  type WordCrossPuzzle,
  type WordDirection,
} from './types';

export interface WordCrossOptions {
  level: CefrLevel;
  topics: VocabTopic[];
  seed: number;
  prioritizedWordKeys?: string[];
  excludeWordIds?: string[];
  endlessTierBonus?: number;
}

const MAX_GRID_SIZE = 9;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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

/**
 * Builds progressive candidate pool tiers following the exact relaxation order:
 * 0. Primary: selectedTopics ∩ targetLevel (excluding excludeWordIds)
 * 1. Relax 1: adjacent CEFR levels within selectedTopics (excluding excludeWordIds)
 * 2. Relax 2: all topics at targetLevel (excluding excludeWordIds)
 * 3. Relax 3: allow previously seen words (first keeping only last 2 excluded, then none)
 */
function buildCandidateTiers(
  level: CefrLevel,
  topics: VocabTopic[],
  excludeWordIds: string[],
  priorityIndex: Map<string, number>,
  rng: () => number
): VocabEntry[][] {
  const effectiveTopics: VocabTopic[] =
    topics.length > 0 ? topics : [...ALL_TOPICS];
  const excludeSet = new Set(excludeWordIds);
  const seenIds = new Set<string>();

  const takeUnique = (list: VocabEntry[]): VocabEntry[] => {
    const fresh = list.filter((e) => !seenIds.has(e.id));
    for (const e of fresh) seenIds.add(e.id);
    return orderCandidates(fresh, priorityIndex, rng);
  };

  const tiers: VocabEntry[][] = [];

  // Tier 0: Primary pool
  const primary = getVocabularyByFilter(effectiveTopics, level).filter(
    (e) => !excludeSet.has(e.id)
  );
  tiers.push(takeUnique(primary));

  // Tier 1: Relax 1 — adjacent CEFR levels within selectedTopics (by distance)
  const adjacentLevels = getAdjacentLevels(level);
  for (const adjLevel of adjacentLevels) {
    const adjPool = getVocabularyByFilter(effectiveTopics, adjLevel).filter(
      (e) => !excludeSet.has(e.id)
    );
    const ordered = takeUnique(adjPool);
    if (ordered.length > 0) tiers.push(ordered);
  }

  // Tier 2: Relax 2 — all topics at targetLevel
  const allTopicsAtLevel = getVocabularyByFilter(ALL_TOPICS, level).filter(
    (e) => !excludeSet.has(e.id)
  );
  const tier2 = takeUnique(allTopicsAtLevel);
  if (tier2.length > 0) tiers.push(tier2);

  // Tier 3a: Relax 3 — allow previously seen words in selectedTopics ∩ targetLevel (keeping only last 2 excluded)
  const lastTwoExcluded = new Set(excludeWordIds.slice(-2));
  const seenPrimaryRelaxed = getVocabularyByFilter(effectiveTopics, level).filter(
    (e) => !lastTwoExcluded.has(e.id)
  );
  const tier3a = takeUnique(seenPrimaryRelaxed);
  if (tier3a.length > 0) tiers.push(tier3a);

  // Tier 3b: Relax 3 — allow all words in selectedTopics ∩ targetLevel
  const seenPrimaryAll = getVocabularyByFilter(effectiveTopics, level);
  const tier3b = takeUnique(seenPrimaryAll);
  if (tier3b.length > 0) tiers.push(tier3b);

  // Tier 3c: Ultimate fallback — all remaining vocabulary
  const remainingAll = [...VOCABULARY];
  const tier3c = takeUnique(remainingAll);
  if (tier3c.length > 0) tiers.push(tier3c);

  return tiers;
}

interface PlacedWord {
  vocab: VocabEntry;
  word: string;
  row: number;
  col: number;
  direction: WordDirection;
}

interface GridCellState {
  letter: string;
  across: boolean;
  down: boolean;
}

interface GridState {
  cells: Map<string, GridCellState>;
  words: PlacedWord[];
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

function createEmptyGrid(): GridState {
  return {
    cells: new Map(),
    words: [],
    minRow: Infinity,
    maxRow: -Infinity,
    minCol: Infinity,
    maxCol: -Infinity,
  };
}

function cloneGrid(grid: GridState): GridState {
  const cells = new Map<string, GridCellState>();
  for (const [k, v] of grid.cells) {
    cells.set(k, { ...v });
  }
  return {
    cells,
    words: [...grid.words],
    minRow: grid.minRow,
    maxRow: grid.maxRow,
    minCol: grid.minCol,
    maxCol: grid.maxCol,
  };
}

function placeWordOnGrid(
  grid: GridState,
  vocab: VocabEntry,
  row: number,
  col: number,
  direction: WordDirection
): void {
  const word = vocab.word.toUpperCase();
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;

  for (let i = 0; i < word.length; i++) {
    const r = row + i * dr;
    const c = col + i * dc;
    const key = cellKey(r, c);
    const existing = grid.cells.get(key);
    if (existing) {
      if (direction === 'across') existing.across = true;
      else existing.down = true;
    } else {
      grid.cells.set(key, {
        letter: word[i],
        across: direction === 'across',
        down: direction === 'down',
      });
    }
    if (r < grid.minRow) grid.minRow = r;
    if (r > grid.maxRow) grid.maxRow = r;
    if (c < grid.minCol) grid.minCol = c;
    if (c > grid.maxCol) grid.maxCol = c;
  }

  grid.words.push({ vocab, word, row, col, direction });
}

interface PlacementCandidate {
  row: number;
  col: number;
  direction: WordDirection;
  intersections: number;
  area: number;
  maxDim: number;
  tieBreak: number;
}

function canPlaceWord(
  grid: GridState,
  word: string,
  row: number,
  col: number,
  direction: WordDirection
): { valid: boolean; intersections: number; area: number; maxDim: number } {
  const dr = direction === 'down' ? 1 : 0;
  const dc = direction === 'across' ? 1 : 0;
  const len = word.length;

  // Check bounding box first
  const endRow = row + (len - 1) * dr;
  const endCol = col + (len - 1) * dc;
  const newMinRow = Math.min(grid.minRow, row);
  const newMaxRow = Math.max(grid.maxRow, endRow);
  const newMinCol = Math.min(grid.minCol, col);
  const newMaxCol = Math.max(grid.maxCol, endCol);
  const height = newMaxRow - newMinRow + 1;
  const width = newMaxCol - newMinCol + 1;
  if (height > MAX_GRID_SIZE || width > MAX_GRID_SIZE) {
    return { valid: false, intersections: 0, area: 0, maxDim: 0 };
  }

  // Cell immediately before start and immediately after end must be empty
  if (grid.cells.has(cellKey(row - dr, col - dc))) {
    return { valid: false, intersections: 0, area: 0, maxDim: 0 };
  }
  if (grid.cells.has(cellKey(row + len * dr, col + len * dc))) {
    return { valid: false, intersections: 0, area: 0, maxDim: 0 };
  }

  let intersections = 0;
  for (let i = 0; i < len; i++) {
    const r = row + i * dr;
    const c = col + i * dc;
    const existing = grid.cells.get(cellKey(r, c));

    if (existing) {
      if (existing.letter !== word[i]) {
        return { valid: false, intersections: 0, area: 0, maxDim: 0 };
      }
      // Cannot overlap with another word in the same direction
      if (
        (direction === 'across' && existing.across) ||
        (direction === 'down' && existing.down)
      ) {
        return { valid: false, intersections: 0, area: 0, maxDim: 0 };
      }
      intersections += 1;
    } else {
      // Perpendicular neighbors must be empty to prevent unintended side-by-side collisions
      const perp1 = grid.cells.has(cellKey(r - dc, c - dr));
      const perp2 = grid.cells.has(cellKey(r + dc, c + dr));
      if (perp1 || perp2) {
        return { valid: false, intersections: 0, area: 0, maxDim: 0 };
      }
    }
  }

  if (grid.words.length > 0 && intersections < 1) {
    return { valid: false, intersections: 0, area: 0, maxDim: 0 };
  }

  return {
    valid: true,
    intersections,
    area: height * width,
    maxDim: Math.max(height, width),
  };
}

function findBestPlacement(
  grid: GridState,
  word: string,
  rng: () => number
): PlacementCandidate | null {
  const candidates: PlacementCandidate[] = [];
  const seenPlacements = new Set<string>();

  for (const placed of grid.words) {
    const nextDir: WordDirection =
      placed.direction === 'across' ? 'down' : 'across';
    const pDr = placed.direction === 'down' ? 1 : 0;
    const pDc = placed.direction === 'across' ? 1 : 0;
    const nDr = nextDir === 'down' ? 1 : 0;
    const nDc = nextDir === 'across' ? 1 : 0;

    for (let pi = 0; pi < placed.word.length; pi++) {
      const targetChar = placed.word[pi];
      const interRow = placed.row + pi * pDr;
      const interCol = placed.col + pi * pDc;

      for (let wi = 0; wi < word.length; wi++) {
        if (word[wi] !== targetChar) continue;
        const startRow = interRow - wi * nDr;
        const startCol = interCol - wi * nDc;
        const sig = `${startRow},${startCol},${nextDir}`;
        if (seenPlacements.has(sig)) continue;
        seenPlacements.add(sig);

        const check = canPlaceWord(grid, word, startRow, startCol, nextDir);
        if (check.valid) {
          candidates.push({
            row: startRow,
            col: startCol,
            direction: nextDir,
            intersections: check.intersections,
            area: check.area,
            maxDim: check.maxDim,
            tieBreak: rng(),
          });
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.intersections !== b.intersections) {
      return b.intersections - a.intersections;
    }
    if (a.area !== b.area) return a.area - b.area;
    if (a.maxDim !== b.maxDim) return a.maxDim - b.maxDim;
    return a.tieBreak - b.tieBreak;
  });

  return candidates[0];
}

function tryBuildLayout(
  candidates: VocabEntry[],
  targetWordCount: number,
  priorityIndex: Map<string, number>,
  rng: () => number
): GridState | null {
  if (candidates.length < 2) return null;

  let bestGrid: GridState | null = null;
  let bestPriorityHits = -1;
  let bestArea = Infinity;

  const maxStartAttempts = Math.min(candidates.length, 10);

  for (let startIdx = 0; startIdx < maxStartAttempts; startIdx++) {
    const startVocab = candidates[startIdx];
    const startDir: WordDirection = rng() < 0.5 ? 'across' : 'down';
    const grid = createEmptyGrid();
    placeWordOnGrid(grid, startVocab, 0, 0, startDir);

    const usedIds = new Set<string>([startVocab.id]);
    const usedWords = new Set<string>([startVocab.word.toLowerCase()]);

    // Greedy multi-pass placement so earlier-skipped words can intersect newly added words
    let progressed = true;
    while (grid.words.length < targetWordCount && progressed) {
      progressed = false;
      for (const cand of candidates) {
        if (grid.words.length >= targetWordCount) break;
        const lower = cand.word.toLowerCase();
        if (usedIds.has(cand.id) || usedWords.has(lower)) continue;

        const placement = findBestPlacement(grid, lower.toUpperCase(), rng);
        if (placement) {
          placeWordOnGrid(
            grid,
            cand,
            placement.row,
            placement.col,
            placement.direction
          );
          usedIds.add(cand.id);
          usedWords.add(lower);
          progressed = true;
        }
      }
    }

    if (grid.words.length < 2) continue;

    const area =
      (grid.maxRow - grid.minRow + 1) * (grid.maxCol - grid.minCol + 1);
    const priorityHits = grid.words.reduce(
      (acc, w) => acc + (priorityIndex.has(makeWordKey(w.vocab.id)) ? 1 : 0),
      0
    );

    const isBetter =
      !bestGrid ||
      grid.words.length > bestGrid.words.length ||
      (grid.words.length === bestGrid.words.length &&
        (priorityHits > bestPriorityHits ||
          (priorityHits === bestPriorityHits && area < bestArea)));

    if (isBetter) {
      bestGrid = cloneGrid(grid);
      bestPriorityHits = priorityHits;
      bestArea = area;
    }

    // Stop early if we hit targetWordCount with max possible priority inclusion
    if (
      bestGrid &&
      bestGrid.words.length === targetWordCount &&
      (priorityIndex.size === 0 || bestPriorityHits > 0)
    ) {
      break;
    }
  }

  return bestGrid;
}

interface TierConfig {
  targetWords: number;
  minWords: number;
  blankRatio: number;
  distractorCount: number;
}

function getTierConfig(
  level: CefrLevel,
  rng: () => number,
  endlessTierBonus?: number
): TierConfig {
  switch (level) {
    case 'A1':
      return {
        targetWords: 2,
        minWords: 2,
        blankRatio: 0.45,
        distractorCount: 0,
      };
    case 'A2':
      return {
        targetWords: 3,
        minWords: 3,
        blankRatio: 0.55,
        distractorCount: 1,
      };
    case 'B1':
      return {
        targetWords: rng() < 0.5 ? 3 : 4,
        minWords: 3,
        blankRatio: 0.65,
        distractorCount: 2,
      };
    case 'B2C1': {
      const bonus = Math.max(0, endlessTierBonus ?? 0);
      const blankRatio =
        bonus > 0 ? Math.min(0.85, 0.75 + bonus * 0.05) : 0.75;
      const distractorCount = bonus > 0 ? 4 : 3;
      return {
        targetWords: 4,
        minWords: 4,
        blankRatio,
        distractorCount,
      };
    }
  }
}

export function generateWordCross(options: WordCrossOptions): WordCrossPuzzle {
  const {
    level,
    topics,
    seed,
    prioritizedWordKeys = [],
    excludeWordIds = [],
    endlessTierBonus,
  } = options;

  const rng = mulberry32(seed);
  const tierConfig = getTierConfig(level, rng, endlessTierBonus);

  const priorityIndex = new Map<string, number>();
  prioritizedWordKeys.forEach((key, idx) => {
    if (!priorityIndex.has(key)) priorityIndex.set(key, idx);
  });

  const candidateTiers = buildCandidateTiers(
    level,
    topics,
    excludeWordIds,
    priorityIndex,
    rng
  );

  // Progressively expand candidate pool across relaxation tiers until target layout is built
  let cumulativePool: VocabEntry[] = [];
  let chosenGrid: GridState | null = null;

  for (const tier of candidateTiers) {
    cumulativePool = [...cumulativePool, ...tier];
    if (cumulativePool.length < 2) continue;

    const layout = tryBuildLayout(
      cumulativePool,
      tierConfig.targetWords,
      priorityIndex,
      rng
    );
    if (layout) {
      if (!chosenGrid || layout.words.length > chosenGrid.words.length) {
        chosenGrid = layout;
      }
      if (layout.words.length >= tierConfig.minWords) {
        chosenGrid = layout;
        break;
      }
    }
  }

  if (!chosenGrid || chosenGrid.words.length < 2) {
    throw new Error(
      `Failed to generate valid WordCross puzzle for level=${level} seed=${seed}`
    );
  }

  // Normalize coordinates so minRow = 0 and minCol = 0
  const offsetRow = chosenGrid.minRow;
  const offsetCol = chosenGrid.minCol;
  const rows = chosenGrid.maxRow - offsetRow + 1;
  const cols = chosenGrid.maxCol - offsetCol + 1;

  // Sort entries top-to-bottom, then left-to-right, across before down
  const normalizedWords = chosenGrid.words
    .map((w) => ({
      ...w,
      row: w.row - offsetRow,
      col: w.col - offsetCol,
    }))
    .sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      if (a.col !== b.col) return a.col - b.col;
      if (a.direction === b.direction) return 0;
      return a.direction === 'across' ? -1 : 1;
    });

  // Build cells map
  const cells: Record<string, WordCrossCell> = {};

  for (const w of normalizedWords) {
    const dr = w.direction === 'down' ? 1 : 0;
    const dc = w.direction === 'across' ? 1 : 0;
    for (let i = 0; i < w.word.length; i++) {
      const r = w.row + i * dr;
      const c = w.col + i * dc;
      const id = cellKey(r, c);
      if (!cells[id]) {
        cells[id] = {
          id,
          row: r,
          col: c,
          kind: 'fixed',
          solution: w.word[i],
        };
      }
    }
  }

  // Build entries with sequential 1-based clue numbers
  const entries: WordCrossEntry[] = normalizedWords.map((w, idx) => {
    const number = idx + 1;
    const dr = w.direction === 'down' ? 1 : 0;
    const dc = w.direction === 'across' ? 1 : 0;
    const cellIds: string[] = [];
    for (let i = 0; i < w.word.length; i++) {
      cellIds.push(cellKey(w.row + i * dr, w.col + i * dc));
    }
    const startCell = cells[cellIds[0]];
    if (!startCell.clueNumbers) {
      startCell.clueNumbers = [number];
    } else {
      startCell.clueNumbers.push(number);
    }
    return {
      number,
      direction: w.direction,
      row: w.row,
      col: w.col,
      length: w.word.length,
      cellIds,
      vocab: w.vocab,
    };
  });

  // Select blanks: ensure at least 1 fixed anchor letter per word at A1-B1, and >= 2 blanks total
  const allCellIds = Object.keys(cells);
  const protectedAnchors = new Set<string>();

  if (level !== 'B2C1') {
    for (const entry of entries) {
      // Check if entry already has a protected anchor
      const alreadyAnchored = entry.cellIds.some((id) =>
        protectedAnchors.has(id)
      );
      if (alreadyAnchored) continue;

      // Prefer non-intersection or intersection cell deterministically
      const shuffledEntryCells = shuffleDeterministic(entry.cellIds, rng);
      protectedAnchors.add(shuffledEntryCells[0]);
    }
  }

  const eligibleForBlank = allCellIds.filter((id) => !protectedAnchors.has(id));
  const targetBlanks = Math.max(
    2,
    Math.round(allCellIds.length * tierConfig.blankRatio)
  );
  const actualBlankCount = Math.min(eligibleForBlank.length, targetBlanks);

  const chosenBlankIds = shuffleDeterministic(eligibleForBlank, rng).slice(
    0,
    actualBlankCount
  );

  // Safety guard: guarantee at least 2 blanks even in degenerate minimal grids
  if (chosenBlankIds.length < 2) {
    const remaining = allCellIds.filter((id) => !chosenBlankIds.includes(id));
    for (const id of shuffleDeterministic(remaining, rng)) {
      if (chosenBlankIds.length >= 2) break;
      chosenBlankIds.push(id);
    }
  }

  for (const id of chosenBlankIds) {
    cells[id].kind = 'blank';
  }

  // Order blankCellIds top-to-bottom, left-to-right
  const blankCellIds = [...chosenBlankIds].sort((a, b) => {
    const ca = cells[a];
    const cb = cells[b];
    if (ca.row !== cb.row) return ca.row - cb.row;
    return ca.col - cb.col;
  });

  // Build trayLetters: exact blank solutions + distractorCount seeded uppercase letters, shuffled
  const trayPool: string[] = blankCellIds.map((id) => cells[id].solution);
  for (let i = 0; i < tierConfig.distractorCount; i++) {
    const letter = ALPHABET[Math.floor(rng() * ALPHABET.length)];
    trayPool.push(letter);
  }
  const trayLetters = shuffleDeterministic(trayPool, rng);

  return {
    id: `wc-${level}-${seed}`,
    seed,
    rows,
    cols,
    cells,
    entries,
    blankCellIds,
    trayLetters,
    level,
  };
}
