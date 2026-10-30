/* ═══ programs/manager ═══
   Lista de programas, vista previa y activación.
   Define: previewProgram  · acciones/registros: 4
*/
import { fmtMinSec, X } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { parseProgram, PROGRAM_NAMES, PROGRAM_NOTES } from '../data/library.js';
import { LEVEL_NAMES, LEVEL_PROGRAM_NOTES } from '../data/levels.js';
import { S, saveState, W } from '../core/state.js';
import { confirmDialog, fullPage, pgHead, sheet, sheetToTop } from '../core/ui.js';
import { R } from '../core/render.js';
import { dropResume } from '../workout/resume.js';
import { restOf } from '../workout/rest.js';
import { targetText, weeklySetsCard } from '../workout/targets.js';
import { syncCustomProgram } from './create.js';
import { isLevel, levelPlan, levelSegment, levelTag, previewLevel, programRow, setPreviewLevel } from './levels.js';
import { html, raw } from '../core/html.js';
export let previewProgram = 0;
A.pv = (i, b) => {
  previewProgram = i;
  if (b)
    setPreviewLevel(isLevel(S.lv) ? S.lv : 'int');
  if (!isLevel(previewLevel))
    setPreviewLevel('int');
  const act = S.cpi < 0 && S.prog == i && previewLevel == S.lv;
  const pl = act ? S.plan : levelPlan(parseProgram(i), previewLevel, i);
  sheet(html`${pgHead(X(PROGRAM_NAMES[i]), 'pg')}<p class="mu" style="margin:-6px 0 10px">${(previewLevel != 'int' && LEVEL_PROGRAM_NOTES[i] && LEVEL_PROGRAM_NOTES[i][previewLevel]) || PROGRAM_NOTES[i] || ''}</p>${levelSegment()}${weeklySetsCard(pl)}${pl.map((d, j) => html`<div class="cd" style="margin:8px 0"><div class="row"><b>Día ${raw(j + 1)} · ${d.n}</b>${d.ex.length ? html`<small>${raw(d.ex.reduce((s, e) => s + e.s, 0))} series</small>` : ''}</div>${raw(d.ex.length ? d.ex.map(e => html`<div class="mu" style="font-size:13px;margin-top:3px">${raw(e.b ? '<b style="color:#f59e0b;font-size:11px">SS </b>' : '')}${e.n} · ${raw(e.s)} × ${raw(targetText(e))} · ${raw(fmtMinSec(restOf(e)))}</div>`).join('') : '<div class="mu" style="font-size:13px;margin-top:3px">Descanso</div>')}</div>`)}<div style="height:84px"></div>${act ? '' : (S.cpi < 0 && S.prog == i ? html`<button class="sb pr" data-a="lvs" data-v="${previewLevel}" style="padding:16px;font-size:16px;border-radius:16px">Usar nivel ${raw(LEVEL_NAMES[previewLevel].toLowerCase())}</button>` : html`<button class="sb pr" data-a="sp2" data-i="${i}" style="padding:16px;font-size:16px;border-radius:16px">Cambiar plan de entrenamiento</button>`)}`);
  sheetToTop();
};
A.pg = () => fullPage(html`${pgHead('Programas')}<button class="pr" data-a="cpn" style="width:100%;margin:0 0 6px;padding:15px;border-radius:16px;font-size:16px">+ Crear programa</button><div class="g2" style="margin:0 0 6px"><button data-a="pgi">Importar</button><button data-a="pgs0">Compartir plan</button></div>${raw(S.cp.length ? html`<div class="ph">Mis programas</div>${S.cp.map((p, k) => html`<button class="mb pgc" data-a="cpv" data-i="${k}"><span style="flex:1;min-width:0">${programRow(p.n, p.o && isLevel(p.o.niv) ? levelTag(p.o.niv) : '')}<small>${raw(S.cpi == k ? '<b style="color:var(--a1)">Plan actual</b> · ' : '')}${p.plan.filter(d => d.ex.length).length} entrenos · ${raw(p.plan.reduce((s, d) => s + d.ex.length, 0))} ejercicios</small></span>›</button>`)}<div class="ph">Predefinidos</div>` : '<div class="ph">Predefinidos</div>')}${PROGRAM_NAMES.map((n, i) => {
  const act = S.cpi < 0 && S.prog == i;
  const pl = act ? S.plan : levelPlan(parseProgram(i), S.lv, i);
  return html`<button class="mb pgc" data-a="pv" data-i="${i}"><span style="flex:1;min-width:0">${programRow(n, levelTag(S.lv))}<small>${raw(act ? '<b style="color:var(--a1)">Plan actual</b> · ' : '')}${pl.filter(d => d.ex.length).length} entrenos · ${raw(pl.reduce((s, d) => s + d.ex.length, 0))} ejercicios</small></span>›</button>`;
})}`);
A.sp2 = i => {
  if (W) {
    toast('Termina o descarta el entreno en curso');
    return;
  }
  previewProgram = i;
  const v = isLevel(previewLevel) ? previewLevel : S.lv;
  confirmDialog('¿Cambiar de plan?', 'Pasarás a «' + X(PROGRAM_NAMES[i]) + '» con nivel ' + LEVEL_NAMES[v].toLowerCase() + '. Se reiniciará el progreso de la semana.', 'sp2c', 'Cambiar');
};
A.sp2c = () => {
  syncCustomProgram();
  dropResume();
  const v = isLevel(previewLevel) ? previewLevel : (isLevel(S.lv) ? S.lv : 'int');
  S.lv = v;
  S.prog = previewProgram;
  S.cpi = -1;
  S.plan = levelPlan(parseProgram(previewProgram), v, previewProgram);
  S.wk = 1;
  S.sel = 0;
  S.done = {};
  saveState();
  sheet();
  R();
};
