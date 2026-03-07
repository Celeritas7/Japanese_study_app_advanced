// JLPT Vocabulary Master - Stories Tab + Story Overlay + Alert Form

import { escapeHtml } from './utils.js';

export function renderStoriesTab(app) {
  if (app.selectedStoryGroup) return renderStoryDetail(app);
  return renderStoryList(app);
}

function renderStoryList(app) {
  let groups = app.storyGroups;
  const searchTerm = app.storyFilter;
  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    groups = groups.filter(g => g.group_kanji?.includes(searchTerm) || g.group_meaning?.toLowerCase().includes(search));
  }
  let kanjiResults = [];
  if (searchTerm && searchTerm.length > 0) {
    const search = searchTerm.toLowerCase();
    kanjiResults = app.stories.filter(s => s.kanji?.includes(searchTerm) || s.meaning?.toLowerCase().includes(search) || s.onyomi?.includes(searchTerm) || s.kunyomi?.includes(searchTerm)).slice(0, 30);
  }
  let wordResults = [];
  if (searchTerm && searchTerm.length > 0) {
    const search = searchTerm.toLowerCase();
    wordResults = app.vocabulary.filter(w => w.kanji?.includes(searchTerm) || w.hiragana?.includes(searchTerm) || w.meaning?.toLowerCase().includes(search)).slice(0, 20);
  }
  const hasSearch = searchTerm && searchTerm.length > 0;
  const showMode = hasSearch ? app.storySearchMode : 'groups';

  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <div class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-5 mb-4 text-white">
        <h2 class="text-xl font-bold mb-1">📖 Kanji Stories</h2>
        <p class="opacity-80 text-sm">${app.storyGroups.length} groups • ${app.stories.length} stories</p>
      </div>
      <div class="mb-3">
        <input type="text" id="storySearchInput" autocomplete="off" placeholder="Search kanji, word, reading, or meaning..." value="${app.storyFilter || ''}" class="w-full p-3 rounded-xl bg-slate-800 text-white border border-slate-600 focus:border-purple-500 focus:outline-none">
      </div>
      ${hasSearch ? `
        <div class="flex gap-2 mb-4">
          <button data-story-search-mode="groups" class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${showMode === 'groups' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}">Groups (${groups.length})</button>
          <button data-story-search-mode="kanji" class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${showMode === 'kanji' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}">Kanji (${kanjiResults.length})</button>
          <button data-story-search-mode="words" class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${showMode === 'words' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}">Words (${wordResults.length})</button>
        </div>
      ` : ''}
      ${showMode === 'groups' ? renderGroupResults(groups, app) : ''}
      ${showMode === 'kanji' ? renderKanjiResults(kanjiResults, app) : ''}
      ${showMode === 'words' ? renderWordResults(wordResults, app) : ''}
    </div>
  `;
}

function renderGroupResults(groups, app) {
  if (groups.length === 0) return '<p class="text-slate-500 text-center py-4">No matching groups</p>';
  return `<div class="space-y-2">${groups.map(group => {
    const cnt = app.stories.filter(s => s.group_id === group.id || s.group_kanji === group.group_kanji).length;
    return `<button data-story-group-id="${group.id}" class="w-full p-4 bg-slate-800 rounded-xl text-left hover:bg-slate-700 transition-all">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">${group.group_kanji || '?'}</div>
          <div><h3 class="text-white font-bold">${group.group_meaning || 'Story Group'}</h3><p class="text-slate-400 text-sm">Group ${group.group_number} • ${cnt} stories</p></div>
        </div>
        <span class="text-slate-500">→</span>
      </div>
    </button>`;
  }).join('')}</div>`;
}

function renderKanjiResults(kanjiResults, app) {
  if (kanjiResults.length === 0) return '<p class="text-slate-500 text-center py-4">No matching kanji stories</p>';
  return `<div class="space-y-2">${kanjiResults.map(s => {
    const group = app.storyGroups.find(g => g.group_kanji === s.group_kanji);
    return `<div class="bg-slate-800 rounded-xl p-3"><div class="flex items-start gap-3">
      <div class="text-3xl font-bold text-white w-12 text-center flex-shrink-0">${s.kanji}</div>
      <div class="flex-1 min-w-0">
        <div class="text-amber-300 font-semibold text-sm">${s.meaning || ''}</div>
        <div class="flex gap-3 text-xs mt-0.5">${s.onyomi ? `<span class="text-purple-400">音 ${s.onyomi}</span>` : ''}${s.kunyomi ? `<span class="text-emerald-400">訓 ${s.kunyomi}</span>` : ''}</div>
        ${s.story ? `<div class="text-slate-400 text-xs mt-1 leading-relaxed" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${s.story}</div>` : ''}
      </div>
      ${group ? `<button data-story-group-id="${group.id}" class="flex-shrink-0 bg-purple-500/20 border border-purple-500/40 rounded-lg px-2 py-1.5 text-center hover:bg-purple-500/30 transition-all"><div class="text-lg font-bold text-purple-300">${s.group_kanji}</div><div class="text-[9px] text-purple-400">group</div></button>` : ''}
    </div></div>`;
  }).join('')}</div>`;
}

function renderWordResults(wordResults, app) {
  if (wordResults.length === 0) return '<p class="text-slate-500 text-center py-4">No matching words</p>';
  return `<div class="space-y-2">${wordResults.map(w => {
    const kc = [...(w.kanji || '')].filter(c => /[\u4e00-\u9faf]/.test(c));
    const hasStory = kc.some(k => app.stories.find(s => s.kanji === k));
    return `<div class="bg-slate-800 rounded-xl p-3 flex items-center justify-between">
      <div class="flex items-center gap-3"><span class="text-xl font-bold text-white">${w.kanji}</span><span class="text-slate-400 text-sm">${w.hiragana || ''}</span><span class="text-amber-300 text-xs">${w.meaning || ''}</span></div>
      ${hasStory ? `<button data-open-story="${escapeHtml(w.kanji)}" data-story-hiragana="${w.hiragana || ''}" data-story-meaning="${escapeHtml(w.meaning)}" class="text-purple-400 hover:text-purple-300 text-xs px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 font-semibold flex-shrink-0">📖 Story</button>` : `<span class="text-slate-600 text-xs px-2 py-1">no story</span>`}
    </div>`;
  }).join('')}</div>`;
}

function renderStoryDetail(app) {
  const group = app.selectedStoryGroup;
  const stories = app.stories.filter(s => s.group_id === group.id || s.group_kanji === group.group_kanji);
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <button id="backToStoryListBtn" class="text-slate-400 hover:text-white mb-4 flex items-center gap-2">← Back to Stories</button>
      <div class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-5 mb-4 text-white text-center">
        <div class="text-5xl font-bold mb-2">${group.group_kanji || '?'}</div>
        <div class="text-lg">${group.group_meaning || ''}</div>
        ${group.group_story ? `<p class="text-sm opacity-80 mt-2">${group.group_story}</p>` : ''}
      </div>
      <div class="space-y-3">${stories.map(story => `
        <div class="bg-slate-800 rounded-xl p-4">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-3">
              <span class="text-3xl text-white font-bold">${story.kanji}</span>
              ${story.frame_number ? `<span class="text-slate-500 text-sm">#${story.frame_number}</span>` : ''}
            </div>
            <div class="text-right text-sm">${story.onyomi ? `<div class="text-purple-400">${story.onyomi}</div>` : ''}${story.kunyomi ? `<div class="text-green-400">${story.kunyomi}</div>` : ''}</div>
          </div>
          <div class="text-amber-300 font-semibold mb-2">${story.meaning || ''}</div>
          <div class="text-slate-300 text-sm leading-relaxed">${story.story || ''}</div>
          <div class="flex items-center justify-between mt-2"><div></div>
            <button data-flag-story="${story.kanji}" data-flag-group="${story.group_kanji || ''}" class="text-slate-500 hover:text-amber-400 text-xs px-2 py-0.5 rounded bg-slate-700 border border-slate-600 hover:border-amber-500 transition-all">⚠️ Flag Issue</button>
          </div>
        </div>
      `).join('')}</div>
    </div>
  `;
}

