(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function counts(){const a=S.asg[S.match]||{};return {BLU:Object.values(a).filter(v=>v==='BLU').length,GIALLA:Object.values(a).filter(v=>v==='GIALLA').length};}
  function currentEvent(){return S.events.find(x=>String(x.id)===String(S.match))||null;}

  const oldMessages=window.messages;
  if(typeof oldMessages==='function'){
    window.messages=function(){
      oldMessages();
      requestAnimationFrame(()=>{
        const mb=document.getElementById('mb'),my=document.getElementById('my');
        if(!mb||!my)return;
        const blue=mb.closest('.card'),yellow=my.closest('.card');
        if(!blue||!yellow)return;
        const c=counts(),e=currentEvent();
        let active=(e?.team==='GIALLA'?'GIALLA':'BLU');
        if(c[active]===0&&c[active==='BLU'?'GIALLA':'BLU']>0)active=active==='BLU'?'GIALLA':'BLU';
        const nav=document.createElement('div');
        nav.id='waTeamSwitch';nav.className='card';nav.style.marginTop='12px';
        nav.innerHTML=`<div class="muted">SQUADRA DA INVIARE</div><div class="row" style="margin-top:8px;display:flex;gap:6px"><button id="waTabBlu" class="btn alt" onclick="osgbShowWaTeam('BLU')">🔵 BLU · ${c.BLU}</button><button id="waTabGialla" class="btn alt" onclick="osgbShowWaTeam('GIALLA')">🟡 GIALLA · ${c.GIALLA}</button></div><p id="waTeamWarning" class="muted" style="margin:8px 0 0"></p>`;
        blue.parentNode.insertBefore(nav,blue);
        window.__osgbWaCards={BLU:blue,GIALLA:yellow};
        window.osgbShowWaTeam(active);
      });
    };
  }

  window.osgbShowWaTeam=function(team){
    const cards=window.__osgbWaCards;if(!cards)return;
    cards.BLU.style.display=team==='BLU'?'block':'none';
    cards.GIALLA.style.display=team==='GIALLA'?'block':'none';
    const c=counts(),warn=document.getElementById('waTeamWarning');
    if(warn)warn.textContent=c[team]===0?`Attenzione: la squadra ${team} non ha ancora convocati.`:`${c[team]} convocati nella squadra ${team}.`;
    const b=document.getElementById('waTabBlu'),y=document.getElementById('waTabGialla');
    if(b)b.className='btn '+(team==='BLU'?'':'alt');
    if(y)y.className='btn '+(team==='GIALLA'?'yellow':'alt');
    const target=team==='BLU'?document.getElementById('mb'):document.getElementById('my');
    if(target)setTimeout(()=>target.scrollIntoView({block:'nearest',behavior:'smooth'}),50);
  };

  const oldBuilder=window.builder;
  if(typeof oldBuilder==='function'){
    window.builder=function(){
      let html=oldBuilder();
      if(!S.match)return html;
      const marker='<button class="btn alt" onclick="clearCallups()"><i data-lucide="eraser"></i>Svuota</button>';
      if(html.includes(marker)&&!html.includes('Messaggi WhatsApp')){
        html=html.replace(marker,marker+'<button class="btn yellow" onclick="messages()"><i data-lucide="message-circle"></i>Messaggi WhatsApp</button>');
      }
      return html;
    };
  }
})();
