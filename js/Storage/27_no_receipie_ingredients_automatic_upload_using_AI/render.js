// JLPT Vocabulary Master - Render Functions (Study Tab)

import { LEVEL_COLORS, TEST_TYPES, TAB_ICONS } from './config.js';
import { getMarking, getStatsByLevel, getAvailableWeekDays, escapeHtml, renderTappableSentence } from './utils.js';
import { getWordGroupBadges } from './render-relations.js';

// Dynamic font size for kanji display based on character count
function kanjiFontSize(text) {
  const len = [...(text || '')].length;
  if (len <= 2) return 'font-size:4rem;';
  if (len === 3) return 'font-size:3.2rem;';
  if (len === 4) return 'font-size:2.8rem;';
  if (len === 5) return 'font-size:2.4rem;';
  return 'font-size:2rem;'; // 6+ chars
}

// ===== WORD ALERT FORM =====

export function renderWordAlertForm(app) {
  if (!app.wordAlertTarget) return '';
  const { kanji, hiragana, meaning } = app.wordAlertTarget;
  
  const types = [
    { key: 'wrong_reading', icon: 'あ', label: 'Wrong Reading', desc: 'Hiragana is wrong' },
    { key: 'wrong_meaning', icon: '英', label: 'Wrong Meaning', desc: 'Meaning is wrong' },
    { key: 'bad_sentence', icon: '文', label: 'Bad Sentence', desc: 'Context/sentence issue' },
    { key: 'not_a_word', icon: '✕', label: 'Not a Word', desc: 'This is a sentence, not a word' },
  ];
  
  return `
    <div class="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" id="wordAlertOverlayBg">
      <div class="bg-slate-800 rounded-2xl p-5 w-full max-w-sm animate-slideIn border border-slate-600">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-white font-bold text-lg">\uD83D\uDEA9 Flag Word Issue</h3>
          <button id="closeWordAlertBtn" class="text-slate-400 hover:text-white text-xl">\u2715</button>
        </div>
        
        <div class="bg-slate-900 rounded-xl p-3 mb-4">
          <div class="flex items-center gap-3">
            <span class="text-2xl font-bold text-white">${kanji}</span>
            <span class="text-blue-400">${hiragana}</span>
          </div>
          <div class="text-amber-300 text-sm mt-1">${meaning}</div>
        </div>
        
        <div class="mb-4">
          <label class="text-slate-400 text-xs block mb-2">Issue Type</label>
          <div class="grid grid-cols-2 gap-2">
            ${types.map(t => `
              <button data-word-alert-type="${t.key}" class="p-2 rounded-lg text-center transition-all text-xs ${
                app.wordAlertType === t.key ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }">
                <div class="text-base mb-0.5">${t.icon}</div>
                <div class="font-bold">${t.label}</div>
                <div class="opacity-70 text-[10px]">${t.desc}</div>
              </button>
            `).join('')}
          </div>
        </div>
        
        <div class="mb-4">
          <label class="text-slate-400 text-xs block mb-2">Comment (what's wrong?)</label>
          <textarea id="wordAlertCommentInput" rows="3" placeholder="e.g. Reading should be すじがうかぶ not すじがうかぶ..."
            class="w-full bg-slate-900 text-white px-3 py-2 rounded-xl border border-slate-600 focus:border-red-500 focus:outline-none text-sm resize-none">${app.wordAlertComment || ''}</textarea>
        </div>
        
        <button id="submitWordAlertBtn" class="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 disabled:opacity-50" ${app.wordAlertSaving ? 'disabled' : ''}>
          ${app.wordAlertSaving ? 'Saving...' : '\uD83D\uDEA9 Submit Flag'}
        </button>
      </div>
    </div>
  `;
}

// ===== COMMON RENDERS =====

export function renderLoading() {
  return `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4">
          <span class="text-3xl font-bold">学</span>
        </div>
        <p class="text-white animate-pulse">Loading...</p>
      </div>
    </div>
  `;
}

