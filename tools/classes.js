#!/usr/bin/env node
/* StrataFit · renombra clases CSS en los estilos, el código, las pruebas y la documentación (sin dependencias salvo typescript)
   Una clase se llama igual en cuatro sitios: el selector del CSS, el HTML que pinta el código, lo que el código busca o
   cambia (classList, querySelector) y los selectores de las pruebas. Aquí se cambian todos a la vez, y solo donde el nombre
   es de verdad una clase: «ok» también es un texto, una clave y una variable.

   Dónde se renombra:
     · src/css: en los selectores (y en los comentarios, las menciones «.nombre»).
     · src/js, leyendo el código (no buscando texto):
         - el valor de class="…", en una plantilla o en un texto, con lo que lleve dentro: las ramas de una condición
           (${on ? 'on' : ''}), los trozos de una suma, la constante o la tabla de la que sale (LEVEL_CLASS[v]);
         - classList.add/remove/toggle/contains/replace, className = … y setAttribute('class', …);
         - los selectores de querySelector, querySelectorAll, closest y matches.
     · tests y docs, por texto: class="…", classList, y «.nombre» donde es un selector.

   Lo que no se puede decidir solo se dice, con su archivo y su línea, y no se toca:
     · SIN RESOLVER: una clase que llega por un camino que no se sigue (un parámetro, un dato): hay que mirarlo;
     · A TROZOS: un nombre pegado a un ${…} que podría completarlo;
     · QUEDA: el nombre viejo sigue escrito en un texto, fuera de los sitios de arriba. Casi siempre no es la clase (un
       texto, un valor), pero si lo es y no se cambia, ese elemento se queda sin estilo.

   Uso:  node tools/classes.js --check            (en la batería: toda clase que el código pone o busca está en src/css)
         node tools/classes.js mapa.txt [--dry]   (líneas «K viejo nuevo»; # comentarios; --dry: solo cuenta, no escribe)
   El mapa crece con cada lote: solo se aplican las líneas cuyo nombre viejo sigue en el CSS. Se niega si un nombre nuevo ya
   es una clase, o si de una línea no existe ni el viejo ni el nuevo. Después: npm run format y la comparación con el
   mapa (bash tests/compare.sh antes.html despues.html 0,1,2,3 150 mapa.txt), que traduce las clases de la versión de antes. */
const fs = require('fs'), path = require('path');
function loadTS() {
  for (const c of [process.env.TS_PATH, 'typescript', path.join(__dirname, '../node_modules/typescript'), '/opt/npm-tools/node_modules/typescript'].filter(Boolean)) { try { return require(c); } catch (e) {} }
  console.error('No se encuentra el paquete "typescript"'); process.exit(2);
}
const ts = loadTS();
const args = process.argv.slice(2), DRY = args.includes('--dry'), CHECK = args.includes('--check'), mapFile = args.find(a => !a.startsWith('--'));
// --root=carpeta: otro proyecto con src/css, src/js, tests y docs (lo usan las pruebas de esta herramienta)
const ROOT = path.resolve((args.find(a => a.startsWith('--root=')) || '--root=' + path.join(__dirname, '..')).slice(7));
if (!mapFile && !CHECK) { console.error('Uso: node tools/classes.js mapa.txt [--dry] | --check'); process.exit(2); }
const LINES = (mapFile ? fs.readFileSync(mapFile, 'utf8') : '').split('\n').map(l => l.replace(/#.*/, '').trim().split(/\s+/)).filter(p => p[0] === 'K' && p.length === 3 && !p[1].includes('@'));
const ALL = new Set(LINES.map(p => p[1]));   // todos los nombres viejos del mapa, también los de lotes ya aplicados
const MAP = new Map();                       // viejo → nuevo, de las líneas que quedan por aplicar
const walk = (d, ok) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name), ok) : ok(e.name) ? [path.join(d, e.name)] : []);
const rel = f => path.relative(ROOT, f);
const CLASS = /\.(-?[_a-zA-Z][\w-]*)/g;
const count = {}, notes = [];
const tally = (c, where) => { (count[c] = count[c] || { css: 0, js: 0, tests: 0, docs: 0 })[where]++; };
const note = (kind, file, line, text) => notes.push(`${kind} ${file}:${line}: ${text.replace(/\s+/g, ' ').slice(0, 170)}`);
const lineOf = (text, pos) => text.slice(0, pos).split('\n').length;

