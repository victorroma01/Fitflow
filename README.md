# StrataFit · código fuente

StrataFit es una app web instalable (PWA) de entrenamiento y nutrición. El código vive en `src/`, en módulos pequeños y legibles,
y `build.py` los une en la app que se publica (GitHub Pages u otro hosting estático).

```
python3 build.py              # genera dist/app/ y dist/stratafit.html
python3 build.py --check      # además ejecuta tools/check.js (node + typescript)
bash tests/run.sh             # compila y pasa todas las pruebas
```

| Salida | Para qué |
|---|---|
| `dist/app/` → `index.html`, `sw.js`, `manifest.webmanifest`, iconos e `img/` | Paquete instalable: es lo que se publica (la raíz del repositorio es una copia de `dist/app`). |
| `dist/stratafit.html` | Archivo único con todo incrustado (también las fotos), sin service worker: para previsualizar o compartir. |

## Estructura

```
src/
  index.html            plantilla: cabecera, pantalla de error de arranque, <nav> y los marcadores @@CSS@@ / @@JS@@
  css/NN-nombre.css     CSS en trozos; se concatenan por nombre (el número fija el orden de la cascada)
  js/modules.txt        ORDEN DE CARGA de los módulos
  js/core/              infraestructura: util, store, errors, registry, state, icons, ui, events, render, boot
  js/data/              datos: biblioteca de ejercicios, alimentos, fotos (media), anatomía, plantillas, niveles
  js/library/           modelo de ejercicios, fotos, filtros, librería, cambio de ejercicio (swap), selector
  js/routines/          «Mis workouts»
  js/workout/           pestaña Workout, sesión activa, fin de entreno, reanudar, descansos, progresión, discos, descarga…
  js/programs/          crear programa, niveles, gestor, compartir por código
  js/nutrition/         pestaña Nutrición: resumen, dieta (TDEE), agua, añadir alimentos, plantillas
  js/dashboard/         pestaña Dashboard: tarjetas, registro y calendario, progreso, peso corporal
  js/profile/           pestaña Perfil: ajustes, apariencia, unidades, sonido y vibración
  js/system/            archivos, copias de seguridad, copias automáticas, diagnóstico, actualización y uso sin conexión
  js/extras/            WOD, resumen y compartir, estancamiento, cardio, medidas y fotos, alimentos en línea, logros, CSV, anatomía
  img/day/              portadas de los días (.jpg) y order.txt (orden del selector)
  img/ex/               fotos de ejercicio (.webp) y map.txt (qué ejercicios usa cada foto y con qué otros nombres se busca)
static/                 sw.js (plantilla), manifest.webmanifest, iconos
tools/                  check.js (reglas), format.js y format_css.js (formato), same.js (equivalencia), rename.js (renombrar)
tests/                  humo, fotos, seguridad, despliegue, capturas comparables y paseo aleatorio diferencial
docs/                   STATE.md (qué guarda la app) y BACKEND.md (diseño previsto para un servidor)
.github/workflows/      pruebas automáticas en cada cambio
```

## Cómo funciona el código

* **Sin imports ni bundler.** Cada módulo es una lista de sentencias de ámbito global (`const`, `function`, `A.x = …`). El build las une,
  en el orden de `modules.txt`, dentro de un solo `<script>`. Así no hace falta ninguna herramienta para compilar y la app arranca al instante.
* **Estado único `S`** (perfil, programas, registros, comidas, medidas…), descrito en `docs/STATE.md`. Se guarda con `saveState()`.
  El entreno en curso es `W`. `R()` pinta la pantalla.
* **Eventos delegados.** El HTML lleva `data-a="nombre"`, `data-c="nombre"` o `data-u="nombre"` y un único listener (`core/events`) llama a
  `A.nombre(i, elemento)`, `C.nombre(elemento, i, j)` o `U.nombre(valor)`. Cada manejador se escribe **junto a la función que lo usa**.
* **Persistencia solo por `Store`** (`core/store`). Nadie llama a `localStorage` directamente: por ahí se enchufará un servidor (`docs/BACKEND.md`).
* **Errores.** Lo inesperado se anota con `logError(dónde, error)` (`core/errors`): se guardan los últimos 30 en el móvil y se ven en
  Perfil → Ajustes → Diagnóstico. Un `catch` vacío solo se permite con un comentario que explique por qué el fallo es esperable.
* **Datos a salvo.** Si guardar falla (almacenamiento lleno) la app avisa; si al arrancar los datos están dañados, se apartan antes de
  empezar de cero (`Store.K.bad`, descargables desde Diagnóstico); cada día se hace una copia automática en el móvil (`system/snapshots`).
* **Arranque.** Todo lo que se ejecuta al cargar y toca el estado (migraciones, restaurar un entreno interrumpido, primer `R()`) vive en
  `core/boot`, en un orden explícito. El resto de módulos solo *define*.

### Nombres

* Los nombres dicen lo que hacen, en inglés y en camelCase: `toast`, `saveState`, `confirmDialog`, `exRowHtml`… Las constantes de datos,
  en MAYÚSCULAS: `EXERCISES`, `PROGRAMS`, `MEAL_NAMES`.
