import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { speechEngine } from '../../../audio/speechEngine';
import { generateSentencePop } from '../../../engine/sentencePopGenerator';
import { ALL_TOPICS, type PlayConfig } from '../../../engine/types';
import { SentencePopScreen, type SentencePopScreenProps } from '../SentencePopScreen';

const FIXED_SEED = 7777;

function createConfig(overrides: Partial<PlayConfig> = {}): PlayConfig {
  return {
    mode: 'sentence-pop',
    sessionMode: 'practice',
    inputMode: 'tray',
    level: 'A1',
    topics: [...ALL_TOPICS],
    ...overrides,
  };
}

function renderSentencePop(overrides: Partial<SentencePopScreenProps> = {}) {
  const props: SentencePopScreenProps = {
    config: createConfig(),
    lang: 'en',
    prioritizedWordKeys: [],
    onRecordAttempt: vi.fn(),
    onAwardStars: vi.fn(),
    onBack: vi.fn(),
    seedOverride: FIXED_SEED,
    ...overrides,
  };
  return {
    ...render(<SentencePopScreen {...props} />),
    props,
  };
}

describe('SentencePopScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Standard Mode: tapping a chip places it without auto-submitting, wrong Check shows invalid feedback, right Check opens VictoryModal & Review', async () => {
    const user = userEvent.setup();
    const speakSpy = vi.spyOn(speechEngine, 'speak').mockImplementation(() => {});
    const config = createConfig({ inputMode: 'tray', level: 'A1' });
    const expectedPuzzle = generateSentencePop({
      level: config.level,
      topics: config.topics,
      seed: FIXED_SEED,
    });
    const targetWord = expectedPuzzle.vocab.word.toLowerCase();
    const wrongWord = expectedPuzzle.choices.find((c) => c.toLowerCase() !== targetWord)!;

    const { props } = renderSentencePop({ config });

    const checkBtn = screen.getByRole('button', { name: /Check/i });
    expect(checkBtn).toBeDisabled();

    // Tap a wrong chip -> places it in slot WITHOUT auto-submitting
    const choicesBox = screen.getByTestId('sentence-pop-choices');
    await user.click(within(choicesBox).getByRole('button', { name: wrongWord }));

    expect(screen.getByTestId('sentence-slot')).toHaveTextContent(wrongWord);
    expect(screen.queryByTestId('victory-modal')).not.toBeInTheDocument();
    expect(props.onRecordAttempt).not.toHaveBeenCalled();
    expect(checkBtn).toBeEnabled();

    // Clicking Check with wrong chip shows invalid feedback and records failed attempt
    await user.click(checkBtn);
    expect(screen.getByTestId('sentence-slot')).toHaveAttribute('data-invalid', 'true');
    expect(screen.queryByTestId('victory-modal')).not.toBeInTheDocument();
    expect(props.onRecordAttempt).toHaveBeenCalledWith(
      [expectedPuzzle.vocab.id],
      expectedPuzzle.level,
      { correct: false, usedHint: false },
    );

    // Tap the correct chip to swap -> still does NOT auto-submit
    await user.click(within(choicesBox).getByRole('button', { name: targetWord }));
    expect(screen.getByTestId('sentence-slot')).toHaveTextContent(targetWord);
    expect(screen.queryByTestId('victory-modal')).not.toBeInTheDocument();

    // Click Check -> opens VictoryModal
    await user.click(checkBtn);
    expect(screen.getByTestId('victory-modal')).toBeInTheDocument();
    expect(props.onRecordAttempt).toHaveBeenLastCalledWith(
      [expectedPuzzle.vocab.id],
      expectedPuzzle.level,
      { correct: true, usedHint: false },
    );
    expect(props.onAwardStars).toHaveBeenCalledTimes(1);
    expect(props.onAwardStars).toHaveBeenCalledWith(2);

    // Click Review -> closes modal, shows WordReviewList and full-sentence audio
    await user.click(screen.getByRole('button', { name: /Review/i }));
    expect(screen.queryByTestId('victory-modal')).not.toBeInTheDocument();

    const reviewList = screen.getByTestId('word-review-list');
    expect(within(reviewList).getByText(expectedPuzzle.vocab.ipa)).toBeInTheDocument();

    const sentenceListenBtn = screen.getByTestId('sentence-listen-btn');
    await user.click(sentenceListenBtn);
    expect(speakSpy).toHaveBeenCalledWith(expectedPuzzle.vocab.example);
  });

  it('Super Mode: hides word chips, renders QwertyBar25D, protects hinted letters, and solves when typing target word + Check', async () => {
    const user = userEvent.setup();
    const config = createConfig({ inputMode: 'keyboard', level: 'A1' });
    const expectedPuzzle = generateSentencePop({
      level: config.level,
      topics: config.topics,
      seed: FIXED_SEED,
    });
    const targetLetters = expectedPuzzle.vocab.word.toUpperCase().split('');

    const { container, props } = renderSentencePop({ config });

    // No word chips and no native <input>
    expect(screen.queryByTestId('sentence-pop-choices')).not.toBeInTheDocument();
    expect(container.querySelector('input')).toBeNull();
    const qwerty = screen.getByRole('group', { name: 'Letter keyboard' });
    expect(qwerty).toBeInTheDocument();

    // Use Hint to lock the first letter (index 0)
    await user.click(screen.getByRole('button', { name: /Hint/i }));
    const firstBox = screen.getByTestId('letter-box-0');
    expect(firstBox).toHaveAttribute('data-hinted', 'true');
    expect(firstBox).toHaveTextContent(targetLetters[0]);

    // Attempting Backspace or typing must NOT overwrite hinted letter box 0
    await user.click(within(qwerty).getByRole('button', { name: 'Backspace' }));
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(firstBox).toHaveTextContent(targetLetters[0]);

    // Type remaining letters using a mix of QwertyBar25D and physical keydown
    for (let i = 1; i < targetLetters.length; i++) {
      const ch = targetLetters[i];
      if (i % 2 === 1) {
        await user.click(within(qwerty).getByRole('button', { name: ch }));
      } else {
        fireEvent.keyDown(window, { key: ch });
      }
    }

    const checkBtn = screen.getByRole('button', { name: /Check/i });
    expect(checkBtn).toBeEnabled();
    await user.click(checkBtn);

    expect(screen.getByTestId('victory-modal')).toBeInTheDocument();
    expect(props.onRecordAttempt).toHaveBeenCalledWith(
      [expectedPuzzle.vocab.id],
      expectedPuzzle.level,
      { correct: true, usedHint: true },
    );
    expect(props.onAwardStars).toHaveBeenCalledWith(2);
  });

  it('awards 3★ flawless and 1★ after 2+ mistakes', async () => {
    const user = userEvent.setup();
    const config = createConfig({ inputMode: 'tray', level: 'A1' });
    const expectedPuzzle = generateSentencePop({
      level: config.level,
      topics: config.topics,
      seed: FIXED_SEED,
    });
    const targetWord = expectedPuzzle.vocab.word.toLowerCase();
    const wrongWord = expectedPuzzle.choices.find((c) => c.toLowerCase() !== targetWord)!;

    // Flawless -> 3★
    const flawless = renderSentencePop({ config });
    const choicesBox1 = screen.getByTestId('sentence-pop-choices');
    await user.click(within(choicesBox1).getByRole('button', { name: targetWord }));
    await user.click(screen.getByRole('button', { name: /Check/i }));
    expect(screen.getByTestId('victory-modal')).toBeInTheDocument();
    expect(flawless.props.onAwardStars).toHaveBeenCalledWith(3);
    flawless.unmount();

    // 2 mistakes -> 1★
    const twoMistakes = renderSentencePop({ config });
    const choicesBox2 = screen.getByTestId('sentence-pop-choices');
    await user.click(within(choicesBox2).getByRole('button', { name: wrongWord }));
    const checkBtn = screen.getByRole('button', { name: /Check/i });
    await user.click(checkBtn);
    await user.click(checkBtn);
    await user.click(within(choicesBox2).getByRole('button', { name: targetWord }));
    await user.click(checkBtn);
    expect(screen.getByTestId('victory-modal')).toBeInTheDocument();
    expect(twoMistakes.props.onAwardStars).toHaveBeenCalledWith(1);
  });
});
