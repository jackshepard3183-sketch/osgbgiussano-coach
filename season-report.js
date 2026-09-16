(function(){
  let client=null;
  const START='2026-09-10',END='2027-06-30';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const csv=s=>`"${String(s??'').replace(/"/g,'""')}"`;
  const expLabel=v=>({first_year:'Primo anno',second_year:'Secondo anno',third_year:'Terzo anno'}[v]||'Da definire');
  const devLabel=v=>({initial:'Iniziale',growing:'In crescita',consolidated:'Consolidato'}[v]||'Da definire');

  async function loadReportData(){
    if(!client)throw new Error('Client non disponibile');
    const [{data:players,error:pe},{data:events,error:ee},{data:attendance,error:ae},{data:callups,error:ce},{data:sessions,error:se}]=await Promise.all([
      client.from('players').select('id,first_name,last_name,birth_year,active,experience_level,development_level').eq('birth_year',2020).eq('active',true).order('last_name'),
      client.from('events').select('id,event_date,event_type,team_color').gte('event_date',START).lte('event_date',END),
      client.from('attendance').select('player_id,status,event_id,events!inner(event_date)').gte('events.event_date',START).lte('events.event_date',END),
      client.from('callups').select('player_id,team_color,event_id,events!inner(event_date)').gte('events.event_date',START).lte('events.event_date',END),
      client.from('training_sessions').select('duration_minutes,session_date,is_template').eq('is_template',false).gte('session_date',START).lte('session_date',END)
    ]);
    const err=pe||ee||ae||ce||se;if(err)throw err;
    const pRows=players||[],aRows=attendance||[],cRows=callups||[],ev=events||[],tr=sessions||[];
    const games=ev.filter(x=>x.event_type!=='training');
    const trainingDates=new Set(ev.filter(x=>x.event_type==='training'&&x.event_date).map(x=>String(x.event_date)));
    const team={
      players:pRows.length,
      trainings:trainingDates.size,
      sessions:tr.length,
      minutes:tr.reduce((n,x)=>n+(Number(x.duration_minutes)||0),0),
      matches:games.length,
      blu:games.filter(x=>x.team_color==='BLU').length,
      gialla:games.filter(x=>x.team_color==='GIALLA').length
    };
    const rows=pRows.map(p=>{
      const at=aRows.filter(x=>String(x.player_id)===String(p.id));
      const present=at.filter(x=>x.status==='present'||x.status==='late').length;
      const absent=at.filter(x=>x.status==='absent').length;
      const late=at.filter(x=>x.status==='late').length;
      const unavailable=at.filter(x=>x.status==='unavailable').length;
      const total=at.length;
      const pct=total?Math.round(present/total*100):0;
      const cu=cRows.filter(x=>String(x.player_id)===String(p.id));
      return {id:p.id,name:`${p.last_name||''} ${p.first_name||''}`.trim(),experience:expLabel(p.experience_level),development:devLabel(p.development_level),present,absent,late,unavailable,total,pct,callups:cu.length,blu:cu.filter(x=>x.team_color==='BLU').length,gialla:cu.filter(x=>x.team_color==='GIALLA').length};
    });
    return {team,rows};
  }

  function reportHtml(data){
    const t=data.team;
    const body=data.rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.experience)}</td><td>${esc(r.development)}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.late}</td><td>${r.pct}%</td><td>${r.callups}</td><td>${r.blu}</td><td>${r.gialla}</td></tr>`).join('');
    return `<div class="mh"><h3>REPORT STAGIONE 2026/2027</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">Riepilogo gestionale della Scuola Calcio 2020. Nessun risultato o classifica individuale.</p>
      <div class="grid g4"><div class="card"><b>Bambini</b><div class="kpi">${t.players}</div></div><div class="card"><b>Allenamenti</b><div class="kpi">${t.sessions}</div><p class="muted">${t.minutes} min</p></div><div class="card"><b>Gare</b><div class="kpi">${t.matches}</div></div><div class="card"><b>BLU / GIALLA</b><div class="kpi">${t.blu}/${t.gialla}</div></div></div>
      <div class="row" style="margin:12px 0"><button class="btn" onclick="exportSeasonCSV()"><i data-lucide="sheet"></i>Esporta CSV</button><button class="btn alt" onclick="printSeasonReport()"><i data-lucide="printer"></i>Stampa / PDF</button></div>
      <div style="overflow:auto"><table><thead><tr><th>Bambino</th><th>Esperienza</th><th>Sviluppo</th><th>Pres.</th><th>Ass.</th><th>Rit.</th><th>%</th><th>Conv.</th><th>BLU</th><th>GIALLA</th></tr></thead><tbody>${body}</tbody></table></div>`;
  }

  window.openSeasonReport=async function(){
    modal(`<div class="mh"><h3>REPORT STAGIONE</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Caricamento dati…</p>`);
    try{window.__osgbSeasonReport=await loadReportData();modal(reportHtml(window.__osgbSeasonReport));}catch(e){console.error(e);modal(`<div class="mh"><h3>REPORT STAGIONE</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Impossibile caricare il report.</p>`);}
  };

  window.exportSeasonCSV=function(){
    const d=window.__osgbSeasonReport;if(!d)return;
    const lines=[['Bambino','Esperienza','Sviluppo','Presenze','Assenze','Ritardi','Indisponibile','Percentuale','Convocazioni','BLU','GIALLA'].map(csv).join(';')];
    d.rows.forEach(r=>lines.push([r.name,r.experience,r.development,r.present,r.absent,r.late,r.unavailable,r.pct+'%',r.callups,r.blu,r.gialla].map(csv).join(';')));
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='OSGB_Coach_2020_Report_2026-2027.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  };

  window.printSeasonReport=function(){
    const d=window.__osgbSeasonReport;if(!d)return;const t=d.team;
    const rows=d.rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.experience)}</td><td>${esc(r.development)}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.late}</td><td>${r.pct}%</td><td>${r.callups}</td><td>${r.blu}</td><td>${r.gialla}</td></tr>`).join('');
    const w=window.open('','_blank');if(!w)return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Report OSGB Coach 2020</title><style>body{font-family:Arial,sans-serif;color:#17223b;padding:24px;font-size:12px}h1{font-size:22px;margin:0 0 4px}p{margin:3px 0 14px}.sum{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.sum div{border:1px solid #ccd4e2;border-radius:8px;padding:10px 14px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #d8dee9;padding:6px;text-align:left}th{background:#f2f5fa}@media print{body{padding:0}}</style></head><body><h1>OSGB Giussano · Scuola Calcio 2020</h1><p>Report stagione 2026/2027</p><div class="sum"><div><b>Bambini</b><br>${t.players}</div><div><b>Allenamenti</b><br>${t.sessions}</div><div><b>Minuti</b><br>${t.minutes}</div><div><b>Gare</b><br>${t.matches}</div><div><b>BLU / GIALLA</b><br>${t.blu} / ${t.gialla}</div></div><table><thead><tr><th>Bambino</th><th>Esperienza</th><th>Sviluppo</th><th>Pres.</th><th>Ass.</th><th>Rit.</th><th>%</th><th>Conv.</th><th>BLU</th><th>GIALLA</th></tr></thead><tbody>${rows}</tbody></table><p style="margin-top:14px">Documento gestionale interno. Nessuna classifica o valutazione competitiva.</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
  };

  window.addEventListener('osgb-auth-ready',e=>{client=e.detail?.client||null;});
})();