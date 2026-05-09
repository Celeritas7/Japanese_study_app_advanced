// Story overlay handlers — kanji breakdown / group navigation panel.
// Functions take `app` (the JLPTStudyApp instance) as their first arg.
// State stays on the App class; these functions read/mutate app.* directly.

import { saveCanvasData } from '../canvas.js';

export function open(app, word) {
  if (app.selectedTestType === 'writing' || app.srsConfig.testType === 'writing') {
    app.canvasImageData = saveCanvasData('writingCanvas') || saveCanvasData('srsWritingCanvas');
  }
  const kanjiChars = [...(word.kanji || '')].filter(c => /[一-龯]/.test(c));
  app.storyOverlay = {
    word, step: kanjiChars.length > 0 ? 2 : 1,
    expandedPart: kanjiChars[0] || null,
    groupKey: null, highlightKanji: null, kanjiParts: kanjiChars
  };
  app.render();
}

export function close(app) { app.storyOverlay = null; app.storyAlertTarget = null; app.render(); }

export function goGroup(app, groupKanji, highlightKanji) {
  if (!app.storyOverlay) return;
  app.storyOverlay.step = 3;
  app.storyOverlay.groupKey = groupKanji;
  app.storyOverlay.highlightKanji = highlightKanji;
  app.render();
}

export function backToBreakdown(app) {
  if (!app.storyOverlay) return;
  app.storyOverlay.step = 2;
  app.storyOverlay.groupKey = null;
  app.render();
}

export function selectPart(app, kanjiChar) {
  if (!app.storyOverlay) return;
  app.storyOverlay.expandedPart = kanjiChar;
  app.render();
}

export function findStoryForKanji(app, kanjiChar) {
  return app.stories.find(s => s.kanji === kanjiChar) || null;
}

export function findGroupForKanji(app, kanjiChar) {
  const story = findStoryForKanji(app, kanjiChar);
  if (!story || !story.group_kanji) return null;
  return app.storyGroups.find(g => g.group_kanji === story.group_kanji) || null;
}

export function getGroupMembersForKanji(app, groupKanji) {
  return app.stories.filter(s => s.group_kanji === groupKanji);
}
