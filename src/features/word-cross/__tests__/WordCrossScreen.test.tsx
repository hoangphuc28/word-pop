import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { speechEngine } from '../../../audio/speechEngine';
import { generateWordCross } from '../../../engine/wordCrossGenerator';
import { ALL_TOPICS, type PlayConfig } from '../../../engine/types';
import { WordCrossScreen, type WordCrossScreenProps } from '../WordCrossScreen';

const FIXED_SEED = 4242;

function createConfig(overrides: Partial<PlayConfig> = {}): PlayConfig {
  return {
    mode: 'word-cross',
    sessionMode: 'quick',
    inputMode: 'tray',
    level: 'A1',
    topics: [...ALL_TOPICS],
    ...overrides,
  };
}

function renderWordCross(overrides: Partial<WordCrossScreenProps> = {}) {
  const props: WordCrossScreenProps = {
    config: createConfig(),
    lang: 'en',
    prioritizedWordKeys: [],
    onRecordAttempt: vi.fn(),
    onAwardStars: vi.fn(),
    bestEndlessScore: 0,
    onEndlessScore: vi.fn(),
    onBack: vi.fn(),
    seedOverride: FIXED_SEED,
    ...overrides,
  };
  return {
    ...render(<WordCrossScreen {...props} />),
    props,
  };
}

