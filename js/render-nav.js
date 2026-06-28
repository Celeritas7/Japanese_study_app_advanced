// JLPT Vocabulary Master - Bottom navigation + "More" sheet  (NEW FILE)
//
// Replaces the top tab strip (renderTabs) with a persistent bottom nav and a
// "More" bottom-sheet, so every section is reachable in 1–2 taps from any
// screen. Add the wiring described in PATCH.md to app.js and events.js.
//
// Colors are literal hex (this app does not load the design-system CSS tokens).

const NAV_ITEMS = [
  { key: 'home',  icon: '🏠', label: 'Home' },
  { key: 'study', icon: '📚', label: 'Study' },
  { key: 'srs',   icon: '🔄', label: 'SRS' },
  { key: 'group', icon: '🏷️', label: 'Groups' },
  { key: 'more',  icon: '⋯',  label: 'More' },
];

// Which nav slot lights up for the current app state.
function activeNavKey(app) {
  if (app.moreOpen) return 'more';
  if (app.currentTab === 'home') return app.homeView === 'groups' ? 'group' : 'home';
  if (app.currentTab === 'srs') return 'srs';
  if (app.currentTab === 'study') return 'study';
  return '';
}

export function renderBottomNav(app) {
  const active = activeNavKey(app);
  return `
    <nav class="appnav">
      ${NAV_ITEMS.map(it => {
        const on = it.key === active;
        return `
          <button type="button" class="appnav__item ${on ? 'appnav__item--active' : ''}" data-nav="${it.key}">
            <span class="appnav__icon">${it.icon}</span>
            <span class="appnav__label">${it.label}</span>
          </button>
        `;
      }).join('')}
    </nav>
  `;
}

// Long-tail modes that live in the sheet. data-more-mode is dispatched by
// app.navigateFromMore() (see PATCH.md). `tab:true` => selectTab, else
// navigateFromHome.
const MORE_MODES = [
  { key: 'self',    icon: '📝', glyph: false, name: 'Self Study',    sub: 'Your saved words',     color: '#a855f7' },
  { key: 'kanji',   icon: '漢', glyph: true,  name: 'Kanji',         sub: 'Textbook kanji',       color: '#ef4444' },
  { key: 'similar', icon: '🔗', glyph: false, name: 'Word Relations', sub: 'Synonyms & variants', color: '#6366f1', tab: true },
  { key: 'stories', icon: '📖', glyph: false, name: 'Kanji Stories', sub: 'Mnemonic breakdowns',  color: '#f59e0b', tab: true },
  { key: 'anime',   icon: '🎬', glyph: false, name: 'Anime Reader',  sub: 'Subtitle dictionary',  color: '#ef4444' },
  { key: 'script',  icon: '📜', glyph: false, name: 'Script Reader', sub: 'Your imports',         color: '#14b8a6' },
];

export function renderMoreSheet(app) {
  if (!app.moreOpen) return '';
  return `
    <div class="moresheet" data-more-close="1">
      <div class="moresheet__panel" onclick="event.stopPropagation()">
        <div class="moresheet__grip"></div>
        <div class="moresheet__label">More study modes</div>
        <div class="moresheet__list">
          ${MORE_MODES.map(m => {
            const iconFont = m.glyph ? 'font-family:\'Noto Sans JP\',sans-serif;font-weight:700;' : '';
            return `
              <button type="button" class="moresheet__row tap" data-more-mode="${m.key}">
                <div class="moresheet__icon" style="${iconFont} color:${m.color};
                  background:linear-gradient(135deg, ${m.color}30, ${m.color}15);
                  border-color:${m.color}50;">${m.icon}</div>
                <div class="moresheet__row-body">
                  <div class="moresheet__name">${m.name}</div>
                  <div class="moresheet__sub">${m.sub}</div>
                </div>
                <span class="moresheet__chev">›</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}
