#!/usr/bin/env node
/* StrataFit · comprobaciones estáticas del código (necesita node y el paquete "typescript")
   Uso:  node tools/check.js            (desde la raíz del repo)
         TS_PATH=/ruta/a/typescript node tools/check.js
   Los módulos son módulos ES; para analizarlos se unen, sin import/export, en el orden en que se ejecutan al cargar
   (el de los import desde src/js/main.js), como si fueran un solo programa.
   Qué comprueba (cualquier fallo devuelve código de salida 1):
     1. Sintaxis de todos los módulos.
     2. Declaraciones de nivel superior repetidas entre módulos (los nombres son únicos en toda la app).
     3. Identificadores sin declarar (typos, módulos que faltan) — salvo los globales del navegador.
     4. Orden de carga: lo que se ejecuta al cargar no puede usar const/let que aún no se han ejecutado.
     5. Registros A / C / U / IC con la misma clave definida dos veces (una pisaría a la otra).
     6. Acciones data-a / data-c / data-u escritas en el HTML generado que no existen en su registro.
     7. main.js importa core/util el primero y core/boot el último.
     8. Ninguna función se reasigna después de declararla (parches encadenados).
     9. Importaciones: cada nombre de otro módulo se importa de su módulo, que lo exporta; sin importaciones sin usar
        ni asignaciones a variables importadas (para eso, el setter que exporta su módulo).
*/
const fs = require('fs'), path = require('path');
function loadTS() {
  const cands = [process.env.TS_PATH, 'typescript', path.join(__dirname, '../node_modules/typescript')].filter(Boolean);
  for (const c of cands) { try { return require(c); } catch (e) {} }
  console.error('No se encuentra el paquete "typescript" (npm install, o TS_PATH=/ruta). Comprobación omitida.');
  process.exit(2);
}
const ts = loadTS();
const { ROOT, JS, modules } = require('./modules');
const GLOBALS = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'globals.json'), 'utf8')));
// APIs que la app usa solo si el navegador las ofrece (detección de funciones): no existen en todos los navegadores
['BarcodeDetector', 'webkitAudioContext', 'webkitSpeechRecognition'].forEach(n => GLOBALS.add(n));
const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);

// ---- módulos, sus importaciones y el orden en que se ejecutan
const listed = modules();
if (listed[listed.length - 1] !== 'core/boot.js') err('core/boot.js debe ser el último import de main.js');
if (listed[0] !== 'core/util.js') err('core/util.js debe ser el primer import de main.js');
const src = {}, parsed = {}, deps = {}, lazy = {};
const resolve = (from, spec) => path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
const load = m => {
  if (src[m] != null) return;
  src[m] = fs.readFileSync(path.join(JS, m), 'utf8');
  parsed[m] = ts.createSourceFile(m, src[m], ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  deps[m] = [];
  lazy[m] = [];
  // import('…') con texto fijo: módulos que se cargan al usarlos (core/lazy)
  (function w(n) {
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) lazy[m].push(resolve(m, n.arguments[0].text));
    ts.forEachChild(n, w);
  })(parsed[m]);
  for (const s of parsed[m].statements) {
    if (!ts.isImportDeclaration(s)) continue;
    const to = resolve(m, s.moduleSpecifier.text), names = [];
    const nb = s.importClause && s.importClause.namedBindings;
    if (s.importClause && (s.importClause.name || (nb && !ts.isNamedImports(nb)))) err(m + ': solo se usan importaciones con nombre (import { a } from …)');
    if (nb && ts.isNamedImports(nb)) nb.elements.forEach(e => { if (e.propertyName) err(m + ': sin renombrar al importar (' + e.getText(parsed[m]) + ')'); names.push(e.name.text); });
    if (!fs.existsSync(path.join(JS, to))) err(m + ': importa un módulo que no existe: ' + s.moduleSpecifier.text);
    deps[m].push({ to, names, node: s });
  }
  for (const d of deps[m]) if (fs.existsSync(path.join(JS, d.to))) load(d.to);
  for (const l of lazy[m]) if (fs.existsSync(path.join(JS, l))) load(l); else err(m + ': carga un módulo que no existe: ' + l);
};
['main.js'].concat(listed).forEach(load);
// orden de ejecución: primero lo que importa main.js (en profundidad, como los módulos ES); después, lo que se carga al usarlo
const order = [], state = {};
const visit = m => {
  state[m] = 1;
  for (const d of deps[m] || []) if (!state[d.to] && src[d.to] != null) visit(d.to);
  state[m] = 2;
  if (m !== 'main.js') order.push(m);
};
visit('main.js');
const lazyMods = [...new Set(Object.values(lazy).flat())];
const staticMods = new Set(order);
for (const l of lazyMods) {
  if (staticMods.has(l)) err(l + ' se carga al usarlo (import()) pero algún módulo lo importa al arrancar: iría en el código del arranque');
  else if (!state[l]) visit(l);
}
const mods = order;
for (const m of listed) if (!order.includes(m)) err('main.js no llega a ' + m);
for (const f of (function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(JS, path.join(d, e.name)).split(path.sep).join('/')]); })(JS))
  if (f.endsWith('.js') && f !== 'main.js' && !order.includes(f)) err('módulo que no se usa (ni main.js lo importa ni se carga con import()): ' + f);

