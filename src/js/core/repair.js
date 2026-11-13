/* ═══ core/repair ═══
   Deja el estado S válido: tipos, rangos y valores conocidos, sin datos personales y con un id en cada entreno. Lo usan el
   arranque (core/boot) y la sincronización, tras juntar lo que llega de Firebase (cloud/sync): unos datos dañados o
   manipulados nunca llegan a las pantallas. Se puede llamar las veces que haga falta (lo ya válido no cambia).
   Define: isPlanDay, isPlan, cleanProfile, repairShape, repairPrograms, repairLevels, EXERCISE_UNITS, TEMPO_RE, isRange, cleanDay, repairTraining, isDay, repairSettings, repairRecords, repairFollowUp, logIds, MIGRATIONS, migrateData, repairState
*/
import { logError } from './errors.js';
import { safeImage } from './util.js';
import { parseProgram, PROGRAM_NAMES, PROGRAMS } from '../data/library.js';
import { TECH_CODES, TECHNIQUES } from '../data/techniques.js';
import { DAY_PHOTOS } from '../data/photos.js';
import { S } from './state.js';
import { generateProgram } from '../programs/create.js';
import { isLevel } from '../programs/levels.js';
import { cleanGoals } from '../nutrition/diet.js';
import { hashOf } from '../cloud/merge.js';
import { syncSel } from '../workout/week.js';
import { WEIGH_UNITS } from '../dashboard/reminder.js';
import { REPORT_MAX } from '../system/report.js';
import { ACCENTS, HEX } from '../profile/appearance.js';
/* ¿tiene `d` la forma de un día del plan? Un nombre y una lista de ejercicios, cada uno con su nombre y sus series */
const isPlanDay = d => !!d && typeof d.n == 'string' && Array.isArray(d.ex) && d.ex.every(e => e && typeof e.n == 'string' && +e.s > 0);
/** ¿Es `p` un plan? Una lista con al menos un día, todos con la forma de un día. Lo que no lo es no se usa: ni al arrancar ni
    al restaurar una copia (system/backup). */
export const isPlan = p => Array.isArray(p) && p.length > 0 && p.every(isPlanDay);
/** Deja en el perfil solo lo que la app guarda: la foto, si es una imagen válida, y cuándo se dio el consentimiento para
  subirla (`pc`). El nombre, el email y el teléfono de la serie de prueba se borran sin contarlos como daño: la V1.0.0 no
  guarda datos personales (F-35). Devuelve cuántos datos estaban dañados. */
