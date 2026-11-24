import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALL_TOPICS, type PlayConfig, type VocabEntry } from '../../../engine/types';
import { PopMatchScreen } from '../PopMatchScreen';

const SAMPLE_WORDS: VocabEntry[] = [
  {
    id: 't-apple',
    word: 'apple',
    ipa: '/ˈæp.əl/',
    pos: 'n.',
    level: 'A1',
    topic: 'food',
    en: 'Crisp red fruit',
    vi: 'Quả táo',
    example: 'She ate an apple.',
    exampleVi: 'Cô ấy ăn một quả táo.',
  },
  {
    id: 't-clock',
    word: 'clock',
    ipa: '/klɒk/',
    pos: 'n.',
    level: 'A1',
    topic: 'daily',
    en: 'Shows the time',
    vi: 'Đồng hồ',
    example: 'Check the clock.',
    exampleVi: 'Xem đồng hồ.',
  },
  {
    id: 't-river',
    word: 'river',
    ipa: '/ˈrɪv.ər/',
    pos: 'n.',
    level: 'A1',
    topic: 'nature',
    en: 'Flowing water',
    vi: 'Dòng sông',
    example: 'The river is wide.',
    exampleVi: 'Dòng sông rộng.',
  },
  {
    id: 't-train',
    word: 'train',
    ipa: '/treɪn/',
    pos: 'n.',
    level: 'A1',
    topic: 'travel',
    en: 'Rail vehicle',
    vi: 'Tàu hỏa',
    example: 'The train arrived.',
    exampleVi: 'Tàu hỏa đã đến.',
  },
];

describe('PopMatchScreen', () => {
  it('matches pairs, increments combo, completes round with VictoryModal, and opens WordReviewList on Review', async () => {
    const user = userEvent.setup();
    const onRecordAttempt = vi.fn();
    const onAwardStars = vi.fn();
    const config: PlayConfig = {
      mode: 'pop-match',
      sessionMode: 'practice',
      inputMode: 'tray',
      level: 'A1',
      topics: [...ALL_TOPICS],
      customWords: SAMPLE_WORDS,
    };

    render(
      <PopMatchScreen
        config={config}
        lang="vi"
        prioritizedWordKeys={[]}
        onRecordAttempt={onRecordAttempt}
        onAwardStars={onAwardStars}
        onBack={vi.fn()}
        seedOverride={42}
      />
    );

    expect(screen.getByTestId('pop-match-board')).toBeInTheDocument();
    expect(screen.getByTestId('pop-match-progress')).toHaveTextContent('0/4');

    for (const entry of SAMPLE_WORDS) {
      await user.click(screen.getByTestId(`match-left-${entry.id}`));
      await user.click(screen.getByTestId(`match-right-${entry.id}`));
    }

    expect(screen.getByTestId('pop-match-combo')).toHaveTextContent('×4');

    await waitFor(() => {
      expect(onAwardStars).toHaveBeenCalledWith(3);
    });
    expect(onRecordAttempt).toHaveBeenCalledWith(
      expect.arrayContaining(['t-apple', 't-clock', 't-river', 't-train']),
      'A1',
      { correct: true, usedHint: false }
    );

    // Open Review Mode and verify IPA + Review Banner
    await user.click(screen.getByRole('button', { name: /Xem Lại/i }));
    expect(screen.getByTestId('review-banner')).toBeInTheDocument();
    expect(screen.getByText('/ˈæp.əl/')).toBeInTheDocument();
  });

  it('hides English words in Super Mode (audio-only listening challenge)', () => {
    const config: PlayConfig = {
      mode: 'pop-match',
      sessionMode: 'practice',
      inputMode: 'keyboard',
      level: 'A1',
      topics: [...ALL_TOPICS],
      customWords: SAMPLE_WORDS,
    };

    render(
      <PopMatchScreen
        config={config}
        lang="vi"
        prioritizedWordKeys={[]}
        onRecordAttempt={vi.fn()}
        onAwardStars={vi.fn()}
        onBack={vi.fn()}
        seedOverride={42}
      />
    );

    // Words are hidden behind "Nghe" audio buttons on the left column
    expect(screen.queryByText('apple')).not.toBeInTheDocument();
    expect(screen.getAllByText('Nghe').length).toBe(4);
  });
});
