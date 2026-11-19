# Tipos comprobados

El código de la app es JavaScript y sigue siéndolo. Desde la V1.0.32, `node tools/types.js` comprueba los tipos de todos los
módulos con el comprobador de TypeScript (el paquete `typescript`, que ya usaban el formateador y las reglas de calidad). Va en
`bash tests/run.sh` y, por tanto, en GitHub: si falla, la solicitud de fusión sale en rojo.

No cambia la app. Los tipos van en comentarios y en archivos que no entran en la compilación: al añadirlos, la app compilada
salió idéntica, byte a byte, a la de antes.

## Qué detecta

- Una clave de `S` o de `W` que no existe (`S.selectedDia`) o con un valor de otro tipo (`S.week = 'tres'`).
- Un campo que no existe en un dato (`entreno.volumen`).
- Una función llamada con lo que no es (`Store.set('clave', 5)`, `hashText(7)`).
- Un nombre que no existe, una propiedad mal escrita, una variable local sin usar, una función que a veces no devuelve nada.
- En los módulos con el nivel estricto, además: cualquier cosa sin tipo, y usar algo que puede ser `null` o `undefined` sin
  mirarlo antes.

Cuando falla, dice el archivo, la línea y el motivo: `src/js/workout/week.js:66  TS2551  Property 'selectedDia' does not exist
on type 'State'. Did you mean 'selectedDay'?`

## Dónde están los tipos

| Dónde | Qué |
| --- | --- |
| `src/types/state.d.ts` | La forma de `S`, de `W` y de sus datos (un entreno, un día del plan, un alimento…). Dice lo mismo que [estado.md](estado.md), pero comprobable. |
| `src/types/sync.d.ts` | Lo del guardado por partes y la sincronización: las huellas, los documentos de la nube, lo sincronizado (`SyncMeta`) y la sesión de la cuenta. |
| `src/types/globals.d.ts` | Lo que el comprobador no puede saber por el código: lo que la app deja en `window`, lo del navegador que TypeScript no trae y cómo tratar los elementos de la página. |
| En cada módulo | Comentarios JSDoc: `@param`, `@returns` y `@type` encima de una función o de una variable, y `/** @type {X} */ (expresión)` para decir de qué tipo es algo que el comprobador no puede deducir. |

## Dos niveles

- **Básico**, en todos los módulos: se comprueba todo lo que tiene tipo, declarado o deducido. Lo que no lo tiene (un parámetro
  sin anotar) vale para cualquier cosa.
- **Estricto**, en los módulos de la lista `STRICT` de `tools/types.js`: todo tiene que tener tipo, y lo que puede ser `null` o
  `undefined` hay que mirarlo antes de usarlo. Lo tienen los nueve del guardado y la sincronización, donde un descuido cuesta
  datos: `core/store`, `core/idb`, `core/parts`, `core/schema`, `core/state`, `core/persist`, `cloud/merge`, `cloud/docs` y
  `cloud/sync`.

`node tools/types.js --resumen` dice cuántos avisos daría el nivel estricto en cada módulo que aún no lo tiene, del que menos al
que más. Al añadir los tipos eran unos 3.500 en 107 módulos (16 ya no daban ninguno): casi todos, parámetros sin anotar.

## Criterios

- **Los elementos de la página valen por cualquier elemento.** El comprobador no puede saber qué etiqueta hay detrás de un id o
  de un selector (un `<input>` con su `.value`, un `<details>` con su `.open`), así que `$`, `getElementById`, `querySelector` y
  el `target` de un evento no se comprueban. Lo que se comprueba es lo que la app hace con sus datos.
- **Un `Html` es texto.** `html` y `raw()` (`core/html`) dan un texto para el comprobador: se concatena y se asigna como texto.
- **Restar fechas no es un error.** En JavaScript da los milisegundos entre las dos; TypeScript lo rechaza, y `tools/types.js`
  quita ese aviso cuando lo que se resta es una fecha (con cualquier otra cosa, avisa).
- **Lo escrito en un formulario** (el peso y las repeticiones de una serie, los datos biométricos) puede ser un número o el
  texto de su casilla: en los tipos vale por cualquier cosa, y se convierte al usarlo.
- **Sin `@ts-ignore`.** Si el comprobador avisa, se anota el tipo que falta o se dice con un `@type` qué es aquello. Un
  `@type {any}` deja de comprobar esa expresión: se usa donde el tipo de verdad no aporta nada (una tabla de textos y números
  para un CSV) o donde JavaScript convierte solo y se quiere así (comparar un número con el texto de un `dataset`).
- **El `@type` de una expresión va justo delante de su paréntesis**, y no detrás de un operador (`+`, `!`): ahí el formateador
  lo pierde.

## Al cambiar código

1. Una clave nueva de `S`: en `src/types/state.d.ts`, en `core/schema` (su clave guardada) y en [estado.md](estado.md).
2. Una función nueva en un módulo estricto: sus parámetros, con `@param`.
3. `node tools/types.js` (va también en `bash tests/run.sh`).

Para pasar otro módulo al nivel estricto: se añade a `STRICT`, se arregla lo que salga y se comprueba que la app compilada no
cambia si solo se han tocado comentarios.

## Por dónde seguir

Avisos del nivel estricto que quedan, por zonas (de `--resumen`, al añadir los tipos):

| Zona | Módulos | Avisos |
| --- | --- | --- |
| `cloud` (lo que falta: red, sesión, copia en la nube…) | 7 | 77 |
| `account` | 4 | 110 |
| `dashboard` | 5 | 126 |
| `nutrition` | 7 | 164 |
| `library` | 7 | 227 |
| `profile` | 6 | 244 |
| `system` | 12 | 279 |
| `programs` | 5 | 308 |
| `core` (lo que falta: pintar, eventos, reparar el estado…) | 20 | 441 |
| `workout` | 17 | 538 |
| `extras` (figuras, WOD, alimentos en internet…) | 14 | 862 |

El orden que más protege: lo que queda de `cloud` y `core/repair` (lo que valida los datos al arrancar y tras sincronizar), después
`workout` (el entreno en curso y su guardado) y `nutrition`. Las pantallas, al tocarlas.

Y hay datos que hoy valen por cualquier cosa y se pueden precisar: lo de cardio y el resumen de un entreno (`c`, `x`), los
bloques de un workout propio (`bl`), las respuestas del creador guiado (`o`) y la configuración del WOD.
