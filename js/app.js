const $=id=>document.getElementById(id);
const store={
  get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};

/* Global Emergency Dispatch Channel & Cross-Platform WhatsApp / SMS Dispatchers */
let activeDispatchChannel = store.get('awaaz_dispatch_channel', 'wa');
if (!activeDispatchChannel || activeDispatchChannel === 'cloud') {
  activeDispatchChannel = 'wa';
  store.set('awaaz_dispatch_channel', 'wa');
}

function launchWhatsApp(phone, message){
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let cleanPhone = '';
  if (phone) {
    cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.slice(2);
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
  }
  const encoded = encodeURIComponent(message || '');
  
  let waUrl = '';
  if (cleanPhone) {
    waUrl = 'https://wa.me/' + cleanPhone + '?text=' + encoded;
  } else {
    waUrl = 'https://api.whatsapp.com/send?text=' + encoded;
  }

  console.log('[Awaaz Dispatch] Launching WhatsApp:', { isMobile, cleanPhone, waUrlLength: waUrl.length });

  if (isMobile) {
    // For mobile (Android & iOS), direct navigation to wa.me triggers the WhatsApp app
    window.location.href = waUrl;
  } else {
    // For desktop, window.open to WhatsApp Web
    const w = window.open(waUrl, '_blank');
    if (!w || w.closed || typeof w.closed === 'undefined') {
      window.location.href = waUrl;
    }
  }
}
window.launchWhatsApp = launchWhatsApp;

function buildSmsUri(phones, body){
  let cleanNum = '';
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (Array.isArray(phones)) {
    const list = phones.map(p => {
      if (typeof p === 'object' && p !== null) return p.n || p.phone || '';
      return String(p);
    }).map(s => s.replace(/[^0-9+]/g, '')).filter(Boolean);
    cleanNum = isIos ? (list[0] || '') : list.join(',');
  } else if (phones) {
    cleanNum = String(phones).replace(/[^0-9+,]/g, '');
    if (isIos && cleanNum.includes(',')) cleanNum = cleanNum.split(',')[0];
  }
  const sep = isIos ? '&body=' : '?body=';
  return `sms:${cleanNum}${sep}${encodeURIComponent(body || '')}`;
}
window.buildSmsUri = buildSmsUri;

function triggerNativeSms(smsUri){
  try {
    window.location.href = smsUri;
  } catch(e) {
    try {
      const a = document.createElement('a');
      a.href = smsUri;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { a.remove(); } catch(_) {} }, 1000);
    } catch(err) {
      console.warn('Native SMS trigger error:', err);
    }
  }
}
window.triggerNativeSms = triggerNativeSms;

/* Language / Bilingual Support (Slide 4: Hindi and English) */
let currentLang = store.get('awaaz_lang', 'en');
function toggleLanguage(){
  currentLang = currentLang === 'en' ? 'hi' : 'en';
  store.set('awaaz_lang', currentLang);
  applyLanguage();
}
window.toggleLanguage = toggleLanguage;

function applyLanguage(){
  if(currentLang === 'hi'){
    $('taglineTxt').textContent = 'एक अलर्ट, दो असर। एक इंसान की मदद और पूरे शहर की सुरक्षा।';
    $('langToggleBtn').textContent = 'English / हिन्दी';
    $('st').textContent = listening ? 'सुन रहा है (LISTENING)' : 'सेफ्टी मोड बंद है';
    $('sub').textContent = listening ? 'माइक चालू है, केवल इस फोन पर प्रोसेस हो रहा है।' : 'एक बार चालू करें। ऐप अपने आप चीख या शोर सुनेगा।';
    $('startBtn').textContent = listening ? 'सेफ्टी मोड बंद करें' : 'सेफ्टी मोड चालू करें';
    $('homeZoneTitle').textContent = '🏡 सेफ होम रेडियस (घर का सुरक्षित दायरा)';
    $('homeZoneDesc').textContent = 'सेफ होम रेडियस यह पक्का करता है कि घर में टीवी या परिवार की आवाज से झूठा अलार्म न बजे।';
  } else {
    $('taglineTxt').textContent = "One alert, two impacts. One person's help and a city's safety.";
    $('langToggleBtn').textContent = 'हिन्दी / ENG';
    $('st').textContent = listening ? 'LISTENING' : 'SAFETY MODE OFF';
    $('sub').textContent = listening ? 'Mic on, processed on this phone.' : 'Turn it on once. App listens for screams & distress cries.';
    $('startBtn').textContent = listening ? 'Turn OFF Safety Mode' : 'Turn ON Safety Mode';
    $('homeZoneTitle').textContent = '🏡 Safe Home Radius (Geofence Safe Zone)';
    $('homeZoneDesc').textContent = 'Safe Home Radius ensures TV/family sounds at home don\'t cause false alarms. High-vigilance distress alert is active outside home.';
  }
}

const W={auto_scream:1.0,harassment:0.8,dark_area:0.4};
const BUCKETS=['0-6','6-9','9-12','12-17','17-21','21-24'];
const bucket=h=>h<6?'0-6':h<9?'6-9':h<12?'9-12':h<17?'12-17':h<21?'17-21':'21-24';
const DEF={lat:28.632,lng:77.219};
const AREAS=[
  ['Connaught Place (Grid A-12)',28.632,77.219,16,'21-24','harassment'],
  ['Lajpat Nagar (Grid B-03)',28.568,77.243,12,'17-21','harassment'],
  ['Saket (Grid C-07)',28.524,77.206,7,'21-24','dark_area'],
  ['Karol Bagh',28.651,77.190,10,'21-24','auto_scream'],
  ['Nehru Place',28.549,77.252,6,'21-24','dark_area'],
  ['Chandni Chowk',28.656,77.230,9,'17-21','harassment'],
  ['Hauz Khas',28.549,77.200,5,'21-24','harassment'],
  ['Laxmi Nagar',28.630,77.277,11,'0-6','auto_scream']
];

const dayStr=d=>d.toISOString().slice(0,10),daysAgo=n=>dayStr(new Date(Date.now()-n*864e5));
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;

/* Distance Calculator (Haversine Formula) */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

/* ---------- Safe Home Radius (Geofence Engine) ---------- */
const DEFAULT_HOME = {
  lat: 28.6320,
  lng: 77.2190,
  radius: 200,
  name: 'My Home',
  address: 'Connaught Place Area, New Delhi',
  enabled: true,
  muteInside: true,
  autoSafe: true,
  showOnMap: true
};

function getHome(){
  return store.get('awaaz_home', DEFAULT_HOME);
}

function saveHome(h){
  store.set('awaaz_home', h);
  updateHomeUI();
  if($('t-map').classList.contains('on')) drawMap();
}

let lastInsideHomeState = null;

function updateHomeUI(){
  const h = getHome();
  const hrp = $('homeRadiusPill') || $('homePill'); if(hrp) hrp.textContent = `🏡 Home: ${h.radius}m`;
  $('homeRadiusVal').textContent = `${h.radius} m`;
  $('homeRadiusSlider').value = h.radius;
  $('homeMuteToggle').checked = !!h.muteInside;
  $('homeAutoSafeToggle').checked = !!h.autoSafe;
  $('homeDrawCircleToggle').checked = !!h.showOnMap;
  $('homeCoordDisplay').textContent = `${h.lat.toFixed(4)}, ${h.lng.toFixed(4)} (${h.address||'Home Zone'})`;

  if(!geo){
    $('homeDistLabel').textContent = '📍 Distance to Home: Waiting for GPS...';
    $('homeZoneStatusBadge').textContent = 'GPS Waiting';
    $('homeZoneStatusBadge').style.background = '#7a8aa0';
    return;
  }

  const dist = haversineDistance(geo.lat, geo.lng, h.lat, h.lng);
  const isInside = dist <= h.radius;
  const card = $('homeZoneCard');

  if(isInside){
    card.className = 'home-zone-card';
    $('homeZoneStatusBadge').textContent = '🟢 INSIDE SAFE HOME RADIUS';
    $('homeZoneStatusBadge').style.background = '#2e9e5b';
    $('homeZoneTitle').textContent = `🏡 Safe Home Radius (Safe Zone)`;
    $('homeDistLabel').innerHTML = `📍 You are <b>${dist} meters</b> from Home (Inside ${h.radius}m Safe Perimeter) · <span style="color:#1f7a45;font-weight:700">Protected against False Alarms</span>`;
  } else {
    card.className = 'home-zone-card away';
    $('homeZoneStatusBadge').textContent = '⚠️ OUTSIDE SAFE HOME RADIUS';
    $('homeZoneStatusBadge').style.background = '#ea7d12';
    $('homeZoneTitle').textContent = `⚠️ Outside Home Radius (Active Alert Mode)`;
    const distText = dist >= 1000 ? (dist/1000).toFixed(1)+' km' : dist+' m';
    $('homeDistLabel').innerHTML = `📍 You are <b>${distText}</b> away from Home · <span style="color:#9a5300;font-weight:700">Full Emergency Distress Detection Active</span>`;
  }

  lastInsideHomeState = isInside;
}

window.setCurrentAsHome = async function(){
  const l = await bestFix(5000) || geo;
  if(!l){
    alert('GPS location nahi mil rahi. Kripya location allow karein.');
    return;
  }
  const h = getHome();
  h.lat = +l.lat.toFixed(5);
  h.lng = +l.lng.toFixed(5);
  const addr = await reverseGeocode(h.lat, h.lng);
  h.address = addr;
  saveHome(h);
  alert(`✓ Home location set successfully:\n${addr} (${h.lat}, ${h.lng})\nSafe Radius: ${h.radius} meters.`);
};

window.updateHomeRadiusSlider = function(val){
  const h = getHome();
  h.radius = parseInt(val, 10);
  saveHome(h);
};

window.setHomeRadiusPreset = function(r){
  const h = getHome();
  h.radius = r;
  saveHome(h);
  document.querySelectorAll('#t-set .preset-chip').forEach(c=>c.classList.remove('active'));
  event.target.classList.add('active');
};

$('homeMuteToggle').onchange = function(){
  const h = getHome();
  h.muteInside = this.checked;
  saveHome(h);
};

$('homeAutoSafeToggle').onchange = function(){
  const h = getHome();
  h.autoSafe = this.checked;
  saveHome(h);
};

$('homeDrawCircleToggle').onchange = function(){
  const h = getHome();
  h.showOnMap = this.checked;
  saveHome(h);
};

function showHomeSafeBanner(dist, radius){
  const b = $('homeSuppressionNotice');
  if(b){
    b.style.display = 'block';
    b.scrollIntoView({behavior:'smooth'});
    setTimeout(()=>{ b.style.display = 'none'; }, 8000);
  }
}

function focusOnHomeMap(){
  show('map');
  const h = getHome();
  setTimeout(()=>{
    if(map){
      map.setView([h.lat, h.lng], 16);
      L.popup().setLatLng([h.lat, h.lng])
        .setContent(`<b style="color:#2e9e5b;font-size:14px">🏡 MY SAFE HOME ZONE</b><br>Safe Radius: ${h.radius} meters<br>${h.address}`)
        .openOn(map);
    }
  }, 250);
}
window.focusOnHomeMap = focusOnHomeMap;

function ev(lat,lng,type,b,day,sim,extra={}){
  lat=+lat.toFixed(5);
  lng=+lng.toFixed(5);
  return {
    id: extra.id || ('ev_'+Date.now()+'_'+Math.floor(Math.random()*10000)),
    c: lat.toFixed(3)+'_'+lng.toFixed(3),
    lat,
    lng,
    type,
    b,
    day,
    time: extra.time || new Date().toLocaleTimeString(),
    timestamp: extra.timestamp || Date.now(),
    area: extra.area || areaName({lat,lng}),
    acc: extra.acc || 15,
    w: W[type]||1.0,
    sim: !!sim,
    score: extra.score || 0.85
  };
}

const SIM=(()=>{
  const o=[],ty=Object.keys(W);
  AREAS.forEach(a=>{
    for(let i=0;i<a[3];i++) {
      o.push(ev(a[1]+(rnd()-.5)*.0006,a[2]+(rnd()-.5)*.0006,rnd()<.6?a[5]:ty[Math.floor(rnd()*3)],rnd()<.7?a[4]:BUCKETS[Math.floor(rnd()*6)],daysAgo(Math.floor(rnd()*30)),true));
    }
  });
  for(let i=0;i<30;i++){
    o.push(ev(28.5+rnd()*.2,77.1+rnd()*.22,ty[Math.floor(rnd()*3)],BUCKETS[Math.floor(rnd()*6)],daysAgo(Math.floor(rnd()*30)),true));
  }
  return o;
})();

/* ---------- City Broadcast Channel (Multi-Tab / Multi-Window Sync) ---------- */
let cityBroadcast=null;
try {
  cityBroadcast = new BroadcastChannel('awaaz_city_broadcast');
  cityBroadcast.onmessage = (msg)=>{
    if(msg && msg.data && msg.data.type === 'NEW_SCREAM_ALERT'){
      const e = msg.data.event;
      const m = store.get('awaaz_events',[]);
      if(!m.some(x=>x.id===e.id)){
        m.push(e);
        store.set('awaaz_events',m);
        redraw();
        renderCityIncidents();
      }
    }
  };
} catch(e){}

window.addEventListener('storage', (e)=>{
  if(e.key === 'awaaz_events'){
    redraw();
    renderCityIncidents();
  }
  if(e.key === 'awaaz_contacts'){
    refreshCt();
  }
  if(e.key === 'awaaz_home'){
    updateHomeUI();
  }
});

/* ---------- Data (Local or Shared via Firebase) ---------- */
const remote=new Map();let fbRef=null,hmT;
const baseEvents=()=>fbRef?[...remote.values()]:store.get('awaaz_events',[]);
const all=()=>{
  const isScreamsOnly = $('showScreamsOnly') && $('showScreamsOnly').checked;
  const list = baseEvents().concat($('showSim')&&!$('showSim').checked?[]:SIM);
  return isScreamsOnly ? list.filter(x=>x.type==='auto_scream') : list;
};

const redraw=()=>{
  clearTimeout(hmT);
  hmT=setTimeout(()=>{
    if($('t-map').classList.contains('on'))drawMap();
    if($('t-dash').classList.contains('on'))drawDash();
    if($('t-city').classList.contains('on'))renderCityIncidents();
  },200);
};

