# Clases CSS

Cómo se nombran las clases CSS y cómo se llamaban las que han cambiado de nombre. Sirve para escribir código nuevo y para leer
código, issues o commits anteriores.

Hasta la V1.0.32 casi todas las clases tenían de dos a cuatro letras (`cd`, `it`, `mu`, `sp`). Con las acciones y las claves del
estado se hizo lo mismo en la V1.0.2 ([Nombres de la V1.0.2](nombres.md)); las clases eran lo que quedaba. Se renombran por
lotes: el primero, las 53 de dos letras; el segundo, 104 de las piezas comunes, el entreno, la librería, los programas y la
descarga.

## Cómo se nombran

- En inglés y con guiones, por lo que la pieza **es**, no por cómo se ve: `card`, `sheet`, `set-row`.
- Las partes de una pieza empiezan por su nombre: `exercise` y `exercise-head`, `menu-item` y `menu-close`.
- Un estado es un adjetivo o un participio, y va junto a la clase de la pieza: `exercise folded`, `day on`, `medal off`. Los
  que ya eran una palabra (`on`, `ok`, `up`, `done`, `off`) se quedan como están.
- Las de `css/99-utilities` siguen diciendo la propiedad y el valor (`mt-8`, `fs-12`, `cols-3`): son un ajuste, no una pieza.
- Un nombre se escribe entero, no a trozos (`'an' + x`): así lo encuentran `tools/check.js`, que avisa de un estilo que ya no
  usa nadie, y `tools/classes.js`.

## La comprobación

`node tools/classes.js --check`, en la batería: toda clase que el código pone (`class="…"`, `classList`) o busca
(`querySelector`, `closest`) tiene que estar en `src/css`. Avisa, con el archivo y la línea, de un nombre mal escrito y de un
nombre viejo que vuelve, por ejemplo al fusionar una rama que se escribió antes de renombrarlo. En los dos casos el elemento se
quedaría sin estilo, o el código sin encontrarlo, y nada más lo diría.

Unas pocas clases no tienen estilo propio: el código las pone solo para encontrar el elemento (el recorrido, las pruebas). Están
apuntadas en `HOOKS`, en la misma herramienta.

Mira también **las pruebas**: toda clase que buscan (`querySelector`, `closest`, `matches` y los ayudantes que reciben un
selector, como `txt` o `click`) tiene que estar en `src/css`. Una prueba que busca una clase que no existe no siempre falla:
si comprueba que algo «no está», pasaría siempre. Las que buscan a propósito una clase que ya no existe, para ver que no
vuelve (la foto de una ficha, el pie con el copyright), están apuntadas en `GONE`.

## Cómo se renombra una clase

Una clase se llama igual en cuatro sitios: el selector del CSS, el HTML que pinta el código, lo que el código busca o cambia
(`classList`, `querySelector`) y los selectores de las pruebas. `tools/classes.js` los cambia todos a la vez, y solo donde el
nombre es de verdad una clase («ok» también es un texto, una clave y una variable):

```bash
node tools/classes.js tests/clases-1.0.32.txt --dry   # qué cambiaría, y lo que no sabe decidir
node tools/classes.js tests/clases-1.0.32.txt         # lo cambia (las líneas nuevas del mapa: «K viejo nuevo»)
npm run format
```

En el código no busca texto: lo lee. Renombra en el valor de `class="…"` y en lo que lleve dentro (las ramas de una condición,
la constante o la tabla de la que sale, lo que se le pasa a la función que lo pinta), en `classList` y `className`, y en los
selectores de `querySelector`, `closest` y `matches`. También dentro de una expresión regular que busque un `class="…"` en el
HTML. Lo que no puede decidir lo dice, con su archivo y su línea, y no lo toca:

