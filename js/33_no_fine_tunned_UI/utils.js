// JLPT Vocabulary Master - Utility Functions

import { MARKING_CATEGORIES } from './config.js';
import { getTokensA } from './tokens.js';

/**
 * Convert page number to week/day format
 */
export function getWeekDay(pageNo) {
  const page = parseInt(pageNo) || 0;
  if (page < 12) return { week: 1, day: 1, label: 'Week1 Day1' };
  const adjustedPage = page - 12;
  const dayIndex = Math.floor(adjustedPage / 2);
  const week = Math.floor(dayIndex / 7) + 1;
  const day = (dayIndex % 7) + 1;
  return { week, day, label: `Week${week} Day${day}` };
}

/**
 * Get marking value for a word
 */
export function getMarking(markings, word) {
  return markings[word.kanji] || markings[word.raw] || 0;
}

/**
 * Calculate stats by level
 */
export function getStatsByLevel(vocabulary, markings, level) {
  const words = level === 'ALL' ? vocabulary : vocabulary.filter(v => v.level === level);
  const stats = { total: words.length };
  Object.keys(MARKING_CATEGORIES).forEach(k => {
    stats[k] = words.filter(w => getMarking(markings, w) === parseInt(k)).length;
  });
  return stats;
}

/**
 * Get available week/days for a level
 */
export function getAvailableWeekDays(vocabulary, level) {
  const words = level === 'ALL' ? vocabulary : vocabulary.filter(v => v.level === level);
  const weekDays = new Map();
  
  words.forEach(w => {
    const key = w.weekDayLabel;
    if (!weekDays.has(key)) {
      weekDays.set(key, { label: key, week: w.week, day: w.day, count: 0 });
    }
    weekDays.get(key).count++;
  });
  
  return Array.from(weekDays.values()).sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;
    return a.day - b.day;
  });
}

/**
 * Escape kanji for HTML attributes
 */
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parse kanji list from database format (e.g., "{漢,字,列}")
 */
