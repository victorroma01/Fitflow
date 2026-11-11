/* ═══ core/ui ═══
   Hojas inferiores (sheet, fullPage), diálogos (dialog, confirmDialog), menú lateral y componentes base.
   Las páginas (fullPage) llevan un rastro: al pasar de una a una subpágina suya, la de antes se guarda tal como estaba. Con
   eso, al volver queda en el punto en que se dejó y, mientras la subpágina se desliza con el dedo, debajo se ve la página a la
   que se vuelve y no la pestaña (showPageBelow, para core/swipe; I-20).
   Define: sheetBarFix, pageTrail, pageKey, backLink, swapPage, showPageBelow, sheet, confirmDialog, dialog, onSheetClose, sheetToTop, fullPage, pgHead, segmented, linkRow  · acciones/registros: 6
*/
import { $ } from './util.js';
import { logError } from './errors.js';
import { A } from './registry.js';
import { icon } from './icons.js';
import { html, raw } from './html.js';
function sheetBarFix() {
  try {
    const s = $('#sh');
    if (!s)
      return;
    [...s.children].forEach(c => {
      if (c.classList && c.classList.contains('sb'))
        c.remove();
    });
    s.querySelectorAll('.sp .sb').forEach(b => s.appendChild(b));
  }
  catch (e) {
    logError('barra de la hoja', e);
  }
}
/* rastro de páginas: las que quedan «debajo» de la subpágina abierta, de la más antigua a la más nueva.
   { key: clave de la página, back: a dónde lleva su «←», y: desplazamiento, nodes: su contenido (DocumentFragment) } */
const pageTrail = [];
/* la clave de una página es su título (el de pgHead); '' si no lo lleva */
const pageKey = h => (/<h1 class="pgt">(.*?)<\/h1>/.exec(h) || [])[1] || '';
/* a dónde lleva el «←» de la página p (acción y dato), o '' si la cierra o no lo tiene: con '' es una página de primer nivel */
const backLink = p => {
  const b = p.querySelector('[aria-label="Volver"]');
  return b && b.dataset.a != 'cl' ? b.dataset.a + ':' + (b.dataset.i || '') : '';
};
/* Cambia el contenido de la página abierta por h y pone al día el rastro. Devuelve true si con eso se vuelve a la página de
   antes, que queda en el punto en que se dejó. */
const swapPage = (p, h) => {
  const key = pageKey(h);
  p.classList.remove('still');
  /* la misma página, pintada de nuevo */
  if (key == p.dataset.pg) {
    p.innerHTML = h;
    sheetBarFix();
    return false;
  }
  const from = { key: p.dataset.pg, back: backLink(p), y: p.scrollTop, nodes: document.createDocumentFragment() };
  from.nodes.append(...p.childNodes);
  p.innerHTML = h;
  p.dataset.pg = key;
  sheetBarFix();
  const top = pageTrail[pageTrail.length - 1];
  if (top && top.key == key) {
    pageTrail.pop();
    p.scrollTop = top.y;
    return true;
  }
  const back = backLink(p);
  if (!back)
    pageTrail.length = 0;
  /* con el mismo «←» que la de antes es otra página del mismo nivel, no una subpágina suya */
  else if (back != from.back)
    pageTrail.push(from);
  return false;
};
/** Mientras una subpágina se desliza con el dedo: pone debajo la página a la que se vuelve, tal como se dejó, y devuelve la
    función que la quita. null si lo abierto no es una subpágina (debajo se ve la pestaña). */