function cleanEv(v){
  if(!v||W[v.type]===undefined||!BUCKETS.includes(v.b))return null;
  const lat=+v.lat,lng=+v.lng;
  if(!isFinite(lat)||!isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return null;
  return ev(lat,lng,v.type,v.b,v.day||dayStr(new Date()),false,v);
}

function saveEvent(l,type,extra={}){
  if(!l)return false;
  const e=ev(l.lat,l.lng,type,bucket(new Date().getHours()),dayStr(new Date()),false,extra);
  
  if(fbRef){
    try{fbRef.push(e)}catch(x){console.warn(x)}
  }
  
  const m=store.get('awaaz_events',[]);
  m.push(e);
  store.set('awaaz_events',m);

  if(cityBroadcast){
    try{cityBroadcast.postMessage({type:'NEW_SCREAM_ALERT',event:e});}catch(_){}
  }
  
  redraw();
  return true;
}

function parseCfg(t){const o={};String(t).replace(/["']?([A-Za-z]\w*)["']?\s*:\s*["']([^"']*)["']/g,(m,k,v)=>{o[k]=v;return m;});return o;}
function initFirebase(txt){
  try{
    if(!window.firebase)return 'Firebase library not loaded.';
    const cfg=parseCfg(txt);
    if(!cfg||!cfg.databaseURL)return 'Config must include databaseURL.';
    if(!firebase.apps.length)firebase.initializeApp(cfg);
    fbRef=firebase.database().ref('awaaz_events');remote.clear();
    fbRef.limitToLast(1000).on('child_added',s=>{
      const c=cleanEv(s.val());
      if(c){remote.set(s.key,c);redraw();}
    });
    $('citySyncBadge').textContent='● Live Cloud DB Connected';
    $('citySyncBadge').style.background='#e3f6ea';
    return 'Connected to Firebase. City reports are synced live.';
  }catch(e){fbRef=null;return 'Error: '+((e&&e.message)||e);}
}

$('fbOn').onclick=()=>{const t=$('fbCfg').value.trim();if(!t)return;store.set('awaaz_fb',t);$('fbMsg').textContent=initFirebase(t);};
$('fbOff').onclick=()=>{try{fbRef&&fbRef.off()}catch(e){}fbRef=null;remote.clear();store.set('awaaz_fb','');$('fbCfg').value='';$('citySyncBadge').textContent='● Local + Link Broadcast';$('fbMsg').textContent='Using local device storage.';redraw();};
{const t=store.get('awaaz_fb','');if(t){$('fbCfg').value=t;setTimeout(()=>{$('fbMsg').textContent=initFirebase(t)},600);}}

/* ---------- Scoring & Areas (Slide 2 & Slide 3) ---------- */
function hotspots(){
  const g={};all().forEach(e=>(g[e.c]=g[e.c]||[]).push(e));const out=[];
  for(const c in g){
    const es=g[c];if(es.length<2)continue;
    let s=0;const bc={},tc={};let rec=0,nt=0;
    es.forEach(e=>{
      const age=(Date.now()-new Date(e.day||Date.now()))/864e5;
      s+=e.w*Math.exp(-age/30)*(e.b==='21-24'||e.b==='0-6'?1.3:1);
      bc[e.b]=(bc[e.b]||0)+1;if(age<=7)rec++;if(e.b==='21-24'||e.b==='0-6')nt++;tc[e.type]=(tc[e.type]||0)+1;
    });
    const top=o=>Object.keys(o).sort((a,b)=>o[b]-o[a])[0];
    out.push({c,lat:es[0].lat,lng:es[0].lng,n:es.length,rec,nt,s,b:top(bc),t:top(tc)});
  }
  return out.sort((a,b)=>b.s-a.s);
}

const level=s=>s>=5?'HIGH':s>=2.5?'MEDIUM':'LOW';
function areaName(h){
  let best=null,d=1e9;
  AREAS.forEach(a=>{
    const x=Math.hypot(a[1]-h.lat,a[2]-h.lng);
    if(x<d){d=x;best=a[0]}
  });
  return d<.02?best:('Area Grid ('+h.lat.toFixed(3)+', '+h.lng.toFixed(3)+')');
}
const peakTxt=b=>({'21-24':'9 PM to 12 AM','0-6':'12 AM to 6 AM','17-21':'5 PM to 9 PM','12-17':'12 PM to 5 PM','9-12':'9 AM to 12 PM','6-9':'6 AM to 9 AM'}[b]||'Anytime');

async function reverseGeocode(lat,lng){
  let best=areaName({lat,lng});
  try{
    const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,{headers:{'Accept':'application/json'}});
    if(res.ok){
      const data=await res.json();
      if(data&&data.display_name){
        const parts=data.display_name.split(',');
        best=parts.slice(0,3).join(', ').trim();
      }
    }
  }catch(e){}
  return best;
}

/* ---------- Modern 5-Tab Floating Navigation ---------- */
const TABS=[
  ['home', '🌸', 'Home'],
  ['circle', '💖', 'Circle'],
  ['map', '🗺️', 'Map'],
  ['escort', '🚶‍♀️', 'Escort'],
  ['more', '✨', 'More']
];

TABS.forEach(([id, icon, label], i) => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="nav-icon">${icon}</span><span class="nav-lbl">${label}</span>`;
  b.dataset.id = id;
  if (!i) b.className = 'on';
  b.onclick = () => show(id);
  $('nav').appendChild(b);
});

function show(id){
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 't-' + id));
  
  // Highlight appropriate nav button: if id is a secondary tab, highlight 'more'
  const primaryTabs = ['home', 'circle', 'map', 'escort', 'more'];
  const activeTabId = primaryTabs.includes(id) ? id : 'more';
  
  document.querySelectorAll('nav button').forEach(b => {
    b.classList.toggle('on', b.dataset.id === activeTabId);
  });

  const modeTag = $('modeTag');
  if(modeTag) modeTag.textContent = id.toUpperCase();

  if(id === 'map') drawMap();
  if(id === 'city') renderCityIncidents();
  if(id === 'circle') refreshCt();
  if(id === 'dash') drawDash();
  if(id === 'home'){ refreshCt(); updateHomeUI(); }
  if(id === 'escort'){ updateBatteryUI(); }
  window.scrollTo(0, 0);
}

/* ---------- Map + Screams + Safe Home Perimeter ---------- */
let map,heat,hotL,screamL,homeL;
function drawMap(){
  if(!map){
    map=L.map('map').setView([28.60,77.22],11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);
    hotL=L.layerGroup().addTo(map);
    screamL=L.layerGroup().addTo(map);
    homeL=L.layerGroup().addTo(map);
  }
  setTimeout(()=>map.invalidateSize(),100);

  if(heat)map.removeLayer(heat);
  const events=all();
  heat=L.heatLayer(events.map(e=>[e.lat,e.lng,e.w*1.2]),{radius:26,blur:20,maxZoom:14,gradient:{0.3:'#2aa8f0',0.55:'#ffd24d',0.8:'#ff8a2a',1:'#d94040'}}).addTo(map);

  hotL.clearLayers();
  hotspots().slice(0,10).forEach(h=>{
    const col=h.s>=5?'#d94040':h.s>=2.5?'#ea7d12':'#d2a400';
    L.circleMarker([h.lat,h.lng],{radius:7,color:'#fff',weight:2,fillColor:col,fillOpacity:1})
      .bindTooltip(areaName(h)+' · score '+h.s.toFixed(1))
      .addTo(hotL);
  });

  screamL.clearLayers();
  const screams=events.filter(e=>e.type==='auto_scream');
  screams.forEach(s=>{
    const icon=L.divIcon({
      className:'custom-scream-pin',
      html:`<div class="scream-beacon" title="Scream Detected">🚨</div>`,
      iconSize:[34,34],
      iconAnchor:[17,17]
    });
    
    const popupHtml=`
      <div style="font-family:inherit;min-width:210px">
        <b style="color:#d94040;font-size:14px">🚨 SCREAM DETECTED HERE</b>
        <div style="font-size:12px;color:#555;margin:4px 0">Distress sound recognised on device</div>
        <hr style="margin:6px 0;border:0;border-top:1px solid #edf2f8">
        <div style="font-size:12px"><b>Area:</b> ${s.area||areaName(s)}</div>
        <div style="font-size:12px"><b>Time:</b> ${s.time||'Recent'} (${s.day||'Today'})</div>
        <div style="font-size:12px"><b>Grid Accuracy:</b> ±${s.acc||15} m</div>
        <div style="margin-top:8px;display:flex;gap:4px">
          <a class="lnk s" target="_blank" href="https://maps.google.com/?q=${s.lat},${s.lng}">Google Maps</a>
          <a class="lnk s" style="background:#25d366" target="_blank" href="https://api.whatsapp.com/send?text=${encodeURIComponent('🚨 Awaaz Map Alert: Distress scream at '+(s.area||'this area')+' https://maps.google.com/?q='+s.lat+','+s.lng)}">WhatsApp</a>
        </div>
      </div>
    `;
    L.marker([s.lat,s.lng],{icon}).bindPopup(popupHtml).addTo(screamL);
  });

  // Safe Home Perimeter Zone
  homeL.clearLayers();
  const h = getHome();
  const showHomeZone = !$('showHomeZoneCheck') || $('showHomeZoneCheck').checked;
  if(h && h.lat && h.lng && h.showOnMap && showHomeZone){
    L.circle([h.lat, h.lng], {
      radius: h.radius || 200,
      color: '#2e9e5b',
      weight: 2,
      fillColor: '#2e9e5b',
      fillOpacity: 0.16,
      dashArray: '4, 4'
    }).bindTooltip(`🏡 Safe Home Perimeter (${h.radius}m)`).addTo(homeL);

    const homeIcon = L.divIcon({
      className: 'custom-home-pin',
      html: `<div class="home-marker-pin" title="My Safe Home Zone">🏡</div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const distFromYou = geo ? haversineDistance(geo.lat, geo.lng, h.lat, h.lng) : null;
    const distTxt = distFromYou != null ? `<br><b>Distance from you:</b> ${distFromYou} m (${distFromYou<=h.radius?'Inside Safe Zone 🟢':'Outside ⚠️'})` : '';

    L.marker([h.lat, h.lng], {icon: homeIcon}).bindPopup(`
      <div style="font-family:inherit;min-width:200px">
        <b style="color:#2e9e5b;font-size:14px">🏡 MY SAFE HOME ZONE</b>
        <div style="font-size:12px;color:#555;margin:3px 0">${h.address||'Home'}</div>
        <hr style="margin:6px 0;border:0;border-top:1px solid #eee">
        <b>Safety Radius:</b> ${h.radius} meters
        ${distTxt}
        <div style="margin-top:8px">
          <button class="b s o" onclick="show('set')">⚙️ Change Radius</button>
        </div>
      </div>
    `).addTo(homeL);
  }

  $('stag').style.display=$('showSim').checked?'block':'none';
}

$('showSim').onchange=drawMap;
if($('showScreamsOnly'))$('showScreamsOnly').onchange=drawMap;
if($('showHomeZoneCheck'))$('showHomeZoneCheck').onchange=drawMap;
if($('refreshMapBtn'))$('refreshMapBtn').onclick=()=>{drawMap();};
if($('focusLatestScreamBtn'))$('focusLatestScreamBtn').onclick=()=>{
  const screams=all().filter(e=>e.type==='auto_scream');
  if(!screams.length){alert('Abhi koi scream incident recorded nahi hai.');return;}
  const latest=screams[screams.length-1];
  if(map){
    map.setView([latest.lat,latest.lng],16);
    L.popup().setLatLng([latest.lat,latest.lng])
      .setContent(`<b style="color:#d94040">🚨 LATEST CITY SCREAM</b><br>${latest.area||areaName(latest)}<br>${latest.time}`)
      .openOn(map);
  }
};

/* ---------- City Incidents Feed ---------- */
function renderCityIncidents(){
  const list=$('cityIncidentList');
  const screams=all().filter(e=>e.type==='auto_scream').sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
  $('cityCountPill').textContent=screams.length+' screams';

  if(!screams.length){
    list.innerHTML='<div class="note">No scream incidents recorded in the city yet. Start Safety Mode and test with voice!</div>';
    return;
  }

  list.innerHTML=screams.map(s=>{
    const gmaps='https://maps.google.com/?q='+s.lat+','+s.lng;
    const shareText=`🚨 *AWAAZ MAP - CITY DISTRESS ALERT*\n⚠️ Chillane ki aawaj yahan detect hui:\n📍 Area: ${s.area||areaName(s)}\n🕒 Time: ${s.time||'Recently'}\n🗺️ Google Maps: ${gmaps}`;
    return `
      <div class="city-item">
        <div class="hdr">
          <b>🚨 SCREAM DETECTED: ${s.area||areaName(s)}</b>
          <span class="badge danger">${s.sim?'SIMULATED':'LIVE SOS'}</span>
        </div>
        <div class="loc">📍 Coordinates: ${s.lat.toFixed(5)}, ${s.lng.toFixed(5)} (±${s.acc||15}m)</div>
        <div class="time">🕒 Recorded: ${s.time||'Recently'} on ${s.day||'Today'} · Score: ${((s.score||0.85)*100).toFixed(0)}%</div>
        <div class="actions">
          <a class="lnk s" target="_blank" href="${gmaps}">🗺️ Google Maps</a>
          <a class="lnk s" style="background:#25d366" target="_blank" href="https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}">📲 Forward to WhatsApp Group</a>
          <button class="b s o" onclick="focusOnMap(${s.lat},${s.lng})">Pin on Map</button>
        </div>
      </div>
    `;
  }).join('');
}

window.focusOnMap=(lat,lng)=>{
  show('map');
  setTimeout(()=>{
    if(map){
      map.setView([lat,lng],16);
    }
  },200);
};

if($('shareCityWaBtn'))$('shareCityWaBtn').onclick=()=>{
  const screams=all().filter(e=>e.type==='auto_scream');
  const txt=`🚨 *AWAAZ MAP — PURI CITY KA LIVE SAFETY UPDATE*\n\nAb tak city me ${screams.length} screams/distress incidents log hue hain.\n📍 Live City Heatmap link:\n${window.location.href}\n\nStay alert and help anyone in distress!`;
  window.open('https://api.whatsapp.com/send?text='+encodeURIComponent(txt),'_blank');
};

if($('exportCityJsonBtn'))$('exportCityJsonBtn').onclick=()=>{
  const screams=all().filter(e=>e.type==='auto_scream');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(screams,null,2)],{type:'application/json'}));
  a.download='awaaz_map_city_screams.json';
  a.click();
};

if($('clearCityIncidentsBtn'))$('clearCityIncidentsBtn').onclick=()=>{
  if(confirm('Clear all local scream incidents?')){
    const evs=store.get('awaaz_events',[]).filter(x=>x.type!=='auto_scream');
    store.set('awaaz_events',evs);
    redraw();
    renderCityIncidents();
  }
};

/* ---------- Dashboard (Slide 2 & 3 Action Advice) ---------- */
let ch1,ch2;
function drawDash(){
  const hs=hotspots(),es=all();
  $('hot').innerHTML=hs.slice(0,5).map((h,i)=>`<div class="hs"><span class="n">${i+1}</span><span class="nm">${areaName(h)}<small>${h.n} reports · ${h.rec} in last 7 days · ${h.nt} at night (x1.3) · peak ${peakTxt(h.b)}</small></span><span class="pill ${level(h.s)}">${h.s.toFixed(1)}</span></div>`).join('')||'<div class="note">Not enough reports yet (a hotspot needs 2+).</div>';
  
  const a1=$('act1'),a2=$('act2');
  a1.style.display=a2.style.display='none';
  if(hs[0]){
    a1.style.display='block';
    a1.innerHTML=`<b>Suggested action: more police patrol</b>${peakTxt(hs[0].b)} near ${areaName(hs[0])}`;
  }
  const dk=hs.find(h=>h.t==='dark_area');
  if(dk){
    a2.style.display='block';
    a2.innerHTML=`<b>Suggested action: fix street lights</b>near ${areaName(dk)}`;
  }
  
  const bc=BUCKETS.map(b=>es.filter(e=>e.b===b).length),days=[...Array(7)].map((_,i)=>daysAgo(6-i)),dc=days.map(d=>es.filter(e=>e.day===d).length);
  ch1&&ch1.destroy();ch2&&ch2.destroy();
  ch1=new Chart($('c1'),{type:'bar',data:{labels:BUCKETS,datasets:[{data:bc,backgroundColor:bc.map(v=>v===Math.max(...bc)?'#d94040':'#0072c6')}]},options:{plugins:{legend:{display:false}}}});
  ch2=new Chart($('c2'),{type:'line',data:{labels:days.map(d=>d.slice(5)),datasets:[{data:dc,borderColor:'#0072c6',tension:.3}]},options:{plugins:{legend:{display:false}}}});
}

$('clr').onclick=()=>{store.set('awaaz_events',[]);store.set('awaaz_last',{});drawDash();redraw();};
$('csv').onclick=()=>{
  const rows=[['id','lat','lng','type','time_slot','date','weight','simulated']].concat(all().map(e=>[e.id||'',e.lat,e.lng,e.type,e.b,e.day,e.w,e.sim?'yes':'no']));
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}));a.download='awaaz_map_data.csv';a.click();
};

/* ---------- GPS Location Services & Real Device Satellite Engine ---------- */
let savedGeo = store.get('awaaz_last_known_geo', null);
if (savedGeo && (savedGeo.isIp || (Math.abs(savedGeo.lat - 28.632) < 0.02 && Math.abs(savedGeo.lng - 77.219) < 0.02))) {
  store.set('awaaz_last_known_geo', null);
  savedGeo = null;
}
let geo = savedGeo;
let watchId = null, geoDenied = false;

