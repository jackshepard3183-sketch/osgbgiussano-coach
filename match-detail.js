(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=d=>{if(!d)return'—';const [y,m,day]=String(d).split('-');return `${day}/${m}/${y}`};
  const labels={participation:'Partecipazione',collaboration:'Collaborazione',attention:'Attenzione',ball_control:'Conduzione',passing:'Passaggio',one_v_one:'1 contro 1'};
  const states={review:'Da riprendere',growing:'In crescita',positive:'Positivo'};
  window.openMatch=function(id){
    const e=S.events.find(x=>String(x.id)===String(id));if(!e)return;
    S.match=e.id;
    const items=Object.entries(e.observations||{}).filter(([,v])=>v).map(([k,v])=>`<span class="pill ${v==='positive'?'':'yellow'}">${esc(labels[k]||k)} · ${esc(states[v]||v)}</span>`).join(' ');
    const hasObs=items||e.postMatchNotes;
    const observations=hasObs?`<div class="card" style="margin-top:12px"><div class="muted">OSSERVAZIONI DOPO LA GARA</div>${items?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${items}</div>`:''}${e.postMatchNotes?`<p>${esc(e.postMatchNotes)}</p>`:''}<button class="btn alt" onclick='trainingFromMatch(${JSON.stringify(String(e.id))})'><i data-lucide="sparkles"></i>Crea seduta da osservazioni</button></div>`:'';
    modal(`<div class="mh"><h3>${esc(e.team||e.type||'GARA')}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><h3>${esc(e.t||'Gara')}</h3><p>${fmt(e.date)}${e.time?' · '+esc(e.time):''}${e.meet?' · ritrovo '+esc(e.meet):''}</p><p class="muted">${esc(e.place||'')}${e.addr?'<br>'+esc(e.addr):''}</p>${e.notes?`<p class="muted">${esc(e.notes)}</p>`:''}${observations}<div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" onclick="closeM();go('builder')"><i data-lucide="users-round"></i>Componi squadre</button><button class="btn yellow" onclick="closeM();messages()"><i data-lucide="message-circle"></i>WhatsApp</button><button class="btn alt" onclick='openMatchResult(${JSON.stringify(String(e.id))})'><i data-lucide="clipboard-pen-line"></i>Osservazioni</button><button class="btn alt" onclick='editMatch(${JSON.stringify(String(e.id))})'><i data-lucide="pencil"></i>Modifica</button></div><div style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(0,0,0,.08)"><button class="btn alt" onclick='deleteMatch(${JSON.stringify(String(e.id))})'><i data-lucide="trash-2"></i>Elimina gara</button></div>`);
  };
})();