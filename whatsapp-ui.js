(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmtDate=d=>{if(!d)return'-';try{return new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00'));}catch(_){return d}};
  function selectedEvent(){return S.events.find(x=>String(x.id)===String(S.match))||null;}
  function teamPlayers(team){const map=S.asg[S.match]||{};return P.filter(p=>map[p.id]===team);}
  function fallback(team){
    const e=selectedEvent();if(!e)return 'Nessuna gara selezionata.';
    const players=teamPlayers(team),names=players.map(p=>p.n);
    const location=e.addr||e.place||'-';
    const opponent=e.opponent||e.t||'Gara';
    return `${team==='BLU'?'🔵':'🟡'} *SQUADRA ${team}*

📅 ${fmtDate(e.date)}
⚽ vs ${opponent}
📍 ${location}
🕒 Ritrovo: ${e.meet?'ore '+e.meet:'da definire'}
🕞 Inizio: ${e.time?'ore '+e.time:'da definire'}

👥 *Convocati (${names.length})*
${names.length?names.map(n=>'• '+n).join('\\n'):'• Da definire'}

✅ Per giocare useremo il *kit di allenamento* (maglietta blu + pantaloncini bianchi + calzettoni blu + parastinchi)

Confermate la presenza.
Grazie mille. 💙💛💪🏻⚽`;
  }
  function renderTemplate(body,team){
    const e=selectedEvent();if(!e)return '';
    const players=teamPlayers(team),names=players.map(p=>'• '+p.n).join('\n')||'• Da definire';
    const map={
      '{SQUADRA}':team,
      '{DATA}':fmtDate(e.date),
      '{AVVERSARIO}':e.opponent||e.t||'Gara',
      '{LUOGO}':e.place||'-',
      '{INDIRIZZO}':e.addr||'-',
      '{RITROVO}':e.meet?'ore '+e.meet:'da definire',
      '{INIZIO}':e.time?'ore '+e.time:'da definire',
      '{CONVOCATI}':names,
      '{NUM_CONVOCATI}':String(players.length)
    };
    let out=String(body||'');for(const [k,v] of Object.entries(map))out=out.split(k).join(v);return out;
  }
  function selectedTemplate(){
    const sel=document.getElementById('waTemplate');
    const list=typeof window.osgbGetWhatsAppTemplates==='function'?window.osgbGetWhatsAppTemplates():[];
    if(sel?.value){const t=list.find(x=>String(x.id)===String(sel.value));if(t)return t;}
    return typeof window.osgbGetDefaultWhatsAppTemplate==='function'?window.osgbGetDefaultWhatsAppTemplate():null;
  }
  function build(team){const t=selectedTemplate();return t?renderTemplate(t.body,team):fallback(team);}
  async function copyValue(id,btn){
    const el=document.getElementById(id);const text=el?.value||'';if(!text)return;
    try{await navigator.clipboard.writeText(text);}catch(_){el.focus();el.select();document.execCommand('copy');}
    if(btn){const old=btn.innerHTML;btn.innerHTML='<i data-lucide="check"></i>Copiato';if(window.lucide)lucide.createIcons();setTimeout(()=>{btn.innerHTML=old;if(window.lucide)lucide.createIcons();},1400);}
  }
  function section(team,id,klass){
    const players=teamPlayers(team),text=build(team);
    return `<div class="card ${team==='GIALLA'?'yellow':''}" style="margin-top:12px"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h3 style="margin:0">${team==='BLU'?'🔵':'🟡'} SQUADRA ${team}</h3><span class="pill ${team==='GIALLA'?'yellow':''}">${players.length} convocati</span></div><textarea id="${id}" style="width:100%;min-height:245px;margin-top:10px">${esc(text)}</textarea><div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn alt" onclick="copyWhatsAppMessage('${id}',this)"><i data-lucide="copy"></i>Copia testo</button><button class="btn ${klass}" onclick="wa('${id}')"><i data-lucide="message-circle"></i>Apri WhatsApp</button></div></div>`;
  }
  function templateSelector(){
    const list=typeof window.osgbGetWhatsAppTemplates==='function'?window.osgbGetWhatsAppTemplates():[];
    const def=typeof window.osgbGetDefaultWhatsAppTemplate==='function'?window.osgbGetDefaultWhatsAppTemplate():null;
    return `<div class="card"><div class="field"><label>Modello messaggio</label><select id="waTemplate" onchange="refreshWhatsAppMessages()"><option value="">Testo standard OSGB</option>${list.map(t=>`<option value="${t.id}" ${def&&String(def.id)===String(t.id)?'selected':''}>${esc(t.name)}${t.is_default?' · predefinito':''}</option>`).join('')}</select></div><button class="btn alt" onclick="closeM();openWhatsAppTemplates()"><i data-lucide="library"></i>Gestisci modelli</button></div>`;
  }
  window.refreshWhatsAppMessages=function(){const b=document.getElementById('mb'),y=document.getElementById('my');if(b)b.value=build('BLU');if(y)y.value=build('GIALLA');};
  window.messages=function(){
    const e=selectedEvent();if(!e){alert('Apri prima una gara dal Calendario.');return;}
    modal(`<div class="mh"><h3>MESSAGGI CONVOCAZIONE</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">${esc(e.t||'Gara')} · ${esc(fmtDate(e.date))}. Puoi scegliere un tuo modello, modificare il testo e poi copiarlo o aprirlo in WhatsApp.</p>${templateSelector()}${section('BLU','mb','')}${section('GIALLA','my','yellow')}`);
  };
  window.copyWhatsAppMessage=copyValue;
  window.wa=function(id){const text=document.getElementById(id)?.value||'';if(!text)return;open('https://wa.me/?text='+encodeURIComponent(text),'_blank')};
})();