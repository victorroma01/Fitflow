# Rendimiento

Cómo se mide el rendimiento de StrataFit y lo medido en la V1.0.2 (T-26, dentro de I-17), frente a la V1.0.1, y en la V1.0.3,
frente a la V1.0.2.

## Cómo se mide

`python3 tests/perf.py A.html B.html` abre cada compilación en Chromium, le pone muchos datos (unos 700 entrenos, el historial de
150 ejercicios con 120 registros cada uno y tres años de comidas: 1,3 MB, varios años de uso diario) y mide:

- **Primer pintado**: desde que empieza a cargar la página hasta que la app se ve (`window.__ffok`), mediana de cinco aperturas.
- **Guardar**: lo que tarda un toque que guarda (el agua del día), sin contar lo que IndexedDB escribe después sin frenar la
  pantalla; mirándolo todo y, desde la V1.0.2, diciendo que solo cambió el núcleo (`saveState('core')`, I-10).
- **Ver qué hay que subir**: lo que calcula la sincronización antes de hablar con Firebase (las huellas de cada elemento).
- **Pintar cada pestaña**: lo que tarda `R()` en volver a pintar la pestaña (con `core/morph`, cambiando solo lo distinto).
- **Abrir Registros** (desde la V1.0.3): la página más larga de la app, con una fila por entreno (700).

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
tarda unos 12 ms más (en un iPhone, del orden de 50 ms) porque las partes se leen de IndexedDB, que no tiene el límite de unos
5 MB de localStorage. Durante un entreno, marcar series guarda solo el entreno en curso (`workout/resume`), como antes.

## Medido en la V1.0.3

Medido el 13 de noviembre de 2026 en el mismo ordenador y con los mismos datos: mediana de 5 vueltas, alternando la V1.0.2 y la
V1.0.3. La auditoría de la V1.0.3 ([informe](auditoria-1.0.3.md)) añadió cálculos (una sola regla para las marcas, la semana de
Nutrición, la validación de los datos al arrancar), así que se midió para ver que nada fuera más lento, y con el perfil de CPU
de Chromium se buscó en qué se iba el tiempo.

| Medida | V1.0.2 | V1.0.3 | Diferencia |
| --- | ---: | ---: | --- |
| Primer pintado | 111 ms | 112 ms | Igual (en 20 aperturas alternas: 106 y 106 ms), con más datos validados al arrancar |
| Guardar, mirándolo todo | 7,0 ms | 6,6 ms | Igual |
| Guardar, diciendo qué cambió | 0,5 ms | 0,5 ms | Igual |
| Ver qué hay que subir | 3,1 ms | 3,1 ms | Igual |
| Pintar Workout | 1,0 ms | 1,0 ms | Igual |
| Pintar Nutrición | 0,7 ms | 1,0 ms | +0,3 ms: la semana (siete barras y las medias) |
| Pintar Dashboard | 6,1 ms | 4,3 ms | Un 30 % menos |
| Pintar Perfil | 1,0 ms | 1,1 ms | Igual |
| Abrir Registros (700 entrenos) | 115 ms | 35 ms | Más de 3 veces menos |

Lo que se encontró con el perfil y se corrigió:

- **Registros** tardaba 115 ms en abrirse con 700 entrenos (en un iPhone, del orden de medio segundo): casi dos tercios se iban
  en escribir las fechas, porque `toLocaleDateString` crea un formato de fecha nuevo en cada llamada, y hay dos por entreno.
  Ahora cada formato se crea una vez y se reutiliza (`fmtDate`, en `core/util`).
- **Dashboard**: en cada pintado se calculaba el lunes de la semana de cada entreno guardado (para la racha), creando dos fechas
  y un texto por entreno. El lunes de un día no cambia nunca: ahora se recuerda (`mondayKey`, en `core/calc`). Las fechas de la
  línea de récords y de la gráfica usan también el formato reutilizado.

El resultado que se pinta es el mismo carácter a carácter: `tests/samehtml.py` compara el HTML de las 47 pantallas antes y después,
y `tests/calc.test.mjs` compara `fmtDate` con `toLocaleDateString` y `mondayKey` con la cuenta directa en todos los días de dos años.

Además, al arrancar con datos nada da un salto en la pantalla (layout shift 0, que comprueba `tests/layout.py`).

