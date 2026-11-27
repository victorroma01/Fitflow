# Llevarla a iOS y Android

StrataFit es una aplicación web instalable (PWA): se instala desde Safari en el iPhone y desde Chrome en Android. Para tenerla
además en el App Store y en Google Play, el camino más corto es meter esta misma app (`dist/app/`) dentro de una app nativa con
[Capacitor](https://capacitorjs.com/): el código sigue siendo este y se ve en la vista web del sistema, y lo que el navegador no
da, o da de otra forma dentro de una app, lo dan complementos nativos. Este documento dice qué hay que cambiar y dónde. Todavía no
está hecho: la app no tiene ningún proyecto de iOS ni de Android ni depende de Capacitor.

Una reescritura en nativo (Swift y Kotlin, Flutter o React Native) no aprovecharía las pantallas, pero sí los datos y la lógica que
no toca la pantalla: `data/` (ejercicios, programas, alimentos), `core/calc` (cálculos), `core/schema`, `core/repair` y
`core/parts` (el formato del estado, cómo se valida y cómo se reparte), `cloud/auth` y `cloud/merge` (las cuentas y cómo se juntan
los cambios de dos dispositivos), y el servidor entero ([Firebase](backend.md), por su API REST).

## La frontera con el sistema

Todo lo que en una app nativa cambia va en un solo módulo por cosa. Para llevar la app a iOS y Android se cambian esos módulos y
nada más: cada uno sigue haciendo lo de ahora en el navegador y, dentro de la app nativa, llama al complemento.

| Qué | Módulo | En el navegador | En una app nativa |
| --- | --- | --- | --- |
| Guardar en el dispositivo: el núcleo del estado y los ajustes | `core/store` (y `core/persist`, que marca la pestaña en `sessionStorage` y oye los cambios de otra; `core/util` lee el idioma antes que nada) | `localStorage` | Capacitor aconseja no fiarse de `localStorage` para lo importante, porque el sistema puede vaciarlo si le falta espacio: el núcleo, con el complemento Preferences o en SQLite. |
| Las partes grandes (entrenos, historial, comidas), las copias automáticas y las miniaturas | `core/idb` (`idbStore`, `hasIdb`, `idbDrop`) | IndexedDB | Sigue valiendo dentro de la vista web; para más seguridad, SQLite con un complemento. |
| Que no se borre lo guardado | `system/space` (`keepStorage`) | `navigator.storage.persist()` | No hace falta: lo de una app no lo borra el navegador. |
| Guardar un archivo, compartirlo y copiar un texto | `system/files` (`downloadFile`, `saveBlob`, `shareFiles`, `shareText`, `copyText`) | Descarga con un enlace, «Compartir» del navegador y portapapeles | La descarga no funciona dentro de una app: Filesystem para escribir el archivo y Share para compartirlo; Clipboard para copiar. |
| Avisos, globo del icono y accesos directos del icono | `system/phone` | Notificaciones, globo (Badging) y `?a=…` del manifiesto | Local Notifications, un complemento de globo y los accesos directos de la app (Android) y las acciones rápidas (iOS), que abren la misma `?a=…`. |
| Actualizarse y abrir sin conexión | `system/updates` | Service worker y `version.json` | Sin service worker: los archivos van dentro de la app y las versiones llegan por la tienda. |
| Pantalla encendida durante el entreno | `workout/wake` | Screen Wake Lock | Un complemento que mantiene la pantalla encendida. |
| Sonido y vibración | `profile/feedback` | Web Audio y `navigator.vibrate` | Web Audio sigue valiendo; la vibración, con Haptics (el iPhone no tiene `navigator.vibrate`). |
| «Atrás» | `core/back` (y `system/phone`, que quita `?a=…` de la dirección) | Historial y evento `popstate` | En Android, el botón atrás del sistema (complemento App, evento `backButton`) hace lo mismo que ahora el del navegador; en el iPhone, deslizar para volver (`core/swipe`) ya está en la app. |
| Cámara y códigos de barras | `extras/foods-online` | `getUserMedia` y `BarcodeDetector` | Un complemento de lectura de códigos: `BarcodeDetector` no existe en el iPhone. |
| App Check | `cloud/appcheck` | reCAPTCHA Enterprise | App Attest (iOS) y Play Integrity (Android), con un complemento de App Check; el canje del token por el de App Check es el mismo. |
| Qué dispositivo es y si hay conexión | `core/platform` (`deviceOS`, `isOffline`, `userAgent`) | `navigator.userAgent`, `maxTouchPoints` y `onLine` | Lo dice Capacitor (`getPlatform`) y el complemento Network. |

La regla 15 de `tools/check.js` lo vigila: si otro módulo usa una de estas cosas del navegador, la comprobación falla y dice cuál
es su sitio. Lo que funciona igual dentro de una app (la vista web, `fetch`, Web Audio, el evento `visibilitychange`, leer un
archivo elegido en un campo de archivo, `URL.createObjectURL`) no está en la frontera.

## Lo que ya está

- **Sin conexión**: la app lee y escribe siempre en el dispositivo y sincroniza cuando hay red (`cloud/sync`).
- **Zonas seguras** (la isla, la barra de inicio): `viewport-fit=cover` en `src/index.html` y `env(safe-area-inset-*)` en
  `src/css`.
- **Cuentas**: Firebase por su API REST, sin su SDK, que funciona igual desde una app. Se puede borrar la cuenta desde la propia
  app («Eliminar cuenta», en Privacidad y en Ajustes → Cuenta), que es lo que piden las tiendas.
- **Textos legales** con dirección pública: la app acabada en `?a=privacidad`, `?a=aviso-legal` o `?a=consentimiento` (y en
  inglés), para la ficha de las tiendas.
- **Icono**: `tools/marca.py` hace el icono y su versión adaptable de Android.
- **Idiomas**: español e inglés, según el del móvil.
- **Capturas**: `tests/shots.py` hace una de cada pantalla, para la ficha de las tiendas.

## Cuando se haga

1. **El proyecto**: `npm install @capacitor/core @capacitor/cli`, `npx cap init` con el identificador de la app y `webDir`
   en `dist/app`; después `npx cap add ios` y `npx cap add android`. Cada versión: `python3 build.py` y `npx cap sync`.
2. **Un módulo nuevo, `core/native`**, que diga si la app corre dentro de Capacitor y dé sus complementos. Los módulos de la
   tabla le preguntan: si está, el complemento; si no, lo de ahora. Así la web sigue igual.
3. **Sin service worker** dentro de la app (`system/updates`): no lo registra y no avisa de versiones nuevas por `version.json`.
4. **Firebase**: si la clave de la API está limitada a la dirección de la web, añadir las de la app (`capacitor://localhost` en
   iOS y `https://localhost` en Android) o darle a la app su propia clave; App Check, con los proveedores de iOS y Android.
5. **La política de seguridad (CSP)**: `'self'` es el origen de la app dentro de la vista web; la lista de `connect-src`
   (`build.py`) sigue igual.
6. **Las tiendas**: cuenta de desarrollador de Apple y de Google, la ficha (capturas, textos, la dirección de la Política de
   privacidad) y lo que piden sobre los datos: la cuenta y los datos de entrenamiento, que se guardan para sincronizar; sin
   publicidad ni seguimiento.
7. **Probar en un iPhone y un Android de verdad** ([I-01](issues.md)): hasta ahora, todo se ha probado en navegadores de
   ordenador con el tamaño de un móvil.

Los nombres de los complementos y sus versiones cambian: se miran en la documentación de Capacitor al hacerlo.
