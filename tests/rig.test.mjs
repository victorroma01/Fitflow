// Pruebas de las figuras de ejercicio sin navegador: el modelo articulado (src/js/extras/rig.js), el material (extras/gear),
// las familias de movimiento (extras/moves) y la tabla de posturas (data/figposes).
//   node --test tests/rig.test.mjs
// Se comprueba lo que se ve en cada uno de los ejercicios de la librería: que tiene figura, que nada sale sin sitio, que
// los codos y las rodillas doblan hacia donde doblan, que ninguna articulación pasa de lo que un cuerpo puede hacer, que
// las manos y los pies llegan a su agarre o a su apoyo, que nada se hunde en el suelo y que el gesto no da saltos; y, en
// unos cuantos ejercicios conocidos, que lo que tiene que estar quieto lo está y el peso va por donde debe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// los módulos son JS de la app (módulos ES): se copian a una carpeta con "type": "module" para cargarlos tal cual. La copia
// de extras/rig exporta además rigPose (la postura en un momento del gesto), que la app no necesita fuera del módulo.
const dir = mkdtempSync(join(tmpdir(), 'sf-rig-'));
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
for (const f of ['data/figure.js', 'data/figposes.js', 'data/aliases.js', 'extras/rig.js', 'extras/gear.js', 'extras/moves.js']) {
  mkdirSync(join(dir, f.split('/')[0]), { recursive: true });
  writeFileSync(join(dir, f), readFileSync(new URL('../src/js/' + f, import.meta.url), 'utf8'));
}
appendFileSync(join(dir, 'extras/rig.js'), '\nexport { rigPose };\n');
const { FG_J, FG_P } = await import(pathToFileURL(join(dir, 'data/figure.js')));
const { FIG_POSES } = await import(pathToFileURL(join(dir, 'data/figposes.js')));
const { EX_ALIASES } = await import(pathToFileURL(join(dir, 'data/aliases.js')));
const R = await import(pathToFileURL(join(dir, 'extras/rig.js')));
const { figPose } = await import(pathToFileURL(join(dir, 'extras/moves.js')));
const { EXERCISES } = await import('../src/js/data/library.js');

