import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALL_TOPICS, type ProgressState } from '../../../engine/types';
import { createDefaultProgress } from '../../../storage/progressStore';
import { SplashScreen } from '../../../components/SplashScreen';
import { SettingsModal } from '../../../components/SettingsModal';
import { StatsModal } from '../../../components/StatsModal';
import { GuideModal } from '../../../components/GuideModal';
import { VictoryModal } from '../../../components/VictoryModal';
import { GameOverModal } from '../../../components/GameOverModal';
import { HomeHub, type HomeHubProps } from '../HomeHub';

function renderHomeHub(overrides: Partial<HomeHubProps> = {}) {
  const props: HomeHubProps = {
    lang: 'en',
    dailyStreak: 3,
    playedToday: true,
    bestEndlessScore: 7,
    isFullscreen: false,
    onToggleFullscreen: vi.fn(),
    onOpenSettings: vi.fn(),
    onStartPlay: vi.fn(),
    ...overrides,
  };
  return {
    ...render(<HomeHub {...props} />),
    props,
  };
}

describe('HomeHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Step 1 with WordPop logo, daily streak banner, Super Mode switch, 3 mode cards, and header buttons', async () => {
    const user = userEvent.setup();
    const { props } = renderHomeHub();

    expect(screen.getByRole('heading', { name: 'WordPop' })).toBeInTheDocument();
    expect(screen.getByTestId('daily-streak-banner')).toHaveTextContent('3 Day Streak!');
    expect(screen.getByTestId('super-mode-toggle')).toHaveAttribute('role', 'switch');
    expect(screen.getByTestId('super-mode-toggle')).toHaveAttribute('aria-checked', 'false');

    expect(screen.getByRole('button', { name: /Quick Play/i })).toBeInTheDocument();
    const endlessBtn = screen.getByRole('button', { name: /Endless/i });
    expect(endlessBtn).toBeInTheDocument();
    expect(endlessBtn).toHaveTextContent('×3');
    expect(screen.getByRole('button', { name: /Study Lab/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Fullscreen/i }));
    expect(props.onToggleFullscreen).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Settings/i }));
    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('hides Topic selector in Quick Play Step 2, shows 4 CEFR tiers, and starts with all 8 topics', async () => {
    const user = userEvent.setup();
    const { props } = renderHomeHub();

    await user.click(screen.getByRole('button', { name: /Quick Play/i }));

    // Topic selector and Study Lab mode toggle are hidden
    expect(screen.queryByRole('button', { name: /Sentence Pop/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Daily Life/i })).not.toBeInTheDocument();

    // 4 CEFR tiers shown
    expect(screen.getByRole('button', { name: /A1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /A2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /B1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /B2–C1/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /B1/i }));
    await user.click(screen.getByRole('button', { name: /Play!/i }));

    expect(props.onStartPlay).toHaveBeenCalledWith({
      mode: 'word-cross',
      sessionMode: 'quick',
      inputMode: 'tray',
      level: 'B1',
      topics: [...ALL_TOPICS],
    });
  });

  it('passes inputMode keyboard when Super Mode is toggled on', async () => {
    const user = userEvent.setup();
    const { props } = renderHomeHub();

    await user.click(screen.getByTestId('super-mode-toggle'));
    expect(screen.getByTestId('super-mode-toggle')).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('button', { name: /Endless/i }));
    expect(screen.getByTestId('setup-super-mode-toggle')).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByRole('button', { name: /Daily Life/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Play!/i }));

    expect(props.onStartPlay).toHaveBeenCalledWith({
      mode: 'word-cross',
      sessionMode: 'endless',
      inputMode: 'keyboard',
      level: 'A1',
      topics: [...ALL_TOPICS],
    });
  });

  it('shows WordCross / Sentence Pop toggle and 8-topic multi-select in Study Lab, disabling Play when 0 topics selected', async () => {
    const user = userEvent.setup();
    const { props } = renderHomeHub();

    await user.click(screen.getByRole('button', { name: /Study Lab/i }));

    const wordCrossBtn = screen.getByRole('button', { name: /Word Cross/i });
    const sentencePopBtn = screen.getByRole('button', { name: /Sentence Pop/i });
    expect(wordCrossBtn).toHaveAttribute('aria-pressed', 'true');
    expect(sentencePopBtn).toHaveAttribute('aria-pressed', 'false');

    // All 8 topics are visible
    const topicButtons = [
      screen.getByRole('button', { name: /Daily Life/i }),
      screen.getByRole('button', { name: /Food & Drink/i }),
      screen.getByRole('button', { name: /Travel/i }),
      screen.getByRole('button', { name: /Nature/i }),
      screen.getByRole('button', { name: /Work & Study/i }),
      screen.getByRole('button', { name: /Technology/i }),
      screen.getByRole('button', { name: /Feelings/i }),
      screen.getByRole('button', { name: /Culture/i }),
    ];
    expect(topicButtons).toHaveLength(8);

    // Deselect any initially selected topics until 0 remain -> Play disabled
    for (const btn of topicButtons) {
      if (btn.getAttribute('aria-pressed') === 'true') {
        await user.click(btn);
      }
    }

    const playBtn = screen.getByRole('button', { name: /Play!/i });
    expect(playBtn).toBeDisabled();
    expect(screen.getByText(/Please select at least one topic/i)).toBeInTheDocument();

    // Select 2 topics -> Mix badge appears and Play is enabled
    await user.click(screen.getByRole('button', { name: /Travel/i }));
    await user.click(screen.getByRole('button', { name: /Tech/i }));
    expect(screen.getByText('Mix Mode!')).toBeInTheDocument();
    expect(playBtn).toBeEnabled();

    // Select All convenience button selects all 8 topics
    await user.click(screen.getByRole('button', { name: /Select All/i }));
    for (const btn of topicButtons) {
      expect(btn).toHaveAttribute('aria-pressed', 'true');
    }

    // Switch to Sentence Pop and Play
    await user.click(sentencePopBtn);
    expect(sentencePopBtn).toHaveAttribute('aria-pressed', 'true');
    await user.click(playBtn);

    expect(props.onStartPlay).toHaveBeenCalledWith({
      mode: 'sentence-pop',
      sessionMode: 'practice',
      inputMode: 'tray',
      level: 'A1',
      topics: [...ALL_TOPICS],
    });
  });

  it('renders Vietnamese UI when lang is vi', () => {
    renderHomeHub({ lang: 'vi', dailyStreak: 5, playedToday: true });

    expect(screen.getByTestId('daily-streak-banner')).toHaveTextContent('Chuỗi 5 ngày!');
    expect(screen.getByText('Chơi Nhanh')).toBeInTheDocument();
    expect(screen.getByText('Vô Hạn')).toBeInTheDocument();
    expect(screen.getByText('Luyện Tập')).toBeInTheDocument();
  });
});

