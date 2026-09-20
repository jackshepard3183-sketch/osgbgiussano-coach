(function(){
  let installPrompt=null;
  function addStyle(){
    if(document.getElementById('pwaStyle'))return;
    const s=document.createElement('style');s.id='pwaStyle';
    s.textContent='.pwa-install,.offline-badge{border:0;border-radius:999px;font:inherit;font-weight:700}.pwa-install{background:#f4d018;color:#173c7a;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;text-align:center;line-height:1;padding:0 14px;height:38px;min-width:88px;vertical-align:middle}.pwa-login-install{width:100%;height:46px;margin-top:12px;border-radius:12px;font-size:14px}.pwa-install-help{position:fixed;inset:0;z-index:1200;background:rgba(7,20,46,.62);display:flex;align-items:center;justify-content:center;padding:20px}.pwa-install-help-card{width:min(420px,100%);background:#fff;border-radius:20px;padding:22px;color:#17396f;box-shadow:0 24px 70px rgba(7,20,46,.25)}.pwa-install-help-card h2{margin:0 0 10px;font-size:23px}.pwa-install-help-card p{margin:8px 0;line-height:1.45;color:#52617a}.pwa-install-help-card button{width:100%;margin-top:12px;padding:12px;border:0;border-radius:11px;background:#245ab7;color:#fff;font:inherit;font-weight:800}.offline-badge{background:#fff3cd;color:#7a5a00;display:none;margin-left:6px;padding:8px 10px}.offline-badge.on{display:inline-flex}@media(max-width:480px){.pwa-install{height:36px;min-width:72px;padding:0 13px;font-size:12px;line-height:1}.pwa-login-install{height:44px;font-size:13px}.offline-badge{font-size:10px;padding:6px 8px}}';
    document.head.appendChild(s);
  }
  function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
  function isIos(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
  function isInAppBrowser(){return /FBAN|FBAV|Instagram|Line\//i.test(navigator.userAgent)||/; wv\)/i.test(navigator.userAgent)}
  function showInstallHelp(){
    document.getElementById('pwaInstallHelp')?.remove();
    const wrap=document.createElement('div');wrap.id='pwaInstallHelp';wrap.className='pwa-install-help';
    let instructions='Apri il menu del browser (⋮) e scegli <strong>Installa app</strong> oppure <strong>Aggiungi a schermata Home</strong>.';
    if(isIos())instructions='Apri il menu <strong>Condividi</strong> di Safari e scegli <strong>Aggiungi alla schermata Home</strong>.';
    else if(isInAppBrowser())instructions='Questo browser interno non consente l’installazione. Apri la pagina in <strong>Chrome</strong>, poi usa il menu (⋮) e scegli <strong>Installa app</strong>.';
    wrap.innerHTML=`<div class="pwa-install-help-card"><h2>Installa OSGB Coach</h2><p>${instructions}</p><p>L’app resterà disponibile dalla schermata Home del telefono.</p><button type="button">Ho capito</button></div>`;
    wrap.querySelector('button').addEventListener('click',()=>wrap.remove());wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});document.body.appendChild(wrap);
  }
  async function startInstall(){if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;syncInstallButtons();return}showInstallHelp()}
  function headerInstallButton(){
    if(document.getElementById('installCoach'))return document.getElementById('installCoach');
    const badge=document.querySelector('.top-badge');if(!badge)return null;
    const b=document.createElement('button');b.id='installCoach';b.className='pwa-install';b.type='button';b.textContent=window.matchMedia('(max-width:480px)').matches?'Installa':'Installa app';b.addEventListener('click',startInstall);badge.insertAdjacentElement('afterend',b);return b;
  }
  function loginInstallButton(){
    if(isStandalone())return null;if(document.getElementById('installCoachLogin'))return document.getElementById('installCoachLogin');
    const card=document.querySelector('#loginScreen .login-card');if(!card)return null;
    const b=document.createElement('button');b.id='installCoachLogin';b.className='pwa-install pwa-login-install';b.type='button';b.textContent='Installa app sul telefono';b.addEventListener('click',startInstall);
    const note=card.querySelector('.login-note');if(note)note.insertAdjacentElement('beforebegin',b);else card.appendChild(b);return b;
  }
  function syncInstallButtons(){const installed=isStandalone();const header=headerInstallButton();if(header)header.style.display=installed?'none':'inline-flex';const login=loginInstallButton();if(login)login.style.display=installed?'none':'inline-flex'}
  function offlineBadge(){if(document.getElementById('offlineCoach'))return document.getElementById('offlineCoach');const header=document.querySelector('.top');if(!header)return null;const span=document.createElement('span');span.id='offlineCoach';span.className='offline-badge';span.textContent='Offline';header.appendChild(span);return span}
  function syncOnline(){const b=offlineBadge();if(b)b.classList.toggle('on',!navigator.onLine)}
  addStyle();syncInstallButtons();offlineBadge();syncOnline();new MutationObserver(syncInstallButtons).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',()=>{const b=document.getElementById('installCoach');if(b)b.textContent=window.matchMedia('(max-width:480px)').matches?'Installa':'Installa app'});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;syncInstallButtons()});window.addEventListener('appinstalled',()=>{installPrompt=null;syncInstallButtons()});
  window.addEventListener('online',syncOnline);window.addEventListener('offline',syncOnline);
  if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Service worker non registrato',err));});}
})();
