# JLPT Master — Home v2 + Bottom-Nav port: install guide

This package reskins the **Home** screen to the new full-bleed rotating **Today's
Focus** hero and replaces the top tab strip with a **bottom nav + "More" sheet**.
All of your existing `data-*` event hooks are preserved, so the study /
flashcard / SRS internals keep working unchanged.

Files in this folder:

| File | Where it goes |
|---|---|
| `render-home.js` | **Replace** `js/render-home.js` |
| `render-nav.js`  | **New file** → `js/render-nav.js` |
| `home-nav.css`   | **Append** its contents to `css/styles.css` |

Then make the small edits below to `js/app.js`, `js/events.js`, and `index.html`.

---

## 1. `js/render-home.js` — replace the whole file

Drop in the provided `render-home.js`. It keeps the same exports
(`renderHome`, `renderHomeHeader`, `renderGroupPicker`) and the group-picker
view untouched — only the Home main content changed.

The focus rotates by **calendar day** (`Math.floor(Date.now()/86400000) %
rotation.length`), so it needs no completion hook. If you'd rather advance it on
practice completion, set `localStorage.jlpt_focus_idx` yourself and change the
`i =` line in `renderHome()` to read it.

## 2. `js/render-nav.js` — add this new file

Copy `render-nav.js` into `js/`. Exports `renderBottomNav(app)` and
`renderMoreSheet(app)`.

## 3. `css/styles.css` — append `home-nav.css`

Paste the entire contents of `home-nav.css` at the end of `css/styles.css`.
Bump the cache-buster in `index.html` (`styles.css?v=31` → `?v=32`).

---

## 4. `js/app.js` — four small edits

**(a) Import the nav module** — near the other render imports at the top:

```js
import { renderHome, renderHomeHeader } from './render-home.js';
import { renderBottomNav, renderMoreSheet } from './render-nav.js';   // ← add
```

**(b) Add state** — in the constructor, next to `this.homeView = 'main';`:

```js
this.moreOpen = false;   // ← add: "More" sheet visibility
```

**(c) Add nav methods** — paste anywhere inside the `JLPTStudyApp` class
(e.g. right after the `backToHome()` method):

```js
  // ===== BOTTOM NAV =====
  navFromBottomNav(key) {
    if (key === 'more') { this.toggleMore(); return; }
    this.moreOpen = false;
    switch (key) {
      case 'home':  this.selectTab('home'); break;
      case 'study': this.navigateFromHome('goi'); break;
      case 'srs':   this.selectTab('srs'); break;
      case 'group': this.navigateFromHome('group'); break;
    }
  }
  navigateFromMore(key) {
    this.moreOpen = false;
    // Real tabs vs. home-routed modes:
    if (key === 'similar' || key === 'stories') this.selectTab(key);
    else this.navigateFromHome(key);   // self / kanji / anime / script
  }
  toggleMore() { this.moreOpen = !this.moreOpen; this.render(); }
  closeMore()  { if (this.moreOpen) { this.moreOpen = false; this.render(); } }
```

**(d) Swap the chrome in `render()`** — find this block:

```js
    app.innerHTML = `
      ${hideChrome ? '' : (isHome ? renderHomeHeader(this) : renderHeader(this))}
      ${hideChrome ? '' : renderTabs(this.currentTab)}
      <main class="flex-1 flex flex-col overflow-hidden">${content}</main>
      ${this.renderModals()}
```

and change it to (remove the `renderTabs` line, add the bottom nav + sheet
**after** `</main>`):

```js
    app.innerHTML = `
      ${hideChrome ? '' : (isHome ? renderHomeHeader(this) : renderHeader(this))}
      <main class="flex-1 flex flex-col overflow-hidden">${content}</main>
      ${hideChrome ? '' : renderBottomNav(this)}
      ${renderMoreSheet(this)}
      ${this.renderModals()}
```

> `renderTabs` is now unused — you can leave its definition in `render.js`; it
> does no harm. (The old top tabs only had Home / Study / SRS, all now on the
> bottom bar.)

---

## 5. `js/events.js` — add the nav handlers

In `attachEventListeners(app)`, right after the existing `// ===== HOME TAB =====`
block (the `[data-home-back]` handler), add:

```js
  // ===== BOTTOM NAV + MORE SHEET =====
  document.querySelectorAll('[data-nav]').forEach(btn => {
    btn.addEventListener('click', () => app.navFromBottomNav(btn.dataset.nav));
  });
  document.querySelectorAll('[data-more-mode]').forEach(btn => {
    btn.addEventListener('click', () => app.navigateFromMore(btn.dataset.moreMode));
  });
  document.querySelectorAll('[data-more-close]').forEach(el => {
    el.addEventListener('click', () => app.closeMore());
  });
```

---

## Notes / known trade-offs

- **Bottom nav is `position: fixed`** (your `#app` isn't a flex column, so a
  flowed nav wouldn't stick). The Home hero and group list already reserve
  bottom padding. If any *other* screen's last control hides behind the bar,
  add `padding-bottom: 72px` to that screen's scroll container.
- **Nav hides during active study** (`hideChrome`), same as your old tab strip,
  so flashcards keep the full height. The "More" sheet can still be dismissed
  because `renderMoreSheet` is always emitted.
- **No fake data.** The hero shows only real values: live due/new counts from
  `getDueStats()` and a "practiced today" ribbon from `getTodayPractice()`.
- The dashboard widgets from the prototype (goal ring, weekly chart, mastery
  bars) are intentionally **not** included — the kit's final Home is hero-only,
  and your practice history is wiped daily so a weekly chart has no source.
  Say the word if you want them and we'll add a data layer for it.
