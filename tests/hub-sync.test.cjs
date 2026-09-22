const test=require('node:test');
const assert=require('node:assert/strict');
const {SOURCE,isValidEvent,mapEvent}=require('../hub-sync-utils.js');

test('riconosce solo eventi HUB con identificativo e data ISO',()=>{
  assert.equal(isValidEvent({sourceId:'m1',date:'2026-10-03'}),true);
  assert.equal(isValidEvent({sourceId:'',date:'2026-10-03'}),false);
  assert.equal(isValidEvent({sourceId:'m1',date:'03/10/2026'}),false);
});

test('mappa una amichevole casalinga GIALLA senza perdere i dettagli',()=>{
  const row=mapEvent({sourceId:'m1',date:'2026-10-03',startTime:'15:30:00',status:'confermata',opponent:'Aurora',homeAway:'home',venue:'OSGB Giussano',address:'Via Mameli, 9',fieldSection:'Campo A',notes:'Ritrovo anticipato',updatedAt:'2026-09-22T10:00:00Z',teamName:'Primi calci 2020 GIALLA'},'u1');
  assert.equal(row.external_source,SOURCE);
  assert.equal(row.external_id,'m1');
  assert.equal(row.title,'OSGB Giussano - Aurora');
  assert.equal(row.team_color,'GIALLA');
  assert.equal(row.start_time,'15:30');
  assert.match(row.notes,/Campo A/);
  assert.equal(row.external_active,true);
});

test('mappa trasferta BLU e nasconde una gara annullata',()=>{
  const row=mapEvent({sourceId:'m2',date:'2026-10-10',status:'annullata',opponent:'Robur',homeAway:'away',teamLabel:'2020 Blu'},'u1');
  assert.equal(row.title,'Robur - OSGB Giussano');
  assert.equal(row.home_away,'away');
  assert.equal(row.team_color,'BLU');
  assert.equal(row.external_active,false);
});
