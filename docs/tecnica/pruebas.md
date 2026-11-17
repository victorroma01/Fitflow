# Pruebas

`bash tests/run.sh` compila y pasa, en este orden, el formato, el mapa de módulos, las reglas de `tools/check.js` y todas las
pruebas. Cualquier fallo hace que falle entero. Cada prueba tiene un tiempo máximo (15 minutos; `SF_LIMIT`, en segundos, lo
cambia): una que se quede colgada se para y falla con su nombre, en vez de agotar el tiempo del trabajo de GitHub sin decir
cuál era (pasó una vez con `tests/contrast.py`, sin que se haya podido repetir). Las pruebas abren la app en un navegador de verdad con Playwright: Chrome (Chromium)
por defecto o, con `SF_BROWSER=webkit`, el motor de Safari (con `SF_BROWSER=firefox`, el de Firefox), sirviendo la app por HTTP
como GitHub Pages (`tests/browser.py`). Con `SF_FONT="DejaVu Sans"` toda la app usa esa letra: el ancho de los textos cambia de
un sistema a otro (la de los ordenadores de GitHub es de las más anchas) y nada debe depender de él; sirve para repetir aquí lo
que falla allí.
Todas entran con una sesión de prueba y sin red hacia Firebase (`tests/init.js`); la cuenta y la nube se prueban aparte, con un
Firebase de prueba en memoria (`tests/fakefb.py`) y, en GitHub, con el emulador de Firebase. Como la app lee sus partes de IndexedDB
antes de pintar y las guarda sin esperar (I-04), `page.goto` y `page.reload` esperan antes a que lo guardado quede escrito
(`savesDone()`) y después a que la app arranque (`window.__ffready`); para leer lo guardado, `tests/init.js` trae `__stored()`.

