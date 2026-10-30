/* ═══ profile/home ═══
   Pestaña Perfil y borrado de datos.
   Define: profileBase, bioCard, planCard, profileTab  · acciones/registros: 2
*/
import { APPV, roundInt, safeImage } from '../core/util.js';
import { Store } from '../core/store.js';
import { errorLog } from '../core/errors.js';
import { clearSavedState } from '../core/persist.js';
import { A, C } from '../core/registry.js';
import { PROGRAM_NAMES } from '../data/library.js';
import { S, saveState } from '../core/state.js';
import { icon } from '../core/icons.js';
import { confirmDialog, linkRow } from '../core/ui.js';
import { R } from '../core/render.js';
import { WIP_KEY } from '../workout/resume.js';
import { currentCustomProgram, levelsActive, levelTag, programRow } from '../programs/levels.js';
import { ACTIVITY_LEVELS, applyDiet, GOAL_DIET, GOAL_LABELS, tdee } from '../nutrition/diet.js';
import { accentSwatches, glassCard, themeSegment } from './appearance.js';
import { unitsCard } from './units.js';
import { alertSettings } from './feedback.js';
import { backupAge, plural } from '../system/backup.js';
import { offlineNote } from '../system/updates.js';
import { ACHIEVEMENTS } from '../extras/achievements.js';
import { html, raw } from '../core/html.js';
function profileBase() {
  const p = S.pf;
  const img = safeImage(p.img);
  return html`<div class="hd"><h1>Perfil</h1></div><div class="cd"><label class="av" style="cursor:pointer;font-size:0">${img ? html`<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` : ''}${img ? '' : icon('camera', 36)}<input type="file" accept="image/*" data-c="ph" hidden></label>${[['Nombre', 'name'], ['Email', 'email'], ['Teléfono', 'tel']].map(x => html`<label>${raw(x[0])}</label><input data-c="pf" data-i="${x[1]}" value="${p[x[1]] || ''}" aria-label="${x[0]}">`)}</div>${bioCard()}<details class="cd"><summary>Ajustes</summary><label>Apariencia</label>${themeSegment()}${glassCard()}<label>Color de acento</label>${accentSwatches()}${unitsCard()}<label><input type="checkbox" style="width:auto" ${S.notif ? 'checked' : ''} data-c="nt"> Notificaciones activadas</label><label><input type="checkbox" style="width:auto" ${S.snd === 0 ? '' : 'checked'} data-c="snd"> Sonidos del descanso</label><button data-a="zsnd" style="width:100%;margin-top:8px">Probar sonido</button>${alertSettings()}<button data-a="zbk" style="width:100%;margin-top:12px">Copia de seguridad</button><small class="mu" style="display:block;margin-top:6px">${raw(backupAge())}</small>${offlineNote()}<button data-a="updChk" style="width:100%;margin-top:12px">Comprobar actualizaciones</button><button data-a="diag" style="width:100%;margin-top:12px">Diagnóstico${raw(errorLog().length ? ' · ' + plural(errorLog().length, 'error registrado', 'errores registrados') : '')}</button><button data-a="rst" style="width:100%;margin-top:14px;color:var(--c)">Borrar todos los datos</button></details><p class="ver v1">StrataFit · versión ${raw(APPV)}</p><p class="ver v2">© 2026 V. M. Rodriguez Mazuelas. Todos los derechos reservados.</p><p class="ver v3">Los consejos de entrenamiento y nutrición son orientativos y no sustituyen el consejo de un profesional sanitario.</p>`;
}
A.zrs = () => {
  clearSavedState();
  Store.del(WIP_KEY);
  location.reload();
};
A.rst = () => confirmDialog('¿Borrar todos los datos?', 'Se eliminarán tu perfil, programas, registros y peso. No se puede deshacer.', 'zrs', 'Borrar todo');
function bioCard() {
  const b = S.bio;
  const t = tdee();
  const f = (l, k, u) => html`<label>${raw(l)}</label><input type="number" inputmode="decimal" data-c="bio" data-i="${k}" value="${b[k] || ''}" placeholder="${u}" aria-label="${l}">`;
  return html`<details class="cd"><summary>Datos biométricos</summary><label>Sexo</label><select data-c="bio" data-i="sex" aria-label="Sexo"><option value="M">Hombre</option><option value="F"${b.sex == 'F' ? ' selected' : ''}>Mujer</option></select>${raw(f('Edad', 'age', 'años'))}${raw(f('Altura', 'h', 'cm'))}${raw(f('Peso', 'w', 'kg'))}<label>Actividad diaria</label><select data-c="bio" data-i="act" aria-label="Actividad diaria">${ACTIVITY_LEVELS.map((a, i) => html`<option value="${i}"${(b.act == null ? 1 : b.act) == i ? ' selected' : ''}>${raw(a[0])} · ${raw(a[1])}</option>`)}</select><label>Objetivo físico</label><select data-c="bio" data-i="goal" aria-label="Objetivo físico">${GOAL_LABELS.map((g, i) => html`<option value="${i}"${(b.goal == null ? 1 : b.goal) == i ? ' selected' : ''}>${raw(g)}</option>`)}</select>${raw(t ? html`<p><b>Metabolismo basal: ${roundInt(t.bm)} kcal</b><br><small>Gasto diario estimado: ${roundInt(t.td)} kcal (fórmula Mifflin-St Jeor)</small></p>` : '<p><small>Rellena edad, altura y peso para calcular tu metabolismo basal.</small></p>')}</details>`;
}
const planCard = () => {
  const p = currentCustomProgram();
  const nm = p ? p.n : PROGRAM_NAMES[S.prog];
  const pl = (S.plan || []).filter(d => d.ex.length).length;
  return html`<details class="cd"><summary>Plan de entrenamiento</summary><div style="margin-top:10px">${programRow(nm, levelsActive() ? levelTag(S.lv) : '')}<small class="mu">${raw(pl)}${pl == 1 ? ' entreno' : ' entrenos'} por semana</small></div><button data-a="pg" style="width:100%;margin-top:12px">Cambiar programa o nivel</button></details>`;
};
export function profileTab() {
  let h = profileBase();
  const m = '<details class="cd"><summary>Datos biométricos';
  if (h.indexOf(m) >= 0)
    h = h.replace(m, planCard() + m);
  if (h.indexOf(m) < 0)
    return h;
  const a = S.ach || {};
  const nd = ACHIEVEMENTS.filter(x => a[x[0]]).length;
  return h.replace(m, () => linkRow('ruler', 'Medidas y fotos', 'Cintura, brazo, pecho… y antes y después', 'f2ms') + linkRow('trf', 'Logros', nd + ' de ' + ACHIEVEMENTS.length + ' conseguidos', 'f2lg') + linkRow('dwn', 'Exportar datos (CSV)', 'Entrenos, series, peso, medidas, comidas y cardio', 'f2ex') + m);
}
/* — manejadores de esta función (registros A / C / U) — */
C.bio = e => {
  const k = e.dataset.i;
  S.bio[k] = e.value;
  if (k == 'goal')
    S.nu.dt = GOAL_DIET[+e.value];
  applyDiet();
  saveState();
  R();
};
C.pf = (e, i, j, b) => {
  S.pf[e.parentNode && e.dataset.i] = e.value;
  saveState();
};
C.ph = e => {
  const f = e.files[0];
  if (!f)
    return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const q = Math.min(im.width, im.height);
      c.getContext('2d').drawImage(im, (im.width - q) / 2, (im.height - q) / 2, q, q, 0, 0, 160, 160);
      S.pf.img = c.toDataURL('image/jpeg', .7);
      saveState();
      R();
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
};
