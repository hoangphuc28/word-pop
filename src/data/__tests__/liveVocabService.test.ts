import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  expandVocabularyOnline,
  hydrateOnlineVocabulary,
  mapFrequencyToCefr,
  ONLINE_VOCAB_STORAGE_KEY,
  resetOnlineVocabularyCache,
  type FetchLike,
} from '../liveVocabService';
import { getAllVocabulary, getOnlineVocabularyCount, VOCABULARY } from '../vocabulary';

describe('liveVocabService', () => {
  beforeEach(() => {
    resetOnlineVocabularyCache();
  });

  afterEach(() => {
    resetOnlineVocabularyCache();
  });

  it('maps Datamuse word frequency to CEFR tiers accurately', () => {
    expect(mapFrequencyToCefr(50)).toBe('A1');
    expect(mapFrequencyToCefr(20)).toBe('A2');
    expect(mapFrequencyToCefr(6)).toBe('B1');
    expect(mapFrequencyToCefr(1.2)).toBe('B2C1');
  });

  it('fetches, validates, enriches with IPA/MP3/VI, caches, and registers new words', async () => {
    const mockFetch: FetchLike = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('api.datamuse.com')) {
        return new Response(
          JSON.stringify([
            {
              word: 'goblet',
              tags: ['n', 'f:8.5'],
              defs: ['n\tA drinking glass with a foot and a stem'],
            },
            {
              word: 'too-long-hyphenated',
              tags: ['n', 'f:5.0'],
              defs: ['n\tShould be filtered out'],
            },
          ]),
          { status: 200 }
        );
      }
      if (url.includes('api.dictionaryapi.dev')) {
        return new Response(
          JSON.stringify([
            {
              word: 'goblet',
              phonetic: '/ˈɡɒb.lət/',
              phonetics: [
                {
                  text: '/ˈɡɒb.lət/',
                  audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/goblet-us.mp3',
                },
              ],
              meanings: [
                {
                  partOfSpeech: 'noun',
                  definitions: [
                    {
                      definition: 'A drinking cup with a stem and base',
                      example: 'The king raised a golden goblet at dinner.',
                    },
                  ],
                },
              ],
            },
          ]),
          { status: 200 }
        );
      }
      if (url.includes('api.mymemory.translated.net')) {
        return new Response(
          JSON.stringify({
            responseData: { translatedText: 'Chiếc cốc chân cao' },
          }),
          { status: 200 }
        );
      }
      return new Response('Not found', { status: 404 });
    }) as FetchLike;

    const result = await expandVocabularyOnline({
      topics: ['daily'],
      count: 2,
      fetchFn: mockFetch,
    });

    expect(result.offline).toBe(false);
    expect(result.added).toBe(1);
    expect(result.totalOnline).toBe(1);
    expect(result.totalAll).toBe(VOCABULARY.length + 1);

    const addedWord = getAllVocabulary().find((e) => e.word === 'goblet');
    expect(addedWord).toBeDefined();
    expect(addedWord?.ipa).toBe('/ˈɡɒb.lət/');
    expect(addedWord?.vi).toBe('Chiếc cốc chân cao');
    expect(addedWord?.audioUrl).toContain('goblet-us.mp3');
    expect(addedWord?.level).toBe('B1');
    expect(addedWord?.source).toBe('online');

    // Verify persistence & hydration after reload
    const cachedRaw = localStorage.getItem(ONLINE_VOCAB_STORAGE_KEY);
    expect(cachedRaw).toContain('goblet');
    resetOnlineVocabularyCache();
    localStorage.setItem(ONLINE_VOCAB_STORAGE_KEY, cachedRaw!);
    expect(getOnlineVocabularyCount()).toBe(0);
    expect(hydrateOnlineVocabulary()).toBe(1);
    expect(getOnlineVocabularyCount()).toBe(1);
  });

  it('gracefully reports offline when network requests fail without throwing', async () => {
    const failingFetch: FetchLike = vi.fn(async () => {
      throw new Error('Network error');
    }) as FetchLike;

    const result = await expandVocabularyOnline({
      topics: ['travel'],
      count: 4,
      fetchFn: failingFetch,
    });

    expect(result.offline).toBe(true);
    expect(result.added).toBe(0);
    expect(result.totalAll).toBe(VOCABULARY.length);
  });
});
