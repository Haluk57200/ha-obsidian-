// Widget Agenda
// Extrait de dashboard.yaml — ha-obsidian
// ⚠️  Remplace calendar.mon_agenda par ton entité calendrier

const cal = states['calendar.mon_agenda'];
const evtMsg = cal?.attributes?.message;
const evtStart = cal?.attributes?.start_time;
let evtDate, evtTime;
if (evtMsg && evtStart) {
  const ed = new Date(evtStart);
  evtDate = ed.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'short'});
  evtTime = ed.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}
const div = `<div style="height:1px;background:linear-gradient(90deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03),transparent);margin:14px 0"></div>`;
return `<div style="color:white">
  ${div}
  <div style="font-size:9px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.26);margin-bottom:7px">Agenda</div>
  <div style="font-size:13px;font-weight:800;color:rgba(255,255,255,0.86);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${evtMsg || 'Aucun évènement'}</div>
  ${evtMsg ? `<div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.30);margin-top:3px">${evtDate} ${evtTime}</div>` : ''}
</div>`;
