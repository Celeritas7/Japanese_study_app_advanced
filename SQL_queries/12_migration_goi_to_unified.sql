-- ============================================================
-- MIGRATION: Merge japanese_vocabulary → japanese_unified_words
-- Run in Supabase SQL Editor, section by section
-- ============================================================

-- ========================
-- STEP 0: PRE-MIGRATION COUNTS (run first, save results)
-- ========================
SELECT 'goi_total' as metric, COUNT(*) as val FROM japanese_vocabulary
UNION ALL
SELECT 'unified_total', COUNT(*) FROM japanese_unified_words
UNION ALL
SELECT 'overlap', COUNT(*) FROM japanese_vocabulary v JOIN japanese_unified_words u ON v.kanji = u.kanji
UNION ALL
SELECT 'goi_only', COUNT(*) FROM japanese_vocabulary v LEFT JOIN japanese_unified_words u ON v.kanji = u.kanji WHERE u.id IS NULL
UNION ALL
SELECT 'goi_with_sentence', COUNT(*) FROM japanese_vocabulary WHERE full_sentence IS NOT NULL AND full_sentence != ''
UNION ALL
SELECT 'goi_with_hint', COUNT(*) FROM japanese_vocabulary WHERE hint IS NOT NULL AND hint != ''
UNION ALL
SELECT 'goi_with_word_type', COUNT(*) FROM japanese_vocabulary WHERE word_type IS NOT NULL AND word_type != ''
UNION ALL
SELECT 'goi_with_example', COUNT(*) FROM japanese_vocabulary WHERE example_before IS NOT NULL AND example_before != ''
UNION ALL
SELECT 'word_books_before', COUNT(*) FROM japanese_unified_word_books
UNION ALL
SELECT 'sentences_before', COUNT(*) FROM japanese_unified_sentences;


-- ========================
-- STEP 1: INSERT GOI-ONLY WORDS INTO UNIFIED
-- (words that exist in vocabulary but NOT in unified)
-- ========================
INSERT INTO japanese_unified_words (kanji, hiragana, meaning_en, jlpt_level, word_type, hint)
SELECT DISTINCT ON (v.kanji)
  v.kanji,
  v.hiragana,
  v.meaning_en,
  v.level AS jlpt_level,
  v.word_type,
  v.hint
FROM japanese_vocabulary v
LEFT JOIN japanese_unified_words u ON v.kanji = u.kanji
WHERE u.id IS NULL
  AND v.kanji IS NOT NULL
  AND v.kanji != ''
ORDER BY v.kanji, v.id;

-- Verify: how many new words were added?
SELECT 'new_unified_total' as metric, COUNT(*) as val FROM japanese_unified_words;


-- ========================
-- STEP 2: FILL MISSING DATA ON OVERLAPPING WORDS
-- (where unified has NULL but goi has data)
-- ========================

-- Fill hint
UPDATE japanese_unified_words u
SET hint = v.hint
FROM japanese_vocabulary v
WHERE v.kanji = u.kanji
  AND (u.hint IS NULL OR u.hint = '')
  AND v.hint IS NOT NULL AND v.hint != '';

-- Fill word_type
UPDATE japanese_unified_words u
SET word_type = v.word_type
FROM japanese_vocabulary v
WHERE v.kanji = u.kanji
  AND (u.word_type IS NULL OR u.word_type = '')
  AND v.word_type IS NOT NULL AND v.word_type != '';

-- Fill meaning_en
UPDATE japanese_unified_words u
SET meaning_en = v.meaning_en
FROM japanese_vocabulary v
WHERE v.kanji = u.kanji
  AND (u.meaning_en IS NULL OR u.meaning_en = '')
  AND v.meaning_en IS NOT NULL AND v.meaning_en != '';

-- Fill hiragana
UPDATE japanese_unified_words u
SET hiragana = v.hiragana
FROM japanese_vocabulary v
WHERE v.kanji = u.kanji
  AND (u.hiragana IS NULL OR u.hiragana = '')
  AND v.hiragana IS NOT NULL AND v.hiragana != '';


-- ========================
-- STEP 3: CREATE WORD_BOOKS ENTRIES FOR ALL GOI WORDS
-- (links each Goi word to its JLPT book/chapter)
-- ========================
INSERT INTO japanese_unified_word_books (word_id, book_code, book_name, chapter, ref)
SELECT DISTINCT ON (u.id, v.level, v.page_no)
  u.id AS word_id,
  'JLPT_' || v.level AS book_code,
  'JLPT ' || v.level || ' Vocabulary' AS book_name,
  'Week' || ((v.page_no - 1) / 5 + 1) || ' Day' || ((v.page_no - 1) % 5 + 1) AS chapter,
  v.ref_no AS ref
FROM japanese_vocabulary v
JOIN japanese_unified_words u ON v.kanji = u.kanji
WHERE v.page_no IS NOT NULL
ORDER BY u.id, v.level, v.page_no, v.ref_no;

-- Verify word_books
SELECT book_code, COUNT(*) as entries 
FROM japanese_unified_word_books 
GROUP BY book_code 
ORDER BY book_code;


