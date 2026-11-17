# Figuras de ejercicio

El modelo anatómico haciendo cada uno de los 551 ejercicios de la librería. Sustituye a las fotos realistas, que ya no existen.
Llegó con la V1.0.3. Su primera revisión, la V1.0.31, rehace cinco gestos tras probarla el propietario en su iPhone (el remo, el SkiErg, el saco de
boxeo, la bici de aire y la comba) y añade al motor lo que les hacía falta: gestos seguidos, saltos y piezas que giran.
Después, a petición del propietario, se repasó su aspecto para que se entienda de un vistazo ([El aspecto](#el-aspecto)): la
figura grande es el mismo maniquí limpio que la miniatura, los ejercicios de cuerpo completo ya no salen enteros en rojo, y se
arreglaron la carrera, la barra de dominadas y la cuerda de la comba.

## Qué se ve

- **La figura es un maniquí**, igual en pequeño que en grande: la silueta, clara, sin los músculos en reposo, y encima, en
  color, solo lo que trabaja: en rojo los músculos principales y en naranja los secundarios. Si el ejercicio trabaja el
  **cuerpo entero** (un burpee, un thruster, el remo, el SkiErg: 68 de la librería), la silueta va en un rojo apagado y lo
  que más trabaja, encima, en rojo y naranja; el mapa muscular de la hoja y de la ficha lo pinta igual.
- **En pequeño** (el entreno, la ficha, las listas de la librería y de las rutinas): la figura haciendo el ejercicio, en el
  momento del gesto que mejor lo identifica, encuadrada en lo que se mueve (los brazos y la barra en un curl; el cuerpo
  entero en una sentadilla), con un poco de aire para que las esquinas redondeadas no corten la cabeza ni la barra.
- **Al tocar la imagen**, la hoja «Cómo se hace»: arriba, la figura en grande, que se mueve del inicio al final y vuelve (la
  parte del esfuerzo va más rápida que la otra), sobre un fondo oscuro y liso, con el suelo (una raya que se desvanece hacia
  los lados y un poco de luz) y aire alrededor; debajo, a la izquierda, los músculos en pequeño (de frente y de espaldas) y,
  a su lado, el nombre del ejercicio y los músculos con su nombre; y después, el texto.
- Las **máquinas y las poleas** van dibujadas con lo que las hace reconocibles: el banco o el asiento, la torre, el cable con
  su agarre, las placas, las guías, la plataforma. El cable y la palanca siguen a la mano.
- Los gestos de **varias fases** (una cargada, un burpee, un muscle-up, la levantada turca) pasan por una postura intermedia.
- Lo que es un **ciclo** (andar, correr, pedalear, la elíptica, la escaladora, nadar, empujar el trineo, gatear, las cuerdas)
  no va y vuelve: sigue sin parar, y las piernas y los brazos se turnan. La pierna que apoya pasa bajo la cadera mientras la
  otra vuelve por el aire; en la escaladora, los peldaños bajan con el pie que los pisa; en la bici de aire, cada mano va y
  viene con su palanca y tira mientras empuja la pierna de su lado.
- Un **gesto seguido** (remar, el SkiErg, una serie de golpes al saco) va y vuelve, pero sin pararse en los extremos. Al
  remar, primero empujan las piernas con los brazos estirados, después se echa atrás el tronco y al final tiran los brazos, y
  la vuelta es al revés; en el saco, de la guardia sale el directo y después el cruzado.
- La **comba** es un salto tras otro: el cuerpo bota (sube frenando y baja acelerando) y la cuerda da la vuelta entera sobre
  las manos, por encima de la cabeza con los pies en el suelo y bajo ellos en lo más alto; en los double unders, dos vueltas
  por salto, y en la comba de boxeo, un pie y después el otro. La cuerda se ve como un lazo, con sus dos cabos.
- Al **correr** el cuerpo va erguido y apoya el pie en el suelo, bajo la cadera, con la rodilla doblada lo justo; y **colgado
  de la barra** (dominadas, toes to bar, muscle-up), la barra va anclada a la pared, con su poste lejos del cuerpo aunque
  las piernas se balanceen hacia atrás.
- Una **postura que se mantiene** (una plancha, el pino, colgarse de la barra) es una sola figura, quieta.
- Con **«Reducir animaciones»** (Ajustes) o si el móvil pide menos movimiento, la figura no se mueve: salen las posturas del
  gesto una junto a otra, con su rótulo: «Inicio» y «Final» y, si el ejercicio tiene una fase intermedia, «Paso». Una
  intermedia que solo guía el camino (el paso de una zancada, la media vuelta de un pedal) no se enseña. Un salto que acaba
  como empieza (la comba) enseña «Inicio» y «Salto»: en el suelo y en el aire, con la cuerda bajo los pies. El recuadro es el
  de esas posturas, no el de todo el recorrido.
- Un **ejercicio propio** no tiene postura: se ve como siempre, con sus músculos en el mapa.

Hay 417 figuras distintas: los ejercicios que se hacen igual (un curl con barra recta o con barra Z, las series de carrera)
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

Hay **dos modelos**, con los músculos en los mismos colores, degradados y rayado que el mapa muscular:

- **De perfil** (`v: 'S'`), dibujado para esto, con las mismas alturas que la figura frontal (hombro, cadera, rodilla y
  tobillo). Las piezas giran sobre sus articulaciones y se pintan de atrás adelante; el brazo y la pierna del lado de atrás
  van un poco desplazados y en un tono más oscuro, para dar fondo. Es la vista de casi todos los ejercicios.
- **De frente** (`v: 'F'`) y **de espaldas** (`v: 'B'`): la figura del mapa muscular, recortada en cuerpo, brazos, antebrazos,
  muslos y piernas, que giran sobre sus articulaciones. Es para lo que solo se entiende así: elevaciones laterales, cruces de
  polea, abductores y aductores, saltos laterales; de espaldas, lo que trabaja por detrás (el deltoides posterior, el glúteo
  en la abducción).

### El aspecto

Lo pinta `extras/figure.js`; lo que sigue es por qué es así.

- **Un maniquí, sin los músculos en reposo.** La figura grande llevaba antes cada músculo en reposo dibujado con su relleno
  oscuro, su borde y su rayado: de lejos se leía como una armadura llena de rayas y lo que trabajaba no destacaba tanto. Ahora
  la grande es como la miniatura, que ya era así: la silueta clara (`SKIN`, un degradado de gris azulado con la luz arriba a
  la izquierda de cada pieza) y un borde oscuro en cada pieza (`EDGE_SIL`, en el propio trazado), que separa un brazo de lo
  que tiene detrás. Lo que trabaja va encima en rojo y naranja; en grande, con el rayado de las fibras.
- **La cabeza, las manos y los pies se ven.** No tienen músculos, así que antes enseñaban la silueta desnuda (`#2a2e42`),
  casi del color del fondo: la cabeza parecía un hueco. Ahora llevan la misma silueta clara que el resto.
- **El brazo y la pierna de atrás, macizos.** Iban en `#1d2031` con un borde claro, que sobre el fondo se leía como un
  contorno transparente («fantasmas»). Ahora son la misma pieza en un tono más oscuro (`#3b4162`), sin borde claro.
- **Cuerpo completo.** La librería marca 68 ejercicios con el cuerpo entero como principal (`fu`), y antes la figura salía
  entera en rojo, sin distinguir nada. Ahora `figRegions` (extras/anatomy) los separa: la silueta va en un rojo apagado
  (`SKIN_TONES[1]`) y encima, más vivo, lo que nombra además el ejercicio (los glúteos en rojo en un thruster; las piernas y
  el core en naranja en un burpee). El mapa muscular (`anatomySvg`) usa el mismo rojo apagado (`gWa`) para el resto del
  cuerpo, así que la hoja dice lo mismo arriba y abajo.
- **De frente, una sola luz.** La silueta de frente se recorta en piezas (cuerpo, brazos, piernas) con un disco en cada
  articulación para tapar el hueco al girar. Si cada disco llevara su propio degradado, saldría como una mancha clara en la
  rodilla o el codo; por eso de frente el degradado va en unidades del dibujo, con la caja de la silueta entera
  (`FRONT_LIGHT`), y la misma silueta vale para las dos vistas (`fsB`, `fsU0`…): lo que cambia de frente a espaldas son los
  músculos.
- **El escenario.** El recuadro de la figura grande (`.fgs`) es oscuro y casi liso, para que el maniquí claro destaque. El
  suelo ya no es una raya de lado a lado: es una raya del ancho del recuadro que se desvanece hacia los lados y, en medio, un
  poco de luz (`floorOf`). Alrededor de lo que ocupa la figura en todo el gesto queda aire (`STAGE_AIR`: 14 unidades a los
  lados y arriba, 10 bajo el suelo), y la miniatura lleva un 6 % (`THUMB_AIR`).

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

Cuatro datos de la figura dicen cómo se recorre el gesto:

- `via: 1`: la intermedia solo guía el camino (la barra rodea las rodillas, el pie da el paso por el aire). No es una fase
  del ejercicio: ni se enseña quieta ni alarga el compás.
- `cycle: ms`: el gesto es medio ciclo, que dura esos milisegundos y se repite sin pausa ni vuelta atrás, cada vez con los
  lados cambiados (lo que hacía la pierna de delante lo hace la de atrás). Solo se escribe una zancada, una pedalada o una
  brazada; la otra mitad sale sola, y el final de una es exactamente el principio de la siguiente.
- `flow: [ida, vuelta]` (ms): el gesto va y vuelve sin la pausa de cada extremo, con esas duraciones. Para lo que se hace
  seguido: una palada, una bajada del SkiErg, una serie de golpes.
- `hop: 1`: la intermedia es lo más alto de un salto. Se llega a ella frenando y se sale acelerando, como cae un cuerpo: a un
  cuarto del tiempo ya se llevan tres cuartos de la altura. Con `cycle`, un salto tras otro.

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
| **Remar tiene su orden.** | La palada lleva una intermedia que solo guía (`via`): las piernas casi estiradas y el tronco ya vertical, con los brazos tan estirados como al empezar. De ahí al final se echa atrás el tronco y tiran los brazos, así que el asa pasa por encima de las rodillas y no a través de ellas. El asiento es una pieza que va con la cadera (`by`) sin girar con ella: se queda sobre su guía. |
| **La cuerda pasa cuando los pies están en el aire.** | La cuerda de la comba es una pieza que gira sobre el puño (`by` con vueltas): una vuelta por salto, que empieza en lo alto, así que apunta al suelo en lo más alto del salto; con dos vueltas, a media subida y a media bajada. Mide lo que hay de las manos al suelo en ese momento: lo roza al pasar y nunca se mete en él. Se dibuja con sus dos cabos, de las manos a la punta y vuelta, un poco separados: una sola línea parecía un látigo. |
| **Los pies que apoyan no se mueven ni se hunden.** | Cuando el cuerpo se desplaza sobre dos pies separados (el saco de boxeo), lo que se escribe es dónde está la cadera (`at: 'hip'`) y dónde pisa cada pie (`foot`): el de delante, plano; el de atrás, sobre su punta, que no se mueve del suelo aunque el talón se levante más al cruzar. Con ángulos de cadera y rodilla, uno de los dos acaba bajo el suelo. |
| **Quien se inclina no se cae.** | `bentOver(lean)`: de pie con el tronco inclinado, la cadera se va atrás lo justo para que los hombros, y el peso que cuelga de ellos, queden sobre los pies (remos, pájaros, patadas de tríceps). |
| **Colgado, el cuerpo sube recto.** | En las dominadas lo que se reparte es dónde está la cadera, y los brazos llegan a la barra: con los ángulos del hombro y el codo el cuerpo se iría hacia atrás a medio camino. |
| **Colgado, el poste no toca el cuerpo.** | La barra va como una de pared: `pullBar(x, y, HANG_POST)` pone su poste 180 unidades por detrás, lejos también de las piernas cuando se balancean hacia atrás (kipping). Antes estaba a 46 y bajaba pegado a la espalda: parecía que el cuerpo se deslizaba por él. |
| **Correr no es una zancada.** | La carrera va erguida (la cadera a 210, poco más baja que de pie, 199; en cuesta, 214) y, a media zancada, la pierna que apoya pasa bajo la cadera con la rodilla doblada lo justo (35°) y el pie en el suelo. Antes la cadera iba a 218 con esa rodilla a 52° y la de delante muy levantada: en las posturas quietas parecía una zancada. |

El material es una lista de piezas, cada una en su plano (detrás de todo, entre el lado de atrás y el cuerpo, o delante):
trazos, rellenos, almohadillas, círculos y placas, fijos o unidos a una pieza del cuerpo (`on`); una barra recta entre dos
puntos que pueden moverse (`link`: un cable, una palanca, una goma); una pieza rígida que apunta a un punto (`aim`: el
neumático que se voltea); una que se desliza con el gesto (`slide`: los peldaños de la escaladora); una que va con un punto
que se mueve sin girar con el cuerpo o que gira sobre él a velocidad constante (`by`: el asiento del remo, la cuerda de la
comba); y lo que se lleva en las manos (`bar`, `db`, `kb`, `ball`, `bag`, `disc`). Está explicado en la
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
arrancar pasó, en la V1.0.3, de 444 a 559 KB (de 168 a 208 KB comprimido, que es lo que viaja): **40 KB más**. A cambio se
fueron las 28 fotos, 321 KB: una instalación nueva descarga **unos 280 KB menos**, y el archivo único bajó de 1.446 a
1.134 KB. Lo añadido en la V1.0.31 pesa 1,6 KB (minificado).

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
- Su encuadre se calcula una vez, al abrir la hoja, con la figura en los octavos del gesto (y, si algo da vueltas, en cada
  octavo de vuelta): entre el inicio y el final un pie o una mano pueden ir por fuera de los dos.

Medido con `tests/perf.py` frente a la compilación sin figuras, el arranque y el pintado de las pestañas no cambian (primer
pintado: 96 y 94 ms). Las pestañas no llevan figuras: se ven en el Overview, el entreno, las listas y las hojas.

El repaso del aspecto aligeró el dibujo, porque ya no hay músculos en reposo: la figura grande de la sentadilla pasa de 81
piezas que pintar en cada fotograma a 40; las piezas que se preparan una vez (`<defs>`), de 844 a 656 (de 102 a 87 KB), y una
miniatura, de 3,4 a 3,0 KB de media. Abrir la hoja «Cómo se hace» pasó de 4,7 a 3,2 ms ([rendimiento](rendimiento.md#medido-en-el-repaso-de-las-figuras)).

## Pruebas

- `tests/rig.test.mjs` (41 pruebas, sin navegador), sobre **todos** los ejercicios de la librería y todo el recorrido del
  gesto: cada uno tiene figura; las figuras están bien escritas; ninguna pieza sale sin sitio; los codos y las rodillas doblan
  hacia donde doblan; **ninguna articulación pasa de lo que un cuerpo puede hacer** (cintura, cuello, hombro, codo, muñeca,
  cadera, rodilla y tobillo; de frente, brazos y piernas); **las manos y los pies llegan a donde se les pide** (el agarre, el
  pedal, el suelo); nada se hunde en el suelo, tampoco un pie apoyado plano; el gesto no da saltos; **en la Smith la barra no se sale de su guía**; **las
  palancas de las máquinas no cambian de largo**; **de pie, el peso cae sobre los pies** (con unas masas aproximadas de cada
  parte del cuerpo y de lo que lleva en las manos); **la barra no atraviesa la cabeza ni las piernas**; **un ciclo no tiene
  costuras** (al acabar medio ciclo, cada pieza está donde empieza el siguiente, con los lados cambiados, y al acabar el
  ciclo vuelve a empezar); y el encuadre, centrado y entero: **la figura grande cabe en él en todo momento del gesto**, no
  solo en los que se miran para calcularlo. Además, en ejercicios conocidos: en el peso muerto la barra sube pegada a las piernas y la cadera no
  deja de subir; en la zancada el pie que da el paso va por el aire y el otro no se mueve; en las dominadas el cuerpo sube
  recto; en la escaladora los peldaños bajan con el pie que apoya; en la sentadilla los pies no se mueven; en el press la barra sube casi recta y el cuerpo no se mueve del banco; en el curl solo se
  cierra el codo; colgado de la barra, las manos no se mueven de ella y los pies no tocan el suelo; en el remo el codo va
  hacia atrás; y el cable del jalón acaba en la mano. Y los cinco gestos de la V1.0.31: **en el remo en ergómetro** van primero
  las piernas, después el tronco y al final los brazos, el asa pasa por encima de las rodillas y el asiento va con la cadera
  sin girar; **en el SkiErg** las asas bajan separadas del cuerpo y acaban junto a las caderas; **en el saco** los pies no se
  mueven del suelo y cada puño llega al saco, a la altura del hombro, desde la guardia; **en la bici de aire** cada puño va
  por el arco de su palanca, al revés que el otro; y **en la comba** el salto es un bote y la cuerda roza el suelo bajo los
  pies cuando están en el aire, sin meterse nunca en él (con los pies juntos, con dos vueltas y alternando los pies). Y lo
  que arregló el repaso del aspecto: **colgado de la barra, el poste queda lejos del cuerpo** en todo el gesto (también con
  kipping); **al correr**, el pie que apoya pisa el suelo a media zancada, la cadera no baja como en una zancada y esa rodilla
  no se dobla de más; y **la cuerda de la comba lleva sus dos cabos**.
- `tests/figures.py` (194 comprobaciones, en navegador): las 551 miniaturas y las 551 hojas, una a una (la figura, sus
  piezas, el nombre y el texto, sin fotos); que las piezas están una sola vez y ya no las de antes (la pieza grande con los
  músculos en reposo); el maniquí (la silueta clara, también la cabeza, y el brazo y la pierna de atrás en su tono más
  oscuro; de frente, una sola luz para todo el cuerpo; en un ejercicio de cuerpo completo, la silueta en rojo apagado, como
  su mapa muscular) y el suelo, a lo ancho del recuadro; las listas, la ficha y el entreno; la hoja con detalle en un ejercicio de cada clase
  (figura grande arriba, músculos debajo a la izquierda, texto después; que se mueve y sigue en su sitio tras varios ciclos);
  las posturas que se mantienen; los ciclos, que no se detienen en ningún momento, y los peldaños de la escaladora, que se
  deslizan; los gestos seguidos (el remo, el SkiErg, el saco), que no se paran en los extremos y al cabo de unos gestos enteros
  están exactamente donde estaban; la cuerda de la comba, que gira con su mango una vuelta por salto, o dos (con el reloj de
  la página parado, para que lo que tarda la prueba no mueva la figura, y comparando en fotogramas enteros: el reloj de prueba
  da uno cada 16 ms, y un gesto de 1,9 s no acaba en uno); una lista larga, que abre con las figuras de lo que se ve y pone las demás al deslizarla (se exige en
  Chromium; en Firefox y WebKit se anota: WebKit sin pantalla no pinta fotogramas a su ritmo y solo las pone si se le
  obliga a pintar uno con una captura, que es lo que se comprueba) y, en cualquier caso, por tandas; a 320 y a 768 px de ancho; «Reducir animaciones» con dos y con tres posturas, y con las dos de un salto; lo pintado de
  verdad (los músculos que trabajan en rojo y naranja, el resto del cuerpo, las mancuernas en los extremos con los brazos
  abiertos, el deltoides posterior de espaldas), que es lo que comprueba el dibujo en Safari y Firefox; y que un ejercicio
  propio sigue con sus músculos.
- `node tools/figure.js --check`: `data/figure.js` está al día con los puntos del dibujo.

La hoja «Cómo se hace» no está entre las 47 pantallas que recorren las pruebas de accesibilidad, tamaños y contraste: se
comprueba aparte, en `tests/figures.py`.

## Lo que queda fuera

- Las figuras enseñan la postura de inicio, la del final y, en algunos gestos, una intermedia: el camino entre ellas es un
  reparto, no una captura de movimiento.
- En los ejercicios de cuerpo completo (CrossFit, Hyrox, funcional) lo que destaca sobre la silueta en rojo apagado es lo
  que la librería nombra además del cuerpo entero; si no nombra nada más (un burpee solo dice cuerpo completo y cardio), lo
  que destaca son sus secundarios, en naranja.
- Lo que solo se entiende desde arriba o en tres cuartos (el Pallof press, la abducción sentada) se ha resuelto de frente o
  de espaldas, con los brazos o los muslos en escorzo.
- De perfil, la cuerda de la comba es un lazo estrecho que gira sobre las manos: su arco queda de canto y no se ve.
- **Al lanzar muy deprisa una lista larga en el iPhone** (17 Pro, iOS 27) se ve unas milésimas la zona que aún no está
  pintada, en negro, antes de que salgan las filas (observación del propietario al probar la V1.0.3; la lista funciona). Las
  filas que no se ven no se pintan hasta que se acercan (`content-visibility`), que es lo que hace que abrir la lista sea
  rápido, y cada miniatura es un dibujo de trazos, no una imagen. No se ha cambiado nada: aquí no hay forma de medirlo sin el
  móvil, y lo que podría reducirlo (pintar las miniaturas una vez como imagen) es un cambio que hay que probar en él.
