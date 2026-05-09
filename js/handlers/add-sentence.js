import { addNewSentenceAndLink } from '../data/sentences.js';
import { getCurrentStudyWord } from '../render-kanji.js';
import { showToast } from '../utils.js';

// ===== ADD SENTENCE BOTTOM SHEET =====

export function open(app) {
  app.showAddSentenceSheet = true;
  app.addSentenceSaving = false;
  app.newSentenceText = '';
  app.newSentenceMeaning = '';
  app.newSentenceSource = 'manual';
  app.render();
  // Focus the textarea after render
  setTimeout(() => document.getElementById('newSentenceTextInput')?.focus(), 100);
}

export function close(app) {
  app.showAddSentenceSheet = false;
  app.render();
}

// Find the unified word ID for any word
// After merge, vocabulary words already have unified IDs
function resolveUnifiedWordId(app, word) {
  if (word.id && app.kanjiWords.some(w => w.id === word.id)) return word.id;
  // Fallback: look up by kanji text
  const kanji = word.kanji || word.raw || '';
  const match = app.kanjiWords.find(w => w.kanji === kanji);
  return match?.id || null;
}

export async function submit(app) {
  const sentence = document.getElementById('newSentenceTextInput')?.value?.trim();
  if (!sentence) { showToast('Please enter a sentence', 'error'); return; }

  const word = getCurrentStudyWord(app);
  if (!word) return;

  app.addSentenceSaving = true;
  app.render();

  const meaning = document.getElementById('newSentenceMeaningInput')?.value?.trim() || '';
  const source = document.getElementById('newSentenceSourceInput')?.value?.trim() || 'manual';
  const level = document.getElementById('newSentenceLevelInput')?.value || '';

  // Resolve unified word ID (Goi words don't have unified IDs directly)
  const unifiedWordId = resolveUnifiedWordId(app, word);
  if (!unifiedWordId) {
    app.addSentenceSaving = false;
    showToast('Word not found in unified database', 'error');
    app.render();
    return;
  }

  const result = await addNewSentenceAndLink(app.supabase, {
    sentence,
    meaning_en: meaning,
    source,
    jlpt_level: level || word.jlpt_level || word.level || null,
  }, unifiedWordId, app.user?.id);

  app.addSentenceSaving = false;

  if (result.success) {
    if (result.sentence) {
      app.allUnifiedSentences.push(result.sentence);
      if (!app.kanjiSentenceMap[unifiedWordId]) app.kanjiSentenceMap[unifiedWordId] = [];
      app.kanjiSentenceMap[unifiedWordId].push({
        ...result.sentence,
        link_id: result.link?.id,
        sentence_id: result.sentence.id,
        rating: null,
      });
    }

    app.showAddSentenceSheet = false;
    app.render();
    showToast('Sentence added & linked!', 'success');
  } else {
    app.render();
    showToast('Failed: ' + (result.error || 'Unknown error'), 'error');
  }
}
