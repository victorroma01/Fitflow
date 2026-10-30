/* ═══ nutrition/add ═══
   Añadir alimentos y comidas al día.
   Define: allFoods, addSheetBase, addMealItem, addSheet  · acciones/registros: 2
*/
const allFoods = () => FOODS_SRC.concat(S.cf);
function addSheetBase() {
  const a = addState;
  let h = '<div style="margin-bottom:8px">' + ['Alimentos', 'Librería', 'Nuevo'].map((x, i) => '<button class="chip ' + (a.tab == i ? 'on' : '') + '" data-a="at" data-i="' + i + '">' + x + '</button>').join('') + '</div>';
  if (a.pick) {
    const f = a.pick;
    return h + '<h3>' + X(f.n) + '</h3><label>Gramos</label><input id="gr" type="number" value="100" data-u="gr"><p id="pv" class="mu"></p><button class="pr" data-a="fa" style="width:100%">Añadir</button>';
  }
  if (a.tab == 0)
    return h + habitsCard(a.m) + '<input placeholder="Buscar alimento" data-u="fs"><div id="rs"></div>';
  if (a.tab == 1)
    return h + (S.lib.length ? S.lib.map((p, i) => '<div class="it" style="grid-template-columns:1fr auto auto"><span>' + X(p.n) + '<br><small>' + roundInt(sumMacros(p.it.map(itemMacros))[0]) + ' kcal</small></span><button data-a="la" data-i="' + i + '">Añadir</button><button data-a="lx" data-i="' + i + '" style="padding:6px">✕</button></div>').join('') : '<p class="mu">Aún no hay platos. Pulsa ★ Guardar plato en una comida.</p>');
  return h + '<label>Nombre</label><input id="n0">' + [['Kcal', 'k'], ['Hidratos g', 'c'], ['Proteínas g', 'p'], ['Grasas g', 'f'], ['Fibra g', 'fi'], ['Sal g', 's']].map(x => '<label>' + x[0] + ' (por 100 g)</label><input type="number" id="n_' + x[1] + '">').join('') + '<button class="pr" data-a="nf" style="width:100%;margin-top:10px">Guardar alimento</button>';
}
A.la = i => {
  const k = dayKey(new Date(Date.now() + nutriDayOffset * 864e5));
  (S.meals[k] = S.meals[k] || {});
  (S.meals[k][addState.m] = S.meals[k][addState.m] || []).push(...S.lib[i].it.map(x => ({ ...x })));
  saveState();
  sheet();
  R();
};
const addMealItem = () => {
  const g = +$('#gr').value || 100;
  const k = dayKey(new Date(Date.now() + nutriDayOffset * 864e5));
  (S.meals[k] = S.meals[k] || {});
  (S.meals[k][addState.m] = S.meals[k][addState.m] || []).push({ n: addState.pick.n, g, b: addState.pick.b });
  saveState();
  sheet();
  R();
};
A.fa = () => {
  const f = addState && addState.pick;
  const e = $('#gr');
  const g = e ? (+e.value || 100) : 100;
  addMealItem();
  if (f && f.n && f.n != '__proto__' && Array.isArray(f.b)) {
    S.fq = S.fq || {};
    const q = S.fq[f.n] || { c: 0 };
    S.fq[f.n] = { c: (q.c || 0) + 1, g, b: f.b, t: Date.now() };
    saveState();
  }
};
function addSheet() {
  const h = addSheetBase();
  try {
    if (addState && !addState.pick && addState.tab == 0) {
      const m = 'data-u="fs">';
      const k = h.indexOf(m);
      if (k >= 0)
        return h.slice(0, k + m.length) + '<div class="g2" style="margin:8px 0 2px"><button data-a="f2os">' + icon('globe', 16) + ' Buscar online</button><button data-a="f2sc">' + icon('scan', 16) + ' Escanear código</button></div><small class="mu" style="display:block;margin:0 2px 6px;font-size:11px">Open Food Facts: solo se envía el texto o el código que buscas.</small>' + h.slice(k + m.length);
    }
  }
  catch (e) {
    logError('hoja de añadir alimento', e);
  }
  return h;
}
/* — manejadores de esta función (registros A / C / U) — */
A.add = i => {
  addState = { m: i, tab: 0 };
  sheet(addSheet());
  foodList('');
};
A.at = i => {
  addState.tab = i;
  addState.pick = null;
  sheet(addSheet());
  foodList('');
};
A.pk = i => {
  addState.pick = allFoods()[i];
  sheet(addSheet());
  U.gr(100);
};
A.nf = () => {
  const v = id => +$('#n_' + id).value || 0;
  const n = $('#n0').value.trim();
  if (!n)
    return;
  S.cf.push({ n, b: [v('k'), v('c'), v('p'), v('f'), v('fi'), v('s')] });
  saveState();
  addState.tab = 0;
  sheet(addSheet());
  foodList('');
};
A.xi = (i, b) => {
  S.meals[dayKey(new Date(Date.now() + nutriDayOffset * 864e5))][i].splice(+b.dataset.j, 1);
  saveState();
  R();
};
U.gr = v => {
  const e = $('#pv');
  if (e && addState.pick) {
    const t = addState.pick.b.map(x => x * v / 100);
    e.textContent = roundInt(t[0]) + ' kcal · C ' + round1(t[1]) + ' · P ' + round1(t[2]) + ' · G ' + round1(t[3]) + ' · Fibra ' + round1(t[4]) + ' · Sal ' + round1(t[5]);
  }
};
