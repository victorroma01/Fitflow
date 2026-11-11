/* ═══ cloud/backup ═══
   Copia de seguridad en la nube (F-30, T-14): una sola por cuenta, que cada copia nueva sustituye. Es la copia completa de
   system/backup (el mismo formato que el archivo), comprimida con gzip si el navegador sabe y partida en trozos de 300.000
   caracteres: users/{uid}/backup/meta (cuándo, versión, cuántos trozos, huella y cuántos entrenos y días de comidas tiene) y
   c0, c1… Todo se escribe en una sola operación (o todo o nada) y se borran los trozos que sobren de la copia anterior.
   A diferencia de la sincronización, la copia no cambia aunque luego se borre algo: sirve para volver atrás.
   Se hace sola una vez por semana, tras sincronizar bien (cloud/sync: afterSync), y cuando se quiera desde Copia de seguridad.
   La automática no sustituye una copia con bastantes más entrenos o comidas que el móvil (podría ser la buena): lo avisa.
   Restaurar baja los trozos, comprueba la huella y sigue el camino de siempre (system/backup: confirmar y poder deshacer).
   Estado: S.cloudBackup = { at, lg, md }: la última copia en la nube (cuándo, entrenos y días de comidas), para todos los móviles.
   Define: CHUNK, MAX_CHUNKS, BACKUP_EVERY, cloudBusy, autoTried, pendingOld, backupPath, toB64, fromB64, canZip, zip, unzip, dataCounts, shrinks, writeCloudBackup, readCloudBackup, autoBackup, cloudBackupCard, wipeCloudBackup, saveNow  · acciones/registros: 3
*/
import { $, APPV } from '../core/util.js';
import { toast } from '../core/toast.js';
import { logError } from '../core/errors.js';
import { A } from '../core/registry.js';
import { S, saveState, W } from '../core/state.js';
import { confirmDialog, dialog } from '../core/ui.js';
import { account } from './session.js';
import { netError } from './net.js';
import { batchGet, commitWrites, delWrite, getDoc, setWrite } from './firestore.js';
import { hashOf } from './merge.js';
import { afterSync } from './hooks.js';
import { askRestore, backupDate, buildBackup, countOf, plural } from '../system/backup.js';
import { html, raw } from '../core/html.js';
/* trozos de 300.000 caracteres (en el peor caso, 900 KB: por debajo del 1 MB de un documento de Firestore) y como mucho 24
   (unos 7 MB de copia, 3 o 4 veces más de lo que ocupan años de uso; comprimida, mucho menos) */
