// Pruebas del modelo articulado de las figuras (src/js/extras/rig.js, con data/figure y data/figposes), sin navegador:
// node --test tests/rig.test.mjs
// Se comprueba lo que se ve: que nada sale sin sitio, que los pies no se mueven en la sentadilla, que la barra va recta en
// el press y que el puño está donde se le pide.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// los módulos son JS de la app (módulos ES): se copian a una carpeta con "type": "module" para cargarlos tal cual
const dir = mkdtempSync(join(tmpdir(), 'sf-rig-'));
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
for (const f of ['data/figure.js', 'data/figposes.js', 'extras/rig.js']) {
  mkdirSync(join(dir, f.split('/')[0]), { recursive: true });
  writeFileSync(join(dir, f), readFileSync(new URL('../src/js/' + f, import.meta.url), 'utf8'));
}
const { FG_J, FG_P } = await import(pathToFileURL(join(dir, 'data/figure.js')));
const { FIG_POSES } = await import(pathToFileURL(join(dir, 'data/figposes.js')));
const R = await import(pathToFileURL(join(dir, 'extras/rig.js')));

const STEPS = [0, .1, .25, .4, .5, .6, .75, .9, 1];
const layers = (n, t) => R.rigLayers(FIG_POSES[n], t);
const layer = (n, t, k) => layers(n, t).find(l => l.k == k).t;
const nums = s => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);
/** Dónde deja la transformación de una capa («translate(x y) rotate(a) [scale(1 k)] translate(-rx -ry)») al punto p. */
const through = (t, p) => {
  const m = t.match(/^translate\(([^)]*)\) rotate\(([^)]*)\)(?: scale\(1 ([^)]*)\))? translate\(([^)]*)\)$/);
  assert.ok(m, 'transformación inesperada: ' + t);
  const [wx, wy] = nums(m[1]);
  const a = Number(m[2]) * Math.PI / 180;
  const k = m[3] ? Number(m[3]) : 1;
  const [rx, ry] = nums(m[4]);
  const x = p[0] + rx;
  const y = (p[1] + ry) * k;
  return [wx + x * Math.cos(a) - y * Math.sin(a), wy + x * Math.sin(a) + y * Math.cos(a)];
};
const near = (a, b, eps, what) => assert.ok(Math.abs(a - b) <= eps, (what || '') + ' ' + a + ' ≠ ' + b);

test('las posturas están bien escritas', () => {
  const names = Object.keys(FIG_POSES);
  assert.ok(names.length >= 7);
  for (const n of names) {
    const d = FIG_POSES[n];
    assert.ok(['S', 'F'].includes(d.v), n + ': vista');
    assert.ok(['a', 'b'].includes(d.up), n + ': up');
    assert.ok(d.at >= 0 && d.at <= 1, n + ': at');
    // el final solo cambia cosas que el inicio ya dice (si no, no habría de dónde partir)
    for (const k of Object.keys(d.b))
      assert.ok(k in d.a, n + ': «' + k + '» está en b y no en a');
    for (const p of d.props || [])
      assert.ok(['bar', 'bench', 'db'].includes(p[0]), n + ': material ' + p[0]);
  }
});

test('el dibujo: cada pieza gira sobre una articulación que existe y tiene silueta', () => {
  for (const [k, [pivot, sil, m]] of Object.entries(FG_P)) {
    assert.ok(FG_J[pivot], k + ': articulación ' + pivot);
    assert.match(sil, /^M[\d. -]+C[\d. C-]+Z$/, k + ': silueta');
    for (const [c, d] of Object.entries(m))
      assert.match(d, /^(M[\d. -]+C[\d. C-]+Z)+$/, k + '.' + c);
  }
  // las regiones no se repiten entre piezas: cada una se pinta por su nombre
  const all = Object.values(FG_P).flatMap(p => Object.keys(p[2]));
  assert.equal(all.length, new Set(all).size);
});

test('en todo el recorrido, las mismas capas y ninguna sin sitio', () => {
  for (const n of Object.keys(FIG_POSES)) {
    const keys = layers(n, 0).map(l => l.k).join(' ');
    for (const t of STEPS) {
      const ls = layers(n, t);
      assert.equal(ls.map(l => l.k).join(' '), keys, n + ' en ' + t);
      for (const l of ls)
        assert.ok(!/NaN|Infinity|undefined/.test(l.t), n + ' ' + l.k + ' en ' + t + ': ' + l.t);
      assert.deepEqual(R.rigFrame(FIG_POSES[n], t), ls.map(l => l.t));
    }
  }
});

