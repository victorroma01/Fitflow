/* StrataFit · entrar y renovar una sesión por la API pública de Authentication, como lo hace la app en un móvil: para el ensayo
   del paso de las cuentas al dominio nuevo (tools/admin/cuentas.mjs: rehearse, con el io de tools/admin/firebase.mjs: authIo).
   No usa firebase-admin, para poder probarlo sin él (tests/dominio.test.mjs).
   La clave web solo vale para las peticiones que llegan desde la app publicada, y se dice de dónde vienen como lo dice un
   navegador: en una petición a otro dominio, solo el origen (https://victorroma01.github.io/). Por si la clave admitiera solo
   la dirección entera de la app, se prueba también con ella; la primera que la clave acepta es la que se usa para renovar.
   Los errores llevan en `code` el código de Firebase (TOKEN_EXPIRED, PERMISSION_DENIED…) y en `reason`, si Google lo da, su
   motivo (API_KEY_HTTP_REFERRER_BLOCKED…): nunca el mensaje, que puede repetir el correo. */

const CODE = /^[A-Z][A-Z0-9_]{2,}$/;

/** Una petición POST con `fetchImpl`: devuelve el JSON de la respuesta o lanza un error con `code` y `reason`. */
export const restCall = (fetchImpl = fetch) => async (url, headers, body) => {
  const r = await fetchImpl(url, { method: 'POST', headers, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = j.error || {};
    const first = String(e.message || '').split(/[\s:]/)[0];
    const info = (Array.isArray(e.details) ? e.details : []).find(d => d && typeof d.reason == 'string' && CODE.test(d.reason));
    throw Object.assign(new Error('HTTP ' + r.status), { code: CODE.test(first) ? first : e.status || 'HTTP_' + r.status, reason: info ? info.reason : '' });
  }
  return j;
};

/** Entrar (signIn) y renovar la sesión (refresh) por la API pública. `host`: 'https://' (o el del emulador); `key`: la clave
    web; `appUrl`: la dirección de la app publicada; `call`: la de restCall. */
export function webSession({ host, key, appUrl, call }) {
  const origin = new URL(appUrl).origin;
  const webs = [{ Referer: origin + '/', Origin: origin }, { Referer: appUrl, Origin: origin }];
  let web = webs[0];
  return {
    signIn: async (email, password) => {
      let last = null;
      for (const w of webs)
        try {
          const r = await call(host + 'identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + key, { 'Content-Type': 'application/json', ...w }, JSON.stringify({ email, password, returnSecureToken: true }));
          web = w;
          return r;
        }
        catch (e) {
          last = e;
          /* solo si lo que no admite es de dónde viene la petición se prueba con la otra dirección */
          if (!e || e.code != 'PERMISSION_DENIED')
            throw e;
        }
      throw last;
    },
    refresh: token => call(host + 'securetoken.googleapis.com/v1/token?key=' + key, { 'Content-Type': 'application/x-www-form-urlencoded', ...web }, 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(token))
  };
}
