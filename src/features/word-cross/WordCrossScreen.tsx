import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Eraser,
  Heart,
  Home,
  Infinity as InfinityIcon,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Volume2,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { speechEngine } from '../../audio/speechEngine';
import { Button25D } from '../../components/Button25D';
import { Card25D } from '../../components/Card25D';
import { GameOverModal } from '../../components/GameOverModal';
import { QwertyBar25D } from '../../components/QwertyBar25D';
import { Tile25D, type Tile25DVariant } from '../../components/Tile25D';
import { VictoryModal } from '../../components/VictoryModal';
import {
  CEFR_LEVELS,
  getEffectiveLevelForEndless,
  type CefrLevel,
  type PlayConfig,
} from '../../engine/types';
import { generateWordCross } from '../../engine/wordCrossGenerator';
import { validateWordCross } from '../../engine/wordCrossValidator';
import { t, type Lang } from '../../i18n';
import { WordReviewList } from './WordReviewList';

export interface WordCrossScreenProps {
  config: PlayConfig;
  lang: Lang;
  prioritizedWordKeys: string[];
  onRecordAttempt: (
    wordIds: string[],
    level: CefrLevel,
    outcome: { correct: boolean; usedHint: boolean },
  ) => void;
  onAwardStars: (stars: number) => void;
  bestEndlessScore?: number;
  onEndlessScore?: (score: number) => void;
  onBack: () => void;
  seedOverride?: number;
}

interface TrayItem {
  trayId: string;
  letter: string;
}

interface DragTracker {
  trayId: string;
  letter: string;
  sourceCellId?: string;
  startX: number;
  startY: number;
  isDragging: boolean;
  pointerId: number;
}

interface DragVisual {
  letter: string;
  x: number;
  y: number;
}

const SESSION_LENGTH = 5;
const DRAG_THRESHOLD_PX = 6;
const MAX_EXCLUDED_WORDS = 12;

