(function(){
  let client=null,user=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function lib(){return Array.isArray(window.osgbExerciseLibrary)?window.osgbExerciseLibrary:[];}
  const sourceLabel=value=>window.osgbExerciseImport.sourceLabel(value);
  function diagramPreview(svgText){
    if(!svgText)return'';
    try{
      const doc=new DOMParser().parseFromString(svgText,'image/svg+xml'),svg=doc.documentElement;
      if(svg.nodeName.toLowerCase()!=='svg')return'';
      svg.removeAttribute('id');svg.removeAttribute('onclick');svg.removeAttribute('style');
      svg.setAttribute('class','saved-diagram');svg.setAttribute('role','img');svg.setAttribute('aria-label','Rappresentazione grafica di questo esercizio');
      svg.querySelectorAll('script,foreignObject,[onclick]').forEach(node=>node.remove());
      return new XMLSerializer().serializeToString(svg);
    }catch(_){return'';}
  }
  const previewImage=x=>window.osgbExerciseImport.sourceImages(x).find(image=>image.type!=='application/pdf'&&!/\.pdf$/i.test(image.name||''));
  async function hydrateImagePreviews(rows){
    if(!client)return;
    await Promise.all(rows.map(async x=>{
      if(x.diagram_svg)return;
      const image=previewImage(x),box=[...document.querySelectorAll('[data-exercise-preview]')].find(node=>node.dataset.exercisePreview===String(x.id));if(!image||!box)return;
      try{
        const {data}=await client.storage.from('exercise-images').createSignedUrl(image.path,3600);
        if(data?.signedUrl&&box.isConnected)box.innerHTML=`<img src="${esc(data.signedUrl)}" alt="Rappresentazione grafica di ${esc(x.title)}">`;
      }catch(_){/* Il segnaposto resta visibile. */}
    }));
  }
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
      <div class="field"><label for="exaNotes">Note</label><textarea id="exaNotes">${esc(x.notes||'')}</textarea></div>
      <button class="btn" onclick='saveExerciseAdmin(${JSON.stringify(String(x.id))})'><i data-lucide="save"></i>Aggiorna esercizio</button>`);
  };
  window.saveExerciseAdmin=async function(id){
    if(!client||!user)return;
    const title=document.getElementById('exaTitle')?.value.trim()||'',objective=document.getElementById('exaObjective')?.value.trim()||'',description=document.getElementById('exaDescription')?.value.trim()||'';const row={title,category:window.osgbExerciseImport.normalizeCategory(document.getElementById('exaCategory')?.value,title,objective,description),duration_minutes:parseInt(document.getElementById('exaDuration')?.value||'0',10)||null,objective:objective||null,space:document.getElementById('exaSpace')?.value.trim()||null,equipment:window.osgbExerciseImport.normalizeEquipment(document.getElementById('exaEquipment')?.value)||null,description:description||null,variants:document.getElementById('exaVariants')?.value.trim()||null,notes:document.getElementById('exaNotes')?.value.trim()||null};
    if(!row.title){alert('Inserisci il titolo.');return;}
    const {error}=await client.from('exercises').update(row).eq('id',id);
    if(error){console.error(error);alert('Impossibile aggiornare l’esercizio.');return;}
    if(typeof window.osgbReloadExercises==='function')await window.osgbReloadExercises();closeM();exercises();
  };
  window.deleteExerciseAdmin=async function(id){
    const x=lib().find(v=>String(v.id)===String(id));if(!x||!confirm(`Eliminare l’esercizio "${x.title}"?`))return;
    const {error}=await client.from('exercises').delete().eq('id',id);
    if(error){console.error(error);alert('Impossibile eliminare l’esercizio.');return;}
    const paths=window.osgbExerciseImport.sourceImages(x).map(image=>image.path);
    if(paths.length){const rm=await client.storage.from('exercise-images').remove(paths);if(rm.error)console.warn('Immagini non rimosse',rm.error);}
    if(typeof window.osgbReloadExercises==='function')await window.osgbReloadExercises();closeM();exercises();
  };
  window.exercises=function(filter){
    filter=filter||window.__exerciseFilter||'all';window.__exerciseFilter=filter;
    const items=lib(),search=String(window.__exerciseSearch||'').trim().toLowerCase(),category=window.__exerciseCategory||'all';
    const counts={all:items.length,ai:0,local:0,manual:0,image:0,pdf:0,web:0,instagram:0};
    items.forEach(x=>{const k=window.osgbExerciseImport.sourceType(x.source_type);counts[k]++;});
    const sourceItems=filter==='all'?items:items.filter(x=>window.osgbExerciseImport.sourceType(x.source_type)===filter);
    const visible=sourceItems.filter(x=>(category==='all'||String(x.category||'Senza categoria')===category)&&(!search||[x.title,x.category,x.objective,x.description,x.equipment].some(v=>String(v||'').toLowerCase().includes(search))));
    const categories=[...new Set(items.map(x=>String(x.category||'Senza categoria')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'));
    const categoryOptions=['all',...categories].map(v=>`<option value="${esc(v)}" ${category===v?'selected':''}>${v==='all'?'Tutte le categorie':esc(v)}</option>`).join('');
    const tabs=[
      ['all','Tutti',counts.all],['ai','✨ AI',counts.ai],['local','⚙️ App',counts.local],['image','📷 Immagini',counts.image],['pdf','📄 PDF',counts.pdf],['web','🌐 Web',counts.web],['instagram','📱 Instagram',counts.instagram],['manual','✍️ Manuali',counts.manual]
    ].map(([k,label,n])=>`<button class="btn ${filter===k?'':'alt'}" style="padding:7px 10px" onclick="exercises('${k}')">${label} · ${n}</button>`).join('');
    const list=visible.length?visible.map(x=>{
      const src=sourceLabel(x.source_type);
      const preview=diagramPreview(x.diagram_svg),image=previewImage(x),visual=preview||image;
      return `<div class="card exercise-library-card">${visual?`<button class="exercise-library-diagram${preview?'':' exercise-library-diagram-empty'}" type="button" data-exercise-preview="${esc(x.id)}" aria-label="Apri ${esc(x.title)}" onclick='openExerciseDetail(${JSON.stringify(String(x.id))})'>${preview||'<i data-lucide="image"></i><span>Caricamento grafica…</span>'}</button>`:`<div class="exercise-library-diagram exercise-library-diagram-empty"><i data-lucide="goal"></i><span>Rappresentazione grafica non disponibile</span></div>`}<div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill">${esc(x.category||'Esercizio')}</span><span class="pill yellow">${src}</span>${visual?'<span class="pill">Schema grafico</span>':''}</div><h3>${esc(x.title)}</h3><p class="muted">${x.duration_minutes?x.duration_minutes+' min · ':''}${esc(x.objective||'')}</p>${x.description?`<p>${esc(x.description)}</p>`:''}<div class="row exercise-card-actions"><button class="btn alt" onclick='openExerciseDetail(${JSON.stringify(String(x.id))})'><i data-lucide="eye"></i>Apri</button><button class="btn alt" onclick='editExerciseAdmin(${JSON.stringify(String(x.id))})'><i data-lucide="pencil"></i>Modifica</button><button class="btn alt" onclick='deleteExerciseAdmin(${JSON.stringify(String(x.id))})'><i data-lucide="trash-2"></i>Elimina</button></div></div>`;
    }).join(''):`<div class="card" style="margin-top:10px"><p class="muted">${filter==='ai'?'Nessun esercizio ChatGPT ancora salvato.':filter==='local'?'Nessun esercizio generato localmente ancora salvato.':'Nessun esercizio in questa categoria.'}</p></div>`;
    closeM();
    modal(`<div class="exercise-library-head"><div class="mh"><h3>ARCHIVIO ESERCIZI</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><div class="exercise-library-tools"><div class="field exercise-search"><label>Cerca esercizio</label><div class="exercise-search-box"><i data-lucide="search"></i><input id="exerciseLibrarySearch" value="${esc(window.__exerciseSearch||'')}" placeholder="Titolo, obiettivo, descrizione o materiale…" oninput="setExerciseSearch(this.value)"></div></div><div class="field"><label>Categoria</label><select onchange="setExerciseCategory(this.value)">${categoryOptions}</select></div></div><div class="exercise-import-actions"><button class="btn yellow" onclick="openAiExerciseGenerator()"><i data-lucide="sparkles"></i>Genera esercizio</button><button class="btn" onclick="newExercise()"><i data-lucide="plus"></i>Nuovo manuale</button><button class="btn alt" onclick="importExerciseImage()"><i data-lucide="image-plus"></i>Immagine</button><button class="btn alt" onclick="importExercisePdf()"><i data-lucide="file-text"></i>PDF</button><button class="btn alt" onclick="importExerciseInstagram()"><i data-lucide="instagram"></i>Instagram</button><button class="btn alt" onclick="importExerciseChatgpt()"><i data-lucide="message-square-text"></i>ChatGPT</button><button class="btn alt" onclick="importExerciseWeb()"><i data-lucide="globe-2"></i>Web</button></div><div class="exercise-source-tabs">${tabs}</div><p class="muted exercise-result-count">${visible.length} esercizi visualizzati su ${items.length}</p></div><div class="exercise-library-grid">${list}</div>`);
    document.querySelector('#m .sheet')?.classList.add('exercise-library-sheet');
    hydrateImagePreviews(visible);
  };
  window.setExerciseSearch=function(value){window.__exerciseSearch=value;exercises(window.__exerciseFilter);setTimeout(()=>{const el=document.getElementById('exerciseLibrarySearch');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}},0);};
  window.setExerciseCategory=function(value){window.__exerciseCategory=value||'all';exercises(window.__exerciseFilter);};
  window.addEventListener('osgb-auth-ready',async e=>{client=e.detail?.client;if(!client)return;const {data}=await client.auth.getUser();user=data?.user||null;});
})();
