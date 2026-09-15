(function(){
  let client=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const expLabel=v=>({first_year:'Primo anno',second_year:'Secondo anno',third_year:'Terzo anno'}[v]||'Da definire');
  const devLabel=v=>({initial:'Iniziale',growing:'In crescita',consolidated:'Consolidato'}[v]||'Da definire');

  window.osgbExperienceLabel=expLabel;
  window.osgbDevelopmentLabel=devLabel;
  window.osgbDevelopmentBadge=function(p){
    const exp=expLabel(p?.experienceLevel);
    const dev=devLabel(p?.developmentLevel);
    return `${exp} · ${dev}`;
  };

  window.openPlayerDevelopment=function(id){
    const p=P.find(x=>String(x.id)===String(id));if(!p)return;
    closeM();
    modal(`<div class="mh"><h3>PROFILO DI SVILUPPO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><h3>${esc(p.n)}</h3><p class="muted">Strumento interno allo staff per comporre gruppi equilibrati. Non è una classifica.</p><div class="field"><label>Esperienza</label><select id="pdExperience"><option value="" ${!p.experienceLevel?'selected':''}>Da definire</option><option value="first_year" ${p.experienceLevel==='first_year'?'selected':''}>Primo anno</option><option value="second_year" ${p.experienceLevel==='second_year'?'selected':''}>Secondo anno</option><option value="third_year" ${p.experienceLevel==='third_year'?'selected':''}>Terzo anno</option></select></div><div class="field"><label>Livello attuale</label><select id="pdLevel"><option value="" ${!p.developmentLevel?'selected':''}>Da definire</option><option value="initial" ${p.developmentLevel==='initial'?'selected':''}>Iniziale</option><option value="growing" ${p.developmentLevel==='growing'?'selected':''}>In crescita</option><option value="consolidated" ${p.developmentLevel==='consolidated'?'selected':''}>Consolidato</option></select></div><div class="field"><label>Nota interna</label><textarea id="pdNotes" placeholder="Es. ha iniziato quest'anno, sicurezza con la palla, attenzione da sostenere…">${esc(p.developmentNotes||'')}</textarea></div><button class="btn" id="saveDevelopmentBtn" onclick='savePlayerDevelopment(${JSON.stringify(String(p.id))})'><i data-lucide="save"></i>Salva profilo</button>`);
  };

  window.savePlayerDevelopment=async function(id){
    if(!client)return;
    const exp=document.getElementById('pdExperience')?.value||null;
    const level=document.getElementById('pdLevel')?.value||null;
    const notes=document.getElementById('pdNotes')?.value.trim()||'';
    const btn=document.getElementById('saveDevelopmentBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const {error}=await client.rpc('osgb_update_player_development',{p_player_id:id,p_experience_level:exp,p_development_level:level,p_development_notes:notes});
    if(error){console.error('development save',error);alert('Impossibile salvare il profilo.');if(btn){btn.disabled=false;btn.textContent='Salva profilo';}return;}
    if(typeof window.osgbReloadRoster==='function')await window.osgbReloadRoster();
    closeM();
    if(typeof window.openPlayerStats==='function')window.openPlayerStats(id);
  };

  window.addEventListener('osgb-auth-ready',e=>{client=e.detail?.client||null;});
})();
