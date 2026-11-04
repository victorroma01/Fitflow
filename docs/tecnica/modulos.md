# Mapa de módulos

Qué hace cada módulo de `src/js`, qué declara y cuántas acciones registra (`A` / `C` / `U`). Se genera con
`node tools/modindex.js` a partir de la cabecera de cada módulo: no se edita a mano (`tests/run.sh` comprueba que está al día).

Los módulos se cargan en el orden de los `import` de `src/js/main.js`. Los marcados «al usarlo» se descargan la primera vez
que hacen falta (`core/lazy`). 80 módulos en total.

## core

Núcleo: estado, guardado, pintado, eventos, avisos y piezas comunes.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `core/util` | Utilidades puras (no importa nada): versión, selector $, escape HTML X, redondeos, fechas (dayKey) y formatos. | `APPV`, `FFDEP`, `$`, `X`, `safeImage`, `round1`, `roundInt`, `fmtMinSec`, `dayKey`, `est1RM`, `fmtDuration`, `clampInt`, `clampNum`, `fmtClock`, `fmtDateShort`, `newId` | — |
| `core/html` | Plantillas HTML seguras. html`<b>${nombre}</b>` escapa cada valor que se inserta (como X), así que un nombre escrito por el usuario, un alimento de Open Food Facts o un programa importado nunca se convierten en código. Se insertan tal cual solo lo que ya es HTML de la app: otra plantilla html`…`, una lista de ellas (el resultado de un map) o un valor marcado con raw(…) (textos con etiquetas hechos aquí…). Cada raw() es un sitio donde no se escapa: si recibe datos de fuera, hay que escaparlos antes con X. El resultado es un Html: se comporta como texto (se concatena, se asigna a innerHTML, se guarda en JSON). | `raw`, `part`, `html` | — |
| `core/toast` | Aviso breve en la parte inferior de la pantalla. Va aparte de core/ui para que el guardado (core/persist) pueda avisar sin depender de la interfaz. | `toast` | — |
| `core/morph` | Pintar sin rehacer: deja un elemento con el contenido de un HTML nuevo cambiando solo lo que es distinto. Lo que sigue igual no se vuelve a crear: se conservan el desplazamiento, el foco y lo que se está escribiendo, y las imágenes no se vuelven a cargar. El resultado es el mismo HTML que con innerHTML (atributos, valores de los campos y marcas). | `sameNode`, `syncAttrs`, `syncFields`, `morphChildren`, `morph` | — |
| `core/store` | Capa de almacenamiento. TODA la persistencia local pasa por aquí: ninguna otra parte del código llama a localStorage. Hoy escribe en localStorage del dispositivo. Para añadir un servidor no hay que tocar las pantallas: basta con registrar un adaptador en Store.remote (ver docs/tecnica/backend.md) y Store avisará de cada cambio. | `Store` | — |
| `core/errors` | Registro de errores en el dispositivo: guarda los últimos 30 (cuándo, dónde, qué y en qué versión) para el informe de diagnóstico de Perfil. Nada sale del móvil salvo que el usuario copie el informe. | `ERROR_LIMIT`, `logError`, `errorLog`, `clearErrorLog` | — |
| `core/persist` | Guardado del estado S en el dispositivo, por partes. El núcleo de S (ajustes, plan, programas, peso…) va en la clave `ff`, y las colecciones que más crecen van aparte: `ff:logs` (entrenos), `ff:hist` (historial por ejercicio) y las comidas, una clave por mes (`ff:meals:2026-10`). En el núcleo, cada colección apartada queda con el nombre de su clave ("logs": "ff:logs"), así se sabe qué hay que leer y el orden de las claves de S se conserva. Cada guardado escribe solo las claves que han cambiado, y todos los saveState() de una misma acción se agrupan en uno solo al terminar la acción (queueMicrotask: siempre antes de que la página pueda recargarse o cerrarse). Los datos de la 1.20 y anteriores (todo S en `ff`) se leen igual y pasan a partes en el primer guardado; si no hay espacio para hacerlo, se sigue guardando entero, como antes, y se reintenta en el próximo arranque. Este módulo no conoce S: core/state le pasa el estado (saveState, flushState). | `STATE_PARTS`, `partKey`, `stateRecovered`, `savedFormat`, `savedText`, `queued`, `saveLocked`, `partsFailed`, `lastKey`, `splitState`, `readPart`, `loadSavedState`, `writeKeys`, `writeWhole`, `saveFailedAt`, `saveFailed`, `writeState`, `scheduleWrite`, `replaceSavedState`, `lockSaves`, `clearSavedState` | — |
| `core/registry` | Registros de eventos delegados: A (data-a), C (data-c change) y U (data-u input). | `A`, `C`, `U` | — |
| `core/state` | Estado global S (se guarda con saveState: core/persist), sesión en curso W, tema y banderas de interfaz. | `S`, `saveState`, `flushState`, `W`, `setW`, `nutriDayOffset`, `setNutriDayOffset`, `calMonthOffset`, `setCalMonthOffset`, `weekView`, `setWeekView`, `addState`, `setAddState`, `applyTheme`, `overviewMode`, `setOverviewMode`, `weightView`, `setWeightView`, `wodRun`, `setWodRun` | — |
| `core/icons` | Mapa de iconos IC e icon()/groupIcon() (los iconos de cada función se añaden junto a ella). | `IC`, `icon`, `groupIcon` | — |
| `core/ui` | Hojas inferiores (sheet, fullPage), diálogos (dialog, confirmDialog), menú lateral y componentes base. | `sheetBarFix`, `sheet`, `confirmDialog`, `dialog`, `onSheetClose`, `sheetToTop`, `fullPage`, `pgHead`, `segmented`, `linkRow` | 6 |
| `core/help` | Ayudas «?»: un botón pequeño junto a una función (helpDot) que, al tocarlo, explica en una frase para qué sirve. Cada módulo añade sus textos con HELP.clave = 'texto'; la burbuja se cierra con otro toque o al desplazar. | `HELP`, `helpDot`, `tipFor`, `tipOff`, `hideTip`, `showTip` | 1 |
| `core/events` | Delegación global de eventos click, change e input, y teclado para lo que hace de botón sin serlo. | — | — |
| `core/render` | Render principal R() y cambio de pestaña. | `lastTab`, `lastScreen`, `R` | 1 |
| `core/lazy` | Carga diferida: lo poco usado (temporizador WOD, exportar a CSV, escáner y búsqueda en Open Food Facts) va en archivos aparte que se descargan la primera vez que se abren (el service worker los guarda para usarlos sin conexión). Hasta entonces, los botones que lo abren tienen aquí un manejador provisional: carga el módulo, que registra los de verdad, y repite la acción. En el archivo único todo va dentro y carga al instante. | `lazyAction` | — |
| `core/debug` | Acceso desde fuera a una parte del estado y de las funciones internas, para las pruebas automáticas (tests/) y la consola del navegador: con módulos ES ya no son variables globales. Cada nombre se expone en window con su valor actual; los que las pruebas cambian, también con escritura. La app no lo usa. Si una prueba necesita otro nombre, se añade aquí. | `DEBUG_NAMES` | — |
| `core/boot` | Arranque: migraciones, restauración de estado y primer render. | `bootFixed` | — |

