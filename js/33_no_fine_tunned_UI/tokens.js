// JLPT Vocabulary Master — Token access layer (Phase 7 Round 1)
//
// Single source of truth for Japanese token data. Prefers pre-computed
// Sudachi tokens (tokens_json on japanese_unified_sentences, schema v=1);
// falls back to a lazily-created Intl.Segmenter when tokens are absent.
//
// The Intl.Segmenter instance lives ONLY here in Round 1. Other live modules
// (data-manager.html / anime-reader.html / script-reader.html) keep their own
// segmenters — those are Rounds 1.5 / 2 / 3, intentionally untouched here.

let _jaSegmenter;                  // lazy singleton, created on first fallback
const _fallbackLogged = new Set(); // dedupe console.debug by sentence id / text

function _segmenter() {
  if (_jaSegmenter === undefined) {
    _jaSegmenter = (typeof Intl !== 'undefined' && Intl.Segmenter)
      ? new Intl.Segmenter('ja', { granularity: 'word' })
      : null;
  }
  return _jaSegmenter;
}

// Normalize either a sentence ROW object or a bare string into a row-like
// shape so callers can pass whichever they have.
function _asRow(sentence) {
  if (sentence == null) return { sentence: '', tokens_json: null, id: null };
  if (typeof sentence === 'string') return { sentence, tokens_json: null, id: null };
  return sentence;
}

// Decision 4 — four-guard validity check.
export function useTokens(sentence) {
  const tj = _asRow(sentence).tokens_json;
  return Boolean(
    tj
    && tj.v === 1
    && Array.isArray(tj.a)
    && tj.a.length > 0
  );
}

// Build fallback tokens from Intl.Segmenter. Same shape as real tokens,
// with l/r/p blank (lemma/reading/POS unavailable without a dictionary).
function _fallbackTokens(row) {
  const text = row.sentence || '';
  if (!text) return [];

  const seg = _segmenter();
  if (!seg) {
    // No Segmenter at all — one opaque token spanning the whole string.
    return [{ s: text, l: '', r: '', p: '', b: 0, e: text.length }];
  }

  const key = row.id != null ? `id:${row.id}` : `txt:${text}`;
  if (!_fallbackLogged.has(key)) {
    _fallbackLogged.add(key);
    // Decision 4.2 — intentional; stripped once 100% backfill verified
    // across all rounds. Do not remove yet.
    console.debug(
      `[tokens] fallback to Intl.Segmenter for sentence id=${row.id != null ? row.id : 'n/a'} "${text.slice(0, 30)}..."`
    );
  }

  const out = [];
  for (const part of seg.segment(text)) {
    out.push({
      s: part.segment,
      l: '',
      r: '',
      p: '',
      b: part.index,
      e: part.index + part.segment.length
    });
  }
  return out;
}

// Mode A — short units, for display tappability.
// Returns array of {s, l, r, p, b, e} tokens (offsets into the sentence text).
export function getTokensA(sentence) {
  const row = _asRow(sentence);
  if (useTokens(row)) return row.tokens_json.a;
  return _fallbackTokens(row);
}

// Mode C — long compounds, for word-in-sentence matching.
// Same return shape as getTokensA. Fallback is identical to Mode A
// (Intl.Segmenter has no compound mode).
export function getTokensC(sentence) {
  const row = _asRow(sentence);
  if (useTokens(row)) {
    const c = row.tokens_json.c;
    if (Array.isArray(c) && c.length > 0) return c;
    // Q4: tokens_json is valid (4-guard passed on .a) but .c is missing or
    // empty — stay on real tokens and use .a rather than dropping to the
    // Intl.Segmenter fallback. The 4-guard only validates .a by spec.
    return row.tokens_json.a;
  }
  return _fallbackTokens(row);
}
