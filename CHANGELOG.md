# Historial de cambios

Todos los cambios importantes de StrataFit, de la versión más reciente a la más antigua. La serie de prueba anterior
(1.19 – 1.24) está en [docs/tecnica/versiones-de-prueba.md](docs/tecnica/versiones-de-prueba.md).

Cada versión se divide en **Novedades**, **Mejoras**, **Correcciones** e **Interno**. La app enseña los tres primeros apartados en el
aviso de versión nueva y en Ajustes (por eso se escriben para el usuario, en frases cortas); **Interno** es solo para desarrollo.
`build.py` lee este archivo: la versión de `APPV` debe tener aquí su entrada o la compilación se detiene.

Una **revisión** arregla una versión ya publicada sin ser otra. La app enseña entonces una sola tarjeta: los apartados de la
revisión y, debajo, los de la versión que revisa (y los de sus revisiones anteriores), cada uno con el número de la suya
(«Correcciones de la 1.0.31», «Novedades de la 1.0.3»).

- **Desde la versión que siga a la 1.0.32**, una revisión lleva una cuarta cifra: 1.1.0.1 es la primera revisión de la 1.1.0, y
  no hace falta decir más. El aviso de versión nueva compara todas las cifras: 1.1.0.1 es posterior a 1.1.0 y anterior a 1.1.1.
- **Las revisiones de la 1.0.3** se numeraron añadiendo una cifra al tercer número (1.0.31 y 1.0.32) y dicen, antes de su primer
  apartado, «Revisión de la [1.0.3]». Entonces el aviso solo comparaba tres números, y para él 1.0.31 es posterior a 1.0.3 pero
  también a 1.0.4: por eso la versión que siga a la 1.0.32 tiene que ser mayor que ella (1.1.0).

El formato se inspira en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y la numeración sigue
[versionado semántico](https://semver.org/lang/es/).

## [1.0.32] — 2026-11-16

Revisión de la [1.0.3]. No tiene tarjeta propia ni detalla sus cambios en la app: va delante en la de la 1.0.3, con una sola
línea.

### Mejoras
- Corrección y mejoras de la app.

### Interno
- Entreno: el botón que guarda el entreno se llama «Guardar entreno» (antes, «Log out», que suena a cerrar la sesión de la
  cuenta), también en los textos que lo nombran.
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
- Figuras de ejercicio, repaso de su aspecto (a petición del propietario, en la rama `desarrollo-animaciones`): la figura
  grande es el mismo maniquí limpio que la miniatura (la silueta clara y lo que trabaja en color, sin los músculos en reposo
  con su rayado); la cabeza, las manos y los pies, que enseñaban la silueta desnuda casi del color del fondo, se ven, y el
  brazo y la pierna de atrás son macizos (antes, un contorno transparente). En los 68 ejercicios de cuerpo completo la figura
  ya no sale entera en rojo: la silueta va en un rojo apagado y encima, más vivo, lo que más trabaja; el mapa muscular, igual.
  De frente, una sola luz para todo el cuerpo (los discos de las articulaciones salían como manchas). El recuadro, más oscuro
  y liso, con el suelo que se desvanece hacia los lados, un poco de luz y aire alrededor; la miniatura, con un 6 % de aire
  para que las esquinas no corten la cabeza. Arreglos de gesto: correr ya no parece una zancada agachada (21 ejercicios);
  colgado de la barra, el poste va lejos del cuerpo, también con kipping; y la cuerda de la comba se ve como un lazo. Después,
  más humana: manos con pulgar y dedos (abiertas o en puño; antes, muñones), la cara de perfil con su oreja, los pies con talón
  y arco, y de frente las manos y las orejas (`tools/figure.js`, `FG_F`); el borde de las piezas, translúcido, ya no marca las
  juntas como en un muñeco; al correr, las manos cerradas. Y el material que es una línea de acero (la barra del remo en T y
  del landmine, la toalla, la marca del wall ball) iba casi negro y ahora se ve; en el salto lateral se salta un cono. Pesa
  menos: la figura de la sentadilla, de 81 a 46 piezas que pintar en cada fotograma; las piezas en `<defs>`, de 102 a 93 KB;
  abrir «Cómo se hace», de 5,1 a 3,7 ms. Pruebas: `tests/rig.test.mjs` (el poste, la carrera, la cuerda y los detalles de
  manos, cara y orejas), `tests/figures.py` (el maniquí, el cuerpo completo, la luz de frente, el suelo, las manos y la cara,
  y ningún trazo del material casi negro) y `tests/perf.py` (abrir «Cómo se hace» y las piezas de la figura)
  ([figuras](docs/tecnica/figuras.md#el-aspecto)).
- Figuras de ejercicio, piloto del atleta (a petición del propietario, en la rama `piloto-atleta`, pendiente de su revisión):
  la figura grande del curl con barra Z es una persona (piel, pantalón corto, pelo y cara) sobre el mismo esqueleto, así que
  conserva el ritmo, el recorrido, los colores de los músculos y el agarre de la barra con las dos manos. El brazo es una sola
  silueta que se rehace en cada fotograma: sale del hombro sin junta y el codo hace su pliegue por dentro y su punta por fuera
  (`extras/athlete`). Las miniaturas y el resto de ejercicios siguen con el maniquí. Pruebas: `tests/rig.test.mjs` (solo el
  curl con barra Z lo lleva; en todo el gesto, trazados válidos y la muñeca en la mano; arriba, la punta del codo) y
  `tests/figures.py` (el atleta en la hoja, su brazo al moverse, sus recortes y lo pintado, en cada motor)
  ([figuras](docs/tecnica/figuras.md#el-atleta-piloto)). Segunda revisión, a petición del propietario: el contorno del brazo
  va seguido del hombro al codo; el bíceps es parte del volumen del brazo (sin borde negro, fundido con la piel) y al
  flexionar se acorta y se hincha; el puño rodea la barra con el pulgar y el índice, y una prueba comprueba que las dos manos
  no la sueltan en todo el gesto. La vista de tres cuartos que pedía para ver el tramo acodado de la barra Z no cabe en el
  modelo de perfil: el piloto sigue de perfil.

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