const CHUNK = 300000;
const MAX_CHUNKS = 24;
const BACKUP_EVERY = 7 * 864e5;
/* 1 mientras se guarda o se baja una copia */
let cloudBusy = 0;
/* la comprobación semanal, una vez por apertura de la app */
let autoTried = 0;
/* la meta de la copia de la nube mientras se pregunta si sustituirla */
let pendingOld = null;
const backupPath = d => 'users/' + account.uid + '/backup/' + d;
const toB64 = u8 => {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000)
    s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
};
const fromB64 = b => {
  const s = atob(b);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++)
    u[i] = s.charCodeAt(i);
  return u;
};
const canZip = () => typeof CompressionStream == 'function' && typeof DecompressionStream == 'function';
const zip = async (t) => toB64(new Uint8Array(await new Response(new Blob([t]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()));
const unzip = b => new Response(new Blob([fromB64(b)]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
/** Entrenos y días con comidas: lo que se compara antes de sustituir una copia. */
const dataCounts = () => ({ lg: countOf(S.logs), md: countOf(S.meals) });
/** ¿La copia `m` tiene bastantes más entrenos o días de comidas que el móvil (`c`)? Entonces quizá la buena es ella. */
const shrinks = (m, c) => m.lg >= 5 && c.lg < m.lg * .8 || m.md >= 10 && c.md < m.md * .8;
/** Guarda la copia de ahora en la nube, en lugar de la anterior (`old`: su meta, si ya se leyó). */
const writeCloudBackup = async (old) => {
  const txt = buildBackup();
  const z = canZip();
  const body = z ? await zip(txt) : txt;
  const parts = [];
  for (let i = 0; i < body.length; i += CHUNK)
    parts.push(body.slice(i, i + CHUNK));
  if (parts.length > MAX_CHUNKS)
    throw netError('TOO_BIG');
  const on = old && old.data ? Math.min(MAX_CHUNKS, +old.data.n || 0) : MAX_CHUNKS;
  const c = dataCounts();
  const meta = { at: Date.now(), v: APPV, n: parts.length, z, sz: body.length, h: hashOf(body), lg: c.lg, md: c.md };
  const writes = parts.map((p, i) => setWrite(backupPath('c' + i), { j: p, i }));
  for (let i = parts.length; i < on; i++)
    writes.push(delWrite(backupPath('c' + i)));
  writes.push(setWrite(backupPath('meta'), meta));
  await commitWrites(writes);
  S.cloudBackup = { at: meta.at, lg: c.lg, md: c.md };
  saveState();
};
/** La copia de la nube en texto (el de un archivo de copia), o '' si no hay ninguna. Lanza DAMAGED si está incompleta. */
const readCloudBackup = async () => {
  const m = await getDoc(backupPath('meta'));
  if (!m)
    return '';
  const n = +m.data.n;
  if (!(n >= 1 && n <= MAX_CHUNKS))
    throw netError('DAMAGED');
  const paths = Array.from({ length: n }, (_, i) => backupPath('c' + i));
  const docs = await batchGet(paths);
  let body = '';
  for (const p of paths) {
    const d = docs[p];
    if (!d || typeof d.data.j != 'string')
      throw netError('DAMAGED');
    body += d.data.j;
  }
  if (hashOf(body) != m.data.h)
    throw netError('DAMAGED');
  return m.data.z ? unzip(body) : body;
};
/* tras sincronizar: si la última copia tiene una semana, otra; sin pisar una copia que parece tener más datos */
const autoBackup = async () => {
  if (autoTried || cloudBusy || !account || account.x || W || Date.now() - (+(S.cloudBackup && S.cloudBackup.at) || 0) < BACKUP_EVERY)
    return;
  if (!countOf(S.logs) && !countOf(S.meals) && !countOf(S.weightLog))
    return;
  autoTried = 1;
  cloudBusy = 1;
  try {
    const old = await getDoc(backupPath('meta'));
    const c = dataCounts();
    /* el aviso no tapa otra ventana: si hay una abierta, espera a la próxima vez que se abra la app */
    if (old && shrinks(old.data, c)) {
      if (!$('#dg .dgb') && !$('#sh .sp'))
        dialog('Tu copia en la nube tiene más datos', html`La copia del ${backupDate(old.data.at, 1)} tiene ${plural(+old.data.lg || 0, 'entreno', 'entrenos')} y ${plural(+old.data.md || 0, 'día', 'días')} de comidas; este móvil, ${c.lg} y ${c.md}. No la hemos sustituido por si es la buena: en Copia de seguridad puedes restaurarla o guardar la de ahora.`, [['Ahora no', 'doNothing', ''], ['Copia de seguridad', 'openBackup', 'pr']]);
    }
    else
      await writeCloudBackup(old);
  }
  catch (e) {
    if (e.code != 'NETWORK')
      logError('copia en la nube', e);
  }
  finally {
    cloudBusy = 0;
  }
};
afterSync.push(autoBackup);
/** Apartado «Copia en la nube» de Copia de seguridad (system/backup). */
export const cloudBackupCard = () => {
  const c = S.cloudBackup;
  const line = c && +c.at > 0 ? html`Última copia: <b>${backupDate(c.at, 1)}</b>, ${new Date(+c.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })} · ${plural(+c.lg || 0, 'entreno', 'entrenos')} y ${plural(+c.md || 0, 'día', 'días')} de comidas` : 'Aún no hay ninguna copia en la nube.';
  return html`<div class="cd cbk" id="cbk"><b>Copia en la nube</b><p class="mu">Una sola copia en tu cuenta: cada copia nueva sustituye a la anterior. Se hace sola una vez por semana y no cambia aunque luego borres algo, así puedes volver a ella.</p><p class="cbl" id="cbl">${raw(line)}</p><div class="g2"><button class="pr" data-a="cloudBackupSave"${cloudBusy ? ' disabled' : ''}>Guardar ahora</button><button data-a="cloudBackupRestore"${cloudBusy ? ' disabled' : ''}>Restaurar</button></div></div>`;
};
/** «Borrar todos los datos» (profile/home): también la copia de la nube. */
export const wipeCloudBackup = async () => {
  const m = await getDoc(backupPath('meta'));
  if (!m)
    return;
  const n = Math.min(MAX_CHUNKS, +m.data.n || MAX_CHUNKS);
  await commitWrites(Array.from({ length: n }, (_, i) => delWrite(backupPath('c' + i))).concat([delWrite(backupPath('meta'))]));
  delete S.cloudBackup;
};
const saveNow = async (old) => {
  cloudBusy = 1;
  const l = $('#cbl');
  if (l)
    l.textContent = 'Guardando…';
  try {
    await writeCloudBackup(old);
    toast('Copia guardada en la nube');
  }
  catch (e) {
    toast(e.code == 'NETWORK' ? 'Sin conexión: guarda la copia cuando vuelvas a tener internet' : e.code == 'TOO_BIG' ? 'La copia es demasiado grande para la nube: guárdala en un archivo' : 'No se ha podido guardar la copia (' + (e.code || 'error') + ')');
  }
  finally {
    cloudBusy = 0;
  }
  if ($('#cbk'))
    A.openBackup();
};
/* — manejadores de esta función (registros A / C / U) — */
A.cloudBackupSave = async () => {
  if (cloudBusy || !account)
    return;
  /* antes de sustituirla, si la de la nube tiene bastantes más datos, se pregunta */
  let old = null;
  try {
    cloudBusy = 1;
    old = await getDoc(backupPath('meta'));
  }
  catch (e) {
    cloudBusy = 0;
    toast(e.code == 'NETWORK' ? 'Sin conexión: guarda la copia cuando vuelvas a tener internet' : 'No se ha podido leer la copia de la nube (' + (e.code || 'error') + ')');
    return;
  }
  cloudBusy = 0;
  const c = dataCounts();
  if (old && shrinks(old.data, c)) {
    pendingOld = old;
    confirmDialog('¿Sustituir la copia de la nube?', html`La copia del ${backupDate(old.data.at, 1)} tiene ${plural(+old.data.lg || 0, 'entreno', 'entrenos')} y ${plural(+old.data.md || 0, 'día', 'días')} de comidas; este móvil, ${c.lg} y ${c.md}. Solo hay una copia: la de ahora sustituirá a esa.`, 'cloudBackupSaveConfirmed', 'Sustituir');
    return;
  }
  saveNow(old);
};
A.cloudBackupSaveConfirmed = () => saveNow(pendingOld);
A.cloudBackupRestore = async () => {
  if (cloudBusy || !account)
    return;
  cloudBusy = 1;
  try {
    const t = await readCloudBackup();
    if (t)
      askRestore(t);
    else
      toast('Aún no hay ninguna copia en la nube');
  }
  catch (e) {
    toast(e.code == 'NETWORK' ? 'Sin conexión: para restaurar la copia de la nube hace falta internet' : e.code == 'DAMAGED' ? 'La copia de la nube está incompleta: no se puede restaurar' : 'No se ha podido bajar la copia (' + (e.code || 'error') + ')');
  }
  finally {
    cloudBusy = 0;
  }
};
