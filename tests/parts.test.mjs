// Cómo se reparte el estado guardado en claves (src/js/core/parts.js), sin navegador:  node --test tests/parts.test.mjs
// El núcleo y cada parte, partidos y vueltos a leer, dan el mismo estado; el núcleo nombra sus partes y, en IndexedDB, dice
// cuáles tiene que haber; una colección con otra forma no se aparta, y un texto dañado no se lee.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// core/parts es JS de la app (un módulo ES): se copia a una carpeta con "type": "module" para cargarlo tal cual. De core/store
// solo usa el nombre de la clave del núcleo, así que aquí va uno de prueba con esa clave.
const dir = mkdtempSync(join(tmpdir(), 'sf-parts-'));
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
writeFileSync(join(dir, 'store.js'), "export const Store = { K: { app: 'ff' } };\n");
writeFileSync(join(dir, 'parts.js'), readFileSync(new URL('../src/js/core/parts.js', import.meta.url), 'utf8'));
const P = await import(pathToFileURL(join(dir, 'parts.js')));

// números al azar repetibles (mulberry32)
const rng = seed => () => {
  seed |= 0;
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

// lo que hace core/persist al leer: del núcleo y los textos de las partes, el estado entero (o null si falta o sobra algo)
const join3 = ({ out, keys }) => {
  const core = JSON.parse(out.ff);
  const s = {};
  for (const k of Object.keys(core)) {
    if (k == '_parts' || k == '_pk')
      continue;
    if (!P.STATE_PARTS.includes(k) || core[k] !== P.partKey(k)) {
      s[k] = core[k];
      continue;
    }
    if (k != 'meals') {
      s[k] = P.readPart(k, out[P.partKey(k)]);
      continue;
    }
    s.meals = {};
    for (const key of keys.filter(x => x.startsWith(P.partKey('meals:'))).sort())
      Object.assign(s.meals, P.readPart('meals', out[key]));
  }
  return s;
};

const sample = () => ({
  tb: 2, un: 'kg',
  logs: [{ id: 'a', d: '2026-10-01', v: 1200 }, { id: 'b', d: '2026-11-12', v: 900 }],
  pl: [{ n: 'Día 1', ex: [{ n: 'Press banca', s: 3 }] }],
  hist: { 'Press banca': [{ d: '2026-11-12', s: [[8, 80, 8, 0]] }] },
  meals: { '2026-10-31': { 0: [{ n: 'Avena', g: 60 }] }, '2026-11-01': { 1: [{ n: 'Arroz', g: 150 }] }, '2026-11-12': {}, plantilla: { 0: [] } },
  wt: [{ d: '2026-11-01', w: 80 }]
});

test('partKey y mealsPart: las claves de las partes', () => {
  assert.equal(P.partKey('logs'), 'ff:logs');
  assert.equal(P.partKey(''), 'ff:');
  assert.equal(P.mealsPart('2026-10-29'), 'meals:2026-10');
  assert.equal(P.mealsPart('2026-1-9'), 'meals:otros');
  assert.equal(P.mealsPart('plantilla'), 'meals:otros');
  assert.deepEqual(P.STATE_PARTS, ['logs', 'hist', 'meals']);
});

test('splitState: el núcleo nombra sus partes, conserva el orden de las claves y las comidas van por meses', () => {
  const { out, keys } = P.splitState(sample(), null, false);
  assert.deepEqual(keys, ['ff:logs', 'ff:hist', 'ff:meals:2026-10', 'ff:meals:2026-11', 'ff:meals:otros']);
  assert.deepEqual(Object.keys(out).sort(), ['ff', ...keys].sort());
  const core = JSON.parse(out.ff);
  assert.deepEqual(Object.keys(core), ['tb', 'un', 'logs', 'pl', 'hist', 'meals', 'wt', '_parts']);
  assert.equal(core.logs, 'ff:logs');
  assert.equal(core.hist, 'ff:hist');
  assert.equal(core.meals, 'ff:meals');
  assert.equal(core._parts, 1);
  assert.equal('_pk' in core, false);
  assert.deepEqual(JSON.parse(out['ff:meals:2026-11']), { '2026-11-01': { 1: [{ n: 'Arroz', g: 150 }] }, '2026-11-12': {} });
  assert.deepEqual(JSON.parse(out['ff:meals:otros']), { plantilla: { 0: [] } });
});

test('splitState: en IndexedDB, el núcleo dice qué partes tiene que haber (ordenadas)', () => {
  const { out, keys } = P.splitState(sample(), null, true);
  const core = JSON.parse(out.ff);
  assert.equal(core._parts, 2);
  assert.deepEqual(core._pk, keys.slice().sort());
  assert.deepEqual(core._pk, ['ff:hist', 'ff:logs', 'ff:meals:2026-10', 'ff:meals:2026-11', 'ff:meals:otros']);
});

test('splitState: solo pasa a texto las partes pedidas, pero las nombra todas y el núcleo sale siempre', () => {
  const { out, keys } = P.splitState(sample(), new Set(['ff:meals:2026-11']), true);
  assert.deepEqual(Object.keys(out).sort(), ['ff', 'ff:meals:2026-11']);
  assert.equal(keys.length, 5);
  assert.deepEqual(JSON.parse(out.ff)._pk.length, 5);
  const none = P.splitState(sample(), new Set(), false);
  assert.deepEqual(Object.keys(none.out), ['ff']);
  assert.equal(none.keys.length, 5);
});

test('splitState: una colección con otra forma, vacía o que falta no se aparta', () => {
  const odd = P.splitState({ logs: { a: 1 }, hist: [1, 2], meals: null, x: 1 }, null, true);
  assert.deepEqual(odd.keys, []);
  assert.deepEqual(JSON.parse(odd.out.ff), { logs: { a: 1 }, hist: [1, 2], meals: null, x: 1, _parts: 2, _pk: [] });
  // vacías sí se apartan (la parte existe, sin nada); sin comidas no hay claves de comidas, pero el núcleo las nombra
  const empty = P.splitState({ logs: [], hist: {}, meals: {} }, null, false);
  assert.deepEqual(empty.keys, ['ff:logs', 'ff:hist']);
  assert.equal(JSON.parse(empty.out.ff).meals, 'ff:meals');
  assert.deepEqual(join3(empty), { logs: [], hist: {}, meals: {} });
  assert.deepEqual(JSON.parse(P.splitState({}, null, false).out.ff), { _parts: 1 });
});

test('readPart: una lista para los entrenos y un objeto para el resto; lo dañado o con otra forma, undefined', () => {
  assert.deepEqual(P.readPart('logs', '[{"d":"2026-11-12"}]'), [{ d: '2026-11-12' }]);
  assert.deepEqual(P.readPart('hist', '{"a":[]}'), { a: [] });
  assert.deepEqual(P.readPart('meals', '{}'), {});
  for (const bad of ['{"a":1', '', 'null', '7', '"texto"', undefined, null])
    for (const k of P.STATE_PARTS)
      assert.equal(P.readPart(k, bad), undefined);
  assert.equal(P.readPart('logs', '{"a":1}'), undefined);
  assert.equal(P.readPart('hist', '[1]'), undefined);
  assert.equal(P.readPart('meals', '[1]'), undefined);
});

test('partir y volver a leer da el mismo estado, en 400 estados al azar', () => {
  const r = rng(20261113);
  const int = n => Math.floor(r() * n);
  const day = () => (2024 + int(3)) + '-' + String(1 + int(12)).padStart(2, '0') + '-' + String(1 + int(28)).padStart(2, '0');
  const word = () => ['Press banca', 'Sentadilla', 'Remo', 'Avena', 'Arroz', 'ñandú «x»', '<b>', 'a:b', 'meals:2026-01'][int(9)];
  for (let i = 0; i < 400; i++) {
    const s = {};
    // claves del núcleo y de las partes, en un orden cualquiera
    const order = ['tb', 'pl', 'logs', 'wt', 'hist', 'un', 'meals', 'pf'].sort(() => r() - .5);
    for (const k of order) {
      if (k == 'logs')
        s.logs = [...Array(int(6))].map(() => ({ id: 'l' + int(1e6), d: day(), n: word(), v: int(9000) }));
      else if (k == 'hist') {
        s.hist = {};
        for (let j = int(5); j > 0; j--)
          s.hist[word()] = [...Array(1 + int(3))].map(() => ({ d: day(), s: [[int(12), int(200), int(10), int(3)]] }));
      }
      else if (k == 'meals') {
        s.meals = {};
        for (let j = int(8); j > 0; j--)
          s.meals[r() < .1 ? word() : day()] = { [int(5)]: [{ n: word(), g: int(500), b: [int(900), int(100), int(100), int(100), 0, 0] }] };
      }
      else if (r() < .8)
        s[k] = r() < .5 ? int(100) : { n: word(), l: [int(9), null, word()] };
    }
    for (const inIdb of [false, true]) {
      const split = P.splitState(s, null, inIdb);
      assert.deepEqual(join3(split), s);
      // el orden de las claves del estado se conserva en el núcleo
      assert.deepEqual(Object.keys(JSON.parse(split.out.ff)).filter(k => k[0] != '_'), Object.keys(s));
      // cada día de comidas está en la parte de su mes, y en ninguna otra
      for (const key of split.keys.filter(k => k.startsWith('ff:meals:')))
        for (const d of Object.keys(JSON.parse(split.out[key])))
          assert.equal(P.partKey(P.mealsPart(d)), key);
      assert.equal(new Set(split.keys).size, split.keys.length);
    }
  }
});
