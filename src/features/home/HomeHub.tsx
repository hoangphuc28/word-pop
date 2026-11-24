import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  ChevronRight,
  CloudDownload,
  Cpu,
  Flame,
  Globe2,
  GraduationCap,
  Grid3X3,
  Heart,
  Home,
  Infinity as InfinityIcon,
  Leaf,
  Loader2,
  type LucideIcon,
  Maximize2,
  Minimize2,
  Plane,
  Play,
  Settings,
  Smile,
  Sparkles,
  Trophy,
  Utensils,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { Button25D, type Button25DColor } from '../../components/Button25D';
import { Card25D } from '../../components/Card25D';
import { PlumpStar } from '../../components/PlumpStar';
import {
  ALL_TOPICS,
  CEFR_LEVELS,
  type CefrLevel,
  type GameMode,
  type PlayConfig,
  type SessionMode,
  type VocabTopic,
} from '../../engine/types';
import { type Lang, t } from '../../i18n';

export interface HomeHubProps {
  lang: Lang;
  dailyStreak?: number;
  playedToday?: boolean;
  bestEndlessScore?: number;
  isFullscreen?: boolean;
  vocabTotalCount?: number;
  isExpandingVocab?: boolean;
  expandVocabNotice?: string | null;
  onExpandVocab?: () => void;
  onToggleFullscreen?: () => void;
  onOpenSettings?: () => void;
  onStartPlay: (config: PlayConfig) => void;
}

const TOPIC_META: Record<
  VocabTopic,
  {
    color: Button25DColor;
    Icon: LucideIcon;
  }
> = {
  daily: { color: 'sky', Icon: Home },
  food: { color: 'coral', Icon: Utensils },
  travel: { color: 'mint', Icon: Plane },
  nature: { color: 'mint', Icon: Leaf },
  work: { color: 'lavender', Icon: Briefcase },
  tech: { color: 'sky', Icon: Cpu },
  feelings: { color: 'sunny', Icon: Smile },
  culture: { color: 'coral', Icon: Globe2 },
};

const LEVEL_STARS: Record<CefrLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2C1: 4,
};

