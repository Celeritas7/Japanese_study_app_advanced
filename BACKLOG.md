# Backlog — Known Issues

Found during Phase 1 (word senses) and Phase 2 prep (sentence split), 2026-09-24 → 09-30.
Rule for all data items: read-only check → backup → migrate → verify.

---

## 1. Word-data consistency (both word tables)

The same word can differ between `japanese_unified_words` and `japanese_vocabulary`.
Handle these together in one cleanup pass instead of fixing them one by one.

- **Sense order differs:** ぺこぺこ — vocabulary 3847 has ①very hungry ②bowing repeatedly;
  unified 7512 and vocabulary 1157 have the opposite order.
- **解ける doesn't line up across tables:** vocabulary 1176 is one row with 4 senses; unified splits it
  into two homographs (とける #5372, ほどける #5374). Decide how vocab 1176 maps to them. Do NOT insert
  a new unified row.
- **Malformed meaning:** 馬鹿なことをする (unified 9754 / vocabulary 1491) — fixed 2026-09-30: rewritten as a
  single sense (the ①② were example contexts, not senses), verified in app.
  Old text kept in `japanese_word_sense_fix_backup` (RLS on).
- **Homograph pairs share their links.** Same kanji, different reading, e.g. 解ける とける #5372 /
  ほどける #5374, 雑 ざつ #3845 / ぞう #3851. Each pair has identical book / sentence / group counts,
  so links seem to have been attached by kanji text, not by reading.
  **Audit read-only first:** list kanji with 2+ unified rows and each row's book, sentence and group sets.
  Removing a group membership from the wrong twin changes what gets studied, so review that list
  before any cleanup.
- **Markings are keyed by kanji text,** so homograph pairs also share markings (marking ほどける also
  marks とける). Only 正面 / 正面② avoids this, because of the ②.
  **Schema decision — discuss before fixing:** key markings on (kanji, reading) or on word id?

## 2. Sentence fragments in word front fields

Some word rows have sentence fragments in fields shown on the card front (e.g. the 仏の道を説く。 card —
note the trailing 。). **First step:** a read-only query to measure how many rows in each table are
affected, before deciding on a fix.

## 3. Add ①② sense markers to more words

`renderMeaning()` in `js/render.js` shows `①… ②… ③…` as a numbered list, but only 12 unified words
have markers today (checked 2026-09-30). Data work only, no code change. Candidates:
- 浴びる, and collocations like 非難を浴びる.
- 解ける/とける (unified 5372): currently "to be solved", but its sentences also use
  "(misunderstanding) to be cleared up" and "to melt" → ①to be solved ②to be cleared up ③to melt.

## 4. Highlight ない in sentences (low priority)

Highlight negation ない (食べ**ない**, 来**ない**, よく**ない**); skip the adjective ない / 無い (時間がない).
- Rule: highlight a separate ない segment unless the segment before it is a particle (が/は/も).
- Free: 危ない / 少ない stay as one word in `Intl.Segmenter`, so no separate ない appears.
- Known miss: しない comes out as one word — match it explicitly or accept the miss.
- The rule is approximate. That's acceptable because highlighting is cosmetic; don't build anything that relies on it.
Build on `Intl.Segmenter` only (no kuromoji — see CLAUDE.md).

## 5. Sentence-split tool — checks before first Write

1. **split_status values.** Confirm what the tool writes. If only `split` and `child`, switch the
   loader filter in `js/data/sentences.js` to an allow-list.
2. **Link copy.** Copy a parent's link only to children that contain the word.
   - 143 of 146 parents have one link, and the word is in every one (checked 2026-09-30) → fan out to all children.
   - 962: resolve by surface match (貧血 → ①, 疲労/目眩 → ②).
   - 870, 1990: the linked words are homographs (same kanji, different reading), NOT polysemy — do not merge.
     Assign by reading: 870 ①③④ → 解ける/とける #5372, ② → 解ける/ほどける #5374;
     1990 ①② → 雑/ざつ #3845 (drop the 雑/ぞう #3851 link).
   - Tables that reference a word id (all have declared FKs): word_books, word_sentences,
     user_progress, word_group_members, script_words.
3. **正面② (まとも)** — unified 8848 / vocabulary 1205. A 正面/しょうめん row exists (749 / 2541), so the ②
   is a disambiguator. Don't rename it to bare 正面 (markings are kanji-keyed and would merge).
   Pick a distinct front (e.g. まとも in kana, with 正面 as a note). Sentence 1774 has the ② glued on
   too — fix both before Write.
4. **Sentence 991** (`②友人に①馬鹿なことをする。②にされる。`): its ② child is 友人に馬鹿にされる — that's
   馬鹿にする, not 馬鹿なことをする. Don't copy the 馬鹿なことをする link to that child; if a 馬鹿にする card
   is wanted, add it as a separate word.
5. **147th row.** Has ①② in `meaning_en` only; clean up the English, nothing to split.
