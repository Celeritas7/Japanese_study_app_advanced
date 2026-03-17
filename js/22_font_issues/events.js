// JLPT Vocabulary Master - Event Listeners

import { initCanvas, clearCanvas } from './canvas.js';
import { renderStorySearchResults } from './render-stories.js';

// Helper: attach listeners to story search results (after surgical update)
function attachStoryResultListeners(app) {
  const container = document.getElementById('storySearchResults');
  if (!container) return;
  
  // Story group buttons
  container.querySelectorAll('[data-story-group-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const groupId = parseInt(btn.dataset.storyGroupId);
      app.selectedStoryGroup = app.storyGroups.find(g => g.id === groupId);
      app.render();
    });
  });
  
  // Search mode toggle
  container.querySelectorAll('[data-story-search-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.storySearchMode = btn.dataset.storySearchMode;
      // Surgical update again
      const resultsDiv = document.getElementById('storySearchResults');
      if (resultsDiv) {
        resultsDiv.innerHTML = renderStorySearchResults(app);
        attachStoryResultListeners(app);
      }
    });
  });
  
  // Open story overlay from word results
  container.querySelectorAll('[data-open-story]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const kanji = btn.dataset.openStory;
      const word = app.kanjiWords.find(w => w.kanji === kanji) || { kanji, hiragana: btn.dataset.storyHiragana || '', meaning: btn.dataset.storyMeaning || '' };
      app.openStoryOverlay(word);
    });
  });
}

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
  // Study mode toggle (All / Custom)
  document.querySelectorAll('[data-study-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.studyMode = btn.dataset.studyMode;
      if (app.studyMode === 'all') {
        // Apply current preset to all levels
        app.studyLevelCounts = { N1: app.studyPreset, N2: app.studyPreset, N3: app.studyPreset };
      }
      app.render();
    });
  });
  
  // Study preset chips (All Equal mode)
  document.querySelectorAll('[data-study-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.studyPreset);
      app.studyPreset = n;
      app.studyLevelCounts = { N1: n, N2: n, N3: n };
      app.render();
    });
  });
  
  // Study per-level chips (Custom mode)
  document.querySelectorAll('[data-study-level-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = btn.dataset.studyLevelChip;
      const val = parseInt(btn.dataset.studyLevelVal);
      app.studyLevelCounts[level] = val;
      const input = document.getElementById(`studyLevel${level}`);
      if (input) input.value = val;
      app.render();
    });
  });
  
  // Study per-level inputs (Custom mode)
  ['N1', 'N2', 'N3'].forEach(level => {
    document.getElementById(`studyLevel${level}`)?.addEventListener('input', (e) => {
      app.studyLevelCounts[level] = parseInt(e.target.value) || 0;
    });
  });
  
  // Quick start button
  document.getElementById('startStudyQuickBtn')?.addEventListener('click', () => app.startStudyQuick());
  
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
  
  // ===== TAP-TO-SAVE: flashcard context words =====
  // (Sentence panel tap-words are handled separately in attachSentencePanelListeners)
  document.querySelectorAll('[data-tap-word]').forEach(span => {
    span.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent revealBox click
      const kanji = span.dataset.tapWord;
      if (!kanji || !app._showWordSavePopup) return;
      app._showWordSavePopup(kanji, span);
    });
  });
  
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
  
  // ===== KANJI SUB-TAB =====
  // Book selection
  document.querySelectorAll('[data-book-code]').forEach(btn => {
    btn.addEventListener('click', () => app.selectBook(btn.dataset.bookCode));
  });
  
  // Chapter selection
  document.querySelectorAll('[data-chapter-name]').forEach(btn => {
    btn.addEventListener('click', () => app.selectChapter(btn.dataset.chapterName));
  });
  
  // Kanji back buttons
  document.getElementById('backToBooksBtn')?.addEventListener('click', () => app.backToBooks());
  document.getElementById('backToChaptersBtn')?.addEventListener('click', () => app.backToChapters());
  
  // Kanji study start
  document.getElementById('startKanjiStudyAllBtn')?.addEventListener('click', () => app.startKanjiStudy(true));
  document.getElementById('startKanjiStudyBtn')?.addEventListener('click', () => app.startKanjiStudy(false));
  
  // Kanji word limit input
  document.getElementById('kanjiWordLimitInput')?.addEventListener('input', (e) => {
    app.studyWordLimit = parseInt(e.target.value) || 0;
  });
  
  // Kanji marking category filter
  document.querySelectorAll('[data-kanji-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.kanjiCategory;
      if (val === 'clear') {
        app.selectedCategory = null;
      } else {
        const cat = parseInt(val);
        app.selectedCategory = app.selectedCategory === cat ? null : cat;
      }
      app.render();
    });
  });
  
  // ===== SRS =====
  document.querySelectorAll('[data-srs-test-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.srsConfig.testType = btn.dataset.srsTestType;
      app.render();
    });
  });
  
  // SRS Selection Mode Toggle (By Level / By Marking)
  document.querySelectorAll('[data-srs-sel-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.srsConfig.selectionMode = btn.dataset.srsSelMode;
      app.render();
    });
  });
  
  // SRS Level Mode Toggle (All Equal / Custom)
  document.querySelectorAll('[data-srs-level-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.srsConfig.levelMode = btn.dataset.srsLevelMode;
      if (app.srsConfig.levelMode === 'all') {
        const n = app.srsConfig.levelPreset;
        app.srsConfig.n1Count = n;
        app.srsConfig.n2Count = n;
        app.srsConfig.n3Count = n;
      }
      app.render();
    });
  });
  
  // SRS Preset chips (All Equal mode)
  document.querySelectorAll('[data-srs-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = parseInt(btn.dataset.srsPreset);
      app.srsConfig.levelPreset = n;
      app.srsConfig.n1Count = n;
      app.srsConfig.n2Count = n;
      app.srsConfig.n3Count = n;
      app.render();
    });
  });
  
  // SRS Level inputs (Custom mode)
  ['N1','N2','N3'].forEach(level => {
    document.getElementById(`srs${level}Count`)?.addEventListener('input', (e) => {
      app.srsConfig[level.toLowerCase() + 'Count'] = parseInt(e.target.value) || 0;
    });
  });
  
  // SRS Level chips (Custom mode per-row)
  document.querySelectorAll('[data-srs-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const level = btn.dataset.srsChip;
      const val = parseInt(btn.dataset.srsChipVal);
      app.srsConfig[level.toLowerCase() + 'Count'] = val;
      const input = document.getElementById(`srs${level}Count`);
      if (input) input.value = val;
      app.render();
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
  
  // SRS Marking chips (per row)
  document.querySelectorAll('[data-srs-mark-chip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = parseInt(btn.dataset.srsMarkChip);
      const val = parseInt(btn.dataset.srsMarkChipVal);
      app.srsConfig.markingCounts[k] = val;
      const input = document.getElementById(`srsMarkCount${k}`);
      if (input) input.value = val;
      app.render();
    });
  });
  
  // SRS Marking "All X"
  document.querySelectorAll('[data-srs-mark-all]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.dataset.srsMarkAll);
      for (let k = 1; k <= 5; k++) {
        app.srsConfig.markingCounts[k] = val;
        const input = document.getElementById(`srsMarkCount${k}`);
        if (input) input.value = val;
      }
      app.render();
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
  
  // Story search — surgical DOM update, never destroys the input
  const storyInput = document.getElementById('storySearchInput');
  if (storyInput) {
    let debounceTimer = null;
    
    const updateResults = () => {
      const resultsDiv = document.getElementById('storySearchResults');
      if (resultsDiv) {
        resultsDiv.innerHTML = renderStorySearchResults(app);
        attachStoryResultListeners(app);
      }
    };
    
    storyInput.addEventListener('input', (e) => {
      app.storyFilter = e.target.value;
      if (!e.target.value) app.storySearchMode = 'groups';
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateResults, 300);
    });
  }
  
  // ===== STORY SEARCH MODE (handled in attachStoryResultListeners for surgical updates) =====
  // Initial page load mode toggle (before any search is done)
  document.querySelectorAll('[data-story-search-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.storySearchMode = btn.dataset.storySearchMode;
      const resultsDiv = document.getElementById('storySearchResults');
      if (resultsDiv) {
        resultsDiv.innerHTML = renderStorySearchResults(app);
        attachStoryResultListeners(app);
      }
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
      const word = app.kanjiWords.find(w => w.kanji === kanji)
        || { kanji, hiragana, meaning };
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
  
  // ===== WORD RELATIONS (Folder-based navigation) =====
  
  // Level 1: Folder selection
  document.querySelectorAll('[data-rel-folder]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.openRelationsFolder(btn.dataset.relFolder);
    });
  });
  
  // Level 2: Group selection (inside a folder)
  document.querySelectorAll('[data-word-group-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      app.selectWordGroup(parseInt(btn.dataset.wordGroupId));
    });
  });
  
  // Back: folders <- group list
  document.getElementById('backToFoldersBtn')?.addEventListener('click', () => {
    app.backToFolders();
  });
  
  // Back: group list <- group detail
  document.getElementById('backToRelationsListBtn')?.addEventListener('click', () => {
    app.backToRelationsList();
  });
  
  // Relations pagination
  document.getElementById('relPrevPageBtn')?.addEventListener('click', () => {
    if (app.relationsPage > 0) { app.relationsPage--; app.render(); }
  });
  document.getElementById('relNextPageBtn')?.addEventListener('click', () => {
    app.relationsPage++;
    app.render();
  });

  // Toggle hide-studied filter
  document.getElementById('relToggleHideStudied')?.addEventListener('click', () => {
    app.relationsHideStudied = !app.relationsHideStudied;
    app.relationsPage = 0;
    app.render();
  });

  // Mark / unmark group as studied (in group detail header)
  document.getElementById('markGroupStudiedBtn')?.addEventListener('click', () => {
    const groupId = app.selectedWordGroup?.id;
    if (!groupId) return;
    if (!app.relationsStudiedGroups) {
      try {
        const stored = localStorage.getItem('relationsStudied');
        app.relationsStudiedGroups = new Set(stored ? JSON.parse(stored) : []);
      } catch {
        app.relationsStudiedGroups = new Set();
      }
    }
    if (app.relationsStudiedGroups.has(groupId)) {
      app.relationsStudiedGroups.delete(groupId);
    } else {
      app.relationsStudiedGroups.add(groupId);
    }
    try {
      localStorage.setItem('relationsStudied', JSON.stringify([...app.relationsStudiedGroups]));
    } catch { /* storage unavailable */ }
    app.render();
  });
  
  // Relations search — IME-safe with debounce
  const relSearchInput = document.getElementById('relationsSearchInput');
  if (relSearchInput) {
    let composing = false;
    let debounceTimer = null;
    
    relSearchInput.addEventListener('compositionstart', () => { composing = true; });
    relSearchInput.addEventListener('compositionend', (e) => {
      composing = false;
      app.relationsSearch = e.target.value;
      app.relationsPage = 0;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        app.render();
        const el = document.getElementById('relationsSearchInput');
        if (el) el.focus();
      }, 100);
    });
    
    relSearchInput.addEventListener('input', (e) => {
      if (composing) return;
      app.relationsSearch = e.target.value;
      app.relationsPage = 0;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        app.render();
        const el = document.getElementById('relationsSearchInput');
        if (el) el.focus();
      }, 300);
    });
  }
  
  // Add word to group
  document.getElementById('showAddWordBtn')?.addEventListener('click', () => {
    document.getElementById('showAddWordBtn').classList.add('hidden');
    document.getElementById('addWordForm').classList.remove('hidden');
    document.getElementById('addWordKanjiInput')?.focus();
  });
  
  document.getElementById('submitAddWordBtn')?.addEventListener('click', () => {
    const input = document.getElementById('addWordKanjiInput');
    if (input && app.selectedWordGroup) {
      app.addWordToGroup(app.selectedWordGroup.id, input.value);
    }
  });
  
  // Submit on Enter key in add word input
  document.getElementById('addWordKanjiInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && app.selectedWordGroup) {
      const input = document.getElementById('addWordKanjiInput');
      if (input) app.addWordToGroup(app.selectedWordGroup.id, input.value);
    }
  });
  
  // View group from flashcard badge
  document.querySelectorAll('[data-view-group]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const groupId = parseInt(btn.dataset.viewGroup);
      const group = app.wordGroups.find(g => g.id === groupId);
      app.currentTab = 'similar';
      if (group) app.relationsCategory = group.group_type;
      app.selectWordGroup(groupId);
    });
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
