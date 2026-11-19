#!/usr/bin/env node
/* StrataFit · plantillas html`…` en varias líneas (sin dependencias externas salvo typescript)
   Una pantalla es una plantilla html`…`, y una plantilla larga se escribe en varias líneas, con cada etiqueta sangrada
   según lo que contiene, como se escribe el HTML.

   La regla: dentro de una plantilla html`…`, un salto de línea, con los espacios que lo rodean, no forma parte del HTML.
   Solo ordena el código. Si hace falta un espacio, va dentro de la línea. La única excepción es dentro de una etiqueta,
   donde un salto de línea separa dos atributos, como el espacio que habría entre ellos.
   Un salto de línea se rechaza, con su archivo y su línea, donde quien lee esperaría un espacio y no lo habría: entre dos
   palabras, entre un texto y el ${…} o la etiqueta de texto (<b>, <span>…) que lleva al lado, dentro del valor de un
   atributo y detrás de un espacio.

   Aquí están las dos mitades de esa regla:
     · aplanar (flatten): deja cada plantilla en una sola línea. Lo hace build.py con la copia del código que compila, así
       que la app compilada es la misma, byte a byte, se escriba una plantilla en una línea o en veinte.
     · ordenar (layout): reparte en líneas las plantillas que no caben en WIDTH columnas. Lo hace tools/format.js después
       de reimprimir el módulo. Salta de línea solo por donde aplanar lo admite, y antes de devolver el resultado
       comprueba que, aplanado, es el mismo código que recibió.

   Cómo ordena: lee el HTML de la plantilla (etiquetas, textos y ${…}) y, si un elemento no cabe en la línea, pone cada
   hijo en la suya, sangrado; si cabe, lo deja entero. Un texto no se separa de lo que lleva pegado con un espacio, ni de
   un ${…} o de una etiqueta de texto que tenga al lado, y no se parte: un texto largo ocupa su línea y se pasa de ancho.
   Una etiqueta que no cabe sigue en la línea siguiente, entre dos atributos. Las plantillas que hay dentro de un ${…} se
   ordenan igual, sangradas respecto a la línea en la que empieza ese ${…}.

   Uso:  node tools/templates.js --flat carpeta   (aplana todos los .js de la carpeta, en el sitio: lo llama build.py)
         node tools/templates.js --stats           (cuántas plantillas hay en src/js y cuánto ocupan sus líneas) */
const fs = require('fs'), path = require('path');
function loadTS() {
  const cands = [process.env.TS_PATH, 'typescript', path.join(__dirname, '../node_modules/typescript'), '/opt/npm-tools/node_modules/typescript'].filter(Boolean);
  for (const c of cands) { try { return require(c); } catch (e) {} }
  console.error('No se encuentra el paquete "typescript"'); process.exit(2);
}
const ts = loadTS();
const WIDTH = 140;   // columnas: lo que no cabe se reparte en líneas (un texto largo no se puede partir, y se pasa)
let width = WIDTH;   // el ancho de la pasada en curso (layout admite otro: lo usan las pruebas)
const TAIL = 16;     // hasta aquí, el código que sigue a una plantilla abierta es «un cierre» y va detrás de su `