| Aviso | Qué es | Qué hacer |
| --- | --- | --- |
| `SIN RESOLVER` | Una clase que llega por un camino que no sigue (un dato, lo que devuelve una función). | Mirar si alguna de las del mapa pasa por ahí. |
| `A TROZOS` | Un nombre pegado a un `${…}` que podría completarlo. | Escribirlo entero. |
| `QUEDA` | El nombre viejo sigue escrito en un texto, fuera de los sitios de arriba. | Casi siempre no es la clase (una clave guardada, un texto). Si lo es, cambiarlo a mano. |

**La prueba de que no cambia nada.** Con el mapa, las herramientas de comparar traducen las clases de la versión anterior a las
nuevas, y entonces las dos tienen que ser iguales:

```bash
python3 tests/samehtml.py antes.html despues.html --mas --mapa tests/clases-1.0.32.txt   # el HTML de 106 pantallas
bash tests/compare.sh antes.html despues.html 0,1,2,3 150 tests/clases-1.0.32.txt          # paseo al azar y 282 capturas
```

Las capturas se comparan píxel a píxel y no necesitan mapa: un elemento que se quedara sin su estilo se vería distinto.

El mapa crece con cada lote, y sirve para comparar con cualquier versión anterior: de cada una se traducen solo las clases que
todavía tiene con el nombre viejo (se leen de sus estilos), así que da igual que ya tenga renombrados los primeros lotes.

La prueba no es un trámite. En el segundo lote, el HTML salió distinto en 55 de las 106 pantallas: el título de una página se
saca del HTML con una expresión regular que llevaba escrito el nombre viejo de su clase, y con el nuevo ya no lo encontraba. La
app habría dejado de distinguir una página de otra, y con eso el camino para volver atrás. Desde entonces la herramienta lee
también las expresiones regulares.

Y en las pruebas quedó un selector con el nombre viejo, `b.wkdl`: la herramienta no tomaba por clase un nombre pegado a una
etiqueta de una letra, porque fuera de un selector eso es código (`b.on`). Ahora, en lo que recibe un selector, todo `.nombre`
es una clase, y `--check` mira también las pruebas.

## Clases renombradas en la V1.0.32

El mapa está en [`tests/clases-1.0.32.txt`](../../tests/clases-1.0.32.txt).

### Primer lote: las de dos letras

