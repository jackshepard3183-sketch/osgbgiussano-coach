(function(){
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  window.importExerciseWeb=function(){
    closeM();
    modal(`<div class="mh"><h3>CERCA / IMPORTA DAL WEB</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div>
      <p class="muted">Cerca un esercizio online, apri una fonte interessante e poi torna qui per importarla. L’app prova a leggere automaticamente il testo della pagina.</p>
      <div class="field"><label>Cosa vuoi cercare?</label><input id="webSearchQuery" placeholder="es. esercizi conduzione palla scuola calcio 5-6 anni"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button class="btn yellow" onclick="searchExerciseOnline()"><i data-lucide="search"></i>Cerca online</button><button class="btn alt" onclick="fillSuggestedSearch('conduzione')">Conduzione</button><button class="btn alt" onclick="fillSuggestedSearch('1 contro 1')">1 contro 1</button><button class="btn alt" onclick="fillSuggestedSearch('passaggio')">Passaggio</button><button class="btn alt" onclick="fillSuggestedSearch('coordinazione')">Coordinazione</button></div>
      <div class="card"><b>Importa la fonte scelta</b><div class="field"><label>URL fonte</label><input id="webSourceUrl" type="url" placeholder="https://..."></div><div class="field"><label>Testo esercizio</label><textarea id="webSourceText" style="min-height:180px" placeholder="Se il sito blocca la lettura automatica, incolla qui il testo"></textarea></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn alt" onclick="tryFetchExerciseWeb()"><i data-lucide="download"></i>Leggi il link</button><button class="btn" onclick="prepareExerciseWebDraft()"><i data-lucide="wand-sparkles"></i>Crea bozza</button></div><div id="webImportStatus" class="muted" style="margin-top:8px"></div></div>`);
  };
  window.searchExerciseOnline=function(){
    const q=document.getElementById('webSearchQuery')?.value.trim();
    if(!q){alert('Inserisci cosa vuoi cercare.');return;}
    const query=`${q} calcio bambini esercizio allenamento`;
    window.open('https://www.google.com/search?q='+encodeURIComponent(query),'_blank','noopener');
  };
  window.fillSuggestedSearch=function(topic){
    const el=document.getElementById('webSearchQuery');if(el)el.value=`${topic} scuola calcio 5 6 anni`;
  };
})();