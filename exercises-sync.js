(function(){
  let client=null,user=null,items=[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const sourceLabel=value=>window.osgbExerciseImport.sourceLabel(value);

  function expose(){
    window.osgbExerciseLibrary=items.map(x=>({...x}));
    window.dispatchEvent(new CustomEvent('osgb-exercises-updated',{detail:{count:items.length}}));
  }

  async function loadExercises(){
    if(!client)return;
    const {data,error}=await client.from('exercises').select('id,title,category,duration_minutes,objective,space,equipment,description,variants,notes,source_images,source_type,source_url,diagram,diagram_svg,source_image_path,source_image_name,source_ocr_text,imported_at,created_at').order('created_at',{ascending:false});
    if(error){console.error('exercise load',error);return;}
    items=data||[];
    expose();
  }

  window.osgbReloadExercises=loadExercises;
  window.osgbGetExerciseClient=()=>client;
  window.osgbGetExerciseUser=()=>user;

  window.osgbArchiveAiExercises=async function(structure){
    if(!client||!user||!Array.isArray(structure))return 0;
    const candidates=[];
    const add=(x,duration)=>{
      if(!x||!(x.source==='ai'||x.ai_generated===true))return;
      const title=String(x.title||'').trim();if(!title)return;
      candidates.push({
        owner_user_id:user.id,
        title,
        category:window.osgbExerciseImport.normalizeCategory(x.category,x.title,x.objective,x.description),
        duration_minutes:Number(x.duration_minutes||duration)||null,
        objective:x.objective||null,
        space:x.space||null,
        equipment:window.osgbExerciseImport.normalizeEquipment(x.equipment)||null,
        description:x.description||null,
        variants:x.variants||null,
        source_type:'ai',
        imported_at:new Date().toISOString()
      });
    };
    structure.forEach(b=>{
      add(b,b?.duration_minutes);
      if(Array.isArray(b?.stations))b.stations.forEach(s=>add(s,s?.duration_minutes||b?.rotation_minutes));
    });
    if(!candidates.length)return 0;
    const known=new Set(items.map(x=>[norm(x.title),norm(x.objective),norm(x.description)].join('|')));
    const rows=[];
    candidates.forEach(x=>{
      const key=[norm(x.title),norm(x.objective),norm(x.description)].join('|');
      if(!known.has(key)){known.add(key);rows.push(x);}
    });
    if(!rows.length)return 0;
    const {error}=await client.from('exercises').insert(rows);
    if(error){console.warn('AI exercise archive',error);return 0;}
    await loadExercises();
    return rows.length;
  };

  window.exercises=function(filter){
    filter=filter||window.__exerciseFilter||'all';window.__exerciseFilter=filter;
    const counts={all:items.length,ai:0,manual:0,image:0,web:0};
    items.forEach(x=>{const k=['ai','manual','image','web'].includes(x.source_type)?x.source_type:'manual';counts[k]++;});
    const visible=filter==='all'?items:items.filter(x=>(x.source_type||'manual')===filter);
    const tabs=[
      ['all','Tutti',counts.all],
      ['ai','✨ AI',counts.ai],
      ['manual','Manuali',counts.manual],
      ['image','Immagini',counts.image],
      ['web','Web',counts.web]
    ].map(([k,label,n])=>`<button class="btn ${filter===k?'':'alt'}" style="padding:7px 10px" onclick="exercises('${k}')">${label} · ${n}</button>`).join('');
    const list=visible.length?visible.map(x=>{
      const src=sourceLabel(x.source_type);
      return `<div class="card" style="margin-top:10px"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill">${esc(x.category||'Esercizio')}</span><span class="pill yellow">${src}</span>${x.diagram_svg?'<span class="pill">Schema grafico</span>':''}</div><h3>${esc(x.title)}</h3><p class="muted">${x.duration_minutes?x.duration_minutes+' min · ':''}${esc(x.objective||'')}</p>${x.description?`<p>${esc(x.description)}</p>`:''}${x.variants?`<p class="muted"><b>Varianti:</b> ${esc(x.variants)}</p>`:''}<button class="btn alt" onclick='openExerciseDetail(${JSON.stringify(String(x.id))})'><i data-lucide="eye"></i>Apri</button></div>`;
    }).join(''):`<div class="card" style="margin-top:10px"><p class="muted">${filter==='ai'?'Nessun esercizio AI ancora salvato. Gli esercizi generati automaticamente verranno aggiunti qui quando salvi una seduta.':'Nessun esercizio in questa categoria.'}</p></div>`;
    modal(`<div class="mh"><h3>ARCHIVIO ESERCIZI</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn" onclick="newExercise()"><i data-lucide="plus"></i>Nuovo manuale</button><button class="btn alt" onclick="importExerciseImage()"><i data-lucide="image-plus"></i>Importa da immagine</button><button class="btn alt" onclick="importExerciseWeb()"><i data-lucide="globe-2"></i>Importa dal web</button></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${tabs}</div>${list}`);
  };
  window.openExerciseDetail=async function(id){
    const x=items.find(v=>String(v.id)===String(id));if(!x)return;
    let sourceImage='';
    if(x.source_image_path&&client){const {data}=await client.storage.from('exercise-images').createSignedUrl(x.source_image_path,3600);if(data?.signedUrl)sourceImage=`<div class="card" style="margin-top:12px"><b>Immagine originale</b><img src="${esc(data.signedUrl)}" alt="Fonte esercizio" style="display:block;width:100%;max-height:360px;object-fit:contain;margin-top:8px;border-radius:12px"></div>`;}
    const diagram=x.diagram_svg?`<div class="card" style="margin-top:12px"><b>Schema grafico ricreato</b><div style="margin-top:8px">${x.diagram_svg}</div></div>`:'';
    modal(`<div class="mh"><h3>${esc(x.title)}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p><span class="pill">${esc(x.category||'Esercizio')}</span> <span class="pill yellow">${sourceLabel(x.source_type)}</span></p><p class="muted">${x.duration_minutes?x.duration_minutes+' min':''}${x.objective?' · '+esc(x.objective):''}</p>${x.space?`<p><b>Spazio:</b> ${esc(x.space)}</p>`:''}${x.equipment?`<p><b>Materiale:</b> ${esc(x.equipment)}</p>`:''}${x.description?`<p>${esc(x.description)}</p>`:''}${x.variants?`<p class="muted"><b>Varianti:</b> ${esc(x.variants)}</p>`:''}${sourceImage}${diagram}${x.source_url?`<p class="muted"><b>Fonte web:</b> ${esc(x.source_url)}</p>`:''}`);
  };

  window.newExercise=function(){
    closeM();
    modal(`<div class="mh"><h3>NUOVO ESERCIZIO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <div class="field"><label>Titolo</label><input id="exTitle"></div>
      <div class="field"><label>Categoria</label><input id="exCategory" placeholder="Conduzione, 1 contro 1, coordinazione..."></div>
      <div class="field"><label>Durata</label><input id="exDuration" type="number" min="1" value="10"></div>
      <div class="field"><label>Obiettivo</label><input id="exObjective"></div>
      <div class="field"><label>Spazio</label><input id="exSpace" placeholder="20x20 m"></div>
      <div class="field"><label>Materiale</label><input id="exEquipment" placeholder="Cinesini, palloni, porticine..."></div>
      <div class="field"><label>Descrizione</label><textarea id="exDescription"></textarea></div>
      <div class="field"><label>Varianti</label><textarea id="exVariants"></textarea></div>
      <button class="btn" id="saveExerciseBtn" onclick="saveExercise()"><i data-lucide="save"></i>Salva esercizio</button>`);
  };

  window.saveExercise=async function(){
    if(!client||!user)return;
    const title=document.getElementById('exTitle')?.value.trim();
    if(!title){alert('Inserisci il titolo.');return;}
    const btn=document.getElementById('saveExerciseBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const objective=document.getElementById('exObjective')?.value.trim()||'',description=document.getElementById('exDescription')?.value.trim()||'';const row={owner_user_id:user.id,title,category:window.osgbExerciseImport.normalizeCategory(document.getElementById('exCategory')?.value,title,objective,description),duration_minutes:parseInt(document.getElementById('exDuration')?.value||'0',10)||null,objective:objective||null,space:document.getElementById('exSpace')?.value.trim()||null,equipment:window.osgbExerciseImport.normalizeEquipment(document.getElementById('exEquipment')?.value)||null,description:description||null,variants:document.getElementById('exVariants')?.value.trim()||null,source_type:'manual'};
    const {error}=await client.from('exercises').insert(row);
    if(error){console.error('exercise save',error);alert('Impossibile salvare l’esercizio.');if(btn){btn.disabled=false;btn.textContent='Salva esercizio';}return;}
    await loadExercises();closeM();exercises();
  };

  window.addEventListener('osgb-auth-ready',async e=>{
    client=e.detail?.client;if(!client)return;
    const {data}=await client.auth.getUser();user=data?.user||null;
    await loadExercises();
  });
})();
