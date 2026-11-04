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
| `plan` | día[] | La semana actual: `[{ n: nombre, ex: [ejercicio del plan] }]`; un día sin ejercicios es descanso. |
| `wk` | número | Semana en curso (empieza en 1). |
| `sel` | número | Día seleccionado (índice en `plan`). |
| `done` | `{ 'semana-día': true }` | Días completados. |
| `pbk` | `{ sel, day }` \| null | Día original guardado al lanzar un workout propio sobre el plan (se restaura al terminar). |
| `dl` / `dq` | `{ semana: bool }` | Semanas de descarga forzadas o descartadas / ya preguntadas. |

**Ejercicio del plan:** `{ n: nombre, s: series, rg: [mín, máx], u?: unidad ('s', 'min', 'm', 'km', 'cal'), r?: descanso en s,
t?: tempo, b?: bloque (superseries), o?: nombre original si se cambió (swap), img?/cu?: portada propia }`.

### Registros

| Clave | Tipo | Qué es |
|---|---|---|
| `logs` | registro[] | Entrenos hechos: `{ id, d: 'AAAA-MM-DD', n, v: volumen kg, s: series, m: minutos, q?: esfuerzo, k?: 'c' cardio \| 'w' WOD, c?: datos de cardio, x?: resumen, nt?: nota }`. El `id` (lo pone `core/repair` a partir del contenido) identifica cada entreno al juntar los de dos dispositivos. |
| `hist` | `{ ejercicio: [{ d, s: [[reps, kg, rpe, drop]] }] }` | Historial por ejercicio, el más reciente primero. |
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
| `cp` | programa[] | Programas propios: `{ n, plan, t: creado, src: 'mine' \| 'guide' \| 'import', o?: respuestas del guiado, d: descripción }`. |
| `cr` | rutina[] | «Mis workouts»: `{ n, bl: [{ ex: [nombres], s, r, … }], img? }`. |
| `cx` | ejercicio[] | Ejercicios creados por el usuario: `{ n, c, g: 'Propio', t, p, s, q }`. |

### Nutrición

| Clave | Tipo | Qué es |
|---|---|---|
| `nu` | `{ k, c, p, f, n, dt?, man? }` | Objetivo: kcal (800–8000), % hidratos/proteína/grasa, número de comidas (2–8), tipo de dieta; `man: 1` si las kcal y los macros están puestos a mano (no se recalculan solos). `core/boot` los deja válidos (`cleanGoals`). |
| `bio` | `{ age, h, w, sex, act, goal }` | Datos biométricos (edad, altura cm, peso kg, sexo, actividad, objetivo) para el gasto energético. |
| `meals` | `{ 'AAAA-MM-DD': { comida: [{ n, g, b: [kcal, hc, prot, grasa, fibra, sal por 100 g] }] } }` | Comidas del día. |
| `cf` | `[{ n, b }]` | Alimentos creados por el usuario. |
| `lib` | `[{ n, it }]` | Platos guardados (librería de comidas). |
| `tp` | `{ 't' \| 'r': { comida: [...] } }` | Plantillas de día de entreno / descanso. El tipo de cada día ya no se guarda: sale de la rutina (el Día 1 es el lunes) y de los entrenos registrados (`nutrition/templates`, `dayInfo`); hasta la 1.23 se elegía a mano en `dt`, que se borra al arrancar. |
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
