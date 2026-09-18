(function(){
  const PROJECT_URL='https://rlqevucevvoldmcrcsfq.supabase.co';
  const CONFIG_KEY='osgbCoachSupabasePublishableKey';
  const DEFAULT_PUBLISHABLE_KEY='sb_publishable_HUzURsQoble48iYrCg2h9g_ovrITinZ';
  const body=document.body;
  let client=null;

  function icons(){if(window.lucide)lucide.createIcons()}
  function lock(){body.classList.add('app-locked')}
  function unlock(){body.classList.remove('app-locked')}
  function removeScreen(){document.getElementById('loginScreen')?.remove()}
  function setError(msg){const el=document.getElementById('loginError');if(!el)return;el.textContent=msg;el.style.display='block'}

  function createClient(){
    const key=localStorage.getItem(CONFIG_KEY)||DEFAULT_PUBLISHABLE_KEY;
    if(!key||!window.supabase?.createClient)return null;
    try{
      client=window.supabase.createClient(PROJECT_URL,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      window.osgbSupabase=client;
      return client;
    }catch(_){return null}
  }

  function showSetup(){
    lock();
    removeScreen();
    const wrap=document.createElement('div');
    wrap.className='login-screen';wrap.id='loginScreen';
    wrap.innerHTML=`<div class="login-card"><div class="login-brand"><div class="login-logo"><img src="https://osgbgiussano.lovable.app/__l5e/assets-v1/39eb712d-f150-419d-9306-914ce64d3486/logo-osgb.png" alt="OSGB Giussano"></div><span class="login-kicker"><i data-lucide="database"></i> CONFIGURAZIONE INIZIALE</span><h1>OSGB COACH 2020</h1><p>Collegamento al database Supabase</p></div><div class="login-field"><label>Publishable key</label><div class="login-input-wrap"><i data-lucide="key-round"></i><input class="login-input" id="supabaseKey" type="password" autocomplete="off" placeholder="sb_publishable_..."></div></div><div class="login-error" id="loginError"></div><button class="login-submit" id="saveConfig" type="button"><i data-lucide="save"></i> Salva configurazione</button><p class="login-note"><span>Questa configurazione viene salvata solo</span><span>nel browser di questo dispositivo.</span></p></div>`;
    document.body.appendChild(wrap);icons();
    document.getElementById('saveConfig').onclick=()=>{
      const v=document.getElementById('supabaseKey').value.trim();
      if(!v){setError('Inserisci la publishable key di Supabase.');return}
      localStorage.setItem(CONFIG_KEY,v);
      if(createClient())showLogin();else setError('Configurazione non valida.');
    };
  }

  function showLogin(){
    lock();removeScreen();
    const wrap=document.createElement('div');wrap.className='login-screen';wrap.id='loginScreen';
    wrap.innerHTML=`<div class="login-card"><div class="login-brand"><div class="login-logo"><img src="https://osgbgiussano.lovable.app/__l5e/assets-v1/39eb712d-f150-419d-9306-914ce64d3486/logo-osgb.png" alt="OSGB Giussano"></div><span class="login-kicker"><i data-lucide="shield-check"></i> AREA RISERVATA ALLENATORI</span><h1>OSGB COACH 2020</h1><p>Gestione squadra · Stagione 2026/2027</p></div><form id="loginForm"><div class="login-field"><label>Email</label><div class="login-input-wrap"><i data-lucide="mail"></i><input class="login-input" id="loginEmail" type="email" autocomplete="username" placeholder="Email" required></div></div><div class="login-field"><label>Password</label><div class="login-input-wrap"><i data-lucide="lock-keyhole"></i><input class="login-input" id="loginPassword" type="password" autocomplete="current-password" placeholder="Password" required></div></div><div class="login-error" id="loginError"></div><button class="login-submit" id="loginSubmit" type="submit"><i data-lucide="log-in"></i> Accedi</button></form><p class="login-note"><span>Area riservata OSGB Giussano Coach.</span><span class="login-note-gap">Accesso protetto tramite Supabase Auth.</span></p></div>`;
    document.body.appendChild(wrap);icons();
    document.getElementById('loginForm').addEventListener('submit',async e=>{
      e.preventDefault();
      const email=document.getElementById('loginEmail').value.trim();
      const password=document.getElementById('loginPassword').value;
      const btn=document.getElementById('loginSubmit');
      if(!email||!password){setError('Inserisci email e password.');return}
      btn.disabled=true;btn.textContent='Accesso in corso…';
      const {error}=await client.auth.signInWithPassword({email,password});
      if(error){setError('Credenziali non valide o account non attivo.');btn.disabled=false;btn.innerHTML='<i data-lucide="log-in"></i> Accedi';icons();return}
      showApp();
    });
  }

  function addLogout(){
    if(document.getElementById('logoutCoach'))return;
    const badge=document.querySelector('.top-badge');if(!badge)return;
    const b=document.createElement('button');b.id='logoutCoach';b.className='logout-btn';b.title='Esci';b.innerHTML='<i data-lucide="log-out"></i>';
    b.onclick=async()=>{try{await client?.auth.signOut()}catch(_){}location.reload()};
    badge.insertAdjacentElement('afterend',b);
  }

  function showApp(){
    removeScreen();unlock();addLogout();icons();
    window.dispatchEvent(new CustomEvent('osgb-auth-ready',{detail:{client}}));
  }

  async function start(){
    lock();
    if(!createClient()){showSetup();return}
    const {data}=await client.auth.getSession();
    if(data?.session)showApp();else showLogin();
    client.auth.onAuthStateChange((_event,session)=>{if(session)showApp();});
  }

  start();
})();
