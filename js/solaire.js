// Widget Puissance Solaire
// Extrait de dashboard.yaml — ha-obsidian
// ⚠️  Remplace par tes capteurs solaires
//     Compatible : SolarEdge, Fronius, Huawei, Enphase, SolarMax...

// sensor.onduleur_puissance  → puissance instantanée en W
// sensor.onduleur_production → production journalière en kWh
const pac = parseFloat(states['sensor.onduleur_puissance']?.state) || 0;
const kdy = parseFloat(states['sensor.onduleur_production']?.state);
const kwhTxt = Number.isFinite(kdy) ? kdy.toFixed(1) + ' kWh' : '0 kWh';
const solMsg = pac>2000?'Production forte':pac>800?'Production active':pac>0?'Faible luminosité':'Aucune production';

const div = `<div style="height:1px;background:linear-gradient(90deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03),transparent);margin:14px 0"></div>`;
return `<div style="color:white">
  ${div}
  <div style="font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.26);margin-bottom:7px">Puissance solaire</div>
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>
      <div style="font-size:28px;font-weight:800;color:rgba(255,255,255,0.94);line-height:1">${Math.round(pac)}<span style="font-size:13px;color:rgba(255,255,255,0.30)"> W</span></div>
      <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.28);margin-top:3px">${solMsg} · ${kwhTxt}</div>
    </div>
    <div style="font-size:22px">${pac>0?'☀️':''}</div>
  </div>
</div>`;
