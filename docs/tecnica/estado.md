# Qué guarda StrataFit

Todo lo que la app recuerda está en el objeto `S` (`core/state`), que se guarda con `saveState()` (`core/persist`): el núcleo en la clave
`ff` y las colecciones que más crecen (entrenos, historial y comidas) en claves propias, para escribir solo lo que cambia.
Las claves son cortas porque están en los datos de cada usuario, en Firebase y en sus copias de seguridad: **no se renombran** sin
una migración. `core/repair` deja el estado válido al arrancar y tras cada sincronización. Este documento es el diccionario de
datos; si añades una clave, añádela aquí (y, si es del dispositivo y no de la cuenta, en `LOCAL_ONLY` de `cloud/sync`).

Desde la V1.0.0 todo se sincroniza con Firebase ([Servidor: Firebase](backend.md)): el núcleo en `data/core`, los entrenos y el
historial por año, las comidas por mes, las preferencias en el perfil y la foto en su documento privado. No hay datos personales.

## Claves de almacenamiento (`Store.K`, `core/store`)

| Clave | Contenido |
|---|---|
| `ff` (`app`) | Núcleo del estado `S`: todo menos `logs`, `hist` y `meals`, que quedan como el nombre de su clave (`"logs": "ff:logs"`), más la marca `_parts: 1`. Un `ff` sin la marca (el estado entero de la 1.20 y anteriores) no se lee: los datos de la serie de prueba no se migran. |
| `ff:logs` | `S.logs`. |
| `ff:hist` | `S.hist`. |
| `ff:meals:AAAA-MM` | Los días de `S.meals` de ese mes (`ff:meals:otros` para claves que no son fechas). Un mes sin comidas no tiene clave. |
| `ffw` (`wip`) | Entreno en curso (`W` y el día), para reanudarlo si se cierra la app. |
| `ffpre` (`pre`) | Estado anterior a la última restauración de una copia (permite deshacerla durante 30 días). |
| `ffrs` (`rs`) | Resumen pendiente de mostrar tras restaurar. |
| `fferr` (`err`) | Últimos 30 errores registrados en este dispositivo (`core/errors`). No es un dato del usuario. |
| `ffbad` (`bad`) | Copia de un estado que no se pudo leer al arrancar, apartada antes de empezar de cero. |
| `ffver` (`ver`) | Última versión de la app abierta en este dispositivo (para enseñar las novedades tras actualizar). |
| `ffseen` (`seen`) | Versión cuyas novedades ya se enseñaron, para no repetirlas. |
| `ffacct` (`acct`) | Sesión de la cuenta: `{ uid, u: usuario, it: token de sesión, rt: token de renovación, exp, x: 1 si caducó, mc: 1 o 2 si hay que cambiar una contraseña temporal }` (`cloud/session`). No se sincroniza. |
| `ffown` (`own`) | uid de la cuenta cuyos datos hay en el móvil. Si entra otra, se borran antes de leer el estado. |
| `ffsync` (`sync`) | Sincronización (`cloud/sync`): `{ dev: id del dispositivo, base: { parte: { r: versión, h: huellas de cada elemento } }, lt: último cambio local por tipo, pt: de las preferencias, fresh: 1 tras entrar, last: última sincronización }`. |
| `fflgn` (`lgn`) | Intentos fallidos de entrar `{ n, t }`, para la espera creciente (`account/login`). |

En IndexedDB: `ffsnap` (copias automáticas diarias, las 7 últimas; se borran al cerrar sesión). La base `ffph` de las fotos de
progreso de la serie de prueba se borra al arrancar.

## El estado `S`

### Navegación y plan

