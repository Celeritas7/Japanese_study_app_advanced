// JLPT Vocabulary Master - Main Application
// Version 12.0

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getMarking, sampleArray, shuffleArray, generatePronunciationMutations, showToast } from './utils.js';
import { 
  loadMarkings, loadStoryGroups, loadStories, 
  loadSimilarGroups, loadSelfStudyTopics, loadSelfStudyWords,
  updateMarkingInDB, addTopic, addSelfStudyWord,
  loadMarkingCategories, DEFAULT_MARKING_CATEGORIES, saveStoryAlert, saveWordAlert,
  loadUnifiedWords, loadUnifiedWordBooks, loadSentencesForWords,
  loadAllUnifiedSentences, updateSentenceRating, linkSentenceToWord,
  addNewSentenceAndLink, bulkAddSentences, bulkLinkSentences,
  updateSentenceVerified, addSentenceTag, removeSentenceTag,
  loadWordGroups, loadWordGroupMembers
} from './data.js';
import { saveCanvasData, restoreCanvasData } from './canvas.js';
import { 
  renderLoading, renderLogin, renderHeader, renderTabs, renderStudySubTabs,
  renderLevelSelector, renderWeekDaySelector, renderWordList, renderFlashcard,
  renderSelfStudyTopics, renderSelfStudyWordList,
  renderWordAlertForm
} from './render.js';
import { renderSRSTab } from './render-srs.js';
import { renderStoriesTab, renderStoryOverlay, renderStoryAlertForm } from './render-stories.js';
import { renderRelationsTab, getWordGroupBadges, renderGroupBadges } from './render-relations.js';
import { renderKanjiTab, renderSentencePanel, renderAddSentenceSheet, renderReviewQueue, extractKanjiStem, getCurrentStudyWord } from './render-kanji.js';
import { attachEventListeners } from './events.js';

// Guest user ID for testing (matches your Google OAuth user ID)
const GUEST_USER_ID = 'd469efb7-f9e1-4b49-8b14-75a42b4d22e0';

class JLPTStudyApp {
  constructor() {
    this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.sb = this.supabase;
    
    this.user = null;
    this.isGuestMode = false;
    this.loading = true;
    this.syncing = false;
    
    this.vocabulary = [];
    this.markings = {};
    this.markingCategories = { ...DEFAULT_MARKING_CATEGORIES };
    this.storyGroups = [];
    this.stories = [];
    this.similarGroups = [];
    
    // Word relations (replaces Similar tab)
    this.wordGroups = [];
    this.wordGroupMembers = [];
    this.selectedWordGroup = null;
    this.relationsCategory = null;   // which folder is open (null = folder view)
    this.relationsFilter = 'all';
    this.relationsSearch = '';
    this.relationsPage = 0;
    this.selfStudyTopics = [];
    this.selfStudyWords = [];
    
    // Unified kanji data
    this.kanjiWords = [];      // from japanese_unified_words
    this.kanjiWordBooks = [];  // from japanese_unified_word_books
    this.kanjiView = 'books';  // 'books', 'chapters', 'wordlist', 'flashcard'
    this.selectedBook = null;     // book_code
    this.selectedChapter = null;  // chapter name
    this.kanjiSentenceMap = {};   // word_id → [{ link_id, sentence_id, sentence, meaning_en, rating, source, jlpt_level }]
    this.allUnifiedSentences = [];  // all sentences for discovery
    this.sentencePanelExpanded = false;
    
    // Add sentence bottom sheet
    this.showAddSentenceSheet = false;
    this.addSentenceSaving = false;
    this.newSentenceText = '';
    this.newSentenceMeaning = '';
    this.newSentenceSource = 'manual';
    
    // Bulk sentence linker
    this.bulkSentenceInput = '';
    this.bulkSource = 'manual';
    this.bulkParsedResults = null; // [{ sentence, meaning, detectedWords, linkedWordIds }]
    this.bulkSaving = false;
    this.bulkResultMessage = '';
    
    // Review queue
    this.reviewFilter = 'unverified';
    this.reviewSourceFilter = 'all';
    this.reviewPage = 0;
    
    this.currentTab = 'study';
    this.studySubTab = 'goi';
    this.studyView = 'level';
    this.selectedLevel = null;
    this.selectedWeekDay = null;
    this.selectedCategory = null;
    this.selectedTestType = 'kanji';
    this.selectedTopic = null;
    
    // Study level selector
    this.studyMode = 'all'; // 'all' or 'custom'
    this.studyPreset = 10;
    this.studyLevelCounts = { N1: 10, N2: 10, N3: 10 };
    
    this.studyWords = [];
    this.currentIndex = 0;
    this.revealStep = 0;
    this.canvasImageData = null;
    
    this.selectedStoryGroup = null;
    this.storyFilter = '';
    this.storySearchMode = 'groups'; // 'groups', 'kanji', 'words'
    this.selectedSimilarGroup = null;
    this.similarFilter = { search: '' };
    
    // Story overlay state
    this.storyOverlay = null; // { word, step, expandedPart, groupKey, highlightKanji, kanjiParts }
    
    // Story alert state
    this.storyAlertTarget = null; // { kanji, groupKanji, source }
    this.storyAlertComment = '';
    this.storyAlertType = 'incorrect';
    this.storyAlertSaving = false;
    
    // Word alert state
    this.wordAlertTarget = null; // { kanji, hiragana, meaning, source }
    this.wordAlertComment = '';
    this.wordAlertType = 'wrong_reading';
    this.wordAlertSaving = false;
    
    this.srsView = 'setup';
    this.srsConfig = { 
      n1Count: 0, n2Count: 0, n3Count: 0, 
      testType: 'hiragana_to_kanji',
      selectionMode: 'level', // 'level' or 'marking'
      markingCounts: { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3 },
      levelMode: 'all', // 'all' or 'custom' (within By Level)
      levelPreset: 5
    };
    
    // Study word limit
    this.studyWordLimit = 0;
    this.srsWords = [];
    this.srsCurrentIndex = 0;
    this.srsAnswers = [];
    this.srsOptions = [];
    this.srsSelectedAnswer = null;
    this.srsShowResult = false;
    
    this.showAddTopicModal = false;
    this.showAddWordModal = false;
    
    this.init();
  }
  
  async init() {
    this.render();
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) this.user = session.user;
    
    this.supabase.auth.onAuthStateChange((event, session) => {
      // Skip INITIAL_SESSION to avoid double-load
      if (event === 'INITIAL_SESSION') return;
      this.user = session?.user || null;
      this.isGuestMode = false;
      if (event === 'SIGNED_IN') this.loadAllData();
      this.render();
    });
    
