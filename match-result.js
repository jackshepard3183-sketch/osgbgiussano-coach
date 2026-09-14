(function(){
  let client=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  window.openMatchResult=function(id){
    const e=S.events.find(x=>String(x.id)===String(id));if(!e||!client)return;
    closeM();
    modal(`<div class="mh"><h3>OSSERVAZIONI DOPO LA GARA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><h3>${esc(e.t||'Gara')}</h3><p class="muted">Annotazioni dello staff sulla partecipazione e sugli aspetti da riprendere nei prossimi allenamenti.</p><div class="field"><label>Osservazioni</label><textarea id="mrNotes" placeholder="Partecipazione, collaborazione, attenzione, aspetti tecnici, situazioni da riprendere…">${esc(e.postMatchNotes||'')}</textarea></div><button class="btn" id="saveResultBtn" onclick='saveMatchResult(${JSON.stringify(String(e.id))})'><i data-lucide="save"></i>Salva osservazioni</button>`);
  };

  window.saveMatchResult=async function(id){
    if(!client)return;
    const notes=document.getElementById('mrNotes')?.value.trim()||'';
    const btn=document.getElementById('saveResultBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const {error}=await client.rpc('osgb_set_match_result',{p_event_id:id,p_score_for:null,p_score_against:null,p_post_match_notes:notes});
    if(error){console.error('post match notes save',error);alert('Impossibile salvare le osservazioni.');if(btn){btn.disabled=false;btn.textContent='Salva osservazioni';}return;}
    if(typeof window.osgbReloadEvents==='function')await window.osgbReloadEvents();
    if(typeof window.osgbReloadDashboard==='function')await window.osgbReloadDashboard();
    closeM();
    openMatch(id);
  };

  window.addEventListener('osgb-auth-ready',e=>{client=e.detail?.client||null;});
})();