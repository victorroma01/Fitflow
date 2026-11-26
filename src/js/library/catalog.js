/* ═══ library/catalog ═══
   Los grupos de la librería de ejercicios en tarjetas, con el diseño que aprobó el propietario (StrataFit_Catalogo): la
   ilustración del grupo (el modelo anatómico con el músculo principal en rojo y el secundario en naranja; en CrossFit, Hyrox,
   Funcional y Cardio, su material), su icono rojo, la raya roja inclinada y, en mayúsculas, su nombre y su número de
   ejercicios; debajo, la leyenda de los colores. Una sola tarjeta para todos, desde los datos (data/catalog); cada una abre
   su grupo como antes (libraryGroup, library/browse). «Mis ejercicios», los creados por el usuario, va al final con la misma
   tarjeta, sin ilustración. El número es el de la librería, y el nombre, el de la app en su idioma (las mayúsculas las pone
   el CSS). Las imágenes son decorativas: la etiqueta del botón dice el grupo y su número.
   Define: catText, catCard, catOwnCard, catLegend, catalogGrid
*/
import { groupLabel, groupOf, GROUPS } from '../data/library.js';
import { CATALOG } from '../data/catalog.js';
import { MEDIA } from '../data/media.js';
import { icon } from '../core/icons.js';
import { say } from '../core/i18n.js';
import { plural } from '../system/backup.js';
import { html, raw } from '../core/html.js';
/* el texto de una tarjeta: el icono, la raya y, uno encima de otro, el nombre del grupo y su número */
const catText = (ico, g, count) => html`
  <span class="cat-text">
    ${ico}
    <span class="cat-sep" aria-hidden="true"></span>
    <span class="cat-label"><b class="cat-name">${groupLabel(g)}</b><span class="cat-count">${count}</span></span>
  </span>`;
/* la tarjeta de un grupo: `k`, su lugar (las de más abajo cargan su ilustración al acercarse a la pantalla) */
const catCard = (g, n, k) => {
  const [id, w, h, iw, wide] = CATALOG[g];
  const count = plural(n, 'ejercicio', 'ejercicios');
  return html`
    <button class="cat-card${wide ? ' cat-wide' : ''}" data-a="libraryGroup" data-v="${g}" aria-label="${say `${groupLabel(g)}: ${count}`}">
      <span class="cat-art">
        <img src="${MEDIA.cat[id]}" alt="" width="${w}" height="${h}" decoding="async"${raw(k > 3 ? ' loading="lazy"' : '')}
            draggable="false">
      </span>
      ${catText(html`<img class="cat-ico" src="${MEDIA.catIcon[id]}" alt="" width="${iw}" height="54" draggable="false">`, g, count)}
    </button>`;
};
/* «Mis ejercicios»: la misma tarjeta, sin ilustración y con el «+» de la app como icono */
const catOwnCard = n => {
  const count = plural(n, 'ejercicio', 'ejercicios');
  return html`
    <button class="cat-card cat-own" data-a="libraryGroup" data-v="Propio" aria-label="${say `${groupLabel('Propio')}: ${count}`}">
      ${catText(html`<span class="cat-ico cat-ico-own">${icon('Propio', 22)}</span>`, 'Propio', count)}
    </button>`;
};
/* la leyenda de los colores del modelo: no filtra nada */
const catLegend = () => html`
  <div class="cat-legend">
    <span class="cat-key"><span class="cat-dot cat-dot-p"></span>Músculo principal (mayor trabajo)</span>
    <span class="cat-legend-sep" aria-hidden="true"></span>
    <span class="cat-key"><span class="cat-dot cat-dot-s"></span>Músculo secundario (asistencia)</span>
  </div>`;
/** Los grupos que tienen ejercicios en `list` (los de la librería y los del usuario: [{ e }]), en tarjetas y con su leyenda. */
export const catalogGrid = list => {
  const count = g => list.filter(o => groupOf(o.e) == g).length;
  const cards = GROUPS.filter(g => CATALOG[g]).map(g => [g, count(g)]).filter(x => x[1]).map((x, k) => catCard(x[0], x[1], k));
  const own = count('Propio');
  return html`<div class="cat-grid">${cards}${own ? catOwnCard(own) : ''}</div>${catLegend()}`;
};
