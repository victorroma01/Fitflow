/* ═══ core/i18n ═══
   El inglés. El código está escrito en español y así se queda: en inglés (LANG, en core/util), lo que se va a enseñar se
   traduce al pintarlo, con un diccionario español → inglés (i18n/en-*.js, que solo se descarga en inglés: core/lazy). En
   español nada de esto se usa y la app pinta como siempre.
   Qué se traduce y dónde:
   - El texto fijo de una plantilla html`…` (core/html): cada trozo de texto entre dos etiquetas y cada atributo que se lee
     (aria-label, placeholder, title, alt). Su clave es el trozo, con {0}, {1}… donde van los valores («Semana {0} de {1}»),
     y su traducción puede cambiarlos de sitio. Se prepara una vez por plantilla (htmlPlan).
   - Los valores que una plantilla inserta donde se lee texto: si son una frase del diccionario, se cambian por su
     traducción (tr). Así se traducen los nombres de los ejercicios, los grupos, los alimentos y cualquier texto que el código
     guarda en una tabla o pasa de una función a otra. Lo que va en un value, un data-… u otro atributo no se toca: ahí van
     las claves con las que trabaja la app, que siguen en español (los datos guardados no cambian con el idioma).
   - Un texto compuesto fuera de una plantilla (un aviso, el texto de un PDF): se escribe con say`Ronda ${r} de ${n}`, que en
     español lo junta sin más y en inglés busca «Ronda {0} de {1}».
   - tr también entiende una frase con espacios a los lados, con números («3 series» se busca como «# series») y varias
     unidas con « · ».
   Lo que escribe el usuario no se traduce (salvo que sea, letra por letra, una frase del diccionario).
   Las funciones que leen una plantilla (scanTemplate, phraseKey) no dependen de la página: las usa también tools/i18n.js
   (leyendo este mismo archivo) para sacar del código las frases que hay que traducir, con las mismas claves.
   Define: words, EN, missed, HOLE_OPEN, HOLE_CLOSE, HOLES, WORDS, SHOWN_ATTRS, RAW_TEXT, phraseKey, scanTemplate, htmlPlans, htmlPlan, NUMBERS, loose, trLoose, tr, phrasePlans, phrasePlan, say, addEnglish, startEnglish
*/
/* lo que traen los módulos del inglés (i18n/en-*.js), que se apuntan aquí al cargarse (addEnglish) */
/** @type {Map<string, string>} */
const words = new Map();
/** El diccionario español → inglés con el que se pinta, o null en español (y en inglés hasta que core/boot lo pone:
    startEnglish).
    @type {Map<string, string> | null} */
export let EN = null;
/* las frases buscadas y no encontradas, para las pruebas: solo se apuntan si la página trae dónde (window.__i18nMiss) */
const missed = typeof window != 'undefined' && window.__i18nMiss instanceof Set ? window.__i18nMiss : null;
/* un valor de la plantilla, mientras se lee: \u0001 número \u0002 */
const HOLE_OPEN = '\u0001';
const HOLE_CLOSE = '\u0002';
const HOLES = /\u0001(\d+)\u0002/g;
/* hay algo que leer: dos letras seguidas */
const WORDS = /[A-Za-zÀ-ÖØ-öø-ÿ]{2}/;
/* los atributos que se leen */
const SHOWN_ATTRS = new Set(['aria-label', 'placeholder', 'title', 'alt']);
/* las etiquetas cuyo contenido no es texto para leer: lo que el usuario escribe, código y estilos */
const RAW_TEXT = new Set(['textarea', 'script', 'style']);
/** Una frase como clave del diccionario: sin espacios a los lados (lead y trail los guardan), con un espacio donde haya varios
    y con sus valores numerados desde cero ({0}, {1}…). holes: el número que tenía cada uno en su plantilla.
    @param {string} text el texto, con sus valores como \u0001 número \u0002
    @returns {{ key: string, lead: string, trail: string, holes: number[] }} */
const phraseKey = text => {
  const lead = /^\s*/.exec(text)[0];
  const trail = lead.length == text.length ? '' : /\s*$/.exec(text)[0];
  const holes = [];
  const key = text.slice(lead.length, text.length - trail.length).replace(/\s+/g, ' ').replace(HOLES, (m, i) => '{' + (holes.push(+i) - 1) + '}');
  return { key, lead, trail, holes };
};
/** Lee una plantilla html (sus trozos fijos, como los recibe core/html) y da: s, la plantilla entera con sus valores marcados;
    segs, los trozos que se leen (el texto entre dos etiquetas y los atributos de SHOWN_ATTRS), cada uno con dónde está
    ([a, b) en s), su clave (phraseKey) y, si es un atributo, sus comillas (quote); y shown, por cada valor, si va donde se lee
    texto (y entonces se traduce) o no (un value, un data-…, una clase: se deja como está).
    @param {ArrayLike<string>} parts */
