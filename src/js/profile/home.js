/* ═══ profile/home ═══
   Pestaña Perfil y borrado de datos.
   Define: profileBase, bioCard, planCard, profileTab  · acciones/registros: 2
*/
import { APPV, roundInt, safeImage } from '../core/util.js';
import { Store } from '../core/store.js';
import { clearSavedState } from '../core/persist.js';
import { A, C } from '../core/registry.js';
import { PROGRAM_NAMES } from '../data/library.js';
import { S, saveState } from '../core/state.js';
import { toast } from '../core/toast.js';
import { icon } from '../core/icons.js';
import { confirmDialog, linkRow } from '../core/ui.js';
import { R } from '../core/render.js';
import { WIP_KEY } from '../workout/resume.js';
import { currentCustomProgram, levelsActive, levelTag, programRow } from '../programs/levels.js';
import { ACTIVITY_LEVELS, applyDiet, GOAL_DIET, GOAL_LABELS, tdee } from '../nutrition/diet.js';
import { ACHIEVEMENTS } from '../extras/achievements.js';
import { html, raw } from '../core/html.js';
/* cabecera de un desplegable de Perfil con su icono y una línea que dice qué hay dentro, como las filas de Medidas o Logros */
const pfSummary = (ic, t, s) => html`<summary class="pfs">${icon(ic, 30)}<span><b>${raw(t)}</b><br><small>${s}</small></span></summary>`;
function profileHead() {
  const p = S.pf;
  const img = safeImage(p.img);
  return html`<div class="hd"><h1>Perfil</h1></div><div class="cd pfh"><label class="av" style="cursor:pointer;font-size:0" aria-label="Foto de perfil">${img ? html`<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` : ''}${img ? '' : icon('camera', 36)}<input type="file" accept="image/*" data-c="ph" hidden></label>${p.name ? html`<b class="pfn">${p.name}</b>` : ''}</div><details class="cd">${pfSummary('idc', 'Datos', 'Nombre, email y teléfono')}${[['Nombre', 'name'], ['Email', 'email'], ['Teléfono', 'tel']].map(x => html`<label>${raw(x[0])}</label><input data-c="pf" data-i="${x[1]}" value="${p[x[1]] || ''}" aria-label="${x[0]}">`)}</details>`;
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
  return html`<details class="cd">${pfSummary('bio', 'Datos biométricos', 'Edad, altura, peso, actividad y objetivo')}<label>Sexo</label><select data-c="bio" data-i="sex" aria-label="Sexo"><option value="M">Hombre</option><option value="F"${b.sex == 'F' ? ' selected' : ''}>Mujer</option></select>${raw(f('Edad', 'age', 'años'))}${raw(f('Altura', 'h', 'cm'))}${raw(f('Peso', 'w', 'kg'))}<label>Actividad diaria</label><select data-c="bio" data-i="act" aria-label="Actividad diaria">${ACTIVITY_LEVELS.map((a, i) => html`<option value="${i}"${(b.act == null ? 1 : b.act) == i ? ' selected' : ''}>${raw(a[0])} · ${raw(a[1])}</option>`)}</select><label>Objetivo físico</label><select data-c="bio" data-i="goal" aria-label="Objetivo físico">${GOAL_LABELS.map((g, i) => html`<option value="${i}"${(b.goal == null ? 1 : b.goal) == i ? ' selected' : ''}>${raw(g)}</option>`)}</select>${raw(t ? html`<p><b>Metabolismo basal: ${roundInt(t.bm)} kcal</b><br><small>Gasto diario estimado: ${roundInt(t.td)} kcal (fórmula Mifflin-St Jeor)</small></p>` : '<p><small>Rellena edad, altura y peso para calcular tu metabolismo basal.</small></p>')}</details>`;
}
const planCard = () => {
  const p = currentCustomProgram();
  const nm = p ? p.n : PROGRAM_NAMES[S.prog];
  const pl = (S.plan || []).filter(d => d.ex.length).length;
  return html`<details class="cd">${pfSummary('prog', 'Plan de entrenamiento', nm + ' · ' + pl + (pl == 1 ? ' entreno' : ' entrenos') + ' por semana')}<div style="margin-top:10px">${programRow(nm, levelsActive() ? levelTag(S.lv) : '')}</div><button data-a="pg" style="width:100%;margin-top:12px">Cambiar programa o nivel</button></details>`;
};
export function profileTab() {
  const a = S.ach || {};
  const nd = ACHIEVEMENTS.filter(x => a[x[0]]).length;
  return html`${profileHead()}${planCard()}${linkRow('ruler', 'Medidas y fotos', 'Cintura, brazo, pecho… y antes y después', 'f2ms')}${linkRow('trf', 'Logros', nd + ' de ' + ACHIEVEMENTS.length + ' conseguidos', 'f2lg')}${linkRow('dwn', 'Exportar datos (CSV)', 'Entrenos, series, peso, medidas, comidas y cardio', 'f2ex')}${bioCard()}${linkRow('gear', 'Ajustes', 'Apariencia, unidades, sonido, copias y más', 'zaj')}<div class="brand" aria-label="${'StrataFit, versión ' + APPV}"><span class="bw">STRATAFIT</span><span class="bv">V${APPV}</span></div>`;
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
C.pf = e => {
  const k = e.dataset.i;
  if (k != 'name' && k != 'email' && k != 'tel')
    return;
  S.pf[k] = String(e.value).trim().slice(0, 120);
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
      saveState();
      R();
    };
    im.onerror = () => toast('No se ha podido leer la foto');
    im.src = r.result;
  };
  r.readAsDataURL(f);
};
