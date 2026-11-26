# Revisión de la V1.0.4 antes de publicarla

Repaso técnico y funcional de la V1.0.4 mientras espera a publicarse (26 de noviembre de 2026), en la rama `pulido-1.0.4`, que
sale de `desarrollo-1.0.32`. Se miró el código, la seguridad, los datos, el rendimiento y el funcionamiento de toda la app, con
más detalle en lo que ha cambiado desde la [revisión de la V1.0.32](revision-1.0.32.md): el motor de las figuras 3D
(`src/fig3d`, unas 9.100 líneas), los textos legales con la aceptación, el consentimiento y «Eliminar cuenta», el inglés, el
equipamiento, la librería en tarjetas y Workout. Lo que aquí se da por comprobado se ejecutó; lo que no, se dice.

En corto: el código sigue limpio, legible y medido, y la app instalable es más rápida que la 1.0.31 publicada. Salió **un fallo
de funcionamiento**, anterior a esta versión y ya corregido: en un día de descanso no se veían la barra de la semana ni los
avisos de la semana de descarga y de rotar los ejercicios.

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
  detrás de otra) y obligaría a volver a verificar los 525 ejercicios.
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

## Pendiente antes de publicar

Del propietario, en las consolas (no se puede hacer desde el código):

1. **Firebase → Authentication → Settings → User actions**: comprobar que cada usuario puede eliminar su cuenta. Si no,
   «Eliminar cuenta» borra los datos pero no la cuenta, y lo dice (`ADMIN_ONLY_OPERATION`).
2. **Después de publicar, en GitHub → Actions → «Limpieza de cuentas»**: un `simulacro` a mano antes de su primera pasada de
   verdad, para mirar los recuentos ([Limpieza de cuentas](backend.md#limpieza-de-cuentas)). Solo se puede lanzar desde `main`.
3. **GitHub → Settings → General → «Automatically delete head branches»**, para que las ramas fusionadas se borren solas.
4. **La lista de comprobación en el iPhone** con la versión publicada ([pruebas](pruebas.md)).

Al publicar (con «publica»):

5. La fecha de los textos legales (`LEGAL`, en `cloud/consent`), que es la del día de publicación.
6. Fusionar `desarrollo-1.0.32` en `main`, comprobar que GitHub publica la app y despliega las reglas nuevas de Firestore
   (la constancia de lo aceptado, borrar el propio perfil y los propios avisos), y la etiqueta y la nota de la versión.

Sin fecha y fuera de esta versión: exigir App Check (I-05, ya configurado), la prueba en un Android (I-01), editar las series
de un entreno guardado, las imágenes nuevas (pospuestas por el propietario) y el modelo 3D propio en GLB.
