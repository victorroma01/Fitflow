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
import { instanceStale, partSizes, partsLost, savesBroken, savesDone, stateRecovered } from './persist.js';
import { mealsPart } from './parts.js';
import { SCHEMA_TABLES, stateFromStored, stateToStored, workoutFromStored, workoutToStored } from './schema.js';
import { A, C, U } from './registry.js';
import { EXERCISES, groupOf, parseProgram, PROGRAM_NAMES, PROGRAMS } from '../data/library.js';
import { EX_ALIASES } from '../data/aliases.js';
import { FIG_POSES } from '../data/figposes.js';
import { exHasFigure, exMotion, exPicture } from '../extras/pictures.js';
import { loadFigures } from './lazy.js';
import { addState, applyTheme, flushState, markNewAccount, nutriDayOffset, overviewMode, S, saveState, setOverviewMode, setW, setWeightView, W, weightView } from './state.js';
import { icon } from './icons.js';
import { confirmDialog, dialog, sheet } from './ui.js';
import { R } from './render.js';
import { exAll, exByName, exSearchText } from '../library/model.js';
import { libBody, libState } from '../library/browse.js';
import { clone, progDraft } from '../programs/create.js';
import { levelPlan } from '../programs/levels.js';
import { isDeloadWeek } from '../workout/deload.js';
import { dayImage, photoUrl, routineImage } from '../workout/images.js';
import { MEDIA } from '../data/media.js';
import { planIndex, syncSel } from '../workout/week.js';
import { buildBackup, parseBackup, pendingRestore, restoreBackup, setPendingRestore } from '../system/backup.js';
import { snapList, snapTx, takeSnapshot } from '../system/snapshots.js';
import { spaceCheck, spaceUse } from '../system/space.js';
import { isNewerVersion, updatesOn } from '../system/updates.js';
import { showSummary } from '../extras/summary.js';
import { medalSvg } from '../extras/medals.js';
import { ACHIEVEMENTS } from '../extras/achievements.js';
import { FOOD_GROUPS, FOODS_SRC } from '../data/foods.js';
import { dayInfo } from '../nutrition/templates.js';
import { applyDiet, tdee } from '../nutrition/diet.js';
import { bestOf } from '../workout/finish.js';
import { account } from '../cloud/session.js';
import { APP_CHECK } from '../cloud/config.js';
import { appCheckOn } from '../cloud/appcheck.js';
import { pendingDocs, stopSync, syncNow, syncState } from '../cloud/sync.js';
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
  APP_CHECK: [() => APP_CHECK],
  appCheckOn: [() => appCheckOn],
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
  EX_ALIASES: [() => EX_ALIASES],
  exAll: [() => exAll],
  exByName: [() => exByName],
  EXERCISES: [() => EXERCISES],
  exHasFigure: [() => exHasFigure],
  exMotion: [() => exMotion],
  exPicture: [() => exPicture],
  exSearchText: [() => exSearchText],
  FFDEP: [() => FFDEP],
  FIG_POSES: [() => FIG_POSES],
  flushState: [() => flushState],
  FOOD_GROUPS: [() => FOOD_GROUPS],
  FOODS_SRC: [() => FOODS_SRC],
  groupOf: [() => groupOf],
  icon: [() => icon],
  isDeloadWeek: [() => isDeloadWeek],
  levelPlan: [() => levelPlan],
  loadFigures: [() => loadFigures],
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
  instanceStale: [() => instanceStale],
  savesBroken: [() => savesBroken],
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
  stopSync: [() => stopSync],
  syncState: [() => syncState],
  takeSnapshot: [() => takeSnapshot],
  tdee: [() => tdee],
  applyDiet: [() => applyDiet],
  bestOf: [() => bestOf],
  tourCheck: [() => tourCheck],
  U: [() => U],
  updatesOn: [() => updatesOn],
  W: [() => W, setW],
  weightView: [() => weightView, setWeightView],
  overviewMode: [() => overviewMode, setOverviewMode],
  SCHEMA_TABLES: [() => SCHEMA_TABLES],
  stateFromStored: [() => stateFromStored],
  stateToStored: [() => stateToStored],
  workoutFromStored: [() => workoutFromStored],
  workoutToStored: [() => workoutToStored],
  iconNoticeApplies: [() => iconNoticeApplies],
  iconNoticeCheck: [() => iconNoticeCheck],
  isNewerVersion: [() => isNewerVersion],
  dayImage: [() => dayImage],
  photoUrl: [() => photoUrl],
  routineImage: [() => routineImage],
  MEDIA: [() => MEDIA],
};
for (const k in DEBUG_NAMES)
  Object.defineProperty(window, k, { get: DEBUG_NAMES[k][0], set: DEBUG_NAMES[k][1], configurable: true });
