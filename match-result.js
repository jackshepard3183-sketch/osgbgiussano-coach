(function(){
  let client=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fields=[['participation','Partecipazione'],['collaboration','Collaborazione'],['attention','Attenzione'],['ball_control','Conduzione'],['passing','Passaggio'],['one_v_one','1 contro 1']];
  const levels=[['review','Da riprendere'],['growing','In crescita'],['positive','Positivo']];

  window.openMatchResult=function(id){
    const e=S.events.find(x=>String(x.id)===String(id));if(!e||!client)return;
    closeM();
    const o=e.observations||{};
    const controls=fields.map(([key,label])=>`<div class="field"><label>${label}</label><select id="obs_${key}"><option value="">Non indicato</option>${levels.map(([v,l])=>`<option value="${v}" ${o[key]===v?'selected':''}>${l}</option>`).join('')}</select></div>`).join('');
    modal(`<div class="mh"><h3>OSSERVAZIONI DOPO LA GARA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><h3>${esc(e.t||'Gara')}</h3><p class="muted">Indicazioni qualitative dello staff, senza voti o risultati. Servono solo a orientare i prossimi allenamenti.</p><div class="grid g2">${controls}</div><div class="field"><label>Note libere</label><textarea id="mrNotes" placeholder="Situazioni da riprendere, aspetti positivi, idee per il prossimo allenamento…">${esc(e.postMatchNotes||'')}</textarea></div><button class="btn" id="saveResultBtn" onclick='saveMatchResult(${JSON.stringify(String(e.id))})'><i data-lucide="save"></i>Salva osservazioni</button>`);
  };

  window.saveMatchResult=async function(id){
    if(!client)return;
    const observations={};
    for(const [key] of fields){const v=document.getElementById(`obs_${key}`)?.value||'';if(v)observations[key]=v;}
    const notes=document.getElementById('mrNotes')?.value.trim()||'';
    const btn=document.getElementById('saveResultBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const {error}=await client.rpc('osgb_set_match_observations',{p_event_id:id,p_observations:observations,p_notes:notes});
    if(error){console.error('match observations save',error);alert('Impossibile salvare le osservazioni.');if(btn){btn.disabled=false;btn.textContent='Salva osservazioni';}return;}
    if(typeof window.osgbReloadEvents==='function')await window.osgbReloadEvents();
    closeM();openMatch(id);
  };

  window.addEventListener('osgb-auth-ready',e=>{client=e.detail?.client||null;});
})();