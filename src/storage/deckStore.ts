import type {
  CefrLevel,
  DeckColor,
  PartOfSpeech,
  VocabEntry,
  WordDeck,
} from '../engine/types';

export const MY_DECKS_KEY = 'wordpop_my_decks_v1';
export const COMMUNITY_DECKS_KEY = 'wordpop_community_decks_v1';
export const DOWNLOADED_DECKS_KEY = 'wordpop_downloaded_decks_v1';
const SHARE_PREFIX = 'WORDPOP-DECK:';

function makeCommunityWord(
  deckSlug: string,
  word: string,
  ipa: string,
  pos: PartOfSpeech,
  level: CefrLevel,
  en: string,
  vi: string,
  example: string,
  exampleVi: string
): VocabEntry {
  return {
    id: `deck-${deckSlug}-${word}`,
    word,
    ipa,
    pos,
    level,
    topic: 'work',
    en,
    vi,
    example,
    exampleVi,
    source: 'custom',
  };
}

export const COMMUNITY_SEED_DECKS: readonly WordDeck[] = [
  {
    id: 'comm-ielts-verbs',
    name: 'IELTS Core Verbs',
    description: 'Động từ học thuật cốt lõi thường gặp trong IELTS Reading & Writing.',
    author: 'Hoàng Phúc',
    level: 'B2',
    color: 'lavender',
    origin: 'community',
    published: true,
    downloads: 1240,
    createdAt: 1763900000000,
    updatedAt: 1763900000000,
    words: [
      makeCommunityWord('ielts', 'analyze', '/ˈæn.ə.laɪz/', 'v.', 'B2', 'Examine something in detail', 'Phân tích chi tiết', 'Researchers analyze the survey data carefully.', 'Các nhà nghiên cứu phân tích dữ liệu khảo sát cẩn thận.'),
      makeCommunityWord('ielts', 'predict', '/prɪˈdɪkt/', 'v.', 'B2', 'Say what will happen in the future', 'Dự đoán', 'Experts predict steady growth this year.', 'Các chuyên gia dự đoán tăng trưởng ổn định năm nay.'),
      makeCommunityWord('ielts', 'sustain', '/səˈsteɪn/', 'v.', 'B2', 'Maintain or support over time', 'Duy trì bền vững', 'Clean energy can sustain the whole city.', 'Năng lượng sạch có thể duy trì cho cả thành phố.'),
      makeCommunityWord('ielts', 'clarify', '/ˈklær.ɪ.faɪ/', 'v.', 'B2', 'Make an idea easier to understand', 'Làm rõ', 'Please clarify your main argument.', 'Vui lòng làm rõ luận điểm chính của bạn.'),
      makeCommunityWord('ielts', 'justify', '/ˈdʒʌs.tɪ.faɪ/', 'v.', 'B2', 'Give a good reason for an action', 'Biện minh / chứng minh hợp lý', 'Strong evidence helps justify the budget.', 'Bằng chứng vững chắc giúp chứng minh ngân sách hợp lý.'),
      makeCommunityWord('ielts', 'resolve', '/rɪˈzɒlv/', 'v.', 'B2', 'Find a clear solution to a problem', 'Giải quyết dứt điểm', 'Both teams worked to resolve the issue.', 'Cả hai nhóm đã nỗ lực giải quyết vấn đề.'),
      makeCommunityWord('ielts', 'expand', '/ɪkˈspænd/', 'v.', 'B2', 'Become larger in size or scope', 'Mở rộng', 'The library plans to expand its collection.', 'Thư viện dự định mở rộng bộ sưu tập.'),
      makeCommunityWord('ielts', 'decline', '/dɪˈklaɪn/', 'v.', 'B2', 'Become smaller, fewer, or weaker', 'Suy giảm / từ chối', 'Sales tend to decline after the holidays.', 'Doanh số thường suy giảm sau kỳ nghỉ lễ.'),
    ],
  },
  {
    id: 'comm-startup-tech',
    name: 'Startup & Tech',
    description: 'Từ vựng tiếng Anh thực chiến cho dân sản phẩm, thiết kế & lập trình.',
    author: 'Minh Anh',
    level: 'B1',
    color: 'coral',
    origin: 'community',
    published: true,
    downloads: 890,
    createdAt: 1763910000000,
    updatedAt: 1763910000000,
    words: [
      makeCommunityWord('techpack', 'deploy', '/dɪˈplɔɪ/', 'v.', 'B1', 'Release software to live users', 'Triển khai lên hệ thống', 'We deploy new updates every Friday.', 'Chúng tôi triển khai bản cập nhật mới mỗi thứ Sáu.'),
      makeCommunityWord('techpack', 'sprint', '/sprɪnt/', 'n.', 'B1', 'A short focused development cycle', 'Chu kỳ làm việc ngắn (Sprint)', 'Our team finished the sprint ahead of schedule.', 'Nhóm tôi hoàn thành sprint sớm hơn kế hoạch.'),
      makeCommunityWord('techpack', 'metric', '/ˈmet.rɪk/', 'n.', 'B1', 'A standard measurement of performance', 'Chỉ số đo lường', 'Retention is our most important metric.', 'Tỷ lệ giữ chân là chỉ số quan trọng nhất của chúng tôi.'),
      makeCommunityWord('techpack', 'roadmap', '/ˈrəʊd.mæp/', 'n.', 'B1', 'A visual plan of future milestones', 'Lộ trình phát triển', 'The product roadmap covers six months.', 'Lộ trình sản phẩm bao gồm sáu tháng.'),
      makeCommunityWord('techpack', 'launch', '/lɔːntʃ/', 'v.', 'B1', 'Introduce a new product to the public', 'Ra mắt sản phẩm', 'They will launch the mobile app tomorrow.', 'Họ sẽ ra mắt ứng dụng di động vào ngày mai.'),
      makeCommunityWord('techpack', 'backup', '/ˈbæk.ʌp/', 'n.', 'B1', 'An extra copy saved for safety', 'Bản sao lưu', 'Always keep a fresh backup of your files.', 'Luôn giữ một bản sao lưu mới cho tệp của bạn.'),
      makeCommunityWord('techpack', 'prompt', '/prɒmpt/', 'n.', 'B1', 'An instruction given to an AI model', 'Câu lệnh gợi ý (Prompt)', 'Write a clear prompt to get better results.', 'Hãy viết một prompt rõ ràng để có kết quả tốt hơn.'),
      makeCommunityWord('techpack', 'module', '/ˈmɒd.juːl/', 'n.', 'B1', 'An independent part of a larger system', 'Mô-đun / thành phần độc lập', 'Each module can be tested on its own.', 'Mỗi mô-đun có thể được kiểm thử độc lập.'),
    ],
  },
  {
    id: 'comm-travel-cafe',
    name: 'Travel & Café',
    description: 'Từ vựng du lịch, sân bay và gọi đồ uống gọn nhẹ cho người mới.',
    author: 'Lan Phương',
    level: 'A2',
    color: 'mint',
    origin: 'community',
    published: true,
    downloads: 1520,
    createdAt: 1763920000000,
    updatedAt: 1763920000000,
    words: [
      makeCommunityWord('trv', 'hostel', '/ˈhɒs.təl/', 'n.', 'A2', 'A budget shared place for travelers', 'Nhà nghỉ bình dân', 'We booked a cozy hostel near the beach.', 'Chúng tôi đặt một nhà nghỉ ấm cúng gần biển.'),
      makeCommunityWord('trv', 'ticket', '/ˈtɪk.ɪt/', 'n.', 'A2', 'A pass to enter or travel on transport', 'Vé đi lại / vào cổng', 'Keep your train ticket in your pocket.', 'Hãy giữ vé tàu trong túi của bạn.'),
      makeCommunityWord('trv', 'ferry', '/ˈfer.i/', 'n.', 'A2', 'A boat carrying people across water', 'Phà chở khách', 'The morning ferry leaves at seven.', 'Chuyến phà sáng khởi hành lúc bảy giờ.'),
      makeCommunityWord('trv', 'receipt', '/rɪˈsiːt/', 'n.', 'A2', 'A printed slip showing what you paid', 'Hóa đơn thanh toán', 'Could I have the receipt, please?', 'Cho tôi xin hóa đơn được không?'),
      makeCommunityWord('trv', 'waiter', '/ˈweɪ.tər/', 'n.', 'A2', 'A person who serves food at a table', 'Nhân viên phục vụ bàn', 'The waiter brought two iced coffees.', 'Nhân viên phục vụ mang ra hai ly cà phê đá.'),
      makeCommunityWord('trv', 'sunset', '/ˈsʌn.set/', 'n.', 'A2', 'The warm time when the sun goes down', 'Hoàng hôn', 'We watched the golden sunset by the pier.', 'Chúng tôi ngắm hoàng hôn rực rỡ bên cầu tàu.'),
      makeCommunityWord('trv', 'island', '/ˈaɪ.lənd/', 'n.', 'A2', 'Land completely surrounded by water', 'Hòn đảo', 'This quiet island has clear blue water.', 'Hòn đảo yên bình này có làn nước xanh trong.'),
      makeCommunityWord('trv', 'menu', '/ˈmen.juː/', 'n.', 'A2', 'A list of food and drinks offered', 'Thực đơn', 'She looked over the dessert menu.', 'Cô ấy xem qua thực đơn món tráng miệng.'),
    ],
  },
  {
    id: 'comm-c1-debate',
    name: 'C1 Academic & Debate',
    description: 'Từ vựng tinh gọn trình độ C1 giúp diễn đạt sắc bén trong tranh luận & viết luận.',
    author: 'Hoàng Phúc',
    level: 'C1',
    color: 'sunny',
    origin: 'community',
    published: true,
    downloads: 640,
    createdAt: 1763930000000,
    updatedAt: 1763930000000,
    words: [
      makeCommunityWord('c1deb', 'lucid', '/ˈluː.sɪd/', 'adj.', 'C1', 'Expressed clearly and easy to follow', 'Rõ ràng, mạch lạc', 'Her essay offered a lucid explanation.', 'Bài luận của cô ấy đưa ra lời giải thích mạch lạc.'),
      makeCommunityWord('c1deb', 'candid', '/ˈkæn.dɪd/', 'adj.', 'C1', 'Truthful and straightforward in speech', 'Thẳng thắn, chân thật', 'He gave a candid review of the plan.', 'Anh ấy đưa ra nhận xét thẳng thắn về kế hoạch.'),
      makeCommunityWord('c1deb', 'tacit', '/ˈtæs.ɪt/', 'adj.', 'C1', 'Understood without being stated aloud', 'Ngầm hiểu', 'There was tacit approval from the board.', 'Hội đồng đã có sự đồng thuận ngầm.'),
      makeCommunityWord('c1deb', 'cogent', '/ˈkəʊ.dʒənt/', 'adj.', 'C1', 'Clear, logical, and convincing', 'Thuyết phục, chặt chẽ', 'She presented a cogent defense.', 'Cô ấy trình bày một lập luận bảo vệ chặt chẽ.'),
      makeCommunityWord('c1deb', 'tenet', '/ˈten.ɪt/', 'n.', 'C1', 'A core principle or belief of a system', 'Nguyên lý cốt lõi', 'Fairness is a central tenet of the policy.', 'Công bằng là nguyên lý cốt lõi của chính sách.'),
      makeCommunityWord('c1deb', 'nuance', '/ˈnjuː.ɑːns/', 'n.', 'C1', 'A subtle difference in meaning or tone', 'Sắc thái tinh tế', 'Good translators capture every nuance.', 'Dịch giả giỏi nắm bắt mọi sắc thái tinh tế.'),
      makeCommunityWord('c1deb', 'caveat', '/ˈkæv.i.æt/', 'n.', 'C1', 'A warning or condition to keep in mind', 'Lưu ý / điều kiện ràng buộc', 'The offer comes with one important caveat.', 'Đề nghị này đi kèm một lưu ý quan trọng.'),
      makeCommunityWord('c1deb', 'viable', '/ˈvaɪ.ə.bəl/', 'adj.', 'C1', 'Capable of working successfully', 'Khả thi', 'Solar storage is now a viable option.', 'Lưu trữ điện mặt trời nay là lựa chọn khả thi.'),
    ],
  },
];

function isPlainRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function sanitizeWord(raw: unknown, fallbackLevel: CefrLevel): VocabEntry | null {
  if (!isPlainRecord(raw)) return null;
  if (typeof raw.word !== 'string') return null;
  const word = raw.word.trim().toLowerCase();
  if (!/^[a-z]{3,8}$/.test(word)) return null;
  const pos: PartOfSpeech =
    raw.pos === 'n.' || raw.pos === 'v.' || raw.pos === 'adj.' || raw.pos === 'adv.'
      ? raw.pos
      : 'n.';
  const level: CefrLevel =
    raw.level === 'A1' ||
    raw.level === 'A2' ||
    raw.level === 'B1' ||
    raw.level === 'B2' ||
    raw.level === 'C1'
      ? raw.level
      : fallbackLevel;
  const vi = typeof raw.vi === 'string' && raw.vi.trim() ? raw.vi.trim() : word;
  const en = typeof raw.en === 'string' && raw.en.trim() ? raw.en.trim() : vi;
  const ipa = typeof raw.ipa === 'string' && raw.ipa.trim() ? raw.ipa.trim() : `/${word}/`;
  const rawEx = typeof raw.example === 'string' && raw.example.trim() ? raw.example.trim() : '';
  const hasExactWord = rawEx && new RegExp(`\\b${word}\\b`, 'i').test(rawEx);
  const example = hasExactWord ? rawEx : `We practice the word ${word} every day.`;
  const exampleVi =
    typeof raw.exampleVi === 'string' && raw.exampleVi.trim() ? raw.exampleVi.trim() : vi;

  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `custom-${word}`,
    word,
    ipa,
    pos,
    level,
    topic: 'daily',
    en,
    vi,
    example,
    exampleVi,
    ...(typeof raw.audioUrl === 'string' && raw.audioUrl.trim()
      ? { audioUrl: raw.audioUrl.trim() }
      : {}),
    source: 'custom',
  };
}

