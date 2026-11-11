/* ═══ core/repair ═══
   Deja el estado S válido: tipos, rangos y valores conocidos, sin datos personales y con un id en cada entreno. Lo usan el
   arranque (core/boot) y la sincronización, tras juntar lo que llega de Firebase (cloud/sync): unos datos dañados o
   manipulados nunca llegan a las pantallas. Se puede llamar las veces que haga falta (lo ya válido no cambia).
   Define: repairShape, repairPrograms, repairLevels, repairTraining, repairSettings, repairRecords, repairFollowUp, logIds, MIGRATIONS, migrateData, repairState
*/
import { logError } from './errors.js';
import { parseProgram, PROGRAM_NAMES, PROGRAMS } from '../data/library.js';
import { TECH_CODES, TECHNIQUES } from '../data/techniques.js';
import { S } from './state.js';
import { generateProgram } from '../programs/create.js';
import { isLevel } from '../programs/levels.js';
import { cleanProfile } from '../system/backup.js';
import { cleanGoals } from '../nutrition/diet.js';
import { hashOf } from '../cloud/merge.js';
import { syncSel } from '../workout/week.js';
import { WEIGH_UNITS } from '../dashboard/reminder.js';
import { REPORT_MAX } from '../system/report.js';
import { ACCENTS, HEX } from '../profile/appearance.js';
/* forma básica: plan, pestaña, semana, listas y objetos; objetivos de nutrición válidos y perfil sin datos personales */
const repairShape = () => {
  try {
    const A_ = Array.isArray;
    const O_ = x => x && typeof x == 'object' && !A_(x);
    if (!(S.prog >= 0 && S.prog < PROGRAMS.length))
      S.prog = 0;
    /* sin programa elegido (I-24) y bienvenida por ver (I-23): 1 o nada */
    ['np', 'nw'].forEach(k => {
      if (S[k] !== 1)
        delete S[k];
    });
    if (!A_(S.plan) || !S.plan.length || !S.plan.every(d => d && typeof d.n == 'string' && A_(d.ex) && d.ex.every(e => e && typeof e.n == 'string' && +e.s > 0)))
      S.plan = parseProgram(S.prog);
    if (!(S.sel >= 0 && S.sel < S.plan.length))
      S.sel = 0;
    if (!(S.tab >= 0 && S.tab < 4))
      S.tab = 0;
    if (!(S.wk >= 1))
      S.wk = 1;
    /* día elegido de la semana (0-6) y el del plan que le toca (workout/week) */
    if (!(S.sl >= 0 && S.sl < 7))
      S.sl = S.plan.length == 7 ? S.sel : 0;
    syncSel();
    ['logs', 'cr', 'cx', 'cf', 'lib'].forEach(k => {
      if (!A_(S[k]))
        S[k] = [];
    });
    S.logs = S.logs.filter(l => O_(l));
    /* alimentos propios (F-43, F-44): el Nutri-Score, una letra de la a a la e; el código de barras, solo cifras */
    S.cf.forEach(f => {
      if (!O_(f))
        return;
      if (f.ns != null && !['a', 'b', 'c', 'd', 'e'].includes(f.ns))
        delete f.ns;
      if (f.ean != null && !(typeof f.ean == 'string' && /^\d{8,14}$/.test(f.ean)))
        delete f.ean;
    });
    ['done', 'last', 'meals', 'hist', 'pr', 'notes', 'bio', 'pf', 'nu'].forEach(k => {
      if (S[k] != null && !O_(S[k]))
        delete S[k];
    });
    if (!S.nu)
      S.nu = { k: 1942, c: 50, p: 20, f: 30, n: 3 };
    /* objetivos de nutrición con números válidos (kcal, porcentajes, comidas al día y tipo de dieta) */
    cleanGoals(S.nu);
    /* restos de la serie de prueba: el tipo de día elegido a mano (1.23) y la versión del esquema */
    delete S.dt;
    delete S.v;
    ['done', 'last', 'meals', 'hist', 'pr', 'notes', 'bio', 'pf'].forEach(k => {
      if (!S[k])
        S[k] = {};
    });
    if (!A_(S.cr))
      S.cr = [];
    /* en el perfil, solo la foto (si es una imagen válida: unos datos manipulados no pueden meter código en Perfil) */
    cleanProfile(S.pf);
  }
  catch (e) {
    logError('reparar estado', e);
    S.plan = parseProgram(0);
    S.sel = 0;
    S.tab = 0;
  }
};
/* programas propios válidos, el activo dentro de la lista y, con el nivel intermedio, el predefinido que coincide con el plan */
const repairPrograms = () => {
  try {
    const n0 = (S.cp || []).length;
    const okd = d => d && typeof d.n == 'string' && Array.isArray(d.ex) && d.ex.every(e => e && typeof e.n == 'string' && +e.s > 0);
    if (!Array.isArray(S.cp))
      S.cp = [];
    S.cp = S.cp.filter(p => p && typeof p.n == 'string' && Array.isArray(p.plan) && p.plan.length && p.plan.every(okd));
    if (S.cp.length != n0 || !(S.cpi >= 0 && S.cpi < S.cp.length))
      S.cpi = -1;
    if (S.cpi < 0 && (S.lv || 'int') == 'int') {
      const nn = p => p.map(d => d.n).join('|');
      const cu = nn(S.plan);
      if (nn(parseProgram(S.prog)) != cu) {
        for (let i = 0; i < PROGRAMS.length; i++)
          if (nn(parseProgram(i)) == cu) {
            S.prog = i;
            break;
          }
      }
    }
  }
  catch (e) {
    S.cp = [];
    S.cpi = -1;
  }
};
/* nivel conocido y respuestas del programa guiado que aún generan un programa */
const repairLevels = () => {
  try {
    if (!isLevel(S.lv))
      S.lv = 'int';
    S.cp.forEach(p => {
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
    S.lv = 'int';
  }
};
/* técnicas de intensidad conocidas en los planes (data/techniques), descarga de los programas propios (F-20: 0 o 2-16
   semanas) y semanas de la descarga y la rotación (workout/deload, programs/rotation) */
const repairTraining = () => {
  try {
    const okTech = d => d.ex.forEach(e => {
      if (e.tk != null && !TECH_CODES.has(e.tk))
        delete e.tk;
      delete e.ta;
    });
    S.plan.forEach(okTech);
    S.cp.forEach(p => {
      p.plan.forEach(okTech);
      if (p.dl != null && !(p.dl === 0 || Number.isInteger(p.dl) && p.dl >= 2 && p.dl <= 16))
        delete p.dl;
    });
    ['dls', 'rw', 'rq'].forEach(k => {
      if (S[k] != null && !(Number.isInteger(S[k]) && S[k] >= 0))
        delete S[k];
    });
  }
  catch (e) {
    logError('reparar técnicas y semanas', e);
  }
};
/* ajustes con valores conocidos e historial con series bien formadas */
const repairSettings = () => {
  try {
    const O_ = x => x && typeof x == 'object' && !Array.isArray(x);
    ['fq', 'tp', 'dl', 'dq'].forEach(k => {
      if (S[k] != null && !O_(S[k]))
        delete S[k];
    });
    if (S.un != null && S.un != 'kg' && S.un != 'lb')
      delete S.un;
    ['vol', 'snt'].forEach(k => {
      if (S[k] != null && ![0, 1, 2].includes(S[k]))
        delete S[k];
    });
    ['vib', 'ar', 'awk', 'rm', 'tour', 'bdg'].forEach(k => {
      if (S[k] != null && S[k] !== 0 && S[k] !== 1)
        delete S[k];
    });
    /* apariencia (profile/appearance): tema conocido; color de serie o, con -1, uno propio #rrggbb; pestaña al abrir (core/tabbar) */
    if (!['', 'dark', 'light'].includes(S.theme))
      S.theme = '';
    if (S.acx != null && !(typeof S.acx == 'string' && HEX.test(S.acx)))
      delete S.acx;
    if (S.acc != null && !(Number.isInteger(S.acc) && S.acc >= (S.acx ? -1 : 0) && S.acc < ACCENTS.length))
      delete S.acc;
    if (S.st0 != null && !(Number.isInteger(S.st0) && S.st0 >= 0 && S.st0 <= 3))
      delete S.st0;
    /* «Notificaciones activadas» no hacía nada y ya no existe */
    delete S.notif;
    if (S.bkd != null && !(+S.bkd > 0))
      delete S.bkd;
    Object.keys(S.hist).forEach(n => {
      const h = S.hist[n];
      if (!Array.isArray(h)) {
        delete S.hist[n];
        return;
      }
      S.hist[n] = h.filter(x => x && typeof x.d == 'string' && Array.isArray(x.s) && x.s.every(y => Array.isArray(y)));
      /* la técnica de cada serie (quinto valor), solo si es una conocida */
      S.hist[n].forEach(x => x.s.forEach(y => {
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
    if (S.ms != null && !A_(S.ms))
      S.ms = [];
    if (A_(S.ms))
      S.ms = S.ms.filter(m => m && typeof m.d == 'string' && O_(m.v));
    ['ach', 'bc', 'wdc', 'stz'].forEach(k => {
      if (S[k] != null && !O_(S[k]))
        delete S[k];
    });
    if (S.ach) {
      delete S.ach.f1;
      delete S.ach.f2;
    }
    if (S.pc != null && !(S.pc >= 0))
      delete S.pc;
    S.logs.forEach(l => {
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
    const r = S.wr;
    if (r != null && !(r && typeof r == 'object' && Object.prototype.hasOwnProperty.call(WEIGH_UNITS, r.u) && Number.isInteger(r.n) && r.n >= 1 && r.n <= WEIGH_UNITS[r.u][2] && +r.t > 0 && day(r.sh) && day(r.sn) && (r.c == null || typeof r.c == 'string' && /^[a-z0-9]{1,24}$/.test(r.c))))
      delete S.wr;
    const c = S.cb;
    if (c != null && !(c && typeof c == 'object' && +c.at > 0 && Number.isInteger(c.lg) && Number.isInteger(c.md)))
      delete S.cb;
    /* fallos y sugerencias enviados (system/report): forma, tipos y tamaños como los admiten las reglas */
    const txt = (v, a, b) => typeof v == 'string' && v.length >= a && v.length <= b;
    if (S.rp != null)
      S.rp = (Array.isArray(S.rp) ? S.rp : []).filter(x => x && typeof x == 'object' && typeof x.id == 'string' && /^[A-Za-z0-9]{1,128}-\d{13}$/.test(x.id) && (x.k == 'f' || x.k == 's') && txt(x.a, 0, 60) && txt(x.t, 10, REPORT_MAX) && +x.ca > 0 && (x.s === 0 || x.s === 1) && (x.st == null || ['p', 'v', 'a'].includes(x.st)) && (x.rp == null || txt(x.rp, 0, REPORT_MAX)) && (x.dx == null || txt(x.dx, 0, REPORT_MAX))).slice(0, 30);
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
/* Cambios de los datos guardados de una versión a otra, una sola vez por cuenta: S.mv es el número del último hecho. Cada uno
   recibe el estado ya reparado y no puede fallar en cadena (si uno falla, se apunta y se sigue). */
const MIGRATIONS = [
  /* 1 · V1.0.1 (F-45): en Bro Split y Push Pull Leg, «Press pecho máquina convergente» pasa a ser «Press inclinado en máquina»,
     también en el plan en marcha de quien los usa, salvo donde se cambió a mano (Swap). El historial de cada uno queda con su
     nombre y el convergente sigue en la librería */
  () => {
    if (S.cpi >= 0 || ![PROGRAM_NAMES.indexOf('Bro Split'), PROGRAM_NAMES.indexOf('Push Pull Leg')].includes(S.prog))
      return;
    S.plan.forEach(d => d.ex.forEach(e => {
      if (e.n == 'Press pecho máquina convergente' && !e.o)
        e.n = 'Press inclinado en máquina';
    }));
  }
];
const migrateData = () => {
  const done = Number.isInteger(S.mv) && S.mv >= 0 ? S.mv : 0;
  for (let i = done; i < MIGRATIONS.length; i++)
    try {
      MIGRATIONS[i]();
    }
    catch (e) {
      logError('cambio de datos ' + (i + 1), e);
    }
  S.mv = MIGRATIONS.length;
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
