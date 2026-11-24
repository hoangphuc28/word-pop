import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eraser,
  Home,
  Lightbulb,
  MessageSquareQuote,
  RotateCcw,
  Sparkles,
  Volume2,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { speechEngine } from '../../audio/speechEngine';
import { Button25D } from '../../components/Button25D';
import { Card25D } from '../../components/Card25D';
import { QwertyBar25D } from '../../components/QwertyBar25D';
import { Tile25D, type Tile25DVariant } from '../../components/Tile25D';
import { VictoryModal } from '../../components/VictoryModal';
import { generateSentencePop } from '../../engine/sentencePopGenerator';
import type { CefrLevel, PlayConfig } from '../../engine/types';
import { t, type Lang } from '../../i18n';
import { WordReviewList } from '../word-cross/WordReviewList';

export interface SentencePopScreenProps {
  config: PlayConfig;
  lang: Lang;
  prioritizedWordKeys: string[];
  onRecordAttempt: (
    wordIds: string[],
    level: CefrLevel,
    outcome: { correct: boolean; usedHint: boolean },
  ) => void;
  onAwardStars: (stars: number) => void;
  onBack: () => void;
  seedOverride?: number;
}

const SESSION_LENGTH = 5;
const MAX_EXCLUDED_WORDS = 12;

const LEVEL_STARS: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2C1: 4,
};

