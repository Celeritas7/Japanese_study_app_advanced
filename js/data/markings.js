// Marking-related data operations (categories + per-user kanji markings).

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
      // Table may not exist yet — fall back silently to defaults
      if (error.code === 'PGRST205' || error.message?.includes('not find')) {
        console.log('loadMarkingCategories: Table not found, using defaults');
      } else {
        console.warn('loadMarkingCategories:', error.message);
      }
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
        .select('kanji, marking, marked_at')
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

    // Convert to objects
    const markings = {};
    const timestamps = {};
    allData.forEach(row => {
      markings[row.kanji] = row.marking;
      if (row.marked_at) timestamps[row.kanji] = row.marked_at;
    });

    console.log(`Loaded ${allData.length} markings`);
    return { markings, timestamps };
  } catch (err) {
    console.error('loadMarkings exception:', err);
    return { markings: {}, timestamps: {} };
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
          marked_at: new Date().toISOString(),
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
