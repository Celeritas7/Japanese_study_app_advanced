// JLPT Vocabulary Master - Home Tab
//
// Entry-point landing surface. Renders the "Continue" resume hero (if a
// study session is in flight) plus a 2-column grid of study modes, so that
// modes other than Goi flashcards are not buried behind a tab strip.
//
// Two views live in this module:
//   - renderHome(app)        — the main Home screen (currentTab === 'home')
//   - renderGroupPicker(app) — drill-down from the "Study by Group" card
//                              (currentTab === 'home' && homeView === 'groups')

import { escapeHtml, getMarking } from './utils.js';

// Mode color palette — keep in sync with README design tokens.
const MODE_COLORS = {
  goi:     '#10b981', // emerald
  kanji:   '#ef4444', // rose
  srs:     '#3b82f6', // blue
  self:    '#a855f7', // purple
  group:   '#f59e0b', // amber
  anime:   '#ef4444', // rose
  script:  '#14b8a6', // teal
};

// Compute the 6 (or 7, when no resume hero) mode card meta counts. The hero
// owns the Goi card when a session is in flight; otherwise Goi appears as
// the first grid card.
function computeMeta(app) {
  const markings = app.markings || {};
  const kanjiWords = app.kanjiWords || [];

  // Kanji "new" = unmarked unified words
  const kanjiNew = kanjiWords.filter(w => !getMarking(markings, w)).length;

  // SRS "due now" = sum across marking categories 1..6 using the existing
  // isWordDue helper (handles per-marking intervals).
  let srsDue = 0;
  if (typeof app.getDueStats === 'function') {
    const stats = app.getDueStats();
    for (let k = 1; k <= 6; k++) srsDue += stats[k]?.due || 0;
  }

  // Self study = total saved self-study words across all user topics
  const selfSaved = (app.selfStudyWords || []).length;

  // Goi "due" (used only when no resume hero exists)
  let goiDue = 0;
  if (typeof app.getDueStats === 'function') {
    const stats = app.getDueStats();
    for (let k = 1; k <= 6; k++) goiDue += stats[k]?.due || 0;
  }

  return {
    kanjiNew,
    srsDue,
    selfSaved,
    goiDue,
    groupCount: (app.wordGroups || []).length,
    scriptCount: (app.scripts || []).length,
  };
}

