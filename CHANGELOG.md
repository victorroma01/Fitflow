# Historial de cambios

Todos los cambios importantes de StrataFit, de la versión más reciente a la más antigua. La serie de prueba anterior
(1.19 – 1.24) está en [docs/tecnica/versiones-de-prueba.md](docs/tecnica/versiones-de-prueba.md).

Cada versión se divide en **Novedades**, **Mejoras**, **Correcciones** e **Interno**. La app enseña los tres primeros apartados en el
aviso de versión nueva y en Ajustes (por eso se escriben para el usuario, en frases cortas); **Interno** es solo para desarrollo.
`build.py` lee este archivo: la versión de `APPV` debe tener aquí su entrada o la compilación se detiene.

El formato se inspira en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y la numeración sigue
[versionado semántico](https://semver.org/lang/es/).

## [1.0.0] — 2026-11-04

### Novedades
- Cuentas: entras con tu usuario y contraseña, sin ningún dato personal.
- Tus datos se guardan también en la nube: no los pierdes y puedes usar la app en varios móviles.
- Sin conexión todo sigue funcionando; lo que hagas se sube solo al volver la red.
- Ajustes → Cuenta: el estado de la sincronización, cambiar la contraseña y «Cerrar sesión».
- Programas nuevos: Full Body (entreno y descanso alternos), Glúteo y pierna, y un Push Pull Leg en ciclo de 10 días con un
  descanso tras cada dos entrenos.
- Programas recomendados según seas hombre o mujer, arriba en Programas.
- 10 técnicas de intensidad (pirámide, drop set, rest-pause, myo-reps, cluster, parciales, superserie antagonista, pre y
  post-agotamiento): cada serie enseña la suya.
- Semana de descarga en naranja: peso al 65 % y 2 repeticiones menos con las mismas series; la puedes omitir y, en tus programas,
  elegir cada cuántas semanas toca.
- Cada 5-6 semanas la app propone rotar los ejercicios accesorios por otra variante; también desde el menú de Workout.
- Cada ejercicio tiene su propio consejo en Tips y, al tocar su imagen, cómo se hace paso a paso.
- Superseries y triseries por rondas: tras cada serie, 10 s y la serie del siguiente ejercicio; al acabar la ronda, su descanso
  (2:30 si no eliges otro). Al acabar cada descanso, la pantalla pasa sola a la serie que toca.
- Peso sugerido: el peso que escribes en una serie pasa en gris a las siguientes (en una pirámide, un escalón más); si cambias
  una, las siguientes sugieren el nuevo.
- Al tocar la abreviatura de una serie (PIR, DS, WRK…) se abre una ventana con qué técnica es y cómo se hace.
- WOD: reloj circular con la cuenta en el centro, y la cuenta atrás inicial se puede saltar.

### Mejoras
- Más privacidad: la app ya no guarda nombre, email, teléfono ni fotos de progreso (ni sus dos logros).
- La foto de perfil se sube solo si das tu consentimiento, y la puedes quitar cuando quieras.
- La app ocupa algo menos: se han quitado código y estilos que ya no se usaban.
- Programas revisados: Bro Split y Torso / Pierna con técnicas de intensidad, y en el programa guiado «Otra variante» pasa a
  «Volver a generar», con su icono.
- Entreno más limpio: Tips y Discos con icono, y los desplegables de tempo y descanso solo dicen «Tempo» y «Descanso» (el valor
  está arriba, en el objetivo).
- La barra de atrás, pausa y avance va más baja, pegada al borde de abajo.
- WOD: un color para el trabajo y otro para el descanso, lo que viene después y el tiempo total, aviso del último minuto en el
  AMRAP y la cuenta al día nada más volver a la app.
- Sin descanso automático, la pantalla pasa enseguida al ejercicio que toca.

### Correcciones
- Al cambiar el descanso o el tempo durante el entreno, el objetivo de arriba no se actualizaba hasta salir.

### Interno
- La numeración empieza de nuevo en la 1.0.0. Los móviles con la 1.24.0 la reciben igual: el service worker guarda el
  documento nuevo y la siguiente apertura ya es la 1.0.0 (el aviso de versión nueva compara números y no saldría, porque 1.0.0
  es menor que 1.24.0).
- Código muerto (T-03), comprobado en cada compilación por `tools/check.js`: declaraciones sin usar, exportaciones que nadie
  importa, acciones que nada lanza, iconos sin usar y CSS sin usar (clases, ids y animaciones). Quitados: 5 acciones, 1 manejador de
  cambios, 3 iconos, 10 exportaciones de más, 11 selectores y 3 animaciones de CSS.
- Las ayudas «?» pasan a su propio módulo, `core/help`.
- `tools/format.js` rehace la línea «Define:» de la cabecera de cada módulo con lo que declara de verdad y cuántas acciones
  registra: con `--check`, una cabecera desfasada falla como un archivo sin formatear (había 30 desfasadas).
- Documentación (T-19, T-20): README nuevo y dos carpetas, `docs/funcional` (qué hace la app, por pestañas, y datos y privacidad)
  y `docs/tecnica` (arquitectura y convenciones, mapa de módulos, estado, servidor, desarrollo, pruebas y versiones de prueba).
  `STATE.md` y `BACKEND.md` pasan a `docs/tecnica/estado.md` y `docs/tecnica/backend.md`, este con el diseño aprobado de Firebase.
- `tools/modindex.js` genera el mapa de módulos (`docs/tecnica/modulos.md`) a partir de las cabeceras; `tests/run.sh` comprueba
  que está al día.
- La rama `desarrollo-1.0.0` se prueba en GitHub (Chrome y Safari) en cada subida, sin etiquetar ni publicar nada.
- Pruebas: fuera `tests/compat.js` (solo servía para comparar con compilaciones anteriores a la 1.20). `tests/shots.py` empieza
  cada pantalla con el almacenamiento vacío, así una comparación no depende de lo que dejó guardado la pantalla anterior.
  `tests/deploy.py` comprueba que una versión con un número menor llega igual en la siguiente apertura.
- Firebase (M2, T-07 a T-12): cuentas con Authentication y datos en Firestore por su API REST, sin SDK (`cloud/`), con correo
  técnico `usuario@stratafit.app` (T-09) y roles por *custom claims* (T-08). Inicio de sesión, contraseña temporal, Ajustes →
  Cuenta y Administración en `account/`. La CSP se abre solo a Firebase.
- Sincronización sin conexión (`cloud/sync`): partes del estado por documento (núcleo, entrenos e historial por año, comidas por
  mes, foto), un índice de versiones que se escribe con ellas (todo o nada, con condición) y fusión a tres bandas por huellas
  (`cloud/merge`): entrenos y comidas se juntan elemento a elemento; en el resto gana el cambio más reciente.
- `core/repair` reúne las comprobaciones del estado (al arrancar y tras cada sincronización) y da un `id` a cada entreno. Fuera las
  lecturas de formatos de la serie de prueba (estado entero de la 1.20, firma del plan, tipo de día de la 1.23): no se migran.
- Seguridad (T-12): `firestore.rules` (cada cuenta lo suyo, con su forma y tamaño; el admin, perfiles y contraseñas temporales; solo
  cuentas con correo técnico), espera creciente tras cinco fallos al entrar, clave de administrador solo como secreto de GitHub.
- GitHub Actions: «Restablecer contraseña», «Asignar rol», «Desplegar reglas» (al fusionar en `main`) y «Comprobar Firebase»
  (`tools/admin`, con firebase-admin); en la CI, el trabajo «Reglas y nube» prueba las reglas y la app con el emulador de Firebase.
- Pruebas: `tests/cloud.py` (dos móviles contra un Firebase de prueba, `tests/fakefb.py`, o el emulador), `tests/merge.test.mjs` y
  `tests/rules.test.mjs`. Las pruebas abren también el archivo único por HTTP: con `file://`, Chromium a veces recargaba la página
  con el almacenamiento vacío.
- Programas (M3): `workout/week` (semana de 7 días sobre planes de cualquier longitud: `S.sl` día de la semana y `S.sel` día del
  plan; `done`, Nutrición y Dashboard siguen el ciclo), técnicas en el formato de los programas (`~DS`, `~DS/MYO` para el avanzado:
  `data/techniques`, `workout/technique`), descarga nueva (`workout/deload`, `dl` de cada programa propio), rotación
  (`data/rotation`, `programs/rotation`), programas preferentes por sexo (`PROGRAM_PREF`) y el nivel avanzado sin la superserie
  automática del final.
- Catálogo de ejercicios (T-05): `data/exinfo`, con el consejo y la ejecución de los 551 ejercicios, se descarga al usarlo
  (`core/lazy`, `library/howto`); `tests/exinfo.test.mjs` comprueba que están todos y que no hay dos textos iguales ni parecidos.
- Pruebas: `tests/programs.py` (ciclos, sexo, técnicas, descarga, rotación, «Volver a generar», consejo y ejecución).
- Pantalla de entrenamiento (M4): `workout/order` (orden de las series, por rondas dentro de un bloque: serie actual, «Anterior»
  y descanso tras cada serie), `restAt` y `blockEnd` en `workout/rest` (10 s dentro del bloque y el descanso de la ronda al
  cerrarlo), `restEnded` (al acabar un descanso, la pantalla va a la serie siguiente si es de otro ejercicio), peso sugerido con
  `ws` en cada serie y `suggestAfter` (`workout/progression`), `TECHNIQUES` con un tercer texto (qué hace la app) y sin prototipo,
  y el reloj del WOD con un anillo SVG que se pinta en cada fotograma (`extras/wod`). CSS nuevo: `74-workout-controls`.
- Pruebas: `tests/session.py` (iconos, desplegables, peso sugerido, técnicas, superseries y triseries, barra inferior y WOD).
