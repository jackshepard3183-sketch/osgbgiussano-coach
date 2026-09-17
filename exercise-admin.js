(function(){
  let client=null,user=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function lib(){return Array.isArray(window.osgbExerciseLibrary)?window.osgbExerciseLibrary:[];}
  const sourceLabel=t=>t==='image'?'📷 Immagine':t==='web'?'🌐 Web':t==='ai'?'✨ AI':'✍️ Manuale';
  window.editExerciseAdmin=function(id){
    const x=lib().find(v=>String(v.id)===String(id));if(!x)return;
    closeM();
    modal(`<div class="mh"><h3>MODIFICA ESERCIZIO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <div class="field"><label>Titolo</label><input id="exaTitle" value="${esc(x.title||'')}"></div>
      <div class="field"><label>Categoria</label><input id="exaCategory" value="${esc(x.category||'')}"></div>
      <div class="field"><label>Durata</label><input id="exaDuration" type="number" min="1" value="${Number(x.duration_minutes)||10}"></div>
      <div class="field"><label>Obiettivo</label><input id="exaObjective" value="${esc(x.objective||'')}"></div>
      <div class="field"><label>Spazio</label><input id="exaSpace" value="${esc(x.space||'')}"></div>
      <div class="field"><label>Materiale</label><input id="exaEquipment" value="${esc(x.equipment||'')}"></div>
      <div class="field"><label>Descrizione</label><textarea id="exaDescription">${esc(x.description||'')}</textarea></div>
      <div class="field"><label>Varianti</label><textarea id="exaVariants">${esc(x.variants||'')}</textarea></div>
      <button class="btn" onclick='saveExerciseAdmin(${JSON.stringify(String(x.id))})'><i data-lucide="save"></i>Aggiorna esercizio</button>`);
  };
  window.saveExerciseAdmin=async function(id){
    if(!client||!user)return;
    const row={title:document.getElementById('exaTitle')?.value.trim()||'',category:document.getElementById('exaCategory')?.value.trim()||null,duration_minutes:parseInt(document.getElementById('exaDuration')?.value||'0',10)||null,objective:document.getElementById('exaObjective')?.value.trim()||null,space:document.getElementById('exaSpace')?.value.trim()||null,equipment:document.getElementById('exaEquipment')?.value.trim()||null,description:document.getElementById('exaDescription')?.value.trim()||null,variants:document.getElementById('exaVariants')?.value.trim()||null};
    if(!row.title){alert('Inserisci il titolo.');return;}
    const {error}=await client.from('exercises').update(row).eq('id',id);
    if(error){console.error(error);alert('Impossibile aggiornare l’esercizio.');return;}
    if(typeof window.osgbReloadExercises==='function')await window.osgbReloadExercises();closeM();exercises();
  };
  window.deleteExerciseAdmin=async function(id){
    const x=lib().find(v=>String(v.id)===String(id));if(!x||!confirm(`Eliminare l’esercizio "${x.title}"?`))return;
    const {error}=await client.from('exercises').delete().eq('id',id);
    if(error){console.error(error);alert('Impossibile eliminare l’esercizio.');return;}
    if(x.source_image_path){const rm=await client.storage.from('exercise-images').remove([x.source_image_path]);if(rm.error)console.warn('Immagine non rimossa',rm.error);}
    if(typeof window.osgbReloadExercises==='function')await window.osgbReloadExercises();closeM();exercises();
  };
  window.exercises=function(){
    const items=lib();
    const list=items.length?items.map(x=>{
      const src=sourceLabel(x.source_type);
      return `<div class="card" style="margin-top:10px"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill">${esc(x.category||'Esercizio')}</span><span class="pill yellow">${src}</span>${x.diagram_svg?'<span class="pill">Schema grafico</span>':''}</div><h3>${esc(x.title)}</h3><p class="muted">${x.duration_minutes?x.duration_minutes+' min · ':''}${esc(x.objective||'')}</p>${x.description?`<p>${esc(x.description)}</p>`:''}<div class="row" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn alt" onclick='openExerciseDetail(${JSON.stringify(String(x.id))})'><i data-lucide="eye"></i>Apri</button><button class="btn alt" onclick='editExerciseAdmin(${JSON.stringify(String(x.id))})'><i data-lucide="pencil"></i>Modifica</button><button class="btn alt" onclick='deleteExerciseAdmin(${JSON.stringify(String(x.id))})'><i data-lucide="trash-2"></i>Elimina</button></div></div>`;
    }).join(''):`<p class="muted">Nessun esercizio salvato.</p>`;
    modal(`<div class="mh"><h3>ARCHIVIO ESERCIZI</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="newExercise()"><i data-lucide="plus"></i>Nuovo manuale</button><button class="btn yellow" onclick="importExerciseImage()"><i data-lucide="image-plus"></i>Importa da immagine</button><button class="btn alt" onclick="importExerciseWeb()"><i data-lucide="globe-2"></i>Importa dal web</button></div>${list}`);
  };
  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client;if(!client)return;const {data}=await client.auth.getUser();user=data?.user||null;});
})();