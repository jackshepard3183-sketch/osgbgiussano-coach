(function(){
  let draft=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const val=id=>document.getElementById(id)?.value?.trim?.()||'';

  window.openAiExerciseGenerator=function(){
    const players=Array.isArray(window.P)?window.P.length:(typeof P!=='undefined'?P.length:17);
    closeM();
    modal(`<div class="mh"><h3>GENERA ESERCIZIO CON AI</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">Crea un esercizio per la Scuola Calcio 2020 e salvalo direttamente nell'archivio.</p>
      <div class="field"><label>Obiettivo</label><select id="aiObjective">
        <option>Conduzione e 1 contro 1</option><option>Coordinazione</option><option>Passaggio e ricezione</option><option>Finalizzazione</option><option>Gioco e collaborazione</option><option>Attivazione motoria</option>
      </select></div>
      <div class="grid g2"><div class="field"><label>Bambini</label><input id="aiPlayers" type="number" min="1" max="40" value="${players||17}"></div><div class="field"><label>Istruttori</label><input id="aiCoaches" type="number" min="1" max="10" value="3"></div></div>
      <div class="grid g2"><div class="field"><label>Durata</label><select id="aiDuration"><option value="8">8 min</option><option value="10" selected>10 min</option><option value="12">12 min</option><option value="15">15 min</option><option value="20">20 min</option></select></div><div class="field"><label>Difficoltà</label><select id="aiDifficulty"><option>Base</option><option>Intermedia</option><option>Avanzata</option></select></div></div>
      <div class="field"><label>Spazio disponibile</label><input id="aiSpace" value="Mezza campo a 7"></div>
      <div class="field"><label>Materiale</label><input id="aiEquipment" value="Palloni, cinesini, porticine"></div>
      <div class="field"><label>Indicazioni aggiuntive</label><textarea id="aiNotes" placeholder="Es. senza eliminazioni, molto dinamico, variante per 3 bambini più avanti..."></textarea></div>
      <button class="btn yellow" id="aiGenerateBtn" onclick="generateAiExercise()"><i data-lucide="sparkles"></i>Genera esercizio</button>
      <div id="aiStatus" class="muted" style="margin-top:10px"></div>`);
  };

  window.generateAiExercise=async function(){
    const client=window.osgbGetExerciseClient?.();
    if(!client){alert('Connessione al database non disponibile.');return;}
    const btn=document.getElementById('aiGenerateBtn'),status=document.getElementById('aiStatus');
    const body={
      birth_year:2020,
      players:Number(val('aiPlayers')||17),
      coaches:Number(val('aiCoaches')||3),
      duration_minutes:Number(val('aiDuration')||10),
      objective:val('aiObjective'),
      difficulty:val('aiDifficulty'),
      space:val('aiSpace'),
      equipment:val('aiEquipment'),
      notes:val('aiNotes')
    };
    if(!body.objective){alert('Seleziona un obiettivo.');return;}
    if(btn){btn.disabled=true;btn.innerHTML='<i data-lucide="loader-circle"></i> Generazione…';}
    if(status)status.textContent='Sto preparando un esercizio adatto ai bambini 2020…';
    try{
      const {data,error}=await client.functions.invoke('generate-exercise',{body});
      if(error)throw error;
      if(data?.error)throw new Error(data.error);
      if(!data?.exercise)throw new Error('Risposta AI non valida');
      draft=data.exercise;
      openAiExerciseDraft(draft);
    }catch(err){
      console.error('AI exercise',err);
      let msg=String(err?.message||'');
      try{
        const ctx=err?.context;
        if(ctx&&typeof ctx.json==='function'){
          const detail=await ctx.json();
          if(detail?.error)msg=String(detail.error);
        }
      }catch(_){}
      if(status)status.textContent='';
      if(msg.includes('OPENAI_API_KEY')) alert('Generazione AI non ancora attiva: manca la OPENAI_API_KEY nel backend Supabase.');
      else alert(msg?('Generazione AI: '+msg):'Impossibile generare l’esercizio con AI. Riprova.');
    }finally{
      if(btn){btn.disabled=false;btn.innerHTML='<i data-lucide="sparkles"></i> Genera esercizio';if(window.lucide)lucide.createIcons();}
    }
  };

  window.openAiExerciseDraft=function(d){
    draft=d||draft;if(!draft)return;
    closeM();
    modal(`<div class="mh"><h3>ANTEPRIMA ESERCIZIO AI</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p><span class="pill yellow">✨ AI</span></p>
      <div class="field"><label>Titolo</label><input id="aiDTitle" value="${esc(draft.title||'')}"></div>
      <div class="grid g2"><div class="field"><label>Categoria</label><input id="aiDCategory" value="${esc(draft.category||'')}"></div><div class="field"><label>Durata</label><input id="aiDDuration" type="number" min="1" value="${Number(draft.duration_minutes)||10}"></div></div>
      <div class="field"><label>Obiettivo</label><input id="aiDObjective" value="${esc(draft.objective||'')}"></div>
      <div class="field"><label>Spazio</label><input id="aiDSpace" value="${esc(draft.space||'')}"></div>
      <div class="field"><label>Materiale</label><input id="aiDEquipment" value="${esc(draft.equipment||'')}"></div>
      <div class="field"><label>Descrizione</label><textarea id="aiDDescription" style="min-height:170px">${esc(draft.description||'')}</textarea></div>
      <div class="field"><label>Varianti</label><textarea id="aiDVariants" style="min-height:110px">${esc(draft.variants||'')}</textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn alt" onclick="openAiExerciseGenerator()"><i data-lucide="refresh-cw"></i>Rigenera</button><button class="btn" id="aiSaveBtn" onclick="saveAiExercise()"><i data-lucide="save"></i>Salva nell'archivio</button></div>`);
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
      source_type:'ai',
      imported_at:new Date().toISOString()
    };
    if(!row.title){alert('Inserisci il titolo.');return;}
    const btn=document.getElementById('aiSaveBtn');if(btn){btn.disabled=true;btn.textContent='Salvataggio…';}
    const {error}=await client.from('exercises').insert(row);
    if(error){console.error(error);alert('Impossibile salvare l’esercizio AI.');if(btn){btn.disabled=false;btn.textContent="Salva nell'archivio";}return;}
    if(typeof window.osgbReloadExercises==='function')await window.osgbReloadExercises();
    window.__exerciseFilter='ai';draft=null;closeM();exercises('ai');
  };
})();