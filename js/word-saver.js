// JLPT Vocabulary Master - Tap-to-Save Unknown Words
// Uses Intl.Segmenter for Japanese word segmentation.
// Saves kanji-only entries to japanese_unified_words; enrichment via data-manager.

// ===== SEGMENTER =====
const segmenter = new Intl.Segmenter('ja', { granularity: 'word' });

const KANJI_RE = /[\u4E00-\u9FFF]/;
const KATAKANA_RE = /[\u30A0-\u30FF]/;
const HIRAGANA_RE = /[\u3040-\u309F]/;

function isWordLike(text) {
  if (KANJI_RE.test(text)) return true;
  if (KATAKANA_RE.test(text)) return true;
  // Single hiragana = particle (skip), 2+ hiragana = word
  if (text.length >= 2 && HIRAGANA_RE.test(text)) return true;
  return false;
}

function esc(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ===== SEGMENTATION =====

/**
 * Segment sentence into tappable word spans.
 * @param {string} text         - raw sentence
 * @param {Set}    savedWords   - words already saved this session
 * @param {string} currentKanji - study word kanji (highlighted, not tappable)
 * @returns {string} HTML
 */
export function segmentSentence(text, savedWords = new Set(), currentKanji = '') {
  if (!text) return '';
  const segments = segmenter.segment(text);
  let html = '';

  for (const { segment } of segments) {
    const wordLike = isWordLike(segment);
    const isCurrent = segment === currentKanji;
    const isSaved = savedWords.has(segment);

    if (wordLike && !isCurrent) {
      const e = esc(segment);
      const cls = isSaved ? ' tap-word--saved' : '';
      html += `<span class="tap-word${cls}" data-tap-word="${e}">${e}</span>`;
    } else if (isCurrent) {
      html += `<span class="tap-word--current">${esc(segment)}</span>`;
    } else {
      html += esc(segment);
    }
  }
  return html;
}

// ===== SAVE POPUP =====

let _outsideHandler = null;

export function showSavePopup(wordText, targetEl, onSave, onCancel) {
  hideSavePopup();

  const rect = targetEl.getBoundingClientRect();
  const popup = document.createElement('div');
  popup.id = 'wordSavePopup';
  popup.className = 'word-save-popup animate-slideIn';
  popup.innerHTML = `
    <div class="word-save-popup__word">${esc(wordText)}</div>
    <div class="word-save-popup__actions">
      <button class="word-save-popup__btn word-save-popup__btn--save" id="popupSaveBtn">\uD83D\uDCE5 Save</button>
      <button class="word-save-popup__btn word-save-popup__btn--cancel" id="popupCancelBtn">\u2715</button>
    </div>
  `;

  document.body.appendChild(popup);

  // Position above tapped word
  const pRect = popup.getBoundingClientRect();
  let top = rect.top - pRect.height - 8 + window.scrollY;
  let left = rect.left + rect.width / 2 - pRect.width / 2 + window.scrollX;

  if (top < window.scrollY + 8) top = rect.bottom + 8 + window.scrollY;
  left = Math.max(8, Math.min(left, window.innerWidth - pRect.width - 8));

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;

  document.getElementById('popupSaveBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    onSave(wordText);
  });
  document.getElementById('popupCancelBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    onCancel();
  });

  // Dismiss on outside click (delayed to avoid immediate dismiss)
  setTimeout(() => {
    _outsideHandler = (e) => {
      const p = document.getElementById('wordSavePopup');
      if (p && !p.contains(e.target) && !e.target.classList?.contains('tap-word')) {
        hideSavePopup();
      }
    };
    document.addEventListener('click', _outsideHandler);
  }, 60);
}

export function hideSavePopup() {
  const el = document.getElementById('wordSavePopup');
  if (el) el.remove();
  if (_outsideHandler) {
    document.removeEventListener('click', _outsideHandler);
    _outsideHandler = null;
  }
}

// ===== TOAST =====

export function showSaveToast(msg, success = true) {
  const old = document.getElementById('saveToast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'saveToast';
  toast.className = `save-toast ${success ? 'save-toast--success' : 'save-toast--error'}`;
  toast.textContent = success ? `\u2713 ${msg}` : `\u2717 ${msg}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('save-toast--fade');
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

// ===== SUPABASE OPS =====

/**
 * Check if word exists in japanese_unified_words.
 */
export async function checkWordExists(supabase, kanji) {
  try {
    const { data, error } = await supabase
      .from('japanese_unified_words')
      .select('id, kanji, hiragana, meaning_en')
      .eq('kanji', kanji)
      .limit(1);
    if (error) { console.error('checkWordExists error:', error); return null; }
    return data && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error('checkWordExists exception:', err);
    return null;
  }
}

/**
 * Save new unknown word. Only kanji required; hiragana/meaning added later via data-manager.
 */
export async function saveUnknownWord(supabase, kanji, source = 'flashcard_tap') {
  try {
    const existing = await checkWordExists(supabase, kanji);
    if (existing) {
      return { ...existing, _alreadyExisted: true };
    }

    const { data, error } = await supabase
      .from('japanese_unified_words')
      .insert({ kanji, hiragana: '', meaning_en: '', hint: '', source })
      .select()
      .single();

    if (error) { console.error('saveUnknownWord error:', error); return null; }
    return data;
  } catch (err) {
    console.error('saveUnknownWord exception:', err);
    return null;
  }
}

/**
 * Save marking=5 ("Don't Know") for newly saved word.
 */
export async function saveWordMarking(supabase, userId, kanji, marking = 5) {
  try {
    const { error } = await supabase
      .from('japanese_user_markings')
      .upsert({
        user_id: userId,
        kanji,
        marking,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,kanji' });
    if (error) console.error('saveWordMarking error:', error);
  } catch (err) {
    console.error('saveWordMarking exception:', err);
  }
}
