/* ═══ core/ui ═══
   Hojas inferiores (sheet, fullPage), diálogos (dialog, confirmDialog), menú lateral y componentes base.
   Las páginas (fullPage) llevan un rastro: al pasar de una a una subpágina suya, la de antes se guarda tal como estaba. Con
   eso, al volver queda en el punto en que se dejó y, mientras la subpágina se desliza con el dedo, debajo se ve la página a la
   que se vuelve y no la pestaña (showPageBelow, para core/swipe; I-20).
   Cada hoja o página se anuncia como una ventana (role="dialog", aria-modal y su título) y, al abrirla o al pasar a otra página,
   el foco va a ella (sin abrir el teclado); al cerrarla vuelve a lo que la abrió (I-06), para que con VoiceOver o con teclado no
   se siga por la pantalla de detrás. Igual el aviso (#dg) y el menú (#mn), que se abren y cierran también desde otros módulos.
   Define: sheetBarFix, pageTrail, pageKey, backLink, touched, touchedAt, recentTouch, TYPING, openerNow, focusBack, openers, sheetDialog, swapPage, showPageBelow, sheet, confirmDialog, dialog, watchLayer, closeLayer, onSheetClose, sheetToTop, fullPage, pgHead, segmented, linkRow  · acciones/registros: 6
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
  return b && b.dataset.a != 'closeSheet' ? b.dataset.a + ':' + (b.dataset.i || '') : '';
};
/* lo último que se tocó (un botón o lo que hace de botón) y cuándo: en Safari, tocar un botón no le da el foco, así que
   document.activeElement no basta para saber qué abrió una hoja */
let touched = null;
let touchedAt = 0;
document.addEventListener('click', e => {
  const t = e.target.closest && e.target.closest('button, a, [role=button], [data-a]');
  if (t) {
    touched = t;
    touchedAt = Date.now();
  }
}, true);
const recentTouch = () => touched && Date.now() - touchedAt < 3000 ? touched : null;
/* campos en los que se escribe: no se les devuelve el foco, que en el móvil abriría el teclado */
const TYPING = 'input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select, [contenteditable]';
/* lo que abre ahora una ventana (lo recién tocado o, si no, lo que tiene el foco) y cómo encontrarlo si se vuelve a pintar */
const openerNow = () => {
  const t = recentTouch();
  const a = document.activeElement;
  const e = t && t.isConnected ? t : a && a != document.body ? a : null;
  if (!e)
    return null;
  const d = e.dataset || {};
  return { e, k: d.a ? '[data-a="' + CSS.escape(d.a) + '"]' + (d.i != null ? '[data-i="' + CSS.escape(d.i) + '"]' : '') : '' };
};
/* devuelve el foco a lo que abrió una ventana (o al que lo sustituye, si se volvió a pintar), sin mover la pantalla */
const focusBack = o => {
  if (!o)
    return;
  const e = o.e.isConnected ? o.e : o.k ? document.querySelector(o.k) : null;
  if (e && !e.matches(TYPING))
    e.focus({ preventScroll: true });
};
/* qué abrió cada ventana: la hoja (#sh), el aviso (#dg) y el menú (#mn) */
const openers = {};
/* la hoja o página abierta, como ventana: su título (el primero que lleve) le da nombre; con focus, el foco va a ella */
const sheetDialog = (p, focus) => {
  const t = p.querySelector('h1,h2,h3');
  if (t) {
    t.id = t.id || 'sht';
    p.setAttribute('aria-labelledby', t.id);
  }
  else
    p.removeAttribute('aria-labelledby');
  if (focus)
    p.focus({ preventScroll: true });
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
    sheetDialog(p, 0);
    return false;
  }
  const from = { key: p.dataset.pg, back: backLink(p), y: p.scrollTop, nodes: document.createDocumentFragment() };
  from.nodes.append(...p.childNodes);
  p.innerHTML = h;
  p.dataset.pg = key;
  sheetBarFix();
  sheetDialog(p, 1);
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
  const opening = h && !p;
  if (opening)
    openers['#sh'] = openerNow();
  /* si el foco estaba dentro de la hoja que se vuelve a pintar (o se acaba de tocar algo en ella), pasa a la nueva y no al
     fondo de la pantalla */
  const hadFocus = !!p && (p.contains(document.activeElement) || p.contains(recentTouch()));
  s.innerHTML = h ? html`<div class="bk" data-a="closeSheet"></div><div class="sp" data-pg="${pageKey(h)}" role="dialog" aria-modal="true" tabindex="-1">${raw(h)}</div>` : '';
  sheetBarFix();
  if (h)
    sheetDialog(s.querySelector('.sp'), opening || hadFocus);
  else if (p) {
    /* al cerrar, el foco vuelve a lo que la abrió */
    focusBack(openers['#sh']);
    openers['#sh'] = null;
  }
};
export const confirmDialog = (t, p, a, l) => dialog(t, p, [['Cancelar', 'doNothing', ''], [l, a, 'pr']]);
document.body.insertAdjacentHTML('beforeend', '<div id="mn"></div><div id="dg"></div><div id="tt"></div>');
export function dialog(t, p, b) {
  /* para los lectores de pantalla, una ventana que tapa la app (aria-modal) con su título */
  $('#dg').innerHTML = html`<div class="dgb"><div class="dgc" role="dialog" aria-modal="true" aria-labelledby="dgt"><h3 id="dgt" style="margin:0 0 6px">${raw(t)}</h3><p class="mu" style="margin:0 0 16px;font-size:14px">${raw(p)}</p><div class="g2" style="grid-template-columns:repeat(${b.length},1fr)">${b.map(x => html`<button class="${x[2]}" data-a="dialogAnswer" data-v="${x[1]}">${raw(x[0])}</button>`)}</div></div></div>`;
}
/* el aviso y el menú se abren y se cierran escribiendo en #dg y #mn (también desde workout/rpe, core/back y core/swipe): al
   abrirse, el foco va a su ventana; al cerrarse, vuelve a lo que los abrió, si nada más lo ha cogido */
