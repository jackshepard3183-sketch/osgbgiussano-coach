(function(){
  let draft=null,lastPrompt='';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const val=id=>document.getElementById(id)?.value?.trim?.()||'';

  function formData(){
    return {
      birth_year:2020,
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

  window.openAiExerciseGenerator=function(){
    const players=(typeof P!=='undefined'&&Array.isArray(P))?P.length:17;
    closeM();
    modal(`<div class="mh"><h3>GENERA ESERCIZIO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">Puoi generare gratuitamente un esercizio nell'app oppure usare ChatGPT senza collegare API a pagamento.</p>
      <div class="field"><label>Obiettivo</label><select id="aiObjective">
        <option>Conduzione e 1 contro 1</option><option>Coordinazione</option><option>Passaggio e ricezione</option><option>Finalizzazione</option><option>Gioco e collaborazione</option><option>Attivazione motoria</option>
      </select></div>
      <div class="grid g2"><div class="field"><label>Bambini</label><input id="aiPlayers" type="number" min="1" max="40" value="${players||17}"></div><div class="field"><label>Istruttori</label><input id="aiCoaches" type="number" min="1" max="10" value="3"></div></div>
      <div class="grid g2"><div class="field"><label>Durata</label><select id="aiDuration"><option value="8">8 min</option><option value="10" selected>10 min</option><option value="12">12 min</option><option value="15">15 min</option><option value="20">20 min</option></select></div><div class="field"><label>Difficoltà</label><select id="aiDifficulty"><option>Base</option><option>Intermedia</option><option>Avanzata</option></select></div></div>
      <div class="field"><label>Spazio disponibile</label><input id="aiSpace" value="Mezza campo a 7"></div>
      <div class="field"><label>Materiale</label><input id="aiEquipment" value="Palloni, cinesini, porticine"></div>
      <div class="field"><label>Indicazioni aggiuntive</label><textarea id="aiNotes" placeholder="Es. senza eliminazioni, molto dinamico, variante per 3 bambini più avanti..."></textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn yellow" onclick="generateLocalExercise()"><i data-lucide="wand-sparkles"></i>Genera gratis nell'app</button>
        <button class="btn alt" onclick="prepareChatGptExercise()"><i data-lucide="message-circle"></i>Usa ChatGPT</button>
      </div>`);
  };

  function localDraft(d){
    const obj=d.objective;
    const base={
      'Conduzione e 1 contro 1':{
        title:'Semaforo e duello nella porticina',category:'Conduzione / 1 contro 1',
        description:`Dividi lo spazio in corsie semplici. Ogni bambino conduce palla liberamente; al segnale dell'istruttore cambia direzione o velocità. Dopo alcuni passaggi, forma coppie: un attaccante prova a superare il compagno e portare palla in una porticina. Rotazioni rapide, nessuna eliminazione.`,
        variants:'1) Solo piede debole per brevi tratti. 2) Punto bonus se il cambio di direzione avviene prima del duello. 3) Per i bambini più avanti: partenza con difensore leggermente avvantaggiato.'
      },
      'Coordinazione':{
        title:'Percorso motorio con uscita palla',category:'Coordinazione',
        description:`Prepara un percorso breve con cinesini: corsa, cambio direzione, piccolo slalom e arrivo su un pallone. Il bambino completa il percorso, prende palla e conduce fino alla porticina. Ripartenze frequenti per evitare attese lunghe.`,
        variants:'1) Cambia tipo di corsa nel percorso. 2) Inserisci un arresto-equilibrio prima della palla. 3) Per i più avanti: conduzione finale solo con piede indicato.'
      },
      'Passaggio e ricezione':{
        title:'Passa, segui e cambia posto',category:'Passaggio e ricezione',
        description:`Crea piccoli triangoli o quadrati. Il bambino passa al compagno e segue il proprio passaggio cambiando posizione. L'obiettivo è ricevere orientati e mantenere il pallone sempre in movimento. Con molti bambini usa più stazioni identiche.`,
        variants:'1) Due tocchi. 2) Ricezione verso spazio libero. 3) Per i più avanti: passaggio dopo finta o cambio posizione più rapido.'
      },
      'Finalizzazione':{
        title:'Conduci e tira nella porticina',category:'Finalizzazione',
        description:`Ogni bambino parte con palla, supera 2-3 cinesini e conclude in una porticina. Dopo il tiro recupera il pallone e rientra lateralmente. Usa due o tre file corte per mantenere alta la partecipazione.`,
        variants:'1) Tiro dopo cambio direzione. 2) Tiro con piede indicato. 3) Per i più avanti: aggiungi un difensore passivo nell'ultima parte.'
      },
      'Gioco e collaborazione':{
        title:'Porta il pallone a casa',category:'Gioco e collaborazione',
        description:`Dividi i bambini in piccoli gruppi con una zona-casa. I palloni sono al centro: a turno un bambino ne porta uno nella propria casa conducendo. Nella seconda fase i compagni possono passarsi il pallone prima di portarlo a casa. Nessuna eliminazione.`,
        variants:'1) Cambia modalità di conduzione. 2) Obbligo di un passaggio prima di segnare. 3) Per i più avanti: introduci un avversario che può intercettare.'
      },
      'Attivazione motoria':{
        title:'Acchiappa colori',category:'Attivazione motoria',
        description:`Disponi cinesini di colori diversi nello spazio. I bambini si muovono liberamente senza palla; al colore chiamato devono raggiungere rapidamente un cinesino di quel colore. Nella seconda parte introduci la palla e ripeti in conduzione.`,
        variants:'1) Cambia tipo di corsa. 2) Fai chiamare il colore a un bambino. 3) Per i più avanti: raggiungere il colore con palla usando solo il piede indicato.'
      }
    }[obj]||null;
    const x=base||{title:'Gioco tecnico OSGB 2020',category:'Scuola Calcio',description:'Gioco semplice, dinamico e senza eliminazioni, organizzato in spazi ridotti con molte ripetizioni.',variants:'Aumenta o riduci spazio e pressione in base al livello.'};
    return {
      title:x.title,
      category:x.category,
      duration_minutes:d.duration_minutes,
      objective:obj,
      space:d.space,
      equipment:d.equipment,
      description:`${x.description} Organizzazione consigliata: ${d.players} bambini, ${d.coaches} istruttori, livello ${d.difficulty.toLowerCase()}.${d.notes?' Indicazioni aggiuntive: '+d.notes:''}`,
      variants:x.variants,
      source_type:'local'
    };
  }

  window.generateLocalExercise=function(){
    draft=localDraft(formData());
    openAiExerciseDraft(draft,'local');
  };

  function buildPrompt(d){
    return `Preparami UN esercizio per OSGB Giussano Scuola Calcio, bambini nati nel 2020.

Dati:
- bambini: ${d.players}
- istruttori: ${d.coaches}
- durata: ${d.duration_minutes} minuti
- obiettivo: ${d.objective}
- spazio: ${d.space}
- materiale: ${d.equipment}
- difficoltà: ${d.difficulty}
${d.notes?'- indicazioni aggiuntive: '+d.notes:''}

Deve essere semplice, divertente, senza eliminazioni e con poche attese. Inserisci anche una variante più difficile per i bambini più avanti.

Rispondi ESATTAMENTE con questo formato:
TITOLO: ...
CATEGORIA: ...
DURATA: ... minuti
OBIETTIVO: ...
SPAZIO: ...
MATERIALE: ...
DESCRIZIONE: ...
VARIANTI: ...`;
  }

  window.prepareChatGptExercise=async function(){
    lastPrompt=buildPrompt(formData());
    let copied=false;
    try{await navigator.clipboard.writeText(lastPrompt);copied=true;}catch(_){}
    closeM();
    modal(`<div class="mh"><h3>USA CHATGPT</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">${copied?'Il prompt è già stato copiato.':'Copia il prompt qui sotto.'} Apri ChatGPT, incollalo e poi torna nell'app con la risposta.</p>
      <div class="field"><label>Prompt</label><textarea id="chatGptPrompt" style="min-height:220px">${esc(lastPrompt)}</textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn alt" onclick="copyChatGptPrompt()"><i data-lucide="copy"></i>Copia prompt</button>
        <a class="btn yellow" href="https://chatgpt.com/" target="_blank" rel="noopener"><i data-lucide="external-link"></i>Apri ChatGPT</a>
      </div>
      <div class="field"><label>Incolla qui la risposta di ChatGPT</label><textarea id="chatGptAnswer" style="min-height:220px" placeholder="TITOLO: ...&#10;CATEGORIA: ...&#10;..."></textarea></div>
      <button class="btn" onclick="importChatGptExercise()"><i data-lucide="download"></i>Importa risposta</button>`);
  };

  window.copyChatGptPrompt=async function(){
    const text=document.getElementById('chatGptPrompt')?.value||lastPrompt;
    try{await navigator.clipboard.writeText(text);alert('Prompt copiato.');}
    catch(_){alert('Seleziona il testo e copialo manualmente.');}
  };

  function parseAnswer(text){
    const get=(label,nextLabels=[])=>{
      const all=[...nextLabels,'TITOLO','CATEGORIA','DURATA','OBIETTIVO','SPAZIO','MATERIALE','DESCRIZIONE','VARIANTI'];
      const stop=all.filter(x=>x!==label).join('|');
      const re=new RegExp(label+'\\s*:\\s*([\\s\\S]*?)(?=\\n(?:'+stop+')\\s*:|$)','i');
      return (text.match(re)?.[1]||'').trim();
    };
    const dur=parseInt(get('DURATA').match(/\d+/)?.[0]||'10',10);
    return {
      title:get('TITOLO')||'Esercizio da ChatGPT',
      category:get('CATEGORIA')||'Scuola Calcio',
      duration_minutes:dur||10,
      objective:get('OBIETTIVO'),
      space:get('SPAZIO'),
      equipment:get('MATERIALE'),
      description:get('DESCRIZIONE'),
      variants:get('VARIANTI'),
      source_type:'ai'
    };
  }

  window.importChatGptExercise=function(){
    const text=document.getElementById('chatGptAnswer')?.value.trim()||'';
    if(!text){alert('Incolla prima la risposta di ChatGPT.');return;}
    draft=parseAnswer(text);
    openAiExerciseDraft(draft,'ai');
  };

  window.openAiExerciseDraft=function(d,source){
    draft=d||draft;if(!draft)return;
    const type=source||draft.source_type||'local';
    draft.source_type=type;
    closeM();
    modal(`<div class="mh"><h3>ANTEPRIMA ESERCIZIO</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p><span class="pill yellow">${type==='ai'?'✨ AI · ChatGPT':'⚙️ Generato app'}</span></p>
      <div class="field"><label>Titolo</label><input id="aiDTitle" value="${esc(draft.title||'')}"></div>
      <div class="grid g2"><div class="field"><label>Categoria</label><input id="aiDCategory" value="${esc(draft.category||'')}"></div><div class="field"><label>Durata</label><input id="aiDDuration" type="number" min="1" value="${Number(draft.duration_minutes)||10}"></div></div>
      <div class="field"><label>Obiettivo</label><input id="aiDObjective" value="${esc(draft.objective||'')}"></div>
      <div class="field"><label>Spazio</label><input id="aiDSpace" value="${esc(draft.space||'')}"></div>
      <div class="field"><label>Materiale</label><input id="aiDEquipment" value="${esc(draft.equipment||'')}"></div>
      <div class="field"><label>Descrizione</label><textarea id="aiDDescription" style="min-height:170px">${esc(draft.description||'')}</textarea></div>
      <div class="field"><label>Varianti</label><textarea id="aiDVariants" style="min-height:110px">${esc(draft.variants||'')}</textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn alt" onclick="openAiExerciseGenerator()"><i data-lucide="arrow-left"></i>Indietro</button><button class="btn" id="aiSaveBtn" onclick="saveAiExercise()"><i data-lucide="save"></i>Salva nell'archivio</button></div>`);
  };

  window.saveAiExercise=async function(){
    const client=window.osgbGetExerciseClient?.(),user=window.osgbGetExerciseUser?.();
    if(!client||!user)return;
    const row={
      owner_user_id:user.id,
      title:val('aiDTitle'),
      category:val('aiDCategory')||null,
      duration_minutes:Number(val('aiDDuration'))||null,
      objective:val('aiDObjective')||null,
      space:val('aiDSpace')||null,
      equipment:val('aiDEquipment')||null,
      description:val('aiDDescription')||null,
      variants:val('aiDVariants')||null,
      source_type:draft?.source_type==='ai'?'ai':'local',
      imported_at:new Date().toISOString()
    };
    if(!row.title){alert('Inserisci il titolo.');return;}
    const btn=document.getElementById('aiSaveBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const {error}=await client.from('exercises').insert(row);
    if(error){console.error(error);alert('Impossibile salvare l’esercizio.');if(btn){btn.disabled=false;btn.textContent="Salva nell'archivio";}return;}
    if(typeof window.osgbReloadExercises==='function')await window.osgbReloadExercises();
    window.__exerciseFilter=row.source_type==='ai'?'ai':'local';draft=null;closeM();exercises(window.__exerciseFilter);
  };
})();