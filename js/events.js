// JLPT Vocabulary Master - Event Listeners

import { initCanvas, clearCanvas } from './canvas.js';

export function attachEventListeners(app) {
  // ===== AUTH =====
  document.getElementById('loginBtn')?.addEventListener('click', () => app.signInWithGoogle());
  document.getElementById('signOutBtn')?.addEventListener('click', () => app.signOut());
  
  // ===== MAIN TABS =====
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => app.selectTab(btn.dataset.tab));
  });
  
  // ===== STUDY SUB-TABS =====
  document.querySelectorAll('[data-study-subtab]').forEach(btn => {
    btn.addEventListener('click', () => app.selectStudySubTab(btn.dataset.studySubtab));
  });
  
  // ===== LEVEL SELECTION =====
  document.querySelectorAll('[data-level]').forEach(btn => {
    btn.addEventListener('click', () => app.selectLevel(btn.dataset.level));
  });
  
  // ===== TEST TYPE =====
  document.querySelectorAll('[data-test-type]').forEach(btn => {
    btn.addEventListener('click', () => app.setTestType(btn.dataset.testType));
  });
  
  // ===== CATEGORY FILTER =====
  document.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = parseInt(btn.dataset.category);
      app.selectedCategory = app.selectedCategory === cat ? null : cat;
      app.render();
    });
  });
  
  // ===== BACK BUTTONS =====
  document.getElementById('backToLevelBtn')?.addEventListener('click', () => app.backToLevel());
  document.getElementById('backToWeekDayBtn')?.addEventListener('click', () => app.backToWeekDay());
  document.getElementById('backToTopicsBtn')?.addEventListener('click', () => app.backToLevel());
  
  // ===== STUDY START =====
  document.getElementById('startStudyBtn')?.addEventListener('click', () => {
    const weekDay = document.getElementById('weekDaySelect')?.value || null;
    app.selectedWeekDay = weekDay;
    app.startStudy(weekDay);
  });
  
  document.getElementById('studyFilteredBtn')?.addEventListener('click', () => {
    app.startStudy(app.selectedWeekDay);
  });
  
  // ===== FLASHCARD NAVIGATION =====
  document.getElementById('prevWordBtn')?.addEventListener('click', () => app.prevWord());
  document.getElementById('nextWordBtn')?.addEventListener('click', () => app.nextWord());
  document.getElementById('randomWordBtn')?.addEventListener('click', () => app.randomWord());
  document.getElementById('revealNextBtn')?.addEventListener('click', () => app.revealNext());
  
  // ===== CANVAS =====
  document.getElementById('clearCanvasBtn')?.addEventListener('click', () => {
    clearCanvas('writingCanvas');
    clearCanvas('srsWritingCanvas');
    app.canvasImageData = null;
  });
  
  // Initialize canvas if present
  if (document.getElementById('writingCanvas')) {
    initCanvas('writingCanvas');
    app.restoreCanvasData();
  }
  if (document.getElementById('srsWritingCanvas')) {
    initCanvas('srsWritingCanvas');
    app.restoreCanvasData();
  }
  
  // ===== MARKING BUTTONS =====
  document.querySelectorAll('[data-mark-kanji]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const kanji = btn.dataset.markKanji;
      const value = parseInt(btn.dataset.markValue);
      app.updateMarking(kanji, value);
    });
  });
  
  // ===== SELF STUDY =====
  document.querySelectorAll('[data-topic-id]').forEach(btn => {
    btn.addEventListener('click', () => app.selectTopic(parseInt(btn.dataset.topicId)));
  });
  
  document.getElementById('addTopicBtn')?.addEventListener('click', () => {
    app.showAddTopicModal = true;
    app.render();
  });
  
  document.getElementById('addWordBtn')?.addEventListener('click', () => {
    app.showAddWordModal = true;
    app.render();
  });
  
  document.getElementById('startSelfStudyBtn')?.addEventListener('click', () => {
    const words = app.selfStudyWords.filter(w => w.topic_id === app.selectedTopic.id);
    app.studyWords = words.map(w => ({ ...w, meaning: w.meaning_en, level: 'Self' }));
    app.currentIndex = 0;
    app.revealStep = 0;
    app.canvasImageData = null;
    app.studyView = 'flashcard';
    app.render();
  });
  
  // ===== SRS =====
  document.querySelectorAll('[data-srs-test-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.srsConfig.testType = btn.dataset.srsTestType;
      app.render();
    });
  });
  
  // SRS Word Count Inputs
  document.getElementById('srsN1Count')?.addEventListener('input', (e) => {
    app.srsConfig.n1Count = parseInt(e.target.value) || 0;
    updateSRSButton(app);
  });
  
  document.getElementById('srsN2Count')?.addEventListener('input', (e) => {
    app.srsConfig.n2Count = parseInt(e.target.value) || 0;
    updateSRSButton(app);
  });
  
  document.getElementById('srsN3Count')?.addEventListener('input', (e) => {
    app.srsConfig.n3Count = parseInt(e.target.value) || 0;
    updateSRSButton(app);
  });
  
  document.getElementById('startSRSTestBtn')?.addEventListener('click', () => app.startSRSTest());
  document.getElementById('backToSRSSetupBtn')?.addEventListener('click', () => app.resetSRS());
  
  // SRS MCQ Options
  document.querySelectorAll('[data-srs-option]').forEach(btn => {
    btn.addEventListener('click', () => app.selectSRSOption(parseInt(btn.dataset.srsOption)));
  });
  
  document.getElementById('srsSubmitBtn')?.addEventListener('click', () => app.submitSRSAnswer());
  document.getElementById('srsNextBtn')?.addEventListener('click', () => app.srsNextQuestion());
  
  // SRS Writing
  document.getElementById('srsRevealWritingBtn')?.addEventListener('click', () => app.revealSRSWriting());
  document.getElementById('srsMarkCorrectBtn')?.addEventListener('click', () => app.markSRSWritingResult(true));
  document.getElementById('srsMarkWrongBtn')?.addEventListener('click', () => app.markSRSWritingResult(false));
  
  // SRS Results
  document.getElementById('srsRetestWrongBtn')?.addEventListener('click', () => app.retestWrongAnswers());
  document.getElementById('srsNewTestBtn')?.addEventListener('click', () => app.resetSRS());
  
  // ===== STORIES =====
  document.querySelectorAll('[data-story-group-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupId = parseInt(btn.dataset.storyGroupId);
      app.selectedStoryGroup = app.storyGroups.find(g => g.id === groupId);
      app.render();
    });
  });
  
  document.getElementById('backToStoryListBtn')?.addEventListener('click', () => {
    app.selectedStoryGroup = null;
    app.render();
  });
  
  document.getElementById('storySearchInput')?.addEventListener('input', (e) => {
    app.storyFilter = e.target.value;
    app.render();
  });
  
  // ===== SIMILAR KANJI =====
  document.querySelectorAll('[data-similar-group-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupId = parseInt(btn.dataset.similarGroupId);
      app.selectedSimilarGroup = app.similarGroups.find(g => g.id === groupId);
      app.render();
    });
  });
  
  document.getElementById('backToSimilarListBtn')?.addEventListener('click', () => {
    app.selectedSimilarGroup = null;
    app.render();
  });
  
  document.getElementById('similarSearchInput')?.addEventListener('input', (e) => {
    app.similarFilter.search = e.target.value;
    app.render();
  });
  
  // ===== MODALS =====
  document.getElementById('closeModalBtn')?.addEventListener('click', () => {
    app.showAddTopicModal = false;
    app.showAddWordModal = false;
    app.render();
  });
  
  document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') {
      app.showAddTopicModal = false;
      app.showAddWordModal = false;
      app.render();
    }
  });
  
  document.getElementById('submitTopicBtn')?.addEventListener('click', () => app.submitNewTopic());
  document.getElementById('submitWordBtn')?.addEventListener('click', () => app.submitNewWord());
}

function updateSRSButton(app) {
  const total = app.srsConfig.n1Count + app.srsConfig.n2Count + app.srsConfig.n3Count;
  const btn = document.getElementById('startSRSTestBtn');
  if (btn) {
    btn.disabled = total === 0;
    btn.textContent = `Start Test (${total} words)`;
  }
}
