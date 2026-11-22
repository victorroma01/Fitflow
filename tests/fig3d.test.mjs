// Pruebas del motor de las figuras 3D tal como va en la app, sin navegador: node --test tests/fig3d.test.mjs
// Se arranca como lo compone build.py para extras/motor3d (los archivos de src/fig3d en su orden, cada uno con su G en vez
// de window, en modo estricto) con el mapa muscular y las regiones de la app, y se mira cada ejercicio de data/figposes: que
// su familia exista y lo haga, que se dibuje en todo el gesto sin números rotos y entero dentro de lo que mide bounds, que
// su reloj vaya de 0 a 1 y que el dibujo solo use lo que él mismo o el motor definen (una miniatura es un dibujo suelto).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// los datos de la app (módulos ES sin dependencias): se copian a una carpeta con "type": "module" para cargarlos tal cual
const dir = mkdtempSync(join(tmpdir(), 'sf-fig3d-'));
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
for (const f of ['anatomy.js', 'figposes.js', 'library.js'])
  writeFileSync(join(dir, f), readFileSync(new URL('../src/js/data/' + f, import.meta.url), 'utf8'));
const { AN_R, AN_S, AN_H, AN_PA } = await import(pathToFileURL(join(dir, 'anatomy.js')));
const { FIG_POSES } = await import(pathToFileURL(join(dir, 'figposes.js')));
const { EXERCISES } = await import(pathToFileURL(join(dir, 'library.js')));
// las regiones de cada músculo están en extras/anatomy, que necesita la página: se leen de su código
const anatomy = readFileSync(new URL('../src/js/extras/anatomy.js', import.meta.url), 'utf8');
const REG = Function('return ' + anatomy.match(/^export const MUSCLE_REGIONS = (\{.*\});$/m)[1])();
// el motor, como lo compone build.py (motor3d_js), con los archivos de su lista FIG3D_FILES
const FILES = [...readFileSync(new URL('../build.py', import.meta.url), 'utf8').match(/^FIG3D_FILES = \(([^)]*)\)$/m)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const END = '})(window);';
const body = FILES.map(f => {
  const t = readFileSync(new URL('../src/fig3d/' + f, import.meta.url), 'utf8').trimEnd();
  assert.ok(t.endsWith(END), f);
  return t.slice(0, -END.length) + '})(G);';
}).join('\n');
const F3 = Function('FIG_MAP', 'FIG_REG', '"use strict";\nconst G = { FIG_MAP, FIG_REG };\n' + body + '\nreturn G.Fig3D;')({ R: AN_R, S: AN_S, H: AN_H, PA: AN_PA }, REG);
const LIB = new Map(EXERCISES.map(e => [e.n, e]));
const NAMES = Object.keys(FIG_POSES);
const exs = new Map(NAMES.map(n => [n, F3.make(n, FIG_POSES[n], LIB.get(n) ? LIB.get(n).p || [] : [], LIB.get(n) ? LIB.get(n).s || [] : [])]));
const MOMENTS = Array.from({ length: 9 }, (_, i) => i / 8);
// lo que define el motor para todas las figuras (degradados y rayados)
const SHARED = new Set([...F3.DEFS.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

test('cada ejercicio con figura está en la librería, y su familia en el motor', () => {
  assert.equal(NAMES.length, 527);
  assert.deepEqual(NAMES.filter(n => !LIB.has(n)), []);
  assert.deepEqual(NAMES.filter(n => !F3.FAMILIES[FIG_POSES[n].split(' ')[0]]), []);
});

test('el motor hace los 527 ejercicios, cada uno con su cámara y su gesto', () => {
  const bad = NAMES.filter(n => {
    const ex = exs.get(n);
    return !ex || typeof ex.at != 'function' || !Number.isFinite(ex.yaw) || !Number.isFinite(ex.pitch) || !['a', 'b'].includes(ex.up);
  });
  assert.deepEqual(bad, []);
});

test('cada uno se dibuja en todo el gesto, sin números rotos, y lo que ocupa es el de una figura', () => {
  const bad = [];
  for (const n of NAMES) {
    const ex = exs.get(n);
    const cam = F3.camera(ex.yaw, ex.pitch);
    for (const t of MOMENTS) {
      const svg = F3.draw(ex, t, cam, 'q', true);
      const b = F3.bounds(svg);
      if (/NaN|undefined|Infinity/.test(svg))
        bad.push(n + ' (t=' + t + '): números rotos');
      else if (!b || !b.every(Number.isFinite) || b[2] < 60 || b[3] < 60 || b[2] > 2400 || b[3] > 2400)
        bad.push(n + ' (t=' + t + '): ocupa ' + JSON.stringify(b && b.map(Math.round)));
    }
    // de lado y con el rayado de los músculos (la figura grande), a mitad del gesto
    const side = F3.draw(ex, .5, F3.camera(...(ex.side || [-80, 4])), 'q', false);
    if (/NaN|undefined|Infinity/.test(side))
      bad.push(n + ': de lado, números rotos');
  }
  assert.deepEqual(bad, []);
});

test('lo que usa cada dibujo lo define él o el motor (una miniatura es un dibujo suelto)', () => {
  const bad = [];
  for (const n of NAMES) {
    const ex = exs.get(n);
    const svg = F3.draw(ex, 1, F3.camera(ex.yaw, ex.pitch), 'q', false);
    const own = new Set([...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    const used = [...svg.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]).filter(id => !own.has(id) && !SHARED.has(id));
    if (used.length)
      bad.push(n + ': ' + [...new Set(used)].join(', '));
  }
  assert.deepEqual(bad, []);
});

test('el reloj de cada gesto va de 0 a 1', () => {
  const bad = NAMES.filter(n => {
    const ex = exs.get(n);
    for (let ms = 0; ms < 20000; ms += 97) {
      const t = ex.beat ? ex.beat(ms) : F3.beat(ms, ex.up, false, ex.pause, ex.rest);
      if (!(t >= 0 && t <= 1))
        return true;
    }
    return false;
  });
  assert.deepEqual(bad, []);
});

test('bounds mide trazos, curvas, círculos y discos desplazados', () => {
  assert.deepEqual(F3.bounds('<path d="M0 0L10 0q5 10 10 0z"/>'), [0, 0, 20, 5]);
  assert.deepEqual(F3.bounds('<g class="pl" transform="translate(100 50)"><circle cx="0" cy="0" r="10"/></g>'), [90, 40, 20, 20]);
  assert.deepEqual(F3.bounds('<defs><path d="M-500 -500L0 0"/></defs><g class="nf"><path d="M-900 0L0 0"/></g><ellipse cx="5" cy="5" rx="5" ry="2"/>'), [0, 3, 10, 4]);
  assert.equal(F3.bounds('<g class="nf"><path d="M0 0L9 9"/></g>'), null);
});
