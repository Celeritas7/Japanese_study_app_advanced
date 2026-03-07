// JLPT Vocabulary Master - Main Application
// Version 12.0

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=13';
import { getMarking, sampleArray, shuffleArray, generatePronunciationMutations, showToast } from './utils.js?v=13';
import { 
  loadVocabulary, loadMarkings, loadStoryGroups, loadStories, 
  loadSimilarGroups, loadSelfStudyTopics, loadSelfStudyWords,
  updateMarkingInDB, addTopic, addSelfStudyWord,
  loadMarkingCategories, DEFAULT_MARKING_CATEGORIES, saveStoryAlert, saveWordAlert
} from './data.js?v=13';
import { saveCanvasData, restoreCanvasData } from './canvas.js?v=13';
import { 
  renderLoading, renderLogin, renderHeader, renderTabs, renderStudySubTabs,
  renderLevelSelector, renderWeekDaySelector, renderWordList, renderFlashcard,
  renderKanjiPlaceholder, renderSelfStudyTopics, renderSelfStudyWordList,
  renderWordAlertForm
} from './render.js?v=13';
import { renderSRSTab } from './render-srs.js?v=13';
import { renderStoriesTab, renderStoryOverlay, renderStoryAlertForm } from './render-stories.js?v=13';
import { renderSimilarTab } from './render-similar.js?v=13';
import { attachEventListeners } from './events.js?v=13';

// Guest user ID for testing (your actual user ID)
const GUEST_USER_ID = '5817df8a-043f-4aaf-9832-59ff82a6ae2e';

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
    this.selfStudyTopics = [];
    this.selfStudyWords = [];
    
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
    console.log('loadAllData: Full user object:', this.user);
    console.log('loadAllData: userId:', userId);
    
    const [vocabulary, markings, markingCategories, storyGroups, stories, similarGroups, topics, words] = await Promise.all([
      loadVocabulary(this.supabase),
      loadMarkings(this.supabase, userId),
      loadMarkingCategories(this.supabase, userId),
      loadStoryGroups(this.supabase),
      loadStories(this.supabase),
      loadSimilarGroups(this.supabase),
      loadSelfStudyTopics(this.supabase, userId),
      loadSelfStudyWords(this.supabase, userId)
    ]);
    
    this.vocabulary = vocabulary;
    this.markings = markings;
    this.markingCategories = markingCategories;
    this.storyGroups = storyGroups;
    this.stories = stories;
    this.similarGroups = similarGroups;
    this.selfStudyTopics = topics;
    this.selfStudyWords = words;
    
    console.log(`Loaded: ${vocabulary.length} vocab, ${Object.keys(markings).length} markings`);
    this.syncing = false;
    this.render();
  }
  
  selectTab(tab) {
    this.currentTab = tab;
    if (tab === 'study') { this.studyView = 'level'; this.selectedLevel = null; }
    this.selectedStoryGroup = null;
    this.selectedSimilarGroup = null;
    this.render();
  }
  
  selectStudySubTab(subTab) {
    this.studySubTab = subTab;
    this.studyView = 'level';
    this.selectedLevel = null;
    this.selectedTopic = null;
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
    this.selectedLevel = null;
    this.selectedTopic = null;
    this.studyView = 'level';
    this.render();
  }
  
  backToWeekDay() {
    this.studyView = 'weekday';
    this.selectedCategory = null;
    this.render();
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
    this.studyView = 'flashcard';
    this.render();
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
    this.studyView = 'flashcard';
    this.render();
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
    
    if (this.srsConfig.selectionMode === 'marking') {
      for (let k = 1; k <= 5; k++) {
        this.srsConfig.markingCounts[k] = parseInt(document.getElementById(`srsMarkCount${k}`)?.value) || 0;
      }
      for (let k = 1; k <= 5; k++) {
        const count = this.srsConfig.markingCounts[k];
        if (count <= 0) continue;
        const pool = this.vocabulary.filter(w => getMarking(this.markings, w) === k);
        allWords.push(...sampleArray(pool, count));
      }
    } else {
      // Level mode: read from inputs (works for both all/custom)
      for (const level of ['N1', 'N2', 'N3']) {
        const input = document.getElementById(`srs${level}Count`);
        if (input) this.srsConfig[`${level.toLowerCase()}Count`] = parseInt(input.value) || 0;
      }
      const n1 = this.vocabulary.filter(v => v.level === 'N1');
      const n2 = this.vocabulary.filter(v => v.level === 'N2');
      const n3 = this.vocabulary.filter(v => v.level === 'N3');
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
    this.generateMCQOptions();
    this.srsView = 'test';
    this.render();
  }
  
  generateMCQOptions() {
    if (this.srsConfig.testType === 'writing') return;
    const word = this.srsWords[this.srsCurrentIndex];
    if (!word) return;
    
    const testType = this.srsConfig.testType;
    
    if (testType === 'kanji_recognition') {
      // Kanji Recognition: show kanji, choose meaning
      const correct = word.meaning;
      const pool = this.vocabulary.filter(v => v.meaning !== correct && v.meaning);
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
    const all = this.vocabulary;
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
    const all = this.vocabulary;
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
      stats[k] = this.vocabulary.filter(w => getMarking(this.markings, w) === k).length;
    }
    return stats;
  }
  
  render() {
    const app = document.getElementById('app');
    
    if (this.loading) { app.innerHTML = renderLoading(); return; }
    if (!this.user) { app.innerHTML = renderLogin(); attachEventListeners(this); return; }
    
    let content;
    switch (this.currentTab) {
      case 'study': content = this.renderStudyTab(); break;
      case 'srs': content = renderSRSTab(this); break;
      case 'stories': content = renderStoriesTab(this); break;
      case 'similar': content = renderSimilarTab(this); break;
      default: content = this.renderStudyTab();
    }
    
    app.innerHTML = `
      ${renderHeader(this)}
      ${renderTabs(this.currentTab)}
      <main class="flex-1 flex flex-col overflow-hidden">${content}</main>
      ${this.renderModals()}
      ${renderStoryOverlay(this)}
      ${renderStoryAlertForm(this)}
      ${renderWordAlertForm(this)}
    `;
    
    attachEventListeners(this);
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
      content = renderKanjiPlaceholder();
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
