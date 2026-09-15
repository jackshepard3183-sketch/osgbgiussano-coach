(function(){
  window.osgbTrainingSchedule={days:[2,4],start:'18:00',end:'19:30',duration:90};

  function isoLocal(d){
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }

  function nextTrainingDate(){
    const d=new Date();d.setHours(12,0,0,0);
    for(let i=0;i<8;i++){
      const x=new Date(d);x.setDate(d.getDate()+i);
      if(x.getDay()===2||x.getDay()===4)return isoLocal(x);
    }
    return isoLocal(d);
  }

  function applyDefaults(){
    const date=document.getElementById('trDate');
    const duration=document.getElementById('trDuration');
    if(date)date.value=nextTrainingDate();
    if(duration)duration.value='90';
  }

  function install(){
    if(typeof window.trainingWizard!=='function'||window.trainingWizard.__osgbScheduleWrapped)return false;
    const original=window.trainingWizard;
    const wrapped=function(existing,mode){
      const result=original.apply(this,arguments);
      if(!existing&&mode!=='template')requestAnimationFrame(applyDefaults);
      return result;
    };
    wrapped.__osgbScheduleWrapped=true;
    window.trainingWizard=wrapped;
    return true;
  }

  if(!install()){
    let tries=0;
    const t=setInterval(()=>{tries++;if(install()||tries>50)clearInterval(t);},100);
  }
})();
