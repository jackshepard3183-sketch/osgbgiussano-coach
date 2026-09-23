(function(){
  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  const pad=n=>String(n).padStart(2,'0');
  const fmtDate=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return 'Seleziona data';const [y,m,d]=String(v).split('-');return `${d}/${m}/${y}`;};
  const fmtTime=v=>/^\d{2}:\d{2}$/.test(String(v||''))?String(v):'Seleziona orario';

  window.osgbNativePickerField=function(id,type,value=''){
    const icon=type==='date'?'calendar-days':'clock-3';
    const label=type==='date'?'Seleziona data':'Seleziona orario';
    const display=type==='date'?fmtDate(value):fmtTime(value);
    return '<div class="native-picker-wrap osgb-picker-wrap" data-picker-type="'+esc(type)+'">'+
      '<input id="'+esc(id)+'" type="hidden" value="'+esc(value||'')+'">'+
      '<button type="button" class="osgb-picker-display" id="'+esc(id)+'Display" onclick="osgbOpenNativePicker(\''+esc(id)+'\')" aria-label="'+label+'">'+
      '<span>'+esc(display)+'</span><i data-lucide="'+icon+'"></i></button></div>';
  };

  function closePicker(){document.getElementById('osgbPickerOverlay')?.remove();}

  function datePicker(input){
    const now=new Date();
    let y=now.getFullYear(),m=now.getMonth()+1,d=now.getDate();
    if(/^\d{4}-\d{2}-\d{2}$/.test(input.value)){[y,m,d]=input.value.split('-').map(Number);}
    const years=[];for(let n=y-2;n<=y+3;n++)years.push(n);
    const months=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    return `<div class="osgb-picker-card"><div class="osgb-picker-head"><b>SELEZIONA DATA</b><button type="button" class="close" onclick="osgbClosePicker()"><i data-lucide="x"></i></button></div>
      <div class="osgb-picker-grid date">
        <div class="field"><label>Giorno</label><select id="osgbPickDay">${Array.from({length:31},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===d?'selected':''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label>Mese</label><select id="osgbPickMonth">${months.map((name,i)=>`<option value="${i+1}" ${i+1===m?'selected':''}>${name}</option>`).join('')}</select></div>
        <div class="field"><label>Anno</label><select id="osgbPickYear">${years.map(n=>`<option value="${n}" ${n===y?'selected':''}>${n}</option>`).join('')}</select></div>
      </div>
      <div class="osgb-picker-actions"><button type="button" class="btn alt" onclick="osgbClearPicker()">Cancella</button><button type="button" class="btn" onclick="osgbApplyDatePicker()">Conferma</button></div></div>`;
  }

  function timePicker(input){
    let h=14,min=30;
    if(/^\d{2}:\d{2}$/.test(input.value)){[h,min]=input.value.split(':').map(Number);}
    const mins=Array.from({length:12},(_,i)=>i*5);
    if(!mins.includes(min))mins.push(min),mins.sort((a,b)=>a-b);
    return `<div class="osgb-picker-card"><div class="osgb-picker-head"><b>SELEZIONA ORARIO</b><button type="button" class="close" onclick="osgbClosePicker()"><i data-lucide="x"></i></button></div>
      <div class="osgb-time-preview">${pad(h)}:${pad(min)}</div>
      <div class="osgb-picker-grid time">
        <div class="field"><label>Ora</label><select id="osgbPickHour" onchange="osgbRefreshTimePreview()">${Array.from({length:24},(_,i)=>i).map(n=>`<option value="${n}" ${n===h?'selected':''}>${pad(n)}</option>`).join('')}</select></div>
        <div class="field"><label>Minuti</label><select id="osgbPickMinute" onchange="osgbRefreshTimePreview()">${mins.map(n=>`<option value="${n}" ${n===min?'selected':''}>${pad(n)}</option>`).join('')}</select></div>
      </div>
      <div class="osgb-picker-actions"><button type="button" class="btn alt" onclick="osgbClearPicker()">Cancella</button><button type="button" class="btn" onclick="osgbApplyTimePicker()">Conferma</button></div></div>`;
  }

  window.osgbOpenNativePicker=function(id){
    const input=document.getElementById(id);if(!input)return;
    closePicker();
    const type=id.toLowerCase().includes('date')?'date':'time';
    const overlay=document.createElement('div');overlay.id='osgbPickerOverlay';overlay.className='osgb-picker-overlay';overlay.dataset.target=id;
    overlay.innerHTML=type==='date'?datePicker(input):timePicker(input);
    overlay.addEventListener('click',e=>{if(e.target===overlay)closePicker();});
    document.body.appendChild(overlay);
    if(window.lucide)lucide.createIcons();
  };
  window.osgbClosePicker=closePicker;
  window.osgbRefreshTimePreview=function(){
    const h=Number(document.getElementById('osgbPickHour')?.value||0),m=Number(document.getElementById('osgbPickMinute')?.value||0);
    const el=document.querySelector('.osgb-time-preview');if(el)el.textContent=pad(h)+':'+pad(m);
  };
  function target(){
    const overlay=document.getElementById('osgbPickerOverlay');return overlay?document.getElementById(overlay.dataset.target):null;
  }
  function syncDisplay(input,type){
    const el=document.getElementById(input.id+'Display')?.querySelector('span');if(!el)return;
    el.textContent=type==='date'?fmtDate(input.value):fmtTime(input.value);
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  window.osgbApplyDatePicker=function(){
    const input=target();if(!input)return;
    const y=Number(document.getElementById('osgbPickYear').value),m=Number(document.getElementById('osgbPickMonth').value),d=Number(document.getElementById('osgbPickDay').value);
    const max=new Date(y,m,0).getDate();input.value=`${y}-${pad(m)}-${pad(Math.min(d,max))}`;syncDisplay(input,'date');closePicker();
  };
  window.osgbApplyTimePicker=function(){
    const input=target();if(!input)return;
    const h=Number(document.getElementById('osgbPickHour').value),m=Number(document.getElementById('osgbPickMinute').value);
    input.value=pad(h)+':'+pad(m);syncDisplay(input,'time');closePicker();
  };
  window.osgbClearPicker=function(){
    const input=target();if(!input)return;const wrap=input.closest('.osgb-picker-wrap');input.value='';syncDisplay(input,wrap?.dataset.pickerType||'time');closePicker();
  };
})();