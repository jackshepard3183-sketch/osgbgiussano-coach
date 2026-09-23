(function(){
  let client=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const TO_DB={Campionato:'league',Amichevole:'friendly',Torneo:'tournament',league:'league',friendly:'friendly',tournament:'tournament'};

  window.editMatch=function(id){
    const e=S.events.find(x=>String(x.id)===String(id));if(!e)return;
    closeM();
    modal(`<div class="mh"><h3>MODIFICA GARA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <div class="field"><label>Squadra</label><select id="emTeam"><option ${e.team==='BLU'?'selected':''}>BLU</option><option ${e.team==='GIALLA'?'selected':''}>GIALLA</option></select></div>
      <div class="field"><label>Tipo</label><select id="emType"><option ${e.type==='Campionato'?'selected':''}>Campionato</option><option ${e.type==='Amichevole'?'selected':''}>Amichevole</option><option ${e.type==='Torneo'?'selected':''}>Torneo</option></select></div>
      <div class="field"><label>Data</label>${osgbNativePickerField('emDate','date',e.date||'')}</div>
      <div class="field"><label>Ora</label>${osgbNativePickerField('emTime','time',e.time||'')}</div>
      <div class="field"><label>Ritrovo</label>${osgbNativePickerField('emMeet','time',e.meet||'')}</div>
      <div class="field"><label>Avversario</label><input id="emOpp" value="${esc(e.opponent||'')}"></div>
      <div class="field"><label>Casa / trasferta</label><select id="emHA"><option value="home" ${e.homeAway==='home'?'selected':''}>Casa</option><option value="away" ${e.homeAway==='away'?'selected':''}>Trasferta</option></select></div>
      <div class="field"><label>Campo</label><input id="emVenue" value="${esc(e.place||'')}"></div>
      <div class="field"><label>Indirizzo</label><input id="emAddr" value="${esc(e.addr||'')}"></div>
      <div class="field"><label>Note</label><input id="emNotes" value="${esc(e.notes||'')}"></div>
      <button class="btn" onclick='saveEditedMatch(${JSON.stringify(String(e.id))})'><i data-lucide="save"></i>Salva modifiche</button>`);
  };

  window.saveEditedMatch=async function(id){
    if(!client)return;
    const opp=document.getElementById('emOpp').value.trim();
    const ha=document.getElementById('emHA').value;
    const payload={
      event_date:document.getElementById('emDate').value,
      event_type:TO_DB[document.getElementById('emType').value],
      title:ha==='home'?`OSGB Giussano - ${opp}`:`${opp} - OSGB Giussano`,
      start_time:document.getElementById('emTime').value||'',meeting_time:document.getElementById('emMeet').value||'',
      team_color:document.getElementById('emTeam').value,opponent:opp,home_away:ha,
      venue:document.getElementById('emVenue').value.trim(),address:document.getElementById('emAddr').value.trim(),notes:document.getElementById('emNotes').value.trim()
    };
    const {error}=await client.rpc('coach_update_event',{p_event_id:id,p_data:payload});
    if(error){console.error(error);alert('Impossibile modificare la gara.');return;}
    closeM();if(typeof window.osgbReloadEvents==='function')await window.osgbReloadEvents();if(typeof window.osgbReloadDashboard==='function')await window.osgbReloadDashboard();go('cal');
  };

  window.deleteMatch=async function(id){
    if(!client||!confirm('Eliminare definitivamente questa gara?'))return;
    const {error}=await client.rpc('coach_delete_event',{p_event_id:id});
    if(error){console.error(error);alert('Impossibile eliminare la gara.');return;}
    closeM();if(String(S.match)===String(id))S.match=null;if(typeof window.osgbReloadEvents==='function')await window.osgbReloadEvents();if(typeof window.osgbReloadDashboard==='function')await window.osgbReloadDashboard();go('cal');
  };

  window.addEventListener('osgb-auth-ready',e=>{client=e.detail?.client||null;});
})();