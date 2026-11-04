# Pruebas

`bash tests/run.sh` compila y pasa, en este orden, el formato, el mapa de módulos, las reglas de `tools/check.js` y todas las
pruebas. Cualquier fallo hace que falle entero. Las pruebas abren la app en un navegador de verdad con Playwright: Chrome (Chromium)
por defecto o, con `SF_BROWSER=webkit`, el motor de Safari, sirviendo la app por HTTP como GitHub Pages (`tests/browser.py`).
Todas entran con una sesión de prueba y sin red hacia Firebase (`tests/init.js`); la cuenta y la nube se prueban aparte, con un
Firebase de prueba en memoria (`tests/fakefb.py`) y, en GitHub, con el emulador de Firebase.

| Prueba | Qué comprueba |
| --- | --- |
| `tools/format.js --check` y `tools/format_css.js --check` | Que el código y el CSS están formateados y que la línea «Define:» de cada módulo está al día. |
| `tools/modindex.js --check` | Que el [mapa de módulos](modulos.md) está al día. |
| `tools/check.js` | Sintaxis, importaciones, orden de carga, identificadores sin declarar, duplicados, acciones sin manejador, botones sin nombre, código muerto y CSS sin usar ([reglas](desarrollo.md#reglas-de-calidad)). |
| `tests/merge.test.mjs` | La fusión de datos entre dispositivos (`cloud/merge`), sin navegador: cada lado gana lo suyo, comidas e historial se juntan, lo borrado se borra. |
| `tests/exinfo.test.mjs` | El catálogo de ejercicios (T-05), sin navegador: cada ejercicio de la librería tiene su consejo y su ejecución, y no hay dos iguales ni parecidos (más de la mitad de las secuencias de tres palabras en común), ni un consejo igual a una ejecución. |
| `tests/smoke.py` | Arranque, pestañas, entreno completo, comidas, hojas, actualizaciones, política de seguridad y persistencia, en el archivo único y en el paquete. |
| `tests/photos.py` | Fotos de ejercicio: enlaces, búsqueda, ficha y entreno (al tocar la imagen, cómo se hace y la ficha). |
| `tests/security.py` | Nombres, foto de perfil y datos con HTML malicioso en 43 pantallas, también desde una copia manipulada: no debe ejecutarse nada, ni siquiera sin la CSP; y con la CSP, que lo inyectado no se ejecuta ni conecta con otros sitios. |
| `tests/a11y.py` | Accesibilidad en 43 pantallas: botones con nombre, campos con etiqueta, lo que se toca anunciado como botón y, en el entreno (a 390 y 320 px), zona táctil de 44 × 44 px medida tocando. También, que la CSP no bloquea nada de la app. |
| `tests/features.py` | Nutrición (tipo de día según la rutina, ayudas, botones de cada comida, objetivos a mano que no se pisan, alimentos por grupos), Perfil y Ajustes (sin datos personales, con «Cerrar sesión»), medallas e informe de fallos. |
| `tests/programs.py` | Los programas de M3: ciclos de Push Pull Leg y Full Body (semanas que siguen el ciclo, Workout y Nutrición), programas según el sexo, técnicas en los programas y en el entreno (pirámide, drop set, rest-pause, myo-reps), semana de descarga (aviso, hoja, 65 % y 2 repeticiones menos, omitir, configurable), rotación de ejercicios, «Volver a generar» y consejo y ejecución de cada ejercicio. |
| `tests/session.py` | La pantalla de entrenamiento de M4: Tips y Discos con icono, desplegables cortos de tempo y descanso (y que el valor de arriba cambia), peso sugerido (gris, se propaga, pirámide, drop set, historial, registrado al marcar), ventana de cada técnica, superseries y triseries por rondas (10 s, descanso de la ronda, 2:30 por defecto, «Saltar», «Anterior», sin descanso automático, a qué serie va la pantalla), barra inferior pegada al borde y reloj del WOD (anillo, saltar la cuenta atrás, pausa, último minuto, Tabata, EMOM y For time). |
| `tests/followup.py` | Perfil, ajustes y seguimiento de M5: recordatorio de pesaje (intervalos, «Otro» con tope, cuándo toca, aviso una vez al día, «Mañana», tarjeta del Dashboard, ciclo nuevo al pesarse y el evento .ics), análisis mensual (desde el primer mes, mes por defecto, cifras y comparación, entrenos por semanas, récords, peso y objetivo, alimentación, otros datos, conclusión, ‹ › y el PDF: cabecera, páginas, pie, texto en Windows-1252 y tabla de objetos), nota de actualización con «Cerrar», archivo de copia con nombre fijo y datos dañados. |
| `tests/safety.py` | Registro de errores, datos dañados, aviso al no poder guardar, copias automáticas y pantalla de error de arranque. |
| `tests/storage.py` | Guardado por partes: formato, datos de la serie de prueba (no se migran), escribir solo lo que cambia, partes dañadas, falta de espacio, restaurar y borrar (sin conexión, no borra nada). |
| `tests/render.py` | Pintar con cambios mínimos: cada pantalla queda igual que pintada de cero y se conservan foco, texto escrito y desplazamiento. |
| `tests/cloud.py` | La cuenta y la nube con dos móviles: registro e inicio de sesión, sincronización (también sin conexión y con cambios en los dos), preferencias, borrar en uno, espera tras cinco fallos, Administración, contraseña temporal y sesión caducada, fallos y sugerencias (enviar, sin conexión, vista, respuesta y arreglado, también en Perfil), copia de seguridad en la nube (la primera y la semanal solas, a mano, sin pisar una copia con más datos, restaurar), foto con consentimiento, cerrar sesión y borrar todos los datos (también la copia), sin código inyectado ni choques con la CSP. Con el Firebase de prueba (`tests/fakefb.py`) o, con `SF_CLOUD=emulador`, con el emulador. |
| `tests/deploy.py` | Paquete servido por HTTP: service worker, sin conexión, código y fotos en caché, carga diferida (WOD, CSV, escáner y el catálogo de ejercicios), aviso de versión nueva (publicando de verdad otra versión), novedades y llegada de una versión con un número menor (como la 1.0.0 tras la 1.24.0). |

## Comparar dos versiones

`bash tests/compare.sh vieja.html nueva.html` compara dos compilaciones del archivo único:

| Prueba | Qué compara |
| --- | --- |
| `tests/walk.py` | Paseo aleatorio diferencial: la misma secuencia de toques en las dos; compara pantalla, datos guardados y sonidos paso a paso. |
| `tests/shots.py` | 43 pantallas × 6 configuraciones (temas, cristal, tamaños de iPhone), píxel a píxel. |

Sirve para demostrar que un cambio interno (una limpieza, un cambio de estructura) no altera nada de lo que se ve ni de lo que se guarda.

## En GitHub

GitHub Actions pasa `tests/run.sh` en Chrome y en Safari en cada cambio de `main`, de la rama `desarrollo-1.0.0` y de cada solicitud de
fusión, y el trabajo **Reglas y nube** arranca el emulador de Firebase (Authentication y Firestore, con `firestore.rules`) para
probar las reglas (`tests/rules.test.mjs`: qué puede leer y escribir cada cuenta y el admin, también la copia de seguridad y los fallos y sugerencias) y la app entera contra él
(`tests/cloud.py` sobre `dist/emu/stratafit.html`, con el script de verdad de la contraseña temporal). En las solicitudes de fusión, además, compara con la versión anterior (paseo aleatorio y capturas). La comparación es
informativa salvo con la etiqueta **`refactor`**, que exige que no cambie nada.
