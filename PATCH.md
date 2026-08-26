# Update Package: Reader Corrections + Grouping + Daily Streak

What's in this folder and how to install it in `Japanese_study_app_advanced`.

```
subs_streak_update/
├── anime-reader.html     ← DROP-IN replacement for the repo's anime-reader.html
├── sql/setup.sql         ← run once in Supabase SQL editor
└── PATCH.md              ← this file (streak wiring for index.html app)
```

## Install order

1. **Supabase**: run `sql/setup.sql` (creates `japanese_anime_scenes`, `japanese_daily_activity`, adds DELETE policy on `japanese_anime_subtitles`). ~1 minute.
2. **Reader**: back up the current `anime-reader.html`, then replace it with the one in this folder. All changes are marked with `// [NEW]` / `// [CHANGED]` comments. No other file is touched by the reader update.
3. **Streak**: apply the patches below to `js/data.js`, `js/app.js`, `js/render-home.js`, `js/events.js`, `css/styles.css`.

## What the new anime-reader.html does

- **Word grouping fix**: colloquial lexicon (`COLLOQUIAL` const, top of script) is matched *before* `Intl.Segmenter`, so `いねえ`, `知らねえ`, `ってんだよ`, `てめえ`… tokenize as single words. Add entries to the list as you notice bad splits. (Optional later upgrade: kuromoji.js tokenizer — see design handoff README.)
- **Continuous dialogue**: consecutive same-speaker lines render as ONE bubble with one timestamp span and flowing text.
- **Scenes**: a ≥10s silence gap (`SCENE_GAP_S`) starts a new scene chip with time range. Admin can rename scenes in edit mode (stored in `japanese_anime_scenes`).
- **Edit mode** (✏️ in header — admin only, DB episodes only): tap lines to select →
  - **Edit** (1 line): fix text and/or speaker → `UPDATE japanese_anime_subtitles`
  - **Speaker** (n lines): reassign, or type a new speaker name
  - **Merge** (2+ contiguous lines): keeps the first row, spans its `end_time`, deletes the rest
- File imports (SRT/paste) are read-only — no edit button.

---

## Streak patches (main app)

### A. `js/data.js` — append

```js
// ===== DAILY ACTIVITY (streak) =====
export async function upsertDailyActivity(supabase, userId, activityDate, wordsPracticed, sessions) {
  try {
    await supabase.from('japanese_daily_activity').upsert(
      { user_id: userId, activity_date: activityDate, words_practiced: wordsPracticed,
        sessions: sessions, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,activity_date' }
    );
  } catch (e) { console.warn('upsertDailyActivity:', e); }
}

export async function fetchDailyActivity(supabase, userId) {
  try {
    const { data } = await supabase.from('japanese_daily_activity')
      .select('activity_date,words_practiced')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(400);
    return data || [];
  } catch (e) { console.warn('fetchDailyActivity:', e); return []; }
}
```

### B. `js/app.js`

**B1 — fix the UTC bug in `_todayKey()`** (currently `toISOString()` flips the day in the evening for UTC+ timezones):

```js
_localDateKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0');
}
_todayKey() {
  return 'practice_' + this._localDateKey();
}
```

**B2 — sync to Supabase.** At the END of `_saveTodayPractice(words)` (after `this._cleanOldPracticeData();`) add:

```js
this._syncDailyActivity(existing);
```

and add these methods (import `upsertDailyActivity` from `./data.js`):

```js
_syncDailyActivity(todayData) {
  // debounce: at most one upsert per 60s
  if (this._lastActivitySync && Date.now() - this._lastActivitySync < 60000) return;
  this._lastActivitySync = Date.now();
  if (!this.user?.id) return;
  const words = Object.keys(todayData.words || {}).length;
  const sessions = (todayData.sessions || []).length + (todayData.studySessions || []).length;
  upsertDailyActivity(this.supabase, this.user.id, this._localDateKey(), words, sessions);
}
```

Also call `this._syncDailyActivity(existing)` at the end of `_saveStudySessionToHistory` and `_saveTodayResults` (reset `this._lastActivitySync = 0` first in `_saveStudySessionToHistory` so a finished session always syncs).

Keep `_cleanOldPracticeData()` unchanged — localStorage stays a today-only cache; Supabase is the history.

**B3 — load activity on startup.** Where other user data loads (after auth), add:

```js
import { fetchDailyActivity } from './data.js';
// in the init/load path:
this.dailyActivity = await fetchDailyActivity(this.supabase, this.user.id);
```

### C. `js/render-home.js`

**C1 — streak helpers** (top of file):

```js
function _dateKeyLocal(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0');
}
export function computeStreak(activityRows) {
  const days = new Set((activityRows || []).map(r => r.activity_date));
  let n = 0, d = new Date();
  if (!days.has(_dateKeyLocal(d))) d.setDate(d.getDate() - 1); // grace: yesterday keeps it alive
  while (days.has(_dateKeyLocal(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
```

**C2 — streak pill** in `_homeMainHeader(app)`, insert BEFORE the Stats pill:

```js
const streak = computeStreak(app.dailyActivity);
```

```html
<button type="button" class="home-streak-pill${streak ? '' : ' cold'} tap" data-home-streak="1" title="Daily streak">
  <span class="home-streak-pill__icon">🔥</span><span>${streak}</span>
</button>
```

**C3 — streak sheet.** Add a `renderStreakSheet(app)` that renders the bottom sheet from the prototype (`design_handoff_subs_streak/prototypes/Home Streak.html` — hero flame + "N-day streak", Current/Best/Total tiles, month calendar with amber current-streak days / emerald practiced days / today ring, ‹ › month nav). Lift the markup and CSS classes directly from the prototype; feed it `app.dailyActivity` instead of the mock `ACTIVITY` object. Best streak = longest consecutive run in the fetched rows.

### D. `js/events.js`

```js
document.querySelector('[data-home-streak]')?.addEventListener('click', () => {
  app.showStreakSheet = true; app.render();
});
```

(and close on overlay click, same pattern as other sheets.)

### E. `css/styles.css` — append

Copy the style block from the prototype: `.home-streak-pill`, `.home-streak-pill.cold`, the sheet styles (`.streak-hero*`, `.streak-stats`, `.streak-stat`) and calendar styles (`.cal`, `.cal__head`, `.cal__month`, `.cal__nav`, `.cal__grid`, `.cal__dow`, `.cal__day` + `.done/.streakday/.today/.future`, `.cal__legend`, `.sync-note`). They are self-contained class names — no conflicts with existing CSS. Bump the `?v=` cache-buster.

---

## Sanity checks after install

1. Open an episode → scene chips appear, same-speaker runs read as one bubble, `いねえ`/`知らねえ` are single tokens.
2. Sign in as admin → ✏️ appears; fix one line; reload → correction persisted.
3. Merge two lines; reload → one row, spanned timestamp; check row count in Supabase.
4. Do a flashcard session → row appears in `japanese_daily_activity` for today (local date).
5. Home header shows 🔥 with the correct count; calendar matches practiced days.
