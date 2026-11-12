/* ═══ core/help ═══
   Ayudas «?»: un botón pequeño junto a una función (helpDot) que, al tocarlo, explica en una frase para qué sirve. Cada
   módulo añade sus textos con HELP.clave = 'texto'; la burbuja se cierra con otro toque o al desplazar.
   Define: HELP, helpDot, tipFor, tipOff, hideTip, showTip  · acciones/registros: 1
*/
import { $ } from './util.js';
import { A } from './registry.js';
import { html } from './html.js';
/** Textos de ayuda de los «?» (helpDot): cada módulo añade los suyos, HELP.clave = 'texto'. */
export const HELP = {};
/** Botón «?» pequeño que, al tocarlo, explica en una frase para qué sirve lo que tiene al lado (HELP[clave]). */
export const helpDot = (k, label) => html`<button class="hq" data-a="helpTip" data-v="${k}" aria-label="${label}">?</button>`;
let tipFor = null;
let tipOff = null;
/** Cierra la ayuda abierta (si hay). */
const hideTip = () => {
  const t = $('#tip');
  if (t)
    t.remove();
  if (tipOff)
    tipOff();
  tipOff = null;
  tipFor = null;
};
/* burbuja junto al «?»: debajo si cabe (encima de la barra de pestañas), si no, encima; se cierra con otro toque o al desplazar */
const showTip = (b, text) => {
  hideTip();
  /* en vertical, bajo (o sobre) el botón al que acompaña el «?», para no taparlo; en horizontal, apuntando al «?» */
  const d = b.getBoundingClientRect();
  const a = (b.closest('.hqw') || b).getBoundingClientRect();
  const r = { left: d.left, width: d.width, top: a.top, bottom: a.bottom };
  const t = document.createElement('div');
  t.id = 'tip';
  t.setAttribute('role', 'status');
  t.textContent = text;
  document.body.appendChild(t);
  const w = Math.min(290, innerWidth - 24);
  t.style.width = w + 'px';
  const x = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
  const below = r.bottom + 10 + t.offsetHeight < innerHeight - 96;
  t.style.left = x + 'px';
  t.style.top = (below ? r.bottom + 10 : r.top - 10 - t.offsetHeight) + 'px';
  t.style.setProperty('--ax', Math.round(r.left + r.width / 2 - x) + 'px');
  t.className = below ? 'dn' : 'up';
  tipFor = b;
  const off = e => {
    if (!t.contains(e.target) && !b.contains(e.target))
      hideTip();
  };
  document.addEventListener('click', off, true);
  window.addEventListener('scroll', hideTip, { capture: true, once: true, passive: true });
  tipOff = () => {
    document.removeEventListener('click', off, true);
    window.removeEventListener('scroll', hideTip, { capture: true });
  };
};
A.helpTip = (i, b) => {
  if (tipFor === b) {
    hideTip();
    return;
  }
  const k = b.dataset.v;
  if (Object.prototype.hasOwnProperty.call(HELP, k))
    showTip(b, HELP[k]);
};
