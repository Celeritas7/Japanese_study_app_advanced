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
  
  if (app.storyFilter) {
    const search = app.storyFilter.toLowerCase();
    groups = groups.filter(g => 
      g.group_kanji?.includes(app.storyFilter) ||
      g.group_meaning?.toLowerCase().includes(search)
    );
  }
  
  return `
    <div class="p-4 animate-fadeIn">
      <div class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-5 mb-4 text-white">
        <h2 class="text-xl font-bold mb-1">Kanji Stories</h2>
        <p class="opacity-80 text-sm">${app.storyGroups.length} groups - ${app.stories.length} stories</p>
      </div>
      
      <div class="mb-4">
        <input type="text" id="storySearchInput" placeholder="Search by kanji or meaning..." 
          class="w-full p-3 rounded-xl bg-slate-800 text-white border border-slate-600 focus:border-purple-500 focus:outline-none"
          value="${app.storyFilter}">
      </div>
      
      ${groups.length === 0 ? `
        <div class="text-center py-8">
          <p class="text-slate-400">No stories found</p>
        </div>
      ` : `
        <div class="space-y-2">
          ${groups.map(group => `
            <button data-story-group-id="${group.id}" class="w-full p-4 bg-slate-800 rounded-xl text-left hover:bg-slate-700 transition-all">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                  ${group.group_number || '#'}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-white font-bold text-lg">${group.group_kanji || ''}</span>
                  </div>
                  <p class="text-slate-400 text-sm truncate">${group.group_meaning || ''}</p>
                </div>
                <span class="text-slate-500">-></span>
              </div>
            </button>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function renderStoryDetail(app) {
  const group = app.selectedStoryGroup;
  const groupStories = app.stories.filter(s => 
    group.group_kanji?.includes(s.kanji) || 
    s.group_number === group.group_number
  );
  
  return `
    <div class="p-4 animate-fadeIn">
      <button id="backToStoryListBtn" class="text-slate-400 hover:text-white mb-4"><- Back to Stories</button>
      
      <div class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-5 mb-4 text-white">
        <div class="flex items-center gap-3 mb-2">
          <span class="px-3 py-1 bg-white/20 rounded-lg text-sm">Group ${group.group_number || '#'}</span>
        </div>
        <h2 class="text-2xl font-bold mb-1">${group.group_kanji || ''}</h2>
        <p class="opacity-80">${group.group_meaning || ''}</p>
      </div>
      
      ${group.group_story ? `
        <div class="bg-slate-800 rounded-xl p-4 mb-4">
          <h3 class="text-white font-bold mb-2">Group Story</h3>
          <p class="text-slate-300 leading-relaxed">${group.group_story}</p>
        </div>
      ` : ''}
      
      ${groupStories.length > 0 ? `
        <div class="space-y-3">
          ${groupStories.map(story => `
            <div class="bg-slate-800 rounded-xl p-4">
              <div class="flex items-start gap-4">
                <div class="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                  ${story.kanji}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-white font-bold">${story.meaning || ''}</span>
                    ${story.frame_number ? `<span class="text-slate-500 text-sm">#${story.frame_number}</span>` : ''}
                  </div>
                  ${story.onyomi || story.kunyomi ? `
                    <p class="text-slate-400 text-sm mb-2">
                      ${story.onyomi ? `On: ${story.onyomi}` : ''} 
                      ${story.kunyomi ? `Kun: ${story.kunyomi}` : ''}
                    </p>
                  ` : ''}
                  ${story.story ? `
                    <p class="text-slate-300 text-sm leading-relaxed">${story.story}</p>
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="text-center py-8">
          <p class="text-slate-400">No individual stories for this group</p>
        </div>
      `}
    </div>
  `;
}
