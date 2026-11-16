/* ═══ core/back ═══
   «Atrás» (F-37, F-39). backTarget dice qué cerraría «atrás» ahora mismo, de lo de más arriba a lo de más abajo: el aviso de
   versión, una ventana de aviso, el recorrido, el menú de nivel, el temporizador de WOD, el menú lateral, la página o ventana
   abierta (con su «←» o su «Cerrar»), Overview y Evolución del peso; en las pestañas que no son Workout, volver a Workout.
   Lo usan deslizar para volver (core/swipe) y el botón o gesto atrás del sistema (Android, o el botón atrás del navegador):
   mientras hay algo que cerrar, la página tiene una entrada de más en el historial; al volver atrás, en vez de salir de la app
   se cierra lo de arriba. Desde Workout sale de la app, como siempre. Durante un entreno no se sale: lo avisa.
   En iPhone y iPad esa entrada no se pone (HISTORY_GUARD, I-20): no tienen botón atrás y, con ella, su gesto «atrás» (deslizar
   desde el borde izquierdo) enseña una pantalla vacía —en negro con el tema oscuro— antes de volver. Sin ella, ese gesto no hace
   nada y el dedo le llega a la app, que desliza la página (core/swipe).
   Define: backTarget, HISTORY_GUARD, guarded, skipPops, backSync
*/
import { $ } from './util.js';
import { deviceOS } from './platform.js';
import { logError } from './errors.js';
import { A } from './registry.js';
import { overviewMode, S, W, weightView } from './state.js';
import { toast } from './toast.js';
/** { k: tipo, go: lo que hace «atrás», el: lo que se mueve al deslizar (solo en lo que se cierra deslizando) }, o null. */
export const backTarget = () => {
  if ($('#lgw'))
    return null;
  /* la bienvenida de una cuenta nueva no se cierra: sus datos son obligatorios (system/welcome) */
  if ($('#wlc'))
    return { k: 'aviso', go: () => {
      } };
  if ($('#upd'))
    return { k: 'aviso', go: () => A.updateLater() };
  if ($('#dg').firstChild)
    return { k: 'aviso', go: () => $('#dg').innerHTML = '' };
  if ($('#tour'))
    return { k: 'recorrido', go: () => A.tourSkip() };
  if ($('.lvb'))
    return { k: 'aviso', go: () => A.levelMenuClose() };
  if ($('#f2w'))
    return { k: 'wod', go: () => A.wodExit() };
  const m = $('#mn .msd');
  if (m && !m.classList.contains('out'))
    return { k: 'menu', el: m, go: () => A.closeMenu() };
  const p = $('#sh .sp');
  if (p) {
    /* el botón de volver de la página: el que lleva un paso atrás dentro de ella (data-back: «‹ Rutinas», «‹ Grupos»), que
       puede preguntar si se guardan los cambios, o su «←» (o «Cerrar»); sin ninguno, se cierra la hoja */
    const b = p.querySelector('[data-back]') || p.querySelector('[aria-label="Volver"],[aria-label="Cerrar"]');
    return { k: 'hoja', el: p, go: () => b && A[b.dataset.a] ? A[b.dataset.a](+b.dataset.i, b) : A.closeSheet() };
  }
  if (W)
    return { k: 'entreno', go: () => toast('El entreno sigue en marcha. Para salir, usa «Salir y descartar» o «Log out»') };
  if (overviewMode)
    return { k: 'página', el: $('#app'), go: () => A.overviewBack() };
  if (weightView && S.tab == 2)
    return { k: 'página', el: $('#app'), go: () => A.weightBack() };
  if (S.tab)
    return { k: 'pestaña', go: () => A.selectTab(0) };
  return null;
};
/* al moverse por el historial, el navegador no debe recolocar el desplazamiento de la página */
try {
  history.scrollRestoration = 'manual';
}
catch (e) {
  /* navegador sin esta opción */
}
/* la entrada de más del historial solo hace falta donde hay botón o gesto «atrás» que la app pueda atender: en iOS, no */
const HISTORY_GUARD = deviceOS() != 'ios';
/* 1 si la entrada de más del historial es la de ahora */
let guarded = false;
/* tras recargar estando en la entrada de más (al actualizar, restaurar una copia…), esa entrada pasa a ser la normal: volver a
   una de antes de recargar puede abrir la página otra vez en algunos navegadores */
try {
  if (history.state && history.state.sf)
    history.replaceState(null, '');
}
catch (e) {
  logError('historial (atrás)', e);
}
/* vueltas atrás que ha hecho la propia app (su popstate no es del usuario) */
let skipPops = 0;
/** Pone o quita la entrada de más del historial según haya algo que cerrar. */
const backSync = () => {
  if (skipPops)
    return;
  const need = !!backTarget();
  try {
    if (need && !guarded) {
      history.pushState({ sf: 1 }, '');
      guarded = true;
    }
    else if (!need && guarded) {
      guarded = false;
      skipPops++;
      history.back();
    }
  }
  catch (e) {
    logError('historial (atrás)', e);
  }
};
if (HISTORY_GUARD) {
  window.addEventListener('popstate', () => {
    if (skipPops) {
      skipPops--;
      backSync();
      return;
    }
    /* el usuario ha vuelto atrás: se ha ido la entrada de más; se cierra lo de arriba y, si queda algo, vuelve a ponerse */
    guarded = false;
    const t = backTarget();
    try {
      if (t)
        t.go();
    }
    catch (e) {
      logError('atrás', e);
    }
    backSync();
  });
  /* cada vez que se abre o se cierra algo (pantalla, hoja, ventana, menú, recorrido…), se revisa */
  if (typeof MutationObserver != 'undefined') {
    const mo = new MutationObserver(backSync);
    ['#app', '#sh', '#dg', '#mn'].forEach(s => $(s) && mo.observe($(s), { childList: true }));
    mo.observe(document.body, { childList: true });
  }
}
