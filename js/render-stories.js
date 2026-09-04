// JLPT Vocabulary Master — Stories Tab + Story Overlay + Alert Form
// Drop-in replacement for js/render-stories.js
//
// Reads the post-migration schema:
//   stories: kanji, role ('character'|'primitive'), variant, group_id, meaning, story,
//            components, onyomi_hint, kunyomi_hint, group_link, example_word, origin
//   groups:  group_kanji, group_component, group_persona, group_note, group_meaning, group_story
// frame_number is no longer read anywhere.
//
// All data-* hooks and element ids are unchanged, so events.js works as-is.

// Self-contained on purpose — no ./utils.js import, so this file drops in anywhere.
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (m) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

const KANJI_RE = /[\u3040-\u30ff\u4e00-\u9fff]+/g;
// tint Japanese runs inside English prose so stories stay scannable
const jp = (s) => escapeHtml(s || '').replace(KANJI_RE, '<span class="text-purple-300">$&</span>');

const membersOf = (app, group) =>
  app.stories.filter(s => (group.id != null && s.group_id === group.id) || (s.group_id == null && s.group_kanji === group.group_kanji));

const anchorOf = (g) => g.group_component || g.group_kanji || '?';

const roleTag = (s) => s.role === 'primitive'
  ? '<span class="text-[9px] uppercase tracking-wider font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 rounded px-1.5 py-0.5">primitive</span>'
  : '';

const readings = (s, size = 'text-xs') => `
  <div class="flex gap-3 ${size} mt-0.5">
    ${s.onyomi ? `<span class="text-purple-300">音 ${escapeHtml(s.onyomi)}</span>` : ''}
    ${s.kunyomi ? `<span class="text-emerald-300">訓 ${escapeHtml(s.kunyomi)}</span>` : ''}
  </div>`;

// component breakdown as chips: "日 sun + 月 moon"
function componentChips(components) {
  if (!components) return '';
  const parts = String(components).split(/[+＋]/).map(p => p.trim()).filter(Boolean);
  if (!parts.length) return '';
  return `<div class="flex flex-wrap items-center gap-1.5 mt-2">${parts.map((p, i) => `
    ${i ? '<span class="text-slate-600 text-xs">+</span>' : ''}
    <span class="text-xs text-slate-300 border border-dashed border-slate-600 rounded-lg px-2 py-1">${jp(p)}</span>
  `).join('')}</div>`;
}

// the reading hooks / group link / example word block
function extras(s) {
  const rows = [
    s.onyomi_hint && ['音 hook', s.onyomi_hint, 'text-purple-300'],
    s.kunyomi_hint && ['訓 hook', s.kunyomi_hint, 'text-emerald-300'],
    s.group_link && ['in its group', s.group_link, 'text-sky-300'],
    s.example_word && ['example', s.example_word, 'text-amber-300'],
  ].filter(Boolean);
  if (!rows.length) return '';
  return `<div class="mt-3 space-y-1.5">${rows.map(([label, text, colour]) => `
    <div class="flex gap-2 text-xs leading-relaxed">
      <span class="${colour} shrink-0 w-20 text-[10px] uppercase tracking-wider font-bold pt-0.5">${label}</span>
      <span class="text-slate-300 flex-1">${jp(text)}</span>
    </div>`).join('')}</div>`;
}

const flagBtn = (s, size = 'xs') => `<button data-flag-story="${escapeHtml(s.kanji)}" data-flag-group="${escapeHtml(s.group_kanji || '')}" class="text-slate-500 hover:text-amber-400 text-${size} px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:border-amber-500 transition-all">⚠️ Flag</button>`;

// ===================== TAB =====================

export function renderStoriesTab(app) {
  if (app.selectedStoryGroup) return renderStoryDetail(app);
  return renderStoryList(app);
}

