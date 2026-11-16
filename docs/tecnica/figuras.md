# Figuras de ejercicio

El modelo anatómico haciendo cada uno de los 551 ejercicios de la librería. Sustituye a las fotos realistas, que ya no existen.
Va en la V1.0.3 (rama `desarrollo-1.0.3`), que no se publica sin el visto bueno del propietario.

## Qué se ve

- **En pequeño** (el entreno, la ficha, las listas de la librería y de las rutinas): la figura haciendo el ejercicio, en el
  momento del gesto que mejor lo identifica, con los músculos que trabajan en rojo (principales) y naranja (secundarios). A
  ese tamaño es un pictograma: la silueta, sin los músculos en reposo, encuadrada en lo que se mueve (los brazos y la barra
  en un curl; el cuerpo entero en una sentadilla).
- **Al tocar la imagen**, la hoja «Cómo se hace»: arriba, la figura en grande, que se mueve del inicio al final y vuelve (la
  parte del esfuerzo va más rápida que la otra); debajo, a la izquierda, los músculos en pequeño (de frente y de espaldas) y,
  a su lado, el nombre del ejercicio y los músculos con su nombre; y después, el texto.
- Las **máquinas y las poleas** van dibujadas con lo que las hace reconocibles: el banco o el asiento, la torre, el cable con
  su agarre, las placas, las guías, la plataforma. El cable y la palanca siguen a la mano.
- Los gestos de **varias fases** (una cargada, un burpee, un muscle-up, la levantada turca) pasan por una postura intermedia.
- Lo que es un **ciclo** (andar, correr, pedalear, la elíptica, la escaladora, nadar, empujar el trineo, gatear, las cuerdas)
  no va y vuelve: sigue sin parar, y las piernas y los brazos se turnan. La pierna que apoya pasa bajo la cadera mientras la
  otra vuelve por el aire; en la escaladora, los peldaños bajan con el pie que los pisa.
- Una **postura que se mantiene** (una plancha, el pino, colgarse de la barra) es una sola figura, quieta.
- Con **«Reducir animaciones»** (Ajustes) o si el móvil pide menos movimiento, la figura no se mueve: salen las posturas del
  gesto una junto a otra, con su rótulo: «Inicio» y «Final» y, si el ejercicio tiene una fase intermedia, «Paso». Una
  intermedia que solo guía el camino (el paso de una zancada, la media vuelta de un pedal) no se enseña.
- Un **ejercicio propio** no tiene postura: se ve como siempre, con sus músculos en el mapa.

Hay 416 figuras distintas: los ejercicios que se hacen igual (un curl con barra recta o con barra Z, las series de carrera)
comparten figura.

## Cómo está hecho

| Pieza | Qué es |
| --- | --- |
| `tools/figure.js` → `src/js/data/figure.js` | El dibujo del **modelo de perfil**: tórax, pelvis, cabeza, cadera, muslo, pierna, pie, brazo, antebrazo y mano (abierta y en puño). Cada pieza es una silueta y sus músculos, y cada forma, una curva cerrada que pasa por unos pocos puntos. Los puntos están en la herramienta; el módulo lleva los trazados ya calculados y no se edita a mano. |
| `src/js/data/figposes.js` | La **tabla**: ejercicio → familia de movimiento y variantes (`'Press inclinado mancuernas': 'press incline db'`). |
| `src/js/extras/moves.js` | Las **familias de movimiento** (82): cada una recibe las variantes y devuelve la figura: vista, postura de inicio, lo que cambia al final (y a medio gesto, si pasa por una postura intermedia), material, qué extremo es el final del esfuerzo y en qué momento se pinta la miniatura. `figPose(nombre)` da la figura de un ejercicio. |
| `src/js/extras/gear.js` | El **material**: bancos, torres de polea, cables, placas, guías, barras de dominadas y paralelas, cajones, esterillas, paredes. |
| `src/js/extras/rig.js` | El **modelo articulado**: dada una postura, dónde va cada pieza del cuerpo y del material. Sin estado ni pantalla. |
| `src/js/extras/figure.js` | El **dibujo**: define las piezas una vez (`<defs>`, la primera vez que hace falta una figura) y cada figura solo las coloca (`<use>`), así que una lista llena de miniaturas apenas pesa. Pinta la figura quieta, la grande, y la mueve. |
| `src/js/extras/anatomy.js` | `exPicture` (la imagen pequeña de un ejercicio, que se calcula una vez), `exPictureLater` (su hueco en una fila que aún no se ve), `exMotion` (la grande) y `exMusclesSmall` (los músculos en pequeño). |
| `src/js/library/howto.js` | La hoja. |