describe('WordCrossScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Standard Mode: renders clues & tray, places letters to solve, opens VictoryModal, and shows WordReviewList on Review', async () => {
    const user = userEvent.setup();
    const speakSpy = vi.spyOn(speechEngine, 'speak').mockImplementation(() => {});
    const config = createConfig({ sessionMode: 'quick', inputMode: 'tray', level: 'A1' });
    const expectedPuzzle = generateWordCross({
      level: config.level,
      topics: config.topics,
      seed: FIXED_SEED,
    });

    const { props } = renderWordCross({ config });

    // Clues and letter tray are rendered
    expect(screen.getByTestId('word-cross-clues')).toBeInTheDocument();
    const tray = screen.getByTestId('word-cross-tray');
    expect(tray).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Letter keyboard' })).not.toBeInTheDocument();

    // Check button disabled until all blanks are filled
    const checkBtn = screen.getByRole('button', { name: /Check/i });
    expect(checkBtn).toBeDisabled();

    // Fill every blank by tapping blank cell -> tapping matching available tray tile
    for (const cellId of expectedPuzzle.blankCellIds) {
      const targetLetter = expectedPuzzle.cells[cellId].solution;
      const cellBtn = screen.getByTestId(`cell-${cellId}`);
      await user.click(cellBtn);

      const availableTrayBtns = within(tray)
        .getAllByRole('button')
        .filter(
          (btn) =>
            !btn.hasAttribute('disabled') &&
            btn.getAttribute('data-used') !== 'true' &&
            btn.textContent?.trim() === targetLetter,
        );
      expect(availableTrayBtns.length).toBeGreaterThan(0);
      await user.click(availableTrayBtns[0]);
    }

    expect(checkBtn).toBeEnabled();
    await user.click(checkBtn);

    // VictoryModal opens and callbacks fire
    expect(screen.getByTestId('victory-modal')).toBeInTheDocument();
    expect(props.onRecordAttempt).toHaveBeenCalledWith(
      expectedPuzzle.entries.map((e) => e.vocab.id),
      'A1',
      { correct: true, usedHint: false },
    );
    expect(props.onAwardStars).toHaveBeenCalledTimes(1);

    // Clicking Review closes modal and renders WordReviewList with IPA & Listen button
    await user.click(screen.getByRole('button', { name: /Review/i }));
    expect(screen.queryByTestId('victory-modal')).not.toBeInTheDocument();

    const reviewList = screen.getByTestId('word-review-list');
    expect(reviewList).toBeInTheDocument();
    const firstVocab = expectedPuzzle.entries[0].vocab;
    expect(within(reviewList).getByText(firstVocab.ipa)).toBeInTheDocument();

    const listenBtn = within(reviewList).getByRole('button', {
      name: new RegExp(`^Listen ${firstVocab.word}$`, 'i'),
    });
    await user.click(listenBtn);
    expect(speakSpy).toHaveBeenCalledWith(firstVocab.word);
  });

  it('Standard Mode (Endless): wrong Check deducts hearts and triggers GameOverModal after 3 wrong checks', async () => {
    const user = userEvent.setup();
    const config = createConfig({ sessionMode: 'endless', inputMode: 'tray', level: 'A1' });
    const expectedPuzzle = generateWordCross({
      level: config.level,
      topics: config.topics,
      seed: FIXED_SEED,
    });

    const { props } = renderWordCross({ config });
    const tray = screen.getByTestId('word-cross-tray');

    // Fill blanks in reverse/mismatched order so at least one blank is wrong
    const blankIds = expectedPuzzle.blankCellIds;
    const solutions = blankIds.map((id) => expectedPuzzle.cells[id].solution);
    // Find a permutation that differs from solutions
    const wrongOrder = [...solutions];
    const diffIdx = wrongOrder.findIndex((ch) => ch !== wrongOrder[0]);
    if (diffIdx > 0) {
      [wrongOrder[0], wrongOrder[diffIdx]] = [wrongOrder[diffIdx], wrongOrder[0]];
    }

    for (let i = 0; i < blankIds.length; i++) {
      const cellBtn = screen.getByTestId(`cell-${blankIds[i]}`);
      await user.click(cellBtn);
      const letter = wrongOrder[i];
      const availableTrayBtns = within(tray)
        .getAllByRole('button')
        .filter(
          (btn) =>
            !btn.hasAttribute('disabled') &&
            btn.getAttribute('data-used') !== 'true' &&
            btn.textContent?.trim() === letter,
        );
      await user.click(availableTrayBtns[0]);
    }

    const checkBtn = screen.getByRole('button', { name: /Check/i });
    expect(checkBtn).toBeEnabled();

    // 3 wrong checks -> 3 hearts -> 2 -> 1 -> 0 -> GameOverModal
    expect(screen.getByTestId('endless-hearts')).toHaveAttribute('data-hearts', '3');
    await user.click(checkBtn);
    expect(screen.getByTestId('endless-hearts')).toHaveAttribute('data-hearts', '2');
    expect(screen.queryByTestId('game-over-modal')).not.toBeInTheDocument();

    await user.click(checkBtn);
    expect(screen.getByTestId('endless-hearts')).toHaveAttribute('data-hearts', '1');
    expect(screen.queryByTestId('game-over-modal')).not.toBeInTheDocument();

    await user.click(checkBtn);
    expect(screen.getByTestId('endless-hearts')).toHaveAttribute('data-hearts', '0');
    expect(screen.getByTestId('game-over-modal')).toBeInTheDocument();
    expect(props.onRecordAttempt).toHaveBeenCalledTimes(3);
  });

  it('Super Mode: hides tray, renders QwertyBar25D, protects fixed & hinted cells from typing/backspace, and solves via keyboard + QwertyBar25D', async () => {
    const user = userEvent.setup();
    const config = createConfig({ sessionMode: 'quick', inputMode: 'keyboard', level: 'A1' });
    const expectedPuzzle = generateWordCross({
      level: config.level,
      topics: config.topics,
      seed: FIXED_SEED,
    });

    const { container } = renderWordCross({ config });

    // No letter tray and no native <input> (mobile zoom prevention)
    expect(screen.queryByTestId('word-cross-tray')).not.toBeInTheDocument();
    expect(container.querySelector('input')).toBeNull();
    const qwerty = screen.getByRole('group', { name: 'Letter keyboard' });
    expect(qwerty).toBeInTheDocument();

    // Find a fixed cell and record its letter
    const fixedCell = Object.values(expectedPuzzle.cells).find((c) => c.kind === 'fixed');
    expect(fixedCell).toBeDefined();
    const fixedCellEl = screen.getByTestId(`cell-${fixedCell!.id}`);
    expect(fixedCellEl).toHaveTextContent(fixedCell!.solution);

    // Click fixed cell and attempt to type 'Z' & Backspace -> fixed cell MUST NOT change
    await user.click(fixedCellEl);
    fireEvent.keyDown(window, { key: 'Z' });
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(fixedCellEl).toHaveTextContent(fixedCell!.solution);

    // Click Hint to lock 1 hinted cell
    await user.click(screen.getByRole('button', { name: /Hint/i }));
    const hintedCellId = expectedPuzzle.blankCellIds.find(
      (id) => screen.getByTestId(`cell-${id}`).getAttribute('data-hinted') === 'true',
    );
    expect(hintedCellId).toBeDefined();
    const hintedSolution = expectedPuzzle.cells[hintedCellId!].solution;
    const hintedCellEl = screen.getByTestId(`cell-${hintedCellId!}`);
    expect(hintedCellEl).toHaveTextContent(hintedSolution);

    // Attempt to click hinted cell and overwrite via QwertyBar25D + physical keydown + Backspace
    const wrongChar = hintedSolution === 'Z' ? 'Q' : 'Z';
    await user.click(hintedCellEl);
    await user.click(within(qwerty).getByRole('button', { name: wrongChar }));
    fireEvent.keyDown(window, { key: wrongChar });
    await user.click(within(qwerty).getByRole('button', { name: 'Backspace' }));
    fireEvent.keyDown(window, { key: 'Backspace' });

    // Hinted cell MUST STILL have its exact solution
    expect(hintedCellEl).toHaveTextContent(hintedSolution);

    // Now fill all remaining non-hinted blank cells using a mix of QwertyBar25D and physical keydown
    const remainingBlanks = expectedPuzzle.blankCellIds.filter((id) => id !== hintedCellId);
    for (let i = 0; i < remainingBlanks.length; i++) {
      const cellId = remainingBlanks[i];
      const solution = expectedPuzzle.cells[cellId].solution;
      await user.click(screen.getByTestId(`cell-${cellId}`));
      if (i % 2 === 0) {
        await user.click(within(qwerty).getByRole('button', { name: solution }));
      } else {
        fireEvent.keyDown(window, { key: solution });
      }
    }

    // Check and verify VictoryModal opens
    const checkBtn = screen.getByRole('button', { name: /Check/i });
    expect(checkBtn).toBeEnabled();
    await user.click(checkBtn);
    expect(screen.getByTestId('victory-modal')).toBeInTheDocument();
  });
});
