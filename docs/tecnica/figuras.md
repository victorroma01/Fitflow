# Figuras de ejercicio (muestra)

El modelo anatómico haciendo cada ejercicio. **Es una muestra**, en la rama `desarrollo-figuras`: no forma parte de la V1.0.3 y no
se publica sin el visto bueno del propietario. Tiene siete ejercicios: cuatro (Press banca, Sentadilla, Curl bíceps barra y
Elevaciones laterales) y tres variantes suyas (Press banca mancuernas, Sentadilla frontal y Curl con mancuernas).

## Qué se ve

- **En pequeño** (el entreno, la ficha, las listas de la librería y de las rutinas): la figura haciendo el ejercicio, en el
  momento del gesto que mejor lo identifica, con los músculos que trabajan en rojo (principales) y naranja (secundarios). A
  ese tamaño es un pictograma: la silueta, sin los músculos en reposo, encuadrada en lo que se mueve (los brazos y la barra
  en un curl; el cuerpo entero en una sentadilla).
- **Al tocar la imagen**, la hoja «Cómo se hace»: arriba, la figura en grande, que se mueve del inicio al final y vuelve (la
  parte del esfuerzo va más rápida que la otra); debajo, a la izquierda, los músculos en pequeño (de frente y de espaldas) y,
  a su lado, el nombre del ejercicio y los músculos con su nombre; y después, el texto.
- Con **«Reducir animaciones»** (Ajustes) o si el móvil pide menos movimiento, la figura no se mueve: salen las dos posturas,
  «Inicio» y «Final», una junto a otra.