export function HomeHub({
  lang,
  dailyStreak = 0,
  playedToday = false,
  bestEndlessScore = 0,
  isFullscreen = false,
  vocabTotalCount = 384,
  isExpandingVocab = false,
  expandVocabNotice = null,
  onExpandVocab,
  onToggleFullscreen,
  onOpenSettings,
  onStartPlay,
}: HomeHubProps): React.JSX.Element {
  const [selectedSession, setSelectedSession] = useState<SessionMode | null>(null);
  const [superMode, setSuperMode] = useState(false);
  const [mode, setMode] = useState<GameMode>('word-cross');
  const [level, setLevel] = useState<CefrLevel>('A1');
  const [topics, setTopics] = useState<VocabTopic[]>(['daily']);

  const isPractice = selectedSession === 'practice';
  const effectiveMode: GameMode = isPractice ? mode : 'word-cross';
  const isMixActive = topics.length >= 2;
  const canPlay = !isPractice || topics.length > 0;

  function handleChooseSession(nextSession: SessionMode): void {
    soundEngine.playPop();
    setSelectedSession(nextSession);
    if (nextSession !== 'practice') {
      setMode('word-cross');
    }
  }

  function handleSelectMode(nextMode: GameMode): void {
    soundEngine.playPop();
    setMode(nextMode);
  }

  function handleSelectLevel(nextLevel: CefrLevel): void {
    soundEngine.playPop();
    setLevel(nextLevel);
  }

  function handleToggleTopic(topic: VocabTopic): void {
    soundEngine.playPop();
    setTopics((prev) => {
      if (prev.includes(topic)) {
        return prev.filter((item) => item !== topic);
      }
      return [...prev, topic];
    });
  }

  function handleSelectAllTopics(): void {
    soundEngine.playPop();
    setTopics([...ALL_TOPICS]);
  }

  function handleStartPlay(): void {
    if (!canPlay || !selectedSession) {
      return;
    }
    soundEngine.playPop();

    onStartPlay({
      mode: effectiveMode,
      sessionMode: selectedSession,
      inputMode: superMode ? 'keyboard' : 'tray',
      level,
      topics: isPractice ? [...topics] : [...ALL_TOPICS],
    });
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 lg:px-10 py-5 sm:py-7 lg:py-8 flex flex-col gap-5 lg:gap-6">
      {/* Minimal Header — chunky warm WordPop logo + 2 clean utility buttons */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-13 w-13 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF8A65] via-[#F43F5E] to-[#8B5CF6] border-b-[5px] border-[#6D28D9] shadow-sm">
            <img
              src="/icon-192.svg"
              alt=""
              aria-hidden="true"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl"
            />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800 leading-none whitespace-nowrap">
            <span>Word</span>
            <span className="bg-gradient-to-r from-[#FF7A59] via-[#F43F5E] to-[#8B5CF6] bg-clip-text text-transparent">
              Pop
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleFullscreen && (
            <Button25D
              color="white"
              size="md"
              onClick={() => {
                soundEngine.playPop();
                onToggleFullscreen();
              }}
              aria-label={
                isFullscreen
                  ? t(lang, 'settings.exitFullscreen')
                  : t(lang, 'settings.fullscreen')
              }
              aria-pressed={isFullscreen}
              className="!p-3"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-rose-500" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-5 h-5 text-rose-500" aria-hidden="true" />
              )}
            </Button25D>
          )}

          {onOpenSettings && (
            <Button25D
              color="white"
              size="md"
              onClick={() => {
                soundEngine.playPop();
                onOpenSettings();
              }}
              aria-label={t(lang, 'settings.title')}
              className="!p-3"
            >
              <Settings className="w-5 h-5 text-slate-600" aria-hidden="true" />
            </Button25D>
          )}
        </div>
      </header>

      {selectedSession === null ? (
        /* STEP 1: Super clean 3-mode menu */
        <motion.section
          key="mode-menu"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className={`flex flex-col gap-4 ${isFullscreen ? 'pt-6 sm:pt-1' : 'pt-1'}`}
        >
          {/* Top Status Strip: Daily Streak + Live Vocabulary Bank */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.45fr)_minmax(0,0.85fr)]">
            {/* Daily Streak Hero Banner */}
            <div
              data-testid="daily-streak-banner"
              className="flex items-center justify-between gap-3 rounded-3xl border-2 border-amber-200 border-b-[5px] border-b-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/90 to-rose-50/80 px-4 py-3.5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={[
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-b-4 shadow-sm',
                    playedToday
                      ? 'bg-gradient-to-br from-[#FBBF24] to-[#FF7A59] border-[#EA580C] text-white'
                      : 'bg-white border-amber-200 text-amber-400',
                  ].join(' ')}
                >
                  <Flame
                    className={`h-6 w-6 ${playedToday ? 'fill-white' : 'fill-amber-200'}`}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <div className="font-display text-base sm:text-lg font-extrabold text-slate-800 leading-tight">
                    {dailyStreak > 0
                      ? t(lang, 'home.dailyStreakCount', { count: dailyStreak })
                      : t(lang, 'home.dailyStreakZero')}
                  </div>
                  <p className="text-xs font-bold text-amber-800/80">
                    {playedToday
                      ? t(lang, 'home.dailyStreakActive')
                      : t(lang, 'home.dailyStreakPrompt')}
                  </p>
                </div>
              </div>

              {/* 7-day flame dots */}
              <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
                {Array.from({ length: 7 }).map((_, idx) => {
                  const filledCount = Math.min(7, dailyStreak);
                  const lit = idx < filledCount;
                  return (
                    <span
                      key={idx}
                      className={[
                        'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                        lit
                          ? 'bg-gradient-to-b from-amber-400 to-orange-500 border-orange-500 text-white shadow-xs'
                          : 'bg-white/80 border-amber-200 text-amber-200',
                      ].join(' ')}
                    >
                      <Flame className={`h-3 w-3 ${lit ? 'fill-white' : ''}`} />
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Live Vocabulary Bank Card */}
            <div
              data-testid="vocab-bank-card"
              className="flex items-center justify-between gap-2.5 rounded-3xl border-2 border-violet-200 border-b-[5px] border-b-violet-300 bg-gradient-to-r from-violet-50/90 via-fuchsia-50/70 to-white px-4 py-3.5 shadow-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-display text-base sm:text-lg font-extrabold text-violet-950 leading-tight">
                  <BookOpen className="h-4.5 w-4.5 shrink-0 text-violet-600" aria-hidden="true" />
                  <span className="truncate">
                    {t(lang, 'home.vocabBank', { count: vocabTotalCount })}
                  </span>
                </div>
                {expandVocabNotice && (
                  <p className="mt-0.5 text-xs font-extrabold text-emerald-600">
                    {expandVocabNotice}
                  </p>
                )}
              </div>

              {onExpandVocab && (
                <button
                  type="button"
                  disabled={isExpandingVocab}
                  onClick={() => {
                    soundEngine.playPop();
                    onExpandVocab();
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border-2 border-violet-300 border-b-[4px] border-b-violet-400 bg-white px-3 py-1.5 font-display text-xs font-extrabold text-violet-700 hover:bg-violet-50 active:translate-y-[2px] active:border-b-2 disabled:opacity-60 cursor-pointer transition-all"
                >
                  {isExpandingVocab ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <CloudDownload className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {isExpandingVocab
                      ? t(lang, 'home.expandingVocab')
                      : t(lang, 'home.expandVocab')}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-700">
              {t(lang, 'home.sessionMode')}
            </h2>

            {/* Compact Super Mode modifier pill inline with Play Mode */}
            <button
              type="button"
              role="switch"
              aria-checked={superMode}
              data-testid="super-mode-toggle"
              title={t(lang, 'home.superModeDesc')}
              onClick={() => {
                soundEngine.playPop();
                setSuperMode((prev) => !prev);
              }}
              className={[
                'inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs sm:text-sm font-display font-extrabold transition-all duration-150 cursor-pointer select-none',
                superMode
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 border-violet-600 text-white shadow-sm'
                  : 'bg-white/90 border-amber-200 text-slate-600 hover:border-violet-300 hover:text-violet-600',
              ].join(' ')}
            >
              <Sparkles
                className={`h-3.5 w-3.5 ${superMode ? 'text-amber-200' : 'text-violet-500'}`}
                aria-hidden="true"
              />
              <span>{t(lang, 'home.superMode')}</span>
              <span
                aria-hidden="true"
                className={[
                  'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors',
                  superMode ? 'bg-slate-900/35' : 'bg-slate-200',
                ].join(' ')}
              >
                <span
                  className={[
                    'h-3 w-3 rounded-full bg-white shadow-xs transition-transform',
                    superMode ? 'translate-x-3' : 'translate-x-0',
                  ].join(' ')}
                />
              </span>
            </button>
          </div>

          {/* Distinct Bento Grid: Featured Quick Play Hero + 2 Side-by-Side Mode Cards */}
          <div className="flex flex-col gap-3.5">
            {/* Hero Card: Quick Play */}
            <button
              type="button"
              onClick={() => handleChooseSession('quick')}
              className="group flex items-center gap-4 rounded-3xl border-2 border-orange-200 border-b-[6px] border-b-orange-400 bg-gradient-to-r from-white via-orange-50/60 to-rose-50/70 p-4 sm:p-5 text-left bevel-25d transition-all duration-100 hover:from-orange-50/80 hover:to-rose-100/70 active:translate-y-[3px] active:border-b-2 cursor-pointer"
            >
              <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF8A65] to-[#F43F5E] border-b-4 border-[#BE123C] text-white shadow-sm">
                <Zap className="h-8 w-8 fill-white" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl sm:text-2xl font-extrabold text-slate-800">
                  {t(lang, 'home.quickMode')}
                </div>
                <p className="text-sm font-bold text-slate-500">
                  {t(lang, 'home.quickModeDesc')}
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-2xl bg-[#FF7A59] px-3.5 py-2 font-display text-sm font-extrabold text-white shadow-xs group-hover:translate-x-0.5 transition-transform">
                <Play className="h-4 w-4 fill-white" aria-hidden="true" />
              </span>
              <ChevronRight
                className="sm:hidden h-6 w-6 text-orange-400 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>

            {/* 2-Column Bento Row: Endless & Study Lab */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {/* Bento Card 2: Endless */}
              <button
                type="button"
                onClick={() => handleChooseSession('endless')}
                className="group flex flex-row sm:flex-col items-center sm:items-start justify-between gap-3.5 rounded-3xl border-2 border-violet-200 border-b-[6px] border-b-violet-400 bg-white p-4 sm:p-5 text-left bevel-25d transition-all duration-100 hover:bg-violet-50/60 active:translate-y-[3px] active:border-b-2 cursor-pointer"
              >
                <div className="flex w-auto sm:w-full items-center justify-between gap-2">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] border-b-4 border-[#4338CA] text-white shadow-sm">
                    <InfinityIcon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <div className="hidden sm:flex flex-wrap items-center justify-end gap-1.5">
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-extrabold text-rose-600">
                      <Heart className="h-3 w-3 fill-rose-500" aria-hidden="true" />
                      ×3
                    </span>
                    {bestEndlessScore > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                        <Trophy className="w-3 h-3 text-amber-500" aria-hidden="true" />
                        {t(lang, 'home.bestEndless', { count: bestEndlessScore })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1 sm:w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xl sm:text-2xl font-extrabold text-slate-800">
                      {t(lang, 'home.endlessMode')}
                    </span>
                    <span className="sm:hidden inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-extrabold text-rose-600">
                      <Heart className="h-3 w-3 fill-rose-500" aria-hidden="true" />
                      ×3
                    </span>
                    {bestEndlessScore > 0 && (
                      <span className="sm:hidden inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-extrabold text-amber-800">
                        <Trophy className="w-3 h-3 text-amber-500" aria-hidden="true" />
                        {t(lang, 'home.bestEndless', { count: bestEndlessScore })}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-bold text-slate-500">
                    {t(lang, 'home.endlessModeDesc')}
                  </p>
                </div>
                <ChevronRight
                  className="sm:hidden h-6 w-6 text-violet-400 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>

              {/* Bento Card 3: Study Lab */}
              <button
                type="button"
                onClick={() => handleChooseSession('practice')}
                className="group flex flex-row sm:flex-col items-center sm:items-start justify-between gap-3.5 rounded-3xl border-2 border-teal-200 border-b-[6px] border-b-teal-400 bg-white p-4 sm:p-5 text-left bevel-25d transition-all duration-100 hover:bg-teal-50/60 active:translate-y-[3px] active:border-b-2 cursor-pointer"
              >
                <div className="flex w-auto sm:w-full items-center justify-between gap-2">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#14B8A6] to-[#10B981] border-b-4 border-[#047857] text-white shadow-sm">
                    <GraduationCap className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <span className="hidden sm:inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-extrabold text-teal-800">
                    8 {t(lang, 'home.topics')}
                  </span>
                </div>
                <div className="min-w-0 flex-1 sm:w-full">
                  <div className="font-display text-xl sm:text-2xl font-extrabold text-slate-800">
                    {t(lang, 'home.practiceMode')}
                  </div>
                  <p className="mt-0.5 text-sm font-bold text-slate-500">
                    {t(lang, 'home.practiceModeDesc')}
                  </p>
                </div>
                <ChevronRight
                  className="sm:hidden h-6 w-6 text-teal-400 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>
        </motion.section>
      ) : (
        /* STEP 2: Clean, focused setup panel for the chosen mode */
        <motion.section
          key="mode-setup"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.16 }}
          className="flex flex-col gap-4"
        >
          {/* Setup sub-header with Back + Super Mode switch + Mode badge */}
          <div className="flex items-center justify-between gap-2">
            <Button25D
              color="white"
              size="sm"
              onClick={() => {
                soundEngine.playPop();
                setSelectedSession(null);
              }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{t(lang, 'game.back')}</span>
            </Button25D>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={superMode}
                data-testid="setup-super-mode-toggle"
                title={t(lang, 'home.superModeDesc')}
                onClick={() => {
                  soundEngine.playPop();
                  setSuperMode((prev) => !prev);
                }}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-display font-extrabold transition-all duration-150 cursor-pointer select-none',
                  superMode
                    ? 'bg-gradient-to-r from-violet-500 to-indigo-500 border-violet-600 text-white shadow-xs'
                    : 'bg-white/90 border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-600',
                ].join(' ')}
              >
                <Sparkles
                  className={`h-3.5 w-3.5 ${superMode ? 'text-amber-200' : 'text-violet-500'}`}
                  aria-hidden="true"
                />
                <span>{t(lang, 'home.superMode')}</span>
                <span
                  aria-hidden="true"
                  className={[
                    'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors',
                    superMode ? 'bg-slate-900/35' : 'bg-slate-200',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'h-3 w-3 rounded-full bg-white shadow-xs transition-transform',
                      superMode ? 'translate-x-3' : 'translate-x-0',
                    ].join(' ')}
                  />
                </span>
              </button>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-slate-200 px-3.5 py-1 font-display text-sm font-extrabold text-slate-700 shadow-xs">
                {selectedSession === 'quick' && (
                  <>
                    <Zap className="h-4 w-4 text-sky-500 fill-sky-400" aria-hidden="true" />
                    {t(lang, 'home.quickMode')}
                  </>
                )}
                {selectedSession === 'endless' && (
                  <>
                    <InfinityIcon className="h-4 w-4 text-rose-500" aria-hidden="true" />
                    {t(lang, 'home.endlessMode')}
                  </>
                )}
                {selectedSession === 'practice' && (
                  <>
                    <GraduationCap className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                    {t(lang, 'home.practiceMode')}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Study Lab only: WordCross vs Sentence Pop segmented pill */}
          {isPractice && (
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sky-100/85 border border-sky-200/80 p-1.5 shadow-inner">
              <button
                type="button"
                aria-pressed={mode === 'word-cross'}
                onClick={() => handleSelectMode('word-cross')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 font-display text-sm sm:text-base font-extrabold transition-all cursor-pointer',
                  mode === 'word-cross'
                    ? 'bg-white text-sky-700 shadow-sm border-b-2 border-sky-300'
                    : 'text-slate-700 hover:bg-white/60 hover:text-slate-900',
                ].join(' ')}
              >
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
                <span>{t(lang, 'home.wordCross')}</span>
              </button>

              <button
                type="button"
                aria-pressed={mode === 'sentence-pop'}
                onClick={() => handleSelectMode('sentence-pop')}
                className={[
                  'flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 font-display text-sm sm:text-base font-extrabold transition-all cursor-pointer',
                  mode === 'sentence-pop'
                    ? 'bg-white text-violet-700 shadow-sm border-b-2 border-violet-300'
                    : 'text-slate-700 hover:bg-white/60 hover:text-slate-900',
                ].join(' ')}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>{t(lang, 'home.sentencePop')}</span>
                <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-700">
                  {t(lang, 'home.studyLabBadge')}
                </span>
              </button>
            </div>
          )}

          <Card25D className="flex flex-col gap-4 p-4 sm:p-5">
            {/* CEFR Level (4 tiers) */}
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-base font-extrabold text-slate-700">
                {t(lang, 'home.level')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CEFR_LEVELS.map((tier) => {
                  const isSelected = level === tier;
                  const starCount = LEVEL_STARS[tier];
                  return (
                    <Button25D
                      key={tier}
                      color={isSelected ? (tier === 'B2C1' ? 'lavender' : 'sunny') : 'white'}
                      size="sm"
                      aria-pressed={isSelected}
                      onClick={() => handleSelectLevel(tier)}
                      className="flex-col gap-0.5 py-2 px-2"
                    >
                      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
                        {Array.from({ length: starCount }).map((_, idx) => (
                          <PlumpStar
                            key={idx}
                            className="w-3.5 h-3.5"
                            fill={
                              isSelected
                                ? tier === 'B2C1'
                                  ? '#FDE047'
                                  : '#FFFFFF'
                                : '#FACC15'
                            }
                          />
                        ))}
                      </span>
                      <span className="text-sm font-extrabold">{t(lang, `levels.${tier}`)}</span>
                      <span
                        className={`text-[11px] font-bold leading-tight ${
                          isSelected
                            ? tier === 'B2C1'
                              ? 'text-violet-100'
                              : 'text-amber-900/80'
                            : 'text-slate-400'
                        }`}
                      >
                        {t(lang, `levels.${tier}Desc`)}
                      </span>
                    </Button25D>
                  );
                })}
              </div>
            </div>

            {/* Study Lab Only: 8-Topic Multi-Select Grid */}
            {isPractice && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-extrabold text-slate-700">
                      {t(lang, 'home.topics')}
                    </h2>
                    {isMixActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-display font-bold text-amber-900">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                        {t(lang, 'home.mixActive')}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllTopics}
                    className="rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1 text-xs font-display font-extrabold text-sky-700 transition-colors cursor-pointer"
                  >
                    {t(lang, 'home.selectAll')}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ALL_TOPICS.map((topic) => {
                    const isSelected = topics.includes(topic);
                    const { color, Icon } = TOPIC_META[topic];
                    return (
                      <Button25D
                        key={topic}
                        color={isSelected ? color : 'white'}
                        size="sm"
                        aria-pressed={isSelected}
                        onClick={() => handleToggleTopic(topic)}
                        className="justify-start px-3 py-2.5 text-xs sm:text-sm"
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{t(lang, `topics.${topic}`)}</span>
                      </Button25D>
                    );
                  })}
                </div>

                {topics.length === 0 && (
                  <p className="text-xs sm:text-sm font-bold text-rose-500">
                    {t(lang, 'home.selectAtLeastOneTopic')}
                  </p>
                )}
              </div>
            )}
          </Card25D>

          {/* Giant Play CTA */}
          <Button25D
            color="mint"
            size="lg"
            fullWidth
            disabled={!canPlay}
            onClick={handleStartPlay}
            className="py-3.5 text-xl sm:text-2xl rounded-3xl"
          >
            <Play className="w-6 h-6 fill-current" aria-hidden="true" />
            <span>{t(lang, 'home.play')}</span>
          </Button25D>
        </motion.section>
      )}
    </div>
  );
}
