/* =========================================================
   Shared by index.html (patients) and admin.html (dentist)
   ========================================================= */
const sb = window.supabase.createClient(window.AY_CONFIG.SUPABASE_URL, window.AY_CONFIG.SUPABASE_ANON_KEY);

const REWARDS = {3:{k:'pct',v:'-10%'}, 5:{k:'gift',v:'Cadeau'}, 6:{k:'pct',v:'-30%'}, 9:{k:'pct',v:'-50%'}};
const SERVICES = [
  {n:'Consultation', d:'Bilan, conseils et plan de soins.'},
  {n:'Détartrage', d:'Des dents propres et des gencives saines.'},
  {n:'Soin de carie', d:'On soigne, sans douleur.'},
  {n:'Blanchiment', d:'Un sourire plus lumineux.'},
  {n:'Extraction', d:'En douceur, avec anesthésie.'},
  {n:'Orthodontie', d:'Alignement pour enfants et adultes.'},
  {n:'Prothèse', d:'Couronnes, bridges et appareils.'},
  {n:'Urgence', d:'Douleur ou accident : on vous reçoit vite.'}
];
const DEFAULT_SETTINGS = {days:[6,0,1,2,3,4],open:'09:00',close:'17:00',breakA:'12:00',breakB:'13:30',slot:30,ahead:14,phone:'',addr:''};

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromIso = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); };
const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
const toHM = m => `${pad(Math.floor(m/60))}:${pad(m%60)}`;
const hh = t => t.replace(':','h');
const normPhone = p => { let d = String(p||'').replace(/\D/g,''); if(d.startsWith('213')) d = '0'+d.slice(3); if(d.length===9 && d[0]!=='0') d = '0'+d; return d; };
const prettyPhone = p => String(p).replace(/(\d{2})(?=\d)/g,'$1 ').trim();
const ord = n => n===1 ? '1<sup>ère</sup>' : `${n}<sup>ème</sup>`;
const ordTxt = n => n===1 ? '1ère' : `${n}ème`;
const fmtLong = s => fromIso(s).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
const fmtShort = s => fromIso(s).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'});
const rewardTxt = r => r.k==='gift' ? 'un cadeau vous attend 🎁' : r.v+' offerts ✨';

