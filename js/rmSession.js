// rmSession.js — Roadmap session reporter (NO-BUILD variant)
// Place at: js/rmSession.js in Japanese_study_app_advanced
//
// Step 1 (Akatsuki R020, Sep 27): completions no longer POST to Roadmap's RPC with the
// bare anon key. They go through the Akatsuki hub client (window.jlptHub, from
// js/jlpt-adapter.js), signed in to the hub project with the user's own JWT.
// The hub key lives in js/hub-config.js (window.AK_HUB_ANON) — no literal here.

// Which app reported the completion. Repo slug.
const RM_SOURCE = 'japanese-study-app-advanced';

// ─── logical day ──────────────────────────────────────────────────────
// Roadmap's day flips at 4 AM local, NOT midnight. This MUST match
// Roadmap's src/lib/dailyReset.ts — if the two ever disagree, a late-night
// session lands on the wrong day and silently breaks the streak.
const RM_RESET_HOUR = 4;

export function rmDayKey(d = new Date()) {
  const s = new Date(d.getTime() - RM_RESET_HOUR * 3600000);
  const p = (n) => String(n).padStart(2, '0');
  return `${s.getFullYear()}-${p(s.getMonth() + 1)}-${p(s.getDate())}`;
}

// ─── handshake ────────────────────────────────────────────────────────
// Roadmap launches this app with ?rm_task=<uuid>&rm_day=<YYYY-MM-DD>. The
// params are stashed on first load so they survive the many navigations
// between launch and the results screen — including the full page loads this
// app does for anime-reader.html / script-reader.html.

const KEY = 'rm-handshake';
const PENDING = 'rm-pending';   // a completion finished before the hub sign-in

function readHandshake() {
  try {
    const q = new URLSearchParams(location.search);
    const task = q.get('rm_task');
    if (task) {
      const hs = {
        task,
        day: q.get('rm_day') || rmDayKey(),
        ret: q.get('rm_ret') || null,
        t0: Date.now(),
      };
      sessionStorage.setItem(KEY, JSON.stringify(hs));
      return hs;
    }
    const stored = sessionStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Call once at app start, before anything strips the query string.
export function rmInit() {
  const hs = readHandshake();
  if (hs) console.log('[rmSession] launched from Roadmap, task', hs.task);
  return hs;
}

// True when this page was opened from a Roadmap stop.
export function rmIsLaunched() {
  return !!readHandshake();
}

// ─── Akatsuki hub (second sign-in) ────────────────────────────────────
// rmHubInit: once, at the top of init(). Creates window.jlptHub (never window.sb).
// rmHubCheck: after the own state has loaded, on SIGNED_IN, and on guest entry.
//   Shows the sign-in bar only when launched from Roadmap, signed in to the own
//   project, not guest, and not yet signed in to the hub. Sends a pending
//   completion if the hub session is already there.

let uidFn = () => null;
const hubKeyOk = () => !!window.AK_HUB_ANON && !String(window.AK_HUB_ANON).startsWith('<paste');

export function rmHubInit({ uid } = {}) {
  if (uid) uidFn = uid;
  if (window.jlptHub) return window.jlptHub;
  if (!window.JlptHub || !window.Akatsuki) { console.warn('[rmSession] jlpt-adapter.js / akatsuki-client.js not loaded'); return null; }
  if (!hubKeyOk()) { console.warn('[rmSession] AK_HUB_ANON not set — edit js/hub-config.js'); return null; }
  window.jlptHub = window.JlptHub(window.supabase, {
    hubAnonKey: window.AK_HUB_ANON,
    uid: () => uidFn(),
    log: (...a) => console.debug('[ak]', ...a),
  });
  return window.jlptHub;
}

export async function rmHubCheck() {
  const hub = window.jlptHub;
  if (!hub || !uidFn()) return hideHubSignIn();
  if (await hub.signedIn()) { hideHubSignIn(); return sendPending(); }
  if (rmIsLaunched() || sessionStorage.getItem(PENDING)) showHubSignIn();
  else hideHubSignIn();
}

const BAR_ID = 'akatsuki-hub-bar';

export function showHubSignIn() {
  if (!window.jlptHub || !uidFn() || document.getElementById(BAR_ID)) return;
  const bar = document.createElement('div');
  bar.id = BAR_ID;
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom));z-index:60;display:flex;align-items:center;gap:12px;padding:10px 12px 10px 16px;border-radius:14px;background:#1e293b;border:1px solid #334155;color:#e2e8f0;font:14px/1.4 "Noto Sans JP",system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:560px;margin:0 auto';
  const txt = document.createElement('span');
  txt.style.cssText = 'flex:1;min-width:0';
  txt.textContent = 'Sign in to Akatsuki so this session reaches Roadmap';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Sign in';
  btn.style.cssText = 'flex:none;min-height:40px;padding:0 16px;border:0;border-radius:10px;background:#059669;color:#fff;font:inherit;font-weight:600;cursor:pointer';
  const x = document.createElement('button');
  x.type = 'button';
  x.setAttribute('aria-label', 'Dismiss');
  x.textContent = '×';
  x.style.cssText = 'flex:none;width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:#94a3b8;font:20px/1 system-ui;cursor:pointer';
  // login() opens the popup synchronously, before any await — keep it the first call here.
  btn.onclick = () => {
    btn.disabled = true; btn.textContent = 'Waiting…';
    window.jlptHub.login().then((ok) => {
      if (ok) { hideHubSignIn(); sendPending(); }
      else { btn.disabled = false; btn.textContent = 'Sign in'; }
    });
  };
  x.onclick = hideHubSignIn;
  bar.append(txt, btn, x);
  document.body.appendChild(bar);
}