/* ── CSS: los selectores son lo que precede a cada «{» ─────────────────────────────────────────────────────────── */
const cssFiles = walk(path.join(ROOT, 'src/css'), n => n.endsWith('.css')).sort();
const cssClasses = new Set();
for (const f of cssFiles)
  for (const sel of fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/"[^"]*"|'[^']*'/g, '""').match(/[^{};]+(?=\{)/g) || [])
    for (const m of sel.matchAll(CLASS)) cssClasses.add(m[1]);
// el mapa va creciendo con cada lote: una línea cuyo nombre viejo ya no está en el CSS y el nuevo sí, ya se aplicó
for (const [, o, n] of LINES) {
  if (cssClasses.has(o)) MAP.set(o, n);
  else if (!cssClasses.has(n)) { console.error(`ni «${o}» ni «${n}» son clases de src/css`); process.exit(1); }
}
for (const [o, n] of MAP) {
  if (cssClasses.has(n) || LINES.filter(p => p[2] === n).length > 1) { console.error(`«${n}» (para «${o}») ya es una clase o está repetido en el mapa`); process.exit(1); }
  if (!/^-?[_a-zA-Z][\w-]*$/.test(n)) { console.error(`«${n}» no vale como nombre de clase`); process.exit(1); }
  // el mapa también se aplica al comparar con una versión que ya los tiene cambiados: ahí no puede encontrar nada
  if (ALL.has(n)) { console.error(`«${n}» (para «${o}») es también un nombre viejo del mapa`); process.exit(1); }
}
function renameCss(text) {
  const ren = s => s.replace(CLASS, (all, c) => MAP.has(c) ? (tally(c, 'css'), '.' + MAP.get(c)) : all);
  const mention = s => s.replace(CLASS, (all, c) => MAP.has(c) ? '.' + MAP.get(c) : all);
  let out = '', pending = [], last = 0;
  const flush = selector => { out += pending.map(([kind, s]) => kind === 'comment' ? mention(s) : kind === 'text' && selector ? ren(s) : s).join(''); pending = []; };
  for (const m of text.matchAll(/\/\*[\s\S]*?\*\/|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[{};]/g)) {
    pending.push(['text', text.slice(last, m.index)]);
    last = m.index + m[0].length;
    if (m[0] === '{') { flush(true); out += '{'; }
    else if (m[0] === '}' || m[0] === ';') { flush(false); out += m[0]; }
    else pending.push([m[0].startsWith('/*') ? 'comment' : 'string', m[0]]);
  }
  pending.push(['text', text.slice(last)]);
  flush(false);
  return out;
}

/* ── JS ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const jsFiles = walk(path.join(ROOT, 'src/js'), n => n.endsWith('.js')).sort();
const sources = new Map(jsFiles.map(f => [f, fs.readFileSync(f, 'utf8')]));
const asts = new Map([...sources].map(([f, code]) => [f, ts.createSourceFile(f, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS)]));
// las constantes de primer nivel de todos los módulos (los nombres globales no se repiten): de dónde puede salir una clase
const topConst = new Map();
for (const sf of asts.values())
  for (const st of sf.statements)
    if (ts.isVariableStatement(st))
      for (const d of st.declarationList.declarations)
        if (ts.isIdentifier(d.name) && d.initializer) topConst.set(d.name.text, d);
const edits = new Map(jsFiles.map(f => [f, new Map()]));   // archivo → (posición → [fin, texto])
const visited = new Map(jsFiles.map(f => [f, []]));        // archivo → tramos ya mirados como clases
const partial = new Set();                                 // «archivo:posición» de los nombres a trozos ('an' + x): no son una clase entera
const isText = n => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n);
const fileOf = n => n.getSourceFile().fileName;
const where = n => { const sf = n.getSourceFile(); return [rel(sf.fileName), sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1]; };
// el texto de un literal, tal como está escrito, y dónde empieza
const rawOf = n => { const sf = n.getSourceFile(), a = n.getStart(sf) + 1, b = n.end - (n.kind === ts.SyntaxKind.TemplateHead || n.kind === ts.SyntaxKind.TemplateMiddle ? 2 : 1); return [a, sf.text.slice(a, b)]; };
const log = [];   // «archivo:posición» de cada nombre mirado, en orden
function renameToken(file, a, b, tok) {
  visited.get(file).push([a, b]);
  log.push(file + ':' + a);
  if (!MAP.has(tok)) return;
  if (!edits.get(file).has(a)) { edits.get(file).set(a, [b, MAP.get(tok)]); tally(tok, 'js'); }
}
// las clases de un trozo de texto que es una lista de clases («cd  m-8-0»)
function classList(file, start, raw, from, to) {
  for (const m of raw.slice(from, to).matchAll(/\S+/g)) renameToken(file, start + from + m.index, start + from + m.index + m[0].length, m[0]);
}
// los operandos de una suma, en orden
const addends = n => ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken ? [...addends(n.left), ...addends(n.right)] : ts.isParenthesizedExpression(n) && ts.isBinaryExpression(n.expression) && n.expression.operatorToken.kind === ts.SyntaxKind.PlusToken ? addends(n.expression) : [n];
/* Una expresión cuyo valor es una lista de clases: renombra en los textos de los que puede salir y devuelve si empieza y si
   acaba «limpia» (vacía o con un espacio), que es lo que hace falta saber para dar por entero el nombre que lleve pegado. */
