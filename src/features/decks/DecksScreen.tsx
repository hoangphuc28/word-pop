import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Download,
  Edit3,
  Globe2,
  Loader2,
  Play,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { soundEngine } from '../../audio/soundEngine';
import { speechEngine } from '../../audio/speechEngine';
import { Button25D } from '../../components/Button25D';
import { Card25D } from '../../components/Card25D';
import { autofillWordEntry } from '../../data/liveVocabService';
import {
  CEFR_LEVELS,
  type DeckColor,
  type PartOfSpeech,
  type VocabEntry,
  type WordDeck,
} from '../../engine/types';
import { type Lang, t } from '../../i18n';
import {
  deleteMyDeck,
  downloadCommunityDeck,
  exportDeckToShareCode,
  importDeckFromText,
  loadCommunityDecks,
  loadDownloadedDecks,
  loadMyDecks,
  parseQuickWordLines,
  publishDeckToCommunity,
  removeDownloadedDeck,
  saveMyDeck,
} from '../../storage/deckStore';

export interface DecksScreenProps {
  lang: Lang;
  onPlayDeck: (deck: WordDeck) => void;
  onDecksChanged?: () => void;
  onBack: () => void;
}

const DECK_COLORS: DeckColor[] = ['coral', 'lavender', 'mint', 'sunny', 'sky'];
const POS_OPTIONS: PartOfSpeech[] = ['n.', 'v.', 'adj.', 'adv.'];

const COLOR_BADGE: Record<DeckColor, string> = {
  coral: 'bg-gradient-to-br from-[#FF8A65] to-[#F43F5E] border-[#BE123C]',
  lavender: 'bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] border-[#4338CA]',
  mint: 'bg-gradient-to-br from-[#14B8A6] to-[#10B981] border-[#047857]',
  sunny: 'bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] border-[#B45309]',
  sky: 'bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] border-[#0369A1]',
};

