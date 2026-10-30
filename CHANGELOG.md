# Historial de cambios

Todos los cambios importantes de StrataFit, de la versión más reciente a la más antigua.

Cada versión se divide en **Novedades**, **Mejoras**, **Correcciones** e **Interno**. La app enseña los tres primeros apartados en el
aviso de versión nueva (por eso se escriben para el usuario, en frases cortas); **Interno** es solo para desarrollo.
`build.py` lee este archivo: la versión de `APPV` debe tener aquí su entrada o la compilación se detiene.

El formato se inspira en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y la numeración sigue
[versionado semántico](https://semver.org/lang/es/).

## [1.24.0] — 2026-10-30

### Novedades
- «Mi nutrición»: toca el icono de cuchillo y tenedor y verás tus kcal en un anillo con el reparto de macros, tu peso, tu objetivo, tu actividad y las comidas al día. Puedes ajustarlo a mano o recalcularlo con tus datos.
- Medallas en Logros: cada logro tiene la suya, en bronce, plata, oro o platino.
- Informar de un fallo, en Ajustes: eliges el tipo de fallo, lo explicas y lo envías.
- 280 alimentos nuevos, 495 en total, ordenados por grupos.

### Mejoras
- Nutrición sabe sola si hoy es día de entreno o de descanso, según tu rutina.
- Cada comida tiene botones más pequeños: «+», guardar plato, Buscar y Scan.
- Un «?» junto a las plantillas explica para qué sirven.
- Ajustes tiene su propia página, ordenada por secciones; en Perfil, tus datos van en «Datos» y cada apartado tiene su icono.
- Más protección: la app solo ejecuta su propio código y solo se conecta a sí misma y a Open Food Facts.

### Correcciones
- Las kcal y los macros puestos a mano ya no se pierden al cambiar tu peso o tu actividad.
- Un alimento o una comida con datos dañados ya no impide abrir Nutrición.
- Un alimento habitual guardado con datos dañados ya no puede colar texto sin filtrar en la hoja «Añadir».
- Corregidos los valores de las lentejas crudas y del surimi.

### Interno
- Tipo de día sin elegirlo a mano (`nutrition/templates`, `dayInfo`): el Día 1 de la rutina es el lunes; un día con entreno
  registrado es de entreno, uno ya pasado sin entreno, de descanso, y hoy y los siguientes, lo que diga la rutina. Fuera `S.dt` y el
  selector.
- `nutrition/goals` («Mi nutrición» y «Ajustar a mano»). Los objetivos puestos a mano se marcan con `S.nu.man`: `applyDiet()` no los
  pisa salvo que se le pida (`force`: «Recalcular con mis datos», cambiar el objetivo o el objetivo físico). `cleanGoals` deja `S.nu`
  válido al arrancar.
- Ayudas «?» genéricas (`core/ui`: `HELP`, `helpDot`, burbuja que se cierra con otro toque o al desplazar). `data-enter` lanza una
  acción con Intro desde un campo.
- `data/foods`: 13 grupos (`FOOD_GROUPS`) y 495 alimentos; la hoja «Añadir» los muestra todos por grupos y, sin resultados, ofrece
  buscar en internet. «Buscar» y «Scan» abren desde cada comida la búsqueda en Open Food Facts y el escáner.
- `profile/settings`: Ajustes como página con secciones y una página por fila; mientras está abierta, cada `R()` la repinta con
  `core/morph`. Copia de seguridad y Diagnóstico vuelven a Ajustes con «←». Pie de Perfil con nombre y versión.
- `system/report`: informe de fallo con tipo y texto, abierto como incidencia nueva en GitHub (sin publicar ningún correo) o
  compartido; los datos técnicos, opcionales y visibles antes de enviar.
- `extras/medals`: 27 medallas SVG (forma y color por familia, metal por nivel, dibujo y cifra por logro).
- Más robustez con datos dañados o manipulados: comidas y alimentos propios mal formados se ignoran al pintar (`itemMacros`,
  `mealItems`, `allFoods`), los datos de perfil solo admiten nombre, email y teléfono con un largo máximo, la foto de perfil
  comprueba tipo y tamaño, y los gramos van de 0 a 5000.
- CSP en una etiqueta `<meta>` (`build.py`, `csp_meta`): `script-src` con la huella sha256 de cada `<script>` en línea (y `'self'`
  en el paquete), sin `'unsafe-inline'` ni `eval`; `connect-src` solo la propia web y Open Food Facts; imágenes propias, `data:` y
  `blob:`. El `onerror="…"` del módulo de entrada pasa a un escuchador de `error` en fase de captura en `src/index.html`.
- Pruebas: `tests/features.py` (nueva) y 6 pantallas más en `tests/shots.py` (39), que recorren también seguridad y accesibilidad.
  `tests/init.js` apunta cada bloqueo de la CSP (`window.__csp`) y a11y, features y smoke lo comprueban; `tests/security.py`
  prueba el escapado sin la CSP (`bypass_csp`, con un control de que lo detectaría) y después la CSP sola.

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
- GitHub Pages ya publica desde GitHub Actions: se quita del repositorio la copia compilada de la raíz (`index.html`, `sw.js`,
  `version.json`, manifiesto, iconos, `js/` y las 41 fotos de `img/`, duplicadas de `src/img`). La CI dice en cada solicitud de
  fusión desde dónde publica y, si se volviera al modo «desde la rama», falla si la raíz no lleva la app compilada de ese código
  (`tools/pages.py`).

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
