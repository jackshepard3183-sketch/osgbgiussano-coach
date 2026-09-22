(function(){
  const labels={ai:'✨ AI',local:'⚙️ App',image:'📷 Immagini',pdf:'📄 PDF',web:'🌐 Web',instagram:'📱 Instagram',manual:'✍️ Manuali'};
  const sourceType=value=>Object.hasOwn(labels,value)?value:'manual';
  const sourceLabel=value=>labels[sourceType(value)];
  const categories=['Riscaldamento','Attivazione motoria','Tecnica – conduzione','Tecnica – conduzione e tiro','Situazionale – 1 contro 1','Situazionale – 2 contro 2','Partita'];

  function normalizeCategory(value,title='',objective='',description=''){
    const category=String(value||'').trim(),text=[title,category,objective,description].join(' ').toLowerCase();
    if(/(2\s*(contro|c)\s*2|due contro due|torneo di 2)/.test(text))return'Situazionale – 2 contro 2';
    if(/(1\s*(contro|c)\s*1|uno contro uno|duello|protezione dorsale|difesa della palla)/.test(text))return'Situazionale – 1 contro 1';
    if(/(partita|partitella|3\s*(contro|c)\s*3|4\s*(contro|c)\s*4|5\s*(contro|c)\s*5|rugby con meta|palla prigioniera|palla rilanciata)/.test(text))return'Partita';
    if(/^(gioco motorio|riscaldamento)$/i.test(category))return'Riscaldamento';
    if(/^(attivazione motoria|percorso motorio)$/i.test(category))return'Attivazione motoria';
    if(/situazional/i.test(category))return'Partita';
    if(/(finalizz|tiro|calcia|rigor|porta vuota)/.test(text))return'Tecnica – conduzione e tiro';
    return'Tecnica – conduzione';
  }

  function normalizeEquipment(value){
    const text=String(value||'').toLowerCase(),out=[];
    if(/pallon/.test(text))out.push('Palloni');
    if(/(cinesin|conett)/.test(text))out.push('Cinesini');
    if(/cerch/.test(text))out.push('Cerchi');
    if(/(porta|porte)/.test(text))out.push('Porticine');
    if(/(^|[^a-zà-ÿ])coni([^a-zà-ÿ]|$)/.test(text))out.push('Coni');
    if(/(ostacol|palett|scalett|nastro|medus|cancellet)/.test(text))out.push('Ostacoli');
    return out.join(', ');
  }

  function instagramUrl(value){
    let url;
    try{url=new URL(String(value||'').trim());}catch(_){throw new Error('Incolla un link completo a un post o reel Instagram.');}
    if(url.protocol!=='https:'||!['instagram.com','www.instagram.com','m.instagram.com'].includes(url.hostname)||url.username||url.password||url.port){
      throw new Error('Usa un link https://www.instagram.com a un post o reel.');
    }
    const match=url.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)\/?$/);
    if(!match)throw new Error('Il link deve indicare un singolo post o reel, non un profilo o una storia.');
    return `https://www.instagram.com/${match[1]==='reels'?'reel':match[1]}/${match[2]}/`;
  }

  function parseText(text){
    const cleanLine=value=>String(value||'').trim()
      .replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+)/,'')
      .replace(/^\*{1,2}(.+?)\*{1,2}$/,'$1').replace(/^_{1,2}(.+?)_{1,2}$/,'$1').trim();
    const lines=String(text||'').split(/\r?\n/).map(cleanLine).filter(line=>line&&!/^(?:PRIMO|SECONDO|TERZO|QUARTO|QUINTO|SESTO|SETTIMO|OTTAVO|NONO|DECIMO)?\s*ALLENAMENTO\b/i.test(line));
    const fields={};
    const names={'titolo':'title','descrizione':'description','svolgimento':'description','obiettivo':'objective','obiettivi':'objective','finalità':'objective','finalita':'objective','materiale':'equipment','attrezzatura':'equipment','note':'notes','varianti':'variants','spazio':'space','campo':'space','durata':'duration','tempo':'duration','categoria':'category'};
    const heading=/^(titolo|descrizione|svolgimento|obiettiv[oi]|finalit[aà]|materiale|attrezzatura|note|varianti|spazio|campo|durata|tempo|categoria)(?:\s*[:–-]\s*(.*))?$/i;
    let active='',plain=[];
    lines.forEach(line=>{
      const match=line.match(heading);
      if(match){active=names[match[1].toLowerCase()];fields[active]=[fields[active],match[2]||''].filter(Boolean).join('\n');}
      else if(active){fields[active]=[fields[active],line].filter(Boolean).join('\n');}
      else plain.push(line);
    });
    const low=lines.join(' ').toLowerCase();
    let category=fields.category||'';
    if(!category){
      if(/1\s*(contro|vs)\s*1/.test(low))category='1 contro 1';
      else if(low.includes('conduzione'))category='Conduzione';
      else if(low.includes('passaggio'))category='Passaggio e ricezione';
      else if(low.includes('coordinaz'))category='Coordinazione';
      else if(low.includes('finalizz'))category='Finalizzazione';
      else if(low.includes('possesso'))category='Gioco e collaborazione';
    }
    const title=(fields.title||plain[0]||'Esercizio importato').slice(0,110),objective=fields.objective||'',description=fields.description||(plain.length===1?plain[0]:plain.slice(fields.title?0:1).join('\n'));
    return {title,category:normalizeCategory(category,title,objective,description),duration:(fields.duration||'').match(/\d{1,3}/)?.[0]||'',objective,space:fields.space||'',equipment:normalizeEquipment(fields.equipment||''),description,variants:fields.variants||'',notes:fields.notes||''};
  }

  function splitExercises(text,pageTexts=[]){
    const source=String(text||'').trim();if(!source)return [];
    const byNumber=source.split(/(?=^\s*(?:#{1,6}\s*)?(?:\*{1,2})?(?:Esercizio|Esercitazione)\s*(?:n\.?\s*)?\d+\s*[:–-]?)/gim).map(x=>x.replace(/^\s*(?:#{1,6}\s*)?\*{1,2}/,'').replace(/\*{1,2}\s*$/m,'').trim()).filter(Boolean);
    if(byNumber.length>1)return byNumber.filter(chunk=>/(?:titolo|descrizione|svolgimento|obiettiv[oi]|materiale)\s*(?::|–|-|\r?$)/im.test(chunk));
    const markdown='(?:#{1,6}\\s*)?(?:\\*{1,2}|_{1,2})?';
    const byNewExercise=source.split(new RegExp('(?=^\\s*'+markdown+'NUOVO\\s+ESERCIZIO(?:\\s*(?:\\*{1,2}|_{1,2}))?\\s*$)','gim')).map(x=>x.trim()).filter(Boolean);
    if(byNewExercise.length>1)return byNewExercise;
    const withoutIntro=source.replace(new RegExp('^\\s*'+markdown+'NUOVO\\s+ESERCIZIO(?:\\s*(?:\\*{1,2}|_{1,2}))?\\s*','i'),'');
    const byTitle=withoutIntro.split(new RegExp('(?=^\\s*'+markdown+'Titolo(?:\\s*(?:\\*{1,2}|_{1,2}))?\\s*(?::|–|-|$))','gim')).map(x=>x.trim()).filter(Boolean);
    if(byTitle.length>1)return byTitle;
    const pages=pageTexts.map(x=>String(x||'').trim()).filter(Boolean);
    const exercisePages=pages.filter(x=>/(?:titolo|esercizio|esercitazione|obiettiv[oi]|descrizione|svolgimento|materiale)\s*[:–-]?/i.test(x)&&x.length>=30);
    return exercisePages.length>1&&exercisePages.length===pages.length?pages:[source];
  }

  function sourceImages(exercise){
    const images=Array.isArray(exercise.source_images)?exercise.source_images:[];
    const all=[...images];
    if(exercise.source_image_path)all.unshift({path:exercise.source_image_path,name:exercise.source_image_name||'Immagine originale'});
    const seen=new Set();
    return all.filter(x=>x&&typeof x.path==='string'&&x.path&&!seen.has(x.path)&&seen.add(x.path));
  }
  window.osgbExerciseImport={parseText,splitExercises,instagramUrl,sourceImages,sourceType,sourceLabel,normalizeCategory,normalizeEquipment,categories,labels};
})();
