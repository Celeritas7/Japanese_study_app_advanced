// 漢字 Story Panel — group-aware kanji story authoring with a Claude copy/paste loop.
// Reads: japanese_kanji_story_groups, japanese_kanji_stories, japanese_story_alerts,
//        japanese_unified_words + japanese_vocabulary (master kanji list)
// Writes: japanese_kanji_story_drafts, japanese_kanji_group_proposals, japanese_kanji_stories
const SUPABASE_URL='https://ulgrfumbwjovbjzjiems.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ3JmdW1id2pvdmJqemppZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzIyNjcsImV4cCI6MjA4Mjk0ODI2N30.ix5Vh4Y3GXNbQbzVtTD_WSko0L3cr5q_eCnTuDEMh7M';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const ADMIN_ID='d469efb7-f9e1-4b49-8b14-75a42b4d22e0';
const STUDY_APP='../../index.html';
const BATCH=9; // full-length stories: one Claude reply holds ~9 comfortably
const MASTER_CACHE='kanjiStoriesMaster_v1'; // our key only — never touch others
const MASTER_VER=1;
const isKanji=c=>c>='\u4E00'&&c<='\u9FFF';
// A character has a 'character' row and may also have a 'primitive' row (its meaning
// as an element inside other kanji), each in a group. Story-backed entries are keyed
// by their row id ("s1799"); kanji with no story yet are keyed by the bare character.
const keyOf=row=>'s'+row.id;
const isRowKey=k=>/^s\d+$/.test(String(k||''));
const ROLE_LABEL={character:'character',primitive:'primitive'};
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
// highlight Japanese runs inside bilingual prose
const jp=s=>esc(s).replace(/([\u3040-\u30ff\u4e00-\u9fff]+)/g,'<span class="jp">$1</span>');

async function pageAll(table,cols,order){
  let out=[],p=0,fellBack=false;const size=1000;
  for(;;){
    const{data,error}=await sb.from(table).select(cols).range(p*size,(p+1)*size-1).order(order);
    if(error){
      // unknown column — retry the whole table with * so a schema drift can't silently empty the list
      if(!fellBack&&cols!=='*'&&/column|does not exist|42703/i.test(error.message)){
        console.warn(`${table}: ${error.message} — retrying with *`);
        fellBack=true;cols='*';out=[];p=0;continue;
      }
      console.warn(table,error.message);break;
    }
    if(!data?.length)break;
    out=out.concat(data);
    if(data.length<size)break;
    p++;
  }
  return out;
}

