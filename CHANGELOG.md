# Historial de cambios

Todos los cambios importantes de StrataFit, de la versión más reciente a la más antigua.

Cada versión se divide en **Novedades**, **Mejoras**, **Correcciones** e **Interno**. La app enseña los tres primeros apartados en el
aviso de versión nueva (por eso se escriben para el usuario, en frases cortas); **Interno** es solo para desarrollo.
`build.py` lee este archivo: la versión de `APPV` debe tener aquí su entrada o la compilación se detiene.

El formato se inspira en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y la numeración sigue
[versionado semántico](https://semver.org/lang/es/).

## [1.23.0] — 2026-10-30

### Mejoras
- Durante el entreno, cada botón responde al toque en al menos 44 × 44 px, aunque se vea igual.
- Funciona mejor con VoiceOver: cada botón y cada campo dice qué es, por ejemplo «Peso, serie 2, Press banca».
- En el navegador, la barra superior toma el color del tema que elijas, claro u oscuro.
- Iconos un 37 % más ligeros, con la misma imagen.

### Correcciones
- Más protección al restaurar copias: una copia manipulada ya no puede colar código por la foto de perfil ni por los datos.

### Interno
- Seguridad (auditoría S1): la foto de perfil solo se acepta como imagen incrustada JPEG, PNG o WebP (`safeImage`), al arrancar y al
  restaurar (`cleanProfile`), y se escapa al pintarla. Además, los datos biométricos, de nutrición y de las series dejan de insertarse
  sin escapar (`raw()`) en unos 30 módulos: una copia manipulada también podía inyectar HTML por ahí. `tests/security.py` lo cubre.
- Accesibilidad (A1): `aria-label` en botones de icono y campos, `role="button"` y teclado (Intro, espacio) en lo que se toca sin ser
  un botón, y zona táctil de 44 px en el entreno con `::after` invisibles (`css/97-touch-targets`). Prueba nueva `tests/a11y.py`
  (33 pantallas; la zona táctil se mide tocando con `elementFromPoint`, a 390 y 320 px) y regla 10 de `tools/check.js`.
- `theme-color` con `media` para tema claro y oscuro, y otra etiqueta delante si el tema se elige a mano (`applyTheme`).
- Iconos PNG comprimidos sin pérdida: de 367 a 232 KB en total.
- `tools/format.js` formatea también los módulos que se cargan al usarlos, encuentra los comentarios con el analizador (un `/*`
  dentro de una plantilla se tomaba por comentario) y ya no mueve a la derecha, en cada pasada, los comentarios de varias líneas
  dentro de una función.
- GitHub Actions dice en cada solicitud de fusión desde dónde publica GitHub Pages y, en el modo «desde la rama», comprueba que la
  copia de la raíz es exactamente la app compilada de ese código.

## [1.22.0] — 2026-10-30

### Mejoras
- Al tocar algo, la pantalla ya no se rehace entera: no pierdes la posición ni lo que estás escribiendo.
- La app pesa un 30 % menos y lo poco usado (WOD, CSV, escáner) se descarga solo al abrirlo.
- Más protección con los textos que vienen de fuera: copias, programas compartidos y Open Food Facts.

### Interno
- Código en módulos ES con importaciones explícitas; esbuild los une y los comprime. Archivo único: un solo script. Paquete: `js/`
  con nombres que cambian con el contenido y WOD, CSV y escáner aparte (`core/lazy`).
- Plantillas ``html`…` `` con escape automático (`core/html`): 344 plantillas convertidas desde las concatenaciones con el mismo
  HTML resultante; lo que no se escapa queda marcado con `raw()`.
- `core/morph`: dentro de una pantalla, `R()` cambia solo lo distinto; al cambiar de pantalla pinta de cero.
- Service worker: precarga el código, guarda un documento nuevo solo con todo su código y borra el de versiones anteriores.
- `tools/check.js` para módulos ES (importaciones, orden real de carga, módulos diferidos); `core/debug` da acceso a las pruebas.
- Pruebas: `tests/render.py` (nueva); `tests/deploy.py` publica de verdad otra versión con otros nombres de archivo.
- Medido con 3 años de datos y la CPU 4 veces más lenta: guardar un ajuste pasa de 33 a 19 ms y lo que se descarga al abrir, de
  474 a 330 KB; el arranque y el pintado quedan igual (pintar sin rehacer cuesta un poco más que rehacer, a cambio de no perder nada).

## [1.21.0] — 2026-10-30

### Mejoras
- Guardar es unas 3 veces más rápido: solo se escribe lo que cambia.
- Si una parte de tus datos se daña, el resto se conserva.

### Correcciones
- «Borrar todos los datos» también descarta el entreno en curso.

### Interno
- Guardado por partes (`core/persist`): núcleo en `ff` y `ff:logs`, `ff:hist` y `ff:meals:AAAA-MM` aparte; solo se escriben las claves
  que cambian y los `saveState()` de una acción se agrupan en uno. Los datos de la 1.20 pasan solos a partes (si no caben, se sigue
  guardando entero). Con 3 años de datos, un cambio escribe 7–50 KB en lugar de 645 KB.
- Pruebas también en Safari (WebKit) en GitHub Actions, con la app servida por HTTP (`tests/browser.py`); prueba nueva del guardado
  (`tests/storage.py`).
- Publicación automática desde GitHub Actions: etiqueta `vX.Y.Z` con sus notas y, si Pages publica desde Actions, despliegue.

## [1.20.0] — 2026-10-30

### Novedades
- Comprobar actualizaciones en Ajustes, con las novedades de cada versión.
- Copias automáticas diarias en el móvil (las 7 últimas).
- Diagnóstico en Ajustes para enviar un informe si algo falla.

### Mejoras
- La app instalada pesa la mitad y arranca más rápido.
- Aviso si el móvil no tiene espacio para guardar.
- Si tus datos se dañan, se guardan aparte para recuperarlos.

### Correcciones
- Flechas de mes del calendario del Dashboard.
- Añadir un ejercicio con un entreno en marcha.

### Interno
- Código formateado (una instrucción por línea) con equivalencia comprobada: `tools/format.js`, `tools/format_css.js` y `tools/same.js`.
- 480 funciones y variables renombradas con nombres descriptivos mediante un renombrado que entiende ámbitos (`tools/rename.js`).
- Registro de errores (`core/errors`) y revisión de los 41 `catch` vacíos.
- La compilación genera las fotos (`data/media`), las novedades (`data/release`) y `version.json`; ya no sustituye trozos de texto.
- Pruebas dentro del repositorio (humo, fotos, seguridad, protección de datos, despliegue, paseo aleatorio y capturas) y GitHub Actions.
- Diccionario de datos en `docs/STATE.md`.

## [1.19.0] — 2026-10-30

### Novedades
- Fotos de 28 ejercicios en la librería y en el entreno.
- Nuevo ejercicio: Curl con mancuernas.

### Mejoras
- Búsqueda sin tildes y con otros nombres (zancada búlgara, copa de tríceps…).

## [1.18.0] — 2026-10-29

### Mejoras
- Base más estable: la app funciona igual, con el código ordenado por funciones.

### Interno
- Código dividido en 63 módulos que `build.py` une en un único `index.html`.
- Capa de almacenamiento `Store` preparada para un futuro servidor (`docs/BACKEND.md`).
- Comprobaciones estáticas (`tools/check.js`) y pruebas de humo, capturas y paseo aleatorio.

## 1.17.0 y anteriores

StrataFit nació como FitFlow. Lo esencial de esas versiones:

- **Workout:** programas predefinidos (Bro Split, Push Pull Legs, Torso / Pierna, Híbrido, Hyrox / CrossFit…) con niveles principiante,
  intermedio y avanzado; sesión con cronómetro, series, repeticiones, peso, esfuerzo (RPE), descanso por ejercicio con avisos sonoros,
  superseries y triseries, tempo, calentamiento, progresión sugerida, calculadora de discos, semana de descarga y cambio de ejercicio.
- **Librería** de más de 500 ejercicios con mapa muscular y filtros por grupo y equipo; «Mis workouts»; creación de programas
  (guiada o con tus workouts) y programas compartidos por código.
- **Nutrición:** comidas del día con macros, dieta según el gasto energético, agua, plantillas de día de entreno y de descanso,
  alimentos frecuentes, búsqueda en Open Food Facts y escáner de códigos de barras.
- **Dashboard:** progreso por ejercicio, récords, calendario, peso corporal con IMC, medidas y fotos de progreso, cardio,
  temporizador WOD (AMRAP, EMOM, Tabata, For time), logros y exportación a CSV.
- **Perfil:** datos biométricos, kg o lb, tema claro u oscuro, colores de acento y estilo Cristal; copia de seguridad en archivo;
  uso sin conexión e instalación en la pantalla de inicio.
