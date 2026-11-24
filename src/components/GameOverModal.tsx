import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HeartCrack, Home, RotateCcw, Trophy } from 'lucide-react';
import { t, type Lang } from '../i18n';
import { Button25D } from './Button25D';

export interface GameOverModalProps {
  open: boolean;
  lang: Lang;
  puzzlesCleared: number;
  bestScore: number;
  isNewRecord: boolean;
  onRetry: () => void;
  onHome: () => void;
}

export function GameOverModal({
  open,
  lang,
  puzzlesCleared,
  bestScore,
  isNewRecord,
  onRetry,
  onHome,
}: GameOverModalProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, 'gameOver.title')}
        data-testid="game-over-modal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-sm rounded-3xl border-2 border-white bg-white p-7 text-center shadow-2xl card-25d"
          initial={{ scale: 0.85, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24 }}
        >
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-500 border-b-4 border-rose-200">
            <HeartCrack className="h-9 w-9" aria-hidden="true" />
          </div>

          <h2 className="font-display text-3xl font-extrabold text-slate-800">
            {t(lang, 'gameOver.title')}
          </h2>

          <p className="mt-2 text-base font-bold text-slate-600">
            {t(lang, 'gameOver.subtitle', { count: puzzlesCleared })}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3.5 py-1 text-xs font-extrabold text-sky-700 border border-sky-200">
              <span>{t(lang, 'gameOver.bestScore', { count: bestScore })}</span>
            </div>
            {isNewRecord && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-extrabold text-amber-800 border border-amber-200">
                <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
                <span>{t(lang, 'gameOver.newRecord')}</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Button25D color="coral" size="lg" fullWidth onClick={onRetry}>
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              <span>{t(lang, 'gameOver.tryAgain')}</span>
            </Button25D>
            <Button25D color="white" size="md" fullWidth onClick={onHome}>
              <Home className="h-5 w-5" aria-hidden="true" />
              <span>{t(lang, 'gameOver.home')}</span>
            </Button25D>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
