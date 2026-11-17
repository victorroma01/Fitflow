// Pruebas de las figuras de ejercicio sin navegador: el modelo articulado (src/js/extras/rig.js), el material (extras/gear),
// las familias de movimiento (extras/moves) y la tabla de posturas (data/figposes).
//   node --test tests/rig.test.mjs
// Se comprueba lo que se ve en cada uno de los ejercicios de la librería: que tiene figura, que nada sale sin sitio, que
// los codos y las rodillas doblan hacia donde doblan, que ninguna articulación pasa de lo que un cuerpo puede hacer, que
// las manos y los pies llegan a su agarre o a su apoyo, que nada se hunde en el suelo y que el gesto no da saltos; que las
// máquinas se mueven como máquinas (la barra de la Smith no se sale de su guía y las palancas no se estiran), que quien
// está de pie no se caería (el peso cae sobre los pies) y que la barra no atraviesa el cuerpo; y, en unos cuantos
// ejercicios conocidos, que lo que tiene que estar quieto lo está y el peso va por donde debe.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// los módulos son JS de la app (módulos ES): se copian a una carpeta con "type": "module" para cargarlos tal cual. La copia
// de extras/rig exporta además rigPose (la postura en un momento del gesto) y framePoints (los puntos que marcan lo que
// ocupa la figura), que la app no necesita fuera del módulo.
const dir = mkdtempSync(join(tmpdir(), 'sf-rig-'));
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
for (const f of ['data/figure.js', 'data/figposes.js', 'data/aliases.js', 'extras/rig.js', 'extras/gear.js', 'extras/moves.js']) {
  mkdirSync(join(dir, f.split('/')[0]), { recursive: true });
  writeFileSync(join(dir, f), readFileSync(new URL('../src/js/' + f, import.meta.url), 'utf8'));
}
appendFileSync(join(dir, 'extras/rig.js'), '\nexport { rigPose, framePoints };\n');
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
      if (!['L', 'P', 'R', 'C', 'S', 'on', 'slide', 'by', 'link', 'aim', 'bar', 'db', 'kb', 'ball', 'bag', 'disc'].includes(p[0]))
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
        const lever = q.gl ? [q.gl[0] + q.gl[2] * Math.cos(q.gl[3] * Math.PI / 180), q.gl[1] + q.gl[2] * Math.sin(q.gl[3] * Math.PI / 180)] : null;
        const goal = q.palm || q.gw || lever || (q.grip ? R.poseSpot(pose, ['TX', q.grip[0], q.grip[1]]) : null);
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
  // y un pie apoyado plano pisa el suelo, no se mete en él: la suela, del talón a la punta (el del lado de atrás se
  // dibuja 3,5 px más arriba). Un talón levantado sí hunde un poco la punta, que en el dibujo no se dobla
  const sunk = [];
  for (const { n, def } of FIGURES) {
    if (def.v != 'S' || def.nofloor)
      continue;
    const top = def.cycle ? 2 : 1;
    for (let i = 0; i < 20 * top + (def.cycle ? 0 : 1); i++) {
      const t = i / 20;
      const o = layersAt(def, t);
      for (const [k, what] of [['FT', 'el pie'], ['xFT', 'el pie de atrás']]) {
        if (Math.abs(norm(placed(o[k])[2])) > 3)
          continue;
        const y = Math.max(spot(def, t, [k, 83, 402])[1], spot(def, t, [k, 137, 402])[1]);
        if (y > 407)
          sunk.push(n + ': ' + what + ', plano, a y=' + Math.round(y) + ' en t=' + t);
      }
    }
  }
  fails(sunk, 'pies planos bajo el suelo');
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
  // el material dibujado con trazos H y V (el pie de un asiento) cuenta por donde pasa de verdad: una figura de frente,
  // sentada en su máquina, queda centrada en su recuadro y este llega hasta el suelo
  for (const n of ['Pec deck', 'Abducción en máquina', 'Aducción en máquina']) {
    const box = R.rigBox(figPose(n), [0, .5, 1]);
    near(box[0] + box[2] / 2, 100, 3, n + ': el centro del recuadro');
    assert.ok(box[1] + box[3] > 398, n + ': el recuadro llega al suelo');
  }
});