// ===== STORY OVERLAY =====
export function renderStoryOverlay(app) {
  if (!app.storyOverlay) return '';
  const { word, step, expandedPart, kanjiParts } = app.storyOverlay;
  let content = '';
  if (step === 2) content = renderBreakdown(app);
  else if (step === 3) content = renderGroupView(app);
  else content = '<div class="text-center text-slate-400 py-8">No kanji found</div>';
  return `
    <div class="story-overlay" id="storyOverlayBg">
      <div class="p-4 max-w-lg mx-auto">
        <div class="flex justify-between items-center mb-4">
          <div class="text-white font-bold text-lg">📖 ${word.kanji || ''} <span class="text-slate-400 text-sm font-normal">${word.hiragana || ''}</span></div>
          <button id="closeStoryOverlayBtn" class="text-slate-400 hover:text-white text-2xl px-2">✕</button>
        </div>
        ${step === 3 ? '<button id="storyBackToBreakdownBtn" class="text-purple-400 hover:text-purple-300 mb-4 text-sm">← Back to breakdown</button>' : ''}
        ${content}
      </div>
    </div>
  `;
}

function renderBreakdown(app) {
  const { kanjiParts, expandedPart } = app.storyOverlay;
  const tabs = kanjiParts.map(k => `<button data-story-part="${k}" class="px-4 py-2 rounded-lg font-bold text-lg transition-all ${expandedPart === k ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">${k}</button>`).join('');
  const sd = app.findStoryForKanji(expandedPart);
  const group = app.findGroupForKanji(expandedPart);
  return `
    <div class="flex gap-2 mb-4 flex-wrap">${tabs}</div>
    ${sd ? `
      <div class="bg-slate-800 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3"><span class="text-4xl font-bold text-white">${sd.kanji}</span>${sd.frame_number ? `<span class="text-slate-500 text-sm">#${sd.frame_number}</span>` : ''}</div>
          <div class="text-right text-sm">${sd.onyomi ? `<div class="text-purple-400">音 ${sd.onyomi}</div>` : ''}${sd.kunyomi ? `<div class="text-emerald-400">訓 ${sd.kunyomi}</div>` : ''}</div>
        </div>
        <div class="text-amber-300 font-semibold">${sd.meaning || ''}</div>
        ${sd.story ? `
          <div class="bg-slate-900/60 rounded-lg p-3" style="border-left:3px solid #f59e0b">
            <div class="flex items-center justify-between mb-1">
              <div class="text-amber-500 text-[10px] uppercase tracking-wider font-bold">Mnemonic Story</div>
              <button data-flag-story="${sd.kanji}" data-flag-group="${sd.group_kanji || ''}" class="text-slate-500 hover:text-amber-400 text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-600 hover:border-amber-500 transition-all">⚠️ Flag</button>
            </div>
            <div class="text-slate-200 text-sm leading-relaxed">${sd.story}</div>
          </div>` : '<div class="text-slate-500 text-sm">No story available</div>'}
        ${group ? `<button data-story-go-group="${group.group_kanji}" data-story-highlight="${expandedPart}" class="w-full py-3 rounded-xl text-center transition-all story-btn">View ${group.group_kanji} group (${group.group_meaning || ''}) →</button>` : ''}
      </div>
    ` : `<div class="bg-slate-800 rounded-xl p-6 text-center"><div class="text-4xl mb-2">${expandedPart}</div><p class="text-slate-400">No story found</p></div>`}
  `;
}

