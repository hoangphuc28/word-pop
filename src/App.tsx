import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { speechEngine } from './audio/speechEngine';
import { GuideModal } from './components/GuideModal';
import { LandscapeBackdrop } from './components/LandscapeBackdrop';
import { SettingsModal } from './components/SettingsModal';
import { SplashScreen } from './components/SplashScreen';
import { StatsModal } from './components/StatsModal';
import {
  getPrioritizedWordKeys,
  recordWordAttempt,
} from './engine/spacedRepetition';
import {
  makeWordKey,
  type CefrLevel,
  type PlayConfig,
  type ProgressState,
} from './engine/types';
import { HomeHub } from './features/home/HomeHub';
import { SentencePopScreen } from './features/sentence-pop/SentencePopScreen';
import { WordCrossScreen } from './features/word-cross/WordCrossScreen';
import {
  computeNextDailyStreak,
  createDefaultStats,
  getLocalDateKey,
  loadProgress,
  resetProgress,
  saveProgress,
} from './storage/progressStore';

type Screen = 'home' | 'play-word-cross' | 'play-sentence-pop';

export interface AppProps {
  /** Optional prop used in tests to skip the initial splash screen */
  skipSplash?: boolean;
  /** Optional prop used in tests to skip the splash loading delay */
  splashInitialReady?: boolean;
}