// A story looks lifted from a textbook / mechanically generated when it talks about
// strokes or writing position, restates the meaning, or carries frame markers.
function bookLike(story,meaning){
  const s=(story||'').trim();
  if(!s)return false;
  if(/\b\d+\s*strokes?\b/i.test(s))return true;
  if(/\b(frame|page)\s*(no\.?|number|#)?\s*\d+/i.test(s))return true;
  if(/^this (kanji|character)\b/i.test(s))return true;
  if(/\*[^*]{2,24}\*/.test(s))return true;                      // *keyword* markers
  if(/written with|left side|right side|on the top|radical on/i.test(s)&&s.length<220)return true;
  if(meaning&&s.length<70&&s.toLowerCase().includes(String(meaning).toLowerCase().split(/[,(]/)[0].trim()))return true;
  if(s.length<45)return true;
  return false;
}
const vagueMeaning=m=>{
  const t=(m||'').trim();
  if(!t)return true;
  return t.split(/[,;/]/).length>=3||t.length>58||/\betc\.?$/i.test(t);
};

class StoryPanel{
  constructor(){
    this.user=null;this.ready=false;this.demo=false;
    this.groups=[];this.stories=[];this.drafts=[];this.proposals=[];this.alerts=[];this.components=[];
    this.kanjiWords=new Map();       // char -> [{kanji,hiragana,meaning}]
    this.tab='pending';this.selKanji=null;this.selGroup=null;
    this.sheet=null;this.ab='new';this.missingTable=false;
    this.init();
  }
  async init(){
    const{data:{session}}=await sb.auth.getSession();
    this.user=session?.user||null;
    sb.auth.onAuthStateChange((_e,s)=>{const had=!!this.user;this.user=s?.user||null;if(!had&&this.user)this.loadAll();else this.render()});
    if(this.user)await this.loadAll();else this.render();
  }
  isAdmin(){return this.demo||this.user?.id===ADMIN_ID}
  ro(){if(this.demo){this.toast('Preview mode — sign in to save');return true}return false}

  // Sample data so the panel can be looked at without signing in (preview / iframe).
  loadDemo(){
    this.demo=true;this.ready=true;
    this.groups=[{id:1,group_number:12,group_kanji:'日',group_meaning:'sun / day',group_component:'日',group_persona:'a window with a bar of light across it',group_story:'Everything here hangs off 日.'},
      {id:2,group_number:13,group_kanji:'氵',group_meaning:'water'}];
    this.stories=[
      {id:101,kanji:'明',meaning:'bright',story:'This kanji means bright. It has 8 strokes and is written with the sun part on the left and moon on the right.',onyomi:'ミョウ・メイ',kunyomi:'あか(るい)',group_kanji:'日',group_id:1,role:'character',variant:1},
      {id:102,kanji:'早',meaning:'early',story:'The sun climbs over a stake driven into the field, and the day is already under way — early.',onyomi:'ソウ',kunyomi:'はや(い)',group_kanji:'日',group_id:1,role:'character',variant:1,origin:'claude'},
      {id:103,kanji:'晴',meaning:'clear up',story:'This character is written with the sun radical on the left side.',onyomi:'セイ',kunyomi:'は(れる)',group_kanji:'日',group_id:1,role:'character',variant:1},
      {id:104,kanji:'月',meaning:'month, moon',story:'A picture of the moon, the two horizontal strokes standing for its phases.',onyomi:'ゲツ・ガツ',kunyomi:'つき',group_kanji:'日',group_id:1,role:'character',variant:1},
      {id:105,kanji:'月',meaning:'flesh, part of the body',story:'* As a primitive element this takes the sense of flesh or a part of the body.',group_kanji:'日',group_id:1,role:'primitive',variant:1},
      {id:106,kanji:'月',meaning:'a boat seen side-on',story:'* A second primitive reading of the same shape.',group_kanji:'日',group_id:1,role:'primitive',variant:2},
      {id:107,kanji:'時',meaning:'time',story:'The sun measured against a temple bell: each strike marks another slice of 時間.',onyomi:'ジ',kunyomi:'とき',group_kanji:'日',group_id:1,role:'character',variant:1,origin:'claude'}
    ];
    this.drafts=[{id:1,kind:'kanji',kanji:'明',story_row_id:101,role:'character',group_id:1,status:'pending',components:'日 sun + 月 moon',
      story:'Sun and moon hang in the same sky at once, so no corner of the courtyard is left in shadow — everything is 明るい (akarui, bright). Hold the picture of both lamps burning together: the day refuses to dim.',
      onyomi_hint:'メイ — a may-day dawn with both lights up.',kunyomi_hint:'あ — the dark opens up: 明ける.',
      group_link:'Shares 日 with 早 晴 暗 時 — all things the sun does to a day.',example_word:'明日（あした）— tomorrow',
      story_previous:this.stories[0].story,source:'claude'}];
    this.alerts=[{kanji:'晴',alert_type:'Story makes no sense',comment:'It just describes where the radical sits.'}];
    this.stories[2].audit_verdict='weak';this.stories[2].audit_note='The keyword barely follows from the sun radical.';
    this.proposals=[{id:9,group_kanji:'氵',group_meaning:'water',group_story:'Three drops falling: anything wet, poured, or crossed by boat.',kanji_list:['海','湖','汽','池'],status:'pending'}];
    for(const[ch,ws]of Object.entries({'明':[['明日','あした','tomorrow'],['説明','せつめい','explanation']],'早':[['早朝','そうちょう','early morning']],'晴':[['晴天','せいてん','clear sky']],'暗':[['暗記','あんき','memorisation']],'時':[['時間','じかん','time']],'砂':[['砂漠','さばく','desert']]}))
      this.kanjiWords.set(ch,ws.map(([kanji,hiragana,meaning])=>({kanji,hiragana,meaning})));
    this.tab='pending';this.pickFirst();this.render();
  }

  // ===== DATA =====
  async loadAll(){
    this.render();
    const[groups,stories,alerts]=await Promise.all([
      pageAll('japanese_kanji_story_groups','*','group_number'),
      pageAll('japanese_kanji_stories','*','id'),
      sb.from('japanese_story_alerts').select('*').eq('resolved',false).then(r=>r.data||[],()=>[])
    ]);
    this.groups=groups;this.stories=stories;this.alerts=alerts;
    const d=await sb.from('japanese_kanji_story_drafts').select('*').order('created_at',{ascending:false});
    if(d.error&&/does not exist|schema cache/i.test(d.error.message))this.missingTable=true;
    this.drafts=d.data||[];
    const p=await sb.from('japanese_kanji_group_proposals').select('*').eq('status','pending');
    this.proposals=p.data||[];
    const c=await sb.from('japanese_kanji_components').select('*').order('glyph');
    this.components=c.data||[];
    // Paint now. The vocabulary master list (thousands of rows, only needed for the
    // "No story" tab and example words) loads from cache or in the background.
    this.loadMasterFromCache();
    this.ready=true;
    this.selGroup=this.groups[0]?.id||null;
    this.pickFirst();
    this.render();
    if(!this.kanjiWords.size)this.loadKanjiMaster().then(()=>{this.saveMasterToCache();this.render()});
  }
  loadMasterFromCache(){
    try{
      const raw=localStorage.getItem(MASTER_CACHE);
      if(!raw)return;
      const{v,at,data}=JSON.parse(raw);
      if(v!==MASTER_VER||Date.now()-at>1000*60*60*24*14)return; // 2 weeks
      for(const[ch,ws]of Object.entries(data))
        this.kanjiWords.set(ch,ws.map(([kanji,hiragana,meaning])=>({kanji,hiragana,meaning})));
      this.masterCached=true;
    }catch(e){console.warn('master cache read failed',e)}
  }
  saveMasterToCache(){
    try{
      const out={};
      for(const[ch,ws]of this.kanjiWords)out[ch]=ws.slice(0,3).map(w=>[w.kanji,w.hiragana||'',w.meaning||'']);
      localStorage.setItem(MASTER_CACHE,JSON.stringify({v:MASTER_VER,at:Date.now(),data:out}));
    }catch(e){console.warn('master cache write failed (quota?)',e)}
  }
  async loadKanjiMaster(){
    const rows=[];
    // both vocabulary tables store the gloss as meaning_en (see js/data/words.js)
    for(const t of['japanese_unified_words','japanese_vocabulary']){
      const r=await pageAll(t,'kanji,hiragana,meaning_en','id');
      rows.push(...r);
    }
    for(const w of rows){
      const word={kanji:w.kanji,hiragana:w.hiragana,meaning:w.meaning_en??w.meaning??''};
      for(const ch of new Set([...(w.kanji||'')].filter(isKanji))){
        const arr=this.kanjiWords.get(ch)||[];
        if(arr.length<3)arr.push(word);
        this.kanjiWords.set(ch,arr);
      }
    }
  }

  // ===== DERIVED =====
  compOf(glyph){return this.components.find(c=>c.glyph===glyph)||null}
  // The group's own image — persona first, then the component's persona, then meaning.
  groupIdentity(gid){
    const g=this.groupRow(gid);
    if(!g)return null;
    const comp=g.group_component?this.compOf(g.group_component):null;
    return{group:g,glyph:g.group_component||g.group_kanji,name:comp?.name||null,
      persona:g.group_persona||comp?.persona||null,variantOf:comp?.variant_of||null,
      meaning:g.group_meaning||null,note:g.group_note||null,
      needsIdentity:!g.group_persona&&!comp?.persona};
  }
  storyFor(k){
    if(isRowKey(k))return this.stories.find(x=>String(x.id)===String(k).slice(1))||null;
    return this.stories.find(x=>x.kanji===k)||null;
  }
  charOf(k){return isRowKey(k)?(this.storyFor(k)?.kanji||'?'):String(k||'')}
  roleOf(k){return this.storyFor(k)?.role||'character'}
  draftFor(k){
    // drafts written before role_5_drafts.sql have no story_row_id — fall back to the
    // character (and role, when both sides know it) so they stay reachable.
    const st=this.storyFor(k),ch=this.charOf(k);
    return this.drafts.find(d=>d.kind==='kanji'&&d.status==='pending'&&(
      (d.story_row_id&&st&&d.story_row_id===st.id) ||
      (!d.story_row_id&&d.kanji===ch&&(!d.role||!st||d.role===st.role))
    ))||null;
  }
  groupOf(k){return this.groupIdOf(k)}
  groupRow(gid){return this.groups.find(g=>g.id===gid)||null}
  groupIdOf(k){return this.storyFor(k)?.group_id??null}
  siblings(gid){return this.stories.filter(s=>s.group_id===gid).map(keyOf)}
  statusOf(k){
    if(this.draftFor(k))return 'pending';
    const s=this.storyFor(k);
    if(!s||!s.story?.trim())return 'none';
    if(s.origin==='claude')return 'ok';
    if(s.role==='primitive')return 'bad'; // stored image is the book's invention
    return bookLike(s.story,s.meaning)?'bad':'ok';
  }
  meaningOf(k){
    const s=this.storyFor(k);
    if(s?.meaning)return s.meaning;
    const w=this.kanjiWords.get(this.charOf(k))?.[0];
    return w?.meaning||'';
  }
  readingsOf(k){const s=this.storyFor(k);return{on:s?.onyomi||'',kun:s?.kunyomi||''}}

  queue(){
    switch(this.tab){
      case'pending':return this.drafts.filter(d=>d.kind==='kanji'&&d.status==='pending').map(d=>{
          if(d.story_row_id)return 's'+d.story_row_id;
          const st=this.stories.find(x=>x.kanji===d.kanji&&(!d.role||x.role===d.role))
                ||this.stories.find(x=>x.kanji===d.kanji);
          return st?keyOf(st):d.kanji;
        });
      case'booklike':return this.stories.filter(s=>s.origin!=='claude'
        &&(s.role==='primitive'||bookLike(s.story,s.meaning))).map(keyOf);
      case'nostory':{
        const have=new Set(this.stories.filter(s=>s.story?.trim()).map(s=>s.kanji));
        return[...this.kanjiWords.keys()].filter(k=>!have.has(k)).sort((a,b)=>(this.kanjiWords.get(b).length)-(this.kanjiWords.get(a).length));
      }
      case'flagged':{
        const chars=[...new Set(this.alerts.map(a=>a.kanji).filter(Boolean))];
        return chars.flatMap(c=>{const rows=this.stories.filter(x=>x.kanji===c);return rows.length?rows.map(keyOf):[c]});
      }
      case'approved':return this.stories.filter(s=>s.origin==='claude').map(keyOf);
      case'misfit':return this.stories.filter(s=>s.audit_verdict&&s.audit_verdict!=='fits').map(keyOf);
      default:return[];
    }
  }
  pickFirst(){const q=this.queue();this.selKanji=q.includes(this.selKanji)?this.selKanji:q[0]||null;if(this.selKanji)this.selGroup=this.groupOf(this.selKanji)||this.selGroup}

  // ===== CLAUDE LOOP =====
  buildPrompt(){
    const q=this.queue().slice(0,BATCH);
    if(!q.length)return null;
    const items=q.map(k=>{
      const st=this.storyFor(k),g=this.groups.find(x=>x.group_kanji===(st?.group_kanji));
      const id=st?.group_kanji?this.groupIdentity(st.group_kanji):null;
      const words=(this.kanjiWords.get(this.charOf(k))||[]).slice(0,4).map(w=>`${w.kanji}（${w.hiragana||''}）= ${w.meaning||''}`);
      const m=this.meaningOf(k),r=this.readingsOf(k);
      const anchor=id
        ?[`- shared component: ${id.glyph}${id.name?` = "${id.name}"`:''}${id.variantOf?` (variant of ${id.variantOf})`:''}`,
          id.persona?`  its established image: ${id.persona}`:`  NO IMAGE SET YET — propose one in "component_persona" and reuse it for every kanji in this group`,
          `  group siblings: ${this.siblings(st.group_kanji).filter(x=>x!==k).join(' ')||'none'}`,
          id.meaning&&!id.persona?`  (ignore the group's stored meaning "${id.meaning}" — it was copied from one member kanji and is not the group idea)`:null
        ].filter(Boolean).join('\n')
        :'- shared component: none assigned';
      const role=this.roleOf(k);
      return[`### ${this.charOf(k)}${role==='primitive'
        ?' — PRIMITIVE ENTRY: write the image this element carries INSIDE other kanji, not the character\'s own meaning'
        :' — CHARACTER ENTRY: write the character\'s own meaning'}`,
        role==='primitive'
          ?`- image currently stored: ${m||'(none)'}
  <-- This is almost certainly the published course's INVENTED image, not a fact about the
      character. Replace it: put your own original image in "keyword" and say what you
      changed in "keyword_note". Do not reuse or lightly reword the stored one.`
          :`- meaning in my DB: ${m||'(none)'}${vagueMeaning(m)?'   <-- TOO VAGUE, propose a sharper keyword':''}`,
        r.on?`- onyomi: ${r.on}`:null,
        r.kun?`- kunyomi: ${r.kun}`:null,
        anchor,
        words.length?`- real words using it: ${words.join(' · ')}`:null,
        st?.story?.trim()?`- CURRENT STORY (do NOT reuse this wording, rewrite from scratch):\n  """${st.story.trim()}"""`:'- current story: none'
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const lex=this.components.length
      ?`\nMY COMPONENT LEXICON — use these exact names and images, do not invent alternatives:\n${this.components.map(c=>`${c.glyph} = "${c.name}"${c.variant_of?` (variant of ${c.variant_of})`:''}${c.persona?` — ${c.persona}`:''}`).join('\n')}\n`
      :'';

    return `You are helping me write ORIGINAL kanji mnemonics for my own study app.

COPYRIGHT RULE — this is not optional:
- Do NOT reproduce, paraphrase closely, or recall keywords/stories from "Remembering the Kanji" or any other published kanji course.
- Where a CURRENT STORY is shown, treat it as a negative example: rewrite completely in your own words. Do not echo its phrasing.
- Component names are factual and fine to state; the imagery and wording must be yours.

STYLE:
- Bilingual: English prose, with Japanese written in kana/kanji where it helps (gloss it in italics-style parentheses).
- Full length is fine — this is my primary study material. Depth beats brevity.
- Build the image out of the kanji's actual components, anchored on the shared component's established image when one is given.
- A group's idea comes from its SHARED COMPONENT, never from one member kanji's meaning. If a group's stored meaning looks like a single kanji's gloss, ignore it.
- Components that are not standalone kanji (⺖ 亻 氵 ⺘ ⺾ ⻖) still need a concrete name and image — use my lexicon where it has one, otherwise propose one in "component_persona".
- A CHARACTER's keyword is close to factual (明 = bright) so keep it unless it is too vague.
  A PRIMITIVE's image is pure invention, so any stored one came from a published course and
  must be replaced with your own — that is the single most important rule here.
- Include: component breakdown, a vivid mnemonic for the meaning, an ON-reading hook, a KUN-reading hook, how it relates to its group siblings, and one real example word.
- No stroke counts, no "this kanji means…", no restating the keyword back at me.

If the DB meaning is too vague to build on, set "keyword" to a sharper one-word keyword and explain in "keyword_note". Otherwise leave "keyword" null.
If a shared component has no image yet, set "component_persona" to the image you are establishing for it (same wording for every kanji in that group).
${lex}
Return ONLY a JSON array, one object per kanji, no prose around it:
[{"kanji":"忙","keyword":null,"keyword_note":null,"components":"⺖ sideways heart + 亡 vanish","component_persona":null,"story":"...","onyomi_hint":"...","kunyomi_hint":"...","group_link":"...","example_word":"忙しい（いそがしい）— busy"}]

KANJI TO WRITE (${q.length}):

${items}`;
  }
  async copyPrompt(){
    const p=this.buildPrompt();
    if(!p){this.toast('Nothing in this queue');return}
    try{await navigator.clipboard.writeText(p);this.toast(`📋 Prompt for ${Math.min(BATCH,this.queue().length)} kanji copied`)}
    catch{this.sheet={type:'prompt',text:p};this.render()}
  }
  async applyDrafts(list){
    if(this.ro())return;
    if(!this.isAdmin()){this.toast('Admin only');return}
    let ok=0,fail=0;
    for(const it of list){
      const k=(it.kanji||'').trim();
      if(!k)continue;
      const st=this.storyFor(k);
      {const q=sb.from('japanese_kanji_story_drafts').delete().eq('status','pending').eq('kind','kanji');
       await (st?.id?q.eq('story_row_id',st.id):q.eq('kanji',this.charOf(k)).is('story_row_id',null));}
      const{error}=await sb.from('japanese_kanji_story_drafts').insert({
        kind:'kanji',kanji:this.charOf(k),story_row_id:st?.id||null,role:st?.role||'character',
        group_id:st?.group_id||null,group_kanji:st?.group_kanji||null,status:'pending',
        keyword:it.keyword||null,keyword_note:it.keyword_note||null,components:it.components||null,
        story:it.story||null,onyomi_hint:it.onyomi_hint||null,kunyomi_hint:it.kunyomi_hint||null,
        group_link:it.group_link||null,example_word:it.example_word||null,
        story_previous:st?.story||null,source:'claude',vague_meaning:!!it.keyword,user_id:this.user.id
      });
      error?(fail++,console.warn(k,error.message)):ok++;
      // Claude establishing an image for a nameless component: keep it for every future batch
      if(it.component_persona&&st?.group_kanji){
        const g=this.groups.find(x=>x.group_kanji===st.group_kanji);
        if(g&&!g.group_persona){
          await sb.from('japanese_kanji_story_groups').update({group_persona:it.component_persona}).eq('id',g.id);
          g.group_persona=it.component_persona;
        }
      }
    }
    const d=await sb.from('japanese_kanji_story_drafts').select('*').order('created_at',{ascending:false});
    this.drafts=d.data||[];
    this.sheet=null;this.tab='pending';this.pickFirst();this.render();
    this.toast(`✓ ${ok} draft(s) queued${fail?` · ${fail} failed`:''}`);
  }
  async approve(){
    const k=this.selKanji,d=this.draftFor(k);
    if(!d||!this.isAdmin())return;
    if(this.ro())return;
    const st=this.storyFor(k);
    const row={kanji:this.charOf(k),role:st?.role||'character',group_id:st?.group_id||null,
      meaning:d.keyword||st?.meaning||this.meaningOf(k),story:d.story,
      onyomi:st?.onyomi||null,kunyomi:st?.kunyomi||null,group_kanji:d.group_kanji||st?.group_kanji||null,
      components:d.components,onyomi_hint:d.onyomi_hint,kunyomi_hint:d.kunyomi_hint,
      group_link:d.group_link,example_word:d.example_word,origin:'claude',updated_at:new Date().toISOString()};
    const res=st?.id
      ?await sb.from('japanese_kanji_stories').update(row).eq('id',st.id)
      :await sb.from('japanese_kanji_stories').insert(row);
    if(res.error){alert('Publish failed: '+res.error.message);return}
    await sb.from('japanese_kanji_story_drafts').update({status:'approved',reviewed_at:new Date().toISOString(),story_previous:st?.story||null}).eq('id',d.id);
    if(st)Object.assign(st,row);else this.stories.push({...row,id:null});
    d.status='approved';
    this.nextInQueue();
    this.toast('✓ Published — live in the study app');
  }
  async reject(){
    const d=this.draftFor(this.selKanji);
    if(!d||this.ro())return;
    await sb.from('japanese_kanji_story_drafts').update({status:'rejected',reviewed_at:new Date().toISOString()}).eq('id',d.id);
    d.status='rejected';this.nextInQueue();this.toast('Draft rejected');
  }
  async saveEdit(fields){
    const d=this.draftFor(this.selKanji);if(!d)return;
    if(this.demo){Object.assign(d,fields);this.sheet=null;this.render();this.toast('Preview mode — not saved');return}
    const{error}=await sb.from('japanese_kanji_story_drafts').update(fields).eq('id',d.id);
    if(error){alert(error.message);return}
    Object.assign(d,fields);this.sheet=null;this.render();this.toast('✓ Draft updated');
  }
  async rollback(){
    if(this.ro())return;
    const k=this.selKanji,st=this.storyFor(k);
    const hist=this.drafts.find(d=>(st?.id?d.story_row_id===st.id:d.kanji===this.charOf(k))&&d.status==='approved'&&d.story_previous);
    if(!hist||!st?.id){this.toast('No previous version stored');return}
    const{error}=await sb.from('japanese_kanji_stories').update({story:hist.story_previous,origin:null}).eq('id',st.id);
    if(error){alert(error.message);return}
    st.story=hist.story_previous;st.origin=null;this.render();this.toast('↩ Rolled back');
  }
  nextInQueue(){
    const q=this.queue();
    this.selKanji=q[0]||null;
    if(this.selKanji)this.selGroup=this.groupOf(this.selKanji)||this.selGroup;
    this.render();
  }
  // ----- group proposals -----
  async acceptProposal(id,only){
    if(this.ro())return;
    const p=this.proposals.find(x=>x.id===id);if(!p)return;
    const list=only?[only]:p.kanji_list||[];
    let g=this.groups.find(x=>x.group_kanji===p.group_kanji);
    if(!g){
      const{data}=await sb.from('japanese_kanji_story_groups').insert({group_kanji:p.group_kanji,group_meaning:p.group_meaning,group_story:p.group_story,group_number:(Math.max(0,...this.groups.map(x=>x.group_number||0))+1)}).select();
      g=data?.[0];if(g)this.groups.push(g);
    }
    for(const k of list){
      const st=this.storyFor(k);
      if(st?.id)await sb.from('japanese_kanji_stories').update({group_kanji:p.group_kanji}).eq('id',st.id);
      else await sb.from('japanese_kanji_stories').insert({kanji:k,meaning:this.meaningOf(k),group_kanji:p.group_kanji});
      if(st)st.group_kanji=p.group_kanji;
    }
    if(only){
      p.kanji_list=(p.kanji_list||[]).filter(x=>x!==only);
      await sb.from('japanese_kanji_group_proposals').update({kanji_list:p.kanji_list}).eq('id',id);
      if(!p.kanji_list.length)this.proposals=this.proposals.filter(x=>x.id!==id);
    }else{
      await sb.from('japanese_kanji_group_proposals').update({status:'accepted'}).eq('id',id);
      this.proposals=this.proposals.filter(x=>x.id!==id);
    }
    this.render();this.toast(only?`✓ ${only} → ${p.group_kanji}`:`✓ Group ${p.group_kanji} accepted`);
  }
  async groupPrompt(){
    const have=new Set(this.stories.filter(s=>s.group_kanji).map(s=>s.kanji));
    const un=[...this.kanjiWords.keys()].filter(k=>!have.has(k)).slice(0,60);
    const known=this.groups.map(g=>`${g.group_kanji} = ${g.group_meaning||'?'}`).join('\n');
    const p=`Group these kanji by their shared visual component (radical), for my study app.

Existing groups I already use — reuse these anchors wherever they fit:
${known}

Rules:
- Group by a component the kanji visibly SHARE, not by meaning or reading.
- Original wording only; do not copy groupings or keywords from any published kanji course.
- Leave a kanji out rather than forcing it into a weak group.
- group_story: one short original paragraph on what the shared component contributes.

Return ONLY a JSON array:
[{"group_kanji":"氵","group_meaning":"water","group_story":"...","kanji_list":["海","汽","湖"]}]

UNGROUPED KANJI:
${un.join(' ')}`;
    try{await navigator.clipboard.writeText(p);this.toast('📋 Grouping prompt copied')}
    catch{this.sheet={type:'prompt',text:p};this.render()}
  }
  async applyProposals(list){
    if(this.ro())return;
    let ok=0;
    for(const g of list){
      if(!g.group_kanji||!Array.isArray(g.kanji_list))continue;
      const{error}=await sb.from('japanese_kanji_group_proposals').insert({group_kanji:g.group_kanji,group_meaning:g.group_meaning||null,group_story:g.group_story||null,kanji_list:g.kanji_list,status:'pending',user_id:this.user.id});
      if(!error)ok++;
    }
    const p=await sb.from('japanese_kanji_group_proposals').select('*').eq('status','pending');
    this.proposals=p.data||[];
    this.sheet=null;this.tab='groups';this.render();
    this.toast(`✓ ${ok} group proposal(s) queued`);
  }

  // ===== RENDER =====
  toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
  render(){
    const app=document.getElementById('app');if(!app)return;
    if(!this.user&&!this.demo){app.innerHTML=this.loginView();this.bind();return}
    if(!this.isAdmin()){app.innerHTML=`<div class="login"><div style="font-size:40px">🔒</div><div style="font-size:14px">This panel is admin-only.</div><a class="btn" href="${STUDY_APP}">← Back to the study app</a></div>`;this.bind();return}
    if(!this.ready){app.innerHTML=`${this.header()}<div class="empty">Loading stories and groups…<br><span style="font-size:11px">≈ 4,000 rows — the vocabulary list loads afterwards in the background</span></div>`;this.bind();return}
    const y=window.scrollY;
    app.innerHTML=`${this.header()}${this.tabsBar()}<div class="view">${this.tab==='groups'?this.groupsView():this.queueView()}</div><div id="sheetHost">${this.sheet?this.sheetView():''}</div>`;
    window.scrollTo(0,y);
    this.bind();
  }
  loginView(){return`<div class="login"><div style="font-size:44px">漢</div><div style="font-family:'M PLUS Rounded 1c',sans-serif;font-size:18px;font-weight:700">Kanji Story Panel</div><div style="font-size:12.5px;color:var(--text-secondary);max-width:300px;line-height:1.6">Sign in with the admin account to write and review kanji stories.</div><button class="btn primary" id="loginBtn">Sign in with Google</button><button class="btn" id="demoBtn">👁 Preview with sample data</button><a class="btn" href="${STUDY_APP}">← Study app</a></div>`}
  header(){
    const nPending=this.drafts.filter(d=>d.status==='pending').length;
    return`<div class="hdr"><h1>漢字 Story Panel</h1>${this.ready?`<span class="pill">${nPending} pending</span>`:''}${this.demo?`<span class="pill" style="border-color:var(--accent-amber);color:var(--accent-amber)">preview</span>`:''}<span class="sp"></span>
      ${this.missingTable?`<button class="btn danger" id="sqlBtn">⚠ Setup SQL</button>`:''}
      <button class="btn amber" id="copyBtn">📋 Prompt (${BATCH})</button>
      <button class="btn" id="pasteBtn">📥 Paste</button>
      <a class="btn" href="${STUDY_APP}" title="Back to study app">←</a></div>`;
  }
  tabsBar(){
    const have=new Set(this.stories.filter(s=>s.story?.trim()).map(s=>s.kanji));
    const counts={
      pending:this.drafts.filter(d=>d.kind==='kanji'&&d.status==='pending').length,
      booklike:this.stories.filter(s=>s.origin!=='claude'&&(s.role==='primitive'||bookLike(s.story,s.meaning))).length,
      nostory:[...this.kanjiWords.keys()].filter(k=>!have.has(k)).length,
      flagged:new Set(this.alerts.map(a=>a.kanji).filter(Boolean)).size,
      groups:this.proposals.length||this.groups.length,
      approved:this.stories.filter(s=>s.origin==='claude').length
    };
    counts.misfit=this.stories.filter(s=>s.audit_verdict&&s.audit_verdict!=='fits').length;
    const t=[['pending','Pending drafts'],['booklike','Book-like'],['nostory','No story'],['flagged','Flagged'],['misfit','Bad fit'],['groups','Groups'],['approved','Approved']];
    return`<div class="tabs hide-sb">${t.map(([k,l])=>`<button data-tab="${k}" class="${this.tab===k?'on':''}">${l}<b>${counts[k].toLocaleString()}</b></button>`).join('')}</div>`;
  }
  queueView(){
    const q=this.queue();
    if(this.tab==='nostory'&&!this.kanjiWords.size)return`<div class="empty">Still loading the vocabulary list…<br><span style="font-size:11px">This tab needs it to know which kanji have no story. Other tabs work now.</span></div>`;
    if(!q.length)return`<div class="empty">Nothing in this queue.<br>${this.tab==='pending'?'Copy the prompt, paste Claude\'s JSON back, and drafts land here.':'Try another tab.'}</div>`;
    const k=this.selKanji||q[0];
    const gk=this.groupOf(k),g=this.groupRow(gk);
    const sibs=gk?this.siblings(gk):q.slice(0,24);
    const strip=sibs.map(s=>{const r=this.roleOf(s),v=this.storyFor(s)?.variant,prim=r==='primitive';
      return `<button data-k="${esc(s)}" class="${s===k?'on':''}${prim?' prim':''}" title="${prim?'primitive element':'character'}${v>1?' · entry '+v:''}">${esc(this.charOf(s))}${v>1?`<sup style="font-size:9px;opacity:.7">${v}</sup>`:''}<i class="s-${this.statusOf(s)}"></i></button>`}).join('');
    const legend=sibs.some(s=>this.roleOf(s)==='primitive')
      ? `<div style="display:flex;gap:14px;font-size:10px;color:var(--text-muted);margin:-8px 0 12px"><span><b style="color:var(--text-secondary)">plain</b> = the character</span><span><b style="color:var(--accent-purple)">purple</b> = its primitive element</span></div>`
      : '';
    const id=gk?this.groupIdentity(gk):null;
    const grpbar=gk?`<div class="grpbar"><span class="gk">${esc(id?.glyph||g?.group_kanji||'?')}</span><div class="gt"><div class="t">${esc(id?.name||g?.group_meaning||'Group')}${id?.needsIdentity?` <span class="tag warn">no group image — set one</span>`:''}</div>
      <div class="s">${id?.note?`<b style="color:var(--accent-amber)">${esc(id.note)}</b> · `:''}${id?.persona?esc(id.persona):`${sibs.length} entries · ${sibs.filter(s=>this.statusOf(s)==='pending').length} pending · ${sibs.filter(s=>this.statusOf(s)==='bad').length} book-like`}</div></div>
      <button class="btn ${id?.needsIdentity?'amber':''}" id="grpStoryBtn">✎ Identity</button><button class="btn" id="auditBtn">⚖ Audit</button></div>`
      :`<div class="grpbar"><span class="gk">?</span><div class="gt"><div class="t">No group assigned</div><div class="s">Use the Groups tab to let Claude propose one</div></div></div>`;
    return grpbar+`<div class="strip hide-sb">${strip}</div>${legend}${this.cardView(k)}`;
  }
  cardView(k){
    const st=this.storyFor(k),d=this.draftFor(k),m=this.meaningOf(k),r=this.readingsOf(k);
    const flags=this.alerts.filter(a=>a.kanji===this.charOf(k));
    const words=(this.kanjiWords.get(this.charOf(k))||[]).slice(0,3);
    const status=this.statusOf(k);
    const tags=[
      status==='bad'?`<span class="tag bad">current story looks book-like</span>`:'',
      st?.role==='primitive'&&st?.origin!=='claude'?`<span class="tag bad">book's invented image — replace the keyword too</span>`:'',
      status==='ok'&&st?.origin==='claude'?`<span class="tag ok">approved</span>`:'',
      d?.keyword?`<span class="tag warn">keyword → ${esc(d.keyword)}</span>`:'',
      vagueMeaning(m)&&!d?.keyword?`<span class="tag warn">vague meaning</span>`:'',
      flags.length?`<span class="tag bad">🚩 ${flags.length} flag${flags.length>1?'s':''}</span>`:'',
      st?.audit_verdict&&st.audit_verdict!=='fits'?`<span class="tag bad">${esc(st.audit_verdict)}</span>`:''
    ].join('');
    const comp=d?.components||st?.components;
    const newBox=d?`<div class="box new show" data-ab="new"><h4>Claude draft<span style="color:var(--accent-amber)">pending</span></h4>
        <p>${jp(d.story||'')}</p>
        ${d.onyomi_hint?`<div class="rowlbl">ON hook</div><p>${jp(d.onyomi_hint)}</p>`:''}
        ${d.kunyomi_hint?`<div class="rowlbl">KUN hook</div><p>${jp(d.kunyomi_hint)}</p>`:''}
        ${d.keyword_note?`<div class="rowlbl">Keyword note</div><p>${esc(d.keyword_note)}</p>`:''}</div>`
      :`<div class="box new show" data-ab="new"><h4>No draft yet</h4><p style="color:var(--text-muted)">Copy the batch prompt, paste Claude's JSON, and the draft appears here.</p></div>`;
    const oldBox=`<div class="box old" data-ab="old"><h4>Current story<span>${d?'would be replaced':'live'}</span></h4><p>${st?.story?.trim()?jp(st.story):'<em>empty</em>'}</p></div>`;
    return`<div class="card">
      <div class="top"><span class="k">${esc(this.charOf(k))}</span><div class="meta">
        <div class="kw">${esc(d?.keyword||m||'—')}${this.roleOf(k)==='primitive'
            ?'<span class="tag" style="color:var(--accent-purple);border-color:#a855f755;background:rgba(168,85,247,.1)">primitive element</span>'
            :'<span class="tag ok">character</span>'}${st?.variant>1?`<span class="tag warn">entry ${st.variant}</span>`:''}${tags}</div>
        <div class="rd">${r.on?`ON ${esc(r.on)}<br>`:''}${r.kun?`KUN ${esc(r.kun)}`:''}${!r.on&&!r.kun?'<em style="color:var(--text-muted)">no readings in DB</em>':''}</div>
        ${comp?`<div class="comp">${comp.split(/[+＋]/).map(c=>`<span>${jp(c.trim())}</span>`).join('＋')}</div>`:''}
      </div></div>
      <div class="swipe"><button data-ab-btn="new" class="${this.ab==='new'?'on':''}">New draft</button><button data-ab-btn="old" class="${this.ab==='old'?'on':''}">Current story</button></div>
      <div class="two ab">${newBox}${oldBox}</div>
      ${d?.group_link||d?.example_word||words.length?`<div class="sub">Group link · example word</div><div class="box">
        ${d?.group_link?`<p>${jp(d.group_link)}</p>`:''}
        ${d?.example_word?`<p>${jp(d.example_word)}</p>`:''}
        ${!d&&words.length?`<p>${words.map(w=>jp(`${w.kanji}（${w.hiragana||''}）— ${w.meaning||''}`)).join('<br>')}</p>`:''}</div>`:''}
      ${flags.length?`<div class="sub">Reported issues</div><div class="box">${flags.map(f=>`<p><strong style="color:var(--accent-pink)">${esc(f.alert_type||'issue')}</strong> ${esc(f.comment||'')}</p>`).join('')}</div>`:''}
      <div class="acts">
        <button class="btn primary" id="approveBtn" ${d?'':'disabled'}>✓ Publish &amp; next</button>
        <button class="btn" id="editBtn" ${d?'':'disabled'}>✎ Edit draft</button>
        <button class="btn" id="rejectBtn" ${d?'':'disabled'}>✕ Reject</button>
        <button class="btn" id="skipBtn">Skip</button>
        ${st?.origin==='claude'?`<button class="btn danger" id="rollbackBtn">↩ Roll back</button>`:''}
      </div></div>`;
  }
  groupsView(){
    if(this.proposals.length)return`<div class="grpbar"><span class="gk">✨</span><div class="gt"><div class="t">${this.proposals.length} group proposal(s) from Claude</div><div class="s">Bulk-accept a group, or move single kanji in</div></div><button class="btn" id="grpPromptBtn">📋 New grouping prompt</button></div>`
      +this.proposals.map(p=>`<div class="card"><div class="top" style="align-items:center"><span class="k" style="font-size:52px">${esc(p.group_kanji)}</span><div class="meta">
        <div class="kw">${esc(p.group_meaning||'—')}</div><div class="rd">${(p.kanji_list||[]).length} kanji proposed</div></div></div>
        ${p.group_story?`<div class="box"><h4>Group story</h4><p>${jp(p.group_story)}</p></div>`:''}
        <div class="sub">Tap a kanji to move just that one in</div>
        <div class="kchips">${(p.kanji_list||[]).map(k=>`<span data-one="${esc(k)}" data-pid="${p.id}" style="cursor:pointer">${esc(k)}</span>`).join('')}</div>
        <div class="acts"><button class="btn primary" data-accept="${p.id}">✓ Accept whole group</button><button class="btn danger" data-decline="${p.id}">Decline</button></div></div>`).join('');
    return`<div class="grpbar"><span class="gk">${esc(this.groups[0]?.group_kanji||'?')}</span><div class="gt"><div class="t">${this.groups.length} groups</div><div class="s">No pending proposals</div></div><button class="btn amber" id="grpPromptBtn">📋 Grouping prompt</button></div>
      <div class="glist">${this.groups.map(g=>{const n=this.siblings(g.id).length;return`<div class="gitem" data-group="${g.id}"><span class="gk">${esc(g.group_component||g.group_kanji)}</span><div class="gm">${esc(g.group_meaning||'—')}${g.group_note?` <span style="color:var(--accent-amber)">· ${esc(g.group_note)}</span>`:''}<small>${n} entries${g.group_persona?' · has image':''}${g.group_story?' · has story':''}</small></div></div>`}).join('')}</div>`;
  }
  sheetView(){
    const s=this.sheet;
    if(s.type==='prompt')return`<div class="sheet" id="ovl"><div class="sheet__inner"><h3>Copy this into Claude</h3><div class="hint">Clipboard access was blocked — select all and copy manually.</div><textarea rows="14" id="promptTa" readonly>${esc(s.text)}</textarea><div class="acts"><button class="btn" id="closeSheet">Close</button></div></div></div>`;
    if(s.type==='paste')return`<div class="sheet" id="ovl"><div class="sheet__inner"><h3>Paste Claude's reply</h3><div class="hint">Paste the whole reply — I'll find the JSON array. Story objects go to the draft queue; group objects (with <code>kanji_list</code>) go to Groups.</div>
      <textarea rows="12" id="pasteTa" placeholder='[{"kanji":"明","story":"..."}]'></textarea>
      <div class="acts"><button class="btn primary" id="applyPaste">Apply</button><button class="btn" id="closeSheet">Cancel</button></div></div></div>`;
    if(s.type==='sql')return`<div class="sheet" id="ovl"><div class="sheet__inner"><h3>Run this once in Supabase</h3><div class="hint">The drafts table is missing. Paste this into the SQL editor — it's the same content as <code>story_drafts.sql</code>.</div>
      <textarea rows="14" id="promptTa" readonly>${esc(SQL_FALLBACK)}</textarea><div class="acts"><button class="btn" id="copySql">📋 Copy SQL</button><button class="btn" id="closeSheet">Close</button></div></div></div>`;
    if(s.type==='edit'){
      const d=this.draftFor(this.selKanji)||{};
      return`<div class="sheet" id="ovl"><div class="sheet__inner"><h3>Edit draft · ${esc(this.selKanji)}</h3><div class="hint">Your edits are saved to the draft, then published when you approve.</div>
        <label class="flbl">Keyword</label><input type="text" id="eKw" value="${esc(d.keyword||'')}">
        <label class="flbl">Components</label><input type="text" id="eComp" value="${esc(d.components||'')}">
        <label class="flbl">Story</label><textarea rows="8" id="eStory">${esc(d.story||'')}</textarea>
        <label class="flbl">ON hook</label><input type="text" id="eOn" value="${esc(d.onyomi_hint||'')}">
        <label class="flbl">KUN hook</label><input type="text" id="eKun" value="${esc(d.kunyomi_hint||'')}">
        <label class="flbl">Group link</label><textarea rows="2" id="eLink">${esc(d.group_link||'')}</textarea>
        <label class="flbl">Example word</label><input type="text" id="eEx" value="${esc(d.example_word||'')}">
        <div class="acts"><button class="btn primary" id="saveEdit">Save draft</button><button class="btn" id="closeSheet">Cancel</button></div></div></div>`;
    }
    if(s.type==='audit')return this.auditSheet();
    if(s.type==='groupStory'){
      const gk=this.groupOf(this.selKanji),g=this.groupRow(gk)||{};
      const id=gk?this.groupIdentity(gk):null;
      return`<div class="sheet" id="ovl"><div class="sheet__inner"><h3>Group identity · ${esc(g.group_kanji||'')}</h3>
        <div class="hint">The group's image comes from the part these kanji <em>share</em> — not from one member's meaning. Non-kanji parts like ⺖ 亻 氵 belong here too; the name and image you set get reused in every prompt.</div>
        <label class="flbl">Shared component (glyph — may not be a kanji)</label><input type="text" id="gComp" value="${esc(g.group_component||'')}" placeholder="⺖">
        <label class="flbl">Component name</label><input type="text" id="gCompName" value="${esc(id?.name||'')}" placeholder="sideways heart">
        <label class="flbl">Image / persona — what you always picture</label><textarea rows="3" id="gPersona" placeholder="feelings pressed into a narrow gutter at the left edge">${esc(g.group_persona||id?.persona||'')}</textarea>
        <label class="flbl">Variant of</label><input type="text" id="gVariant" value="${esc(id?.variantOf||'')}" placeholder="心">
        <label class="flbl">How this group differs — when one character anchors several groups</label><input type="text" id="gNote" value="${esc(g.group_note||'')}" placeholder="行 wrapped around a core, vs 行 on the right">
        <label class="flbl">Group meaning ${id?.meaning&&id.needsIdentity?'<span style="color:var(--accent-pink)">— looks copied from a member kanji</span>':''}</label><input type="text" id="gMean" value="${esc(g.group_meaning||'')}">
        <label class="flbl">Group story</label><textarea rows="5" id="gStory">${esc(g.group_story||'')}</textarea>
        <div class="acts"><button class="btn primary" id="saveGroup">Save</button><button class="btn" id="closeSheet">Cancel</button></div></div></div>`;
    }
    return'';
  }

  bind(){
    const on=(id,fn,ev='click')=>document.getElementById(id)?.addEventListener(ev,fn);
    on('loginBtn',()=>sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}}));
    on('demoBtn',()=>this.loadDemo());
    on('copyBtn',()=>this.copyPrompt());
    on('pasteBtn',()=>{this.sheet={type:'paste'};this.render()});
    on('sqlBtn',()=>{this.sheet={type:'sql'};this.render()});
    on('closeSheet',()=>{this.sheet=null;this.render()});
    document.getElementById('ovl')?.addEventListener('click',e=>{if(e.target.id==='ovl'){this.sheet=null;this.render()}});
    document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{this.tab=b.dataset.tab;this.pickFirst();this.render()}));
    // kanji strip — patch selection without rebuilding the page
    document.querySelectorAll('[data-k]').forEach(b=>b.addEventListener('click',()=>{this.selKanji=b.dataset.k;this.render()}));
    document.querySelectorAll('[data-group]').forEach(b=>b.addEventListener('click',()=>{const gid=+b.dataset.group;this.selGroup=gid;const s=this.siblings(gid);this.selKanji=s[0]||this.selKanji;this.tab='booklike';this.render()}));
    // A/B toggle is pure class work — never re-render
    document.querySelectorAll('[data-ab-btn]').forEach(b=>b.addEventListener('click',()=>{
      this.ab=b.dataset.abBtn;
      document.querySelectorAll('[data-ab-btn]').forEach(x=>x.classList.toggle('on',x===b));
      document.querySelectorAll('[data-ab]').forEach(x=>x.classList.toggle('show',x.dataset.ab===this.ab));
    }));
    on('approveBtn',()=>this.approve());
    on('rejectBtn',()=>this.reject());
    on('rollbackBtn',()=>this.rollback());
    on('skipBtn',()=>{const q=this.queue(),i=q.indexOf(this.selKanji);this.selKanji=q[(i+1)%q.length];this.render()});
    on('editBtn',()=>{this.sheet={type:'edit'};this.render()});
    on('grpStoryBtn',()=>{this.sheet={type:'groupStory'};this.render()});
    on('grpPromptBtn',()=>this.groupPrompt());
    on('auditBtn',()=>{this.selGroup=this.groupOf(this.selKanji);this.sheet={type:'audit'};this.render()});
    on('copyAuditBtn',()=>this.copyAuditPrompt());
    on('applyAuditBtn',()=>{
      const txt=document.getElementById('auditJson').value.trim();
      const a=txt.indexOf('{'),b=txt.lastIndexOf('}');
      if(a<0||b<a){alert('No JSON object found');return}
      let obj;try{obj=JSON.parse(txt.slice(a,b+1))}catch(e){alert('Invalid JSON: '+e.message);return}
      this.applyAudit(obj);
    });
    on('saveEdit',()=>this.saveEdit({
      keyword:document.getElementById('eKw').value.trim()||null,
      components:document.getElementById('eComp').value.trim()||null,
      story:document.getElementById('eStory').value.trim(),
      onyomi_hint:document.getElementById('eOn').value.trim()||null,
      kunyomi_hint:document.getElementById('eKun').value.trim()||null,
      group_link:document.getElementById('eLink').value.trim()||null,
      example_word:document.getElementById('eEx').value.trim()||null
    }));
    on('saveGroup',async()=>{
      const gk=this.groupOf(this.selKanji);if(!gk)return;
      if(this.ro())return;
      const g=this.groupRow(gk);
      const glyph=document.getElementById('gComp').value.trim();
      const cname=document.getElementById('gCompName').value.trim();
      const persona=document.getElementById('gPersona').value.trim();
      const variant=document.getElementById('gVariant').value.trim();
      const fields={group_meaning:document.getElementById('gMean').value.trim(),group_story:document.getElementById('gStory').value.trim(),
        group_component:glyph||null,group_persona:persona||null,
        group_note:document.getElementById('gNote').value.trim()||null};
      const{error}=g?.id?await sb.from('japanese_kanji_story_groups').update(fields).eq('id',g.id)
        :await sb.from('japanese_kanji_story_groups').insert({group_kanji:this.charOf(this.selKanji),...fields});
      if(error){alert(error.message);return}
      if(g)Object.assign(g,fields);
      // keep the lexicon in step so every future prompt reuses this name
      if(glyph&&cname){
        const row={glyph,name:cname,persona:persona||null,variant_of:variant||null,user_id:this.user?.id||null};
        const ex=this.compOf(glyph);
        const r=ex?await sb.from('japanese_kanji_components').update(row).eq('id',ex.id)
          :await sb.from('japanese_kanji_components').insert(row);
        if(!r.error){ex?Object.assign(ex,row):this.components.push(row)}
      }
      this.sheet=null;this.render();this.toast('✓ Group identity saved');
    });
    on('copySql',()=>navigator.clipboard.writeText(SQL_FALLBACK).then(()=>this.toast('📋 SQL copied')));
    on('applyPaste',()=>{
      const txt=document.getElementById('pasteTa').value;
      const a=txt.indexOf('['),b=txt.lastIndexOf(']');
      if(a<0||b<a){alert('No JSON array found');return}
      let list;try{list=JSON.parse(txt.slice(a,b+1))}catch(e){alert('Invalid JSON: '+e.message);return}
      if(!Array.isArray(list)||!list.length){alert('Expected a non-empty JSON array');return}
      list[0].kanji_list?this.applyProposals(list):this.applyDrafts(list);
    });
    document.querySelectorAll('[data-accept]').forEach(b=>b.addEventListener('click',()=>this.acceptProposal(+b.dataset.accept)));
    document.querySelectorAll('[data-decline]').forEach(b=>b.addEventListener('click',async()=>{
      await sb.from('japanese_kanji_group_proposals').update({status:'rejected'}).eq('id',+b.dataset.decline);
      this.proposals=this.proposals.filter(x=>x.id!==+b.dataset.decline);this.render();
    }));
    document.querySelectorAll('[data-one]').forEach(b=>b.addEventListener('click',()=>this.acceptProposal(+b.dataset.pid,b.dataset.one)));
  }
}

const SQL_FALLBACK=`create table if not exists japanese_kanji_story_drafts (
  id bigserial primary key, kind text not null default 'kanji', kanji text, group_kanji text,
  status text not null default 'pending', keyword text, keyword_note text, components text,
  story text, onyomi_hint text, kunyomi_hint text, group_link text, example_word text,
  story_previous text, source text default 'claude', vague_meaning boolean default false,
  created_at timestamptz default now(), reviewed_at timestamptz, user_id uuid);
create index if not exists kks_drafts_status_idx on japanese_kanji_story_drafts (status);
create unique index if not exists kks_drafts_one_pending on japanese_kanji_story_drafts (kanji)
  where status='pending' and kind='kanji';
create table if not exists japanese_kanji_group_proposals (
  id bigserial primary key, group_kanji text not null, group_meaning text, group_story text,
  kanji_list text[] not null default '{}', status text not null default 'pending',
  created_at timestamptz default now(), user_id uuid);
alter table japanese_kanji_stories add column if not exists components text;
alter table japanese_kanji_stories add column if not exists onyomi_hint text;
alter table japanese_kanji_stories add column if not exists kunyomi_hint text;
alter table japanese_kanji_stories add column if not exists group_link text;
alter table japanese_kanji_stories add column if not exists example_word text;
alter table japanese_kanji_stories add column if not exists updated_at timestamptz;
alter table japanese_kanji_stories add column if not exists origin text;`;

new StoryPanel();
