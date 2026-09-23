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
  const SOURCE_FIELDS=[
    ['event_date','Data',v=>String(v||'')],
    ['start_time','Ora',v=>hh(v)],
    ['team_color','Squadra',v=>String(v||'')],
    ['opponent','Avversario',v=>String(v||'')],
    ['home_away','Casa/trasferta',v=>v==='away'?'Trasferta':v==='home'?'Casa':''],
    ['venue','Campo',v=>String(v||'')],
    ['address','Indirizzo',v=>String(v||'')],
    ['external_active','Stato',v=>v===false?'Annullata':'Attiva']
  ];
  function eventDiffs(current,incoming){
    return SOURCE_FIELDS.flatMap(([field,label,normalize])=>{
      const before=normalize(current?.[field]);
      const after=normalize(incoming?.[field]);
      return before===after?[]:[{field,label,before:before||'—',after:after||'—'}];
    });
  }
  function changePrompt(current,incoming,diffs){
    const title=incoming.title||current.title||incoming.opponent||'Amichevole';
    const lines=diffs.map(d=>`• ${d.label}: ${d.before} → ${d.after}`).join('\n');
    return `Campi e Spogliatoi contiene dati diversi per:\n\n${title}\n\n${lines}\n\nVuoi aggiornare questa partita nell'app OSGB Coach?`;
  }
  function missingPrompt(current){
    const title=current.title||current.opponent||'Amichevole';
    const date=current.event_date?new Date(current.event_date+'T12:00:00').toLocaleDateString('it-IT'):'';
    return `Questa partita non risulta più tra le amichevoli di Campi e Spogliatoi:\n\n${title}${date?' · '+date:''}\n\nVuoi rimuoverla dal calendario OSGB Coach?`;
  }
  async function updateFromHub(id,row){
    const payload={
      event_date:row.event_date,
      event_type:'friendly',
      title:row.title,
      start_time:row.start_time||'',
      meeting_time:'',
      team_color:row.team_color,
      opponent:row.opponent,
      home_away:row.home_away,
      venue:row.venue||'',
      address:row.address||'',
      notes:row.notes||''
    };
    const {error}=await client.rpc('coach_update_event',{p_event_id:id,p_data:payload});
    if(error)throw error;
    // I metadati della fonte non devono impedire l'aggiornamento visibile della gara.
    try{
      await client.from('events').update({
        external_updated_at:row.external_updated_at,
        external_active:row.external_active,
        updated_at:new Date().toISOString()
      }).eq('id',id);
    }catch(_){}
  }
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
        const {data:existing,error:existingError}=await client.from('events')
          .select('id,title,external_id,event_date,start_time,team_color,opponent,home_away,venue,address,notes,external_active,external_locked')
          .eq('external_source',OSGBHubSync.SOURCE);
        if(existingError)throw existingError;

        const existingById=new Map((existing||[]).map(row=>[row.external_id,row]));
        const sourceIds=new Set(rows.map(row=>row.external_id));
        let created=0,updated=0,skipped=0,removed=0,pending=0;

        const newRows=rows.filter(row=>!existingById.has(row.external_id));
        if(newRows.length){
          const {error}=await client.from('events').upsert(newRows,{onConflict:'owner_user_id,external_source,external_id'});
          if(error)throw error;
          created=newRows.length;
        }

        for(const row of rows){
          const current=existingById.get(row.external_id);
          if(!current)continue;
          const diffs=eventDiffs(current,row);
          if(!diffs.length)continue;
          if(options.silent){
            pending++;
            continue;
          }
          if(window.confirm(changePrompt(current,row,diffs))){
            await updateFromHub(current.id,row);
            updated++;
          }else{
            skipped++;
          }
        }

        const missing=(existing||[]).filter(row=>row.external_id&&!sourceIds.has(row.external_id)&&row.event_date>='2026-09-10'&&row.external_active!==false);
        for(const current of missing){
          if(options.silent){
            pending++;
            continue;
          }
          if(window.confirm(missingPrompt(current))){
            const {error}=await client.from('events').update({external_active:false,updated_at:new Date().toISOString()}).eq('id',current.id);
            if(error)throw error;
            removed++;
          }else{
            skipped++;
          }
        }

        const active=rows.filter(row=>row.external_active).length;
        const parts=[`Sincronizzazione completata: ${active} amichevoli dal gestionale`];
        if(created)parts.push(`${created} nuove`);
        if(updated)parts.push(`${updated} aggiornate`);
        if(removed)parts.push(`${removed} rimosse`);
        if(skipped)parts.push(`${skipped} modifiche non applicate`);
        if(pending)parts.push(`${pending} modifiche da confermare manualmente`);
        const message=parts.join(', ')+'.';
        notify({state:'success',message,created,updated,removed,skipped,pending,active});
        await loadEvents();
        return {created,updated,removed,skipped,pending,active};
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
