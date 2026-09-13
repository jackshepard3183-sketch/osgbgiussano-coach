(function(){
  let client=null,user=null;
  async function loadCallups(eventId){
    if(!client||!eventId)return;
    const {data,error}=await client.from('callups').select('player_id,team_color').eq('event_id',eventId);
    if(error){console.error(error);return;}
    const map={};(data||[]).forEach(r=>map[r.player_id]=r.team_color);S.asg[eventId]=map;render();
  }
  window.asg=async function(playerId,team){
    if(!client||!user||!S.match)return;
    const map=S.asg[S.match]||{};
    if(team){
      map[playerId]=team;S.asg[S.match]=map;render();
      const {error}=await client.from('callups').upsert({owner_user_id:user.id,event_id:S.match,player_id:playerId,team_color:team},{onConflict:'event_id,player_id'});
      if(error){console.error(error);await loadCallups(S.match);}
    }else{
      delete map[playerId];S.asg[S.match]=map;render();
      const {error}=await client.from('callups').delete().eq('event_id',S.match).eq('player_id',playerId);
      if(error){console.error(error);await loadCallups(S.match);}
    }
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
