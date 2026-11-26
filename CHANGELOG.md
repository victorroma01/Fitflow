# Historial de cambios

Todos los cambios importantes de StrataFit, de la versión más reciente a la más antigua. La serie de prueba anterior
(1.19 – 1.24) está en [docs/tecnica/versiones-de-prueba.md](docs/tecnica/versiones-de-prueba.md).

Cada versión se divide en **Novedades**, **Mejoras**, **Correcciones** e **Interno**. La app enseña los tres primeros apartados en el
aviso de versión nueva y en Ajustes (por eso se escriben para el usuario, en frases cortas); **Interno** es solo para desarrollo.
`build.py` lee este archivo: la versión de `APPV` debe tener aquí su entrada o la compilación se detiene.

Una **revisión** arregla una versión ya publicada sin ser otra. La app enseña entonces una sola tarjeta: los apartados de la
revisión y, debajo, los de la versión que revisa (y los de sus revisiones anteriores), cada uno con el número de la suya
(«Correcciones de la 1.0.31», «Novedades de la 1.0.3»).

- **Desde la 1.0.4**, una revisión lleva una cuarta cifra: 1.0.4.1 es la primera revisión de la 1.0.4, y no hace falta decir
  más. El aviso de versión nueva compara todas las cifras: 1.0.4.1 es posterior a 1.0.4 y anterior a 1.0.5.
- **Las revisiones de la 1.0.3** se numeraron añadiendo una cifra al tercer número (1.0.31) y dicen, antes de su primer
  apartado, «Revisión de la [1.0.3]». La 1.0.32 no llegó a publicarse: pasó a ser la 1.0.4. Desde la 1.0.4, el aviso y
  `build.py` las cuentan como 1.0.3.1 y 1.0.3.2. El de la 1.0.31 instalada solo compara tres números y para él la 1.0.4
  sería anterior. Por eso `version.json` lleva en `version` un texto que ese comparador ve como más nuevo y que se lee como
  la versión («1.0.4 de nov. 2026»: sus tres números son 1, 0 y 2026), y el número de verdad en `number`, que es el que
  miran la 1.0.4 y las siguientes. Así la 1.0.31 instalada también avisa, con las novedades, antes de actualizar.
- Antes del primer apartado, una línea que empieza por «> » es el **titular** de la versión: la app lo enseña encima de sus
  apartados.

