/* ═══ workout/resume ═══
   Reanudar un entreno interrumpido (estado en curso guardado).
   Define: WIP_KEY, pendingResume, saveSession, resumeSync, resumeBanner, dropResume  · acciones/registros: 3
*/
const WIP_KEY = Store.K.wip;
let pendingResume = null;
const saveSession = () => {
  try {
    if (W)
      Store.set(WIP_KEY, JSON.stringify({ W, d: S.plan[S.sel], sel: S.sel, wk: S.wk, pb: !!S.pbk, t: Date.now() }));
    else if (!pendingResume)
      Store.del(WIP_KEY);
  }
  catch (e) {
    logError('guardar entreno en curso', e);
  }
};
const resumeSync = () => {
  if (W)
    pendingResume = null;
};
A.zres = () => {
  const z = pendingResume;
  pendingResume = null;
  if (!z)
    return;
  S.sel = z.sel;
  S.wk = z.wk;
  if (z.pb) {
    S.pbk = { sel: z.sel, day: S.plan[z.sel] };
    S.plan[z.sel] = z.d;
  }
  W = z.W;
  W.t0 += Date.now() - z.t;
  W.re = 0;
  W.p = 0;
  W.lb = 0;
  W.ri = null;
  saveState();
  try {
    requestSessionWakeLock();
  }
  catch (e) {
    /* bloqueo de pantalla opcional */
  }
  R();
  scrollTo(0, 0);
};
A.zrd = () => {
  sheet();
  pendingResume = null;
  try {
    Store.del(WIP_KEY);
  }
  catch (e) {
    logError('descartar entreno en curso', e);
  }
  R();
};
A.zrq = () => confirmDialog('¿Descartar el entreno en curso?', 'Se perderán las series de esa sesión.', 'zrd', 'Descartar');
const resumeBanner = () => {
  if (!pendingResume || W)
    return '';
  const t = pendingResume;
  const n = t.W.x.reduce((a, b) => a + b.length, 0);
  const o = t.W.x.reduce((a, b) => a + b.filter(x => x.ok).length, 0);
  return '<div class="cd" style="border-color:var(--a2)"><small style="color:var(--a1);font-weight:700;letter-spacing:.1em">ENTRENO EN CURSO</small><div style="font-size:19px;font-weight:700;margin:4px 0 2px">' + X(t.d.n) + '</div><div class="mu" style="margin-bottom:12px">' + o + ' de ' + n + ' series completadas</div><div class="g2"><button data-a="zrq">Descartar</button><button class="pr" data-a="zres">Reanudar</button></div></div>';
};
const dropResume = () => {
  pendingResume = null;
  try {
    Store.del(WIP_KEY);
  }
  catch (e) {
    logError('descartar entreno en curso', e);
  }
};
