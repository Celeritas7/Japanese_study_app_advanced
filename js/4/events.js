// JLPT Vocabulary Master - Event Listeners

import { initCanvas, clearCanvas } from './canvas.js';

export function attachEventListeners(app) {
  // ===== AUTH =====
  document.getElementById('loginBtn')?.addEventListener('click', () => app.signInWithGoogle());
  document.getElementById('guestModeBtn')?.addEventListener('click', () => app.enterGuestMode());
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
  
  // Study word limit chips
  document.querySelectorAll('[data-study-limit-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.studyLimitChip);
      app.studyWordLimit = val;
      const input = document.getElementById('studyWordLimit');
      if (input) input.value = val;
      // Update chip highlight
      document.querySelectorAll('[data-study-limit-chip]').forEach(b => {
        b.className = b.className.replace(/bg-emerald-500 text-white|bg-white text-gray-600/g, '');
        b.classList.add(parseInt(b.dataset.studyLimitChip) === val ? 'bg-emerald-500' : 'bg-white', parseInt(b.dataset.studyLimitChip) === val ? 'text-white' : 'text-gray-600');
      });
    });
  });
  
  document.getElementById('studyFilteredBtn')?.addEventListener('click', () => {
    app.startStudy(app.selectedWeekDay);
  });
  
  // ===== FLASHCARD NAVIGATION =====
  document.getElementById('prevWordBtn')?.addEventListener('click', () => app.prevWord());
  document.getElementById('nextWordBtn')?.addEventListener('click', () => app.nextWord());
  document.getElementById('randomWordBtn')?.addEventListener('click', () => app.randomWord());
  document.getElementById('revealNextBtn')?.addEventListener('click', () => app.revealNext());
  
  // Tap-to-reveal box (new two-box flashcard layout)
  document.getElementById('revealBox')?.addEventListener('click', () => app.revealNext());
  
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
  
  // SRS Selection Mode Toggle
  document.querySelectorAll('[data-srs-sel-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.srsConfig.selectionMode = btn.dataset.srsSelMode;
      app.render();
    });
  });
  
  // SRS Word Count Inputs — Level mode
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
  
  // SRS Level chips (per row: 0, 5, 10, 15)
  document.querySelectorAll('[data-srs-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = btn.dataset.srsChip; // N1, N2, N3
      const val = parseInt(btn.dataset.srsChipVal);
      const input = document.getElementById(`srs${level}Count`);
      if (input) { input.value = val; input.dispatchEvent(new Event('input')); }
    });
  });
  
  // SRS Level "All X" chips (set same value for all levels)
  document.querySelectorAll('[data-srs-level-all]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.srsLevelAll);
      ['N1','N2','N3'].forEach(level => {
        const input = document.getElementById(`srs${level}Count`);
        if (input) { input.value = val; input.dispatchEvent(new Event('input')); }
      });
    });
  });
  
  // SRS Word Count Inputs — Marking mode
  for (let k = 1; k <= 5; k++) {
    document.getElementById(`srsMarkCount${k}`)?.addEventListener('input', (e) => {
      app.srsConfig.markingCounts[k] = parseInt(e.target.value) || 0;
      const total = Object.values(app.srsConfig.markingCounts).reduce((a, b) => a + b, 0);
      const btn = document.getElementById('startSRSTestBtn');
      if (btn) { btn.disabled = total === 0; btn.textContent = `Start Test (${total} words)`; }
    });
  }
  
  // SRS Marking chips (per row: 0, 1, 3, 5, 10)
  document.querySelectorAll('[data-srs-mark-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.srsMarkChip;
      const val = parseInt(btn.dataset.srsMarkChipVal);
      const input = document.getElementById(`srsMarkCount${k}`);
      if (input) { input.value = val; input.dispatchEvent(new Event('input')); }
    });
  });
  
  // SRS Marking "All X" chips (set same value for all categories)
  document.querySelectorAll('[data-srs-mark-all]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.srsMarkAll);
      for (let k = 1; k <= 5; k++) {
        const input = document.getElementById(`srsMarkCount${k}`);
        if (input) { input.value = val; input.dispatchEvent(new Event('input')); }
      }
    });
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
    if (!e.target.value) app.storySearchMode = 'groups';
    app.render();
  });
  
  // ===== STORY SEARCH MODE =====
  document.querySelectorAll('[data-story-search-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.storySearchMode = btn.dataset.storySearchMode;
      app.render();
    });
  });
  
  // ===== STORY OVERLAY =====
  // Open story from any 📖 button
  document.querySelectorAll('[data-open-story]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const kanji = btn.dataset.openStory;
      const hiragana = btn.dataset.storyHiragana || '';
      const meaning = btn.dataset.storyMeaning || '';
      const word = app.vocabulary.find(w => w.kanji === kanji) || { kanji, hiragana, meaning };
      app.openStoryOverlay(word);
    });
  });
  
  // Close story overlay
  document.getElementById('closeStoryOverlayBtn')?.addEventListener('click', () => app.closeStoryOverlay());
  document.getElementById('storyOverlayBg')?.addEventListener('click', (e) => {
    if (e.target.id === 'storyOverlayBg') app.closeStoryOverlay();
  });
  
  // Story part tabs
  document.querySelectorAll('[data-story-part]').forEach(btn => {
    btn.addEventListener('click', () => app.storySelectPart(btn.dataset.storyPart));
  });
  
  // Story go to group
  document.querySelectorAll('[data-story-go-group]').forEach(btn => {
    btn.addEventListener('click', () => app.storyGoGroup(btn.dataset.storyGoGroup, btn.dataset.storyHighlight));
  });
  
  // Story back to breakdown
  document.getElementById('storyBackToBreakdownBtn')?.addEventListener('click', () => app.storyBackToBreakdown());
  
  // ===== STORY ALERT =====
  document.querySelectorAll('[data-flag-story]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      app.openStoryAlert(btn.dataset.flagStory, btn.dataset.flagGroup || '', 'overlay');
    });
  });
  
  document.getElementById('closeStoryAlertBtn')?.addEventListener('click', () => app.closeStoryAlert());
  document.getElementById('storyAlertOverlayBg')?.addEventListener('click', (e) => {
    if (e.target.id === 'storyAlertOverlayBg') app.closeStoryAlert();
  });
  document.querySelectorAll('[data-alert-type]').forEach(btn => {
    btn.addEventListener('click', () => { app.storyAlertType = btn.dataset.alertType; app.render(); });
  });
  document.getElementById('storyAlertCommentInput')?.addEventListener('input', (e) => {
    app.storyAlertComment = e.target.value;
  });
  document.getElementById('submitStoryAlertBtn')?.addEventListener('click', () => app.submitStoryAlert());
  
  // ===== WORD ALERT =====
  document.querySelectorAll('[data-flag-word]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const word = {
        kanji: btn.dataset.flagWord,
        hiragana: btn.dataset.flagWordHiragana || '',
        meaning: btn.dataset.flagWordMeaning || ''
      };
      app.openWordAlert(word, 'wordlist');
    });
  });
  
  document.getElementById('closeWordAlertBtn')?.addEventListener('click', () => app.closeWordAlert());
  document.getElementById('wordAlertOverlayBg')?.addEventListener('click', (e) => {
    if (e.target.id === 'wordAlertOverlayBg') app.closeWordAlert();
  });
  document.querySelectorAll('[data-word-alert-type]').forEach(btn => {
    btn.addEventListener('click', () => { app.wordAlertType = btn.dataset.wordAlertType; app.render(); });
  });
  document.getElementById('wordAlertCommentInput')?.addEventListener('input', (e) => {
    app.wordAlertComment = e.target.value;
  });
  document.getElementById('submitWordAlertBtn')?.addEventListener('click', () => app.submitWordAlert());
  
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
