/* ═══ data/ondemand ═══
   Entrenos a la carta (V1.0.4): diez rutinas sueltas de un día, del propietario (StrataFit_Rutinas_v2, 26-11-2026), que se
   empiezan desde la tarjeta de Workout sin tocar el programa (routines/ondemand). Cada una: su clave estable (k), su nombre
   (el mismo en español y en inglés), sus grupos, su nivel si la fuente lo da (lv: ini, ava) y sus bloques en orden (A, B…).
   Un bloque es un ejercicio suelto, una superserie (2), una triserie (3) o una serie gigante (4); sus rondas son las series
   de cada ejercicio. Cada ejercicio: el de la librería, las repeticiones de cada serie («12/10/8/6»; AMRAP, las máximas
   posibles), el tempo («3/0/1/0»; vacío si la fuente no lo da: en el entreno, «Libre») y, si la lleva, la variante de esa
   posición (postura, agarre o banco), sin cambiar el ejercicio en el resto de la app. Los descansos no los da la fuente:
   son los de la app. El calentamiento lleva además su subtítulo (t) y su descripción (d).
   Back Builder sale de una captura que puede no estar completa (acaba en Face pull); su tempo de E no se veía.
   Define: ONDEMAND
*/
/** @type {{ k: string, n: string, g: string[], lv?: string, t?: string, d?: string, bl: string[][][] }[]} */
export const ONDEMAND = [
  { k: 'stratafit-routine-01', n: 'Armageddon', g: ['Bíceps', 'Tríceps', 'Antebrazos'], lv: 'ava', bl: [
      /* A · superserie */ [['Press cerrado en Smith', '12/10/8/6', '4/0/1/0'], ['Curl Zottman', '12/10/8/6', '4/0/1/0', 'En banco inclinado']],
      /* B · superserie */ [['Rompecráneos mancuernas', '10/10/10/10', '3/0/1/0'], ['Curl con barra Z', '10/10/10/10', '3/0/1/0', 'Agarre medio, semisupino']],
      /* C · triserie */ [['Extensión sobre la cabeza con cuerda', '10/10/10', '3/0/1/0'], ['Extensión con cuerda', '12/12/12', '3/0/1/0'], ['Flexiones diamante', 'AMRAP/AMRAP/AMRAP', '']],
      /* D · triserie */ [['Curl inverso', '10/10/10', '3/0/1/0', 'Con barra Z'], ['Curl con barra Z', '12/12/12', '3/0/1/0', 'Agarre medio, semisupino'], ['Curl martillo', '15/15/15', '', 'Sentado']]
    ] },
  { k: 'stratafit-routine-02', n: 'Shoulder Shredder', g: ['Hombros'], lv: 'ava', bl: [
      /* A · suelto */ [['Press militar barra', '10/8/6/12', '4/0/1/0']],
      /* B · triserie */ [['Press Arnold', '12/12/12/12', '4/0/1/0'], ['Press hombro mancuernas', 'AMRAP/AMRAP/AMRAP/AMRAP', ''], ['Elevaciones laterales', '20/20/20/20', '']],
      /* C · triserie */ [['Remo posterior con mancuernas', '12/12/12/12', '3/1/1/0', 'Pecho apoyado en banco inclinado'], ['Remo posterior con mancuernas', '12/12/12/12', '2/0/1/2', 'Pecho apoyado en banco inclinado'], ['Remo posterior con mancuernas', '30/30/30/30', '', 'Pecho apoyado en banco inclinado; recorrido parcial, a balanceos']],
      /* D · suelto */ [['Elevaciones laterales en máquina', '100', '', 'De pie']]
    ] },
  { k: 'stratafit-routine-03', n: 'Chest Crusher', g: ['Pecho'], bl: [
      /* A · suelto */ [['Press inclinado barra', '12/10/8/6', '']],
      /* B · superserie */ [['Pec deck', '10/10/10/10', '3/0/3/0'], ['Pec deck', '10/10/10/10', '3/0/1/0']],
      /* C · serie gigante */ [['Press inclinado mancuernas', '10/10/10/10', '4/0/1/0', 'Agarre prono'], ['Press declinado mancuernas', 'AMRAP/AMRAP/AMRAP/AMRAP', '', 'Agarre prono'], ['Press banca mancuernas', 'AMRAP/AMRAP/AMRAP/AMRAP', '', 'Agarre prono'], ['Fondos en banco', 'AMRAP/AMRAP/AMRAP/AMRAP', '']]
    ] },
  { k: 'stratafit-routine-04', n: 'Leg Destroyer', g: ['Cuádriceps', 'Isquios y glúteos', 'Gemelos'], bl: [
      /* A · suelto */ [['Sentadilla en Smith', '8/8/8/8', '3/0/1/0']],
      /* B · suelto */ [['Hack squat', '12/12/12/12', '3/0/1/0', 'Pies a media anchura']],
      /* C · suelto */ [['Sentadilla Pendulum', '12/12/12', '3/0/1/0', 'Pies a media anchura']],
      /* D · suelto */ [['Curl femoral', '10/10/10', '', 'Tumbado, puntas de los pies hacia dentro']],
      /* E · suelto */ [['Peso muerto rumano', '12/12/12', '']],
      /* F · suelto */ [['Prensa', '20/20/20', '', 'Pies altos en la plataforma']],
      /* G · suelto */ [['Gemelo de pie', '10/10/10', '']],
      /* H · suelto */ [['Gemelo sentado', '50/50', '']]
    ] },
  { k: 'stratafit-routine-05', n: 'Arm Assault', g: ['Bíceps', 'Tríceps'], bl: [
      /* A · superserie */ [['Rompecráneos mancuernas', '10/8/8/6/6', '4/0/1/0', 'En banco declinado'], ['Curl martillo en banco inclinado', '10/8/8/6/6', '4/0/1/0']],
      /* B · triserie */ [['Fondos en máquina sentado', '10/10/10/10', '3/1/1/0'], ['Extensión sobre la cabeza con cuerda', '12/12/12/12', '3/0/1/0'], ['Extensión con cuerda', '15/15/15/15', '2/0/1/1']],
      /* C · triserie */ [['Curl inverso', '10/10/10/10', '3/1/1/0', 'Con barra Z'], ['Curl martillo', '12/12/12/12', '3/0/1/0'], ['Curl spider', '15/15/15/15', '2/0/1/1']]
    ] },
  { k: 'stratafit-routine-06', n: 'Pull Essentials', g: ['Espalda', 'Hombros', 'Bíceps'], lv: 'ava', bl: [
      /* A · superserie */ [['Pájaros en banco inclinado', '12/12/12/12/12', '3/0/3/0'], ['Pájaros mancuernas', '30/30/30/30/30', '']],
      /* B · superserie */ [['Pullover mancuerna', '12/12/12/12/12', '3/0/3/0'], ['Remo con apoyo en pecho', '15/15/15/15/15', '', 'Agarre neutro']],
      /* C · suelto */ [['Remo mancuerna', '15/15/15', '2/0/1/2']],
      /* D · superserie */ [['Curl martillo', '10/10/10', '3/0/2/0', 'Sentado'], ['Curl en banco inclinado', '15/15/15', '2/0/1/0']]
    ] },
  { k: 'stratafit-routine-07', n: 'Arm Overload', g: ['Bíceps', 'Tríceps'], bl: [
      /* A · triserie */ [['Curl con supinación completa', '10/10/10/10', '3/0/3/0', 'Estilo Poliquin, de pie'], ['Curl Zottman', '12/12/12/12', '3/1/1/1', 'En banco inclinado'], ['Curl spider', '20/20/20/20', '']],
      /* B · triserie */ [['Rompecráneos mancuernas', '10/10/10/10', '3/0/3/0', 'En banco inclinado (press francés con mancuernas)'], ['Rompecráneos mancuernas', '12/12/12/12', '3/1/1/1'], ['Extensión sobre la cabeza', '20/20/20/20', '2/0/1/0', 'De pie']],
      /* C · superserie */ [['Curl con mancuernas', '20/20/20/20', '', 'Estilo Commerford, de pie'], ['Fondos en banco', 'AMRAP/AMRAP/AMRAP/AMRAP', '']]
    ] },
  { k: 'stratafit-routine-08', n: 'Push Essentials', g: ['Pecho', 'Hombros', 'Tríceps'], lv: 'ava', bl: [
      /* A · serie gigante */ [['Press Arnold', '8/8/8/8/8', '3/0/3/0'], ['Press inclinado mancuernas', '12/12/12/12/12', '3/0/1/0'], ['Press banca mancuernas', '15/15/15/15/15', '2/0/1/0'], ['Flexiones diamante', 'AMRAP/AMRAP/AMRAP/AMRAP/AMRAP', '']],
      /* B · triserie */ [['Elevaciones frontales', '12/12/12', '3/0/3/0', 'Agarre prono'], ['Aperturas inclinadas', '12/12/12', '3/0/2/0', 'Agarre prono'], ['Rompecráneos mancuernas', '15/15/15', '', 'A una mano, hacia el hombro contrario; tumbado en banco plano']]
    ] },
  { k: 'stratafit-routine-09', n: 'Back Builder', g: ['Espalda', 'Hombros'], bl: [
      /* A · suelto */ [['Remo con barra agarre supino', '12/10/8/6/6', '3/0/1/0']],
      /* B · suelto */ [['Remo alto en máquina', '10/10/10/10', '3/0/1/0']],
      /* C · suelto */ [['Remo mancuerna', '10/10/10/10', '']],
      /* D · suelto */ [['Jalón con brazos rectos con cuerda', '12/12/12/12', '']],
      /* E · suelto */ [['Face pull', '12/12/12/12/12/12/12', '']]
    ] },
  { k: 'stratafit-routine-10', n: 'Dynamic Warm-Up', g: ['Cuerpo completo'], lv: 'ini', t: 'Calentamiento dinámico', d: 'Calentamiento dinámico de cuerpo completo para mejorar la movilidad articular, activar la musculatura y preparar el cuerpo para el entrenamiento de fuerza o cardiovascular.', bl: [
      /* A · suelto */ [['Inchworm', '5', '']],
      /* B · suelto */ [['Zancada con rotación torácica', '5', '']],
      /* C · suelto */ [['Rodilla al pecho con alcance', '5', '']],
      /* D · suelto */ [['Talón al glúteo con alcance', '5', '']],
      /* E · suelto */ [['Saltos de gemelo', '30', '']]
    ] }
];