test('la figura grande cabe en su encuadre en todo momento del gesto', () => {
  // el encuadre se calcula con unos cuantos momentos (rigMoments: los octavos del gesto y, si algo da vueltas, los de cada
  // vuelta); entre uno y otro nada puede salirse de él, ni en la segunda mitad de un ciclo
  const bad = [];
  for (const { n, def } of FIGURES) {
    const moments = R.rigMoments(def);
    assert.ok(moments.every(t => t >= 0 && t < (def.cycle ? 2 : 1.0001)), n + ': momentos fuera del gesto');
    const b = R.rigBox(def, moments);
    const top = def.cycle ? 2 : 1;
    let worst = 0;
    for (let i = 0; i < 40 * top + (def.cycle ? 0 : 1); i++)
      for (const [, q, m] of R.framePoints(def, i / 40))
        worst = Math.max(worst, b[0] - (q[0] - m), b[1] - (q[1] - m), q[0] + m - b[0] - b[2], q[1] + m - b[1] - b[3]);
    if (worst > .5)
      bad.push(n + ': se sale ' + worst.toFixed(1) + ' px');
  }
  fails(bad, 'figuras que se salen de su encuadre');
  // lo que da vueltas cuenta con el giro que lleva en cada momento: la cuerda de la comba ensancha el encuadre de la
  // figura grande hasta donde llega por delante y por detrás, pero no el de la miniatura, que la pinta bajo los pies
  for (const n of ['Comba', 'Double unders']) {
    const def = figPose(n);
    const [all, small] = [R.rigBox(def, R.rigMoments(def)), R.rigBox(def, [def.at], 1)];
    assert.ok(all[2] > 440 && small[2] < 200, n + ': la figura grande mide ' + Math.round(all[2]) + ' de ancho y la miniatura, ' + Math.round(small[2]));
  }
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

test('en la Smith la barra no se sale de su guía', () => {
  // la guía es un tramo vertical fino del armazón; la barra va en los puños y, en todo el gesto, sigue en su vertical
  const bad = [];
  let seen = 0;
  for (const { spec, n, def } of FIGURES) {
    if (!/\bsmith\b/.test(spec))
      continue;
    seen++;
    const rail = def.props.find(p => p[0] == 'L' && p[3] == 4 && p[4] == 3);
    if (!rail) {
      bad.push(n + ': sin guía');
      continue;
    }
    const x = Number(/-?[\d.]+/.exec(rail[2])[0]);
    const off = Math.max(...STEPS.map(t => Math.abs(spot(def, t, 'g')[0] - x)));
    if (off > 6)
      bad.push(n + ': la barra se aparta ' + Math.round(off) + ' px de la guía');
  }
  assert.ok(seen >= 12, 'ejercicios en Smith: ' + seen);
  fails(bad, 'barras fuera de su guía');
});

test('las palancas de las máquinas no se estiran', () => {
  // una pieza gruesa que une un punto fijo con el puño o con una parte del cuerpo es una palanca o una barra rígida: mide
  // lo mismo en todo el gesto (los cables y las gomas, más finos, sí cambian de largo)
  const bad = [];
  let seen = 0;
  for (const { n, def } of FIGURES) {
    if (def.v != 'S')
      continue;
    for (const p of def.props) {
      if (p[0] != 'link' || p[4] < 3.5)
        continue;
      seen++;
      const len = STEPS.map(t => {
        const [a, b] = [p[2], p[3]].map(e => Array.isArray(e) && e.length == 2 ? e : spot(def, t, e));
        return Math.hypot(a[0] - b[0], a[1] - b[1]);
      });
      if (Math.max(...len) / Math.min(...len) > 1.08)
        bad.push(n + ': de ' + Math.round(Math.min(...len)) + ' a ' + Math.round(Math.max(...len)) + ' px');
    }
  }
  assert.ok(seen >= 30, 'palancas: ' + seen);
  fails(bad, 'palancas que cambian de largo');
});

test('el puño en el extremo de una palanca va por su arco', () => {
  // con gl el gesto reparte el ángulo de la palanca, no la posición del puño: a medio camino sigue a su distancia del eje
  const def = { v: 'S', a: { lean: 0, hip: 0, knee: 0, gl: [160, 20, 120, 150] }, b: { gl: [160, 20, 120, 100] }, props: [] };
  for (const t of STEPS) {
    const g = spot(def, t, 'g');
    near(Math.hypot(g[0] - 160, g[1] - 20), 120, .01, 'la distancia al eje en t=' + t);
  }
  const mid = spot(def, .5, 'g');
  near(mid[0], 160 + 120 * Math.cos(125 * Math.PI / 180), .01, 'a medio camino, en x');
  near(mid[1], 20 + 120 * Math.sin(125 * Math.PI / 180), .01, 'a medio camino, en y');
});

test('de pie, el peso cae sobre los pies', () => {
  // quien se inclina hacia delante con una barra echa la cadera atrás: si no, se cae. Con unas masas aproximadas de cada
  // parte del cuerpo y de lo que lleva en las manos, el centro de gravedad no sale del apoyo de los pies (del talón a la
  // punta) en ninguna figura que se sostenga solo sobre ellos
  const SUPPORTED = ['burpee', 'pushup', 'plank', 'crawl', 'inchworm', 'trxCurl', 'boxJump', 'sideJump', 'jumpRope', 'run', 'sled', 'carry', 'gait', 'tire', 'kbell', 'medBall', 'oly', 'wallBall', 'ropes', 'boxing', 'muscleUp', 'handstand'];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const bad = [];
  let seen = 0;
  for (const { spec, n, def } of FIGURES) {
    const words = spec.split(' ');
    const a = def.a;
    if (def.v != 'S' || SUPPORTED.includes(words[0]) || /\b(jump|trx|inverted|rings|deficit)\b/.test(spec))
      continue;
    // se apoya en algo más que los pies: sentado, tumbado, colgado, con una mano en el suelo o en un banco, o en una máquina
    if ((a.at && !['ankle', 'toe', 'grip'].includes(a.at)) || (a.at == 'grip' && !a.foot) || a.palm || (a.far && a.far.palm) || def.props.some(p => (p[0] == 'R' && p[4] > 40) || p[0] == 'S'))
      continue;
    seen++;
    const bar = def.props.find(p => p[0] == 'bar');
    const load = bar ? (bar[2] >= 26 ? .6 : .15) : def.props.some(p => ['db', 'kb', 'disc', 'ball', 'bag'].includes(p[0])) ? .2 : 0;
    let worst = 0;
    // los pies que pisan el suelo en un momento del gesto
    const standing = t => ['', 'x'].map(x => [spot(def, t, [x + 'FT', 78, 401]), spot(def, t, [x + 'FT', 128, 401.5])]).filter(f => Math.max(f[0][1], f[1][1]) > 392);
    const least = Math.min(standing(0).length, standing(1).length);
    for (const t of [0, .25, .5, .75, 1]) {
      const at = s => spot(def, t, s);
      const hip = at(['PV', 99, 196]);
      const waist = at(['PV', 96, 152]);
      const sh = at(['UA', 99, 82]);
      const parts = [[.08, at(['HD', 100, 30])], [.35, mid(sh, waist)], [.12, mid(waist, hip)]];
      for (const x of ['', 'x']) {
        const knee = at([x + 'TH', 101, 297]);
        const el = at([x + 'UA', 99, 150]);
        const g = at(x ? 'G' : 'g');
        parts.push([.1, mid(hip, knee)], [.06, mid(knee, at([x + 'SH', 97, 385]))], [.03, mid(sh, el)], [.02, mid(el, g)], [load / 2, g]);
      }
      const cg = parts.reduce((s, q) => s + q[0] * q[1][0], 0) / parts.reduce((s, q) => s + q[0], 0);
      // con un pie en el aire a mitad de un paso no hay equilibrio que mirar: se está cayendo hacia el pie que va a pisar
      const feet = standing(t);
      if (!feet.length || feet.length < least)
        continue;
      const lo = Math.min(...feet.map(f => Math.min(f[0][0], f[1][0])));
      const hi = Math.max(...feet.map(f => Math.max(f[0][0], f[1][0])));
      worst = Math.max(worst, cg - hi, lo - cg);
    }
    if (worst > 12)
      bad.push(n + ': el centro de gravedad queda ' + Math.round(worst) + ' px fuera de los pies');
  }
  assert.ok(seen >= 80, 'figuras de pie: ' + seen);
  fails(bad, 'figuras que se caerían');
});

test('la barra no atraviesa la cabeza ni las piernas', () => {
  // la barra es recta: si su centro (los puños) pasa por dentro de la cabeza, de un muslo o de una espinilla, los atraviesa.
  // En un peso muerto roza las espinillas y en un jerk pasa pegada a la cara: de ahí el margen
  const toSegment = (p, a, b) => {
    const d = [b[0] - a[0], b[1] - a[1]];
    const k = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1] || 1)));
    return Math.hypot(p[0] - a[0] - d[0] * k, p[1] - a[1] - d[1] * k);
  };
  const bad = [];
  let seen = 0;
  for (const { n, def } of FIGURES) {
    if (def.v != 'S' || !def.props.some(p => p[0] == 'bar'))
      continue;
    seen++;
    let worst = null;
    for (const t of STEPS) {
      const at = s => spot(def, t, s);
      const g = at('g');
      const head = at(['HD', 100, 34]);
      const parts = [['la cabeza', Math.hypot(g[0] - head[0], g[1] - head[1]), 20, 7]];
      for (const x of ['', 'x'])
        parts.push(['un muslo', toSegment(g, at(['PV', 99, 206]), at([x + 'TH', 101, 287])), 11, 6], ['una espinilla', toSegment(g, at([x + 'SH', 101, 300]), at([x + 'SH', 97, 380])), 8, 6]);
      for (const [what, d, r, slack] of parts)
        if (r - d > slack && (!worst || r - d > worst[0]))
          worst = [r - d, what, t];
    }
    if (worst)
      bad.push(n + ': la barra pasa ' + Math.round(worst[0]) + ' px por dentro de ' + worst[1] + ' en t=' + worst[2]);
  }
  assert.ok(seen >= 50, 'ejercicios con barra: ' + seen);
  fails(bad, 'barras que atraviesan el cuerpo');
});

