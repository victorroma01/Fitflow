// Prueba de la fusión de datos entre dispositivos (src/js/cloud/merge.js), sin navegador: node --test tests/merge.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// el módulo es JS de la app (módulo ES sin dependencias): se carga como .mjs para no depender de "type" en package.json
const src = readFileSync(new URL('../src/js/cloud/merge.js', import.meta.url), 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'sf-merge-'));
writeFileSync(join(dir, 'merge.mjs'), src);
const { KINDS, merge3, hashMap, hashOf, sameHashes } = await import(pathToFileURL(join(dir, 'merge.mjs')));

const run = (kind, local, remote, base, localNewer = false) => {
  const k = KINDS[kind];
  const B = base === null ? null : hashMap(k.split(base));
  return k.join(merge3(k.split(local), k.split(remote), B, k.both, localNewer));
};

test('huellas: el mismo contenido da la misma huella; otro, otra', () => {
  assert.equal(hashOf({ a: 1, b: [1, 2] }), hashOf({ a: 1, b: [1, 2] }));
  assert.notEqual(hashOf({ a: 1 }), hashOf({ a: 2 }));
  assert.ok(sameHashes({ x: '1', y: '2' }, { y: '2', x: '1' }));
  assert.ok(!sameHashes({ x: '1' }, { x: '1', y: '2' }));
});

test('núcleo: lo que cambió en un solo lado gana, cada clave por separado', () => {
  const base = { plan: 'A', nu: 1, wl: [1] };
  const local = { plan: 'B', nu: 1, wl: [1] };
  const remote = { plan: 'A', nu: 2, wl: [1, 2] };
  assert.deepEqual(run('core', local, remote, base), { plan: 'B', nu: 2, wl: [1, 2] });
});

test('núcleo: cambiado en los dos lados, gana el más reciente', () => {
  const base = { plan: 'A' };
  assert.deepEqual(run('core', { plan: 'L' }, { plan: 'R' }, base, true), { plan: 'L' });
  assert.deepEqual(run('core', { plan: 'L' }, { plan: 'R' }, base, false), { plan: 'R' });
});

test('núcleo: borrado en un lado y sin tocar en el otro se borra; si el otro lo cambió, se queda el cambio', () => {
  assert.deepEqual(run('core', { a: 1 }, { a: 1, b: 2 }, { a: 1, b: 2 }), { a: 1 });
  assert.deepEqual(run('core', { a: 1 }, { a: 1, b: 3 }, { a: 1, b: 2 }), { a: 1, b: 3 });
});

test('sin base (primera vez en este dispositivo): se juntan los dos lados; en un conflicto, el elegido', () => {
  assert.deepEqual(run('core', { a: 1, x: 'L' }, { b: 2, x: 'R' }, null, false), { a: 1, x: 'R', b: 2 });
});

test('entrenos: cada uno por su id; se juntan los de los dos móviles, en orden de fecha', () => {
  const l1 = { id: 'a', d: '2026-11-01', n: 'Pecho' };
  const l2 = { id: 'b', d: '2026-11-03', n: 'Pierna' };
  const l3 = { id: 'c', d: '2026-11-02', n: 'Espalda' };
  const out = run('logs', [l1, l2], [l1, l3], [l1]);
  assert.deepEqual(out.map(l => l.id), ['a', 'c', 'b']);
});

test('entrenos: uno borrado en un móvil y sin tocar en el otro, se borra', () => {
  const l1 = { id: 'a', d: '2026-11-01' };
  const l2 = { id: 'b', d: '2026-11-02' };
  assert.deepEqual(run('logs', [l1], [l1, l2], [l1, l2]).map(l => l.id), ['a']);
});

test('comidas: el mismo día cambiado en los dos móviles junta los alimentos, sin repetir los que ya estaban', () => {
  const arroz = { n: 'Arroz', g: 150, b: [130, 28, 2.7, 0.3, 0, 0] };
  const pollo = { n: 'Pollo', g: 180, b: [165, 0, 31, 3.6, 0, 0] };
  const pan = { n: 'Pan', g: 50, b: [260, 50, 9, 3, 3, 1] };
  const base = { '2026-11-04': { 0: [arroz] } };
  const local = { '2026-11-04': { 0: [arroz, pollo] } };
  const remote = { '2026-11-04': { 0: [arroz], 1: [pan] } };
  assert.deepEqual(run('meals', local, remote, base), { '2026-11-04': { 0: [arroz, pollo], 1: [pan] } });
});

test('comidas: un alimento anotado dos veces en un lado sigue dos veces', () => {
  const huevo = { n: 'Huevo', g: 60, b: [155, 1, 13, 11, 0, 0] };
  const out = run('meals', { d: { 0: [huevo, huevo] } }, { d: { 0: [huevo] } }, { d: { 0: [] } });
  assert.equal(out.d[0].length, 2);
});

test('historial: el mismo ejercicio cambiado en los dos lados junta los registros, del más reciente al más antiguo', () => {
  const a = { d: '2026-11-01', s: [[5, 80, 0]] };
  const b = { d: '2026-11-03', s: [[5, 85, 0]] };
  const c = { d: '2026-11-02', s: [[5, 82.5, 0]] };
  const out = run('hist', { 'Press banca': [b, a] }, { 'Press banca': [c, a] }, { 'Press banca': [a] });
  assert.deepEqual(out['Press banca'].map(x => x.d), ['2026-11-03', '2026-11-02', '2026-11-01']);
});

test('lo que no cambió en ningún lado se queda igual', () => {
  const s = { a: 1, b: { c: [1, 2] } };
  assert.deepEqual(run('core', s, s, s), s);
});
