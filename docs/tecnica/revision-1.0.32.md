# Revisión de la V1.0.32 antes de publicarla

Repaso técnico y funcional de la V1.0.32 mientras espera a publicarse (18 de noviembre de 2026), en la rama
`optimizacion-1.0.32`, que sale de `desarrollo-1.0.32`: código sin usar, lógica, organización, estabilidad y fluidez. Lo que aquí
se da por comprobado se ejecutó; lo que no se pudo ejecutar se dice ([lo que no se pudo comprobar](#lo-que-no-se-pudo-comprobar)).

En corto: el código ya estaba limpio y medido, y ahí no había casi nada que ganar; lo que salió al leer con calma el guardado y
la sincronización fueron **dos casos en los que se podían perder datos**, los dos reproducidos antes de tocar nada y ya
corregidos.

## Qué se miró y cómo

1. **Todo `src/js` con el comprobador de tipos de TypeScript**, sin tocar el código (132 módulos, unas 20.900 líneas): 261
   avisos, ninguno de fondo. Son tipos que el comprobador no puede deducir en JavaScript sin anotar (las plantillas `html`,
   reCAPTCHA en `window`, las posturas de las figuras) y 60 parámetros `i` sin usar, que son la firma común de las acciones
   (`A.nombre = (i, b) => …`).
2. **Búsqueda de lo frágil** en todo el código: cada `JSON.parse` sin `try` (6: copias internas o con el `catch` en quien
   llama), cada promesa sin `catch` (3, las tres de promesas que nunca fallan), cada escucha y temporizador puesto dentro de una
   función (ninguno se acumula), las cuentas con fechas (por día local, bien) y lo que se escribe fuera de `Store` (nada).
3. **Código sin usar**: nada. `tools/check.js` ya hace fallar la compilación si algo declarado, exportado, registrado o
   dibujado no se usa, también en el CSS; TypeScript, que mira además variables y parámetros, no encontró más.
4. **Tamaño de las funciones**: 1.455, de las que 52 pasan de 40 líneas y 9 de 80. Las largas son dibujo lineal (el PDF del
   análisis, la imagen del resumen, las posturas de las figuras) y se leen bien de arriba abajo, salvo el arranque
   ([O1](#lo-encontrado)).
5. **Lectura completa del guardado y de la sincronización** (`core/persist`, `core/parts`, `core/idb`, `cloud/sync`,
   `cloud/merge`, `cloud/docs`, `workout/resume` y `core/boot`), buscando qué pasa cuando algo falla a medias o cuando dos
   cosas escriben a la vez.
6. **Reproducción en el navegador**, con el Firebase de prueba de `tests/cloud.py`, de cada sospecha antes de tocar nada. Lo
   que no se pudo reproducir no se cuenta.
7. **Rendimiento**: `tests/perf.py` con 1,3 MB de datos, alternando la compilación de antes y la de después.
8. **Sin cambios de más**: el paseo aleatorio y las capturas de `tests/compare.sh` entre la compilación de antes y la de
   después.

## Lo encontrado

| Id | Prioridad | Qué pasaba | Corrección |
| --- | --- | --- | --- |
| R1 | High | **Sin sitio en el móvil y con la sincronización en marcha, un entreno se borraba también de la nube.** Si el móvil no podía guardar (aviso «No se ha podido guardar en este dispositivo»), el entreno subía a la nube y la sincronización lo apuntaba como sincronizado. Al volver a abrir la app, al móvil le faltaba y, como constaba que lo había tenido, la nube lo daba por borrado y lo borraba. Lo mismo con lo que bajaba de la nube: se apuntaba como bajado sin esperar a que estuviera escrito. | Lo sincronizado solo se apunta cuando lo que describe está guardado en el móvil (`savesBroken` en `core/persist`; `saveMeta` en `cloud/sync`), y lo que baja, cuando ya está escrito. Al volver a abrir, lo que falte baja de la nube. |
| R2 | High | **Con la app abierta dos veces, una pisaba lo de la otra y la nube perdía datos.** Dos pestañas o, en Android, la app instalada y una pestaña comparten lo guardado, pero cada una tiene su copia en memoria. Un entreno anotado y subido en una desaparecía del móvil y de la nube cuando la otra, que no lo tenía, guardaba y sincronizaba lo suyo. En el iPhone, la app instalada guarda aparte de Safari y no le pasa; dos pestañas de Safari, sí. | Guarda una sola cada vez ([la app abierta dos veces](estado.md#la-app-abierta-dos-veces)): cada guardado deja una marca y, si otra apertura ha guardado después, esta se queda atrás, no escribe ni sincroniza y se recarga con lo último. |
| R3 | Low | **El entreno en curso entre dos ventanas.** Una ventana sin entreno borraba, al pintar, el entreno en curso guardado por otra (que, si el móvil la cerraba en ese momento, no podía reanudarlo); y dos ventanas con el mismo entreno se lo pisaban. | Lo lleva una sola: quien lo empieza o lo reanuda (`workout/resume`). |
| O1 | — | **El arranque** (`start`, en `core/boot`) era una función de 151 líneas que mezclaba los relojes del entreno, los arreglos, el entreno por reanudar, el primer pintado y los avisos de después. | Es la lista de sus pasos, cada uno con su nombre y su comentario. Hace lo mismo y en el mismo orden. |

R1 y R2 no son de esta versión: **están también en la publicada** (la 1.0.31), y se reprodujeron igual con ella. No consta que
le haya pasado a nadie: R1 necesita un móvil sin sitio y R2, la app abierta dos veces en el mismo navegador.

## Lo que no hacía falta tocar

- **Rendimiento.** Ya estaba medido y afinado en la 1.0.32 ([Rendimiento](rendimiento.md)). La marca de cada guardado son dos
  escrituras de 12 caracteres: no se nota en ninguna medida ([comprobado](#comprobado)).
- **Los relojes del entreno** (cinco y cuatro veces por segundo, siempre en marcha): sin entreno salen a la primera línea, y
  pararlos y arrancarlos con cada entreno tocaría el corazón de la sesión para no ganar nada que se pueda medir.
- **Las líneas largas** (418 de más de 240 caracteres en 84 módulos): casi todas son plantillas `html` escritas en una línea.
  Partirlas metería espacios en el HTML que se pinta; es el estilo del proyecto y el formateador lo mantiene. (Después se
  encontró la forma de partirlas sin cambiar el HTML: [pantallas legibles](#después-de-la-revisión-pantallas-legibles).)
- **Las animaciones de las figuras**: están en su propia rama (`desarrollo-animaciones`) y aquí no se tocan.

## Comprobado

- **Las pruebas nuevas fallan sin la corrección.** Se quitó cada parte por separado y se pasaron: sin mirar `savesBroken`, la
  nube pierde el entreno que el móvil no pudo guardar (5 comprobaciones fallan); sin esperar a que lo bajado esté escrito, pierde
  el que bajó sin guardarse (3); y dejando sincronizar a la pestaña que se quedó atrás, la nube pierde un entreno y gana uno
  que no debía (1).
- **Batería completa** (`bash tests/run.sh`) con Chromium: sus 37 órdenes pasan, con 1.456 comprobaciones en navegador, 41 de
  ellas nuevas (27 en `tests/storage.py` y 14 en `tests/cloud.py`).
- **Lo mismo que antes con una sola apertura**: las capturas (282: 47 pantallas × 6 configuraciones, píxel a píxel) y el paseo
  aleatorio (4 semillas × 150 pasos: el HTML, lo guardado y los sonidos de cada paso) de `tests/compare.sh` entre la compilación
  de `desarrollo-1.0.32` y esta: sin diferencias. El HTML de las 106 pantallas de `tests/samehtml.py --mas` es el mismo salvo
  una línea de Diagnóstico, que ahora cuenta también la marca (`Almacenamiento: … rev 1 KB`).
- **El paseo daba diferencias que no lo eran, y se ha corregido.** En GitHub, con el mismo código, marcó HTML distinto en 3 de
  4 semillas en una pasada y en 1 de 4 en la siguiente (ese trabajo es informativo y no falla por eso); aquí, solo con el
  ordenador ocupado. Eran las figuras de los ejercicios, que se mueven y se pintan poco a poco: según el momento, a una
  figura grande se la pillaba en otra postura y una pequeña de una lista estaba o no pintada todavía. Pasaba igual comparando
  la compilación de antes consigo misma (con el ordenador cargado, en 3 de 9 pasadas). `tests/walk.py` compara ahora qué
  figura grande es, no su fotograma, y espera a que el navegador haya avisado a las pequeñas: con la misma carga, dos copias
  iguales dan el mismo HTML en las 5 pasadas repetidas con las semillas que fallaban. Con esa carga aún puede variar la cuenta
  de pitidos tras un salto largo del reloj (1 de esas 5), porque el sonido arranca cuando el navegador quiere; GitHub no ha
  dado ninguna de esas.
- **En GitHub**, con la [solicitud #61](https://github.com/victorroma01/Fitflow/pull/61): la batería entera con Chromium, con
  el motor de Safari (WebKit) y con el de Firefox, y `tests/cloud.py` contra el emulador de Firebase, con sus reglas. Las
  pruebas nuevas pasan en los tres motores: el aviso de que otra ventana ha guardado llega igual en todos. La comparación con
  `desarrollo-1.0.32` dio las 282 capturas iguales y, en el paseo, las diferencias del punto anterior.
- **Rendimiento** (`tests/perf.py`, 1,3 MB de datos, 7 vueltas, las dos compilaciones alternadas dos veces): sin diferencia
  fuera de lo que varía de una medida a otra.

  | | Antes | Después |
  | --- | --- | --- |
  | Primer pintado | 139 – 145 ms | 132 – 142 ms |
  | Guardar, mirándolo todo | 8,0 – 8,5 ms | 8,3 – 9,3 ms |
  | Guardar, solo el núcleo | 0,6 ms | 0,6 ms |
  | Ver qué hay que subir | 10,8 – 11,7 ms | 11,0 – 12,0 ms |
  | Abrir Registros | 36,1 – 36,6 ms | 34,6 – 35,6 ms |

## Lo que no se pudo comprobar

- **En un móvil de verdad**: dos pestañas de Safari en el iPhone, y la app instalada junto a una pestaña de Chrome en Android
  (la prueba en un Android sigue abierta: I-01). Lo probado son dos páginas del mismo navegador de prueba, que comparten lo
  guardado igual que ellas.
- **Un móvil sin sitio de verdad**: se simula haciendo fallar las escrituras de IndexedDB con el mismo error
  (`QuotaExceededError`).

## Después de la revisión: pruebas al azar y tipos

Al día siguiente (19 de noviembre de 2026), en la rama `tipos-y-pruebas`, se añadieron dos cosas que salieron de valorar el
código: pruebas al azar del guardado y la sincronización ([cómo son](pruebas.md#pruebas-al-azar-del-guardado-y-la-sincronización))
y tipos comprobados ([cómo](tipos.md)). Las pruebas al azar encontraron dos casos más, los dos con el móvil sin sitio:

| Id | Prioridad | Qué pasaba | Corrección |
| --- | --- | --- | --- |
| R4 | High | **Un guardado que fallaba con otro esperando detrás podía dejar la app sin poder leer sus datos.** Los guardados se deciden al momento, dando por escrito lo que el anterior todavía escribe. Si ese fallaba (sin sitio), el siguiente podía escribir el núcleo nombrando un mes de comidas que no llegó a escribirse: al volver a abrir la app faltaba esa parte, salía «No se pudieron leer tus datos» y la app no guardaba ni sincronizaba hasta «Bajar de mi cuenta». Reproducido en una compilación de la 1.0.31 publicada; el código era el mismo desde la V1.0.2. | `core/persist` (`writeIdb`): si un guardado falla, los decididos detrás ya no se escriben, lo que se sabe de cada clave vuelve a lo escrito de verdad y el siguiente guardado lo mira todo ([si un guardado falla](estado.md#si-un-guardado-falla)). Prueba fija en `tests/storage.py`. |
| R5 | Low | **Algo borrado sin conexión justo después de volver el sitio podía reaparecer.** Lo que bajaba de la nube mientras el móvil no podía guardar no se apuntaba como sincronizado (bien: es la corrección de R1), pero tampoco al volver el sitio, hasta la siguiente sincronización. Si entre medias se borraba sin conexión y se cerraba la app, al sincronizar parecía algo que el móvil nunca tuvo, y volvía. No se perdía nada. | `cloud/sync` (`noteWaiting`): lo que esperaba se apunta en cuanto un guardado sale bien, sin adelantarse a una sincronización en marcha ni a guardados a medias (una primera versión de este arreglo sí se adelantaba: lo vio el repaso, y tiene su prueba fija). Queda un caso que no se cierra sin cambiar el formato de lo guardado, documentado en [lo que puede volver a aparecer](backend.md#lo-que-puede-volver-a-aparecer). Pruebas fijas en `tests/cloud.py`. |

Para saber si las pruebas al azar detectan fallos de verdad, se quitó cada protección del guardado y de la sincronización, una
cada vez (diez): fallan con las diez, y con cada una falla también una prueba fija
([la tabla](pruebas.md#qué-fallos-detectan)). Una de esas protecciones no tenía prueba fija (lo subido se apunta cuando el móvil ha
terminado de guardarlo) y ahora la tiene.

Los tipos no encontraron fallos: sirven para que no entren. Para añadirlos solo se tocaron comentarios, y la app compilada es
idéntica, byte a byte, a la de antes.

Dos cosas más, para decidir:

- **Guardar cada parte junto a sus huellas**, en la misma transacción de IndexedDB (hoy las huellas van en localStorage), o
  apuntar los borrados uno a uno. Quitaría el caso que queda de R5. Cambia el formato de lo guardado y necesita su migración:
  mejor en una versión propia.
- **Si la sincronización falla a mitad de juntar lo bajado** (un error del código al aplicar un documento, no de la red), las
  huellas de los documentos ya juntados se guardan antes que sus datos, que se escriben con el siguiente guardado. Sale de leer
  el código; no se ha intentado provocar (haría falta un fallo del propio código en ese punto), así que queda anotado y sin
  tocar.

## Después de la revisión: pantallas legibles

El mismo 19 de noviembre, en la rama `pantallas-legibles`, las plantillas `html` dejaron de ir en una sola línea. Era lo que
más costaba leer del código: una pantalla entera en una línea de 500 a 1.500 caracteres.

- **La regla.** Dentro de una plantilla `html`, un salto de línea no forma parte del HTML (entre dos atributos de una etiqueta
  es el espacio que los separa). `build.py` los quita de la copia que compila, y se rechazan, con el archivo y la línea, donde
  quien lee esperaría un espacio: entre dos palabras, entre un texto y su `${…}`… ([Plantillas HTML](desarrollo.md#plantillas-html)).
- **El formateador.** `npm run format` reparte solo las plantillas que pasan de 140 columnas (`tools/templates.js`): cada
  etiqueta en su línea, sangrada según lo que contiene. De las 657 plantillas, 429 van ahora en varias líneas.
- **La app es la misma.** La compilación con las plantillas repartidas es idéntica, byte a byte, a la de antes (el archivo
  único y el paquete). La única diferencia es anterior a la regla: la pantalla del análisis mensual era la única escrita en
  varias líneas, y sus seis saltos de línea llegaban al HTML entre las tarjetas; se quitaron antes (282 capturas iguales, píxel
  a píxel, y 4 de las 106 pantallas de `tests/samehtml.py` con esos seis caracteres menos).
- **Las cifras.** De las 228 líneas con plantilla de más de 240 caracteres quedan 7 (frases largas: un texto no se puede
  partir). Las líneas con plantilla de más de 140 columnas pasan de 379 a 99.
- **Las pruebas** (`tests/templates.test.mjs`): la regla, lo que rechaza, cómo queda cada caso y, sobre el código de verdad, que
  cada módulo repartido con cinco anchos distintos sigue siendo el mismo. Se estropeó la herramienta de siete maneras (no poner
  el espacio entre dos atributos, separar un texto de su `${…}`, saltar junto a un espacio…) y fallan con las siete.

Lo que queda de «las líneas largas», sin tocar:

- **Dos módulos de las figuras** (`extras/figure` y `extras/anatomy`, 21 líneas): los reescribe la solicitud de las figuras
  nuevas (#59), y repartirlos aquí solo serviría para cruzarse con ella. Están apuntados en `tools/format.js`
  (`TEMPLATES_LATER`); al fusionarla o descartarla se vacía esa lista y se pasa el formateador.
- **170 líneas de código sin plantilla**: listas de textos y tablas (los pasos de la guía, los avisos legales, los iconos) y
  HTML montado sumando textos, de antes de las plantillas. Y las 665 de `data/`, que son datos: un ejercicio o un alimento
  por línea.
- **Los nombres de las clases CSS** (337 de 507 tienen cuatro letras o menos: `cd`, `it`, `mu`…): cambiarlos sí cambia el
  HTML y muchas pruebas que buscan por clase. Es el siguiente paso, por partes.

## Para decidir

No son fallos; son mejoras que tocan cosas que decide el propietario.

- **`package-lock.json` y `npm ci` en GitHub Actions.** Poco que ganar hoy. Las tres herramientas con las que se compila y se
  comprueba el código (`acorn`, `esbuild` y `typescript`) tienen versión exacta y no dependen de ninguna otra (`esbuild` solo
  trae su programa para cada sistema, con su misma versión): GitHub instala 4 paquetes, siempre los mismos, y la app ya se
  compila siempre con lo mismo. El archivo de bloqueo solo añadiría comprobar la huella de cada paquete al bajarlo. Lo que sí
  cambia de una pasada a otra son herramientas que solo usan las pruebas y no van en la app: `firebase-tools` y
  `firebase-admin` (el emulador de Firebase: fijadas solo a su versión mayor, con unos 700 paquetes detrás) y `numpy` y
  `pillow` (las comparaciones de capturas: sin versión en `tests/requirements.txt`). Si una prueba falla en GitHub sin haber
  tocado el código, es lo primero que mirar; fijar sus versiones es lo que tendría más sentido.
- **Borrar solas las ramas ya fusionadas** (en GitHub: Settings → General → «Automatically delete head branches»), para que
  no se vuelvan a juntar ramas antiguas.
- **Partir las plantillas largas**: hecho, y sin cambiar el HTML que se pinta
  ([pantallas legibles](#después-de-la-revisión-pantallas-legibles)).