function renderStoryList(app) {
  const nPrim = app.stories.filter(s => s.role === 'primitive').length;
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <div class="flex items-baseline justify-between mb-1">
        <h2 class="text-lg font-bold text-white">Kanji Stories</h2>
        <div class="text-xs text-slate-500 font-mono">${app.storyGroups.length} groups · ${app.stories.length - nPrim} kanji · ${nPrim} primitives</div>
      </div>
      <p class="text-xs text-slate-500 mb-4">Grouped by the component they share.</p>
      <div class="mb-3">
        <input type="text" id="storySearchInput" autocomplete="off" placeholder="Search kanji, word, reading, or meaning..." value="${app.storyFilter || ''}" class="w-full p-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-purple-500 focus:outline-none text-sm">
      </div>
      <div id="storySearchResults">${renderStorySearchResults(app)}</div>
    </div>`;
}

// Exported so events.js can call it for a surgical DOM update
export function renderStorySearchResults(app) {
  const searchTerm = app.storyFilter;
  let groups = app.storyGroups;
  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    groups = groups.filter(g => g.group_kanji?.includes(searchTerm)
      || g.group_component?.includes(searchTerm)
      || g.group_meaning?.toLowerCase().includes(search)
      || g.group_persona?.toLowerCase().includes(search));
  }
  let kanjiResults = [], wordResults = [];
  if (searchTerm) {
    const search = searchTerm.toLowerCase();
    kanjiResults = app.stories.filter(s => s.kanji?.includes(searchTerm)
      || s.meaning?.toLowerCase().includes(search)
      || s.onyomi?.includes(searchTerm) || s.kunyomi?.includes(searchTerm)).slice(0, 30);
    wordResults = app.vocabulary.filter(w => w.kanji?.includes(searchTerm)
      || w.hiragana?.includes(searchTerm) || w.meaning?.toLowerCase().includes(search)).slice(0, 20);
  }
  const hasSearch = !!searchTerm;
  const showMode = hasSearch ? app.storySearchMode : 'groups';
  const tab = (key, label, n) => `<button data-story-search-mode="${key}" class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${showMode === key ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}">${label} (${n})</button>`;
  return `
    ${hasSearch ? `<div class="flex gap-2 mb-4">${tab('groups', 'Groups', groups.length)}${tab('kanji', 'Kanji', kanjiResults.length)}${tab('words', 'Words', wordResults.length)}</div>` : ''}
    ${showMode === 'groups' ? renderGroupResults(groups, app) : ''}
    ${showMode === 'kanji' ? renderKanjiResults(kanjiResults, app) : ''}
    ${showMode === 'words' ? renderWordResults(wordResults, app) : ''}`;
}

function renderGroupResults(groups, app) {
  if (!groups.length) return '<p class="text-slate-500 text-center py-6 text-sm">No matching groups</p>';
  return `<div class="space-y-2">${groups.map(group => {
    const members = membersOf(app, group);
    const nPrim = members.filter(s => s.role === 'primitive').length;
    return `<button data-story-group-id="${group.id}" class="w-full p-3 bg-slate-800/70 rounded-xl text-left hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 transition-all flex items-center gap-3">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center text-2xl text-white bg-slate-900 border border-slate-700 shrink-0">${escapeHtml(anchorOf(group))}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <h3 class="text-white font-semibold text-sm truncate">${escapeHtml(group.group_meaning || 'Group')}</h3>
          ${group.group_note ? `<span class="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded px-1.5 py-0.5">${escapeHtml(group.group_note)}</span>` : ''}
        </div>
        ${group.group_persona
          ? `<p class="text-slate-400 text-xs mt-0.5 truncate">${escapeHtml(group.group_persona)}</p>`
          : `<p class="text-slate-600 text-xs mt-0.5">${members.length} entries${nPrim ? ` · ${nPrim} primitive` : ''}</p>`}
      </div>
      <span class="text-slate-600 shrink-0">→</span>
    </button>`;
  }).join('')}</div>`;
}

