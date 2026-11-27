# Los textos de las páginas de revisión de cada lote: título, presentación, familias, lo que hace cada figura y lo que he
# visto al revisarlo.
LOTES = {}

NOTES1 = {
    'Sentadilla': 'Barra alta, sobre los trapecios. Baja hasta que la cadera pasa por debajo de la rodilla, con las rodillas hacia las puntas de los pies; la barra no se sale de la vertical del medio del pie.',
    'Sentadilla frontal': 'La barra sobre la parte delantera de los hombros, con los dedos por debajo apuntando hacia el hombro y los codos altos y hacia delante. El tronco queda casi vertical y la barra, sobre el medio del pie.',
    'Sentadilla en Smith': 'La barra va sujeta a los carros de las guías. Los pies, algo por delante de la barra; el tronco se inclina lo justo para que la barra no se salga de su recorrido.',
    'Sentadilla con pausa': 'Como la sentadilla, con una parada de casi un segundo abajo.',
    'Sentadilla en caja': 'Pies más abiertos: se sienta atrás hasta tocar la caja con el muslo paralelo y las espinillas casi verticales.',
    'Sentadilla Zercher': 'La barra en el pliegue de los codos, delante del vientre, y las manos juntas a la altura de la barbilla. Tronco erguido.',
    'Sentadilla con barra de seguridad': 'El yugo acolchado sobre los trapecios y las asas hacia delante; los extremos de la barra bajan por delante, con los discos.',
    'Sentadilla con mancuernas': 'Una mancuerna en cada mano, colgando a los lados, con las palmas hacia dentro.',
    'Sentadilla goblet con mancuerna': 'La mancuerna de pie delante del pecho, sujeta por la cabeza de arriba con las dos manos; los codos, hacia abajo.',
    'Sentadilla sumo con mancuerna': 'Pies muy abiertos y puntas hacia fuera; la mancuerna cuelga entre las piernas, cogida por arriba con las dos manos.',
    'Sentadilla con bandas': 'La banda pisada por el medio de cada pie (sus dos tiras suben por los lados del pie) y las asas a la altura de los hombros.',
    'Hack squat en Smith': 'En la Smith con los pies bastante adelantados: el tronco, casi vertical, y las rodillas avanzan mucho.',
    'Overhead squat': 'La barra arriba con los brazos estirados y el agarre muy abierto, siempre sobre el medio del pie; el tronco, erguido.',
    'Goblet squat': 'La kettlebell cogida por los dos lados del asa, delante del pecho, con la bola hacia abajo.',
    'Sentadilla goblet con pausa': 'Como la goblet con kettlebell, con una parada abajo.',
    'Sandbag squat': 'El saco apoyado en los pliegues de los codos, contra el pecho, y las manos agarrándolo por arriba.',
    'Sentadilla con salto': 'Desde abajo con los brazos atrás: se estira del todo, despega con los brazos arriba y vuelve a caer en la sentadilla.',
    'TRX sentadilla': 'Agarrado a las asas con los brazos estirados hacia el anclaje: el TRX sostiene y deja bajar con el tronco más erguido. Las cintas, rojizas y más anchas que las bandas.',
    'Press banca': 'Agarre de vez y media el ancho de los hombros. La barra baja hasta tocar la parte baja del pecho con los antebrazos casi verticales y sube hasta quedar sobre los hombros.',
    'Press banca mancuernas': 'Las mancuernas bajan a los lados del pecho, algo más hondo que la barra, con los antebrazos verticales; arriba, casi juntas sobre los hombros.',
    'Press banca en Smith': 'La barra sube y baja en vertical por las guías, sobre el pecho: arriba, los brazos quedan algo hacia los pies.',
    'Press banca agarre neutro mancuernas': 'Las palmas, una frente a otra, y los codos más pegados al cuerpo.',
    'Press en suelo con barra': 'Tumbado en el suelo con las rodillas dobladas: la barra baja hasta que los brazos se apoyan en el suelo, sin llegar al pecho.',
    'Press en suelo con mancuernas': 'En el suelo con mancuernas: abajo, los codos se apoyan en el suelo.',
    'Press banca con pausa': 'Como el press de banca, con una parada con la barra en el pecho.',
    'Press banca agarre ancho': 'Agarre muy abierto: la barra toca algo más arriba en el pecho y los codos se abren más.',
    'Press banca con bandas': 'Una banda en lazo en cada extremo de la barra, por fuera de los discos, sujeta al suelo justo debajo: ya va tensa con la barra en el pecho y se estira más al subir.',
    'Press banca unilateral con mancuerna': 'Con la mano derecha; la izquierda, abierta sobre el vientre.',
    'Press inclinado mancuernas': 'Banco a unos 38°: las mancuernas bajan a los lados de la parte alta del pecho.',
    'Press inclinado barra': 'Banco a unos 38°: la barra toca la parte alta del pecho, bajo las clavículas, y sube en vertical hasta quedar sobre los hombros.',
    'Press inclinado en Smith': 'Inclinado en la Smith: la barra va en vertical por las guías, sobre la parte alta del pecho.',
    'Press inclinado agarre neutro mancuernas': 'Inclinado, con las palmas una frente a otra.',
    'Press inclinado 30° mancuernas': 'Banco a 30°, algo menos inclinado que en los demás.',
    'Press inclinado unilateral mancuerna': 'Inclinado, con la mano derecha; la izquierda, sobre el vientre.',
    'Press inclinado con pausa': 'Inclinado con barra, con una parada en el pecho.',
    'Press banca declinado': 'Banco declinado unos 18°, con las piernas sujetas en los rodillos; la barra toca la parte baja del pecho.',
    'Press declinado mancuernas': 'Declinado, con mancuernas.',
    'Press declinado en Smith': 'Declinado en la Smith: en vertical por las guías.',
    'Press cerrado': 'Agarre al ancho de los hombros y codos pegados: la barra toca más abajo en el pecho.',
    'Press cerrado mancuernas': 'Las dos mancuernas juntas, apretadas una contra otra sobre el pecho, con los codos pegados.',
    'Press cerrado en Smith': 'Agarre cerrado en la Smith.',
    'Press cerrado con barra Z': 'Agarre cerrado en las curvas de la barra Z.',
    'Press JM': 'Agarre cerrado: la barra baja hacia la barbilla con los codos hacia los pies, a medio camino entre un press cerrado y un press francés.',
    'Press hombro mancuernas': 'Sentado con respaldo: las mancuernas salen a la altura de las orejas, con los antebrazos verticales, y suben hasta estirar los brazos sobre los hombros.',
    'Press militar barra': 'De pie: la barra sale de lo alto del pecho, pasa por delante de la cara con la cabeza un poco atrás y acaba sobre la cabeza.',
    'Press Arnold': 'Empieza con las mancuernas a la altura de la barbilla, las palmas hacia uno y los codos juntos delante del pecho. Al subir, los codos se abren en arco con el antebrazo vertical mientras las palmas giran hacia delante; el giro acaba a la altura de la frente y sigue como el press normal.',
    'Press hombro máquina': 'Sentado en la máquina: las asas suben por el arco de sus palancas.',
    'Press hombro unilateral': 'De pie, con la mano derecha; el otro brazo, relajado.',
    'Press landmine': 'La barra apoyada en el suelo por delante: la mano sube y avanza por su arco hasta estirar el brazo, con el pie contrario adelantado.',
    'Press militar sentado con barra': 'Como el press militar, sentado y con respaldo.',
    'Press hombro en Smith': 'Sentado en la Smith: la barra sube en vertical por delante de la cara.',
    'Press hombro con kettlebell': 'La kettlebell en la posición de rack, apoyada por fuera del antebrazo; sube hasta arriba con la palma hacia delante.',
    'Press hombro en polea': 'De pie junto a la polea baja, con una mano: el cable sube de la polea al asa.',
    'Press hombro sentado agarre neutro': 'Sentado, con las palmas una frente a otra y los codos más adelantados.',
    'Press hombro con bandas': 'De pie sobre la banda, pisada por el medio de cada pie: las asas suben desde los hombros hasta arriba.',
    'Press hombro con pausa': 'Sentado con mancuernas, con una parada abajo.',
    'Landmine press': 'Con las dos manos en el extremo de la barra y de pie, algo inclinado hacia delante: la barra sube desde delante del pecho hasta estirar los brazos (el press landmine va con una).',
}
FAMS1 = [('squat', 'Sentadillas', 'Los pies no se mueven del suelo y el tronco se inclina lo justo para que el peso quede sobre el medio del pie; con barra, la barra baja en vertical.'),
        ('press', 'Press de banca', 'La barra (o las mancuernas) toca el pecho con los antebrazos casi verticales y acaba sobre los hombros. Plano, inclinado, declinado y en el suelo.'),
        ('overhead', 'Press de hombro', 'De la altura de los hombros a estirar los brazos sobre la cabeza, de pie o sentado con respaldo.')]
LOTES[1] = dict(title='Figuras 3D · lote 1', notes=NOTES1, fams=FAMS1, head='<p class="pr">StrataFit · figuras de ejercicio · lote 1 de la revisión</p>\n<h1>Sentadillas y presses, en 3D</h1>\n<p class="lede">Los <b>57 ejercicios</b> de las familias de sentadilla, press de banca y press de hombro, con la figura nueva moviéndose. Toca una figura para verla en grande con lo que hace; <b>Lado</b> la gira de perfil para comprobar la postura (los discos y los postes que quedan delante se aclaran para que se vea el cuerpo). Todavía no está en la app: se integrará cuando estén todos los lotes.</p>\n<p class="lede"><b>Novedades:</b> los gestos arrancan y frenan como los de una persona, sin tirones; solo descansan en la posición de reposo y abajo dan la vuelta sin pararse (salvo los de pausa). El salto tiene sus tiempos de verdad: impulso, vuelo y caída amortiguada. Las figuras se mueven con más fotogramas por segundo. La barra de la Smith va sujeta a dos carros que suben y bajan por sus guías, y las bandas, en cian, son lazos tensos que se estiran (y adelgazan) al tirar.</p>\n', found='<section class="found">\n<h2>Lo que he visto al revisarlo</h2>\n<ul>\n<li><b>Tras tu última revisión.</b> Los <b>agarres</b>, repasados en todos: si el antebrazo no queda de través a la barra (en los presses con agarre ancho, por ejemplo), la muñeca se dobla de lado, como de verdad, y la barra cruza la mano recta en vez de en diagonal. En el <b>press landmine</b>, la mano agarra el manguito a lo largo de la barra; en la <b>sentadilla Zercher</b>, los puños juntos con los nudillos hacia delante; en el <b>press cerrado con barra Z</b>, cada mano sobre su tramo inclinado. En el <b>press de hombro en polea</b>, el cable sale del arco del asa, detrás de los nudillos, y ya no roza la muñeca.</li>\n<li><b>En la revisión anterior.</b> En la <b>sentadilla frontal</b>, los dedos bajo la barra apuntan hacia el hombro: el codo se abre y el antebrazo ya no se mete en el brazo, y la barra queda apoyada justo encima de los hombros. En los <b>presses con barra en banco</b>, el soporte va detrás de todo el recorrido de la barra y el tope de seguridad, por debajo de lo más bajo: en el press JM la barra daba en el tope y la barra Z, en el gancho.</li>\n<li><b>En revisiones anteriores.</b> La <b>máquina de press de hombro</b> es nueva: las asas van en dos palancas rígidas que giran en un eje (antes subían en línea recta y la palanca cambiaba de largo), con su columna, la base unida al asiento, la pila con su cable y su polea, y asas de goma. El <b>landmine press</b> ya no es igual que el <b>press landmine</b>: va con las dos manos en el extremo de la barra; el press landmine sigue a una mano, con el pie contrario adelantado. Las manos abiertas (la libre en los presses a una mano, las de la sentadilla goblet y la sumo con mancuerna) tienen palma, dedos y pulgar: antes eran un muñón. Además, las manos (abiertas y cerradas) llevan el tono de los músculos según les da la luz, en vez del color oscuro de la piel que las hacía parecer guantes; los bancos llevan su larguero bajo el acolchado y las patas, tacos de goma, y las torres de polea, la base unida a la pila.</li>\n<li><b>Más rápida.</b> La página ya no prepara todas las figuras al abrirse: cada una se prepara cuando va a verse o en los ratos libres del navegador, y la página solo lleva el código de sus familias, así que abre antes, sobre todo en el móvil. Además, las búsquedas de cada postura (el equilibrio, lo que llegan los brazos) necesitan menos pruebas y dan las mismas posturas.</li>\n<li><b>Mejorado tras tu revisión.</b> Los press de banca con barra (plano, inclinado, declinado, cerrado, con pausa, con bandas y el JM) tienen su soporte: dos postes en la cabecera, por dentro de los discos, con sus ganchos y sus topes de seguridad, detrás de por donde pasa la barra. La barra Z del press cerrado es nueva (una W de verdad, como en el lote 4). La máquina de press de hombro lleva su pila de pesas y la torre de polea, su columna con tapa, carro y pila. Además, cada postura se calcula una vez y se guarda, así que cada fotograma cuesta menos de dibujar.</li>\n<li><b>Arreglado tras tu revisión.</b> En la <b>sentadilla sumo con mancuerna</b> se dejaba de ver un brazo al bajar: el antebrazo se pintaba por detrás de la cadera aunque estaba delante (ahora, el antebrazo que queda delante del cuerpo se pinta delante del tronco). El <b>press Arnold</b> va como se hace: empieza con las mancuernas a la altura de la barbilla y los codos juntos delante del pecho, y al subir los codos se abren en arco, con el antebrazo vertical, mientras las palmas giran hacia delante; el giro termina a la altura de la frente, ya subiendo (antes la mano iba en línea recta hacia el lado sin subir y el codo daba un bandazo). Las cintas del <b>TRX</b> son rojizas y más anchas que las bandas, para distinguirlas.</li>\n<li><b>Repasado con una prueba más fina.</b> Una prueba nueva mide el grosor real del dibujo (no solo el eje de cada pieza) y comprueba que las máquinas no se mueven. Ha encontrado roces pequeños, ya corregidos: las bandas del <b>press de hombro con bandas</b> y de la <b>sentadilla con bandas</b> rozaban muslos, pantorrillas y, arriba, el brazo (ahora rodean el cuerpo con más holgura y salen del lado de fuera del puño), y en la <b>sentadilla Zercher</b> la barra se hundía un poco en el antebrazo junto al codo.</li>\n<li><b>Músculos de la librería que no cuadraban.</b> <b>TRX sentadilla</b> y <b>Landmine press</b> llevaban dorsal y pectoral como principales (los compartían con su línea de la librería, junto con remos y fondos), y <b>Goblet squat</b>, <b>Sentadilla goblet con pausa</b>, <b>Sandbag squat</b> y <b>Overhead squat</b> llevaban «cuerpo entero», así que salían enteros en rojo. Ya están corregidos, en su propia rama (desarrollo-musculos), y aquí se ven bien.</li>\n<li><b>Lo que es una aproximación.</b> En la sentadilla frontal, la mano rodea la barra con la muñeca doblada hacia atrás (no se dibujan los dedos abiertos bajo la barra). La barra del landmine está algo más corta que una real para que quepa en la tarjeta, y las cintas del TRX y lo alto de la Smith y de la polea se salen del encuadre.</li>\n<li><b>Revisado a fondo.</b> Además de las comprobaciones de antes (manos que llegan, pies en el suelo, articulaciones posibles, sin saltos), cada figura pasa una prueba de choques: la barra o las mancuernas contra el cuerpo, y brazos y piernas contra el tronco o contra los del otro lado. Lo que salió (antebrazos que rozaban el tronco al final de algunos remos, la barra del Pendlay contra las rodillas, los brazos de la sentadilla sumo contra la cadera) ya está corregido.</li>\n<li><b>Material que atravesaba el cuerpo.</b> La prueba de choques ahora mira todo lo que se dibuja (barras, discos, mancuernas, cables, bandas, bancos y máquinas). Corregido: las mancuernas del press con agarre neutro y del Arnold rozaban el antebrazo (ahora el asa va siempre de través en el puño); los rodillos del banco declinado se metían en las espinillas; el disco del landmine, en el antebrazo (ahora va más abajo en el manguito); la bola de la kettlebell se hundía en el antebrazo; el cable del press en polea cruzaba el brazo (la polea, ahora detrás), y las bandas pisadas atravesaban brazos y rodillas (ahora rodean el cuerpo por fuera).</li>\n<li><b>Las variantes que la app junta y aquí se distinguen:</b> las de pausa (se paran abajo), el agarre ancho, el agarre neutro, el banco a 30°, el Arnold, el JM y el hack en la Smith.</li>\n</ul>\n</section>')

