/* ═══ system/phone ═══
   Más integración con el móvil (F-39), además de «atrás» (core/back) y de los gestos (core/swipe y core/tabbar):
   - Accesos directos del icono (en Android, al mantener pulsado el icono de la app; static/manifest.webmanifest): «Entreno de
     hoy», «Nutrición de hoy» y «Registrar el peso». Abren la app con ?a=…: aquí se va a esa pantalla y se quita de la dirección.
   - Globo en el icono de la app (opcional, en Ajustes → Sonido y avisos; donde el sistema lo permite: iPhone con iOS 16.4 o
     posterior, con la app en la pantalla de inicio, y ordenadores): al salir de la app enseña cuántas cosas quedan pendientes,
     el pesaje de hoy (F-25) y las respuestas nuevas a tus fallos y sugerencias (F-27). En iPhone pide permiso de avisos: sin él,
     el sistema no deja poner el globo. Es de este móvil (no se sincroniza).
   Define: LAUNCH, launchAction, badgeOk, badgeCount, badgeLast, badgeSync, badgeCard  · acciones/registros: 1
*/
import { logError } from '../core/errors.js';
import { A, C } from '../core/registry.js';
import { S, saveState, setNutriDayOffset, setWeightView, W } from '../core/state.js';
import { toast } from '../core/toast.js';
import { R } from '../core/render.js';
import { weighDue } from '../dashboard/reminder.js';
import { pendingResume } from '../workout/resume.js';
import { reportsUnseen } from './report.js';
import { signedIn } from '../cloud/session.js';
import { afterSync } from '../cloud/hooks.js';
import { html } from '../core/html.js';
/** Accesos directos: [?a=…, pestaña]. */
const LAUNCH = [['entreno', 0], ['comida', 1], ['peso', 2]];
/** Al arrancar, antes de pintar: la pantalla del acceso directo con que se abrió la app; la dirección queda limpia. */
export const launchAction = () => {
  try {
    const q = new URLSearchParams(location.search);
    const a = q.get('a');
    if (a == null)
      return;
    q.delete('a');
    const rest = q.toString();
    history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
    const t = LAUNCH.find(x => x[0] == a);
    if (!t || W)
      return;
    /* con un entreno a medias, Workout, para seguirlo */
    S.tab = pendingResume ? 0 : t[1];
    if (pendingResume)
      return;
    if (a == 'comida')
      setNutriDayOffset(0);
    setWeightView(a == 'peso' ? 1 : 0);
    /* «Entreno de hoy» sin programa elegido todavía (I-24): a Programas, en cuanto la app esté pintada */
    if (a == 'entreno' && S.noProgram)
      setTimeout(() => A.openPrograms(), 0);
  }
  catch (e) {
    logError('acceso directo', e);
  }
};
const badgeOk = () => typeof navigator.setAppBadge == 'function';
/** Lo pendiente: el pesaje de hoy y las respuestas sin ver. */
const badgeCount = () => signedIn() ? (weighDue() ? 1 : 0) + reportsUnseen() : 0;
/* lo último que se puso en el globo (-1: nada aún en esta apertura) */
let badgeLast = -1;
/** Pone (o quita) el globo del icono, si está activado. */
const badgeSync = () => {
  if (!badgeOk())
    return;
  const n = S.iconBadge ? badgeCount() : 0;
  if (n == badgeLast)
    return;
  badgeLast = n;
  try {
    (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {
      /* sin permiso del sistema: no hay globo */
    });
  }
  catch (e) {
    logError('globo del icono', e);
  }
};
/** Opción de Ajustes → Sonido y avisos (solo donde el sistema tiene globos). */
export const badgeCard = () => badgeOk() ? html`<label class="srk"><input type="checkbox" data-c="toggleBadge"${S.iconBadge ? ' checked' : ''}> Globo en el icono de la app</label><small class="mu" style="display:block;margin:-4px 0 8px">Al salir de la app, el icono enseña cuántas cosas tienes pendientes: el pesaje de hoy y las respuestas nuevas a tus fallos y sugerencias. En iPhone, la primera vez pide permiso de avisos.</small>` : '';
afterSync.push(badgeSync);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState == 'hidden')
    badgeSync();
});
/* — manejadores de esta función (registros A / C / U) — */
C.toggleBadge = async (e) => {
  if (!e.checked) {
    S.iconBadge = 0;
    saveState();
    badgeSync();
    R();
    return;
  }
  /* en iPhone, el globo necesita el permiso de avisos */
  let p = 'granted';
  try {
    if (typeof Notification != 'undefined' && Notification.permission != 'granted')
      p = await Notification.requestPermission();
  }
  catch (x) {
    p = 'granted';
  }
  if (p == 'denied') {
    e.checked = false;
    toast('El móvil no deja poner el globo: permite los avisos de StrataFit en los ajustes del sistema');
    return;
  }
  S.iconBadge = 1;
  saveState();
  badgeSync();
  R();
};
