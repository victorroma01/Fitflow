/* ═══ data/aliases ═══
   Otros nombres con los que también se encuentra un ejercicio de la librería al buscarlo (library/model: exSearchText), y los
   nombres de los que ya no están en ella porque eran el mismo que otro.
   Define: EX_ALIASES, EX_RETIRED
*/
/** nombre del ejercicio → otros nombres con los que se busca */
export const EX_ALIASES = {
  'Remo mancuerna': 'Remo con mancuerna',
  'Press banca mancuernas': 'Press banca con mancuernas',
  'Sentadilla búlgara': 'Zancada búlgara',
  'Pullover en polea': 'Pullover en polea alta',
  'Jalón con brazos rectos': 'Pullover en polea alta',
  'Curl con mancuernas': 'Curl con mancuerna',
  'Curl alterno mancuernas': 'Curl con mancuerna',
  'Extensión sobre la cabeza': 'Copa de tríceps',
  'Pullover mancuerna': 'Pullover con mancuerna',
  'Encogimientos con mancuernas': 'Encojimientos',
  'Curl en banco inclinado': 'Curl inclinado con mancuernas',
  'Curl con mancuernas a 45°': 'Curl inclinado con mancuernas',
  'Extensión sobre la cabeza con cuerda': 'Extensión tras nuca Tras nuca',
  'Prensa': 'Prensa 45°',
};
/** nombre de un ejercicio que ya no está en la librería (era el mismo que otro) → el que queda. Lo que se guardó con el nombre
    viejo (el historial, las notas, un plan propio) lo conserva y muestra el que queda: sus músculos, su ficha y su figura
    (library/model: exByName, liveName) */
export const EX_RETIRED = new Map([
  ['Prensa 45°', 'Prensa'],
]);
