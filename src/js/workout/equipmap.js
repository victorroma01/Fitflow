/* ═══ workout/equipmap ═══
   El material de cada ejercicio, para «Equipamiento» en el Overview del día (workout/equipment). Sale de lo mismo con que se
   dibuja su figura: la familia de movimiento y las palabras de data/figposes (barra, mancuernas, polea, máquina, banco
   inclinado, anillas…), con el material de la librería (data/library: Barra, Mancuernas…) para lo que no dicen. Lo que hay
   alrededor y se usa (el banco, el rack, el cajón) va detrás de lo que se coge. Un ejercicio propio no dice su material: no
   pone nada. Código puro: ni página ni estado (tests/equipment.test.mjs).
   Define: BY_Q, Q_OF_NAME, libraryQ, RULES, gearOf, dayGear
*/
import { FIG_POSES } from '../data/figposes.js';
import { EXERCISES } from '../data/library.js';
import { EX_RETIRED } from '../data/aliases.js';
/* el material de la librería, cuando la figura no dice más */
const BY_Q = { 'Barra': ['barbell'], 'Barra Z': ['ez-bar'], 'Mancuernas': ['dumbbell'], 'Máquina': ['machine'], 'Smith': ['smith-machine'], 'Polea': ['cable'], 'Kettlebell': ['kettlebell'], 'Banda': ['long-band'], 'Peso corporal': ['body-weight'] };
/* el material de la librería de cada ejercicio, por nombre (se prepara la primera vez) */
let Q_OF_NAME = null;
const libraryQ = n => {
  if (!Q_OF_NAME) {
    Q_OF_NAME = new Map();
    EXERCISES.forEach(e => Q_OF_NAME.has(e.n) || Q_OF_NAME.set(e.n, e.q));
  }
  return Q_OF_NAME.get(n);
};
/** @typedef {(x: string) => boolean} Has */
/* lo de cada familia: `w` dice si su figura lleva una palabra; `q`, el material de la librería. null: el de la librería */
/** @type {Record<string, (w: Has, q: string | undefined) => string[] | null>} */
const RULES = {
  /* press de banca: con barra, en su soporte (o en el suelo); con mancuernas, en su banco; inclinado o declinado, el suyo */
  press: w => {
    const bench = w('incline') ? 'bench-incline' : w('decline') ? 'bench-decline' : 'bench';
    if (w('smith'))
      return ['smith-machine', bench];
    if (w('db'))
      return w('floor') ? ['dumbbell'] : ['dumbbell', bench];
    if (w('ez'))
      return ['ez-bar', 'bench'];
    const band = w('band') ? ['long-band'] : [];
    return w('floor') ? ['barbell'] : ['barbell', ...band, w('incline') ? 'incline-bench-rack' : w('decline') ? 'bench-decline' : 'bench-press-rack'];
  },
  pressOut: w => w('machine') ? [w('incline') ? 'incline-chest-press' : w('decline') ? 'decline-chest-press' : 'chest-press'] : w('band') ? ['long-band'] : ['cable'],
  dip: w => w('machine') ? ['assisted-machine'] : w('trx') ? ['trx'] : w('rings') ? ['rings'] : ['parallel-bars'],
  pushup: w => w('rings') ? ['rings'] : w('trx') ? ['trx'] : w('parallettes') ? ['parallettes'] : w('feetup') || w('handsup') ? ['bench'] : w('weight') ? ['plate'] : ['body-weight'],
  /* press de hombros: sentado, en un banco con respaldo (el inclinado, puesto recto); de pie con barra, del rack */
  overhead: w => {
    if (w('landmine'))
      return ['landmine', 'barbell'];
    if (w('machine'))
      return ['seated-shoulder-press-machine'];
    if (w('smith'))
      return ['smith-machine', 'bench-incline'];
    if (w('cable'))
      return ['cable'];
    if (w('band'))
      return ['long-band'];
    if (w('kb'))
      return ['kettlebell'];
    if (w('db'))
      return w('seated') ? ['dumbbell', 'bench-incline'] : ['dumbbell'];
    return w('seated') ? ['barbell', 'bench-incline', 'squat-rack'] : ['barbell', 'squat-rack'];
  },
  benchDip: w => w('weight') ? ['bench', 'plate'] : ['bench'],
  /* sentadillas: con barra, del rack (y en la caja, sobre ella); por encima de la cabeza, la barra sola */
  squat: (w, q) => {
    if (w('smith'))
      return ['smith-machine'];
    if (w('ssb'))
      return ['safety-bar', 'squat-rack'];
    if (w('trx'))
      return ['trx'];
    if (w('bag'))
      return ['sandbag'];
    if (w('kb'))
      return ['kettlebell'];
    if (w('band'))
      return ['long-band'];
    if (w('jump'))
      return ['body-weight'];
    if (q == 'Mancuernas')
      return ['dumbbell'];
    if (w('oh'))
      return ['barbell'];
    return w('box') ? ['barbell', 'squat-rack', 'box'] : ['barbell', 'squat-rack'];
  },
  legPress: () => ['leg-press'],
  hack: w => [w('pendulum') ? 'pendulum-squat-machine' : 'hack-squat-machine'],
  legExt: w => w('band') ? ['long-band'] : w('cable') ? ['cable'] : ['leg-extension-machine'],
  sissy: () => ['body-weight'],
  /* zancadas: la búlgara, con el pie de atrás en un banco; con déficit, sobre una placa */
  lunge: w => {
    const more = [...w('bulgarian') ? ['bench'] : [], ...w('deficit') ? ['plate-or-wedge'] : []];
    if (w('smith'))
      return ['smith-machine', ...more];
    if (w('bar'))
      return ['barbell', ...more, 'squat-rack'];
    if (w('db'))
      return ['dumbbell', ...more];
    return w('bag') ? ['sandbag'] : ['body-weight'];
  },
  stepUp: w => w('high') ? w('db') ? ['dumbbell', 'box'] : ['box'] : ['dumbbell', 'step-up'],
  pistol: () => ['body-weight'],
  /* bisagra: el buenos días y el rack pull, del rack; con déficit, sobre una placa; con barra hexagonal, la trap */
  hinge: w => {
    if (w('smith'))
      return ['smith-machine'];
    if (w('cable'))
      return ['cable'];
    if (w('band'))
      return ['long-band'];
    if (w('kb'))
      return ['kettlebell'];
    if (w('db'))
      return ['dumbbell'];
    if (w('hex'))
      return ['trap-bar'];
    if (w('gm'))
      return w('seated') ? ['barbell', 'bench', 'squat-rack'] : ['barbell', 'squat-rack'];
    if (w('rack'))
      return ['barbell', 'squat-rack'];
    return w('deficit') ? ['barbell', 'plate-or-wedge'] : ['barbell'];
  },
  legCurl: w => w('machine') ? ['leg-curl'] : w('ball') ? ['swiss-ball'] : w('slide') ? ['sliders'] : w('db') ? ['dumbbell', 'bench'] : w('band') ? ['long-band'] : ['body-weight'],
  /* hip thrust: la espalda en un banco; el puente de glúteo, en el suelo (con banda, la corta sobre las rodillas) */
  thrust: w => {
    if (w('machine'))
      return ['machine-hip-thrust'];
    if (w('bridge'))
      return w('band') ? ['plate-band'] : ['body-weight'];
    if (w('smith'))
      return ['smith-machine', 'bench'];
    if (w('bar'))
      return ['barbell', 'bench'];
    if (w('db'))
      return ['dumbbell', 'bench'];
    return w('band') ? ['plate-band', 'bench'] : ['bench'];
  },
  kick: w => w('cable') ? ['cable'] : w('machine') ? ['glute-machine'] : w('band') ? ['plate-band'] : ['body-weight'],
  hyper: w => w('superman') ? ['body-weight'] : w('machine') ? ['back-extension-machine'] : w('reverse') ? ['reverse-hyperextension'] : w('ghd') ? ['ghd-machine'] : w('weight') ? ['hyper-bench', 'plate'] : ['hyper-bench'],
  /* gemelos: en el escalón, sobre un bloque; sentado con peso libre, en un banco */
  calf: (w, q) => {
    if (w('machine'))
      return [w('seated') ? 'seated-calf-raise-machine' : 'standing-calf-raise-machine'];
    if (w('smith'))
      return ['smith-machine', 'block'];
    if (w('bar'))
      return w('seated') ? ['barbell', 'bench'] : ['barbell', 'squat-rack'];
    if (w('db'))
      return w('seated') ? ['dumbbell', 'bench'] : ['dumbbell', 'block'];
    if (w('jump') || w('one'))
      return ['body-weight'];
    return q == 'Peso corporal' ? ['block'] : null;
  },
  tib: w => w('machine') ? ['tibialis-machine'] : w('band') ? ['long-band'] : ['body-weight'],
  /* remos: con mancuerna, apoyado en un banco (con el pecho, en el inclinado); invertido, bajo una barra en el rack */
  row: w => {
    if (w('meadows'))
      return ['landmine', 'barbell'];
    if (w('tbar'))
      return ['t-bar'];
    if (w('chest'))
      return ['dumbbell', 'bench-incline'];
    if (w('cable'))
      return ['cable'];
    if (w('machine'))
      return [w('one') ? 'one-arm-machine-row' : 'machine-row'];
    if (w('smith'))
      return ['smith-machine'];
    if (w('inverted'))
      return ['barbell', 'squat-rack'];
    if (w('trx'))
      return ['trx'];
    if (w('rings'))
      return ['rings'];
    if (w('band') || w('bandsit'))
      return ['long-band'];
    if (w('db'))
      return ['dumbbell', 'bench'];
    return ['barbell'];
  },
  pullup: w => w('machine') ? ['assisted-machine'] : w('rings') ? ['rings'] : w('chair') ? ['captains-chair'] : ['pull-up-bar', ...w('band') ? ['long-band'] : [], ...w('towel') ? ['towel'] : [], ...w('weight') ? ['plate'] : []],
  pulldown: w => [w('machine') ? 'lat-pulldown-machine' : 'cable'],
  shrug: w => w('hex') ? ['trap-bar'] : w('smith') ? ['smith-machine'] : w('machine') ? ['shrug-machine'] : w('cable') ? ['cable'] : w('db') ? ['dumbbell'] : ['barbell'],
  rearFly: w => w('band') ? ['long-band'] : w('machine') ? ['pec-deck-machine'] : w('cable') ? ['cable'] : w('bench') ? ['dumbbell', 'bench-incline'] : ['dumbbell'],
  straightArm: w => [w('machine') ? 'pullover-machine' : 'cable'],
  cross: w => w('deck') ? ['pec-deck-machine'] : w('band') ? ['long-band'] : ['cable'],
  fly: w => w('cable') ? ['cable', 'bench-incline'] : w('floor') ? ['dumbbell'] : ['dumbbell', w('incline') ? 'bench-incline' : w('decline') ? 'bench-decline' : 'bench'],
  svend: () => ['plate'],
  pullover: w => [w('ez') ? 'ez-bar' : 'dumbbell', 'bench'],
  lateral: w => w('machine') ? ['standing-side-lateral-raise-machine'] : w('cable') ? ['cable'] : w('band') ? ['long-band'] : w('seated') || w('side') ? ['dumbbell', 'bench'] : ['dumbbell'],
  frontRaise: w => w('disc') ? ['plate'] : w('cable') ? ['cable'] : w('bar') ? ['barbell'] : ['dumbbell'],
  facePull: w => [w('band') ? 'long-band' : 'cable'],
  upright: w => w('ez') ? ['ez-bar'] : w('cable') ? ['cable'] : w('db') ? ['dumbbell'] : ['barbell'],
  /* curls: en el predicador, su banco; inclinado o araña, el banco inclinado; concentrado o sentado, un banco */
  curl: w => {
    const bar = w('ez') ? 'ez-bar' : w('db') ? 'dumbbell' : w('cable') ? 'cable' : 'barbell';
    if (w('machine'))
      return ['machine-preacher-curl'];
    if (w('preacher'))
      return [bar, 'preacher-curl'];
    if (w('smith'))
      return ['smith-machine'];
    if (w('incline') || w('spider'))
      return [bar, 'bench-incline'];
    if (w('concentration') || w('seated') || w('lying'))
      return [bar, 'bench'];
    return [bar];
  },
  wristCurl: w => w('roller') ? ['wrist-roller'] : w('cable') ? ['cable'] : w('db') ? ['dumbbell', 'bench'] : w('behind') ? ['barbell'] : ['barbell', 'bench'],
  carry: w => w('pinch') ? ['plate'] : w('pack') ? ['backpack'] : w('bag') ? ['sandbag'] : w('kb') ? ['kettlebell'] : ['dumbbell'],
  pushdown: w => [w('band') ? 'long-band' : 'cable'],
  kickback: w => w('cable') ? ['cable'] : w('band') ? ['long-band'] : ['dumbbell', 'bench'],
  tricepsMachine: w => [w('dip') ? 'seated-dip-machine' : 'triceps-machine'],
  skull: w => [w('cable') ? 'cable' : w('db') ? 'dumbbell' : 'ez-bar', w('incline') ? 'bench-incline' : 'bench'],
  overheadExt: w => [w('cable') ? 'cable' : w('ez') ? 'ez-bar' : 'dumbbell'],
  legRaise: w => [w('dragon') ? 'bench' : 'body-weight'],
  plank: w => [w('drag') ? 'dumbbell' : w('ball') ? 'medball' : 'body-weight'],
  wheelRoll: () => ['ab-wheel'],
  sidePlank: () => ['body-weight'],
  crunch: w => [w('cable') ? 'cable' : w('machine') ? 'seated-crunch-machine' : w('ghd') ? 'ghd-machine' : w('decline') ? 'bench-decline' : w('ball') ? 'swiss-ball' : w('weight') ? 'plate' : 'body-weight'],
  twist: w => [w('machine') ? 'rotation-machine' : w('db') ? 'dumbbell' : w('ball') ? 'medball' : w('bar') ? 'barbell' : 'body-weight'],
  chop: () => ['cable'],
  vacuum: () => ['body-weight'],
  oly: w => [w('db') ? 'dumbbell' : 'barbell'],
  burpee: w => [w('db') ? 'dumbbell' : w('bar') ? 'barbell' : w('box') ? 'box' : 'body-weight'],
  wallBall: () => ['medball'],
  kbell: () => ['kettlebell'],
  boxJump: () => ['box'],
  jumpRope: () => ['jump-rope'],
  muscleUp: w => [w('rings') ? 'rings' : 'pull-up-bar'],
  ropeClimb: () => ['climbing-rope'],
  handstand: () => ['body-weight'],
  bike: w => [w('road') ? 'road-bike' : w('air') ? 'air-bike' : 'bike'],
  rower: () => ['rower'],
  skiErg: () => ['ski-erg'],
  sled: () => ['sled'],
  /* correr no necesita nada; en cinta, la cinta; con chaleco o con mochila, eso */
  run: w => [w('treadmill') ? 'treadmill' : w('vest') ? 'weight-vest' : w('pack') ? 'backpack' : 'body-weight'],
  crawl: () => ['body-weight'],
  deadBug: () => ['body-weight'],
  pallof: () => ['cable'],
  birdDog: () => ['body-weight'],
  inchworm: () => ['body-weight'],
  ropes: () => ['battle-ropes'],
  medBall: () => ['medball'],
  sideJump: () => ['body-weight'],
  tire: () => ['tire'],
  bandWalk: () => ['plate-band'],
  sideLunge: () => ['dumbbell'],
  trxCurl: () => ['trx'],
  elliptical: () => ['elliptical'],
  stairs: () => ['stair-climber'],
  swim: () => ['pool'],
  boxing: () => ['punching-bag'],
  hipOpen: w => w('machine') ? [w('adduct') ? 'adduction-machine' : 'abduction-machine'] : w('cable') ? ['cable'] : w('band') ? ['plate-band'] : w('ball') ? ['medball'] : ['body-weight']
};
/** El material del ejercicio llamado `n` (ids de data/equipment), lo que se coge primero; [] si no se sabe (uno propio). Uno
    que ya no está en la librería, el del que lo sustituye (data/aliases).
    @param {string} n
    @returns {string[]} */
const gearOf = n => {
  const name = FIG_POSES[n] ? n : EX_RETIRED.get(n) || n;
  const q = libraryQ(name);
  const pose = FIG_POSES[name];
  if (!pose)
    return (q && BY_Q[q] || []).slice();
  const [fam, ...words] = pose.split(' ');
  const rule = RULES[fam];
  const got = rule ? rule(x => words.includes(x), q) : null;
  return (got || q && BY_Q[q] || []).slice();
};
/** El material de un entreno: el de sus ejercicios (por nombre), en el orden en que hace falta y sin repetir. «Peso corporal»
    solo cuando no hace falta nada más.
    @param {string[]} names
    @returns {string[]} */
export const dayGear = names => {
  const out = [];
  for (const n of names)
    for (const g of gearOf(n))
      if (!out.includes(g))
        out.push(g);
  const real = out.filter(g => g != 'body-weight');
  return real.length ? real : out;
};
