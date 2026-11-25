// El aviso de versión nueva en las apps ya instaladas, sin navegador: node --test tests/aviso.test.mjs
// Una app instalada decide si avisa con SU código, que ya no se puede cambiar. Hasta la 1.0.31, ese código solo compara las
// tres primeras cifras de la versión: para él la 1.0.4 es anterior a la 1.0.31 (4 < 31) y no avisaría. Por eso version.json
// lleva en `version` un texto que ese comparador da por posterior y que se lee como la versión (build.py, legacy_version), y
// en `number` la versión de verdad, que es lo que leen las apps desde la 1.0.4.
// Aquí está ese comparador, copiado tal cual de la 1.0.31 publicada (src/js/system/updates.js, etiqueta v1.0.31), y se le
// pasa lo que escribe build.py para una serie de versiones y fechas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// ── copia literal de la 1.0.31: no tocar ──
const isNewerVersion = (a, b) => {
  const x = String(a || '').split('.').map(Number);
  const y = String(b || '').split('.').map(Number);
  for (let i = 0; i < 3; i++)
    if ((x[i] || 0) != (y[i] || 0))
      return (x[i] || 0) > (y[i] || 0);
  return false;
};
// ── fin de la copia ──

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CASES = [];
for (const v of ['1.0.4', '1.0.4.1', '1.0.4.12', '1.0.5', '1.0.9', '1.0.10', '1.0.30'])
  for (const d of ['2026-11-25', '2026-12-31', '2027-01-01', '2027-05-09', '2031-09-30'])
    CASES.push([v, d]);
const py = 'import json, sys\nsys.path.insert(0, ".")\nimport build\nprint(json.dumps([[v, d, build.legacy_version(v, d), build.old_newer(build.legacy_version(v, d), "1.0.31")] for v, d in json.loads(sys.argv[1])]))';
const WRITTEN = JSON.parse(execFileSync('python3', ['-c', py, JSON.stringify(CASES)], { cwd: ROOT, encoding: 'utf8' }));
// las versiones que tuvo la app antes de la 1.0.4, todas con ese comparador
const INSTALLED = ['1.0.31', '1.0.3', '1.0.2', '1.0.1', '1.0.0'];

test('para una 1.0.31 instalada, «1.0.4» a secas no es una versión posterior (por eso hace falta otro texto)', () => {
  assert.equal(isNewerVersion('1.0.4', '1.0.31'), false);
  assert.equal(isNewerVersion('1.0.4', '1.0.3'), true);
});

test('lo que escribe build.py es posterior para todas las apps instaladas', () => {
  const bad = WRITTEN.filter(([, , s]) => !INSTALLED.every(i => isNewerVersion(s, i))).map(x => x.slice(0, 3));
  assert.deepEqual(bad, []);
});

test('y se lee como la versión, seguida del mes y el año: «1.0.4 de nov. 2026»', () => {
  const MONTHS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'];
  const bad = WRITTEN.filter(([v, d, s]) => s.replace(/\u2024\u2060/g, '.').replace(/\u00a0/g, ' ') != v + ' de ' + MONTHS[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4)).map(x => x.slice(0, 3));
  assert.deepEqual(bad, []);
  // lo que no es el número va con espacios de no separación: si no cabe en una línea, se parte antes de «de»
  assert.ok(WRITTEN.every(([, , s]) => s.split(' ').length == 2 && s.split(' ')[1].startsWith('de\u00a0')));
});

test('el comparador de build.py (old_newer) dice lo mismo que el de la app instalada', () => {
  assert.ok(WRITTEN.every(([, , s, newer]) => newer === isNewerVersion(s, '1.0.31')));
});

test('las versiones que ya son posteriores para esas apps van tal cual', () => {
  const plain = JSON.parse(execFileSync('python3', ['-c', 'import json, sys\nsys.path.insert(0, ".")\nimport build\nprint(json.dumps([build.legacy_version(v, "2027-03-01") for v in ["1.0.32", "1.0.40", "1.1.0", "1.1.0.1", "2.0.0"]]))'], { cwd: ROOT, encoding: 'utf8' }));
  assert.deepEqual(plain, ['1.0.32', '1.0.40', '1.1.0', '1.1.0.1', '2.0.0']);
  assert.ok(plain.every(v => INSTALLED.every(i => isNewerVersion(v, i))));
});