NOTES2 = {
    'Jalón al pecho': 'Sentado con los muslos bajo los rodillos: la barra baja desde arriba, con los brazos estirados, por delante de la cara hasta lo alto del pecho; el tronco se echa un poco atrás y los codos bajan hacia los costados. Se ve desde atrás y algo de lado.',
    'Jalón agarre estrecho': 'Con el triángulo: las manos casi juntas y las palmas enfrentadas; el asa baja hasta el esternón con los codos pegados.',
    'Jalón unilateral': 'Con un asa y una mano (la derecha); la otra, apoyada en el muslo.',
    'Jalón agarre neutro': 'Con la barra de asas paralelas, al ancho de los hombros: las palmas, enfrentadas.',
    'Jalón agarre supino': 'Al ancho de los hombros y con las palmas hacia uno: los codos bajan por delante.',
    'Jalón agarre ancho': 'Agarre muy abierto: la barra baja a lo alto del pecho con los codos hacia fuera.',
    'Jalón en máquina convergente': 'Cada asa baja por su propio camino, de arriba hasta los lados del pecho.',
    'Jalón en máquina unilateral': 'En la máquina, con un brazo; la otra mano, en el muslo.',
    'Jalón con cuerda': 'Con la cuerda y las palmas enfrentadas: baja hasta el pecho.',
    'Jalón arrodillado a una mano': 'De rodillas en el suelo frente a la polea alta: una mano baja el asa hasta el hombro.',
    'Remo con barra': 'La espalda recta, a unos 40° del suelo, y la cadera atrás con las rodillas algo dobladas: la barra sube en vertical, de los brazos estirados a la parte baja del pecho, con los codos hacia atrás. El peso, el del cuerpo con el de la barra, queda sobre el medio del pie.',
    'Remo mancuerna': 'Rodilla y mano izquierdas en el banco y el pie derecho en el suelo: la mancuerna sube desde el brazo estirado hasta el costado de la cintura, con el antebrazo siempre vertical y el codo por encima de la espalda.',
    'Remo en polea baja': 'Sentado con los pies en la plataforma: de los brazos estirados (el tronco algo adelante) al vientre, con el tronco erguido.',
    'Remo en máquina': 'Sentado con el pecho en el apoyo, que no se separa: las asas, en palancas que cuelgan de un eje alto, van por su arco de delante, con los brazos estirados, a los costados.',
    'Remo T': 'A horcajadas sobre la barra, apoyada en el suelo por detrás, con el tronco casi paralelo al suelo (unos 20°): el asa en V sube hasta la parte baja del pecho siguiendo el arco de la barra, que pasa entre las piernas, holgada por debajo de los glúteos. Con discos pequeños, que arriba no chocan con el pecho.',
    'Remo Pendlay': 'Con la espalda recta y casi paralela al suelo, y las rodillas dobladas como al empezar un peso muerto: la barra sale del suelo cada vez, pasa por delante de las rodillas, toca la parte baja del pecho y vuelve a apoyarse.',
    'Remo Meadows': 'De lado a la barra, con el extremo cargado junto al cuerpo y la barra saliendo hacia la derecha hasta su eje en el suelo: la mano derecha sujeta el manguito y sube con los discos por el costado. El pie izquierdo delante, con la mano izquierda en esa rodilla, y el derecho detrás.',
    'Remo con apoyo en pecho': 'Boca abajo en el banco inclinado: las mancuernas suben desde los brazos estirados hasta los costados, con los antebrazos verticales.',
    'Remo invertido': 'Bajo una barra, con el cuerpo recto desde los talones: sube hasta tener el pecho junto a la barra.',
    'Remo en Smith': 'Inclinado en la Smith: la barra sube y baja en vertical por las guías.',
    'Remo con barra agarre supino': 'Con agarre supino (las palmas hacia arriba) y el tronco algo más alto: la barra sube hasta el vientre con los codos pegados.',
    'Remo en polea agarre neutro': 'En la polea baja, con las palmas enfrentadas.',
    'Remo unilateral en polea': 'En la polea baja, con una mano; la otra, en el muslo.',
    'Remo unilateral en máquina': 'En la máquina, con un brazo; la otra mano, en el muslo.',
    'Remo en anillas': 'Colgado de las anillas con el cuerpo recto desde los talones: sube hasta tener las manos en el pecho.',
    'Remo Kroc': 'Con la mano izquierda en un apoyo, el pie izquierdo adelantado y el derecho detrás: la mancuerna sube hasta la cadera.',
    'Remo con banda': 'Sentado en el suelo con la banda en los pies: las asas van de los brazos estirados al vientre.',
    'Remo en polea alta': 'Sentado frente a la polea alta: el asa baja desde arriba y por delante hasta el pecho.',
    'Remo en máquina convergente': 'En la máquina convergente: las asas van por el arco de sus palancas de delante, juntas, a los costados.',
    'Retracción escapular en polea': 'Sentado en la polea baja con los brazos estirados: solo se juntan las escápulas, llevando los hombros atrás.',
    'Remo posterior con mancuernas': 'Boca abajo en el banco inclinado, con los codos abiertos hacia los lados: las mancuernas suben a la altura del pecho.',
    'TRX remo': 'Con las asas del TRX y el cuerpo recto desde los talones: sube hasta tener las manos en el pecho. Las cintas, rojizas y más anchas que las bandas.',
    'Remo con banda de pie': 'De pie, con la banda sujeta delante a la altura del pecho: las asas llegan al pecho.',
    'Dominadas': 'Colgado con agarre prono, algo más abierto que los hombros, y las rodillas dobladas: sube hasta pasar la barbilla por encima de la barra. El cuerpo se coloca solo con su centro de masas bajo la barra.',
    'Dominadas supinas': 'Con las palmas hacia uno, al ancho de los hombros: los codos bajan por delante.',
    'Dominadas lastradas': 'Con un disco colgado del cinturón, apoyado por delante de los muslos.',
    'Dominadas agarre neutro': 'En las asas paralelas, que cuelgan un palmo por debajo de la barra, con las palmas enfrentadas.',
    'Dominadas asistidas en máquina': 'De rodillas sobre el apoyo de la máquina, que ayuda a subir.',
    'Dominadas con banda': 'Con las rodillas en la banda colgada de la barra, que ayuda a subir; tensa, pasa por delante de la cara y el pecho.',
    'Dominadas agarre ancho': 'Agarre muy abierto: los codos bajan hacia los costados; arriba, la barbilla a la altura de la barra.',
    'Dominadas en anillas': 'En las anillas, con las palmas enfrentadas.',
    'Dominadas excéntricas': 'Se sube de un impulso y se baja muy despacio, en unos tres segundos.',
    'Dominadas con toalla': 'Agarrado a dos toallas colgadas de la barra.',
    'Scap pull-ups': 'Colgado con los brazos estirados: solo bajan los hombros, sin doblar los codos.',
    'Colgado de barra': 'Colgado con los brazos estirados, quieto, con un leve balanceo.',
    'Colgado con toalla': 'Colgado de dos toallas.',
    'Colgado a una mano': 'Colgado de la mano derecha; el otro brazo, relajado.',
    'Elevación de rodillas colgado': 'Colgado: las rodillas suben hasta el pecho.',
    'Elevación de piernas en paralelas': 'Apoyado en las paralelas con los brazos estirados: las piernas, estiradas, suben hasta la horizontal.',
    'Elevación de piernas colgado': 'Colgado: las piernas estiradas suben hasta la horizontal.',
    'Elevación de rodillas en silla romana': 'Con los antebrazos en los apoyos y la espalda en el respaldo: las rodillas suben hasta el pecho.',
    'Toes to bar': 'Colgado: los pies suben hasta la barra, con el tronco echado atrás.',
    'Pull-ups kipping': 'Con balanceo y sin pausas: del cuerpo arqueado al hueco y el tirón.',
    'Chest to bar': 'Hasta tocar la barra con el pecho, a ritmo continuo.',
}
FAMS2 = [('pulldown', 'Jalones', 'Sentado con los muslos bajo los rodillos: el tronco se echa un poco atrás al tirar y se descansa con los brazos estirados.'),
         ('row', 'Remos', 'Inclinados con la espalda recta y el peso sobre el medio del pie; a una mano en el banco; sentados en polea o máquina; tumbados en el banco inclinado; invertidos y con banda.'),
         ('pullup', 'Dominadas y colgados', 'Colgado de la barra, el cuerpo se coloca con su centro de masas bajo las manos; también las elevaciones de piernas y la silla romana.')]
LOTES[2] = dict(title='Figuras 3D · lote 2', notes=NOTES2, fams=FAMS2,
    head='''<p class="pr">StrataFit · figuras de ejercicio · lote 2 de la revisión</p>
<h1>Jalones, remos y dominadas, en 3D</h1>
<p class="lede">Los <b>54 ejercicios</b> de las familias de jalón, remo y dominada, con la figura nueva moviéndose. Toca una figura para verla en grande con lo que hace; <b>Lado</b> la gira de perfil para comprobar la postura (los discos y los postes que quedan delante se aclaran para que se vea el cuerpo). Como el lote 1, no está en la app: se integrará cuando estén todos los lotes.</p>
''',
    found='''<section class="found">
<h2>Lo que he visto al revisarlo</h2>
<ul>
<li><b>Tras tu última revisión.</b> Los <b>agarres</b>, repasados en todos: con el antebrazo algo torcido respecto a la barra (dominadas, jalones), la muñeca se dobla de lado, como de verdad, y la barra cruza la mano recta. En las <b>dominadas con agarre neutro</b>, las asas cuelgan un palmo por debajo de la barra (antes la barra pasaba por dentro de los puños). El <b>remo T</b>, el <b>remo en TRX y anillas</b> y la <b>silla romana</b> se agarran en neutro, con el asa de través a la mano (antes iba a lo largo del antebrazo), y en el <b>remo en polea alta</b> con agarre neutro, las asas van de través al cable.</li>\n<li><b>En la revisión anterior.</b> Los <b>jalones</b> se ven desde atrás y algo de lado, con la barra un poco más adelante: desde atrás del todo la cabeza la tapaba y parecía atravesarla. En los <b>remos con barra</b>, cada trozo de la barra se pinta delante o detrás según lo que de verdad lo tapa (pegada a los muslos parecía atravesarlos). El <b>remo Meadows</b> se ve desde atrás (el disco tapaba la mano que agarra la barra) y en el <b>remo con apoyo en pecho</b> las mancuernas suben algo separadas del cuerpo, sin pasar junto al muslo.</li>
<li><b>En revisiones anteriores.</b> Los <b>jalones</b> bajan la barra por delante de la cara, sin rozarla, hasta lo alto del pecho, con el tronco algo más atrás al final; la polea queda justo encima de ese recorrido. Las <b>máquinas de jalón</b> (convergente y unilateral) y de <b>remo</b> (normal, convergente y unilateral) llevan las asas en palancas rígidas que giran en un eje, con su bastidor entero: columna, viga, ejes, base y pila con su cable (antes, en los remos, las palancas eran varillas que salían de fuera del dibujo, y el pecho se separaba del apoyo). En el jalón en polea, el apoyo de las rodillas va unido a la columna. Además, salen de la librería tres repetidos, como la prensa 45°: el <b>remo con mancuernas apoyado en banco inclinado</b> (igual que el remo con apoyo en pecho), las <b>ring rows</b> (el remo en anillas) y las <b>pull-ups estrictas</b> (las dominadas). Lo guardado con esos nombres se conserva y muestra el que se queda, y el buscador los sigue encontrando. Además, las manos (abiertas y cerradas) llevan el tono de los músculos según les da la luz, en vez del color oscuro de la piel que las hacía parecer guantes; los bancos llevan su larguero bajo el acolchado y las patas, tacos de goma, y las torres de polea, la base unida a la pila.</li>
<li><b>Más rápida.</b> La página ya no prepara todas las figuras al abrirse: cada una se prepara cuando va a verse o en los ratos libres del navegador, y la página solo lleva el código de sus familias, así que abre antes, sobre todo en el móvil. Además, las búsquedas de cada postura (el equilibrio, lo que llegan los brazos) necesitan menos pruebas y dan las mismas posturas. Las dominadas se preparan en menos de la mitad de tiempo.</li>
<li><b>Máquinas, mejoradas.</b> El jalón y los remos sentados en polea tienen su puesto: la columna, el brazo que lleva la polea y la pila de pesas (antes el cable se perdía fuera del encuadre). La máquina de dominadas asistidas lleva su pila de contrapeso. Además, cada postura se calcula una vez y se guarda, así que cada fotograma cuesta menos de dibujar.</li>
<li><b>Arreglado tras tu revisión.</b> Las cintas del <b>TRX remo</b> son rojizas y más anchas que las bandas, para distinguirlas.</li>
<li><b>Repasado con una prueba más fina.</b> Una prueba nueva mide el grosor real del dibujo y comprueba que las máquinas no se mueven. Corregido: en los <b>remos y jalones sentados</b>, el asiento se movía con el tronco (ahora está fijo); en el <b>remo con mancuerna</b> y el <b>Kroc</b>, la mancuerna rozaba el muslo de la pierna de apoyo (el codo va algo más abierto); en los <b>remos con apoyo en el pecho</b>, las mancuernas rozaban los muslos arriba; en el <b>Pendlay</b>, la barra rozaba las espinillas al despegar; la mano libre del <b>Meadows</b> y de los <b>remos y jalones a una mano</b> se hundía en el muslo (ahora se apoya encima), y la banda de las <b>dominadas con banda</b> rozaba los muslos arriba.</li>
<li><b>Músculos de la librería que no cuadraban.</b> <b>TRX remo</b> y <b>Remo con banda de pie</b> llevaban el pectoral como principal (compartían línea con flexiones y fondos). Ya están corregidos, en la misma rama que los del lote 1 (desarrollo-musculos), con los de su equivalente: el remo en anillas y el remo con banda.</li>
<li><b>Lo que es una aproximación.</b> Colgado a una mano, el cuerpo cuelga recto (en realidad gira un poco hasta quedar bajo la mano). El kipping es un balanceo simplificado. Los postes de la barra, lo alto de la polea y las cintas de las anillas y el TRX se salen del encuadre.</li>
<li><b>Revisado a fondo.</b> Además de las comprobaciones de antes (manos que llegan, pies en el suelo, articulaciones posibles, sin saltos), cada figura pasa una prueba de choques: la barra o las mancuernas contra el cuerpo, y brazos y piernas contra el tronco o contra los del otro lado. Lo que salió (antebrazos que rozaban el tronco al final de algunos remos, la barra del Pendlay contra las rodillas, los brazos de la sentadilla sumo contra la cadera) ya está corregido.</li>
<li><b>Material que atravesaba el cuerpo.</b> La prueba de choques ahora mira todo lo que se dibuja (barras, discos, mancuernas, cables, cintas, bandas, bancos y máquinas), no solo la barra. Corregido: la barra del remo T pasaba por la entrepierna (ahora va por debajo, y entre las piernas se pinta detrás de los muslos); las mancuernas de los remos tocaban el antebrazo o el tronco (ahora el antebrazo cuelga vertical y la mancuerna queda al costado); el disco de las dominadas lastradas y los rodillos del jalón se metían en los muslos; los apoyos de la silla romana y de las dominadas asistidas, en los brazos y las piernas (ahora los antebrazos van horizontales y las rodillas, apoyadas), y la banda de las dominadas con banda y las toallas, en la cara y los antebrazos.</li>
<li><b>Las variantes que la app junta y aquí se distinguen:</b> los agarres de los jalones (estrecho, neutro, supino), el remo supino, el Meadows, el Kroc, la retracción escapular, el remo posterior y las dominadas supinas, neutras y excéntricas.</li>
</ul>
</section>''')

NOTES3 = {
    'Peso muerto rumano': 'De pie con la barra en las manos: la cadera va atrás con las rodillas apenas dobladas y la espalda recta, y la barra baja pegada a los muslos hasta media espinilla. El peso, sobre el medio del pie.',
    'Buenos días': 'La barra sobre los trapecios: el tronco baja hasta casi la horizontal llevando la cadera atrás, con la espalda recta y las rodillas algo dobladas.',
    'Peso muerto sumo': 'Pies muy abiertos y puntas hacia fuera, las manos por dentro de las rodillas: de la barra en el suelo a de pie, con el tronco más erguido que en el convencional.',
    'Peso muerto rumano mancuernas': 'Como el rumano con barra, con una mancuerna en cada mano que baja por delante de los muslos.',
    'Good morning sentado': 'Sentado en el banco con la barra a la espalda: el tronco se inclina adelante desde la vertical, con la espalda recta.',
    'Peso muerto rumano a una pierna': 'De pie sobre la izquierda, algo doblada: el tronco baja mientras la pierna derecha sube por detrás, en línea con él; una mancuerna en cada mano.',
    'Peso muerto rumano en Smith': 'El rumano con la barra de la Smith, que baja por sus guías pegada a las piernas.',
    'Peso muerto con piernas rígidas': 'Como el rumano, pero con las rodillas casi estiradas: la cadera va más atrás y el tronco baja más.',
    'Peso muerto rumano con kettlebell': 'Con una kettlebell cogida con las dos manos, que baja por delante de las piernas.',
    'Pull-through en polea': 'De espaldas a la polea baja, con la cuerda entre las piernas: la cadera va atrás y el tronco baja; al subir, la cadera empuja adelante hasta quedar de pie. Se ve de frente, con la polea detrás.',
    'Peso muerto rumano con banda': 'Con la banda pisada bajo los pies y cogida con las manos: se estira al subir.',
    'Peso muerto': 'La barra sale del suelo sobre el medio del pie y sube pegada a las piernas, siempre por delante de ellas: al pasar por las rodillas, las espinillas están casi verticales, y arriba la barra queda delante de los muslos. Abajo, los brazos casi verticales, con los hombros justo por delante de la barra y la espalda recta.',
    'Peso muerto con barra hexagonal': 'Dentro de la barra hexagonal, con las asas a los lados: la barra sube en vertical por el centro del cuerpo.',
    'Peso muerto con déficit': 'Subido a una tarima: la barra sale desde más abajo y las rodillas y la cadera se doblan más.',
    'Rack pull': 'La barra empieza en los soportes del rack, a la altura de las rodillas: solo el último tramo del peso muerto.',
    'Peso muerto con pausa': 'Como el peso muerto, pero al subir se para un momento a media espinilla, nada más despegar la barra del suelo.',
    'Zancadas': 'Desde de pie, un paso adelante con la izquierda y bajar hasta que la rodilla de atrás queda a un palmo del suelo; una mancuerna en cada mano. El peso, más sobre el pie de delante.',
    'Sentadilla búlgara': 'El empeine del pie de atrás en el banco: se baja hasta que el muslo de delante queda casi horizontal; una mancuerna en cada mano.',
    'Zancada caminando': 'Cada paso es una zancada adelante: aquí se ve un paso.',
    'Zancada en Smith': 'Sin paso: los pies quietos en la postura de la zancada y la barra de la Smith, que baja por sus guías.',
    'Zancada con barra': 'La zancada con paso adelante y la barra a la espalda.',
    'Sentadilla búlgara en Smith': 'La búlgara con la barra de la Smith a la espalda.',
    'Zancada con salto': 'Desde la zancada, un salto (la cadera sube y baja en parábola) para cambiar de pierna en el aire y caer amortiguando en la zancada contraria.',
    'Sentadilla búlgara con barra': 'La búlgara con la barra a la espalda.',
    'Zancada frontal con déficit': 'El paso adelante, a una tarima: la rodilla de atrás baja más.',
    'Zancada atrás': 'El paso, hacia atrás con la derecha: el pie de delante no se mueve.',
    'Zancada atrás en Smith': 'Con la barra de la Smith y los pies quietos en la postura de la zancada.',
    'Zancada atrás con déficit': 'Con el pie de delante sobre una tarima, el paso hacia atrás: se baja más.',
    'Sentadilla búlgara con énfasis en glúteo': 'La búlgara con el tronco más inclinado adelante, que lleva el trabajo al glúteo.',
    'Sandbag lunges': 'Zancadas con el saco a la espalda, sobre los hombros.',
    'Lunges con sandbag 100 m': 'Las zancadas caminando con el saco a la espalda: aquí se ve un paso.',
    'Hip thrust': 'La espalda alta apoyada en el borde del banco y los pies en el suelo: la barra, con su almohadilla, apoyada en el pliegue de la cadera, y la cadera sube hasta dejar tronco y muslos en línea, con las espinillas verticales.',
    'Puente de glúteo': 'Tumbado en el suelo con las rodillas dobladas: la cadera sube hasta dejar el cuerpo en línea de los hombros a las rodillas.',
    'Hip thrust unilateral': 'Sin peso y sobre la pierna izquierda; la derecha, estirada en línea con el muslo.',
    'Hip thrust en máquina': 'El apoyo de la cadera va en dos palancas que giran en el centro del arco que hace la cadera, así que la sigue sin cambiar de largo.',
    'Hip thrust en Smith': 'La barra de la Smith sobre la cadera, subiendo por sus guías.',
    'Hip thrust con banda': 'La banda por encima de la cadera, sujeta al suelo a los dos lados: se estira al subir.',
    'Puente de glúteo a una pierna': 'El puente sobre el pie izquierdo; la pierna derecha, estirada en línea con el muslo.',
    'Hip thrust con mancuerna': 'Con una mancuerna sobre la cadera, sujeta con las dos manos.',
    'Hip thrust con pausa': 'Como el hip thrust, parándose arriba un momento.',
    'Puente de glúteo con banda': 'Con una minibanda alrededor de los muslos, por encima de las rodillas, que empujan hacia fuera.',
    'Prensa': 'La prensa de 45°: la espalda en el respaldo tumbado y la cadera quieta en el asiento; la plataforma sube por sus guías, de las piernas casi estiradas a las rodillas cerca del pecho.',
    'Prensa unilateral': 'En la prensa de 45°, con la pierna derecha; la izquierda, con el pie en el suelo.',
    'Prensa horizontal': 'Sentado, con el respaldo poco inclinado: la plataforma, vertical, va adelante y atrás.',
    'Prensa con pies bajos': 'Los pies más abajo en la plataforma: la rodilla pasa más por delante y el tobillo se dobla más, así que se baja algo menos.',
    'Prensa con pies juntos': 'Los pies casi juntos en el centro de la plataforma.',
    'Gemelo en prensa': 'Las piernas casi estiradas y quietas, con la punta del pie en el borde de abajo de la plataforma: el tobillo baja el talón y luego empuja con la punta.',
    'Hack squat': 'La espalda en el respaldo del carro, inclinado a 45°, y las hombreras sobre los hombros: el carro baja por sus guías hasta que las rodillas se doblan en ángulo recto; los pies, adelantados en la plataforma inclinada.',
    'Hack squat inverso': 'De cara al respaldo, con el pecho apoyado: la cadera va atrás y abajo mientras el carro baja.',
    'Sentadilla Pendulum': 'El respaldo va en una palanca que gira en un eje por detrás: la cadera baja por un arco y las rodillas se doblan mucho, con el tronco casi vertical.',
    'Sentadilla en máquina': 'La espalda en un respaldo vertical que baja por guías verticales: una sentadilla con el tronco erguido.',
    'Extensión cuádriceps': 'Sentado, con las rodillas en el eje de la palanca y el rodillo delante de los tobillos: de las rodillas dobladas a casi estiradas.',
    'Extensión una pierna': 'Con la pierna derecha; la izquierda se queda doblada.',
    'Extensión con pausa': 'Parándose arriba un momento, con la pierna estirada.',
    'Extensión con banda': 'Sentado en un banco, con la banda sujeta a su pata y por delante del tobillo derecho: se estira al levantar la pierna.',
    'Extensión de rodilla en polea': 'Sentado en un banco, con la tobillera en el tobillo derecho y el cable hasta la polea baja, detrás.',
    'Curl femoral': 'Tumbado boca abajo en la máquina, con las rodillas en el eje de la palanca y el rodillo sobre los talones: los talones suben hacia el glúteo.',
    'Curl femoral sentado': 'Sentado, con los muslos sujetos por un acolchado encima de las rodillas: las piernas van de estiradas hacia delante a dobladas bajo el asiento.',
    'Curl nórdico': 'De rodillas, con los tobillos sujetos: el cuerpo, recto de las rodillas a la cabeza, se deja caer adelante despacio hasta que las manos se preparan para parar la caída.',
    'Curl femoral a una pierna': 'En la máquina, tumbado, con la pierna derecha; la izquierda se queda estirada.',
    'Curl femoral de pie': 'De pie, con el muslo derecho contra un acolchado y el pecho apoyado: el talón sube por detrás.',
    'Curl femoral con balón suizo': 'Boca arriba con los talones en el balón y la cadera arriba: al doblar las rodillas, el balón rueda hacia uno y acaba bajo las plantas.',
    'Curl femoral deslizante': 'Boca arriba, con los talones en unos deslizadores: de la cadera algo levantada con las piernas estiradas a un puente con las rodillas dobladas.',
    'Curl femoral con mancuerna': 'Boca abajo en un banco plano, con una mancuerna ligera apretada entre los pies: una cabeza sobre las plantas y la otra contra el empeine.',
    'Curl femoral con banda': 'De pie, agarrado a un poste que sujeta la banda abajo: la banda, por detrás del tobillo derecho, se estira al subir el talón.',
}
FAMS3 = [('hinge', 'Pesos muertos y bisagras de cadera', 'La cadera va atrás con la espalda recta; con la barra en el suelo, la barra sube en vertical sobre el medio del pie, rozando las espinillas, con los hombros justo por delante de ella al despegar.'),
         ('lunge', 'Zancadas y búlgaras', 'Con paso (adelante, atrás o caminando) o con los pies quietos; abajo, la rodilla de atrás a un palmo del suelo y el peso más sobre el pie de delante.'),
         ('thrust', 'Hip thrust y puentes', 'La espalda alta en el banco (en el puente, en el suelo) y los pies en el suelo: la cadera sube hasta dejar tronco y muslos en línea.'),
         ('legPress', 'Prensas', 'La espalda en el respaldo y la cadera quieta en el asiento: la plataforma va por sus guías y las piernas la empujan.'),
         ('hack', 'Hack y sentadillas en máquina', 'La espalda (o el pecho) en el respaldo de un carro que va por guías, o de una palanca; los pies, quietos en la plataforma.'),
         ('legExt', 'Extensiones de cuádriceps', 'Sentado, con la rodilla en el eje de la palanca (o con banda o polea en un banco): la pierna va de doblada a casi estirada.'),
         ('legCurl', 'Curl femoral', 'Tumbado, sentado, de pie, de rodillas o boca arriba: la rodilla se dobla llevando el talón hacia el glúteo, contra un rodillo, una banda, un peso o el propio cuerpo.')]
