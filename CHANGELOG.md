# Historial de cambios

Todos los cambios importantes de StrataFit, de la versión más reciente a la más antigua.

Cada versión se divide en **Novedades**, **Mejoras**, **Correcciones** e **Interno**. La app enseña los tres primeros apartados en el
aviso de versión nueva (por eso se escriben para el usuario, en frases cortas); **Interno** es solo para desarrollo.
`build.py` lee este archivo: la versión de `APPV` debe tener aquí su entrada o la compilación se detiene.

El formato se inspira en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y la numeración sigue
[versionado semántico](https://semver.org/lang/es/).

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
