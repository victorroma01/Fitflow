/* ═══ account/admin ═══
   Perfil → Administración, solo para la cuenta con rol de admin (F-34; las reglas de Firestore lo vuelven a exigir):
   - Contraseñas temporales: las que crea el flujo «Restablecer contraseña» de GitHub Actions (tools/admin), durante 24 h,
     para dárselas al usuario que la olvidó. Al entregarla se borra.
   - Cuentas: usuario, sexo, sistema del último móvil y fecha de alta de cada cuenta (nunca sus entrenos, comidas, medidas ni
     foto), y cuántas usan iPhone, Android u otro sistema (T-28; las que aún no han abierto la V1.0.1, «sin dato»).
   - Arriba, el enlace a Fallos y sugerencias (account/reports), con cuántos hay pendientes.
   Define: adminState, adminDate, OS_NAMES, osName, osCounts, adminView, loadAdmin  · acciones/registros: 5
*/
import { $ } from '../core/util.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { toast } from '../core/toast.js';
import { confirmDialog, fullPage, linkRow, pgHead, sheet } from '../core/ui.js';
import { deleteDoc, listDocs } from '../cloud/firestore.js';
import { html, raw } from '../core/html.js';
/* st: 'load' | 'ok' | 'err'; inbox: contraseñas temporales vigentes; users: cuentas; show: id de la contraseña visible */
let adminState = { st: 'load', inbox: [], users: [], err: '', show: '', del: '', rp: -1 };
const adminDate = t => +t > 0 ? new Date(+t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
/** Sistemas del móvil (perfil, os) → su nombre; en el orden del recuento. */
const OS_NAMES = { ios: 'iPhone', android: 'Android', otro: 'Otro' };
const osName = v => OS_NAMES[v] || '';
/* recuento de las cuentas por sistema: «3 iPhone · 1 Android · 2 sin dato» (solo lo que hay) */
const osCounts = users => {
  const n = { ios: 0, android: 0, otro: 0, no: 0 };
  users.forEach(d => n[OS_NAMES[d.data.os] ? d.data.os : 'no']++);
  return html`<div class="cd aos" aria-label="Cuentas por sistema del móvil">${Object.keys(OS_NAMES).map(k => html`<div><b>${raw(n[k])}</b><small>${raw(OS_NAMES[k])}</small></div>`)}<div><b>${raw(n.no)}</b><small>Sin dato</small></div></div>`;
};
const adminView = () => {
  const s = adminState;
  const head = html`${pgHead('Administración')}<div id="adm"></div>`;
  if (s.st == 'load')
    return html`${raw(head)}<p class="mu m-14-2">Cargando…</p>`;
  if (s.st == 'err')
    return html`${raw(head)}<p class="mu m-14-2">No se ha podido cargar (${s.err}). Comprueba la conexión.</p><button data-a="openAdmin" class="w-full">Reintentar</button>`;
  const pw = s.inbox.length ? s.inbox.map(d => {
    const h = Math.max(1, Math.round((+d.data.exp - Date.now()) / 36e5));
    const on = s.show == d.id;
    return html`<div class="cd adp"><div class="row"><b>${String(d.data.u || '')}</b><small>caduca en ${h} h</small></div><div class="adk" aria-live="polite">${on ? String(d.data.p || '') : '••••••••••••'}</div><div class="g3"><button data-a="adminToggleSection" data-v="${d.id}">${on ? 'Ocultar' : 'Ver'}</button><button data-a="adminCopyPassword" data-v="${d.id}">Copiar</button><button data-a="adminDeleteAsk" data-v="${d.id}">Entregada</button></div></div>`;
  }).join('') : html`<p class="mu m-6-2-14 fs-14">No hay ninguna. Para crear una: en GitHub, Actions → «Restablecer contraseña» → Run workflow, con el usuario. Aparece aquí durante 24 horas.</p>`;
  const us = s.users.slice().sort((a, b) => String(a.data.u || '').localeCompare(String(b.data.u || ''), 'es'));
  const rp = linkRow('bug', 'Fallos y sugerencias', s.rp < 0 ? 'Avisos de los usuarios' : s.rp ? s.rp + (s.rp == 1 ? ' pendiente' : ' pendientes') : 'Ninguno pendiente', 'openReports');
  return html`${raw(head)}${raw(rp)}<div class="ph">Contraseñas temporales</div>${raw(pw)}<div class="ph">Cuentas (${us.length})</div>${raw(osCounts(us))}<div class="cd acl">${us.map(d => html`<div class="it cols-1fr-auto-auto-auto gap-10"><b class="ow-anywhere">${String(d.data.u || '—')}</b><small>${d.data.sx == 'M' ? 'Hombre' : d.data.sx == 'F' ? 'Mujer' : '—'}</small><small>${osName(d.data.os) || '—'}</small><small>${adminDate(d.data.ca)}</small></div>`)}</div><div class="h-40"></div>`;
};
const loadAdmin = async () => {
  try {
    /* los avisos solo dan el número de pendientes: si no se pueden leer, el resto de la página sale igual */
    const [inbox, users, rp] = await Promise.all([listDocs('adminInbox'), listDocs('users'), listDocs('reports').catch(() => null)]);
    adminState = { ...adminState, st: 'ok', inbox: inbox.filter(d => +d.data.exp > Date.now()), users, rp: rp ? rp.filter(d => d.data.st == 'p').length : -1 };
  }
  catch (e) {
    logError('administración', e);
    adminState = { ...adminState, st: 'err', err: e.code || 'error' };
  }
  if ($('#adm'))
    sheet(adminView());
};
/* — manejadores de esta función (registros A / C / U) — */
A.openAdmin = () => {
  /* con los datos ya cargados (al volver de Fallos y sugerencias, o al abrirla otra vez), se enseñan mientras se piden de nuevo:
     sin la pantalla vacía de «Cargando…» (I-20). Las contraseñas vuelven a salir ocultas */
  adminState = adminState.st == 'ok' ? { ...adminState, show: '', del: '' } : { st: 'load', inbox: [], users: [], err: '', show: '', del: '', rp: -1 };
  fullPage(adminView());
  loadAdmin();
};
A.adminToggleSection = (i, b) => {
  adminState.show = adminState.show == b.dataset.v ? '' : b.dataset.v;
  sheet(adminView());
};
A.adminCopyPassword = async (i, b) => {
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
A.adminDeleteAsk = (i, b) => {
  adminState.del = b.dataset.v;
  confirmDialog('¿Ya la has entregado?', 'Se borra de aquí. El usuario tendrá que cambiarla al entrar.', 'adminDelete', 'Borrar');
};
A.adminDelete = async () => {
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