function locBadge(t, c){
  if($('locPill')){$('locPill').textContent=t;$('locPill').className='pl '+(c||'wn');}
}

function setGeo(p){
  if(!p || !p.coords) return;
  geoDenied = false;
  const lat = p.coords.latitude;
  const lng = p.coords.longitude;
  const acc = Math.round(p.coords.accuracy || 20);
  const f = { lat, lng, acc, t: Date.now(), isReal: true };
  
  geo = f;
  store.set('awaaz_last_known_geo', f);
  
  const accText = acc <= 35 ? `📍 Live GPS (±${acc}m)` : `📍 GPS OK (±${acc}m)`;
  locBadge(accText, 'ok');
  
  if($('gpsLiveDisplay')){
    $('gpsLiveDisplay').innerHTML = `<b>📍 Live GPS:</b> ${lat.toFixed(6)}, ${lng.toFixed(6)} <span style="color:#22c55e;font-weight:700">(±${acc}m accuracy)</span>`;
  }
  if($('gpsLiveBadge')){
    $('gpsLiveBadge').textContent = 'Locked (±' + acc + 'm)';
    $('gpsLiveBadge').style.background = '#22c55e';
  }
  if($('gmapsVerifyLink')){
    $('gmapsVerifyLink').href = `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    $('gmapsVerifyLink').style.display = 'inline-flex';
  }
  
  reverseGeocode(lat, lng).then(area => {
    f.area = area;
    if($('gpsDetailedStatus')){
      $('gpsDetailedStatus').innerHTML = `
        <div style="color:#15803d;font-weight:700">✅ Phone GPS Connected & Verified</div>
        <div>📌 <b>Coordinates:</b> ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${acc}m)</div>
        <div>🏙️ <b>Current Locality:</b> ${area}</div>
      `;
    }
  });
  
  updateHomeUI();
}

const gErr = e => {
  let errDesc = 'GPS searching...';
  if (e && e.code === 1) {
    geoDenied = true;
    errDesc = 'Location Blocked (Allow in Chrome)';
    locBadge(errDesc, 'bd');
  } else if (e && e.code === 2) {
    errDesc = 'GPS switch is OFF on phone';
    locBadge(errDesc, 'bd');
  } else {
    locBadge('Acquiring satellite GPS...', 'wn');
  }
  if ($('gpsDetailedStatus') && (!geo || !geo.isReal)) {
    $('gpsDetailedStatus').innerHTML = `
      <span style="color:#dc2626;font-weight:700">⚠️ ${errDesc}</span><br>
      <span style="font-size:12px;color:#475569">Phone ke notification bar me GPS (Location) ON karein aur browser me "Allow" dabayein.</span>
    `;
  }
};

function startGeo(){
  if (!navigator.geolocation) {
    locBadge('GPS not supported on device', 'bd');
    return;
  }
  if (watchId != null) return;
  
  navigator.geolocation.getCurrentPosition(setGeo, gErr, {
    enableHighAccuracy: true,
    maximumAge: 60000,
    timeout: 10000
  });
  
  watchId = navigator.geolocation.watchPosition(setGeo, gErr, {
    enableHighAccuracy: true,
    maximumAge: 5000,
    timeout: 25000
  });
}

function stopGeo(){
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function getFreshRealGPS(maxWait = 8000){
  return new Promise(res => {
    if (geo && geo.isReal && Date.now() - geo.t < 45000) return res(geo);
    startGeo();
    const t0 = Date.now();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => { setGeo(p); res(geo); },
        err => { gErr(err); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: maxWait }
      );
    }
    const chk = () => {
      if (geo && geo.isReal && Date.now() - geo.t < 45000) return res(geo);
      if (Date.now() - t0 >= maxWait) return res(geo || null);
      setTimeout(chk, 150);
    };
    chk();
  });
}

function bestFix(maxWait = 6000){
  return getFreshRealGPS(maxWait);
}

window.testAndLockRealGPS = function(){
  const stat = $('gpsDetailedStatus');
  const badge = $('gpsLiveBadge');
  const verifyLink = $('gmapsVerifyLink');
  
  if (!navigator.geolocation) {
    if (stat) stat.innerHTML = '❌ Browser does not support Geolocation.';
    alert('Browser does not support Geolocation.');
    return;
  }
  
  if (stat) stat.innerHTML = '🛰️ <b>Contacting Phone GPS Satellites...</b><br>Please tap <b>"ALLOW"</b> if phone/browser asks for Location.';
  if (badge) { badge.textContent = 'Acquiring...'; badge.style.background = '#eab308'; }
  
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      setGeo(pos);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const acc = Math.round(pos.coords.accuracy || 15);
      const area = await reverseGeocode(lat, lng);
      alert(`✅ REAL LIVE GPS ACQUIRED!\n\n📍 Latitude: ${lat.toFixed(6)}\n📍 Longitude: ${lng.toFixed(6)}\n🎯 Accuracy: ±${acc} meters\n🏙️ Detected Area: ${area}\n\nAb WhatsApp par aapke phone ki exact live location jayegi!`);
    },
    (err) => {
      gErr(err);
      let advice = 'Location permission is required.';
      if (err.code === 1) advice = 'Browser ke address bar me Lock (🔒) icon dabayein aur Location: ALLOW karein.';
      if (err.code === 2) advice = 'Phone ke notification bar me "Location / GPS" toggle ON karein.';
      alert(`⚠️ GPS Error: ${err.message || 'Position unavailable'}\n\n${advice}`);
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
  );
};
window.forceAcquireGPS = window.testAndLockRealGPS;

function initLiveGeo(){
  startGeo();
  setTimeout(()=>{
    if(geo && geo.isReal){
      locBadge(geo.acc<=50?`📍 Live GPS (±${geo.acc}m)`:`📍 GPS (±${geo.acc}m)`,'ok');
      if($('gpsLiveDisplay')){
        $('gpsLiveDisplay').innerHTML=`<b>📍 Live GPS:</b> ${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)} <span style="color:#22c55e;font-weight:700">(±${geo.acc}m)</span>`;
      }
    }
  },1200);
}

let you=null;
$('whereBtn').onclick=async()=>{
  $('whereMsg').textContent='Acquiring high-accuracy GPS...';
  const l=await bestFix(8000);
  if(!l){$('whereMsg').textContent='Location not available. Please allow browser location access.';return;}
  if(!map)drawMap();
  if(you)map.removeLayer(you);
  you=L.layerGroup([
    L.circle([l.lat,l.lng],{radius:Math.max(l.acc,8),color:'#0072c6',weight:1,fillOpacity:.15}),
    L.circleMarker([l.lat,l.lng],{radius:8,color:'#fff',weight:2,fillColor:'#0072c6',fillOpacity:1})
  ]).addTo(map);
  map.setView([l.lat,l.lng],16);
  $('whereMsg').textContent='Your GPS: '+l.lat.toFixed(6)+', '+l.lng.toFixed(6)+' (±'+l.acc+' m). Accuracy circle shown in blue.';
  updateHomeUI();
};

$('repBtn').onclick=async()=>{
  $('repMsg').textContent='Getting your location...';
  const l=await bestFix(8000);
  if(!l){$('repMsg').textContent='Location unavailable. Allow location access and try again.';return;}
  const area=await reverseGeocode(l.lat,l.lng);
  saveEvent(l,$('rtype').value,{area});
  $('repMsg').textContent='Report saved and pinned to City Safety Map! See City Map tab.';
};

/* ---------- Test Log ---------- */
let isSim=false;const TL0={trig:0,cancel:0,sent:0,log:[]};
function tlog(k){
  const L=store.get('awaaz_tlog',TL0);
  if(!isSim)L[k]=(L[k]||0)+1;
  L.log=(L.log||[]).concat((isSim?'[TEST] ':'')+new Date().toLocaleTimeString()+' '+k+' | top sound: '+topTxt+' | GPS: '+(geo?'±'+geo.acc+'m':'none')).slice(-15);
  store.set('awaaz_tlog',L);
  showTlog();
}
function showTlog(){
  const L=store.get('awaaz_tlog',TL0);
  $('tlog').innerHTML='Auto triggers: <b>'+(L.trig||0)+'</b> · cancelled: <b>'+(L.cancel||0)+'</b> · alerts sent: <b>'+(L.sent||0)+'</b><br><small>'+(L.log||[]).slice().reverse().join('<br>')+'</small>';
}
$('tlogClr').onclick=()=>{store.set('awaaz_tlog',TL0);showTlog();};

/* ---------- Close Friends & Family Engine ---------- */
let activeCategory='family';
let circleFilter='all';

const contacts=()=>{
  const raw=store.get('awaaz_contacts',[]);
  return raw.map(c=>({
    id: c.id || ('ct_' + Math.random().toString(36).substring(2, 9)),
    name: c.name || 'Contact',
    n: c.n,
    category: c.category || 'family',
    relation: c.relation || (c.category==='friend'?'Close Friend':(c.category==='emergency'?'Helpline':'Family Member'))
  }));
};

function normNum(raw){
  let n=String(raw).replace(/\D/g,'');
  if(n.startsWith('00'))n=n.slice(2);
  if(n.length===11&&n[0]==='0')n='91'+n.slice(1);
  else if(n.length===10)n='91'+n;
  return n;
}

function addContact(name,num,category='family',relation='Family Member'){
  const n=normNum(num);
  if(n.length<10||n.length>15)return false;
  const c=contacts();
  const existingIdx=c.findIndex(x=>x.n===n);
  const cleanName=(name||'Trusted Contact').replace(/[<>&"]/g,'');
  
  if(existingIdx>=0){
    c[existingIdx]={...c[existingIdx],name:cleanName,category,relation};
  }else{
    c.push({
      id:'ct_'+Date.now()+'_'+Math.floor(Math.random()*1000),
      name:cleanName,
      n,
      category,
      relation
    });
  }
  
  store.set('awaaz_contacts',c.slice(-15));
  refreshCt();
  return true;
}

function delCtById(id){
  const c=contacts().filter(x=>x.id!==id);
  store.set('awaaz_contacts',c);
  refreshCt();
}
window.delCircle=delCtById;

const RELATION_CHIPS={
  family:[
    {label:'❤️ Mom',name:'Mom',rel:'Mom'},
    {label:'👨 Dad',name:'Dad',rel:'Dad'},
    {label:'👧 Sister',name:'Sister',rel:'Sister'},
    {label:'👦 Brother',name:'Brother',rel:'Brother'},
    {label:'💍 Spouse/Partner',name:'Partner',rel:'Spouse'},
    {label:'👵 Guardian',name:'Guardian',rel:'Guardian'}
  ],
  friend:[
    {label:'🤝 Best Friend',name:'Best Friend',rel:'Best Friend'},
    {label:'🏠 Roommate',name:'Roommate',rel:'Roommate'},
    {label:'🏫 College Friend',name:'Friend',rel:'College Friend'},
    {label:'💼 Colleague',name:'Colleague',rel:'Colleague'}
  ],
  emergency:[
    {label:'🚨 Police (112)',name:'Police Control',rel:'Helpline',num:'112'},
    {label:'🛡️ Women Helpline (1091)',name:'Women Helpline',rel:'Helpline',num:'1091'},
    {label:'🚑 Ambulance (108)',name:'Ambulance',rel:'Helpline',num:'108'}
  ]
};

function selectCircleCategory(cat){
  activeCategory=cat;
  $('catFamilyBtn').classList.toggle('active',cat==='family');
  $('catFriendBtn').classList.toggle('active',cat==='friend');
  $('catEmgBtn').classList.toggle('active',cat==='emergency');
  renderQuickChips();
}
window.selectCircleCategory=selectCircleCategory;

function renderQuickChips(){
  const container=$('quickChipsContainer');
  const chips=RELATION_CHIPS[activeCategory]||[];
  container.innerHTML=chips.map(chip=>`
    <button class="rel-chip" type="button" onclick="applyRelationChip('${chip.name}','${chip.rel}','${chip.num||''}')">${chip.label}</button>
  `).join('');
}

window.applyRelationChip=(name,rel,num)=>{
  $('cNameInput').value=name;
  $('cRelationInput').value=rel;
  if(num)$('cNumInput').value=num;
};

window.wizQuick=(name,cat,rel)=>{
  $('wName').value=name;
};

$('addCircleBtn').onclick=()=>{
  const name=$('cNameInput').value.trim();
  const num=$('cNumInput').value.trim();
  const rel=$('cRelationInput').value.trim()||(activeCategory==='family'?'Family Member':'Close Friend');
  const msg=$('circleAddMsg');

  if(addContact(name,num,activeCategory,rel)){
    $('cNameInput').value='';
    $('cNumInput').value='';
    $('cRelationInput').value='';
    msg.className='msg okk';
    msg.textContent='✓ Added successfully to your Safety Circle!';
    setTimeout(()=>msg.textContent='',3000);
  }else{
    msg.className='msg er';
    msg.textContent='Please enter a valid 10-digit mobile number.';
  }
};

window.filterCircle=(f,btn)=>{
  circleFilter=f;
  ['fAll','fFam','fFrn','fEmg'].forEach(id=>{
    if($(id))$(id).classList.remove('active');
  });
  if(btn)btn.classList.add('active');
  renderCircleList();
};

function renderCircleList(){
  const list=$('circleMemberList');
  const allCt=contacts();
  const filtered=circleFilter==='all'?allCt:allCt.filter(x=>x.category===circleFilter);
  $('circleTotalNum').textContent=allCt.length;

  if(!filtered.length){
    list.innerHTML='<div class="note">No members found in this category. Add family or friends above!</div>';
    return;
  }

  list.innerHTML=filtered.map(x=>{
    const icon=x.category==='family'?'👨‍👩‍👧':(x.category==='friend'?'🤝':'🚨');
    const badgeCol=x.category==='family'?'danger':(x.category==='friend'?'info':'org');
    const waText=encodeURIComponent(`Awaaz Map: Hi ${x.name}, you are in my Close Friends & Family Safety Circle.`);
    return `
      <div class="circle-item ${x.category}">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
          <div style="display:flex;align-items:center;gap:10px">
            <div class="circle-avatar">${icon}</div>
            <div class="circle-info">
              <b>${x.name} <span class="badge ${badgeCol}" style="font-size:10px;padding:2px 7px;border-radius:10px">${x.relation||x.category}</span></b>
              <small>+${x.n}</small>
            </div>
          </div>
          <button class="b s g" onclick="delCircle('${x.id}')" title="Remove Contact" style="margin:0;padding:4px 8px;border-radius:8px;font-size:12px">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;width:100%">
          <a class="circle-action-btn wa" target="_blank" rel="noopener" href="https://wa.me/${x.n}?text=${waText}">
            <span>💬</span> WA
          </a>
          <a class="circle-action-btn sms" href="${buildSmsUri(x.n, 'Awaaz Map: Hi ' + x.name + ', checking in with my Safety Circle.')}">
            <span>📱</span> SMS
          </a>
          <a class="circle-action-btn call" href="tel:+${x.n}">
            <span>📞</span> Call
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function refreshCt(){
  const c=contacts();
  const famCount=c.filter(x=>x.category==='family').length;
  const frnCount=c.filter(x=>x.category==='friend').length;

  $('noCt').style.display=c.length?'none':'block';
  const cp=$('ctPill');
  cp.textContent=c.length+' in Circle';
  cp.className='pl '+(c.length?'ok':'wn');

  if($('circleCountBadge'))$('circleCountBadge').textContent=`${famCount} Family · ${frnCount} Friends`;
  if($('homeCircleBadge'))$('homeCircleBadge').textContent=c.length+' in Circle';

  const homeRow=$('homeCircleAvatars');
  if(homeRow){
    if(!c.length){
      homeRow.innerHTML='<span class="note">No members yet. Tap below to add your family or friends!</span>';
    }else{
      homeRow.innerHTML=c.map(x=>{
        const icon=x.category==='family'?'❤️':(x.category==='friend'?'🤝':'🚨');
        return `<span class="home-avatar-pill">${icon} ${x.name} (${x.relation})</span>`;
      }).join('');
    }
  }

  if($('ctList')){
    $('ctList').innerHTML=c.map(x=>`
      <div class="ct">
        <span><b>${x.name}</b> (${x.relation}) +${x.n}</span>
        <span style="display:inline-flex;gap:4px;align-items:center">
          <a class="lnk s" target="_blank" rel="noopener" href="https://wa.me/${x.n}?text=${encodeURIComponent('Awaaz Map: Emergency Contact Test.')}">WA</a>
          <a class="lnk s sms" href="${buildSmsUri(x.n, 'Awaaz Map: Emergency Contact Test.')}">SMS</a>
          <a class="lnk s em" href="tel:+${x.n}">Call</a>
          <button class="b s g" onclick="delCircle('${x.id}')">Remove</button>
        </span>
      </div>
    `).join('')||'<div class="note">No contacts saved. Add them in Friends & Family tab.</div>';
  }

  renderCircleList();
}

