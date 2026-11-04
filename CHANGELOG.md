# Historial de cambios

Todos los cambios importantes de StrataFit, de la versión más reciente a la más antigua. La serie de prueba anterior
(1.19 – 1.24) está en [docs/tecnica/versiones-de-prueba.md](docs/tecnica/versiones-de-prueba.md).

Cada versión se divide en **Novedades**, **Mejoras**, **Correcciones** e **Interno**. La app enseña los tres primeros apartados en el
aviso de versión nueva y en Ajustes (por eso se escriben para el usuario, en frases cortas); **Interno** es solo para desarrollo.
`build.py` lee este archivo: la versión de `APPV` debe tener aquí su entrada o la compilación se detiene.

El formato se inspira en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y la numeración sigue
[versionado semántico](https://semver.org/lang/es/).

## [1.0.0] — 2026-11-04

### Novedades
- Cuentas: entras con tu usuario y contraseña, sin ningún dato personal.
- Tus datos se guardan también en la nube: no los pierdes y puedes usar la app en varios móviles.
- Sin conexión todo sigue funcionando; lo que hagas se sube solo al volver la red.
- Ajustes → Cuenta: el estado de la sincronización, cambiar la contraseña y «Cerrar sesión».

### Mejoras
- Más privacidad: la app ya no guarda nombre, email, teléfono ni fotos de progreso (ni sus dos logros).
- La foto de perfil se sube solo si das tu consentimiento, y la puedes quitar cuando quieras.
- La app ocupa algo menos: se han quitado código y estilos que ya no se usaban.

### Interno
- La numeración empieza de nuevo en la 1.0.0. Los móviles con la 1.24.0 la reciben igual: el service worker guarda el
  documento nuevo y la siguiente apertura ya es la 1.0.0 (el aviso de versión nueva compara números y no saldría, porque 1.0.0
  es menor que 1.24.0).
- Código muerto (T-03), comprobado en cada compilación por `tools/check.js`: declaraciones sin usar, exportaciones que nadie
  importa, acciones que nada lanza, iconos sin usar y CSS sin usar (clases, ids y animaciones). Quitados: 5 acciones, 1 manejador de
  cambios, 3 iconos, 10 exportaciones de más, 11 selectores y 3 animaciones de CSS.
- Las ayudas «?» pasan a su propio módulo, `core/help`.
- `tools/format.js` rehace la línea «Define:» de la cabecera de cada módulo con lo que declara de verdad y cuántas acciones
  registra: con `--check`, una cabecera desfasada falla como un archivo sin formatear (había 30 desfasadas).
- Documentación (T-19, T-20): README nuevo y dos carpetas, `docs/funcional` (qué hace la app, por pestañas, y datos y privacidad)
  y `docs/tecnica` (arquitectura y convenciones, mapa de módulos, estado, servidor, desarrollo, pruebas y versiones de prueba).
  `STATE.md` y `BACKEND.md` pasan a `docs/tecnica/estado.md` y `docs/tecnica/backend.md`, este con el diseño aprobado de Firebase.
- `tools/modindex.js` genera el mapa de módulos (`docs/tecnica/modulos.md`) a partir de las cabeceras; `tests/run.sh` comprueba
  que está al día.
- La rama `desarrollo-1.0.0` se prueba en GitHub (Chrome y Safari) en cada subida, sin etiquetar ni publicar nada.
- Pruebas: fuera `tests/compat.js` (solo servía para comparar con compilaciones anteriores a la 1.20). `tests/shots.py` empieza
  cada pantalla con el almacenamiento vacío, así una comparación no depende de lo que dejó guardado la pantalla anterior.
  `tests/deploy.py` comprueba que una versión con un número menor llega igual en la siguiente apertura.
- Firebase (M2, T-07 a T-12): cuentas con Authentication y datos en Firestore por su API REST, sin SDK (`cloud/`), con correo
  técnico `usuario@stratafit.app` (T-09) y roles por *custom claims* (T-08). Inicio de sesión, contraseña temporal, Ajustes →
  Cuenta y Administración en `account/`. La CSP se abre solo a Firebase.
- Sincronización sin conexión (`cloud/sync`): partes del estado por documento (núcleo, entrenos e historial por año, comidas por
  mes, foto), un índice de versiones que se escribe con ellas (todo o nada, con condición) y fusión a tres bandas por huellas
  (`cloud/merge`): entrenos y comidas se juntan elemento a elemento; en el resto gana el cambio más reciente.
- `core/repair` reúne las comprobaciones del estado (al arrancar y tras cada sincronización) y da un `id` a cada entreno. Fuera las
  lecturas de formatos de la serie de prueba (estado entero de la 1.20, firma del plan, tipo de día de la 1.23): no se migran.
- Seguridad (T-12): `firestore.rules` (cada cuenta lo suyo, con su forma y tamaño; el admin, perfiles y contraseñas temporales; solo
  cuentas con correo técnico), espera creciente tras cinco fallos al entrar, clave de administrador solo como secreto de GitHub.
- GitHub Actions: «Restablecer contraseña», «Asignar rol», «Desplegar reglas» (al fusionar en `main`) y «Comprobar Firebase»
  (`tools/admin`, con firebase-admin); en la CI, el trabajo «Reglas y nube» prueba las reglas y la app con el emulador de Firebase.
- Pruebas: `tests/cloud.py` (dos móviles contra un Firebase de prueba, `tests/fakefb.py`, o el emulador), `tests/merge.test.mjs` y
  `tests/rules.test.mjs`. Las pruebas abren también el archivo único por HTTP: con `file://`, Chromium a veces recargaba la página
  con el almacenamiento vacío.
