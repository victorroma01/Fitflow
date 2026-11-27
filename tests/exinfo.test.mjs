// Catálogo de ejercicios (T-05): cada ejercicio de la librería tiene su consejo (F-13) y su ejecución (F-14), y no hay dos
// textos iguales ni parecidos (tampoco un consejo igual a una ejecución).
//   node --test tests/exinfo.test.mjs
// Parecido: más de la mitad de las secuencias de tres palabras en común (índice de Jaccard), sin tildes ni signos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../src/js/data/exinfo.js', import.meta.url), 'utf8');
const m = SRC.match(/setExInfo\(`([\s\S]*)`\);/);
const LINES = (m ? m[1] : '').trim().split('\n').filter(Boolean);
const { EXERCISES } = await import('../src/js/data/library.js');
const ROWS = LINES.map(l => l.split('|'));
const BY = new Map(ROWS.map(r => [r[0], r]));
const PARTIAL = process.env.EXINFO_PARTIAL == '1';

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').split(/\s+/).filter(Boolean);
const shingles = s => {
  const w = norm(s);
  const o = new Set();
  for (let i = 0; i + 2 < w.length; i++)
    o.add(w[i] + ' ' + w[i + 1] + ' ' + w[i + 2]);
  return o;
};
const jaccard = (a, b) => {
  if (!a.size || !b.size)
    return 0;
  let n = 0;
  for (const x of a)
    if (b.has(x))
      n++;
  return n / (a.size + b.size - n);
};
const similar = (k, max) => {
  const sh = ROWS.map(r => [r[0], shingles(r[k])]);
  const bad = [];
  for (let i = 0; i < sh.length; i++)
    for (let j = i + 1; j < sh.length; j++) {
      const v = jaccard(sh[i][1], sh[j][1]);
      if (v > max)
        bad.push(sh[i][0] + ' ~ ' + sh[j][0] + ' (' + v.toFixed(2) + ')');
    }
  return bad;
};

test('cada línea es «Nombre|consejo|cómo se hace», sin campos vacíos', () => {
  assert.ok(LINES.length > 0, 'catálogo vacío');
  const bad = ROWS.filter(r => r.length != 3 || r.some(x => !x.trim()) || r.some(x => x != x.trim()));
  assert.deepEqual(bad.map(r => r[0]), []);
});

test('cada ejercicio de la librería tiene su entrada, y no hay entradas de más ni repetidas', () => {
  const names = new Set(EXERCISES.map(e => e.n));
  assert.deepEqual(ROWS.map(r => r[0]).filter(n => !names.has(n)), [], 'entradas de ejercicios que no existen');
  assert.equal(new Set(ROWS.map(r => r[0])).size, ROWS.length, 'ejercicio con dos entradas');
  if (!PARTIAL)
    assert.deepEqual([...names].filter(n => !BY.has(n)), [], 'ejercicios sin consejo ni ejecución');
});

test('los textos son frases completas de una longitud razonable', () => {
  const tip = ROWS.filter(r => r[1].length < 25 || r[1].length > 190 || !/[.!]$/.test(r[1]));
  const how = ROWS.filter(r => r[2].length < 90 || r[2].length > 480 || !/[.!]$/.test(r[2]));
  assert.deepEqual(tip.map(r => r[0] + ': ' + r[1].length), [], 'consejos demasiado cortos o largos, o sin punto final');
  assert.deepEqual(how.map(r => r[0] + ': ' + r[2].length), [], 'ejecuciones demasiado cortas o largas, o sin punto final');
});

test('no hay dos consejos iguales, ni dos ejecuciones iguales, ni un consejo igual a una ejecución', () => {
  const dup = k => {
    const seen = new Map();
    const o = [];
    ROWS.forEach(r => {
      const t = norm(r[k]).join(' ');
      if (seen.has(t))
        o.push(seen.get(t) + ' = ' + r[0]);
      seen.set(t, r[0]);
    });
    return o;
  };
  assert.deepEqual(dup(1), [], 'consejos repetidos');
  assert.deepEqual(dup(2), [], 'ejecuciones repetidas');
  const how = new Set(ROWS.map(r => norm(r[2]).join(' ')));
  assert.deepEqual(ROWS.filter(r => how.has(norm(r[1]).join(' '))).map(r => r[0]), [], 'consejo igual a una ejecución');
});

test('ningún consejo ni ninguna ejecución parece copiada de otra', () => {
  assert.deepEqual(similar(1, .5), [], 'consejos parecidos');
  assert.deepEqual(similar(2, .5), [], 'ejecuciones parecidas');
});

// ── el catálogo en inglés (src/js/i18n/en-exinfo.js): el mismo de cada ejercicio, con su nombre en español de clave ──
const EN_SRC = readFileSync(new URL('../src/js/i18n/en-exinfo.js', import.meta.url), 'utf8');
const EN_ROWS = ((EN_SRC.match(/setExInfo\(`([\s\S]*)`\);/) || [])[1] || '').trim().split('\n').filter(Boolean).map(l => l.split('|'));
const EN_BY = new Map(EN_ROWS.map(r => [r[0], r]));

test('en inglés: cada ejercicio de la librería tiene su entrada, con sus tres campos, y no hay de más ni repetidas', () => {
  assert.ok(EN_ROWS.length > 0, 'catálogo vacío');
  const names = new Set(EXERCISES.map(e => e.n));
  assert.deepEqual(EN_ROWS.filter(r => r.length != 3 || r.some(x => !x.trim()) || r.some(x => x != x.trim())).map(r => r[0]), [], 'líneas mal formadas');
  assert.deepEqual(EN_ROWS.map(r => r[0]).filter(n => !names.has(n)), [], 'entradas de ejercicios que no existen');
  assert.equal(EN_BY.size, EN_ROWS.length, 'ejercicio con dos entradas');
  assert.deepEqual([...names].filter(n => !EN_BY.has(n)), [], 'ejercicios sin su texto en inglés');
});

test('en inglés: los textos son frases completas, de una longitud parecida a la del español, y están en inglés', () => {
  const bad = [];
  for (const [n, tip, how] of EN_ROWS) {
    const es = BY.get(n);
    if (!/[.!]$/.test(tip) || !/[.!]$/.test(how)) bad.push(n + ': sin punto final');
    if (es && (tip.length < es[1].length * .5 || tip.length > es[1].length * 1.9 || how.length < es[2].length * .5 || how.length > es[2].length * 1.9)) bad.push(n + ': longitud muy distinta de la del español');
    // letras y palabras que el inglés no lleva: una línea sin traducir, o traducida a medias
    if (/[áéíóúñ¿¡]/i.test(tip + how) || /\b(el|la|los|las|con|para|una|hasta|hacia|pero|cuando|mientras)\b/i.test(tip + ' ' + how)) bad.push(n + ': parece español');
  }
  assert.deepEqual(bad, []);
});

test('en inglés: no hay dos consejos iguales ni dos ejecuciones iguales', () => {
  for (const k of [1, 2]) {
    const seen = new Map();
    const dup = [];
    EN_ROWS.forEach(r => { const t = r[k].toLowerCase(); if (seen.has(t)) dup.push(seen.get(t) + ' = ' + r[0]); seen.set(t, r[0]); });
    assert.deepEqual(dup, [], k == 1 ? 'consejos repetidos' : 'ejecuciones repetidas');
  }
});
