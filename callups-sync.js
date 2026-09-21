(function(){
  let client=null,user=null;
  async function loadCallups(eventId){
    if(!client||!eventId)return;
    const {data,error}=await client.from('callups').select('player_id,team_color').eq('event_id',eventId);
    if(error){console.error(error);return;}
    const map={};(data||[]).forEach(r=>map[r.player_id]=r.team_color);S.asg[eventId]=map;render();
  }
  async function requireUser(){
    if(user)return user;
    if(!client)return null;
    const {data,error}=await client.auth.getUser();
    if(error){console.error('callups auth',error);return null;}
    user=data?.user||null;
    return user;
  }
  window.asg=async function(playerId,team){
    if(!S.match){alert('Seleziona prima la gara da comporre.');return;}
    if(!client||!await requireUser()){alert('Sessione non pronta. Riapri l’app ed effettua nuovamente l’accesso.');return;}
    const eventId=S.match;
    const map={...(S.asg[eventId]||{})};
    const previous=map[playerId]||null;
    if(team){
      map[playerId]=team;S.asg[eventId]=map;render();
      const {error}=await client.from('callups').upsert({owner_user_id:user.id,event_id:eventId,player_id:playerId,team_color:team},{onConflict:'event_id,player_id'});
      if(error){console.error('callup save',error);if(previous)map[playerId]=previous;else delete map[playerId];S.asg[eventId]=map;render();alert(`Assegnazione non salvata: ${error.message||'errore database'}`);}
    }else{
      delete map[playerId];S.asg[eventId]=map;render();
      const {error}=await client.from('callups').delete().eq('event_id',eventId).eq('player_id',playerId);
      if(error){console.error('callup delete',error);if(previous)map[playerId]=previous;S.asg[eventId]=map;render();alert(`Assegnazione non rimossa: ${error.message||'errore database'}`);}
    }
  };
  window.osgbSelectCallupEvent=async function(eventId){
    S.match=eventId||null;
    if(S.match)await loadCallups(S.match);else render();
  };
  const oldOpen=window.openMatch;
  window.openMatch=async function(id){
    S.match=id;await loadCallups(id);
    if(typeof oldOpen==='function')oldOpen(id);
  };
  window.addEventListener('osgb-auth-ready',async e=>{
    client=e.detail?.client;if(!client)return;
    const {data}=await client.auth.getUser();user=data?.user||null;
    if(S.match)await loadCallups(S.match);
  });
})();
