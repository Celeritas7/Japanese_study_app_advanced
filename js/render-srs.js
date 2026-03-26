// JLPT Vocabulary Master - SRS Tab Render Functions

import { LEVEL_COLORS } from './config.js';
import { getMarking, escapeHtml } from './utils.js';

export function renderSRSTab(app) {
  switch (app.srsView) {
    case 'setup': return renderSRSSetup(app);
    case 'test': return renderSRSTest(app);
    case 'results': return renderSRSResults(app);
    default: return renderSRSSetup(app);
  }
}

function renderSRSSetup(app) {
  const levels = [
    { id: 'N1', bg: 'bg-rose-500', border: 'border-rose-400', words: app.vocabulary.filter(v => v.level === 'N1').length },
    { id: 'N2', bg: 'bg-amber-500', border: 'border-amber-400', words: app.vocabulary.filter(v => v.level === 'N2').length },
    { id: 'N3', bg: 'bg-emerald-500', border: 'border-emerald-400', words: app.vocabulary.filter(v => v.level === 'N3').length },
  ];
  const markStats = app.getMarkingStats();
  const isLevelMode = app.srsConfig.selectionMode === 'level';
  const isMarkingMode = app.srsConfig.selectionMode === 'marking';
  const isAllMode = app.srsConfig.levelMode === 'all';
  const levelTotal = app.srsConfig.n1Count + app.srsConfig.n2Count + app.srsConfig.n3Count;
  const markingTotal = Object.values(app.srsConfig.markingCounts).reduce((a, b) => a + b, 0);
  const activeTotal = isLevelMode ? levelTotal : markingTotal;
  const presets = [5, 10, 15, 20];
  
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <div class="max-w-md mx-auto">
        <div class="text-center mb-5">
          <h1 class="text-xl font-bold text-white mb-1">SRS Review</h1>
          <p class="text-slate-400 text-sm">Test your vocabulary knowledge</p>
        </div>
        
        ${(() => {
          try {
            const raw = localStorage.getItem('srs_session');
            if (!raw) return '';
            const s = JSON.parse(raw);
            const savedDate = s.savedAt?.slice(0, 10);
            const today = new Date().toISOString().slice(0, 10);
            if (savedDate !== today || !s.words?.length) return '';
            if (s.view !== 'test' && s.view !== 'results') return '';
            const isResults = s.view === 'results';
            const progress = (s.currentIndex || 0) + 1;
            const total = s.words.length;
            const answered = (s.answers || []).length;
            const correct = (s.answers || []).filter(a => a.correct).length;
            return `
              <div class="bg-gradient-to-r ${isResults ? 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30' : 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30'} border rounded-xl p-4 mb-4">
                <div class="flex items-center justify-between mb-2">
                  <div class="${isResults ? 'text-emerald-400' : 'text-cyan-400'} text-sm font-bold">${isResults ? '\u2714 Test Complete' : '\u23F5 Session in Progress'}</div>
                  <div class="text-slate-400 text-xs">${isResults ? correct + '/' + total + ' correct' : progress + '/' + total + ' \u00B7 ' + answered + ' answered'}</div>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-1.5 mb-3">
                  <div class="${isResults ? 'bg-emerald-400' : 'bg-cyan-400'} rounded-full h-1.5" style="width:${isResults ? Math.round(correct/total*100) : Math.round(progress/total*100)}%"></div>
                </div>
                <div class="flex gap-2">
                  <button id="resumeSessionBtn" class="flex-1 py-2.5 rounded-lg font-bold text-sm ${isResults ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-cyan-500 hover:bg-cyan-600'} text-white transition-all">${isResults ? '\uD83D\uDCCA View Results' : '\u25B6 Resume'}</button>
                  <button id="discardSessionBtn" class="py-2.5 px-4 rounded-lg text-sm bg-slate-700 text-slate-400 hover:bg-slate-600 transition-all">\u2715</button>
                </div>
              </div>`;
          } catch { return ''; }
        })()}
        
        <!-- Test Type -->
        <div class="bg-slate-800 rounded-xl p-4 mb-3">
          <h3 class="text-sm text-slate-400 mb-3">Test Type</h3>
          <div class="grid grid-cols-2 gap-2">
            ${[
              { key: 'hiragana_to_kanji', icon: '\u3042\u2192\u6F22', label: 'H\u2192K' },
              { key: 'kanji_to_hiragana', icon: '\u6F22\u2192\u3042', label: 'K\u2192H' },
              { key: 'kanji_recognition', icon: '\u6F22', label: 'Kanji' },
              { key: 'writing', icon: '\u270D', label: 'Writing' },
            ].map(t => `
              <button data-srs-test-type="${t.key}" class="p-2.5 rounded-xl text-center transition-all ${app.srsConfig.testType === t.key ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
                <span class="text-lg block mb-0.5">${t.icon}</span><span class="text-xs">${t.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
        
        <!-- Selection Mode -->
        <div class="bg-slate-800 rounded-2xl p-1.5 flex gap-1.5 mb-3">
          <button data-srs-sel-mode="level" class="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${isLevelMode ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}">
            \uD83D\uDCCA By Level
          </button>
          <button data-srs-sel-mode="marking" class="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${isMarkingMode ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}">
            \uD83C\uDFAF By Marking
          </button>
        </div>
        
        ${isLevelMode ? `
        <!-- LEVEL MODE: All / Custom toggle -->
        <div class="bg-slate-800 rounded-2xl p-1.5 flex gap-1.5 mb-3">
          <button data-srs-level-mode="all" class="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${isAllMode ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}">
            \u26A1 All Equal
          </button>
          <button data-srs-level-mode="custom" class="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${!isAllMode ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}">
            \uD83C\uDFDB Custom
          </button>
        </div>
        
        ${isAllMode ? `
        <!-- Presets -->
        <div class="bg-slate-800 rounded-xl p-3 mb-3">
          <div class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Words per level</div>
          <div class="flex gap-2">
            ${presets.map(n => `
              <button data-srs-preset="${n}" class="flex-1 py-2.5 rounded-xl font-bold text-base transition-all ${
                app.srsConfig.levelPreset === n 
                  ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-400' 
                  : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500'
              }">${n}</button>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <!-- Level cards -->
        <div class="space-y-2 mb-3">
          ${levels.map(l => `
            <div class="bg-slate-800 rounded-xl p-3 flex items-center gap-3 border border-slate-700">
              <div class="w-10 h-10 ${l.bg} rounded-xl flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">${l.id}</div>
              <div class="flex-1">
                <div class="text-white font-bold text-sm">JLPT ${l.id}</div>
                <div class="text-slate-500 text-xs">${l.words} words</div>
              </div>
              ${isAllMode ? `
                <div class="bg-slate-900 rounded-xl px-3 py-2 min-w-[44px] text-center">
                  <span class="text-white font-extrabold text-lg">${app.srsConfig[l.id.toLowerCase() + 'Count']}</span>
                </div>
              ` : `
                <div class="flex flex-col items-end gap-1">
                  <div class="flex gap-1">
                    ${[0, 5, 10, 15, 20].map(n => `
                      <button data-srs-chip="${l.id}" data-srs-chip-val="${n}" class="w-6 h-5 rounded text-[10px] font-bold transition-all ${
                        app.srsConfig[l.id.toLowerCase() + 'Count'] === n ? l.bg + ' text-white' : 'bg-slate-700 text-slate-400'
                      }">${n}</button>
                    `).join('')}
                  </div>
                  <input type="number" id="srs${l.id}Count" min="0" max="${l.words}" value="${app.srsConfig[l.id.toLowerCase() + 'Count']}" 
                    class="w-14 p-1 rounded-lg border-2 ${l.border} bg-slate-900 text-white font-extrabold text-base text-center focus:outline-none">
                </div>
              `}
            </div>
          `).join('')}
        </div>
        
        <button id="startSRSTestBtn" class="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
          levelTotal === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 shadow-lg'
        }" ${levelTotal === 0 ? 'disabled' : ''}>
          \u25B6 Start Test <span class="bg-white/20 rounded-lg px-2.5 py-0.5 text-sm">${levelTotal} words</span>
        </button>
        ` : `
        <!-- MARKING MODE -->
        <div class="bg-slate-800 rounded-xl p-3 mb-3">
          <div class="flex items-center justify-between mb-2">
            <div class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Words per category</div>
            <div class="flex gap-1">
              ${[3,5,10].map(n => `<button data-srs-mark-all="${n}" class="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all">All ${n}</button>`).join('')}
            </div>
          </div>
          ${(() => {
            const dueStats = app.getDueStats();
            return [1,2,3,4,5,6].map(k => {
              const cat = app.markingCategories[k];
              const avail = markStats[k];
              const due = dueStats[k]?.due || 0;
              const intervalDays = app.srsIntervals[k] || 7;
              const curVal = app.srsConfig.markingCounts[k] || 0;
              const useSRS = app.srsConfig.useSRSIntervals !== false;
              const effectiveAvail = useSRS ? due : avail;
              return `<div class="flex items-center gap-2 mb-2 p-2 bg-slate-700/50 rounded-lg">
                <div class="w-8 h-8 ${cat.color} rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0">${cat.icon}</div>
                <div class="flex-1 min-w-0">
                  <div class="text-white text-xs font-semibold">${cat.label}</div>
                  <div class="text-slate-500 text-[10px]">${useSRS ? `<span class="${due > 0 ? 'text-amber-400' : 'text-emerald-400'}">${due} due</span> / ${avail} total \u00B7 ${intervalDays}d` : `${avail} words`}</div>
                </div>
                <div class="flex gap-0.5">
                  ${[0,1,3,5,10].map(n => `<button data-srs-mark-chip="${k}" data-srs-mark-chip-val="${n}" class="w-6 h-5 rounded text-[10px] font-bold transition-all ${
                    curVal === n ? cat.color + ' text-white' : (n <= effectiveAvail ? 'bg-slate-600 text-slate-300' : 'bg-slate-800 text-slate-600')
                  }">${n}</button>`).join('')}
                </div>
                <input type="number" id="srsMarkCount${k}" min="0" max="${effectiveAvail}" value="${curVal}" 
                  class="w-12 p-1 text-center border ${cat.border} rounded-lg font-bold text-sm bg-slate-900 text-white focus:outline-none">
              </div>`;
            }).join('');
          })()}
          
          <div class="flex items-center gap-2 p-2 bg-slate-700/30 rounded-lg opacity-50">
            <div class="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center text-white text-sm">\u25CB</div>
            <div class="flex-1"><div class="text-slate-400 text-xs">Not Marked</div><div class="text-slate-600 text-[10px]">${markStats[0]} words</div></div>
            <span class="text-slate-600 text-xs px-2">\u2014</span>
          </div>
          
          <!-- SRS Interval Toggle -->
          <div class="flex items-center justify-between mt-3 p-2 bg-slate-700/30 rounded-lg">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400">\u23F0 Spaced Repetition</span>
            </div>
            <div class="flex items-center gap-2">
              <button id="srsSettingsBtn" class="text-[10px] px-2 py-0.5 rounded bg-slate-600 text-slate-300 hover:bg-slate-500 transition-all">\u2699 Intervals</button>
              <button id="srsIntervalToggle" class="w-10 h-5 rounded-full transition-all relative ${app.srsConfig.useSRSIntervals !== false ? 'bg-emerald-500' : 'bg-slate-600'}">
                <div class="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${app.srsConfig.useSRSIntervals !== false ? 'left-5' : 'left-0.5'}"></div>
              </button>
            </div>
          </div>
          
          <!-- SRS Interval Settings (hidden by default) -->
          <div id="srsIntervalSettings" style="display:none;" class="mt-2 p-3 bg-slate-900 rounded-lg">
            <div class="text-xs text-slate-400 font-semibold mb-2">Review intervals (days)</div>
            ${[1,2,3,4,5,6].map(k => {
              const cat = app.markingCategories[k];
              const days = app.srsIntervals[k] || 7;
              return `<div class="flex items-center gap-2 mb-1.5">
                <span class="text-[10px] ${cat.color.replace('bg-','text-')} w-4 text-center">${cat.icon}</span>
                <span class="text-[10px] text-slate-400 flex-1">${cat.label}</span>
                <input type="number" id="srsInterval${k}" min="1" max="365" value="${days}" 
                  class="w-14 p-1 text-center text-xs bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500">
                <span class="text-[10px] text-slate-500">days</span>
              </div>`;
            }).join('')}
            <div class="flex gap-2 mt-2">
              <button id="srsIntervalSave" class="flex-1 py-1.5 text-xs font-bold rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-all">Save</button>
              <button id="srsIntervalReset" class="py-1.5 px-3 text-xs rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all">Reset</button>
            </div>
          </div>
        </div>
        
        <button id="startSRSTestBtn" class="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
          markingTotal === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 shadow-lg'
        }" ${markingTotal === 0 ? 'disabled' : ''}>
          \u25B6 Start Test <span class="bg-white/20 rounded-lg px-2.5 py-0.5 text-sm">${markingTotal} words</span>
        </button>
        `}
        
        <!-- Today's Practice Words -->
        ${(() => {
          const today = app.getTodayPractice();
          const wordList = Object.values(today.words || {});
          const srsSessions = today.sessions || [];
          const studySessions = today.studySessions || [];
          if (wordList.length === 0) return '';
          const totalCorrect = srsSessions.reduce((a, s) => a + (s.correct || 0), 0);
          const totalAttempts = srsSessions.reduce((a, s) => a + (s.total || 0), 0);
          const totalStudyWords = studySessions.reduce((a, s) => a + (s.wordCount || 0), 0);
          return `
            <div class="bg-slate-800 rounded-xl p-4 mt-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-white">\uD83D\uDCCA Today's Words (${wordList.length})</h3>
                <span class="text-xs text-slate-400">${studySessions.length > 0 ? studySessions.length + ' study' : ''}${studySessions.length > 0 && srsSessions.length > 0 ? ' \u00B7 ' : ''}${srsSessions.length > 0 ? srsSessions.length + ' SRS' : ''}</span>
              </div>
              ${studySessions.length > 0 || srsSessions.length > 0 ? `
                <div class="flex gap-2 mb-3 flex-wrap">
                  ${studySessions.length > 0 ? `<span class="text-[10px] px-2 py-1 rounded bg-purple-500/15 text-purple-400">\uD83D\uDCDA Study: ${totalStudyWords} words in ${studySessions.length} session${studySessions.length > 1 ? 's' : ''}</span>` : ''}
                  ${totalAttempts > 0 ? `<span class="text-[10px] px-2 py-1 rounded bg-cyan-500/15 text-cyan-400">\uD83C\uDFAF SRS: ${totalCorrect}/${totalAttempts} (${Math.round(totalCorrect/totalAttempts*100)}%)</span>` : ''}
                </div>` : ''}
              <div class="space-y-1 max-h-60 overflow-y-auto">
                ${wordList.map(w => {
                  const pct = w.attempts ? Math.round((w.correctCount || 0) / w.attempts * 100) : -1;
                  const pctCls = pct >= 80 ? 'bg-emerald-500/20 text-emerald-400' : pct >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400';
                  return `
                    <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-700/50">
                      <span class="text-base font-bold text-white min-w-[60px]">${escapeHtml(w.kanji)}</span>
                      <span class="text-xs text-blue-400">${escapeHtml(w.hiragana || '')}</span>
                      <span class="text-xs text-slate-400 flex-1 truncate">${escapeHtml(w.meaning || '')}</span>
                      ${pct >= 0 ? `<span class="text-[10px] px-1.5 py-0.5 rounded ${pctCls}">${pct}%</span>` : ''}
                    </div>`;
                }).join('')}
              </div>
              <div class="mt-2 text-[10px] text-slate-500">Resets at midnight</div>
            </div>`;
        })()}
        
      </div>
    </div>
  `;
}

function renderSRSTest(app) {
  if (app.srsWords.length === 0) return `<div class="p-4 text-center text-white">No words selected</div>`;
  const word = app.srsWords[app.srsCurrentIndex];
  const levelColor = LEVEL_COLORS[word.level] || LEVEL_COLORS['ALL'];
  const progress = ((app.srsCurrentIndex + 1) / app.srsWords.length) * 100;
  const wMark = getMarking(app.markings, word);
  const markInfo = app.markingCategories[wMark] || app.markingCategories[0];
  
  if (app.srsConfig.testType === 'writing') return renderSRSWritingTest(app, word, levelColor, progress, markInfo);
  return renderSRSMCQTest(app, word, levelColor, progress, markInfo);
}

function renderSRSMCQTest(app, word, levelColor, progress, markInfo) {
  const testType = app.srsConfig.testType;
  let question, correctAnswer, promptText, questionClass;
  
  if (testType === 'kanji_recognition') {
    question = word.kanji || word.raw;
    correctAnswer = word.meaning;
    promptText = 'What is the meaning of:';
    questionClass = 'kanji-highlight';
  } else if (testType === 'hiragana_to_kanji') {
    question = word.hiragana;
    correctAnswer = word.kanji || word.raw;
    promptText = 'What is the kanji for:';
    questionClass = 'text-3xl text-blue-600';
  } else {
    question = word.kanji || word.raw;
    correctAnswer = word.hiragana;
    promptText = 'What is the reading for:';
    questionClass = 'kanji-highlight';
  }
  
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <button id="backToSRSSetupBtn" class="text-white hover:bg-slate-700 px-3 py-2 rounded-lg">Exit</button>
        <div class="text-center">
          <div class="flex items-center justify-center gap-1">
            <span class="px-2 py-1 ${levelColor.bg} text-white text-xs rounded font-bold">${word.level}</span>
            <span class="px-2 py-1 ${markInfo.color} text-white text-xs rounded font-bold">${markInfo.icon}</span>
          </div>
          <p class="text-slate-400 text-sm mt-1">${app.srsCurrentIndex + 1} / ${app.srsWords.length}</p>
        </div>
        <div class="text-right">
          <div class="text-emerald-400 text-sm">✓ ${app.srsAnswers.filter(a => a.correct).length}</div>
          <div class="text-red-400 text-sm">✗ ${app.srsAnswers.filter(a => !a.correct).length}</div>
        </div>
      </div>
      <div class="bg-slate-700 h-1"><div class="bg-emerald-500 h-full transition-all" style="width:${progress}%"></div></div>
      <div class="flex-1 flex flex-col items-center justify-center p-4">
        <div class="w-full max-w-md">
          <div class="bg-white rounded-2xl p-6 mb-6 text-center shadow-lg">
            <p class="text-sm text-gray-500 mb-2">${promptText}</p>
            <p class="${questionClass}">${question}</p>
            ${testType !== 'kanji_recognition' ? `<p class="text-gray-600 mt-2">${word.meaning}</p>` : `<p class="text-blue-500 mt-2">${word.hiragana || ''}</p>`}
          </div>
          <div class="grid ${testType === 'kanji_recognition' ? 'grid-cols-1' : 'grid-cols-2'} gap-3">
            ${app.srsOptions.map((opt, idx) => {
              let cls = 'bg-slate-700 text-white hover:bg-slate-600';
              if (app.srsShowResult) {
                if (opt === correctAnswer) cls = 'bg-emerald-500 text-white';
                else if (idx === app.srsSelectedAnswer) cls = 'bg-red-500 text-white';
                else cls = 'bg-slate-800 text-slate-500';
              } else if (app.srsSelectedAnswer === idx) cls = 'bg-blue-500 text-white ring-2 ring-blue-300';
              return `<button data-srs-option="${idx}" class="p-3 rounded-xl ${testType === 'kanji_recognition' ? 'text-sm' : 'text-xl'} font-bold transition-all ${cls}" ${app.srsShowResult ? 'disabled' : ''}>${opt}</button>`;
            }).join('')}
          </div>
          ${!app.srsShowResult ? `
            <button id="srsSubmitBtn" class="w-full mt-4 py-4 bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50" ${app.srsSelectedAnswer === null ? 'disabled' : ''}>Submit Answer</button>
          ` : `
            <button data-open-story="${escapeHtml(word.kanji || word.raw)}" data-story-hiragana="${word.hiragana || ''}" data-story-meaning="${escapeHtml(word.meaning)}" class="w-full mt-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all story-btn">📖 Kanji Story</button>
            <button id="srsNextBtn" class="w-full mt-2 py-4 bg-blue-500 text-white font-bold rounded-xl">${app.srsCurrentIndex < app.srsWords.length - 1 ? 'Next Question →' : 'See Results'}</button>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderSRSWritingTest(app, word, levelColor, progress, markInfo) {
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <button id="backToSRSSetupBtn" class="text-white hover:bg-slate-700 px-3 py-2 rounded-lg">Exit</button>
        <div class="text-center">
          <div class="flex items-center justify-center gap-1">
            <span class="px-2 py-1 ${levelColor.bg} text-white text-xs rounded font-bold">${word.level}</span>
            <span class="px-2 py-1 ${markInfo.color} text-white text-xs rounded font-bold">${markInfo.icon}</span>
          </div>
          <p class="text-slate-400 text-sm mt-1">${app.srsCurrentIndex + 1} / ${app.srsWords.length}</p>
        </div>
        <div class="w-16"></div>
      </div>
      <div class="bg-slate-700 h-1"><div class="bg-emerald-500 h-full transition-all" style="width:${progress}%"></div></div>
      <div class="flex-1 flex flex-col items-center justify-center p-4">
        <div class="w-full max-w-md">
          <div class="bg-white rounded-2xl p-6 mb-4 text-center shadow-lg">
            <p class="text-sm text-gray-500 mb-2">Write the kanji for:</p>
            <p class="text-2xl text-blue-600 mb-2">${word.hiragana}</p>
            <p class="text-gray-600">${word.meaning}</p>
          </div>
          <div class="canvas-container mb-4">
            <canvas id="srsWritingCanvas" width="400" height="200" class="w-full bg-white rounded-xl"></canvas>
            <div class="canvas-controls"><button id="clearCanvasBtn" class="px-3 py-1 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-500">Clear</button></div>
          </div>
          ${app.srsShowResult ? `
            <div class="bg-white rounded-xl p-4 mb-4 text-center"><p class="text-sm text-gray-500 mb-1">Correct:</p><p class="kanji-highlight">${word.kanji || word.raw}</p></div>
            <button data-open-story="${escapeHtml(word.kanji || word.raw)}" data-story-hiragana="${word.hiragana || ''}" data-story-meaning="${escapeHtml(word.meaning)}" class="w-full py-3 mb-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all story-btn">📖 Kanji Story</button>
            <div class="grid grid-cols-2 gap-3">
              <button id="srsMarkWrongBtn" class="py-4 bg-red-500 text-white font-bold rounded-xl">✗ Wrong</button>
              <button id="srsMarkCorrectBtn" class="py-4 bg-emerald-500 text-white font-bold rounded-xl">✓ Correct</button>
            </div>
          ` : `<button id="srsRevealWritingBtn" class="w-full py-4 bg-blue-500 text-white font-bold rounded-xl">Reveal Answer</button>`}
        </div>
      </div>
    </div>
  `;
}

function renderSRSResults(app) {
  const correct = app.srsAnswers.filter(a => a.correct).length;
  const total = app.srsAnswers.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wrongAnswers = app.srsAnswers.filter(a => !a.correct);
  
  // Marking breakdown
  const mb = {};
  app.srsAnswers.forEach(a => {
    const m = getMarking(app.markings, a.word);
    if (!mb[m]) mb[m] = { total: 0, correct: 0 };
    mb[m].total++;
    if (a.correct) mb[m].correct++;
  });
  const hasMarkData = Object.keys(mb).some(k => parseInt(k) > 0);
  
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <div class="max-w-md mx-auto pt-4">
        <div class="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white text-center mb-4">
          <div class="text-5xl font-bold mb-2">${percentage}%</div>
          <p class="text-xl">${correct} / ${total} Correct</p>
        </div>
        
        ${hasMarkData ? `
          <div class="bg-slate-800 rounded-xl p-4 mb-4">
            <h3 class="text-white font-bold mb-3">📊 Performance by Marking</h3>
            <div class="space-y-2">
              ${Object.entries(mb).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).map(([k, v]) => {
                const cat = app.markingCategories[parseInt(k)] || app.markingCategories[0];
                const pct = v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0;
                return `<div class="flex items-center gap-3 bg-slate-700/50 rounded-lg p-2">
                  <div class="w-8 h-8 ${cat.color} rounded-lg flex items-center justify-center text-white text-sm">${cat.icon}</div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-1"><span class="text-slate-300 text-xs">${cat.label}</span><span class="text-white text-xs font-bold">${v.correct}/${v.total} (${pct}%)</span></div>
                    <div class="bg-slate-600 rounded-full h-1.5 overflow-hidden"><div class="${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'} h-full" style="width:${pct}%"></div></div>
                  </div>
                </div>`;
              }).join('')}
            </div>
          </div>
        ` : ''}
        
        ${wrongAnswers.length > 0 ? `
          <div class="bg-slate-800 rounded-xl p-4 mb-4">
            <h3 class="text-white font-bold mb-3">Review Mistakes (${wrongAnswers.length})</h3>
            <div class="space-y-2 max-h-64 overflow-auto">
              ${wrongAnswers.map(a => {
                const lc = LEVEL_COLORS[a.word.level] || LEVEL_COLORS['ALL'];
                const wm = getMarking(app.markings, a.word);
                const mi = app.markingCategories[wm] || app.markingCategories[0];
                return `<div class="bg-slate-700 rounded-lg p-3">
                  <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 ${lc.bg} text-white text-xs rounded">${a.word.level}</span>
                      <span class="px-1.5 py-0.5 ${mi.color} text-white text-[10px] rounded">${mi.icon}</span>
                      <span class="text-white font-bold">${a.word.kanji || a.word.raw}</span>
                      <span class="text-slate-400">${a.word.hiragana}</span>
                    </div>
                    <button data-open-story="${escapeHtml(a.word.kanji || a.word.raw)}" data-story-hiragana="${a.word.hiragana || ''}" data-story-meaning="${escapeHtml(a.word.meaning)}" class="text-purple-400 hover:text-purple-300 text-xs px-2 py-1 rounded bg-purple-500/10 border border-purple-500/30">📖</button>
                  </div>
                  <p class="text-slate-400 text-sm">${a.word.meaning}</p>
                  <p class="text-red-400 text-xs mt-1">Your answer: ${a.userAnswer}</p>
                </div>`;
              }).join('')}
            </div>
            <button id="srsRetestWrongBtn" class="w-full mt-4 py-3 bg-orange-500 text-white font-bold rounded-xl">Retest Wrong (${wrongAnswers.length})</button>
          </div>
        ` : `
          <div class="bg-slate-800 rounded-xl p-6 text-center mb-4">
            <div class="text-4xl mb-2">🎉</div>
            <p class="text-emerald-400 font-bold">Perfect Score!</p>
          </div>
        `}
        <button id="srsNewTestBtn" class="w-full py-4 bg-blue-500 text-white font-bold rounded-xl">New Test</button>
      </div>
    </div>
  `;
}
