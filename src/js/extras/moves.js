/* ═══ extras/moves ═══
   Las posturas de las figuras de ejercicio, por familias de movimiento. Cada familia es una función que recibe las
   variantes del ejercicio (una lista de palabras: el material, el banco, el agarre…) y devuelve su figura: { v: vista,
   a: postura de inicio, b: lo que cambia en la del final, props: material, up: qué extremo es el final del esfuerzo,
   at: momento del gesto que se pinta en la miniatura, hold: si es una postura que se mantiene }. La tabla de qué familia
   y qué variantes lleva cada ejercicio está en data/figposes; cómo se escribe una postura, en extras/rig.
   Define: has, REST, ANGLES, complete, figure, fig, add, turn, SH, loadOf, SEAT, upGrip, downGrip, front, sideTowers, preacherPad, SUPINE, LIFT, gait, treadmill, sledAt, MOVES, made, figPose
*/
import { FIG_POSES } from '../data/figposes.js';
import { RAD, poseSpot } from './rig.js';
import { beam, bench, box, cable, dipBars, flatBench, lever, mat, pad, pullBar, ringsAt, smith, stackAt, tower, wall, wheel } from './gear.js';
const has = (f, w) => f.includes(w);
/* lo que vale una medida de la postura cuando no se dice: los escorzos, 1; los ángulos y los desplazamientos, 0 */
const REST = { kU: 1, kF: 1, kT: 1, kS: 1 };
const ANGLES = ['lean', 'waist', 'neck', 'hip', 'knee', 'ft', 'sh', 'el', 'wr', 'shy', 'shx', 'arm', 'elb', 'leg', 'rot'];
/** Completa la postura de inicio con lo que las demás (el final, la intermedia) cambian sin que ella lo diga: el gesto
    solo reparte lo que está en las dos. side es lo del otro lado del cuerpo (far, de perfil; r, de frente), que cuando no
    dice algo hace lo mismo que el lado de delante. */
const complete = (a, b, side) => {
  const rest = k => k in REST ? REST[k] : ANGLES.includes(k) || (side && (k == 'x' || k == 'y')) ? 0 : null;
  Object.keys(b || {}).forEach(k => {
    if (k == 'far' || k == 'r') {
      a[k] = Object.assign({}, a[k]);
      Object.keys(b[k]).forEach(j => {
        if (!(j in a[k]) && (j in a || rest(j) != null))
          a[k][j] = j in a ? a[j] : rest(j);
      });
    }
    else if (!(k in a) && rest(k) != null)
      a[k] = rest(k);
  });
  return a;
};
/* una figura: la vista, las posturas (el inicio, completado con lo que cambian las demás) y el material */
const figure = (v, a, b, props, up, at, more) => Object.assign({ v, a: complete(complete(Object.assign({}, a), b, v != 'S'), more && more.m, v != 'S'), b, props: (props || []).filter(Boolean), up: up || 'b', at: at == null ? 1 : at }, more);
/** Una figura de perfil. */
const fig = (a, b, props, up, at, more) => figure('S', a, b, props, up, at, more);
const add = (p, d) => [p[0] + d[0], p[1] + d[1]];
const turn = (v, a) => {
  const c = Math.cos(a * Math.PI / 180);
  const s = Math.sin(a * Math.PI / 180);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
};
/* el hombro, en reposo */
const SH = [99, 82];
/** Lo que se lleva en las manos según las variantes: barra (con discos grandes, o pequeños con «small»), mancuernas,
    kettlebell, disco o balón. */
