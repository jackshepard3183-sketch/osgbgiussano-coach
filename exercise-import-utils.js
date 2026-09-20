(function(){
  const labels={ai:'✨ AI',local:'⚙️ App',image:'📷 Immagini',pdf:'📄 PDF',web:'🌐 Web',instagram:'📱 Instagram',manual:'✍️ Manuali'};
  const sourceType=value=>Object.hasOwn(labels,value)?value:'manual';
  const sourceLabel=value=>labels[sourceType(value)];

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
    const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const fields={};
    const names={'titolo':'title','descrizione':'description','svolgimento':'description','obiettivo':'objective','obiettivi':'objective','finalità':'objective','finalita':'objective','materiale':'equipment','attrezzatura':'equipment','note':'notes','varianti':'variants','spazio':'space','campo':'space','durata':'duration','tempo':'duration','categoria':'category'};
    const heading=/^(titolo|descrizione|svolgimento|obiettiv[oi]|finalit[aà]|materiale|attrezzatura|note|varianti|spazio|campo|durata|tempo|categoria)\s*[:–-]\s*(.*)$/i;
    let active='',plain=[];
    lines.forEach(line=>{
      const match=line.match(heading);
      if(match){active=names[match[1].toLowerCase()];fields[active]=[fields[active],match[2]].filter(Boolean).join('\n');}
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
    return {title:(fields.title||plain[0]||'Esercizio importato').slice(0,110),category,duration:(fields.duration||'').match(/\d{1,3}/)?.[0]||'',objective:fields.objective||'',space:fields.space||'',equipment:fields.equipment||'',description:fields.description||(plain.length===1?plain[0]:plain.slice(fields.title?0:1).join('\n')),variants:fields.variants||'',notes:fields.notes||''};
  }

  function splitExercises(text,pageTexts=[]){
    const source=String(text||'').trim();if(!source)return [];
    const byTitle=source.split(/(?=^\s*Titolo\s*[:–-])/gim).map(x=>x.trim()).filter(Boolean);
    if(byTitle.length>1)return byTitle;
    const byNumber=source.split(/(?=^\s*(?:Esercizio|Esercitazione)\s*(?:n\.?\s*)?\d+\s*[:–-]?)/gim).map(x=>x.trim()).filter(Boolean);
    if(byNumber.length>1)return byNumber;
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
  window.osgbExerciseImport={parseText,splitExercises,instagramUrl,sourceImages,sourceType,sourceLabel,labels};
})();
