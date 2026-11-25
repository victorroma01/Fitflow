#!/usr/bin/env node
/* StrataFit · los encuadres de las figuras 3D, ya calculados (src/js/data/figboxes.js).
   Encuadrar una figura es dibujarla en varios momentos del gesto y medir lo que ocupa: trece dibujos para la figura grande,
   unos 50 ms en un ordenador y cuatro veces más en un móvil, justo al abrir la hoja «Cómo se hace». Como el resultado solo
   depende del motor y de los datos de cada ejercicio, se calcula aquí, una vez, con el motor tal como va en la app, y la app
   lo lee hecho. De cada ejercicio con figura:
     · el recuadro del gesto entero (trece momentos), para la figura grande que se mueve;
     · el momento de la miniatura y su recuadro;
     · los momentos de la figura grande quieta («Reducir animaciones») y su recuadro.
   Los momentos quietos de un gesto de ida y vuelta son su final (la miniatura) y su inicio y su final (quieta). En un gesto
   con su propio reloj (un ciclo, uno que alterna los lados, una secuencia) se miran 24 posturas y se toman las más distintas
   entre sí, hasta tres y por orden: el principio, la más lejos de él (la de la miniatura: el otro paso al correr, el brazo
   arriba en un curl alterno, la barra arriba en un clean & jerk) y, si la hay, otra bien lejos de las dos; si casi no se
   mueve (una plancha), una sola. La familia puede decir el momento de su miniatura (still).
   El archivo lleva la huella de lo que decide cómo se ve una figura (el motor, los datos de los ejercicios, el mapa muscular,
   lo que la dibuja en la app y esta herramienta): si algo de eso cambia, deja de estar al día. La misma huella va aparte, en
   src/js/data/figstamp.js, que la app lleva desde el arranque: con ella sabe si las miniaturas que guardó siguen valiendo.
   Uso:  node tools/figboxes.js          (calcula y escribe src/js/data/figboxes.js y figstamp.js; unos 45 s)
         node tools/figboxes.js --check  (falla si no están al día: solo compara la huella)
   Lo usan también las pruebas (tests/fig3d.test.mjs): engine() y boxesOf(). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { ROOT, JS } = require('./modules');
const FIG3D = path.join(ROOT, 'src', 'fig3d');
const OUT = path.join(JS, 'data', 'figboxes.js');
const OUT_STAMP = path.join(JS, 'data', 'figstamp.js');
const read = f => fs.readFileSync(f, 'utf8');
// los archivos del motor, en su orden: la lista de build.py
const files = () => [...read(path.join(ROOT, 'build.py')).match(/^FIG3D_FILES = \(([^)]*)\)$/m)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
// lo que decide cómo se ve una figura
const INPUT_MODULES = ['data/anatomy.js', 'data/figposes.js', 'data/library.js', 'extras/anatomy.js', 'extras/figure3d.js'];
const INPUTS = () => files().map(f => path.join(FIG3D, f)).concat(INPUT_MODULES.map(f => path.join(JS, f)), [__filename]);
const stamp = () => {
  const h = crypto.createHash('sha256');
  for (const f of INPUTS()) h.update(path.relative(ROOT, f) + '\n' + read(f) + '\n');
  return h.digest('hex').slice(0, 20);
};
// un módulo de datos de la app (sin dependencias): sus exportaciones
const data = (f, names) => Function(read(path.join(JS, f)).replace(/^export /gm, '') + '\nreturn { ' + names.join(', ') + ' };')();

/** El motor como lo compone build.py para la app (motor3d_js: cada archivo con su G en vez de window, en modo estricto), con
    el mapa muscular y las regiones de la app, y cada ejercicio con figura hecho con sus músculos de la librería. */
const engine = () => {
  const { AN_R, AN_S, AN_H, AN_PA } = data('data/anatomy.js', ['AN_R', 'AN_S', 'AN_H', 'AN_PA']);
  const { FIG_POSES } = data('data/figposes.js', ['FIG_POSES']);
  const { EXERCISES } = data('data/library.js', ['EXERCISES']);
  const REG = Function('return ' + read(path.join(JS, 'extras', 'anatomy.js')).match(/^export const MUSCLE_REGIONS = (\{.*\});$/m)[1])();
  const END = '})(window);';
  const body = files().map(f => {
    const t = read(path.join(FIG3D, f)).trimEnd();
    if (!t.endsWith(END)) throw new Error(f + ' no acaba en ' + END);
    return t.slice(0, -END.length) + '})(G);';
  }).join('\n');
  const F3 = Function('FIG_MAP', 'FIG_REG', '"use strict";\nconst G = { FIG_MAP, FIG_REG };\n' + body + '\nreturn G.Fig3D;')({ R: AN_R, S: AN_S, H: AN_H, PA: AN_PA }, REG);
  const LIB = new Map(EXERCISES.map(e => [e.n, e]));
  const make = n => F3.make(n, FIG_POSES[n], LIB.get(n) ? LIB.get(n).p || [] : [], LIB.get(n) ? LIB.get(n).s || [] : []);
  return { F3, FIG_POSES, LIB, NAMES: Object.keys(FIG_POSES), make };
};