LOTES[3] = dict(title='Figuras 3D · lote 3', notes=NOTES3, fams=FAMS3,
    head='''<p class="pr">StrataFit · figuras de ejercicio · lote 3 de la revisión</p>
<h1>Piernas: pesos muertos, zancadas, hip thrust y máquinas, en 3D</h1>
<p class="lede">Los <b>65 ejercicios</b> de las familias de peso muerto y bisagra de cadera, zancada, hip thrust, prensa, hack, extensión de cuádriceps y curl femoral, con la figura nueva moviéndose. Toca una figura para verla en grande con lo que hace; <b>Lado</b> la gira de perfil para comprobar la postura (los discos y los postes que quedan delante se aclaran para que se vea el cuerpo). Como los lotes 1 y 2, no está en la app: se integrará cuando estén todos los lotes.</p>
<p class="lede"><b>Novedades:</b> las máquinas de pierna (la prensa de 45° y la horizontal, el hack, el péndulo, la extensión y el curl) llevan su respaldo, sus guías o su palanca, que gira en el eje de la rodilla o de la cadera, y los pies se apoyan en sus plataformas.</p>
''',
    found='''<section class="found">
<h2>Lo que he visto al revisarlo</h2>
<ul>
<li><b>Tras tu última revisión.</b> Los <b>agarres</b> de las máquinas, repasados: en la <b>prensa</b> y el <b>curl femoral tumbado</b>, las asas son verticales y se agarran con el pulgar arriba; en el <b>hack</b>, salen hacia los lados de las hombreras; en la <b>extensión de cuádriceps</b> y el <b>curl femoral sentado</b>, van inclinadas, de través al antebrazo (antes iban a lo largo de él y el puño las cruzaba torcido); en el <b>pull-through</b>, los extremos de la cuerda cruzan el puño a lo largo de la cuerda; y en los <b>hip thrust</b>, los codos van más cerrados. En general, si el antebrazo queda algo torcido respecto a lo que agarra, la muñeca se dobla de lado, como de verdad.</li>\n<li><b>En la revisión anterior.</b> En los <b>pesos muertos</b> (rumano, sumo, con piernas rígidas, en la Smith, con déficit, con pausa...), cada trozo de la barra se pinta delante o detrás según lo que de verdad lo tapa: antes se ordenaba por la profundidad de su centro y, pegada a los muslos, parecía meterse en los cuádriceps. La <b>zancada con salto</b> vuela de verdad: la cadera sube y baja en parábola mientras se cruzan las piernas, y la caída se amortigua (antes se quedaba a la misma altura en el aire).</li>
<li><b>En revisiones anteriores.</b> En el <b>peso muerto sumo</b>, la barra iba muy por delante de los pies: ahora sube pegada a las espinillas, sobre el medio del pie, sin tocarlas. El <b>hip thrust en máquina</b> tiene bastidor en el suelo, de los postes de la palanca al banco (antes el banco iba suelto), y en el <b>curl femoral de pie</b>, el acolchado del muslo va en un brazo del poste de la palanca y la base une los dos postes (antes flotaba). Además, las manos (abiertas y cerradas) llevan el tono de los músculos según les da la luz, en vez del color oscuro de la piel que las hacía parecer guantes; los bancos llevan su larguero bajo el acolchado y las patas, tacos de goma, y las torres de polea, la base unida a la pila.</li>
<li><b>Más rápida.</b> Los pesos muertos, que al principio tardaban segundos en prepararse (más en el móvil), ahora tardan unas treinta veces menos, con las mismas posturas: las búsquedas de cada postura miran solo el tronco cuando no necesitan más y necesitan menos pruebas. Además, la página ya no prepara todas las figuras al abrirse: cada una se prepara cuando va a verse o en los ratos libres del navegador, y la página solo lleva el código de sus familias, así que abre antes, sobre todo en el móvil.</li>
<li><b>Máquinas.</b> Las de extensión y curl femoral llevan su pila de pesas junto al eje de la palanca, y las torres de polea, su columna con la pila. Además, cada postura se calcula una vez y se guarda, así que cada fotograma cuesta menos de dibujar.</li>
<li><b>Arreglado tras tu revisión.</b> En todos los pesos muertos, la barra pasaba por dentro de las rodillas (en el rack pull, por dentro del cuádriceps; en el sumo, por las espinillas): ahora las piernas se miden con el grosor del dibujo y la barra sube siempre por delante de ellas, con las espinillas casi verticales al pasar las rodillas y la barra delante de los muslos arriba. La kettlebell del rumano ya no se mete en los muslos. El pull-through se ve de frente, con la polea detrás, y la polea ya no se mezcla con la pierna. Las zancadas ya no dan un saltito al empezar (la cadera subía al ponerse de puntillas el pie de atrás), y en la Smith la máquina ya no se mueve: la barra baja en vertical por sus guías, también en el rumano y en el hip thrust en Smith. En los hip thrust, la barra, la mancuerna y la banda ya no flotan: se apoyan en la cadera. En la prensa, el chasis ya no se mueve con la plataforma, y en el curl con mancuerna, la mancuerna va apretada entre los pies.</li>
<li><b>Pulido tras tu segunda revisión.</b> En el <b>puente de glúteo con banda</b>, la minibanda es un aro que rodea los dos muslos por encima de las rodillas y ya no se corta en la primera pierna: cada tramo se pinta delante o detrás del muslo según lo tape. En el <b>hip thrust con banda</b>, la banda sale de dos anclajes fijos en el suelo, a los lados, y pasa tensa por encima de la cadera, apoyada en ella, sin meterse en los muslos. En los <b>pesos muertos</b>, además de la barra, las manos y los antebrazos pasan por delante de los muslos (antes los puños se metían en ellos al subir). En las <b>zancadas</b> con paso, el pie llega frenando, sin golpe, y el cuerpo avanza a un ritmo parejo mientras da el paso y baja (antes se quedaba atrás, se lanzaba hacia delante al apoyar el pie, se pasaba y volvía); y ninguna variante sube la cadera antes de empezar.</li>
<li><b>Posturas que he corregido.</b> En el peso muerto, la cadera se quedaba alta y el tronco casi horizontal, como con las piernas rígidas: ahora, al despegar la barra, los brazos quedan casi verticales con los hombros justo por delante de ella (en el sumo y con la barra hexagonal, el tronco va más erguido). En la búlgara con barra y en la Smith, la cadera no bajaba al principio y luego caía de golpe; ahora baja seguida. En el curl con balón y en el deslizante, la cabeza se metía en el suelo; ahora el cuello se dobla lo justo. Y el peso muerto con pausa se para al subir, a media espinilla, no arriba.</li>
<li><b>Quitado tras tu revisión.</b> La <b>prensa 45°</b> era la misma que la <b>prensa</b>, y el <b>curl femoral tumbado</b>, el mismo que el <b>curl femoral</b>: salen de la librería, en la misma rama que los músculos (desarrollo-musculos). Lo que ya se guardó con su nombre (el historial, las notas, un plan propio) se conserva y muestra la prensa, y al buscar «45» sale la prensa.</li>
<li><b>Músculos de la librería que no cuadraban.</b> <b>Sandbag lunges</b> y <b>Lunges con sandbag 100 m</b> llevaban «cuerpo entero» y salían enteros en rojo. Ya están corregidos, en la misma rama que los de los lotes 1 y 2 (desarrollo-musculos), con los músculos de la zancada y el agarre del saco.</li>
<li><b>Lo que es una aproximación.</b> La zancada caminando y la de 100 m con saco muestran un solo paso. Las máquinas son genéricas, sin copiar ninguna marca: en la prensa, el hack y el péndulo, los discos van en cuernos a los lados del carro o de la palanca, y la extensión y el curl llevan una leva en el eje.</li>
<li><b>Revisado a fondo.</b> Las 65 figuras pasan las mismas pruebas que los lotes anteriores: manos que llegan, pies en el suelo o en su plataforma, articulaciones posibles, sin saltos de un fotograma a otro y la prueba de choques de todo lo que se dibuja contra el cuerpo. Lo que salió (los discos del hack inverso contra los brazos, la palanca del hip thrust en máquina contra los codos, los muslos del curl con mancuerna que se cruzaban) ya está corregido.</li>
<li><b>Las variantes que la app junta y aquí se distinguen:</b> la barra hexagonal, el peso muerto con pausa, la zancada caminando, la búlgara con énfasis en glúteo, el hip thrust con pausa, la prensa con los pies juntos, la sentadilla Pendulum, la sentadilla en máquina y la extensión con pausa.</li>
</ul>
</section>''')

NOTES4 = {
    'Curl bíceps barra': 'De pie, con la barra apoyada por delante de los muslos (agarre supino, al ancho de los hombros): los codos, pegados al cuerpo, apenas se adelantan y la barra sube hasta delante de los hombros.',
    'Curl con barra Z': 'Como el curl con barra, con la barra Z: las manos, en las curvas de fuera, quedan medio giradas (más cómodo para las muñecas).',
    'Curl con barra agarre ancho': 'Las manos más abiertas que los hombros: los antebrazos se abren hacia fuera.',
    'Curl con barra agarre estrecho': 'Las manos más juntas que los hombros: los antebrazos se cierran hacia dentro, con los codos pegados al cuerpo.',
    'Curl con barra Z agarre cerrado': 'Con las manos en las curvas de dentro de la barra Z.',
    'Curl 21': 'Siete repeticiones de la mitad de abajo (hasta el antebrazo horizontal), siete de la de arriba (sin bajar de la mitad) y siete enteras. Aquí, dos de cada mitad y una entera, seguidas: entre las de abajo y las de arriba sube a la mitad y se para.',
    'Curl en Smith': 'Curl de arrastre en la Smith: la barra sube en vertical por sus guías, pegada al cuerpo, y los codos se van hacia atrás.',
    'Curl alterno mancuernas': 'Primero un brazo y luego el otro. Abajo, las mancuernas cuelgan por fuera de los muslos con las palmas medio giradas hacia dentro, y giran a supino al subir.',
    'Curl en banco inclinado': 'Recostado en el banco a 60°: los brazos cuelgan en vertical, por detrás del tronco, y el bíceps trabaja estirado. Las mancuernas suben en neutro hasta pasar la cadera y giran a supino arriba.',
    'Curl concentrado': 'Sentado e inclinado, con el codo derecho apoyado en la cara de dentro del muslo: el brazo cuelga en vertical y la mancuerna sube hacia el hombro contrario. La otra mano, en el otro muslo.',
    'Curl Zottman': 'Sube en supino; arriba gira las palmas hacia abajo y baja en prono (así trabaja también el antebrazo); abajo vuelve a girar.',
    'Curl con mancuernas': 'Los dos brazos a la vez. Abajo, las mancuernas por fuera de los muslos con las palmas medio giradas; al subir, giran a supino.',
    'Curl con mancuernas a 45°': 'Como el curl en banco inclinado, con el respaldo a 45°: los brazos quedan más por detrás del cuerpo.',
    'Curl con supinación completa': 'Empieza con las palmas hacia dentro (neutro) y gira al subir hasta pasar de supino, con el meñique hacia fuera.',
    'Drag curl': 'Las mancuernas suben arrastradas por delante del cuerpo, pegadas a él, mientras los codos se van hacia atrás.',
    'Curl con mancuernas sentado': 'Sentado en el extremo de un banco plano: las mancuernas cuelgan a los lados del banco, suben en neutro hasta pasar los muslos y arriba quedan en supino.',
    'Curl en polea': 'De pie frente a la polea baja, a un paso de la torre, con la barra corta de polea: el cable tira de la barra hacia la polea en todo el recorrido.',
    'Curl Bayesian': 'De espaldas a la polea baja y con un pie atrás: el brazo queda estirado por detrás del cuerpo y sube sin que el codo se adelante, con el bíceps estirado al empezar. En 3/4 se ve de frente, por el lado del brazo que trabaja; de lado, algo desde atrás.',
    'Curl en polea con cuerda': 'Con la cuerda: sube en neutro y, al final, las manos giran hacia fuera y abren los extremos de la cuerda (en el martillo en cuerda no giran).',
    'Curl en polea alta': 'Entre dos poleas altas, con los brazos en cruz a la altura de los hombros: los antebrazos suben hacia las orejas.',
    'Curl en polea a una mano': 'Con un asa y la mano derecha; la otra, en la cadera.',
    'Curl en polea tumbado': 'Tumbado boca arriba en el suelo, con los pies hacia la polea y los brazos apoyados junto al cuerpo: la barra sube del muslo al pecho y el cable pasa entre las piernas.',
    'Curl predicador': 'Sentado en el banco Scott, con los brazos en el atril y la axila en su borde: el antebrazo va de casi estirado (sin bloquear el codo) a vertical. Con barra Z.',
    'Curl spider': 'Boca abajo en un banco inclinado, con las axilas por encima del borde del respaldo: los brazos cuelgan en vertical y suben sin que se muevan los codos.',
    'Curl predicador con mancuerna': 'En el atril, con una mancuerna en la mano derecha; la otra, sobre el atril.',
    'Curl predicador en polea': 'En el atril, con el cable de una polea baja de delante.',
    'Curl Scott con barra recta': 'Como el predicador, con barra recta (las manos, en supino del todo).',
    'Curl martillo': 'Con las palmas hacia dentro todo el recorrido (agarre neutro): trabaja más el braquial y el braquiorradial.',
    'Curl martillo en cuerda': 'Con la cuerda en la polea baja, en neutro todo el recorrido: las manos no giran.',
    'Curl martillo cruzado': 'Alterno y en neutro, cruzando: la mancuerna sube hacia el hombro contrario, por delante del pecho.',
    'Curl martillo alterno': 'En neutro, primero un brazo y luego el otro.',
    'Curl martillo en banco inclinado': 'En el banco inclinado, con los brazos colgando por detrás del tronco, en neutro todo el recorrido.',
    'Curl martillo con barra Z': 'Con la barra Z y las manos en las curvas de dentro, medio giradas hacia neutro.',
    'Curl en máquina': 'La máquina de curl con atril: los brazos apoyados y las asas en la palanca, que gira en el eje de los codos; los ejes, en sus postes, con la pila de pesas delante, unida al armazón.',
    'Curl en máquina unilateral': 'En la máquina, con un brazo; el otro, apoyado también en el atril, con la mano plana.',
    'Curl inverso': 'Con la barra Z y las palmas hacia abajo (prono): trabaja sobre todo el braquiorradial y los extensores del antebrazo.',
    'Curl inverso en polea': 'Con barra recta en la polea baja y las palmas hacia abajo.',
    'Curl inverso con mancuernas': 'Con las palmas hacia abajo; abajo, medio giradas para que las mancuernas no rocen los muslos.',
    'TRX curl': 'De cara al anclaje, con el cuerpo recto inclinado hacia atrás desde los talones y los brazos estirados hacia él: al doblar los codos, las manos van a la frente y el cuerpo sube. Las cintas miden lo mismo todo el rato: la inclinación sale de ahí.',
    'Extensión tríceps polea': 'De pie frente a la polea alta, que cuelga de un brazo que sale de la columna (el cable baja separado de ella), con los codos pegados al cuerpo: solo se mueven los antebrazos, de la altura del pecho a los brazos estirados por delante de los muslos. Barra recta, agarre prono.',
    'Extensión con cuerda': 'Con la cuerda: arriba, las manos juntas; abajo, se separan a los lados de los muslos.',
    'Extensión tríceps unilateral': 'Con un asa y un brazo; la otra mano, en la cadera.',
    'Extensión agarre supino en polea': 'Con la barra recta y las palmas hacia arriba.',
    'Extensión con barra V': 'Con la barra en V: las manos juntas y medio giradas.',
    'Extensión en polea con banda': 'Con una banda colgada de un anclaje alto, en lugar del cable: un tramo hasta cada mano.',
    'Press francés': 'Tumbado en el banco con la barra Z sobre la cara: los brazos, casi verticales (algo hacia la cabeza), no se mueven, y los antebrazos bajan la barra hasta justo por encima de la frente.',
    'Rompecráneos barra Z': 'Con la barra Z y los brazos inclinados hacia atrás: la barra baja por detrás de la cabeza (en el press francés baja a la frente).',
    'Rompecráneos mancuernas': 'Con una mancuerna en cada mano, en neutro: bajan a los lados de la cabeza.',
    'Rompecráneos en polea': 'Con el cable de una polea baja que queda detrás de la cabeza: la tensión no se pierde arriba.',
    'Press francés en banco inclinado': 'Como el press francés, en el banco inclinado a 30°.',
    'Extensión sobre la cabeza': 'Sentado, con una mancuerna sujeta con las dos manos por la cabeza de arriba: los codos apuntan arriba y los antebrazos bajan la mancuerna por detrás de la cabeza.',
    'Extensión sobre la cabeza con cuerda': 'De espaldas a la polea, con un pie delante y el tronco inclinado: la cuerda, detrás de la cabeza, y los brazos se estiran hacia delante y arriba. El cable pasa por encima de la cabeza.',
    'Extensión sobre la cabeza con barra Z': 'De pie, con la barra Z y las manos juntas: baja por detrás de la cabeza.',
    'Extensión sobre la cabeza a una mano': 'Sentado, con una mancuerna en la mano derecha: baja por detrás de la cabeza hacia el hombro contrario. La otra mano, en el muslo.',
    'Kickback en polea': 'Inclinado unos 40°, con la mano izquierda en el muslo: el brazo derecho, pegado al costado y paralelo al tronco, estira el antebrazo hacia atrás contra el cable de una polea baja, delante. En 3/4 se ve de frente, por el lado del brazo que trabaja.',
    'Patada de tríceps': 'Con la rodilla y la mano izquierdas en el banco: el brazo derecho, paralelo al tronco con el codo algo por encima de la espalda, va del antebrazo colgando en vertical a estirado hacia atrás.',
    'Patada de tríceps a dos manos': 'De pie, inclinado desde la cadera con la espalda recta y el peso sobre el medio del pie: los dos brazos a la vez.',
    'Patada de tríceps con banda': 'Inclinado, con una banda pisada: cada tramo sube por fuera de la pierna hasta la mano.',
    'Extensión de tríceps en máquina': 'Sentado, con los brazos en el atril de la máquina y las asas en neutro: los antebrazos van de verticales a estirados, con la palanca girando en el eje de los codos.',
    'Fondos en máquina sentado': 'Sentado con la espalda en el respaldo: las asas, a los lados, bajan de la altura de las costillas a los costados de la cadera por el arco de sus palancas.',
    'Fondos': 'En las paralelas, con el tronco inclinado hacia delante (cargan más el pecho): el cuerpo baja hasta que los codos quedan en ángulo recto, con el peso siempre sobre las manos. Las rodillas, dobladas, y los pies detrás.',
    'Fondos asistidos en máquina': 'De rodillas en el apoyo de la máquina, en una palanca que sube y baja con ellas y descarga parte del peso.',
    'Fondos en paralelas': 'Con el tronco casi erguido (cargan más el tríceps).',
    'Ring dips': 'En anillas: las manos, quietas en ellas, y las cintas por fuera de los brazos.',
    'TRX fondos': 'Con el TRX: las cintas, por fuera de los brazos.',
    'Fondos en banco': 'De espaldas a un banco, con las manos en su borde y los pies en el suelo por delante: la cadera baja por delante del banco, sin rozarlo con la espalda ni los glúteos, hasta que los codos quedan en ángulo recto.',
    'Fondos en banco con lastre': 'Como los fondos en banco, con un disco sobre los muslos.',
    'Rodillo de muñeca': 'De pie, con los brazos al frente a la altura de los hombros: las muñecas giran una y otra vez, alternas, y la cuerda enrolla el disco hasta arriba; luego lo desenrolla despacio.',
    'Curl de muñeca inverso': 'Sentado e inclinado, con los antebrazos en los muslos y las palmas hacia abajo: la muñeca se estira y sube la barra.',
    'Curl de muñeca inverso con mancuerna': 'Con una mancuerna en la mano derecha y la palma hacia abajo.',
    'Extensión de muñeca en polea': 'Con la barra de una polea baja de delante y las palmas hacia abajo.',
    'Curl de muñeca': 'Sentado e inclinado, con los antebrazos apoyados en los muslos, las muñecas pasadas de las rodillas y las palmas hacia arriba: la barra baja con la muñeca estirada y sube doblándola.',
    'Curl de muñeca con mancuerna': 'Con una mancuerna en la mano derecha y la palma hacia arriba; el otro antebrazo, apoyado.',
    'Curl de muñeca en polea': 'Con la barra de una polea baja de delante y las palmas hacia arriba.',
    'Curl de muñeca tras la espalda': 'De pie, con la barra detrás de los glúteos y las palmas hacia atrás: los brazos, estirados, no se mueven y las muñecas suben la barra hacia atrás.',
}
FAMS4 = [('curl', 'Curls de bíceps', 'El codo no se mueve (o casi): el antebrazo sube desde el brazo estirado hasta delante del hombro. De pie, sentado, en banco inclinado, concentrado, araña, en el atril, en polea o en máquina, y con el giro de la mano de cada uno (supino, neutro o prono).'),
         ('trxCurl', 'Curl en TRX', 'Con el propio cuerpo, inclinado hacia atrás desde los talones.'),
         ('pushdown', 'Extensiones de tríceps en polea', 'De pie frente a la polea alta, con los codos pegados al cuerpo: el antebrazo baja hasta estirar el brazo.'),
         ('skull', 'Press francés y rompecráneos', 'Tumbado, con los brazos casi verticales y quietos: el antebrazo baja hasta llevar el peso junto a la cabeza y vuelve.'),
         ('overheadExt', 'Extensiones sobre la cabeza', 'Los codos apuntan arriba: el antebrazo baja por detrás de la cabeza y se estira.'),
         ('kickback', 'Patadas de tríceps', 'Inclinado, con el brazo pegado al costado y paralelo al tronco: el antebrazo va de colgar en vertical a estirarse hacia atrás.'),
         ('tricepsMachine', 'Tríceps en máquina', 'La extensión en el atril y los fondos sentado.'),
         ('dip', 'Fondos', 'Con las manos quietas en las paralelas (o en anillas, TRX o la máquina), el cuerpo baja hasta que los codos quedan en ángulo recto, con el peso sobre las manos.'),
         ('benchDip', 'Fondos en banco', 'Las manos en el borde de un banco detrás y los pies en el suelo delante.'),
         ('wristCurl', 'Antebrazos', 'Solo se mueve la muñeca: con los antebrazos apoyados en los muslos, con la barra detrás del cuerpo o con el rodillo.')]
