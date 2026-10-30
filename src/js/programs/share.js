/* ═══ programs/share ═══
   Compartir e importar programas mediante código.
   Define: cleanPlan, programCode, parseImport, ensureExercises, shareState, sharePage, importProgram  · acciones/registros: 7
*/
import { $, X } from '../core/util.js';
import { toast } from '../core/toast.js';
import { A, C } from '../core/registry.js';
import { EXERCISES, PROGRAM_NAMES } from '../data/library.js';
import { DAY_PHOTOS } from '../data/photos.js';
import { S, saveState } from '../core/state.js';
import { dialog, pgHead, sheet, sheetToTop } from '../core/ui.js';
import { progDraft, restDay } from './create.js';
import { cleanText, copyText, downloadFile, fromBase64, toBase64 } from '../system/files.js';
import { html } from '../core/html.js';
const cleanPlan = pl => {
  if (!Array.isArray(pl) || !pl.length || pl.length > 7)
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
        return x;
      }) };
    if (d.cu && typeof d.img == 'string' && DAY_PHOTOS[d.img]) {
      r.cu = 1;
      r.img = d.img;
    }
    return r;
  });
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
  const have = new Set(EXERCISES.concat(S.cx).map(x => x.n));
  pl.forEach(d => d.ex.forEach(e => {
    if (!have.has(e.n)) {
      have.add(e.n);
      S.cx.push({ n: e.n, c: 'Culturismo', g: 'Propio', t: 'Personalizado', p: [], s: [], q: 'Otro' });
    }
  }));
};
let shareState = null;
const sharePage = () => {
  const code = programCode(shareState.n, shareState.plan);
  return html`${pgHead('Compartir programa', shareState.back || 'pg')}<p class="mu" style="margin:-6px 0 10px">«${shareState.n}». Envía este código por mensaje o correo; quien lo reciba lo pega en Programas, Importar.</p><textarea id="shc" rows="6" readonly>${code}</textarea><div class="g2" style="margin-top:10px"><button class="pr" data-a="shg">${navigator.share ? 'Compartir' : 'Copiar código'}</button><button data-a="shf">Guardar archivo</button></div>`;
};
A.cpsh = () => {
  const p = S.cp[progDraft.k];
  if (!p)
    return;
  try {
    shareState = { n: p.n, plan: S.cpi == progDraft.k ? S.plan : p.plan, back: 'cpv0' };
    sheet(sharePage());
    sheetToTop();
  }
  catch (e) {
    toast('No se pudo preparar el programa');
  }
};
A.pgs0 = () => {
  try {
    shareState = { n: S.cpi >= 0 && S.cp[S.cpi] ? S.cp[S.cpi].n : PROGRAM_NAMES[S.prog], plan: S.plan, back: 'pg' };
    sheet(sharePage());
    sheetToTop();
  }
  catch (e) {
    toast('No se pudo preparar el programa');
  }
};
A.shg = async () => {
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
A.shf = async () => {
  if (!shareState)
    return;
  const r = await downloadFile('programa-' + String(shareState.n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '.json', JSON.stringify({ ff: 'FFP1', n: shareState.n, plan: cleanPlan(shareState.plan) }));
  toast(r == 'saved' || r == 'delivered' ? 'Archivo guardado' : r == 'declined' ? 'No se guardó el archivo' : 'No se pudo guardar el archivo');
};
A.pgi = () => {
  sheet(html`${pgHead('Importar programa', 'pg')}<p class="mu" style="margin:-6px 0 10px">Pega el código que te han enviado o elige un archivo .json.</p><textarea id="ipc" rows="5" placeholder="FFP1:…"></textarea><p id="ipe" class="mu" style="color:var(--c);display:none;margin:8px 0 0"></p><div class="g2" style="margin-top:10px"><label class="btnl">Elegir archivo<input type="file" accept=".json,application/json,text/plain" hidden data-c="pgif"></label><button class="pr" data-a="pgio">Importar</button></div>`);
  sheetToTop();
};
const importProgram = t => {
  try {
    const o = parseImport(t);
    const plan = cleanPlan(o.plan);
    const nm = (typeof o.n == 'string' && cleanText(o.n, 60)) || 'Programa importado';
    ensureExercises(plan);
    S.cp.push({ n: nm, plan, t: Date.now(), src: 'import', d: 'Programa importado' });
    progDraft.k = S.cp.length - 1;
    saveState();
    A.pg();
    dialog('Programa importado', '«' + X(nm) + '» ya está en Mis programas. ¿Quieres empezar con él ahora? Se reiniciará el progreso de la semana.', [['Más tarde', 'zno', ''], ['Usar ahora', 'cpa', 'pr']]);
  }
  catch (x) {
    const e = $('#ipe');
    if (e) {
      e.textContent = 'El código o el archivo no es válido.';
      e.style.display = 'block';
    }
  }
};
A.pgio = () => {
  const e = $('#ipc');
  importProgram(e ? e.value : '');
};
C.pgif = e => {
  const f = e.files && e.files[0];
  if (!f)
    return;
  const r = new FileReader();
  r.onload = () => importProgram(String(r.result));
  r.onerror = () => toast('No se pudo leer el archivo');
  r.readAsText(f);
  e.value = '';
};