export function hideHubSignIn() {
  document.getElementById(BAR_ID)?.remove();
}

// Send a completion that was finished before the hub sign-in. Once, then clear.
let sending = false;
async function sendPending() {
  if (sending) return;
  let p;
  try { p = JSON.parse(sessionStorage.getItem(PENDING) || 'null'); } catch { p = null; }
  if (!p) return;
  sending = true;
  sessionStorage.removeItem(PENDING);
  try { await report(p.hs, p.mins, p.feedback); }
  finally { sending = false; }
}

async function report(h, mins, feedback) {
  const r = await window.jlptHub.sessionCompleted(h, { duration: mins, ...feedback });
  if (r.needsLogin) {
    sessionStorage.setItem(PENDING, JSON.stringify({ hs: h, mins, feedback }));
    showHubSignIn();
    return false;
  }
  if (r.skipped) { console.log('[rmSession] not reported:', r.skipped); return false; }
  const ok = !!(r.rpc && r.rpc.ok) || ['pending', 'skipped'].includes(r.published && r.published.status);
  if (ok) console.log('[rmSession] reported completion for task', h.task, r);
  else console.warn('[rmSession] report failed', r);
  return ok;
}

// ─── the one call ─────────────────────────────────────────────────────
// Call when a study session genuinely FINISHES — the results screen, not app
// open and not partial progress. That honesty is the entire value of the
// ledger: the moment this fires on mere opening, "✓ confirmed" in Roadmap
// stops meaning anything.
//
//   rmComplete({ feedback: { words: 12, mode: 'goi' } });
//
// durationMin defaults to time since the app was launched from Roadmap.
// Never throws, never blocks, returns false harmlessly when the app was
// opened directly rather than launched from Roadmap. A missed report is a
// missing tick in Roadmap, not a broken study app.
export async function rmComplete({ durationMin = null, feedback = {}, taskId = null } = {}) {
  const hs = readHandshake();
  const task = taskId || hs?.task;
  if (!task) return false;
  if (!window.jlptHub && !rmHubInit()) return false;

  let mins = durationMin;
  if (mins == null && hs?.t0) {
    mins = Math.max(1, Math.round((Date.now() - hs.t0) / 60000));
  }
  // The day the LAUNCH happened — a session started 3:50 AM and
  // finished 4:10 belongs to the day it started.
  const h = { ...(hs || {}), task, day: hs?.day || rmDayKey() };

  try {
    return await report(h, mins, feedback);
  } catch (e) {
    console.warn('[rmSession] report error', e);
    return false;
  }
}

// Optional: send the user back to Roadmap after reporting.
export function rmReturn() {
  const hs = readHandshake();
  if (hs?.ret) location.href = hs.ret;
}
