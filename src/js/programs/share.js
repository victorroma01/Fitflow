/* ═══ programs/share ═══
   Compartir e importar programas mediante código.
   Define: cleanPlan, programCode, parseImport, ensureExercises, shareState, sharePage, importProgram  · acciones/registros: 7
*/
import { $ } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, C } from '../core/registry.js';
import { EXERCISES } from '../data/library.js';
import { DAY_PHOTOS } from '../data/photos.js';
import { TECH_CODES } from '../data/techniques.js';
import { S } from '../core/state.js';
import { pgHead, sheet, sheetToTop } from '../core/ui.js';
import { addOwnProgram, progDraft, restDay } from './create.js';
import { programName } from './levels.js';
import { cleanText, copyText, downloadFile, fromBase64, readTextFile, toBase64 } from '../system/files.js';
import { html } from '../core/html.js';
/** Plan válido a partir de lo importado: una semana de 7 días o un ciclo de hasta 14 (workout/week), con lo que se conoce. */
const cleanPlan = pl => {
  if (!Array.isArray(pl) || !pl.length || pl.length > 14)
    throw 0;
  const o = pl.map(d => {
    if (!d || typeof d.n != 'string' || !Array.isArray(d.ex) || d.ex.length > 24)
      throw 0;
    const r = { n: cleanText(d.n, 40) || 'Día', ex: d.ex.map(e => {
        if (!e || typeof e.n != 'string' || !cleanText(e.n, 80) || !(+e.s > 0))
          throw 0;
        const x = { n: cleanText(e.n, 80), s: Math.min(30, Math.round(+e.s)) };
        if (+e.r >= 0 && +e.r <= 900 && e.r != null)
          x.r = +e.r;
        if (Array.isArray(e.rg) && e.rg.length == 2 && e.rg.every(v => +v >= 0 && +v <= 5000))
          x.rg = [+e.rg[0], +e.rg[1]];
        if (['m', 's', 'min', 'cal', 'km'].includes(e.u))
          x.u = e.u;
        if (Number.isInteger(e.b) && e.b > 0 && e.b < 50)
          x.b = e.b;
        if (typeof e.t == 'string' && /^([0-9X]\/[0-9X]\/[0-9X]\/[0-9X]|Libre)$/.test(e.t))
          x.t = e.t;
        if (TECH_CODES.has(e.tk))
          x.tk = e.tk;
        return x;
      }) };
    if (d.cu && typeof d.img == 'string' && DAY_PHOTOS[d.img]) {
      r.cu = 1;
      r.img = d.img;
    }
    return r;
  });
  /* un solo día no es un ciclo: se completa la semana con descansos */
  if (o.length == 1)
    while (o.length < 7)
      o.push(restDay());
  return o;
};
const programCode = (n, plan) => 'FFP1:' + toBase64(JSON.stringify({ n: cleanText(n, 60), plan: cleanPlan(plan) }));
const parseImport = t => {
  t = String(t || '').trim();
  if (!t)
    throw 0;
  const o = t.startsWith('FFP1:') ? JSON.parse(fromBase64(t.slice(5).replace(/\s+/g, ''))) : JSON.parse(t);
  if (!o || typeof o != 'object' || !Array.isArray(o.plan))
    throw 0;
  return o;
};
const ensureExercises = pl => {
  const have = new Set(EXERCISES.concat(S.customExercises).map(x => x.n));
  pl.forEach(d => d.ex.forEach(e => {
    if (!have.has(e.n)) {
      have.add(e.n);
      S.customExercises.push({ n: e.n, c: 'Culturismo', g: 'Propio', t: 'Personalizado', p: [], s: [], q: 'Otro' });
    }
  }));
};
let shareState = null;
const sharePage = () => {
  const code = programCode(shareState.n, shareState.plan);
  return html`${pgHead('Compartir programa', shareState.back || 'openPrograms')}<p class="mu m-n6-0-10">«${shareState.n}». Envía este código por mensaje o correo; quien lo reciba lo pega en Programas, Importar.</p><textarea id="shc" aria-label="Código del programa" rows="6" readonly>${code}</textarea><div class="g2 mt-10"><button class="pr" data-a="shareCopyCode">${navigator.share ? 'Compartir' : 'Copiar código'}</button><button data-a="shareDownload">Guardar archivo</button></div>`;
};
A.ownProgramShare = () => {
  const p = S.ownPrograms[progDraft.k];
  if (!p)
    return;
  try {
    shareState = { n: p.n, plan: S.ownProgramIndex == progDraft.k ? S.plan : p.plan, back: 'ownProgramShow' };
    sheet(sharePage());
    sheetToTop();
  }
  catch (e) {
    toast('No se pudo preparar el programa');
  }
};
A.sharePlan = () => {
  if (S.noProgram) {
    toast('Aún no tienes un programa que compartir');
    return;
  }
  try {
    shareState = { n: programName(), plan: S.plan, back: 'openPrograms' };
    sheet(sharePage());
    sheetToTop();
  }
  catch (e) {
    toast('No se pudo preparar el programa');
  }
};
A.shareCopyCode = async () => {
  const el = $('#shc');
  if (!el || !shareState)
    return;
  const code = el.value;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Programa StrataFit', text: code });
      return;
    }
    catch (e) {
      if (e && e.name == 'AbortError')
        return;
    }
  }
  toast(await copyText(code, el) ? 'Código copiado' : 'Selecciona el texto y cópialo');
};
A.shareDownload = async () => {
  if (!shareState)
    return;
  const r = await downloadFile('programa-' + String(shareState.n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '.json', JSON.stringify({ ff: 'FFP1', n: shareState.n, plan: cleanPlan(shareState.plan) }));
  toast(r == 'saved' ? 'Archivo guardado' : r == 'declined' ? 'No se guardó el archivo' : 'No se pudo guardar el archivo');
};
A.openImport = () => {
  sheet(html`${pgHead('Importar programa', 'openPrograms')}<p class="mu m-n6-0-10">Pega el código que te han enviado o elige un archivo .json.</p><textarea id="ipc" aria-label="Código del programa que quieres importar" rows="5" placeholder="FFP1:…"></textarea><p id="ipe" class="mu c-ctx d-none m-8-0-0"></p><div class="g2 mt-10"><label class="btnl">Elegir archivo<input type="file" accept=".json,application/json,text/plain" hidden data-c="importFile"></label><button class="pr" data-a="importCode">Importar</button></div>`);
  sheetToTop();
};
const importProgram = t => {
  try {
    const o = parseImport(t);
    const plan = cleanPlan(o.plan);
    const nm = (typeof o.n == 'string' && cleanText(o.n, 60)) || 'Programa importado';
    ensureExercises(plan);
    addOwnProgram({ n: nm, plan, t: Date.now(), src: 'import', d: 'Programa importado' }, 'Programa importado');
  }
  catch (x) {
    const e = $('#ipe');
    if (e) {
      e.textContent = 'El código o el archivo no es válido.';
      e.style.display = 'block';
    }
  }
};
A.importCode = () => {
  const e = $('#ipc');
  importProgram(e ? e.value : '');
};
C.importFile = e => readTextFile(e, importProgram);
