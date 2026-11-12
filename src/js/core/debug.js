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
import { mealsPart, partSizes, partsLost, savesDone, stateRecovered } from './persist.js';
import { SCHEMA_TABLES, stateFromStored, stateToStored, workoutFromStored, workoutToStored } from './schema.js';
import { A, C, U } from './registry.js';
import { groupOf, parseProgram, PROGRAM_NAMES, PROGRAMS } from '../data/library.js';
import { EX_PHOTO_KEY, EX_PHOTOS } from '../data/photos.js';
import { addState, applyTheme, flushState, markNewAccount, nutriDayOffset, S, saveState, setW, setWeightView, W, weightView } from './state.js';
import { icon } from './icons.js';
import { confirmDialog, dialog, sheet } from './ui.js';
import { R } from './render.js';
import { exAll, exSearchText } from '../library/model.js';
import { libBody, libState } from '../library/browse.js';
import { clone, progDraft } from '../programs/create.js';
import { levelPlan } from '../programs/levels.js';
import { isDeloadWeek } from '../workout/deload.js';
import { planIndex, syncSel } from '../workout/week.js';
import { buildBackup, parseBackup, pendingRestore, restoreBackup, setPendingRestore } from '../system/backup.js';
import { snapList, snapTx, takeSnapshot } from '../system/snapshots.js';
import { spaceCheck, spaceUse } from '../system/space.js';
import { updatesOn } from '../system/updates.js';
import { showSummary } from '../extras/summary.js';
import { medalSvg } from '../extras/medals.js';
import { ACHIEVEMENTS } from '../extras/achievements.js';
import { FOOD_GROUPS, FOODS_SRC } from '../data/foods.js';
import { dayInfo } from '../nutrition/templates.js';
import { tdee } from '../nutrition/diet.js';
import { account } from '../cloud/session.js';
import { pendingDocs, syncNow, syncState } from '../cloud/sync.js';
import { refreshReports } from '../system/report.js';
import { accentNow, customAccent } from '../profile/appearance.js';
import { backTarget } from './back.js';
import { deviceOS } from './platform.js';
import { tourCheck } from '../system/tour.js';
import { iconNoticeApplies, iconNoticeCheck } from '../system/iconnotice.js';
/** nombre → [lectura, escritura opcional] */
const DEBUG_NAMES = {
  A: [() => A],
  accentNow: [() => accentNow],
  account: [() => account],
  ACHIEVEMENTS: [() => ACHIEVEMENTS],
  addState: [() => addState],
  applyTheme: [() => applyTheme],
  APPV: [() => APPV],
  backTarget: [() => backTarget],
  buildBackup: [() => buildBackup],
  C: [() => C],
  clearErrorLog: [() => clearErrorLog],
  clone: [() => clone],
  confirmDialog: [() => confirmDialog],
  customAccent: [() => customAccent],
  dayInfo: [() => dayInfo],
  dayKey: [() => dayKey],
  deviceOS: [() => deviceOS],
  dialog: [() => dialog],
  errorLog: [() => errorLog],
  EX_PHOTO_KEY: [() => EX_PHOTO_KEY],
  EX_PHOTOS: [() => EX_PHOTOS],
  exAll: [() => exAll],
  exSearchText: [() => exSearchText],
  FFDEP: [() => FFDEP],
  flushState: [() => flushState],
  FOOD_GROUPS: [() => FOOD_GROUPS],
  FOODS_SRC: [() => FOODS_SRC],
  groupOf: [() => groupOf],
  icon: [() => icon],
  isDeloadWeek: [() => isDeloadWeek],
  levelPlan: [() => levelPlan],
  libBody: [() => libBody],
  libState: [() => libState],
  logError: [() => logError],
  markNewAccount: [() => markNewAccount],
  mealsPart: [() => mealsPart],
  medalSvg: [() => medalSvg],
  nutriDayOffset: [() => nutriDayOffset],
  parseBackup: [() => parseBackup],
  parseProgram: [() => parseProgram],
  partSizes: [() => partSizes],
  partsLost: [() => partsLost],
  PROGRAM_NAMES: [() => PROGRAM_NAMES],
  PROGRAMS: [() => PROGRAMS],
  pendingDocs: [() => pendingDocs],
  pendingRestore: [() => pendingRestore, setPendingRestore],
  planIndex: [() => planIndex],
  progDraft: [() => progDraft],
  R: [() => R],
  refreshReports: [() => refreshReports],
  restoreBackup: [() => restoreBackup],
  S: [() => S],
  saveState: [() => saveState],
  savesDone: [() => savesDone],
  sheet: [() => sheet],
  showSummary: [() => showSummary],
  snapList: [() => snapList],
  snapTx: [() => snapTx],
  spaceCheck: [() => spaceCheck],
  spaceUse: [() => spaceUse],
  stateRecovered: [() => stateRecovered],
  Store: [() => Store],
  syncSel: [() => syncSel],
  syncNow: [() => syncNow],
  syncState: [() => syncState],
  takeSnapshot: [() => takeSnapshot],
  tdee: [() => tdee],
  tourCheck: [() => tourCheck],
  U: [() => U],
  updatesOn: [() => updatesOn],
  W: [() => W, setW],
  weightView: [() => weightView, setWeightView],
  SCHEMA_TABLES: [() => SCHEMA_TABLES],
  stateFromStored: [() => stateFromStored],
  stateToStored: [() => stateToStored],
  workoutFromStored: [() => workoutFromStored],
  workoutToStored: [() => workoutToStored],
  iconNoticeApplies: [() => iconNoticeApplies],
  iconNoticeCheck: [() => iconNoticeCheck]
};
for (const k in DEBUG_NAMES)
  Object.defineProperty(window, k, { get: DEBUG_NAMES[k][0], set: DEBUG_NAMES[k][1], configurable: true });
