(function(){
  let client=null,user=null;
  const TYPES=['Campionato','Amichevole','Torneo'];
  const hh=v=>v?String(v).slice(0,5):'';
  const dd=d=>String(new Date(d+'T12:00:00').getDate()).padStart(2,'0');
  async function loadEvents(){
    if(!client)return;
    const {data,error}=await client.from('events').select('id,event_date,start_time,meeting_time,title,event_type,team_color,opponent,home_away,venue,address,notes').in('event_type',TYPES).order('event_date',{ascending:true}).order('start_time',{ascending:true});
    if(error){console.error(error);return;}
    S.events=(data||[]).map(r=>({id:r.id,d:dd(r.event_date),date:r.event_date,time:hh(r.start_time),meet:hh(r.meeting_time),t:r.title,team:r.team_color||'ALL',place:r.venue||'',addr:r.address||'',type:r.event_type,opponent:r.opponent||'',homeAway:r.home_away||'',notes:r.notes||''}));
    if(S.events.length&&!S.events.some(e=>e.id===S.match))S.match=S.events[0].id;
    render();
  }
  window.osgbCreateEvent=async function(payload){
    if(!client||!user)throw new Error('Sessione non valida');
    const row={...payload,owner_user_id:user.id};
    const {data,error}=await client.from('events').insert(row).select('id').single();
    if(error)throw error;
    await loadEvents();
    return data;
  };
  window.addEventListener('osgb-auth-ready',async e=>{
    client=e.detail?.client;if(!client)return;
    const {data}=await client.auth.getUser();user=data?.user||null;
    await loadEvents();
  });
  window.osgbReloadEvents=loadEvents;
})();
