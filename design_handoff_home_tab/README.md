# Handoff: Home Tab Redesign

## Overview

The JLPT Vocabulary Master app currently surfaces only **Goi (vocabulary flashcards)** prominently on launch. Other study modes — Kanji study, SRS, Self Study, Study-by-Group, Anime Reader, Script Reader, Stats — are hidden behind a tab strip and end up forgotten.

This handoff redesigns the **app's entry point** as a Home tab that surfaces all eight study modes at comparable visual weight, with a hero "Resume" card for the canonical Goi flow.

**Out of scope:** the individual study flows themselves (Goi flashcards, Kanji study, anime reader, etc.) are NOT redesigned. They remain as-is. Only the entry point changes.

---

## About the Design Files

The HTML file in `prototypes/` is a **design reference** built in React + Babel for fast iteration during the design phase. It is **not production code to copy directly**.

Your task is to recreate the **Variant A · Card Grid** design in this repository's existing environment: vanilla JS ES modules + Tailwind CDN + Supabase, using the established render pipeline already documented in `CLAUDE.md`.

The prototype shows three variants (A, B, C) toggled by a switcher at the top. **Only Variant A is being implemented** — ignore B and C. Use the switcher to flip to Variant A and reference that view + the group-picker drill-down (also shown in all variants).

---

## Fidelity

**High-fidelity (hifi).** Colors, spacing, typography, and layout in the prototype are the intended final design. Recreate pixel-faithfully using Tailwind utility classes + custom CSS where Tailwind can't express something (gradients, color washes).

The prototype lifts its design tokens from the live app's existing `css/styles.css` + Tailwind defaults — the Home tab must visually match the rest of the app, not feel like a different product.

---

## Screens / Views

### Screen 1 · Home tab (`currentTab === 'home'`)

**Purpose:** Entry point of the app. User picks a study path.

**Layout (top to bottom):**

1. **Header bar** — flex row, padding `14px 14px 6px`
   - Left: 学 logo (38×38px, rounded `border-radius: 11px`, emerald→teal gradient) + "JLPT Master" + "4,158 words · synced"
   - Right: Stats pill button + ⚙ button
     - **Stats pill**: 📊 icon + "Stats" (text-xs bold) + "+22 today" (text-[9px] textFaint). Background = `T.surface` with 1px border. Padding `6px 10px 6px 8px`, radius `11px`. Tapping it opens the existing stats view (currently embedded in the SRS results screen — discuss whether to lift it into a standalone view or keep it where it is).

