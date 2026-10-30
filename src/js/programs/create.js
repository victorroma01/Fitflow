/* ═══ programs/create ═══
   Crear programa: guiado y a partir de mis workouts.
   Define: progDraft, clone, restDay, syncCustomProgram, WEEK_LAYOUTS, layoutWeek, MOVE_GROUP, routineMoveGroups, overlapRatio, orderRoutines, buildFromMine, dayDuration, programDaysHtml, programRowsHtml, createHome, programNameBox, … (+11)  · acciones/registros: 20
*/
import { fmtMinSec, X } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, U } from '../core/registry.js';
import { groupLabel, parseExToken } from '../data/library.js';
import { GOAL_INFO, GUIDE_DAY_IMAGES, GUIDE_DAY_NAMES, GUIDE_LEVEL_VARIANTS, GUIDE_OPTIONS, GUIDE_SEQUENCES, GUIDE_TEMPLATES, SET_SCHEMES, STYLE_INFO } from '../data/templates.js';
import { LEVEL_DETAILS } from '../data/levels.js';
import { S, saveState, W } from '../core/state.js';
import { icon } from '../core/icons.js';
import { confirmDialog, dialog, fullPage, pgHead, sheet, sheetToTop } from '../core/ui.js';
import { R } from '../core/render.js';
import { groupOfName } from '../library/model.js';
import { routineToDay } from '../routines/builder.js';
import { dropResume } from '../workout/resume.js';
import { restOf } from '../workout/rest.js';
import { targetRange, targetText, unitOf, weeklySetsCard } from '../workout/targets.js';
import { isLevel, levelDot } from './levels.js';
export let progDraft = { m: '', name: '', sel: [], plan: null, o: { lug: 'gym', mat: 'bw', est: 'clasico', obj: 'musculo', dias: 4, niv: 'int' }, vr: 0, k: -1, txt: '' };
export const clone = x => JSON.parse(JSON.stringify(x));
export const restDay = () => ({ n: 'Descanso', ex: [] });
export const syncCustomProgram = () => {
  if (S.cpi >= 0 && S.cp[S.cpi])
    S.cp[S.cpi].plan = clone(S.plan);
};
const WEEK_LAYOUTS = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
const layoutWeek = (l, n) => {
  const p = WEEK_LAYOUTS[Math.min(6, Math.max(1, n))];
  const o = [];
  for (let i = 0; i < 7; i++)
    o.push(null);
  p.forEach((d, k) => {
    o[d] = l[k];
  });
  return o.map(x => x || restDay());
};
const MOVE_GROUP = { Pecho: 'Empuje', Hombros: 'Empuje', 'Tríceps': 'Empuje', Espalda: 'Tirón', 'Bíceps': 'Tirón', Antebrazos: 'Tirón', 'Cuádriceps': 'Piernas', 'Isquios y glúteos': 'Piernas', Gemelos: 'Piernas' };
const routineMoveGroups = i => {
  const s = new Set();
  S.cr[i].bl.forEach(b => b.ex.forEach(n => {
    const g = groupOfName(n);
    if (g != 'Abdomen')
      s.add(MOVE_GROUP[g] || g);
  }));
  return s;
};
const overlapRatio = (a, b) => {
  let n = 0;
  a.forEach(x => {
    if (b.has(x))
      n++;
  });
  return n / Math.max(1, Math.min(a.size, b.size));
};
const orderRoutines = sel => {
  if (sel.length < 3)
    return sel.slice();
  const r = sel.slice();
  const o = [r.shift()];
  while (r.length) {
    const l = routineMoveGroups(o[o.length - 1]);
    let bi = 0;
    let bv = 9;
    r.forEach((x, j) => {
      const v = overlapRatio(l, routineMoveGroups(x));
      if (v < bv - 1e-9) {
        bv = v;
        bi = j;
      }
    });
    o.push(r.splice(bi, 1)[0]);
  }
  return o;
};
const buildFromMine = () => {
  progDraft.plan = progDraft.sel.length ? layoutWeek(orderRoutines(progDraft.sel).map(i => routineToDay(i)), progDraft.sel.length) : null;
};
const dayDuration = d => {
  if (!d.ex.length)
    return 0;
  let t = 300;
  d.ex.forEach((e, i) => {
    const U = unitOf(e);
    const r = targetRange(e);
    const v = (r[0] + r[1]) / 2;
    const w = U ? (U == 'm' ? (v <= 100 ? 45 : v / 3) : U == 's' ? v : U == 'min' ? v * 60 : v * 3) : v * 3 + 12;
    const sb = e.b != null && d.ex[i + 1] && d.ex[i + 1].b == e.b;
    t += e.s * (w + (sb ? 10 : restOf(e)));
  });
  return Math.max(5, Math.round(t / 300) * 5);
};
const programDaysHtml = pl => weeklySetsCard(pl) + pl.map((d, j) => '<div class="cd" style="margin:8px 0"><div class="row"><b>Día ' + (j + 1) + ' · ' + X(d.n) + '</b>' + (d.ex.length ? '<small>' + d.ex.reduce((s, e) => s + e.s, 0) + ' series</small>' : '') + '</div>' + (d.ex.length ? d.ex.map(e => '<div class="mu" style="font-size:13px;margin-top:3px">' + (e.b ? '<b style="color:#f59e0b;font-size:11px">SS </b>' : '') + X(e.n) + ' · ' + e.s + ' × ' + targetText(e) + ' · ' + fmtMinSec(restOf(e)) + '</div>').join('') : '<div class="mu" style="font-size:13px;margin-top:3px">Descanso</div>') + '</div>').join('');
const programRowsHtml = pl => pl.map((d, j) => {
  const r = !d.ex.length;
  return '<div class="cd cpr' + (r ? ' rs' : '') + '"><div class="row"><b>Día ' + (j + 1) + ' · ' + X(d.n) + '</b><span class="cpm"><button data-a="cpu" data-i="' + j + '" aria-label="Subir"' + (j ? '' : ' disabled') + '>' + icon('chev', 18) + '</button><button data-a="cpd" data-i="' + j + '" aria-label="Bajar"' + (j < pl.length - 1 ? '' : ' disabled') + '>' + icon('chev', 18) + '</button></span></div>' + (r ? '<div class="mu" style="font-size:13px">Descanso</div>' : '<div class="mu" style="font-size:12px;margin-top:2px">' + d.ex.length + (d.ex.length == 1 ? ' ejercicio' : ' ejercicios') + ' · ' + d.ex.reduce((s, e) => s + e.s, 0) + ' series · ~' + dayDuration(d) + ' min</div><div class="mu cpe">' + d.ex.map(e => X(e.n)).join(' · ') + '</div>') + '</div>';
}).join('');
const createHome = () => pgHead('Crear programa', 'pg') + '<p class="mu" style="margin:-6px 0 14px">Elige cómo quieres montarlo.</p><button class="cpo" data-a="cpm"><span class="cpi">' + icon('log', 26) + '</span><span><b>Con mis workouts</b><small>' + (S.cr.length ? S.cr.length + (S.cr.length == 1 ? ' workout creado' : ' workouts creados') + '. Te propongo la semana con descansos y tú la ordenas.' : 'Aún no has creado ninguno. Créalos y monta aquí tu semana.') + '</small></span>›</button><button class="cpo" data-a="cpg"><span class="cpi">' + icon('prog', 26) + '</span><span><b>Programa guiado</b><small>Personalizado y asistido: casa o gimnasio, estilo de entrenamiento y objetivo.</small></span>›</button>';
const programNameBox = () => '<div class="ph">Nombre del programa</div><input data-u="cpn" value="' + X(progDraft.name) + '" placeholder="Mi programa" maxlength="60">';
const createFromMine = () => {
  const n = S.cr.length;
  let h = pgHead('Con mis workouts', 'cpn');
  if (!n)
    return h + '<p class="mu">Aún no tienes workouts personalizados. Crea alguno y vuelve aquí para montar tu semana.</p><button class="pr" data-a="cr" style="width:100%;margin-top:10px;padding:15px;border-radius:16px">Ir a Workouts personalizados</button>';
  h += '<p class="mu" style="margin:-6px 0 12px">Marca los que quieras (hasta 6). Te propongo el orden y dónde poner los días de descanso.</p><div class="ph">Tus workouts</div>' + S.cr.map((r, i) => {
    const on = progDraft.sel.includes(i);
    const ex = [].concat(...r.bl.map(b => b.ex));
    const gs = [...new Set(ex.map(x => groupLabel(groupOfName(x))))];
    return '<button class="cpw' + (on ? ' on' : '') + '" data-a="cpt" data-i="' + i + '"><i>' + (on ? icon('chk', 14) : '') + '</i><span><b>' + X(r.n) + '</b><br><small class="mu">' + (r.bl.length ? X(gs.slice(0, 3).join(' · ')) + ' · ' + ex.length + (ex.length == 1 ? ' ejercicio' : ' ejercicios') : 'Sin ejercicios') + '</small></span></button>';
  }).join('');
  if (progDraft.plan) {
    h += '<div class="row" style="margin-top:20px"><div class="ph" style="margin:0">Estructura sugerida</div><button class="chip" data-a="cpr" style="margin:0">Reordenar</button></div><p class="mu" style="font-size:12px;margin:4px 0 8px">Alterno grupos musculares para que descanses cada zona. Usa las flechas para cambiar el orden.</p>' + programRowsHtml(progDraft.plan) + programNameBox() + '<div style="height:96px"></div><button class="sb pr" data-a="cps" style="padding:16px;font-size:16px;border-radius:16px">Crear programa</button>';
  }
  return h + '<div style="height:30px"></div>';
};
const optionChips = (k, t, sub) => '<div class="ph">' + t + '</div><div class="cps">' + GUIDE_OPTIONS[k].map(o => '<button class="chip' + (progDraft.o[k] == o[0] ? ' on' : '') + '" data-a="cpq" data-k="' + k + '" data-v="' + o[0] + '">' + (k == 'niv' ? levelDot(o[0]) : '') + o[1] + '</button>').join('') + '</div>' + (sub ? '<p class="mu" style="font-size:12px;margin:6px 2px 0">' + sub + '</p>' : '');
const guidedForm = () => {
  const o = progDraft.o;
  return pgHead('Programa guiado', 'cpn') + '<p class="mu" style="margin:-6px 0 4px">Responde cuatro cosas y te monto un programa a medida.</p>' + optionChips('lug', 'Dónde entrenas') + (o.lug == 'home' ? optionChips('mat', 'Material en casa') : '') + optionChips('est', 'Estilo de entrenamiento', STYLE_INFO[o.est]) + optionChips('obj', 'Objetivo', GOAL_INFO[o.obj]) + optionChips('dias', 'Días por semana') + optionChips('niv', 'Nivel', LEVEL_DETAILS[o.niv]) + '<div style="height:96px"></div><button class="sb pr" data-a="cpgen" style="padding:16px;font-size:16px;border-radius:16px">Ver propuesta</button>';
};
const makeEx = (tok, o) => {
  let sp = '';
  if (tok[0] == '+') {
    sp = '+';
    tok = tok.slice(1);
  }
  const r = tok[0];
  const n = tok.slice(2);
  if (r == 'F') {
    const m = n.match(/^(.*)\*(\d+)\/(.+)@(\d+)$/);
    if (o.niv == 'ini' && m && +m[2] >= 4 && !/(min|cal|km)$/.test(m[3]))
      return sp + m[1] + '*' + (+m[2] - 1) + '/' + m[3] + '@' + m[4];
    return sp + n;
  }
  const m = SET_SCHEMES[o.obj][r].match(/^(\d+)\/(.+)@(\d+)$/);
  let s = +m[1];
  let g = m[2];
  let rs = +m[3];
  if (o.niv == 'ini') {
    if (r == 'M') {
      s = Math.min(s, o.obj == 'fuerza' ? 4 : 3);
      if (o.obj == 'fuerza') {
        g = '5-8';
        rs = 180;
      }
    }
    else
      s = Math.max(2, s - 1);
  }
  else if (o.niv == 'ava' && r == 'M')
    s = Math.min(5, s + 1);
  return sp + n + '*' + s + '/' + g + '@' + rs;
};
export const generateProgram = o => {
  const pl = o.lug == 'gym' ? 'gym' : o.mat;
  const E = o.est;
  const P = Object.assign({ low: GUIDE_TEMPLATES[E][pl].leg }, GUIDE_TEMPLATES[E][pl]);
  let seq = GUIDE_SEQUENCES[E][o.dias].slice();
  if (E == 'crossfit' && o.obj == 'fuerza' && o.dias >= 4) {
    const k = seq.lastIndexOf('cfW');
    if (k > 0)
      seq[k] = 'cfS';
  }
  const cnt = {};
  const tot = {};
  seq.forEach(t => {
    tot[t] = (tot[t] || 0) + 1;
  });
  const fin = o.obj == 'grasa' ? (o.lug == 'gym' ? 'F:Cinta inclinada*1/12min@0' : 'F:Burpees*3/10@45') : '';
  const noFin = new Set(['hRun', 'hZ2', 'cfE']);
  const days = seq.map(t => {
    const V = P[t];
    const k = cnt[t] || 0;
    cnt[t] = k + 1;
    let vi = GUIDE_LEVEL_VARIANTS.has(t) ? (o.niv == 'ini' ? 0 : o.niv == 'ava' ? V.length - 1 : (1 + o.vr) % V.length) : (k + o.vr) % V.length;
    vi = Math.min(vi, V.length - 1);
    let tk = V[vi].slice();
    if (E == 'crossfit' && t == 'cfS' && o.obj == 'musculo' && o.lug == 'gym')
      tk = tk.concat(['I:Curl con barra Z', '+I:Extensión tríceps polea']);
    if (E == 'crossfit' && t == 'cfS' && o.obj == 'musculo' && o.mat == 'db' && o.lug == 'home')
      tk = tk.concat(['I:Curl martillo', '+I:Patada de tríceps']);
    if (fin && !noFin.has(t))
      tk.push(fin);
    let lb = GUIDE_DAY_NAMES[t];
    if (t == 'cfO' && o.lug == 'home' && o.mat == 'bw')
      lb = 'Potencia';
    if (tot[t] > 1)
      lb += ' ' + String.fromCharCode(65 + k);
    return { t, lb, s: lb + ':' + tk.map(x => makeEx(x, o)).join(',') };
  });
  const pl2 = parseDays(days.map(d => d.s).join('|')).map((d, i) => {
    d.cu = 1;
    d.img = GUIDE_DAY_IMAGES[days[i].t];
    return d;
  });
  if ((o.obj == 'grasa' || o.obj == 'salud') && o.dias <= 4 && o.est != 'hibrido') {
    const c = parseDays('Cardio suave (opcional):' + (o.niv == 'ini' || o.obj == 'salud' ? 'Caminata rápida*1/40min@0' : (o.lug == 'gym' ? 'Bicicleta zona 2*1/35min@0' : 'Rodaje suave zona 2*1/35min@0')))[0];
    c.cu = 1;
    c.img = 'cardio';
    const l = layoutWeek(pl2, o.dias);
    l[5] = c;
    return l;
  }
  return layoutWeek(pl2, o.dias);
};
export const parseDays = b => b.split('|').map(x => {
  const [a, r] = x.split(':');
  const ex = [];
  let k = 0;
  (r ? r.split(',') : []).forEach(t => {
    const [e, j] = parseExToken(t);
    const p = ex[ex.length - 1];
    if (j && p) {
      if (p.b == null)
        p.b = ++k;
      e.b = p.b;
    }
    ex.push(e);
  });
  return { n: a, ex };
});
const programNameFor = o => {
  const N = { clasico: { musculo: 'Hipertrofia', fuerza: o.niv == 'ava' ? 'Fuerza avanzada' : 'Fuerza base', grasa: 'Definición', rendimiento: 'Atlético', salud: 'Forma y salud' }, crossfit: { musculo: 'CrossFit + músculo', fuerza: 'CrossFit fuerza', grasa: 'CrossFit metabólico', rendimiento: 'CrossFit rendimiento', salud: 'CrossFit para todos' }, hibrido: { musculo: 'Híbrido músculo y motor', fuerza: 'Híbrido fuerza y carrera', grasa: 'Híbrido quema grasa', rendimiento: 'Híbrido Hyrox', salud: 'Híbrido salud' } };
  return N[o.est][o.obj] + ' · ' + o.dias + ' días' + (o.lug == 'home' ? ' · Casa' : '');
};
const programAdvice = o => {
  const G = { musculo: 'Apuesta por 10-20 series semanales por grupo muscular, cerca del fallo (1-3 repeticiones en reserva), y sube el peso cuando llegues al tope del rango. En Nutrición, un ligero superávit y 1,6-2,2 g de proteína por kg.', fuerza: 'Prioriza los básicos con descansos largos (3 min o más) y sube la carga en saltos pequeños. Mantén 1-3 repeticiones en reserva. En Nutrición, calorías de mantenimiento o ligero superávit y proteína alta.', grasa: 'Conserva el peso en la barra para proteger el músculo, descansos cortos y un final de cardio. En Nutrición, un déficit moderado (10-20 %) con proteína alta; el cardio suave suma, pero la dieta decide.', rendimiento: 'Combina fuerza, técnica y condición física. Mejor calidad que cantidad: si la técnica se rompe, baja la carga. Dormir y comer bien es parte del plan.', salud: 'Volumen moderado, técnica limpia y constancia. Entre 2 y 4 entrenos por semana ya aportan mucho; añade paseos y mueve el cuerpo a diario.' };
  let t = G[o.obj];
  if (o.lug == 'home' && o.mat == 'bw')
    t += ' Sin material la espalda y los bíceps quedan poco estimulados: unas bandas o una barra de dominadas ampliarían mucho el programa.';
  if (o.niv == 'ini')
    t += ' Al empezar, prioriza aprender los movimientos; el volumen está recortado a propósito.';
  return t;
};
const guidedProposal = () => {
  const o = progDraft.o;
  const pl = progDraft.plan;
  const lab = [o.lug == 'gym' ? 'Gimnasio' : 'Casa' + (o.mat == 'db' ? ' · mancuernas y bandas' : ' · peso corporal'), GUIDE_OPTIONS.est.find(x => x[0] == o.est)[1], GUIDE_OPTIONS.obj.find(x => x[0] == o.obj)[1], o.dias + ' días', GUIDE_OPTIONS.niv.find(x => x[0] == o.niv)[1]];
  return pgHead('Tu propuesta', 'cpg') + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:-4px 0 12px">' + lab.map(x => '<span class="tg">' + X(x) + '</span>').join('') + '</div><div class="cd" style="margin:8px 0"><b>Cómo sacarle partido</b><p class="mu" style="margin:6px 0 0;font-size:13px;line-height:1.5">' + X(progDraft.txt) + '</p></div>' + weeklySetsCard(pl) + '<div class="row" style="margin-top:14px"><div class="ph" style="margin:0">Semana</div><button class="chip" data-a="cpvr" style="margin:0">Otra variante</button></div><p class="mu" style="font-size:12px;margin:4px 0 8px">Usa las flechas para mover días y descansos a tu gusto.</p>' + programRowsHtml(pl) + programNameBox() + '<div style="height:96px"></div><button class="sb pr" data-a="cps" style="padding:16px;font-size:16px;border-radius:16px">Crear programa</button>';
};
const orderWeekPage = () => pgHead('Ordenar semana', 'cpv0') + '<p class="mu" style="margin:-6px 0 8px">Mueve días y descansos con las flechas.</p>' + programRowsHtml(progDraft.plan) + '<div style="height:96px"></div><button class="sb pr" data-a="cpes" style="padding:16px;font-size:16px;border-radius:16px">Guardar orden</button>';
const refreshCreate = () => fullPage(progDraft.m == 'mine' ? createFromMine() : progDraft.m == 'guide' ? guidedProposal() : orderWeekPage());
A.cpn = () => {
  progDraft = { m: '', name: '', sel: [], plan: null, o: progDraft.o, vr: 0, k: -1, txt: '' };
  fullPage(createHome());
};
A.cpm = () => {
  progDraft.m = 'mine';
  fullPage(createFromMine());
};
A.cpt = (i, b) => {
  const k = +b.dataset.i;
  const r = S.cr[k];
  if (!r)
    return;
  if (progDraft.sel.includes(k))
    progDraft.sel = progDraft.sel.filter(x => x != k);
  else {
    if (!r.bl.length) {
      toast('Este workout aún no tiene ejercicios');
      return;
    }
    if (progDraft.sel.length >= 6) {
      toast('Máximo 6 entrenos por semana');
      return;
    }
    progDraft.sel.push(k);
  }
  if (!progDraft.name || /^Mi programa( \d+)?$/.test(progDraft.name))
    progDraft.name = 'Mi programa ' + (S.cp.length + 1);
  buildFromMine();
  fullPage(createFromMine());
};
A.cpr = () => {
  buildFromMine();
  fullPage(createFromMine());
};
A.cpg = () => {
  progDraft.m = 'guide';
  fullPage(guidedForm());
};
A.cpq = (i, b) => {
  const k = b.dataset.k;
  const v = b.dataset.v;
  progDraft.o[k] = k == 'dias' ? +v : v;
  fullPage(guidedForm());
};
A.cpgen = () => {
  progDraft.vr = 0;
  progDraft.plan = generateProgram({ ...progDraft.o, vr: 0 });
  progDraft.name = programNameFor(progDraft.o);
  progDraft.txt = programAdvice(progDraft.o);
  fullPage(guidedProposal());
};
A.cpvr = () => {
  progDraft.vr = (progDraft.vr || 0) + 1;
  progDraft.plan = generateProgram({ ...progDraft.o, vr: progDraft.vr });
  fullPage(guidedProposal());
};
A.cpu = i => {
  const p = progDraft.plan;
  const k = +i;
  if (k > 0) {
    [p[k - 1], p[k]] = [p[k], p[k - 1]];
    refreshCreate();
  }
};
A.cpd = i => {
  const p = progDraft.plan;
  const k = +i;
  if (k < p.length - 1) {
    [p[k + 1], p[k]] = [p[k], p[k + 1]];
    refreshCreate();
  }
};
U.cpn = v => {
  progDraft.name = v;
};
A.cps = () => {
  if (!progDraft.plan || !progDraft.plan.some(d => d.ex.length))
    return;
  const nme = (progDraft.name || '').trim() || 'Mi programa ' + (S.cp.length + 1);
  S.cp.push({ n: nme, plan: clone(progDraft.plan), t: Date.now(), src: progDraft.m, o: progDraft.m == 'guide' ? { ...progDraft.o, vr: progDraft.vr || 0 } : undefined, d: progDraft.m == 'guide' ? 'Programa guiado' : 'Hecho con tus workouts' });
  progDraft.k = S.cp.length - 1;
  saveState();
  A.pg();
  dialog('Programa creado', '«' + X(nme) + '» ya está en Mis programas. ¿Quieres empezar con él ahora? Se reiniciará el progreso de la semana.', [['Más tarde', 'zno', ''], ['Usar ahora', 'cpa', 'pr']]);
};
A.cpv = (i, b) => {
  const k = b && b.dataset ? +b.dataset.i : +i;
  progDraft.k = k;
  A.cpv0();
};
A.cpv0 = () => {
  const k = progDraft.k;
  const p = S.cp[k];
  if (!p)
    return A.pg();
  const act = S.cpi == k;
  const pl = act ? S.plan : p.plan;
  sheet(pgHead(X(p.n), 'pg') + '<p class="mu" style="margin:-6px 0 10px">' + X(p.d || '') + (act ? ' · <b style="color:var(--a1)">Plan actual</b>' : '') + '</p>' + programDaysHtml(pl) + '<div class="g2" style="margin-top:12px"><button data-a="cpe">Ordenar días</button><button data-a="cpdl" style="color:var(--c)">Borrar</button></div><button data-a="cpsh" style="width:100%;margin-top:8px">Compartir programa</button><div style="height:84px"></div>' + (act ? '' : '<button class="sb pr" data-a="cpac" style="padding:16px;font-size:16px;border-radius:16px">Usar este programa</button>'));
  sheetToTop();
};
A.cpac = () => {
  const p = S.cp[progDraft.k];
  if (!p)
    return;
  confirmDialog('¿Cambiar de plan?', 'Pasarás a «' + X(p.n) + '» y se reiniciará el progreso de la semana.', 'cpa', 'Cambiar');
};
A.cpa = () => {
  const p = S.cp[progDraft.k];
  if (!p)
    return;
  if (W) {
    toast('Termina o descarta el entreno en curso');
    return;
  }
  syncCustomProgram();
  S.cpi = progDraft.k;
  S.plan = clone(p.plan);
  if (p.o && isLevel(p.o.niv))
    S.lv = p.o.niv;
  dropResume();
  S.wk = 1;
  S.sel = 0;
  S.done = {};
  saveState();
  sheet();
  R();
};
A.cpe = () => {
  const p = S.cp[progDraft.k];
  if (!p)
    return;
  progDraft.m = 'edit';
  progDraft.plan = clone(S.cpi == progDraft.k ? S.plan : p.plan);
  fullPage(orderWeekPage());
};
A.cpes = () => {
  const p = S.cp[progDraft.k];
  if (!p || !progDraft.plan)
    return;
  p.plan = clone(progDraft.plan);
  if (S.cpi == progDraft.k)
    S.plan = clone(progDraft.plan);
  saveState();
  R();
  A.cpv0();
};
A.cpdl = () => {
  const p = S.cp[progDraft.k];
  if (!p)
    return;
  if (S.cpi == progDraft.k) {
    toast('Es tu plan actual y no se puede borrar');
    return;
  }
  confirmDialog('¿Borrar este programa?', 'Se eliminará «' + X(p.n) + '» de tu lista.', 'cpdd', 'Borrar');
};
A.cpdd = () => {
  const k = progDraft.k;
  if (!S.cp[k])
    return;
  S.cp.splice(k, 1);
  if (S.cpi == k)
    S.cpi = -1;
  else if (S.cpi > k)
    S.cpi--;
  progDraft.k = -1;
  saveState();
  A.pg();
};
