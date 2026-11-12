# Pruebas

`bash tests/run.sh` compila y pasa, en este orden, el formato, el mapa de módulos, las reglas de `tools/check.js` y todas las
pruebas. Cualquier fallo hace que falle entero. Las pruebas abren la app en un navegador de verdad con Playwright: Chrome (Chromium)
por defecto o, con `SF_BROWSER=webkit`, el motor de Safari, sirviendo la app por HTTP como GitHub Pages (`tests/browser.py`).
Todas entran con una sesión de prueba y sin red hacia Firebase (`tests/init.js`); la cuenta y la nube se prueban aparte, con un
Firebase de prueba en memoria (`tests/fakefb.py`) y, en GitHub, con el emulador de Firebase. Como la app lee sus partes de IndexedDB
antes de pintar y las guarda sin esperar (I-04), `page.goto` y `page.reload` esperan antes a que lo guardado quede escrito
(`savesDone()`) y después a que la app arranque (`window.__ffready`); para leer lo guardado, `tests/init.js` trae `__stored()`.

| Prueba | Qué comprueba |
| --- | --- |
| `tools/format.js --check` y `tools/format_css.js --check` | Que el código y el CSS están formateados y que la línea «Define:» de cada módulo está al día. |
| `tools/modindex.js --check` | Que el [mapa de módulos](modulos.md) está al día. |
| `tools/check.js` | Sintaxis, importaciones, orden de carga, identificadores sin declarar, duplicados, acciones sin manejador, botones sin nombre, código muerto y CSS sin usar ([reglas](desarrollo.md#reglas-de-calidad)). |
| `tests/merge.test.mjs` | La fusión de datos entre dispositivos (`cloud/merge`), sin navegador: cada lado gana lo suyo, comidas e historial se juntan, lo borrado se borra. |
| `tests/exinfo.test.mjs` | El catálogo de ejercicios (T-05), sin navegador: cada ejercicio de la librería tiene su consejo y su ejecución, y no hay dos iguales ni parecidos (más de la mitad de las secuencias de tres palabras en común), ni un consejo igual a una ejecución. |
| `tests/smoke.py` | Arranque, pestañas, entreno completo, comidas, hojas, actualizaciones, política de seguridad y persistencia, en el archivo único y en el paquete. |
| `tests/photos.py` | Fotos de ejercicio: enlaces, búsqueda, ficha y entreno (al tocar la imagen, cómo se hace y la ficha). |
| `tests/security.py` | Nombres, foto de perfil y datos con HTML malicioso en 47 pantallas, también desde una copia manipulada: no debe ejecutarse nada, ni siquiera sin la CSP; y con la CSP, que lo inyectado no se ejecuta ni conecta con otros sitios. |
| `tests/a11y.py` | Accesibilidad en 47 pantallas: botones con nombre, campos con etiqueta, lo que se toca anunciado como botón, cada hoja, página, aviso o menú anunciado como ventana con nombre y, en el entreno (a 390 y 320 px), zona táctil de 44 × 44 px medida tocando. Aparte, que el foco va a cada ventana al abrirla y vuelve a lo que la abrió al cerrarla, también cuando tocar un botón no le da el foco, como en Safari (I-06). También, que la CSP no bloquea nada de la app. |
| `tests/features.py` | Nutrición (tipo de día según la rutina, ayudas, botones de cada comida, objetivos a mano que no se pisan, alimentos por grupos), Perfil y Ajustes (sin datos personales, con «Cerrar sesión»), medallas e informe de fallos. |
| `tests/foods.py` | Alimentos en línea con Open Food Facts simulado (ninguna petición sale a internet; I-22): buscador nuevo primero y el antiguo de respaldo, sin los signos de la sintaxis de búsqueda, reintento, caché, un mensaje para cada fallo (sin conexión, saturado, tarda demasiado, sin resultados, sin datos nutricionales) y el código de barras (las dos consultas y su reintento; una cámara que se abre o falla tarde y una respuesta que llega con la hoja ya cerrada no pisan nada). Nutri-Score (F-43) y «Mis alimentos» (F-44): guardar al añadir, sin repetir, borrar, y datos dañados. |
| `tests/programs.py` | Los programas de M3: ciclos de Push Pull Leg y Full Body (semanas que siguen el ciclo, Workout y Nutrición), programas según el sexo, técnicas en los programas y en el entreno (pirámide, drop set, rest-pause, myo-reps), semana de descarga (aviso, hoja, 65 % y 2 repeticiones menos, omitir, configurable), rotación de ejercicios, «Volver a generar» y consejo y ejecución de cada ejercicio. |
| `tests/session.py` | La pantalla de entrenamiento de M4: Tips y Discos con icono, desplegables cortos de tempo y descanso (y que el valor de arriba cambia), peso sugerido (gris, se propaga, pirámide, drop set, historial, registrado al marcar), ventana de cada técnica, superseries y triseries por rondas (10 s, descanso de la ronda, 2:30 por defecto, «Saltar», «Anterior», sin descanso automático, a qué serie va la pantalla; unir y separar, y circuito de cuatro o más), barra inferior pegada al borde y reloj del WOD (anillo, saltar la cuenta atrás, pausa, último minuto, Tabata, EMOM y For time). De la V1.0.1: las herramientas de cada ejercicio alineadas (I-26), WKT y DS/RP (I-25, I-27), «¿Guardar el entreno?» al marcar la última serie (I-28), el paso al día siguiente sin saltar descansos (F-41) y el RPE opcional con su explicación (F-42). |
| `tests/followup.py` | Perfil, ajustes y seguimiento de M5: recordatorio de pesaje (intervalos, «Otro» con tope, cuándo toca, aviso una vez al día, «Mañana», tarjeta del Dashboard, ciclo nuevo al pesarse y el evento .ics), análisis mensual (desde el primer mes, mes por defecto, cifras y comparación, entrenos por semanas, récords, peso y objetivo, alimentación, otros datos, conclusión, ‹ › y el PDF: cabecera, páginas, pie, texto en Windows-1252 y tabla de objetos), nota de actualización con «Cerrar», archivo de copia con nombre fijo y datos dañados. |
| `tests/experience.py` | La experiencia de uso de M6, con gestos táctiles (eventos de puntero, como el dedo) y el reloj de prueba: colores de serie y propio (con su contraste), vista previa, reducir animaciones y pestaña al abrir (F-31); la burbuja de la barra (bajo su pestaña, mantener pulsado y arrastrar, deslizar sin esperar, vibración, cancelar; F-38); deslizar para volver (la página sigue al dedo, cuándo vuelve y cuándo no, dónde no empieza, en qué pantallas vale; F-37); «atrás» del sistema, accesos directos del icono y globo del icono (F-39); el recorrido (cuándo sale, textos, los 5 pasos con su foco, también en un iPhone pequeño, «¡Listo!», solo una vez, desde Ajustes; F-36); y las descargas con la app instalada, que en el móvil abren «Compartir» (PDF del análisis, copia y evento del pesaje; T-06). De la V1.0.1: sin negro al volver deslizando (página de debajo, sin desenfoque mientras se mueve, sin entrada de más del historial en iPhone; I-20), el sonido tras el silencio o una interrupción (I-21, con un AudioContext simulado), el color propio sin repintar la app en cada tono (I-18), la barra sin medir en cada movimiento (I-19), la bienvenida y los datos de una cuenta nueva y Workout sin programa (I-23, I-24), el logo según el tema y el azul de partida (F-40) y el sistema del móvil (T-28). |
| `tests/safety.py` | Registro de errores, datos dañados, aviso al no poder guardar, copias automáticas y pantalla de error de arranque. |
| `tests/storage.py` | Guardado por partes: formato (el núcleo en localStorage y las partes en IndexedDB, con la lista de las que tiene que haber), paso desde localStorage (la V1.0.1) sin perder nada, datos de la serie de prueba (no se migran), escribir solo lo que cambia y en orden (una parte nueva antes de nombrarla, una que sobra después), las partes que la acción dice haber tocado y el repaso de después (también al salir de la app), partes dañadas o que faltan (no se guarda ni se sincroniza nada hasta poder leerlas), sin IndexedDB (todo en localStorage), aviso de espacio y Diagnóstico, falta de espacio, restaurar y borrar (sin conexión, no borra nada) y la pantalla de error. |
| `tests/render.py` | Pintar con cambios mínimos: cada pantalla queda igual que pintada de cero y se conservan foco, texto escrito y desplazamiento. |
| `tests/cloud.py` | La cuenta y la nube con dos móviles: registro e inicio de sesión, sincronización (también sin conexión y con cambios en los dos), preferencias (también el color propio), recorrido de la primera vez (sale en la cuenta nueva y no en el otro móvil), borrar en uno, un índice que nombra documentos que ya no existen (I-11), datos del móvil dañados (se vuelven a bajar, sin borrarlos en la nube) o que faltan (no se sincroniza y «Bajar de mi cuenta» los recupera), espera tras cinco fallos, Administración, contraseña temporal y sesión caducada (también la espera tras cinco fallos al volver a entrar), fallos y sugerencias (enviar, sin conexión, vista, respuesta y arreglado, también en Perfil), copia de seguridad en la nube (la primera y la semanal solas, a mano, sin pisar una copia con más datos, restaurar), foto con consentimiento, cerrar sesión y borrar todos los datos (también la copia), sin código inyectado ni choques con la CSP. Con el Firebase de prueba (`tests/fakefb.py`) o, con `SF_CLOUD=emulador`, con el emulador. |
| `tests/deploy.py` | Paquete servido por HTTP: service worker (el código sale de la caché sin volver a pedirlo y lo demás se revalida; si un trozo de código no llega al instalarse, no se guarda una página a medias y se reintenta), manifiesto con los accesos directos del icono (que abren su pantalla también sin conexión), sin conexión, código y fotos en caché, carga diferida (WOD, CSV, escáner y el catálogo de ejercicios), aviso de versión nueva (publicando de verdad otra versión), novedades y llegada de una versión con un número menor (como la 1.0.0 tras la 1.24.0). |

## Comparar dos versiones

`bash tests/compare.sh vieja.html nueva.html` compara dos compilaciones del archivo único:

| Prueba | Qué compara |
| --- | --- |
| `tests/walk.py` | Paseo aleatorio diferencial: la misma secuencia de toques en las dos; compara pantalla, datos guardados y sonidos paso a paso. Por HTTP, como el resto. Con `window.__ffHintCheck`, cada guardado que dice qué partes tocó se comprueba en vez de repasarlo después (I-10): si cambió otra, el paso queda anotado como error. |
| `tests/shots.py` | 47 pantallas × 6 configuraciones (temas, cristal, tamaños de iPhone), píxel a píxel. |

Sirve para demostrar que un cambio interno (una limpieza, un cambio de estructura) no altera nada de lo que se ve ni de lo que se guarda.
Si la versión vieja tiene otros nombres de acciones (de antes de la V1.0.2), un quinto argumento con el mapa de nombres
([`tests/nombres-1.0.2.txt`](../../tests/nombres-1.0.2.txt)) hace que `tests/walk.py` traduzca los suyos a los nuevos para tocar lo
mismo y comparar la misma pantalla, y que `tests/shots.py` abra las pantallas de la vieja con sus nombres.

## En GitHub

GitHub Actions pasa `tests/run.sh` en Chrome y en Safari en cada cambio de `main`, de las ramas de desarrollo (`desarrollo-*`) y de cada solicitud de
fusión, y el trabajo **Reglas y nube** arranca el emulador de Firebase (Authentication y Firestore, con `firestore.rules`) para
probar las reglas (`tests/rules.test.mjs`: qué puede leer y escribir cada cuenta y el admin, también la copia de seguridad y los fallos y sugerencias) y la app entera contra él
(`tests/cloud.py` sobre `dist/emu/stratafit.html`, con el script de verdad de la contraseña temporal). En las solicitudes de fusión, además, compara con la versión anterior (paseo aleatorio y capturas). La comparación es
informativa salvo con la etiqueta **`refactor`**, que exige que no cambie nada.

## En los móviles de verdad (T-06)

Las pruebas automáticas pasan en el motor de Android (Chrome) y en el del iPhone (Safari, WebKit), pero hay cosas que solo hace el
sistema del móvil: el gesto atrás de Android, los accesos directos del icono, el globo del iPhone, la vibración, «Compartir» y el
calendario. Antes de publicar la versión se repasan con la app instalada desde [la dirección de la app](https://victorroma01.github.io/Fitflow/)
(en iPhone, con Safari → Compartir → Añadir a pantalla de inicio; en Android, con Chrome → Instalar app):

| Qué | iPhone | Android |
| --- | --- | --- |
| Recorrido: sale la primera vez con la cuenta nueva, los 5 pasos se ven bien (el foco sobre su parte, la tarjeta sin tapar nada importante), «Omitir» y «¡Listo!»; no vuelve a salir al cerrar y abrir la app, ni en otro móvil con la misma cuenta | ☐ | ☐ |
| Deslizar para volver: desde el borde izquierdo y desde el medio de la pantalla, en una página de Ajustes, en el menú, en Overview y en Evolución del peso; nada en las pestañas principales ni en el entreno; deslizar hacia arriba o abajo desplaza la página con normalidad | ☐ | ☐ |
| Android: el gesto atrás del sistema desde el borde vuelve una sola vez (no dos) y, desde Workout sin nada abierto, sale de la app; en el entreno no sale | — | ☐ |
| Burbuja: mantener pulsado Perfil y arrastrar hasta Nutrición, Dashboard y Workout; deslizar el dedo por la barra; la burbuja sigue al dedo y al soltar abre la pestaña; en Android vibra un poco al pasar por cada pestaña; no salta el menú del sistema al mantener pulsado | ☐ | ☐ |
| Accesos directos: mantener pulsado el icono de la app → Entreno de hoy, Nutrición de hoy y Registrar el peso (también sin conexión) | — | ☐ |
| Globo en el icono: Ajustes → Sonido y avisos → «Globo en el icono de la app» pide permiso de avisos; con el pesaje de hoy pendiente, al salir de la app el icono enseña 1 | ☐ | — |
| Recordatorio de pesaje (F-25): el aviso «Día de pesarse» al abrir la app; «Añadir al calendario del móvil» abre el evento en Calendario con su repetición y su aviso a las 9:00 | ☐ | ☐ |
| Descargas (F-26, F-30): «Descargar PDF» del análisis mensual y «Guardar archivo» de la copia abren «Compartir» (en iPhone, «Guardar en Archivos») y el archivo se abre bien; cancelar no da error | ☐ | ☐ |
| Personalización: un color de serie y uno propio con el selector del sistema; «Reducir animaciones»; «Al abrir la app» con otra pestaña, al cerrar la app del todo y volverla a abrir | ☐ | ☐ |