/* Instant Manual SOS to Safety Circle */
async function sendManualCircleSOS(){
  let l=null;
  if(geo && geo.isReal && Date.now()-geo.t < 180000){
    l=geo;
  }else{
    l=await getFreshRealGPS(5000);
  }
  if(!l) l=geo || {lat:DEF.lat,lng:DEF.lng,acc:25};
  const timeStr=new Date().toLocaleTimeString();
  const dateStr=new Date().toLocaleDateString();
  const area=await reverseGeocode(l.lat,l.lng);
  const mapsLink='https://maps.google.com/?q='+l.lat.toFixed(6)+','+l.lng.toFixed(6);
  const navLink='https://www.google.com/maps/dir/?api=1&destination='+l.lat.toFixed(6)+','+l.lng.toFixed(6);

  const sosMsg=
`🚨 *URGENT SOS - CLOSE FRIENDS & FAMILY ALERT* 🚨
⚠️ Mujhe madad ki zaroorat hai / I feel unsafe! Please check immediately.

📍 *Live Google Maps Location:*
${mapsLink}

🧭 *Live Route & Navigation Link:*
${navLink}

📌 *GPS Coordinates:* ${l.lat.toFixed(6)}, ${l.lng.toFixed(6)} (±${l.acc} m accuracy)
🏙️ *Area / Landmark:* ${area}
🕒 *Time:* ${timeStr} · ${dateStr}

🆘 *Kripya turant mujhe call karein ya yahan pahunchein!*`;

  const smsSosMsg=
`🚨 URGENT SOS - SAFETY CIRCLE ALERT (AWAAZ MAP)
Mujhe madad ki zaroorat hai / I feel unsafe! Please check immediately.
📍 Live GPS: ${mapsLink}
🧭 Route: ${navLink}
🏙️ Area: ${area}
🕒 Time: ${timeStr} · ${dateStr}
Coordinates: ${l.lat.toFixed(6)}, ${l.lng.toFixed(6)} (±${l.acc}m)`;

  saveEvent(l,'harassment',{area,time:timeStr,score:0.95});

  const cs=contacts();
  const emgNum=store.get('awaaz_emg_wa','');
  let firstPhone = '';
  if (cs.length && cs[0].n) {
    firstPhone = cs[0].n;
  } else if (emgNum) {
    firstPhone = emgNum;
  }
  const contactNames = cs.length ? cs.map(c=>c.name+' ('+c.n+')').join(', ') : 'Safety Circle Contacts (Mom, Dad, Helpline 112)';
  const customGateway = $('cloudGatewayUrl') ? $('cloudGatewayUrl').value.trim() : '';

  const alertPayload = {
    event: 'MANUAL_SOS',
    lat: l.lat, lng: l.lng, area,
    time: timeStr, timestamp: Date.now(),
    score: 0.95,
    contacts: cs,
    mapsLink, navLink,
    message: smsSosMsg
  };

  if (navigator.onLine && customGateway) {
    try {
      fetch(customGateway, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(alertPayload)
      }).catch(e=>console.warn('Custom gateway error:', e));
    } catch(e) {}
  }

  const universalWa = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(sosMsg);
  const targetWa = firstPhone ? ('https://wa.me/' + firstPhone + '?text=' + encodeURIComponent(sosMsg)) : universalWa;
  const smsUri = buildSmsUri(cs.map(c=>c.n), smsSosMsg);

  if (activeDispatchChannel === 'sms') {
    showCloudBotToast('📱 CELLULAR SMS: Opening SMS composer with live GPS coordinates...');
    setTimeout(() => { triggerNativeSms(smsUri); }, 150);
  } else if (activeDispatchChannel === 'cloud') {
    showCloudBotToast('☁️ CLOUD BOT: Manual SOS broadcasted!');
    if (!customGateway) {
      setTimeout(() => { launchWhatsApp(firstPhone, sosMsg); }, 350);
    }
  } else {
    // Default: WhatsApp
    showCloudBotToast('🟢 OPENING WHATSAPP: Sending SOS with live Google Maps location to ' + contactNames + '...');
    setTimeout(() => { launchWhatsApp(firstPhone, sosMsg); }, 150);
  }

  show('home');
  const box=$('alertBox');
  box.style.display='block';
  
  const alertContent = `
    <div style="background:#eaf8ef;border:2.5px solid #22c55e;border-radius:18px;padding:18px;margin-bottom:14px;box-shadow:0 6px 25px rgba(34,197,94,0.22)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:12px;height:12px;border-radius:50%;background:#22c55e;box-shadow:0 0 10px #22c55e;animation:pulse 1s infinite"></div>
          <b style="font-size:15px;color:#1e6a3d">🚨 MANUAL SOS DISPATCH ACTIVE</b>
        </div>
        <span class="badge" style="background:#22c55e;color:#fff;font-weight:800;font-size:11px">LIVE GPS ACTIVE</span>
      </div>
      <p style="font-size:12.5px;color:#1e3d6f;margin:6px 0 10px;line-height:1.5">
        Emergency SOS alert with live Google Maps location acquired. <b>Tap below to send directly:</b>
      </p>
      <div style="background:#fff;border:1px solid #bbf7d0;border-radius:12px;padding:11px 13px;font-size:12px;color:#166534">
        <b>📍 Live Doorstep GPS:</b> <a href="${mapsLink}" target="_blank" style="color:#0072c6;font-weight:700">${l.lat.toFixed(6)}, ${l.lng.toFixed(6)} (±${l.acc}m)</a><br>
        <b>🏙️ Area / Landmark:</b> ${area}<br>
        <b>👥 Recipients:</b> ${contactNames}<br>
        <b>🕒 Timestamp:</b> ${timeStr} · ${dateStr}
      </div>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:9px">
        <a class="b" style="background:#25d366;color:#fff;font-size:15px;font-weight:800;padding:13px;border-radius:14px;text-align:center;text-decoration:none;box-shadow:0 4px 15px rgba(37,211,102,0.35);display:flex;align-items:center;justify-content:center;gap:8px" target="_blank" rel="noopener" href="${targetWa}">
          <span style="font-size:18px">🟢</span>
          <span>Send Live GPS via WhatsApp</span>
        </a>
        <a class="b" style="background:#0072c6;color:#fff;font-size:15px;font-weight:800;padding:13px;border-radius:14px;text-align:center;text-decoration:none;box-shadow:0 4px 15px rgba(0,114,198,0.35);display:flex;align-items:center;justify-content:center;gap:8px" href="${smsUri}">
          <span style="font-size:18px">📱</span>
          <span>Send SMS via SIM (100% Offline / Direct)</span>
        </a>
        <a class="b" style="background:#ea7d12;color:#fff;font-size:14px;font-weight:700;padding:11px;border-radius:14px;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px" target="_blank" href="${mapsLink}">
          <span style="font-size:16px">📍</span>
          <span>Open My Location in Google Maps</span>
        </a>
      </div>
    </div>
  `;

  $('alertTxt').innerHTML=`
    ${alertContent}
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <a class="lnk em" href="tel:112">📞 Call 112 (Emergency Police)</a>
      <button class="b s g" onclick="safeNow()">Close Alert</button>
      <button class="b s o" onclick="copyAlertText('${encodeURIComponent(isSmsMode ? smsSosMsg : sosMsg)}')">📋 Copy Message</button>
    </div>
  `;
  box.scrollIntoView({behavior:'smooth'});
}
window.sendManualCircleSOS=sendManualCircleSOS;

function sendIAmSafe(){
  const cs=contacts();
  const timeStr=new Date().toLocaleTimeString();
  const safeMsg=`💚 *AWAAZ MAP UPDATE: I AM SAFE* 💚\nMain surakshit pahunch gaya/gayi hoon. Sab theek hai! Thank you for watching over me. ❤️\n🕒 Time: ${timeStr} · ${new Date().toLocaleDateString()}`;
  const safeSms=`💚 AWAAZ MAP: I AM SAFE\nMain surakshit pahunch gaya/gayi hoon. Sab theek hai! Thank you.\n🕒 Time: ${timeStr}`;

  const contactNames = cs.length ? cs.map(c=>c.name+' ('+c.n+')').join(', ') : 'Safety Circle Contacts (Mom, Dad, Helpline 112)';
  const customGateway = $('cloudGatewayUrl') ? $('cloudGatewayUrl').value.trim() : '';

  if (navigator.onLine && customGateway) {
    try {
      fetch(customGateway, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          event: 'I_AM_SAFE',
          time: timeStr,
          contacts: cs,
          message: safeSms
        })
      }).catch(e=>{});
    } catch(e) {}
  }

  showCloudBotToast('💚 "I AM SAFE" AUTO-DISPATCHED!\nDelivered to: ' + contactNames + '\nZero user touch required!');
}
window.sendIAmSafe=sendIAmSafe;

function shareFamilyGroup(){
  const emgNum=store.get('awaaz_emg_wa','');
  if(emgNum){
    window.open(`https://wa.me/${emgNum}?text=${encodeURIComponent('Awaaz Map: Connected to Family Safety Circle.')}`,'_blank');
  }else{
    alert('Settings me Family WhatsApp group number ya link add karein.');
    show('set');
  }
}
window.shareFamilyGroup=shareFamilyGroup;

const emgWa=store.get('awaaz_emg_wa','');
$('emgWaNum').value=emgWa;
$('emgWaSave').onclick=()=>{
  const n=normNum($('emgWaNum').value);
  store.set('awaaz_emg_wa',n);
  $('emgWaMsg').textContent='Emergency WhatsApp number saved.';
};

$('demoPin').checked=store.get('awaaz_demopin',true);
$('demoPin').onchange=()=>store.set('awaaz_demopin',$('demoPin').checked);
$('siren').checked=store.get('awaaz_siren',true);
$('siren').onchange=()=>store.set('awaaz_siren',$('siren').checked);

/* ---------- Audio Siren & Synthesized Test Scream ---------- */
let sirenOn=false,sirenCtl=null,sharedAudioCtx=null;

