(function(){
  async function loadRoster(client){
    const {data,error}=await client.from('players')
      .select('id,first_name,last_name,birth_year,active,experience_level,development_level,development_notes,source_missing,source_system,source_synced_at,source_last_seen_at')
      .eq('active',true)
      .eq('birth_year',2020)
      .order('last_name')
      .order('first_name');
    if(error){console.error('roster load',error);return;}
    P.splice(0,P.length,...(data||[]).map((x,i)=>({
      id:x.id,
      dbid:x.id,
      n:[x.first_name,x.last_name].filter(Boolean).join(' ').trim(),
      pct:0,
      seq:i+1,
      experienceLevel:x.experience_level||null,
      developmentLevel:x.development_level||null,
      developmentNotes:x.development_notes||'',
      sourceMissing:!!x.source_missing,
      sourceSystem:x.source_system||null,
      sourceSyncedAt:x.source_synced_at||null,
      sourceLastSeenAt:x.source_last_seen_at||null
    })));
    S.pres=Object.fromEntries(P.map(p=>[p.id,S.pres?.[p.id]]).filter(([,v])=>v));
    window.dispatchEvent(new CustomEvent('osgb-roster-updated',{detail:{count:P.length}}));
    render();
  }
  window.osgbReloadRoster=async function(){
    if(window.osgbSupabase)await loadRoster(window.osgbSupabase);
  };
  window.addEventListener('osgb-auth-ready',e=>{
    const client=e.detail?.client;
    if(client)loadRoster(client);
  });
})();
