// El inglés, sin navegador (core/i18n y core/html):  node --test tests/i18n.test.mjs
// El código está en español y el español es la clave. En inglés, la plantilla html`…` traduce al pintar: cada trozo de texto
// entre dos etiquetas y cada atributo que se lee son una frase (con {0}, {1}… donde va un valor), y un valor que es una frase
// del diccionario sale traducido si va donde se lee, nunca en un value, un data-… o una clase. En español no cambia nada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// los módulos son JS de la app (módulos ES): se copian a una carpeta con "type": "module" para cargarlos tal cual
const dir = mkdtempSync(join(tmpdir(), 'sf-i18n-'));
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
for (const f of ['util.js', 'i18n.js', 'html.js'])
  writeFileSync(join(dir, f), readFileSync(new URL('../src/js/core/' + f, import.meta.url), 'utf8'));
const missed = new Set();
globalThis.window = { __i18nMiss: missed }; // core/util anota en window que ha cargado; core/i18n, lo que no encuentra
const { X } = await import(pathToFileURL(join(dir, 'util.js'))); // cómo escapa la app un texto
const I = await import(pathToFileURL(join(dir, 'i18n.js')));
const H = await import(pathToFileURL(join(dir, 'html.js')));
const { html, raw, commas } = H;
const { say, tr, trAs, listAnd, addEnglish, startEnglish } = I;
const S = v => String(v);

const WORDS = {
  'Guardar': 'Save',
  'Guardar entreno': 'Save workout',
  'Hola, {0}': 'Hi, {0}',
  'Ronda {0} de {1}': 'Round {0} of {1}',
  'Te quedan {0} series de {1}.': '{1}: {0} sets left.',
  'Nombre del plato': 'Dish name',
  'Buscar': 'Search',
  'Cerrar': 'Close',
  'Press banca': 'Bench press',
  'Pecho': 'Chest',
  'Tríceps': 'Triceps',
  'Hombros': 'Shoulders',
  'Volumen': 'Volume',
  'objetivo:Volumen': 'Bulk',
  '# series': '# sets',
  '# serie': '# set',
  'Cada # semanas': 'Every # weeks',
  'descarga': 'deload',
  'Descanso': 'Rest',
  'Notas': 'Notes',
  '¿Borrar «{0}»?': 'Delete “{0}”?',
};
// lo que no es un texto (un número, un vacío, un nulo), tal como sale en español: en inglés tiene que salir igual
const mixed = () => S(html`<p>${0}${''}${null}${undefined}${12.5}${false}</p><input value="${null}" aria-label="${3}">`);
const MIXED_ES = mixed();
const page = name => html`<div class="card" data-n="${name}"><h3>Hola, ${name}</h3><button data-a="save" aria-label="Guardar entreno">Guardar</button></div>`;

test('en español, todo sale como está escrito', () => {
  assert.equal(I.EN, null);
  assert.equal(S(page('Press banca')), '<div class="card" data-n="Press banca"><h3>Hola, Press banca</h3><button data-a="save" aria-label="Guardar entreno">Guardar</button></div>');
  assert.equal(say `Ronda ${2} de ${8}`, 'Ronda 2 de 8');
  assert.equal(tr('Guardar'), 'Guardar');
  assert.equal(trAs('objetivo', 'Volumen'), 'Volumen');
  assert.equal(S(raw('Guardar')), 'Guardar');
  assert.equal(listAnd(['a', 'b', 'c']), 'a, b y c');
  assert.equal(listAnd(['a', 'b']), 'a y b');
  assert.equal(listAnd(['a']), 'a');
  assert.equal(S(commas(['Pecho', 'Tríceps', 'A & B'])), 'Pecho, Tríceps, ' + X('A & B'));
  assert.notEqual(X('A & B'), 'A & B');
  assert.equal(missed.size, 0, 'en español no se busca nada');
});

test('el diccionario se añade por partes y no cuenta hasta que arranca el inglés', () => {
  addEnglish(Object.fromEntries(Object.entries(WORDS).slice(0, 6)));
  addEnglish(Object.fromEntries(Object.entries(WORDS).slice(6)));
  assert.equal(I.EN, null);
  assert.equal(tr('Guardar'), 'Guardar');
  startEnglish();
  assert.ok(I.EN instanceof Map && I.EN.size == Object.keys(WORDS).length);
  assert.equal(tr('Guardar'), 'Save');
});

test('una plantilla: el texto entre etiquetas y los atributos que se leen son frases; los valores van en su sitio', () => {
  assert.equal(S(page('Ana')), '<div class="card" data-n="Ana"><h3>Hi, Ana</h3><button data-a="save" aria-label="Save workout">Save</button></div>');
  // el orden de los valores puede cambiar en la traducción
  assert.equal(S(html`<p>Te quedan ${3} series de ${'Ana'}.</p>`), '<p>Ana: 3 sets left.</p>');
  // los cuatro atributos que se leen, y solo esos
  assert.equal(S(html`<input placeholder="Buscar" title="Cerrar" aria-label="Guardar" alt="Notas" value="Guardar" data-v="Guardar" class="Guardar" name="Guardar">`),
    '<input placeholder="Search" title="Close" aria-label="Save" alt="Notes" value="Guardar" data-v="Guardar" class="Guardar" name="Guardar">');
  // el texto de un <textarea> es del usuario: no se toca
  assert.equal(S(html`<label>Notas</label><textarea aria-label="Notas">Guardar</textarea>`), '<label>Notes</label><textarea aria-label="Notes">Guardar</textarea>');
  // una frase que no está en el diccionario se queda como está, y se apunta
  assert.equal(S(html`<p>Frase sin traducir</p>`), '<p>Frase sin traducir</p>');
  assert.ok(missed.has('Frase sin traducir'));
});