const LEVEL_STARS: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2C1: 4,
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function WordCrossScreen({
  config,
  lang,
  prioritizedWordKeys,
  onRecordAttempt,
  onAwardStars,
  bestEndlessScore = 0,
  onEndlessScore,
  onBack,
  seedOverride,
}: WordCrossScreenProps): React.JSX.Element {
  const isEndless = config.sessionMode === 'endless';
  const isQuick = config.sessionMode === 'quick';
  const isPractice = config.sessionMode === 'practice';
  const isSuperMode = config.inputMode === 'keyboard';
  const showTimer = isQuick || isEndless;
  const sessionLength = isQuick ? 1 : SESSION_LENGTH;

  const [baseSeed] = useState<number>(() => Date.now());
  const [sessionRound, setSessionRound] = useState(0);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [endlessSolved, setEndlessSolved] = useState(0);
  const [activeEndlessSolved, setActiveEndlessSolved] = useState(0);
  const [excludeWordIds, setExcludeWordIds] = useState<string[]>([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [initialBest] = useState(bestEndlessScore);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Board interaction state
  const [placements, setPlacements] = useState<Record<string, TrayItem>>({});
  const [typedValues, setTypedValues] = useState<Record<string, string>>({});
  const [selectedTrayId, setSelectedTrayId] = useState<string | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [activeEntryNumber, setActiveEntryNumber] = useState<number | null>(null);
  const [usedHint, setUsedHint] = useState(false);
  const [hintedCellIds, setHintedCellIds] = useState<Set<string>>(() => new Set());
  const [invalidCellIds, setInvalidCellIds] = useState<Set<string>>(() => new Set());
  const [shakeTick, setShakeTick] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [lastEarnedStars, setLastEarnedStars] = useState(0);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);

  const dragRef = useRef<DragTracker | null>(null);
  const suppressNextClickRef = useRef(false);
  const cleanupDragListenersRef = useRef<(() => void) | null>(null);
  const prioritizedRef = useRef(prioritizedWordKeys);
  prioritizedRef.current = prioritizedWordKeys;

  const effectiveLevel: CefrLevel = isEndless
    ? getEffectiveLevelForEndless(config.level, activeEndlessSolved)
    : config.level;

  const endlessTierBonus = isEndless
    ? Math.max(
        0,
        Math.floor(activeEndlessSolved / 5) -
          (CEFR_LEVELS.length - 1 - CEFR_LEVELS.indexOf(config.level)),
      )
    : 0;

  const puzzle = useMemo(() => {
    const effectiveSeed = (seedOverride ?? baseSeed) + sessionRound * 100 + puzzleIndex;
    return generateWordCross({
      level: effectiveLevel,
      topics: config.topics,
      seed: effectiveSeed,
      prioritizedWordKeys: prioritizedRef.current,
      excludeWordIds,
      endlessTierBonus,
    });
  }, [
    effectiveLevel,
    config.topics,
    seedOverride,
    baseSeed,
    sessionRound,
    puzzleIndex,
    excludeWordIds,
    endlessTierBonus,
  ]);

  const trayItems = useMemo<TrayItem[]>(
    () =>
      puzzle.trayLetters.map((letter, idx) => ({
        trayId: `tray-${idx}`,
        letter: letter.toUpperCase(),
      })),
    [puzzle],
  );

  const usedTrayIds = useMemo(
    () => new Set(Object.values(placements).map((item) => item.trayId)),
    [placements],
  );

  const currentLetters = useMemo<Record<string, string>>(() => {
    if (isSuperMode) {
      return typedValues;
    }
    const map: Record<string, string> = {};
    for (const [cellId, item] of Object.entries(placements)) {
      map[cellId] = item.letter;
    }
    return map;
  }, [isSuperMode, typedValues, placements]);

  const activeEntry = useMemo(() => {
    if (activeEntryNumber !== null) {
      const found = puzzle.entries.find((e) => e.number === activeEntryNumber);
      if (found) return found;
    }
    return puzzle.entries[0] ?? null;
  }, [puzzle.entries, activeEntryNumber]);

  const activeEntryCellSet = useMemo(
    () => new Set(activeEntry?.cellIds ?? []),
    [activeEntry],
  );

  const isEditableBlank = useCallback(
    (cellId: string | null | undefined): cellId is string => {
      if (!cellId) return false;
      const cell = puzzle.cells[cellId];
      if (!cell || cell.kind !== 'blank') return false;
      if (hintedCellIds.has(cellId)) return false;
      return true;
    },
    [puzzle.cells, hintedCellIds],
  );

  // Initialize activeEntryNumber and Super Mode cursor when a new puzzle loads
  useEffect(() => {
    const firstEntryWithBlank =
      puzzle.entries.find((e) =>
        e.cellIds.some((id) => puzzle.cells[id]?.kind === 'blank'),
      ) ?? puzzle.entries[0];
    setActiveEntryNumber(firstEntryWithBlank?.number ?? null);

    if (isSuperMode) {
      const firstBlank =
        firstEntryWithBlank?.cellIds.find((id) => puzzle.cells[id]?.kind === 'blank') ??
        puzzle.blankCellIds[0] ??
        null;
      setSelectedCellId(firstBlank);
    } else {
      setSelectedCellId(null);
    }
  }, [puzzle, isSuperMode]);

  // Live timer for Quick Play and Endless
  useEffect(() => {
    if (!showTimer || isSolved || isGameOver) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showTimer, isSolved, isGameOver]);

  // Cleanup drag listeners on unmount
  useEffect(() => {
    return () => {
      cleanupDragListenersRef.current?.();
    };
  }, []);

  const resetPerPuzzleState = useCallback(() => {
    setPlacements({});
    setTypedValues({});
    setSelectedTrayId(null);
    setSelectedCellId(null);
    setUsedHint(false);
    setHintedCellIds(new Set());
    setInvalidCellIds(new Set());
    setIsSolved(false);
    setShowVictory(false);
    setConfirmClearAll(false);
    setLastEarnedStars(0);
    if (isQuick) {
      setElapsedSeconds(0);
    }
  }, [isQuick]);

  const allBlanksFilled = useMemo(
    () =>
      puzzle.blankCellIds.length > 0 &&
      puzzle.blankCellIds.every((id) => (currentLetters[id] ?? '').trim().length > 0),
    [puzzle.blankCellIds, currentLetters],
  );

  const editablePlacedCount = useMemo(
    () =>
      puzzle.blankCellIds.filter(
        (id) => !hintedCellIds.has(id) && (currentLetters[id] ?? '').trim().length > 0,
      ).length,
    [puzzle.blankCellIds, hintedCellIds, currentLetters],
  );

  const findNextEditableBlank = useCallback(
    (
      afterCellId: string | null,
      valuesMap: Record<string, string>,
      hintedSet: Set<string>,
      preferUnfilled: boolean,
    ): string | null => {
      const canUse = (id: string) => {
        const cell = puzzle.cells[id];
        if (!cell || cell.kind !== 'blank' || hintedSet.has(id)) return false;
        if (preferUnfilled && (valuesMap[id] ?? '').trim().length > 0) return false;
        return true;
      };

      const entryCells = activeEntry?.cellIds ?? [];
      if (entryCells.length > 0) {
        const startIdx = afterCellId ? entryCells.indexOf(afterCellId) : -1;
        for (let i = startIdx + 1; i < entryCells.length; i++) {
          if (canUse(entryCells[i])) return entryCells[i];
        }
        for (let i = 0; i <= Math.min(startIdx, entryCells.length - 1); i++) {
          if (canUse(entryCells[i])) return entryCells[i];
        }
      }

      const globalStart = afterCellId ? puzzle.blankCellIds.indexOf(afterCellId) : -1;
      for (let i = globalStart + 1; i < puzzle.blankCellIds.length; i++) {
        if (canUse(puzzle.blankCellIds[i])) return puzzle.blankCellIds[i];
      }
      for (let i = 0; i <= Math.min(globalStart, puzzle.blankCellIds.length - 1); i++) {
        if (canUse(puzzle.blankCellIds[i])) return puzzle.blankCellIds[i];
      }
      return null;
    },
    [puzzle.cells, puzzle.blankCellIds, activeEntry],
  );

  const findPreviousEditableBlank = useCallback(
    (beforeCellId: string | null, hintedSet: Set<string>): string | null => {
      const canUse = (id: string) => {
        const cell = puzzle.cells[id];
        return Boolean(cell && cell.kind === 'blank' && !hintedSet.has(id));
      };

      const entryCells = activeEntry?.cellIds ?? [];
      if (entryCells.length > 0 && beforeCellId) {
        const idx = entryCells.indexOf(beforeCellId);
        if (idx > 0) {
          for (let i = idx - 1; i >= 0; i--) {
            if (canUse(entryCells[i])) return entryCells[i];
          }
        }
      }

      if (beforeCellId) {
        const globalIdx = puzzle.blankCellIds.indexOf(beforeCellId);
        if (globalIdx > 0) {
          for (let i = globalIdx - 1; i >= 0; i--) {
            if (canUse(puzzle.blankCellIds[i])) return puzzle.blankCellIds[i];
          }
        }
      }

      // Fallback: last editable blank in active entry or overall
      for (let i = entryCells.length - 1; i >= 0; i--) {
        if (canUse(entryCells[i])) return entryCells[i];
      }
      for (let i = puzzle.blankCellIds.length - 1; i >= 0; i--) {
        if (canUse(puzzle.blankCellIds[i])) return puzzle.blankCellIds[i];
      }
      return null;
    },
    [puzzle.cells, puzzle.blankCellIds, activeEntry],
  );

  // Super Mode: type a letter (Review Focus #5: NEVER overwrites fixed or hinted cells)
  const handleTypeLetter = useCallback(
    (rawLetter: string) => {
      if (!isSuperMode || isSolved || isGameOver) return;
      const upper = rawLetter.trim().toUpperCase();
      if (!/^[A-Z]$/.test(upper)) return;

      let targetId: string | null = isEditableBlank(selectedCellId)
        ? selectedCellId
        : findNextEditableBlank(selectedCellId, typedValues, hintedCellIds, true);

      if (!targetId) {
        targetId = findNextEditableBlank(selectedCellId, typedValues, hintedCellIds, false);
      }
      if (!targetId || !isEditableBlank(targetId)) return;

      const nextTyped = { ...typedValues, [targetId]: upper };
      setTypedValues(nextTyped);
      setInvalidCellIds(new Set());
      setConfirmClearAll(false);
      soundEngine.playPlace();

      const nextCursor = findNextEditableBlank(targetId, nextTyped, hintedCellIds, true);
      if (nextCursor) {
        setSelectedCellId(nextCursor);
      } else {
        setSelectedCellId(targetId);
      }
    },
    [
      isSuperMode,
      isSolved,
      isGameOver,
      selectedCellId,
      typedValues,
      hintedCellIds,
      isEditableBlank,
      findNextEditableBlank,
    ],
  );

  // Super Mode: Backspace (Review Focus #5: NEVER clears fixed or hinted cells)
  const handleBackspace = useCallback(() => {
    if (!isSuperMode || isSolved || isGameOver) return;

    if (isEditableBlank(selectedCellId) && (typedValues[selectedCellId] ?? '').length > 0) {
      const nextTyped = { ...typedValues };
      delete nextTyped[selectedCellId];
      setTypedValues(nextTyped);
      setInvalidCellIds(new Set());
      setConfirmClearAll(false);
      soundEngine.playPop();
      return;
    }

    const prevId = findPreviousEditableBlank(selectedCellId, hintedCellIds);
    if (!prevId || !isEditableBlank(prevId)) return;

    setSelectedCellId(prevId);
    if ((typedValues[prevId] ?? '').length > 0) {
      const nextTyped = { ...typedValues };
      delete nextTyped[prevId];
      setTypedValues(nextTyped);
      setInvalidCellIds(new Set());
      setConfirmClearAll(false);
      soundEngine.playPop();
    }
  }, [
    isSuperMode,
    isSolved,
    isGameOver,
    selectedCellId,
    typedValues,
    hintedCellIds,
    isEditableBlank,
    findPreviousEditableBlank,
  ]);

  const handleCheck = useCallback(() => {
    if (isSolved || isGameOver || !allBlanksFilled) return;

    const result = validateWordCross(puzzle, currentLetters);
    if (result.isValid) {
      const nextStreak = streak + 1;
      const earnedStars = usedHint
        ? 1
        : Math.min(5, LEVEL_STARS[effectiveLevel] + (isSuperMode ? 1 : 0));
      const isLastPuzzle = !isEndless && puzzleIndex + 1 >= sessionLength;

      setIsSolved(true);
      setShowVictory(true);
      setInvalidCellIds(new Set());
      setStreak(nextStreak);
      setLastEarnedStars(earnedStars);

      if (isEndless) {
        const nextSolved = endlessSolved + 1;
        setEndlessSolved(nextSolved);
        onEndlessScore?.(nextSolved);
      }

      if (isLastPuzzle) {
        soundEngine.playVictory();
      } else {
        soundEngine.playSuccess(nextStreak);
      }

      onRecordAttempt(
        puzzle.entries.map((e) => e.vocab.id),
        effectiveLevel,
        { correct: true, usedHint },
      );
      onAwardStars(earnedStars);
    } else {
      setInvalidCellIds(new Set(result.invalidCellIds));
      setShakeTick((prev) => prev + 1);
      setStreak(0);

      const solvedSet = new Set(result.solvedWordIds);
      const failedIds = puzzle.entries
        .map((e) => e.vocab.id)
        .filter((id) => !solvedSet.has(id));
      const reportIds =
        failedIds.length > 0 ? failedIds : puzzle.entries.map((e) => e.vocab.id);

      onRecordAttempt(reportIds, effectiveLevel, { correct: false, usedHint });

      if (isEndless) {
        const nextHearts = Math.max(0, hearts - 1);
        setHearts(nextHearts);
        if (nextHearts === 0) {
          setIsGameOver(true);
          soundEngine.playGameOver();
        } else {
          soundEngine.playError();
        }
      } else {
        soundEngine.playError();
      }
    }
  }, [
    isSolved,
    isGameOver,
    allBlanksFilled,
    puzzle,
    currentLetters,
    streak,
    usedHint,
    effectiveLevel,
    isSuperMode,
    isEndless,
    puzzleIndex,
    sessionLength,
    endlessSolved,
    hearts,
    onEndlessScore,
    onRecordAttempt,
    onAwardStars,
  ]);

  // Physical keyboard listener in Super Mode
  useEffect(() => {
    if (!isSuperMode || isSolved || isGameOver) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        handleTypeLetter(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        if (allBlanksFilled) {
          e.preventDefault();
          handleCheck();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSuperMode, isSolved, isGameOver, allBlanksFilled, handleTypeLetter, handleBackspace, handleCheck]);

  const handleSelectClue = (entryNumber: number) => {
    setActiveEntryNumber(entryNumber);
    const entry = puzzle.entries.find((e) => e.number === entryNumber);
    if (!entry) return;
    const firstEditable =
      entry.cellIds.find(
        (id) => isEditableBlank(id) && (currentLetters[id] ?? '').length === 0,
      ) ?? entry.cellIds.find((id) => isEditableBlank(id));
    if (firstEditable) {
      setSelectedCellId(firstEditable);
    }
  };

  const placeTrayItemOnCell = useCallback(
    (item: TrayItem, cellId: string, sourceCellId?: string) => {
      if (!isEditableBlank(cellId) || isSolved || isGameOver) return;
      setPlacements((prev) => {
        const next = { ...prev };
        if (sourceCellId && sourceCellId !== cellId && next[sourceCellId]) {
          const existingAtTarget = next[cellId];
          delete next[sourceCellId];
          if (existingAtTarget && isEditableBlank(sourceCellId)) {
            next[sourceCellId] = existingAtTarget;
          }
        }
        next[cellId] = item;
        return next;
      });
      setSelectedTrayId(null);
      setSelectedCellId(null);
      setInvalidCellIds(new Set());
      setConfirmClearAll(false);
      soundEngine.playPlace();
    },
    [isEditableBlank, isSolved, isGameOver],
  );

  const handleCellClick = (cellId: string) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (isSolved || isGameOver) return;

    // Review Focus #5: Fixed and hinted cells are NEVER selectable/editable
    if (!isEditableBlank(cellId)) return;

    // Update active entry if cell belongs to one
    if (!activeEntryCellSet.has(cellId)) {
      const owner = puzzle.entries.find((e) => e.cellIds.includes(cellId));
      if (owner) setActiveEntryNumber(owner.number);
    }

    if (isSuperMode) {
      setSelectedCellId(cellId);
      soundEngine.playPop();
      return;
    }

    // Standard Mode
    if (selectedTrayId) {
      const item = trayItems.find((tItem) => tItem.trayId === selectedTrayId);
      if (item && !usedTrayIds.has(item.trayId)) {
        placeTrayItemOnCell(item, cellId);
        return;
      }
    }

    if (placements[cellId]) {
      setPlacements((prev) => {
        const next = { ...prev };
        delete next[cellId];
        return next;
      });
      setInvalidCellIds(new Set());
      setConfirmClearAll(false);
      soundEngine.playPop();
      return;
    }

    setSelectedCellId((prev) => (prev === cellId ? null : cellId));
    soundEngine.playPop();
  };

  const handleTrayClick = (item: TrayItem) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (isSolved || isGameOver || usedTrayIds.has(item.trayId)) return;

    if (selectedCellId && isEditableBlank(selectedCellId)) {
      placeTrayItemOnCell(item, selectedCellId);
      return;
    }

    setSelectedTrayId((prev) => (prev === item.trayId ? null : item.trayId));
    soundEngine.playPop();
  };

  // Pointer drag-and-drop for Standard Mode (6px threshold)
  const startPointerDrag = (
    e: React.PointerEvent,
    item: TrayItem,
    sourceCellId?: string,
  ) => {
    if (isSuperMode || isSolved || isGameOver) return;
    if (!sourceCellId && usedTrayIds.has(item.trayId)) return;
    if (sourceCellId && !isEditableBlank(sourceCellId)) return;

    cleanupDragListenersRef.current?.();

    dragRef.current = {
      trayId: item.trayId,
      letter: item.letter,
      sourceCellId,
      startX: e.clientX,
      startY: e.clientY,
      isDragging: false,
      pointerId: e.pointerId,
    };

    const handleMove = (ev: PointerEvent) => {
      const tracker = dragRef.current;
      if (!tracker || ev.pointerId !== tracker.pointerId) return;
      const dx = ev.clientX - tracker.startX;
      const dy = ev.clientY - tracker.startY;
      if (!tracker.isDragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        tracker.isDragging = true;
        suppressNextClickRef.current = true;
      }
      if (tracker.isDragging) {
        setDragVisual({ letter: tracker.letter, x: ev.clientX, y: ev.clientY });
      }
    };

    const handleUp = (ev: PointerEvent) => {
      const tracker = dragRef.current;
      if (!tracker || ev.pointerId !== tracker.pointerId) return;
      cleanup();

      if (!tracker.isDragging) return;
      setDragVisual(null);

      const els =
        typeof document.elementsFromPoint === 'function'
          ? document.elementsFromPoint(ev.clientX, ev.clientY)
          : [];
      const targetEl = els.find((el) => el.getAttribute('data-cell-id'));
      const dropCellId = targetEl?.getAttribute('data-cell-id');

      if (dropCellId && isEditableBlank(dropCellId)) {
        placeTrayItemOnCell(
          { trayId: tracker.trayId, letter: tracker.letter },
          dropCellId,
          tracker.sourceCellId,
        );
      } else if (tracker.sourceCellId) {
        setPlacements((prev) => {
          const next = { ...prev };
          delete next[tracker.sourceCellId!];
          return next;
        });
        setInvalidCellIds(new Set());
        soundEngine.playPop();
      }

      setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 0);
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      dragRef.current = null;
      setDragVisual(null);
      cleanupDragListenersRef.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    cleanupDragListenersRef.current = cleanup;
  };

  const handleHint = () => {
    if (isSolved || isGameOver) return;

    const needsHint = (id: string) => {
      if (!isEditableBlank(id)) return false;
      const placed = (currentLetters[id] ?? '').toUpperCase();
      return placed !== puzzle.cells[id].solution.toUpperCase();
    };

    const entryCandidate = activeEntry?.cellIds.find(needsHint);
    const targetId = entryCandidate ?? puzzle.blankCellIds.find(needsHint);
    if (!targetId) return;

    const solution = puzzle.cells[targetId].solution.toUpperCase();
    const nextHinted = new Set(hintedCellIds);
    nextHinted.add(targetId);
    setHintedCellIds(nextHinted);
    setUsedHint(true);
    setInvalidCellIds((prev) => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });
    soundEngine.playHint();

    if (isSuperMode) {
      const nextTyped = { ...typedValues, [targetId]: solution };
      setTypedValues(nextTyped);
      if (selectedCellId === targetId) {
        const nextCursor = findNextEditableBlank(targetId, nextTyped, nextHinted, true);
        setSelectedCellId(nextCursor);
      }
    } else {
      setPlacements((prev) => {
        const next = { ...prev };
        // If targetId already had the right letter, keep it locked
        if (next[targetId]?.letter === solution) {
          return next;
        }
        const usedIds = new Set(Object.values(next).map((i) => i.trayId));
        // Find unused tray tile with matching letter
        const unusedMatch = trayItems.find(
          (i) => i.letter === solution && !usedIds.has(i.trayId),
        );
        if (unusedMatch) {
          next[targetId] = unusedMatch;
          return next;
        }
        // Otherwise pull a matching tile from another wrong editable cell
        const donorCellId = Object.keys(next).find(
          (cid) =>
            cid !== targetId &&
            !nextHinted.has(cid) &&
            next[cid].letter === solution &&
            puzzle.cells[cid]?.solution.toUpperCase() !== solution,
        );
        if (donorCellId) {
          next[targetId] = next[donorCellId];
          delete next[donorCellId];
          return next;
        }
        // Fallback synthetic locked item
        next[targetId] = { trayId: `hint-${targetId}`, letter: solution };
        return next;
      });
    }
  };

  const handleClear = () => {
    if (isSolved || isGameOver || editablePlacedCount === 0) return;

    if (editablePlacedCount >= 3 && !confirmClearAll) {
      setConfirmClearAll(true);
      soundEngine.playPop();
      return;
    }

    if (isSuperMode) {
      setTypedValues((prev) => {
        const next: Record<string, string> = {};
        for (const id of hintedCellIds) {
          if (prev[id]) next[id] = prev[id];
        }
        return next;
      });
    } else {
      setPlacements((prev) => {
        const next: Record<string, TrayItem> = {};
        for (const id of hintedCellIds) {
          if (prev[id]) next[id] = prev[id];
        }
        return next;
      });
    }
    setSelectedTrayId(null);
    setInvalidCellIds(new Set());
    setConfirmClearAll(false);
    soundEngine.playPop();
  };

  const handleNext = () => {
    const usedIds = puzzle.entries.map((e) => e.vocab.id);

    if (isQuick) {
      resetPerPuzzleState();
      setSessionRound((prev) => prev + 1);
      setPuzzleIndex(0);
      return;
    }

    if (isEndless) {
      setExcludeWordIds((prev) => [...prev, ...usedIds].slice(-MAX_EXCLUDED_WORDS));
      setActiveEndlessSolved(endlessSolved);
      resetPerPuzzleState();
      setPuzzleIndex((prev) => prev + 1);
      return;
    }

    // Practice (Study Lab 5-puzzle session)
    if (puzzleIndex + 1 >= sessionLength) {
      setExcludeWordIds((prev) => [...prev, ...usedIds].slice(-MAX_EXCLUDED_WORDS));
      resetPerPuzzleState();
      setSessionRound((prev) => prev + 1);
      setPuzzleIndex(0);
    } else {
      setExcludeWordIds((prev) => [...prev, ...usedIds].slice(-MAX_EXCLUDED_WORDS));
      resetPerPuzzleState();
      setPuzzleIndex((prev) => prev + 1);
    }
  };

  const handleRetryEndless = () => {
    setHearts(3);
    setEndlessSolved(0);
    setActiveEndlessSolved(0);
    setExcludeWordIds([]);
    setIsGameOver(false);
    setStreak(0);
    setElapsedSeconds(0);
    resetPerPuzzleState();
    setSessionRound((prev) => prev + 1);
    setPuzzleIndex(0);
  };

  const isSessionComplete = isQuick || (isPractice && puzzleIndex + 1 >= sessionLength);
  const isReviewing = isSolved && !showVictory;
  const tileSize = puzzle.cols >= 8 ? 'xs' : puzzle.cols >= 6 ? 'sm' : 'md';
  const gridMaxWidthClass =
    puzzle.cols >= 8
      ? 'max-w-[336px] sm:max-w-[400px]'
      : puzzle.cols >= 6
        ? 'max-w-[312px] sm:max-w-[376px]'
        : 'max-w-[280px] sm:max-w-[340px]';

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 pb-8 pt-3 sm:px-4">
      {/* Top HUD */}
      <header className="flex items-center justify-between gap-2 rounded-2xl bg-white/90 px-3 py-2 border-2 border-slate-200/80 border-b-[4px] border-b-slate-300/90 card-25d">
        <Button25D color="white" size="sm" onClick={onBack} className="px-2.5 py-1.5">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t(lang, 'game.back')}</span>
        </Button25D>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-extrabold text-sky-800 border border-sky-200">
            {isEndless && <InfinityIcon className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>{t(lang, `levels.${effectiveLevel}`)}</span>
          </span>

          {isSuperMode && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-extrabold text-violet-800 border border-violet-200">
              <Zap className="h-3 w-3" aria-hidden="true" />
              <span>{t(lang, 'home.superMode')}</span>
            </span>
          )}

          {isPractice && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700 border border-slate-200">
              {puzzleIndex + 1}/{sessionLength}
            </span>
          )}

          {isEndless && (
            <>
              <div
                data-testid="endless-hearts"
                data-hearts={hearts}
                aria-label={t(lang, 'game.heartsLeft', { count: hearts })}
                className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2.5 py-1 border border-rose-200"
              >
                {[0, 1, 2].map((idx) => (
                  <Heart
                    key={idx}
                    className={`h-3.5 w-3.5 ${
                      idx < hearts
                        ? 'fill-rose-500 text-rose-500'
                        : 'fill-slate-200 text-slate-300'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 border border-emerald-200">
                {t(lang, 'game.endlessScore', { count: endlessSolved })}
              </span>
            </>
          )}

          {showTimer && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700 border border-slate-200 tabular-nums">
              <Clock className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
              <span>{formatTime(elapsedSeconds)}</span>
            </span>
          )}
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800 border border-amber-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
          <span>×{streak}</span>
        </div>
      </header>

      {/* Review Mode Banner */}
      {isReviewing && (
        <div
          data-testid="review-banner"
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sky-100/95 px-4 py-3 border-2 border-sky-300 border-b-[4px] border-b-sky-400"
        >
          <span className="font-display text-sm sm:text-base font-extrabold text-sky-900">
            {t(lang, 'victory.review')}
          </span>
          <div className="flex items-center gap-2">
            <Button25D color="mint" size="sm" onClick={handleNext}>
              {isSessionComplete ? (
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {isSessionComplete
                  ? t(lang, 'victory.playAgain')
                  : t(lang, 'victory.next')}
              </span>
            </Button25D>
            <Button25D color="white" size="sm" onClick={onBack}>
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{t(lang, 'victory.home')}</span>
            </Button25D>
          </div>
        </div>
      )}

      {/* Crossword Board */}
      <Card25D className="touch-pan-y px-2.5 py-4 sm:p-5">
        <motion.div
          key={`board-shake-${shakeTick}`}
          animate={
            shakeTick > 0
              ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
              : { x: 0 }
          }
          transition={{ duration: 0.38 }}
          className={`mx-auto grid gap-1 sm:gap-1.5 ${gridMaxWidthClass}`}
          style={{
            gridTemplateColumns: `repeat(${puzzle.cols}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: puzzle.rows * puzzle.cols }).map((_, idx) => {
            const r = Math.floor(idx / puzzle.cols);
            const c = idx % puzzle.cols;
            const cellId = `${r},${c}`;
            const cell = puzzle.cells[cellId];

            if (!cell) {
              return <div key={cellId} aria-hidden="true" className="aspect-square" />;
            }

            const isHinted = hintedCellIds.has(cellId);
            const isInvalid = invalidCellIds.has(cellId);
            const isSelected = selectedCellId === cellId;
            const inActiveWord = activeEntryCellSet.has(cellId);
            const displayLetter =
              cell.kind === 'fixed'
                ? cell.solution
                : (currentLetters[cellId] ?? '');

            let variant: Tile25DVariant = 'fixed';
            if (cell.kind === 'blank') {
              if (isSolved) variant = 'valid';
              else if (isInvalid) variant = 'invalid';
              else if (isHinted) variant = 'hint';
              else if (displayLetter.length > 0) variant = 'placed';
              else variant = 'blank';
            } else if (isSolved) {
              variant = 'valid';
            }

            const placedItem = !isSuperMode ? placements[cellId] : undefined;

            return (
              <div key={cellId} className="flex items-center justify-center">
                <Tile25D
                  data-testid={`cell-${cellId}`}
                  data-cell-id={cellId}
                  data-hinted={isHinted ? 'true' : 'false'}
                  value={displayLetter}
                  variant={variant}
                  size={tileSize}
                  selected={isSelected && !isSolved}
                  clueNumber={cell.clueNumbers?.[0]}
                  onClick={() => handleCellClick(cellId)}
                  onPointerDown={
                    placedItem && !isHinted
                      ? (e) => startPointerDrag(e, placedItem, cellId)
                      : undefined
                  }
                  className={[
                    '!w-full !h-auto aspect-square',
                    inActiveWord && !isSelected && !isSolved
                      ? 'ring-2 ring-sky-300/80'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              </div>
            );
          })}
        </motion.div>
      </Card25D>

      {/* Clues Panel (hidden during Review Mode since WordReviewList shows full cards) */}
      {!isReviewing && (
        <Card25D data-testid="word-cross-clues" className="p-3.5 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-slate-600">
              {t(lang, 'game.clues')}
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {isSuperMode
                ? t(lang, 'game.superModeHint')
                : t(lang, 'game.trayHint')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {puzzle.entries.map((entry) => {
              const isActive = activeEntry?.number === entry.number;
              const clueText = lang === 'vi' ? entry.vocab.vi : entry.vocab.en;
              const arrow = entry.direction === 'across' ? '→' : '↓';
              return (
                <div
                  key={`${entry.number}-${entry.direction}`}
                  onClick={() => handleSelectClue(entry.number)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectClue(entry.number);
                    }
                  }}
                  className={[
                    'flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer border-2',
                    isActive
                      ? 'bg-sky-50 border-sky-300 text-sky-950'
                      : 'bg-slate-50/80 border-slate-200/70 text-slate-700 hover:bg-slate-100/80',
                  ].join(' ')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md bg-sky-500 px-1.5 py-0.5 text-[11px] font-extrabold text-white">
                        {entry.number} {arrow}
                      </span>
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-extrabold text-violet-700">
                        {entry.vocab.pos}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs sm:text-sm font-bold">
                      {clueText}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label={`${t(lang, 'game.listen')} ${entry.number}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      speechEngine.speak(entry.vocab.word);
                    }}
                    className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white hover:bg-sky-100 text-sky-600 border border-slate-200 border-b-[3px] border-b-slate-300 cursor-pointer active:translate-y-[1px]"
                  >
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card25D>
      )}

      {/* Gameplay Controls (hidden during Review Mode) */}
      {!isReviewing && (
        <>
          {/* Action Bar */}
          <div className="grid grid-cols-3 gap-2">
            <Button25D
              color="sunny"
              size="md"
              onClick={handleHint}
              disabled={isSolved || isGameOver}
              className="px-3"
            >
              <Lightbulb className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t(lang, 'game.hint')}</span>
            </Button25D>

            <Button25D
              color={confirmClearAll ? 'coral' : 'white'}
              size="md"
              onClick={handleClear}
              disabled={isSolved || isGameOver || editablePlacedCount === 0}
              className="px-3"
            >
              <Eraser className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {confirmClearAll
                  ? t(lang, 'game.confirmClear')
                  : t(lang, 'game.clear')}
              </span>
            </Button25D>

            <Button25D
              color="mint"
              size="md"
              onClick={handleCheck}
              disabled={isSolved || isGameOver || !allBlanksFilled}
              className="px-3"
            >
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t(lang, 'game.check')}</span>
            </Button25D>
          </div>

          {/* Standard Mode: Letter Tray */}
          {!isSuperMode && (
            <Card25D data-testid="word-cross-tray" className="p-3.5">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {trayItems.map((item) => {
                  const isUsed = usedTrayIds.has(item.trayId);
                  return (
                    <Tile25D
                      key={item.trayId}
                      data-used={isUsed ? 'true' : 'false'}
                      value={item.letter}
                      variant="tray"
                      size="sm"
                      selected={selectedTrayId === item.trayId}
                      disabled={isUsed || isSolved || isGameOver}
                      onClick={() => handleTrayClick(item)}
                      onPointerDown={(e) => startPointerDrag(e, item)}
                      className={isUsed ? 'opacity-25 scale-90' : ''}
                    />
                  );
                })}
              </div>
            </Card25D>
          )}

          {/* Super Mode: On-screen QWERTY bar */}
          {isSuperMode && (
            <Card25D className="p-2.5 sm:p-3">
              <QwertyBar25D
                onKey={handleTypeLetter}
                onBackspace={handleBackspace}
                onSubmit={allBlanksFilled ? handleCheck : undefined}
                disabled={isSolved || isGameOver}
              />
            </Card25D>
          )}
        </>
      )}

      {/* Review Mode: Vocabulary Review List */}
      {isReviewing && (
        <WordReviewList
          entries={puzzle.entries.map((e) => e.vocab)}
          lang={lang}
        />
      )}

      {/* Floating Drag Ghost */}
      {dragVisual && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragVisual.x, top: dragVisual.y }}
        >
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-amber-950 font-display text-xl font-extrabold border-2 border-amber-500 border-b-[5px] shadow-2xl scale-110">
            {dragVisual.letter}
          </div>
        </div>
      )}

      {/* Victory Modal */}
      <VictoryModal
        open={showVictory}
        stars={lastEarnedStars}
        streak={streak}
        elapsedSeconds={showTimer ? elapsedSeconds : undefined}
        lang={lang}
        onNext={handleNext}
        onReview={() => setShowVictory(false)}
        onHome={onBack}
        isSessionComplete={isSessionComplete}
      />

      {/* Game Over Modal (Endless) */}
      <GameOverModal
        open={isGameOver}
        lang={lang}
        puzzlesCleared={endlessSolved}
        bestScore={Math.max(initialBest, bestEndlessScore, endlessSolved)}
        isNewRecord={endlessSolved > initialBest && endlessSolved > 0}
        onRetry={handleRetryEndless}
        onHome={onBack}
      />
    </div>
  );
}
