/* ═══ cloud/merge ═══
   Fusión de los datos de dos dispositivos, sin tocar el estado: código puro, probado aparte (tests/merge.test.js).
   Cada documento remoto se parte en elementos con clave (un entreno, un día de comidas, el historial de un ejercicio, cada
   clave del núcleo…) y se fusiona a tres bandas con la huella de cada elemento en la última sincronización (la base): lo
   que cambió en un solo lado gana; si cambió en los dos, entrenos y comidas se juntan y en el resto gana el cambio más
   reciente; lo borrado en un lado y sin tocar en el otro se borra.
   Define: hashText, hashOf, hashMap, sameHashes, entryKey, unionList, unionDay, newest, mapOf, KINDS, merge3
*/
/** Huella de un texto (cyrb53, 53 bits, en base 36): para saber si un elemento cambió, sin guardar una copia de él. */
const hashText = s => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};
export const hashOf = v => hashText(JSON.stringify(v));
/** Mapa de elementos → { clave: huella } (lo que se guarda como base). */
export const hashMap = m => {
  const o = {};
  for (const [k, v] of m)
    o[k] = hashOf(v);
  return o;
};
/** ¿Mismas claves con las mismas huellas? */
export const sameHashes = (a, b) => {
  const ka = Object.keys(a || {});
  return ka.length == Object.keys(b || {}).length && ka.every(k => a[k] === b[k]);
};
/** Clave de un registro de historial ({ d, s: series }) para juntar dos listas sin repetirlo. */
const entryKey = e => (e && e.d) + '|' + hashOf(e && e.s);
/** Historial de un ejercicio cambiado en los dos lados: todos los registros, sin repetir, del más reciente al más antiguo. */
const unionList = (l, r) => {
  const seen = new Set(l.map(entryKey));
  return l.concat(r.filter(e => !seen.has(entryKey(e)))).sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
};
/** Un día de comidas cambiado en los dos lados: en cada comida, lo de los dos (un alimento que está en ambos, una vez;
  dos veces, si en uno de los lados se anotó dos veces). */
const unionDay = (l, r) => {
  const out = {};
  for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
    const a = Array.isArray(l[k]) ? l[k] : [];
    const b = Array.isArray(r[k]) ? r[k] : [];
    const count = new Map();
    for (const x of a)
      count.set(hashOf(x), (count.get(hashOf(x)) || 0) + 1);
    out[k] = a.concat(b.filter(x => {
      const h = hashOf(x);
      const n = count.get(h) || 0;
      if (n > 0) {
        count.set(h, n - 1);
        return false;
      }
      return true;
    }));
  }
  return out;
};
/** El resto, cambiado en los dos lados: gana el más reciente. */
const newest = (l, r, localNewer) => localNewer ? l : r;
const mapOf = o => new Map(o && typeof o == 'object' ? Object.entries(o) : []);
/** Cada tipo de documento: cómo se parte en elementos (split), cómo se vuelve a unir (join) y qué hacer con un elemento
  cambiado en los dos lados (both). Entrenos: cada uno por su id (core/repair se lo pone), en orden de fecha. */
export const KINDS = {
  core: { split: mapOf, join: m => Object.fromEntries(m), both: newest },
  avatar: { split: mapOf, join: m => Object.fromEntries(m), both: newest },
  logs: { split: a => new Map((Array.isArray(a) ? a : []).map(l => [l.id, l])), join: m => [...m.values()].sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : 0), both: newest },
  hist: { split: mapOf, join: m => Object.fromEntries(m), both: unionList },
  meals: { split: mapOf, join: m => Object.fromEntries(m), both: unionDay }
};
/** Fusión a tres bandas. L y R: elementos locales y remotos (Map). B: huellas de la base ({ clave: huella }) o null si este
  dispositivo nunca sincronizó este documento (entonces todo cuenta como cambiado en los dos lados). `both`: qué hacer si
  cambió en los dos; `localNewer`: si el cambio local es el más reciente. Devuelve el resultado (Map). */
export const merge3 = (L, R, B, both, localNewer) => {
  const out = new Map();
  const keys = new Set([...L.keys(), ...R.keys(), ...Object.keys(B || {})]);
  for (const k of keys) {
    const l = L.get(k);
    const r = R.get(k);
    const hl = l === undefined ? undefined : hashOf(l);
    const hr = r === undefined ? undefined : hashOf(r);
    const b = B ? B[k] : null;
    const lc = B ? hl !== b : l !== undefined;
    const rc = B ? hr !== b : r !== undefined;
    let v;
    if (!lc)
      v = r;
    else if (!rc || hl === hr)
      v = l;
    else if (l === undefined)
      v = r;
    else if (r === undefined)
      v = l;
    else
      v = both(l, r, localNewer);
    if (v !== undefined)
      out.set(k, v);
  }
  return out;
};
