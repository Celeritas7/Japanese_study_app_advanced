// JLPT Vocabulary Master - Home Tab  (v2 — full-bleed rotating Focus hero)
//
// Drop-in replacement for js/render-home.js. The mode-card GRID is replaced by
// a single full-bleed "Today's Focus" hero that rotates by calendar day, so the
// Home screen reshapes itself over time. Reaching the OTHER study modes now
// happens through the bottom nav + "More" sheet (see render-nav.js).
//
// Everything else (header, group picker, all data-* hooks) is unchanged, so
// events.js keeps working without edits to the existing handlers.
//
// Two views live in this module:
//   - renderHome(app)        — the main Home screen (currentTab === 'home')
//   - renderGroupPicker(app) — drill-down from the bottom-nav "Groups" entry
//                              (currentTab === 'home' && homeView === 'groups')

import { escapeHtml, getMarking } from './utils.js';

// ===================================================================
// Daily streak helpers. Activity rows are [{ activity_date: 'YYYY-MM-DD', ... }].
// All date math is LOCAL (matches app._localDateKey()) so the streak lines up
// with the user's calendar, not UTC.
// ===================================================================
function _dateKeyLocal(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0');
}

// Current streak length: consecutive practiced days ending today (or yesterday,
// which keeps the streak alive until end of today).
export function computeStreak(activityRows) {
  const days = new Set((activityRows || []).map(r => r.activity_date));
  let n = 0, d = new Date();
  if (!days.has(_dateKeyLocal(d))) d.setDate(d.getDate() - 1); // grace: yesterday keeps it alive
  while (days.has(_dateKeyLocal(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// The exact set of date keys that make up the current streak (for calendar tint).
function _currentStreakDays(activityRows) {
  const days = new Set((activityRows || []).map(r => r.activity_date));
  const out = new Set();
  let d = new Date();
  if (!days.has(_dateKeyLocal(d))) d.setDate(d.getDate() - 1);
  while (days.has(_dateKeyLocal(d))) { out.add(_dateKeyLocal(d)); d.setDate(d.getDate() - 1); }
  return out;
}

// Longest consecutive run anywhere in the fetched history.
function _bestStreak(activityRows) {
  const keys = [...new Set((activityRows || []).map(r => r.activity_date))].sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) {
    if (prev) {
      const p = new Date(prev + 'T00:00:00');
      p.setDate(p.getDate() + 1);
      run = (_dateKeyLocal(p) === k) ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = k;
  }
  return best;
}

const _MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December'];

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

// Day-rotating focus order. modeKey matches app.navigateFromHome(), so the
// hero reuses the existing [data-home-mode] dispatch with no new handler.
const FOCUS_ROTATION = [
  { key: 'goi',    icon: 'あ',  glyph: true,  name: 'Goi Vocabulary', sub: 'Vocabulary flashcards',     cta: 'Tap to start a flashcard set' },
  { key: 'kanji',  icon: '漢',  glyph: true,  name: 'Kanji Practice', sub: 'Textbook kanji by chapter', cta: 'Tap to open a kanji chapter' },
  { key: 'srs',    icon: '🔁', glyph: false, name: 'SRS Review',     sub: 'Spaced-repetition quiz',    cta: 'Tap to review what is due' },
  { key: 'group',  icon: '🏷️', glyph: false, name: 'Study by Group', sub: 'Curated word sets',         cta: 'Tap to pick a group' },
  { key: 'self',   icon: '📝', glyph: false, name: 'Self Study',     sub: 'Your saved words',          cta: 'Tap to review your words' },
  { key: 'anime',  icon: '🎬', glyph: false, name: 'Anime Reader',   sub: 'Subtitle dictionary',       cta: 'Tap to open the reader' },
  { key: 'script', icon: '📜', glyph: false, name: 'Script Reader',  sub: 'Your imports',              cta: 'Tap to open a script' },
];

// Compute mode meta counts for the live badge on the focus hero.
function computeMeta(app) {
  const markings = app.markings || {};
  const kanjiWords = app.kanjiWords || [];

  const kanjiNew = kanjiWords.filter(w => !getMarking(markings, w)).length;

  let srsDue = 0;
  if (typeof app.getDueStats === 'function') {
    const stats = app.getDueStats();
    for (let k = 1; k <= 6; k++) srsDue += stats[k]?.due || 0;
  }

  const selfSaved = (app.selfStudyWords || []).length;

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

// Live count badge text for a given mode.
function metaForMode(meta, key) {
  switch (key) {
    case 'goi':    return `${meta.goiDue} due`;
    case 'kanji':  return `${meta.kanjiNew} new`;
    case 'srs':    return `${meta.srsDue} due now`;
    case 'self':   return `${meta.selfSaved} saved`;
    case 'group':  return `${meta.groupCount} groups`;
    case 'script': return meta.scriptCount > 0 ? `${meta.scriptCount} scripts` : 'open';
    default:       return 'open';
  }
}

// Read & validate the resume hero data from localStorage.study_session.
// Returns null when no live session is available so the hero falls back to
// the day's focus.
function getResumeData() {
  try {
    const raw = localStorage.getItem('study_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.words?.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (s.savedAt?.slice(0, 10) !== today) return null;
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

const PLAY_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>';

// The full-bleed hero. When a live session exists it becomes a RESUME card
// (routes via [data-home-resume]); otherwise it spotlights the day's focus
// (routes via [data-home-mode]).
function focusHero({ mode, resume, upNext, practicedToday, metaLabel }) {
  const c = MODE_COLORS[mode.key] || '#10b981';
  const isResume = !!resume;

  const kicker = isResume ? 'RESUME SESSION' : 'TODAY’S FOCUS';
  const title = isResume
    ? `${escapeHtml(resume.level || 'Goi')}${resume.weekDay ? ' · ' + escapeHtml(resume.weekDay) : ''}`
    : escapeHtml(mode.name);
  const sub = isResume
    ? `${resume.currentIndex + 1} of ${resume.total} words · vocabulary flashcards`
    : escapeHtml(mode.sub);
  const ctaLine = isResume ? '' : escapeHtml(mode.cta);
  const actionLabel = isResume ? 'Resume' : 'Start practice';
  const dispatchAttr = isResume ? 'data-home-resume="1"' : `data-home-mode="${mode.key}"`;
  const iconFont = mode.glyph
    ? 'font-family:\'Noto Sans JP\', sans-serif; font-weight:700;'
    : '';

  const ribbon = practicedToday > 0
    ? `<div class="home-focus__ribbon"><span style="color:#34d399;">✓</span> ${practicedToday} word${practicedToday === 1 ? '' : 's'} practiced today</div>`
    : '';

  const badge = (!isResume && metaLabel)
    ? `<span class="home-focus__badge" style="background:${c}22; color:${c}; border-color:${c}55;">${escapeHtml(metaLabel)}</span>`
    : '';

  const upNextHtml = (upNext && upNext.length)
    ? `<div class="home-focus__upnext">
         <span class="home-focus__upnext-label">Up next</span>
         ${upNext.map(u => {
           const uc = MODE_COLORS[u.key] || '#64748b';
           const uf = u.glyph ? 'font-family:\'Noto Sans JP\',sans-serif;font-weight:700;' : '';
           return `<span class="home-focus__chip"><span style="color:${uc};${uf}">${u.icon}</span>${escapeHtml(u.name.split(' ')[0])}</span>`;
         }).join('')}
       </div>`
    : '';

  return `
    <div class="home-focus-wrap">
      <button type="button" class="home-focus tap" ${dispatchAttr}
        style="--accent:${c};
               background:
                 radial-gradient(130% 90% at 82% 4%, ${c}33, transparent 60%),
                 linear-gradient(180deg, ${c}1f, #0f172a 72%);">
        <div class="home-focus__marks" aria-hidden="true">
          <span style="color:${c};" class="home-focus__mark home-focus__mark--xl">${mode.icon}</span>
          <span style="color:${c};" class="home-focus__mark home-focus__mark--md">学</span>
          <span style="color:${c};" class="home-focus__mark home-focus__mark--sm">語</span>
        </div>

        ${ribbon}

        <div class="home-focus__inner">
          <div class="home-focus__tile" style="${iconFont} color:${c};
            background:linear-gradient(135deg, ${c}40, ${c}1f);
            border-color:${c}66;">${mode.icon}</div>

          <div class="home-focus__kicker" style="color:${c};">${kicker}${badge}</div>
          <div class="home-focus__title">${title}</div>
          <div class="home-focus__sub">${sub}</div>
          ${ctaLine ? `<div class="home-focus__cta">${ctaLine}</div>` : ''}

          <div class="home-focus__action">
            <span class="home-focus__play" style="background:${c}; box-shadow:0 8px 24px ${c}55;">${PLAY_SVG}</span>
            <span class="home-focus__action-label">${actionLabel}</span>
          </div>
        </div>
      </button>

      ${upNextHtml}
    </div>
  `;
}

// Header bar (top of the Home screen). Unchanged from the original file — keeps
// the existing sign-out id and admin gear so events.js works as-is.
export function renderHomeHeader(app) {
  if (app.homeView === 'groups') return renderGroupPickerHeader(app);
  return _homeMainHeader(app);
}

function _homeMainHeader(app) {
  const wordCount = (app.vocabulary || []).length;
  const syncing = app.syncing ? ' · syncing' : ' · synced';
  const todayKey = typeof app._todayKey === 'function'
    ? app._todayKey()
    : 'practice_' + new Date().toISOString().slice(0, 10);
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

  const streak = computeStreak(app.dailyActivity);

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
        <button type="button" class="home-streak-pill${streak ? '' : ' cold'} tap" data-home-streak="1" title="Daily streak">
          <span class="home-streak-pill__icon">🔥</span><span>${streak}</span>
        </button>
        <button type="button" class="home-stats-pill tap" data-home-stats="1" title="Stats">
          <span class="home-stats-pill__icon">📊</span>
          <span class="home-stats-pill__label">Stats</span>
          <span class="home-stats-pill__delta">+${todayCount} today</span>
        </button>
        ${isAdmin ? `
          <a href="kanji-stories.html" class="home-header__gear" title="Kanji Story Panel (Admin)" style="font-size:15px;font-weight:700">漢</a>
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

  // Day-based focus rotation: the spotlight advances each calendar day.
  const i = Math.floor(Date.now() / 86400000) % FOCUS_ROTATION.length;
  const focus = FOCUS_ROTATION[i];
  const upNext = [
    FOCUS_ROTATION[(i + 1) % FOCUS_ROTATION.length],
    FOCUS_ROTATION[(i + 2) % FOCUS_ROTATION.length],
  ];

  // "Practiced today" ribbon from real practice history.
  let practicedToday = 0;
  try {
    const data = typeof app.getTodayPractice === 'function' ? app.getTodayPractice() : null;
    practicedToday = data ? Object.keys(data.words || {}).length : 0;
  } catch { /* leave at 0 */ }

  const hero = focusHero({
    mode: focus,
    resume,
    upNext,
    practicedToday,
    metaLabel: metaForMode(meta, focus.key),
  });

  // NOTE: outer <main> + headers are emitted by app.js render(); this
  // function returns only the content that lives inside <main>.
  return `<div class="home-focus-screen">${hero}</div>`;
}

// ===================================================================
// Group picker — unchanged from the original file.
// ===================================================================

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

// ===================================================================
// Streak bottom sheet — hero flame + Current/Best/Total tiles + month calendar.
// Opened from the Home 🔥 pill (app.showStreakSheet). Fed by app.dailyActivity;
// month navigation uses app.streakCalMonth (offset from the current month).
// ===================================================================
export function renderStreakSheet(app) {
  if (!app.showStreakSheet) return '';

  const rows = app.dailyActivity || [];
  const doneDays = new Set(rows.map(r => r.activity_date));
  const streakDays = _currentStreakDays(rows);
  const current = computeStreak(rows);
  const best = _bestStreak(rows);
  const total = doneDays.size;

  // Displayed month = current month shifted by the nav offset.
  const now = new Date();
  const offset = app.streakCalMonth || 0;
  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = view.getFullYear();
  const month = view.getMonth();
  const todayKey = _dateKeyLocal(now);

  const firstDow = new Date(year, month, 1).getDay();        // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = offset === 0;

  const dow = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    .map(d => `<div class="cal__dow">${d}</div>`).join('');

  let cells = '';
  for (let i = 0; i < firstDow; i++) cells += `<div class="cal__day cal__day--pad"></div>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const key = _dateKeyLocal(new Date(year, month, day));
    const cls = ['cal__day'];
    if (key > todayKey) cls.push('future');
    else if (streakDays.has(key)) cls.push('streakday');
    else if (doneDays.has(key)) cls.push('done');
    if (key === todayKey) cls.push('today');
    cells += `<div class="${cls.join(' ')}">${day}</div>`;
  }

  const flame = current > 0 ? '🔥' : '❄️';
  const heroLabel = current > 0
    ? `${current}-day streak`
    : 'Start your streak today';

  return `
    <div class="streaksheet" data-streak-close="1">
      <div class="streaksheet__panel" onclick="event.stopPropagation()">
        <div class="streaksheet__grip"></div>

        <div class="streak-hero${current > 0 ? '' : ' streak-hero--cold'}">
          <div class="streak-hero__flame">${flame}</div>
          <div class="streak-hero__count">${heroLabel}</div>
        </div>

        <div class="streak-stats">
          <div class="streak-stat">
            <div class="streak-stat__value">${current}</div>
            <div class="streak-stat__label">Current</div>
          </div>
          <div class="streak-stat">
            <div class="streak-stat__value">${best}</div>
            <div class="streak-stat__label">Best</div>
          </div>
          <div class="streak-stat">
            <div class="streak-stat__value">${total}</div>
            <div class="streak-stat__label">Total days</div>
          </div>
        </div>

        <div class="cal">
          <div class="cal__head">
            <button type="button" class="cal__nav" data-streak-month="-1" title="Previous month">‹</button>
            <div class="cal__month">${_MONTHS[month]} ${year}</div>
            <button type="button" class="cal__nav" data-streak-month="1" ${isCurrentMonth ? 'disabled' : ''} title="Next month">›</button>
          </div>
          <div class="cal__grid">
            ${dow}
            ${cells}
          </div>
          <div class="cal__legend">
            <span><i class="cal__swatch cal__swatch--streak"></i>Streak</span>
            <span><i class="cal__swatch cal__swatch--done"></i>Practiced</span>
            <span><i class="cal__swatch cal__swatch--today"></i>Today</span>
          </div>
        </div>

        <div class="sync-note">Synced across your devices · practice any day to keep the flame alive</div>
      </div>
    </div>
  `;
}
