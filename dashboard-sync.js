(function(){
  let client=null;
  let dash={nextTraining:null,nextMatches:[],lastAttendance:null,weekTrainings:0,weekMinutes:0};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const today=()=>new Date().toISOString().slice(0,10);
  const fmtDate=d=>{if(!d)return'—';const [y,m,day]=String(d).split('-');return `${day}/${m}/${y}`};
  const hh=v=>v?String(v).slice(0,5):'';

  async function loadDashboard(){
    if(!client)return;
    const t=today();
    const start=new Date();start.setHours(0,0,0,0);const day=start.getDay()||7;start.setDate(start.getDate()-day+1);
    const end=new Date(start);end.setDate(end.getDate()+6);
    const sd=start.toISOString().slice(0,10),ed=end.toISOString().slice(0,10);

    const [{data:ev},{data:tr},{data:attEv}]=await Promise.all([
      client.from('events').select('id,event_date,start_time,meeting_time,title,event_type,team_color,venue,address').gte('event_date',t).order('event_date',{ascending:true}).order('start_time',{ascending:true}).limit(12),
      client.from('training_sessions').select('session_date,duration_minutes,objective').gte('session_date',sd).lte('session_date',ed),
      client.from('events').select('id,event_date').eq('event_type','training').lte('event_date',t).order('event_date',{ascending:false}).limit(1)
    ]);

    const events=ev||[];
    dash.nextTraining=events.find(x=>x.event_type==='training')||null;
    dash.nextMatches=events.filter(x=>x.event_type!=='training').slice(0,2);
    dash.weekTrainings=(tr||[]).length;
    dash.weekMinutes=(tr||[]).reduce((n,x)=>n+(Number(x.duration_minutes)||0),0);
    dash.lastAttendance=null;

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

  window.home=function(){
    const nt=dash.nextTraining;
    const a=dash.lastAttendance;
    const s=window.osgbSeasonStats||{trainings:0,matches:0,blu:0,gialla:0,minutes:0,attendanceAvg:null,played:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0};
    const attText=a?`${a.present}/${a.total}`:'—';
    const attPct=a&&a.total?Math.round(a.present/a.total*100):0;
    return `${ttl('Dashboard','OSGB Giussano · Scuola Calcio 2020')}
      <div class="grid g4">
        <div class="card blue"><div class="muted">PROSSIMO ALLENAMENTO</div><div class="kpi">${nt?fmtDate(nt.event_date):'—'}</div><p>${nt?(hh(nt.start_time)||'Orario da definire')+(nt.venue?' · '+esc(nt.venue):''):'Nessun allenamento programmato'}</p></div>
        ${matchCard(dash.nextMatches[0])}
        ${matchCard(dash.nextMatches[1])}
        <div class="card"><div class="muted">ULTIME PRESENZE</div><div class="kpi">${attText}</div><p class="muted">${a?`${attPct}% · ${fmtDate(a.date)}`:'Nessuna presenza registrata'}</p></div>
      </div>
      <div class="section">SETTIMANA CORRENTE</div>
      <div class="grid g2"><div class="card"><b>Sedute salvate</b><div class="kpi">${dash.weekTrainings}</div></div><div class="card"><b>Minuti programmati</b><div class="kpi">${dash.weekMinutes}</div></div></div>
      <div class="section">STAGIONE 2026/2027</div>
      <div class="grid g4"><div class="card"><b>Allenamenti</b><div class="kpi">${s.trainings}</div><p class="muted">${s.minutes} min programmati</p></div><div class="card"><b>Gare totali</b><div class="kpi">${s.matches}</div></div><div class="card"><b>BLU / GIALLA</b><div class="kpi">${s.blu}/${s.gialla}</div></div><div class="card"><b>Presenza media</b><div class="kpi">${s.attendanceAvg==null?'—':s.attendanceAvg+'%'}</div></div></div>
      <div class="section">RISULTATI STAGIONE</div>
      <div class="grid g4"><div class="card"><b>Gare con risultato</b><div class="kpi">${s.played}</div></div><div class="card"><b>V / N / P</b><div class="kpi">${s.wins}/${s.draws}/${s.losses}</div></div><div class="card"><b>Gol fatti</b><div class="kpi">${s.goalsFor}</div></div><div class="card"><b>Gol subiti</b><div class="kpi">${s.goalsAgainst}</div></div></div>
      <div class="section">AZIONI RAPIDE</div>
      <div class="quick"><button onclick="go('pres')"><span class="qi"><i data-lucide="clipboard-check"></i></span>Segna presenze</button><button onclick="trainingWizard()"><span class="qi"><i data-lucide="sparkles"></i></span>Crea allenamento</button><button onclick="newMatch()"><span class="qi"><i data-lucide="calendar-plus"></i></span>Nuova partita</button><button onclick="messages()"><span class="qi"><i data-lucide="message-circle"></i></span>Messaggi WhatsApp</button></div>`;
  };

  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client;if(client)await loadDashboard();});
  window.addEventListener('osgb-exercises-updated',()=>{if(S.r==='home')render();});
  window.osgbReloadDashboard=loadDashboard;
})();