(function(){
  function num(p,i){return p.seq||i+1}
  function arg(v){return JSON.stringify(String(v))}

  window.team=function(){
    const a=S.asg[S.match]||{};
    return `${ttl('Squadra',`${P.length} bambini · BLU e GIALLA dinamiche per ogni gara`)}<div class="card"><p class="muted">Nessun bambino appartiene in modo fisso a una squadra.</p><button class="btn" onclick="go('builder')"><i data-lucide="users-round"></i>Componi BLU / GIALLA</button></div><div class="section">ROSA</div>${P.map((p,i)=>`<div class="player"><div class="av">${num(p,i)}</div><div class="meta"><b>${p.n}</b><br><small>Assegnazione corrente</small></div><span class="pill ${a[p.id]==='GIALLA'?'yellow':''}">${a[p.id]||'Non assegnato'}</span></div>`).join('')}`;
  };

  window.pres=function(){
    let c={p:0,a:0,l:0,u:0};Object.values(S.pres).forEach(x=>{if(c[x]!==undefined)c[x]++});
    return `${ttl('Presenze','Allenamento · oggi 17:30')}<div class="grid g4"><div class="card"><b>Presenti</b><div class="kpi">${c.p}</div></div><div class="card"><b>Assenti</b><div class="kpi">${c.a}</div></div><div class="card"><b>Ritardo</b><div class="kpi">${c.l}</div></div><div class="card"><b>Indisponibili</b><div class="kpi">${c.u}</div></div></div><div class="section">GIOCATORI</div>${P.map((p,i)=>`<div class="player"><div class="av">${num(p,i)}</div><div class="meta"><b>${p.n}</b><br><small>${p.pct?`Presenze stagione ${p.pct}%`:'Presenze stagione da registrare'}</small></div>${[['p','check'],['a','x'],['l','clock-3'],['u','minus']].map(x=>`<button class="sbtn ${S.pres[p.id]===x[0]?'on':''}" onclick='setPres(${arg(p.id)},${arg(x[0])})'><i data-lucide="${x[1]}"></i></button>`).join('')}</div>`).join('')}`;
  };

  window.builder=function(){
    const a=S.asg[S.match]||{},g={N:[],BLU:[],GIALLA:[]};
    P.forEach((p,i)=>{p._uiNum=num(p,i);g[a[p.id]||'N'].push(p)});
    const row=p=>`<div class="assign"><div class="av">${p._uiNum}</div><b>${p.n}</b><div class="acts"><button class="mb" onclick='asg(${arg(p.id)},"BLU")'>BLU</button><button class="my" onclick='asg(${arg(p.id)},"GIALLA")'>GIALLA</button><button class="mn" onclick='asg(${arg(p.id)},null)'>×</button></div></div>`;
    return `${ttl('BLU / GIALLA','Composizione dinamica della giornata')}<div class="card"><b>Non assegnati: ${g.N.length}</b>${g.N.map(row).join('')}</div><div class="builder" style="margin-top:12px"><div class="box b"><h3>BLU · ${g.BLU.length}</h3>${g.BLU.map(row).join('')}</div><div class="box y"><h3>GIALLA · ${g.GIALLA.length}</h3>${g.GIALLA.map(row).join('')}</div></div>`;
  };

  const oldRender=window.render;
  window.render=function(){
    document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n.dataset.r===S.r));
    app.innerHTML=({home,cal,pres,team,builder,train}[S.r]||home)();
    icons();
  };
})();