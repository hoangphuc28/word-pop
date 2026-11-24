# WordPop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build **WordPop**, a bilingual (EN/VI) 2.5D English vocabulary puzzle PWA matching MathPop's design system, featuring **WordCross** (core intersecting word crosswords) and **Sentence Pop** (Study Lab contextual fill-in-the-blank).

**Architecture:** 100% client-side React 19 + TypeScript + Vite SPA/PWA with Tailwind CSS v4, Framer Motion, Web Audio API synthesizer, Web Speech API pronunciation, curated 8-topic × 4-CEFR-tier vocabulary bank (~360–400 words), deterministic seeded puzzle generators with Leitner spaced repetition, and versioned `localStorage` persistence (`wordpop_progress_v1`).

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4 (`@tailwindcss/vite`), Framer Motion, `lucide-react`, `vite-plugin-pwa`, Web Audio API, Web Speech API, Vitest, Testing Library (`jsdom`).

**Spec:** `docs/superpowers/specs/2026-11-24-wordpop-design.md`

## Global Constraints

- Brand & visual DNA match MathPop (`d:\Projects\3rd Project`): `Baloo 2` + `Nunito`, `Button25D`, `Card25D`, `Tile25D`, `PlumpStar`, `LandscapeBackdrop`, rounded Game Stage with `.outer-backdrop` dot-grid, 2-tone logo (`Word` + sky-to-blue gradient `Pop`).
- Bilingual `en` / `vi` UI; zero backend, zero PII, persisted in `localStorage` under `wordpop_progress_v1`.
- Strict `SettingsModal` UX order: Background Music (toggle + slider) → Sound Effects (toggle + slider) → Language (`EN / VI`) → divider → Learning Stats → Guide & Explanations.
- Footer outside fullscreen: `WordPop · crafted by Hoàng Phúc`.
- Mobile-first: `maximum-scale=1.0, viewport-fit=cover`, smooth `touch-pan-y` scrolling, no OS keyboard auto-zoom (Super Mode uses custom 2.5D on-screen QWERTY bar + physical `keydown`).
- Topic selector is Study Lab (`practice`) exclusive; Quick Play & Endless automatically mix all 8 topics.
- Sentence Pop uses explicit `Check` submission (no accidental auto-submit on tap).

## Review Focus

1. **Crossword compactness & connectivity:** 50+ seeds across all CEFR tiers and single-topic buckets must always produce `rows <= 9`, `cols <= 9`, and 1 connected component (tested in Task 4).
2. **Narrow Study Lab pool relaxation:** Selecting 1 topic × 1 CEFR tier for a 5-puzzle session must never throw or stall, relaxing in order: adjacent CEFR in same topic → all topics at target CEFR → cooldown repeats (tested in Task 4).
3. **Corrupted `localStorage` resilience:** Malformed JSON, wrong schema version, or out-of-range numbers must cleanly fall back to default progress (tested in Task 3).
4. **Missing Web Speech API safety:** Environments without `window.speechSynthesis` (jsdom, restricted WebViews) must safely no-op without throwing (tested in Task 5).
5. **Super Mode cell protection:** Typing via physical keyboard or on-screen QWERTY must never overwrite `fixed` or `hint` cells and must auto-advance across remaining blanks (tested in Task 7).

---

## File Structure Overview

- Config & Public: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `public/icon-192.svg`, `public/icon-512.svg`
- Styles & Entry: `src/index.css`, `src/main.tsx`, `src/test/setup.ts`, `src/App.tsx`
- Vocabulary Data: `src/data/vocab/{daily,food,travel,nature,work,tech,feelings,culture}.ts`, `src/data/vocabulary.ts`
- Core Engine: `src/engine/types.ts`, `spacedRepetition.ts`, `wordCrossGenerator.ts`, `wordCrossValidator.ts`, `sentencePopGenerator.ts`
- Storage & i18n: `src/storage/progressStore.ts`, `src/i18n/{en.json,vi.json,index.ts}`
- Audio & Speech: `src/audio/soundEngine.ts`, `src/audio/speechEngine.ts`
- Shared UI: `src/components/{Button25D,Card25D,Tile25D,PlumpStar,LandscapeBackdrop,QwertyBar25D,SplashScreen,SettingsModal,StatsModal,GuideModal,VictoryModal,GameOverModal}.tsx`
- Feature Screens: `src/features/home/HomeHub.tsx`, `src/features/word-cross/{WordCrossScreen,WordReviewList}.tsx`, `src/features/sentence-pop/SentencePopScreen.tsx`