function renderKanjiResults(kanjiResults, app) {
  if (!kanjiResults.length) return '<p class="text-slate-500 text-center py-6 text-sm">No matching kanji stories</p>';
  return `<div class="space-y-2">${kanjiResults.map(s => {
    const group = app.storyGroups.find(g => g.id === s.group_id) || app.storyGroups.find(g => g.group_kanji === s.group_kanji);
    return `<div class="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60"><div class="flex items-start gap-3">
      <div class="text-3xl text-white w-11 text-center shrink-0">${escapeHtml(s.kanji)}</div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap"><span class="text-amber-300 font-semibold text-sm">${escapeHtml(s.meaning || '')}</span>${roleTag(s)}</div>
        ${readings(s)}
        ${s.story ? `<div class="text-slate-400 text-xs mt-1 leading-relaxed" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${escapeHtml(s.story)}</div>` : ''}
      </div>
      ${group ? `<button data-story-group-id="${group.id}" class="shrink-0 bg-slate-900 border border-slate-700 hover:border-purple-500/50 rounded-lg px-2 py-1.5 text-center transition-all"><div class="text-lg text-purple-300">${escapeHtml(anchorOf(group))}</div><div class="text-[9px] text-slate-500">group</div></button>` : ''}
    </div></div>`;
  }).join('')}</div>`;
}

function renderWordResults(wordResults, app) {
  if (!wordResults.length) return '<p class="text-slate-500 text-center py-6 text-sm">No matching words</p>';
  return `<div class="space-y-2">${wordResults.map(w => {
    const kc = [...(w.kanji || '')].filter(c => /[\u4e00-\u9faf]/.test(c));
    const hasStory = kc.some(k => app.stories.find(s => s.kanji === k));
    return `<div class="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0"><span class="text-xl text-white shrink-0">${escapeHtml(w.kanji)}</span><span class="text-slate-400 text-sm shrink-0">${escapeHtml(w.hiragana || '')}</span><span class="text-amber-300/90 text-xs truncate">${escapeHtml(w.meaning || '')}</span></div>
      ${hasStory
        ? `<button data-open-story="${escapeHtml(w.kanji)}" data-story-hiragana="${escapeHtml(w.hiragana || '')}" data-story-meaning="${escapeHtml(w.meaning)}" class="text-purple-300 hover:text-purple-200 text-xs px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 font-semibold shrink-0">📖 Story</button>`
        : `<span class="text-slate-600 text-xs px-2 py-1 shrink-0">no story</span>`}
    </div>`;
  }).join('')}</div>`;
}

// group header — the component and the image it carries, not a gradient
function groupHeader(group, memberCount) {
  return `
    <div class="rounded-2xl p-4 mb-4 bg-slate-800/70 border border-slate-700" style="border-left:3px solid #a855f7">
      <div class="flex items-start gap-4">
        <div class="text-5xl text-white leading-none shrink-0">${escapeHtml(anchorOf(group))}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <div class="text-white font-bold">${escapeHtml(group.group_meaning || 'Group')}</div>
            ${group.group_note ? `<span class="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded px-1.5 py-0.5">${escapeHtml(group.group_note)}</span>` : ''}
          </div>
          ${group.group_persona ? `<p class="text-slate-300 text-sm mt-1 leading-relaxed">${jp(group.group_persona)}</p>` : ''}
          <div class="text-[11px] text-slate-500 mt-1 font-mono">${memberCount} entries</div>
        </div>
      </div>
      ${group.group_story ? `<p class="text-slate-400 text-sm mt-3 leading-relaxed border-t border-slate-700/70 pt-3">${jp(group.group_story)}</p>` : ''}
    </div>`;
}

function renderStoryDetail(app) {
  const group = app.selectedStoryGroup;
  const members = membersOf(app, group);
  const chars = members.filter(s => s.role !== 'primitive');
  const prims = members.filter(s => s.role === 'primitive');
  const section = (title, list) => !list.length ? '' : `
    <div class="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-4 mb-2">${title}</div>
    <div class="space-y-3">${list.map(story => entryCard(story)).join('')}</div>`;
  return `
    <div class="p-4 animate-fadeIn flex-1 overflow-auto">
      <button id="backToStoryListBtn" class="text-slate-400 hover:text-white mb-4 flex items-center gap-2 text-sm">← Back to Stories</button>
      ${groupHeader(group, members.length)}
      ${section(`Characters · ${chars.length}`, chars)}
      ${section(`As a primitive element · ${prims.length}`, prims)}
      ${!members.length ? '<p class="text-slate-500 text-center py-6 text-sm">No entries in this group yet</p>' : ''}
    </div>`;
}