describe('SplashScreen & Modals', () => {
  it('renders SplashScreen with initialReady={true}, enables START, and calls onStart', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<SplashScreen lang="en" onStart={onStart} initialReady />);

    expect(screen.getByRole('heading', { name: 'WordPop' })).toBeInTheDocument();
    const startBtn = screen.getByTestId('splash-start-btn');
    expect(startBtn).toBeEnabled();
    await user.click(startBtn);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders SettingsModal with Music -> Sound -> Language -> Stats -> Guide in exact DOM order and no Parents/Pro button', () => {
    const onOpenStats = vi.fn();
    const onOpenGuide = vi.fn();
    const onChangeMusicVolume = vi.fn();
    const onChangeSoundVolume = vi.fn();
    render(
      <SettingsModal
        open
        lang="en"
        soundEnabled
        musicEnabled
        soundVolume={0.8}
        musicVolume={0.6}
        onToggleLang={vi.fn()}
        onToggleSound={vi.fn()}
        onToggleMusic={vi.fn()}
        onChangeSoundVolume={onChangeSoundVolume}
        onChangeMusicVolume={onChangeMusicVolume}
        onOpenStats={onOpenStats}
        onOpenGuide={onOpenGuide}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByTestId('settings-modal');
    const text = dialog.textContent ?? '';
    const idxMusic = text.indexOf('Background Music');
    const idxSound = text.indexOf('Sound Effects');
    const idxLang = text.indexOf('Language');
    const idxStats = text.indexOf('Learning Stats');
    const idxGuide = text.indexOf('Guide & Explanations');

    expect(idxMusic).toBeGreaterThan(-1);
    expect(idxSound).toBeGreaterThan(idxMusic);
    expect(idxLang).toBeGreaterThan(idxSound);
    expect(idxStats).toBeGreaterThan(idxLang);
    expect(idxGuide).toBeGreaterThan(idxStats);

    expect(screen.queryByText(/Parents/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pro/i)).not.toBeInTheDocument();

    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(2);
    fireEvent.change(sliders[0], { target: { value: '50' } });
    expect(onChangeMusicVolume).toHaveBeenCalledWith(0.5);
  });

  it('renders VictoryModal with Review button and triggers onReview, onNext, and onHome', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const onReview = vi.fn();
    const onHome = vi.fn();

    render(
      <VictoryModal
        open
        stars={3}
        streak={4}
        elapsedSeconds={65}
        lang="en"
        onNext={onNext}
        onReview={onReview}
        onHome={onHome}
      />,
    );

    expect(screen.getByText('Awesome Job!')).toBeInTheDocument();
    expect(screen.getByText('01:05')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Review/i }));
    expect(onReview).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Next Puzzle/i }));
    expect(onNext).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Home/i }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it('renders StatsModal with KPIs, mastered count, CEFR bars, and 2-step reset', async () => {
    const user = userEvent.setup();
    const onResetProgress = vi.fn();
    const progress: ProgressState = {
      ...createDefaultProgress(),
      settings: { lang: 'en', soundEnabled: true, musicEnabled: true },
      words: {
        'word:a1': { key: 'word:a1', attempts: 4, correct: 4, streak: 4, lastMissedOrHint: false, dueAt: 9999999999999 },
        'word:a2': { key: 'word:a2', attempts: 2, correct: 1, streak: 0, lastMissedOrHint: true, dueAt: 0 },
      },
      stats: {
        puzzlesSolved: 12,
        totalAttempts: 20,
        totalCorrect: 17,
        currentStreak: 3,
        bestStreak: 6,
        byLevel: {
          A1: { attempts: 10, correct: 9 },
          A2: { attempts: 6, correct: 5 },
          B1: { attempts: 4, correct: 3 },
          B2C1: { attempts: 0, correct: 0 },
        },
      },
    };

    render(<StatsModal open progress={progress} onResetProgress={onResetProgress} onClose={vi.fn()} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 word mastered
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('A1')).toBeInTheDocument();
    expect(screen.getByText('B2–C1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reset Progress/i }));
    expect(onResetProgress).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Tap again to confirm reset/i }));
    expect(onResetProgress).toHaveBeenCalledTimes(1);
  });

  it('renders GuideModal and GameOverModal properly', async () => {
    const user = userEvent.setup();
    const onCloseGuide = vi.fn();
    const { rerender } = render(<GuideModal open lang="en" onClose={onCloseGuide} />);

    expect(screen.getByText('Word Cross')).toBeInTheDocument();
    expect(screen.getByText('Sentence Pop (Study Lab)')).toBeInTheDocument();
    expect(screen.getByText('Super Mode (Free Input)')).toBeInTheDocument();
    expect(screen.getByText('Endless Mode')).toBeInTheDocument();
    expect(screen.getByText('Daily Streak & Spaced Review')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Got it!/i }));
    expect(onCloseGuide).toHaveBeenCalledTimes(1);

    const onRetry = vi.fn();
    const onHome = vi.fn();
    rerender(
      <GameOverModal
        open
        lang="en"
        puzzlesCleared={9}
        bestScore={9}
        isNewRecord
        onRetry={onRetry}
        onHome={onHome}
      />,
    );

    expect(screen.getByText('Out of Hearts!')).toBeInTheDocument();
    expect(screen.getByText('New Best Record!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /Home/i }));
    expect(onHome).toHaveBeenCalledTimes(1);
  });
});
