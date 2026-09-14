(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtDate=d=>{if(!d)return'-';try{return new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00'));}catch(_){return d}};
  function selectedEvent(){return S.events.find(x=>String(x.id)===String(S.match))||null;}
  function teamPlayers(team){const map=S.asg[S.match]||{};return P.filter(p=>map[p.id]===team);}
  function build(team){
    const e=selectedEvent();
    if(!e)return 'Nessuna gara selezionata.';
    const players=teamPlayers(team);
    const names=players.map(p=>p.n);
    const place=[e.place,e.addr].filter(Boolean).join(' – ')||'-';
    return `${team==='BLU'?'🔵':'🟡'} *SQUADRA ${team} – OSGB GIUSSANO 2020*\n\n📅 ${fmtDate(e.date)}\n⚽ ${e.t||'Gara'}\n📍 ${place}\n🕒 Ritrovo: ${e.meet?'ore '+e.meet:'da definire'}\n🕞 Inizio: ${e.time?'ore '+e.time:'da definire'}\n\n👥 *Convocati (${names.length})*\n${names.length?names.map(n=>'• '+n).join('\n'):'• Da definire'}\n\nPer eventuali assenze o problemi, avvisare appena possibile.\n\nStaff OSGB Giussano 2020`;
  }
  async function copyValue(id,btn){
    const el=document.getElementById(id);const text=el?.value||'';if(!text)return;
    try{await navigator.clipboard.writeText(text);}catch(_){el.focus();el.select();document.execCommand('copy');}
    if(btn){const old=btn.innerHTML;btn.innerHTML='<i data-lucide="check"></i>Copiato';if(window.lucide)lucide.createIcons();setTimeout(()=>{btn.innerHTML=old;if(window.lucide)lucide.createIcons();},1400);}
  }
  function section(team,id,klass){
    const players=teamPlayers(team);const text=build(team);
    return `<div class="card ${team==='GIALLA'?'yellow':''}" style="margin-top:12px"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h3 style="margin:0">${team==='BLU'?'🔵':'🟡'} SQUADRA ${team}</h3><span class="pill ${team==='GIALLA'?'yellow':''}">${players.length} convocati</span></div><textarea id="${id}" style="width:100%;min-height:245px;margin-top:10px">${esc(text)}</textarea><div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn alt" onclick="copyWhatsAppMessage('${id}',this)"><i data-lucide="copy"></i>Copia testo</button><button class="btn ${klass}" onclick="wa('${id}')"><i data-lucide="message-circle"></i>Apri WhatsApp</button></div></div>`;
  }
  window.messages=function(){
    const e=selectedEvent();
    if(!e){alert('Apri prima una gara dal Calendario.');return;}
    modal(`<div class="mh"><h3>MESSAGGI CONVOCAZIONE</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">${esc(e.t||'Gara')} · ${esc(fmtDate(e.date))}. Puoi modificare il testo prima di copiarlo o aprirlo in WhatsApp.</p>${section('BLU','mb','')}${section('GIALLA','my','yellow')}`);
  };
  window.copyWhatsAppMessage=copyValue;
  window.wa=function(id){const text=document.getElementById(id)?.value||'';if(!text)return;open('https://wa.me/?text='+encodeURIComponent(text),'_blank')};
})();