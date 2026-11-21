# Figuras 3D (prototipo)

La figura de ejercicio nueva: el mismo dibujo de músculos de la app, puesto sobre un cuerpo en 3D y vista de tres cuartos.
Está en pruebas y **no está conectada a la app**: se integrará cuando estén revisados todos los lotes de ejercicios.

## Archivos

- `fig3d.js`: el motor. Construye el cuerpo (tronco, brazos, piernas, cabeza y manos), le envuelve los músculos del mapa
  de la app y lo pinta en SVG desde la cámara que se le dé.
- `gear3d.js`: el material (bancos, Smith, máquinas, poleas, mancuernas, kettlebell, bandas, saco…).
- `sonda.js`: solo para `choques.py`. Envuelve las piezas del material para que cada una apunte su forma en 3D al dibujarse;
  así la prueba de choques mira exactamente lo que se pinta.
- `mov3d.js`, `tiron3d.js`, `piernas3d.js`, `brazos3d.js`, `hombros3d.js`, `core3d.js` y `funcional3d.js`: las familias de
  movimiento (las del lote 1, las de tirón del lote 2, las de pierna del lote 3, las de brazos del lote 4, las de pecho y
  hombro del lote 5, las de core y lo que quedaba de pierna del lote 6 y las de CrossFit, Hyrox y funcional del lote 7). Cada una recibe las variantes de un ejercicio y da su postura en cada momento
  del gesto. Las posturas salen de reglas físicas: los pies no se mueven del suelo, las rodillas van hacia las puntas de
  los pies y el tronco se inclina lo justo para que el peso quede sobre el medio del pie (con barra, la barra; en la
  Smith, para que la barra siga sus guías). En el banco, la barra toca el pecho con los antebrazos casi verticales.
- `datos.mjs`: saca de la app lo que hace falta (el mapa de músculos, las regiones de cada músculo, y la familia,
  variantes y músculos de cada ejercicio del lote) y lo deja en `salida/`.

## Uso

Con Node 22 y Python con Playwright (lo mismo que las pruebas), desde esta carpeta:

```
node datos.mjs 3                   # los datos de un lote (1: squat,press,overhead; 2: pulldown,row,pullup; 3: las de pierna; 4: las de brazos; 5: pecho y hombro; 6: core y el resto de pierna; 7: CrossFit, Hyrox y funcional)
python3 banco.py                   # el banco de pruebas: salida/banco.html
python3 verifica.py                # manos que no llegan, pies fuera del suelo, codos o rodillas imposibles, asimetrías
python3 choques.py [-v]            # el material (todo lo que se dibuja) contra el cuerpo, brazos y piernas que se cruzan o atraviesan el tronco; -v da el punto
python3 saltos.py                  # saltos de un fotograma a otro en la animación
python3 grosor.py [-v]             # con el grosor del dibujo: material dentro de brazos o piernas, y puños o antebrazos dentro de los muslos
python3 fijos.py                   # piezas que no deben moverse (guías de la Smith, postes de la polea, patas de los bancos, cajones)
python3 numeros.py "Sentadilla"    # inclinación del tronco, ángulos, barra sobre el medio del pie…
python3 hoja.py hoja.png "Sentadilla|Press banca"   # una hoja con cada ejercicio en varios momentos y de lado
python3 pagina.py                  # la página de revisión del lote (sus textos, en textos.py): salida/pagina/index.html
```

## Lotes

1. Sentadillas, press de banca y press de hombro: 57 ejercicios. Revisado.
2. Jalones, remos y dominadas (con colgados y elevaciones de piernas): 54 ejercicios. Revisado.
3. Piernas: pesos muertos y bisagras, zancadas, hip thrust y puentes, prensas, hack, extensiones y curl femoral: 65
   ejercicios. Revisado.
4. Brazos: curls, extensiones de tríceps, fondos y antebrazos: 75 ejercicios. Revisado.
5. Pecho y hombros: flexiones, press de pecho de pie y en máquina, aperturas y cruces de poleas, pullover, encogimientos,
   elevaciones laterales y frontales, pájaros, face pull y remo al mentón: 72 ejercicios. Revisado.
6. Core y lo que quedaba de pierna: crunch y sit-up, elevaciones de piernas, planchas y hollow, dead bug, bird dog, giros,
   rueda, leñador, Pallof, vacío, lumbares (hiperextensiones, GHD, superman y máquina), gemelos, tibial, abductores y
   aductores, patadas de glúteo, step up, sissy, pistol, pasos laterales y zancada lateral: 82 ejercicios. En revisión.
7. CrossFit, Hyrox y funcional: halterofilia (con barra y con mancuernas), kettlebell, acarreos y saco, trineo, burpees, wall
   balls, balón medicinal, box jump y saltos laterales, muscle-ups, trepa de cuerda, pino, gateos, inchworm, press Svend,
   battle ropes y volteo de neumático: 76 ejercicios. En revisión.
