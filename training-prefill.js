(function(){
  const objectiveMap={ball_control:'Conduzione e 1 contro 1',passing:'Passaggio e ricezione',one_v_one:'Conduzione e 1 contro 1',collaboration:'Gioco e collaborazione',attention:'Coordinazione',participation:'Gioco e collaborazione'};
  const labelMap={participation:'Partecipazione',collaboration:'Collaborazione',attention:'Attenzione',ball_control:'Conduzione',passing:'Passaggio',one_v_one:'1 contro 1'};
  window.trainingFromMatch=function(eventId){
    const e=S.events.find(x=>String(x.id)===String(eventId));if(!e)return;
    const obs=e.observations||{};
    const priorities=Object.entries(obs).filter(([,v])=>v==='review').map(([k])=>k);
    const first=priorities[0]||Object.keys(obs)[0]||null;
    const notes=[priorities.length?`Da riprendere: ${priorities.map(k=>labelMap[k]||k).join(', ')}`:'',e.postMatchNotes||''].filter(Boolean).join('\n');
    closeM();
    if(typeof window.trainingWizard!=='function')return;
    window.trainingWizard();
    requestAnimationFrame(()=>{
      const n=document.getElementById('trNotes');
      const o=document.getElementById('trObjective');
      if(n)n.value=notes;
      if(o&&first&&objectiveMap[first])o.value=objectiveMap[first];
    });
  };
  window.trainingFromObservation=function(notes){
    closeM();if(typeof window.trainingWizard!=='function')return;window.trainingWizard();requestAnimationFrame(()=>{const n=document.getElementById('trNotes');if(n)n.value=String(notes||'');});
  };
})();