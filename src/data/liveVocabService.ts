import {
  ALL_TOPICS,
  type CefrLevel,
  type PartOfSpeech,
  type VocabEntry,
  type VocabTopic,
} from '../engine/types';
import {
  clearOnlineVocabulary,
  getAllVocabulary,
  getOnlineVocabularyCount,
  registerOnlineVocabulary,
  VOCABULARY,
} from './vocabulary';

export const ONLINE_VOCAB_STORAGE_KEY = 'wordpop_online_vocab_v1';
const MAX_CACHED_ONLINE_WORDS = 600;

const TOPIC_QUERIES: Record<VocabTopic, string[]> = {
  daily: ['home,routine,morning,family', 'clothes,furniture,shopping,chore'],
  food: ['food,cooking,kitchen,fruit', 'drink,restaurant,dessert,spice'],
  travel: ['travel,airport,hotel,trip', 'vacation,transport,map,city'],
  nature: ['nature,weather,forest,animal', 'ocean,mountain,plant,earth'],
  work: ['office,career,business,study', 'school,project,meeting,finance'],
  tech: ['computer,software,internet,digital', 'science,device,data,network'],
  feelings: ['emotion,feeling,mood,happy', 'personality,mind,heart,attitude'],
  culture: ['music,art,movie,history', 'book,festival,sport,theater'],
};

interface DatamuseWord {
  word?: string;
  tags?: string[];
  defs?: string[];
}

interface DictionaryApiPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryApiMeaning {
  partOfSpeech?: string;
  definitions?: Array<{
    definition?: string;
    example?: string;
  }>;
}

interface DictionaryApiEntry {
  word?: string;
  phonetic?: string;
  phonetics?: DictionaryApiPhonetic[];
  meanings?: DictionaryApiMeaning[];
}

export type FetchLike = typeof fetch;

function mapPartOfSpeech(raw: string | undefined): PartOfSpeech | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === 'n' || lower === 'noun') return 'n.';
  if (lower === 'v' || lower === 'verb') return 'v.';
  if (lower === 'adj' || lower === 'adjective') return 'adj.';
  if (lower === 'adv' || lower === 'adverb') return 'adv.';
  return null;
}

export function mapFrequencyToCefr(freq: number): CefrLevel {
  if (freq >= 35) return 'A1';
  if (freq >= 14) return 'A2';
  if (freq >= 5) return 'B1';
  if (freq >= 1.5) return 'B2';
  return 'C1';
}

function parseDatamuseFrequency(tags: string[] | undefined): number {
  if (!Array.isArray(tags)) return 5;
  for (const tag of tags) {
    if (tag.startsWith('f:')) {
      const parsed = Number.parseFloat(tag.slice(2));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 5;
}

function cleanEnglishClue(raw: string, word: string): string {
  const withoutTab = raw.includes('\t') ? raw.split('\t').slice(1).join(' ') : raw;
  const trimmed = withoutTab.replace(/\s+/g, ' ').trim();
  const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
  const masked = trimmed.replace(wordRegex, 'this');
  const clipped = masked.length > 90 ? `${masked.slice(0, 87).trimEnd()}...` : masked;
  return clipped.charAt(0).toUpperCase() + clipped.slice(1);
}

function buildFallbackExample(word: string, pos: PartOfSpeech): string {
  if (pos === 'v.') {
    return `We often ${word} together during practice.`;
  }
  if (pos === 'adj.') {
    return `The atmosphere felt very ${word} today.`;
  }
  if (pos === 'adv.') {
    return `She spoke ${word} during the conversation.`;
  }
  return `This ${word} appears often in daily English.`;
}

function isValidCachedEntry(raw: unknown): raw is VocabEntry {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return false;
  const rec = raw as Record<string, unknown>;
  if (
    typeof rec.id !== 'string' ||
    typeof rec.word !== 'string' ||
    !/^[a-z]{3,8}$/.test(rec.word) ||
    typeof rec.ipa !== 'string' ||
    typeof rec.en !== 'string' ||
    typeof rec.vi !== 'string' ||
    typeof rec.example !== 'string' ||
    typeof rec.exampleVi !== 'string'
  ) {
    return false;
  }
  const posOk = rec.pos === 'n.' || rec.pos === 'v.' || rec.pos === 'adj.' || rec.pos === 'adv.';
  const levelOk =
    rec.level === 'A1' ||
    rec.level === 'A2' ||
    rec.level === 'B1' ||
    rec.level === 'B2' ||
    rec.level === 'C1';
  const topicOk = (ALL_TOPICS as readonly string[]).includes(String(rec.topic));
  if (!posOk || !levelOk || !topicOk) return false;
  return new RegExp(`\\b${rec.word}\\b`, 'i').test(rec.example);
}

export function loadCachedOnlineVocabulary(): VocabEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(ONLINE_VOCAB_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidCachedEntry);
  } catch {
    return [];
  }
}

