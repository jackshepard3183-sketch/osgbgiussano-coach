(function(){
  let client=null,user=null,items=[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  async function loadExercises(){
    if(!client)return;
    const {data,error}=await client.from('exercises').select('id,title,category,duration_minutes,objective,space,equipment,description,variants,source_type,source_url,diagram,created_at').order('created_at',{ascending:false});
    if(error){console.error('exercise load',error);return;}
    items=data||[];
  }

  window.exercises=function(){
    const list=items.length?items.map(x=>`<div class="card" style="margin-top:10px"><span class="pill">${esc(x.category||'Esercizio')}</span><h3>${esc(x.title)}</h3><p class="muted">${x.duration_minutes?x.duration_minutes+' min · ':''}${esc(x.objective||'')}</p>${x.description?`<p>${esc(x.description)}</p>`:''}${x.variants?`<p class="muted"><b>Varianti:</b> ${esc(x.variants)}</p>`:''}</div>`).join(''):`<p class="muted">Nessun esercizio salvato.</p>`;
    modal(`<div class="mh"><h3>ARCHIVIO ESERCIZI</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><button class="btn" onclick="newExercise()"><i data-lucide="plus"></i>Nuovo esercizio</button>${list}`);
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
    const row={owner_user_id:user.id,title,category:document.getElementById('exCategory')?.value.trim()||null,duration_minutes:parseInt(document.getElementById('exDuration')?.value||'0',10)||null,objective:document.getElementById('exObjective')?.value.trim()||null,space:document.getElementById('exSpace')?.value.trim()||null,equipment:document.getElementById('exEquipment')?.value.trim()||null,description:document.getElementById('exDescription')?.value.trim()||null,variants:document.getElementById('exVariants')?.value.trim()||null,source_type:'manual'};
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