/* ═══ figuras 3D: los datos de la app ═══
   Saca de la app lo que necesitan las figuras y las páginas de revisión, y lo deja en salida/: el mapa de músculos
   (data/anatomy), qué regiones del mapa tiene cada músculo (extras/anatomy) y los ejercicios de un lote, con su familia y
   variantes (data/figposes, más lo que el 3D distingue y la app junta) y sus músculos de la librería (data/library).
   Uso: node datos.mjs [familias separadas por comas] (por omisión, las del lote 1) */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { AN_R, AN_S, AN_H, AN_PA } from '../../src/js/data/anatomy.js';
import { FIG_POSES } from '../../src/js/data/figposes.js';
import { EXERCISES, groupOf } from '../../src/js/data/library.js';

/* los lotes: sus familias */
const LOTES = { 1: 'squat,press,overhead', 2: 'pulldown,row,pullup', 3: 'hinge,lunge,thrust,legPress,hack,legExt,legCurl',
  4: 'curl,trxCurl,pushdown,skull,overheadExt,kickback,tricepsMachine,dip,benchDip,wristCurl' };
/* desde el lote 3, el material de la librería (q) entra como palabra si la tabla de la app no lo dice ya */
const GEAR_FROM = new Set([...LOTES[3].split(','), ...LOTES[4].split(',')]);
const GEAR = { Mancuernas: 'db', Barra: 'bar', 'Barra Z': 'ez', Smith: 'smith', Kettlebell: 'kb', Banda: 'band', Polea: 'cable', 'Máquina': 'machine', 'Peso corporal': 'none' };
const arg = process.argv[2] || '1';
const FAMILIES = (LOTES[arg] || arg).split(',');
/* lo que el 3D distingue y la tabla de la app junta: la pausa, el agarre, el ángulo del banco, el Arnold, el JM, el hack */
const EXTRA = { 'Sentadilla con pausa': 'pause', 'Sentadilla goblet con pausa': 'pause', 'Hack squat en Smith': 'hack', 'Press banca con pausa': 'pause', 'Press banca agarre ancho': 'wide', 'Press banca agarre neutro mancuernas': 'neutral', 'Press inclinado agarre neutro mancuernas': 'neutral', 'Press inclinado 30° mancuernas': 'thirty', 'Press inclinado con pausa': 'pause', 'Press JM': 'jm', 'Press Arnold': 'arnold', 'Press hombro sentado agarre neutro': 'neutral', 'Press hombro con pausa': 'pause',
  'Jalón agarre estrecho': 'close', 'Jalón agarre neutro': 'neutral', 'Jalón agarre supino': 'supine',
  'Remo con barra agarre supino': 'supine', 'Remo en polea agarre neutro': 'neutral', 'Remo unilateral en polea': 'one', 'Remo unilateral en máquina': 'one', 'Remo Meadows': 'meadows', 'Remo Kroc': 'kroc', 'Remo en máquina convergente': 'converge', 'Retracción escapular en polea': 'scap', 'Remo posterior con mancuernas': 'rear', 'TRX remo': 'trx',
  'Dominadas supinas': 'supine', 'Dominadas agarre neutro': 'neutral', 'Dominadas excéntricas': 'eccentric', 'Colgado a una mano': 'one',
  'Peso muerto con barra hexagonal': 'hex', 'Peso muerto con pausa': 'pause', 'Zancada caminando': 'walk', 'Lunges con sandbag 100 m': 'walk',
  'Sentadilla búlgara con énfasis en glúteo': 'glute', 'Hip thrust con pausa': 'pause', 'Prensa con pies juntos': 'narrow', 'Sentadilla Pendulum': 'pendulum',
  'Sentadilla en máquina': 'upright', 'Extensión con pausa': 'pause',
  'Curl con barra agarre ancho': 'wide', 'Curl con barra agarre estrecho': 'close', 'Curl con barra Z agarre cerrado': 'close', 'Curl 21': 'x21',
  'Curl Zottman': 'zottman', 'Curl con mancuernas a 45°': 'deg45', 'Curl con supinación completa': 'supinate', 'Curl martillo cruzado': 'cross',
  'Curl martillo con barra Z': 'hammer', 'Curl en máquina unilateral': 'one', 'Curl inverso': 'reverse', 'Curl inverso en polea': 'reverse',
  'Curl inverso con mancuernas': 'reverse', 'Extensión agarre supino en polea': 'supine', 'Extensión con barra V': 'vbar', 'TRX fondos': 'trx' };

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
  const ws = w.split(' '), gw = GEAR_FROM.has(ws[0]) && GEAR[e.q] && !ws.includes(GEAR[e.q]) ? ' ' + GEAR[e.q] : '';
  lote.push({ n, w: w + gw + (EXTRA[n] ? ' ' + EXTRA[n] : ''), p: e.p || [], s: e.s || [], g: groupOf(e) });
}
writeFileSync('salida/lote.json', JSON.stringify(lote));
writeFileSync('salida/lote.txt', arg);
console.log(lote.length, 'ejercicios de', FAMILIES.join(', '));
