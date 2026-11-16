/* ═══ system/iconnotice ═══
   Aviso del icono nuevo en el iPhone (F-48, V1.0.2). El iPhone fija el icono de la pantalla de inicio al añadir la app y no lo
   cambia después, así que quien la instaló antes de la V1.0.1 sigue con el icono de antes del logo nuevo (F-40). Solo en la app
   instalada en un iPhone y solo si empezó con una versión anterior a la 1.0.1 (Store.K.inst, que anota system/updates), una
   ventana con el icono nuevo explica cómo cambiarlo: comprobar que todo está sincronizado (con el estado en la propia ventana y
   «Sincronizar ahora»), quitar la app de la pantalla de inicio y volver a añadirla desde Safari. Sale una vez, cuando la app está
   libre; «Más tarde» la deja para la próxima vez que se abra la app y «Entendido» la da por vista (Store.K.icon). Se puede volver
   a ver en Ajustes → App → El icono nuevo (profile/settings), mientras el iPhone tenga el icono de antes. Al reinstalarla, el iPhone empieza de cero con la versión de ese momento, así que ya no sale. En
   Android, Chrome cambia el icono solo.
   Define: iconNoticeApplies, iconSyncInfo, iconNoticeBody, iconTries, iconNoticeCheck  · acciones/registros: 3
*/
import { $ } from '../core/util.js';
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { appBusy, sheet } from '../core/ui.js';
import { html } from '../core/html.js';
import { deviceOS } from '../core/platform.js';
import { BRAND_LOGOS } from '../data/photos.js';
import { isStandalone } from './files.js';
import { isNewerVersion } from './updates.js';
import { account, signedIn } from '../cloud/session.js';
import { pendingDocs, syncBusy, syncLine, syncNow, syncState } from '../cloud/sync.js';
/** ¿Tiene este móvil el icono de antes? En la app instalada en un iPhone que empezó con una versión anterior a la 1.0.1. */
export const iconNoticeApplies = () => {
  try {
    const v = Store.get(Store.K.inst);
    return deviceOS() == 'ios' && isStandalone() && !!v && isNewerVersion('1.0.1', v);
  }
  catch (e) {
    logError('aviso del icono nuevo', e);
    return false;
  }
};
/* el estado de la sincronización para el primer paso: [todo subido, qué decir] */
const iconSyncInfo = () => {
  if (!account)
    return [false, 'No has entrado con tu usuario: entra antes de quitar la app.'];
  const st = syncState().st;
  if (account.x || st == 'dead')
    return [false, 'La sesión ha caducado: vuelve a entrar en Ajustes → Cuenta para subir tus datos.'];
  if (st == 'run' || st == 'idle')
    return [false, 'Sincronizando… espera un momento.'];
  let n = 1;
  try {
    n = pendingDocs();
  }
  catch (e) {
    logError('aviso del icono nuevo: cambios por subir', e);
  }
  return n || st != 'ok' ? [false, 'Quedan cambios por subir (' + syncLine() + '). Espera a tener conexión antes de quitar la app.'] : [true, 'Todo está sincronizado (' + syncLine() + ').'];
};
/** La explicación con los pasos. withButtons: con «Más tarde» y «Entendido» (la ventana que sale sola); sin ellos, la página de
    Ajustes → App → El icono nuevo. */
export const iconNoticeBody = withButtons => {
  const [ok, txt] = iconSyncInfo();
  const url = location.host + location.pathname.replace(/index\.html$/, '');
  const syncStep = html`<li><b>Comprueba que todo está sincronizado.</b><span class="icst ${ok ? 'ok' : 'bad'}" role="status">${txt}</span>${ok ? '' : html`<button data-a="iconNoticeSync">Sincronizar ahora</button>`}</li>`;
  const removeStep = html`<li><b>Quita la app de la pantalla de inicio:</b> mantén pulsado su icono y toca «Eliminar marcador» o «Eliminar app», según tu versión de iOS. Al quitarla, el iPhone borra lo guardado en ella: hazlo solo con todo sincronizado.</li>`;
  const addStep = html`<li><b>Vuelve a añadirla desde Safari:</b> abre ${url}, toca Compartir y luego «Añadir a pantalla de inicio».</li>`;
  const openStep = html`<li><b>Ábrela desde el icono nuevo y entra con tu usuario.</b> Los ajustes que son solo de este móvil, como el globo del icono, se eligen otra vez.</li>`;
  const buttons = withButtons ? html`<div class="g2"><button data-a="iconNoticeLater">Más tarde</button><button class="pr" data-a="iconNoticeDone">Entendido</button></div>` : '';
  return html`<div class="icnw"><img class="brl icn" src="${BRAND_LOGOS.claro}" alt="El icono nuevo de StrataFit">${withButtons ? html`<h3>El icono nuevo de StrataFit</h3>` : ''}<p class="mu">StrataFit tiene un logo nuevo, pero el iPhone no cambia el icono de una app que ya estaba en la pantalla de inicio. Para verlo hay que volver a añadirla. Tus datos están en la nube y vuelven al entrar.</p><ol class="icns">${syncStep}${removeStep}${addStep}${openStep}</ol>${buttons}</div>`;
};
/* intentos de enseñarla mientras la app está ocupada (un segundo cada uno) */
let iconTries = 0;
/** Al arrancar (core/boot): la enseña si toca y aún no se dio por vista, cuando la app esté libre. */
export const iconNoticeCheck = () => {
  try {
    if (!signedIn() || !iconNoticeApplies() || Store.get(Store.K.icon) == '1')
      return;
  }
  catch (e) {
    logError('aviso del icono nuevo', e);
    return;
  }
  /* con algo delante (un entreno, una ventana, la bienvenida, el recorrido, el WOD…) o aún sincronizando, espera */
  if (appBusy() || syncBusy()) {
    if (++iconTries < 120)
      setTimeout(iconNoticeCheck, 1000);
    return;
  }
  sheet(iconNoticeBody(1));
};
/* — manejadores de esta función (registros A / C / U) — */
/* «Sincronizar ahora»: al acabar, la explicación enseña el estado nuevo */
A.iconNoticeSync = async (i, b) => {
  if (b) {
    b.disabled = true;
    b.textContent = 'Sincronizando…';
  }
  await syncNow();
  const e = $('#sh .icnw');
  if (e)
    e.outerHTML = iconNoticeBody(!!e.querySelector('[data-a=iconNoticeDone]'));
};
A.iconNoticeLater = () => sheet();
A.iconNoticeDone = () => {
  try {
    Store.set(Store.K.icon, '1');
  }
  catch (e) {
    logError('aviso del icono nuevo visto', e);
  }
  sheet();
};
