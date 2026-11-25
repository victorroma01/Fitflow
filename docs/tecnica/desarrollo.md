# Desarrollo

## Requisitos

Python 3.10 o más, Node 18 o más y, para las pruebas, Playwright.

```bash
npm install                                   # esbuild y typescript (compilar, comprobaciones y formato) y acorn (comprobaciones)
pip install -r tests/requirements.txt
python -m playwright install chromium webkit
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `python3 build.py` | Compila `dist/app/` (lo que se publica) y `dist/stratafit.html` (archivo único). |
| `python3 build.py --check` | Además pasa las reglas de `tools/check.js`. |
| `python3 build.py --emulador` | Solo el archivo único, en `dist/emu/`, conectado al emulador de Firebase de este ordenador (pruebas de la nube). |
| `python3 build.py --appcheck` | Solo el archivo único, en `dist/appcheck/`, con App Check configurado con valores de prueba y la CSP que eso abre (lo usa `tests/cloud.py`). |
| `npm run format` | Formatea JS y CSS, reparte en líneas las [plantillas HTML](#plantillas-html) que no caben en una, y pone al día la línea «Define:» de cada módulo y el [mapa de módulos](modulos.md). |
| `node tools/types.js` | Comprueba los tipos de todos los módulos ([Tipos comprobados](tipos.md)); con `--resumen`, lo que le falta a cada módulo para el nivel estricto. |
| `cd tools/figuras3d && node datos.mjs N && python3 pagina.py` | La página de revisión de un lote de [figuras de ejercicio](figuras.md) (y, antes, sus pruebas: ver `tools/figuras3d/README.md`). |
| `node tools/i18n.js --check` | El inglés: qué frases faltan en el diccionario, cuáles sobran y qué no se traduciría. Con `--todo`, `--apply` y `--prune` se añaden y se quitan ([Idiomas](idiomas.md#añadir-o-cambiar-una-frase)). |
| `bash tests/run.sh` | Formato, reglas, tipos, mapa de módulos y todas las pruebas. |
| `python3 tests/syncfuzz.py dist/stratafit.html 20-200 80` | Pruebas al azar del guardado y la sincronización con otras semillas que las de la batería ([cómo son](pruebas.md#pruebas-al-azar-del-guardado-y-la-sincronización)). |
| `bash tests/compare.sh vieja.html nueva.html` | Compara el comportamiento y la imagen de dos compilaciones. |
| `npx firebase emulators:exec --only auth,firestore --project demo-stratafit "node --test tests/rules.test.mjs"` | Prueba las reglas de Firestore con el emulador (necesita Java y `npm install --no-save firebase-tools@15`). |
| `node tools/rename.js mapa.txt` | Renombra globales (líneas «viejo nuevo») entendiendo ámbitos. |
| `node tools/classes.js --check` | Comprueba que toda clase CSS que usan el código y las pruebas existe en `src/css`. Con un mapa (`node tools/classes.js mapa.txt`, líneas «K viejo nuevo»), renombra clases en los estilos, el código, las pruebas y la documentación: [Clases CSS](clases.md). |
| `node tools/same.js --dirs antes/ despues/` | Demuestra que un cambio de formato no altera el programa. Con `--html`, las plantillas HTML cuentan sin sus saltos de línea. |
| `python3 tools/pages.py copiar` | Copia `dist/app/` a la raíz (solo si GitHub Pages volviera a publicar desde la rama). |

## Añadir una función

1. Crea `src/js/<área>/<nombre>.js` con su cabecera (`/* ═══ área/nombre ═══ qué hace … Define: … */`), sus `import` y sus
   `export const` / `export function`. Los manejadores (`A.miAccion = …`) van en el mismo archivo y el HTML, con
   [plantillas ``html`…` ``](#plantillas-html).
2. Impórtalo en `src/js/main.js` antes de `core/boot.js`. Si es algo poco usado, en lugar de eso cárgalo desde `core/lazy`.
3. Si guarda datos nuevos, documenta la clave en [estado.md](estado.md), dale su tipo en `src/types/state.d.ts`
   ([Tipos comprobados](tipos.md)), valídala en `core/repair` (al arrancar y tras cada
   sincronización) y decide dónde va: con la cuenta (se sincroniza sola, en `data/core`), en el perfil (preferencias: `PREF_KEYS`
   de `cloud/docs` y `firestore.rules`) o solo en el dispositivo (`LOCAL_ONLY` de `cloud/docs`).
   Lo que se guarde fuera de `S` y sea de los datos (como lo sincronizado, `ffsync`, o el entreno en curso, `ffw`) se escribe
   solo si `staleNow()` (`core/persist`) dice que esta apertura de la app no se ha quedado atrás
   ([la app abierta dos veces](estado.md#la-app-abierta-dos-veces)).
4. Si cambia lo que se guarda en Firestore (un documento o un campo nuevo), cambia también `firestore.rules` y su prueba,
   `tests/rules.test.mjs`.
5. Si el usuario lo ve, descríbelo en la [documentación funcional](../funcional/README.md) y tradúcelo: `node tools/i18n.js
   --check` dice qué frases faltan en inglés ([Idiomas](idiomas.md#añadir-o-cambiar-una-frase)). Un texto compuesto se escribe
   con ``say`…` ``, no sumando trozos, y lo que se guarda va siempre en español.
6. `npm run format` y `bash tests/run.sh`.

## Plantillas HTML

Una pantalla es una plantilla ``html`…` `` (`core/html`), que escapa cada valor que se inserta. Una plantilla que no cabe en
una línea se escribe en varias, con cada etiqueta sangrada según lo que contiene, como se escribe el HTML:

```js
return html`
  <div class="card">
    <div class="row"><b>Agua</b><b>${v / 1000} / ${g / 1000} L</b></div>
    <div class="grid-2 cols-3">
      <button data-a="addWater" data-i="250">+250 ml</button>
      <button data-a="addWater" data-i="500">+500 ml</button>
    </div>
  </div>`;
