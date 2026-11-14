# Desarrollo

## Requisitos

Python 3.10 o más, Node 18 o más y, para las pruebas, Playwright.

```bash
npm install                                   # esbuild (compilar), typescript y acorn (comprobaciones y formato)
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
| `npm run format` | Formatea JS y CSS, pone al día la línea «Define:» de cada módulo y el [mapa de módulos](modulos.md). |
| `bash tests/run.sh` | Formato, reglas, mapa de módulos y todas las pruebas. |
| `bash tests/compare.sh vieja.html nueva.html` | Compara el comportamiento y la imagen de dos compilaciones. |
| `npx firebase emulators:exec --only auth,firestore --project demo-stratafit "node --test tests/rules.test.mjs"` | Prueba las reglas de Firestore con el emulador (necesita Java y `npm install --no-save firebase-tools@15`). |
| `node tools/rename.js mapa.txt` | Renombra globales (líneas «viejo nuevo») entendiendo ámbitos. |
| `node tools/same.js --dirs antes/ despues/` | Demuestra que un cambio de formato no altera el programa. |
| `python3 tools/pages.py copiar` | Copia `dist/app/` a la raíz (solo si GitHub Pages volviera a publicar desde la rama). |

## Añadir una función

1. Crea `src/js/<área>/<nombre>.js` con su cabecera (`/* ═══ área/nombre ═══ qué hace … Define: … */`), sus `import` y sus
   `export const` / `export function`. Los manejadores (`A.miAccion = …`) van en el mismo archivo y el HTML, con plantillas
   ``html`…` ``.
2. Impórtalo en `src/js/main.js` antes de `core/boot.js`. Si es algo poco usado, en lugar de eso cárgalo desde `core/lazy`.
3. Si guarda datos nuevos, documenta la clave en [estado.md](estado.md), valídala en `core/repair` (al arrancar y tras cada
   sincronización) y decide dónde va: con la cuenta (se sincroniza sola, en `data/core`), en el perfil (preferencias: `PREF_KEYS`
   de `cloud/docs` y `firestore.rules`) o solo en el dispositivo (`LOCAL_ONLY` de `cloud/docs`).
4. Si cambia lo que se guarda en Firestore (un documento o un campo nuevo), cambia también `firestore.rules` y su prueba,
   `tests/rules.test.mjs`.
5. Si el usuario lo ve, descríbelo en la [documentación funcional](../funcional/README.md).
6. `npm run format` y `bash tests/run.sh`.

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
- Fotos de ejercicio: `src/img/ex/<clave>.webp` (sin textos, unos 480 px de ancho) y su línea en `src/img/ex/map.txt`:
  `clave | ejercicios que la usan | otros nombres para buscarlo`.

`build.py` las convierte en el módulo `data/media`: en el paquete son archivos que el service worker guarda para usar sin conexión; en
el archivo único van incrustadas.

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

`tools/format.js` además rehace la línea «Define:» de la cabecera de cada módulo con lo que declara de verdad, y
`tools/modindex.js` copia las cabeceras al [mapa de módulos](modulos.md). Con `--check`, una cabecera o un mapa desfasados fallan
como un archivo sin formatear.

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
   La compilación se detiene si falta.
3. `npm run format` y `bash tests/run.sh`.
4. Abre una solicitud de fusión y, cuando las pruebas estén en verde, fusiónala. Al llegar a `main`, GitHub Actions vuelve a probar en
   Chrome y Safari, crea la etiqueta `vX.Y.Z` con sus notas y publica la app; la app instalada enseña el aviso con las novedades.

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
