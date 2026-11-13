# Qué guarda StrataFit

Todo lo que la app recuerda está en el objeto `S` (`core/state`), que se guarda con `saveState()` (`core/persist`): el núcleo en la clave
`ff` de localStorage y las colecciones que más crecen (entrenos, historial y comidas) en partes propias, para escribir solo lo que
cambia. Desde la V1.0.2 esas partes viven en IndexedDB (I-04), que admite mucho más que los unos 5 MB de localStorage; la primera vez
que se abre la versión nueva pasan allí solas. Una acción puede decir qué partes ha tocado (`saveState('core')`,
`saveState(mealsPart(día))`): así solo esas se pasan a texto, y poco después se repasan todas por si acaso (I-10).
Desde la V1.0.2, en el programa cada clave de `S` y de `W` tiene un nombre que dice lo que guarda (`S.selectedDay`, `W.restEndsAt`),
pero se guarda con su clave corta de siempre (`sel`, `re`): en el móvil, en Firebase y en las copias de seguridad. `core/schema` es
el único módulo que conoce las dos y traduce al leer y al guardar, así que las claves guardadas **no se renombran** sin una
migración; un nombre del programa, en cambio, se puede mejorar cambiando solo `core/schema` y el código. Los campos de dentro de
cada dato (las series de un entreno, los alimentos de una comida…) siguen con sus claves cortas, descritas aquí.
`core/repair` deja el estado válido al arrancar y tras cada sincronización. Este documento es el diccionario de datos; si añades
una clave, añádela aquí y en `core/schema` (y, si es del dispositivo y no de la cuenta, en `LOCAL_ONLY` de `cloud/docs`).

Desde la V1.0.0 todo se sincroniza con Firebase ([Servidor: Firebase](backend.md)): el núcleo en `data/core`, los entrenos y el
historial por año, las comidas por mes, las preferencias en el perfil y la foto en su documento privado. No hay datos personales.

## Claves de almacenamiento (`Store.K`, `core/store`)

| Clave | Contenido |
|---|---|
| `ff` (`app`) | Núcleo del estado `S`: todo menos `logs`, `hist` y `meals`, que quedan como el nombre de su parte (`"logs": "ff:logs"`), más la marca `_parts` (2: las partes están en IndexedDB; 1: en localStorage, como hasta la V1.0.1 o si el navegador no tiene IndexedDB) y, con 2, `_pk`: la lista de partes que tiene que haber. Si al arrancar falta alguna o no se pueden leer, la app no guarda ni sincroniza nada y lo avisa (con «Reintentar» y «Bajar de mi cuenta»). Un `ff` sin la marca (el estado entero de la 1.20 y anteriores) no se lee: los datos de la serie de prueba no se migran. |
| `ff:logs` | Parte: `S.logs`. |
| `ff:hist` | Parte: `S.exerciseHistory` (guardado como `hist`). |
| `ff:meals:AAAA-MM` | Parte: los días de `S.meals` de ese mes (`ff:meals:otros` para claves que no son fechas). Un mes sin comidas no tiene parte. |
| `ffw` (`wip`) | Entreno en curso (`W` y el día), para reanudarlo si se cierra la app. |
| `ffpre` (`pre`) | Fecha del estado anterior a la última restauración de una copia (`{ t, v, a: 1 }`; permite deshacerla durante 30 días). La copia, `{ t, v, s, w }`, va aparte (`asideSet` de `core/persist`): en IndexedDB o, sin ella, en `ffaside:pre`. Hasta la V1.0.1 iba entera aquí, y así se sigue leyendo. |
| `ffrs` (`rs`) | Resumen pendiente de mostrar tras restaurar. |
| `fferr` (`err`) | Últimos 30 errores registrados en este dispositivo (`core/errors`). No es un dato del usuario. |
| `ffbad` (`bad`) | Copia de un estado que no se pudo leer al arrancar, apartada antes de empezar de cero. |
| `ffver` (`ver`) | Última versión de la app abierta en este dispositivo (para enseñar las novedades tras actualizar). |
| `ffseen` (`seen`) | Versión cuyas novedades ya se enseñaron, para no repetirlas. |
| `fficon` (`icon`) | 1 cuando ya se dio por visto el aviso del icono nuevo en el iPhone (`system/iconnotice`, F-48). |
| `ffinst` (`inst`) | Versión con la que empezó la app en este dispositivo (V1.0.1); si ya tenía otra, esa, y `0` si era anterior a la 1.19.0. Sirve para saber si el icono de la pantalla de inicio es el de antes del logo nuevo. |
| `ffacct` (`acct`) | Sesión de la cuenta: `{ uid, u: usuario, it: token de sesión, rt: token de renovación, exp, x: 1 si caducó, mc: 1 o 2 si hay que cambiar una contraseña temporal }` (`cloud/session`). No se sincroniza. |
| `ffown` (`own`) | uid de la cuenta cuyos datos hay en el móvil. Si entra otra, se borran antes de leer el estado. |
| `ffsync` (`sync`) | Sincronización (`cloud/sync`): `{ dev: id del dispositivo, base: { parte: { r: versión, h: huellas de cada elemento } }, lt: último cambio local por tipo, pt: de las preferencias, fresh: 1 tras entrar, last: última sincronización }`. |
| `fflgn` (`lgn`) | Intentos fallidos de entrar `{ n, t }`, para la espera creciente (`account/login`). |
| `ffspace` (`space`) | Cuándo se avisó por última vez de que queda poco espacio (`system/space`, I-04): como mucho, una vez a la semana. No se sincroniza. |