const seen = new Set();
function classExpr(n) {
  const all = list => { const r = list.map(classExpr); return { start: r.every(x => x.start), end: r.every(x => x.end) }; };
  if (isText(n)) {
    const [a, raw] = rawOf(n);
    if (!seen.has(n)) { seen.add(n); classList(fileOf(n), a, raw, 0, raw.length); }
    return { start: !raw || /^\s/.test(raw), end: !raw || /\s$/.test(raw) };
  }
  if (ts.isParenthesizedExpression(n)) return classExpr(n.expression);
  if (ts.isConditionalExpression(n)) return all([n.whenTrue, n.whenFalse]);
  if (ts.isBinaryExpression(n)) {
    const op = n.operatorToken.kind;
    if (op === ts.SyntaxKind.PlusToken) { const r = addends(n).map(classExpr); return { start: r[0].start, end: r[r.length - 1].end }; }
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) return all([n.left, n.right]);
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return classExpr(n.right);
  }
  if (ts.isTemplateExpression(n) && !ts.isTaggedTemplateExpression(n.parent)) {
    const lits = [n.head, ...n.templateSpans.map(s => s.literal)], r = n.templateSpans.map(s => classExpr(s.expression));
    lits.forEach((l, i) => {
      const [a, raw] = rawOf(l);
      if (seen.has(l)) return;
      seen.add(l);
      for (const m of raw.matchAll(/\S+/g)) {
        const glued = (m.index === 0 && i > 0 && !r[i - 1].end) || (m.index + m[0].length === raw.length && i < r.length && !r[i].start);
        if (glued && MAP.has(m[0])) note('A TROZOS', ...where(l), m[0] + ' en ' + n.getText());
        else if (glued) partial.add(fileOf(l) + ':' + (a + m.index));
        else renameToken(fileOf(l), a + m.index, a + m.index + m[0].length, m[0]);
      }
    });
    const first = rawOf(lits[0])[1], last = rawOf(lits[lits.length - 1])[1];
    return { start: first ? /^\s/.test(first) : r[0].start, end: last ? /\s$/.test(last) : r[r.length - 1].end };
  }
  if (ts.isCallExpression(n)) {
    const f = n.expression;
    if (ts.isIdentifier(f) && (f.text === 'raw' || f.text === 'String') && n.arguments.length === 1) return classExpr(n.arguments[0]);
    if (ts.isPropertyAccessExpression(f) && f.name.text === 'join' && ts.isArrayLiteralExpression(f.expression)) { f.expression.elements.forEach(classExpr); return { start: false, end: false }; }
    if (ts.isPropertyAccessExpression(f) && f.name.text === 'trim') return classExpr(f.expression);
  }
  if (isRef(n)) {
    // una tabla de clases, X[k] con k variable: todos sus textos
    const d = ts.isElementAccessExpression(n) && ts.isIdentifier(n.expression) && !ts.isNumericLiteral(n.argumentExpression) && declOf(n.expression);
    if (d && d.init && (ts.isObjectLiteralExpression(d.init) || ts.isArrayLiteralExpression(d.init))) {
      if (!seen.has(d.decl)) {
        seen.add(d.decl);
        note('TABLA', ...where(d.decl), d.decl.name.text + ': todos sus textos se toman por clases');
        (function texts(x) { if (isText(x)) classExpr(x); else if (ts.isPropertyAssignment(x)) texts(x.initializer); else ts.forEachChild(x, texts); })(d.init);
      }
      return { start: false, end: false };
    }
    const r = resolve(n, new Set());
    if (r) { const todo = r.filter(x => isText(x) || !seen.has(x)); todo.forEach(x => isText(x) || seen.add(x)); return todo.length ? all(todo) : { start: false, end: false }; }
  }
  if (ts.isNumericLiteral(n) || n.kind === ts.SyntaxKind.NullKeyword) return { start: true, end: true };
  note('SIN RESOLVER', ...where(n), n.getText() + '   ← en ' + (n.parent.getText().length < 120 ? n.parent.getText() : n.parent.parent.getText()));
  return { start: false, end: false };
}
/* De dónde sale un valor: una constante (su valor), un parámetro (lo que le pasan en cada llamada a su función), el elemento
   de una lista que se recorre con map/forEach (los de esa lista) y, de ahí, X[2] o X.k. null si algún camino no se sabe. */