| Antes | Ahora | Qué es |
| --- | --- | --- |
| `av` | `avatar` | Foto de perfil. |
| `bk` | `backdrop` | Fondo oscuro que queda detrás de una hoja. |
| `bv` | `brand-version` | La versión de la app, en el perfil. |
| `bw` | `brand-word` | El nombre de la app, en el perfil. |
| `cd` | `card` | Tarjeta: el bloque con fondo propio y esquinas redondeadas. |
| `ck` | `check` | Botón redondo que marca una serie como hecha. |
| `cl` | `clamp` | Texto recortado a dos líneas. |
| `gc` | `crystal` | Muestra del aspecto Cristal, en Ajustes. |
| `dy` | `day` | Botón de un día en la tira de la semana. |
| `dn` | `down` | Baja: una tendencia a peor, o la ayuda que se abre hacia abajo. En un ejercicio con todas sus series hechas era otra cosa y pasa a `done`. |
| `xs` | `exercise` | Un ejercicio dentro del entreno en curso. |
| `xh` | `exercise-head` | Cabecera de ese ejercicio: miniatura, nombre y botones. |
| `fl` | `flat` | Muestra del aspecto Clásico, en Ajustes. |
| `fd` | `folded` | Ejercicio plegado. |
| `fu` | `future` | Un día que aún no ha llegado, en los puntos de la semana. |
| `gl` | `glass` | El tema Cristal está activo (va en `<html>`). |
| `g2` | `grid-2` | Rejilla de dos columnas. |
| `g3` | `grid-3` | Rejilla de tres columnas. |
| `gg` | `group-grid` | Rejilla de los grupos musculares de la librería. |
| `gr` | `groups` | La rejilla de filtros, cuando es la de grupos musculares. |
| `hq` | `help-btn` | Botón «?» que abre una ayuda. |
| `hv` | `hover` | La pestaña que queda bajo el dedo al arrastrar por la barra. |
| `ic` | `icon-only` | Chip que solo lleva un icono. |
| `it` | `item` | Fila de una lista. |
| `md` | `medal` | Medalla de un logro. |
| `mx` | `menu-close` | Botón de cerrar el menú flotante. |
| `mi` | `menu-item` | Opción del menú flotante. |
| `mc` | `muscle-chip` | Músculo que trabaja un ejercicio, en su ficha. |
| `mu` | `muted` | Texto secundario, atenuado. |
| `hd` | `page-head` | Cabecera de una pantalla: el título y sus botones. |
| `pz` | `paused` | El WOD está en pausa. |
| `pb` | `player-bar` | Barra de abajo del entreno: anterior, pausa y siguiente. |
| `pr` | `primary` | Botón principal de una pantalla o de un aviso. |
| `rm` | `reduce-motion` | Animaciones reducidas (va en `<html>`). |
| `rs` | `rest-day` | Día de descanso, al montar un programa. |
| `rr` | `rest-row` | Fila del descanso entre series. |
| `ph` | `section-label` | Rótulo de una sección, en mayúsculas pequeñas. |
| `s2` | `seg-2` | Selector de dos opciones. |
| `sl` | `series-label` | Rótulo de una serie enlazada («SERIE A»). |
| `r2` | `set-row` | Fila de una serie: número, anterior, peso, repeticiones y hecho. |
| `sr` | `setting-row` | Fila de Ajustes. |
| `sp` | `sheet` | Hoja: el panel que sube desde abajo. |
| `st` | `stats` | Fila de tres cifras (ejercicios, series y minutos). |
| `sb` | `sticky-btn` | Botón fijo en la parte de abajo de la pantalla. |
| `tg` | `tag` | Etiqueta. |
| `tq` | `technique` | Botón de una serie con técnica de intensidad. |
| `th` | `thumb` | Miniatura de un ejercicio. |
| `td` | `today` | Hoy, en los puntos de la semana. |
| `tz` | `touch-target` | Agranda la zona que se puede tocar de un botón pequeño. |
| `nw` | `unread` | Respuesta que aún no se ha leído. |
| `vh` | `visually-hidden` | Texto que solo leen los lectores de pantalla. |
| `wk` | `week-nav` | Fila para pasar de una semana a otra. |
| `mb` | `wide-btn` | Botón a lo ancho, con icono y texto (un programa, una opción de una hoja). |

### Segundo lote: las piezas comunes, el entreno, la librería, los programas y la descarga