function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2800); }
function openM(id){ $('#'+id).classList.add('open'); }
function closeM(el){ el.closest('.modal').classList.remove('open'); }
document.addEventListener('click', e => {
  if(e.target.matches('[data-close]')) closeM(e.target);
  else if(e.target.classList.contains('modal')) e.target.classList.remove('open');
});
document.addEventListener('keydown', e => { if(e.key==='Escape') document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open')); });

async function loadSettings(){
  const { data } = await sb.from('settings').select('data').eq('id',1).maybeSingle();
  return Object.assign({}, DEFAULT_SETTINGS, data?.data || {});
}

/* all slots of a day; taken = Set of 'HH:MM' */
function slotList(s, dateStr, taken){
  const out = [], now = new Date(), isToday = dateStr===iso(now), nowMin = now.getHours()*60+now.getMinutes(), step = +s.slot;
  for(let m = toMin(s.open); m + step <= toMin(s.close); m += step){
    if(s.breakA && s.breakB && m < toMin(s.breakB) && m + step > toMin(s.breakA)) continue;
    const t = toHM(m);
    out.push({t, free: !taken.has(t) && !(isToday && m <= nowMin + 30)});
  }
  return out;
}

/* ---------- fidelity ---------- */
const nextSession = p => p ? (p.stamps >= 9 ? 1 : p.stamps + 1) : 1;
function statusLine(p){
  if(!p) return '';
  if(p.stamps>=9) return `Carte complète, bravo ! 🎉<small>La prochaine séance commence une nouvelle carte.</small>`;
  const n = p.stamps + 1;
  if(REWARDS[n]) return `Prochaine séance : ${rewardTxt(REWARDS[n])}<small>C'est la ${ord(n)} séance.</small>`;
  const up = Object.keys(REWARDS).map(Number).find(k => k > p.stamps), left = up - p.stamps;
  const what = REWARDS[up].k==='gift' ? 'le cadeau' : REWARDS[up].v;
  return `Plus que ${left} séance${left>1?'s':''} avant ${what} ♡<small>${p.stamps} tampon${p.stamps>1?'s':''} sur 9${p.cards?` · ${p.cards} carte${p.cards>1?'s':''} complétée${p.cards>1?'s':''}`:''}</small>`;
}

/* ---------- logo: kawaii tooth with a bow ---------- */
let _lid = 0;
function logoSVG(cls=''){
  const i = 'lg'+(++_lid);
  const star = (x,y,r)=>`<path d="M${x} ${y-r}C${x+r*.18} ${y-r*.18} ${x+r*.18} ${y-r*.18} ${x+r} ${y}C${x+r*.18} ${y+r*.18} ${x+r*.18} ${y+r*.18} ${x} ${y+r}C${x-r*.18} ${y+r*.18} ${x-r*.18} ${y+r*.18} ${x-r} ${y}C${x-r*.18} ${y-r*.18} ${x-r*.18} ${y-r*.18} ${x} ${y-r}Z" fill="url(#${i}g)"/>`;
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <linearGradient id="${i}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EDBDB2"/><stop offset=".55" stop-color="#B86F6C"/><stop offset="1" stop-color="#D9A59C"/></linearGradient>
    <radialGradient id="${i}f" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#FDEEEB"/><stop offset="1" stop-color="#F4D2CD"/></radialGradient>
    <linearGradient id="${i}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3B8B9"/><stop offset="1" stop-color="#D98587"/></linearGradient>
  </defs>
  <g class="logo-float">
    <path d="M30 24C22 24 16 31 16 41C16 51 21 56 23 64C25 74 26 88 33 88C39 88 39 72 44 68C47 66 53 66 56 68C61 72 61 88 67 88C74 88 75 74 77 64C79 56 84 51 84 41C84 31 78 24 70 24C62 24 58 28 50 28C42 28 38 24 30 24Z" fill="url(#${i}f)" stroke="url(#${i}g)" stroke-width="3" stroke-linejoin="round"/>
    <path d="M23 40Q24 32 31 30" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" opacity=".9"/>
    <path d="M36 47Q40.5 42.5 45 47M55 47Q59.5 42.5 64 47" fill="none" stroke="#6A4447" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M45 55Q50 60 55 55" fill="none" stroke="#B86F6C" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="32" cy="54" rx="5.5" ry="3.2" fill="#F2A3A6" opacity=".75"/>
    <ellipse cx="68" cy="54" rx="5.5" ry="3.2" fill="#F2A3A6" opacity=".75"/>
    <g transform="rotate(14 66 22)">
      <path d="M64 22L60 34M68 22L72 34" stroke="url(#${i}b)" stroke-width="4" stroke-linecap="round"/>
      <path d="M66 22C58 11 47 13 49 21C51 28 60 25 66 22ZM66 22C74 11 85 13 83 21C81 28 72 25 66 22Z" fill="url(#${i}b)" stroke="#C97577" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M55 18.5Q58 19 61 21M77 18.5Q74 19 71 21" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>
      <circle cx="66" cy="22" r="4.2" fill="#D98587" stroke="#C97577" stroke-width="1"/>
    </g>
    ${star(90,40,6)}${star(10,24,4.5)}${star(88,78,3.5)}
  </g>
</svg>`;
}

/* ---------- fidelity card drawing ---------- */
function ringSVG(seed){
  const r = (a,b) => Math.sin(seed*9.7+a)*b;
  return `<svg class="r" viewBox="0 0 100 100" aria-hidden="true">
    <circle cx="50" cy="50" r="44" fill="none" stroke="#B86F6C" stroke-width="2.4" stroke-dasharray="250 26" transform="rotate(${seed*47} 50 50)"/>
    <ellipse cx="${50+r(1,1.2)}" cy="${50+r(2,1.2)}" rx="45.5" ry="44.2" fill="none" stroke="#C99289" stroke-width=".9" opacity=".8" transform="rotate(${seed*83} 50 50)"/>
  </svg>`;
}
const TOOTH = `<svg viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M7.2 2.5c1.8 0 2.8.9 4.8.9s3-.9 4.8-.9c2.7 0 4.2 2.2 4.2 5 0 2.5-1 3.8-1.6 5.9-.7 2.4-.8 8.1-3.2 8.1-2 0-1.9-5.6-4.2-5.6s-2.2 5.6-4.2 5.6c-2.4 0-2.5-5.7-3.2-8.1C4 11.3 3 10 3 7.5c0-2.8 1.5-5 4.2-5z"/></svg>`;
const BLOB = v => `<svg viewBox="0 0 100 64" aria-hidden="true"><path fill="#B86F6C" d="M14 20c-2-11 12-17 20-10 4-9 20-9 25-1 7-7 22-3 22 8 10 0 16 11 10 19 6 8-2 20-13 16-4 9-20 10-26 3-7 7-22 5-24-4-12 2-19-11-11-18-9-4-8-14-3-13z"/><text x="50" y="41" text-anchor="middle" font-family="Cormorant Garamond,Georgia,serif" font-weight="700" font-size="25" fill="#fff">${v}</text></svg>`;
const GIFT = `<svg class="gift" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="30" width="44" height="28" rx="3" fill="#F7D4D2" stroke="#D99A98" stroke-width="1.5"/><rect x="7" y="23" width="50" height="10" rx="3" fill="#F2C3C0" stroke="#D99A98" stroke-width="1.5"/><rect x="28" y="23" width="8" height="35" fill="#E8A4A6"/><path d="M32 23c-6-9-17-10-16-3 1 5 10 4 16 3zm0 0c6-9 17-10 16-3-1 5-10 4-16 3z" fill="#EDB0B1" stroke="#D99A98" stroke-width="1.5"/><path d="M30 24l-6 10M34 24l6 10" stroke="#E8A4A6" stroke-width="3" stroke-linecap="round"/></svg>`;

/* p = {name, stamps, cards} */
function cardHTML(p, opts={}){
  const stamps = p ? p.stamps : 0, next = nextSession(p);
  let cells = '';
  for(let i=1;i<=9;i++){
    const on = i <= stamps, rw = REWARDS[i];
    const cls = ['ring', on?'on':'', (on && i===stamps && opts.animate)?'new':'', (!on && i===next && stamps<9)?'next':''].join(' ');
    cells += `<div class="slot"><div class="${cls}">${ringSVG(i)}
      ${on ? `<div class="stamp">${TOOTH}</div>` : `<div class="num">${i}</div>`}
      ${rw ? (rw.k==='gift' ? GIFT : `<div class="badge">${BLOB(rw.v)}</div>`) : ''}
    </div><div class="lab">${ord(i)} séance</div></div>`;
  }
  return `<div class="fcard" role="img" aria-label="Carte cadeaux : ${stamps} séance${stamps>1?'s':''} sur 9">
    ${logoSVG('fc-logo')}
    <div class="fc-title">Carte Cadeaux</div>
    ${p?.name ? `<div class="fc-name">${esc(p.name)}</div>` : ''}
    <div class="fc-grid">${cells}</div>
    <div class="fc-bye">À la prochaine ♡</div>
  </div>`;
}
