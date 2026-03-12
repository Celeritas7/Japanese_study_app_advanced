// JLPT Vocabulary Master - Kanji Tab Renderer
// Reads from japanese_unified_words + japanese_unified_word_books

import { getMarking, escapeHtml } from './utils.js';

// Natural sort for chapter names like "1週1日", "1章1課"
function naturalSort(a, b) {
  const aNums = (a || '').match(/\d+/g)?.map(Number) || [];
  const bNums = (b || '').match(/\d+/g)?.map(Number) || [];
  for (let i = 0; i < Math.max(aNums.length, bNums.length); i++) {
    const diff = (aNums[i] || 0) - (bNums[i] || 0);
    if (diff !== 0) return diff;
  }
  return (a || '').localeCompare(b || '');
}

// Gradient colors for book cards
const BOOK_COLORS = [
  'from-emerald-500 to-green-600',
  'from-blue-500 to-indigo-600',
  'from-orange-500 to-amber-600',
  'from-rose-500 to-red-600',
  'from-violet-500 to-purple-600',
  'from-teal-500 to-cyan-600',
];

// ===== MAIN ROUTER =====

export function renderKanjiTab(app) {
  switch (app.kanjiView) {
    case 'books':        return renderBookSelector(app);
    case 'chapters':     return renderChapterSelector(app);
    case 'wordlist':     return renderKanjiWordList(app);
    case 'bulk-linker':  return renderBulkLinker(app);
    case 'review-queue': return renderReviewQueue(app);
    default:             return renderBookSelector(app);
  }
}

// ===== BOOK SELECTOR =====