En IndexedDB: `ffdata` (almacén `parts`: las partes del estado, con las mismas claves `ff:logs`, `ff:hist` y `ff:meals:AAAA-MM`, su
texto JSON tal cual; almacén `aside`: lo grande que no es del estado, como la copia previa a restaurar) y `ffsnap` (copias automáticas diarias, las 7 últimas; se borran al cerrar sesión). La base `ffph` de las
fotos de progreso de la serie de prueba se borra al arrancar.

## El estado `S`

### Navegación y plan

| Clave guardada (nombre en el programa) | Tipo | Qué es |
|---|---|---|
| `tab` | número | Pestaña abierta: 0 Workout, 1 Nutrición, 2 Dashboard, 3 Perfil. |
| `prog` (`program`) | número | Programa predefinido activo (índice en `PROGRAMS`). |
| `np` (`noProgram`) | 1 | Sin programa elegido todavía (una cuenta nueva, I-24): el plan es una semana de descanso y Workout pide «Seleccionar programa». Lo pone el registro (`markNewAccount`) y lo quita elegir un programa (predefinido, propio o importado). |
| `nw` (`welcomePending`) | 1 | Bienvenida por ver (una cuenta nueva, I-23: `system/welcome`). Se quita al guardar los datos biométricos. |
| `cpi` (`ownProgramIndex`) | número | Programa propio activo (índice en `cp`); `-1` si el activo es uno predefinido. |
| `lv` (`level`) | `'ini'` \| `'int'` \| `'ava'` | Nivel del programa (principiante, intermedio, avanzado). |
| `plan` | día[] | Los días del plan: `[{ n: nombre, ex: [ejercicio del plan] }]`; un día sin ejercicios es descanso. Con 7 días es la semana; con otra longitud es un ciclo que sigue de una semana a otra (Push Pull Leg de 10 días, Full Body de 6: `workout/week`). |
| `wk` (`week`) | número | Semana en curso (empieza en 1). |
| `sl` (`selectedWeekday`) | 0-6 | Día elegido de la semana. No se sincroniza (`LOCAL_ONLY`). |
| `sel` (`selectedDay`) | número | Día del plan que le toca a `sl` en la semana `wk` (índice en `plan`; `syncSel`). |
| `done` (`doneDays`) | `{ 'semana-díaDeLaSemana': true }` | Días completados (el día es el de la semana, 0-6). Al completar uno se elige el siguiente sin completar (`advanceDay`, F-41). |
| `pbk` (`planBackup`) | `{ sel, day }` \| null | Día original guardado al lanzar un workout propio sobre el plan (se restaura al terminar). |
| `dl` / `dq` (`deloadWeeks` / `deloadDeclined`) | `{ semana: 1 \| 0 }` | Semanas de descarga activadas (1) u omitidas (0) a mano / en las que se dijo «Ahora no» a la sugerencia por esfuerzo (`workout/deload`). |
| `dls` (`deloadSheetWeek`) | número | Última semana de descarga cuya hoja de inicio ya salió. |
| `rw` / `rq` (`rotationWeek` / `rotationPostponed`) | número | Semana de la última rotación de ejercicios (o del inicio del plan) / en la que se aplazó la propuesta (`programs/rotation`). |

