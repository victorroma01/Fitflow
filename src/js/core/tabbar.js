/* ═══ core/tabbar ═══
   La barra de pestañas (F-38): sus cuatro botones y la burbuja del color de acento que marca la pestaña abierta. Al cambiar de
   pestaña, la burbuja se desliza hasta la nueva. Al mantener pulsada cualquier pestaña (o deslizar el dedo sobre la barra), la
   burbuja sigue al dedo hasta que se suelta, y se abre la pestaña que queda debajo; en Android vibra un poco al pasar por cada
   una. También la pestaña con la que se abre la app (Ajustes → Al abrir la app, S.startTab).
   Fluidez (I-19): las medidas de la barra se toman una vez y no en cada movimiento del dedo (tabGeometry); mientras se
   arrastra, la burbuja sigue al dedo sin transición y en su propia capa; al cogerla se acerca al dedo en TAB_GRAB_MS en vez de
   saltar; y al soltarla, o al tocar una pestaña, sale hacia la pestaña nueva antes de que esta se pinte (core/render, A.selectTab),
   así que su deslizamiento no espera a la pantalla nueva.
   Define: TABS, HOLD, TAB_GRAB_MS, tabDrag, tabDragEnd, tabButtons, tabGeo, tabGeometry, placeBubble, tabbarSync, buildTabbar, dragStart, dragMove, dragGlide, dragStop, tabNav, tabbarResized, START_TABS, startOf, startTabName, startTabCard, applyStartTab  · acciones/registros: 1
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
/* lo que tarda la burbuja en ponerse bajo el dedo al cogerla (ms) */
const TAB_GRAB_MS = 140;
/* arrastre en curso: { id, x0, y0, x (el dedo), on (la burbuja ya sigue al dedo), hv (pestaña debajo), timer, left (borde
   izquierdo de la barra en la pantalla), grab (lo que separaba la burbuja del dedo al cogerla), t0 (cuándo se cogió) } */
let tabDrag = null;
/* cuándo acabó el último arrastre: el toque que lo termina no debe pulsar nada */
let tabDragEnd = 0;
const tabButtons = () => [...document.querySelectorAll('nav button')];
/* medidas de la barra: { xs: dónde empieza cada pestaña dentro de la barra, w: ancho de una pestaña }. Se toman una vez y valen
   hasta que la ventana o la barra cambian de tamaño; con la barra oculta (en el entreno) no se toman */
let tabGeo = null;
const tabGeometry = () => {
  if (!tabGeo) {
    const bs = tabButtons();
    if (bs.length && bs[0].offsetWidth)
      tabGeo = { xs: bs.map(b => b.offsetLeft), w: bs[0].offsetWidth };
  }
  return tabGeo;
};
/* la burbuja en x (dentro de la barra), con ancho w; solo se toca lo que cambia */
const placeBubble = (x, w) => {
  const b = $('nav .nbb');
  const bx = x + 'px';
  const bw = w + 'px';
  if (b.style.getPropertyValue('--bx') != bx)
    b.style.setProperty('--bx', bx);
  if (b.style.getPropertyValue('--bw') != bw)
    b.style.setProperty('--bw', bw);
};
/** Marca la pestaña abierta y pone la burbuja bajo ella (tras cada R(), al tocar una pestaña y al cambiar de tamaño la
  ventana). Sin medidas (barra oculta), se queda el fondo de siempre del botón. */
export const tabbarSync = () => {
  const n = $('nav');
  if (!n || !n.querySelector('.nbb'))
    return;
  tabButtons().forEach((e, i) => e.classList.toggle('on', i == S.tab));
  if (tabDrag && tabDrag.on)
    return;
  /* la barra oculta (en el entreno: core/render) no tiene medidas; al volver, la burbuja se coloca sin deslizarse */
  const g = n.style.display == 'none' ? null : tabGeometry();
  if (!g) {
    n.classList.remove('nbon');
    return;
  }
  placeBubble(g.xs[S.tab], g.w);
  /* la primera vez se coloca sin deslizarse; después, cada cambio se anima */
  if (!n.classList.contains('nbon'))
    requestAnimationFrame(() => n.classList.add('nbon'));
};
/** Pinta la barra (al arrancar). */
export const buildTabbar = () => {
  /* la burbuja va detrás de los botones (y la última, para que los botones sigan siendo del 1 al 4) */
  $('nav').innerHTML = html`${TABS.map((t, i) => html`<button data-a="selectTab" data-i="${i}"><span style="display:block;line-height:0;padding-bottom:4px">${icon(t[0], 28)}</span>${raw(t[1])}</button>`)}<i class="nbb" aria-hidden="true"></i>`;
};
/* la burbuja se despega de su pestaña y va hacia el dedo (en la posición x de la pantalla) */
const dragStart = x => {
  const d = tabDrag;
  const n = $('nav');
  const g = tabGeometry();
  clearTimeout(d.timer);
  if (!g)
    return;
  const r = n.getBoundingClientRect();
  d.left = r.left + n.clientLeft;
  d.grab = g.xs[S.tab] - (x - d.left - g.w / 2);
  d.t0 = Date.now();
  d.on = 1;
  d.hv = -1;
  n.classList.add('drag');
  buzz(10);
  try {
    n.setPointerCapture(d.id);
  }
  catch (e) {
    /* sin captura (un toque simulado): los movimientos llegan igual a la barra */
  }
  dragMove(x);
  dragGlide(d);
};
/* la burbuja bajo el dedo (x en la pantalla, sin pasarse de la primera ni de la última pestaña) y la pestaña de debajo
   marcada. Sin medir nada: con las medidas tomadas al coger la burbuja */
