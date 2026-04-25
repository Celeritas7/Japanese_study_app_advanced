# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**JLPT Vocabulary Master** — a mobile-first Japanese vocabulary study web app for JLPT N1-N3 preparation. Deployed on GitHub Pages with a Supabase (Postgres) backend. Live at `https://celeritas7.github.io/Japanese_study_app_advanced/`.

## Development Server

No build step — vanilla JS + Tailwind CDN. Run a local server to use ES modules:

```bash
python -m http.server 8000
# or
npx serve
```

Then open `http://localhost:8000`. There are no lint, test, or build commands.

**Cache busting:** Bump the `?v=N` query string on every `<script>` and `<link>` tag in `index.html` on every deploy. GitHub Pages caches aggressively — without a version bump, users keep running old code.

## Workflow

- **Discuss before code.** Talk through the plan first; don't jump to implementation.
- **One focused change per session.** Test, commit, and push before starting the next change.
- **Justify every new UI element**, especially on mobile. Prefer extending existing controls over adding new ones.

## Architecture

### File Responsibilities

| File | Role |
|------|------|
| `index.html` | Entry point; loads Supabase + Tailwind from CDN, bootstraps `app.js` |
| `js/app.js` | `JLPTStudyApp` class — owns all state, routing, and orchestrates render/events |
| `js/config.js` | Supabase URL + anon key, JLPT level constants, color maps |
| `js/data.js` | All Supabase CRUD (load vocabulary, markings, sentences, stories) |
| `js/events.js` | All DOM event listener wiring (called after every `app.render()`) |
| `js/utils.js` | Shared helpers: shuffle, toast, kanji stem extraction, marking lookup |
| `js/canvas.js` | Touch/mouse drawing canvas for kanji writing practice |
| `js/render.js` | Goi (vocabulary) study tab — flashcards, level/week selectors |
| `js/render-kanji.js` | Kanji textbook tab + sentence panel + add-sentence bottom sheet |
| `js/render-srs.js` | SRS review tab — MCQ tests, writing tests, results |
| `js/render-stories.js` | Story overlay + stories tab (kanji mnemonics) |
| `js/render-similar.js` | Similar-looking kanji groups tab |
| `js/render-relations.js` | Word group/relations browsing tab |
| `css/styles.css` | Custom CSS: animations, kanji typography, scrollbar hiding |
| `data-manager.html` | Standalone admin tool (OAuth-gated, same Supabase backend) |

**Target:** Keep each file under ~1,100 lines.

### Rendering Pipeline

Every state change flows through one pipeline:
1. `app.render()` checks current tab/view and calls the appropriate renderer
2. Renderer returns an HTML string (pure function of `app` state)
3. `document.getElementById('app').innerHTML = html`
4. `attachEventListeners(app)` wires all DOM events on the fresh DOM

### State Management

All state lives in the `JLPTStudyApp` class in `app.js`. No framework. Key state groups:
- Navigation: `currentTab`, `studySubTab`, `studyView`
- Content: `vocabulary`, `kanjiWords`, `kanjiWordBooks`, `sentences`, `stories`
- Filters: `selectedLevel`, `selectedBook`, `selectedChapter`, `selectedMarkingFilter`
- User progress: `markings`, `markingTimestamps`, `srsIntervals`

State is persisted to `localStorage` for session resumption.

### localStorage Keys

The app writes the following keys (all under the page origin):

| Key | Source | Purpose |
|-----|--------|---------|
| `srs_intervals` | `js/app.js` | User-customised SRS interval config (overrides defaults) |
| `study_session` | `js/app.js` | Resume state for the active Goi/Kanji study session (current word index, view, etc.) |
| `srs_session` | `js/app.js` | Resume state for the active SRS test session |
| `practice_YYYY-MM-DD` | `js/app.js` | Today's practice log: studied words, study sessions, test results. Older keys auto-cleaned by `_cleanOldPracticeData` |
| `relationsStudied` | `js/events.js`, read in `js/render-relations.js` | Set of word-group IDs the user has marked as studied. **Scheduled for migration to `japanese_group_study_log` (backlog Phase 4).** |
| `dm_state`, `dm_drafts` | `data-manager.html` | Admin tool: tab/filter persistence and form draft auto-save |

Note: `relationsHideStudied` is a runtime UI toggle on the app instance, not a persisted key.

## Database (Supabase)

### Key Tables

