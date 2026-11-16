# Figuras de ejercicio

El modelo anatómico haciendo cada uno de los 551 ejercicios de la librería. Sustituye a las fotos realistas, que ya no existen.
Está en la rama `desarrollo-figuras` y no se publica sin el visto bueno del propietario.

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
- Una **postura que se mantiene** (una plancha, el pino, colgarse de la barra) es una sola figura, quieta.
- Con **«Reducir animaciones»** (Ajustes) o si el móvil pide menos movimiento, la figura no se mueve: salen las posturas del
  gesto una junto a otra, con su rótulo («Inicio» y «Final» y, si la hay, «Paso»).
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
| `src/js/extras/anatomy.js` | `exPicture` (la imagen pequeña de un ejercicio, que se guarda una vez pintada), `exMotion` (la grande) y `exMusclesSmall` (los músculos en pequeño). |
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

El modelo cuida solo dos cosas que de otro modo habría que vigilar en cada postura: el **codo y la rodilla doblan siempre
hacia su lado** y, si la mano queda tan cerca del hombro que el codo tendría que cerrarse más de lo que da de sí, el brazo
se dibuja en escorzo (con el codo hacia quien mira) lo justo para que quede en su tope.

El material es una lista de piezas, cada una en su plano (detrás de todo, entre el lado de atrás y el cuerpo, o delante):
trazos, rellenos, almohadillas, círculos y placas, fijos o unidos a una pieza del cuerpo (`on`); una barra recta entre dos
puntos que pueden moverse (`link`: un cable, una palanca, una goma); una pieza rígida que apunta a un punto (`aim`: el
neumático que se voltea); y lo que se lleva en las manos (`bar`, `db`, `kb`, `ball`, `bag`, `disc`). Está explicado en la
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
arrancar pasa de 444 a 549 KB (de 168 a 204 KB comprimido): **36 KB más**. A cambio se van las 28 fotos, 321 KB: una
instalación nueva descarga **unos 285 KB menos**, y el archivo único baja de 1.446 a 1.124 KB.

Las miniaturas se guardan una vez pintadas (por ejercicio y tamaño), así que una lista o el entreno no las recalculan al
repintarse. En el equipo de pruebas, calcular las 551 de una vez lleva menos de una décima de segundo.

## Pruebas

- `tests/rig.test.mjs` (21 pruebas, sin navegador), sobre **todos** los ejercicios de la librería y todo el recorrido del
  gesto: cada uno tiene figura; las figuras están bien escritas; ninguna pieza sale sin sitio; los codos y las rodillas doblan
  hacia donde doblan; **ninguna articulación pasa de lo que un cuerpo puede hacer** (cintura, cuello, hombro, codo, muñeca,
  cadera, rodilla y tobillo; de frente, brazos y piernas); **las manos y los pies llegan a donde se les pide** (el agarre, el
  pedal, el suelo); nada se hunde en el suelo; el gesto no da saltos; y el encuadre. Además, en ejercicios conocidos: en la
  sentadilla los pies no se mueven; en el press la barra sube casi recta y el cuerpo no se mueve del banco; en el curl solo se
  cierra el codo; colgado de la barra, las manos no se mueven de ella y los pies no tocan el suelo; en el remo el codo va
  hacia atrás; y el cable del jalón acaba en la mano.
- `tests/figures.py` (133 comprobaciones, en navegador): las 551 miniaturas y las 551 hojas, una a una (la figura, sus
  piezas, el nombre y el texto, sin fotos); las listas, la ficha y el entreno; la hoja con detalle en un ejercicio de cada clase
  (figura grande arriba, músculos debajo a la izquierda, texto después; que se mueve y sigue en su sitio tras varios ciclos);
  las posturas que se mantienen; a 320 y a 768 px de ancho; «Reducir animaciones» con dos y con tres posturas; lo pintado de
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
