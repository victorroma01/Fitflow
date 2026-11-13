// Pruebas de los cálculos (src/js/core/calc.js y lo que usa de core/util.js), sin navegador: node --test tests/calc.test.mjs
// Cada función se prueba suelta, con casos hechos a mano y con datos al azar (semilla fija) frente a la misma cuenta hecha aquí.
process.env.TZ = 'Europe/Madrid'; // los cambios de hora de las pruebas de calendario son los de aquí
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// los dos módulos son JS de la app (módulos ES): se copian a una carpeta con "type": "module" para cargarlos tal cual
const dir = mkdtempSync(join(tmpdir(), 'sf-calc-'));
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
for (const f of ['util.js', 'calc.js'])
  writeFileSync(join(dir, f), readFileSync(new URL('../src/js/core/' + f, import.meta.url), 'utf8'));
globalThis.window = {}; // core/util anota en window que ha cargado
const U = await import(pathToFileURL(join(dir, 'util.js')));
const C = await import(pathToFileURL(join(dir, 'calc.js')));

// números al azar repetibles (mulberry32)
const rng = seed => () => {
  seed |= 0;
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, a + ' ≠ ' + b);
const food = (g, b) => ({ n: 'x', g, b });

test('itemMacros: los valores por 100 g, por los gramos', () => {
  assert.deepEqual(C.itemMacros(food(150, [200, 10, 20, 4, 2, 0.5])), [300, 15, 30, 6, 3, 0.75]);
  assert.deepEqual(C.itemMacros(food(0, [200, 10, 20, 4, 2, 0.5])), [0, 0, 0, 0, 0, 0]);
  near(C.itemMacros(food(12.5, [370, 60, 13, 7, 10, 0]))[0], 46.25);
});

