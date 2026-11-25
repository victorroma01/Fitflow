/* ═══ profile/legal ═══
   Las dos páginas legales: «Privacidad» (la Política de privacidad, con su resumen en seis tarjetas y, con la sesión abierta,
   «Tus datos»: copia, retirar el consentimiento, borrar los datos, eliminar la cuenta y contacto) y «Aviso legal» (Aviso legal
   y condiciones de uso). Cada una, con su fecha y su versión (cloud/consent, LEGAL), un índice que lleva a cada apartado y el
   texto entero a la vista, con sus títulos.
   Se abren sin sesión: desde el inicio de sesión y sus casillas (account/login), desde Ajustes → Información y con la dirección
   de la app acabada en ?a=privacidad o ?a=aviso-legal (system/phone).
   Los textos son los de data/legal (en inglés, i18n/en-legal), que se descargan la primera vez que se abren (core/lazy) y se
   apuntan aquí (setLegal). Van escritos en un Markdown mínimo, que lee y pasa a HTML profile/legaltext: de él solo salen
   párrafos, listas, negritas y enlaces, a otra pantalla de la app o a una dirección https, que se abre aparte.
   Define: legal, setLegal, withLegal, blocks, legalDate, CARD_ICONS, cardsBlock, markDay, dataBlock, legalBack, legalPage  · acciones/registros: 3
*/
import { say } from '../core/i18n.js';
import { $, LANG, LOCALE, X } from '../core/util.js';
import { logError } from '../core/errors.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { icon } from '../core/icons.js';
import { loadLegal } from '../core/lazy.js';
import { fullPage, linkRow, pgHead } from '../core/ui.js';
import { account } from '../cloud/session.js';
import { consentOf, consentPending, LEGAL } from '../cloud/consent.js';
import { legalBlock, parseLegal } from './legaltext.js';
import { html, raw } from '../core/html.js';
/** Los textos cargados: { terms, privacy: { title, motto, intro: bloques, sections: [{ t, b: bloques }] }, cards: [[título,
    texto]…] }; null hasta que llegan. Un bloque es un párrafo (un texto) o una lista (varios).
    @type {any} */
let legal = null;
/** Lo llaman data/legal o i18n/en-legal al cargarse, con los textos tal como están escritos. */
export const setLegal = src => {
  legal = { terms: parseLegal(src.terms), privacy: parseLegal(src.privacy), cards: String(src.cards).trim().split('\n').map(l => l.split('|')) };
};
/* ejecuta `f` con los textos cargados (la primera vez los descarga; si no llegan, avisa). Promesa: se cumple al terminar */
const withLegal = f => (legal ? Promise.resolve() : loadLegal()).then(f).catch(e => {
  logError('cargar los textos legales', e);
  toast('No se ha podido abrir. Comprueba la conexión e inténtalo de nuevo.');
});
/* los bloques de un texto (párrafos y listas), ya en HTML */
const blocks = b => b.map(x => legalBlock(x, X)).join('');
/* la fecha de vigencia de un texto (AAAA-MM-DD), escrita entera */
const legalDate = d => new Date(d + 'T12:00:00').toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
/* los iconos de las seis tarjetas del resumen de Privacidad, en su orden */
const CARD_ICONS = ['usrok', 'lock', 'cloud', 'adm', 'camera', 'ctl'];
/* Privacidad: el resumen, antes de la política */
const cardsBlock = () => html`
  <h2 class="legal-h">Tu privacidad es una prioridad</h2>
  <p class="muted legal-lead">Así protegemos tu información en StrataFit.</p>
  <div class="legal-cards">
    ${legal.cards.map((c, i) => html`
      <div class="card legal-card">
        <span class="setting-icon">${icon(CARD_ICONS[i] || 'shd', 22)}</span>
        <div><h3>${raw(X(c[0]))}</h3><p class="muted">${raw(X(c[1]))}</p></div>
      </div>`)}
  </div>
  <button class="w-full" data-a="legalJump" data-i="-1">Leer la política completa</button>`;
/* cuándo se aceptó o se retiró algo, con el día escrito entero */
const markDay = m => new Date(m.at).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
/* Privacidad, con la sesión abierta y la app en uso: lo que la cuenta tiene aceptado (con su fecha y la versión del texto) y lo
   que se puede hacer con los datos, sin salir de aquí */