LOTES[4] = dict(title='Figuras 3D · lote 4', notes=NOTES4, fams=FAMS4,
    head='''<p class="pr">StrataFit · figuras de ejercicio · lote 4 de la revisión</p>
<h1>Brazos: bíceps, tríceps, fondos y antebrazos, en 3D</h1>
<p class="lede">Los <b>75 ejercicios</b> de las familias de curl, curl en TRX, extensión de tríceps (en polea, tumbado, sobre la cabeza, la patada y en máquina), fondos y antebrazos, con la figura nueva moviéndose. Toca una figura para verla en grande con lo que hace; <b>Lado</b> la gira de perfil para comprobar la postura. Como los lotes anteriores, no está en la app: se integrará cuando estén todos.</p>
<p class="lede"><b>Novedades:</b> la mano gira con lo que agarra (supino, neutro o prono) y se dobla en la muñeca, así que se distinguen el martillo, el Zottman, los curls inversos y los de muñeca. Los alternos, el Zottman, el 21 y el rodillo dan una vuelta entera en cada ciclo. Hay atril (banco Scott), máquinas de curl y de tríceps, paralelas, anillas y TRX.</p>
''',
    found='''<section class="found">
<h2>Lo que he visto al revisarlo</h2>
<ul>
<li><b>Tras tu última revisión.</b> Los <b>curls con barra</b> pintan cada trozo de la barra y de sus discos según lo que de verdad lo tapa: con la cámara algo de lado, la mitad de la barra quedaba detrás del tronco y parecía atravesarlo (no lo toca: pasa a un par de centímetros de los muslos). El <b>curl Bayesian</b> se ve en 3/4 de verdad, de frente por el lado del brazo que trabaja, y de lado algo desde atrás. En el <b>curl Scott</b> y los demás de atril, el atril queda debajo de los brazos que descansan en él (antes, con la cámara algo alta, se pintaba encima y los brazos parecían meterse dentro) y, en los de una mano, el otro brazo también se apoya en él. El <b>curl en máquina</b> tiene su armazón, con los ejes en sus postes y la pila delante, unida a él, y las asas a lo largo del puño. En las <b>extensiones de tríceps en polea</b>, la polea cuelga de un brazo que sale de la columna y el cable baja separado de ella; en la de una mano, el cable entra por detrás de los nudillos y ya no cruza el antebrazo. El <b>kickback en polea</b> va algo menos inclinado, con la torre delante, y se ve en 3/4 de frente. En los <b>fondos en banco</b>, el cuerpo baja más adelantado y la espalda y los glúteos ya no tocan el banco. Y los <b>agarres</b>, repasados en todos: con la barra Z, cada mano sobre su tramo inclinado y la barra plana; la barra V, a lo largo de cada brazo de la V; en la polea alta, el asa de delante a atrás; la anilla, por dentro del puño; y, si el antebrazo queda algo torcido respecto a lo que agarra, la muñeca se dobla de lado, como de verdad.</li>\n<li><b>En la revisión anterior.</b> Los <b>curls</b> y las <b>extensiones de tríceps en polea</b> tienen la torre a un paso (la barra rozaba la columna) y una barra corta de polea, sin discos: antes llevaban la barra de curl con sus discos. En el <b>curl concentrado</b> y los demás curls con mancuerna, las cabezas de la mancuerna se pintan delante o detrás según lo que de verdad las tapa (junto a la espinilla parecían atravesarla).</li>
<li><b>En revisiones anteriores.</b> La máquina de <b>fondos asistidos</b> es nueva: las asas, de goma, en brazos que salen de una columna; el apoyo de las rodillas, en una palanca que gira en ella; la base en el suelo y la pila con su cable (antes las asas iban sobre dos postes sueltos y el apoyo, sobre uno). Las manos abiertas (la libre, apoyada en el muslo, en la rodilla o en el banco) tienen palma, dedos y pulgar: antes eran un muñón. Además, las manos (abiertas y cerradas) llevan el tono de los músculos según les da la luz, en vez del color oscuro de la piel que las hacía parecer guantes; los bancos llevan su larguero bajo el acolchado y las patas, tacos de goma, y las torres de polea, la base unida a la pila.</li>
<li><b>Más rápida.</b> La página ya no prepara todas las figuras al abrirse: cada una se prepara cuando va a verse o en los ratos libres del navegador, y la página solo lleva el código de sus familias, así que abre antes, sobre todo en el móvil. Además, las búsquedas de cada postura (el equilibrio, lo que llegan los brazos) necesitan menos pruebas y dan las mismas posturas.</li>
<li><b>Mejorado tras tu revisión.</b> El 21 enseña ya el tramo de arriba: dos de la mitad de abajo, sube a la mitad y se para, dos de la mitad de arriba sin bajar de ahí, y una entera. La barra Z es nueva: una W de verdad, con los tramos inclinados donde van las manos, las curvas en el plano de las palmas (giran con la barra) y más corta, con sus discos. Las máquinas tienen su pila de pesas, y las torres de polea, su columna con tapa, carro y pila. Además, cada postura se calcula una vez y se guarda, así que cada fotograma cuesta menos de dibujar.</li>
<li><b>Revisado a fondo.</b> Las 75 figuras pasan las pruebas de los lotes anteriores (manos que llegan, pies en el suelo, articulaciones posibles, sin saltos y choques de todo lo que se dibuja) y las dos nuevas: el grosor real del dibujo contra el material y las piezas que no deben moverse. Lo que salió, ya corregido: las mancuernas rozaban los muslos al colgar (abajo, los brazos van algo abiertos y las palmas medio giradas, y supinan al subir); sentado y en el banco inclinado pasaban por encima de los muslos (suben en neutro hasta pasarlos); el atril atravesaba el pecho (su borde de arriba queda ahora por delante) y su columna, los muslos; las poleas de las extensiones tocaban el antebrazo; el cable de la extensión sobre la cabeza cruzaba la cabeza (la polea, ahora más alta); las cintas de las anillas y del TRX rozaban los brazos (ahora bajan por fuera), y en los fondos en banco la cadera quedaba sobre los puños.</li>
<li><b>Músculos de la librería que no cuadraban.</b> <b>TRX curl</b> y <b>TRX fondos</b> llevaban dorsal y pectoral como principales (los compartían con su línea de la librería). Corregido en la misma rama que los de los otros lotes (desarrollo-musculos): el curl, con los músculos del curl con barra y el core; los fondos, con los de los fondos en anillas.</li>
<li><b>Lo que es una aproximación.</b> El 21 enseña dos repeticiones de cada mitad y una entera, no siete de cada. Las máquinas son genéricas, sin copiar ninguna marca. Las anillas y el TRX cuelgan quietos (en la realidad se mueven un poco). En la extensión sobre la cabeza con una mancuerna, la mancuerna cuelga en vertical de las manos. En el curl de muñeca sentado, el tronco va bastante inclinado: es lo que hace falta para que el antebrazo descanse en el muslo con la muñeca pasada de la rodilla.</li>
<li><b>Las variantes que la app junta y aquí se distinguen:</b> el agarre ancho y el estrecho, la barra Z con agarre cerrado, el 21, el Zottman, el curl a 45°, la supinación completa, el martillo cruzado, el martillo con barra Z, la máquina a una mano, los curls inversos, la extensión con agarre supino y con barra V, y los fondos en TRX.</li>
<li><b>Las que eran iguales.</b> El <b>curl simultáneo</b>, el <b>curl predicador en máquina</b> y los <b>fondos inclinado adelante</b> eran el mismo ejercicio que el curl con mancuernas, el curl en máquina y los fondos: salen de la librería, como la prensa 45°, en la rama de los músculos (desarrollo-musculos). Lo que ya se guardó con su nombre (rutinas, historial, notas) se conserva y muestra el que se queda, y el buscador los sigue encontrando por su nombre. Los otros dos sí eran distintos y ahora se ven distintos: en el <b>curl en polea con cuerda</b> las manos giran hacia fuera al final y abren la cuerda (en el martillo en cuerda no), y los <b>rompecráneos con barra Z</b> bajan la barra por detrás de la cabeza, con los brazos inclinados hacia atrás (el press francés la baja a la frente).</li>
</ul>
</section>''')

NOTES5 = {
    'Press pecho máquina': 'Sentado, con la espalda en el respaldo: las asas, en dos palancas que cuelgan de un eje alto, van de junto al pecho (los codos atrás y algo abiertos) a los brazos casi estirados al frente. La pila de pesas, detrás del respaldo.',
    'Press pecho máquina convergente': 'Como el press en máquina, pero las manos se juntan al estirar los brazos.',
    'Press de pecho en polea de pie': 'De pie, con un pie delante y el tronco algo inclinado, entre dos torres que quedan detrás y a los lados: las manos van del pecho al frente y los cables llegan por fuera de los brazos.',
    'Press de pecho unilateral en polea': 'Como el press en polea de pie, con el brazo derecho; la mano izquierda, en la cadera.',
    'Press inclinado en máquina': 'Sentado en la máquina: las manos empujan al frente y hacia arriba.',
    'Press inclinado en polea': 'De pie, con las poleas abajo y detrás: las manos empujan al frente y hacia arriba, y el cable cuelga de debajo del puño.',
    'Press declinado en máquina': 'Sentado en la máquina: las manos empujan al frente y hacia abajo.',
    'Press declinado en polea': 'De pie, con las poleas altas y detrás: las manos empujan al frente y hacia abajo.',
    'Flexiones': 'Las manos, abiertas en el suelo con los dedos hacia delante, algo más separadas que los hombros; el cuerpo, recto de los talones a la cabeza, gira alrededor de los tobillos: baja hasta que el pecho casi toca el suelo y sube hasta los brazos casi estirados, con los hombros encima de las muñecas.',
    'Flexiones con lastre': 'Como las flexiones, con un disco sobre la espalda.',
    'Flexiones con pies elevados': 'Con los pies en un banco: el cuerpo queda inclinado hacia la cabeza y, abajo, la cara se queda cerca del suelo.',
    'Flexiones con manos elevadas': 'Con las manos en el borde de un banco: el cuerpo queda inclinado hacia arriba (son más fáciles).',
    'Flexiones en anillas': 'Con las manos en dos anillas que cuelgan a un palmo del suelo.',
    'Flexiones arqueras': 'Con las manos muy separadas: al bajar, el cuerpo se va hacia la mano derecha, que es la que se dobla, y el brazo izquierdo sigue estirado hacia un lado.',
    'Flexiones con palmada': 'Baja despacio y empuja de golpe, sin pararse: el cuerpo sale despedido, las manos se despegan y dan una palmada delante del pecho, y al caer los codos amortiguan.',
    'Flexiones en TRX': 'De pie e inclinado hacia delante, con las manos en las asas del TRX: el cuerpo, recto, baja hasta tener las manos junto al pecho.',
    'Flexiones diamante': 'Con las manos juntas bajo el pecho: los codos se quedan más cerca del cuerpo y trabaja más el tríceps.',
    'Encogimientos': 'De pie, con la barra colgando por delante de los muslos y los brazos estirados: solo suben los hombros, hacia las orejas.',
    'Encogimientos con mancuernas': 'Con las mancuernas a los lados de los muslos y las palmas hacia dentro.',
    'Encogimientos en Smith': 'Con la barra de la Smith, que sube por sus guías.',
    'Encogimientos en máquina': 'Con las asas de la máquina a los lados, en una palanca que sube con los hombros.',
    'Encogimientos en polea': 'Con dos poleas bajas, una a cada lado.',
    'Encogimientos con barra hexagonal': 'Dentro de la barra hexagonal, con las asas a los lados del cuerpo.',
    'Pull-apart con banda': 'Con los brazos estirados al frente, a la altura de los hombros, y la banda de puño a puño, con las palmas hacia abajo: los brazos se abren hasta casi los lados y la banda queda tensa por delante del pecho.',
    'Pullover en polea': 'De pie frente a la polea alta, algo inclinado hacia delante, con una barra corta: los brazos, casi rectos, bajan desde arriba y por delante hasta los muslos.',
    'Pullover máquina': 'Sentado, con los codos en las almohadillas de una palanca que gira a la altura de los hombros: los brazos, doblados, bajan de por encima de la cabeza a delante del tronco.',
    'Jalón con brazos rectos con cuerda': 'Con la cuerda: al bajar, las manos se separan un poco.',
    'Aperturas en polea': 'De pie entre las dos torres, con las poleas a la altura del pecho: los brazos, con los codos algo doblados, van de abiertos a los lados a juntarse delante del pecho.',
    'Aperturas mancuernas': 'Tumbado en el banco: arriba, las mancuernas juntas sobre el pecho; los brazos, con los codos algo doblados, se abren hasta la altura del pecho y vuelven.',
    'Cruce de poleas': 'Con las poleas altas y el tronco inclinado sobre el pie adelantado: los brazos bajan desde arriba y a los lados hasta juntar las manos, que se cruzan un poco, delante de la cadera.',
    'Pec deck': 'Sentado en el contractor: con los codos doblados en ángulo recto y los antebrazos contra los rodillos (empujan los antebrazos, con las manos abiertas), los brazos se cierran delante de la cara.',
    'Aperturas inclinadas': 'Como las aperturas, en el banco inclinado.',
    'Cruce de poleas bajo': 'Con las poleas abajo: las manos suben desde los lados de la cadera hasta juntarse delante de la cara.',
    'Aperturas declinadas mancuernas': 'Como las aperturas, en el banco declinado, con los pies sujetos bajo los rodillos.',
    'Cruce de poleas a una mano': 'Como el cruce de poleas, con la mano derecha; la izquierda, en la cadera.',
    'Aperturas en banco inclinado con polea': 'Como las aperturas inclinadas, con dos poleas bajas a los lados del banco, a la altura del pecho: el cable tira hacia fuera y abajo.',
    'Aperturas en suelo con mancuernas': 'Tumbado en el suelo con las rodillas dobladas: los brazos se abren hasta que los codos tocan el suelo.',
    'Aperturas con bandas': 'De pie, con una banda atada detrás a cada lado: los brazos se cierran delante del pecho.',
    'Pullover mancuerna': 'Tumbado en el banco, con una mancuerna sujeta con las dos manos por un extremo: los brazos, casi estirados, van de verticales sobre el pecho a por detrás de la cabeza y vuelven.',
    'Pullover con barra Z': 'Como el pullover con mancuerna, con la barra Z.',
    'Elevaciones laterales': 'De pie, con las mancuernas colgando algo por delante: los brazos, con los codos un poco doblados, suben por los lados hasta la horizontal.',
    'Elevaciones laterales en polea': 'Con el brazo derecho y la polea baja al otro lado: el cable cruza por delante del cuerpo. La mano izquierda, en la cadera.',
    'Elevaciones laterales inclinado': 'Agarrado con la mano izquierda a un poste y con el cuerpo inclinado hacia el otro lado: el brazo derecho sube por el lado.',
    'Elevaciones laterales en máquina': 'Sentado, con los codos doblados y apoyados por fuera en los acolchados de las palancas: los brazos suben por los lados hasta la horizontal.',
    'Elevaciones laterales a una mano en polea': 'Inclinado hacia el otro lado y agarrado con la mano izquierda a la columna de la torre: el brazo derecho sube desde delante de la cadera hasta la horizontal.',
    'Elevaciones laterales sentado': 'Como las elevaciones laterales, sentado en el extremo de un banco plano.',
    'Elevaciones laterales con banda': 'Con la banda pisada y un extremo en cada mano.',
    'Elevaciones laterales tumbado de lado': 'Tumbado de lado en el banco, sobre el costado derecho: el brazo izquierdo sube desde junto al muslo hasta la vertical. La mano derecha, junto a la cabeza.',
    'Elevaciones laterales parciales': 'Solo la mitad de abajo del recorrido.',
    'Elevaciones frontales': 'De pie, con las mancuernas de través por delante de los muslos: los brazos, casi estirados, suben por delante hasta la horizontal.',
    'Elevaciones frontales con disco': 'Con un disco sujeto con las dos manos abiertas, por los lados.',
    'Elevaciones frontales con barra': 'Con una barra recta y las palmas hacia abajo.',
    'Elevaciones frontales en polea': 'De espaldas a la polea baja: el cable pasa entre las piernas hasta una barra corta.',
    'Elevaciones frontales con cuerda': 'Como en polea, con la cuerda.',
    'Elevaciones frontales alternas': 'Primero un brazo y luego el otro.',
    'Pájaros mancuernas': 'De pie, inclinado desde la cadera con la espalda recta y las rodillas dobladas: los brazos cuelgan y se abren a los lados, con los codos algo doblados.',
    'Face pull': 'De cara a la polea, a la altura de la cara, con la cuerda: de los brazos estirados hacia ella a las manos junto a las orejas, separadas y con los antebrazos hacia arriba, y los codos abiertos y altos.',
    'Pájaros en máquina': 'Sentado de cara a la máquina, con el pecho contra el respaldo: los brazos, al frente y a la altura de los hombros, se abren hasta los lados.',
    'Pájaros en polea': 'De pie frente a dos poleas a la altura de los hombros, con los cables cruzados (cada mano lleva el de la polea del otro lado): los brazos se abren desde delante hasta los lados.',
    'Elevación Y': 'Boca abajo en el banco inclinado: los brazos cuelgan y suben hacia delante y arriba, abiertos en Y.',
    'Pájaros en banco inclinado': 'Boca abajo en el banco inclinado: los brazos cuelgan y suben hasta los lados, en T.',
    'Face pull con banda': 'Con la banda atada a un poste a la altura de la cara.',
    'Elevación T': 'Boca abajo en el banco inclinado, con los brazos estirados y los pulgares hacia arriba: suben por los lados hasta dibujar una T.',
    'Face pull a una mano': 'Con un asa y el brazo derecho; la mano izquierda, en la cadera.',
    'Remo al mentón': 'De pie, con la barra por delante de los muslos y las manos algo más juntas que los hombros: la barra sube pegada al cuerpo hasta lo alto del pecho, bajo la barbilla, con los codos hacia fuera y por encima de las manos.',
    'Remo al mentón con mancuernas': 'Con una mancuerna en cada mano, que cuelga del puño algo inclinada: suben pegadas al cuerpo, con los codos por encima de las manos.',
    'Remo al mentón con barra Z': 'Con la barra Z, con discos pequeños (los codos van muy abiertos).',
    'Remo al mentón con cuerda en polea': 'Frente a la polea baja, con la cuerda.',
    'Remo al mentón agarre ancho': 'Con las manos al ancho de los hombros.',
    'Parallette push-ups': 'Flexiones con las manos en dos paralelas bajas (agarre neutro): el pecho baja por debajo de las manos.',
    'TRX flexiones': 'Con los pies colgados en las cunas del TRX y las manos en el suelo.',
    'Press con banda de pie': 'De pie, con una banda atada detrás a cada lado: las manos empujan del pecho al frente y las bandas pasan por fuera de los brazos.',
}
FAMS5 = [('pushup', 'Flexiones', 'Las manos, quietas (en el suelo, en un banco, en anillas o en paralelas), y el cuerpo recto, que gira alrededor de los tobillos: arriba, los hombros encima de las muñecas con los brazos casi estirados; abajo, el pecho casi en el suelo.'),
         ('pressOut', 'Press de pecho de pie y en máquina', 'Las manos van de junto al pecho, con los codos atrás y algo abiertos, a los brazos casi estirados al frente (hacia arriba en el inclinado y hacia abajo en el declinado). En máquina, sentado; en polea o con banda, de pie con un pie delante.'),
         ('fly', 'Aperturas con mancuernas', 'Tumbado (en banco plano, inclinado, declinado o en el suelo): los brazos, con los codos algo doblados y sin moverlos, se abren desde encima del pecho hasta su altura.'),
         ('cross', 'Cruces de poleas, aperturas en polea y contractor', 'Los brazos, con los codos algo doblados, van de abiertos a juntos delante: desde las poleas altas, las manos se juntan delante de la cadera; a media altura, del pecho; desde abajo, de la cara. En el contractor, con los antebrazos verticales contra los rodillos.'),
         ('pullover', 'Pullover', 'Tumbado en el banco, con los brazos casi estirados: de encima del pecho a por detrás de la cabeza.'),
         ('straightArm', 'Jalón con brazos rectos y pullover de pie o en máquina', 'Los brazos, casi rectos, bajan desde arriba y por delante hasta los muslos; en la máquina, sentado, con los codos en las almohadillas.'),
         ('shrug', 'Encogimientos', 'Los brazos cuelgan estirados y solo suben los hombros, hacia las orejas.'),
         ('lateral', 'Elevaciones laterales', 'Los brazos suben por los lados hasta la horizontal, con los codos un poco doblados.'),
         ('frontRaise', 'Elevaciones frontales', 'Los brazos, casi estirados, suben por delante hasta la horizontal.'),
         ('rearFly', 'Pájaros y pull-apart', 'Para la parte de atrás del hombro: los brazos, casi estirados, se abren hacia los lados (inclinado, boca abajo en el banco, en la máquina, en polea o con banda).'),
         ('facePull', 'Face pull', 'Desde los brazos estirados hacia la polea (o la banda), a la altura de la cara, hasta las manos junto a las orejas, con los codos abiertos y altos.'),
         ('upright', 'Remo al mentón', 'Las manos suben pegadas por delante del cuerpo, de los muslos al pecho, con los codos hacia fuera y por encima de ellas.')]
