// Kanji story group / story loaders and user-flag (alert) writers.

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