export function saveCachedOnlineVocabulary(entries: readonly VocabEntry[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const trimmed = entries.slice(-MAX_CACHED_ONLINE_WORDS);
    localStorage.setItem(ONLINE_VOCAB_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore quota errors
  }
}

export function hydrateOnlineVocabulary(): number {
  const cached = loadCachedOnlineVocabulary();
  if (cached.length === 0) return 0;
  return registerOnlineVocabulary(cached);
}

export function resetOnlineVocabularyCache(): void {
  clearOnlineVocabulary();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ONLINE_VOCAB_STORAGE_KEY);
    }
  } catch {
    // Ignore
  }
}

async function translateToVietnamese(
  text: string,
  fetchFn: FetchLike
): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=en|vi`;
    const res = await fetchFn(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      responseData?: { translatedText?: string };
    };
    const translated = data?.responseData?.translatedText?.trim();
    if (!translated || translated.toUpperCase().includes('MYMEMORY WARNING')) {
      return null;
    }
    return translated;
  } catch {
    return null;
  }
}

async function fetchDictionaryDetails(
  word: string,
  fetchFn: FetchLike
): Promise<{
  ipa: string;
  audioUrl?: string;
  pos?: PartOfSpeech;
  definition?: string;
  example?: string;
} | null> {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const res = await fetchFn(url);
    if (!res.ok) return null;
    const list = (await res.json()) as DictionaryApiEntry[];
    if (!Array.isArray(list) || list.length === 0) return null;

    const first = list[0];
    let ipa = first.phonetic?.trim() ?? '';
    let audioUrl: string | undefined;

    if (Array.isArray(first.phonetics)) {
      for (const ph of first.phonetics) {
        if (!ipa && ph.text?.trim()) {
          ipa = ph.text.trim();
        }
        if (!audioUrl && ph.audio?.trim()) {
          audioUrl = ph.audio.trim();
        }
      }
    }

    let pos: PartOfSpeech | undefined;
    let definition: string | undefined;
    let example: string | undefined;
    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');

    if (Array.isArray(first.meanings)) {
      for (const meaning of first.meanings) {
        const mapped = mapPartOfSpeech(meaning.partOfSpeech);
        if (!mapped || !Array.isArray(meaning.definitions)) continue;
        for (const def of meaning.definitions) {
          if (!definition && def.definition?.trim()) {
            pos = mapped;
            definition = def.definition.trim();
          }
          if (!example && def.example?.trim() && wordRegex.test(def.example)) {
            pos = pos ?? mapped;
            example = def.example.trim();
          }
          if (definition && example) break;
        }
        if (definition && example) break;
      }
    }

    return {
      ipa: ipa || `/${word}/`,
      ...(audioUrl ? { audioUrl } : {}),
      ...(pos ? { pos } : {}),
      ...(definition ? { definition } : {}),
      ...(example ? { example } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Smart auto-fill helper for the Custom Word Deck Editor:
 * given an English word (3–8 letters), fetches IPA, POS, EN clue, VI translation,
 * example sentence, and native MP3 audio URL from Free Dictionary API + MyMemory.
 */
export async function autofillWordEntry(
  rawWord: string,
  level: CefrLevel = 'B1',
  topic: VocabTopic = 'daily',
  fetchFn: FetchLike = globalThis.fetch
): Promise<Partial<VocabEntry> | null> {
  const word = rawWord.trim().toLowerCase();
  if (!/^[a-z]{3,8}$/.test(word) || typeof fetchFn !== 'function') {
    return null;
  }
  const dict = await fetchDictionaryDetails(word, fetchFn);
  const pos: PartOfSpeech = dict?.pos ?? 'n.';
  const en = dict?.definition ? cleanEnglishClue(dict.definition, word) : '';
  const example = dict?.example ?? buildFallbackExample(word, pos);
  const vi =
    (await translateToVietnamese(word, fetchFn)) ??
    (en ? await translateToVietnamese(en, fetchFn) : null) ??
    '';

  return {
    word,
    ipa: dict?.ipa ?? `/${word}/`,
    pos,
    level,
    topic,
    en: en || `English ${pos} word`,
    vi: vi || en || word,
    example,
    exampleVi: vi || example,
    ...(dict?.audioUrl ? { audioUrl: dict.audioUrl } : {}),
    source: 'custom',
  };
}

export interface ExpandVocabularyResult {
  added: number;
  totalOnline: number;
  totalAll: number;
  offline: boolean;
}

/**
 * Fetches fresh English vocabulary from Datamuse + Free Dictionary API + MyMemory,
 * validates every entry against WordPop invariants, caches to localStorage, and registers
 * them into the live vocabulary registry.
 */
export async function expandVocabularyOnline(options: {
  topics?: readonly VocabTopic[];
  count?: number;
  fetchFn?: FetchLike;
} = {}): Promise<ExpandVocabularyResult> {
  const fetchFn = options.fetchFn ?? globalThis.fetch;
  if (typeof fetchFn !== 'function') {
    return {
      added: 0,
      totalOnline: getOnlineVocabularyCount(),
      totalAll: getAllVocabulary().length,
      offline: true,
    };
  }

  const targetCount = Math.max(1, Math.min(options.count ?? 8, 24));
  const topics =
    options.topics && options.topics.length > 0 ? options.topics : ALL_TOPICS;
  const existingWords = new Set(getAllVocabulary().map((e) => e.word.toLowerCase()));
  const discovered: VocabEntry[] = [];
  let anyNetworkSuccess = false;

  // Pick a rotating subset of topics so each tap discovers fresh variety quickly
  const offset = getOnlineVocabularyCount() % topics.length;
  const orderedTopics = [...topics.slice(offset), ...topics.slice(0, offset)];

  for (const topic of orderedTopics) {
    if (discovered.length >= targetCount) break;
    const queryList = TOPIC_QUERIES[topic];
    const query = queryList[Math.floor(getOnlineVocabularyCount() / topics.length) % queryList.length];

    let candidates: DatamuseWord[] = [];
    try {
      const url = `https://api.datamuse.com/words?topics=${encodeURIComponent(
        query
      )}&md=dpf&max=60`;
      const res = await fetchFn(url);
      if (!res.ok) continue;
      anyNetworkSuccess = true;
      const json: unknown = await res.json();
      if (Array.isArray(json)) {
        candidates = json as DatamuseWord[];
      }
    } catch {
      continue;
    }

    const filtered = candidates.filter((item) => {
      if (typeof item.word !== 'string') return false;
      const w = item.word.toLowerCase();
      if (!/^[a-z]{3,8}$/.test(w)) return false;
      if (existingWords.has(w)) return false;
      return Array.isArray(item.defs) && item.defs.length > 0;
    });

    const perTopicLimit = Math.max(2, Math.ceil(targetCount / Math.min(orderedTopics.length, 4)));
    let addedForTopic = 0;

    for (const item of filtered) {
      if (discovered.length >= targetCount || addedForTopic >= perTopicLimit) break;
      const word = item.word!.toLowerCase();
      if (existingWords.has(word)) continue;

      const freq = parseDatamuseFrequency(item.tags);
      const level = mapFrequencyToCefr(freq);
      const firstDef = item.defs?.[0] ?? '';
      const rawPosTag = firstDef.includes('\t') ? firstDef.split('\t')[0] : undefined;
      let pos = mapPartOfSpeech(rawPosTag);

      const dict = await fetchDictionaryDetails(word, fetchFn);
      if (dict?.pos && !pos) {
        pos = dict.pos;
      }
      if (!pos) continue;

      const rawClue = dict?.definition ?? firstDef;
      const enClue = cleanEnglishClue(rawClue, word);
      if (enClue.length < 4) continue;

      const example = dict?.example ?? buildFallbackExample(word, pos);
      if (!new RegExp(`\\b${word}\\b`, 'i').test(example)) continue;

      const viMeaning =
        (await translateToVietnamese(word, fetchFn)) ??
        (await translateToVietnamese(enClue, fetchFn)) ??
        enClue;

      const entry: VocabEntry = {
        id: `online-${topic}-${word}`,
        word,
        ipa: dict?.ipa ?? `/${word}/`,
        pos,
        level,
        topic,
        en: enClue,
        vi: viMeaning,
        example,
        exampleVi: viMeaning,
        ...(dict?.audioUrl ? { audioUrl: dict.audioUrl } : {}),
        source: 'online',
      };

      existingWords.add(word);
      discovered.push(entry);
      addedForTopic += 1;
    }
  }

  let added = 0;
  if (discovered.length > 0) {
    added = registerOnlineVocabulary(discovered);
    const allOnline = getAllVocabulary().filter((e) => e.source === 'online');
    saveCachedOnlineVocabulary(allOnline);
  }

  return {
    added,
    totalOnline: getOnlineVocabularyCount(),
    totalAll: VOCABULARY.length + getOnlineVocabularyCount(),
    offline: !anyNetworkSuccess,
  };
}
