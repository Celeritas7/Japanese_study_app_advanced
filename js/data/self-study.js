// Self-study topic and word loaders / writers.

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
