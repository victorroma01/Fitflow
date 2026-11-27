/* ═══ core/boot ═══
   Arranque: lee de IndexedDB los entrenos, el historial y las comidas (core/persist, I-04), deja válido el estado
   (core/repair), recupera el entreno en curso, pinta la app (o el inicio de sesión, si no hay cuenta o le falta aceptar las
   condiciones: account/login) y, con sesión y lo aceptado al día, empieza a sincronizar con Firebase (cloud/sync). Si esos datos no se pudieron leer, no se guarda ni se sincroniza
   nada (con la mitad de los datos, la nube creería que se borró el resto) y se avisa, con «Reintentar» y, con sesión, «Bajar
   de mi cuenta». window.__ffready se cumple al terminar el arranque; window.__ffok vale 1 desde el primer pintado.
   También decide qué pasa si la app está abierta dos veces y la otra guarda después: esta se recarga (onInstanceStale).
   Define: RESTORE_HINT, lostDialog, staleWaiting, staleDialog, watchSheet, startClocks, tidyLeftovers, recoverWorkout, restoreNotice, afterFirstPaint, start, language  · acciones/registros: 4
*/
import { say } from './i18n.js';
import { $, fmtDuration, fmtMinSec, LANG, roundInt } from './util.js';
import { startEnglish } from './i18n.js';
import { Store } from './store.js';
import { logError, setErrorNotice } from './errors.js';
import { toast } from './toast.js';
import { loadEnglish } from './lazy.js';
import { dropSavedState, loadParts, onInstanceStale, partsLost, reloadApp, savedByPredecessor, stateRecovered } from './persist.js';
import { A } from './registry.js';
import { applyTheme, S, saveState, W } from './state.js';
import { confirmDialog, dialog } from './ui.js';
import { R } from './render.js';
import { restorePlanBackup } from '../routines/builder.js';
import { pendingResume, setPendingResume, WIP_KEY } from '../workout/resume.js';
import { keepAwake } from '../workout/wake.js';
import { restEnded } from '../workout/session.js';
import { checkWeighIn } from '../dashboard/reminder.js';
import { applyAccent } from '../profile/appearance.js';
import { beep, buzz } from '../profile/feedback.js';
import { isStandalone } from '../system/files.js';
import { plural } from '../system/backup.js';
import { startSnapshots } from '../system/snapshots.js';
import { showWhatsNew, whatsNewDue } from '../system/updates.js';
import { checkAchievements } from '../extras/achievements.js';
import { html, raw } from './html.js';
import { applyStartTab, buildTabbar } from './tabbar.js';
import { launchAction } from '../system/phone.js';
import { tourCheck } from '../system/tour.js';
import { iconNoticeCheck } from '../system/iconnotice.js';
import { cleanDay, repairState } from './repair.js';
import { signedIn } from '../cloud/session.js';
import { consentPending } from '../cloud/consent.js';
import { deletedNotice } from '../account/privacy.js';
import { startSync, stopSync } from '../cloud/sync.js';
import { keepStorage, spaceCheck } from '../system/space.js';
import { idbDrop } from './idb.js';
/* los datos de este móvil no se pudieron leer (core/persist: partsLost): nada se guarda ni se sincroniza hasta que se lean */
/* cómo recuperar los datos, en los avisos de datos dañados */
const RESTORE_HINT = 'Si tienes una copia de seguridad o una copia automática, restáurala desde Perfil → Ajustes → Copia de seguridad.';
const lostDialog = () => dialog('No se pudieron leer tus datos', say `Tus entrenos y comidas de este móvil no se han podido leer. Para no perder nada, la app no guardará ni sincronizará hasta que se puedan leer: prueba a cerrarla y abrirla de nuevo.${signedIn() ? ' Si sigue igual, puedes bajar otra vez los datos de tu cuenta (lo que no se hubiera sincronizado se perderá).' : ''}`, signedIn() ? [['Bajar de mi cuenta', 'partsFromCloudAsk', ''], ['Reintentar', 'partsRetry', 'primary']] : [['Reintentar', 'partsRetry', 'primary']]);
A.partsRetry = () => location.reload();
A.partsFromCloudAsk = () => confirmDialog('¿Bajar los datos de tu cuenta?', 'Se borran los datos de este móvil y se bajan otra vez los de tu cuenta. Lo que no se hubiera sincronizado se perderá.', 'partsFromCloud', 'Bajar');
/* sin la sincronización de antes, la nube no ve lo de este móvil como borrado: se baja todo de nuevo */
A.partsFromCloud = () => {
  try {
    Store.del(Store.K.sync);
    dropSavedState();
  }
  catch (e) {
    logError('bajar de la cuenta', e);
  }
  reloadApp();
};
/* La app está abierta también en otra pestaña o ventana, que ha guardado después (core/persist: instanceStale): esta ya no
   guarda ni sincroniza, y hay que recargarla con lo último. Si no se estaba usando (no se ve, o se sabe justo al volver a
   ella), se recarga sola; si se está viendo, se dice con un aviso que tapa la app y solo se quita recargando (si se cierra
   de otra forma, con el gesto de volver, se recarga igual). El entreno en curso no se pierde: está guardado aparte
   (workout/resume) y, tras recargar, se ofrece reanudarlo.
   Si quien ha guardado después es la página anterior de esta misma pestaña (una recarga: la anterior termina su último
   guardado con esta ya abierta), no hay otra ventana: se recarga sola, sin aviso (core/persist, savedByPredecessor). */