const scanTemplate = parts => {
  let s = parts[0];
  for (let i = 1; i < parts.length; i++)
    s += HOLE_OPEN + (i - 1) + HOLE_CLOSE + parts[i];
  /** @type {{ a: number, b: number, key: string, lead: string, trail: string, holes: number[], quote: string }[]} */
  const segs = [];
  const shown = new Array(parts.length - 1).fill(false);
  const add = (a, b, quote) => {
    const text = s.slice(a, b);
    for (const m of text.matchAll(HOLES))
      shown[+m[1]] = true;
    if (WORDS.test(text.replace(HOLES, '')))
      segs.push({ a, b, quote, ...phraseKey(text) });
  };
  /* los atributos de una etiqueta (su texto, que empieza en `base`): los que se leen */
  const attrs = (base, tag) => {
    for (const m of tag.matchAll(/([^\s"'<>/=\u0001\u0002]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))
      if (SHOWN_ATTRS.has(m[1].toLowerCase())) {
        const end = base + m.index + m[0].length - 1;
        add(end - (m[2] != null ? m[2] : m[3]).length, end, m[2] != null ? '"' : "'");
      }
  };
  /* hasta dónde llega una etiqueta abierta en `from`: su «>» fuera de comillas (o el final) */
  const tagEnd = from => {
    let gt = from;
    for (let q = ''; gt < s.length && (q || s[gt] != '>'); gt++)
      q = q ? s[gt] == q ? '' : q : s[gt] == '"' || s[gt] == "'" ? s[gt] : '';
    return gt;
  };
  let at = 0;
  let raw = '';
  /* una plantilla que empieza dentro de una etiqueta (solo trae atributos: html` data-n="${n}" aria-label="…"`) */
  const first = s.search(/<[a-zA-Z/!]/);
  if (/(^|\s)[\w:-]+\s*=\s*["']/.test(first < 0 ? s : s.slice(0, first))) {
    const gt = tagEnd(0);
    attrs(0, s.slice(0, gt));
    at = Math.min(gt + 1, s.length);
  }
  for (let i = at; i < s.length;) {
    const lt = s.indexOf('<', i);
    if (lt < 0)
      break;
    if (!/[a-zA-Z/!]/.test(s[lt + 1] || '')) {
      i = lt + 1;
      continue;
    }
    const gt = tagEnd(lt + 1);
    const tag = s.slice(lt, gt + 1);
    const name = (/^<\/?([a-zA-Z][\w:.-]*)/.exec(tag) || ['', ''])[1].toLowerCase();
    if (raw) {
      /* dentro de un <textarea>, un <script> o un <style> solo cuenta su cierre */
      if (tag[1] != '/' || name != raw) {
        i = lt + 1;
        continue;
      }
      raw = '';
    }
    else {
      add(at, lt, '');
      if (tag[1] != '/' && RAW_TEXT.has(name))
        raw = name;
      attrs(lt, tag);
    }
    at = i = gt + 1;
  }
  if (!raw)
    add(at, s.length, '');
  segs.sort((x, y) => x.a - y.a);
  return { s, segs, shown };
};
/* cada plantilla, ya preparada para el inglés: lits, sus trozos fijos traducidos; idx, el valor que va detrás de cada uno
   (una traducción puede cambiarlos de orden); shown, si ese valor se traduce */
const htmlPlans = new WeakMap();
/** La plantilla de trozos `parts`, preparada para pintarla en inglés (solo con el diccionario instalado).
    @param {ArrayLike<string>} parts
    @returns {{ lits: string[], idx: number[], shown: boolean[] }} */
export const htmlPlan = parts => {
  let p = htmlPlans.get(parts);
  if (p)
    return p;
  const sc = scanTemplate(parts);
  let out = '';
  let at = 0;
  for (const g of sc.segs) {
    let en = EN.get(g.key);
    if (en === undefined) {
      if (missed)
        missed.add(g.key);
      continue;
    }
    if (g.quote)
      en = en.replace(g.quote == '"' ? /"/g : /'/g, g.quote == '"' ? '&quot;' : '&#39;');
    out += sc.s.slice(at, g.a) + g.lead + en.replace(/\{(\d+)\}/g, (m, k) => HOLE_OPEN + g.holes[+k] + HOLE_CLOSE) + g.trail;
    at = g.b;
  }
  out += sc.s.slice(at);
  const idx = [...out.matchAll(HOLES)].map(m => +m[1]);
  htmlPlans.set(parts, p = { lits: out.split(/\u0001\d+\u0002/), idx, shown: idx.map(k => sc.shown[k]) });
  return p;
};
/* un número dentro de una frase: 12, 1.5, 1,5, 1:30 */
const NUMBERS = /\d+(?:[.,:]\d+)*/g;
/* lo ya buscado sin encontrar la frase tal cual: frase → lo que se enseña */
const loose = new Map();
/* una frase que no está tal cual: sin los espacios de sus lados (« entreno»), con sus números como # («3 series» → «# series»)
   o por partes, si son varias unidas con « · ». Lo que lleva etiquetas no es una frase */
const trLoose = s => {
  let out = loose.get(s);
  if (out !== undefined)
    return out;
  out = s;
  const inner = s.trim();
  if (inner !== s) {
    if (inner)
      out = s.replace(inner, () => tr(inner));
  }
  else if (!s.includes('<')) {
    if (/\d/.test(s)) {
      const nums = [];
      const hit = EN.get(s.replace(NUMBERS, m => (nums.push(m), '#')));
      if (hit !== undefined) {
        let i = 0;
        out = hit.replace(/#/g, () => nums[i++]);
      }
    }
    if (out === s && s.includes(' · '))
      out = s.split(' · ').map(tr).join(' · ');
    if (out === s && missed && WORDS.test(s))
      missed.add(s);
  }
  if (loose.size > 4000)
    loose.clear();
  loose.set(s, out);
  return out;
};
/** Una frase, en el idioma de la app: en español, la misma; en inglés, su traducción si es una frase del diccionario (tal
    cual, con sus números como # o por partes unidas con « · ») y, si no, la misma.
    @template T
    @param {T} s
    @returns {T} */
export const tr = s => {
  if (!EN || typeof s != 'string' || !s)
    return s;
  const hit = EN.get(s);
  return /** @type {any} */ (hit !== undefined ? hit : trLoose(s));
};
/* cada say`…`, ya preparado para el inglés, como htmlPlans */
const phrasePlans = new WeakMap();
const phrasePlan = parts => {
  let p = phrasePlans.get(parts);
  if (p)
    return p;
  let s = parts[0];
  for (let i = 1; i < parts.length; i++)
    s += HOLE_OPEN + (i - 1) + HOLE_CLOSE + parts[i];
  if (WORDS.test(s.replace(HOLES, ''))) {
    const g = phraseKey(s);
    const en = EN.get(g.key);
    if (en !== undefined)
      s = g.lead + en.replace(/\{(\d+)\}/g, (m, k) => HOLE_OPEN + g.holes[+k] + HOLE_CLOSE) + g.trail;
    else if (missed)
      missed.add(g.key);
  }
  phrasePlans.set(parts, p = { lits: s.split(/\u0001\d+\u0002/), idx: [...s.matchAll(HOLES)].map(m => +m[1]) });
  return p;
};
/** Un texto compuesto, en el idioma de la app: say`Ronda ${r} de ${n}`. En español es el texto tal cual; en inglés, la
    traducción de «Ronda {0} de {1}», con cada valor que sea una frase del diccionario también traducido. No vale al cargar un
    módulo (el diccionario aún no está): solo dentro de una función.
    @param {TemplateStringsArray} parts
    @param {...any} values
    @returns {string} */
export const say = (parts, ...values) => {
  if (!EN) {
    let out = parts[0];
    for (let i = 0; i < values.length; i++)
      out += values[i] + parts[i + 1];
    return out;
  }
  const p = phrasePlan(parts);
  let out = p.lits[0];
  for (let k = 0; k < p.idx.length; k++)
    out += tr(values[p.idx[k]]) + p.lits[k + 1];
  return out;
};
/** Un módulo del inglés (i18n/en-*.js) se apunta aquí al cargarse, con sus frases: español → inglés.
    @param {Record<string, string>} dict */
export const addEnglish = dict => {
  for (const k in dict)
    words.set(k, dict[k]);
};
/** Desde aquí la app pinta en inglés, con lo que han traído los módulos del inglés. Lo llama core/boot antes del primer
    pintado. */
export const startEnglish = () => {
  EN = words;
};