export const cleanProfile = pf => {
  if (!pf || typeof pf != 'object')
    return 0;
  let n = 0;
  for (const k of Object.keys(pf)) {
    if (k == 'img' && safeImage(pf.img) || k == 'pc' && +pf.pc > 0)
      continue;
    if (k == 'img' || k == 'pc')
      n++;
    delete pf[k];
  }
  return n;
};
/* forma básica: plan, pestaña, semana, listas y objetos; objetivos de nutrición válidos y perfil sin datos personales */
const repairShape = () => {
  try {
    const A_ = Array.isArray;
    const O_ = x => x && typeof x == 'object' && !A_(x);
    if (!(S.program >= 0 && S.program < PROGRAMS.length))
      S.program = 0;
    /* sin programa elegido (I-24) y bienvenida por ver (I-23): 1 o nada */
    ['noProgram', 'welcomePending'].forEach(k => {
      if (S[k] !== 1)
        delete S[k];
    });
    if (!isPlan(S.plan))
      S.plan = parseProgram(S.program);
    if (!(S.selectedDay >= 0 && S.selectedDay < S.plan.length))
      S.selectedDay = 0;
    if (!(S.tab >= 0 && S.tab < 4))
      S.tab = 0;
    if (!(S.week >= 1))
      S.week = 1;
    /* día elegido de la semana (0-6) y el del plan que le toca (workout/week) */
    if (!(S.selectedWeekday >= 0 && S.selectedWeekday < 7))
      S.selectedWeekday = S.plan.length == 7 ? S.selectedDay : 0;
    syncSel();
    ['logs', 'routines', 'customExercises', 'myFoods', 'savedDishes'].forEach(k => {
      if (!A_(S[k]))
        S[k] = [];
    });
    S.logs = S.logs.filter(l => O_(l));
    /* alimentos propios (F-43, F-44): el Nutri-Score, una letra de la a a la e; el código de barras, solo cifras */
    S.myFoods.forEach(f => {
      if (!O_(f))
        return;
      if (f.ns != null && !['a', 'b', 'c', 'd', 'e'].includes(f.ns))
        delete f.ns;
      if (f.ean != null && !(typeof f.ean == 'string' && /^\d{8,14}$/.test(f.ean)))
        delete f.ean;
    });
    ['doneDays', 'lastWeights', 'meals', 'exerciseHistory', 'records', 'exerciseNotes', 'biometrics', 'profile', 'nutritionGoals'].forEach(k => {
      if (S[k] != null && !O_(S[k]))
        delete S[k];
    });
    if (!S.nutritionGoals)
      S.nutritionGoals = { k: 1942, c: 50, p: 20, f: 30, n: 3 };
    /* objetivos de nutrición con números válidos (kcal, porcentajes, comidas al día y tipo de dieta) */
    cleanGoals(S.nutritionGoals);
    /* restos de la serie de prueba: el tipo de día elegido a mano (1.23) y la versión del esquema */
    delete S.dt;
    delete S.v;
    ['doneDays', 'lastWeights', 'meals', 'exerciseHistory', 'records', 'exerciseNotes', 'biometrics', 'profile'].forEach(k => {
      if (!S[k])
        S[k] = {};
    });
    if (!A_(S.routines))
      S.routines = [];
    /* workouts propios: con nombre y bloques, y cada bloque con sus ejercicios (nombres), series y descanso */
    S.routines = S.routines.filter(r => O_(r) && typeof r.n == 'string' && A_(r.bl));
    S.routines.forEach(r => {
      r.bl = r.bl.filter(b => O_(b) && A_(b.ex) && b.ex.length && b.ex.every(n => typeof n == 'string' && n));
      r.bl.forEach(b => {
        b.s = +b.s >= 1 ? Math.round(+b.s) : 3;
      });
    });
    /* en el perfil, solo la foto (si es una imagen válida: unos datos manipulados no pueden meter código en Perfil) */
    cleanProfile(S.profile);
  }
  catch (e) {
    logError('reparar estado', e);
    S.plan = parseProgram(0);
    S.selectedDay = 0;
    S.tab = 0;
  }
};
/* programas propios válidos, el activo dentro de la lista y, con el nivel intermedio, el predefinido que coincide con el plan */
const repairPrograms = () => {
  try {
    const n0 = (S.ownPrograms || []).length;
    if (!Array.isArray(S.ownPrograms))
      S.ownPrograms = [];
    S.ownPrograms = S.ownPrograms.filter(p => p && typeof p.n == 'string' && isPlan(p.plan));
    if (S.ownPrograms.length != n0 || !(S.ownProgramIndex >= 0 && S.ownProgramIndex < S.ownPrograms.length))
      S.ownProgramIndex = -1;
    if (S.ownProgramIndex < 0 && (S.level || 'int') == 'int') {
      const nn = p => p.map(d => d.n).join('|');
      const cu = nn(S.plan);
      if (nn(parseProgram(S.program)) != cu) {
        for (let i = 0; i < PROGRAMS.length; i++)
          if (nn(parseProgram(i)) == cu) {
            S.program = i;
            break;
          }
      }
    }
  }
  catch (e) {
    S.ownPrograms = [];
    S.ownProgramIndex = -1;
  }
};
/* nivel conocido y respuestas del programa guiado que aún generan un programa */
const repairLevels = () => {
  try {
    if (!isLevel(S.level))
      S.level = 'int';
    S.ownPrograms.forEach(p => {
      if (!p || !p.o)
        return;
      try {
        if (typeof p.o != 'object' || !isLevel(p.o.niv) || !Array.isArray(generateProgram({ ...p.o, vr: p.o.vr || 0 })))
          delete p.o;
      }
      catch (e) {
        delete p.o;
      }
    });
  }
  catch (e) {
    S.level = 'int';
  }
};
/* en qué se mide un ejercicio que no va por repeticiones, y cómo es un tempo («3/0/1/0», «Libre») */
const EXERCISE_UNITS = ['m', 's', 'min', 'cal', 'km'];
const TEMPO_RE = /^(Libre|[0-9X]{1,2}(\/[0-9X]{1,2}){3})$/;
const isRange = v => Array.isArray(v) && v.length == 2 && v.every(x => typeof x == 'number' && x > 0 && x < 1e6);
/** Deja los ejercicios de un día (del plan, de un programa propio o de un entreno a medias) con cada dato del tipo que toca:
    series, descanso, rango, unidad, tempo, técnica y bloque. Lo que no vale se quita, y la app usa lo de serie. Así nada de
    una copia manipulada llega a una pantalla como texto donde va un número (lo que se importa con un código de programa ya
    lo comprueba programs/share). */