- Un ejercicio **sin postura** se ve como antes: su foto, si la tiene, o sus músculos en el mapa.
- **Las fotos realistas se quitan** (indicación del propietario): un ejercicio con figura ya no enseña su foto en ningún
  sitio. Las 28 fotos siguen en los ejercicios que aún no tienen figura; borrarlas del todo está [pendiente](#lo-que-falta).

## Cómo está hecho

| Pieza | Qué es |
| --- | --- |
| `tools/figure.js` → `src/js/data/figure.js` | El dibujo del **modelo de perfil**: tronco, cabeza, cadera, muslo, pierna, pie, brazo, antebrazo y mano (abierta y en puño). Cada pieza es una silueta y sus músculos, y cada forma, una curva cerrada que pasa por unos pocos puntos. Los puntos están en la herramienta; el módulo lleva los trazados ya calculados y no se edita a mano. |
| `src/js/data/figposes.js` | Las **posturas**: ejercicio → vista, postura de inicio, lo que cambia en la del final, material, qué extremo es el final del esfuerzo y en qué momento se pinta la miniatura. |
| `src/js/extras/rig.js` | El **modelo articulado**: dada una postura, dónde va cada pieza. Sin estado ni pantalla. |
| `src/js/extras/figure.js` | El **dibujo**: define las piezas una vez (`<defs>`) y cada figura solo las coloca (`<use>`), así que una lista llena de miniaturas apenas pesa. Pinta la figura quieta, la grande, y la mueve. |
| `src/js/extras/anatomy.js` | `exPicture` (la imagen pequeña de un ejercicio), `exMotion` (la grande) y `exMusclesSmall` (los músculos en pequeño). |
| `src/js/library/howto.js` | La hoja. |

Hay **dos modelos**, con los mismos colores, degradados y rayado que el mapa muscular:

- **De perfil** (`v: 'S'`), dibujado para esto, con las mismas alturas que la figura frontal (hombro, cadera, rodilla y
  tobillo). Las piezas giran sobre sus articulaciones y se pintan de atrás adelante; el brazo y la pierna del lado de atrás
  van un poco desplazados y más oscuros, para dar fondo. Es la vista de casi todos los ejercicios (sentadillas, presses,
  curls, remos).
- **De frente** (`v: 'F'`): la figura del mapa muscular, tal cual, con los brazos recortados por el hombro para que giren.
  Es para lo que solo se entiende de frente (elevaciones laterales).

### Escribir una postura

Con ángulos en grados, como los diría un entrenador (0 = de pie y recto):

| Dato | Qué es |
| --- | --- |
| `lean` | Inclinación del tronco: hacia delante, positivo; `-90`, tumbado boca arriba. |
| `neck` | Cuello (barbilla al pecho, positivo). |
| `hip`, `knee` | Flexión de cadera y de rodilla. |
| `sh`, `el`, `wr` | Brazo hacia delante, flexión de codo y muñeca. |
| `grip: [x, y]` | En vez de `sh` y `el`: dónde va el puño, en coordenadas del tronco en reposo (se mueve con él). El codo lo calcula el modelo. |
| `fa` | Con `grip`, el ángulo del antebrazo con el tronco (90 = hacia delante). El codo queda bajo el puño y el brazo se ve tan corto como haga falta: es lo que pasa cuando el codo apunta hacia quien mira (un press de banca). |
| `kU`, `kF` | Escorzo del brazo y del antebrazo (1 = se ven enteros). |
| `foot: [x, y]` | En vez de `hip` y `knee`: dónde va el tobillo. La rodilla la calcula el modelo. |
| `at`, `x`, `y` | Qué queda quieto: el tobillo (lo normal: los pies no se mueven) o, con `at: 'hip'`, la cadera en `x`, `y` (tumbado en un banco). |
| `eb`, `kb` | Hacia qué lado doblan el codo y la rodilla. |
| `far: { … }` | Lo que cambia en el brazo y la pierna del lado de atrás; sin él, hacen lo mismo que los de delante. |

La postura del final (`b`) solo dice lo que cambia respecto a la de inicio (`a`). Entre las dos, los ángulos y los puntos se
reparten: los pies no se mueven en una sentadilla porque el tobillo es lo que queda quieto, y la barra sube recta en un press
porque lo que se reparte es el punto del puño.

Material: `['bar', radio del disco]` (la barra, vista de punta, con el disco del lado de atrás), `['bench', desde, hasta,
altura]` y `['db']` (mancuernas).

### Añadir un ejercicio o una variante

1. En `data/figposes.js`, una entrada con el nombre del ejercicio de la librería. Una **variante** parte de la postura de otro
   y cambia lo suyo (`variant(CURL, { props: [['db']] })`): el material o dónde va la barra.
2. `python3 build.py` y mirar la hoja del ejercicio. `tests/rig.test.mjs` comprueba que la postura está bien escrita y que
   nada sale sin sitio.
3. Si hace falta una pieza o un material nuevos, se dibujan en `tools/figure.js` (`node tools/figure.js` rehace
   `data/figure.js`) o en `extras/figure.js`.

## Lo que pesa

Con el modelo de perfil entero, el motor y las siete posturas, el código que se descarga al arrancar pasa de 444 a 471 KB (de
237 a 248 KB comprimido): **unos 11 KB**. Cada postura más son entre 100 y 300 bytes. No hay imágenes: son trazados.

## Pruebas

- `tests/rig.test.mjs` (11 pruebas, sin navegador): las posturas están bien escritas; en todo el recorrido salen las mismas
  capas y ninguna sin sitio; en la sentadilla los pies no se mueven y la barra queda sobre ellos; en el press, el puño está
  donde se le pide, la barra va en línea recta y el codo, bajo el puño; en el curl, el codo no se adelanta; las variantes
  comparten la postura; y el encuadre de la miniatura.
- `tests/figures.py` (115 comprobaciones, en navegador): las miniaturas de la lista, la ficha y el entreno; la hoja de cada
  ejercicio (figura grande arriba, músculos debajo a la izquierda, texto después; que se mueve y sigue en su sitio tras varios
  ciclos); a 320 y a 768 px de ancho; «Reducir animaciones»; lo pintado de verdad (los músculos que trabajan en rojo y naranja, el resto
  del cuerpo, y las mancuernas en los extremos con los brazos abiertos), que es lo que comprueba el dibujo en Safari y Firefox;
  que un ejercicio con figura no enseña su foto; y que los ejercicios sin postura siguen como antes.
- `node tools/figure.js --check`: `data/figure.js` está al día con los puntos del dibujo.

## Lo que falta

Para aplicarlo a los 551 ejercicios de la librería (63 tipos de movimiento, 10 tipos de material):

- **Las posturas**, por tandas de grupo muscular. Las variantes salen de la postura de su ejercicio.
- **Material por dibujar**: polea y cable, máquinas, banco inclinado y declinado, barra de dominadas, kettlebell, TRX, bandas,
  balón.
- **La vista de espaldas** (dominadas, jalones), recortando la figura posterior igual que la frontal, y **codos y piernas
  articulados en la vista de frente** (press de hombro, zancada lateral).
- **Columna que se dobla** (encogimientos de abdomen): hoy el tronco es una pieza.
- Los movimientos con varias fases (halterofilia, burpees) quedarían en dos posturas clave.
- Los **ejercicios propios** no tienen postura: seguirían con sus músculos en el mapa.
- **Quitar del todo las fotos realistas**: las 28 fotos (`src/img/ex`), su código (`library/photo`, `data/photos`, `build.py`,
  `tools/exphotos.py`), su CSS, `tests/photos.py` y su documentación, conservando los nombres alternativos de búsqueda de
  `map.txt`.
- La hoja «Cómo se hace» no está entre las 47 pantallas que recorren las pruebas de accesibilidad, tamaños y contraste: se
  comprueba aparte, en `tests/figures.py`.
