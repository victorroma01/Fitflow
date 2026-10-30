/* ═══ core/toast ═══
   Aviso breve en la parte inferior de la pantalla. Va aparte de core/ui para que el guardado (core/persist) pueda
   avisar sin depender de la interfaz.
   Define: toast
*/
import { $ } from './util.js';
import { html } from './html.js';
export const toast = m => {
  const e = $('#tt');
  e.innerHTML = html`<div class="tst">${m}</div>`;
  clearTimeout(toast.h);
  toast.h = setTimeout(() => {
    e.innerHTML = '';
  }, 2600);
};
