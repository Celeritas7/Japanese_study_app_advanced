// ModeScreen — representative content for the long-tail sections reached from
// the More sheet: Self Study (company/work words), Anime Reader (subtitle
// dialogue), Script Reader (imports), and Stats. One back-header, switched body.
const { LevelBadge: _LB, ProgressBar: SProgress, Chip: SChip, Button: MBtn } = window.JLPTMasterDesignSystem_6867b7;

function SectionHeader({ title, sub, onBack }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 10px', background: 'var(--surface)' }}>
      <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-hi)', border: 'none', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>
      </div>
    </header>
  );
}

function WordRow({ w, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '11px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <span style={{ fontFamily: 'var(--font-jp)', fontWeight: 700, fontSize: 18, color: 'var(--text)', minWidth: 76 }}>{w.kanji}</span>
      <span style={{ fontSize: 12, color: accent || 'var(--blue-hi)', minWidth: 78 }}>{w.reading}</span>
      <span style={{ fontSize: 12, color: 'var(--text-dim)', flex: 1 }}>{w.meaning}</span>
    </div>
  );
}

function ModeScreen({ mode, onBack, onComplete }) {
  const D = window.STUDY_DATA;
  let title, sub, body;

  if (mode === 'self') {
    const s = D.selfStudy;
    title = 'Self Study'; sub = 'Your saved company & work words';
    body = (
      <React.Fragment>
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0 12px' }}>
          {s.topics.map(t => (
            <div key={t.name} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-pill)' }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <div><div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{t.name}</div><div style={{ fontSize: 10, color: t.color }}>{t.count} words</div></div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, padding: '4px 4px 8px' }}>Work / 会社</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{s.words.map((w, i) => <WordRow key={i} w={w} accent="var(--mode-self)" />)}</div>
      </React.Fragment>
    );
  } else if (mode === 'anime') {
    const a = D.anime;
    title = a.title; sub = `${a.episode} · ${a.sub}`;
    const tokStyle = (ty) => ty === 'known' ? { color: '#34d399' }
      : ty === 'unknown' ? { color: '#f87171', borderBottom: '2px dotted #f87171' }
      : ty === 'saved' ? { color: '#a855f7', borderBottom: '2px solid #a855f7' }
      : { color: 'var(--text-faint)' };
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {a.scenes.map((sc, si) => (
          <React.Fragment key={si}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '7px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{sc.title}</span>
                <span style={{ fontSize: 10, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{sc.time}</span>
              </div>
            </div>
            {sc.groups.map((g, gi) => (
              <div key={gi} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#0a0e1a', background: `linear-gradient(135deg, ${g.color}, ${g.color}aa)` }}>{[...g.speaker][0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: g.color }}>{g.speaker}</span>
                    {g.lines.length > 1 && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{g.lines.length} lines</span>}
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
                    {g.lines.map((l, li) => (
                      <div key={li} style={{ padding: '11px 15px', borderTop: li ? '1px dashed var(--border)' : 'none' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums', marginBottom: 6 }}>{l.t}</div>
                        <div style={{ fontFamily: 'var(--font-jp)', fontSize: 19, lineHeight: 1.65 }}>
                          {l.toks.map((tk, ti) => <span key={ti} className={tk[1] === 'p' ? undefined : 'tap'} style={{ cursor: tk[1] === 'p' ? 'default' : 'pointer', borderRadius: 3, padding: '1px 1px', ...tokStyle(tk[1]) }}>{tk[0]}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-faint)', padding: 8 }}>Tap any word to save it to Self Study</div>
      </div>
    );
  } else if (mode === 'script') {
    title = 'Script Reader'; sub = 'Your imported texts';
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {D.scripts.map((sc, i) => (
          <div key={i} style={{ padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{sc.name}</div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{sc.words} words</span>
            </div>
            <SProgress value={sc.pct} color={sc.color} height={6} />
            <div style={{ fontSize: 11, color: sc.color, marginTop: 6 }}>{sc.pct}% read</div>
          </div>
        ))}
        <button className="tap" style={{ padding: 14, background: 'transparent', border: '1.5px dashed var(--border-strong)', borderRadius: 'var(--radius-card)', color: 'var(--text-dim)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Import a new script</button>
      </div>
    );
  } else { // stats
    const st = D.stats;
    title = 'Stats'; sub = 'Your study progress';
    const StatCard = ({ label, value, accent }) => (
      <div style={{ flex: 1, padding: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: accent }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{label}</div>
      </div>
    );
    body = (
      <React.Fragment>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <StatCard label="day streak" value={st.streak} accent="var(--amber-hi)" />
          <StatCard label="words today" value={st.todayWords} accent="var(--emerald-hi)" />
          <StatCard label="due now" value={st.dueTotal} accent="var(--blue-hi)" />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, padding: '4px 4px 8px' }}>Mastery by level</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {st.levels.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <_LB level={l.id} />
              <div style={{ flex: 1 }}><SProgress value={l.studied} max={l.total} color={l.color} height={8} /></div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', minWidth: 78, textAlign: 'right' }}>{l.studied} / {l.total}</span>
            </div>
          ))}
        </div>
      </React.Fragment>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <SectionHeader title={title} sub={sub} onBack={onBack} />
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 16px' }}>{body}</div>
      {mode === 'self' && onComplete && (
        <div style={{ padding: '8px 12px 12px', background: 'var(--bg)' }}>
          <MBtn onClick={onComplete} iconLeft="✔">Finish this deck</MBtn>
        </div>
      )}
    </div>
  );
}
window.ModeScreen = ModeScreen;