**Ejercicio del plan:** `{ n: nombre, s: series, rg: [mín, máx], u?: unidad ('s', 'min', 'm', 'km', 'cal'), r?: descanso en s,
t?: tempo, b?: bloque (superseries y triseries: los ejercicios seguidos con el mismo `b`; el `r` del último es el descanso de la
ronda, y si no tiene, 2:30), tk?: técnica de intensidad (`DS`, `RP`, `SS`, `CL`, `PAR`, `MYO`, `PRE`, `POST`, `PIR`,
`PIR+DS`, `PIR+PAR`: `data/techniques`), o?: nombre original si se cambió (swap), img?/cu?: portada propia }`. En los programas
predefinidos, `ta` es la técnica del nivel avanzado; `programs/levels` la aplica y la quita, y no llega a guardarse.

**Serie del entreno en curso** (`W.x[ejercicio][serie]`): `{ r: reps, w: kg, ok, q?: esfuerzo (RPE, solo con `rpe`), k?: técnica de
la serie, t?: 1 fila del drop set, 2 bloque del rest-pause, ws?: 1 si el peso es sugerido (del historial o de la serie anterior) y aún
no registrado, n?: el ejercicio con el que se hizo, si después se cambió por otro (Swap): al guardar va al historial de ese }`. La etiqueta que se ve (`setLabel`) no se guarda: WKT en las series de trabajo, DS o RP en la fila extra y la
abreviatura en el resto de técnicas; la serie principal de un drop set sigue llevando `k: 'DS'`.
`W.dl = 1` en la semana de descarga. `W.ri` es la serie que empezó el descanso en curso y `W.re`, cuándo acaba. El orden en que se
hacen las series (por rondas dentro de un bloque) lo da `workout/order`; no se guarda.

**Técnicas** (`data/techniques`): `TECHNIQUES[código] = [nombre, cómo se hace, qué hace la app con ella]`, sin prototipo; los dos
últimos textos son los de la ventana que se abre al tocar la etiqueta de la serie (F-11).

### Registros

| Clave guardada (nombre en el programa) | Tipo | Qué es |
|---|---|---|
| `logs` | registro[] | Entrenos hechos: `{ id, d: 'AAAA-MM-DD', n, v: volumen kg, s: series, m: minutos (sin las pausas), q?: esfuerzo, k?: 'c' cardio \| 'w' WOD, c?: datos de cardio, x?: resumen, nt?: nota, t?: marca del entreno }`. El `id` (lo pone `core/repair` a partir del contenido) identifica cada entreno al juntar los de dos dispositivos. `t` (desde la V1.0.3, en los de fuerza) es cuándo se guardó, en milisegundos: la llevan también sus series en `hist`, y así al borrar el registro se borran con él (`dashboard/history`). |
| `hist` (`exerciseHistory`) | `{ ejercicio: [{ d, s: [[reps, kg, rpe, extra, técnica?]], t? }] }` | Historial por ejercicio, el más reciente primero, completo (hasta M8 se quedaba en las 60 últimas sesiones de cada ejercicio). `extra`: 0 serie, 1 drop set, 2 rest-pause; la técnica, si no fue una serie normal. `t`: la marca del entreno que las guardó (la de su registro en `logs`). Qué serie cuenta para las marcas (1RM estimado, récords, gráficas) lo dice `core/calc` (`liftScore`): con peso, de 1 a 30 repeticiones y sin las filas extra; los ejercicios que se miden en tiempo o distancia no tienen marcas. |
| `last` (`lastWeights`) | `{ ejercicio: kg }` | Último peso usado (para rellenar). |
| `pr` (`records`) | `{ ejercicio: { w, r, e } }` | Mejores marcas (peso, repeticiones, 1RM estimado). |
| `pc` (`recordCount`) | número | Récords batidos en total (para logros). |
| `notes` (`exerciseNotes`) | `{ ejercicio: texto }` | Notas por ejercicio. |
| `wl` (`weightLog`) | `[{ d, w }]` | Registro de peso corporal. |
| `ms` (`measures`) | `[{ d, v: { ci, br, pe… } }]` | Medidas corporales (cm). |
| `ach` (`achievements`) | `{ id: valor }` | Logros conseguidos (ver `ACHIEVEMENTS`). |
| `stz` (`stagnationDismissed`) | `{ ejercicio: fecha (ms) }` | Avisos de estancamiento descartados. |
| `wr` (`weighReminder`) | `{ n, u: 'd' \| 'w' \| 'm', t, sh?, sn?, c? }` | Recordatorio de pesaje (`dashboard/reminder`): cada `n` días, semanas o meses, desde el último pesaje o desde `t` (cuándo se activó, ms) si es posterior; `sh` último día en que se avisó, `sn` pospuesto hasta ese día, `c` id del evento de calendario. Sin él, no hay recordatorio. |
| `rp` (`reports`) | `[{ id, k, a, t, ca, s, st?, rp?, ra?, sn?, dx? }]` | Fallos y sugerencias enviados desde la cuenta (`system/report`), los más nuevos primero (30 como mucho): id `uid-ms`, tipo (`f` / `s`), dónde, texto, cuándo, `s` 1 si ya llegó a la nube, estado, respuesta y cuándo, `sn` 1 si la respuesta ya se vio y `dx` los datos técnicos hasta enviarlo. |

