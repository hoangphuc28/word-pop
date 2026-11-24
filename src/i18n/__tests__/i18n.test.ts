import { describe, expect, it } from 'vitest';
import en from '../en.json';
import vi from '../vi.json';
import { t } from '../index';

const REQUIRED_KEYS = [
  'app.footer',
  'splash.tagline',
  'splash.loading',
  'splash.ready',
  'splash.start',
  'home.sessionMode',
  'home.quickMode',
  'home.quickModeDesc',
  'home.endlessMode',
  'home.endlessModeDesc',
  'home.bestEndless',
  'home.practiceMode',
  'home.practiceModeDesc',
  'home.superMode',
  'home.superModeDesc',
  'home.wordCross',
  'home.sentencePop',
  'home.studyLabBadge',
  'home.level',
  'home.topics',
  'home.mixActive',
  'home.selectAtLeastOneTopic',
  'home.selectAll',
  'home.play',
  'home.dailyStreakCount',
  'home.dailyStreakZero',
  'home.dailyStreakActive',
  'home.dailyStreakPrompt',
  'levels.A1',
  'levels.A2',
  'levels.B1',
  'levels.B2C1',
  'levels.A1Desc',
  'levels.A2Desc',
  'levels.B1Desc',
  'levels.B2C1Desc',
  'topics.daily',
  'topics.food',
  'topics.travel',
  'topics.nature',
  'topics.work',
  'topics.tech',
  'topics.feelings',
  'topics.culture',
  'game.back',
  'game.check',
  'game.hint',
  'game.clear',
  'game.confirmClear',
  'game.streak',
  'game.puzzleProgress',
  'game.clues',
  'game.across',
  'game.down',
  'game.listen',
  'game.trayHint',
  'game.superModeHint',
  'game.typeAnswer',
  'game.reviewBanner',
  'game.reviewWords',
  'game.nextPuzzle',
  'game.heartsLeft',
  'game.tierUp',
  'victory.title',
  'victory.sessionTitle',
  'victory.next',
  'victory.playAgain',
  'victory.review',
  'victory.home',
  'gameOver.title',
  'gameOver.subtitle',
  'gameOver.puzzlesCleared',
  'gameOver.newRecord',
  'gameOver.bestScore',
  'gameOver.tryAgain',
  'gameOver.home',
  'settings.title',
  'settings.music',
  'settings.sound',
  'settings.language',
  'settings.learningStats',
  'settings.guide',
  'settings.fullscreen',
  'settings.exitFullscreen',
  'settings.close',
  'stats.title',
  'stats.puzzlesSolved',
  'stats.accuracy',
  'stats.wordsMastered',
  'stats.bestStreak',
  'stats.byLevel',
  'stats.reset',
  'stats.confirmReset',
  'stats.cancel',
  'guide.title',
  'guide.wordCrossTitle',
  'guide.wordCrossDesc',
  'guide.sentencePopTitle',
  'guide.sentencePopDesc',
  'guide.superModeTitle',
  'guide.superModeDesc',
  'guide.endlessTitle',
  'guide.endlessDesc',
  'guide.streakTitle',
  'guide.streakDesc',
  'guide.gotIt',
] as const;

describe('i18n (EN / VI)', () => {
  it('has identical key sets in en.json and vi.json', () => {
    const enKeys = Object.keys(en).sort();
    const viKeys = Object.keys(vi).sort();
    expect(viKeys).toEqual(enKeys);
  });

  it('has non-empty string values for every key in both languages', () => {
    for (const key of Object.keys(en)) {
      const enVal = en[key as keyof typeof en];
      const viVal = vi[key as keyof typeof vi];
      expect(typeof enVal).toBe('string');
      expect(enVal.trim().length).toBeGreaterThan(0);
      expect(typeof viVal).toBe('string');
      expect(viVal.trim().length).toBeGreaterThan(0);
    }
  });

  it('includes all required UI keys and exact footer branding', () => {
    for (const key of REQUIRED_KEYS) {
      expect(en).toHaveProperty(key);
      expect(vi).toHaveProperty(key);
    }
    expect(t('en', 'app.footer')).toBe('WordPop · crafted by Hoàng Phúc');
    expect(t('vi', 'app.footer')).toBe('WordPop · crafted by Hoàng Phúc');
  });

  it('interpolates {count} and other named placeholders cleanly', () => {
    expect(t('en', 'home.bestEndless', { count: 12 })).toContain('12');
    expect(t('vi', 'home.bestEndless', { count: 12 })).toContain('12');
    expect(t('en', 'home.dailyStreakCount', { count: 5 })).toContain('5');
    expect(t('vi', 'home.dailyStreakCount', { count: 5 })).toContain('5');
    expect(t('en', 'game.heartsLeft', { count: 2 })).toContain('2');
    expect(t('vi', 'game.heartsLeft', { count: 2 })).toContain('2');
    expect(t('en', 'game.puzzleProgress', { current: 2, total: 5 })).toContain('2');
    expect(t('en', 'game.puzzleProgress', { current: 2, total: 5 })).toContain('5');
  });

  it('falls back to key name when an unknown key is requested', () => {
    expect(t('en', 'nonexistent.key')).toBe('nonexistent.key');
    expect(t('vi', 'nonexistent.key')).toBe('nonexistent.key');
  });
});
