import { updateSentenceVerified, addSentenceTag, removeSentenceTag } from '../data/sentences.js';
import { showToast } from '../utils.js';

// ===== REVIEW QUEUE =====

export function open(app) {
  app.kanjiView = 'review-queue';
  app.reviewFilter = 'unverified';
  app.reviewSourceFilter = 'all';
  app.reviewPage = 0;
  app.render();
}

export function setFilter(app, status) {
  app.reviewFilter = status;
  app.reviewPage = 0;
  app.render();
}

export function setSourceFilter(app, source) {
  app.reviewSourceFilter = source;
  app.reviewPage = 0;
  app.render();
}

export function prevPage(app) { if (app.reviewPage > 0) { app.reviewPage--; app.render(); } }
export function nextPage(app) { app.reviewPage++; app.render(); }

export async function verifySentence(app, sentenceId, status = 'verified') {
  const result = await updateSentenceVerified(app.supabase, sentenceId, status);
  if (result.success) {
    // Update local data
    const sent = app.allUnifiedSentences.find(s => s.id === sentenceId);
    if (sent) sent.verified = status;
    // Also update in kanjiSentenceMap if present
    for (const arr of Object.values(app.kanjiSentenceMap)) {
      const item = arr.find(s => (s.sentence_id || s.id) === sentenceId);
      if (item) item.verified = status;
    }
    app.render();
    const labels = { verified: '✓ Verified', rejected: '✗ Rejected', unverified: '↩ Unverified' };
    showToast(labels[status] || status, 'success');
  } else {
    showToast('Update failed: ' + result.error, 'error');
  }
}

export async function addTag(app, sentenceId) {
  const input = document.querySelector(`[data-tag-input="${sentenceId}"]`);
  const tag = input?.value?.trim();
  if (!tag) return;

  const result = await addSentenceTag(app.supabase, sentenceId, tag);
  if (result.success) {
    // Update local data
    const sent = app.allUnifiedSentences.find(s => s.id === sentenceId);
    if (sent) sent.tags = result.tags;
    for (const arr of Object.values(app.kanjiSentenceMap)) {
      const item = arr.find(s => (s.sentence_id || s.id) === sentenceId);
      if (item) item.tags = result.tags;
    }
    app.render();
    showToast(`Tag "${tag}" added`, 'success');
  } else {
    showToast('Tag failed: ' + result.error, 'error');
  }
}

export async function removeTag(app, sentenceId, tag) {
  const result = await removeSentenceTag(app.supabase, sentenceId, tag);
  if (result.success) {
    const sent = app.allUnifiedSentences.find(s => s.id === sentenceId);
    if (sent) sent.tags = result.tags;
    for (const arr of Object.values(app.kanjiSentenceMap)) {
      const item = arr.find(s => (s.sentence_id || s.id) === sentenceId);
      if (item) item.tags = result.tags;
    }
    app.render();
    showToast(`Tag removed`, 'success');
  } else {
    showToast('Remove failed: ' + result.error, 'error');
  }
}