test('un valor que es una frase del diccionario sale traducido donde se lee, y solo ahí', () => {
  const n = 'Press banca';
  assert.equal(S(html`<b data-n="${n}" title="${n}">${n}</b><input value="${n}"><option value="${n}">${n}</option>`),
    '<b data-n="Press banca" title="Bench press">Bench press</b><input value="Press banca"><option value="Press banca">Bench press</option>');
  // lo que escribe el usuario se escapa igual que en español, y dentro de una frase traducida también
  assert.equal(S(html`<p>${'<b>&'}</p>`), '<p>' + X('<b>&') + '</p>');
  assert.equal(S(html`<p>Hola, ${'<i>'}</p>`), '<p>Hi, ' + X('<i>') + '</p>');
  assert.equal(S(html`<p aria-label="¿Borrar «${'a"b'}»?">x</p>`), '<p aria-label="Delete “' + X('a"b') + '”?">x</p>');
  assert.ok(!X('<b>&"').match(/[<>"]/), 'el escapado de la app');
  // una lista de plantillas, y un valor que ya es HTML
  assert.equal(S(html`<ul>${['Pecho', 'Hombros'].map(m => html`<li>${m}</li>`)}</ul>`), '<ul><li>Chest</li><li>Shoulders</li></ul>');
  assert.equal(S(html`<p>${raw('<i>Guardar</i>')}</p>`), '<p><i>Guardar</i></p>');
  // raw con una frase exacta la traduce (un rótulo que una función recibe y pone con raw)
  assert.equal(S(html`<p>${raw('Guardar')}</p>`), '<p>Save</p>');
  // una plantilla que empieza dentro de una etiqueta (un trozo de atributos): sus data-… no se tocan
  assert.equal(S(html`data-n="${n}" aria-label="${n}"`), 'data-n="Press banca" aria-label="Bench press"');
  // un número, un vacío o un nulo: como en español
  assert.equal(mixed(), MIXED_ES);
});

test('say: una frase con sus valores; los valores que son frases también se traducen', () => {
  assert.equal(say `Ronda ${2} de ${8}`, 'Round 2 of 8');
  assert.equal(say `Te quedan ${1} series de ${'Press banca'}.`, 'Bench press: 1 sets left.');
  assert.equal(say `Hola, ${'Pecho'}`, 'Hi, Chest');
  // sin frase propia (solo valores y signos), cada valor por su lado
  assert.equal(say `${'Pecho'} · ${'Hombros'}`, 'Chest · Shoulders');
  assert.equal(say `${3} ${'Pecho'}`, '3 Chest');
  // una que no está: como en español
  assert.equal(say `Faltan ${2} cosas`, 'Faltan 2 cosas');
});

test('tr: tal cual, sin los espacios de los lados, con sus números, por partes o en lista', () => {
  assert.equal(tr('Guardar'), 'Save');
  assert.equal(tr('  Guardar '), '  Save ');
  assert.equal(tr('3 series'), '3 sets');
  assert.equal(tr('1 serie'), '1 set');
  assert.equal(tr('Cada 4 semanas'), 'Every 4 weeks');
  assert.equal(tr('Pecho · 3 series · 12:30'), 'Chest · 3 sets · 12:30');
  assert.equal(tr(' · descarga'), ' · deload');
  assert.equal(tr('Pecho, Tríceps'), 'Chest, Triceps');
  // una frase con comas no es una lista: solo se traduce si cada cosa es una frase del diccionario
  assert.equal(tr('Pecho, y algo más'), 'Pecho, y algo más');
  // lo que no es un texto, o no está, vuelve igual
  assert.equal(tr(''), '');
  assert.equal(tr(null), null);
  assert.equal(tr(7), 7);
  assert.equal(tr('Mi rutina de los lunes'), 'Mi rutina de los lunes');
  // con etiquetas dentro no se trocea
  assert.equal(tr('<b>Pecho</b> · Guardar'), '<b>Pecho</b> · Guardar');
});

test('trAs: la frase con su contexto delante y, si no la hay, la de siempre', () => {
  assert.equal(trAs('objetivo', 'Volumen'), 'Bulk');
  assert.equal(tr('Volumen'), 'Volume');
  assert.equal(trAs('objetivo', 'Pecho'), 'Chest');
  assert.equal(trAs('objetivo', 'Algo'), 'Algo');
});

test('listas: «a, b, and c» y cada cosa en inglés', () => {
  assert.equal(listAnd(['Pecho', 'Hombros', 'Tríceps']), 'Chest, Shoulders, and Triceps');
  assert.equal(listAnd(['Pecho', 'Hombros']), 'Chest and Shoulders');
  assert.equal(listAnd(['Pecho']), 'Chest');
  assert.equal(listAnd([]), '');
  assert.equal(S(commas(['Pecho', 'Core', 'A & B'])), 'Chest, Core, ' + X('A & B'));
});

test('cada frase del diccionario de la app conserva sus valores, sus números y sus etiquetas', async () => {
  // lo comprueba tools/i18n.js --check; aquí, que el diccionario de verdad carga entero en el motor de la app
  const { execFileSync } = await import('node:child_process');
  const all = JSON.parse(execFileSync('node', [new URL('../tools/i18n.js', import.meta.url).pathname, '--dump'], { maxBuffer: 1 << 26 }).toString());
  const keys = Object.keys(all);
  assert.ok(keys.length > 2500, 'diccionario corto: ' + keys.length);
  const holes = s => (s.match(/\{\d+\}/g) || []).sort().join();
  const bad = keys.filter(k => holes(k) != holes(all[k]) || !all[k].trim() || /[«»]/.test(all[k]) || all[k] == k);
  assert.deepEqual(bad.slice(0, 5), []);
});
