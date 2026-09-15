(function(){
  let client=null,user=null,candidates=[];
  const norm=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ' ).trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const pick=(row,names)=>{const keys=Object.keys(row||{});for(const wanted of names){const k=keys.find(x=>norm(x)===norm(wanted));if(k!=null&&row[k]!=null)return row[k];}return '';};
  function ensureXlsx(){if(window.XLSX)return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Lettore Excel non disponibile'));document.head.appendChild(s);});}
  function existingKeys(){return new Set(P.map(p=>norm(p.n)));}
  function sourceKey(row,first,last){const receipt=String(pick(row,['n. ricevuta','ricevuta','numero ricevuta'])||'').trim();return receipt||`2020:${norm(last)}:${norm(first)}`;}
  async function parseWorkbook(file){
    await ensureXlsx();
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array',cellDates:true});
    const ws=wb.Sheets['ISCRIZIONI']||wb.Sheets[wb.SheetNames[0]];
    if(!ws)throw new Error('Foglio ISCRIZIONI non trovato');
    const rows=XLSX.utils.sheet_to_json(ws,{defval:''});
    const current=existingKeys();
    const list=[];
    for(const r of rows){
      const year=Number(pick(r,['anno','Anno'])); if(year!==2020)continue;
      const first=String(pick(r,['Nome ATLETA','Nome atleta','nome atleta'])||'').trim();
      const last=String(pick(r,['Cognome ATLETA','Cognome atleta','cognome atleta'])||'').trim();
      if(!first||!last)continue;
      const name=norm(`${first} ${last}`);
      list.push({first_name:first,last_name:last,birth_year:2020,key:sourceKey(r,first,last),exists:current.has(name)});
    }
    const unique=[];const seen=new Set();for(const x of list){const k=norm(`${x.first_name} ${x.last_name}`);if(seen.has(k))continue;seen.add(k);unique.push(x);}return unique;
  }
  window.openRosterSync=function(){
    modal(`<div class="mh"><h3>SINCRONIZZA BAMBINI</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">Seleziona il file Excel aggiornato delle iscrizioni. Su smartphone puoi sceglierlo anche direttamente da Google Drive. Verranno considerati solo i nati nel 2020.</p>
      <div class="field"><label>File iscrizioni</label><input id="rosterSyncFile" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onchange="checkRosterFile(this)"></div>
      <div id="rosterSyncStatus" class="muted">Rosa attuale: ${P.length} bambini.</div>`);
  };
  window.checkRosterFile=async function(input){
    const file=input?.files?.[0];if(!file)return;const status=document.getElementById('rosterSyncStatus');
    try{if(status)status.textContent='Controllo iscrizioni…';candidates=await parseWorkbook(file);const fresh=candidates.filter(x=>!x.exists);localStorage.setItem('osgbRosterLastSync',new Date().toISOString());renderRosterComparison(fresh);}catch(e){console.error(e);if(status)status.textContent='Impossibile leggere il file. Verifica che sia l’Excel delle iscrizioni OSGB.';}
  };
  function renderRosterComparison(fresh){
    const present=candidates.length-fresh.length;
    const rows=fresh.length?fresh.map((x,i)=>`<label class="player" style="cursor:pointer"><input type="checkbox" class="syncChild" data-i="${i}" checked style="width:18px;height:18px"><div class="meta"><b>${esc(x.first_name)} ${esc(x.last_name)}</b><br><small>Nuovo bambino 2020</small></div><span class="pill yellow">NUOVO</span></label>`).join(''):'<div class="card yellow" style="margin-top:10px"><b>Nessun nuovo bambino</b><p class="muted">La rosa è già allineata al file iscrizioni.</p></div>';
    const html=`<div class="mh"><h3>RISULTATO SINCRONIZZAZIONE</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><div class="grid g3"><div class="card"><div class="muted">ISCRITTI 2020</div><div class="kpi">${candidates.length}</div></div><div class="card"><div class="muted">GIÀ PRESENTI</div><div class="kpi">${present}</div></div><div class="card yellow"><div class="muted">NUOVI</div><div class="kpi">${fresh.length}</div></div></div>${rows}${fresh.length?`<button class="btn" id="importNewChildrenBtn" style="margin-top:12px" onclick="importNewChildren()"><i data-lucide="user-plus"></i>Importa selezionati</button>`:''}<p class="muted" style="margin-top:10px">La sincronizzazione non elimina mai automaticamente bambini già presenti.</p>`;
    closeM();modal(html);window.__newRosterCandidates=fresh;
  }
  window.importNewChildren=async function(){
    if(!client||!user)return;const fresh=window.__newRosterCandidates||[];const selected=[...document.querySelectorAll('.syncChild:checked')].map(el=>fresh[Number(el.dataset.i)]).filter(Boolean);if(!selected.length){alert('Seleziona almeno un bambino.');return;}
    const btn=document.getElementById('importNewChildrenBtn');if(btn){btn.disabled=true;btn.textContent='Importazione…';}
    const rows=selected.map(x=>({owner_user_id:user.id,first_name:x.first_name,last_name:x.last_name,birth_year:2020,active:true,source_system:'iscrizioni_2026_2027',source_key:x.key,source_synced_at:new Date().toISOString()}));
    const {error}=await client.from('players').insert(rows);
    if(error){console.error(error);alert('Impossibile importare i nuovi bambini. Nessun dato è stato eliminato.');if(btn){btn.disabled=false;btn.textContent='Importa selezionati';}return;}
    if(typeof window.osgbReloadRoster==='function')await window.osgbReloadRoster();closeM();alert(`${selected.length} ${selected.length===1?'bambino importato':'bambini importati'}.`);go('team');
  };
  function addButton(){if(S.r!=='team'||document.getElementById('rosterSyncBtn'))return;const cards=[...document.querySelectorAll('main .card')];const target=cards.find(c=>c.textContent.includes('Le squadre vengono composte'));if(!target)return;const b=document.createElement('button');b.id='rosterSyncBtn';b.className='btn alt';b.style.marginLeft='8px';b.innerHTML='<i data-lucide="refresh-cw"></i>Sincronizza bambini';b.onclick=window.openRosterSync;const primary=target.querySelector('.btn');if(primary)primary.insertAdjacentElement('afterend',b);else target.appendChild(b);if(window.lucide)lucide.createIcons();}
  const oldRender=window.render;window.render=function(){oldRender.apply(this,arguments);requestAnimationFrame(addButton);};
  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client||null;if(!client)return;const {data}=await client.auth.getUser();user=data?.user||null;requestAnimationFrame(addButton);});
})();