let staleWaiting = 0;
let staleDialog = null;
onInstanceStale(arriving => {
  stopSync();
  if (document.visibilityState == 'hidden') {
    if (!staleWaiting)
      document.addEventListener('visibilitychange', () => document.visibilityState == 'hidden' || location.reload());
    staleWaiting = 1;
    return;
  }
  /* con el aviso puesto no hay nada más que hacer (esto se llama otra vez cada vez que algo intenta guardar) */
  if (staleDialog && staleDialog.isConnected)
    return;
  if (arriving || staleDialog || savedByPredecessor()) {
    location.reload();
    return;
  }
  dialog('La app está abierta en otra ventana', 'Se han guardado cambios desde otra pestaña o ventana de la app. Para no mezclar los datos, esta se recarga con lo último.', [['Recargar', 'staleReload', 'primary']]);
  staleDialog = $('#dg').firstChild;
  if (typeof MutationObserver != 'undefined')
    new MutationObserver(() => staleDialog.isConnected || location.reload()).observe($('#dg'), { childList: true });
});
A.staleReload = () => location.reload();
/* un error inesperado no se queda en silencio: se dice, y dónde contarlo si se repite (system/report) */
setErrorNotice(() => toast('Algo ha fallado. Si se repite, cuéntalo en Ajustes → Informar de un fallo.'));
/* al cerrarse la hoja (#sh se queda vacía), también se quita su clase */
const watchSheet = () => {
  if (typeof MutationObserver != 'undefined')
    new MutationObserver(() => {
      const s = $('#sh');
      if (!s.firstChild)
        s.className = '';
    }).observe($('#sh'), { childList: true });
};
/* Los relojes del entreno en curso, siempre en marcha (sin entreno no hacen nada). Cinco veces por segundo: el tiempo de la
   sesión (#tm) y la cuenta atrás del descanso (#rt), con sus pitidos en los tres últimos segundos y el aviso al acabar. Cuatro
   veces por segundo: la cuenta atrás del botón «Descanso» de la cabecera (#rt2). Y cada 2,5 s, la pantalla encendida si así
   se pidió (workout/wake). Solo cambian el texto que toca: la pantalla se vuelve a pintar (R) solo cuando el descanso se
   acaba. */
