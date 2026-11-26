/* ═══ profile/settings ═══
   Ajustes: página propia (no un desplegable) con secciones y filas con icono (Cuenta, Apariencia, Entreno, Datos, App,
   Información y, aparte y en rojo, «Cerrar sesión»);
   cada fila abre su página, con «←» de vuelta a Ajustes. Mientras una está abierta, cada R() la vuelve a pintar con core/morph
   (settingsSync), así los botones que cambian un ajuste (tema, color, unidades…) se ven al momento.
   Define: settingsSub, settingsRow, ago, LANGUAGES, languageName, languageCard, SETTINGS_PAGES, settingsSection, accountRows, appearanceRows, workoutRows, dataRows, appRows, advancedRows, infoRows, settingsMain, settingsPage, settingsSync  · acciones/registros: 4
*/
import { say } from '../core/i18n.js';
import { $, APPV, LANG, langChoice, phoneLang } from '../core/util.js';
import { Store } from '../core/store.js';
import { errorLog, logError } from '../core/errors.js';
import { toast } from '../core/toast.js';
import { reloadApp } from '../core/persist.js';
import { A } from '../core/registry.js';
import { S } from '../core/state.js';
import { icon } from '../core/icons.js';
import { fullPage, pgHead, sheetDialog } from '../core/ui.js';
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
const settingsRow = (ic, label, val, a, o) => html`
  <button class="setting-row" data-a="${a}"${raw(o && o.v ? ' data-v="' + o.v + '"' : '')}>
    <span class="setting-icon${o && o.red ? ' red' : ''}">${icon(ic, 20)}</span>
    <span class="setting-label${o && o.red ? ' red' : ''}">${raw(label)}</span>
    ${val ? html`<span class="setting-value">${val}</span>` : ''}
    ${o && o.act ? '' : icon('chr', 18)}
  </button>`;
const ago = t => {
  const d = Math.floor((Date.now() - t) / 864e5);
  return d <= 0 ? 'Hoy' : d == 1 ? 'Ayer' : say `Hace ${d} días`;
};
/* Idiomas: el del móvil (sin elegir), español o inglés. Cada idioma va con su propio nombre, para que lo encuentre quien no
   entiende el otro */
const LANGUAGES = [['', 'Automático'], ['es', 'Español'], ['en', 'English']];
const languageName = () => LANGUAGES.find(x => x[0] == langChoice())[1];
const languageCard = () => html`
  <p class="muted m-0-2-12 fs-14">
    El idioma de StrataFit en este móvil. En automático es el del móvil: inglés si está en inglés y, si no, español.
  </p>
  <div class="card setting-group" role="radiogroup" aria-label="Idioma de la app">
    ${LANGUAGES.map(x => html`
      <button class="setting-row" data-a="setLanguage" data-v="${x[0]}" role="radio"
          aria-checked="${x[0] == langChoice() ? 'true' : 'false'}">
        <span class="setting-label">
          ${x[1]}
          ${x[0] ? '' : html` <small class="muted">· ${LANGUAGES[phoneLang() == 'en' ? 2 : 1][1]}</small>`}
        </span>
        ${x[0] == langChoice() ? raw(icon('chk', 20)) : ''}
      </button>`)}
  </div>`;