LOTES[5] = dict(title='Figuras 3D · lote 5', notes=NOTES5, fams=FAMS5,
    head='''<p class="pr">StrataFit · figuras de ejercicio · lote 5 de la revisión</p>
<h1>Pecho y hombros: flexiones, aperturas, elevaciones y pájaros, en 3D</h1>
<p class="lede">Los <b>72 ejercicios</b> de las familias de flexiones, press de pecho de pie y en máquina, aperturas, cruces de poleas y contractor, pullover, jalón con brazos rectos, encogimientos, elevaciones laterales y frontales, pájaros, face pull y remo al mentón, con la figura nueva moviéndose. Toca una figura para verla en grande con lo que hace; <b>Lado</b> la gira de perfil para comprobar la postura. Como los lotes anteriores, no está en la app: se integrará cuando estén todos.</p>
<p class="lede"><b>Novedades:</b> la figura apoya las manos abiertas en el suelo, con los dedos hacia delante (las flexiones), y se puede tumbar de lado (las elevaciones laterales tumbado). Hay contractor, máquinas de press de pecho, de pájaros, de elevaciones laterales, de encogimientos y de pullover, barra hexagonal y paralelas bajas.</p>
''',
    found='''<section class="found">
<h2>Lo que he visto al revisarlo</h2>
<ul>
<li><b>Tras tu última revisión.</b> La página ya no se queda sin figuras: las flexiones con palmada usaban algo que esta página no cargaba y, al llegar a ellas, dejaba de dibujar y de mover las demás. Las <b>elevaciones laterales sentado</b> tienen su banco (antes se sentaba en el aire). Los <b>agarres</b>, repasados: en el <b>pull-apart con banda</b>, la banda pasa de puño a puño con las palmas hacia abajo; en el <b>contractor</b> empujan los antebrazos, con las manos abiertas; el <b>disco</b> de las elevaciones frontales se sujeta por los lados con las manos abiertas; las asas del <b>press de pecho en máquina</b> van a lo largo del puño; en los <b>pájaros en polea</b> cruzados, el asa va de través al cable; y, si el antebrazo queda algo torcido respecto a la barra, la muñeca se dobla de lado, como de verdad.</li>\n<li><b>En la revisión anterior.</b> Las <b>flexiones con palmada</b> van de seguido: bajan despacio, empujan de golpe, el cuerpo vuela en parábola mientras las manos se juntan y, al caer, amortigua. Los <b>presses en polea</b> se hacen con el tronco algo inclinado sobre el pie adelantado y las manos un poco más juntas al estirar, y en los <b>cruces de polea</b> el tronco se inclina más cuanto más alta es la polea y las manos llegan a juntarse (desde arriba, se cruzan delante de la cadera). Las <b>aperturas en banco inclinado con polea</b> tienen las torres a los lados de donde quedan las manos, más separadas (antes quedaban hacia los pies y el cable tiraba en diagonal). Los <b>pájaros en máquina</b> se ven desde atrás, con el pecho apoyado en el respaldo, y las <b>elevaciones Y y T</b>, desde atrás y arriba, donde se ve la forma de los brazos. En el <b>face pull</b>, las manos acaban junto a las orejas con los antebrazos hacia arriba (antes, delante de la cara, como un remo), y el <b>remo al mentón</b> sube hasta lo alto del pecho.</li>
<li><b>En revisiones anteriores.</b> Las <b>manos abiertas</b> tienen palma, dedos y pulgar (antes eran un muñón): en las flexiones apoyan la palma con los dedos hacia delante, y en la palmada se juntan de verdad. Las máquinas de <b>press de pecho</b> (plana, convergente, inclinada y declinada) llevan las asas en palancas rígidas con su bastidor; el <b>contractor</b>, los <b>pájaros</b> y las <b>elevaciones laterales en máquina</b>, sus ejes unidos a la columna por una viga (antes flotaban), y en el contractor el rodillo gira con el antebrazo. Las torres del <b>cruce de poleas</b>, más separadas, como en uno de verdad. En el <b>pullover en polea</b> y el jalón con brazos rectos con cuerda, el tronco va más inclinado y los brazos salen de más arriba, con la torre más lejos; la <b>máquina de pullover</b> tiene su bastidor. En el <b>remo al mentón con mancuernas</b>, las mancuernas ya no se meten en los antebrazos. Además, las manos (abiertas y cerradas) llevan el tono de los músculos según les da la luz, en vez del color oscuro de la piel que las hacía parecer guantes; los bancos llevan su larguero bajo el acolchado y las patas, tacos de goma, y las torres de polea, la base unida a la pila.</li>
<li><b>Más rápida.</b> La página ya no prepara todas las figuras al abrirse: cada una se prepara cuando va a verse o en los ratos libres del navegador, y la página solo lleva el código de sus familias, así que abre antes, sobre todo en el móvil. Además, las búsquedas de cada postura (el equilibrio, lo que llegan los brazos) necesitan menos pruebas y dan las mismas posturas.</li>
<li><b>Revisado a fondo.</b> Las 72 figuras pasan todas las pruebas de los lotes anteriores: manos que llegan, pies en el suelo, articulaciones posibles, sin saltos, choques de todo lo que se dibuja, el grosor real del dibujo contra el material y las piezas que no deben moverse. Lo que salió, ya corregido: los cables del press en polea y de los pájaros en polea atravesaban brazos y antebrazos (las torres, ahora más abiertas o más lejos, y en el press inclinado el cable cuelga de debajo del puño); las cintas de las anillas rozaban los brazos (bajan por fuera); la banda del pull-apart cruzaba el tronco y los antebrazos (ahora va por delante de los puños), y la del press y las aperturas con bandas rozaba el antebrazo (sale del lado del puño que da al anclaje); en el contractor, el rodillo se metía en el antebrazo; en la máquina de pullover, la palanca atravesaba el brazo y los antebrazos se cruzaban; en la de elevaciones laterales, el acolchado se metía en el brazo (ahora apoya por fuera, junto al codo); las mancuernas de las elevaciones frontales se hundían en los muslos; en el remo al mentón, la barra rozaba los antebrazos y los puños, los muslos, y con la barra Z los discos tocaban los brazos, y en el press declinado en polea el codo daba un salto al empezar a doblarse (arriba, el brazo ya no se estira del todo).</li>
<li><b>Visto en las figuras.</b> En las flexiones arqueras, el brazo que se queda estirado se doblaba: ahora sigue estirado y el cuerpo se corre hacia la otra mano lo justo para eso.</li>
<li><b>Músculos de la librería que no cuadraban.</b> <b>TRX flexiones</b> y <b>Press con banda de pie</b> llevaban el dorsal como principal (comparten línea con remos), <b>Parallette push-ups</b>, el hombro y el tríceps (su línea es la de los pinos), y <b>Pull-apart con banda</b>, los músculos del encogimiento. Corregido en la misma rama que los de los otros lotes (desarrollo-musculos): llevan los de las flexiones, el press de pecho en polea de pie y los pájaros con banda.</li>
<li><b>Lo que es una aproximación.</b> La palmada es un empujón corto: las manos se despegan, se juntan delante del pecho y vuelven al suelo. En las arqueras, el cuerpo va siempre hacia la mano derecha (se suele alternar). En los pájaros en polea, las dos poleas quedan delante y más juntas que en un cruce de poleas, para que los cables se crucen delante del cuerpo sin tocar los brazos. Las máquinas son genéricas, sin copiar ninguna marca. Las anillas y el TRX cuelgan quietos, y lo alto de las torres, las anillas y el TRX se sale del encuadre.</li>
<li><b>Las variantes que la app junta y aquí se distinguen:</b> la máquina convergente, el press inclinado y el declinado (en máquina y en polea), cada flexión (con lastre, con pies o manos en alto, en anillas, arqueras, con palmada, diamante, en TRX y en paralelas), la barra hexagonal, el cruce bajo, el pullover con barra Z, las laterales inclinado, tumbado de lado y parciales, las frontales con disco, barra, cuerda y alternas, la elevación Y y el remo al mentón con agarre ancho.</li>
<li><b>Las que eran iguales.</b> El <b>cruce de poleas alto</b>, los <b>pájaros en polea cruzada</b>, los <b>pájaros con banda</b> y el <b>jalón con brazos rectos</b> eran el mismo ejercicio que el cruce de poleas, los pájaros en polea, el pull-apart con banda y el pullover en polea: salen de la librería, como la prensa 45°, en la rama de los músculos (desarrollo-musculos). Lo que ya se guardó con su nombre se conserva y muestra el que se queda, y el buscador los sigue encontrando. Los demás sí eran distintos y ahora se ven distintos: la <b>elevación lateral a una mano en polea</b> va inclinada, agarrada a la columna de la torre; la <b>elevación T</b> sube con los brazos estirados y los pulgares arriba; y las <b>flexiones en TRX</b> van de pie, con las manos en las asas, mientras que <b>TRX flexiones</b> van con los pies en las cunas y las manos en el suelo.</li>
</ul>
</section>''')

