// SRS review writes (mistake logging).

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