test('sentadilla: los pies no se mueven, la barra baja casi recta y vuelve', () => {
  const foot = layer('Sentadilla', 0, 'FT');
  for (const t of STEPS)
    assert.equal(layer('Sentadilla', t, 'FT'), foot, 'el pie en ' + t);
  const bar = t => nums(layer('Sentadilla', t, 'bar'));
  assert.ok(bar(1)[1] - bar(0)[1] > 90, 'la barra baja');
  for (const t of STEPS)
    assert.ok(Math.abs(bar(t)[0] - bar(0)[0]) < 25, 'la barra no se va hacia delante ni hacia atrás en ' + t);
  // la cadera queda a la altura de la rodilla o algo por debajo de su parte alta
  const hip = through(layer('Sentadilla', 1, 'TH'), FG_J.hip);
  const knee = through(layer('Sentadilla', 1, 'TH'), FG_J.knee);
  assert.ok(knee[1] - hip[1] < 20 && knee[1] - hip[1] > -10, 'profundidad');
});

test('press banca: el puño está donde se le pide y la barra sube y baja en línea recta', () => {
  const d = FIG_POSES['Press banca'];
  const T = t => layer('Press banca', t, 'T');
  const bar = t => nums(layer('Press banca', t, 'bar'));
  // el puño, en el punto del tronco que dice la postura (grip), al inicio y al final
  [[0, d.a.grip], [1, d.b.grip]].forEach(([t, g]) => {
    const want = through(T(t), g);
    near(bar(t)[0], want[0], .3, 'x del puño en ' + t);
    near(bar(t)[1], want[1], .3, 'y del puño en ' + t);
  });
  // recta: cada punto intermedio, sobre la línea entre los extremos
  const [a, b] = [bar(0), bar(1)];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  assert.ok(b[1] - a[1] > 90, 'la barra baja al pecho');
  for (const t of STEPS) {
    const p = bar(t);
    const off = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len;
    assert.ok(off < .5, 'fuera de la recta en ' + t + ': ' + off);
  }
  // el cuerpo y el banco no se mueven; el antebrazo va vertical (el codo, bajo el puño)
  for (const t of STEPS) {
    assert.equal(T(t), T(0));
    assert.equal(layer('Press banca', t, 'bench'), '');
    const el = through(layer('Press banca', t, 'FA'), FG_J.el);
    assert.ok(Math.abs(el[0] - bar(t)[0]) < 6, 'el codo bajo el puño en ' + t);
    assert.ok(el[1] > bar(t)[1], 'el codo por debajo del puño en ' + t);
  }
});

test('curl: el cuerpo quieto, el codo en su sitio y la barra sube', () => {
  const bar = t => nums(layer('Curl bíceps barra', t, 'bar'));
  assert.ok(bar(0)[1] - bar(1)[1] > 80, 'la barra sube');
  const el = t => through(layer('Curl bíceps barra', t, 'FA'), FG_J.el);
  for (const t of STEPS) {
    assert.equal(layer('Curl bíceps barra', t, 'T'), layer('Curl bíceps barra', 0, 'T'));
    assert.ok(Math.hypot(el(t)[0] - el(0)[0], el(t)[1] - el(0)[1]) < 4, 'el codo no se adelanta en ' + t);
  }
});

test('elevaciones laterales: los dos brazos se abren igual, cada uno sobre su hombro', () => {
  const [x, y] = R.FRONT_ARM.pivot;
  for (const t of STEPS) {
    const a0 = nums(layer('Elevaciones laterales', t, 'A0'));
    const a1 = nums(layer('Elevaciones laterales', t, 'A1'));
    assert.deepEqual(a0.slice(1), [x, y]);
    assert.deepEqual(a1.slice(1), [200 - x, y]);
    near(a0[0], -a1[0], 1e-9);
    assert.equal(layer('Elevaciones laterales', t, 'B'), '');
  }
  assert.ok(nums(layer('Elevaciones laterales', 1, 'A0'))[0] > 70, 'los brazos llegan casi a la horizontal');
});

