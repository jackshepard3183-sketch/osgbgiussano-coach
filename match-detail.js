(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=d=>{if(!d)return'—';const [y,m,day]=String(d).split('-');return `${day}/${m}/${y}`};
  window.openMatch=function(id){
    const e=S.events.find(x=>String(x.id)===String(id));if(!e)return;
    S.match=e.id;
    modal(`<div class="mh"><h3>${esc(e.team||e.type||'GARA')}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><h3>${esc(e.t||'Gara')}</h3><p>${fmt(e.date)}${e.time?' · '+esc(e.time):''}${e.meet?' · ritrovo '+esc(e.meet):''}</p><p class="muted">${esc(e.place||'')}${e.addr?'<br>'+esc(e.addr):''}</p><button class="btn" onclick="closeM();go('builder')"><i data-lucide="users-round"></i>Componi squadre</button> <button class="btn yellow" onclick="closeM();messages()"><i data-lucide="message-circle"></i>WhatsApp</button>`);
  };
})();