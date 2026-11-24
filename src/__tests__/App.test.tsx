import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { soundEngine } from '../audio/soundEngine';
import { speechEngine } from '../audio/speechEngine';
import { STORAGE_KEY } from '../storage/progressStore';
import App from '../App';

describe('App integration', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    vi.restoreAllMocks();
    document.documentElement.lang = '';
  });

  it('renders SplashScreen with splashInitialReady and enters HomeHub with author footer on START', async () => {
    const user = userEvent.setup();
    const startBgmSpy = vi.spyOn(soundEngine, 'startBgm').mockImplementation(() => {});

    render(<App splashInitialReady={true} />);

    // Splash screen is visible initially
    expect(screen.getByTestId('splash-screen')).toBeInTheDocument();
    const startBtn = screen.getByTestId('splash-start-btn');
    expect(startBtn).toBeEnabled();

    await user.click(startBtn);

    // Enters HomeHub and shows the game stage + author footer
    expect(screen.queryByTestId('splash-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('game-stage')).toBeInTheDocument();
    expect(screen.getByTestId('daily-streak-banner')).toBeInTheDocument();
    expect(screen.getByTestId('author-footer')).toHaveTextContent(
      'WordPop · crafted by Hoàng Phúc',
    );
    expect(startBgmSpy).toHaveBeenCalled();
    // Default language is Vietnamese ('vi')
    expect(document.documentElement.lang).toBe('vi');
  });

  it('opens SettingsModal inside game-stage in exact DOM order and switches UI live between VI and EN', async () => {
    const user = userEvent.setup();
    const speechEnabledSpy = vi.spyOn(speechEngine, 'setEnabled');

    render(<App skipSplash={true} />);

    const stage = screen.getByTestId('game-stage');
    expect(document.documentElement.lang).toBe('vi');

    // Open SettingsModal (Vietnamese default label: "Cài Đặt")
    await user.click(screen.getByRole('button', { name: 'Cài Đặt' }));

    const modal = within(stage).getByTestId('settings-modal');
    expect(modal).toBeInTheDocument();

    // Verify exact DOM order: Music -> Sound -> Language -> Stats -> Guide
    const musicLabel = within(modal).getByText('Nhạc Nền');
    const soundLabel = within(modal).getByText('Hiệu Ứng Âm Thanh');
    const langLabel = within(modal).getByText('Ngôn Ngữ');
    const statsLabel = within(modal).getByText('Thống Kê Học Tập');
    const guideLabel = within(modal).getByText('Hướng Dẫn & Giải Thích');

    const ordered = [musicLabel, soundLabel, langLabel, statsLabel, guideLabel];
    for (let i = 0; i < ordered.length - 1; i++) {
      expect(
        ordered[i].compareDocumentPosition(ordered[i + 1]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }

    // Toggle Sound off and verify speechEngine syncs
    await user.click(within(modal).getByRole('button', { name: 'Hiệu Ứng Âm Thanh' }));
    expect(speechEnabledSpy).toHaveBeenCalledWith(false);

    // Toggle Language from VI -> EN
    const langToggleBtn = within(modal).getByRole('button', { name: /EN\s*\/\s*VI/i });
    await user.click(langToggleBtn);

    expect(document.documentElement.lang).toBe('en');
    expect(within(modal).getByText('Settings')).toBeInTheDocument();
    expect(within(modal).getByText('Background Music')).toBeInTheDocument();
    expect(within(modal).getByText('Sound Effects')).toBeInTheDocument();
    expect(within(modal).getByText('Language')).toBeInTheDocument();
    expect(within(modal).getByText('Learning Stats')).toBeInTheDocument();
    expect(within(modal).getByText('Guide & Explanations')).toBeInTheDocument();

    // Open StatsModal from SettingsModal and verify it renders inside game-stage
    await user.click(within(modal).getByRole('button', { name: 'Learning Stats' }));
    const statsModal = within(stage).getByTestId('stats-modal');
    expect(statsModal).toBeInTheDocument();
    await user.click(within(statsModal).getAllByRole('button', { name: 'Close' })[0]);

    // Re-open SettingsModal and open GuideModal inside game-stage
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(
      within(stage).getByRole('button', { name: 'Guide & Explanations' }),
    );
    expect(within(stage).getByTestId('guide-modal')).toBeInTheDocument();
  });

  it('starts Quick Play WordCross, pauses BGM during gameplay, and returns to Home resuming BGM on Back', async () => {
    const user = userEvent.setup();
    const startBgmSpy = vi.spyOn(soundEngine, 'startBgm').mockImplementation(() => {});
    const stopBgmSpy = vi.spyOn(soundEngine, 'stopBgm').mockImplementation(() => {});

    render(<App skipSplash={true} />);

    // Home is visible and BGM started
    expect(screen.getByTestId('daily-streak-banner')).toBeInTheDocument();
    expect(startBgmSpy).toHaveBeenCalled();

    // Enter Quick Play ("Chơi Nhanh" in default VI)
    await user.click(screen.getByRole('button', { name: /Chơi Nhanh/i }));
    await user.click(screen.getByRole('button', { name: /Chơi Ngay!/i }));

    // WordCross screen is rendered and Home is hidden
    expect(screen.queryByTestId('daily-streak-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('word-cross-clues')).toBeInTheDocument();
    expect(stopBgmSpy).toHaveBeenCalled();

    // Click Back to return to Home and resume BGM
    startBgmSpy.mockClear();
    await user.click(screen.getByRole('button', { name: /Quay Lại/i }));

    expect(screen.queryByTestId('word-cross-clues')).not.toBeInTheDocument();
    expect(screen.getByTestId('daily-streak-banner')).toBeInTheDocument();
    expect(startBgmSpy).toHaveBeenCalled();
  });

  it('starts Study Lab Sentence Pop, pauses BGM during gameplay, and returns to Home on Back', async () => {
    const user = userEvent.setup();
    const startBgmSpy = vi.spyOn(soundEngine, 'startBgm').mockImplementation(() => {});
    const stopBgmSpy = vi.spyOn(soundEngine, 'stopBgm').mockImplementation(() => {});

    render(<App skipSplash={true} />);

    // Enter Study Lab ("Luyện Tập" in default VI)
    await user.click(screen.getByRole('button', { name: /Luyện Tập/i }));
    // Switch game mode to Sentence Pop ("Điền Câu Chuẩn")
    await user.click(screen.getByRole('button', { name: /Điền Câu Chuẩn/i }));
    await user.click(screen.getByRole('button', { name: /Chơi Ngay!/i }));

    // Sentence Pop screen is rendered and Home is hidden
    expect(screen.queryByTestId('daily-streak-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('sentence-slot')).toBeInTheDocument();
    expect(screen.getByTestId('sentence-pop-choices')).toBeInTheDocument();
    expect(stopBgmSpy).toHaveBeenCalled();

    // Click Back to return to Home and resume BGM
    startBgmSpy.mockClear();
    await user.click(screen.getByRole('button', { name: /Quay Lại/i }));

    expect(screen.queryByTestId('sentence-slot')).not.toBeInTheDocument();
    expect(screen.getByTestId('daily-streak-banner')).toBeInTheDocument();
    expect(startBgmSpy).toHaveBeenCalled();
  });
});
