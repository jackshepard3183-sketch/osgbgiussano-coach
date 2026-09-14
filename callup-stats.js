(function(){
  let client=null,stats={};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const waitRoster=()=>new Promise(resolve=>{let n=0;const t=setInterval(()=>{n++;if(P.length||n>40){clearInterval(t);resolve();}},100)});
  function blank(){return {total:0,BLU:0,GIALLA:0};}

  async function loadStats(){
    if(!client)return;
    const {data,error}=await client.from('callups').select('player_id,team_color');
    if(error){console.error('callup stats load',error);return;}
    const next={};for(const p of P)next[p.id]=blank();
    for(const r of (data||[])){const s=next[r.player_id]||(next[r.player_id]=blank());s.total++;if(r.team_color==='BLU')s.BLU++;if(r.team_color==='GIALLA')s.GIALLA++;}
    stats=next;window.osgbCallupStats={...stats};
    if(S.r==='team')render();
  }

  window.openCallupBalance=function(){
    const rows=P.map(p=>({p,s:stats[p.id]||blank()})).sort((a,b)=>a.s.total-b.s.total||String(a.p.n).localeCompare(String(b.p.n),'it'));
    const totals=rows.map(x=>x.s.total),min=totals.length?Math.min(...totals):0,max=totals.length?Math.max(...totals):0;
    const list=rows.map(({p,s})=>`<div class="player"><div class="av">${p.seq||P.indexOf(p)+1}</div><div class="meta"><b>${esc(p.n)}</b><br><small>BLU ${s.BLU} · GIALLA ${s.GIALLA}</small></div><span class="pill">${s.total} convocazioni</span></div>`).join('');
    modal(`<div class="mh"><h3>EQUITÀ CONVOCAZIONI</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><div class="grid g3"><div class="card"><div class="muted">MINIMO</div><div class="kpi">${min}</div></div><div class="card"><div class="muted">MASSIMO</div><div class="kpi">${max}</div></div><div class="card"><div class="muted">DIFFERENZA</div><div class="kpi">${max-min}</div></div></div><p class="muted">Ordinato da chi ha partecipato meno, per aiutare a mantenere opportunità equilibrate.</p>${list}`);
  };

  const oldTeam=window.team;
  window.team=function(){const html=typeof oldTeam==='function'?oldTeam():'';return `${html}<div class="card" style="margin-top:12px"><b>Partecipazione alle gare</b><p class="muted">Controlla l’equilibrio delle convocazioni tra tutti i bambini.</p><button class="btn alt" onclick="openCallupBalance()"><i data-lucide="scale"></i>Equità convocazioni</button></div>`;};

  const oldPlayer=window.openPlayerStats;
  window.openPlayerStats=function(id){if(typeof oldPlayer==='function')oldPlayer(id);const s=stats[id]||blank();const sheet=document.querySelector('#m .sheet');if(sheet)sheet.insertAdjacentHTML('beforeend',`<div class="card" style="margin-top:12px"><div class="muted">PARTECIPAZIONE GARE</div><div class="kpi">${s.total}</div><p class="muted">BLU ${s.BLU} · GIALLA ${s.GIALLA}</p></div>`);if(window.lucide)lucide.createIcons();};

  const oldAsg=window.asg;
  window.asg=async function(playerId,team){if(typeof oldAsg==='function')await oldAsg(playerId,team);await loadStats();if(typeof window.osgbReloadCallupCounts==='function')await window.osgbReloadCallupCounts();};

  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client||null;if(!client)return;await waitRoster();await loadStats();});
  window.addEventListener('osgb-callups-updated',()=>loadStats());
  window.osgbReloadCallupStats=loadStats;
})();