const calls = new Map();   // nombre de función → sus llamadas, en todos los módulos (los nombres globales no se repiten)
for (const sf of asts.values())
  (function visit(n) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) (calls.get(n.expression.text) || calls.set(n.expression.text, []).get(n.expression.text)).push(n);
    ts.forEachChild(n, visit);
  })(sf);
const ITER = new Set(['map', 'forEach', 'filter', 'flatMap', 'some', 'every', 'find']);
const isFn = n => ts.isArrowFunction(n) || ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n);
function declOf(id) {
  for (let p = id.parent; p; p = p.parent) {
    if (isFn(p)) {
      const i = p.parameters.findIndex(q => ts.isIdentifier(q.name) && q.name.text === id.text);
      if (i >= 0) return { fn: p, index: i, dflt: p.parameters[i].initializer };
      if (p.parameters.some(q => !ts.isIdentifier(q.name) && q.name.getText().split(/\W+/).includes(id.text))) return null;   // desestructurado
    }
    const stmts = ts.isBlock(p) || ts.isSourceFile(p) || ts.isCaseClause(p) ? p.statements : null;
    if (stmts)
      for (const st of stmts)
        if (ts.isVariableStatement(st))
          for (const d of st.declarationList.declarations)
            if (ts.isIdentifier(d.name) && d.name.text === id.text) return d.initializer && (st.declarationList.flags & ts.NodeFlags.Const) ? { init: d.initializer, decl: d } : null;
    if ((ts.isForOfStatement(p) || ts.isForInStatement(p) || ts.isForStatement(p)) && p.initializer && p.initializer.getText().split(/\W+/).includes(id.text)) return null;
  }
  const d = topConst.get(id.text);
  return d ? { init: d.initializer, decl: d } : null;
}
function resolve(n, guard) {
  if (guard.has(n)) return [];
  guard.add(n);
  if (ts.isIdentifier(n)) {
    const d = declOf(n);
    if (!d) return null;
    if (d.init) return [d.init];
    const call = d.fn.parent;
    if (ts.isCallExpression(call) && call.arguments[0] === d.fn && ts.isPropertyAccessExpression(call.expression) && ITER.has(call.expression.name.text)) {
      if (d.index) return null;
      const lists = values(call.expression.expression, guard), out = [];
      if (!lists) return null;
      for (const a of lists) {
        if (!ts.isArrayLiteralExpression(a)) return null;
        for (const e of a.elements) {
          if (!ts.isSpreadElement(e)) { out.push(e); continue; }
          const inner = values(e.expression, guard);
          if (!inner || !inner.every(ts.isArrayLiteralExpression)) return null;
          inner.forEach(x => out.push(...x.elements));
        }
      }
      return out;
    }
    const name = ts.isFunctionDeclaration(d.fn) && d.fn.name ? d.fn.name.text : ts.isVariableDeclaration(d.fn.parent) && ts.isIdentifier(d.fn.parent.name) ? d.fn.parent.name.text : '';
    const sites = name && calls.get(name);
    if (!sites) return null;
    return sites.map(c => c.arguments[d.index]).filter(Boolean).concat(d.dflt ? [d.dflt] : []);
  }
  const base = values(n.expression, guard), out = [];
  if (!base) return null;
  for (const b of base) {
    if (ts.isElementAccessExpression(n) && ts.isNumericLiteral(n.argumentExpression) && ts.isArrayLiteralExpression(b)) { const e = b.elements[+n.argumentExpression.text]; if (e) out.push(e); }
    else if (ts.isPropertyAccessExpression(n) && ts.isObjectLiteralExpression(b)) { const q = b.properties.find(x => ts.isPropertyAssignment(x) && x.name.getText() === n.name.text); if (q) out.push(q.initializer); }
    else return null;
  }
  return out;
}
const isRef = n => ts.isIdentifier(n) || ((ts.isElementAccessExpression(n) || ts.isPropertyAccessExpression(n)) && n.expression.kind !== ts.SyntaxKind.ThisKeyword);
function values(n, guard) {
  const both = list => { const r = list.map(x => values(x, guard)); return r.every(Boolean) ? r.flat() : null; };
  if (ts.isParenthesizedExpression(n)) return values(n.expression, guard);
  if (ts.isConditionalExpression(n)) return both([n.whenTrue, n.whenFalse]);
  if (ts.isBinaryExpression(n) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind)) return both([n.left, n.right]);
  if (isRef(n)) { const r = resolve(n, guard); return r && both(r); }
  return [n];
}
/* Una secuencia de textos y expresiones (una plantilla o una suma): busca dentro los class="…" y renombra en su valor. */
function scanSequence(pieces) {
  let inValue = false, delim = '';
  const info = new Map();
  const exprInfo = k => { if (!info.has(k)) { const from = log.length, r = classExpr(pieces[k]); info.set(k, { ...r, tokens: log.slice(from) }); } return info.get(k); };
  // lo que sale de una expresión pegada a un nombre a medias ('an' + (x ? 'e' : 'o')) tampoco es una clase entera
  const halves = k => { if (k >= 0 && k < pieces.length && info.has(k)) info.get(k).tokens.forEach(t => partial.add(t)); };
  pieces.forEach((p, k) => {
    const lit = isText(p) || p.kind === ts.SyntaxKind.TemplateHead || p.kind === ts.SyntaxKind.TemplateMiddle || p.kind === ts.SyntaxKind.TemplateTail;
    if (!lit) { if (inValue) exprInfo(k); return; }
    const [start, raw] = rawOf(p), file = fileOf(p);
    for (let i = 0; i < raw.length;) {
      if (!inValue) {
        const m = /\bclass=(\\?["'])/g;
        m.lastIndex = i;
        const r = m.exec(raw);
        if (!r) break;
        inValue = true; delim = r[1]; i = r.index + r[0].length;
        continue;
      }
      const close = raw.indexOf(delim, i), end = close < 0 ? raw.length : close;
      for (const m of raw.slice(i, end).matchAll(/\S+/g)) {
        const a = i + m.index, b = a + m[0].length;
        // pegado a lo de al lado: solo es un nombre entero si lo de al lado empieza (o acaba) limpio
        const before = a === 0 && k > 0, after = b === raw.length && close < 0 && k + 1 < pieces.length;
        const glued = (before && !(isText(pieces[k - 1]) ? false : exprInfo(k - 1).end)) || (after && !(isText(pieces[k + 1]) ? false : exprInfo(k + 1).start));
        if (glued && MAP.has(m[0])) note('A TROZOS', rel(file), lineOf(p.getSourceFile().text, start + a), m[0] + ' en ' + raw.slice(Math.max(0, a - 30), b + 30));
        else if (glued) { visited.get(file).push([start + a, start + b]); partial.add(file + ':' + (start + a)); if (before) halves(k - 1); if (after) halves(k + 1); }
        else renameToken(file, start + a, start + b, m[0]);
      }
      if (close < 0) break;
      inValue = false; i = close + delim.length;
    }
  });
}
// los selectores: «.nombre» fuera de los corchetes de un atributo
function selectorExpr(n) {
  if (ts.isParenthesizedExpression(n)) return selectorExpr(n.expression);
  if (ts.isConditionalExpression(n)) return [n.whenTrue, n.whenFalse].forEach(selectorExpr);
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) return addends(n).forEach(selectorExpr);
  if (isRef(n)) {
    const r = resolve(n, new Set());
    if (r) return r.filter(x => !seen.has(x)).forEach(x => { seen.add(x); selectorExpr(x); });
  }
  const lits = isText(n) ? [n] : ts.isTemplateExpression(n) ? [n.head, ...n.templateSpans.map(s => s.literal)] : null;
  if (!lits) return note('SIN RESOLVER', ...where(n), 'selector ' + n.getText() + '   ← en ' + n.parent.getText());
  for (const l of lits) {
    const [a, raw] = rawOf(l);
    for (const m of raw.replace(/\[[^\]]*\]/g, s => ' '.repeat(s.length)).matchAll(CLASS)) renameToken(fileOf(l), a + m.index + 1, a + m.index + m[0].length, m[1]);
  }
}
for (const sf of asts.values())
  (function visit(n) {
    if (ts.isTemplateExpression(n)) scanSequence([n.head, ...n.templateSpans.flatMap(s => [s.expression, s.literal])]);
    else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken && !(ts.isBinaryExpression(n.parent) && n.parent.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
      const ops = addends(n);
      if (ops.some(isText)) scanSequence(ops);
    } else if (isText(n) && !(ts.isBinaryExpression(n.parent) && n.parent.operatorToken.kind === ts.SyntaxKind.PlusToken)) scanSequence([n]);
    if (ts.isCallExpression(n)) {
      const f = n.expression, name = ts.isPropertyAccessExpression(f) ? f.name.text : ts.isIdentifier(f) ? f.text : '';
      if (ts.isPropertyAccessExpression(f) && ts.isPropertyAccessExpression(f.expression) && f.expression.name.text === 'classList' && ['add', 'remove', 'toggle', 'contains', 'replace'].includes(name))
        n.arguments.slice(0, name === 'toggle' ? 1 : name === 'replace' ? 2 : n.arguments.length).forEach(classExpr);
      else if (['querySelector', 'querySelectorAll', 'closest', 'matches'].includes(name) && n.arguments.length) selectorExpr(n.arguments[0]);
      else if (name === 'setAttribute' && n.arguments.length === 2 && isText(n.arguments[0]) && n.arguments[0].text === 'class') classExpr(n.arguments[1]);
    }
    if (ts.isPropertyAccessExpression(n) && n.name.text === 'className') {
      const p = n.parent;
      if (ts.isBinaryExpression(p) && p.left === n && [ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken].includes(p.operatorToken.kind)) classExpr(p.right);
      else note('SIN RESOLVER', ...where(n), 'className se lee: ' + p.getText());
    }
    ts.forEachChild(n, visit);
  })(sf);
