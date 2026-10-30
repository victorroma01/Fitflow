/* ═══ data/levels ═══
   Datos de niveles de programa (principiante, intermedio, avanzado).
   Define: LEVEL_KEYS, LEVEL_NAMES, LEVEL_COLORS, LEVEL_SUMMARY, LEVEL_DETAILS, LEVEL_PROGRAM_NOTES, LEVEL_SWAPS, LEVEL_OVERRIDES, LEVEL_EXTRA_DAYS, LEVEL_LAYOUTS
*/
export const LEVEL_KEYS = ['ini', 'int', 'ava'];
export const LEVEL_NAMES = { ini: 'Principiante', int: 'Intermedio', ava: 'Avanzado' };
export const LEVEL_COLORS = { ini: '#34d399', int: '#fbbf24', ava: '#a78bfa' };
export const LEVEL_SUMMARY = { ini: 'Menos volumen y ejercicios guiados', int: 'El plan base, equilibrado', ava: 'Más volumen, cargas altas y densidad' };
export const LEVEL_DETAILS = { ini: 'Menos series (2-3), 8-15 repeticiones, máquinas y variantes guiadas en lugar de ejercicios técnicos, sin superseries y descansos de hasta 2 min.',
  int: 'El programa base: volumen medio, rangos de fuerza e hipertrofia y descansos largos en los básicos.',
  ava: 'Más series en los básicos, rangos más pesados (4-6), descansos de hasta 4 min, superserie final y variantes más exigentes.' };
export const LEVEL_PROGRAM_NOTES = [{ ini: '4 días: pecho, espalda, piernas y un día de hombros y brazos. 2-3 series por ejercicio, 8-12 repeticiones y cada grupo una vez por semana con descanso de sobra.', ava: 'Mismo reparto de 5 días con más series en los básicos (hasta 5), rangos de 4-6 repeticiones en los pesados, descansos de 3-4 min y superseries al final de cada día.' },
  { ini: '4 días: carrera con SkiErg, fuerza funcional, WOD y simulación Hyrox, con menos series, movimientos escalados (goblet squat, single unders) y sin carrera larga.', ava: '6 días: añade una sesión de zona 2 y core, más series en intervalos y estaciones, carrera larga de 75 min y remo a ritmo Hyrox.' },
  { ini: '4 días (torso y pierna dos veces por semana) con 2-3 series por ejercicio, 8-12 repeticiones, máquinas y variantes guiadas.', ava: '5 días: añade un día de brazos y hombros, más series y descansos largos en los básicos y superseries al final de cada sesión.' },
  { ini: '3 días (días 1, 3 y 5): Push, Pull y Legs una vez por semana con 2-3 series por ejercicio y mucho margen para recuperar.', ava: '6 días con cada grupo 2 veces por semana: más series en los básicos, rangos pesados en el día A y superseries para ganar densidad.' },
  { ini: '4 días: fuerza inferior, fuerza superior, metabólico Hyrox y rodaje suave. Sin intervalos duros hasta coger base.', ava: '6 días: añade una sesión de espalda, hombros y core, intervalos de 400 m con más series y rodaje de 65 min.' }];
export const LEVEL_SWAPS = { ini: { 'Dominadas': 'Dominadas asistidas en máquina', 'Press militar barra': 'Press hombro máquina', 'Press inclinado barra': 'Press inclinado mancuernas', 'Remo con barra': 'Remo en máquina', 'Peso muerto': 'Peso muerto rumano', 'Sentadilla búlgara': 'Prensa', 'Fondos': 'Flexiones', 'Fondos en paralelas': 'Fondos asistidos en máquina', 'Elevación de piernas colgado': 'Crunch inverso', 'Press francés': 'Extensión tríceps polea', 'Thruster': 'Goblet squat', 'Toes to bar': 'Elevación de rodillas colgado', 'Double unders': 'Single unders', 'Burpee broad jump': 'Burpees', 'Turkish get-up': 'Plancha', 'Lunges con sandbag 100 m': 'Zancada caminando' },
  ava: { 'Dominadas': 'Dominadas lastradas', 'Fondos': 'Fondos en paralelas', 'Zancadas': 'Sentadilla búlgara', 'Series 1 km': 'Carrera 1 km ritmo Hyrox', 'Remo 1000 m': 'Remo 1000 m ritmo Hyrox', 'Crunch en polea': 'Rueda abdominal', 'Elevaciones laterales': 'Elevaciones laterales en polea' } };
export const LEVEL_OVERRIDES = { 'Plancha': { rg: [30, 30], u: 's', r: 60 }, 'Single unders': { rg: [60, 60] }, 'Goblet squat': { rg: [8, 10] }, 'Elevación de rodillas colgado': { rg: [8, 10] } };
export const LEVEL_EXTRA_DAYS = { hb: 'Hombros y brazos:Press hombro mancuernas*3/8-10@120,Elevaciones laterales*2/12-15@60,Face pull*2/15-20@60,Curl con barra Z*2/10-12@75,Extensión tríceps polea*2/10-12@75',
  z2: 'Zona 2 y core:Rodaje suave zona 2*1/40min@60,Plancha*3/60s@45,Plancha lateral*3/40s@30,Hollow hold*3/30s@30',
  bh: 'Brazos y hombros:Curl con barra Z*4/8-10@75,+Press francés*4/8-10@75,Elevaciones laterales en polea*4/12-15@60,Curl martillo*3/10-12@60,+Extensión sobre la cabeza*3/10-12@60,Pájaros en máquina*3/12-15@60',
  cx: 'Espalda, hombros y core:Jalón agarre neutro*3/8-12@90,Press hombro mancuernas*3/8-10@90,Remo en polea baja*3/8-12@90,Elevaciones laterales*3/12-15@60,Rueda abdominal*3/10-15@60,Plancha lateral*3/40s@30' };
export const LEVEL_LAYOUTS = [{ ini: [0, 1, -1, 4, 'hb', -1, -1], ava: null }, { ini: [0, 1, -1, 3, 4, -1, -1], ava: [0, 1, 'z2', 3, 4, 5, -1] }, { ini: null, ava: [0, 1, -1, 3, 4, 'bh', -1] }, { ini: [0, -1, 1, -1, 2, -1, -1], ava: null }, { ini: [0, -1, 2, -1, 4, 5, -1], ava: [0, 1, 2, 'cx', 4, 5, -1] }];