| Antes | Ahora | Qué es |
| --- | --- | --- |
| `arw` | `arrows` | Flechas animadas de una serie enlazada. |
| `cal` | `calendar` | Rejilla del calendario. |
| `chs` | `chip-row` | Fila de chips que se desliza a los lados. |
| `psel` | `chip-select` | Desplegable con forma de chip. |
| `cps` | `choices` | Grupo de chips para elegir una respuesta. |
| `cpr` | `create-day` | Día del programa que se está creando. |
| `cpe` | `create-exercises` | Ejercicios de ese día, en dos líneas como mucho. |
| `cpi` | `create-icon` | El icono de esa opción. |
| `cpm` | `create-move` | Botones para subir o bajar un día. |
| `cpo` | `create-option` | Opción grande al crear un programa. |
| `cpw` | `create-routine` | Workout que se puede elegir al crear un programa. |
| `cur` | `current` | La serie en curso. |
| `cyn` | `cycle-note` | Nota de un programa en ciclo. |
| `dys` | `days` | Tira de los siete días de la semana. |
| `dlc` | `deload-advice` | Tarjeta que aconseja una descarga. |
| `dl2` | `deload-box` | Aviso de la semana de descarga. |
| `dlc2` | `deload-box-slim` | Ese aviso, en una línea. |
| `dlb` | `deload-btn` | Botón que explica la descarga. |
| `dln` | `deload-every` | Fila «Cada N semanas». |
| `dlh` | `deload-hint` | Nota sobre la descarga. |
| `dli` | `deload-icon` | Icono de la descarga. |
| `dlbig` | `deload-icon-big` | Ese icono, en grande. |
| `dlw2` | `deload-intro` | Presentación de la semana de descarga. |
| `dlp` | `deload-primary` | Botón principal de la descarga. |
| `dlo` | `deload-skip` | Botón «Omitir esta descarga». |
| `dls` | `deload-skip-slim` | Ese botón, pequeño. |
| `dlt` | `deload-tags` | Lo que cambia esa semana, en etiquetas. |
| `wkdl` | `deload-week` | La semana en curso es de descarga. |
| `dlv` | `deload-weight` | Peso rebajado por la descarga. |
| `dgb` | `dialog-backdrop` | Fondo oscuro detrás de esa ventana. |
| `dgc` | `dialog-box` | Ventana de un aviso o de una pregunta. |
| `exc` | `exercise-cell` | Celda de un ejercicio en una lista: miniatura y texto. |
| `ovx` | `exercise-row` | Fila de un ejercicio con su miniatura (vista previa del día, constructor de workouts). |
| `xsm` | `exercise-summary` | Resumen de un ejercicio plegado. |
| `ext` | `exercise-text` | Nombre y detalles de un ejercicio, en las listas. |
| `exth` | `exercise-thumb` | Miniatura pequeña de un ejercicio, en las listas. |
| `xtl` | `exercise-tools` | Fila de herramientas de un ejercicio: consejo, notas, tempo y descanso. |
| `btnl` | `file-btn` | Botón para elegir un archivo. |
| `eqd` | `filter-box` | Un filtro desplegable (material o grupo muscular). |
| `eqb` | `filter-btn` | Botón que abre el filtro. |
| `eqf` | `filter-foot` | Pie del panel: borrar y listo. |
| `eqg` | `filter-grid` | Rejilla de esas opciones. |
| `eqi` | `filter-option` | Una opción del filtro. |
| `eqp` | `filter-panel` | Panel con las opciones del filtro. |
| `eqrow` | `filter-row` | Fila con los filtros de la librería. |
| `fdb` | `fold-btn` | Botón de plegar o desplegar un ejercicio. |
| `hwa` | `howto-anatomy` | Anatomía, en «Cómo se hace». |
| `hwh2` | `howto-hint` | Nota «Toca la figura para ver cómo se hace». |
| `hwp` | `howto-text` | Texto de «Cómo se hace». |
| `hwt` | `howto-title` | Título de «Cómo se hace». |
| `exr` | `item-split` | Fila de una lista en dos columnas: el contenido y, a la derecha, un valor o un botón. |
| `lvb` | `level-backdrop` | Fondo que cierra el menú de niveles. |
| `lvc` | `level-caret` | Flecha de esa píldora. |
| `lvd` | `level-dot` | Punto de color de un nivel. |
| `lvm` | `level-menu` | Menú de niveles. |
| `lvn` | `level-note` | Explicación del nivel elegido. |
| `lvi` | `level-option` | Un nivel de ese menú. |
| `lvp` | `level-pill` | Píldora con el nivel actual. |
| `lvs` | `level-tabs` | Pestañas de nivel en la vista previa de un programa. |
| `lvt` | `level-tag` | Etiqueta con el punto y el nombre del nivel. |
| `lvw` | `level-wrap` | Contenedor del selector de nivel. |
| `mac` | `macros` | Rejilla de los tres macronutrientes. |
| `mbk` | `menu-backdrop` | Fondo que cierra el menú al tocarlo. |
| `msb2` | `menu-blur` | Desenfoque del fondo del menú. |
| `mci` | `menu-items` | Lista de las opciones del menú. |
| `msd` | `menu-panel` | El menú flotante. |
| `msb` | `menu-shade` | Sombra degradada del menú. |
| `mti` | `menu-title` | Rótulo «Menú». |
| `pgt` | `page-title` | Título de una página. |
| `pga` | `progress-axis` | Rótulos de los ejes de esa gráfica. |
| `pgs` | `progress-chart` | Gráfica de progreso de un ejercicio. |
| `pgsum` | `progress-summary` | Resumen de la tendencia, bajo la gráfica. |
| `pgt2` | `progress-total` | Cifra y fecha del punto elegido de la gráfica. |
| `hab` | `quick-add` | Fila de atajos para añadir comida. |
| `rgb` | `regenerate` | Chip «Volver a generar». |
| `wsr` | `rest-pill` | Píldora con el descanso que queda. |
| `rtc` | `rotation-card` | Tarjeta «Toca rotar los ejercicios». |
| `rtd` | `rotation-day` | Un día de esa rotación. |
| `rpxe` | `rpe-example` | Serie de ejemplo de esa explicación. |
| `rpxr` | `rpe-example-row` | Fila de esa serie. |
| `rpx` | `rpe-help` | Explicación del RPE. |
| `rpxl` | `rpe-levels` | Lista de los niveles del RPE. |
| `rpxs` | `rpe-scale` | La escala del RPE, dibujada. |
| `seg` | `segmented` | Selector de varias opciones en una fila. |
| `wsk` | `session-head` | Cabecera fija del entreno en curso. |
| `wsn` | `session-now` | Línea con el ejercicio y la serie en curso. |
| `thd` | `set-head` | Cabecera de la tabla de series. |
| `wk2` | `set-kind` | Botón con el tipo de serie: de trabajo o con una técnica. |
| `pgsx` | `sex-card` | Tarjeta «¿Hombre o mujer?». |
| `spu` | `sheet-under` | Copia de la hoja que se queda debajo mientras entra otra página. |
| `sug` | `suggested` | Peso sugerido, aún sin confirmar. |
| `sgb` | `suggestion` | Sugerencia de progresión bajo un ejercicio. |
| `dlsg` | `suggestion-deload` | Esa sugerencia, en semana de descarga. |
| `swb` | `swatch` | Un color de acento. |
| `swg` | `swatch-grid` | Rejilla de los colores de acento. |
| `tqa` | `technique-code` | Siglas de una técnica de intensidad. |
| `tql` | `technique-list` | Lista de las técnicas de un programa. |
| `tst` | `toast` | Aviso breve que aparece arriba. |
| `tsu` | `toast-undo` | Botón «Deshacer» de ese aviso. |
| `wup` | `warmup` | Series de calentamiento. |
| `wkc` | `week-card` | Tarjeta «Esta semana». |
| `wkd` | `week-dots` | Sus siete puntos. |
| `wkn` | `week-note` | Nota de esa tarjeta. |
| `wks` | `week-stats` | Racha y entrenos de la semana. |

### `pgr`: una clase que eran dos

`pgr` se usaba para dos cosas, la fila con el nombre de un programa y la etiqueta «RÉCORD» de la gráfica de progreso, y sus dos
estilos se mezclaban: los nombres de los programas salían en el color de acento y con las letras separadas, que es como va la
etiqueta. Se separaron a mano, y aquí sí cambia lo que se ve (lo decidió el propietario): el nombre de un programa va como el
resto de títulos. En el mapa solo está la primera línea: la etiqueta no llegaba a salir.

| Antes | Ahora | Qué es |
| --- | --- | --- |
| `pgr` | `program-row` | Fila con el nombre de un programa y su nivel. |
| `pgr` | `record-tag` | Etiqueta «RÉCORD», junto a la cifra de la gráfica de progreso. |

### Sin renombrar todavía

- Las de **las figuras** (`fgs`, `hwf`, `anf`…): las reescribe la solicitud de las figuras nuevas (#59).