## Medido en la V1.0.32

Medido el 17 de noviembre de 2026 con los mismos datos: mediana de 5 vueltas, alternando la V1.0.31 publicada y la V1.0.32. Este
ordenador no es el de la V1.0.3: solo valen comparadas entre sí las dos columnas. La V1.0.32 trae 25 fotos de portada nuevas y
el fondo del inicio de sesión. En el archivo único van incrustadas (pesa 1,58 MB, unos 420 KB más); en el paquete instalable
son archivos aparte, que el service worker guarda en la primera actualización (unos 315 KB más) y que no se cargan al arrancar.
Desde esta versión se mide también el buscador de la Librería.

| Medida | V1.0.31 | V1.0.32 | Diferencia |
| --- | ---: | ---: | --- |
| Primer pintado | 115 ms | 113 ms | Igual |
| Guardar, mirándolo todo | 7,1 ms | 6,6 ms | Igual |
| Guardar, diciendo qué cambió | 0,5 ms | 0,5 ms | Igual |
| Ver qué hay que subir | 20,7 ms | 9,9 ms | La mitad: la huella de cada elemento se recuerda con su texto |
| Pintar Workout | 1,0 ms | 1,0 ms | Igual |
| Pintar Nutrición | 1,0 ms | 1,0 ms | Igual |
| Pintar Dashboard | 4,9 ms | 5,0 ms | Igual |
| Pintar Perfil | 1,1 ms | 1,1 ms | Igual |
| Buscar en la Librería (cada letra) | 3,9 ms | 3,2 ms | Un 18 % menos: el texto de búsqueda y el ejercicio de cada fila, sin recorrer la lista |
| Abrir Registros (700 entrenos) | 33 ms | 33 ms | Igual |

Con el perfil de CPU de Chromium: mirar qué hay que subir se iba casi todo en recalcular la huella de cada elemento (recorrer su
texto entero), aunque no hubiera cambiado; buscar un ejercicio por su nombre juntaba la biblioteca con los propios y la
recorría entera, en doce sitios, una vez por fila en las listas y en las figuras; y el buscador quitaba otra vez las tildes de
los 551 ejercicios en cada letra. Lo que se pinta es lo mismo carácter a carácter: `tests/samehtml.py` compara el HTML de 106
pantallas antes y después. El arranque no ha cambiado: casi todo es esperar a IndexedDB y lo que hace el navegador (leer el
código, los estilos y colocar la página), no el código de la app.

## Qué se hizo

- **Mirar qué hay que subir (V1.0.32)**: `cloud/sync` recuerda, de cada elemento (un entreno, un día de comidas, el historial
  de un ejercicio…), su texto y su huella. Si el texto es el mismo, la huella también, y no se vuelve a recorrer (`hashText`).
  Un cambio hecho en su sitio cambia el texto y se nota igual (`tests/cloud.py`).
- **Buscar un ejercicio por su nombre (V1.0.32)**: `exByName` (`library/model`) tiene la biblioteca en un índice por nombre,
  que no cambia después de arrancar; los propios, que se renombran en su sitio, se buscan en su lista, que es corta. Da lo mismo
  que recorrer las dos listas (`tests/training.py`).
- **El buscador de la Librería (V1.0.32)**: el texto en el que busca cada ejercicio de la biblioteca (nombre, material, músculos
  y otros nombres, también sin tildes) se calcula una vez; el de los propios, cada vez.
- **Guardar solo lo que cambia (I-10)**: antes, cada guardado pasaba a texto todo el estado para saber qué había cambiado; ahora la
  acción dice qué partes tocó y solo esas se pasan a texto (las demás, en un repaso 2 s después, con la app parada).
- **IndexedDB (I-04)**: escribir las partes ya no frena la pantalla (va en segundo plano y en orden). Leerlas al arrancar es asíncrono:
  el primer pintado espera a tenerlas.
- **Service worker (I-09)**: el código sale de la caché sin volver a pedirlo, así que abrir la app instalada no espera a la red.
- **Pintar sin rehacer** (desde la V1.0.0, `core/morph`) y **estilos sin `style="…"`** (I-14): lo que depende de un dato se aplica
  con el CSSOM al terminar de pintar (`core/dynstyle`).
