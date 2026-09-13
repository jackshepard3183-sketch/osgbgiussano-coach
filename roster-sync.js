(function(){
  async function loadRoster(client){
    const {data,error}=await client.from('players')
      .select('id,first_name,last_name,birth_year,active')
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
      seq:i+1
    })));
    S.pres=Object.fromEntries(P.map(p=>[p.id,S.pres?.[p.id]]).filter(([,v])=>v));
    render();
  }
  window.addEventListener('osgb-auth-ready',e=>{
    const client=e.detail?.client;
    if(client)loadRoster(client);
  });
})();
