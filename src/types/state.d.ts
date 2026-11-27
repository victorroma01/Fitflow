/* StrataFit · la forma de los datos, para el comprobador de tipos (tools/types.js). No es código: no entra en la app.
   Dice lo mismo que docs/tecnica/estado.md, pero de manera que una máquina lo comprueba: si un módulo usa S.algo que no existe,
   o le da un valor de otro tipo, `node tools/types.js` falla. Al añadir una clave al estado, se añade aquí, en core/schema
   (su clave guardada) y en estado.md.
   Los nombres de S y W son los del programa; core/schema los traduce a las claves cortas con que se guardan. Los campos de
   dentro de cada dato (las series de un entreno, los alimentos de una comida…) ya son cortos en el programa. */

/** Un ejercicio de un día del plan. */
interface PlanExercise {
  /** nombre */
  n: string;
  /** series */
  s: number;
  /** repeticiones: mínimo y máximo (sin ellas, las de siempre: workout/targets) */
  rg?: number[];
  /** unidad si no son repeticiones: 's', 'min', 'm', 'km', 'cal' */
  u?: string;
  /** descanso, en segundos */
  r?: number;
  /** tempo */
  t?: string;
  /** bloque (superseries y triseries: los ejercicios seguidos con el mismo) */
  b?: number | string;
  /** técnica de intensidad (data/techniques) */
  tk?: string;
  /** en los programas predefinidos, la técnica del nivel avanzado (no llega a guardarse) */
  ta?: string;
  /** nombre original, si se cambió por otro (Swap) */
  o?: string;
  /** la unidad y las repeticiones originales, si el ejercicio por el que se cambió las tiene distintas (workout/targets) */
  ou?: { u?: string, rg: number[] };
  /** en un entreno a la carta (routines/ondemand), las repeticiones de cada serie: un número o 'AMRAP' (las máximas posibles) */
  rs?: (number | string)[];
  /** en un entreno a la carta, la variante de esa posición (postura, agarre o banco) */
  nt?: string;
}
/** Un día del plan; sin ejercicios, es de descanso. */
interface PlanDay {
  n: string;
  ex: PlanExercise[];
  /** 1 si es un workout personalizado (routines/builder), con su portada si la tiene */
  cu?: number;
  img?: string;
  /** la clave de su rutina, si es un entreno a la carta (routines/ondemand): su objetivo no lleva RIR */
  od?: string;
}
/** Un entreno hecho (S.logs). */
interface Log {
  /** lo pone core/repair a partir del contenido: identifica el entreno al juntar los de dos dispositivos */
  id?: string;
  /** día, 'AAAA-MM-DD' */
  d: string;
  /** nombre */
  n: string;
  /** volumen (kg) */
  v: number;
  /** series */
  s: number;
  /** minutos, sin las pausas */
  m: number;
  /** esfuerzo */
  q?: number;
  /** 'c' cardio, 'w' WOD; sin él, fuerza */
  k?: string;
  /** datos de cardio */
  c?: any;
  /** resumen */
  x?: any;
  /** nota */
  nt?: string;
  /** cuándo se guardó (ms): la marca del entreno */
  t?: number;
  /** 1 si fue en semana de descarga */
  dl?: number;
}
/** Una sesión del historial de un ejercicio: día, series [repeticiones, kg, RPE, extra (0 serie, 1 drop set, 2 rest-pause), técnica?] y la marca del entreno. */
interface HistoryEntry {
  d: string;
  s: any[][];
  t?: number;
}
/** Un alimento: nombre y lo que tiene por 100 g [kcal, hidratos, proteína, grasa, fibra, sal]. */
interface Food {
  n: string;
  b: number[];
  /** Nutri-Score ('a'…'e') y código de barras, si vienen de Open Food Facts */
  ns?: string;
  ean?: string;
}
/** Un alimento de una comida: el alimento y sus gramos. */
interface FoodItem extends Food {
  g: number;
}
/** Las comidas de un día: la lista de alimentos de cada comida (0, 1, 2…). */
type DayMeals = Record<string, FoodItem[]>;
/** Un programa propio. */
interface OwnProgram {
  n: string;
  plan: PlanDay[];
  /** cuándo se creó (ms) */
  t?: number;
  src?: 'mine' | 'guide' | 'import' | string;
  /** respuestas del creador guiado */
  o?: any;
  /** descripción */
  d?: string;
  /** semanas entre descargas (0: nunca; sin él, según el nivel) */
  dl?: number;
  lv?: string;
}
/** Un workout de «Mis workouts»: bloques de ejercicios. */
interface Routine {
  n: string;
  bl: any[];
  img?: string;
  cu?: string;
}
/** Un ejercicio creado por el usuario. */
interface CustomExercise {
  n: string;
  c: string;
  g: string;
  t: string;
  p: string[];
  s: string[];
  q: string;
}
/** Un fallo o una sugerencia enviados desde la cuenta (system/report). */
interface Report {
  id: string;
  k: string;
  a: string;
  t: string;
  ca: number;
  s?: number;
  st?: string;
  rp?: string;
  ra?: number;
  sn?: number;
  dx?: any;
}

