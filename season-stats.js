(function(){
  let client=null,stats={trainings:0,matches:0,blu:0,gialla:0,minutes:0,attendanceAvg:null};
  const seasonStart='2026-09-10',seasonEnd='2027-06-30';
  async function loadStats(){
    if(!client)return;
    const [{data:events},{data:sessions},{data:attendance}]=await Promise.all([
      client.from('events').select('id,event_date,event_type,team_color').gte('event_date',seasonStart).lte('event_date',seasonEnd),
      client.from('training_sessions').select('duration_minutes,session_date').gte('session_date',seasonStart).lte('session_date',seasonEnd),
      client.from('attendance').select('status,events!inner(event_date)').gte('events.event_date',seasonStart).lte('events.event_date',seasonEnd)
    ]);
    const ev=events||[];
    const trainingDates=new Set(ev.filter(x=>x.event_type==='training'&&x.event_date).map(x=>String(x.event_date)));
    stats.trainings=trainingDates.size;
    const games=ev.filter(x=>x.event_type!=='training');
    stats.matches=games.length;
    stats.blu=games.filter(x=>x.team_color==='BLU').length;
    stats.gialla=games.filter(x=>x.team_color==='GIALLA').length;
    stats.minutes=(sessions||[]).reduce((n,x)=>n+(Number(x.duration_minutes)||0),0);
    const rows=attendance||[];
    if(rows.length){const attended=rows.filter(x=>x.status==='present'||x.status==='late').length;stats.attendanceAvg=Math.round(attended/rows.length*100);}else stats.attendanceAvg=null;
    window.osgbSeasonStats={...stats};
    if(S.r==='home'&&typeof window.home==='function')render();
  }
  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client||null;if(client)await loadStats();});
  window.osgbReloadSeasonStats=loadStats;
})();