// Read & validate the resume hero data from localStorage.study_session.
// Returns null when no live session is available so the hero can be hidden.
function getResumeData() {
  try {
    const raw = localStorage.getItem('study_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.words?.length) return null;
    // Only resume sessions saved today; older state is stale.
    const today = new Date().toISOString().slice(0, 10);
    if (s.savedAt?.slice(0, 10) !== today) return null;
    // Only show when there's still work left in the session.
    if (s.view !== 'flashcard') return null;
    const idx = s.currentIndex || 0;
    return {
      level: s.selectedLevel || '',
      weekDay: s.words[idx]?.weekDayLabel || '',
      currentIndex: idx,
      total: s.words.length,
    };
  } catch {
    return null;
  }
}

// One mode card. Position 1 (top-left) gets a fade-in delay of 0, etc., so the
// grid staggers in. modeKey is used as the data-home-mode dispatch handle.
function modeCard({ modeKey, color, icon, iconIsKanji, name, subtitle, meta, idx }) {
  const delay = (idx * 40) + 'ms';
  const iconFont = iconIsKanji
    ? 'font-family:"Noto Sans JP", sans-serif; font-weight:700; font-size:20px;'
    : 'font-size:20px;';
  return `
    <button
      type="button"
      class="home-mode-card tap"
      data-home-mode="${modeKey}"
      style="animation-delay:${delay};"
    >
      <div class="home-mode-card__wash" style="background:radial-gradient(circle, ${color}25, transparent 70%);"></div>
      <div
        class="home-mode-card__icon"
        style="background:linear-gradient(135deg, ${color}30, ${color}15); border-color:${color}50;"
      >
        <span style="${iconFont} color:${color}; line-height:1;">${icon}</span>
      </div>
      <div class="home-mode-card__body">
        <div class="home-mode-card__name">${escapeHtml(name)}</div>
        <div class="home-mode-card__sub">${escapeHtml(subtitle)}</div>
      </div>
      <div class="home-mode-card__meta" style="background:${color}20; color:${color};">${escapeHtml(meta)}</div>
    </button>
  `;
}

// "Continue" hero — full-width resume card. Hidden when getResumeData() returns
// null; in that case Goi shows up as the first grid card instead.
function resumeHero(app, resume) {
  // Format the session description.
  const lvl = resume.level || '';
  const sessionLine = lvl
    ? `${escapeHtml(lvl)}${resume.weekDay ? ' · ' + escapeHtml(resume.weekDay) : ''}`
    : (resume.weekDay ? escapeHtml(resume.weekDay) : 'Goi session');
  const progressLine = `${resume.currentIndex + 1} of ${resume.total} words · vocabulary flashcards`;

  return `
    <button
      type="button"
      class="home-hero tap"
      data-home-resume="1"
    >
      <div class="home-hero__glyph">あ</div>
      <div class="home-hero__avatar">あ</div>
      <div class="home-hero__body">
        <div class="home-hero__kicker">RESUME GOI</div>
        <div class="home-hero__title">${sessionLine}</div>
        <div class="home-hero__sub">${escapeHtml(progressLine)}</div>
      </div>
      <div class="home-hero__play">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
      </div>
    </button>
  `;
}

// Header bar (top of the Home screen). Reuses the app's existing sign-out
// button id so events.js keeps working unchanged. The stats pill is rendered
// but currently a no-op (deferred per project decision).
export function renderHomeHeader(app) {
  if (app.homeView === 'groups') return renderGroupPickerHeader(app);
  return _homeMainHeader(app);
}

function _homeMainHeader(app) {
  const wordCount = (app.vocabulary || []).length;
  const syncing = app.syncing ? ' · syncing' : ' · synced';
  const todayKey = 'practice_' + new Date().toISOString().slice(0, 10);
  let todayCount = 0;
  try {
    const raw = localStorage.getItem(todayKey);
    if (raw) {
      const data = JSON.parse(raw);
      todayCount = Object.keys(data.words || {}).length;
    }
  } catch { /* leave at 0 */ }

  const ADMIN_ID = 'd469efb7-f9e1-4b49-8b14-75a42b4d22e0';
  const isAdmin = app.user?.id === ADMIN_ID || app.isGuestMode;

  return `
    <header class="home-header">
      <div class="home-header__brand">
        <div class="home-header__logo">学</div>
        <div>
          <div class="home-header__title">JLPT Master</div>
          <div class="home-header__sub">${wordCount.toLocaleString()} words${syncing}</div>
        </div>
      </div>
      <div class="home-header__right">
        <button type="button" class="home-stats-pill tap" data-home-stats="1" title="Stats">
          <span class="home-stats-pill__icon">📊</span>
          <span class="home-stats-pill__label">Stats</span>
          <span class="home-stats-pill__delta">+${todayCount} today</span>
        </button>
        ${isAdmin ? `
          <a href="data-manager.html" class="home-header__gear" title="Data Manager (Admin)">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </a>
        ` : ''}
        <button id="signOutBtn" class="home-header__signout" title="${app.isGuestMode ? 'Exit Guest Mode' : 'Sign Out'}">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      </div>
    </header>
  `;
}

export function renderHome(app) {
  if (app.homeView === 'groups') return renderGroupPicker(app);

  const meta = computeMeta(app);
  const resume = getResumeData();
  // NOTE: outer <main> + headers are emitted by app.js render(); this
  // function returns only the content that lives inside <main>.

  // 6 mode cards. When no resume hero exists, Goi gets inserted as the first
  // card and the grid becomes 7 cards.
  const cards = [];
  let idx = 0;

  if (!resume) {
    cards.push(modeCard({
      modeKey: 'goi',
      color: MODE_COLORS.goi,
      icon: 'あ',
      iconIsKanji: true,
      name: 'Goi',
      subtitle: 'Vocabulary flashcards',
      meta: `${meta.goiDue} due`,
      idx: idx++,
    }));
  }

  cards.push(modeCard({
    modeKey: 'kanji',
    color: MODE_COLORS.kanji,
    icon: '漢',
    iconIsKanji: true,
    name: 'Kanji',
    subtitle: 'Textbook kanji',
    meta: `${meta.kanjiNew} new`,
    idx: idx++,
  }));
  cards.push(modeCard({
    modeKey: 'srs',
    color: MODE_COLORS.srs,
    icon: '🔁',
    iconIsKanji: false,
    name: 'SRS Review',
    subtitle: 'Spaced repetition',
    meta: `${meta.srsDue} due now`,
    idx: idx++,
  }));
  cards.push(modeCard({
    modeKey: 'self',
    color: MODE_COLORS.self,
    icon: '📝',
    iconIsKanji: false,
    name: 'Self Study',
    subtitle: 'Your saved words',
    meta: `${meta.selfSaved} saved`,
    idx: idx++,
  }));
  cards.push(modeCard({
    modeKey: 'group',
    color: MODE_COLORS.group,
    icon: '🏷️',
    iconIsKanji: false,
    name: 'Study by Group',
    subtitle: 'Curated word sets',
    meta: `${meta.groupCount} groups`,
    idx: idx++,
  }));
  cards.push(modeCard({
    modeKey: 'anime',
    color: MODE_COLORS.anime,
    icon: '🎬',
    iconIsKanji: false,
    name: 'Anime Reader',
    subtitle: 'Subtitle dictionary',
    meta: 'open',
    idx: idx++,
  }));
  cards.push(modeCard({
    modeKey: 'script',
    color: MODE_COLORS.script,
    icon: '📜',
    iconIsKanji: false,
    name: 'Script Reader',
    subtitle: 'Your imports',
    meta: meta.scriptCount > 0 ? `${meta.scriptCount} scripts` : 'open',
    idx: idx++,
  }));

  return `
    <div class="flex-1 overflow-auto hide-scrollbar home-main">
      ${resume ? resumeHero(app, resume) : ''}
      <div class="home-section-label">All study modes</div>
      <div class="home-grid">
        ${cards.join('')}
      </div>
    </div>
  `;
}

// Group-picker types — sync with render-relations.js GROUP_TYPE_INFO.
const GROUP_PICKER_TYPES = [
  { key: 'alt_kanji',       label: 'Alt Kanji',     icon: '漢', color: '#6366f1' },
  { key: 'alt_reading',     label: 'Alt Reading',   icon: 'あ', color: '#a855f7' },
  { key: 'synonym',         label: 'Synonym',       icon: '≈', color: '#f59e0b' },
  { key: 'near_synonym',    label: 'Near Synonym',  icon: '≅', color: '#14b8a6' },
  { key: 'context_variant', label: 'Context',       icon: '文', color: '#f43f5e' },
];

function groupRow(app, group, idx) {
  const info = GROUP_PICKER_TYPES.find(t => t.key === group.group_type)
    || { icon: '漢', color: '#dc2626', label: 'Group' };
  const memberCount = app._groupMemberCount?.[group.id] || 0;
  const studied = (app.relationsStudiedGroups || new Set()).has(group.id) ? 1 : 0;
  // Per-row progress is just studied/total at the group level (binary, since
  // the existing "studied" log is per group, not per member).
  const pct = studied ? 100 : 0;
  const isComplete = studied === 1;
  const delay = (idx * 25) + 'ms';

  return `
    <button
      type="button"
      class="home-group-row tap"
      data-home-group-id="${group.id}"
      style="animation-delay:${delay};"
    >
      <div
        class="home-group-row__icon"
        style="background:linear-gradient(135deg, ${info.color}30, ${info.color}15); border-color:${info.color}50;"
      >
        <span style="font-family:'Noto Sans JP', sans-serif; font-weight:700; color:${info.color}; font-size:18px;">${info.icon}</span>
      </div>
      <div class="home-group-row__body">
        <div class="home-group-row__name">${escapeHtml(group.group_name || group.group_key || 'Untitled group')}</div>
        <div class="home-group-row__meta">
          <span>${memberCount} words</span>
          <div class="home-group-row__bar">
            <div class="home-group-row__bar-fill" style="width:${pct}%; background:${info.color};"></div>
          </div>
          <span>${pct}%</span>
        </div>
      </div>
      ${isComplete ? `<span class="home-group-row__check">✓</span>` : ''}
    </button>
  `;
}

function renderGroupPickerHeader(app) {
  const total = (app.wordGroups || []).length;
  return `
    <header class="home-drill-header">
      <button type="button" class="home-drill-header__back" data-home-back="1" title="Back">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="home-drill-header__body">
        <div class="home-drill-header__title">Study by Group</div>
        <div class="home-drill-header__sub">${total} groups · pick one to focus</div>
      </div>
    </header>
  `;
}

export function renderGroupPicker(app) {
  const allGroups = app.wordGroups || [];
  const filter = app.homeGroupFilter || 'all';

  // Count per filter chip
  const counts = { all: allGroups.length };
  GROUP_PICKER_TYPES.forEach(t => {
    counts[t.key] = allGroups.filter(g => g.group_type === t.key).length;
  });

  const filteredGroups = filter === 'all'
    ? allGroups
    : allGroups.filter(g => g.group_type === filter);

  const chip = (key, label, count) => {
    const active = key === filter;
    return `
      <button
        type="button"
        class="home-chip ${active ? 'home-chip--active' : ''}"
        data-home-group-filter="${key}"
      >${escapeHtml(label)} <span class="home-chip__count">${count}</span></button>
    `;
  };

  return `
    <div class="flex-1 overflow-auto hide-scrollbar home-main">
      <div class="home-chip-row hide-scrollbar">
        ${chip('all', 'All', counts.all)}
        ${GROUP_PICKER_TYPES.map(t => chip(t.key, t.label, counts[t.key])).join('')}
      </div>
      <div class="home-group-list">
        ${filteredGroups.length === 0
          ? `<div class="home-group-empty">No groups in this category yet.</div>`
          : filteredGroups.map((g, i) => groupRow(app, g, i)).join('')}
      </div>
    </div>
  `;
}
