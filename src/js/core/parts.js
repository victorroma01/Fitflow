/* ═══ core/parts ═══
   Cómo se reparte el estado guardado en claves. Son funciones sin estado: quien lee y escribe es core/persist.
   El núcleo de S (ajustes, plan, programas, peso…) va en la clave `ff`. Las colecciones que más crecen van aparte, cada una
   en su clave: `ff:logs` (entrenos), `ff:hist` (historial por ejercicio) y las comidas, una clave por mes (`ff:meals:2026-10`).
   En el núcleo, cada colección apartada queda con el nombre de su clave ("logs": "ff:logs"), así se sabe qué hay que leer y
   el orden de las claves de S se conserva; `_parts` dice dónde están las partes (1, en localStorage; 2, en IndexedDB) y, en
   IndexedDB, `_pk`, cuáles tiene que haber.
   Define: STATE_PARTS, partKey, monthKey, mealsPart, splitState, readPart
*/
import { Store } from './store.js';
/** Colecciones de S que se guardan en su propia clave (las comidas, además, una clave por mes). */
export const STATE_PARTS = ['logs', 'hist', 'meals'];
/** Clave de una parte: partKey('logs') → 'ff:logs'; partKey('') es el prefijo común. */
export const partKey = k => Store.K.app + ':' + k;
/* mes de las comidas de un día ('otros' si la clave no es una fecha) */
const monthKey = d => /^\d{4}-\d\d-\d\d$/.test(d) ? d.slice(0, 7) : 'otros';
/** La parte con las comidas de un día, para saveState: mealsPart('2026-10-29') → 'meals:2026-10'. */
export const mealsPart = d => 'meals:' + monthKey(d);
/** El estado `s`, ya con las claves guardadas, dividido en claves de Store: { out: { clave: texto JSON }, keys: claves de
  todas las partes que tiene }. Del núcleo siempre sale el texto; de las partes, solo de las de `want` (de todas si es null).
  El núcleo lleva la marca _parts (2 si las partes van en IndexedDB, `inIdb`; 1 si en localStorage) y, en IndexedDB, la lista
  _pk. Una colección que no tiene la forma de su parte (una lista para `logs`, un objeto para el resto) se queda en el núcleo. */
export const splitState = (s, want, inIdb) => {
  const out = {};
  const keys = [];
  const core = {};
  const part = (k, v) => {
    keys.push(k);
    if (!want || want.has(k))
      out[k] = JSON.stringify(v);
  };
  for (const k in s) {
    const v = s[k];
    if (!STATE_PARTS.includes(k) || !v || typeof v != 'object' || (k == 'logs') != Array.isArray(v)) {
      core[k] = v;
      continue;
    }
    core[k] = partKey(k);
    if (k != 'meals') {
      part(partKey(k), v);
      continue;
    }
    const months = {};
    for (const d in v)
      (months[monthKey(d)] = months[monthKey(d)] || {})[d] = v[d];
    for (const m in months)
      part(partKey('meals:' + m), months[m]);
  }
  core._parts = inIdb ? 2 : 1;
  if (inIdb)
    core._pk = keys.slice().sort();
  out[Store.K.app] = JSON.stringify(core);
  return { out, keys };
};
/** Texto de una parte → su valor (lista para `logs`, objeto para el resto), o undefined si falta o está dañada. */
export const readPart = (k, raw) => {
  try {
    const v = JSON.parse(raw);
    if (v && typeof v == 'object' && (k == 'logs') == Array.isArray(v))
      return v;
  }
  catch (e) {
    /* dañada: quien llama la aparta */
  }
  return undefined;
};