const startClocks = () => {
  setInterval(() => {
    if (!W || W.pausedAt)
      return;
    const m = $('#tm');
    if (m) {
      const tx = fmtDuration(roundInt((Date.now() - W.startedAt) / 1e3));
      if (m.textContent !== tx)
        m.textContent = tx;
    }
    if (W.restEndsAt) {
      const l = Math.ceil((W.restEndsAt - Date.now()) / 1e3);
      if (l <= 0) {
        const late = Date.now() - W.restEndsAt > 4000;
        W.restEndsAt = 0;
        W.lastBeep = 0;
        if (!late) {
          buzz([180, 70, 180]);
          beep(1);
        }
        R();
        restEnded();
      }
      else {
        if (l <= 3 && W.lastBeep !== l) {
          W.lastBeep = l;
          beep(0);
        }
        const r = $('#rt');
        if (r) {
          const tx = fmtMinSec(l);
          if (r.textContent !== tx)
            r.textContent = tx;
        }
      }
    }
  }, 200);
  setInterval(() => {
    if (!W || W.pausedAt || !W.restEndsAt)
      return;
    const r = $('#rt2');
    if (r) {
      const tx = fmtMinSec(Math.max(0, Math.ceil((W.restEndsAt - Date.now()) / 1000)));
      if (r.textContent !== tx)
        r.textContent = tx;
    }
  }, 250);
  setInterval(keepAwake, 2500);
};
/* lo que quedó a medias al cerrarse la app: el día de un workout propio puesto sobre el plan, un workout sin bloques y las
   portadas de días que no son propios */
const tidyLeftovers = () => {
  restorePlanBackup();
  /* un workout propio sin bloques es uno que se empezó a crear y se dejó a medias (cerrando la app): no se queda en la lista */
  S.routines = S.routines.filter(r => r.bl.length);
  S.plan.forEach(d => {
    if (!d.cu && d.img)
      delete d.img;
  });
};
/* el entreno que estaba en marcha al cerrarse la app (workout/resume): si vale, se ofrece reanudarlo; si no, se descarta */
const recoverWorkout = () => {
  try {
    setPendingResume(JSON.parse(Store.get(WIP_KEY)));
  }
  catch (e) {
    setPendingResume(null);
  }
  (() => {
    const z = pendingResume;
    /* el entreno a medias vale si está entero y es de las últimas 24 h. Si el día del plan ha cambiado desde entonces, se
       reanuda con los ejercicios con los que se empezó (workout/resume) */
    const ok = !!(z && z.W && z.d && typeof z.d.n == 'string' && Array.isArray(z.d.ex) && z.d.ex.every(e => e && typeof e.n == 'string') && Array.isArray(z.W.x) && z.W.x.every(Array.isArray) && Date.now() - z.t < 864e5 && z.W.x.length == z.d.ex.length);
    /* y su día, con cada dato del tipo que toca (puede venir de una copia de seguridad) */
    if (ok)
      cleanDay(z.d);
    if (!ok) {
      setPendingResume(null);
      try {
        Store.del(WIP_KEY);
      }
      catch (e) {
        logError('arranque: descartar entreno en curso', e);
      }
    }
  })();
};
/* tras restaurar una copia (system/backup), el resumen de lo restaurado, una vez */
const restoreNotice = () => {
  try {
    const q = Store.get(Store.K.rs);
    if (q) {
      Store.del(Store.K.rs);
      const o = JSON.parse(q);
      setTimeout(() => {
        try {
          dialog(o.u ? 'Datos recuperados' : 'Copia restaurada', html`
            <div class="d-grid gap-6 ta-l">${(o.s || []).map(x => html`<div>· ${x}</div>`)}</div>
            ${o.f ? html`
              <div class="mt-10">Se descartaron ${raw(plural(o.f, 'elemento dañado', 'elementos dañados'))} de la copia.</div>` : ''}
          `, [['Entendido', 'doNothing', 'primary']]);
        }
        catch (e) {
          logError('arranque: aviso de restauración', e);
        }
      }, 700);
    }
  }
  catch (e) {
    logError('arranque: resumen de restauración', e);
  }
};
/* Después del primer pintado: los avisos de datos dañados, guardar lo que el arranque arregló y, con sesión, las copias
   automáticas, las novedades, los avisos que esperan a que la app esté libre y la sincronización. */