/** El estado de la app, S (core/state). Con los nombres del programa: docs/tecnica/estado.md los explica uno a uno. */
interface State {
  /* ── navegación y plan ── */
  tab: number;
  program: number;
  noProgram?: number;
  welcomePending?: number;
  ownProgramIndex?: number;
  level?: string;
  plan: PlanDay[];
  week: number;
  selectedWeekday: number;
  selectedDay: number;
  doneDays: Record<string, boolean | number>;
  planBackup?: { sel: number, day: PlanDay } | null;
  deloadWeeks?: Record<string, number>;
  deloadDeclined?: Record<string, number>;
  deloadSheetWeek?: number;
  rotationWeek?: number;
  rotationPostponed?: number;
  /* ── seguimiento ── */
  logs: Log[];
  exerciseHistory: Record<string, HistoryEntry[]>;
  lastWeights: Record<string, number>;
  records: Record<string, { w: number, r: number, e: number, d?: string }>;
  recordCount?: number;
  exerciseNotes: Record<string, string>;
  weightLog: { d: string, w: number }[];
  measures: { d: string, v: Record<string, number> }[];
  achievements?: Record<string, any>;
  stagnationDismissed?: Record<string, number>;
  weighReminder?: { n: number, u: string, t: number, sh?: string, sn?: string, c?: string };
  reports?: Report[];
  /* ── lo creado por el usuario ── */
  ownPrograms: OwnProgram[];
  routines: Routine[];
  customExercises: CustomExercise[];
  /* ── nutrición ── */
  nutritionGoals: { k: number, c: number, p: number, f: number, n: number, dt?: number, man?: number };
  /** edad, altura (cm), peso (kg), sexo ('M' o 'F'), actividad y objetivo; los números, como número o como el texto que se escribió */
  biometrics: { age?: any, h?: any, w?: any, sex?: string, act?: any, goal?: any };
  meals: Record<string, DayMeals>;
  myFoods: Food[];
  savedDishes: { n: string, it: FoodItem[] }[];
  mealTemplates?: Record<string, DayMeals>;
  frequentFoods?: Record<string, { c: number, t: number, b: number[], g?: number }>;
  water: Record<string, number>;
  barcodeCache?: Record<string, { n: string, b: number[], t: number, ns?: string }>;
  /* ── apariencia y ajustes ── */
  theme: string;
  accent?: number;
  accentColor?: string;
  glassLevel?: number;
  glassOn?: number;
  glassLastLevel?: number;
  reduceMotion?: number;
  startTab?: number;
  tourSeen?: number;
  logRpe?: number;
  migrationsDone?: number;
  iconBadge?: number;
  units?: string;
  defaultRest: number;
  autoRest?: number;
  sound?: number;
  soundTone?: number;
  volume?: number;
  vibration?: number;
  keepAwake?: number;
  profile: { img?: string, pc?: number };
  wodConfig?: Record<string, any>;
  weightRange?: number;
  /* ── copias de seguridad ── */
  lastBackupDate?: number;
  cloudBackup?: { at: number, lg: number, md: number };
  backupNoticeOff?: number;
  /* ── claves de versiones anteriores, que core/repair borra al arrancar ── */
  dt?: any;
  v?: any;
  notif?: any;
}

/** S, para leer o poner una clave cuyo nombre se calcula (S[stateName(clave guardada)]): ahí el comprobador no sabe cuál es. */
type StateByKey = Record<string, any>;

/** Una serie del entreno en curso. */
interface WorkoutSet {
  /** repeticiones y peso: un número o el texto que hay escrito en su casilla */
  r: any;
  w: any;
  /** hecha (0 o 1 al crearla; true o false al marcarla) */
  ok: number | boolean;
  /** esfuerzo (RPE): un número o el texto de su casilla */
  q?: any;
  /** técnica de la serie */
  k?: string;
  /** 1: fila del drop set; 2: bloque del rest-pause */
  t?: number;
  /** 1 si el peso es sugerido y aún no se ha registrado */
  ws?: number;
  /** el ejercicio con el que se hizo, si después se cambió por otro */
  n?: string;
}
/** El entreno en curso, W (core/state); solo existe durante un entreno. */
interface Workout {
  startedAt: number;
  restEndsAt: number;
  pausedAt?: number;
  sets: WorkoutSet[][];
  openPanels: Record<string, any>;
  folded?: Record<string, any>;
  warmupsDone?: Record<string, any>;
  restAfter?: [number, number];
  lastBeep?: number;
  lastCurrent?: number;
  deload?: number;
}
