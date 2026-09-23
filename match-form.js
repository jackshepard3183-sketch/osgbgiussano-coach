(function(){
  window.newMatch=function(){
    modal(`<div class="mh"><h3>NUOVA GARA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <div class="field"><label>Squadra</label><select id="matchTeam"><option value="BLU">BLU</option><option value="GIALLA">GIALLA</option></select></div>
      <div class="field"><label>Tipo</label><select id="matchType"><option>Campionato</option><option>Amichevole</option><option>Torneo</option></select></div>
      <div class="field"><label>Data</label>${osgbNativePickerField('matchDate','date','')}</div>
      <div class="field"><label>Ora inizio</label>${osgbNativePickerField('matchTime','time','')}</div>
      <div class="field"><label>Ritrovo</label>${osgbNativePickerField('matchMeet','time','')}</div>
      <div class="field"><label>Avversario</label><input id="matchOpponent" placeholder="Nome società"></div>
      <div class="field"><label>Casa / trasferta</label><select id="matchHomeAway"><option value="home">Casa</option><option value="away">Trasferta</option></select></div>
      <div class="field"><label>Campo / impianto</label><input id="matchVenue"></div>
      <div class="field"><label>Indirizzo</label><input id="matchAddress"></div>
      <div class="field"><label>Note</label><input id="matchNotes"></div>
      <div class="row" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn alt" id="saveMatchBtn"><i data-lucide="save"></i>Salva gara</button>
        <button class="btn" id="saveAndBuildMatchBtn"><i data-lucide="users-round"></i>Salva e componi BLU / GIALLA</button>
      </div>`);
    document.getElementById('saveMatchBtn').onclick=()=>saveMatchForm(false);
    document.getElementById('saveAndBuildMatchBtn').onclick=()=>saveMatchForm(true);
  };

  function setSaving(on){
    const a=document.getElementById('saveMatchBtn'),b=document.getElementById('saveAndBuildMatchBtn');
    [a,b].forEach(x=>{if(x)x.disabled=on;});
    if(on){if(a)a.textContent='Salvataggio…';if(b)b.textContent='Salvataggio…';}
    else{
      if(a)a.innerHTML='<i data-lucide="save"></i>Salva gara';
      if(b)b.innerHTML='<i data-lucide="users-round"></i>Salva e componi BLU / GIALLA';
      if(typeof icons==='function')icons();
    }
  }

  async function saveMatchForm(openBuilder){
    const date=document.getElementById('matchDate').value;
    const opponent=document.getElementById('matchOpponent').value.trim();
    if(!date||!opponent){alert('Inserisci almeno data e avversario.');return;}
    const homeAway=document.getElementById('matchHomeAway').value;
    const title=homeAway==='home'?`OSGB Giussano - ${opponent}`:`${opponent} - OSGB Giussano`;
    const payload={
      event_date:date,
      event_type:document.getElementById('matchType').value,
      title,
      opponent,
      team_color:document.getElementById('matchTeam').value,
      start_time:document.getElementById('matchTime').value||null,
      meeting_time:document.getElementById('matchMeet').value||null,
      home_away:homeAway,
      venue:document.getElementById('matchVenue').value.trim()||null,
      address:document.getElementById('matchAddress').value.trim()||null,
      notes:document.getElementById('matchNotes').value.trim()||null
    };
    setSaving(true);
    try{
      const data=await window.osgbCreateEvent(payload);
      closeM();
      S.match=data.id;
      if(openBuilder)go('builder'); else go('cal');
    }catch(e){console.error(e);alert('Impossibile salvare la gara.');setSaving(false);}
  }
})();
