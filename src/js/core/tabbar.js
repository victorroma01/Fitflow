/* ═══ core/tabbar ═══
   La barra de pestañas (F-38): sus cuatro botones y la burbuja del color de acento que marca la pestaña abierta. Al cambiar de
   pestaña, la burbuja se desliza hasta la nueva. Al mantener pulsada cualquier pestaña (o deslizar el dedo sobre la barra), la
   burbuja sigue al dedo hasta que se suelta, y se abre la pestaña que queda debajo; en Android vibra un poco al pasar por cada
   una. También la pestaña con la que se abre la app (Ajustes → Al abrir la app, S.st0).
   Define: TABS, HOLD, tabDrag, tabDragEnd, tabButtons, tabbarSync, buildTabbar, tabIndexAt, dragStart, dragMove, dragStop, tabNav, START_TABS, startOf, startTabName, startTabCard, applyStartTab  · acciones/registros: 1
*/
import { $ } from './util.js';
import { A } from './registry.js';
import { S, saveState } from './state.js';
import { icon } from './icons.js';
import { R } from './render.js';
import { buzz } from '../profile/feedback.js';
import { html, raw } from './html.js';
/** [icono, nombre] de cada pestaña, en el orden de S.tab. */
const TABS = [['workout', 'Workout'], ['nutri', 'Nutrición'], ['dash', 'Dashboard'], ['user', 'Perfil']];
/* lo que hay que mantener el dedo quieto para coger la burbuja (ms) */
const HOLD = 260;
/* arrastre en curso: { id, x0, y0, on (la burbuja ya sigue al dedo), hv (pestaña debajo), timer } */
let tabDrag = null;
/* cuándo acabó el último arrastre: el toque que lo termina no debe pulsar nada */
let tabDragEnd = 0;
const tabButtons = () => [...document.querySelectorAll('nav button')];
/** Coloca la burbuja bajo la pestaña abierta (tras cada R() y al girar el móvil). Sin medidas (barra oculta), se queda el
  fondo de siempre del botón. */
