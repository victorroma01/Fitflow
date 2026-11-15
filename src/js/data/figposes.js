/* ═══ data/figposes ═══
   Las posturas de cada ejercicio para su figura (extras/rig explica cómo se escribe una postura): ejercicio → { v: vista
   ('S' de perfil, 'F' de frente), a: postura de inicio, b: lo que cambia en la del final, props: material, up: cuál de las
   dos es el final del esfuerzo (la subida va más rápida que la bajada), at: en qué momento se pinta la miniatura }.
   Material: ['bar', radio del disco], ['bench', desde x, hasta x, altura del asiento] y ['db'] (mancuernas).
   De momento es una muestra con cuatro ejercicios (V1.1, pendiente de aprobar).
   Define: FIG_POSES
*/
export const FIG_POSES = {
  'Press banca': {
    v: 'S',
    a: { at: 'hip', x: 200, y: 281, lean: -90, neck: -10, foot: [297, 385], kb: -1, grip: [232, 85], fa: 90, eb: 1 },
    b: { grip: [130.5, 108], fa: 88 },
    props: [['bench', -6, 236, 307], ['bar', 34]],
    up: 'a',
    at: .55,
  },
  Sentadilla: {
    v: 'S',
    a: { lean: 3, neck: -2, hip: 3, knee: 0, grip: [77, 67], fa: 178, kF: .8, eb: -1 },
    b: { lean: 40, neck: -24, hip: 124, knee: 114 },
    props: [['bar', 34]],
    up: 'a',
    at: 1,
  },
  'Curl bíceps barra': {
    v: 'S',
    a: { lean: 0, neck: 0, hip: 0, knee: 0, sh: 7, el: 13 },
    b: { sh: 9, el: 138 },
    props: [['bar', 17]],
    up: 'b',
    at: .8,
  },
  'Elevaciones laterales': {
    v: 'F',
    a: { arm: 0 },
    b: { arm: 78 },
    props: [['db']],
    up: 'b',
    at: 1,
  },
};
