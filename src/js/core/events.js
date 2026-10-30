/* ═══ core/events ═══
   Delegación global de eventos click, change e input, y teclado para lo que hace de botón sin serlo.
*/
import { A, C, U } from './registry.js';
import { W } from './state.js';
import { saveSession } from '../workout/resume.js';
document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (b && A[b.dataset.a])
    A[b.dataset.a](+b.dataset.i, b);
});
document.addEventListener('change', e => {
  const b = e.target.closest('[data-c]');
  if (b && C[b.dataset.c]) {
    C[b.dataset.c](e.target, +b.dataset.i, +b.dataset.j);
    if (W && typeof saveSession == 'function')
      saveSession();
  }
});
document.addEventListener('input', e => {
  const u = e.target.dataset.u;
  u && U[u](e.target.value);
});
/* Intro o espacio sobre algo con role="button" que no es un <button> (una fila de la lista, «Saltar»…) lo pulsa,
   como haría un botón de verdad: así se puede usar con teclado o con un lector de pantalla */
document.addEventListener('keydown', e => {
  const t = e.target;
  if ((e.key == 'Enter' || e.key == ' ') && t.getAttribute && t.getAttribute('role') == 'button' && t.tagName != 'BUTTON') {
    e.preventDefault();
    t.click();
  }
  /* Intro en un campo con data-enter (p. ej. el buscador de alimentos en internet) lanza esa acción, como su botón */
  else if (e.key == 'Enter' && t.dataset && t.dataset.enter && A[t.dataset.enter]) {
    e.preventDefault();
    A[t.dataset.enter](0, t);
  }
});