export const tabbarSync = () => {
  const n = $('nav');
  const b = n && n.querySelector('.nbb');
  if (!b || tabDrag && tabDrag.on)
    return;
  const t = tabButtons()[S.tab];
  if (!t || !t.offsetWidth) {
    n.classList.remove('nbon');
    return;
  }
  b.style.setProperty('--bx', t.offsetLeft + 'px');
  b.style.setProperty('--bw', t.offsetWidth + 'px');
  /* la primera vez se coloca sin deslizarse; después, cada cambio se anima */
  if (!n.classList.contains('nbon'))
    requestAnimationFrame(() => n.classList.add('nbon'));
};
/** Pinta la barra (al arrancar). */
export const buildTabbar = () => {
  /* la burbuja va detrás de los botones (y la última, para que los botones sigan siendo del 1 al 4) */
  $('nav').innerHTML = html`${TABS.map((t, i) => html`<button data-a="tab" data-i="${i}"><span style="display:block;line-height:0;padding-bottom:4px">${icon(t[0], 28)}</span>${raw(t[1])}</button>`)}<i class="nbb" aria-hidden="true"></i>`;
};
/* pestaña bajo la posición x de la pantalla (la más cercana, si se sale por un lado) */
const tabIndexAt = x => {
  const bs = tabButtons();
  const r0 = bs[0].getBoundingClientRect();
  const w = r0.width || 1;
  return Math.max(0, Math.min(bs.length - 1, Math.floor((x - r0.left) / w)));
};
/* la burbuja se despega de su pestaña y sigue al dedo */
const dragStart = x => {
  const n = $('nav');
  clearTimeout(tabDrag.timer);
  tabDrag.on = 1;
  tabDrag.hv = -1;
  n.classList.add('drag');
  buzz(10);
  try {
    n.setPointerCapture(tabDrag.id);
  }
  catch (e) {
    /* sin captura (un toque simulado): los movimientos llegan igual a la barra */
  }
  dragMove(x);
};
const dragMove = x => {
  const n = $('nav');
  const bs = tabButtons();
  const b = n.querySelector('.nbb');
  const w = bs[0].offsetWidth;
  const left = x - n.getBoundingClientRect().left - n.clientLeft - w / 2;
  b.style.setProperty('--bx', Math.max(bs[0].offsetLeft, Math.min(bs[bs.length - 1].offsetLeft, left)) + 'px');
  b.style.setProperty('--bw', w + 'px');
  const i = tabIndexAt(x);
  if (i != tabDrag.hv) {
    if (tabDrag.hv >= 0)
      buzz(8);
    tabDrag.hv = i;
    bs.forEach((e, k) => e.classList.toggle('hv', k == i));
  }
};
/* fin del gesto: con la burbuja cogida, se abre la pestaña de debajo (go) o vuelve a la suya (gesto cancelado) */
const dragStop = go => {
  const d = tabDrag;
  tabDrag = null;
  if (!d)
    return;
  clearTimeout(d.timer);
  if (!d.on)
    return;
  tabDragEnd = Date.now();
  const n = $('nav');
  n.classList.remove('drag');
  tabButtons().forEach(e => e.classList.remove('hv'));
  if (go && d.hv >= 0 && d.hv != S.tab)
    A.tab(d.hv);
  else
    tabbarSync();
};
const tabNav = $('nav');
tabNav.addEventListener('pointerdown', e => {
  if (tabDrag || !e.isPrimary || e.button > 0 || !e.target.closest('nav button'))
    return;
  const x = e.clientX;
  tabDrag = { id: e.pointerId, x0: x, y0: e.clientY, on: 0, hv: -1, timer: setTimeout(() => tabDrag && !tabDrag.on && dragStart(tabDrag.x), HOLD), x };
});
tabNav.addEventListener('pointermove', e => {
  if (!tabDrag || e.pointerId != tabDrag.id)
    return;
  tabDrag.x = e.clientX;
  if (tabDrag.on) {
    dragMove(e.clientX);
    return;
  }
  const dx = Math.abs(e.clientX - tabDrag.x0);
  const dy = Math.abs(e.clientY - tabDrag.y0);
  /* deslizar por la barra también coge la burbuja; un movimiento hacia arriba o abajo es otra cosa */
  if (dx > 10 && dx > dy)
    dragStart(e.clientX);
  else if (dy > 14)
    dragStop(0);
});
tabNav.addEventListener('pointerup', e => {
  if (tabDrag && e.pointerId == tabDrag.id)
    dragStop(1);
});
tabNav.addEventListener('pointercancel', e => {
  if (tabDrag && e.pointerId == tabDrag.id)
    dragStop(0);
});
/* si la barra pierde el dedo sin soltarlo (no el botón, que lo suelta al cogerlo la barra), el gesto se cancela */
tabNav.addEventListener('lostpointercapture', e => {
  if (tabDrag && tabDrag.on && e.pointerId == tabDrag.id && e.target == tabNav)
    dragStop(0);
});
/* mantener pulsado no abre el menú del sistema */
tabNav.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('click', e => {
  if (e.isTrusted && Date.now() - tabDragEnd < 300 && e.target.closest && e.target.closest('nav')) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);
window.addEventListener('resize', tabbarSync);
/** Opciones de Ajustes → Al abrir la app: [S.st0, en la fila, en la lista]. */
const START_TABS = [[-1, 'La última', 'La última que usaste'], ...TABS.map((t, i) => [i, t[1], t[1]])];
const startOf = () => S.st0 >= 0 && S.st0 < TABS.length ? S.st0 : -1;
export const startTabName = () => START_TABS.find(x => x[0] == startOf())[1];
export const startTabCard = () => html`<p class="mu" style="margin:0 2px 12px;font-size:14px">La pestaña que ves al abrir StrataFit.</p><div class="cd srg" role="radiogroup" aria-label="Pestaña al abrir la app">${START_TABS.map(x => html`<button class="sr" data-a="zst" data-v="${x[0]}" role="radio" aria-checked="${x[0] == startOf() ? 'true' : 'false'}"><span class="srl">${raw(x[2])}</span>${x[0] == startOf() ? raw(icon('chk', 20)) : ''}</button>`)}</div>`;
/** Al arrancar: la pestaña elegida en Ajustes (si no, se queda la última que se usó). */
export const applyStartTab = () => {
  if (startOf() >= 0)
    S.tab = startOf();
};
/* — manejadores de esta función (registros A / C / U) — */
A.zst = (i, b) => {
  const v = +b.dataset.v;
  if (v >= 0 && v < TABS.length)
    S.st0 = v;
  else
    delete S.st0;
  saveState();
  R();
};