const NAMES = EXERCISES.map(e => e.n);
/* una figura por cada «familia y variantes» distinta: los ejercicios que se hacen igual la comparten */
const FIGURES = [...new Map(NAMES.map(n => [FIG_POSES[n], n])).entries()].map(([spec, n]) => ({ spec, n, def: figPose(n) }));
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const norm = a => ((a + 180) % 360 + 360) % 360 - 180;
/** De la transformación de una capa («[giro del cuerpo entero] translate(x y) rotate(a) …»), dónde queda su eje y cuánto gira. */
const placed = t => {
  const m = /translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)/.exec(t.replace(/^translate\([^)]*\) rotate\([-\d.]+ 100 205\) /, ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const layersAt = (def, t) => Object.fromEntries(R.rigLayers(def, t).map(l => [l.k, l.t]));
const spot = (def, t, s) => R.poseSpot(R.rigPose(def, t), s);
const near = (a, b, eps, what) => assert.ok(Math.abs(a - b) <= eps, (what || '') + ' ' + a + ' ≠ ' + b);
const fails = (list, what) => assert.equal(list.length, 0, what + ' (' + list.length + '): ' + list.slice(0, 8).join(' · '));

test('todos los ejercicios de la librería tienen su figura, y la tabla no nombra ninguno que no exista', () => {
  fails(NAMES.filter(n => !FIG_POSES[n]), 'ejercicios sin postura');
  fails(Object.keys(FIG_POSES).filter(n => !NAMES.includes(n)), 'posturas de ejercicios que no existen');
  fails(NAMES.filter(n => !figPose(n)), 'ejercicios cuya familia no existe');
  assert.equal(figPose('Un ejercicio propio'), null);
  assert.ok(FIGURES.length > 350, 'figuras distintas: ' + FIGURES.length);
});

test('los otros nombres de búsqueda son de ejercicios que existen', () => {
  fails(Object.keys(EX_ALIASES).filter(n => !NAMES.includes(n)), 'nombres que no están en la librería');
});

test('las figuras están bien escritas', () => {
  const bad = [];
  const keysIn = (n, what, from, into) => {
    for (const k of Object.keys(from || {})) {
      if (!(k in into))
        bad.push(n + ': «' + k + '» está en ' + what + ' y no en el inicio');
      else if (k == 'far' || k == 'r')
        keysIn(n, what + '.' + k, from[k], into[k]);
    }
  };
  for (const { n, def } of FIGURES) {
    if (!['S', 'F', 'B'].includes(def.v))
      bad.push(n + ': vista ' + def.v);
    if (!['a', 'b'].includes(def.up))
      bad.push(n + ': up');
    if (!(def.at >= 0 && def.at <= 1))
      bad.push(n + ': at');
    // el final y la postura intermedia solo cambian cosas que el inicio ya dice (si no, no habría de dónde partir)
    keysIn(n, 'el final', def.b, def.a);
    keysIn(n, 'la postura intermedia', def.m, def.a);
    for (const p of def.props || [])
      if (!['L', 'P', 'R', 'C', 'S', 'on', 'link', 'aim', 'bar', 'db', 'kb', 'ball', 'bag', 'disc'].includes(p[0]))
        bad.push(n + ': material ' + p[0]);
  }
  fails(bad, 'figuras mal escritas');
});

test('el dibujo: cada pieza gira sobre una articulación que existe y tiene silueta', () => {
  for (const [k, [pivot, sil, m]] of Object.entries(FG_P)) {
    assert.ok(FG_J[pivot], k + ': articulación ' + pivot);
    assert.match(sil, /^M[\d. -]+C[\d. C-]+Z$/, k + ': silueta');
    // un músculo puede ir en varios trozos (el serrato, los erectores)
    for (const [r, d] of Object.entries(m))
      assert.match(d, /^(M[\d. -]+C[\d. C-]+Z)+$/, k + '.' + r);
  }
});

test('en ningún momento del gesto sale una pieza sin sitio', () => {
  const bad = [];
  for (const { n, def } of FIGURES)
    for (const t of STEPS)
      for (const l of R.rigLayers(def, t))
        if (/NaN|undefined|Infinity/.test(l.t))
          bad.push(n + ' (' + l.k + ', t=' + t + ')');
  fails(bad, 'capas sin sitio');
});

test('los codos y las rodillas doblan hacia donde doblan', () => {
  // de perfil, el antebrazo solo se cierra hacia delante del brazo, y la pierna, hacia atrás del muslo. Se salva el brazo
  // que se dibuja en escorzo con el ángulo del antebrazo fijo (fa): la barra tras la nuca, un press visto de lado
  const bad = [];
  for (const { n, def } of FIGURES) {
    if (def.v != 'S')
      continue;
    for (const t of STEPS) {
      const o = layersAt(def, t);
      const pose = R.rigPose(def, t);
      for (const x of ['', 'x']) {
        const q = x && pose.far ? Object.assign({}, pose, pose.far) : pose;
        const elbow = norm(placed(o[x + 'UA'])[2] - placed(o[x + 'FA'])[2]);
        const knee = norm(placed(o[x + 'SH'])[2] - placed(o[x + 'TH'])[2]);
        if (q.fa == null && elbow < -8)
          bad.push(n + ': codo ' + Math.round(elbow) + '° en t=' + t);
        if (knee < -8)
          bad.push(n + ': rodilla ' + Math.round(knee) + '° en t=' + t);
      }
    }
  }
  fails(bad, 'articulaciones del revés');
});

test('cada articulación se queda dentro de lo que un cuerpo puede hacer', () => {
  // de perfil: la cintura, el cuello, la cadera, la rodilla, el tobillo, el codo, la muñeca y el hombro, en grados, en todo
  // el gesto. El brazo que se dibuja en escorzo (hacia quien mira) no se mide: de perfil no enseña su ángulo de verdad
  const LIMITS = { 'la cintura': [-40, 55], 'el cuello': [-50, 48], 'la cadera': [-40, 152], 'la rodilla': [-6, 162], 'el tobillo': [-48, 78], 'el codo': [-6, 162], 'la muñeca': [-100, 100] };
  const bad = [];
  for (const { n, def } of FIGURES) {
    const worst = new Map();
    const range = (what, v, t, lim) => {
      if ((v < lim[0] || v > lim[1]) && !worst.has(what))
        worst.set(what, what + ' a ' + Math.round(v) + '° en t=' + t);
    };
    for (const t of STEPS) {
      const o = Object.fromEntries(R.rigLayers(def, t).map(l => [l.k, (placed(l.t) || [])[2]]));
      const pose = R.rigPose(def, t);
      if (def.v == 'S') {
        range('la cintura', norm(o.TXs - o.PVs), t, LIMITS['la cintura']);
        range('el cuello', norm(o.HD - o.TXs), t, LIMITS['el cuello']);
        for (const x of ['', 'x']) {
          const q = x && pose.far ? Object.assign({}, pose, pose.far) : pose;
          const side = x ? ' (lado de atrás)' : '';
          range('la cadera' + side, norm(o.PVs - o[x + 'TH']), t, LIMITS['la cadera']);
          range('la rodilla' + side, norm(o[x + 'SH'] - o[x + 'TH']), t, LIMITS['la rodilla']);
          range('el tobillo' + side, norm(o[x + 'FT'] - o[x + 'SH']), t, LIMITS['el tobillo']);
          if ((q.kU || 1) >= .75 && q.fa == null) {
            range('el codo' + side, norm(o[x + 'UA'] - o[x + 'FA']), t, LIMITS['el codo']);
            // el hombro: de −90 (el brazo hacia atrás) a 215 (arriba y algo más); de 215 a 270 no llega nadie
            const sh = ((o.TXs - o[x + 'UA']) % 360 + 360) % 360;
            range('el hombro' + side, sh > 215 && sh < 270 ? sh : 0, t, [0, 0]);
          }
          // la comba va unida a la mano y es ella la que da la vuelta, no la muñeca
          if (!(def.props || []).some(p => p[0] == 'on' && p[2] == 'HA' && p[3][0] == 'L'))
            range('la muñeca' + side, norm(o[x + 'FA'] - o[x + 'HA']), t, LIMITS['la muñeca']);
        }
      } else
        for (const i of [0, 1]) {
          const m = i ? -1 : 1;
          const side = i ? ' (derecho)' : ' (izquierdo)';
          range('el brazo' + side, m * o['U' + i], t, [-40, 190]);
          range('el antebrazo' + side, norm(m * (o['F' + i] - o['U' + i])), t, [-165, 165]);
          range('la pierna' + side, m * o['T' + i], t, [-40, 95]);
          range('la rodilla' + side, norm(m * (o['S' + i] - o['T' + i])), t, [-150, 40]);
        }
    }
    if (worst.size)
      bad.push(n + ': ' + [...worst.values()].join(', '));
  }
  fails(bad, 'articulaciones fuera de su recorrido');
});

test('las manos y los pies llegan a donde se les pide', () => {
  // si la postura dice dónde va el puño, la muñeca apoyada o el tobillo, el brazo o la pierna tienen que alcanzarlo: si
  // no, la mano queda en el aire, lejos de la barra o del suelo. El lado de atrás se dibuja algo desplazado
  const FAR = [3, -3.5];
  const bad = [];
  for (const { n, def } of FIGURES) {
    if (def.v != 'S')
      continue;
    const worst = new Map();
    for (const t of STEPS) {
      const pose = R.rigPose(def, t);
      for (const x of ['', 'x']) {
        const q = x && pose.far ? Object.assign({}, pose, pose.far) : pose;
        const off = x ? FAR : [0, 0];
        const miss = (what, got, goal) => {
          const d = Math.hypot(got[0] - off[0] - goal[0], got[1] - off[1] - goal[1]);
          if (d > 3.5 && !worst.has(what))
            worst.set(what, what + (x ? ' de atrás' : '') + ' se queda a ' + Math.round(d) + ' px en t=' + t);
        };
        const goal = q.palm || q.gw || (q.grip ? R.poseSpot(pose, ['TX', q.grip[0], q.grip[1]]) : null);
        if (goal)
          miss('la mano' + x, q.palm ? R.poseSpot(pose, [x + 'FA', 99.5, 207]) : R.poseSpot(pose, x ? 'G' : 'g'), goal);
        if (q.foot)
          miss('el pie' + x, R.poseSpot(pose, [x + 'SH', 97, 385]), q.foot);
      }
    }
    if (worst.size)
      bad.push(n + ': ' + [...worst.values()].join(', '));
  }
  fails(bad, 'manos o pies que no llegan');
});

test('nada se hunde en el suelo', () => {
  const JOINTS = [['el puño', 'g'], ['el codo', ['UA', 99, 150]], ['la rodilla', ['TH', 101, 297]], ['la coronilla', ['HD', 100, 4]], ['la cadera', ['PV', 99, 196]], ['el hombro', ['TX', 99, 82]], ['el tobillo', ['SH', 97, 385]],
    ['el puño de atrás', 'G'], ['el codo de atrás', ['xUA', 99, 150]], ['la rodilla de atrás', ['xTH', 101, 297]], ['el tobillo de atrás', ['xSH', 97, 385]]];
  const bad = [];
  for (const { n, def } of FIGURES) {
    if (def.v != 'S' || def.nofloor)
      continue;
    for (const t of STEPS)
      for (const [what, s] of JOINTS) {
        const y = spot(def, t, s)[1];
        if (y > 404)
          bad.push(n + ': ' + what + ' a y=' + Math.round(y) + ' en t=' + t);
      }
  }
  fails(bad, 'piezas bajo el suelo (que está en y=402)');
});

test('el gesto no da saltos', () => {
  // entre dos momentos seguidos, una pieza puede ir deprisa, pero no cambiar de golpe: si en un paso de 1/20 gira o se
  // desplaza mucho, se mira ese paso veinte veces más fino, y un salto de verdad sigue siendo un salto
  const bad = [];
  for (const { n, def } of FIGURES) {
    let prev = null;
    for (const t of STEPS) {
      const o = layersAt(def, t);
      for (const k of Object.keys(prev || {})) {
        const a = placed(prev[k]);
        const b = placed(o[k]);
        if (!a || !b)
          continue;
        const link = /^p\d+[le]$/.test(k);
        if ((Math.abs(norm(b[2] - a[2])) <= 28 || link) && Math.hypot(b[0] - a[0], b[1] - a[1]) <= 34)
          continue;
        let last = null;
        let worst = [0, 0];
        for (let j = 0; j <= 20; j++) {
          const c = placed(layersAt(def, t - (1 - j / 20) / 20)[k]);
          if (last)
            worst = [Math.max(worst[0], Math.abs(norm(c[2] - last[2]))), Math.max(worst[1], Math.hypot(c[0] - last[0], c[1] - last[1]))];
          last = c;
        }
        if ((worst[0] > 10 && !link) || worst[1] > 10)
          bad.push(n + ': ' + k + ' salta ' + Math.round(worst[0]) + '° y ' + Math.round(worst[1]) + ' px hacia t=' + t);
      }
      prev = o;
    }
  }
  fails(bad, 'saltos');
});

test('el encuadre: la figura grande cabe entera y la miniatura enseña la cabeza y lo que se mueve', () => {
  const bad = [];
  for (const { n, def } of FIGURES) {
    const all = R.rigBox(def, [0, .25, .5, .75, 1]);
    const small = R.rigBox(def, [def.at], 1);
    if (![...all, ...small].every(Number.isFinite) || all[2] < 60 || all[3] < 60 || all[2] > 760 || all[3] > 760)
      bad.push(n + ': encuadre ' + all.map(Math.round));
    if (small[2] < 30 || small[3] < 30)
      bad.push(n + ': miniatura ' + small.map(Math.round));
    // una postura que se mantiene no se recorta: la miniatura es la figura entera
    if (def.hold && (small[2] < all[2] - 1 || small[3] < all[3] - 5))
      bad.push(n + ': la miniatura de una postura que se mantiene está recortada');
  }
  fails(bad, 'encuadres');
});

test('una postura intermedia es el medio del gesto', () => {
  const def = figPose('Burpees');
  assert.ok(def.m, 'el burpee pasa por una postura intermedia');
  // de pie al empezar; a medio gesto, en cuclillas (la cadera, mucho más baja); al final, tumbado (el hombro, cerca del suelo)
  const hip = t => spot(def, t, ['PV', 99, 196])[1];
  const shoulder = t => spot(def, t, ['TX', 99, 82])[1];
  assert.ok(hip(0) < 210 && hip(.5) > 300, 'la cadera: ' + hip(0) + ' → ' + hip(.5));
  assert.ok(shoulder(.5) < 300 && shoulder(1) > 350, 'el hombro: ' + shoulder(.5) + ' → ' + shoulder(1));
  // y el medio es exactamente esa postura: lo que dice m, sobre lo del inicio
  assert.deepEqual(R.rigPose(def, .5), Object.assign({}, def.a, def.m));
});

test('sentadilla: los pies no se mueven y la barra baja casi en vertical', () => {
  const def = figPose('Sentadilla');
  const foot = STEPS.map(t => placed(layersAt(def, t).FT));
  for (const f of foot) {
    near(f[0], foot[0][0], .01, 'el pie, en x');
    near(f[1], foot[0][1], .01, 'el pie, en y');
  }
  const bar = STEPS.map(t => spot(def, t, 'g'));
  assert.ok(Math.max(...bar.map(q => q[0])) - Math.min(...bar.map(q => q[0])) < 25, 'la barra se va de su vertical');
  assert.ok(bar[20][1] - bar[0][1] > 90, 'la barra baja');
});

test('press de banca: la barra sube casi recta, de la parte baja del pecho a encima de los hombros, y el cuerpo no se mueve del banco', () => {
  const def = figPose('Press banca');
  const bar = STEPS.map(t => spot(def, t, 'g'));
  assert.ok(Math.max(...bar.map(q => q[0])) - Math.min(...bar.map(q => q[0])) < 30, 'la barra se va de su vertical');
  assert.ok(Math.abs(bar[20][1] - bar[0][1]) > 70, 'la barra recorre el press');
  const hip = STEPS.map(t => spot(def, t, ['PV', 99, 196]));
  for (const h of hip)
    near(h[1], hip[0][1], .01, 'la cadera');
});

test('curl: el brazo no se mueve y solo se cierra el codo', () => {
  const def = figPose('Curl bíceps barra');
  const a = layersAt(def, 0);
  const b = layersAt(def, 1);
  assert.ok(Math.abs(norm(placed(a.UA)[2] - placed(b.UA)[2])) < 12, 'el brazo se mueve');
  assert.ok(Math.abs(norm(placed(a.FA)[2] - placed(b.FA)[2])) > 100, 'el antebrazo no llega a cerrarse');
});

test('colgado de la barra: las manos no se mueven de ella y el cuerpo sube', () => {
  const def = figPose('Dominadas');
  const grip = STEPS.map(t => spot(def, t, 'g'));
  for (const g of grip) {
    near(g[0], grip[0][0], .01, 'el puño, en x');
    near(g[1], grip[0][1], .01, 'el puño, en y');
  }
  assert.ok(spot(def, 0, ['HD', 100, 4])[1] - spot(def, 1, ['HD', 100, 4])[1] > 80, 'la cabeza sube');
  // y la barra está lo bastante alta para que, colgado, los pies no lleguen al suelo
  assert.ok(spot(def, 0, ['FT', 128, 401.5])[1] < 402, 'los pies tocan el suelo');
});

test('remo: el codo va hacia atrás, por encima de la espalda', () => {
  const def = figPose('Remo con barra');
  const elbow = spot(def, 1, ['UA', 99, 150]);
  const shoulder = spot(def, 1, ['TX', 99, 82]);
  assert.ok(elbow[0] < shoulder[0] - 30 && elbow[1] < shoulder[1] + 10, 'el codo: ' + elbow.map(Math.round) + ', el hombro: ' + shoulder.map(Math.round));
});

test('lo que lleva un cable o una palanca llega hasta la mano', () => {
  // las piezas que unen un punto fijo con el puño (link) acaban, en cada momento, donde está el puño
  const def = figPose('Jalón al pecho');
  const i = def.props.findIndex(p => p[0] == 'link' && p[3] == 'g');
  assert.ok(i >= 0, 'el jalón lleva un cable hasta el puño');
  for (const t of [0, .5, 1]) {
    const m = /^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\) scale\(([-\d.]+) 1\)$/.exec(layersAt(def, t)['p' + i + 'l']);
    assert.ok(m, 'la capa del cable');
    const a = Number(m[3]) * Math.PI / 180;
    const end = [Number(m[1]) + Number(m[4]) * Math.cos(a), Number(m[2]) + Number(m[4]) * Math.sin(a)];
    const g = spot(def, t, 'g');
    near(end[0], g[0], .6, 'el cable, en x');
    near(end[1], g[1], .6, 'el cable, en y');
  }
});

