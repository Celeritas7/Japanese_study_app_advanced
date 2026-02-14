// JLPT Vocabulary Master - Render Functions (Study Tab)

import { LEVEL_COLORS, MARKING_CATEGORIES, TEST_TYPES, TAB_ICONS } from './config.js';
import { getMarking, getStatsByLevel, getAvailableWeekDays, escapeHtml } from './utils.js';

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
        </div>
      </div>
    </div>
  `;
}

export function renderHeader(app) {
  return `
    <header class="bg-slate-800 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white">
          <span class="text-lg font-bold">学</span>
        </div>
        <div>
          <h1 class="text-white font-bold">JLPT Vocabulary</h1>
          <p class="text-slate-400 text-xs">${app.vocabulary.length} words${app.syncing ? ' • Syncing...' : ''}</p>
        </div>
      </div>
      <button id="signOutBtn" class="text-slate-400 hover:text-white p-2" title="Sign Out">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
      </button>
    </header>
  `;
}

export function renderTabs(currentTab) {
  const tabs = [
    { id: 'study', label: 'Study', icon: TAB_ICONS.study },
    { id: 'srs', label: 'SRS Review', icon: TAB_ICONS.srs },
    { id: 'stories', label: 'Stories', icon: TAB_ICONS.stories },
    { id: 'similar', label: 'Similar', icon: TAB_ICONS.similar }
  ];
  
  return `
    <nav class="bg-slate-800 border-b border-slate-700 flex">
      ${tabs.map(t => `
        <button data-tab="${t.id}" class="flex-1 py-3 px-2 text-center transition-all ${currentTab === t.id ? 'tab-active' : 'text-slate-400 hover:text-white'}">
          <span class="text-lg">${t.icon}</span>
          <span class="text-xs block mt-1">${t.label}</span>
        </button>
      `).join('')}
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
  const levels = ['N1', 'N2', 'N3'];
  
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <div class="max-w-md mx-auto pt-4">
        <div class="text-center mb-6">
          <h1 class="text-xl font-bold text-white mb-1">Select Level</h1>
          <p class="text-slate-400 text-sm">${app.vocabulary.length} total words</p>
        </div>
        
        <div class="space-y-3">
          ${levels.map(level => {
            const stats = getStatsByLevel(app.vocabulary, app.markings, level);
            const color = LEVEL_COLORS[level];
            return `
              <button data-level="${level}" class="w-full p-5 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all text-left group">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 ${color.bg} rounded-xl flex items-center justify-center text-white text-xl font-bold">${level}</div>
                    <div>
                      <h3 class="text-lg font-bold text-gray-800">JLPT ${level}</h3>
                      <p class="text-gray-500 text-sm">${stats.total} words</p>
                    </div>
                  </div>
                  <span class="text-2xl text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            `;
          }).join('')}
          
          <button data-level="ALL" class="w-full p-5 bg-slate-700 rounded-2xl shadow-lg hover:shadow-xl transition-all text-left group">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-14 h-14 bg-slate-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">ALL</div>
                <div>
                  <h3 class="text-lg font-bold text-white">All Levels</h3>
                  <p class="text-slate-400 text-sm">${app.vocabulary.length} words</p>
                </div>
              </div>
              <span class="text-2xl text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===== WEEK/DAY SELECTOR =====

