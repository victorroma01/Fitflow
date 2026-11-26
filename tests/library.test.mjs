// La librería de ejercicios y todo lo que nombra uno, sin navegador: los programas, los cambios por nivel, las plantillas del
// programa guiado, los grupos de rotación, los otros nombres para el buscador y los ejercicios juntados (data/aliases:
// EX_RETIRED).
//   node --test tests/library.test.mjs
// Un ejercicio se guarda por su nombre: si un programa nombra uno que no está, sale sin músculos, sin figura y sin ficha. Y
// cuando dos ejercicios se juntan en uno, lo guardado con el nombre que se quita tiene que seguir midiéndose igual.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.window = {}; // core/util anota en window que ha cargado
const { EXERCISES, PROGRAMS, PROGRAM_NAMES, parseProgram } = await import('../src/js/data/library.js');
const { EX_ALIASES, EX_RETIRED } = await import('../src/js/data/aliases.js');
const { LEVEL_SWAPS, LEVEL_OVERRIDES, LEVEL_EXTRA_DAYS } = await import('../src/js/data/levels.js');
const { GUIDE_TEMPLATES } = await import('../src/js/data/templates.js');
const { ROTATIONS } = await import('../src/js/data/rotation.js');
const { FIG_POSES } = await import('../src/js/data/figposes.js');
const { unitFromName } = await import('../src/js/core/calc.js');
const read = f => readFileSync(new URL('../src/js/' + f, import.meta.url), 'utf8');

const LIB = new Map(EXERCISES.map(e => [e.n, e]));
const missing = names => [...new Set(names)].filter(n => !LIB.has(n));
/** el nombre de una ficha de plantilla: «+I:Press francés», «F:Plancha*3/45s@45», «Sentadilla*4/6-10@150~PIR» */
const tokenName = t => t.replace(/^\+?(?:[A-Z]:)?/, '').split('*')[0].trim();
/** todas las cadenas de un dato, por dentro de sus listas y objetos */
const strings = v => typeof v == 'string' ? [v] : v && typeof v == 'object' ? Object.values(v).flatMap(strings) : [];

test('la librería: 529 ejercicios, sin nombres repetidos ni vacíos', () => {
  assert.equal(EXERCISES.length, 529);
  assert.equal(LIB.size, EXERCISES.length, 'nombres repetidos');
  assert.deepEqual(EXERCISES.filter(e => !e.n || e.n != e.n.trim()).map(e => e.n), []);
});

test('cada ejercicio tiene su grupo, su material y al menos un músculo principal', () => {
  assert.deepEqual(EXERCISES.filter(e => !e.c || !e.g || !e.q || !Array.isArray(e.p) || !e.p.length || !Array.isArray(e.s)).map(e => e.n), []);
});

test('los programas solo nombran ejercicios de la librería', () => {
  assert.ok(PROGRAMS.length >= 7 && PROGRAM_NAMES.length == PROGRAMS.length);
  for (let i = 0; i < PROGRAMS.length; i++) {
    const days = parseProgram(i);
    assert.ok(days.length > 0, PROGRAM_NAMES[i]);
    assert.deepEqual(missing(days.flatMap(d => d.ex.map(e => e.n))), [], PROGRAM_NAMES[i]);
  }
});

test('los cambios por nivel: lo que se cambia y por lo que se cambia están en la librería', () => {
  for (const [lv, swaps] of Object.entries(LEVEL_SWAPS))
    assert.deepEqual(missing(Object.entries(swaps).flat()), [], lv);
  assert.deepEqual(missing(Object.keys(LEVEL_OVERRIDES)), []);
  // un ajuste solo vale para un ejercicio que entra por un cambio: uno que no entra por ninguno no se usaría nunca
  const swapped = new Set(Object.values(LEVEL_SWAPS).flatMap(s => Object.values(s)));
  assert.deepEqual(Object.keys(LEVEL_OVERRIDES).filter(n => !swapped.has(n)), [], 'ajustes de un ejercicio que no entra por ningún cambio');
  const extra = strings(LEVEL_EXTRA_DAYS).flatMap(s => s.slice(s.indexOf(':') + 1).split(',').map(tokenName));
  assert.ok(extra.length > 10);
  assert.deepEqual(missing(extra), []);
});

