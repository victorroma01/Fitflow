/* ═══ core/store ═══
   Capa de almacenamiento. TODA la persistencia local pasa por aquí: ninguna otra parte del código llama a localStorage.
   Escribe en localStorage del dispositivo y avisa de cada cambio al adaptador de Store.remote: cloud/sync, que sube a
   Firebase las partes del estado que cambian (ver docs/tecnica/backend.md).
   Define: Store
*/
import { logError } from './errors.js';
/* Claves que usa la app (y, por tanto, lo único que habría que sincronizar con un servidor):
   app  → estado S: el núcleo (perfil, plan, programas, ajustes, peso…); los entrenos, el historial y las comidas
          van aparte en claves que empiezan por «ff:» (ff:logs, ff:hist, ff:meals:2026-10…; ver core/persist)
   wip  → entreno en curso (para reanudar si se cierra la app)
   pre  → copia automática previa a restaurar una copia de seguridad (permite deshacer)
   rs   → resumen pendiente de mostrar tras restaurar
   err  → registro de errores del dispositivo (core/errors; no se sincroniza)
   bad  → copia del estado que no se pudo leer, apartada antes de empezar de cero (no se sincroniza)
   ver  → última versión de la app abierta en este dispositivo (para enseñar las novedades tras actualizar)
   seen → versión cuyas novedades ya se enseñaron (para no repetirlas)
   inst → versión con la que empezó la app en este dispositivo; si ya tenía una anterior a la 1.0.1, esa (para saber si el icono
          de la pantalla de inicio es el de antes del logo nuevo)
   acct → sesión de la cuenta en este dispositivo: usuario, uid y tokens de Firebase (cloud/session; no se sincroniza)
   own  → uid de la cuenta cuyos datos hay en el móvil (si entra otra cuenta, se borran antes: cloud/session)
   sync → estado de la sincronización con Firebase: versión de cada documento y huellas de lo último sincronizado
          (cloud/sync)
   lgn  → intentos fallidos de entrar, para la espera creciente (account/login)
   Las copias automáticas viven en IndexedDB (base "ffsnap"; ver system/snapshots). */
export const Store = {
  K: { app: 'ff', wip: 'ffw', pre: 'ffpre', rs: 'ffrs', err: 'fferr', bad: 'ffbad', ver: 'ffver', seen: 'ffseen', inst: 'ffinst', acct: 'ffacct', own: 'ffown', sync: 'ffsync', lgn: 'fflgn' },
  remote: null,
  /* get/set/del NO capturan errores, igual que localStorage: cada llamador decide qué hacer si falla (sin espacio, modo privado…) */
  get(k) {
    return localStorage.getItem(k);
  },
  set(k, v) {
    localStorage.setItem(k, v);
    Store.note(k, v);
  },
  del(k) {
    localStorage.removeItem(k);
    Store.note(k, null);
  },
  /** Claves guardadas que empiezan por `prefix` (las partes del estado: core/persist). */
  keys(prefix) {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k != null && k.startsWith(prefix))
        out.push(k);
    }
    return out;
  },
  /* aviso a un adaptador remoto (si hay); un fallo del adaptador nunca debe impedir guardar en local */
  note(k, v) {
    try {
      if (Store.remote && Store.remote.changed)
        Store.remote.changed(k, v);
    }
    catch (e) {
      if (k != Store.K.err && typeof logError == 'function')
        logError('Store.remote', e);
    }
  }
};
