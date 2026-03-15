// JLPT Vocabulary Master - Word Relations Tab
// Replaces the old Similar Kanji tab with intelligent word grouping

import { escapeHtml } from './utils.js';
import { getMarking } from './utils.js';

const GROUP_TYPE_INFO = {
  alt_kanji:       { label: 'Alt Kanji',     icon: '漢', color: 'bg-indigo-500', desc: 'Same reading, different kanji' },
  alt_reading:     { label: 'Alt Reading',   icon: 'あ', color: 'bg-purple-500', desc: 'Same kanji, different readings' },
  synonym:         { label: 'Synonym',       icon: '≈', color: 'bg-amber-500',  desc: 'Similar meaning words' },
  near_synonym:    { label: 'Near Synonym',  icon: '≅', color: 'bg-teal-500',   desc: 'Almost same meaning, different usage' },
  context_variant: { label: 'Context',       icon: '文', color: 'bg-rose-500',   desc: 'Same root in different compounds' },
};

// ===== MAIN ROUTER =====

export function renderRelationsTab(app) {
  if (app.selectedWordGroup) return renderGroupDetail(app);
  return renderGroupList(app);
}

// ===== GROUP LIST =====

function renderGroupList(app) {
  const groups = app.wordGroups || [];
  const filter = app.relationsFilter || 'all';
  const search = app.relationsSearch || '';
  
  // Filter by type
  let filtered = filter === 'all' ? groups : groups.filter(g => g.group_type === filter);
  
  // Filter by search
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(g => {
      if (g.group_name?.toLowerCase().includes(q)) return true;
      if (g.group_key?.includes(search)) return true;
      // Check if any member kanji matches
      const members = (app.wordGroupMembers || []).filter(m => m.group_id === g.id);
      return members.some(m => {
        const word = app.kanjiWords.find(w => w.id === m.word_id);
        return word?.kanji?.includes(search) || word?.meaning?.toLowerCase().includes(q);
      });
    });
  }
  
  // Sort: verified first, then by member count desc
  filtered.sort((a, b) => {
    if (a.status === 'verified' && b.status !== 'verified') return -1;
    if (b.status === 'verified' && a.status !== 'verified') return 1;
    const aCount = (app.wordGroupMembers || []).filter(m => m.group_id === a.id).length;
    const bCount = (app.wordGroupMembers || []).filter(m => m.group_id === b.id).length;
    return bCount - aCount;
  });
  
  // Pagination
  const page = app.relationsPage || 0;
  const pageSize = 30;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);
  
  // Type counts
  const typeCounts = {};
  groups.forEach(g => { typeCounts[g.group_type] = (typeCounts[g.group_type] || 0) + 1; });
  
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-slate-800 p-4">
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 mb-4 text-white">
          <h2 class="text-xl font-bold mb-1">🔗 Word Relations</h2>
          <p class="opacity-80 text-sm">${groups.length} groups • ${(app.wordGroupMembers || []).length} word links</p>
        </div>
        
        <!-- Type Filters -->
        <div class="flex gap-1.5 mb-3 flex-wrap">
          <button data-rel-filter="all" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }">All ${groups.length}</button>
          ${Object.entries(GROUP_TYPE_INFO).map(([type, info]) => {
            const count = typeCounts[type] || 0;
            if (count === 0) return '';
            return `<button data-rel-filter="${type}" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === type ? `${info.color} text-white` : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }">${info.icon} ${info.label} ${count}</button>`;
          }).join('')}
        </div>
        
        <!-- Search -->
        <input type="text" id="relationsSearchInput" autocomplete="off" placeholder="Search word, reading, or meaning..." 
          value="${escapeHtml(search)}" 
          class="w-full p-3 rounded-xl bg-slate-900 text-white border border-slate-600 focus:border-indigo-500 focus:outline-none text-sm">
      </div>
      
      <!-- Group List -->
      <div class="flex-1 overflow-auto hide-scrollbar p-4">
        ${pageItems.length === 0 ? `
          <div class="text-center py-12">
            <div class="text-4xl mb-2">🔗</div>
            <p class="text-slate-400">No groups match this filter</p>
          </div>
        ` : `
          <div class="space-y-2">
            ${pageItems.map(group => {
              const info = GROUP_TYPE_INFO[group.group_type] || GROUP_TYPE_INFO.synonym;
              const members = (app.wordGroupMembers || []).filter(m => m.group_id === group.id);
              const memberWords = members.map(m => {
                const word = app.kanjiWords.find(w => w.id === m.word_id);
                return word ? { ...word, ...m } : null;
              }).filter(Boolean);
              
              return `
                <button data-word-group-id="${group.id}" class="w-full p-4 bg-slate-800 rounded-xl text-left hover:bg-slate-700 transition-all group">
                  <div class="flex items-center gap-3">
                    <div class="w-11 h-11 ${info.color} rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0">${info.icon}</div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <h3 class="text-white font-bold text-sm truncate">${escapeHtml(group.group_name || group.group_key)}</h3>
                        ${group.status === 'verified' ? '<span class="text-emerald-400 text-[10px]">✓</span>' : ''}
                      </div>
                      <div class="flex gap-1.5 mt-1 flex-wrap">
                        ${memberWords.slice(0, 5).map(w => `
                          <span class="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">${escapeHtml(w.kanji)}</span>
                        `).join('')}
                        ${memberWords.length > 5 ? `<span class="text-xs text-slate-500">+${memberWords.length - 5}</span>` : ''}
                      </div>
                    </div>
                    <span class="text-slate-500 group-hover:translate-x-1 transition-transform">→</span>
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

// ===== GROUP DETAIL =====

function renderGroupDetail(app) {
  const group = app.selectedWordGroup;
  if (!group) return renderGroupList(app);
  
  const info = GROUP_TYPE_INFO[group.group_type] || GROUP_TYPE_INFO.synonym;
  const members = (app.wordGroupMembers || []).filter(m => m.group_id === group.id);
  const memberWords = members.map(m => {
    const word = app.kanjiWords.find(w => w.id === m.word_id);
    if (!word) return null;
    const marking = getMarking(app.markings, word);
    const markInfo = app.markingCategories[marking] || app.markingCategories[0];
    return { ...word, ...m, marking, markInfo };
  }).filter(Boolean).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-slate-800 p-4">
        <button id="backToRelationsListBtn" class="text-slate-400 hover:text-white mb-3 flex items-center gap-2 text-sm">← Back to Relations</button>
        
        <div class="bg-gradient-to-r ${info.color === 'bg-indigo-500' ? 'from-indigo-600 to-blue-600' : 
          info.color === 'bg-purple-500' ? 'from-purple-600 to-pink-600' :
          info.color === 'bg-amber-500' ? 'from-amber-500 to-orange-600' :
          info.color === 'bg-teal-500' ? 'from-teal-500 to-emerald-600' :
          'from-rose-500 to-red-600'} rounded-2xl p-5 text-white">
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
      
      <!-- Members -->
      <div class="flex-1 overflow-auto hide-scrollbar p-4">
        <div class="space-y-3">
          ${memberWords.map((word, idx) => {
            const kanjiEsc = escapeHtml(word.kanji || '');
            const hiragana = word.hiragana_override || word.hiragana || '';
            
            // Find linked sentences for this word
            const sentences = (app.kanjiSentenceMap?.[word.word_id || word.id]) || [];
            const bestSentence = sentences[0];
            
            return `
              <div class="bg-slate-800 rounded-xl p-4 border-l-4 ${word.markInfo.border}">
                <!-- Word header -->
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
                
                <!-- Usage note -->
                ${word.usage_note ? `
                  <div class="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-2">
                    <p class="text-amber-300 text-xs">💡 ${escapeHtml(word.usage_note)}</p>
                  </div>
                ` : ''}
                
                <!-- Hint -->
                ${word.hint ? `<p class="text-slate-500 text-xs mb-2">🔑 ${escapeHtml(word.hint)}</p>` : ''}
                
                <!-- Best sentence -->
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
        
        ${group.group_type === 'alt_kanji' || group.group_type === 'synonym' || group.group_type === 'near_synonym' ? `
          <!-- Comparison explanation -->
          ${group.description ? '' : `
            <div class="mt-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
              <p class="text-indigo-400 text-xs font-semibold mb-1">📝 HOW ARE THESE DIFFERENT?</p>
              <p class="text-slate-400 text-xs">No explanation yet. Add one in the Data Manager.</p>
            </div>
          `}
        ` : ''}
      </div>
    </div>
  `;
}

// ===== FLASHCARD BADGE =====
// Call this from renderFlashcard to show group badges

export function getWordGroupBadges(app, word) {
  if (!app.wordGroupMembers || !app.wordGroups) return [];
  
  const kanji = word.kanji || word.raw || '';
  // Find all groups this word belongs to (by word_id or kanji match)
  const memberEntries = app.wordGroupMembers.filter(m => {
    if (word.id && app.kanjiWords?.some(kw => kw.id === word.id) && m.word_id === word.id) return true;
    // Fallback: find unified word by kanji, then check membership
    const match = app.kanjiWords?.find(w => w.kanji === kanji);
    return match && m.word_id === match.id;
  });
  
  const groupIds = [...new Set(memberEntries.map(m => m.group_id))];
  return groupIds.map(gid => {
    const group = app.wordGroups.find(g => g.id === gid);
    if (!group) return null;
    const info = GROUP_TYPE_INFO[group.group_type] || GROUP_TYPE_INFO.synonym;
    const memberCount = app.wordGroupMembers.filter(m => m.group_id === gid).length;
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
    part === kanji
      ? `<span class="text-indigo-400 font-bold">${escapeHtml(part)}</span>`
      : escapeHtml(part)
  ).join('');
}
