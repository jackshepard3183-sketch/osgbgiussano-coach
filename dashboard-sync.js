(function(){
  let client=null;
  let dash={nextTraining:null,nextMatches:[],lastAttendance:null,weekTrainings:0,weekMinutes:0,rosterCount:0,rosterMissing:0,rosterLastSync:null};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const today=()=>new Date().toISOString().slice(0,10);
  const fmtDate=d=>{if(!d)return'—';const [y,m,day]=String(d).split('-');return `${day}/${m}/${y}`};
  const fmtDateTime=v=>{if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':d.toLocaleString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});};
  const hh=v=>v?String(v).slice(0,5):'';

  async function loadDashboard(){
    if(!client)return;
    const t=today();
    const start=new Date();start.setHours(0,0,0,0);const day=start.getDay()||7;start.setDate(start.getDate()-day+1);
    const end=new Date(start);end.setDate(end.getDate()+6);
    const sd=start.toISOString().slice(0,10),ed=end.toISOString().slice(0,10);

    const [{data:ev},{data:tr},{data:attEv},{data:players}]=await Promise.all([
      client.from('events').select('id,event_date,start_time,meeting_time,title,event_type,team_color,venue,address').gte('event_date',t).order('event_date',{ascending:true}).order('start_time',{ascending:true}).limit(12),
      client.from('training_sessions').select('session_date,duration_minutes,objective').gte('session_date',sd).lte('session_date',ed),
      client.from('events').select('id,event_date').eq('event_type','training').lte('event_date',t).order('event_date',{ascending:false}).limit(1),
      client.from('players').select('id,active,birth_year,source_missing,source_synced_at,source_last_seen_at').eq('birth_year',2020).eq('active',true)
    ]);

    const events=ev||[];
    dash.nextTraining=events.find(x=>x.event_type==='training')||null;
    dash.nextMatches=events.filter(x=>x.event_type!=='training').slice(0,2);
    dash.weekTrainings=(tr||[]).length;
    dash.weekMinutes=(tr||[]).reduce((n,x)=>n+(Number(x.duration_minutes)||0),0);
    dash.lastAttendance=null;

    const roster=players||[];
    dash.rosterCount=roster.length;
    dash.rosterMissing=roster.filter(x=>x.source_missing===true).length;
    const syncDates=roster.map(x=>x.source_last_seen_at||x.source_synced_at).filter(Boolean).map(v=>new Date(v)).filter(d=>!Number.isNaN(d.getTime()));
    dash.rosterLastSync=syncDates.length?new Date(Math.max(...syncDates.map(d=>d.getTime()))).toISOString():null;

    if(attEv?.length){
      const e=attEv[0];
      const {data:a}=await client.from('attendance').select('status').eq('event_id',e.id);
      const rows=a||[];
      const present=rows.filter(x=>x.status==='present'||x.status==='late').length;
      dash.lastAttendance={date:e.event_date,present,total:P.length};
    }
    if(S.r==='home')render();
  }

  function matchCard(e){
    if(!e)return `<div class="card"><div class="muted">PROSSIMA GARA</div><h3>Nessuna gara inserita</h3><p class="muted">Aggiungila dal Calendario.</p></div>`;
    return `<div class="card ${e.team_color==='GIALLA'?'yellow':''}"><span class="pill ${e.team_color==='GIALLA'?'yellow':''}">${esc(e.team_color||'GARA')}</span><h3>${esc(e.title)}</h3><p class="muted">${fmtDate(e.event_date)}${e.start_time?' · '+hh(e.start_time):''}${e.venue?' · '+esc(e.venue):''}</p><button class="btn alt" onclick='openMatch(${JSON.stringify(String(e.id))})'>Apri gara</button></div>`;
  }

  function rosterCard(){
    const warn=dash.rosterMissing>0;
    const cls=warn?'card yellow':'card';
    const title=warn?`${dash.rosterMissing} da verificare`:'Rosa allineata';
    const detail=dash.rosterLastSync?`Ultimo controllo: ${fmtDateTime(dash.rosterLastSync)}`:'Nessuna sincronizzazione registrata';
    return `<div class="${cls}"><div class="muted">STATO ROSA 2020</div><div class="kpi">${dash.rosterCount}</div><h3>${title}</h3><p class="muted">${detail}</p><button class="btn ${warn?'':'alt'}" onclick="openRosterSync()"><i data-lucide="refresh-cw"></i>Sincronizza bambini</button></div>`;
  }

  window.home=function(){
    const nt=dash.nextTraining;
    const a=dash.lastAttendance;
    const s=window.osgbSeasonStats||{trainings:0,matches:0,blu:0,gialla:0,minutes:0,attendanceAvg:null};
    const attText=a?`${a.present}/${a.total}`:'—';
    const attPct=a&&a.total?Math.round(a.present/a.total*100):0;
    return `${ttl('Dashboard','OSGB Giussano · Scuola Calcio 2020')}
      <div class="grid g4">
        <div class="card blue"><div class="muted">PROSSIMO ALLENAMENTO</div><div class="kpi">${nt?fmtDate(nt.event_date):'—'}</div><p>${nt?(hh(nt.start_time)||'Orario da definire')+(nt.venue?' · '+esc(nt.venue):''):'Nessun allenamento programmato'}</p></div>
        ${matchCard(dash.nextMatches[0])}
        ${matchCard(dash.nextMatches[1])}
        <div class="card"><div class="muted">ULTIME PRESENZE</div><div class="kpi">${attText}</div><p class="muted">${a?`${attPct}% · ${fmtDate(a.date)}`:'Nessuna presenza registrata'}</p></div>
      </div>
      <div class="section">ROSA</div>
      <div class="grid g2">${rosterCard()}<div class="card"><div class="muted">CONTROLLO AUTOMATICO</div><div class="kpi">ATTIVO</div><p class="muted">Il controllo giornaliero segnala nuovi iscritti o differenze rilevanti.</p><button class="btn alt" onclick="go('team')"><i data-lucide="users-round"></i>Apri squadra</button></div></div>
      <div class="section">SETTIMANA CORRENTE</div>
      <div class="grid g2"><div class="card"><b>Sedute salvate</b><div class="kpi">${dash.weekTrainings}</div></div><div class="card"><b>Minuti programmati</b><div class="kpi">${dash.weekMinutes}</div></div></div>
      <div class="section">STAGIONE 2026/2027</div>
      <div class="grid g4"><div class="card"><b>Allenamenti</b><div class="kpi">${s.trainings}</div><p class="muted">${s.minutes} min programmati</p></div><div class="card"><b>Gare totali</b><div class="kpi">${s.matches}</div></div><div class="card"><b>BLU / GIALLA</b><div class="kpi">${s.blu}/${s.gialla}</div></div><div class="card"><b>Presenza media</b><div class="kpi">${s.attendanceAvg==null?'—':s.attendanceAvg+'%'}</div></div></div>
      <div class="section">AZIONI RAPIDE</div>
      <div class="quick"><button onclick="go('pres')"><span class="qi"><i data-lucide="clipboard-check"></i></span>Segna presenze</button><button onclick="trainingWizard()"><span class="qi"><i data-lucide="sparkles"></i></span>Crea allenamento</button><button onclick="newMatch()"><span class="qi"><i data-lucide="calendar-plus"></i></span>Nuova partita</button><button onclick="messages()"><span class="qi"><i data-lucide="message-circle"></i></span>Messaggi WhatsApp</button></div>`;
  };

  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client;if(client)await loadDashboard();});
  window.addEventListener('osgb-exercises-updated',()=>{if(S.r==='home')render();});
  window.addEventListener('osgb-roster-updated',()=>{loadDashboard();});
  window.osgbReloadDashboard=loadDashboard;
})();