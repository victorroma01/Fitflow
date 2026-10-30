/* ═══ core/ui ═══
   Hojas inferiores (sheet, fullPage), diálogos (dialog, confirmDialog), avisos (toast), menú lateral y componentes base.
   Define: sheetBarFix, sheet, confirmDialog, dialog, sheetToTop, fullPage, pgHead, segmented, linkRow  · acciones/registros: 5
*/
import { $ } from './util.js';
import { logError } from './errors.js';
import { A } from './registry.js';
import { icon } from './icons.js';
import { html, raw } from './html.js';
function sheetBarFix() {
  try {
    const s = $('#sh');
    if (!s)
      return;
    [...s.children].forEach(c => {
      if (c.classList && c.classList.contains('sb'))
        c.remove();
    });
    s.querySelectorAll('.sp .sb').forEach(b => s.appendChild(b));
  }
  catch (e) {
    logError('barra de la hoja', e);
  }
}
export const sheet = h => {
  const s = $('#sh');
  const p = s.querySelector('.sp');
  if (h && p && s.className == 'full') {
    p.innerHTML = h;
    sheetBarFix();
    return;
  }
  s.className = '';
  s.innerHTML = h ? html`<div class="bk" data-a="cl"></div><div class="sp">${raw(h)}</div>` : '';
  sheetBarFix();
};
export const confirmDialog = (t, p, a, l) => dialog(t, p, [['Cancelar', 'zno', ''], [l, a, 'pr']]);
document.body.insertAdjacentHTML('beforeend', '<div id="mn"></div><div id="dg"></div><div id="tt"></div>');
export function dialog(t, p, b) {
  $('#dg').innerHTML = html`<div class="dgb"><div class="dgc"><h3 style="margin:0 0 6px">${raw(t)}</h3><p class="mu" style="margin:0 0 16px;font-size:14px">${raw(p)}</p><div class="g2" style="grid-template-columns:repeat(${b.length},1fr)">${b.map(x => html`<button class="${x[2]}" data-a="dga" data-v="${x[1]}">${raw(x[0])}</button>`)}</div></div></div>`;
}
A.dga = (i, b) => {
  $('#dg').innerHTML = '';
  const f = A[b.dataset.v];
  f && f(0, b);
};
A.zno = () => {
};
A.mnx = (i, b) => {
  $('#mn').innerHTML = '';
  A[b.dataset.v]();
};
/** Tareas al cerrar la hoja con «Cerrar» (p. ej. apagar la cámara del escáner): los módulos que lo necesitan se apuntan aquí. */
export const onSheetClose = [];
A.cl = () => {
  onSheetClose.forEach(f => f());
  sheet();
};
export const sheetToTop = () => {
  const p = $('#sh .sp');
  if (p)
    p.scrollTop = 0;
};
export const fullPage = h => {
  sheet(h);
  $('#sh').className = 'full';
  sheetToTop();
};
export const pgHead = (t, back) => html`<div class="row"><button data-a="${back || 'cl'}" aria-label="Volver" style="border:0;background:none;font-size:24px;padding:6px 10px">←</button></div><h1 class="pgt">${raw(t)}</h1>`;
A.menu = () => {
  $('#mn').innerHTML = html`<div class="mbk" data-a="mnc"></div><div class="msd"><div class="msb2"></div><div class="msb"></div><div class="mci"><button class="mx" data-a="mnc" aria-label="Cerrar">${icon('x', 22)}</button><div class="mti">Menú</div>${[['pg', 'prog', 'Programas'], ['cl2', 'cal', 'Calendario'], ['lg', 'log', 'Registros'], ['rw', 'reset', 'Reiniciar semana']].map((x, i) => html`<button class="mi" style="--d:${70 + i * 60}ms" data-a="mnx" data-v="${x[0]}"><span>${raw(x[2])}</span>${icon(x[1], 22)}</button>`)}</div></div>`;
};
A.mnc = () => {
  const s = $('.msd');
  if (!s) {
    $('#mn').innerHTML = '';
    return;
  }
  s.classList.add('out');
  setTimeout(() => {
    $('#mn').innerHTML = '';
  }, 240);
};
export const segmented = (a, cur, list) => html`<div class="seg${list.length == 2 ? ' s2' : ''}">${list.map(x => html`<button class="${cur == x[0] ? 'on' : ''}" data-a="${a}" data-v="${x[0]}">${raw(x[1])}</button>`)}</div>`;
export const linkRow = (ico, t, s, a, i) => html`<button class="cd f2lk" data-a="${a}"${raw(i != null ? ' data-i="' + i + '"' : '')}>${icon(ico, 30)}<span><b>${raw(t)}</b><br><small>${raw(s)}</small></span></button>`;