test('peso muerto: la barra sube pegada a las piernas y las rodillas no se doblan dos veces', () => {
  for (const n of ['Peso muerto', 'Peso muerto rumano', 'Peso muerto con piernas rígidas']) {
    const def = figPose(n);
    const xs = STEPS.map(t => spot(def, t, 'g')[0]);
    assert.ok(Math.max(...xs) - Math.min(...xs) < 20, n + ': la barra se mueve de lado ' + Math.round(Math.max(...xs) - Math.min(...xs)) + ' px');
    // y va por delante del tobillo, sobre el pie, no por delante de la punta
    assert.ok(Math.min(...xs) > 97 && Math.max(...xs) < 140, n + ': la barra, de ' + Math.round(Math.min(...xs)) + ' a ' + Math.round(Math.max(...xs)));
  }
  // del suelo arriba, la cadera no deja de subir: si bajara a medio camino, las rodillas se doblarían para volver a estirarse
  const hips = STEPS.map(t => spot(figPose('Peso muerto'), t, ['PV', 99, 196])[1]);
  hips.forEach((y, i) => assert.ok(!i || y <= hips[i - 1] + .5, 'la cadera baja en t=' + STEPS[i]));
});

test('zancada: el pie que da el paso va por el aire y el otro no se mueve', () => {
  // [ejercicio, el pie que da el paso, el que se queda]
  for (const [n, step, stay] of [['Zancada caminando', '', 'x'], ['Zancada atrás', 'x', '']]) {
    const def = figPose(n);
    const sole = (t, x) => Math.max(spot(def, t, [x + 'FT', 78, 401])[1], spot(def, t, [x + 'FT', 128, 401.5])[1]);
    // (el lado de atrás se dibuja unos píxeles más arriba)
    assert.ok(sole(.5, step) < 392, n + ': a medio paso el pie sigue en el suelo (' + Math.round(sole(.5, step)) + ')');
    assert.ok(sole(0, step) > 396 && sole(1, step) > 396, n + ': el pie del paso empieza y acaba en el suelo');
    const toe = STEPS.map(t => spot(def, t, [stay + 'FT', 128, 401.5]));
    for (const q of toe)
      near(q[0], toe[0][0], 6, n + ': la punta del pie que se queda, en x');
  }
});