// ---- texto único sin import/export (las posiciones se conservan: se sustituyen por espacios) y mapa posición → módulo
const blank = s => s.replace(/[^\n]/g, ' ');
let code = '', ranges = [];
mods.forEach(m => {
  let t = src[m];
  const sfm = parsed[m], cuts = [];
  for (const s of sfm.statements) {
    if (ts.isImportDeclaration(s)) cuts.push([s.getStart(sfm), s.getEnd()]);
    else if (s.modifiers && s.modifiers.some(x => x.kind === ts.SyntaxKind.ExportKeyword)) { const x = s.modifiers.find(x => x.kind === ts.SyntaxKind.ExportKeyword); cuts.push([x.getStart(sfm), x.getEnd()]); }
    else if (ts.isExportDeclaration(s) || ts.isExportAssignment(s)) err(m + ': exporta con export { … } o export default; usa «export» delante de la declaración');
  }
  cuts.sort((a, b) => b[0] - a[0]).forEach(([a, b]) => { t = t.slice(0, a) + blank(t.slice(a, b)) + t.slice(b); });
  t = t.replace(/\n+$/, '');
  ranges.push({ m, start: code.length, end: code.length + t.length, line0: code.split('\n').length - 1 });
  code += t + '\n';
});
const where = pos => {
  const r = ranges.find(r => pos >= r.start && pos <= r.end) || ranges[ranges.length - 1];
  const before = code.slice(r.start, pos).split('\n').length;
  return r.m + ':' + before;
};
const modOf = pos => (ranges.find(r => pos >= r.start && pos <= r.end) || {}).m;

const FILE = path.join(ROOT, '__bundle__.js');
const host = ts.createCompilerHost({ allowJs: true });
const sfOrig = host.getSourceFile.bind(host);
host.getSourceFile = (f, ...a) => f === FILE ? ts.createSourceFile(f, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS) : sfOrig(f, ...a);
host.fileExists = f => f === FILE || ts.sys.fileExists(f);
host.readFile = f => f === FILE ? code : ts.sys.readFile(f);
const prog = ts.createProgram([FILE], { allowJs: true, checkJs: false, noLib: true, noResolve: true, target: ts.ScriptTarget.ES2022, types: [] }, host);
const checker = prog.getTypeChecker();
const sf = prog.getSourceFile(FILE);

// 1. sintaxis
prog.getSyntacticDiagnostics(sf).forEach(d => err('sintaxis: ' + ts.flattenDiagnosticMessageText(d.messageText, '\n') + ' @ ' + where(d.start)));