/* Lo que queda: el nombre viejo escrito en un texto, fuera de lo ya mirado. Si va como «.nombre» donde empieza un selector
   ('#sh .sp', guardado en una constante o en un dato), se renombra y se apunta (SELECTOR), para verlo; si no, QUEDA. */
const names = [...MAP.keys()].map(k => k.replace(/-/g, '\\-')).join('|');
const TAGS = 'html|body|nav|div|span|button|label|input|small|svg|section|details|summary|select|textarea|img|ul|li|h[1-6]|path|circle';
const LOOSE = MAP.size && new RegExp('(?<=(?:^|[\\s(,>+~]|\\b(?:' + TAGS + ')|[.#][\\w-]+|\\])\\.)(' + names + ')(?![\\p{L}\\p{N}_-])', 'gu');
const OLD = MAP.size && new RegExp('(?<![\\p{L}\\p{N}_-])(' + names + ')(?![\\p{L}\\p{N}_-])', 'gu');
if (MAP.size)
  for (const [f, sf] of asts)
    (function visit(n) {
      if (isText(n) || n.kind === ts.SyntaxKind.TemplateHead || n.kind === ts.SyntaxKind.TemplateMiddle || n.kind === ts.SyntaxKind.TemplateTail) {
        const [a, raw] = rawOf(n), free = p => !visited.get(f).some(([x, y]) => p >= x && p < y);
        for (const m of raw.matchAll(LOOSE))
          if (free(a + m.index)) { note('SELECTOR', rel(f), lineOf(sf.text, a + m.index), raw.slice(Math.max(0, m.index - 40), m.index + 40)); renameToken(f, a + m.index, a + m.index + m[0].length, m[0]); }
        for (const m of raw.matchAll(OLD)) {
          const p = a + m.index, before = raw.slice(0, m.index), next = raw[m.index + m[0].length] || '';
          if (!free(p)) continue;
          // no es una clase: el nombre de una etiqueta (<th>), un id (#rs, id="rs"), el de un atributo (r="3"), una entidad (&gt;)…
          if (/[<\/&#]$/.test(before) || /\b(?:id|for|name|type|data-[\w-]+)=\\?["']$/.test(before) || next === '=' || /[\w)\]]\.$/.test(before)) continue;
          note('QUEDA', rel(f), lineOf(sf.text, p), m[0] + ' en ' + raw.slice(Math.max(0, m.index - 50), m.index + 60));
        }
      }
      ts.forEachChild(n, visit);
    })(sf);

/* ── --check: toda clase que el código pone o busca está en el CSS ─────────────────────────────────────────────────────
   Avisa de un nombre mal escrito y de uno viejo que vuelve (al fusionar una rama de antes de renombrarlo): en los dos casos
   el elemento se quedaría sin estilo, o el código sin encontrarlo, y nada más lo diría. */
// clases sin estilo propio: el código las pone para encontrar el elemento (el recorrido, las pruebas)
const HOOKS = ['exchips', 'news', 'nwk', 'pgc', 'pgm', 'trp', 'trs', 'update'];
if (CHECK) {
  let bad = 0;
  for (const [f, ranges] of visited)
    for (const [a, b] of ranges) {
      const c = sources.get(f).slice(a, b);
      if (!/^-?[_a-zA-Z][\w-]*$/.test(c) || cssClasses.has(c) || HOOKS.includes(c) || partial.has(f + ':' + a)) continue;
      bad++;
      console.error(`${rel(f)}:${lineOf(sources.get(f), a)}: la clase «${c}» no está en src/css${ALL.has(c) ? ' (se renombró: ' + path.relative(ROOT, path.resolve(mapFile)) + ')' : ''}`);
    }
  if (bad) { console.error(`\n${bad} clases que no existen: mal escritas, o renombradas (docs/tecnica/clases.md)`); process.exit(1); }
  console.log(`Clases correctas: las ${new Set([...visited].flatMap(([f, r]) => r.map(([a, b]) => sources.get(f).slice(a, b)))).size} que usa el código están en src/css`);
  process.exit(0);
}

/* ── pruebas y documentación: por texto ─────────────────────────────────────────────────────────────────────────────
   Un «.nombre» se toma por selector si el selector del que forma parte (button.pr, .cd.on, #sh .sp) empieza tras una comilla,
   un espacio o un signo de selector; pegado a un nombre cualquiera (e.ok, o.dataset.ph) es código y se deja, apuntado como
   QUEDA. */
function renameText(text, file, kind) {
  if (!MAP.size) return text;
  const sub = c => (tally(c, kind), MAP.get(c));
  // en la documentación, solo dentro de `código`: fuera, «.md» es un archivo y «.st» una abreviatura
  if (kind === 'docs') return text.replace(/`[^`\n]+`/g, code => code.replace(new RegExp('(?<![\\p{L}\\p{N}_-])\\.(' + names + ')(?![\\p{L}\\p{N}_-])', 'gu'), (all, c) => '.' + sub(c)));
  // class="…" (también class=\"…\")
  text = text.replace(/(\bclass=\\?["'])([^"'\\]*)/g, (all, pre, val) => pre + val.replace(/[^\s${}]+/g, t => MAP.has(t) ? sub(t) : t));
  // classList.x('nombre')
  text = text.replace(new RegExp('(classList\\.(?:add|remove|toggle|contains)\\(\\s*\\\\?[\'"])(' + names + ')(?=\\\\?[\'"])', 'g'), (all, pre, c) => pre + sub(c));
  // .nombre en un selector: el selector entero (button.pr, .cd.on, #sh .sp[data-i]) tiene que empezar donde empieza un texto
  const compound = new RegExp('(?<=^|[\\s\'"`(,>+~}])(?:' + TAGS + ')?[#.][\\w-]+(?:[#.][\\w-]+|\\[[\\w-]+(?:[~|^$*]?=[^\\]\\n]*)?\\]|:[\\w-]+)*(?!\\s*[(=])', 'gm');
  const part = new RegExp('\\[[^\\]]*\\]|\\.(' + names + ')(?![\\p{L}\\p{N}_-])', 'gu');
  text = text.replace(compound, all => all.replace(part, (x, c) => c ? '.' + sub(c) : x));
  for (const m of text.matchAll(new RegExp('(?<![\\p{L}\\p{N}_-])\\.(' + names + ')(?![\\p{L}\\p{N}_-])|[\'"](' + names + ')[\'"]', 'gu')))
    note('QUEDA', rel(file), lineOf(text, m.index), m[0] + ' en ' + text.slice(Math.max(0, m.index - 60), m.index + 50));
  return text;
}

/* ── escribir y contar ──────────────────────────────────────────────────────────────────────────────────────────── */
const write = (f, text, before) => { if (text !== before && !DRY) fs.writeFileSync(f, text); return text !== before; };
let changed = 0;
for (const f of cssFiles) { const t = fs.readFileSync(f, 'utf8'); changed += write(f, renameCss(t), t); }
for (const f of jsFiles) {
  let code = sources.get(f);
  for (const [a, [b, text]] of [...edits.get(f)].sort((x, y) => y[0] - x[0])) code = code.slice(0, a) + text + code.slice(b);
  changed += write(f, code, sources.get(f));
}
const textFiles = [...walk(path.join(ROOT, 'tests'), n => /\.(py|mjs|js|sh)$/.test(n)).map(f => [f, 'tests']), ...walk(path.join(ROOT, 'docs'), n => n.endsWith('.md')).map(f => [f, 'docs'])];
// no se tocan: el propio mapa, los nombres de la V1.0.2 y las pruebas de las herramientas, cuyas clases son de juguete
const SKIP = ['tests/templates.test.mjs', 'tests/classes.test.mjs', 'docs/tecnica/nombres.md', 'tests/nombres-1.0.2.txt'];
for (const [f, kind] of textFiles) {
  if (path.resolve(f) === path.resolve(mapFile) || SKIP.includes(rel(f).split(path.sep).join('/'))) continue;
  const t = fs.readFileSync(f, 'utf8');
  changed += write(f, renameText(t, f, kind), t);
}
const used = new Set();
for (const [f, ranges] of visited) for (const [a, b] of ranges) used.add(sources.get(f).slice(a, b));
const bare = [...used].filter(c => /^-?[_a-zA-Z][\w-]*$/.test(c) && !cssClasses.has(c)).sort();
if (bare.length) console.log(`\n── clases que usa el código y no están en el CSS (${bare.length}): ` + bare.join(' '));
for (const n of MAP.values()) if (used.has(n)) { console.error(`«${n}» ya lo usa el código como clase`); process.exitCode = 1; }
const kinds = ['TABLA', 'SELECTOR', 'A TROZOS', 'SIN RESOLVER', 'QUEDA'];
for (const k of kinds) { const l = notes.filter(n => n.startsWith(k)); if (l.length) console.log(`\n── ${k} (${l.length})\n` + l.join('\n')); }
console.log('\n── clases renombradas (css / js / pruebas / docs)');
for (const [o, n] of MAP) { const c = count[o] || { css: 0, js: 0, tests: 0, docs: 0 }; console.log(`${o} → ${n}: ${c.css} / ${c.js} / ${c.tests} / ${c.docs}${c.js ? '' : '   ← NO SE USA EN EL CÓDIGO (o llega por un camino sin resolver)'}`); }
console.log(`\n${MAP.size} clases · ${changed} archivos ${DRY ? 'cambiarían' : 'cambiados'}`);