test('dominadas: el cuerpo sube recto', () => {
  const def = figPose('Dominadas');
  const hip = STEPS.map(t => spot(def, t, ['PV', 99, 196]));
  const [a, b] = [hip[0], hip[hip.length - 1]];
  hip.forEach((q, i) => near(q[0], a[0] + (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]), 4, 'la cadera se aparta de la recta en t=' + STEPS[i]));
  // y el codo va por delante, no por detrás de la espalda
  assert.ok(spot(def, .5, ['UA', 99, 150])[0] > spot(def, .5, ['UA', 99, 82])[0], 'el codo queda detrás del hombro');
});

test('colgado de la barra: el poste queda lejos del cuerpo, también si las piernas se balancean hacia atrás', () => {
  // la barra va como una de pared: el poste, detrás; antes bajaba pegado a la espalda y parecía que el cuerpo se deslizaba
  // por él
  for (const n of ['Dominadas', 'Dominadas lastradas', 'Pull-ups kipping', 'Toes to bar', 'Elevación de piernas colgado', 'Bar muscle-up']) {
    const def = figPose(n);
    const post = def.props.map(p => p[0] == 'L' && /^M(-?[\d.]+) -?[\d.]+L(-?[\d.]+) 398$/.exec(p[2])).find(m => m && m[1] == m[2]);
    assert.ok(post, n + ': el poste de la barra');
    let back = 1e9;
    for (let i = 0; i <= 40 * (def.cycle ? 2 : 1); i++)
      for (const [k, q, m] of R.framePoints(def, i / 40))
        if (/^(head|body|x?arm|x?leg)$/.test(k))
          back = Math.min(back, q[0] - m);
    assert.ok(back - Number(post[1]) > 12, n + ': el poste, a ' + Math.round(back - Number(post[1])) + ' del cuerpo');
  }
});