## data

Datos fijos: ejercicios, programas, alimentos, fotos y novedades.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `data/library` | Biblioteca base: ejercicios (LIB_MAIN, LIB_EXTRA, EX_DETAILS), programas predefinidos (PROGRAMS), analizador y lista EXERCISES. | `LIB_MAIN`, `PROGRAMS`, `PROGRAM_NAMES`, `LIB_EXTRA`, `GROUPS`, `groupOf`, `groupLabel`, `parseExToken`, `parseProgram`, `EXERCISES`, `PROGRAM_NOTES`, `MUSCLES`, `EQUIP`, `EQUIP_ORDER`, `EX_DETAILS` | — |
| `data/foods` | Base de alimentos (FOODS_SRC: nombre, valores por 100 g y grupo) y reparto de macros por número de comidas. Valores por 100 g (o 100 ml): kcal, hidratos, proteínas, grasas, fibra y sal, de tablas de composición de referencia y del etiquetado habitual. Cada grupo es una cadena «nombre,kcal,hidratos,proteínas,grasas,fibra,sal;…». | `FOOD_GROUPS`, `FOOD_DATA`, `FOODS_SRC`, `MEAL_SPLITS`, `MEAL_NAMES` | — |
| `data/media` | Fotos de la app (portadas de día y fotos de ejercicio). Este archivo es solo el molde: build.py lo sustituye por el generado desde src/img/ — en el paquete instalable las fotos son archivos (img/…) que el service worker guarda para usarlas sin conexión; en el archivo único van incrustadas en base64. Ver src/img/day/order.txt y src/img/ex/map.txt. | `MEDIA` | — |
| `data/release` | Novedades de esta versión. Este archivo es solo el molde: build.py lo sustituye por la entrada de la versión actual de CHANGELOG.md (apartados Novedades, Mejoras y Correcciones). Se enseñan una vez tras actualizar (system/updates). | `RELEASE` | — |
| `data/photos` | Fotos: portadas de los días (DAY_PHOTOS) con sus reglas de asignación por nombre del día (DAY_PHOTO_RULES) y fotos de ejercicio (EX_PHOTOS, EX_PHOTO_KEY) con nombres alternativos de búsqueda (EX_ALIASES). Vienen de data/media. | `DAY_PHOTOS`, `EX_PHOTOS`, `EX_PHOTO_KEY`, `EX_ALIASES`, `DAY_PHOTO_RULES` | — |
| `data/anatomy` | Trazados SVG del mapa muscular: regiones (AN_R), silueta, cabeza y cajas (AN_BB). | `AN_R`, `AN_S`, `AN_H`, `AN_PA`, `AN_BB` | — |
| `data/templates` | Plantillas del programa guiado: opciones, esquemas de series (SET_SCHEMES), días tipo (GUIDE_TEMPLATES) y etiquetas. | `GUIDE_OPTIONS`, `STYLE_INFO`, `GOAL_INFO`, `SET_SCHEMES`, `splitTokens`, `GUIDE_TEMPLATES`, `GUIDE_SEQUENCES`, `GUIDE_DAY_NAMES`, `GUIDE_DAY_IMAGES`, `GUIDE_LEVEL_VARIANTS` | — |
| `data/levels` | Datos de niveles de programa (principiante, intermedio, avanzado). | `LEVEL_KEYS`, `LEVEL_NAMES`, `LEVEL_COLORS`, `LEVEL_SUMMARY`, `LEVEL_DETAILS`, `LEVEL_PROGRAM_NOTES`, `LEVEL_SWAPS`, `LEVEL_OVERRIDES`, `LEVEL_EXTRA_DAYS`, `LEVEL_LAYOUTS` | — |