function renderBookSelector(app) {
  // Build book summary from word_books join table
  const bookMap = {};
  app.kanjiWordBooks.forEach(wb => {
    if (!bookMap[wb.book_code]) {
      bookMap[wb.book_code] = {
        code: wb.book_code,
        name: wb.book_name,
        wordIds: new Set(),
        chapters: new Set(),
      };
    }
    bookMap[wb.book_code].wordIds.add(wb.word_id);
    if (wb.chapter) bookMap[wb.book_code].chapters.add(wb.chapter);
  });

  const books = Object.values(bookMap);

  if (books.length === 0) {
    return `
      <div class="flex-1 flex items-center justify-center p-4">
        <div class="text-center max-w-md">
          <div class="text-6xl mb-4">📚</div>
          <h2 class="text-xl font-bold text-white mb-2">No Kanji Books Found</h2>
          <p class="text-slate-400 mb-4">Upload data to the unified tables to get started.</p>
          <div class="bg-slate-800 rounded-xl p-4 text-left">
            <p class="text-slate-300 text-sm mb-2">Required tables:</p>
            <ul class="text-slate-400 text-sm space-y-1">
              <li>• japanese_unified_words</li>
              <li>• japanese_unified_word_books</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  // Total unique words across all books
  const allWordIds = new Set();
  app.kanjiWordBooks.forEach(wb => allWordIds.add(wb.word_id));

  return `
    <div class="flex-1 overflow-auto hide-scrollbar p-4">
      <div class="max-w-md mx-auto pt-2 animate-fadeIn">
        <div class="mb-6">
          <h1 class="text-xl font-bold text-white">Kanji Books</h1>
          <p class="text-slate-400 text-sm">${allWordIds.size} unique words across ${books.length} books</p>
        </div>
        
        <div class="space-y-3">
          ${books.map((book, idx) => {
            const color = BOOK_COLORS[idx % BOOK_COLORS.length];
            const wordCount = book.wordIds.size;
            const chapterCount = book.chapters.size;
            // Detect JLPT level from a sample word
            const sampleWordId = [...book.wordIds][0];
            const sampleWord = app.kanjiWords.find(w => w.id === sampleWordId);
            const level = sampleWord?.jlpt_level || '';

            return `
              <button data-book-code="${escapeHtml(book.code)}" class="w-full p-4 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all text-left group">
                <div class="flex items-center gap-4">
                  <div class="w-14 h-14 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-2xl text-white font-bold shrink-0">
                    漢
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="text-base font-bold text-gray-800 truncate">${escapeHtml(book.name)}</h3>
                      ${level ? `<span class="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-xs rounded font-bold shrink-0">${level}</span>` : ''}
                    </div>
                    <p class="text-gray-500 text-sm">${wordCount} words · ${chapterCount} chapters</p>
                  </div>
                  <span class="text-xl text-gray-400 group-hover:translate-x-1 transition-transform shrink-0">→</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ===== CHAPTER SELECTOR =====

function renderChapterSelector(app) {
  const bookCode = app.selectedBook;
  const bookEntries = app.kanjiWordBooks.filter(wb => wb.book_code === bookCode);
  const bookName = bookEntries[0]?.book_name || bookCode;

  // Group by chapter
  const chapterMap = {};
  bookEntries.forEach(wb => {
    const ch = wb.chapter || '(No Chapter)';
    if (!chapterMap[ch]) chapterMap[ch] = new Set();
    chapterMap[ch].add(wb.word_id);
  });

  const chapters = Object.entries(chapterMap)
    .map(([name, ids]) => ({ name, wordIds: [...ids], count: ids.size }))
    .sort((a, b) => naturalSort(a.name, b.name));

  const totalWords = new Set(bookEntries.map(wb => wb.word_id)).size;

  // Detect JLPT level
  const sampleWordId = bookEntries[0]?.word_id;
  const sampleWord = sampleWordId ? app.kanjiWords.find(w => w.id === sampleWordId) : null;
  const level = sampleWord?.jlpt_level || '';

  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-slate-800 p-4">
        <div class="flex items-center gap-3 mb-3">
          <button id="backToBooksBtn" class="text-white hover:bg-slate-700 p-2 rounded-lg transition-colors">← Back</button>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h2 class="text-white font-bold truncate">${escapeHtml(bookName)}</h2>
              ${level ? `<span class="px-1.5 py-0.5 bg-slate-600 text-slate-300 text-xs rounded font-bold shrink-0">${level}</span>` : ''}
            </div>
            <p class="text-slate-400 text-sm">${totalWords} words · ${chapters.length} chapters</p>
          </div>
        </div>
        
        <button id="startKanjiStudyAllBtn" class="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors">
          ▶ Study All ${totalWords} Words
        </button>
      </div>
      
      <div class="flex-1 overflow-auto hide-scrollbar p-4">
        <div class="max-w-md mx-auto space-y-2">
          ${chapters.map(ch => {
            // Count markings for this chapter
            let markedCount = 0;
            ch.wordIds.forEach(wid => {
              const word = app.kanjiWords.find(w => w.id === wid);
              if (word && getMarking(app.markings, word) > 0) markedCount++;
            });

            return `
              <button data-chapter-name="${escapeHtml(ch.name)}" class="w-full p-3.5 bg-white rounded-xl shadow hover:shadow-md transition-all text-left group">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="font-bold text-gray-800">${escapeHtml(ch.name)}</h3>
                    <p class="text-gray-500 text-xs">${ch.count} words${markedCount > 0 ? ` · ${markedCount} marked` : ''}</p>
                  </div>
                  <span class="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ===== WORD LIST =====

function renderKanjiWordList(app) {
  const bookCode = app.selectedBook;
  const chapter = app.selectedChapter;

  // Get word IDs for this book+chapter selection
  let bookEntries;
  if (chapter) {
    bookEntries = app.kanjiWordBooks.filter(wb => wb.book_code === bookCode && wb.chapter === chapter);
  } else {
    // "Study All" — all words in this book
    bookEntries = app.kanjiWordBooks.filter(wb => wb.book_code === bookCode);
  }

  const wordIds = [...new Set(bookEntries.map(wb => wb.word_id))];
  const words = wordIds.map(id => app.kanjiWords.find(w => w.id === id)).filter(Boolean);
  
  const bookName = bookEntries[0]?.book_name || bookCode;
  const title = chapter || 'All Chapters';

  // Filter by marking category if selected
  let filteredWords = words;
  if (app.selectedCategory !== null && app.selectedCategory !== undefined) {
    filteredWords = words.filter(w => getMarking(app.markings, w) === app.selectedCategory);
  }

  // Marking stats for filter chips
  const stats = {};
  for (let k = 0; k <= 5; k++) stats[k] = 0;
  words.forEach(w => { stats[getMarking(app.markings, w)]++; });

  const displayCount = app.studyWordLimit > 0 ? Math.min(app.studyWordLimit, filteredWords.length) : filteredWords.length;

  const TEST_TYPES = [
    { key: 'kanji',   label: '漢字', desc: 'See Kanji' },
    { key: 'reading', label: '読み', desc: 'See Meaning' },
    { key: 'writing', label: '書き', desc: 'Write Kanji' },
  ];

  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-slate-800 p-4">
        <div class="flex items-center gap-3 mb-3">
          <button id="backToChaptersBtn" class="text-white hover:bg-slate-700 p-2 rounded-lg transition-colors">← Back</button>
          <div class="min-w-0">
            <h2 class="text-white font-bold truncate">${escapeHtml(title)}</h2>
            <p class="text-slate-400 text-sm">${escapeHtml(bookName)} · ${words.length} words</p>
          </div>
        </div>
        
        <!-- Test Type -->
        <div class="flex gap-1 mb-3">
          ${TEST_TYPES.map(t => `
            <button data-test-type="${t.key}" class="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              app.selectedTestType === t.key
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }">${t.label}</button>
          `).join('')}
        </div>
        
        <!-- Word Limit -->
        <div class="flex items-center gap-2 mb-3">
          <label class="text-slate-400 text-xs shrink-0">Limit:</label>
          <input type="number" id="kanjiWordLimitInput" value="${app.studyWordLimit || ''}" min="0" placeholder="All"
            class="w-20 px-2 py-1 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none">
          <span class="text-slate-500 text-xs">${app.studyWordLimit > 0 ? `(of ${filteredWords.length})` : `(${filteredWords.length} words)`}</span>
        </div>
        
        <!-- Marking Category Filter -->
        <div class="flex gap-1 flex-wrap mb-3">
          <button data-kanji-category="clear" class="px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            app.selectedCategory === null ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }">All ${words.length}</button>
          ${Object.entries(app.markingCategories).filter(([k]) => parseInt(k) > 0).map(([k, cat]) => {
            const count = stats[parseInt(k)] || 0;
            if (count === 0) return '';
            const isActive = app.selectedCategory === parseInt(k);
            return `
              <button data-kanji-category="${k}" class="px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                isActive ? `${cat.color} text-white` : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }">${cat.icon} ${count}</button>
            `;
          }).join('')}
        </div>
        
        <!-- Study Button -->
        <button id="startKanjiStudyBtn" class="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors">
          ▶ Study ${displayCount} Words
        </button>
      </div>
      
      <!-- Word List -->
      <div class="flex-1 overflow-auto hide-scrollbar p-4">
        ${filteredWords.length === 0 ? `
          <div class="text-center py-12">
            <p class="text-2xl text-slate-500 mb-2">📭</p>
            <p class="text-slate-400">No words match this filter</p>
          </div>
        ` : `
          <div class="max-w-md mx-auto space-y-2">
            ${filteredWords.map(word => {
              const marking = getMarking(app.markings, word);
              const cat = app.markingCategories[marking] || app.markingCategories[0];
              const kanjiEsc = escapeHtml(word.kanji || '');

              // Cross-reference: which other books contain this word
              const otherBooks = app.kanjiWordBooks
                .filter(wb => wb.word_id === word.id && wb.book_code !== bookCode)
                .map(wb => wb.book_code);
              const uniqueOtherBooks = [...new Set(otherBooks)];

              return `
                <div class="bg-white rounded-xl p-3 shadow border-l-4 ${cat.border}">
                  <div class="flex items-center justify-between">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <span class="text-lg font-bold text-gray-800">${kanjiEsc}</span>
                        <span class="text-gray-500 text-sm">${escapeHtml(word.hiragana || '')}</span>
                        ${word.jlpt_level ? `<span class="px-1 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded font-bold">${word.jlpt_level}</span>` : ''}
                        ${word.word_type ? `<span class="px-1 py-0.5 bg-blue-50 text-blue-400 text-[10px] rounded">${escapeHtml(word.word_type)}</span>` : ''}
                      </div>
                      <p class="text-sm text-gray-600 truncate">${escapeHtml(word.meaning || '')}</p>
                      ${uniqueOtherBooks.length > 0 ? `
                        <div class="flex gap-1 mt-1 flex-wrap">
                          ${uniqueOtherBooks.map(bc => `<span class="px-1 py-0.5 bg-amber-50 text-amber-600 text-[9px] rounded border border-amber-200">${escapeHtml(bc)}</span>`).join('')}
                        </div>
                      ` : ''}
                    </div>
                    
                    <div class="flex items-center gap-1 ml-2 shrink-0">
                      <button data-open-story="${kanjiEsc}" data-story-hiragana="${escapeHtml(word.hiragana || '')}" data-story-meaning="${escapeHtml(word.meaning || '')}"
                        class="w-8 h-8 flex items-center justify-center text-purple-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors" title="Kanji Story">📖</button>
                      <div class="w-8 h-8 ${cat.color} rounded-lg flex items-center justify-center">
                        <span class="text-white text-sm">${cat.icon}</span>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// ===== SENTENCE PANEL (injected into flashcard) =====

const SOURCE_ICONS = {
  MN_N2: '📘', KD_N2: '📙', KM_N3: '📗', KD_N3: '📕', SM_N2: '📓',
  manual: '✏️', anime: '🎌', drama: '🎬', news: '📰', train: '🚃',
};

// ===== UNIVERSAL HELPERS =====

// Get the current word being studied/tested in any mode
export function getCurrentStudyWord(app) {
  if (app.currentTab === 'srs' && app.srsView === 'test' && app.srsWords?.length > 0) {
    return app.srsWords[app.srsCurrentIndex] || null;
  }
  if (app.studyWords?.length > 0) {
    return app.studyWords[app.currentIndex] || null;
  }
  return null;
}

// Look up linked sentences for a word (by unified id or kanji text)
export function getSentencesForWord(app, word) {
  if (!word || !app.kanjiSentenceMap) return [];
  // Only use word.id if it's actually from the unified table (avoids Goi ID collision)
  if (word.id && app.kanjiWords?.some(w => w.id === word.id) && app.kanjiSentenceMap[word.id]) {
    return app.kanjiSentenceMap[word.id];
  }
  // Fallback: look up unified word by kanji text, then check its ID in the map
  const kanji = word.kanji || word.raw || '';
  if (!kanji || !app.kanjiWords) return [];
  const match = app.kanjiWords.find(w => w.kanji === kanji);
  if (match && app.kanjiSentenceMap[match.id]) return app.kanjiSentenceMap[match.id];
  return [];
}

export function renderSentencePanel(app) {
  const word = getCurrentStudyWord(app);
  if (!word) return '';
  
  // Resolve unified word ID (works for both Goi and unified words)
  let unifiedWordId = word.id;
  if (app.kanjiWords && !app.kanjiWords.some(w => w.id === word.id)) {
    const match = app.kanjiWords.find(w => w.kanji === (word.kanji || word.raw));
    unifiedWordId = match?.id || null;
  }
  
  // Look up sentences
  const linked = getSentencesForWord(app, word);
  
  // Extract kanji stem for smarter sentence discovery
  const wordKanji = word.kanji || word.raw || '';
  const kanjiStem = extractKanjiStem(wordKanji);
  
  // Find unlinked sentences containing this word
  // Use full word first, then compound stems (2+ chars), skip single-char stems
  const linkedSentenceIds = new Set(linked.map(l => l.sentence_id || l.id));
  const searchTerms = [wordKanji]; // always try full word
  if (kanjiStem && kanjiStem.length >= 2 && kanjiStem !== wordKanji) {
    searchTerms.push(kanjiStem); // add compound stem if different from full word
  }
  
  const unlinked = searchTerms.length > 0
    ? (app.allUnifiedSentences || []).filter(s => {
        if (linkedSentenceIds.has(s.id) || !s.sentence) return false;
        return searchTerms.some(term => s.sentence.includes(term));
      }).slice(0, 8)
    : [];
  
  // Count ALL unlinked matches (not just the sliced 8)
  const unlinkedTotal = searchTerms.length > 0
    ? (app.allUnifiedSentences || []).filter(s => {
        if (linkedSentenceIds.has(s.id) || !s.sentence) return false;
        return searchTerms.some(term => s.sentence.includes(term));
      }).length
    : 0;
  
  // Use best available search term for highlighting
  const highlightTerm = searchTerms[0] || '';
  
  const sentenceCount = linked.length;
  const isExpanded = app.sentencePanelExpanded;
  
  return `
    <div class="mt-4">
      <!-- Toggle Button -->
      <button id="toggleSentencePanelBtn" class="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
        sentenceCount > 0 || unlinkedTotal > 0
          ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25'
          : 'bg-slate-700/50 border border-slate-600 text-slate-400 hover:bg-slate-700'
      }">
        💬 Sentences ${sentenceCount > 0 ? `(${sentenceCount} linked` : '(none linked'}${unlinkedTotal > 0 ? ` · ${unlinkedTotal} available` : ''})
        <span class="text-xs">${isExpanded ? '▲' : '▼'}</span>
      </button>
      
      ${isExpanded ? `
        <div class="mt-3 space-y-3 animate-fadeIn">
          
          <!-- Linked Sentences -->
          ${linked.length > 0 ? `
            <div class="space-y-2">
              ${linked.map(item => {
                const sentText = item.sentence || '';
                const rating = item.rating;
                const linkId = item.link_id;
                
                // Highlight the kanji in the sentence
                const parts = sentText.split(new RegExp(`(${escapeRegex(word.kanji || '')})`));
                const highlightedSentence = parts.map(part => 
                  part === (word.kanji || '')
                    ? `<span class="text-indigo-400 font-bold bg-indigo-500/15 px-0.5 rounded">${escapeHtml(part)}</span>`
                    : escapeHtml(part)
                ).join('');
                
                const sourceIcon = SOURCE_ICONS[item.source] || '📄';
                
                return `
                  <div class="p-3 rounded-xl border transition-all ${
                    rating && rating >= 2
                      ? 'bg-indigo-500/5 border-indigo-500/20'
                      : 'bg-slate-800/60 border-slate-700'
                  }">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="text-sm leading-relaxed text-slate-200">${highlightedSentence}</div>
                        ${item.meaning_en ? `<div class="text-xs text-slate-500 mt-1">${escapeHtml(item.meaning_en)}</div>` : ''}
                        <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span class="text-[10px] text-slate-600">${sourceIcon} ${escapeHtml(item.source || '')}</span>
                          ${item.jlpt_level ? `<span class="text-[10px] text-slate-600">• ${item.jlpt_level}</span>` : ''}
                          ${renderVerifiedBadge(item.verified)}
                        </div>
                        ${renderTagChips(item.tags, item.sentence_id || item.id)}
                      </div>
                      
                      <!-- Star Rating + Verify -->
                      <div class="flex flex-col items-end gap-1 shrink-0">
                        <div class="flex gap-0.5">
                          ${[1, 2, 3].map(r => `
                            <button data-rate-link="${linkId}" data-rate-value="${r}"
                              class="w-7 h-7 rounded-lg text-xs transition-all ${
                                rating && rating >= r
                                  ? 'bg-amber-500/30 text-amber-300'
                                  : 'bg-slate-800 text-slate-600 hover:bg-slate-700 hover:text-slate-400'
                              }">★</button>
                          `).join('')}
                        </div>
                        ${item.verified !== 'verified' ? `
                          <button data-verify-sentence="${item.sentence_id || item.id}" class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all border border-emerald-500/20">✓ Verify</button>
                        ` : ''}
                      </div>
                    </div>
                    
                    <!-- Quick Tag Input -->
                    <div class="mt-2 flex gap-1.5 items-center">
                      <input type="text" data-tag-input="${item.sentence_id || item.id}" placeholder="+ tag (e.g. grammar:てform)" 
                        class="flex-1 bg-slate-900/60 text-slate-300 text-[10px] px-2 py-1 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none">
                      <button data-add-tag="${item.sentence_id || item.id}" class="px-2 py-1 rounded-lg bg-slate-700 text-slate-400 text-[10px] hover:bg-slate-600 transition-all">Add</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="text-center py-4 text-slate-600 text-sm">No sentences linked yet</div>
          `}
          
          <!-- Unlinked Sentences Discovery -->
          ${unlinked.length > 0 ? `
            <div class="pt-3 border-t border-slate-700/50">
              <div class="text-xs text-slate-500 mb-2 font-medium">🔍 UNLINKED SENTENCES CONTAINING「${escapeHtml(wordKanji)}」</div>
              <div class="space-y-1.5">
                ${unlinked.map(s => {
                  // Highlight the word in the sentence
                  const hlTerm = searchTerms.find(t => s.sentence.includes(t)) || highlightTerm;
                  const parts = hlTerm ? s.sentence.split(new RegExp(`(${escapeRegex(hlTerm)})`)) : [s.sentence];
                  const highlighted = parts.map(part =>
                    part === hlTerm
                      ? `<span class="text-indigo-400 font-bold">${escapeHtml(part)}</span>`
                      : escapeHtml(part)
                  ).join('');
                  
                  return `
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/30">
                      <div class="flex-1 min-w-0 mr-2">
                        <div class="text-xs text-slate-400 leading-relaxed">${highlighted}</div>
                        ${s.meaning_en ? `<div class="text-[10px] text-slate-600 mt-0.5 truncate">${escapeHtml(s.meaning_en)}</div>` : ''}
                      </div>
                      <button data-link-sentence="${s.id}" data-link-word="${unifiedWordId || 0}"
                        class="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-500/30 transition-all shrink-0 border border-indigo-500/20 ${!unifiedWordId ? 'opacity-30' : ''}">
                        + Link
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

// Helper: escape regex special chars
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract kanji stem from a word for sentence discovery.
 * Takes the leading kanji prefix (stops at first non-kanji character).
 * 
 * Examples:
 *   喜ぶ    → 喜      (verb: kanji + okurigana)
 *   起きる  → 起      (verb: kanji + okurigana)
 *   禁止    → 禁止    (compound noun: all kanji)
 *   不自由  → 不自由  (compound noun: all kanji)
 *   申し込む → 申      (mixed: takes leading kanji prefix)
 *   ロープ  → ロープ  (no kanji: returns full word)
 *   おきる  → おきる  (no kanji: returns full word)
 */
export function extractKanjiStem(word) {
  if (!word) return '';
  const chars = [...word];
  
  // Check if word contains any kanji at all
  const hasKanji = chars.some(c => isKanji(c));
  if (!hasKanji) return word; // katakana or all-hiragana → use full word
  
  // Take leading kanji characters
  let stem = '';
  for (const c of chars) {
    if (isKanji(c)) {
      stem += c;
    } else {
      break; // stop at first non-kanji (okurigana)
    }
  }
  
  return stem || word; // fallback to full word if extraction fails
}

// CJK Unified Ideographs range check
function isKanji(char) {
  const code = char.codePointAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF)   // CJK Unified
      || (code >= 0x3400 && code <= 0x4DBF)   // CJK Extension A
      || (code >= 0xF900 && code <= 0xFAFF);  // CJK Compatibility
}

// ===== ADD SENTENCE BOTTOM SHEET =====

export function renderAddSentenceSheet(app) {
  if (!app.showAddSentenceSheet) return '';
  
  const word = getCurrentStudyWord(app);
  if (!word) return '';
  
  const isSaving = app.addSentenceSaving;
  
  return `
    <div id="addSentenceSheetBg" class="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center">
      <div class="w-full max-w-lg bg-slate-800 rounded-t-2xl border-t border-slate-600 animate-slideIn" style="animation: slideUp 0.25s ease-out;">
        <style>@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }</style>
        
        <!-- Handle bar -->
        <div class="flex justify-center pt-3 pb-1">
          <div class="w-10 h-1 bg-slate-600 rounded-full"></div>
        </div>
        
        <!-- Header -->
        <div class="px-5 pb-3 flex items-center justify-between">
          <div>
            <h3 class="text-white font-bold text-base">Add Sentence</h3>
            <p class="text-slate-400 text-xs">For「${escapeHtml(word.kanji || '')}」${word.hiragana ? `(${escapeHtml(word.hiragana)})` : ''}</p>
          </div>
          <button id="closeAddSentenceSheetBtn" class="text-slate-400 hover:text-white text-xl p-1">✕</button>
        </div>
        
        <!-- Form -->
        <div class="px-5 pb-5 space-y-3">
          <div>
            <label class="text-slate-400 text-xs block mb-1">Japanese Sentence *</label>
            <textarea id="newSentenceTextInput" rows="2" placeholder="e.g. 私は毎朝6時に起きます。"
              class="w-full bg-slate-900 text-white px-3 py-2.5 rounded-xl border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm resize-none">${escapeHtml(app.newSentenceText || '')}</textarea>
          </div>
          
          <div>
            <label class="text-slate-400 text-xs block mb-1">English Meaning</label>
            <input type="text" id="newSentenceMeaningInput" placeholder="e.g. I get up at 6 every morning."
              value="${escapeHtml(app.newSentenceMeaning || '')}"
              class="w-full bg-slate-900 text-white px-3 py-2.5 rounded-xl border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm">
          </div>
          
          <div class="flex gap-2">
            <div class="flex-1">
              <label class="text-slate-400 text-xs block mb-1">Source</label>
              <input type="text" id="newSentenceSourceInput" placeholder="e.g. textbook, anime, news"
                value="${escapeHtml(app.newSentenceSource || 'manual')}"
                class="w-full bg-slate-900 text-white px-3 py-2.5 rounded-xl border border-slate-600 focus:border-emerald-500 focus:outline-none text-sm">
            </div>
            <div class="w-20">
              <label class="text-slate-400 text-xs block mb-1">Level</label>
              <select id="newSentenceLevelInput" class="w-full bg-slate-900 text-white px-2 py-2.5 rounded-xl border border-slate-600 text-sm">
                <option value="">—</option>
                <option value="N1" ${word.jlpt_level === 'N1' ? 'selected' : ''}>N1</option>
                <option value="N2" ${word.jlpt_level === 'N2' ? 'selected' : ''}>N2</option>
                <option value="N3" ${word.jlpt_level === 'N3' ? 'selected' : ''}>N3</option>
                <option value="N4">N4</option>
                <option value="N5">N5</option>
              </select>
            </div>
          </div>
          
          <button id="submitNewSentenceBtn" class="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
            ${isSaving ? 'disabled' : ''}>
            ${isSaving ? 'Saving...' : '✏️ Save & Link to ' + escapeHtml(word.kanji || '')}
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===== BULK SENTENCE LINKER VIEW =====

export function renderBulkLinker(app) {
  const isParsed = app.bulkParsedResults && app.bulkParsedResults.length > 0;
  const isSaving = app.bulkSaving;
  
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-slate-800 p-4">
        <div class="flex items-center gap-3 mb-3">
          <button id="backToBooksBtn" class="text-white hover:bg-slate-700 p-2 rounded-lg transition-colors">← Back</button>
          <div>
            <h2 class="text-white font-bold">Bulk Sentence Linker</h2>
            <p class="text-slate-400 text-sm">${app.kanjiWords.length} words in database · ${app.allUnifiedSentences.length} sentences</p>
          </div>
        </div>
      </div>
      
      <div class="flex-1 overflow-auto hide-scrollbar p-4">
        <div class="max-w-lg mx-auto space-y-4">
          
          <!-- Input Area -->
          <div class="bg-slate-800 rounded-xl p-4">
            <label class="text-slate-400 text-xs block mb-2 font-medium">PASTE SENTENCES (one per line)</label>
            <textarea id="bulkSentenceInput" rows="6" placeholder="私は毎朝6時に起きます。&#10;駅前は駐車禁止です。&#10;彼女は嬉しそうに喜んでいた。&#10;..."
              class="w-full bg-slate-900 text-white px-3 py-2.5 rounded-xl border border-slate-600 focus:border-indigo-500 focus:outline-none text-sm resize-none leading-relaxed">${escapeHtml(app.bulkSentenceInput || '')}</textarea>
            
            <div class="flex gap-2 mt-3">
              <div class="flex-1">
                <label class="text-slate-500 text-[10px] block mb-1">Source tag</label>
                <input type="text" id="bulkSourceInput" value="${escapeHtml(app.bulkSource || 'manual')}" placeholder="manual"
                  class="w-full bg-slate-900 text-white px-2.5 py-1.5 rounded-lg border border-slate-600 text-xs focus:outline-none focus:border-indigo-500">
              </div>
              <div class="flex-1">
                <label class="text-slate-500 text-[10px] block mb-1">JLPT Level</label>
                <select id="bulkLevelInput" class="w-full bg-slate-900 text-white px-2.5 py-1.5 rounded-lg border border-slate-600 text-xs">
                  <option value="">Auto</option>
                  <option value="N1">N1</option>
                  <option value="N2">N2</option>
                  <option value="N3">N3</option>
                </select>
              </div>
            </div>
            
            <button id="parseBulkSentencesBtn" class="w-full mt-3 py-2.5 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors">
              🔍 Detect Words
            </button>
          </div>
          
          <!-- Results -->
          ${isParsed ? `
            <div class="bg-slate-800 rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="text-slate-400 text-xs font-medium">
                  DETECTED LINKS (${app.bulkParsedResults.reduce((acc, r) => acc + r.detectedWords.length, 0)} word matches across ${app.bulkParsedResults.length} sentences)
                </div>
              </div>
              
              <div class="space-y-3">
                ${app.bulkParsedResults.map((result, idx) => `
                  <div class="bg-slate-900/60 rounded-xl p-3 border border-slate-700/50">
                    <!-- Sentence -->
                    <div class="text-sm text-slate-200 leading-relaxed mb-2">${highlightMultipleWords(result.sentence, result.detectedWords)}</div>
                    ${result.meaning ? `<div class="text-xs text-slate-500 mb-2">${escapeHtml(result.meaning)}</div>` : ''}
                    
                    <!-- Detected words -->
                    ${result.detectedWords.length > 0 ? `
                      <div class="flex flex-wrap gap-1.5">
                        ${result.detectedWords.map(dw => {
                          const isLinked = result.linkedWordIds?.includes(dw.id);
                          return `
                            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-all ${
                              isLinked
                                ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                : 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400'
                            }">
                              ${escapeHtml(dw.kanji)} <span class="text-[10px] opacity-60">${escapeHtml(dw.hiragana || '')}</span>
                              ${isLinked ? '✓' : `<button data-bulk-link-word="${dw.id}" data-bulk-link-idx="${idx}" class="ml-0.5 hover:text-white">+</button>`}
                            </span>
                          `;
                        }).join('')}
                      </div>
                    ` : `
                      <div class="text-xs text-slate-600">No matching words detected</div>
                    `}
                  </div>
                `).join('')}
              </div>
              
              <!-- Bulk actions -->
              <div class="flex gap-2 mt-4">
                <button id="bulkLinkAllBtn" class="flex-1 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  ${isSaving ? 'disabled' : ''}>
                  ${isSaving ? 'Saving...' : '✅ Save All & Link Detected Words'}
                </button>
              </div>
            </div>
          ` : ''}
          
          ${app.bulkResultMessage ? `
            <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 text-sm text-center">
              ${escapeHtml(app.bulkResultMessage)}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Highlight multiple detected words in a sentence
function highlightMultipleWords(sentence, detectedWords) {
  if (!detectedWords || detectedWords.length === 0) return escapeHtml(sentence);
  
  // Sort by stem length descending to avoid partial matches
  const stems = detectedWords
    .map(dw => extractKanjiStem(dw.kanji))
    .filter(s => s)
    .sort((a, b) => b.length - a.length);
  
  if (stems.length === 0) return escapeHtml(sentence);
  
  const pattern = new RegExp(`(${stems.map(s => escapeRegex(s)).join('|')})`, 'g');
  const parts = sentence.split(pattern);
  const stemSet = new Set(stems);
  
  return parts.map(part =>
    stemSet.has(part)
      ? `<span class="text-indigo-400 font-bold bg-indigo-500/10 px-0.5 rounded">${escapeHtml(part)}</span>`
      : escapeHtml(part)
  ).join('');
}

// ===== TAG & VERIFICATION HELPERS =====

const VERIFIED_BADGES = {
  verified:       { label: '✓ Verified', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  native_checked: { label: '✓ Native', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  rejected:       { label: '✗ Rejected', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function renderVerifiedBadge(status) {
  if (!status || status === 'unverified') {
    return `<span class="text-[10px] px-1.5 py-0.5 rounded border bg-slate-700/50 border-slate-600 text-slate-500">unverified</span>`;
  }
  const badge = VERIFIED_BADGES[status] || VERIFIED_BADGES.verified;
  return `<span class="text-[10px] px-1.5 py-0.5 rounded border ${badge.cls}">${badge.label}</span>`;
}

function renderTagChips(tags, sentenceId) {
  if (!tags || tags.length === 0) return '';
  
  const TAG_COLORS = {
    'vocab':   'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
    'grammar': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  };
  
  return `
    <div class="flex flex-wrap gap-1 mt-1.5">
      ${tags.map(tag => {
        const prefix = tag.split(':')[0];
        const colorCls = TAG_COLORS[prefix] || 'bg-slate-700/50 text-slate-400 border-slate-600';
        return `
          <span class="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border ${colorCls}">
            ${escapeHtml(tag)}
            <button data-remove-tag="${sentenceId}" data-tag-value="${escapeHtml(tag)}" class="ml-0.5 opacity-50 hover:opacity-100">×</button>
          </span>
        `;
      }).join('')}
    </div>
  `;
}

// ===== REVIEW QUEUE =====

export function renderReviewQueue(app) {
  const filterStatus = app.reviewFilter || 'unverified';
  const filterSource = app.reviewSourceFilter || 'all';
  
  // Get unique sources for filter dropdown
  const allSources = [...new Set((app.allUnifiedSentences || []).map(s => s.source).filter(Boolean))].sort();
  
  // Filter sentences
  let filtered = (app.allUnifiedSentences || []).filter(s => {
    const status = s.verified || 'unverified';
    if (filterStatus !== 'all' && status !== filterStatus) return false;
    if (filterSource !== 'all' && s.source !== filterSource) return false;
    return true;
  });
  
  // Sort: unverified first, then by id desc (newest first)
  filtered.sort((a, b) => {
    const aV = (a.verified || 'unverified') === 'unverified' ? 0 : 1;
    const bV = (b.verified || 'unverified') === 'unverified' ? 0 : 1;
    if (aV !== bV) return aV - bV;
    return (b.id || 0) - (a.id || 0);
  });
  
  // Paginate (show 30 at a time)
  const page = app.reviewPage || 0;
  const pageSize = 30;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);
  
  // Count stats
  const stats = { unverified: 0, verified: 0, rejected: 0 };
  (app.allUnifiedSentences || []).forEach(s => {
    const v = s.verified || 'unverified';
    if (stats[v] !== undefined) stats[v]++;
  });
  
  // Build stem map for word detection on the fly
  const stemMap = {};
  (app.kanjiWords || []).forEach(w => {
    const stem = extractKanjiStem(w.kanji);
    if (stem && stem.length >= 2) { // only compounds to reduce noise
      if (!stemMap[stem]) stemMap[stem] = [];
      stemMap[stem].push(w);
    }
  });
  const sortedStems = Object.keys(stemMap).sort((a, b) => b.length - a.length);
  
  return `
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="bg-slate-800 p-4">
        <div class="flex items-center gap-3 mb-3">
          <button id="backToBooksBtn" class="text-white hover:bg-slate-700 p-2 rounded-lg transition-colors">← Back</button>
          <div>
            <h2 class="text-white font-bold">Review Queue</h2>
            <p class="text-slate-400 text-sm">${stats.unverified} unverified · ${stats.verified} verified · ${stats.rejected} rejected</p>
          </div>
        </div>
        
        <!-- Filters -->
        <div class="flex gap-2 mb-3">
          ${['unverified', 'verified', 'rejected', 'all'].map(status => `
            <button data-review-filter="${status}" class="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === status
                ? (status === 'unverified' ? 'bg-amber-500 text-white' : status === 'verified' ? 'bg-emerald-500 text-white' : status === 'rejected' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white')
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }">${status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} ${status !== 'all' ? stats[status] || '' : ''}</button>
          `).join('')}
        </div>
        
        <div class="flex gap-2">
          <select id="reviewSourceFilter" class="flex-1 bg-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 border border-slate-600">
            <option value="all" ${filterSource === 'all' ? 'selected' : ''}>All Sources</option>
            ${allSources.map(src => `<option value="${escapeHtml(src)}" ${filterSource === src ? 'selected' : ''}>${escapeHtml(src)}</option>`).join('')}
          </select>
          <div class="text-slate-500 text-xs flex items-center">${filtered.length} sentences</div>
        </div>
      </div>
      
      <!-- Sentence List -->
      <div class="flex-1 overflow-auto hide-scrollbar p-4">
        <div class="max-w-lg mx-auto space-y-2">
          ${pageItems.length === 0 ? `
            <div class="text-center py-12">
              <div class="text-4xl mb-2">✅</div>
              <p class="text-slate-400">No sentences match this filter</p>
            </div>
          ` : pageItems.map(s => {
            const status = s.verified || 'unverified';
            const isUnverified = status === 'unverified';
            
            // Detect words this sentence covers
            const detectedWords = [];
            const seenIds = new Set();
            for (const stem of sortedStems) {
              if (s.sentence && s.sentence.includes(stem)) {
                for (const w of stemMap[stem]) {
                  if (!seenIds.has(w.id)) { seenIds.add(w.id); detectedWords.push(w); }
                }
              }
            }
            
            return `
              <div class="bg-slate-800 rounded-xl p-3.5 border ${isUnverified ? 'border-amber-500/20' : status === 'verified' ? 'border-emerald-500/20' : 'border-slate-700'}">
                <!-- Sentence text -->
                <div class="text-sm text-slate-200 leading-relaxed mb-1.5">
                  ${detectedWords.length > 0 ? highlightMultipleWords(s.sentence, detectedWords) : escapeHtml(s.sentence)}
                </div>
                ${s.meaning_en ? `<div class="text-xs text-slate-500 mb-2">${escapeHtml(s.meaning_en)}</div>` : ''}
                
                <!-- Meta row -->
                <div class="flex items-center gap-2 mb-2 flex-wrap">
                  <span class="text-[10px] text-slate-600">${SOURCE_ICONS[s.source] || '📄'} ${escapeHtml(s.source || 'unknown')}</span>
                  ${s.jlpt_level ? `<span class="text-[10px] text-slate-600">• ${s.jlpt_level}</span>` : ''}
                  ${renderVerifiedBadge(status)}
                </div>
                
                <!-- Tags -->
                ${renderTagChips(s.tags, s.id)}
                
                <!-- Detected words preview -->
                ${detectedWords.length > 0 ? `
                  <div class="flex flex-wrap gap-1 mt-2">
                    ${detectedWords.slice(0, 6).map(dw => `
                      <span class="text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/15">${escapeHtml(dw.kanji)}</span>
                    `).join('')}
                    ${detectedWords.length > 6 ? `<span class="text-[10px] text-slate-600">+${detectedWords.length - 6}</span>` : ''}
                  </div>
                ` : ''}
                
                <!-- Tag input + Actions -->
                <div class="mt-2.5 flex gap-1.5 items-center">
                  <input type="text" data-tag-input="${s.id}" placeholder="+ tag (grammar:てform)" 
                    class="flex-1 bg-slate-900/60 text-slate-300 text-[10px] px-2 py-1 rounded-lg border border-slate-700 focus:border-indigo-500 focus:outline-none">
                  <button data-add-tag="${s.id}" class="px-2 py-1 rounded-lg bg-slate-700 text-slate-400 text-[10px] hover:bg-slate-600">Tag</button>
                </div>
                
                <div class="flex gap-1.5 mt-2">
                  ${isUnverified ? `
                    <button data-verify-sentence="${s.id}" class="flex-1 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 transition-all">✓ Verify</button>
                    <button data-reject-sentence="${s.id}" class="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 transition-all">✗ Reject</button>
                  ` : status === 'verified' ? `
                    <button data-unverify-sentence="${s.id}" class="flex-1 py-1.5 rounded-lg text-xs font-medium bg-slate-700 text-slate-400 hover:bg-slate-600 transition-all">↩ Unverify</button>
                    <button data-reject-sentence="${s.id}" class="flex-1 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 transition-all">✗ Reject</button>
                  ` : `
                    <button data-verify-sentence="${s.id}" class="flex-1 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 transition-all">✓ Restore & Verify</button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
          
          <!-- Pagination -->
          ${totalPages > 1 ? `
            <div class="flex items-center justify-center gap-3 py-4">
              <button id="reviewPrevPageBtn" class="px-3 py-1.5 rounded-lg text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30" ${page === 0 ? 'disabled' : ''}>← Prev</button>
              <span class="text-xs text-slate-500">${page + 1} / ${totalPages}</span>
              <button id="reviewNextPageBtn" class="px-3 py-1.5 rounded-lg text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30" ${page >= totalPages - 1 ? 'disabled' : ''}>Next →</button>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}
