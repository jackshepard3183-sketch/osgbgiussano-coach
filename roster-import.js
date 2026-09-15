(function(){
  let client=null,user=null,candidates=[],dbPlayers=[],dbContacts=[];
  const SOURCE='iscrizioni_2026_2027';
  const norm=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const pick=(row,names)=>{const keys=Object.keys(row||{});for(const wanted of names){const k=keys.find(x=>norm(x)===norm(wanted));if(k!=null&&row[k]!=null)return row[k];}return '';};
  const cleanPhone=v=>String(v||'').replace(/\D/g,'');
  const cleanEmail=v=>String(v||'').trim().toLowerCase();
  const fullName=(f,l)=>`${String(f||'').trim()} ${String(l||'').trim()}`.trim();
  function ensureXlsx(){if(window.XLSX)return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Lettore Excel non disponibile'));document.head.appendChild(s);});}
  function sourceKey(row,first,last){const receipt=String(pick(row,['n. ricevuta','ricevuta','numero ricevuta'])||'').trim();return receipt||`2020:${norm(last)}:${norm(first)}`;}
  function contactRows(row){
    const parent=fullName(pick(row,['Nome GENITORE']),pick(row,['Cognome GENITORE']))||'Genitore';
    const email=cleanEmail(pick(row,['indirizzo email','email']));
    const phones=[cleanPhone(pick(row,['cellulare madre'])),cleanPhone(pick(row,['cellulare padre'])),cleanPhone(pick(row,['altro cellulare']))].filter(Boolean);
    const out=[];
    if(email||phones[0])out.push({contact_name:parent,relationship:'Genitore',phone:phones[0]||null,email:email||null,is_primary:true});
    if(phones[1]&&phones[1]!==phones[0])out.push({contact_name:parent,relationship:'Secondo contatto',phone:phones[1],email:null,is_primary:false});
    if(phones[2]&&!phones.slice(0,2).includes(phones[2]))out.push({contact_name:parent,relationship:'Altro contatto',phone:phones[2],email:null,is_primary:false});
    return out;
  }
  async function loadDb(){
    if(!client||!user)return;
    const [{data:p,error:pe},{data:c,error:ce}]=await Promise.all([
      client.from('players').select('id,first_name,last_name,birth_year,active,source_key,source_system,source_missing,source_synced_at,source_last_seen_at').eq('birth_year',2020),
      client.from('parent_contacts').select('id,player_id,contact_name,relationship,phone,email,is_primary,source_system,source_synced_at')
    ]);
    if(pe)throw pe;if(ce)throw ce;dbPlayers=p||[];dbContacts=c||[];
  }
  async function parseWorkbook(file){
    await ensureXlsx();await loadDb();
    const buf=await file.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:true});const ws=wb.Sheets['ISCRIZIONI']||wb.Sheets[wb.SheetNames[0]];if(!ws)throw new Error('Foglio ISCRIZIONI non trovato');
    const rows=XLSX.utils.sheet_to_json(ws,{defval:''}),byName=new Map(dbPlayers.map(p=>[norm(fullName(p.first_name,p.last_name)),p])),bySource=new Map(dbPlayers.filter(p=>p.source_key).map(p=>[String(p.source_key),p]));
    const list=[],seen=new Set();
    for(const r of rows){
      if(Number(pick(r,['anno','Anno']))!==2020)continue;
      const first=String(pick(r,['Nome ATLETA'])||'').trim(),last=String(pick(r,['Cognome ATLETA'])||'').trim();if(!first||!last)continue;
      const key=sourceKey(r,first,last),nk=norm(fullName(first,last));if(seen.has(nk))continue;seen.add(nk);
      const player=bySource.get(key)||byName.get(nk)||null;
      list.push({first_name:first,last_name:last,birth_year:2020,key,player,contacts:contactRows(r),raw:r});
    }
    return list;
  }
  function compareContacts(x){
    if(!x.player)return x.contacts.length;
    const current=dbContacts.filter(c=>String(c.player_id)===String(x.player.id));let n=0;
    for(const s of x.contacts){
      const match=current.find(c=>(s.is_primary&&c.is_primary)||norm(c.relationship)===norm(s.relationship));
      if(!match||cleanPhone(match.phone)!==cleanPhone(s.phone)||cleanEmail(match.email)!==cleanEmail(s.email)||norm(match.contact_name)!==norm(s.contact_name))n++;
    }
    return n;
  }
  window.openRosterSync=function(){
    const last=localStorage.getItem('osgbRosterLastSync');
    modal(`<div class="mh"><h3>SINCRONIZZA BAMBINI</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p class="muted">Seleziona l’Excel aggiornato delle iscrizioni. Verranno confrontati rosa e contatti dei nati 2020; nessun bambino viene eliminato automaticamente.</p><div class="field"><label>File iscrizioni</label><input id="rosterSyncFile" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onchange="checkRosterFile(this)"></div><div class="card" style="margin-top:10px"><b>Rosa attuale</b><div class="kpi">${P.length}</div><p class="muted">Ultimo controllo: ${last?new Date(last).toLocaleString('it-IT'):'mai'}</p></div><div id="rosterSyncStatus" class="muted" style="margin-top:10px"></div>`);
  };
  window.checkRosterFile=async function(input){
    const file=input?.files?.[0];if(!file)return;const status=document.getElementById('rosterSyncStatus');
    try{if(status)status.textContent='Controllo iscrizioni e contatti…';candidates=await parseWorkbook(file);localStorage.setItem('osgbRosterLastSync',new Date().toISOString());renderRosterComparison();}catch(e){console.error(e);if(status)status.textContent='Impossibile leggere il file. Verifica che sia l’Excel delle iscrizioni OSGB.';}
  };
  function renderRosterComparison(){
    const fresh=candidates.filter(x=>!x.player),present=candidates.filter(x=>x.player),sourceNames=new Set(candidates.map(x=>norm(fullName(x.first_name,x.last_name))));
    const missing=dbPlayers.filter(p=>p.active!==false&&!sourceNames.has(norm(fullName(p.first_name,p.last_name))));
    const contactChanges=present.reduce((n,x)=>n+compareContacts(x),0);
    const freshRows=fresh.length?fresh.map((x,i)=>`<label class="player"><input type="checkbox" class="syncChild" data-i="${i}" checked><div class="meta"><b>${esc(fullName(x.first_name,x.last_name))}</b><br><small>${x.contacts.length} contatti sorgente</small></div><span class="pill yellow">NUOVO</span></label>`).join(''):'<p class="muted">Nessun nuovo bambino.</p>';
    const missingRows=missing.length?`<div class="section">DA VERIFICARE</div>${missing.map(p=>`<div class="player"><div class="meta"><b>${esc(fullName(p.first_name,p.last_name))}</b><br><small>Presente nell’app ma non nella fonte corrente</small></div><span class="pill yellow">VERIFICA</span></div>`).join('')}`:'';
    closeM();modal(`<div class="mh"><h3>RISULTATO SINCRONIZZAZIONE</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><div class="grid g4"><div class="card"><div class="muted">ISCRITTI 2020</div><div class="kpi">${candidates.length}</div></div><div class="card"><div class="muted">GIÀ PRESENTI</div><div class="kpi">${present.length}</div></div><div class="card yellow"><div class="muted">NUOVI</div><div class="kpi">${fresh.length}</div></div><div class="card"><div class="muted">CONTATTI VARIATI</div><div class="kpi">${contactChanges}</div></div></div><div class="section">NUOVI BAMBINI</div>${freshRows}${missingRows}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${fresh.length?`<button class="btn" id="importNewChildrenBtn" onclick="importNewChildren()"><i data-lucide="user-plus"></i>Importa nuovi</button>`:''}<button class="btn alt" id="syncContactsBtn" onclick="syncRosterContacts()"><i data-lucide="contact-round"></i>Sincronizza contatti e stato</button></div><p class="muted">La sincronizzazione aggiorna i dati sorgente e segnala le anomalie, ma non elimina automaticamente nessuno.</p>`);window.__newRosterCandidates=fresh;window.__missingRosterPlayers=missing;
  }
  async function mergeContacts(playerId,sourceContacts){
    const current=dbContacts.filter(c=>String(c.player_id)===String(playerId));
    for(const s of sourceContacts){
      const match=current.find(c=>(s.is_primary&&c.is_primary)||norm(c.relationship)===norm(s.relationship));
      const row={owner_user_id:user.id,player_id:playerId,contact_name:s.contact_name,relationship:s.relationship,phone:s.phone,email:s.email,is_primary:!!s.is_primary,source_system:SOURCE,source_synced_at:new Date().toISOString()};
      if(match){const {error}=await client.from('parent_contacts').update(row).eq('id',match.id);if(error)throw error;}
      else {const {error}=await client.from('parent_contacts').insert(row);if(error)throw error;}
    }
  }
  window.importNewChildren=async function(){
    if(!client||!user)return;const fresh=window.__newRosterCandidates||[];const selected=[...document.querySelectorAll('.syncChild:checked')].map(el=>fresh[Number(el.dataset.i)]).filter(Boolean);if(!selected.length){alert('Seleziona almeno un bambino.');return;}
    const btn=document.getElementById('importNewChildrenBtn');if(btn){btn.disabled=true;btn.textContent='Importazione…';}
    try{
      for(const x of selected){const {data,error}=await client.from('players').insert({owner_user_id:user.id,first_name:x.first_name,last_name:x.last_name,birth_year:2020,active:true,source_system:SOURCE,source_key:x.key,source_synced_at:new Date().toISOString(),source_last_seen_at:new Date().toISOString(),source_missing:false}).select('id').single();if(error)throw error;await mergeContacts(data.id,x.contacts);}
      await loadDb();if(typeof window.osgbReloadRoster==='function')await window.osgbReloadRoster();alert(`${selected.length} ${selected.length===1?'bambino importato':'bambini importati'} con i contatti disponibili.`);closeM();go('team');
    }catch(e){console.error(e);alert('Importazione non completata. Nessun bambino esistente è stato eliminato.');if(btn){btn.disabled=false;btn.textContent='Importa nuovi';}}
  };
  window.syncRosterContacts=async function(){
    if(!client||!user||!candidates.length)return;const btn=document.getElementById('syncContactsBtn');if(btn){btn.disabled=true;btn.textContent='Sincronizzazione…';}
    try{
      const seenIds=[];
      for(const x of candidates.filter(x=>x.player)){seenIds.push(x.player.id);await client.from('players').update({source_system:SOURCE,source_key:x.key,source_synced_at:new Date().toISOString(),source_last_seen_at:new Date().toISOString(),source_missing:false}).eq('id',x.player.id);await mergeContacts(x.player.id,x.contacts);}
      const missing=window.__missingRosterPlayers||[];for(const p of missing){await client.from('players').update({source_missing:true,source_synced_at:new Date().toISOString()}).eq('id',p.id);}
      localStorage.setItem('osgbRosterLastSync',new Date().toISOString());await loadDb();if(typeof window.osgbReloadRoster==='function')await window.osgbReloadRoster();alert(`Sincronizzazione completata. ${missing.length} ${missing.length===1?'bambino da verificare':'bambini da verificare'}.`);closeM();go('team');
    }catch(e){console.error(e);alert('Impossibile completare la sincronizzazione.');if(btn){btn.disabled=false;btn.textContent='Sincronizza contatti e stato';}}
  };
  function addButton(){if(S.r!=='team'||document.getElementById('rosterSyncBtn'))return;const target=[...document.querySelectorAll('main .card')].find(c=>c.textContent.includes('Le squadre vengono composte'));if(!target)return;const b=document.createElement('button');b.id='rosterSyncBtn';b.className='btn alt';b.style.marginLeft='8px';const last=localStorage.getItem('osgbRosterLastSync'),stale=!last||Date.now()-new Date(last).getTime()>7*86400000;b.innerHTML=`<i data-lucide="refresh-cw"></i>${stale?'Controlla nuovi bambini':'Sincronizza bambini'}`;b.onclick=window.openRosterSync;const primary=target.querySelector('.btn');if(primary)primary.insertAdjacentElement('afterend',b);else target.appendChild(b);if(window.lucide)lucide.createIcons();}
  const oldRender=window.render;window.render=function(){oldRender.apply(this,arguments);requestAnimationFrame(addButton);};
  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client||null;if(!client)return;const {data}=await client.auth.getUser();user=data?.user||null;try{await loadDb();}catch(_){}requestAnimationFrame(addButton);});
})();