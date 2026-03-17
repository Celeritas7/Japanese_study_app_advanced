// JLPT Vocabulary Master - Utility Functions

import { MARKING_CATEGORIES } from './config.js';

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
 * Segment Japanese sentence into tappable word spans.
 * Uses Intl.Segmenter for word boundaries.
 *
 * Phase 1: render-only, no save logic. Tapping does nothing yet.
 *
 * @param {string} text - Sentence text
 * @param {string} currentWordKanji - The word being studied (highlighted differently)
 * @param {Set} knownKanjiSet - Set of kanji strings already in japanese_unified_words
 * @returns {string} HTML string with tap-word spans
 */
export function renderTappableSentence(text, currentWordKanji, knownKanjiSet) {
  if (!text) return '';
  
  // Fallback: plain escaped text if Segmenter unavailable
  if (typeof Intl === 'undefined' || !Intl.Segmenter) {
    return escapeHtml(text);
  }
  
  try {
    const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });
    const segments = [...segmenter.segment(text)];
    
    return segments.map(seg => {
      const word = seg.segment;
      const escaped = escapeHtml(word);
      
      // Non-word-like segments (punctuation, spaces, particles) — plain
      if (!seg.isWordLike) {
        return escaped;
      }
      
      // Current study word — special highlight, not tappable
      if (word === currentWordKanji) {
        return `<span class="tap-word--current">${escaped}</span>`;
      }
      
      // Short pure-kana (1-2 chars hiragana/katakana) — grammar particles, skip
      if (/^[\u3040-\u309F\u30A0-\u30FF]{1,2}$/.test(word)) {
        return escaped;
      }
      
      // Does this word contain kanji? If not, only tappable if katakana 3+ chars
      const hasKanji = containsKanji(word);
      const isLongKatakana = /^[\u30A0-\u30FF]{3,}$/.test(word);
      if (!hasKanji && !isLongKatakana) {
        return escaped;
      }
      
      // Already in DB — show "saved" style
      if (knownKanjiSet && knownKanjiSet.has(word)) {
        return `<span class="tap-word tap-word--saved" data-tap-word="${escaped}">${escaped}</span>`;
      }
      
      // Tappable unknown word
      return `<span class="tap-word" data-tap-word="${escaped}">${escaped}</span>`;
    }).join('');
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
