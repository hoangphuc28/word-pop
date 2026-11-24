import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Flame,
  Headphones,
  Home,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { speechEngine } from '../../audio/speechEngine';
import { Button25D } from '../../components/Button25D';
import { Card25D } from '../../components/Card25D';
import { VictoryModal } from '../../components/VictoryModal';
import {
  generatePopMatch,
  shuffleWithSeed,
} from '../../engine/popMatchGenerator';
import type { CefrLevel, PlayConfig, VocabEntry } from '../../engine/types';
import { t, type Lang } from '../../i18n';
import { WordReviewList } from '../word-cross/WordReviewList';

export interface PopMatchScreenProps {
  config: PlayConfig;
  lang: Lang;
  prioritizedWordKeys: string[];
  onRecordAttempt: (
    wordIds: string[],
    level: CefrLevel,
    outcome: { correct: boolean; usedHint: boolean }
  ) => void;
  onAwardStars: (stars: number) => void;
  onBack: () => void;
  seedOverride?: number;
}

const WAVE_SIZE = 5;
const DEFAULT_PAIR_COUNT = 10;

export function PopMatchScreen({
  config,
  lang,
  prioritizedWordKeys,
  onRecordAttempt,
  onAwardStars,
  onBack,
  seedOverride,
}: PopMatchScreenProps): React.JSX.Element {
  const isAudioSuperMode = config.inputMode === 'keyboard';
  const [baseSeed] = useState<number>(() => Date.now());
  const [roundIndex, setRoundIndex] = useState(0);
  const [excludeWordIds, setExcludeWordIds] = useState<string[]>([]);

  const prioritizedRef = useRef(prioritizedWordKeys);
  prioritizedRef.current = prioritizedWordKeys;

  const session = useMemo(() => {
    const seed = (seedOverride ?? baseSeed) + roundIndex * 97;
    return generatePopMatch({
      level: config.level,
      topics: config.topics,
      seed,
      pairCount: DEFAULT_PAIR_COUNT,
      prioritizedWordKeys: prioritizedRef.current,
      excludeWordIds,
      customPool: config.customWords,
    });
  }, [
    config.level,
    config.topics,
    config.customWords,
    seedOverride,
    baseSeed,
    roundIndex,
    excludeWordIds,
  ]);

  const waves = useMemo(() => {
    const result: VocabEntry[][] = [];
    for (let i = 0; i < session.entries.length; i += WAVE_SIZE) {
      result.push(session.entries.slice(i, i + WAVE_SIZE));
    }
    return result;
  }, [session.entries]);

  const [waveIndex, setWaveIndex] = useState(0);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(() => new Set());
  const [poppingIds, setPoppingIds] = useState<Set<string>>(() => new Set());
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);
  const [hintedId, setHintedId] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [usedHint, setUsedHint] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [lastEarnedStars, setLastEarnedStars] = useState(0);

  const currentWave = waves[waveIndex] ?? [];

  const leftCards = useMemo(
    () => shuffleWithSeed(currentWave, session.seed + waveIndex * 31 + 11),
    [currentWave, session.seed, waveIndex]
  );

  const rightCards = useMemo(
    () => shuffleWithSeed(currentWave, session.seed + waveIndex * 53 + 29),
    [currentWave, session.seed, waveIndex]
  );

  const totalPairs = session.entries.length;
  const totalMatched = matchedIds.size;
  const progressPct = totalPairs > 0 ? Math.round((totalMatched / totalPairs) * 100) : 0;

  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const speakEntry = useCallback((entry: VocabEntry) => {
    if (entry.audioUrl) {
      speechEngine.speak(entry.word, entry.audioUrl);
    } else {
      speechEngine.speak(entry.word);
    }
  }, []);

  const evaluatePair = useCallback(
    (leftId: string, rightId: string) => {
      if (leftId === rightId) {
        // MATCH!
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setBestCombo((prev) => Math.max(prev, nextCombo));
        setSelectedLeftId(null);
        setSelectedRightId(null);
        setWrongPair(null);
        if (hintedId === leftId) setHintedId(null);

        soundEngine.playCombo(nextCombo);
        const entry = currentWave.find((e) => e.id === leftId);
        if (entry && !isAudioSuperMode) {
          speakEntry(entry);
        }

        setPoppingIds((prev) => new Set(prev).add(leftId));

        const nextMatched = new Set(matchedIds);
        nextMatched.add(leftId);
        setMatchedIds(nextMatched);

        const waveDone = currentWave.every((e) => nextMatched.has(e.id));
        const allDone = nextMatched.size >= totalPairs;

        const timer = setTimeout(() => {
          setPoppingIds((prev) => {
            const copy = new Set(prev);
            copy.delete(leftId);
            return copy;
          });

          if (allDone) {
            const earnedStars =
              !usedHint && mistakes === 0
                ? 3
                : (usedHint && mistakes === 0) || (!usedHint && mistakes === 1)
                  ? 2
                  : 1;
            setLastEarnedStars(earnedStars);
            setIsComplete(true);
            setShowVictory(true);
            soundEngine.playVictory(earnedStars);
            onAwardStars(earnedStars);
            onRecordAttempt(
              session.entries.map((e) => e.id),
              config.level,
              { correct: true, usedHint }
            );
          } else if (waveDone && waveIndex + 1 < waves.length) {
            setWaveIndex((prev) => prev + 1);
            setSelectedLeftId(null);
            setSelectedRightId(null);
            setHintedId(null);
          }
        }, 260);
        timersRef.current.push(timer);
      } else {
        // MISMATCH
        soundEngine.playError();
        setCombo(0);
        setMistakes((prev) => prev + 1);
        setWrongPair({ left: leftId, right: rightId });
        setSelectedLeftId(null);
        setSelectedRightId(null);

        const timer = setTimeout(() => {
          setWrongPair(null);
        }, 420);
        timersRef.current.push(timer);
      }
    },
    [
      combo,
      currentWave,
      hintedId,
      isAudioSuperMode,
      matchedIds,
      mistakes,
      onAwardStars,
      onRecordAttempt,
      session.entries,
      speakEntry,
      totalPairs,
      usedHint,
      waveIndex,
      waves.length,
      config.level,
    ]
  );

  function handleSelectLeft(entry: VocabEntry): void {
    if (matchedIds.has(entry.id) || isComplete) return;
    soundEngine.playPop();
    speakEntry(entry);

    if (selectedLeftId === entry.id) {
      setSelectedLeftId(null);
      return;
    }

    if (selectedRightId) {
      evaluatePair(entry.id, selectedRightId);
    } else {
      setSelectedLeftId(entry.id);
      setWrongPair(null);
    }
  }

  function handleSelectRight(entry: VocabEntry): void {
    if (matchedIds.has(entry.id) || isComplete) return;
    soundEngine.playPop();

    if (selectedRightId === entry.id) {
      setSelectedRightId(null);
      return;
    }

    if (selectedLeftId) {
      evaluatePair(selectedLeftId, entry.id);
    } else {
      setSelectedRightId(entry.id);
      setWrongPair(null);
    }
  }

  function handleHint(): void {
    if (isComplete) return;
    const unmatched = currentWave.find((e) => !matchedIds.has(e.id));
    if (!unmatched) return;
    soundEngine.playHint();
    speakEntry(unmatched);
    setUsedHint(true);
    setHintedId(unmatched.id);
    setSelectedLeftId(unmatched.id);
    setSelectedRightId(null);
  }

  function handleNextRound(): void {
    clearTimers();
    soundEngine.playPop();
    setExcludeWordIds((prev) =>
      [...prev, ...session.entries.map((e) => e.id)].slice(-20)
    );
    setWaveIndex(0);
    setMatchedIds(new Set());
    setPoppingIds(new Set());
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setWrongPair(null);
    setHintedId(null);
    setCombo(0);
    setBestCombo(0);
    setMistakes(0);
    setUsedHint(false);
    setIsComplete(false);
    setShowVictory(false);
    setRoundIndex((prev) => prev + 1);
  }

  const isReviewing = isComplete && !showVictory;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3.5 px-3 pb-8 pt-3 sm:px-5">
      {/* Top HUD */}
      <header className="flex items-center justify-between gap-2 rounded-2xl bg-white/95 px-3 py-2 border-2 border-amber-200/80 border-b-[4px] border-b-amber-300/80 card-25d">
        <Button25D
          color="white"
          size="sm"
          onClick={() => {
            soundEngine.playPop();
            speechEngine.stop();
            onBack();
          }}
          className="px-2.5 py-1.5"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t(lang, 'game.back')}</span>
        </Button25D>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-extrabold text-rose-800 border border-rose-200">
            <span>
              {config.deckName ?? t(lang, `levels.${config.level}`)}
            </span>
          </span>

          {isAudioSuperMode && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-extrabold text-violet-800 border border-violet-200">
              <Headphones className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(lang, 'home.superMode')}</span>
            </span>
          )}

          <span
            data-testid="pop-match-progress"
            className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-extrabold text-amber-900 border border-amber-200 tabular-nums"
          >
            {totalMatched}/{totalPairs}
          </span>
        </div>

        <motion.div
          key={`combo-${combo}`}
          initial={combo > 0 ? { scale: 1.3 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          data-testid="pop-match-combo"
          className={[
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold border',
            combo >= 3
              ? 'bg-gradient-to-r from-[#FF7A59] to-[#F43F5E] text-white border-rose-600 shadow-xs'
              : 'bg-amber-100 text-amber-800 border-amber-300',
          ].join(' ')}
        >
          <Flame className="h-3.5 w-3.5" aria-hidden="true" />
          <span>×{combo}</span>
        </motion.div>
      </header>

      {/* Progress Bar */}
      <div className="h-3 w-full overflow-hidden rounded-full border-2 border-amber-200 bg-white/90 p-0.5 shadow-inner">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-[#FF7A59] via-[#F43F5E] to-[#8B5CF6]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>

      {/* Review Mode Banner */}
      {isReviewing && (
        <div
          data-testid="review-banner"
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-violet-100/95 px-4 py-3 border-2 border-violet-300 border-b-[4px] border-b-violet-400"
        >
          <span className="font-display text-sm sm:text-base font-extrabold text-violet-950">
            {t(lang, 'victory.review')}
          </span>
          <div className="flex items-center gap-2">
            <Button25D color="mint" size="sm" onClick={handleNextRound}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>{t(lang, 'victory.playAgain')}</span>
            </Button25D>
            <Button25D color="white" size="sm" onClick={onBack}>
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{t(lang, 'victory.home')}</span>
            </Button25D>
          </div>
        </div>
      )}

      {/* Main Pop Match Board */}
      {!isReviewing && (
        <Card25D className="touch-pan-y border-amber-200/80 bg-[#FFFDF9]/95 p-3.5 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs sm:text-sm font-bold text-slate-500">
              {isAudioSuperMode
                ? t(lang, 'game.popMatchAudioHint')
                : t(lang, 'game.popMatchHint')}
            </p>
            <Button25D
              color="sunny"
              size="sm"
              onClick={handleHint}
              disabled={isComplete}
              className="px-3 py-1.5 text-xs"
            >
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t(lang, 'game.hint')}</span>
            </Button25D>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`wave-${roundIndex}-${waveIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              data-testid="pop-match-board"
              className="grid grid-cols-2 gap-2.5 sm:gap-3.5"
            >
              {/* Left Column: English Word (or Audio-Only in Super Mode) */}
              <div className="flex flex-col gap-2.5">
                {leftCards.map((entry) => {
                  const isMatched = matchedIds.has(entry.id);
                  const isPopping = poppingIds.has(entry.id);
                  const isSelected = selectedLeftId === entry.id;
                  const isWrong = wrongPair?.left === entry.id;
                  const isHinted = hintedId === entry.id;

                  return (
                    <motion.button
                      key={`left-${entry.id}`}
                      type="button"
                      data-testid={`match-left-${entry.id}`}
                      disabled={isMatched && !isPopping}
                      animate={
                        isPopping
                          ? { scale: [1, 1.12, 0.85], opacity: [1, 1, 0] }
                          : isWrong
                            ? { x: [0, -7, 7, -5, 5, 0] }
                            : { scale: 1, opacity: isMatched ? 0 : 1, x: 0 }
                      }
                      transition={{ duration: isPopping ? 0.24 : 0.3 }}
                      onClick={() => handleSelectLeft(entry)}
                      className={[
                        'relative flex min-h-[60px] sm:min-h-[68px] w-full items-center justify-between gap-2 rounded-2xl border-2 border-b-[5px] px-3 py-2.5 text-left font-display bevel-25d select-none touch-manipulation transition-colors',
                        isMatched && !isPopping
                          ? 'pointer-events-none opacity-0'
                          : 'cursor-pointer active:translate-y-[3px] active:border-b-2',
                        isPopping
                          ? 'bg-[#10B981] border-[#059669] border-b-[#047857] text-white'
                          : isWrong
                            ? 'bg-[#F43F5E] border-[#E11D48] border-b-[#BE123C] text-white'
                            : isSelected
                              ? 'bg-[#8B5CF6] border-[#7C3AED] border-b-[#5B21B6] text-white ring-4 ring-violet-300'
                              : isHinted
                                ? 'bg-[#FEF3C7] border-[#F59E0B] border-b-[#D97706] text-amber-950 ring-4 ring-amber-300'
                                : 'bg-[#FFFDF9] hover:bg-rose-50/70 border-amber-200 border-b-amber-300 text-slate-800',
                      ].join(' ')}
                    >
                      {isAudioSuperMode ? (
                        <div className="flex w-full items-center justify-center gap-2 py-1">
                          <Volume2
                            className={`h-5 w-5 ${isSelected || isPopping || isWrong ? 'text-white' : 'text-violet-600'}`}
                            aria-hidden="true"
                          />
                          <span className="text-sm sm:text-base font-extrabold">
                            {t(lang, 'game.listen')}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-base sm:text-lg font-extrabold leading-tight">
                              {entry.word}
                            </div>
                            <span
                              className={`text-[11px] font-bold ${
                                isSelected || isPopping || isWrong
                                  ? 'text-white/85'
                                  : 'text-slate-400'
                              }`}
                            >
                              {entry.pos}
                            </span>
                          </div>
                          <Volume2
                            className={`h-4 w-4 shrink-0 ${
                              isSelected || isPopping || isWrong
                                ? 'text-white/90'
                                : 'text-rose-400'
                            }`}
                            aria-hidden="true"
                          />
                        </>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Right Column: Meaning (Vietnamese in VI, concise EN definition in EN) */}
              <div className="flex flex-col gap-2.5">
                {rightCards.map((entry) => {
                  const isMatched = matchedIds.has(entry.id);
                  const isPopping = poppingIds.has(entry.id);
                  const isSelected = selectedRightId === entry.id;
                  const isWrong = wrongPair?.right === entry.id;
                  const isHinted = hintedId === entry.id;
                  const meaningText = lang === 'vi' ? entry.vi : entry.en;

                  return (
                    <motion.button
                      key={`right-${entry.id}`}
                      type="button"
                      data-testid={`match-right-${entry.id}`}
                      disabled={isMatched && !isPopping}
                      animate={
                        isPopping
                          ? { scale: [1, 1.12, 0.85], opacity: [1, 1, 0] }
                          : isWrong
                            ? { x: [0, -7, 7, -5, 5, 0] }
                            : { scale: 1, opacity: isMatched ? 0 : 1, x: 0 }
                      }
                      transition={{ duration: isPopping ? 0.24 : 0.3 }}
                      onClick={() => handleSelectRight(entry)}
                      className={[
                        'relative flex min-h-[60px] sm:min-h-[68px] w-full items-center justify-center rounded-2xl border-2 border-b-[5px] px-3 py-2 text-center font-sans bevel-25d select-none touch-manipulation transition-colors',
                        isMatched && !isPopping
                          ? 'pointer-events-none opacity-0'
                          : 'cursor-pointer active:translate-y-[3px] active:border-b-2',
                        isPopping
                          ? 'bg-[#10B981] border-[#059669] border-b-[#047857] text-white'
                          : isWrong
                            ? 'bg-[#F43F5E] border-[#E11D48] border-b-[#BE123C] text-white'
                            : isSelected
                              ? 'bg-[#FF7A59] border-[#EA580C] border-b-[#C2410C] text-white ring-4 ring-orange-300'
                              : isHinted
                                ? 'bg-[#FEF3C7] border-[#F59E0B] border-b-[#D97706] text-amber-950 ring-4 ring-amber-300'
                                : 'bg-white hover:bg-violet-50/70 border-violet-200 border-b-violet-300 text-slate-700',
                      ].join(' ')}
                    >
                      <span className="line-clamp-2 text-xs sm:text-sm font-extrabold leading-snug">
                        {meaningText}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          {waves.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-extrabold text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span>
                {t(lang, 'game.waveProgress', {
                  current: waveIndex + 1,
                  total: waves.length,
                })}
              </span>
            </div>
          )}
        </Card25D>
      )}

      {/* Review Mode: Full Vocabulary Cards with IPA, Examples & Audio */}
      {isReviewing && (
        <WordReviewList entries={session.entries} lang={lang} />
      )}

      {/* Victory Modal */}
      <VictoryModal
        open={showVictory}
        stars={lastEarnedStars}
        streak={bestCombo}
        lang={lang}
        onNext={handleNextRound}
        onReview={() => setShowVictory(false)}
        onHome={onBack}
        isSessionComplete={true}
      />
    </div>
  );
}
