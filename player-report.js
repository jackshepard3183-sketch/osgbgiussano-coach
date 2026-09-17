(function(){
  let client=null;
  const START='2026-09-10',END='2027-06-30';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const csv=s=>`"${String(s??'').replace(/"/g,'""')}"`;
  const fmtDate=d=>{if(!d)return'—';const x=String(d).slice(0,10).split('-');return x.length===3?`${x[2]}/${x[1]}/${x[0]}`:String(d)};
  const statusLabel=s=>({present:'Presente',absent:'Assente',late:'Ritardo',unavailable:'Indisponibile'}[s]||s||'—');
  const expLabel=v=>typeof window.osgbExperienceLabel==='function'?window.osgbExperienceLabel(v):({first_year:'Primo anno',second_year:'Secondo anno',third_year:'Terzo anno'}[v]||'Da definire');
  const devLabel=v=>typeof window.osgbDevelopmentLabel==='function'?window.osgbDevelopmentLabel(v):({initial:'Iniziale',growing:'In crescita',consolidated:'Consolidato'}[v]||'Da definire');

  async function load(id){
    const [{data:p,error:pe},{data:a,error:ae},{data:c,error:ce}]=await Promise.all([
      client.from('players').select('id,first_name,last_name,birth_year,experience_level,development_level,development_notes').eq('id',id).maybeSingle(),
      client.from('attendance').select('status,events!inner(event_date,title,event_type)').eq('player_id',id).gte('events.event_date',START).lte('events.event_date',END).order('updated_at',{ascending:false}),
      client.from('callups').select('team_color,events!inner(event_date,title,event_type,opponent)').eq('player_id',id).gte('events.event_date',START).lte('events.event_date',END).order('created_at',{ascending:false})
    ]);
    if(pe||ae||ce)throw pe||ae||ce;
    const rows=a||[],calls=c||[];
    const present=rows.filter(x=>x.status==='present'||x.status==='late').length;
    const absent=rows.filter(x=>x.status==='absent').length;
    const late=rows.filter(x=>x.status==='late').length;
    const unavailable=rows.filter(x=>x.status==='unavailable').length;
    const pct=rows.length?Math.round(present/rows.length*100):0;
    const blu=calls.filter(x=>x.team_color==='BLU').length,gialla=calls.filter(x=>x.team_color==='GIALLA').length;
    return {player:p,attendance:rows,callups:calls,stats:{present,absent,late,unavailable,pct,total:rows.length,blu,gialla,callups:calls.length}};
  }

  function reportHtml(d){
    const p=d.player,s=d.stats,name=[p.first_name,p.last_name].filter(Boolean).join(' ');
    const hist=d.attendance.slice(0,20).map(r=>`<tr><td>${fmtDate(r.events?.event_date)}</td><td>${esc(r.events?.title||'Allenamento')}</td><td>${esc(statusLabel(r.status))}</td></tr>`).join('')||'<tr><td colspan="3">Nessuna presenza registrata.</td></tr>';
    const calls=d.callups.slice(0,20).map(r=>`<tr><td>${fmtDate(r.events?.event_date)}</td><td>${esc(r.events?.title||r.events?.opponent||'Gara')}</td><td>${esc(r.team_color||'—')}</td></tr>`).join('')||'<tr><td colspan="3">Nessuna convocazione registrata.</td></tr>';
    return `<div class="mh"><h3>REPORT · ${esc(name)}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">Scheda gestionale interna · Stagione 2026/2027 · dal 10/09/2026</p>
      <div class="card"><div class="muted">PROFILO</div><h3>${esc(name)}</h3><p class="muted">Anno ${p.birth_year||'—'} · ${esc(expLabel(p.experience_level))} · ${esc(devLabel(p.development_level))}</p>${p.development_notes?`<p>${esc(p.development_notes)}</p>`:'<p class="muted">Nessuna nota interna.</p>'}</div>
      <div class="section">PRESENZE</div><div class="grid g4"><div class="card"><b>Presenze</b><div class="kpi">${s.present}</div></div><div class="card"><b>Assenze</b><div class="kpi">${s.absent}</div></div><div class="card"><b>Ritardi</b><div class="kpi">${s.late}</div></div><div class="card"><b>Presenza %</b><div class="kpi">${s.pct}%</div></div></div>
      <div class="section">CONVOCAZIONI</div><div class="grid g3"><div class="card"><b>Totali</b><div class="kpi">${s.callups}</div></div><div class="card"><b>BLU</b><div class="kpi">${s.blu}</div></div><div class="card yellow"><b>GIALLA</b><div class="kpi">${s.gialla}</div></div></div>
      <div class="row" style="margin:12px 0"><button class="btn" onclick="printPlayerReport()"><i data-lucide="printer"></i>Stampa / PDF</button><button class="btn alt" onclick="exportPlayerReportCSV()"><i data-lucide="sheet"></i>Esporta CSV</button></div>
      <div class="section">STORICO PRESENZE</div><div style="overflow:auto"><table><thead><tr><th>Data</th><th>Attività</th><th>Stato</th></tr></thead><tbody>${hist}</tbody></table></div>
      <div class="section">STORICO CONVOCAZIONI</div><div style="overflow:auto"><table><thead><tr><th>Data</th><th>Gara</th><th>Squadra</th></tr></thead><tbody>${calls}</tbody></table></div>`;
  }

  window.openPlayerReport=async function(id){
    if(!client)return;
    modal('<div class="mh"><h3>REPORT BAMBINO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Caricamento…</p>');
    try{window.__osgbPlayerReport=await load(id);modal(reportHtml(window.__osgbPlayerReport));}catch(e){console.error(e);closeM();alert('Impossibile caricare il report del bambino.');}
  };

  window.exportPlayerReportCSV=function(){
    const d=window.__osgbPlayerReport;if(!d)return;const p=d.player,name=[p.first_name,p.last_name].filter(Boolean).join(' ');
    const lines=[['Bambino','Esperienza','Sviluppo','Presenze','Assenze','Ritardi','Indisponibile','Presenza %','Convocazioni','BLU','GIALLA'].map(csv).join(';'),[name,expLabel(p.experience_level),devLabel(p.development_level),d.stats.present,d.stats.absent,d.stats.late,d.stats.unavailable,d.stats.pct+'%',d.stats.callups,d.stats.blu,d.stats.gialla].map(csv).join(';'),'',['STORICO PRESENZE'].map(csv).join(';'),['Data','Attività','Stato'].map(csv).join(';')];
    d.attendance.forEach(r=>lines.push([fmtDate(r.events?.event_date),r.events?.title||'Allenamento',statusLabel(r.status)].map(csv).join(';')));
    lines.push('',['STORICO CONVOCAZIONI'].map(csv).join(';'),['Data','Gara','Squadra'].map(csv).join(';'));
    d.callups.forEach(r=>lines.push([fmtDate(r.events?.event_date),r.events?.title||r.events?.opponent||'Gara',r.team_color||'—'].map(csv).join(';')));
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`OSGB_${name.replace(/\s+/g,'_')}_2026-2027.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  };

  window.printPlayerReport=function(){
    const d=window.__osgbPlayerReport;if(!d)return;const p=d.player,s=d.stats,name=[p.first_name,p.last_name].filter(Boolean).join(' ');
    const at=d.attendance.map(r=>`<tr><td>${fmtDate(r.events?.event_date)}</td><td>${esc(r.events?.title||'Allenamento')}</td><td>${esc(statusLabel(r.status))}</td></tr>`).join('');
    const cu=d.callups.map(r=>`<tr><td>${fmtDate(r.events?.event_date)}</td><td>${esc(r.events?.title||r.events?.opponent||'Gara')}</td><td>${esc(r.team_color||'—')}</td></tr>`).join('');
    const w=window.open('','_blank');if(!w)return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Report ${esc(name)}</title><style>body{font-family:Arial,sans-serif;color:#17223b;padding:24px;font-size:12px}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:18px 0 8px}.sum{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.sum div{border:1px solid #ccd4e2;border-radius:8px;padding:9px 12px}table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:14px}th,td{border:1px solid #d8dee9;padding:6px;text-align:left}th{background:#f2f5fa}@media print{body{padding:0}}</style></head><body><h1>OSGB Giussano · Scuola Calcio 2020</h1><p><b>${esc(name)}</b> · Report stagione 2026/2027 · dal 10/09/2026</p><p>Profilo: ${esc(expLabel(p.experience_level))} · ${esc(devLabel(p.development_level))}</p>${p.development_notes?`<p>${esc(p.development_notes)}</p>`:''}<div class="sum"><div><b>Presenze</b><br>${s.present}</div><div><b>Assenze</b><br>${s.absent}</div><div><b>Ritardi</b><br>${s.late}</div><div><b>Presenza</b><br>${s.pct}%</div><div><b>Convocazioni</b><br>${s.callups}</div><div><b>BLU / GIALLA</b><br>${s.blu} / ${s.gialla}</div></div><h2>Storico presenze</h2><table><thead><tr><th>Data</th><th>Attività</th><th>Stato</th></tr></thead><tbody>${at||'<tr><td colspan="3">Nessun dato</td></tr>'}</tbody></table><h2>Storico convocazioni</h2><table><thead><tr><th>Data</th><th>Gara</th><th>Squadra</th></tr></thead><tbody>${cu||'<tr><td colspan="3">Nessun dato</td></tr>'}</tbody></table><p>Documento gestionale interno. Nessun risultato, classifica o valutazione competitiva.</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
  };

  window.addEventListener('osgb-auth-ready',e=>{client=e.detail?.client||null;});
})();
