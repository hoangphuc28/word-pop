import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Briefcase,
  Cpu,
  Flame,
  FolderHeart,
  Globe2,
  Home,
  Leaf,
  type LucideIcon,
  Maximize2,
  Minimize2,
  Plane,
  Play,
  Settings,
  Smile,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { Button25D, type Button25DColor } from '../../components/Button25D';
import { Card25D } from '../../components/Card25D';
import {
  ALL_TOPICS,
  CEFR_LEVELS,
  type CefrLevel,
  type GameMode,
  type PlayConfig,
  type VocabTopic,
  type WordDeck,
} from '../../engine/types';
import { type Lang, t } from '../../i18n';

export interface HomeHubProps {
  lang: Lang;
  dailyStreak?: number;
  playedToday?: boolean;
  isFullscreen?: boolean;
  playableDecks?: WordDeck[];
  onOpenDecks?: () => void;
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

const LEVEL_META: Record<
  CefrLevel,
  {
    labelKey: 'levels.A1' | 'levels.A2' | 'levels.B1' | 'levels.B2' | 'levels.C1';
    descKey:
      | 'levels.A1Desc'
      | 'levels.A2Desc'
      | 'levels.B1Desc'
      | 'levels.B2Desc'
      | 'levels.C1Desc';
    activeColor: Button25DColor;
  }
> = {
  A1: { labelKey: 'levels.A1', descKey: 'levels.A1Desc', activeColor: 'sunny' },
  A2: { labelKey: 'levels.A2', descKey: 'levels.A2Desc', activeColor: 'sunny' },
  B1: { labelKey: 'levels.B1', descKey: 'levels.B1Desc', activeColor: 'coral' },
  B2: { labelKey: 'levels.B2', descKey: 'levels.B2Desc', activeColor: 'lavender' },
  C1: { labelKey: 'levels.C1', descKey: 'levels.C1Desc', activeColor: 'lavender' },
};

export function HomeHub({
  lang,
  dailyStreak = 0,
  playedToday = false,
  isFullscreen = false,
  playableDecks = [],
  onOpenDecks,
  onToggleFullscreen,
  onOpenSettings,
  onStartPlay,
}: HomeHubProps): React.JSX.Element {
  const [mode, setMode] = useState<GameMode>('pop-match');
  const [superMode, setSuperMode] = useState(false);
  const [wordSource, setWordSource] = useState<'cefr' | 'deck'>('cefr');
  const [level, setLevel] = useState<CefrLevel>('A1');
  const [topics, setTopics] = useState<VocabTopic[]>([...ALL_TOPICS]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(
    () => playableDecks[0]?.id ?? null
  );

  const activeDeck =
    playableDecks.find((d) => d.id === selectedDeckId) ?? playableDecks[0] ?? null;

  const isMixActive = topics.length >= 2;
  const canPlay =
    wordSource === 'cefr' ? topics.length > 0 : activeDeck !== null && activeDeck.words.length >= 2;

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
    setTopics((prev) =>
      prev.includes(topic) ? prev.filter((item) => item !== topic) : [...prev, topic]
    );
  }

  function handleSelectAllTopics(): void {
    soundEngine.playPop();
    setTopics([...ALL_TOPICS]);
  }

  function handleStartPlay(): void {
    if (!canPlay) return;
    soundEngine.playPop();

    if (wordSource === 'deck' && activeDeck) {
      onStartPlay({
        mode,
        sessionMode: 'practice',
        inputMode: superMode ? 'keyboard' : 'tray',
        level: activeDeck.level,
        topics: [...ALL_TOPICS],
        deckId: activeDeck.id,
        deckName: activeDeck.name,
        customWords: activeDeck.words,
      });
      return;
    }

    onStartPlay({
      mode,
      sessionMode: 'practice',
      inputMode: superMode ? 'keyboard' : 'tray',
      level,
      topics: [...topics],
    });
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 lg:px-10 py-5 sm:py-6 flex flex-col gap-4 lg:gap-5">
      {/* Header — Sunset WordPop Logo + Word Decks + Fullscreen + Settings */}
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
          {onOpenDecks && (
            <Button25D
              color="lavender"
              size="sm"
              data-testid="open-decks-btn"
              onClick={() => {
                soundEngine.playPop();
                onOpenDecks();
              }}
              className="px-3 py-2.5"
            >
              <FolderHeart className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t(lang, 'home.manageDecks')}</span>
            </Button25D>
          )}

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

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        className="flex flex-col gap-4"
      >
        {/* Daily Streak Banner */}
        <div
          data-testid="daily-streak-banner"
          className="flex items-center justify-between gap-3 rounded-3xl border-2 border-amber-200 border-b-[5px] border-b-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/90 to-rose-50/80 px-5 py-3.5 shadow-sm"
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
              <p className="text-xs sm:text-sm font-bold text-amber-800/80">
                {playedToday
                  ? t(lang, 'home.dailyStreakActive')
                  : t(lang, 'home.dailyStreakPrompt')}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, idx) => {
              const lit = idx < Math.min(7, dailyStreak);
              return (
                <span
                  key={idx}
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all',
                    lit
                      ? 'bg-gradient-to-b from-amber-400 to-orange-500 border-orange-500 text-white shadow-xs'
                      : 'bg-white/80 border-amber-200 text-amber-200',
                  ].join(' ')}
                >
                  <Flame className={`h-3.5 w-3.5 ${lit ? 'fill-white' : ''}`} />
                </span>
              );
            })}
          </div>
        </div>

        {/* Focused Practice Studio */}
        <Card25D className="flex flex-col gap-4 border-amber-200/80 bg-white/95 p-4 sm:p-5">
          {/* Row 1: Game Mode + Super Mode Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="grid flex-1 min-w-[220px] grid-cols-2 gap-1.5 rounded-2xl bg-amber-100/70 border border-amber-200/80 p-1 shadow-inner">
              <button
                type="button"
                aria-pressed={mode === 'pop-match'}
                onClick={() => handleSelectMode('pop-match')}
                className={[
                  'flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 font-display text-sm font-extrabold transition-all cursor-pointer',
                  mode === 'pop-match'
                    ? 'bg-white text-rose-700 shadow-sm border-b-2 border-rose-300'
                    : 'text-slate-700 hover:bg-white/60',
                ].join(' ')}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>{t(lang, 'home.popMatch')}</span>
              </button>

              <button
                type="button"
                aria-pressed={mode === 'sentence-pop'}
                onClick={() => handleSelectMode('sentence-pop')}
                className={[
                  'flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 font-display text-sm font-extrabold transition-all cursor-pointer',
                  mode === 'sentence-pop'
                    ? 'bg-white text-violet-700 shadow-sm border-b-2 border-violet-300'
                    : 'text-slate-700 hover:bg-white/60',
                ].join(' ')}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                <span>{t(lang, 'home.sentencePop')}</span>
              </button>
            </div>

            {/* Inline Super Mode Switch */}
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
                'inline-flex items-center gap-2 rounded-full border-2 px-3 py-2 text-xs sm:text-sm font-display font-extrabold transition-all duration-150 cursor-pointer select-none',
                superMode
                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 border-violet-600 text-white shadow-sm'
                  : 'bg-white border-amber-200 text-slate-600 hover:border-violet-300 hover:text-violet-600',
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

          {/* Row 2: Word Source Switch (CEFR A1–C1 vs My & Downloaded Decks) */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-extrabold text-slate-700">
                {t(lang, 'home.wordSource')}
              </h2>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-0.5">
                <button
                  type="button"
                  aria-pressed={wordSource === 'cefr'}
                  onClick={() => {
                    soundEngine.playPop();
                    setWordSource('cefr');
                  }}
                  className={[
                    'rounded-lg px-3 py-1 font-display text-xs font-extrabold transition-all cursor-pointer',
                    wordSource === 'cefr'
                      ? 'bg-white text-rose-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900',
                  ].join(' ')}
                >
                  {t(lang, 'home.cefrTab')}
                </button>
                <button
                  type="button"
                  aria-pressed={wordSource === 'deck'}
                  onClick={() => {
                    soundEngine.playPop();
                    setWordSource('deck');
                  }}
                  className={[
                    'rounded-lg px-3 py-1 font-display text-xs font-extrabold transition-all cursor-pointer',
                    wordSource === 'deck'
                      ? 'bg-white text-violet-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900',
                  ].join(' ')}
                >
                  {t(lang, 'home.decksTab')} ({playableDecks.length})
                </button>
              </div>
            </div>

            {wordSource === 'cefr' ? (
              <>
                {/* 5 Standard CEFR Levels: A1, A2, B1, B2, C1 (clean, no stars) */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {CEFR_LEVELS.map((lvl) => {
                    const meta = LEVEL_META[lvl];
                    const isSelected = level === lvl;
                    return (
                      <Button25D
                        key={lvl}
                        color={isSelected ? meta.activeColor : 'white'}
                        size="sm"
                        aria-pressed={isSelected}
                        onClick={() => handleSelectLevel(lvl)}
                        className="flex-col gap-0.5 py-2.5 px-2"
                      >
                        <span className="text-base font-extrabold leading-tight">
                          {t(lang, meta.labelKey)}
                        </span>
                        <span
                          className={`text-[11px] font-bold leading-none ${
                            isSelected
                              ? meta.activeColor === 'sunny'
                                ? 'text-amber-950/80'
                                : 'text-white/90'
                              : 'text-slate-400'
                          }`}
                        >
                          {t(lang, meta.descKey)}
                        </span>
                      </Button25D>
                    );
                  })}
                </div>

                {/* 8 Topics Multi-Select */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm font-extrabold text-slate-600">
                        {t(lang, 'home.topics')}
                      </h3>
                      {isMixActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-display font-bold text-amber-900">
                          <Sparkles className="w-3 h-3 text-amber-500" aria-hidden="true" />
                          {t(lang, 'home.mixActive')}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleSelectAllTopics}
                      className="text-xs font-extrabold text-rose-600 hover:underline cursor-pointer"
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
                          className="justify-start px-2.5 py-2 text-xs sm:text-sm"
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{t(lang, `topics.${topic}`)}</span>
                        </Button25D>
                      );
                    })}
                  </div>

                  {topics.length === 0 && (
                    <p className="text-xs font-bold text-rose-500">
                      {t(lang, 'home.selectAtLeastOneTopic')}
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* Custom & Downloaded Word Decks Picker */
              <div className="flex flex-col gap-2.5">
                {playableDecks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {playableDecks.map((deck) => {
                      const isSelected = activeDeck?.id === deck.id;
                      return (
                        <button
                          key={deck.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            soundEngine.playPop();
                            setSelectedDeckId(deck.id);
                          }}
                          className={[
                            'flex items-center justify-between gap-2 rounded-2xl border-2 border-b-[4px] p-3 text-left transition-all cursor-pointer',
                            isSelected
                              ? 'bg-violet-50 border-violet-400 border-b-violet-500'
                              : 'bg-white border-slate-200 border-b-slate-300 hover:border-violet-300',
                          ].join(' ')}
                        >
                          <div className="min-w-0">
                            <div className="font-display text-sm sm:text-base font-extrabold text-slate-800 truncate">
                              {deck.name}
                            </div>
                            <p className="text-xs font-bold text-slate-500">
                              {deck.level} · {deck.words.length} {t(lang, 'decks.wordsUnit')} ·{' '}
                              {deck.author}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-extrabold text-violet-700">
                            {deck.level}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-5 text-center">
                    <p className="text-sm font-bold text-slate-600">
                      {t(lang, 'home.noDecksYet')}
                    </p>
                    {onOpenDecks && (
                      <Button25D
                        color="lavender"
                        size="sm"
                        onClick={onOpenDecks}
                        className="mt-3"
                      >
                        <FolderHeart className="h-4 w-4" aria-hidden="true" />
                        <span>{t(lang, 'home.openDeckLibrary')}</span>
                      </Button25D>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Card25D>

        {/* Giant Play CTA */}
        <Button25D
          color="coral"
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
    </div>
  );
}
