# Phase: Study-mode focus — hide UI chrome during flashcard study

When the user is in an active flashcard/test session, the upper navigation
chrome is hidden to reclaim vertical space. Applies to all four study paths
and all viewport sizes (no viewport-width check).

## What changed

**Hidden during active study:** app header (logo + word count + username +
admin gear + logout), main tab bar (Study/SRS/Stories/Relations/Anime/Scripts),
sub-tab pills (Goi/Kanji/Self Study).

**Kept visible:** Back button, level (N1) badge, Week/Day label, position
counter, test-type pills, and everything inside/below the yellow box.

**Mark indicator** (the big `w-10 h-10` colored circle on the right of the
position row) is **removed during active study** — the Change Rating panel
below the card already shows the same state via its highlighted button.

**Gear** moves out of the now-hidden app header into the position row as a
compact `w-8 h-8` amber icon (same `data-manager.html` link, same admin gate).
It is a plain `<a>` (no JS handler), so no event-listener changes were needed.
A fixed `w-10` right-side slot is retained so the position counter stays
centered whether or not the gear is shown.

## The four active-study state conditions

`isInActiveStudy()` (new method on the App class in `js/app.js`, placed just
before `render()`) returns true when **any** of:

| Path | Condition |
|------|-----------|
| Goi flashcard | `currentTab==='study' && studySubTab==='goi' && studyView==='flashcard'` |
| Kanji flashcard | `currentTab==='study' && studySubTab==='kanji' && kanjiView==='flashcard'` |
| Self Study test | `currentTab==='study' && studySubTab==='self_study' && studyView==='flashcard' && selectedTopic` |
| SRS test | `currentTab==='srs' && srsView==='test'` |

Self Study overloads `studyView` (no dedicated view field) and additionally
requires `selectedTopic`, mirroring the existing `renderStudyTab` branch.

## Why SRS path needs no render-srs.js edit (correction B)

The SRS test renders via `renderSRSTest` in `js/render-srs.js`, a separate path
from `renderFlashcard`. Chrome-hiding is applied at the **app.js orchestration
level** (header/tabs at `render()`, sub-tabs at `renderStudyTab()`), so
`isInActiveStudy()` covering `srsView==='test'` hides the chrome for SRS
automatically. The SRS position row has no big mark-indicator circle and no
gear (it shows an inline badge + a ✓/✗ score panel), so there is nothing to
remove or relocate there. `js/render-srs.js` is intentionally **not modified**.

## Scope correction vs. original brief (correction A)

The brief's Step-2 assumed the three chrome blocks were wrapped in
`js/render.js`. They are not — `renderHeader`/`renderTabs` are composed in
`js/app.js` `render()` (the `app.innerHTML` template), and `renderStudySubTabs`
in `js/app.js` `renderStudyTab()` (`return subTabs + content;`). So:

- `js/app.js`: 1 `isInActiveStudy()` method def + 3 call sites (header, tab
  bar, sub-tab pills).
- `js/render.js`: 1 `isAdmin`-derived gear conditional in `renderFlashcard`
  (covers Goi/Kanji/Self Study — all three share `renderFlashcard`).

The existing local `isFlashcard` boolean (`render()`, used only for
sentence-panel injection) is **left untouched** per instruction; it is
deliberately not the same predicate (it omits the Self Study path).

Note: `markInfo` in `renderFlashcard` is now defined-but-unused (its only use
was the removed mark indicator). Left in place deliberately — removing it would
be an out-of-scope refactor; it is harmless and `node --check` passes.

## Deploy mapping

Files copy 1:1 onto the live tree. No path changes.

| Staging file        | Live destination  |
|---------------------|-------------------|
| `js/app.js`         | `js/app.js`       |
| `js/render.js`      | `js/render.js`    |
| `index.html`        | `index.html`      |

### `index.html`
Cache bump only: `?v=27` → `?v=28` on both versioned local assets
(`css/styles.css` link and `js/app.js` module). `css/styles.css` itself is
unchanged this phase; both bumped together to keep cache versions consistent
per the CLAUDE.md cache-busting rule.

## Verification performed

See the verification block in the session log: `node --check` on both modified
`.js` files, the four greps (`isInActiveStudy`, `v=`, `ADMIN_ID`), and
line-count deltas vs. live.

Stop after verification — not deployed.
