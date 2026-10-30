/* ═══ programs/manager ═══
   Lista de programas, vista previa y activación.
   Define: previewProgram  · acciones/registros: 4
*/
let previewProgram = 0;
A.pv = (i, b) => {
  previewProgram = i;
  if (b)
    previewLevel = isLevel(S.lv) ? S.lv : 'int';
  if (!isLevel(previewLevel))
    previewLevel = 'int';
  const act = S.cpi < 0 && S.prog == i && previewLevel == S.lv;
  const pl = act ? S.plan : levelPlan(parseProgram(i), previewLevel, i);
  sheet(pgHead(X(PROGRAM_NAMES[i]), 'pg') + '<p class="mu" style="margin:-6px 0 10px">' + X((previewLevel != 'int' && LEVEL_PROGRAM_NOTES[i] && LEVEL_PROGRAM_NOTES[i][previewLevel]) || PROGRAM_NOTES[i] || '') + '</p>' + levelSegment() + weeklySetsCard(pl) + pl.map((d, j) => '<div class="cd" style="margin:8px 0"><div class="row"><b>Día ' + (j + 1) + ' · ' + X(d.n) + '</b>' + (d.ex.length ? '<small>' + d.ex.reduce((s, e) => s + e.s, 0) + ' series</small>' : '') + '</div>' + (d.ex.length ? d.ex.map(e => '<div class="mu" style="font-size:13px;margin-top:3px">' + (e.b ? '<b style="color:#f59e0b;font-size:11px">SS </b>' : '') + X(e.n) + ' · ' + e.s + ' × ' + targetText(e) + ' · ' + fmtMinSec(restOf(e)) + '</div>').join('') : '<div class="mu" style="font-size:13px;margin-top:3px">Descanso</div>') + '</div>').join('') + '<div style="height:84px"></div>' + (act ? '' : (S.cpi < 0 && S.prog == i ? '<button class="sb pr" data-a="lvs" data-v="' + previewLevel + '" style="padding:16px;font-size:16px;border-radius:16px">Usar nivel ' + LEVEL_NAMES[previewLevel].toLowerCase() + '</button>' : '<button class="sb pr" data-a="sp2" data-i="' + i + '" style="padding:16px;font-size:16px;border-radius:16px">Cambiar plan de entrenamiento</button>')));
  sheetToTop();
};
A.pg = () => fullPage(pgHead('Programas') + '<button class="pr" data-a="cpn" style="width:100%;margin:0 0 6px;padding:15px;border-radius:16px;font-size:16px">+ Crear programa</button><div class="g2" style="margin:0 0 6px"><button data-a="pgi">Importar</button><button data-a="pgs0">Compartir plan</button></div>' + (S.cp.length ? '<div class="ph">Mis programas</div>' + S.cp.map((p, k) => '<button class="mb pgc" data-a="cpv" data-i="' + k + '"><span style="flex:1;min-width:0">' + programRow(p.n, p.o && isLevel(p.o.niv) ? levelTag(p.o.niv) : '') + '<small>' + (S.cpi == k ? '<b style="color:var(--a1)">Plan actual</b> · ' : '') + p.plan.filter(d => d.ex.length).length + ' entrenos · ' + p.plan.reduce((s, d) => s + d.ex.length, 0) + ' ejercicios</small></span>›</button>').join('') + '<div class="ph">Predefinidos</div>' : '<div class="ph">Predefinidos</div>') + PROGRAM_NAMES.map((n, i) => {
  const act = S.cpi < 0 && S.prog == i;
  const pl = act ? S.plan : levelPlan(parseProgram(i), S.lv, i);
  return '<button class="mb pgc" data-a="pv" data-i="' + i + '"><span style="flex:1;min-width:0">' + programRow(n, levelTag(S.lv)) + '<small>' + (act ? '<b style="color:var(--a1)">Plan actual</b> · ' : '') + pl.filter(d => d.ex.length).length + ' entrenos · ' + pl.reduce((s, d) => s + d.ex.length, 0) + ' ejercicios</small></span>›</button>';
}).join(''));
A.sp2 = i => {
  if (W) {
    toast('Termina o descarta el entreno en curso');
    return;
  }
  previewProgram = i;
  const v = isLevel(previewLevel) ? previewLevel : S.lv;
  confirmDialog('¿Cambiar de plan?', 'Pasarás a «' + X(PROGRAM_NAMES[i]) + '» con nivel ' + LEVEL_NAMES[v].toLowerCase() + '. Se reiniciará el progreso de la semana.', 'sp2c', 'Cambiar');
};
A.sp2c = () => {
  syncCustomProgram();
  dropResume();
  const v = isLevel(previewLevel) ? previewLevel : (isLevel(S.lv) ? S.lv : 'int');
  S.lv = v;
  S.prog = previewProgram;
  S.cpi = -1;
  S.plan = levelPlan(parseProgram(previewProgram), v, previewProgram);
  S.wk = 1;
  S.sel = 0;
  S.done = {};
  saveState();
  sheet();
  R();
};
