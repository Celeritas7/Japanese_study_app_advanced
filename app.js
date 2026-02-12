// JLPT Vocabulary Master - Main Application

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getMarking, sampleArray, shuffleArray } from './utils.js';
import { 
  loadVocabulary, loadMarkings, loadStoryGroups, loadStories, 
  loadSimilarGroups, loadSelfStudyTopics, loadSelfStudyWords,
  loadUserSentences, loadSentenceLinks, updateMarkingInDB, saveSRSMistake,
  addTopic, addSelfStudyWord, addSentence
} from './data.js';
import { saveCanvasData, restoreCanvasData } from './canvas.js';
import { 
  renderLoading, renderLogin, renderHeader, renderTabs, renderStudySubTabs,
  renderLevelSelector, renderWeekDaySelector, renderWordList, renderFlashcard,
  renderKanjiPlaceholder, renderSelfStudyTopics, renderSelfStudyWordList,
  renderSRSTab, renderStoriesTab, renderSimilarTab
} from './render.js';
import { attachEventListeners } from './events.js';

class JLPTStudyApp {
  constructor() {
    // Initialize Supabase
    this.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.sb = this.sb;
    
    // User state
    this.user = null;
    this.loading = true;
    this.syncing = false;
    
    // Data
    this.vocabulary = [];
    this.markings = {};
    this.storyGroups = [];
    this.stories = [];
    this.similarGroups = [];
    this.selfStudyTopics = [];
    this.selfStudyWords = [];
    this.userSentences = [];
    this.sentenceLinks = [];
    
    // Navigation state
    this.currentTab = 'study';
    this.studySubTab = 'goi';
    this.studyView = 'level';
    this.selectedLevel = null;
    this.selectedWeekDay = null;
    this.selectedCategory = null;
    this.selectedTestType = 'kanji';
    this.selectedTopic = null;
    
    // Flashcard state
    this.studyWords = [];
    this.currentIndex = 0;
    this.revealStep = 0;
    this.canvasImageData = null;
    
    // Story/Similar state
    this.selectedStoryGroup = null;
    this.storyFilter = '';
    this.selectedSimilarGroup = null;
    this.similarFilter = { type: 'all', search: '' };
    
    // SRS state
    this.srsView = 'setup';
    this.srsConfig = { n1Count: 0, n2Count: 0, n3Count: 0, testType: 'hiragana_to_kanji' };
    this.srsWords = [];
    this.srsCurrentIndex = 0;
    this.srsAnswers = [];
    this.srsOptions = [];
    this.srsSelectedAnswer = null;
    this.srsShowResult = false;
    
    // Modal state
    this.showAddTopicModal = false;
    this.showAddWordModal = false;
    this.showAddSentenceModal = false;
    
    // Form data
    this.newTopic = { name: '', icon: '📚', color: 'blue', description: '' };
    this.newWord = { kanji: '', hiragana: '', meaning: '', hint: '', source: '', notes: '' };
    this.newSentence = { japanese: '', furigana: '', meaning: '', source: 'Self-made', notes: '' };
    
    this.init();
  }
  
  async init() {
    this.render();
    
    const { data: { session } } = await this.sb.auth.getSession();
    if (session) this.user = session.user;
    
    this.sb.auth.onAuthStateChange((event, session) => {
      this.user = session?.user || null;
      if (event === 'SIGNED_IN') this.loadAllData();
      this.render();
    });
    
    if (this.user) await this.loadAllData();
    
    this.loading = false;
    this.render();
  }
  
