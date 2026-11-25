#!/usr/bin/env node
/* StrataFit · el inglés: qué frases hay que traducir y si están todas (sin dependencias externas salvo typescript).
   El código está en español y, en inglés, la app traduce al pintar con un diccionario español → inglés (core/i18n y los
   módulos src/js/i18n/en-*.js). Esta herramienta saca del código las frases que la app va a buscar, con las mismas claves
   (lee las plantillas con las funciones de core/i18n), y las compara con el diccionario.

   De dónde salen las frases:
     · plantillas html`…`: cada trozo de texto entre dos etiquetas y cada atributo que se lee;
     · textos compuestos say`…`;
     · textos sueltos del código que parecen una frase (con un espacio, una tilde o una mayúscula inicial) y que no son un
       selector, un mensaje del registro de errores, una clave que solo se compara…;
     · los datos: nombres de ejercicios, grupos, material, músculos, alimentos, programas, niveles, técnicas, logros…
       (DATA, más abajo: de cada módulo de datos, lo que se enseña).
   Una frase que no se enseña, o que es igual en inglés, va en tools/i18n-skip.json. Las que el código compone de un modo
   que aquí no se ve («3 series», que la app busca como «# series») van en i18n/en-more.js, que no se mira si sobra.

   Uso:  node tools/i18n.js --check            falla si falta una frase, si sobra una, si una traducción pierde un valor
                                               ({0}, #) o si algo se traduce al cargar un módulo (el diccionario aún no está)
         node tools/i18n.js --todo [módulo]    escribe las que faltan, numeradas, en /tmp/i18n/todo.txt (y sus claves en
                                               todo.json); con módulo (ui, library…), solo las suyas
         node tools/i18n.js --apply archivo módulo   añade al módulo las traducciones de «número<tab>inglés» (las de todo.txt)
         node tools/i18n.js --stats            cuántas frases hay, de qué clase, y cuántas faltan */
const fs = require('fs'), path = require('path');
const { ROOT, JS, allModules } = require('./modules');
const { flatten } = require('./templates');
function loadTS() {
  const cands = [process.env.TS_PATH, 'typescript', path.join(__dirname, '../node_modules/typescript'), '/opt/npm-tools/node_modules/typescript'].filter(Boolean);
  for (const c of cands) { try { return require(c); } catch (e) {} }
  console.error('No se encuentra el paquete "typescript"'); process.exit(2);
}
const ts = loadTS();
const read = f => fs.readFileSync(f, 'utf8');
const DIR = path.join(JS, 'i18n');
const SKIP = path.join(__dirname, 'i18n-skip.json');
const TMP = '/tmp/i18n';

/* ── las funciones de la app que leen una plantilla (core/i18n), tal cual ─────────────────────────────────────────── */
const core = Function(read(path.join(JS, 'core', 'i18n.js')).replace(/^export /gm, '') + '\nreturn { scanTemplate, phraseKey, WORDS, NUMBERS };')();

/* ── un módulo de datos de la app (sin dependencias): sus declaraciones ───────────────────────────────────────────── */
const data = (f, names) => Function(read(path.join(JS, f)).replace(/^import [^\n]*\n/gm, '').replace(/^export /gm, '') + '\nreturn { ' + names.join(', ') + ' };')();

