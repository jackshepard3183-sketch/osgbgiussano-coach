const P=[];
let S={r:'home',pres:{},asg:{},events:[],match:null};
const app=document.getElementById('app');
function icons(){if(window.lucide)lucide.createIcons()}
function ttl(a,b){return `<h1 class="title">${a}</h1><p class="sub">${b}</p>`}
function modal(x){document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="m"><div class="sheet">${x}</div></div>`);icons()}
function closeM(){document.getElementById('m')?.remove()}
function go(r){S.r=r;if(r==='home'&&typeof window.osgbReloadDashboard==='function')window.osgbReloadDashboard();else render();scrollTo(0,0)}
function home(){return `${ttl('Dashboard','OSGB Coach 2020')}<div class="card"><p class="muted">Caricamento dati…</p></div>`}
function cal(){return `${ttl('Calendario','Partite e attività')}<div class="card"><p class="muted">Caricamento calendario…</p></div>`}
function pres(){return `${ttl('Presenze','Allenamenti')}<div class="card"><p class="muted">Caricamento presenze…</p></div>`}
function team(){return `${ttl('Squadra',`${P.length} giocatori`)}<div class="card"><p class="muted">Caricamento rosa…</p></div>`}
function builder(){return `${ttl('BLU / GIALLA','Composizione giornata')}<div class="card"><p class="muted">Caricamento convocazioni…</p></div>`}
function train(){return `${ttl('Allenamenti','Sedute ed esercizi')}<div class="card"><p class="muted">Caricamento sedute…</p></div>`}
function setPres(){}
function asg(){}
function newMatch(){}
function trainingWizard(){}
function exercises(){}
function openMatch(){}
function messages(){}
function wa(){}
function render(){document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('on',n.dataset.r===S.r));const fn=({home:window.home,cal:window.cal,pres:window.pres,team:window.team,builder:window.builder,train:window.train}[S.r]||window.home);app.innerHTML=typeof fn==='function'?fn():'';icons()}
render();