/* ═══ profile/settings ═══
   Ajustes: página propia (no un desplegable) con secciones y filas con icono (Cuenta, Apariencia, Entreno, Datos, App,
   Información y, aparte y en rojo, «Cerrar sesión»);
   cada fila abre su página, con «←» de vuelta a Ajustes. Mientras una está abierta, cada R() la vuelve a pintar con core/morph
   (settingsSync), así los botones que cambian un ajuste (tema, color, unidades…) se ven al momento.
   Define: settingsSub, settingsRow, ago, PRIVACY_TEXT, LEGAL_TEXT, SETTINGS_PAGES, settingsSection, accountRows, appearanceRows, workoutRows, dataRows, appRows, advancedRows, infoRows, settingsMain, settingsPage, settingsSync  · acciones/registros: 3
*/
import { $, APPV } from '../core/util.js';
import { errorLog } from '../core/errors.js';
import { A } from '../core/registry.js';
import { S } from '../core/state.js';
import { icon } from '../core/icons.js';
import { fullPage, pgHead } from '../core/ui.js';
import { morph } from '../core/morph.js';
import { accentNow, accentSwatches, glassCard, glassMode, motionCard, themeSegment } from './appearance.js';
import { startTabCard, startTabName } from '../core/tabbar.js';
import { unitsCard, usesLb } from './units.js';
import { alertSettings } from './feedback.js';
import { badgeCard } from '../system/phone.js';
import { offlineNote, releaseNotePage } from '../system/updates.js';
import { iconNoticeApplies, iconNoticeBody } from '../system/iconnotice.js';
import { acctName } from '../cloud/session.js';
import { accountPage, passwordPage, syncShort } from '../account/account.js';
import { rpeOn, rpeSettings } from '../workout/rpe.js';
import { html, raw } from '../core/html.js';
/* página abierta: '' la principal, una clave de SETTINGS_PAGES o null si Ajustes está cerrado */
let settingsSub = null;
const settingsRow = (ic, label, val, a, o) => html`<button class="sr" data-a="${a}"${raw(o && o.v ? ' data-v="' + o.v + '"' : '')}><span class="sri${o && o.red ? ' red' : ''}">${icon(ic, 20)}</span><span class="srl${o && o.red ? ' red' : ''}">${raw(label)}</span>${val ? html`<span class="srv">${val}</span>` : ''}${o && o.act ? '' : icon('chr', 18)}</button>`;
const ago = t => {
  const d = Math.floor((Date.now() - t) / 864e5);
  return d <= 0 ? 'Hoy' : d == 1 ? 'Ayer' : 'Hace ' + d + ' días';
};
export const PRIVACY_TEXT = ['Tu cuenta es un nombre de usuario y una contraseña. No se guarda ningún dato personal: ni nombre, ni correo, ni teléfono.', 'Tus entrenos, comidas, medidas y ajustes se guardan en este móvil y en tu cuenta en la nube, en Firebase (Google), para no perderlos y usarlos en varios móviles. Los datos de la app están en sus servidores de Madrid; el usuario y la contraseña (cifrada) los guarda Firebase Authentication. Solo tu cuenta puede leer tus datos.', 'El administrador de la app ve de cada cuenta el usuario, el sexo y las preferencias de la app (aspecto, unidades, sonido y si ya viste el recorrido); nunca tus entrenos, tus comidas, tus medidas ni tu foto.', 'Tu cuenta guarda también el sistema del último móvil con el que abriste la app (iPhone, Android u otro). Es solo a efectos estadísticos: el administrador ve cuántas cuentas usan cada uno.', 'La foto de perfil solo se sube si das tu consentimiento, y solo la ves tú. Puedes quitarla cuando quieras desde Perfil.', 'Al buscar o escanear un alimento, solo se envía a Open Food Facts el texto que escribes o el número del código de barras. La imagen de la cámara no sale del móvil.', 'El informe de Diagnóstico y las copias de seguridad en archivo solo salen del móvil si los envías tú.', 'Sin publicidad, sin cookies de seguimiento y sin analítica. La app se descarga desde GitHub Pages, que, como cualquier servidor, registra datos técnicos de la conexión (por ejemplo, la dirección IP).', '«Borrar todos los datos» los elimina de este móvil y de tu cuenta. «Cerrar sesión» los borra solo de este móvil.'];
const LEGAL_TEXT = ['© 2026 V. M. Rodriguez Mazuelas. Todos los derechos reservados.', 'Uso personal y gratuito durante la fase de pruebas, tal como se ofrece en su dirección oficial. Durante la fase de pruebas existe el riesgo de pérdida total o parcial de datos. No se permite copiar, modificar, redistribuir ni explotar comercialmente el código, los textos, los diseños ni las imágenes sin autorización.', 'Los consejos de entrenamiento y nutrición son orientativos y no sustituyen el consejo de un profesional sanitario. Si tienes algún problema de salud, consulta con tu médico antes de empezar un programa de ejercicio o una dieta.', 'Los datos de los alimentos que se buscan en internet proceden de Open Food Facts (licencia ODbL).'];
/* páginas de cada fila: [título, contenido] */
const SETTINGS_PAGES = {
  tema: () => ['Tema y estilo', html`<label>Tema</label>${themeSegment()}${glassCard()}${motionCard()}`],
  acento: () => ['Color de acento', accentSwatches()],
  inicio: () => ['Al abrir la app', startTabCard()],
  unidades: () => ['Unidades', unitsCard()],
  sonido: () => ['Sonido y avisos', html`<label class="srk"><input type="checkbox" ${S.sound === 0 ? '' : 'checked'} data-c="soundToggle"> Sonidos del descanso</label><button data-a="soundTest" style="width:100%;margin:8px 0 6px">Probar sonido</button>${alertSettings()}${badgeCard()}`],
  cuenta: () => ['Cuenta', accountPage()],
  clave: () => ['Cambiar contraseña', passwordPage()],
  privacidad: () => ['Privacidad', html`<div class="srt">${PRIVACY_TEXT.map(p => html`<p>${p}</p>`)}</div>`],
  legal: () => ['Aviso legal', html`<div class="srt">${LEGAL_TEXT.map(p => html`<p>${p}</p>`)}</div>`],
  nota: () => ['Nota de actualización', releaseNotePage()],
  icono: () => ['El icono nuevo', iconNoticeBody(0)],
  avanzado: () => ['Ajustes avanzados', rpeSettings()]
};
/* una sección de Ajustes: su título y sus filas */
const settingsSection = (title, rows) => html`<div class="ph">${raw(title)}</div><div class="cd srg">${rows}</div>`;
/* Cuenta: el usuario y la sincronización */
const accountRows = () => [settingsRow('user', 'Cuenta', acctName(), 'openSettingsPage', { v: 'cuenta' }), settingsRow('cloud', 'Sincronización', syncShort(), 'accountSyncNow', { act: 1 })];
/* Apariencia: tema y estilo, color de acento (con su muestra) y la pestaña al abrir la app */
const appearanceRows = () => {
  const theme = S.theme == 'dark' ? 'Oscuro' : S.theme == 'light' ? 'Claro' : 'Automático';
  const accent = accentNow();
  const swatch = html`<i class="srd" style="background:linear-gradient(135deg,${raw(accent[1])},${raw(accent[2])})"></i>${raw(accent[0])}`;
  return [settingsRow('pal', 'Tema y estilo', theme + ' · ' + (glassMode() > 0 ? 'Cristal' : 'Clásico'), 'openSettingsPage', { v: 'tema' }), settingsRow('drop', 'Color de acento', swatch, 'openSettingsPage', { v: 'acento' }), settingsRow('home', 'Al abrir la app', startTabName(), 'openSettingsPage', { v: 'inicio' })];
};
/* Entreno: unidades y sonido */
const workoutRows = () => [settingsRow('kgw', 'Unidades de carga', usesLb() ? 'Libras (lb)' : 'Kilos (kg)', 'openSettingsPage', { v: 'unidades' }), settingsRow('snd', 'Sonido y avisos', S.sound === 0 ? 'Sin sonido' : 'Con sonido', 'openSettingsPage', { v: 'sonido' })];
/* Datos: la última copia (en la nube o en archivo) y borrarlo todo */
const dataRows = () => {
  const lastCopy = S.cloudBackup && +S.cloudBackup.at > 0 ? ago(+S.cloudBackup.at) : +S.lastBackupDate > 0 ? ago(+S.lastBackupDate) : 'Nunca';
  return [settingsRow('bkp', 'Copia de seguridad', lastCopy, 'openBackup'), settingsRow('del', 'Borrar todos los datos', '', 'resetAllAsk', { red: 1, act: 1 })];
};
/* App: actualizaciones, nota, el icono nuevo (en un iPhone con el de antes: system/iconnotice), recorrido, diagnóstico y fallos */
const appRows = () => {
  const errors = errorLog().length;
  return [settingsRow('upd', 'Actualizaciones', 'V' + APPV, 'updateCheck', { act: 1 }), settingsRow('news', 'Ver nota de actualización', '', 'openSettingsPage', { v: 'nota' }), iconNoticeApplies() ? settingsRow('home', 'El icono nuevo', 'Cómo cambiarlo', 'openSettingsPage', { v: 'icono' }) : '', settingsRow('tour', 'Ver el recorrido', '', 'tourReplay', { act: 1 }), settingsRow('pulse', 'Diagnóstico', errors ? errors + (errors == 1 ? ' error' : ' errores') : '', 'openDiagnostics'), settingsRow('bug', 'Informar de un fallo', '', 'openReport')];
};
const advancedRows = () => [settingsRow('gear', 'Esfuerzo (RPE)', rpeOn() ? 'Activado' : 'Desactivado', 'openSettingsPage', { v: 'avanzado' })];
const infoRows = () => [settingsRow('shd', 'Privacidad', '', 'openSettingsPage', { v: 'privacidad' }), settingsRow('doc', 'Aviso legal', '', 'openSettingsPage', { v: 'legal' })];
/* la página principal de Ajustes, por secciones, y al final «Cerrar sesión» */
function settingsMain() {
  return html`<div id="ajs">${pgHead('Ajustes')}${settingsSection('Cuenta', accountRows())}${settingsSection('Apariencia', appearanceRows())}${settingsSection('Entreno', workoutRows())}${settingsSection('Datos', dataRows())}${settingsSection('App', appRows())}${offlineNote()}${settingsSection('Ajustes avanzados', advancedRows())}${settingsSection('Información', infoRows())}<div class="cd srg sro">${settingsRow('out', 'Cerrar sesión', '', 'signOut', { red: 1, act: 1 })}</div><div style="height:40px"></div></div>`;
}
const settingsPage = k => {
  if (!k || !Object.prototype.hasOwnProperty.call(SETTINGS_PAGES, k))
    return settingsMain();
  const [t, body] = SETTINGS_PAGES[k]();
  return html`<div id="ajs">${pgHead(t, k == 'clave' ? 'settingsBackToAccount' : 'openSettings')}${body}<div style="height:40px"></div></div>`;
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
A.openSettings = () => {
  settingsSub = '';
  fullPage(settingsPage(''));
};
/* «←» de Cambiar contraseña: vuelve a Cuenta */
A.settingsBackToAccount = () => {
  settingsSub = 'cuenta';
  fullPage(settingsPage(settingsSub));
};
A.openSettingsPage = (i, b) => {
  settingsSub = b.dataset.v;
  fullPage(settingsPage(settingsSub));
};
