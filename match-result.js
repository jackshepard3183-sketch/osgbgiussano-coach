(function(){
  let client=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  window.openMatchResult=function(id){
    const e=S.events.find(x=>String(x.id)===String(id));if(!e||!client)return;
    closeM();
    modal(`<div class="mh"><h3>POST-PARTITA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><h3>${esc(e.t||'Gara')}</h3><div class="grid g2"><div class="field"><label>Gol fatti</label><input id="mrFor" type="number" min="0" value="${e.scoreFor??''}"></div><div class="field"><label>Gol subiti</label><input id="mrAgainst" type="number" min="0" value="${e.scoreAgainst??''}"></div></div><div class="field"><label>Note post-partita</label><textarea id="mrNotes" placeholder="Aspetti positivi, difficoltà, indicazioni per il prossimo allenamento…">${esc(e.postMatchNotes||'')}</textarea></div><button class="btn" id="saveResultBtn" onclick='saveMatchResult(${JSON.stringify(String(e.id))})'><i data-lucide="save"></i>Salva post-partita</button>`);
  };

  window.saveMatchResult=async function(id){
    if(!client)return;
    const rawFor=document.getElementById('mrFor')?.value;
    const rawAgainst=document.getElementById('mrAgainst')?.value;
    const scoreFor=rawFor===''?null:Math.max(0,parseInt(rawFor,10)||0);
    const scoreAgainst=rawAgainst===''?null:Math.max(0,parseInt(rawAgainst,10)||0);
    const notes=document.getElementById('mrNotes')?.value.trim()||'';
    const btn=document.getElementById('saveResultBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const {error}=await client.rpc('osgb_set_match_result',{p_event_id:id,p_score_for:scoreFor,p_score_against:scoreAgainst,p_post_match_notes:notes});
    if(error){console.error('match result save',error);alert('Impossibile salvare il post-partita.');if(btn){btn.disabled=false;btn.textContent='Salva post-partita';}return;}
    if(typeof window.osgbReloadEvents==='function')await window.osgbReloadEvents();
    if(typeof window.osgbReloadDashboard==='function')await window.osgbReloadDashboard();
    closeM();
    openMatch(id);
  };

  window.addEventListener('osgb-auth-ready',e=>{client=e.detail?.client||null;});
})();