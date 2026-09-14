(function(){
  function build(team){
    const e=S.events.find(x=>String(x.id)===String(S.match));
    if(!e)return 'Nessuna gara selezionata.';
    const map=S.asg[S.match]||{};
    const names=P.filter(p=>map[p.id]===team).map(p=>p.n);
    return `${team==='BLU'?'🔵':'🟡'} SQUADRA ${team} – OSGB GIUSSANO 2020\n\n📅 ${e.date||'-'}\n⚽ ${e.t||'Gara'}\n📍 ${e.place||'-'}${e.addr?' – '+e.addr:''}\n🕒 Ritrovo: ore ${e.meet||'-'}\n🕞 Inizio: ore ${e.time||'-'}\n\nConvocati:\n${names.length?names.map(n=>'• '+n).join('\n'):'• Da definire'}\n\nPer eventuali assenze o problemi, avvisare appena possibile.\n\nStaff OSGB Giussano 2020`;
  }
  window.messages=function(){
    const b=build('BLU'),y=build('GIALLA');
    modal(`<div class="mh"><h3>MESSAGGI GIORNATA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><h3>BLU</h3><textarea id="mb" style="width:100%;min-height:220px">${b}</textarea><p><button class="btn" onclick="wa('mb')"><i data-lucide="message-circle"></i>Apri WhatsApp</button></p><h3>GIALLA</h3><textarea id="my" style="width:100%;min-height:220px">${y}</textarea><p><button class="btn yellow" onclick="wa('my')"><i data-lucide="message-circle"></i>Apri WhatsApp</button></p>`);
  };
  window.wa=function(id){open('https://wa.me/?text='+encodeURIComponent(document.getElementById(id)?.value||''),'_blank')};
})();