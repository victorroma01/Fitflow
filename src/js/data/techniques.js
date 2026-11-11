/* ═══ data/techniques ═══
   Las 10 técnicas de intensidad (F-02): código → [nombre, cómo se ejecuta (el texto de la tabla de requisitos), qué hace la
   app con ella en el entreno]. WRK es la serie normal. Al tocar la etiqueta de una serie, una ventana enseña los dos textos
   (F-11). La etiqueta que se ve la da workout/technique (setLabel): WKT en las series normales, de pirámide y en la principal
   de un drop set o un rest-pause (I-25, I-27).
   En los programas, cada ejercicio puede llevar una técnica (campo tk; workout/technique dice a qué series afecta):
   DS, RP y PAR van en la última serie; CL, MYO y PIR, en todas; SS, PRE y POST, en los dos ejercicios del bloque.
   «PIR+DS» y «PIR+PAR» son una pirámide cuya última serie acaba en drop set o en parciales.
   Sin prototipo: un código que venga de fuera («constructor», «__proto__») no encuentra nada.
   Define: TECHNIQUES, TECH_CODES
*/
export const TECHNIQUES = Object.assign(Object.create(null), {
  WRK: ['Serie normal', 'Número fijo de repeticiones con una carga dada y descanso completo entre series, para que el músculo se recupere.', ''],
  DS: ['Drop set', 'Llega al fallo o cerca, baja la carga un 20-30 % sin descansar y sigue hasta agotar las fibras.', 'tras esta serie, sin descanso, va una fila más con un 25 % menos de peso (D).'],
  RP: ['Rest-pause', 'Serie pesada hasta el fallo, 15-20 s de descanso con el mismo peso y otro bloque de repeticiones efectivas.', 'al acabarla empiezan 20 s de descanso y después va el bloque extra (+) con el mismo peso.'],
  SS: ['Superserie antagonista', 'Dos ejercicios seguidos sin descanso para músculos opuestos (pecho y espalda, bíceps y tríceps).', 'una serie de cada ejercicio con 10 s entre ellos y, al acabar la ronda, su descanso.'],
  CL: ['Cluster', 'Carga muy alta dividida en bloques de 1-3 repeticiones con micropausas de 10-20 s, para mantener la potencia y el volumen efectivo.', 'haz las repeticiones de la serie en bloques de 2-3 con 15 s de pausa y anota el total.'],
  PAR: ['Repeticiones parciales', 'Cuando ya no sale el recorrido completo, sigue con repeticiones de recorrido corto, normalmente en la posición de estiramiento.', 'anota las repeticiones completas; las parciales van de regalo al final.'],
  MYO: ['Myo-reps', 'Serie de activación de 12-15 repeticiones y después mini series de 3-5 repeticiones con 3-5 respiraciones profundas de descanso.', 'la primera fila es la de activación y las siguientes, mini series con 15 s de descanso entre ellas.'],
  PRE: ['Pre-agotamiento', 'Primero un ejercicio de aislamiento que fatiga el músculo y después, sin descanso, un multiarticular pesado.', 'el aislamiento y, a los 10 s, el multiarticular; el descanso va al acabar los dos.'],
  POST: ['Post-agotamiento', 'Primero un multiarticular pesado y enseguida un aislamiento que termina de agotar el músculo.', 'el multiarticular y, a los 10 s, el aislamiento; el descanso va al acabar los dos.'],
  PIR: ['Pirámide', 'Sube la carga y baja las repeticiones en cada serie (12, 10, 8, 6): la última serie es la más pesada.', 'cada serie trae sus repeticiones y, al escribir un peso, la siguiente sugiere un escalón más.']
});
/** Técnicas que puede llevar un ejercicio del plan (campo tk). */
export const TECH_CODES = new Set(['DS', 'RP', 'SS', 'CL', 'PAR', 'MYO', 'PRE', 'POST', 'PIR', 'PIR+DS', 'PIR+PAR']);