test('correr: erguido y apoyando el pie en el suelo a media zancada, no agachado como en una zancada', () => {
  for (const n of ['Carrera continua', 'Cuestas', 'Trote en cinta']) {
    const def = figPose(n);
    // el pie que apoya (talón o punta), en el suelo
    near(Math.max(spot(def, .5, ['FT', 83, 402])[1], spot(def, .5, ['FT', 137, 402])[1]), 402, 1.5, n + ': el pie que apoya');
    // la cadera, poco más baja que de pie (199): antes iba a 218, con la rodilla de delante muy doblada
    for (const t of [0, .5, 1])
      assert.ok(spot(def, t, ['PV', 99, 196])[1] <= 215, n + ': la cadera, baja en t=' + t);
    // y la rodilla que apoya, doblada lo justo para amortiguar
    const o = layersAt(def, .5);
    assert.ok(Math.abs(norm(placed(o.SH)[2] - placed(o.TH)[2])) <= 40, n + ': la rodilla que apoya, muy doblada');
  }
});

test('comba: la cuerda se ve como un lazo, con sus dos cabos, no como un látigo', () => {
  for (const n of ['Comba', 'Double unders', 'Comba boxeo']) {
    const rope = figPose(n).props.find(p => p[0] == 'by' && p[4]);
    assert.equal((rope[3][2].match(/Q/g) || []).length, 2, n + ': los dos cabos');
  }
});

test('un ciclo no tiene costuras: acaba como empieza, con los lados cambiados', () => {
  // correr, pedalear o subir peldaños es el mismo medio gesto dos veces, la segunda con los lados cambiados (de 1 a 2): el
  // cuerpo no puede dar un salto ni al pasar de una mitad a otra ni al volver a empezar
  const bad = [];
  let seen = 0;
  const body = def => R.rigLayers(def, 0).map(l => l.k).filter(k => !/^p\d/.test(k));
  for (const { n, def } of FIGURES) {
    if (!def.cycle)
      continue;
    seen++;
    if (def.v != 'S')
      bad.push(n + ': un ciclo va de perfil');
    for (const [before, after] of [[1 - 1e-6, 1], [2 - 1e-6, 0]]) {
      const [p, q] = [layersAt(def, before), layersAt(def, after)];
      for (const k of body(def)) {
        const [a, b] = [placed(p[k]), placed(q[k])];
        if (a && b && (Math.hypot(a[0] - b[0], a[1] - b[1]) > .5 || Math.abs(norm(a[2] - b[2])) > .5))
          bad.push(n + ': ' + k + ' salta al pasar por t=' + after);
      }
    }
    // y la segunda mitad es la primera con los lados cambiados: la pierna de delante hace lo que hizo la de atrás (que
    // se dibuja unos píxeles desplazada)
    for (const t of [.2, .5, .8]) {
      const [a, b] = [spot(def, t, ['xSH', 97, 385]), spot(def, t + 1, ['SH', 97, 385])];
      near(Math.hypot(a[0] - 3 - b[0], a[1] + 3.5 - b[1]), 0, .01, n + ': el tobillo en t=' + (t + 1));
    }
  }
  assert.ok(seen >= 20, 'ciclos: ' + seen);
  fails(bad, 'ciclos con costuras');
  // y al acabar la segunda mitad vuelve a empezar: el momento 2 es el 0 (no un medio gesto hacia atrás)
  for (const n of ['Carrera 1 km', 'Bicicleta', 'Comba'])
    assert.deepEqual(R.rigPose(figPose(n), 2), R.rigPose(figPose(n), 0), n + ': el momento 2');
});

test('escaladora: los peldaños bajan con el pie que apoya y el otro pisa el que llega', () => {
  const def = figPose('Escaladora');
  const slide = def.props.find(p => p[0] == 'slide');
  assert.ok(slide, 'los peldaños no se deslizan');
  // el pie que apoya se mueve lo mismo que los peldaños, así que no resbala sobre el suyo
  const from = spot(def, 0, ['SH', 97, 385]);
  for (const t of [.25, .5, .75, .999]) {
    const at = spot(def, t, ['SH', 97, 385]);
    near(at[0], from[0] + slide[2][0] * t, .01, 'el pie que apoya, en x, en t=' + t);
    near(at[1], from[1] + slide[2][1] * t, .01, 'el pie que apoya, en y, en t=' + t);
  }
  // el otro acaba donde empezó el primero, un peldaño entero más arriba que donde estaba, y a medio camino va por el aire
  const [start, mid, end] = [0, .5, .999].map(t => spot(def, t, ['xSH', 97, 385]));
  near(end[0], from[0] + 3, .2, 'el pie que sube acaba en x');
  near(end[1], from[1] - 3.5, .2, 'el pie que sube acaba en y');
  assert.ok(mid[1] < Math.min(start[1], end[1]) - 15, 'el pie que sube no se levanta: ' + mid.map(Math.round));
});