  // ===== AUTH =====
  async signInWithGoogle() {
    const { error } = await this.sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) alert('Login failed: ' + error.message);
  }
  
  async signOut() {
    await this.sb.auth.signOut();
    this.user = null;
    this.currentTab = 'study';
    this.studyView = 'level';
    this.render();
  }
  
  // ===== DATA LOADING =====
  async loadAllData() {
    this.syncing = true;
    this.render();
    
    const userId = this.user?.id;
    
    const [vocabulary, markings, storyGroups, stories, similarGroups, topics, words, sentences, links] = await Promise.all([
      loadVocabulary(this.sb),
      loadMarkings(this.sb, userId),
      loadStoryGroups(this.sb),
      loadStories(this.sb),
      loadSimilarGroups(this.sb),
      loadSelfStudyTopics(this.sb, userId),
      loadSelfStudyWords(this.sb, userId),
      loadUserSentences(this.sb, userId),
      loadSentenceLinks(this.sb, userId)
    ]);
    
    this.vocabulary = vocabulary;
    this.markings = markings;
    this.storyGroups = storyGroups;
    this.stories = stories;
    this.similarGroups = similarGroups;
    this.selfStudyTopics = topics;
    this.selfStudyWords = words;
    this.userSentences = sentences;
    this.sentenceLinks = links;
    
    this.syncing = false;
    this.render();
  }
  
  // ===== NAVIGATION =====
  selectTab(tab) {
    this.currentTab = tab;
    if (tab === 'study') {
      this.studyView = 'level';
      this.selectedLevel = null;
    }
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
  
  // ===== MARKING =====
  async updateMarking(kanji, newMarking) {
    const oldMarking = this.markings[kanji] || 0;
    this.markings[kanji] = newMarking;
    this.render();
    
    if (!this.user) return;
    
    const success = await updateMarkingInDB(this.sb, this.user.id, kanji, newMarking);
    if (!success) {
      this.markings[kanji] = oldMarking;
      this.render();
    }
  }
  
  // ===== STUDY =====
  startStudy(weekDay = null) {
    let words = this.selectedLevel === 'ALL' 
      ? this.vocabulary 
      : this.vocabulary.filter(v => v.level === this.selectedLevel);
    
    if (weekDay) words = words.filter(w => w.weekDayLabel === weekDay);
    if (this.selectedCategory !== null) words = words.filter(w => getMarking(this.markings, w) === this.selectedCategory);
    
    this.studyWords = words;
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
      let newIndex;
      do { newIndex = Math.floor(Math.random() * this.studyWords.length); } while (newIndex === this.currentIndex);
      this.currentIndex = newIndex;
      this.revealStep = 0;
      this.canvasImageData = null;
      this.render();
    }
  }
  
  revealNext() {
    if (this.selectedTestType === 'writing') {
      this.canvasImageData = saveCanvasData('writingCanvas');
    }
    this.revealStep++;
    this.render();
  }
  
  restoreCanvasData() {
    if (this.canvasImageData) {
      restoreCanvasData(this.canvasImageData, 'writingCanvas');
      restoreCanvasData(this.canvasImageData, 'srsWritingCanvas');
    }
  }
  
  // ===== SRS =====
  startSRSTest() {
    const n1Words = this.vocabulary.filter(v => v.level === 'N1');
    const n2Words = this.vocabulary.filter(v => v.level === 'N2');
    const n3Words = this.vocabulary.filter(v => v.level === 'N3');
    
    this.srsWords = shuffleArray([
      ...sampleArray(n1Words, this.srsConfig.n1Count),
      ...sampleArray(n2Words, this.srsConfig.n2Count),
      ...sampleArray(n3Words, this.srsConfig.n3Count)
    ]);
    
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
    
    const currentWord = this.srsWords[this.srsCurrentIndex];
    if (!currentWord) return;
    
    const isH2K = this.srsConfig.testType === 'hiragana_to_kanji';
    const correctAnswer = isH2K ? (currentWord.kanji || currentWord.raw) : currentWord.hiragana;
    
    const pool = this.vocabulary.filter(v => 
      (isH2K ? (v.kanji || v.raw) : v.hiragana) !== correctAnswer
    );
    
    const wrongOptions = sampleArray(pool, 3).map(v => isH2K ? (v.kanji || v.raw) : v.hiragana);
    this.srsOptions = shuffleArray([correctAnswer, ...wrongOptions]);
  }
  
  selectSRSOption(idx) {
    this.srsSelectedAnswer = idx;
    this.render();
  }
  
  submitSRSAnswer() {
    const currentWord = this.srsWords[this.srsCurrentIndex];
    const isH2K = this.srsConfig.testType === 'hiragana_to_kanji';
    const correctAnswer = isH2K ? (currentWord.kanji || currentWord.raw) : currentWord.hiragana;
    const userAnswer = this.srsOptions[this.srsSelectedAnswer];
    const isCorrect = userAnswer === correctAnswer;
    
    this.srsAnswers.push({ word: currentWord, correct: isCorrect, userAnswer, correctAnswer });
    
    if (!isCorrect) {
      saveSRSMistake(this.sb, this.user?.id, currentWord, this.srsConfig.testType);
    }
    
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
  
  revealSRSWriting() {
    this.srsShowResult = true;
    this.render();
  }
  
  markSRSWritingResult(isCorrect) {
    const currentWord = this.srsWords[this.srsCurrentIndex];
    
    this.srsAnswers.push({
      word: currentWord,
      correct: isCorrect,
      userAnswer: isCorrect ? 'Correct' : 'Wrong',
      correctAnswer: currentWord.kanji || currentWord.raw
    });
    
    if (!isCorrect) {
      saveSRSMistake(this.sb, this.user?.id, currentWord, 'writing');
    }
    
    this.srsNextQuestion();
  }
  
  retestWrongAnswers() {
    const wrongWords = this.srsAnswers.filter(a => !a.correct).map(a => a.word);
    if (wrongWords.length === 0) return;
    
    this.srsWords = shuffleArray(wrongWords);
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
  
  // ===== SELF STUDY =====
  async submitNewTopic() {
    const nameInput = document.getElementById('topicNameInput');
    if (!nameInput?.value.trim()) {
      alert('Please enter a topic name');
      return;
    }
    
    const topicData = {
      name: nameInput.value,
      icon: this.newTopic.icon,
      color: this.newTopic.color,
      description: document.getElementById('topicDescInput')?.value || ''
    };
    
    const data = await addTopic(this.sb, this.user.id, topicData);
    if (data) {
      this.selfStudyTopics.push(data);
      this.showAddTopicModal = false;
      this.newTopic = { name: '', icon: '📚', color: 'blue', description: '' };
      this.render();
    } else {
      alert('Failed to add topic');
    }
  }
  
  async submitNewWord() {
    const kanjiInput = document.getElementById('wordKanjiInput');
    if (!kanjiInput?.value.trim() || !this.selectedTopic) {
      alert('Please enter the word');
      return;
    }
    
    const wordData = {
      kanji: kanjiInput.value,
      hiragana: document.getElementById('wordHiraganaInput')?.value || '',
      meaning: document.getElementById('wordMeaningInput')?.value || '',
      hint: document.getElementById('wordHintInput')?.value || '',
      source: document.getElementById('wordSourceInput')?.value || '',
      notes: document.getElementById('wordNotesInput')?.value || ''
    };
    
    const data = await addSelfStudyWord(this.sb, this.user.id, this.selectedTopic.id, wordData);
    if (data) {
      this.selfStudyWords.push(data);
      this.showAddWordModal = false;
      this.newWord = { kanji: '', hiragana: '', meaning: '', hint: '', source: '', notes: '' };
      this.render();
    } else {
      alert('Failed to add word');
    }
  }
  
  // ===== RENDER =====
  render() {
    const app = document.getElementById('app');
    
    if (this.loading) {
      app.innerHTML = renderLoading();
      return;
    }
    
    if (!this.user) {
      app.innerHTML = renderLogin();
      attachEventListeners(this);
      return;
    }
    
    let content;
    switch (this.currentTab) {
      case 'study':
        content = this.renderStudyTab();
        break;
      case 'srs':
        content = renderSRSTab(this);
        break;
      case 'stories':
        content = renderStoriesTab(this);
        break;
      case 'similar':
        content = renderSimilarTab(this);
        break;
      default:
        content = this.renderStudyTab();
    }
    
    app.innerHTML = `
      ${renderHeader(this)}
      ${renderTabs(this.currentTab)}
      ${content}
      ${this.renderModals()}
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
      if (this.studyView === 'wordlist' && this.selectedTopic) {
        content = renderSelfStudyWordList(this);
      } else if (this.studyView === 'flashcard' && this.selectedTopic) {
        content = renderFlashcard(this);
      } else {
        content = renderSelfStudyTopics(this);
      }
    }
    
    return subTabs + content;
  }
  
  renderModals() {
    if (this.showAddTopicModal) {
      return this.renderAddTopicModal();
    }
    if (this.showAddWordModal) {
      return this.renderAddWordModal();
    }
    return '';
  }
  
  renderAddTopicModal() {
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
              <textarea id="topicDescInput" class="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600" rows="2" placeholder="Optional description"></textarea>
            </div>
            
            <button id="submitTopicBtn" class="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600">
              Create Topic
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  renderAddWordModal() {
    return `
      <div id="modalOverlay" class="modal-overlay">
        <div class="modal-content p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-white">Add New Word</h2>
            <button id="closeModalBtn" class="text-slate-400 hover:text-white text-2xl">&times;</button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="text-slate-400 text-sm block mb-1">Word (Kanji/Kana) *</label>
              <input type="text" id="wordKanjiInput" class="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600" placeholder="e.g., 勉強">
            </div>
            
            <div>
              <label class="text-slate-400 text-sm block mb-1">Reading (Hiragana)</label>
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
            
            <div>
              <label class="text-slate-400 text-sm block mb-1">Source</label>
              <input type="text" id="wordSourceInput" class="w-full p-3 rounded-lg bg-slate-700 text-white border border-slate-600" placeholder="e.g., Anime name, textbook">
            </div>
            
            <button id="submitWordBtn" class="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600">
              Add Word
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// Initialize the app
window.app = new JLPTStudyApp();
