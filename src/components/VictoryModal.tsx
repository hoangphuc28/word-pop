import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, Eye, Home, RotateCcw, Sparkles } from 'lucide-react';
import { t, type Lang } from '../i18n';
import { Button25D } from './Button25D';
import { Card25D } from './Card25D';
import { PlumpStar } from './PlumpStar';

const CONFETTI_DOTS = [
  { x: -120, y: -70, color: '#FF7A59', size: 12, delay: 0.05 },
  { x: -75, y: -110, color: '#38BDF8', size: 10, delay: 0.1 },
  { x: -18, y: -125, color: '#FBBF24', size: 14, delay: 0.08 },
  { x: 45, y: -115, color: '#10B981', size: 11, delay: 0.14 },
  { x: 105, y: -85, color: '#8B5CF6', size: 13, delay: 0.06 },
  { x: 130, y: -20, color: '#FF7A59', size: 9, delay: 0.16 },
  { x: -135, y: -10, color: '#10B981', size: 10, delay: 0.12 },
  { x: 95, y: 45, color: '#FBBF24', size: 11, delay: 0.18 },
  { x: -95, y: 50, color: '#8B5CF6', size: 10, delay: 0.15 },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export interface VictoryModalProps {
  open: boolean;
  stars: number;
  streak?: number;
  elapsedSeconds?: number;
  lang: Lang;
  onNext: () => void;
  onReview?: () => void;
  onHome: () => void;
  isSessionComplete?: boolean;
}

export function VictoryModal({
  open,
  stars,
  streak,
  elapsedSeconds,
  lang,
  onNext,
  onReview,
  onHome,
  isSessionComplete = false,
}: VictoryModalProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  const displayStars = Math.max(1, Math.min(stars, 5));
  const titleText = isSessionComplete
    ? t(lang, 'victory.sessionTitle')
    : t(lang, 'victory.title');
  const nextLabel = isSessionComplete
    ? t(lang, 'victory.playAgain')
    : t(lang, 'victory.next');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titleText}
      data-testid="victory-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-sm">
        {/* Confetti burst dots */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/3 z-0"
        >
          {CONFETTI_DOTS.map((dot, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: 0.9,
                scale: 1,
                x: dot.x,
                y: dot.y,
              }}
              transition={{
                delay: dot.delay,
                type: 'spring',
                stiffness: 180,
                damping: 12,
              }}
              className="absolute rounded-full"
              style={{
                width: dot.size,
                height: dot.size,
                backgroundColor: dot.color,
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.82, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="relative z-10"
        >
          <Card25D className="text-center px-6 py-7">
            {/* Bouncing Stars */}
            <div className="mb-4 flex items-center justify-center gap-2">
              {Array.from({ length: displayStars }).map((_, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0, rotate: -30, y: 12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 16,
                    delay: 0.08 + idx * 0.1,
                  }}
                  className="drop-shadow-sm"
                >
                  <PlumpStar className="h-11 w-11" />
                </motion.div>
              ))}
            </div>

            <h2 className="font-display text-3xl font-extrabold text-slate-800">
              {titleText}
            </h2>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {typeof elapsedSeconds === 'number' && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3.5 py-1 text-sm font-bold text-sky-700 border border-sky-200">
                  <Clock className="h-4 w-4 text-sky-500" aria-hidden="true" />
                  <span>{formatTime(elapsedSeconds)}</span>
                </div>
              )}
              {typeof streak === 'number' && streak > 1 && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-sm font-bold text-amber-800 border border-amber-300">
                  <Sparkles className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span>{t(lang, 'game.streak', { count: streak })}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button25D color="mint" size="lg" fullWidth onClick={onNext}>
                {isSessionComplete ? (
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                )}
                <span>{nextLabel}</span>
              </Button25D>

              <div className={onReview ? 'grid grid-cols-2 gap-2.5' : ''}>
                {onReview && (
                  <Button25D
                    color="sky"
                    size="md"
                    fullWidth
                    onClick={onReview}
                    className="whitespace-nowrap px-3"
                  >
                    <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{t(lang, 'victory.review')}</span>
                  </Button25D>
                )}
                <Button25D
                  color="white"
                  size="md"
                  fullWidth
                  onClick={onHome}
                  className="whitespace-nowrap px-3"
                >
                  <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{t(lang, 'victory.home')}</span>
                </Button25D>
              </div>
            </div>
          </Card25D>
        </motion.div>
      </div>
    </div>
  );
}