const watchLayer = id => {
  if (typeof MutationObserver == 'undefined')
    return;
  new MutationObserver(() => {
    const w = $(id + ' [role=dialog]');
    if (w) {
      if (!openers[id])
        openers[id] = openerNow();
      if (!w.contains(document.activeElement)) {
        w.tabIndex = -1;
        w.focus({ preventScroll: true });
      }
    }
    else if (openers[id]) {
      const o = openers[id];
      openers[id] = null;
      if (!document.activeElement || document.activeElement == document.body)
        focusBack(o);
    }
  }).observe($(id), { childList: true });
};
watchLayer('#dg');
watchLayer('#mn');
/* cierra el aviso o el menú y devuelve ya el foco a lo que lo abrió, antes de la acción elegida: si esta abre una hoja, la hoja
   sabe así a dónde devolverlo al cerrarse */
const closeLayer = id => {
  $(id).innerHTML = '';
  focusBack(openers[id]);
  openers[id] = null;
};
A.dialogAnswer = (i, b) => {
  closeLayer('#dg');
  const f = A[b.dataset.v];
  f && f(0, b);
};
A.doNothing = () => {
};
A.menuItem = (i, b) => {
  closeLayer('#mn');
  A[b.dataset.v]();
};
/** Tareas al cerrar la hoja con «Cerrar» (p. ej. apagar la cámara del escáner): los módulos que lo necesitan se apuntan aquí. */
export const onSheetClose = [];
A.closeSheet = () => {
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
export const pgHead = (t, back) => html`<div class="row"><button data-a="${back || 'closeSheet'}" aria-label="Volver" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button></div><h1 class="pgt">${raw(t)}</h1>`;
A.openMenu = () => {
  $('#mn').innerHTML = html`<div class="mbk" data-a="closeMenu"></div><div class="msd" role="dialog" aria-modal="true" aria-label="Menú"><div class="msb2"></div><div class="msb"></div><div class="mci"><button class="mx" data-a="closeMenu" aria-label="Cerrar">${icon('x', 22)}</button><div class="mti">Menú</div>${[['openPrograms', 'prog', 'Programas'], ['openCalendar', 'cal', 'Calendario'], ['openLogs', 'log', 'Registros'], ['rotationShow', 'swp', 'Rotar ejercicios'], ['resetWeek', 'reset', 'Reiniciar semana']].map((x, i) => html`<button class="mi" style="--d:${70 + i * 60}ms" data-a="menuItem" data-v="${x[0]}"><span>${raw(x[2])}</span>${icon(x[1], 22)}</button>`)}</div></div>`;
};
A.closeMenu = () => {
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
