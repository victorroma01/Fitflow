/* ═══ data/figposes ═══
   Las posturas de cada ejercicio para su figura (extras/rig explica cómo se escribe una postura): ejercicio → { v: vista
   ('S' de perfil, 'F' de frente), a: postura de inicio, b: lo que cambia en la del final, props: material, up: cuál de las
   dos es el final del esfuerzo (la subida va más rápida que la bajada), at: en qué momento se pinta la miniatura }.
   Material: ['bar', radio del disco] (barra con discos), ['bench', desde x, hasta x, altura del asiento] y ['db'] (mancuernas).
   De momento es una muestra (V1.1, pendiente de aprobar): cuatro ejercicios y tres variantes suyas, que comparten postura y
   cambian el material o dónde va la barra.
   Define: BENCH, CURL, SQUAT, variant, FIG_POSES
*/
/* el press de banca: tumbado, los pies en el suelo y los antebrazos verticales bajo el peso */
const BENCH = {
  v: 'S',
  a: { at: 'hip', x: 200, y: 281, lean: -90, neck: -10, foot: [297, 385], kb: -1, grip: [232, 85], fa: 90, eb: 1 },
  b: { grip: [130.5, 108], fa: 88 },
  props: [['bench', -6, 236, 307], ['bar', 34]],
  up: 'a',
  at: .55,
};
/* el curl de pie: el brazo pegado al costado y solo se dobla el codo */
const CURL = {
  v: 'S',
  a: { lean: 0, neck: 0, hip: 0, knee: 0, sh: 7, el: 13 },
  b: { sh: 9, el: 138 },
  props: [['bar', 17]],
  up: 'b',
  at: .8,
};
/* la sentadilla: los pies quietos, cadera y rodillas a la vez; las manos sujetan la barra sobre la espalda */
const SQUAT = {
  v: 'S',
  a: { lean: 5, neck: -4, hip: 5, knee: 0, grip: [77, 67], fa: 178, kF: .8, eb: -1 },
  b: { lean: 36, neck: -22, hip: 120, knee: 110 },
  props: [['bar', 34]],
  up: 'a',
  at: 1,
};
/* una variante: la misma postura con otro material u otro apoyo de la barra */
const variant = (base, change) => Object.assign({}, base, change);
export const FIG_POSES = {
  'Press banca': BENCH,
  'Press banca mancuernas': variant(BENCH, { props: [['bench', -6, 236, 307], ['db']] }),
  Sentadilla: SQUAT,
  /* la barra, por delante, sobre los hombros: codos altos y el tronco más derecho */
  'Sentadilla frontal': variant(SQUAT, {
    a: { lean: 3, neck: -2, hip: 3, knee: 0, grip: [119.5, 69], fa: -90, kF: .57, eb: 1 },
    b: { lean: 26, neck: -16, hip: 110, knee: 116 },
  }),
  'Curl bíceps barra': CURL,
  'Curl con mancuernas': variant(CURL, { props: [['db']] }),
  'Elevaciones laterales': {
    v: 'F',
    a: { arm: 0 },
    b: { arm: 78 },
    props: [['db']],
    up: 'b',
    at: 1,
  },
};
