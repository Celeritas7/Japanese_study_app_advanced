// JLPT Vocabulary Master - Data Operations

import { getWeekDay } from './utils.js';

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
  if (!userId) return {};
  
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
        console.error('Markings load error:', error);
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
