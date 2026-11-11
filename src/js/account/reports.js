/* ═══ account/reports ═══
   Administración → Fallos y sugerencias (F-27), solo para el admin: los avisos de todos los usuarios, los más nuevos primero,
   con su estado (pendiente, vista o arreglada) y filtros por estado. Al abrir uno pendiente pasa a visto; se le cambia el
   estado y se contesta: la respuesta la ve quien lo envió en su Perfil (system/report). Las reglas (firestore.rules) solo dejan
   al admin leerlos todos y cambiar el estado y la respuesta.
   Define: ADMIN_STATES, repState, repDate, repCounts, repCard, reportsAdminView, loadReports, repSync, repWrite  · acciones/registros: 5
*/
import { $, fmtDateShort, dayKey } from '../core/util.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { toast } from '../core/toast.js';
import { fullPage, pgHead, sheet } from '../core/ui.js';
import { commitWrites, listDocs, setWrite } from '../cloud/firestore.js';
import { REPORT_KINDS, REPORT_MAX } from '../system/report.js';
import { html, raw } from '../core/html.js';
/** Estados que pone el admin: [código, nombre]. */
const ADMIN_STATES = [['p', 'Pendiente'], ['v', 'Vista'], ['a', 'Arreglada']];
/* st: 'load' | 'ok' | 'err'; list: avisos [{ id, data }]; f: filtro ('p', 'v', 'a' o '' para todos); open: id abierto; busy: id que se guarda */
let repState = { st: 'load', list: [], err: '', f: 'p', open: '', busy: '' };
const repDate = t => +t > 0 ? fmtDateShort(dayKey(new Date(+t)), { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
/** Cuántos hay en cada estado: { p, v, a }. */
const repCounts = () => repState.list.reduce((o, d) => (o[d.data.st] = (o[d.data.st] || 0) + 1, o), { p: 0, v: 0, a: 0 });
const repCard = d => {
  const o = d.data;
  const on = repState.open == d.id;
  const kd = (REPORT_KINDS.find(k => k[0] == o.k) || REPORT_KINDS[0])[1];
  const st = ADMIN_STATES.find(x => x[0] == o.st) || ADMIN_STATES[0];
  const head = html`<button class="adrh" data-a="reportsToggle" data-v="${d.id}" aria-expanded="${on ? 'true' : 'false'}"><span class="row"><b>${String(o.u || '—')}</b><span class="rps ${o.st == 'a' ? 'ok' : o.st == 'v' ? 'seen' : 'wait'}">${st[1]}</span></span><small class="mu">${kd}${o.a ? ' · ' + String(o.a) : ''} · ${repDate(o.ca)} · V${String(o.v || '')}${o.rp ? ' · contestada' : ''}</small><span class="rptx${on ? '' : ' cl'}">${String(o.t || '')}</span></button>`;
  if (!on)
    return html`<div class="cd adr">${raw(head)}</div>`;
  const busy = repState.busy == d.id;
  return html`<div class="cd adr on">${raw(head)}${o.dx ? html`<details><summary>Datos técnicos</summary><pre class="rpv">${String(o.dx)}</pre></details>` : ''}<label>Estado</label><div class="seg" role="radiogroup" aria-label="Estado">${ADMIN_STATES.map(x => html`<button class="${o.st == x[0] ? 'on' : ''}" data-a="reportsSetState" data-v="${d.id + ':' + x[0]}" role="radio" aria-checked="${o.st == x[0] ? 'true' : 'false'}"${busy ? ' disabled' : ''}>${x[1]}</button>`)}</div><label for="adrt">Respuesta o solución</label><textarea id="adrt" rows="4" maxlength="${REPORT_MAX}" placeholder="La verá el usuario en su Perfil">${String(o.rp || '')}</textarea><button class="pr" data-a="reportsReply" data-v="${d.id}" style="width:100%;margin-top:8px"${busy ? ' disabled' : ''}>${o.rp ? 'Cambiar la respuesta' : 'Enviar respuesta'}</button>${o.ra ? html`<small class="mu" style="display:block;margin-top:6px">Contestada el ${repDate(o.ra)}</small>` : ''}</div>`;
};
const reportsAdminView = () => {
  const s = repState;
  const head = html`${pgHead('Fallos y sugerencias', 'openAdmin')}<div id="adrp"></div>`;
  if (s.st == 'load')
    return html`${raw(head)}<p class="mu" style="margin:14px 2px">Cargando…</p>`;
  if (s.st == 'err')
    return html`${raw(head)}<p class="mu" style="margin:14px 2px">No se han podido cargar (${s.err}). Comprueba la conexión.</p><button data-a="openReports" style="width:100%">Reintentar</button>`;
  const n = repCounts();
  /* el abierto sigue a la vista aunque cambie de estado (al abrir uno pendiente pasa a visto) */
  const L = s.list.filter(d => !s.f || d.data.st == s.f || d.id == s.open);
  const tabs = [['p', 'Pendientes', n.p], ['v', 'Vistas', n.v], ['a', 'Arregladas', n.a], ['', 'Todas', s.list.length]];
  return html`${raw(head)}<div class="seg adrf" role="tablist" aria-label="Filtrar por estado">${tabs.map(x => html`<button class="${s.f == x[0] ? 'on' : ''}" data-a="reportsFilter" data-v="${x[0] || 'all'}" role="tab" aria-selected="${s.f == x[0] ? 'true' : 'false'}">${x[1]} (${x[2]})</button>`)}</div>${raw(L.length ? L.map(repCard).join('') : '<p class="mu" style="margin:14px 2px">No hay ninguno.</p>')}`;
};
const loadReports = async () => {
  try {
    const L = await listDocs('reports');
    repState = { ...repState, st: 'ok', list: L.filter(d => d.data && typeof d.data.t == 'string').sort((a, b) => (+b.data.ca || 0) - (+a.data.ca || 0)) };
  }
  catch (e) {
    logError('administración: avisos', e);
    repState = { ...repState, st: 'err', err: e.code || 'error' };
  }
  repSync();
};
/* con la página abierta, se pinta de nuevo; si no, nada */
const repSync = () => {
  if ($('#adrp'))
    sheet(reportsAdminView());
};
/** Cambia en la nube (y aquí) los campos `data` del aviso `id`. */
const repWrite = async (id, data) => {
  const d = repState.list.find(x => x.id == id);
  if (!d)
    return;
  repState.busy = id;
  repSync();
  try {
    const f = Object.assign({}, data, { m: Date.now() });
    await commitWrites([setWrite('reports/' + id, f, { exists: true }, Object.keys(f))]);
    Object.assign(d.data, f);
  }
  catch (e) {
    toast('No se ha podido guardar (' + (e.code || 'error') + ')');
  }
  repState.busy = '';
  repSync();
};
/* — manejadores de esta función (registros A / C / U) — */
A.openReports = () => {
  repState = { st: 'load', list: [], err: '', f: 'p', open: '', busy: '' };
  fullPage(reportsAdminView());
  loadReports();
};
A.reportsFilter = (i, b) => {
  repState.f = b.dataset.v == 'all' ? '' : b.dataset.v;
  repState.open = '';
  repSync();
};
/* abrir uno pendiente lo marca como visto */
A.reportsToggle = (i, b) => {
  const id = b.dataset.v;
  repState.open = repState.open == id ? '' : id;
  repSync();
  const d = repState.list.find(x => x.id == id);
  if (repState.open == id && d && d.data.st == 'p')
    repWrite(id, { st: 'v', sa: Date.now() });
};
A.reportsSetState = (i, b) => {
  const [id, st] = String(b.dataset.v).split(':');
  if (ADMIN_STATES.some(x => x[0] == st))
    repWrite(id, { st, sa: Date.now() });
};
A.reportsReply = async (i, b) => {
  const id = b.dataset.v;
  const t = String(($('#adrt') || {}).value || '').trim().slice(0, REPORT_MAX);
  if (t.length < 2) {
    toast('Escribe la respuesta');
    return;
  }
  const d = repState.list.find(x => x.id == id);
  await repWrite(id, Object.assign({ rp: t, ra: Date.now() }, d && d.data.st == 'p' ? { st: 'v', sa: Date.now() } : {}));
  toast('Respuesta enviada');
};
