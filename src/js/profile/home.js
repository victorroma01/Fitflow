/* ═══ profile/home ═══
   Pestaña Perfil (foto, usuario, plan, medidas, logros, exportar, datos biométricos y, para el admin, Administración) y
   «Borrar todos los datos». La foto de perfil se sube a la cuenta solo con consentimiento (pf.pc: cuándo se dio).
   Define: pfSummary, profileHead, bioSex, bioNumber, bioChoices, bioCard, planCard, firstUseDay, analysisFrom, analysisLine, profileTab  · acciones/registros: 8
*/
import { APPV, clampInt, dayKey, fmtDateShort, roundInt, safeImage, typedNum } from '../core/util.js';
import { Store } from '../core/store.js';
import { clearSavedState, reloadApp } from '../core/persist.js';
import { A, C } from '../core/registry.js';
import { PROGRAM_NAMES } from '../data/library.js';
import { S, saveState } from '../core/state.js';
import { toast } from '../core/toast.js';
import { icon } from '../core/icons.js';
import { confirmDialog, dialog, linkRow } from '../core/ui.js';
import { R } from '../core/render.js';
import { WIP_KEY } from '../workout/resume.js';
import { currentCustomProgram, levelsActive, levelTag, programRow } from '../programs/levels.js';
import { ACTIVITY_LEVELS, applyDiet, BIO_RANGES, GOAL_DIET, GOAL_LABELS, tdee } from '../nutrition/diet.js';
import { ACHIEVEMENTS } from '../extras/achievements.js';
import { acctName, isAdmin, signedIn } from '../cloud/session.js';
import { wipeCloudData } from '../cloud/sync.js';
import { wipeCloudBackup } from '../cloud/backup.js';
import { reportsLine } from '../system/report.js';
import { html, raw } from '../core/html.js';
import { perWeekText } from '../workout/week.js';
/* cabecera de un desplegable de Perfil con su icono y una línea que dice qué hay dentro, como las filas de Medidas o Logros */
const pfSummary = (ic, t, s) => html`<summary class="pfs">${icon(ic, 30)}<span><b>${raw(t)}</b><br><small>${s}</small></span></summary>`;
function profileHead() {
  const p = S.profile;
  const img = safeImage(p.img);
  const pic = html`${img ? html`<img src="${img}" alt="" class="w-full h-full of-cover d-block">` : ''}${img ? '' : icon('camera', 36)}`;
  /* sin consentimiento, la foto abre antes el aviso (A.photoConsentAsk); con él, el selector de fotos */
  const av = +p.pc > 0 ? html`<label class="av cur-pointer fs-0" aria-label="Foto de perfil">${raw(pic)}<input type="file" accept="image/*" data-c="photoFile" hidden id="avf"></label>` : html`<button class="av fs-0 p-0" data-a="photoConsentAsk" aria-label="Foto de perfil">${raw(pic)}</button><input type="file" accept="image/*" data-c="photoFile" hidden id="avf">`;
  return html`<div class="hd"><h1>Perfil</h1></div><div class="cd pfh">${raw(av)}<b class="pfn">${acctName()}</b>${isAdmin() ? html`<small class="pfa">Administrador</small>` : ''}${img ? html`<button class="pfq" data-a="photoDeleteAsk">Quitar foto</button>` : ''}</div>`;
}
A.resetAllConfirmed = async () => {
  /* primero en la nube: si no, la próxima sincronización los volvería a bajar */
  if (signedIn())
    try {
      toast('Borrando…');
      await wipeCloudData();
      await wipeCloudBackup();
    }
    catch (e) {
      toast(e.code == 'NETWORK' ? 'Sin conexión: para borrar también los datos de tu cuenta hace falta internet' : 'No se pudieron borrar los datos de tu cuenta (' + e.code + ')');
      return;
    }
  clearSavedState();
  Store.del(WIP_KEY);
  reloadApp();
};
A.resetAllAsk = () => confirmDialog('¿Borrar todos los datos?', 'Se eliminarán tus programas, entrenos, comidas, medidas y peso, en este móvil y en tu cuenta, y también la copia de seguridad de la nube. Tu usuario se mantiene. No se puede deshacer.', 'resetAllConfirmed', 'Borrar todo');
/* el sexo (con «Sin indicar» mientras no se haya elegido) */
const bioSex = bio => html`<label>Sexo</label><select data-c="bioField" data-i="sex" aria-label="Sexo">${raw(bio.sex == 'M' || bio.sex == 'F' ? '' : '<option value="" selected disabled>Sin indicar</option>')}<option value="M"${bio.sex == 'M' ? ' selected' : ''}>Hombre</option><option value="F"${bio.sex == 'F' ? ' selected' : ''}>Mujer</option></select>`;
/* un dato con número: edad, altura o peso */
const bioNumber = (bio, label, key, unit) => html`<label>${raw(label)}</label><input type="number" inputmode="decimal" data-c="bioField" data-i="${key}" value="${bio[key] || ''}" placeholder="${unit}" aria-label="${label}">`;
/* actividad diaria y objetivo físico (sin elegir, el segundo de cada lista) */
const bioChoices = bio => html`<label>Actividad diaria</label><select data-c="bioField" data-i="act" aria-label="Actividad diaria">${ACTIVITY_LEVELS.map((a, i) => html`<option value="${i}"${(bio.act == null ? 1 : bio.act) == i ? ' selected' : ''}>${raw(a[0])} · ${raw(a[1])}</option>`)}</select><label>Objetivo físico</label><select data-c="bioField" data-i="goal" aria-label="Objetivo físico">${GOAL_LABELS.map((g, i) => html`<option value="${i}"${(bio.goal == null ? 1 : bio.goal) == i ? ' selected' : ''}>${raw(g)}</option>`)}</select>`;
/* Perfil → Datos biométricos, con el metabolismo basal y el gasto diario cuando hay edad, altura y peso */
function bioCard() {
  const bio = S.biometrics;
  const spend = tdee();
  const energy = spend ? html`<p><b>Metabolismo basal: ${roundInt(spend.bm)} kcal</b><br><small>Gasto diario estimado: ${roundInt(spend.td)} kcal (fórmula Mifflin-St Jeor)</small></p>` : '<p><small>Rellena edad, altura y peso para calcular tu metabolismo basal.</small></p>';
  return html`<details class="cd">${pfSummary('bio', 'Datos biométricos', 'Edad, altura, peso, actividad y objetivo')}${bioSex(bio)}${raw(bioNumber(bio, 'Edad', 'age', 'años'))}${raw(bioNumber(bio, 'Altura', 'h', 'cm'))}${raw(bioNumber(bio, 'Peso', 'w', 'kg'))}${bioChoices(bio)}${raw(energy)}</details>`;
}
const planCard = () => {
  /* sin programa elegido (cuenta nueva; I-24) */
  if (S.noProgram)
    return html`<details class="cd">${pfSummary('prog', 'Plan de entrenamiento', 'Aún sin programa')}<p class="mu m-10-0-0 fs-14">Elige uno de los predefinidos o crea el tuyo.</p><button class="pr w-full mt-12" data-a="openPrograms">Seleccionar programa</button></details>`;
  const p = currentCustomProgram();
  const nm = p ? p.n : PROGRAM_NAMES[S.program];
  return html`<details class="cd">${pfSummary('prog', 'Plan de entrenamiento', nm + ' · ' + perWeekText(S.plan || []))}<div class="mt-10">${programRow(nm, levelsActive() ? levelTag(S.level) : '')}</div><button data-a="openPrograms" class="w-full mt-12">Cambiar programa o nivel</button></details>`;
};
/** Primer día con datos (entrenos, comidas, peso o medidas), o '' si aún no hay ninguno. */
const firstUseDay = () => {
  let m = '';
  const t = d => {
    if (typeof d == 'string' && /^\d{4}-\d\d-\d\d$/.test(d) && (!m || d < m))
      m = d;
  };
  (S.logs || []).forEach(l => l && t(l.d));
  Object.keys(S.meals || {}).forEach(t);
  (S.weightLog || []).forEach(p => p && t(p.d));
  (S.measures || []).forEach(p => p && t(p.d));
  return m;
};
/** Análisis mensual (F-26): [primer día con datos, día desde el que se puede ver (un mes después)], o ['', ''] sin datos. */
export const analysisFrom = () => {
  const f = firstUseDay();
  if (!f)
    return ['', ''];
  const t = new Date(f + 'T12:00:00');
  t.setDate(t.getDate() + 30);
  return [f, dayKey(t)];
};
const analysisLine = () => {
  const a = analysisFrom()[1];
  return !a ? 'Disponible tras tu primer mes de uso' : a > dayKey(new Date()) ? 'Disponible desde el ' + fmtDateShort(a, { day: 'numeric', month: 'long' }) : 'Entrenos, peso y alimentación de cada mes, también en PDF';
};
export function profileTab() {
  const a = S.achievements || {};
  const nd = ACHIEVEMENTS.filter(x => a[x[0]]).length;
  return html`${profileHead()}${planCard()}${linkRow('ruler', 'Medidas', 'Cintura, brazo, pecho… y cómo cambian', 'openMeasures')}${linkRow('trf', 'Logros', nd + ' de ' + ACHIEVEMENTS.length + ' conseguidos', 'openAchievements')}${linkRow('bar', 'Ver análisis mensual', analysisLine(), 'openAnalysis')}${linkRow('dwn', 'Exportar datos (CSV)', 'Entrenos, series, peso, medidas, comidas y cardio', 'openCsvExport')}${bioCard()}${linkRow('bug', 'Fallos y sugerencias', reportsLine(), 'openMyReports')}${isAdmin() ? linkRow('adm', 'Administración', 'Fallos y sugerencias, contraseñas temporales y cuentas', 'openAdmin') : ''}${linkRow('gear', 'Ajustes', 'Cuenta, apariencia, unidades, sonido, copias y más', 'openSettings')}<div class="brand" aria-label="${'StrataFit, versión ' + APPV}"><span class="bw">STRATAFIT</span><span class="bv">V${APPV}</span></div>`;
}
/* — manejadores de esta función (registros A / C / U) — */
C.bioField = e => {
  const k = e.dataset.i;
  /* edad, altura y peso, solo entre valores posibles (los de la bienvenida); la actividad y el objetivo, de su lista */
  if (BIO_RANGES[k]) {
    const v = typedNum(e.value);
    if (!(v >= BIO_RANGES[k][0] && v <= BIO_RANGES[k][1])) {
      toast('Escribe un valor entre ' + BIO_RANGES[k][0] + ' y ' + BIO_RANGES[k][1]);
      R();
      return;
    }
    S.biometrics[k] = String(v);
  }
  else if (k == 'act' || k == 'goal')
    S.biometrics[k] = String(clampInt(e.value, 0, k == 'act' ? 4 : 3, 1));
  else
    S.biometrics[k] = e.value;
  if (k == 'goal')
    S.nutritionGoals.dt = GOAL_DIET[+e.value];
  /* elegir el objetivo físico es elegir un plan: recalcula aunque las kcal estuvieran a mano; el resto de datos, no */
  applyDiet(k == 'goal');
  saveState();
  R();
};
C.photoFile = e => {
  const f = e.files[0];
  if (!f)
    return;
  /* una foto de más de 30 MB no hace falta para un avatar de 160 px y podría agotar la memoria del móvil */
  if (!/^image\//.test(f.type || 'image/') || f.size > 30e6) {
    toast('Elige una foto (de menos de 30 MB)');
    return;
  }
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const q = Math.min(im.width, im.height);
      c.getContext('2d').drawImage(im, (im.width - q) / 2, (im.height - q) / 2, q, q, 0, 0, 160, 160);
      S.profile.img = c.toDataURL('image/jpeg', .7);
      S.profile.pc = S.profile.pc || Date.now();
      saveState();
      R();
    };
    im.onerror = () => toast('No se ha podido leer la foto');
    im.src = r.result;
  };
  r.readAsDataURL(f);
};
/* consentimiento antes de la primera foto: se sube a la cuenta (cloud/sync, documento private/avatar) */
A.photoConsentAsk = () => dialog('Foto de perfil', 'La foto se guarda en tu cuenta, en la nube (Firebase), para verla en tus otros móviles. Solo la ves tú y puedes quitarla cuando quieras.', [['Cancelar', 'doNothing', ''], ['Aceptar y elegir', 'photoConsentOk', 'pr']]);
A.photoConsentOk = () => {
  S.profile.pc = Date.now();
  saveState();
  const f = document.getElementById('avf');
  f && f.click();
};
A.photoDeleteAsk = () => confirmDialog('¿Quitar la foto?', 'Se borra de este móvil y de tu cuenta.', 'photoDelete', 'Quitar');
A.photoDelete = () => {
  delete S.profile.img;
  delete S.profile.pc;
  saveState();
  R();
};
