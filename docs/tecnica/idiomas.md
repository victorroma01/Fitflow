# Idiomas

StrataFit está en **español** y en **inglés** (de Estados Unidos) desde la V1.0.4. El código y los datos siguen en español; el
inglés es una traducción que la app aplica al pintar. Este documento cuenta cómo está hecho, cómo se añade una frase y qué se
comprueba. Lo que ve el usuario está en [Perfil y Ajustes](../funcional/perfil-y-ajustes.md#idiomas).

## Qué idioma sale

`core/util` lo decide al cargar y ya no cambia (`LANG`, `'es'` o `'en'`):

1. El elegido en **Ajustes → Idiomas**, que se guarda en el móvil (`localStorage`, clave `fflang`; no va con la cuenta: es de
   cada móvil, y se conserva al cerrar sesión).
2. Si no hay ninguno, el primero de los idiomas del móvil (`navigator.languages`) que sea español o inglés.
3. Si no hay ninguno de los dos, español.

Cambiarlo en Ajustes recarga la app. `LOCALE` (`'es'` o `'en-US'`) es la región con la que se escriben las fechas y los números.

La plantilla (`src/index.html`) hace la misma cuenta antes de que cargue el código, con las mismas reglas, para tres cosas que no
pueden esperar: `<html lang>`, los rótulos de la barra de pestañas y la pantalla de error del arranque, que está escrita en los dos
idiomas. En el paquete cambia además el manifiesto por `manifest.en.webmanifest` (los accesos directos del icono, en inglés),
que `build.py` compone del español (`manifest_en`, con los textos de `MANIFEST_EN`). `tests/english.py` comprueba que la página y
la app deciden lo mismo.

## Cómo se traduce

**El español es la clave.** No hay identificadores de frase: el diccionario es un mapa español → inglés, y una frase que no está
sale en español. Así el código se lee igual que antes y en español no cambia nada: ni se carga el diccionario ni se busca en él.

En inglés, `core/boot` carga el diccionario (`loadEnglish`, en `core/lazy`) antes del primer pintado; si no carga, la app abre en
español. Son cinco módulos de `src/js/i18n` que se apuntan solos con `addEnglish`:

| Módulo | Qué lleva |
| --- | --- |
| `en-ui` | Las frases de la interfaz. |
| `en-library` | Los ejercicios, los grupos, el material y los músculos. |
| `en-foods` | Los alimentos y sus grupos. |
| `en-programs` | Los programas, sus días y sus descripciones. |
| `en-more` | Lo que el código compone de un modo que la herramienta no ve (más abajo). Se escribe a mano. |

Aparte va `en-exinfo`, el catálogo de consejos y ejecución en inglés (525 ejercicios), que se carga en lugar de `data/exinfo` la
primera vez que se abre una ficha.

La traducción se hace en la plantilla, `core/html`:

- **Una plantilla ``html`…` ``**: cada trozo de texto entre dos etiquetas y cada atributo que se lee (`aria-label`, `placeholder`,
  `title`, `alt`) es una frase. Los valores van como `{0}`, `{1}`…: «Te quedan `${n}` series» se busca como «Te quedan {0}
  series», y la traducción puede cambiarlos de sitio. La lectura de cada plantilla se hace una vez y se guarda.
- **Un valor** que es una frase del diccionario sale traducido si va donde se lee (el nombre de un ejercicio, un rótulo que una
  función recibe). **Nunca** en un `value`, un `data-…`, una clase ni dentro de un `<textarea>`: los datos siguen en español.
- **``say`…` ``** es lo mismo para un texto que no es HTML: ``say`Ronda ${r} de ${n}` ``. Sustituye a las sumas de textos
  (`'Ronda ' + r + ' de ' + n`), que no se pueden traducir a trozos. No se usa al cargar un módulo: el diccionario aún no está.
- **`tr(texto)`** traduce una frase suelta; **`trAs(contexto, texto)`**, una que se dice distinto según de qué se hable
  («Volumen», objetivo de la dieta o kilos movidos: se busca antes «objetivo:Volumen»); **`listAnd`** une una lista («a, b y c»,
  “a, b, and c”) y **`commas`** (de `core/html`), otra con comas.

Cuando la frase tal cual no está, `tr` prueba sin los espacios de los lados, con los números como `#` («3 series» → «# series»),
por partes unidas con « · » y como lista con comas. Esas frases con `#` son las de `en-more`.

**Lo que no pasa por una plantilla** hay que traducirlo donde se escribe, con `tr()`: `e.textContent = tr('Guardando…')`, el
texto de un lienzo (la imagen para compartir un entreno), el PDF del análisis, un archivo `.ics` o el nombre de un archivo.

## Lo que se guarda no depende del idioma

Lo que la app guarda va **siempre en español**: los nombres de los ejercicios y de los alimentos, el título y el resultado de un
cardio o de un WOD («WOD · AMRAP 12 min», «5 rondas + 7 reps»). Se traduce al enseñarlo. Así una cuenta se puede usar en un
móvil en español y en otro en inglés, y lo guardado antes de la V1.0.4 se ve en inglés sin tocarlo. Por eso lo que se guarda no
se compone con `say` ni con `tr`.

La excepción es lo que es del usuario desde el principio: el nombre que se propone para un workout o un programa nuevos («Mi
workout 1», “My workout 1”) o para un plato, que él puede cambiar y que se queda como lo dejó.

Tampoco se traduce el **informe de Diagnóstico** (ni los datos técnicos que acompañan a un fallo enviado): lo lee quien arregla
la app. Ni el nombre del archivo de la copia de seguridad, que es siempre el mismo para que cada copia sustituya a la anterior.

## Añadir o cambiar una frase

1. Escribe el código en español, como siempre.
2. `node tools/i18n.js --check` dice qué falta: la herramienta saca del código las frases que la app va a buscar, con las mismas
   claves (lee las plantillas con las funciones de `core/i18n`), y las compara con el diccionario.
3. `node tools/i18n.js --todo` las escribe numeradas en `/tmp/i18n/todo.txt`. En otro archivo, una línea por frase,
   «número ⇥ inglés»; «número ⇥ =» si en inglés es igual y «número ⇥ !» si no se enseña (un texto del registro de errores, una
   clave). Esas dos se apuntan en `tools/i18n-skip.json` para no volver a preguntar.
4. `node tools/i18n.js --apply archivo módulo` las pone en `en-módulo.js` (`ui`, `library`, `foods`, `programs`).
5. `node tools/i18n.js --prune` quita las que el código ya no busca.

Lo que la herramienta no ve en el código va a mano en `en-more.js`: una frase con un número («# series»), una palabra suelta en
minúsculas que se junta con otra («pendiente») y las que llevan contexto («objetivo:Volumen»). Las encuentra `tests/english.py`,
que pasea la app en inglés.

Además de lo que falta, `--check` avisa de lo que no se traduciría:

- un texto escrito en la página sin plantilla y sin `tr()` (`e.textContent = 'Texto'`);
- una plantilla con texto al cargar un módulo;
- un `raw()` dentro de una etiqueta (una clase, un atributo) cuyo texto es una frase del diccionario: `raw` la traduciría;
- una traducción que pierde un valor (`{0}`), un número (`#`) o una etiqueta, o que lleva comillas rectas.

**Cómo se traduce**: inglés de Estados Unidos; los nombres de los ejercicios, con mayúscula solo al principio («Bench press»);
comillas “ ” donde el español lleva « »; unidades métricas; «Workout» para entreno, «Sets» para series, «Rest» para descanso,
«PR» para récord, «Logs» para Registros. Cada idioma se llama como en su idioma («Español», «English»).

## La nota de cada versión

`CHANGELOG.md` sigue siendo el historial, en español. Lo que la app enseña en inglés (el aviso de versión nueva, las novedades
tras actualizar y Ajustes → Ver nota de actualización) está en **`CHANGELOG.en.md`**: la misma entrada, con su titular y sus
apartados (*What's new*, *Improvements*, *Fixes*). `build.py` (`english`) la mete en `data/release` y en `version.json` como
`en`, al lado de la española, y la app enseña una u otra (`notesOf`, en `system/updates`). La compilación se detiene si la
versión de `APPV` no tiene su entrada en inglés o si no dice lo mismo que la española (los mismos apartados, con los mismos
puntos). Las versiones anteriores a la 1.0.4, que no tenían inglés, se enseñan en español.

## Lo propio del inglés

- Fechas con `LOCALE` (`Mon, Oct 26`). Los números, en los dos idiomas, con punto decimal y sin separador de miles (desde la
  V1.0.4 también el análisis mensual, `fmtN`, y el espacio de Diagnóstico); los CSV en español, con coma decimal para Excel.
- El buscador de ejercicios y el de alimentos encuentran también por el nombre en inglés, y la lista de alimentos se ordena por
  el nombre que se ve. Un ejercicio propio no puede llamarse como uno de la librería se llama en inglés.
- Los CSV, con coma de separador y punto decimal, y sus cabeceras en inglés.
- Open Food Facts: se pide y se prefiere el nombre del producto en inglés.

## Pruebas

| Prueba | Qué comprueba |
| --- | --- |
| `node tools/i18n.js --check` | Que no falta ni sobra ninguna frase, y los avisos de arriba. |
| `tests/i18n.test.mjs` | `core/i18n` y `core/html` sin navegador: qué se traduce de una plantilla y qué no, `say`, `tr`, `trAs` y las listas; que en español todo sale como está escrito. |
| `tests/exinfo.test.mjs` | Que el catálogo de consejos en inglés tiene los 525 ejercicios, con sus tres campos, y está en inglés. |
| `tests/english.py` | En el navegador: qué idioma sale con cada móvil y con cada elección; Ajustes → Idiomas; las 107 pantallas en inglés, y otras doce que solo salen en ciertos momentos (el reloj de un WOD, la bienvenida, la entrada sin sesión), sin un texto en español a la vista; lo propio del inglés (fechas, buscadores, consejos, nota de la versión, CSV, PDF, imagen para compartir, recordatorio del calendario y nombres de archivo); que con los mismos pasos se guarda lo mismo en los dos idiomas; y que en español no cambia nada. |
| `tests/deploy.py` | En el paquete: el manifiesto en inglés, y que el diccionario va aparte y en español no se descarga. |
| `tests/layout.py` y `tests/a11y.py` con `SF_LOCALE=en-US` | Con los textos en inglés: ningún desborde ni texto cortado en los cinco tamaños de pantalla, y los nombres, los roles y las zonas táctiles de cada control. |
| `tests/changelog.py` | Que la nota en inglés de la versión dice lo mismo que la española. |

`tests/english.py` reconoce el español por las palabras de la propia app: las de las frases del diccionario que no salen en
ningún texto en inglés. Lo que escribió el usuario (aquí, los datos de prueba) no cuenta.

Todas las demás pruebas abren la app con el navegador en español (`tests/browser.py`).
