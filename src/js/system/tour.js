/* ═══ system/tour ═══
   Recorrido de la primera vez (F-36), como la simulación validada en M0. Al entrar por primera vez con una cuenta, una ventana
   pregunta si se quiere ver lo principal («Empezar el recorrido») u «Omitir». Son 5 pasos: cada uno ilumina una parte de la app
   (el entreno de hoy, la barra de pestañas, las comidas, el progreso y el perfil) con una tarjeta que la explica: «Paso N de 5»,
   puntos, «Omitir» y «Siguiente» («Terminar» en el último). Al final, «¡Listo!». En el paso de las pestañas se puede probar la
   barra (tocar o arrastrar la burbuja). Contestar la primera pregunta lo da por visto: S.tourSeen va en las preferencias de la cuenta
   (cloud/sync), así no vuelve a salir, tampoco en otro móvil. Se puede ver otra vez en Ajustes → Ver el recorrido.
   Sale cuando la app está libre: con la sesión iniciada, sin entreno en marcha, sin otra ventana abierta y con la primera
   sincronización hecha (puede traer que ya se vio en otro móvil).
   Define: TOUR_STEPS, tour, tourTries, tourRoot, tourSheet, tourShow, tourPlace, tourEnd, tourAfterWelcome, tourCheck  · acciones/registros: 5
*/
import { $ } from '../core/util.js';
import { A } from '../core/registry.js';
import { S, saveState, setOverviewMode, setWeightView } from '../core/state.js';
import { icon } from '../core/icons.js';
import { appBusy, sheet } from '../core/ui.js';
import { signedIn } from '../cloud/session.js';
import { syncBusy } from '../cloud/sync.js';
import { welcomeShow } from './welcome.js';
import { html, raw } from '../core/html.js';
/** Pasos: pestaña (-1: la que esté), qué se ilumina (alt: algo más pequeño si no cabe con la tarjeta, en un móvil pequeño),
  título y texto (rest: el texto si hoy es día de descanso; np: si aún no hay programa, I-24). */