export function renderWeekDaySelector(app) {
  const stats = getStatsByLevel(app.vocabulary, app.markings, app.selectedLevel);
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
            ${Object.entries(MARKING_CATEGORIES).map(([k, v]) => `
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
  
  const catInfo = app.selectedCategory !== null ? MARKING_CATEGORIES[app.selectedCategory] : { label: 'All', icon: '📋', color: 'bg-slate-500' };
  
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
              const mInfo = MARKING_CATEGORIES[m];
              const kanjiEsc = escapeHtml(w.kanji || w.raw);
              return `
                <div class="bg-white rounded-xl p-4 shadow ${mInfo.border} border-l-4">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-xl font-bold text-gray-800">${w.kanji || w.raw}</span>
                        <span class="text-gray-500">${w.hiragana || ''}</span>
                      </div>
                      <p class="text-sm text-gray-600 truncate">${w.meaning}</p>
                    </div>
                    <div class="flex gap-1 ml-2">
                      ${Object.entries(MARKING_CATEGORIES).map(([k, v]) => `
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
  const markInfo = MARKING_CATEGORIES[marking] || MARKING_CATEGORIES[0];
  const levelColor = LEVEL_COLORS[word.level] || LEVEL_COLORS['ALL'];
  const kanjiEsc = escapeHtml(word.kanji || word.raw);
  
  const ctxBefore = word.sentence_before || word.supporting_word_1 || '';
  const ctxAfter = word.sentence_after || word.supporting_word_2 || '';
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
          
          <!-- Marking Buttons -->
          <div class="bg-slate-800 rounded-xl p-3 mb-4">
            <p class="text-slate-400 text-xs text-center mb-2">Change Rating</p>
            <div class="flex justify-center gap-2">
              ${Object.entries(MARKING_CATEGORIES).map(([k, v]) => `
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
        </div>
      </div>
    </div>
  `;
}

function renderFlashcardContent(app, word, hasContext, ctxBefore, ctxAfter) {
  const type = app.selectedTestType;
  
  if (type === 'kanji') {
    return `
      <div class="sentence-box rounded-2xl p-6 mb-4 text-center">
        <p class="kanji-highlight mb-2">${word.kanji || word.raw}</p>
        ${app.revealStep >= 1 ? `<p class="hint-text mb-2">Hint: ${word.hint || 'No hint'}</p>` : ''}
        ${app.revealStep >= 2 && hasContext ? `<p class="context-text">${ctxBefore}<span class="font-bold text-red-600">${word.kanji || word.raw}</span>${ctxAfter}</p>` : ''}
        ${app.revealStep >= 3 ? `<p class="reading-display text-blue-600 mt-3">${word.hiragana || ''}</p>` : ''}
        ${app.revealStep >= 4 ? `<p class="meaning-display text-amber-800 mt-2">${word.meaning}</p>` : ''}
      </div>
      ${app.revealStep < 4 ? `
        <button id="revealNextBtn" class="w-full py-4 bg-blue-500 text-white font-bold rounded-xl mb-4 hover:bg-blue-600">
          Reveal ${['Hint', 'Context', 'Reading', 'Meaning'][app.revealStep]} →
        </button>
      ` : ''}
    `;
  } else if (type === 'reading') {
    return `
      <div class="sentence-box rounded-2xl p-6 mb-4 text-center">
        <p class="reading-display text-blue-600 mb-2">${word.hiragana || ''}</p>
        <p class="meaning-display text-amber-800 mb-3">${word.meaning}</p>
        ${app.revealStep >= 1 ? `<p class="hint-text mb-2">Hint: ${word.hint || 'No hint'}</p>` : ''}
        ${app.revealStep >= 2 && hasContext ? `<p class="context-text">${ctxBefore}<span class="font-bold">___</span>${ctxAfter}</p>` : ''}
        ${app.revealStep >= 3 ? `<p class="kanji-highlight mt-3">${word.kanji || word.raw}</p>` : ''}
      </div>
      ${app.revealStep < 3 ? `
        <button id="revealNextBtn" class="w-full py-4 bg-blue-500 text-white font-bold rounded-xl mb-4 hover:bg-blue-600">
          Reveal ${['Hint', 'Context', 'Kanji'][app.revealStep]} →
        </button>
      ` : ''}
    `;
  } else {
    // Writing test
    return `
      <div class="sentence-box rounded-2xl p-6 mb-4 text-center">
        <p class="meaning-display text-amber-800 mb-3">${word.meaning}</p>
        ${app.revealStep >= 1 ? `<p class="hint-text mb-2">Hint: ${word.hint || 'No hint'}</p>` : ''}
        ${app.revealStep >= 2 && hasContext ? `<p class="context-text">${ctxBefore}<span class="font-bold">___</span>${ctxAfter}</p>` : ''}
      </div>
      
      <div class="canvas-container mb-4">
        <canvas id="writingCanvas" width="400" height="200" class="w-full bg-white rounded-xl"></canvas>
        <div class="canvas-controls">
          <button id="clearCanvasBtn" class="px-3 py-1 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-500">Clear</button>
        </div>
      </div>
      
      ${app.revealStep >= 3 ? `
        <div class="bg-white rounded-xl p-4 mb-4 text-center">
          <p class="reading-display text-blue-600 mb-1">${word.hiragana || ''}</p>
          <p class="kanji-highlight">${word.kanji || word.raw}</p>
        </div>
      ` : `
        <button id="revealNextBtn" class="w-full py-4 bg-blue-500 text-white font-bold rounded-xl mb-4 hover:bg-blue-600">
          Reveal ${['Hint', 'Context', 'Answer'][app.revealStep]} →
        </button>
      `}
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