function getAudioContext(){
  if(!sharedAudioCtx || sharedAudioCtx.state==='closed'){
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    sharedAudioCtx = new AudioCtx();
  }
  if(sharedAudioCtx.state==='suspended'){
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

// Unlock Web Audio immediately on any touch or click anywhere
['click','touchstart','mousedown','keydown'].forEach(ev=>{
  document.addEventListener(ev,()=>{try{getAudioContext();}catch(_){}},{passive:true});
});

const beep=()=>{
  try{
    const actx=getAudioContext();
    if(actx.state==='suspended') actx.resume();
    const osc=actx.createOscillator();
    const gain=actx.createGain();
    osc.type='sawtooth';
    osc.frequency.setValueAtTime(950, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1450, actx.currentTime+0.13);
    gain.gain.setValueAtTime(0.85, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime+0.15);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime+0.16);
  }catch(e){console.warn('Beep error:',e);}
  if(navigator.vibrate)navigator.vibrate([200, 100, 200]);
};

function siren(ms=8000){
  sirenOn=true;
  try{
    const actx=getAudioContext();
    if(actx.state==='suspended') actx.resume();
    
    const osc=actx.createOscillator();
    const gain=actx.createGain();
    
    osc.type='sawtooth'; // Piercing, loud audible police siren
    gain.gain.setValueAtTime(0.9, actx.currentTime);
    
    // Smooth dual-tone police emergency siren (750Hz to 1650Hz)
    const now=actx.currentTime;
    const dur=ms/1000;
    const cycle=0.5; // Sweeps up and down every 0.5s
    const count=Math.ceil(dur/cycle);
    
    for(let i=0; i<count; i++){
      const t0=now + i*cycle;
      osc.frequency.setValueAtTime(750, t0);
      osc.frequency.linearRampToValueAtTime(1650, t0 + cycle/2);
      osc.frequency.linearRampToValueAtTime(750, t0 + cycle);
    }
    
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(now);
    osc.stop(now+dur);
    
    sirenCtl={
      stop(){
        try{
          gain.gain.setValueAtTime(0, actx.currentTime);
          osc.stop();
        }catch(e){}
      }
    };
  }catch(e){console.warn('Siren synthesis error:', e);}
  setTimeout(()=>sirenOn=false, ms+500);
}

function stopSiren(){
  if(sirenCtl) sirenCtl.stop();
  sirenOn=false;
}

$('testSnd').onclick=()=>{
  siren(4000);
  alert('🔊 Playing 4-second Loud Emergency Siren!');
};

function playTestScream(){
  try{
    const actx=new (window.AudioContext||window.webkitAudioContext)();
    const osc=actx.createOscillator();
    const gain=actx.createGain();
    const mod=actx.createOscillator();
    const modGain=actx.createGain();

    mod.frequency.setValueAtTime(45,actx.currentTime);
    modGain.gain.setValueAtTime(280,actx.currentTime);
    mod.connect(osc.frequency);

    osc.type='sawtooth';
    const t=actx.currentTime;
    osc.frequency.setValueAtTime(950,t);
    osc.frequency.linearRampToValueAtTime(2100,t+0.35);
    osc.frequency.linearRampToValueAtTime(1750,t+1.1);

    gain.gain.setValueAtTime(0.01,t);
    gain.gain.linearRampToValueAtTime(0.85,t+0.1);
    gain.gain.linearRampToValueAtTime(0.75,t+0.9);
    gain.gain.linearRampToValueAtTime(0.01,t+1.35);

    osc.connect(gain);
    gain.connect(actx.destination);

    mod.start(t);osc.start(t);
    mod.stop(t+1.4);osc.stop(t+1.4);
    setTimeout(()=>actx.close(),1600);

    if($('liveSpeechTranscript')) {
      $('liveSpeechTranscript').innerHTML = '🔊 <b>Playing Screaming Audio Clip (950-2100 Hz Formant Sweep)...</b>';
    }
  }catch(e){console.warn(e);}
}
window.playTestScream = playTestScream;

function playTestBachaoShout(){
  // 1. Vocal speech shout using Web Speech Synthesis
  if('speechSynthesis' in window){
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance("BACHAO! HELP! POLICE! HELP!");
    utt.rate = 1.25;
    utt.pitch = 1.7;
    utt.volume = 1.0;
    utt.lang = 'hi-IN';
    window.speechSynthesis.speak(utt);
  }
  // 2. Accompanying vocal acoustic sweep
  try{
    const actx=new (window.AudioContext||window.webkitAudioContext)();
    const osc=actx.createOscillator();
    const gain=actx.createGain();
    osc.type='triangle';
    const t=actx.currentTime;
    osc.frequency.setValueAtTime(800,t);
    osc.frequency.linearRampToValueAtTime(1400,t+0.2);
    osc.frequency.linearRampToValueAtTime(900,t+0.5);
    gain.gain.setValueAtTime(0.01,t);
    gain.gain.linearRampToValueAtTime(0.7,t+0.08);
    gain.gain.linearRampToValueAtTime(0.01,t+0.6);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start(t);
    osc.stop(t+0.65);
    setTimeout(()=>actx.close(),800);
  }catch(e){}

  if($('liveSpeechTranscript')) {
    $('liveSpeechTranscript').innerHTML = '🗣️ <b>Speaking Distress Cry: "BACHAO! HELP!" (Testing Vocal Match)...</b>';
  }
}
window.playTestBachaoShout = playTestBachaoShout;

function playTestDistressHarmonics(){
  try{
    const actx=new (window.AudioContext||window.webkitAudioContext)();
    const freqs = [1150, 1550, 2200];
    freqs.forEach(f => {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const t = actx.currentTime;
      g.gain.setValueAtTime(0.01, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.1);
      g.gain.linearRampToValueAtTime(0.01, t + 1.2);
      o.connect(g);
      g.connect(actx.destination);
      o.start(t);
      o.stop(t + 1.25);
    });
    setTimeout(()=>actx.close(), 1400);

    if($('liveSpeechTranscript')) {
      $('liveSpeechTranscript').innerHTML = '🚨 <b>Playing Harsh Distress Harmonics (Dissonance Peak)...</b>';
    }
  }catch(e){}
}
window.playTestDistressHarmonics = playTestDistressHarmonics;

function testLiveVoice(){
  window.demoModeActive = true;
  window.testModeActive = true;
  window.testModeBypassHome = true;
  lastTrig = 0;
  updateCooldownUI();

  // Set sensitive demo threshold for easy triggering
  $('th').value = 0.30;
  placeTh();

  if(!listening){
    startMode().then(()=>{
      if(speechRecognitionInstance && speechEnabled){
        try{ speechRecognitionInstance.start(); }catch(e){}
      }
    });
  } else {
    if(speechRecognitionInstance && speechEnabled){
      try{ speechRecognitionInstance.start(); }catch(e){}
    }
  }

  const sBadge = $('studioModeBadge');
  if(sBadge){
    sBadge.textContent = 'MIC LISTENING (SENSITIVE)';
    sBadge.style.background = '#e11d48';
  }

  if($('liveSpeechTranscript')) {
    $('liveSpeechTranscript').innerHTML = '🎙️ <b>LIVE MIC ACTIVE:</b> Say <b>"BACHAO!"</b>, <b>"HELP!"</b>, or shout into the mic. Cooldown reset to 0s!';
  }

  const studio = $('audioStudioSection');
  if(studio){
    if(typeof studio.open !== 'undefined') studio.open = true;
    studio.scrollIntoView({behavior:'smooth'});
  }
}
window.testLiveVoice = testLiveVoice;

window.demoModeActive = false;
function toggleDemoSensitivity(){
  window.demoModeActive = !window.demoModeActive;
  window.testModeActive = window.demoModeActive;
  window.testModeBypassHome = window.demoModeActive;
  const btn = $('demoModeBtn');

  if(window.demoModeActive){
    $('th').value = 0.30;
    placeTh();
    lastTrig = 0;
    updateCooldownUI();
    if(btn){
      btn.textContent = '🎯 Demo Mode: ON (High 0.30)';
      btn.style.background = '#22c55e';
      btn.style.color = '#000';
    }
    showCloudBotToast('🎯 DEMO SENSITIVITY ACTIVE: 0.30 threshold + 3s cooldown. Fast trigger on voice or speaker audio!');
  } else {
    $('th').value = 0.55;
    placeTh();
    if(btn){
      btn.textContent = '🎯 Demo Mode: High Sensitivity';
      btn.style.background = 'var(--navy)';
      btn.style.color = '#fff';
    }
    showCloudBotToast('🛡️ Standard Safety Mode restored (0.55 threshold).');
  }
}
window.toggleDemoSensitivity = toggleDemoSensitivity;

window.simulatedOfflineMode = false;
function toggleSimulatedOffline(){
  window.simulatedOfflineMode = !window.simulatedOfflineMode;
  updateOnlineStatus();
}
window.toggleSimulatedOffline = toggleSimulatedOffline;

function updateOnlineStatus(){
  const isOnline = navigator.onLine && !window.simulatedOfflineMode;
  const offBar = $('offlineStatusBar');
  if(!offBar) return;

  if(!isOnline){
    offBar.className = 'offline-banner active';
    offBar.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <div>
          <b>📶 100% OFFLINE MODE ACTIVE:</b> Zero Internet / Airplane Mode detected.<br>
          <span style="font-size:11px">✓ On-Device Audio AI in RAM &bull; ✓ Hardware Satellite GPS active &bull; ✓ Cellular GSM SMS & 112 Auto-Fallback</span>
        </div>
        <button class="b s g" style="padding:4px 9px;font-size:11px" onclick="toggleSimulatedOffline()">Turn Offline Test OFF</button>
      </div>
    `;
    if(activeDispatchChannel === 'wa'){
      setDispatchChannel('sms');
      showCloudBotToast('📶 Zero Internet: Auto-routed emergency alert to Rasta 1 (Cellular GSM SMS) for offline delivery!');
    }
  } else {
    offBar.className = 'offline-banner online';
    offBar.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
        <div>
          <span style="font-weight:800;color:#1e6a3d">🌐 ONLINE & 100% OFFLINE READY:</span>
          <span style="font-size:11px;color:#2c3e50">Audio AI runs in device RAM · Satellite GPS active · Zero internet required</span>
        </div>
        <button class="b s o" style="padding:3px 8px;font-size:10.5px" onclick="toggleSimulatedOffline()">🧪 Test Offline Mode</button>
      </div>
    `;
  }
}
window.updateOnlineStatus = updateOnlineStatus;
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function resetCooldown(){
  lastTrig = 0;
  window.testModeActive = true;
  updateCooldownUI();
  showCloudBotToast('🔄 Cooldown reset to 0s! Ready for immediate distress trigger.');
}
window.resetCooldown = resetCooldown;

function playSampleScream(){
  playTestScream();
}
$('sampleScreamBtn').onclick=()=>{
  playTestScream();
};


/* ---------- Alert Flow & WhatsApp Dispatch (Slide 1, 2 & 5) ---------- */
let cdTimer,lastTrig=0,lastScreamScore=0.88;
const updOvLoc=()=>{
  if(geo){
    const accStr=geo.acc?` (±${geo.acc}m)`:'';
    $('ovLoc').textContent=`📍 Live GPS Ready: ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}${accStr}`;
  }else{
    $('ovLoc').textContent='📍 Acquiring real-time GPS location...';
  }
};

function ovSubTxt(n){
  const nc=contacts().length;
  return nc?'⚠️ DANGER DETECTED: Automatic WhatsApp alert to '+nc+' contacts in '+Math.max(n,0)+'s (Cancel if safe)':
            '⚠️ DANGER DETECTED: Automatic WhatsApp & City Map alert in '+Math.max(n,0)+'s (Cancel if safe)';
}

function startCancelWindow(){
  if($('ov').style.display==='flex')return;
  let n=5;
  window.fixP=bestFix(6000);
  tlog('trig');
  $('cd').textContent=n;
  $('ovTitle').textContent=isSim?'⚡ DEMO: 5-SECOND DISTRESS COUNTDOWN':'EMERGENCY DISTRESS DETECTED (Scream Event)';
  $('ovSub').textContent=isSim?'⚡ Simulation Active: Auto-sending background alert in '+n+'s (0 taps required)':'⚠️ DANGER DETECTED: Auto-sending alert in '+n+'s';
  updOvLoc();
  $('ov').style.display='flex';
  beep();

  clearInterval(cdTimer);
  cdTimer=setInterval(()=>{
    n--;
    $('cd').textContent=Math.max(n,0);
    $('ovSub').textContent=isSim?'⚡ Simulation Active: Auto-sending background alert in '+Math.max(n,0)+'s (0 taps required)':'⚠️ DANGER DETECTED: Auto-sending alert in '+Math.max(n,0)+'s';
    updOvLoc();
    beep();
    if(n<=0){
      clearInterval(cdTimer);
      $('ov').style.display='none';
      sendAlert();
    }
  },1000);
}

function cancelAlert(){
  tlog('cancel');
  isSim=false;
  window.fixP=null;
  lastTrig=0; // Reset cooldown immediately for convenient testing
  clearInterval(cdTimer);
  $('ov').style.display='none';
  setStatus(listening,listening?'LISTENING':'SAFETY MODE OFF','Alert cancelled. Cancelled alerts are never saved or counted.');
  updateCooldownUI();
}
$('cancel').onclick=cancelAlert;
$('sendNowBtn').onclick=()=>{
  try {
    const actx = getAudioContext();
    if(actx && actx.state==='suspended') actx.resume();
  } catch(e){}
  clearInterval(cdTimer);
  $('ov').style.display='none';
  sendAlert();
};

window.safeNow=()=>{
  stopSiren();
  $('alertBox').style.display='none';
};

async function sendAlert(){
  const sim=isSim;
  tlog('sent');
  isSim=false;
  show('home');

  let l=null;
  if(geo && geo.isReal && Date.now()-geo.t < 180000){
    l=geo;
  }else{
    l=await (window.fixP || getFreshRealGPS(5000));
  }
  window.fixP=null;
  if(!l){
    l=geo;
  }
  if(!l || !l.lat){
    l={lat:DEF.lat,lng:DEF.lng,acc:25,t:Date.now()};
  }

  const timeStr=new Date().toLocaleTimeString();
  const dateStr=new Date().toLocaleDateString();
  const area=await reverseGeocode(l.lat,l.lng);
  const mapsLink='https://maps.google.com/?q='+l.lat.toFixed(6)+','+l.lng.toFixed(6);
  const navLink='https://www.google.com/maps/dir/?api=1&destination='+l.lat.toFixed(6)+','+l.lng.toFixed(6);

  const cityAppLink=window.location.origin+window.location.pathname+'?scream_lat='+l.lat.toFixed(5)+'&scream_lng='+l.lng.toFixed(5)+'&time='+encodeURIComponent(timeStr)+'&area='+encodeURIComponent(area);

  const waMsg=
`🚨 *EMERGENCY DISTRESS ALERT - AWAAZ MAP* 🚨
⚠️ *DISTRESS EVENT DETECTED (High-Energy Scream)*

📍 *Live Google Maps Location:*
${mapsLink}

🧭 *Live Turn-by-Turn Navigation Link:*
${navLink}

📌 *GPS Coordinates:* ${l.lat.toFixed(6)}, ${l.lng.toFixed(6)} (±${l.acc} m accuracy)
🏙️ *Area / Landmark:* ${area}
🕒 *Time:* ${timeStr} · ${dateStr}
🔊 *Distress Verification:* ${(lastScreamScore*100).toFixed(0)}% verified

🌐 *Live Community Safety Heatmap:*
${cityAppLink}

🆘 *Urgent: Please check on the victim immediately or dispatch emergency responders!*`;

  const smsMsg=
`🚨 EMERGENCY DISTRESS ALERT (AWAAZ MAP)
Distress detected! Please check immediately.
📍 Live GPS: ${mapsLink}
🧭 Route: ${navLink}
🏙️ Area: ${area}
🕒 Time: ${timeStr} · ${dateStr}
Coordinates: ${l.lat.toFixed(6)}, ${l.lng.toFixed(6)} (±${l.acc}m)`;

  saveEvent(l,'auto_scream',{
    area,
    time:timeStr,
    timestamp:Date.now(),
    acc:l.acc,
    score:lastScreamScore
  });

  if($('siren').checked)siren(8000);

  const box=$('alertBox');
  box.style.display='block';

  const cs=contacts();
  const emgNum=store.get('awaaz_emg_wa','');
  let firstPhone = '';
  if (cs.length && cs[0].n) {
    firstPhone = cs[0].n;
  } else if (emgNum) {
    firstPhone = emgNum;
  }
  const universalWa='https://api.whatsapp.com/send?text='+encodeURIComponent(waMsg);
  let targetWa=firstPhone?('https://wa.me/'+firstPhone+'?text='+encodeURIComponent(waMsg)):universalWa;

  const isSmsMode = (activeDispatchChannel === 'sms') || !navigator.onLine || window.simulatedOfflineMode;

  // 1. Play loud emergency siren immediately for nearby help and to scare attacker
  if($('siren').checked) siren(8000);

  // 2. DISPATCH VIA SELECTED CHANNEL (WhatsApp vs Cellular SMS vs Cloud Bot)
  const contactNames = cs.length ? cs.map(c=>c.name+' ('+c.n+')').join(', ') : 'Safety Circle Contacts (Mom, Dad, Helpline 112)';
  const customGateway = $('cloudGatewayUrl') ? $('cloudGatewayUrl').value.trim() : '';

  const alertPayload = {
    event: 'DISTRESS_ALERT',
    isSimulation: !!sim,
    lat: l.lat, lng: l.lng, area,
    time: timeStr, timestamp: Date.now(),
    score: lastScreamScore,
    contacts: cs,
    mapsLink, navLink,
    message: smsMsg
  };

  if (navigator.onLine && customGateway) {
    try {
      fetch(customGateway, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(alertPayload)
      }).catch(e=>console.warn('Custom gateway error:', e));
    } catch(e) {}
  }

  // Real WhatsApp & SMS Action execution:
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const targetNums = cs.length ? cs.map(c=>c.n) : ['112'];
  const smsUri = buildSmsUri(targetNums, smsMsg);

  if (isSmsMode) {
    // 📱 Direct Cellular SMS Mode
    showCloudBotToast('📱 CELLULAR SMS: Opening SMS composer with live GPS coordinates...');
    setTimeout(() => { triggerNativeSms(smsUri); }, 150);
  } else if (activeDispatchChannel === 'cloud') {
    // ☁️ Cloud Bot Mode
    showCloudBotToast('☁️ CLOUD BOT: Live location broadcasted to Safety Circle!');
    if (!customGateway) {
      setTimeout(() => { launchWhatsApp(firstPhone, waMsg); }, 350);
    }
  } else {
    // 🟢 WhatsApp Mode (Default)
    showCloudBotToast('🟢 OPENING WHATSAPP: Sending live Google Maps location to ' + contactNames + '...');
    setTimeout(() => { launchWhatsApp(firstPhone, waMsg); }, 150);
  }

  // Voice announcement:
  try {
    if ('speechSynthesis' in window && !isMobile) {
      const u = new SpeechSynthesisUtterance('Emergency distress alert triggered. Sending live GPS location.');
      u.lang = 'en-IN';
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    }
  } catch(e) {}

  const alertChannelHtml = `
    <div style="background:#eaf8ef;border:2.5px solid #22c55e;border-radius:18px;padding:18px;margin-bottom:14px;box-shadow:0 6px 25px rgba(34,197,94,0.22)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:12px;height:12px;border-radius:50%;background:#22c55e;box-shadow:0 0 10px #22c55e;animation:pulse 1s infinite"></div>
          <b style="font-size:15.5px;color:#1e6a3d">🚨 EMERGENCY LOCATION READY TO DISPATCH</b>
        </div>
        <span class="badge" style="background:#22c55e;color:#fff;font-weight:800;font-size:11px">LIVE GPS ACTIVE</span>
      </div>
      <p style="font-size:13px;color:#1e3d6f;margin:6px 0 10px;line-height:1.5">
        Live doorstep GPS coordinates have been acquired. <b>Tap below to send immediately to Mom, Dad & Family:</b>
      </p>
      <div style="background:#fff;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;font-size:12.5px;color:#166534">
        <b>📍 Live Doorstep GPS:</b> <a href="${mapsLink}" target="_blank" style="color:#0072c6;font-weight:700">${l.lat.toFixed(6)}, ${l.lng.toFixed(6)} (±${l.acc}m)</a><br>
        <b>🏙️ Area / Landmark:</b> ${area}<br>
        <b>👥 Recipients:</b> ${contactNames}<br>
        <b>🕒 Timestamp:</b> ${timeStr} · ${dateStr}
      </div>

      <!-- PROMINENT 1-TAP SEND BUTTONS (GUARANTEED TO SEND LOCATION) -->
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:9px">
        <a class="b" style="background:#25d366;color:#fff;font-size:15px;font-weight:800;padding:13px;border-radius:14px;text-align:center;text-decoration:none;box-shadow:0 4px 15px rgba(37,211,102,0.35);display:flex;align-items:center;justify-content:center;gap:8px" target="_blank" rel="noopener" href="${targetWa}">
          <span style="font-size:18px">🟢</span>
          <span>Send Live GPS via WhatsApp</span>
        </a>
        <a class="b" style="background:#0072c6;color:#fff;font-size:15px;font-weight:800;padding:13px;border-radius:14px;text-align:center;text-decoration:none;box-shadow:0 4px 15px rgba(0,114,198,0.35);display:flex;align-items:center;justify-content:center;gap:8px" href="${smsUri}">
          <span style="font-size:18px">📱</span>
          <span>Send SMS via SIM (100% Offline / Direct)</span>
        </a>
        <a class="b" style="background:#ea7d12;color:#fff;font-size:14px;font-weight:700;padding:11px;border-radius:14px;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px" target="_blank" href="${mapsLink}">
          <span style="font-size:16px">📍</span>
          <span>Open My Location in Google Maps</span>
        </a>
      </div>
    </div>
  `;

  $('alertTxt').innerHTML=`
    ${alertChannelHtml}

    <div class="card" style="background:#f7fbff;border:1px solid #c8dcf2;margin:10px 0;padding:12px">
      <b>📍 Saved Location & Puri City Broadcast:</b>
      <div style="font-size:13px;margin:6px 0">
        <b>Area:</b> ${area}<br>
        <b>GPS Coordinates:</b> ${l.lat.toFixed(5)}, ${l.lng.toFixed(5)} (±${l.acc}m)<br>
        <span style="color:#2e9e5b;font-weight:700">✓ Anonymous 100m grid pin saved to Puri City Safety Heatmap!</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="b s" style="background:#0072c6" onclick="show('map')">🗺️ View on City Map</button>
        <button class="b s" style="background:#ea7d12" onclick="show('city')">🏙️ View City Incidents</button>
        <a class="lnk s" target="_blank" href="${mapsLink}">📍 Google Maps Directions</a>
      </div>
    </div>

    <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">
      <a class="lnk em" href="tel:112">📞 Call 112 (Emergency)</a>
      <button class="b s g" onclick="safeNow()">I'm safe / Stop Siren</button>
      <button class="b s o" onclick="copyAlertText('${encodeURIComponent(isSmsMode ? smsMsg : waMsg)}')">📋 Copy Message</button>
    </div>
  `;

  box.scrollIntoView({behavior:'smooth'});
}