const TOUR_STEPS = [{ tab: 0, el: () => $('#app .npc') || $('#app .cd.hero'), t: 'Tu entreno de hoy', p: 'Aquí está el día que toca. Pulsa «Empezar» y la app te guía serie a serie, con pesos sugeridos y descansos.', rest: 'Hoy toca descansar. Los días de entreno, aquí está el que toca: pulsa «Empezar» y la app te guía serie a serie, con pesos sugeridos y descansos.', np: 'Primero, elige tu programa con «Seleccionar programa». Después, aquí verás el día que toca: pulsa «Empezar» y la app te guía serie a serie, con pesos sugeridos y descansos.' }, { tab: -1, el: () => $('nav'), t: 'Cambia de pestaña', p: 'Toca una pestaña, o mantén pulsada la burbuja y arrástrala hasta otra.', live: 1 }, { tab: 1, el: () => ($('#app .mlb') || { closest: () => null }).closest('.cd'), alt: () => $('#app .mlb'), t: 'Anota lo que comes', p: '«+» añade un alimento, «Buscar» lo busca en internet y «Scan» lee el código de barras. La app sabe sola si hoy entrenas o descansas.' }, { tab: 2, el: () => $('#app .wkc'), t: 'Mira tu progreso', p: 'Tus entrenos, el volumen y las rachas, semana a semana.' }, { tab: 3, el: () => $('#app [data-a=openAchievements]'), t: 'Tu perfil', p: 'Logros, medidas y ajustes. En las páginas de dentro, desliza hacia la derecha para volver.' }];
/* recorrido abierto: { i: -1 la bienvenida, 0-4 los pasos, 5 «¡Listo!»; again: visto desde Ajustes; from: pestaña de antes } */
let tour = null;
/* intentos de sacarlo al arrancar, esperando a que la app esté libre (uno por segundo) */
let tourTries = 0;
const tourRoot = () => {
  let r = $('#tour');
  if (!r) {
    r = document.createElement('div');
    r.id = 'tour';
    document.body.appendChild(r);
  }
  return r;
};
/* la bienvenida y «¡Listo!»: una hoja como las de la app, que no se cierra tocando fuera */
const tourSheet = (ic, t, p, buttons) => html`<div class="bk"></div><div class="sp" role="dialog" aria-modal="true" aria-labelledby="trh"><div class="trw"><div class="trbg">${icon(ic, 30)}</div><h3 id="trh">${t}</h3><p class="mu">${p}</p>${raw(buttons)}</div></div>`;
/* pinta el punto del recorrido en el que se está */
const tourShow = () => {
  const r = tourRoot();
  const n = TOUR_STEPS.length;
  const i = tour.i;
  $('nav').classList.toggle('trlv', i >= 0 && i < n && !!TOUR_STEPS[i].live);
  if (i < 0) {
    r.className = 'trs';
    r.innerHTML = tourSheet('workout', 'Te damos la bienvenida a StrataFit', '¿Te enseñamos lo principal? Son 5 pasos y menos de un minuto.', '<button class="pr" data-a="tourStart">Empezar el recorrido</button><button data-a="tourSkip">Omitir</button>');
  }
  else if (i >= n) {
    r.className = 'trs';
    r.innerHTML = tourSheet('chk', '¡Listo!', tour.again ? 'Ya conoces lo principal. Puedes volver a verlo cuando quieras en Ajustes.' : 'Ya conoces lo principal. Este recorrido no vuelve a salir; si quieres verlo otra vez, está en Ajustes.', S.noProgram ? '<button class="pr" data-a="tourDone">Seleccionar programa</button>' : '<button class="pr" data-a="tourDone">Empezar a entrenar</button>');
  }
  else {
    const st = TOUR_STEPS[i];
    if (st.tab >= 0 && S.tab != st.tab) {
      A.selectTab(st.tab);
      /* al momento (la página se desplaza suave, y el foco se mide enseguida) */
      scrollTo({ top: 0, behavior: 'instant' });
    }
    const tx = st.np && $('#app .npc') ? st.np : st.rest && $('#app .cd.hero [data-a=completeRestDay]') ? st.rest : st.p;
    r.className = 'trp';
    r.innerHTML = html`<div class="trbk"></div><div class="trsp"></div><div class="trtp" role="dialog" aria-modal="true" aria-labelledby="trh"><i class="trar"></i><div class="trst">Paso ${i + 1} de ${n}</div><b id="trh">${st.t}</b><p>${tx}</p><div class="trft"><div class="trdt">${TOUR_STEPS.map((x, k) => html`<i class="${k == i ? 'on' : ''}"></i>`)}</div><button class="trsk" data-a="tourSkip">Omitir</button><button class="pr trnx" data-a="tourNext">${i == n - 1 ? 'Terminar' : 'Siguiente'}</button></div></div>`;
    tourPlace();
    /* por si algo de la página termina de colocarse después (una imagen) */
    setTimeout(tourPlace, 350);
  }
  const b = r.querySelector('button.pr');
  if (b)
    b.focus({ preventScroll: true });
};
/* coloca el foco sobre lo que explica el paso y la tarjeta debajo (o encima, si no cabe) con su flecha */
const tourPlace = () => {
  if (!tour || tour.i < 0 || tour.i >= TOUR_STEPS.length)
    return;
  const sp = $('#tour .trsp');
  const tp = $('#tour .trtp');
  const st = TOUR_STEPS[tour.i];
  let el = st.el() || $('#app .cd') || $('#app');
  if (!sp || !tp || !el)
    return;
  const pad = 6;
  /* arriba, lo que se queda pegado al desplazar (el resumen de macros de Nutrición) no debe taparlo */
  const top = [...$('#app').children].reduce((m, e) => {
    const c = getComputedStyle(e);
    return c.position == 'sticky' ? Math.max(m, (parseFloat(c.top) || 0) + e.offsetHeight + 12) : m;
  }, 64);
  /* si no caben a la vez lo iluminado y la tarjeta, se ilumina algo más pequeño (si el paso lo tiene) */
  if (st.alt && el.offsetHeight + 2 * pad + 14 + tp.offsetHeight > innerHeight - 24 - top)
    el = st.alt() || el;
  let r = el.getBoundingClientRect();
  /* que se vea entero: si queda tapado arriba o abajo, se desplaza la página */
  if (getComputedStyle(el).position != 'fixed' && (r.top < top || r.bottom > innerHeight - 120)) {
    scrollBy({ top: r.top - Math.max(top, innerHeight * .16), behavior: 'instant' });
    r = el.getBoundingClientRect();
  }
  const rad = (parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16) + pad;
  Object.assign(sp.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + 2 * pad + 'px', height: r.height + 2 * pad + 'px', borderRadius: rad + 'px' });
  const h = tp.offsetHeight;
  const below = r.bottom + pad + 14 + h < innerHeight - 24;
  tp.style.top = (below ? r.bottom + pad + 14 : Math.max(12, r.top - pad - 14 - h)) + 'px';
  tp.classList.toggle('up', !below);
  const tl = tp.getBoundingClientRect().left;
  const cx = Math.min(Math.max(r.left + r.width / 2, tl + 30), tl + tp.offsetWidth - 30);
  tp.querySelector('.trar').style.left = cx - tl - 7 + 'px';
};
/* cierra el recorrido; tab: la pestaña que se abre después (-1: la que esté) */
const tourEnd = tab => {
  tour = null;
  $('nav').classList.remove('trlv');
  const r = $('#tour');
  if (r)
    r.remove();
  if (tab >= 0 && S.tab != tab)
    A.selectTab(tab);
};
/* tras la bienvenida de una cuenta nueva, el recorrido empieza directamente por el primer paso (sin volver a dar la bienvenida) */
const tourAfterWelcome = () => {
  if (S.tourSeen)
    return;
  S.tourSeen = 1;
  saveState();
  tour = { i: 0, again: 0, from: 0 };
  tourShow();
};
/** Al arrancar: saca el recorrido si esta cuenta aún no lo ha visto, en cuanto la app esté libre. En una cuenta nueva, antes,
  la bienvenida con sus datos (S.welcomePending; system/welcome). */
