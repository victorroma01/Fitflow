# Qué guarda StrataFit

Todo lo que la app recuerda está en el objeto `S` (`core/state`), que se guarda entero como JSON en la clave `ff` mediante `saveState()`.
Las claves son cortas porque están en los datos de cada usuario y en sus copias de seguridad: **no se renombran sin una migración** en
`core/boot` (versión de esquema en `S.v`). Este documento es el diccionario de datos; si añades una clave, añádela aquí.

## Claves de almacenamiento (`Store.K`, `core/store`)

| Clave | Contenido |
|---|---|
| `ff` (`app`) | El estado `S` completo. |
| `ffw` (`wip`) | Entreno en curso (`W` y el día), para reanudarlo si se cierra la app. |
| `ffpre` (`pre`) | Estado anterior a la última restauración de una copia (permite deshacerla durante 30 días). |
| `ffrs` (`rs`) | Resumen pendiente de mostrar tras restaurar. |
| `fferr` (`err`) | Últimos 30 errores registrados en este dispositivo (`core/errors`). No es un dato del usuario. |
| `ffbad` (`bad`) | Copia de un estado que no se pudo leer al arrancar, apartada antes de empezar de cero. |

En IndexedDB: `ffph` (fotos de progreso: miniaturas `m` y fotos completas `f`) y `ffsnap` (copias automáticas diarias, las 7 últimas).

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
| `logs` | registro[] | Entrenos hechos: `{ d: 'AAAA-MM-DD', n, v: volumen kg, s: series, m: minutos, q?: esfuerzo, k?: 'c' cardio \| 'w' WOD, c?: datos de cardio, x?: resumen, nt?: nota }`. |
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
| `nu` | `{ k, c, p, f, n, dt? }` | Objetivo: kcal, % hidratos/proteína/grasa, número de comidas, tipo de dieta. |
| `bio` | `{ age, h, w, sex, act, goal }` | Datos biométricos (edad, altura cm, peso kg, sexo, actividad, objetivo) para el gasto energético. |
| `meals` | `{ 'AAAA-MM-DD': { comida: [{ n, g, b: [kcal, hc, prot, grasa, fibra, sal por 100 g] }] } }` | Comidas del día. |
| `cf` | `[{ n, b }]` | Alimentos creados por el usuario. |
| `lib` | `[{ n, it }]` | Platos guardados (librería de comidas). |
| `tp` | `{ 't' \| 'r': { comida: [...] } }` | Plantillas de día de entreno / descanso. |
| `dt` | `{ fecha: 't' \| 'r' }` | Tipo de día elegido a mano. |
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
| `pf` | Perfil: nombre, contacto y foto (`img`, en base64). |
| `wdc` | Última configuración del temporizador WOD. |
| `rg` | Rango de la gráfica de peso: 0 semanas, 1 meses, 2 años. |

### Copias

| Clave | Qué es |
|---|---|
| `bkd` | Fecha (ms) de la última copia de seguridad guardada en archivo. |
| `nbk` | 1 si se descartó el aviso «¿Ya usabas StrataFit?». |
| `v` | Versión del esquema de datos (hoy 4); las migraciones están en `core/boot`. |

## Copia de seguridad

Un archivo JSON con `{ _sf: { app, fmt, ver, at, wip, ph }, ...S }`: el estado completo, el entreno en curso y, si las hay, las fotos de
progreso (`system/backup`). Las copias automáticas del móvil usan el mismo formato, sin fotos.
