// JLPT Vocabulary Master - Word Relations Tab
// Folder-based navigation: Folders -> Group List -> Group Detail

import { escapeHtml } from './utils.js';
import { getMarking } from './utils.js';

const GROUP_TYPE_INFO = {
  alt_kanji:       { label: 'Alt Kanji',     icon: '漢', color: 'bg-indigo-500',  gradFrom: 'from-indigo-600', gradTo: 'to-blue-600',   hex: '#6366f1', desc: 'Same reading, different kanji' },
  alt_reading:     { label: 'Alt Reading',   icon: 'あ', color: 'bg-purple-500',  gradFrom: 'from-purple-600', gradTo: 'to-pink-600',   hex: '#a855f7', desc: 'Same kanji, different readings' },
  synonym:         { label: 'Synonym',       icon: '≈', color: 'bg-amber-500',   gradFrom: 'from-amber-500',  gradTo: 'to-orange-600', hex: '#f59e0b', desc: 'Similar meaning words' },
  near_synonym:    { label: 'Near Synonym',  icon: '≅', color: 'bg-teal-500',    gradFrom: 'from-teal-500',   gradTo: 'to-emerald-600',hex: '#14b8a6', desc: 'Almost same meaning, different usage' },
  context_variant: { label: 'Context',       icon: '文', color: 'bg-rose-500',    gradFrom: 'from-rose-500',   gradTo: 'to-red-600',    hex: '#f43f5e', desc: 'Same root in different compounds' },
};

// ===== STUDIED GROUPS HELPER =====

function getStudiedGroups(app) {
  if (!app.relationsStudiedGroups) {
    try {
      const stored = localStorage.getItem('relationsStudied');
      app.relationsStudiedGroups = new Set(stored ? JSON.parse(stored) : []);
    } catch {
      app.relationsStudiedGroups = new Set();
    }
  }
  return app.relationsStudiedGroups;
}

// ===== MAIN ROUTER =====

export function renderRelationsTab(app) {
  if (app.selectedWordGroup) return renderGroupDetail(app);
  if (app.relationsCategory) return renderGroupList(app);
  return renderFolderView(app);
}

// ===== LEVEL 1: FOLDER VIEW =====

function renderFolderView(app) {
  const groups = app.wordGroups || [];
  const typeCounts = {};
  Object.keys(GROUP_TYPE_INFO).forEach(k => typeCounts[k] = 0);
  groups.forEach(g => { if (typeCounts[g.group_type] !== undefined) typeCounts[g.group_type]++; });
  const totalGroups = groups.length;
  const totalLinks = (app.wordGroupMembers || []).length;

  const types = Object.entries(GROUP_TYPE_INFO);
  const gridTypes = types.slice(0, 4);
  const lastType = types[4];

  return `
    <div class="flex-1 overflow-auto hide-scrollbar p-4">
      <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 mb-4 text-white">
        <h2 class="text-xl font-bold mb-1">🔗 Word Relations</h2>
        <p class="opacity-80 text-sm">${totalGroups} groups · ${totalLinks} word links · 5 categories</p>
      </div>
      <div class="grid grid-cols-2 gap-3 mb-3">
        ${gridTypes.map(([type, info]) => `
          <button data-rel-folder="${type}" class="p-5 bg-slate-800 border border-slate-700 rounded-xl text-center hover:bg-slate-700 hover:border-slate-600 transition-all">
            <div class="w-12 h-12 ${info.color} rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">${info.icon}</div>
            <div class="text-white font-bold text-sm mb-0.5">${info.label}</div>
            <div class="text-slate-500 text-[10px] mb-2">${info.desc}</div>
            <div class="text-lg font-bold" style="color:${info.hex}">${typeCounts[type] || 0}</div>
          </button>
        `).join('')}
      </div>
      ${lastType ? (() => {
        const [type, info] = lastType;
        return `
          <button data-rel-folder="${type}" class="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 hover:border-slate-600 transition-all">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 ${info.color} rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0">${info.icon}</div>
              <div class="text-left flex-1">
                <div class="text-white font-bold text-sm">${info.label}</div>
                <div class="text-slate-500 text-[10px]">${info.desc}</div>
              </div>
              <div class="text-lg font-bold" style="color:${info.hex}">${typeCounts[type] || 0}</div>
            </div>
          </button>
        `;
      })() : ''}
    </div>
  `;
}

// ===== LEVEL 2: GROUP LIST =====

