// JLPT Vocabulary Master - Data Operations

import { getWeekDay } from './utils.js';

// Default marking categories (fallback if not loaded from DB)
export const DEFAULT_MARKING_CATEGORIES = {
  0: { label: 'Not Marked', color: 'bg-gray-500', lightColor: 'bg-gray-100', textColor: 'text-gray-700', icon: '○', border: 'border-gray-300' },
  1: { label: 'Monthly Review', color: 'bg-emerald-500', lightColor: 'bg-emerald-100', textColor: 'text-emerald-700', icon: '✔', border: 'border-emerald-400' },
  2: { label: "Can't Converse", color: 'bg-violet-500', lightColor: 'bg-violet-100', textColor: 'text-violet-700', icon: '💬', border: 'border-violet-400' },
  3: { label: "Can't Write", color: 'bg-orange-500', lightColor: 'bg-orange-100', textColor: 'text-orange-700', icon: '✍', border: 'border-orange-400' },
  4: { label: "Can't Use", color: 'bg-pink-500', lightColor: 'bg-pink-100', textColor: 'text-pink-700', icon: '🤔', border: 'border-pink-400' },
  5: { label: "Don't Know", color: 'bg-red-500', lightColor: 'bg-red-100', textColor: 'text-red-700', icon: '❌', border: 'border-red-400' },
};

// Color mapping from DB color name to Tailwind classes
const COLOR_MAP = {
  'gray': { color: 'bg-gray-500', lightColor: 'bg-gray-100', textColor: 'text-gray-700', border: 'border-gray-300' },
  'emerald': { color: 'bg-emerald-500', lightColor: 'bg-emerald-100', textColor: 'text-emerald-700', border: 'border-emerald-400' },
  'violet': { color: 'bg-violet-500', lightColor: 'bg-violet-100', textColor: 'text-violet-700', border: 'border-violet-400' },
  'orange': { color: 'bg-orange-500', lightColor: 'bg-orange-100', textColor: 'text-orange-700', border: 'border-orange-400' },
  'pink': { color: 'bg-pink-500', lightColor: 'bg-pink-100', textColor: 'text-pink-700', border: 'border-pink-400' },
  'red': { color: 'bg-red-500', lightColor: 'bg-red-100', textColor: 'text-red-700', border: 'border-red-400' },
  'blue': { color: 'bg-blue-500', lightColor: 'bg-blue-100', textColor: 'text-blue-700', border: 'border-blue-400' },
  'teal': { color: 'bg-teal-500', lightColor: 'bg-teal-100', textColor: 'text-teal-700', border: 'border-teal-400' },
  'yellow': { color: 'bg-yellow-500', lightColor: 'bg-yellow-100', textColor: 'text-yellow-700', border: 'border-yellow-400' },
  'indigo': { color: 'bg-indigo-500', lightColor: 'bg-indigo-100', textColor: 'text-indigo-700', border: 'border-indigo-400' },
};

/**
 * Load marking categories from database
 */
export async function loadMarkingCategories(supabase, userId) {
  if (!userId) {
    console.log('loadMarkingCategories: No userId, using defaults');
    return { ...DEFAULT_MARKING_CATEGORIES };
  }
  
  try {
    const { data, error } = await supabase
      .from('japanese_marking_categories')
      .select('category_id, label, icon, color')
      .eq('user_id', userId)
      .order('category_id');
    
    if (error) {
      console.error('loadMarkingCategories error:', error);
      return { ...DEFAULT_MARKING_CATEGORIES };
    }
    
    if (!data || data.length === 0) {
      console.log('loadMarkingCategories: No custom categories found, using defaults');
      return { ...DEFAULT_MARKING_CATEGORIES };
    }
    
    // Build categories object from DB data
    const categories = {};
    data.forEach(row => {
      const colorInfo = COLOR_MAP[row.color] || COLOR_MAP['gray'];
      categories[row.category_id] = {
        label: row.label,
        icon: row.icon || '○',
        ...colorInfo
      };
    });
    
    // Fill in any missing categories with defaults
    for (let i = 0; i <= 5; i++) {
      if (!categories[i]) {
        categories[i] = DEFAULT_MARKING_CATEGORIES[i];
      }
    }
    
    console.log('loadMarkingCategories: Loaded', data.length, 'custom categories');
    return categories;
  } catch (err) {
    console.error('loadMarkingCategories exception:', err);
    return { ...DEFAULT_MARKING_CATEGORIES };
  }
}

/**
 * Update a marking category
 */
export async function updateMarkingCategory(supabase, userId, categoryId, updates) {
  if (!userId) return false;
  
  try {
    const { error } = await supabase
      .from('japanese_marking_categories')
      .upsert({
        user_id: userId,
        category_id: categoryId,
        label: updates.label,
        icon: updates.icon,
        color: updates.color,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,category_id' });
    
    if (error) {
      console.error('updateMarkingCategory error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('updateMarkingCategory exception:', err);
    return false;
  }
}

/**
 * Load vocabulary with pagination (handles >1000 rows)
 */
export async function loadVocabulary(supabase) {
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('japanese_vocabulary')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('id');
      
      if (error) {
        console.error('Vocabulary load error:', error);
        break;
      }
      if (!data || data.length === 0) break;
      
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }
    
    // Transform data
    return allData.map(row => {
      const wd = getWeekDay(row.page_no);
      return {
        ...row,
        meaning: row.meaning_en || row.meaning || '',
        weekDayLabel: wd.label,
        week: wd.week,
        day: wd.day,
      };
    });
  } catch (err) {
    console.error('loadVocabulary exception:', err);
    return [];
  }
}

/**
 * Load user markings with pagination
 */
export async function loadMarkings(supabase, userId) {
  if (!userId) {
    console.log('loadMarkings: No userId provided');
    return {};
  }
  
  console.log('loadMarkings: Loading for userId:', userId);
  
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('japanese_user_markings')
        .select('kanji, marking')
        .eq('user_id', userId)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) {
        console.error('Markings load error:', error, 'userId:', userId);
        break;
      }
      if (!data || data.length === 0) break;
      
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }
    
    // Convert to object
    const markings = {};
    allData.forEach(row => {
      markings[row.kanji] = row.marking;
    });
    
    console.log(`Loaded ${allData.length} markings`);
    return markings;
  } catch (err) {
    console.error('loadMarkings exception:', err);
    return {};
  }
}