function sanitizeDeck(raw: unknown, fallbackOrigin: WordDeck['origin']): WordDeck | null {
  if (!isPlainRecord(raw)) return null;
  if (typeof raw.id !== 'string' || !raw.id.trim()) return null;
  if (typeof raw.name !== 'string' || !raw.name.trim()) return null;
  const level: CefrLevel =
    raw.level === 'A1' ||
    raw.level === 'A2' ||
    raw.level === 'B1' ||
    raw.level === 'B2' ||
    raw.level === 'C1'
      ? raw.level
      : 'B1';
  const color: DeckColor =
    raw.color === 'coral' ||
    raw.color === 'lavender' ||
    raw.color === 'mint' ||
    raw.color === 'sunny' ||
    raw.color === 'sky'
      ? raw.color
      : 'coral';
  const rawWords = Array.isArray(raw.words) ? raw.words : [];
  const seen = new Set<string>();
  const words: VocabEntry[] = [];
  for (const item of rawWords) {
    const clean = sanitizeWord(item, level);
    if (clean && !seen.has(clean.word)) {
      seen.add(clean.word);
      words.push(clean);
    }
  }
  return {
    id: raw.id.trim(),
    name: raw.name.trim(),
    description: typeof raw.description === 'string' ? raw.description.trim() : '',
    author: typeof raw.author === 'string' && raw.author.trim() ? raw.author.trim() : 'Bạn',
    level,
    color,
    words,
    origin:
      raw.origin === 'mine' || raw.origin === 'community' || raw.origin === 'downloaded'
        ? raw.origin
        : fallbackOrigin,
    published: Boolean(raw.published),
    downloads: typeof raw.downloads === 'number' && Number.isFinite(raw.downloads) ? raw.downloads : 0,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
}

function readDeckList(key: string, fallbackOrigin: WordDeck['origin']): WordDeck[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => sanitizeDeck(item, fallbackOrigin))
      .filter((d): d is WordDeck => d !== null);
  } catch {
    return [];
  }
}

