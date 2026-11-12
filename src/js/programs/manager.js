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
    setPreviewLevel(isLevel(S.level) ? S.level : 'int');
  if (!isLevel(previewLevel))
    setPreviewLevel('int');
  const act = !S.noProgram && S.ownProgramIndex < 0 && S.program == i && previewLevel == S.level;
  const pl = act ? S.plan : levelPlan(parseProgram(i), previewLevel, i);
  sheet(html`${pgHead(X(PROGRAM_NAMES[i]), 'openPrograms')}<p class="mu m-n6-0-10">${(previewLevel != 'int' && LEVEL_PROGRAM_NOTES[i] && LEVEL_PROGRAM_NOTES[i][previewLevel]) || PROGRAM_NOTES[i] || ''}</p>${levelSegment()}${raw(programDaysHtml(pl))}<div class="h-84"></div>${act ? '' : (S.ownProgramIndex < 0 && S.program == i ? html`<button class="sb pr p-16 fs-16 r-16" data-a="levelChoose" data-v="${previewLevel}">Usar nivel ${raw(LEVEL_NAMES[previewLevel].toLowerCase())}</button>` : html`<button class="sb pr p-16 fs-16 r-16" data-a="programSelect" data-i="${i}">Cambiar plan de entrenamiento</button>`)}`);
  sheetToTop();
};
/** Fila de un programa predefinido en la lista de Programas. */
const presetRow = i => {
  const act = !S.noProgram && S.ownProgramIndex < 0 && S.program == i;
  const pl = act ? S.plan : levelPlan(parseProgram(i), S.level, i);
  return html`<button class="mb pgc" data-a="openProgramPreview" data-i="${i}"><span class="fx-1 minw-0">${programRow(PROGRAM_NAMES[i], levelTag(S.level))}<small>${raw(act ? '<b class="c-at">Plan actual</b> · ' : '')}${perWeekText(pl)} · ${raw(pl.reduce((s, d) => s + d.ex.length, 0))} ejercicios</small></span>›</button>`;
};
/** Predefinidos según el sexo del perfil (F-05): arriba los preferentes y debajo el resto. Sin sexo elegido, se pregunta. */
const presetList = () => {
  const sx = S.biometrics && (S.biometrics.sex == 'M' || S.biometrics.sex == 'F') ? S.biometrics.sex : '';
  if (!sx)
    return html`<div class="cd pgsx"><b>¿Hombre o mujer?</b><p class="mu">Así salen primero los programas pensados para ti. Puedes cambiarlo cuando quieras en Perfil.</p><div class="g2"><button data-a="programsSex" data-v="M">Hombre</button><button data-a="programsSex" data-v="F">Mujer</button></div></div><div class="ph">Predefinidos</div>${PROGRAM_NAMES.map((n, i) => presetRow(i))}`;
  const pf = PROGRAM_PREF[sx];
  return html`<div class="ph">Recomendados para ti</div>${pf.map(presetRow)}<div class="ph">Otros programas</div>${PROGRAM_NAMES.map((n, i) => pf.includes(i) ? '' : presetRow(i))}`;
};
A.openPrograms = () => fullPage(html`${pgHead('Programas')}<button class="pr w-full m-0-0-6 p-15 r-16 fs-16" data-a="createProgram">+ Crear programa</button><div class="g2 m-0-0-6"><button data-a="openImport">Importar</button><button data-a="sharePlan">Compartir plan</button></div>${raw(S.ownPrograms.length ? html`<div class="ph">Mis programas</div>${S.ownPrograms.map((p, k) => html`<button class="mb pgc" data-a="openOwnProgram" data-i="${k}"><span class="fx-1 minw-0">${programRow(p.n, p.o && isLevel(p.o.niv) ? levelTag(p.o.niv) : '')}<small>${raw(S.ownProgramIndex == k ? '<b class="c-at">Plan actual</b> · ' : '')}${perWeekText(p.plan)} · ${raw(p.plan.reduce((s, d) => s + d.ex.length, 0))} ejercicios</small></span>›</button>`)}` : '')}${presetList()}`);
A.programsSex = (i, b) => {
  const v = b.dataset.v;
  if (v != 'M' && v != 'F')
    return;
  S.biometrics = S.biometrics || {};
  S.biometrics.sex = v;
  saveState();
  A.openPrograms();
};
A.programSelect = i => {
  if (W) {
    toast('Termina o descarta el entreno en curso');
    return;
  }
  previewProgram = i;
  const v = isLevel(previewLevel) ? previewLevel : S.level;
  if (S.noProgram)
    confirmDialog('¿Empezar con este programa?', 'Empezarás con «' + X(PROGRAM_NAMES[i]) + '», con nivel ' + LEVEL_NAMES[v].toLowerCase() + '. Puedes cambiarlo cuando quieras.', 'programSelectConfirmed', 'Empezar');
  else
    confirmDialog('¿Cambiar de plan?', 'Pasarás a «' + X(PROGRAM_NAMES[i]) + '» con nivel ' + LEVEL_NAMES[v].toLowerCase() + '. Se reiniciará el progreso de la semana.', 'programSelectConfirmed', 'Cambiar');
};
A.programSelectConfirmed = () => {
  syncCustomProgram();
  dropResume();
  const v = isLevel(previewLevel) ? previewLevel : (isLevel(S.level) ? S.level : 'int');
  S.level = v;
  S.program = previewProgram;
  S.ownProgramIndex = -1;
  delete S.noProgram;
  S.plan = levelPlan(parseProgram(previewProgram), v, previewProgram);
  S.week = 1;
  S.selectedWeekday = 0;
  S.selectedDay = 0;
  S.doneDays = {};
  saveState();
  sheet();
  R();
};
