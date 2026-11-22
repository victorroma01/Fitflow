# Figuras de ejercicio

El modelo anatómico en 3D haciendo cada uno de los 527 ejercicios de la librería, visto en tres cuartos. Llegó con la
V1.0.4 y sustituye a las figuras de perfil de la V1.0.3 (un modelo plano, articulado, que ya no existe). Se hizo y se revisó
por lotes de ejercicios antes de entrar en la app (ver [Revisión](#revisión)).

## Qué se ve

- **En pequeño** (el entreno, el día, la ficha, las listas de la librería y de las rutinas): la figura quieta en el momento
  del gesto que mejor lo identifica, con los músculos que trabajan en rojo (principales) y naranja (secundarios), y el
  material. A ese tamaño los tonos oscuros del cuerpo van aclarados: oscuro sobre el fondo oscuro de la miniatura apenas se
  distinguía.
- **Al tocar la imagen**, la hoja «Cómo se hace»: arriba, la figura en grande, que se mueve con el gesto entero; debajo, a la
  izquierda, los músculos en pequeño (de frente y de espaldas) y, a su lado, el nombre del ejercicio y los músculos con su
  nombre; y después, el texto. El sitio de la figura tiene proporción fija (4:3): la figura llega cuando está dibujada y nada
  de la hoja se mueve al llegar.
- Un gesto **de ida y vuelta** (un curl, una sentadilla, un press) va como se mueve una persona: cada tramo arranca y frena
  sin tirones, la bajada es más lenta que la subida y solo se descansa en la posición de reposo; con pausa, si el ejercicio
  la tiene.
- Uno con **su propio reloj** no va y vuelve: un ciclo (andar, correr, pedalear, remar, nadar, la comba) sigue sin parar; uno
  que alterna los lados (un curl alterno, un crunch bicicleta) los turna; una secuencia (una cargada, un burpee, la levantada
  turca) pasa por sus posturas; una postura que se mantiene (una plancha, colgarse de la barra) respira.
- Lo que **se desplaza** (correr, empujar el trineo, gatear, los acarreos) lo hace en el sitio, como en una cinta: el suelo
  corre bajo los pies, y en la cinta, su banda.
- Con **«Reducir animaciones»** (Ajustes) o si el móvil pide menos movimiento, la figura no se mueve: salen sus posturas una
  junto a otra. En un gesto de ida y vuelta, «Inicio» y «Final»; en uno con su propio reloj, sus posturas más distintas,
  hasta tres y por orden (los dos pasos de la carrera, el burpee de pie, en el suelo y en el salto), o una sola si casi no se
  mueve (la plancha).
- Un **ejercicio propio** no tiene figura: se ve como siempre, con sus músculos en el mapa.

Hay 495 figuras distintas, de 82 familias de movimiento: los ejercicios que se hacen igual (las series de carrera, un curl
con barra recta o con barra Z) comparten figura.

## Cómo está hecho

| Pieza | Qué es |
| --- | --- |
| `src/fig3d/*.js` | **El motor** (`fig3d.js`), **el material** (`gear3d.js`) y **las familias de movimiento** (`mov3d.js` … `cardio3d.js`). Scripts clásicos, `(function (G) {…})(window);`, que dejan todo en `G.Fig3D`; los usan tal cual las páginas de revisión (`tools/figuras3d`). |
| `src/js/extras/motor3d.js` | El **molde** del motor en la app: `build.py` (`motor3d_js`) lo sustituye por los archivos de `src/fig3d`, en el orden de `FIG3D_FILES`, dentro de una función `motor3d(map, regions)` que les pasa un objeto en vez de `window` (así no tocan `window` y van en modo estricto) y devuelve `Fig3D`. |
| `src/js/data/figposes.js` | La **tabla**: ejercicio → familia y variantes, en palabras (`'Press inclinado mancuernas': 'press incline db'`, `'Remo con barra agarre supino': 'row bar supine'`). Lleva todo lo que distingue el 3D: el material, el agarre, el banco, la pausa. |
| `src/js/extras/figure3d.js` | Lo que **dibuja la app** con el motor: arranca el motor con el mapa muscular (`data/anatomy`) y las regiones de cada músculo (`extras/anatomy`, `MUSCLE_REGIONS`), hace cada ejercicio con sus músculos de la librería, pasa las miniaturas a imagen (`thumbBlob`) y pone en marcha las figuras grandes (`startStages`). |
| `src/js/extras/pictures.js` | Lo que se hace **sin el motor**: `exHasFigure`, `exPicture` (la miniatura, o su hueco), `exPictureLater` (la de una fila que aún no se ve), `exMotion` (el sitio de la figura grande), la cola de miniaturas por dibujar y su caché en memoria y en el móvil. |
| `src/js/core/lazy.js` | `loadFigures`: descarga el motor y `extras/figure3d` la primera vez que hace falta una figura. |
| `src/js/library/howto.js` | La hoja. |
| `src/types/fig3d.d.ts` | Lo que la app usa del motor, para el comprobador de tipos (el motor no es un módulo de `src/js`). |

### El motor

El cuerpo se construye con cilindros elípticos (tronco, cuello y cabeza, brazos, antebrazos, muslos y piernas, con manos y
pies) y lleva envueltos los músculos del mapa de la app, de frente y de espaldas: cada uno conserva su forma y solo cambia el
ángulo desde el que se ve. En cada fotograma se colocan los huesos (cinemática inversa para brazos y piernas), se proyecta
todo desde la cámara de tres cuartos del ejercicio y se pinta en SVG, de atrás adelante: la silueta con su borde, los
músculos con su degradado y su rayado, y lo que trabaja en rojo y naranja. Lo que queda de espaldas a la cámara no se pinta.

Cada familia recibe las variantes de un ejercicio y da su postura en cada momento del gesto (`at(t)`, de 0 a 1), su cámara y,
si no es de ida y vuelta, su reloj (`beat(ms)`). Las posturas salen de reglas físicas: los pies no se mueven del suelo, las
rodillas van hacia las puntas, el peso queda sobre el medio del pie, las manos llegan a lo que agarran y nada atraviesa el
cuerpo ni el material.

`Fig3D.bounds(svg)` mide lo que ocupa un dibujo sin pintarlo: recorre sus etiquetas (trazos, curvas por sus extremos de
verdad, círculos, elipses, el desplazamiento de los discos) y deja fuera lo que no se ve y lo que no encuadra a propósito
(los grupos `nf`: el suelo que corre, el agua, lo alto de una máquina, las cintas hasta su anclaje). Da lo mismo que
`getBBox` pieza a pieza, en la cuarta parte de tiempo y sin la página. `frameBox` lo usa en varios momentos del gesto.

### En la app

- **El motor se descarga al usarlo.** Al arrancar no se carga: la primera miniatura que haga falta dibujar, o la primera
  hoja, lo descarga (el service worker lo tiene guardado desde que se instaló la app, así que también va sin conexión).
- **Una miniatura se dibuja una vez.** `extras/figure3d` dibuja la figura quieta sin el rayado (a ese tamaño no se
  distingue), con los tonos oscuros aclarados (un filtro gamma), la encuadra en lo que ocupa con un margen pequeño y la pasa
  a imagen en un lienzo: WebP de 72 px por la densidad de la pantalla (hasta 216 px), unos 6–10 KB. La imagen se guarda en la
  memoria y en el móvil (IndexedDB, base `fffig`, una fila por ejercicio con la versión de la app y el tamaño): la siguiente
  vez se enseña al momento, sin el motor. Son dibujos de la librería, iguales para cualquiera, no datos de nadie; se rehacen
  al cambiar de versión. Donde el navegador no deja leer el lienzo, la imagen es el propio dibujo y no se guarda.
- **El momento de la miniatura**: en un gesto de ida y vuelta, la postura final (un curl arriba, una sentadilla abajo); en
  uno con su propio reloj, la postura más lejos del principio (el otro paso al correr, el brazo arriba en un curl alterno, la
  barra arriba en un clean & jerk). La familia puede decir otro (`still`): el burpee, con el pecho en el suelo; los wall
  balls, abajo con el balón al pecho.
- **Mientras se dibuja, su hueco** (`svg[data-pic]`, del mismo tamaño), que se cambia por la imagen en cuanto está. Se
  dibujan de dos en dos (mientras una se pasa a imagen, que lo hace el navegador aparte, se dibuja la siguiente) y con un
  respiro entre una y otra. Una lista larga pide primero las de las filas que se ven; las demás, detrás, de arriba abajo, y
  pasan delante en cuanto su fila se acerca a lo que se ve. Al cerrar la lista se deja de dibujar lo que ya nadie espera.
- **Las del plan, antes de verlas**: unos segundos después de abrir la app, en un rato libre, se dibujan las de los
  ejercicios del plan que aún no estén (tras instalar o actualizar), para que el día y el entreno las tengan al momento.
- **La figura grande** se encuadra en el gesto entero (trece momentos) y se dibuja con el reloj de su gesto mientras se ve
  (fuera de la vista no se dibuja); si un dibujo cuesta más de medio fotograma, espera otro tanto antes del siguiente. Cada
  una lleva su prefijo en lo que define (degradados de la cabeza, rayados), así que dos en la página no se pisan.

## Añadir un ejercicio o una variante

1. En `data/figposes.js`, una entrada con el nombre del ejercicio de la librería y su familia y variantes. Si se hace como
   otro, con las mismas palabras.
2. Si hace falta una variante nueva (otro material, otro agarre), se añade a su familia en `src/fig3d`; si el gesto es otro,
   una familia nueva, con su nombre en la cabecera del archivo («Define: Fig3D.FAMILIES.…»).
3. Se revisa con las herramientas de `tools/figuras3d` (las pruebas de manos, pies, choques y saltos, y la página del lote)
   y, en la app, con `python3 build.py` y la hoja del ejercicio. `tests/fig3d.test.mjs` lo dibuja en todo el gesto.

## Lo que pesa

- El motor va en un archivo aparte: unos 340 KB (130 KB comprimido) en el paquete, que solo se descargan al usarlo. Lo que
  carga al arrancar bajó de 578 a 485 KB al quitar las figuras de perfil.
- Arrancar el motor: unos 65 ms en un ordenador; con la CPU cuatro veces más lenta (un móvil normal), unos 230 ms, una vez.
- Una miniatura: unos 35 ms (115 ms con la CPU cuatro veces más lenta); doce a la vez, unos 0,3 s (0,9 s). Guardada, nada.
- Un fotograma de la figura grande: unos 3 ms de dibujo.

## Pruebas

- `tests/fig3d.test.mjs` (sin navegador): el motor tal como va en la app (compuesto como lo hace `build.py`, en modo
  estricto) hace los 527 ejercicios; cada uno se dibuja en nueve momentos del gesto sin números rotos, lo que ocupa es el de
  una figura, lo que usa cada dibujo lo define él o el motor (una miniatura es un dibujo suelto) y su reloj va de 0 a 1.
- `tests/figures.py` (en navegador): las 527 miniaturas, como imagen de su tamaño; las listas (la figura en cada fila, los
  huecos del mismo tamaño que se llenan todos con la lista abierta, al momento al volver a abrirla y, tras recargar, de lo
  guardado y sin el motor); la ficha; la hoja de un ejercicio de cada clase (figura arriba en 4:3, músculos y texto, que se
  mueve y sigue dibujada tras varios gestos; los ciclos no se paran; fuera de la vista no se dibuja); a 320 y 768 px; con
  «Reducir animaciones», las posturas quietas; los colores pintados de verdad; el entreno; sin errores ni choques con la
  política de seguridad.

## Revisión

El motor y las familias se hicieron por lotes de ejercicios, cada uno con su página de revisión (`tools/figuras3d`, ver su
README): la figura de cada ejercicio en tres cuartos y de lado, con su nota. Antes de cada página pasan las pruebas de esa
carpeta: manos que no llegan y pies fuera del suelo, material contra el cuerpo y miembros que se cruzan, el grosor del
dibujo, las piezas que no deben moverse y los saltos de un fotograma a otro.

## Lo que queda fuera

- En los ejercicios de cuerpo completo (CrossFit, Hyrox, funcional) la librería marca casi todos los músculos como
  principales o secundarios: la figura los pinta todos.
- La vista de lado de las páginas de revisión no está en la app: la hoja enseña la de tres cuartos de cada ejercicio, la que
  mejor lo enseña.
