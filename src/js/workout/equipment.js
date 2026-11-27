/* ═══ workout/equipment ═══
   «Equipamiento» al final del Overview del día: el material que piden sus ejercicios, con sus iconos, y su página con la
   lista («Material necesario para esta sesión»). Qué material lleva cada ejercicio lo dice workout/equipmap; su nombre y su
   icono, data/equipment. Los iconos los deja el build en data/media (MEDIA.equip): archivos del paquete, que el service
   worker guarda para usarlos sin conexión, o, en el archivo único, incrustados. Son decorativos: el nombre de cada material
   va al lado (en la página) o en la etiqueta del botón (en el Overview).
   Define: dayEquipment, equipIcon, equipmentSummary, equipmentPage  · acciones/registros: 1
*/
import { A } from '../core/registry.js';
import { S } from '../core/state.js';
import { fullPage, pgHead } from '../core/ui.js';
import { listAnd, say } from '../core/i18n.js';
import { html } from '../core/html.js';
import { EQUIPMENT } from '../data/equipment.js';
import { MEDIA } from '../data/media.js';
import { dayGear } from './equipmap.js';
/* el material de un día, en el orden en que lo piden sus ejercicios */
const dayEquipment = d => dayGear(d.ex.map(e => e.n));
/* el icono de un material, sin texto propio */
const equipIcon = id => html`<img class="equip-ico" src="${MEDIA.equip[EQUIPMENT[id][1]]}" alt="" draggable="false">`;
/** Al final del Overview: «Equipamiento (N) ›» y los iconos de su material; abre la lista. Nada si el día no pide material
    que la app conozca (sin ejercicios, o solo los creados por el usuario). */
export const equipmentSummary = d => {
  const gear = dayEquipment(d);
  if (!gear.length)
    return '';
  const label = say `Equipamiento (${gear.length}): ${listAnd(gear.map(id => EQUIPMENT[id][0]))}`;
  return html`
    <div class="equip-sum">
      <button class="equip-open" data-a="openEquipment" aria-label="${label}">
        <span class="equip-head"><b>Equipamiento (${gear.length})</b><span class="equip-go" aria-hidden="true">›</span></span>
        <span class="equip-icons">${gear.map(equipIcon)}</span>
      </button>
    </div>`;
};
/* la página: cada material del día con su icono y su nombre */
const equipmentPage = () => {
  const gear = dayEquipment(S.plan[S.selectedDay]);
  return html`
    ${pgHead('Equipamiento')}
    <p class="muted equip-lead">Material necesario para esta sesión</p>
    <ul class="equip-list">${gear.map(id => html`<li class="card equip-card">${equipIcon(id)}<span>${EQUIPMENT[id][0]}</span></li>`)}</ul>`;
};
A.openEquipment = () => fullPage(equipmentPage());
