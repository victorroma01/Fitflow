/* ═══ cloud/net ═══
   Peticiones JSON a Firebase con límite de tiempo. Cualquier fallo se convierte en un error con un código estable:
   'NETWORK' sin conexión (o sin respuesta a tiempo) y, si el servidor responde con error, su código (EMAIL_EXISTS,
   INVALID_LOGIN_CREDENTIALS, TOKEN_EXPIRED… en Authentication; NOT_FOUND, FAILED_PRECONDITION, PERMISSION_DENIED… en
   Firestore).
   Define: netError, errorCode, fetchJson
*/
/** Error con un código estable (`code`) y el estado HTTP (`status`, 0 sin conexión). */
export const netError = (code, status, detail) => {
  const e = new Error(code + (detail ? ': ' + detail : ''));
  e.code = code;
  e.status = status || 0;
  return e;
};
/* Authentication pone el código en el mensaje («WEAK_PASSWORD : Password should be…»); Firestore, en `status` */
const errorCode = (j, status) => {
  const e = (Array.isArray(j) ? j[0] && j[0].error : j && j.error) || {};
  const m = String(e.message || '').split(/[\s:]/)[0];
  return /^[A-Z][A-Z0-9_]{2,}$/.test(m) ? m : e.status || 'HTTP_' + status;
};
/** Petición a `url`. Opciones: method, body (se envía como JSON), form (como formulario), token (Bearer) y timeout (ms).
  Devuelve el JSON de la respuesta ({} si no trae cuerpo). */
export async function fetchJson(url, o = {}) {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), o.timeout || 2e4);
  const headers = {};
  let body;
  if (o.token)
    headers.Authorization = 'Bearer ' + o.token;
  if (o.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(o.form).toString();
  }
  else if (o.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(o.body);
  }
  let r;
  let t;
  /* el límite vale también para leer la respuesta: un servidor que se queda a medias no deja la petición esperando siempre */
  try {
    r = await fetch(url, { method: o.method || 'GET', headers, body, signal: ctl.signal, cache: 'no-store', credentials: 'omit' });
    t = await r.text();
  }
  catch (e) {
    throw netError('NETWORK', 0, e && e.name == 'AbortError' ? 'sin respuesta a tiempo' : 'sin conexión');
  }
  finally {
    clearTimeout(tm);
  }
  let j = null;
  try {
    j = t ? JSON.parse(t) : {};
  }
  catch (e) {
    j = null;
  }
  if (!r.ok)
    throw netError(errorCode(j, r.status), r.status);
  if (j === null)
    throw netError('BAD_RESPONSE', r.status, 'respuesta que no es JSON');
  return j;
}