function entryCard(story) {
  const isPrim = story.role === 'primitive';
  return `
    <div class="bg-slate-800/70 rounded-xl p-4 border border-slate-700/60" ${isPrim ? 'style="border-left:3px solid #a855f7"' : ''}>
      <div class="flex items-start justify-between gap-3 mb-2">
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-3xl text-white shrink-0">${escapeHtml(story.kanji)}</span>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-amber-300 font-semibold text-sm">${escapeHtml(story.meaning || '')}</span>
              ${roleTag(story)}
              ${story.variant > 1 ? `<span class="text-[9px] text-slate-500 font-mono">entry ${story.variant}</span>` : ''}
            </div>
            ${readings(story)}
          </div>
        </div>
        ${flagBtn(story, '[10px]')}
      </div>
      ${componentChips(story.components)}
      ${story.story ? `<div class="text-slate-300 text-sm leading-relaxed mt-3">${jp(story.story)}</div>` : '<div class="text-slate-600 text-xs mt-2">No story yet</div>'}
      ${extras(story)}
    </div>`;
}

// ===================== OVERLAY =====================

export function renderStoryOverlay(app) {
  if (!app.storyOverlay) return '';
  const { word, step } = app.storyOverlay;
  let content = '<div class="text-center text-slate-400 py-8">No kanji found</div>';
  if (step === 2) content = renderBreakdown(app);
  else if (step === 3) content = renderGroupView(app);
  return `
    <div class="story-overlay" id="storyOverlayBg">
      <div class="p-4 max-w-lg mx-auto">
        <div class="flex justify-between items-center mb-4">
          <div class="text-white font-bold text-lg">📖 ${escapeHtml(word.kanji || '')} <span class="text-slate-400 text-sm font-normal">${escapeHtml(word.hiragana || '')}</span></div>
          <button id="closeStoryOverlayBtn" class="text-slate-400 hover:text-white text-2xl px-2">✕</button>
        </div>
        ${step === 3 ? '<button id="storyBackToBreakdownBtn" class="text-purple-300 hover:text-purple-200 mb-4 text-sm">← Back to breakdown</button>' : ''}
        ${content}
      </div>
    </div>`;
}

function renderBreakdown(app) {
  const { kanjiParts, expandedPart } = app.storyOverlay;
  const tabs = kanjiParts.map(k => `<button data-story-part="${escapeHtml(k)}" class="px-4 py-2 rounded-lg text-lg transition-all ${expandedPart === k ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}">${escapeHtml(k)}</button>`).join('');
  const sd = app.findStoryForKanji(expandedPart);
  const group = app.findGroupForKanji(expandedPart);
  return `
    <div class="flex gap-2 mb-4 flex-wrap">${tabs}</div>
    ${sd ? `
      <div class="bg-slate-800/70 rounded-xl p-4 border border-slate-700">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-4xl text-white shrink-0">${escapeHtml(sd.kanji)}</span>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap"><span class="text-amber-300 font-semibold">${escapeHtml(sd.meaning || '')}</span>${roleTag(sd)}</div>
              ${readings(sd, 'text-[11px]')}
            </div>
          </div>
          ${flagBtn(sd)}
        </div>
        ${componentChips(sd.components)}
        ${sd.story
          ? `<div class="bg-slate-900/60 rounded-lg p-3 mt-3" style="border-left:3px solid #f59e0b">
               <div class="text-amber-500 text-[10px] uppercase tracking-wider font-bold mb-1">Mnemonic</div>
               <div class="text-slate-200 text-sm leading-relaxed">${jp(sd.story)}</div>
             </div>`
          : `<div class="text-slate-500 text-sm mt-3 mb-2">No story available</div>
             <button data-request-story="${escapeHtml(sd.kanji)}" class="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/25 transition-all">📝 Request Story</button>`}
        ${extras(sd)}
        ${group ? `<button data-story-go-group="${escapeHtml(group.group_kanji)}" data-story-highlight="${escapeHtml(expandedPart)}" class="w-full py-3 rounded-xl text-center transition-all story-btn mt-3">View ${escapeHtml(anchorOf(group))} group${group.group_meaning ? ` (${escapeHtml(group.group_meaning)})` : ''} →</button>` : ''}
      </div>`
    : `<div class="bg-slate-800/70 rounded-xl p-6 text-center border border-slate-700">
        <div class="text-4xl mb-2 text-white">${escapeHtml(expandedPart)}</div>
        <p class="text-slate-400 mb-4 text-sm">No story found</p>
        <button data-request-story="${escapeHtml(expandedPart)}" class="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/25 transition-all">📝 Request Story</button>
      </div>`}`;
}

