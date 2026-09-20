(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function cleanDiagram(svgText){
    if(!svgText)return'';
    try{
      const doc=new DOMParser().parseFromString(svgText,'image/svg+xml');
      const svg=doc.documentElement;
      svg.removeAttribute('id');
      svg.removeAttribute('onclick');
      svg.removeAttribute('style');
      svg.setAttribute('class','saved-diagram');
      svg.setAttribute('role','img');
      svg.setAttribute('aria-label','Schema grafico esercizio');
      svg.querySelectorAll('[onclick]').forEach(n=>n.removeAttribute('onclick'));
      return new XMLSerializer().serializeToString(svg);
    }catch(_){return'';}
  }

  window.backToExerciseDraft=function(){
    const d=window.__exerciseDraft||{};
    const svg=document.getElementById('diagramCanvas');
    if(svg)window.__diagramSvg=cleanDiagram(svg.outerHTML)||window.__diagramSvg||null;
    if(typeof window.openExerciseImportDraft==='function')window.openExerciseImportDraft(d);
  };

  const originalImportImage=window.importExerciseImage;
  window.importExerciseImage=function(){
    if(typeof originalImportImage==='function')originalImportImage();
    const input=document.getElementById('imgExerciseFile');
    if(input){
      input.removeAttribute('capture');
      input.setAttribute('accept','image/jpeg,image/png,image/webp');
    }
    const field=input?.closest('.field');
    if(field&&!field.querySelector('.image-choice-hint')){
      const hint=document.createElement('small');
      hint.className='muted image-choice-hint';
      hint.textContent='Su smartphone puoi scegliere una foto dalla galleria oppure usare la fotocamera.';
      field.appendChild(hint);
    }
  };

  window.openExerciseSource=function(url){
    try{
      const u=new URL(String(url||''));
      if(!/^https?:$/.test(u.protocol))throw new Error();
      window.open(u.href,'_blank','noopener,noreferrer');
    }catch(_){alert('Link della fonte non valido.');}
  };

  window.openExerciseDetail=async function(id){
    const items=Array.isArray(window.osgbExerciseLibrary)?window.osgbExerciseLibrary:[];
    const x=items.find(v=>String(v.id)===String(id));if(!x)return;
    const client=typeof window.osgbGetExerciseClient==='function'?window.osgbGetExerciseClient():null;
    let sourceImage='';
    if(client){
      const images=window.osgbExerciseImport.sourceImages(x);
      const blocks=await Promise.all(images.map(async(image,i)=>{
        try{
          const {data}=await client.storage.from('exercise-images').createSignedUrl(image.path,3600);
          const pdf=image.type==='application/pdf'||/\.pdf$/i.test(image.name||'');
          return data?.signedUrl?(pdf?`<div class="card exercise-source-card" style="margin-top:12px"><b>📄 PDF originale</b><p class="muted">${esc(image.name||'Documento PDF')}</p><button class="btn alt" onclick='openExerciseSource(${esc(JSON.stringify(String(data.signedUrl)))})'><i data-lucide="file-text"></i>Apri PDF</button></div>`:`<div class="card exercise-source-card" style="margin-top:12px"><b>Immagine originale ${images.length>1?i+1:''}</b><img src="${esc(data.signedUrl)}" alt="${esc(image.name||'Fonte esercizio')}" class="exercise-source-image"></div>`):'<p class="muted">Allegato originale non disponibile.</p>';
        }catch(_){return '<p class="muted">Immagine originale non disponibile.</p>';}
      }));
      sourceImage=blocks.join('');
    }
    const diagramSafe=cleanDiagram(x.diagram_svg||'');
    const diagram=diagramSafe?`<div class="card exercise-diagram-card" style="margin-top:12px"><b>Schema grafico ricreato</b><div class="exercise-diagram-wrap">${diagramSafe}</div></div>`:'';
    const source=x.source_url?`<div class="card" style="margin-top:12px"><b>${x.source_type==='instagram'?'📱 Instagram':'Fonte web'}</b><p class="muted exercise-source-url">${esc(x.source_url)}</p><button class="btn alt" onclick='openExerciseSource(${esc(JSON.stringify(String(x.source_url)))})'><i data-lucide="external-link"></i>Apri fonte</button></div>`:'';
    closeM();
    modal(`<div class="mh"><h3>${esc(x.title)}</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><p><span class="pill">${esc(x.category||'Esercizio')}</span> <span class="pill yellow">${window.osgbExerciseImport.sourceLabel(x.source_type)}</span></p><p class="muted">${x.duration_minutes?x.duration_minutes+' min':''}${x.objective?' · '+esc(x.objective):''}</p>${x.space?`<p><b>Spazio:</b> ${esc(x.space)}</p>`:''}${x.equipment?`<p><b>Materiale:</b> ${esc(x.equipment)}</p>`:''}${x.description?`<p class="exercise-description">${esc(x.description)}</p>`:''}${x.variants?`<p class="muted"><b>Varianti:</b> ${esc(x.variants)}</p>`:''}${x.notes?`<p class="exercise-description"><b>Note:</b> ${esc(x.notes)}</p>`:''}${sourceImage}${diagram}${source}${x.source_ocr_text?`<details class="card" style="margin-top:12px"><summary>Testo trascritto</summary><p class="exercise-description">${esc(x.source_ocr_text)}</p></details>`:''}`);
  };
})();
