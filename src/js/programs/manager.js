/* ═══ programs/manager ═══
   Lista de programas, vista previa y activación.
   Define: previewProgram, presetRow, presetList  · acciones/registros: 5
*/
import { X } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A } from '../core/registry.js';
import { parseProgram, PROGRAM_NAMES, PROGRAM_NOTES, PROGRAM_PREF } from '../data/library.js';
import { LEVEL_NAMES, LEVEL_PROGRAM_NOTES } from '../data/levels.js';
import { S, saveState, W } from '../core/state.js';
import { confirmDialog, fullPage, pgHead, sheet, sheetToTop } from '../core/ui.js';
import { R } from '../core/render.js';
import { dropResume } from '../workout/resume.js';
import { perWeekText } from '../workout/week.js';
import { programDaysHtml, syncCustomProgram } from './create.js';
import { isLevel, levelPlan, levelSegment, levelTag, previewLevel, programRow, setPreviewLevel } from './levels.js';
import { html, raw } from '../core/html.js';
export let previewProgram = 0;
A.openProgramPreview = (i, b) => {
  previewProgram = i;
  if (b)
    setPreviewLevel(isLevel(S.lv) ? S.lv : 'int');
  if (!isLevel(previewLevel))
    setPreviewLevel('int');
  const act = !S.np && S.cpi < 0 && S.prog == i && previewLevel == S.lv;
  const pl = act ? S.plan : levelPlan(parseProgram(i), previewLevel, i);
  sheet(html`${pgHead(X(PROGRAM_NAMES[i]), 'openPrograms')}<p class="mu" style="margin:-6px 0 10px">${(previewLevel != 'int' && LEVEL_PROGRAM_NOTES[i] && LEVEL_PROGRAM_NOTES[i][previewLevel]) || PROGRAM_NOTES[i] || ''}</p>${levelSegment()}${raw(programDaysHtml(pl))}<div style="height:84px"></div>${act ? '' : (S.cpi < 0 && S.prog == i ? html`<button class="sb pr" data-a="levelChoose" data-v="${previewLevel}" style="padding:16px;font-size:16px;border-radius:16px">Usar nivel ${raw(LEVEL_NAMES[previewLevel].toLowerCase())}</button>` : html`<button class="sb pr" data-a="programSelect" data-i="${i}" style="padding:16px;font-size:16px;border-radius:16px">Cambiar plan de entrenamiento</button>`)}`);
  sheetToTop();
};
/** Fila de un programa predefinido en la lista de Programas. */
const presetRow = i => {
  const act = !S.np && S.cpi < 0 && S.prog == i;
  const pl = act ? S.plan : levelPlan(parseProgram(i), S.lv, i);
  return html`<button class="mb pgc" data-a="openProgramPreview" data-i="${i}"><span style="flex:1;min-width:0">${programRow(PROGRAM_NAMES[i], levelTag(S.lv))}<small>${raw(act ? '<b style="color:var(--at)">Plan actual</b> · ' : '')}${perWeekText(pl)} · ${raw(pl.reduce((s, d) => s + d.ex.length, 0))} ejercicios</small></span>›</button>`;
};
/** Predefinidos según el sexo del perfil (F-05): arriba los preferentes y debajo el resto. Sin sexo elegido, se pregunta. */
const presetList = () => {
  const sx = S.bio && (S.bio.sex == 'M' || S.bio.sex == 'F') ? S.bio.sex : '';
  if (!sx)
    return html`<div class="cd pgsx"><b>¿Hombre o mujer?</b><p class="mu">Así salen primero los programas pensados para ti. Puedes cambiarlo cuando quieras en Perfil.</p><div class="g2"><button data-a="programsSex" data-v="M">Hombre</button><button data-a="programsSex" data-v="F">Mujer</button></div></div><div class="ph">Predefinidos</div>${PROGRAM_NAMES.map((n, i) => presetRow(i))}`;
  const pf = PROGRAM_PREF[sx];
  return html`<div class="ph">Recomendados para ti</div>${pf.map(presetRow)}<div class="ph">Otros programas</div>${PROGRAM_NAMES.map((n, i) => pf.includes(i) ? '' : presetRow(i))}`;
};
A.openPrograms = () => fullPage(html`${pgHead('Programas')}<button class="pr" data-a="createProgram" style="width:100%;margin:0 0 6px;padding:15px;border-radius:16px;font-size:16px">+ Crear programa</button><div class="g2" style="margin:0 0 6px"><button data-a="openImport">Importar</button><button data-a="sharePlan">Compartir plan</button></div>${raw(S.cp.length ? html`<div class="ph">Mis programas</div>${S.cp.map((p, k) => html`<button class="mb pgc" data-a="openOwnProgram" data-i="${k}"><span style="flex:1;min-width:0">${programRow(p.n, p.o && isLevel(p.o.niv) ? levelTag(p.o.niv) : '')}<small>${raw(S.cpi == k ? '<b style="color:var(--at)">Plan actual</b> · ' : '')}${perWeekText(p.plan)} · ${raw(p.plan.reduce((s, d) => s + d.ex.length, 0))} ejercicios</small></span>›</button>`)}` : '')}${presetList()}`);
A.programsSex = (i, b) => {
  const v = b.dataset.v;
  if (v != 'M' && v != 'F')
    return;
  S.bio = S.bio || {};
  S.bio.sex = v;
  saveState();
  A.openPrograms();
};
A.programSelect = i => {
  if (W) {
    toast('Termina o descarta el entreno en curso');
    return;
  }
  previewProgram = i;
  const v = isLevel(previewLevel) ? previewLevel : S.lv;
  if (S.np)
    confirmDialog('¿Empezar con este programa?', 'Empezarás con «' + X(PROGRAM_NAMES[i]) + '», con nivel ' + LEVEL_NAMES[v].toLowerCase() + '. Puedes cambiarlo cuando quieras.', 'programSelectConfirmed', 'Empezar');
  else
    confirmDialog('¿Cambiar de plan?', 'Pasarás a «' + X(PROGRAM_NAMES[i]) + '» con nivel ' + LEVEL_NAMES[v].toLowerCase() + '. Se reiniciará el progreso de la semana.', 'programSelectConfirmed', 'Cambiar');
};
A.programSelectConfirmed = () => {
  syncCustomProgram();
  dropResume();
  const v = isLevel(previewLevel) ? previewLevel : (isLevel(S.lv) ? S.lv : 'int');
  S.lv = v;
  S.prog = previewProgram;
  S.cpi = -1;
  delete S.np;
  S.plan = levelPlan(parseProgram(previewProgram), v, previewProgram);
  S.wk = 1;
  S.sl = 0;
  S.sel = 0;
  S.done = {};
  saveState();
  sheet();
  R();
};