/**
 * Update marking in database
 */
export async function updateMarkingInDB(supabase, userId, kanji, marking) {
  if (!userId) return false;
  
  try {
    let result;
    if (marking === 0) {
      // Delete the marking
      result = await supabase
        .from('japanese_user_markings')
        .delete()
        .eq('user_id', userId)
        .eq('kanji', kanji);
    } else {
      // Upsert the marking
      result = await supabase
        .from('japanese_user_markings')
        .upsert({
          user_id: userId,
          kanji: kanji,
          marking: marking,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,kanji' });
    }
    
    if (result.error) {
      console.error('Update marking error:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('updateMarkingInDB exception:', err);
    return false;
  }
}

/**
 * Load story groups
 */
export async function loadStoryGroups(supabase) {
  try {
    const { data, error } = await supabase
      .from('japanese_kanji_story_groups')
      .select('*')
      .order('group_number');
    
    if (error) {
      console.error('Story groups error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('loadStoryGroups exception:', err);
    return [];
  }
}

/**
 * Load stories with pagination
 */
export async function loadStories(supabase) {
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('japanese_kanji_stories')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('id');
      
      if (error) {
        console.error('Stories load error:', error);
        break;
      }
      if (!data || data.length === 0) break;
      
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }
    
    return allData;
  } catch (err) {
    console.error('loadStories exception:', err);
    return [];
  }
}

/**
 * Load similar kanji groups
 */
export async function loadSimilarGroups(supabase) {
  try {
    const { data, error } = await supabase
      .from('japanese_kanji_similar_groups')
      .select('*')
      .order('id');
    
    if (error) {
      console.error('Similar groups error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('loadSimilarGroups exception:', err);
    return [];
  }
}

/**
 * Load self-study topics
 */
export async function loadSelfStudyTopics(supabase, userId) {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('japanese_self_study_topics')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at');
    
    if (error) {
      console.error('Self study topics error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('loadSelfStudyTopics exception:', err);
    return [];
  }
}

/**
 * Load self-study words
 */
export async function loadSelfStudyWords(supabase, userId) {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('japanese_self_study_words')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at');
    
    if (error) {
      console.error('Self study words error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('loadSelfStudyWords exception:', err);
    return [];
  }
}

/**
 * Add new topic
 */
export async function addTopic(supabase, userId, topicData) {
  try {
    const { data, error } = await supabase
      .from('japanese_self_study_topics')
      .insert({
        user_id: userId,
        topic_name: topicData.name,
        topic_icon: topicData.icon,
        topic_color: topicData.color,
        description: topicData.description
      })
      .select()
      .single();
    
    if (error) {
      console.error('Add topic error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('addTopic exception:', err);
    return null;
  }
}

/**
 * Add new self-study word
 */
export async function addSelfStudyWord(supabase, userId, topicId, wordData) {
  try {
    const { data, error } = await supabase
      .from('japanese_self_study_words')
      .insert({
        user_id: userId,
        topic_id: topicId,
        kanji: wordData.kanji,
        hiragana: wordData.hiragana || null,
        meaning_en: wordData.meaning || null,
        hint: wordData.hint || null,
        source: wordData.source || null,
        notes: wordData.notes || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Add word error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('addSelfStudyWord exception:', err);
    return null;
  }
}

/**
 * Save SRS review mistake
 */
export async function saveSRSMistake(supabase, userId, word, testType) {
  if (!userId) return;
  
  try {
    await supabase
      .from('japanese_user_reviews')
      .insert({
        user_id: userId,
        kanji: word.kanji || word.raw,
        test_type: testType,
        correct: false,
        reviewed_at: new Date().toISOString()
      });
  } catch (err) {
    console.error('saveSRSMistake exception:', err);
  }
}

/**
 * Save story alert/flag
 */
export async function saveStoryAlert(supabase, userId, alertData) {
  if (!userId) return { success: false, error: 'Not logged in' };
  
  try {
    const { error } = await supabase
      .from('japanese_story_alerts')
      .insert({
        user_id: userId,
        kanji: alertData.kanji,
        group_kanji: alertData.groupKanji || null,
        alert_type: alertData.alertType,
        comment: alertData.comment?.trim() || '',
        source: alertData.source || 'overlay',
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Story alert save error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Story alert exception:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Save word alert/flag (wrong hiragana, bad sentence, etc.)
 */
export async function saveWordAlert(supabase, userId, alertData) {
  if (!userId) return { success: false, error: 'Not logged in' };
  
  try {
    const { error } = await supabase
      .from('japanese_word_alerts')
      .insert({
        user_id: userId,
        kanji: alertData.kanji,
        hiragana: alertData.hiragana || null,
        meaning: alertData.meaning || null,
        alert_type: alertData.alertType,
        comment: alertData.comment?.trim() || '',
        source: alertData.source || 'flashcard',
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Word alert save error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('Word alert exception:', err);
    return { success: false, error: err.message };
  }
}

// ============================================================
// UNIFIED KANJI TABLES (Phase 2)
// ============================================================

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
