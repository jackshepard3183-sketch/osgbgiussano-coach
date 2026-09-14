(function(){
  window.trainingFromObservation=function(notes){
    closeM();
    if(typeof window.trainingWizard!=='function')return;
    window.trainingWizard();
    requestAnimationFrame(()=>{
      const n=document.getElementById('trNotes');
      const o=document.getElementById('trObjective');
      if(n)n.value=String(notes||'');
      if(o&&!o.value)o.value='Gioco e collaborazione';
    });
  };
})();