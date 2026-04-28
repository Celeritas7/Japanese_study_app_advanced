# Phase 4 — Relations "studied" → Supabase sync

Migrates the Word Relations "studied" state from `localStorage.relationsStudied` to the
`japanese_group_study_log` Supabase table so it syncs across devices. A one-time silent
migration runs on first load after deploy: any local set is pushed to Supabase and the
local key is cleared. `relationsHideStudied` (per-device view preference) is intentionally
left in localStorage and untouched.

## Deploy mapping

Each file in this folder replaces the same path in the live tree. Files not listed
here are unchanged.

| Phase 4 file                              | Deploy target                           |
|-------------------------------------------|-----------------------------------------|
| `phase4-relations-sync/index.html`        | `index.html`                            |
| `phase4-relations-sync/js/data.js`        | `js/data.js`                            |
| `phase4-relations-sync/js/app.js`         | `js/app.js`                             |
| `phase4-relations-sync/js/render-relations.js` | `js/render-relations.js`           |
| `phase4-relations-sync/js/events.js`      | `js/events.js`                          |

## Changes per file

- **`js/data.js`** — adds two exports under a new "GROUP STUDY LOG" section:
  - `loadGroupStudyLog(supabase, userId)` → `Set<number>` of studied group ids.
  - `setGroupStudied(supabase, userId, groupId, studied)` → upsert if true, delete if
    false. `groupId` is `parseInt`'d defensively.
- **`js/app.js`** —
  - imports `loadGroupStudyLog`, `setGroupStudied` from `data.js`;
  - adds `this.relationsStudiedGroups = new Set()` to the constructor (relations state
    block);
  - extends `loadAllData()` `Promise.all` with `loadGroupStudyLog(this.supabase, userId)`
    as the 13th entry, destructured into `relationsStudiedRemote`;
  - runs the one-time `localStorage.relationsStudied` → Supabase migration sequentially
    after the `Promise.all`, before the perf cache section. The migration is wrapped in
    `try`/`catch`; on failure the in-memory set falls back to `new Set()`.
- **`js/render-relations.js`** — `getStudiedGroups(app)` becomes a synchronous read of
  `app.relationsStudiedGroups || new Set()`. The localStorage fallback is removed —
  the cache is populated by `loadAllData()` before any render runs.
- **`js/events.js`** —
  - imports `setGroupStudied` from `data.js`;
  - the `markGroupStudiedBtn` handler is now `async`. It updates the in-memory set,
    awaits `setGroupStudied(...)`, surfaces failures via `console.error` only, then
    calls `app.render()`. The localStorage write and the inline lazy-load duplicate
    are gone.
- **`index.html`** — `?v=21` → `?v=22` on `css/styles.css` and `js/app.js` (per project
  cache-bust convention; inner ES module imports are not cache-busted — pre-existing
  tech debt, out of scope).

## Idempotency / multi-tab safety

Migration is safe across simultaneous tabs because `setGroupStudied(true)` upserts
with `onConflict: 'user_id,group_id'`, and `localStorage.removeItem` on a missing key
is a no-op. Two tabs racing produce the same final state.

Per spec, `localStorage.removeItem('relationsStudied')` runs unconditionally whenever
the local key is present after the migration block — even if some upserts failed.
Failures are logged; the trade-off is intentional (one-shot migration vs. lingering
local data).

## Type handling

Group ids are integers end-to-end in live code (verified during Step 2 read-back —
`japanese_word_groups.id` is `int`, DOM dataset reads use `parseInt`, in-memory Set
holds numbers). The defensive `parseInt` inside `setGroupStudied` and the migration
parser exist as safety nets because the `localStorage` payload is untrusted.

## Out of scope (do not touch)

- `relationsHideStudied` localStorage key (per-device UI preference; stays as-is).
- `data-group-id` attribute on `markGroupStudiedBtn` in `render-relations.js` is unused
  by the click handler (handler reads `app.selectedWordGroup?.id` instead). Noted as
  tech debt; not removed in this phase.
- Cache-bust propagation into inner ES module imports (separate tech debt item).
- All backup/snapshot folders under `js/` (`Storage/`, `30_no_quiz_final/`,
  `31_sentence_foundation_issue/`, `New folder/`) — historical, not live.

## Manual verification checklist (run after deploy)

Bump cache once more if needed (`?v=22` → `?v=23`) before any verification step that
involves clearing localStorage on the live origin, since the page may otherwise still
be running cached app.js.

1. **Fresh device, fresh login** → Relations tab loads with no studied badges, no
   console errors. In Supabase, `select count(*) from japanese_group_study_log
   where user_id = '<your-uid>'` returns `0` (or unchanged). `localStorage.relationsStudied`
   is `null` in DevTools.

2. **Existing device with `localStorage.relationsStudied` populated** → seed
   localStorage manually if needed:
   ```js
   localStorage.setItem('relationsStudied', JSON.stringify([12, 45, 78]));
   ```
   Reload once. After load, in Supabase:
   `select group_id from japanese_group_study_log where user_id = '<your-uid>'`
   returns exactly `{12, 45, 78}` (size = local set size). In DevTools,
   `localStorage.getItem('relationsStudied')` is `null` (the key is gone).

3. **Cross-device sync — mark studied** → on Device A, open a Relations group and click
   "Mark studied". Reload on Device B with the same Google account → the group shows
   the green ✓ Studied badge, and the group list shows the count in the "Hiding studied"
   filter pill.

4. **Cross-device sync — unmark** → on Device A, click the same button again to unmark.
   Reload on Device B → the badge is gone, the count drops by one.

5. **Multi-tab simultaneous** → open the app in two tabs. In tab 1, mark a group
   studied. In tab 2, navigate to that group's detail (no full reload). Then reload
   tab 2 → the group shows as studied. No duplicate-row errors in tab 1's console
   (upsert is idempotent).

6. **Supabase failure tolerance** → temporarily break the connection (DevTools →
   Network → Offline, or rename `SUPABASE_URL` in `js/config.js` and reload). The app
   still loads, Relations shows an empty studied set, and the console contains
   `[Phase 4] Group study log migration failed:` or `Load group study log error:`.
   Restore the connection, reload — studied set is back from Supabase.
