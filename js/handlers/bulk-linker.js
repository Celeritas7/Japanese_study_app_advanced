import { linkSentenceToWord, bulkAddSentences, bulkLinkSentences } from '../data/sentences.js';
import { extractKanjiStem } from '../render-kanji.js';
import { showToast } from '../utils.js';

// ===== BULK SENTENCE LINKER =====

export function open(app) {
  app.kanjiView = 'bulk-linker';
  app.bulkSentenceInput = '';
  app.bulkSource = 'manual';
  app.bulkParsedResults = null;
  app.bulkSaving = false;
  app.bulkResultMessage = '';
  app.render();
}

export function parse(app) {
  const text = document.getElementById('bulkSentenceInput')?.value?.trim();
  if (!text) { showToast('Paste some sentences first', 'error'); return; }

  app.bulkSentenceInput = text;
  app.bulkSource = document.getElementById('bulkSourceInput')?.value?.trim() || 'manual';
  const level = document.getElementById('bulkLevelInput')?.value || '';

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // For each sentence, detect which words from kanjiWords it contains
  // Build a lookup: stem → word objects
  const stemMap = {};
  app.kanjiWords.forEach(w => {
    const stem = extractKanjiStem(w.kanji);
    if (stem) {
      if (!stemMap[stem]) stemMap[stem] = [];
      stemMap[stem].push(w);
    }
  });

  // Sort stems by length descending for greedy matching
  const sortedStems = Object.keys(stemMap).sort((a, b) => b.length - a.length);

  app.bulkParsedResults = lines.map(line => {
    const detectedWords = [];
    const seenWordIds = new Set();

    for (const stem of sortedStems) {
      if (line.includes(stem)) {
        for (const w of stemMap[stem]) {
          if (!seenWordIds.has(w.id)) {
            seenWordIds.add(w.id);
            detectedWords.push(w);
          }
        }
      }
    }

    return {
      sentence: line,
      meaning: '', // user can add later
      jlpt_level: level,
      detectedWords,
      linkedWordIds: [], // track which have been linked
    };
  });

  app.render();
  showToast(`Detected words in ${lines.length} sentences`, 'success');
}

export async function linkSingle(app, wordId, sentenceIdx) {
  const result = app.bulkParsedResults?.[sentenceIdx];
  if (!result || !result.insertedSentenceId) {
    showToast('Save all sentences first', 'error');
    return;
  }

  const linkResult = await linkSentenceToWord(app.supabase, wordId, result.insertedSentenceId, app.user?.id);
  if (linkResult.success) {
    if (!result.linkedWordIds) result.linkedWordIds = [];
    result.linkedWordIds.push(wordId);
    app.render();
    showToast('Linked!', 'success');
  } else {
    showToast('Link failed', 'error');
  }
}

export async function saveAndLinkAll(app) {
  if (!app.bulkParsedResults || app.bulkParsedResults.length === 0) return;

  app.bulkSaving = true;
  app.render();

  const source = app.bulkSource || 'manual';
  const level = document.getElementById('bulkLevelInput')?.value || '';

  // Step 1: Insert all sentences
  const sentencesToAdd = app.bulkParsedResults.map(r => ({
    sentence: r.sentence,
    meaning_en: r.meaning || null,
    source,
    jlpt_level: r.jlpt_level || level || null,
  }));

  const addResult = await bulkAddSentences(app.supabase, sentencesToAdd, app.user?.id);

  if (addResult.added === 0) {
    app.bulkSaving = false;
    app.render();
    showToast('Failed to save sentences: ' + (addResult.errors?.[0] || 'Unknown'), 'error');
    return;
  }

  // Map inserted sentence IDs back to parsed results
  const inserted = addResult.insertedSentences || [];
  inserted.forEach((s, i) => {
    if (app.bulkParsedResults[i]) {
      app.bulkParsedResults[i].insertedSentenceId = s.id;
    }
  });

  // Step 2: Build all word-sentence links
  const linksToCreate = [];
  app.bulkParsedResults.forEach((result, idx) => {
    if (!result.insertedSentenceId) return;
    result.detectedWords.forEach(dw => {
      linksToCreate.push({ word_id: dw.id, sentence_id: result.insertedSentenceId });
    });
  });

  let linkedCount = 0;
  if (linksToCreate.length > 0) {
    const linkResult = await bulkLinkSentences(app.supabase, linksToCreate, app.user?.id);
    linkedCount = linkResult.linked || 0;

    // Mark all as linked in local state
    app.bulkParsedResults.forEach(result => {
      result.linkedWordIds = result.detectedWords.map(dw => dw.id);
    });
  }

  // Add to local sentence pool
  inserted.forEach(s => app.allUnifiedSentences.push(s));

  app.bulkSaving = false;
  app.bulkResultMessage = `✅ ${addResult.added} sentences saved, ${linkedCount} word links created`;
  app.render();
}
