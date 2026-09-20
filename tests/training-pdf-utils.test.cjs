const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={globalThis:{},Date};
vm.runInNewContext(fs.readFileSync('training-pdf-utils.js','utf8'),context);
const api=context.globalThis.osgbTrainingPdf;

test('recognizes Italian numeric and written dates',()=>{
  assert.equal(api.parseDate('Data: 18/09/2026'),'2026-09-18');
  assert.equal(api.parseDate('Seduta del 7 ottobre 2026'),'2026-10-07');
  assert.equal(api.parseDate('31/02/2026'),'');
});

test('turns one PDF page into one session with multiple exercises',()=>{
  const page=`Data: 18/09/2026\nTitolo: Tecnica e duelli\nDurata: 65 minuti\nObiettivo: conduzione e 1 contro 1\nBambini: 18\nIstruttori: 3\n1. Attivazione 10 min\nGuida libera della palla\n2. Duelli 1 contro 1 - 20 minuti\nTre corsie di gioco\n3. Partita finale 15 min\nGioco libero`;
  const result=api.parsePage(page,2,2026);
  assert.equal(result.session_date,'2026-09-18');
  assert.equal(result.title,'Tecnica e duelli');
  assert.equal(result.duration_minutes,65);
  assert.equal(result.player_count,18);
  assert.equal(result.coach_count,3);
  assert.equal(result.structure.length,3);
  assert.deepEqual(Array.from(result.structure,x=>x.duration_minutes),[10,20,15]);
});

test('keeps a page importable when its date is missing',()=>{
  const result=api.parsePage('Titolo: Seduta senza data\nRiscaldamento 12 min\nPalla ciascuno',1,2026);
  assert.equal(result.session_date,'');
  assert.equal(result.structure.length,1);
});