## workout

Workout: día, entreno en curso, descansos, series, discos y descarga.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `workout/day` | Pestaña Workout: vista del día, tempos, superseries y atajos. | `planEx`, `workoutDayBase`, `TEMPOS`, `GROUP_TIPS`, `GENERIC_TIPS`, `exTips`, `exToolsHtml`, `blockBadge`, `woShortcuts`, `inSuperset`, `dayBlocks`, `withWeekBar`, `woExtra`, `workoutTab` | 13 |
| `workout/session` | Sesión activa: series, siguiente, pausa, esfuerzo (RPE), descanso y flechas. | `sessionView`, `currentSet`, `scrollToCurrent`, `nextSet`, `sessionWakeLock`, `requestSessionWakeLock`, `setToggle`, `setName`, `foldButton`, `foldSummary`, `anLiveOn`, `exThumb`, `restPill`, `rpeRow`, `avgEffort`, `nextUpBar`, `blockArrowLive`, `blockHeader` | 17 |
| `workout/finish` | Fin del entreno: récords, historial, registro del día e instantánea. | `newRecords`, `logWorkout`, `saveHistory`, `bestOf`, `saveRecords`, `lastSummary`, `setLastSummary`, `workoutSnapshot` | 3 |
| `workout/resume` | Reanudar un entreno interrumpido (estado en curso guardado). | `WIP_KEY`, `pendingResume`, `setPendingResume`, `saveSession`, `resumeSync`, `resumeBanner`, `dropResume` | 3 |
| `workout/rest` | Descansos por defecto y selector de descanso. | `COMPOUND_RE`, `REST_OPTIONS`, `restByName`, `restOf`, `restSelect`, `HEAVY_TYPES`, `restDefault` | 1 |
| `workout/targets` | Unidades, repeticiones objetivo, duración y volumen semanal. | `repClass`, `unitFromName`, `unitOf`, `targetRange`, `UNIT_HEADS`, `targetText`, `unitHead`, `UNIT_NAMES`, `unitName`, `rirOf`, `tempoOf`, `lastHistory`, `weightStep`, `roundHalf`, `fixUnits`, `newPlanEx`, `dayMinutes`, `weeklySets`, `weeklySetsCard`, `usesWeight`, `targetLine`, `RANGE_OPTIONS`, `rangeSelect` | 1 |
| `workout/progression` | Sugerencias de progresión y autorrelleno de series. | `setText`, `prefillSets`, `progressionOf`, `suggestionBox`, `lastTimeLine` | 1 |
| `workout/warmup` | Series de calentamiento. | `isWarmupLift`, `warmupHtml` | 1 |
| `workout/plates` | Calculadora de discos. | `plateTotal`, `setPlateTotal`, `plateBar`, `setPlateBar`, `usesBarbell`, `plateSizes`, `barSizes`, `plateCalc`, `plateResult`, `plateSheet` | 3 |
| `workout/overview` | Resumen y edición del día de entreno. | `overviewPage`, `toggleOverviewEdit` | 6 |
| `workout/deload` | Semana de descarga. | `deloadEvery`, `isDeloadWeek`, `lastWeek`, `deloadWeekSync`, `deloadSuggested`, `deloadCard` | 4 |
| `workout/wake` | Mantener la pantalla activa durante el entreno. | `wakeLockHandle`, `keepAwake` | — |
| `workout/images` | Imágenes de portada del día y su selector. | `coverStyle`, `GROUP_IMAGE`, `routineImage`, `IMAGE_LABELS`, `imagePicker` | 1 |

