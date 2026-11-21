# Los textos de las páginas de revisión de cada lote: título, presentación, familias, lo que hace cada figura y lo que he
# visto al revisarlo.
LOTES = {}

NOTES1 = {
    'Sentadilla': 'Barra alta, sobre los trapecios. Baja hasta que la cadera pasa por debajo de la rodilla, con las rodillas hacia las puntas de los pies; la barra no se sale de la vertical del medio del pie.',
    'Sentadilla frontal': 'La barra sobre la parte delantera de los hombros, con los codos altos y hacia delante. El tronco queda casi vertical y la barra, sobre el medio del pie.',
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
LOTES[1] = dict(title='Figuras 3D · lote 1', notes=NOTES1, fams=FAMS1, head='<p class="pr">StrataFit · figuras de ejercicio · lote 1 de la revisión</p>\n<h1>Sentadillas y presses, en 3D</h1>\n<p class="lede">Los <b>57 ejercicios</b> de las familias de sentadilla, press de banca y press de hombro, con la figura nueva moviéndose. Toca una figura para verla en grande con lo que hace; <b>Lado</b> la gira de perfil para comprobar la postura (los discos y los postes que quedan delante se aclaran para que se vea el cuerpo). Todavía no está en la app: se integrará cuando estén todos los lotes.</p>\n<p class="lede"><b>Novedades:</b> los gestos arrancan y frenan como los de una persona, sin tirones; solo descansan en la posición de reposo y abajo dan la vuelta sin pararse (salvo los de pausa). El salto tiene sus tiempos de verdad: impulso, vuelo y caída amortiguada. Las figuras se mueven con más fotogramas por segundo. La barra de la Smith va sujeta a dos carros que suben y bajan por sus guías, y las bandas, en cian, son lazos tensos que se estiran (y adelgazan) al tirar.</p>\n', found='<section class="found">\n<h2>Lo que he visto al revisarlo</h2>\n<ul>\n<li><b>Tras tu última revisión.</b> La <b>máquina de press de hombro</b> es nueva: las asas van en dos palancas rígidas que giran en un eje (antes subían en línea recta y la palanca cambiaba de largo), con su columna, la base unida al asiento, la pila con su cable y su polea, y asas de goma. El <b>landmine press</b> ya no es igual que el <b>press landmine</b>: va con las dos manos en el extremo de la barra; el press landmine sigue a una mano, con el pie contrario adelantado. Las manos abiertas (la libre en los presses a una mano, las de la sentadilla goblet y la sumo con mancuerna) tienen palma, dedos y pulgar: antes eran un muñón.</li>\n<li><b>Más rápida.</b> La página ya no prepara todas las figuras al abrirse: cada una se prepara cuando va a verse o en los ratos libres del navegador, y la página solo lleva el código de sus familias, así que abre antes, sobre todo en el móvil. Además, las búsquedas de cada postura (el equilibrio, lo que llegan los brazos) necesitan menos pruebas y dan las mismas posturas.</li>\n<li><b>Mejorado tras tu revisión.</b> Los press de banca con barra (plano, inclinado, declinado, cerrado, con pausa, con bandas y el JM) tienen su soporte: dos postes en la cabecera, por dentro de los discos, con sus ganchos y sus topes de seguridad, detrás de por donde pasa la barra. La barra Z del press cerrado es nueva (una W de verdad, como en el lote 4). La máquina de press de hombro lleva su pila de pesas y la torre de polea, su columna con tapa, carro y pila. Además, cada postura se calcula una vez y se guarda, así que cada fotograma cuesta menos de dibujar.</li>\n<li><b>Arreglado tras tu revisión.</b> En la <b>sentadilla sumo con mancuerna</b> se dejaba de ver un brazo al bajar: el antebrazo se pintaba por detrás de la cadera aunque estaba delante (ahora, el antebrazo que queda delante del cuerpo se pinta delante del tronco). El <b>press Arnold</b> va como se hace: empieza con las mancuernas a la altura de la barbilla y los codos juntos delante del pecho, y al subir los codos se abren en arco, con el antebrazo vertical, mientras las palmas giran hacia delante; el giro termina a la altura de la frente, ya subiendo (antes la mano iba en línea recta hacia el lado sin subir y el codo daba un bandazo). Las cintas del <b>TRX</b> son rojizas y más anchas que las bandas, para distinguirlas.</li>\n<li><b>Repasado con una prueba más fina.</b> Una prueba nueva mide el grosor real del dibujo (no solo el eje de cada pieza) y comprueba que las máquinas no se mueven. Ha encontrado roces pequeños, ya corregidos: las bandas del <b>press de hombro con bandas</b> y de la <b>sentadilla con bandas</b> rozaban muslos, pantorrillas y, arriba, el brazo (ahora rodean el cuerpo con más holgura y salen del lado de fuera del puño), y en la <b>sentadilla Zercher</b> la barra se hundía un poco en el antebrazo junto al codo.</li>\n<li><b>Músculos de la librería que no cuadraban.</b> <b>TRX sentadilla</b> y <b>Landmine press</b> llevaban dorsal y pectoral como principales (los compartían con su línea de la librería, junto con remos y fondos), y <b>Goblet squat</b>, <b>Sentadilla goblet con pausa</b>, <b>Sandbag squat</b> y <b>Overhead squat</b> llevaban «cuerpo entero», así que salían enteros en rojo. Ya están corregidos, en su propia rama (desarrollo-musculos), y aquí se ven bien.</li>\n<li><b>Lo que es una aproximación.</b> En la sentadilla frontal, la mano rodea la barra con la muñeca doblada hacia atrás (no se dibujan los dedos abiertos bajo la barra). La barra del landmine está algo más corta que una real para que quepa en la tarjeta, y las cintas del TRX y lo alto de la Smith y de la polea se salen del encuadre.</li>\n<li><b>Revisado a fondo.</b> Además de las comprobaciones de antes (manos que llegan, pies en el suelo, articulaciones posibles, sin saltos), cada figura pasa una prueba de choques: la barra o las mancuernas contra el cuerpo, y brazos y piernas contra el tronco o contra los del otro lado. Lo que salió (antebrazos que rozaban el tronco al final de algunos remos, la barra del Pendlay contra las rodillas, los brazos de la sentadilla sumo contra la cadera) ya está corregido.</li>\n<li><b>Material que atravesaba el cuerpo.</b> La prueba de choques ahora mira todo lo que se dibuja (barras, discos, mancuernas, cables, bandas, bancos y máquinas). Corregido: las mancuernas del press con agarre neutro y del Arnold rozaban el antebrazo (ahora el asa va siempre de través en el puño); los rodillos del banco declinado se metían en las espinillas; el disco del landmine, en el antebrazo (ahora va más abajo en el manguito); la bola de la kettlebell se hundía en el antebrazo; el cable del press en polea cruzaba el brazo (la polea, ahora detrás), y las bandas pisadas atravesaban brazos y rodillas (ahora rodean el cuerpo por fuera).</li>\n<li><b>Las variantes que la app junta y aquí se distinguen:</b> las de pausa (se paran abajo), el agarre ancho, el agarre neutro, el banco a 30°, el Arnold, el JM y el hack en la Smith.</li>\n</ul>\n</section>')

NOTES2 = {
    'Jalón al pecho': 'Sentado con los muslos bajo los rodillos: la barra baja desde arriba, con los brazos estirados, hasta lo alto del pecho; el tronco se echa un poco atrás y los codos bajan hacia los costados.',
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
    'Dominadas agarre neutro': 'En las asas paralelas, con las palmas enfrentadas.',
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
<li><b>Tras tu última revisión.</b> Los <b>jalones</b> bajan la barra por delante de la cara, sin rozarla, hasta lo alto del pecho, con el tronco algo más atrás al final; la polea queda justo encima de ese recorrido. Las <b>máquinas de jalón</b> (convergente y unilateral) y de <b>remo</b> (normal, convergente y unilateral) llevan las asas en palancas rígidas que giran en un eje, con su bastidor entero: columna, viga, ejes, base y pila con su cable (antes, en los remos, las palancas eran varillas que salían de fuera del dibujo, y el pecho se separaba del apoyo). En el jalón en polea, el apoyo de las rodillas va unido a la columna. Además, salen de la librería tres repetidos, como la prensa 45°: el <b>remo con mancuernas apoyado en banco inclinado</b> (igual que el remo con apoyo en pecho), las <b>ring rows</b> (el remo en anillas) y las <b>pull-ups estrictas</b> (las dominadas). Lo guardado con esos nombres se conserva y muestra el que se queda, y el buscador los sigue encontrando.</li>
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
    'Zancada con salto': 'Desde la zancada, un salto para cambiar de pierna en el aire y caer en la zancada contraria.',
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
<li><b>Tras tu última revisión.</b> En el <b>peso muerto sumo</b>, la barra iba muy por delante de los pies: ahora sube pegada a las espinillas, sobre el medio del pie, sin tocarlas. El <b>hip thrust en máquina</b> tiene bastidor en el suelo, de los postes de la palanca al banco (antes el banco iba suelto), y en el <b>curl femoral de pie</b>, el acolchado del muslo va en un brazo del poste de la palanca y la base une los dos postes (antes flotaba).</li>
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
    'Curl en polea': 'De pie frente a la polea baja, con una barra recta: el cable tira de la barra hacia la polea en todo el recorrido.',
    'Curl Bayesian': 'De espaldas a la polea baja y con un pie atrás: el brazo queda estirado por detrás del cuerpo y sube sin que el codo se adelante, con el bíceps estirado al empezar.',
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
    'Curl en máquina': 'La máquina de curl con atril: los brazos apoyados y las asas en la palanca, que gira en el eje de los codos.',
    'Curl en máquina unilateral': 'En la máquina, con un brazo; el otro, sobre el atril.',
    'Curl inverso': 'Con la barra Z y las palmas hacia abajo (prono): trabaja sobre todo el braquiorradial y los extensores del antebrazo.',
    'Curl inverso en polea': 'Con barra recta en la polea baja y las palmas hacia abajo.',
    'Curl inverso con mancuernas': 'Con las palmas hacia abajo; abajo, medio giradas para que las mancuernas no rocen los muslos.',
    'TRX curl': 'De cara al anclaje, con el cuerpo recto inclinado hacia atrás desde los talones y los brazos estirados hacia él: al doblar los codos, las manos van a la frente y el cuerpo sube. Las cintas miden lo mismo todo el rato: la inclinación sale de ahí.',
    'Extensión tríceps polea': 'De pie frente a la polea alta, con los codos pegados al cuerpo: solo se mueven los antebrazos, de la altura del pecho a los brazos estirados por delante de los muslos. Barra recta, agarre prono.',
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
    'Kickback en polea': 'Inclinado, con la mano izquierda en el muslo: el brazo derecho, pegado al costado y paralelo al tronco, estira el antebrazo hacia atrás contra el cable de una polea baja de delante.',
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
    'Fondos en banco': 'De espaldas a un banco, con las manos en su borde y los pies en el suelo por delante: la cadera baja por delante del banco hasta que los codos quedan en ángulo recto.',
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
<li><b>Tras tu última revisión.</b> La máquina de <b>fondos asistidos</b> es nueva: las asas, de goma, en brazos que salen de una columna; el apoyo de las rodillas, en una palanca que gira en ella; la base en el suelo y la pila con su cable (antes las asas iban sobre dos postes sueltos y el apoyo, sobre uno). Las manos abiertas (la libre, apoyada en el muslo, en la rodilla o en el banco) tienen palma, dedos y pulgar: antes eran un muñón.</li>
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
    'Flexiones con palmada': 'Baja y sube; arriba empuja fuerte: el cuerpo sube un poco, las manos se despegan, dan una palmada delante del pecho y vuelven a caer en el suelo.',
    'Flexiones en TRX': 'De pie e inclinado hacia delante, con las manos en las asas del TRX: el cuerpo, recto, baja hasta tener las manos junto al pecho.',
    'Flexiones diamante': 'Con las manos juntas bajo el pecho: los codos se quedan más cerca del cuerpo y trabaja más el tríceps.',
    'Encogimientos': 'De pie, con la barra colgando por delante de los muslos y los brazos estirados: solo suben los hombros, hacia las orejas.',
    'Encogimientos con mancuernas': 'Con las mancuernas a los lados de los muslos y las palmas hacia dentro.',
    'Encogimientos en Smith': 'Con la barra de la Smith, que sube por sus guías.',
    'Encogimientos en máquina': 'Con las asas de la máquina a los lados, en una palanca que sube con los hombros.',
    'Encogimientos en polea': 'Con dos poleas bajas, una a cada lado.',
    'Encogimientos con barra hexagonal': 'Dentro de la barra hexagonal, con las asas a los lados del cuerpo.',
    'Pull-apart con banda': 'Con los brazos estirados al frente, a la altura de los hombros, y la banda entre las manos: los brazos se abren hasta casi los lados y la banda queda tensa por delante del pecho.',
    'Pullover en polea': 'De pie frente a la polea alta, algo inclinado hacia delante, con una barra corta: los brazos, casi rectos, bajan desde arriba y por delante hasta los muslos.',
    'Pullover máquina': 'Sentado, con los codos en las almohadillas de una palanca que gira a la altura de los hombros: los brazos, doblados, bajan de por encima de la cabeza a delante del tronco.',
    'Jalón con brazos rectos con cuerda': 'Con la cuerda: al bajar, las manos se separan un poco.',
    'Aperturas en polea': 'De pie entre las dos torres, con las poleas a la altura del pecho: los brazos, con los codos algo doblados, van de abiertos a los lados a juntarse delante del pecho.',
    'Aperturas mancuernas': 'Tumbado en el banco: arriba, las mancuernas juntas sobre el pecho; los brazos, con los codos algo doblados, se abren hasta la altura del pecho y vuelven.',
    'Cruce de poleas': 'Con las poleas altas: los brazos bajan desde arriba y a los lados hasta juntar las manos delante de la cadera.',
    'Pec deck': 'Sentado en el contractor: con los codos doblados en ángulo recto y los antebrazos contra los rodillos, los brazos se cierran delante de la cara.',
    'Aperturas inclinadas': 'Como las aperturas, en el banco inclinado.',
    'Cruce de poleas bajo': 'Con las poleas abajo: las manos suben desde los lados de la cadera hasta juntarse delante de la cara.',
    'Aperturas declinadas mancuernas': 'Como las aperturas, en el banco declinado, con los pies sujetos bajo los rodillos.',
    'Cruce de poleas a una mano': 'Como el cruce de poleas, con la mano derecha; la izquierda, en la cadera.',
    'Aperturas en banco inclinado con polea': 'Como las aperturas inclinadas, con dos poleas bajas a los lados del banco.',
    'Aperturas en suelo con mancuernas': 'Tumbado en el suelo con las rodillas dobladas: los brazos se abren hasta que los codos tocan el suelo.',
    'Aperturas con bandas': 'De pie, con una banda atada detrás a cada lado: los brazos se cierran delante del pecho.',
    'Pullover mancuerna': 'Tumbado en el banco, con una mancuerna sujeta con las dos manos por un extremo: los brazos, casi estirados, van de verticales sobre el pecho a por detrás de la cabeza y vuelven.',
    'Pullover con barra Z': 'Como el pullover con mancuerna, con la barra Z.',
    'Elevaciones laterales': 'De pie, con las mancuernas colgando algo por delante: los brazos, con los codos un poco doblados, suben por los lados hasta la horizontal.',
    'Elevaciones laterales en polea': 'Con el brazo derecho y la polea baja al otro lado: el cable cruza por delante del cuerpo. La mano izquierda, en la cadera.',
    'Elevaciones laterales inclinado': 'Agarrado con la mano izquierda a un poste y con el cuerpo inclinado hacia el otro lado: el brazo derecho sube por el lado.',
    'Elevaciones laterales en máquina': 'Sentado, con los codos doblados y apoyados por fuera en los acolchados de las palancas: los brazos suben por los lados hasta la horizontal.',
    'Elevaciones laterales a una mano en polea': 'Inclinado hacia el otro lado y agarrado con la mano izquierda a la columna de la torre: el brazo derecho sube desde delante de la cadera hasta la horizontal.',
    'Elevaciones laterales sentado': 'Como las elevaciones laterales, sentado.',
    'Elevaciones laterales con banda': 'Con la banda pisada y un extremo en cada mano.',
    'Elevaciones laterales tumbado de lado': 'Tumbado de lado en el banco, sobre el costado derecho: el brazo izquierdo sube desde junto al muslo hasta la vertical. La mano derecha, junto a la cabeza.',
    'Elevaciones laterales parciales': 'Solo la mitad de abajo del recorrido.',
    'Elevaciones frontales': 'De pie, con las mancuernas de través por delante de los muslos: los brazos, casi estirados, suben por delante hasta la horizontal.',
    'Elevaciones frontales con disco': 'Con un disco sujeto con las dos manos por los lados.',
    'Elevaciones frontales con barra': 'Con una barra recta y las palmas hacia abajo.',
    'Elevaciones frontales en polea': 'De espaldas a la polea baja: el cable pasa entre las piernas hasta una barra corta.',
    'Elevaciones frontales con cuerda': 'Como en polea, con la cuerda.',
    'Elevaciones frontales alternas': 'Primero un brazo y luego el otro.',
    'Pájaros mancuernas': 'De pie, inclinado desde la cadera con la espalda recta y las rodillas dobladas: los brazos cuelgan y se abren a los lados, con los codos algo doblados.',
    'Face pull': 'De cara a la polea, a la altura de la cara, con la cuerda: de los brazos estirados hacia ella a las manos junto a las orejas, con los codos abiertos y altos.',
    'Pájaros en máquina': 'Sentado de cara a la máquina, con el pecho contra el respaldo: los brazos, al frente y a la altura de los hombros, se abren hasta los lados.',
    'Pájaros en polea': 'De pie frente a dos poleas a la altura de los hombros, con los cables cruzados (cada mano lleva el de la polea del otro lado): los brazos se abren desde delante hasta los lados.',
    'Elevación Y': 'Boca abajo en el banco inclinado: los brazos cuelgan y suben hacia delante y arriba, abiertos en Y.',
    'Pájaros en banco inclinado': 'Boca abajo en el banco inclinado: los brazos cuelgan y suben hasta los lados, en T.',
    'Face pull con banda': 'Con la banda atada a un poste a la altura de la cara.',
    'Elevación T': 'Boca abajo en el banco inclinado, con los brazos estirados y los pulgares hacia arriba: suben por los lados hasta dibujar una T.',
    'Face pull a una mano': 'Con un asa y el brazo derecho; la mano izquierda, en la cadera.',
    'Remo al mentón': 'De pie, con la barra por delante de los muslos y las manos algo más juntas que los hombros: la barra sube pegada al cuerpo hasta el pecho, con los codos hacia fuera y por encima de las manos.',
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
<li><b>Tras tu última revisión.</b> Las <b>manos abiertas</b> tienen palma, dedos y pulgar (antes eran un muñón): en las flexiones apoyan la palma con los dedos hacia delante, y en la palmada se juntan de verdad. Las máquinas de <b>press de pecho</b> (plana, convergente, inclinada y declinada) llevan las asas en palancas rígidas con su bastidor; el <b>contractor</b>, los <b>pájaros</b> y las <b>elevaciones laterales en máquina</b>, sus ejes unidos a la columna por una viga (antes flotaban), y en el contractor el rodillo gira con el antebrazo. Las torres del <b>cruce de poleas</b>, más separadas, como en uno de verdad. En el <b>pullover en polea</b> y el jalón con brazos rectos con cuerda, el tronco va más inclinado y los brazos salen de más arriba, con la torre más lejos; la <b>máquina de pullover</b> tiene su bastidor. En el <b>remo al mentón con mancuernas</b>, las mancuernas ya no se meten en los antebrazos.</li>
<li><b>Más rápida.</b> La página ya no prepara todas las figuras al abrirse: cada una se prepara cuando va a verse o en los ratos libres del navegador, y la página solo lleva el código de sus familias, así que abre antes, sobre todo en el móvil. Además, las búsquedas de cada postura (el equilibrio, lo que llegan los brazos) necesitan menos pruebas y dan las mismas posturas.</li>
<li><b>Revisado a fondo.</b> Las 72 figuras pasan todas las pruebas de los lotes anteriores: manos que llegan, pies en el suelo, articulaciones posibles, sin saltos, choques de todo lo que se dibuja, el grosor real del dibujo contra el material y las piezas que no deben moverse. Lo que salió, ya corregido: los cables del press en polea y de los pájaros en polea atravesaban brazos y antebrazos (las torres, ahora más abiertas o más lejos, y en el press inclinado el cable cuelga de debajo del puño); las cintas de las anillas rozaban los brazos (bajan por fuera); la banda del pull-apart cruzaba el tronco y los antebrazos (ahora va por delante de los puños), y la del press y las aperturas con bandas rozaba el antebrazo (sale del lado del puño que da al anclaje); en el contractor, el rodillo se metía en el antebrazo; en la máquina de pullover, la palanca atravesaba el brazo y los antebrazos se cruzaban; en la de elevaciones laterales, el acolchado se metía en el brazo (ahora apoya por fuera, junto al codo); las mancuernas de las elevaciones frontales se hundían en los muslos; en el remo al mentón, la barra rozaba los antebrazos y los puños, los muslos, y con la barra Z los discos tocaban los brazos, y en el press declinado en polea el codo daba un salto al empezar a doblarse (arriba, el brazo ya no se estira del todo).</li>
<li><b>Visto en las figuras.</b> En las flexiones arqueras, el brazo que se queda estirado se doblaba: ahora sigue estirado y el cuerpo se corre hacia la otra mano lo justo para eso.</li>
<li><b>Músculos de la librería que no cuadraban.</b> <b>TRX flexiones</b> y <b>Press con banda de pie</b> llevaban el dorsal como principal (comparten línea con remos), <b>Parallette push-ups</b>, el hombro y el tríceps (su línea es la de los pinos), y <b>Pull-apart con banda</b>, los músculos del encogimiento. Corregido en la misma rama que los de los otros lotes (desarrollo-musculos): llevan los de las flexiones, el press de pecho en polea de pie y los pájaros con banda.</li>
<li><b>Lo que es una aproximación.</b> La palmada es un empujón corto: las manos se despegan, se juntan delante del pecho y vuelven al suelo. En las arqueras, el cuerpo va siempre hacia la mano derecha (se suele alternar). En los pájaros en polea, las dos poleas quedan delante y más juntas que en un cruce de poleas, para que los cables se crucen delante del cuerpo sin tocar los brazos. Las máquinas son genéricas, sin copiar ninguna marca. Las anillas y el TRX cuelgan quietos, y lo alto de las torres, las anillas y el TRX se sale del encuadre.</li>
<li><b>Las variantes que la app junta y aquí se distinguen:</b> la máquina convergente, el press inclinado y el declinado (en máquina y en polea), cada flexión (con lastre, con pies o manos en alto, en anillas, arqueras, con palmada, diamante, en TRX y en paralelas), la barra hexagonal, el cruce bajo, el pullover con barra Z, las laterales inclinado, tumbado de lado y parciales, las frontales con disco, barra, cuerda y alternas, la elevación Y y el remo al mentón con agarre ancho.</li>
<li><b>Las que eran iguales.</b> El <b>cruce de poleas alto</b>, los <b>pájaros en polea cruzada</b>, los <b>pájaros con banda</b> y el <b>jalón con brazos rectos</b> eran el mismo ejercicio que el cruce de poleas, los pájaros en polea, el pull-apart con banda y el pullover en polea: salen de la librería, como la prensa 45°, en la rama de los músculos (desarrollo-musculos). Lo que ya se guardó con su nombre se conserva y muestra el que se queda, y el buscador los sigue encontrando. Los demás sí eran distintos y ahora se ven distintos: la <b>elevación lateral a una mano en polea</b> va inclinada, agarrada a la columna de la torre; la <b>elevación T</b> sube con los brazos estirados y los pulgares arriba; y las <b>flexiones en TRX</b> van de pie, con las manos en las asas, mientras que <b>TRX flexiones</b> van con los pies en las cunas y las manos en el suelo.</li>
</ul>
</section>''')
