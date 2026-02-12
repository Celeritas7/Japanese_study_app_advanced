// JLPT Vocabulary Master - Data Loading Functions

import { getWeekDay } from './utils.js';

/**
 * Load vocabulary with pagination
 */
export async function loadVocabulary(sb) {
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await sb
        .from('japanese_vocabulary')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('id');
      
      if (error) { console.error('Vocabulary error:', error); break; }
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }
    
    const vocabulary = allData.map(row => ({
      ...row,
      meaning: row.meaning_en || row.meaning || '',
      weekDayLabel: getWeekDay(row.page_no).label,
      week: getWeekDay(row.page_no).week,
      day: getWeekDay(row.page_no).day,
    }));
    
    console.log(`Loaded ${vocabulary.length} vocabulary words`);
    return vocabulary;
  } catch (err) {
    console.error('loadVocabulary failed:', err);
    return [];
  }
}

/**
 * Load user markings with pagination
 */
export async function loadMarkings(sb, userId) {
  if (!userId) return {};
  
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await sb
        .from('japanese_user_markings')
        .select('kanji, marking')
        .eq('user_id', userId)
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (error) { console.error('Markings error:', error); break; }
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }
    
    const markings = {};
    allData.forEach(r => markings[r.kanji] = r.marking);
    console.log(`Loaded ${allData.length} markings`);
    return markings;
  } catch (err) {
    console.error('loadMarkings failed:', err);
    return {};
  }
}

/**
 * Load story groups
 */
export async function loadStoryGroups(sb) {
  try {
    const { data, error } = await sb
      .from('japanese_kanji_story_groups')
      .select('*')
      .order('group_number');
    
    if (error) { console.error('Story groups error:', error); return []; }
    return data || [];
  } catch (err) {
    console.error('loadStoryGroups failed:', err);
    return [];
  }
}

/**
 * Load stories with pagination
 */
export async function loadStories(sb) {
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await sb
        .from('japanese_kanji_stories')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('id');
      
      if (error) { console.error('Stories error:', error); break; }
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }
    
    return allData;
  } catch (err) {
    console.error('loadStories failed:', err);
    return [];
  }
}

/**
 * Load similar kanji groups
 */
export async function loadSimilarGroups(sb) {
  try {
    const { data, error } = await sb
      .from('japanese_kanji_similar_groups')
      .select('*')
      .order('id');
    
    if (error) { console.error('Similar groups error:', error); return []; }
    return data || [];
  } catch (err) {
    console.error('loadSimilarGroups failed:', err);
    return [];
  }
}

/**
 * Load self-study topics
 */
export async function loadSelfStudyTopics(sb, userId) {
  if (!userId) return [];
  
  try {
    const { data, error } = await sb
      .from('japanese_self_study_topics')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at');
    
    if (error) { console.error('Topics error:', error); return []; }
    return data || [];
  } catch (err) {
    console.error('loadSelfStudyTopics failed:', err);
    return [];
  }
}

/**
 * Load self-study words
 */
export async function loadSelfStudyWords(sb, userId) {
  if (!userId) return [];
  
  try {
    const { data, error } = await sb
      .from('japanese_self_study_words')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at');
    
    if (error) { console.error('Self study words error:', error); return []; }
    return data || [];
  } catch (err) {
    console.error('loadSelfStudyWords failed:', err);
    return [];
  }
}

/**
 * Load user sentences
 */
export async function loadUserSentences(sb, userId) {
  if (!userId) return [];
  
  try {
    const { data, error } = await sb
      .from('japanese_user_sentences')
      .select('*')
      .eq('user_id', userId)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });
    
    if (error) { console.error('Sentences error:', error); return []; }
    return data || [];
  } catch (err) {
    console.error('loadUserSentences failed:', err);
    return [];
  }
}

/**
 * Load sentence-word links
 */
export async function loadSentenceLinks(sb, userId) {
  if (!userId) return [];
  
  try {
    const { data, error } = await sb
      .from('japanese_sentence_word_links')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (error) { console.error('Sentence links error:', error); return []; }
    return data || [];
  } catch (err) {
    console.error('loadSentenceLinks failed:', err);
    return [];
  }
}

/**
 * Update marking in database
 */
export async function updateMarkingInDB(sb, userId, kanji, newMarking) {
  try {
    let result;
    if (newMarking === 0) {
      result = await sb
        .from('japanese_user_markings')
        .delete()
        .eq('user_id', userId)
        .eq('kanji', kanji);
    } else {
      result = await sb
        .from('japanese_user_markings')
        .upsert({
          user_id: userId,
          kanji: kanji,
          marking: newMarking,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,kanji' });
    }
    
    if (result.error) {
      console.error('Update marking error:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('updateMarkingInDB failed:', err);
    return false;
  }
}

/**
 * Save SRS mistake to log
 */
export async function saveSRSMistake(sb, userId, word, testType) {
  if (!userId) return;
  
  try {
    const { error } = await sb
      .from('japanese_daily_test_log')
      .insert({
        user_id: userId,
        kanji: word.kanji,
        test_type: testType,
        test_date: new Date().toISOString().split('T')[0],
        is_correct: false,
        rating: null,
        created_at: new Date().toISOString()
      });
    
    if (error) console.error('Save SRS mistake error:', error);
  } catch (err) {
    console.error('saveSRSMistake failed:', err);
  }
}

/**
 * Add self-study topic
 */
export async function addTopic(sb, userId, topicData) {
  try {
    const { data, error } = await sb
      .from('japanese_self_study_topics')
      .insert({
        user_id: userId,
        topic_name: topicData.name.trim(),
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
    console.error('addTopic failed:', err);
    return null;
  }
}

/**
 * Add self-study word
 */
export async function addSelfStudyWord(sb, userId, topicId, wordData) {
  try {
    const { data, error } = await sb
      .from('japanese_self_study_words')
      .insert({
        user_id: userId,
        topic_id: topicId,
        kanji: wordData.kanji.trim(),
        hiragana: wordData.hiragana?.trim() || null,
        meaning_en: wordData.meaning?.trim() || null,
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
    console.error('addSelfStudyWord failed:', err);
    return null;
  }
}

/**
 * Add user sentence
 */
export async function addSentence(sb, userId, sentenceData) {
  try {
    const { data, error } = await sb
      .from('japanese_user_sentences')
      .insert({
        user_id: userId,
        sentence_japanese: sentenceData.japanese.trim(),
        sentence_furigana: sentenceData.furigana?.trim() || null,
        sentence_meaning: sentenceData.meaning?.trim() || null,
        source: sentenceData.source || 'Self-made',
        notes: sentenceData.notes || null
      })
      .select()
      .single();
    
    if (error) {
      console.error('Add sentence error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('addSentence failed:', err);
    return null;
  }
}

/**
 * Add sentence-word links
 */
export async function addSentenceLinks(sb, userId, sentenceId, links) {
  try {
    const { data, error } = await sb
      .from('japanese_sentence_word_links')
      .insert(links.map(link => ({
        user_id: userId,
        sentence_id: sentenceId,
        word_kanji: link.kanji,
        word_source: link.source,
        is_active: true
      })))
      .select();
    
    if (error) {
      console.error('Add sentence links error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('addSentenceLinks failed:', err);
    return [];
  }
}