## routines

Workouts personalizados.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `routines/builder` | Mis workouts: lista, editor de bloques y lanzamiento. | `routineState`, `BLOCK_KINDS`, `routineExRows`, `routineListPage`, `routineEditor`, `routineBlockPicker`, `openRoutines`, `routineRows`, `routineList`, `refreshRoutineRows`, `routineSnapshot`, `routineEditIndex`, `overviewSnapshot`, `setOverviewSnapshot`, `routineToDay`, `restorePlanBackup` | 25 |

## programs

Programas: crear, guiado, niveles, compartir e importar.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `programs/create` | Crear programa: guiado y a partir de mis workouts. | `progDraft`, `clone`, `restDay`, `syncCustomProgram`, `WEEK_LAYOUTS`, `layoutWeek`, `MOVE_GROUP`, `routineMoveGroups`, `overlapRatio`, `orderRoutines`, `buildFromMine`, `dayDuration`, `programDaysHtml`, `programRowsHtml`, `createHome`, `programNameBox`, `createFromMine`, `optionChips`, `guidedForm`, `makeEx`, `generateProgram`, `parseDays`, `programNameFor`, `programAdvice`, `guidedProposal`, `orderWeekPage`, `refreshCreate` | 20 |
| `programs/levels` | Niveles de programa (aplicar, variantes, selector). | `isLevel`, `round5`, `levelDay`, `levelPlan`, `planSignature`, `currentCustomProgram`, `levelsActive`, `levelGenerate`, `planEdited`, `weekStarted`, `levelDot`, `levelVars`, `levelMenuOpen`, `setLevelMenuOpen`, `previewLevel`, `setPreviewLevel`, `pendingLevel`, `levelPill`, `applyLevel`, `levelSegment`, `levelTag`, `programRow` | 5 |
| `programs/manager` | Lista de programas, vista previa y activación. | `previewProgram` | 4 |
| `programs/share` | Compartir e importar programas mediante código. | `cleanPlan`, `programCode`, `parseImport`, `ensureExercises`, `shareState`, `sharePage`, `importProgram` | 7 |

