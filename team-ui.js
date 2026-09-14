(function(){
  let client=null;
  let stats={};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=d=>{if(!d)return'—';const [y,m,day]=String(d).split('-');return `${day}/${m}/${y}`};
  const waitRoster=()=>new Promise(resolve=>{let n=0;const t=setInterval(()=>{n++;if(P.length||n>40){clearInterval(t);resolve();}},100)});

  function empty(){return {present:0,absent:0,late:0,unavailable:0,total:0,pct:0,last:[]};}

  async function loadStats(){
    if(!client)return;
    const {data,error}=await client.from('attendance').select('player_id,status,event_id,updated_at').order('updated_at',{ascending:false});
    if(error){console.error('player stats load',error);return;}
    const next={};
    for(const p of P)next[p.id]=empty();
    for(const r of (data||[])){
      const s=next[r.player_id]||(next[r.player_id]=empty());
      if(r.status==='present')s.present++;
      else if(r.status==='absent')s.absent++;
      else if(r.status==='late')s.late++;
      else if(r.status==='unavailable')s.unavailable++;
      s.total++;
      if(s.last.length<5)s.last.push({status:r.status,date:r.updated_at});
    }
    for(const p of P){
      const s=next[p.id]||empty();
      s.pct=s.total?Math.round((s.present+s.late)/s.total*100):0;
      p.pct=s.pct;
    }
    stats=next;
    if(S.r==='team')render();
  }

  window.team=function(){
    const a=S.asg[S.match]||{};
    const rows=P.length?P.map((p,i)=>{
      const s=stats[p.id]||empty();
      return `<div class="player" onclick='openPlayerStats(${JSON.stringify(String(p.id))})' style="cursor:pointer"><div class="av">${p.seq||i+1}</div><div class="meta"><b>${esc(p.n)}</b><br><small>Presenze ${s.pct}% · ${s.present} P · ${s.absent} A · ${s.late} R</small></div><span class="pill ${a[p.id]==='GIALLA'?'yellow':''}">${esc(a[p.id]||'Non assegnato')}</span></div>`;
    }).join(''):`<p class="muted">Rosa non disponibile.</p>`;
    return `${ttl('Squadra',`${P.length} bambini · BLU e GIALLA dinamiche per ogni gara`)}<div class="card"><p class="muted">Le squadre vengono composte per ogni singola gara.</p><button class="btn" onclick="go('builder')"><i data-lucide="users-round"></i>Componi BLU / GIALLA</button></div><div class="section">ROSA</div>${rows}`;
  };

  window.builder=function(){
    const a=S.asg[S.match]||{};
    const g={N:[],BLU:[],GIALLA:[]};
    P.forEach(p=>g[a[p.id]||'N'].push(p));
    const row=p=>`<div class="assign"><div class="av">${p.seq||P.indexOf(p)+1}</div><b>${esc(p.n)}</b><div class="acts"><button class="mb" onclick='asg(${JSON.stringify(String(p.id))},"BLU")'>BLU</button><button class="my" onclick='asg(${JSON.stringify(String(p.id))},"GIALLA")'>GIALLA</button><button class="mn" onclick='asg(${JSON.stringify(String(p.id))},null)'>×</button></div></div>`;
    const noMatch=!S.match?`<div class="card"><p class="muted">Apri prima una gara dal Calendario per comporre le squadre.</p><button class="btn alt" onclick="go('cal')">Vai al Calendario</button></div>`:'';
    return `${ttl('BLU / GIALLA','Composizione dinamica della giornata')}${noMatch}<div class="card"><b>Non assegnati: ${g.N.length}</b>${g.N.map(row).join('')}</div><div class="builder" style="margin-top:12px"><div class="box b"><h3>BLU · ${g.BLU.length}</h3>${g.BLU.map(row).join('')}</div><div class="box y"><h3>GIALLA · ${g.GIALLA.length}</h3>${g.GIALLA.map(row).join('')}</div></div>`;
  };

  window.openPlayerStats=function(id){
    const p=P.find(x=>String(x.id)===String(id));if(!p)return;
    const s=stats[p.id]||empty();
    modal(`<div class="mh"><h3>${esc(p.n)}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><div class="grid g4"><div class="card"><b>Presenze</b><div class="kpi">${s.present}</div></div><div class="card"><b>Assenze</b><div class="kpi">${s.absent}</div></div><div class="card"><b>Ritardi</b><div class="kpi">${s.late}</div></div><div class="card"><b>Indisponibile</b><div class="kpi">${s.unavailable}</div></div></div><div class="card" style="margin-top:12px"><div class="muted">PERCENTUALE STAGIONALE</div><div class="kpi">${s.pct}%</div><p class="muted">Calcolata su ${s.total} rilevazioni registrate.</p></div>`);
  };

  window.osgbReloadPlayerStats=loadStats;
  window.addEventListener('osgb-auth-ready',async e=>{
    client=e.detail?.client;if(!client)return;
    await waitRoster();
    await loadStats();
  });
})();