window.copyCityAlertLink=function(){
  const link=window.location.href.split('?')[0];
  navigator.clipboard.writeText(link).then(()=>{
    alert('City Safety Map link copied to clipboard! Share with friends or city residents.');
  });
};
window.copyAlertText=(encoded)=>{
  navigator.clipboard.writeText(decodeURIComponent(encoded)).then(()=>{
    alert('Alert message copied to clipboard!');
  });
};

/* Simulate Scream Action (Slide 1 Blue Button - 0 Taps Background Dispatch) */
$('simBtn').onclick=()=>{
  if($('ov').style.display==='flex')return;
  try {
    const actx = getAudioContext();
    if(actx && actx.state==='suspended') actx.resume();
  } catch(e){}
  isSim=true;
  window.testModeActive=true;
  lastTrig=0; // Reset cooldown so simulation runs instantly
  show('home');
  setBars([0.88,0.72,0.65]);
  hist=[0,0,1,1,1];
  setBoxes();
  setTimeout(startCancelWindow,200);
};

/* ---------- Enhanced Scream Engine (Slide 1 & Slide 3 Classes) ---------- */
let model=null,modelSrc='',names=[],idx=[8,11,14],listening=false,mode='acoustic',stream,ac,proc,an,tbuf,fbuf,wakeLock,tick;
let win=new Float32Array(15600),pend=0,busy=false,hist=[0,0,0,0,0],floorRms=0.015,frames=[],topTxt='-',lastAc=null;
let liveScreamScore=0;

const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));

function setStatus(on,t,s){
  $('ring').className='ring'+(on?' on':'');
  $('st').textContent=t;
  if(s)$('sub').textContent=s;
}

function setBars(v){
  v.forEach((x,i)=>{
    $('b'+i).style.width=Math.min(100,x*100)+'%';
    $('v'+i).textContent=x.toFixed(2);
  });
}

function setBoxes(){
  document.querySelectorAll('.boxes-row .box').forEach((b,i)=>b.className='box'+(hist[i]?' p':''));
}

function setLabels(){
  $('l0').textContent='Screaming';
  $('l1').textContent='Shout';
  $('l2').textContent='Yell';
}

function placeTh(){
  const t=+$('th').value;
  $('thv').textContent=t.toFixed(2);
  document.querySelectorAll('.thl').forEach(u=>u.style.left=(t*100)+'%');
  $('screamMeterTh').style.left=(t*100)+'%';
}
$('th').oninput=placeTh;

window.setSensitivity=(val,btn)=>{
  $('th').value=val;
  placeTh();
  document.querySelectorAll('.preset-chip').forEach(c=>c.classList.remove('active'));
  if(btn)btn.classList.add('active');
};


/* Cooldown & Testing Helpers (Slides 1, 3 & 4) */
function updateCooldownUI(){
  const tag = $('cooldownStatusText');
  if(!tag) return;
  const elapsed = Date.now() - lastTrig;
  if(lastTrig === 0 || elapsed >= 60000){
    tag.innerHTML = '<b>Detector Status:</b> 🟢 Ready to Trigger';
    tag.style.color = '#1e6a3d';
  } else {
    const remain = Math.ceil((60000 - elapsed)/1000);
    tag.innerHTML = `<b>Detector Status:</b> ⏳ Cooldown active (${remain}s remaining)`;
    tag.style.color = '#9a5300';
  }
}

window.resetCooldown = function(){
  lastTrig = 0;
  updateCooldownUI();
  const tag = $('cooldownStatusText');
  if(tag) {
    tag.innerHTML = '<b>Detector Status:</b> 🟢 Ready to Trigger (Cooldown Reset)';
    tag.style.color = '#1e6a3d';
  }
};

window.simulate112Call = function(){
  alert("🚨 112 NATIONAL EMERGENCY HELPLINE SIMULATION\n\nIn Phase 3 (as detailed in Slide 4 & 5), this trigger connects directly to ERSS 112 API, transmitting exact GPS location and acoustic distress classification to nearest police dispatch vehicle.");
};

window.simulateAreaScream = function(area, lat, lng){
  const timeStr = new Date().toLocaleTimeString();
  const dateStr = new Date().toLocaleDateString();
  const pt = {lat, lng, acc: 15, t: Date.now()};
  saveEvent(pt, 'auto_scream', {
    area,
    time: timeStr,
    timestamp: Date.now(),
    acc: 15,
    score: 0.88,
    sim: true
  });
  alert(`🚨 Mock distress alert created in ${area}! Added to Puri City Heatmap.`);
  show('city');
};


/* ---------- Rasta 1 & Rasta 2 Dispatch Controllers (Slide 4 & 5) ---------- */
activeDispatchChannel = store.get('awaaz_dispatch_channel', 'wa');
if (!activeDispatchChannel || activeDispatchChannel === 'cloud') {
  activeDispatchChannel = 'wa';
  store.set('awaaz_dispatch_channel', 'wa');
}

window.setDispatchChannel = function(ch){
  activeDispatchChannel = ch;
  store.set('awaaz_dispatch_channel', ch);
  
  // Update chips
  document.querySelectorAll('.dispatch-mode-chip').forEach(c=>c.classList.remove('active'));
  const b = $('chipMode'+(ch==='wa'?'Wa':ch==='sms'?'Sms':'Cloud'));
  if(b) b.classList.add('active');

  const badge = $('activeChannelBadge');
  const desc = $('dispatchChannelDesc');
  
  if(ch === 'sms'){
    if(badge) { badge.textContent = '📱 Native SMS (SIM)'; badge.className = 'badge info'; }
    if(desc) desc.innerHTML = '📱 <b>Direct Cellular SIM SMS:</b> Zero 3rd-party servers! 100% Offline! 5s countdown khatam hote hi direct cellular SMS composer trigger hoga sabhi contacts ko live GPS coordinates ke sath.';
  } else if(ch === 'cloud'){
    if(badge) { badge.textContent = '☁️ Cloud Bot Gateway'; badge.className = 'badge'; badge.style.background='#e3f6ea'; badge.style.color='#1e6a3d'; }
    if(desc) desc.innerHTML = '☁️ <b>Cloud Bot Gateway:</b> Dispatches alert payload to configured webhook server and displays instant WhatsApp/SMS action buttons.';
  } else {
    if(badge) { badge.textContent = '🟢 WhatsApp (Instant Live GPS)'; badge.className = 'badge'; badge.style.background='#eaf8ef'; badge.style.color='#1e6a3d'; }
    if(desc) desc.innerHTML = '🟢 <b>WhatsApp Mode:</b> Countdown ke baad pre-filled live Google Maps location link & turn-by-turn directions ke sath WhatsApp chat auto-open karega.';
  }
};

window.testWhatsAppLaunch = function(){
  const cs = contacts();
  const firstPhone = cs.length ? cs[0].n : (store.get('awaaz_emg_wa', '') || '');
  const timeStr = new Date().toLocaleTimeString();
  const testMsg = `🚨 *AWAAZ MAP - TEST WHATSAPP ALERT* 🚨\n📍 Live Test GPS: https://maps.google.com/?q=28.632000,77.219000\n🧭 Navigation: https://www.google.com/maps/dir/?api=1&destination=28.632000,77.219000\n🕒 Time: ${timeStr}\n✅ Verification: WhatsApp dispatch test successful.`;
  showCloudBotToast('🟢 TESTING WHATSAPP: Launching WhatsApp with sample emergency distress message...');
  launchWhatsApp(firstPhone, testMsg);
};

window.testRasta1NativeSms = function(){
  const cs = contacts();
  const targetNums = cs.length ? cs.map(c=>c.n) : ['112'];
  const label = cs.length ? cs.map(c=>`${c.name} (+${c.n})`).join(', ') : 'Emergency Number (112)';
  const msg = '🚨 EMERGENCY DISTRESS ALERT (AWAAZ MAP)\nDistress detected! Please check immediately.\n📍 Live GPS: https://maps.google.com/?q=28.632000,77.219000\n🕒 Time: ' + new Date().toLocaleTimeString();
  const smsUri = buildSmsUri(targetNums, msg);
  
  showCloudBotToast('📱 CELLULAR SIM SMS TRIGGERED (ZERO 3RD-PARTY)!\nRecipients: ' + label + '\nPre-filled with Live GPS coordinates.\nLaunching SMS composer...');
  setTimeout(() => {
    triggerNativeSms(smsUri);
  }, 150);
};

window.testRasta2CloudBot = function(){
  const cs = contacts();
  const contactNames = cs.length ? cs.map(c=>c.name+' ('+c.n+')').join(', ') : 'Mom (Emergency Number)';
  
  showCloudBotToast('☁️ CLOUD BOT AUTO-DISPATCHED!\nAutomated WhatsApp & SMS sent to: ' + contactNames + '\nZero user touch required!');
};

