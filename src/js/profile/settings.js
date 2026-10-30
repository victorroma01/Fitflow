/* ═══ profile/settings ═══
   Ajustes: página propia (no un desplegable) con secciones y filas con icono (Apariencia, Entreno, Datos, App, Información);
   cada fila abre su página, con «←» de vuelta a Ajustes. Mientras una está abierta, cada R() la vuelve a pintar con core/morph
   (settingsSync), así los botones que cambian un ajuste (tema, color, unidades…) se ven al momento.
   Define: SETTINGS_PAGES, settingsSub, settingsRow, settingsMain, settingsPage, settingsSync, PRIVACY_TEXT, LEGAL_TEXT  · acciones/registros: 2
*/
import { $, APPV } from '../core/util.js';
import { errorLog } from '../core/errors.js';
import { A } from '../core/registry.js';
import { S } from '../core/state.js';
import { icon } from '../core/icons.js';
import { fullPage, pgHead } from '../core/ui.js';
import { morph } from '../core/morph.js';
import { ACCENTS, accentSwatches, glassCard, glassMode, themeSegment } from './appearance.js';
import { unitsCard, usesLb } from './units.js';
import { alertSettings } from './feedback.js';
import { offlineNote } from '../system/updates.js';
import { html, raw } from '../core/html.js';
/* página abierta: '' la principal, una clave de SETTINGS_PAGES o null si Ajustes está cerrado */
let settingsSub = null;
const settingsRow = (ic, label, val, a, o) => html`<button class="sr" data-a="${a}"${raw(o && o.v ? ' data-v="' + o.v + '"' : '')}><span class="sri${o && o.red ? ' red' : ''}">${icon(ic, 20)}</span><span class="srl${o && o.red ? ' red' : ''}">${raw(label)}</span>${val ? html`<span class="srv">${val}</span>` : ''}${o && o.act ? '' : icon('chr', 18)}</button>`;
const ago = t => {
  const d = Math.floor((Date.now() - t) / 864e5);
  return d <= 0 ? 'Hoy' : d == 1 ? 'Ayer' : 'Hace ' + d + ' días';
};
const PRIVACY_TEXT = ['Tus datos (perfil, entrenos, comidas, medidas y fotos) se guardan solo en este móvil. No hay cuentas ni servidores: nadie más los ve.', 'Las copias de seguridad son archivos que guardas tú, donde tú decidas.', 'Al buscar o escanear un alimento, solo se envía a Open Food Facts el texto que escribes o el número del código de barras. La imagen de la cámara no sale del móvil.', 'El informe de Diagnóstico solo sale del móvil si lo copias y lo envías tú.', 'Sin publicidad, sin cookies de seguimiento y sin analítica. La app se descarga desde GitHub Pages, que, como cualquier servidor, registra datos técnicos de la conexión (por ejemplo, la dirección IP).', '«Borrar todos los datos» elimina todo lo guardado en este móvil.'];
const LEGAL_TEXT = ['© 2026 V. M. Rodriguez Mazuelas. Todos los derechos reservados.', 'Uso personal y gratuito de la app tal como se ofrece en su dirección oficial. No se permite copiar, modificar, redistribuir ni explotar comercialmente el código, los textos, los diseños ni las imágenes sin autorización.', 'Los consejos de entrenamiento y nutrición son orientativos y no sustituyen el consejo de un profesional sanitario. Si tienes algún problema de salud, consulta con tu médico antes de empezar un programa de ejercicio o una dieta.', 'Los datos de los alimentos que se buscan en internet proceden de Open Food Facts (licencia ODbL).'];
/* páginas de cada fila: [título, contenido] */
const SETTINGS_PAGES = {
  tema: () => ['Tema y estilo', html`<label>Tema</label>${themeSegment()}${glassCard()}`],
  acento: () => ['Color de acento', accentSwatches()],
  unidades: () => ['Unidades', unitsCard()],
  sonido: () => ['Sonido y avisos', html`<label class="srk"><input type="checkbox" ${S.notif ? 'checked' : ''} data-c="nt"> Notificaciones activadas</label><label class="srk"><input type="checkbox" ${S.snd === 0 ? '' : 'checked'} data-c="snd"> Sonidos del descanso</label><button data-a="zsnd" style="width:100%;margin:8px 0 6px">Probar sonido</button>${alertSettings()}`],
  privacidad: () => ['Privacidad', html`<div class="srt">${PRIVACY_TEXT.map(p => html`<p>${p}</p>`)}</div>`],
  legal: () => ['Aviso legal', html`<div class="srt">${LEGAL_TEXT.map(p => html`<p>${p}</p>`)}</div>`]
};
function settingsMain() {
  const th = S.theme == 'dark' ? 'Oscuro' : S.theme == 'light' ? 'Claro' : 'Automático';
  const ac = ACCENTS[S.acc >= 0 && S.acc < ACCENTS.length ? S.acc : 0];
  const ne = errorLog().length;
  const sec = (t, rows) => html`<div class="ph">${raw(t)}</div><div class="cd srg">${rows}</div>`;
  return html`<div id="ajs">${pgHead('Ajustes')}${sec('Apariencia', [settingsRow('pal', 'Tema y estilo', th + ' · ' + (glassMode() > 0 ? 'Cristal' : 'Clásico'), 'ajp', { v: 'tema' }), settingsRow('drop', 'Color de acento', html`<i class="srd" style="background:linear-gradient(135deg,${raw(ac[1])},${raw(ac[2])})"></i>${raw(ac[0])}`, 'ajp', { v: 'acento' })])}${sec('Entreno', [settingsRow('kgw', 'Unidades de carga', usesLb() ? 'Libras (lb)' : 'Kilos (kg)', 'ajp', { v: 'unidades' }), settingsRow('snd', 'Sonido y avisos', S.snd === 0 ? 'Sin sonido' : 'Con sonido', 'ajp', { v: 'sonido' })])}${sec('Datos', [settingsRow('bkp', 'Copia de seguridad', +S.bkd > 0 ? ago(+S.bkd) : 'Nunca', 'zbk'), settingsRow('del', 'Borrar todos los datos', '', 'rst', { red: 1, act: 1 })])}${sec('App', [settingsRow('upd', 'Actualizaciones', 'V' + APPV, 'updChk', { act: 1 }), settingsRow('pulse', 'Diagnóstico', ne ? ne + (ne == 1 ? ' error' : ' errores') : '', 'diag'), settingsRow('bug', 'Informar de un fallo', '', 'rpo')])}${offlineNote()}${sec('Información', [settingsRow('shd', 'Privacidad', '', 'ajp', { v: 'privacidad' }), settingsRow('doc', 'Aviso legal', '', 'ajp', { v: 'legal' })])}<div style="height:40px"></div></div>`;
}
const settingsPage = k => {
  if (!k || !Object.prototype.hasOwnProperty.call(SETTINGS_PAGES, k))
    return settingsMain();
  const [t, body] = SETTINGS_PAGES[k]();
  return html`<div id="ajs">${pgHead(t, 'zaj')}${body}<div style="height:40px"></div></div>`;
};
/** Tras un R(): si una página de Ajustes sigue abierta, la pinta de nuevo cambiando solo lo distinto (core/morph). */
export const settingsSync = () => {
  if (settingsSub == null)
    return;
  const p = $('#sh .sp');
  if (!p || !$('#ajs')) {
    settingsSub = null;
    return;
  }
  morph(p, settingsPage(settingsSub));
};
/* — manejadores de esta función (registros A / C / U) — */
A.zaj = () => {
  settingsSub = '';
  fullPage(settingsPage(''));
};
A.ajp = (i, b) => {
  settingsSub = b.dataset.v;
  fullPage(settingsPage(settingsSub));
};