export function parseKanjiList(kanjiList) {
  if (!kanjiList) return [];
  let cleaned = kanjiList;
  if (cleaned.startsWith('{')) cleaned = cleaned.slice(1);
  if (cleaned.endsWith('}')) cleaned = cleaned.slice(0, -1);
  return cleaned.split(',').map(k => k.trim()).filter(k => k);
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
export function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sample n items from array
 */
export function sampleArray(array, n) {
  return shuffleArray(array).slice(0, n);
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Show toast notification
 */
export function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

/**
 * Check if a character is a CJK kanji
 */
function isKanjiChar(ch) {
  const code = ch.codePointAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Unified
         (code >= 0x3400 && code <= 0x4DBF) ||   // CJK Extension A
         (code >= 0x20000 && code <= 0x2A6DF);   // CJK Extension B
}

/**
 * Check if a string contains at least one kanji character
 */
function containsKanji(str) {
  for (const ch of str) {
    if (isKanjiChar(ch)) return true;
  }
  return false;
}

/**
 * Segment a Japanese sentence into tappable word spans.
 *
 * Phase 7: tokens come from js/tokens.js — pre-computed Sudachi Mode A when
 * available, Segmenter fallback (see js/tokens.js) otherwise. Render-only, no save logic.
 *
 * The currently-studied word is still emitted as ONE `tap-word--current`
 * span even when it spans multiple tokens (e.g. 頭が固い = 頭 / が / 固い).
 * Design (ii): tokenize the whole sentence once, then partition tokens
 * around the study word's character span using token b/e offsets.
 *
 * @param {object|string} sentence - Sentence ROW (with tokens_json) OR raw
 *        text. A bare string forwards through tokens.js → Segmenter fallback.
 * @param {string} currentWordKanji - The word being studied (highlighted).
 * @param {Set} knownKanjiSet - Kanji already in japanese_unified_words.
 * @returns {string} HTML string with tap-word spans
 */
export function renderTappableSentence(sentence, currentWordKanji, knownKanjiSet) {
  const text = (typeof sentence === 'string' ? sentence : (sentence?.sentence || '')) || '';
  if (!text) return '';

  try {
    const tokens = getTokensA(sentence); // [{s,l,r,p,b,e}], offsets into text

    // Render one non-study token using the existing tappability rules.
    const renderToken = (word) => {
      const escaped = escapeHtml(word);
      // Non-word-like (punctuation / whitespace) — plain text
      if (/^[\s\p{P}\p{S}]+$/u.test(word)) return escaped;
      // Short pure-kana (1-2 chars) — grammar particles, skip
      if (/^[぀-ゟ゠-ヿ]{1,2}$/.test(word)) return escaped;
      // Only tappable if it contains kanji or is long katakana (3+ chars)
      const hasKanji = containsKanji(word);
      const isLongKatakana = /^[゠-ヿ]{3,}$/.test(word);
      if (!hasKanji && !isLongKatakana) return escaped;
      // Already in DB — "saved" style
      if (knownKanjiSet && knownKanjiSet.has(word)) {
        return `<span class="tap-word tap-word--saved" data-tap-word="${escaped}">${escaped}</span>`;
      }
      // Tappable unknown word
      return `<span class="tap-word" data-tap-word="${escaped}">${escaped}</span>`;
    };

    // Study-word character spans over `text` (indexOf walk — preserves the
    // original split-first behavior so a multi-token study word stays a
    // single tap target, e.g. 頭が固い).
    const ranges = [];
    if (currentWordKanji && text.includes(currentWordKanji)) {
      let from = 0, idx;
      while ((idx = text.indexOf(currentWordKanji, from)) !== -1) {
        ranges.push({ s: idx, e: idx + currentWordKanji.length });
        from = idx + currentWordKanji.length;
      }
    }

    // Build alternating non-study / study regions over [0, text.length).
    const regions = [];
    let p = 0;
    for (const r of ranges) {
      if (r.s > p) regions.push({ s: p, e: r.s, study: false });
      regions.push({ s: r.s, e: r.e, study: true });
      p = r.e;
    }
    if (p < text.length) regions.push({ s: p, e: text.length, study: false });
    if (regions.length === 0) regions.push({ s: 0, e: text.length, study: false });

    let html = '';
    let ti = 0; // monotonic token cursor across regions (tokens are ordered)
    for (const reg of regions) {
      if (reg.study) {
        html += `<span class="tap-word--current">${escapeHtml(text.slice(reg.s, reg.e))}</span>`;
        continue;
      }
      // Position-walk the region consulting tokens; keeps emitted text
      // byte-faithful even if a token straddles a study boundary or there
      // is a coverage gap.
      let c = reg.s;
      while (c < reg.e) {
        while (ti < tokens.length && tokens[ti].e <= c) ti++;
        const t = tokens[ti];
        if (!t || t.b >= reg.e) {
          html += escapeHtml(text.slice(c, reg.e));
          c = reg.e;
          break;
        }
        if (t.b > c) {
          const stop = Math.min(t.b, reg.e);
          html += escapeHtml(text.slice(c, stop));
          c = stop;
          continue;
        }
        if (t.b >= reg.s && t.e <= reg.e) {
          html += renderToken(t.s);            // token fully inside region
          c = t.e;
        } else {
          // token straddles a study boundary — emit the slice as plain
          // text (never tappable-render a partial token)
          const stop = Math.min(t.e, reg.e);
          html += escapeHtml(text.slice(c, stop));
          c = stop;
        }
      }
    }

    return html;
  } catch (e) {
    console.warn('renderTappableSentence error:', e);
    return escapeHtml(text);
  }
}

/**
 * Generate pronunciation mutations for smart MCQ distractors
 */
export function generatePronunciationMutations(hiragana) {
  if (!hiragana) return [];
  const chars = [...hiragana];
  const mutations = [];
  
  const smallToBig = { 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ' };
  const bigToSmall = { 'や': 'ゃ', 'ゆ': 'ゅ', 'よ': 'ょ' };
  const yParents = ['き','し','ち','に','ひ','み','り','ぎ','じ','ぢ','び','ぴ'];
  const iRow = ['き','し','ち','に','ひ','み','り','ぎ','じ','ぢ','び','ぴ','い'];
  const oRow = ['こ','そ','と','の','ほ','も','よ','ろ','ご','ぞ','ど','ぼ','ぽ','お'];
  
  // Rule 3: ゃゅょ ↔ やゆよ
  for (let i = 0; i < chars.length; i++) {
    if (smallToBig[chars[i]]) {
      const m = [...chars]; m[i] = smallToBig[chars[i]];
      mutations.push(m.join(''));
    }
    if (bigToSmall[chars[i]] && i > 0 && yParents.includes(chars[i - 1])) {
      const m = [...chars]; m[i] = bigToSmall[chars[i]];
      mutations.push(m.join(''));
    }
  }
  
  // Rule 2: い-sound long vowel confusion
  for (let i = 0; i < chars.length; i++) {
    if (iRow.includes(chars[i])) {
      if (chars[i + 1] === 'い') {
        const m = [...chars]; m.splice(i + 1, 1);
        mutations.push(m.join(''));
      } else if (chars[i + 1] && !['い','ゃ','ゅ','ょ'].includes(chars[i + 1])) {
        const m = [...chars]; m.splice(i + 1, 0, 'い');
        mutations.push(m.join(''));
      }
    }
  }
  
  // Rule 1: お-sound long vowel confusion (う)
  for (let i = 0; i < chars.length; i++) {
    if (oRow.includes(chars[i])) {
      if (chars[i + 1] === 'う') {
        const m = [...chars]; m.splice(i + 1, 1);
        mutations.push(m.join(''));
      } else if (chars[i + 1] !== 'う') {
        const m = [...chars]; m.splice(i + 1, 0, 'う');
        mutations.push(m.join(''));
      }
    }
  }
  
  return [...new Set(mutations)].filter(m => m !== hiragana);
}
