/* ═══ core/swipe ═══
   Deslizar para volver (F-37): en las páginas de dentro (las que se abren desde una pestaña y sus subpáginas, las ventanas que
   suben desde abajo, el menú lateral, Overview y Evolución del peso), deslizar el dedo de izquierda a derecha hace lo mismo que
   su «←» o su «Cerrar» (core/back). La página sigue al dedo: si se suelta pasada la cuarta parte de la pantalla, o con un gesto
   rápido, vuelve; si no, se queda donde estaba. En las pestañas principales no hace nada, ni durante un entreno, en las
   ventanas de aviso, en el recorrido o en el temporizador de WOD. No empieza en un campo de texto ni en una fila que se desplaza
   de lado (por ejemplo, la de los filtros).
   Define: SWIPE_KINDS, SWIPE_SKIP, swipe, swipeEnd, scrollsSideways, swipeMove, swipeReset, swipeStop
*/
import { $ } from './util.js';
import { backTarget } from './back.js';
/** Lo que se cierra deslizando (tipos de backTarget). */
const SWIPE_KINDS = ['hoja', 'menu', 'página'];
/* donde no empieza el gesto: campos, la barra de pestañas (tiene el suyo: core/tabbar) y lo marcado con data-noswipe */
const SWIPE_SKIP = 'input,textarea,select,[contenteditable],nav,canvas,[data-noswipe]';
/* gesto en curso: { id, x0, y0, t (de backTarget), on (ya es nuestro), dx, w, vx, px, pt, also (lo que se mueve con la página) } */
let swipe = null;
/* fin del último gesto: el toque que lo termina no debe pulsar lo que haya debajo */
let swipeEnd = 0;
/* ¿hay entre el dedo y la página algo que se desplaza de lado? (ese gesto es suyo) */
const scrollsSideways = (el, top) => {
  for (let e = el; e && e != top; e = e.parentElement)
    if (e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX))
      return true;
  return false;
};
/* la página (y lo que va con ella) a dx píxeles de su sitio; el fondo oscuro se aclara a la vez */
const swipeMove = (s, dx) => {
  const k = s.t.k == 'página';
  s.t.el.style[k ? 'left' : 'transform'] = k ? dx + 'px' : 'translateX(' + dx + 'px)';
  s.also.forEach(e => e.style.transform = 'translateX(' + dx + 'px)');
  if (s.bk)
    s.bk.style.opacity = String(Math.max(0, 1 - dx / s.w));
};
const swipeReset = s => {
  [s.t.el, ...s.also].forEach(e => {
    e.style.transition = '';
    e.style.transform = '';
    e.style.left = '';
    e.style.position = '';
    e.style.willChange = '';
  });
  if (s.bk)
    s.bk.style.opacity = '';
};
/* al soltar: vuelve si ha pasado la cuarta parte (o el gesto es rápido); si no, la página regresa a su sitio */
const swipeStop = go => {
  const s = swipe;
  swipe = null;
  if (!s || !s.on)
    return;
  swipeEnd = Date.now();
  /* rápido: más de 0,45 px/ms en el último movimiento, si el dedo no se ha parado antes de soltar */
  const fast = s.vx > .45 && Date.now() - s.pt < 120;
  const done = go && (s.dx > Math.max(80, s.w * .25) || fast && s.dx > 30);
  const calm = document.documentElement.classList.contains('rm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = done ? 'transform .18s ease-out,left .18s ease-out' : 'transform .24s cubic-bezier(.2,.8,.2,1),left .24s cubic-bezier(.2,.8,.2,1)';
  if (!calm) {
    [s.t.el, ...s.also].forEach(e => e.style.transition = ease);
    swipeMove(s, done ? s.w : 0);
  }
  setTimeout(() => {
    swipeReset(s);
    if (!done)
      return;
    /* el menú ya ha salido deslizándose: se quita sin su animación de cierre */
    if (s.t.k == 'menu') {
      $('#mn').innerHTML = '';
      return;
    }
    s.t.go();
    /* si era una subpágina, la anterior aparece en la misma hoja con un pequeño fundido */
    const p = $('#sh .sp');
    if (p && p == s.t.el && !calm && p.animate)
      p.animate([{ transform: 'translateX(-28px)', opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'ease-out' });
  }, calm ? 0 : done ? 180 : 240);
};
document.addEventListener('pointerdown', e => {
  if (swipe || !e.isPrimary || e.pointerType != 'touch' && e.pointerType != 'pen')
    return;
  const t = backTarget();
  const g = e.target;
  if (!t || !SWIPE_KINDS.includes(t.k) || !t.el || !(g instanceof Element) || g.closest(SWIPE_SKIP))
    return;
  /* en una hoja vale también su botón fijo de abajo; en el menú, solo el menú */
  const inside = t.el.contains(g) || t.k == 'hoja' && !!g.closest('#sh > .sb');
  if (!inside || scrollsSideways(g, t.el.parentElement))
    return;
  swipe = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t, on: 0, dx: 0, vx: 0, px: e.clientX, pt: Date.now(), w: innerWidth, also: [], bk: null };
});
document.addEventListener('pointermove', e => {
  const s = swipe;
  if (!s || e.pointerId != s.id)
    return;
  const dx = e.clientX - s.x0;
  const dy = e.clientY - s.y0;
  if (!s.on) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10)
      return;
    /* solo de izquierda a derecha y más de lado que en vertical; si no, es un desplazamiento normal */
    if (dx <= 0 || dx < Math.abs(dy) * 1.4) {
      swipe = null;
      return;
    }
    s.on = 1;
    if (s.t.k == 'hoja') {
      s.also = [...document.querySelectorAll('#sh > .sb')];
      s.bk = $('#sh .bk');
    }
    else if (s.t.k == 'menu')
      s.bk = $('#mn .mbk');
    else
      s.t.el.style.position = 'relative';
    [s.t.el, ...s.also].forEach(x => {
      x.style.transition = 'none';
      if (s.t.k != 'página')
        x.style.willChange = 'transform';
    });
  }
  /* velocidad (px/ms), suavizada: un gesto rápido vuelve aunque sea corto */
  const now = Date.now();
  if (now > s.pt) {
    s.vx = .6 * ((e.clientX - s.px) / (now - s.pt)) + .4 * s.vx;
    s.px = e.clientX;
    s.pt = now;
  }
  s.dx = Math.max(0, dx);
  swipeMove(s, s.dx);
}, { passive: true });
document.addEventListener('pointerup', e => {
  if (swipe && e.pointerId == swipe.id)
    swipeStop(1);
});
document.addEventListener('pointercancel', e => {
  if (swipe && e.pointerId == swipe.id)
    swipeStop(0);
});
document.addEventListener('click', e => {
  if (e.isTrusted && Date.now() - swipeEnd < 300) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);
