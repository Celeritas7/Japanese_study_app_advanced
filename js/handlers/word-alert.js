// Word alert handlers — user-flagged word issues (wrong reading / bad sentence / etc.).
// Functions take `app` (the JLPTStudyApp instance) as their first arg.

import { saveWordAlert } from '../data/stories.js';
import { showToast } from '../utils.js';

export function open(app, word, source = 'flashcard') {
  app.wordAlertTarget = {
    kanji: word.kanji || word.raw,
    hiragana: word.hiragana || '',
    meaning: word.meaning || '',
    source
  };
  app.wordAlertComment = '';
  app.wordAlertType = 'wrong_reading';
  app.wordAlertSaving = false;
  app.render();
}

export function close(app) { app.wordAlertTarget = null; app.render(); }

export async function submit(app) {
  if (!app.wordAlertTarget || !app.user) return;
  app.wordAlertSaving = true;
  app.render();

  const result = await saveWordAlert(app.supabase, app.user.id, {
    kanji: app.wordAlertTarget.kanji,
    hiragana: app.wordAlertTarget.hiragana,
    meaning: app.wordAlertTarget.meaning,
    alertType: app.wordAlertType,
    comment: app.wordAlertComment,
    source: app.wordAlertTarget.source
  });

  app.wordAlertSaving = false;
  if (result.success) {
    app.wordAlertTarget = null;
    app.render();
    showToast('🚩 Word flag saved!', 'success');
  } else {
    showToast(`Flag save failed: ${result.error}`, 'error');
  }
}