Hay **dos modelos**, con los mismos colores, degradados y rayado que el mapa muscular:

- **De perfil** (`v: 'S'`), dibujado para esto, con las mismas alturas que la figura frontal (hombro, cadera, rodilla y
  tobillo). Las piezas giran sobre sus articulaciones y se pintan de atrás adelante; el brazo y la pierna del lado de atrás
  van un poco desplazados y más oscuros, para dar fondo. Es la vista de casi todos los ejercicios.
- **De frente** (`v: 'F'`) y **de espaldas** (`v: 'B'`): la figura del mapa muscular, recortada en cuerpo, brazos, antebrazos,
  muslos y piernas, que giran sobre sus articulaciones. Es para lo que solo se entiende así: elevaciones laterales, cruces de
  polea, abductores y aductores, saltos laterales; de espaldas, lo que trabaja por detrás (el deltoides posterior, el glúteo
  en la abducción).

### Escribir una postura

Con ángulos en grados, como los diría un entrenador (0 = de pie y recto). De perfil:

| Dato | Qué es |
| --- | --- |
| `lean`, `waist` | Inclinación de la pelvis y el tronco (hacia delante, positivo; `-90`, tumbado boca arriba; `90`, boca abajo) y flexión de la cintura. |
| `neck` | Cuello (barbilla al pecho, positivo). |
| `hip`, `knee` | Flexión de cadera y de rodilla. |
| `ft` o `ank` | El pie: su ángulo con el suelo (apoyado, de puntillas) o, con `ank`, la flexión del tobillo, cuando el pie va con la pierna (una pierna en el aire). |
| `sh`, `el`, `wr` | Brazo hacia delante, flexión de codo y de muñeca. `shy`, `shx`: el hombro sube o se adelanta. |
| `grip`, `gw`, `palm` | En vez de `sh` y `el`: dónde va el puño (`grip`, en coordenadas del tórax, se mueve con él; `gw`, en la imagen) o la muñeca con la mano apoyada (`palm`). El codo lo calcula el modelo. |
| `gl` | El puño en el extremo de una palanca: `[x, y, largo, ángulo]`, con el eje en (x, y) de la imagen. A lo largo del gesto cambia el ángulo y no el largo: el puño va por un arco. |
| `fa` | Con lo anterior, el ángulo del antebrazo con el tórax. El codo queda bajo el puño y el brazo se ve tan corto como haga falta: es lo que pasa cuando el codo apunta hacia quien mira (un press de banca). |
| `foot` | En vez de `hip` y `knee`: dónde va el tobillo. La rodilla la calcula el modelo. |
| `kU`, `kF`, `kT`, `kS` | Escorzo del brazo, el antebrazo, el muslo y la pierna (1 = se ven enteros). |
| `at`, `x`, `y` | Qué queda quieto: el tobillo (lo normal), la punta del pie (`'toe'`), la rodilla (`'knee'`), la cadera (`'hip'`: sentado o tumbado), el puño (`'grip'`: colgado de una barra) o un punto de la espalda (`'pin'`). |
| `far: { … }` | Lo que cambia en el brazo y la pierna del lado de atrás; sin él, hacen lo mismo que los de delante. |

De frente: `arm` y `elb` (apertura del brazo y giro del antebrazo), `leg` y `knee`, los escorzos, `shy`, y `rot`, `x`, `y`
para girar o mover el cuerpo entero (tumbado de lado); `r: { … }` es lo que cambia en el lado derecho de la imagen.