export const cleanDay = d => {
  if (d.img != null && !(typeof d.img == 'string' && Object.prototype.hasOwnProperty.call(DAY_PHOTOS, d.img)))
    delete d.img;
  d.ex.forEach(e => {
    e.s = Math.max(1, Math.min(99, Math.round(+e.s) || 1));
    if (e.r != null && !(typeof e.r == 'number' && e.r >= 0 && e.r <= 3600))
      delete e.r;
    if (e.rg != null && !isRange(e.rg))
      delete e.rg;
    if (e.u != null && !EXERCISE_UNITS.includes(e.u))
      delete e.u;
    if (e.t != null && !(typeof e.t == 'string' && TEMPO_RE.test(e.t)))
      delete e.t;
    if (e.tk != null && !TECH_CODES.has(e.tk))
      delete e.tk;
    delete e.ta;
    if (e.b != null && typeof e.b != 'string' && typeof e.b != 'number')
      delete e.b;
    if (e.o != null && typeof e.o != 'string')
      delete e.o;
    const ou = e.ou;
    if (ou != null && !(typeof ou == 'object' && (ou.u == null || EXERCISE_UNITS.includes(ou.u)) && (ou.rg == null || isRange(ou.rg))))
      delete e.ou;
  });
};
/* los días del plan y de los programas propios con datos válidos (cleanDay), descarga de los programas propios (F-20: 0 o
   2-16 semanas) y semanas de la descarga y la rotación (workout/deload, programs/rotation) */
