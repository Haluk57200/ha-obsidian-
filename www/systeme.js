// Widget Système — CPU / RAM
// Extrait de dashboard.yaml — ha-obsidian
// ⚠️  Vérifie les noms d'entités dans Outils de développement > États

const cpu = parseFloat(states['sensor.system_monitor_processor_use']?.state ?? 0) || 0;
const ram = parseFloat(states['sensor.system_monitor_memory_use_percent']?.state ?? 0) || 0;

// Couleur dynamique : vert → jaune → rouge selon le seuil
const cpuC = cpu>80?'#ff6b6b':cpu>50?'#f6d865':'#7ee0b5';
const ramC = ram>85?'#ff6b6b':ram>65?'#f6d865':'#7cc8ff';

const bar = (val,color,lbl) => `<div style="display:flex;align-items:center;gap:9px;margin-bottom:6px">
  <span style="font-size:11px;font-weight:900;color:${color};min-width:68px;text-shadow:0 0 8px ${color}40">${lbl}</span>
  <div style="flex:1;height:2px;border-radius:99px;background:rgba(255,255,255,0.06)">
    <div style="height:100%;width:${Math.min(val,100)}%;background:${color};border-radius:99px;box-shadow:0 0 5px ${color}88"></div>
  </div>
</div>`;

const div = `<div style="height:1px;background:linear-gradient(90deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03),transparent);margin:14px 0"></div>`;
return `<div style="color:white">
  ${div}
  <div style="font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.26);margin-bottom:9px">Système</div>
  ${bar(cpu,cpuC,'CPU ' + Math.round(cpu) + '%')}
  ${bar(ram,ramC,'RAM ' + Math.round(ram) + '%')}
</div>`;
