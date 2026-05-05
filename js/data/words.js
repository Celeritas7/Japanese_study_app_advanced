// Unified word table operations.
// Loads from japanese_unified_words / japanese_unified_word_books and
// inserts kanji-only "unknown word" rows tapped from sentences.

/**
 * Load unified kanji words with pagination (japanese_unified_words)
 * Transforms rows to be compatible with existing flashcard renderer
 */
export async function loadUnifiedWords(supabase) {
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('japanese_unified_words')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('id');

      if (error) {
        console.error('Unified words load error:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }

    // Transform to be compatible with flashcard renderer fields
    return allData.map(row => ({
      ...row,
      meaning: row.meaning_en || '',
      level: row.jlpt_level || '',
      raw: row.kanji,
      // Empty context — sentences loaded separately on study start
      supporting_word_1: '',
      supporting_word_2: '',
      sentence_before: '',
      sentence_after: '',
    }));
  } catch (err) {
    console.error('loadUnifiedWords exception:', err);
    return [];
  }
}

/**
 * Load unified word-book mappings with pagination (japanese_unified_word_books)
 */
export async function loadUnifiedWordBooks(supabase) {
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('japanese_unified_word_books')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('id');

      if (error) {
        console.error('Word books load error:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }

    return allData;
  } catch (err) {
    console.error('loadUnifiedWordBooks exception:', err);
    return [];
  }
}

/**
 * Insert an unknown word tapped from a sentence into japanese_unified_words.
 * Only kanji is set — hiragana/meaning added later via data-manager.
 * Returns { success, word } or { success: false, error, reason }
 *   reason: 'exists' if word already in DB
 */
export async function insertUnknownWord(supabase, kanji) {
  if (!kanji || !kanji.trim()) return { success: false, error: 'Empty word' };
  kanji = kanji.trim();

  try {
    // Check if word already exists
    const { data: existing } = await supabase
      .from('japanese_unified_words')
      .select('id, kanji, hiragana, meaning_en')
      .eq('kanji', kanji)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, reason: 'exists', word: existing[0] };
    }

    // Insert with kanji only, source marks it for data-manager cleanup
    // Try with source column first; if column doesn't exist, retry without
    let insertData = { kanji, hiragana: '', meaning_en: '', hint: '', jlpt_level: '', source: 'sentence_tap' };
    let { data, error } = await supabase
      .from('japanese_unified_words')
      .insert(insertData)
      .select();

    // If source column doesn't exist, retry without it
    if (error && (error.message?.includes('source') || error.code === 'PGRST204')) {
      console.warn('insertUnknownWord: source column missing, retrying without it');
      const { source, ...withoutSource } = insertData;
      const retry = await supabase.from('japanese_unified_words').insert(withoutSource).select();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('insertUnknownWord error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, word: data[0] };
  } catch (err) {
    console.error('insertUnknownWord exception:', err);
    return { success: false, error: err.message };
  }
}