| Prueba | Qué comprueba |
| --- | --- |
| `tools/format.js --check` y `tools/format_css.js --check` | Que el código y el CSS están formateados y que la línea «Define:» de cada módulo está al día. |
| `tools/modindex.js --check` | Que el [mapa de módulos](modulos.md) está al día. |
| `tools/figure.js --check` | Que `data/figure.js` (el modelo de perfil de las [figuras](figuras.md)) está al día con los puntos del dibujo. |
| `tools/check.js` | Sintaxis, importaciones, orden de carga, identificadores sin declarar, duplicados, acciones sin manejador, botones sin nombre, código muerto y CSS sin usar ([reglas](desarrollo.md#reglas-de-calidad)). |
| `tests/changelog.py` | Cómo lee `build.py` el [historial de cambios](../../CHANGELOG.md) y compone la tarjeta de cada versión, sin navegador: los apartados que ve el usuario, las revisiones (la 1.1.0.1, con su cuarta cifra, enseña lo que arregla y, debajo, lo de la 1.1.0, que ya no sale aparte; las de la 1.0.3, que lo dicen en su entrada), lo que detiene la compilación y el historial de verdad. |
| `tests/merge.test.mjs` | La fusión de datos entre dispositivos (`cloud/merge`), sin navegador: cada lado gana lo suyo, comidas e historial se juntan, lo borrado se borra. |
| `tests/exinfo.test.mjs` | El catálogo de ejercicios (T-05), sin navegador: cada ejercicio de la librería tiene su consejo y su ejecución, y no hay dos iguales ni parecidos (más de la mitad de las secuencias de tres palabras en común), ni un consejo igual a una ejecución. |
| `tests/calc.test.mjs` | Los cálculos (`core/calc` y lo que usa de `core/util`), sin navegador: lo que suma un alimento, un día y un periodo, los objetivos (Mifflin-St Jeor y el reparto de macros, con 5.000 casos al azar), el volumen de una sesión, la mejor marca, el lunes de una semana y las fechas en los cambios de hora, y lo que escribe el usuario (`typedNum`). También las reglas del entreno: en qué se mide un ejercicio, qué serie cuenta para las marcas (de 1 a 30 repeticiones, sin drop sets), la duración sin pausas, la progresión (3.000 sesiones al azar: sube, baja o mantiene, y cada serie parte de su peso), la descarga y el drop set (nunca más que el peso normal) y la suma de kilómetros. Y lo que se reutiliza para ir más rápido: el lunes de cada día (`mondayKey`) y los formatos de fecha (`fmtDate`), iguales a la cuenta directa en todos los días de dos años. |
| `tests/parts.test.mjs` | Cómo se reparte lo guardado en claves (`core/parts`), sin navegador: qué va en el núcleo y qué en cada parte, las comidas por meses, que partir y volver a juntar deja el estado igual, y que una parte dañada o que falta no se da por buena. |
| `tests/rig.test.mjs` | Las [figuras de ejercicio](figuras.md) sin navegador, en los 551 ejercicios y en todo el gesto: cada uno tiene figura, nada sale sin sitio, los codos y las rodillas doblan hacia su lado, ninguna articulación pasa de lo que un cuerpo puede hacer, las manos y los pies llegan a su agarre o a su apoyo, nada se hunde en el suelo (tampoco un pie apoyado plano), el gesto no da saltos, la figura grande cabe en su encuadre en todo momento, en la Smith la barra no se sale de su guía, las palancas de las máquinas no cambian de largo, de pie el peso cae sobre los pies, la barra no atraviesa el cuerpo y los ciclos (correr, pedalear, la escaladora) no tienen costuras; y, en ejercicios conocidos, que los pies no se mueven en la sentadilla, la barra sube casi recta en el press, el cable acaba en la mano, la palada del remo lleva su orden (piernas, tronco, brazos), los puños llegan al saco desde la guardia sin que se muevan los pies y la cuerda de la comba pasa bajo los pies cuando están en el aire. |
| `tests/dominio.test.mjs` | El paso de las cuentas al [dominio nuevo](backend.md#el-dominio-de-las-cuentas) de su correo técnico (`tools/admin/cuentas.mjs`), sin navegador ni Firebase, con una Authentication de mentira que, como Firebase, da por caducadas las sesiones al cambiar el correo: el simulacro no cambia ninguna cuenta y dice si las sesiones se conservan; «aplicar» las pasa todas con su mismo identificador, su contraseña, su rol y sus sesiones abiertas (también si Firebase solo deja devolver su validez en una petición aparte: el ensayo lo nota y las de verdad se pasan así, sin probar otra cosa) y no pasa ninguna si no se conservarían o no se ha podido comprobar; «aplicar-todo» las pasa de todos modos; se puede repetir; sin las reglas nuevas publicadas o si el ensayo falla no se toca ninguna; un usuario ya ocupado no se pasa solo; lo escrito no lleva usuarios ni correos, y los dominios, la clave y los modos son los de la app, las reglas, el servidor de prueba y el flujo de GitHub. |
| `tests/smoke.py` | Arranque, pestañas, entreno completo, comidas, hojas, actualizaciones, política de seguridad y persistencia, en el archivo único y en el paquete. |
| `tests/figures.py` | Las [figuras de ejercicio](figuras.md) en la app: las 551 miniaturas y las 551 hojas «Cómo se hace», una a una; la figura en la lista, la ficha y el entreno; la hoja con detalle (figura grande arriba, músculos en pequeño a la izquierda, texto después), que la figura se mueve, las posturas que se mantienen, los ciclos que no se detienen, los gestos seguidos (el remo, el SkiErg, el saco) que no se paran en los extremos, la cuerda de la comba que da su vuelta por salto, una lista larga que pone sus figuras al deslizarla, a 320 y 768 px, «Reducir animaciones» con dos y con tres posturas y con las de un salto, lo pintado de verdad, que no queda ninguna foto y que un ejercicio propio sigue con sus músculos. |
| `tests/security.py` | Nombres, foto de perfil y datos con HTML malicioso en 47 pantallas, también desde una copia manipulada: no debe ejecutarse nada, ni siquiera sin la CSP; y con la CSP, que lo inyectado no se ejecuta ni conecta con otros sitios. Y una copia de seguridad manipulada entera (código HTML en cada texto, en lugar de cada número y en claves nuevas, con todos los tipos de datos): la app arranca y ninguna de sus 65 pantallas y avisos lo ejecuta ni falla. |
| `tests/a11y.py` | Accesibilidad en 47 pantallas: botones con nombre, campos con etiqueta, lo que se toca anunciado como botón, cada hoja, página, aviso o menú anunciado como ventana con nombre y la zona táctil de cada control, medida tocando y con la pantalla quieta (cuenta la zona que responde, aunque el botón se vea más pequeño, y falla si otro control se la quita): en el entreno (a 390 y 320 px), 44 × 44 px; en el resto, ninguno por debajo de 24 × 24 px (WCAG 2.2 AA), y dice cuántos llegan a 44 (el 39 % de 1.865; el 85 % sin las filas de la lista de alimentos, que son más de la mitad). Aparte, que el foco va a cada ventana al abrirla y vuelve a lo que la abrió al cerrarla, también cuando tocar un botón no le da el foco, como en Safari (I-06). También, que la CSP no bloquea nada de la app. |
| `tests/layout.py` | Tamaños de pantalla (auditoría de la V1.0.3): las 47 pantallas a 320 × 568 (iPhone SE), 360 × 740, 430 × 932, 768 × 1024 (tableta) y 1280 × 800 (portátil). En cada una, la página y la ventana de encima no se desplazan en horizontal, nada visible se sale por un lado y ningún texto queda cortado sin puntos suspensivos; en pantallas grandes, el contenido va en una columna centrada. En Chromium, además, que al arrancar con datos nada da un salto (layout shift). Si la página sale más ancha que la pantalla, dice quién la ensancha, también cuando no tiene caja propia (en WebKit, el texto elegido de un `select` cuenta como contenido que se sale): recorta el contenido de cada hijo, de fuera adentro, y se queda con el que más la estrecha. |
| `tests/contrast.py` | Contraste de los textos (WCAG AA: 4,5:1; 3:1 los grandes y los signos que hacen de icono) contra lo que tienen detrás de verdad: dos capturas de cada pantalla, una con las letras transparentes. Los dos temas en las 47 pantallas y, en las principales, sin Cristal, con el Cristal suave y el intenso, y con cada color de acento y uno propio: unos 35.000 textos en 32 configuraciones. Solo en Chromium (los colores son los mismos en cualquier navegador). |
| `tests/features.py` | Nutrición (tipo de día según la rutina, ayudas, botones de cada comida, objetivos a mano que no se pisan, alimentos por grupos), Perfil y Ajustes (sin datos personales, con «Cerrar sesión»), medallas e informe de fallos. |
| `tests/foods.py` | Alimentos en línea con Open Food Facts simulado (ninguna petición sale a internet; I-22): buscador nuevo primero y el antiguo de respaldo, sin los signos de la sintaxis de búsqueda, reintento, caché, un mensaje para cada fallo (sin conexión, saturado, tarda demasiado, sin resultados, sin datos nutricionales) y el código de barras (las dos consultas y su reintento; una cámara que se abre o falla tarde y una respuesta que llega con la hoja ya cerrada no pisan nada). Nutri-Score (F-43) y «Mis alimentos» (F-44): guardar al añadir, sin repetir, borrar, y datos dañados. |
| `tests/programs.py` | Los programas de M3: ciclos de Push Pull Leg y Full Body (semanas que siguen el ciclo, Workout y Nutrición), programas según el sexo, técnicas en los programas y en el entreno (pirámide, drop set, rest-pause, myo-reps), semana de descarga (aviso, hoja, 65 % y 2 repeticiones menos, omitir, configurable), rotación de ejercicios, «Volver a generar» y consejo y ejecución de cada ejercicio. |
| `tests/session.py` | La pantalla de entrenamiento de M4: Tips y Discos con icono, desplegables cortos de tempo y descanso (y que el valor de arriba cambia), peso sugerido (gris, se propaga, pirámide, drop set, historial, registrado al marcar), ventana de cada técnica, superseries y triseries por rondas (10 s, descanso de la ronda, 2:30 por defecto, «Saltar», «Anterior», sin descanso automático, a qué serie va la pantalla; unir y separar, y circuito de cuatro o más), barra inferior pegada al borde y reloj del WOD (anillo, saltar la cuenta atrás, pausa, último minuto, Tabata, EMOM y For time). De la V1.0.1: las herramientas de cada ejercicio alineadas (I-26), WKT y DS/RP (I-25, I-27), «¿Guardar el entreno?» al marcar la última serie (I-28), el paso al día siguiente sin saltar descansos (F-41) y el RPE opcional con su explicación (F-42). |
| `tests/training.py` | El entreno a fondo (auditoría de la V1.0.3): guardar en pausa no cuenta la pausa; reanudar un entreno a medias con el día del plan cambiado (o sin él) sigue con sus ejercicios y guarda cada serie en el suyo; un Swap a mitad deja las series hechas en el ejercicio con el que se hicieron; los arrastres con peso no tienen récords; una serie sin repeticiones, de más de 30 o un drop set no dan marca; la progresión, con cada serie desde su peso y frente a la regla escrita aparte en 60 sesiones al azar; la descarga y el calentamiento, nunca más pesados que la serie; ejercicios propios (sin duplicados, renombrar con todo lo suyo, eliminar); workouts a medio crear, nombres vacíos y días sin ejercicios; y borrar un registro con sus series. |
| `tests/followup.py` | Perfil, ajustes y seguimiento de M5: recordatorio de pesaje (intervalos, «Otro» con tope, cuándo toca, aviso una vez al día, «Mañana», tarjeta del Dashboard, ciclo nuevo al pesarse y el evento .ics), análisis mensual (desde el primer mes, mes por defecto, cifras y comparación, entrenos por semanas, récords, peso y objetivo, alimentación, otros datos, conclusión, ‹ › y el PDF: cabecera, páginas, pie, texto en Windows-1252 y tabla de objetos), nota de actualización con «Cerrar», archivo de copia con nombre fijo y datos dañados. |
| `tests/experience.py` | La experiencia de uso de M6, con gestos táctiles (eventos de puntero, como el dedo) y el reloj de prueba: colores de serie y propio (con su contraste), vista previa, reducir animaciones y pestaña al abrir (F-31); la burbuja de la barra (bajo su pestaña, mantener pulsado y arrastrar, deslizar sin esperar, vibración, cancelar; F-38); deslizar para volver (la página sigue al dedo, cuándo vuelve y cuándo no, dónde no empieza, en qué pantallas vale; F-37); «atrás» del sistema, accesos directos del icono y globo del icono (F-39); el recorrido (cuándo sale, textos, los 5 pasos con su foco, también en un iPhone pequeño, «¡Listo!», solo una vez, desde Ajustes; F-36); y las descargas con la app instalada, que en el móvil abren «Compartir» (PDF del análisis, copia y evento del pesaje; T-06). De la V1.0.1: sin negro al volver deslizando (página de debajo, sin desenfoque mientras se mueve, sin entrada de más del historial en iPhone; I-20), el sonido tras el silencio o una interrupción (I-21, con un AudioContext simulado), el color propio sin repintar la app en cada tono (I-18), la barra sin medir en cada movimiento (I-19), la bienvenida y los datos de una cuenta nueva y Workout sin programa (I-23, I-24), el logo según el tema y el azul de partida (F-40) y el sistema del móvil (T-28). |
| `tests/ux.py` | Avisos, deshacer y «atrás» (auditoría de la V1.0.3): un aviso largo cabe en la pantalla a 320 y a 390 px, no recoge los toques (lo de debajo sigue respondiendo), lo leen los lectores de pantalla y dura más con «Deshacer»; lo que se quita sin preguntar (un alimento de una comida, un ejercicio del día, un plato guardado, una serie ya hecha, las marcas de la semana y la plantilla que se sustituye) vuelve tal como estaba; «atrás» en un grupo de la librería vuelve a los grupos; y, en el paquete, lo que se descarga al usarlo dice «Cargando…» si tarda, avisa si no llega y se puede volver a intentar. |
| `tests/safety.py` | Registro de errores, aviso al usuario de un error que nadie recoge (como mucho uno cada 30 s), datos dañados, aviso al no poder guardar, copias automáticas (una al día, también al volver a la app sin haberla cerrado; si el navegador cierra la conexión con ellas, se vuelve a abrir, y no bloquea a otra pestaña) y pantalla de error de arranque. |
| `tests/storage.py` | Guardado por partes: formato (el núcleo en localStorage y las partes en IndexedDB, con la lista de las que tiene que haber), paso desde localStorage (la V1.0.1) sin perder nada, datos de la serie de prueba (no se migran), escribir solo lo que cambia y en orden (una parte nueva antes de nombrarla, una que sobra después), las partes que la acción dice haber tocado y el repaso de después (también al salir de la app), partes dañadas o que faltan (no se guarda ni se sincroniza nada hasta poder leerlas), sin IndexedDB (todo en localStorage), aviso de espacio y Diagnóstico, falta de espacio, restaurar y borrar (sin conexión, no borra nada) y la pantalla de error. |
| `tests/calc.py` | Cálculos y validación: el total del día y de cada comida frente a la suma de sus alimentos (30 días al azar, también con comidas fuera del reparto del día) y frente al Dashboard; objetivos de kcal y macros (Mifflin-St Jeor, 300 perfiles al azar); gramos, alimento nuevo, peso y datos biométricos imposibles; volumen de un entreno en kg y en lb; 1RM estimado; «Últimos 7 días», y el día anterior y siguiente en los cambios de hora (zona Europe/Madrid). |
| `tests/dashboard.py` | El Dashboard frente a los registros (auditoría de la V1.0.3): con cinco meses de entrenos, cardio, WOD, pesajes, comidas e historial al azar, cada cifra y cada gráfica se compara con la misma cuenta hecha aparte: resumen, columnas de volumen, calendario, semana y rachas, récords y línea de récords, progreso de un ejercicio en sus tres medidas, cardio, peso (con su historial y borrar), Registros, la nutrición de 7 días y el estancamiento; todo se pone al día al guardar y al borrar un entreno. Además, cada CSV exportado (una fila por dato, con sus valores) y la copia de seguridad: restaurada sobre otros datos, deja el estado idéntico. |
| `tests/render.py` | Pintar con cambios mínimos: cada pantalla queda igual que pintada de cero y se conservan foco, texto escrito y desplazamiento. |
| `tests/cloud.py` | La cuenta y la nube con dos móviles: registro e inicio de sesión, sincronización (también sin conexión y con cambios en los dos), preferencias (también el color propio), recorrido de la primera vez (sale en la cuenta nueva y no en el otro móvil), borrar en uno, un índice que nombra documentos que ya no existen (I-11), cambios seguidos en una sola subida (como mucho 30 s después del primero, y ya al pasar a segundo plano), datos del móvil dañados (se vuelven a bajar, sin borrarlos en la nube) o que faltan (no se sincroniza y «Bajar de mi cuenta» los recupera), espera tras cinco fallos, cerrar sesión con un guardado todavía en marcha (no deja datos a medias: sale el inicio de sesión y se puede volver a entrar), Administración, contraseña temporal y sesión caducada (también la espera tras cinco fallos al volver a entrar), el dominio de las cuentas (una cuenta nueva se crea con el de ahora; una con el anterior entra igual y, al pasarla, su sesión sigue abierta y lo que no había subido llega a la nube; si las sesiones no se pudieran conservar, su móvil vuelve a entrar con la contraseña de siempre sin perder nada; el correo técnico no se ve en ningún sitio), fallos y sugerencias (enviar, sin conexión, vista, respuesta y arreglado, también en Perfil), copia de seguridad en la nube (la primera y la semanal solas, a mano, sin pisar una copia con más datos, restaurar), foto con consentimiento, cerrar sesión y borrar todos los datos (también la copia), sin código inyectado ni choques con la CSP. App Check, sobre una compilación con él configurado y su CSP de verdad (`python3 build.py --appcheck`) y con reCAPTCHA y el cambio de tokens simulados: cada petición lleva su token, que se pide una vez por hora; la CSP admite el código, el marco y las peticiones de reCAPTCHA; su sello no se ve ni ocupa sitio; y sin conexión, con reCAPTCHA bloqueado o sin responder, la app entra y sincroniza igual, sin token (el fallo queda anotado una vez). Con el Firebase de prueba (`tests/fakefb.py`) o, con `SF_CLOUD=emulador`, con el emulador. |
| `tests/login.py` | El aspecto del inicio de sesión (F-33): la foto del gimnasio detrás, ya cargada, a toda la pantalla y sin deformarse; siempre en oscuro, también con el móvil en claro, y con el tema del móvil en cuanto se entra; a diez tamaños (del móvil más estrecho a un ordenador, y tumbado), sin nada que se salga de ancho y con cada texto por encima del contraste AA contra lo que tiene detrás de verdad, al entrar y al crear cuenta; en el paquete, la foto es un archivo que el service worker guarda. |
| `tests/deploy.py` | Paquete servido por HTTP: con App Check, si reCAPTCHA no carga (con conexión o en modo avión) la app abre igual y la pantalla de error de arranque queda solo para el código de la propia app; service worker (el código sale de la caché sin volver a pedirlo y lo demás se revalida; si un trozo de código no llega al instalarse, no se guarda una página a medias y se reintenta), manifiesto con los accesos directos del icono (que abren su pantalla sin conexión y con ella, sin dejar en la caché otra copia de la app con su dirección), sin conexión, código y fotos en caché, carga diferida (WOD, CSV, escáner y el catálogo de ejercicios), aviso de versión nueva (publicando de verdad otra versión), novedades, la revisión de la versión instalada (una cuarta cifra), que se anuncia, llegada de una versión con un número menor (como la 1.0.0 tras la 1.24.0) y de una corrección con el mismo número (sin aviso ni novedades). Al activarse una versión, el código de la anterior se conserva y el de dos versiones atrás se borra. Y la actualización de un móvil que viene del service worker anterior ([`tests/sw-anterior.js`](../../tests/sw-anterior.js), el de hasta la V1.0.2) con la copia vieja que dejaba un acceso directo, con la caché HTTP caducada: el service worker nuevo la borra, «Actualizar» carga la versión nueva, la app sigue abriendo y, mientras tanto, la página abierta de la versión anterior aún carga lo que no había usado. |

## Comparar dos versiones

`bash tests/compare.sh vieja.html nueva.html` compara dos compilaciones del archivo único:

| Prueba | Qué compara |
| --- | --- |
| `tests/perf.py` | No pasa ni falla: mide con muchos datos (1,3 MB) el arranque hasta el primer pintado, lo que tarda un guardado, lo que tarda en pintarse cada pestaña y lo que tarda en abrirse Registros, para comparar dos compilaciones en el mismo ordenador ([Rendimiento](rendimiento.md)). |
| `tests/walk.py` | Paseo aleatorio diferencial: la misma secuencia de toques en las dos; compara pantalla, datos guardados y sonidos paso a paso. Por HTTP, como el resto. Con `window.__ffHintCheck`, cada guardado que dice qué partes tocó se comprueba en vez de repasarlo después (I-10): si cambió otra, el paso queda anotado como error. |
| `tests/shots.py` | 47 pantallas × 6 configuraciones (temas, cristal, tamaños de iPhone), píxel a píxel. |
| `tests/samehtml.py` | El HTML de las 47 pantallas en las dos (`python3 tests/samehtml.py antes.html despues.html`): más rápido y preciso que las capturas cuando el cambio es interno; dice el primer carácter distinto. Con `--mas`, 106 estados: además, las subpáginas de Ajustes, los avisos y los estados de edición. Lo que depende del momento (los tiempos de Diagnóstico, la clase que anima la burbuja de la barra) no se compara: dos compilaciones iguales dan 0 distintas. |

Sirve para demostrar que un cambio interno (una limpieza, un cambio de estructura) no altera nada de lo que se ve ni de lo que se guarda.
Si la versión vieja tiene otros nombres de acciones (de antes de la V1.0.2), un quinto argumento con el mapa de nombres
([`tests/nombres-1.0.2.txt`](../../tests/nombres-1.0.2.txt)) hace que `tests/walk.py` traduzca los suyos a los nuevos para tocar lo
mismo y comparar la misma pantalla, y que `tests/shots.py` abra las pantallas de la vieja con sus nombres.

## En GitHub

GitHub Actions pasa `tests/run.sh` en Chrome y en Safari en cada cambio de `main`, de las ramas de desarrollo (`desarrollo-*`) y de cada solicitud de
fusión, y el trabajo **Reglas y nube** arranca el emulador de Firebase (Authentication y Firestore, con `firestore.rules`) para
probar las reglas (`tests/rules.test.mjs`: qué puede leer y escribir cada cuenta y el admin, también la copia de seguridad y los fallos y sugerencias; una cuenta con el dominio anterior, antes y después de pasarla, y ningún correo que solo se parezca al técnico) y la app entera contra él
(`tests/cloud.py` sobre `dist/emu/stratafit.html`, con el script de verdad de la contraseña temporal). En las solicitudes de fusión, además, compara con la versión anterior (paseo aleatorio y capturas). La comparación es
informativa salvo con la etiqueta **`refactor`**, que exige que no cambie nada.

Desde la V1.0.3, además: el trabajo de Chrome pasa `npm audit` a las dependencias de desarrollo (la app publicada no lleva ninguna
librería de terceros); si encuentra una vulnerabilidad alta o crítica, deja un aviso en la ejecución, sin detenerla. Y el trabajo
**Probar en Firefox** pasa la misma batería con el motor Gecko: es informativo (no detiene la publicación), porque la app se usa
instalada en iPhone (Safari) y en Android (Chrome), y sirve para saber si algo depende de un solo motor. Ya sirvió: en Firefox,
«sin conexión» no corta las peticiones del service worker, y así salió el fallo de las actualizaciones tras abrir un acceso
directo ([auditoría](auditoria-1.0.3.md), SW1), que con los otros dos motores no se veía. Una rareza suya al escribir pruebas:
un contexto de Playwright con rutas (`route`) no abre sin conexión una página que sirve su service worker; por eso lo que
todas las pruebas necesitan simulado (reCAPTCHA) va en un guion de inicio y no en una ruta (`tests/browser.py`).

Los ordenadores de GitHub no tienen la letra de este entorno: la suya (DejaVu Sans) es más ancha. Si algo falla allí y no aquí,
`SF_FONT="DejaVu Sans" python3 tests/….py` lo repite aquí. Y WebKit y Firefox solo están allí: un fallo de uno de esos motores se
lee en el registro del trabajo (las pruebas dicen qué ven al fallar).

Una rareza de WebKit al escribir pruebas: en cada captura (`screenshot`), Playwright mete y quita una hoja de estilos vacía para
acompasar las animaciones, y la política de seguridad de la app la rechaza con un aviso en la consola. Una prueba que capture en
WebKit y vigile la consola tiene que descartar ese aviso mientras captura (`capture` en `tests/figures.py`); por lo mismo, las
demás solo capturan si se les pide una carpeta de capturas.

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
| Actualización (V1.0.3): con la versión anterior instalada y habiendo abierto un acceso directo con conexión, al publicar la nueva sale el aviso; «Actualizar» abre la versión nueva (el aviso puede salir una segunda vez si se pulsa nada más verlo) y la app sigue abriendo después. En iPhone, sin acceso directo: el aviso y «Actualizar» | ☐ | ☐ |
| Globo en el icono: Ajustes → Sonido y avisos → «Globo en el icono de la app» pide permiso de avisos; con el pesaje de hoy pendiente, al salir de la app el icono enseña 1 | ☐ | — |
| Recordatorio de pesaje (F-25): el aviso «Día de pesarse» al abrir la app; «Añadir al calendario del móvil» abre el evento en Calendario con su repetición y su aviso a las 9:00 | ☐ | ☐ |
| Descargas (F-26, F-30): «Descargar PDF» del análisis mensual y «Guardar archivo» de la copia abren «Compartir» (en iPhone, «Guardar en Archivos») y el archivo se abre bien; cancelar no da error | ☐ | ☐ |
| Personalización: un color de serie y uno propio con el selector del sistema; «Reducir animaciones»; «Al abrir la app» con otra pestaña, al cerrar la app del todo y volverla a abrir | ☐ | ☐ |

### La V1.0.3 en el iPhone del propietario

Hecha el 16-11-2026 en un **iPhone 17 Pro con iOS 27.2.1**, al publicar la V1.0.3, con la lista de abajo. Un Android de verdad
no hay: el caso de los accesos directos del icono está probado con el paquete real de la V1.0.2 en Chromium.

| Puntos | Resultado |
| --- | --- |
| 1-3 (antes, con la V1.0.2) | El tempo más largo no movía la pantalla de lado (L2 no se veía en este iPhone). «Entrenos totales» apuntado y copia guardada. |
| 4-5 | Bien: sale la tarjeta de la versión nueva, «Actualizar» abre la V1.0.3 y los datos son los mismos. |
| 6 | **Fallo, corregido el mismo día.** No repetía la tarjeta, pero en modo avión salía «StrataFit no ha podido iniciarse»: con App Check, el script de reCAPTCHA no carga sin conexión y la pantalla de arranque tomaba por fallo cualquier script que no cargara. Ahora solo cuenta el código de la propia app ([Servidor](backend.md)); las pruebas no lo veían porque el reCAPTCHA simulado nunca fallaba al cargar, y ya lo simulan. Publicado como corrección de la misma versión y comprobado por el propietario. |
| 7-14 | Bien. En el 10, borrar un pesaje pide confirmación y no trae «Deshacer»: la lista decía otra cosa y está corregida. |
| 15 | Bien: con App Check configurado, entrar y sincronizar van como siempre y Diagnóstico no enseña errores «App Check». |
| 16-19, 22, 23 | Bien. |
| 20 | Funciona. Al lanzar la lista muy deprisa, hacia abajo o hacia arriba, se ve unas milésimas la zona aún sin pintar, en negro, antes de que salgan las filas. No se ha tocado: ver [lo que queda fuera](figuras.md#lo-que-queda-fuera). |
| 21 | Los ciclos, bien; **el remo, la comba, el saco de boxeo, el SkiErg y la bici de aire había que pulirlos**: es la revisión V1.0.31 ([figuras](figuras.md)). |
| 24-29 (la V1.0.31, ese mismo día) | Bien los seis. Sale la tarjeta «Versión 1.0.31», con lo que arregla delante y lo de la V1.0.3 debajo, y tras «Actualizar» Perfil pone V1.0.31. El remo, el SkiErg, el saco de boxeo, la bici de aire y las tres combas hacen lo que tienen que hacer y **se mueven con soltura**; con «Reducir animaciones», la comba enseña «Inicio» y «Salto». |

App Check quedó configurado ese día (la clave de reCAPTCHA Enterprise y la app web registrada en Firebase) y **sin exigir**: falta
mirar en la consola que las peticiones salen verificadas ([cómo](backend.md#activar-app-check)). Las alertas de Dependabot están
activadas en el repositorio.

**Antes de publicar, con la V1.0.2 instalada**

1. Modelo de iPhone y versión de iOS (con iOS 15, el arreglo de L2 no se aplica).
2. En un entreno, en un ejercicio, «Tempo» → la opción más larga («3/1/X/0 · Pausa abajo y subida explosiva»). Arrastrar la
   pantalla hacia la izquierda: ¿se mueve de lado y deja un hueco a la derecha? (dice si L2 se veía en un iPhone). Después,
   devolver el tempo que tenía, porque se guarda en el programa, y «Salir y descartar».
3. Apuntar «Entrenos totales» del Dashboard y guardar una copia (Ajustes → Copia de seguridad → Guardar archivo).

**Al publicar la V1.0.3** (antes no se puede instalar en el móvil)

4. Abrir con conexión: sale la tarjeta «Versión 1.0.3»; «Actualizar»; en Perfil pone V1.0.3.
5. Los mismos «Entrenos totales», las comidas de hoy y el último peso.
6. Cerrar del todo y abrir: sigue en 1.0.3 y no repite la tarjeta. En modo avión también abre.
7. Repetir el punto 2: ya no debe moverse. Marcar una serie, dejar correr el descanso, terminar y guardar.
8. Quitar un alimento de una comida: el aviso sale arriba con «Deshacer», no lo tapa la isla o el notch, se lee bien aunque
   quede sobre el título «Hoy» (con Cristal es translúcido: el desenfoque de detrás solo se ve en un móvil de verdad) y
   «Deshacer» lo devuelve.
9. Nutrición enseña la semana, y el Dashboard, «Nutrición · 7 días».
10. Dashboard → Evolución del peso → Historial: borrar un pesaje (pide confirmación; no trae «Deshacer»).
11. Librería: crear un ejercicio propio, renombrarlo y eliminarlo.
12. Descargas: el PDF del análisis mensual, «Guardar archivo» de la copia y el CSV abren «Compartir» y el archivo se abre bien.
13. Ajustes → Copia de seguridad: sale la lista de «Copias automáticas en este móvil», también al volver tras un rato con la app
    en segundo plano.
14. Con el tema y el color del propietario, ¿algún texto que cueste leer?
15. Si entra App Check: entrar y sincronizar van como siempre, y en Ajustes → Diagnóstico no hay errores «App Check».

**Las figuras de ejercicio** (salen en la misma actualización; en Safari de iPhone solo las había visto la integración continua)

16. En un entreno y en la librería, cada ejercicio lleva su figura en la miniatura; ninguno lleva foto.
17. Tocar la figura de un ejercicio de máquina o de polea (Jalón al pecho, Prensa, Cruce de poleas): la figura grande se mueve
    con soltura, del inicio al final y vuelta, y el cable sigue a la mano.
18. Uno de varias fases (Burpees, Clean & jerk) y uno que se mantiene (Plancha): el primero pasa por su postura intermedia y
    el segundo se queda quieto.
19. Ajustes → «Reducir animaciones»: en la misma hoja salen las posturas quietas, con su rótulo (dos en un peso muerto o
    una zancada; tres en un burpee).
20. Al deslizar deprisa una lista larga de la librería (Espalda, 64 ejercicios), ¿va fluida? Las figuras de las filas de
    abajo se ponen al acercarse: ¿llega a verse alguna fila con el recuadro vacío?
21. Uno que no para (Bicicleta, Escaladora, Carrera 1 km): gira o da pasos seguido, sin pausa ni vuelta atrás, y en la
    escaladora los peldaños bajan con el pie.
22. En un entreno, la figura del ejercicio queda arriba, junto al nombre, también con el calentamiento desplegado.
23. Registros: los entrenos van del más reciente al más antiguo y cada mes sale una vez.

**Al publicar la V1.0.31**, la revisión con esos arreglos (publicada el 16-11-2026 y pasada ese día en el mismo iPhone: bien)

24. Abrir con conexión: sale la tarjeta «Versión 1.0.31», que enseña primero «Correcciones de la 1.0.31» y, al deslizarla,
    lo de la 1.0.3; «Actualizar»; en Perfil pone V1.0.31.
25. Remo 1000 m: la palada va seguida, sin pararse; primero las piernas, después el tronco y al final los brazos, y el asiento
    corre por su guía.
26. SkiErg 1000 m y Saco de boxeo: las asas bajan por delante del cuerpo hasta los muslos; en el saco, guardia, directo y
    cruzado, con los pies en el suelo.
27. Assault bike calorías: los brazos van y vienen con sus palancas mientras giran los pedales.
28. Comba, Double unders y Comba boxeo: la cuerda da la vuelta entera y pasa bajo los pies en cada salto (dos veces en los
    dobles); en la de boxeo, un pie y después el otro. ¿Se mueve con soltura?
29. Con «Reducir animaciones», la comba enseña «Inicio» y «Salto».

**Al publicar la V1.0.32**, la segunda revisión, que además pone el fondo del inicio de sesión y pasa las cuentas a su
[dominio nuevo](backend.md#el-dominio-de-las-cuentas)

30. Abrir con conexión: sale la tarjeta «Versión 1.0.32», que enseña primero «Mejoras de la 1.0.32» con una sola línea,
    «Corrección y mejoras de la app», y, al deslizarla, lo de la 1.0.31 y lo de la 1.0.3; «Actualizar»; en Perfil pone V1.0.32.
31. Empezar un entreno y bajar hasta el final: el botón blanco pone «Guardar entreno» (antes, «Log out») y cabe entero junto a
    «Salir y descartar». Al pulsarlo pregunta «¿Guardar el entreno?»; «Cancelar» vuelve al entreno.
32. Antes de pasar las cuentas, con la V1.0.32 ya puesta: Ajustes → Cuenta → «Sincronizar ahora» dice «Todo al día».
33. En GitHub, «Pasar las cuentas al dominio nuevo» con `simulacro`: «Las sesiones abiertas se conservan: Sí». Después, con
    `aplicar`: el resumen acaba en «Quedan en el dominio anterior: 0».
34. Cerrar la app del todo y abrirla: entra como siempre, **sin pedir la contraseña**; los entrenos y las comidas siguen ahí y
    Ajustes → Cuenta dice «Todo al día». En Perfil sigue «Administración».
35. Cerrar sesión: el inicio de sesión sale en oscuro, sobre la foto del gimnasio (el rótulo de la pared a la izquierda), y
    todo el texto se lee. Entrar con el usuario y la contraseña de siempre: entra y bajan los datos.