test('las variantes comparten la postura y cambian el material o dónde va la barra', () => {
  for (const [base, v] of [['Press banca', 'Press banca mancuernas'], ['Curl bíceps barra', 'Curl con mancuernas']])
    for (const t of STEPS)
      assert.deepEqual(R.rigFrame(FIG_POSES[v], t), R.rigFrame(FIG_POSES[base], t), v + ' en ' + t);
  assert.ok(FIG_POSES['Curl con mancuernas'].props.some(p => p[0] == 'db') && !FIG_POSES['Curl con mancuernas'].props.some(p => p[0] == 'bar'));
  // sentadilla frontal: los pies igual de quietos, la barra por delante del hombro y el tronco más derecho que en la trasera
  const lean = n => Number(layer(n, 1, 'T').match(/rotate\(([^)]*)\)/)[1]);
  assert.ok(lean('Sentadilla frontal') < lean('Sentadilla') - 5);
  for (const t of STEPS) {
    assert.equal(layer('Sentadilla frontal', t, 'FT'), layer('Sentadilla frontal', 0, 'FT'));
    const sh = through(layer('Sentadilla frontal', t, 'UA'), FG_J.sh);
    const bar = nums(layer('Sentadilla frontal', t, 'bar'));
    assert.ok(bar[0] > sh[0] + 10, 'la barra, por delante del hombro en ' + t);
    assert.ok(Math.abs(bar[0] - nums(layer('Sentadilla frontal', 0, 'bar'))[0]) < 25, 'la barra sobre los pies en ' + t);
  }
});

test('el encuadre: la miniatura recorta lo que no se mueve, salvo si se mueve el cuerpo entero', () => {
  const inside = (a, b) => a[0] >= b[0] - 7 && a[1] >= b[1] - 7 && a[0] + a[2] <= b[0] + b[2] + 7 && a[1] + a[3] <= b[1] + b[3] + 7;
  for (const n of Object.keys(FIG_POSES)) {
    const d = FIG_POSES[n];
    const full = R.rigBox(d, [0, .5, 1]);
    const thumb = R.rigBox(d, [d.at], 1);
    assert.ok(full.every(Number.isFinite) && thumb.every(Number.isFinite), n);
    assert.ok(full[2] > 60 && full[3] > 60 && thumb[2] > 40 && thumb[3] > 40, n);
    assert.ok(inside(thumb, full), n + ': la miniatura cabe en la figura entera');
  }
  const whole = n => R.rigBox(FIG_POSES[n], [FIG_POSES[n].at]);
  const thumb = n => R.rigBox(FIG_POSES[n], [FIG_POSES[n].at], 1);
  assert.ok(thumb('Press banca')[2] < whole('Press banca')[2] - 60, 'el press se recorta a los brazos y la cabeza');
  assert.ok(thumb('Curl bíceps barra')[3] < whole('Curl bíceps barra')[3] - 100, 'el curl se recorta al tronco');
  assert.ok(Math.abs(thumb('Sentadilla')[3] - whole('Sentadilla')[3]) < 20, 'la sentadilla va entera');
});

test('músculos → regiones del modelo de perfil', () => {
  assert.deepEqual(R.sideRegions(['pe']), ['PS', 'PI']);
  assert.deepEqual(R.sideRegions(['co', 'ab']), ['AB', 'OB', 'ER']);
  assert.deepEqual(R.sideRegions(['ad', 'zz']), []);
  assert.deepEqual(R.sideRegions(undefined), []);
  const all = Object.values(FG_P).flatMap(p => Object.keys(p[2]));
  const fu = R.sideRegions(['fu']);
  assert.ok(!fu.includes('KN') && !fu.includes('NK'));
  assert.equal(fu.length, all.length - 2);
  // cada región que se nombra existe en el dibujo
  for (const c of ['ps', 'pi', 'pe', 'dA', 'dL', 'dP', 'tr', 'bi', 'br', 'bq', 'an', 'da', 'rm', 'ro', 'ts', 'tm', 'er', 'cu', 'is', 'gl', 'gm', 'ge', 'so', 'ta', 'ab', 'ob', 'tv', 'co', 'fc', 'sa', 'ag'])
    for (const k of R.sideRegions([c]))
      assert.ok(all.includes(k), c + ' → ' + k);
});

test('arranque y frenada suaves', () => {
  assert.equal(R.ease(0), 0);
  assert.equal(R.ease(1), 1);
  near(R.ease(.5), .5, 1e-12);
  for (let t = 0; t < 1; t += .05)
    assert.ok(R.ease(t + .05) > R.ease(t));
});
