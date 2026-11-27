# Figuras de ejercicio

El modelo anatómico en 3D haciendo cada uno de los 529 ejercicios de la librería, visto en tres cuartos. Llegó con la
V1.0.4 y sustituye a las figuras de perfil de la V1.0.3 (un modelo plano, articulado, que ya no existe). Se hizo y se revisó
por lotes de ejercicios antes de entrar en la app (ver [Revisión](#revisión)).

## Qué se ve

- **En pequeño** (el entreno, el día, la ficha, las listas de la librería y de las rutinas): la figura quieta en el momento
  del gesto que mejor lo identifica, con los músculos que trabajan en rojo (principales) y naranja (secundarios), y el
  material. A ese tamaño los tonos oscuros del cuerpo van aclarados: oscuro sobre el fondo oscuro de la miniatura apenas se
  distinguía. Y los bordes, marcados (desde la 1.0.4.1): reducida a su sitio en la pantalla, la figura salía blanda.
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
- La **carrera** es la de un trote normal: unas 154 zancadas por minuto (una vuelta de 0,78 s), a unos 8 km/h. El pie cae algo
  por delante de la cadera, con el medio del pie y la rodilla poco doblada (unos 20°); la cadera baja en una onda suave
  hasta media pisada (la rodilla, a unos 43°) y sube hasta el vuelo, con los dos pies en el aire un momento entre un apoyo y
  otro; el pie despega por la punta por detrás de la cadera, con la pierna casi estirada, y sale del suelo a la velocidad que
  llevaba. En el aire, la rodilla se dobla hasta unos 88° al pasar bajo la cadera (sin llevar el talón al glúteo), el muslo
  lleva la rodilla adelante (unos 37°) y la pierna se estira antes de caer, volviendo un poco hacia atrás a la velocidad del
  suelo. Los brazos van al revés que las piernas y se mueven desde el hombro, de unos 45° atrás (la mano junto a la cadera)
  a algo por delante del cuerpo (la mano, a la altura de la parte baja del pecho), con el codo en ángulo recto. Las alturas
  y el recorrido del pie salen de las curvas de cadera y rodilla de un trote (`src/fig3d/cardio3d.js`, `runGait`); la
  miniatura es un momento de la zancada (`still`).
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
| `tools/figboxes.js` → `src/js/data/figboxes.js` | **Los encuadres, ya calculados**: de cada ejercicio, lo que ocupa su gesto entero, el momento de su miniatura y lo que ocupa, y los momentos de sus posturas quietas y lo que ocupan. La herramienta arranca el motor en Node tal como va en la app y lo calcula una vez (unos 45 s); el archivo lleva la huella de lo que decide cómo se ve una figura (el motor, los ejercicios, el mapa muscular y `extras/figure3d`) y la batería comprueba que está al día. |
| `src/js/data/figstamp.js` | **La huella**, aparte, en lo que la app carga al arrancar (la escribe la misma herramienta): con ella la app sabe si las miniaturas que guardó siguen valiendo. |
| `src/js/extras/figure3d.js` | Lo que **dibuja la app** con el motor: lo arranca con el mapa muscular (`data/anatomy`) y las regiones de cada músculo (`extras/anatomy`, `MUSCLE_REGIONS`), hace cada ejercicio con sus músculos de la librería, pasa las miniaturas a imagen (`thumb`) y pone en marcha las figuras grandes (`stages`). Al cargarse deja esas dos funciones en `core/lazy`. |
| `src/js/extras/pictures.js` | Lo que se hace **sin el motor**: `exHasFigure`, `exPicture` (la miniatura, o su hueco), `exPictureLater` (la de una fila que aún no se ve), `exMotion` (el sitio de la figura grande), las miniaturas por buscar y por dibujar y su caché en memoria y en el móvil. |
| `src/js/core/lazy.js` | `loadFigures`: descarga el motor, los encuadres y `extras/figure3d` la primera vez que hace falta una figura. |
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
- **Si el motor no llega, se espera.** Sin conexión y sin el código guardado todavía (la primera visita, o un navegador sin
  service worker), o con una página abierta de una versión que ya no está en el servidor, la descarga falla. La app sigue:
  las miniaturas se quedan en su hueco y en su cola, y el motor se vuelve a pedir a los 4 s, luego a los 8, a los 16… hasta
  cada 5 minutos (`extras/pictures`, `figures`). Al volver la conexión, o si el usuario abre una figura grande, se pide ya (una
  vez por figura abierta, no en cada cambio de la hoja). El fallo se apunta una vez por racha. Antes lo pedía cada miniatura
  de la cola, sin pausa: 169 peticiones en dos segundos y medio con una lista de 59 ejercicios, y el registro de errores lleno.
- **Nada se dibuja para medirlo.** El recuadro de cada figura y los momentos de las quietas vienen calculados
  (`data/figboxes`). Antes, al abrir la hoja había que dibujar la figura trece veces para encuadrar el gesto: unos 50 ms en un
  ordenador y cuatro veces más en un móvil, justo mientras la hoja entra.
- **Una miniatura se dibuja una vez.** `extras/figure3d` dibuja la figura quieta sin el rayado (a ese tamaño no se
  distingue), con los tonos oscuros aclarados (un filtro gamma) y solo con los degradados que usa, y la pasa a imagen en un
  lienzo: WebP de 72 px por la densidad de la pantalla (hasta 216 px), unos 6–10 KB. Antes de pasarla, le marca los bordes
  (`sharpen`, una máscara de enfoque: cada píxel se aleja de la media de los de alrededor, con un núcleo 1-2-1, y con el color
  multiplicado por la opacidad para que el fondo transparente no deje halos): la misma imagen sirve para 48, 64 y 72 px, y
  reducida salía blanda. La imagen se guarda en la memoria y en el móvil (IndexedDB, base `fffig`: por cada ejercicio, el tipo
  de la imagen y sus bytes; y una fila con la huella de las figuras, `data/figstamp`, y el tamaño): la siguiente vez se enseña
  al momento, sin el motor. Son dibujos de la librería, iguales para cualquiera, no datos de nadie. Solo se vacían y se rehacen
  cuando una versión cambia las figuras o cómo se dibujan (otra huella: la lleva también `extras/figure3d`, así que marcar los
  bordes hizo dibujar otra vez las de la 1.0.4): una actualización que no toca nada de eso no hace dibujar otra vez las 529.
  Donde el navegador no deja leer el lienzo, la imagen es el propio dibujo y no se guarda.
- **Solo se lee lo que se pide.** Las miniaturas que pide una pantalla se buscan juntas en lo guardado, en una sola lectura;
  abrir la app no trae todas las guardadas.
- **El momento de la miniatura**: en un gesto de ida y vuelta, la postura final (un curl arriba, una sentadilla abajo); en
  uno con su propio reloj, la postura más lejos del principio (el otro paso al correr, el brazo arriba en un curl alterno, la
  barra arriba en un clean & jerk). La familia puede decir otro (`still`): el burpee, con el pecho en el suelo; los wall
  balls, abajo con el balón al pecho.
- **Mientras se busca o se dibuja, su hueco** (`svg[data-pic]`, del mismo tamaño), que se cambia por la imagen en cuanto
  está.
- **Dibujarlas no estorba.** Las que se ven (el día, el entreno, la ficha, las primeras filas de una lista) se dibujan ya, de
  dos en dos (mientras una se pasa a imagen, que lo hace el navegador aparte, se dibuja la siguiente) y con un respiro entre
  una y otra. Las demás (el resto de una lista abierta, de arriba abajo, y las del plan unos segundos después de abrir la app,
  tras instalarla o actualizarla), de una en una y solo cuando la pantalla lleva más de medio segundo sin tocarse y no hay
  una figura grande moviéndose: dibujar una ocupa unos milisegundos en los que la app no atiende, y deslizando una lista o
  viendo el gesto se notaría. Una fila que se acerca a lo que se ve pasa delante de todas. Al cerrar la lista se deja de
  dibujar lo que ya nadie espera.
- **La figura grande** se dibuja con el reloj de su gesto mientras se ve (fuera de la vista no se dibuja) y nunca ocupa más
  de la mitad del tiempo: tras cada dibujo espera, al menos, lo que ha costado. En un móvil rápido son 60 por segundo; en uno
  lento, los que pueda, y sin el rayado de los músculos (a ese tamaño apenas se nota y es un cuarto menos de trabajo): lento
  es que un fotograma cueste más de 9 ms, medido con la primera figura cuando el navegador ya ha afinado el código (o antes,
  si ya los primeros cuestan el doble). Su sitio lleva `contain: layout paint`: lo que cambia dentro no hace mirar nada de
  fuera. Cada una lleva su prefijo en lo que define (degradados de la cabeza, rayados), así que dos en la página no se pisan.

## Añadir un ejercicio o una variante

1. En `data/figposes.js`, una entrada con el nombre del ejercicio de la librería y su familia y variantes. Si se hace como
   otro, con las mismas palabras.
2. Si hace falta una variante nueva (otro material, otro agarre), se añade a su familia en `src/fig3d`; si el gesto es otro,
   una familia nueva, con su nombre en la cabecera del archivo («Define: Fig3D.FAMILIES.…»).
3. Se revisa con las herramientas de `tools/figuras3d` (las pruebas de manos, pies, choques y saltos, y la página del lote).
4. `node tools/figboxes.js` rehace los encuadres (la compilación y la batería avisan si falta) y, en la app, se mira con
   `python3 build.py` y la hoja del ejercicio. `tests/fig3d.test.mjs` lo dibuja en todo el gesto.

## Lo que pesa

Medido en la app compilada, en Chromium sin pantalla (dibuja sin tarjeta gráfica) y en un móvil simulado de 390 px y
densidad 3; «lento» es con la CPU cuatro veces más despacio.

- El motor va en un archivo aparte: 346 KB (133 KB comprimido), y los encuadres, 45 KB (12 KB). Solo se descargan al usar
  una figura. Lo que carga al arrancar: 481 KB.
- Arrancar el motor: unos 45 ms (lento, unos 190 ms), una vez.
- Abrir la hoja con la figura grande: unos 125 ms la primera (lento, unos 490 ms) y de 30 a 65 ms las siguientes (lento,
  unos 110 ms). Antes de tener los encuadres calculados había que sumar trece dibujos: unos 50 ms (lento, 200 ms).
- Una miniatura: unos 33 ms (lento, unos 90 ms), de los que la app no atiende alrededor de un tercio (el resto lo hace el
  navegador aparte). Guardada, nada.
- Un fotograma de la figura grande: unos 6–7 ms de código (hacer el dibujo y ponerlo en la página), 1,5 ms de estilos y
  unos 6 ms de pintarlo; lento, unos 20 ms de código y sin el rayado. Sin tarjeta gráfica salen unos 29 por segundo (15
  lento), y lo que limita no es el código sino pintar: con el aspecto Cristal, el desenfoque de la hoja se rehace bajo la
  figura en cada fotograma (sin Cristal salen 43). En un móvil eso lo hace la tarjeta gráfica.

## Pruebas

- `tests/fig3d.test.mjs` (sin navegador): el motor tal como va en la app (compuesto como lo hace `build.py`, en modo
  estricto) hace los 529 ejercicios; cada uno se dibuja en nueve momentos del gesto sin números rotos, lo que ocupa es el de
  una figura, lo que usa cada dibujo lo define él o el motor (una miniatura es un dibujo suelto) y su reloj va de 0 a 1.
- `tests/figures.py` (en navegador): las 529 miniaturas, como imagen de su tamaño; las listas (la figura en cada fila, los
  huecos del mismo tamaño que se llenan todos con la lista abierta, al momento al volver a abrirla y, tras recargar, de lo
  guardado y sin el motor; lo guardado con otra huella se tira y se dibuja otra vez); la ficha; la hoja de un ejercicio de cada clase (figura arriba en 4:3, músculos y texto, que se
  mueve y sigue dibujada tras varios gestos; los ciclos no se paran; fuera de la vista no se dibuja); a 320 y 768 px; con
  «Reducir animaciones», las posturas quietas; los colores pintados de verdad; el entreno; sin errores ni choques con la
  política de seguridad.
- `tools/check.js` (regla 14): nada declarado y nunca leído en `src/fig3d` (variables, funciones, nombres de lo que se
  desestructura). En la V1.0.4 se quitaron así 90 declaraciones que quedaban de los ajustes de los lotes.
- `tools/figuras3d/huella.js`: no es de la batería, sino para un cambio en el motor que no debe cambiar ninguna figura (como
  ese): la huella de todo lo que dibuja, antes y después, tiene que ser la misma. Con la limpieza de la V1.0.4 lo fue
  (`670e617c42d0af5a`).

## Revisión

El motor y las familias se hicieron por lotes de ejercicios, cada uno con su página de revisión (`tools/figuras3d`, ver su
README): la figura de cada ejercicio en tres cuartos y de lado, con su nota. Antes de cada página pasan las pruebas de esa
carpeta: manos que no llegan y pies fuera del suelo, material contra el cuerpo y miembros que se cruzan, el grosor del
dibujo, las piezas que no deben moverse y los saltos de un fotograma a otro.

El lote 9 (V1.0.4) son los cuatro ejercicios que trajeron los [entrenos a la carta](../funcional/entrenamiento.md#entrenos-a-la-carta):
el remo alto en máquina (el remo en máquina de `tiron3d.js` con `high`: las asas arriba y por delante y la palanca desde un eje
delante, abajo) y, en `funcional3d.js`, tres de movilidad de pie: la zancada con rotación torácica (`wgs`), la rodilla al pecho
con alcance (`kneeHug`) y el talón al glúteo con alcance (`heelButt`). Los tres van por momentos clave (`C.keyed`), con la
pierna que trabaja (la izquierda) por su tobillo o, en el talón al glúteo, por los ángulos de la cadera y la rodilla, para que
el pie suba y baje girando alrededor de la rodilla con el muslo vertical; y la que apoya, de puntillas cuando toca, con la
cadera encima. En la zancada, el tronco se inclina lo justo (se calcula) para que la mano derecha llegue al suelo por dentro
del pie de delante, con la rodilla de delante abierta hacia fuera, por donde baja el tronco. Los brazos que suben lo hacen
girando desde el hombro, estirados (`armSweep`, `slerp`), y cada una dice su miniatura (`still`) y sus posturas quietas
(`stills`, que `tools/figboxes.js` respeta): el momento clave de cada gesto. Las familias nuevas van en la cabecera de su
archivo («Define:»): de ella sale qué archivos carga la página de revisión (sin ellas, la primera página del lote se paraba
en la segunda figura). Revisado, con el visto bueno del propietario.

## Lo que queda fuera

- En los ejercicios de cuerpo completo (CrossFit, Hyrox, funcional) la librería marca casi todos los músculos como
  principales o secundarios: la figura los pinta todos.
- La vista de lado de las páginas de revisión no está en la app: la hoja enseña la de tres cuartos de cada ejercicio, la que
  mejor lo enseña.
