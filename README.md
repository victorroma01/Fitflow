# StrataFit · código fuente

StrataFit es una app web instalable (PWA) de entrenamiento y nutrición. Todo el código se escribe aquí, en módulos pequeños,
y `build.py` los une en **un único `index.html`** para publicarlo (GitHub Pages u otro hosting estático).

```
python3 build.py              # genera dist/app/ y dist/stratafit.html
python3 build.py --check      # además ejecuta tools/check.js (necesita node + typescript)
```

| Salida | Para qué |
|---|---|
| `dist/app/index.html` + `sw.js`, `manifest.webmanifest`, iconos | Paquete instalable. **Para actualizar la app solo hay que subir `index.html`** (el resto casi nunca cambia). |
| `dist/stratafit.html` | Versión de un solo archivo (sin service worker), útil para previsualizar o compartir. |

## Estructura

```
src/
  index.html            plantilla: cabecera, pantalla de error de arranque, <nav> y los marcadores @@CSS@@ / @@JS@@
  css/NN-nombre.css     CSS en trozos contiguos; se concatenan por nombre (el orden importa por la cascada)
  js/modules.txt        ORDEN DE CARGA de los módulos
  js/core/              infraestructura: util, store, registry, state, icons, ui, events, render, boot
  js/data/              datos grandes: biblioteca de ejercicios, alimentos, fotos de día y de ejercicio, anatomía, plantillas, niveles
  js/library/           modelo de ejercicios, filtros, librería, cambio de ejercicio (swap), selector
  js/routines/          «Mis workouts»
  js/workout/           pestaña Workout, sesión activa, fin de entreno, reanudar, descansos, progresión, discos, descarga…
  js/programs/          crear programa, niveles, gestor, compartir por código
  js/nutrition/         pestaña Nutrición: resumen, dieta (TDEE), agua, añadir alimentos, plantillas
  js/dashboard/         pestaña Dashboard: tarjetas, registro y calendario, progreso, peso corporal
  js/profile/           pestaña Perfil: ajustes, apariencia, unidades, sonido y vibración
  js/system/            copias de seguridad, actualización/sin conexión, archivos
  js/extras/            WOD, resumen y compartir, estancamiento, cardio, medidas y fotos, alimentos en línea, logros, CSV, anatomía
img/ex/                 fotos de ejercicio (WebP) y map.txt: qué ejercicios usa cada foto y con qué otros nombres se busca
static/                 sw.js, manifest.webmanifest, iconos
tools/check.js          comprobaciones estáticas
tools/exphotos.py       convierte src/img/ex/ en src/js/data/exphotos.js (módulo generado)
tests/                  humo, capturas comparables y paseo aleatorio diferencial
docs/BACKEND.md         diseño previsto para un servidor
```

## Cómo funciona el código

* **Sin imports ni bundler.** Cada módulo es una lista de sentencias de ámbito global (`const`, `function`, `A.x=…`). El build las une, en el orden
  de `modules.txt`, dentro de un solo `<script>`. Esto mantiene el archivo único, el modo sin conexión y el arranque instantáneo.
* **Estado único** `S` (perfil, programas, registros, comidas, medidas…). Se guarda con `sv()`. El entreno en curso es `W`. `R()` pinta la pantalla.
* **Eventos delegados.** El HTML lleva `data-a="nombre"`, `data-c="nombre"` o `data-u="nombre"` y un único listener (`core/events`) llama a
  `A.nombre(i, elemento)`, `C.nombre(elemento, i, j)` o `U.nombre(valor)`. Cada manejador se escribe **junto a la función que lo usa**.
* **Persistencia solo por `Store`** (`core/store`). Nadie llama a `localStorage` directamente: por ahí se enchufará un servidor (ver `docs/BACKEND.md`).
* **Arranque.** Todo lo que se ejecuta al cargar y toca el estado (migraciones, restaurar un entreno interrumpido, primer `R()`) vive en `core/boot`,
  en un orden explícito. El resto de módulos solo *define*.

### Reglas (las vigila `tools/check.js`)

1. Al cargar (nivel superior) un módulo solo puede *usar* lo que declaran los módulos anteriores en `modules.txt`. Dentro de una función
   (se ejecuta después) puede llamar a cualquier cosa.
2. Una clave de `A`, `C`, `U` o `IC` no puede definirse dos veces.
3. No se reasignan funciones («parches encadenados» como `const x=R;R=()=>{x();…}`): se cambia la función donde está declarada.
4. Todo `data-a`/`data-c`/`data-u` escrito en el HTML debe tener su manejador.
5. No hay identificadores sin declarar ni declaraciones globales repetidas.
6. `core/util` es el primer módulo y `core/boot` el último.

### Añadir una función nueva

1. Crea `src/js/<área>/<nombre>.js` con una cabecera `/* ═══ área/nombre ═══ … */` y tus `const`/`function`.
2. Escribe sus manejadores en el mismo archivo: `A.miAccion=(i,b)=>{…}`.
3. Añádelo a `src/js/modules.txt` **después** de los módulos que usa al cargar (casi siempre justo antes de `core/boot.js`).
4. Si necesita engancharse a una pantalla existente, llama a tu función desde esa pantalla (por ejemplo `PF()` en `profile/home.js`).
5. Si añade claves de estado, dales un valor por defecto en `core/boot` (migración) y piensa si deben entrar en la copia de seguridad (`system/backup`).
6. `python3 build.py --check` y `python3 tests/smoke.py dist/stratafit.html`.

### Añadir o cambiar fotos de ejercicio

1. Deja la foto recortada (sin textos, unos 480 px de ancho, WebP) en `src/img/ex/<clave>.webp`.
2. Añade su línea en `src/img/ex/map.txt`: `clave | ejercicios de la biblioteca que la usan | otros nombres para buscarlo`.
3. `python3 tools/exphotos.py` regenera `src/js/data/exphotos.js` (no se edita a mano) y después `python3 build.py --check`.

La foto aparece en la ficha del ejercicio (librería) y al tocar la miniatura del ejercicio dentro del entreno. La búsqueda ignora tildes
y también encuentra los nombres alternativos del `map.txt`.

## Comprobaciones y pruebas

```
node tools/check.js                                   # estático (node + typescript)
python3 tests/smoke.py dist/stratafit.html            # arranque, pestañas, entreno completo, comida, hojas, persistencia
python3 tests/photos.py dist/stratafit.html           # fotos de ejercicio: enlaces, búsqueda, ficha y entreno
python3 tests/walk.py run ref.html nueva.html 0,1,2,3 150     # paseo aleatorio: misma secuencia en ambas versiones, compara DOM + datos + sonido
python3 tests/shots.py snap nueva.html out a,b,c,d,e,f        # 33 pantallas × 6 configuraciones
python3 tests/shots.py cmp ref_out out                        # comparación píxel a píxel
```
Requisitos de las pruebas: `pip install playwright pillow numpy` y `playwright install chromium`.
Para un refactor: compila antes y después, y exige que `walk.py` y `shots.py` no encuentren diferencias.

## Publicar

Sube `dist/app/index.html` al repositorio de GitHub Pages (sustituye al anterior). La app instalada detecta la versión nueva y muestra el aviso
«Nueva versión disponible». La versión está en `src/js/system/updates.js` (`APPV`).