const S = sf.statements;
// declaraciones globales
const declAt = new Map();
function isGlobalDecl(d) {
  if (ts.isFunctionDeclaration(d)) return d.parent === sf;
  if (ts.isVariableDeclaration(d)) { const st = d.parent && d.parent.parent; return !!st && ts.isVariableStatement(st) && st.parent === sf; }
  return false;
}
S.forEach((s, i) => {
  const add = (n, kind) => {
    if (declAt.has(n)) err('declaración global duplicada: ' + n + ' (' + modOf(declAt.get(n).pos) + ' y ' + modOf(s.getStart(sf)) + ')');
    else declAt.set(n, { i, kind, pos: s.getStart(sf) });
  };
  if (ts.isFunctionDeclaration(s) && s.name) add(s.name.text, 'fn');
  else if (ts.isVariableStatement(s)) s.declarationList.declarations.forEach(d => {
    const k = (s.declarationList.flags & ts.NodeFlags.Const) ? 'const' : (s.declarationList.flags & ts.NodeFlags.Let) ? 'let' : 'var';
    const names = [];
    (function collect(b) { if (ts.isIdentifier(b)) names.push(b.text); else if (b.elements) b.elements.forEach(e => e.name && collect(e.name)); })(d.name);
    names.forEach(n => add(n, k));
  });
});
const isGlobal = n => {
  const sym = checker.getSymbolAtLocation(n); if (!sym) return false;
  return (sym.declarations || []).some(isGlobalDecl);
};
const isRef0 = n => {
  const p = n.parent;
  return !((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || (ts.isMethodDeclaration(p) && p.name === n) ||
    (ts.isBindingElement(p) && p.propertyName === n) || (ts.isFunctionDeclaration(p) && p.name === n) || (ts.isVariableDeclaration(p) && p.name === n) ||
    (ts.isLabeledStatement(p) && p.label === n) || ((ts.isBreakStatement(p) || ts.isContinueStatement(p)) && p.label === n) ||
    (ts.isPropertySignature && ts.isGetAccessor(p) && p.name === n) || (ts.isParameter(p) && p.name === n));
};

// 3. identificadores sin declarar
const seenUnres = new Set();
(function walkAll(n) {
  if (ts.isIdentifier(n) && isRef0(n)) {
    const sym = checker.getSymbolAtLocation(n);
    if (!sym && !GLOBALS.has(n.text) && !seenUnres.has(n.text + '@' + modOf(n.getStart(sf)))) {
      seenUnres.add(n.text + '@' + modOf(n.getStart(sf)));
      err('identificador sin declarar: ' + n.text + ' @ ' + where(n.getStart(sf)));
    }
  }
  ts.forEachChild(n, walkAll);
})(sf);

// 4. orden de carga
const ARRAY_CB = new Set(['forEach', 'map', 'filter', 'some', 'every', 'reduce', 'find', 'findIndex', 'flatMap', 'sort']);
const runsNow = fn => {
  const p = fn.parent; if (!p) return false;
  if (ts.isCallExpression(p) && p.expression === fn) return true;
  if (ts.isParenthesizedExpression(p)) { const q = p.parent; if (ts.isCallExpression(q) && q.expression === p) return true; }
  if (ts.isCallExpression(p) && p.arguments.includes(fn) && ts.isPropertyAccessExpression(p.expression) && ARRAY_CB.has(p.expression.name.text)) return true;
  return false;
};
const loadRefs = S.map(() => new Set()), allRefs = S.map(() => new Set()), loadCalls = S.map(() => new Set());
S.forEach((s, i) => (function w(n, d) {
  let dd = d; if (ts.isFunctionLike(n) && !runsNow(n)) dd++;
  if (ts.isIdentifier(n) && isRef0(n) && isGlobal(n)) { allRefs[i].add(n.text); if (dd === 0) loadRefs[i].add(n.text); }
  if (dd === 0 && ts.isCallExpression(n) && ts.isIdentifier(n.expression) && isGlobal(n.expression)) loadCalls[i].add(n.expression.text);
  ts.forEachChild(n, c => w(c, dd));
})(s, 0));
const bodyIdx = new Map();
S.forEach((s, i) => {
  if (ts.isFunctionDeclaration(s) && s.name) bodyIdx.set(s.name.text, i);
  else if (ts.isVariableStatement(s)) s.declarationList.declarations.forEach(d => {
    if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) bodyIdx.set(d.name.text, i);
  });
});
const trans = (name, seen = new Set()) => {
  if (seen.has(name)) return seen; seen.add(name);
  const i = bodyIdx.get(name); if (i === undefined) return seen;
  for (const r of allRefs[i]) if (bodyIdx.has(r)) trans(r, seen);
  return seen;
};
S.forEach((s, v) => {
  const need = new Map();
  for (const n of loadRefs[v]) need.set(n, '');
  for (const c of loadCalls[v]) if (bodyIdx.has(c)) for (const f of trans(c)) for (const r of allRefs[bodyIdx.get(f)]) if (!need.has(r)) need.set(r, ' (a través de ' + f + '())');
  for (const [n, via] of need) {
    const d = declAt.get(n);
    if (d && d.kind !== 'fn' && d.i > v) err('orden de carga: ' + where(s.getStart(sf)) + ' usa "' + n + '"' + via + ' al cargar, pero se declara después en ' + modOf(d.pos));
  }
});