### Programas y ejercicios propios

| Clave guardada (nombre en el programa) | Tipo | Qué es |
|---|---|---|
| `cp` (`ownPrograms`) | programa[] | Programas propios: `{ n, plan, t: creado, src: 'mine' \| 'guide' \| 'import', o?: respuestas del guiado, d: descripción, dl?: semanas entre descargas (0 nunca; sin él, según el nivel) }`. |
| `cr` (`routines`) | rutina[] | «Mis workouts»: `{ n, bl: [{ ex: [nombres], s, r, … }], img? }`. |
| `cx` (`customExercises`) | ejercicio[] | Ejercicios creados por el usuario: `{ n, c, g: 'Propio', t, p, s, q }`. |

### Nutrición

| Clave guardada (nombre en el programa) | Tipo | Qué es |
|---|---|---|
| `nu` (`nutritionGoals`) | `{ k, c, p, f, n, dt?, man? }` | Objetivo: kcal (800–8000), % hidratos/proteína/grasa, número de comidas (2–8), tipo de dieta; `man: 1` si las kcal y los macros están puestos a mano (no se recalculan solos). `core/boot` los deja válidos (`cleanGoals`). |
| `bio` (`biometrics`) | `{ age, h, w, sex, act, goal }` | Datos biométricos (edad, altura cm, peso kg, sexo `'M'` \| `'F'`, actividad, objetivo) para el gasto energético. El sexo ordena también los programas (`PROGRAM_PREF`) y va al perfil de Firebase (`sx`). |
| `meals` | `{ 'AAAA-MM-DD': { comida: [{ n, g, b: [kcal, hc, prot, grasa, fibra, sal por 100 g] }] } }` | Comidas del día. |
| `cf` (`myFoods`) | `[{ n, b, ns?, ean? }]` | «Mis alimentos»: los creados a mano y los buscados o escaneados en Open Food Facts al añadirlos a una comida (F-44), con su Nutri-Score (`ns`, `'a'`…`'e'`, F-43) y su código de barras. Se pueden borrar. |
| `lib` (`savedDishes`) | `[{ n, it }]` | Platos guardados (librería de comidas). |
| `tp` (`mealTemplates`) | `{ 't' \| 'r': { comida: [...] } }` | Plantillas de día de entreno / descanso. El tipo de cada día ya no se guarda: sale de la rutina (la semana de entreno va de lunes a domingo y sigue el ciclo del plan) y de los entrenos registrados (`nutrition/templates`, `dayInfo`); hasta la 1.23 se elegía a mano en `dt`, que se borra al arrancar. |
| `fq` (`frequentFoods`) | `{ alimento: { c, t, b } }` | Alimentos frecuentes (hábitos). |
| `wt` (`water`) | `{ fecha: ml }` | Agua. |
| `bc` (`barcodeCache`) | `{ código: { n, b, t, ns? } }` | Caché de códigos de barras consultados (200 como mucho), con su Nutri-Score. |

### Ajustes