NOTES6 = {
    'Crunch': 'Tumbado boca arriba, las rodillas dobladas y los pies apoyados, los brazos cruzados sobre el pecho: los hombros se despegan del suelo enrollando la columna, la zona lumbar sigue apoyada.',
    'Crunch con peso': 'El mismo crunch con un disco sobre el pecho, sujeto con los brazos cruzados por encima.',
    'Sit-up': 'Los brazos cruzados sobre el pecho: primero se enrolla la columna y luego sube el tronco entero hasta quedar sentado; los pies, apoyados.',
    'Sit-ups': 'El de CrossFit: las plantas juntas y las rodillas abiertas, con el abmat bajo la zona lumbar; las manos tocan el suelo detrás de la cabeza y, al sentarse, los pies.',
    'Crunch en banco declinado': 'En el banco declinado, las rodillas dobladas sobre su borde de arriba y los tobillos bajo el rodillo: el tronco sube hasta la mitad del recorrido.',
    'Crunch bicicleta': 'Los hombros despegados y las manos detrás de la cabeza, con los codos abiertos: una rodilla va al pecho mientras la otra pierna se estira, y el tronco gira llevando el codo contrario hacia ella.',
    'V-ups': 'De tumbado, con los brazos por encima de la cabeza y las piernas estiradas, tronco y piernas suben a la vez hasta que las manos llegan a los pies.',
    'Crunch con balón suizo': 'La zona lumbar apoyada arriba del balón y los pies en el suelo: la espalda se arquea sobre el balón y se enrolla.',
    'Toques de talón': 'Con los hombros despegados, el tronco se dobla de lado y la mano llega hacia el talón, primero un lado y luego el otro.',
    'Crunch en polea': 'De rodillas frente a la polea alta, a un paso de la torre, con la cuerda junto a la cabeza: la espalda se enrolla hacia el suelo llevando los codos hacia las rodillas, sin sentarse sobre los talones.',
    'Crunch en máquina': 'Sentado, con las asas junto a los hombros: el tronco se enrolla hacia delante; las asas van en una palanca que gira a los lados del tronco.',
    'GHD sit-up': 'Sentado en el borde del sillín del GHD (los muslos apoyados y los glúteos fuera), boca arriba, con las rodillas algo dobladas, las puntas de los pies hacia arriba, las plantas contra la plataforma y los tobillos entre los rodillos: el tronco baja hacia atrás por debajo de la horizontal, con los brazos por encima de la cabeza, y sube hasta tocar los pies.',
    'Elevación de piernas': 'Tumbado, los brazos estirados a lo largo del cuerpo y las palmas en el suelo junto a la cadera: las piernas, estiradas y juntas, suben hasta la vertical y bajan sin tocar el suelo.',
    'Crunch inverso': 'Las rodillas dobladas en el aire: la cadera se enrolla y despega del suelo llevando las rodillas al pecho; la espalda alta no se mueve.',
    'Dragon flag': 'Tumbado en un banco, agarrado a su borde por detrás de la cabeza: sube como un crunch inverso (las rodillas al pecho, la cadera rueda sobre la parte alta de la espalda y las piernas se estiran hacia el techo), apoyado en la parte alta de la espalda y la nuca, con la barbilla hacia el pecho, y baja despacio con el cuerpo recto como una tabla. Una vuelta dura algo más de seis segundos.',
    'Dead bug': 'Boca arriba, los brazos hacia el techo y las rodillas a 90°: se estiran a la vez un brazo hacia atrás y la pierna contraria hacia delante, y luego los otros.',
    'Plancha': 'En los antebrazos (los codos bajo los hombros) y las puntas de los pies, el cuerpo recto de la cabeza a los talones; solo se mueve con la respiración.',
    'Hollow hold': 'Boca arriba con la zona lumbar pegada al suelo: hombros y piernas estiradas despegados y los brazos por encima de la cabeza.',
    'Hollow hold con balón': 'El hollow con un balón medicinal entre las manos, por encima de la cabeza.',
    'Hollow rock': 'En la postura del hollow, el cuerpo rígido se balancea adelante y atrás como un balancín.',
    'Plancha con desplazamiento': 'De la plancha en antebrazos a los brazos estirados, primero un brazo y luego el otro, y vuelta abajo, con la cadera quieta.',
    'Plancha con arrastre de peso': 'En plancha con los brazos estirados: la mano contraria pasa por debajo del cuerpo y arrastra la mancuerna al otro lado; luego la otra mano la devuelve.',
    'Body saw': 'En los antebrazos, con los pies en deslizadores: el cuerpo, recto, va hacia atrás y vuelve, con los codos quietos.',
    'Mountain climbers': 'En plancha con los brazos estirados y la cadera algo alta: un pie atrás, de puntillas, y el otro delante, de puntillas bajo la cadera con la rodilla bajo el pecho; las piernas se cambian a la vez con un saltito (la cadera sube un poco), como corriendo en el sitio.',
    'Plancha con toque de hombro': 'En plancha con los brazos estirados (los pies algo abiertos), una mano sube a tocar el hombro contrario y vuelve; luego la otra.',
    'Plancha lateral': 'Sobre el antebrazo derecho (el codo bajo el hombro) y el canto de los pies, el cuerpo recto y la mano izquierda en la cadera.',
    'Plancha lateral con elevación de pierna': 'La misma plancha lateral, con la pierna de arriba que sube unos 30 cm y baja.',
    'Bird dog': 'A cuatro patas: se estiran a la vez un brazo hacia delante, a la altura del hombro y con el pulgar arriba, y la pierna contraria hacia atrás, a la altura de la cadera y con la punta del pie hacia el suelo; y luego los otros.',
    'Vacuum abdominal': 'De pie, con las manos en la cadera: se saca el aire y el ombligo va hacia dentro; el pecho sube un poco.',
    'Hiperextensiones': 'En el banco horizontal (silla romana), la cadera en el borde del acolchado y los tobillos bajo el rodillo: el tronco baja colgando, con la espalda recta, y sube hasta quedar en línea con las piernas.',
    'Hiperextensiones a 45°': 'En el banco a 45°, con las piernas inclinadas: el tronco baja y sube hasta quedar en línea con ellas.',
    'Hiperextensiones con lastre': 'Las de 45° con un disco abrazado contra el pecho.',
    'GHD hip extension': 'Boca abajo en el GHD, la cadera sobre el sillín, las plantas contra la plataforma y los talones bajo el rodillo: el tronco baja hacia el suelo y sube hasta la horizontal.',
    'Superman': 'Boca abajo en el suelo, los brazos estirados por delante: brazos, pecho y piernas se despegan a la vez y vuelven.',
    'Extensión lumbar en máquina': 'Sentado, los pies en el reposapiés, los muslos bajo el rodillo y los brazos cruzados sobre el pecho: la espalda alta empuja hacia atrás el respaldo de la palanca, que gira en la línea de la cadera, desde algo inclinado hacia delante hasta pasar un poco la vertical.',
    'Hiperextensiones inversas': 'Boca abajo en el acolchado alto (la máquina de hiperextensiones inversas), la cadera en el borde y las manos en los agarres de delante: las piernas cuelgan libres y suben estiradas, apretando los glúteos, hasta pasar un poco la horizontal; arriba aguantan un momento y bajan despacio.',
    'Russian twist': 'Sentado, inclinado hacia atrás con la espalda recta y los pies despegados: las manos juntas van de un costado al otro, girando el tronco.',
    'Russian twist con peso': 'El mismo giro con un balón medicinal en las manos.',
    'Rotación con mancuerna': 'De pie, la mancuerna delante del pecho cogida con las dos manos: el tronco gira a un lado y a otro con la cadera quieta.',
    'Rotación en máquina': 'Sentado, con las piernas sujetas y el pecho contra el apoyo: el tronco gira hacia un lado contra la resistencia y vuelve.',
    'Giro de tronco con barra': 'De pie, la barra sobre los hombros: el tronco gira a un lado y a otro con la cadera mirando al frente; la barra gira con los hombros.',
    'Rueda abdominal': 'De pie, de la carpa (el tronco casi horizontal y los brazos verticales, con la rueda bajo los hombros) al cuerpo estirado, casi paralelo al suelo, de puntillas, y vuelta.',
    'Ab wheel de rodillas': 'De rodillas, la cadera sobre las rodillas y la espalda redondeada, con la rueda casi bajo los hombros: la rueda sale despacio mientras la cadera se abre, hasta quedar el cuerpo casi recto a un palmo del suelo con los brazos estirados por delante de la cabeza; aguanta y vuelve.',
    'Leñador en polea': 'De lado a la polea alta, el asa con las dos manos: tira en diagonal de arriba, del lado de la polea, hacia la cadera contraria, girando el tronco.',
    'Leñador en polea bajo': 'Con la polea abajo: de junto a la rodilla, del lado de la polea, en diagonal hasta por encima del hombro contrario.',
    'Pallof press': 'De lado a la polea a la altura del pecho: el asa va del esternón a los brazos estirados y vuelve, sin dejar que el tronco gire hacia la polea. De lado se ve desde atrás, para que el brazo no tape lo que trabaja.',
    'Gemelo de pie': 'En la máquina, las hombreras sobre los hombros y la bola del pie en el borde de la plataforma: el talón baja por debajo de ella y sube de puntillas.',
    'Gemelo de pie unilateral en máquina': 'En la máquina de gemelo de pie, con un pie en la plataforma; la otra pierna, relajada, con la rodilla algo doblada y el pie detrás de la pantorrilla que trabaja.',
    'Gemelo a una pierna': 'En el borde de un escalón con un pie, la otra pierna relajada con el pie detrás de la pantorrilla; la mano derecha, en un poste que queda delante y algo a ese lado, con el codo relajado, y la otra suelta junto al cuerpo. En 3/4 se ve por el lado de la pierna que trabaja.',
    'Gemelo con mancuerna a una pierna': 'A una pierna en el escalón, con la mancuerna colgando en la mano del mismo lado y la otra en un poste delante, con el codo relajado.',
    'Gemelo burro': 'Inclinado hacia delante con los antebrazos en su apoyo y la cadera bajo el acolchado de la palanca: los talones bajan y suben.',
    'Gemelo en Smith': 'La barra de la Smith sobre la espalda y la bola del pie en un escalón: la barra sube y baja por sus guías.',
    'Gemelo con barra': 'La barra sobre la parte alta de la espalda y la bola del pie en un escalón bajo.',
    'Gemelo en escalón': 'Los dos pies en el borde de un escalón, agarrado a un poste delante: los talones bajan por debajo y suben de puntillas.',
    'Saltos de gemelo': 'Saltos cortos y seguidos con las rodillas casi estiradas, como bota una pelota: los tobillos ceden al caer y empujan; en el aire, las puntas estiradas y los brazos sueltos.',
    'Gemelo sentado': 'Sentado, las rodillas bajo el acolchado de la palanca y la bola del pie en la plataforma: el acolchado sube con las rodillas.',
    'Gemelo sentado unilateral': 'En la máquina de gemelo sentado con un solo pie; el otro, en el suelo.',
    'Gemelo sentado con barra': 'Sentado en un banco, la barra (con su protector) sobre los muslos junto a las rodillas y la bola del pie sobre un escalón.',
    'Gemelo sentado con mancuerna': 'Sentado, con un pie en el escalón y la mancuerna de través sobre esa rodilla, cogida por el asa.',
    'Elevación de puntas (tibial)': 'De pie con la espalda apoyada en la pared y los talones algo separados de ella: las puntas suben hacia las espinillas.',
    'Tibial en máquina': 'Sentado, los talones en la plataforma y el empeine bajo el rodillo: las puntas suben hacia las espinillas.',
    'Tibial con banda': 'Sentado en el suelo con las piernas estiradas y las manos detrás: la banda va del empeine a un poste por delante, y la punta del pie tira hacia uno.',
    'Abducción en máquina': 'Sentado en la máquina, las rodillas dobladas y los acolchados (cojines redondos, de pie) contra la cara de fuera de las rodillas, en palancas que giran bajo la cadera: los muslos se abren. En 3/4, de frente y algo desde arriba, se ve cómo se abren; de lado, el glúteo medio, en el costado, que es lo que trabaja.',
    'Aducción en máquina': 'En la misma máquina con los acolchados por dentro de las rodillas, contra la cara de dentro: los muslos se cierran hasta casi juntarse.',
    'Abducción en polea': 'De pie, de lado a la polea baja, con la tobillera en el tobillo de fuera y agarrado a la torre: la pierna se separa del cuerpo.',
    'Aducción en polea': 'De lado a la polea, con la tobillera en el tobillo de dentro: la pierna cruza por delante de la otra.',
    'Abducción con banda': 'Sentado en un banco con la minibanda sobre las rodillas: las rodillas se separan contra la banda y vuelven, con los pies quietos.',
    'Abducción tumbado de lado': 'Tumbado de lado con la cabeza en el brazo y la otra mano delante: la pierna de arriba, estirada, sube y baja.',
    'Aducción con balón': 'Boca arriba con las rodillas dobladas y un balón entre ellas: las rodillas lo aprietan y sueltan.',
    'Patada de glúteo en polea': 'De pie frente a la polea baja, la tobillera en un tobillo y agarrado a la máquina: la pierna, casi estirada, va hacia atrás hasta pasar la línea del cuerpo.',
    'Extensión de cadera máquina': 'De pie en la plataforma de la máquina, agarrado a las asas, con el rodillo detrás del muslo, encima de la rodilla, en una palanca que gira en la línea de la cadera (su eje va en una columna detrás): la pierna empuja hacia atrás, aprieta un momento y vuelve despacio.',
    'Patada de glúteo en máquina': 'De rodillas en la máquina (la espinilla de apoyo sobre su acolchado y los antebrazos en el de delante), con la planta del otro pie contra la plataforma de una palanca que cuelga de un eje por encima de la cadera: empuja hacia atrás y arriba, por el arco de la palanca, hasta dejar el muslo casi horizontal; aprieta un momento y vuelve.',
    'Patada de glúteo a cuatro apoyos': 'A cuatro patas: una pierna, con la rodilla doblada, sube hasta dejar el muslo paralelo al suelo y la planta hacia el techo.',
    'Donkey kick con banda': 'A cuatro patas, la banda bajo las manos y en la planta de un pie: el pie empuja hacia atrás y arriba hasta casi estirar la pierna.',
    'Step up': 'Un pie entero en un cajón a la altura de la rodilla, con una mancuerna en cada mano: sube empujando con ese pie hasta estirar la pierna y el otro pie llega al cajón, también entero; luego baja despacio.',
    'Step up lateral': 'De lado a un cajón bajo, con el pie de ese lado en él: sube hasta estirar la pierna y el otro pie se posa en el cajón, junto al primero.',
    'Step up alto': 'El cajón por encima de la rodilla: el peso pasa al pie de arriba con el tronco inclinado, esa pierna se estira y el otro pie sube por detrás; al bajar, el de abajo llega despacio al suelo.',
    'Box step-over': 'Sube al cajón (un pie y luego el otro), baja por el otro lado, se da la vuelta y repite, sin peso: los pies pasan por encima del borde y la cadera sube y baja con las piernas, sin tirones.',
    'Sissy squat': 'De puntillas, los pies a la anchura de la cadera y agarrado a un poste a un lado: las rodillas van hacia delante y abajo con la cadera estirada; de las rodillas a los hombros, una línea que se inclina hacia atrás. De lado se ve desde el lado contrario al poste, para que no tape las piernas.',
    'Pistol asistida': 'Sobre una pierna, la otra estirada por delante y agarrado a las asas del TRX: baja con el talón en el suelo y el tronco bastante erguido (las cintas sujetan) y sube.',
    'Pasos laterales con banda': 'En media sentadilla con la minibanda sobre las rodillas: un paso corto a un lado y el otro pie le sigue sin juntarse (cada pie se despega al moverse); luego, de vuelta.',
    'Zancada lateral': 'Con la mancuerna delante del pecho, de seguido: mientras el pie sale a un lado, la cadera ya va hacia él; al posarse baja hacia atrás doblando esa rodilla, con la otra pierna estirada y el pie plano, aguanta un momento y vuelve empujando al centro, con el pie despegándose cuando ya casi ha llegado.',
}
FAMS6 = [('crunch', 'Crunch y sit-up', 'Boca arriba (o en el banco, en el balón, en la polea, en la máquina o en el GHD): la columna se enrolla y, en el sit-up, el tronco sube hasta quedar sentado.'),
         ('legRaise', 'Elevaciones de piernas', 'Las piernas suben hacia el tronco (o, en el crunch inverso, la cadera se enrolla); en el dragon flag, sube recogido y baja recto como una tabla.'),
         ('plank', 'Planchas y hollow', 'El cuerpo recto y quieto (con la respiración) o moviendo un brazo o una pierna sin perder la línea; el hollow, boca arriba.'),
         ('sidePlank', 'Plancha lateral', 'De lado sobre el antebrazo y el canto de los pies, con la cadera arriba.'),
         ('deadBug', 'Dead bug', 'Boca arriba: brazo y pierna contrarios se estiran a la vez.'),
         ('birdDog', 'Bird dog', 'A cuatro patas: brazo y pierna contrarios se estiran a la vez.'),
         ('vacuum', 'Vacío abdominal', 'De pie, el ombligo hacia dentro al sacar el aire.'),
         ('hyper', 'Lumbares: hiperextensiones, GHD, superman y máquina', 'La cadera (o la espalda) se extiende desde doblada hasta dejar el cuerpo en línea, con la espalda recta.'),
         ('twist', 'Giros del tronco', 'El tronco gira sobre la cadera, que no se mueve: sentado en V, de pie con mancuerna o barra, y en la máquina.'),
         ('wheelRoll', 'Rueda abdominal', 'Las manos en la rueda: el cuerpo se estira rodando hacia delante y vuelve.'),
         ('chop', 'Leñador', 'De lado a la polea, las manos juntas en el asa: tira en diagonal girando el tronco.'),
         ('pallof', 'Pallof press', 'De lado a la polea: el asa va del pecho a los brazos estirados sin que el tronco gire.'),
         ('calf', 'Gemelos', 'La bola del pie en el borde del escalón (o en la plataforma): el talón baja por debajo y sube de puntillas; de pie, sentado o en el burro.'),
         ('tib', 'Tibial', 'Las puntas de los pies suben hacia las espinillas, con el talón apoyado.'),
         ('hipOpen', 'Abductores y aductores', 'Los muslos se abren (o se cierran) girando sobre la cadera: en máquina, en polea, con banda, de lado o apretando un balón.'),
         ('kick', 'Patadas de glúteo', 'La cadera se extiende llevando la pierna hacia atrás: de pie en polea o en máquina, de rodillas en máquina y a cuatro patas.'),
         ('stepUp', 'Step up', 'Un pie en el cajón: la pierna de arriba empuja hasta estirarse.'),
         ('sissy', 'Sissy squat', 'Las rodillas hacia delante y la cadera estirada, de puntillas.'),
         ('pistol', 'Pistol asistida', 'A una pierna, la otra estirada por delante, con ayuda del TRX.'),
         ('bandWalk', 'Pasos laterales con banda', 'En media sentadilla, pasos a un lado contra la minibanda.'),
         ('sideLunge', 'Zancada lateral', 'Un paso amplio a un lado, bajando sobre esa pierna.')]
LOTES[6] = dict(title='Figuras 3D · lote 6', notes=NOTES6, fams=FAMS6,
    head='''<p class="pr">StrataFit · figuras de ejercicio · lote 6 de la revisión</p>
<h1>Core, lumbares y lo que quedaba de pierna, en 3D</h1>
<p class="lede">Los <b>82 ejercicios</b> de abdominales (crunch, sit-up, elevaciones de piernas, planchas, hollow, dead bug, bird dog, giros, rueda, leñador, Pallof y vacío), lumbares (hiperextensiones, GHD, superman y máquina), gemelos y tibial, abductores y aductores, patadas de glúteo, step up, sissy, pistol, pasos laterales y zancada lateral, con la figura nueva moviéndose. Toca una figura para verla en grande con lo que hace; <b>Lado</b> la gira de perfil para comprobar la postura (tumbado de lado, la ves de frente). Como los lotes anteriores, no está en la app: se integrará cuando estén todos.</p>
<p class="lede"><b>Novedades:</b> la figura se tumba boca arriba, boca abajo y de lado apoyada de verdad en el suelo (con el grosor del dibujo, sin hundirse ni flotar), se pone de rodillas y a cuatro patas, gira el tronco sobre la cadera (giros, bicicleta, leñador) y lo dobla de lado (toques de talón), y los pies que no apoyan la planta van como deben (tumbado, en el aire, de canto). Hay GHD, bancos de hiperextensiones a 45° y horizontal, banco declinado con su gancho para las piernas, máquinas de crunch, de rotación, lumbar, de gemelo de pie, sentado y burro, de tibial, de abductores y aductores y de patada de glúteo, balón suizo, balón medicinal, abmat, rueda, cajón, deslizadores y minibanda.</p>
''',
    found='''<section class="found">
<h2>Lo que he visto al revisarlo</h2>
<ul>
<li><b>Tras tu última revisión.</b> En el <b>gemelo a una pierna</b> (también con mancuerna y en escalón), el poste queda delante y algo a un lado, a la altura del pecho, y la mano lo agarra con el codo relajado; la otra cuelga suelta junto al cuerpo (o lleva la mancuerna). Antes el poste quedaba a un lado, a la altura del hombro, con el brazo rígido en horizontal y la otra mano en la cadera. Se ve en 3/4 por el lado de la pierna que trabaja. En la <b>abducción</b> y la <b>aducción en máquina</b>, los acolchados son cojines redondos, de pie, contra la cara de fuera (o de dentro) de las rodillas, en sus palancas hasta el eje bajo la cadera (antes eran cajas que parecían clavadas en la rodilla); la abducción se ve en 3/4 de frente y algo desde arriba, y de lado, donde queda el glúteo medio. Los <b>agarres</b>: en la máquina de gemelo de pie, las asas de las hombreras van de delante a atrás; en el burro, verticales; en las de abductores, inclinadas, de través al antebrazo; y, si el antebrazo queda algo torcido respecto a lo que agarra, la muñeca se dobla de lado, como de verdad.</li>\n<li><b>En la revisión anterior.</b> En los <b>crunch con los brazos cruzados</b> (y el sit-up, en banco declinado, en balón, con peso y la extensión lumbar), los antebrazos ya no se atraviesan al subir y bajar: el izquierdo va siempre por fuera, la mano que descansa en el hombro contrario queda encima de ese brazo, y los dedos pasan por encima del hombro en vez de apuntar a la barbilla. En las <b>elevaciones de piernas</b> y el crunch inverso, los brazos van estirados a lo largo del cuerpo (antes el codo se doblaba hacia arriba, como un ala). El <b>GHD sit-up</b> está boca arriba también de piernas: rodillas algo dobladas hacia arriba, puntas de los pies hacia arriba y plantas contra la plataforma, entre los rodillos (antes los pies apuntaban al suelo). El <b>dragon flag</b> apoya la parte alta de la espalda y la nuca, con la barbilla hacia el pecho (antes quedaba sobre la cabeza, como haciendo el pino), sube hasta unos 65° y va más despacio. Los <b>mountain climbers</b> se apoyan de puntillas atrás y delante y cambian de pierna con un saltito (antes las dos rodillas bajaban al suelo a la vez); en el <b>bird dog</b>, la pierna y el brazo quedan a la altura de la cadera y del hombro y el pie apunta al suelo (antes apuntaba al techo). Las <b>hiperextensiones inversas</b> van en un acolchado alto con agarres delante (antes las puntas de los pies se metían en el suelo) y suben algo por encima de la horizontal. La <b>extensión lumbar en máquina</b> tiene el rodillo sobre los muslos en postes por fuera de las piernas (antes un poste entre ellas atravesaba el muslo), los pies en el reposapiés y menos inclinación. La <b>rueda abdominal</b> de rodillas sale hasta el cuerpo casi recto junto al suelo (antes apenas se movía), y las dos van por tiempos. En el <b>gemelo a una pierna</b> (máquina, mancuerna y en escalón), la otra pierna va relajada con el pie detrás de la pantorrilla. La <b>abducción en máquina</b> se ve de frente y, de lado, algo desde atrás, con el respaldo tapando la espalda; los acolchados de abducción y aducción siguen la cara del muslo y se pintan delante o detrás según lo que los tapa (antes se metían en el cuádriceps). La <b>patada de glúteo en máquina</b> tiene una palanca rígida que cuelga de un eje sobre la cadera, con el pie plano contra la plataforma (antes la palanca se estiraba según el pie), y la <b>extensión de cadera en máquina</b>, su columna con el eje, la plataforma y una pausa arriba. En los <b>step up</b>, los pies van enteros sobre el cajón. En la <b>sissy squat</b>, el poste se pinta delante o detrás según de verdad quede (antes la mano parecía agarrar el aire sobre el cuerpo) y la línea de rodillas a hombros es más recta. En los <b>pasos laterales con banda</b>, cada trozo de la banda se pinta según lo que lo tapa (antes desaparecía a ratos), y la <b>zancada lateral</b> va de seguido, sin pararse con las piernas abiertas.</li>\n<li><b>En revisiones anteriores.</b> El <b>crunch en polea</b> se hace a un paso de la torre (antes la cabeza acababa dentro de la columna) y la espalda se enrolla hacia el suelo, con la cuerda y el cable siempre por el lado de la polea. Todos los crunch tumbados o en banco (crunch, con peso, sit-up, declinado y en balón) van con los <b>brazos cruzados</b> sobre el pecho y los codos hacia la cintura (antes apuntaban a la cara); en el de peso, el disco queda debajo de los brazos. En la <b>bicicleta</b>, las manos detrás de la cabeza con los codos abiertos. En los <b>sit-ups</b>, las rodillas quedan más bajas (en el de CrossFit, caídas hacia fuera) y ya no chocan con los brazos. El <b>dragon flag</b> sube como un crunch inverso, con las rodillas al pecho, y baja despacio recto como una tabla. En los <b>mountain climbers</b>, la rodilla se dobla primero y sube hacia el pecho sin rozar el suelo; en el <b>bird dog</b>, el brazo y la pierna salen sin saltos (el pie y la mano giraban de golpe). En el <b>GHD sit-up</b>, los muslos apoyan en el sillín y los glúteos quedan fuera. La <b>rueda abdominal</b> de pie empieza con el tronco casi horizontal (antes se doblaba entre las piernas). <b>Gemelos</b>: a una pierna, la otra doblada hacia atrás; sentado, el acolchado, la barra y la mancuerna apoyados sobre los muslos y, a una pierna, el apoyo solo bajo el pie que trabaja (el otro pie se metía en él); los saltos botan como una pelota, con los brazos sueltos. La <b>abducción</b> se ve desde atrás, con el glúteo medio pintado, y la <b>aducción</b> por dentro de los muslos; en la máquina, los acolchados de la pierna derecha iban al revés. En el <b>Pallof</b>, la vista de lado es desde atrás. El <b>box step-over</b> y los <b>step up</b> se mueven sin tirones: el peso pasa al pie del cajón, la pierna se estira y el otro pie sube por detrás. La <b>sissy</b> y la <b>pistol asistida</b> van menos forzadas, los <b>pasos laterales con banda</b> se dan de uno en uno (antes los dos pies se movían a la vez) y la <b>zancada lateral</b> es un paso amplio con la cadera sobre el pie que se dobla y la otra pierna estirada.</li>
<li><b>Revisado a fondo.</b> Las 82 figuras pasan todas las pruebas de los lotes anteriores: manos que llegan, pies en el suelo (o donde deben), articulaciones posibles, sin saltos, choques de todo lo que se dibuja, el grosor real del dibujo contra el material y las piezas que no deben moverse. Lo que salió, ya corregido: en el crunch inverso la que subía era la espalda (ahora se enrolla la pelvis y la espalda alta sigue en el suelo); en los mountain climbers el pie de la pierna que va al pecho bajaba del suelo (ahora va de atrás a debajo de la cadera, despegado al pasar); en las hiperextensiones, la cadera se metía en el acolchado al colgar el tronco (el acolchado, bajo los muslos, con la cadera libre por encima de su borde) y la cabeza llegaba al suelo (el banco, más alto); los rodillos del GHD y del banco declinado se metían en las piernas; el cable del leñador y del Pallof cruzaba el antebrazo y la cuerda del crunch en polea, la cabeza; la minibanda se metía en los muslos (ahora rodea cada muslo siguiendo su contorno); el acolchado de la máquina de abductores no seguía al muslo, y la barra del giro de tronco no giraba con los hombros.</li>
<li><b>Manos y palmas.</b> Las manos (abiertas y cerradas) tenían el color oscuro de la piel y, al final de un antebrazo claro, se leían como un guante o un muñón: ahora cada parte (palma o dorso, cada dedo y el pulgar) lleva el tono de los músculos según le da la luz, con su contorno. Además, la silueta de cada mano se dibuja de una vez (antes, cada parte dos veces).</li>
<li><b>Músculos de la librería que no cuadraban.</b> Los <b>pasos laterales con banda</b> y la <b>zancada lateral</b> llevaban dorsal y pectoral como principales; el <b>sit-up</b> de CrossFit, el <b>GHD sit-up</b>, la <b>GHD hip extension</b> y el <b>box step-over</b>, «cuerpo completo» y «sistema cardiovascular» (la figura, entera en rojo); las <b>hiperextensiones</b>, el dorsal, el trapecio y los antebrazos del peso muerto, y al <b>bird dog</b> le faltaban lumbares y glúteo. Corregido en la rama de los músculos (desarrollo-musculos), con los de su equivalente.</li>
<li><b>Repetido.</b> <b>Elevaciones de piernas tumbado</b> era el mismo ejercicio que <b>Elevación de piernas</b>: sale de la librería, como los otros repetidos. Lo guardado con su nombre se conserva y muestra el que queda, y el buscador lo sigue encontrando.</li>
<li><b>Las que la app junta y aquí se distinguen:</b> el sit-up de CrossFit (con abmat y las plantas juntas), la patada en máquina de rodillas frente a la extensión de cadera de pie, el gemelo sentado a una pierna y el step up lateral.</li>
<li><b>Lo que es una aproximación.</b> Las retenciones (plancha, hollow, plancha lateral) solo se mueven con la respiración. El vacío abdominal no puede enseñar el ombligo hacia dentro: se ve el gesto (las manos en la cadera y el pecho que sube). Los pasos laterales y el box step-over dan un paso de ida y otro de vuelta para que la figura no se salga del encuadre. Las máquinas son genéricas, sin copiar ninguna marca.</li>
</ul>
</section>''')