test('remo en ergómetro: primero las piernas, después el tronco y al final los brazos; el asiento va con la cadera', () => {
  const def = figPose('Remo 1000 m');
  assert.ok(def.flow && def.m && def.via, 'la palada es un gesto seguido, con su orden');
  const hip = t => spot(def, t, ['PV', 99, 196]);
  const reach = t => {
    const [g, s] = [spot(def, t, 'g'), spot(def, t, ['TX', 99, 82])];
    return Math.hypot(g[0] - s[0], g[1] - s[1]);
  };
  const lean = t => R.rigPose(def, t).lean;
  // a media palada las piernas ya han hecho casi todo su recorrido, con los brazos tan estirados como al empezar y el
  // tronco aún sin echarse atrás
  const travel = hip(0)[0] - hip(1)[0];
  assert.ok(travel > 50, 'el asiento se mueve: ' + travel);
  assert.ok(hip(0)[0] - hip(.5)[0] > travel * .8, 'las piernas, a media palada');
  near(reach(.5), reach(0), .5, 'los brazos, a media palada');
  assert.ok(lean(0) > 10 && lean(.5) > -5, 'el tronco, al empezar y a media palada: ' + lean(0) + ', ' + lean(.5));
  // al final, el tronco se ha echado atrás y el asa ha llegado al abdomen
  assert.ok(lean(1) < -15 && reach(1) < reach(0) * .6, 'el final: ' + lean(1) + ', ' + reach(1));
  // el asa pasa por encima de las rodillas, no a través de ellas
  let over = 0;
  for (const t of STEPS) {
    const [g, k] = [spot(def, t, 'g'), spot(def, t, ['TH', 101, 297])];
    if (Math.abs(g[0] - k[0]) > 30)
      continue;
    over++;
    assert.ok(g[1] < k[1] - 15, 'el asa y la rodilla en t=' + t + ': ' + g.map(Math.round) + ' · ' + k.map(Math.round));
  }
  assert.ok(over, 'el asa no pasa por las rodillas');
  // el asiento: una pieza que va con la cadera (by), sin girar con ella y siempre a la misma altura, sobre su guía
  const i = def.props.findIndex(p => p[0] == 'by');
  assert.ok(i >= 0, 'el asiento va con la cadera');
  for (const t of [0, .3, .7, 1]) {
    const m = /^translate\(([-\d.]+) ([-\d.]+)\)$/.exec(layersAt(def, t)['p' + i]);
    assert.ok(m, 'el asiento no gira: ' + layersAt(def, t)['p' + i]);
    near(Number(m[1]), hip(t)[0], .1, 'el asiento, en x, en t=' + t);
    near(Number(m[2]), hip(0)[1], .1, 'el asiento, en y, en t=' + t);
  }
});

test('SkiErg: las asas bajan por delante del cuerpo, separadas de él, y acaban junto a las caderas', () => {
  const def = figPose('SkiErg 1000 m');
  assert.ok(def.flow && def.m && def.via, 'la bajada es un gesto seguido, con su camino');
  const [start, mid, end] = [0, .5, 1].map(t => spot(def, t, 'g'));
  assert.ok(start[1] < spot(def, 0, ['HD', 100, 4])[1] - 10, 'empieza con las manos por encima de la cabeza: ' + start.map(Math.round));
  const shoulder = spot(def, .5, ['TX', 99, 82]);
  assert.ok(mid[0] - shoulder[0] > 60, 'a media bajada, las manos van por delante del pecho: ' + mid.map(Math.round) + ' · ' + shoulder.map(Math.round));
  const hip = spot(def, 1, ['PV', 99, 196]);
  assert.ok(Math.hypot(end[0] - hip[0], end[1] - hip[1]) < 30, 'acaban junto a la cadera: ' + end.map(Math.round) + ' · ' + hip.map(Math.round));
  // y el cuerpo se dobla para tirar: el tronco se inclina y las rodillas ceden
  const [p0, p1] = [R.rigPose(def, 0), R.rigPose(def, 1)];
  assert.ok(p1.lean - p0.lean > 30 && p1.knee - p0.knee > 15, 'el cuerpo acompaña');
});