function writeDeckList(key: string, decks: readonly WordDeck[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(decks));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadMyDecks(): WordDeck[] {
  return readDeckList(MY_DECKS_KEY, 'mine');
}

export function saveMyDeck(deck: WordDeck): WordDeck[] {
  const existing = loadMyDecks();
  const normalized: WordDeck = {
    ...deck,
    origin: 'mine',
    updatedAt: Date.now(),
  };
  const idx = existing.findIndex((d) => d.id === normalized.id);
  const next =
    idx >= 0
      ? existing.map((d, i) => (i === idx ? normalized : d))
      : [normalized, ...existing];
  writeDeckList(MY_DECKS_KEY, next);

  // If already published, keep community copy in sync
  if (normalized.published) {
    publishDeckToCommunity(normalized);
  }
  return next;
}

export function deleteMyDeck(deckId: string): WordDeck[] {
  const next = loadMyDecks().filter((d) => d.id !== deckId);
  writeDeckList(MY_DECKS_KEY, next);
  return next;
}

export function loadCommunityDecks(): WordDeck[] {
  const userPublished = readDeckList(COMMUNITY_DECKS_KEY, 'community');
  const seen = new Set(userPublished.map((d) => d.id));
  const merged = [
    ...userPublished,
    ...COMMUNITY_SEED_DECKS.filter((d) => !seen.has(d.id)),
  ];
  return merged;
}

export function publishDeckToCommunity(deck: WordDeck): WordDeck[] {
  const existingMy = loadMyDecks();
  const updatedMy = existingMy.map((d) =>
    d.id === deck.id ? { ...d, published: true, updatedAt: Date.now() } : d
  );
  writeDeckList(MY_DECKS_KEY, updatedMy);

  const community = readDeckList(COMMUNITY_DECKS_KEY, 'community');
  const publishedCopy: WordDeck = {
    ...deck,
    origin: 'community',
    published: true,
    downloads: Math.max(1, deck.downloads ?? 1),
    updatedAt: Date.now(),
  };
  const idx = community.findIndex((d) => d.id === publishedCopy.id);
  const nextCommunity =
    idx >= 0
      ? community.map((d, i) => (i === idx ? publishedCopy : d))
      : [publishedCopy, ...community];
  writeDeckList(COMMUNITY_DECKS_KEY, nextCommunity);
  return loadCommunityDecks();
}

export function loadDownloadedDecks(): WordDeck[] {
  return readDeckList(DOWNLOADED_DECKS_KEY, 'downloaded');
}

export function downloadCommunityDeck(deck: WordDeck): WordDeck[] {
  const existing = loadDownloadedDecks();
  const copy: WordDeck = {
    ...deck,
    origin: 'downloaded',
    updatedAt: Date.now(),
  };
  const idx = existing.findIndex((d) => d.id === copy.id);
  const next =
    idx >= 0
      ? existing.map((d, i) => (i === idx ? copy : d))
      : [copy, ...existing];
  writeDeckList(DOWNLOADED_DECKS_KEY, next);
  return next;
}

export function removeDownloadedDeck(deckId: string): WordDeck[] {
  const next = loadDownloadedDecks().filter((d) => d.id !== deckId);
  writeDeckList(DOWNLOADED_DECKS_KEY, next);
  return next;
}

/** Returns all decks usable for gameplay (user's own decks + downloaded community decks with >= 2 words) */
export function getPlayableDecks(): WordDeck[] {
  const mine = loadMyDecks();
  const downloaded = loadDownloadedDecks();
  const seen = new Set(mine.map((d) => d.id));
  return [
    ...mine,
    ...downloaded.filter((d) => !seen.has(d.id)),
  ].filter((d) => d.words.length >= 2);
}

/** Encodes a deck into a compact UTF-8 share code (`WORDPOP-DECK:...`) */
export function exportDeckToShareCode(deck: WordDeck): string {
  const payload = {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    author: deck.author,
    level: deck.level,
    color: deck.color,
    words: deck.words,
  };
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `${SHARE_PREFIX}${btoa(binary)}`;
}

/** Imports a deck from either a `WORDPOP-DECK:...` share code or raw JSON string */
export function importDeckFromText(rawText: string): WordDeck | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;
  try {
    let jsonStr = trimmed;
    if (trimmed.startsWith(SHARE_PREFIX)) {
      const b64 = trimmed.slice(SHARE_PREFIX.length).trim();
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      jsonStr = new TextDecoder().decode(bytes);
    }
    const parsed: unknown = JSON.parse(jsonStr);
    if (!isPlainRecord(parsed)) return null;
    const withId = {
      ...parsed,
      id:
        typeof parsed.id === 'string' && parsed.id.trim()
          ? `imp-${parsed.id.trim()}`
          : `imp-${Date.now()}`,
      origin: 'downloaded',
    };
    const deck = sanitizeDeck(withId, 'downloaded');
    if (!deck || deck.words.length === 0) return null;
    return deck;
  } catch {
    return null;
  }
}

/** Bulk parses quick lines like `clock - đồng hồ` or `garden | khu vườn` into VocabEntry items */
export function parseQuickWordLines(
  raw: string,
  level: CefrLevel
): VocabEntry[] {
  const lines = raw.split(/\r?\n/);
  const seen = new Set<string>();
  const results: VocabEntry[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+[-|:]\s+|\s*[|:]\s*/);
    const word = (parts[0] ?? '').trim().toLowerCase();
    if (!/^[a-z]{3,8}$/.test(word) || seen.has(word)) continue;
    seen.add(word);
    const meaning = (parts.slice(1).join(' - ') || word).trim();
    results.push({
      id: `custom-${Date.now()}-${word}`,
      word,
      ipa: `/${word}/`,
      pos: 'n.',
      level,
      topic: 'daily',
      en: meaning,
      vi: meaning,
      example: `We use the word ${word} in daily English.`,
      exampleVi: meaning,
      source: 'custom',
    });
  }
  return results;
}