La postura del final (`b`) y la intermedia (`m`) solo dicen lo que cambia respecto a la de inicio (`a`). Entre ellas, los
ángulos y los puntos se reparten: los pies no se mueven en una sentadilla porque el tobillo es lo que queda quieto, y la
barra sube recta en un press porque lo que se reparte es el punto del puño.

Dos datos de la figura dicen cómo se recorre el gesto:

- `via: 1`: la intermedia solo guía el camino (la barra rodea las rodillas, el pie da el paso por el aire). No es una fase
  del ejercicio: ni se enseña quieta ni alarga el compás.
- `cycle: ms`: el gesto es medio ciclo, que dura esos milisegundos y se repite sin pausa ni vuelta atrás, cada vez con los
  lados cambiados (lo que hacía la pierna de delante lo hace la de atrás). Solo se escribe una zancada, una pedalada o una
  brazada; la otra mitad sale sola, y el final de una es exactamente el principio de la siguiente.

El modelo cuida solo dos cosas que de otro modo habría que vigilar en cada postura: el **codo y la rodilla doblan siempre
hacia su lado** y, si la mano queda tan cerca del hombro que el codo tendría que cerrarse más de lo que da de sí, el brazo
se dibuja en escorzo (con el codo hacia quien mira) lo justo para que quede en su tope.

### Lo que un gesto tiene que cumplir

Repartir ángulos entre dos posturas no basta para que una máquina se mueva como una máquina ni para que alguien de pie no
se caiga. `extras/moves.js` tiene una ayuda para cada caso, y `tests/rig.test.mjs` lo comprueba en todas las figuras:

| Regla | Cómo se escribe |
| --- | --- |
| **En una Smith la barra solo sube y baja por su guía.** | `railGrips`: si el tronco no se mueve (un press, un remo, un curl), los puños de las dos posturas van por la misma vertical de la imagen. `railBody`: si se mueve el cuerpo entero (una sentadilla, una zancada), el cuerpo cuelga del puño, que va por esa vertical, y las piernas llegan a los pies, que no se mueven del suelo. En la Smith no se avanza: la zancada se hace con un pie delante y otro detrás. |
| **Las palancas no se estiran.** | `leverGrips` y `leverFrom` dejan el puño en el arco de su palanca (`gl`), con el eje donde lo tendría la máquina o donde está (la punta de la barra del remo en T o del press landmine). Si lo que mueve la palanca es otra parte del cuerpo, `pivotAt` pone el eje a la misma distancia del principio y del final, o la pieza va unida al cuerpo (`on`) y gira con él sobre su articulación (el pullover, el crunch, la extensión de cadera). |
| **El peso sube y baja pegado a las piernas.** | En los pesos muertos las posturas se escriben con el cuerpo colgando de la barra (`railBody`, sin guía): la cadera se va atrás, los brazos quedan algo hacia las piernas y la barra va por delante del tobillo, sobre el pie. Entre ellas se reparte dónde está la cadera, para que las rodillas no se doblen dos veces. Desde el suelo son dos tiempos, con una postura intermedia a la altura de las rodillas: hasta ahí suben la cadera y los hombros a la vez y las rodillas se van atrás para dejar paso a la barra. |
| **La barra no atraviesa el cuerpo.** | En el press militar sale de la parte alta del pecho y pasa por delante de la cara, con la barbilla atrás; en los levantamientos olímpicos la cabeza se echa atrás cuando la barra va de los hombros a arriba, y en la arrancada la barra pasa ante la frente antes de quedar sobre la cabeza. |
| **Un paso se da por el aire, y un pedal da la vuelta.** | En las zancadas hay una postura intermedia con el pie que da el paso levantado; el otro no se mueve del suelo (el de atrás, sobre su punta, gira sobre ella). En las bicis, la intermedia lleva los pedales en horizontal: el pie baja por delante del eje y el otro sube por detrás. |
| **Un ciclo no tiene costuras.** | Con `cycle`, la intermedia es el cruce: la pierna que apoya, bajo la cadera, y la que vuelve, recogida y en el aire (`gait` lo escribe para andar y correr). En la escaladora los peldaños son una pieza que se desliza (`slide`) justo lo que mide un peldaño en medio ciclo, así que el pie baja con el suyo y el otro pisa el que llega. En crol, un brazo tira bajo el agua y el otro vuelve por encima. |
| **Quien se inclina no se cae.** | `bentOver(lean)`: de pie con el tronco inclinado, la cadera se va atrás lo justo para que los hombros, y el peso que cuelga de ellos, queden sobre los pies (remos, pájaros, patadas de tríceps). |
| **Colgado, el cuerpo sube recto.** | En las dominadas lo que se reparte es dónde está la cadera, y los brazos llegan a la barra: con los ángulos del hombro y el codo el cuerpo se iría hacia atrás a medio camino. |

