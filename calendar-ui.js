(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  window.cal=function(){
    const list=S.events.length?S.events.map(e=>`<div class="event"><div class="date"><b>${esc(e.d||'')}</b></div><div class="body"><span class="pill ${e.team==='GIALLA'?'yellow':''}">${esc(e.team||e.type||'GARA')}</span><strong>${esc(e.t||'Gara')}</strong><small>${esc(e.time||'')}${e.meet?' · Ritrovo '+esc(e.meet):''}${e.place?' · '+esc(e.place):''}</small></div><button class="btn alt" onclick='openMatch(${JSON.stringify(String(e.id))})'><i data-lucide="chevron-right"></i>Apri</button></div>`).join(''):`<p class="muted">Nessuna gara inserita.</p>`;
    return `${ttl('Calendario','Campionato, amichevoli e tornei')}<div class="card">${list}</div><button class="btn" style="margin-top:12px" onclick="newMatch()"><i data-lucide="plus"></i>Nuova gara</button>`;
  };
})();