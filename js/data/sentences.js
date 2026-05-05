// Sentence pool operations: load/link/rate/verify/tag operations on
// japanese_unified_sentences and japanese_unified_word_sentences.

/**
 * Load sentences for a batch of word IDs via the join table
 * Returns { [word_id]: [ { sentence, hiragana, meaning_en, rating, ... } ] }
 * Sentences sorted by rating (highest first) per word
 */
export async function loadSentencesForWords(supabase, wordIds) {
  if (!wordIds || wordIds.length === 0) return {};

  try {
    // Load word-sentence link rows (may need pagination for large batches)
    let allLinks = [];
    const batchSize = 500; // Supabase .in() limit
    for (let i = 0; i < wordIds.length; i += batchSize) {
      const batch = wordIds.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('japanese_unified_word_sentences')
        .select('id, word_id, sentence_id, rating')
        .in('word_id', batch);

      if (error) { console.error('Word-sentences link error:', error); continue; }
      if (data) allLinks = allLinks.concat(data);
    }

    if (allLinks.length === 0) return {};

    // Get unique sentence IDs
    const sentenceIds = [...new Set(allLinks.map(l => l.sentence_id))];

    // Load actual sentence rows
    let allSentences = [];
    for (let i = 0; i < sentenceIds.length; i += batchSize) {
      const batch = sentenceIds.slice(i, i + batchSize);
      const { data, error } = await supabase
        .from('japanese_unified_sentences')
        .select('*')
        .in('id', batch);

      if (error) { console.error('Sentences load error:', error); continue; }
      if (data) allSentences = allSentences.concat(data);
    }

    // Build sentence lookup
    const sentenceMap = {};
    allSentences.forEach(s => { sentenceMap[s.id] = s; });

    // Build word_id → sentences array
    const result = {};
    allLinks.forEach(link => {
      if (!result[link.word_id]) result[link.word_id] = [];
      const sent = sentenceMap[link.sentence_id];
      if (sent) {
        result[link.word_id].push({
          ...sent,
          link_id: link.id,
          sentence_id: link.sentence_id,
          rating: link.rating
        });
      }
    });

    // Sort each word's sentences by rating desc (highest = best)
    Object.values(result).forEach(arr => {
      arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    });

    return result;
  } catch (err) {
    console.error('loadSentencesForWords exception:', err);
    return {};
  }
}

/**
 * Load ALL unified sentences (for unlinked sentence discovery)
 */
