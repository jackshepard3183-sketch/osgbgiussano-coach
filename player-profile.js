(function(){
  let client=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtDate=d=>{if(!d)return'—';const x=String(d).slice(0,10).split('-');return x.length===3?`${x[2]}/${x[1]}/${x[0]}`:String(d)};
  const statusLabel=s=>({present:'Presente',absent:'Assente',late:'Ritardo',unavailable:'Indisponibile'}[s]||s||'—');
  const expLabel=v=>typeof window.osgbExperienceLabel==='function'?window.osgbExperienceLabel(v):({first_year:'Primo anno',second_year:'Secondo anno',third_year:'Terzo anno'}[v]||'Da definire');
  const devLabel=v=>typeof window.osgbDevelopmentLabel==='function'?window.osgbDevelopmentLabel(v):({initial:'Iniziale',growing:'In crescita',consolidated:'Consolidato'}[v]||'Da definire');
  const tel=v=>String(v||'').replace(/[^+\d]/g,'');

  async function loadProfileData(id){
    const [{data:player},{data:contacts},{data:attendance},{data:callups}] = await Promise.all([
      client.from('players').select('id,first_name,last_name,birth_year,active,experience_level,development_level,development_notes,source_system,source_key,source_synced_at,source_missing,source_last_seen_at').eq('id',id).maybeSingle(),
      client.from('parent_contacts').select('id,contact_name,relationship,phone,email,is_primary,notes').eq('player_id',id).order('is_primary',{ascending:false}).order('created_at',{ascending:true}),
      client.from('attendance').select('status,updated_at,events(id,event_date,title,event_type)').eq('player_id',id).order('updated_at',{ascending:false}),
      client.from('callups').select('team_color,created_at,events(id,event_date,title,event_type,opponent,observations,post_match_notes)').eq('player_id',id).order('created_at',{ascending:false})
    ]);
    return {player,contacts:contacts||[],attendance:attendance||[],callups:callups||[]};
  }

  function contactsHtml(rows){
    if(!rows.length)return '<p class="muted">Nessun contatto famiglia salvato.</p>';
    return rows.map(c=>{
      const phone=c.phone?`<a class="btn alt" href="tel:${esc(tel(c.phone))}"><i data-lucide="phone"></i>${esc(c.phone)}</a>`:'';
      const mail=c.email?`<a class="btn alt" href="mailto:${esc(c.email)}"><i data-lucide="mail"></i>Email</a>`:'';
      return `<div class="card" style="margin-top:8px"><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><b>${esc(c.contact_name||'Contatto')}</b>${c.is_primary?'<span class="pill yellow">PRINCIPALE</span>':''}${c.relationship?`<span class="pill">${esc(c.relationship)}</span>`:''}</div><div class="row" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${phone}${mail}</div></div>`;
    }).join('');
  }

  function attendanceStats(rows){
    const s={present:0,absent:0,late:0,unavailable:0,total:rows.length};
    rows.forEach(r=>{if(Object.prototype.hasOwnProperty.call(s,r.status))s[r.status]++;});
    s.pct=s.total?Math.round((s.present+s.late)/s.total*100):0;return s;
  }

  function attendanceHistory(rows){
    if(!rows.length)return '<p class="muted">Nessuna presenza registrata.</p>';
    return rows.slice(0,12).map(r=>`<div class="event"><div class="date"><b>${fmtDate(r.events?.event_date||r.updated_at)}</b></div><div class="body"><strong>${esc(statusLabel(r.status))}</strong><small>${esc(r.events?.title||'Attività')}</small></div></div>`).join('');
  }

  function callupSummary(rows){
    const blu=rows.filter(r=>r.team_color==='BLU').length,gialla=rows.filter(r=>r.team_color==='GIALLA').length;
    return {total:rows.length,blu,gialla};
  }

  function callupHistory(rows){
    if(!rows.length)return '<p class="muted">Nessuna convocazione registrata.</p>';
    return rows.slice(0,10).map(r=>`<div class="event"><div class="date"><b>${fmtDate(r.events?.event_date||r.created_at)}</b></div><div class="body"><strong>${esc(r.events?.title||r.events?.opponent||'Gara')}</strong><small>${esc(r.team_color||'—')}</small></div><span class="pill ${r.team_color==='GIALLA'?'yellow':''}">${esc(r.team_color||'—')}</span></div>`).join('');
  }

  function observationsHtml(rows){
    const withObs=rows.filter(r=>r.events?.observations&&Object.keys(r.events.observations||{}).length).slice(0,4);
    if(!withObs.length)return '<p class="muted">Nessuna osservazione gara disponibile.</p>';
    const labels={participation:'Partecipazione',collaboration:'Collaborazione',attention:'Attenzione',ball_control:'Conduzione',passing:'Passaggio',one_v_one:'1 contro 1'};
    const levels={review:'Da riprendere',growing:'In crescita',positive:'Positivo'};
    return withObs.map(r=>{const pills=Object.entries(r.events.observations||{}).map(([k,v])=>`<span class="pill">${esc(labels[k]||k)}: ${esc(levels[v]||v)}</span>`).join('');return `<div class="card" style="margin-top:8px"><b>${fmtDate(r.events.event_date)} · ${esc(r.events.title||r.events.opponent||'Gara')}</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${pills}</div>${r.events.post_match_notes?`<p class="muted" style="margin-top:8px">${esc(r.events.post_match_notes)}</p>`:''}</div>`;}).join('')+`<p class="muted" style="margin-top:8px">Le osservazioni sono riferite alla gara/gruppo e servono come contesto, non come valutazione individuale del bambino.</p>`;
  }

  window.openPlayerStats=async function(id){
    const fallback=P.find(x=>String(x.id)===String(id));if(!fallback||!client)return;
    modal(`<div class="mh"><h3>${esc(fallback.n)}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><div class="card"><p class="muted">Caricamento scheda completa…</p></div>`);
    try{
      const d=await loadProfileData(id);const p=d.player;if(!p)throw new Error('player not found');
      const a=attendanceStats(d.attendance),c=callupSummary(d.callups);
      const verify=p.source_missing?`<div class="card yellow" style="margin-bottom:12px"><b>DA VERIFICARE</b><p class="muted">Non trovato nella fonte iscrizioni all’ultimo controllo. Nessuna cancellazione automatica.</p><button class="btn alt" onclick="closeM();openRosterSync()"><i data-lucide="refresh-cw"></i>Ricontrolla fonte</button></div>`:'';
      const syncText=p.source_synced_at?fmtDate(p.source_synced_at):'Non disponibile';
      closeM();
      modal(`<div class="mh"><h3>${esc([p.first_name,p.last_name].filter(Boolean).join(' '))}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
        ${verify}
        <div class="card"><div class="muted">ANAGRAFICA</div><h3>${esc([p.first_name,p.last_name].filter(Boolean).join(' '))}</h3><p class="muted">Anno ${p.birth_year||'—'} · ${p.active?'Attivo':'Non attivo'}</p><p class="muted">Ultima sincronizzazione: ${esc(syncText)}</p></div>
        <div class="card" style="margin-top:12px"><div class="muted">PROFILO DI SVILUPPO</div><h3>${esc(expLabel(p.experience_level))} · ${esc(devLabel(p.development_level))}</h3>${p.development_notes?`<p>${esc(p.development_notes)}</p>`:'<p class="muted">Nessuna nota interna.</p>'}<button class="btn alt" onclick='openPlayerDevelopment(${JSON.stringify(String(id))})'><i data-lucide="sliders-horizontal"></i>Modifica profilo</button></div>
        <div class="section">CONTATTI FAMIGLIA</div>${contactsHtml(d.contacts)}
        <div class="section">PRESENZE</div><div class="grid g4"><div class="card"><b>Presenze</b><div class="kpi">${a.present}</div></div><div class="card"><b>Assenze</b><div class="kpi">${a.absent}</div></div><div class="card"><b>Ritardi</b><div class="kpi">${a.late}</div></div><div class="card"><b>Presenza %</b><div class="kpi">${a.pct}%</div></div></div><div class="card" style="margin-top:10px">${attendanceHistory(d.attendance)}</div>
        <div class="section">CONVOCAZIONI</div><div class="grid g3"><div class="card"><b>Totali</b><div class="kpi">${c.total}</div></div><div class="card"><b>BLU</b><div class="kpi">${c.blu}</div></div><div class="card yellow"><b>GIALLA</b><div class="kpi">${c.gialla}</div></div></div><div class="card" style="margin-top:10px">${callupHistory(d.callups)}</div>
        <div class="section">OSSERVAZIONI RECENTI</div>${observationsHtml(d.callups)}
      `);
    }catch(err){console.error('complete player profile',err);closeM();alert('Impossibile caricare la scheda completa del bambino.');}
  };

  window.addEventListener('osgb-auth-ready',e=>{client=e.detail?.client||null;});
})();
