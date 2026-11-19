# Clases CSS

Cómo se nombran las clases CSS y cómo se llamaban las que han cambiado de nombre. Sirve para escribir código nuevo y para leer
código, issues o commits anteriores.

Hasta la V1.0.32 casi todas las clases tenían de dos a cuatro letras (`cd`, `it`, `mu`, `sp`). Con las acciones y las claves del
estado se hizo lo mismo en la V1.0.2 ([Nombres de la V1.0.2](nombres.md)); las clases eran lo que quedaba. Se renombran por
lotes: el primero, las 53 de dos letras.

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
selectores de `querySelector`, `closest` y `matches`. Lo que no puede decidir lo dice, con su archivo y su línea, y no lo toca:

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

## Clases renombradas en la V1.0.32

Primer lote: las de dos letras. El mapa está en [`tests/clases-1.0.32.txt`](../../tests/clases-1.0.32.txt).

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
