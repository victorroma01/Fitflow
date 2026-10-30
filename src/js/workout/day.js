/* ═══ workout/day ═══
   Pestaña Workout: vista del día, tempos, superseries y atajos.
   Define: planEx, workoutDayBase, TEMPOS, GROUP_TIPS, GENERIC_TIPS, exTips, exToolsHtml, blockBadge, woShortcuts, inSuperset, dayBlocks, withWeekBar, woExtra, workoutTab  · acciones/registros: 2
*/
const planEx = (i) => S.plan[S.sel].ex[i];
function workoutDayBase() {
  const d = S.plan[S.sel];
  const k = S.wk + '-' + S.sel;
  const rest = !d.ex.length;
  const ns = d.ex.reduce((s, e) => s + e.s, 0);
  let h = '<div class="hd"><div>' + levelPill() + '<h1>' + X(S.cpi >= 0 && S.cp[S.cpi] ? S.cp[S.cpi].n : PROGRAM_NAMES[S.prog]) + '</h1></div><button data-a="menu" style="font-size:26px;padding:6px 14px">☰</button></div><div class="wk" style="margin-top:12px"><button data-a="wkn" data-i="-1">‹</button><b>Semana ' + S.wk + (isDeloadWeek(S.wk) ? ' · descarga' : '') + '</b><button data-a="wkn" data-i="1">›</button></div><div class="dys">' + S.plan.map((x, i) => '<button class="dy ' + (i == S.sel ? 'on' : '') + '" data-a="sel" data-i="' + i + '">DÍA<br>' + (S.done[S.wk + '-' + i] ? '✓' : !x.ex.length ? '☾' : i + 1) + '</button>').join('') + '</div>';
  if (weekView && !rest)
    return h + '<div class="cd"><label>Nombre del día</label><input value="' + X(d.n) + '" data-c="dn">' + d.ex.map((e, i) => '<div class="it" style="grid-template-columns:1fr auto 24px"><span>' + blockBadge(d.ex, i) + X(e.n) + '<br>' + restSelect(e) + rangeSelect(e, i) + (i ? ' <button data-a="jn" data-i="' + i + '" style="padding:5px 9px;font-size:12px">' + (e.b && d.ex[i - 1].b == e.b ? 'Separar' : 'Unir al anterior') + '</button>' : '') + '</span><span><button data-a="sm" data-i="' + i + '">−</button> ' + e.s + ' <button data-a="sp" data-i="' + i + '">+</button></span><button data-a="xe" data-i="' + i + '" style="padding:2px 6px">✕</button></div>').join('') + '</div><button data-a="pick" style="width:100%">+ Añadir ejercicio</button><button class="pr" data-a="vw" style="width:100%;margin-top:8px">Listo</button>';
  if (rest)
    return h + '<div class="cd hero" style="text-align:center;padding:50px 14px;' + coverStyle('Descanso') + '"><div style="font-size:44px">☾</div><h2>Día de descanso</h2><p class="mu">Hoy toca recuperar.</p><button class="pr" data-a="rd">' + (S.done[k] ? 'Descanso completado ✓' : 'Completar descanso') + '</button></div><button data-a="pick" style="width:100%">+ Convertir en día de entreno</button>';
  return h + '<div class="cd hero" style="' + coverStyle(d.n, d) + '"><h2>' + X(d.n) + '</h2><div class="st"><div><b>' + d.ex.length + '</b><small>Ejercicios</small></div><div><b>' + ns + '</b><small>Series</small></div><div><b>' + dayMinutes(d) + '</b><small>Minutos</small></div></div><div class="g2"><button data-a="zov">Overview</button><button class="pr" data-a="go">' + (S.done[k] ? 'Repetir' : 'Empezar') + ' día ' + (S.sel + 1) + '</button></div></div>';
}
const TEMPOS = [['2/0/2/0', 'Estándar'], ['3/0/1/0', 'Excéntrico controlado'], ['3/0/3/0', 'Lento y controlado'], ['4/1/1/0', 'Excéntrico lento con pausa'], ['3/1/X/0', 'Pausa abajo y subida explosiva'], ['1/0/X/0', 'Explosivo'], ['2/2/2/0', 'Pausa en la contracción'], ['5/0/1/0', 'Excéntrico muy lento'], ['1/1/1/1', 'Pausa en ambos extremos'], ['Libre', 'Sin tempo fijo']];
const GROUP_TIPS = { Pecho: 'Junta las escápulas y baja hasta notar el estiramiento del pecho.', Espalda: 'Inicia el gesto llevando los codos atrás, sin tirar con los bíceps.', Hombros: 'Evita encoger los hombros y mantén el core apretado.', 'Bíceps': 'Codos pegados al cuerpo y sin balanceo.', 'Tríceps': 'Codos fijos y extensión completa.', Antebrazos: 'Agarre firme y recorrido completo.', Abdomen: 'Redondea la columna y exhala al contraer.', 'Cuádriceps': 'Rodillas alineadas con las puntas de los pies.', 'Isquios y glúteos': 'Cadera atrás y aprieta el glúteo arriba.', Gemelos: 'Pausa de 1 s arriba y estiramiento completo abajo.', CrossFit: 'Prioriza la técnica antes que la velocidad.', Hyrox: 'Gestiona el ritmo: sal al 80 % de tu esfuerzo.', Funcional: 'Controla el movimiento y activa el core.', Cardio: 'Mantén un ritmo constante y respira por el ritmo, no por la prisa.' };
const GENERIC_TIPS = ['Última serie al fallo técnico.', 'Haz un drop set en las 2 últimas series: baja el peso un 20-30 % y sigue sin descanso.', 'Prueba un rest-pause: llega al fallo, descansa 15 s y encadena más repeticiones.', 'Controla la bajada: 3 segundos en la fase excéntrica.', 'Pausa 1 segundo en la posición de máximo estiramiento.', 'Busca la conexión mente-músculo: siente el músculo en cada repetición.', 'Sube el peso cuando completes todas las repeticiones con técnica limpia.', 'Haz 1-2 series de aproximación antes de la primera serie de trabajo.', 'Termina con repeticiones parciales en el rango de máxima tensión.', 'Exhala en el esfuerzo e inhala en la bajada.', 'Reduce el descanso 15 s respecto a la sesión anterior.', 'Haz una serie con pausa de 2 s en la contracción.'];
function exTips(n) {
  let h = 0;
  for (const c of n)
    h = (h * 31 + c.charCodeAt(0)) % 997;
  const e = EXERCISES.concat(S.cx).find(x => x.n == n);
  return [e && GROUP_TIPS[groupOf(e)], GENERIC_TIPS[h % 12], GENERIC_TIPS[(h + 5) % 12]].filter(Boolean);
}
function exToolsHtml(e, i) {
  const o = W.o;
  const t = tempoOf(e) || '2/0/2/0';
  return '<div style="display:flex;gap:6px;align-items:center;margin:8px 0;flex-wrap:wrap"><button class="chip' + (o[i + 't'] ? ' on' : '') + '" data-a="tg" data-i="' + i + '" data-v="t" style="margin:0">Tips</button><button class="chip' + (o[i + 'n'] ? ' on' : '') + '" data-a="tg" data-i="' + i + '" data-v="n" style="margin:0">Notas</button>' + (unitOf(e) ? '' : '<select data-c="tp" data-i="' + i + '" style="width:auto;flex:1;min-width:130px">' + TEMPOS.map(m => '<option value="' + m[0] + '"' + (m[0] == t ? ' selected' : '') + '>Tempo ' + m[0] + ' · ' + m[1] + '</option>').join('') + '</select>') + '</div><div style="margin:-2px 0 8px">' + restSelect(e) + '</div>' + (o[i + 't'] ? '<div class="mu" style="font-size:13px;margin-bottom:8px">' + exTips(e.n).map(x => '• ' + x).join('<br>') + '</div>' : '') + (o[i + 'n'] ? '<textarea rows="3" data-c="no" data-i="' + i + '" placeholder="Anota lo que quieras sobre este ejercicio" style="margin-bottom:8px">' + X(S.notes[e.n] || '') + '</textarea>' : '');
}
A.tg = (i, b) => {
  const k = i + b.dataset.v;
  W.o[k] = !W.o[k];
  R();
};
const blockBadge = (a, i) => {
  const e = a[i];
  if (!e.b)
    return '';
  const m = a.filter(x => x.b == e.b).length;
  const k = a.filter((x, j) => x.b == e.b && j <= i).length;
  return m < 2 ? '' : '<small style="color:#f59e0b;font-weight:700">' + (m > 2 ? 'TRISERIE' : 'SUPERSERIE') + ' · ' + k + '/' + m + (k < m ? ' · 10 s hasta el siguiente' : ' · descanso tras el bloque') + '</small><br>';
};
A.jn = i => {
  const a = S.plan[S.sel].ex;
  const e = a[i];
  const p = a[i - 1];
  if (e.b && p.b == e.b)
    delete e.b;
  else if (p) {
    if (!p.b)
      p.b = 'b' + Date.now();
    if (a.filter(x => x.b == p.b).length < 3)
      e.b = p.b;
  }
  saveState();
  R();
};
const woShortcuts = () => '<button class="cd" data-a="lib" style="width:100%;text-align:left;display:flex;gap:14px;align-items:center">' + icon('lib', 34) + '<span><b style="font-size:17px">Librería de ejercicios</b><br><small>Explora por grupo muscular</small></span></button><button class="cd" data-a="cr" style="width:100%;text-align:left;display:flex;gap:14px;align-items:center">' + icon('prog', 34) + '<span><b style="font-size:17px">Workout personalizado</b><br><small>Bloques sueltos, superseries y triseries</small></span></button>';
const inSuperset = i => {
  const x = S.plan[S.sel].ex;
  const e = x[i];
  const n = x[i + 1];
  return e.b != null && n && n.b == e.b;
};
const dayBlocks = d => {
  const o = [];
  d.ex.forEach((e, i) => {
    const l = o[o.length - 1];
    if (l && e.b != null && l.b == e.b)
      l.x.push(i);
    else
      o.push({ b: e.b, x: [i] });
  });
  return o;
};
const withWeekBar = h => {
  const tr = S.plan.filter(d => d.ex.length).length;
  const dn = S.plan.filter((d, i) => d.ex.length && S.done[S.wk + '-' + i]).length;
  return h.replace('</button></div><div class="cd hero"', '</button></div><div style="margin:0 2px 10px"><div class="row"><small>Esta semana</small><small><b>' + dn + ' de ' + tr + ' entrenos</b></small></div><div class="bar" style="height:5px"><i style="width:' + (tr ? dn / tr * 100 : 0) + '%;background:var(--a2)"></i></div></div><div class="cd hero"');
};
const woExtra = () => linkRow('timer', 'Temporizador WOD', 'AMRAP, EMOM, Tabata y For time', 'wod') + linkRow('pulse', 'Registrar cardio', 'Carrera, bici, remo… con ritmo y resumen semanal', 'cardio');
function workoutTab() {
  let h = workoutDayBase();
  if (!weekView) {
    h += woShortcuts();
    h = resumeBanner() + h;
    h = withWeekBar(h);
    h = h.replace('<div class="cd hero"', () => deloadCard() + '<div class="cd hero"');
  }
  if (isFreshInstall() && !W)
    h = restoreBanner() + h;
  if (weekView || W || overviewMode)
    return h;
  return h + woExtra();
}
/* — manejadores de esta función (registros A / C / U) — */
A.sel = i => {
  S.sel = i;
  weekView = 0;
  R();
};
A.wkn = i => {
  S.wk = Math.max(1, S.wk + i);
  saveState();
  R();
};
A.vw = () => {
  weekView = !weekView;
  R();
};
A.rd = () => {
  S.done[S.wk + '-' + S.sel] = 1;
  saveState();
  R();
};
A.sm = i => {
  const e = planEx(i);
  e.s = Math.max(1, e.s - 1);
  saveState();
  R();
};
A.sp = i => {
  planEx(i).s++;
  saveState();
  R();
};
A.xe = i => {
  S.plan[S.sel].ex.splice(i, 1);
  saveState();
  R();
};
A.rw = () => {
  Object.keys(S.done).forEach(k => k.startsWith(S.wk + '-') && delete S.done[k]);
  saveState();
  sheet();
  R();
};
C.tp = (e, i) => {
  S.plan[S.sel].ex[i].t = e.value;
  saveState();
};
C.no = (e, i) => {
  S.notes[S.plan[S.sel].ex[i].n] = e.value;
  saveState();
};
C.dn = e => {
  S.plan[S.sel].n = e.value;
  saveState();
};
