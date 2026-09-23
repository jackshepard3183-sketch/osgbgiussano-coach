(function(){
  let client=null,user=null;
  let syncPromise=null;
  const HUB_URL='https://campi-spogliatoi.lovable.app/api/coach-2020-friendlies';
  const DB_TYPES=['league','friendly','tournament'];
  const TO_DB={Campionato:'league',Amichevole:'friendly',Torneo:'tournament',Allenamento:'training',league:'league',friendly:'friendly',tournament:'tournament',training:'training'};
  const TO_LABEL={league:'Campionato',friendly:'Amichevole',tournament:'Torneo',training:'Allenamento'};
  const hh=v=>v?String(v).slice(0,5):'';
  const dd=d=>String(new Date(d+'T12:00:00').getDate()).padStart(2,'0');
  async function loadEvents(){
    if(!client)return;
    const {data,error}=await client.from('events').select('id,event_date,start_time,meeting_time,title,event_type,team_color,opponent,home_away,venue,address,notes,post_match_notes,observations,external_source,external_id').in('event_type',DB_TYPES).or('external_active.is.null,external_active.eq.true').order('event_date',{ascending:true}).order('start_time',{ascending:true});
    if(error){console.error(error);return;}
    S.events=(data||[]).map(r=>({id:r.id,d:dd(r.event_date),date:r.event_date,time:hh(r.start_time),meet:hh(r.meeting_time),t:r.title,team:r.team_color||'ALL',place:r.venue||'',addr:r.address||'',type:TO_LABEL[r.event_type]||r.event_type,opponent:r.opponent||'',homeAway:r.home_away||'',notes:r.notes||'',postMatchNotes:r.post_match_notes||'',observations:r.observations||{},externalSource:r.external_source||'',externalId:r.external_id||''}));
    if(S.events.length&&!S.events.some(e=>e.id===S.match))S.match=S.events[0].id;
    render();
  }
  window.osgbCreateEvent=async function(payload){
    if(!client||!user)throw new Error('Sessione non valida');
    const row={...payload,owner_user_id:user.id,event_type:TO_DB[payload.event_type]||payload.event_type};
    const {data,error}=await client.from('events').insert(row).select('id').single();
    if(error)throw error;
    await loadEvents();
    return data;
  };
  function notify(detail){window.dispatchEvent(new CustomEvent('osgb-hub-sync-status',{detail}));}
  window.syncCampiFriendlies=function(options={}){
    if(syncPromise)return syncPromise;
    syncPromise=(async()=>{
      if(!client||!user)throw new Error('Accedi prima di sincronizzare il calendario.');
      notify({state:'loading',message:'Sincronizzazione in corso…'});
      try{
        const response=await fetch(HUB_URL,{headers:{Accept:'application/json'},cache:'no-store'});
        if(!response.ok)throw new Error(`HUB non disponibile (${response.status})`);
        const payload=await response.json();
        const sourceEvents=Array.isArray(payload?.events)?payload.events:[];
        const valid=sourceEvents.filter(OSGBHubSync.isValidEvent);
        const rows=valid.map(event=>OSGBHubSync.mapEvent(event,user.id));
        const {data:existing,error:existingError}=await client.from('events').select('id,external_id,event_date,external_active,external_locked').eq('external_source',OSGBHubSync.SOURCE);
        if(existingError)throw existingError;
        const existingById=new Map((existing||[]).map(row=>[row.external_id,row]));
        const lockedIds=new Set((existing||[]).filter(row=>row.external_locked).map(row=>row.external_id));
        const syncRows=rows.filter(row=>!lockedIds.has(row.external_id));
        if(syncRows.length){
          const {error}=await client.from('events').upsert(syncRows,{onConflict:'owner_user_id,external_source,external_id'});
          if(error)throw error;
        }
        const sourceIds=new Set(rows.map(row=>row.external_id));
        const missing=(existing||[]).filter(row=>!row.external_locked&&row.external_id&&!sourceIds.has(row.external_id)&&row.event_date>='2026-09-10');
        if(missing.length){
          const {error}=await client.from('events').update({external_active:false,updated_at:new Date().toISOString()}).in('id',missing.map(row=>row.id));
          if(error)throw error;
        }
        const created=rows.filter(row=>!existingById.has(row.external_id)).length;
        const active=rows.filter(row=>row.external_active).length;
        const hidden=rows.length-active+missing.length;
        const preserved=lockedIds.size;
        const message=`Sincronizzazione completata: ${active} amichevoli attive${created?`, ${created} nuove`:''}${preserved?`, ${preserved} modificate manualmente`:''}${hidden?`, ${hidden} annullate/rimosse`:''}.`;
        notify({state:'success',message,created,active,hidden,preserved});
        await loadEvents();
        return {created,active,hidden};
      }catch(error){
        console.error(error);
        notify({state:'error',message:error?.message||'Sincronizzazione non riuscita.'});
        if(!options.silent)throw error;
        return null;
      }finally{syncPromise=null;}
    })();
    return syncPromise;
  };
  window.addEventListener('osgb-auth-ready',async e=>{
    client=e.detail?.client;if(!client)return;
    const {data}=await client.auth.getUser();user=data?.user||null;
    if(user){const result=await window.syncCampiFriendlies({silent:true});if(result)return;}
    await loadEvents();
  });
  window.osgbReloadEvents=loadEvents;
})();
