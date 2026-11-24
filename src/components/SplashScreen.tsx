import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Sparkles } from 'lucide-react';
import { t, type Lang } from '../i18n';
import { Button25D } from './Button25D';
import { LandscapeBackdrop } from './LandscapeBackdrop';

export interface SplashScreenProps {
  lang: Lang;
  onStart: () => void;
  /** Skip loading timer in tests or instant mode */
  initialReady?: boolean;
}

export function SplashScreen({
  lang,
  onStart,
  initialReady = false,
}: SplashScreenProps): React.JSX.Element {
  const [progress, setProgress] = useState<number>(initialReady ? 100 : 12);
  const ready = progress >= 100;

  useEffect(() => {
    if (initialReady) {
      setProgress(100);
      return;
    }
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return Math.min(100, prev + 22);
      });
    }, 210);

    return () => clearInterval(timer);
  }, [initialReady]);

  return (
    <div
      data-testid="splash-screen"
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-4 py-10"
    >
      <LandscapeBackdrop />

      {/* Main center hero card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="relative z-10 flex w-full max-w-md flex-col items-center rounded-3xl border-2 border-white/90 bg-white/90 p-7 sm:p-9 text-center shadow-2xl backdrop-blur-md card-25d"
      >
        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#FF8A65] via-[#F43F5E] to-[#8B5CF6] border-b-[6px] border-[#6D28D9] shadow-lg bevel-25d">
          <img
            src="/icon-192.svg"
            alt=""
            aria-hidden="true"
            className="h-20 w-20 rounded-2xl"
          />
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-800">
          <span>Word</span>
          <span className="bg-gradient-to-r from-[#FF7A59] via-[#F43F5E] to-[#8B5CF6] bg-clip-text text-transparent">
            Pop
          </span>
        </h1>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-100/90 px-4 py-1 text-sm font-extrabold text-rose-800">
          <Sparkles className="h-4 w-4 text-rose-500" aria-hidden="true" />
          {t(lang, 'splash.tagline')}
        </p>

        {/* Loading bar */}
        <div className="mt-7 w-full">
          <div className="mb-2 flex items-center justify-between text-xs font-extrabold text-slate-500">
            <span>{ready ? t(lang, 'splash.ready') : t(lang, 'splash.loading')}</span>
            <span>{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-4 w-full overflow-hidden rounded-full border-2 border-rose-200 bg-rose-100/80 p-0.5"
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#FF7A59] via-[#F43F5E] to-[#8B5CF6]"
              initial={{ width: '12%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Big START button once loaded */}
        <div className="mt-7 w-full">
          <Button25D
            color="coral"
            size="lg"
            fullWidth
            disabled={!ready}
            onClick={onStart}
            data-testid="splash-start-btn"
            className="text-xl py-4 tracking-wide"
          >
            <Play className="h-6 w-6 fill-current" aria-hidden="true" />
            {t(lang, 'splash.start')}
          </Button25D>
        </div>
      </motion.div>
    </div>
  );
}