El material es una lista de piezas, cada una en su plano (detrás de todo, entre el lado de atrás y el cuerpo, o delante):
trazos, rellenos, almohadillas, círculos y placas, fijos o unidos a una pieza del cuerpo (`on`); una barra recta entre dos
puntos que pueden moverse (`link`: un cable, una palanca, una goma); una pieza rígida que apunta a un punto (`aim`: el
neumático que se voltea); una que se desliza con el gesto (`slide`: los peldaños de la escaladora); y lo que se lleva en las
manos (`bar`, `db`, `kb`, `ball`, `bag`, `disc`). Está explicado en la
cabecera de `extras/rig.js`; `extras/gear.js` tiene lo que se repite.

### Añadir un ejercicio o una variante

1. En `data/figposes.js`, una entrada con el nombre del ejercicio de la librería y su familia y variantes. Si se hace como
   otro, se le da la misma.
2. Si hace falta una variante nueva (otro material, otro banco), se añade a su familia en `extras/moves.js`; si el gesto es
   otro, una familia nueva.
3. `python3 build.py` y mirar la hoja del ejercicio. `tests/rig.test.mjs` comprueba la figura entera (ver [Pruebas](#pruebas)).
4. Si hace falta una pieza nueva del cuerpo, se dibuja en `tools/figure.js` (`node tools/figure.js` rehace `data/figure.js`).

## Lo que pesa

No hay imágenes: son trazados. Con los dos modelos, el motor, el material y las 551 posturas, el código que se descarga al
arrancar pasa de 444 a 559 KB (de 168 a 208 KB comprimido, que es lo que viaja): **40 KB más**. A cambio se van las 28
fotos, 321 KB: una instalación nueva descarga **unos 280 KB menos**, y el archivo único baja de 1.446 a 1.134 KB.

Para que no se note:

- Las piezas de los dos modelos se preparan en un rato libre tras arrancar, no cuando hace falta la primera figura.
- Una miniatura lleva lo justo: la capa que no pinta nada no sale y la que es una sola pieza va sin grupo.
- La figura quieta de cada ejercicio se calcula una vez y vale para todos los tamaños: la lista, el Overview, el entreno y
  la ficha piden la misma (`exPicture`).
- **Una lista larga no pinta de golpe todas sus figuras.** Las doce primeras filas, que son las que se ven, la llevan; las
  demás, un hueco del mismo tamaño (`exPictureLater`), que se cambia por la figura en cuanto la fila se acerca a lo que se
  ve (700 px antes: un `IntersectionObserver` sobre la página que se desliza) y, pase lo que pase, por tandas de ocho cada
  40 ms desde un momento después de pintarse la lista: en medio segundo, una lista de 64 está completa. En el equipo de
  pruebas, volver a abrir el grupo más grande de la librería o escribir una letra en el buscador cuesta la mitad que antes
  (de unos 40 a unos 20 ms hasta que se ve), y abrirlo por primera vez, tres cuartos.
- La figura grande solo se mueve mientras está en pantalla, cambiando la colocación de sus capas en cada fotograma (unas
  3 décimas de milisegundo); en la pausa de cada extremo no se calcula nada.

Medido con `tests/perf.py` frente a la compilación sin figuras, el arranque y el pintado de las pestañas no cambian (primer
pintado: 96 y 94 ms). Las pestañas no llevan figuras: se ven en el Overview, el entreno, las listas y las hojas.

## Pruebas

- `tests/rig.test.mjs` (31 pruebas, sin navegador), sobre **todos** los ejercicios de la librería y todo el recorrido del
  gesto: cada uno tiene figura; las figuras están bien escritas; ninguna pieza sale sin sitio; los codos y las rodillas doblan
  hacia donde doblan; **ninguna articulación pasa de lo que un cuerpo puede hacer** (cintura, cuello, hombro, codo, muñeca,
  cadera, rodilla y tobillo; de frente, brazos y piernas); **las manos y los pies llegan a donde se les pide** (el agarre, el
  pedal, el suelo); nada se hunde en el suelo; el gesto no da saltos; **en la Smith la barra no se sale de su guía**; **las
  palancas de las máquinas no cambian de largo**; **de pie, el peso cae sobre los pies** (con unas masas aproximadas de cada
  parte del cuerpo y de lo que lleva en las manos); **la barra no atraviesa la cabeza ni las piernas**; **un ciclo no tiene
  costuras** (al acabar medio ciclo, cada pieza está donde empieza el siguiente, con los lados cambiados); y el encuadre,
  centrado y entero. Además, en ejercicios conocidos: en el peso muerto la barra sube pegada a las piernas y la cadera no
  deja de subir; en la zancada el pie que da el paso va por el aire y el otro no se mueve; en las dominadas el cuerpo sube
  recto; en la escaladora los peldaños bajan con el pie que apoya; en la sentadilla los pies no se mueven; en el press la barra sube casi recta y el cuerpo no se mueve del banco; en el curl solo se
  cierra el codo; colgado de la barra, las manos no se mueven de ella y los pies no tocan el suelo; en el remo el codo va
  hacia atrás; y el cable del jalón acaba en la mano.
- `tests/figures.py` (145 comprobaciones, en navegador): las 551 miniaturas y las 551 hojas, una a una (la figura, sus
  piezas, el nombre y el texto, sin fotos); las listas, la ficha y el entreno; la hoja con detalle en un ejercicio de cada clase
  (figura grande arriba, músculos debajo a la izquierda, texto después; que se mueve y sigue en su sitio tras varios ciclos);
  las posturas que se mantienen; los ciclos, que no se detienen en ningún momento, y los peldaños de la escaladora, que se
  deslizan; una lista larga, que abre con las figuras de lo que se ve y pone las demás al deslizarla (en Chromium; sin
  pantalla, WebKit y Firefox no pintan fotogramas a su ritmo y ahí solo se anota) y, en cualquier caso, por tandas; a 320 y a 768 px de ancho; «Reducir animaciones» con dos y con tres posturas; lo pintado de
  verdad (los músculos que trabajan en rojo y naranja, el resto del cuerpo, las mancuernas en los extremos con los brazos
  abiertos, el deltoides posterior de espaldas), que es lo que comprueba el dibujo en Safari y Firefox; y que un ejercicio
  propio sigue con sus músculos.
- `node tools/figure.js --check`: `data/figure.js` está al día con los puntos del dibujo.

La hoja «Cómo se hace» no está entre las 47 pantallas que recorren las pruebas de accesibilidad, tamaños y contraste: se
comprueba aparte, en `tests/figures.py`.

## Lo que queda fuera

- Las figuras enseñan la postura de inicio, la del final y, en algunos gestos, una intermedia: el camino entre ellas es un
  reparto, no una captura de movimiento.
- En los ejercicios de cuerpo completo (CrossFit, Hyrox, funcional) la librería marca casi todos los músculos como
  principales, y así sale la figura: toda en rojo.
- Lo que solo se entiende desde arriba o en tres cuartos (el Pallof press, la abducción sentada) se ha resuelto de frente o
  de espaldas, con los brazos o los muslos en escorzo.
