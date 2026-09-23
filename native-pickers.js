(function(){
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  window.osgbNativePickerField=function(id,type,value=''){
    const icon=type==='date'?'calendar-days':'clock-3';
    const label=type==='date'?'Apri calendario':'Apri selezione orario';
    return '<div class="native-picker-wrap"><input class="native-picker-input" id="'+esc(id)+'" type="'+esc(type)+'" value="'+esc(value||'')+'"><button type="button" class="native-picker-btn" aria-label="'+label+'" onclick="osgbOpenNativePicker(\''+esc(id)+'\')"><i data-lucide="'+icon+'"></i></button></div>';
  };
  window.osgbOpenNativePicker=function(id){
    const input=document.getElementById(id);if(!input)return;
    try{if(typeof input.showPicker==='function'){input.showPicker();return;}}catch(_){}
    input.focus();input.click();
  };
  function enhance(root=document){
    root.querySelectorAll?.('input[type="date"],input[type="time"]').forEach(input=>{
      input.classList.add('native-picker-input');
      input.addEventListener('change',()=>{input.blur();},{once:false});
    });
  }
  document.addEventListener('focusin',e=>{
    if(e.target?.matches?.('input[type="date"],input[type="time"]'))e.target.classList.add('native-picker-input');
  });
  new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)enhance(n)}))).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>enhance());
})();