```

**La regla.** Dentro de una plantilla ``html`…` ``, un salto de línea, con los espacios que lo rodean, no forma parte del HTML:
solo ordena el código. Si hace falta un espacio, va dentro de la línea. La única excepción es dentro de una etiqueta, donde un
salto de línea separa dos atributos, como el espacio que habría entre ellos.

No hace falta colocar nada a mano: `npm run format` reparte las plantillas que pasan de 140 columnas y deja enteras las que
caben. Lo que hace:

- Un elemento que no cabe pone cada hijo en su línea, sangrado; el que cabe se queda entero.
- Una etiqueta que no cabe sigue en la línea siguiente, entre dos atributos, sangrada el doble que un hijo.
- Una frase (un texto con los `${…}` y las etiquetas de texto, como `<b>` o `<span>`, que lleva al lado) va entera en una
  línea. Un texto no se puede partir, porque un salto de línea no es un espacio: si es largo, su línea se pasa de ancho.
- Las plantillas de dentro de un `${…}` se reparten igual, sangradas respecto a la línea en la que empieza ese `${…}`.
- Si a una plantilla repartida le sigue más código (`` ` : otraCosa ``), su `` ` `` de cierre va en una línea propia.

**Lo que se rechaza.** Un salto de línea donde quien lee esperaría un espacio y no lo habría: entre dos palabras, entre un texto
y el `${…}` o la etiqueta de texto que lleva al lado, dentro del valor de un atributo, o detrás de un espacio. `build.py` y
`npm run format` se paran ahí con el archivo y la línea. Así, lo que se ve separado en el código nunca sale unido en la pantalla.

**Por qué no cambia la app.** `build.py` compila una copia del código con cada plantilla en una línea
(`tools/templates.js --flat`), así que la app compilada es la misma, byte a byte, se escriba una plantilla en una línea o en
veinte. El formateador, antes de guardar un módulo, comprueba que con las plantillas en una línea es el mismo código que recibió.
Los saltos de línea de una plantilla sin la etiqueta `html` (un texto, un CSV) sí cuentan, como en cualquier JavaScript.

## Programas, técnicas y catálogo de ejercicios

- **Programas predefinidos** (`data/library`, `PROGRAMS`): cada día es `Nombre:ejercicio,ejercicio…` y cada ejercicio
  `Nombre*series/repeticiones@descanso~técnica`, con `+` delante para unirlo al anterior en un bloque. La técnica es una de
  `data/techniques` (`~DS`) o la del intermedio y la del avanzado (`~DS/MYO`, `~/CL`: sin técnica en intermedio). Un programa nuevo
  va al final de la lista (los índices ya guardados en `S.prog` no se mueven), con su nota en `PROGRAM_NOTES`, sus días por nivel
  en `LEVEL_LAYOUTS` y, si es preferente para un sexo, en `PROGRAM_PREF`.
- **Ciclos**: un programa de 7 días es la semana; uno de otra longitud es un ciclo que no se corta (`workout/week`). Todo lo que
  depende del día de la semana pasa por `planIndex` (Workout, Nutrición, Dashboard).
- **Rotación** (`data/rotation`): grupos de variantes del mismo movimiento; cada ejercicio, en un grupo como mucho, y los básicos,
  en ninguno.
- **Catálogo** (`data/exinfo`): una línea por ejercicio de la librería, `Nombre|consejo|cómo se hace`. Cada ejercicio nuevo
  necesita la suya, con textos propios: `tests/exinfo.test.mjs` falla si falta alguno o si dos se parecen demasiado.

## Fotos

- Portadas de día: `src/img/day/<clave>.jpg` y su orden en `src/img/day/order.txt`.

`build.py` las convierte en el módulo `data/media`: en el paquete son archivos que el service worker guarda para usar sin conexión; en
el archivo único van incrustadas.

Los ejercicios no llevan foto: su imagen es una [figura](figuras.md), que es código. Los otros nombres con los que se busca
un ejercicio están en `src/js/data/aliases.js`.

## Reglas de calidad

`tools/check.js` analiza todos los módulos como un solo programa y falla si encuentra cualquiera de estas cosas:

1. Errores de sintaxis.
2. Declaraciones de nivel superior repetidas entre módulos (los nombres son únicos en toda la app).
3. Identificadores sin declarar.
4. Algo que se ejecuta al cargar y usa un `const` o `let` que todavía no se ha ejecutado (orden de carga).
5. Manejadores `A` / `C` / `U` o iconos definidos dos veces.
6. `data-a` / `data-c` / `data-u` en el HTML sin su manejador.
7. Un orden de `main.js` que no empiece por `core/util` y acabe en `core/boot`.
8. Funciones reasignadas después de declararlas.
9. Importaciones incorrectas: lo usado de otro módulo tiene que importarse de su módulo, que lo exporta; nada importado sin usar, y
   ningún módulo asigna una variable de otro.
10. Botones sin nombre accesible.
11. **Código muerto**: declaraciones sin usar, exportaciones que nadie importa, acciones que nada lanza e iconos sin usar.
12. **CSS sin usar**: clases, ids y animaciones que no aparecen en el código ni en la plantilla.
13. **Estilos en línea** (`style="…"` o un `<style>` más): la política de seguridad no los deja (I-14). Lo fijo va en clases de
    `css/99-utilities` (una por declaración: `mt-12`, `w-full`, `c-at`…) o en una clase propia; lo que depende de un dato (el
    ancho de una barra, la foto de un día), en `data-style`, que aplica `core/dynstyle` con el CSSOM.

Las reglas 11 y 12 hacen que el código muerto se quite en cada versión, no solo en una limpieza. Una clase CSS o una acción que se
construye a trozos (`'an' + i`) no se ve como usada: se escriben enteras.

Aparte, `tools/types.js` comprueba los tipos de todos los módulos con el comprobador de TypeScript: una clave de `S` que no
existe, un valor de otro tipo, una función llamada con lo que no es ([Tipos comprobados](tipos.md)).

Y `tools/classes.js --check` es la regla 12 al revés: toda clase que el código pone o busca, y toda la que buscan las pruebas,
tiene que estar en `src/css`. Avisa de una clase mal escrita y de una renombrada que vuelve con su nombre viejo
([Clases CSS](clases.md)).

`tools/format.js` además rehace la línea «Define:» de la cabecera de cada módulo con lo que declara de verdad, y
`tools/modindex.js` copia las cabeceras al [mapa de módulos](modulos.md). Con `--check`, una cabecera o un mapa desfasados fallan
como un archivo sin formatear, igual que una [plantilla HTML](#plantillas-html) larga sin repartir en líneas.

## Ramas y publicación

- Cada cambio va en su rama y llega a `main` con una solicitud de fusión; GitHub Actions pasa las pruebas en Chrome y en Safari y
  compara con la versión anterior.
- Cada versión se desarrolla en su rama `desarrollo-X.Y.Z` (la V1.0.2, en `desarrollo-1.0.2`), que GitHub prueba en cada subida
  (las ramas `desarrollo-*`). No se fusiona ni se publica hasta que el propietario lo confirme.
- Los avances se siguen con los milestones de GitHub: los de la V1.0.0 (M0 a M8), «V1.0.1 · Correcciones y mejoras», «V1.0.2 ·
  Código y técnica», «App móvil» e «Ideas futuras».

### Publicar una versión

1. Sube la versión en `src/js/core/util.js` (`APPV`) siguiendo el [versionado semántico](https://semver.org/lang/es/).
2. Escribe su entrada en `CHANGELOG.md`: Novedades, Mejoras y Correcciones en frases cortas para el usuario; Interno para desarrollo.
   Y la misma, en inglés, en `CHANGELOG.en.md` (*What's new*, *Improvements*, *Fixes*): es lo que enseña la app en inglés
   ([Idiomas](idiomas.md#la-nota-de-cada-versión)). La compilación se detiene si falta una de las dos o si no dicen lo mismo.
3. `npm run format` y `bash tests/run.sh`.
4. Abre una solicitud de fusión y, cuando las pruebas estén en verde, fusiónala. Al llegar a `main`, GitHub Actions vuelve a probar en
   Chrome y Safari, crea la etiqueta `vX.Y.Z` con sus notas y publica la app; la app instalada enseña el aviso con las novedades.

**Una revisión** arregla una versión ya publicada sin ser otra versión. Se publica igual, con una diferencia: su número es el
de la versión con una **cuarta cifra** (1.1.0.1 es la primera revisión de la 1.1.0; 1.1.0.2, la segunda). Con eso `build.py` compone
una sola tarjeta (`cards`): los apartados de la revisión y, debajo, los de sus revisiones anteriores y los de la versión que revisa,
cada uno con el número de la suya; quien ya tenía la versión ve qué arregla la revisión, y quien llega de una anterior lo ve todo
una vez. El aviso de versión nueva compara todas las cifras (`isNewerVersion`): la 1.1.0.1 es posterior a la 1.1.0 y anterior a
la 1.1.1.

Las dos revisiones de la V1.0.3 son anteriores a esa regla. Se numeraron añadiendo una cifra al tercer número (1.0.31 y 1.0.32) y
lo dicen en su entrada del `CHANGELOG.md`, antes del primer apartado, con una línea que empieza por «Revisión de la [1.0.3]». La
1.0.32 no llegó a publicarse: pasó a ser la **1.0.4**. Desde ella, el aviso y `build.py` cuentan la 1.0.31 y la 1.0.32 como
1.0.3.1 y 1.0.3.2 (`isNewerVersion`, `version_key`). Pero la cuenta la hace la app que ya está en el móvil, y la 1.0.31
instalada solo compara tres números: para ella la 1.0.4 sería anterior (4 < 31) y no avisaría. Por eso `version.json` lleva en
`version` un texto que ese comparador ve como más nuevo y que se lee como la versión («1.0.4 de nov. 2026»; `legacy_version`,
en `build.py`) y, en `number`, la versión de verdad, que es la que miran la 1.0.4 y las siguientes. Hará falta mientras la
versión no sea posterior a la 1.0.31 también con tres números (lo será la 1.1.0). `tests/changelog.py` y `tests/aviso.test.mjs`
lo comprueban, y `tests/deploy.py`, que la app instalada anuncia la revisión de su propia versión.

GitHub Pages publica desde GitHub Actions (*Settings → Pages → Source*: **GitHub Actions**), así que el repositorio no guarda ninguna
copia compilada: lo publicado siempre sale del código de `main`. Si algún día se vuelve a *Deploy from a branch*, lo publicado sería
la raíz del repositorio: `python3 tools/pages.py copiar` pone ahí `dist/app/`, y GitHub Actions falla si falta o no coincide con la
app compilada.

### Firebase

El diseño, los documentos y la sincronización están en [Servidor: Firebase](backend.md). Para administrar las cuentas no hace falta
entrar en la consola: los flujos de GitHub Actions *Restablecer contraseña*, *Asignar rol* y *Comprobar Firebase* se lanzan desde
Actions (cuando están en `main`), y *Desplegar reglas* se lanza solo al publicar, antes de la app, cuando cambia `firestore.rules`
(también se puede lanzar a mano). Todos usan el secreto
`FIREBASE_SERVICE_ACCOUNT`; nunca guardes la clave en el repositorio.

**Orden al cambiar las reglas.** Desde la V1.0.2 (T-24), al fusionar en `main` GitHub Actions pasa las pruebas, mira si cambian
`firestore.rules` (o cómo se despliegan) y, si cambian, despliega primero las reglas (*Desplegar reglas*, llamado desde `pruebas.yml`)
y solo después publica la app. Si el despliegue falla, la app no se publica. Así, una app nueva que escribe un campo o un documento
nuevo nunca llega antes que las reglas que lo admiten. Lo que las reglas rechazan no se pierde (sigue en el móvil y la
sincronización lo reintenta), pero mientras tanto esa cuenta no sincroniza nada, así que queda un caso con orden propio:

- si la app nueva deja de escribir un campo, primero se publica la app y, cuando ya la tengan los móviles, las reglas que ya no
  lo admiten (otra fusión), porque las apps viejas lo siguen escribiendo hasta actualizarse.

Un campo nuevo que no sea imprescindible se puede escribir además aparte, sin que su rechazo pare la sincronización: es lo que hace
el sistema del móvil del perfil (`os`, V1.0.1: `syncDeviceOS` en `cloud/sync`).

### Cambios de datos de una versión a otra

Si una versión cambia algo de lo ya guardado (por ejemplo, un ejercicio de un programa que también está en el plan en marcha de
cada cuenta), el cambio va en `MIGRATIONS` de `core/repair`: una función por cambio, que se hace una sola vez por cuenta (`S.mv`
guarda cuántos se han hecho) al arrancar o tras sincronizar. Va al final de la lista, no puede depender de que otro haya ido bien y
lo que haga tiene que dejar el estado válido.

### Logo e iconos

El logo y todos los iconos salen de dos fuentes, `src/img/brand/fuente-claro.png` y `fuente-oscuro.png` (cuadradas, sin esquinas
redondeadas ni sombra). `python3 tools/marca.py` genera el icono de la app (el claro) y su versión adaptable de Android, el de la
pestaña del navegador con el tema oscuro, los iconos de los accesos directos (con los iconos de la app, en blanco sobre el azul del
logo) y el logo dentro de la app (`src/img/brand/logo-*.webp`, que `build.py` mete en `data/media` y usa `core/brand`). Con un logo
nuevo, se cambian las dos fuentes y se lanza de nuevo.

### Cómo llega una versión al móvil (service worker)

`static/sw.js` guarda la app en el móvil y la abre desde ahí, sin esperar a la red. Sus reglas, que `tests/deploy.py` comprueba:

- **Abrir**: sirve el documento guardado y, mientras, pide el de la red. Si ha cambiado, lo guarda con todo su código (nunca un
  documento sin su código, I-08) y avisa a la página, que enseña «Versión nueva» si el número es mayor. «Actualizar» pide la
  versión de la red (`?fresh=…`) y recarga.
- **Una copia por dirección**: todo se guarda y se busca por su dirección sin parámetros (`keyOf`). `./?a=peso` (un acceso
  directo del icono) y `./` son el mismo documento. Antes cada dirección dejaba su copia, y una vieja podía salir antes que la
  buena (SW1 de la [auditoría](auditoria-1.0.3.md)).
- **El código** (`js/…`, con nombres que cambian en cada versión) sale siempre de la caché. Al activarse una versión se conserva
  el código de la anterior (lo anota en `codigo-actual.json`, dentro de la caché) y se borra el de antes: la página que siga
  abierta con la versión anterior aún puede cargar lo que no había usado.
- **Al activarse** también borra las cachés antiguas y cualquier copia guardada con parámetros (las del service worker de
  hasta la V1.0.2): así se arregla solo un móvil que se quedó con una.

Si cambia el service worker, la prueba tiene que seguir actualizando desde el anterior publicado: `tests/sw-anterior.js` es el
de hasta la V1.0.2; al cambiar el de la V1.0.3, se añade este como otro punto de partida.

### Paso de la 1.24.0 a la 1.0.0

La numeración empieza de nuevo en la 1.0.0. Un móvil con la 1.24.0 la recibe igual: su service worker guarda el documento nuevo en
cuanto lo ve cambiado y la siguiente apertura ya es la 1.0.0, que enseña sus novedades. Lo único que no sale es el aviso «Nueva
versión disponible» de la 1.24.0, porque compara números y 1.0.0 es menor que 1.24.0. `tests/deploy.py` lo comprueba publicando
una versión con un número menor.
