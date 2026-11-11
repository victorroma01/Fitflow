/* ═══ core/schema ═══
   Los nombres de las claves del estado (I-17, V1.0.2). En el programa, S y W usan nombres que dicen lo que guardan
   (S.selectedDay, W.restEndsAt); en el móvil, en la nube y en las copias de seguridad siguen las claves cortas de siempre
   (sel, re), así que no se migra nada. Este es el único módulo que conoce las dos: core/persist traduce al leer y al guardar,
   cloud/sync al subir y al bajar, system/backup al exportar y al importar, y workout/resume con el entreno a medias.
   Una clave que no está en la tabla (de una versión vieja o de una futura) pasa tal cual, sin perderse.
   Los campos de dentro de cada dato (las series de un entreno, los alimentos de una comida…) siguen con sus claves cortas,
   descritas en docs/tecnica/estado.md.
   Define: STATE_KEYS, WORKOUT_KEYS, nameOf, storedOf, STATE_NAME, STATE_STORED, WORKOUT_NAME, WORKOUT_STORED, translate, stateName, stateToStored, stateFromStored, workoutToStored, workoutFromStored, SCHEMA_TABLES
*/
/** S: [clave guardada, nombre en el programa]. Lo que ya se llamaba bien (plan, logs, meals…) se queda igual. */
const STATE_KEYS = [
  /* Workout */
  ['tab', 'tab'], ['prog', 'program'], ['np', 'noProgram'], ['nw', 'welcomePending'], ['cpi', 'ownProgramIndex'], ['lv', 'level'],
  ['plan', 'plan'], ['wk', 'week'], ['sl', 'selectedWeekday'], ['sel', 'selectedDay'], ['done', 'doneDays'], ['pbk', 'planBackup'],
  ['dl', 'deloadWeeks'], ['dq', 'deloadDeclined'], ['dls', 'deloadSheetWeek'], ['rw', 'rotationWeek'], ['rq', 'rotationPostponed'],
  /* seguimiento */
  ['logs', 'logs'], ['hist', 'exerciseHistory'], ['last', 'lastWeights'], ['pr', 'records'], ['pc', 'recordCount'],
  ['notes', 'exerciseNotes'], ['wl', 'weightLog'], ['ms', 'measures'], ['ach', 'achievements'], ['stz', 'stagnationDismissed'],
  ['wr', 'weighReminder'], ['rp', 'reports'],
  /* lo creado por el usuario */
  ['cp', 'ownPrograms'], ['cr', 'routines'], ['cx', 'customExercises'],
  /* nutrición */
  ['nu', 'nutritionGoals'], ['bio', 'biometrics'], ['meals', 'meals'], ['cf', 'myFoods'], ['lib', 'savedDishes'],
  ['tp', 'mealTemplates'], ['fq', 'frequentFoods'], ['wt', 'water'], ['bc', 'barcodeCache'],
  /* apariencia y ajustes */
  ['theme', 'theme'], ['acc', 'accent'], ['acx', 'accentColor'], ['gm', 'glassLevel'], ['gl', 'glassOn'], ['gk', 'glassLastLevel'],
  ['rm', 'reduceMotion'], ['st0', 'startTab'], ['tour', 'tourSeen'], ['rpe', 'logRpe'], ['mv', 'migrationsDone'],
  ['bdg', 'iconBadge'], ['un', 'units'], ['rest', 'defaultRest'], ['ar', 'autoRest'], ['snd', 'sound'], ['snt', 'soundTone'],
  ['vol', 'volume'], ['vib', 'vibration'], ['awk', 'keepAwake'], ['pf', 'profile'], ['wdc', 'wodConfig'], ['rg', 'weightRange'],
  /* copias de seguridad */
  ['bkd', 'lastBackupDate'], ['cb', 'cloudBackup'], ['nbk', 'backupNoticeOff']
];
/** W, el entreno en curso: [clave guardada, nombre en el programa]. */
const WORKOUT_KEYS = [
  ['t0', 'startedAt'], ['re', 'restEndsAt'], ['p', 'pausedAt'], ['x', 'sets'], ['o', 'openPanels'], ['fd', 'folded'],
  ['wu', 'warmupsDone'], ['ri', 'restAfter'], ['lb', 'lastBeep'], ['lc', 'lastCurrent'], ['dl', 'deload']
];
const nameOf = list => new Map(list.map(k => [k[0], k[1]]));
const storedOf = list => new Map(list.map(k => [k[1], k[0]]));
const STATE_NAME = nameOf(STATE_KEYS);
const STATE_STORED = storedOf(STATE_KEYS);
const WORKOUT_NAME = nameOf(WORKOUT_KEYS);
const WORKOUT_STORED = storedOf(WORKOUT_KEYS);
/* un objeto con sus claves traducidas, en el mismo orden; las que no están en la tabla, tal cual */
const translate = (o, map) => {
  const out = {};
  for (const k of Object.keys(o))
    out[map.get(k) || k] = o[k];
  return out;
};
/** Nombre en el programa de una clave guardada de S: stateName('sel') → 'selectedDay'. */
export const stateName = stored => STATE_NAME.get(stored) || stored;
/** S (o una parte) con las claves guardadas, para escribirlo en el móvil, en la nube o en una copia. */
export const stateToStored = s => translate(s, STATE_STORED);
/** Lo guardado (en el móvil, en la nube o en una copia), con los nombres del programa. */
export const stateFromStored = o => translate(o, STATE_NAME);
/** W con las claves guardadas (workout/resume). */
export const workoutToStored = w => translate(w, WORKOUT_STORED);
/** Un entreno a medias guardado, con los nombres del programa. */
export const workoutFromStored = o => translate(o, WORKOUT_NAME);
/** Las dos tablas, para las pruebas (core/debug): cada lado sin repetidos y ningún nombre igual a la clave guardada de otra. */
export const SCHEMA_TABLES = { state: STATE_KEYS, workout: WORKOUT_KEYS };