## library

Librería de ejercicios: buscar, filtrar, elegir y sustituir.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `library/model` | Modelo de ejercicios: lista completa, músculos, filas y orden. | `groupOfName`, `overlapCount`, `exAll`, `exOrder`, `exMuscles`, `exSearchText`, `exSubtitle`, `exMusclesHtml`, `exCellHtml`, `exRowHtml`, `exCompare`, `categoryOf` | — |
| `library/photo` | Fotos de ejercicio: obtener la foto, cabecera de la ficha e insignia de miniatura. | `exPhotoUrl`, `exHero`, `exBadge` | — |
| `library/filters` | Filtros de equipo y grupo muscular (desplegables). | `equipIn`, `filterOpen`, `equipMatch`, `equipDropdown`, `filterRefresh`, `filterStateOf`, `groupChips`, `groupMatch`, `groupDropdown`, `filterRow` | 5 |
| `library/browse` | Librería de ejercicios y ficha de cada ejercicio. | `libState`, `libBody`, `libPage`, `exDetailHtml` | 6 |
| `library/swap` | Cambiar un ejercicio por otro (swap) y deshacer. | `swapExercise`, `swapState`, `swapCandidates`, `swapTiers`, `swapBody`, `swapScope` | 5 |
| `library/picker` | Selector para añadir ejercicios al día. | `addToDay`, `pickState`, `pickBody`, `pickSheet` | 6 |

## nutrition

Nutrición: comidas, alimentos, objetivos, plantillas y agua.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `nutrition/home` | Pestaña Nutrición: el día (con su tipo, entreno o descanso), resumen de macros y comidas con sus botones. | `itemMacros`, `mealItems`, `sumMacros`, `macroBar`, `mealName`, `nutritionBase` | 2 |
| `nutrition/diet` | Cálculo de gasto energético (TDEE), tipos de dieta y objetivos de kcal y macros. | `DIET_TYPES`, `ACTIVITY_FACTORS`, `ACTIVITY_LEVELS`, `GOAL_LABELS`, `GOAL_DIET`, `tdee`, `goalTargets`, `dietIndex`, `applyDiet`, `cleanGoals` | — |
| `nutrition/water` | Registro de agua diaria. | `waterGoal`, `waterCard`, `nutritionTab` | 1 |
| `nutrition/add` | Añadir alimentos y comidas al día: lista por grupos, librería de platos, alimento nuevo y búsqueda en internet. | `allFoods`, `foldText`, `groupNames`, `groupOfFood`, `foodList`, `addSheetBase`, `addMealItem`, `addSheet`, `onlineSheet` | 13 |
| `nutrition/templates` | Plantillas de comidas, tipo de día (entreno o descanso, según la rutina) y hábitos. | `nutriDayKey`, `planDayOf`, `dayInfo`, `dayType`, `templateCard`, `habitGrams`, `habitsCard` | 7 |
| `nutrition/goals` | «Mi nutrición» (el icono de cuchillo y tenedor de Nutrición): kcal del día en un anillo con el reparto de macros, peso, objetivo (tipo de dieta), actividad y comidas al día; ajustar los objetivos a mano o recalcularlos con tus datos. Mientras estén a mano (S.nu.man), cambiar el peso o la actividad no los pisa (nutrition/diet, applyDiet). | `ringSvg`, `myNutritionPage`, `refreshGoals`, `manualPage`, `manualValues` | 9 |

## dashboard

Dashboard: progreso, historial, calendario y peso.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `dashboard/home` | Pestaña Dashboard: tarjetas de resumen. | `dashboardBase`, `recordsCard`, `weekMonday`, `weekStats`, `weekCard`, `dashboardTab` | — |
| `dashboard/history` | Registro de entrenos y calendario. | `calendarPage`, `logsPage`, `logIndex`, `logText`, `logRight` | 5 |
| `dashboard/progress` | Gráficas de progreso por ejercicio. | `progressState`, `dateShort`, `progressExercises`, `progressSeries`, `progressFmt`, `axisLabel`, `progressChart`, `progressBody`, `refreshProgress`, `progressCard`, `recordEvents`, `recordsTimeline` | 3 |
| `dashboard/weight` | Peso corporal y gráfica. | `weekKey`, `bmiLabel`, `weightPage` | 4 |

