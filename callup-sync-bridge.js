(function(){
  async function refresh(){
    if(typeof window.osgbReloadCallupStats==='function')await window.osgbReloadCallupStats();
    if(typeof window.osgbReloadCallupCounts==='function')await window.osgbReloadCallupCounts();
  }
  for(const name of ['applyGuidedCallups','assignQuickSelected','clearCallups']){
    const original=window[name];
    if(typeof original!=='function')continue;
    window[name]=async function(...args){
      const result=await original.apply(this,args);
      await refresh();
      return result;
    };
  }
})();
