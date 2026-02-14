// JLPT Vocabulary Master - Similar Kanji Tab Render Functions

import { parseKanjiList } from './utils.js';

export function renderSimilarTab(app) {
  if (app.selectedSimilarGroup) {
    return renderSimilarDetail(app);
  }
  return renderSimilarList(app);
}

function renderSimilarList(app) {
  let groups = app.similarGroups;
  
  // Filter by search
  if (app.similarFilter.search) {
    const search = app.similarFilter.search.toLowerCase();
    groups = groups.filter(g => 
      g.group_name?.toLowerCase().includes(search) ||
      g.kanji_list?.includes(app.similarFilter.search)
    );
  }
  
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <!-- Header -->
      <div class="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-5 mb-4 text-white">
        <h2 class="text-xl font-bold mb-1">🎲 Similar Kanji</h2>
        <p class="opacity-80 text-sm">${app.similarGroups.length} groups of similar-looking kanji</p>
      </div>
      
      <!-- Search -->
      <div class="mb-4">
        <input type="text" id="similarSearchInput" placeholder="Search by kanji or group name..." 
          class="w-full p-3 rounded-xl bg-slate-800 text-white border border-slate-600 focus:border-orange-500 focus:outline-none"
          value="${app.similarFilter.search || ''}">
      </div>
      
      <!-- Similar Groups -->
      ${groups.length === 0 ? `
        <div class="text-center py-8">
          <p class="text-slate-400">No groups found</p>
        </div>
      ` : `
        <div class="space-y-2">
          ${groups.map(group => {
            const kanjiList = parseKanjiList(group.kanji_list);
            return `
              <button data-similar-group-id="${group.id}" class="w-full p-4 bg-slate-800 rounded-xl text-left hover:bg-slate-700 transition-all">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-white font-bold mb-2">${group.group_name || 'Similar Group'}</h3>
                    <div class="flex gap-2 flex-wrap">
                      ${kanjiList.slice(0, 6).map(k => `
                        <span class="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white font-bold">${k}</span>
                      `).join('')}
                      ${kanjiList.length > 6 ? `<span class="text-slate-400 text-sm self-center">+${kanjiList.length - 6} more</span>` : ''}
                    </div>
                  </div>
                  <span class="text-slate-500">→</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function renderSimilarDetail(app) {
  const group = app.selectedSimilarGroup;
  const kanjiList = parseKanjiList(group.kanji_list);
  
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <!-- Back Button -->
      <button id="backToSimilarListBtn" class="text-slate-400 hover:text-white mb-4 flex items-center gap-2">
        ← Back to Similar Groups
      </button>
      
      <!-- Group Header -->
      <div class="bg-slate-800 rounded-2xl p-5 mb-4">
        <h2 class="text-white text-2xl font-bold">${group.group_name || 'Similar Kanji'}</h2>
        <p class="text-slate-400">${kanjiList.length} kanji in this group</p>
      </div>
      
      <!-- Kanji Grid -->
      <div class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mb-4">
        ${kanjiList.map(kanji => `
          <div class="bg-slate-800 rounded-xl p-4 text-center hover:bg-slate-700 transition-all">
            <div class="text-white text-3xl font-bold mb-1">${kanji}</div>
          </div>
        `).join('')}
      </div>
      
      <!-- Notes -->
      ${group.notes ? `
        <div class="bg-slate-800 rounded-xl p-4">
          <h3 class="text-white font-bold mb-2">Notes</h3>
          <p class="text-slate-300">${group.notes}</p>
        </div>
      ` : ''}
      
      <!-- Comparison Tips -->
      ${group.comparison_tips ? `
        <div class="bg-slate-800 rounded-xl p-4 mt-4">
          <h3 class="text-white font-bold mb-2">💡 How to Remember</h3>
          <p class="text-slate-300">${group.comparison_tips}</p>
        </div>
      ` : ''}
    </div>
  `;
}
