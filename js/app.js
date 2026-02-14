// JLPT Vocabulary Master - Main Application
// Version 10.0

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { getMarking, sampleArray, shuffleArray } from './utils.js';
import { 
  loadVocabulary, loadMarkings, loadStoryGroups, loadStories, 
  loadSimilarGroups, loadSelfStudyTopics, loadSelfStudyWords,
  updateMarkingInDB, addTopic, addSelfStudyWord
} from './data.js';
import { saveCanvasData, restoreCanvasData } from './canvas.js';
import { 
  renderLoading, renderLogin, renderHeader, renderTabs, renderStudySubTabs,
  renderLevelSelector, renderWeekDaySelector, renderWordList, renderFlashcard,
  renderKanjiPlaceholder, renderSelfStudyTopics, renderSelfStudyWordList
} from './render.js';
import { renderSRSTab } from './render-srs.js';
import { renderStoriesTab } from './render-stories.js';
import { renderSimilarTab } from './render-similar.js';
import { attachEventListeners } from './events.js';

class JLPTStudyApp {
  constructor() {
    this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.sb = this.supabase;
    
    this.user = null;
    this.loading = true;
    this.syncing = false;
    
    this.vocabulary = [];
    this.markings = {};
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
    
    this.studyWords = [];
    this.currentIndex = 0;
    this.revealStep = 0;
    this.canvasImageData = null;
    
    this.selectedStoryGroup = null;
    this.storyFilter = '';
    this.selectedSimilarGroup = null;
    this.similarFilter = { search: '' };
    
    this.srsView = 'setup';
    this.srsConfig = { n1Count: 0, n2Count: 0, n3Count: 0, testType: 'hiragana_to_kanji' };
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
      this.user = session?.user || null;
      if (event === 'SIGNED_IN') this.loadAllData();
      this.render();
    });
    
    if (this.user) await this.loadAllData();
    this.loading = false;
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
    const [vocabulary, markings, storyGroups, stories, similarGroups, topics, words] = await Promise.all([
      loadVocabulary(this.supabase),
      loadMarkings(this.supabase, userId),
      loadStoryGroups(this.supabase),
      loadStories(this.supabase),
      loadSimilarGroups(this.supabase),
      loadSelfStudyTopics(this.supabase, userId),
      loadSelfStudyWords(this.supabase, userId)
    ]);
    
    this.vocabulary = vocabulary;
    this.markings = markings;
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
    
    if (!this.user) return;
    const success = await updateMarkingInDB(this.supabase, this.user.id, kanji, newMarking);
    if (!success) { this.markings[kanji] = oldMarking; this.render(); }
  }
  
  startStudy(weekDay = null) {
    let words = this.selectedLevel === 'ALL' ? this.vocabulary : this.vocabulary.filter(v => v.level === this.selectedLevel);
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
      let n; do { n = Math.floor(Math.random() * this.studyWords.length); } while (n === this.currentIndex);
      this.currentIndex = n;
      this.revealStep = 0;
      this.canvasImageData = null;
      this.render();
    }
  }
  
  revealNext() {
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
    const n1 = this.vocabulary.filter(v => v.level === 'N1');
    const n2 = this.vocabulary.filter(v => v.level === 'N2');
    const n3 = this.vocabulary.filter(v => v.level === 'N3');
    
    this.srsWords = shuffleArray([
      ...sampleArray(n1, this.srsConfig.n1Count),
      ...sampleArray(n2, this.srsConfig.n2Count),
      ...sampleArray(n3, this.srsConfig.n3Count)
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
    const word = this.srsWords[this.srsCurrentIndex];
    if (!word) return;
    
    const isH2K = this.srsConfig.testType === 'hiragana_to_kanji';
    const correct = isH2K ? (word.kanji || word.raw) : word.hiragana;
    const pool = this.vocabulary.filter(v => (isH2K ? (v.kanji || v.raw) : v.hiragana) !== correct);
    const wrong = sampleArray(pool, 3).map(v => isH2K ? (v.kanji || v.raw) : v.hiragana);
    this.srsOptions = shuffleArray([correct, ...wrong]);
  }
  
  selectSRSOption(idx) { this.srsSelectedAnswer = idx; this.render(); }
  
  submitSRSAnswer() {
    const word = this.srsWords[this.srsCurrentIndex];
    const isH2K = this.srsConfig.testType === 'hiragana_to_kanji';
    const correct = isH2K ? (word.kanji || word.raw) : word.hiragana;
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