function renderGroupView(app) {
  const { groupKey, highlightKanji } = app.storyOverlay;
  const group = app.storyGroups.find(g => g.group_kanji === groupKey);
  const members = app.getGroupMembersForKanji(groupKey);
  if (!group) return '<div class="text-slate-400 text-center py-8">Group not found</div>';
  return `
    <div class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-5 mb-4 text-white text-center">
      <div class="text-4xl font-bold mb-1">${group.group_kanji || '?'}</div>
      <div class="text-lg">${group.group_meaning || ''}</div>
      ${group.group_story ? `<p class="text-sm opacity-80 mt-2">${group.group_story}</p>` : ''}
    </div>
    <div class="space-y-3">${members.map(m => {
      const isCur = m.kanji === highlightKanji;
      return `<div class="rounded-xl p-4 relative ${isCur ? 'story-member-current' : 'story-member-other'}">
        ${isCur ? '<div class="story-studying-tag">STUDYING</div>' : ''}
        <div class="flex items-center gap-3 mb-2"><span class="text-2xl font-bold text-white">${m.kanji}</span><span class="text-amber-300 font-semibold text-sm">${m.meaning || ''}</span></div>
        <div class="flex gap-2 text-xs mb-2">${m.onyomi ? `<span class="text-purple-400">音 ${m.onyomi}</span>` : ''}${m.kunyomi ? `<span class="text-emerald-400">訓 ${m.kunyomi}</span>` : ''}</div>
        ${m.story ? `<div class="text-slate-400 text-xs leading-relaxed">${m.story}</div>` : ''}
        <div class="flex items-center justify-between mt-1">
          ${m.frame_number ? `<div class="text-slate-600 text-xs">#${m.frame_number}</div>` : '<div></div>'}
          <button data-flag-story="${m.kanji}" data-flag-group="${m.group_kanji || ''}" class="text-slate-600 hover:text-amber-400 text-[10px] px-1.5 py-0.5 rounded bg-slate-800/50 border border-slate-700 hover:border-amber-500 transition-all">⚠️ Flag</button>
        </div>
      </div>`;
    }).join('')}</div>
  `;
}

