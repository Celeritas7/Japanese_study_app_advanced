// JLPT Vocabulary Master - Configuration

export const SUPABASE_URL = 'https://ulgrfumbwjovbjzjiems.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ3JmdW1id2pvdmJqemppZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzIyNjcsImV4cCI6MjA4Mjk0ODI2N30.ix5Vh4Y3GXNbQbzVtTD_WSko0L3cr5q_eCnTuDEMh7M';

export const LEVEL_COLORS = {
  'N1': { bg: 'bg-rose-500', text: 'text-rose-500', light: 'bg-rose-100' },
  'N2': { bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-100' },
  'N3': { bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-100' },
  'ALL': { bg: 'bg-slate-600', text: 'text-slate-400', light: 'bg-slate-100' },
};

export const MARKING_CATEGORIES = {
  0: { label: 'Not Marked', color: 'bg-gray-500', lightColor: 'bg-gray-100', textColor: 'text-gray-700', icon: 'O', border: 'border-gray-300' },
  1: { label: 'Monthly Review', color: 'bg-emerald-500', lightColor: 'bg-emerald-100', textColor: 'text-emerald-700', icon: 'V', border: 'border-emerald-400' },
  2: { label: "Can't Converse", color: 'bg-violet-500', lightColor: 'bg-violet-100', textColor: 'text-violet-700', icon: 'C', border: 'border-violet-400' },
  3: { label: "Can't Write", color: 'bg-orange-500', lightColor: 'bg-orange-100', textColor: 'text-orange-700', icon: 'W', border: 'border-orange-400' },
  4: { label: "Can't Use", color: 'bg-pink-500', lightColor: 'bg-pink-100', textColor: 'text-pink-700', icon: '?', border: 'border-pink-400' },
  5: { label: "Don't Know", color: 'bg-red-500', lightColor: 'bg-red-100', textColor: 'text-red-700', icon: 'X', border: 'border-red-400' },
};

export const TEST_TYPES = {
  kanji: { label: 'Kanji Recognition', desc: 'See kanji, guess meaning', icon: 'Ka' },
  reading: { label: 'Reading Recognition', desc: 'See hiragana, guess kanji', icon: 'Hi' },
  writing: { label: 'Writing Test', desc: 'See meaning, write kanji', icon: 'Wr' },
};

export const TOPIC_ICONS = ['📚', '🎬', '🚃', '📺', '🏢', '💻', '🍽', '🏥', '✈', '🎮', '🎵', '⚽', '🛒', '🏠', '💼', '📱'];

export const TOPIC_COLORS = ['blue', 'pink', 'yellow', 'green', 'purple', 'red', 'slate', 'orange', 'teal', 'indigo'];
