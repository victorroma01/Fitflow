# Revisión de la V1.0.4 antes de publicarla

Repaso técnico y funcional de la V1.0.4 mientras espera a publicarse (26 de noviembre de 2026), en la rama `pulido-1.0.4`, que
sale de `desarrollo-1.0.32`. Se miró el código, la seguridad, los datos, el rendimiento y el funcionamiento de toda la app, con
más detalle en lo que ha cambiado desde la [revisión de la V1.0.32](revision-1.0.32.md): el motor de las figuras 3D
(`src/fig3d`, unas 9.100 líneas), los textos legales con la aceptación, el consentimiento y «Eliminar cuenta», el inglés, el
equipamiento, la librería en tarjetas y Workout. Lo que aquí se da por comprobado se ejecutó; lo que no, se dice.

En corto: el código sigue limpio, legible y medido, y la app instalable es más rápida que la 1.0.31 publicada. Salió **un fallo
de funcionamiento**, anterior a esta versión y ya corregido: en un día de descanso no se veían la barra de la semana ni los
avisos de la semana de descarga y de rotar los ejercicios.

Después, con la revisión fusionada (#76), un **[segundo repaso](#segundo-repaso)**, más funcional: cada pantalla mirada a
320 y 390 px, en español y en inglés, los nombres largos, más paseos al azar y la memoria al abrir y cerrar lo más pesado.
Salió un fallo de esta versión, sin publicar, en la tarjeta del día de un móvil pequeño, y cuatro detalles de 320 px.

## Qué se miró y cómo

1. **Todo `src/js` con TypeScript**, sin tocar el código y con la búsqueda de variables sin usar dentro de las funciones
   (`noUnusedLocals`): ninguna. Los 150 avisos que da sin los tipos del proyecto no son de fondo: tipos que no puede deducir
   sin anotar (los de `docs/tecnica/tipos.md`), restas de fechas (`Date - Date`, que en JavaScript valen) y `webkitAudioContext`.
   Con los tipos del proyecto (`node tools/types.js`), los 151 módulos, correctos.
2. **Búsqueda de lo frágil** en el código nuevo: cada `JSON.parse` (todos con su `try` o con el `catch` en quien llama), las
   fechas (por día local, `dayKey`), las escuchas y los temporizadores (las de `extras/pictures` se ponen una vez, al cargar el
   módulo), las direcciones `blob:` (las de las miniaturas se guardan para la sesión, como mucho una por ejercicio; las de la
   figura grande se sueltan al terminar) y cada `raw(…)` con algo que no es un literal (solo HTML ya escapado; los textos de
   la gente van escapados, también los de Fallos y sugerencias y Administración).
3. **Código sin usar**: nada (`tools/check.js` en cada compilación; TypeScript, que mira además lo de dentro de las funciones,
   tampoco). Toda acción, cambio y tecla que nombra el HTML (`data-a`, `data-c`, `data-u`, `data-enter`) tiene su manejador.
4. **Tamaño de las funciones**: en `src/js`, 3.032, de las que 55 pasan de 40 líneas y 8 de 80, como en la 1.0.32: el dibujo
   del PDF y de la imagen del resumen, y el guardado y la sincronización, que se leen de arriba abajo. En el motor de las
   figuras, las largas son las familias de posturas (una función por familia, con sus variantes): dibujo, comprobado lote a
   lote con `tools/figuras3d`.
5. **Seguridad**: la prueba de inyección (`tests/security.py`, código HTML en cada texto y número de 52 pantallas, y en una
   copia de seguridad), la política de seguridad (CSP) y los cambios de las reglas de Firestore desde la 1.0.32: la constancia
   de lo aceptado, borrar el propio perfil y los propios avisos, y listar solo los propios.
6. **Datos**: las pruebas al azar del guardado y la sincronización (`tests/syncfuzz.py`) con 50 semillas más que las de la
   batería (de la 11 a la 60, 80 pasos cada una): ningún dato perdido, nada borrado que vuelva, los dos móviles y la nube
   iguales y sin errores. Y el paseo al azar de `tests/walk.py` con dos semillas nuevas.
7. **Rendimiento**: `tests/perf.py` (1,3 MB de datos, 5 vueltas) con la 1.0.31 publicada y con esta, en el paquete que se
   publica y en el archivo único ([abajo](#comprobado)).
8. **Funcionamiento**: Workout en los siete días de la semana, en semanas de descarga y de rotar y editando, con el HTML de
   antes y después de cada cambio comparado; las tarjetas en inglés a 320 y 390 px.

## Lo encontrado

| Id | Prioridad | Qué pasaba | Corrección |
| --- | --- | --- | --- |
| R6 | Medium | **En un día de descanso no salían la barra de la semana ni los avisos de la semana.** Workout añadía la barra («Esta semana · 1 de 5 entrenos»), la tarjeta de la semana de descarga (con «Omitir») y la propuesta de rotar buscando en el HTML la tarjeta del día de entreno; la de descanso es otra y no la encontraba. Al pasar de un día de entreno a uno de descanso, la barra desaparecía y lo de debajo saltaba; y si la semana de descarga se abría en un día de descanso, su hoja de bienvenida no salía hasta tocar un día de entreno. Viene de antes: está igual en la 1.0.31 publicada. | Workout se compone directamente, pieza a pieza (`workoutTab`, en `workout/day`): los días, la barra, los avisos de la semana y la tarjeta del día, sea de entreno o de descanso. En un día de entreno y al editar, el HTML es el mismo que antes (comparado en 17 estados); en uno de descanso, sale lo que faltaba. Prueba fija en `tests/programs.py`, que falla sin la corrección. |
| O2 | — | **Las piezas de Workout se metían buscando un trozo de HTML** (`withWeekBar` y la tarjeta de la descarga: `h.replace('<div class="card hero…')`): cualquier cambio en la tarjeta del día las dejaba fuera sin avisar, que es lo que pasó con la de descanso (R6). | La composición directa de R6: sin buscar en el HTML, cada pieza en su sitio. Sale una función menos (`workoutDayBase`). |
| O3 | — | **Una prueba de las figuras fallaba con el ordenador cargado** («Carrera 1 km: no se detiene en ningún momento del ciclo», una vez, con otra prueba larga a la vez). No es de la app: tras cada dibujo, la figura espera el doble de lo que le ha costado (así un móvil lento no se atasca), y con el reloj de prueba en marcha ese coste es tiempo de verdad: un dibujo más largo que un paso de la medida (52 ms) daba dos momentos iguales. | El ciclo se mide con el reloj de prueba quieto (`tests/figures.py`); sus pasos ya avanzaban a mano. Comprobado alargando cada dibujo a propósito (unos 180 ms, como con el ordenador muy cargado): la medida de antes daba momentos iguales y la de ahora no. |

## Lo que no hacía falta tocar

- **Rendimiento de la app que se publica**: ya es más rápida que la 1.0.31 ([abajo](#comprobado)).
- **El archivo único** (`dist/stratafit.html`) tarda más en pintar la primera vez (189 ms frente a 138): lleva incrustadas, en
  el código, las 38 portadas de los días, las ilustraciones de la librería y los iconos del material (2,9 MB, antes 1,2). No es
  lo que se publica (eso es el paquete, que las descarga aparte y pinta en 119 ms); sirve para las pruebas y para abrir la app
  sin servidor. Sacar las imágenes del código complicaría la compilación para algo que nadie usa a diario.
- **Las funciones largas del motor de las figuras**: partirlas no las haría más claras (son las posturas de cada familia, una
  detrás de otra) y obligaría a volver a verificar los 529 ejercicios.
- **El perfil de la nube lo puede borrar su dueño** (para «Eliminar cuenta»). Una cuenta con una contraseña temporal podría
  borrarlo y crearlo de nuevo para no tener que cambiarla: solo se perjudica a sí misma (el administrador conoce esa
  contraseña) y hace falta hacerlo a mano contra el servidor. No compensa complicar las reglas.

## Comprobado

- **Las pruebas nuevas fallan sin la corrección**: con la compilación de antes, la de R6 falla («en un día de descanso de esa
  semana, también la barra de la semana y la tarjeta con «Omitir»»).
- **Lo mismo que antes donde no debía cambiar nada**: el HTML de Workout en 17 estados (los siete días de una semana normal,
  días de entreno y de descanso de semanas de descarga y de rotar, y editando un día de entreno y uno de descanso) es idéntico
  salvo en los días de descanso, que ganan la barra y los avisos.
- **Rendimiento** (`tests/perf.py`, 1,3 MB de datos, 5 vueltas, en el mismo ordenador):

  | En el paquete que se publica | V1.0.31 | Ahora |
  | --- | --- | --- |
  | Primer pintado | 130 ms | 119 ms |
  | Guardar, mirándolo todo | 9,3 ms | 8,0 ms |
  | Guardar, solo el núcleo | 0,6 ms | 0,6 ms |
  | Ver qué hay que subir | 25,0 ms | 13,1 ms |
  | Buscar en la Librería (cada letra) | 4,8 ms | 2,5 ms |
  | Abrir Registros | 49,0 ms | 46,2 ms |

  Pintar cada pestaña sigue entre 0,5 y 7 ms. El motor de las figuras (unos 350 KB) solo se descarga al dibujar una figura.
- **Datos**: las 50 semillas más de `tests/syncfuzz.py`, correctas.
- **Batería completa** y GitHub (Chrome, Safari, Firefox y el emulador de Firebase), con la
  [solicitud #76](https://github.com/victorroma01/Fitflow/pull/76).

## Lo que no se pudo comprobar

- **En un iPhone y un Android de verdad** (I-01): todo lo de aquí es el navegador de prueba con el tamaño de un móvil.
- **«Eliminar cuenta» contra el servidor de verdad**: se prueba con el emulador de Firebase (`tests/cloud.py`), que no tiene
  el ajuste de Authentication que la permite ([pendiente](#pendiente-antes-de-publicar)).

## Segundo repaso

Tras fusionar la revisión (#76), en la rama `repaso-1.0.4` ([solicitud #77](https://github.com/victorroma01/Fitflow/pull/77)).

### Qué se miró

1. **Cada pantalla, a ojo**: las 52 de `tests/shots.py` a 320 × 568 (en español y en inglés) y a 390 × 844 con el tema claro,
   y además el resumen al terminar un entreno, un grupo de la librería, la hoja del ejercicio de nombre más largo, la semana de
   descarga y la rotación, a 320 y 390 px y en los dos idiomas. Buscando textos cortados, cosas fuera de sitio o una encima de
   otra.
2. **Los nombres largos**: los de los días de todos los programas, en los dos idiomas, a 320 px (ocupan dos líneas como mucho),
   y uno larguísimo, como el de un workout propio.
3. **Robustez**: paseos al azar nuevos (`tests/walk.py`, semillas 21 a 26, 220 pasos cada una) y abrir y cerrar muchas veces lo
   más pesado, midiendo nodos, escuchas y memoria tras recoger la basura.
4. **Código**: las fechas (todas por calendario, también el día del cambio de hora), los números escritos con coma, las
   escuchas y los temporizadores (se ponen una vez, o se quitan al cerrar), y el inglés (`tools/i18n.js --todo`: nada).

### Lo encontrado

| Id | Prioridad | Qué pasaba | Corrección |
| --- | --- | --- | --- |
| R7 | Medium | **A 320 px, los botones de la tarjeta del día quedaban medio fuera** con un nombre de dos líneas, y los hay en los programas («Brazos (bíceps y tríceps)» de Bro Split, «Torso B (hipertrofia)»): 24 px recortados. La tarjeta tenía la forma de su foto con `aspect-ratio` y recortaba lo que no cabía. Es de esta versión (la tarjeta más alta, #75), sin publicar. Y desde 440 px, el tope de 320 px de alto la estrechaba (403 px de ancho, las demás tarjetas 532). | La forma de la foto es su alto mínimo (`min-height`, con el ancho de la página): crece lo justo y, desde 440 px, ocupa el ancho de la página como las demás. Con `overflow: clip` crecía en Chrome, pero no en Safari. El nombre, en dos líneas como mucho, con «…»: uno larguísimo no tapa la foto ni echa los botones. El final de su sombra va en un borde transparente, para que no asome una tercera línea. |
| R8 | Low | **Ajustes, a 320 px: los valores se cortaban a media letra** («Oscuro · C», «Azu»), en inglés casi enteros. El valor era `inline-flex` y `text-overflow: ellipsis` no hace nada en flex. Ya pasaba en la 1.0.31. | El valor es un bloque: lo que no cabe acaba en «…». La muestra del color de acento, a 4 px de su nombre: con 6, «Azul eléctrico» no cabía a 390 px con Inter por un píxel. |
| R9 | Low | **Mi nutrición, a 320 × 568: la fila «Objetivo» se leía a través de «Ajustar a mano»**, translúcido en Cristal, con los dos textos uno encima del otro. Ya pasaba en la 1.0.31. | Los dos botones de abajo van sobre el fondo de la página. |
| R10 | Low | **Recorrido, a 320 × 568: el primer paso tapaba la tarjeta del día.** Con la tarjeta más alta no cabía la explicación ni debajo ni encima, y se ponía encima de lo que explica. | Si la explicación no cabe ni debajo ni encima, se desplaza la página, lo justo para que quepa debajo. |
| R11 | Low | **El texto de ayuda de un campo se cortaba a media letra** (el buscador de la Librería a 320 px: «…músculo o equi»). | Lo que no cabe en un campo acaba en «…». |
| O4 | — | **Dos pruebas no veían lo que decían.** La de la forma de la tarjeta del día daba por buenos los botones a menos de 30 px del borde, también fuera (distancia negativa); y la de los valores de Ajustes exigía «Azul eléctrico» entero a 390 px, que depende de la letra del sistema (en GitHub falló en los tres navegadores). | Los botones, dentro (y prueba nueva con nombres de dos líneas y larguísimos a 320, 390 y 768 px); los valores, enteros o con «…». |

### Lo que se queda como está

- **Los decimales** se quedaron para el propietario, que eligió el punto (26-11-2026): ya van con punto en toda la app,
  también el análisis mensual y su PDF (`fmtN`), Diagnóstico y cuatro textos que los ponían con coma. Los CSV en español
  siguen con coma decimal, la que espera Excel en español.
- **La fecha de «Registrar peso», a 320 px en Chromium**, se corta un poco: el campo de fecha de Chromium calcula su ancho
  menor de lo que ocupa con la letra de la app. Darle su ancho no bastó y en Safari ese campo es otro: se mirará en la prueba
  en Android (I-01).
- **El menú lateral**: sus opciones largas («Rotar ejercicios») pasan por encima del nombre del día, que se ve detrás. Es su
  diseño (un degradado de izquierda a derecha) y se lee (`tests/contrast.py`).

### Comprobado

- **Cada corrección con su prueba, que falla con la compilación de antes**: los valores de Ajustes, el fondo de los botones de
  Mi nutrición, los campos de texto y la tarjeta del día con nombres largos (`tests/features.py`), y el primer paso del
  recorrido a 320 × 568 (`tests/experience.py`).
- **Paseos al azar**: las semillas 22 a 26, sin errores. La 21 se cortó por una recarga de la página mientras el ordenador
  hacía otra prueba; repetida sola, terminó sin errores.
- **Memoria**: 30 vueltas de abrir y cerrar cada una de las 8 pantallas más pesadas (la hoja con figura, la Librería, el
  Overview, Registros, el análisis, Ajustes, empezar y descartar un entreno y las pestañas) y 90 de la hoja con figura (con 6
  ejercicios distintos): los nodos y las escuchas vuelven a lo mismo (1.417 y 68) y la memoria se queda plana (de 6,05 a
  6,32 MB en 75 vueltas: las miniaturas que se guardan para la sesión).
- **Rendimiento**, igual que antes (`tests/perf.py`, 5 vueltas, el paquete que se publica): primer pintado 108 y 104 ms,
  abrir Registros 37 y 35 ms; el resto, dentro del ruido.
- **Con la tarjeta nueva**: el contraste de cada portada (`tests/covers.py`) y de los 40.248 textos de 32 configuraciones
  (`tests/contrast.py`), los tamaños de pantalla (`tests/layout.py`) y el recorrido (`tests/experience.py`), correctos.
- **Batería completa** y GitHub (Chrome, Safari, Firefox y el emulador de Firebase), con la solicitud #77.

## Optimización y limpieza

El 27 de noviembre, a petición del propietario y en la rama `optimizacion-1.0.4`: quitar lo que no se usa, revisar el código
y las herramientas, dejar la base lista para llevar la app a iOS y Android y tenerlo documentado.

**Lo que no se usaba.** En `src/js` no había nada: `tools/check.js` y `tools/types.js` ya hacen fallar la compilación con
cualquier declaración, importación, acción, icono o clase CSS sin usar. Tampoco sobraba ningún dato (consejos, ejecuciones,
nombres en inglés, otros nombres o figuras de ejercicios que no están en la librería), ninguna imagen ni ningún archivo de las
pruebas, de `static/` o de la documentación. Sí en el motor de las figuras (`src/fig3d`), que no pasaba por esas reglas: 90
declaraciones que nunca se leían (nombres desestructurados de más, variables y funciones que quedaron de los ajustes de los
lotes) y tres sumas que no hacían nada (`+ x * 0`). Se quitaron, y la huella de todo lo que dibuja el motor (los 529
ejercicios en 16 momentos y con dos cámaras, el dibujo completo y el ligero, y las posturas) es la misma antes y después; los
encuadres ya calculados también (solo cambia su huella). La regla 14 de `tools/check.js` lo vigila desde ahora y
`tools/figuras3d/huella.js` sirve para demostrarlo en el próximo cambio así.

**Código repetido.** Buscado con un programa (funciones con el mismo cuerpo y trozos de 60 piezas iguales en dos sitios): las
cifras de la portada de un día (ejercicios, series y minutos) estaban tres veces (el día, Overview y la vista previa de un
entreno a la carta) y el relleno y el borde de rectángulos y círculos, dos en el PDF. Ahora, una (`dayStats`, `daySets` y
`fillStroke`). Lo que se parece en `cloud/backup` son dos frases distintas para quien la lee, y se quedan.

**La base para iOS y Android.** Lo que dentro de una app nativa se hace de otra forma (guardar en el dispositivo, compartir y
copiar, avisos y globo, el service worker, la pantalla encendida, la vibración, «atrás», la cámara, App Check y qué
dispositivo es) ya estaba casi todo en su módulo. Faltaba «Compartir» en dos sitios y el portapapeles en uno (ahora en
`system/files`), IndexedDB en cuatro (ahora con `core/idb`), el almacenamiento persistente en `core/boot` (ahora en
`system/space`) y la conexión y el navegador en otros dos (ahora en `core/platform`). La regla 15 de `tools/check.js` no deja
usarlos fuera de su módulo, y [Llevarla a iOS y Android](movil.md) cuenta qué cambia en cada uno y los pasos.

**Herramientas.** `tests/perf.py` mide también el paquete que se publica (con su service worker), que es lo que abre quien
usa la app, y no solo el archivo único: [medido](rendimiento.md#medido-en-la-v104) después de la limpieza, igual o algo mejor
que la 1.0.31 en todo. `tests/run.sh` dice lo que tarda cada prueba y la batería entera.

**Después, Registros y la comprobación de los datos.** A petición del propietario, Registros se pinta por tandas de 60 (con
700 entrenos, abrirla pasa de unos 32 ms a 4, y de unos 70 a 15 hasta verse pintada) y la comprobación de los datos al abrir
tarda la mitad (de 2,8 ms a 1,5), sin dejar de hacerse entera cada vez ([lo medido](rendimiento.md#medido-en-la-v104)).

**Lo que se queda como está.** Hacer que se descarguen al usarlos el mapa muscular (`data/anatomy`, 29 KB) o las posturas
(`data/figposes`, 21 KB), que van al arrancar: los usan cosas que se pintan sin esperar (los iconos de los grupos musculares,
el material de Overview) y habría que esperarlos; el ahorro, de unos milisegundos, no compensa ese riesgo en esta versión.

## Pendiente antes de publicar

Del propietario, en las consolas (no se puede hacer desde el código):

1. **Firebase → Authentication → Settings → User actions**: comprobar que cada usuario puede eliminar su cuenta. Si no,
   «Eliminar cuenta» borra los datos pero no la cuenta, y lo dice (`ADMIN_ONLY_OPERATION`).
2. **Después de publicar, en GitHub → Actions → «Limpieza de cuentas»**: un `simulacro` a mano antes de su primera pasada de
   verdad, para mirar los recuentos ([Limpieza de cuentas](backend.md#limpieza-de-cuentas)). Solo se puede lanzar desde `main`.
3. **GitHub → Settings → General → «Automatically delete head branches»**, para que las ramas fusionadas se borren solas.
4. **La lista de comprobación en el iPhone** con la versión publicada ([pruebas](pruebas.md), del 30 al 46).
5. **Después de publicar, en GitHub → Actions → «Pasar las cuentas al dominio nuevo»**: `simulacro` y, si dice que las
   sesiones se conservan, `aplicar`; después, «Comprobar Firebase» ([cómo](backend.md#pasar-las-cuentas)). Faltaba en esta lista.

El propietario tiene estos pasos, detallados y en el orden de hacerlos, en un documento aparte.

Al publicar (con «publica»):

6. La fecha de los textos legales (`LEGAL`, en `cloud/consent`), que es la del día de publicación.
7. Fusionar `desarrollo-1.0.32` en `main`, comprobar que GitHub publica la app y despliega las reglas nuevas de Firestore
   (la constancia de lo aceptado, borrar el propio perfil y los propios avisos), y la etiqueta y la nota de la versión.

Sin fecha y fuera de esta versión: exigir App Check (I-05, ya configurado), la prueba en un Android (I-01), editar las series
de un entreno guardado y el modelo 3D propio en GLB.

## Publicada

El 27 de noviembre de 2026, a las 17:58: las pruebas de GitHub en verde, la etiqueta v1.0.4 con su nota, las reglas de
Firestore desplegadas y la web publicada. Después, el simulacro de «Pasar las cuentas al dominio nuevo» dio las reglas y el
ensayo correctos y 6 cuentas por pasar, pero «Las sesiones abiertas se conservan: Sin comprobar (PERMISSION_DENIED)»: la
cuenta de prueba no pudo entrar por la API pública desde GitHub. Como un navegador, la app dice venir solo del origen
(`https://victorroma01.github.io/`) y la tarea decía la dirección entera; ahora (`tools/admin/web.mjs`) dice primero el origen
y, si la clave no lo admite, la dirección entera, y si aun así no puede, el resumen da el motivo de Google. Las cuentas no se
pasan hasta saber que nadie tendrá que volver a entrar.

Ese arreglo va con la **1.0.4.1**, la primera revisión de la 1.0.4, que además deja más claro e impersonal el texto de
«Condiciones y privacidad», a petición del propietario: «acepta las condiciones y da tu consentimiento para tratar los datos de
salud». Y otro arreglo que vio el propietario en su iPhone: durante un entreno, al deslizar hacia abajo «Cómo se hace» para
quitarla, se movía el entreno de detrás. La figura grande se dibuja de nuevo en cada fotograma; si el dedo empezaba sobre ella,
el navegador dejaba de contar sus movimientos a la ventana y los convertía en desplazamiento, que pasaba a la página de detrás.
Ahora el dedo toca el sitio de la figura y no el dibujo (`pointer-events: none`), la ventana no pasa el desplazamiento a lo de
detrás (`overscroll-behavior: contain`), arrastrar en el fondo oscuro no mueve nada (`touch-action: none`) y deslizar hacia
abajo cierra las ventanas que suben desde abajo (`core/swipe`). La tarjeta de la revisión se titula «Corrección de errores» y
enseña sus dos correcciones encima de las novedades de la 1.0.4.

La 1.0.4.1 se publicó el mismo día, a las 21:04. Con ella, las 6 cuentas pasaron al dominio nuevo (20:03), «Comprobar Firebase»
las dio todas con el de ahora y el simulacro de la limpieza, nada que limpiar.

### Después, sin cambiar de versión

Lo que vio el propietario en su iPhone con la 1.0.4.1 se arregló y se publicó sin otra versión ni aviso, a petición suya: la app
sigue diciendo 1.0.4.1 y su nota no cambia (lo apunta **Interno** en `CHANGELOG.md`). Llega sola: el service worker ve que el
documento ha cambiado, `version.json` dice la misma versión, así que no sale el aviso (`system/updates`), y la app abre con lo
nuevo la siguiente vez.

- **Deslizar para volver enseñaba un hueco en negro** debajo de Overview (y de Evolución del peso): son pantallas que van en
  lugar de la pestaña, y al moverlas no había nada debajo. Ahora `core/swipe` pone debajo la pestaña a la que se vuelve
  (`core/render`, `screenBelow`), con su barra de pestañas y en el punto en que se dejó, y la pantalla que se mueve lleva su
  fondo, su botón de abajo y una sombra; en Chrome de Android, que agrandaba el área de lo fijo al salirse la página por un lado,
  la página ya no ensancha la pantalla (`overflow-x: clip`). Overview y Evolución del peso se abren arriba del todo y, al volver,
  la pestaña queda donde estaba (`openPage`, `closePage`). Y en un paso con su «‹ …» dentro (un grupo de la librería, el editor
  de un workout), debajo se ve el paso al que se vuelve (`core/ui`, `stepBelow`), no la pestaña. La barra de debajo es aparte
  (`core/tabbar`, `tabbarCopy`): la de la página solo marca sus botones (`tabButtons`), y si se vuelve a marcar en pleno gesto
  (al cambiar el tamaño de la ventana), la de debajo no pierde su pestaña (en Firefox, a veces, se quedaba sin ella).
- **El título y los botones de arriba, borrosos por arriba**: es el difuminado que iOS 26 pone bajo la barra de estado de una app
  instalada. Una banda fija del color del fondo en ese borde (`#edge`, solo en el iPhone y el iPad) hace que el sistema alargue
  ese color en vez de difuminar ([detalle](movil.md#lo-que-ya-está)).
- **La leyenda de los colores de la librería**: cada línea iba centrada por su cuenta y las rayas de color no coincidían. Ahora
  van alineadas por la izquierda, centradas juntas.
- **Los iconos de Isquios y glúteos y de Pecho**, cortados por un lado desde el paquete del rediseño, se completaron reflejando
  su lado bueno. Al verlo, el propietario pidió quitar el icono pequeño de todas las tarjetas: cada una dice solo el nombre del
  grupo y su número, sobre su ilustración (el modelo con el músculo resaltado). Con el icono se van la raya inclinada que lo
  separaba del nombre, el «+» de «Mis ejercicios», los 14 iconos de `src/img/catalog`, su ancho en `data/catalog`,
  `MEDIA.catIcon`, el tono `--acd` de `profile/appearance` (solo lo usaban el icono y la raya) y lo que la herramienta
  `tools/catalogo.py` hacía con ellos.
- **Las miniaturas de los ejercicios, más definidas**: se marcan sus bordes al dibujarlas (`extras/figure3d`, `sharpen`) y,
  como la huella de las figuras (`data/figstamp`) lleva también lo que las dibuja, las guardadas en el móvil se dibujan otra
  vez.
- **Más fotos en las tarjetas de los días**, para que no salgan siempre las mismas: el propietario mandó 30 (hechas con IA, en
  blanco y negro). `tools/variantes.py` prepara 29 como las demás portadas (recorte de 1,6:1, gris, 704 × 440, los claros
  bajados si hace falta para el texto blanco, WebP): de 3,6 MB quedan en 434 KB. La que el catálogo del paquete no deja elegir
  sola (la tercera de la cinta, con otra cara) se queda fuera. Cada una va con la portada de lo que se ve en ella: pecho,
  espalda, torso, hombros, brazos, trineo, carrera y descanso con el modelo; espalda, piernas, glúteo, hombros, carrera y
  descanso con la modelo. `workout/images` elige cuál lleva cada día: otra cada semana del programa y, en la misma semana, una
  distinta para cada día con la misma portada (`dayVariant`); en Entrenos a la carta, una para cada rutina (`odVariant`).
- **Programas, con fotos**: cada programa es una tarjeta con su foto, como las de Entrenos a la carta (`programs/manager`,
  `programCard`): la de serie, la de `PROGRAM_COVERS` (`data/photos`); uno propio, la de su primer día de entreno, en otra foto
  que los de serie si la hay. Con ella se va el botón a lo ancho (`wide-btn`), que ya no usaba nada más.
- **Lo que pesa**: el paquete guarda para usar sin conexión 434 KB más (las 29 fotos, una vez); el código, apenas nada (las
  listas de las fotos). La app que se publica tarda lo mismo en pintar por primera vez, con muchos datos (`tests/perf.py`, cinco
  vueltas: 100 ms antes y 112 después, y en otra medida 145 y 119: lo que varía de una vez a otra), y lo demás no cambia.