/* los momentos con que se encuadra el gesto entero */
const MOMENTS = Array.from({ length: 13 }, (_, i) => i / 12);
/** Los momentos quietos de un gesto: { thumb, stills } (ver arriba). */
const momentsOf = (F3, ex) => {
  let out;
  if (!ex.beat) out = { thumb: 1, stills: [0, 1] };
  else {
    const ts = Array.from({ length: 24 }, (_, i) => i / 24);
    /* cada postura, por sus rodillas, tobillos, codos y muñecas */
    const pts = ts.map(t => { const { J } = F3.pose(ex.at(t)); return [J.L.knee, J.R.knee, J.L.ankle, J.R.ankle, J.L.el, J.R.el, J.L.wr, J.R.wr]; });
    const dist = (a, b) => Math.max(...pts[a].map((p, k) => Math.hypot(p[0] - pts[b][k][0], p[1] - pts[b][k][1], p[2] - pts[b][k][2])));
    const pick = [0];
    /* la postura más lejos de las que ya hay, y cuánto */
    const farthest = () => {
      let best = -1, at = 0;
      ts.forEach((_, i) => { const m = Math.min(...pick.map(j => dist(i, j))); if (m > best) { best = m; at = i; } });
      return [at, best];
    };
    const [second, spread] = farthest();
    if (spread < 20) out = { thumb: .25, stills: [.25] };
    else {
      pick.push(second);
      const [third, gap] = farthest();
      if (gap > .5 * spread) pick.push(third);
      out = { thumb: ts[second], stills: pick.sort((a, b) => a - b).map(i => ts[i]) };
    }
  }
  if (ex.still != null) out.thumb = ex.still;
  return out;
};
/* un recuadro [x, y, ancho, alto] con sus cuatro lados hacia fuera, en enteros */
const outward = b => { const x = Math.floor(b[0]), y = Math.floor(b[1]); return [x, y, Math.ceil(b[0] + b[2]) - x, Math.ceil(b[1] + b[3]) - y]; };
const round3 = t => Math.round(t * 1000) / 1000;
/** Lo que se guarda de un ejercicio: [gesto ×4, momento de la miniatura, su recuadro ×4, recuadro de las quietas ×4, momentos de
    las quietas…]. */
const boxesOf = (F3, ex) => {
  const cam = F3.camera(ex.yaw, ex.pitch);
  const m = momentsOf(F3, ex);
  const thumb = F3.bounds(F3.draw(ex, m.thumb, cam, 'm', true));
  const gesture = F3.frameBox(ex, cam, MOMENTS);
  const still = F3.frameBox(ex, cam, m.stills);
  if (!thumb || !gesture || !still) throw new Error('figura vacía: ' + ex.name);
  return [...outward(gesture), round3(m.thumb), ...outward(thumb), ...outward(still), ...m.stills.map(round3)];
};

const HEAD = stampOf => `/* ═══ data/figboxes ═══
   Los encuadres de las figuras 3D, ya calculados (tools/figboxes.js: no se edita a mano; se rehace con «node tools/figboxes.js»
   cuando cambian el motor, los ejercicios o el mapa muscular, y la batería comprueba que está al día). Así la app no tiene que
   dibujar cada figura trece veces para saber lo que ocupa. De cada ejercicio: el recuadro [x, y, ancho, alto] del gesto
   entero, el momento de la miniatura y su recuadro, el recuadro de las posturas quietas y los momentos de esas posturas. Va
   con el motor, en lo que se descarga al usarlo (core/lazy).
   Huella de lo calculado: ${stampOf}
   Define: FIG_BOXES
*/
`;
const HEAD_STAMP = `/* ═══ data/figstamp ═══
   La huella de las figuras 3D (tools/figboxes.js: no se edita a mano; se rehace, con los encuadres, con «node
   tools/figboxes.js»): cambia cuando cambia algo de lo que decide cómo se ve una figura. La app guarda con ella las
   miniaturas que dibuja (extras/pictures) y, mientras sea la misma, no las vuelve a dibujar aunque se actualice.
   Define: FIG_STAMP
*/
`;
const found = (f, re) => (re.exec(fs.existsSync(f) ? read(f) : '') || [])[1] || '';
// la huella que llevan los dos archivos: '' si falta alguno o no llevan la misma
const current = () => {
  const a = found(OUT, /^ {3}Huella de lo calculado: (\w+)$/m), b = found(OUT_STAMP, /^export const FIG_STAMP = '(\w+)';$/m);
  return a == b ? a : '';
};

if (require.main === module) {
  const want = stamp();
  if (process.argv.includes('--check')) {
    if (current() !== want) {
      console.error('ERROR: src/js/data/figboxes.js y figstamp.js no están al día con el motor, los ejercicios o lo que dibuja las figuras: node tools/figboxes.js');
      process.exit(1);
    }
    console.log('Encuadres de las figuras al día (' + want + ')');
  }
  else {
    const t0 = Date.now();
    const { F3, NAMES, make } = engine();
    const rows = NAMES.map(n => {
      const ex = make(n);
      if (!ex) throw new Error('sin figura: ' + n);
      return '  ' + JSON.stringify(n) + ': [' + boxesOf(F3, ex).join(', ') + '],';
    });
    fs.writeFileSync(OUT, HEAD(want) + 'export const FIG_BOXES = {\n' + rows.join('\n') + '\n};\n');
    fs.writeFileSync(OUT_STAMP, HEAD_STAMP + "export const FIG_STAMP = '" + want + "';\n");
    console.log('src/js/data/figboxes.js: ' + NAMES.length + ' ejercicios en ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s (' + want + ')');
  }
}
module.exports = { engine, boxesOf, momentsOf, MOMENTS };
