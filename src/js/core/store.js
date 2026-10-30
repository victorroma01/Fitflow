/* ═══ core/store ═══
   Capa de almacenamiento. TODA la persistencia local pasa por aquí: ninguna otra parte del código llama a localStorage.
   Hoy escribe en localStorage del dispositivo. Para añadir un servidor no hay que tocar las pantallas: basta con
   registrar un adaptador en Store.remote (ver docs/BACKEND.md) y Store avisará de cada cambio.
   Define: Store
*/
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
   Las fotos de progreso viven en IndexedDB (base "ffph"; ver extras/measures) y las copias automáticas
   también (base "ffsnap"; ver system/snapshots). */
const Store = {
  K: { app: 'ff', wip: 'ffw', pre: 'ffpre', rs: 'ffrs', err: 'fferr', bad: 'ffbad', ver: 'ffver', seen: 'ffseen' },
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
