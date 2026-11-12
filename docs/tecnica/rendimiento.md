# Rendimiento

Cómo se mide el rendimiento de StrataFit y lo medido en la V1.0.2 (T-26, dentro de I-17), frente a la V1.0.1.

## Cómo se mide

`python3 tests/perf.py A.html B.html` abre cada compilación en Chromium, le pone muchos datos (unos 700 entrenos, el historial de
150 ejercicios con 120 registros cada uno y tres años de comidas: unos 2 MB, varios años de uso diario) y mide:

- **Primer pintado**: desde que empieza a cargar la página hasta que la app se ve (`window.__ffok`), mediana de cinco aperturas.
- **Guardar**: lo que tarda un toque que guarda (el agua del día), sin contar lo que IndexedDB escribe después sin frenar la
  pantalla; mirándolo todo y, desde la V1.0.2, diciendo que solo cambió el núcleo (`saveState('core')`, I-10).
- **Ver qué hay que subir**: lo que calcula la sincronización antes de hablar con Firebase (las huellas de cada elemento).
- **Pintar cada pestaña**: lo que tarda `R()` en volver a pintar la pestaña (con `core/morph`, cambiando solo lo distinto).

No es una prueba que pase o falle: los números dependen del ordenador, así que solo valen para comparar dos compilaciones medidas
seguidas en el mismo. En un iPhone, todo tarda varias veces más.

## Medido en la V1.0.2

@@TABLA@@

## Qué se hizo

- **Guardar solo lo que cambia (I-10)**: antes, cada guardado pasaba a texto todo el estado para saber qué había cambiado; ahora la
  acción dice qué partes tocó y solo esas se pasan a texto (las demás, en un repaso 2 s después, con la app parada).
- **IndexedDB (I-04)**: escribir las partes ya no frena la pantalla (va en segundo plano y en orden). Leerlas al arrancar es asíncrono:
  el primer pintado espera a tenerlas.
- **Service worker (I-09)**: el código sale de la caché sin volver a pedirlo, así que abrir la app instalada no espera a la red.
- **Pintar sin rehacer** (desde la V1.0.0, `core/morph`) y **estilos sin `style="…"`** (I-14): lo que depende de un dato se aplica
  con el CSSOM al terminar de pintar (`core/dynstyle`).
