# Figuras 3D (prototipo)

La figura de ejercicio nueva: el mismo dibujo de músculos de la app, puesto sobre un cuerpo en 3D y vista de tres cuartos.
Está en pruebas y **no está conectada a la app**: se integrará cuando estén revisados todos los lotes de ejercicios.

## Archivos

- `fig3d.js`: el motor. Construye el cuerpo (tronco, brazos, piernas, cabeza y manos), le envuelve los músculos del mapa
  de la app y lo pinta en SVG desde la cámara que se le dé.
- `gear3d.js`: el material (bancos, Smith, máquinas, poleas, mancuernas, kettlebell, bandas, saco…).
- `mov3d.js`: las familias de movimiento. Cada una recibe las variantes de un ejercicio y da su postura en cada momento
  del gesto. Las posturas salen de reglas físicas: los pies no se mueven del suelo, las rodillas van hacia las puntas de
  los pies y el tronco se inclina lo justo para que el peso quede sobre el medio del pie (con barra, la barra; en la
  Smith, para que la barra siga sus guías). En el banco, la barra toca el pecho con los antebrazos casi verticales.
- `datos.mjs`: saca de la app lo que hace falta (el mapa de músculos, las regiones de cada músculo, y la familia,
  variantes y músculos de cada ejercicio del lote) y lo deja en `salida/`.

## Uso

Con Node 22 y Python con Playwright (lo mismo que las pruebas), desde esta carpeta:

```
node datos.mjs                     # los datos del lote (por omisión, el 1: squat,press,overhead)
python3 banco.py                   # el banco de pruebas: salida/banco.html
python3 verifica.py                # manos que no llegan, pies fuera del suelo, codos o rodillas imposibles, asimetrías
python3 saltos.py                  # saltos de un fotograma a otro en la animación
python3 numeros.py "Sentadilla"    # inclinación del tronco, ángulos, barra sobre el medio del pie…
python3 hoja.py hoja.png "Sentadilla|Press banca"   # una hoja con cada ejercicio en varios momentos y de lado
python3 pagina.py                  # la página de revisión del lote: salida/pagina/index.html
```

## Lotes

1. Sentadillas, press de banca y press de hombro: 57 ejercicios. Revisado.
