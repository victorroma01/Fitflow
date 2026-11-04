/* ═══ profile/home ═══
   Pestaña Perfil (foto, usuario, plan, medidas, logros, exportar, datos biométricos y, para el admin, Administración) y
   «Borrar todos los datos». La foto de perfil se sube a la cuenta solo con consentimiento (pf.pc: cuándo se dio).
   Define: pfSummary, profileHead, bioCard, planCard, firstUseDay, analysisFrom, analysisLine, profileTab  · acciones/registros: 8
*/
import { APPV, dayKey, fmtDateShort, roundInt, safeImage } from '../core/util.js';
import { Store } from '../core/store.js';
import { clearSavedState } from '../core/persist.js';
import { A, C } from '../core/registry.js';
import { PROGRAM_NAMES } from '../data/library.js';
import { S, saveState } from '../core/state.js';
import { toast } from '../core/toast.js';
import { icon } from '../core/icons.js';
import { confirmDialog, dialog, linkRow } from '../core/ui.js';
import { R } from '../core/render.js';
import { WIP_KEY } from '../workout/resume.js';
import { currentCustomProgram, levelsActive, levelTag, programRow } from '../programs/levels.js';
import { ACTIVITY_LEVELS, applyDiet, GOAL_DIET, GOAL_LABELS, tdee } from '../nutrition/diet.js';
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
  const p = S.pf;
  const img = safeImage(p.img);
  const pic = html`${img ? html`<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` : ''}${img ? '' : icon('camera', 36)}`;
  /* sin consentimiento, la foto abre antes el aviso (A.avc); con él, el selector de fotos */
  const av = +p.pc > 0 ? html`<label class="av" style="cursor:pointer;font-size:0" aria-label="Foto de perfil">${raw(pic)}<input type="file" accept="image/*" data-c="ph" hidden id="avf"></label>` : html`<button class="av" data-a="avc" style="font-size:0;padding:0" aria-label="Foto de perfil">${raw(pic)}</button><input type="file" accept="image/*" data-c="ph" hidden id="avf">`;
  return html`<div class="hd"><h1>Perfil</h1></div><div class="cd pfh">${raw(av)}<b class="pfn">${acctName()}</b>${isAdmin() ? html`<small class="pfa">Administrador</small>` : ''}${img ? html`<button class="pfq" data-a="avdel">Quitar foto</button>` : ''}</div>`;
}
A.zrs = async () => {
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
  location.reload();
};
A.rst = () => confirmDialog('¿Borrar todos los datos?', 'Se eliminarán tus programas, entrenos, comidas, medidas y peso, en este móvil y en tu cuenta, y también la copia de seguridad de la nube. Tu usuario se mantiene. No se puede deshacer.', 'zrs', 'Borrar todo');
function bioCard() {
  const b = S.bio;
  const t = tdee();
  const f = (l, k, u) => html`<label>${raw(l)}</label><input type="number" inputmode="decimal" data-c="bio" data-i="${k}" value="${b[k] || ''}" placeholder="${u}" aria-label="${l}">`;
  return html`<details class="cd">${pfSummary('bio', 'Datos biométricos', 'Edad, altura, peso, actividad y objetivo')}<label>Sexo</label><select data-c="bio" data-i="sex" aria-label="Sexo">${raw(b.sex == 'M' || b.sex == 'F' ? '' : '<option value="" selected disabled>Sin indicar</option>')}<option value="M"${b.sex == 'M' ? ' selected' : ''}>Hombre</option><option value="F"${b.sex == 'F' ? ' selected' : ''}>Mujer</option></select>${raw(f('Edad', 'age', 'años'))}${raw(f('Altura', 'h', 'cm'))}${raw(f('Peso', 'w', 'kg'))}<label>Actividad diaria</label><select data-c="bio" data-i="act" aria-label="Actividad diaria">${ACTIVITY_LEVELS.map((a, i) => html`<option value="${i}"${(b.act == null ? 1 : b.act) == i ? ' selected' : ''}>${raw(a[0])} · ${raw(a[1])}</option>`)}</select><label>Objetivo físico</label><select data-c="bio" data-i="goal" aria-label="Objetivo físico">${GOAL_LABELS.map((g, i) => html`<option value="${i}"${(b.goal == null ? 1 : b.goal) == i ? ' selected' : ''}>${raw(g)}</option>`)}</select>${raw(t ? html`<p><b>Metabolismo basal: ${roundInt(t.bm)} kcal</b><br><small>Gasto diario estimado: ${roundInt(t.td)} kcal (fórmula Mifflin-St Jeor)</small></p>` : '<p><small>Rellena edad, altura y peso para calcular tu metabolismo basal.</small></p>')}</details>`;
}
const planCard = () => {
  const p = currentCustomProgram();
  const nm = p ? p.n : PROGRAM_NAMES[S.prog];
  return html`<details class="cd">${pfSummary('prog', 'Plan de entrenamiento', nm + ' · ' + perWeekText(S.plan || []))}<div style="margin-top:10px">${programRow(nm, levelsActive() ? levelTag(S.lv) : '')}</div><button data-a="pg" style="width:100%;margin-top:12px">Cambiar programa o nivel</button></details>`;
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
  (S.wl || []).forEach(p => p && t(p.d));
  (S.ms || []).forEach(p => p && t(p.d));
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
  const a = S.ach || {};
  const nd = ACHIEVEMENTS.filter(x => a[x[0]]).length;
  return html`${profileHead()}${planCard()}${linkRow('ruler', 'Medidas', 'Cintura, brazo, pecho… y cómo cambian', 'f2ms')}${linkRow('trf', 'Logros', nd + ' de ' + ACHIEVEMENTS.length + ' conseguidos', 'f2lg')}${linkRow('bar', 'Ver análisis mensual', analysisLine(), 'ana')}${linkRow('dwn', 'Exportar datos (CSV)', 'Entrenos, series, peso, medidas, comidas y cardio', 'f2ex')}${bioCard()}${linkRow('bug', 'Fallos y sugerencias', reportsLine(), 'rpl')}${isAdmin() ? linkRow('adm', 'Administración', 'Fallos y sugerencias, contraseñas temporales y cuentas', 'adm') : ''}${linkRow('gear', 'Ajustes', 'Cuenta, apariencia, unidades, sonido, copias y más', 'zaj')}<div class="brand" aria-label="${'StrataFit, versión ' + APPV}"><span class="bw">STRATAFIT</span><span class="bv">V${APPV}</span></div>`;
}
/* — manejadores de esta función (registros A / C / U) — */
C.bio = e => {
  const k = e.dataset.i;
  S.bio[k] = e.value;
  if (k == 'goal')
    S.nu.dt = GOAL_DIET[+e.value];
  /* elegir el objetivo físico es elegir un plan: recalcula aunque las kcal estuvieran a mano; el resto de datos, no */
  applyDiet(k == 'goal');
  saveState();
  R();
};
C.ph = e => {
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
      S.pf.img = c.toDataURL('image/jpeg', .7);
      S.pf.pc = S.pf.pc || Date.now();
      saveState();
      R();
    };
    im.onerror = () => toast('No se ha podido leer la foto');
    im.src = r.result;
  };
  r.readAsDataURL(f);
};
/* consentimiento antes de la primera foto: se sube a la cuenta (cloud/sync, documento private/avatar) */
A.avc = () => dialog('Foto de perfil', 'La foto se guarda en tu cuenta, en la nube (Firebase), para verla en tus otros móviles. Solo la ves tú y puedes quitarla cuando quieras.', [['Cancelar', 'zno', ''], ['Aceptar y elegir', 'avok', 'pr']]);
A.avok = () => {
  S.pf.pc = Date.now();
  saveState();
  const f = document.getElementById('avf');
  f && f.click();
};
A.avdel = () => confirmDialog('¿Quitar la foto?', 'Se borra de este móvil y de tu cuenta.', 'avdl', 'Quitar');
A.avdl = () => {
  delete S.pf.img;
  delete S.pf.pc;
  saveState();
  R();
};
