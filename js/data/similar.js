// Similar-looking kanji groups loader.

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
