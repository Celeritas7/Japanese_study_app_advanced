// JLPT Vocabulary Master - SRS Tab Render Functions

import { MARKING_CATEGORIES, LEVEL_COLORS } from './config.js';
import { getMarking, escapeKanji } from './utils.js';

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
  const total = app.srsConfig.n1Count + app.srsConfig.n2Count + app.srsConfig.n3Count;
  
  return `
    <div class="p-4 animate-fadeIn">
      <div class="max-w-md mx-auto pt-4">
        <div class="text-center mb-6">
          <h1 class="text-xl font-bold text-white mb-1">SRS Review</h1>
          <p class="text-slate-400 text-sm">Test your vocabulary knowledge</p>
        </div>
        
        <div class="bg-slate-800 rounded-xl p-4 mb-4">
          <h3 class="text-sm text-slate-400 mb-3">Test Type</h3>
          <div class="grid grid-cols-3 gap-2">
            <button data-srs-test-type="hiragana_to_kanji" class="p-3 rounded-xl text-center transition-all ${app.srsConfig.testType === 'hiragana_to_kanji' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}">
              <span class="text-xl block mb-1">Hi->Ka</span>
              <span class="text-xs">Hiragana to Kanji</span>
            </button>
            <button data-srs-test-type="kanji_to_hiragana" class="p-3 rounded-xl text-center transition-all ${app.srsConfig.testType === 'kanji_to_hiragana' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}">
              <span class="text-xl block mb-1">Ka->Hi</span>
              <span class="text-xs">Kanji to Hiragana</span>
            </button>
            <button data-srs-test-type="writing" class="p-3 rounded-xl text-center transition-all ${app.srsConfig.testType === 'writing' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}">
              <span class="text-xl block mb-1">Wr</span>
              <span class="text-xs">Writing Test</span>
            </button>
          </div>
        </div>
        
        <div class="bg-white rounded-xl p-4 shadow-lg mb-4">
          <h3 class="text-sm text-slate-600 mb-3">Number of Words</h3>
          
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-rose-500 rounded-lg flex items-center justify-center text-white font-bold">N1</div>
              <div class="flex-1">
                <input type="number" id="srsN1Count" min="0" max="${n1Count}" value="${app.srsConfig.n1Count}" 
                  class="w-full p-2 border rounded-lg text-center" placeholder="0">
                <p class="text-xs text-gray-400 text-center mt-1">Max: ${n1Count}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center text-white font-bold">N2</div>
              <div class="flex-1">
                <input type="number" id="srsN2Count" min="0" max="${n2Count}" value="${app.srsConfig.n2Count}" 
                  class="w-full p-2 border rounded-lg text-center" placeholder="0">
                <p class="text-xs text-gray-400 text-center mt-1">Max: ${n2Count}</p>
              </div>
            </div>
            
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">N3</div>
              <div class="flex-1">
                <input type="number" id="srsN3Count" min="0" max="${n3Count}" value="${app.srsConfig.n3Count}" 
                  class="w-full p-2 border rounded-lg text-center" placeholder="0">
                <p class="text-xs text-gray-400 text-center mt-1">Max: ${n3Count}</p>
              </div>
            </div>
          </div>
        </div>
        
        <button id="startSRSTestBtn" class="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed" ${total === 0 ? 'disabled' : ''}>
          Start Test (${total} words)
        </button>
      </div>
    </div>
  `;
}

function renderSRSTest(app) {
  if (app.srsWords.length === 0) {
    return `<div class="p-4 text-center text-white">No words selected</div>`;
  }
  
  const word = app.srsWords[app.srsCurrentIndex];
  const levelColor = LEVEL_COLORS[word.level] || LEVEL_COLORS['ALL'];
  const progress = ((app.srsCurrentIndex + 1) / app.srsWords.length) * 100;
  
  if (app.srsConfig.testType === 'writing') {
    return renderSRSWritingTest(app, word, levelColor, progress);
  }
  
  return renderSRSMCQTest(app, word, levelColor, progress);
}