const dataBlock = () => {
  if (!account || account.mc || consentPending())
    return '';
  const c = consentOf(account.cs) || {};
  return html`
    <h2 class="legal-h">Tus datos</h2>
    <div class="muted legal-status">
      ${c.t ? html`<div>· ${say `Condiciones de uso aceptadas el ${markDay(c.t)} (versión ${c.t.v})`}</div>` : ''}
      ${c.h ? html`<div>· ${say `Consentimiento para tratar tus datos de salud, dado el ${markDay(c.h)} (versión ${c.h.v})`}</div>` : ''}
    </div>
    ${linkRow('bkp', 'Exportar una copia', 'Tus datos en un archivo, para guardarlos o llevártelos', 'legalBackup')}
    ${linkRow('shd', 'Contactar sobre privacidad', 'Dudas o solicitudes sobre tus datos; te contestamos en la app', 'openPrivacyContact')}
    ${linkRow('ctl', 'Retirar el consentimiento', 'Deja de tratar tus datos de salud y borra tus registros', 'consentWithdrawAsk')}
    ${linkRow('del', 'Borrar todos los datos', 'De este dispositivo y de tu cuenta; el usuario se mantiene', 'resetAllAsk')}
    ${linkRow('user', 'Eliminar cuenta', 'Borra la cuenta y todo lo que hay en ella. No se puede deshacer', 'openDeleteAccount')}`;
};
/* adónde vuelve «←»: a Ajustes si se abrió desde allí; si no, se cierra */
let legalBack = '';
/* una de las dos páginas: 'privacy' o 'terms' */
const legalPage = kind => {
  const d = legal[kind];
  const meta = LEGAL[kind];
  return html`
    <div id="lgl" class="legal-page" lang="${LANG}">
      ${pgHead(X(d.title), legalBack)}
      ${d.motto ? html`<p class="legal-motto">${raw(X(d.motto))}</p>` : ''}
      <p class="muted legal-meta">${say `Última actualización: ${legalDate(meta.date)} · Versión ${meta.v}`}</p>
      ${kind == 'privacy' ? html`${cardsBlock()}${dataBlock()}` : ''}
      <div id="lgd" class="setting-text legal-text" tabindex="-1">${raw(blocks(d.intro))}</div>
      <div class="card legal-index" role="navigation" aria-label="Índice">
        <h2 class="legal-h">Índice</h2>
        <ol>
          ${d.sections.map((s, i) => html`<li><button class="legal-link" data-a="legalJump" data-i="${i}">${raw(X(s.t))}</button></li>`)}
        </ol>
      </div>
      <div class="setting-text legal-text">
        ${d.sections.map((s, i) => html`<section id="lgs${i}"><h2 tabindex="-1">${raw(X(s.t))}</h2>${raw(blocks(s.b))}</section>`)}
      </div>
      <button class="w-full" data-a="legalJump" data-i="-2">Volver arriba</button>
      <div class="h-40"></div>
    </div>`;
};
/* — manejadores de esta función (registros A / C / U) — */
/** Abre «Privacidad» (data-v="privacy") o «Aviso legal» (data-v="terms"), con sesión o sin ella. */
A.openLegal = (i, b) => {
  const kind = b && b.dataset && b.dataset.v == 'terms' ? 'terms' : 'privacy';
  /* «←» vuelve a Ajustes si se abrió desde allí; al pasar de un texto al otro, o al volver de «Eliminar cuenta», adonde ya
     volvía */
  if ($('#ajs'))
    legalBack = 'openSettings';
  else if (!$('#lgl') && !$('#dlc'))
    legalBack = '';
  return withLegal(() => fullPage(legalPage(kind)));
};
/* a un apartado (su título coge el foco, para seguir leyendo desde él), al principio del texto (-1) o arriba del todo (-2) */
A.legalJump = i => {
  const e = i == -2 ? $('#sh .sheet') : i == -1 ? $('#lgd') : $('#lgs' + i);
  if (!e)
    return;
  if (i == -2) {
    e.scrollTop = 0;
    return;
  }
  e.scrollIntoView({ block: 'start' });
  const h = i < 0 ? e : e.querySelector('h2');
  h && h.focus({ preventScroll: true });
};
/* «Exportar una copia»: la página de la copia de seguridad, que es de Ajustes (con su «←» de vuelta a ellos) */
A.legalBackup = () => {
  A.openSettings();
  A.openBackup();
};
