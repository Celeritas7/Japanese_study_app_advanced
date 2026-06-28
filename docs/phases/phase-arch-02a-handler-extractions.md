# Phase Arch 02a — Extract leaf handler concerns from `js/app.js`

This staging folder holds the deploy artifacts for the second architecture
batch: moving 15 leaf-handler methods off the `JLPTStudyApp` class into
3 new modules under `js/handlers/`. Each method becomes a standalone
function that takes `app` as its first argument; `app.js` keeps a thin
wrapper method that calls into the handler. **Public API is unchanged**
(`app.openStoryAlert(...)` still works the same way for every existing
caller in `events.js` and the render modules). State stays on the App
class — only methods move.

## Deploy mapping

Copy each staged file over the live project at the same relative path:

| Staged file                              | Deploys to                       |
|------------------------------------------|----------------------------------|
| `index.html`                             | `./index.html`                   |
| `js/app.js`                              | `./js/app.js`                    |
| `js/handlers/story-overlay.js`           | `./js/handlers/story-overlay.js` |
| `js/handlers/story-alert.js`             | `./js/handlers/story-alert.js`   |
| `js/handlers/word-alert.js`              | `./js/handlers/word-alert.js`    |

`js/handlers/` is a new directory — `mkdir js/handlers` before copying.

## Changes

- **`index.html`** — cache-bust bumped from `?v=23` to `?v=24` on both
  `css/styles.css` and `js/app.js` references. No other changes.
- **`js/app.js`** — three changes only:
  1. Added 3 namespace imports after the existing `events.js` import.
  2. Replaced the 8-method Story Overlay block (lines 1875–1924 of the
     original) with 8 one-line wrappers, preserving the section comment.
  3. Replaced the 4-method Story Alert + Request Missing Story block
     (lines 1926–1975) with 4 wrappers, preserving both section comments.
  4. Replaced the 3-method Word Alert block (lines 2042–2080) with 3
     wrappers, preserving the section comment.
  - No state fields moved — everything still lives on the App class.
  - The existing data-layer import (`from './data.js'`) was not touched.
- **`js/handlers/story-overlay.js`** — 8 functions extracted from the
  Story Overlay block. Imports `saveCanvasData` from `../canvas.js`.
- **`js/handlers/story-alert.js`** — 4 functions extracted from the
  Story Alert + Request Missing Story blocks. Imports `saveStoryAlert`
  from `../data/stories.js` (per-entity import, not via the shim) and
  `showToast` from `../utils.js`.
- **`js/handlers/word-alert.js`** — 3 functions extracted from the Word
  Alert block. Imports `saveWordAlert` from `../data/stories.js` and
  `showToast` from `../utils.js`.

## Mechanical transform applied to each moved function

1. Method declaration `methodName(args) {` becomes
   `export function newName(app, args) {` (or
   `export async function ...` for the four async ones).
2. Inside the body, every `this.` is rewritten to `app.`.
3. Inside the body, calls to other moved methods (e.g.
   `this.findStoryForKanji(...)` inside `findGroupForKanji`) become
   local function calls (`findStoryForKanji(app, ...)`).
4. Whitespace, comments, string literals, and statement order are
   preserved verbatim. No reformatting, no bug fixes.

## Function-name mapping

### `js/handlers/story-overlay.js` (8 exports)

| Original (`app.js` method)              | New export                              |
|-----------------------------------------|-----------------------------------------|
| `openStoryOverlay(word)`                | `open(app, word)`                       |
| `closeStoryOverlay()`                   | `close(app)`                            |
| `storyGoGroup(groupKanji, highlightKanji)` | `goGroup(app, groupKanji, highlightKanji)` |
| `storyBackToBreakdown()`                | `backToBreakdown(app)`                  |
| `storySelectPart(kanjiChar)`            | `selectPart(app, kanjiChar)`            |
| `findStoryForKanji(kanjiChar)`          | `findStoryForKanji(app, kanjiChar)`     |
| `findGroupForKanji(kanjiChar)`          | `findGroupForKanji(app, kanjiChar)`     |
| `getGroupMembersForKanji(groupKanji)`   | `getGroupMembersForKanji(app, groupKanji)` |

### `js/handlers/story-alert.js` (4 exports)

| Original                          | New export                                        |
|-----------------------------------|---------------------------------------------------|
| `openStoryAlert(kanji, groupKanji, source)` | `open(app, kanji, groupKanji, source)` |
| `closeStoryAlert()`               | `close(app)`                                      |
| `async submitStoryAlert()`        | `async submit(app)`                               |
| `async requestMissingStory(kanji)` | `async requestMissing(app, kanji)`               |

### `js/handlers/word-alert.js` (3 exports)

| Original                          | New export                                        |
|-----------------------------------|---------------------------------------------------|
| `openWordAlert(word, source = 'flashcard')` | `open(app, word, source = 'flashcard')` |
| `closeWordAlert()`                | `close(app)`                                      |
| `async submitWordAlert()`         | `async submit(app)`                               |

## Cross-file touches preserved

- `closeStoryOverlay` (now `storyOverlay.close`) clears **both**
  `app.storyOverlay` and `app.storyAlertTarget`. This dual-clear was
  in the original one-liner; preserved verbatim despite
  `storyAlertTarget` being read elsewhere by the story-alert module.
- `findGroupForKanji` (now `storyOverlay.findGroupForKanji`) calls
  `findStoryForKanji(app, ...)` as a sibling local function (not via
  `app.findStoryForKanji(...)`), per the spec.

## Out of scope

- No callers were modified. `events.js`, all `render-*.js` files,
  `data.js` and the `data/` modules, `utils.js`, `canvas.js`,
  `config.js`, and `data-manager.html` are untouched.
- No state fields moved. Constructor in `app.js` is unchanged.
- No build step, ESLint, or TypeScript was introduced.
- No bug fixes or refactors beyond the mechanical extraction.
