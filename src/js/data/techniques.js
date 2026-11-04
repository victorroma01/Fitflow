/* ═══ data/techniques ═══
   Las 10 técnicas de intensidad (F-02): abreviatura, nombre y cómo se ejecuta cada una. La abreviatura es la etiqueta de
   la serie en el entreno (WRK en las normales); el texto es el de la tabla de requisitos.
   En los programas, cada ejercicio puede llevar una técnica (campo tk; workout/technique dice a qué series afecta):
   DS, RP y PAR van en la última serie; CL, MYO y PIR, en todas; SS, PRE y POST, en los dos ejercicios del bloque.
   «PIR+DS» y «PIR+PAR» son una pirámide cuya última serie acaba en drop set o en parciales.
   Define: TECHNIQUES, TECH_CODES
*/
export const TECHNIQUES = {
  WRK: ['Serie normal', 'Número fijo de repeticiones con una carga dada y descanso completo entre series, para que el músculo se recupere.'],
  DS: ['Drop set', 'Llega al fallo o cerca, baja la carga un 20-30 % sin descansar y sigue hasta agotar las fibras.'],
  RP: ['Rest-pause', 'Serie pesada hasta el fallo, 15-20 s de descanso con el mismo peso y otro bloque de repeticiones efectivas.'],
  SS: ['Superserie antagonista', 'Dos ejercicios seguidos sin descanso para músculos opuestos (pecho y espalda, bíceps y tríceps).'],
  CL: ['Cluster', 'Carga muy alta dividida en bloques de 1-3 repeticiones con micropausas de 10-20 s, para mantener la potencia y el volumen efectivo.'],
  PAR: ['Repeticiones parciales', 'Cuando ya no sale el recorrido completo, sigue con repeticiones de recorrido corto, normalmente en la posición de estiramiento.'],
  MYO: ['Myo-reps', 'Serie de activación de 12-15 repeticiones y después mini series de 3-5 repeticiones con 3-5 respiraciones profundas de descanso.'],
  PRE: ['Pre-agotamiento', 'Primero un ejercicio de aislamiento que fatiga el músculo y después, sin descanso, un multiarticular pesado.'],
  POST: ['Post-agotamiento', 'Primero un multiarticular pesado y enseguida un aislamiento que termina de agotar el músculo.'],
  PIR: ['Pirámide', 'Sube la carga y baja las repeticiones en cada serie (12, 10, 8, 6): la última serie es la más pesada.']
};
/** Técnicas que puede llevar un ejercicio del plan (campo tk). */
export const TECH_CODES = new Set(['DS', 'RP', 'SS', 'CL', 'PAR', 'MYO', 'PRE', 'POST', 'PIR', 'PIR+DS', 'PIR+PAR']);
