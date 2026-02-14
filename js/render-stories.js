// JLPT Vocabulary Master - Stories Tab Render Functions

import { parseKanjiList } from './utils.js';

export function renderStoriesTab(app) {
  if (app.selectedStoryGroup) {
    return renderStoryDetail(app);
  }
  return renderStoryList(app);
}

function renderStoryList(app) {
  let groups = app.storyGroups;
  
  // Filter by search
  if (app.storyFilter) {
    const search = app.storyFilter.toLowerCase();
    groups = groups.filter(g => 
      g.group_kanji?.includes(app.storyFilter) ||
      g.group_meaning?.toLowerCase().includes(search)
    );
  }
  
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <!-- Header -->
      <div class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-5 mb-4 text-white">
        <h2 class="text-xl font-bold mb-1">📖 Kanji Stories</h2>
        <p class="opacity-80 text-sm">${app.storyGroups.length} groups • ${app.stories.length} stories</p>
      </div>
      
      <!-- Search -->
      <div class="mb-4">
        <input type="text" id="storySearchInput" placeholder="Search by kanji or meaning..." 
          class="w-full p-3 rounded-xl bg-slate-800 text-white border border-slate-600 focus:border-purple-500 focus:outline-none"
          value="${app.storyFilter || ''}">
      </div>
      
      <!-- Story Groups -->
      ${groups.length === 0 ? `
        <div class="text-center py-8">
          <p class="text-slate-400">No stories found</p>
        </div>
      ` : `
        <div class="space-y-2">
          ${groups.map(group => {
            const storiesInGroup = app.stories.filter(s => s.group_id === group.id);
            return `
              <button data-story-group-id="${group.id}" class="w-full p-4 bg-slate-800 rounded-xl text-left hover:bg-slate-700 transition-all">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                      ${group.group_kanji || '?'}
                    </div>
                    <div>
                      <h3 class="text-white font-bold">${group.group_meaning || 'Story Group'}</h3>
                      <p class="text-slate-400 text-sm">Group ${group.group_number} • ${storiesInGroup.length} stories</p>
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

function renderStoryDetail(app) {
  const group = app.selectedStoryGroup;
  const stories = app.stories.filter(s => s.group_id === group.id);
  
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <!-- Back Button -->
      <button id="backToStoryListBtn" class="text-slate-400 hover:text-white mb-4 flex items-center gap-2">
        ← Back to Stories
      </button>
      
      <!-- Group Header -->
      <div class="bg-slate-800 rounded-2xl p-5 mb-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold">
            ${group.group_kanji || '?'}
          </div>
          <div>
            <h2 class="text-white text-xl font-bold">${group.group_meaning || 'Story Group'}</h2>
            <p class="text-slate-400">Group ${group.group_number} • ${stories.length} stories</p>
          </div>
        </div>
      </div>
      
      <!-- Stories -->
      ${stories.length === 0 ? `
        <div class="text-center py-8">
          <p class="text-slate-400">No stories in this group</p>
        </div>
      ` : `
        <div class="space-y-3">
          ${stories.map((story, idx) => `
            <div class="bg-slate-800 rounded-xl p-4">
              <div class="flex items-center gap-3 mb-3">
                <span class="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">${idx + 1}</span>
                <span class="text-2xl font-bold text-white">${story.kanji || ''}</span>
                <span class="text-slate-400">${story.reading || ''}</span>
              </div>
              <p class="text-slate-300 leading-relaxed">${story.story || 'No story available'}</p>
              ${story.meaning ? `<p class="text-slate-400 text-sm mt-2">Meaning: ${story.meaning}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}
