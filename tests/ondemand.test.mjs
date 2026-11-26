// Los entrenos a la carta (data/ondemand), sin navegador: que son las diez rutinas del propietario (StrataFit_Rutinas_v2) tal
// como vienen, con sus claves, sus bloques en orden, las series de cada ejercicio (que son las rondas de su bloque), las
// repeticiones de cada serie (pirámides y AMRAP, nunca 0), el tempo (o nada si la fuente no lo da) y la variante de cada posición;
// y que cada ejercicio está en la librería, con figura.
//   node --test tests/ondemand.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {};
const { ONDEMAND } = await import('../src/js/data/ondemand.js');
const { EXERCISES } = await import('../src/js/data/library.js');
const { FIG_POSES } = await import('../src/js/data/figposes.js');
const LIB = new Set(EXERCISES.map(e => e.n));
const reps = x => x[1].split('/');
const byKey = k => ONDEMAND.find(r => r.k == k);

test('las diez rutinas, en su orden y con sus claves estables', () => {
  assert.deepEqual(ONDEMAND.map(r => r.k), Array.from({ length: 10 }, (_, i) => 'stratafit-routine-' + String(i + 1).padStart(2, '0')));
  assert.deepEqual(ONDEMAND.map(r => r.n), ['Armageddon', 'Shoulder Shredder', 'Chest Crusher', 'Leg Destroyer', 'Arm Assault', 'Pull Essentials', 'Arm Overload', 'Push Essentials', 'Back Builder', 'Dynamic Warm-Up']);
});

test('73 posiciones y 269 series, y lo de cada rutina', () => {
  const per = ONDEMAND.map(r => [r.bl.flat().length, r.bl.flat().reduce((s, x) => s + reps(x).length, 0)]);
  assert.deepEqual(per, [[10, 34], [8, 29], [7, 28], [8, 25], [8, 34], [7, 29], [8, 32], [7, 29], [5, 24], [5, 5]]);
  assert.equal(per.reduce((s, x) => s + x[0], 0), 73);
  assert.equal(per.reduce((s, x) => s + x[1], 0), 269);
});

test('cada bloque, de 1 a 4 ejercicios con las mismas rondas; cada ejercicio, de la librería y con figura', () => {
  for (const r of ONDEMAND)
    for (const b of r.bl) {
      assert.ok(b.length >= 1 && b.length <= 4, r.n);
      assert.equal(new Set(b.map(x => reps(x).length)).size, 1, r.n + ': rondas distintas en un bloque');
      for (const x of b) {
        assert.ok(LIB.has(x[0]), x[0] + ' no está en la librería');
        assert.ok(FIG_POSES[x[0]], x[0] + ' no tiene figura');
      }
    }
});

test('repeticiones: un número mayor que 0 o AMRAP; tempo: cuatro cifras o nada; variante: un texto corto', () => {
  for (const x of ONDEMAND.flatMap(r => r.bl.flat())) {
    assert.ok(reps(x).every(v => v == 'AMRAP' || /^[1-9]\d*$/.test(v)), x.join('|'));
    assert.ok(x[2] == '' || /^\d\/\d\/\d\/\d$/.test(x[2]), x.join('|'));
    assert.ok(x.length == 3 || (typeof x[3] == 'string' && x[3].length > 3 && x[3].length <= 120), x.join('|'));
  }
});

test('lo que la fuente pide comprobar: pirámides, AMRAP, el hack 4 × 12, las tres posiciones del remo posterior y las series gigantes', () => {
  const ex = (k, b, i) => byKey(k).bl[b][i];
  assert.deepEqual(ex('stratafit-routine-01', 0, 0), ['Press cerrado en Smith', '12/10/8/6', '4/0/1/0']);
  assert.deepEqual(ex('stratafit-routine-02', 0, 0), ['Press militar barra', '10/8/6/12', '4/0/1/0']);
  assert.deepEqual(ex('stratafit-routine-05', 0, 1), ['Curl martillo en banco inclinado', '10/8/8/6/6', '4/0/1/0']);
  assert.deepEqual(ex('stratafit-routine-04', 1, 0), ['Hack squat', '12/12/12/12', '3/0/1/0', 'Pies a media anchura']);
  assert.deepEqual(byKey('stratafit-routine-02').bl[2].map(x => x.slice(0, 3)), [['Remo posterior con mancuernas', '12/12/12/12', '3/1/1/0'], ['Remo posterior con mancuernas', '12/12/12/12', '2/0/1/2'], ['Remo posterior con mancuernas', '30/30/30/30', '']]);
  assert.deepEqual(byKey('stratafit-routine-03').bl[2].map(x => x[1]), ['10/10/10/10', 'AMRAP/AMRAP/AMRAP/AMRAP', 'AMRAP/AMRAP/AMRAP/AMRAP', 'AMRAP/AMRAP/AMRAP/AMRAP']);
  assert.deepEqual(ONDEMAND.flatMap(r => r.bl.filter(b => b.length == 4).map(b => [r.n, reps(b[0]).length])), [['Chest Crusher', 4], ['Push Essentials', 5]]);
  // las posiciones repetidas, cada una la suya (no se juntan)
  assert.deepEqual(byKey('stratafit-routine-03').bl[1].map(x => x.slice(0, 3)), [['Pec deck', '10/10/10/10', '3/0/3/0'], ['Pec deck', '10/10/10/10', '3/0/1/0']]);
  // Back Builder: el Face pull de la captura, 7 series sin tempo
  assert.deepEqual(ex('stratafit-routine-09', 4, 0), ['Face pull', '12/12/12/12/12/12/12', '']);
});

test('el calentamiento: cinco bloques sueltos de una ronda, principiante, con su subtítulo y su descripción', () => {
  const w = byKey('stratafit-routine-10');
  assert.deepEqual(w.bl.map(b => b.length), [1, 1, 1, 1, 1]);
  assert.deepEqual(w.bl.map(b => b[0][1]), ['5', '5', '5', '5', '30']);
  assert.equal(w.lv, 'ini');
  assert.equal(w.t, 'Calentamiento dinámico');
  assert.ok(w.d && w.d.startsWith('Calentamiento dinámico de cuerpo completo'));
  assert.deepEqual(w.g, ['Cuerpo completo']);
});

test('el nivel, solo donde lo da la fuente', () => {
  assert.deepEqual(ONDEMAND.map(r => r.lv || ''), ['ava', 'ava', '', '', '', 'ava', '', 'ava', '', 'ini']);
});
