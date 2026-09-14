(function(){
  let client=null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const phoneHref=v=>String(v||'').replace(/[^+\d]/g,'');

  window.openFamilyContacts=async function(playerId){
    if(!client)return;
    const p=P.find(x=>String(x.id)===String(playerId));
    if(!p)return;
    closeM();
    modal(`<div class="mh"><h3>CONTATTI FAMIGLIA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><h3>${esc(p.n)}</h3><div class="card"><p class="muted">Caricamento contatti…</p></div>`);
    const {data,error}=await client.from('parent_contacts').select('id,contact_name,relationship,phone,email,is_primary,notes').eq('player_id',playerId).order('is_primary',{ascending:false}).order('contact_name',{ascending:true});
    if(error){console.error('contacts load',error);document.querySelector('#m .card').innerHTML='<p class="muted">Impossibile caricare i contatti.</p>';return;}
    const rows=data||[];
    const html=rows.length?rows.map(c=>`<div class="card" style="margin-top:10px"><div class="row"><div><b>${esc(c.contact_name||'Contatto')}</b>${c.is_primary?' <span class="pill">Principale</span>':''}<br><small class="muted">${esc(c.relationship||'')}</small></div></div>${c.phone?`<p><a class="btn alt" href="tel:${phoneHref(c.phone)}"><i data-lucide="phone"></i>${esc(c.phone)}</a></p>`:''}${c.email?`<p><a class="btn alt" href="mailto:${esc(c.email)}"><i data-lucide="mail"></i>${esc(c.email)}</a></p>`:''}${c.notes?`<p class="muted">${esc(c.notes)}</p>`:''}</div>`).join(''):'<div class="card"><p class="muted">Nessun contatto disponibile.</p></div>';
    const sheet=document.querySelector('#m .sheet');
    if(sheet){sheet.innerHTML=`<div class="mh"><h3>CONTATTI FAMIGLIA</h3><button class="close" onclick="closeM()"><i data-lucide="x"></i></button></div><h3>${esc(p.n)}</h3>${html}`;icons();}
  };

  window.addEventListener('osgb-auth-ready',e=>{client=e.detail?.client||null;});
})();