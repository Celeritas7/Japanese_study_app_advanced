# Phase Arch 01 — Split `js/data.js` into entity modules

This staging folder holds the deploy artifacts for the first architecture
batch: splitting the monolithic `js/data.js` (1108 lines) into per-entity
modules under `js/data/`. Behavior is unchanged. No callers (`app.js`,
`events.js`, render-*.js) are modified — they continue to import from
`js/data.js`, which is now a thin re-export shim.

## Deploy mapping

Copy each staged file over the live project at the same relative path:

| Staged file                                | Deploys to                     |
|--------------------------------------------|--------------------------------|
| `index.html`                               | `./index.html`                 |
| `js/data.js`                               | `./js/data.js`                 |
| `js/data/index.js`                         | `./js/data/index.js`           |
| `js/data/markings.js`                      | `./js/data/markings.js`        |
| `js/data/words.js`                         | `./js/data/words.js`           |
| `js/data/sentences.js`                     | `./js/data/sentences.js`       |
| `js/data/stories.js`                       | `./js/data/stories.js`         |
| `js/data/similar.js`                       | `./js/data/similar.js`         |
| `js/data/relations.js`                     | `./js/data/relations.js`       |
| `js/data/self-study.js`                    | `./js/data/self-study.js`      |
| `js/data/srs.js`                           | `./js/data/srs.js`             |

`js/data/` is a new directory — `mkdir js/data` before copying its files.

## Changes

- **`index.html`** — cache-bust bumped from `?v=22` to `?v=23` on both
  `css/styles.css` and `js/app.js` references. No other changes.
- **`js/data.js`** — replaced with a 5-line re-export shim that forwards
  every prior export through `./data/index.js`. Existing imports such as
  `import { loadMarkings } from './data.js'` keep working.
- **`js/data/`** — eight new entity modules plus an aggregator `index.js`.
  Functions are copied verbatim from the original `js/data.js`; no
  reformatting, no behavior changes.

## Function placement

| Module          | Exports                                                                                                                                                                                                  |
|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `markings.js`   | `DEFAULT_MARKING_CATEGORIES`, `loadMarkingCategories`, `updateMarkingCategory`, `loadMarkings`, `updateMarkingInDB`. (`COLOR_MAP` stays as a non-exported module-local const.)                            |
| `words.js`      | `loadUnifiedWords`, `loadUnifiedWordBooks`, `insertUnknownWord`                                                                                                                                          |
| `sentences.js`  | `loadSentencesForWords`, `loadAllUnifiedSentences`, `updateSentenceRating`, `linkSentenceToWord`, `addNewSentenceAndLink`, `bulkAddSentences`, `bulkLinkSentences`, `updateSentenceVerified`, `addSentenceTag`, `removeSentenceTag` |
| `stories.js`    | `loadStoryGroups`, `loadStories`, `saveStoryAlert`, `saveWordAlert`                                                                                                                                      |
| `similar.js`    | `loadSimilarGroups`                                                                                                                                                                                      |
| `relations.js`  | `loadWordGroups`, `loadWordGroupMembers`, `loadGroupStudyLog`, `setGroupStudied`                                                                                                                         |
| `self-study.js` | `loadSelfStudyTopics`, `loadSelfStudyWords`, `addTopic`, `addSelfStudyWord`                                                                                                                              |
| `srs.js`        | `saveSRSMistake`                                                                                                                                                                                         |

Total: **31 functions + 1 const = 32 exports** across the entity files
(plus 8 `export * from` lines in the aggregator `index.js`).

## Dead exports preserved

`updateMarkingCategory` and `saveSRSMistake` have no current callers but
were intentionally kept as-is per the batch spec.

## Out of scope

- No callers were modified.
- No build step, ESLint, or TypeScript was introduced.
- No bug fixes or refactors beyond the mechanical split.