/* ── el diccionario: cada módulo i18n/en-*.js, con sus frases ─────────────────────────────────────────────────────── */
const dictFiles = () => fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => /^en-[\w-]+\.js$/.test(f)).sort() : [];
const dictOf = f => {
  const out = new Map();
  const src = read(path.join(DIR, f)).replace(/^import [^\n]*\n/gm, '');
  if (!/\baddEnglish\(/.test(src)) return out;
  Function('addEnglish', src)(d => { for (const k in d) out.set(k, d[k]); });
  return out;
};
const HEADS = {
  ui: 'los textos de la interfaz, en el orden en que salen en el código',
  more: 'las frases que el código compone de un modo que tools/i18n.js no ve en el código (un número y su unidad, que la app\n   busca con # en vez del número; una palabra suelta que se junta con otra). No se comprueba si sobran',
  library: 'los ejercicios, sus grupos, su material y sus músculos',
  foods: 'los alimentos',
  programs: 'los programas, sus días y sus notas, los niveles, la rotación, las técnicas, el WOD y los logros',
};
const writeDict = (name, map) => {
  const body = [...map].map(([k, v]) => '  ' + JSON.stringify(k) + ': ' + JSON.stringify(v) + ',').join('\n');
  fs.writeFileSync(path.join(DIR, 'en-' + name + '.js'), `/* ═══ i18n/en-${name} ═══
   Inglés (de Estados Unidos): ${HEADS[name] || name}. Cada clave es la frase en español tal como la busca la app (core/i18n:
   el texto fijo de una plantilla html, con {0}, {1}… donde van sus valores; un say\`…\`; o un texto suelto) y su valor, la
   frase en inglés. tools/i18n.js saca las claves del código y comprueba que no falta ni sobra ninguna.
*/
import { addEnglish } from '../core/i18n.js';
addEnglish({
${body}
});
`);
};

/* ── las frases del código ────────────────────────────────────────────────────────────────────────────────────────── */
/* funciones cuyo texto no se enseña: el registro de errores, selectores, nombres de eventos, claves… */
const SILENT_CALLS = /^(logError|console\.\w+|\$|\$\$|document\.querySelector(All)?|[\w.]+\.querySelector(All)?|[\w.]+\.closest|[\w.]+\.matches|document\.getElementById|[\w.]+\.addEventListener|[\w.]+\.removeEventListener|[\w.]+\.setAttribute|[\w.]+\.getAttribute|[\w.]+\.removeAttribute|[\w.]+\.classList\.\w+|matchMedia|window\.matchMedia|document\.createElement(NS)?|lazyLoad|lazyAction|fetch|[\w.]+\.includes|[\w.]+\.indexOf|[\w.]+\.startsWith|[\w.]+\.endsWith|[\w.]+\.split|[\w.]+\.join|[\w.]+\.replace|[\w.]+\.test|[\w.]+\.match|new RegExp|RegExp|Store\.\w+|[\w.]+\.getContext|[\w.]+\.postMessage|[\w.]+\.setProperty|[\w.]+\.getPropertyValue|[\w.]+\.createObjectStore|[\w.]+\.transaction|[\w.]+\.objectStore|idbStore|figDb|[\w.]+\.padStart|[\w.]+\.padEnd|parseInt|parseFloat|typeof)$/;
const COMPARES = new Set([ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.InKeyword]);
/* un texto que parece una frase: dos letras seguidas y un espacio, una letra con tilde o una mayúscula inicial seguida de minúsculas */
const looksProse = u => core.WORDS.test(u) && (/[a-záéíóúñ] [a-záéíóúñA-Z¿¡«(]/.test(u) || /[áéíóúñ¿¡]/i.test(u) || /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/.test(u));
/* y uno que es código: una etiqueta, un selector, una dirección, una regla de estilo, una ruta */
const looksCode = u => /[<>{}=\\]|:\/\/|^[.#\[][A-Za-z]|^\w+\(|;$|^[\w-]+:[\w-]|\.(js|json|png|webp|svg|css|html)\b|cubic-bezier|\d(ms|s) ease|^[a-z0-9]+(-[a-z0-9]+)*( [a-z0-9]+(-[a-z0-9]+)*)*-[a-z0-9-]+( [a-z0-9-]+)*$/.test(u);
const lineOf = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
/* funciones que juntan una palabra con un número: sus palabras se enseñan aunque no parezcan una frase */
const WORD_CALLS = /^(plural)$/;
/** Las frases de un módulo: [clave, clase, línea]… con clase 'tpl' (plantilla html), 'say' (say`…`), 'lit' (texto suelto que
    parece una frase) o 'word' (cualquier otro texto con letras: no hace falta traducirlo, pero puede estar en el diccionario); y
    los sitios donde algo se traduce al cargar el módulo (early). */
const phrasesOf = rel => {
  const code = flatten(read(path.join(JS, rel)), rel);
  const sf = ts.createSourceFile(rel, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const out = [], early = [];
  const cooked = t => ts.isNoSubstitutionTemplateLiteral(t) ? [t.text] : [t.head.text, ...t.templateSpans.map(s => s.literal.text)];
  const visit = (n, depth, said) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    const fn = ts.isFunctionLike(n) ? 1 : 0;
    if (ts.isTaggedTemplateExpression(n) && ts.isIdentifier(n.tag) && (n.tag.text == 'html' || n.tag.text == 'say')) {
      const parts = cooked(n.template);
      const keys = n.tag.text == 'html' ? core.scanTemplate(parts).segs.map(g => g.key) : (s => core.WORDS.test(s.replace(/\u0001\d+\u0002/g, '')) ? [core.phraseKey(s).key] : [])(parts.map((p, i) => i ? '\u0001' + (i - 1) + '\u0002' + p : p).join(''));
      keys.forEach(k => out.push([k, n.tag.text == 'html' ? 'tpl' : 'say', lineOf(sf, n)]));
      if (keys.length && !depth) early.push(rel + ':' + lineOf(sf, n) + ': ' + n.tag.text + '`…` con texto al cargar el módulo');
      if (!ts.isNoSubstitutionTemplateLiteral(n.template)) n.template.templateSpans.forEach(s => visit(s.expression, depth, n.tag.text == 'say'));
      return;
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text == 'tr' && !depth) early.push(rel + ':' + lineOf(sf, n) + ': tr() al cargar el módulo');
    /* un texto escrito en varios trozos ('…' + '…'): es una sola frase. Los trozos de una suma con algo que no es texto no
       son frases: las que se enseñan están escritas con say`…` */
    const isLit = x => ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x);
    const isPlus = x => ts.isBinaryExpression(x) && x.operatorToken.kind == ts.SyntaxKind.PlusToken;
    if (isPlus(n) && !isPlus(n.parent)) {
      const ops = [];
      (function flat(x) { if (isPlus(x)) { flat(x.left); flat(x.right); } else ops.push(x); })(n);
      if (ops.every(isLit)) {
        const text = ops.map(o => o.text).join('');
        if (core.WORDS.test(text) && !looksCode(text)) out.push([said ? text.trim() : text, said || looksProse(text) ? 'lit' : 'word', lineOf(sf, n)]);
        return;
      }
    }
    if (isLit(n) && core.WORDS.test(n.text) && !looksCode(n.text)) {
      const p = n.parent;
      /* lo que va dentro de un say`…` o es una palabra de plural() se enseña siempre (la app lo busca sin sus espacios) */
      const shown = said || ts.isCallExpression(p) && p.arguments.indexOf(n) > 0 && WORD_CALLS.test(p.expression.getText(sf));
      const silent = ts.isPropertyAssignment(p) && p.name === n || ts.isElementAccessExpression(p) || ts.isCaseClause(p)
        || ts.isBinaryExpression(p) && COMPARES.has(p.operatorToken.kind)
        || (ts.isCallExpression(p) || ts.isNewExpression(p)) && p.expression !== n && SILENT_CALLS.test((ts.isNewExpression(p) ? 'new ' : '') + p.expression.getText(sf))
        || ts.isNewExpression(p) && /Error$/.test(p.expression.getText(sf)) || ts.isThrowStatement(p) || ts.isTaggedTemplateExpression(p);
      if (!silent) out.push([shown ? n.text.trim() : n.text, shown || looksProse(n.text) && !isPlus(p) ? 'lit' : 'word', lineOf(sf, n)]);
    }
    /* un valor de un say`…` se enseña tal cual si es un texto o uno de dos (a ? 'x' : 'y'), no si es el argumento de otra cosa */
    ts.forEachChild(n, c => visit(c, depth + fn, said && (ts.isConditionalExpression(n) || ts.isParenthesizedExpression(n) || ts.isBinaryExpression(n) && n.operatorToken.kind == ts.SyntaxKind.BarBarToken)));
  };
  visit(sf, 0, false);
  return { out, early };
};

/* ── las frases de los datos ──────────────────────────────────────────────────────────────────────────────────────── */
/* Cada módulo de datos, con lo que de él se enseña. Se rellena más abajo, módulo a módulo. */
const DATA = {};

/* ── todo junto ───────────────────────────────────────────────────────────────────────────────────────────────────── */
const UI_MODULES = () => allModules().filter(m => !m.startsWith('data/') && !m.startsWith('i18n/'));
const collect = () => {
  const need = new Map();   // frase → { kind, where, group }
  const words = new Set();  // textos del código que no hace falta traducir, pero pueden estar en el diccionario
  const early = [];
  const add = (k, kind, where, group) => { if (k && !need.has(k)) need.set(k, { kind, where, group }); };
  for (const m of UI_MODULES()) {
    const r = phrasesOf(m);
    r.out.forEach(([k, kind, line]) => kind == 'word' ? words.add(k) : add(k, kind, m + ':' + line, 'ui'));
    early.push(...r.early);
  }
  for (const group in DATA)
    for (const k of DATA[group]()) add(k, 'data', group, group);
  return { need, words, early };
};
const skipped = () => new Set(fs.existsSync(SKIP) ? JSON.parse(read(SKIP)) : []);
/* lo que una traducción tiene que conservar: sus valores ({0}…) y sus números (#) */
const holes = s => [...s.matchAll(/\{(\d+)\}/g)].map(m => m[1]).sort().join(',');
const hashes = s => (s.match(/#/g) || []).length;
const tags = s => (s.match(/<[^>]*>/g) || []).length;

const status = () => {
  const { need, words, early } = collect();
  const skip = skipped();
  const dicts = new Map(dictFiles().map(f => [f.slice(3, -3), dictOf(f)]));
  const all = new Map();
  const errors = early.slice();
  for (const [name, d] of dicts)
    for (const [k, v] of d) {
      if (all.has(k)) errors.push('repetida en en-' + name + '.js: ' + JSON.stringify(k));
      all.set(k, v);
      if (typeof v != 'string' || !v.trim()) errors.push('sin traducción en en-' + name + '.js: ' + JSON.stringify(k));
      else if (holes(k) != holes(v) || hashes(k) != hashes(v) || tags(k) != tags(v)) errors.push('la traducción no lleva los mismos valores ({0}…, # o etiquetas) en en-' + name + '.js: ' + JSON.stringify(k) + ' → ' + JSON.stringify(v));
      else if (/"/.test(v) && !/"/.test(k)) errors.push('comillas rectas en la traducción (usa “ ”) en en-' + name + '.js: ' + JSON.stringify(k));
      if (skip.has(k)) errors.push('está en tools/i18n-skip.json y en en-' + name + '.js: ' + JSON.stringify(k));
    }
  const missing = [...need].filter(([k]) => !all.has(k) && !skip.has(k));
  const stale = [];
  for (const [name, d] of dicts)
    if (name != 'more')
      for (const k of d.keys()) if (!need.has(k) && !words.has(k)) stale.push([name, k]);
  for (const k of skip) if (!need.has(k)) stale.push(['skip', k]);
  return { need, dicts, all, errors, missing, stale, skip };
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const st = status();
  if (args[0] == '--stats' || !args.length) {
    const by = {};
    for (const [, v] of st.need) by[v.group + ' ' + v.kind] = (by[v.group + ' ' + v.kind] || 0) + 1;
    console.log('frases que busca la app:', st.need.size, by);
    console.log('en el diccionario:', st.all.size, '· se saltan:', st.skip.size, '· faltan:', st.missing.length, '· sobran:', st.stale.length, '· avisos:', st.errors.length);
  }
  else if (args[0] == '--todo') {
    const only = args[1];
    const list = st.missing.filter(([, v]) => !only || v.group == only);
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(path.join(TMP, 'todo.json'), JSON.stringify(list.map(([k]) => k)));
    fs.writeFileSync(path.join(TMP, 'todo.txt'), list.map(([k], i) => i + '\t' + k.replace(/\n/g, '\\n')).join('\n') + '\n');
    console.log(list.length + ' frases por traducir en ' + path.join(TMP, 'todo.txt') + ' (' + list.reduce((s, [k]) => s + k.length, 0) + ' caracteres)');
  }
  else if (args[0] == '--apply') {
    const keys = JSON.parse(read(path.join(TMP, 'todo.json')));
    const name = args[2] || 'ui';
    const d = fs.existsSync(path.join(DIR, 'en-' + name + '.js')) ? dictOf('en-' + name + '.js') : new Map();
    let n = 0;
    for (const line of read(args[1]).split('\n')) {
      const m = /^(\d+)\t(.*)$/.exec(line);
      if (!m) { if (line.trim()) { console.error('línea que no se entiende: ' + line.slice(0, 80)); process.exit(1); } continue; }
      const k = keys[+m[1]];
      if (k === undefined) { console.error('no hay frase ' + m[1]); process.exit(1); }
      d.set(k, m[2].replace(/\\n/g, '\n'));
      n++;
    }
    /* en el orden en que la app las busca; al final, las que ya no busca (las dirá --check) */
    const order = new Map([...st.need.keys()].map((k, i) => [k, i]));
    writeDict(name, new Map([...d].sort((a, b) => (order.has(a[0]) ? order.get(a[0]) : 1e9) - (order.has(b[0]) ? order.get(b[0]) : 1e9))));
    console.log(n + ' traducciones puestas en i18n/en-' + name + '.js (' + d.size + ' en total)');
  }
  else if (args[0] == '--check') {
    st.missing.slice(0, 40).forEach(([k, v]) => console.error('ERROR: sin traducir (' + v.where + '): ' + JSON.stringify(k)));
    st.stale.slice(0, 40).forEach(([name, k]) => console.error('ERROR: sobra en ' + (name == 'skip' ? 'tools/i18n-skip.json' : 'en-' + name + '.js') + ' (la app ya no la busca): ' + JSON.stringify(k)));
    st.errors.slice(0, 40).forEach(e => console.error('ERROR: ' + e));
    const n = st.missing.length + st.stale.length + st.errors.length;
    if (n) { console.error(n + ' problemas con el inglés (' + st.missing.length + ' sin traducir, ' + st.stale.length + ' que sobran, ' + st.errors.length + ' avisos)'); process.exit(1); }
    console.log('Inglés completo: ' + st.need.size + ' frases (' + st.all.size + ' en el diccionario, ' + st.skip.size + ' que no se traducen)');
  }
}
module.exports = { status, phrasesOf, core, DATA, data };
