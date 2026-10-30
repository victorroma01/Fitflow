/* ═══ workout/deload ═══
   Semana de descarga.
   Define: deloadEvery, isDeloadWeek, deloadWeekSync, deloadSuggested, deloadCard  · acciones/registros: 4
*/
const deloadEvery = () => ({ ini: 6, int: 5, ava: 4 })[S.lv || 'int'] || 5;
const isDeloadWeek = wk => S.dl && S.dl[wk] != null ? !!S.dl[wk] : (wk > 1 && wk % deloadEvery() == 0);
const deloadWeekSync = () => {
  if (S.wk < lastWeek) {
    S.dl = {};
    S.dq = {};
  }
  lastWeek = S.wk;
};
const deloadSuggested = () => {
  const l = S.logs.filter(x => !x.k).slice(-2);
  return l.length == 2 && l.every(x => +x.q >= 9);
};
const deloadCard = () => {
  const on = isDeloadWeek(S.wk);
  const L = LEVEL_NAMES && LEVEL_NAMES[S.lv || 'int'] ? LEVEL_NAMES[S.lv || 'int'].toLowerCase() : 'intermedio';
  if (on)
    return '<div class="cd dlc"><b>Semana de descarga</b><div class="mu" style="font-size:13px;margin-top:4px">Esta semana haces la mitad de series, sin subir el peso y con 3-4 repeticiones en reserva. Se aplica solo al empezar cada entreno. Nivel ' + L + ': descarga cada ' + deloadEvery() + ' semanas.</div><button data-a="dloff" style="margin-top:10px;width:100%">Hacer la semana normal</button></div>';
  if (S.wk > 1 && deloadSuggested() && !(S.dq && S.dq[S.wk]))
    return '<div class="cd dlc"><b>Esfuerzo muy alto</b><div class="mu" style="font-size:13px;margin-top:4px">Tus dos últimos entrenos han salido con RPE 9 o más. Una semana de descarga ayuda a recuperar y a seguir progresando.</div><div class="g2" style="margin-top:10px"><button data-a="dlno">Ahora no</button><button class="pr" data-a="dlon">Activar descarga</button></div></div>';
  return '';
};
A.dlon = () => {
  S.dl = S.dl || {};
  S.dl[S.wk] = 1;
  saveState();
  R();
};
A.dloff = () => {
  S.dl = S.dl || {};
  S.dl[S.wk] = 0;
  saveState();
  R();
};
A.dlno = () => {
  S.dq = S.dq || {};
  S.dq[S.wk] = 1;
  saveState();
  R();
};
A.dlon2 = () => {
  A.dlon();
  sheet();
  toast('Semana de descarga activada');
};