test('saco de boxeo: los pies no se mueven del suelo y cada puño llega al saco desde la guardia', () => {
  const def = figPose('Saco de boxeo');
  assert.ok(def.flow && def.m && !def.via, 'tres tiempos: guardia, directo y cruzado');
  // la cara del saco que da al boxeador
  const bag = def.props.find(p => p[0] == 'R');
  const face = bag[2] - bag[4] / 2;
  // el pie de delante (el del lado de atrás de la imagen), plano; el de atrás, sobre su punta, que no se mueve del suelo
  const toe = spot(def, 0, ['FT', 128, 401.5]);
  near(toe[1], 401.5, .1, 'la punta del pie de atrás, en el suelo');
  for (const t of STEPS) {
    near(spot(def, t, ['xFT', 97, 402])[1], 398.5, .6, 'la suela del pie de delante en t=' + t);
    const now = spot(def, t, ['FT', 128, 401.5]);
    assert.ok(Math.hypot(now[0] - toe[0], now[1] - toe[1]) < 1.5, 'la punta del pie de atrás se mueve en t=' + t + ': ' + now);
  }
  // el talón de atrás se levanta más al cruzar: el pie gira sobre su punta
  assert.ok(R.rigPose(def, 1).ft > R.rigPose(def, 0).ft + 15, 'el talón de atrás');
  // qué puño está en la guardia (junto a la cara) y cuál llega al saco, a la altura del hombro, en cada tiempo
  const FIST = 9;
  const guards = (t, s) => {
    const [g, head] = [spot(def, t, s), spot(def, t, ['HD', 103, 27])];
    assert.ok(Math.hypot(g[0] - head[0], g[1] - head[1]) < 50, 'en t=' + t + ', el puño ' + s + ' no está en la guardia: ' + g.map(Math.round));
  };
  const lands = (t, s, what) => {
    const [g, shoulder] = [spot(def, t, s), spot(def, t, ['TX', 99, 82])];
    assert.ok(g[0] + FIST >= face && g[0] + FIST <= face + 12, what + ' no llega al saco (o lo atraviesa): ' + g.map(Math.round) + ', el saco en ' + face);
    assert.ok(Math.abs(g[1] - shoulder[1]) < 12, what + ' no va a la altura del hombro: ' + g.map(Math.round) + ' · ' + shoulder.map(Math.round));
  };
  guards(0, 'g');
  guards(0, 'G');
  lands(.5, 'G', 'el directo');
  guards(.5, 'g');
  lands(1, 'g', 'el cruzado');
  guards(1, 'G');
});

test('bici de aire: cada mano va y viene con su palanca, al revés que la otra, y tira mientras su pierna empuja', () => {
  const def = figPose('Assault bike calorías');
  assert.ok(def.cycle, 'pedalear es un ciclo');
  const [g0, g1] = [spot(def, 0, 'g'), spot(def, 1, 'g')];
  const [G0, G1] = [spot(def, 0, 'G'), spot(def, 1, 'G')];
  // las manos recorren un buen tramo, y la de atrás hace lo mismo medio ciclo después (se dibuja 3 px desplazada)
  assert.ok(g0[0] - g1[0] > 70, 'la mano de delante va y viene: ' + Math.round(g0[0] - g1[0]));
  near(G0[0] - 3, g1[0], .5, 'la mano de atrás, al empezar');
  near(G1[0] - 3, g0[0], .5, 'la mano de atrás, a medio ciclo');
  // el pie de ese lado baja de lo alto a lo bajo del pedal mientras su mano viene hacia el cuerpo
  const [f0, f1] = [spot(def, 0, ['SH', 97, 385]), spot(def, 1, ['SH', 97, 385])];
  assert.ok(f1[1] - f0[1] > 40, 'el pie de delante baja: ' + Math.round(f1[1] - f0[1]));
  // y cada puño va por el arco de su palanca: siempre a la misma distancia de su eje
  const lever = def.a.gl;
  for (let i = 0; i < 40; i++) {
    const g = spot(def, i / 20, 'g');
    near(Math.hypot(g[0] - lever[0], g[1] - lever[1]), lever[2], .6, 'la distancia del puño al eje en t=' + i / 20);
  }
});

