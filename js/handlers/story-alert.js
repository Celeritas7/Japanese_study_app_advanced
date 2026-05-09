// Story alert handlers — user-flagged kanji story issues + missing-story requests.
// Functions take `app` (the JLPTStudyApp instance) as their first arg.

import { saveStoryAlert } from '../data/stories.js';
import { showToast } from '../utils.js';

export function open(app, kanji, groupKanji, source) {
  app.storyAlertTarget = { kanji, groupKanji, source };
  app.storyAlertComment = '';
  app.storyAlertType = 'incorrect';
  app.storyAlertSaving = false;
  app.render();
}

export function close(app) { app.storyAlertTarget = null; app.render(); }

export async function submit(app) {
  if (!app.storyAlertTarget || !app.user) return;
  app.storyAlertSaving = true;
  app.render();

  const result = await saveStoryAlert(app.supabase, app.user.id, {
    kanji: app.storyAlertTarget.kanji,
    groupKanji: app.storyAlertTarget.groupKanji,
    alertType: app.storyAlertType,
    comment: app.storyAlertComment,
    source: app.storyAlertTarget.source
  });

  app.storyAlertSaving = false;
  if (result.success) {
    app.storyAlertTarget = null;
    app.render();
    showToast('⚠️ Story alert saved!', 'success');
  } else {
    showToast(`Alert save failed: ${result.error}`, 'error');
  }
}

export async function requestMissing(app, kanji) {
  if (!kanji || !app.user) { showToast('Not logged in', 'error'); return; }
  const result = await saveStoryAlert(app.supabase, app.user.id, {
    kanji,
    groupKanji: '',
    alertType: 'missing_story',
    comment: 'Story requested — no story exists for this kanji',
    source: 'flashcard'
  });
  if (result.success) {
    showToast(`📝 Story request saved for「${kanji}」`, 'success');
  } else {
    showToast('Request failed: ' + (result.error || 'Unknown'), 'error');
  }
}
