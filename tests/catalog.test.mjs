// Las tarjetas de los grupos de la librería (V1.0.4), sin navegador: data/catalog con los grupos reales de la librería, en el
// orden aprobado, y las imágenes de src/img/catalog que prepara tools/catalogo.py.
//   node --test tests/catalog.test.mjs
// El número de cada tarjeta es el de la librería (library/catalog lo cuenta); aquí se comprueba que cada grupo con
// ejercicios tiene su tarjeta y que cada tarjeta es de un grupo de verdad, con sus imágenes del tamaño que dicen los datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

globalThis.window = {}; // core/util anota en window que ha cargado
const { EXERCISES, GROUPS, groupOf } = await import('../src/js/data/library.js');
const { CATALOG } = await import('../src/js/data/catalog.js');
const DIR = new URL('../src/img/catalog/', import.meta.url);
const FILES = readdirSync(DIR);
const ORDER = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazos', 'Abdomen', 'Cuádriceps', 'Isquios y glúteos', 'Gemelos', 'CrossFit', 'Hyrox', 'Funcional', 'Cardio'];

/** ancho y alto de un WebP: con pérdida y transparencia (VP8X), sin pérdida (VP8L) o con pérdida sin más (VP8) */
const webpSize = b => {
  assert.equal(b.toString('latin1', 0, 4) + b.toString('latin1', 8, 12), 'RIFFWEBP');
  const kind = b.toString('latin1', 12, 16);
  if (kind == 'VP8X')
    return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind == 'VP8L') {
    const bits = b.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
};

test('una tarjeta por grupo de la librería, en el orden aprobado (el de GROUPS), y ninguna de más', () => {
  assert.deepEqual(Object.keys(CATALOG), ORDER);
  assert.deepEqual(GROUPS.filter(g => g != 'Propio'), ORDER, 'GROUPS cambió de orden o de grupos');
  const used = new Set(EXERCISES.map(groupOf));
  assert.deepEqual(ORDER.filter(g => !used.has(g)), [], 'tarjetas de grupos sin ejercicios');
  assert.deepEqual([...used].filter(g => !CATALOG[g]), [], 'grupos con ejercicios y sin tarjeta');
});

test('cada tarjeta con su id, sin repetir, y solo Funcional y Cardio anchas', () => {
  const ids = Object.values(CATALOG).map(x => x[0]);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every(k => /^[a-z_]+$/.test(k)), ids.join());
  assert.deepEqual(ORDER.filter(g => CATALOG[g][4]), ['Funcional', 'Cardio']);
});

test('sus imágenes: la ilustración (con transparencia) y el icono (sin pérdida, 54 de alto), del tamaño que dicen los datos', () => {
  const want = new Set();
  for (const [g, [id, w, h, iw]] of Object.entries(CATALOG)) {
    const art = readFileSync(new URL(id + '.webp', DIR));
    assert.equal(art.toString('latin1', 12, 16), 'VP8X', g + ': la ilustración lleva su transparencia (las esquinas)');
    assert.deepEqual(webpSize(art), [w, h], g);
    assert.ok(art.length < 20000, g + ': ' + art.length + ' bytes');
    const ico = readFileSync(new URL(id + '-icono.webp', DIR));
    assert.equal(ico.toString('latin1', 12, 16), 'VP8L', g + ': el icono, sin pérdida');
    assert.deepEqual(webpSize(ico), [iw, 54], g);
    want.add(id + '.webp').add(id + '-icono.webp');
  }
  assert.deepEqual(FILES.filter(f => !want.has(f)), [], 'imágenes que no usa ninguna tarjeta');
});