| Table | Contents |
|-------|----------|
| `japanese_vocabulary` | ~4,158 Goi words from JLPT textbooks (N1–N3) |
| `japanese_unified_words` | ~6,995 deduplicated Kanji textbook words |
| `japanese_unified_word_books` | Junction: word ↔ book/chapter (~11,762 rows) |
| `japanese_unified_sentences` | Shared sentence pool (~863), `verified` status, `tags[]` |
| `japanese_unified_word_sentences` | Junction: word ↔ sentence with `rating` (1-3) |
| `japanese_kanji_story_groups` | Group-level kanji mnemonics |
| `japanese_kanji_stories` | Individual kanji stories/mnemonics |
| `japanese_kanji_similar_groups` | Similar-looking kanji groups |
| `japanese_user_markings` | User progress — keyed by **kanji text**, not word ID |

### Critical Schema Rules

1. **Markings use kanji text as key** (not word ID). The same kanji can appear in both `japanese_vocabulary` and `japanese_unified_words` — keying by text ensures markings sync across both tables.

2. **ID collision between tables**: `japanese_vocabulary` and `japanese_unified_words` have independent auto-increment sequences — the same numeric ID can refer to different words. Any function using a word ID as a map key must guard against cross-table collision before the lookup (e.g. `app.kanjiWords.some(w => w.id === word.id)` before reading `app.kanjiSentenceMap[word.id]`).

3. **Sentence pool is shared**: `verified` column gates quality — the study app shows all sentences; future grammar apps should filter to `verified` only. `tags[]` (e.g., `grammar:てform`) enables cross-app filtering.

4. **Required columns on `japanese_unified_words`**: `jlpt_level` is `NOT NULL`, and `source` is required. Inserts that omit either fail with a constraint error.

5. **Table naming**: every app table is prefixed `japanese_`. New tables stay within that namespace.

### RLS Pattern

- Content tables: public `SELECT` (`USING (true)`), open `UPDATE` for admin tool
- User data tables: authenticated `INSERT`/`UPDATE` restricted to `auth.uid()::text = user_id`
- **Every new table needs both `INSERT` and `SELECT` policies.** Missing-policy failures are silent in two ways: a missing `SELECT` policy makes reads return empty rows with no error, and a missing `INSERT`/`UPDATE` policy returns a real error that callers usually swallow. If a feature seems to "load empty for no reason" or "work without saving", check the policies first.

## Critical Patterns

### IME Input Safety
Japanese IME input breaks if the input element is destroyed during a re-render. For search inputs, only update the results container — never replace the `<input>` itself. Use surgical DOM updates:
```js
document.getElementById('results-container').innerHTML = newResults;
```

### Kanji Stem Extraction
Used for sentence discovery and word detection. Logic in `utils.js`:
- `喜ぶ` → `喜` (verb: strip okurigana, keep leading kanji)
- `禁止` → `禁止` (compound: all kanji kept)
- `ロープ` → `ロープ` (no kanji: use full word)
- Single-character stems are skipped to avoid false positives

### Japanese Tokenization

Use `Intl.Segmenter('ja', { granularity: 'word' })` exclusively. The reusable instance lives in `js/utils.js` as `_jaSegmenter` — share it, don't construct new ones per call.

**Never use kuromoji.js** or any tokenizer that downloads a dictionary at runtime. IPADIC's ~12 MB dict freezes mobile browsers. Two prior attempts at adding kuromoji to `anime-reader.html` were reverted. If a feature seems to need morphological analysis, build heuristics on top of `Intl.Segmenter` — merge adjacent kanji-stem + trailing-hiragana segments, strip common suffixes for lemma lookup, or reverse-lookup against known dictionary forms in the database.

### Word-Boundary Matching

Naive `indexOf` of a single-kanji term causes false positives — e.g. `治` matches inside `退治`. To match a word in a sentence:

1. Search by full word first, then by 2+ character compound stems. Skip 1-char stems.
2. After finding a match index, check the character immediately before it. If that char is also a kanji, the match is inside a compound — reject and keep scanning.

The reference implementation is `sentenceContainsWord` inside `renderSentencePanel` in `js/render-kanji.js`. Follow that pattern when adding new word-in-sentence matching.

### Homograph Matching