function renderGroupView(app) {
  const { groupKey, highlightKanji } = app.storyOverlay;
  const group = app.storyGroups.find(g => g.group_kanji === groupKey);
  if (!group) return '<div class="text-slate-400 text-center py-8">Group not found</div>';
  const members = app.getGroupMembersForKanji(groupKey);
  return `
    ${groupHeader(group, members.length)}
    <div class="space-y-3">${members.map(m => {
      const isCur = m.kanji === highlightKanji;
      return `<div class="rounded-xl p-4 relative ${isCur ? 'story-member-current' : 'story-member-other'}">
        ${isCur ? '<div class="story-studying-tag">STUDYING</div>' : ''}
        <div class="flex items-center gap-3 mb-1 flex-wrap">
          <span class="text-2xl text-white">${escapeHtml(m.kanji)}</span>
          <span class="text-amber-300 font-semibold text-sm">${escapeHtml(m.meaning || '')}</span>
          ${roleTag(m)}
        </div>
        ${readings(m, 'text-[11px]')}
        ${componentChips(m.components)}
        ${m.story ? `<div class="text-slate-400 text-xs leading-relaxed mt-2">${jp(m.story)}</div>` : ''}
        ${extras(m)}
        <div class="flex justify-end mt-2">${flagBtn(m, '[10px]')}</div>
      </div>`;
    }).join('')}</div>`;
}

// ===================== ALERT FORM =====================

export function renderStoryAlertForm(app) {
  if (!app.storyAlertTarget) return '';
  const { kanji, groupKanji } = app.storyAlertTarget;
  const types = [
    { key: 'incorrect', icon: '❌', desc: 'Story is wrong' },
    { key: 'incomplete', icon: '📝', desc: 'Missing info' },
    { key: 'unclear', icon: '❓', desc: 'Hard to understand' },
  ];
  return `
    <div class="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4" id="storyAlertOverlayBg">
      <div class="bg-slate-800 rounded-2xl p-5 w-full max-w-sm animate-slideIn border border-slate-600">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-white font-bold text-lg">⚠️ Flag Story Issue</h3>
          <button id="closeStoryAlertBtn" class="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <div class="bg-slate-900 rounded-xl p-3 mb-4 flex items-center gap-3">
          <span class="text-3xl text-white">${escapeHtml(kanji)}</span>
          ${groupKanji ? `<span class="text-slate-500 text-sm">in group</span><span class="text-purple-300 font-bold">${escapeHtml(groupKanji)}</span>` : ''}
        </div>
        <div class="mb-4">
          <label class="text-slate-400 text-xs block mb-2">Issue Type</label>
          <div class="grid grid-cols-3 gap-2">
            ${types.map(t => `<button data-alert-type="${t.key}" class="p-2 rounded-lg text-center transition-all text-xs ${app.storyAlertType === t.key ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
              <div class="text-base mb-0.5">${t.icon}</div><div class="opacity-70">${t.desc}</div></button>`).join('')}
          </div>
        </div>
        <div class="mb-4">
          <label class="text-slate-400 text-xs block mb-2">Comment</label>
          <textarea id="storyAlertCommentInput" rows="3" placeholder="What needs fixing?" class="w-full bg-slate-900 text-white px-3 py-2 rounded-xl border border-slate-600 focus:border-amber-500 focus:outline-none text-sm resize-none">${escapeHtml(app.storyAlertComment || '')}</textarea>
        </div>
        <button id="submitStoryAlertBtn" class="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 disabled:opacity-50" ${app.storyAlertSaving ? 'disabled' : ''}>
          ${app.storyAlertSaving ? 'Saving...' : '⚠️ Submit Alert'}
        </button>
      </div>
    </div>`;
}
