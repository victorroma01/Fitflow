/* ═══ system/backup ═══
   Copias de seguridad, restauración y avisos.
   Define: pendingRestore, setPendingRestore, backupAge, BACKUP_FILE, BACKUP_FORMAT, countOf, plural, wipSession, backupRows, backupSummary, buildBackup, BACKUP_ERRORS, parseBackup, backupDate, askRestore, preRestore, preCopy, savePre, restoreBackup, backupFileCard, backupContents, backupText, backupSnapshots, isFreshInstall, restoreBanner, backupRowsFull  · acciones/registros: 8
*/
import { stateToStored } from '../core/schema.js';
import { cleanProfile, isPlan } from '../core/repair.js';
import { $, APPV, X } from '../core/util.js';
import { toast } from '../core/toast.js';
import { Store } from '../core/store.js';
import { logError } from '../core/errors.js';
import { asideGet, asideSet, lockSaves, reloadApp, replaceSavedState } from '../core/persist.js';
import { A, C } from '../core/registry.js';
import { flushState, S, saveState } from '../core/state.js';
import { confirmDialog, pgHead, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { WIP_KEY } from '../workout/resume.js';
import { downloadFile, readTextFile } from './files.js';
import { cloudBackupCard } from '../cloud/backup.js';
import { fillSnapshots } from './snapshots.js';
import { html, raw } from '../core/html.js';
export let pendingRestore = null;
/** Cambia `pendingRestore` desde otros módulos (pruebas: core/debug). */
export const setPendingRestore = v => {
  pendingRestore = v;
};
const backupAge = () => {
  if (!S.lastBackupDate)
    return 'Aún no has guardado ningún archivo.';
  const d = Math.floor((Date.now() - S.lastBackupDate) / 864e5);
  return 'Último archivo: ' + (d <= 0 ? 'hoy' : d == 1 ? 'ayer' : 'hace ' + d + ' días') + '.';
};
/** Nombre del archivo de copia (T-14): siempre el mismo, así cada copia sustituye a la anterior en el teléfono. */
const BACKUP_FILE = 'StrataFit-copia.json';
const BACKUP_FORMAT = 2;
export const countOf = x => Array.isArray(x) ? x.length : (x && typeof x == 'object' ? Object.keys(x).length : 0);
export const plural = (n, a, b) => n + ' ' + (n == 1 ? a : b);
const wipSession = () => {
  try {
    const z = JSON.parse(Store.get(WIP_KEY));
    if (z && z.W && z.d && Array.isArray(z.W.x) && z.d && Array.isArray(z.d.ex))
      return z;
  }
  catch (e) {
    logError('leer entreno en curso', e);
  }
  return null;
};
const backupRows = (s, wip) => {
  const it = Object.values(s.meals || {}).reduce((t, d) => t + (d && typeof d == 'object' ? Object.values(d).reduce((u, l) => u + (Array.isArray(l) ? l.length : 0), 0) : 0), 0);
  const dias = new Set((s.logs || []).map(l => l && l.d)).size;
  const training = plural(countOf(s.logs), 'entreno registrado', 'entrenos registrados') + (dias ? ' (' + plural(dias, 'día', 'días') + ')' : '');
  const weights = 'Historial de pesos de ' + plural(countOf(s.hist), 'ejercicio', 'ejercicios') + ' y ' + plural(countOf(s.pr), 'récord personal', 'récords personales');
  const bodyWeight = plural(countOf(s.wl), 'registro de peso corporal', 'registros de peso corporal');
  const food = 'Comidas de ' + plural(countOf(s.meals), 'día', 'días') + ' (' + plural(it, 'alimento anotado', 'alimentos anotados') + ') y agua de ' + plural(countOf(s.wt), 'día', 'días');
  const mine = plural(countOf(s.cf), 'alimento nuevo', 'alimentos nuevos') + ', ' + plural(countOf(s.lib), 'plato guardado', 'platos guardados') + ' y ' + plural(Object.keys(s.tp || {}).length, 'plantilla de día', 'plantillas de día');
  const plans = plural(countOf(s.cr), 'rutina personalizada', 'rutinas personalizadas') + ', ' + plural(countOf(s.cp), 'programa guardado', 'programas guardados') + ' y ' + plural(countOf(s.cx), 'ejercicio propio', 'ejercicios propios');
  const notes = 'Notas de ' + plural(countOf(s.notes), 'ejercicio', 'ejercicios');
  const r = [training, weights, bodyWeight, food, mine, plans, notes, ...backupRowsFull(s), 'Perfil, objetivos de nutrición, nivel y ajustes (tema, acento, estilo, unidades, avisos)'];
  if (wip)
    r.push('Entreno en curso, para retomarlo');
  return r;
};
const backupSummary = s => [plural(countOf(s.logs), 'entreno', 'entrenos'), plural(countOf(s.cr), 'rutina', 'rutinas'), plural(countOf(s.cf), 'alimento nuevo', 'alimentos nuevos'), 'comidas de ' + plural(countOf(s.meals), 'día', 'días')].join(' · ');
/** La copia: S con las claves guardadas (core/schema), como en el móvil y en la nube, más su descripción en _sf. */
export const buildBackup = () => {
  const wip = wipSession();
  const s = stateToStored(S);
  return JSON.stringify(Object.assign({ _sf: { app: 'StrataFit', fmt: BACKUP_FORMAT, ver: APPV, at: new Date().toISOString(), wip: wip || undefined, sum: backupRows(s, wip) } }, s));
};
const BACKUP_ERRORS = { vacio: 'El archivo está vacío', prog: 'Eso es un código de programa, no una copia: impórtalo en Programas', grande: 'El archivo es demasiado grande para ser una copia de StrataFit', formato: 'El archivo no es una copia válida de StrataFit', plan: 'La copia está dañada: no tiene un programa de entrenamiento válido' };
export const parseBackup = txt => {
  txt = String(txt || '').trim();
  if (!txt)
    throw 'vacio';
  if (/^FFP1:/.test(txt))
    throw 'prog';
  if (txt.length > 4e7)
    throw 'grande';
  let o;
  try {
    o = JSON.parse(txt, (k, v) => k == '__proto__' ? undefined : v);
  }
  catch (e) {
    throw 'formato';
  }
  const A_ = Array.isArray;
  const O_ = x => x && typeof x == 'object' && !A_(x);
  if (!O_(o))
    throw 'formato';
  const meta = O_(o._sf) ? o._sf : null;
  delete o._sf;
  if (!isPlan(o.plan))
    throw 'plan';
  let fix = 0;
  const L1 = ['logs', 'cr', 'cx', 'cf', 'lib', 'cp', 'wl', 'ms'];
  const O1 = ['done', 'last', 'meals', 'hist', 'pr', 'notes', 'bio', 'pf', 'nu', 'wt', 'tp', 'dt', 'fq', 'dl', 'dq', 'ach', 'bc', 'wdc', 'stz'];
  L1.forEach(k => {
    if (o[k] != null) {
      if (!A_(o[k])) {
        o[k] = [];
        fix++;
      }
      else {
        const n = o[k].length;
        o[k] = o[k].filter(x => x && typeof x == 'object');
        fix += n - o[k].length;
      }
    }
  });
  O1.forEach(k => {
    if (o[k] != null && !O_(o[k])) {
      delete o[k];
      fix++;
    }
  });
  fix += cleanProfile(o.pf);
  let wip = null;
  const w = meta && meta.wip;
  if (O_(w) && O_(w.W) && A_(w.W.x) && O_(w.d) && A_(w.d.ex) && w.W.x.length == w.d.ex.length)
    wip = w;
  return { s: o, meta, wip, fix };
};
export const backupDate = (t, l) => {
  const d = new Date(t);
  return isNaN(d) ? '' : d.toLocaleDateString('es', l ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });
};
export const askRestore = txt => {
  let r;
  try {
    r = parseBackup(txt);
  }
  catch (x) {
    toast(BACKUP_ERRORS[x] || BACKUP_ERRORS.formato);
    return;
  }
  pendingRestore = r;
  const ds = r.meta && r.meta.at ? backupDate(r.meta.at, 1) : '';
  confirmDialog('¿Restaurar esta copia?', html`<b>Copia${raw(ds ? ' del ' + X(ds) : '')}</b><br>${backupSummary(r.s)}${raw(r.wip ? '<br>Incluye un entreno en curso.' : '')}<br><br><b>Ahora tienes</b><br>${backupSummary(stateToStored(S))}<br><br>Se reemplazarán los datos actuales. Antes se guarda lo que tienes ahora, para que puedas deshacerlo.`, 'backupRestoreConfirmed', 'Restaurar');
};
/* la copia previa a la última restauración, para deshacerla (30 días): en Store.K.pre, su fecha ({ t, v, a: 1 }); la copia,
   aparte (core/persist: asideSet, en IndexedDB), porque con años de datos no cabría en localStorage. Hasta la V1.0.1 iba entera
   en Store.K.pre ({ t, v, s, w }), y así se sigue leyendo */