export function DecksScreen({
  lang,
  onPlayDeck,
  onDecksChanged,
  onBack,
}: DecksScreenProps): React.JSX.Element {
  const [tab, setTab] = useState<'saved' | 'community'>('saved');
  const [myDecks, setMyDecks] = useState<WordDeck[]>(() => loadMyDecks());
  const [downloadedDecks, setDownloadedDecks] = useState<WordDeck[]>(() =>
    loadDownloadedDecks()
  );
  const [communityDecks, setCommunityDecks] = useState<WordDeck[]>(() =>
    loadCommunityDecks()
  );
  const [previewDeckId, setPreviewDeckId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Import panel state
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Editor state
  const [editingDeck, setEditingDeck] = useState<WordDeck | null>(null);
  const [wordInput, setWordInput] = useState('');
  const [viInput, setViInput] = useState('');
  const [enInput, setEnInput] = useState('');
  const [ipaInput, setIpaInput] = useState('');
  const [posInput, setPosInput] = useState<PartOfSpeech>('n.');
  const [exampleInput, setExampleInput] = useState('');
  const [autofilling, setAutofilling] = useState(false);
  const [wordError, setWordError] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const downloadedIds = new Set(downloadedDecks.map((d) => d.id));

  function flashNotice(msg: string): void {
    setNotice(msg);
    setTimeout(() => {
      setNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  }

  function refreshAll(): void {
    setMyDecks(loadMyDecks());
    setDownloadedDecks(loadDownloadedDecks());
    setCommunityDecks(loadCommunityDecks());
    onDecksChanged?.();
  }

  function handleStartCreateDeck(): void {
    soundEngine.playPop();
    const now = Date.now();
    setEditingDeck({
      id: `my-${now}`,
      name: '',
      description: '',
      author: lang === 'vi' ? 'Bạn' : 'You',
      level: 'B1',
      color: 'coral',
      words: [],
      origin: 'mine',
      published: false,
      createdAt: now,
      updatedAt: now,
    });
    setWordInput('');
    setViInput('');
    setEnInput('');
    setIpaInput('');
    setPosInput('n.');
    setExampleInput('');
    setWordError(null);
    setBulkOpen(false);
    setBulkText('');
  }

  function handleEditDeck(deck: WordDeck): void {
    soundEngine.playPop();
    setEditingDeck({ ...deck, words: [...deck.words] });
    setWordError(null);
    setBulkOpen(false);
  }

  async function handleAutofill(): Promise<void> {
    const clean = wordInput.trim().toLowerCase();
    if (!/^[a-z]{3,8}$/.test(clean)) {
      setWordError(t(lang, 'decks.wordRule'));
      return;
    }
    setWordError(null);
    setAutofilling(true);
    const filled = await autofillWordEntry(
      clean,
      editingDeck?.level ?? 'B1',
      'daily'
    );
    setAutofilling(false);
    if (filled) {
      soundEngine.playHint();
      if (filled.vi) setViInput(filled.vi);
      if (filled.en) setEnInput(filled.en);
      if (filled.ipa) setIpaInput(filled.ipa);
      if (filled.pos) setPosInput(filled.pos);
      if (filled.example) setExampleInput(filled.example);
    }
  }

  function handleAddWordToEditor(): void {
    if (!editingDeck) return;
    const clean = wordInput.trim().toLowerCase();
    if (!/^[a-z]{3,8}$/.test(clean)) {
      setWordError(t(lang, 'decks.wordRule'));
      return;
    }
    if (editingDeck.words.some((w) => w.word === clean)) {
      setWordError(t(lang, 'decks.wordDuplicate'));
      return;
    }
    const vi = viInput.trim() || enInput.trim() || clean;
    const en = enInput.trim() || vi;
    const rawEx = exampleInput.trim();
    const example =
      rawEx && new RegExp(`\\b${clean}\\b`, 'i').test(rawEx)
        ? rawEx
        : `We practice the word ${clean} every day.`;

    const nextWord: VocabEntry = {
      id: `${editingDeck.id}-${clean}`,
      word: clean,
      ipa: ipaInput.trim() || `/${clean}/`,
      pos: posInput,
      level: editingDeck.level,
      topic: 'daily',
      en,
      vi,
      example,
      exampleVi: vi,
      source: 'custom',
    };

    soundEngine.playPop();
    setEditingDeck({
      ...editingDeck,
      words: [...editingDeck.words, nextWord],
    });
    setWordInput('');
    setViInput('');
    setEnInput('');
    setIpaInput('');
    setExampleInput('');
    setWordError(null);
  }

  function handleBulkAdd(): void {
    if (!editingDeck) return;
    const parsed = parseQuickWordLines(bulkText, editingDeck.level);
    if (parsed.length === 0) return;
    const existingSet = new Set(editingDeck.words.map((w) => w.word));
    const unique = parsed.filter((w) => !existingSet.has(w.word));
    if (unique.length === 0) return;
    soundEngine.playSuccess();
    setEditingDeck({
      ...editingDeck,
      words: [...editingDeck.words, ...unique],
    });
    setBulkText('');
    setBulkOpen(false);
  }

  function handleSaveEditor(): void {
    if (!editingDeck || !editingDeck.name.trim() || editingDeck.words.length < 2) {
      return;
    }
    soundEngine.playSuccess();
    saveMyDeck(editingDeck);
    setEditingDeck(null);
    refreshAll();
    flashNotice(t(lang, 'decks.savedNotice'));
  }

  function handlePublish(deck: WordDeck): void {
    soundEngine.playSuccess();
    publishDeckToCommunity(deck);
    refreshAll();
    flashNotice(t(lang, 'decks.publishedNotice'));
  }

  async function handleCopyShareCode(deck: WordDeck): Promise<void> {
    soundEngine.playPop();
    const code = exportDeckToShareCode(deck);
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(code);
        flashNotice(t(lang, 'decks.copiedCode'));
        return;
      }
    } catch {
      // Fallback to JSON download
    }
    handleDownloadJson(deck);
  }

  function handleDownloadJson(deck: WordDeck): void {
    soundEngine.playPop();
    const blob = new Blob([JSON.stringify(deck, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'wordpop-deck'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flashNotice(t(lang, 'decks.exportedJson'));
  }

  function handleDownloadCommunity(deck: WordDeck): void {
    soundEngine.playSuccess();
    downloadCommunityDeck(deck);
    refreshAll();
    flashNotice(t(lang, 'decks.downloadedNotice', { name: deck.name }));
  }

  function handleImportSubmit(): void {
    const imported = importDeckFromText(importText);
    if (!imported || imported.words.length < 2) {
      setImportError(t(lang, 'decks.importInvalid'));
      return;
    }
    soundEngine.playSuccess();
    downloadCommunityDeck(imported);
    refreshAll();
    setImportOpen(false);
    setImportText('');
    setImportError(null);
    setTab('saved');
    flashNotice(t(lang, 'decks.importedNotice', { name: imported.name }));
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportText(reader.result);
        setImportError(null);
      }
    };
    reader.readAsText(file);
  }

  const savedDecks: WordDeck[] = [
    ...myDecks,
    ...downloadedDecks.filter((d) => !myDecks.some((m) => m.id === d.id)),
  ];

  // --- DECK EDITOR VIEW ---
  if (editingDeck) {
    const canSave = editingDeck.name.trim().length > 0 && editingDeck.words.length >= 2;
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <Button25D
            color="white"
            size="sm"
            onClick={() => {
              soundEngine.playPop();
              setEditingDeck(null);
            }}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t(lang, 'game.back')}</span>
          </Button25D>

          <h2 className="font-display text-xl font-extrabold text-slate-800">
            {t(lang, 'decks.editorTitle')}
          </h2>

          <Button25D
            color="mint"
            size="sm"
            disabled={!canSave}
            onClick={handleSaveEditor}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            <span>{t(lang, 'decks.save')}</span>
          </Button25D>
        </div>

        <Card25D className="flex flex-col gap-3.5 border-amber-200/80 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-extrabold text-slate-600">
                {t(lang, 'decks.nameLabel')}
              </label>
              <input
                type="text"
                value={editingDeck.name}
                onChange={(e) =>
                  setEditingDeck({ ...editingDeck, name: e.target.value })
                }
                placeholder={t(lang, 'decks.namePlaceholder')}
                className="w-full rounded-xl border-2 border-amber-200 bg-white px-3 py-2 text-base font-bold text-slate-800 focus:border-violet-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-extrabold text-slate-600">
                {t(lang, 'decks.authorLabel')}
              </label>
              <input
                type="text"
                value={editingDeck.author}
                onChange={(e) =>
                  setEditingDeck({ ...editingDeck, author: e.target.value })
                }
                className="w-full rounded-xl border-2 border-amber-200 bg-white px-3 py-2 text-base font-bold text-slate-800 focus:border-violet-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-extrabold text-slate-600">
              {t(lang, 'decks.descLabel')}
            </label>
            <input
              type="text"
              value={editingDeck.description}
              onChange={(e) =>
                setEditingDeck({ ...editingDeck, description: e.target.value })
              }
              placeholder={t(lang, 'decks.descPlaceholder')}
              className="w-full rounded-xl border-2 border-amber-200 bg-white px-3 py-2 text-base font-bold text-slate-800 focus:border-violet-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {CEFR_LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEditingDeck({ ...editingDeck, level: lvl })}
                  className={[
                    'rounded-xl border-2 px-2.5 py-1 font-display text-xs font-extrabold cursor-pointer transition-all',
                    editingDeck.level === lvl
                      ? 'bg-violet-500 border-violet-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300',
                  ].join(' ')}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {DECK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setEditingDeck({ ...editingDeck, color: c })}
                  className={[
                    'h-7 w-7 rounded-full border-2 cursor-pointer transition-transform',
                    COLOR_BADGE[c],
                    editingDeck.color === c ? 'scale-115 ring-2 ring-slate-800' : 'opacity-70',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
        </Card25D>

        {/* Add Word Panel */}
        <Card25D className="flex flex-col gap-3 border-amber-200/80 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-extrabold text-slate-800">
              {t(lang, 'decks.addWordTitle')} ({editingDeck.words.length})
            </h3>
            <button
              type="button"
              onClick={() => setBulkOpen((prev) => !prev)}
              className="text-xs font-extrabold text-violet-600 hover:underline cursor-pointer"
            >
              {bulkOpen ? t(lang, 'decks.singleMode') : t(lang, 'decks.bulkMode')}
            </button>
          </div>

          {bulkOpen ? (
            <div className="flex flex-col gap-2">
              <textarea
                rows={4}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'clock - Đồng hồ\ngarden - Khu vườn\nrocket - Tên lửa'}
                className="w-full rounded-xl border-2 border-amber-200 bg-white p-3 text-base font-semibold text-slate-800 focus:border-violet-400 focus:outline-none"
              />
              <Button25D color="lavender" size="sm" onClick={handleBulkAdd}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>{t(lang, 'decks.bulkAddBtn')}</span>
              </Button25D>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wordInput}
                  onChange={(e) => {
                    setWordInput(e.target.value);
                    setWordError(null);
                  }}
                  placeholder={t(lang, 'decks.wordPlaceholder')}
                  className="min-w-0 flex-1 rounded-xl border-2 border-amber-200 bg-white px-3 py-2 text-base font-bold text-slate-800 focus:border-violet-400 focus:outline-none"
                />
                <Button25D
                  color="lavender"
                  size="sm"
                  disabled={autofilling || !wordInput.trim()}
                  onClick={() => void handleAutofill()}
                >
                  {autofilling ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{t(lang, 'decks.autofill')}</span>
                </Button25D>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={viInput}
                  onChange={(e) => setViInput(e.target.value)}
                  placeholder={t(lang, 'decks.viPlaceholder')}
                  className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-800 focus:border-violet-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={enInput}
                  onChange={(e) => setEnInput(e.target.value)}
                  placeholder={t(lang, 'decks.enPlaceholder')}
                  className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-800 focus:border-violet-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={ipaInput}
                  onChange={(e) => setIpaInput(e.target.value)}
                  placeholder="/ˈæp.əl/"
                  className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-800 focus:border-violet-400 focus:outline-none"
                />
                <select
                  value={posInput}
                  onChange={(e) => setPosInput(e.target.value as PartOfSpeech)}
                  className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base font-bold text-slate-800 focus:border-violet-400 focus:outline-none"
                >
                  {POS_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <Button25D color="coral" size="sm" onClick={handleAddWordToEditor}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>{t(lang, 'decks.addBtn')}</span>
                </Button25D>
              </div>

              <input
                type="text"
                value={exampleInput}
                onChange={(e) => setExampleInput(e.target.value)}
                placeholder={t(lang, 'decks.examplePlaceholder')}
                className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-base font-semibold text-slate-800 focus:border-violet-400 focus:outline-none"
              />
            </div>
          )}

          {wordError && (
            <p className="text-xs font-extrabold text-rose-500">{wordError}</p>
          )}

          {/* Added words list */}
          {editingDeck.words.length > 0 ? (
            <div className="mt-1 flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
              {editingDeck.words.map((w) => (
                <div
                  key={w.word}
                  className="flex items-center justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-extrabold text-slate-800">
                        {w.word}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {w.ipa}
                      </span>
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-extrabold text-violet-700">
                        {w.pos}
                      </span>
                    </div>
                    <p className="truncate text-xs font-bold text-slate-600">
                      {w.vi}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${w.word}`}
                    onClick={() =>
                      setEditingDeck({
                        ...editingDeck,
                        words: editingDeck.words.filter((x) => x.word !== w.word),
                      })
                    }
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs font-bold text-slate-400">
              {t(lang, 'decks.minTwoWords')}
            </p>
          )}
        </Card25D>
      </div>
    );
  }

  // --- MAIN DECK LIBRARY VIEW ---
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-5 sm:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button25D
          color="white"
          size="sm"
          onClick={() => {
            soundEngine.playPop();
            onBack();
          }}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{t(lang, 'game.back')}</span>
        </Button25D>

        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-800">
          {t(lang, 'decks.title')}
        </h1>

        <div className="flex items-center gap-2">
          <Button25D
            color="white"
            size="sm"
            onClick={() => {
              soundEngine.playPop();
              setImportOpen((prev) => !prev);
            }}
          >
            <Upload className="h-4 w-4 text-violet-600" aria-hidden="true" />
            <span>{t(lang, 'decks.import')}</span>
          </Button25D>
          <Button25D color="coral" size="sm" onClick={handleStartCreateDeck}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{t(lang, 'decks.create')}</span>
          </Button25D>
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-800">
          {notice}
        </div>
      )}

      {/* Import Share Code / JSON panel */}
      {importOpen && (
        <Card25D className="flex flex-col gap-3 border-violet-200 bg-violet-50/50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-extrabold text-violet-950">
              {t(lang, 'decks.importTitle')}
            </h3>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="rounded-lg p-1 text-slate-500 hover:bg-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            rows={3}
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError(null);
            }}
            placeholder={t(lang, 'decks.importPlaceholder')}
            className="w-full rounded-xl border-2 border-violet-200 bg-white p-2.5 text-sm font-semibold text-slate-800 focus:border-violet-400 focus:outline-none"
          />
          {importError && (
            <p className="text-xs font-extrabold text-rose-600">{importError}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button25D color="lavender" size="sm" onClick={handleImportSubmit}>
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{t(lang, 'decks.importConfirm')}</span>
            </Button25D>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <Button25D
              color="white"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <span>{t(lang, 'decks.chooseJsonFile')}</span>
            </Button25D>
          </div>
        </Card25D>
      )}

      {/* Segmented Tabs: My & Downloaded vs Community */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-amber-200/80 bg-amber-100/60 p-1.5 shadow-inner">
        <button
          type="button"
          aria-pressed={tab === 'saved'}
          onClick={() => {
            soundEngine.playPop();
            setTab('saved');
          }}
          className={[
            'flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 font-display text-sm sm:text-base font-extrabold transition-all cursor-pointer',
            tab === 'saved'
              ? 'bg-white text-rose-700 shadow-sm border-b-2 border-rose-300'
              : 'text-slate-700 hover:bg-white/60',
          ].join(' ')}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span>
            {t(lang, 'decks.myTab')} ({savedDecks.length})
          </span>
        </button>

        <button
          type="button"
          aria-pressed={tab === 'community'}
          onClick={() => {
            soundEngine.playPop();
            setTab('community');
          }}
          className={[
            'flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 font-display text-sm sm:text-base font-extrabold transition-all cursor-pointer',
            tab === 'community'
              ? 'bg-white text-violet-700 shadow-sm border-b-2 border-violet-300'
              : 'text-slate-700 hover:bg-white/60',
          ].join(' ')}
        >
          <Globe2 className="h-4 w-4" aria-hidden="true" />
          <span>
            {t(lang, 'decks.communityTab')} ({communityDecks.length})
          </span>
        </button>
      </div>

      {/* Deck Cards Grid */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.14 }}
        className="grid grid-cols-1 gap-3.5 sm:grid-cols-2"
      >
        {(tab === 'saved' ? savedDecks : communityDecks).map((deck) => {
          const isMine = deck.origin === 'mine';
          const isDownloaded = downloadedIds.has(deck.id);
          const isPreview = previewDeckId === deck.id;

          return (
            <Card25D
              key={deck.id}
              className="flex flex-col justify-between gap-3 border-amber-200/80 p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-b-4 text-white font-display text-lg font-extrabold shadow-sm ${COLOR_BADGE[deck.color]}`}
                >
                  {deck.level}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="font-display text-lg font-extrabold text-slate-800 leading-tight">
                      {deck.name}
                    </h3>
                    {deck.published && isMine && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                        {t(lang, 'decks.publishedBadge')}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs font-bold text-slate-500">
                    {deck.author} · {deck.words.length} {t(lang, 'decks.wordsUnit')}
                    {tab === 'community' && deck.downloads
                      ? ` · ${deck.downloads} ↓`
                      : ''}
                  </p>
                  {deck.description && (
                    <p className="mt-1 text-xs font-semibold text-slate-600 line-clamp-2">
                      {deck.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Word Preview Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewDeckId(isPreview ? null : deck.id)
                  }
                  className="text-xs font-extrabold text-violet-600 hover:underline cursor-pointer"
                >
                  {isPreview
                    ? t(lang, 'decks.hideWords')
                    : t(lang, 'decks.previewWords')}
                </button>

                {isPreview && (
                  <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl bg-amber-50/70 p-2.5 border border-amber-100">
                    {deck.words.map((w) => (
                      <button
                        key={w.word}
                        type="button"
                        onClick={() =>
                          w.audioUrl
                            ? speechEngine.speak(w.word, w.audioUrl)
                            : speechEngine.speak(w.word)
                        }
                        title={`${w.vi} (${w.ipa})`}
                        className="inline-flex items-center gap-1 rounded-lg bg-white border border-amber-200 px-2 py-1 text-xs font-bold text-slate-700 hover:bg-rose-50 cursor-pointer"
                      >
                        <span>{w.word}</span>
                        <Volume2 className="h-3 w-3 text-rose-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button25D
                  color="mint"
                  size="sm"
                  disabled={deck.words.length < 2}
                  onClick={() => {
                    soundEngine.playPop();
                    onPlayDeck(deck);
                  }}
                >
                  <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span>{t(lang, 'decks.playDeck')}</span>
                </Button25D>

                {tab === 'community' ? (
                  <Button25D
                    color={isDownloaded ? 'white' : 'lavender'}
                    size="sm"
                    onClick={() => handleDownloadCommunity(deck)}
                  >
                    {isDownloaded ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {isDownloaded
                        ? t(lang, 'decks.downloaded')
                        : t(lang, 'decks.download')}
                    </span>
                  </Button25D>
                ) : (
                  <>
                    {isMine && (
                      <>
                        <Button25D
                          color="white"
                          size="sm"
                          onClick={() => handleEditDeck(deck)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button25D>
                        <Button25D
                          color="lavender"
                          size="sm"
                          onClick={() => handlePublish(deck)}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>{t(lang, 'decks.publish')}</span>
                        </Button25D>
                      </>
                    )}
                    <Button25D
                      color="white"
                      size="sm"
                      title={t(lang, 'decks.copyCode')}
                      onClick={() => void handleCopyShareCode(deck)}
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-600" />
                    </Button25D>
                    <Button25D
                      color="white"
                      size="sm"
                      title={t(lang, 'decks.delete')}
                      onClick={() => {
                        soundEngine.playPop();
                        if (isMine) deleteMyDeck(deck.id);
                        else removeDownloadedDeck(deck.id);
                        refreshAll();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button25D>
                  </>
                )}
              </div>
            </Card25D>
          );
        })}

        {tab === 'saved' && savedDecks.length === 0 && (
          <Card25D className="col-span-full flex flex-col items-center gap-3 border-amber-200/80 p-8 text-center">
            <BookOpen className="h-10 w-10 text-amber-400" />
            <p className="font-display text-lg font-extrabold text-slate-700">
              {t(lang, 'decks.emptySaved')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button25D color="coral" size="sm" onClick={handleStartCreateDeck}>
                <Plus className="h-4 w-4" />
                <span>{t(lang, 'decks.create')}</span>
              </Button25D>
              <Button25D
                color="lavender"
                size="sm"
                onClick={() => setTab('community')}
              >
                <Globe2 className="h-4 w-4" />
                <span>{t(lang, 'decks.browseCommunity')}</span>
              </Button25D>
            </div>
          </Card25D>
        )}
      </motion.div>
    </div>
  );
}