/* páginas de cada fila: [título, contenido] */
const SETTINGS_PAGES = {
  tema: () => ['Tema y estilo', html`<label>Tema</label>${themeSegment()}${glassCard()}${motionCard()}`],
  acento: () => ['Color de acento', accentSwatches()],
  inicio: () => ['Al abrir la app', startTabCard()],
  idioma: () => ['Idiomas', languageCard()],
  unidades: () => ['Unidades', unitsCard()],
  sonido: () => ['Sonido y avisos', html`
    <label class="setting-check"><input type="checkbox" ${S.sound === 0 ? '' : 'checked'} data-c="soundToggle"> Sonidos del descanso</label>
    <button data-a="soundTest" class="w-full m-8-0-6">Probar sonido</button>
    ${alertSettings()}
    ${badgeCard()}`],
  cuenta: () => ['Cuenta', accountPage()],
  clave: () => ['Cambiar contraseña', passwordPage()],
  nota: () => ['Nota de actualización', releaseNotePage()],
  icono: () => ['El icono nuevo', iconNoticeBody(0)],
  avanzado: () => ['Ajustes avanzados', rpeSettings()]
};
/* una sección de Ajustes: su título y sus filas */
const settingsSection = (title, rows) => html`<div class="section-label">${raw(title)}</div><div class="card setting-group">${rows}</div>`;
/* Cuenta: el usuario y la sincronización */
const accountRows = () => [settingsRow('user', 'Cuenta', acctName(), 'openSettingsPage', { v: 'cuenta' }), settingsRow('cloud', 'Sincronización', syncShort(), 'accountSyncNow', { act: 1 })];
/* Apariencia: tema y estilo, color de acento (con su muestra), la pestaña al abrir la app y el idioma */
const appearanceRows = () => {
  const theme = S.theme == 'dark' ? 'Oscuro' : S.theme == 'light' ? 'Claro' : 'Automático';
  const accent = accentNow();
  const swatch = html`
    <i class="setting-dot" data-style="background:linear-gradient(135deg,${raw(accent[1])},${raw(accent[2])})"></i>
    ${raw(accent[0])}`;
  return [settingsRow('pal', 'Tema y estilo', theme + ' · ' + (glassMode() > 0 ? 'Cristal' : 'Clásico'), 'openSettingsPage', { v: 'tema' }), settingsRow('drop', 'Color de acento', swatch, 'openSettingsPage', { v: 'acento' }), settingsRow('home', 'Al abrir la app', startTabName(), 'openSettingsPage', { v: 'inicio' }), settingsRow('globe', 'Idiomas', languageName(), 'openSettingsPage', { v: 'idioma' })];
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
/* Información: las dos páginas legales (profile/legal), que son las mismas que se abren sin sesión */
const infoRows = () => [settingsRow('shd', 'Privacidad', '', 'openLegal', { v: 'privacy' }), settingsRow('doc', 'Aviso legal', '', 'openLegal', { v: 'terms' })];
/* la página principal de Ajustes, por secciones, y al final «Cerrar sesión» */
function settingsMain() {
  return html`
    <div id="ajs">
      ${pgHead('Ajustes')}
      ${settingsSection('Cuenta', accountRows())}
      ${settingsSection('Apariencia', appearanceRows())}
      ${settingsSection('Entreno', workoutRows())}
      ${settingsSection('Datos', dataRows())}
      ${settingsSection('App', appRows())}
      ${offlineNote()}
      ${settingsSection('Ajustes avanzados', advancedRows())}
      ${settingsSection('Información', infoRows())}
      <div class="card setting-group setting-signout">${settingsRow('out', 'Cerrar sesión', '', 'signOut', { red: 1, act: 1 })}</div>
      <div class="h-40"></div>
    </div>`;
}
const settingsPage = k => {
  if (!k || !Object.prototype.hasOwnProperty.call(SETTINGS_PAGES, k))
    return settingsMain();
  const [t, body] = SETTINGS_PAGES[k]();
  return html`<div id="ajs">${pgHead(t, k == 'clave' ? 'settingsBackToAccount' : 'openSettings')}${body}<div class="h-40"></div></div>`;
};
/** Tras un R(): si una página de Ajustes sigue abierta, la pinta de nuevo cambiando solo lo distinto (core/morph). */
export const settingsSync = () => {
  if (settingsSub == null)
    return;
  const p = $('#sh .sheet');
  if (!p || !$('#ajs')) {
    settingsSub = null;
    return;
  }
  morph(p, settingsPage(settingsSub));
  /* el título recién pintado vuelve a dar nombre a la ventana (su id lo pone core/ui, no la plantilla) */
  sheetDialog(p, 0);
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
/* el idioma se decide al cargar la app (core/util, LANG): si el elegido es otro que el que se está viendo, se recarga */
A.setLanguage = (i, b) => {
  const v = b.dataset.v == 'es' || b.dataset.v == 'en' ? b.dataset.v : '';
  try {
    if (v)
      Store.set(Store.K.lang, v, 1);
    else
      Store.del(Store.K.lang, 1);
  }
  catch (e) {
    logError('guardar el idioma', e);
    toast('No se ha podido guardar el idioma.');
    return;
  }
  if ((v || phoneLang()) != LANG)
    reloadApp();
  else
    fullPage(settingsPage(settingsSub));
};
A.openSettingsPage = (i, b) => {
  settingsSub = b.dataset.v;
  fullPage(settingsPage(settingsSub));
};
