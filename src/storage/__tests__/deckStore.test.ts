import { beforeEach, describe, expect, it } from 'vitest';
import {
  COMMUNITY_SEED_DECKS,
  deleteMyDeck,
  downloadCommunityDeck,
  exportDeckToShareCode,
  getPlayableDecks,
  importDeckFromText,
  loadCommunityDecks,
  loadDownloadedDecks,
  loadMyDecks,
  parseQuickWordLines,
  publishDeckToCommunity,
  removeDownloadedDeck,
  saveMyDeck,
} from '../deckStore';
import type { WordDeck } from '../../engine/types';

function createSampleDeck(): WordDeck {
  return {
    id: 'my-test-deck',
    name: 'My IELTS Pack',
    description: 'Custom test words',
    author: 'Phúc',
    level: 'B2',
    color: 'coral',
    origin: 'mine',
    createdAt: 1000,
    updatedAt: 1000,
    words: [
      {
        id: 'my-test-apple',
        word: 'apple',
        ipa: '/ˈæp.əl/',
        pos: 'n.',
        level: 'A1',
        topic: 'food',
        en: 'A crisp round fruit',
        vi: 'Quả táo',
        example: 'She ate a sweet apple.',
        exampleVi: 'Cô ấy ăn một quả táo ngọt.',
      },
      {
        id: 'my-test-planet',
        word: 'planet',
        ipa: '/ˈplæn.ɪt/',
        pos: 'n.',
        level: 'B1',
        topic: 'nature',
        en: 'A large world orbiting a star',
        vi: 'Hành tinh',
        example: 'Earth is a blue planet.',
        exampleVi: 'Trái Đất là một hành tinh xanh.',
      },
    ],
  };
}

describe('deckStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates, publishes, downloads, and deletes word decks cleanly', () => {
    const deck = createSampleDeck();
    saveMyDeck(deck);
    expect(loadMyDecks()).toHaveLength(1);
    expect(getPlayableDecks().map((d) => d.id)).toContain('my-test-deck');

    publishDeckToCommunity(deck);
    const community = loadCommunityDecks();
    expect(community.some((d) => d.id === 'my-test-deck')).toBe(true);
    expect(community.length).toBeGreaterThanOrEqual(COMMUNITY_SEED_DECKS.length + 1);

    downloadCommunityDeck(COMMUNITY_SEED_DECKS[0]);
    expect(loadDownloadedDecks()).toHaveLength(1);
    expect(getPlayableDecks()).toHaveLength(2);

    removeDownloadedDeck(COMMUNITY_SEED_DECKS[0].id);
    expect(loadDownloadedDecks()).toHaveLength(0);

    deleteMyDeck('my-test-deck');
    expect(loadMyDecks()).toHaveLength(0);
  });

  it('round-trips Vietnamese UTF-8 decks via share code and JSON import', () => {
    const deck = createSampleDeck();
    const code = exportDeckToShareCode(deck);
    expect(code.startsWith('WORDPOP-DECK:')).toBe(true);

    const imported = importDeckFromText(code);
    expect(imported).not.toBeNull();
    expect(imported?.name).toBe('My IELTS Pack');
    expect(imported?.words[0].vi).toBe('Quả táo');
    expect(imported?.words).toHaveLength(2);
  });

  it('bulk-parses quick word lines while filtering invalid words', () => {
    const parsed = parseQuickWordLines(
      'clock - Đồng hồ\ngarden | Khu vườn\ntoo-long-invalid - Lỗi\nclock - Trùng',
      'A2'
    );
    expect(parsed).toHaveLength(2);
    expect(parsed.map((w) => w.word)).toEqual(['clock', 'garden']);
    expect(parsed[0].vi).toBe('Đồng hồ');
  });
});
