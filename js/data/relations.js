// Word groups (relations) and per-user "studied" toggle log.

/**
 * Load word groups
 */
export async function loadWordGroups(supabase) {
  try {
    const { data, error } = await supabase
      .from('japanese_word_groups')
      .select('*')
      .order('group_type')
      .order('group_name');

    if (error) {
      console.error('Load word groups error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('loadWordGroups exception:', err);
    return [];
  }
}

/**
 * Load word group members
 */
export async function loadWordGroupMembers(supabase) {
  try {
    let allData = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('japanese_word_group_members')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('group_id')
        .order('sort_order');

      if (error) {
        console.error('Load group members error:', error);
        break;
      }
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }

    return allData;
  } catch (err) {
    console.error('loadWordGroupMembers exception:', err);
    return [];
  }
}

/**
 * Load the set of group IDs the user has marked as studied.
 * Returns Set<number>. Empty set on error, missing userId, or no rows.
 */
export async function loadGroupStudyLog(supabase, userId) {
  if (!userId) {
    console.log('loadGroupStudyLog: No userId provided');
    return new Set();
  }

  try {
    const { data, error } = await supabase
      .from('japanese_group_study_log')
      .select('group_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Load group study log error:', error);
      return new Set();
    }
    return new Set((data || []).map(r => r.group_id));
  } catch (err) {
    console.error('loadGroupStudyLog exception:', err);
    return new Set();
  }
}

/**
 * Mark or unmark a group as studied for a user.
 * If studied is true, upsert (user_id, group_id, now()).
 * If false, delete the row.
 * groupId is coerced to integer at this boundary because the migration path
 * may pass values parsed from untrusted localStorage.
 * Returns true on success, false on failure.
 */
export async function setGroupStudied(supabase, userId, groupId, studied) {
  if (!userId) return false;
  const id = parseInt(groupId, 10);
  if (Number.isNaN(id)) return false;

  try {
    let result;
    if (studied) {
      result = await supabase
        .from('japanese_group_study_log')
        .upsert({
          user_id: userId,
          group_id: id,
          studied_at: new Date().toISOString()
        }, { onConflict: 'user_id,group_id' });
    } else {
      result = await supabase
        .from('japanese_group_study_log')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', id);
    }

    if (result.error) {
      console.error('setGroupStudied error:', result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('setGroupStudied exception:', err);
    return false;
  }
}
