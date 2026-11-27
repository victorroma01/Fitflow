/* ═══ library/catalog ═══
   Los grupos de la librería de ejercicios en tarjetas, con el diseño que aprobó el propietario (StrataFit_Catalogo): la
   ilustración del grupo (el modelo anatómico con el músculo principal en rojo y el secundario en naranja; en CrossFit, Hyrox,
   Funcional y Cardio, su material) y, en mayúsculas, su nombre y su número de ejercicios; debajo, la leyenda de los colores,
   en rojo y naranja, los de los músculos de las ilustraciones. Sin icono ni raya junto al nombre: los quitó el propietario
   (V1.0.4.1). Una sola tarjeta para todos, desde los datos (data/catalog); cada una abre su grupo como antes (libraryGroup,
   library/browse). «Mis ejercicios», los creados por el usuario, va al final con la misma tarjeta, sin ilustración. El número
   es el de la librería, y el nombre, el de la app en su idioma (las mayúsculas las pone el CSS). La ilustración es
   decorativa: la etiqueta del botón dice el grupo y su número.
   Define: catText, catCard, catOwnCard, catLegend, catalogGrid
*/
import { groupLabel, groupOf, GROUPS } from '../data/library.js';
import { CATALOG } from '../data/catalog.js';
import { MEDIA } from '../data/media.js';
import { say } from '../core/i18n.js';
import { plural } from '../system/backup.js';
import { html, raw } from '../core/html.js';
/* el texto de una tarjeta: uno encima de otro, el nombre del grupo y su número */
const catText = (g, count) => html`
  <span class="cat-text"><b class="cat-name">${groupLabel(g)}</b><span class="cat-count">${count}</span></span>`;
/* la tarjeta de un grupo: `k`, su lugar (las de más abajo cargan su ilustración al acercarse a la pantalla) */
const catCard = (g, n, k) => {
  const [id, w, h, wide] = CATALOG[g];
  const count = plural(n, 'ejercicio', 'ejercicios');
  return html`
    <button class="cat-card${wide ? ' cat-wide' : ''}" data-a="libraryGroup" data-v="${g}" aria-label="${say `${groupLabel(g)}: ${count}`}">
      <span class="cat-art">
        <img src="${MEDIA.cat[id]}" alt="" width="${w}" height="${h}" decoding="async"${raw(k > 3 ? ' loading="lazy"' : '')}
            draggable="false">
      </span>
      ${catText(g, count)}
    </button>`;
};
/* «Mis ejercicios»: la misma tarjeta, sin ilustración */
const catOwnCard = n => {
  const count = plural(n, 'ejercicio', 'ejercicios');
  return html`
    <button class="cat-card cat-own" data-a="libraryGroup" data-v="Propio" aria-label="${say `${groupLabel('Propio')}: ${count}`}">
      ${catText('Propio', count)}
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
