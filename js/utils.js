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