function renderSRSMCQTest(app, word, levelColor, progress) {
  const isH2K = app.srsConfig.testType === 'hiragana_to_kanji';
  const question = isH2K ? word.hiragana : (word.kanji || word.raw);
  const correctAnswer = isH2K ? (word.kanji || word.raw) : word.hiragana;
  
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <button id="backToSRSSetupBtn" class="text-white hover:bg-slate-700 px-3 py-2 rounded-lg">Exit</button>
        <div class="text-center">
          <span class="px-2 py-1 ${levelColor.bg} text-white text-xs rounded font-bold">${word.level}</span>
          <p class="text-slate-400 text-sm mt-1">${app.srsCurrentIndex + 1} / ${app.srsWords.length}</p>
        </div>
        <div class="w-16"></div>
      </div>
      
      <div class="bg-slate-700 h-1">
        <div class="bg-emerald-500 h-full transition-all" style="width: ${progress}%"></div>
      </div>
      
      <main class="flex-1 flex flex-col items-center justify-center p-4">
        <div class="w-full max-w-md">
          <div class="bg-white rounded-2xl p-6 mb-6 text-center shadow-lg">
            <p class="text-sm text-gray-500 mb-2">${isH2K ? 'What is the kanji for:' : 'What is the reading for:'}</p>
            <p class="${isH2K ? 'text-3xl text-blue-600' : 'kanji-highlight'}">${question}</p>
            <p class="text-gray-600 mt-2">${word.meaning}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            ${app.srsOptions.map((opt, idx) => {
              let btnClass = 'bg-slate-700 text-white hover:bg-slate-600';
              
              if (app.srsShowResult) {
                if (opt === correctAnswer) {
                  btnClass = 'bg-emerald-500 text-white';
                } else if (idx === app.srsSelectedAnswer && opt !== correctAnswer) {
                  btnClass = 'bg-red-500 text-white';
                } else {
                  btnClass = 'bg-slate-800 text-slate-500';
                }
              } else if (app.srsSelectedAnswer === idx) {
                btnClass = 'bg-blue-500 text-white ring-2 ring-blue-300';
              }
              
              return `
                <button data-srs-option="${idx}" class="p-4 rounded-xl text-xl font-bold transition-all ${btnClass}" ${app.srsShowResult ? 'disabled' : ''}>
                  ${opt}
                </button>
              `;
            }).join('')}
          </div>
          
          ${!app.srsShowResult ? `
            <button id="srsSubmitBtn" class="w-full mt-4 py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 disabled:opacity-50" ${app.srsSelectedAnswer === null ? 'disabled' : ''}>
              Submit Answer
            </button>
          ` : `
            <button id="srsNextBtn" class="w-full mt-4 py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600">
              ${app.srsCurrentIndex < app.srsWords.length - 1 ? 'Next Question ->' : 'See Results'}
            </button>
          `}
        </div>
      </main>
    </div>
  `;
}

function renderSRSWritingTest(app, word, levelColor, progress) {
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-slate-800 px-4 py-3 flex items-center justify-between">
        <button id="backToSRSSetupBtn" class="text-white hover:bg-slate-700 px-3 py-2 rounded-lg">Exit</button>
        <div class="text-center">
          <span class="px-2 py-1 ${levelColor.bg} text-white text-xs rounded font-bold">${word.level}</span>
          <p class="text-slate-400 text-sm mt-1">${app.srsCurrentIndex + 1} / ${app.srsWords.length}</p>
        </div>
        <div class="w-16"></div>
      </div>
      
      <div class="bg-slate-700 h-1">
        <div class="bg-emerald-500 h-full transition-all" style="width: ${progress}%"></div>
      </div>
      
      <main class="flex-1 flex flex-col items-center justify-center p-4">
        <div class="w-full max-w-md">
          <div class="bg-white rounded-2xl p-6 mb-4 text-center shadow-lg">
            <p class="text-sm text-gray-500 mb-2">Write the kanji for:</p>
            <p class="text-2xl text-blue-600 mb-2">${word.hiragana}</p>
            <p class="text-gray-600">${word.meaning}</p>
          </div>
          
          <div class="canvas-container mb-4">
            <canvas id="srsWritingCanvas" width="400" height="200" class="w-full bg-white rounded-xl"></canvas>
            <div class="canvas-controls">
              <button id="clearCanvasBtn" class="px-3 py-1 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-500">Clear</button>
            </div>
          </div>
          
          ${app.srsShowResult ? `
            <div class="bg-white rounded-xl p-4 mb-4 text-center">
              <p class="text-sm text-gray-500 mb-1">Correct Answer:</p>
              <p class="kanji-highlight">${word.kanji || word.raw}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <button id="srsMarkWrongBtn" class="py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600">
                X Wrong
              </button>
              <button id="srsMarkCorrectBtn" class="py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600">
                V Correct
              </button>
            </div>
          ` : `
            <button id="srsRevealWritingBtn" class="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600">
              Reveal Answer
            </button>
          `}
        </div>
      </main>
    </div>
  `;
}

function renderSRSResults(app) {
  const correct = app.srsAnswers.filter(a => a.correct).length;
  const total = app.srsAnswers.length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wrongAnswers = app.srsAnswers.filter(a => !a.correct);
  
  return `
    <div class="p-4 animate-fadeIn">
      <div class="max-w-md mx-auto pt-4">
        <div class="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white text-center mb-6">
          <div class="text-5xl font-bold mb-2">${percentage}%</div>
          <p class="text-xl">${correct} / ${total} Correct</p>
        </div>
        
        ${wrongAnswers.length > 0 ? `
          <div class="bg-slate-800 rounded-xl p-4 mb-4">
            <h3 class="text-white font-bold mb-3">Review Mistakes (${wrongAnswers.length})</h3>
            <div class="space-y-2 max-h-64 overflow-auto">
              ${wrongAnswers.map(a => {
                const levelColor = LEVEL_COLORS[a.word.level] || LEVEL_COLORS['ALL'];
                return `
                  <div class="bg-slate-700 rounded-lg p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="px-2 py-0.5 ${levelColor.bg} text-white text-xs rounded">${a.word.level}</span>
                      <span class="text-white font-bold">${a.word.kanji || a.word.raw}</span>
                      <span class="text-slate-400">${a.word.hiragana}</span>
                    </div>
                    <p class="text-slate-400 text-sm">${a.word.meaning}</p>
                    <p class="text-red-400 text-xs mt-1">Your answer: ${a.userAnswer}</p>
                  </div>
                `;
              }).join('')}
            </div>
            
            <button id="srsRetestWrongBtn" class="w-full mt-4 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600">
              Retest Wrong Answers (${wrongAnswers.length})
            </button>
          </div>
        ` : `
          <div class="bg-slate-800 rounded-xl p-6 text-center mb-4">
            <div class="text-4xl mb-2">Perfect!</div>
            <p class="text-emerald-400">You got everything right!</p>
          </div>
        `}
        
        <button id="srsNewTestBtn" class="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600">
          New Test
        </button>
      </div>
    </div>
  `;
}
