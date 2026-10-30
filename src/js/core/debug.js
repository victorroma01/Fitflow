/* ═══ core/debug ═══
   Acceso desde fuera a una parte del estado y de las funciones internas, para las pruebas automáticas (tests/) y la
   consola del navegador: con módulos ES ya no son variables globales. Cada nombre se expone en window con su valor
   actual; los que las pruebas cambian, también con escritura. La app no lo usa. Si una prueba necesita otro nombre,
   se añade aquí.
   Define: DEBUG_NAMES
*/
import { APPV, dayKey, FFDEP } from './util.js';
import { Store } from './store.js';
import { clearErrorLog, errorLog, logError } from './errors.js';
import { partsFailed, savedFormat, stateRecovered } from './persist.js';
import { A, C, U } from './registry.js';
import { groupOf } from '../data/library.js';
import { EX_PHOTO_KEY, EX_PHOTOS } from '../data/photos.js';
import { flushState, nutriDayOffset, S, saveState, setW, setWeightView, W, weightView } from './state.js';
import { icon } from './icons.js';
import { confirmDialog, dialog, sheet } from './ui.js';
import { R } from './render.js';
import { exAll, exSearchText } from '../library/model.js';
import { libBody, libState } from '../library/browse.js';
import { clone } from '../programs/create.js';
import { buildBackup, parseBackup, pendingRestore, restoreBackup, setPendingRestore } from '../system/backup.js';
import { snapList, snapTx, takeSnapshot } from '../system/snapshots.js';
import { updatesOn } from '../system/updates.js';
import { showSummary } from '../extras/summary.js';
/** nombre → [lectura, escritura opcional] */
const DEBUG_NAMES = {
  A: [() => A],
  APPV: [() => APPV],
  buildBackup: [() => buildBackup],
  C: [() => C],
  clearErrorLog: [() => clearErrorLog],
  clone: [() => clone],
  confirmDialog: [() => confirmDialog],
  dayKey: [() => dayKey],
  dialog: [() => dialog],
  errorLog: [() => errorLog],
  EX_PHOTO_KEY: [() => EX_PHOTO_KEY],
  EX_PHOTOS: [() => EX_PHOTOS],
  exAll: [() => exAll],
  exSearchText: [() => exSearchText],
  FFDEP: [() => FFDEP],
  flushState: [() => flushState],
  groupOf: [() => groupOf],
  icon: [() => icon],
  libBody: [() => libBody],
  libState: [() => libState],
  logError: [() => logError],
  nutriDayOffset: [() => nutriDayOffset],
  partsFailed: [() => partsFailed],
  parseBackup: [() => parseBackup],
  pendingRestore: [() => pendingRestore, setPendingRestore],
  R: [() => R],
  restoreBackup: [() => restoreBackup],
  S: [() => S],
  savedFormat: [() => savedFormat],
  saveState: [() => saveState],
  sheet: [() => sheet],
  showSummary: [() => showSummary],
  snapList: [() => snapList],
  snapTx: [() => snapTx],
  stateRecovered: [() => stateRecovered],
  Store: [() => Store],
  takeSnapshot: [() => takeSnapshot],
  U: [() => U],
  updatesOn: [() => updatesOn],
  W: [() => W, setW],
  weightView: [() => weightView, setWeightView]
};
for (const k in DEBUG_NAMES)
  Object.defineProperty(window, k, { get: DEBUG_NAMES[k][0], set: DEBUG_NAMES[k][1], configurable: true });
