/* ═══ system/backup ═══
   Copias de seguridad, restauración y avisos.
   Define: pendingRestore, backupAge, backupReminder, BACKUP_FORMAT, countOf, plural, wipSession, backupRows, backupSummary, buildBackup, BACKUP_ERRORS, parseBackup, backupDate, askRestore, preRestore, restoreBackup, … (+5)  · acciones/registros: 8
*/
let pendingRestore = null;
const backupAge = () => {
  if (!S.bkd)
    return 'Aún no has guardado ninguna copia.';
  const d = Math.floor((Date.now() - S.bkd) / 864e5);
  return 'Última copia: ' + (d <= 0 ? 'hoy' : d == 1 ? 'ayer' : 'hace ' + d + ' días') + '.';
};
const backupReminder = () => {
  if (S.logs.length < 3 || (S.bkd && Date.now() - S.bkd < 21 * 864e5))
    return '';
  return '<div class="cd"><b>Haz una copia de seguridad</b><div class="mu" style="font-size:13px;margin:4px 0 10px">Tus entrenos solo viven en este dispositivo. ' + (S.bkd ? backupAge() : 'Aún no has guardado ninguna copia.') + '</div><button data-a="zbk" style="width:100%">Copia de seguridad</button></div>';
};
const BACKUP_FORMAT = 2;
const countOf = x => Array.isArray(x) ? x.length : (x && typeof x == 'object' ? Object.keys(x).length : 0);
const plural = (n, a, b) => n + ' ' + (n == 1 ? a : b);
const wipSession = () => {
  try {
    const z = JSON.parse(Store.get(WIP_KEY));
    if (z && z.W && z.d && Array.isArray(z.W.x) && z.d && Array.isArray(z.d.ex))
      return z;
  }
  catch (e) {
    logError('leer entreno en curso', e);
  }
  return null;
};
const backupRows = (s, wip) => {
  const it = Object.values(s.meals || {}).reduce((t, d) => t + (d && typeof d == 'object' ? Object.values(d).reduce((u, l) => u + (Array.isArray(l) ? l.length : 0), 0) : 0), 0);
  const dias = new Set((s.logs || []).map(l => l && l.d)).size;
  const r = [plural(countOf(s.logs), 'entreno registrado', 'entrenos registrados') + (dias ? ' (' + plural(dias, 'día', 'días') + ')' : ''),
    'Historial de pesos de ' + plural(countOf(s.hist), 'ejercicio', 'ejercicios') + ' y ' + plural(countOf(s.pr), 'récord personal', 'récords personales'),
    plural(countOf(s.wl), 'registro de peso corporal', 'registros de peso corporal'),
    'Comidas de ' + plural(countOf(s.meals), 'día', 'días') + ' (' + plural(it, 'alimento anotado', 'alimentos anotados') + ') y agua de ' + plural(countOf(s.wt), 'día', 'días'),
    plural(countOf(s.cf), 'alimento nuevo', 'alimentos nuevos') + ', ' + plural(countOf(s.lib), 'plato guardado', 'platos guardados') + ' y ' + plural(Object.keys(s.tp || {}).length, 'plantilla de día', 'plantillas de día'),
    plural(countOf(s.cr), 'rutina personalizada', 'rutinas personalizadas') + ', ' + plural(countOf(s.cp), 'programa guardado', 'programas guardados') + ' y ' + plural(countOf(s.cx), 'ejercicio propio', 'ejercicios propios'),
    'Notas de ' + plural(countOf(s.notes), 'ejercicio', 'ejercicios'), ...backupRowsFull(s),
    'Perfil, objetivos de nutrición, nivel y ajustes (tema, acento, estilo, unidades, avisos)'];
  if (wip)
    r.push('Entreno en curso, para retomarlo');
  return r;
};
const backupSummary = s => [plural(countOf(s.logs), 'entreno', 'entrenos'), plural(countOf(s.cr), 'rutina', 'rutinas'), plural(countOf(s.cf), 'alimento nuevo', 'alimentos nuevos'), 'comidas de ' + plural(countOf(s.meals), 'día', 'días')].join(' · ');
const buildBackup = () => {
  const wip = wipSession();
  return JSON.stringify(Object.assign({ _sf: { app: 'StrataFit', fmt: BACKUP_FORMAT, ver: APPV, at: new Date().toISOString(), wip: wip || undefined, sum: backupRows(S, wip) } }, S));
};
const BACKUP_ERRORS = { vacio: 'El archivo está vacío', prog: 'Eso es un código de programa, no una copia: impórtalo en Programas', grande: 'El archivo es demasiado grande para ser una copia de StrataFit', formato: 'El archivo no es una copia válida de StrataFit', plan: 'La copia está dañada: no tiene un programa de entrenamiento válido' };
const parseBackup = txt => {
  txt = String(txt || '').trim();
  if (!txt)
    throw 'vacio';
  if (/^FFP1:/.test(txt))
    throw 'prog';
  if (txt.length > 4e7)
    throw 'grande';
  let o;
  try {
    o = JSON.parse(txt, (k, v) => k == '__proto__' ? undefined : v);
  }
  catch (e) {
    throw 'formato';
  }
  const A_ = Array.isArray;
  const O_ = x => x && typeof x == 'object' && !A_(x);
  if (!O_(o))
    throw 'formato';
  const meta = O_(o._sf) ? o._sf : null;
  delete o._sf;
  if (!A_(o.plan) || !o.plan.length || !o.plan.every(d => d && typeof d.n == 'string' && A_(d.ex) && d.ex.every(e => e && typeof e.n == 'string' && +e.s > 0)))
    throw 'plan';
  let fix = 0;
  const L1 = ['logs', 'cr', 'cx', 'cf', 'lib', 'cp', 'wl', 'ms'];
  const O1 = ['done', 'last', 'meals', 'hist', 'pr', 'notes', 'bio', 'pf', 'nu', 'wt', 'tp', 'dt', 'fq', 'dl', 'dq', 'ach', 'bc', 'wdc', 'stz'];
  L1.forEach(k => {
    if (o[k] != null) {
      if (!A_(o[k])) {
        o[k] = [];
        fix++;
      }
      else {
        const n = o[k].length;
        o[k] = o[k].filter(x => x && typeof x == 'object');
        fix += n - o[k].length;
      }
    }
  });
  O1.forEach(k => {
    if (o[k] != null && !O_(o[k])) {
      delete o[k];
      fix++;
    }
  });
  let wip = null;
  const w = meta && meta.wip;
  if (O_(w) && O_(w.W) && A_(w.W.x) && O_(w.d) && A_(w.d.ex) && w.W.x.length == w.d.ex.length)
    wip = w;
  return { s: o, meta, wip, fix };
};
const backupDate = (t, l) => {
  const d = new Date(t);
  return isNaN(d) ? '' : d.toLocaleDateString('es', l ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });
};
const askRestore = txt => {
  let r;
  try {
    r = parseBackup(txt);
  }
  catch (x) {
    toast(BACKUP_ERRORS[x] || BACKUP_ERRORS.formato);
    return;
  }
  pendingRestore = r;
  const ds = r.meta && r.meta.at ? backupDate(r.meta.at, 1) : '';
  confirmDialog('¿Restaurar esta copia?', '<b>Copia' + (ds ? ' del ' + X(ds) : '') + '</b><br>' + X(backupSummary(r.s)) + (r.wip ? '<br>Incluye un entreno en curso.' : '') + (r.meta && Array.isArray(r.meta.ph) && r.meta.ph.length ? '<br>Incluye ' + r.meta.ph.length + ' fotos de progreso (se añaden a las que ya tienes).' : '') + '<br><br><b>Ahora tienes</b><br>' + X(backupSummary(S)) + '<br><br>Se reemplazarán los datos actuales. Antes se guarda lo que tienes ahora, para que puedas deshacerlo.', 'bkok', 'Restaurar');
};
const preRestore = () => {
  try {
    const p = JSON.parse(Store.get(Store.K.pre));
    if (p && p.s && Array.isArray(p.s.plan) && Date.now() - p.t < 30 * 864e5)
      return p;
  }
  catch (e) {
    logError('leer copia previa a restaurar', e);
  }
  return null;
};
const restoreBackup = () => {
  const r = pendingRestore;
  if (!r || !r.s)
    return;
  pendingRestore = null;
  let pre;
  try {
    pre = JSON.stringify({ t: Date.now(), v: APPV, s: S, w: Store.get(WIP_KEY) });
    Store.set(Store.K.pre, pre);
  }
  catch (e) {
    toast('No hay espacio para guardar tus datos actuales: no se restauró nada');
    return;
  }
  try {
    const s = r.s;
    s.bkd = Date.now();
    Store.set(Store.K.app, JSON.stringify(s));
    if (r.wip) {
      r.wip.t = Date.now();
      Store.set(WIP_KEY, JSON.stringify(r.wip));
    }
    else
      Store.del(WIP_KEY);
    Store.set(Store.K.rs, JSON.stringify({ s: backupRows(s, r.wip), f: r.fix || 0 }));
  }
  catch (e) {
    try {
      const p = JSON.parse(pre);
      Store.set(Store.K.app, JSON.stringify(p.s));
      if (p.w)
        Store.set(WIP_KEY, p.w);
      else
        Store.del(WIP_KEY);
    }
    catch (_) {
      logError('deshacer restauración fallida', _);
    }
    toast('No se pudo restaurar; tus datos siguen como estaban');
    return;
  }
  location.reload();
};
A.bkun = () => {
  const p = preRestore();
  if (!p)
    return;
  confirmDialog('¿Deshacer la última restauración?', 'Volverás a los datos que tenías antes (' + X(backupSummary(p.s)) + '). Lo que tienes ahora se guardará por si cambias de idea.', 'bkun2', 'Deshacer');
};
A.bkun2 = () => {
  const p = preRestore();
  if (!p)
    return;
  try {
    Store.set(Store.K.pre, JSON.stringify({ t: Date.now(), v: APPV, s: S, w: Store.get(WIP_KEY) }));
  }
  catch (e) {
    toast('No hay espacio para deshacer');
    return;
  }
  try {
    Store.set(Store.K.app, JSON.stringify(p.s));
    if (p.w)
      Store.set(WIP_KEY, p.w);
    else
      Store.del(WIP_KEY);
    Store.set(Store.K.rs, JSON.stringify({ s: backupRows(p.s, null), f: 0, u: 1 }));
  }
  catch (e) {
    try {
      Store.set(Store.K.app, JSON.stringify(S));
    }
    catch (_) {
      logError('guardar al deshacer restauración', _);
    }
    toast('No se pudo deshacer');
    return;
  }
  location.reload();
};
C.bkim = e => {
  const f = e.files && e.files[0];
  if (!f)
    return;
  if (f.size > 4e7) {
    toast(BACKUP_ERRORS.grande);
    e.value = '';
    return;
  }
  const r = new FileReader();
  r.onload = () => askRestore(String(r.result));
  r.onerror = () => toast('No se pudo leer el archivo');
  r.readAsText(f);
  e.value = '';
};
A.zbr = () => {
  const e = $('#bk');
  askRestore(e ? e.value : '');
};
A.bkf = async () => {
  const pv = S.bkd;
  S.bkd = Date.now();
  saveState();
  const r = await downloadFile('stratafit-copia-' + dayKey(new Date) + '.json', await buildFullBackup());
  if (r == 'saved' || r == 'delivered')
    toast('Copia guardada');
  else {
    S.bkd = pv;
    saveState();
    toast(r == 'declined' ? 'No se guardó la copia' : 'No se pudo guardar el archivo. Usa la opción de texto.');
  }
};
A.zbk = () => {
  const p = preRestore();
  sheet('<h3>Copia de seguridad</h3><p class="mu" style="margin:0 0 6px">Tus datos viven solo en este dispositivo. Guarda un archivo de vez en cuando: si cambias de móvil o borras los datos del navegador, podrás restaurarlo aquí y seguir por donde ibas.</p><p class="mu" style="font-size:12px;margin:0 0 12px">' + backupAge() + '</p>'
    + '<div class="g2"><button class="pr" data-a="bkf">Guardar archivo</button><label class="btnl">Importar archivo<input type="file" accept=".json,application/json,text/plain" hidden data-c="bkim"></label></div>'
    + '<details class="cd" style="margin-top:12px"><summary>Qué incluye la copia</summary><div class="mu" style="font-size:13px;margin-top:8px;display:grid;gap:6px">' + backupRows(S, wipSession()).map(x => '<div>· ' + X(x) + '</div>').join('') + '</div></details>'
    + '<details class="cd" style="margin-top:12px"><summary>Copiar o pegar como texto (sin fotos)</summary><textarea id="bk" rows="5" style="margin-top:8px">' + X(buildBackup()) + '</textarea><div class="g2" style="margin-top:10px"><button data-a="zbc">Copiar</button><button class="pr" data-a="zbr">Restaurar</button></div></details>'
    + '<details class="cd" style="margin-top:12px"><summary>Copias automáticas en este móvil</summary><div id="snapl"><p class="mu" style="font-size:13px;margin:8px 0 0">Cargando…</p></div></details>'
    + (p ? '<button data-a="bkun" style="width:100%;margin-top:12px">Deshacer última restauración (' + X(backupDate(p.t)) + ')</button>' : ''));
  fillSnapshots();
};
const isFreshInstall = () => !S.nbk && !S.logs.length && !S.bkd && !(S.cp || []).length && !(S.cr || []).length && !countOf(S.meals) && !(S.wl || []).length;
A.bknx = () => {
  S.nbk = 1;
  saveState();
  R();
};
const restoreBanner = () => '<div class="cd" style="margin:0 0 12px"><b>¿Ya usabas StrataFit?</b><div class="mu" style="font-size:13px;margin:4px 0 10px">Importa tu copia de seguridad y sigue por donde ibas.</div><div class="g2"><button class="pr" data-a="zbk">Importar copia</button><button data-a="bknx">Ahora no</button></div></div>';
function backupRowsFull(s) {
  const L = (Array.isArray(s.logs) ? s.logs : []).filter(l => l && typeof l == 'object');
  const cd = L.filter(l => l.k == 'c').length;
  const wd = L.filter(l => l.k == 'w').length;
  const r = [];
  if (cd || wd)
    r.push(plural(cd, 'sesión de cardio', 'sesiones de cardio') + ' y ' + plural(wd, 'WOD', 'WOD'));
  const ms = Array.isArray(s.ms) ? s.ms.length : 0;
  if (ms)
    r.push(plural(ms, 'medición corporal', 'mediciones corporales'));
  const na = s.ach && typeof s.ach == 'object' ? Object.keys(s.ach).length : 0;
  if (na)
    r.push(plural(na, 'logro conseguido', 'logros conseguidos'));
  if (s === S && photoCount)
    r.push(plural(photoCount, 'foto de progreso', 'fotos de progreso') + ' (solo en la copia en archivo)');
  if (s !== S && restoredPhotos)
    r.push(plural(restoredPhotos, 'foto de progreso restaurada', 'fotos de progreso restauradas'));
  return r;
}
const buildFullBackup = async () => {
  let ph = [];
  try {
    ph = await allPhotosFull();
  }
  catch (e) {
    ph = [];
  }
  const base = buildBackup();
  return ph.length ? base.replace('{"_sf":{', () => '{"_sf":{"ph":' + JSON.stringify(ph) + ',') : base;
};
let restoredPhotos = 0;
A.bkok = async () => {
  const r = pendingRestore;
  restoredPhotos = 0;
  try {
    if (r && r.meta && Array.isArray(r.meta.ph) && r.meta.ph.length) {
      const n = await mergePhotos(r.meta.ph);
      restoredPhotos = n;
      if (!n)
        toast('No se pudieron restaurar las fotos');
    }
  }
  catch (e) {
    toast('No se pudieron restaurar las fotos');
  }
  restoreBackup();
};
