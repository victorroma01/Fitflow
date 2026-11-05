/* ═══ cloud/firestore ═══
   Firestore por su API REST, con el token de la sesión (las reglas, firestore.rules, deciden qué puede leer y escribir cada
   cuenta). Solo lo que usa la app: leer un documento, leer varios, listar una colección, escribir varios a la vez (commit,
   todo o nada, con condición de versión) y borrar. Los valores van con su tipo de Firestore (stringValue, integerValue…).
   Define: DB_PATH, docName, fsUrl, encValue, encFields, decValue, decFields, fsDoc, fsCall, getDoc, batchGet, listDocs, commitWrites, deleteDoc, setWrite, delWrite
*/
import { FIREBASE, FIRESTORE_URL } from './config.js';
import { fetchJson } from './net.js';
import { idToken } from './auth.js';
const DB_PATH = 'projects/' + FIREBASE.projectId + '/databases/(default)/documents';
/** Nombre completo de un documento: docName('users/abc') → 'projects/…/documents/users/abc'. */
const docName = path => DB_PATH + '/' + path;
const fsUrl = (p, q) => FIRESTORE_URL + p + (q ? '?' + q : '');
/** Valor de JS → valor de Firestore (los enteros como integerValue: las reglas los comprueban como int). */
const encValue = v => v === null || v === undefined ? { nullValue: null } : typeof v == 'string' ? { stringValue: v } : typeof v == 'boolean' ? { booleanValue: v } : typeof v == 'number' ? Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(encValue) } } : { mapValue: { fields: encFields(v) } };
const encFields = o => {
  const f = {};
  for (const k of Object.keys(o))
    if (o[k] !== undefined)
      f[k] = encValue(o[k]);
  return f;
};
const decValue = v => !v || typeof v != 'object' ? undefined : 'stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? +v.doubleValue : 'booleanValue' in v ? v.booleanValue : 'nullValue' in v ? null : 'timestampValue' in v ? Date.parse(v.timestampValue) : 'mapValue' in v ? decFields(v.mapValue.fields) : 'arrayValue' in v ? (v.arrayValue.values || []).map(decValue) : undefined;
const decFields = f => {
  const o = {};
  for (const k of Object.keys(f || {}))
    o[k] = decValue(f[k]);
  return o;
};
/** Documento de la API → { data, ut: updateTime (la versión, para escribir con condición) }. */
const fsDoc = d => ({ data: decFields(d.fields), ut: d.updateTime });
/* con el token de la sesión; si Firestore lo da por caducado (401), se renueva una vez y se repite */
const fsCall = async (url, o = {}) => {
  try {
    return await fetchJson(url, { ...o, token: await idToken() });
  }
  catch (e) {
    if (e.status != 401)
      throw e;
    return fetchJson(url, { ...o, token: await idToken(true) });
  }
};
/** Documento `path` o null si no existe. */
export const getDoc = async (path) => {
  try {
    return fsDoc(await fsCall(fsUrl(docName(path))));
  }
  catch (e) {
    if (e.code == 'NOT_FOUND')
      return null;
    throw e;
  }
};
/** Varios documentos de una vez: { path: documento o null }. */
export const batchGet = async (paths) => {
  const out = {};
  if (!paths.length)
    return out;
  const r = await fsCall(fsUrl(DB_PATH + ':batchGet'), { method: 'POST', body: { documents: paths.map(docName) } });
  for (const x of Array.isArray(r) ? r : []) {
    const name = x.found ? x.found.name : x.missing;
    if (typeof name == 'string' && name.startsWith(DB_PATH + '/'))
      out[name.slice(DB_PATH.length + 1)] = x.found ? fsDoc(x.found) : null;
  }
  return out;
};
/** Documentos de la colección `path` (todas las páginas): [{ id, data, ut }]. */
export const listDocs = async (path) => {
  const out = [];
  let tok = '';
  for (let i = 0; i < 20; i++) {
    const r = await fsCall(fsUrl(docName(path), 'pageSize=300' + (tok ? '&pageToken=' + encodeURIComponent(tok) : '')));
    for (const d of r.documents || [])
      out.push({ id: d.name.split('/').pop(), ...fsDoc(d) });
    tok = r.nextPageToken;
    if (!tok)
      break;
  }
  return out;
};
/** Escribe varios documentos a la vez: o todos o ninguno. Si una condición no se cumple, lanza un error de cloud/net
  (FAILED_PRECONDITION, ALREADY_EXISTS o NOT_FOUND). Devuelve la versión (updateTime) de cada escritura, en orden. */
export const commitWrites = async (writes) => {
  const r = await fsCall(fsUrl(DB_PATH + ':commit'), { method: 'POST', body: { writes } });
  return (r.writeResults || []).map(w => w.updateTime || '');
};
export const deleteDoc = path => fsCall(fsUrl(docName(path)), { method: 'DELETE' });
/** Escritura de commitWrites que deja el documento `path` con `data`. `pre`: condición ({ updateTime } o { exists }).
  `fields`: solo esos campos (los demás del documento se conservan). */
export const setWrite = (path, data, pre, fields) => {
  const w = { update: { name: docName(path), fields: encFields(data) } };
  if (pre)
    w.currentDocument = pre;
  if (fields)
    w.updateMask = { fieldPaths: fields };
  return w;
};
export const delWrite = path => ({ delete: docName(path) });