test('las plantillas del programa guiado solo nombran ejercicios de la librería', () => {
  const names = strings(GUIDE_TEMPLATES).map(tokenName);
  assert.ok(names.length > 200, String(names.length));
  assert.deepEqual(missing(names), []);
  // las fichas sueltas que añade el propio programa guiado (programs/create): el final de cardio
  const own = [...read('programs/create.js').matchAll(/'\+?[A-Z]:([^'*|:]+)\*[^']*'/g)].map(m => m[1]);
  assert.ok(own.length >= 2, String(own));
  assert.deepEqual(missing(own), []);
});

test('los grupos de rotación: variantes de la librería, cada una en un grupo como mucho', () => {
  const names = ROTATIONS.flat();
  assert.ok(ROTATIONS.length > 20 && ROTATIONS.every(g => g.length >= 2), 'grupos de menos de dos');
  assert.deepEqual(missing(names), []);
  assert.deepEqual(names.filter((n, i) => names.indexOf(n) != i), [], 'en dos grupos');
});

test('los otros nombres para el buscador son de ejercicios de la librería', () => {
  assert.deepEqual(missing(Object.keys(EX_ALIASES)), []);
  assert.deepEqual(Object.entries(EX_ALIASES).filter(([, v]) => typeof v != 'string' || !v.trim()).map(([k]) => k), []);
});

test('cada figura es de un ejercicio de la librería, y cada ejercicio tiene la suya', () => {
  assert.deepEqual(missing(Object.keys(FIG_POSES)), []);
  assert.deepEqual(EXERCISES.filter(e => !Object.prototype.hasOwnProperty.call(FIG_POSES, e.n)).map(e => e.n), []);
});

test('los ejercicios juntados: el nombre que se quita ya no está, y el que queda, sí', () => {
  assert.equal(EX_RETIRED.size, 26);
  const old = [...EX_RETIRED.keys()], kept = [...EX_RETIRED.values()];
  assert.deepEqual(old.filter(n => LIB.has(n)), [], 'siguen en la librería');
  assert.deepEqual(missing(kept), [], 'el que queda no está');
  assert.deepEqual(kept.filter(n => EX_RETIRED.has(n)), [], 'el que queda también se quitó');
  // lo que se quita no deja nada suyo: ni figura ni otros nombres (los lleva el que queda)
  assert.deepEqual(old.filter(n => Object.prototype.hasOwnProperty.call(FIG_POSES, n)), [], 'figuras de un nombre quitado');
  assert.deepEqual(old.filter(n => Object.prototype.hasOwnProperty.call(EX_ALIASES, n)), [], 'otros nombres de un nombre quitado');
});

test('lo guardado con un nombre quitado se mide igual que antes, y en lo mismo que el que queda', () => {
  // La unidad sale del nombre guardado, que no cambia: un plan con «Cinta inclinada» sigue en minutos, y uno con «Single
  // unders», en repeticiones. Y es la del que queda, salvo en el arrastre con cuerda: se contaba en repeticiones y lo guardado
  // sigue así (son las que se hicieron), aunque el Sled pull que queda se mida en metros.
  const OWN = new Map([['Sled pull con cuerda', 'reps']]);
  const unit = n => (unitFromName(n) || { u: 'reps' }).u;
  for (const [old, kept] of EX_RETIRED)
    assert.equal(unit(old), OWN.get(old) || unit(kept), old + ' → ' + kept);
  assert.deepEqual([...OWN.keys()].filter(n => !EX_RETIRED.has(n) || unit(n) == unit(EX_RETIRED.get(n))), [], 'excepciones que ya no lo son');
  assert.equal(unitFromName('Cinta inclinada').u, 'min');
  assert.equal(unitFromName('Caminata inclinada').u, 'min');
  assert.equal(unitFromName('Single unders'), null);
  assert.equal(unitFromName('Comba'), null);
});

test('la comba y la caminata inclinada llevan lo de los dos que eran', () => {
  const comba = LIB.get('Comba'), walk = LIB.get('Caminata inclinada');
  assert.deepEqual([comba.c, comba.p, comba.s], ['Cardio', ['cr'], ['ge', 'so', 'cu', 'an', 'co']]);
  assert.deepEqual([walk.c, walk.p, [...walk.s].sort()], ['Cardio', ['cr'], ['cu', 'ge', 'gl', 'is']]);
  // quien los busque por el otro nombre los encuentra
  assert.match(EX_ALIASES.Comba, /Single unders/);
  assert.match(EX_ALIASES['Caminata inclinada'], /Cinta inclinada/);
  // el principiante salta a la comba donde el programa pide dobles, un minuto
  assert.equal(LEVEL_SWAPS.ini['Double unders'], 'Comba');
  assert.deepEqual(LEVEL_OVERRIDES.Comba, { rg: [60, 60] });
});
