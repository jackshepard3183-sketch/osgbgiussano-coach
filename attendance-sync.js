(function(){
  let client=null,user=null,eventId=null,currentDate=new Date().toISOString().slice(0,10),ready=false;
  const waitRoster=()=>new Promise(resolve=>{let n=0;const t=setInterval(()=>{n++;if(P.length&&typeof P[0]?.id==='string'&&P[0].id.includes('-')){clearInterval(t);resolve()}else if(n>50){clearInterval(t);resolve()}},100)});
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=d=>{const [y,m,day]=d.split('-');return `${day}/${m}/${y}`};

  async function ensureEvent(date){
    const {data:found,error}=await client.from('events').select('id').eq('owner_user_id',user.id).eq('event_date',date).eq('event_type','Allenamento').order('created_at',{ascending:true}).limit(1);
    if(error)throw error;
    if(found?.length)return found[0].id;
    const {data:created,error:ce}=await client.from('events').insert({owner_user_id:user.id,event_date:date,event_type:'Allenamento',title:'Allenamento'}).select('id').single();
    if(ce)throw ce;
    return created.id;
  }

  async function loadAttendance(date){
    currentDate=date||currentDate;
    eventId=await ensureEvent(currentDate);
    const {data,error}=await client.from('attendance').select('player_id,status').eq('event_id',eventId);
    if(error)throw error;
    S.pres={};
    (data||[]).forEach(r=>S.pres[r.player_id]=r.status);
    ready=true;
    if(S.r==='pres')render();
  }

  window.setPres=async function(id,v){
    if(!client||!user||!eventId)return;
    const old=S.pres[id];S.pres[id]=v;render();
    const {error}=await client.from('attendance').upsert({owner_user_id:user.id,event_id:eventId,player_id:id,status:v,updated_at:new Date().toISOString()},{onConflict:'event_id,player_id'});
    if(error){if(old===undefined)delete S.pres[id];else S.pres[id]=old;render();alert('Impossibile salvare la presenza. Riprova.');}
  };

  window.setAttendanceDate=async function(v){
    if(!v)return;
    try{ready=false;currentDate=v;render();await loadAttendance(v);}catch(e){alert('Errore nel caricamento delle presenze.');}
  };

  window.markAllPresent=async function(){
    if(!client||!user||!eventId)return;
    const rows=P.map(p=>({owner_user_id:user.id,event_id:eventId,player_id:p.id,status:'p',updated_at:new Date().toISOString()}));
    const {error}=await client.from('attendance').upsert(rows,{onConflict:'event_id,player_id'});
    if(error){alert('Impossibile salvare le presenze.');return}
    rows.forEach(r=>S.pres[r.player_id]='p');render();
  };

  window.pres=function(){
    let c={p:0,a:0,l:0,u:0};Object.values(S.pres||{}).forEach(x=>{if(c[x]!==undefined)c[x]++});
    const total=P.length;
    return `${ttl('Presenze',`Allenamento · ${fmt(currentDate)}`)}<div class="card"><div class="field"><label>Data allenamento</label><input type="date" value="${currentDate}" onchange="setAttendanceDate(this.value)"></div><div class="row" style="margin-top:10px"><button class="btn alt" onclick="markAllPresent()"><i data-lucide="check-check"></i>Tutti presenti</button></div><p class="muted" style="margin-top:10px">${ready?'Salvataggio automatico su Supabase.':'Caricamento presenze…'}</p></div><div class="grid g4"><div class="card"><b>Presenti</b><div class="kpi">${c.p}</div></div><div class="card"><b>Assenti</b><div class="kpi">${c.a}</div></div><div class="card"><b>Ritardo</b><div class="kpi">${c.l}</div></div><div class="card"><b>Indisponibili</b><div class="kpi">${c.u}</div></div></div><div class="section">GIOCATORI · ${total}</div>${P.map((p,i)=>`<div class="player"><div class="av">${p.seq||i+1}</div><div class="meta"><b>${esc(p.n)}</b><br><small>${S.pres[p.id]?'Stato registrato':'Da registrare'}</small></div>${[['p','check'],['a','x'],['l','clock-3'],['u','minus']].map(x=>`<button class="sbtn ${S.pres[p.id]===x[0]?'on':''}" onclick='setPres(${JSON.stringify(String(p.id))},${JSON.stringify(x[0])})'><i data-lucide="${x[1]}"></i></button>`).join('')}</div>`).join('')}`;
  };

  window.addEventListener('osgb-auth-ready',async e=>{
    client=e.detail?.client;if(!client)return;
    const {data}=await client.auth.getUser();user=data?.user;if(!user)return;
    await waitRoster();
    try{await loadAttendance(currentDate);}catch(_){ready=false;}
  });
})();