export default function App({
  skipSplash = false,
  splashInitialReady = false,
}: AppProps = {}): React.JSX.Element {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());
  const [showSplash, setShowSplash] = useState(!skipSplash);
  const [screen, setScreen] = useState<Screen>('home');
  const [activeConfig, setActiveConfig] = useState<PlayConfig | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);

  const updateProgress = useCallback(
    (updater: (prev: ProgressState) => ProgressState) => {
      setProgress((prev) => {
        const next = updater(prev);
        saveProgress(next);
        return next;
      });
    },
    [],
  );

  const musicEnabled = progress.settings.musicEnabled ?? true;
  const soundVolume = progress.settings.soundVolume ?? 0.85;
  const musicVolume = progress.settings.musicVolume ?? 0.85;

  useEffect(() => {
    soundEngine.setEnabled(progress.settings.soundEnabled);
    speechEngine.setEnabled(progress.settings.soundEnabled);
  }, [progress.settings.soundEnabled]);

  useEffect(() => {
    soundEngine.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  useEffect(() => {
    soundEngine.setSfxVolume(soundVolume);
    speechEngine.setVolume(soundVolume);
  }, [soundVolume]);

  useEffect(() => {
    soundEngine.setMusicVolume(musicVolume);
  }, [musicVolume]);

  // Home plays the upbeat groove track; BGM pauses automatically during active gameplay so TTS pronunciation stays clear
  useEffect(() => {
    if (showSplash) {
      return;
    }
    const isPlaying =
      screen === 'play-word-cross' || screen === 'play-sentence-pop';
    if (isPlaying || !musicEnabled) {
      soundEngine.stopBgm();
    } else {
      soundEngine.setMusicTrack('groove');
      soundEngine.startBgm();
    }
  }, [screen, showSplash, musicEnabled]);

  useEffect(() => {
    return () => {
      soundEngine.stopBgm();
      speechEngine.stop();
    };
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = progress.settings.lang;
    }
  }, [progress.settings.lang]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleChangeSoundVolume = useCallback(
    (volume: number) => {
      soundEngine.setSfxVolume(volume);
      speechEngine.setVolume(volume);
      speechEngine.setEnabled(volume > 0);
      if (volume > 0) {
        soundEngine.setEnabled(true);
        soundEngine.playPop();
      }
      updateProgress((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          soundEnabled: volume > 0,
          soundVolume: volume,
        },
      }));
    },
    [updateProgress],
  );

  const handleChangeMusicVolume = useCallback(
    (volume: number) => {
      soundEngine.setMusicVolume(volume);
      const shouldEnable = volume > 0;
      soundEngine.setMusicEnabled(shouldEnable);
      if (shouldEnable && !showSplash && screen === 'home') {
        soundEngine.setMusicTrack('groove');
        soundEngine.startBgm();
      }
      updateProgress((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          musicEnabled: shouldEnable,
          musicVolume: volume,
        },
      }));
    },
    [updateProgress, showSplash, screen],
  );

  const handleToggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      if (typeof document.exitFullscreen === 'function') {
        void document.exitFullscreen().catch(() => {
          setIsFullscreen(false);
        });
      } else {
        setIsFullscreen(false);
      }
      return;
    }

    const target = stageRef.current ?? document.documentElement;
    if (typeof target.requestFullscreen === 'function') {
      void target.requestFullscreen().catch(() => {
        setIsFullscreen((prev) => !prev);
      });
    } else {
      setIsFullscreen((prev) => !prev);
    }
  }, []);

  const prioritizedWordKeys = useMemo(
    () => getPrioritizedWordKeys(progress.words),
    [progress.words],
  );

  const handleStartFromSplash = useCallback(() => {
    soundEngine.playPop();
    if (musicEnabled) {
      soundEngine.setMusicTrack('groove');
      soundEngine.startBgm();
    }
    setShowSplash(false);
  }, [musicEnabled]);

  const handleToggleLang = useCallback(() => {
    updateProgress((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        lang: prev.settings.lang === 'en' ? 'vi' : 'en',
      },
    }));
  }, [updateProgress]);

  const handleToggleSound = useCallback(() => {
    updateProgress((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        soundEnabled: !prev.settings.soundEnabled,
      },
    }));
  }, [updateProgress]);

  const handleToggleMusic = useCallback(() => {
    updateProgress((prev) => {
      const nextMusic = !(prev.settings.musicEnabled ?? true);
      if (nextMusic && !showSplash && screen === 'home') {
        soundEngine.setMusicTrack('groove');
        soundEngine.startBgm();
      }
      return {
        ...prev,
        settings: {
          ...prev.settings,
          musicEnabled: nextMusic,
        },
      };
    });
  }, [updateProgress, showSplash, screen]);

  const handleResetProgress = useCallback(() => {
    const fresh = resetProgress();
    setProgress(fresh);
  }, []);

  const handleStartPlay = useCallback((config: PlayConfig) => {
    setActiveConfig(config);
    setScreen(
      config.mode === 'sentence-pop' ? 'play-sentence-pop' : 'play-word-cross',
    );
  }, []);

  const handleBackToHome = useCallback(() => {
    speechEngine.stop();
    setScreen('home');
    setActiveConfig(null);
  }, []);

  const handleRecordAttempt = useCallback(
    (
      wordIds: string[],
      level: CefrLevel,
      outcome: { correct: boolean; usedHint: boolean },
    ) => {
      if (wordIds.length === 0) {
        return;
      }
      const now = Date.now();
      updateProgress((prev) => {
        const nextWords = { ...prev.words };
        const prevStats = prev.stats ?? createDefaultStats();
        const nextByLevel = {
          A1: { ...prevStats.byLevel.A1 },
          A2: { ...prevStats.byLevel.A2 },
          B1: { ...prevStats.byLevel.B1 },
          B2C1: { ...prevStats.byLevel.B2C1 },
        };

        for (const wordId of wordIds) {
          const key = makeWordKey(wordId);
          nextWords[key] = recordWordAttempt(nextWords[key], key, {
            correct: outcome.correct,
            usedHint: outcome.usedHint,
            now,
          });
        }

        nextByLevel[level].attempts += 1;
        if (outcome.correct) {
          nextByLevel[level].correct += 1;
        }

        const nextStreak = outcome.correct ? prevStats.currentStreak + 1 : 0;
        const nextStats = {
          puzzlesSolved: prevStats.puzzlesSolved + (outcome.correct ? 1 : 0),
          totalAttempts: prevStats.totalAttempts + 1,
          totalCorrect: prevStats.totalCorrect + (outcome.correct ? 1 : 0),
          currentStreak: nextStreak,
          bestStreak: Math.max(prevStats.bestStreak, nextStreak),
          byLevel: nextByLevel,
        };

        const nextDaily = outcome.correct
          ? computeNextDailyStreak(prev.dailyStreak ?? 0, prev.lastPlayedDate)
          : {
              dailyStreak: prev.dailyStreak ?? 0,
              lastPlayedDate: prev.lastPlayedDate ?? null,
            };

        return {
          ...prev,
          words: nextWords,
          stats: nextStats,
          dailyStreak: nextDaily.dailyStreak,
          lastPlayedDate: nextDaily.lastPlayedDate,
        };
      });
    },
    [updateProgress],
  );

  const handleAwardStars = useCallback(
    (stars: number) => {
      if (stars <= 0) {
        return;
      }
      updateProgress((prev) => ({
        ...prev,
        totalStars: prev.totalStars + stars,
      }));
    },
    [updateProgress],
  );

  const handleEndlessScore = useCallback(
    (score: number) => {
      if (score <= 0) {
        return;
      }
      updateProgress((prev) => {
        const currentBest = prev.bestEndlessScore ?? 0;
        if (score <= currentBest) {
          return prev;
        }
        return {
          ...prev,
          bestEndlessScore: score,
        };
      });
    },
    [updateProgress],
  );

  const { lang, soundEnabled } = progress.settings;
  const playedToday = progress.lastPlayedDate === getLocalDateKey();

  if (showSplash) {
    return (
      <SplashScreen
        lang={lang}
        initialReady={splashInitialReady}
        onStart={handleStartFromSplash}
      />
    );
  }

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden text-slate-800 flex flex-col justify-between">
      {/* Outer illustrated sky, clouds, sun & hills backdrop */}
      <LandscapeBackdrop fixed />

      <div className="relative z-10 mx-auto flex w-full max-w-[1520px] flex-1 items-center justify-center gap-4 px-1 py-1.5 sm:px-4 sm:py-5">
        {/* Unified Game Stage Frame with pastel dot-grid + subtle floating letter decor inside */}
        <div
          ref={stageRef}
          data-testid="game-stage"
          className={[
            'relative min-w-0 flex-1 flex flex-col overflow-x-hidden overflow-y-auto outer-backdrop transition-all',
            isFullscreen
              ? 'fixed inset-0 z-40 h-full w-full min-h-dvh max-w-none rounded-none border-0'
              : 'min-h-[580px] sm:min-h-[620px] lg:min-h-[740px] max-w-5xl rounded-2xl sm:rounded-3xl border-2 border-white/95 shadow-2xl card-25d',
          ].join(' ')}
        >
          {/* Subtle decorative floating letter tiles inside the Game Stage */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
          >
            <span
              className="animate-gentle-float absolute top-[6%] left-[3%] flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-300/20 border border-white/60 font-display text-2xl font-extrabold text-sky-600/30"
              style={{ '--float-rot': '-12deg', '--float-dur': '9s' } as React.CSSProperties}
            >
              A
            </span>
            <span
              className="animate-gentle-float absolute top-[10%] right-[4%] flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-300/20 border border-white/60 font-display text-2xl font-extrabold text-orange-500/30"
              style={{ '--float-rot': '14deg', '--float-dur': '10.5s' } as React.CSSProperties}
            >
              E
            </span>
            <span
              className="animate-gentle-float hidden sm:flex absolute top-[48%] left-[2%] h-9 w-9 items-center justify-center rounded-2xl bg-violet-300/20 border border-white/60 font-display text-xl font-extrabold text-violet-600/30"
              style={{ '--float-rot': '9deg', '--float-dur': '11s' } as React.CSSProperties}
            >
              W
            </span>
            <span
              className="animate-gentle-float hidden sm:flex absolute top-[52%] right-[2.5%] h-9 w-9 items-center justify-center rounded-2xl bg-emerald-300/20 border border-white/60 font-display text-xl font-extrabold text-emerald-600/30"
              style={{ '--float-rot': '-10deg', '--float-dur': '8.5s' } as React.CSSProperties}
            >
              Z
            </span>
            <span
              className="animate-gentle-float absolute bottom-[8%] left-[4%] flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/20 border border-white/60 font-display text-xl font-extrabold text-amber-600/30"
              style={{ '--float-rot': '-8deg', '--float-dur': '10s' } as React.CSSProperties}
            >
              P
            </span>
            <span
              className="animate-gentle-float absolute bottom-[7%] right-[4%] flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-300/20 border border-white/60 font-display text-xl font-extrabold text-sky-600/30"
              style={{ '--float-rot': '11deg', '--float-dur': '9.5s' } as React.CSSProperties}
            >
              ?
            </span>
          </div>

          <main className={`relative z-10 w-full ${isFullscreen ? 'my-0 sm:my-auto' : 'my-auto'}`}>
            {screen === 'home' && (
              <HomeHub
                lang={lang}
                dailyStreak={progress.dailyStreak ?? 0}
                playedToday={playedToday}
                bestEndlessScore={progress.bestEndlessScore ?? 0}
                isFullscreen={isFullscreen}
                onToggleFullscreen={handleToggleFullscreen}
                onOpenSettings={() => setSettingsOpen(true)}
                onStartPlay={handleStartPlay}
              />
            )}

            {screen === 'play-word-cross' && activeConfig && (
              <WordCrossScreen
                config={activeConfig}
                lang={lang}
                prioritizedWordKeys={prioritizedWordKeys}
                onRecordAttempt={handleRecordAttempt}
                onAwardStars={handleAwardStars}
                bestEndlessScore={progress.bestEndlessScore ?? 0}
                onEndlessScore={handleEndlessScore}
                onBack={handleBackToHome}
              />
            )}

            {screen === 'play-sentence-pop' && activeConfig && (
              <SentencePopScreen
                config={activeConfig}
                lang={lang}
                prioritizedWordKeys={prioritizedWordKeys}
                onRecordAttempt={handleRecordAttempt}
                onAwardStars={handleAwardStars}
                onBack={handleBackToHome}
              />
            )}
          </main>

          {/* Modals live inside stageRef so they stay visible in Fullscreen mode too */}
          <SettingsModal
            open={settingsOpen}
            lang={lang}
            soundEnabled={soundEnabled}
            musicEnabled={musicEnabled}
            soundVolume={soundVolume}
            musicVolume={musicVolume}
            onToggleLang={handleToggleLang}
            onToggleSound={handleToggleSound}
            onToggleMusic={handleToggleMusic}
            onChangeSoundVolume={handleChangeSoundVolume}
            onChangeMusicVolume={handleChangeMusicVolume}
            onOpenStats={() => setStatsOpen(true)}
            onOpenGuide={() => setGuideOpen(true)}
            onClose={() => setSettingsOpen(false)}
          />

          <StatsModal
            open={statsOpen}
            progress={progress}
            onResetProgress={handleResetProgress}
            onClose={() => setStatsOpen(false)}
          />

          <GuideModal
            open={guideOpen}
            lang={lang}
            onClose={() => setGuideOpen(false)}
          />
        </div>
      </div>

      {/* Subtle Author Footer outside Fullscreen */}
      {!isFullscreen && (
        <div className="relative z-10 w-full px-3 pb-3">
          <footer
            data-testid="author-footer"
            className="pt-1 text-center text-[11px] font-semibold tracking-wide text-emerald-950/45 select-none"
          >
            WordPop · crafted by Hoàng Phúc
          </footer>
        </div>
      )}
    </div>
  );
}