const parse = (code, name) => ts.createSourceFile(name || 'm.js', code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
const isHtml = n => ts.isTaggedTemplateExpression(n) && ts.isIdentifier(n.tag) && n.tag.text === 'html';
// los trozos de texto de una plantilla (entre ` y ${, entre } y ${… y entre } y `)
const literals = t => ts.isNoSubstitutionTemplateLiteral(t) ? [t] : [t.head, ...t.templateSpans.map(s => s.literal)];
// [inicio, fin] del texto de un trozo, sin sus delimitadores
const textRange = (l, sf) => [l.getStart(sf) + 1, l.end - (l.kind === ts.SyntaxKind.TemplateHead || l.kind === ts.SyntaxKind.TemplateMiddle ? 2 : 1)];
// las plantillas html`…` de primer nivel que hay bajo un nodo (las de dentro de otra plantilla van con ella)
const outermost = root => { const out = []; (function walk(n) { if (isHtml(n)) out.push(n); else ts.forEachChild(n, walk); })(root); return out; };

/* ── aplanar ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// etiquetas de texto: van en la línea del texto que tengan al lado
const PHRASING = new Set(['a', 'abbr', 'b', 'bdi', 'br', 'code', 'em', 'i', 'kbd', 'mark', 's', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'wbr']);
// de una etiqueta (su texto desde «<»), el nombre y si es de cierre
const tagInfo = text => { const m = /^<(\/?)([a-zA-Z][\w:.-]*)/.exec(text); return m ? { name: m[2].toLowerCase(), close: !!m[1] } : { name: '' }; };
const BREAK = /[ \t]*\r?\n[ \t\r\n]*/y;
/** Los textos de una plantilla sin sus saltos de línea. raws: el texto de cada trozo, tal como está escrito.
    fail(trozo, posición, mensaje) se llama (y debe lanzar) si un salto de línea está donde un lector esperaría un espacio. */
function flatQuasis(raws, fail) {
  let inTag = false, quote = '', tag = '', last = null;   // last: la etiqueta que acaba de terminar, mientras nada la siga
  return raws.map((raw, qi) => {
    let out = '';
    if (qi && inTag) tag += '${}';
    else last = null;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        BREAK.lastIndex = i;
        const m = BREAK.exec(raw);
        if (m) {
          const end = i + m[0].length, at = i + m[0].indexOf('\n'), err = msg => fail(qi, at, msg + ' (plantilla html`…`)');
          if (c === ' ' || c === '\t') err('espacios al final de la línea: un espacio que haga falta va dentro de la línea');
          if (out.endsWith('\\')) err('barra invertida antes de un salto de línea');
          if (inTag) {
            if (quote) err('salto de línea dentro del valor de un atributo: el valor va entero en su línea');
            out += ' ';   // entre dos atributos: el espacio que los separa
          } else {
            // lo que hay a cada lado: el borde de la plantilla, un ${…}, una etiqueta o texto
            const prev = out ? last || 'text' : qi ? 'expr' : 'edge';
            const next = end < raw.length ? (/^<[a-zA-Z\/!]/.test(raw.slice(end, end + 2)) ? tagInfo(raw.slice(end, end + 40)) : raw[end] === '<' && end + 1 === raw.length && qi < raws.length - 1 ? { name: '' } : 'text')
              : qi < raws.length - 1 ? 'expr' : 'edge';
            if (prev === 'text' && next === 'text') err('salto de línea entre dos textos: se unirían sin espacio; van en la misma línea');
            if ((prev === 'text' && next === 'expr') || (prev === 'expr' && next === 'text')) err('salto de línea entre un texto y un ${…}: se unirían sin espacio; van en la misma línea');
            if ((prev === 'text' && PHRASING.has(next.name) && !next.close) || (next === 'text' && PHRASING.has(prev.name) && prev.close))
              err('salto de línea entre un texto y la etiqueta de texto que lleva al lado: se unirían sin espacio; van en la misma línea');
          }
          i = end - 1;
          continue;
        }
      }
      out += c;
      if (inTag) {
        tag += c;
        if (quote) { if (c === quote) quote = ''; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === '>') { inTag = false; last = tagInfo(tag); }
      } else if (c === '<' && (i + 1 < raw.length ? /[a-zA-Z\/!]/.test(raw[i + 1]) : qi < raws.length - 1)) { inTag = true; tag = '<'; quote = ''; last = null; }
      else last = null;
    }
    return out;
  });
}
const failAt = (sf, name) => (pos, msg) => { throw new Error(`${name}:${sf.getLineAndCharacterOfPosition(pos).line + 1}: ${msg}`); };
/** El código con todas sus plantillas html`…` en una línea (lo que no es plantilla no se toca). */
function flatten(code, name) {
  if (!/\bhtml\s*`/.test(code)) return code;
  const sf = parse(code, name), fail = failAt(sf, name || 'código'), edits = [];
  (function walk(n) {
    if (isHtml(n)) {
      const ranges = literals(n.template).map(l => textRange(l, sf)), raws = ranges.map(r => code.slice(r[0], r[1]));
      if (raws.some(r => r.includes('\n')))
        flatQuasis(raws, (qi, off, msg) => fail(ranges[qi][0] + off, msg)).forEach((f, i) => { if (f !== raws[i]) edits.push([ranges[i][0], ranges[i][1], f]); });
    }
    ts.forEachChild(n, walk);
  })(sf);
  edits.sort((a, b) => b[0] - a[0]).forEach(([a, b, f]) => { code = code.slice(0, a) + f + code.slice(b); });
  return code;
}

/* ── leer una plantilla: su HTML ─────────────────────────────────────────────────────────────────────────────────────
   Una plantilla es una lista de nodos:  { k: 'text', s }                      texto
                                         { k: 'expr', pieces }                 un ${…}: su código, con sus plantillas aparte
                                         { k: 'leaf', tag }                    etiqueta sin contenido (<input>, <br>, <path/>…)
                                         { k: 'el', name, open, children, close }
   Una etiqueta es { name, kind: 'open' | 'close' | 'void', parts, segs }: parts son sus textos y ${…} (los de sus
   atributos) y segs, lo mismo repartido por los espacios que separan dos atributos, que es por donde se puede partir.
   Cada nodo lleva flat: su texto en una línea, o null si dentro hay código de varias líneas (y entonces se abre siempre). */
const join = list => list.some(x => x == null) ? null : list.join('');
const flatOf = parts => join(parts.map(p => typeof p === 'string' ? p : p.flat));
// los trozos de una etiqueta entre los espacios que separan dos atributos (fuera de las comillas de un valor)
function segments(parts) {
  const segs = [[]];
  let quote = '', before = '';
  parts.forEach((p, pi) => {
    if (typeof p !== 'string') { segs[segs.length - 1].push(p); before = '}'; return; }
    let cur = '';
    for (let i = 0; i < p.length; i++) {
      const c = p[i], prev = i ? p[i - 1] : before, next = i + 1 < p.length ? p[i + 1] : pi + 1 < parts.length ? '$' : '';
      if (quote) { if (c === quote) quote = ''; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === ' ' && prev && !/\s/.test(prev) && next && !/[\s>]/.test(next) && !(next === '/' && p[i + 2] === '>')) {
        if (cur) segs[segs.length - 1].push(cur);
        cur = '';
        segs.push([]);
        continue;
      }
      cur += c;
    }
    if (cur) segs[segs.length - 1].push(cur);
    before = p[p.length - 1];
  });
  return segs.map(parts => ({ parts, flat: flatOf(parts) }));
}
function tokens(flats, exprs) {
  const items = [];
  let text = '', tag = null, quote = '';
  const flush = () => { if (text) { items.push({ k: 'text', s: text, flat: text }); text = ''; } };
  const endTag = whole => {
    if (tag.cur) tag.parts.push(tag.cur);
    const first = typeof tag.parts[0] === 'string' ? tag.parts[0] : '', last = tag.parts[tag.parts.length - 1];
    const m = whole && /^<(\/?)([a-zA-Z][\w:.-]*)/.exec(first), name = m ? m[2].toLowerCase() : '';
    const kind = !m ? 'void' : m[1] ? 'close' : (typeof last === 'string' && last.endsWith('/>')) || VOID.has(name) ? 'void' : 'open';
    // half: una etiqueta que la plantilla deja a medias (la termina otro trozo de código); va pegada a lo que tenga al lado
    items.push({ k: 'tag', name, kind, parts: tag.parts, flat: flatOf(tag.parts), segs: m && !m[1] ? segments(tag.parts) : null, half: !whole });
    tag = null;
  };
  flats.forEach((q, qi) => {
    for (let i = 0; i < q.length; i++) {
      const c = q[i];
      if (tag) {
        tag.cur += c;
        if (quote) { if (c === quote) quote = ''; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === '>') endTag(true);
      } else if (c === '<' && (i + 1 < q.length ? /[a-zA-Z\/!]/.test(q[i + 1]) : qi < flats.length - 1)) { flush(); tag = { parts: [], cur: '<' }; quote = ''; }
      else text += c;
    }
    if (qi < exprs.length) {
      if (tag) { if (tag.cur) tag.parts.push(tag.cur); tag.parts.push(exprs[qi]); tag.cur = ''; }
      else { flush(); items.push(exprs[qi]); }
    }
  });
  if (tag) endTag(false);
  flush();
  return items;
}
function tree(items) {
  const root = { children: [] }, stack = [root];
  for (const it of items) {
    const top = stack[stack.length - 1];
    if (it.k !== 'tag') top.children.push(it);
    else if (it.kind === 'open') { const el = { k: 'el', name: it.name, open: it, children: [], close: null }; top.children.push(el); stack.push(el); }
    else if (it.kind === 'close') {
      let j = stack.length - 1;
      while (j > 0 && stack[j].name !== it.name) j--;
      if (j > 0) { stack[j].close = it; stack.length = j; }               // cierra también lo que quedara abierto dentro
      else top.children.push({ k: 'leaf', tag: it, flat: it.flat });     // un cierre cuya apertura está en otra plantilla
    } else top.children.push({ k: 'leaf', tag: it, flat: it.flat });
  }
  return root.children;
}
/* ¿van en la misma línea dos nodos seguidos? Sí, si uno es un texto y lleva un espacio en ese lado, o si lo que tiene al
   lado es un ${…} o una etiqueta de texto (<b>, <span>…; tras un <br> sí se puede saltar): justo donde aplanar rechaza un
   salto de línea. Entre dos cosas que no son texto se puede saltar siempre. */
const phrasing = n => (n.k === 'el' && PHRASING.has(n.name)) || (n.k === 'leaf' && PHRASING.has(n.tag.name));
const lineEnd = n => n.k === 'leaf' && (n.tag.name === 'br' || n.tag.name === 'wbr');
function glued(a, b) {
  if (lineEnd(b)) return true;   // un <br> cierra la línea de lo que tiene delante
  if (a.k !== 'text' && b.k !== 'text') return (a.k === 'leaf' && a.tag.half) || (b.k === 'leaf' && b.tag.half);
  if (a.k === 'text' && b.k === 'text') return true;
  if (a.k === 'text') return /\s$/.test(a.s) || b.k === 'expr' || phrasing(b) || (b.k === 'leaf' && b.tag.half);
  return /^\s/.test(b.s) || a.k === 'expr' || (phrasing(a) && !lineEnd(a)) || (a.k === 'leaf' && a.tag.half);
}
function measure(n) {
  if (n.k !== 'el') return n;
  n.children.forEach(measure);
  n.flat = join([n.open.flat, ...n.children.map(c => c.flat), n.close ? n.close.flat : '']);
  return n;
}
function buildCode(sf, from, to, root, fail) {
  const pieces = [];
  let p = from;
  for (const n of outermost(root)) { pieces.push(sf.text.slice(p, n.getStart(sf)), buildTpl(n, sf, fail)); p = n.end; }
  pieces.push(sf.text.slice(p, to));
  const code = join(pieces.map(x => typeof x === 'string' ? (x.includes('\n') ? null : x) : x.flat == null ? null : x.open + x.flat + '`'));
  // opaque: código de varias líneas con algo que no es código dentro (otra plantilla, un comentario): no se puede volver a sangrar
  return { k: 'expr', pieces, flat: code == null ? null : '${' + code + '}', opaque: pieces.some(x => typeof x === 'string' ? x.includes('\n') && /`|\/\*|\\\n/.test(x) : x.opaque) };
}
function buildTpl(node, sf, fail) {
  const lits = literals(node.template), ranges = lits.map(l => textRange(l, sf));
  const flats = flatQuasis(ranges.map(r => sf.text.slice(r[0], r[1])), (qi, off, msg) => fail(ranges[qi][0] + off, msg));
  const exprs = lits.slice(0, -1).map((l, i) => buildCode(sf, l.end, lits[i + 1].getStart(sf), node.template.templateSpans[i].expression, fail));
  const nodes = tree(tokens(flats, exprs)).map(measure);
  return { open: sf.text.slice(node.getStart(sf), ranges[0][0]), nodes, flat: join(nodes.map(n => n.flat)), opaque: exprs.some(e => e.opaque) };
}

/* ── ordenar ─────────────────────────────────────────────────────────────────────────────────────────────────────────
   Lo que cabe en la línea se queda entero. Lo que no, se abre: su contenido pasa a las líneas siguientes, sangrado. Un
   texto largo no se puede partir (un salto de línea no es un espacio): ocupa su línea entera y se pasa de ancho. */
class Out {
  constructor(indent) { this.lines = []; this.cur = ' '.repeat(indent || 0); }
  add(s) { this.cur += s; }
  nl(indent) { this.lines.push(this.cur); this.cur = ' '.repeat(indent); }
  get col() { return this.cur.length; }
  get indent() { return /^ */.exec(this.cur)[0].length; }
  text() { return this.lines.concat(this.cur).join('\n'); }
}
// una lista de nodos ordenada aparte, en sus propias líneas (para ver cuánto ocupa antes de decidir), y cómo añadirla
const block = (nodes, indent, st) => { const o = new Out(indent); printNodes(nodes, indent, o, st); return o; };
const append = (out, o) => { out.lines.push(out.cur, ...o.lines); out.cur = o.cur; };
// ¿se puede saltar de línea entre una etiqueta (o el borde de la plantilla) y su primer o su último hijo?
const edgeBreak = (n, end) => n.k !== 'text' || !(end ? /\s$/ : /^\s/).test(n.s);
/* Código con plantillas dentro: el de una línea del módulo o el de un ${…}. I es la sangría de la línea en la que empieza;
   las plantillas que no caben se abren sangradas respecto a ella. Si el código trae saltos de línea (un bloque { … } dentro
   de un ${…}), cada línea conserva su sangría respecto a la anterior: st.o es la que tenía la línea en curso. */
function printCode(pieces, out, st, I) {
  pieces.forEach((p, k) => {
    if (typeof p !== 'string') {
      // lo que sigue a la plantilla en su línea: si es algo más que un cierre («: otra cosa», otra plantilla), se tiene que ver
      const next = pieces[k + 1], tail = next.split('\n')[0];
      return printTpl(p, out, st, I, tail.length, tail.trim().length > TAIL || (!next.includes('\n') && k + 2 < pieces.length));
    }
    const lines = p.split('\n');
    out.add(lines[0]);
    for (const l of lines.slice(1)) {
      const o = /^[ \t]*/.exec(l)[0].length;
      if (!l.trim()) { out.nl(0); continue; }
      I = Math.max(0, I + o - st.o);
      st.o = o;
      out.nl(I);
      out.add(l.slice(o));
    }
  });
}
/* Una plantilla. tail: lo que ocupa el código que la sigue en su línea; more: si ese código es algo más que un cierre.
   Abierta, su ` de cierre va detrás de la última línea; con more, en una línea propia, para que lo que sigue no quede
   escondido al final de la última. */
function printTpl(t, out, st, I, tail, more) {
  if (t.flat != null && out.col + t.open.length + t.flat.length + 1 + tail <= width) return out.add(t.open + t.flat + '`');
  out.add(t.open);
  if (t.nodes.length && !edgeBreak(t.nodes[0], 0)) printNodes(t.nodes, I + 2, out, st);   // empieza por un espacio: sigue en la línea
  else if (t.nodes.length) {
    const o = block(t.nodes, I + 2, st);
    // una sola línea de contenido: se abre si la plantilla es lo principal de su línea; una corta en medio de mucho código, no
    if (!o.lines.length && t.flat != null && t.flat.length < out.col - out.indent) out.add(t.flat);
    else {
      append(out, o);
      if (more && edgeBreak(t.nodes[t.nodes.length - 1], 1)) out.nl(I);
    }
  }
  out.add('`');
}
function printNodes(nodes, indent, out, st) {
  nodes.forEach((n, i) => {
    const after = i > 0 && glued(nodes[i - 1], n);
    if (i && !after) out.nl(indent);
    if (n.k === 'text') out.add(n.s);
    else if (n.k === 'expr') printExpr(n, out, st);
    else if (n.k === 'leaf') printTag(n.tag, out, st);
    else printElem(n, indent, out, st, after || (i + 1 < nodes.length && glued(n, nodes[i + 1])));
  });
}
function printExpr(e, out, st) {
  out.add('${');
  printCode(e.pieces, out, st, out.indent);
  out.add('}');
}
/* Una etiqueta. Si no cabe, sus atributos siguen en la línea siguiente, sangrados el doble que un hijo (así no se
   confunden con el contenido); el primero no se separa del nombre de la etiqueta. Devuelve si la repartió. */
function printTag(tag, out, st) {
  const print = parts => parts.forEach(p => typeof p === 'string' ? out.add(p) : printExpr(p, out, st));
  if (tag.flat == null || !tag.segs || out.col + tag.flat.length <= width) { print(tag.parts); return false; }
  const indent = out.indent + 4;
  let wrapped = false;
  tag.segs.forEach((seg, i) => {
    if (i > 1 && out.col + 1 + seg.flat.length > width) { out.nl(indent); wrapped = true; }
    else if (i) out.add(' ');
    print(seg.parts);
  });
  return wrapped;
}
/* Un elemento. inRun: va en la misma línea que lo que tiene al lado (un texto con un espacio, p. ej.). */
function printElem(el, indent, out, st, inRun) {
  if (el.flat != null && out.col + el.flat.length <= width) return out.add(el.flat);
  const c = el.children, kids = join(c.map(x => x.flat)), close = el.close ? el.close.flat : '';
  const wrapped = printTag(el.open, out, st);
  if (!c.length);
  else if (wrapped && kids != null && c.every(x => x.k === 'text' || x.k === 'expr') && out.col + kids.length + close.length <= width) out.add(kids);
  else if (!edgeBreak(c[0], 0)) printNodes(c, indent + 2, out, st);
  else {
    const o = block(c, indent + 2, st);
    if (!o.lines.length && kids != null && inRun) out.add(kids);   // dentro de una frase no se abre lo que seguiría en una línea
    else {
      append(out, o);
      if (el.close && edgeBreak(c[c.length - 1], 1)) out.nl(indent);
    }
  }
  if (el.close) printTag(el.close, out, st);
}
/** El código con sus plantillas html`…` repartidas en líneas de hasta cols columnas (WIDTH, si no se dice). Lo que no es
    plantilla no se toca. */
function layout(code, name, cols) {
  if (!/\bhtml\s*`/.test(code)) return code;
  width = cols || WIDTH;
  const sf = parse(code, name), fail = failAt(sf, name || 'código'), tops = outermost(sf);
  let out = '', p = 0;
  for (let i = 0; i < tops.length;) {
    // las plantillas que empiezan en la misma línea del código (aplanado) se ordenan juntas
    let j = i;
    while (j + 1 < tops.length && !code.slice(tops[j].end, tops[j + 1].getStart(sf)).includes('\n')) j++;
    const a = code.lastIndexOf('\n', tops[i].getStart(sf) - 1) + 1;
    let b = code.indexOf('\n', tops[j].end);
    if (b < 0) b = code.length;
    const pieces = [];
    let q = a;
    for (let k = i; k <= j; k++) { pieces.push(code.slice(q, tops[k].getStart(sf)), buildTpl(tops[k], sf, fail)); q = tops[k].end; }
    pieces.push(code.slice(q, b));
    i = j + 1;
    if (pieces.some(x => typeof x !== 'string' && x.opaque)) continue;   // se queda como está
    const o = new Out(), indent = /^[ \t]*/.exec(pieces[0])[0].length;
    printCode(pieces, o, { o: indent }, indent);
    out += code.slice(p, a) + o.text();
    p = b;
  }
  out += code.slice(p);
  // la garantía: aplanado, es el mismo código (salvo la sangría de las líneas de código que hay dentro de un ${…})
  const same = s => flatten(s, name).replace(/^[ \t]+/gm, '');
  if (same(out) !== same(code)) throw new Error((name || 'código') + ': tools/templates.js cambiaría una plantilla al ordenarla (es un error de la herramienta)');
  return out;
}

module.exports = { flatten, layout, WIDTH };
if (require.main === module) {
  const args = process.argv.slice(2);
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
  try {
    if (args[0] === '--flat' && args[1]) {
      for (const f of walk(args[1])) {
        const src = fs.readFileSync(f, 'utf8'), out = flatten(src, path.relative(args[1], f));
        if (out !== src) fs.writeFileSync(f, out);
      }
    } else if (args[0] === '--stats') {
      const JS = path.join(__dirname, '../src/js');
      let n = 0, multi = 0, lines = 0, over = 0, max = 0;
      for (const f of walk(JS)) {
        const code = fs.readFileSync(f, 'utf8');
        if (!/\bhtml\s*`/.test(code)) continue;
        const sf = parse(code, f), lineOf = p => sf.getLineAndCharacterOfPosition(p).line, all = code.split('\n'), seen = new Set();
        (function visit(node) {
          if (isHtml(node)) {
            n++;
            const a = lineOf(node.getStart(sf)), b = lineOf(node.end);
            if (b > a) multi++;
            for (let l = a; l <= b; l++) if (!seen.has(l)) { seen.add(l); lines++; if (all[l].length > WIDTH) over++; max = Math.max(max, all[l].length); }
          }
          ts.forEachChild(node, visit);
        })(sf);
      }
      console.log(`${n} plantillas html (${multi} en varias líneas) · ${lines} líneas · ${over} de más de ${WIDTH} columnas · la más larga, ${max}`);
    } else { console.error('Uso: node tools/templates.js --flat carpeta | --stats'); process.exit(2); }
  } catch (e) { console.error(e.message); process.exit(1); }
}
