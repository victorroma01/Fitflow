/* ═══ core/toast ═══
   Aviso breve en la parte de arriba de la pantalla. Va aparte de core/ui para que el guardado (core/persist) pueda
   avisar sin depender de la interfaz. Dura más cuanto más largo es el texto, y puede llevar «Deshacer» (al quitar algo que no
   merece una pregunta: un alimento de una comida, un ejercicio del día, un plato guardado).
   Define: undoAction, toast  · acciones/registros: 1
*/
import { $ } from './util.js';
import { A } from './registry.js';
import { html } from './html.js';
/* lo que hace «Deshacer» en el aviso que se ve, si lo lleva */
let undoAction = null;
/** Enseña el aviso `m`. Con `undo` (una función), lleva el botón «Deshacer», que la llama. */
export const toast = (m, undo) => {
  const e = $('#tt');
  undoAction = typeof undo == 'function' ? undo : null;
  e.innerHTML = html`<div class="tst">${m}${undoAction ? html`<button class="tsu" data-a="toastUndo">Deshacer</button>` : ''}</div>`;
  clearTimeout(toast.h);
  /* lo justo para leerlo: 2,6 s los cortos, hasta 6 s los largos y los que se pueden deshacer */
  toast.h = setTimeout(() => {
    e.innerHTML = '';
    undoAction = null;
  }, undoAction ? 6000 : Math.max(2600, Math.min(6000, String(m).length * 60)));
};
/* — manejadores de esta función (registros A / C / U) — */
A.toastUndo = () => {
  const f = undoAction;
  undoAction = null;
  clearTimeout(toast.h);
  $('#tt').innerHTML = '';
  if (f)
    f();
};
