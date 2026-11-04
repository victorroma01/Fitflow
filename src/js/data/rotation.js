/* ═══ data/rotation ═══
   Grupos de rotación de ejercicios (F-06): al rotar, cada ejercicio del plan pasa al siguiente de su grupo (el último, al
   primero), con sus series, repeticiones, técnica y descanso. Cada grupo reúne variantes del mismo movimiento y de los
   mismos músculos con otro ángulo, agarre o material, para variar el estímulo sin romper el programa (programs/rotation).
   Los básicos (sentadilla, press banca, peso muerto y rumano, press militar, remo con barra, dominadas e hip thrust) no
   rotan: son los que miden el progreso a largo plazo. Un ejercicio solo puede estar en un grupo.
   Define: ROTATIONS
*/
export const ROTATIONS = `Press inclinado mancuernas,Press inclinado barra,Press inclinado en máquina
Press pecho máquina convergente,Press banca mancuernas,Press pecho máquina
Cruce de poleas,Pec deck,Aperturas inclinadas
Fondos,Press declinado en máquina,Fondos en paralelas inclinado adelante
Fondos en paralelas,Press cerrado,Fondos en máquina sentado
Jalón agarre neutro,Jalón al pecho,Jalón en máquina convergente
Jalón agarre estrecho,Jalón agarre supino,Jalón unilateral
Remo mancuerna,Remo con apoyo en pecho,Remo unilateral en máquina
Remo en polea baja,Remo en máquina,Remo en polea agarre neutro
Pullover en polea,Jalón con brazos rectos,Pullover máquina
Encogimientos,Encogimientos con mancuernas,Encogimientos en máquina
Press hombro mancuernas,Press hombro máquina,Press Arnold
Elevaciones laterales,Elevaciones laterales en polea,Elevaciones laterales en máquina
Pájaros mancuernas,Pájaros en máquina,Pájaros en polea
Face pull,Pájaros en polea cruzada,Face pull a una mano
Curl con barra Z,Curl bíceps barra,Curl en polea
Curl martillo,Curl martillo en cuerda,Curl martillo cruzado
Curl predicador,Curl predicador en máquina,Curl spider
Curl en banco inclinado,Curl Bayesian,Curl en polea a una mano
Curl con mancuernas,Curl alterno mancuernas,Curl concentrado
Extensión tríceps polea,Extensión con barra V,Extensión de tríceps en máquina
Extensión con cuerda,Extensión tríceps unilateral,Kickback en polea
Press francés,Rompecráneos mancuernas,Rompecráneos en polea
Extensión sobre la cabeza,Extensión sobre la cabeza con cuerda,Extensión sobre la cabeza con barra Z
Crunch en polea,Crunch en máquina,Crunch en banco declinado
Elevación de piernas colgado,Elevación de rodillas en silla romana,Crunch inverso
Prensa,Hack squat,Sentadilla Pendulum
Sentadilla búlgara,Sentadilla búlgara en Smith,Zancada en Smith
Extensión cuádriceps,Extensión una pierna,Extensión con pausa
Curl femoral tumbado,Curl femoral sentado,Curl femoral de pie
Curl femoral,Curl femoral a una pierna,Curl femoral con balón suizo
Gemelo de pie,Gemelo en prensa,Gemelo en Smith
Gemelo sentado,Gemelo sentado unilateral,Gemelo sentado con mancuerna
Patada de glúteo en polea,Patada de glúteo en máquina,Extensión de cadera máquina
Abducción en máquina,Abducción en polea,Abducción con banda
Aducción en máquina,Aducción en polea,Aducción con balón
Hiperextensiones a 45°,Pull-through en polea,Hiperextensiones con lastre
Puente de glúteo a una pierna,Hip thrust unilateral,Puente de glúteo con banda
Zancada atrás,Zancada atrás con déficit,Step up alto
Sentadilla búlgara con énfasis en glúteo,Zancada atrás en Smith,Sentadilla búlgara con barra`.split('\n').map(l => l.split(','));
