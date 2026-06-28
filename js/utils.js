// PREVIEW STUB ONLY — do NOT copy this into your app.
// Your real app already has js/utils.js with these functions.
export function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
export function getMarking(markings, w) {
  const k = w && (w.kanji || w.raw);
  return (markings && markings[k]) || 0;
}