El formato se inspira en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y la numeración sigue
[versionado semántico](https://semver.org/lang/es/).

## [1.0.4] — 2026-11-25

> Revisión de la aplicación y modelo 3D
>
> Los ejercicios tienen ahora su figura en 3D, la librería está revisada ejercicio a ejercicio y la app, más rápida y más
> cuidadosa con tus datos.

### Novedades
- Modelo 3D: los 525 ejercicios de la librería tienen su figura en 3D, haciendo el ejercicio entero con su material y los
  músculos que trabajan en rojo (principales) y naranja (secundarios). Quieta en las listas, el día, el entreno y la ficha;
  al tocarla, en «Cómo se hace», se mueve con el gesto (con «Reducir animaciones», sus posturas quietas).
- Inicio de sesión con imagen de fondo: un gimnasio visto desde arriba, en gris y a media luz.
- Portadas nuevas para los días de CrossFit, Hyrox y funcional y para sus descansos; con el perfil de mujer, todas.
- Idiomas: la app está también en inglés. Se pone sola en el idioma del móvil (inglés o español) y se cambia cuando
  quieras en Ajustes → Idiomas.
- Aviso legal y Política de privacidad nuevos, también en inglés: se leen sin tener cuenta, desde el inicio de sesión, y en
  Ajustes. Para crear la cuenta hay que aceptar las condiciones (con 16 años o más) y el tratamiento de los datos de salud,
  con su consentimiento explicado entero; con una cuenta que ya tenías, la app te lo pide una vez al abrirla.
- Tus datos, en Privacidad: exportar una copia, escribirnos sobre privacidad, retirar el consentimiento, borrar los datos y
  «Eliminar cuenta», que borra la cuenta y todo lo suyo (también en Ajustes → Cuenta). Una cuenta que lleve dos años sin
  usarse se elimina sola.
- Equipamiento: al final del Overview de cada día, el material que piden sus ejercicios, con sus iconos. Al tocarlo, la
  lista con el nombre de cada cosa.
- Librería de ejercicios renovada: los grupos van en tarjetas con su ilustración (el modelo con el músculo principal en rojo
  y el secundario en naranja; en CrossFit, Hyrox, Funcional y Cardio, su material), su icono y cuántos ejercicios tienen, y
  debajo, la leyenda de los colores.

### Mejoras
- Librería revisada: los músculos de cada ejercicio, comprobados, y fuera los repetidos (el mismo ejercicio con otro nombre).
  Un plan o un entreno guardado con uno de ellos lo sigue enseñando, con la figura y los músculos del que queda.
- Los ejercicios de distancia de Hyrox (trineo, carga de granjero, burpees con salto) llevan sus metros como objetivo.
- El botón que guarda el entreno se llama «Guardar entreno» (antes, «Log out»).
- Fondo de la app liso: negro en el tema oscuro y gris muy claro en el claro.
- Superseries, triseries y circuitos: la etiqueta de cada ejercicio dice solo cuál es y su lugar («SUPERSERIE · 1/2»). Ni
  ella ni la línea del ejercicio repiten ya el descanso («10 s al siguiente», «Descanso de la ronda»): va en cada serie, en
  la columna «Desc.».
- Entreno: fuera el botón «+ Drop set» de debajo de las series. El drop set se sigue eligiendo como técnica del ejercicio.
- «Borrar todos los datos» borra también el sexo del perfil y las copias automáticas del móvil: lo borrado no se recupera.
- Mejoras técnicas y correcciones de errores. Optimización del sistema y funcionalidades.

### Correcciones
- Gráfica de progreso: al elegir un punto que es récord sale «RÉCORD» junto a la cifra.
- Librería: con un solo ejercicio propio, «Mis ejercicios» decía «1 ejercicios».
- El nombre de un programa (Programas y Perfil) va como el resto de títulos.
- Inicio de sesión: el logo llena su marco.

### Interno
- Librería: los grupos en tarjetas (`library/catalog`), con el diseño que aprobó el propietario (`StrataFit_Catalogo`): una
  sola tarjeta para todos, desde `data/catalog` (cada grupo de siempre, sin cambiarle el nombre, con el id de sus imágenes),
  y cada una abre su grupo como antes (`libraryGroup`). Las ilustraciones y los iconos del paquete los prepara
  `tools/catalogo.py`: las ilustraciones, de WebP sin pérdida (732 KB) a WebP de calidad 90 (unos 120 KB, sin diferencia
  visible); los iconos, sin pérdida, en un lienzo de 54 px de alto. `build.py` las mete en `data/media` (`MEDIA.cat` y
  `MEDIA.catIcon`). Diferencias con las referencias, a propósito: el número de cada tarjeta es el de la librería (525
  ejercicios; las referencias suman 551, de antes de juntar los repetidos); en el móvil, dos columnas (tres no caben con los
  nombres legibles) y Funcional y Cardio anchas, cada una en su fila; desde 520 px, tres, como en el diseño; «Mis
  ejercicios» (los del usuario) sigue, con la misma tarjeta sin ilustración; las tarjetas son oscuras también en el tema
  claro. En inglés, los grupos se llaman como en el diseño: «Quadriceps» (antes «Quads») y «Hamstrings & glutes». Fuera la
  rejilla anterior (`group-grid`) y sus estilos. `tests/catalog.test.mjs`, y las tarjetas en `features.py` (orden, números,
  etiquetas, imágenes, leyenda, a 320, 390 y 768 px sin palabras partidas) y en `english.py`.
- «Equipamiento» en el Overview (`workout/equipment`): el material de cada ejercicio lo saca `workout/equipmap` de lo mismo
  con que se dibuja su figura (la familia de movimiento y las palabras de `data/figposes`), con el material de la librería
  para lo que no dicen; un ejercicio propio no pone nada. Los iconos: de los 60 del catálogo del propietario, los 50 que
  hacen falta, en WebP sin pérdida (`tools/equipamiento.py`, 222 KB), y 31 dibujados en SVG con su estilo: la mancuerna,
  lisa, como la pidió el propietario con una captura, y lo que el catálogo no tiene (kettlebell, anillas, TRX, remo
  ergómetro, piscina…). `build.py` los mete en `data/media` (`MEDIA.equip`): archivos del paquete que el service worker
  guarda, o incrustados en el archivo único (pasa de 2,35 a 2,69 MB). En el tema claro van en negro con un filtro.
  `tests/equipment.test.mjs`: los 525 ejercicios piden material conocido, con su icono.
- Versión: la que iba a ser la 1.0.32 (revisión de la 1.0.3, sin publicar) pasa a ser la 1.0.4, con su propia tarjeta, por
  decisión del propietario, en vez de la 1.1.0 que pedía la numeración. El aviso de versión nueva (`isNewerVersion`) y
  `build.py` (`version_key`) cuentan la 1.0.31 y la 1.0.32 como 1.0.3.1 y 1.0.3.2. Cada versión puede llevar un titular
  (`> …`, antes de sus apartados), que la app enseña encima de ellos en el aviso y en Ajustes (`lead`, en `data/release` y en
  `version.json`).
- El aviso de versión nueva en un móvil con la 1.0.31: su comparador solo mira tres números («1.0.4» le parece anterior a
  «1.0.31») y, sin aviso, la app se actualizaba sola al volver a abrirla, sin enseñar nada antes. `build.py`
  (`legacy_version`) escribe en `version.json` un `version` que ese comparador ve como más nuevo y que, en el título del
  aviso, se lee como la versión: «1.0.4 de nov. 2026» (el punto entre el 0 y el 4 es otro carácter, U+2024, para que no
  cuente como separador; los tres números que ve son 1, 0 y 2026). El número de verdad va en `number`, que es lo que leen la
  1.0.4 y las siguientes (`fetchVersionInfo`, `plainVersion`). Comprobado con la 1.0.31 publicada, compilada de su etiqueta:
  avisa, enseña la tarjeta y actualiza; y sin navegador, con su comparador copiado tal cual (`tests/aviso.test.mjs`).
- Figuras de ejercicio: el modelo 3D sustituye a las figuras de perfil ([Figuras](docs/tecnica/figuras.md)). El motor y sus 82
  familias de movimiento están en `src/fig3d` (scripts clásicos, los mismos que usan las páginas de revisión de
  `tools/figuras3d`); `build.py` (`motor3d_js`) los mete en el molde `extras/motor3d`, dentro de una función que les pasa el
  mapa muscular y las regiones de cada músculo en vez de `window` (así van en modo estricto), y `core/lazy` (`loadFigures`) lo
  carga con `extras/figure3d` la primera vez que hace falta una figura: unos 340 KB (130 KB comprimidos) que solo se
  descargan al usarlos. Lo que carga al arrancar baja de 578 a 485 KB: fuera las figuras de perfil (`extras/figure`, `moves`,
  `rig` y `gear`, `data/figure`, `tools/figure.js` y `tests/rig.test.mjs`).
- Miniaturas (`extras/pictures`): la figura quieta, sin el rayado y con los tonos oscuros aclarados, encuadrada con
  `Fig3D.bounds` y pasada a WebP (PNG donde no hay WebP) de 72 px por la densidad de la pantalla. Se guardan en memoria y en
  el móvil (IndexedDB, base `fffig`: el tipo y los bytes de cada una, con la huella de las figuras y el tamaño): la siguiente
  vez salen al momento, sin el motor, y una actualización que no cambie las figuras no las hace dibujar otra vez. Mientras,
  su hueco. Las que se ven se dibujan ya, de dos en dos; las demás, de una en una y solo con la pantalla quieta y sin una
  figura grande moviéndose, para que deslizar una lista o marcar una serie no dé tirones; se deja de dibujar lo que ya nadie
  espera. Las del plan se dibujan en un rato libre tras abrir la app. La figura grande, en un sitio de proporción fija (4:3),
  solo se dibuja mientras se ve y nunca ocupa más de la mitad del tiempo; en un móvil lento va sin el rayado de los músculos.
  Quieta, enseña el inicio y el final o las posturas más distintas de un gesto con su propio reloj (hasta tres).
- Encuadres ya calculados (`tools/figboxes.js` → `data/figboxes`): lo que ocupa el gesto de cada ejercicio, el momento y el
  recuadro de su miniatura y los de sus posturas quietas. Antes, al abrir «Cómo se hace» la app dibujaba la figura trece veces
  solo para encuadrarla (unos 50 ms; 200 ms en un móvil lento, mientras la hoja entra). La huella de lo que decide cómo se ve
  una figura va también aparte (`data/figstamp`), y la batería comprueba que las dos están al día.
- `Fig3D.bounds`: lo que ocupa un dibujo del motor, recorriendo sus etiquetas, sin la página; da lo mismo que `getBBox` pieza a
  pieza en la cuarta parte de tiempo. Las páginas de revisión encuadran con él: antes, `getBBox` de cada grupo dejaba fuera el
  desplazamiento de los discos de la barra.
- Las figuras se hicieron y revisaron por lotes, cada uno con su página: sentadillas, press de banca y de hombro (57);
  jalones, remos y dominadas (54); piernas (65); brazos (75); pecho y hombros (72); core y el resto de pierna (82); CrossFit,
  Hyrox y funcional (70); y cardio (50). Antes de cada página, las pruebas de `tools/figuras3d`: manos que no llegan, pies
  fuera del suelo, el material contra el cuerpo, el grosor del dibujo, las piezas fijas y los saltos de un fotograma a otro.
- `data/figposes`: cada ejercicio con todas sus palabras para el 3D (el material, el agarre, el banco, la pausa), que antes
  añadía `tools/figuras3d/datos.mjs` al sacar cada lote.
- Librería: fuera 26 ejercicios repetidos (de 551 a 525; los dos últimos, Single unders, que era la Comba, y Cinta inclinada,
  que era la Caminata inclinada, que dicen ahora lo de los dos), con su nombre en `data/aliases` (`EX_RETIRED`) para que lo guardado
  con ellos siga encontrando el que queda (`liveName`, también para la figura), y los músculos de los ejercicios de cada lote,
  comprobados con su figura. Los de distancia de Hyrox, en metros por su nombre (`core/calc`, `unitFromName`).
- Figuras 3D: si el motor no se puede descargar (sin conexión y sin el código guardado aún, o una página abierta de una
  versión que ya no está en el servidor), las miniaturas esperan en su hueco y el motor se vuelve a pedir a los 4 s, a los 8…
  hasta cada 5 minutos, o ya al volver la conexión o al abrir una figura grande (`extras/pictures`, `figures`). Antes lo pedía
  cada miniatura de la cola, sin pausa (169 peticiones en dos segundos y medio con 59 en cola) y llenaba el registro de errores.
  Salió al pasar las pruebas en Safari, que aquí va sin service worker; `tests/deploy.py` lo comprueba en los tres motores.
- Carga diferida (`core/lazy`): al reintentar una descarga que falló, el archivo se pide con otra dirección porque el
  navegador recuerda el fallo. La dirección se leía del mensaje del error, y Safari no la da («Importing a module script
  failed.»): ahora, si falta, se lee de lo que se iba a importar (`importedUrl`).
- Pruebas en Safari (WebKit), que hasta la solicitud de fusión no se habían pasado con las figuras 3D ni con el inglés: el
  aviso de WebKit por una lectura de Blob cortada al recargar no cuenta como error de página (`tests/browser.py`,
  `BLOB_NOISE`); la captura de `tests/figures.py` descarta también el bloqueo de la hoja de estilos que mete Playwright; el
  rojo de una miniatura se mide con el margen de los tres motores; y, sin service worker, `tests/deploy.py` no cuenta el 404
  de un archivo de código de una versión que ya no está en el servidor.
- Una recarga no es otra ventana (`core/persist`, `core/boot`): al recargar a los pocos segundos de guardar algo, la página
  nueva podía enseñar «La app está abierta en otra ventana» con una sola abierta (la protección es de esta versión: no llegó
  a publicarse así). La página anterior sigue viva un momento: el aviso de lo último que guardó le llegaba tarde a la nueva, y
  lo que va a IndexedDB podía terminar de escribirse con la nueva ya abierta. Ahora el aviso de algo que la página ya tiene
  no cuenta (`coreAtLoad`), y si quien ha guardado después es la página anterior de la pestaña (cada marca dice de quién es, y
  la que se cierra deja dicho quién era: `savedByPredecessor`), la nueva se recarga sola, sin aviso. La recarga que pide la
  app (`reloadApp`) hace antes el repaso pendiente. Hacía fallar `tests/a11y.py` una de cada varias veces; las pruebas piden
  ahora ese repaso antes de recargar (`tests/browser.py`), y `tests/storage.py` comprueba los dos casos y catorce recargas
  seguidas.
- `tests/figures.py`: el ciclo de una figura se mide desde que está en marcha (en Firefox arranca unos fotogramas más tarde).
- Prueba nueva, `tests/library.test.mjs` (sin navegador): que los programas, los cambios y los días por nivel, las plantillas
  del programa guiado, los grupos de rotación y los otros nombres del buscador solo nombran ejercicios de la librería; que cada
  ejercicio tiene su figura; y que de cada ejercicio juntado el nombre viejo ya no está, el que queda sí, y lo guardado con el
  viejo se mide en lo mismo.
- Clases CSS, quinto lote: las siete de las figuras, que esperaban a las figuras nuevas (`fgs` → `figure-stage`, `hwm` →
  `howto-head`, `hwf` → `howto-maps`, `hwl` → `howto-muscles`, `anb` → `anatomy-box`, `anf` → `anatomy-full`, `anl` →
  `anatomy-legend`) ([clases CSS](docs/tecnica/clases.md)).
- `build.py`: la entrada del paquete es la de `main.js`. Con más `import()` dinámicos, esbuild ya no la listaba la primera.
- Pruebas: `tests/fig3d.test.mjs` (el motor tal como va en la app, en los 525 ejercicios y en todo el gesto; encontró que los
  guantes del saco pedían un color de brillo que no tenían) y `tests/figures.py`, rehecha para el 3D (202 comprobaciones).
- Entreno: el botón que guarda el entreno se llama «Guardar entreno» (antes, «Log out», que suena a cerrar la sesión de la
  cuenta), también en los textos que lo nombran. La etiqueta de un bloque (`blockBadge`, en `workout/day`) ya no lleva «10 s
  hasta el siguiente» ni «descanso de la ronda», y la línea de objetivo de un ejercicio de un bloque (`targetLine`, en
  `workout/targets`) tampoco dice su descanso: va en la columna «Desc.» de cada serie (un ejercicio suelto sigue diciendo el
  suyo). Y fuera el botón «+ Drop set»
  (`addDropSet`, en `workout/session`), por decisión del propietario; la técnica Drop set del ejercicio sigue igual.
- Inicio de sesión (F-33, T-18, que estaba pospuesto): detrás va la imagen de un gimnasio visto desde arriba, del propietario
  (hecha con Gemini: ni el sitio ni la gente son reales), en gris y desenfocada, a media luz, como en su ejemplo
  (`tools/fondo.py`). La pantalla va siempre en oscuro, también su tarjeta, tenga el móvil el tema que tenga, y cada texto
  suelto lleva su propio velo para leerse también sobre la parte clara de la imagen. Debajo de la tarjeta, menos texto: al
  crear cuenta ya no hay nota (lo que se guarda lo cuenta Privacidad) y el aviso de reCAPTCHA es una línea, «Protegido por
  reCAPTCHA.». Desde el 2 de abril de 2026, con el sello de reCAPTCHA oculto, sus preguntas frecuentes solo piden decir que
  se usa y piden quitar las referencias a las condiciones de Google, que tampoco nombra ya Privacidad.
- Fondo de la app: liso, negro (`#000`) en el tema oscuro y gris muy claro en el claro, con cualquier estilo y color. Con
  Cristal llevaba detrás unos brillos del color de acento (`body::before`, en `css/90-glass`), que ya no están; la vista previa
  de Cristal en Tema y estilo, igual. La barra del sistema (`theme-color`) y el manifiesto, también en negro.
- Portadas de los días, con imágenes del propietario (hechas con Gemini; `tools/portadas.py`): las de los días de CrossFit,
  Hyrox y funcional (SkiErg y remo, trineo, wall balls, arrancada, thrusters, box jumps y burpees, carga de granjero y, en la
  simulación de Hyrox, una competición), un descanso propio para las semanas que los tienen (Hyrox / CrossFit, Híbrido) y, con
  el perfil de mujer, las de una modelo para todas; la de competición, la del trineo mientras no haya otra (`workout/images`).
  Un día cuyo nombre no dice nada lleva la de su primer ejercicio, sin repetir la de otro día así de la semana (el Full Body C
  empieza por pierna, como el A: lleva la de pecho): los de Full Body, «Glúteo (fuerza)» y «Glúteo e isquios» se quedaban sin
  ninguna. Los workouts personalizados pueden elegir cualquiera; sin elegir, la de sus ejercicios. La tarjeta del
  día se oscurece más arriba: con el 13 % de antes, su nombre no llegaba al contraste AA sobre la foto de espalda ni sobre las
  nuevas más claras. Van en WebP, a 704 × 440 y en gris (unos 10 KB cada una): `build.py` admite .webp y la carpeta de mujer.
- Repaso técnico: las reglas de las portadas, sus nombres y sus grupos (`data/photos`, `workout/images`) y los programas que se
  añadieron después (Híbrido, Full Body y Glúteo y pierna, en `data/library`) están ya en su sitio, sin parches encima; el
  contenido es el mismo.
- Rendimiento: la sincronización recuerda la huella de cada elemento con su texto y solo la vuelve a calcular si cambió
  (`cloud/sync`): mirar qué hay que subir tarda la mitad con años de datos, y se hace en cada sincronización. Buscar un
  ejercicio por su nombre ya no junta y recorre la lista entera cada vez (`exByName`, en `library/model`): lo hacían las
  figuras, las listas y el entreno en curso, una vez por fila. El texto en el que busca el buscador de la Librería se calcula
  una vez por ejercicio. Lo que se pinta es lo mismo carácter a carácter (`tests/samehtml.py`, 106 pantallas).
- Cuentas: el correo técnico de cada cuenta, que nadie ve, pasa a ser `usuario@stratafit-960ec.firebaseapp.com`, con el dominio
  del propio proyecto de Firebase. La app registra con él y entra con él o, si la cuenta aún no se ha pasado, con el anterior
  (`cloud/auth`); las reglas de Firestore admiten los dos mientras tanto. Publicar la versión no cambia nada para nadie. Las
  cuentas se pasan desde GitHub Actions («Pasar las cuentas al dominio nuevo», `tools/admin/dominio.mjs`) conservando sus
  sesiones abiertas: Firebase las da por caducadas al cambiar el correo, y al pasar cada cuenta se le devuelve la validez que
  tenían. Antes de tocar ninguna se ensaya con una cuenta de prueba, que dice si de verdad se conservan; «aplicar» solo las
  pasa si es así ([cómo](docs/tecnica/backend.md#el-dominio-de-las-cuentas)). «Restablecer contraseña» y «Asignar rol»
  encuentran la cuenta con cualquiera de los dos, y «Comprobar Firebase» dice cuántas quedan por pasar.
- Cerrar sesión con un guardado todavía en marcha ya no deja en el móvil el núcleo escrito con sus partes borradas
  (`core/persist`: un guardado pedido antes de borrar el estado ya no escribe nada). Antes, la siguiente apertura se quedaba
  en «No se pudieron leer tus datos» sobre el inicio de sesión, sin poder entrar. Salió al probar el paso de las cuentas con el
  emulador de Firebase.
- Sin sitio en el móvil y con la sincronización en marcha, ya no se pierde nada: lo que el móvil no ha podido guardar sube
  igual a la nube, pero la sincronización no lo apunta como sincronizado hasta que está guardado (`savesBroken`, en
  `core/persist`; `saveMeta`, en `cloud/sync`), y lo que baja de la nube se apunta cuando ya está escrito. Antes, al volver a
  abrir la app, al móvil le faltaba ese entreno y, como constaba que lo había tenido, la nube lo daba por borrado y lo borraba
  también allí. Pasaba igual en la 1.0.31 publicada.
- La app abierta dos veces sobre lo mismo guardado (dos pestañas o, en Android, la app instalada y una pestaña; en el iPhone,
  la app instalada guarda aparte de Safari): guarda una sola cada vez. Cada guardado deja una marca (`ffrev`) y, antes de
  escribir, se mira que siga siendo la que esta apertura conoce; si otra ha guardado después, esta se queda atrás: no guarda,
  no sincroniza, no toca el entreno en curso y se recarga con lo último, sola si no se estaba viendo y con el aviso «La app
  está abierta en otra ventana» si sí (`core/persist`, `core/boot`). Antes, la segunda pisaba lo de la primera y la
  sincronización borraba de la nube lo que a esa le faltaba; también en la 1.0.31. El entreno en curso lo lleva quien lo
  empieza o lo reanuda, y una ventana sin entreno ya no borra el de otra (`workout/resume`)
  ([la app abierta dos veces](docs/tecnica/estado.md#la-app-abierta-dos-veces)).
- Arranque (`core/boot`): `start` es ahora la lista de sus pasos, cada uno con su nombre (los relojes del entreno, lo que quedó
  a medias, el entreno por reanudar y lo de después del primer pintado). Hace lo mismo y en el mismo orden.
- Revisión de la versión antes de publicarla: qué se miró, lo encontrado (lo de los dos puntos anteriores), lo comprobado y lo
  que queda por decidir, en [docs/tecnica/revision-1.0.32.md](docs/tecnica/revision-1.0.32.md). Pruebas nuevas en
  `tests/cloud.py` (el móvil sin poder guardar y la misma cuenta en dos pestañas) y en `tests/storage.py` (la app abierta dos
  veces); cada una falla si se quita su parte de la corrección.
- `tests/walk.py`: el paseo que compara dos compilaciones ya no da por distinta la misma pantalla según el momento en que mira
  las figuras de los ejercicios, que se mueven y se pintan poco a poco. Pasaba incluso entre dos copias de la
  misma compilación, sobre todo en GitHub. Ahora compara qué figura grande es, no su fotograma, y espera a que las pequeñas
  de las listas estén pintadas.
- Un guardado que falla con otro esperando detrás ya no deja el núcleo nombrando una parte que no se escribió
  (`core/persist`, `writeIdb`). Los guardados se deciden al momento, dando por escrito lo que el anterior todavía escribe; si
  ese fallaba (el móvil sin sitio), el siguiente podía escribir el núcleo con un mes de comidas nuevo que no estaba. Al volver
  a abrir la app salía «No se pudieron leer tus datos» y no dejaba guardar ni sincronizar. Ahora los decididos detrás de uno
  fallido no se escriben, lo que se sabe de cada clave vuelve a lo escrito de verdad y el siguiente guardado lo mira todo
  ([si un guardado falla](docs/tecnica/estado.md#si-un-guardado-falla)). Pasa igual en la 1.0.31 publicada (reproducido en
  una compilación suya); el código era el mismo desde la V1.0.2. Lo encontraron las pruebas al azar del guardado y la
  sincronización (más abajo).
- Lo sincronizado que no se pudo apuntar (el móvil sin sitio) se apunta en cuanto el móvil vuelve a guardar bien, sin esperar
  a la siguiente sincronización (`noteWaiting`, en `cloud/sync`), y nunca por delante de lo que todavía se está escribiendo.
  Antes, lo bajado mientras tanto quedaba guardado sin constar como sincronizado y, si se borraba sin conexión antes de la
  siguiente sincronización, volvía de la nube. Queda documentado el caso que no se puede cerrar sin cambiar el formato de lo
  guardado: algo borrado puede reaparecer una vez, sin perderse nada
  ([lo que puede volver a aparecer](docs/tecnica/backend.md#lo-que-puede-volver-a-aparecer)).
- Pruebas al azar del guardado y la sincronización (`tests/syncfuzz.py`, en la batería con diez semillas): dos móviles de la
  misma cuenta hacen secuencias aleatorias de acciones, sincronizaciones y recargas con fallos por medio (el móvil sin sitio de
  seis formas, sin red, cierres de golpe, la app abierta dos veces) y al final se comprueba que no falta nada de lo guardado o
  subido, que no vuelve nada de lo borrado y que los dos móviles y la nube tienen lo mismo. Encontraron los dos puntos
  anteriores. Para saber si detectan fallos de verdad se quitó, una cada vez, cada protección del guardado y de la
  sincronización (diez): las pruebas al azar fallan con las diez, y con cada una falla también una prueba fija de
  `tests/cloud.py` o `tests/storage.py` (la de «lo subido se apunta cuando el móvil ha terminado de guardarlo» es nueva)
  ([pruebas al azar](docs/tecnica/pruebas.md#pruebas-al-azar-del-guardado-y-la-sincronización)).
- Tipos comprobados (`tools/types.js`, en la batería): el comprobador de TypeScript pasa por todos los módulos, que siguen
  siendo JavaScript, con sus tipos en comentarios. Falla si se usa una clave de `S` que no existe, un valor de otro tipo o una
  función con lo que no es; en los nueve módulos del guardado y la sincronización, además, todo lleva su tipo y nada que pueda
  ser `null` se usa sin mirarlo. La forma de `S`, de `W` y de sus datos queda escrita en `src/types`. Solo se han añadido
  comentarios: la app compilada es idéntica, byte a byte, a la de antes de añadirlos
  ([tipos comprobados](docs/tecnica/tipos.md)).
- Pantallas legibles: las plantillas `html` largas van en varias líneas, con cada etiqueta sangrada según lo que contiene,
  en vez de en una sola línea de hasta 1.500 caracteres. Dentro de una plantilla `html`, un salto de línea no forma parte
  del HTML (entre dos atributos es el espacio que los separa): `build.py` los quita de la copia que compila
  (`tools/templates.js`), y se rechazan donde se esperaría un espacio, como entre dos palabras. `npm run format` reparte
  solo las que pasan de 140 columnas: 429 de las 657. La app compilada es idéntica, byte a byte, a la de antes de
  repartirlas; lo único que cambia es anterior a la regla: la pantalla del análisis mensual ya no lleva en su HTML los seis
  saltos de línea que tenía escritos (no se veían). Los dos módulos que reescribían las figuras nuevas siguen ya la regla
  ([plantillas HTML](docs/tecnica/desarrollo.md#plantillas-html)).
- Nombres legibles para las clases CSS. Primer lote: las 53 de dos letras (`cd` → `card`, `sp` → `sheet`, `mu` → `muted`…).
  Segundo lote: 104 de las piezas comunes, el entreno, la librería, los programas y la descarga (`dgc` → `dialog-box`,
  `eqb` → `filter-btn`, `lvp` → `level-pill`, `dlo` → `deload-skip`…). Tercer lote: 117 del seguimiento, la apariencia, el
  recorrido, el primer arranque, la cuenta y el perfil (`rnp` → `release-notes`, `trtp` → `tour-tip`, `lgc` → `login-card`,
  `srl` → `setting-label`…). Cuarto lote: 61 del WOD, el resumen del entreno, las medidas y la nutrición (`f2t` → `wod-time`,
  `f2dc` → `delta-chip`, `mnk` → `goals-ring`, `nwd` → `nutri-week-day`…). Quedan cinco que no tienen estilo (las siete de
  las figuras, en el quinto lote, más arriba).
  `tools/classes.js` las cambia a la vez en los estilos, el código y las pruebas, y solo donde el nombre es una clase. Lo que
  se ve no cambia: con el mapa `tests/clases-1.0.32.txt`, que traduce los nombres de la versión anterior, el HTML de las 106
  pantallas es el mismo, el paseo al azar no encuentra diferencias y las 282 capturas salen iguales, píxel a píxel. La app
  pesa 14 KB más entre los cuatro lotes. Fuera, de paso, siete reglas de estilo que ya no usaba nadie (`.r` y `.ver`) y que
  `tools/check.js` no veía, porque sus nombres son también palabras del código. Y una comprobación nueva en la batería
  (`tools/classes.js --check`): toda clase que el código pone o busca, y toda la que buscan las pruebas, tiene que estar en
  `src/css`, así que una mal escrita, o una renombrada que vuelva con su nombre viejo al fusionar una rama anterior, ya no
  pasa sin que nadie lo vea ([clases CSS](docs/tecnica/clases.md)).
- Gráfica de progreso: al elegir un punto que es récord sale «RÉCORD» junto a la cifra. No salía nunca: la cifra se pintaba
  antes de calcular qué puntos son récord. Ahora se calcula al sacar los puntos (`progressSeries`).
- Programas y Perfil: el nombre de un programa va como el resto de títulos, en el color del texto y sin las letras separadas.
  Su clase se llamaba igual que la de la etiqueta «RÉCORD» (`pgr`) y los dos estilos se mezclaban; ahora son `program-row` y
  `record-tag`.
- Inicio de sesión: el logo llena su marco. Se dibujaba más pequeño y algo estrecho (92 × 100 en un marco de 120 × 120): su
  clase se llamaba igual que la del botón «Privacidad» (`lgl`) y recibía su relleno. Ahora son `login-logo` y `login-link`.
- El aviso de versión nueva compara todas las cifras de la versión (`isNewerVersion`), no solo tres: a partir de ahora la
  revisión de una versión lleva una cuarta cifra (1.1.0.1), que `build.py` reconoce sin más como revisión de la de sus tres
  primeras. La cuenta la hace la app ya instalada, así que vale para lo que se publique después de esta.
- Pruebas: `tests/login.py` (el fondo del inicio de sesión a diez tamaños, con el contraste de cada texto, y lo que va debajo
  de la tarjeta), `tests/covers.py` (la portada de cada día por programa y por sexo, los descansos, los workouts personalizados
  y el texto de la tarjeta del día sobre las 22 portadas), `tests/smoke.py` (el fondo de la app, liso, con Cristal y sin él),
  `tests/cloud.py` (un cambio hecho en su sitio cuenta como pendiente), `tests/training.py` (buscar por nombre da lo mismo que
  recorrer la lista), `tests/perf.py` (mide también el buscador de la Librería),
  `tests/dominio.test.mjs` (el paso de las cuentas, con una Authentication de mentira), `tests/cloud.py` (una cuenta con el
  dominio anterior entra, se pasa y su sesión sigue abierta), `tests/rules.test.mjs` (los dos dominios, y ninguno que solo se
  parezca) y la cuarta cifra en `tests/changelog.py`, `tests/followup.py` y `tests/deploy.py`.
- Documentación: la V1.0.31 comprobada en el iPhone del propietario, las versiones 1.0.3 y 1.0.31 en la documentación
  funcional y el estado de App Check (en marcha, sin exigir); el pendiente 7 de la auditoría (el nombre de «Log out»), hecho.
- Idiomas ([cómo está hecho](docs/tecnica/idiomas.md)): el código y los datos siguen en español y el inglés se aplica al
  pintar, con el español de clave. `core/util` decide el idioma al cargar (`LANG`: el elegido en Ajustes, `fflang`, o el del
  móvil; `LOCALE` para fechas y números) y `src/index.html` hace la misma cuenta antes de que cargue el código (`<html
  lang>`, las pestañas, el manifiesto en inglés y la pantalla de error del arranque, escrita en los dos). En inglés,
  `core/boot` carga el diccionario antes del primer pintado (`loadEnglish`: `i18n/en-ui`, `en-library`, `en-foods`,
  `en-programs` y `en-more`, unos 160 KB que en español no se descargan) y `core/html` traduce cada plantilla: el texto
  entre etiquetas y los atributos que se leen son frases, con sus valores como `{0}`; un valor que es una frase del
  diccionario se traduce donde se lee, nunca en un `value`, un `data-…` o una clase. Los textos compuestos se escriben con
  ``say`…` `` en vez de sumando trozos (unas 330 sumas cambiadas), y lo que no pasa por una plantilla, con `tr()` (el reloj
  del WOD, la imagen para compartir, el PDF del análisis, el `.ics` del pesaje, los nombres de archivo). Los consejos y la
  ejecución de los 525 ejercicios van en `i18n/en-exinfo`, que se carga en lugar de `data/exinfo`.
- Lo que se guarda no depende del idioma: va en español y se traduce al enseñarlo (el título y el resultado de un cardio o
  de un WOD ya no se componen con el idioma de la app). Una cuenta sirve igual en un móvil en español y en otro en inglés.
- La nota de cada versión en inglés: `CHANGELOG.en.md`, que `build.py` (`english`) mete en `data/release` y en
  `version.json` como `en`, al lado de la española; la compilación se detiene si la versión no la tiene o si no dice lo
  mismo. Las apps instaladas hasta la 1.0.31 no miran ese campo.
- `tools/i18n.js` (en la batería, `--check`): saca del código las frases que la app va a buscar, con las mismas claves, y
  dice cuáles faltan en el diccionario y cuáles sobran; avisa de un texto escrito en la página sin `tr()`, de una plantilla
  con texto al cargar un módulo y de un `raw()` de una clase que es una frase. Lo que no se traduce (igual en inglés, o no
  se enseña) está en `tools/i18n-skip.json`.
- Pruebas del inglés: `tests/i18n.test.mjs` (el motor, sin navegador), `tests/english.py` (qué idioma sale con cada móvil y
  cada elección, Ajustes → Idiomas, las 107 pantallas y otras doce en inglés sin un texto en español a la vista, el PDF, la
  imagen y los archivos, y que con los mismos pasos se guarda lo mismo en los dos idiomas), el catálogo en inglés en
  `tests/exinfo.test.mjs`, la nota en inglés en `tests/changelog.py` y el manifiesto y los trozos del diccionario en
  `tests/deploy.py`. Las demás pruebas abren la app con el navegador en español (`tests/browser.py`); los tamaños de
  pantalla y las zonas táctiles (`tests/layout.py`, `tests/a11y.py`) se pasan además en inglés (`SF_LOCALE=en-US`), porque
  los textos miden otra cosa: así salió que «Skip», más corto que «Saltar», dejaba su zona táctil en 38 px. Pintar tarda lo
  mismo en los dos idiomas (medido con la CPU cuatro veces más lenta: las mismas siete pantallas, sin diferencia).

## [1.0.31] — 2026-11-16

Revisión de la [1.0.3]: arregla lo que salió al probarla en un iPhone. No es otra versión, así que la app enseña sus arreglos
en la misma tarjeta que las novedades de la 1.0.3, cada apartado con el número de la suya.

### Correcciones
- Sin conexión: la app vuelve a abrir en modo avión (salía «StrataFit no ha podido iniciarse»). Se corrigió el mismo día en
  que salió la 1.0.3.
- Remo: la palada va seguida y con su orden (primero las piernas, después el tronco y al final los brazos; al revés a la
  vuelta), y el asiento corre por su guía.
- SkiErg: las asas bajan por delante del cuerpo hasta los muslos, sin pararse arriba ni abajo.
- Saco de boxeo: guardia, directo y cruzado, con los pies en el suelo (el de delante quedaba hundido en él).
- Assault bike: los brazos van y vienen con sus palancas, con mucho más recorrido.
- Comba y double unders: la cuerda da la vuelta entera y pasa bajo los pies en cada salto (dos veces en los double unders);
  con «Reducir animaciones», enseña «Inicio» y «Salto».
- Comba boxeo: tiene su propia figura, un pie y después el otro.
- Burpees, correr, gatear y empujar el trineo: la figura grande ya no se sale un momento de su recuadro ni sale más pequeña
  de lo que cabe.

### Interno
- Motor de las figuras (`extras/rig`, `extras/figure`): `flow` (un gesto que va y vuelve sin pausa en los extremos), `hop` (la
  postura intermedia es lo más alto de un salto: se llega frenando y se sale acelerando), la pieza de material `by` (va con
  un punto del cuerpo sin girar con él, como el asiento del remo; con vueltas, gira sobre él a velocidad constante, como la
  cuerda) y `rigMoments` (el encuadre de la figura grande mira los octavos del gesto y cada octavo de vuelta de lo que gira,
  no solo los cuartos). El momento 2 de un ciclo es el 0: antes era medio gesto hacia atrás, que agrandaba el encuadre.
- Las posturas quietas se encuadran con lo que ocupan ellas, no con todo el recorrido.
- Pruebas: `tests/rig.test.mjs` pasa de 31 a 38 (la figura cabe en su encuadre en todo momento, un pie plano no se hunde en el
  suelo, y el remo, el SkiErg, el saco, la bici de aire y la comba hacen lo que tienen que hacer) y `tests/figures.py`, de 145
  a 188 comprobaciones (los gestos seguidos no se paran y vuelven a su sitio, la cuerda gira una o dos vueltas por salto, y
  las posturas quietas de un salto).
- `tests/run.sh`: cada prueba tiene un tiempo máximo (15 minutos): una que se quede colgada se para y falla con su nombre.
- Revisiones (`build.py`, `cards`): una entrada de este historial puede ser la revisión de otra. Su tarjeta (el aviso de
  versión nueva, las novedades y Ajustes) es la de la versión que revisa con lo suyo delante, y `version.json` ya no lleva
  aparte la versión revisada. El número es el de esa versión con una cifra más, que para el aviso es mayor que cualquier
  1.0.x de una cifra: tras la 1.0.31 no puede venir una 1.0.4. `tests/changelog.py` (21 comprobaciones) y la nota de Ajustes
  en `tests/followup.py`.
- Documentación: el resultado de la lista de la V1.0.3 en el iPhone del propietario ([pruebas](docs/tecnica/pruebas.md)) y el
  estado de App Check y de las alertas de Dependabot.

## [1.0.3] — 2026-11-16

### Novedades
- Los ejercicios se ven: cada uno de los 551 ejercicios de la librería tiene su figura haciéndolo, con los músculos que
  trabajan en color y con su máquina, su polea o su material. Al tocarla, «Cómo se hace» la enseña en grande y en movimiento,
  del inicio al final del gesto; con «Reducir animaciones», las posturas quietas.
- Nutrición, la semana: una barra por día con sus kcal frente a tu objetivo, la media de kcal y de proteína y los días en
  objetivo. En el Dashboard, la tarjeta «Nutrición · 7 días».
- Ejercicios propios: desde su ficha puedes renombrarlos (con su historial, sus récords y sus notas) y eliminarlos.
- Evolución del peso: el historial de tus pesajes, que se pueden borrar.
- «Deshacer»: al quitar un alimento, un ejercicio del día, un plato guardado o una serie ya hecha, al reiniciar la semana y al
  guardar una plantilla sobre otra, el aviso trae «Deshacer» durante unos segundos.

### Mejoras
- Todo el texto se lee mejor: se ha medido el contraste de cada texto, con los dos temas, el estilo Cristal y todos los
  colores de acento, y se han ajustado los colores hasta que todos llegan.
- Lo que escribes se comprueba: los gramos, tu peso, tu edad, tu altura y las repeticiones y el peso de una serie solo admiten
  valores posibles (los decimales, también con coma). Los nombres y las notas tienen un largo máximo.
- Peso sugerido: cada serie parte del peso que tuvo la última vez.
- Al borrar un entreno en Registros se borran también sus series: los récords, las gráficas y la progresión se recalculan.
- Los botones pequeños (flechas, − y +, ✕, casillas y desplegables) responden también alrededor: es más fácil acertar.
- Los avisos caben en la pantalla, duran según su largo y no tapan lo que hay debajo. Si algo falla de forma inesperada, la
  app lo dice, y si algo tarda en descargarse, dice «Cargando…».
- Más rápida con muchos datos: Registros se abre más de tres veces antes con cientos de entrenos, y el Dashboard, un 30 % antes.
- La copia automática del día se hace también al volver a la app sin haberla cerrado.
- «Atrás» en un workout que estás editando pregunta si lo descartas, y en un grupo de la librería vuelve a los grupos.
- Las fotos de ejercicio dejan su sitio a las figuras: la app descarga unos 280 KB menos al instalarse.
- Registros va del día más reciente al más antiguo, también si apuntas un cardio con la fecha de otro día.
- Entreno: la figura de cada ejercicio queda arriba, junto a su nombre, y «RIR 1-2», «Descanso 3:00» o «Tempo 3/0/1/0» ya
  no se parten entre dos líneas.
- Evolución del peso: las fechas de la gráfica se leen («28 sept», «oct 2026»).

### Correcciones
- Actualizaciones: si alguna vez abriste la app con conexión desde un acceso directo del icono («Entreno de hoy», «Nutrición
  de hoy» o «Registrar el peso»), al publicarse una versión la app seguía abriendo la anterior, con el aviso de versión nueva
  una y otra vez, y podía dejar de arrancar. Ya no ocurre, y un móvil que se quedó así se arregla solo al abrirla con conexión.
- Con una versión nueva ya descargada, si cerrabas el aviso o estabas en mitad de un entreno, lo que se descarga al usarlo (el
  temporizador WOD, los consejos de un ejercicio, el análisis mensual, el PDF, el CSV, la búsqueda de alimentos en internet y
  el escáner) no se abría hasta actualizar.
- Nutrición: al reducir las comidas al día, lo anotado en las que ya no están se sigue viendo y contando. Y «ayer» ya no se
  salta un día tras el cambio de hora de marzo.
- Entreno: la duración no cuenta las pausas. Reanudar un entreno a medias tras cambiar los ejercicios del día sigue con los
  que empezó (antes no se podía guardar). Al cambiar un ejercicio por otro (Swap), las series hechas se quedan en el suyo.
- Récords: los ejercicios que se miden en metros o segundos ya no salen con un 1RM imposible, y una serie sin repeticiones, de
  más de 30 o un drop set no cuentan como marca. El aviso «Nuevo récord» sale una vez.
- La semana de descarga y el calentamiento, con pesos ligeros, ya no proponen más peso que el normal.
- Con las cargas en libras, el análisis mensual y su PDF van en libras.
- Dashboard: «Últimos 7 días» contaba un día de más de madrugada, y los kilómetros de cardio se redondean bien.
- Los objetivos calculados nunca bajan de 800 kcal ni dan porcentajes imposibles.
- Un workout sin terminar de crear ya no se queda vacío en la lista, un día sin ejercicios no ofrece empezar y un ejercicio
  nuevo con el nombre de otro no se duplica.
- Una copia de seguridad dañada o manipulada ya no puede dejar una pantalla en blanco: lo que no vale se descarta al abrir.
- En móviles estrechos, los grupos de la librería de ejercicios se salían por la derecha.
- Si fallaba la descarga de una parte de la app, no se podía reintentar sin cerrarla. La lista de copias automáticas podía
  fallar al volver a la app tras un rato en segundo plano.
- Con VoiceOver, la página de Ajustes se quedaba sin nombre al cambiar un ajuste.

### Interno
- Auditoría técnica de la V1.0.2 ([informe](docs/tecnica/auditoria-1.0.3.md)): diagnóstico por áreas, lo corregido y lo pendiente.
- `core/calc`: los cálculos (sumas de nutrición, objetivos, volumen, mejor marca, semanas), en un módulo sin estado, con
  `tests/calc.test.mjs` (21 pruebas sin navegador). El Dashboard, Nutrición y el análisis mensual suman con las mismas funciones.
- `tests/calc.py`: las sumas de Nutrición, los objetivos (Mifflin-St Jeor), el volumen de un entreno (kg y lb), el 1RM estimado,
  las fechas en los cambios de hora y la semana se comparan con la misma cuenta hecha aparte, con datos al azar; y la validación
  de lo que se escribe. `typedNum` (`core/util`), `nutriDate` (`core/state`) y `BIO_RANGES` (`core/calc`).
- `tests/contrast.py`: contraste de cada texto contra su fondo real (WCAG AA), 35.000 textos en 32 configuraciones. Colores de
  texto por nivel de Cristal (`css/90-glass`), degradado del acento para lo que lleva texto (`--ag`) y acento acotado detrás del
  texto (`--gmid`); un color propio elige el texto de encima con 4,5:1.
- `tests/samehtml.py`: compara el HTML de las 47 pantallas entre dos compilaciones.
- Fases 4 y 5 de la auditoría. `core/calc` reúne también las reglas del entreno: en qué se mide un ejercicio, qué serie cuenta
  para las marcas (`liftScore`, una sola regla para récords, gráficas, estancamiento, análisis y resumen), la duración sin
  pausas y la progresión (`progressionRule`, `nextWeight`, `deloadWeight`, `dropSetWeight`), con 13 pruebas sueltas más (34).
- `library/custom` (ejercicios propios). Cada entreno y sus series llevan la misma marca (`t`), para borrarlos juntos.
- `core/repair` valida más al arrancar: cada dato de los ejercicios del plan, las fechas y los números de entrenos, historial,
  récords, pesajes y medidas, y la forma de los workouts propios. `tests/security.py` restaura una copia manipulada entera.
- `tests/training.py` (76 comprobaciones del entreno) y `tests/dashboard.py` (39: cada cifra del Dashboard, los CSV y la copia
  de seguridad, frente a cuentas hechas aparte con cinco meses de datos al azar).
- Fases 6 y 7. `core/toast`: aviso con «Deshacer» y región `aria-live`. `core/lazy` (`lazyLoad`): «Cargando…» y reintento
  tras un fallo de descarga (Chrome guarda el fallo de un `import()` mientras dura la página: se reintenta con otra URL).
  Zonas táctiles con pseudo-elementos (`css/97-touch-targets`, clase `tz`): no cambian el dibujo de la pantalla.
- `tests/layout.py` (47 pantallas en 5 tamaños, de 320 a 1280 px: sin desbordes ni textos cortados, y sin saltos al arrancar),
  `tests/ux.py` (26 comprobaciones: avisos, deshacer, «atrás», cargas con mala cobertura) y `tests/a11y.py` mide la zona que
  responde de cada control, con la pantalla quieta (ninguno por debajo de 24 × 24 px; antes, 10).
- Integración continua: `npm audit` en cada subida (avisa, no detiene) y las pruebas también en Firefox (informativo).
- Rendimiento medido frente a la V1.0.2 ([Rendimiento](docs/tecnica/rendimiento.md)): `fmtDate` (`core/util`) reutiliza los
  formatos de fecha y `mondayKey` (`core/calc`) recuerda el lunes de cada día. `tests/perf.py` mide también abrir Registros.
  `tests/samehtml.py` ya no cuenta como distinto lo que depende del momento (Diagnóstico, la burbuja de la barra).
- El aviso breve no recoge los toques (`pointer-events`): con la letra de los ordenadores de GitHub, más ancha, tapaba el
  título de la página y el gesto de volver no empezaba. `tests/browser.py`: `SF_FONT` pone otra letra en toda la app, para
  repetir aquí lo que falla allí.
- Fase 3. `core/idb` (IndexedDB con promesas, para `core/persist` y `system/snapshots`), `core/parts` (cómo se reparte el
  estado en claves, sin estado, con `tests/parts.test.mjs`) y `cloud/docs` (qué va en cada documento de Firestore):
  `core/persist` pasa de 681 a 565 líneas y `cloud/sync`, de 627 a 509. Vistas partidas en funciones con nombre
  (`workout/day`, `profile/analysis`, `nutrition/goals`, `dashboard/reminder`); el análisis mensual y su PDF usan las mismas
  frases. Lo repetido entre módulos, en un solo sitio (`appBusy`, `syncBusy`, `programName`, `startPlanFromWeekOne`,
  `addOwnProgram`, `isPlan`, `mealList`, `readTextFile`, `saveBlob`, `dialogButtons`, `backRow`, `waitingView`…).
- `tests/samehtml.py --mas`: 106 estados (las 47 pantallas y subpáginas, avisos y estados de edición), idénticos antes y
  después de la fase 3.
- Service worker (`static/sw.js`): todo se guarda y se busca por su dirección sin parámetros (`keyOf`). Antes, abrir
  `./?a=peso` con conexión dejaba otra copia del documento con esa dirección, que no se actualizaba y salía antes que la buena
  (la caché devuelve la primera que coincide sin mirar los parámetros). Al activarse, el service worker nuevo borra esas copias:
  así se arreglan los móviles que venían de la V1.0.2 o anteriores. Lo encontró la prueba en Firefox, donde «sin conexión»
  no corta las peticiones del service worker. `tests/deploy.py` (54 comprobaciones) abre un acceso directo con conexión y
  actualiza desde el service worker anterior (`tests/sw-anterior.js`), con la caché HTTP caducada.
- El service worker conserva el código de la versión anterior hasta la siguiente actualización (anota en la caché cuál es
  el de cada versión, `codigo-actual.json`): antes lo borraba al activarse, y la página aún abierta de esa versión ya no
  podía cargar lo que no había usado. La limpieza de la activación no la deja a medias si algo falla (sin espacio, o con la
  nota ilegible). Las dos comprobaciones del WOD de `tests/deploy.py` miraban toda la página, donde «AMRAP» sale siempre: ahora
  miran la hoja.
- En WebKit, el texto de la opción elegida de un `select` cuenta como contenido que se sale si es más ancho que él: el
  desplegable corto del entreno (Tempo) ensanchaba la página a 446 px en las pruebas con móviles de 320 a 430. `.psel` lo
  recorta a lo ancho. `tests/layout.py` dice mejor quién ensancha la página (recorta cada hijo antes de ocultarlo).
- `tests/cloud.py` reconoce cómo dice Firefox que una petición no llegó por falta de conexión.
- App Check (I-05), listo para activarse en cuanto estén sus dos valores de la consola: la CSP abre también las peticiones
  propias de reCAPTCHA (lo piden sus preguntas frecuentes, y faltaba); entrar y sincronizar esperan su token 8 s como mucho y
  siguen sin él si reCAPTCHA falla, tarda o no hay conexión (antes podían quedarse esperando); el fallo se anota una vez en
  Diagnóstico; y el sello de reCAPTCHA no ocupa sitio. `tests/cloud.py` (111 comprobaciones) lo prueba sobre una compilación
  con App Check y su CSP de verdad (`build.py --appcheck`), con un reCAPTCHA de prueba para todas las pruebas
  (`tests/browser.py`). La batería entera pasa también con App Check configurado.
- App Check, activado con sus dos valores (`cloud/config`). Que reCAPTCHA no cargue (sin conexión, un bloqueador) no es un fallo
  de arranque: la pantalla de error de `src/index.html` solo cuenta el código de la propia app. Recién publicada la V1.0.3
  contaba cualquier script, y en modo avión salía «StrataFit no ha podido iniciarse» sobre la app, que funcionaba debajo;
  corregido el mismo día, sin cambiar el número de versión. Las pruebas usaban un reCAPTCHA simulado que nunca fallaba al
  cargar: `tests/browser.py` tiene ahora uno que falla (`__sfRecaptchaFail`), `tests/deploy.py` abre con él el paquete con
  conexión y en modo avión, y `tests/cloud.py` comprueba que la pantalla de error no sale con reCAPTCHA bloqueado.
- Figuras de ejercicio ([Figuras](docs/tecnica/figuras.md)): modelo articulado de perfil, de frente y de espaldas (`extras/rig`,
  `data/figure`, que genera `tools/figure.js`), material (`extras/gear`), 82 familias de movimiento (`extras/moves`) y la tabla
  de qué familia y qué variantes lleva cada ejercicio (`data/figposes`); el dibujo y el movimiento, en `extras/figure`. El codo
  y la rodilla doblan siempre hacia su lado y el brazo se ve en escorzo antes que cerrar el codo más de su tope. Las máquinas
  se mueven como máquinas (en la Smith la barra va por su guía; las palancas giran sobre su eje sin cambiar de largo: `gl`), en
  los pesos muertos la barra sube pegada a las piernas, quien se inclina echa la cadera atrás, en las dominadas el cuerpo sube
  recto y en las zancadas el paso se da por el aire. Lo que es un ciclo (correr, andar, pedalear, la elíptica, la escaladora,
  nadar, el trineo, los gateos, las cuerdas) se escribe como medio ciclo que se repite sin parar con los lados cambiados
  (`cycle`); una postura intermedia puede ser solo el camino (`via`) y no una fase que se enseñe; y una pieza del material
  puede deslizarse con el gesto (`slide`: los peldaños de la escaladora).
- Fuera `library/photo`, las 28 fotos (`src/img/ex`), su CSS y `tests/photos.py`; los otros nombres de búsqueda pasan a
  `data/aliases`. `tests/rig.test.mjs` (31 pruebas: figura, piezas, articulaciones dentro de su recorrido, manos y pies en su
  sitio, suelo, continuidad, guías, palancas, equilibrio, barras que no atraviesan el cuerpo y ciclos sin costuras, en los 551
  ejercicios) y `tests/figures.py` (145 comprobaciones en navegador).
- Listas con figuras: la figura quieta de cada ejercicio se calcula una vez para todos los tamaños, y una lista larga (un
  grupo de la librería, el buscador, «Añadir ejercicio», Swap) solo pinta las de las primeras filas; las demás llevan un hueco
  que se rellena al acercarse a la pantalla (`exPictureLater`, con `IntersectionObserver`) y, en cualquier caso, por tandas
  en el medio segundo siguiente. Abrir de nuevo el grupo de 64 ejercicios o escribir en el buscador cuesta la mitad. La
  figura grande no calcula nada durante la pausa de cada extremo del gesto.
- Repaso de la app (47 pantallas en claro, oscuro, móvil pequeño y tableta): en el análisis mensual y su PDF la línea del
  plan ya no tacha la cifra de una semana; la ficha de un ejercicio propio dice «Toca la imagen»; en una tableta, la cabecera
  fija del entreno (Cristal) lleva las esquinas redondeadas.

## [1.0.2] — 2026-11-12

### Novedades
- Aviso de espacio: si lo que guarda la app se acerca al límite del móvil, te lo dice (como mucho una vez a la semana) y te lleva
  a la copia de seguridad. Diagnóstico enseña el espacio usado.
- En un iPhone con el icono de antes del logo nuevo, la app explica cómo cambiarlo: sincronizar, quitarla de la pantalla de
  inicio y volver a añadirla desde Safari. También en Ajustes → App → El icono nuevo.

### Mejoras
- Tus entrenos, tu historial y tus comidas tienen sitio para años de uso: se guardan en la base de datos del navegador, sin el
  límite de unos 5 MB de antes. Pasan solos la primera vez que abres esta versión.
- Guardar va más rápido con muchos datos: anotar agua o una comida, o cambiar de pestaña o de día, ya no repasa todos tus datos.
- Con VoiceOver, cada hoja, página, aviso y menú se anuncia como ventana; el foco va a ella al abrirla y vuelve al cerrarla.
- La app abre sin volver a descargar su código, y una instalación o actualización nunca deja la página a medias.

### Correcciones
- Si los datos del móvil no se pueden leer, la app no guarda ni sincroniza nada (así no se borran en tu cuenta) y ofrece
  «Reintentar» y «Bajar de mi cuenta».
- Lo que se dañe en el móvil se vuelve a bajar de tu cuenta, en vez de borrarse también allí. Lo mismo al «Restablecer» desde la
  pantalla de error.
- Restaurar una copia con muchos datos ya no falla por falta de espacio.

### Interno
- Código claro (I-17): acciones (R1) y claves del estado (R2) con nombres que se entienden (T-23, [nombres](docs/tecnica/nombres.md));
  `core/schema` las traduce a las claves guardadas, que no cambian. Vistas largas partidas en piezas con nombre (R4). Comprobado
  con 282 capturas, el HTML de cada pantalla y el paseo aleatorio frente a la versión anterior. Los campos de dentro de cada dato
  (R3) no se renombran: obligaría a migrar cuentas, copias y códigos de programa.
- Datos (I-04, I-10): partes en IndexedDB (`ffdata`), con lista de partes en el núcleo (`_pk`), escritura en orden, `partsLost`,
  `savesDone`/`reloadApp`, pistas de `saveState` y repaso a los 2 s; copia previa a restaurar aparte; `system/space`.
  `cloud/sync` olvida las huellas de lo dañado y no sincroniza sin los datos del móvil.
- Rendimiento (T-26): `tests/perf.py` y [rendimiento](docs/tecnica/rendimiento.md), medido frente a la V1.0.1.
- Sin estilos en línea (I-14): clases de `css/99-utilities` y `data-style` con `core/dynstyle`; la CSP solo admite la hoja de la
  app; `tools/check.js` lo vigila.
- Accesibilidad (I-06): `role="dialog"`, `aria-modal` y foco en hojas, avisos, menú y WOD.
- Service worker (I-08, I-09): la instalación guarda la página solo con todo su código; el código sale de la caché.
- Nube: el índice se limpia solo de documentos que ya no existen (I-11); App Check preparado y apagado hasta configurarlo (I-05).
- GitHub Actions (T-24): al publicar, primero las reglas de Firestore y después la app. `tests/deploy.py` anota las peticiones si
  una recarga se queda colgada (I-13).
- Después de publicarla, con el mismo número y sin aviso: la sincronización junta los cambios y los sube como mucho 30 s después
  del primero (antes, 4 s después de cada uno) y al pasar la app a segundo plano, para gastar menos escrituras de Firestore.

## [1.0.1] — 2026-11-11

### Novedades
- Bienvenida al crear una cuenta: gracias por probar la app, aviso de que está en fase de pruebas y tus datos (sexo, edad,
  altura, peso, actividad y objetivo), con los que la app calcula tus calorías y te recomienda programas.
- Las cuentas nuevas empiezan sin programa: Workout te invita a elegir uno con «Seleccionar programa».
- Logo nuevo, también en el icono de la app; y cada acceso directo del icono tiene el suyo.
- Al completar un día pasas al siguiente. Si toca descanso, la app se queda en él hasta que lo marques como completado.
- Nutri-Score de los alimentos que buscas o escaneas.
- Lo que buscas o escaneas se guarda en «Mis alimentos», y cualquier alimento propio se puede borrar.
- Ajustes avanzados: el esfuerzo de cada serie (RPE) es opcional y viene desactivado. Al activarlo, una ventana te explica cómo
  funciona.
- Administración: cuántas cuentas usan iPhone y cuántas Android.

### Mejoras
- El color de partida es el azul del logo; si ya elegiste uno, lo conservas.
- Las series de trabajo se llaman WKT; en un drop set o un rest-pause, solo la fila de debajo lleva DS o RP.
- Al marcar con su casilla la última serie que faltaba sale «¿Guardar el entreno?».
- Los botones de cada ejercicio (Tips, Notas, Tempo, Descanso, Historial, Swap y Discos), con la misma altura y alineados.
- La barra de pestañas va más fluida al deslizar el dedo por ella.
- Elegir un color propio ya no frena la app.
- «Press inclinado en máquina» en lugar del convergente en Bro Split y Push Pull Leg.
- Aviso legal: uso gratuito durante la fase de pruebas, con riesgo de perder datos.
- Diagnóstico dice cuánto tarda en pintarse cada pantalla.
- Al volver a Administración se ve lo ya cargado mientras se actualiza.

### Correcciones
- En el iPhone, deslizar para volver ya no deja la pantalla en negro, tampoco en un entreno.
- El sonido vuelve al quitar el silencio del móvil, sin tener que salir de la app.
- La búsqueda de alimentos y el escáner de códigos ya no fallan a ratos: prueban otro servicio y lo reintentan, y dicen
  claramente si no hay conexión, si el servicio está saturado o si no hay resultados.

### Interno
- Atrás en iPhone (I-20): sin la entrada de más del historial (`core/back`, `core/platform`); mientras algo sigue al dedo, sin
  desenfoque de fondo; rastro de páginas en `core/ui` para ver debajo la página a la que se vuelve.
- Sonido (I-21): el `AudioContext` se reanuda antes de cada aviso, también desde «interrupted», y se suspende al acabar.
- Alimentos en línea (I-22): primero search-a-licious y `cgi/search.pl` de respaldo, reintento, caché de búsquedas y errores con
  nombre; `tests/foods.py` con Open Food Facts simulado. Escáner: cada apertura de la cámara y cada búsqueda por código llevan su
  número (`scanTry`), y lo que llega tarde se apaga o se ignora.
- Barra de pestañas (I-19): medidas guardadas, burbuja sin transición al arrastrar y pintado de la pestaña tras el siguiente
  fotograma. Color propio (I-18): vista previa por fotograma y un solo guardado.
- `system/welcome`, `core/brand`, `workout/rpe` y `tools/marca.py` (logo e iconos desde `src/img/brand`); claves nuevas `np`, `nw`,
  `mv` (cambios de datos de una versión a otra, `core/repair`), `rpe`, y `ns` y `ean` en `cf` y `bc`.
- Perfil de Firestore: campo `os` (T-28), en una escritura aparte; `firestore.rules` lo admite. *Desplegar reglas* ya no toca los
  índices (I-16) y sale `firestore.indexes.json`.
- Cada móvil anota la versión con la que empezó (`ffinst`): si es anterior a la 1.0.1, su icono es el de antes del logo nuevo.
- GitHub Actions prueba las ramas `desarrollo-*`. Publicar en Pages con `upload-pages-artifact@v5` y `deploy-pages@v5`, con
  Node.js 24 (I-07); las pruebas ya corren en Ubuntu 26.04.

## [1.0.0] — 2026-11-04

### Novedades
- Cuentas: entras con tu usuario y contraseña, sin ningún dato personal.
- Tus datos se guardan también en la nube: no los pierdes y puedes usar la app en varios móviles.
- Sin conexión todo sigue funcionando; lo que hagas se sube solo al volver la red.
- Ajustes → Cuenta: el estado de la sincronización, cambiar la contraseña y «Cerrar sesión».
- Programas nuevos: Full Body (entreno y descanso alternos), Glúteo y pierna, y un Push Pull Leg en ciclo de 10 días con un
  descanso tras cada dos entrenos.
- Programas recomendados según seas hombre o mujer, arriba en Programas.
- 10 técnicas de intensidad (pirámide, drop set, rest-pause, myo-reps, cluster, parciales, superserie antagonista, pre y
  post-agotamiento): cada serie enseña la suya.
- Semana de descarga en naranja: peso al 65 % y 2 repeticiones menos con las mismas series; la puedes omitir y, en tus programas,
  elegir cada cuántas semanas toca.
- Cada 5-6 semanas la app propone rotar los ejercicios accesorios por otra variante; también desde el menú de Workout.
- Cada ejercicio tiene su propio consejo en Tips y, al tocar su imagen, cómo se hace paso a paso.
- Superseries y triseries por rondas: tras cada serie, 10 s y la serie del siguiente ejercicio; al acabar la ronda, su descanso
  (2:30 si no eliges otro). Al acabar cada descanso, la pantalla pasa sola a la serie que toca.
- Peso sugerido: el peso que escribes en una serie pasa en gris a las siguientes (en una pirámide, un escalón más); si cambias
  una, las siguientes sugieren el nuevo.
- Al tocar la abreviatura de una serie (PIR, DS, WRK…) se abre una ventana con qué técnica es y cómo se hace.
- WOD: reloj circular con la cuenta en el centro, y la cuenta atrás inicial se puede saltar.
- Recordatorio de pesaje: cada 2 o 4 semanas, cada mes, cada 5 semanas o lo que elijas. Cuando toca, la app te dice «Día de
  pesarse», y puedes añadirlo al calendario del móvil para que te avise aunque la app esté cerrada.
- Perfil → Ver análisis mensual: tus entrenos, tu peso y tu alimentación de cada mes, con gráficas y una conclusión, y en PDF.
- Fallos y sugerencias: lo que envías desde «Informar de un fallo» le llega al administrador, y en Perfil ves si está pendiente,
  visto o contestado, con la respuesta.
- Ajustes → Ver nota de actualización: los cambios de la versión que tienes instalada.
- Copia de seguridad en la nube: una sola, que se hace sola cada semana y puedes restaurar cuando quieras.
- Más colores: 11 de serie (nuevos Rosa, Turquesa, Lima y Grafito) y uno propio, el que quieras, con vista previa; la app ajusta
  sus tonos para que todo se lea bien.
- Recorrido de la primera vez: 5 pasos por lo principal de la app, que puedes omitir. No vuelve a salir, tampoco en otro móvil, y
  está en Ajustes → Ver el recorrido.
- Desliza el dedo de izquierda a derecha para volver atrás en las páginas de dentro.
- Mantén pulsada la burbuja de la barra de pestañas y arrástrala hasta otra pestaña.
- En Android, el botón o gesto atrás cierra lo que tengas abierto en vez de salir de la app, y al mantener pulsado el icono salen
  accesos directos a Entreno, Nutrición y Peso.
- En iPhone, el icono de la app puede enseñar lo que tienes pendiente (el pesaje de hoy y las respuestas nuevas).

### Mejoras
- Más privacidad: la app ya no guarda nombre, email, teléfono ni fotos de progreso (ni sus dos logros).
- La foto de perfil se sube solo si das tu consentimiento, y la puedes quitar cuando quieras.
- La app ocupa algo menos: se han quitado código y estilos que ya no se usaban.
- Programas revisados: Bro Split y Torso / Pierna con técnicas de intensidad, y en el programa guiado «Otra variante» pasa a
  «Volver a generar», con su icono.
- Entreno más limpio: Tips y Discos con icono, y los desplegables de tempo y descanso solo dicen «Tempo» y «Descanso» (el valor
  está arriba, en el objetivo).
- La barra de atrás, pausa y avance va más baja, pegada al borde de abajo.
- WOD: un color para el trabajo y otro para el descanso, lo que viene después y el tiempo total, aviso del último minuto en el
  AMRAP y la cuenta al día nada más volver a la app.
- Sin descanso automático, la pantalla pasa enseguida al ejercicio que toca.
- El archivo de copia de seguridad se llama siempre igual (StrataFit-copia.json): cada copia sustituye a la anterior y no se
  acumulan en el teléfono.
- Administración avisa de cuántos fallos y sugerencias hay pendientes y deja contestarlos.
- Ajustes: «Al abrir la app» (la pestaña con la que se abre) y «Reducir animaciones».
- Tema claro más legible: más contraste en los textos de color (macros, estados, color de acento y el ✓ del nivel) y en el texto
  secundario, y el diálogo de confirmación casi opaco con Cristal.
- «Unir al anterior» (en el Overview, «Enlazar») y «Separar» funcionan igual en la semana y en el Overview: el bloque se parte por
  donde separas, al unir un ejercicio se lleva a su pareja y, de cuatro seguidos en adelante, es un circuito.

### Correcciones
- Al cambiar el descanso o el tempo durante el entreno, el objetivo de arriba no se actualizaba hasta salir.
- El historial de cada ejercicio se quedaba en sus 60 últimas sesiones y lo anterior se borraba: ahora se guarda entero.
- El Overview y el aviso de estancamiento describían la semana de descarga antigua («mitad de series»): ahora dicen lo que hace,
  peso al 65 % y 2 repeticiones menos.
- Al reanudar un entreno interrumpido, la pantalla seguía encendida aunque lo hubieras quitado en Ajustes o estuviera en pausa.
- «Volver a entrar», cuando caduca la sesión, también hace esperar tras cinco contraseñas fallidas.
- Fuera «Notificaciones activadas» de Ajustes → Sonido y avisos: no hacía nada.
- La sincronización ya no se queda «en marcha» si el servidor deja una respuesta a medias.

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
- Programas (M3): `workout/week` (semana de 7 días sobre planes de cualquier longitud: `S.sl` día de la semana y `S.sel` día del
  plan; `done`, Nutrición y Dashboard siguen el ciclo), técnicas en el formato de los programas (`~DS`, `~DS/MYO` para el avanzado:
  `data/techniques`, `workout/technique`), descarga nueva (`workout/deload`, `dl` de cada programa propio), rotación
  (`data/rotation`, `programs/rotation`), programas preferentes por sexo (`PROGRAM_PREF`) y el nivel avanzado sin la superserie
  automática del final.
- Catálogo de ejercicios (T-05): `data/exinfo`, con el consejo y la ejecución de los 551 ejercicios, se descarga al usarlo
  (`core/lazy`, `library/howto`); `tests/exinfo.test.mjs` comprueba que están todos y que no hay dos textos iguales ni parecidos.
- Pruebas: `tests/programs.py` (ciclos, sexo, técnicas, descarga, rotación, «Volver a generar», consejo y ejecución).
- Pantalla de entrenamiento (M4): `workout/order` (orden de las series, por rondas dentro de un bloque: serie actual, «Anterior»
  y descanso tras cada serie), `restAt` y `blockEnd` en `workout/rest` (10 s dentro del bloque y el descanso de la ronda al
  cerrarlo), `restEnded` (al acabar un descanso, la pantalla va a la serie siguiente si es de otro ejercicio), peso sugerido con
  `ws` en cada serie y `suggestAfter` (`workout/progression`), `TECHNIQUES` con un tercer texto (qué hace la app) y sin prototipo,
  y el reloj del WOD con un anillo SVG que se pinta en cada fotograma (`extras/wod`). CSS nuevo: `74-workout-controls`.
- Pruebas: `tests/session.py` (iconos, desplegables, peso sugerido, técnicas, superseries y triseries, barra inferior y WOD).
- Perfil, ajustes y seguimiento (M5): `dashboard/reminder` (recordatorio de pesaje en `S.wr`, aviso al abrir o volver a la app,
  tarjeta del Dashboard y evento .ics que se repite), `profile/analysis` (análisis mensual, cargado al usarlo) y `system/pdf` (PDF
  A4 sin bibliotecas, con Helvetica en Windows-1252; también se carga al usarlo), `system/report` y `account/reports` (avisos en
  `reports/{uid}-{ms}` y `S.rp`, cola sin conexión, estados y respuesta), `cloud/backup` (copia en `users/{uid}/backup`: meta y
  trozos de 300.000 caracteres, gzip, huella, semanal sin pisar una copia con más datos; `S.cb`) y `cloud/hooks` (tareas tras cada
  sincronización). Fuera el aviso «Haz una copia de seguridad» del Dashboard: la copia ya es automática.
- Reglas de Firestore para la copia de seguridad y los fallos y sugerencias, con sus pruebas en `tests/rules.test.mjs`; el Firebase
  de prueba (`tests/fakefb.py`) entiende los avisos.
- Pruebas: `tests/followup.py` (recordatorio, análisis y PDF, nota de actualización, copia con nombre fijo y datos dañados) y, en
  `tests/cloud.py`, los avisos con el admin y la copia en la nube. Cuatro pantallas más en `tests/shots.py` (43): peso con el
  recordatorio, análisis, fallos y sugerencias, y nota de actualización.
- Experiencia y plataformas (M6): `core/tabbar` (barra de pestañas con la burbuja, su arrastre con eventos de puntero y la pestaña
  al abrir), `core/back` (qué cierra «atrás» y, mientras hay algo que cerrar, una entrada de más en el historial para el botón
  atrás del sistema), `core/swipe` (deslizar para volver; el gesto vertical sigue siendo del navegador con `touch-action: pan-y`),
  `system/tour` (recorrido), `system/phone` (accesos directos con `?a=` y globo con la API de insignias) y, en
  `profile/appearance`, el color propio (`customAccent`: tonos en HSL y texto por contraste WCAG) y reducir animaciones
  (`html.rm`). Preferencias nuevas en el perfil (`acx`, `rm`, `st0`, `tour`), comprobadas en `core/repair` y en las reglas. CSS
  nuevo: `77-experience`.
- Pruebas: `tests/experience.py` con gestos táctiles en Chrome y en Safari (personalización, burbuja, deslizar para volver,
  «atrás», recorrido, accesos directos, globo y descargas con la app instalada, T-06); en `tests/cloud.py`, el recorrido de una
  cuenta nueva y en el otro móvil, y el color propio; en `tests/deploy.py`, los accesos directos del manifiesto, también sin
  conexión; reglas de las preferencias nuevas en `tests/rules.test.mjs`. Cuatro pantallas más en `tests/shots.py` (47), que ahora
  entra con la sesión de prueba (desde las cuentas, M2, capturaba el inicio de sesión). Lista de comprobación para los móviles de
  verdad en `docs/tecnica/pruebas.md`.
- Cierre (M8, T-04, T-21, T-22): revisión final del código. Fuera código muerto (la descarga por los artefactos de Claude en
  `system/files`, `downloadAs` repetido en `extras/csv`, el resultado `'delivered'`, el segundo bloqueo de pantalla de
  `workout/session` y la preferencia `notif`, también de las reglas); `cloud/net` mide el límite de tiempo también al leer la
  respuesta; `workout/finish` guarda el historial entero; `workout/day: linkPrev`, una sola función para unir y separar bloques;
  colores de texto por tema en `css/00-base` (`--at`, `--ctx`, `--ptx`, `--gtx`, `--okx`, `--wnx`, `--erx` y `--snx`) y el diálogo
  del tema claro con Cristal al 84 % (`--pd`). Informe de issues en `docs/tecnica/issues.md`.
- CI: acciones con Node.js 24 (`checkout@v6`, `setup-node@v6` sin caché automática de paquetes, `setup-python@v6` y
  `setup-java@v5`).
- Pruebas: `tests/walk.py` y `tests/shots.py`, también por HTTP; en `tests/session.py`, unir y separar superseries; en
  `tests/cloud.py`, la espera al volver a entrar.