function renderGroupList(app) {
  const categoryType = app.relationsCategory;
  const info = GROUP_TYPE_INFO[categoryType] || GROUP_TYPE_INFO.synonym;
  const groups = (app.wordGroups || []).filter(g => g.group_type === categoryType);
  const search = app.relationsSearch || '';
  const studied = getStudiedGroups(app);
  const hideStudied = app.relationsHideStudied || false;

  let filtered = groups;
  if (search) {
    const q = search.toLowerCase();
    filtered = groups.filter(g => {
      if (g.group_name?.toLowerCase().includes(q)) return true;
      if (g.group_key?.includes(search)) return true;
      const members = (app.wordGroupMembers || []).filter(m => m.group_id === g.id);
      return members.some(m => {
        const word = app.kanjiWords.find(w => w.id === m.word_id);
        return word?.kanji?.includes(search) || word?.meaning?.toLowerCase().includes(q);
      });
    });
  }

  // Count studied before hide filter (for button label)
  const studiedCount = filtered.filter(g => studied.has(g.id)).length;

  if (hideStudied) {
    filtered = filtered.filter(g => !studied.has(g.id));
  }

  filtered.sort((a, b) => {
    if (a.status === 'verified' && b.status !== 'verified') return -1;
    if (b.status === 'verified' && a.status !== 'verified') return 1;
    const aCount = (app.wordGroupMembers || []).filter(m => m.group_id === a.id).length;
    const bCount = (app.wordGroupMembers || []).filter(m => m.group_id === b.id).length;
    return bCount - aCount;
  });

  const page = app.relationsPage || 0;
  const pageSize = 30;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-slate-800 p-4">
        <button id="backToFoldersBtn" class="text-slate-400 hover:text-white mb-3 flex items-center gap-2 text-sm">← Back to categories</button>
        <div class="bg-gradient-to-r ${info.gradFrom} ${info.gradTo} rounded-2xl p-4 mb-3 text-white">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-xl font-bold">${info.icon}</div>
            <div>
              <h2 class="text-lg font-bold">${info.label}</h2>
              <p class="text-sm opacity-80">${filtered.length}${hideStudied ? ` shown · ${studiedCount} hidden` : ` groups`} — ${info.desc}</p>
            </div>
          </div>
        </div>
        <input type="text" id="relationsSearchInput" autocomplete="off" placeholder="Search in ${info.label.toLowerCase()}..."
          value="${escapeHtml(search)}"
          class="w-full p-3 rounded-xl bg-slate-900 text-white border border-slate-600 focus:border-indigo-500 focus:outline-none text-sm mb-2">
        <!-- Studied filter toggle -->
        <div class="flex items-center gap-2">
          <button id="relToggleHideStudied"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${hideStudied
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'}">
            ${hideStudied ? '✓ Hiding studied' : '○ Show all'}
            ${studiedCount > 0 ? `<span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold ${hideStudied ? 'bg-emerald-400/30 text-emerald-100' : 'bg-slate-600 text-slate-300'}">${studiedCount}</span>` : ''}
          </button>
          ${studiedCount > 0 ? `<span class="text-slate-600 text-[10px]">${studiedCount} group${studiedCount !== 1 ? 's' : ''} marked studied</span>` : ''}
        </div>
      </div>
      <div class="flex-1 overflow-auto hide-scrollbar p-3">
        ${pageItems.length === 0 ? `
          <div class="text-center py-12">
            <div class="text-4xl mb-2">${info.icon}</div>
            <p class="text-slate-400">${search ? 'No groups match this search' : hideStudied ? 'All groups are marked as studied!' : 'No groups in this category yet'}</p>
            ${hideStudied && studiedCount > 0 ? `<button id="relToggleHideStudied" class="mt-3 px-4 py-2 rounded-full bg-slate-700 text-slate-300 text-xs hover:bg-slate-600">Show all groups</button>` : ''}
          </div>
        ` : `
          <div class="grid grid-cols-3 gap-2">
            ${pageItems.map(group => {
              const members = (app.wordGroupMembers || []).filter(m => m.group_id === group.id);
              const memberWords = members.map(m => {
                const word = app.kanjiWords.find(w => w.id === m.word_id);
                return word ? { ...word, ...m } : null;
              }).filter(Boolean);
              const isStudied = studied.has(group.id);
              const groupName = escapeHtml(group.group_name || group.group_key);
              const previewWords = memberWords.slice(0, 3);

              return `
                <button data-word-group-id="${group.id}"
                  class="relative p-2.5 rounded-xl text-left transition-all group
                    ${isStudied
                      ? 'bg-slate-800/60 border border-emerald-500/20 hover:bg-slate-700/60'
                      : 'bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600'}">
                  <!-- Studied badge -->
                  ${isStudied ? `
                    <div class="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-[8px] font-bold leading-none">✓</span>
                    </div>
                  ` : ''}
                  <!-- Icon + name -->
                  <div class="flex items-start gap-1.5 mb-2 pr-4">
                    <div class="w-6 h-6 ${info.color} rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">${info.icon}</div>
                    <span class="text-white text-[11px] font-semibold leading-tight line-clamp-2">${groupName}</span>
                  </div>
                  <!-- Word previews -->
                  <div class="flex flex-wrap gap-1 mb-1.5">
                    ${previewWords.map(w => `
                      <span class="text-[10px] text-indigo-300 bg-slate-900/80 px-1.5 py-0.5 rounded font-medium">${escapeHtml(w.kanji)}</span>
                    `).join('')}
                    ${memberWords.length > 3 ? `<span class="text-[9px] text-slate-500 self-center">+${memberWords.length - 3}</span>` : ''}
                  </div>
                  <!-- Footer: count + verified -->
                  <div class="flex items-center gap-1">
                    <span class="text-slate-500 text-[9px]">${memberWords.length} words</span>
                    ${group.status === 'verified' ? '<span class="text-emerald-500 text-[9px]">✓</span>' : ''}
                  </div>
                </button>
              `;
            }).join('')}
          </div>
        `}
        ${totalPages > 1 ? `
          <div class="flex items-center justify-center gap-3 py-4">
            <button id="relPrevPageBtn" class="px-3 py-1.5 rounded-lg text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30" ${page === 0 ? 'disabled' : ''}>← Prev</button>
            <span class="text-xs text-slate-500">${page + 1} / ${totalPages}</span>
            <button id="relNextPageBtn" class="px-3 py-1.5 rounded-lg text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30" ${page >= totalPages - 1 ? 'disabled' : ''}>Next →</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ===== LEVEL 3: GROUP DETAIL =====

function renderGroupDetail(app) {
  const group = app.selectedWordGroup;
  if (!group) return renderFolderView(app);
  const info = GROUP_TYPE_INFO[group.group_type] || GROUP_TYPE_INFO.synonym;
  const members = (app.wordGroupMembers || []).filter(m => m.group_id === group.id);
  const memberWords = members.map(m => {
    const word = app.kanjiWords.find(w => w.id === m.word_id);
    if (!word) return null;
    const marking = getMarking(app.markings, word);
    const markInfo = app.markingCategories[marking] || app.markingCategories[0];
    return { ...word, ...m, marking, markInfo };
  }).filter(Boolean).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const studied = getStudiedGroups(app);
  const isStudied = studied.has(group.id);

  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-slate-800 p-4">
        <div class="flex items-center justify-between mb-3">
          <button id="backToRelationsListBtn" class="text-slate-400 hover:text-white flex items-center gap-2 text-sm">← Back to ${info.label}</button>
          <!-- Mark studied toggle -->
          <button id="markGroupStudiedBtn" data-group-id="${group.id}"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
              ${isStudied
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                : 'bg-slate-700 text-slate-400 border border-slate-600 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/20'}">
            ${isStudied ? '✓ Studied' : '○ Mark studied'}
          </button>
        </div>
        <div class="bg-gradient-to-r ${info.gradFrom} ${info.gradTo} rounded-2xl p-5 text-white">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold">${info.icon}</div>
            <div>
              <span class="text-xs uppercase tracking-wider opacity-70">${info.label}</span>
              <h2 class="text-lg font-bold">${escapeHtml(group.group_name || group.group_key)}</h2>
            </div>
          </div>
          <p class="text-sm opacity-80">${info.desc}</p>
          ${group.description ? `<p class="text-sm mt-2 bg-white/10 rounded-lg p-3">${escapeHtml(group.description)}</p>` : ''}
        </div>
      </div>
      <div class="flex-1 overflow-auto hide-scrollbar p-4">
        <div class="space-y-3">
          ${memberWords.map(word => {
            const kanjiEsc = escapeHtml(word.kanji || '');
            const hiragana = word.hiragana_override || word.hiragana || '';
            const sentences = (app.kanjiSentenceMap?.[word.word_id || word.id]) || [];
            const bestSentence = sentences[0];
            return `
              <div class="bg-slate-800 rounded-xl p-4 border-l-4 ${word.markInfo.border}">
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="text-2xl font-bold text-white">${kanjiEsc}</span>
                      <span class="text-blue-400 text-sm">${escapeHtml(hiragana)}</span>
                      ${word.jlpt_level ? `<span class="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-[10px] rounded font-bold">${word.jlpt_level}</span>` : ''}
                      ${word.word_type ? `<span class="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded">${escapeHtml(word.word_type)}</span>` : ''}
                    </div>
                    <p class="text-emerald-400 text-sm mt-1">${escapeHtml(word.meaning || '')}</p>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button data-open-story="${kanjiEsc}" data-story-hiragana="${escapeHtml(hiragana)}" data-story-meaning="${escapeHtml(word.meaning || '')}"
                      class="w-8 h-8 flex items-center justify-center text-purple-400 hover:text-purple-300 rounded-lg hover:bg-purple-500/10 text-sm">📖</button>
                    <div class="w-8 h-8 ${word.markInfo.color} rounded-lg flex items-center justify-center">
                      <span class="text-white text-sm">${word.markInfo.icon}</span>
                    </div>
                  </div>
                </div>
                ${word.usage_note ? `<div class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-2"><p class="text-amber-300 text-xs">💡 ${escapeHtml(word.usage_note)}</p></div>` : ''}
                ${word.hint ? `<p class="text-slate-500 text-xs mb-2">🔑 ${escapeHtml(word.hint)}</p>` : ''}
                ${bestSentence ? `
                  <div class="bg-slate-900/50 rounded-lg p-2.5 mt-2">
                    <p class="text-slate-300 text-xs leading-relaxed">${highlightWordInSentence(bestSentence.sentence, word.kanji)}</p>
                    ${bestSentence.meaning_en ? `<p class="text-slate-600 text-[10px] mt-1">${escapeHtml(bestSentence.meaning_en)}</p>` : ''}
                  </div>
                ` : word.example_sentence ? `
                  <div class="bg-slate-900/50 rounded-lg p-2.5 mt-2">
                    <p class="text-slate-300 text-xs leading-relaxed">${escapeHtml(word.example_sentence)}</p>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <!-- Add Word -->
        <div class="mt-4" id="addWordArea">
          <button id="showAddWordBtn" class="w-full py-3 border border-dashed border-slate-600 rounded-xl text-indigo-400 text-sm font-semibold hover:border-indigo-500 hover:bg-indigo-500/5 transition-all">+ Add word to this group</button>
          <div id="addWordForm" class="hidden mt-2">
            <div class="flex gap-2">
              <input type="text" id="addWordKanjiInput" placeholder="Type kanji..."
                class="flex-1 p-3 rounded-xl bg-slate-900 text-white border border-slate-600 focus:border-indigo-500 focus:outline-none text-sm">
              <button id="submitAddWordBtn" class="px-5 py-3 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors">Add</button>
            </div>
            <p class="text-slate-600 text-[10px] mt-2">Just the kanji — hiragana and meaning can be added later</p>
          </div>
        </div>
        ${(group.group_type === 'alt_kanji' || group.group_type === 'synonym' || group.group_type === 'near_synonym') && !group.description ? `
          <div class="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
            <p class="text-indigo-400 text-xs font-semibold mb-1">📝 HOW ARE THESE DIFFERENT?</p>
            <p class="text-slate-400 text-xs">No explanation yet. Add one in the Data Manager.</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ===== FLASHCARD BADGE =====

export function getWordGroupBadges(app, word) {
  if (!app.wordGroups) return [];
  const kanji = word.kanji || word.raw || '';
  
  // PERF: Use pre-built lookup instead of scanning all members
  let wordId = word.id;
  if (!wordId || !(app._wordGroupLookup && app._wordGroupLookup[wordId])) {
    const match = app.kanjiWords?.find(w => w.kanji === kanji);
    wordId = match?.id;
  }
  const groupIds = (app._wordGroupLookup && wordId) ? (app._wordGroupLookup[wordId] || []) : [];
  
  return groupIds.map(gid => {
    const group = app.wordGroups.find(g => g.id === gid);
    if (!group) return null;
    const info = GROUP_TYPE_INFO[group.group_type] || GROUP_TYPE_INFO.synonym;
    // PERF: Use pre-built count map instead of scanning
    const memberCount = (app._groupMemberCount && app._groupMemberCount[gid]) || 0;
    return { group, info, memberCount };
  }).filter(Boolean);
}

export function renderGroupBadges(badges) {
  if (!badges || badges.length === 0) return '';
  return badges.map(b => `
    <button data-view-group="${b.group.id}" class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${b.info.color}/20 text-white border border-white/10 hover:border-white/30 transition-all">
      ${b.info.icon} ${b.memberCount} ${b.info.label.toLowerCase()}
    </button>
  `).join('');
}

// ===== HELPERS =====

function highlightWordInSentence(sentence, kanji) {
  if (!sentence || !kanji) return escapeHtml(sentence || '');
  const escaped = kanji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = sentence.split(new RegExp(`(${escaped})`));
  return parts.map(part =>
    part === kanji ? `<span class="text-indigo-400 font-bold">${escapeHtml(part)}</span>` : escapeHtml(part)
  ).join('');
}
