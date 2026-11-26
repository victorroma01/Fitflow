// «Equipamiento» en el Overview del día (V1.0.4), sin navegador: qué material lleva cada ejercicio (workout/equipmap), los
// nombres e iconos del material (data/equipment) y sus archivos (src/img/equipment).
//   node --test tests/equipment.test.mjs
// Cada ejercicio de la librería tiene que pedir algún material que la app conozca, con su icono; un ejercicio que se quitó
// de la librería (data/aliases: EX_RETIRED) pide el mismo que el que lo sustituye; y un ejercicio creado por el usuario, nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

globalThis.window = {}; // core/util anota en window que ha cargado
const { EXERCISES } = await import('../src/js/data/library.js');
const { EX_RETIRED } = await import('../src/js/data/aliases.js');
const { EQUIPMENT } = await import('../src/js/data/equipment.js');
const { dayGear } = await import('../src/js/workout/equipmap.js');
/** el material de un ejercicio: el de un día con solo él (workout/equipmap no exporta el suyo, que solo usa dayGear) */
const gearOf = n => dayGear([n]);
const DIR = new URL('../src/img/equipment/', import.meta.url);
const FILES = readdirSync(DIR);

test('cada ejercicio de la librería pide algún material, y todo es material que la app conoce', () => {
  const none = EXERCISES.filter(e => !gearOf(e.n).length).map(e => e.n);
  assert.deepEqual(none, [], 'sin material');
  const unknown = EXERCISES.flatMap(e => gearOf(e.n).filter(id => !EQUIPMENT[id]).map(id => e.n + ': ' + id));
  assert.deepEqual(unknown, [], 'material que no está en data/equipment');
  const twice = EXERCISES.filter(e => new Set(gearOf(e.n)).size != gearOf(e.n).length).map(e => e.n);
  assert.deepEqual(twice, [], 'el mismo material dos veces');
});

test('el material que no pide ningún ejercicio de la librería es solo la máquina cualquiera', () => {
  const used = new Set(EXERCISES.flatMap(e => gearOf(e.n)));
  assert.deepEqual(Object.keys(EQUIPMENT).filter(id => !used.has(id)), ['machine']);
});

test('un ejercicio quitado de la librería pide lo mismo que el que lo sustituye; uno del usuario, nada', () => {
  for (const [old, now] of EX_RETIRED)
    assert.deepEqual(gearOf(old), gearOf(now), old);
  assert.deepEqual(gearOf('Mi ejercicio de casa'), []);
  assert.deepEqual(gearOf(''), []);
});

test('el material de algunos ejercicios', () => {
  const cases = {
    'Press banca': ['barbell', 'bench-press-rack'],
    'Press inclinado mancuernas': ['dumbbell', 'bench-incline'],
    'Sentadilla': ['barbell', 'squat-rack'],
    'Peso muerto': ['barbell'],
    'Hip thrust': ['barbell', 'bench'],
    'Prensa': ['leg-press'],
    'Dominadas': ['pull-up-bar'],
    'Jalón al pecho': ['cable'],
    'Remo T': ['t-bar'],
    'Remo Meadows': ['landmine', 'barbell'],
    'Fondos': ['parallel-bars'],
    'Curl predicador': ['ez-bar', 'preacher-curl'],
    'Muscle-up': ['rings'],
    'Kettlebell swing': ['kettlebell'],
    'Plancha': ['body-weight'],
    'Remo ergómetro': ['rower'],
    'Sled push': ['sled'],
    'Natación': ['pool'],
    'Carrera 1 km con chaleco': ['weight-vest'],
  };
  for (const [n, want] of Object.entries(cases))
    assert.deepEqual(gearOf(n), want, n);
});

test('el material de un día: sin repetir, por orden de aparición, y «Peso corporal» solo si no hace falta nada más', () => {
  assert.deepEqual(dayGear(['Plancha', 'Press banca', 'Crunch', 'Remo mancuerna']), ['barbell', 'bench-press-rack', 'dumbbell', 'bench']);
  assert.deepEqual(dayGear(['Press banca', 'Press banca']), ['barbell', 'bench-press-rack']);
  assert.deepEqual(dayGear(['Plancha', 'Crunch']), ['body-weight']);
  assert.deepEqual(dayGear(['Mi ejercicio de casa']), []);
  assert.deepEqual(dayGear([]), []);
  // lo que devuelve es una lista nueva: cambiarla no cambia el material de nadie
  dayGear(['Press banca']).push('sled');
  dayGear(['Plancha']).push('sled');
  assert.deepEqual(dayGear(['Press banca']), ['barbell', 'bench-press-rack']);
  assert.deepEqual(dayGear(['Plancha']), ['body-weight']);
});

test('cada material tiene nombre e icono, y cada icono su archivo (y no sobra ninguno)', () => {
  const icons = new Set();
  for (const [id, [name, icon]] of Object.entries(EQUIPMENT)) {
    assert.ok(/^[a-z0-9-]+$/.test(id) && name.trim() == name && name, id);
    const found = FILES.filter(f => f == icon + '.webp' || f == icon + '.svg');
    assert.equal(found.length, 1, id + ': ' + icon + ' (.webp o .svg) ' + found);
    icons.add(found[0]);
  }
  assert.deepEqual(FILES.filter(f => !icons.has(f)), [], 'archivos que no usa ningún material');
  const names = Object.values(EQUIPMENT).map(x => x[0]);
  assert.equal(new Set(names).size, names.length, 'nombres repetidos');
});

test('los iconos del catálogo: WebP sin pérdida de 192 × 120', () => {
  for (const f of FILES.filter(f => f.endsWith('.webp'))) {
    const b = readFileSync(new URL(f, DIR));
    assert.equal(b.toString('latin1', 0, 4) + b.toString('latin1', 8, 16), 'RIFFWEBPVP8L', f + ': no es un WebP sin pérdida');
    // VP8L: tras su firma (0x2f), 14 bits de ancho − 1 y 14 de alto − 1
    assert.equal(b[20], 0x2f, f);
    const bits = b.readUInt32LE(21);
    assert.deepEqual([(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1], [192, 120], f);
  }
});

test('los dibujados: SVG de 192 × 120, solo en el gris de los del catálogo y sin nada que cargar ni ejecutar', () => {
  const svgs = FILES.filter(f => f.endsWith('.svg'));
  assert.ok(svgs.length >= 30, String(svgs.length));
  for (const f of svgs) {
    const s = readFileSync(new URL(f, DIR), 'utf8');
    assert.match(s, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 192 120" width="192" height="120"/, f);
    assert.ok(s.trim().endsWith('</svg>'), f);
    assert.doesNotMatch(s, /<script|\son\w+=|href=|<image|<foreignObject|url\((?!#)/i, f);
    // los colores: el gris claro (#eeeeee) y, en las máscaras que recortan líneas, blanco y negro
    const colors = new Set([...s.matchAll(/(?:fill|stroke)="(#[0-9a-f]{3,6})"/gi)].map(m => m[1].toLowerCase()));
    assert.deepEqual([...colors].filter(c => !['#eeeeee', '#fff', '#000'].includes(c)), [], f);
    // una máscara recorta en todo el recuadro (no en el de la pieza, que en una línea recta no tiene ancho)
    for (const m of s.matchAll(/<mask [^>]*>/g))
      assert.match(m[0], /maskUnits="userSpaceOnUse" x="0" y="0" width="192" height="120"/, f);
  }
});
