/* ═══ core/swipe ═══
   Deslizar para volver (F-37): en las páginas de dentro (las que se abren desde una pestaña y sus subpáginas, las ventanas que
   suben desde abajo, el menú lateral, Overview y Evolución del peso), deslizar el dedo de izquierda a derecha hace lo mismo que
   su «←» o su «Cerrar» (core/back). La página sigue al dedo: si se suelta pasada la cuarta parte de la pantalla, o con un gesto
   rápido, vuelve; si no, se queda donde estaba. En las pestañas principales no hace nada, ni durante un entreno, en las
   ventanas de aviso, en el recorrido o en el temporizador de WOD. No empieza en un campo de texto ni en una fila que se desplaza
   de lado (por ejemplo, la de los filtros).
   Mientras algo sigue al dedo, <html> lleva la clase «sliding»: lo que se mueve va sin desenfoque de fondo ni transparencia
   (en iPhone, mover una capa con desenfoque la deja en negro a ratos; I-20). Si es una subpágina, debajo se ve la página a la
   que se vuelve (showPageBelow) y no la pestaña.
   Deslizar hacia abajo cierra una ventana que sube desde abajo (no las páginas: #sh.full), como en el iPhone, también durante un
   entreno: si está arriba del todo y el dedo baja más que de lado, la ventana lo sigue, y se cierra si se suelta pasada la cuarta
   parte de su altura o con un gesto rápido. Mientras, lo de detrás no se mueve. Va con eventos táctiles, escuchados en #sh y no
   en todo el documento: para que la ventana no rebote ni arrastre la página de detrás, ese movimiento se cancela, y eso solo se
   puede en un touchmove que no sea pasivo. Si la ventana tiene un paso atrás dentro (data-back), no se cierra así.
   Define: SWIPE_KINDS, SWIPE_SKIP, swipe, swipeEnd, scrollsSideways, swipeMove, swipeReset, swipeStop, drop, dropTarget, scrolledInside, dropMove, dropStop, sheetHost
   scrolledInside, dropMove, dropStop
*/
import { $ } from './util.js';
import { backTarget } from './back.js';
import { showPageBelow } from './ui.js';
/** Lo que se cierra deslizando (tipos de backTarget). */
const SWIPE_KINDS = ['hoja', 'menu', 'página'];
/* donde no empieza el gesto: campos, la barra de pestañas (tiene el suyo: core/tabbar) y lo marcado con data-noswipe */
const SWIPE_SKIP = 'input,textarea,select,[contenteditable],nav,canvas,[data-noswipe]';
/* gesto en curso: { id, x0, y0, t (de backTarget), on (ya es nuestro), dx, w, vx, px, pt, also (lo que se mueve con la página),
   bk (el fondo oscuro), below (quita la página puesta debajo, si la hay) } */
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
  if (s.below)
    s.below();
  document.documentElement.classList.remove('sliding');
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
  const calm = document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    const p = $('#sh .sheet');
    if (!p || p != s.t.el)
      return;
    /* era una subpágina. Si la anterior ya se veía debajo, queda tal cual, sin animaciones; si no, entra con un pequeño fundido */
    if (s.below)
      p.classList.add('still');
    else if (!calm && p.animate)
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
  const inside = t.el.contains(g) || t.k == 'hoja' && !!g.closest('#sh > .sticky-btn');
  if (!inside || scrollsSideways(g, t.el.parentElement))
    return;
  swipe = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t, on: 0, dx: 0, vx: 0, px: e.clientX, pt: Date.now(), w: innerWidth, also: [], bk: null, below: null };
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
    document.documentElement.classList.add('sliding');
    if (s.t.k == 'hoja') {
      s.also = [...document.querySelectorAll('#sh > .sticky-btn')];
      s.bk = $('#sh .backdrop');
      s.below = showPageBelow();
    }
    else if (s.t.k == 'menu')
      s.bk = $('#mn .menu-backdrop');
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
/* gesto hacia abajo en curso: { id (el dedo), x0, y0, t (de backTarget), on (ya es nuestro), dy, h (alto de la ventana), vy,
   py, pt, also (los botones fijos de abajo, que van con ella), bk (el fondo oscuro) } */
