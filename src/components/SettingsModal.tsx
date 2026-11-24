import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Globe,
  HelpCircle,
  Music,
  Settings,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { t, type Lang } from '../i18n';
import { Button25D } from './Button25D';

export interface SettingsModalProps {
  open: boolean;
  lang: Lang;
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume?: number;
  musicVolume?: number;
  onToggleLang: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onChangeSoundVolume?: (volume: number) => void;
  onChangeMusicVolume?: (volume: number) => void;
  onOpenStats?: () => void;
  onOpenGuide?: () => void;
  onClose: () => void;
}

export function SettingsModal({
  open,
  lang,
  soundEnabled,
  musicEnabled,
  soundVolume = 0.85,
  musicVolume = 0.85,
  onToggleLang,
  onToggleSound,
  onToggleMusic,
  onChangeSoundVolume,
  onChangeMusicVolume,
  onOpenStats,
  onOpenGuide,
  onClose,
}: SettingsModalProps): React.JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={t(lang, 'settings.title')}
        data-testid="settings-modal"
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 border-b-4 border-sky-200">
                <Settings className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="font-display text-2xl font-extrabold text-slate-800">
                {t(lang, 'settings.title')}
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

          <div className="flex flex-col gap-3">
            {/* 1. Background Music + Volume Slider */}
            <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-display font-bold text-slate-700">
                  <Music
                    className={`h-5 w-5 ${musicEnabled ? 'text-violet-500' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span>{t(lang, 'settings.music')}</span>
                </div>
                <Button25D
                  color={musicEnabled ? 'lavender' : 'slate'}
                  size="sm"
                  aria-label={t(lang, 'settings.music')}
                  aria-pressed={musicEnabled}
                  onClick={onToggleMusic}
                >
                  <Music className="h-4 w-4" aria-hidden="true" />
                </Button25D>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round((musicEnabled ? musicVolume : 0) * 100)}
                  aria-label={`${t(lang, 'settings.music')} volume`}
                  onChange={(e) => onChangeMusicVolume?.(Number(e.target.value) / 100)}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-violet-100 accent-violet-500"
                />
                <span className="w-9 text-right text-xs font-extrabold tabular-nums text-slate-500">
                  {Math.round((musicEnabled ? musicVolume : 0) * 100)}%
                </span>
              </div>
            </div>

            {/* 2. Sound Effects + Volume Slider */}
            <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 font-display font-bold text-slate-700">
                  {soundEnabled ? (
                    <Volume2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                  ) : (
                    <VolumeX className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  )}
                  <span>{t(lang, 'settings.sound')}</span>
                </div>
                <Button25D
                  color={soundEnabled ? 'mint' : 'slate'}
                  size="sm"
                  aria-label={t(lang, 'settings.sound')}
                  aria-pressed={soundEnabled}
                  onClick={onToggleSound}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <VolumeX className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button25D>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round((soundEnabled ? soundVolume : 0) * 100)}
                  aria-label={`${t(lang, 'settings.sound')} volume`}
                  onChange={(e) => onChangeSoundVolume?.(Number(e.target.value) / 100)}
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-emerald-100 accent-emerald-500"
                />
                <span className="w-9 text-right text-xs font-extrabold tabular-nums text-slate-500">
                  {Math.round((soundEnabled ? soundVolume : 0) * 100)}%
                </span>
              </div>
            </div>

            {/* 3. Language */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center gap-2.5 font-display font-bold text-slate-700">
                <Globe className="h-5 w-5 text-sky-500" aria-hidden="true" />
                <span>{t(lang, 'settings.language')}</span>
              </div>
              <Button25D
                color="white"
                size="sm"
                onClick={() => {
                  soundEngine.playPop();
                  onToggleLang();
                }}
              >
                <span className={lang === 'en' ? 'text-sky-600 font-extrabold' : 'text-slate-400'}>
                  EN
                </span>
                <span className="text-slate-300">/</span>
                <span className={lang === 'vi' ? 'text-sky-600 font-extrabold' : 'text-slate-400'}>
                  VI
                </span>
              </Button25D>
            </div>

            {/* 4. Divider + 5. Learning Statistics + 6. Guide & Explanations */}
            {(onOpenStats || onOpenGuide) && (
              <>
                <div className="my-0.5 h-px w-full bg-slate-200/80" aria-hidden="true" />
                <div className="grid grid-cols-1 gap-2.5">
                  {onOpenStats && (
                    <Button25D
                      color="white"
                      size="md"
                      fullWidth
                      onClick={() => {
                        soundEngine.playPop();
                        onClose();
                        onOpenStats();
                      }}
                    >
                      <BarChart3 className="h-5 w-5 text-amber-500" aria-hidden="true" />
                      <span>{t(lang, 'settings.learningStats')}</span>
                    </Button25D>
                  )}

                  {onOpenGuide && (
                    <Button25D
                      color="white"
                      size="md"
                      fullWidth
                      onClick={() => {
                        soundEngine.playPop();
                        onClose();
                        onOpenGuide();
                      }}
                    >
                      <HelpCircle className="h-5 w-5 text-violet-500" aria-hidden="true" />
                      <span>{t(lang, 'settings.guide')}</span>
                    </Button25D>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
