# Rendimiento

Cómo se mide el rendimiento de StrataFit y lo medido en la V1.0.2 (T-26, dentro de I-17), frente a la V1.0.1.

## Cómo se mide

`python3 tests/perf.py A.html B.html` abre cada compilación en Chromium, le pone muchos datos (unos 700 entrenos, el historial de
150 ejercicios con 120 registros cada uno y tres años de comidas: 1,3 MB, varios años de uso diario) y mide:

- **Primer pintado**: desde que empieza a cargar la página hasta que la app se ve (`window.__ffok`), mediana de cinco aperturas.
- **Guardar**: lo que tarda un toque que guarda (el agua del día), sin contar lo que IndexedDB escribe después sin frenar la
  pantalla; mirándolo todo y, desde la V1.0.2, diciendo que solo cambió el núcleo (`saveState('core')`, I-10).
- **Ver qué hay que subir**: lo que calcula la sincronización antes de hablar con Firebase (las huellas de cada elemento).
- **Pintar cada pestaña**: lo que tarda `R()` en volver a pintar la pestaña (con `core/morph`, cambiando solo lo distinto).

No es una prueba que pase o falle: los números dependen del ordenador, así que solo valen para comparar dos compilaciones medidas
seguidas en el mismo. Por eso las mide por turnos (A, B, A, B…) y da la mediana de las vueltas (`PERF_ROUNDS`, 3 si no se dice).
Una compilación anterior a la V1.0.2 recibe los mismos datos con sus claves cortas (`hist`, `wt`…). En un iPhone, todo tarda varias
veces más.

## Medido en la V1.0.2

Medido el 12 de noviembre de 2026 en el ordenador de desarrollo (Chromium en Linux), con 1,3 MB de datos: mediana de 5 vueltas,
alternando la V1.0.1 y la V1.0.2. Por debajo de 1 ms, la diferencia entre dos vueltas es mayor que la que hay entre versiones.

| Medida | V1.0.1 | V1.0.2 | Diferencia |
| --- | ---: | ---: | --- |
| Primer pintado | 86 ms | 98 ms | +12 ms: las partes se leen de IndexedDB, que es asíncrono (I-04) |
| Guardar, mirándolo todo | 6,7 ms | 6,9 ms | Igual |
| Guardar, diciendo qué cambió | — | 0,4 ms | Unas 17 veces menos: el agua, las comidas, la pestaña, el día elegido, el peso y la apariencia (I-10) |
| Ver qué hay que subir | 2,6 ms | 2,8 ms | Igual |
| Pintar Workout | 0,6 ms | 0,9 ms | Igual (menos de 1 ms) |
| Pintar Nutrición | 0,6 ms | 0,8 ms | Igual (menos de 1 ms) |
| Pintar Dashboard | 7,1 ms | 5,8 ms | Igual o algo menos |
| Pintar Perfil | 1,0 ms | 1,1 ms | Igual |

En resumen: lo que más se repite al usar la app (anotar agua o una comida, cambiar de pestaña o de día) guarda en menos de 1 ms
aunque haya años de datos, y escribir en IndexedDB ya no frena la pantalla; pintar sigue igual de rápido. A cambio, abrir la app
tarda unos 12 ms más (en un iPhone, del orden de 50 ms) por leer las partes de IndexedDB, que además deja de tener el límite de
unos 5 MB de antes. Durante un entreno, marcar series guarda solo el entreno en curso (`workout/resume`), como antes.

## Qué se hizo

- **Guardar solo lo que cambia (I-10)**: antes, cada guardado pasaba a texto todo el estado para saber qué había cambiado; ahora la
  acción dice qué partes tocó y solo esas se pasan a texto (las demás, en un repaso 2 s después, con la app parada).
- **IndexedDB (I-04)**: escribir las partes ya no frena la pantalla (va en segundo plano y en orden). Leerlas al arrancar es asíncrono:
  el primer pintado espera a tenerlas.
- **Service worker (I-09)**: el código sale de la caché sin volver a pedirlo, así que abrir la app instalada no espera a la red.
- **Pintar sin rehacer** (desde la V1.0.0, `core/morph`) y **estilos sin `style="…"`** (I-14): lo que depende de un dato se aplica
  con el CSSOM al terminar de pintar (`core/dynstyle`).