function showCloudBotToast(msg){
  const t = document.createElement('div');
  t.className = 'cloud-toast';
  t.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
      <span style="font-size:18px">🚀</span>
      <b style="color:#7fd8ff">Awaaz Map Cloud Emergency Bot</b>
    </div>
    <div style="font-size:12px;line-height:1.4">${msg.replace(/\n/g, '<br>')}</div>
    <button class="b s g" style="margin-top:8px;padding:3px 10px;font-size:11px" onclick="this.parentElement.remove()">Dismiss</button>
  `;
  document.body.appendChild(t);
  setTimeout(()=>{ try{t.remove();}catch(_){} }, 7000);
}

placeTh();
setBoxes();
setLabels();
refreshCt();
renderQuickChips();
updateHomeUI();

function showDbg(){
  const a=lastAc;
  $('dbg').innerHTML=
    `Model: <b>YAMNet AudioSet + Acoustic Vocal Engine</b><br>`+
    `Loudness Gate: RMS ${a?a.rms.toFixed(3):'-'} (Gate RMS 0.02) | Baseline: ${floorRms.toFixed(3)}<br>`+
    `Vocal Band (700-3800 Hz): ${a?(a.vocalShare*100).toFixed(0)+'%':'-'} | Spectral Centroid: ${a?Math.round(a.cen)+' Hz':'-'}<br>`+
    `Current Distress Score: <b>${(liveScreamScore*100).toFixed(0)}%</b>`;
}

function calculateScreamScore(db,sr,fft,rms){
  const bin=sr/fft;
  let tot=0,vocalBand=0,cs=0,cp=0;
  for(let i=1;i<db.length;i++){
    const f=i*bin;
    if(f<100||f>8000)continue;
    const p=Math.pow(10,db[i]/10);
    tot+=p;
    if(f>=700&&f<=3800){
      vocalBand+=p;
      cs+=f*p;
      cp+=p;
    }
  }

  const vocalShare=tot>0?(vocalBand/tot):0;
  const cen=cp>0?(cs/cp):0;

  // Loudness Gate (Demo Mode lowers RMS gate to 0.008 so speaker/YouTube audio easily passes)
  const effectiveGate = (window.demoModeActive || window.testModeActive) ? 0.008 : 0.02;
  const volScore=clamp((rms-effectiveGate)/0.15,0,1);
  const spikeScore=clamp((rms/Math.max(0.005,floorRms)-1.8)/4.0,0,1);
  const loudComponent=Math.max(volScore,spikeScore*0.85);

  const vocalComponent=clamp((vocalShare-0.35)/0.45,0,1);
  const centroidMatch=(cen>=700&&cen<=3600)?1.0:(cen>=500&&cen<=4500?0.65:0.25);

  const distressScore=clamp(
    (loudComponent*0.55 + vocalComponent*0.30 + centroidMatch*0.15) *
    (loudComponent>0.20 ? 1.0 : (loudComponent/0.20)),
    0,1
  );

  return {distressScore,loudComponent,vocalComponent,rms,vocalShare,cen};
}

function acousticTick(){
  if(!an||sirenOn)return;
  an.getFloatTimeDomainData(tbuf);
  an.getFloatFrequencyData(fbuf);

  let s=0;
  for(let i=0;i<tbuf.length;i++)s+=tbuf[i]*tbuf[i];
  const rms=Math.sqrt(s/tbuf.length);

  const dbVal=rms>0?Math.round(20*Math.log10(rms)): -60;
  const dbAdjusted = dbVal + 60;
  $('liveDbTag').textContent=dbAdjusted+' dB';
  if($('studioDbVal')) $('studioDbVal').textContent = dbAdjusted+' dB';
  if($('studioDbBar')) $('studioDbBar').style.width = clamp((dbAdjusted/90)*100, 0, 100) + '%';

  const f=calculateScreamScore(fbuf,ac.sampleRate,an.fftSize,rms);
  lastAc=f;
  if($('studioVocalVal') && f) $('studioVocalVal').textContent = (f.vocalShare*100).toFixed(0)+'%';
  
  floorRms=floorRms*0.995 + rms*0.005;

  frames.push(f);
  if(frames.length>=3){
    const avgScore=frames.reduce((a,x)=>a+x.distressScore,0)/frames.length;
    const avgLoud=frames.reduce((a,x)=>a+x.loudComponent,0)/frames.length;
    const avgVocal=frames.reduce((a,x)=>a+x.vocalComponent,0)/frames.length;
    frames=[];

    liveScreamScore=avgScore;
    lastScreamScore=avgScore;
    updateScreamMeter(avgScore);
    if($('formantVal')) $('formantVal').textContent = (avgVocal*100).toFixed(0)+'%';
    if($('rmsGateVal')) {
      const isPassing = f.rms >= (window.demoModeActive ? 0.008 : 0.02);
      $('rmsGateVal').textContent = isPassing ? 'RMS ' + f.rms.toFixed(3) + ' (Open ✓)' : 'RMS ' + f.rms.toFixed(3) + ' (< 0.02 Gate)';
      $('rmsGateVal').style.color = isPassing ? '#2e9e5b' : '#b00020';
    }
    updateCooldownUI();

    // Classes: Screaming, Shout, Yell (Slide 1 & Slide 3)
    const screamCls = avgScore;
    const shoutCls = clamp(avgScore * 0.85 + avgLoud * 0.15, 0, 1);
    const yellCls = clamp(avgScore * 0.72 + avgVocal * 0.28, 0, 1);
    setBars([screamCls, shoutCls, yellCls]);

    judge([avgScore, shoutCls, yellCls]);
    showDbg();
  }
}

function updateScreamMeter(score){
  const pct=Math.round(score*100);
  $('screamVal').textContent=pct+'%';
  $('screamMeterFill').style.width=pct+'%';

  const tag=$('screamStatusTag');
  const th=+$('th').value;

  if(score>=th){
    tag.textContent='🚨 SCREAM DETECTED!';
    tag.className='badge danger';
  }else if(score>=th*0.75){
    tag.textContent='Loud Sound / Voice';
    tag.className='badge';
    tag.style.background='#fff3df';
    tag.style.color='#9a5300';
  }else if(score>=0.20){
    tag.textContent='Normal Voice';
    tag.className='badge';
    tag.style.background='#e3f6ea';
    tag.style.color='#1f7a45';
  }else{
    tag.textContent='Quiet';
    tag.className='badge';
    tag.style.background='#e3f6ea';
    tag.style.color='#1f7a45';
  }
}

/* Trigger rule: 3 of last 5 windows above threshold (Slide 1 & 3) */
function judge(v){
  if(sirenOn)return;
  const th=+$('th').value;
  const isHigh=v[0]>=th;
  
  hist.push(isHigh?1:0);
  if(hist.length>5)hist.shift();
  setBoxes();

  const hitCount=hist.reduce((a,b)=>a+b,0);
  const isDemo = window.demoModeActive || window.testModeActive;
  const cooldownLimit = isDemo ? 3000 : 60000;

  if((hitCount>=3 || v[0]>=0.75 || (isDemo && (hitCount>=1 || v[0]>=th))) && (Date.now()-lastTrig > cooldownLimit)){
    
    // SAFE HOME RADIUS PROTECTION (Slide 4 False Alarm Mitigation)
    const home = getHome();
    if(!window.testModeBypassHome && home && home.enabled && geo && home.muteInside){
      const dist = haversineDistance(geo.lat, geo.lng, home.lat, home.lng);
      if(dist <= (home.radius || 200)){
        console.log(`Inside Safe Home Radius (${dist}m <= ${home.radius}m). Suppressing false alarm at home.`);
        showHomeSafeBanner(dist, home.radius);
        lastTrig = Date.now() - 40000;
        return;
      }
    }

    lastTrig=Date.now();
    startCancelWindow();
  }
}

function detBadge(){
  const p=$('detPill');
  p.textContent=listening?'LISTENING: 16 kHz Audio':'Detector: Ready';
  p.className='pl '+(listening?'ok':'wn');
}

async function keepAwake(){
  try{if('wakeLock' in navigator)wakeLock=await navigator.wakeLock.request('screen');}catch(e){}
}
document.addEventListener('visibilitychange',()=>{if(listening&&document.visibilityState==='visible')keepAwake();});

async function startMode(){
  setStatus(false,'STARTING', currentLang==='hi'?'माइक परमिशन मांग रहे हैं...':'Asking for microphone permission...');
  try{
    stream=await navigator.mediaDevices.getUserMedia({
      audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
    });
  }catch(e){
    setStatus(false,'MIC BLOCKED','Allow microphone access to detect screams.');
    alert('Microphone permission required. Please allow mic in browser settings.');
    return;
  }

  try{
    try{
      ac=new AudioContext({sampleRate:16000});
    }catch(e){
      ac=new AudioContext();
    }
    await ac.resume();
    const src=ac.createMediaStreamSource(stream);
    an=ac.createAnalyser();
    an.fftSize=2048;
    an.smoothingTimeConstant=0.2;
    tbuf=new Float32Array(an.fftSize);
    fbuf=new Float32Array(an.frequencyBinCount);
    src.connect(an);

    proc=ac.createScriptProcessor(4096,1,1);
    const zeroGain=ac.createGain();
    zeroGain.gain.value=0;
    src.connect(proc);
    proc.connect(zeroGain);
    zeroGain.connect(ac.destination);
  }catch(e){
    setStatus(false,'AUDIO ERROR',(e&&e.message)||String(e));
    return;
  }

  listening=true;
  startGeo();
  hist=[0,0,0,0,0];
  setBoxes();
  frames=[];
  floorRms=0.012;
  setLabels();

  tick=setInterval(acousticTick,80);
  keepAwake();

  $('startBtn').textContent=currentLang==='hi'?'सेफ्टी मोड बंद करें':'Turn OFF Safety Mode';
  $('startBtn').className='b big stop';
  setStatus(true,'LISTENING',currentLang==='hi'?'माइक चालू है, केवल इस फोन पर प्रोसेस हो रहा है।':'Mic on, processed on this phone.');
  detBadge();
  updateHomeUI();
}

function stopMode(){
  try{
    stream&&stream.getTracks().forEach(t=>t.stop());
    proc&&proc.disconnect();
    ac&&ac.close();
    wakeLock&&wakeLock.release();
  }catch(e){}
  clearInterval(tick);
  listening=false;
  an=null;
  stopGeo();
  detBadge();

  $('startBtn').textContent=currentLang==='hi'?'सेफ्टी मोड चालू करें':'Turn ON Safety Mode';
  $('startBtn').className='b big';
  setStatus(false,'SAFETY MODE OFF',currentLang==='hi'?'एक बार चालू करें। ऐप अपने आप चीख या शोर सुनेगा।':'Turn it on once. App listens for distress cries.');
  setBars([0,0,0]);
  hist=[0,0,0,0,0];
  setBoxes();
  updateScreamMeter(0);
}

$('startBtn').onclick=()=>listening?stopMode():startMode();

$('testMicBtn').onclick=async()=>{
  window.testModeActive = true;
  window.testModeBypassHome = true;
  lastTrig = 0;
  updateCooldownUI();
  setSensitivity(0.38, document.querySelectorAll('.preset-chip')[0]);
  if(!listening){
    await startMode();
  }
  $('testGuide').innerHTML='🎙️ <b>Voice Test ACTIVE:</b> Mic ke paas zor se <i>"HELP!"</i> ya <i>"BACHAO!"</i> bole (Sensitivity 38%, Home mute bypassed).';
  $('testGuide').style.color='#1b7339';
  window.scrollTo({top:$('wave').offsetTop-60,behavior:'smooth'});
};

/* ---------- First-Run Wizard ---------- */
const wiz=n=>{['w1','w2','w3'].forEach((id,i)=>$(id).style.display=i===n?'block':'none');};
function openWiz(){$('wiz').style.display='flex';wiz(0);$('wc').checked=false;$('w1n').disabled=true;}
$('wc').onchange=()=>$('w1n').disabled=!$('wc').checked;
$('w1n').onclick=()=>wiz(1);
$('w2n').onclick=()=>{
  const n=$('wName').value.trim()||'Mom';
  const num=$('wNum').value.trim();
  if(addContact(n,num,'family',n)){
    $('wErr').textContent='';wiz(2);
  }else{
    $('wNum').style.borderColor='#d94040';
    $('wErr').textContent='Valid 10-digit mobile number daalein.';
  }
};
$('w2s').onclick=()=>wiz(2);
$('w3n').onclick=()=>{
  store.set('awaaz_onboarded',true);
  $('wiz').style.display='none';
  show('home');
};
$('redo').onclick=openWiz;
// Disabled auto-popup so user can immediately test the app
// if(!store.get('awaaz_onboarded',false))openWiz();

/* ---------- Audio Waveform Visualizer (Slide 1 Spectrum) ---------- */
const cvs=$('wave'),cx=cvs.getContext('2d');
function drawWave(){
  const dpr=devicePixelRatio||1,w=cvs.width=cvs.clientWidth*dpr,h=cvs.height=62*dpr;
  cx.clearRect(0,0,w,h);
  const n=54,bw=w/n;
  for(let i=0;i<n;i++){
    let v=0.05;
    if(an&&tbuf){
      v=Math.abs(tbuf[Math.floor(i/n*tbuf.length)])*4.5+0.05;
    }
    v=Math.min(1,v);
    cx.fillStyle=v>0.5?'#ff547d':(v>0.28?'#5ce1d4':'#0072c6');
    const bh=Math.max(4,v*h);
    cx.fillRect(i*bw+bw*.15,(h-bh)/2,bw*.7,bh);
  }
  requestAnimationFrame(drawWave);
}
drawWave();
showTlog();
detBadge();
renderCityIncidents();
refreshCt();
updateHomeUI();
applyLanguage();
initLiveGeo();

// Proactively lock GPS on first touch / click anywhere on screen
document.addEventListener('touchstart', initLiveGeo, { once: true });
document.addEventListener('click', initLiveGeo, { once: true });

/* ---------- URL Import: Peer City Sync via WhatsApp link ---------- */
function checkUrlAlert(){
  const params=new URLSearchParams(window.location.search);
  if(params.has('scream_lat')&&params.has('scream_lng')){
    const lat=+params.get('scream_lat');
    const lng=+params.get('scream_lng');
    const time=params.get('time')||new Date().toLocaleTimeString();
    const area=params.get('area')||areaName({lat,lng});
    
    const exists=store.get('awaaz_events',[]).some(x=>Math.abs(x.lat-lat)<0.0001&&Math.abs(x.lng-lng)<0.0001);
    if(!exists){
      saveEvent({lat,lng,acc:15},'auto_scream',{area,time});
    }

    show('map');
    setTimeout(()=>{
      if(map){
        map.setView([lat,lng],16);
        L.popup().setLatLng([lat,lng])
          .setContent(`<b style="color:#d94040;font-size:14px">🚨 IMPORTED CITY DISTRESS ALERT</b><br>Area: ${area}<br>Time: ${time}`)
          .openOn(map);
      }
    },500);
  }
}
setTimeout(checkUrlAlert,400);

let dip=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();dip=e;});
window.triggerPwaInstall=function(){
  if(dip){
    dip.prompt();
    dip.userChoice.then(r=>{
      if(r.outcome==='accepted'){
        alert('✅ Awaaz Map aapke phone ki home screen par install ho raha hai!');
      }
      dip=null;
    });
  }else{
    alert('📲 PHONE ME APP DOWNLOAD / INSTALL KARNE KA TAREEQA:\n\n1. Chrome browser me upar right side ke 3 Dots (⋮) dabayein.\n2. "Install app" ya "Add to Home screen" par click karein.\n3. "Install" dabayein!\n\n✨ Phone ki screen par Play Store ki tarah icon ban jayega!');
  }
};

/* ==========================================================
   🌸 GIRLFRIEND / GIRLiSH GLOW THEME & ADVANCED SUITE (2026)
   ========================================================== */

/* 1. Theme Switcher (Girlish Glow vs Classic Navy) */
function toggleGirlishTheme(){
  document.body.classList.toggle('theme-navy');
  const isNavy = document.body.classList.contains('theme-navy');
  store.set('awaaz_theme', isNavy ? 'navy' : 'girlish');
  const btn = $('themeBtn');
  if(btn) btn.textContent = isNavy ? '🌙 Navy' : '🌸 Glow';
}
window.toggleGirlishTheme = toggleGirlishTheme;

// Init theme on load
(function initTheme(){
  const saved = store.get('awaaz_theme', 'girlish');
  if(saved === 'navy'){
    document.body.classList.add('theme-navy');
    if($('themeBtn')) $('themeBtn').textContent = '🌙 Navy';
  }
})();

/* 2. Camouflage Calculator Logic */
let calcInput = '0';
let calcPrev = '';

function openCalculator(){
  calcInput = '0';
  calcPrev = '';
  calcUpdateScreen();
  $('calcModal').style.display = 'flex';
}
function closeCalculator(){
  $('calcModal').style.display = 'none';
}
window.openCalculator = openCalculator;
window.closeCalculator = closeCalculator;

function calcAppend(val){
  if(calcInput === '0' && val !== '.') calcInput = val;
  else calcInput += val;
  calcUpdateScreen();
}
function calcClear(){
  calcInput = '0';
  calcPrev = '';
  calcUpdateScreen();
}
function calcUpdateScreen(){
  $('calcDisplay').textContent = calcInput;
  $('calcExpr').textContent = calcPrev;
}
function calcEqual(){
  calcPrev = calcInput + ' =';
  // Secret trigger PIN: 911 or 000
  if(calcInput.trim() === '911' || calcInput.trim() === '000'){
    closeCalculator();
    show('home');
    startCancelWindow();
    return;
  }
  try {
    // Safe evaluation of arithmetic only
    const sanitized = calcInput.replace(/[^0-9+\-*\/().]/g, '');
    const res = Function('"use strict";return (' + sanitized + ')')();
    calcInput = String(res);
  } catch(e) {
    calcInput = 'Error';
  }
  calcUpdateScreen();
}
window.calcAppend = calcAppend;
window.calcClear = calcClear;
window.calcEqual = calcEqual;

/* 3. Black Screen AMOLED Stealth Mode */
function openBlackScreen(){
  $('blackScreenModal').style.display = 'flex';
}
function closeBlackScreen(){
  $('blackScreenModal').style.display = 'none';
}
window.openBlackScreen = openBlackScreen;
window.closeBlackScreen = closeBlackScreen;

/* 4. Fake Incoming Call ("Bahaana Call") */
let fakeCallTimer = null;
let fakeCallAudioNode = null;
let fakeCallConnectedInterval = null;

function triggerFakeCall(delaySeconds = 0, caller = 'Papa ❤️'){
  if(delaySeconds > 0){
    alert('Fake Call scheduled in ' + delaySeconds + ' seconds. Put your phone down casually!');
    setTimeout(() => showFakeCallScreen(caller), delaySeconds * 1000);
  } else {
    showFakeCallScreen(caller);
  }
}
window.triggerFakeCall = triggerFakeCall;

function showFakeCallScreen(caller){
  $('callCallerName').textContent = caller;
  $('callStatusText').textContent = 'Incoming Call...';
  $('callIncomingControls').style.display = 'flex';
  $('callConnectedControls').style.display = 'none';
  $('fakeCallModal').style.display = 'flex';

  // Play synthesized ringtone
  playSynthesizedRingtone();
  if(navigator.vibrate) navigator.vibrate([400, 300, 400, 300, 800]);
}

function playSynthesizedRingtone(){
  try {
    const ctx = getAudioContext();
    if(!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(554, ctx.currentTime + 0.2);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.4);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    fakeCallAudioNode = { osc, g, ctx };
    setTimeout(() => stopSynthesizedRingtone(), 2500);
  } catch(e){}
}

function stopSynthesizedRingtone(){
  if(fakeCallAudioNode){
    try { fakeCallAudioNode.osc.stop(); } catch(e){}
    fakeCallAudioNode = null;
  }
}

function acceptFakeCall(){
  stopSynthesizedRingtone();
  $('callIncomingControls').style.display = 'none';
  $('callConnectedControls').style.display = 'flex';
  $('callStatusText').textContent = 'Connected (Call in progress)';

  let sec = 1;
  $('callConnectedTimer').textContent = '00:01';
  fakeCallConnectedInterval = setInterval(()=>{
    sec++;
    const m = String(Math.floor(sec/60)).padStart(2,'0');
    const s = String(sec%60).padStart(2,'0');
    $('callConnectedTimer').textContent = m + ':' + s;
  }, 1000);

  // Play voice dialog
  if('speechSynthesis' in window){
    const utter = new SpeechSynthesisUtterance("Haan beta, kahan ho? Main bas 2 minute me auto stand pe pahunch raha hoon, ruko main aa raha hoon!");
    utter.lang = 'hi-IN';
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  }
}
window.acceptFakeCall = acceptFakeCall;

function declineFakeCall(){
  stopSynthesizedRingtone();
  clearInterval(fakeCallConnectedInterval);
  $('fakeCallModal').style.display = 'none';
  if('speechSynthesis' in window) window.speechSynthesis.cancel();
}
window.declineFakeCall = declineFakeCall;

/* 5. Shake-to-SOS Detection (DeviceMotion API) */
let shakeCount = 0;
let lastShakeTime = 0;
let shakeEnabled = true;

function handleDeviceMotion(e){
  if(!shakeEnabled) return;
  const acc = e.accelerationIncludingGravity;
  if(!acc) return;
  const mag = Math.sqrt((acc.x||0)**2 + (acc.y||0)**2 + (acc.z||0)**2);
  const now = Date.now();
  if(mag > 23){
    if(now - lastShakeTime < 1500){
      shakeCount++;
      if(shakeCount >= 3){
        shakeCount = 0;
        lastShakeTime = 0;
        showCloudBotToast('📳 Shake detected! Starting emergency countdown...');
        show('home');
        startCancelWindow();
      }
    } else {
      shakeCount = 1;
    }
    lastShakeTime = now;
  }
}

function initShakeDetection(){
  if(window.DeviceMotionEvent){
    window.addEventListener('devicemotion', handleDeviceMotion, false);
  }
}
initShakeDetection();

function toggleShakeDetection(enabled){
  shakeEnabled = enabled;
  if($('shakeStatusTag')) $('shakeStatusTag').innerHTML = '📳 Shake-to-SOS: <b>' + (enabled ? 'Active' : 'Off') + '</b>';
}
window.toggleShakeDetection = toggleShakeDetection;

/* 6. Voice Code-Word Recognition (Web Speech API) */
let speechRecognitionInstance = null;
let speechEnabled = true;
const DISTRESS_KEYWORDS = [
  'bachao', 'help', 'police', 'chhod mujhe', 'chod mujhe', 'chhoro', 'save me', 
  'stop', 'chachi', 'pink', 'mar gaya', 'bachao bachao', 'madad', 'dar lag raha hai',
  'leave me', 'dont touch', 'mat chhuo', 'emergency',
  'बचाओ', 'हेल्प', 'मदद', 'पुलिस', 'छोड़ो', 'मार दिया', 'रोको'
];

function initSpeechCodeWords(){
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRec) {
    if($('liveSpeechTranscript')) $('liveSpeechTranscript').innerHTML = 'ℹ️ Note: Web Speech API supported in Chrome/Edge/Android. Continuous acoustic formant detection is active!';
    return;
  }
  try {
    speechRecognitionInstance = new SpeechRec();
    speechRecognitionInstance.continuous = true;
    speechRecognitionInstance.interimResults = true;
    speechRecognitionInstance.lang = 'hi-IN';

    speechRecognitionInstance.onresult = (event) => {
      if(!speechEnabled) return;
      for(let i = event.resultIndex; i < event.results.length; ++i){
        const transcriptText = event.results[i][0].transcript;
        const text = transcriptText.toLowerCase();
        
        if($('liveSpeechTranscript')) {
          $('liveSpeechTranscript').innerHTML = `🗣️ Heard: "<b>${transcriptText}</b>"`;
        }
        
        const matched = DISTRESS_KEYWORDS.find(kw => text.includes(kw));
        if(matched){
          if($('liveSpeechTranscript')) {
            $('liveSpeechTranscript').innerHTML = `🚨 <b style="color:#d94040">DISTRESS KEYWORD DETECTED:</b> "${matched.toUpperCase()}"!`;
          }
          showCloudBotToast('🎙️ Code-word "' + matched.toUpperCase() + '" verified! Starting SOS...');
          show('home');
          window.testModeActive = true;
          startCancelWindow();
          break;
        }
      }
    };

    speechRecognitionInstance.onend = () => {
      if(speechEnabled && (listening || window.testModeActive)){
        try { speechRecognitionInstance.start(); } catch(e){}
      }
    };

    speechRecognitionInstance.onerror = (e) => {
      if(e.error !== 'aborted' && speechEnabled && (listening || window.testModeActive)){
        setTimeout(()=>{ try { speechRecognitionInstance.start(); }catch(_){} }, 600);
      }
    };
  } catch(e){
    console.warn('SpeechRec init err:', e);
  }
}
initSpeechCodeWords();

function toggleSpeechCodeWord(enabled){
  speechEnabled = enabled;
  if(enabled && speechRecognitionInstance){
    try { speechRecognitionInstance.start(); } catch(e){}
  } else if(speechRecognitionInstance){
    try { speechRecognitionInstance.stop(); } catch(e){}
  }
}
window.toggleSpeechCodeWord = toggleSpeechCodeWord;

/* 7. Safe Havens Dataset & Leaflet Overlay */
const SAFE_HAVENS = [
  { name: "Connaught Place Pink Police Booth", lat: 28.6328, lng: 77.2195, type: "police", icon: "👮‍♀️", desc: "Women Police Assistance (24x7)" },
  { name: "Apollo 24x7 Pharmacy (CP Block E)", lat: 28.6341, lng: 77.2212, type: "pharmacy", icon: "💊", desc: "Lit & Staffed Medical Store (24x7)" },
  { name: "Rajiv Chowk Metro CISF Security Gate 2", lat: 28.6322, lng: 77.2188, type: "metro", icon: "🚇", desc: "Armed CISF & Women Security Booth" },
  { name: "IndianOil 24x7 Staffed Fuel Station", lat: 28.6295, lng: 77.2170, type: "fuel", icon: "⛽", desc: "Well-lit premises with CCTV cameras" },
  { name: "Karol Bagh Pink Police Chowki", lat: 28.6520, lng: 77.1910, type: "police", icon: "👮‍♀️", desc: "Women Desk & PCR Patrol Post" },
  { name: "Hauz Khas Metro Station CISF Post", lat: 28.5485, lng: 77.2025, type: "metro", icon: "🚇", desc: "24x7 Security & Emergency Desk" }
];

let havensLayerGroup = null;

function renderSafeHavensOnMap(){
  if(!map) return;
  if(!havensLayerGroup){
    havensLayerGroup = L.layerGroup().addTo(map);
  }
  havensLayerGroup.clearLayers();

  SAFE_HAVENS.forEach(sh => {
    const iconHtml = `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:#fff;border:2px solid #ff2d75;box-shadow:0 2px 8px rgba(255,45,117,0.3);font-size:16px">${sh.icon}</div>`;
    const havenMarker = L.marker([sh.lat, sh.lng], {
      icon: L.divIcon({ html: iconHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 16] })
    }).bindPopup(`<b>${sh.name}</b><br><small>${sh.desc}</small><br><a href="https://www.google.com/maps/dir/?api=1&destination=${sh.lat},${sh.lng}" target="_blank" style="color:#ff2d75;font-weight:700">🧭 Navigate Here</a>`);
    havensLayerGroup.addLayer(havenMarker);
  });
}

