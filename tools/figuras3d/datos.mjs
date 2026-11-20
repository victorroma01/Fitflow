/* ═══ figuras 3D: los datos de la app ═══
   Saca de la app lo que necesitan las figuras y las páginas de revisión, y lo deja en salida/: el mapa de músculos
   (data/anatomy), qué regiones del mapa tiene cada músculo (extras/anatomy) y los ejercicios de un lote, con su familia y
   variantes (data/figposes, más lo que el 3D distingue y la app junta) y sus músculos de la librería (data/library).
   Uso: node datos.mjs [familias separadas por comas] (por omisión, las del lote 1) */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { AN_R, AN_S, AN_H, AN_PA } from '../../src/js/data/anatomy.js';
import { FIG_POSES } from '../../src/js/data/figposes.js';
import { EXERCISES, groupOf } from '../../src/js/data/library.js';

const FAMILIES = (process.argv[2] || 'squat,press,overhead').split(',');
/* lo que el 3D distingue y la tabla de la app junta: la pausa, el agarre, el ángulo del banco, el Arnold, el JM, el hack */
const EXTRA = { 'Sentadilla con pausa': 'pause', 'Sentadilla goblet con pausa': 'pause', 'Hack squat en Smith': 'hack', 'Press banca con pausa': 'pause', 'Press banca agarre ancho': 'wide', 'Press banca agarre neutro mancuernas': 'neutral', 'Press inclinado agarre neutro mancuernas': 'neutral', 'Press inclinado 30° mancuernas': 'thirty', 'Press inclinado con pausa': 'pause', 'Press JM': 'jm', 'Press Arnold': 'arnold', 'Press hombro sentado agarre neutro': 'neutral', 'Press hombro con pausa': 'pause' };

mkdirSync('salida', { recursive: true });
writeFileSync('salida/mapa.json', JSON.stringify({ R: AN_R, S: AN_S, H: AN_H, PA: AN_PA }));
const src = readFileSync('../../src/js/extras/anatomy.js', 'utf8');
const m = src.match(/^const MUSCLE_REGIONS = (\{.*\});$/m);
if (!m) throw new Error('no encuentro MUSCLE_REGIONS en extras/anatomy');
writeFileSync('salida/regiones.txt', m[1]);
const by = new Map(EXERCISES.map(e => [e.n, e]));
const lote = [];
for (const [n, w] of Object.entries(FIG_POSES)) {
  if (!FAMILIES.includes(w.split(' ')[0])) continue;
  const e = by.get(n);
  if (!e) throw new Error('no está en la librería: ' + n);
  lote.push({ n, w: w + (EXTRA[n] ? ' ' + EXTRA[n] : ''), p: e.p || [], s: e.s || [], g: groupOf(e) });
}
writeFileSync('salida/lote.json', JSON.stringify(lote));
console.log(lote.length, 'ejercicios de', FAMILIES.join(', '));
