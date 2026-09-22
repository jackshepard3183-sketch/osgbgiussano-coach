(function(){
  let active='ALL';
  let hubStatus={state:'idle',message:'Importa e aggiorna le amichevoli 2020 dal gestionale Campi e Spogliatoi.'};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const labels=['ALL','Campionato','Amichevole','Torneo','BLU','GIALLA'];
  function matches(e,f){if(f==='ALL')return true;if(f==='BLU'||f==='GIALLA')return e.team===f;return e.type===f;}
  window.setCalendarFilter=function(f){active=f;render();};
  window.cal=function(){
    const filtered=(S.events||[]).filter(e=>matches(e,active));
    const tabs=labels.map(f=>`<button class="tab ${active===f?'on':''}" onclick='setCalendarFilter(${JSON.stringify(f)})'>${f==='ALL'?'Tutto':f}</button>`).join('');
    const list=filtered.length?filtered.map(e=>`<div class="event"><div class="date"><b>${esc(e.d||'')}</b></div><div class="body"><span class="pill ${e.team==='GIALLA'?'yellow':''}">${esc(e.team||e.type||'GARA')}</span><strong>${esc(e.t||'Gara')}</strong><small>${esc(e.time||'')}${e.meet?' · Ritrovo '+esc(e.meet):''}${e.place?' · '+esc(e.place):''}</small></div><button class="btn alt" onclick='openMatch(${JSON.stringify(String(e.id))})'><i data-lucide="chevron-right"></i>Apri</button></div>`).join(''):`<p class="muted">Nessuna gara per questo filtro.</p>`;
    const blu=(S.events||[]).filter(e=>e.team==='BLU').length, gialla=(S.events||[]).filter(e=>e.team==='GIALLA').length;
    const syncing=hubStatus.state==='loading';
    const syncClass=hubStatus.state==='error'?'color:#b42318':hubStatus.state==='success'?'color:#087443':'';
    return `${ttl('Calendario','Campionato, amichevoli e tornei')}<div class="grid g2"><div class="card"><b>Gare BLU</b><div class="kpi">${blu}</div></div><div class="card"><b>Gare GIALLA</b><div class="kpi">${gialla}</div></div></div><div class="card" style="margin-top:12px"><b>Amichevoli squadra 2020</b><p class="muted" style="margin:6px 0;${syncClass}">${esc(hubStatus.message)}</p><button class="btn alt" ${syncing?'disabled':''} onclick="syncCampiFriendlies().catch(()=>{})"><i data-lucide="refresh-cw"></i>${syncing?'Sincronizzazione…':'Sincronizza da Campi e Spogliatoi'}</button></div><div class="tabs" style="margin-top:12px">${tabs}</div><div class="card">${list}</div><button class="btn" style="margin-top:12px" onclick="newMatch()"><i data-lucide="plus"></i>Nuova gara</button>`;
  };
  window.addEventListener('osgb-hub-sync-status',event=>{hubStatus=event.detail||hubStatus;if(typeof render==='function')render();});
})();