let drop = null;
/* lo que se cierra deslizando hacia abajo: una ventana que sube desde abajo, sin un paso atrás dentro */
const dropTarget = () => {
  const t = backTarget();
  return t && t.k == 'hoja' && t.el && $('#sh').className != 'full' && !t.el.querySelector('[data-back]') ? t : null;
};
/* ¿hay entre el dedo y la ventana algo que se desplaza en vertical y no está arriba del todo? (ese gesto es suyo) */
const scrolledInside = (el, top) => {
  for (let e = el; e && e != top; e = e.parentElement)
    if (e.scrollTop > 0 && e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY))
      return true;
  return false;
};
/* la ventana (y sus botones fijos) a dy píxeles hacia abajo; el fondo oscuro se aclara a la vez */
const dropMove = (d, dy) => {
  [d.t.el, ...d.also].forEach(e => e.style.transform = 'translateY(' + dy + 'px)');
  if (d.bk)
    d.bk.style.opacity = String(Math.max(0, 1 - dy / d.h));
};
/* al soltar: se cierra si ha bajado la cuarta parte (o el gesto es rápido); si no, vuelve a su sitio */
const dropStop = go => {
  const d = drop;
  drop = null;
  if (!d || !d.on)
    return;
  swipeEnd = Date.now();
  const fast = d.vy > .45 && Date.now() - d.pt < 120;
  const done = go && (d.dy > Math.max(80, d.h * .25) || fast && d.dy > 30);
  const calm = document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = [d.t.el, ...d.also];
  if (!calm) {
    els.forEach(e => e.style.transition = done ? 'transform .18s ease-out' : 'transform .24s cubic-bezier(.2,.8,.2,1)');
    if (d.bk)
      d.bk.style.transition = 'opacity .18s ease-out';
    dropMove(d, done ? d.h + 40 : 0);
  }
  setTimeout(() => {
    els.forEach(e => {
      e.style.transition = '';
      e.style.transform = '';
      e.style.willChange = '';
    });
    if (d.bk) {
      d.bk.style.transition = '';
      d.bk.style.opacity = '';
    }
    document.documentElement.classList.remove('sliding');
    if (done)
      d.t.go();
  }, calm ? 0 : done ? 180 : 240);
};
const sheetHost = $('#sh');
sheetHost.addEventListener('touchstart', e => {
  drop = null;
  /* (el de volver también empieza a mirar este dedo, en pointerdown: el primero que vea su dirección se lo queda) */
  if (e.touches.length != 1 || swipe && swipe.on)
    return;
  const t = dropTarget();
  const g = e.target;
  if (!t || !(g instanceof Element) || g.closest(SWIPE_SKIP))
    return;
  const inside = t.el.contains(g) || !!g.closest('#sh > .sticky-btn');
  if (!inside || t.el.scrollTop > 0 || scrolledInside(g, t.el))
    return;
  const p = e.touches[0];
  drop = { id: p.identifier, x0: p.clientX, y0: p.clientY, t, on: 0, dy: 0, h: t.el.offsetHeight || innerHeight, vy: 0, py: p.clientY, pt: Date.now(), also: [], bk: null };
}, { passive: true });
sheetHost.addEventListener('touchmove', e => {
  const d = drop;
  if (!d)
    return;
  const p = [...e.touches].find(x => x.identifier == d.id);
  if (!p)
    return;
  const dx = p.clientX - d.x0;
  const dy = p.clientY - d.y0;
  if (!d.on) {
    /* hacia arriba, o si la ventana ya se ha desplazado: es un desplazamiento normal */
    if (dy < 0 || d.t.el.scrollTop > 0) {
      drop = null;
      return;
    }
    /* de lado, de momento: aún no es nuestro (y si se aleja de lado, ya no lo será) */
    if (dy == 0) {
      if (Math.abs(dx) >= 10)
        drop = null;
      return;
    }
    /* arriba del todo, bajar el dedo solo haría rebotar la ventana o mover lo de detrás: se cancela desde el primer movimiento,
       que es cuando el navegador decide si se desplaza */
    if (e.cancelable)
      e.preventDefault();
    if (Math.abs(dx) < 10 && dy < 10)
      return;
    /* más de lado que hacia abajo: es el de volver (el de arriba) o un toque que se ha movido */
    if (dy < Math.abs(dx) * 1.2) {
      drop = null;
      return;
    }
    d.on = 1;
    document.documentElement.classList.add('sliding');
    d.also = [...document.querySelectorAll('#sh > .sticky-btn')];
    d.bk = $('#sh .backdrop');
    [d.t.el, ...d.also].forEach(x => {
      x.style.transition = 'none';
      x.style.willChange = 'transform';
    });
  }
  if (e.cancelable)
    e.preventDefault();
  /* velocidad (px/ms), suavizada: un gesto rápido cierra aunque sea corto */
  const now = Date.now();
  if (now > d.pt) {
    d.vy = .6 * ((p.clientY - d.py) / (now - d.pt)) + .4 * d.vy;
    d.py = p.clientY;
    d.pt = now;
  }
  d.dy = Math.max(0, dy);
  dropMove(d, d.dy);
}, { passive: false });
sheetHost.addEventListener('touchend', e => {
  if (drop && ![...e.touches].some(x => x.identifier == drop.id))
    dropStop(1);
}, { passive: true });
sheetHost.addEventListener('touchcancel', () => dropStop(0), { passive: true });