export const tourCheck = () => {
  if (tour || S.tourSeen && !S.welcomePending || !signedIn())
    return;
  /* la app, ocupada (otra ventana, el entreno, el inicio de sesión…) o con la primera sincronización por hacer */
  if (appBusy() || syncBusy()) {
    if (++tourTries < 120)
      setTimeout(tourCheck, 1000);
    return;
  }
  setWeightView(0);
  setOverviewMode(0);
  if (S.welcomePending) {
    if (S.tab)
      A.selectTab(0);
    welcomeShow(tourAfterWelcome);
    return;
  }
  tour = { i: -1, again: 0, from: S.tab };
  tourShow();
};
/* al girar el móvil o si la página aún se estaba desplazando, el foco y la tarjeta se recolocan */
window.addEventListener('resize', tourPlace);
window.addEventListener('scroll', tourPlace, { passive: true });
/* — manejadores de esta función (registros A / C / U) — */
/* «Empezar el recorrido» */
A.tourStart = () => {
  if (!tour)
    return;
  S.tourSeen = 1;
  saveState();
  tour.i = 0;
  tourShow();
};
A.tourNext = () => {
  if (!tour)
    return;
  tour.i++;
  if (tour.i >= TOUR_STEPS.length && S.tab)
    A.selectTab(0);
  tourShow();
};
/* «Omitir» (también «atrás» del sistema): se da por visto y se vuelve a donde se estaba */
A.tourSkip = () => {
  if (!tour)
    return;
  if (!tour.again) {
    S.tourSeen = 1;
    saveState();
  }
  tourEnd(tour.i >= 0 && tour.i < TOUR_STEPS.length ? tour.from : -1);
};
/* «Empezar a entrenar» o, sin programa todavía, «Seleccionar programa»: a Programas */
A.tourDone = () => {
  tourEnd(0);
  if (S.noProgram)
    A.openPrograms();
};
/* Ajustes → Ver el recorrido: directo al primer paso */
A.tourReplay = () => {
  sheet();
  setWeightView(0);
  setOverviewMode(0);
  tour = { i: 0, again: 1, from: S.tab };
  tourShow();
};