---

### Task 1: Project Scaffold, Config, PWA Icons & Core Types

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/index.css`, `src/main.tsx`, `src/test/setup.ts`, `public/icon-192.svg`, `public/icon-512.svg`, `src/engine/types.ts`
- Test: `src/engine/__tests__/types.test.ts`

**Interfaces:**
- Produces in `src/engine/types.ts`:
  - `CefrLevel = 'A1' | 'A2' | 'B1' | 'B2C1'`
  - `VocabTopic = 'daily' | 'food' | 'travel' | 'nature' | 'work' | 'tech' | 'feelings' | 'culture'`
  - `PartOfSpeech = 'n.' | 'v.' | 'adj.' | 'adv.'`
  - `GameMode = 'word-cross' | 'sentence-pop'`
  - `SessionMode = 'quick' | 'endless' | 'practice'`
  - `InputMode = 'tray' | 'keyboard'`
  - `VocabEntry { id: string; word: string; ipa: string; pos: PartOfSpeech; level: CefrLevel; topic: VocabTopic; en: string; vi: string; example: string; exampleVi: string }`
  - `PlayConfig { mode: GameMode; sessionMode: SessionMode; inputMode: InputMode; level: CefrLevel; topics: VocabTopic[] }`
  - `WordCrossCell`, `WordCrossEntry`, `WordCrossPuzzle`, `SentencePopPuzzle`
  - `WordRecord`, `PlayerStats`, `ProgressState`
  - `ALL_TOPICS: readonly VocabTopic[]`, `CEFR_LEVELS: readonly CefrLevel[]`, `makeWordKey(wordId: string): string`, `getEffectiveLevelForEndless(base: CefrLevel, solved: number): CefrLevel`

- [ ] **Step 1: Initialize project scaffold files (`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/index.css`, `src/main.tsx`, `src/test/setup.ts`, `public/icon-192.svg`, `public/icon-512.svg`)**
  Mirror MathPop's exact dependencies, scripts (`dev`, `build`, `preview`, `test`, `test:watch`), Tailwind v4 `.bevel-25d` / `.card-25d` / `.outer-backdrop` / `.animate-gentle-float` styles, Google Fonts (`Baloo 2` + `Nunito`), and PWA manifest configured for `WordPop`. Run `npm install`.

- [ ] **Step 2: Write the failing test in `src/engine/__tests__/types.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import {
  ALL_TOPICS,
  CEFR_LEVELS,
  getEffectiveLevelForEndless,
  makeWordKey,
} from '../types';

