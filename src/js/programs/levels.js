/* ═══ programs/levels ═══
   Niveles de programa (aplicar, variantes, selector).
   Define: isLevel, round5, levelTech, levelDay, levelPlan, planSignature, currentCustomProgram, levelsActive, levelGenerate, planEdited, weekStarted, levelDot, levelMenuOpen, setLevelMenuOpen, previewLevel, setPreviewLevel, pendingLevel, levelPill, applyLevel, levelSegment, levelTag, programRow  · acciones/registros: 5
*/
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { parseProgram } from '../data/library.js';
import { LEVEL_CLASS, LEVEL_DETAILS, LEVEL_EXTRA_DAYS, LEVEL_KEYS, LEVEL_LAYOUTS, LEVEL_NAMES, LEVEL_OVERRIDES, LEVEL_SUMMARY, LEVEL_SWAPS } from '../data/levels.js';
import { S, saveState, W } from '../core/state.js';
import { confirmDialog, sheet } from '../core/ui.js';
import { R } from '../core/render.js';
import { dropResume, pendingResume } from '../workout/resume.js';
import { clone, generateProgram, parseDays } from './create.js';
import { previewProgram } from './manager.js';
import { html, raw } from '../core/html.js';
export const isLevel = v => LEVEL_KEYS.includes(v);
const round5 = x => Math.max(5, Math.round(x / 5) * 5);
/** Técnica de intensidad del nivel (data/techniques): ninguna en principiante; en avanzado, la suya si la tiene (ta). */
const levelTech = (e, lv) => {
  if (lv == 'ini')
    delete e.tk;
  else if (lv == 'ava' && e.ta != null) {
    if (e.ta)
      e.tk = e.ta;
    else
      delete e.tk;
  }
  delete e.ta;
  return e;
};
const levelDay = (d, lv) => {
  if (!d.ex.length)
    return { n: d.n, ex: [] };
  const src = d.ex.map(e => levelTech({ ...e, rg: e.rg ? e.rg.slice() : e.rg }, lv));
  const sw = LEVEL_SWAPS[lv] || {};
  let ex = [];
  src.forEach(e => {
    const r = sw[e.n];
    if (r) {
      if (src.some(x => x !== e && x.n == r) || ex.some(x => x.n == r)) {
        if (lv == 'ini')
          return;
        ex.push(e);
        return;
      }
      e.n = r;
      e.sw = 1;
    }
    ex.push(e);
  });
  if (lv == 'ini')
    ex = ex.slice(0, 6);
  ex.forEach((e, i) => {
    const u = e.u;
    const rg = e.rg;
    if (lv == 'ini') {
      if (u) {
        if (e.s >= 4)
          e.s = Math.max(2, e.s - 2);
        else if (e.s == 3)
          e.s = 2;
        if (rg && (u == 'min' || u == 's' || u == 'cal'))
          e.rg = [round5(rg[0] * .7), round5(rg[1] * .7)];
      }
      else {
        e.s = Math.max(2, i < 3 ? Math.min(e.s, 3) : Math.min(e.s, 2));
        if (rg && rg[0] < 8)
          e.rg = [8, Math.min(12, Math.max(rg[1], 10))];
      }
      if (e.r > 120)
        e.r = 120;
      delete e.b;
    }
    else if (lv == 'ava') {
      if (u) {
        if (u == 'min') {
          if (rg)
            e.rg = [round5(rg[0] * 1.25), round5(rg[1] * 1.25)];
        }
        else if (e.s >= 2)
          e.s = Math.min(10, e.s + (e.s >= 6 ? 2 : 1));
      }
      else {
        if (i < 3)
          e.s = Math.min(5, e.s + 1);
        if (i < 2 && rg && rg[1] > rg[0] && rg[0] <= 8 && rg[1] <= 10) {
          const lo = Math.max(3, rg[0] - 1);
          e.rg = [lo, Math.max(lo + 2, rg[1] - 2)];
        }
        if (e.r >= 120)
          e.r = Math.min(240, e.r + 30);
      }
    }
  });
  ex.forEach(e => {
    if (e.sw) {
      const o = LEVEL_OVERRIDES[e.n];
      if (o)
        Object.assign(e, o, o.rg ? { rg: o.rg.slice() } : {});
      delete e.sw;
    }
  });
  const cnt = {};
  ex.forEach(e => {
    if (e.b != null)
      cnt[e.b] = (cnt[e.b] || 0) + 1;
  });
  ex.forEach(e => {
    if (e.b != null && cnt[e.b] < 2)
      delete e.b;
    /* las técnicas de dos ejercicios (superserie, pre y post-agotamiento) solo valen dentro de su bloque */
    if (e.b == null && /^(SS|PRE|POST)$/.test(e.tk || ''))
      delete e.tk;
  });
  return { n: d.n, ex };
};
export const levelPlan = (pl, lv, id) => {
  if (!isLevel(lv) || lv == 'int')
    return pl.map(d => ({ n: d.n, ex: d.ex.map(e => levelTech({ ...e }, 'int')) }));
  const tx = pl.map(d => levelDay(d, lv));
  const L = (LEVEL_LAYOUTS[id] || {})[lv];
  if (!L)
    return tx;
  return L.map(k => k === -1 ? { n: 'Descanso', ex: [] } : typeof k == 'string' ? parseDays(LEVEL_EXTRA_DAYS[k])[0] : tx[k]);
};
const planSignature = pl => JSON.stringify(pl.map(d => [d.n, d.ex.map(e => [e.n, e.s, e.rg || 0, e.u || 0, e.r || 0, e.b || 0, e.tk || 0])]));
export const currentCustomProgram = () => S.ownProgramIndex >= 0 ? S.ownPrograms[S.ownProgramIndex] : null;
export const levelsActive = () => !S.noProgram && (S.ownProgramIndex < 0 || !!(currentCustomProgram() && currentCustomProgram().o));
const levelGenerate = (v) => {
  const p = currentCustomProgram();
  if (p)
    return p.o ? generateProgram({ ...p.o, niv: v, vr: p.o.vr || 0 }) : null;
  return levelPlan(parseProgram(S.program), v, S.program);
};
const planEdited = () => {
  try {
    const g = levelGenerate(S.level);
    return !g || planSignature(g) != planSignature(S.plan);
  }
  catch (e) {
    return true;
  }
};
const weekStarted = () => Object.keys(S.doneDays || {}).some(k => k.indexOf(S.week + '-') == 0 && S.doneDays[k]);
export const levelDot = v => html`<i class="lvd ${LEVEL_CLASS[v]}"></i>`;
let levelMenuOpen = false;
/** Cambia `levelMenuOpen` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setLevelMenuOpen = v => {
  levelMenuOpen = v;
};
export let previewLevel = null;
/** Cambia `previewLevel` desde otros módulos (un módulo no puede asignar una variable importada). */
export const setPreviewLevel = v => {
  previewLevel = v;
};
let pendingLevel = null;
export const levelPill = () => {
  if (!levelsActive())
    return '';
  const v = isLevel(S.level) ? S.level : 'int';
  return html`<div class="lvw ${LEVEL_CLASS[v]}"><button class="lvp" data-a="levelMenuToggle" aria-haspopup="menu" aria-expanded="${levelMenuOpen ? 'true' : 'false'}" aria-label="Nivel del programa: ${LEVEL_NAMES[v]}">${levelDot(v)}<span>${raw(LEVEL_NAMES[v])}</span><span class="lvc">▾</span></button>${levelMenuOpen ? html`<div class="lvb" data-a="levelMenuClose"></div><div class="lvm" role="menu">${LEVEL_KEYS.map(k => html`<button class="lvi ${LEVEL_CLASS[k]}${k == v ? ' on' : ''}" data-a="levelChoose" data-v="${k}" role="menuitem">${levelDot(k)}<span><b>${raw(LEVEL_NAMES[k])}</b><small class="mu">${raw(LEVEL_SUMMARY[k])}</small></span>${raw(k == v ? '<em>✓</em>' : '')}</button>`)}</div>` : ''}</div>`;
};
A.levelMenuToggle = () => {
  levelMenuOpen = !levelMenuOpen;
  R();
};
A.levelMenuClose = () => {
  levelMenuOpen = false;
  R();
};
const applyLevel = v => {
  try {
    const p = currentCustomProgram();
    let np;
    if (p) {
      if (!p.o)
        return;
      const o = { ...p.o, niv: v };
      np = generateProgram({ ...o, vr: o.vr || 0 });
      p.o = o;
      p.plan = clone(np);
      S.plan = clone(np);
    }
    else {
      np = levelPlan(parseProgram(S.program), v, S.program);
      S.plan = np;
    }
    dropResume();
    S.level = v;
    /* plan nuevo: la próxima rotación (programs/rotation) cuenta desde esta semana */
    S.rotationWeek = S.week;
    S.selectedWeekday = 0;
    S.selectedDay = 0;
    Object.keys(S.doneDays || {}).forEach(k => {
      if (k.indexOf(S.week + '-') == 0)
        delete S.doneDays[k];
    });
    saveState();
    sheet();
    R();
    toast('Nivel ' + LEVEL_NAMES[v].toLowerCase() + ': programa reorganizado');
  }
  catch (e) {
    toast('No se pudo cambiar el nivel');
    R();
  }
};
A.levelChoose = (i, b) => {
  const v = b && b.dataset ? b.dataset.v : '';
  levelMenuOpen = false;
  if (!isLevel(v) || v == S.level) {
    R();
    return;
  }
  if (W) {
    R();
    toast('Termina o descarta el entreno en curso');
    return;
  }
  pendingLevel = v;
  const ed = planEdited();
  const dn = weekStarted();
  const zr = !!pendingResume;
  if (ed || dn || zr) {
    R();
    confirmDialog('Cambiar a nivel ' + LEVEL_NAMES[v].toLowerCase(), 'Se reorganizarán los días del programa para el nivel ' + LEVEL_NAMES[v].toLowerCase() + '.' + (ed ? ' Perderás los cambios que hayas hecho a mano en los días.' : '') + (dn ? ' Se reiniciará el progreso de esta semana.' : '') + (zr ? ' Se descartará el entreno pausado.' : ''), 'levelConfirm', 'Cambiar');
  }
  else
    applyLevel(v);
};
A.levelConfirm = () => {
  if (isLevel(pendingLevel))
    applyLevel(pendingLevel);
};
export const levelSegment = () => html`<div class="lvs">${LEVEL_KEYS.map(k => html`<button class="${LEVEL_CLASS[k]}${k == previewLevel ? ' on' : ''}" data-a="previewChooseLevel" data-v="${k}">${levelDot(k)}<span>${raw(LEVEL_NAMES[k])}</span></button>`)}</div><p class="mu lvn">${raw(LEVEL_DETAILS[previewLevel])}</p>`;
A.previewChooseLevel = (i, b) => {
  const v = b && b.dataset ? b.dataset.v : '';
  if (isLevel(v))
    previewLevel = v;
  A.openProgramPreview(previewProgram);
};
export const levelTag = v => html`<span class="lvt">${levelDot(v)}${raw(LEVEL_NAMES[v])}</span>`;
export const programRow = (n, tag) => html`<span class="pgr"><b class="fs-17">${n}</b>${raw(tag)}</span>`;
