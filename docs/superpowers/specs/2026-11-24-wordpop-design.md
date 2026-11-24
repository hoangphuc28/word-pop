# WordPop — Design Specification

**Date:** 2026-11-24  
**Author:** Hoàng Phúc (with AI design partner)  
**Reference Sibling Project:** MathPop (`d:\Projects\3rd Project`)  
**Workspace:** `d:\Projects\WordPop`

---

## 1. Intent & Why

Build **WordPop**, a bilingual (English / Vietnamese) 2.5D web puzzle game for learning English vocabulary, designed as a direct sibling to **MathPop**. Anyone who has played MathPop should immediately recognize WordPop as crafted by the same maker: playful tactile 2.5D tiles, warm pastel sky-and-hills framing, crisp Web Audio feedback, clean progressive-disclosure navigation, and effortless 5–10 minute daily sessions on both mobile and desktop.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Brand & UX parity with MathPop:** Same 2.5D visual language, component primitives, screen flow, settings hierarchy, mobile ergonomics, and footer (`WordPop · crafted by Hoàng Phúc`).
- **Two engaging English puzzle modes:**
  1. **WordCross** (core mode across Quick Play, Endless, and Study Lab): mini 2.5D intersecting word crosswords with bilingual clues, part of speech, and audio pronunciation.
  2. **Sentence Pop** (Study Lab exclusive): contextual fill-in-the-blank sentences using the same curated vocabulary bank.
- **Super Mode (Chế Độ Siêu Cấp):** Toggleable modifier on Home & Setup that removes the letter/word tile tray and challenges players to type answers directly without tray hints.
- **Structured English progression:** 4 CEFR tiers (`A1`, `A2`, `B1`, `B2–C1`) mapped to 1–4 stars, 8 practical topics, spaced repetition per word, and Daily Streak tracking.
- **High-value Review mode:** After solving a puzzle, tapping `Xem Lại` (`Review`) lets learners inspect the completed board plus a vocabulary breakdown (word, IPA, POS, EN/VI meaning, example sentence, and audio playback).
- **Offline-ready PWA:** 100% client-side, zero backend, zero PII, persisted in `localStorage`.