// ===== STORY ALERT FORM =====
export function renderStoryAlertForm(app) {
  if (!app.storyAlertTarget) return '';
  const { kanji, groupKanji } = app.storyAlertTarget;
  return `
    <div class="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" id="storyAlertOverlayBg">
      <div class="bg-slate-800 rounded-2xl p-5 w-full max-w-sm animate-slideIn border border-slate-600">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-white font-bold text-lg">⚠️ Flag Story Issue</h3>
          <button id="closeStoryAlertBtn" class="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <div class="bg-slate-900 rounded-xl p-3 mb-4 flex items-center gap-3">
          <span class="text-3xl font-bold text-white">${kanji}</span>
          ${groupKanji ? `<span class="text-slate-500">in group</span><span class="text-purple-400 font-bold">${groupKanji}</span>` : ''}
        </div>
        <div class="mb-4">
          <label class="text-slate-400 text-xs block mb-2">Issue Type</label>
          <div class="grid grid-cols-3 gap-2">
            ${[{key:'incorrect',label:'❌ Wrong',desc:'Story is wrong'},{key:'incomplete',label:'📝 Incomplete',desc:'Missing info'},{key:'unclear',label:'❓ Unclear',desc:'Hard to understand'}].map(t => `
              <button data-alert-type="${t.key}" class="p-2 rounded-lg text-center transition-all text-xs ${app.storyAlertType === t.key ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
                <div class="text-base mb-0.5">${t.label.split(' ')[0]}</div><div class="opacity-70">${t.desc}</div>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="mb-4">
          <label class="text-slate-400 text-xs block mb-2">Comment</label>
          <textarea id="storyAlertCommentInput" rows="3" placeholder="What needs fixing?" class="w-full bg-slate-900 text-white px-3 py-2 rounded-xl border border-slate-600 focus:border-amber-500 focus:outline-none text-sm resize-none">${app.storyAlertComment || ''}</textarea>
        </div>
        <button id="submitStoryAlertBtn" class="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50" ${app.storyAlertSaving ? 'disabled' : ''}>
          ${app.storyAlertSaving ? 'Saving...' : '⚠️ Submit Alert'}
        </button>
      </div>
    </div>
  `;
}