const repairTraining = () => {
  try {
    S.plan.forEach(cleanDay);
    if (S.planBackup != null && !(S.planBackup && S.planBackup.day && typeof S.planBackup.day.n == 'string' && Array.isArray(S.planBackup.day.ex) && S.plan[S.planBackup.sel]))
      delete S.planBackup;
    else if (S.planBackup)
      cleanDay(S.planBackup.day);
    S.ownPrograms.forEach(p => {
      p.plan.forEach(cleanDay);
      if (p.dl != null && !(p.dl === 0 || Number.isInteger(p.dl) && p.dl >= 2 && p.dl <= 16))
        delete p.dl;
    });
    ['deloadSheetWeek', 'rotationWeek', 'rotationPostponed'].forEach(k => {
      if (S[k] != null && !(Number.isInteger(S[k]) && S[k] >= 0))
        delete S[k];
    });
  }
  catch (e) {
    logError('reparar técnicas y semanas', e);
  }
};
/* una fecha guardada: AAAA-MM-DD (lo que se enseña y por lo que se ordena y se compara) */
const isDay = d => typeof d == 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
/* ajustes con valores conocidos e historial con series bien formadas */
const repairSettings = () => {
  try {
    const O_ = x => x && typeof x == 'object' && !Array.isArray(x);
    ['frequentFoods', 'mealTemplates', 'deloadWeeks', 'deloadDeclined'].forEach(k => {
      if (S[k] != null && !O_(S[k]))
        delete S[k];
    });
    if (S.units != null && S.units != 'kg' && S.units != 'lb')
      delete S.units;
    ['volume', 'soundTone'].forEach(k => {
      if (S[k] != null && ![0, 1, 2].includes(S[k]))
        delete S[k];
    });
    ['vibration', 'autoRest', 'keepAwake', 'reduceMotion', 'tourSeen', 'iconBadge'].forEach(k => {
      if (S[k] != null && S[k] !== 0 && S[k] !== 1)
        delete S[k];
    });
    /* apariencia (profile/appearance): tema conocido; color de serie o, con -1, uno propio #rrggbb; pestaña al abrir (core/tabbar) */
    if (!['', 'dark', 'light'].includes(S.theme))
      S.theme = '';
    if (S.accentColor != null && !(typeof S.accentColor == 'string' && HEX.test(S.accentColor)))
      delete S.accentColor;
    if (S.accent != null && !(Number.isInteger(S.accent) && S.accent >= (S.accentColor ? -1 : 0) && S.accent < ACCENTS.length))
      delete S.accent;
    if (S.startTab != null && !(Number.isInteger(S.startTab) && S.startTab >= 0 && S.startTab <= 3))
      delete S.startTab;
    /* «Notificaciones activadas» no hacía nada y ya no existe */
    delete S.notif;
    if (S.lastBackupDate != null && !(+S.lastBackupDate > 0))
      delete S.lastBackupDate;
    Object.keys(S.exerciseHistory).forEach(n => {
      const h = S.exerciseHistory[n];
      if (!Array.isArray(h)) {
        delete S.exerciseHistory[n];
        return;
      }
      S.exerciseHistory[n] = h.filter(x => x && isDay(x.d) && Array.isArray(x.s) && x.s.every(y => Array.isArray(y)));
      /* de cada serie, repeticiones, peso, RPE y fila extra como números (se enseñan tal cual) y la técnica (quinto valor),
         solo si es una conocida */
      S.exerciseHistory[n].forEach(x => x.s.forEach(y => {
        for (let i = 0; i < Math.min(4, y.length); i++)
          y[i] = +y[i] > 0 ? +y[i] : 0;
        if (y.length > 4 && !Object.keys(TECHNIQUES).includes(y[4]))
          y.length = 4;
      }));
    });
  }
  catch (e) {
    logError('reparar ajustes', e);
  }
};
/* medidas, logros (sin los de las fotos de progreso, que ya no existen), cachés y tipo de cada entreno */
const repairRecords = () => {
  try {
    const A_ = Array.isArray;
    const O_ = x => x && typeof x == 'object' && !A_(x);
    if (S.measures != null && !A_(S.measures))
      S.measures = [];
    if (A_(S.measures))
      S.measures = S.measures.filter(m => m && isDay(m.d) && O_(m.v));
    /* pesajes: cada uno con su fecha y su peso (kg), como número */
    if (S.weightLog != null)
      S.weightLog = (A_(S.weightLog) ? S.weightLog : []).filter(p => O_(p) && isDay(p.d) && +p.w > 0 && +p.w < 1000).map(p => ({ d: p.d, w: +p.w }));
    /* mejores marcas: peso, repeticiones y 1RM estimado como números, y su fecha */
    Object.keys(S.records).forEach(n => {
      const r = S.records[n];
      if (!(O_(r) && +r.w > 0 && +r.r >= 0 && +r.e > 0 && isDay(r.d)))
        delete S.records[n];
      else
        S.records[n] = { w: +r.w, r: +r.r, e: +r.e, d: r.d };
    });
    /* el último peso de cada ejercicio, un número */
    Object.keys(S.lastWeights).forEach(n => {
      if (!(+S.lastWeights[n] > 0))
        delete S.lastWeights[n];
      else
        S.lastWeights[n] = +S.lastWeights[n];
    });
    ['achievements', 'barcodeCache', 'wodConfig', 'stagnationDismissed'].forEach(k => {
      if (S[k] != null && !O_(S[k]))
        delete S[k];
    });
    if (S.achievements) {
      delete S.achievements.f1;
      delete S.achievements.f2;
    }
    if (S.recordCount != null && !(S.recordCount >= 0))
      delete S.recordCount;
    /* cada entreno, con su fecha (sin ella no se puede situar), un nombre y cifras que sean números: volumen, series,
       minutos y esfuerzo se suman y se enseñan tal cual */
    S.logs = S.logs.filter(l => isDay(l.d));
    S.logs.forEach(l => {
      if (typeof l.n != 'string')
        l.n = 'Entreno';
      ['v', 's', 'm', 'q'].forEach(k => {
        if (typeof l[k] != 'number' || !(l[k] >= 0))
          l[k] = +l[k] > 0 ? +l[k] : 0;
      });
      if (l.k && l.k != 'c' && l.k != 'w')
        delete l.k;
      if (l.k == 'c' && !O_(l.c))
        delete l.k;
    });
  }
  catch (e) {
    logError('reparar medidas y registros', e);
  }
};
/* recordatorio de pesaje (dashboard/reminder), última copia en la nube (cloud/backup) y avisos enviados con valores válidos */
const repairFollowUp = () => {
  try {
    const day = v => v == null || typeof v == 'string' && /^\d{4}-\d\d-\d\d$/.test(v);
    const r = S.weighReminder;
    if (r != null && !(r && typeof r == 'object' && Object.prototype.hasOwnProperty.call(WEIGH_UNITS, r.u) && Number.isInteger(r.n) && r.n >= 1 && r.n <= WEIGH_UNITS[r.u][2] && +r.t > 0 && day(r.sh) && day(r.sn) && (r.c == null || typeof r.c == 'string' && /^[a-z0-9]{1,24}$/.test(r.c))))
      delete S.weighReminder;
    const c = S.cloudBackup;
    if (c != null && !(c && typeof c == 'object' && +c.at > 0 && Number.isInteger(c.lg) && Number.isInteger(c.md)))
      delete S.cloudBackup;
    /* fallos y sugerencias enviados (system/report): forma, tipos y tamaños como los admiten las reglas */
    const txt = (v, a, b) => typeof v == 'string' && v.length >= a && v.length <= b;
    if (S.reports != null)
      S.reports = (Array.isArray(S.reports) ? S.reports : []).filter(x => x && typeof x == 'object' && typeof x.id == 'string' && /^[A-Za-z0-9]{1,128}-\d{13}$/.test(x.id) && (x.k == 'f' || x.k == 's') && txt(x.a, 0, 60) && txt(x.t, 10, REPORT_MAX) && +x.ca > 0 && (x.s === 0 || x.s === 1) && (x.st == null || ['p', 'v', 'a'].includes(x.st)) && (x.rp == null || txt(x.rp, 0, REPORT_MAX)) && (x.dx == null || txt(x.dx, 0, REPORT_MAX))).slice(0, 30);
  }
  catch (e) {
    logError('reparar recordatorio y copia', e);
  }
};
/** Un id para cada entreno que no lo tenga, sacado de su contenido: dos dispositivos con el mismo entreno le dan el mismo id
  (así la sincronización los reconoce como uno solo: cloud/merge). */