const afterFirstPaint = () => {
  /* después del primer render: aviso de datos dañados, copia automática del día y almacenamiento persistente */
  if (stateRecovered == 1)
    setTimeout(() => dialog('No se pudieron leer tus datos', say `Estaban dañados. Se ha guardado una copia aparte para no perderlos: en Perfil → Ajustes → Diagnóstico puedes descargarla. ${S.logs.length || Object.keys(S.meals).length ? 'Tus entrenos y comidas se han podido conservar. ' : ''}${RESTORE_HINT}`, [['Entendido', 'doNothing', 'primary']]), 600);
  else if (stateRecovered == 2)
    setTimeout(() => dialog('No se pudo leer una parte de tus datos', say `Algunos registros estaban dañados y se han apartado; el resto de tus datos está intacto. En Perfil → Ajustes → Diagnóstico puedes descargar lo apartado. ${RESTORE_HINT}`, [['Entendido', 'doNothing', 'primary']]), 600);
  /* lo arreglado al arrancar se guarda (solo se escribe lo que cambió: core/persist) */
  setTimeout(saveState, 1000);
  /* sin la aceptación de las condiciones y el consentimiento (cloud/consent) solo se ve la pantalla que los pide: nada de esto */
  if (signedIn() && !consentPending()) {
    startSnapshots();
    if (whatsNewDue())
      setTimeout(showWhatsNew, 900);
    /* «Día de pesarse» (F-25), tras las novedades: si estas salen, el aviso espera a la próxima vez que se vuelva a la app */
    setTimeout(checkWeighIn, 1600);
    startSync();
    /* recorrido de la primera vez (F-36): cuando la app esté libre y tras la primera sincronización */
    setTimeout(tourCheck, 2500);
    /* el aviso del icono nuevo en un iPhone que aún tiene el de antes (F-48), también cuando la app esté libre */
    setTimeout(iconNoticeCheck, 3000);
  }
  /* pide al navegador que no borre los datos de la app instalada cuando falte espacio (sin efecto si no lo admite) */
  if (isStandalone())
    keepStorage();
  /* aviso de espacio (I-04): si lo guardado se acerca al límite del navegador, cuando la app esté libre */
  setTimeout(spaceCheck, 6000);
};
/* El arranque, en orden: el estado, válido y con su tema; los relojes; lo que quedó a medias; el primer pintado; y lo de
   después. window.__ffok vale 1 desde ese primer pintado. */
const start = () => {
  repairState();
  applyTheme();
  applyAccent();
  watchSheet();
  startClocks();
  tidyLeftovers();
  recoverWorkout();
  restoreNotice();
  /* las fotos de progreso de la serie de prueba ya no existen (sin datos personales: F-35) */
  try {
    idbDrop('ffph');
  }
  catch (e) {
    logError('arranque: borrar fotos de progreso', e);
  }
  if (signedIn() && !consentPending())
    setTimeout(checkAchievements, 2500);
  buildTabbar();
  /* la pestaña elegida para abrir la app (Ajustes) y, si se abrió desde un acceso directo del icono, su pantalla */
  applyStartTab();
  launchAction();
  R();
  window.__ffok = 1;
  /* recién eliminada la cuenta en este dispositivo (account/privacy), se dice */
  deletedNotice();
  /* sin los datos de este móvil, solo el aviso: ni guardar, ni sincronizar, ni copias, ni otros avisos */
  if (partsLost) {
    lostDialog();
    return;
  }
  afterFirstPaint();
};
/* en inglés, el diccionario (core/i18n), que se descarga mientras se leen los datos. Si no llega (sin conexión y sin tenerlo
   guardado), la app abre en español */
const language = LANG == 'en' ? loadEnglish().then(startEnglish).catch(e => {
  logError('arranque: el inglés', e);
  document.documentElement.lang = 'es';
}) : null;
/* primero, las partes del estado (IndexedDB) y el idioma; después, el arranque. Un fallo antes del primer pintado enseña la
   pantalla de error de index.html al momento */
window.__ffready = loadParts(S).catch(e => logError('arranque: leer los datos', e)).then(() => language).then(start).catch(e => {
  logError('arranque', e);
  if (!window.__ffok && window.__ffe)
    window.__ffe(String(e && (e.stack || e.message) || e));
});
