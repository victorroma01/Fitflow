/* ═══ workout/session ═══
   Sesión activa: series, siguiente, pausa, esfuerzo (RPE), descanso y flechas.
   Define: sessionView, currentSet, scrollToCurrent, nextSet, sessionWakeLock, requestSessionWakeLock, setToggle, foldButton, foldSummary, anLiveOn, exThumb, restPill, rpeRow, avgEffort, nextUpBar, blockArrowLive, … (+1)  · acciones/registros: 13
*/
function sessionView() {
  const d = S.plan[S.sel];
  const t = roundInt(((W.p || Date.now()) - W.t0) / 1000);
  const L = dayBlocks(d);
  const lt = {};
  L.forEach((k, n) => k.x.forEach(i => lt[i] = [n, k.x[0] == i]));
  let n = 0;
  let o = 0;
  let cur = null;
  W.x.forEach((a, i) => a.forEach((s, j) => {
    n++;
    if (s.ok)
      o++;
    else if (!cur)
      cur = [i, j];
  }));
  if (cur && W.lc !== cur[0]) {
    const pv = W.lc;
    W.lc = cur[0];
    W.fd = W.fd || {};
    delete W.fd[cur[0]];
    if (pv != null && pv !== cur[0] && W.x[pv] && W.x[pv].length && W.x[pv].every(s => s.ok))
      W.fd[pv] = 1;
  }
  return '<div class="wsk"><div class="hd"><b style="font-size:22px" id="tm">' + fmtDuration(t) + '</b><span>Serie ' + Math.min(o + 1, n) + '/' + n + '</span><span class="mu" style="min-width:60px;text-align:right">' + (W.p ? 'En pausa' : restPill()) + '</span></div><div class="bar" style="height:5px;margin:10px 0"><i style="width:' + (o / n * 100) + '%;background:var(--a2)"></i></div>' + nextUpBar(d, cur) + '</div>' + d.ex.map((e, i) => '<div class="xs' + (W.fd && W.fd[i] ? ' fd' : '') + (W.x[i].length && W.x[i].every(s => s.ok) ? ' dn' : '') + '" id="ex' + i + '">' + (lt[i][1] ? blockHeader(L, lt[i][0], cur) : '') + blockBadge(d.ex, i) + '<div class="xh">' + exThumb(e.n, i) + '<div style="min-width:0"><b style="font-size:18px">' + X(e.n) + '</b>' + targetLine(e, i) + lastTimeLine(e, i) + (e.o ? '<div class="mu" style="font-size:12px">Cambiado desde: ' + X(e.o) + ' · <u data-a="zun" data-i="' + i + '" style="cursor:pointer">Deshacer</u></div>' : '') + '</div>' + foldButton(i) + '</div>' + foldSummary(e, i) + exToolsHtml(e, i) + '<div style="margin:-2px 0 6px"><button class="chip" data-a="zhi" data-i="' + i + '">Historial</button><button class="chip" data-a="zsw" data-i="' + i + '">' + icon('swp', 15) + ' Swap</button>' + (usesBarbell(e.n) ? '<button class="chip" data-a="zpl" data-i="' + i + '">Discos</button>' : '') + '</div><div class="thd"><span>Set</span><span></span><span>' + unitHead(e) + '</span><span>' + (usesWeight(e) ? 'Peso' : '') + '</span><span>Desc.</span><span>Log</span></div>' + W.x[i].map((s, j) => {
    const c = cur && cur[0] == i && cur[1] == j;
    return '<div class="r2' + (c ? ' cur' : '') + '"><span>' + (s.t == 1 ? 'D' : j + 1) + '</span><span class="wk2">WRK</span><input type="number" inputmode="decimal" data-c="sr" data-i="' + i + '" data-j="' + j + '" value="' + s.r + '">' + (!usesWeight(e) ? '<span class="mu" style="text-align:center">–</span>' : '<input type="number" inputmode="decimal" data-c="sw" data-i="' + i + '" data-j="' + j + '" value="' + (s.w ? toDisplayWeight(s.w) : '') + '" placeholder="' + weightUnit() + '">') + '<span style="font-size:13px">' + fmtMinSec(inSuperset(i) ? 10 : restOf(e)) + '</span><button class="ck ' + (s.ok ? 'on' : '') + '" data-a="ck" data-i="' + i + '" data-j="' + j + '">✓</button></div>' + (W.re && W.ri && W.ri[0] == i && W.ri[1] == j ? '<div class="rr"><button data-a="rt" data-i="-15">−15s</button><span>Descanso<br><b id="rt">' + fmtMinSec(Math.max(0, Math.ceil((W.re - Date.now()) / 1000))) + '</b><br><small data-a="rt" data-i="0" style="cursor:pointer;text-decoration:underline">Saltar</small></span><button data-a="rt" data-i="15">+15s</button></div>' : '') + rpeRow(i, j, s);
  }).join('') + '<div class="g2" style="margin-top:8px"><button data-a="sl" data-i="' + i + '">− Serie</button><button data-a="sa" data-i="' + i + '">+ Serie</button></div></div>').join('') + '<div class="g2" style="margin:16px 0 84px"><button data-a="zdis" style="background:#d4d4da;color:#111;border:0;padding:15px;border-radius:16px;font-size:15px">Salir y descartar</button><button data-a="end" style="background:#fff;color:#111;border:0;padding:15px;border-radius:16px;font-size:16px;font-weight:700">Log out</button></div><div class="pb"><button data-a="zpv">' + icon('prv', 26) + '</button><button data-a="zps">' + icon(W.p ? 'ply' : 'pau', 30) + '</button><button data-a="znx">' + icon('nxt', 26) + '</button></div>';
}
A.zhi = i => {
  const E = S.plan[S.sel].ex[i];
  const n = E.n;
  const h = (S.hist || {})[n] || [];
  const all = h.flatMap(x => x.s);
  const bw = all.length ? Math.max(...all.map(s => s[1])) : 0;
  const rm = all.length ? Math.max(...all.map(s => s[1] * (1 + s[0] / 30))) : 0;
  sheet('<h3>' + X(n) + '</h3>' + (h.length ? (bw && !unitOf(E) ? '<div class="g2"><div class="cd"><small>Mejor peso</small><br><b style="font-size:20px">' + toDisplayWeight(bw) + ' ' + weightUnit() + '</b></div><div class="cd"><small>1RM estimado</small><br><b style="font-size:20px">' + round1(toDisplayWeight(rm)) + ' ' + weightUnit() + '</b></div></div>' : '') + (h.length > 1 && !unitOf(E) ? '<div class="pgs">' + progressBody(n) + '</div>' : '') + h.slice(0, 12).map(x => '<div class="it" style="grid-template-columns:1fr"><b>' + x.d + '</b><small>' + x.s.map(s => setText(E, s)).join(' · ') + '</small></div>').join('') : '<p class="mu">Aún no hay registros de este ejercicio. Se guardan al pulsar Log out.</p>'));
};
A.zps = () => {
  if (W.p) {
    const g = Date.now() - W.p;
    W.t0 += g;
    if (W.re)
      W.re += g;
    W.p = 0;
  }
  else
    W.p = Date.now();
  R();
};
const currentSet = () => {
  let r = null;
  W.x.some((a, i) => a.some((s, j) => {
    if (!s.ok) {
      r = [i, j];
      return 1;
    }
  }));
  return r;
};
const scrollToCurrent = () => {
  const e = $('.r2.cur');
  e && e.scrollIntoView({ behavior: 'smooth', block: 'center' });
};
const nextSet = () => {
  const c = currentSet();
  if (!c) {
    A.end();
    return;
  }
  const i = c[0];
  const j = c[1];
  W.x[i][j].ok = 1;
  W.lb = 0;
  W.ri = [i, j];
  W.c = i;
  W.re = Date.now() + (inSuperset(i) ? 10 : restOf(S.plan[S.sel].ex[i])) * 1000;
  if (!currentSet()) {
    W.re = 0;
    R();
    A.end();
    return;
  }
  R();
  scrollToCurrent();
};
A.zpv = () => {
  let r = null;
  W.x.forEach((a, i) => a.forEach((s, j) => {
    if (s.ok)
      r = [i, j];
  }));
  if (!r)
    return;
  W.x[r[0]][r[1]].ok = 0;
  W.re = 0;
  W.ri = null;
  W.c = r[0];
  R();
  scrollToCurrent();
};
let sessionWakeLock = null;
const requestSessionWakeLock = async () => {
  try {
    if (navigator.wakeLock && W && !sessionWakeLock) {
      sessionWakeLock = await navigator.wakeLock.request('screen');
      sessionWakeLock.addEventListener('release', () => {
        sessionWakeLock = null;
      });
    }
  }
  catch (e) {
    /* bloqueo de pantalla opcional: no todos los navegadores lo permiten */
  }
};
A.zdc = () => {
  sheet();
  W = null;
  R();
  restorePlanBackup();
  R();
};
const setToggle = (i, b) => {
  const s = W.x[i][+b.dataset.j];
  s.ok = !s.ok;
  W.lb = 0;
  W.ri = [i, +b.dataset.j];
  W.re = s.ok ? Date.now() + (a => a[i + 1] && a[i].b && a[i + 1].b == a[i].b ? 10 : restOf(a[i]))(S.plan[S.sel].ex) * 1000 : 0;
  R();
};
const foldButton = i => '<button class="fdb" data-a="zfd" data-i="' + i + '" aria-label="Plegar o desplegar ejercicio">' + icon('chev', 20) + '</button>';
const foldSummary = (e, i) => {
  const a = W.x[i] || [];
  const ok = a.filter(s => s.ok).length;
  return '<div class="xsm" data-a="zfd" data-i="' + i + '"><span><b>' + ok + '/' + a.length + '</b> series</span><span>' + targetText(e) + '</span></div>';
};
A.zfd = (i, b) => {
  const k = +b.dataset.i;
  W.fd = W.fd || {};
  if (W.fd[k])
    delete W.fd[k];
  else
    W.fd[k] = 1;
  R();
};
A.zfa = () => {
  const d = S.plan[S.sel];
  const c = currentSet();
  const f = W.fd || {};
  const rest = d.ex.map((e, i) => i).filter(i => !c || i != c[0]);
  const all = rest.length && rest.every(i => f[i]);
  W.fd = {};
  if (!all)
    rest.forEach(i => {
      W.fd[i] = 1;
    });
  R();
};
const anLiveOn = i => {
  try {
    const c = currentSet();
    return !!(c && c[0] == i && !W.p && !W.re);
  }
  catch (e) {
    return false;
  }
};
const exThumb = (n, i) => {
  const on = anLiveOn(i);
  const s = exAnatomy(n, 64);
  const at = exPhotoUrl(n) ? ' data-a="exv" data-n="' + X(n) + '" role="button" aria-label="Ver foto de ' + X(n) + '"' : '';
  if (!on)
    return '<div class="th"' + at + '>' + s + exBadge(n) + '</div>';
  const an = s.indexOf('stroke-width="\.7"') >= 0 || s.indexOf('stroke-width=".7"') >= 0;
  return '<div class="th live"' + at + '>' + s + exBadge(n) + '</div>';
};
const restPill = () => W && W.re ? '<button class="wsr" data-a="wsr" aria-label="Ir al descanso">Descanso <b id="rt2">' + fmtMinSec(Math.max(0, Math.ceil((W.re - Date.now()) / 1000))) + '</b></button>' : '';
A.wsr = () => {
  const r = document.querySelector('.rr');
  if (r)
    r.scrollIntoView({ block: 'center', behavior: 'smooth' });
};
A.ck = (i, b) => {
  W.lb = 0;
  setToggle(i, b);
  const e = S.plan[S.sel].ex[i];
  const s = W.x[i][+b.dataset.j];
  if (s && s.ok) {
    buzz(30);
    const h = (S.hist || {})[e.n] || [];
    const bw = Math.max(0, ...h.flatMap(x => x.s.map(y => y[1])));
    if (s.w > 0 && bw > 0 && s.w > bw)
      toast('Nuevo récord en ' + e.n + ': ' + toDisplayWeight(s.w) + ' ' + weightUnit());
  }
  if (S.ar === 0 && W && W.re && W.x[i][+b.dataset.j].ok) {
    W.re = 0;
    R();
  }
};
A.znx = () => {
  W.lb = 0;
  nextSet();
  if (S.ar === 0 && W && W.re) {
    W.re = 0;
    R();
  }
};
A.go = () => {
  overviewMode = 0;
  const d = S.plan[S.sel];
  W = { t0: Date.now(), re: 0, o: {}, x: d.ex.map(e => Array.from({ length: e.s }, () => ({ r: 10, w: S.last[e.n] || '', ok: 0 }))) };
  R();
  scrollTo(0, 0);
  W.x.forEach((a, i) => prefillSets(d.ex[i], a));
  R();
  if (W && isDeloadWeek(S.wk)) {
    W.dl = 1;
    W.x = W.x.map(a => a.slice(0, Math.max(1, Math.ceil(a.length / 2))));
    R();
  }
};
const rpeRow = (i, j, s) => {
  if (!W || W.p || !s.ok || !W.ri || W.ri[0] != i || W.ri[1] != j)
    return '';
  const e = S.plan[S.sel].ex[i];
  if (!e || unitOf(e))
    return '';
  return '<div class="rpe"><span>RPE</span>' + [6, 7, 8, 9, 10].map(v => '<button class="chip' + (s.q == v ? ' on' : '') + '" data-a="rpe" data-i="' + i + '" data-j="' + j + '" data-v="' + v + '">' + v + '</button>').join('') + (usesWeight(e) && (+s.w || 0) > 0 ? '<button class="chip" data-a="drp" data-i="' + i + '" data-j="' + j + '">+ Drop set</button>' : '') + '</div>';
};
A.rpe = (i, b) => {
  const s = W.x[i] && W.x[i][+b.dataset.j];
  if (!s)
    return;
  const v = +b.dataset.v;
  s.q = s.q == v ? 0 : v;
  R();
};
A.drp = (i, b) => {
  const j = +b.dataset.j;
  const a = W.x[i];
  const s = a && a[j];
  if (!s)
    return;
  const w = +s.w || 0;
  if (!(w > 0))
    return;
  const nw = usesLb() ? fromDisplayWeight(Math.max(5, Math.round(toDisplayWeight(w) * .8 / 5) * 5)) : Math.max(1, Math.round(w * .8 * 2) / 2);
  a.splice(j + 1, 0, { r: s.r, w: nw, ok: 0, t: 1 });
  W.re = 0;
  W.ri = null;
  R();
};
const avgEffort = () => {
  const q = [];
  W.x.forEach(a => a.forEach(s => {
    if (s.ok && +s.q > 0)
      q.push(+s.q);
  }));
  return q.length >= 3 ? Math.round(q.reduce((a, b) => a + b, 0) / q.length * 10) / 10 : 0;
};
const nextUpBar = (d, cur) => {
  if (!cur)
    return '<div class="wsn done"><span>Entreno completado</span></div>';
  const e = d.ex[cur[0]];
  const a = W.x[cur[0]];
  const n = a.filter(s => s.ok).length;
  return '<button class="wsn" data-a="wsx" aria-label="Ir al ejercicio actual"><span>' + X(e.n) + '</span><small>Serie ' + Math.min(n + 1, a.length) + '/' + a.length + '</small></button>';
};
A.wsx = () => {
  const c = currentSet();
  if (!c)
    return;
  const el = document.getElementById('ex' + c[0]);
  const h = document.querySelector('.wsk');
  if (!el)
    return;
  const top = el.getBoundingClientRect().top + window.scrollY - (h ? h.offsetHeight : 90) - 8;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
};
const blockArrowLive = (L, n, cur) => {
  try {
    return !!(cur && W && !W.p && !W.re && L[n] && L[n].x.includes(cur[0]));
  }
  catch (e) {
    return false;
  }
};
const blockHeader = (L, n, cur) => '<div class="sl">SERIE ' + String.fromCharCode(65 + n) + ' <span class="arw' + (blockArrowLive(L, n, cur) ? ' live' : '') + '" aria-hidden="true"><span>›</span><span>›</span><span>›</span></span></div>';
/* — manejadores de esta función (registros A / C / U) — */
A.sa = i => {
  const a = W.x[i];
  a.push({ ...a[a.length - 1], ok: 0 });
  R();
};
A.sl = i => {
  W.x[i].length > 1 && W.x[i].pop();
  R();
};
A.rt = i => {
  W.re = i ? W.re + i * 1e3 : 0;
  W.lb = 0;
  R();
};
C.sr = (e, i, j) => W.x[i][j].r = +e.value;
C.sw = (e, i, j) => W.x[i][j].w = fromDisplayWeight(+e.value);
