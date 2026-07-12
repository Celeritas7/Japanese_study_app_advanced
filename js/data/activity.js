// Daily activity (study streak) data operations.
// Backs the Home 🔥 streak pill/sheet. Rows are keyed by (user_id, activity_date)
// where activity_date is a LOCAL calendar date string (YYYY-MM-DD).

/**
 * Insert or update today's activity row for a user.
 * Errors are swallowed (best-effort telemetry) so a missing table/policy never
 * breaks the study flow.
 */
export async function upsertDailyActivity(supabase, userId, activityDate, wordsPracticed, sessions) {
  try {
    await supabase.from('japanese_daily_activity').upsert(
      { user_id: userId, activity_date: activityDate, words_practiced: wordsPracticed,
        sessions: sessions, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,activity_date' }
    );
  } catch (e) { console.warn('upsertDailyActivity:', e); }
}

/**
 * Fetch the user's recent daily-activity history (newest first, up to ~400 days).
 * Returns [] on any error so callers can render an empty streak.
 */
export async function fetchDailyActivity(supabase, userId) {
  try {
    const { data } = await supabase.from('japanese_daily_activity')
      .select('activity_date,words_practiced')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(400);
    return data || [];
  } catch (e) { console.warn('fetchDailyActivity:', e); return []; }
}