// 5-6. registros
const reg = { A: new Map(), C: new Map(), U: new Map(), IC: new Map() };
const addKey = (r, k, pos) => { if (reg[r].has(k)) err('clave duplicada ' + r + '.' + k + ' (' + where(reg[r].get(k)) + ' y ' + where(pos) + ')'); else reg[r].set(k, pos); };
S.forEach(s => {
  if (ts.isVariableStatement(s)) s.declarationList.declarations.forEach(d => {
    if (ts.isIdentifier(d.name) && reg[d.name.text] && d.initializer && ts.isObjectLiteralExpression(d.initializer))
      d.initializer.properties.forEach(p => { if (p.name) addKey(d.name.text, p.name.getText(sf).replace(/^['"]|['"]$/g, ''), p.getStart(sf)); });
  });
  if (ts.isExpressionStatement(s)) {
    // A.x=…; A.y=…;  (puede haber varias en una sola sentencia con ;) — se recorre cualquier asignación al nivel superior
    const e = s.expression;
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(e.left) && ts.isIdentifier(e.left.expression) && reg[e.left.expression.text])
      addKey(e.left.expression.text, e.left.name.text, s.getStart(sf));
  }
});
// acciones referenciadas en el HTML generado
const refs = { a: new Set(), c: new Set(), u: new Set() };
const textOfLiterals = [];
(function w(n) {
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) textOfLiterals.push([n.text, n.getStart(sf)]);
  else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) textOfLiterals.push([n.text, n.getStart(sf)]);
  ts.forEachChild(n, w);
})(sf);
const missing = new Map();
for (const [t, pos] of textOfLiterals) {
  const re = /data-([acu])=\\?["']([A-Za-z0-9_]+)\\?["']/g; let m;
  while ((m = re.exec(t))) {
    const r = { a: 'A', c: 'C', u: 'U' }[m[1]];
    if (!reg[r].has(m[2]) && !missing.has(r + '.' + m[2])) missing.set(r + '.' + m[2], pos);
  }
}
for (const [k, pos] of missing) err('data-' + k[0].toLowerCase() + '="' + k.slice(2) + '" no tiene manejador ' + k + ' @ ' + where(pos));

// 8. parches encadenados: reasignar una función ya declarada (p. ej.  const x=R;R=()=>{x();…})  oculta código y depende del orden de carga
(function w(n) {
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left) && isGlobal(n.left)) {
    const d = declAt.get(n.left.text);
    if (d && d.kind === 'fn') err('se reasigna la función ' + n.left.text + '() @ ' + where(n.getStart(sf)) + ' — integra el cambio en su declaración');
  }
  ts.forEachChild(n, w);
})(sf);

// 9. importaciones: lo que un módulo usa de otro está importado de ese módulo, que lo exporta; nada importado sin usar
const exportsOf = {};
for (const m of mods) {
  exportsOf[m] = new Set();
  for (const s of parsed[m].statements) {
    if (!(s.modifiers && s.modifiers.some(x => x.kind === ts.SyntaxKind.ExportKeyword))) continue;
    if (ts.isFunctionDeclaration(s) && s.name) exportsOf[m].add(s.name.text);
    else if (ts.isVariableStatement(s)) s.declarationList.declarations.forEach(d => (function c(b) { if (ts.isIdentifier(b)) exportsOf[m].add(b.text); else if (b.elements) b.elements.forEach(e => e.name && c(e.name)); })(d.name));
  }
}
const imported = {};
for (const m of mods) {
  imported[m] = new Map();
  for (const d of deps[m]) for (const n of d.names) {
    if (!exportsOf[d.to] || !exportsOf[d.to].has(n)) err(m + ': importa «' + n + '» de ' + d.to + ', que no lo exporta');
    imported[m].set(n, d.to);
  }
}
const usedFrom = Object.fromEntries(mods.map(m => [m, new Set()]));
(function w(n) {
  if (ts.isIdentifier(n) && isRef0(n) && isGlobal(n)) {
    const me = modOf(n.getStart(sf)), d = declAt.get(n.text), owner = d && modOf(d.pos);
    if (owner && owner !== me) {
      usedFrom[me].add(n.text);
      if (imported[me].get(n.text) !== owner) err(me + ' usa «' + n.text + '» de ' + owner + ' sin importarlo @ ' + where(n.getStart(sf)));
      const p = n.parent;
      if ((ts.isBinaryExpression(p) && p.left === n && p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && p.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
          ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && (p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken)))
        err(me + ' asigna «' + n.text + '», importado de ' + owner + ' (usa el setter que exporte su módulo) @ ' + where(n.getStart(sf)));
    }
  }
  ts.forEachChild(n, w);
})(sf);
for (const m of mods) for (const [n, from] of imported[m]) if (!usedFrom[m].has(n)) err(m + ': importa «' + n + '» de ' + from + ' y no lo usa');

// ---- resultado
warns.forEach(w => console.log('aviso:', w));
errors.forEach(e => console.log('ERROR:', e));
console.log(`\n${mods.length} módulos · ${S.length} sentencias · ${declAt.size} globales · ${reg.A.size} acciones, ${reg.C.size} cambios, ${reg.U.size} entradas, ${reg.IC.size} iconos`);
if (errors.length) { console.log(errors.length + ' error(es)'); process.exit(1); }
console.log('Comprobaciones estáticas correctas');