NOTES7 = {
    'Clean': 'La cargada: del suelo, la barra sube pegada a las espinillas y a los muslos; al llegar a la cadera, extensión de golpe de puntillas, y el cuerpo baja bajo la barra para recibirla en los hombros en sentadilla completa, con los codos altos. Se levanta y la barra vuelve al suelo.',
    'Power clean': 'Como la cargada, pero la barra se recibe en los hombros en media sentadilla (por encima de la paralela).',
    'Hang power clean': 'La cargada desde colgando: la barra parte de los muslos, de pie; bisagra corta, extensión y recepción en media sentadilla.',
    'Hang squat clean': 'Desde colgando, con la recepción en sentadilla completa.',
    'Clean pull': 'Solo el tirón de la cargada: del suelo hasta la extensión de puntillas con los hombros encogidos y los brazos estirados, y vuelta al suelo.',
    'Snatch': 'La arrancada: agarre muy abierto; del suelo, la barra sube pegada al cuerpo y, tras la extensión, el cuerpo baja bajo ella y la recibe arriba con los brazos bloqueados en sentadilla completa.',
    'Power snatch': 'La arrancada con la recepción arriba en media sentadilla.',
    'Hang power snatch': 'La arrancada desde colgando (la barra en los muslos) con la recepción en media sentadilla.',
    'Muscle snatch': 'Sin volver a flexionar las piernas: tras la extensión, los codos suben altos y la barra gira hasta arriba con los brazos estirados.',
    'Clean & jerk': 'La cargada (del suelo a los hombros, en sentadilla) y el envión: flexión corta de piernas con el tronco vertical, empujón de puntillas y la barra arriba recibida en tijera; luego juntan los pies.',
    'Push press': 'Desde los hombros: flexión corta de piernas y empujón; los brazos terminan de subir la barra sin volver a flexionar las piernas.',
    'Push jerk': 'Como el push press, pero tras el empujón los pies se abren un poco y la barra se recibe arriba en media sentadilla.',
    'Split jerk': 'El envión en tijera: tras el empujón, un pie adelante y otro atrás; la barra, bloqueada arriba. Primero vuelve el pie de delante y luego el de atrás.',
    'Thruster': 'Sentadilla frontal con la barra en los hombros y, al subir, la barra arriba en el mismo gesto; baja otra vez a los hombros.',
    'Dumbbell snatch': 'A una mano: la mancuerna, en el suelo entre los pies; sube pegada al cuerpo por delante de las rodillas y, de un tirón, pasa por fuera de la cabeza hasta arriba con el brazo bloqueado. Baja al hombro y al suelo.',
    'Dumbbell thruster': 'Las dos mancuernas en los hombros (una cabeza apoyada en cada uno): sentadilla y, al subir, arriba con los brazos bloqueados.',
    'Dumbbell clean & jerk': 'De colgando, junto a los muslos: bisagra, salto y las mancuernas a los hombros en media sentadilla; flexión corta, empujón y arriba; vuelven a los hombros y a colgar.',
    'Kettlebell swing': 'El ruso: la cadera atrás con la kettlebell pasando entre los muslos, y el golpe de cadera que la lanza hasta la altura de los hombros con los brazos estirados.',
    'Kettlebell American swing': 'El mismo golpe de cadera, pero la kettlebell sube hasta arriba, con la bola sobre la cabeza.',
    'Swing a una mano': 'El swing con la derecha, por el medio; la otra mano, abierta, acompaña el gesto por fuera.',
    'Kettlebell clean': 'A una mano: del swing, la kettlebell sube pegada al cuerpo y se recibe en el rack (la bola, por fuera del antebrazo, el codo junto a las costillas); vuelve a caer entre las piernas.',
    'Kettlebell clean y press': 'La cargada al rack y, desde ahí, el press: arriba con el brazo bloqueado y la bola sobre el antebrazo; baja al rack y otra vez entre las piernas.',
    'Kettlebell snatch': 'A una mano, del swing hasta arriba en un solo gesto: la bola da la vuelta sobre la mano y cae sobre el antebrazo con el brazo bloqueado; al bajar, cae por delante y vuelve a pasar entre las piernas.',
    'Kettlebell goblet clean': 'La kettlebell en el suelo entre los pies, agarrada por los cuernos en cuclillas; sube pegada al cuerpo con los codos hacia fuera y se recibe delante del pecho, con los codos abajo.',
    'Kettlebell halo': 'La kettlebell boca abajo, agarrada por los cuernos, da la vuelta alrededor de la cabeza (delante de la cara, junto a una oreja, detrás de la nuca y por la otra) y luego al revés; el tronco, quieto.',
    'Kettlebell windmill': 'La kettlebell arriba en la mano derecha con el brazo vertical; los pies, girados a la izquierda; la cadera sale a la derecha y el tronco baja hacia el pie izquierdo mientras la otra mano resbala por la pierna.',
    'Turkish get-up': 'Con la kettlebell arriba todo el tiempo: de tumbado, al codo, a la mano, puente de cadera, barrido de la pierna hasta apoyar la rodilla, tronco erguido y de pie; y vuelta al suelo por el mismo camino.',
    'Farmers hold': 'De pie y quieto, una mancuerna en cada mano colgando junto a los muslos; solo se mueve con la respiración.',
    'Pinza con discos': 'De pie y quieto, en cada mano dos discos agarrados en pinza por el canto de arriba (el pulgar por un lado y los dedos por el otro).',
    'Farmers carry': 'Andando con una mancuerna en cada mano: pasos algo más cortos, el tronco recto y los brazos casi quietos. La figura anda en el sitio, como en una cinta.',
    'Farmers carry con kettlebell': 'El acarreo con una kettlebell en cada mano.',
    'Kettlebell racked carry': 'Andando con una kettlebell en cada mano en el rack: los puños bajo la barbilla, los codos junto a las costillas y las bolas por fuera de los antebrazos.',
    'Bear hug carry': 'Andando con el saco abrazado contra el pecho: los antebrazos lo rodean por delante con las manos agarradas, y el tronco va algo echado atrás.',
    'Sandbag carry al hombro': 'Andando con el saco sobre el hombro derecho, a lo largo; la mano derecha lo sujeta por delante y el otro brazo va suelto.',
    'Sandbag clean': 'El saco tumbado delante de los pies: se agarra por los extremos en cuclillas, sube por delante de las rodillas al regazo y, con un golpe de cadera, al pecho, donde se recibe abrazado; vuelve al suelo por el regazo.',
    'Sandbag over shoulder': 'Del suelo al regazo y, con el golpe de cadera, el saco sube al hombro derecho y los brazos lo empujan por encima: cae detrás. Media vuelta y otra vez.',
    'Cargada de mochila': 'La mochila de pie delante de los pies, agarrada por el asa con las dos manos: sube pegada al cuerpo con los codos arriba y por fuera y se recibe delante del pecho, con los puños bajo la barbilla; luego vuelve al suelo.',
    'Sled push': 'Empujando el trineo por sus postes, con el cuerpo inclinado y los brazos casi estirados; la figura anda en el sitio y el trineo va con ella.',
    'Sled push pesado': 'Con mucho peso: el cuerpo más bajo, casi a 45°, y pasos cortos y lentos.',
    'Sled push ligero y rápido': 'Con poco peso: más erguido, zancadas largas y rápidas.',
    'Sled drag hacia atrás': 'De cara al trineo, con el asa de una cinta en cada mano: anda hacia atrás con el cuerpo algo echado atrás y las cintas tensas.',
    'Sled pull': 'De pie, las piernas abiertas y flexionadas: tira de la cuerda mano sobre mano; la cuerda viene recta del trineo, lejos, y cae a los pies, donde se amontona.',
    'Burpees': 'De pie, abajo con las manos en el suelo, las piernas atrás de un salto, el pecho al suelo, arriba, los pies otra vez junto a las manos y un salto con las manos arriba.',
    'Burpee over bar': 'El burpee junto a una barra en el suelo y, al levantarse, un salto lateral por encima de ella con las rodillas recogidas; el siguiente, de vuelta al otro lado.',
    'Burpee box jump over': 'El burpee detrás del cajón y, al levantarse, salto arriba con los dos pies y al otro lado; media vuelta y otra vez.',
    'Burpee broad jump': 'El burpee y un salto de longitud hacia delante con los dos pies (los brazos atrás y luego adelante); media vuelta y otra vez.',
    'Devil press': 'Con una mancuerna en cada mano: el burpee con el pecho entre ellas, los pies caen por fuera de las mancuernas y, en un solo gesto, suben del suelo pegadas al cuerpo hasta arriba con los brazos bloqueados.',
    'Sprawl': 'Como un burpee sin flexión ni salto: las manos al suelo, las piernas atrás de un golpe y la cadera al suelo con el pecho arriba; de un salto, los pies junto a las manos y de pie.',
    'Wall balls': 'Sentadilla frontal con la bola al pecho; al subir, la lanza a la diana de la pared (a 3 m), la recoge arriba y baja con ella a la sentadilla siguiente.',
    'Medicine ball slam': 'De puntillas con la bola arriba, la estrella contra el suelo delante de los pies doblando la cadera; bota un poco, se agacha a cogerla y la sube otra vez por delante de la cara.',
    'Lanzamiento de balón medicinal': 'En media sentadilla con la bola al pecho: se estira de golpe y la empuja con los dos brazos contra la pared de delante; la recoge al volver.',
    'Lanzamiento rotacional de balón': 'De lado a la pared, la bola junto a la cadera derecha con el tronco girado: gira de golpe y la lanza contra la pared; la recoge y la lleva otra vez a la cadera.',
    'Box jump': 'Con los brazos atrás y la cadera doblada, salto al cajón con los dos pies, cayendo en cuclillas; de pie arriba y baja paso a paso hacia atrás.',
    'Salto lateral': 'Con los dos pies, de un lado a otro de una valla baja, cayendo con las rodillas flexionadas.',
    'Skater jump': 'De una pierna a la otra, de lado, como un patinador: cae en una pierna con la otra cruzada por detrás y los brazos al otro lado.',
    'Muscle-up': 'En anillas: colgado, el balanceo (arqueado y en hueco), el tirón con la cadera hacia las anillas, el paso por encima, el fondo y el empuje hasta el apoyo con los brazos bloqueados; las anillas, junto a la cadera. Luego se descuelga.',
    'Bar muscle-up': 'En la barra: el balanceo, el tirón con la cadera hacia la barra, el paso por encima con el tronco echado adelante (el cuerpo, siempre detrás de la barra), el fondo y el empuje hasta el apoyo; luego se descuelga hacia atrás.',
    'Rope climb': 'Con piernas: colgado con las rodillas arriba y la cuerda pisada entre los pies, se pone de pie sobre ella, sube las manos y vuelve a subir las rodillas. La cámara sube con quien trepa.',
    'Legless rope climb': 'Sin piernas: mano sobre mano, con las piernas juntas colgando. La cámara sube con quien trepa.',
    'Pino contra la pared': 'Cabeza abajo con la espalda hacia la pared y los talones apoyados en ella, las manos a la anchura de los hombros; solo se mueve con la respiración.',
    'Handstand push-up estricto': 'En el pino contra la pared: los codos se doblan hacia fuera hasta que la coronilla toca el cojín, y empuja hasta estirar los brazos, sin impulso.',
    'Handstand push-up': 'Con impulso: la cabeza baja al cojín, las rodillas bajan hacia el pecho y patean arriba mientras los brazos empujan.',
    'Pike push-ups': 'Los pies en el suelo y la cadera arriba (una V del revés): la cabeza baja entre las manos y sube.',
    'Wall walk': 'En plancha con los pies contra la pared: los pies trepan por ella mientras las manos se acercan, hasta el pino con el pecho de cara a la pared; y vuelve.',
    'Bear crawl': 'A cuatro patas con la espalda plana y las rodillas a un palmo del suelo: mano y pie contrarios avanzan a la vez. La figura avanza en el sitio.',
    'Crab walk': 'Boca arriba con la cadera levantada, las manos detrás de los hombros y los pies delante: mano y pie contrarios a la vez. La figura avanza en el sitio.',
    'Inchworm': 'De pie, se dobla con las piernas estiradas hasta las manos en el suelo; las manos andan hasta la plancha y vuelven andando hasta los pies, y de pie.',
    'Press Svend': 'De pie, dos discos apretados entre las palmas delante del pecho: se empujan al frente, sin dejar de apretarlos, y vuelven.',
    'Battle ropes': 'En media sentadilla, con el extremo de una cuerda gruesa en cada mano: olas alternas, una mano arriba y la otra abajo; las ondas corren por las cuerdas hasta el anclaje.',
    'Volteo de neumático': 'En cuclillas con los dedos bajo el borde: se levanta empujando con las piernas, el neumático gira sobre su borde de delante hasta ponerse de pie; lo empuja y cae al otro lado. Luego anda hasta él (la cámara va con quien lo voltea).',
}
FAMS7 = [('oly', 'Halterofilia', 'La barra (o las mancuernas) sube pegada al cuerpo desde el suelo o los muslos; tras la extensión de puntillas, el cuerpo baja bajo ella para recibirla en los hombros o arriba con los brazos bloqueados. Los jerks, desde los hombros con un empujón de piernas.'),
         ('kbell', 'Kettlebell', 'El golpe de cadera de los swings, la cargada al rack (la bola por fuera del antebrazo), el press y la arrancada a una mano, el goblet, el halo, el windmill y el get-up.'),
         ('carry', 'Acarreos y saco', 'Andando en el sitio (como en una cinta) o quieto con la carga en las manos, en el rack, abrazada o al hombro; y las cargadas del saco y la mochila desde el suelo.'),
         ('sled', 'Trineo', 'Empujar (pesado o rápido), arrastrar hacia atrás y tirar de la cuerda; el trineo no se mueve, la figura anda en el sitio.'),
         ('burpee', 'Burpees', 'Abajo, atrás, el pecho al suelo, arriba y el salto; con barra, cajón o salto adelante, el devil press y el sprawl.'),
         ('wallBall', 'Wall balls', 'Sentadilla y lanzamiento a la diana de la pared.'),
         ('medBall', 'Balón medicinal', 'Slam contra el suelo, lanzamiento de pecho y lanzamiento rotacional contra la pared.'),
         ('boxJump', 'Box jump', 'Salto al cajón y bajada paso a paso.'),
         ('sideJump', 'Saltos laterales', 'Con los dos pies sobre una valla baja o de una pierna a la otra.'),
         ('muscleUp', 'Muscle-ups', 'Del colgado al apoyo pasando por encima de la barra o las anillas.'),
         ('ropeClimb', 'Trepa de cuerda', 'Con el bloqueo de pies o solo con los brazos.'),
         ('handstand', 'Pino', 'Contra la pared, flexiones en pino (estrictas y con impulso), en pica y el wall walk.'),
         ('crawl', 'Gateos', 'Oso y cangrejo, avanzando en el sitio.'),
         ('inchworm', 'Inchworm', 'Las manos andan hasta la plancha y vuelven.'),
         ('svend', 'Press Svend', 'Los discos apretados entre las palmas, al frente y de vuelta.'),
         ('ropes', 'Battle ropes', 'Olas alternas con las dos cuerdas.'),
         ('tire', 'Neumático', 'El volteo de un neumático grande.')]
LOTES[7] = dict(title='Figuras 3D · lote 7', notes=NOTES7, fams=FAMS7,
    head='''<p class="pr">StrataFit · figuras de ejercicio · lote 7 de la revisión</p>
<h1>CrossFit, Hyrox y funcional, en 3D</h1>
<p class="lede">Los <b>70 ejercicios</b> de halterofilia (cargadas, arrancadas, envión, thruster, push press y jerks, con barra y con mancuernas), kettlebell, acarreos y saco, trineo, burpees, wall balls, balón medicinal, box jump y saltos laterales, muscle-ups, trepa de cuerda, pino, gateos, inchworm, press Svend, battle ropes y volteo de neumático, con la figura nueva moviéndose. Toca una figura para verla en grande con lo que hace; <b>Lado</b> la gira de perfil. Como los lotes anteriores, no está en la app: se integrará cuando estén todos.</p>
<p class="lede"><b>Novedades:</b> la figura anda en el sitio, como en una cinta (acarreos, trineo, gateos), salta y cae (burpees, box jump, saltos laterales), cuelga y pasa por encima de la barra y las anillas, se pone cabeza abajo y lanza y recoge (wall balls, balón medicinal, saco por encima del hombro). Hay pared con diana, cajón, valla, trineo con sus discos, cuerda de trepa, cuerdas de battle ropes con su anclaje, neumático, saco, mochila, discos y balón medicinal.</p>
''',
    found='''<section class="found">
<h2>Lo que he visto al revisarlo</h2>
<ul>
<li><b>Revisado a fondo.</b> Las 76 figuras pasan todas las pruebas de los lotes anteriores: manos que llegan, pies en el suelo (o donde deben), articulaciones posibles, sin saltos, choques de todo lo que se dibuja, el grosor real del dibujo contra el material, las piezas que no deben moverse y los agarres (lo que se agarra, de través en el puño). Lo que salió al hacerlas, ya corregido: la kettlebell que pasaba por los muslos en el swing (ahora entra entre las piernas por abajo, con la cadera ya atrás), la bola del rack metida en el antebrazo, el saco y las mancuernas que cruzaban rodillas y muslos al subir del suelo (ahora pasan por delante de ellas), los codos que saltaban de arriba abajo en el muscle-up en anillas, las cintas de las anillas que cruzaban el hombro en el apoyo (ahora lo rodean) y los pies del burpee lateral que rozaban la barra.</li>
<li><b>La halterofilia, repasada.</b> Tras los cambios de los agarres, la barra cruza el puño de través en todo el gesto: en el rack, los dedos van hacia atrás (antes la cruzaban a 37°), y en el tirón alto la muñeca se dobla y el puño cuelga bajo ella (antes la barra corría a lo largo del antebrazo). Al subir de los hombros a arriba la muñeca se endereza enseguida y la barra no se queda lejos de las manos, y al bajarla a los muslos los codos pasan por abajo y no rozan la barra.</li>
<li><b>Músculos de la librería que no cuadraban.</b> El oso, el cangrejo, el inchworm y el sprawl llevaban los de su grupo (core y estabilidad): ahora el cangrejo ilumina tríceps y glúteo; el sprawl, cuádriceps, glúteo y core; el oso, core y hombros, y el inchworm, core e isquios. Corregido en la rama de los músculos (desarrollo-musculos), como los del resto del lote, que ya estaban.</li>
<li><b>Tras tu revisión.</b> Los gestos van <b>seguidos</b>: antes se paraban en cada postura clave; ahora cada parte del cuerpo pasa por ellas sin frenar y solo se para donde cambia de sentido (el get-up sigue parándose en cada fase, como se hace). Todo el lote va <b>1,4 veces más despacio</b>. Lo que avanza en el sitio (acarreos, trineo, gateos, volteo de neumático) lleva el <b>suelo con marcas que corren debajo</b>: el pie o la mano que apoya se queda quieto sobre ellas (antes resbalaban hacia atrás, como andando al revés), y al andar el pie sale y llega a la velocidad del suelo. El <b>box jump</b> baja del cajón con un saltito atrás y cae al suelo (antes se quedaba a media altura). El <b>inchworm</b> anda con las manos alternas, con las piernas estiradas en la V y la cadera bajando a la plancha (antes las rodillas casi tocaban el suelo), y en las <b>pike push-ups</b> la cadera sigue arriba con las piernas estiradas mientras la cabeza baja (antes se agachaba). Los que dan media vuelta entre repeticiones (saco por encima del hombro, burpee con cajón y con salto) se ven casi de perfil, para que ninguna repetición quede de espaldas, y van más despacio, como el resto.</li>
<li><b>Repetidos juntados, como dijiste.</b> <b>Sled push 50 m</b>, <b>Sled pull 50 m</b>, <b>Farmers carry 200 m</b>, <b>Burpee broad jump 80 m</b> y <b>Wall balls 100</b> y <b>75</b> ya no están: quedan Sled push, Sled pull, Farmers carry, Burpee broad jump y Wall balls. La distancia no se pierde: esos cuatro se miden en metros y, al añadirlos, salen con la de la prueba (50, 50, 200 y 80 m); los programas de Hyrox llevan el mismo objetivo que antes, y las 100 wall balls y los tramos de cada prueba van en su explicación. Lo guardado con los nombres viejos se conserva y abre la ficha del que queda.</li>
<li><b>Las que la app junta y aquí se distinguen:</b> el empuje del trineo pesado (bajo y lento) y el ligero y rápido, el HSPU con impulso y el estricto, y la cargada de mochila (por el asa, distinta de la del saco).</li>
<li><b>Lo que es una aproximación.</b> Los acarreos, el trineo, los gateos y el volteo de neumático avanzan en el sitio (la cámara va con la figura), y la trepa de cuerda sube con ella. El saco por encima del hombro, el burpee con cajón y el de salto adelante dan media vuelta entre repetición y repetición para no salirse del encuadre. La pared de los wall balls llega hasta la diana, a 3 m, y por eso esa figura se ve algo más pequeña.</li>
</ul>
</section>''')