    if (this.user) await this.loadAllData();
    this.loading = false;
    this.render();
  }
  
  // Guest mode - skip login and use hardcoded user ID
  async enterGuestMode() {
    this.isGuestMode = true;
    this.user = { id: GUEST_USER_ID, email: 'guest@example.com' };
    console.log('Entering guest mode with user ID:', GUEST_USER_ID);
    await this.loadAllData();
    this.render();
  }
  
  async signInWithGoogle() {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) alert('Login failed: ' + error.message);
  }
  
  async signOut() {
    if (this.isGuestMode) {
      this.isGuestMode = false;
      this.user = null;
      this.markings = {};
      this.render();
      return;
    }
    await this.supabase.auth.signOut();
    this.user = null;
    this.currentTab = 'study';
    this.studyView = 'level';
    this.render();
  }
  
  async loadAllData() {
    this.syncing = true;
    this.render();
    
    const userId = this.user?.id;
    console.log('loadAllData: userId:', userId);
    
    const [markings, markingCategories, storyGroups, stories, similarGroups, topics, words, kanjiWords, kanjiWordBooks, allSentences, wordGroups, wordGroupMembers] = await Promise.all([
      loadMarkings(this.supabase, userId),
      loadMarkingCategories(this.supabase, userId),
      loadStoryGroups(this.supabase),
      loadStories(this.supabase),
      loadSimilarGroups(this.supabase),
      loadSelfStudyTopics(this.supabase, userId),
      loadSelfStudyWords(this.supabase, userId),
      loadUnifiedWords(this.supabase),
      loadUnifiedWordBooks(this.supabase),
      loadAllUnifiedSentences(this.supabase),
      loadWordGroups(this.supabase),
      loadWordGroupMembers(this.supabase)
    ]);
    
    this.markings = markings;
    this.markingCategories = markingCategories;
    this.storyGroups = storyGroups;
    this.stories = stories;
    this.similarGroups = similarGroups;
    this.selfStudyTopics = topics;
    this.selfStudyWords = words;
    this.kanjiWords = kanjiWords;
    this.kanjiWordBooks = kanjiWordBooks;
    this.allUnifiedSentences = allSentences;
    this.wordGroups = wordGroups;
    this.wordGroupMembers = wordGroupMembers;
    
    // Derive vocabulary (Goi study words) from unified tables
    // JLPT book entries → one vocabulary item per word-book pairing
    const JLPT_BOOKS = ['JLPT_N1', 'JLPT_N2', 'JLPT_N3'];
    const wordLookup = {};
    kanjiWords.forEach(w => { wordLookup[w.id] = w; });
    
    this.vocabulary = kanjiWordBooks
      .filter(wb => JLPT_BOOKS.includes(wb.book_code))
      .map(wb => {
        const word = wordLookup[wb.word_id];
        if (!word) return null;
        return {
          ...word,
          level: wb.book_code.replace('JLPT_', ''),  // JLPT_N1 → N1
          weekDayLabel: wb.chapter || '',
          ref_no: wb.ref,
        };
      })
      .filter(Boolean);
    
    console.log(`Loaded: ${this.vocabulary.length} vocab, ${kanjiWords.length} words, ${kanjiWordBooks.length} book-links, ${allSentences.length} sentences, ${wordGroups.length} word groups`);
    this.syncing = false;
    this.render();
  }
  
  selectTab(tab) {
    this.currentTab = tab;
    if (tab === 'study') { this.studyView = 'level'; this.selectedLevel = null; }
    this.selectedStoryGroup = null;
    this.selectedSimilarGroup = null;
    this.selectedWordGroup = null;
    this.relationsCategory = null;
    this.render();
  }
  
  // Word Relations navigation
  selectWordGroup(groupId) {
    const group = this.wordGroups.find(g => g.id === groupId);
    if (group) {
      this.selectedWordGroup = group;
      this.render();
    }
  }
  
  backToRelationsList() {
    this.selectedWordGroup = null;
    this.render();
  }
  
  backToFolders() {
    this.relationsCategory = null;
    this.selectedWordGroup = null;
    this.relationsSearch = '';
    this.relationsPage = 0;
    this.render();
  }
  
  openRelationsFolder(type) {
    this.relationsCategory = type;
    this.relationsSearch = '';
    this.relationsPage = 0;
    this.selectedWordGroup = null;
    this.render();
  }
  
  async addWordToGroup(groupId, kanji) {
    if (!kanji || !kanji.trim()) return;
    kanji = kanji.trim();
    
    // Find or skip if word exists in unified words
    let wordEntry = this.kanjiWords.find(w => w.kanji === kanji);
    let wordId;
    
    if (wordEntry) {
      wordId = wordEntry.id;
    } else {
      // Insert a minimal word entry into japanese_unified_words
      try {
        const { data, error } = await this.supabase
          .from('japanese_unified_words')
          .insert({ kanji: kanji, hiragana: '', meaning_en: '', hint: '' })
          .select();
        if (error) { console.error('Insert word error:', error); alert('Failed to add word: ' + error.message); return; }
        wordId = data[0].id;
        // Add to local cache
        const newWord = { ...data[0], meaning: '', level: '', raw: kanji, supporting_word_1: '', supporting_word_2: '', sentence_before: '', sentence_after: '' };
        this.kanjiWords.push(newWord);
      } catch (e) { console.error(e); return; }
    }
    
    // Check if already a member
    const existing = this.wordGroupMembers.find(m => m.group_id === groupId && m.word_id === wordId);
    if (existing) { alert('This word is already in the group.'); return; }
    
    // Get next sort_order
    const existingMembers = this.wordGroupMembers.filter(m => m.group_id === groupId);
    const nextSort = existingMembers.length > 0 ? Math.max(...existingMembers.map(m => m.sort_order || 0)) + 1 : 1;
    
    try {
      const { data, error } = await this.supabase
        .from('japanese_word_group_members')
        .insert({ group_id: groupId, word_id: wordId, sort_order: nextSort })
        .select();
      if (error) { console.error('Insert member error:', error); alert('Failed to link word: ' + error.message); return; }
      // Add to local cache
      this.wordGroupMembers.push(data[0]);
      this.render();
    } catch (e) { console.error(e); }
  }
  
  setRelationsFilter(filter) {
    this.relationsFilter = filter;
    this.relationsPage = 0;
    this.render();
  }
  
  setRelationsSearch(search) {
    this.relationsSearch = search;
    this.relationsPage = 0;
    // Surgical DOM update — don't destroy search input
    const listContainer = document.querySelector('.flex-1.overflow-auto.hide-scrollbar.p-4');
    if (listContainer) {
      // Re-render will happen naturally via events.js debounce
    }
  }
  
  selectStudySubTab(subTab) {
    this.studySubTab = subTab;
    this.studyView = 'level';
    this.selectedLevel = null;
    this.selectedTopic = null;
    // Reset kanji state when switching sub-tabs
    this.kanjiView = 'books';
    this.selectedBook = null;
    this.selectedChapter = null;
    this.selectedCategory = null;
    this.render();
  }
  
  selectLevel(level) {
    this.selectedLevel = level;
    this.selectedCategory = null;
    this.studyView = 'weekday';
    this.render();
  }
  
  selectTopic(topicId) {
    this.selectedTopic = this.selfStudyTopics.find(t => t.id === topicId);
    this.studyView = 'wordlist';
    this.render();
  }
  
  backToLevel() {
    if (this.studySubTab === 'kanji') {
      // From kanji chapters → back to book list
      this.kanjiView = 'books';
      this.selectedBook = null;
      this.selectedChapter = null;
      this.selectedCategory = null;
    } else {
      this.selectedLevel = null;
      this.selectedTopic = null;
      this.studyView = 'level';
    }
    this.render();
  }
  
  backToWeekDay() {
    if (this.studySubTab === 'kanji') {
      // From kanji flashcard → back to word list (or chapters if no chapter selected)
      this.kanjiView = this.selectedChapter ? 'wordlist' : 'chapters';
      this.selectedCategory = null;
    } else {
      this.studyView = 'weekday';
      this.selectedCategory = null;
    }
    this.render();
  }
  
  // ===== KANJI SUB-TAB NAVIGATION =====
  
  selectBook(bookCode) {
    this.selectedBook = bookCode;
    this.selectedChapter = null;
    this.selectedCategory = null;
    this.kanjiView = 'chapters';
    this.render();
  }
  
  selectChapter(chapterName) {
    this.selectedChapter = chapterName;
    this.selectedCategory = null;
    this.kanjiView = 'wordlist';
    this.render();
  }
  
  backToBooks() {
    this.selectedBook = null;
    this.selectedChapter = null;
    this.selectedCategory = null;
    this.kanjiView = 'books';
    this.render();
  }
  
  backToChapters() {
    this.selectedChapter = null;
    this.selectedCategory = null;
    this.kanjiView = 'chapters';
    this.render();
  }
  
  async startKanjiStudy(allInBook = false) {
    // Determine which word IDs to study
    let bookEntries;
    if (allInBook) {
      bookEntries = this.kanjiWordBooks.filter(wb => wb.book_code === this.selectedBook);
    } else {
      bookEntries = this.kanjiWordBooks.filter(wb =>
        wb.book_code === this.selectedBook && wb.chapter === this.selectedChapter
      );
    }
    
    const wordIds = [...new Set(bookEntries.map(wb => wb.word_id))];
    let words = wordIds.map(id => this.kanjiWords.find(w => w.id === id)).filter(Boolean);
    
    // Apply marking category filter if set
    if (this.selectedCategory !== null && this.selectedCategory !== undefined) {
      words = words.filter(w => getMarking(this.markings, w) === this.selectedCategory);
    }
    
    // Read word limit from input
    this.studyWordLimit = parseInt(document.getElementById('kanjiWordLimitInput')?.value) || 0;
    
    // Load sentences for context AND for the sentence panel
    try {
      const sentenceMap = await loadSentencesForWords(this.supabase, wordIds);
      
      // Store raw sentence map for the sentence panel (with link_id for rating)
      this.kanjiSentenceMap = sentenceMap;
      
      // Enrich words with best sentence context for flashcard display
      words = words.map(w => {
        const sentences = sentenceMap[w.id];
        if (sentences && sentences.length > 0) {
          const best = sentences[0]; // highest rated
          const sentText = best.sentence || '';
          const idx = sentText.indexOf(w.kanji);
          if (idx >= 0) {
            return {
              ...w,
              sentence_before: sentText.substring(0, idx),
              sentence_after: sentText.substring(idx + w.kanji.length),
              supporting_word_1: sentText.substring(0, idx),
              supporting_word_2: sentText.substring(idx + w.kanji.length),
            };
          }
          return { ...w, sentence: sentText };
        }
        return w;
      });
    } catch (err) {
      console.warn('Sentences load skipped:', err);
      this.kanjiSentenceMap = {};
    }
    
    // Apply word limit then shuffle
    let shuffled = shuffleArray([...words]);
    if (this.studyWordLimit > 0) shuffled = shuffled.slice(0, this.studyWordLimit);
    
    this.studyWords = shuffled;
    this.currentIndex = 0;
    this.revealStep = 0;
    this.canvasImageData = null;
    this.sentencePanelExpanded = false;
    this.kanjiView = 'flashcard';
    this.render();
  }
  
  toggleSentencePanel() {
    this.sentencePanelExpanded = !this.sentencePanelExpanded;
    // Surgical update — only re-render the sentence panel div
    const container = document.getElementById('flashcardExtraContent');
    if (container) {
      container.innerHTML = renderSentencePanel(this);
      this.attachSentencePanelListeners();
    }
  }
  
  async rateSentence(linkId, newRating) {
    const result = await updateSentenceRating(this.supabase, linkId, newRating);
    if (result.success) {
      // Update local sentence map
      for (const wordId of Object.keys(this.kanjiSentenceMap)) {
        const arr = this.kanjiSentenceMap[wordId];
        const item = arr.find(s => s.link_id === linkId);
        if (item) {
          item.rating = result.rating;
          // Re-sort so highest rated is first (used for context display)
          arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        }
      }
      // Full re-render so flashcard context updates too
      this.render();
      showToast(result.rating ? `Rated ★${result.rating}` : 'Rating cleared', 'success');
    } else {
      showToast('Rating failed', 'error');
    }
  }
  
  async linkSentence(wordId, sentenceId) {
    const userId = this.user?.id || null;
    const result = await linkSentenceToWord(this.supabase, wordId, sentenceId, userId);
    if (result.success) {
      // Add to local sentence map
      const sentence = this.allUnifiedSentences.find(s => s.id === sentenceId);
      if (sentence) {
        if (!this.kanjiSentenceMap[wordId]) this.kanjiSentenceMap[wordId] = [];
        this.kanjiSentenceMap[wordId].push({
          ...sentence,
          link_id: result.link.id,
          sentence_id: sentenceId,
          rating: null,
        });
      }
      // Full re-render so flashcard context updates too
      this.render();
      showToast('Sentence linked!', 'success');
    } else {
      showToast('Link failed: ' + result.error, 'error');
    }
  }
  
  attachSentencePanelListeners() {
    document.getElementById('toggleSentencePanelBtn')?.addEventListener('click', () => this.toggleSentencePanel());
    document.querySelectorAll('[data-rate-link]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.rateSentence(parseInt(btn.dataset.rateLink), parseInt(btn.dataset.rateValue));
      });
    });
    document.querySelectorAll('[data-link-sentence]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.linkSentence(parseInt(btn.dataset.linkWord), parseInt(btn.dataset.linkSentence));
      });
    });
    // Verify from sentence panel
    document.querySelectorAll('#flashcardExtraContent [data-verify-sentence]').forEach(btn => {
      btn.addEventListener('click', () => this.verifySentence(parseInt(btn.dataset.verifySentence), 'verified'));
    });
    // Tags from sentence panel
    document.querySelectorAll('#flashcardExtraContent [data-add-tag]').forEach(btn => {
      btn.addEventListener('click', () => this.addTagToSentence(parseInt(btn.dataset.addTag)));
    });
    document.querySelectorAll('#flashcardExtraContent [data-remove-tag]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTagFromSentence(parseInt(btn.dataset.removeTag), btn.dataset.tagValue);
      });
    });
  }
  
  // ===== ADD SENTENCE BOTTOM SHEET =====
  
  openAddSentenceSheet() {
    this.showAddSentenceSheet = true;
    this.addSentenceSaving = false;
    this.newSentenceText = '';
    this.newSentenceMeaning = '';
    this.newSentenceSource = 'manual';
    this.render();
    // Focus the textarea after render
    setTimeout(() => document.getElementById('newSentenceTextInput')?.focus(), 100);
  }
  
  closeAddSentenceSheet() {
    this.showAddSentenceSheet = false;
    this.render();
  }
  
  // Find the unified word ID for any word
  // After merge, vocabulary words already have unified IDs
  resolveUnifiedWordId(word) {
    if (word.id && this.kanjiWords.some(w => w.id === word.id)) return word.id;
    // Fallback: look up by kanji text
    const kanji = word.kanji || word.raw || '';
    const match = this.kanjiWords.find(w => w.kanji === kanji);
    return match?.id || null;
  }
  
  async submitNewSentence() {
    const sentence = document.getElementById('newSentenceTextInput')?.value?.trim();
    if (!sentence) { showToast('Please enter a sentence', 'error'); return; }
    
    const word = getCurrentStudyWord(this);
    if (!word) return;
    
    this.addSentenceSaving = true;
    this.render();
    
    const meaning = document.getElementById('newSentenceMeaningInput')?.value?.trim() || '';
    const source = document.getElementById('newSentenceSourceInput')?.value?.trim() || 'manual';
    const level = document.getElementById('newSentenceLevelInput')?.value || '';
    
    // Resolve unified word ID (Goi words don't have unified IDs directly)
    const unifiedWordId = this.resolveUnifiedWordId(word);
    if (!unifiedWordId) {
      this.addSentenceSaving = false;
      showToast('Word not found in unified database', 'error');
      this.render();
      return;
    }
    
    const result = await addNewSentenceAndLink(this.supabase, {
      sentence,
      meaning_en: meaning,
      source,
      jlpt_level: level || word.jlpt_level || word.level || null,
    }, unifiedWordId, this.user?.id);
    
    this.addSentenceSaving = false;
    
    if (result.success) {
      if (result.sentence) {
        this.allUnifiedSentences.push(result.sentence);
        if (!this.kanjiSentenceMap[unifiedWordId]) this.kanjiSentenceMap[unifiedWordId] = [];
        this.kanjiSentenceMap[unifiedWordId].push({
          ...result.sentence,
          link_id: result.link?.id,
          sentence_id: result.sentence.id,
          rating: null,
        });
      }
      
      this.showAddSentenceSheet = false;
      this.render();
      showToast('Sentence added & linked!', 'success');
    } else {
      this.render();
      showToast('Failed: ' + (result.error || 'Unknown error'), 'error');
    }
  }
  
  // ===== BULK SENTENCE LINKER =====
  
  openBulkLinker() {
    this.kanjiView = 'bulk-linker';
    this.bulkSentenceInput = '';
    this.bulkSource = 'manual';
    this.bulkParsedResults = null;
    this.bulkSaving = false;
    this.bulkResultMessage = '';
    this.render();
  }
  
  parseBulkSentences() {
    const text = document.getElementById('bulkSentenceInput')?.value?.trim();
    if (!text) { showToast('Paste some sentences first', 'error'); return; }
    
    this.bulkSentenceInput = text;
    this.bulkSource = document.getElementById('bulkSourceInput')?.value?.trim() || 'manual';
    const level = document.getElementById('bulkLevelInput')?.value || '';
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // For each sentence, detect which words from kanjiWords it contains
    // Build a lookup: stem → word objects
    const stemMap = {};
    this.kanjiWords.forEach(w => {
      const stem = extractKanjiStem(w.kanji);
      if (stem) {
        if (!stemMap[stem]) stemMap[stem] = [];
        stemMap[stem].push(w);
      }
    });
    
    // Sort stems by length descending for greedy matching
    const sortedStems = Object.keys(stemMap).sort((a, b) => b.length - a.length);
    
    this.bulkParsedResults = lines.map(line => {
      const detectedWords = [];
      const seenWordIds = new Set();
      
      for (const stem of sortedStems) {
        if (line.includes(stem)) {
          for (const w of stemMap[stem]) {
            if (!seenWordIds.has(w.id)) {
              seenWordIds.add(w.id);
              detectedWords.push(w);
            }
          }
        }
      }
      
      return {
        sentence: line,
        meaning: '', // user can add later
        jlpt_level: level,
        detectedWords,
        linkedWordIds: [], // track which have been linked
      };
    });
    
    this.render();
    showToast(`Detected words in ${lines.length} sentences`, 'success');
  }
  
  async bulkLinkSingle(wordId, sentenceIdx) {
    const result = this.bulkParsedResults?.[sentenceIdx];
    if (!result || !result.insertedSentenceId) {
      showToast('Save all sentences first', 'error');
      return;
    }
    
    const linkResult = await linkSentenceToWord(this.supabase, wordId, result.insertedSentenceId, this.user?.id);
    if (linkResult.success) {
      if (!result.linkedWordIds) result.linkedWordIds = [];
      result.linkedWordIds.push(wordId);
      this.render();
      showToast('Linked!', 'success');
    } else {
      showToast('Link failed', 'error');
    }
  }
  
  async bulkSaveAndLinkAll() {
    if (!this.bulkParsedResults || this.bulkParsedResults.length === 0) return;
    
    this.bulkSaving = true;
    this.render();
    
    const source = this.bulkSource || 'manual';
    const level = document.getElementById('bulkLevelInput')?.value || '';
    
    // Step 1: Insert all sentences
    const sentencesToAdd = this.bulkParsedResults.map(r => ({
      sentence: r.sentence,
      meaning_en: r.meaning || null,
      source,
      jlpt_level: r.jlpt_level || level || null,
    }));
    
    const addResult = await bulkAddSentences(this.supabase, sentencesToAdd, this.user?.id);
    
    if (addResult.added === 0) {
      this.bulkSaving = false;
      this.render();
      showToast('Failed to save sentences: ' + (addResult.errors?.[0] || 'Unknown'), 'error');
      return;
    }
    
    // Map inserted sentence IDs back to parsed results
    const inserted = addResult.insertedSentences || [];
    inserted.forEach((s, i) => {
      if (this.bulkParsedResults[i]) {
        this.bulkParsedResults[i].insertedSentenceId = s.id;
      }
    });
    
    // Step 2: Build all word-sentence links
    const linksToCreate = [];
    this.bulkParsedResults.forEach((result, idx) => {
      if (!result.insertedSentenceId) return;
      result.detectedWords.forEach(dw => {
        linksToCreate.push({ word_id: dw.id, sentence_id: result.insertedSentenceId });
      });
    });
    
    let linkedCount = 0;
    if (linksToCreate.length > 0) {
      const linkResult = await bulkLinkSentences(this.supabase, linksToCreate, this.user?.id);
      linkedCount = linkResult.linked || 0;
      
      // Mark all as linked in local state
      this.bulkParsedResults.forEach(result => {
        result.linkedWordIds = result.detectedWords.map(dw => dw.id);
      });
    }
    
    // Add to local sentence pool
    inserted.forEach(s => this.allUnifiedSentences.push(s));
    
    this.bulkSaving = false;
    this.bulkResultMessage = `✅ ${addResult.added} sentences saved, ${linkedCount} word links created`;
    this.render();
  }
  
  // ===== REVIEW QUEUE =====
  
  openReviewQueue() {
    this.kanjiView = 'review-queue';
    this.reviewFilter = 'unverified';
    this.reviewSourceFilter = 'all';
    this.reviewPage = 0;
    this.render();
  }
  
  setReviewFilter(status) {
    this.reviewFilter = status;
    this.reviewPage = 0;
    this.render();
  }
  
  setReviewSourceFilter(source) {
    this.reviewSourceFilter = source;
    this.reviewPage = 0;
    this.render();
  }
  
  reviewPrevPage() { if (this.reviewPage > 0) { this.reviewPage--; this.render(); } }
  reviewNextPage() { this.reviewPage++; this.render(); }
  
  async verifySentence(sentenceId, status = 'verified') {
    const result = await updateSentenceVerified(this.supabase, sentenceId, status);
    if (result.success) {
      // Update local data
      const sent = this.allUnifiedSentences.find(s => s.id === sentenceId);
      if (sent) sent.verified = status;
      // Also update in kanjiSentenceMap if present
      for (const arr of Object.values(this.kanjiSentenceMap)) {
        const item = arr.find(s => (s.sentence_id || s.id) === sentenceId);
        if (item) item.verified = status;
      }
      this.render();
      const labels = { verified: '✓ Verified', rejected: '✗ Rejected', unverified: '↩ Unverified' };
      showToast(labels[status] || status, 'success');
    } else {
      showToast('Update failed: ' + result.error, 'error');
    }
  }
  
  async addTagToSentence(sentenceId) {
    const input = document.querySelector(`[data-tag-input="${sentenceId}"]`);
    const tag = input?.value?.trim();
    if (!tag) return;
    
    const result = await addSentenceTag(this.supabase, sentenceId, tag);
    if (result.success) {
      // Update local data
      const sent = this.allUnifiedSentences.find(s => s.id === sentenceId);
      if (sent) sent.tags = result.tags;
      for (const arr of Object.values(this.kanjiSentenceMap)) {
        const item = arr.find(s => (s.sentence_id || s.id) === sentenceId);
        if (item) item.tags = result.tags;
      }
      this.render();
      showToast(`Tag "${tag}" added`, 'success');
    } else {
      showToast('Tag failed: ' + result.error, 'error');
    }
  }
  
  async removeTagFromSentence(sentenceId, tag) {
    const result = await removeSentenceTag(this.supabase, sentenceId, tag);
    if (result.success) {
      const sent = this.allUnifiedSentences.find(s => s.id === sentenceId);
      if (sent) sent.tags = result.tags;
      for (const arr of Object.values(this.kanjiSentenceMap)) {
        const item = arr.find(s => (s.sentence_id || s.id) === sentenceId);
        if (item) item.tags = result.tags;
      }
      this.render();
      showToast(`Tag removed`, 'success');
    } else {
      showToast('Remove failed: ' + result.error, 'error');
    }
  }
  
  setTestType(type) {
    this.selectedTestType = type;
    this.revealStep = 0;
    this.canvasImageData = null;
    this.render();
  }
  
  async updateMarking(kanji, newMarking) {
    const oldMarking = this.markings[kanji] || 0;
    this.markings[kanji] = newMarking;
    this.render();
    
    if (!this.user) { showToast('Not logged in — marking not saved!', 'error'); return; }
    const success = await updateMarkingInDB(this.supabase, this.user.id, kanji, newMarking);
    if (!success) { 
      showToast('Save failed!', 'error');
      this.markings[kanji] = oldMarking; 
      this.render(); 
    }
  }
  
  // Shared: load sentences for any set of study words (Goi, Kanji, SRS)
  // Maps words to unified IDs via kanji text, then loads sentences
  async loadSentencesForStudyWords(words) {
    if (!words || words.length === 0) return;
    
    // Build a kanji → unified word ID lookup
    const kanjiToUnified = {};
    this.kanjiWords.forEach(w => { kanjiToUnified[w.kanji] = w.id; });
    
    // Collect unified word IDs for the study set
    const unifiedIds = [];
    words.forEach(w => {
      const kanji = w.kanji || w.raw || '';
      const uid = w.id && this.kanjiWords.some(kw => kw.id === w.id) ? w.id : kanjiToUnified[kanji];
      if (uid && !unifiedIds.includes(uid)) unifiedIds.push(uid);
    });
    
    if (unifiedIds.length === 0) return;
    
    try {
      const sentenceMap = await loadSentencesForWords(this.supabase, unifiedIds);
      // Merge into kanjiSentenceMap (don't overwrite existing entries)
      for (const [wid, sentences] of Object.entries(sentenceMap)) {
        this.kanjiSentenceMap[wid] = sentences;
      }
      console.log(`Sentences loaded: ${Object.keys(sentenceMap).length}/${unifiedIds.length} words have sentences`);
      
      // Enrich study words with best sentence context (sentence_before/sentence_after)
      const activeWords = this.currentTab === 'srs' ? this.srsWords : this.studyWords;
      if (activeWords) {
        activeWords.forEach(w => {
          const kanji = w.kanji || w.raw || '';
          const uid = (w.id && this.kanjiWords.some(kw => kw.id === w.id)) ? w.id : kanjiToUnified[kanji];
          const sentences = uid ? sentenceMap[uid] : null;
          if (sentences && sentences.length > 0) {
            const best = sentences[0]; // highest rated
            const sentText = best.sentence || '';
            const idx = sentText.indexOf(kanji);
            if (idx >= 0) {
              w.sentence_before = sentText.substring(0, idx);
              w.sentence_after = sentText.substring(idx + kanji.length);
              w.supporting_word_1 = w.sentence_before;
              w.supporting_word_2 = w.sentence_after;
            }
          }
        });
      }
      
      // Re-render to show updated context + sentence panel
      this.render();
    } catch (err) {
      console.warn('Sentence loading skipped:', err);
    }
  }
  
  startStudy(weekDay = null) {
    this.studyWordLimit = parseInt(document.getElementById('studyWordLimit')?.value) || 0;
    let words = this.selectedLevel === 'ALL' ? this.vocabulary : this.vocabulary.filter(v => v.level === this.selectedLevel);
    if (weekDay) words = words.filter(w => w.weekDayLabel === weekDay);
    if (this.selectedCategory !== null) words = words.filter(w => getMarking(this.markings, w) === this.selectedCategory);
    
    let shuffled = shuffleArray([...words]);
    if (this.studyWordLimit > 0) shuffled = shuffled.slice(0, this.studyWordLimit);
    this.studyWords = shuffled;
    this.currentIndex = 0;
    this.revealStep = 0;
    this.canvasImageData = null;
    this.sentencePanelExpanded = false;
    this.studyView = 'flashcard';
    this.render();
    
    // Load sentences in background (non-blocking)
    this.loadSentencesForStudyWords(shuffled);
  }
  
  // Quick start from level selector (All/Custom mode)
  startStudyQuick() {
    // Read counts from inputs or use stored values
    for (const level of ['N1', 'N2', 'N3']) {
      const input = document.getElementById(`studyLevel${level}`);
      if (input) this.studyLevelCounts[level] = parseInt(input.value) || 0;
    }
    
    let allWords = [];
    for (const level of ['N1', 'N2', 'N3']) {
      const count = this.studyLevelCounts[level];
      if (count <= 0) continue;
      const pool = this.vocabulary.filter(v => v.level === level);
      allWords.push(...sampleArray(pool, count));
    }
    
    this.studyWords = shuffleArray(allWords);
    this.currentIndex = 0;
    this.revealStep = 0;
    this.canvasImageData = null;
    this.sentencePanelExpanded = false;
    this.studyView = 'flashcard';
    this.render();
    
    // Load sentences in background (non-blocking)
    this.loadSentencesForStudyWords(this.studyWords);
  }
  
  nextWord() {
    if (this.currentIndex < this.studyWords.length - 1) {
      this.currentIndex++;
      this.revealStep = 0;
      this.canvasImageData = null;
      this.render();
    }
  }
  
  prevWord() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.revealStep = 0;
      this.canvasImageData = null;
      this.render();
    }
  }
  
  randomWord() {
    if (this.studyWords.length > 1) {
      let n; do { n = Math.floor(Math.random() * this.studyWords.length); } while (n === this.currentIndex);
      this.currentIndex = n;
      this.revealStep = 0;
      this.canvasImageData = null;
      this.render();
    }
  }
  
  revealNext() {
    const maxSteps = this.selectedTestType === 'reading' ? 3 : 4;
    if (this.revealStep >= maxSteps) return;
    if (this.selectedTestType === 'writing') this.canvasImageData = saveCanvasData('writingCanvas');
    this.revealStep++;
    this.render();
  }
  
  restoreCanvasData() {
    if (this.canvasImageData) {
      restoreCanvasData(this.canvasImageData, 'writingCanvas');
      restoreCanvasData(this.canvasImageData, 'srsWritingCanvas');
    }
  }
  
  startSRSTest() {
    let allWords = [];
    // Use ALL unified words for SRS (not just JLPT vocabulary)
    const wordPool = this.kanjiWords;
    
    if (this.srsConfig.selectionMode === 'marking') {
      for (let k = 1; k <= 5; k++) {
        this.srsConfig.markingCounts[k] = parseInt(document.getElementById(`srsMarkCount${k}`)?.value) || 0;
      }
      for (let k = 1; k <= 5; k++) {
        const count = this.srsConfig.markingCounts[k];
        if (count <= 0) continue;
        const pool = wordPool.filter(w => getMarking(this.markings, w) === k);
        allWords.push(...sampleArray(pool, count));
      }
    } else {
      // Level mode: read from inputs (works for both all/custom)
      for (const level of ['N1', 'N2', 'N3']) {
        const input = document.getElementById(`srs${level}Count`);
        if (input) this.srsConfig[`${level.toLowerCase()}Count`] = parseInt(input.value) || 0;
      }
      const n1 = wordPool.filter(v => v.level === 'N1');
      const n2 = wordPool.filter(v => v.level === 'N2');
      const n3 = wordPool.filter(v => v.level === 'N3');
      allWords = [
        ...sampleArray(n1, this.srsConfig.n1Count),
        ...sampleArray(n2, this.srsConfig.n2Count),
        ...sampleArray(n3, this.srsConfig.n3Count)
      ];
    }
    
    this.srsWords = shuffleArray(allWords);
    this.srsCurrentIndex = 0;
    this.srsAnswers = [];
    this.srsSelectedAnswer = null;
    this.srsShowResult = false;
    this.canvasImageData = null;
    this.sentencePanelExpanded = false;
    this.generateMCQOptions();
    this.srsView = 'test';
    this.render();
    
    // Load sentences in background (non-blocking)
    this.loadSentencesForStudyWords(this.srsWords);
  }
  
  generateMCQOptions() {
    if (this.srsConfig.testType === 'writing') return;
    const word = this.srsWords[this.srsCurrentIndex];
    if (!word) return;
    
    const testType = this.srsConfig.testType;
    
    if (testType === 'kanji_recognition') {
      // Kanji Recognition: show kanji, choose meaning
      const correct = word.meaning;
      const pool = this.kanjiWords.filter(v => v.meaning !== correct && v.meaning);
      const wrong = sampleArray(pool, 3).map(v => v.meaning);
      this.srsOptions = shuffleArray([correct, ...wrong]);
    } else {
      const isH2K = testType === 'hiragana_to_kanji';
      const correct = isH2K ? (word.kanji || word.raw) : word.hiragana;
      
      let options;
      if (isH2K) {
        options = this.generateH2KOptions(word, correct);
      } else {
        options = this.generateK2HOptions(word, correct);
      }
      
      this.srsOptions = shuffleArray([correct, ...options.slice(0, 3)]);
    }
  }
  
  generateH2KOptions(word, correct) {
    const all = this.kanjiWords;  // Use all unified words for better distractors
    const kanjiLen = [...(correct || '')].length;
    const distractors = [];
    
    // P1: Homophones
    const homophones = all.filter(v => v.hiragana === word.hiragana && (v.kanji || v.raw) !== correct);
    distractors.push(...homophones.map(v => v.kanji || v.raw));
    if (distractors.length >= 3) return shuffleArray([...new Set(distractors)]);
    
    // P2: Same length + shared kanji
    const correctChars = [...(correct || '')];
    const sameLenKanji = all.filter(v => {
      const k = v.kanji || v.raw;
      return k !== correct && [...k].length === kanjiLen;
    });
    
    // Sub-priority: last kanji match, first match, any match
    for (const pos of ['last', 'first', 'any']) {
      const matches = sameLenKanji.filter(v => {
        const chars = [...(v.kanji || v.raw)];
        if (pos === 'last') return chars[chars.length - 1] === correctChars[correctChars.length - 1];
        if (pos === 'first') return chars[0] === correctChars[0];
        return chars.some(c => correctChars.includes(c) && /[\u4e00-\u9faf]/.test(c));
      });
      distractors.push(...matches.map(v => v.kanji || v.raw));
      if ([...new Set(distractors)].filter(d => d !== correct).length >= 3) break;
    }
    if ([...new Set(distractors)].filter(d => d !== correct).length >= 3) {
      return shuffleArray([...new Set(distractors)].filter(d => d !== correct));
    }
    
    // P3: Semantic proximity (shared meaning keywords)
    const meaningWords = (word.meaning || '').toLowerCase().split(/[\s,;/]+/).filter(w => w.length > 2);
    if (meaningWords.length > 0) {
      const semantic = all.filter(v => {
        if ((v.kanji || v.raw) === correct) return false;
        const m = (v.meaning || '').toLowerCase();
        return meaningWords.some(w => m.includes(w));
      });
      distractors.push(...semantic.map(v => v.kanji || v.raw));
    }
    
    // Fallback: same level then random
    const unique = [...new Set(distractors)].filter(d => d !== correct);
    if (unique.length < 3) {
      const levelPool = all.filter(v => v.level === word.level && (v.kanji || v.raw) !== correct);
      unique.push(...sampleArray(levelPool, 6).map(v => v.kanji || v.raw));
    }
    if ([...new Set(unique)].length < 3) {
      unique.push(...sampleArray(all, 6).map(v => v.kanji || v.raw));
    }
    return [...new Set(unique)].filter(d => d !== correct);
  }
  
  generateK2HOptions(word, correct) {
    const all = this.kanjiWords;  // Use all unified words for better distractors
    const distractors = [];
    const correctKanji = word.kanji || word.raw;
    const kanjiChars = [...(correctKanji || '')].filter(c => /[\u4e00-\u9faf]/.test(c));
    
    // P2: Shared kanji (onyomi match proxy)
    if (kanjiChars.length > 0) {
      const sharedKanji = all.filter(v => {
        if (v.hiragana === correct) return false;
        const k = v.kanji || v.raw || '';
        return kanjiChars.some(c => k.includes(c));
      });
      distractors.push(...sharedKanji.map(v => v.hiragana));
    }
    
    // P3: Pronunciation mutations
    const mutations = generatePronunciationMutations(correct);
    const mutationMatches = all.filter(v => mutations.includes(v.hiragana) && v.hiragana !== correct);
    distractors.push(...mutationMatches.map(v => v.hiragana));
    
    // Fallback
    const unique = [...new Set(distractors)].filter(d => d && d !== correct);
    if (unique.length < 3) {
      const pool = all.filter(v => v.hiragana !== correct);
      unique.push(...sampleArray(pool, 6).map(v => v.hiragana));
    }
    return [...new Set(unique)].filter(d => d && d !== correct);
  }
  
  selectSRSOption(idx) { this.srsSelectedAnswer = idx; this.render(); }
  
  submitSRSAnswer() {
    const word = this.srsWords[this.srsCurrentIndex];
    const testType = this.srsConfig.testType;
    let correct;
    if (testType === 'kanji_recognition') {
      correct = word.meaning;
    } else if (testType === 'hiragana_to_kanji') {
      correct = word.kanji || word.raw;
    } else {
      correct = word.hiragana;
    }
    const user = this.srsOptions[this.srsSelectedAnswer];
    this.srsAnswers.push({ word, correct: user === correct, userAnswer: user, correctAnswer: correct });
    this.srsShowResult = true;
    this.render();
  }
  
  srsNextQuestion() {
    if (this.srsCurrentIndex < this.srsWords.length - 1) {
      this.srsCurrentIndex++;
      this.srsSelectedAnswer = null;
      this.srsShowResult = false;
      this.canvasImageData = null;
      this.generateMCQOptions();
      this.render();
    } else {
      this.srsView = 'results';
      this.render();
    }
  }
  
  revealSRSWriting() { this.srsShowResult = true; this.render(); }
  
  markSRSWritingResult(isCorrect) {
    const word = this.srsWords[this.srsCurrentIndex];
    this.srsAnswers.push({ word, correct: isCorrect, userAnswer: isCorrect ? 'Correct' : 'Wrong', correctAnswer: word.kanji || word.raw });
    this.srsNextQuestion();
  }
  
  retestWrongAnswers() {
    const wrong = this.srsAnswers.filter(a => !a.correct).map(a => a.word);
    if (wrong.length === 0) return;
    this.srsWords = shuffleArray(wrong);
    this.srsCurrentIndex = 0;
    this.srsAnswers = [];
    this.srsSelectedAnswer = null;
    this.srsShowResult = false;
    this.canvasImageData = null;
    this.generateMCQOptions();
    this.srsView = 'test';
    this.render();
  }
  
  resetSRS() {
    this.srsView = 'setup';
    this.srsWords = [];
    this.srsCurrentIndex = 0;
    this.srsAnswers = [];
    this.srsSelectedAnswer = null;
    this.srsShowResult = false;
    this.canvasImageData = null;
    this.render();
  }
  
  async submitNewTopic() {
    const name = document.getElementById('topicNameInput')?.value?.trim();
    if (!name) { alert('Please enter a topic name'); return; }
    
    const data = await addTopic(this.supabase, this.user.id, { name, icon: '\uD83D\uDCDA', color: 'blue', description: document.getElementById('topicDescInput')?.value || '' });
    if (data) { this.selfStudyTopics.push(data); this.showAddTopicModal = false; this.render(); }
    else alert('Failed to add topic');
  }
  
  async submitNewWord() {
    const kanji = document.getElementById('wordKanjiInput')?.value?.trim();
    if (!kanji || !this.selectedTopic) { alert('Please enter the word'); return; }
    
    const wordData = {
      kanji,
      hiragana: document.getElementById('wordHiraganaInput')?.value || '',
      meaning: document.getElementById('wordMeaningInput')?.value || '',
      hint: document.getElementById('wordHintInput')?.value || ''
    };
    
    const data = await addSelfStudyWord(this.supabase, this.user.id, this.selectedTopic.id, wordData);
    if (data) { this.selfStudyWords.push(data); this.showAddWordModal = false; this.render(); }
    else alert('Failed to add word');
  }
  
  // ===== STORY OVERLAY =====
  openStoryOverlay(word) {
    if (this.selectedTestType === 'writing' || this.srsConfig.testType === 'writing') {
      this.canvasImageData = saveCanvasData('writingCanvas') || saveCanvasData('srsWritingCanvas');
    }
    const kanjiChars = [...(word.kanji || '')].filter(c => /[\u4e00-\u9faf]/.test(c));
    this.storyOverlay = {
      word, step: kanjiChars.length > 0 ? 2 : 1,
      expandedPart: kanjiChars[0] || null,
      groupKey: null, highlightKanji: null, kanjiParts: kanjiChars
    };
    this.render();
  }
  
  closeStoryOverlay() { this.storyOverlay = null; this.storyAlertTarget = null; this.render(); }
  
  storyGoGroup(groupKanji, highlightKanji) {
    if (!this.storyOverlay) return;
    this.storyOverlay.step = 3;
    this.storyOverlay.groupKey = groupKanji;
    this.storyOverlay.highlightKanji = highlightKanji;
    this.render();
  }
  
  storyBackToBreakdown() {
    if (!this.storyOverlay) return;
    this.storyOverlay.step = 2;
    this.storyOverlay.groupKey = null;
    this.render();
  }
  
  storySelectPart(kanjiChar) {
    if (!this.storyOverlay) return;
    this.storyOverlay.expandedPart = kanjiChar;
    this.render();
  }
  
  findStoryForKanji(kanjiChar) {
    return this.stories.find(s => s.kanji === kanjiChar) || null;
  }
  
  findGroupForKanji(kanjiChar) {
    const story = this.findStoryForKanji(kanjiChar);
    if (!story || !story.group_kanji) return null;
    return this.storyGroups.find(g => g.group_kanji === story.group_kanji) || null;
  }
  
  getGroupMembersForKanji(groupKanji) {
    return this.stories.filter(s => s.group_kanji === groupKanji);
  }
  
  // ===== STORY ALERT =====
  openStoryAlert(kanji, groupKanji, source) {
    this.storyAlertTarget = { kanji, groupKanji, source };
    this.storyAlertComment = '';
    this.storyAlertType = 'incorrect';
    this.storyAlertSaving = false;
    this.render();
  }
  
  closeStoryAlert() { this.storyAlertTarget = null; this.render(); }
  
  async submitStoryAlert() {
    if (!this.storyAlertTarget || !this.user) return;
    this.storyAlertSaving = true;
    this.render();
    
    const result = await saveStoryAlert(this.supabase, this.user.id, {
      kanji: this.storyAlertTarget.kanji,
      groupKanji: this.storyAlertTarget.groupKanji,
      alertType: this.storyAlertType,
      comment: this.storyAlertComment,
      source: this.storyAlertTarget.source
    });
    
    this.storyAlertSaving = false;
    if (result.success) {
      this.storyAlertTarget = null;
      this.render();
      showToast('⚠️ Story alert saved!', 'success');
    } else {
      showToast(`Alert save failed: ${result.error}`, 'error');
    }
  }
  
  // ===== WORD ALERT =====
  openWordAlert(word, source = 'flashcard') {
    this.wordAlertTarget = { 
      kanji: word.kanji || word.raw, 
      hiragana: word.hiragana || '', 
      meaning: word.meaning || '',
      source 
    };
    this.wordAlertComment = '';
    this.wordAlertType = 'wrong_reading';
    this.wordAlertSaving = false;
    this.render();
  }
  
  closeWordAlert() { this.wordAlertTarget = null; this.render(); }
  
  async submitWordAlert() {
    if (!this.wordAlertTarget || !this.user) return;
    this.wordAlertSaving = true;
    this.render();
    
    const result = await saveWordAlert(this.supabase, this.user.id, {
      kanji: this.wordAlertTarget.kanji,
      hiragana: this.wordAlertTarget.hiragana,
      meaning: this.wordAlertTarget.meaning,
      alertType: this.wordAlertType,
      comment: this.wordAlertComment,
      source: this.wordAlertTarget.source
    });
    
    this.wordAlertSaving = false;
    if (result.success) {
      this.wordAlertTarget = null;
      this.render();
      showToast('🚩 Word flag saved!', 'success');
    } else {
      showToast(`Flag save failed: ${result.error}`, 'error');
    }
  }
  
  // ===== HELPERS =====
  getMarkingStats() {
    const stats = {};
    for (let k = 0; k <= 5; k++) {
      stats[k] = this.kanjiWords.filter(w => getMarking(this.markings, w) === k).length;
    }
    return stats;
  }
  
  render() {
    const app = document.getElementById('app');
    
    if (this.loading) { app.innerHTML = renderLoading(); return; }
    if (!this.user) { app.innerHTML = renderLogin(); attachEventListeners(this); return; }
    
    // Build a view key that captures the exact "page" we're on
    const getViewKey = () => {
      if (this.currentTab === 'stories') return this.selectedStoryGroup ? 'stories-detail' : 'stories-list';
      if (this.currentTab === 'similar') return this.selectedWordGroup ? 'relations-detail' : this.relationsCategory ? `relations-${this.relationsCategory}` : 'relations-folders';
      if (this.currentTab === 'study') return `study-${this.studySubTab}-${this.studyView}-${this.kanjiView}`;
      return this.currentTab;
    };
    
    // Save scroll position before re-render
    if (!this._scrollCache) this._scrollCache = {};
    const prevKey = this._lastViewKey;
    const scrollable = app.querySelector('main .overflow-auto');
    if (scrollable && prevKey) {
      this._scrollCache[prevKey] = scrollable.scrollTop;
    }
    
    let content;
    switch (this.currentTab) {
      case 'study': content = this.renderStudyTab(); break;
      case 'srs': content = renderSRSTab(this); break;
      case 'stories': content = renderStoriesTab(this); break;
      case 'similar': content = renderRelationsTab(this); break;
      default: content = this.renderStudyTab();
    }
    
    const newKey = getViewKey();
    this._lastViewKey = newKey;
    
    app.innerHTML = `
      ${renderHeader(this)}
      ${renderTabs(this.currentTab)}
      <main class="flex-1 flex flex-col overflow-hidden">${content}</main>
      ${this.renderModals()}
      ${renderStoryOverlay(this)}
      ${renderStoryAlertForm(this)}
      ${renderWordAlertForm(this)}
      ${renderAddSentenceSheet(this)}
    `;
    
    // Restore scroll position for this view
    const savedScroll = this._scrollCache[newKey];
    if (savedScroll > 0) {
      const newScrollable = app.querySelector('main .overflow-auto');
      if (newScrollable) newScrollable.scrollTop = savedScroll;
    }
    
    attachEventListeners(this);
    
    // Inject sentence panel into ANY flashcard view (Goi, Kanji, SRS)
    const isFlashcard = 
      (this.currentTab === 'study' && this.studySubTab === 'goi' && this.studyView === 'flashcard') ||
      (this.currentTab === 'study' && this.studySubTab === 'kanji' && this.kanjiView === 'flashcard') ||
      (this.currentTab === 'srs' && this.srsView === 'test');
    
    if (isFlashcard) {
      const container = document.getElementById('flashcardExtraContent');
      if (container) {
        container.innerHTML = renderSentencePanel(this);
        this.attachSentencePanelListeners();
      } else {
        console.warn('Sentence panel: flashcardExtraContent div not found. Deploy latest render.js with ?v= cache-bust.');
      }
    }
    
    // Add sentence sheet listeners
    document.getElementById('openAddSentenceSheetBtn')?.addEventListener('click', () => this.openAddSentenceSheet());
    document.getElementById('closeAddSentenceSheetBtn')?.addEventListener('click', () => this.closeAddSentenceSheet());
    document.getElementById('addSentenceSheetBg')?.addEventListener('click', (e) => {
      if (e.target.id === 'addSentenceSheetBg') this.closeAddSentenceSheet();
    });
    document.getElementById('submitNewSentenceBtn')?.addEventListener('click', () => this.submitNewSentence());
    
    // (Bulk linker and review queue moved to data-manager.html)
    
    // Verify / reject / unverify
    document.querySelectorAll('[data-verify-sentence]').forEach(btn => {
      btn.addEventListener('click', () => this.verifySentence(parseInt(btn.dataset.verifySentence), 'verified'));
    });
    document.querySelectorAll('[data-reject-sentence]').forEach(btn => {
      btn.addEventListener('click', () => this.verifySentence(parseInt(btn.dataset.rejectSentence), 'rejected'));
    });
    document.querySelectorAll('[data-unverify-sentence]').forEach(btn => {
      btn.addEventListener('click', () => this.verifySentence(parseInt(btn.dataset.unverifySentence), 'unverified'));
    });
    
    // Tag add / remove
    document.querySelectorAll('[data-add-tag]').forEach(btn => {
      btn.addEventListener('click', () => this.addTagToSentence(parseInt(btn.dataset.addTag)));
    });
    document.querySelectorAll('[data-remove-tag]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTagFromSentence(parseInt(btn.dataset.removeTag), btn.dataset.tagValue);
      });
    });
  }
  
  renderStudyTab() {
    const subTabs = renderStudySubTabs(this.studySubTab);
    let content;
    
    if (this.studySubTab === 'goi') {
      switch (this.studyView) {
        case 'level': content = renderLevelSelector(this); break;
        case 'weekday': content = renderWeekDaySelector(this); break;
        case 'wordlist': content = renderWordList(this); break;
        case 'flashcard': content = renderFlashcard(this); break;
        default: content = renderLevelSelector(this);
      }
    } else if (this.studySubTab === 'kanji') {
      if (this.kanjiView === 'flashcard') {
        content = renderFlashcard(this);
      } else {
        content = renderKanjiTab(this);
      }
    } else {
      if (this.studyView === 'wordlist' && this.selectedTopic) content = renderSelfStudyWordList(this);
      else if (this.studyView === 'flashcard' && this.selectedTopic) content = renderFlashcard(this);
      else content = renderSelfStudyTopics(this);
    }
    
    return subTabs + content;
  }
  
  renderModals() {
    if (this.showAddTopicModal) {
      return `
        <div id="modalOverlay" class="modal-overlay">
          <div class="modal-content p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold text-white">Add New Topic</h2>
              <button id="closeModalBtn" class="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div class="space-y-4">
              <div>
                <label class="text-slate-400 text-sm block mb-1">Topic Name *</label>
                <input type="text" id="topicNameInput" class="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600" placeholder="e.g., Anime Vocabulary">
              </div>
              <div>
                <label class="text-slate-400 text-sm block mb-1">Description</label>
                <textarea id="topicDescInput" class="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600" rows="2" placeholder="Optional"></textarea>
              </div>
              <button id="submitTopicBtn" class="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600">Create Topic</button>
            </div>
          </div>
        </div>
      `;
    }
    
    if (this.showAddWordModal) {
      return `
        <div id="modalOverlay" class="modal-overlay">
          <div class="modal-content p-6">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold text-white">Add New Word</h2>
              <button id="closeModalBtn" class="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div class="space-y-4">
              <div>
                <label class="text-slate-400 text-sm block mb-1">Word *</label>
                <input type="text" id="wordKanjiInput" class="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600" placeholder="e.g., 勉強">
              </div>
              <div>
                <label class="text-slate-400 text-sm block mb-1">Reading</label>
                <input type="text" id="wordHiraganaInput" class="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600" placeholder="e.g., べんきょう">
              </div>
              <div>
                <label class="text-slate-400 text-sm block mb-1">Meaning</label>
                <input type="text" id="wordMeaningInput" class="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600" placeholder="e.g., study">
              </div>
              <div>
                <label class="text-slate-400 text-sm block mb-1">Hint</label>
                <input type="text" id="wordHintInput" class="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600" placeholder="Memory hint">
              </div>
              <button id="submitWordBtn" class="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600">Add Word</button>
            </div>
          </div>
        </div>
      `;
    }
    
    return '';
  }
}

window.app = new JLPTStudyApp();