const preRestore = () => {
  try {
    const p = JSON.parse(Store.get(Store.K.pre));
    if (p && Date.now() - p.t < 30 * 864e5 && (p.a || p.s && Array.isArray(p.s.plan)))
      return p;
  }
  catch (e) {
    logError('leer copia previa a restaurar', e);
  }
  return null;
};
/* la copia previa entera, { t, v, s: estado con las claves guardadas, w: entreno en curso } (promesa; null si no está) */
const preCopy = async (p) => {
  if (p.s)
    return p;
  try {
    const c = JSON.parse(await asideGet('pre'));
    if (c && c.t == p.t && c.s && Array.isArray(c.s.plan))
      return c;
  }
  catch (e) {
    logError('leer copia previa a restaurar', e);
  }
  return null;
};
/* guarda lo de ahora como copia previa (antes de restaurar o de deshacer). false si no cabe */
const savePre = async () => {
  const t = Date.now();
  if (!await asideSet('pre', JSON.stringify({ t, v: APPV, s: stateToStored(S), w: Store.get(WIP_KEY) })))
    return false;
  try {
    Store.set(Store.K.pre, JSON.stringify({ t, v: APPV, a: 1 }));
    return true;
  }
  catch (e) {
    logError('guardar copia previa a restaurar', e);
    return false;
  }
};
/** Restaura la copia pendiente (pendingRestore): guarda antes lo de ahora (para deshacer), escribe la copia en lugar de todo
    y recarga la app. Si no se puede escribir, vuelve a guardar lo de ahora. Promesa (con IndexedDB, escribir espera). */
