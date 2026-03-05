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
  const n1Count = app.vocabulary.filter(v => v.level === 'N1').length;
  const n2Count = app.vocabulary.filter(v => v.level === 'N2').length;
  const n3Count = app.vocabulary.filter(v => v.level === 'N3').length;
  const markStats = app.getMarkingStats();
  const isLevelMode = app.srsConfig.selectionMode === 'level';
  const isMarkingMode = app.srsConfig.selectionMode === 'marking';
  const levelTotal = app.srsConfig.n1Count + app.srsConfig.n2Count + app.srsConfig.n3Count;
  const markingTotal = Object.values(app.srsConfig.markingCounts).reduce((a, b) => a + b, 0);
  
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <div class="max-w-md mx-auto pt-4">
        <div class="text-center mb-6">
          <h1 class="text-xl font-bold text-white mb-1">SRS Review</h1>
          <p class="text-slate-400 text-sm">Test your vocabulary knowledge</p>
        </div>
        
        <!-- Test Type -->
        <div class="bg-slate-800 rounded-xl p-4 mb-4">
          <h3 class="text-sm text-slate-400 mb-3">Test Type</h3>
          <div class="grid grid-cols-3 gap-2">
            <button data-srs-test-type="hiragana_to_kanji" class="p-3 rounded-xl text-center transition-all ${app.srsConfig.testType === 'hiragana_to_kanji' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
              <span class="text-lg block mb-1">あ→漢</span><span class="text-xs">H→K</span>
            </button>
            <button data-srs-test-type="kanji_to_hiragana" class="p-3 rounded-xl text-center transition-all ${app.srsConfig.testType === 'kanji_to_hiragana' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
              <span class="text-lg block mb-1">漢→あ</span><span class="text-xs">K→H</span>
            </button>
            <button data-srs-test-type="writing" class="p-3 rounded-xl text-center transition-all ${app.srsConfig.testType === 'writing' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
              <span class="text-lg block mb-1">✍</span><span class="text-xs">Writing</span>
            </button>
          </div>
        </div>
        
        <!-- Selection Mode Toggle -->
        <div class="bg-slate-800 rounded-xl p-4 mb-4">
          <h3 class="text-sm text-slate-400 mb-3">Word Selection Mode</h3>
          <div class="grid grid-cols-2 gap-2">
            <button data-srs-sel-mode="level" class="p-3 rounded-xl text-center transition-all ${isLevelMode ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
              <div class="text-lg font-bold mb-0.5">📊 By Level</div><div class="text-xs opacity-70">N1 / N2 / N3</div>
            </button>
            <button data-srs-sel-mode="marking" class="p-3 rounded-xl text-center transition-all ${isMarkingMode ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
              <div class="text-lg font-bold mb-0.5">🎯 By Marking</div><div class="text-xs opacity-70">Priority-weighted</div>
            </button>
          </div>
        </div>
        
        ${isLevelMode ? `
        <div class="bg-white rounded-xl p-4 shadow-lg mb-4">
          <h3 class="text-sm text-slate-600 mb-3">Number of Words</h3>
          <div class="space-y-3">
            ${[{id:'N1',color:'bg-rose-500',max:n1Count,val:app.srsConfig.n1Count},{id:'N2',color:'bg-amber-500',max:n2Count,val:app.srsConfig.n2Count},{id:'N3',color:'bg-emerald-500',max:n3Count,val:app.srsConfig.n3Count}].map(l => `
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 ${l.color} rounded-lg flex items-center justify-center text-white font-bold">${l.id}</div>
                <div class="flex-1">
                  <input type="number" id="srs${l.id}Count" min="0" max="${l.max}" value="${l.val}" class="w-full p-2 border rounded-lg text-center" placeholder="0">
                  <p class="text-xs text-gray-400 text-center mt-1">Max: ${l.max}</p>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="text-center text-gray-500 text-sm my-3">Total: <span class="font-bold text-gray-800">${levelTotal}</span> words</div>
          <button id="startSRSTestBtn" class="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50" ${levelTotal === 0 ? 'disabled' : ''}>Start Test (${levelTotal} words)</button>
        </div>
        ` : `
        <div class="bg-white rounded-xl p-4 shadow-lg mb-4">
          <h3 class="text-sm text-slate-600 mb-2">Words per marking category</h3>
          <p class="text-xs text-gray-400 mb-3">Drawn from all levels based on rating</p>
          ${[1,2,3,4,5].map(k => {
            const cat = app.markingCategories[k];
            const avail = markStats[k];
            const curVal = app.srsConfig.markingCounts[k] || 0;
            return `<div class="flex items-center justify-between mb-3 p-3 ${cat.lightColor} rounded-xl">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 ${cat.color} rounded-lg flex items-center justify-center text-white text-lg">${cat.icon}</div>
                <div><div class="font-medium text-gray-800 text-sm">${cat.label}</div><div class="text-xs text-gray-500">${avail} words</div></div>
              </div>
              <input type="number" id="srsMarkCount${k}" min="0" max="${avail}" value="${curVal}" class="w-20 p-2 text-center border-2 ${cat.border} rounded-lg font-bold text-lg focus:outline-none focus:ring-2">
            </div>`;
          }).join('')}
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-3 opacity-60">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center text-white text-lg">○</div>
              <div><div class="font-medium text-gray-600 text-sm">Not Marked</div><div class="text-xs text-gray-400">${markStats[0]} words — rate these first!</div></div>
            </div>
            <span class="text-gray-400 text-sm font-bold px-2">—</span>
          </div>
          <div class="text-center text-gray-500 text-sm mb-3">Total: <span class="font-bold text-gray-800">${markingTotal}</span> words</div>
          <button id="startSRSTestBtn" class="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50" ${markingTotal === 0 ? 'disabled' : ''}>Start Test (${markingTotal} words)</button>
        </div>
        `}
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
  const isH2K = app.srsConfig.testType === 'hiragana_to_kanji';
  const question = isH2K ? word.hiragana : (word.kanji || word.raw);
  const correctAnswer = isH2K ? (word.kanji || word.raw) : word.hiragana;
  
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
            <p class="text-sm text-gray-500 mb-2">${isH2K ? 'What is the kanji for:' : 'What is the reading for:'}</p>
            <p class="${isH2K ? 'text-3xl text-blue-600' : 'kanji-highlight'}">${question}</p>
            <p class="text-gray-600 mt-2">${word.meaning}</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            ${app.srsOptions.map((opt, idx) => {
              let cls = 'bg-slate-700 text-white hover:bg-slate-600';
              if (app.srsShowResult) {
                if (opt === correctAnswer) cls = 'bg-emerald-500 text-white';
                else if (idx === app.srsSelectedAnswer) cls = 'bg-red-500 text-white';
                else cls = 'bg-slate-800 text-slate-500';
              } else if (app.srsSelectedAnswer === idx) cls = 'bg-blue-500 text-white ring-2 ring-blue-300';
              return `<button data-srs-option="${idx}" class="p-4 rounded-xl text-xl font-bold transition-all ${cls}" ${app.srsShowResult ? 'disabled' : ''}>${opt}</button>`;
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
