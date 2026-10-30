/* ═══ dashboard/home ═══
   Pestaña Dashboard: tarjetas de resumen.
   Define: dashboardBase, recordsCard, weekMonday, weekStats, weekCard, dashboardTab
*/
function dashboardBase() {
  const lg = S.logs;
  const now = new Date();
  const wkc = lg.filter(l => (now - new Date(l.d)) < 7 * 864e5).length;
  const vol = lg.reduce((s, l) => s + l.v, 0);
  const last = lg.filter(l => !l.k).slice(-8);
  const mx = Math.max(1, ...last.map(l => l.v));
  return '<div class="hd"><h1>Dashboard</h1><button data-a="zwv" style="padding:8px 12px">' + icon('dash', 24) + '</button></div><div class="g2" style="margin-top:12px"><div class="cd"><b style="font-size:26px">' + lg.length + '</b><br><small>Entrenos totales</small></div><div class="cd"><b style="font-size:26px">' + wkc + '</b><br><small>Últimos 7 días</small></div><div class="cd"><b style="font-size:26px">' + volumeText(vol) + '</b><br><small>Volumen total</small></div><div class="cd"><b style="font-size:26px">' + roundInt(sumMacros((S.meals[dayKey(now)] && Object.values(S.meals[dayKey(now)]).flat() || []).map(itemMacros))[0]) + '</b><br><small>kcal hoy</small></div></div><div class="cd"><b>Volumen por sesión</b><div style="display:flex;align-items:flex-end;gap:6px;height:90px;margin-top:8px">' + (last.length ? last.map(l => '<div style="flex:1;background:var(--ac);border-radius:4px;height:' + Math.max(6, l.v / mx * 100) + '%"></div>').join('') : '<small>Completa un entreno para ver tu progreso.</small>') + '</div></div><div class="cd">' + calendarPage() + '</div>';
}
const recordsCard = () => {
  const ks = new Set(Object.keys(S.pr || {}).concat(Object.keys(S.hist || {})));
  const l = [...ks].map(n => [n, bestOf(n)]).filter(x => x[1]).sort((a, b) => b[1].e - a[1].e).slice(0, 6);
  return '<div class="cd"><b>Récords personales</b>' + (l.length ? l.map(x => '<div class="it" style="grid-template-columns:1fr auto"><span>' + X(x[0]) + '<br><small>' + x[1].d + '</small></span><span style="text-align:right"><b>' + toDisplayWeight(x[1].w) + ' ' + weightUnit() + ' × ' + x[1].r + '</b><br><small>1RM est. ' + roundInt(toDisplayWeight(x[1].e)) + ' ' + weightUnit() + '</small></span></div>').join('') : '<p class="mu" style="margin:8px 0 0">Aquí aparecerán tus mejores marcas cuando registres pesos.</p>') + '</div>';
};
const weekMonday = d => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const weekStats = () => {
  const now = new Date();
  const m0 = weekMonday(now);
  const cnt = {};
  const day = {};
  (S.logs || []).forEach(l => {
    if (!l || typeof l.d != 'string')
      return;
    const t = new Date(l.d + 'T12:00:00');
    if (isNaN(t))
      return;
    const k = dayKey(weekMonday(t));
    cnt[k] = (cnt[k] || 0) + 1;
    day[l.d] = 1;
  });
  const g = Math.max(1, (S.plan || []).filter(d => d.ex.length).length);
  const t = g >= 4 ? g - 1 : g;
  const at = k => new Date(m0.getFullYear(), m0.getMonth(), m0.getDate() - 7 * k);
  const wk = k => cnt[dayKey(at(k))] || 0;
  let st = wk(0) >= t ? 1 : 0;
  let k = 1;
  while (k < 600 && wk(k) >= t) {
    st++;
    k++;
  }
  let best = 0;
  let run = 0;
  const ks = Object.keys(cnt).sort();
  if (ks.length) {
    const n = Math.min(600, Math.max(0, Math.round((m0 - new Date(ks[0] + 'T12:00:00')) / 6048e5)));
    for (let i = n; i >= 0; i--) {
      if (wk(i) >= t) {
        run++;
        best = Math.max(best, run);
      }
      else if (i > 0)
        run = 0;
    }
  }
  const dots = [...Array(7)].map((_, i) => {
    const d = new Date(m0.getFullYear(), m0.getMonth(), m0.getDate() + i);
    return { l: 'LMXJVSD'[i], on: !!day[dayKey(d)], td: dayKey(d) == dayKey(now), fu: d > now && dayKey(d) != dayKey(now) };
  });
  return { c: wk(0), g, t, st, best: Math.max(best, st), dots, any: !!ks.length };
};
const weekCard = () => {
  const s = weekStats();
  return '<div class="cd wkc"><div class="row"><b>Esta semana</b><small>' + s.c + ' de ' + s.g + (s.g == 1 ? ' entreno' : ' entrenos') + '</small></div>' +
    '<div class="wkd">' + s.dots.map(d => '<span class="' + (d.on ? 'on ' : '') + (d.td ? 'td ' : '') + (d.fu ? 'fu' : '') + '"><i></i>' + d.l + '</span>').join('') + '</div>' +
    '<div class="wks"><div><b>' + s.st + '</b><small>' + (s.st == 1 ? 'semana de racha' : 'semanas de racha') + '</small></div><div><b>' + s.best + '</b><small>mejor racha</small></div></div>' +
    '<small class="mu wkn">' + (s.any ? 'La semana cuenta con ' + s.t + ' o más entrenos.' : 'Completa tu primer entreno para empezar la racha.') + '</small></div>';
};
function dashboardTab() {
  const h = dashboardBase() + recordsCard();
  const m = '<div class="cd"><b>Volumen por sesión</b>';
  return (h.indexOf(m) >= 0 ? h.replace(m, weekCard() + m) : h + weekCard()) + stagnationCard() + cardioCard() + progressCard() + recordsTimeline() + backupReminder();
}