describe('engine types helpers', () => {
  it('exposes 8 topics and 4 CEFR levels', () => {
    expect(ALL_TOPICS).toHaveLength(8);
    expect(CEFR_LEVELS).toEqual(['A1', 'A2', 'B1', 'B2C1']);
  });

  it('builds canonical word keys and escalates Endless level every 5 puzzles', () => {
    expect(makeWordKey('daily-apple')).toBe('word:daily-apple');
    expect(getEffectiveLevelForEndless('A1', 0)).toBe('A1');
    expect(getEffectiveLevelForEndless('A1', 4)).toBe('A1');
    expect(getEffectiveLevelForEndless('A1', 5)).toBe('A2');
    expect(getEffectiveLevelForEndless('A1', 10)).toBe('B1');
    expect(getEffectiveLevelForEndless('A1', 15)).toBe('B2C1');
    expect(getEffectiveLevelForEndless('A1', 25)).toBe('B2C1');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**
  Run: `npx vitest run src/engine/__tests__/types.test.ts`
  Expected: FAIL (module `../types` not found).

- [ ] **Step 4: Implement `src/engine/types.ts`**
  Define all domain types and helper functions cleanly.

- [ ] **Step 5: Run test to verify it passes**
  Run: `npx vitest run src/engine/__tests__/types.test.ts`
  Expected: PASS.

- [ ] **Step 6: Initialize git repo (if needed) and commit**
  ```bash
  git init
  git add -A
  git commit -m "chore: scaffold WordPop project, 2.5D styles, PWA icons, and core types"
  ```

---

### Task 2: Curated Bilingual Vocabulary Bank (8 Topics × 4 CEFR Tiers)

**Files:**
- Create: `src/data/vocab/daily.ts`, `src/data/vocab/food.ts`, `src/data/vocab/travel.ts`, `src/data/vocab/nature.ts`, `src/data/vocab/work.ts`, `src/data/vocab/tech.ts`, `src/data/vocab/feelings.ts`, `src/data/vocab/culture.ts`, `src/data/vocabulary.ts`
- Test: `src/data/__tests__/vocabulary.test.ts`

**Interfaces:**
- Consumes: `VocabEntry`, `CefrLevel`, `VocabTopic`, `ALL_TOPICS`, `CEFR_LEVELS` from `src/engine/types.ts`
- Produces in `src/data/vocabulary.ts`:
  - `VOCABULARY: readonly VocabEntry[]`
  - `VOCAB_BY_ID: ReadonlyMap<string, VocabEntry>`
  - `getVocabularyByFilter(topics: readonly VocabTopic[], level?: CefrLevel): VocabEntry[]`

- [ ] **Step 1: Write the failing dataset invariant test in `src/data/__tests__/vocabulary.test.ts`**
```ts
import { describe, expect, it } from 'vitest';
import { ALL_TOPICS, CEFR_LEVELS } from '../../engine/types';
import { VOCABULARY, getVocabularyByFilter } from '../vocabulary';

describe('curated vocabulary bank invariants', () => {
  it('contains at least 360 unique alphabetic words (3-8 chars) across all 8 topics and 4 CEFR levels', () => {
    expect(VOCABULARY.length).toBeGreaterThanOrEqual(360);
    const ids = new Set<string>();
    const words = new Set<string>();

    for (const entry of VOCABULARY) {
      expect(entry.word).toMatch(/^[a-z]{3,8}$/);
      expect(ids.has(entry.id)).toBe(false);
      expect(words.has(entry.word)).toBe(false);
      ids.add(entry.id);
      words.add(entry.word);

      expect(entry.ipa.trim().length).toBeGreaterThan(2);
      expect(entry.en.trim().length).toBeGreaterThan(2);
      expect(entry.vi.trim().length).toBeGreaterThan(1);
      expect(entry.exampleVi.trim().length).toBeGreaterThan(3);

      const wordRegex = new RegExp(`\\b${entry.word}\\b`, 'i');
      expect(entry.example).toMatch(wordRegex);
    }

    for (const topic of ALL_TOPICS) {
      for (const level of CEFR_LEVELS) {
        const bucket = getVocabularyByFilter([topic], level);
        expect(bucket.length, `${topic}/${level}`).toBeGreaterThanOrEqual(11);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/data/__tests__/vocabulary.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Author the 8 topic modules (48 words each = 384 words total, 12 per `topic × CEFR` bucket) and `src/data/vocabulary.ts`**
  Ensure every word is strictly `^[a-z]{3,8}$`, accurate IPA, concise EN definition, natural VI meaning, and an example sentence containing the exact word form + Vietnamese translation.

- [ ] **Step 4: Run test to verify all invariants pass**
  Run: `npx vitest run src/data/__tests__/vocabulary.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/data
  git commit -m "feat: add curated 384-word bilingual CEFR vocabulary bank across 8 topics"
  ```

---

### Task 3: Spaced Repetition, Progress Store & Bilingual i18n

**Files:**
- Create: `src/engine/spacedRepetition.ts`, `src/storage/progressStore.ts`, `src/i18n/en.json`, `src/i18n/vi.json`, `src/i18n/index.ts`
- Test: `src/engine/__tests__/spacedRepetition.test.ts`, `src/storage/__tests__/progressStore.test.ts`, `src/i18n/__tests__/i18n.test.ts`

**Interfaces:**
- Consumes: `CefrLevel`, `PlayerStats`, `ProgressState`, `WordRecord` from `src/engine/types.ts`
- Produces:
  - `src/engine/spacedRepetition.ts`: `recordWordAttempt(existing, key, { correct, usedHint, now })`, `getPrioritizedWordKeys(words, now?)`
  - `src/storage/progressStore.ts`: `STORAGE_KEY = 'wordpop_progress_v1'`, `createDefaultStats()`, `createDefaultProgress()`, `getLocalDateKey(date?)`, `computeNextDailyStreak(current, lastDate, now?)`, `loadProgress()`, `saveProgress(state)`, `resetProgress()`
  - `src/i18n/index.ts`: `Lang = 'en' | 'vi'`, `t(lang, key, params?)`

- [ ] **Step 1: Write failing tests for spaced repetition, progress store (including corrupted JSON / version mismatch / negative values from Review Focus #3), and i18n key parity**
  Verify `en.json` and `vi.json` have identical keys and non-empty strings.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/engine/__tests__/spacedRepetition.test.ts src/storage/__tests__/progressStore.test.ts src/i18n/__tests__/i18n.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement `spacedRepetition.ts`, `progressStore.ts`, `src/i18n/en.json`, `src/i18n/vi.json`, `src/i18n/index.ts`**

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/engine/__tests__/spacedRepetition.test.ts src/storage/__tests__/progressStore.test.ts src/i18n/__tests__/i18n.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/engine/spacedRepetition.ts src/storage src/i18n src/engine/__tests__/spacedRepetition.test.ts
  git commit -m "feat: add spaced repetition, resilient progressStore, and EN/VI i18n"
  ```

---

### Task 4: WordCross & Sentence Pop Generators + Validators

**Files:**
- Create: `src/engine/wordCrossGenerator.ts`, `src/engine/wordCrossValidator.ts`, `src/engine/sentencePopGenerator.ts`
- Test: `src/engine/__tests__/wordCross.test.ts`, `src/engine/__tests__/sentencePop.test.ts`

**Interfaces:**
- Consumes: `VOCABULARY`, `getVocabularyByFilter` from `src/data/vocabulary.ts`; types from `src/engine/types.ts`
- Produces:
  - `generateWordCross(options: { level: CefrLevel; topics: VocabTopic[]; seed: number; prioritizedWordKeys?: string[]; excludeWordIds?: string[]; endlessTierBonus?: number }): WordCrossPuzzle`
  - `validateWordCross(puzzle: WordCrossPuzzle, placements: Record<string, string>): { isComplete: boolean; isValid: boolean; invalidCellIds: string[]; solvedWordIds: string[] }`
  - `generateSentencePop(options: { level: CefrLevel; topics: VocabTopic[]; seed: number; prioritizedWordKeys?: string[]; excludeWordIds?: string[] }): SentencePopPuzzle`

- [ ] **Step 1: Write failing tests in `src/engine/__tests__/wordCross.test.ts` and `src/engine/__tests__/sentencePop.test.ts`**
  Include Review Focus #1 & #2:
  - 50 seeds across all 4 CEFR tiers and single-topic buckets always produce `rows <= 9`, `cols <= 9`, 2–4 connected words, deterministic output for same seed, exact tray letter coverage + expected distractors, and valid intersections where shared letters match.
  - 5-puzzle Study Lab session on a single `topic × CEFR` bucket relaxes smoothly without crashing.
  - `validateWordCross` marks partial/wrong/correct states accurately (case-insensitive).
  - `generateSentencePop` always blanks the exact target word, produces 4–6 unique word chips containing the answer, and handles single-bucket relaxation.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/engine/__tests__/wordCross.test.ts src/engine/__tests__/sentencePop.test.ts`
  Expected: FAIL.

- [ ] **Step 3: Implement `wordCrossGenerator.ts`, `wordCrossValidator.ts`, and `sentencePopGenerator.ts`**
  Use deterministic Mulberry32 PRNG, greedy/backtracking intersection placement bounded to 9×9 with guaranteed fallback, pool relaxation order (`selectedTopics ∩ level` → `selectedTopics ∩ adjacent levels` → `allTopics ∩ level` → cooldown repeats), and blank selection ensuring at least 1 anchor letter per word at A1–B1.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/engine/__tests__/wordCross.test.ts src/engine/__tests__/sentencePop.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/engine/wordCrossGenerator.ts src/engine/wordCrossValidator.ts src/engine/sentencePopGenerator.ts src/engine/__tests__/wordCross.test.ts src/engine/__tests__/sentencePop.test.ts
  git commit -m "feat: add deterministic WordCross and SentencePop puzzle generators and validator"
  ```

---

### Task 5: Audio Engine, Speech Engine & 2.5D UI Primitives

**Files:**
- Create: `src/audio/soundEngine.ts`, `src/audio/speechEngine.ts`, `src/components/Button25D.tsx`, `src/components/Card25D.tsx`, `src/components/Tile25D.tsx`, `src/components/PlumpStar.tsx`, `src/components/LandscapeBackdrop.tsx`, `src/components/QwertyBar25D.tsx`
- Test: `src/components/__tests__/primitives.test.tsx`

**Interfaces:**
- Produces:
  - `soundEngine` (`setEnabled`, `setMusicEnabled`, `setSfxVolume`, `setMusicVolume`, `startBgm`, `stopBgm`, `playPop`, `playPlace`, `playHint`, `playSuccess`, `playError`, `playVictory`)
  - `speechEngine` (`setEnabled`, `setVolume`, `speak(text: string): void`, `stop(): void`)
  - `Button25D`, `Card25D`, `Tile25D` (letter + chip variants), `PlumpStar`, `LandscapeBackdrop` (floating 2.5D `W`, `A`, `B`, `C`, `★` tiles), `QwertyBar25D` (`onKey(letter: string)`, `onBackspace()`, `onSubmit?()`, `disabled?`)

- [ ] **Step 1: Write failing tests in `src/components/__tests__/primitives.test.tsx`**
  Test `Button25D`, `Tile25D` variants, `QwertyBar25D` key clicks & backspace, and Review Focus #4 (`speechEngine.speak('apple')` safely no-ops when `window.speechSynthesis` is undefined or muted).

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/components/__tests__/primitives.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement `soundEngine.ts`, `speechEngine.ts`, and all 6 UI primitive components**

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/components/__tests__/primitives.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/audio src/components
  git commit -m "feat: add Web Audio/Speech engines and 2.5D UI primitives including QwertyBar25D"
  ```

---

### Task 6: SplashScreen, Modals & HomeHub

**Files:**
- Create: `src/components/SplashScreen.tsx`, `src/components/SettingsModal.tsx`, `src/components/StatsModal.tsx`, `src/components/GuideModal.tsx`, `src/components/VictoryModal.tsx`, `src/components/GameOverModal.tsx`, `src/features/home/HomeHub.tsx`
- Test: `src/features/home/__tests__/HomeHub.test.tsx`

**Interfaces:**
- Consumes: primitives from Task 5, `t` from Task 3, `PlayConfig`/`ProgressState` from Task 1
- Produces: `SplashScreen`, `SettingsModal` (strict order: Music slider → SFX slider → EN/VI → divider → Stats → Guide), `StatsModal`, `GuideModal`, `VictoryModal` (with `onReview`), `GameOverModal`, `HomeHub` (2-step progressive disclosure with Daily Streak, Super Mode toggle, 3 session modes, Study Lab WordCross/Sentence Pop segmented toggle + 8-topic selector + 4-tier CEFR selector).

- [ ] **Step 1: Write failing tests in `src/features/home/__tests__/HomeHub.test.tsx`**
  Verify:
  - Step 1 shows Daily Streak banner, Super Mode switch, 3 session cards, Fullscreen & Settings buttons.
  - Selecting Quick Play / Endless hides Topic selector and starts with all 8 topics.
  - Selecting Study Lab shows WordCross / Sentence Pop toggle and 8-topic multi-select (disables Play if 0 topics selected).
  - Toggling Super Mode sets `inputMode: 'keyboard'`.
  - `SettingsModal` renders Music → SFX → Language → Stats → Guide in exact DOM order.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/features/home/__tests__/HomeHub.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement `SplashScreen`, all 5 modals, and `HomeHub`**

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/features/home/__tests__/HomeHub.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components src/features/home
  git commit -m "feat: add SplashScreen, Settings/Stats/Guide/Victory/GameOver modals, and HomeHub"
  ```

---

### Task 7: WordCrossScreen & SentencePopScreen Gameplay + Review Mode

**Files:**
- Create: `src/features/word-cross/WordReviewList.tsx`, `src/features/word-cross/WordCrossScreen.tsx`, `src/features/sentence-pop/SentencePopScreen.tsx`
- Test: `src/features/word-cross/__tests__/WordCrossScreen.test.tsx`, `src/features/sentence-pop/__tests__/SentencePopScreen.test.tsx`

**Interfaces:**
- Consumes: generators/validators (Task 4), primitives & `QwertyBar25D` (Task 5), `VictoryModal` & `GameOverModal` (Task 6), `soundEngine`/`speechEngine`
- Produces:
  - `WordCrossScreen`: Full WordCross gameplay (Standard tap/drag tray + Super Mode QWERTY/physical keyboard + Clue cards with 🔊 audio + Hint/Clear/Check + Endless 3-heart escalation + Victory & Review mode with `WordReviewList`).
  - `SentencePopScreen`: Study Lab contextual fill-in-the-blank gameplay (Standard word chips + explicit `Check` + Super Mode letter boxes & QWERTY + Hint/Check + Victory & Review mode).

- [ ] **Step 1: Write failing tests in `WordCrossScreen.test.tsx` and `SentencePopScreen.test.tsx`**
  Include Review Focus #5:
  - Standard Mode: placing tray letters into blanks, checking wrong answer shows invalid & deducts heart in Endless, solving opens `VictoryModal`, tapping `Review` shows `WordReviewList` with IPA & audio buttons.
  - Super Mode: tray is hidden, `QwertyBar25D` + physical `keydown` fills blanks without overwriting fixed/hinted cells, solving opens `VictoryModal`.
  - Sentence Pop: tapping a word chip places it without auto-submitting; clicking `Check` validates and opens `VictoryModal` + `Review`.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `npx vitest run src/features/word-cross/__tests__/WordCrossScreen.test.tsx src/features/sentence-pop/__tests__/SentencePopScreen.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement `WordReviewList.tsx`, `WordCrossScreen.tsx`, and `SentencePopScreen.tsx`**
  Ensure `touch-pan-y` on board containers, compact responsive tile sizing (`clamp`/dynamic tile size for 360px mobile), and crisp Framer Motion feedback.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npx vitest run src/features/word-cross/__tests__/WordCrossScreen.test.tsx src/features/sentence-pop/__tests__/SentencePopScreen.test.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/features/word-cross src/features/sentence-pop
  git commit -m "feat: implement WordCrossScreen, SentencePopScreen, Super Mode, and Review mode"
  ```

---

### Task 8: App Wiring, Fullscreen Stage & End-to-End Verification

**Files:**
- Create: `src/App.tsx`
- Test: `src/__tests__/App.test.tsx`

**Interfaces:**
- Consumes: all screens, modals, `progressStore`, `spacedRepetition`, `soundEngine`, `speechEngine`
- Produces: Complete `App` component with `LandscapeBackdrop`, unified `game-stage` frame with subtle floating letters, Fullscreen toggle (modals nested inside `stageRef`), BGM auto-pause during active play, Daily Streak & stats persistence, and `WordPop · crafted by Hoàng Phúc` footer.

- [ ] **Step 1: Write failing integration test in `src/__tests__/App.test.tsx`**
  Test: Splash → START → HomeHub → open Settings (verify exact UX order + EN/VI toggle) → start Quick Play WordCross → verify footer `WordPop · crafted by Hoàng Phúc` → return Home.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/__tests__/App.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement `src/App.tsx`**

- [ ] **Step 4: Run full test suite and production build**
  Run: `npm test && npm run build`
  Expected: All unit & integration tests PASS, `tsc --noEmit` clean, `vite build` succeeds with PWA manifest & service worker generated.

- [ ] **Step 5: Commit**
  ```bash
  git add src/App.tsx src/__tests__/App.test.tsx
  git commit -m "feat: wire complete WordPop app with fullscreen stage, audio lifecycle, and footer"
  ```
