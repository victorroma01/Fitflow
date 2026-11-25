/* ═══ figuras 3D: los datos de la app ═══
   Saca de la app lo que necesitan las figuras y las páginas de revisión, y lo deja en salida/: el mapa de músculos
   (data/anatomy), qué regiones del mapa tiene cada músculo (extras/anatomy) y los ejercicios de un lote, con su familia y
   variantes (data/figposes, con el material y lo que el 3D distingue) y sus músculos de la librería (data/library).
   Uso: node datos.mjs [familias separadas por comas] (por omisión, las del lote 1) */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { AN_R, AN_S, AN_H, AN_PA } from '../../src/js/data/anatomy.js';
import { FIG_POSES } from '../../src/js/data/figposes.js';
import { EXERCISES, groupOf } from '../../src/js/data/library.js';

/* los lotes: sus familias */
const LOTES = { 1: 'squat,press,overhead', 2: 'pulldown,row,pullup', 3: 'hinge,lunge,thrust,legPress,hack,legExt,legCurl',
  4: 'curl,trxCurl,pushdown,skull,overheadExt,kickback,tricepsMachine,dip,benchDip,wristCurl',
  5: 'pushup,pressOut,rearFly,lateral,cross,shrug,frontRaise,fly,upright,facePull,straightArm,pullover',
  6: 'crunch,plank,hyper,legRaise,twist,wheelRoll,sidePlank,chop,deadBug,pallof,birdDog,vacuum,calf,tib,hipOpen,kick,stepUp,sissy,pistol,bandWalk,sideLunge',
  7: 'oly,kbell,carry,sled,burpee,wallBall,medBall,boxJump,sideJump,muscleUp,ropeClimb,handstand,crawl,inchworm,svend,ropes,tire',
  8: 'run,bike,rower,skiErg,jumpRope,elliptical,stairs,swim,boxing' };
const arg = process.argv[2] || '1';
const FAMILIES = (LOTES[arg] || arg).split(',');
mkdirSync('salida', { recursive: true });
writeFileSync('salida/mapa.json', JSON.stringify({ R: AN_R, S: AN_S, H: AN_H, PA: AN_PA }));
const src = readFileSync('../../src/js/extras/anatomy.js', 'utf8');
const m = src.match(/^(?:export )?const MUSCLE_REGIONS = (\{.*\});$/m);
if (!m) throw new Error('no encuentro MUSCLE_REGIONS en extras/anatomy');
writeFileSync('salida/regiones.txt', m[1]);
const by = new Map(EXERCISES.map(e => [e.n, e]));
const lote = [];
for (const [n, w] of Object.entries(FIG_POSES)) {
  if (!FAMILIES.includes(w.split(' ')[0])) continue;
  const e = by.get(n);
  if (!e) throw new Error('no está en la librería: ' + n);
  lote.push({ n, w, p: e.p || [], s: e.s || [], g: groupOf(e) });
}
writeFileSync('salida/lote.json', JSON.stringify(lote));
writeFileSync('salida/lote.txt', arg);
console.log(lote.length, 'ejercicios de', FAMILIES.join(', '));