export const logIds = () => {
  const used = new Set();
  for (const l of Array.isArray(S.logs) ? S.logs : []) {
    if (typeof l.id != 'string' || !l.id || l.id.length > 40 || used.has(l.id)) {
      delete l.id;
      const base = 'h' + hashOf(l);
      let id = base;
      for (let i = 2; used.has(id); i++)
        id = base + '-' + i;
      l.id = id;
    }
    used.add(l.id);
  }
};
/* Cambios de los datos guardados de una versión a otra, una sola vez por cuenta: S.migrationsDone es el número del último hecho. Cada uno
   recibe el estado ya reparado y no puede fallar en cadena (si uno falla, se apunta y se sigue). */
const MIGRATIONS = [
  /* 1 · V1.0.1 (F-45): en Bro Split y Push Pull Leg, «Press pecho máquina convergente» pasa a ser «Press inclinado en máquina»,
     también en el plan en marcha de quien los usa, salvo donde se cambió a mano (Swap). El historial de cada uno queda con su
     nombre y el convergente sigue en la librería */
  () => {
    if (S.ownProgramIndex >= 0 || ![PROGRAM_NAMES.indexOf('Bro Split'), PROGRAM_NAMES.indexOf('Push Pull Leg')].includes(S.program))
      return;
    S.plan.forEach(d => d.ex.forEach(e => {
      if (e.n == 'Press pecho máquina convergente' && !e.o)
        e.n = 'Press inclinado en máquina';
    }));
  }
];
const migrateData = () => {
  const done = Number.isInteger(S.migrationsDone) && S.migrationsDone >= 0 ? S.migrationsDone : 0;
  for (let i = done; i < MIGRATIONS.length; i++)
    try {
      MIGRATIONS[i]();
    }
    catch (e) {
      logError('cambio de datos ' + (i + 1), e);
    }
  S.migrationsDone = MIGRATIONS.length;
};
export const repairState = () => {
  repairShape();
  repairPrograms();
  repairLevels();
  repairTraining();
  repairSettings();
  repairRecords();
  repairFollowUp();
  logIds();
  migrateData();
};
