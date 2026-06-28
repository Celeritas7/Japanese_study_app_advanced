# Phase 2 follow-up — centering fix for the yellow-box scroller

Small CSS-only follow-up to the Phase 2 carousel work (see
`../phase2-carousel-overflow/README.md` for the full carousel context — not
repeated here).

## Why

Phase 2 shipped with Option A: `justify-content: center` on
`.sentence-box-scroll` so short content at reveal step 0 stays vertically
centered. The carousel README flagged this as a caveat to verify in browser
testing. **It hit:** on a long multi-line sentence (word **少々**) at reveal
step ≥2, `justify-content: center` distributed the overflow both above and
below center, and the **top of the sentence was clipped and unscrollable
upward**. Short content still needs to center; long content must scroll from
the top.

## What changed

`css/styles.css` only:
- Removed `justify-content: center;` from the `.sentence-box-scroll` rule.
  (The `justify-content: center` still on `.sentence-box` — the fixed-height
  outer box — is **unrelated and unchanged**.)
- Added the `margin: auto` collapse trick:
  ```css
  .sentence-box-scroll > *:first-child { margin-top: auto; }
  .sentence-box-scroll > *:last-child  { margin-bottom: auto; }
  ```
  When content fits, the auto margins center it (Option A behavior preserved).
  When content overflows the 160px box, the auto margins collapse to 0 and the
  content scrolls from the top — no clipping.

No JS or markup changes; `.sentence-box` height stays `160px` (no layout shift).

## Deploy mapping

Files copy 1:1 onto the live tree. No path changes.

| Staging file       | Live destination  |
|--------------------|-------------------|
| `css/styles.css`   | `css/styles.css`  |
| `index.html`       | `index.html`      |

### `css/styles.css` (delta +6)
The centering-fix change described above.

### `index.html` (delta +0)
Cache bump only: `?v=26` → `?v=27` on both versioned local assets
(`css/styles.css` link and `js/app.js` module). `js/app.js` is unchanged this
phase; both bumped together to keep cache versions consistent per the
CLAUDE.md cache-busting rule.

## Verification performed

- `grep "v="` index.html → 2 lines, both `v=27`.
- `grep "justify-content"` styles.css → 1 hit, on `.sentence-box` (line 74),
  none on `.sentence-box-scroll`.
- `grep "margin-(top|bottom): auto"` styles.css → 2 hits (first-child +
  last-child).
- `diff` vs. live: styles.css = the 6-line centering change only;
  index.html = the two `?v=` bumps only.

Stop after verification — not deployed.