## extras

Funciones extra: logros, medidas, cardio, WOD, resumen y exportar.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `extras/anatomy` | Mapa muscular dibujado en SVG. | `MUSCLE_REGIONS`, `regionsFor`, `anatomySvg`, `GROUP_ANATOMY`, `groupAnatomy`, `regionsBox`, `exAnatomy`, `exAnatomyFull` | — |
| `extras/summary` | Resumen del entreno e imagen para compartir. | `pctChange`, `signed`, `summaryData`, `deltaChip`, `showSummary`, `summaryImage` | 1 |
| `extras/stagnation` | Detección de estancamiento. | `stagnation`, `stagnationCard` | 2 |
| `extras/cardio` | Registro de cardio. | `CARDIO_TYPES`, `cardioState`, `cardioLabel`, `cardioPace`, `paceLabel`, `cardioSheet`, `readCardio`, `cardioLogs`, `cardioCard` | 4 |
| `extras/measures` | Medidas corporales y fotos de progreso. | `MEASURES`, `PHOTO_ANGLES`, `measureState`, `photoCache`, `photoCount`, `photoDbPromise`, `openPhotoDb`, `photoDb`, `photoTx`, `measuresShown`, `loadPhotos`, `preparePhoto`, `photoFull`, `allPhotosFull`, `validPhoto`, `mergePhotos`, `measureList`, `measureDelta`, `measureChart`, `measuresTab`, `photosTab`, `measuresPage`, `comparePhotos` | 15 |
| `extras/medals` | Medallas de Logros, dibujadas en SVG: una distinta para cada logro. La forma y el color dicen la familia (entrenos, toneladas, rachas, récords, cardio, WOD, comidas, medidas, fotos, peso y copias), el metal del borde el nivel (bronce, plata, oro, platino y, para el último de entrenos, amatista) y el dibujo y la cifra del centro, el logro. | `METALS`, `FAMILIES`, `ring`, `poly`, `burst`, `SHAPES`, `MOTIFS`, `MEDALS`, `medalN`, `medalSvg` | — |
| `extras/achievements` | Logros. | `achStats`, `ACHIEVEMENTS`, `checkAchievements`, `achProgress`, `achievementsPage` | 1 |
| `extras/wod` (al usarlo) | Temporizadores de WOD (AMRAP, EMOM, Tabata, For time). | `WOD_MODES`, `WOD_DEFAULTS`, `WOD_INFO`, `wodConfig`, `wodTotal`, `wodSetup`, `wodState`, `wodName`, `wodSkeleton`, `wodTick`, `wodStart`, `wodClose`, `wodEnd` | 13 |
| `extras/csv` (al usarlo) | Exportación a CSV. | `csvCell`, `csvBody`, `CSV_EXPORTS`, `downloadAs` | 2 |
| `extras/foods-online` (al usarlo) | Alimentos en línea (Open Food Facts) y escáner de códigos. | `onlineFoods`, `onlineTimer`, `fetchTimeout`, `offProduct`, `searchOnline`, `EAN_L`, `EAN_G`, `EAN_R`, `EAN_PARITY`, `EAN_LEFT`, `EAN_RIGHT`, `eanDigit`, `eanFromRuns`, `eanFromRow`, `eanFromFrame`, `scanState`, `scanMsg`, `stopScan`, `startScan`, `scanLoop`, `lookupBarcode` | 5 |

## profile