Single-kanji words can carry multiple readings (e.g. `実` → `み` vs `じつ`). Matching purely on kanji presence conflates them. Where sentence data includes a reading or hiragana annotation, prefer reading-aware matching: confirm the candidate sentence's reading matches the target word's reading before linking. (Reference implementation pending — see backlog bug #12.)

### Non-Blocking Sentence Loading
Render the flashcard immediately, then load sentences in the background. Inject the sentence panel via surgical DOM update when data arrives — don't re-render the whole card.

### Scroll Position Preservation
Uses `_scrollCache` map keyed by view (e.g., `stories-list`). Save `scrollTop` before render, restore after when returning to the same view.

### Auth Event Handling
Supabase `onAuthStateChange` fires `INITIAL_SESSION` on page load — skip it to prevent reload loops. Only handle `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`.

### SRS Distractor Generation
MCQ options are generated in priority order: homophones → shared kanji → semantic similarity → random fallback.

## Authentication & Admin

- Google OAuth via Supabase, plus a guest mode that uses the admin UUID for local testing — both flows produce the same effective user.
- **Admin user ID**: `d469efb7-f9e1-4b49-8b14-75a42b4d22e0` (mangaonkaraniket@gmail.com). The constant is **duplicated in three files**, keep them in sync:
  - `js/app.js` — `GUEST_USER_ID`
  - `js/render.js` — `ADMIN_ID` (gates the ⚙️ gear icon via `isAdmin = app.user?.id === ADMIN_ID || app.isGuestMode`)
  - `data-manager.html` — `ADMIN_USER_ID` (gates the entire admin tool)
- Admin-only features: the gear icon in the main app header, and full access to `data-manager.html` (non-admin accounts hit an "Access Denied" screen).
- See "Data Manager" below for tool details.

**Tech debt:** The admin UUID is duplicated under three different constant names (`GUEST_USER_ID`, `ADMIN_ID`, `ADMIN_USER_ID`) across three files. This should be consolidated into a single export in `config.js` (e.g., `ADMIN_USER_ID`) and imported where needed. Until then, rotating the UUID requires editing all three locations. — Tracked as tech debt, not blocking.

## Data Manager (`data-manager.html`)

Standalone admin tool at the repo root, not part of the main app shell. Loads independently and gates on the admin UUID.

**Bulk load**: on open, `loadAll()` (data-manager.html:714) fetches **12 tables in parallel**:

- Required (block render on failure):
  `japanese_unified_sentences`, `japanese_unified_words`, `japanese_unified_word_books`, `japanese_word_groups`, `japanese_word_group_members`, `japanese_story_alerts`, `japanese_word_alerts`, `japanese_kanji_stories`, `japanese_kanji_story_groups`, `japanese_unified_word_sentences`
- Optional (wrapped in `.catch(() => [])` — failure falls back to empty array, page still renders):
  `japanese_anime_words`, `japanese_sentence_attempts`

**Lazy per-tab loading is on the backlog (Phase 5).** When implementing it, preserve the resilient-load behavior for the two optional tables.

**Tabs** are organized into 5 groups (`TAB_GROUPS` at data-manager.html:451). Format below is `tab-key (UI label) — purpose`:

- **Overview**
  - `stats` (📊 Stats) — Database health summary
- **Sentences**
  - `sentences` (💬 Browse) — Search/filter the shared sentence pool
  - `verify` (✅ Verify) — Mark sentences verified / corrected / rejected
  - `bulk` (📝 Bulk Import) — Paste sentences for batch insert
- **Words**
  - `incomplete` (🔧 Incomplete) — Words missing hiragana/meaning
  - `anime` (📺 Anime) — Promote saved Anime Reader words to the unified table
  - `word-flags` (🚩 Flags) — User-flagged word issues
- **Stories**
  - `story-flags` (📖 Flags) — User-flagged story issues
  - `groups` (🔗 Groups) — Word group CRUD editor
  - `group-audit` (🌳 Audit) — Kanji story group audit
- **Health**
  - `dupes` (🔍 Dupes) — Duplicate detection
  - `orphans` (🧹 Orphans) — Orphaned data cleanup

Note: the Words and Stories groups each contain a tab whose UI label is just "Flags" — distinguished by emoji (🚩 vs 📖) and tab-key (`word-flags` vs `story-flags`).

**Verify tab — known fragility**: export advancement has historically had bugs (re-exporting the same batch). After any change to the Verify tab, test the full flow end-to-end: select batch → JSON export → external review → JSON re-import → confirm the next batch advances.

**Sentence verification pipeline**: JSON export → external Claude API review → JSON re-import → `UPDATE`/`INSERT` on `japanese_unified_sentences`.

## Pending Features (Kaizen.txt)

- Story display after single-word test completion (link to group mnemonics)
- Visual SRS question styling by marking level
- Random n-word study mode with multiple test types
- Word grouping display (similar meaning, kanji, hiragana groupings)
- Story section expansion in study flow
