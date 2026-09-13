(function(){
  async function loadRoster(client){
    const {data,error}=await client.from('players').select('id,first_name,last_name,birth_year,active').eq('active',true).eq('birth_year',2020).order('last_name').order('first_name');
    if(error)return;
    if(data&&data.length){
      P.splice(0,P.length,...data.map((x,i)=>({id:x.id,n:(x.first_name+' '+x.last_name).trim(),pct:0,seq:i+1})));
      S.pres=Object.fromEntries(P.map(p=>[p.id,S.pres[p.id]||'p']));
      render();
      return;
    }
    showImportPrompt(client);
  }

  function showImportPrompt(client){
    if(document.getElementById('m'))return;
    modal(`<div class="mh"><h3>IMPORTA ROSA 2020</h3></div><p class="muted">Seleziona il file Excel delle iscrizioni OSGB 2026-2027. Il file viene letto solo nel browser e vengono importati esclusivamente gli atleti con anno 2020.</p><div class="field"><label>File Excel</label><input id="rosterFile" type="file" accept=".xlsx,.xls"></div><button class="btn" id="importRosterBtn"><i data-lucide="upload"></i>Importa rosa 2020</button>`);
    document.getElementById('importRosterBtn').onclick=()=>importRoster(client);
  }

  async function importRoster(client){
    const file=document.getElementById('rosterFile')?.files?.[0];
    if(!file){alert('Seleziona il file Excel delle iscrizioni.');return}
    const btn=document.getElementById('importRosterBtn');
    btn.disabled=true;btn.textContent='Importazione in corso…';
    const inserted=[];
    try{
      const ab=await file.arrayBuffer();
      const wb=XLSX.read(ab,{type:'array'});
      const ws=wb.Sheets['ISCRIZIONI'];
      if(!ws)throw new Error('Foglio ISCRIZIONI non trovato');
      const rows=XLSX.utils.sheet_to_json(ws,{defval:null});
      const roster=rows.filter(r=>String(r['anno']??'').trim()==='2020');
      if(!roster.length)throw new Error('Nessun atleta 2020 trovato');
      const {data:{user}}=await client.auth.getUser();
      if(!user)throw new Error('Sessione non valida');

      for(const r of roster){
        const {data:player,error:pe}=await client.from('players').insert({owner_user_id:user.id,first_name:String(r['Nome ATLETA']||'').trim(),last_name:String(r['Cognome ATLETA']||'').trim(),birth_year:2020,active:true,notes:'Import Excel OSGB 2026-27'}).select('id').single();
        if(pe)throw pe;
        inserted.push(player.id);
        const contacts=[];
        const parentName=[r['Nome GENITORE'],r['Cognome GENITORE']].filter(Boolean).join(' ').trim();
        const email=r['indirizzo email']?String(r['indirizzo email']).trim():null;
        if(parentName||email)contacts.push({owner_user_id:user.id,player_id:player.id,relationship:'Genitore registrato',contact_name:parentName||null,email,is_primary:true});
        if(r['cellulare madre'])contacts.push({owner_user_id:user.id,player_id:player.id,relationship:'Madre',phone:String(r['cellulare madre']),is_primary:false});
        if(r['cellulare padre'])contacts.push({owner_user_id:user.id,player_id:player.id,relationship:'Padre',phone:String(r['cellulare padre']),is_primary:false});
        if(r['altro cellulare'])contacts.push({owner_user_id:user.id,player_id:player.id,relationship:'Altro contatto',phone:String(r['altro cellulare']),is_primary:false});
        if(contacts.length){const {error:ce}=await client.from('parent_contacts').insert(contacts);if(ce)throw ce;}
      }
      closeM();
      await loadRoster(client);
      alert('Rosa 2020 importata: '+inserted.length+' atleti.');
    }catch(err){
      if(inserted.length){await client.from('parent_contacts').delete().in('player_id',inserted);await client.from('players').delete().in('id',inserted);}
      alert('Importazione non completata: '+(err?.message||'errore sconosciuto'));
      btn.disabled=false;btn.innerHTML='<i data-lucide="upload"></i> Importa rosa 2020';icons();
    }
  }

  window.addEventListener('osgb-auth-ready',e=>loadRoster(e.detail?.client));
})();