const dragMove = x => {
  const d = tabDrag;
  const g = tabGeometry();
  if (!d || !g)
    return;
  d.x = x;
  /* lo que aún la separa del dedo: de grab a 0 en TAB_GRAB_MS, frenando al final */
  const k = Math.max(0, 1 - (Date.now() - d.t0) / TAB_GRAB_MS);
  const last = g.xs.length - 1;
  placeBubble(Math.max(g.xs[0], Math.min(g.xs[last], x - d.left - g.w / 2 + d.grab * k * k)), g.w);
  const i = Math.max(0, Math.min(last, Math.floor((x - d.left - g.xs[0]) / g.w)));
  if (i != d.hv) {
    if (d.hv >= 0)
      buzz(8);
    d.hv = i;
    tabButtons().forEach((e, j) => e.classList.toggle('hv', j == i));
  }
};
/* mientras la burbuja se acerca al dedo, se mueve en cada fotograma aunque el dedo esté quieto */
const dragGlide = d => {
  if (tabDrag === d && Date.now() - d.t0 < TAB_GRAB_MS)
    requestAnimationFrame(() => {
      if (tabDrag !== d)
        return;
      dragMove(d.x);
      dragGlide(d);
    });
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
  /* con el botón de la pestaña: A.selectTab mueve la burbuja ya y pinta la pestaña justo después */
  if (go && d.hv >= 0 && d.hv != S.tab)
    A.selectTab(d.hv, tabButtons()[d.hv]);
  else
    tabbarSync();
};
const tabNav = $('nav');
tabNav.addEventListener('pointerdown', e => {
  if (tabDrag || !e.isPrimary || e.button > 0 || !e.target.closest('nav button'))
    return;
  const x = e.clientX;
  tabDrag = { id: e.pointerId, x0: x, y0: e.clientY, x, on: 0, hv: -1, left: 0, grab: 0, t0: 0, timer: setTimeout(() => tabDrag && !tabDrag.on && dragStart(tabDrag.x), HOLD) };
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
/* al cambiar de tamaño la ventana (girar el móvil) o la barra (otro estilo), las medidas se toman de nuevo */
const tabbarResized = () => {
  tabGeo = null;
  tabbarSync();
};
window.addEventListener('resize', tabbarResized);
if (typeof ResizeObserver != 'undefined')
  new ResizeObserver(tabbarResized).observe(tabNav);
/** Opciones de Ajustes → Al abrir la app: [S.startTab, en la fila, en la lista]. */
const START_TABS = [[-1, 'La última', 'La última que usaste'], ...TABS.map((t, i) => [i, t[1], t[1]])];
const startOf = () => S.startTab >= 0 && S.startTab < TABS.length ? S.startTab : -1;
export const startTabName = () => START_TABS.find(x => x[0] == startOf())[1];
export const startTabCard = () => html`<p class="mu" style="margin:0 2px 12px;font-size:14px">La pestaña que ves al abrir StrataFit.</p><div class="cd srg" role="radiogroup" aria-label="Pestaña al abrir la app">${START_TABS.map(x => html`<button class="sr" data-a="setStartTab" data-v="${x[0]}" role="radio" aria-checked="${x[0] == startOf() ? 'true' : 'false'}"><span class="srl">${raw(x[2])}</span>${x[0] == startOf() ? raw(icon('chk', 20)) : ''}</button>`)}</div>`;
/** Al arrancar: la pestaña elegida en Ajustes (si no, se queda la última que se usó). */
export const applyStartTab = () => {
  if (startOf() >= 0)
    S.tab = startOf();
};
/* — manejadores de esta función (registros A / C / U) — */
A.setStartTab = (i, b) => {
  const v = +b.dataset.v;
  if (v >= 0 && v < TABS.length)
    S.startTab = v;
  else
    delete S.startTab;
  saveState('core');
  R();
};