| Clave | Tipo | Qué es |
|---|---|---|
| `tab` | número | Pestaña abierta: 0 Workout, 1 Nutrición, 2 Dashboard, 3 Perfil. |
| `prog` | número | Programa predefinido activo (índice en `PROGRAMS`). |
| `cpi` | número | Programa propio activo (índice en `cp`); `-1` si el activo es uno predefinido. |
| `lv` | `'ini'` \| `'int'` \| `'ava'` | Nivel del programa (principiante, intermedio, avanzado). |
| `plan` | día[] | Los días del plan: `[{ n: nombre, ex: [ejercicio del plan] }]`; un día sin ejercicios es descanso. Con 7 días es la semana; con otra longitud es un ciclo que sigue de una semana a otra (Push Pull Leg de 10 días, Full Body de 6: `workout/week`). |
| `wk` | número | Semana en curso (empieza en 1). |
| `sl` | 0-6 | Día elegido de la semana. No se sincroniza (`LOCAL_ONLY`). |
| `sel` | número | Día del plan que le toca a `sl` en la semana `wk` (índice en `plan`; `syncSel`). |
| `done` | `{ 'semana-díaDeLaSemana': true }` | Días completados (el día es el de la semana, 0-6). |
| `pbk` | `{ sel, day }` \| null | Día original guardado al lanzar un workout propio sobre el plan (se restaura al terminar). |
| `dl` / `dq` | `{ semana: 1 \| 0 }` | Semanas de descarga activadas (1) u omitidas (0) a mano / en las que se dijo «Ahora no» a la sugerencia por esfuerzo (`workout/deload`). |
| `dls` | número | Última semana de descarga cuya hoja de inicio ya salió. |
| `rw` / `rq` | número | Semana de la última rotación de ejercicios (o del inicio del plan) / en la que se aplazó la propuesta (`programs/rotation`). |

**Ejercicio del plan:** `{ n: nombre, s: series, rg: [mín, máx], u?: unidad ('s', 'min', 'm', 'km', 'cal'), r?: descanso en s,
t?: tempo, b?: bloque (superseries y triseries: los ejercicios seguidos con el mismo `b`; el `r` del último es el descanso de la
ronda, y si no tiene, 2:30), tk?: técnica de intensidad (`DS`, `RP`, `SS`, `CL`, `PAR`, `MYO`, `PRE`, `POST`, `PIR`,
`PIR+DS`, `PIR+PAR`: `data/techniques`), o?: nombre original si se cambió (swap), img?/cu?: portada propia }`. En los programas
predefinidos, `ta` es la técnica del nivel avanzado; `programs/levels` la aplica y la quita, y no llega a guardarse.

**Serie del entreno en curso** (`W.x[ejercicio][serie]`): `{ r: reps, w: kg, ok, q?: esfuerzo, k?: técnica de la serie, t?: 1 fila
del drop set, 2 bloque del rest-pause, ws?: 1 si el peso es sugerido (del historial o de la serie anterior) y aún no registrado }`.
`W.dl = 1` en la semana de descarga. `W.ri` es la serie que empezó el descanso en curso y `W.re`, cuándo acaba. El orden en que se
hacen las series (por rondas dentro de un bloque) lo da `workout/order`; no se guarda.

**Técnicas** (`data/techniques`): `TECHNIQUES[código] = [nombre, cómo se hace, qué hace la app con ella]`, sin prototipo; los dos
últimos textos son los de la ventana que se abre al tocar la etiqueta de la serie (F-11).

### Registros

| Clave | Tipo | Qué es |
|---|---|---|
| `logs` | registro[] | Entrenos hechos: `{ id, d: 'AAAA-MM-DD', n, v: volumen kg, s: series, m: minutos, q?: esfuerzo, k?: 'c' cardio \| 'w' WOD, c?: datos de cardio, x?: resumen, nt?: nota }`. El `id` (lo pone `core/repair` a partir del contenido) identifica cada entreno al juntar los de dos dispositivos. |
| `hist` | `{ ejercicio: [{ d, s: [[reps, kg, rpe, extra, técnica?]] }] }` | Historial por ejercicio, el más reciente primero. `extra`: 0 serie, 1 drop set, 2 rest-pause; la técnica, si no fue una serie normal. |
| `last` | `{ ejercicio: kg }` | Último peso usado (para rellenar). |
| `pr` | `{ ejercicio: { w, r, e } }` | Mejores marcas (peso, repeticiones, 1RM estimado). |
| `pc` | número | Récords batidos en total (para logros). |
| `notes` | `{ ejercicio: texto }` | Notas por ejercicio. |
| `wl` | `[{ d, w }]` | Registro de peso corporal. |
| `ms` | `[{ d, v: { ci, br, pe… } }]` | Medidas corporales (cm). |
| `ach` | `{ id: valor }` | Logros conseguidos (ver `ACHIEVEMENTS`). |
| `stz` | `{ ejercicio: fecha (ms) }` | Avisos de estancamiento descartados. |