| Clave guardada (nombre en el programa) | Qué es |
|---|---|
| `theme` | `''` automático, `'dark'` o `'light'`. |
| `acc` (`accent`) | Color de acento: índice en `ACCENTS` (11 de serie), o `-1` con un color propio. |
| `acx` (`accentColor`) | El color propio, `'#rrggbb'` (con `acc: -1`); sus tonos y el color del texto encima se calculan (`customAccent`). |
| `gm` / `gl` / `gk` (`glassLevel` / `glassOn` / `glassLastLevel`) | Estilo Cristal: nivel 0–3, activado, último nivel elegido. |
| `rm` (`reduceMotion`) | 1 para reducir animaciones (`html.rm`). |
| `st0` (`startTab`) | Pestaña al abrir la app (0–3); sin ella, la última que se usó (`core/tabbar`). |
| `tour` (`tourSeen`) | 1 si ya se vio (o se omitió) el recorrido de la primera vez (`system/tour`). |
| `rpe` (`logRpe`) | 1 si se registra el esfuerzo de cada serie (RPE; Ajustes avanzados, F-42). Sin él, desactivado. Va con el núcleo, no con las preferencias del perfil. |
| `mv` (`migrationsDone`) | Cambios de los datos de una versión a otra ya hechos en la cuenta (`core/repair`, `MIGRATIONS`): 1, el de la V1.0.1 (F-45). |
| `bdg` (`iconBadge`) | 1 con el globo en el icono de la app (`system/phone`). Es de este móvil: no se sincroniza. |
| `un` (`units`) | `'kg'` o `'lb'`. |
| `rest` (`defaultRest`) | Descanso por defecto (s). |
| `ar` (`autoRest`) | 0 si el descanso no empieza solo al marcar una serie. |
| `snd` / `snt` / `vol` / `vib` (`sound` / `soundTone` / `volume` / `vibration`) | Sonido activado, tipo de pitido, volumen y vibración. |
| `awk` (`keepAwake`) | 0 para no mantener la pantalla encendida durante el entreno. |
| `pf` (`profile`) | Perfil: solo la foto (`img`, JPEG, PNG o WebP en base64) y `pc`, cuándo se dio el consentimiento para subirla (sin él, la foto no sale del móvil). Nombre, email y teléfono ya no existen: se borran al arrancar y al restaurar una copia. |
| `wdc` (`wodConfig`) | Última configuración del temporizador WOD. |
| `rg` (`weightRange`) | Rango de la gráfica de peso: 0 semanas, 1 meses, 2 años. |

### Copias

| Clave guardada (nombre en el programa) | Qué es |
|---|---|
| `bkd` (`lastBackupDate`) | Fecha (ms) de la última copia de seguridad guardada en archivo. |
| `cb` (`cloudBackup`) | `{ at, lg, md }`: la última copia en la nube (cuándo, entrenos y días de comidas), para todos los móviles de la cuenta (`cloud/backup`). |
| `nbk` (`backupNoticeOff`) | 1 si se descartó el aviso «¿Ya usabas StrataFit?». |


## El entreno en curso `W`

`W` (`core/state`) solo existe durante un entreno. Se guarda en `ffw` con el día y la semana para reanudarlo (`workout/resume`),
con las claves cortas (`core/schema`).

| Clave guardada (nombre en el programa) | Qué es |
|---|---|
| `t0` (`startedAt`) | Cuándo empezó (ms); al reanudar o al quitar la pausa se corre lo que estuvo parado. |
| `p` (`pausedAt`) | Cuándo se pausó (ms), o 0. |
| `re` (`restEndsAt`) | Cuándo acaba el descanso en marcha (ms), o 0. |
| `ri` (`restAfter`) | `[ejercicio, serie]` tras la que corre ese descanso. |
| `lb` (`lastBeep`) | Último segundo de la cuenta atrás que ya sonó (3, 2, 1). |
| `x` (`sets`) | Las series de cada ejercicio: `[[{ r: repeticiones, w: peso, ok: 1 hecha, ws: 1 peso sugerido (no escrito a mano), q: RPE, t: 1 bajada del drop set \| 2 bloque del rest-pause, n: ejercicio con el que se hizo si luego se cambió }]]`. |
| `o` (`openPanels`) | Paneles abiertos de cada ejercicio (consejo, notas…). |
| `fd` (`folded`) | Ejercicios plegados (al acabarlos se pliegan solos). |
| `lc` (`lastCurrent`) | Ejercicio que tocaba la última vez que se pintó (para plegar el anterior al pasar al siguiente). |
| `wu` (`warmupsDone`) | Series de calentamiento marcadas (`'ejercicio_serie'`). |
| `dl` (`deload`) | 1 en semana de descarga (peso al 65 % y 2 repeticiones menos). |

## Copia de seguridad

Un archivo JSON con `{ _sf: { app, fmt, ver, at, wip }, ...S }`: el estado completo y el entreno en curso (`system/backup`), que se
guarda siempre como `StrataFit-copia.json`. La copia en la nube (`cloud/backup`) y las copias automáticas del móvil usan el mismo
formato; la de la nube va comprimida (gzip, en base64) y partida en trozos ([Servidor: Firebase](backend.md)). Las fotos de progreso
de copias antiguas (`_sf.ph`) se ignoran.
