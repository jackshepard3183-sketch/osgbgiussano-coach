(function(){
  const statuses=['p','a','l','u'];

  function findPlayerByName(name){
    return P.find(p=>String(p.n||'').trim()===String(name||'').trim());
  }

  function patchPlayerRows(){
    document.querySelectorAll('.player').forEach(row=>{
      const name=row.querySelector('.meta b')?.textContent?.trim();
      if(!name)return;
      const p=findPlayerByName(name);
      if(!p)return;
      const idx=P.indexOf(p);
      const av=row.querySelector('.av');
      if(av)av.textContent=String(idx+1);

      row.querySelectorAll('.sbtn').forEach((btn,i)=>{
        const st=statuses[i];
        if(!st)return;
        btn.removeAttribute('onclick');
        btn.onclick=()=>setPres(p.id,st);
      });
    });
  }

  function patchAssignRows(){
    document.querySelectorAll('.assign').forEach(row=>{
      const name=row.querySelector('b')?.textContent?.trim();
      if(!name)return;
      const p=findPlayerByName(name);
      if(!p)return;
      const idx=P.indexOf(p);
      const av=row.querySelector('.av');
      if(av)av.textContent=String(idx+1);

      const blue=row.querySelector('.mb');
      const yellow=row.querySelector('.my');
      const none=row.querySelector('.mn');
      if(blue){blue.removeAttribute('onclick');blue.onclick=()=>asg(p.id,'BLU');}
      if(yellow){yellow.removeAttribute('onclick');yellow.onclick=()=>asg(p.id,'GIALLA');}
      if(none){none.removeAttribute('onclick');none.onclick=()=>asg(p.id,null);}
    });
  }

  function patchCounters(){
    document.querySelectorAll('.sub').forEach(el=>{
      if(el.textContent.includes('bambini · BLU')){
        el.textContent=`${P.length} bambini · BLU e GIALLA dinamiche per ogni gara`;
      }
    });
  }

  function patchAll(){
    patchPlayerRows();
    patchAssignRows();
    patchCounters();
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(patchAll));
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('osgb-auth-ready',()=>setTimeout(patchAll,100));
  document.addEventListener('DOMContentLoaded',patchAll);
  setTimeout(patchAll,500);
})();