export const showPageBelow = () => {
  const s = $('#sh');
  const p = s.querySelector('.sp');
  const top = pageTrail[pageTrail.length - 1];
  if (!top || !p || s.className != 'full' || !backLink(p))
    return null;
  const u = document.createElement('div');
  u.className = 'sp spu';
  u.inert = true;
  u.setAttribute('aria-hidden', 'true');
  u.append(top.nodes);
  s.append(u);
  u.scrollTop = top.y;
  return () => {
    top.nodes.append(...u.childNodes);
    u.remove();
  };
};
export const sheet = h => {
  const s = $('#sh');
  const p = s.querySelector('.sp');
  if (h && p && s.className == 'full') {
    swapPage(p, h);
    return;
  }
  pageTrail.length = 0;
  s.className = '';
  s.innerHTML = h ? html`<div class="bk" data-a="cl"></div><div class="sp" data-pg="${pageKey(h)}">${raw(h)}</div>` : '';
  sheetBarFix();
};
export const confirmDialog = (t, p, a, l) => dialog(t, p, [['Cancelar', 'zno', ''], [l, a, 'pr']]);
document.body.insertAdjacentHTML('beforeend', '<div id="mn"></div><div id="dg"></div><div id="tt"></div>');
export function dialog(t, p, b) {
  /* para los lectores de pantalla, una ventana que tapa la app (aria-modal) con su título */
  $('#dg').innerHTML = html`<div class="dgb"><div class="dgc" role="dialog" aria-modal="true" aria-labelledby="dgt"><h3 id="dgt" style="margin:0 0 6px">${raw(t)}</h3><p class="mu" style="margin:0 0 16px;font-size:14px">${raw(p)}</p><div class="g2" style="grid-template-columns:repeat(${b.length},1fr)">${b.map(x => html`<button class="${x[2]}" data-a="dga" data-v="${x[1]}">${raw(x[0])}</button>`)}</div></div></div>`;
}
A.dga = (i, b) => {
  $('#dg').innerHTML = '';
  const f = A[b.dataset.v];
  f && f(0, b);
};
A.zno = () => {
};
A.mnx = (i, b) => {
  $('#mn').innerHTML = '';
  A[b.dataset.v]();
};
/** Tareas al cerrar la hoja con «Cerrar» (p. ej. apagar la cámara del escáner): los módulos que lo necesitan se apuntan aquí. */
export const onSheetClose = [];
A.cl = () => {
  onSheetClose.forEach(f => f());
  sheet();
};
export const sheetToTop = () => {
  const p = $('#sh .sp');
  if (p)
    p.scrollTop = 0;
};
/** Abre h a pantalla completa, o lo pone en la página ya abierta: arriba del todo, salvo al volver a la página de antes. */
export const fullPage = h => {
  const s = $('#sh');
  const p = s.querySelector('.sp');
  if (p && s.className == 'full') {
    if (!swapPage(p, h))
      p.scrollTop = 0;
    return;
  }
  sheet(h);
  s.className = 'full';
};
export const pgHead = (t, back) => html`<div class="row"><button data-a="${back || 'cl'}" aria-label="Volver" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button></div><h1 class="pgt">${raw(t)}</h1>`;
A.menu = () => {
  $('#mn').innerHTML = html`<div class="mbk" data-a="mnc"></div><div class="msd" role="dialog" aria-modal="true" aria-label="Menú"><div class="msb2"></div><div class="msb"></div><div class="mci"><button class="mx" data-a="mnc" aria-label="Cerrar">${icon('x', 22)}</button><div class="mti">Menú</div>${[['pg', 'prog', 'Programas'], ['cl2', 'cal', 'Calendario'], ['lg', 'log', 'Registros'], ['rtv', 'swp', 'Rotar ejercicios'], ['rw', 'reset', 'Reiniciar semana']].map((x, i) => html`<button class="mi" style="--d:${70 + i * 60}ms" data-a="mnx" data-v="${x[0]}"><span>${raw(x[2])}</span>${icon(x[1], 22)}</button>`)}</div></div>`;
};
A.mnc = () => {
  const s = $('.msd');
  if (!s) {
    $('#mn').innerHTML = '';
    return;
  }
  s.classList.add('out');
  setTimeout(() => {
    $('#mn').innerHTML = '';
  }, 240);
};
export const segmented = (a, cur, list) => html`<div class="seg${list.length == 2 ? ' s2' : ''}">${list.map(x => html`<button class="${cur == x[0] ? 'on' : ''}" data-a="${a}" data-v="${x[0]}">${raw(x[1])}</button>`)}</div>`;
export const linkRow = (ico, t, s, a, i) => html`<button class="cd f2lk" data-a="${a}"${raw(i != null ? ' data-i="' + i + '"' : '')}>${icon(ico, 30)}<span><b>${raw(t)}</b><br><small>${raw(s)}</small></span></button>`;
