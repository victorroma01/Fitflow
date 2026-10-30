/* ═══ library/filters ═══
   Filtros de equipo y grupo muscular (desplegables).
   Define: equipIn, filterOpen, equipMatch, equipDropdown, filterRefresh, filterStateOf, groupChips, groupMatch, groupDropdown, filterRow  · acciones/registros: 5
*/
import { $, X } from '../core/util.js';
import { A } from '../core/registry.js';
import { EQUIP_ORDER, groupLabel, groupOf, GROUPS } from '../data/library.js';
import { icon } from '../core/icons.js';
import { exAll } from './model.js';
import { libBody, libState } from './browse.js';
import { swapBody, swapState } from './swap.js';
import { pickBody, pickState } from './picker.js';
import { routineExRows, routineState } from '../routines/builder.js';
import { html, raw } from '../core/html.js';
export const equipIn = l => EQUIP_ORDER.filter(q => l.some(e => e.q == q));
export const filterOpen = {};
export const equipMatch = (c, e) => !c || !c.length || c.includes(e.q);
export const equipDropdown = (k, cur, items, base, sh) => {
  cur = cur || [];
  if (items.length < 2 && !cur.length)
    return '';
  const open = !!filterOpen[k];
  const cnt = n => base.filter(e => e.q == n).length;
  return html`<div class="eqd"><button class="eqb${cur.length ? ' on' : ''}" data-a="eqo" data-k="${raw(k)}" aria-haspopup="true" aria-expanded="${open}"><span>Equipo</span><b>${raw(cur.length ? X(sh && cur.length > 1 ? cur[0] + ' +' + (cur.length - 1) : cur.join(', ')) : 'Todos')}</b>${icon('chev', 16)}</button><div class="eqp"${open ? '' : ' hidden'}><div class="eqg">${items.map(x => html`<button class="eqi${cur.includes(x) ? ' on' : ''}" data-a="eqt" data-k="${raw(k)}" data-v="${x}"><i>${cur.includes(x) ? icon('chk', 14) : ''}</i><span>${x}</span><small>${raw(cnt(x))}</small></button>`)}</div><div class="eqf"><button data-a="eqc" data-k="${raw(k)}"${cur.length ? '' : ' disabled'}>Limpiar</button><button class="pr" data-a="eqo" data-k="${raw(k)}">Listo</button></div></div></div>`;
};
const filterRefresh = { lb: () => {
    const e = $('#lr');
    if (e)
      e.innerHTML = libBody();
  }, sw: () => {
    const e = $('#swb');
    if (e)
      e.innerHTML = swapBody();
  }, pk: () => {
    const e = $('#pkr');
    if (e)
      e.innerHTML = pickBody();
  }, cr: () => {
    const e = $('#cl2');
    if (e)
      e.innerHTML = routineExRows();
  } };
const filterStateOf = k => ({ lb: libState, sw: swapState, pk: pickState, cr: routineState })[k];
A.eqo = (i, b) => {
  const k = b.dataset.k;
  const d = b.closest('.eqd');
  Object.keys(filterOpen).forEach(x => {
    if (x != k)
      filterOpen[x] = 0;
  });
  document.querySelectorAll('.eqd').forEach(o => {
    if (o !== d) {
      const p = o.querySelector('.eqp');
      const t = o.querySelector('.eqb');
      if (p)
        p.hidden = true;
      if (t)
        t.setAttribute('aria-expanded', 'false');
    }
  });
  filterOpen[k] = !filterOpen[k];
  const p = d.querySelector('.eqp');
  const t = d.querySelector('.eqb');
  p.hidden = !filterOpen[k];
  t.setAttribute('aria-expanded', !!filterOpen[k]);
};
A.eqt = (i, b) => {
  const k = b.dataset.k;
  const o = filterStateOf(k);
  const v = b.dataset.v;
  o.eq = (o.eq || []).includes(v) ? o.eq.filter(x => x != v) : (o.eq || []).concat(v);
  filterRefresh[k]();
};
A.eqc = (i, b) => {
  const k = b.dataset.k;
  filterStateOf(k).eq = [];
  filterRefresh[k]();
};
document.addEventListener('click', e => {
  if (!Object.keys(filterOpen).some(k => filterOpen[k]))
    return;
  if (e.target.closest('.eqd'))
    return;
  Object.keys(filterOpen).forEach(k => filterOpen[k] = 0);
  document.querySelectorAll('.eqp').forEach(p => p.hidden = true);
  document.querySelectorAll('.eqb').forEach(t => t.setAttribute('aria-expanded', 'false'));
}, true);
export const groupChips = (cur, act) => html`<div class="chs">${['Todos'].concat(GROUPS.filter(x => exAll().some(e => groupOf(e) == x))).map(x => html`<button class="chip${(x == 'Todos' ? '' : x) == cur ? ' on' : ''}" data-a="${raw(act)}" data-v="${raw(x == 'Todos' ? '' : X(x))}">${raw(x == 'Propio' ? 'Mis ejercicios' : x)}</button>`)}</div>`;
export const groupMatch = (c, e) => !c || !c.length || c.includes(groupOf(e));
export const groupDropdown = (k, cur, list) => {
  cur = cur || [];
  const gs = GROUPS.filter(x => list.some(e => groupOf(e) == x));
  if (gs.length < 2 && !cur.length)
    return '';
  const open = !!filterOpen[k];
  const cnt = n => list.filter(e => groupOf(e) == n).length;
  return html`<div class="eqd"><button class="eqb${cur.length ? ' on' : ''}" data-a="eqo" data-k="${raw(k)}" aria-haspopup="true" aria-expanded="${open}"><span>Músculo</span><b>${raw(cur.length ? X(cur.length > 1 ? groupLabel(cur[0]) + ' +' + (cur.length - 1) : groupLabel(cur[0])) : 'Todos')}</b>${icon('chev', 16)}</button><div class="eqp"${open ? '' : ' hidden'}><div class="eqg gr">${gs.map(x => html`<button class="eqi${cur.includes(x) ? ' on' : ''}" data-a="grt" data-k="${raw(k)}" data-v="${x}"><i>${cur.includes(x) ? icon('chk', 14) : ''}</i><span>${groupLabel(x)}</span><small>${raw(cnt(x))}</small></button>`)}</div><div class="eqf"><button data-a="grc" data-k="${raw(k)}"${cur.length ? '' : ' disabled'}>Limpiar</button><button class="pr" data-a="eqo" data-k="${raw(k)}">Listo</button></div></div></div>`;
};
export const filterRow = (...l) => {
  l = l.filter(Boolean);
  return l.length ? html`<div class="eqrow">${raw(l.join(''))}</div>` : '';
};
A.grt = (i, b) => {
  const k = b.dataset.k.slice(0, -1);
  const o = filterStateOf(k);
  const v = b.dataset.v;
  o.gs = (o.gs || []).includes(v) ? o.gs.filter(x => x != v) : (o.gs || []).concat(v);
  o.eq = [];
  filterRefresh[k]();
};
A.grc = (i, b) => {
  const k = b.dataset.k.slice(0, -1);
  const o = filterStateOf(k);
  o.gs = [];
  o.eq = [];
  filterRefresh[k]();
};