const loadOf = (f, small) => has(f, 'db') ? [['db', 0, has(f, 'one') ? 1 : 0]] : has(f, 'hammer') ? [['db', 0, has(f, 'one') ? 3 : 2]] : has(f, 'kb') ? [['kb', 0, has(f, 'two') ? 2 : 0]] : has(f, 'disc') ? [['disc', 'f']] : has(f, 'ball') ? [['ball', 'f', 12]] : has(f, 'bar') || has(f, 'ez') || has(f, 'smith') ? [['bar', 0, small || has(f, 'ez') ? 17 : 34]] : [];
/* sentado en un banco o una máquina: la cadera en (96, 288) y los pies en el suelo */
const SEAT = { at: 'hip', x: 96, y: 288, foot: [193, 385] };
/* el puño en lo alto, con el brazo estirado en vertical, visto desde un tórax inclinado lean grados */
const upGrip = (lean, len) => add(SH, turn([2, -(len || 134)], -lean));
/* el puño colgando en vertical bajo el hombro, visto desde un tórax inclinado lean grados */
const downGrip = (lean, len) => add(SH, turn([1, len || 136], -lean));
/** Una figura de frente (o, con v: 'B' en more, de espaldas). */
const front = (a, b, props, up, at, more) => figure(more && more.v || 'F', a, b, props, up, at, more);
/* torres de polea a los dos lados de una figura de frente, con la polea a la altura y, y sus cables a las manos */
const sideTowers = (y, cross) => [beam([-64, 14, -64, 398], 7, 'b'), beam([264, 14, 264, 398], 7, 'b'), beam([-84, 399.5, -44, 399.5], 5, 'b'), beam([244, 399.5, 284, 399.5], 5, 'b'), ['C', 'b', -56, y, 6.5, 5], ['C', 'b', 256, y, 6.5, 5], ['link', 'b', [-56, y], cross ? 'G' : 'g', 1.3, 3, 'h'], ['link', 'b', [256, y], cross ? 'g' : 'G', 1.3, 3, 'h']];
/* el banco predicador: una almohadilla inclinada bajo el brazo, con su pie */
const preacherPad = arm => {
  const mid = poseSpot(arm, ['UA', 99, 118]);
  const el = poseSpot(arm, ['UA', 99, 150]);
  const a = Math.atan2(el[0] - mid[0], -(el[1] - mid[1])) * 180 / Math.PI;
  return [pad(mid[0] + 12, mid[1] + 14, 13, 70, a), beam([mid[0] + 20, mid[1] + 30, mid[0] + 20, 398], 6, 'b'), beam([mid[0] - 4, 399.5, mid[0] + 44, 399.5], 5, 'b')];
};
/* tumbado boca arriba en el suelo con las rodillas dobladas */
const SUPINE = { at: 'hip', x: 200, y: 374, lean: -90, foot: [284, 385] };
/* las posturas del cuerpo por las que pasa un levantamiento */
const LIFT = {
  floor: { lean: 68, neck: -34, hip: 134, knee: 76 },
  deep: { lean: 58, neck: -28, hip: 148, knee: 110 },
  hang: { lean: 40, neck: -20, hip: 60, knee: 25 },
  dip: { lean: 2, neck: -2, hip: 24, knee: 30 },
  stand: { lean: 2, neck: -2, hip: 2, knee: 0 },
  squat: { lean: 26, neck: -16, hip: 110, knee: 116 },
  catch: { lean: 10, neck: -6, hip: 42, knee: 44 },
  tall: { lean: -4, neck: 2, hip: -2, knee: 0 },
};
/** Dos zancadas alternas: lo que hacen una pierna y el brazo contrario en el inicio lo hacen los otros en el final. */
const gait = (base, legA, legB, armA, armB, props, more) => fig(Object.assign({}, base, legA, armB, { far: Object.assign({}, legB, armA) }), Object.assign({}, legB, armA, { far: Object.assign({}, legA, armB) }), props, 'b', 0, Object.assign({ whole: 1 }, more));
/* la cinta de correr: tapiz, base, columna y consola */
const treadmill = () => [['R', 'b', 110, 409, 260, 10, 0, 6], beam([-20, 421, 250, 421], 5, 'b'), beam([236, 404, 256, 248], 5, 'b'), pad(254, 242, 42, 10, -28), beam([240, 296, 186, 296], 4, 'b')];
/* el trineo, cargado, con sus postes: x es donde empieza */
const sledAt = x => [['R', 'b', x + 60, 393, 124, 9, 0, 6], beam([x + 20, 388, x + 20, 250], 5, 'b'), beam([x + 100, 388, x + 100, 300], 5, 'b'), ['R', 'b', x + 100, 352, 46, 10, 0, 5], ['R', 'b', x + 100, 364, 46, 10, 0, 5], ['R', 'b', x + 100, 376, 46, 10, 0, 5]];
/** Las familias de movimiento: nombre → función que recibe las variantes y devuelve la figura. */
const MOVES = {
  /* ── empuje: press de banca (plano, inclinado, declinado, en el suelo), de hombro, flexiones y fondos ── */
  /** Press tumbado o sentado: el puño sube en vertical desde el pecho y el antebrazo va vertical bajo el peso. */
  press: f => {
    const lean = has(f, 'incline') ? -56 : has(f, 'decline') ? -104 : has(f, 'floor') ? -90 : -90;
    const hip = has(f, 'floor') ? [200, 372] : has(f, 'incline') ? [176, 300] : has(f, 'decline') ? [196, 262] : [200, 281];
    /* el puño, en coordenadas del tórax: arriba, sobre el hombro con el brazo estirado; abajo, junto al pecho */
    const up = add(SH, turn([has(f, 'incline') ? 6 : 2, -133], -lean));
    const low = has(f, 'incline') ? [129, 86] : has(f, 'db') ? [128, 104] : has(f, 'close') ? [130, 112] : [130.5, 108];
    const fa = lean + 180;
    const legs = has(f, 'decline') ? { foot: [hip[0] + 62, hip[1] + 66], ft: 20 } : { foot: [hip[0] + (has(f, 'floor') ? 84 : 97), 385] };
    const a = Object.assign({ at: 'hip', x: hip[0], y: hip[1], lean, neck: has(f, 'floor') ? -4 : -10, grip: up, fa }, legs);
    const gear = has(f, 'floor') ? [mat(0, 310)] : bench(hip[0], hip[1], lean);
    if (has(f, 'decline'))
      gear.push(pad(hip[0] + 60, hip[1] + 38, 16, 16), beam([hip[0] + 60, hip[1] + 46, hip[0] + 60, 398], 5));
    if (has(f, 'smith'))
      gear.push(...smith(poseSpot(a, 'g')[0]));
    if (has(f, 'band'))
      gear.push(['link', 'b', [hip[0] - 110, 398], 'g', 2.2, 4, '']);
    return fig(a, { grip: has(f, 'floor') ? [142, low[1]] : low, fa: fa - 2 }, gear.concat(loadOf(f)), 'a', .55);
  },
  /** Press sentado en máquina o de pie en polea: los puños van hacia delante desde el pecho. */
  pressOut: f => {
    const standing = has(f, 'cable') || has(f, 'band');
    const lean = standing ? 6 : has(f, 'incline') ? -22 : has(f, 'decline') ? 4 : -8;
    const rise = has(f, 'incline') ? -34 : has(f, 'decline') ? 26 : 0;
    const a = Object.assign({ lean, neck: 0, grip: [120, 104], fa: 86 - rise / 3, kF: .72 }, standing ? { hip: 6, knee: 0, far: { hip: -22, knee: 14, ft: 14 } } : { at: 'hip', x: 96, y: 288, foot: [193, 385] });
    const b = { grip: [222, 100 + rise], kF: 1 };
    const gear = standing ? (has(f, 'band') ? [beam([14, 60, 14, 398], 6, 'b'), ['link', 'b', [14, 150], 'g', 2.2, 4, '']] : tower(10, 150 - rise * 1.6, 8).concat([cable(18, 150 - rise * 1.6, 'h')])) : bench(96, 288, lean).concat(stackAt(20, 240), [beam([20, 150, 20, 398], 6, 'b'), beam([20, 152, 80, 120], 5, 'b'), lever(80, 120, 'g', 'b', 'f'), lever(80, 120, 'G', '', 'b')]);
    return fig(a, b, gear, 'b', .6);
  },
  /** Press de hombro, de pie o sentado: el puño sube desde el hombro hasta estirar el brazo. */
  overhead: f => {
    const seated = has(f, 'seated') || has(f, 'machine');
    const lean = seated ? -6 : 2;
    const a = Object.assign({ lean, neck: -2, grip: has(f, 'db') || has(f, 'kb') ? [110, 58] : [116, 64], fa: lean + 198 }, seated ? { at: 'hip', x: 96, y: 288, foot: [193, 385] } : { hip: 2, knee: 0 });
    const b = { grip: [105, -52], neck: -4, fa: lean + 184 };
    let gear = seated ? bench(96, 288, lean, 128) : [];
    if (has(f, 'smith'))
      gear = gear.concat(smith(poseSpot(a, 'g')[0]));
    if (has(f, 'machine'))
      gear = gear.concat(stackAt(20, 240), [beam([20, 110, 20, 398], 6, 'b'), lever(26, 112, 'g', 'b', 'f'), lever(26, 112, 'G', '', 'b')]);
    if (has(f, 'cable'))
      gear = gear.concat(tower(150, 380, -8), [cable(142, 380, 'h')]);
    if (has(f, 'band'))
      gear.push(['link', 'b', ['FT', 104, 400], 'g', 2.2, 4, '']);
    if (has(f, 'landmine'))
      return fig(Object.assign({}, a, { grip: [128, 70], fa: null, sh: null }), { grip: [150, -28] }, [['link', 'f', [330, 398], 'g', 4, 2, 'b'], ['C', 'b', 330, 396, 5, 6]], 'b', .7);
    return fig(a, b, gear.concat(loadOf(f)), 'b', .65);
  },
  /** Flexiones: el cuerpo recto sobre las puntas de los pies y las manos; baja el pecho al suelo. */
  pushup: f => {
    const feet = has(f, 'feetup') ? 60 : 0;
    const hands = has(f, 'handsup') ? 46 : has(f, 'rings') || has(f, 'trx') ? 30 : has(f, 'parallettes') ? 14 : 0;
    /* lo que alcanza el brazo estirado, del hombro a la muñeca */
    const reach = has(f, 'wide') ? 108 : 122;
    const tilt = (reach + hands - feet - 26) / 300;
    const top = 90 - Math.asin(Math.max(-.5, Math.min(.9, tilt))) * 180 / Math.PI;
    const low = 90 - Math.asin(Math.max(-.6, Math.min(.9, (46 + hands - feet - 26) / 300))) * 180 / Math.PI;
    const base = { at: 'toe', x: 60, y: 401.5 - feet, lean: top, hip: 0, knee: 0, ft: 84, neck: -18 };
    const shoulder = poseSpot(base, ['TX', 99, 82]);
    const floor = 398 - hands;
    const a = Object.assign({}, base, has(f, 'knees') ? { at: 'knee', x: 60, y: 388, knee: 70, ft: 150 } : {}, { palm: [shoulder[0] + 6, floor], kU: has(f, 'wide') ? .8 : 1 });
    const gear = [];
    if (feet)
      gear.push(box(30, 96, 402 - feet));
    if (has(f, 'handsup'))
      gear.push(box(shoulder[0] - 24, shoulder[0] + 44, 402 - hands));
    if (has(f, 'rings') || has(f, 'trx'))
      gear.push(['link', 'b', [shoulder[0] + 10, 20], ['HA', 100, 214], 1.6, 3, ''], ['link', 'b', [shoulder[0] + 13, 20], ['xHA', 100, 214], 1.6, 3, '']);
    if (has(f, 'weight'))
      gear.push(['on', 'f', 'TX', ['R', '', 78, 104, 7, 44, 0, 5]]);
    return fig(a, { lean: low, neck: -30 }, gear, 'a', .5, { fist: 0 });
  },
  /** Fondos en paralelas (o en anillas, o en máquina asistida): colgado de las manos, baja doblando los codos. */
  dip: f => {
    const fwd = has(f, 'forward') ? 16 : 0;
    const a = { at: 'grip', x: 112, y: 232, lean: 6 + fwd, neck: -4, sh: 6 + fwd, el: 4, hip: 10 + fwd, knee: 78, ft: 40 };
    const b = { lean: 20 + fwd, sh: -34 + fwd, el: 62, neck: -14 };
    const gear = has(f, 'rings') ? ringsAt(112, 20) : dipBars(112, 232);
    if (has(f, 'machine'))
      gear.push(pad(112, 348, 46, 10), beam([112, 352, 112, 398], 6), ...stackAt(40, 250));
    if (has(f, 'weight'))
      gear.push(['on', 'f', 'PV', ['C', '', 104, 232, 15, 5]]);
    return fig(a, b, gear, 'a', .6, { fist: 1 });
  },
  /** Fondos en banco: las manos apoyadas en el banco, detrás; los pies, delante en el suelo. */
  benchDip: f => {
    const a = { at: 'hip', x: 150, y: 292, lean: -4, neck: 0, palm: [118, 300], foot: [262, 385], ft: 0 };
    const b = { y: 336, foot: [262, 385] };
    const gear = flatBench(40, 132, 304);
    if (has(f, 'weight'))
      gear.push(['on', 'f', 'TH', ['R', '', 118, 236, 8, 40, 0, 5]]);
    return fig(a, b, gear, 'a', .6, { fist: 0 });
  },
  /* ── piernas: sentadillas, zancadas, bisagras de cadera, prensa, máquinas, gemelos y glúteos ── */
  /** Sentadilla: los pies quietos, cadera y rodillas a la vez. Variantes: dónde va el peso. */
  squat: f => {
    const upright = has(f, 'front') || has(f, 'goblet') || has(f, 'zercher') || has(f, 'oh') || has(f, 'band');
    const low = upright ? { lean: 26, neck: -16, hip: 110, knee: 116 } : has(f, 'sides') ? { lean: 32, neck: -20, hip: 116, knee: 112 } : { lean: 36, neck: -22, hip: 120, knee: 110 };
    const top = { lean: upright ? 3 : 5, neck: -3, hip: upright ? 3 : 5, knee: 0 };
    let arms = { grip: [77, 67], fa: 178, kF: .8, eb: -1 };
    let more = {};
    let gear = [];
    if (has(f, 'front'))
      arms = { grip: [119.5, 69], fa: -90, kF: .57 };
    else if (has(f, 'goblet'))
      arms = { grip: [126, 98], kF: .62 };
    else if (has(f, 'ssb'))
      arms = { grip: [124, 88], kF: .6 };
    else if (has(f, 'zercher')) {
      arms = { sh: 24, el: 118 };
      gear = [['on', 'b', 'xFA', ['C', '', 101, 157, 34, 5]], ['on', 'f', 'FA', ['C', '', 101, 157, 4.4, 2]]];
    }
    else if (has(f, 'sides') || has(f, 'sumo')) {
      arms = { sh: top.lean + (has(f, 'sumo') ? 6 : 0), el: 3 };
      more = { sh: low.lean + (has(f, 'sumo') ? 6 : 0) };
    }
    else if (has(f, 'band'))
      arms = { grip: [116, 76], kF: .6 };
    else if (has(f, 'oh')) {
      arms = { grip: upGrip(top.lean, 130), kU: .9 };
      more = { grip: upGrip(low.lean, 130) };
    }
    else if (has(f, 'none'))
      arms = { sh: 70, el: 30 };
    const a = Object.assign({}, top, arms, has(f, 'sumo') ? { kT: .86 } : {});
    const b = Object.assign({}, low, more);
    if (has(f, 'jump'))
      return fig(Object.assign({}, low, { y: 385, lean: 30, hip: 96, knee: 92 }, { sh: -20, el: 20 }), { lean: 2, hip: 0, knee: 0, y: 352, ft: 42, sh: 150, el: 10, neck: -4 }, [], 'b', 0);
    if (has(f, 'smith'))
      gear = gear.concat(smith(poseSpot(a, 'g')[0] + 3));
    if (has(f, 'box')) {
      const seat = poseSpot(Object.assign({}, a, b), ['PV', 74, 222]);
      gear.push(box(seat[0] - 34, seat[0] + 26, seat[1] + 4, 'b'));
    }
    if (has(f, 'band'))
      gear.push(['link', 'b', ['FT', 104, 400], 'g', 2.2, 4, '']);
    if (has(f, 'trx'))
      return fig(Object.assign({}, top, { lean: -8, hip: -6, gw: [160, 140] }), Object.assign({}, low, { lean: 4, hip: 96, knee: 108, gw: [140, 196] }), [['link', 'b', [262, 30], 'G', 1.6, 3, ''], ['link', 'f', [262, 30], 'g', 1.6, 3, 'h']], 'a', 1);
    const held = has(f, 'goblet') ? [has(f, 'kb') ? ['kb', 0, 0] : has(f, 'bag') ? ['bag', 'f'] : ['db', 0, 4]] : has(f, 'sides') ? [has(f, 'kb') ? ['kb', 0, 2] : ['db', 0, 0]] : has(f, 'sumo') ? [has(f, 'kb') ? ['kb', 0, 0] : ['db', 0, 4]] : has(f, 'zercher') || has(f, 'band') || has(f, 'none') ? [] : [['bar', 0, 34]];
    return fig(a, b, gear.concat(held), 'a', 1);
  },
  /** Zancadas y sentadillas a una pierna: la pierna de delante quieta y la de atrás, apoyada en la punta (o en un banco). */
  lunge: f => {
    const drop = has(f, 'deficit') ? 20 : 0;
    const bulgarian = has(f, 'bulgarian');
    /* el pie de atrás: en el banco (búlgara) o apoyado en la punta, una zancada por detrás del de delante */
    const far = { foot: bulgarian ? [-40, 296] : [-36, 368], ft: bulgarian ? 186 : 86 };
    /* hacia atrás, el pie de delante no se mueve y el otro da el paso; hacia delante, avanza el cuerpo entero */
    const forward = !bulgarian && !has(f, 'reverse');
    let arms = { sh: 3, el: 3 };
    let armsLow = { sh: 5 };
    if (has(f, 'bar') || has(f, 'smith')) {
      arms = { grip: [77, 67], fa: 178, kF: .8, eb: -1 };
      armsLow = {};
    }
    else if (has(f, 'goblet')) {
      arms = { grip: [126, 98], kF: .62 };
      armsLow = {};
    }
    else if (has(f, 'bag')) {
      arms = { grip: [84, 62], fa: 176, kF: .7, eb: -1 };
      armsLow = {};
    }
    else if (has(f, 'none')) {
      arms = { sh: -12, el: 62 };
      armsLow = {};
    }
    const a = Object.assign({ x: forward ? -30 : 132, y: 385 - drop, lean: 3, neck: -2, hip: bulgarian ? 30 : 3, knee: bulgarian ? 28 : 0, far: bulgarian ? { foot: far.foot, ft: 150 } : { foot: [forward ? -38 : 124, 385 - drop], ft: 0 } }, arms);
    const b = Object.assign({ x: 132, lean: 6, hip: 94, knee: 92, neck: -6, far }, armsLow);
    let gear = [];
    if (drop)
      gear.push(box(forward ? -66 : 100, 172, 402 - drop, 'b'));
    if (has(f, 'bulgarian'))
      gear = gear.concat(flatBench(-100, -14, 306));
    if (has(f, 'smith'))
      gear = gear.concat(smith(poseSpot(a, 'g')[0] + 3));
    if (has(f, 'jump'))
      return fig(Object.assign({}, a, b, { sh: 20, el: 60 }), { hip: 30, knee: 30, y: 350, ft: 30, far: { foot: [40, 346], ft: 80 }, sh: -20 }, [], 'b', 0);
    const held = has(f, 'bar') || has(f, 'smith') ? [['bar', 0, 34]] : has(f, 'goblet') ? [has(f, 'kb') ? ['kb', 0, 0] : ['db', 0, 4]] : has(f, 'bag') ? [['on', 'f', 'TX', ['R', '', 86, 62, 56, 22, 0, 7]]] : has(f, 'none') ? [] : [has(f, 'kb') ? ['kb', 0, 2] : ['db', 0, 0]];
    return fig(a, b, gear.concat(held), 'a', 1);
  },
  /** Subir a un cajón: el pie de delante arriba; la otra pierna empuja desde el suelo y acaba junto a él. */
  stepUp: f => {
    const h = has(f, 'high') ? 86 : 58;
    const a = { x: 150, y: 385 - h, lean: 16, neck: -8, hip: 98, knee: 88, sh: 16, el: 4, far: { foot: [84, 385], ft: 0 } };
    const b = { lean: 2, hip: 2, knee: 0, sh: 2, far: { foot: [140, 385 - h - 3], ft: 0 } };
    const held = has(f, 'none') ? [] : [has(f, 'kb') ? ['kb', 0, 2] : ['db', 0, 0]];
    /* a medio paso, el pie de atrás ya va por el aire, camino del cajón */
    return fig(a, b, [box(120, 200, 402 - h, 'b')].concat(held), 'b', 0, { m: { lean: 9, hip: 50, knee: 44, sh: 9, far: { foot: [106, 401 - h], ft: 30 } } });
  },
  /** Sentadilla a una pierna (pistol), con la otra por delante; asistida, agarrado a una correa. */
  pistol: () => fig({ lean: 4, neck: -2, hip: 4, knee: 0, gw: [176, 150], far: { hip: 34, knee: 6, ft: -20 } }, { lean: 30, hip: 128, knee: 122, gw: [176, 196], far: { hip: 118, knee: 4, ft: -20 } }, [['link', 'b', [262, 40], 'G', 1.6, 3, ''], ['link', 'f', [262, 40], 'g', 1.6, 3, 'h'], beam([262, 30, 262, 398], 6, 'b')], 'a', 1),
  /** Bisagra de cadera: peso muerto (del suelo arriba), rumano y buenos días (de pie abajo), con el tronco recto. */
  hinge: f => {
    const fromFloor = has(f, 'dl');
    const big = has(f, 'kb') || has(f, 'db') || has(f, 'band') || has(f, 'cable') ? 0 : 46;
    const stand = { lean: 2, neck: -2, hip: 2, knee: 0, sh: 2, el: 2 };
    let low = has(f, 'gm') ? { lean: 66, neck: -30, hip: 76, knee: 12 } : has(f, 'stiff') ? { lean: 80, neck: -34, hip: 84, knee: 5, sh: 80 } : fromFloor ? { lean: has(f, 'rack') ? 44 : 68, neck: -34, hip: has(f, 'rack') ? 62 : 134, knee: has(f, 'rack') ? 24 : 76, sh: has(f, 'rack') ? 44 : 68 } : { lean: 70, neck: -32, hip: 80, knee: 14, sh: 70 };
    if (has(f, 'sumo'))
      low = Object.assign({}, low, { lean: 54, hip: 112, knee: 70, sh: 54, kT: .8 });
    let arms = {};
    let gear = [];
    if (has(f, 'gm'))
      arms = { grip: [77, 67], fa: 178, kF: .8, eb: -1, sh: null };
    if (has(f, 'seated'))
      return fig(Object.assign({}, SEAT, { lean: 2, neck: -2 }, arms), { lean: 58, neck: -26 }, bench(96, 288, -90, 110).slice(0, 4).concat([pad(96, 320, 110, 12)], [['bar', 0, 34]]), 'a', 1);
    if (has(f, 'single'))
      return fig(Object.assign({}, stand, { far: { hip: 2, knee: 0, ank: 0 } }), { lean: 78, neck: -32, hip: 84, knee: 8, sh: 78, far: { hip: -8, knee: 6, ank: -10 } }, [has(f, 'kb') ? ['kb', 0, 0] : ['db', 0, 1]], 'a', 1);
    if (has(f, 'cable')) {
      /* pull-through: de espaldas a la polea baja, la cuerda pasa entre las piernas */
      gear = tower(-40, 372, 8).concat([cable(-32, 372, 'r')]);
      return fig(Object.assign({}, stand, { x: 110, sh: -6, el: 4 }), { lean: 62, neck: -28, hip: 78, knee: 22, sh: 40 }, gear, 'a', 1);
    }
    if (has(f, 'band'))
      gear.push(['link', 'b', ['FT', 104, 400], 'g', 2.2, 4, '']);
    if (has(f, 'smith'))
      gear = gear.concat(smith(128));
    if (has(f, 'deficit'))
      gear.push(box(70, 150, 386, 'b'));
    if (has(f, 'rack'))
      gear = gear.concat([beam([150, 300, 150, 398], 6, 'b'), beam([140, 300, 162, 300], 4, 'b')]);
    const a = Object.assign({}, fromFloor ? low : stand, arms, has(f, 'deficit') ? { y: 369 } : {}, has(f, 'sumo') ? { kT: fromFloor ? .8 : 1 } : {});
    const b = Object.assign({}, fromFloor ? stand : low, has(f, 'gm') ? { sh: null } : {}, has(f, 'sumo') ? { kT: fromFloor ? 1 : .8 } : {});
    const held = has(f, 'kb') ? [['kb', 0, 0]] : has(f, 'db') ? [['db', 0, 0]] : has(f, 'band') || has(f, 'none') ? [] : [['bar', 0, has(f, 'gm') ? 34 : big]];
    return fig(a, b, gear.concat(held), fromFloor ? 'b' : 'a', fromFloor ? 0 : 1);
  },
  /** Prensa de piernas: sentado y reclinado, los pies empujan la plataforma por su guía. */
  legPress: f => {
    const flat = has(f, 'horizontal');
    const lean = flat ? -24 : -60;
    const way = flat ? [1, 0] : [.72, -.69];
    const hip = flat ? [80, 300] : [96, 338];
    /* los pies van en la plataforma por encima de la línea de la cadera (más abajo, con «low»), y la plataforma, algo
       inclinada hacia ellos: así el tobillo no se dobla más de lo que da de sí al bajar */
    const up = [way[1], -way[0]];
    const h = has(f, 'low') ? 26 : flat ? 30 : 40;
    const reach = d => [hip[0] + way[0] * d + up[0] * h, hip[1] + way[1] * d + up[1] * h];
    const ft = (flat ? -90 : -134) + 14;
    const calf = has(f, 'calf');
    const a = { at: 'hip', x: hip[0], y: hip[1], lean, neck: flat ? 4 : 14, gw: [hip[0] + (flat ? 8 : 14), hip[1] + (flat ? 14 : 20)], foot: reach(172), ft: calf ? ft - 14 : ft };
    const b = calf ? { ft: ft + 20 } : { foot: reach(112) };
    if (has(f, 'one')) {
      a.far = { foot: add(hip, [flat ? 96 : 70, flat ? 60 : 30]), ft: 0 };
      b.far = a.far;
    }
    const end = reach(230);
    const gear = bench(hip[0], hip[1], lean, 128).concat([beam([hip[0] + way[0] * 60, hip[1] + way[1] * 60 + 26, end[0], end[1] + 26], 6, 'b'), beam([end[0], end[1] + 26, end[0], 398], 5, 'b'), beam([end[0] - 20, 399.5, end[0] + 24, 399.5], 5, 'b'), ['on', 'm', 'FT', ['R', '', 108, 408, 78, 8, 0, 1]], ['on', 'm', 'FT', ['C', '', 108, 424, 9, 5]]]);
    return fig(a, b, gear, 'a', calf ? 1 : .8, { fist: 1 });
  },
  /** Hack y sentadillas en máquina: la espalda en un respaldo que corre por guías inclinadas; los pies, en la plataforma. */
  hack: f => {
    const lean = has(f, 'reverse') ? 24 : -26;
    const u = turn([0, -1], lean);
    const foot = has(f, 'reverse') ? [150, 372] : [176, 366];
    /* la cadera corre paralela a las guías, por detrás de la línea de los pies */
    const len = lean < 0 ? 150 : 204;
    const drop = lean < 0 ? 84 : 74;
    const top = add(foot, [u[0] * len - (lean < 0 ? 62 : 56), u[1] * len]);
    const low = add(top, [-u[0] * drop, -u[1] * drop]);
    const a = { at: 'hip', x: top[0], y: top[1], lean, neck: lean < 0 ? 8 : -10, grip: lean < 0 ? [118, 76] : [124, 100], kF: .6, foot, ft: lean };
    const padBack = lean < 0 ? [['on', 'm', 'TX', ['R', '', 62, 112, 12, 124, 0, 1]], ['on', 'f', 'TX', ['R', '', 99, 62, 34, 11, 0, 1]]] : [['on', 'f', 'TX', ['R', '', 136, 110, 12, 96, 0, 1]], ['on', 'f', 'TX', ['R', '', 99, 62, 34, 11, 0, 1]]];
    const rail0 = add(foot, [lean < 0 ? -84 : 70, 20]);
    const gear = [beam([rail0[0], rail0[1], rail0[0] + u[0] * 300, rail0[1] + u[1] * 300], 6, 'b'), beam([rail0[0] + u[0] * 300, rail0[1] + u[1] * 300, rail0[0] + u[0] * 300, 398], 5, 'b'), beam([foot[0] - 60, 399.5, foot[0] + 70, 399.5], 5, 'b'), ['R', 'm', foot[0] + 14, foot[1] + 24, 84, 9, lean, 1]].concat(padBack);
    return fig(a, { x: low[0], y: low[1] }, gear, 'a', 1, { fist: 1 });
  },
  /** Extensión de cuádriceps: sentado, la pierna se estira contra el rodillo. */
  legExt: f => {
    const a = Object.assign({ at: 'hip', x: 96, y: 288, lean: -14, neck: 6, hip: 74, knee: 96, ank: -4, sh: -10, el: 16 });
    const b = { knee: 10 };
    if (has(f, 'one'))
      a.far = b.far = { knee: 96 };
    const knee = poseSpot(a, ['TH', 101, 297]);
    const gear = bench(96, 288, -14, 128);
    if (has(f, 'band'))
      gear.push(['link', 'b', [110, 396], ['SH', 100, 378], 2.2, 4, '']);
    else if (has(f, 'cable'))
      gear.push(...tower(20, 380, 8), cable(28, 380, 's', ['SH', 97, 378]));
    else
      gear.push(...stackAt(40, 250), lever(knee[0], knee[1] + 4, ['SH', 109, 372], 'p', 'f'), wheel(knee[0], knee[1] + 4, 5, 'm', 0));
    return fig(a, b, gear, 'b', 1, { fist: 1 });
  },
  /** Sentadilla sissy: de puntillas, las rodillas van adelante y el cuerpo, recto, se echa atrás. */
  sissy: () => fig({ at: 'toe', lean: 0, neck: 0, hip: 0, knee: 0, ft: 14, gw: [170, 190] }, { lean: -42, hip: 0, knee: 96, ft: 44, neck: 10, gw: [170, 190] }, [beam([176, 180, 176, 398], 6, 'b'), beam([160, 399.5, 192, 399.5], 5, 'b')], 'a', 1, { fist: 1 }),
  /** Curl femoral: tumbado, sentado o de pie, la pierna se dobla contra el rodillo. */
  legCurl: f => {
    if (has(f, 'seated')) {
      const a = { at: 'hip', x: 96, y: 288, lean: -14, neck: 6, hip: 74, knee: 12, ank: 0, sh: -10, el: 16 };
      const knee = poseSpot(a, ['TH', 101, 297]);
      return fig(a, { knee: 104 }, bench(96, 288, -14, 128).concat(stackAt(40, 250), [pad(knee[0] - 30, knee[1] - 22, 44, 11), lever(knee[0], knee[1] + 4, ['SH', 86, 372], 'p', 'f'), wheel(knee[0], knee[1] + 4, 5, 'm', 0)]), 'b', 1, { fist: 1 });
    }
    if (has(f, 'standing')) {
      const a = { at: 'hip', x: 110, y: 196, lean: 16, neck: -8, hip: 16, knee: 6, ank: 0, gw: [166, 150], far: { hip: 16, knee: 0, ank: null, ft: 0 } };
      const knee = poseSpot(a, ['TH', 101, 297]);
      return fig(a, { knee: 112 }, [beam([172, 120, 172, 398], 6, 'b'), beam([150, 399.5, 196, 399.5], 5, 'b'), pad(140, 250, 12, 60), lever(knee[0], knee[1], ['SH', 86, 372], 'p', 'f')].concat(has(f, 'band') ? [] : stackAt(196, 250)), 'b', 1, { fist: 1 });
    }
    if (has(f, 'nordic'))
      return fig({ at: 'knee', x: 120, lean: 0, neck: 0, hip: 0, knee: 90, ft: 96, sh: 40, el: 96 }, { lean: 66, hip: 0, knee: 24, neck: -26, sh: 100, el: 70 }, [mat(40, 330), pad(34, 376, 16, 14), beam([34, 384, 34, 398], 5)], 'a', .8);
    if (has(f, 'ball') || has(f, 'slide')) {
      /* boca arriba, la cadera arriba: los talones acercan el balón (o los deslizadores) */
      const a = { at: 'pin', pin: [74, 100], x: 60, y: 398, lean: -102, neck: 24, sh: -20, el: 2, foot: [262, has(f, 'ball') ? 352 : 388], ank: 14 };
      return fig(a, { lean: -114, sh: -32, foot: [196, has(f, 'ball') ? 352 : 388] }, [mat(10, 300)].concat(has(f, 'ball') ? [['on', 'm', 'FT', ['C', '', 96, 428, 26, 7]]] : []), 'b', 1);
    }
    /* tumbado boca abajo en el banco */
    const a = { at: 'hip', x: 150, y: 300, lean: 92, neck: -16, hip: 2, knee: 6, ank: 0, gw: [286, 346], kU: .6, kF: .6 };
    const knee = poseSpot(a, ['TH', 101, 297]);
    const gear = flatBench(96, 290, 326).concat(has(f, 'db') ? [['on', 'f', 'FT', ['C', '', 100, 392, 9, 2]]] : has(f, 'band') ? [['link', 'b', [10, 396], ['SH', 97, 380], 2.2, 4, '']] : stackAt(318, 250).concat([lever(knee[0], knee[1] + 6, ['SH', 86, 372], 'p', 'f')]));
    if (has(f, 'one'))
      a.far = { knee: 6 };
    return fig(a, Object.assign({ knee: 112 }, has(f, 'one') ? { far: { knee: 6 } } : {}), gear, 'b', 1, { fist: 1 });
  },
  /** Gemelos: de puntillas sobre un escalón (de pie, en máquina, con peso) o sentado con el peso en las rodillas. */
  calf: f => {
    if (has(f, 'seated')) {
      const toe = [200, 388];
      const ankle = ft => add(toe, turn([-31, -16.5], ft));
      const a = Object.assign({}, SEAT, { lean: -4, neck: 0, foot: ankle(-10), ft: -10, grip: has(f, 'bar') || has(f, 'db') ? [176, 180] : [150, 196] });
      const gear = bench(96, 288, -90, 100).slice(0, 4).concat([pad(96, 320, 100, 12), box(178, 222, 390, 'b')]);
      const knee = poseSpot(a, ['TH', 101, 297]);
      if (has(f, 'bar') || has(f, 'db'))
        gear.push(...loadOf(f, 1));
      else
        gear.push(pad(knee[0] - 14, knee[1] - 24, 40, 11), beam([knee[0] - 14, knee[1] - 30, knee[0] + 60, knee[1] - 60, knee[0] + 60, 398], 5, 'b'), wheel(knee[0] + 60, knee[1] - 30, 16, 'b'));
      return fig(a, { foot: ankle(26), ft: 26 }, gear, 'b', 1, { fist: 1 });
    }
    if (has(f, 'donkey')) {
      const a = { at: 'toe', x: 96, y: 388, lean: 84, neck: -30, hip: 86, knee: 0, ft: -10, gw: [214, 270] };
      return fig(a, { ft: 26, gw: [214, 262] }, [box(84, 122, 390, 'b'), beam([220, 262, 220, 398], 6, 'b'), beam([206, 262, 234, 262], 5, 'b'), ['on', 'f', 'PV', ['R', '', 78, 190, 44, 12, 0, 1]]].concat(stackAt(20, 250)), 'b', 1, { fist: 1 });
    }
    const step = has(f, 'floor') ? 0 : 14;
    const a = { at: 'toe', x: 128, y: 401.5 - step, lean: 0, neck: 0, hip: 0, knee: 0, ft: has(f, 'floor') ? 0 : -10, sh: 2, el: 4 };
    const b = { ft: 28 };
    let gear = step ? [box(112, 152, 402 - step, 'b')] : [];
    if (has(f, 'one')) {
      a.far = { hip: 6, knee: 78, ft: 40 };
      b.far = a.far;
    }
    if (has(f, 'machine')) {
      Object.assign(a, { grip: [116, 70], kF: .55, sh: null, el: null });
      gear = gear.concat(stackAt(30, 250), [beam([30, 60, 30, 398], 6, 'b'), ['on', 'f', 'TX', ['R', '', 99, 63, 36, 11, 0, 1]], lever(30, 150, ['TX', 86, 60], '', 'b')]);
    }
    else if (has(f, 'bar') || has(f, 'smith')) {
      Object.assign(a, { grip: [77, 67], fa: 178, kF: .8, eb: -1, sh: null, el: null });
      gear = gear.concat(has(f, 'smith') ? smith(poseSpot(a, 'g')[0] + 3) : [], [['bar', 0, 34]]);
    }
    else if (has(f, 'db'))
      gear.push(['db', 0, has(f, 'one') ? 1 : 0]);
    if (has(f, 'jump'))
      return fig(Object.assign({}, a, { ft: 0, knee: 14, hip: 8 }), { y: 380, ft: 38, knee: 0, hip: 0 }, [], 'b', 1);
    return fig(a, b, gear, 'b', 1, { fist: has(f, 'machine') ? 1 : 0 });
  },
  /** Tibial: los talones quietos y las puntas suben. */
  tib: f => {
    if (has(f, 'seated')) {
      const a = Object.assign({}, SEAT, { lean: -6, neck: 2, foot: [202, 385], ft: 12, sh: -8, el: 14 });
      return fig(a, { ft: -22 }, bench(96, 288, -6, 128).concat(has(f, 'band') ? [['link', 'b', [300, 396], ['FT', 126, 396], 2.2, 4, '']] : [['on', 'f', 'FT', ['C', '', 122, 392, 7.5, 1]], ['on', 'm', 'FT', ['C', '', 126, 410, 10, 5]]]), 'b', 1, { fist: 1 });
    }
    return fig({ x: 120, lean: -10, neck: 8, hip: -10, knee: 0, ft: 0, sh: -10, el: 4 }, { ft: -26 }, [wall(46)], 'b', 1);
  },
  /** Empuje de cadera: la espalda apoyada en un banco (o en el suelo), la cadera sube con el peso encima. */
  thrust: f => {
    const floor = has(f, 'bridge');
    /* la parte alta de la espalda no se mueve: en el suelo o en el borde del banco */
    const pin = floor ? { at: 'pin', pin: [74, 98], x: 70, y: 399 } : { at: 'pin', pin: [74, 100], x: 108, y: 300 };
    const a = Object.assign({}, pin, { lean: floor ? -88 : -56, neck: floor ? 6 : 24, grip: [118, 192], foot: [floor ? 244 : 300, 385] });
    const b = { lean: floor ? -112 : -88, neck: floor ? 26 : 12 };
    if (has(f, 'one')) {
      /* la otra pierna, en el aire */
      a.far = floor ? { foot: null, hip: 45, knee: 5, ank: 0 } : { foot: null, hip: 70, knee: 80, ank: 0 };
      b.far = floor ? { foot: null, hip: 22, knee: 5, ank: 0 } : { foot: null, hip: 60, knee: 90, ank: 0 };
    }
    let gear = floor ? [mat(10, 300)] : flatBench(18, 122, 302);
    if (has(f, 'machine'))
      gear = gear.concat(stackAt(338, 250), [['on', 'f', 'PV', ['R', '', 112, 178, 12, 40, 70, 1]], lever(330, 330, ['PV', 118, 180], '', 'b')]);
    else if (has(f, 'band'))
      gear.push(['link', 'b', [150, 398], ['PV', 118, 182], 2.2, 4, ''], ['link', 'f', [262, 398], ['PV', 118, 182], 2.2, 4, '']);
    else if (has(f, 'smith'))
      gear = gear.concat(smith(poseSpot(a, 'g')[0] + 3));
    const held = has(f, 'db') ? [['db', 0, 1]] : has(f, 'bar') || has(f, 'smith') ? [['bar', 0, 34]] : [];
    if (!held.length && !has(f, 'machine'))
      Object.assign(a, { grip: null, sh: floor ? -6 : -8, el: floor ? 2 : 6 });
    if (floor && !held.length)
      b.sh = -30;
    return fig(a, b, gear.concat(held), 'b', 1);
  },
  /** Patada de glúteo: de pie ante la polea o la máquina, o a cuatro apoyos; la pierna va atrás. */
  kick: f => {
    if (has(f, 'floor')) {
      const a = { at: 'hip', x: 150, y: 300, lean: 88, neck: -22, hip: 88, knee: 92, ft: 100, palm: [258, 398], far: { hip: 88, knee: 92, ft: 100 } };
      return fig(a, { hip: -4, knee: 92, ft: 190 }, [mat(40, 330)].concat(has(f, 'band') ? [['link', 'f', ['xFT', 100, 396], ['FT', 100, 396], 2.2, 4, '']] : []), 'b', 1);
    }
    const a = { at: 'hip', x: 150, y: 196, lean: 30, neck: -14, hip: 44, knee: 20, ank: 0, gw: [226, 170], far: { hip: 30, knee: 0, ank: null, ft: 0 } };
    const gear = has(f, 'machine') ? stackAt(262, 250).concat([beam([240, 120, 240, 398], 6, 'b'), beam([226, 170, 240, 170], 5, 'b'), ['on', 'f', 'FT', ['R', '', 96, 404, 36, 8, 0, 1]], lever(240, 250, ['FT', 96, 404], '', 'b')]) : has(f, 'band') ? [beam([240, 120, 240, 398], 6, 'b'), beam([226, 170, 240, 170], 5, 'b'), ['link', 'b', [240, 380], ['SH', 97, 380], 2.2, 4, 's']] : tower(250, 380, -8).concat([beam([226, 170, 250, 170], 5, 'b'), cable(242, 380, 's', ['SH', 97, 380])]);
    return fig(a, { hip: -8, knee: 8 }, gear, 'b', 1, { fist: 1 });
  },
  /** Extensiones de espalda: en el banco a 45° u horizontal, con los pies sujetos; inversas; en máquina; y el «superman». */
  hyper: f => {
    if (has(f, 'superman'))
      return fig({ at: 'hip', x: 170, y: 376, lean: 90, neck: -8, hip: 0, knee: 0, ft: 80, sh: 176, el: 4, ha: -90 }, { waist: -12, hip: -12, sh: 190, neck: -20 }, [mat(10, 360)], 'b', 1);
    if (has(f, 'reverse')) {
      const a = { at: 'hip', x: 150, y: 200, lean: 90, neck: -16, hip: 84, knee: 4, ank: 0, gw: [262, 246], kU: .6, kF: .6 };
      return fig(a, { hip: -4 }, flatBench(132, 300, 226), 'b', 1, { fist: 1 });
    }
    if (has(f, 'machine')) {
      const a = Object.assign({}, SEAT, { lean: 28, neck: -10, sh: 30, el: 100 });
      return fig(a, { lean: -22, neck: 4 }, bench(96, 288, -90, 100).slice(0, 4).concat([pad(96, 320, 100, 12)], stackAt(20, 250), [['on', 'm', 'TX', ['R', '', 66, 96, 12, 44, 0, 1]], lever(96, 300, ['TX', 66, 96], '', 'b')]), 'b', 1);
    }
    const tilt = has(f, 'flat') || has(f, 'ghd') ? 82 : 46;
    const a = { x: 60, y: has(f, 'flat') || has(f, 'ghd') ? 250 : 360, lean: tilt + 62, neck: -24, hip: 62, knee: 0, ank: -tilt + 90, grip: has(f, 'weight') ? [124, 104] : [112, 96], kF: .5 };
    a.hip = a.lean - tilt;
    const hipAt = poseSpot(a, ['PV', 99, 196]);
    const gear = [pad(hipAt[0] - 18 + (tilt > 60 ? 0 : 6), hipAt[1] + 34, 13, 62, tilt - 90), beam([hipAt[0] - 10, hipAt[1] + 40, hipAt[0] - 10, 398], 6, 'b'), beam([40, 399.5, hipAt[0] + 40, 399.5], 5, 'b'), beam([52, tilt > 60 ? 262 : 372, hipAt[0] - 10, hipAt[1] + 60], 5, 'b'), ['C', 'f', 62, tilt > 60 ? 240 : 352, 7.5, 1]];
    return fig(a, { lean: tilt, hip: 0, neck: -6 }, gear.concat(has(f, 'weight') ? [['disc', 'f']] : []), 'b', 1, { fist: 1 });
  },
  /* ── tirón: remos, dominadas, jalones, encogimientos y dorsal con brazos rectos ── */
  /** Remo: inclinado con barra o mancuerna, sentado en polea o en máquina, o colgado bajo una barra o unas anillas. */
  row: f => {
    if (has(f, 'cable') || has(f, 'bandsit')) {
      /* sentado, los pies contra la plataforma: el asa va de los pies al abdomen */
      const high = has(f, 'high');
      const floor = has(f, 'bandsit');
      const a = { at: 'hip', x: 110, y: floor ? 372 : 330, lean: 10, neck: -6, grip: [228, high ? 30 : 124], foot: [262, floor ? 380 : 356], ft: -62 };
      const b = { lean: -6, grip: [128, 140], neck: 0 };
      if (floor)
        return fig(a, b, [mat(40, 320), ['link', 'b', ['FT', 104, 398], 'g', 2.2, 4, '']], 'b', 1, { fist: 1 });
      const gear = [pad(104, 362, 74, 11), beam([104, 368, 104, 398], 6), beam([76, 399.5, 132, 399.5], 5), beam([141, 364, 292, 364, 292, 398], 5, 'b'), pad(291, 354, 9, 56, 28)].concat(tower(336, high ? 110 : 300, -14), [cable(322, high ? 110 : 300, has(f, 'rope') ? 'r' : 'h')]);
      return fig(a, b, gear, 'b', 1, { fist: 1 });
    }
    if (has(f, 'machine')) {
      const a = Object.assign({}, SEAT, { lean: 4, neck: -2, grip: [216, 104] });
      return fig(a, { grip: [130, 114], lean: 0 }, bench(96, 288, -90, 100).slice(0, 4).concat([pad(96, 320, 100, 12), pad(140, 196, 12, 62), beam([140, 226, 140, 318], 5, 'b')], stackAt(262, 240), [beam([262, 110, 262, 398], 6, 'b'), lever(262, 130, 'g', 'b', 'f'), lever(262, 130, 'G', '', 'b')]), 'b', 1);
    }
    if (has(f, 'inverted') || has(f, 'rings')) {
      /* colgado boca arriba con los talones en el suelo: el cuerpo, recto, gira sobre ellos hasta que el pecho llega a la
         barra (o a las anillas), que queda sobre la parte baja del pecho */
      const top = { x: 262, y: 396, lean: has(f, 'rings') ? -38 : -46, neck: 6, hip: 0, knee: 0, ft: -60 };
      const bar = poseSpot(top, ['TX', 134, 124]);
      let low = top.lean;
      while (low > -84 && Math.hypot(...add(poseSpot(Object.assign({}, top, { lean: low }), ['TX', 99, 82]), [-bar[0], -bar[1]])) < 133)
        low -= 1;
      const gear = has(f, 'rings') ? ringsAt(bar[0] + 8, bar[1] - 250) : pullBar(bar[0], bar[1]);
      return fig(Object.assign({}, top, { lean: low, gw: bar, neck: 0 }), { lean: top.lean, neck: 6 }, gear, 'b', 1, { fist: 1 });
    }
    const one = has(f, 'db');
    const lean = has(f, 'pendlay') ? 84 : has(f, 'tbar') ? 50 : one ? 78 : has(f, 'chest') ? 54 : has(f, 'band') ? 8 : 62;
    let a = { lean, neck: -lean * .42, hip: lean + 14, knee: 24, grip: downGrip(lean, 134) };
    let gear = [];
    if (has(f, 'chest')) {
      a = { at: 'hip', x: 120, y: 250, lean, neck: -22, foot: [-4, 372], ft: 86, grip: downGrip(lean, 132) };
      gear = bench(120, 250, lean, 140, 1);
    }
    else if (one) {
      a = Object.assign(a, { x: 70, far: { grip: null, palm: [214, 298], ha: -90 } });
      gear = flatBench(150, 300, 302);
    }
    else if (has(f, 'band')) {
      a = { lean: 4, neck: -2, hip: 8, knee: 8, grip: [214, 110] };
      gear = [beam([300, 60, 300, 398], 6, 'b'), ['link', 'b', [300, 190], 'g', 2.2, 4, '']];
    }
    if (has(f, 'tbar'))
      gear = gear.concat([['link', 'm', [-30, 396], 'g', 4, 2, ''], ['C', 'b', -30, 396, 5, 6]]);
    if (has(f, 'smith'))
      gear = gear.concat(smith(poseSpot(a, 'g')[0] + 3));
    const b = { grip: has(f, 'band') ? [128, 116] : [127, 146] };
    if (one)
      b.far = a.far;
    const held = one || has(f, 'chest') ? [['db', 0, one ? 1 : 0]] : has(f, 'band') ? [] : [['bar', 0, has(f, 'tbar') ? 26 : 34]];
    return fig(a, b, gear.concat(held), 'b', 1);
  },
  /** Dominadas y lo que se hace colgado: de la barra, el cuerpo sube doblando los codos (o suben las piernas). */
  pullup: f => {
    /* la barra, lo bastante alta para que los pies no toquen el suelo */
    const bar = [110, -66];
    const a = { at: 'grip', x: bar[0], y: bar[1], lean: -2, neck: -8, sh: 176, el: 4, hip: -4, knee: 26, ank: -8, kU: has(f, 'wide') ? .86 : 1 };
    let b = { lean: -12, sh: 22, el: 150, neck: -18 };
    let at = 1;
    if (has(f, 'scap'))
      b = { shy: -9, neck: -10 };
    else if (has(f, 'hang'))
      b = {};
    else if (has(f, 'knees'))
      b = { hip: 104, knee: 112, lean: -8 };
    else if (has(f, 'legs'))
      b = { hip: 92, knee: 4, lean: -10, ank: -24 };
    else if (has(f, 't2b'))
      b = { hip: 148, knee: 6, lean: -38, sh: 144, ank: -30, neck: 0 };
    else if (has(f, 'muscleup'))
      b = { lean: 8, sh: 8, el: 6, neck: -6, hip: 8, knee: 10 };
    else if (has(f, 'c2b'))
      b = { lean: -24, sh: 2, el: 152, neck: -22 };
    if (has(f, 'kip'))
      Object.assign(a, { lean: 10, hip: -16, knee: 30, sh: 188 });
    let gear = has(f, 'rings') ? ringsAt(bar[0], 6) : pullBar(bar[0], bar[1]);
    if (has(f, 'towel'))
      gear = pullBar(bar[0], bar[1] - 30).concat([['link', 'b', [bar[0], bar[1] - 30], 'G', 3, 2, ''], ['link', 'f', [bar[0], bar[1] - 30], 'g', 3, 2, '']]);
    if (has(f, 'weight'))
      gear.push(['on', 'b', 'PV', ['C', '', 104, 236, 17, 5]], ['on', 'f', 'PV', ['C', '', 104, 236, 3, 2]]);
    if (has(f, 'band'))
      gear.push(['link', 'b', bar, ['FT', 100, 398], 2.4, 4, '']);
    if (has(f, 'machine'))
      gear.push(...stackAt(40, 250), ['on', 'm', 'SH', ['R', '', 106, 318, 12, 46, 0, 1]], lever(64, 330, ['SH', 112, 320], '', 'b'));
    if (has(f, 'chair'))
      return fig({ at: 'hip', x: 110, y: 210, lean: -4, neck: -2, sh: 12, el: 88, hip: 4, knee: 6, ank: -8 }, has(f, 'knees') ? { hip: 104, knee: 112 } : { hip: 92, knee: 4, ank: -24 }, [beam([70, 60, 70, 398], 6, 'b'), beam([52, 399.5, 130, 399.5], 5, 'b'), pad(74, 150, 12, 120), pad(112, 142, 54, 9)], 'b', 1, { fist: 1 });
    return fig(a, b, gear, 'b', at, Object.assign({ fist: 1 }, has(f, 'hang') ? { hold: 1 } : {}));
  },
  /** Jalón: sentado bajo la polea alta, la barra baja del todo arriba al pecho. */
  pulldown: f => {
    const kneel = has(f, 'kneel');
    const base = kneel ? { at: 'knee', x: 110, lean: -4, hip: 0, knee: 92, ft: 100 } : Object.assign({}, SEAT, { lean: -6 });
    const sh = poseSpot(base, ['TX', 99, 82]);
    const a = Object.assign({}, base, { neck: -10, gw: [sh[0] + 16, sh[1] - 126], fa: -6 + 180, kU: has(f, 'wide') ? .8 : 1 });
    const b = { lean: kneel ? -8 : -16, gw: [sh[0] + 24, sh[1] - 12], neck: -14 };
    if (has(f, 'one'))
      a.far = b.far = { gw: null, fa: null, sh: -6, el: 30 };
    const top = [sh[0] + 18, 22];
    let gear = kneel ? [mat(40, 300)] : [pad(96, 320, 86, 12), beam([96, 326, 96, 398], 6), beam([66, 399.5, 126, 399.5], 5), pad(160, 262, 46, 12), beam([180, 268, 180, 398], 5, 'b')];
    gear = gear.concat(stackAt(244, 240), [beam([244, 16, 244, 398], 7, 'b'), beam([244, 16, top[0], 16], 5, 'b')]);
    if (has(f, 'machine'))
      gear.push(lever(top[0] + 30, 20, 'g', 'b', 'f', 5), lever(top[0] + 30, 20, 'G', '', 'b', 5));
    else
      gear.push(['C', 'b', top[0], top[1], 6.5, 5], ['C', 'b', top[0], top[1], 2, 2], cable(top[0], top[1] + 6, has(f, 'rope') ? 'r' : has(f, 'one') ? 'h' : 'b'));
    return fig(a, b, gear, 'b', 1, { fist: 1 });
  },
  /** Encogimientos: de pie con el peso colgando, los hombros suben hacia las orejas. */
  shrug: f => {
    const a = { lean: 2, neck: 0, hip: 2, knee: 0, sh: has(f, 'bar') || has(f, 'smith') ? 6 : 2, el: 3, shy: 0 };
    let gear = [];
    if (has(f, 'smith'))
      gear = smith(poseSpot(a, 'g')[0] + 3);
    if (has(f, 'machine'))
      gear = stackAt(20, 250).concat([beam([20, 180, 20, 398], 6, 'b'), lever(20, 300, 'g', 'b', 'f'), lever(20, 300, 'G', '', 'b')]);
    if (has(f, 'cable'))
      gear = tower(190, 380, -10).concat([cable(180, 380, 'b')]);
    return fig(a, { shy: 10, neck: -4 }, gear.concat(has(f, 'machine') || has(f, 'cable') ? [] : loadOf(f)), 'b', 1, { fist: 1 });
  },
  /** Brazos rectos desde arriba hasta los muslos, ante la polea alta (jalón con brazos rectos, pullover en polea). */
  straightArm: f => {
    if (has(f, 'machine')) {
      const a = Object.assign({}, SEAT, { lean: -8, neck: 0, sh: 168, el: 80 });
      return fig(a, { sh: 28, el: 86 }, bench(96, 288, -8, 128).concat(stackAt(20, 240), [['on', 'f', 'UA', ['R', '', 99, 150, 16, 16, 0, 1]], lever(86, 150, ['UA', 99, 150], '', 'b')]), 'b', 1, { fist: 1 });
    }
    const a = { lean: 22, neck: -10, hip: 30, knee: 16, sh: 138, el: 12 };
    const gear = tower(262, 36, -34).concat([cable(228, 42, has(f, 'rope') ? 'r' : 'b')]);
    return fig(a, { sh: 28, el: 8 }, gear, 'b', 1);
  },
  /** Pullover tumbado en el banco: el peso va de detrás de la cabeza a encima del pecho con los brazos casi rectos. */
  pullover: f => fig({ at: 'hip', x: 200, y: 281, lean: -90, neck: -8, foot: [297, 385], sh: 186, el: 24 }, { sh: 96, el: 14 }, bench(200, 281, -90).concat(has(f, 'ez') ? [['bar', 0, 17]] : [['db', 0, 4]]), 'b', .2),
  /* ── hombros y pecho de frente: elevaciones, aperturas y cruces ── */
  /** Elevaciones laterales y lo que se abre de frente con los brazos rectos. */
  lateral: f => {
    const one = has(f, 'one') || has(f, 'cable') || has(f, 'lean');
    const rest = { arm: 4, elb: 0 };
    let a = { arm: 0, elb: 0 };
    let b = { arm: has(f, 'partial') ? 46 : has(f, 'y') ? 142 : 80 };
    let gear = [['db', 0, one ? 1 : 0]];
    if (has(f, 'cable')) {
      a = { arm: -8, elb: 0, r: { arm: 24, elb: 46 } };
      b = { arm: 80, r: { arm: 24, elb: 46 } };
      gear = [beam([232, 14, 232, 398], 7, 'b'), beam([212, 399.5, 252, 399.5], 5, 'b'), ['C', 'b', 224, 372, 6.5, 5], ['link', 'f', [224, 372], 'g', 1.3, 3, 'h']];
    }
    else if (has(f, 'machine')) {
      /* los codos doblados, con los antebrazos hacia quien mira: de frente se ven en escorzo */
      a = { arm: 14, elb: 0, kF: .34 };
      b = { arm: 82, elb: 0, kF: .34 };
      gear = [['R', 'b', 100, 150, 64, 190, 0, 1], ['on', 'f', 'U0', ['R', '', 34, 132, 16, 30, 8, 1]], ['on', 'f', 'U1', ['R', '', 166, 132, 16, 30, -8, 1]]];
    }
    else if (has(f, 'band'))
      gear = [['link', 'b', [78, 398], 'g', 2.2, 4, ''], ['link', 'b', [122, 398], 'G', 2.2, 4, '']];
    else if (has(f, 'lean')) {
      a = { arm: 0, elb: 0, rot: 14, x: -6, r: { arm: 44, elb: 0 } };
      b = { arm: 84, rot: 14, x: -6, r: { arm: 44, elb: 0 } };
      gear = [beam([212, 60, 212, 398], 6, 'b'), ['db', 0, 1]];
    }
    else if (has(f, 'side')) {
      /* tumbado de lado: sube el brazo de arriba */
      a = { rot: -90, y: 150, arm: 150, elb: -100, r: { arm: 6, elb: 0 } };
      b = { rot: -90, y: 150, arm: 150, r: { arm: 84, elb: 0 } };
      return front(a, b, [['R', 'b', 100, 388, 300, 6, 0, 6], ['db', 0, 0]], 'b', 1, { nofloor: 1, only: 'G' });
    }
    if (has(f, 'seated'))
      gear.unshift(['R', 'b', 100, 262, 96, 12, 0, 1], ['L', 'b', 'M100 268V398M72 399.5H128', 6, 0]);
    if (one && !has(f, 'cable') && !has(f, 'lean'))
      a.r = b.r = rest;
    return front(a, b, gear, 'b', 1);
  },
  /** Elevaciones frontales: el brazo recto sube por delante hasta la altura del hombro. */
  frontRaise: f => {
    const a = { lean: 0, neck: 0, hip: 0, knee: 0, sh: 4, el: 6 };
    const b = { sh: 92, el: 8 };
    let gear = [];
    if (has(f, 'alt')) {
      a.far = { sh: 92, el: 8 };
      b.far = { sh: 4, el: 6 };
    }
    if (has(f, 'cable'))
      gear = tower(20, 380, 8).concat([cable(28, 380, has(f, 'rope') ? 'r' : 'b')]);
    return fig(a, b, gear.concat(has(f, 'cable') ? [] : loadOf(f, 1)), 'b', 1);
  },
  /** Deltoides posterior: inclinado (o boca abajo en el banco) abriendo los brazos, que de perfil se ven venir hacia quien
      mira; en máquina, en polea cruzada o con banda, de frente. */
  rearFly: f => {
    if (has(f, 'machine') || has(f, 'cross') || has(f, 'band')) {
      const a = { arm: has(f, 'cross') ? 70 : 88, elb: 0, kU: .26, kF: .5 };
      const b = { arm: has(f, 'cross') ? 84 : 88, kU: 1, kF: 1 };
      const gear = has(f, 'machine') ? [['R', 'b', 100, 150, 64, 190, 0, 1], ['R', 'b', 100, 262, 96, 12, 0, 1], ['L', 'b', 'M100 268V398M72 399.5H128', 6, 0], ['link', 'b', [100, 44], 'g', 4.5, 0, 'b'], ['link', 'b', [100, 44], 'G', 4.5, 0, 'b']] : has(f, 'cross') ? sideTowers(60, 1) : [['link', 'f', 'g', 'G', 2.4, 4, '']];
      /* de espaldas, para que se vea el deltoides posterior */
      return front(a, b, gear, 'b', 1, { v: 'B' });
    }
    const lean = has(f, 'bench') ? 54 : 72;
    const base = has(f, 'bench') ? { at: 'hip', x: 120, y: 250, lean, neck: -22, foot: [-4, 372], ft: 86 } : { lean, neck: -30, hip: lean + 10, knee: 16 };
    const a = Object.assign({}, base, { sh: lean - 2, el: 8, kU: 1, kF: 1 });
    const b = { sh: lean + (has(f, 'y') ? 70 : 14), el: 12, kU: has(f, 'y') ? .8 : .32, kF: has(f, 'y') ? .8 : .42 };
    return fig(a, b, (has(f, 'bench') ? bench(120, 250, lean, 140, 1) : []).concat([['db', 0, 0]]), 'b', 1);
  },
  /** Face pull: de pie ante la polea, la cuerda va a la cara con los codos altos. */
  facePull: f => {
    const a = { lean: -4, neck: 0, hip: -2, knee: 4, grip: [196, 74], kU: 1, kF: 1, far: { hip: 16, knee: 8 } };
    const b = { grip: [122, 54], kU: .5, kF: .62, lean: -8 };
    const gear = has(f, 'band') ? [beam([300, 40, 300, 398], 6, 'b'), ['link', 'b', [300, 96], 'g', 2.2, 4, '']] : tower(300, 96, -12).concat([cable(288, 96, 'r')]);
    return fig(a, b, gear, 'b', 1, { fist: 1 });
  },
  /** Remo al mentón: la barra sube pegada al cuerpo hasta la barbilla, con los codos por encima de las manos. */
  upright: f => {
    const a = { lean: 0, neck: 0, hip: 0, knee: 0, grip: [113, 214], kU: 1, kF: 1 };
    const b = { grip: [114, 88], kU: .55, kF: .5, neck: -6 };
    const gear = has(f, 'cable') ? tower(190, 380, -10).concat([cable(180, 380, 'r')]) : loadOf(f, 1);
    return fig(a, b, gear, 'b', 1, { fist: 1 });
  },
  /** Aperturas con mancuernas en el banco: de perfil, los brazos casi rectos bajan abriéndose hacia quien mira. */
  fly: f => {
    const lean = has(f, 'incline') ? -56 : has(f, 'decline') ? -104 : -90;
    const hip = has(f, 'floor') ? [200, 372] : has(f, 'incline') ? [176, 300] : has(f, 'decline') ? [196, 262] : [200, 281];
    const legs = has(f, 'decline') ? { foot: [hip[0] + 62, hip[1] + 66], ft: 20 } : { foot: [hip[0] + (has(f, 'floor') ? 84 : 97), 385] };
    const a = Object.assign({ at: 'hip', x: hip[0], y: hip[1], lean, neck: -8, grip: upGrip(lean, 126), kU: 1, kF: 1 }, legs);
    const gear = has(f, 'floor') ? [mat(0, 310)] : bench(hip[0], hip[1], lean);
    if (has(f, 'decline'))
      gear.push(pad(hip[0] + 60, hip[1] + 38, 16, 16), beam([hip[0] + 60, hip[1] + 46, hip[0] + 60, 398], 5));
    if (has(f, 'cable'))
      gear.push(...tower(hip[0] - 200, 380, 8), cable(hip[0] - 192, 380, 'h'));
    return fig(a, { grip: [112, 84], kU: .34, kF: .4 }, gear.concat(has(f, 'cable') ? [] : [['db', 0, 0]]), 'a', .25);
  },
  /** Cruces de polea y pec deck, de frente: los brazos se cierran por delante del pecho. */
  cross: f => {
    if (has(f, 'deck')) {
      const a = { arm: 86, elb: 84, kU: 1 };
      return front(a, { kU: .3 }, [['R', 'b', 100, 150, 64, 190, 0, 1], ['R', 'b', 100, 262, 96, 12, 0, 1], ['L', 'b', 'M100 268V398M72 399.5H128', 6, 0], ['on', 'f', 'F0', ['R', '', 30, 192, 13, 62, 10, 1]], ['on', 'f', 'F1', ['R', '', 170, 192, 13, 62, -10, 1]]], 'b', 1);
    }
    const low = has(f, 'low');
    const a = { arm: low ? 30 : 84, elb: low ? -8 : -14, kU: 1 };
    /* las manos acaban juntas por delante: abajo, ante el abdomen (polea alta); a media altura, ante el pecho; y arriba,
       ante la cara (polea baja). Los brazos, hacia quien mira, se ven en escorzo */
    const b = low ? { arm: 60, elb: -150, kU: .5, kF: .8 } : has(f, 'mid') ? { arm: 40, elb: -110, kU: .6, kF: .8 } : { arm: 10, elb: -76, kU: .8, kF: .86 };
    if (has(f, 'one'))
      a.r = b.r = { arm: 8, elb: 0, kU: 1, kF: 1 };
    const gear = has(f, 'band') ? [['link', 'b', [-40, 120], 'g', 2.2, 4, ''], ['link', 'b', [240, 120], 'G', 2.2, 4, '']] : sideTowers(low ? 372 : has(f, 'mid') ? 130 : 44);
    return front(a, b, has(f, 'one') ? gear.filter(g => g[0] != 'link' || g[3] == 'g') : gear, 'b', 1, { fist: 1 });
  },
  /** Press Svend: los discos apretados entre las palmas van del pecho adelante. */
  svend: () => fig({ lean: 0, neck: 0, hip: 0, knee: 0, grip: [126, 104], kF: .7 }, { grip: [214, 100], kF: 1 }, [['disc', 'f']], 'b', 1),
  /* ── brazos: curl, muñeca y tríceps ── */
  /** Curl de bíceps: el brazo quieto y solo se dobla el codo. De pie, sentado, en banco inclinado, predicador, en polea… */
  curl: f => {
    const small = has(f, 'db') || has(f, 'hammer') ? loadOf(f, 1) : has(f, 'cable') || has(f, 'machine') || has(f, 'band') ? [] : [['bar', 0, 17]];
    let base = { lean: 0, neck: 0, hip: 0, knee: 0 };
    let arm = [{ sh: 7, el: 13 }, { sh: 9, el: 138 }];
    let gear = [];
    let more = { fist: 1 };
    if (has(f, 'incline')) {
      base = { at: 'hip', x: 176, y: 300, lean: -56, neck: 4, foot: [273, 385] };
      arm = [{ sh: -58, el: 10 }, { sh: -52, el: 134 }];
      gear = bench(176, 300, -56);
    }
    else if (has(f, 'preacher') || has(f, 'machine')) {
      base = Object.assign({}, SEAT, { lean: 16, neck: -6 });
      arm = [{ sh: 58, el: 20 }, { sh: 58, el: 118 }];
      gear = bench(96, 288, -90, 100).slice(0, 4).concat([pad(96, 320, 100, 12)], preacherPad(Object.assign({}, base, arm[0])));
      if (has(f, 'machine'))
        gear = gear.concat(stackAt(262, 250), [lever(poseSpot(Object.assign({}, base, arm[0]), ['UA', 99, 150])[0], poseSpot(Object.assign({}, base, arm[0]), ['UA', 99, 150])[1], 'g', 'b', 'f')]);
    }
    else if (has(f, 'spider')) {
      base = { at: 'hip', x: 120, y: 250, lean: 54, neck: -22, foot: [-4, 372], ft: 86 };
      arm = [{ sh: 54, el: 12 }, { sh: 54, el: 134 }];
      gear = bench(120, 250, 54, 140, 1);
    }
    else if (has(f, 'concentration')) {
      base = Object.assign({}, SEAT, { lean: 44, neck: -16, far: { sh: 20, el: 96 } });
      arm = [{ sh: 60, el: 20 }, { sh: 60, el: 128 }];
      gear = bench(96, 288, -90, 100).slice(0, 4).concat([pad(96, 320, 100, 12)]);
    }
    else if (has(f, 'seated')) {
      base = Object.assign({}, SEAT, { lean: -4, neck: 0 });
      gear = bench(96, 288, -4, 128);
    }
    else if (has(f, 'lying')) {
      base = { at: 'hip', x: 200, y: 372, lean: -90, neck: -4, foot: [286, 385] };
      arm = [{ sh: 8, el: 8 }, { sh: 8, el: 128 }];
      gear = [mat(0, 310)].concat(tower(330, 330, -10), [cable(320, 330, 'b')]);
    }
    else if (has(f, 'bayesian')) {
      base = { lean: 6, neck: -2, hip: 10, knee: 6, far: { hip: -14, knee: 10, ft: 12 } };
      arm = [{ sh: -30, el: 8 }, { sh: -12, el: 128 }];
      gear = tower(-10, 372, 8).concat([cable(-2, 372, 'h')]);
    }
    else if (has(f, 'drag'))
      arm = [{ sh: 2, el: 8 }, { sh: -26, el: 118 }];
    if (has(f, 'high')) {
      /* de frente, entre dos poleas altas: los brazos en cruz y las manos van a la cabeza */
      return front({ arm: 88, elb: 0 }, { elb: 128 }, sideTowers(70), 'b', 1, { fist: 1 });
    }
    if (has(f, 'cable') && !gear.length)
      gear = tower(200, 380, -10).concat([cable(190, 380, has(f, 'rope') ? 'r' : has(f, 'one') ? 'h' : 'b')]);
    if (has(f, 'preacher') && has(f, 'cable'))
      gear = gear.concat(tower(262, 380, -10), [cable(252, 380, 'b')]);
    if (has(f, 'band'))
      gear.push(['link', 'b', ['FT', 104, 400], 'g', 2.2, 4, '']);
    if (has(f, 'smith'))
      gear = gear.concat(smith(poseSpot(Object.assign({}, base, arm[0]), 'g')[0] + 3));
    const a = Object.assign({}, base, arm[0]);
    const b = Object.assign({}, arm[1]);
    if (has(f, 'alt')) {
      a.far = Object.assign({}, base.far, arm[1]);
      b.far = Object.assign({}, base.far, arm[0]);
    }
    return fig(a, b, gear.concat(small), 'b', .8, more);
  },
  /** Curl de muñeca: el antebrazo apoyado y solo se mueve la mano. */
  wristCurl: f => {
    if (has(f, 'behind'))
      return fig({ lean: 0, neck: 0, hip: 0, knee: 0, sh: -10, el: 4, wr: -6 }, { wr: 44 }, [['bar', 0, 17]], 'b', 1);
    if (has(f, 'roller'))
      return fig({ lean: 0, neck: 0, hip: 0, knee: 0, sh: 88, el: 4, wr: -24 }, { wr: 26 }, [['bar', 0, 3], ['link', 'f', 'g', [226, 250], 1.2, 3, ''], ['C', 'f', 226, 262, 12, 5]], 'b', 1, { fist: 1 });
    const a = Object.assign({}, SEAT, { lean: 32, neck: -14, sh: 40, el: 76, wr: has(f, 'reverse') ? 30 : -34 });
    const gear = bench(96, 288, -90, 100).slice(0, 4).concat([pad(96, 320, 100, 12)]);
    if (has(f, 'cable'))
      gear.push(...tower(262, 380, -10), cable(252, 380, 'b'));
    return fig(a, { wr: has(f, 'reverse') ? -36 : 40 }, gear.concat(has(f, 'cable') ? [] : loadOf(f, 1)), 'b', 1, { fist: 1 });
  },
  /** Extensión de tríceps en polea alta: el codo quieto junto al costado y el antebrazo baja hasta estirarse. */
  pushdown: f => {
    const a = { lean: 10, neck: -6, hip: 12, knee: 8, sh: 14, el: 112 };
    const gear = has(f, 'band') ? [beam([214, 10, 214, 398], 6, 'b'), ['link', 'b', [214, 24], 'g', 2.2, 4, '']] : tower(232, 30, -34).concat([cable(198, 36, has(f, 'rope') ? 'r' : has(f, 'one') ? 'h' : 'b')]);
    return fig(a, { el: 8 }, gear, 'b', 1, { fist: 1 });
  },
  /** Patada de tríceps: inclinado, el brazo pegado al tronco y el antebrazo se estira hacia atrás. */
  kickback: f => {
    const a = { lean: 68, neck: -28, hip: 78, knee: 18, sh: -4, el: 94 };
    const gear = has(f, 'cable') ? tower(250, 380, -10).concat([cable(240, 380, 'h')]) : has(f, 'band') ? [['link', 'b', ['FT', 104, 400], 'g', 2.2, 4, '']] : [['db', 0, has(f, 'two') ? 0 : 1]];
    if (!has(f, 'two'))
      a.far = { sh: 64, el: 20 };
    return fig(a, Object.assign({ el: 6 }, has(f, 'two') ? {} : { far: a.far }), gear, 'b', 1, { fist: 1 });
  },
  /** Extensión sobre la cabeza: el brazo arriba junto a la cabeza y el antebrazo sube desde detrás de la nuca. */
  overheadExt: f => {
    const seated = has(f, 'seated');
    const base = seated ? Object.assign({}, SEAT, { lean: -4 }) : { lean: 0, hip: 0, knee: 0 };
    const a = Object.assign({}, base, { neck: 4, sh: 170, el: 136 });
    let gear = seated ? bench(96, 288, -4, 110) : [];
    if (has(f, 'cable'))
      gear = gear.concat(tower(-20, 380, 8), [cable(-12, 380, 'r')]);
    return fig(a, { el: 10 }, gear.concat(has(f, 'cable') ? [] : has(f, 'ez') || has(f, 'bar') ? [['bar', 0, 17]] : [['db', 0, has(f, 'one') ? 1 : 4]]), 'b', 1, { fist: 1 });
  },
  /** Rompecráneos y press francés: tumbado, los brazos casi verticales y el peso baja hacia la frente. */
  skull: f => {
    const lean = has(f, 'incline') ? -56 : -90;
    const hip = has(f, 'incline') ? [176, 300] : [200, 281];
    const a = { at: 'hip', x: hip[0], y: hip[1], lean, neck: -8, foot: [hip[0] + 97, 385], sh: lean + 188, el: 8 };
    let gear = bench(hip[0], hip[1], lean);
    if (has(f, 'cable'))
      gear = gear.concat(tower(-40, 330, 10), [cable(-30, 330, 'b')]);
    return fig(a, { el: 112 }, gear.concat(has(f, 'cable') ? [] : has(f, 'db') ? [['db', 0, 0]] : [['bar', 0, 17]]), 'a', .7, { fist: 1 });
  },
  /** Tríceps en máquina: sentado, las manos empujan las asas hacia abajo. */
  tricepsMachine: f => {
    const a = Object.assign({}, SEAT, { lean: has(f, 'dip') ? 8 : 24, neck: -6, sh: has(f, 'dip') ? -30 : 60, el: has(f, 'dip') ? 96 : 118 });
    const gear = bench(96, 288, -90, 100).slice(0, 4).concat([pad(96, 320, 100, 12)], stackAt(20, 250), has(f, 'dip') ? [lever(40, 250, 'g', 'b', 'f'), lever(40, 250, 'G', '', 'b')] : preacherPad(a).concat([lever(poseSpot(a, ['UA', 99, 150])[0], poseSpot(a, ['UA', 99, 150])[1], 'g', 'b', 'f')]));
    return fig(a, has(f, 'dip') ? { sh: 4, el: 6 } : { el: 14 }, gear, 'b', 1, { fist: 1 });
  },
  /* ── abdomen y estabilidad ── */
  /** Encogimientos de abdomen: tumbado, sentado en máquina o de rodillas ante la polea; se dobla la cintura. */
  crunch: f => {
    if (has(f, 'cable')) {
      const a = { at: 'knee', x: 150, lean: 6, neck: 8, hip: 6, knee: 96, ft: 100, grip: [112, 44], kF: .6 };
      return fig(a, { lean: 30, waist: 46, neck: 20, hip: 40 }, [mat(60, 300)].concat(tower(250, 30, -70), [cable(180, 36, 'r')]), 'b', 1, { fist: 1 });
    }
    if (has(f, 'machine')) {
      const a = Object.assign({}, SEAT, { lean: -8, neck: 0, grip: [118, 60], kF: .6 });
      return fig(a, { waist: 40, neck: 10 }, bench(96, 288, -8, 100).concat(stackAt(20, 240), [['on', 'f', 'TX', ['R', '', 122, 92, 12, 40, 0, 1]], lever(60, 210, ['TX', 122, 92], '', 'b')]), 'b', 1, { fist: 1 });
    }
    if (has(f, 'situp')) {
      const base = has(f, 'decline') ? { at: 'hip', x: 180, y: 300, lean: -106, foot: [262, 262], ft: -40 } : has(f, 'ghd') ? { at: 'hip', x: 150, y: 250, lean: -112, foot: [262, 262], ft: -70 } : SUPINE;
      const a = Object.assign({}, base, { neck: 6, grip: [106, 30], kF: .5 });
      const gear = has(f, 'decline') ? bench(180, 300, -106).concat([pad(246, 300, 16, 16), beam([246, 308, 246, 398], 5)]) : has(f, 'ghd') ? [pad(150, 282, 70, 14), beam([150, 290, 150, 398], 6), beam([110, 399.5, 290, 399.5], 5), beam([268, 250, 268, 398], 5, 'b'), ['C', 'f', 266, 250, 8, 1]] : [mat(0, 310)];
      return fig(a, { lean: has(f, 'ghd') ? -10 : -24, waist: 14, neck: 4 }, gear.concat(has(f, 'weight') ? [['disc', 'f']] : []), 'b', 1);
    }
    if (has(f, 'vup'))
      return fig({ at: 'hip', x: 200, y: 376, lean: -90, neck: 0, hip: 0, knee: 0, ank: -24, sh: 178, el: 4 }, { lean: -42, waist: 14, hip: 96, knee: 6, sh: 96, neck: 6 }, [mat(0, 400)], 'b', 1);
    if (has(f, 'bike'))
      return fig(Object.assign({}, SUPINE, { foot: null, lean: -84, waist: 26, neck: 16, hip: 104, knee: 100, ft: -70, grip: [106, 30], kF: .5, far: { foot: null, hip: 30, knee: 8, ft: -70 } }), { hip: 30, knee: 8, far: { foot: null, hip: 104, knee: 100, ft: -70 } }, [mat(0, 340)], 'b', 1);
    if (has(f, 'ball')) {
      const a = { at: 'hip', x: 170, y: 300, lean: -100, neck: 0, foot: [262, 385], grip: [106, 30], kF: .5 };
      return fig(a, { waist: 44, neck: 14 }, [wheel(160, 352, 50, 'm', 7)], 'b', 1);
    }
    const a = Object.assign({}, SUPINE, { neck: 4, grip: has(f, 'weight') ? [124, 96] : has(f, 'heel') ? null : [106, 30], kF: .5 }, has(f, 'heel') ? { sh: -4, el: 4 } : {});
    return fig(a, has(f, 'heel') ? { waist: 16, neck: 14, sh: 6 } : { waist: 38, neck: 16 }, [mat(0, 310)].concat(has(f, 'weight') ? [['disc', 'f']] : []), 'b', 1);
  },
  /** Elevación de piernas tumbado: las piernas suben desde el suelo (o la cadera se despega, en el crunch inverso). */
  legRaise: f => {
    const a = { at: 'hip', x: 200, y: 376, lean: -90, neck: -4, hip: 4, knee: 4, ank: -20, sh: -4, el: 2 };
    if (has(f, 'reverse'))
      return fig(Object.assign({}, a, { hip: 92, knee: 86 }), { lean: -64, hip: 110, y: 366 }, [mat(0, 360)], 'b', 1);
    if (has(f, 'dragon'))
      return fig({ at: 'pin', pin: [74, 92], x: 96, y: 300, lean: -152, neck: 30, hip: 0, knee: 0, ank: -24, grip: [70, 60] }, { lean: -100, neck: 16 }, flatBench(0, 300, 302), 'a', 1, { fist: 1 });
    return fig(a, { hip: 88, knee: 6 }, [mat(0, 400)], 'b', 1);
  },
  /** Planchas y posturas que se mantienen: el cuerpo recto sobre antebrazos (o manos) y puntas de los pies. */
  plank: f => {
    const base = { at: 'toe', x: 60, lean: 82, neck: -14, hip: 0, knee: 0, ft: 84 };
    if (has(f, 'hollow'))
      return fig({ at: 'hip', x: 200, y: 372, lean: -78, waist: 14, neck: 10, hip: 34, knee: 4, ank: -30, sh: 150, el: 4 }, has(f, 'rock') ? { lean: -64 } : {}, [mat(0, 400)].concat(has(f, 'ball') ? [['ball', 'f', 12]] : []), 'b', 0, has(f, 'rock') ? {} : { hold: 1 });
    if (has(f, 'hands') || has(f, 'tap') || has(f, 'climber') || has(f, 'drag')) {
      const top = Object.assign({}, base, { lean: 71 });
      const sh = poseSpot(top, ['TX', 99, 82]);
      const a = Object.assign({}, top, { palm: [sh[0] + 4, 398] });
      /* la otra mano va al hombro contrario (toque de hombro) o arrastra el peso por debajo del cuerpo */
      if (has(f, 'tap'))
        return fig(Object.assign({}, a, { far: { palm: a.palm } }), { far: { palm: [sh[0] + 8, sh[1] + 16] } }, [mat(20, 420)], 'b', 1, { whole: 1 });
      if (has(f, 'drag'))
        return fig(Object.assign({}, a, { far: { palm: a.palm } }), { far: { palm: [sh[0] - 18, 398] } }, [mat(20, 420), ['C', 'f', sh[0] - 6, 388, 12, 5]], 'b', 1, { whole: 1 });
      if (has(f, 'climber')) {
        /* escalador: la cadera no se mueve y las rodillas van al pecho, una y otra */
        const hip = poseSpot(top, ['PV', 99, 196]);
        const back = { hip: 0, knee: 0, ft: 84 };
        const tuck = { hip: 140, knee: 140, ft: 70 };
        /* a medio cambio, con un saltito, las dos piernas van a medias y la cadera sube lo justo para que pasen */
        const half = { hip: 96, knee: 134, ft: 76 };
        return fig(Object.assign({}, a, { at: 'hip', x: hip[0], y: hip[1] - 10, lean: 76 }, back, { far: tuck }), Object.assign({}, tuck, { far: back }), [mat(20, 420)], 'b', 1, { whole: 1, m: Object.assign({}, half, { far: half }) });
      }
      return fig(a, {}, [mat(20, 420)], 'b', 0, { hold: 1 });
    }
    const a = Object.assign({}, base, { sh: 82, el: 90, ha: -90 });
    if (has(f, 'saw'))
      return fig(a, { x: 44, sh: 96, el: 76 }, [mat(20, 420)], 'b', 1, { fist: 1, whole: 1 });
    if (has(f, 'walk'))
      return fig(a, { far: { sh: 110, el: 60 } }, [mat(20, 420)], 'b', 1, { fist: 1, whole: 1 });
    return fig(a, {}, [mat(20, 420)], 'b', 0, { hold: 1, fist: 1 });
  },
  /** Plancha lateral, de frente: el cuerpo de lado, recto, sobre el antebrazo. */
  sidePlank: f => {
    const a = { rot: -72, x: 10, y: 96, arm: 12, elb: 86, r: { arm: 4, elb: 0 } };
    return front(a, has(f, 'leg') ? { r: { arm: 4, elb: 0, leg: 30 } } : {}, [['R', 'b', 100, 392, 320, 6, 0, 6]], 'b', 1, has(f, 'leg') ? { nofloor: 1 } : { hold: 1, nofloor: 1 });
  },
  /** Rueda abdominal: de rodillas (o de pie), la rueda se aleja hasta estirar el cuerpo y vuelve. */
  wheelRoll: f => {
    /* la rueda, en el suelo, se aleja hasta estirar el cuerpo: los brazos, estirados, la siguen */
    if (has(f, 'standing'))
      return fig({ at: 'toe', lean: 120, neck: -40, hip: 120, knee: 0, ft: 0, gw: [210, 386] }, { lean: 82, neck: -30, hip: 8, ft: 70, gw: [520, 386] }, [mat(30, 600), ['ball', 'f', 13]], 'b', .7, { fist: 1, m: { lean: 108, hip: 62, ft: 30, gw: [424, 386] } });
    return fig({ at: 'knee', x: 110, lean: 70, neck: -24, hip: 90, knee: 110, ft: 96, gw: [212, 386] }, { lean: 80, neck: -30, hip: 10, knee: 20, gw: [430, 386] }, [mat(30, 500), ['ball', 'f', 13]], 'b', .7, { fist: 1 });
  },
  /** Giros de tronco: sentado en V con los pies en alto, el peso va de un lado a otro. */
  twist: f => {
    if (has(f, 'machine')) {
      const a = Object.assign({}, SEAT, { lean: -4, neck: 0, grip: [124, 100], kF: .6 });
      return fig(a, { grip: [118, 104], kF: .4 }, bench(96, 288, -4, 128).concat(stackAt(20, 240), [['on', 'f', 'TX', ['R', '', 124, 100, 12, 46, 0, 1]]]), 'b', 1, { fist: 1 });
    }
    if (has(f, 'bar'))
      return fig({ lean: 4, neck: 0, hip: 8, knee: 10, grip: [150, 96] }, { grip: [128, 100], kF: .6 }, [['link', 'f', [300, 398], 'g', 4, 2, 'b'], ['C', 'b', 300, 396, 5, 6]], 'b', 1);
    if (has(f, 'standing'))
      return fig({ lean: 0, neck: 0, hip: 0, knee: 4, grip: [156, 110] }, { grip: [128, 112], kF: .5 }, loadOf(f, 1), 'b', 1);
    const a = { at: 'hip', x: 180, y: 374, lean: -40, waist: 10, neck: 14, hip: 76, knee: 70, ft: -30, grip: [150, 120] };
    return fig(a, { grip: [126, 128], kF: .5 }, [mat(60, 340)].concat(has(f, 'ball') ? [['ball', 'f', 12]] : []), 'b', 1, { fist: 0 });
  },
  /** Leñador en polea: de lado a la polea, las manos cruzan en diagonal de arriba abajo (o de abajo arriba). */
  chop: f => {
    const up = has(f, 'low');
    const a = { lean: 2, neck: 0, hip: 6, knee: 10, waist: up ? 14 : -6, grip: up ? [150, 190] : [156, 20], far: { hip: -12, knee: 8, ft: 10 } };
    const gear = tower(250, up ? 380 : 40, -20).concat([cable(230, up ? 380 : 40, 'h')]);
    return fig(a, { waist: up ? -6 : 16, grip: up ? [150, 26] : [140, 196], hip: up ? 2 : 16 }, gear, 'b', 1);
  },
  /** Vacuum: de pie, se mete el abdomen y se mantiene. */
  vacuum: () => fig({ lean: 4, neck: -4, hip: 6, knee: 4, waist: 6, sh: -8, el: 30 }, {}, [], 'b', 0, { hold: 1 }),
  /** Sujetar o llevar peso: colgado de la barra, o de pie con el peso en las manos (paseo del granjero). */
  carry: f => {
    if (has(f, 'clean')) {
      /* cargada de saco o de mochila: del suelo al pecho o al hombro */
      const a = Object.assign({}, LIFT.deep, { grip: downGrip(LIFT.deep.lean, 126), kF: 1 });
      return fig(a, Object.assign({}, LIFT.stand, { grip: has(f, 'shoulder') ? [98, 56] : [128, 104], kF: .62 }), [['bag', 'f']], 'b', 1);
    }
    if (has(f, 'walk')) {
      /* andando con la carga: en las manos, ante el pecho, abrazada o al hombro */
      const arms = has(f, 'rack') ? { grip: [122, 80], kF: .6 } : has(f, 'hug') ? { grip: [130, 120], kF: .8 } : has(f, 'shoulder') ? { grip: [100, 60], kF: .6 } : { sh: 3, el: 3 };
      const load = has(f, 'bag') ? (has(f, 'shoulder') ? [['on', 'f', 'TX', ['R', '', 92, 60, 60, 24, 0, 7]]] : [['bag', 'f']]) : [has(f, 'kb') ? ['kb', 0, has(f, 'rack') ? 0 : 2] : ['db', 0, 0]];
      return gait(Object.assign({ at: 'hip', x: 110, y: 199, lean: 4, neck: -2 }, arms), { hip: 28, knee: 8, ft: -14 }, { hip: -16, knee: 14, ft: 28 }, {}, {}, load, { fist: 1 });
    }
    return fig({ lean: 0, neck: 0, hip: 0, knee: 0, sh: 2, el: 3 }, {}, has(f, 'pinch') ? [['disc', 'f']] : [['db', 0, 0]], 'b', 0, { hold: 1, fist: 1 });
  },
  /* ── halterofilia: la barra va del suelo (o de colgado) a los hombros o sobre la cabeza ── */
  /** Levantamientos olímpicos y sus variantes: cargada, arrancada, dos tiempos, thruster, jerk y tirón. */
  oly: f => {
    const wide = has(f, 'snatch') ? .84 : 1;
    const db = has(f, 'db');
    /* el puño, en coordenadas del tórax, con los brazos colgando (back grados por detrás de la vertical), en los hombros
       o arriba, para una postura del cuerpo. Así la barra pasa siempre por delante del hombro */
    const pose = (q, grip, kU, kF) => Object.assign({ shy: 0 }, q, { grip, kU, kF: kF == null ? kU : kF });
    const low = q => pose(q, downGrip(q.lean - (q == LIFT.hang ? 14 : q == LIFT.tall ? 4 : 0), 136 * wide), wide);
    const rack = q => pose(q, db ? [116, 70] : [124, 80], .9, .57);
    const over = q => pose(q, upGrip(q.lean, 136 * wide - 2), wide);
    const end = has(f, 'snatch') || has(f, 'cj') ? over : rack;
    const first = has(f, 'hang') ? LIFT.hang : db ? LIFT.deep : LIFT.floor;
    /* el tirón, a medio camino: el cuerpo estirado y la barra a la altura del pecho, con los codos arriba */
    const pull = pose(LIFT.tall, has(f, 'snatch') ? [140, 114] : [132, 112], .55, .5);
    let a = low(first);
    let m = null;
    let b;
    if (has(f, 'thruster')) {
      a = rack(LIFT.squat);
      b = over(LIFT.stand);
    }
    else if (has(f, 'jerk') && has(f, 'split')) {
      /* de los hombros a arriba, con un pie delante y otro detrás */
      const q = { at: 'hip', x: 99, y: 206, lean: 2, neck: -2, foot: [97, 385], ft: 0 };
      const down = Object.assign({}, q, { y: 236, foot: [160, 385] });
      a = Object.assign(rack(q), { far: { foot: [97, 385], ft: 0 } });
      b = Object.assign(over(down), { far: { foot: [10, 376], ft: 50 } });
    }
    else if (has(f, 'jerk')) {
      a = rack(LIFT.dip);
      b = over(has(f, 'push') ? LIFT.catch : LIFT.stand);
    }
    else if (has(f, 'pull')) {
      /* los hombros, encogidos: la barra sube con ellos */
      b = Object.assign(low(LIFT.tall), { shy: 10 });
      b.grip = add(b.grip, [0, -10]);
    }
    else if (has(f, 'cj')) {
      m = rack(LIFT.catch);
      b = over(LIFT.stand);
    }
    else {
      /* se recibe de pie (muscle), con las rodillas algo dobladas (power) o abajo, en sentadilla */
      m = pull;
      b = end(has(f, 'power') ? LIFT.catch : has(f, 'muscle') ? LIFT.stand : LIFT.squat);
    }
    if (has(f, 'one')) {
      /* con una mano: la otra, suelta */
      const free = { grip: null, sh: 16, el: 24, kU: 1, kF: 1 };
      [a, m, b].forEach(q => {
        if (q)
          q.far = Object.assign({}, q.far, free);
      });
    }
    return fig(a, b, [db ? ['db', 0, has(f, 'one') ? 1 : 0] : ['bar', 0, 46]], 'b', has(f, 'pull') || !m ? 1 : .5, m ? { m } : {});
  },
  /* ── kettlebell ── */
  /** Balanceos, cargadas, arrancadas y demás con kettlebell. */
  kbell: f => {
    /* el balanceo hacia atrás: la pesa pasa entre las piernas */
    const back = { lean: 52, neck: -24, hip: 74, knee: 26, sh: 22, el: 2 };
    const up = { lean: -2, neck: 0, hip: 0, knee: 0 };
    /* el brazo que no lleva la pesa */
    const free = (sh, el) => ({ far: { sh, el } });
    if (has(f, 'halo')) {
      /* la pesa, cogida por las asas boca abajo, rodea la cabeza */
      const a = Object.assign({}, up, { grip: [128, 44], kU: .8, kF: .6 });
      return fig(a, { grip: [74, 40], kU: .5, kF: .6 }, [['kb', 0, 0]], 'b', 0, { fist: 1 });
    }
    if (has(f, 'windmill')) {
      /* de frente: un brazo arriba con la pesa y el tronco baja de lado hasta tocar el pie contrario */
      const a = { rot: 0, x: 0, y: 0, arm: 176, elb: 0, leg: 14, kT: 1, kS: 1, r: { arm: 8, elb: 0, leg: 14, kT: 1, kS: 1 } };
      const b = { rot: 34, x: -8, y: 14, arm: 146, leg: -20, r: { arm: 34, elb: 0, leg: 48, kT: .88, kS: .88 } };
      return front(a, b, [['kb', 0, 0]], 'b', 1, { fist: 1 });
    }
    if (has(f, 'tgu')) {
      /* levantada turca: tumbado con la pesa arriba → sentado sobre una mano → de pie */
      const a = { at: 'hip', x: 200, y: 374, lean: -90, neck: 8, foot: [300, 385], ft: 0, sh: 90, el: 2, far: { foot: [388, 384], ank: 0, sh: -4, el: 2 } };
      const m = { x: 120, y: 292, lean: -4, neck: 4, foot: [196, 385], sh: 176, far: { foot: [22, 390], ank: 22, sh: 6, el: 8 } };
      const b = { x: 99, y: 196, lean: 0, neck: 0, foot: [97, 385], sh: 178, far: { foot: [97, 385], ank: 0, sh: 10, el: 10 } };
      return fig(a, b, [mat(40, 330), ['kb', 0, 0]], 'b', .5, { m, fist: 1 });
    }
    if (has(f, 'gobletclean')) {
      /* del suelo a la posición de copa, ante el pecho */
      const top = poseSpot(Object.assign({}, LIFT.stand, { grip: [126, 98], kF: .62 }), 'g');
      const a = Object.assign({}, LIFT.deep, { gw: poseSpot(Object.assign({}, LIFT.deep, { sh: LIFT.deep.lean, el: 2 }), 'g'), kF: 1 });
      return fig(a, Object.assign({}, LIFT.stand, { gw: top, kF: .62 }), [['kb', 0, 0]], 'b', 1);
    }
    const one = has(f, 'one') || has(f, 'snatch') || has(f, 'clean');
    const rack = { sh: 16, el: 150 };
    if (has(f, 'snatch'))
      return fig(Object.assign({}, back, free(-20, 10)), Object.assign({}, up, { sh: 178, el: 2 }, free(14, 20)), [['kb', 0, 0]], 'b', 1, { m: Object.assign({}, LIFT.tall, { sh: 70, el: 110 }, free(0, 20)) });
    if (has(f, 'press'))
      return fig(Object.assign({}, back, free(-20, 10)), Object.assign({}, up, { sh: 178, el: 2 }, free(14, 20)), [['kb', 0, 0]], 'b', 1, { m: Object.assign({}, up, rack, free(10, 20)) });
    if (has(f, 'clean'))
      return fig(Object.assign({}, back, free(-20, 10)), Object.assign({}, up, rack, free(10, 20)), [['kb', 0, 0]], 'b', 1);
    /* balanceo: hasta la altura de los hombros (ruso) o hasta arriba (americano) */
    return fig(Object.assign({}, back, one ? free(-24, 10) : {}), Object.assign({}, up, { sh: has(f, 'american') ? 172 : 88, el: 4 }, one ? free(20, 20) : {}), [['kb', 0, 1]], 'b', 1);
  },
  /* ── metabólicos y gimnásticos ── */
  /** Burpee y sus variantes: de pie → en cuclillas con las manos en el suelo → el pecho en el suelo. */
  burpee: f => {
    const db = has(f, 'db');
    const a = { x: has(f, 'broad') ? 300 : 236, y: 385, lean: 0, waist: 0, neck: 0, hip: 0, knee: 0, ft: 0, sh: db ? 176 : 8, el: 6, wr: 0 };
    const m = { x: 236, y: 372, lean: 56, neck: -30, hip: 146, knee: 148, ft: 30, sh: 56, el: 14, wr: 70 };
    const b = has(f, 'sprawl') ? { x: 40, y: 368, lean: 70, waist: -34, neck: -30, hip: -14, knee: 0, ft: 84, sh: 48, el: 4, wr: 74 } : { x: 40, y: 368, lean: 88, neck: -26, hip: 0, knee: 0, ft: 84, sh: -30, el: 150, wr: 54 };
    const gear = [];
    if (has(f, 'bar'))
      gear.push(['C', 'b', 330, 356, 46, 5], ['C', 'f', 330, 356, 4.4, 2]);
    if (has(f, 'box'))
      gear.push(box(300, 400, 292, 'b'));
    if (db)
      gear.push(['db', 0, 0]);
    return fig(a, b, gear, 'b', .75, { m });
  },
  /** Wall ball: de la sentadilla con el balón en el pecho a lanzarlo arriba contra la pared. */
  wallBall: () => fig({ lean: 24, neck: -6, hip: 108, knee: 114, grip: [124, 82], kF: .6 }, { lean: 0, neck: 8, hip: 0, knee: 0, grip: [148, -46], kF: 1 }, [wall(250, -110), ['L', 'b', 'M250 -70H236', 5, 2], ['ball', 'f', 15]], 'b', 1),
  /** Salto al cajón: del suelo, en cuclillas, a caer en cuclillas sobre el cajón. */
  boxJump: f => {
    const top = 402 - (has(f, 'high') ? 150 : 112);
    const a = { x: 40, y: 385, lean: 42, neck: -18, hip: 100, knee: 86, ft: 0, sh: -34, el: 10 };
    const m = { x: 126, y: top - 70, lean: 18, neck: -8, hip: 104, knee: 116, ft: 30, sh: 120, el: 30 };
    const b = { x: 200, y: top - 17, lean: 30, neck: -14, hip: 92, knee: 90, ft: 0, sh: 60, el: 30 };
    return fig(a, b, [box(150, 266, top, 'b')], 'b', 1, { m });
  },
  /** Comba: la cuerda pasa bajo los pies en cada salto. */
  jumpRope: f => {
    const double = has(f, 'double');
    const a = { x: 97, y: 385, lean: 2, neck: 0, hip: 6, knee: 10, ft: 0, sh: 8, el: 34, ha: 180 };
    const b = { y: 385 - (double ? 54 : 30), hip: double ? 34 : 4, knee: double ? 56 : 8, ft: 36, ha: 360 };
    return fig(a, b, [['on', 'b', 'HA', ['L', '', 'M100 220C160 264 154 408 100 436C46 408 40 264 100 220', 1.6, 3]]], 'b', 1, { fist: 1, whole: 1 });
  },
  /** Trepa de cuerda: colgado de la cuerda, los brazos tiran y las piernas la pinzan (o cuelgan). */
  ropeClimb: f => {
    const legless = has(f, 'legless');
    const a = { at: 'grip', x: 112, y: -50, lean: 4, neck: -10, sh: 174, el: 4, hip: legless ? 24 : 96, knee: legless ? 8 : 112, ft: 30, far: { sh: 150, el: 44 } };
    const b = { sh: 62, el: 132, neck: -18, hip: legless ? 34 : 34, knee: legless ? 8 : 36, far: { sh: 36, el: 150 } };
    return fig(a, b, [['L', 'b', 'M112 -190V398', 5, 3]], 'b', 1, { fist: 1 });
  },
  /** Muscle-up: colgado → el pecho a la barra (o a las anillas) → apoyado encima con los brazos estirados. */
  muscleUp: f => {
    const bar = [110, -66];
    const a = { at: 'grip', x: bar[0], y: bar[1], lean: -2, neck: -8, sh: 176, el: 4, hip: -4, knee: 22, ft: 30 };
    const m = { lean: -24, neck: -18, sh: 24, el: 150, hip: 34, knee: 30 };
    const b = { lean: 12, neck: -4, sh: 17, el: 4, hip: 16, knee: 10 };
    return fig(a, b, has(f, 'rings') ? ringsAt(bar[0], bar[1] - 250) : pullBar(bar[0], bar[1]), 'b', 1, { m, fist: 1 });
  },
  /** Pino y flexiones de pino contra la pared, flexiones en pica y la subida a la pared andando con las manos. */
  handstand: f => {
    if (has(f, 'pike')) {
      const a = { at: 'toe', x: 40, lean: 130, neck: -12, hip: 100, knee: 0, ft: 50, palm: [256, 398] };
      return fig(a, { lean: 150, hip: 112, neck: -32 }, [mat(10, 330)], 'a', .5);
    }
    if (has(f, 'walk')) {
      /* boca abajo con los pies en la pared → los pies suben por ella y las manos se acercan → pino de cara a la pared */
      const a = { at: 'hip', x: 170, y: 372, lean: 90, neck: -24, hip: 0, knee: 0, ft: 90, palm: [278, 398], ha: -90 };
      const m = { x: 114, y: 197, lean: 133, neck: -16, ft: 150, palm: [196, 398] };
      const b = { x: -16, y: 160, lean: 176, neck: -10, ft: 186, palm: [-10, 398] };
      return fig(a, b, [wall(-52, -90)], 'b', .5, { m });
    }
    /* de espaldas a la pared, los talones apoyados en ella */
    const a = { at: 'hip', x: 150, y: 160, lean: 178, neck: -22, hip: 0, knee: 0, ft: 190, palm: [150, 398] };
    return fig(a, has(f, 'hold') ? {} : { y: 222, neck: -44 }, [wall(184, -90)], 'a', has(f, 'hold') ? 0 : .5, has(f, 'hold') ? { hold: 1 } : {});
  },
  /* ── carrera, marcha y máquinas de cardio ── */
  /** Carrera y marcha, al aire libre o en la cinta. */
  run: f => {
    const walk = has(f, 'walk');
    const base = { at: 'hip', x: 110, y: walk ? 199 : 218, lean: (walk ? 5 : 12) + (has(f, 'incline') ? 5 : 0), neck: -4 };
    const front = walk ? { hip: 28, knee: 8, ft: -14 } : { hip: 62, knee: 76, ft: 10 };
    const back = walk ? { hip: -16, knee: 14, ft: 28 } : { hip: -20, knee: 24, ft: 46 };
    const fore = walk ? { sh: 22, el: 16 } : { sh: 44, el: 96 };
    const aft = walk ? { sh: -22, el: 10 } : { sh: -42, el: 84 };
    let gear = [];
    if (has(f, 'treadmill'))
      gear = treadmill();
    if (has(f, 'pack'))
      gear.push(['on', 'm', 'TX', ['R', '', 64, 112, 26, 64, 0, 6]]);
    return gait(base, front, back, fore, aft, gear, has(f, 'treadmill') ? { nofloor: 1 } : {});
  },
  /** Bicicleta: estática, de aire (con los brazos) o de carretera. */
  bike: f => {
    const road = has(f, 'road');
    const air = has(f, 'air');
    const c = [162, 350];
    /* el tobillo, sobre el pedal, con la biela a grados del frente */
    const ped = deg => [c[0] + 26 * Math.cos(deg * RAD) - 8, c[1] + 26 * Math.sin(deg * RAD) - 17];
    const hands = road ? [238, 216] : air ? [214, 172] : [206, 180];
    const a = { at: 'hip', x: 96, y: 196, lean: road ? 52 : 30, neck: road ? -40 : -20, foot: ped(-90), ft: 8, gw: hands, far: { foot: ped(90), ft: 8, gw: air ? [184, 186] : hands } };
    const b = { foot: ped(90), gw: air ? [184, 186] : hands, far: { foot: ped(-90), ft: 8, gw: hands } };
    let gear = [pad(88, 227, 46, 10), beam([92, 232, c[0], c[1]], 6, 'b'), ['C', 'b', c[0], c[1], 13, 0], ['on', 'b', 'xFT', ['R', '', 104, 404, 28, 5, 0, 2]], ['on', 'f', 'FT', ['R', '', 104, 404, 28, 5, 0, 2]]];
    if (road)
      gear = gear.concat([['C', 'b', 42, 340, 61, 0], ['C', 'b', 292, 340, 61, 0], ['C', 'b', 42, 340, 4, 2], ['C', 'b', 292, 340, 4, 2], beam([92, 234, 244, 232, c[0], c[1], 42, 340, 92, 234], 5, 'b'), beam([244, 232, 292, 340], 5, 'b'), beam([238, 232, 246, 214, 262, 218, 262, 232], 4, 'b')]);
    else {
      const hub = air ? [248, 336] : [242, 346];
      gear = gear.concat([['C', 'b', hub[0], hub[1], air ? 54 : 40, 0], ['C', 'b', hub[0], hub[1], air ? 44 : 8, air ? 0 : 5], ['C', 'b', hub[0], hub[1], 4, 2], beam([c[0], c[1], hub[0], hub[1]], 6, 'b'), beam([c[0], c[1], 96, 398], 5, 'b'), beam([hub[0], hub[1], 262, 398], 5, 'b'), beam([70, 399.5, 122, 399.5], 5, 'b'), beam([236, 399.5, 288, 399.5], 5, 'b')]);
      if (air)
        gear.push(lever(206, 316, 'g', 'b', 'f'), lever(206, 316, 'G', '', 'b'));
      else
        gear.push(beam([hub[0] - 8, hub[1] - 30, 214, 192], 5, 'b'), beam([200, 182, 224, 190], 5, 'b'));
    }
    return fig(a, b, gear, 'b', 0, { fist: 1, whole: 1 });
  },
  /** Elíptica: de pie en los pedales, los brazos y las piernas se alternan. */
  elliptical: () => {
    const fore = [158, 352];
    const aft = [72, 368];
    const a = { at: 'hip', x: 112, y: 186, lean: 8, neck: -4, foot: fore, ft: -6, gw: [150, 190], far: { foot: aft, ft: 24, gw: [180, 172] } };
    const b = { foot: aft, ft: 24, gw: [180, 172], far: { foot: fore, ft: -6, gw: [150, 190] } };
    const gear = [['C', 'b', 28, 350, 42, 0], ['C', 'b', 28, 350, 5, 2], beam([0, 399.5, 262, 399.5], 5, 'b'), ['link', 'b', [28, 350], ['xFT', 104, 406], 5, 0, ''], ['link', 'b', [28, 350], ['FT', 104, 406], 5, 0, ''], ['on', 'b', 'xFT', ['R', '', 104, 405, 34, 6, 0, 2]], ['on', 'f', 'FT', ['R', '', 104, 405, 34, 6, 0, 2]], beam([216, 398, 216, 152], 6, 'b'), pad(216, 146, 34, 12, -20), lever(216, 320, 'G', '', 'b'), lever(216, 320, 'g', 'b', 'f')];
    return fig(a, b, gear, 'b', 0, { fist: 1, whole: 1 });
  },
  /** Escaladora: los pies suben peldaños que bajan, con las manos en las barandillas. */
  stairs: () => {
    const high = [152, 318];
    const low = [102, 368];
    const a = { at: 'hip', x: 112, y: 182, lean: 10, neck: -4, foot: high, ft: 0, gw: [176, 190], far: { foot: low, ft: 0 } };
    const b = { foot: low, far: { foot: high, ft: 0 } };
    const gear = [['P', 'b', 'M72 385H124V335H176V285H236V402H72Z', 6], beam([150, 204, 250, 154], 4, 'b'), beam([250, 154, 250, 284], 5, 'b'), pad(254, 150, 34, 12, -24)];
    return fig(a, b, gear, 'b', 0, { fist: 1, whole: 1 });
  },
  /** Remo en ergómetro: de recogido, con los brazos estirados, a las piernas estiradas y el asa en el abdomen. */
  rower: () => {
    const a = { at: 'hip', x: 140, y: 338, lean: 18, neck: -8, foot: [262, 350], ft: -44, grip: [232, 118] };
    const b = { x: 84, lean: -18, neck: 0, grip: [127, 142] };
    const gear = [beam([20, 376, 330, 376], 6, 'b'), beam([40, 376, 40, 398], 5, 'b'), beam([300, 376, 300, 398], 5, 'b'), ['on', 'm', 'PV', ['R', '', 78, 232, 12, 44, 0, 1]], pad(290, 348, 9, 54, 34), ['C', 'b', 330, 326, 40, 0], ['C', 'b', 330, 326, 30, 0], ['C', 'b', 330, 326, 4, 2], beam([330, 366, 330, 398], 6, 'b'), ['link', 'b', [300, 318], 'g', 1.3, 3, 'h']];
    return fig(a, b, gear, 'b', 1, { fist: 1 });
  },
  /** SkiErg: de pie ante la máquina, las asas bajan desde arriba hasta las caderas doblando el cuerpo. */
  skiErg: () => {
    const a = { lean: 2, neck: -4, hip: 4, knee: 4, grip: [150, -30], kF: .9 };
    const b = { lean: 46, neck: -22, hip: 62, knee: 30, grip: [112, 206], kF: 1 };
    const gear = [beam([262, -86, 262, 398], 7, 'b'), beam([236, 399.5, 288, 399.5], 5, 'b'), ['C', 'b', 262, -60, 30, 0], ['C', 'b', 262, -60, 22, 0], ['C', 'b', 262, -60, 4, 2], beam([262, -96, 236, -96, 236, -82], 4, 'b'), ['link', 'b', [236, -82], 'G', 1.3, 3, ''], ['link', 'b', [236, -82], 'g', 1.3, 3, 'h']];
    return fig(a, b, gear, 'b', 1, { fist: 1 });
  },
  /** Trineo: empujarlo con el cuerpo inclinado, tirar de él con la cuerda o arrastrarlo andando hacia atrás. */
  sled: f => {
    if (has(f, 'pull') || has(f, 'drag')) {
      const drag = has(f, 'drag');
      /* de cara al trineo, echado hacia atrás: los brazos recogen la cuerda (o las piernas andan hacia atrás) */
      const a = { at: 'hip', x: 96, y: 236, lean: -16, neck: 6, foot: [150, 385], ft: 0, grip: [222, 118], far: { foot: [70, 385], ft: 0 } };
      const b = drag ? { foot: [60, 380], ft: 30, far: { foot: [140, 385], ft: 0 } } : { grip: [128, 150] };
      if (drag)
        a.grip = [200, 150];
      return fig(a, b, sledAt(340).concat([['link', 'b', [360, 372], 'G', 2.4, 3, ''], ['link', 'b', [360, 372], 'g', 2.4, 3, '']]), 'b', 1, { fist: 1, whole: 1 });
    }
    const fore = [146, 385];
    const aft = [6, 374];
    const a = { at: 'hip', x: 110, y: 256, lean: 52, neck: -30, foot: fore, ft: 0, gw: [306, 262], far: { foot: aft, ft: 52 } };
    const b = { foot: aft, ft: 52, far: { foot: fore, ft: 0 } };
    return fig(a, b, sledAt(286), 'b', 0, { fist: 1, whole: 1 });
  },
  /** Natación: a crol, los brazos se alternan y las piernas baten. */
  swim: () => {
    const a = { at: 'hip', x: 150, y: 250, lean: 86, neck: -34, hip: 6, knee: 10, ft: 84, sh: 178, el: 4, far: { hip: -8, knee: 4, ft: 84, sh: 10, el: 14 } };
    const b = { hip: -8, knee: 4, sh: 10, el: 14, far: { hip: 6, knee: 10, ft: 84, sh: 178, el: 4 } };
    return fig(a, b, [['L', 'f', 'M-90 236q15 -7 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0', 2.4, 4], ['L', 'b', 'M-90 262q15 -7 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0 30 0', 1.6, 4]], 'b', 0, { nofloor: 1, whole: 1 });
  },
  /** Saco de boxeo: de la guardia al directo con el brazo de delante. */
  boxing: () => {
    const a = { lean: 6, neck: -2, hip: -8, knee: 14, ft: 14, grip: [124, 50], kF: .8, far: { hip: 26, knee: 22, ft: 0, grip: [128, 56], kF: .8 } };
    const b = { lean: 12, far: { hip: 30, knee: 26, ft: 0, grip: [228, 66], kF: 1 } };
    return fig(a, b, [beam([292, -70, 292, 20], 2, 'b', 3), ['R', 'b', 292, 130, 62, 220, 0, 6], ['L', 'b', 'M262 60H322M262 200H322', 2, 0]], 'b', 1, { fist: 1 });
  },
  /* ── funcional: a cuatro apoyos, en el suelo, lanzamientos y saltos ── */
  /** Desplazamientos a cuatro apoyos: oso (boca abajo, rodillas en el aire) y cangrejo (boca arriba). */
  crawl: f => {
    if (has(f, 'crab')) {
      const a = { at: 'hip', x: 150, y: 334, lean: -62, neck: 24, foot: [252, 385], ft: 0, palm: [26, 398], far: { foot: [224, 385], ft: 0, palm: [52, 398] } };
      const b = { foot: [224, 385], palm: [52, 398], far: { foot: [252, 385], ft: 0, palm: [26, 398] } };
      return fig(a, b, [], 'b', 0, { whole: 1 });
    }
    const a = { at: 'hip', x: 170, y: 296, lean: 84, neck: -34, foot: [108, 380], ft: 70, palm: [306, 398], far: { foot: [66, 380], ft: 70, palm: [268, 398] } };
    const b = { foot: [66, 380], palm: [268, 398], far: { foot: [108, 380], ft: 70, palm: [306, 398] } };
    return fig(a, b, [], 'b', 0, { whole: 1 });
  },
  /** Dead bug: boca arriba, se alejan un brazo y la pierna contraria y vuelven. */
  deadBug: () => {
    const a = { at: 'hip', x: 180, y: 374, lean: -90, neck: 4, hip: 90, knee: 90, ft: -90, sh: 90, el: 2, far: { hip: 90, knee: 90, ft: -90, sh: 90, el: 2 } };
    const b = { sh: 172, far: { hip: 16, knee: 4, ft: -80, sh: 90, el: 2 } };
    return fig(a, b, [mat(10, 400)], 'b', 1, { whole: 1 });
  },
  /** Bird dog: a cuatro apoyos, se estiran un brazo hacia delante y la pierna contraria hacia atrás. */
  birdDog: () => {
    const a = { at: 'hip', x: 150, y: 287, lean: 80, neck: -22, hip: 80, knee: 90, ft: 90, sh: 80, el: 2, ha: -90, far: { hip: 80, knee: 90, ft: 90, sh: 80, el: 2, ha: -90 } };
    const b = { sh: 172, far: { hip: -8, knee: 2, ft: 80, sh: 80, el: 2, ha: -90 } };
    return fig(a, b, [mat(30, 330)], 'b', 1, { whole: 1 });
  },
  /** Inchworm: de pie doblado con las manos en el suelo, las manos avanzan hasta la plancha y vuelven. */
  inchworm: () => fig({ at: 'toe', x: 40, lean: 150, neck: -10, hip: 148, knee: 4, ft: 0, palm: [150, 398] }, { lean: 72, neck: -20, hip: 0, knee: 0, ft: 84, palm: [352, 398] }, [], 'b', 1, { whole: 1, m: { lean: 116, neck: -14, hip: 72, ft: 40, palm: [300, 398] } }),
  /** Battle ropes: en media sentadilla, los brazos suben y bajan alternos y las cuerdas ondulan. */
  ropes: () => {
    const a = { lean: 22, neck: -10, hip: 56, knee: 54, grip: [190, 60], far: { grip: [176, 150] } };
    const b = { grip: [176, 150], far: { grip: [190, 60] } };
    return fig(a, b, [['link', 'b', [420, 398], 'G', 3.4, 3, ''], ['link', 'f', [420, 398], 'g', 3.4, 3, ''], ['R', 'b', 424, 392, 14, 16, 0, 6]], 'b', 0, { fist: 1 });
  },
  /** Balón medicinal: golpearlo contra el suelo, lanzarlo de pecho o lanzarlo girando el tronco contra la pared. */
  medBall: f => {
    if (has(f, 'slam'))
      return fig({ lean: -4, neck: 4, hip: -2, knee: 0, grip: upGrip(-4, 132) }, { lean: 54, neck: -26, hip: 86, knee: 56, grip: downGrip(54, 128) }, [['ball', 'f', 15]], 'b', 0);
    if (has(f, 'rot'))
      return fig({ lean: 6, neck: 0, hip: 30, knee: 34, waist: -8, grip: [84, 168] }, { lean: 2, hip: 6, knee: 6, waist: 10, grip: [216, 92] }, [wall(300, -40), ['ball', 'f', 15]], 'b', 0);
    return fig({ lean: 8, neck: -2, hip: 40, knee: 46, grip: [126, 96], kF: .62 }, { lean: -2, neck: 4, hip: 0, knee: 0, grip: [206, 0], kF: 1 }, [['ball', 'f', 15]], 'b', 0);
  },
  /** Volteo de neumático: de agarrarlo abajo, en cuclillas, a empujarlo hasta ponerlo de pie. */
  tire: () => {
    /* en cuclillas, las manos bajo el borde del neumático tumbado; al final, de pie, empujándolo casi vertical */
    const low = Object.assign({ x: 40 }, LIFT.deep);
    const grip = poseSpot(Object.assign({}, low, { sh: low.lean, el: 2 }), 'g');
    const edge = [grip[0] + 236, 398];
    const a = Object.assign({}, low, { gw: [grip[0] + 6, 384] });
    const b = { x: edge[0] - 176, lean: 20, neck: -12, hip: 24, knee: 10, gw: [edge[0] - 74, 172] };
    /* a medio camino, el cuerpo a medio levantar y las manos ya altas, sin soltar el borde */
    const m = { x: (a.x + b.x) / 2, lean: 39, neck: -20, hip: 86, knee: 60, gw: [(a.gw[0] + b.gw[0]) / 2, 262] };
    return fig(a, b, [['aim', 'b', edge, 'g', ['R', '', 120, 26, 244, 58, 0, 6], 70], ['aim', 'b', edge, 'g', ['L', '', 'M26 26H214', 16, 0], 70]], 'b', 0, { fist: 1, m });
  },
  /** Curl en TRX: colgado hacia atrás de las correas, las manos van a la frente doblando solo los codos. */
  trxCurl: () => {
    const top = { x: 262, y: 396, lean: -30, neck: 4, hip: 0, knee: 0, ft: -60 };
    const anchor = [330, -90];
    const end = poseSpot(top, ['HD', 122, 26]);
    const low = Object.assign({}, top, { lean: -46 });
    const sh = poseSpot(low, ['TX', 99, 82]);
    const d = Math.hypot(anchor[0] - sh[0], anchor[1] - sh[1]);
    const start = [sh[0] + (anchor[0] - sh[0]) / d * 134, sh[1] + (anchor[1] - sh[1]) / d * 134];
    return fig(Object.assign({}, low, { gw: start }), { lean: top.lean, gw: end }, ringsAt(anchor[0], anchor[1]), 'b', 1, { fist: 1 });
  },
  /* ── de frente: lo que se abre o se desplaza hacia los lados ── */
  /** Pallof press, de frente: las manos van del pecho hacia delante sin dejar que la polea gire el tronco. */
  pallof: () => front({ arm: 24, elb: -146, kU: 1, kF: .9 }, { arm: 12, elb: -30, kU: .36, kF: .34 }, [beam([-64, 14, -64, 398], 7, 'b'), beam([-84, 399.5, -44, 399.5], 5, 'b'), ['C', 'b', -56, 118, 6.5, 5], ['link', 'b', [-56, 118], 'g', 1.3, 3, 'h']], 'b', 0, { fist: 1, whole: 1 }),
  /** Pasos laterales con banda en las piernas. */
  bandWalk: () => front({ x: -16, leg: 5, r: { leg: 5 } }, { x: 10, r: { leg: 26 } }, [['link', 'f', ['S0', 79, 322], ['S1', 121, 322], 3, 4, '']], 'b', 1, { whole: 1 }),
  /** Zancada lateral: una pierna da el paso de lado y se dobla; la otra queda estirada. */
  sideLunge: () => front({ x: 0, y: 0, leg: 3, knee: 0, arm: 4, elb: 0, r: { leg: 3, knee: 0, arm: 4, elb: 0 } }, { x: -100, y: 36, leg: 50, knee: -50, arm: 14, r: { leg: 35, knee: 0, arm: -14, elb: 0 } }, [['db', 0, 0]], 'b', 1, { whole: 1 }),
  /** Saltos de lado a lado: con los dos pies (salto lateral) o de una pierna a la otra (patinador). */
  sideJump: f => {
    if (has(f, 'skater')) {
      const a = { x: -52, y: 16, rot: -10, leg: 4, knee: 0, kT: .92, arm: 20, elb: -30, r: { leg: -22, knee: 34, kT: 1, kS: .7, arm: 30, elb: 30 } };
      const b = { x: 52, rot: 10, leg: -22, knee: 34, kT: 1, kS: .7, arm: 30, elb: 30, r: { leg: 4, knee: 0, kT: .92, kS: 1, arm: 20, elb: -30 } };
      return front(Object.assign({ kS: 1 }, a), b, [], 'b', 0, { whole: 1, m: { x: 0, y: -14, rot: 0 } });
    }
    return front({ x: -46, y: 14, leg: 4, kT: .9, arm: 14, elb: -40 }, { x: 46 }, [['L', 'b', 'M100 380V400', 3, 2]], 'b', 0, { whole: 1, m: { x: 0, y: -34, kT: 1, arm: 30, elb: -20 } });
  },
  /** Abducción y aducción de cadera, de frente: sentado en la máquina, de pie en la polea o con banda, o tumbado de lado. */
  hipOpen: f => {
    const adduct = has(f, 'adduct');
    /* la abducción trabaja el glúteo, que se ve de espaldas; la aducción, los aductores, que se ven de frente */
    const view = adduct ? 'F' : 'B';
    if (has(f, 'machine') || has(f, 'ball')) {
      /* sentado: los muslos, hacia quien mira, se abren o se cierran contra las almohadillas */
      const closed = { leg: has(f, 'ball') ? 18 : 6, knee: has(f, 'ball') ? -18 : -6, kT: .42, arm: 10, elb: 14 };
      const open = { leg: 52, knee: -52, kT: .42, arm: 10, elb: 14 };
      const side = adduct ? -1 : 1;
      const gear = has(f, 'ball') ? [['R', 'b', 100, 262, 96, 12, 0, 1], ['L', 'b', 'M100 268V398M72 399.5H128', 6, 0], ['C', 'f', 100, 262, 17, 7]] : [['R', 'b', 100, 150, 64, 190, 0, 1], ['R', 'b', 100, 262, 96, 12, 0, 1], ['L', 'b', 'M100 268V398M72 399.5H128', 6, 0], ['on', 'f', 'T0', ['R', '', 79 - 15 * side, 286, 9, 34, 0, 1]], ['on', 'f', 'T1', ['R', '', 121 + 15 * side, 286, 9, 34, 0, 1]]];
      if (has(f, 'ball'))
        return front(open.leg ? Object.assign({}, closed, { leg: 24, knee: -24 }) : closed, { leg: 14, knee: -14 }, gear, 'b', 1, { whole: 1 });
      return front(adduct ? open : closed, adduct ? closed : open, gear, 'b', 1, { whole: 1, v: view });
    }
    if (has(f, 'side')) {
      /* tumbado de lado: sube la pierna de arriba */
      const a = { rot: -90, y: 150, arm: 150, elb: -100, leg: 0, r: { arm: 14, elb: 30, leg: 0 } };
      return front(a, { r: { arm: 14, elb: 30, leg: 38 } }, [['R', 'b', 100, 388, 300, 6, 0, 6]], 'b', 1, { nofloor: 1, whole: 1, v: view });
    }
    /* de pie: una pierna se abre (o se cruza por delante de la otra) contra la polea o la banda */
    const a = { arm: 40, elb: 20, leg: 2, r: { arm: 8, elb: 0, leg: adduct ? 34 : 2 } };
    const b = { r: { arm: 8, elb: 0, leg: adduct ? -6 : 34 } };
    const gear = has(f, 'band') ? [['link', 'f', ['S0', 79, 372], ['S1', 121, 372], 3, 4, '']] : adduct ? [beam([262, 14, 262, 398], 7, 'b'), beam([242, 399.5, 282, 399.5], 5, 'b'), ['C', 'b', 254, 376, 6.5, 5], ['link', 'b', [254, 376], ['S1', 124, 380], 1.3, 3, 's'], beam([-30, 120, -30, 398], 6, 'b')] : [beam([-30, 14, -30, 398], 7, 'b'), beam([-50, 399.5, -10, 399.5], 5, 'b'), ['C', 'b', -22, 376, 6.5, 5], ['link', 'b', [-22, 376], ['S1', 124, 380], 1.3, 3, 's']];
    return front(a, b, gear, 'b', 1, { whole: 1, v: view });
  },
};
/* las figuras ya calculadas */
const made = {};
/** La figura de un ejercicio de la librería (data/figposes dice su familia y sus variantes), o null si no tiene. */
export const figPose = n => {
  if (!(n in made)) {
    const words = (FIG_POSES[n] || '').split(' ');
    made[n] = MOVES[words[0]] ? MOVES[words[0]](words.slice(1)) : null;
  }
  return made[n];
};