2. **"Continue" hero card** — full-width, padding `18px`, radius `18px`
   - Background: `linear-gradient(135deg, #10b98125, #14b8a615)` over `T.surface`
   - 1.5px border in `#10b98150`
   - Faint giant あ glyph (120px, 6% opacity, emerald) in top-right corner
   - Left: 54×54px avatar with `linear-gradient(135deg, emerald, teal)` containing the あ glyph in white
   - Center: "RESUME GOI" (caps, emeraldHi) / "N2 · Wk 3 · Day 2" (16px bold) / "12 of 20 words · vocabulary flashcards" (12px textDim)
   - Right: 42×42px circular emerald ▶ button
   - Tapping resumes the session stored in `localStorage.study_session`
   - **If no resume state exists**, hide this card entirely (don't show an empty placeholder)

3. **Section label** — "All study modes" — 11px textFaint, caps, letter-spacing 1px, padding `10px 16px 8px`

4. **Mode grid** — 2 columns, gap 8px, padding `0 12px`
   - 6 cards in this order: **Kanji · SRS Review · Self Study · Study by Group · Anime Reader · Script Reader**
   - (Stats was here originally but is hoisted to the header)
   - (Goi was here originally but is the Continue hero — when no resume exists, Goi appears as the first grid card instead)
   - Each card: see "Mode card spec" below

### Screen 2 · Group picker (drill-down from "Study by Group")

**Purpose:** Pick a curated word group to study. Currently buried inside the Relations tab — this surfaces it as a top-level mode.

**Layout:**

1. **Drill header** — 36×36 back arrow button + "Study by Group" title + "{N} groups · pick one to focus" subtitle + 🔍 search button
2. **Filter chips row** — horizontal scrollable. Chips: `All / Saved / Chapters / Curated / Kanji` with counts. Active chip uses `bg-blue-500` text-white, inactive `bg-surface` text-textDim.
3. **Group list** — vertical column of row cards. Each card:
   - 42×42 icon tile (kanji groups use `Noto Sans JP` weight 700 in red `#dc2626`; emoji groups use the emoji)
   - Group name (14px bold) + count + mini progress bar (0–100%) + percent label
   - Right side: amber "N due" pill if `due > 0`, green ✓ if complete
4. **"+ Create new group" CTA** at bottom — dashed border, transparent background

**Filter logic:** chips filter by the `tag` field of each group (`saved | chapter | curated | kanji`).

**Data source:** `japanese_word_groups` table (already exists per CLAUDE.md). Each row needs: `id, name, icon, tag, member_count, studied_count` (or compute `studied_count` client-side from `japanese_user_markings` ∩ group members).

---

## Mode card spec (grid card primitive)

Used 6 times in the home grid.

- Padding: `14px`, border-radius `16px`, background `T.surface`, 1px border `T.border`
- Min-height: `110px`, display flex column, gap 10px, position relative, overflow hidden
- **Color wash** (decorative): absolute positioned 80×80 div in top-right with `radial-gradient(circle, {modeColor}25, transparent 70%)` and `pointer-events: none`
- **Icon tile**: 40×40, radius 12px, background `linear-gradient(135deg, {modeColor}30, {modeColor}15)`, 1.5px border `{modeColor}50`. Icon centered. Japanese-kanji icons (あ, 漢) use `Noto Sans JP` weight 700; emoji icons render natively.
- **Name**: 14px bold, color `T.text`, margin-bottom 3px
- **Subtitle**: 11px, color `T.textDim`, line-height 1.3
- **Meta badge** (at card bottom, self-start, inline-flex): padding `2px 8px`, radius 6px, background `{modeColor}20`, color `{modeColor}`, 10px bold caps, letter-spacing 0.5px

### The 6 grid modes

| # | Card | Icon | Subtitle | Meta | Color | On tap |
|---|---|---|---|---|---|---|
| 1 | Kanji | 漢 (kanji, weight 700) | "Textbook kanji" | "8 new" | rose `#ef4444` | `app.currentTab='study'; app.studySubTab='kanji'; app.render()` |
| 2 | SRS Review | 🔁 | "Spaced repetition" | "15 due now" | blue `#3b82f6` | `app.currentTab='srs'; app.render()` |
| 3 | Self Study | 📝 | "Your saved words" | "34 saved" | purple `#a855f7` | `app.currentTab='study'; app.studySubTab='self_study'; app.render()` |
| 4 | Study by Group | 🏷️ | "Curated word sets" | "{N} groups" | amber `#f59e0b` | Open new Group picker view (Screen 2) |
| 5 | Anime Reader | 🎬 | "Naruto Shippuden" | "Ep 247" | rose `#ef4444` | `window.location.href = 'anime-reader.html'` |
| 6 | Script Reader | 📜 | "Your imports" | "{N} scripts" | teal `#14b8a6` | `window.location.href = 'script-reader.html'` |

**Meta values must be live, not hardcoded.** Compute on render:
- Kanji "new" = words from `japanese_unified_words` with no marking
- SRS "due now" = words whose next SRS review timestamp is ≤ now
- Self saved = count of words user has marked with the self-study marker
- Groups count = `app.wordGroups.length`
- Anime episode = read most recent `episode_id` from anime reader's localStorage
- Script count = `app.scripts?.length || 0`

---

## Design Tokens

These match the live app's existing `css/styles.css` + Tailwind defaults. Reuse Tailwind classes wherever possible.

### Colors

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| `T.bg` | `#0f172a` | `bg-slate-900` | Page background |
| `T.surface` | `#1e293b` | `bg-slate-800` | Cards, header pills |
| `T.surfaceHi` | `#334155` | `bg-slate-700` | Filter chips inactive, icon tile bg in group picker |
| `T.border` | `#334155` | `border-slate-700` | Card borders |
| `T.text` | `#f1f5f9` | `text-slate-100` | Primary text |
| `T.textMid` | `#cbd5e1` | `text-slate-300` | Secondary text |
| `T.textDim` | `#94a3b8` | `text-slate-400` | Subtitle text |
| `T.textFaint` | `#64748b` | `text-slate-500` | Caps labels |
| `T.blue` / `T.blueHi` | `#3b82f6` / `#60a5fa` | `bg-blue-500` / `text-blue-400` | SRS mode + active chips |
| `T.emerald` / `T.emeraldHi` | `#10b981` / `#34d399` | `bg-emerald-500` / `text-emerald-400` | Goi mode + logo |
| `T.teal` | `#14b8a6` | `bg-teal-500` | Script mode + logo gradient |
| `T.amber` / `T.amberHi` | `#f59e0b` / `#fbbf24` | `bg-amber-500` / `text-amber-400` | Group mode + due badges |
| `T.rose` / `T.roseHi` | `#ef4444` / `#f87171` | `bg-red-500` / `text-red-400` | Kanji, Anime |
| `T.purple` / `T.purpleHi` | `#a855f7` / `#c084fc` | `bg-purple-500` / `text-purple-400` | Self study |

### Typography

- All text: `Noto Sans JP` (already loaded in `index.html`)
- Japanese kanji glyphs in icon tiles: `Noto Sans JP` weight 700
- Sizes used: 9px / 10px / 11px / 12px / 13px / 14px / 15px / 16px
- Caps labels (section headers, meta badges): `text-transform: uppercase; letter-spacing: 1px; font-weight: 600`

### Spacing

- Page side padding: `12px`
- Card padding: `14px` (mode cards) / `18px` (hero) / `12px 14px` (group rows)
- Card-to-card gap: `8px`
- Section vertical gap: `10–14px`

### Radii

- Mode cards: `16px`
- Hero card: `18px`
- Icon tiles: `12px`
- Logo: `11px`
- Pills, chips, badges: `9–11px`
- Meta badges: `6px`
- Buttons (circular): `50%`

### Shadows / Effects

- No drop shadows on cards. Depth comes from background + border, not elevation. (Consistent with the live app's existing flat aesthetic.)
- Color washes: `radial-gradient(circle, {color}25, transparent 70%)` in card corners
- Tap states: `transform: scale(0.97)` with `transition: transform 0.1s`

---

## Interactions & Behavior

### Tap targets
- All cards and buttons get a `:active { transform: scale(0.97) }` state (already a `.tap` class in the prototype — implement equivalent).
- Minimum tap target 44×44 (iOS HIG). All grid cards already exceed this.

### Animations
- Cards fade-in on mount: `opacity 0→1, translateY 8px→0` over 250ms ease-out
- Group picker slides up from below: `translateY 20px→0, opacity 0→1` over 300ms cubic-bezier(0.4,0,0.2,1)

### Navigation
- Tapping a mode card sets `app.currentTab` (and sometimes `app.studySubTab`) then calls `app.render()` — the existing render pipeline handles the transition.
- **Important:** the Home tab is NEW. Add `'home'` as a valid `currentTab` value. Update `renderTabs()` in `js/render.js` to include a Home tab (icon `🏠`, first position).
- **Tab order to use** (replacing today's 6-tab strip): `Home · Study · SRS · Relations · Anime · Scripts` — drop the "Stories" top-tab (it's reachable from within flashcards via the existing 📖 button).

### Group picker filter behavior
- Filter chip click → `setState({filter: chipId})` → re-render group list with `groups.filter(g => filter==='all' || g.tag === filter)`
- Filter must persist for the lifetime of the view but reset when leaving the picker
- Search button (🔍) — out of scope for v1; either omit or wire to a future text-input overlay

### "No resume" state
- If `localStorage.study_session` is empty or stale (date != today), hide the Continue hero entirely.
- In that case the grid becomes 7 cards (Goi included as the first card).
- Goi card spec when in grid: icon `あ` (Noto Sans JP, 700, emerald), subtitle "Vocabulary flashcards", meta "{N} due" computed from markings.

---

## State Management

No new top-level state beyond what already exists. Read-only consumption:

| Need | Source |
|---|---|
| Resume hero data | `localStorage.study_session` (existing) |
| Stats pill "+N today" | `localStorage.practice_YYYY-MM-DD` (existing) — count of `studied_words` keys |
| Mode meta counts | Derived from `app.vocabulary`, `app.kanjiWords`, `app.markings`, `app.wordGroups`, `app.scripts` |
| Group picker list | `app.wordGroups` — load via `data.js` if not already loaded |

**New state added to `JLPTStudyApp`:**
- `homeGroupFilter: 'all'` — group picker filter chip selection (lives on app, not module-local, so it survives re-render)

---

## Files

### To create

| File | Purpose |
|---|---|
| `js/render-home.js` | New module. Exports `renderHome(app)` returning the home HTML string, and `renderGroupPicker(app)` for the drill-down. Mirrors the style of `js/render.js` (pure function, returns HTML, no DOM mutation). |

### To edit

| File | Changes |
|---|---|
| `js/app.js` | Add `'home'` as default `currentTab` for first-time users. Add `homeGroupFilter: 'all'` to initial state. In the render switch, route `currentTab === 'home'` to `renderHome(app)` and `app.homeView === 'groups'` to `renderGroupPicker(app)`. |
| `js/render.js` | Update `renderTabs()` to include Home as the first tab (icon `🏠`). Reorder to `Home · Study · SRS · Relations · Anime · Scripts` and drop the "Stories" top-level tab. |
| `js/events.js` | Add listeners for: `[data-home-mode]` (mode card click), `[data-home-resume]` (hero card), `[data-home-group-filter]` (filter chip), `[data-home-group-id]` (group row click), `[data-home-back]` (back from group picker). |
| `index.html` | Bump `?v=N` cache-bust on the styles + app.js script tags. |

### To NOT touch
- `js/render-kanji.js`, `js/render-srs.js`, `js/render-stories.js`, `js/render-similar.js`, `js/render-relations.js`, `js/canvas.js` — none of these need changes for this feature.
- `anime-reader.html`, `script-reader.html` — stay as-is, just linked from the home cards.

### Reference (in this handoff package)

| File | Use |
|---|---|
| `prototypes/Homepage Redesign.html` | Open in a browser to see the live design. Toggle to **Variant A** at the top, then tap "Study by Group" to see the drill-down. |

---

## Implementation Order (suggested)

1. **Add the Home tab plumbing** — wire `currentTab === 'home'` through render → events → tabs. Stub `renderHome` to return `<div>home</div>` to confirm routing works.
2. **Build the mode grid** — write `renderHome` with the 6 mode cards (skip the hero for now). Hard-code meta values. Verify all 6 cards navigate correctly.
3. **Compute live meta values** — replace hardcoded values with reads from existing state.
4. **Add the Continue hero** — read `localStorage.study_session`, render conditionally.
5. **Build the Group picker** — new view, filter chips, group list. Wire back button.
6. **Hoist Stats to the header** — decide whether to keep stats in SRS tab or expose as a standalone view triggered from the header pill.
7. **Polish: animations, color washes, tap states, cache-bust.**

Each step is independently committable per the project's "one focused change per session" workflow.

---

## Open Questions to Resolve Before Implementation

1. **Stats destination**: tapping the header Stats pill — does it open a new full-screen Stats view, or scroll to an existing stats section? Discuss with user.
2. **First-launch default**: should new users land on Home, or should existing users land on Home too (changing their muscle memory)? Probably "Home for new users, last-used tab for returning users."
3. **Word group data**: confirm `japanese_word_groups` exists and has the fields needed (`tag`, `icon`, member-count derivable). If not, schema migration first.
4. **"Stories" tab**: this handoff suggests dropping it from the top tab strip since it's reachable from within flashcards. Confirm with user.

---

End of handoff. Open `prototypes/Homepage Redesign.html` in a browser and switch to **Variant A** to see the target design.
