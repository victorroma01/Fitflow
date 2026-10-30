/* ═══ programs/levels ═══
   Niveles de programa (aplicar, variantes, selector).
   Define: isLevel, round5, levelDay, levelPlan, planSignature, currentCustomProgram, levelsActive, levelGenerate, planEdited, weekStarted, levelDot, levelVars, levelMenuOpen, previewLevel, pendingLevel, levelPill, … (+4)  · acciones/registros: 5
*/
const isLevel = v => LEVEL_KEYS.includes(v);
const round5 = x => Math.max(5, Math.round(x / 5) * 5);
const levelDay = (d, lv) => {
  if (!d.ex.length)
    return { n: d.n, ex: [] };
  const src = d.ex.map(e => ({ ...e, rg: e.rg ? e.rg.slice() : e.rg }));
  const sw = LEVEL_SWAPS[lv] || {};
  let ex = [];
  src.forEach(e => {
    const r = sw[e.n];
    if (r) {
      if (src.some(x => x !== e && x.n == r) || ex.some(x => x.n == r)) {
        if (lv == 'ini')
          return;
        ex.push(e);
        return;
      }
      e.n = r;
      e.sw = 1;
    }
    ex.push(e);
  });
  if (lv == 'ini')
    ex = ex.slice(0, 6);
  ex.forEach((e, i) => {
    const u = e.u;
    const rg = e.rg;
    if (lv == 'ini') {
      if (u) {
        if (e.s >= 4)
          e.s = Math.max(2, e.s - 2);
        else if (e.s == 3)
          e.s = 2;
        if (rg && (u == 'min' || u == 's' || u == 'cal'))
          e.rg = [round5(rg[0] * .7), round5(rg[1] * .7)];
      }
      else {
        e.s = Math.max(2, i < 3 ? Math.min(e.s, 3) : Math.min(e.s, 2));
        if (rg && rg[0] < 8)
          e.rg = [8, Math.min(12, Math.max(rg[1], 10))];
      }
      if (e.r > 120)
        e.r = 120;
      delete e.b;
    }
    else if (lv == 'ava') {
      if (u) {
        if (u == 'min') {
          if (rg)
            e.rg = [round5(rg[0] * 1.25), round5(rg[1] * 1.25)];
        }
        else if (e.s >= 2)
          e.s = Math.min(10, e.s + (e.s >= 6 ? 2 : 1));
      }
      else {
        if (i < 3)
          e.s = Math.min(5, e.s + 1);
        if (i < 2 && rg && rg[1] > rg[0] && rg[0] <= 8 && rg[1] <= 10) {
          const lo = Math.max(3, rg[0] - 1);
          e.rg = [lo, Math.max(lo + 2, rg[1] - 2)];
        }
        if (e.r >= 120)
          e.r = Math.min(240, e.r + 30);
      }
    }
  });
  if (lv == 'ava' && ex.length >= 5) {
    const a = ex.length - 2;
    const c = ex.length - 1;
    if (!ex[a].u && !ex[c].u && ex[a].b == null && ex[c].b == null) {
      const m = Math.max(0, ...ex.map(x => x.b || 0)) + 1;
      ex[a].b = ex[c].b = m;
    }
  }
  ex.forEach(e => {
    if (e.sw) {
      const o = LEVEL_OVERRIDES[e.n];
      if (o)
        Object.assign(e, o, o.rg ? { rg: o.rg.slice() } : {});
      delete e.sw;
    }
  });
  const cnt = {};
  ex.forEach(e => {
    if (e.b != null)
      cnt[e.b] = (cnt[e.b] || 0) + 1;
  });
  ex.forEach(e => {
    if (e.b != null && cnt[e.b] < 2)
      delete e.b;
  });
  return { n: d.n, ex };
};
const levelPlan = (pl, lv, id) => {
  if (!isLevel(lv) || lv == 'int')
    return pl;
  const tx = pl.map(d => levelDay(d, lv));
  const L = (LEVEL_LAYOUTS[id] || {})[lv];
  if (!L)
    return tx;
  return L.map(k => k === -1 ? { n: 'Descanso', ex: [] } : typeof k == 'string' ? parseDays(LEVEL_EXTRA_DAYS[k])[0] : tx[k]);
};
const planSignature = pl => JSON.stringify(pl.map(d => [d.n, d.ex.map(e => [e.n, e.s, e.rg || 0, e.u || 0, e.r || 0, e.b || 0])]));
const currentCustomProgram = () => S.cpi >= 0 ? S.cp[S.cpi] : null;
const levelsActive = () => S.cpi < 0 || !!(currentCustomProgram() && currentCustomProgram().o);
const levelGenerate = (v) => {
  const p = currentCustomProgram();
  if (p)
    return p.o ? generateProgram({ ...p.o, niv: v, vr: p.o.vr || 0 }) : null;
  return levelPlan(parseProgram(S.prog), v, S.prog);
};
const planEdited = () => {
  try {
    const g = levelGenerate(S.lv);
    return !g || planSignature(g) != planSignature(S.plan);
  }
  catch (e) {
    return true;
  }
};
const weekStarted = () => Object.keys(S.done || {}).some(k => k.indexOf(S.wk + '-') == 0 && S.done[k]);
const levelDot = v => '<i class="lvd" style="--lc:' + LEVEL_COLORS[v] + ';--ld:' + LEVEL_COLORS[v] + '38"></i>';
const levelVars = v => '--lc:' + LEVEL_COLORS[v] + ';--lb:' + LEVEL_COLORS[v] + '24;--lr:' + LEVEL_COLORS[v] + '6b';
let levelMenuOpen = false;
let previewLevel = null;
let pendingLevel = null;
const levelPill = () => {
  if (!levelsActive())
    return '';
  const v = isLevel(S.lv) ? S.lv : 'int';
  return '<div class="lvw" style="' + levelVars(v) + '"><button class="lvp" data-a="lvo" aria-haspopup="menu" aria-expanded="' + (levelMenuOpen ? 'true' : 'false') + '" aria-label="Nivel del programa: ' + LEVEL_NAMES[v] + '">' + levelDot(v) + '<span>' + LEVEL_NAMES[v] + '</span><span class="lvc">▾</span></button>' +
    (levelMenuOpen ? '<div class="lvb" data-a="lvx"></div><div class="lvm" role="menu">' + LEVEL_KEYS.map(k => '<button class="lvi' + (k == v ? ' on' : '') + '" data-a="lvs" data-v="' + k + '" role="menuitem" style="' + levelVars(k) + '">' + levelDot(k) + '<span><b>' + LEVEL_NAMES[k] + '</b><small class="mu">' + LEVEL_SUMMARY[k] + '</small></span>' + (k == v ? '<em>✓</em>' : '') + '</button>').join('') + '</div>' : '') + '</div>';
};
A.lvo = () => {
  levelMenuOpen = !levelMenuOpen;
  R();
};
A.lvx = () => {
  levelMenuOpen = false;
  R();
};
const applyLevel = v => {
  try {
    const p = currentCustomProgram();
    let np;
    if (p) {
      if (!p.o)
        return;
      const o = { ...p.o, niv: v };
      np = generateProgram({ ...o, vr: o.vr || 0 });
      p.o = o;
      p.plan = clone(np);
      S.plan = clone(np);
    }
    else {
      np = levelPlan(parseProgram(S.prog), v, S.prog);
      S.plan = np;
    }
    dropResume();
    S.lv = v;
    S.sel = 0;
    Object.keys(S.done || {}).forEach(k => {
      if (k.indexOf(S.wk + '-') == 0)
        delete S.done[k];
    });
    saveState();
    sheet();
    R();
    toast('Nivel ' + LEVEL_NAMES[v].toLowerCase() + ': programa reorganizado');
  }
  catch (e) {
    toast('No se pudo cambiar el nivel');
    R();
  }
};
A.lvs = (i, b) => {
  const v = b && b.dataset ? b.dataset.v : '';
  levelMenuOpen = false;
  if (!isLevel(v) || v == S.lv) {
    R();
    return;
  }
  if (W) {
    R();
    toast('Termina o descarta el entreno en curso');
    return;
  }
  pendingLevel = v;
  const ed = planEdited();
  const dn = weekStarted();
  const zr = !!pendingResume;
  if (ed || dn || zr) {
    R();
    confirmDialog('Cambiar a nivel ' + LEVEL_NAMES[v].toLowerCase(), 'Se reorganizarán los días del programa para el nivel ' + LEVEL_NAMES[v].toLowerCase() + '.' + (ed ? ' Perderás los cambios que hayas hecho a mano en los días.' : '') + (dn ? ' Se reiniciará el progreso de esta semana.' : '') + (zr ? ' Se descartará el entreno pausado.' : ''), 'lvc', 'Cambiar');
  }
  else
    applyLevel(v);
};
A.lvc = () => {
  if (isLevel(pendingLevel))
    applyLevel(pendingLevel);
};
const levelSegment = () => '<div class="lvs">' + LEVEL_KEYS.map(k => '<button class="' + (k == previewLevel ? 'on' : '') + '" data-a="pvl" data-v="' + k + '" style="' + levelVars(k) + '">' + levelDot(k) + '<span>' + LEVEL_NAMES[k] + '</span></button>').join('') + '</div><p class="mu lvn">' + LEVEL_DETAILS[previewLevel] + '</p>';
A.pvl = (i, b) => {
  const v = b && b.dataset ? b.dataset.v : '';
  if (isLevel(v))
    previewLevel = v;
  A.pv(previewProgram);
};
const levelTag = v => '<span class="lvt">' + levelDot(v) + LEVEL_NAMES[v] + '</span>';
const programRow = (n, tag) => '<span class="pgr"><b style="font-size:17px">' + X(n) + '</b>' + tag + '</span>';
