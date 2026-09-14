(function(){
  let client=null,user=null,templates=[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fields=['{SQUADRA}','{DATA}','{AVVERSARIO}','{LUOGO}','{INDIRIZZO}','{RITROVO}','{INIZIO}','{CONVOCATI}','{NUM_CONVOCATI}'];

  async function loadTemplates(){
    if(!client)return;
    const {data,error}=await client.from('whatsapp_templates').select('id,name,body,is_default,created_at,updated_at').order('is_default',{ascending:false}).order('name',{ascending:true});
    if(error){console.error('whatsapp templates load',error);return;}
    templates=data||[];
    window.osgbWhatsAppTemplates=templates.map(x=>({...x}));
  }

  function editor(t){
    const x=t||{};
    closeM();
    modal(`<div class="mh"><h3>${x.id?'MODIFICA MODELLO':'NUOVO MODELLO'}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <div class="field"><label>Nome modello</label><input id="wtName" value="${esc(x.name||'')}"></div>
      <div class="field"><label>Testo</label><textarea id="wtBody" style="min-height:300px" placeholder="Scrivi qui il messaggio, emoji comprese…">${esc(x.body||'')}</textarea></div>
      <div class="card"><b>Campi automatici</b><p class="muted">Tocca un campo per inserirlo nel testo.</p><div style="display:flex;gap:6px;flex-wrap:wrap">${fields.map(f=>`<button class="btn alt" type="button" onclick='insertWhatsAppField(${JSON.stringify(f)})'>${f}</button>`).join('')}</div></div>
      <label style="display:flex;gap:8px;align-items:center;margin:14px 0"><input id="wtDefault" type="checkbox" ${x.is_default?'checked':''}> Imposta come predefinito</label>
      <button class="btn" id="saveWtBtn" onclick='saveWhatsAppTemplate(${x.id?JSON.stringify(String(x.id)):'null'})'><i data-lucide="save"></i>Salva modello</button>`);
  }

  window.insertWhatsAppField=function(field){
    const ta=document.getElementById('wtBody');if(!ta)return;
    const start=ta.selectionStart??ta.value.length,end=ta.selectionEnd??start;
    ta.value=ta.value.slice(0,start)+field+ta.value.slice(end);
    ta.focus();ta.selectionStart=ta.selectionEnd=start+field.length;
  };

  window.openWhatsAppTemplates=function(){
    const list=templates.length?templates.map(t=>`<div class="card" style="margin-top:10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h3 style="margin:0">${esc(t.name)}</h3>${t.is_default?'<span class="pill">PREDEFINITO</span>':''}</div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn alt" onclick='editWhatsAppTemplate(${JSON.stringify(String(t.id))})'><i data-lucide="pencil"></i>Modifica</button><button class="btn alt" onclick='duplicateWhatsAppTemplate(${JSON.stringify(String(t.id))})'><i data-lucide="copy"></i>Duplica</button><button class="btn alt" onclick='setDefaultWhatsAppTemplate(${JSON.stringify(String(t.id))})'><i data-lucide="star"></i>Predefinito</button><button class="btn alt" onclick='deleteWhatsAppTemplate(${JSON.stringify(String(t.id))})'><i data-lucide="trash-2"></i>Elimina</button></div></div><div class="msg" style="margin-top:10px;max-height:180px;overflow:auto">${esc(t.body)}</div></div>`).join(''):`<div class="card"><p class="muted">Nessun modello salvato. Crea il primo modello personalizzato.</p></div>`;
    modal(`<div class="mh"><h3>MODELLI WHATSAPP</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><button class="btn" onclick="newWhatsAppTemplate()"><i data-lucide="plus"></i>Nuovo modello</button><p class="muted">Puoi usare emoji liberamente e i campi automatici verranno sostituiti con i dati della gara.</p>${list}`);
  };

  window.newWhatsAppTemplate=function(){editor(null)};
  window.editWhatsAppTemplate=function(id){const t=templates.find(x=>String(x.id)===String(id));if(t)editor(t)};

  window.saveWhatsAppTemplate=async function(id){
    if(!client||!user)return;
    const name=document.getElementById('wtName')?.value.trim();
    const body=document.getElementById('wtBody')?.value||'';
    const makeDefault=!!document.getElementById('wtDefault')?.checked;
    if(!name||!body.trim()){alert('Inserisci nome e testo del modello.');return;}
    const btn=document.getElementById('saveWtBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    let rowId=id;
    if(id){
      const {error}=await client.from('whatsapp_templates').update({name,body,updated_at:new Date().toISOString()}).eq('id',id);
      if(error){alert('Impossibile aggiornare il modello.');if(btn){btn.disabled=false;btn.textContent='Salva modello';}return;}
    }else{
      const {data,error}=await client.from('whatsapp_templates').insert({owner_user_id:user.id,name,body}).select('id').single();
      if(error){alert('Impossibile salvare il modello.');if(btn){btn.disabled=false;btn.textContent='Salva modello';}return;}
      rowId=data.id;
    }
    if(makeDefault&&rowId)await client.rpc('osgb_set_default_whatsapp_template',{p_template_id:rowId});
    await loadTemplates();closeM();openWhatsAppTemplates();
  };

  window.duplicateWhatsAppTemplate=async function(id){
    const t=templates.find(x=>String(x.id)===String(id));if(!t||!client||!user)return;
    const {error}=await client.from('whatsapp_templates').insert({owner_user_id:user.id,name:t.name+' - copia',body:t.body,is_default:false});
    if(error){alert('Impossibile duplicare il modello.');return;}
    await loadTemplates();closeM();openWhatsAppTemplates();
  };

  window.setDefaultWhatsAppTemplate=async function(id){
    if(!client)return;
    const {error}=await client.rpc('osgb_set_default_whatsapp_template',{p_template_id:id});
    if(error){alert('Impossibile impostare il modello predefinito.');return;}
    await loadTemplates();closeM();openWhatsAppTemplates();
  };

  window.deleteWhatsAppTemplate=async function(id){
    const t=templates.find(x=>String(x.id)===String(id));if(!t||!confirm(`Eliminare il modello "${t.name}"?`))return;
    const {error}=await client.from('whatsapp_templates').delete().eq('id',id);
    if(error){alert('Impossibile eliminare il modello.');return;}
    await loadTemplates();closeM();openWhatsAppTemplates();
  };

  window.osgbGetDefaultWhatsAppTemplate=function(){return templates.find(x=>x.is_default)||null;};
  window.osgbGetWhatsAppTemplates=function(){return templates.map(x=>({...x}));};

  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client||null;if(!client)return;const {data}=await client.auth.getUser();user=data?.user||null;if(user)await loadTemplates();});
})();