### Non-Goals
- User accounts, cloud sync, leaderboards, or multiplayer.
- Paywalls, Pro unlock codes, Parental Gate, or ad slots (all topics and CEFR tiers are unlocked out of the box).
- Paid/cloud TTS APIs (pronunciation uses the browser's built-in Web Speech API with graceful fallback).
- Freeform dictionary validation beyond the curated puzzle solutions.

### Anti-Goals (Failure Modes to Avoid)
- Crossword grids that overflow horizontally or shrink tiles below comfortable tap targets on 360px mobile screens.
- Mobile browser auto-zoom when interacting with Super Mode typing inputs, or blocked vertical scrolling (`touch-pan-y` must remain smooth).
- Unsolvable puzzles, disconnected crossword islands, or duplicate/ambiguous word clues.
- Machine-garbled Vietnamese translations, wrong IPA transcriptions, or example sentences that do not match the exact target word form.

---

## 3. Technical & UX Constraints

- **Tech Stack (matching MathPop):**
  - React 19 + TypeScript + Vite + Tailwind CSS v4 (`@tailwindcss/vite`)
  - Framer Motion + `lucide-react`
  - Web Audio API (`soundEngine.ts`) + Web Speech API (`speechEngine.ts`)
  - `vite-plugin-pwa` (installable standalone PWA)
  - Vitest + Testing Library + jsdom for automated tests
- **Typography & Theme:** `Baloo 2` (display) + `Nunito` (sans), light-mode pastel sky/dot-grid aesthetic.
- **Storage:** Versioned `localStorage` under `wordpop_progress_v1`, resilient to corrupted/missing data.
- **Bilingual UI:** Complete `en.json` and `vi.json` dictionaries; language switchable live in Settings.
- **Settings Modal Order (strict):**
  1. Background Music (toggle + volume slider)
  2. Sound Effects (toggle + volume slider)
  3. Language (`EN / VI`)
  4. *(Divider)*
  5. Learning Statistics (`StatsModal`)
  6. Guide & Explanations (`GuideModal`)
- **Footer (outside fullscreen):** `WordPop · crafted by Hoàng Phúc`.

---

## 4. Approaches Considered

| Approach | Summary | Trade-offs |
|---|---|---|
| **A. WordCross + Sentence Pop (Selected)** | Intersecting 2.5D crossword puzzles (`WordCross`) as the primary game across all 3 modes, plus `Sentence Pop` (fill-in-the-blank sentences) exclusive to Study Lab. | Requires a solid deterministic crossword layout generator that stays compact on mobile; delivers maximum "MathPop sibling" feel, high replayability in Endless, and rich Review value. |
| **B. Sentence Pop Core** | Every puzzle is a 1–3 blank English sentence with draggable word chips or typed Super Mode. | Great grammar/context focus and simple mobile layout, but loses the signature 2.5D grid-puzzle tactile feel of MathPop and repeats faster in Endless mode. |
| **C. Single-Word Spell Pop** | Unscramble letter tiles to spell one word at a time from a clue/audio prompt. | Very fast to build and compact, but lacks the "aha!" cross-letter deduction that makes MathCross engaging. |

**Decision:** **Approach A** was selected by the user. It mirrors MathPop's dual-mode architecture (`MathCross` core + `Area Block` Study Lab exclusive) while making English vocabulary learning both tactile and deeply replayable.

---

## 5. Architecture & Detailed Design

### 5.1 Visual Identity & Shared 2.5D Primitives
- **Logo:** Two-tone display wordmark: `Word` (`text-slate-800`) + `Pop` (gradient `from-[#0EA5E9] to-[#2563EB] bg-clip-text text-transparent`), paired with a chunky 2.5D rounded square icon (`icon-192.svg` / `icon-512.svg`).
- **`LandscapeBackdrop`:** Same illustrated sky, sun, fluffy clouds, and rolling green hills as MathPop, with 5 floating 2.5D letter tiles (`W`, `A`, `B`, `C`, `★`) in MathPop's signature colors (coral, sky, lavender, mint, sunny).
- **Unified Game Stage Frame:** Centered max-w-5xl rounded 2.5D frame with `.outer-backdrop` pastel dot-grid and subtle floating decorative letters (`A`, `E`, `W`, `Z`, `P`, `?`) inside. Expands cleanly to full viewport in Fullscreen mode, with all modals rendered inside `stageRef` so they remain visible in Fullscreen.
- **Primitives:**
  - `Button25D` (colors: `sky`, `coral`, `lavender`, `mint`, `sunny`, `slate`, `white`; sizes `sm | md | lg`).
  - `Card25D` (white bevel card with soft blue shadow).
  - `Tile25D` (variants: `fixed`, `blank`, `tray`, `placed`, `valid`, `invalid`, `hint`; supports single-letter square tiles for WordCross and pill/chip sizing for Sentence Pop).
  - `PlumpStar` (rounded plump star icon for difficulty tiers & victory celebration).

### 5.2 Screen Flow & Navigation

1. **`SplashScreen`**
   - Centered frosted 2.5D card over `LandscapeBackdrop` with WordPop icon, logo, bilingual tagline, animated progress bar (0 → 100%), and mint `START` button.
   - Tapping `START` plays pop SFX, starts gentle Home BGM (if music enabled), and enters `HomeHub`.

2. **`HomeHub` (2-Step Progressive Disclosure)**
   - **Header:** WordPop logo on the left; 2 utility buttons on the right (**Fullscreen** toggle & **Settings**).
   - **Step 1 (Mode Menu):**
     - **Daily Streak Banner:** Flame badge, streak count (`X ngày liên tiếp` / `X-day streak`), motivational status text, and 7-day flame dots on `sm+`.
     - **Session Mode Header + Inline Super Mode Switch:** Compact pill switch (`Chế Độ Siêu Cấp` / `Super Mode`) with Sparkles icon and sliding thumb.
     - **3 Session Cards:**
       1. **Chơi Nhanh (`quick`):** 1 WordCross puzzle, live timer, instant victory.
       2. **Vô Hạn (`endless`):** 3 hearts (`♥ ×3`), live timer, best Endless score badge (`Kỷ lục: X`), difficulty/tier escalates automatically every 5 solved puzzles (`Math.floor(endlessSolved / 5)`).
       3. **Luyện Tập (`practice` / Study Lab):** 5-puzzle session, untimed, spaced-repetition focused; unlocks **Sentence Pop** and explicit **Topic** multi-select.
   - **Step 2 (Mode Setup Panel):**
     - Sub-header: `Back` button + inline `Super Mode` switch + active session badge.
     - **Study Lab only:** Segmented pill toggle between **WordCross** and **Sentence Pop**.
     - **CEFR Level Selector (4 tiers, 1–4 `PlumpStar`s):**
       - Tier 1 (`A1`): Cơ bản / Starter
       - Tier 2 (`A2`): Sơ cấp / Elementary
       - Tier 3 (`B1`): Trung cấp / Intermediate
       - Tier 4 (`B2C1`): Nâng cao / Advanced (lavender highlight like MathPop's Master tier)
     - **Topic Selector (Study Lab only — builder call for clean Quick/Endless flow):** Multi-select across 8 topics (`daily`, `food`, `travel`, `nature`, `work`, `tech`, `feelings`, `culture`). Quick Play & Endless automatically use all 8 topics (Mix) so players jump in with one tap after picking CEFR level, mirroring MathPop where explicit table/range filters live in Study Lab:
       - `daily` (Đời sống / Daily Life)
       - `food` (Ẩm thực / Food & Drink)
       - `travel` (Du lịch / Travel)
       - `nature` (Tự nhiên / Nature)
       - `work` (Công việc / Work & Study)
       - `tech` (Công nghệ / Technology)
       - `feelings` (Cảm xúc / Feelings)
       - `culture` (Văn hóa / Culture & Media)
       - Shows a `Mix` badge when 2+ topics are selected; requires at least 1 topic selected in Study Lab.
     - Giant mint `Play` CTA button.

3. **Modals**
   - **`SettingsModal`:** Strict UX order (Music slider → SFX slider → EN/VI → divider → Stats → Guide).
   - **`StatsModal`:** Puzzles solved, accuracy %, words mastered, current/best streak, and breakdown bars by CEFR level (`A1`, `A2`, `B1`, `B2–C1`) + reset progress option (with confirmation).
   - **`GuideModal`:** Clear bilingual visual guide explaining WordCross, Sentence Pop, Super Mode, Endless 3-heart escalation, and Daily Streak.
   - **`VictoryModal`:** Confetti burst, bouncing `PlumpStar`s (1–3 stars based on hints/mistakes), elapsed time & streak pills, `Next` / `Play Again` primary button, plus 2-column row: `Review` (`Xem Lại`) & `Home`.
   - **`GameOverModal`:** Endless mode summary when hearts reach 0 (puzzles cleared, new record badge if beaten, `Try Again` & `Home`).

### 5.3 Core Gameplay: `WordCrossScreen`
- **Puzzle Structure:**
  - Deterministic seeded generator (`generateWordCross`) places **2 to 4 intersecting words** on a compact grid (hard cap: **max 9 columns × 9 rows**):
    - `A1`: 2 words, length 3–5 letters, ~45% blanks, 0 distractors in tray.
    - `A2`: 3 words, length 3–6 letters, ~55% blanks, 1 distractor in tray.
    - `B1`: 3–4 words, length 4–7 letters, ~65% blanks, 2 distractors in tray.
    - `B2C1`: 4 words, length 5–8 letters, ~75% blanks, 3 distractors in tray.
  - **Endless Escalation:** Every 5 puzzles solved bumps the effective tier by +1 (starting from the user's chosen tier, capped at `B2C1`, and after `B2C1` increases blank ratio up to 85% and distractors up to 4).
  - Every word is labeled with a small corner badge (`1`, `2`, `3`, `4`) on its starting cell.
- **Clues Bar / Panel:**
  - Compact scrollable/grid list of numbered clues (`1 →`, `2 ↓`) showing:
    - Clue text: Vietnamese meaning when `lang === 'vi'`, concise English definition when `lang === 'en'`.
    - Part of speech pill (`n.`, `v.`, `adj.`).
    - Audio button (🔊) to pronounce the English word via `speechEngine`.
  - Tapping a clue highlights that word's cells on the grid and focuses its first empty blank cell.
- **Interaction — Standard Mode (Letter Tray):**
  - Tap-to-place (tap tray letter → tap blank cell, OR tap blank cell → tap tray letter) AND pointer drag-and-drop (with `6px` drag threshold and `touch-pan-y` on board/container so vertical mobile scrolling stays effortless).
  - Tapping a placed letter returns it to the tray (or swaps if another tray tile is selected).
- **Interaction — Super Mode (No Tray):**
  - Letter tray is hidden.
  - Players can type directly with a physical keyboard (auto-advances cursor along the active word direction; Backspace clears/steps back) OR tap a **compact on-screen 2.5D QWERTY keyboard** (3 rows + Backspace) built into the game stage.
  - Using a custom on-screen QWERTY bar + physical `keydown` listener completely eliminates mobile OS keyboard popups and iOS Safari auto-zoom!
- **Validation, Hints & Scoring:**
  - `Hint`: Reveals 1 unfilled/wrong blank cell in the focused word (or first empty cell), marks `usedHint = true`, plays chime.
  - `Clear`: Clears all non-hinted placements (with 2-tap confirm if 3+ cells filled, matching MathPop).
  - `Check`: Enabled once all blanks are filled.
    - **All correct:** Tiles turn emerald `valid`, celebration chime plays, words are recorded in spaced repetition (`word:<id>`), Daily Streak updates, stars awarded (3★ no hint & first try, 2★ 1 mistake or hint, 1★ otherwise), `VictoryModal` opens.
    - **Any incorrect:** Wrong cells flash rose `invalid` + shake animation, error SFX plays; in Endless mode, deducts 1 heart (triggers `GameOverModal` at 0 hearts).
- **Review Mode (`Xem Lại`):**
  - Tapping `Review` in `VictoryModal` closes the modal into a clean Review state:
    - Completed green board stays visible above.
    - Below the board, a **Word Review Card List** displays each word from the puzzle with: **Word**, **IPA** (e.g., `/ˈæp.əl/`), **POS**, **VI meaning**, **EN definition**, **Example sentence**, and a **🔊 Listen** button.
    - Top/bottom action bar lets the user jump to `Next Puzzle` or `Home`.

### 5.4 Study Lab Exclusive: `SentencePopScreen`
- **Puzzle Structure:**
  - Selects 1 target vocabulary entry (or 2 at `B2C1` if desired — keeping 1 clear target blank per sentence at `A1–B1` and optionally 2-word / harder distractors at `B2C1` ensures crisp mobile readability; let's standardize on **1 target word blank per sentence** with a 5-sentence Study Lab session for fast, rewarding flow).
  - Displays the English sentence with a chunky inline 2.5D blank slot (`[ _____ ]`), plus:
    - Vietnamese translation of the sentence (or EN clue + POS badge when `lang === 'en'`).
    - Audio button (🔊) that speaks the target word (or full sentence after solving).
- **Standard Mode:** 4–6 2.5D word chips in the tray (1 correct word + 3–5 distractors drawn from the same CEFR tier / topic, preferring same POS when available; if the single bucket has too few distractors, relax to same CEFR tier across all topics). Tap or drag a chip to place it into the sentence slot (tapping another chip swaps it; tapping the placed slot returns it to the tray).
- **Super Mode:** Hides the word chips; shows letter-slot boxes (`_ _ _ _ _`) matching the target word length, filled via physical keyboard or the same compact on-screen 2.5D QWERTY keyboard.
- **Hint, Check & Review:**
  - `Hint`: In Standard mode, eliminates 2 wrong distractors (or reveals the next empty letter in Super Mode).
  - `Check` (consistent with WordCross — builder call): Player explicitly taps `Check` (or presses `Enter`) to submit the placed/typed word so accidental mis-taps never incur star or spaced-repetition penalties. On success, updates spaced repetition & Daily Streak and opens `VictoryModal` (with `Review` showing the full sentence, word IPA, EN/VI meanings, and 🔊 full-sentence audio).

### 5.5 Vocabulary Dataset & Spaced Repetition
- **Dataset (`src/data/vocabulary.ts`):**
  - ~360–400 curated English words (45–50 words per topic across 8 topics, evenly distributed across `A1`, `A2`, `B1`, `B2C1`).
  - Strict validation invariant (verified by unit tests):
    - Every `word` is strictly uppercase/lowercase ASCII letters `^[a-z]{3,8}$` (no spaces, hyphens, or apostrophes — guarantees clean WordCross tiles).
    - Every `example` sentence contains the exact `word` (case-insensitive whole-word match) so `SentencePopScreen` can cleanly blank it out.
    - Every entry has non-empty `ipa`, `pos`, `en`, `vi`, `example`, `exampleVi`.
    - Unique `id` and unique `word` across the entire bank.
- **Spaced Repetition & Pool Relaxation Policy (`src/engine/spacedRepetition.ts`, builder call):**
  - Reuses MathPop's proven Leitner/interval scheduling, keyed by `word:<id>`.
  - Prioritizes due/missed words when `wordCrossGenerator` and `sentencePopGenerator` pick words for the next puzzle.
  - **Pool Relaxation Order (when a narrow Study Lab filter like 1 topic × 1 CEFR tier runs low on intersecting words or session-unique words):**
    1. Primary pool: `selectedTopics ∩ targetLevel` (excluding words already used in the current session).
    2. Relax 1 (keep topic focus): expand to adjacent CEFR levels within `selectedTopics`.
    3. Relax 2 (keep level focus): expand to all topics at `targetLevel`.
    4. Relax 3 (long sessions / Endless): allow previously seen words outside the last 2 puzzles.

### 5.6 Audio & Speech
- **`soundEngine.ts`:** Adapted directly from MathPop's Web Audio API synthesizer (pop, place, hint, success, error, victory fanfare, gentle Home BGM that automatically pauses during active gameplay and resumes on Home). Respects `soundEnabled`, `soundVolume`, `musicEnabled`, `musicVolume`.
- **`speechEngine.ts`:** Thin wrapper around `window.speechSynthesis` (`en-US`, rate `0.92`). Cancels prior utterance before speaking, gracefully no-ops in unsupported environments/tests, and respects `soundEnabled` / `soundVolume`.

---

## 6. What Is Left to the Builder

The builder has full autonomy over:
- Exact SVG artwork for `/public/icon-192.svg` and `/public/icon-512.svg` (should visually echo MathPop's glossy 2.5D rounded tile icon with a `W` / pop motif).
- Exact backtracking / scoring heuristics and deterministic fallback layouts in `wordCrossGenerator.ts`, provided every generated puzzle is connected, valid, deterministic for a given seed, and fits within 9×9.
- Exact visual sizing, responsive Tailwind breakpoints, and Framer Motion spring parameters (staying faithful to MathPop's tactile feel).
- Exact organization of the vocabulary bank across topic files (e.g., `src/data/vocab/*.ts` aggregated in `src/data/vocabulary.ts`) to keep files clean and maintainable.
- Exact Vitest + Testing Library test suite structure covering dataset invariants, generators, validators, spaced repetition, progress persistence, UI primitives, and core user flows.
