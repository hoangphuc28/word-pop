import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { soundEngine } from '../../audio/soundEngine';
import { speechEngine } from '../../audio/speechEngine';
import { Button25D } from '../Button25D';
import { Card25D } from '../Card25D';
import { LandscapeBackdrop } from '../LandscapeBackdrop';
import { PlumpStar } from '../PlumpStar';
import { QwertyBar25D } from '../QwertyBar25D';
import { Tile25D } from '../Tile25D';

describe('2.5D UI Primitives & Audio/Speech Engines', () => {
  describe('Button25D', () => {
    it('renders children and handles clicks', () => {
      const handleClick = vi.fn();
      render(
        <Button25D color="coral" size="lg" fullWidth onClick={handleClick}>
          Play Now
        </Button25D>
      );

      const btn = screen.getByRole('button', { name: 'Play Now' });
      expect(btn).toBeInTheDocument();
      expect(btn.className).toContain('w-full');
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('respects disabled prop', () => {
      const handleClick = vi.fn();
      render(
        <Button25D disabled onClick={handleClick}>
          Locked
        </Button25D>
      );

      const btn = screen.getByRole('button', { name: 'Locked' });
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Card25D', () => {
    it('renders children and forwards attributes', () => {
      render(
        <Card25D data-testid="card" className="custom-card">
          <span>Card Content</span>
        </Card25D>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveTextContent('Card Content');
      expect(card.className).toContain('custom-card');
      expect(card.className).toContain('card-25d');
    });
  });

  describe('PlumpStar', () => {
    it('renders an aria-hidden SVG star', () => {
      const { container } = render(<PlumpStar className="w-6 h-6" fill="#FACC15" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Tile25D', () => {
    it('renders letter and chip variants and toggles aria-pressed', () => {
      const { rerender } = render(
        <Tile25D value="A" variant="tray" selected={false} shape="square" />
      );

      const tile = screen.getByRole('button');
      expect(tile).toHaveTextContent('A');
      expect(tile).toHaveAttribute('aria-pressed', 'false');

      rerender(<Tile25D value="APPLE" variant="placed" selected shape="chip" size="lg" />);
      expect(tile).toHaveTextContent('APPLE');
      expect(tile).toHaveAttribute('aria-pressed', 'true');
    });

    it('displays clueNumber badge when provided', () => {
      render(<Tile25D value="B" variant="blank" clueNumber={3} size="sm" />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('renders hint, valid, invalid, and fixed variants without error', () => {
      const { rerender } = render(<Tile25D value="H" variant="hint" />);
      expect(screen.getByRole('button')).toHaveTextContent('H');

      rerender(<Tile25D value="V" variant="valid" />);
      expect(screen.getByRole('button')).toHaveTextContent('V');

      rerender(<Tile25D value="X" variant="invalid" />);
      expect(screen.getByRole('button')).toHaveTextContent('X');

      rerender(<Tile25D value="F" variant="fixed" size="xs" />);
      expect(screen.getByRole('button')).toHaveTextContent('F');
    });
  });

  describe('QwertyBar25D', () => {
    it('renders A-Z keys and backspace, and invokes callbacks', () => {
      const onKey = vi.fn();
      const onBackspace = vi.fn();
      const onSubmit = vi.fn();

      render(<QwertyBar25D onKey={onKey} onBackspace={onBackspace} onSubmit={onSubmit} />);

      for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
        expect(screen.getByRole('button', { name: letter })).toBeInTheDocument();
      }

      fireEvent.click(screen.getByRole('button', { name: 'A' }));
      expect(onKey).toHaveBeenCalledWith('A');

      const backspaceBtn = screen.getByRole('button', { name: /backspace/i });
      fireEvent.click(backspaceBtn);
      expect(onBackspace).toHaveBeenCalledTimes(1);

      const submitBtn = screen.getByRole('button', { name: /submit|check/i });
      fireEvent.click(submitBtn);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('disables all keys when disabled is true', () => {
      const onKey = vi.fn();
      const onBackspace = vi.fn();
      render(<QwertyBar25D onKey={onKey} onBackspace={onBackspace} disabled />);

      const keyA = screen.getByRole('button', { name: 'A' });
      const backspaceBtn = screen.getByRole('button', { name: /backspace/i });
      expect(keyA).toBeDisabled();
      expect(backspaceBtn).toBeDisabled();

      fireEvent.click(keyA);
      fireEvent.click(backspaceBtn);
      expect(onKey).not.toHaveBeenCalled();
      expect(onBackspace).not.toHaveBeenCalled();
    });
  });

  describe('LandscapeBackdrop', () => {
    it('renders SVG landscape and floating letter tiles', () => {
      const { container } = render(<LandscapeBackdrop fixed />);
      const svg = container.querySelector('svg[viewBox="0 0 1440 900"]');
      expect(svg).toBeInTheDocument();
      expect(screen.getByText('W')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
    });
  });

  describe('speechEngine', () => {
    const originalSpeechSynthesis = window.speechSynthesis;
    const originalUtterance = globalThis.SpeechSynthesisUtterance;

    beforeEach(() => {
      speechEngine.setEnabled(true);
      speechEngine.setVolume(0.85);
    });

    afterEach(() => {
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        writable: true,
        value: originalSpeechSynthesis,
      });
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
        configurable: true,
        writable: true,
        value: originalUtterance,
      });
    });

    it('safely no-ops when window.speechSynthesis or SpeechSynthesisUtterance is undefined', () => {
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
        configurable: true,
        writable: true,
        value: undefined,
      });

      expect(speechEngine.isSupported()).toBe(false);
      expect(() => speechEngine.speak('apple')).not.toThrow();
      expect(() => speechEngine.stop()).not.toThrow();
    });

    it('invokes speechSynthesis.speak with en-US and rate 0.92 when supported and enabled', () => {
      const speakMock = vi.fn();
      const cancelMock = vi.fn();

      class MockUtterance {
        text: string;
        lang = '';
        rate = 1;
        volume = 1;
        constructor(text: string) {
          this.text = text;
        }
      }

      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        writable: true,
        value: { speak: speakMock, cancel: cancelMock },
      });
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
        configurable: true,
        writable: true,
        value: MockUtterance,
      });

      expect(speechEngine.isSupported()).toBe(true);
      speechEngine.speak('apple');

      expect(cancelMock).toHaveBeenCalledTimes(1);
      expect(speakMock).toHaveBeenCalledTimes(1);
      const utterance = speakMock.mock.calls[0][0] as MockUtterance;
      expect(utterance.text).toBe('apple');
      expect(utterance.lang).toBe('en-US');
      expect(utterance.rate).toBe(0.92);
      expect(utterance.volume).toBe(0.85);

      speechEngine.stop();
      expect(cancelMock).toHaveBeenCalledTimes(2);
    });

    it('does NOT speak when disabled or volume is 0', () => {
      const speakMock = vi.fn();
      const cancelMock = vi.fn();

      class MockUtterance {
        text: string;
        lang = '';
        rate = 1;
        volume = 1;
        constructor(text: string) {
          this.text = text;
        }
      }

      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        writable: true,
        value: { speak: speakMock, cancel: cancelMock },
      });
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
        configurable: true,
        writable: true,
        value: MockUtterance,
      });

      speechEngine.setEnabled(false);
      speechEngine.speak('apple');
      expect(speakMock).not.toHaveBeenCalled();

      speechEngine.setEnabled(true);
      speechEngine.setVolume(0);
      speechEngine.speak('apple');
      expect(speakMock).not.toHaveBeenCalled();
    });
  });

  describe('soundEngine', () => {
    it('safely no-ops in jsdom without Web Audio errors', () => {
      expect(() => {
        soundEngine.setEnabled(true);
        soundEngine.setMusicEnabled(true);
        soundEngine.setSfxVolume(0.8);
        soundEngine.setMusicVolume(0.6);
        soundEngine.startBgm();
        soundEngine.playPop();
        soundEngine.playPlace();
        soundEngine.playHint();
        soundEngine.playSuccess();
        soundEngine.playError();
        soundEngine.playVictory();
        soundEngine.stopBgm();
      }).not.toThrow();
    });
  });
});