### Programas y ejercicios propios

| Clave | Tipo | Qué es |
|---|---|---|
| `cp` | programa[] | Programas propios: `{ n, plan, t: creado, src: 'mine' \| 'guide' \| 'import', o?: respuestas del guiado, d: descripción, dl?: semanas entre descargas (0 nunca; sin él, según el nivel) }`. |
| `cr` | rutina[] | «Mis workouts»: `{ n, bl: [{ ex: [nombres], s, r, … }], img? }`. |
| `cx` | ejercicio[] | Ejercicios creados por el usuario: `{ n, c, g: 'Propio', t, p, s, q }`. |

### Nutrición

| Clave | Tipo | Qué es |
|---|---|---|
| `nu` | `{ k, c, p, f, n, dt?, man? }` | Objetivo: kcal (800–8000), % hidratos/proteína/grasa, número de comidas (2–8), tipo de dieta; `man: 1` si las kcal y los macros están puestos a mano (no se recalculan solos). `core/boot` los deja válidos (`cleanGoals`). |
| `bio` | `{ age, h, w, sex, act, goal }` | Datos biométricos (edad, altura cm, peso kg, sexo `'M'` \| `'F'`, actividad, objetivo) para el gasto energético. El sexo ordena también los programas (`PROGRAM_PREF`) y va al perfil de Firebase (`sx`). |
| `meals` | `{ 'AAAA-MM-DD': { comida: [{ n, g, b: [kcal, hc, prot, grasa, fibra, sal por 100 g] }] } }` | Comidas del día. |
| `cf` | `[{ n, b }]` | Alimentos creados por el usuario. |
| `lib` | `[{ n, it }]` | Platos guardados (librería de comidas). |
| `tp` | `{ 't' \| 'r': { comida: [...] } }` | Plantillas de día de entreno / descanso. El tipo de cada día ya no se guarda: sale de la rutina (la semana de entreno va de lunes a domingo y sigue el ciclo del plan) y de los entrenos registrados (`nutrition/templates`, `dayInfo`); hasta la 1.23 se elegía a mano en `dt`, que se borra al arrancar. |
| `fq` | `{ alimento: { c, t, b } }` | Alimentos frecuentes (hábitos). |
| `wt` | `{ fecha: ml }` | Agua. |
| `bc` | `{ código: { n, b, t } }` | Caché de códigos de barras consultados. |

### Ajustes

| Clave | Qué es |
|---|---|
| `theme` | `''` automático, `'dark'` o `'light'`. |
| `acc` | Color de acento (índice en `ACCENTS`). |
| `gm` / `gl` / `gk` | Estilo Cristal: nivel 0–3, activado, último nivel elegido. |
| `un` | `'kg'` o `'lb'`. |
| `rest` | Descanso por defecto (s). |
| `ar` | 0 si el descanso no empieza solo al marcar una serie. |
| `snd` / `snt` / `vol` / `vib` | Sonido activado, tipo de pitido, volumen y vibración. |
| `awk` | 0 para no mantener la pantalla encendida durante el entreno. |
| `notif` | Notificaciones activadas. |
| `pf` | Perfil: solo la foto (`img`, JPEG, PNG o WebP en base64) y `pc`, cuándo se dio el consentimiento para subirla (sin él, la foto no sale del móvil). Nombre, email y teléfono ya no existen: se borran al arrancar y al restaurar una copia. |
| `wdc` | Última configuración del temporizador WOD. |
| `rg` | Rango de la gráfica de peso: 0 semanas, 1 meses, 2 años. |

### Copias

| Clave | Qué es |
|---|---|
| `bkd` | Fecha (ms) de la última copia de seguridad guardada en archivo. |
| `nbk` | 1 si se descartó el aviso «¿Ya usabas StrataFit?». |


## Copia de seguridad

Un archivo JSON con `{ _sf: { app, fmt, ver, at, wip }, ...S }`: el estado completo y el entreno en curso (`system/backup`). Las
copias automáticas del móvil usan el mismo formato. Las fotos de progreso de copias antiguas (`_sf.ph`) se ignoran.
