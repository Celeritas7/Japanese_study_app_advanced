# Phase arch-02b — Handler extractions (round 2)

Continues the leaf-handler extraction begun in Batch 2a. Moves 16 methods from
`JLPTStudyApp` into 3 new modules under `js/handlers/`. State stays on the App
class; thin wrapper methods preserve the public API.

One subtlety: `resolveUnifiedWordId` is now a **private helper** inside
`add-sentence.js` (only used by `submit`). It is not exported, and the method
is removed entirely from `app.js` (no wrapper).

## Deploy mapping

Files in this folder copy 1:1 onto the live tree. No path changes.

| Staging file                           | Live destination               |
|----------------------------------------|--------------------------------|
| `index.html`                           | `index.html`                   |
| `js/app.js`                            | `js/app.js`                    |
| `js/handlers/add-sentence.js`          | `js/handlers/add-sentence.js`  |
| `js/handlers/bulk-linker.js`           | `js/handlers/bulk-linker.js`   |
| `js/handlers/review-queue.js`          | `js/handlers/review-queue.js`  |

The existing 2a handlers (`story-overlay.js`, `story-alert.js`,
`word-alert.js`) are untouched.

## Per-file change summary

### `index.html`
- Cache bump only: `?v=24` → `?v=25` on `css/styles.css` and `js/app.js`.

### `js/app.js`
- **+3 imports** after the existing `wordAlert` import (lines 31–33):
  ```js
  import * as addSentence from './handlers/add-sentence.js';
  import * as bulkLinker  from './handlers/bulk-linker.js';
  import * as reviewQueue from './handlers/review-queue.js';
  ```
- **15 method bodies replaced** with one-line wrappers across three sections:
  - Add Sentence (3): `openAddSentenceSheet`, `closeAddSentenceSheet`,
    `submitNewSentence`
  - Bulk Linker (4): `openBulkLinker`, `parseBulkSentences`, `bulkLinkSingle`,
    `bulkSaveAndLinkAll`
  - Review Queue (8): `openReviewQueue`, `setReviewFilter`,
    `setReviewSourceFilter`, `reviewPrevPage`, `reviewNextPage`,
    `verifySentence`, `addTagToSentence`, `removeTagFromSentence`
- **1 method deleted** with no wrapper: `resolveUnifiedWordId(word)` — moved
  into `add-sentence.js` as a private helper. The two-line comment that
  preceded it (`// Find the unified word ID for any word` /
  `// After merge, vocabulary words already have unified IDs`) was removed
  alongside it.
- Section comment headers (`// ===== ADD SENTENCE BOTTOM SHEET =====`,
  `// ===== BULK SENTENCE LINKER =====`, `// ===== REVIEW QUEUE =====`)
  preserved verbatim.
- Existing data-layer import (lines 6–18, via `./data.js` shim) untouched.
- Net line delta: −340 (bodies) +18 (wrappers) +3 (imports) ≈ −319.

### `js/handlers/add-sentence.js` (new)
- 3 exports: `open`, `close`, `submit`.
- 1 private helper: `resolveUnifiedWordId(app, word)` — not exported.
- Imports: `addNewSentenceAndLink` from `../data/sentences.js`,
  `getCurrentStudyWord` from `../render-kanji.js`, `showToast` from
  `../utils.js`.

### `js/handlers/bulk-linker.js` (new)
- 4 exports: `open`, `parse`, `linkSingle`, `saveAndLinkAll`.
- Imports: `linkSentenceToWord`, `bulkAddSentences`, `bulkLinkSentences` from
  `../data/sentences.js`; `extractKanjiStem` from `../render-kanji.js`;
  `showToast` from `../utils.js`.

### `js/handlers/review-queue.js` (new)
- 8 exports: `open`, `setFilter`, `setSourceFilter`, `prevPage`, `nextPage`,
  `verifySentence`, `addTag`, `removeTag`.
- Imports: `updateSentenceVerified`, `addSentenceTag`, `removeSentenceTag`
  from `../data/sentences.js`; `showToast` from `../utils.js`.

## Out of scope

Not modified by this batch:
- `js/events.js`, any `js/render-*.js`, `js/data.js`, anything in `js/data/`
- The 2a handler files (`story-overlay.js`, `story-alert.js`, `word-alert.js`)
- App-class state fields — `showAddSentenceSheet`, `bulkParsedResults`,
  `reviewFilter`, etc. all stay on the instance.

Render code and event handlers continue to call `app.openAddSentenceSheet(...)`
etc. through the wrappers unchanged.
