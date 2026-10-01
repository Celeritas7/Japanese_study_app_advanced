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
 * If the count is missing, fall back to sequential paging so a full first
 * page is never mistaken for the whole table.
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
    if (rows.length < pageSize) return rows;
    if (first.count == null) return rows.concat(await loadStoriesSequential(supabase, 1, pageSize));
    const total = first.count;
    if (rows.length >= total) return rows;

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

// One page after another, starting at `startPage`, until a short page.
async function loadStoriesSequential(supabase, startPage, pageSize) {
  let all = [];
  for (let p = startPage; ; p++) {
    const { data, error } = await supabase
      .from('japanese_kanji_stories')
      .select(STORY_COLS)
      .range(p * pageSize, (p + 1) * pageSize - 1)
      .order('id');
    if (error) { console.error('Stories page', p, error); break; }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
  }
  return all;
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