test('comba: el salto es un bote y la cuerda pasa bajo los pies cuando están en el aire', () => {
  for (const [name, turns, passes] of [['Comba', 1, [.5]], ['Double unders', 2, [.25, .75]]]) {
    const def = figPose(name);
    assert.ok(def.cycle && def.hop && def.m && def.via, name + ': un salto tras otro');
    const height = t => 385 - spot(def, t, ['SH', 97, 385])[1];
    const top = height(.5);
    assert.ok(top > 20, name + ': salta ' + top);
    near(height(0), 0, .01, name + ': empieza en el suelo');
    near(height(1), 0, .01, name + ': acaba en el suelo');
    // sube frenando y baja acelerando, como cae un cuerpo: a un cuarto del tiempo ya lleva tres cuartos de la altura
    near(height(.25), top * .75, .01, name + ': a media subida');
    near(height(.75), top * .75, .01, name + ': a media bajada');
    // la cuerda: una pieza que gira sobre el puño, tantas vueltas por salto, y que empieza en lo alto
    const i = def.props.findIndex(p => p[0] == 'by' && p[4]);
    assert.ok(i >= 0, name + ': la cuerda gira');
    assert.deepEqual(def.props[i][4], [turns, -90], name + ': las vueltas');
    const reach = Number(/ (\d+) 0$/.exec(def.props[i][3][2])[1]);
    const rope = t => {
      const m = /^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)$/.exec(layersAt(def, t)['p' + i]);
      assert.ok(m, name + ': la capa de la cuerda en t=' + t);
      const a = Number(m[3]) * Math.PI / 180;
      return { hand: [Number(m[1]), Number(m[2])], tip: [Number(m[1]) + reach * Math.cos(a), Number(m[2]) + reach * Math.sin(a)] };
    };
    for (const t of [0, .3, .8, 1.4]) {
      const g = spot(def, t, 'g');
      near(rope(t).hand[0], g[0], .1, name + ': la cuerda sale del puño, en x, en t=' + t);
      near(rope(t).hand[1], g[1], .1, name + ': la cuerda sale del puño, en y, en t=' + t);
    }
    // con los pies en el suelo pasa por encima de la cabeza
    const crown = spot(def, 0, ['HD', 100, 4]);
    assert.ok(rope(0).tip[1] < crown[1] - 20, name + ': la cuerda, sobre la cabeza: ' + Math.round(rope(0).tip[1]) + ' · ' + Math.round(crown[1]));
    // y bajo ellos, rozando el suelo, cuando están en el aire
    for (const t of passes) {
      const tip = rope(t).tip;
      const toe = spot(def, t, ['FT', 137, 402]);
      near(tip[1], 402, 1.5, name + ': la cuerda roza el suelo en t=' + t);
      assert.ok(toe[1] < tip[1] - 8, name + ': los pies no están en el aire en t=' + t + ': ' + Math.round(toe[1]));
      assert.ok(Math.abs(tip[0] - toe[0]) < 30, name + ': la cuerda no pasa bajo los pies en t=' + t + ': ' + Math.round(tip[0]) + ' · ' + Math.round(toe[0]));
    }
    // nunca se mete en el suelo, y en la segunda mitad del ciclo (el salto siguiente) hace lo mismo
    for (let j = 0; j < 200; j++)
      assert.ok(rope(j / 100).tip[1] < 402 + 1.5, name + ': la cuerda se mete en el suelo en t=' + j / 100);
    near(rope(1.5).tip[1], rope(.5).tip[1], .3, name + ': el salto siguiente');
  }
});

test('comba de boxeo: un pie y después el otro, y la cuerda pasa cuando los dos están en el aire', () => {
  const def = figPose('Comba boxeo');
  assert.ok(def.cycle && def.hop, 'un paso tras otro');
  const sole = (t, x) => spot(def, t, [x + 'FT', 97, 402])[1];
  // al empezar apoya el pie de delante y el otro está recogido; medio ciclo después, al revés (el de atrás se dibuja 3,5 px
  // más arriba); y en lo más alto de cada paso, los dos en el aire
  near(sole(0, ''), 402, .1, 'el pie que apoya al empezar');
  assert.ok(sole(0, 'x') < 380, 'el otro pie, recogido: ' + sole(0, 'x'));
  near(sole(1, 'x'), 398.5, .1, 'el pie que apoya medio ciclo después');
  assert.ok(sole(1, '') < 380, 'el primero, recogido: ' + sole(1, ''));
  for (const t of [.5, 1.5])
    assert.ok(sole(t, '') < 392 && sole(t, 'x') < 392, 'los dos pies en el aire en t=' + t + ': ' + sole(t, '') + ', ' + sole(t, 'x'));
  // el cuerpo bota: sube frenando y baja acelerando
  const hip = t => spot(def, t, ['PV', 99, 196])[1];
  near(hip(0) - hip(.25), (hip(0) - hip(.5)) * .75, .01, 'la cadera, a media subida');
  near(hip(1), hip(0), .01, 'la cadera, al caer');
  // y la cuerda roza el suelo en lo más alto, por debajo de las dos puntas de los pies
  const i = def.props.findIndex(p => p[0] == 'by' && p[4]);
  const reach = Number(/ (\d+) 0$/.exec(def.props[i][3][2])[1]);
  const m = /^translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)$/.exec(layersAt(def, .5)['p' + i]);
  near(Number(m[3]), 90, .1, 'la cuerda, hacia abajo en lo más alto');
  near(Number(m[2]) + reach, 402, 1.5, 'la cuerda roza el suelo');
  for (const x of ['', 'x'])
    assert.ok(spot(def, .5, [x + 'FT', 137, 402])[1] < 402 - 8, 'la punta del pie, por encima de la cuerda');
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