* Se mantienen las letras del núcleo, que aparecen en todas partes: `S` (estado), `W` (entreno en curso), `R` (pintar), `A`/`C`/`U`
  (manejadores), `X` (escapar HTML), `$` (buscar un elemento) e `IC` (iconos).
* Las claves de acción (`data-a="zov"`) y las claves de `S` (`S.cx`, `S.cr`…) son cortas por historia: las de `S` están en los datos
  guardados de cada usuario y en sus copias, así que no se cambian sin una migración.
* Para renombrar un global: `node tools/rename.js mapa.txt` (líneas «viejo nuevo»). Entiende ámbitos, actualiza la cabecera del módulo
  y se niega si el nombre nuevo ya existe.

### Formato

`node tools/format.js` y `node tools/format_css.js` dejan una instrucción o declaración por línea con sangría de 2 espacios. No cambian el
significado: `node tools/same.js --dirs antes/ despues/` lo demuestra comparando el árbol sintáctico y los comentarios.
Las pruebas automáticas fallan si algo queda sin formatear (`--check`).

### Reglas (las vigila `tools/check.js`)

1. Al cargar (nivel superior) un módulo solo puede *usar* lo que declaran los módulos anteriores en `modules.txt`. Dentro de una función
   (se ejecuta después) puede llamar a cualquier cosa.
2. Una clave de `A`, `C`, `U` o `IC` no puede definirse dos veces.
3. No se reasignan funciones («parches encadenados» como `const x = R; R = () => { x(); … }`): se cambia la función donde está declarada.
4. Todo `data-a`/`data-c`/`data-u` escrito en el HTML debe tener su manejador.
5. No hay identificadores sin declarar ni declaraciones globales repetidas.
6. `core/util` es el primer módulo y `core/boot` el último.

### Añadir una función nueva

1. Crea `src/js/<área>/<nombre>.js` con una cabecera `/* ═══ área/nombre ═══ … Define: … */` y tus `const`/`function`.
2. Escribe sus manejadores en el mismo archivo: `A.miAccion = (i, b) => { … }`.
3. Añádelo a `src/js/modules.txt` **después** de los módulos que usa al cargar (casi siempre justo antes de `core/boot.js`).
4. Si necesita engancharse a una pantalla existente, llama a tu función desde esa pantalla (por ejemplo `profileTab()` en `profile/home.js`).
5. Si añade claves de estado, documéntalas en `docs/STATE.md`, dales valor por defecto en `core/boot` y piensa si entran en la copia de seguridad.
6. `node tools/format.js`, `python3 build.py --check` y `bash tests/run.sh`.

### Fotos

* **Portadas de día:** `src/img/day/<clave>.jpg`; el orden del selector está en `src/img/day/order.txt`.
* **Fotos de ejercicio:** `src/img/ex/<clave>.webp` (recortada, sin textos, unos 480 px de ancho) y su línea en `src/img/ex/map.txt`:
  `clave | ejercicios de la biblioteca que la usan | otros nombres para buscarlo`.

`build.py` las convierte en el módulo `data/media`: en el paquete son archivos `img/…` que el service worker guarda para usar sin conexión
(así `index.html` pesa unos 450 KB en vez de 1 MB); en el archivo único van incrustadas. La foto de ejercicio aparece en su ficha de la
librería y al tocar su miniatura dentro del entreno. La búsqueda ignora tildes y encuentra los nombres alternativos.

## Comprobaciones y pruebas

```
bash tests/run.sh                                     # todo lo siguiente sobre la compilación actual
node tools/check.js                                   # reglas estáticas (node + typescript)
python3 tests/smoke.py dist/stratafit.html            # arranque, pestañas, entreno completo, comida, hojas, persistencia
python3 tests/photos.py dist/stratafit.html           # fotos de ejercicio: enlaces, búsqueda, ficha y entreno
python3 tests/security.py dist/stratafit.html         # nombres con HTML malicioso en 33 pantallas: no debe ejecutarse nada
python3 tests/safety.py dist/stratafit.html           # registro de errores, datos dañados, aviso al no poder guardar, copias automáticas
python3 tests/deploy.py dist/app                      # paquete por HTTP: service worker, sin conexión, fotos en caché, versión nueva
bash tests/compare.sh referencia.html nueva.html      # refactor: paseo aleatorio y 198 capturas deben ser idénticos
```
Requisitos: `pip install playwright pillow numpy`, `playwright install chromium` y `npm install` (typescript).
En GitHub, cada cambio ejecuta estas pruebas (`.github/workflows/pruebas.yml`). En una solicitud de fusión, además se compara con la
versión anterior; si lleva la etiqueta `refactor`, cualquier diferencia de comportamiento o de imagen hace fallar la comprobación.

## Publicar

1. Sube la versión en `src/js/core/util.js` (`APPV`).
2. `python3 build.py --check` y `bash tests/run.sh`.
3. Copia el contenido de `dist/app/` a la raíz del repositorio (index.html, sw.js, manifest, iconos e `img/`) en una rama y abre una
   solicitud de fusión. Al fusionarla, GitHub Pages publica y la app instalada muestra «Nueva versión disponible».
