(function(){
  let client=null,user=null,eventId=null,currentDate=defaultTrainingDate(),ready=false,attendanceMode='training',history=[];
  const waitRoster=()=>new Promise(resolve=>{let n=0;const t=setInterval(()=>{n++;if(P.length&&typeof P[0]?.id==='string'&&P[0].id.includes('-')){clearInterval(t);resolve()}else if(n>50){clearInterval(t);resolve()}},100)});
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=d=>{const [y,m,day]=d.split('-');return `${day}/${m}/${y}`};
  const TO_DB={p:'present',a:'absent',l:'late',u:'unavailable'};
  const TO_UI={present:'p',absent:'a',late:'l',unavailable:'u'};

  function isoLocal(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
  function defaultTrainingDate(){
    const d=new Date();d.setHours(12,0,0,0);
    const day=d.getDay();
    if(day===2||day===4)return isoLocal(d);
    while(d.getDay()!==2&&d.getDay()!==4)d.setDate(d.getDate()-1);
    return isoLocal(d);
  }
  function isStandardTrainingDay(date){const d=new Date(date+'T12:00:00');return d.getDay()===2||d.getDay()===4;}
  function isMatchDay(date){const d=new Date(date+'T12:00:00');return d.getDay()===0||d.getDay()===6;}
  function dayLabel(date){return new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));}
  function allowedDay(date,mode=attendanceMode){return mode==='training'?isStandardTrainingDay(date):isMatchDay(date);}
  function nearestAllowedDate(from,mode,direction=0){
    const d=new Date((from||isoLocal(new Date()))+'T12:00:00');
    if(direction)d.setDate(d.getDate()+direction);
    while(!allowedDay(isoLocal(d),mode))d.setDate(d.getDate()+(direction<0?-1:1));
    return isoLocal(d);
  }
  function relevantDates(mode){
    const center=new Date(currentDate+'T12:00:00'),start=new Date(center),end=new Date(center),out=[];
    start.setDate(start.getDate()-84);end.setDate(end.getDate()+112);
    for(const d=new Date(start);d<=end;d.setDate(d.getDate()+1))if(allowedDay(isoLocal(d),mode))out.push(isoLocal(d));
    return out;
  }

  async function refreshDerived(){
    await loadHistory();
    if(typeof window.osgbReloadPlayerStats==='function')await window.osgbReloadPlayerStats();
    if(typeof window.osgbReloadSeasonStats==='function')await window.osgbReloadSeasonStats();
    if(typeof window.osgbReloadDashboard==='function')await window.osgbReloadDashboard();
  }

  async function loadHistory(){
    if(!client||!user)return;
    const {data,error}=await client.from('events').select('id,event_date,title,event_type,start_time,attendance(status)').eq('owner_user_id',user.id).lte('event_date',isoLocal(new Date())).order('event_date',{ascending:false}).limit(80);
    if(error){console.warn('attendance history',error);return;}
    history=(data||[]).filter(e=>e.event_type==='training'||isMatchDay(e.event_date)).map(e=>{
      const rows=e.attendance||[],counts={present:0,absent:0,late:0,unavailable:0};rows.forEach(r=>{if(counts[r.status]!==undefined)counts[r.status]++;});
      return {...e,counts,total:rows.length};
    });
  }

  async function findEvent(date,mode=attendanceMode){
    let query=client.from('events').select('id,event_type,title,start_time').eq('owner_user_id',user.id).eq('event_date',date);
    query=mode==='training'?query.eq('event_type','training'):query.neq('event_type','training');
    const {data,error}=await query.order('created_at',{ascending:true}).limit(1);
    if(error)throw error;
    return data?.[0]||null;
  }

  async function ensureEvent(date){
    const existing=await findEvent(date,'training');if(existing)return existing.id;
    const {data:created,error}=await client.from('events').insert({owner_user_id:user.id,event_date:date,event_type:'training',title:'Allenamento',start_time:'18:00'}).select('id').single();
    if(!error&&created?.id)return created.id;
    if(error?.code==='23505'){
      const concurrent=await findEvent(date,'training');
      if(concurrent)return concurrent.id;
    }
    throw error||new Error('Impossibile creare allenamento');
  }

  async function loadAttendance(date){
    currentDate=date||currentDate;
    const event=await findEvent(currentDate,attendanceMode);
    eventId=event?.id||null;
    S.pres={};
    if(eventId){
      const {data,error}=await client.from('attendance').select('player_id,status').eq('event_id',eventId);
      if(error)throw error;
      (data||[]).forEach(r=>S.pres[r.player_id]=TO_UI[r.status]||r.status);
    }
    ready=true;
    if(S.r==='pres')render();
  }

  window.setPres=async function(id,v){
    if(!client||!user)return;
    if(!eventId&&attendanceMode==='match'){alert('Prima inserisci la partita nel Calendario.');return;}
    if(!eventId)eventId=await ensureEvent(currentDate);
    const old=S.pres[id];S.pres[id]=v;render();
    const {error}=await client.from('attendance').upsert({owner_user_id:user.id,event_id:eventId,player_id:id,status:TO_DB[v]||v,updated_at:new Date().toISOString()},{onConflict:'event_id,player_id'});
    if(error){if(old===undefined)delete S.pres[id];else S.pres[id]=old;render();alert('Impossibile salvare la presenza. Riprova.');return;}
    await refreshDerived();
  };

  window.setAttendanceDate=async function(v){
    if(!v)return;
    try{ready=false;currentDate=v;render();await loadAttendance(v);}catch(e){alert('Errore nel caricamento delle presenze.');}
  };

  window.setAttendanceMode=async function(mode){
    if(mode!=='training'&&mode!=='match')return;
    attendanceMode=mode;currentDate=nearestAllowedDate(isoLocal(new Date()),mode,0);ready=false;render();
    try{await loadAttendance(currentDate);}catch(e){alert('Errore nel caricamento delle presenze.');}
  };

  window.moveAttendanceDate=function(direction){
    setAttendanceDate(nearestAllowedDate(currentDate,attendanceMode,direction<0?-1:1));
  };

  window.openAttendanceHistory=async function(date,type){
    attendanceMode=type==='training'?'training':'match';currentDate=date;ready=false;render();
    try{await loadAttendance(date);}catch(e){alert('Errore nel caricamento del dettaglio presenze.');}
  };

  window.markAllPresent=async function(){
    if(!client||!user)return;
    if(!eventId&&attendanceMode==='match'){alert('Prima inserisci la partita nel Calendario.');return;}
    if(!eventId)eventId=await ensureEvent(currentDate);
    const rows=P.map(p=>({owner_user_id:user.id,event_id:eventId,player_id:p.id,status:'present',updated_at:new Date().toISOString()}));
    const {error}=await client.from('attendance').upsert(rows,{onConflict:'event_id,player_id'});
    if(error){alert('Impossibile salvare le presenze.');return}
    rows.forEach(r=>S.pres[r.player_id]='p');render();await refreshDerived();
  };

  window.pres=function(){
    let c={p:0,a:0,l:0,u:0};Object.values(S.pres||{}).forEach(x=>{if(c[x]!==undefined)c[x]++});
    const total=P.length;
    const dates=relevantDates(attendanceMode),kind=attendanceMode==='training'?'Allenamento':'Partita';
    const options=dates.map(d=>`<option value="${d}" ${d===currentDate?'selected':''}>${esc(dayLabel(d))}</option>`).join('');
    const message=attendanceMode==='match'&&!eventId?'Nessuna partita programmata in questa data: inseriscila prima nel Calendario.':eventId?'Salvataggio automatico su Supabase.':'Nessuna presenza ancora registrata per questa data.';
    const players=P.map((p,i)=>`<div class="player"><div class="av">${p.seq||i+1}</div><div class="meta"><b>${esc(p.n)}</b><br><small>${S.pres[p.id]?'Stato registrato':'Da registrare'}</small></div>${[['p','check'],['a','x'],['l','clock-3'],['u','minus']].map(x=>`<button class="sbtn ${S.pres[p.id]===x[0]?'on':''}" onclick='setPres(${JSON.stringify(String(p.id))},${JSON.stringify(x[0])})'><i data-lucide="${x[1]}"></i></button>`).join('')}</div>`).join('');
    const historyList=history.length?history.map(h=>`<button class="attendance-history-item" onclick='openAttendanceHistory(${JSON.stringify(h.event_date)},${JSON.stringify(h.event_type)})'><span class="attendance-history-icon ${h.event_type==='training'?'training':'match'}"><i data-lucide="${h.event_type==='training'?'dumbbell':'trophy'}"></i></span><span class="attendance-history-main"><b>${esc(h.title||(h.event_type==='training'?'Allenamento':'Partita'))}</b><small>${esc(dayLabel(h.event_date))}</small></span><span class="attendance-history-recap"><b>${h.counts.present+h.counts.late}/${h.total||P.length}</b><small>presenti</small></span><i data-lucide="chevron-right"></i></button>`).join(''):'<p class="muted">Nessuna attività svolta ancora disponibile.</p>';
    return `${ttl('Presenze',`${kind} · ${fmt(currentDate)}${attendanceMode==='training'?' · 18:00–19:30':''}`)}<div class="card"><div class="tabs attendance-tabs"><button class="tab ${attendanceMode==='training'?'on':''}" onclick="setAttendanceMode('training')"><i data-lucide="dumbbell"></i>Allenamenti · mar/gio</button><button class="tab ${attendanceMode==='match'?'on':''}" onclick="setAttendanceMode('match')"><i data-lucide="trophy"></i>Partite · sab/dom</button></div><div class="attendance-date-row"><button class="sbtn" onclick="moveAttendanceDate(-1)" title="Giorno utile precedente"><i data-lucide="chevron-left"></i></button><div class="field attendance-date-field"><label>${kind}</label><select onchange="setAttendanceDate(this.value)">${options}</select></div><button class="sbtn" onclick="moveAttendanceDate(1)" title="Giorno utile successivo"><i data-lucide="chevron-right"></i></button></div><div class="attendance-day-badge ${attendanceMode}"><i data-lucide="${attendanceMode==='training'?'calendar-check':'calendar-days'}"></i>${esc(dayLabel(currentDate))}</div><div class="row" style="margin-top:10px"><button class="btn alt" onclick="markAllPresent()" ${attendanceMode==='match'&&!eventId?'disabled':''}><i data-lucide="check-check"></i>Tutti presenti</button></div><p class="muted" style="margin-top:10px">${ready?message:'Caricamento presenze…'}</p></div><div class="grid g4"><div class="card"><b>Presenti</b><div class="kpi">${c.p}</div></div><div class="card"><b>Assenti</b><div class="kpi">${c.a}</div></div><div class="card"><b>Ritardo</b><div class="kpi">${c.l}</div></div><div class="card"><b>Indisponibili</b><div class="kpi">${c.u}</div></div></div><div class="section">GIOCATORI · ${total}</div>${players}<div class="section">ATTIVITÀ SVOLTE</div><div class="card attendance-history">${historyList}</div>`;
  };

  window.addEventListener('osgb-auth-ready',async e=>{
    client=e.detail?.client;if(!client)return;
    const {data}=await client.auth.getUser();user=data?.user;if(!user)return;
    await waitRoster();await loadHistory();try{await loadAttendance(currentDate);}catch(_){ready=false;}
  });
})();
