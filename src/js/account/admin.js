/* ═══ account/admin ═══
   Perfil → Administración, solo para la cuenta con rol de admin (F-34; las reglas de Firestore lo vuelven a exigir):
   - Contraseñas temporales: las que crea el flujo «Restablecer contraseña» de GitHub Actions (tools/admin), durante 24 h,
     para dárselas al usuario que la olvidó. Al entregarla se borra.
   - Cuentas: usuario, sexo y fecha de alta de cada cuenta (nunca sus entrenos, comidas, medidas ni foto).
   Define: adminState, adminDate, adminView, loadAdmin  · acciones/registros: 5
*/
import { $ } from '../core/util.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { toast } from '../core/toast.js';
import { confirmDialog, fullPage, pgHead, sheet } from '../core/ui.js';
import { deleteDoc, listDocs } from '../cloud/firestore.js';
import { html, raw } from '../core/html.js';
/* st: 'load' | 'ok' | 'err'; inbox: contraseñas temporales vigentes; users: cuentas; show: id de la contraseña visible */
let adminState = { st: 'load', inbox: [], users: [], err: '', show: '', del: '' };
const adminDate = t => +t > 0 ? new Date(+t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const adminView = () => {
  const s = adminState;
  const head = html`${pgHead('Administración')}<div id="adm"></div>`;
  if (s.st == 'load')
    return html`${raw(head)}<p class="mu" style="margin:14px 2px">Cargando…</p>`;
  if (s.st == 'err')
    return html`${raw(head)}<p class="mu" style="margin:14px 2px">No se ha podido cargar (${s.err}). Comprueba la conexión.</p><button data-a="adm" style="width:100%">Reintentar</button>`;
  const pw = s.inbox.length ? s.inbox.map(d => {
    const h = Math.max(1, Math.round((+d.data.exp - Date.now()) / 36e5));
    const on = s.show == d.id;
    return html`<div class="cd adp"><div class="row"><b>${String(d.data.u || '')}</b><small>caduca en ${h} h</small></div><div class="adk" aria-live="polite">${on ? String(d.data.p || '') : '••••••••••••'}</div><div class="g3"><button data-a="adv" data-v="${d.id}">${on ? 'Ocultar' : 'Ver'}</button><button data-a="adc" data-v="${d.id}">Copiar</button><button data-a="adx" data-v="${d.id}">Entregada</button></div></div>`;
  }).join('') : html`<p class="mu" style="margin:6px 2px 14px;font-size:14px">No hay ninguna. Para crear una: en GitHub, Actions → «Restablecer contraseña» → Run workflow, con el usuario. Aparece aquí durante 24 horas.</p>`;
  const us = s.users.slice().sort((a, b) => String(a.data.u || '').localeCompare(String(b.data.u || ''), 'es'));
  return html`${raw(head)}<div class="ph">Contraseñas temporales</div>${raw(pw)}<div class="ph">Cuentas (${us.length})</div><div class="cd acl">${us.map(d => html`<div class="it" style="grid-template-columns:1fr auto auto;gap:10px"><b style="overflow-wrap:anywhere">${String(d.data.u || '—')}</b><small>${d.data.sx == 'M' ? 'Hombre' : d.data.sx == 'F' ? 'Mujer' : '—'}</small><small>${adminDate(d.data.ca)}</small></div>`)}</div><div style="height:40px"></div>`;
};
const loadAdmin = async () => {
  try {
    const [inbox, users] = await Promise.all([listDocs('adminInbox'), listDocs('users')]);
    adminState = { ...adminState, st: 'ok', inbox: inbox.filter(d => +d.data.exp > Date.now()), users };
  }
  catch (e) {
    logError('administración', e);
    adminState = { ...adminState, st: 'err', err: e.code || 'error' };
  }
  if ($('#adm'))
    sheet(adminView());
};
/* — manejadores de esta función (registros A / C / U) — */
A.adm = () => {
  adminState = { st: 'load', inbox: [], users: [], err: '', show: '', del: '' };
  fullPage(adminView());
  loadAdmin();
};
A.adv = (i, b) => {
  adminState.show = adminState.show == b.dataset.v ? '' : b.dataset.v;
  sheet(adminView());
};
A.adc = async (i, b) => {
  const d = adminState.inbox.find(x => x.id == b.dataset.v);
  if (!d)
    return;
  try {
    await navigator.clipboard.writeText(String(d.data.p || ''));
    toast('Contraseña copiada');
  }
  catch (e) {
    adminState.show = d.id;
    sheet(adminView());
    toast('No se pudo copiar: cópiala a mano');
  }
};
A.adx = (i, b) => {
  adminState.del = b.dataset.v;
  confirmDialog('¿Ya la has entregado?', 'Se borra de aquí. El usuario tendrá que cambiarla al entrar.', 'adxx', 'Borrar');
};
A.adxx = async () => {
  const id = adminState.del;
  adminState.del = '';
  try {
    await deleteDoc('adminInbox/' + id);
    adminState.inbox = adminState.inbox.filter(x => x.id != id);
  }
  catch (e) {
    toast('No se pudo borrar (' + (e.code || 'error') + ')');
  }
  if ($('#adm'))
    sheet(adminView());
};