export async function loadAllUnifiedSentences(supabase) {
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('japanese_unified_sentences')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('id');

      if (error) {
        console.error('All sentences load error:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }

    return allData;
  } catch (err) {
    console.error('loadAllUnifiedSentences exception:', err);
    return [];
  }
}

/**
 * Update a sentence rating in word_sentences link table
 * Toggle: if same rating clicked again, set to null
 */
export async function updateSentenceRating(supabase, linkId, newRating) {
  try {
    // First read current rating to support toggle
    const { data: current, error: readErr } = await supabase
      .from('japanese_unified_word_sentences')
      .select('rating')
      .eq('id', linkId)
      .single();

    if (readErr) {
      console.error('Read sentence rating error:', readErr);
      return { success: false, error: readErr.message };
    }

    const finalRating = (current?.rating === newRating) ? null : newRating;

    const { error } = await supabase
      .from('japanese_unified_word_sentences')
      .update({ rating: finalRating })
      .eq('id', linkId);

    if (error) {
      console.error('Update sentence rating error:', error);
      return { success: false, error: error.message, rating: null };
    }
    return { success: true, rating: finalRating };
  } catch (err) {
    console.error('updateSentenceRating exception:', err);
    return { success: false, error: err.message, rating: null };
  }
}

/**
 * Link an existing sentence to a word
 */
export async function linkSentenceToWord(supabase, wordId, sentenceId, userId) {
  try {
    const insertData = {
      word_id: wordId,
      sentence_id: sentenceId,
      rating: null,
      created_at: new Date().toISOString()
    };
    if (userId) insertData.user_id = userId;

    const { data, error } = await supabase
      .from('japanese_unified_word_sentences')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Link sentence error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, link: data };
  } catch (err) {
    console.error('linkSentenceToWord exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Add a new sentence to the pool AND link it to a word in one operation
 */
export async function addNewSentenceAndLink(supabase, sentenceData, wordId, userId) {
  try {
    // Step 1: Insert sentence
    const { data: newSentence, error: sentErr } = await supabase
      .from('japanese_unified_sentences')
      .insert({
        sentence: sentenceData.sentence,
        meaning_en: sentenceData.meaning_en || null,
        source: sentenceData.source || 'manual',
        jlpt_level: sentenceData.jlpt_level || null,
        difficulty: sentenceData.difficulty || 1,
      })
      .select()
      .single();

    if (sentErr) {
      console.error('Add sentence error:', sentErr);
      return { success: false, error: sentErr.message };
    }

    // Step 2: Create word-sentence link
    const linkData = {
      word_id: wordId,
      sentence_id: newSentence.id,
      rating: null,
      created_at: new Date().toISOString()
    };
    if (userId) linkData.user_id = userId;

    const { data: newLink, error: linkErr } = await supabase
      .from('japanese_unified_word_sentences')
      .insert(linkData)
      .select()
      .single();

    if (linkErr) {
      console.error('Link after add error:', linkErr);
      // Sentence was created but link failed
      return { success: true, sentence: newSentence, link: null, warning: 'Sentence saved but link failed' };
    }

    return { success: true, sentence: newSentence, link: newLink };
  } catch (err) {
    console.error('addNewSentenceAndLink exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Bulk add sentences and auto-link them to detected words.
 * wordLinks is an array of { sentenceIdx, wordId } pairs the user approved.
 * Returns { added, linked, errors }
 */
export async function bulkAddSentences(supabase, sentences, userId) {
  const results = { added: 0, errors: [] };

  try {
    // Insert all sentences at once
    const insertRows = sentences.map(s => ({
      sentence: s.sentence,
      meaning_en: s.meaning_en || null,
      source: s.source || 'manual',
      jlpt_level: s.jlpt_level || null,
      difficulty: 1,
    }));

    const { data, error } = await supabase
      .from('japanese_unified_sentences')
      .insert(insertRows)
      .select();

    if (error) {
      console.error('Bulk add sentences error:', error);
      return { added: 0, errors: [error.message], insertedSentences: [] };
    }

    results.added = data.length;
    return { ...results, insertedSentences: data };
  } catch (err) {
    console.error('bulkAddSentences exception:', err);
    return { added: 0, errors: [err.message], insertedSentences: [] };
  }
}

/**
 * Bulk link sentences to words
 * links is an array of { word_id, sentence_id }
 */
export async function bulkLinkSentences(supabase, links, userId) {
  try {
    const insertRows = links.map(l => ({
      word_id: l.word_id,
      sentence_id: l.sentence_id,
      rating: null,
      user_id: userId || null,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('japanese_unified_word_sentences')
      .insert(insertRows)
      .select();

    if (error) {
      console.error('Bulk link error:', error);
      return { linked: 0, error: error.message };
    }
    return { linked: data.length, data };
  } catch (err) {
    console.error('bulkLinkSentences exception:', err);
    return { linked: 0, error: err.message };
  }
}

/**
 * Update verification status of a sentence
 */
export async function updateSentenceVerified(supabase, sentenceId, status) {
  try {
    const { error } = await supabase
      .from('japanese_unified_sentences')
      .update({ verified: status })
      .eq('id', sentenceId);

    if (error) {
      console.error('Update verified error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('updateSentenceVerified exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Add a tag to a sentence's tags array
 */
export async function addSentenceTag(supabase, sentenceId, tag) {
  try {
    // Read current tags
    const { data: current, error: readErr } = await supabase
      .from('japanese_unified_sentences')
      .select('tags')
      .eq('id', sentenceId)
      .single();

    if (readErr) return { success: false, error: readErr.message };

    const currentTags = current?.tags || [];
    if (currentTags.includes(tag)) return { success: true, tags: currentTags }; // already exists

    const newTags = [...currentTags, tag];

    const { error } = await supabase
      .from('japanese_unified_sentences')
      .update({ tags: newTags })
      .eq('id', sentenceId);

    if (error) {
      console.error('Add tag error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, tags: newTags };
  } catch (err) {
    console.error('addSentenceTag exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove a tag from a sentence's tags array
 */
export async function removeSentenceTag(supabase, sentenceId, tag) {
  try {
    const { data: current, error: readErr } = await supabase
      .from('japanese_unified_sentences')
      .select('tags')
      .eq('id', sentenceId)
      .single();

    if (readErr) return { success: false, error: readErr.message };

    const newTags = (current?.tags || []).filter(t => t !== tag);

    const { error } = await supabase
      .from('japanese_unified_sentences')
      .update({ tags: newTags })
      .eq('id', sentenceId);

    if (error) {
      console.error('Remove tag error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, tags: newTags };
  } catch (err) {
    console.error('removeSentenceTag exception:', err);
    return { success: false, error: err.message };
  }
}