NOTES8 = {
    'Carrera continua': 'Carrera a ritmo cómodo y constante: el pie cae bajo la cadera y se va hacia atrás, el talón sube detrás y la rodilla se adelanta; los brazos, doblados, se balancean junto al cuerpo, al revés que las piernas, y el tronco va algo inclinado.',
    'Intervalos 400 m': 'La zancada de la carrera; las series de 400 m rápidas y la recuperación van en el objetivo del ejercicio.',
    'Series 1 km': 'La zancada de la carrera, en series de 1 km.',
    'Series 800 m': 'La zancada de la carrera, en series de 800 m.',
    'Series 200 m': 'La zancada de la carrera, en series cortas de 200 m.',
    'Tempo run': 'La zancada de la carrera, a ritmo de umbral sostenido.',
    'Carrera por tempo': 'La zancada de la carrera, en bloques a ritmo de umbral.',
    'Fartlek': 'La zancada de la carrera, con cambios de ritmo.',
    'Rodaje suave zona 2': 'La zancada de la carrera, a ritmo suave.',
    'Rodaje largo': 'La zancada de la carrera, en una tirada larga a ritmo suave.',
    'Progresivos': 'La zancada de la carrera, de menos a más.',
    'Cuestas': 'Carrera cuesta arriba, por una pendiente de 9°: el tronco más inclinado hacia la cuesta y cada pie apoyando sobre ella.',
    'Trote en cinta': 'Trote en la cinta: la banda corre bajo los pies y la figura va en el sitio, con los brazos libres de las barras.',
    'Cuestas en cinta': 'Carrera en la cinta inclinada (12 %), con el tronco más adelantado.',
    'Caminata inclinada': 'Andar en cuesta (aquí, en la cinta inclinada), con el paso de la marcha rápida y el tronco algo adelantado.',
    'Caminata rápida': 'Paso rápido en llano: siempre un pie en el suelo, el talón entra primero y los brazos acompañan.',
    'Senderismo': 'Andar con mochila: un paso algo más lento y el tronco un poco más inclinado por la carga, con las correas sobre los hombros.',
    'Carrera 1 km': 'La carrera de Hyrox entre estación y estación: la zancada de la carrera continua.',
    'Carrera 1 km ritmo Hyrox': 'La zancada de la carrera, al ritmo de la prueba.',
    'Carrera 800 m tras estación': 'La zancada de la carrera, al salir de una estación.',
    'Carrera 1 km con chaleco': 'La carrera con el chaleco lastrado, que lleva el peso por delante y por detrás del tronco.',
    'Bicicleta': 'Bici estática: las bielas giran con la bola del pie sobre el pedal (el talón algo más bajo al empujar delante y la punta más caída al subir por detrás), la rodilla algo doblada abajo y las manos en el manillar.',
    'Bicicleta zona 2': 'La bici estática, a ritmo suave.',
    'Bicicleta Tabata': 'La bici estática, en esfuerzos cortos.',
    'Intervalos HIIT en bici': 'La bici estática, en intervalos.',
    'Assault bike calorías': 'Bici de aire: las palancas van unidas a los pedales y se mueven al revés que el pie de su lado, así que los brazos empujan y tiran a la vez que se pedalea; el ventilador gira delante.',
    'Assault bike intervalos': 'La bici de aire, en intervalos.',
    'Ciclismo en carretera': 'Bici de carretera: las manos en las manetas, el tronco más tumbado y las ruedas girando en el sitio.',
    'Remo ergómetro': 'Remo: la palada empuja primero con las piernas, con los brazos estirados; luego el tronco va hacia atrás y por fin los brazos llevan el asa a la boca del estómago. A la vuelta, al revés: brazos, tronco y piernas. El asiento corre por el raíl, la cadena sale del volante y los talones se despegan en el enganche.',
    'Remo 2000 m': 'El remo, en 2000 m.',
    'Remo zona 2': 'El remo, a ritmo suave.',
    'Remo 500 m intervalos': 'El remo, en series de 500 m.',
    'Remo calorías': 'El remo, por calorías.',
    'Remo 1000 m': 'El remo de Hyrox, en 1000 m.',
    'Remo 1000 m ritmo Hyrox': 'El remo, al ritmo de la prueba.',
    'Remo 750 m': 'El remo, en 750 m.',
    'SkiErg 1000 m': 'SkiErg: los brazos bajan casi estirados por delante del cuerpo, separados de él, mientras la cadera se dobla y las rodillas se flexionan un poco, hasta que las asas pasan junto a los muslos; a la vuelta, los brazos suben delante y el cuerpo se estira. Las cuerdas salen de las poleas de arriba de la torre.',
    'SkiErg 500 m': 'El SkiErg, en 500 m.',
    'SkiErg 750 m': 'El SkiErg, en 750 m.',
    'SkiErg intervalos 4x250': 'El SkiErg, en cuatro series de 250 m.',
    'Ski erg intervalos': 'El SkiErg, en series cortas.',
    'Comba': 'Saltos sobre la parte delantera de los pies, con el vuelo justo para que pase la cuerda: la cuerda gira alrededor de la línea de las manos, que hacen círculos pequeños con las muñecas, y pasa bajo los pies en lo más alto del salto.',
    'Comba por intervalos': 'La comba, en intervalos.',
    'Double unders': 'Un salto más alto con dos vueltas de cuerda: pasa bajo los pies a media subida y a media bajada.',
    'Comba boxeo': 'Al paso del boxeador: un pie y luego el otro, con un saltito en el de apoyo cuando pasa la cuerda y el otro algo levantado detrás.',
    'Elíptica': 'Elíptica: cada pedal describe una elipse, con su brazo de la manivela de detrás al rodillo de delante; las asas van al revés que el pie de su lado y la cadera se mece un poco con el paso.',
    'Escaladora': 'Escaladora de peldaños que bajan: el pie de apoyo baja con su peldaño (el talón se despega al final) y el otro sube al de dos más arriba, sin frenazos; las manos, apenas apoyadas en las barras de los lados.',
    'Natación': 'Crol: cada brazo entra delante de la cabeza, tira por debajo del cuerpo hasta la cadera, sale junto al muslo y vuelve por encima del agua con el codo alto; el cuerpo rueda hacia el brazo que tira y las piernas baten desde la cadera con los pies en punta. El agua, translúcida, a ras de la espalda.',
    'Natación intervalos': 'El crol, en series.',
    'Saco de boxeo': 'El uno-dos al saco, dos veces: directo de izquierda y cruzado de derecha a la altura del hombro, desde la guardia con los codos abajo y los guantes junto a la cara. En el cruzado gira la cadera y se despega el talón de atrás; el saco se mece tras cada golpe.',
}
FAMS8 = [('run', 'Carrera y marcha', 'La zancada en el sitio (en la calle, en la cinta, en cuesta, con chaleco o con mochila): el pie de apoyo se va atrás y el otro vuelve por delante, con los brazos al revés que las piernas. Andando, siempre hay un pie en el suelo.'),
         ('bike', 'Bicicletas', 'Las bielas giran con el pie en el pedal: estática, de aire (con las palancas y el ventilador) y de carretera (con sus ruedas).'),
         ('rower', 'Remo', 'La palada seguida: piernas, tronco y brazos al empujar; brazos, tronco y piernas a la vuelta, con el asiento por su raíl.'),
         ('skiErg', 'SkiErg', 'Los brazos bajan por delante del cuerpo mientras la cadera se dobla, y suben a la vuelta.'),
         ('jumpRope', 'Comba', 'La cuerda gira alrededor de las manos y pasa bajo los pies en el vuelo: simple, doble y al paso del boxeador.'),
         ('elliptical', 'Elíptica', 'Los pies sobre la elipse de los pedales y las manos en las asas, al revés que los pies.'),
         ('stairs', 'Escaladora', 'Subir por los peldaños que bajan, sin pararse.'),
         ('swim', 'Natación', 'El crol, con el cuerpo rodando, las piernas batiendo y el agua a ras de la espalda.'),
         ('boxing', 'Saco de boxeo', 'Directo y cruzado al saco desde la guardia.')]
LOTES[8] = dict(title='Figuras 3D · lote 8', notes=NOTES8, fams=FAMS8,
    head='''<p class="pr">StrataFit · figuras de ejercicio · lote 8 de la revisión</p>
<h1>Cardio, en 3D</h1>
<p class="lede">Los <b>50 ejercicios</b> de carrera y marcha (en la calle, en la cinta, en cuesta, con chaleco y con mochila), bicicletas (estática, de aire y de carretera), remo, SkiErg, comba, elíptica, escaladora, natación y saco de boxeo, con la figura nueva moviéndose. Toca una figura para verla en grande con lo que hace; <b>Lado</b> la gira de perfil. Como los lotes anteriores, no está en la app: se integrará cuando estén todos.</p>
<p class="lede"><b>Novedades:</b> las máquinas de cardio, cada una con lo que se mueve: la banda de la cinta, las bielas y los pedales, las palancas y el ventilador de la bici de aire, las ruedas de la de carretera, el asiento y la cadena del remo, las cuerdas del SkiErg, la elipse de la elíptica y los peldaños de la escaladora. Además, la cuerda de la comba, el agua de la piscina y el saco con los guantes. Todos los gestos van seguidos (solo se paran donde de verdad cambian de sentido) y algo más despacio que en la realidad, para que se vean bien.</p>
''',
    found='''<section class="found">
<h2>Lo que he visto al revisarlo</h2>
<ul>
<li><b>Revisado a fondo.</b> Las 50 figuras pasan todas las pruebas: manos que llegan, pies donde deben, articulaciones posibles, sin saltos, choques de todo lo que se dibuja, el grosor real del dibujo contra el material, las piezas que no deben moverse, los agarres y los choques del cuerpo consigo mismo. Lo que salió al hacerlas, ya corregido: las bielas de la bici rozaban la espinilla (ahora van a su escala, con los pedales algo más abiertos que las caderas), las palancas de la bici de aire pasaban por los muslos, la cuerda de la comba cruzaba los brazos (ahora se abre hacia fuera al salir de las manos) y los puños rozaban los muslos, las asas del SkiErg iban torcidas en el puño, las manos rozaban los muslos al correr cuesta arriba y los brazos se cruzaban en la guardia de boxeo.</li>
<li><b>Tras tu revisión.</b> La <b>natación</b> rueda hacia el brazo que tira (iba al revés), gira la cabeza para respirar, lleva gorro claro para que la cabeza se vea sobre el agua y la cámara la mira más de frente. La <b>carrera</b> es más natural: zancada más larga, la cadera más alta en el vuelo y más baja a mitad del apoyo (iba al revés), el tobillo sin saltos al despegar, los brazos a la vez que las piernas (iban desfasados) y con más recorrido, y la cadera y los hombros girando al revés uno de otro; en la calle, en la cuesta y en la banda de la cinta, el suelo lleva marcas que corren bajo los pies. En la <b>comba</b>, la cuerda pasa siempre por encima de la cabeza, también en lo más alto de los double unders (antes la atravesaba).</li>
<li><b>Más seguidos y más despacio.</b> Como pediste para el lote 7, aquí los gestos ya van seguidos desde el principio: cada uno sigue una curva suave que solo se para en los extremos del movimiento (arriba y abajo en el SkiErg, el enganche y el final en el remo), y todos van algo más despacio que en la realidad.</li>
<li><b>Corregido en la app.</b> La cinta inclinada (hoy, la <b>Caminata inclinada</b>) corría, y su explicación es andar a 4,5-6 km/h con la cinta inclinada: ahora anda.</li>
<li><b>Músculos de la librería.</b> Los de cardio llevan el sistema cardiovascular de principal y, de secundarios, los músculos de cada gesto. Los que llevaban «cuerpo completo» (el SkiErg, el remo y la bici de aire de Hyrox y CrossFit, y la comba de CrossFit), con los suyos, y los que tenían alguno que no era (el remo de 1000 y 750 m con el tríceps, el SkiErg de intervalos con los cuádriceps), corregidos.</li>
<li><b>Repetidos.</b> La <b>Escalera de gimnasio</b> era la <b>Escaladora</b> (la misma máquina y la misma explicación): queda la Escaladora, como con la Prensa. Los de Hyrox del lote 7, juntados como dijiste, sin perder el número: los cuatro que se miden en metros (trineo, acarreo y burpee con salto) salen al añadirlos con la distancia de la prueba (50, 50, 200 y 80 m), los programas de Hyrox llevan el mismo objetivo que antes y las 100 wall balls y los tramos de cada prueba van en su explicación.</li>
<li><b>Juntados, como dijiste.</b> <b>Single unders</b> (CrossFit) era el mismo salto que la <b>Comba</b> (cardio), y la <b>Cinta inclinada</b>, la misma marcha en cuesta que la <b>Caminata inclinada</b> (que vale también para una cuesta de verdad): quedan la Comba y la Caminata inclinada, y lo guardado con el otro nombre lo sigue enseñando. Los que cambian la distancia, el ritmo o las series (Remo 1000 m, Bicicleta zona 2, Series 800 m…) los dejo: el número o el formato del nombre es el objetivo que sale al añadirlos.</li>
<li><b>Lo que es una aproximación.</b> La carrera y la marcha van en el sitio (en la cinta, la banda corre bajo los pies), las ruedas de la bici de carretera giran sin avanzar, y el agua es una superficie translúcida a ras de la espalda (lo que queda debajo se ve a través de ella).</li>
</ul>
</section>''')

NOTES9 = {
    'Remo alto en máquina': 'Sentado, con el pecho contra el apoyo: las asas empiezan arriba y por delante, con los brazos estirados a unos 45°, y bajan hacia los lados del pecho con los codos hacia abajo y atrás. Cada asa va en su palanca, que gira sobre un eje de la columna de delante.',
    'Zancada con rotación torácica': 'De pie, un paso largo al frente con la pierna izquierda hasta la zancada (el pie de atrás, de puntillas, y su rodilla cerca del suelo, sin tocarlo). El tronco baja hasta poner la mano derecha en el suelo por dentro del pie de delante, con la izquierda en la rodilla; gira hacia la izquierda y el brazo izquierdo sube estirado hacia el techo, con la mirada detrás. Vuelta atrás y de pie.',
    'Rodilla al pecho con alcance': 'De pie, la rodilla izquierda sube hasta el pecho y las dos manos la abrazan por debajo, mientras el pie derecho se pone de puntillas. Se suelta, el pie baja junto al otro y los dos brazos suben estirados por encima de la cabeza, de puntillas sobre los dos pies.',
    'Talón al glúteo con alcance': 'De pie, el talón izquierdo sube por detrás hasta el glúteo y la mano izquierda coge el empeine, con el muslo vertical y la rodilla hacia el suelo; a la vez, el brazo derecho sube hacia el techo y el pie derecho se pone de puntillas. Se suelta y vuelve a estar de pie.',
}
FAMS9 = [('row', 'Remo alto en máquina', 'Back Builder (B): el remo Hammer Strength desde arriba. Con los remos del lote 2, con su propia trayectoria.'),
         ('wgs', 'Zancada con rotación torácica', "Dynamic Warm-Up (B): la «world's greatest stretch»."),
         ('kneeHug', 'Rodilla al pecho con alcance', 'Dynamic Warm-Up (C): «knee hug and reach», con la flexión plantar.'),
         ('heelButt', 'Talón al glúteo con alcance', 'Dynamic Warm-Up (D): «heel to butt and reach», con la flexión plantar.')]
LOTES[9] = dict(title='Figuras 3D · lote 9', notes=NOTES9, fams=FAMS9,
    head='''<p class="pr">StrataFit · figuras de ejercicio · lote 9 de la revisión</p>
<h1>Los ejercicios nuevos de los entrenos a la carta, en 3D</h1>
<p class="lede">Los <b>4 ejercicios</b> que no estaban en la librería y piden las rutinas que mandaste: el <b>remo alto en máquina</b> de Back Builder y tres de movilidad de pie del <b>calentamiento dinámico</b>. Cada uno con su figura, haciendo el gesto entero, y los músculos que trabajan en rojo (principales) y naranja (secundarios).</p>
<p class="lede">Los tres de movilidad van con la pierna izquierda (en el entreno, se repiten con la otra) y en el orden de la rutina. Toca cada figura para verla de lado.</p>
''',
    found='''<section class="found">
<h2>Lo que he visto al revisarlo</h2>
<ul>
<li><b>Tras tu revisión.</b> En la primera versión de esta página solo se veía la primera figura, y quieta: la página no cargaba el archivo de las tres de movilidad y se paraba al llegar a la segunda (en la app sí estaban). Ya se ven y se mueven las cuatro. Además, los brazos que suben (al techo, en la rodilla al pecho, el talón al glúteo y la rotación de la zancada) lo hacen ahora girando desde el hombro, estirados y por delante, en vez de ir la mano en línea recta; al soltar la rodilla, los brazos empiezan a subir sin un salto; y la miniatura de cada una es su momento clave (el abrazo, el talón cogido, el brazo arriba), también con «Reducir animaciones».</li>
<li><b>Revisado a fondo.</b> Las 4 figuras pasan todas las pruebas: manos que llegan (la del suelo, en la zancada, toca el suelo), pies donde deben, articulaciones posibles, sin choques, sin material ni manos dentro de brazos o piernas y sin saltos de un fotograma a otro.</li>
<li><b>La zancada.</b> Es una zancada larga y baja: para que la mano llegue al suelo, el tronco se inclina casi en horizontal, y la rodilla de delante se abre hacia fuera para dejarle sitio, como al hacerla de verdad. La rodilla de atrás no toca el suelo.</li>
<li><b>El talón al glúteo.</b> La pierna sube y baja girando alrededor de la rodilla, con el muslo vertical; la rodilla no se dobla del todo (el talón queda a un palmo del glúteo), como pasa con el muslo y la pantorrilla de verdad.</li>
<li><b>Los músculos.</b> En los de movilidad, los que estiran y los que trabajan: en la zancada, los flexores de cadera, el glúteo y los oblicuos; en la rodilla al pecho, el glúteo y el gemelo (de puntillas); en el talón al glúteo, el cuádriceps y el gemelo. El remo alto, los de los otros remos.</li>
<li><b>Lo que es una aproximación.</b> La máquina del remo alto es la de los remos en máquina con las asas arriba; no es un modelo concreto.</li>
</ul>
</section>''')