Perfil y Ajustes.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `profile/home` | Pestaña Perfil y borrado de datos. | `pfSummary`, `profileHead`, `bioCard`, `planCard`, `profileTab` | 5 |
| `profile/settings` | Ajustes: página propia (no un desplegable) con secciones y filas con icono (Apariencia, Entreno, Datos, App, Información); cada fila abre su página, con «←» de vuelta a Ajustes. Mientras una está abierta, cada R() la vuelve a pintar con core/morph (settingsSync), así los botones que cambian un ajuste (tema, color, unidades…) se ven al momento. | `settingsSub`, `settingsRow`, `ago`, `PRIVACY_TEXT`, `LEGAL_TEXT`, `SETTINGS_PAGES`, `settingsMain`, `settingsPage`, `settingsSync` | 2 |
| `profile/appearance` | Tema, color de acento y estilo Cristal. | `ACCENTS`, `applyAccent`, `accentSwatches`, `themeSegment`, `glassMode`, `GLASS_LEVELS`, `GLASS_INFO`, `glassCard`, `glSync` | 5 |
| `profile/units` | Unidades de carga kg/lb. | `weightUnit`, `toDisplayWeight`, `fromDisplayWeight`, `volumeText`, `usesLb`, `unitsCard` | 1 |
| `profile/feedback` | Sonido, vibración y avisos de descanso. | `audioCtx`, `audioContext`, `beep`, `canVibrate`, `buzz`, `soundVolume`, `soundSequence`, `alertSettings` | 9 |

## system

Sistema: copias de seguridad, diagnóstico, actualizaciones, archivos e informe de fallos.

| Módulo | Qué hace | Declara | Acciones |
| --- | --- | --- | --- |
| `system/files` | Descarga, copia y codificación de archivos. | `isStandalone`, `downloadFile`, `copyText`, `toBase64`, `fromBase64`, `cleanText` | 1 |
| `system/backup` | Copias de seguridad, restauración y avisos. | `pendingRestore`, `setPendingRestore`, `backupAge`, `backupReminder`, `BACKUP_FORMAT`, `countOf`, `plural`, `wipSession`, `backupRows`, `backupSummary`, `buildBackup`, `BACKUP_ERRORS`, `cleanProfile`, `parseBackup`, `backupDate`, `askRestore`, `preRestore`, `restoreBackup`, `isFreshInstall`, `restoreBanner`, `backupRowsFull`, `buildFullBackup`, `restoredPhotos` | 8 |
| `system/snapshots` | Copias automáticas en este dispositivo (IndexedDB «ffsnap»): como mucho una al día; se guardan las 7 últimas. Sirven para deshacer un error propio (borrar algo, restaurar una copia equivocada). No sustituyen a la copia en archivo: si el navegador borra los datos de la app, también se borran estas. | `SNAP_KEEP`, `snapDbPromise`, `snapDb`, `snapTx`, `snapList`, `takeSnapshot`, `snapshotRows`, `fillSnapshots` | 1 |
| `system/diagnostics` | Informe de diagnóstico (Perfil → Ajustes → Diagnóstico): versión, dispositivo, espacio usado, uso sin conexión, últimos errores y, si los hubo, datos dañados que se apartaron al arrancar. Nada sale del móvil salvo que se copie. | `storageUse`, `badData`, `diagnosticsText`, `diagBack`, `diagnosticsPage` | 6 |
| `system/report` | «Informar de un fallo» (Ajustes): se elige el tipo de fallo y se explica con texto libre. La app no tiene servidor: el informe se abre ya escrito como incidencia en GitHub (REPORT_URL, sin publicar ningún correo) o se comparte o copia para mandarlo por mensaje o correo. No sale nada sin que la persona lo confirme. Los datos técnicos (versión, navegador y últimos errores; nada personal) van solo si se deja marcada la casilla, y se pueden ver antes de enviar. | `REPORT_URL`, `REPORT_TYPES`, `REPORT_MAX`, `reportType`, `reportPage`, `reportTech`, `reportParts`, `reportText`, `reportIssueUrl` | 5 |
| `system/updates` | Actualización de la app: service worker, uso sin conexión, Ajustes → Actualizaciones y aviso de versión nueva con sus novedades. | `ICON_SVG`, `swState`, `offlineText`, `offlineNote`, `updatesOn`, `updateReady`, `updateCheckedAt`, `updateInfo`, `isNewerVersion`, `fetchVersionInfo`, `releaseNotesHtml`, `updatePopupHtml`, `showPopup`, `showUpdatePopup`, `updateFound`, `onUpdateFound`, `whatsNewDue`, `whatsNewPending`, `showWhatsNew`, `updatePopupSync` | 3 |