test('de frente: los dos lados son el reflejo uno del otro, salvo que se diga otra cosa', () => {
  const def = figPose('Elevaciones laterales');
  assert.equal(def.v, 'F');
  const o = layersAt(def, 1);
  const l = placed(o.U0);
  const r = placed(o.U1);
  near(l[0] + r[0], 200, .2, 'los hombros');
  near(l[2], -r[2], .2, 'la apertura de los brazos');
  assert.ok(Math.abs(l[2]) > 60, 'los brazos se abren');
  // y de espaldas se usa para lo que trabaja por detrás
  assert.equal(figPose('Pájaros en máquina').v, 'B');
});

test('arranque y frenada suaves', () => {
  assert.equal(R.ease(0), 0);
  assert.equal(R.ease(1), 1);
  near(R.ease(.5), .5, 1e-9);
  assert.ok(R.ease(.1) < .1 && R.ease(.9) > .9);
});

test('los músculos de cada pieza del modelo de perfil', () => {
  assert.deepEqual(R.sideRegions(['cu']), ['CU']);
  assert.deepEqual(R.sideRegions(['er']), ['ER1', 'ER2']);
  assert.deepEqual(R.sideRegions(['ab', 'ob']), ['AB1', 'AB2', 'OB']);
  assert.deepEqual(R.sideRegions(['no-existe']), []);
  // todas las regiones que se nombran existen en alguna pieza del dibujo
  const drawn = new Set(Object.values(FG_P).flatMap(p => Object.keys(p[2])));
  const codes = ['ps', 'pi', 'pe', 'dA', 'dL', 'dP', 'tr', 'bi', 'br', 'bq', 'an', 'da', 'rm', 'ro', 'ts', 'tm', 'er', 'cu', 'is', 'gl', 'gm', 'ge', 'so', 'ta', 'ab', 'ob', 'tv', 'co', 'fc', 'sa', 'ag'];
  fails(R.sideRegions(codes).filter(k => !drawn.has(k)), 'regiones sin dibujo');
});
