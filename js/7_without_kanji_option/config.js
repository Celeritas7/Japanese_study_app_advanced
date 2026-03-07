// JLPT Vocabulary Master - Configuration

// Supabase Configuration
export const SUPABASE_URL = 'https://ulgrfumbwjovbjzjiems.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ3JmdW1id2pvdmJqemppZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzIyNjcsImV4cCI6MjA4Mjk0ODI2N30.ix5Vh4Y3GXNbQbzVtTD_WSko0L3cr5q_eCnTuDEMh7M';

// Level Colors
export const LEVEL_COLORS = {
  'N1': { bg: 'bg-rose-500', text: 'text-rose-500', light: 'bg-rose-100' },
  'N2': { bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-100' },
  'N3': { bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-100' },
  'ALL': { bg: 'bg-slate-600', text: 'text-slate-400', light: 'bg-slate-100' },
};

// Marking Categories with Emoji (using Unicode escape sequences)
export const MARKING_CATEGORIES = {
  0: { label: 'Not Marked', color: 'bg-gray-500', lightColor: 'bg-gray-100', textColor: 'text-gray-700', icon: '\u25CB', border: 'border-gray-300' },       // ○
  1: { label: 'Monthly Review', color: 'bg-emerald-500', lightColor: 'bg-emerald-100', textColor: 'text-emerald-700', icon: '\u2714', border: 'border-emerald-400' },  // ✔
  2: { label: "Can't Converse", color: 'bg-violet-500', lightColor: 'bg-violet-100', textColor: 'text-violet-700', icon: '\uD83D\uDCAC', border: 'border-violet-400' }, // 💬
  3: { label: "Can't Write", color: 'bg-orange-500', lightColor: 'bg-orange-100', textColor: 'text-orange-700', icon: '\u270D', border: 'border-orange-400' },    // ✍
  4: { label: "Can't Use", color: 'bg-pink-500', lightColor: 'bg-pink-100', textColor: 'text-pink-700', icon: '\uD83E\uDD14', border: 'border-pink-400' },      // 🤔
  5: { label: "Don't Know", color: 'bg-red-500', lightColor: 'bg-red-100', textColor: 'text-red-700', icon: '\u274C', border: 'border-red-400' },          // ❌
};

// Test Types
export const TEST_TYPES = {
  kanji: { label: 'Kanji Recognition', desc: 'See kanji, guess meaning', icon: '\u6F22' },    // 漢
  reading: { label: 'Reading Recognition', desc: 'See hiragana, guess kanji', icon: '\u3042' }, // あ
  writing: { label: 'Writing Test', desc: 'See meaning, write kanji', icon: '\u270D' },       // ✍
};

// Tab Icons
export const TAB_ICONS = {
  study: '\uD83D\uDCDA',    // 📚
  srs: '\uD83D\uDD04',      // 🔄
  stories: '\uD83D\uDCD6', // 📖
  similar: '\uD83C\uDFB2', // 🎲
};

// Topic Icons for Self Study
export const TOPIC_ICONS = [
  '\uD83D\uDCDA', // 📚
  '\uD83C\uDFAC', // 🎬
  '\uD83C\uDFAE', // 🎮
  '\uD83C\uDFB5', // 🎵
  '\uD83D\uDCBC', // 💼
  '\u2708\uFE0F', // ✈️
  '\uD83C\uDF54', // 🍔
  '\uD83D\uDCAC', // 💬
];

// Topic Colors
export const TOPIC_COLORS = ['blue', 'purple', 'pink', 'orange', 'teal', 'indigo', 'rose', 'cyan'];
