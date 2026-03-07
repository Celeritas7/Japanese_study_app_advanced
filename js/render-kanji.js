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
    case 'books':    return renderBookSelector(app);
    case 'chapters': return renderChapterSelector(app);
    case 'wordlist': return renderKanjiWordList(app);
    default:         return renderBookSelector(app);
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