export function SentencePopScreen({
  config,
  lang,
  prioritizedWordKeys,
  onRecordAttempt,
  onAwardStars,
  onBack,
  seedOverride,
}: SentencePopScreenProps): React.JSX.Element {
  const isSuperMode = config.inputMode === 'keyboard';

  const [baseSeed] = useState<number>(() => Date.now());
  const [sessionRound, setSessionRound] = useState(0);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [streak, setStreak] = useState(0);
  const [excludeWordIds, setExcludeWordIds] = useState<string[]>([]);

  // Standard Mode state
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [eliminatedChoices, setEliminatedChoices] = useState<Set<string>>(() => new Set());

  // Super Mode state
  const [typedLetters, setTypedLetters] = useState<Record<number, string>>({});
  const [hintedIndices, setHintedIndices] = useState<Set<number>>(() => new Set());
  const [cursorIndex, setCursorIndex] = useState<number>(0);

  // Shared puzzle state
  const [usedHint, setUsedHint] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [shakeTick, setShakeTick] = useState(0);
  const [isSolved, setIsSolved] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [lastEarnedStars, setLastEarnedStars] = useState(0);

  const prioritizedRef = useRef(prioritizedWordKeys);
  prioritizedRef.current = prioritizedWordKeys;

  const puzzle = useMemo(() => {
    const effectiveSeed = (seedOverride ?? baseSeed) + sessionRound * 100 + puzzleIndex;
    return generateSentencePop({
      level: config.level,
      topics: config.topics,
      seed: effectiveSeed,
      prioritizedWordKeys: prioritizedRef.current,
      excludeWordIds,
    });
  }, [config.level, config.topics, seedOverride, baseSeed, sessionRound, puzzleIndex, excludeWordIds]);

  const targetUpper = puzzle.vocab.word.toUpperCase();
  const targetLength = targetUpper.length;

  const resetPerPuzzleState = useCallback(() => {
    setSelectedChoice(null);
    setEliminatedChoices(new Set());
    setTypedLetters({});
    setHintedIndices(new Set());
    setCursorIndex(0);
    setUsedHint(false);
    setIsInvalid(false);
    setIsSolved(false);
    setShowVictory(false);
    setLastEarnedStars(0);
  }, []);

  const allSuperLettersFilled = useMemo(() => {
    for (let i = 0; i < targetLength; i++) {
      if ((typedLetters[i] ?? '').trim().length === 0) return false;
    }
    return targetLength > 0;
  }, [targetLength, typedLetters]);

  const canCheck = isSuperMode ? allSuperLettersFilled : selectedChoice !== null;

  const hasClearableInput = useMemo(() => {
    if (!isSuperMode) return selectedChoice !== null;
    for (let i = 0; i < targetLength; i++) {
      if (!hintedIndices.has(i) && (typedLetters[i] ?? '').length > 0) return true;
    }
    return false;
  }, [isSuperMode, selectedChoice, targetLength, hintedIndices, typedLetters]);

  const findNextEditableIndex = useCallback(
    (
      afterIdx: number,
      letters: Record<number, string>,
      hinted: Set<number>,
      preferUnfilled: boolean,
    ): number | null => {
      const canUse = (i: number) => {
        if (i < 0 || i >= targetLength || hinted.has(i)) return false;
        if (preferUnfilled && (letters[i] ?? '').length > 0) return false;
        return true;
      };
      for (let i = afterIdx + 1; i < targetLength; i++) {
        if (canUse(i)) return i;
      }
      for (let i = 0; i <= Math.min(afterIdx, targetLength - 1); i++) {
        if (canUse(i)) return i;
      }
      return null;
    },
    [targetLength],
  );

  const findPrevEditableIndex = useCallback(
    (beforeIdx: number, hinted: Set<number>): number | null => {
      for (let i = beforeIdx - 1; i >= 0; i--) {
        if (!hinted.has(i)) return i;
      }
      return null;
    },
    [],
  );

  // Super Mode: type a letter (protects hinted indices)
  const handleTypeLetter = useCallback(
    (rawLetter: string) => {
      if (!isSuperMode || isSolved) return;
      const upper = rawLetter.trim().toUpperCase();
      if (!/^[A-Z]$/.test(upper)) return;

      let targetIdx: number | null =
        cursorIndex >= 0 && cursorIndex < targetLength && !hintedIndices.has(cursorIndex)
          ? cursorIndex
          : findNextEditableIndex(cursorIndex, typedLetters, hintedIndices, true);

      if (targetIdx === null) {
        targetIdx = findNextEditableIndex(cursorIndex, typedLetters, hintedIndices, false);
      }
      if (targetIdx === null || hintedIndices.has(targetIdx)) return;

      const nextLetters = { ...typedLetters, [targetIdx]: upper };
      setTypedLetters(nextLetters);
      setIsInvalid(false);
      soundEngine.playPlace();

      const nextCursor = findNextEditableIndex(targetIdx, nextLetters, hintedIndices, true);
      if (nextCursor !== null) {
        setCursorIndex(nextCursor);
      } else {
        setCursorIndex(targetIdx);
      }
    },
    [
      isSuperMode,
      isSolved,
      cursorIndex,
      targetLength,
      hintedIndices,
      typedLetters,
      findNextEditableIndex,
    ],
  );

  // Super Mode: Backspace (protects hinted indices)
  const handleBackspace = useCallback(() => {
    if (!isSuperMode || isSolved) return;

    if (
      cursorIndex >= 0 &&
      cursorIndex < targetLength &&
      !hintedIndices.has(cursorIndex) &&
      (typedLetters[cursorIndex] ?? '').length > 0
    ) {
      const nextLetters = { ...typedLetters };
      delete nextLetters[cursorIndex];
      setTypedLetters(nextLetters);
      setIsInvalid(false);
      soundEngine.playPop();
      return;
    }

    const prevIdx = findPrevEditableIndex(cursorIndex, hintedIndices);
    if (prevIdx === null || hintedIndices.has(prevIdx)) return;

    setCursorIndex(prevIdx);
    if ((typedLetters[prevIdx] ?? '').length > 0) {
      const nextLetters = { ...typedLetters };
      delete nextLetters[prevIdx];
      setTypedLetters(nextLetters);
      setIsInvalid(false);
      soundEngine.playPop();
    }
  }, [isSuperMode, isSolved, cursorIndex, targetLength, hintedIndices, typedLetters, findPrevEditableIndex]);

  const handleCheck = useCallback(() => {
    if (isSolved || !canCheck) return;

    const isCorrect = isSuperMode
      ? Array.from({ length: targetLength }, (_, i) => (typedLetters[i] ?? '').toUpperCase()).join('') ===
        targetUpper
      : selectedChoice?.toLowerCase() === puzzle.vocab.word.toLowerCase();

    if (isCorrect) {
      const nextStreak = streak + 1;
      const earnedStars = usedHint
        ? 1
        : Math.min(5, LEVEL_STARS[puzzle.level] + (isSuperMode ? 1 : 0));
      const isLastPuzzle = puzzleIndex + 1 >= SESSION_LENGTH;

      setIsSolved(true);
      setShowVictory(true);
      setIsInvalid(false);
      setStreak(nextStreak);
      setLastEarnedStars(earnedStars);

      if (isLastPuzzle) {
        soundEngine.playVictory();
      } else {
        soundEngine.playSuccess(nextStreak);
      }

      onRecordAttempt([puzzle.vocab.id], puzzle.level, {
        correct: true,
        usedHint,
      });
      onAwardStars(earnedStars);
    } else {
      setIsInvalid(true);
      setShakeTick((prev) => prev + 1);
      setStreak(0);
      soundEngine.playError();
      onRecordAttempt([puzzle.vocab.id], puzzle.level, {
        correct: false,
        usedHint,
      });
    }
  }, [
    isSolved,
    canCheck,
    isSuperMode,
    targetLength,
    typedLetters,
    targetUpper,
    selectedChoice,
    puzzle,
    streak,
    usedHint,
    puzzleIndex,
    onRecordAttempt,
    onAwardStars,
  ]);

  // Keyboard listener (Super Mode typing + Enter to Check in both modes)
  useEffect(() => {
    if (isSolved) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isSuperMode) {
        if (/^[a-zA-Z]$/.test(e.key)) {
          e.preventDefault();
          handleTypeLetter(e.key);
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          handleBackspace();
          return;
        }
      }
      if (e.key === 'Enter' && canCheck) {
        e.preventDefault();
        handleCheck();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSolved, isSuperMode, canCheck, handleTypeLetter, handleBackspace, handleCheck]);

  const handleSelectChip = (choice: string) => {
    if (isSolved || eliminatedChoices.has(choice)) return;
    setSelectedChoice((prev) => (prev === choice ? null : choice));
    setIsInvalid(false);
    soundEngine.playPlace();
  };

  const handleHint = () => {
    if (isSolved) return;

    if (!isSuperMode) {
      const targetLower = puzzle.vocab.word.toLowerCase();
      const remainingWrong = puzzle.choices.filter(
        (c) => c.toLowerCase() !== targetLower && !eliminatedChoices.has(c),
      );
      if (remainingWrong.length === 0) return;

      const toEliminate = remainingWrong.slice(0, 2);
      const nextEliminated = new Set(eliminatedChoices);
      for (const item of toEliminate) {
        nextEliminated.add(item);
      }
      setEliminatedChoices(nextEliminated);
      if (selectedChoice && nextEliminated.has(selectedChoice)) {
        setSelectedChoice(null);
      }
      setUsedHint(true);
      setIsInvalid(false);
      soundEngine.playHint();
      return;
    }

    // Super Mode: reveal next unrevealed (or wrong) letter and lock it
    let revealIdx: number | null = null;
    for (let i = 0; i < targetLength; i++) {
      if (!hintedIndices.has(i) && (typedLetters[i] ?? '').toUpperCase() !== targetUpper[i]) {
        revealIdx = i;
        break;
      }
    }
    if (revealIdx === null) return;

    const nextHinted = new Set(hintedIndices);
    nextHinted.add(revealIdx);
    const nextLetters = { ...typedLetters, [revealIdx]: targetUpper[revealIdx] };
    setHintedIndices(nextHinted);
    setTypedLetters(nextLetters);
    setUsedHint(true);
    setIsInvalid(false);
    soundEngine.playHint();

    if (cursorIndex === revealIdx) {
      const nextCursor = findNextEditableIndex(revealIdx, nextLetters, nextHinted, true);
      if (nextCursor !== null) setCursorIndex(nextCursor);
    }
  };

  const handleClear = () => {
    if (isSolved || !hasClearableInput) return;
    if (!isSuperMode) {
      setSelectedChoice(null);
    } else {
      setTypedLetters((prev) => {
        const next: Record<number, string> = {};
        for (const idx of hintedIndices) {
          if (prev[idx]) next[idx] = prev[idx];
        }
        return next;
      });
      const firstEditable = findNextEditableIndex(-1, {}, hintedIndices, true);
      if (firstEditable !== null) setCursorIndex(firstEditable);
    }
    setIsInvalid(false);
    soundEngine.playPop();
  };

  const handleNext = () => {
    const nextExcluded = [...excludeWordIds, puzzle.vocab.id].slice(-MAX_EXCLUDED_WORDS);
    setExcludeWordIds(nextExcluded);
    resetPerPuzzleState();
    if (puzzleIndex + 1 >= SESSION_LENGTH) {
      setSessionRound((prev) => prev + 1);
      setPuzzleIndex(0);
    } else {
      setPuzzleIndex((prev) => prev + 1);
    }
  };

  const isSessionComplete = puzzleIndex + 1 >= SESSION_LENGTH;
  const isReviewing = isSolved && !showVictory;
  const clueText = lang === 'vi' ? puzzle.vocab.exampleVi : puzzle.vocab.en;
  const boxSize = targetLength >= 8 ? 'xs' : targetLength >= 6 ? 'sm' : 'md';

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 pb-8 pt-3 sm:px-4">
      {/* Top HUD */}
      <header className="flex items-center justify-between gap-2 rounded-2xl bg-white/90 px-3 py-2 border-2 border-slate-200/80 border-b-[4px] border-b-slate-300/90 card-25d">
        <Button25D color="white" size="sm" onClick={onBack} className="px-2.5 py-1.5">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t(lang, 'game.back')}</span>
        </Button25D>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200">
            <MessageSquareQuote className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t(lang, 'home.sentencePop')}</span>
          </span>

          <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-extrabold text-sky-800 border border-sky-200">
            {t(lang, `levels.${puzzle.level}`)}
          </span>

          {isSuperMode && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-extrabold text-violet-800 border border-violet-200">
              <Zap className="h-3 w-3" aria-hidden="true" />
              <span>{t(lang, 'home.superMode')}</span>
            </span>
          )}

          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-700 border border-slate-200">
            {puzzleIndex + 1}/{SESSION_LENGTH}
          </span>
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

      {/* Sentence Card */}
      <Card25D className="touch-pan-y px-4 py-5 sm:p-6">
        <motion.div
          key={`sentence-shake-${shakeTick}`}
          animate={
            shakeTick > 0
              ? { x: [0, -8, 8, -6, 6, -3, 3, 0] }
              : { x: 0 }
          }
          transition={{ duration: 0.38 }}
        >
          {/* Sentence with inline 2.5D slot */}
          <div className="text-center font-display text-xl sm:text-2xl font-bold leading-relaxed text-slate-800">
            <span>{puzzle.sentenceBefore}</span>

            {!isSuperMode ? (
              <span className="mx-1.5 inline-block align-middle">
                <Tile25D
                  data-testid="sentence-slot"
                  data-invalid={isInvalid ? 'true' : 'false'}
                  shape="chip"
                  size="sm"
                  value={isSolved ? puzzle.vocab.word : (selectedChoice ?? '_____')}
                  variant={
                    isSolved
                      ? 'valid'
                      : isInvalid
                        ? 'invalid'
                        : selectedChoice
                          ? 'placed'
                          : 'blank'
                  }
                  onClick={() => {
                    if (isSolved || !selectedChoice) return;
                    setSelectedChoice(null);
                    setIsInvalid(false);
                    soundEngine.playPop();
                  }}
                />
              </span>
            ) : (
              <span className="mx-1.5 inline-flex flex-wrap items-center justify-center gap-1 align-middle">
                {Array.from({ length: targetLength }).map((_, idx) => {
                  const isHinted = hintedIndices.has(idx);
                  const letter = isSolved
                    ? targetUpper[idx]
                    : (typedLetters[idx] ?? '');
                  const variant: Tile25DVariant = isSolved
                    ? 'valid'
                    : isInvalid
                      ? 'invalid'
                      : isHinted
                        ? 'hint'
                        : letter.length > 0
                          ? 'placed'
                          : 'blank';

                  return (
                    <Tile25D
                      key={idx}
                      data-testid={`letter-box-${idx}`}
                      data-hinted={isHinted ? 'true' : 'false'}
                      value={letter}
                      variant={variant}
                      size={boxSize}
                      selected={!isSolved && !isHinted && cursorIndex === idx}
                      onClick={() => {
                        if (isSolved || isHinted) return;
                        setCursorIndex(idx);
                        soundEngine.playPop();
                      }}
                    />
                  );
                })}
              </span>
            )}

            <span>{puzzle.sentenceAfter}</span>
          </div>

          {/* Bilingual clue + POS badge + Listen button */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50/90 border border-slate-200/80 px-3.5 py-2.5">
            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-extrabold text-violet-700 border border-violet-200">
                {puzzle.vocab.pos}
              </span>
              <p className="text-sm font-bold text-slate-700">{clueText}</p>
            </div>

            <button
              type="button"
              data-testid="sentence-listen-btn"
              aria-label={t(lang, 'game.listen')}
              onClick={() =>
                speechEngine.speak(isSolved ? puzzle.vocab.example : puzzle.vocab.word)
              }
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white px-3 py-1.5 text-xs font-extrabold border-2 border-sky-600 border-b-[4px] border-b-sky-700 bevel-25d cursor-pointer active:translate-y-[2px] active:border-b-2 transition-all"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              <span>{t(lang, 'game.listen')}</span>
            </button>
          </div>
        </motion.div>
      </Card25D>

      {/* Gameplay Controls (hidden in Review Mode) */}
      {!isReviewing && (
        <>
          {/* Action Bar */}
          <div className="grid grid-cols-3 gap-2">
            <Button25D
              color="sunny"
              size="md"
              onClick={handleHint}
              disabled={isSolved}
              className="px-3"
            >
              <Lightbulb className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t(lang, 'game.hint')}</span>
            </Button25D>

            <Button25D
              color="white"
              size="md"
              onClick={handleClear}
              disabled={isSolved || !hasClearableInput}
              className="px-3"
            >
              <Eraser className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t(lang, 'game.clear')}</span>
            </Button25D>

            <Button25D
              color="mint"
              size="md"
              onClick={handleCheck}
              disabled={isSolved || !canCheck}
              className="px-3"
            >
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t(lang, 'game.check')}</span>
            </Button25D>
          </div>

          {/* Standard Mode: Word Choices */}
          {!isSuperMode && (
            <Card25D data-testid="sentence-pop-choices" className="p-4">
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {puzzle.choices.map((choice) => {
                  const isEliminated = eliminatedChoices.has(choice);
                  const isSelected = selectedChoice === choice;
                  return (
                    <Tile25D
                      key={choice}
                      shape="chip"
                      size="md"
                      value={choice}
                      variant="tray"
                      selected={isSelected}
                      disabled={isEliminated || isSolved}
                      onClick={() => handleSelectChip(choice)}
                      className={isEliminated ? 'opacity-30 line-through' : ''}
                    />
                  );
                })}
              </div>
            </Card25D>
          )}

          {/* Super Mode: QWERTY bar */}
          {isSuperMode && (
            <Card25D className="p-2.5 sm:p-3">
              <QwertyBar25D
                onKey={handleTypeLetter}
                onBackspace={handleBackspace}
                onSubmit={canCheck ? handleCheck : undefined}
                disabled={isSolved}
              />
            </Card25D>
          )}
        </>
      )}

      {/* Review Mode: Vocabulary Review List */}
      {isReviewing && (
        <WordReviewList entries={[puzzle.vocab]} lang={lang} />
      )}

      {/* Victory Modal */}
      <VictoryModal
        open={showVictory}
        stars={lastEarnedStars}
        streak={streak}
        lang={lang}
        onNext={handleNext}
        onReview={() => setShowVictory(false)}
        onHome={onBack}
        isSessionComplete={isSessionComplete}
      />
    </div>
  );
}
