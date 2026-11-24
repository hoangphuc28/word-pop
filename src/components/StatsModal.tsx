import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Flame,
  RotateCcw,
  Target,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { computeMasteryLevel } from '../engine/spacedRepetition';
import { CEFR_LEVELS, type CefrLevel, type ProgressState } from '../engine/types';
import { createDefaultStats } from '../storage/progressStore';
import { t, type Lang } from '../i18n';
import { Button25D } from './Button25D';

export interface StatsModalProps {
  open: boolean;
  progress: ProgressState;
  onResetProgress?: () => void;
  onClose: () => void;
}

const LEVEL_META: Record<
  CefrLevel,
  { barClass: string; badgeClass: string }
> = {
  A1: { barClass: 'bg-[#10B981]', badgeClass: 'bg-emerald-100 text-emerald-700' },
  A2: { barClass: 'bg-[#38BDF8]', badgeClass: 'bg-sky-100 text-sky-700' },
  B1: { barClass: 'bg-[#FF7A59]', badgeClass: 'bg-orange-100 text-orange-700' },
  B2C1: { barClass: 'bg-[#8B5CF6]', badgeClass: 'bg-violet-100 text-violet-700' },
};

export function StatsModal({
  open,
  progress,
  onResetProgress,
  onClose,
}: StatsModalProps): React.JSX.Element | null {
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmingReset(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const lang: Lang = progress.settings.lang;
  const stats = progress.stats ?? createDefaultStats();
  const accuracy =
    stats.totalAttempts > 0
      ? Math.round((stats.totalCorrect / stats.totalAttempts) * 100)
      : 0;
  const wordsMastered = Object.values(progress.words ?? {}).filter(
    (record) => computeMasteryLevel(record) === 'mastered',
  ).length;

  function handleClose(): void {
    soundEngine.playPop();
    setConfirmingReset(false);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, 'stats.title')}
        data-testid="stats-modal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-md rounded-3xl border-2 border-white bg-white p-6 shadow-2xl card-25d"
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 25 }}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 border-b-4 border-amber-200">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-slate-800">
                {t(lang, 'stats.title')}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label={t(lang, 'settings.close')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/70 p-3.5 text-center">
              <CheckCircle2 className="mx-auto h-5 w-5 text-sky-500" aria-hidden="true" />
              <div className="mt-1 font-display text-2xl font-extrabold text-slate-800">
                {stats.puzzlesSolved}
              </div>
              <div className="text-xs font-bold text-slate-500">
                {t(lang, 'stats.puzzlesSolved')}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/70 p-3.5 text-center">
              <Target className="mx-auto h-5 w-5 text-emerald-500" aria-hidden="true" />
              <div className="mt-1 font-display text-2xl font-extrabold text-slate-800">
                {stats.totalAttempts > 0 ? `${accuracy}%` : '—'}
              </div>
              <div className="text-xs font-bold text-slate-500">
                {t(lang, 'stats.accuracy')}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-violet-100 bg-violet-50/70 p-3.5 text-center">
              <Award className="mx-auto h-5 w-5 text-violet-500" aria-hidden="true" />
              <div className="mt-1 font-display text-2xl font-extrabold text-slate-800">
                {wordsMastered}
              </div>
              <div className="text-xs font-bold text-slate-500">
                {t(lang, 'stats.wordsMastered')}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-orange-100 bg-orange-50/70 p-3.5 text-center">
              <Flame className="mx-auto h-5 w-5 text-orange-500" aria-hidden="true" />
              <div className="mt-1 font-display text-2xl font-extrabold text-slate-800">
                {stats.bestStreak}
              </div>
              <div className="text-xs font-bold text-slate-500">
                {t(lang, 'stats.bestStreak')}
              </div>
            </div>
          </div>

          {/* Per-CEFR Level Accuracy */}
          <div className="mt-5">
            <h3 className="font-display text-sm font-extrabold text-slate-700 mb-2.5">
              {t(lang, 'stats.byLevel')}
            </h3>

            {stats.totalAttempts === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">
                {t(lang, 'stats.noData')}
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {CEFR_LEVELS.map((level) => {
                  const meta = LEVEL_META[level];
                  const levelStat = stats.byLevel?.[level] ?? { attempts: 0, correct: 0 };
                  const pct =
                    levelStat.attempts > 0
                      ? Math.round((levelStat.correct / levelStat.attempts) * 100)
                      : 0;
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <span
                        className={`flex h-8 min-w-[3.25rem] px-1.5 shrink-0 items-center justify-center rounded-xl font-display text-xs font-extrabold ${meta.badgeClass}`}
                      >
                        {t(lang, `levels.${level}`)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-600">
                          <span>
                            {levelStat.attempts > 0
                              ? t(lang, 'stats.attempts', {
                                  correct: levelStat.correct,
                                  attempts: levelStat.attempts,
                                })
                              : '—'}
                          </span>
                          <span>{levelStat.attempts > 0 ? `${pct}%` : '0%'}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${meta.barClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {onResetProgress && (
              confirmingReset ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <Button25D
                    color="coral"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      soundEngine.playPop();
                      setConfirmingReset(false);
                      onResetProgress();
                    }}
                  >
                    {t(lang, 'stats.confirmReset')}
                  </Button25D>
                  <Button25D
                    color="white"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      soundEngine.playPop();
                      setConfirmingReset(false);
                    }}
                  >
                    {t(lang, 'stats.cancel')}
                  </Button25D>
                </div>
              ) : (
                <Button25D
                  color="white"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    soundEngine.playPop();
                    setConfirmingReset(true);
                  }}
                >
                  <RotateCcw className="h-4 w-4 text-rose-500" aria-hidden="true" />
                  <span>{t(lang, 'stats.reset')}</span>
                </Button25D>
              )
            )}

            <Button25D
              color="sky"
              size="md"
              fullWidth
              onClick={handleClose}
            >
              {t(lang, 'settings.close')}
            </Button25D>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
