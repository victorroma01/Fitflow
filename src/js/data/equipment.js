/* ═══ data/equipment ═══
   El material con que se hacen los ejercicios, para «Equipamiento» en el Overview del día (workout/equipment): cada uno con su
   nombre y su icono. Los iconos son los archivos de src/img/equipment, que el build pasa a data/media (MEDIA.equip):
   - Los del catálogo de equipamiento del propietario (StrataFit_Equipamiento: catalogo.json y sus PNG de 192 × 120), pasados
     a WebP sin pérdida con tools/equipamiento.py. Con su nombre del catálogo, salvo donde ese nombre es el de un ejercicio
     («Curl femoral» es «Máquina de curl femoral») o la app dice otro («Barra Z», «Cajón»); si el material de la app es otro
     parecido, con el nombre de la app y el icono del catálogo que lo representa (la polea, las máquinas de press de pecho,
     la máquina asistida).
   - Los del material que el catálogo no tiene (kettlebell, anillas, TRX, remo ergómetro…), dibujados en vectorial (.svg) con
     su mismo estilo: trazo gris claro, sin color, en el mismo recuadro. «machine» es una máquina cualquiera: la llevan las
     máquinas que no tienen icono propio. La mancuerna también va dibujada: la que pidió el propietario con una captura (dos
     mancuernas a 45°, lisas, sin la textura de la del catálogo).
   Qué material lleva cada ejercicio lo dice workout/equipmap. En inglés, los nombres están en i18n/en-library.
   Define: EQUIPMENT
*/
/** El material: id → [nombre, icono (su archivo en src/img/equipment, sin la extensión)]. */
export const EQUIPMENT = {
  /* ── del catálogo, con su nombre (o uno más claro: el de la máquina, no el del ejercicio que se hace en ella) ── */
  'barbell': ['Barra', 'barbell'],
  'ez-bar': ['Barra Z', 'ez-bar'],
  'trap-bar': ['Barra trap', 'trap-bar'],
  'safety-bar': ['Barra safety', 'safety-bar'],
  't-bar': ['T-Bar', 't-bar'],
  'dumbbell': ['Mancuerna', 'dumbbell'],
  'plate': ['Disco', 'plate'],
  'bench': ['Banco', 'bench'],
  'bench-incline': ['Banco inclinado', 'bench-incline'],
  'bench-decline': ['Banco declinado', 'bench-decline'],
  'bench-press-rack': ['Soporte press banca', 'bench-press-rack'],
  'incline-bench-rack': ['Soporte banco inclinado', 'incline-bench-rack'],
  'preacher-curl': ['Banco predicador', 'preacher-curl'],
  'pull-up-bar': ['Barra de dominadas', 'pull-up-bar'],
  'smith-machine': ['Máquina Smith', 'smith-machine'],
  'leg-press': ['Prensa de piernas', 'leg-press'],
  'hack-squat-machine': ['Máquina hack squat', 'hack-squat-machine'],
  'pendulum-squat-machine': ['Máquina sentadilla péndulo', 'pendulum-squat-machine'],
  'leg-extension-machine': ['Máquina extensión de piernas', 'leg-extension-machine'],
  'leg-curl': ['Máquina de curl femoral', 'leg-curl'],
  'seated-calf-raise-machine': ['Máquina gemelo sentado', 'seated-calf-raise-machine'],
  'standing-calf-raise-machine': ['Máquina gemelo de pie', 'standing-calf-raise-machine'],
  'abduction-machine': ['Máquina de abducción', 'abduction-machine'],
  'adduction-machine': ['Máquina de aducción', 'adduction-machine'],
  'machine-hip-thrust': ['Máquina hip thrust', 'machine-hip-thrust'],
  'pec-deck-machine': ['Máquina pec deck', 'pec-deck-machine'],
  'machine-row': ['Máquina de remo', 'machine-row'],
  'one-arm-machine-row': ['Máquina de remo unilateral', 'one-arm-machine-row'],
  'seated-shoulder-press-machine': ['Máquina press hombros sentado', 'seated-shoulder-press-machine'],
  'standing-side-lateral-raise-machine': ['Máquina elevación lateral de pie', 'standing-side-lateral-raise-machine'],
  'machine-preacher-curl': ['Máquina curl predicador', 'machine-preacher-curl'],
  'seated-dip-machine': ['Máquina fondos sentado', 'seated-dip-machine'],
  'seated-crunch-machine': ['Máquina crunch sentado', 'seated-crunch-machine'],
  'ghd-machine': ['Máquina GHD', 'ghd-machine'],
  'reverse-hyperextension': ['Hiperextensión inversa', 'reverse-hyperextension'],
  'long-band': ['Banda larga', 'long-band'],
  'plate-band': ['Banda corta', 'plate-band'],
  'medball': ['Balón medicinal', 'medball'],
  'swiss-ball': ['Pelota suiza', 'swiss-ball'],
  'ab-wheel': ['Rueda de abdominales', 'ab-wheel'],
  'box': ['Cajón', 'box'],
  'step-up': ['Step', 'step-up'],
  'block': ['Bloque', 'block'],
  'plate-or-wedge': ['Placa o cuña', 'plate-or-wedge'],
  'sled': ['Trineo', 'sled'],
  'body-weight': ['Peso corporal', 'body-weight'],
  /* ── material de la app con el icono del catálogo que lo representa ── */
  'cable': ['Polea', 'cable'],
  'chest-press': ['Máquina de press de pecho', 'chest-press'],
  'incline-chest-press': ['Máquina de press inclinado', 'incline-chest-press'],
  'decline-chest-press': ['Máquina de press declinado', 'decline-chest-press'],
  'assisted-machine': ['Máquina asistida de dominadas y fondos', 'assisted-machine'],
  /* ── máquinas sin icono propio: el de una máquina cualquiera ── */
  'machine': ['Máquina', 'machine'],
  'lat-pulldown-machine': ['Máquina de jalón', 'machine'],
  'pullover-machine': ['Máquina de pullover', 'machine'],
  'shrug-machine': ['Máquina de encogimientos', 'machine'],
  'triceps-machine': ['Máquina de tríceps', 'machine'],
  'glute-machine': ['Máquina de glúteo', 'machine'],
  'back-extension-machine': ['Máquina de extensión lumbar', 'machine'],
  'rotation-machine': ['Máquina de rotación', 'machine'],
  'tibialis-machine': ['Máquina de tibial', 'machine'],
  /* ── dibujados aquí: el material que el catálogo no tiene ── */
  'squat-rack': ['Rack de sentadilla', 'squat-rack'],
  'hyper-bench': ['Banco de hiperextensiones', 'hyper-bench'],
  'captains-chair': ['Silla romana', 'captains-chair'],
  'parallel-bars': ['Paralelas', 'parallel-bars'],
  'parallettes': ['Parallettes', 'parallettes'],
  'kettlebell': ['Kettlebell', 'kettlebell'],
  'landmine': ['Landmine', 'landmine'],
  'rings': ['Anillas', 'rings'],
  'trx': ['TRX', 'trx'],
  'towel': ['Toalla', 'towel'],
  'sliders': ['Deslizadores', 'sliders'],
  'wrist-roller': ['Rodillo de muñeca', 'wrist-roller'],
  'sandbag': ['Saco de arena', 'sandbag'],
  'backpack': ['Mochila', 'backpack'],
  'weight-vest': ['Chaleco lastrado', 'weight-vest'],
  'climbing-rope': ['Cuerda de trepar', 'climbing-rope'],
  'battle-ropes': ['Cuerdas de batalla', 'battle-ropes'],
  'jump-rope': ['Comba', 'jump-rope'],
  'tire': ['Neumático', 'tire'],
  'punching-bag': ['Saco de boxeo', 'punching-bag'],
  'rower': ['Remo ergómetro', 'rower'],
  'ski-erg': ['SkiErg', 'ski-erg'],
  'air-bike': ['Assault bike', 'air-bike'],
  'bike': ['Bicicleta estática', 'bike'],
  'road-bike': ['Bicicleta', 'road-bike'],
  'treadmill': ['Cinta de correr', 'treadmill'],
  'elliptical': ['Elíptica', 'elliptical'],
  'stair-climber': ['Escaladora', 'stair-climber'],
  'pool': ['Piscina', 'pool']
};
