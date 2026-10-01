// Kanji story group / story loaders and user-flag (alert) writers.
// PERF: narrow selects + parallel paging. Stories are ~4k rows; the old version
// pulled every column across 4 sequential round trips while the app waited.

// Only what render-stories.js and story-overlay.js actually read.
const STORY_COLS = 'id,kanji,role,variant,group_id,group_kanji,meaning,story,' +
  'onyomi,kunyomi,components,onyomi_hint,kunyomi_hint,group_link,example_word,origin';

const GROUP_COLS = 'id,group_number,group_kanji,group_meaning,group_story,' +
  'group_component,group_persona,group_note';

export async function loadStoryGroups(supabase) {
  try {
    const { data, error } = await supabase
      .from('japanese_kanji_story_groups')
      .select(GROUP_COLS)
      .order('group_number');
    if (error) { console.error('Story groups error:', error); return []; }
    return data || [];
  } catch (err) {
    console.error('loadStoryGroups exception:', err);
    return [];
  }
}

/**
 * Load stories. First page tells us the total via an exact count, then the
 * remaining pages are fetched in parallel instead of one after another.
 */
export async function loadStories(supabase) {
  const pageSize = 1000;
  try {
    const first = await supabase
      .from('japanese_kanji_stories')
      .select(STORY_COLS, { count: 'exact' })
      .range(0, pageSize - 1)
      .order('id');

    if (first.error) { console.error('Stories load error:', first.error); return []; }
    const rows = first.data || [];
    const total = first.count ?? rows.length;
    if (rows.length >= total || rows.length < pageSize) return rows;

    const pages = [];
    for (let p = 1; p * pageSize < total; p++) pages.push(p);

    const rest = await Promise.all(pages.map(p =>
      supabase
        .from('japanese_kanji_stories')
        .select(STORY_COLS)
        .range(p * pageSize, (p + 1) * pageSize - 1)
        .order('id')
        .then(r => r.error ? (console.error('Stories page', p, r.error), []) : (r.data || []))
    ));

    return rows.concat(...rest);
  } catch (err) {
    console.error('loadStories exception:', err);
    return [];
  }
}

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
    if (error) { console.error('Story alert save error:', error); return { success: false, error: error.message }; }
    return { success: true };
  } catch (err) {
    console.error('Story alert exception:', err);
    return { success: false, error: err.message };
  }
}

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
    if (error) { console.error('Word alert save error:', error); return { success: false, error: error.message }; }
    return { success: true };
  } catch (err) {
    console.error('Word alert exception:', err);
    return { success: false, error: err.message };
  }
}