export function renderLogin() {
  return `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <div class="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
            <span class="text-4xl font-bold">学</span>
          </div>
          <h1 class="text-2xl font-bold text-white mb-2">JLPT Vocabulary Master</h1>
          <p class="text-slate-400">Study - Review - Master</p>
        </div>
        
        <div class="bg-white rounded-2xl p-6 shadow-xl">
          <h2 class="text-lg font-semibold text-gray-800 mb-4 text-center">Sign in to start</h2>
          <button id="loginBtn" class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span class="font-medium text-gray-700">Continue with Google</span>
          </button>
          
          <div class="relative my-4">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-slate-500">or</span>
            </div>
          </div>
          
          <button id="guestModeBtn" class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl hover:bg-slate-200 transition-all">
            <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span class="font-medium text-slate-700">Continue as Guest</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderHeader(app) {
  const modeLabel = app.isGuestMode ? ' • Guest Mode' : '';
  const authDot = app.user 
    ? `<span class="text-emerald-400 text-[10px]">● ${app.user.email?.split('@')[0] || 'logged in'}</span>` 
    : '<span class="text-red-400 text-[10px]">● not logged in</span>';
  
  // Admin: show for known admin user ID OR guest mode (same person)
  const ADMIN_ID = 'd469efb7-f9e1-4b49-8b14-75a42b4d22e0';
  const isAdmin = app.user?.id === ADMIN_ID || app.isGuestMode;
  
  return `
    <header class="bg-slate-800 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white">
          <span class="text-lg font-bold">学</span>
        </div>
        <div>
          <h1 class="text-white font-bold">JLPT Vocabulary</h1>
          <p class="text-slate-400 text-xs">${app.vocabulary.length} words${app.syncing ? ' • Syncing...' : ''}${modeLabel} ${authDot}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        ${isAdmin ? `
          <a href="data-manager.html" id="adminBtn" class="text-amber-400 hover:text-amber-300 p-2 transition-colors" title="Data Manager (Admin)">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </a>
        ` : ''}
        <button id="signOutBtn" class="text-slate-400 hover:text-white p-2" title="${app.isGuestMode ? 'Exit Guest Mode' : 'Sign Out'}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      </div>
    </header>
  `;
}

export function renderTabs(currentTab) {
  const tabs = [
    { id: 'study', label: 'Study', icon: TAB_ICONS.study },
    { id: 'srs', label: 'SRS', icon: TAB_ICONS.srs },
    { id: 'stories', label: 'Stories', icon: TAB_ICONS.stories },
    { id: 'similar', label: 'Relations', icon: '\uD83D\uDD17' },
    { id: 'anime', label: 'Anime', icon: TAB_ICONS.anime, href: 'anime-reader.html' }
  ];
  
  return `
    <nav class="bg-slate-800 border-b border-slate-700 flex">
      ${tabs.map(t => t.href
        ? `<a href="${t.href}" class="flex-1 py-3 px-2 text-center transition-all text-slate-400 hover:text-white" style="text-decoration:none">
            <span class="text-lg">${t.icon}</span>
            <span class="text-xs block mt-1">${t.label}</span>
          </a>`
        : `<button data-tab="${t.id}" class="flex-1 py-3 px-2 text-center transition-all ${currentTab === t.id ? 'tab-active' : 'text-slate-400 hover:text-white'}">
            <span class="text-lg">${t.icon}</span>
            <span class="text-xs block mt-1">${t.label}</span>
          </button>`
      ).join('')}
    </nav>
  `;
}

export function renderStudySubTabs(currentSubTab) {
  const subTabs = [
    { id: 'goi', label: 'Goi' },
    { id: 'kanji', label: 'Kanji' },
    { id: 'self_study', label: 'Self Study' }
  ];
  
  return `
    <div class="bg-slate-700 px-4 py-2">
      <div class="flex gap-2 justify-center">
        ${subTabs.map(t => `
          <button data-study-subtab="${t.id}" class="px-5 py-2 rounded-full font-medium text-sm transition-all ${currentSubTab === t.id ? 'subtab-active' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}">
            ${t.label}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// ===== LEVEL SELECTOR =====

export function renderLevelSelector(app) {
  const levels = [
    { id: 'N1', bg: 'bg-rose-500', chipBg: 'bg-rose-100 text-rose-700', border: 'border-rose-400', words: app.vocabulary.filter(v => v.level === 'N1').length },
    { id: 'N2', bg: 'bg-amber-500', chipBg: 'bg-amber-100 text-amber-700', border: 'border-amber-400', words: app.vocabulary.filter(v => v.level === 'N2').length },
    { id: 'N3', bg: 'bg-emerald-500', chipBg: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-400', words: app.vocabulary.filter(v => v.level === 'N3').length },
  ];
  const isAll = app.studyMode === 'all';
  const total = Object.values(app.studyLevelCounts).reduce((a, b) => a + b, 0);
  const presets = [5, 10, 15, 20, 30];
  
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <div class="max-w-md mx-auto">
        
        <!-- Test Type -->
        <div class="bg-slate-800 rounded-xl p-4 mb-4">
          <h3 class="text-sm text-slate-400 mb-3">Test Type</h3>
          <div class="grid grid-cols-3 gap-2">
            ${Object.entries(TEST_TYPES).map(([key, t]) => `
              <button data-test-type="${key}" class="p-3 rounded-xl text-center transition-all ${app.selectedTestType === key ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
                <span class="text-xl block mb-1">${t.icon}</span>
                <span class="text-xs">${t.label.split(' ')[0]}</span>
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Mode Toggle -->
        <div class="bg-slate-800 rounded-2xl p-1.5 flex gap-1.5 mb-4">
          <button data-study-mode="all" class="flex-1 py-3 rounded-xl font-bold text-sm transition-all ${isAll ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}">
            \u26A1 All Equal
          </button>
          <button data-study-mode="custom" class="flex-1 py-3 rounded-xl font-bold text-sm transition-all ${!isAll ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}">
            \uD83C\uDFDB Custom
          </button>
        </div>
        
        ${isAll ? `
        <!-- ALL MODE: Preset Chips -->
        <div class="bg-slate-800 rounded-xl p-3 mb-3">
          <div class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Words per level</div>
          <div class="flex gap-2">
            ${presets.map(n => `
              <button data-study-preset="${n}" class="flex-1 py-2.5 rounded-xl font-bold text-base transition-all ${
                app.studyPreset === n 
                  ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-400' 
                  : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500'
              }">${n}</button>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <!-- Level Cards -->
        <div class="space-y-2.5 mb-4">
          ${levels.map(l => `
            <div class="bg-slate-800 rounded-xl p-3.5 flex items-center gap-3 border border-slate-700">
              <div class="w-12 h-12 ${l.bg} rounded-xl flex items-center justify-center text-white font-extrabold text-base flex-shrink-0 shadow-lg">${l.id}</div>
              <div class="flex-1">
                <div class="text-white font-bold text-base">JLPT ${l.id}</div>
                <div class="text-slate-500 text-xs">${l.words} words</div>
              </div>
              ${isAll ? `
                <div class="bg-slate-900 rounded-xl px-4 py-2.5 min-w-[52px] text-center">
                  <span class="text-white font-extrabold text-xl">${app.studyLevelCounts[l.id]}</span>
                </div>
              ` : `
                <div class="flex flex-col items-end gap-1.5">
                  <div class="flex gap-1">
                    ${[0, 5, 10, 15, 20].map(n => `
                      <button data-study-level-chip="${l.id}" data-study-level-val="${n}" class="w-7 h-6 rounded-md font-bold text-xs transition-all ${
                        app.studyLevelCounts[l.id] === n ? l.bg + ' text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }">${n}</button>
                    `).join('')}
                  </div>
                  <input type="number" id="studyLevel${l.id}" min="0" max="${l.words}" value="${app.studyLevelCounts[l.id]}" 
                    class="w-16 p-1.5 rounded-lg border-2 ${l.border} bg-slate-900 text-white font-extrabold text-lg text-center focus:outline-none">
                </div>
              `}
            </div>
          `).join('')}
        </div>
        
        <!-- Start Button -->
        <button id="startStudyQuickBtn" class="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
          total === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 shadow-lg'
        }" ${total === 0 ? 'disabled' : ''}>
          \u25B6 Start Study
          <span class="bg-white/20 rounded-lg px-2.5 py-0.5 text-sm">${total} words</span>
        </button>
        
        <!-- Browse by Chapter link -->
        <div class="text-center mt-4">
          <p class="text-slate-500 text-xs mb-2">Or browse by chapter:</p>
          <div class="flex gap-2 justify-center">
            ${levels.map(l => `
              <button data-level="${l.id}" class="px-4 py-2 rounded-lg ${l.bg} text-white text-sm font-bold hover:opacity-80 transition-all">${l.id}</button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===== WEEK/DAY SELECTOR =====

export function renderWeekDaySelector(app) {
  const stats = getStatsByLevel(app.vocabulary, app.markings, app.selectedLevel, app.markingCategories);
  const weekDays = getAvailableWeekDays(app.vocabulary, app.selectedLevel);
  const levelColor = LEVEL_COLORS[app.selectedLevel] || LEVEL_COLORS['ALL'];
  
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <div class="max-w-lg mx-auto">
        <div class="flex items-center gap-3 mb-6">
          <button id="backToLevelBtn" class="text-white hover:bg-slate-700 p-2 rounded-lg">← Back</button>
          <div class="w-12 h-12 ${levelColor.bg} rounded-xl flex items-center justify-center text-white font-bold">
            ${app.selectedLevel === 'ALL' ? 'ALL' : app.selectedLevel}
          </div>
          <div>
            <h1 class="text-lg font-bold text-white">${app.selectedLevel === 'ALL' ? 'All Levels' : app.selectedLevel} Study</h1>
            <p class="text-slate-400 text-sm">${stats.total} words</p>
          </div>
        </div>
        
        <!-- Test Type -->
        <div class="bg-slate-800 rounded-xl p-4 mb-4">
          <h3 class="text-sm text-slate-400 mb-3">Test Type</h3>
          <div class="grid grid-cols-3 gap-2">
            ${Object.entries(TEST_TYPES).map(([key, t]) => `
              <button data-test-type="${key}" class="p-3 rounded-xl text-center transition-all ${app.selectedTestType === key ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
                <span class="text-xl block mb-1">${t.icon}</span>
                <span class="text-xs">${t.label.split(' ')[0]}</span>
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Category Filter -->
        <div class="bg-slate-800 rounded-xl p-4 mb-4">
          <h3 class="text-sm text-slate-400 mb-3">Filter by Category</h3>
          <div class="flex flex-wrap gap-2 justify-center">
            ${Object.entries(app.markingCategories).map(([k, v]) => `
              <button data-category="${k}" class="category-btn flex flex-col items-center p-2 rounded-xl min-w-[50px] ${app.selectedCategory === parseInt(k) ? v.color + ' text-white' : 'bg-slate-700 text-slate-300'}">
                <span class="text-lg">${v.icon}</span>
                <span class="text-xs mt-1">${stats[k] || 0}</span>
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Week/Day Select -->
        <div class="bg-white rounded-xl p-4 shadow-lg">
          <h3 class="text-sm text-slate-600 mb-3">Select Chapter</h3>
          <select id="weekDaySelect" class="w-full p-3 border rounded-xl bg-white text-gray-800">
            <option value="">All ${app.selectedLevel === 'ALL' ? '' : app.selectedLevel + ' '}Words (${stats.total})</option>
            ${weekDays.map(wd => `<option value="${wd.label}">${wd.label} (${wd.count} words)</option>`).join('')}
          </select>
          
          <!-- Word Limit -->
          <div class="mt-4 p-3 bg-slate-50 rounded-xl">
            <div class="flex items-center justify-between mb-2">
              <div>
                <div class="text-sm font-medium text-gray-700">Word Limit</div>
                <div class="text-xs text-gray-400">0 = all words</div>
              </div>
              <input type="number" id="studyWordLimit" min="0" max="${stats.total}" value="${app.studyWordLimit || 0}" 
                class="w-20 p-2 text-center border-2 border-slate-300 rounded-lg font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="0">
            </div>
            <div class="flex gap-1.5 flex-wrap">
              ${[0,5,10,15,20,30,50].map(n => `<button data-study-limit-chip="${n}" class="px-3 py-1.5 text-xs font-bold rounded-lg ${(app.studyWordLimit || 0) === n ? 'bg-emerald-500 text-white' : 'bg-white text-gray-600 hover:bg-emerald-100'} border transition-all">${n === 0 ? 'All' : n}</button>`).join('')}
            </div>
          </div>
          
          <button id="startStudyBtn" class="w-full mt-4 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all">
            Start Study
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===== WORD LIST =====

export function renderWordList(app) {
  let words = app.selectedLevel === 'ALL' ? app.vocabulary : app.vocabulary.filter(v => v.level === app.selectedLevel);
  if (app.selectedWeekDay) words = words.filter(w => w.weekDayLabel === app.selectedWeekDay);
  if (app.selectedCategory !== null) words = words.filter(w => getMarking(app.markings, w) === app.selectedCategory);
  
  const catInfo = app.selectedCategory !== null ? app.markingCategories[app.selectedCategory] : { label: 'All', icon: '📋', color: 'bg-slate-500' };
  
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-slate-800 p-4 border-b border-slate-700">
        <div class="flex items-center gap-3">
          <button id="backToWeekDayBtn" class="text-white hover:bg-slate-700 p-2 rounded-lg">← Back</button>
          <div>
            <h2 class="text-white font-bold">${catInfo.label}</h2>
            <p class="text-slate-400 text-sm">${words.length} words</p>
          </div>
        </div>
      </div>
      
      ${words.length > 0 ? `
        <div class="bg-slate-800 px-4 py-3 border-b border-slate-700">
          <button id="studyFilteredBtn" class="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600">
            Study These ${words.length} Words
          </button>
        </div>
      ` : ''}
      
      <div class="flex-1 overflow-auto hide-scrollbar p-4">
        ${words.length === 0 ? `
          <div class="text-center py-12">
            <p class="text-2xl text-slate-500 mb-2">${catInfo.icon}</p>
            <p class="text-slate-400">No words in this category</p>
          </div>
        ` : `
          <div class="space-y-2">
            ${words.map(w => {
              const m = getMarking(app.markings, w);
              const mInfo = app.markingCategories[m];
              const kanjiEsc = escapeHtml(w.kanji || w.raw);
              return `
                <div class="bg-white rounded-xl p-4 shadow ${mInfo.border} border-l-4">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-xl font-bold text-gray-800">${w.kanji || w.raw}</span>
                        <span class="text-gray-500">${w.hiragana || ''}</span>
                        <button data-open-story="${kanjiEsc}" data-story-hiragana="${w.hiragana || ''}" data-story-meaning="${escapeHtml(w.meaning)}" class="text-purple-500 hover:text-purple-700 text-xs px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200">📖</button>
                        <button data-flag-word="${kanjiEsc}" data-flag-word-hiragana="${w.hiragana || ''}" data-flag-word-meaning="${escapeHtml(w.meaning)}" class="text-red-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded bg-red-50 border border-red-200">🚩</button>
                      </div>
                      <p class="text-sm text-gray-600 truncate">${w.meaning}</p>
                    </div>
                    <div class="flex gap-1 ml-2">
                      ${Object.entries(app.markingCategories).map(([k, v]) => `
                        <button data-mark-kanji="${kanjiEsc}" data-mark-value="${m === parseInt(k) ? 0 : parseInt(k)}" 
                          class="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${m === parseInt(k) ? v.color + ' text-white ring-2 ring-gray-400' : 'bg-gray-100 hover:bg-gray-200'}">
                          ${v.icon}
                        </button>
                      `).join('')}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// ===== FLASHCARD =====

export function renderFlashcard(app) {
  if (app.studyWords.length === 0) {
    return `
      <div class="flex-1 flex items-center justify-center p-4">
        <div class="text-center">
          <p class="text-2xl text-white mb-4">No words found</p>
          <button id="backToWeekDayBtn" class="px-6 py-3 bg-slate-700 text-white rounded-xl">← Back</button>
        </div>
      </div>
    `;
  }
  
  const word = app.studyWords[app.currentIndex];
  const marking = getMarking(app.markings, word);
  const markInfo = app.markingCategories[marking] || app.markingCategories[0];
  const levelColor = LEVEL_COLORS[word.level] || LEVEL_COLORS['ALL'];
  const kanjiEsc = escapeHtml(word.kanji || word.raw);
  
  let ctxBefore = word.sentence_before || word.supporting_word_1 || '';
  let ctxAfter = word.sentence_after || word.supporting_word_2 || '';
  
  // Live fallback: check kanjiSentenceMap if no pre-enriched context
  // This catches sentences linked/rated during the current study session
  if (!ctxBefore && !ctxAfter && app.kanjiSentenceMap && app.kanjiWords) {
    const kanji = word.kanji || word.raw || '';
    // Resolve unified word ID
    let uid = (word.id && app.kanjiWords.some(kw => kw.id === word.id)) ? word.id : null;
    if (!uid) { const match = app.kanjiWords.find(w => w.kanji === kanji); uid = match?.id; }
    const sentences = uid ? app.kanjiSentenceMap[uid] : null;
    if (sentences && sentences.length > 0) {
      const best = sentences[0];
      const sentText = best.sentence || '';
      const idx = sentText.indexOf(kanji);
      if (idx >= 0) {
        ctxBefore = sentText.substring(0, idx);
        ctxAfter = sentText.substring(idx + kanji.length);
      }
    }
  }
  
  const hasContext = ctxBefore || ctxAfter;
  
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <button id="backToWeekDayBtn" class="text-white hover:bg-slate-700 px-3 py-2 rounded-lg">← Back</button>
        <div class="text-center">
          <div class="flex items-center justify-center gap-2">
            <span class="px-2 py-1 ${levelColor.bg} text-white text-xs rounded font-bold">${word.level || 'Self'}</span>
            <span class="text-emerald-400 font-bold">${word.weekDayLabel || ''}</span>
          </div>
          <span class="text-slate-400 text-sm">${app.currentIndex + 1} / ${app.studyWords.length}</span>
        </div>
        <div class="w-10 h-10 ${markInfo.color} rounded-lg flex items-center justify-center">
          <span class="text-white text-lg">${markInfo.icon}</span>
        </div>
      </div>
      
      <!-- Test Type Selector -->
      <div class="bg-slate-800 px-4 py-2 border-b border-slate-700">
        <div class="flex justify-center gap-2">
          ${Object.entries(TEST_TYPES).map(([key, t]) => `
            <button data-test-type="${key}" class="px-3 py-1 rounded-lg text-sm transition-all ${app.selectedTestType === key ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
              ${t.icon} ${t.label.split(' ')[0]}
            </button>
          `).join('')}
        </div>
      </div>
      
      <!-- Card Content -->
      <div class="flex-1 flex flex-col items-center justify-start p-4 overflow-auto">
        <div class="w-full max-w-2xl">
          ${renderFlashcardContent(app, word, hasContext, ctxBefore, ctxAfter)}
          
          <!-- Story + Add Sentence + Flag Buttons -->
          <div class="flex gap-2 mb-3">
            <button data-open-story="${kanjiEsc}" data-story-hiragana="${word.hiragana || ''}" data-story-meaning="${escapeHtml(word.meaning)}" 
              class="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all story-btn hover:opacity-80">
              📖 Kanji Story
            </button>
            <button id="openAddSentenceSheetBtn" 
              class="px-4 py-3 rounded-xl font-semibold flex items-center justify-center transition-all bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20">
              ✏️
            </button>
            <button data-flag-word="${kanjiEsc}" data-flag-word-hiragana="${word.hiragana || ''}" data-flag-word-meaning="${escapeHtml(word.meaning)}"
              class="px-4 py-3 rounded-xl font-semibold flex items-center justify-center transition-all bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20">
              🚩
            </button>
          </div>
          
          <!-- Marking Buttons -->
          <div class="bg-slate-800 rounded-xl p-3 mb-4">
            <p class="text-slate-400 text-xs text-center mb-2">Change Rating</p>
            <div class="flex justify-center gap-2">
              ${Object.entries(app.markingCategories).map(([k, v]) => `
                <button data-mark-kanji="${kanjiEsc}" data-mark-value="${marking === parseInt(k) ? 0 : parseInt(k)}" 
                  class="w-10 h-10 rounded-xl flex items-center justify-center transition-all ${marking === parseInt(k) ? v.color + ' text-white ring-2 ring-white scale-110' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}">
                  <span class="text-base">${v.icon}</span>
                </button>
              `).join('')}
            </div>
          </div>
          
          <!-- Navigation -->
          <div class="flex gap-3">
            <button id="prevWordBtn" class="flex-1 py-4 bg-slate-700 text-white rounded-xl hover:bg-slate-600 disabled:opacity-50" ${app.currentIndex === 0 ? 'disabled' : ''}>← Prev</button>
            <button id="randomWordBtn" class="px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-500">🎲</button>
            <button id="nextWordBtn" class="flex-1 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 disabled:opacity-50" ${app.currentIndex >= app.studyWords.length - 1 ? 'disabled' : ''}>Next →</button>
          </div>
          
          <!-- Progress -->
          <div class="mt-4 bg-slate-700 rounded-full h-2 overflow-hidden">
            <div class="bg-emerald-500 h-full transition-all" style="width: ${((app.currentIndex + 1) / app.studyWords.length) * 100}%"></div>
          </div>
          
          <!-- Extra content slot (sentence panel, etc.) -->
          <div id="flashcardExtraContent"></div>
        </div>
      </div>
    </div>
  `;
}

function renderFlashcardContent(app, word, hasContext, ctxBefore, ctxAfter) {
  const type = app.selectedTestType;
  
  // Build tappable versions of context for tap-to-save
  const wordKanji = word.kanji || word.raw || '';
  // PERF: Use pre-built set from app instead of rebuilding per render
  const knownKanjiSet = app.knownKanjiSet || new Set();
  const tappableBefore = ctxBefore ? renderTappableSentence(ctxBefore, wordKanji, knownKanjiSet) : '';
  const tappableAfter = ctxAfter ? renderTappableSentence(ctxAfter, wordKanji, knownKanjiSet) : '';
  
  // Badge HTML for word group relations (rendered inside sentence box on yellow bg)
  const badges = getWordGroupBadges(app, word);
  const badgeHtml = badges.length > 0
    ? `<div class="badge-row">${badges.map(b => `
        <button data-view-group="${b.group.id}" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
          style="background:${b.info.hex}; color:white; border:none; opacity:0.85;">
          ${b.info.icon} ${b.memberCount} ${b.info.label.toLowerCase()}
        </button>
      `).join('')}</div>`
    : '';
  
  if (type === 'kanji') {
    // Kanji Recognition: Kanji → Hint → Context → Hiragana → Meaning
    return `
      <!-- Sentence Box: Kanji always visible, context grows in -->
      <div class="sentence-box rounded-2xl p-6 mb-4">
        ${badgeHtml}
        <p class="text-center leading-relaxed">
          ${app.revealStep >= 2 && tappableBefore ? `<span class="context-text sentence-tappable">${tappableBefore}</span>` : ''}
          <span class="kanji-highlight mx-1" style="${kanjiFontSize(word.kanji || word.raw)}">${word.kanji || word.raw}</span>
          ${app.revealStep >= 2 && tappableAfter ? `<span class="context-text sentence-tappable">${tappableAfter}</span>` : ''}
        </p>
      </div>
      
      <!-- Reveal Box (tappable) -->
      <div class="reveal-box rounded-2xl shadow-xl overflow-hidden mb-4 cursor-pointer" id="revealBox">
        <div class="p-6 text-center min-h-[180px] flex flex-col items-center justify-center">
          ${app.revealStep >= 1 && word.hint ? `<p class="hint-text mb-3 animate-fadeIn">\uD83D\uDCA1 ${word.hint}</p>` : ''}
          ${app.revealStep >= 2 && hasContext ? `<p class="text-slate-400 text-sm mb-3 animate-fadeIn">\uD83D\uDCDD Supporting words shown above</p>` : ''}
          ${app.revealStep >= 3 ? `<p class="text-2xl text-blue-600 mb-3 animate-fadeIn">${word.hiragana || ''}</p>` : ''}
          ${app.revealStep >= 4 ? `<p class="text-xl text-emerald-700 font-medium animate-fadeIn">${word.meaning}</p>` : ''}
          ${app.revealStep < 4 ? `
            <p class="text-slate-400 text-sm mt-4">
              \uD83D\uDC46 Tap to reveal ${app.revealStep === 0 ? 'hint' : app.revealStep === 1 ? 'context' : app.revealStep === 2 ? 'reading' : 'meaning'}
            </p>
          ` : ''}
        </div>
      </div>
    `;
  } else if (type === 'reading') {
    // Reading Recognition: Hiragana+Meaning → Hint → Context → Kanji
    return `
      <!-- Sentence Box: Hiragana + Meaning always visible -->
      <div class="sentence-box rounded-2xl p-6 mb-4">
        ${badgeHtml}
        <p class="reading-display text-blue-700 font-bold mb-2">${word.hiragana || ''}</p>
        <p class="meaning-display text-amber-800">${word.meaning}</p>
        ${app.revealStep >= 2 && hasContext ? `
          <div class="mt-3 text-center animate-fadeIn">
            <span class="context-text sentence-tappable">${tappableBefore}</span>
            <span class="text-red-500 font-bold mx-1">\uFF1F</span>
            <span class="context-text sentence-tappable">${tappableAfter}</span>
          </div>
        ` : ''}
      </div>
      
      <!-- Reveal Box (tappable) -->
      <div class="reveal-box rounded-2xl shadow-xl overflow-hidden mb-4 cursor-pointer" id="revealBox">
        <div class="p-6 text-center min-h-[180px] flex flex-col items-center justify-center">
          ${app.revealStep >= 1 && word.hint ? `<p class="hint-text mb-3 animate-fadeIn">\uD83D\uDCA1 ${word.hint}</p>` : ''}
          ${app.revealStep >= 2 && hasContext ? `<p class="text-slate-400 text-sm mb-3 animate-fadeIn">\uD83D\uDCDD Supporting words shown above</p>` : ''}
          ${app.revealStep >= 3 ? `<p class="kanji-highlight animate-fadeIn" style="${kanjiFontSize(word.kanji || word.raw)}">${word.kanji || word.raw}</p>` : ''}
          ${app.revealStep < 3 ? `
            <p class="text-slate-400 text-sm mt-4">
              \uD83D\uDC46 Tap to reveal ${app.revealStep === 0 ? 'hint' : app.revealStep === 1 ? 'context' : 'kanji'}
            </p>
          ` : ''}
        </div>
      </div>
    `;
  } else {
    // Writing Test: Meaning → Canvas → Hint → Context → Hiragana → Kanji
    return `
      <!-- Sentence Box: Meaning always visible -->
      <div class="sentence-box rounded-2xl p-6 mb-4">
        ${badgeHtml}
        <p class="meaning-display text-amber-800 font-bold text-center">${word.meaning}</p>
      </div>
      
      <!-- Writing Canvas -->
      <div class="canvas-container mb-4">
        <canvas id="writingCanvas" width="400" height="200" class="w-full bg-white rounded-xl"></canvas>
        <div class="canvas-controls">
          <button id="clearCanvasBtn" class="px-3 py-1 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-500">Clear</button>
        </div>
        <div class="absolute bottom-2 left-3 text-slate-400 text-xs">\u270D\uFE0F Draw kanji here</div>
      </div>
      
      <!-- Reveal Box (tappable) -->
      <div class="reveal-box rounded-2xl shadow-xl overflow-hidden mb-4 cursor-pointer" id="revealBox">
        <div class="p-6 text-center min-h-[180px] flex flex-col items-center justify-center">
          ${app.revealStep >= 1 && word.hint ? `<p class="hint-text mb-3 animate-fadeIn">\uD83D\uDCA1 ${word.hint}</p>` : ''}
          ${app.revealStep >= 2 && hasContext ? `
            <div class="mb-3 animate-fadeIn">
              <span class="context-text sentence-tappable">${tappableBefore}</span>
              <span class="text-red-500 font-bold mx-1">\uFF1F</span>
              <span class="context-text sentence-tappable">${tappableAfter}</span>
            </div>
          ` : ''}
          ${app.revealStep >= 3 ? `<p class="text-2xl text-blue-600 mb-3 animate-fadeIn">${word.hiragana || ''}</p>` : ''}
          ${app.revealStep >= 4 ? `<p class="kanji-highlight animate-fadeIn" style="${kanjiFontSize(word.kanji || word.raw)}">${word.kanji || word.raw}</p>` : ''}
          ${app.revealStep < 4 ? `
            <p class="text-slate-400 text-sm mt-4">
              \uD83D\uDC46 Tap to reveal ${app.revealStep === 0 ? 'hint' : app.revealStep === 1 ? 'context' : app.revealStep === 2 ? 'reading' : 'kanji'}
            </p>
          ` : ''}
        </div>
      </div>
    `;
  }
}

// ===== KANJI PLACEHOLDER =====

export function renderKanjiPlaceholder() {
  return `
    <div class="flex-1 flex items-center justify-center p-4">
      <div class="text-center max-w-md">
        <div class="text-6xl mb-4">🚧</div>
        <h2 class="text-xl font-bold text-white mb-2">Kanji Section Coming Soon</h2>
        <p class="text-slate-400 mb-4">The Kanji database with 9,397 words from your textbooks is ready to be connected.</p>
        <div class="bg-slate-800 rounded-xl p-4 text-left">
          <p class="text-slate-300 text-sm mb-2">Available Books:</p>
          <ul class="text-slate-400 text-sm space-y-1">
            <li>• Kanji Master N3 (210 words)</li>
            <li>• Kanji Diploma N3 (2,060 words)</li>
            <li>• Manabou N2 (600 words)</li>
            <li>• Kanji Diploma N2 (6,527 words)</li>
          </ul>
        </div>
      </div>
    </div>
  `;
}

// ===== SELF STUDY =====

export function renderSelfStudyTopics(app) {
  return `
    <div class="flex-1 overflow-auto hide-scrollbar p-4">
      <div class="max-w-md mx-auto pt-4 animate-fadeIn">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-xl font-bold text-white">My Topics</h1>
            <p class="text-slate-400 text-sm">Custom vocabulary collections</p>
          </div>
          <button id="addTopicBtn" class="bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-600 flex items-center gap-2">
            <span>+</span> Add Topic
          </button>
        </div>
        
        ${app.selfStudyTopics.length === 0 ? `
          <div class="text-center py-12">
            <div class="text-6xl mb-4">📝</div>
            <p class="text-slate-400 mb-2">No topics yet</p>
            <p class="text-slate-500 text-sm">Create your first topic to start adding vocabulary!</p>
          </div>
        ` : `
          <div class="space-y-3">
            ${app.selfStudyTopics.map(topic => {
              const wordCount = app.selfStudyWords.filter(w => w.topic_id === topic.id).length;
              return `
                <button data-topic-id="${topic.id}" class="w-full p-4 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all text-left group">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl">${topic.topic_icon || '📚'}</div>
                      <div>
                        <h3 class="text-base font-bold text-gray-800">${topic.topic_name}</h3>
                        <p class="text-gray-500 text-sm">${wordCount} words</p>
                      </div>
                    </div>
                    <span class="text-xl text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

export function renderSelfStudyWordList(app) {
  const words = app.selfStudyWords.filter(w => w.topic_id === app.selectedTopic.id);
  
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-slate-800 p-4">
        <div class="flex items-center gap-3 mb-4">
          <button id="backToTopicsBtn" class="text-white hover:bg-slate-700 p-2 rounded-lg">← Back</button>
          <div class="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-xl">${app.selectedTopic.topic_icon || '📚'}</div>
          <div>
            <h2 class="text-white font-bold">${app.selectedTopic.topic_name}</h2>
            <p class="text-slate-400 text-sm">${words.length} words</p>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button id="addWordBtn" class="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600">+ Add Word</button>
          ${words.length > 0 ? `<button id="startSelfStudyBtn" class="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600">▶ Study</button>` : ''}
        </div>
      </div>
      
      <div class="flex-1 overflow-auto hide-scrollbar p-4">
        ${words.length === 0 ? `
          <div class="text-center py-12">
            <div class="text-4xl mb-2">📝</div>
            <p class="text-slate-400">No words yet</p>
            <p class="text-slate-500 text-sm">Add your first word!</p>
          </div>
        ` : `
          <div class="space-y-2">
            ${words.map(w => `
              <div class="bg-white rounded-xl p-4 shadow border-l-4 border-blue-400">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xl font-bold text-gray-800">${w.kanji}</span>
                      <span class="text-gray-500">${w.hiragana || ''}</span>
                    </div>
                    <p class="text-sm text-gray-600">${w.meaning_en || ''}</p>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}
