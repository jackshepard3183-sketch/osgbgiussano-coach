(function(){
  var draft=null;
  var lastPrompt='';
  var draftImageFile=null;
  var draftImageUrl=null;

  function esc(s){
    return String(s==null?'':s).replace(/[&<>"']/g,function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
    });
  }
  function val(id){
    var el=document.getElementById(id);
    return el&&typeof el.value==='string'?el.value.trim():'';
  }
  function safe(s){
    return String(s||'image').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'image';
  }
  function clearDraftImage(){
    if(draftImageUrl){try{URL.revokeObjectURL(draftImageUrl);}catch(e){}}
    draftImageFile=null;
    draftImageUrl=null;
  }
  function formData(){
    return {
      players:Math.max(1,Number(val('aiPlayers')||17)),
      coaches:Math.max(1,Number(val('aiCoaches')||3)),
      duration_minutes:Math.max(5,Number(val('aiDuration')||10)),
      objective:val('aiObjective')||'Conduzione e 1 contro 1',
      difficulty:val('aiDifficulty')||'Base',
      space:val('aiSpace')||'Mezza campo a 7',
      equipment:val('aiEquipment')||'Palloni, cinesini, porticine',
      notes:val('aiNotes')
    };
  }

  window.previewAiExerciseImage=function(input){
    var file=input&&input.files&&input.files[0];
    if(!file)return;
    if(file.size>5*1024*1024){alert('L’immagine supera 5 MB.');input.value='';return;}
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){alert('Usa un’immagine JPG, PNG o WEBP.');input.value='';return;}
    clearDraftImage();
    draftImageFile=file;
    draftImageUrl=URL.createObjectURL(file);
    var box=document.getElementById('aiImagePreview');
    if(box){
      box.innerHTML='<img src="'+draftImageUrl+'" alt="Anteprima schema esercizio" style="display:block;width:100%;max-height:360px;object-fit:contain;border-radius:12px;margin:8px 0"><button class="btn alt" type="button" onclick="removeAiExerciseImage()"><i data-lucide="trash-2"></i>Rimuovi immagine</button>';
    }
    if(window.lucide)window.lucide.createIcons();
  };

  window.removeAiExerciseImage=function(){
    clearDraftImage();
    var input=document.getElementById('aiExerciseImage');
    if(input)input.value='';
    var box=document.getElementById('aiImagePreview');
    if(box)box.innerHTML='<p class="muted">Nessuna immagine selezionata.</p>';
  };

  window.openAiExerciseGenerator=function(){
    clearDraftImage();
    var players=(typeof P!=='undefined'&&Array.isArray(P)&&P.length)?P.length:17;
    closeM();
    modal('<div class="mh"><h3>GENERA ESERCIZIO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>'+
      '<p class="muted">Genera gratuitamente un esercizio nell’app oppure prepara il prompt per ChatGPT.</p>'+
      '<div class="field"><label>Obiettivo</label><select id="aiObjective"><option>Conduzione e 1 contro 1</option><option>Coordinazione</option><option>Passaggio e ricezione</option><option>Finalizzazione</option><option>Gioco e collaborazione</option><option>Attivazione motoria</option></select></div>'+
      '<div class="grid g2"><div class="field"><label>Bambini</label><input id="aiPlayers" type="number" min="1" max="40" value="'+players+'"></div><div class="field"><label>Istruttori</label><input id="aiCoaches" type="number" min="1" max="10" value="3"></div></div>'+
      '<div class="grid g2"><div class="field"><label>Durata</label><select id="aiDuration"><option value="8">8 min</option><option value="10" selected>10 min</option><option value="12">12 min</option><option value="15">15 min</option><option value="20">20 min</option></select></div><div class="field"><label>Difficoltà</label><select id="aiDifficulty"><option>Base</option><option>Intermedia</option><option>Avanzata</option></select></div></div>'+
      '<div class="field"><label>Spazio disponibile</label><input id="aiSpace" value="Mezza campo a 7"></div>'+
      '<div class="field"><label>Materiale</label><input id="aiEquipment" value="Palloni, cinesini, porticine"></div>'+
      '<div class="field"><label>Indicazioni aggiuntive</label><textarea id="aiNotes" placeholder="Es. senza eliminazioni, molto dinamico, variante per 3 bambini più avanti..."></textarea></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn yellow" type="button" onclick="generateLocalExercise()"><i data-lucide="wand-sparkles"></i>Genera gratis nell’app</button><button class="btn alt" type="button" onclick="prepareChatGptExercise()"><i data-lucide="message-circle"></i>Usa ChatGPT</button></div>');
  };

  function localDraft(d){
    var bank={
      'Conduzione e 1 contro 1':{
        title:'Semaforo e duello nella porticina',
        category:'Conduzione / 1 contro 1',
        description:'Ogni bambino conduce palla liberamente nello spazio. Al segnale cambia direzione o velocità. Nella seconda fase si formano coppie: un attaccante prova a superare il compagno e portare palla in una porticina. Rotazioni rapide e nessuna eliminazione.',
        variants:'1) Brevi tratti con piede debole. 2) Cambio di direzione prima del duello. 3) Per i più avanti: difensore leggermente avvantaggiato.'
      },
      'Coordinazione':{
        title:'Percorso motorio con uscita palla',
        category:'Coordinazione',
        description:'Percorso breve con cinesini: corsa, cambio direzione, piccolo slalom e arrivo su un pallone. Il bambino completa il percorso, prende palla e conduce fino alla porticina. Usa più corsie per ridurre le attese.',
        variants:'1) Cambia tipo di corsa. 2) Inserisci un arresto-equilibrio. 3) Per i più avanti: conduzione finale solo con piede indicato.'
      },
      'Passaggio e ricezione':{
        title:'Passa, segui e cambia posto',
        category:'Passaggio e ricezione',
        description:'Crea piccoli triangoli o quadrati. Il bambino passa al compagno e segue il proprio passaggio cambiando posizione. L’obiettivo è ricevere orientati e tenere il pallone sempre in movimento.',
        variants:'1) Due tocchi. 2) Ricezione verso spazio libero. 3) Per i più avanti: finta prima del passaggio.'
      },
      'Finalizzazione':{
        title:'Conduci e tira nella porticina',
        category:'Finalizzazione',
        description:'Ogni bambino parte con palla, supera 2-3 cinesini e conclude in una porticina. Dopo il tiro recupera il pallone e rientra lateralmente. Usa più file corte.',
        variants:'1) Tiro dopo cambio direzione. 2) Tiro con piede indicato. 3) Per i più avanti: difensore passivo nell’ultima parte.'
      },
      'Gioco e collaborazione':{
        title:'Porta il pallone a casa',
        category:'Gioco e collaborazione',
        description:'Dividi i bambini in piccoli gruppi con una zona-casa. I palloni sono al centro: a turno un bambino ne porta uno nella propria casa conducendo. Poi introduci un passaggio tra compagni prima di portarlo a casa. Nessuna eliminazione.',
        variants:'1) Cambia modalità di conduzione. 2) Obbligo di un passaggio. 3) Per i più avanti: un avversario può intercettare.'
      },
      'Attivazione motoria':{
        title:'Acchiappa colori',
        category:'Attivazione motoria',
        description:'Disponi cinesini di colori diversi. I bambini si muovono liberamente senza palla; al colore chiamato raggiungono rapidamente un cinesino di quel colore. Nella seconda parte introduci la palla.',
        variants:'1) Cambia tipo di corsa. 2) Fa chiamare il colore a un bambino. 3) Per i più avanti: raggiungere il colore con palla e piede indicato.'
      }
    };
    var x=bank[d.objective]||bank['Conduzione e 1 contro 1'];
    return {
      title:x.title,
      category:x.category,
      duration_minutes:d.duration_minutes,
      objective:d.objective,
      space:d.space,
      equipment:d.equipment,
      description:x.description+' Organizzazione: '+d.players+' bambini, '+d.coaches+' istruttori, livello '+String(d.difficulty).toLowerCase()+'.'+(d.notes?' '+d.notes:''),
      variants:x.variants,
      source_type:'local'
    };
  }

  window.generateLocalExercise=function(){
    draft=localDraft(formData());
    window.openAiExerciseDraft(draft,'local');
  };

  function buildPrompt(d){
    return 'Preparami UN esercizio per OSGB Giussano Scuola Calcio, bambini nati nel 2020.\n\n'+
      'Dati:\n'+
      '- bambini: '+d.players+'\n'+
      '- istruttori: '+d.coaches+'\n'+
      '- durata: '+d.duration_minutes+' minuti\n'+
      '- obiettivo: '+d.objective+'\n'+
      '- spazio: '+d.space+'\n'+
      '- materiale: '+d.equipment+'\n'+
      '- difficoltà: '+d.difficulty+'\n'+
      (d.notes?'- indicazioni aggiuntive: '+d.notes+'\n':'')+
      '\nDeve essere semplice, divertente, senza eliminazioni e con poche attese. Inserisci una variante più difficile per i bambini più avanti.\n\n'+
      'Rispondi ESATTAMENTE con questo formato:\n'+
      'TITOLO: ...\nCATEGORIA: ...\nDURATA: ... minuti\nOBIETTIVO: ...\nSPAZIO: ...\nMATERIALE: ...\nDESCRIZIONE: ...\nVARIANTI: ...';
  }

  window.prepareChatGptExercise=async function(){
    lastPrompt=buildPrompt(formData());
    var copied=false;
    try{await navigator.clipboard.writeText(lastPrompt);copied=true;}catch(e){}
    closeM();
    modal('<div class="mh"><h3>USA CHATGPT</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>'+
      '<p class="muted">'+(copied?'Il prompt è già stato copiato.':'Copia il prompt qui sotto.')+' Apri ChatGPT, incollalo e poi torna nell’app con la risposta.</p>'+
      '<div class="field"><label>Prompt</label><textarea id="chatGptPrompt" style="min-height:220px">'+esc(lastPrompt)+'</textarea></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button class="btn alt" type="button" onclick="copyChatGptPrompt()"><i data-lucide="copy"></i>Copia prompt</button><a class="btn yellow" href="https://chatgpt.com/" target="_blank" rel="noopener"><i data-lucide="external-link"></i>Apri ChatGPT</a></div>'+
      '<div class="field"><label>Incolla qui la risposta di ChatGPT</label><textarea id="chatGptAnswer" style="min-height:220px" placeholder="TITOLO: ..."></textarea></div>'+
      '<button class="btn" type="button" onclick="importChatGptExercise()"><i data-lucide="download"></i>Importa risposta</button>');
  };

  window.copyChatGptPrompt=async function(){
    var text=val('chatGptPrompt')||lastPrompt;
    try{await navigator.clipboard.writeText(text);alert('Prompt copiato.');}
    catch(e){alert('Seleziona il testo e copialo manualmente.');}
  };

  function parseAnswer(text){
    var labels=['TITOLO','CATEGORIA','DURATA','OBIETTIVO','SPAZIO','MATERIALE','DESCRIZIONE','VARIANTI'];
    var out={};
    for(var i=0;i<labels.length;i++){
      var label=labels[i];
      var next=labels.slice(i+1).join('|');
      var re=next?new RegExp(label+'\\s*:\\s*([\\s\\S]*?)(?=\\n(?:'+next+')\\s*:|$)','i'):new RegExp(label+'\\s*:\\s*([\\s\\S]*)$','i');
      var m=text.match(re);
      out[label]=m?m[1].trim():'';
    }
    var dur=parseInt((out.DURATA.match(/\d+/)||['10'])[0],10);
    return {
      title:out.TITOLO||'Esercizio da ChatGPT',
      category:out.CATEGORIA||'Scuola Calcio',
      duration_minutes:dur||10,
      objective:out.OBIETTIVO,
      space:out.SPAZIO,
      equipment:out.MATERIALE,
      description:out.DESCRIZIONE,
      variants:out.VARIANTI,
      source_type:'ai'
    };
  }

  window.importChatGptExercise=function(){
    var text=val('chatGptAnswer');
    if(!text){alert('Incolla prima la risposta di ChatGPT.');return;}
    draft=parseAnswer(text);
    window.openAiExerciseDraft(draft,'ai');
  };

  window.openAiExerciseDraft=function(d,source){
    draft=d||draft;
    if(!draft)return;
    draft.source_type=source||draft.source_type||'local';
    closeM();
    var label=draft.source_type==='ai'?'✨ AI · ChatGPT':'⚙️ Generato app';
    modal('<div class="mh"><h3>ANTEPRIMA ESERCIZIO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>'+
      '<p><span class="pill yellow">'+label+'</span></p>'+
      '<div class="field"><label>Titolo</label><input id="aiDTitle" value="'+esc(draft.title||'')+'"></div>'+
      '<div class="grid g2"><div class="field"><label>Categoria</label><input id="aiDCategory" value="'+esc(draft.category||'')+'"></div><div class="field"><label>Durata</label><input id="aiDDuration" type="number" min="1" value="'+(Number(draft.duration_minutes)||10)+'"></div></div>'+
      '<div class="field"><label>Obiettivo</label><input id="aiDObjective" value="'+esc(draft.objective||'')+'"></div>'+
      '<div class="field"><label>Spazio</label><input id="aiDSpace" value="'+esc(draft.space||'')+'"></div>'+
      '<div class="field"><label>Materiale</label><input id="aiDEquipment" value="'+esc(draft.equipment||'')+'"></div>'+
      '<div class="field"><label>Descrizione</label><textarea id="aiDDescription" style="min-height:170px">'+esc(draft.description||'')+'</textarea></div>'+
      '<div class="field"><label>Varianti</label><textarea id="aiDVariants" style="min-height:110px">'+esc(draft.variants||'')+'</textarea></div>'+
      '<div class="section">IMMAGINE / SCHEMA</div>'+
      '<div class="card"><p class="muted">Puoi caricare una grafica generata con ChatGPT o qualsiasi schema dell’esercizio. JPG, PNG o WEBP · max 5 MB.</p><div class="field"><label>Carica immagine</label><input id="aiExerciseImage" type="file" accept="image/jpeg,image/png,image/webp" onchange="previewAiExerciseImage(this)"></div><div id="aiImagePreview"><p class="muted">Nessuna immagine selezionata.</p></div></div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn alt" type="button" onclick="openAiExerciseGenerator()"><i data-lucide="arrow-left"></i>Indietro</button><button class="btn" type="button" id="aiSaveBtn" onclick="saveAiExercise()"><i data-lucide="save"></i>Salva nell’archivio</button></div>');
  };

  window.saveAiExercise=async function(){
    var client=window.osgbGetExerciseClient?window.osgbGetExerciseClient():null;
    var user=window.osgbGetExerciseUser?window.osgbGetExerciseUser():null;
    if(!client||!user){alert('Connessione non disponibile.');return;}

    var title=val('aiDTitle');
    if(!title){alert('Inserisci il titolo.');return;}

    var btn=document.getElementById('aiSaveBtn');
    if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}

    var imagePath=null;
    if(draftImageFile){
      imagePath=user.id+'/ai-'+Date.now()+'-'+safe(draftImageFile.name);
      var up=await client.storage.from('exercise-images').upload(imagePath,draftImageFile,{cacheControl:'3600',upsert:false});
      if(up.error){
        console.error(up.error);
        alert('Impossibile caricare l’immagine.');
        if(btn){btn.disabled=false;btn.textContent='Salva nell’archivio';}
        return;
      }
    }

    var row={
      owner_user_id:user.id,
      title:title,
      category:window.osgbExerciseImport.normalizeCategory(val('aiDCategory'),title,val('aiDObjective'),val('aiDDescription')),
      duration_minutes:Number(val('aiDDuration'))||null,
      objective:val('aiDObjective')||null,
      space:val('aiDSpace')||null,
      equipment:window.osgbExerciseImport.normalizeEquipment(val('aiDEquipment'))||null,
      description:val('aiDDescription')||null,
      variants:val('aiDVariants')||null,
      source_type:draft&&draft.source_type==='ai'?'ai':'local',
      source_image_path:imagePath,
      source_image_name:draftImageFile?draftImageFile.name:null,
      imported_at:new Date().toISOString()
    };

    var ins=await client.from('exercises').insert(row);
    if(ins.error){
      if(imagePath)await client.storage.from('exercise-images').remove([imagePath]);
      console.error(ins.error);
      alert('Impossibile salvare l’esercizio.');
      if(btn){btn.disabled=false;btn.textContent='Salva nell’archivio';}
      return;
    }

    if(typeof window.osgbReloadExercises==='function')await window.osgbReloadExercises();
    window.__exerciseFilter=row.source_type==='ai'?'ai':'local';
    draft=null;
    clearDraftImage();
    closeM();
    exercises(window.__exerciseFilter);
  };
})();