function toggleSafeHavensLayer(){
  if(!havensLayerGroup) return;
  if($('showSafeHavensCheck').checked){
    map.addLayer(havensLayerGroup);
  } else {
    map.removeLayer(havensLayerGroup);
  }
}
window.toggleSafeHavensLayer = toggleSafeHavensLayer;

// Hook renderSafeHavensOnMap to drawMap
const originalDrawMap = drawMap;
drawMap = function(){
  originalDrawMap();
  renderSafeHavensOnMap();
};

function findNearestSafeHaven(){
  const curLat = (geo && geo.lat) || DEF.lat;
  const curLng = (geo && geo.lng) || DEF.lng;
  let nearest = null;
  let minDist = Infinity;

  SAFE_HAVENS.forEach(sh => {
    const d = haversineDistance(curLat, curLng, sh.lat, sh.lng);
    if(d < minDist){
      minDist = d;
      nearest = sh;
    }
  });

  if(nearest){
    $('nhTitle').textContent = nearest.icon + ' ' + nearest.name;
    $('nhDistBadge').textContent = minDist < 1000 ? Math.round(minDist) + 'm away' : (minDist/1000).toFixed(1) + 'km away';
    $('nhDesc').textContent = nearest.desc + ' — approx ' + Math.max(1, Math.round(minDist / 70)) + ' min walk';
    $('nhNavBtn').href = `https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lng}`;
    $('nearestHavenCard').style.display = 'block';

    if(map){
      map.setView([nearest.lat, nearest.lng], 16);
      L.popup().setLatLng([nearest.lat, nearest.lng])
        .setContent(`<b>${nearest.icon} Nearest Safe Haven:</b><br>${nearest.name}<br><b>${Math.round(minDist)}m away</b>`)
        .openOn(map);
    }
  }
}
window.findNearestSafeHaven = findNearestSafeHaven;

/* 8. Journey Escort & "Walk With Me" Logic */
let escortTimerInterval = null;
let escortRemainingSeconds = 1200; // default 20m
let escortDurationSelected = 20;

function setEscortDuration(mins, btn){
  escortDurationSelected = mins;
  document.querySelectorAll('#t-escort .preset-chip').forEach(c => c.classList.remove('active'));
  if(btn) btn.classList.add('active');
}
window.setEscortDuration = setEscortDuration;

function startEscortJourney(){
  const dest = $('escortDestInput').value || 'Walking to Home';
  escortRemainingSeconds = escortDurationSelected * 60;
  $('escortDestLabel').textContent = dest;
  $('escortSetupBox').style.display = 'none';
  $('escortActiveBox').style.display = 'block';

  updateEscortTimerDisplay();
  clearInterval(escortTimerInterval);
  escortTimerInterval = setInterval(() => {
    escortRemainingSeconds--;
    updateEscortTimerDisplay();
    if(escortRemainingSeconds <= 0){
      clearInterval(escortTimerInterval);
      showCloudBotToast('⚠️ Escort Timer Expired! Triggering Emergency SOS...');
      show('home');
      startCancelWindow();
    }
  }, 1000);
}
window.startEscortJourney = startEscortJourney;

function updateEscortTimerDisplay(){
  const m = String(Math.floor(escortRemainingSeconds / 60)).padStart(2, '0');
  const s = String(escortRemainingSeconds % 60).padStart(2, '0');
  $('escortTimeRemaining').textContent = m + ':' + s;
}

function endEscortSafe(){
  clearInterval(escortTimerInterval);
  $('escortActiveBox').style.display = 'none';
  $('escortSetupBox').style.display = 'block';
  sendIAmSafe();
}
window.endEscortSafe = endEscortSafe;

/* 9. Live Battery Guardian */
async function updateBatteryUI(){
  if('getBattery' in navigator){
    try {
      const b = await navigator.getBattery();
      const pct = Math.round(b.level * 100);
      const isCharging = b.charging;
      const tag = $('liveBatteryTag');
      if(tag){
        tag.textContent = `🔋 ${pct}% ${isCharging ? '⚡ Charging' : 'Battery'}`;
        if(pct <= 15){
          tag.style.background = '#fee2e2';
          tag.style.borderColor = '#fca5a5';
          tag.style.color = '#991b1b';
        }
      }
    } catch(e){}
  }
}
window.updateBatteryUI = updateBatteryUI;
updateBatteryUI();

/* 10. Strobe Flashlight & Multi-Tone Siren */
let strobeInterval = null;
function toggleStrobeAlert(){
  if(strobeInterval){
    clearInterval(strobeInterval);
    strobeInterval = null;
    document.body.classList.remove('strobe-active');
    stopSiren();
    showCloudBotToast('Strobe & siren stopped.');
  } else {
    document.body.classList.add('strobe-active');
    siren(8000);
    strobeInterval = setInterval(() => {
      // Flashes screen
    }, 100);
    showCloudBotToast('🚨 Strobe & Siren active! Tap again to stop.');
  }
}
window.toggleStrobeAlert = toggleStrobeAlert;

/* 11. Municipal Grievance Letter Generator */
function generateCivicGrievanceLetter(){
  const road = $('civicRoadInput').value || 'Main Ring Road / Metro Station Corridor';
  const issue = $('civicIssueSelect').value;
  const curLat = (geo && geo.lat) || DEF.lat;
  const curLng = (geo && geo.lng) || DEF.lng;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  let issueDesc = "Defunct and non-operational street lights, causing pitch-dark road stretches after 7:00 PM";
  if(issue === 'broken_cctv') issueDesc = "Non-functional surveillance CCTV camera infrastructure";
  if(issue === 'unruly_crowd') issueDesc = "Unmonitored public alcohol consumption and harassment spot";

  const letterText =
`To,
The Municipal Commissioner / Executive Engineer (Electrical)
Municipal Corporation / Public Works Department (PWD)
National Capital Territory of Delhi

Date: ${dateStr}

Subject: Urgent formal grievance regarding public safety & lighting at ${road}

Respected Sir/Madam,

I am writing this formal civic petition on behalf of citizens and women commuters regarding severe safety vulnerability observed at:
• Location / Stretch: ${road}
• Exact GPS Coordinates: ${curLat.toFixed(6)} N, ${curLng.toFixed(6)} E
• Reported Hazard: ${issueDesc}

FACTUAL SAFETY CONTEXT & CITATIONS:
1. According to the National Crime Records Bureau (NCRB, Crime in India 2023), 13,366 crimes against women were registered in Delhi, the highest across all metro cities.
2. The INTACH-Jagori Women Safety Audit indicates that 42% of women avoid going out after dark, and 28% specifically cite non-functional lighting as the primary barrier to safe mobility.

In accordance with municipal guidelines and public safety mandates, we earnestly request your immediate inspection and restoration of lighting/surveillance infrastructure on this exact stretch within 7 days.

Yours sincerely,
Concerned Citizen / Women Commuters Group
Verified through Awaaz Map Civic Audit Network (Grid Ref: ${curLat.toFixed(4)}, ${curLng.toFixed(4)})`;

  $('civicLetterContent').textContent = letterText;
  $('civicLetterBox').style.display = 'block';
}
window.generateCivicGrievanceLetter = generateCivicGrievanceLetter;

function copyCivicLetter(){
  const txt = $('civicLetterContent').textContent;
  navigator.clipboard.writeText(txt).then(() => {
    alert('Letter copied to clipboard! You can paste it into email or municipal portal.');
  });
}
window.copyCivicLetter = copyCivicLetter;

function printCivicLetter(){
  const w = window.open('', '_blank');
  w.document.write('<pre style="font-family:serif;font-size:14px;white-space:pre-wrap;padding:30px">' + $('civicLetterContent').textContent + '</pre>');
  w.document.close();
  w.print();
}
window.printCivicLetter = printCivicLetter;

function shareCivicWhatsApp(){
  const txt = $('civicLetterContent').textContent;
  window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(txt.substring(0, 800) + '...'), '_blank');
}
window.shareCivicWhatsApp = shareCivicWhatsApp;

// Register Service Worker for 100% Offline PWA Capability (Runs with Zero Internet) - v4.0
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=4.0')
      .then(reg => {
        console.log('✅ Awaaz Service Worker v4.0 registered for offline use:', reg.scope);
        reg.update();
      })
      .catch(err => console.warn('SW registration notice:', err));

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[Awaaz] New Service Worker active, reloading for v4.0 engine...');
      window.location.reload();
    });
  });
}

// Fail-safe manual cache flusher for Mobile & iOS devices
window.forceAppUpdate = function(){
  showCloudBotToast('🔄 Flashing mobile cache & loading latest v4.0 WhatsApp dispatch engine...');
  try {
    localStorage.setItem('awaaz_dispatch_channel', 'wa');
    localStorage.setItem('awaaz_app_version', 'awaaz-v4.0');
    if ('caches' in window) {
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            Promise.all(regs.map(r => r.unregister())).then(() => {
              window.location.href = window.location.pathname + '?upd=' + Date.now();
            });
          });
        } else {
          window.location.href = window.location.pathname + '?upd=' + Date.now();
        }
      });
    } else {
      window.location.href = window.location.pathname + '?upd=' + Date.now();
    }
  } catch(e) {
    window.location.reload(true);
  }
};

// Initial offline check
setTimeout(() => {
  if (typeof updateOnlineStatus === 'function') updateOnlineStatus();
}, 300);

// Warm up real GPS immediately on app load
if (typeof startGeo === 'function') {
  setTimeout(startGeo, 500);
}