export const restoreBackup = async () => {
  const r = pendingRestore;
  if (!r || !r.s)
    return;
  pendingRestore = null;
  const w0 = Store.get(WIP_KEY);
  if (!await savePre()) {
    toast('No hay espacio para guardar tus datos actuales: no se restauró nada');
    return;
  }
  try {
    const s = r.s;
    s.bkd = Date.now();
    if (!await replaceSavedState(s))
      throw new Error('no se pudo escribir la copia');
    if (r.wip) {
      r.wip.t = Date.now();
      Store.set(WIP_KEY, JSON.stringify(r.wip));
    }
    else
      Store.del(WIP_KEY);
    Store.set(Store.K.rs, JSON.stringify({ s: backupRows(s, r.wip), f: r.fix || 0 }));
  }
  catch (e) {
    logError('restaurar copia', e);
    try {
      if (!await flushState())
        throw new Error('no se pudo volver a guardar el estado anterior');
      if (w0)
        Store.set(WIP_KEY, w0);
      else
        Store.del(WIP_KEY);
    }
    catch (_) {
      logError('deshacer restauración fallida', _);
    }
    toast('No se pudo restaurar; tus datos siguen como estaban');
    return;
  }
  lockSaves();
  reloadApp();
};
A.backupUndoAsk = async () => {
  const p = preRestore();
  const c = p && await preCopy(p);
  if (!c) {
    if (p)
      toast('No se encontró la copia de antes de restaurar');
    return;
  }
  confirmDialog('¿Deshacer la última restauración?', 'Volverás a los datos que tenías antes (' + X(backupSummary(c.s)) + '). Lo que tienes ahora se guardará por si cambias de idea.', 'backupUndo', 'Deshacer');
};
A.backupUndo = async () => {
  const q = preRestore();
  const p = q && await preCopy(q);
  if (!p) {
    if (q)
      toast('No se encontró la copia de antes de restaurar');
    return;
  }
  if (!await savePre()) {
    toast('No hay espacio para deshacer');
    return;
  }
  try {
    if (!await replaceSavedState(p.s))
      throw new Error('no se pudo escribir la copia previa');
    if (p.w)
      Store.set(WIP_KEY, p.w);
    else
      Store.del(WIP_KEY);
    Store.set(Store.K.rs, JSON.stringify({ s: backupRows(p.s, null), f: 0, u: 1 }));
  }
  catch (e) {
    logError('deshacer restauración', e);
    if (!await flushState())
      logError('guardar al deshacer restauración', new Error('no se pudo volver a guardar el estado actual'));
    toast('No se pudo deshacer');
    return;
  }
  lockSaves();
  reloadApp();
};
C.backupImportFile = e => readTextFile(e, askRestore, 4e7, BACKUP_ERRORS.grande);
A.backupRestoreText = () => {
  const e = $('#bk');
  askRestore(e ? e.value : '');
};
A.backupDownload = async () => {
  const pv = S.lastBackupDate;
  S.lastBackupDate = Date.now();
  saveState();
  const r = await downloadFile(BACKUP_FILE, buildBackup());
  if (r == 'saved')
    toast('Copia guardada');
  else {
    S.lastBackupDate = pv;
    saveState();
    toast(r == 'declined' ? 'No se guardó la copia' : 'No se pudo guardar el archivo. Usa la opción de texto.');
  }
};
/* el archivo en el móvil: siempre con el mismo nombre; guardar o importar */
const backupFileCard = () => html`<div class="cd cbk"><b>Archivo en el móvil</b><p class="mu">Siempre con el mismo nombre, ${BACKUP_FILE}: cada archivo nuevo sustituye al anterior y no se acumulan copias en el teléfono.</p><p class="mu fs-12 m-0-0-10">${raw(backupAge())}</p><div class="g2"><button class="pr" data-a="backupDownload">Guardar archivo</button><label class="btnl">Importar archivo<input type="file" accept=".json,application/json,text/plain" hidden data-c="backupImportFile"></label></div></div>`;
/* lo que entra en una copia, contado con los datos de ahora (con las claves guardadas, como en la copia) */
const backupContents = () => html`<details class="cd mt-12"><summary>Qué incluye la copia</summary><div class="mu fs-13 mt-8 d-grid gap-6">${backupRows(stateToStored(S), wipSession()).map(x => html`<div>· ${x}</div>`)}</div></details>`;
/* la copia como texto: copiarla o pegar una para restaurarla */
const backupText = () => html`<details class="cd mt-12"><summary>Copiar o pegar como texto</summary><textarea id="bk" aria-label="Copia de seguridad en texto" rows="5" class="mt-8">${buildBackup()}</textarea><div class="g2 mt-10"><button data-a="backupCopyText">Copiar</button><button class="pr" data-a="backupRestoreText">Restaurar</button></div></details>`;
/* las copias automáticas de cada día (system/snapshots las rellena al abrir) */
const backupSnapshots = () => html`<details class="cd mt-12"><summary>Copias automáticas en este móvil</summary><div id="snapl"><p class="mu fs-13 m-8-0-0">Cargando…</p></div></details>`;
A.openBackup = () => {
  const pre = preRestore();
  /* desde Ajustes es una página más, con «←» de vuelta; desde Perfil o un aviso, una hoja */
  const fromSettings = !!$('#ajs');
  const head = fromSettings ? pgHead('Copia de seguridad', 'openSettings') : html`<h3>Copia de seguridad</h3>`;
  const undo = pre ? html`<button data-a="backupUndoAsk" class="w-full mt-12">Deshacer última restauración (${backupDate(pre.t)})</button>` : '';
  sheet(html`${head}<p class="mu m-0-0-12">Tus datos se guardan en este móvil y se sincronizan con tu cuenta. La copia de seguridad es una foto de tus datos en un momento, para volver a ella si algo se borra o se estropea.</p>${raw(cloudBackupCard())}${backupFileCard()}${backupContents()}${backupText()}${backupSnapshots()}${undo}`);
  fillSnapshots();
};
export const isFreshInstall = () => !S.backupNoticeOff && !S.logs.length && !S.lastBackupDate && !(S.ownPrograms || []).length && !(S.routines || []).length && !countOf(S.meals) && !(S.weightLog || []).length;
A.backupReminderOff = () => {
  S.backupNoticeOff = 1;
  saveState();
  R();
};
export const restoreBanner = () => '<div class="cd m-0-0-12"><b>¿Ya usabas StrataFit?</b><div class="mu fs-13 m-4-0-10">Importa tu copia de seguridad y sigue por donde ibas.</div><div class="g2"><button class="pr" data-a="openBackup">Importar copia</button><button data-a="backupReminderOff">Ahora no</button></div></div>';
function backupRowsFull(s) {
  const L = (Array.isArray(s.logs) ? s.logs : []).filter(l => l && typeof l == 'object');
  const cd = L.filter(l => l.k == 'c').length;
  const wd = L.filter(l => l.k == 'w').length;
  const r = [];
  if (cd || wd)
    r.push(plural(cd, 'sesión de cardio', 'sesiones de cardio') + ' y ' + plural(wd, 'WOD', 'WOD'));
  const ms = Array.isArray(s.ms) ? s.ms.length : 0;
  if (ms)
    r.push(plural(ms, 'medición corporal', 'mediciones corporales'));
  const na = s.ach && typeof s.ach == 'object' ? Object.keys(s.ach).length : 0;
  if (na)
    r.push(plural(na, 'logro conseguido', 'logros conseguidos'));
  return r;
}
A.backupRestoreConfirmed = () => restoreBackup();