-- ========================
-- STEP 4: MIGRATE SENTENCES FROM GOI full_sentence COLUMN
-- (insert into sentences pool + create word links)
-- ========================

-- Step 4a: Insert unique sentences
INSERT INTO japanese_unified_sentences (sentence, source, jlpt_level, verified)
SELECT DISTINCT ON (v.full_sentence)
  v.full_sentence AS sentence,
  'JLPT_' || v.level AS source,
  v.level AS jlpt_level,
  'unverified' AS verified
FROM japanese_vocabulary v
WHERE v.full_sentence IS NOT NULL 
  AND v.full_sentence != ''
  AND NOT EXISTS (
    SELECT 1 FROM japanese_unified_sentences s WHERE s.sentence = v.full_sentence
  )
ORDER BY v.full_sentence, v.id;

-- Step 4b: Create word-sentence links
INSERT INTO japanese_unified_word_sentences (word_id, sentence_id)
SELECT DISTINCT u.id, s.id
FROM japanese_vocabulary v
JOIN japanese_unified_words u ON v.kanji = u.kanji
JOIN japanese_unified_sentences s ON s.sentence = v.full_sentence
WHERE v.full_sentence IS NOT NULL AND v.full_sentence != ''
  AND NOT EXISTS (
    SELECT 1 FROM japanese_unified_word_sentences ws 
    WHERE ws.word_id = u.id AND ws.sentence_id = s.id
  );


-- ========================
-- STEP 5: MIGRATE EXAMPLE CONTEXT (example_before + example_after)
-- These are supporting word pairs, store as sentences too
-- Only if they form meaningful context
-- ========================
INSERT INTO japanese_unified_sentences (sentence, source, jlpt_level, verified)
SELECT DISTINCT ON (combined)
  combined AS sentence,
  'JLPT_' || v.level || '_context' AS source,
  v.level AS jlpt_level,
  'unverified' AS verified
FROM (
  SELECT 
    v.*,
    COALESCE(v.example_before, '') || v.kanji || COALESCE(v.example_after, '') AS combined
  FROM japanese_vocabulary v
  WHERE (v.example_before IS NOT NULL AND v.example_before != '')
     OR (v.example_after IS NOT NULL AND v.example_after != '')
) v
WHERE combined != v.kanji  -- skip if no actual context
  AND NOT EXISTS (
    SELECT 1 FROM japanese_unified_sentences s WHERE s.sentence = combined
  )
ORDER BY combined, v.id;

-- Link these context sentences to words
INSERT INTO japanese_unified_word_sentences (word_id, sentence_id)
SELECT DISTINCT u.id, s.id
FROM (
  SELECT 
    v.kanji,
    COALESCE(v.example_before, '') || v.kanji || COALESCE(v.example_after, '') AS combined
  FROM japanese_vocabulary v
  WHERE (v.example_before IS NOT NULL AND v.example_before != '')
     OR (v.example_after IS NOT NULL AND v.example_after != '')
) v
JOIN japanese_unified_words u ON v.kanji = u.kanji
JOIN japanese_unified_sentences s ON s.sentence = v.combined
WHERE v.combined != v.kanji
  AND NOT EXISTS (
    SELECT 1 FROM japanese_unified_word_sentences ws 
    WHERE ws.word_id = u.id AND ws.sentence_id = s.id
  );


-- ========================
-- STEP 6: POST-MIGRATION VERIFICATION
-- ========================
SELECT 'unified_words_after' as metric, COUNT(*) as val FROM japanese_unified_words
UNION ALL
SELECT 'word_books_after', COUNT(*) FROM japanese_unified_word_books
UNION ALL
SELECT 'sentences_after', COUNT(*) FROM japanese_unified_sentences
UNION ALL
SELECT 'word_sentence_links_after', COUNT(*) FROM japanese_unified_word_sentences
UNION ALL
SELECT 'books_list', 0;

-- Book distribution
SELECT book_code, book_name, COUNT(DISTINCT word_id) as words, COUNT(DISTINCT chapter) as chapters
FROM japanese_unified_word_books
GROUP BY book_code, book_name
ORDER BY book_code;

-- Verify a sample Goi word made it through
SELECT u.id, u.kanji, u.hiragana, u.meaning_en, u.jlpt_level, u.hint, u.word_type,
  (SELECT COUNT(*) FROM japanese_unified_word_books wb WHERE wb.word_id = u.id) as book_count,
  (SELECT COUNT(*) FROM japanese_unified_word_sentences ws WHERE ws.word_id = u.id) as sentence_count
FROM japanese_unified_words u
WHERE u.kanji = '愛想'
LIMIT 1;

-- Check no Goi words were left behind
SELECT COUNT(*) as goi_not_in_unified
FROM japanese_vocabulary v
LEFT JOIN japanese_unified_words u ON v.kanji = u.kanji
WHERE u.id IS NULL;


-- ========================
-- STEP 7: (AFTER APP UPDATE) DROP OLD TABLE
-- Only run this AFTER updating the app code to stop reading from japanese_vocabulary
-- ========================
-- ALTER TABLE japanese_vocabulary RENAME TO japanese_vocabulary_backup;
-- Or if you're confident:
-- DROP TABLE japanese_vocabulary;
