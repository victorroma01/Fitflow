/* ═══ core/render ═══
   Render principal R() y cambio de pestaña. Sin sesión, o sin la aceptación de las condiciones (cloud/consent), R() pinta el
   inicio de sesión (account/login).
   Define: lastTab, lastScreen, PAINT_KEEP, paintTimes, paintProbe, probePaint, paintSummary, R, fromY, jumpTo, openPage, closePage, screenBelow, paintPending, paintSoon  · acciones/registros: 1
*/
import { $ } from './util.js';
import { morph } from './morph.js';
import { applyStyles } from './dynstyle.js';
import { A } from './registry.js';
import { overviewMode, S, setOverviewMode, setWeekView, W, weightView } from './state.js';
import { workoutTab } from '../workout/day.js';
import { sessionView } from '../workout/session.js';
import { resumeSync, saveSession } from '../workout/resume.js';
import { overviewPage } from '../workout/overview.js';
import { deloadWeekSync } from '../workout/deload.js';
import { setLevelMenuOpen } from '../programs/levels.js';
import { nutritionTab } from '../nutrition/water.js';
import { dashboardTab } from '../dashboard/home.js';
import { weightPage } from '../dashboard/weight.js';
import { profileTab } from '../profile/home.js';
import { lookSync } from '../profile/appearance.js';
import { updatePopupSync } from '../system/updates.js';
import { settingsSync } from '../profile/settings.js';
import { account } from '../cloud/session.js';
import { consentPending } from '../cloud/consent.js';
import { loginSync } from '../account/login.js';
import { tabbarSync } from './tabbar.js';
let lastTab = -1;
/** Pantalla pintada en el último R() (pestaña, entreno, overview o peso). */
let lastScreen = '';
/* tiempo de pintado (Diagnóstico; I-18): lo que tarda en verse cada R(), desde que empieza hasta que el navegador ha pintado
   el resultado, en milisegundos. Las últimas PAINT_KEEP medidas; las de una app en segundo plano no cuentan */
const PAINT_KEEP = 40;
const paintTimes = [];
let paintProbe = 0;
const probePaint = t0 => {
  if (paintProbe || document.visibilityState == 'hidden')
    return;
  paintProbe = 1;
  requestAnimationFrame(() => setTimeout(() => {
    paintProbe = 0;
    const ms = performance.now() - t0;
    if (ms < 3000 && document.visibilityState != 'hidden') {
      paintTimes.push(ms);
      if (paintTimes.length > PAINT_KEEP)
        paintTimes.shift();
    }
  }, 0));
};
/** «media de X ms y máximo de Y ms en las últimas N pantallas», o '' si aún no hay medidas. */
export const paintSummary = () => {
  if (!paintTimes.length)
    return '';
  const avg = paintTimes.reduce((a, b) => a + b, 0) / paintTimes.length;
  return 'media de ' + Math.round(avg) + ' ms y máximo de ' + Math.round(Math.max(...paintTimes)) + ' ms en las últimas ' + paintTimes.length + ' pantallas';
};
export function R() {
  /* sin sesión (o con una contraseña temporal por cambiar, o sin la aceptación de las condiciones y el consentimiento), solo el
     inicio de sesión: account/login */
  if (!account || account.mc || consentPending()) {
    lastScreen = 'login';
    loginSync();
    return;
  }
  probePaint(performance.now());
  lookSync();
  deloadWeekSync();
  resumeSync();
  const od = [...document.querySelectorAll('#app details')].map(d => d.open);
  const screen = W ? 'entreno' : overviewMode ? 'overview' : weightView && S.tab == 2 ? 'peso' : 'pestaña ' + S.tab;
  const h = W ? sessionView() : overviewMode ? overviewPage() : weightView && S.tab == 2 ? weightPage() : [workoutTab, nutritionTab, dashboardTab, profileTab][S.tab]();
  /* en la misma pantalla solo cambia lo distinto (core/morph: se conservan el foco y el desplazamiento); otra pantalla se pinta de cero */
  if (screen == lastScreen)
    morph($('#app'), h);
  else {
    $('#app').innerHTML = h;
    applyStyles($('#app'));
  }
  lastScreen = screen;
  if (lastTab == S.tab)
    document.querySelectorAll('#app details').forEach((d, i) => d.open = !!od[i]);
  lastTab = S.tab;
  $('nav').style.display = W || overviewMode ? 'none' : 'flex';
  tabbarSync();
  saveSession();
  updatePopupSync();
  /* si hay una página de Ajustes abierta, que refleje el cambio (tema, color, unidades…) */
  settingsSync();
}
/* Las páginas que van en lugar de la pestaña: Overview (en Workout) y Evolución del peso (en Dashboard). Se abren arriba del
   todo y, al volver, la pestaña queda donde estaba: fromY es su desplazamiento al abrirlas */
let fromY = 0;
/* desplaza la página a y al momento: sin el desplazamiento suave de la página (css/20-visual-refresh), que al volver se vería
   correr la pestaña hasta su sitio */
const jumpTo = y => {
  const r = document.documentElement;
  r.style.scrollBehavior = 'auto';
  /* leerlo aplica el cambio ya: si no, el navegador desplazaría con lo de antes */
  getComputedStyle(r).scrollBehavior;
  scrollTo(0, y);
  r.style.scrollBehavior = '';
};
/** Abre una de esas páginas: `set` la pone (su modo en core/state). */
export const openPage = set => {
  fromY = scrollY;
  set();
  R();
  jumpTo(0);
};
/** Vuelve de esa página a su pestaña, al sitio donde estaba: `set` la quita. */
export const closePage = set => {
  set();
  R();
  jumpTo(fromY);
};
/** Lo que queda debajo mientras una de esas páginas se desliza con el dedo para volver (core/swipe): la pantalla a la que
    se vuelve tal como se verá, { h: su HTML, y: su desplazamiento, nav: si lleva la barra de pestañas, que en Overview no
    está }, o null. Desde Overview, Workout; desde Overview editando, el mismo Overview sin editar (volver sale de la edición);
    desde Evolución del peso, Dashboard (con su barra, que ya se ve). */
export const screenBelow = () => {
  if (W)
    return null;
  if (overviewMode) {
    const m = overviewMode;
    setOverviewMode(m == 2 ? 1 : 0);
    try {
      return m == 2 ? { h: overviewPage(), y: scrollY, nav: false } : { h: workoutTab(), y: fromY, nav: true };
    }
    finally {
      setOverviewMode(m);
    }
  }
  return weightView && S.tab == 2 ? { h: dashboardTab(), y: fromY, nav: false } : null;
};
/* R() en cuanto se haya pintado el fotograma en curso (varias peticiones seguidas, un solo R) */
let paintPending = 0;
const paintSoon = () => {
  if (paintPending)
    return;
  paintPending = 1;
  requestAnimationFrame(() => setTimeout(() => {
    paintPending = 0;
    R();
  }, 0));
};
A.selectTab = (i, b) => {
  setLevelMenuOpen(false);
  S.tab = i;
  setWeekView(0);
  /* desde la barra de pestañas, la burbuja sale ya hacia la pestaña y la pantalla se pinta justo después: así su deslizamiento
     no espera a la pantalla nueva (I-19) */
  if (b && b.closest && b.closest('nav')) {
    tabbarSync();
    paintSoon();
  }
  else
    R();
};
