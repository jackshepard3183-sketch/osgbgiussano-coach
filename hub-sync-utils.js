(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.OSGBHubSync=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const SOURCE='campi-spogliatoi-hub';
  const clean=v=>String(v??'').trim();
  const time=v=>clean(v).slice(0,5)||null;
  const color=e=>{
    const value=`${clean(e.teamName)} ${clean(e.teamLabel)}`.toUpperCase();
    if(/GIALL/.test(value))return 'GIALLA';
    if(/BLU/.test(value))return 'BLU';
    return null;
  };
  function isValidEvent(e){
    return Boolean(e&&clean(e.sourceId)&&/^\d{4}-\d{2}-\d{2}$/.test(clean(e.date)));
  }
  function mapEvent(e,ownerUserId){
    if(!isValidEvent(e))throw new Error('Evento HUB non valido');
    const opponent=clean(e.opponent)||'Avversario da definire';
    const away=e.homeAway==='away';
    const sourceNotes=clean(e.notes);
    const field=clean(e.fieldSection);
    const notes=[sourceNotes,field?`Campo: ${field}`:'','Sincronizzato da Campi e Spogliatoi HUB'].filter(Boolean).join('\n');
    return {
      owner_user_id:ownerUserId,
      event_type:'friendly',
      title:away?`${opponent} - OSGB Giussano`:`OSGB Giussano - ${opponent}`,
      event_date:clean(e.date),
      start_time:time(e.startTime),
      meeting_time:null,
      team_color:color(e),
      opponent,
      home_away:away?'away':'home',
      venue:clean(e.venue)||null,
      address:clean(e.address)||null,
      notes:notes||null,
      external_source:SOURCE,
      external_id:clean(e.sourceId),
      external_updated_at:clean(e.updatedAt)||null,
      external_active:e.status!=='annullata'
    };
  }
  return {SOURCE,isValidEvent,mapEvent};
});
