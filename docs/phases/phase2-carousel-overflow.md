# Phase 2 — Sentence carousel (Variant A) + yellow-box internal scroll

Adds a small pill to the flashcard's yellow box (`.sentence-box`) so the user
can page through a word's multiple linked sentences, and gives the box an
internal scroller so long sentences scroll inside instead of pushing the
flashcard controls off-screen.

## Scope correction vs. the original brief

The original plan targeted `js/render-kanji.js`. That file renders the **indigo
"💬 Sentences" panel**, not the yellow box. The actual yellow box is
`.sentence-box`, rendered by `renderFlashcardContent` in **`js/render.js`** and
styled in **`css/styles.css`**. Scope was retargeted accordingly (confirmed with
the user). `js/render-kanji.js` is **not** touched.

The yellow box previously showed a single sentence (`sentences[0]`) split around
the target word. The Kanji study path (`startKanjiStudy`) bakes that `[0]`
context into the word object; the Goi path relies on a live fallback. The
carousel now **re-derives** context from `app.kanjiSentenceMap` on every render,
overriding the pre-baked context so it works on both study paths (confirmed with
the user).

## Deploy mapping

Files copy 1:1 onto the live tree. No path changes.

| Staging file               | Live destination     |
|----------------------------|----------------------|
| `index.html`               | `index.html`         |
| `js/app.js`                | `js/app.js`          |
| `js/render.js`             | `js/render.js`       |
| `js/events.js`             | `js/events.js`       |
| `css/styles.css`           | `css/styles.css`     |

## Per-file change summary

### `index.html` (delta +0)
- Cache bump only: `?v=25` → `?v=26` on `css/styles.css` and `js/app.js`
  (the only versioned local assets; everything else is CDN).

### `js/app.js` (delta +26)
- Constructor: new field `this.sentenceCarouselIdx = 0;` next to
  `kanjiSentenceMap` / `sentencePanelExpanded`.
- Two new methods after `toggleSentencePanel()`:
  - `prevSentenceCarousel()` — decrement if > 0, then `this.render()`.
  - `nextSentenceCarousel(maxIdx)` — increment if < maxIdx, then `this.render()`.
  (Full re-render matches the existing `nextWord`/`prevWord` pattern.)
- `this.sentenceCarouselIdx = 0;` added alongside `this.revealStep = 0;` in the
  **11** word-change sites: `startStudy`, `startStudyQuick`, `startKanjiStudy`,
  `nextWord`, `prevWord`, `randomWord`, `reviewAgain`, `shuffleRestart`,
  `reviewByMarking`, `reviewAllTodayWords`, `_restoreStudySession`.
  - Deliberately **not** reset in: the constructor default block (already
    initialised), `setTestType` (same word/same sentences — index should
    persist when toggling test type), and `finishStudy` (results view, has no
    `revealStep` reset).
- Grep `sentenceCarouselIdx` = 16 hits (1 init + 4 in the two methods +
  11 resets).

### `js/render.js` (delta +41)
- `renderFlashcard`: the `ctxBefore/ctxAfter` selection block (was: prefer baked
  `word.sentence_before`, else live-fallback to `sentences[0]`) is replaced with
  carousel-aware logic:
  - Resolve the unified word's `kanjiSentenceMap` array (same uid resolution as
    the old live fallback).
  - Sort a **copy** with the same comparator `renderSentencePanel` uses
    (rating desc → verified/corrected/unverified/rejected), so the pill's `N/M`
    matches the indigo panel's ordering.
  - Pick `sorted[min(app.sentenceCarouselIdx, total-1)]` (defensive clamp) and
    derive `ctxBefore/ctxAfter` via `findWordInSentence`.
  - If the word can't be located in the selected sentence, show the sentence
    whole (as trailing context) rather than falling back to a stale `[0]` — so
    the box never contradicts the pill counter.
  - Only when there are **zero** linked sentences does it fall back to the old
    baked / supporting-word context.
  - Builds `carouselPillHtml` (rendered only when `total > 1`).
- `renderFlashcardContent` signature gains `carouselPillHtml = ''`; call site
  updated to pass it.
- All **3** `.sentence-box` variants (kanji / reading / writing):
  `${carouselPillHtml}` inserted after `${badgeHtml}`, and the existing inner
  content wrapped in `<div class="sentence-box-scroll">…</div>` so the box
  scrolls internally while the pill (a non-scrolling sibling) stays pinned.
- Pill markup: `data-carousel-prev` / `N/M` / `data-carousel-next`
  (carries `data-carousel-total`), ~24px (`w-6 h-6`) targets,
  `opacity-40 pointer-events-none` at min/max bounds, amber-on-amber styling to
  match the box. Grep `data-carousel-` = prev + next + total.

### `js/events.js` (delta +12)
- After the `shuffleRestartBtn` line in `// ===== FLASHCARD NAVIGATION =====`,
  two `querySelectorAll(...).forEach(addEventListener)` blocks (matching the
  existing direct-listener pattern, not delegation):
  - `[data-carousel-prev]` → `app.prevSentenceCarousel()`
  - `[data-carousel-next]` → `app.nextSentenceCarousel(total-1)`, reading
    `data-carousel-total`.

### `css/styles.css` (delta +16)
- `.sentence-box` is **unchanged** — `height: 160px;` kept so the box footprint
  stays fixed across reveal steps (no mid-flow layout shift).
- New rule `.sentence-box-scroll { width:100%; flex:1; min-height:0;
  overflow-y:auto; display:flex; flex-direction:column; justify-content:center; }`
  — the standard scrollable-flex-child pattern (`min-height:0` is required or
  the child won't shrink below content size and `overflow-y` never triggers),
  plus inner flex-column centering (Option A, user-approved) so short content
  at reveal step 0 stays vertically centered.

## Caveat to verify in testing (not blocking)

`justify-content: center` on a scroll container has a well-known browser
behavior: when content is *taller* than the 160px box, the overflow is
distributed both above and below center, and in some browsers the **top of the
content can be clipped and not scrollable upward**. Short content centers
correctly (the goal of Option A); the risk is only for sentences long enough to
overflow 160px. Recommend testing one deliberately long multi-line linked
sentence at reveal step ≥2 before authorizing deploy. If the top clips, the
fallback is `justify-content: flex-start` + `margin: auto 0` on an inner block,
or `safe center` where supported.

## Verification performed

- `node --check` on `js/app.js`, `js/render.js`, `js/events.js` — all pass.
- Greps: `sentenceCarouselIdx` ×16 in app.js; 2 carousel method defs;
  `data-carousel-{prev,next,total}` in render.js; carousel handlers in events.js;
  `?v=26` in index.html.
- Line deltas: app.js +26, render.js +41, events.js +12, styles.css +13,
  index.html +0.

## Out of scope (not modified)

`js/render-kanji.js` (and its indigo sentence panel), `js/render-srs.js` (SRS
also shows sentences — future enhancement), `js/data*.js`, `js/handlers/*`.
No refactors, no font/color/padding changes to the yellow box beyond the
scroll wrapper.
