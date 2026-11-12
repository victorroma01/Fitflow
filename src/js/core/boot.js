/* ═══ core/boot ═══
   Arranque: lee de IndexedDB los entrenos, el historial y las comidas (core/persist, I-04), deja válido el estado
   (core/repair), recupera el entreno en curso, pinta la app (o el inicio de sesión, si no hay cuenta: account/login) y, con
   sesión, empieza a sincronizar con Firebase (cloud/sync). Si esos datos no se pudieron leer, no se guarda ni se sincroniza
   nada (con la mitad de los datos, la nube creería que se borró el resto) y se avisa, con «Reintentar» y, con sesión, «Bajar
   de mi cuenta». window.__ffready se cumple al terminar el arranque; window.__ffok vale 1 desde el primer pintado.
   Define: lostDialog, start  · acciones/registros: 3
*/
import { $, fmtDuration, fmtMinSec, roundInt } from './util.js';
import { Store } from './store.js';
import { logError } from './errors.js';
import { dropSavedState, loadParts, partsLost, reloadApp, stateRecovered } from './persist.js';
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
import { takeSnapshot } from '../system/snapshots.js';
import { showWhatsNew, whatsNewDue } from '../system/updates.js';
import { checkAchievements } from '../extras/achievements.js';
import { html, raw } from './html.js';
import { applyStartTab, buildTabbar } from './tabbar.js';
import { launchAction } from '../system/phone.js';
import { tourCheck } from '../system/tour.js';
import { iconNoticeCheck } from '../system/iconnotice.js';
import { repairState } from './repair.js';
import { signedIn } from '../cloud/session.js';
import { startSync } from '../cloud/sync.js';
import { spaceCheck } from '../system/space.js';
/* los datos de este móvil no se pudieron leer (core/persist: partsLost): nada se guarda ni se sincroniza hasta que se lean */
const lostDialog = () => dialog('No se pudieron leer tus datos', 'Tus entrenos y comidas de este móvil no se han podido leer. Para no perder nada, la app no guardará ni sincronizará hasta que se puedan leer: prueba a cerrarla y abrirla de nuevo.' + (signedIn() ? ' Si sigue igual, puedes bajar otra vez los datos de tu cuenta (lo que no se hubiera sincronizado se perderá).' : ''), signedIn() ? [['Bajar de mi cuenta', 'partsFromCloudAsk', ''], ['Reintentar', 'partsRetry', 'pr']] : [['Reintentar', 'partsRetry', 'pr']]);
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
const start = () => {
  repairState();
  applyTheme();
  applyAccent();
  if (typeof MutationObserver != 'undefined')
    new MutationObserver(() => {
      const s = $('#sh');
      if (!s.firstChild)
        s.className = '';
    }).observe($('#sh'), { childList: true });
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
  restorePlanBackup();
  S.plan.forEach(d => {
    if (!d.cu && d.img)
      delete d.img;
  });
  try {
    setPendingResume(JSON.parse(Store.get(WIP_KEY)));
  }
  catch (e) {
    setPendingResume(null);
  }
  (() => {
    const z = pendingResume;
    let ok = !!(z && z.W && z.d && Array.isArray(z.W.x) && Date.now() - z.t < 864e5 && z.W.x.length == z.d.ex.length);
    if (ok && !z.pb) {
      const c = S.plan[z.sel];
      ok = !!c && c.ex.length == z.d.ex.length && c.ex.every((x, i) => x.n == z.d.ex[i].n);
    }
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
  try {
    const q = Store.get(Store.K.rs);
    if (q) {
      Store.del(Store.K.rs);
      const o = JSON.parse(q);
      setTimeout(() => {
        try {
          dialog(o.u ? 'Datos recuperados' : 'Copia restaurada', html`<div style="display:grid;gap:6px;text-align:left">${(o.s || []).map(x => html`<div>· ${x}</div>`)}</div>${o.f ? html`<div style="margin-top:10px">Se descartaron ${raw(plural(o.f, 'elemento dañado', 'elementos dañados'))} de la copia.</div>` : ''}`, [['Entendido', 'doNothing', 'pr']]);
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
  /* las fotos de progreso de la serie de prueba ya no existen (sin datos personales: F-35) */
  try {
    indexedDB.deleteDatabase('ffph');
  }
  catch (e) {
    logError('arranque: borrar fotos de progreso', e);
  }
  if (signedIn())
    setTimeout(checkAchievements, 2500);
  buildTabbar();
  /* la pestaña elegida para abrir la app (Ajustes) y, si se abrió desde un acceso directo del icono, su pantalla */
  applyStartTab();
  launchAction();
  R();
  window.__ffok = 1;
  /* sin los datos de este móvil, solo el aviso: ni guardar, ni sincronizar, ni copias, ni otros avisos */
  if (partsLost) {
    lostDialog();
    return;
  }
  /* después del primer render: aviso de datos dañados, copia automática del día y almacenamiento persistente */
  if (stateRecovered == 1)
    setTimeout(() => dialog('No se pudieron leer tus datos', 'Estaban dañados. Se ha guardado una copia aparte para no perderlos: en Perfil → Ajustes → Diagnóstico puedes descargarla. ' + (S.logs.length || Object.keys(S.meals).length ? 'Tus entrenos y comidas se han podido conservar. ' : '') + 'Si tienes una copia de seguridad o una copia automática, restáurala desde Perfil → Ajustes → Copia de seguridad.', [['Entendido', 'doNothing', 'pr']]), 600);
  else if (stateRecovered == 2)
    setTimeout(() => dialog('No se pudo leer una parte de tus datos', 'Algunos registros estaban dañados y se han apartado; el resto de tus datos está intacto. En Perfil → Ajustes → Diagnóstico puedes descargar lo apartado. Si tienes una copia de seguridad o una copia automática, restáurala desde Perfil → Ajustes → Copia de seguridad.', [['Entendido', 'doNothing', 'pr']]), 600);
  /* lo arreglado al arrancar se guarda (solo se escribe lo que cambió: core/persist) */
  setTimeout(saveState, 1000);
  if (signedIn()) {
    setTimeout(() => takeSnapshot().catch(e => logError('copia automática', e)), 4000);
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
  if (isStandalone() && navigator.storage && navigator.storage.persist)
    navigator.storage.persisted().then(p => p || navigator.storage.persist()).catch(e => logError('almacenamiento persistente', e));
  /* aviso de espacio (I-04): si lo guardado se acerca al límite del navegador, cuando la app esté libre */
  setTimeout(spaceCheck, 6000);
};
/* primero, las partes del estado (IndexedDB); después, el arranque. Un fallo antes del primer pintado enseña la pantalla de
   error de index.html al momento */
window.__ffready = loadParts(S).catch(e => logError('arranque: leer los datos', e)).then(start).catch(e => {
  logError('arranque', e);
  if (!window.__ffok && window.__ffe)
    window.__ffe(String(e && (e.stack || e.message) || e));
});
