import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Flame,
  Grid3X3,
  HelpCircle,
  Infinity as InfinityIcon,
  Sparkles,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { t, type Lang } from '../i18n';
import { Button25D } from './Button25D';

export interface GuideModalProps {
  open: boolean;
  lang: Lang;
  onClose: () => void;
}

export function GuideModal({
  open,
  lang,
  onClose,
}: GuideModalProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, 'guide.title')}
        data-testid="guide-modal"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-3xl border-2 border-white bg-white p-5 sm:p-6 shadow-2xl card-25d"
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 25 }}
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 border-b-4 border-sky-200">
                <HelpCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-slate-800">
                {t(lang, 'guide.title')}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playPop();
                onClose();
              }}
              aria-label={t(lang, 'settings.close')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Guide Sections */}
          <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-sm text-slate-600">
            {/* WordCross */}
            <div className="rounded-2xl border-2 border-sky-100 bg-sky-50/70 p-3.5">
              <div className="mb-1 flex items-center gap-2 font-display text-base font-extrabold text-sky-800">
                <Grid3X3 className="h-4 w-4 text-sky-500 shrink-0" aria-hidden="true" />
                <span>{t(lang, 'guide.wordCrossTitle')}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-700">
                {t(lang, 'guide.wordCrossDesc')}
              </p>
            </div>

            {/* Sentence Pop */}
            <div className="rounded-2xl border-2 border-violet-100 bg-violet-50/70 p-3.5">
              <div className="mb-1 flex items-center gap-2 font-display text-base font-extrabold text-violet-800">
                <BookOpen className="h-4 w-4 text-violet-500 shrink-0" aria-hidden="true" />
                <span>{t(lang, 'guide.sentencePopTitle')}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-700">
                {t(lang, 'guide.sentencePopDesc')}
              </p>
            </div>

            {/* Super Mode */}
            <div className="rounded-2xl border-2 border-amber-100 bg-amber-50/70 p-3.5">
              <div className="mb-1 flex items-center gap-2 font-display text-base font-extrabold text-amber-900">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
                <span>{t(lang, 'guide.superModeTitle')}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-700">
                {t(lang, 'guide.superModeDesc')}
              </p>
            </div>

            {/* Endless Mode */}
            <div className="rounded-2xl border-2 border-rose-100 bg-rose-50/70 p-3.5">
              <div className="mb-1 flex items-center gap-2 font-display text-base font-extrabold text-rose-800">
                <InfinityIcon className="h-4 w-4 text-rose-500 shrink-0" aria-hidden="true" />
                <span>{t(lang, 'guide.endlessTitle')}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-700">
                {t(lang, 'guide.endlessDesc')}
              </p>
            </div>

            {/* Daily Streak & Spaced Review */}
            <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/70 p-3.5">
              <div className="mb-1 flex items-center gap-2 font-display text-base font-extrabold text-emerald-800">
                <Flame className="h-4 w-4 text-emerald-500 shrink-0" aria-hidden="true" />
                <span>{t(lang, 'guide.streakTitle')}</span>
              </div>
              <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-700">
                {t(lang, 'guide.streakDesc')}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Button25D
              color="mint"
              size="md"
              fullWidth
              onClick={() => {
                soundEngine.playPop();
                onClose();
              }}
            >
              {t(lang, 'guide.gotIt')}
            </Button25D>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