test('itemMacros: un alimento roto da seis ceros y no lanza', () => {
  for (const it of [null, undefined, {}, { g: 100 }, { g: 'abc', b: [100] }, { g: 100, b: 'no' }, { g: 100, b: [null, 'x', {}, undefined] }, 7, 'x'])
    assert.deepEqual(C.itemMacros(it), [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(C.itemMacros({ g: 100, b: [100, 5] }), [100, 5, 0, 0, 0, 0]);
});

test('sumMacros: suma sin redondear; sin nada, seis ceros', () => {
  assert.deepEqual(C.sumMacros([]), [0, 0, 0, 0, 0, 0]);
  const s = C.sumMacros([[0.4, 1, 0, 0, 0, 0], [0.4, 2, 0, 0, 0, 0], [0.4, 3, 0, 0, 0, 0]]);
  near(s[0], 1.2);
  assert.equal(Math.round(s[0]), 1); // 0,4 + 0,4 + 0,4 = 1,2 → 1; redondeando cada uno daría 0
  assert.equal(s[1], 6);
});

test('mealItems y dayTotals: todas las comidas del día, solo alimentos con nombre', () => {
  const day = { 0: [food(100, [100, 10, 10, 2, 0, 0])], 4: [food(150, [300, 30, 20, 10, 0, 0])], 2: 'roto', 3: [null, { g: 100, b: [999] }, 5], x: [food(100, [1, 0, 0, 0, 0, 0])] };
  assert.equal(C.mealItems(day, 0).length, 1);
  assert.deepEqual(C.mealItems(day, 2), []);
  assert.deepEqual(C.mealItems(day, 3), []); // sin nombre no cuentan
  assert.deepEqual(C.mealItems(null, 0), []);
  // la comida 4 cuenta aunque el día tenga ahora 3 comidas: 100 + 450 + 1
  assert.deepEqual(C.dayTotals(day).slice(0, 4), [551, 55, 40, 17]);
  assert.deepEqual(C.dayTotals(undefined), [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(C.dayTotals('roto'), [0, 0, 0, 0, 0, 0]);
});

test('dayTotals: igual que la suma hecha aparte, en 200 días al azar', () => {
  const r = rng(20261112);
  for (let n = 0; n < 200; n++) {
    const day = {};
    const want = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 1 + Math.floor(r() * 6); i++) {
      day[i] = [];
      for (let j = 0; j < Math.floor(r() * 6); j++) {
        const it = food(Math.round(r() * 6000) / 10, [Math.round(r() * 900), ...[0, 0, 0, 0, 0].map(() => Math.round(r() * 1000) / 10)]);
        day[i].push(it);
        it.b.forEach((v, k) => want[k] += v * it.g / 100);
      }
    }
    C.dayTotals(day).forEach((v, k) => near(v, want[k], 1e-6));
  }
});

test('macroTargets: los gramos del objetivo dan sus kcal (4, 4 y 9 kcal por gramo)', () => {
  const t = C.macroTargets({ k: 2000, c: 50, p: 20, f: 30 });
  assert.deepEqual(t, [2000, 250, 100, 2000 * 30 / 900]);
  near(t[1] * 4 + t[2] * 4 + t[3] * 9, 2000);
});

test('energyNeeds: Mifflin-St Jeor por el factor de actividad', () => {
  const m = C.energyNeeds({ sex: 'M', age: '30', h: '178', w: '80', act: '2' });
  near(m.bm, 10 * 80 + 6.25 * 178 - 5 * 30 + 5); // 1.767,5
  near(m.td, 1767.5 * 1.55);
  const f = C.energyNeeds({ sex: 'F', age: 45, h: 165, w: 62.5, act: 0 });
  near(f.bm, 10 * 62.5 + 6.25 * 165 - 5 * 45 - 161);
  near(f.td, f.bm * 1.2);
  // sin actividad elegida o con una que no existe, la ligera (1,375)
  near(C.energyNeeds({ sex: 'M', age: 30, h: 178, w: 80 }).td, 1767.5 * 1.375);
  near(C.energyNeeds({ sex: 'M', age: 30, h: 178, w: 80, act: '9' }).td, 1767.5 * 1.375);
});

test('energyNeeds: sin datos o con datos imposibles, 0', () => {
  for (const b of [{}, { age: 30, h: 178 }, { age: 30, h: 178, w: -80 }, { age: 500, h: 178, w: 80 }, { age: 30, h: 17, w: 80 }, { age: 'abc', h: 178, w: 80 }, { age: 30, h: 178, w: 301 }, { age: 13, h: 178, w: 80 }])
    assert.equal(C.energyNeeds(b), 0);
  for (const [k, [lo, hi]] of Object.entries(C.BIO_RANGES)) {
    const ok = { age: 30, h: 178, w: 80 };
    assert.notEqual(C.energyNeeds({ ...ok, [k]: lo }), 0);
    assert.notEqual(C.energyNeeds({ ...ok, [k]: hi }), 0);
    assert.equal(C.energyNeeds({ ...ok, [k]: lo - 1 }), 0);
    assert.equal(C.energyNeeds({ ...ok, [k]: hi + 1 }), 0);
  }
});

test('dietPlan: kcal por el factor, proteína y grasa por kg, y los hidratos el resto', () => {
  // mantenimiento: 1,8 g/kg de proteína y 1 g/kg de grasa, 80 kg, 2.740 kcal
  const g = C.dietPlan(2739.625, 80, ['Mantenimiento', 1, 1.8, 1]);
  assert.deepEqual(g, { k: 2740, c: 100 - 21 - 26, p: Math.round(1.8 * 80 * 400 / 2740), f: Math.round(80 * 900 / 2740) });
  assert.equal(g.p, 21);
  assert.equal(g.f, 26);
});

test('dietPlan: siempre de 0 a 100, suman 100, 10 % de hidratos al menos y 800 kcal o más (5.000 casos al azar)', () => {
  const r = rng(7);
  for (let n = 0; n < 5000; n++) {
    const td = 500 + r() * 6000;
    const w = 30 + r() * 270;
    const d = ['x', .7 + r() * .6, 1 + r() * 2, .5 + r()];
    const g = C.dietPlan(td, w, d);
    assert.equal(g.c + g.p + g.f, 100);
    for (const k of ['c', 'p', 'f'])
      assert.ok(g[k] >= 0 && g[k] <= 100 && Number.isInteger(g[k]), JSON.stringify([td, w, d, g]));
    assert.ok(g.c >= 10 && g.p <= 60 && g.k >= 800 && Number.isInteger(g.k), JSON.stringify([td, w, d, g]));
  }
  // el caso que antes fallaba: mucho peso y poco gasto daban más del 100 % de proteína y grasa negativa
  assert.deepEqual(C.dietPlan(1300, 200, ['Mini cut', .75, 2.4, .8]), { k: 975, c: 10, p: 60, f: 30 });
  assert.equal(C.dietPlan(900, 40, ['Mini cut', .75, 2.4, .8]).k, 800);
});

test('nutritionPeriod: días anotados, días en objetivo (±10 %) y media de los anotados', () => {
  const day = kcal => ({ 0: [food(100, [kcal, 0, kcal / 10, 0, 0, 0])] });
  const meals = { '2026-11-09': day(2000), '2026-11-10': day(2200), '2026-11-11': day(2201), '2026-11-12': day(1800), '2026-11-13': day(1799), '2026-11-14': day(50), '2026-11-15': day(51) };
  const p = C.nutritionPeriod(meals, Object.keys(meals).concat('2026-11-16'), 2000);
  assert.deepEqual(p.days.map(d => d.on), [true, true, true, true, true, false, true, false]); // 50 kcal no es un día anotado; 51, sí
  assert.deepEqual(p.days.map(d => d.ok), [true, true, false, true, false, false, false, false]); // 2.200 y 1.800 entran; 2.201 y 1.799, no
  assert.equal(p.logged, 6);
  assert.equal(p.ok, 3);
  near(p.avg[0], (2000 + 2200 + 2201 + 1800 + 1799 + 51) / 6);
  near(p.avg[2], p.avg[0] / 10);
});

test('nutritionPeriod: sin comidas o sin objetivo no se rompe', () => {
  const e = C.nutritionPeriod({}, ['2026-11-09', '2026-11-10'], 2000);
  assert.deepEqual([e.logged, e.ok, e.avg], [0, 0, [0, 0, 0, 0, 0, 0]]);
  assert.equal(C.nutritionPeriod(undefined, ['2026-11-09'], 2000).logged, 0);
  const n = C.nutritionPeriod({ '2026-11-09': { 0: [food(100, [2000, 0, 0, 0, 0, 0])] } }, ['2026-11-09'], 0);
  assert.deepEqual([n.logged, n.ok], [1, 0]);
  assert.deepEqual(C.nutritionPeriod({}, [], 2000).days, []);
});

test('sessionVolume: repeticiones × peso de las series hechas de los ejercicios con peso', () => {
  const sets = [[{ r: 8, w: 80, ok: 1 }, { r: 8, w: 80, ok: 1 }, { r: 6, w: 85, ok: 0 }], [{ r: 30, w: '', ok: 1 }], [{ r: 400, w: 0, ok: 1 }, { r: 10, w: 20, ok: 1 }]];
  assert.deepEqual(C.sessionVolume(sets, [true, true, false]), { v: 8 * 80 * 2, n: 5 }); // el tercero va en metros: no suma volumen, sí series
  assert.deepEqual(C.sessionVolume(sets, [true, true, true]), { v: 1280 + 200, n: 5 });
  assert.deepEqual(C.sessionVolume([], []), { v: 0, n: 0 });
  assert.deepEqual(C.sessionVolume([[{ r: 'x', w: null, ok: 1 }]], [true]), { v: 0, n: 1 });
});

test('sessionVolume: igual que la suma hecha aparte, en 300 sesiones al azar', () => {
  const r = rng(99);
  for (let n = 0; n < 300; n++) {
    const sets = [];
    const weighted = [];
    let v = 0;
    let done = 0;
    for (let i = 0; i < 1 + Math.floor(r() * 8); i++) {
      weighted.push(r() < .85);
      sets.push([...Array(1 + Math.floor(r() * 6))].map(() => ({ r: 1 + Math.floor(r() * 25), w: Math.round(r() * 80) * 2.5, ok: r() < .8 ? 1 : 0 })));
      sets[i].forEach(s => {
        if (s.ok) {
          done++;
          if (weighted[i])
            v += s.r * s.w;
        }
      });
    }
    const got = C.sessionVolume(sets, weighted);
    near(got.v, v, 1e-6);
    assert.equal(got.n, done);
  }
});

test('est1RM y bestLift: la mejor marca por 1RM estimado (Epley)', () => {
  near(U.est1RM(100, 10), 100 * (1 + 10 / 30));
  assert.equal(U.est1RM(120, 0), 120);
  const hist = [{ d: '2026-10-01', s: [[8, 100, 8, 0], [5, 110, 9, 0]] }, { d: '2026-10-08', s: [[10, 100, 8, 0], [1, 0, 0, 0]] }];
  // 100 × 10 → 133,3; 110 × 5 → 128,3; 100 × 8 → 126,7
  assert.deepEqual(C.bestLift(null, hist), { w: 100, r: 10, e: 100 * (1 + 10 / 30), d: '2026-10-08' });
  const rec = { w: 120, r: 5, e: 140, d: '2026-01-01' };
  assert.equal(C.bestLift(rec, hist), rec); // la guardada es mejor
  assert.equal(C.bestLift(null, [{ d: 'x', s: [[10, 0], [5, '']] }]), null); // sin peso no hay marca
  assert.equal(C.bestLift(null, undefined), null);
  // un empate no cambia la marca (ni su fecha)
  const tie = { w: 100, r: 10, e: 100 * (1 + 10 / 30), d: '2026-01-01' };
  assert.equal(C.bestLift(tie, hist), tie);
});

test('unitFromName y measuredInReps: en qué se mide un ejercicio por su nombre', () => {
  assert.deepEqual(C.unitFromName('Farmers carry 200 m'), { u: 'm', rg: [200, 200] });
  assert.deepEqual(C.unitFromName('Carrera 1 km con chaleco'), { u: 'm', rg: [1000, 1000] });
  assert.deepEqual(C.unitFromName('Remo 0,5 km'), { u: 'm', rg: [500, 500] });
  assert.deepEqual(C.unitFromName('Carrera continua suave'), { u: 'min', rg: [45, 45] });
  assert.deepEqual(C.unitFromName('Plancha con arrastre de peso'), { u: 's', rg: [40, 40] });
  assert.equal(C.unitFromName('Press banca'), null);
  assert.equal(C.unitFromName('Remo con barra'), null); // «Remo continuo» sí, «Remo con barra» no
  for (const n of ['Press banca', 'Sentadilla', 'Curl martillo', 'Mi ejercicio'])
    assert.equal(C.measuredInReps(n), true, n);
  for (const n of ['Sled push 50 m', 'Farmers carry 200 m', 'Farmers hold', 'Plancha', 'Cinta'])
    assert.equal(C.measuredInReps(n), false, n);
});

test('elapsedMs: lo que lleva un entreno, sin la pausa en marcha', () => {
  assert.equal(C.elapsedMs(1000, 0, 61000), 60000);
  assert.equal(C.elapsedMs(1000, 31000, 9999999), 30000); // en pausa desde el segundo 30: el reloj no corre
  assert.equal(C.elapsedMs(5000, 0, 1000), 0); // nunca negativo
});

test('liftScore: qué serie cuenta para las marcas', () => {
  near(C.liftScore([10, 100, 8, 0]), 100 * (1 + 10 / 30));
  near(C.liftScore([1, 100]), 100 * (1 + 1 / 30));
  near(C.liftScore([30, 20, 0, 0]), 40);
  assert.equal(C.liftScore([0, 100, 0, 0]), 0); // sin repeticiones
  assert.equal(C.liftScore([31, 20, 0, 0]), 0); // más de 30: Epley ya no estima nada
  assert.equal(C.liftScore([200, 32, 0, 0]), 0); // 200 m no son repeticiones
  assert.equal(C.liftScore([10, 0, 0, 0]), 0); // sin peso
  assert.equal(C.liftScore([10, 60, 0, 1]), 0); // drop set
  assert.equal(C.liftScore([4, 80, 0, 2]), 0); // rest-pause
  for (const bad of [null, undefined, 'x', {}, [], ['a', 'b'], [NaN, NaN]])
    assert.equal(C.liftScore(bad), 0);
});

test('bestSet y bestLift: las filas extra, las series sin repeticiones y las de más de 30 no dan marca', () => {
  // la serie con drop set: la principal (80 × 3 → 88) cuenta; el drop (60 × 15 → 90), no
  assert.deepEqual(C.bestSet({ d: '2026-11-01', s: [[3, 80, 0, 0, 'DS'], [15, 60, 0, 1, 'DS']] }), { w: 80, r: 3, e: 88, d: '2026-11-01' });
  assert.equal(C.bestSet({ d: 'x', s: [[0, 100, 0, 0], [40, 10, 0, 0]] }), null);
  assert.equal(C.bestSet(null), null);
  assert.equal(C.bestSet({ d: 'x' }), null);
  assert.equal(C.bestLift(null, [{ d: 'x', s: [[0, 300, 0, 0]] }, { d: 'y', s: [[200, 32, 0, 0]] }]), null);
  assert.equal(C.bestLift(null, 'roto'), null);
  // con datos al azar, la mejor marca es el máximo de liftScore y nunca sale de una fila que no cuenta
  const r = rng(77);
  for (let k = 0; k < 300; k++) {
    const hist = Array.from({ length: 1 + Math.floor(r() * 6) }, (_, i) => ({ d: '2026-0' + (1 + i) + '-10', s: Array.from({ length: 1 + Math.floor(r() * 5) }, () => [Math.floor(r() * 40), Math.round(r() * 150), 0, r() < .2 ? 1 + Math.floor(r() * 2) : 0]) }));
    const all = hist.flatMap(x => x.s);
    const mx = Math.max(0, ...all.map(C.liftScore));
    const b = C.bestLift(null, hist);
    if (!mx)
      assert.equal(b, null);
    else {
      near(b.e, mx);
      assert.ok(b.r >= 1 && b.r <= 30 && b.w > 0);
    }
  }
});

test('kgToLb y lbToKg: libras con un decimal, kg con dos; ida y vuelta sin perder el peso escrito', () => {
  assert.equal(C.kgToLb(100), 220.5);
  assert.equal(C.lbToKg(225), 102.06);
  for (let lb = 2.5; lb <= 700; lb += 2.5)
    assert.equal(C.kgToLb(C.lbToKg(lb)), lb, lb + ' lb');
});

test('stepUpWeight: un escalón más (2,5 o 5 kg; 5 o 10 lb)', () => {
  assert.equal(C.stepUpWeight(80, 2.5, false), 82.5);
  assert.equal(C.stepUpWeight(100, 5, false), 105);
  assert.equal(C.stepUpWeight(7.25, 2.5, false), 10); // 9,75 → medio kilo más cercano (hacia arriba)
  assert.equal(C.kgToLb(C.stepUpWeight(C.lbToKg(135), 2.5, true)), 140);
  assert.equal(C.kgToLb(C.stepUpWeight(C.lbToKg(225), 5, true)), 235);
});

test('deloadWeight: el 65 %, redondeado a lo que se carga y nunca más que el peso normal', () => {
  assert.equal(C.deloadWeight(100, false), 65);
  assert.equal(C.deloadWeight(80, false), 52.5);
  assert.equal(C.deloadWeight(60, false), 40);
  assert.equal(C.deloadWeight(2, false), 1.5); // antes salían 2,5 kg: más que el normal
  assert.equal(C.deloadWeight(6, false), 4); // antes, 5 kg (el 83 %)
  assert.equal(C.kgToLb(C.deloadWeight(C.lbToKg(135), true)), 90);
  assert.equal(C.kgToLb(C.deloadWeight(C.lbToKg(3), true)), 2.5); // antes salían 5 lb
  for (const lb of [false, true]) {
    const unit = w => lb ? C.kgToLb(w) : w;
    for (let w = .5; w <= 300; w += .25) {
      const d = C.deloadWeight(w, lb);
      assert.ok(d > 0 && d <= w, 'descarga de ' + w + ' → ' + d);
      // desde 3 kg (7 lb), entre la mitad y el 80 % del normal
      if (unit(w) >= (lb ? 7 : 3))
        assert.ok(d >= w * .5 - 1e-9 && d <= w * .8 + 1e-9, 'descarga de ' + w + (lb ? ' (lb)' : '') + ' → ' + d);
      // múltiplo de medio kilo, o de 2,5 lb (si no se queda en el peso normal, que puede ser cualquiera)
      if (d < w)
        near(unit(d) / (lb ? 2.5 : .5), Math.round(unit(d) / (lb ? 2.5 : .5)), 1e-6);
    }
  }
});

test('dropSetWeight: un 25 % menos y nunca más que la serie', () => {
  assert.equal(C.dropSetWeight(80, false), 60);
  assert.equal(C.dropSetWeight(22.5, false), 17);
  assert.equal(C.kgToLb(C.dropSetWeight(C.lbToKg(100), true)), 75);
  for (const lb of [false, true])
    for (let w = .5; w <= 300; w += .25) {
      const d = C.dropSetWeight(w, lb);
      assert.ok(d > 0 && d <= w, 'drop de ' + w + ' → ' + d);
      if (w >= (lb ? 9 : 4))
        assert.ok(d >= w * .6 && d <= w * .85, 'drop de ' + w + ' → ' + d);
    }
});

test('progressionRule: sube al llegar todas al tope, baja si ninguna llega al mínimo y, si no, mantiene', () => {
  const o = { step: 2.5, lb: false, deload: false };
  // todas al tope del rango 8-12 → un escalón más
  let P = C.progressionRule([[12, 60, 8, 0], [12, 60, 8, 0], [12, 60, 9, 0]], [8, 12], o);
  assert.deepEqual([P.up, P.dn, P.w, P.nw, P.why, P.even], [true, false, 60, 62.5, '', true]);
  // todas al tope, pero con RPE medio de 9,5 o más → mantiene
  P = C.progressionRule([[12, 60, 10, 0], [12, 60, 9, 0]], [8, 12], o);
  assert.deepEqual([P.up, P.nw, P.why], [false, 60, 'rpe']);
  // ninguna llega al mínimo → un 8 % menos
  P = C.progressionRule([[6, 60, 0, 0], [5, 60, 0, 0]], [8, 12], o);
  assert.deepEqual([P.up, P.dn, P.nw], [false, true, 55]);
  // unas sí y otras no → mismo peso
  P = C.progressionRule([[12, 60, 0, 0], [9, 60, 0, 0]], [8, 12], o);
  assert.deepEqual([P.up, P.dn, P.nw, P.r], [false, false, 60, 12]);
  // semana de descarga: ni sube ni baja
  P = C.progressionRule([[12, 60, 0, 0], [12, 60, 0, 0]], [8, 12], { ...o, deload: true });
  assert.deepEqual([P.up, P.dn, P.nw, P.why], [false, false, 60, 'dl']);
  // las filas extra no cuentan: el drop set con menos repeticiones no impide subir
  P = C.progressionRule([[12, 60, 0, 0, 'DS'], [6, 45, 0, 1, 'DS']], [8, 12], o);
  assert.equal(P.up, true);
  // pesos distintos entre series: «even» lo dice y w es el mayor
  P = C.progressionRule([[10, 80, 0, 0], [10, 75, 0, 0], [10, 70, 0, 0]], [8, 12], o);
  assert.deepEqual([P.w, P.even, P.up, P.dn], [80, false, false, false]);
  // sin peso (peso corporal) no hay nada que subir ni bajar
  P = C.progressionRule([[15, 0, 0, 0], [15, 0, 0, 0]], [8, 12], o);
  assert.deepEqual([P.up, P.dn, P.nw], [false, false, 0]);
  // sin series (o solo filas extra), nada
  assert.equal(C.progressionRule([], [8, 12], o), null);
  assert.equal(C.progressionRule([[6, 45, 0, 1]], [8, 12], o), null);
  assert.equal(C.progressionRule(undefined, [8, 12], o), null);
  // con muy poco peso, el redondeo no deja bajar: se mantiene (y no sale «baja a 0»)
  P = C.progressionRule([[3, C.lbToKg(2.5), 0, 0]], [8, 12], { step: 2.5, lb: true, deload: false });
  assert.deepEqual([P.dn, P.nw], [false, C.lbToKg(2.5)]);
});

test('progressionRule y nextWeight: en 3.000 sesiones al azar, el peso que toca es coherente', () => {
  const r = rng(2026);
  for (let k = 0; k < 3000; k++) {
    const lb = r() < .3;
    const step = r() < .3 ? 5 : 2.5;
    const lo = 3 + Math.floor(r() * 10);
    const hi = lo + 2 + Math.floor(r() * 5);
    const base = lb ? C.lbToKg(5 * (1 + Math.floor(r() * 80))) : .5 * (2 + Math.floor(r() * 400));
    const n = 1 + Math.floor(r() * 5);
    const kind = Math.floor(r() * 4); // 0 todas al tope, 1 ninguna al mínimo, 2 mezcla, 3 al azar
    const sets = Array.from({ length: n }, (_, j) => {
      const reps = kind == 0 ? hi + Math.floor(r() * 3) : kind == 1 ? Math.max(1, lo - 1 - Math.floor(r() * 2)) : kind == 2 ? (j ? lo : hi) : 1 + Math.floor(r() * (hi + 3));
      const w = r() < .7 ? base : Math.max(.5, base - (lb ? C.lbToKg(5) : 2.5) * Math.floor(r() * 3));
      return [reps, w, r() < .5 ? 6 + Math.floor(r() * 5) : 0, 0];
    });
    const deload = r() < .15;
    const P = C.progressionRule(sets, [lo, hi], { step, lb, deload });
    const all = f => sets.every(f);
    const ra = (q => q.length ? q.reduce((a, b) => a + b, 0) / q.length : 0)(sets.map(s => s[2]).filter(q => q > 0));
    assert.equal(P.w, Math.max(...sets.map(s => s[1])));
    // nunca sube y baja a la vez; en descarga, ninguna de las dos
    assert.ok(!(P.up && P.dn));
    if (deload)
      assert.ok(!P.up && !P.dn && P.nw == P.w);
    else {
      assert.equal(P.up, all(s => s[0] >= hi) && ra < 9.5, 'sube: ' + JSON.stringify(sets) + ' ' + lo + '-' + hi);
      if (!all(s => s[0] < lo))
        assert.equal(P.dn, false);
    }
    // el peso que toca: más si sube, menos si baja (nunca cero, ni menos del 85 %), igual si no
    if (P.up)
      assert.ok(P.nw > P.w && P.nw <= P.w + (lb ? C.lbToKg(12.5) : step + .5));
    else if (P.dn)
      assert.ok(P.nw < P.w && P.nw > 0 && P.nw >= P.w * .85);
    else
      assert.equal(P.nw, P.w);
    // cada serie parte de su propio peso
    for (const s of sets) {
      const w = C.nextWeight(P, s[1], step, lb);
      assert.ok(w > 0);
      if (P.up)
        assert.ok(w > s[1]);
      else if (P.dn)
        assert.ok(w <= s[1]);
      else
        assert.equal(w, s[1]);
      // lo que se puede cargar: medio kilo, o 2,5 lb, si se partía de un peso así
      if (P.up || (P.dn && w < s[1]))
        near((lb ? C.kgToLb(w) / 2.5 : w * 2), Math.round(lb ? C.kgToLb(w) / 2.5 : w * 2), 1e-6);
    }
  }
});

test('kmTotal: los kilómetros se suman en centésimas y se redondean a un decimal', () => {
  assert.equal(C.kmTotal([]), 0);
  assert.equal(C.kmTotal([5, 10.25, 0.3]), 15.6); // 15,55 → 15,6
  assert.equal(C.kmTotal([217.02, 0.03]), 217.1); // 217,05: sumando decimales salía 217
  assert.equal(C.kmTotal([0.1, 0.2]), 0.3);
  assert.equal(C.kmTotal([null, 'x', undefined, 3]), 3);
  const r = rng(5);
  for (let k = 0; k < 500; k++) {
    const cents = Array.from({ length: 1 + Math.floor(r() * 40) }, () => Math.floor(r() * 4200));
    const total = cents.reduce((a, b) => a + b, 0);
    // la misma cuenta con enteros: décimas, con la mitad hacia arriba
    assert.equal(C.kmTotal(cents.map(c => c / 100)), (Math.floor(total / 10) + (total % 10 >= 5 ? 1 : 0)) / 10);
  }
});

test('weekMonday: el lunes de la semana, también en fin de año y en los cambios de hora', () => {
  const k = d => U.dayKey(C.weekMonday(d));
  assert.equal(k(new Date(2026, 10, 12, 15, 30)), '2026-11-09'); // jueves
  assert.equal(k(new Date(2026, 10, 9, 0, 0)), '2026-11-09'); // lunes a las 00:00
  assert.equal(k(new Date(2026, 10, 15, 23, 59)), '2026-11-09'); // domingo
  assert.equal(k(new Date(2027, 0, 1, 12)), '2026-12-28'); // viernes 1 de enero
  assert.equal(k(new Date(2026, 2, 29, 12)), '2026-03-23'); // domingo del cambio de hora de marzo
  assert.equal(k(new Date(2026, 9, 25, 2, 30)), '2026-10-19'); // domingo del cambio de hora de octubre
  assert.equal(C.weekMonday(new Date(2026, 10, 12, 15, 30)).getHours(), 0);
});

test('weekKeys: los siete días de lunes a domingo, también con un día de 23 o de 25 horas', () => {
  assert.deepEqual(C.weekKeys(new Date(2026, 10, 12, 15)), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
  assert.deepEqual(C.weekKeys(new Date(2026, 2, 29, 23, 30)), ['2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29']);
  assert.deepEqual(C.weekKeys(new Date(2026, 2, 30, 0, 30)), ['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05']);
  assert.deepEqual(C.weekKeys(new Date(2026, 9, 25, 12)), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  assert.deepEqual(C.weekKeys(new Date(2027, 0, 1)), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  // todos los días de dos años caen en su semana, y cada semana tiene siete días distintos
  for (let d = new Date(2026, 0, 1, 12); d.getFullYear() < 2028; d.setDate(d.getDate() + 1)) {
    const w = C.weekKeys(d);
    assert.equal(new Set(w).size, 7);
    assert.equal(w.indexOf(U.dayKey(d)), (d.getDay() + 6) % 7);
  }
});

test('countBetween: registros con la fecha dentro del periodo', () => {
  const logs = [{ d: '2026-11-05' }, { d: '2026-11-06' }, { d: '2026-11-12' }, { d: '2026-11-13' }, null, {}];
  assert.equal(C.countBetween(logs, '2026-11-06', '2026-11-12'), 2);
  assert.equal(C.countBetween(logs, '2026-11-05', '2026-11-13'), 4);
  assert.equal(C.countBetween([], '2026-11-06', '2026-11-12'), 0);
});

test('dayKey: la fecha del sitio, no la de UTC, también de madrugada y en los cambios de hora', () => {
  assert.equal(U.dayKey(new Date(2026, 10, 12, 0, 5)), '2026-11-12'); // 00:05 de aquí son las 23:05 de ayer en UTC
  assert.equal(U.dayKey(new Date(2026, 10, 12, 23, 55)), '2026-11-12');
  assert.equal(U.dayKey(new Date(2026, 2, 29, 3, 30)), '2026-03-29');
  assert.equal(U.dayKey(new Date(2026, 9, 25, 0, 30)), '2026-10-25');
  assert.equal(U.dayKey(new Date(2027, 0, 1, 0, 0)), '2027-01-01');
});

test('typedNum, clampNum y clampInt: lo que escribe el usuario', () => {
  assert.equal(U.typedNum('12,5'), 12.5);
  assert.equal(U.typedNum(' 80 '), 80);
  assert.ok(Number.isNaN(U.typedNum('')));
  assert.ok(Number.isNaN(U.typedNum(null)));
  assert.ok(Number.isNaN(U.typedNum('abc')));
  assert.ok(Number.isNaN(U.typedNum('1,2,3')));
  assert.equal(U.clampNum(U.typedNum('-5'), 0, 100, 7), 7);
  assert.equal(U.clampNum(U.typedNum(''), 0, 100, 7), 7);
  assert.equal(U.clampNum(50, 0, 100, 7), 50);
  assert.equal(U.clampNum(100, 0, 100, 7), 100);
  assert.equal(U.clampInt('3.6', 0, 4, 1), 4);
  assert.equal(U.clampInt('9', 0, 4, 1), 1);
});

test('redondeos y formatos de tiempo', () => {
  assert.equal(U.round1(0.25), 0.3);
  assert.equal(U.round1(12.34), 12.3);
  assert.equal(U.roundInt(2.5), 3);
  assert.equal(U.roundInt(-2.5), -2);
  assert.equal(U.fmtMinSec(125), '2:05');
  assert.equal(U.fmtDuration(3725), '1:02:05');
  assert.equal(U.fmtDuration(59), '0:59');
  assert.equal(U.fmtClock(3600), '1:00:00');
});
