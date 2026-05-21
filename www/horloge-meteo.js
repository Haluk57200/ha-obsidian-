// Widget Horloge + Météo + Présence
// Extrait de dashboard.yaml — ha-obsidian
// ⚠️  Adapte les entity_id à ton installation

const d = new Date();
const heure = d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
const jourStr = d.toLocaleDateString('fr-FR',{weekday:'long'});
const dateStr = d.toLocaleDateString('fr-FR',{day:'numeric',month:'long'});
const sem = Math.ceil((d - new Date(d.getFullYear(),0,1)) / 86400000 / 7);
const h = d.getHours();
const hello = h<6?'Bonne nuit 🌙':h<12?'Bonjour ☀️':h<18?'Bonne journée 🏠':h<22?'Bonsoir 🌆':'Bonne nuit 🌙';

// ── Météo — remplace par ton entité météo ────────────────
const w = states['weather.ma_maison'];
const temp = w?.attributes?.temperature ?? '—';
const cond = w?.state ?? '';
const cmap = {sunny:'Ensoleillé',clear:'Dégagé','clear-night':'Nuit claire',cloudy:'Nuageux','partly-cloudy':'Éclaircies',rainy:'Pluie',pouring:'Forte pluie',snowy:'Neige',fog:'Brouillard',windy:'Vent',lightning:'Orage'};
const condText = cmap[cond] || cond;
const wIcons = ['sunny','clear-night','partly-cloudy','cloudy','rainy','pouring','lightning-rainy','lightning','snowy','snowy-rainy','fog','windy','windy-variant','hail','exceptional'];
const wIcon = wIcons.includes(cond) ? cond.includes('sun')||cond.includes('clear')?'☀️':cond.includes('rain')||cond.includes('pour')?'🌧️':cond.includes('snow')?'❄️':cond.includes('fog')?'🌫️':'🌤️' : '🌤️';

// ── Lumières — ajoute/retire tes entités lumières ────────
const lights = [
  'light.salon',
  'light.cuisine',
  'light.chambre',
  'light.entree',
  // ajoute tes lumières ici...
];
const nbOn = lights.filter(e => states[e]?.state === 'on').length;

// ── Présence — remplace par ta personne ─────────────────
const presence = states['person.utilisateur']?.state;
const presText = presence === 'home' ? 'Maison' : presence ? presence : '';

// ── Mode maison (optionnel) ───────────────────────────────
const modeM = states['input_select.mode_maison']?.state;

const div = `<div style="height:1px;background:linear-gradient(90deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03),transparent);margin:14px 0"></div>`;
return `<div style="color:white">
  <div style="font-size:68px;font-weight:100;letter-spacing:-5px;line-height:1;color:rgba(255,255,255,0.97);font-feature-settings:'tnum'">${heure}</div>
  <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.36);text-transform:capitalize;margin-top:5px">${jourStr}<br>${dateStr}</div>
  <div style="font-size:10.5px;font-weight:700;color:rgba(255,255,255,0.20);margin-top:2px">Semaine ${sem}</div>
  <div style="font-size:17px;font-weight:800;color:rgba(255,255,255,0.88)">${hello}</div>
  ${nbOn > 0 ? `<div style="font-size:11.5px;font-weight:700;color:rgba(255,255,255,0.34);margin-top:4px">${nbOn} lumière${nbOn>1?'s':''} allumée${nbOn>1?'s':''}</div>` : ''}
  ${presText ? `<div style="font-size:11.5px;font-weight:700;color:rgba(126,224,181,0.58);margin-top:2px">${presText}</div>` : ''}
  ${modeM ? `<div style="font-size:10.5px;font-weight:700;color:rgba(255,255,255,0.22);margin-top:2px;text-transform:capitalize">${modeM}</div>` : ''}
  ${div}
  <div style="font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.26);margin-bottom:7px">Météo</div>
  <div style="display:flex;align-items:flex-start;justify-content:space-between">
    <div>
      <div style="font-size:24px;font-weight:800;color:rgba(255,255,255,0.94)">${temp}°</div>
      <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.32);margin-top:2px">${condText}</div>
    </div>
    <div style="font-size:28px;margin-top:2px">${wIcon}</div>
  </div>
</div>`;
