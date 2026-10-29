#!/usr/bin/env node
/* StrataFit · comprobaciones estáticas del código (necesita node y el paquete "typescript")
   Uso:  node tools/check.js            (desde la raíz del repo)
         TS_PATH=/ruta/a/typescript node tools/check.js
   Qué comprueba (cualquier fallo devuelve código de salida 1):
     1. Sintaxis de todos los módulos.
     2. Declaraciones globales duplicadas entre módulos.
     3. Identificadores sin declarar (typos, módulos que faltan) — salvo los globales del navegador.
     4. Orden de carga: una sentencia que se ejecuta al cargar no puede usar const/let declarados después.
     5. Registros A / C / U / IC con la misma clave definida dos veces (una pisaría a la otra).
     6. Acciones data-a / data-c / data-u escritas en el HTML generado que no existen en su registro.
     7. core/boot es el último módulo y core/util el primero.
     8. Ninguna función se reasigna después de declararla (parches encadenados).
*/
const fs = require('fs'), path = require('path');
function loadTS() {
  const cands = [process.env.TS_PATH, 'typescript', path.join(__dirname, '../node_modules/typescript'), '/opt/npm-tools/node_modules/typescript'].filter(Boolean);
  for (const c of cands) { try { return require(c); } catch (e) {} }
  console.error('No se encuentra el paquete "typescript" (npm i typescript, o TS_PATH=/ruta). Comprobación omitida.');
  process.exit(2);
}
const ts = loadTS();
const ROOT = path.join(__dirname, '..');
const JS = path.join(ROOT, 'src/js');
const mods = fs.readFileSync(path.join(JS, 'modules.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && s[0] !== '#');
const GLOBALS = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'globals.json'), 'utf8')));
// APIs que la app usa solo si el navegador las ofrece (detección de funciones): no existen en todos los navegadores
['BarcodeDetector', 'webkitAudioContext', 'webkitSpeechRecognition'].forEach(n => GLOBALS.add(n));
const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);

// ---- texto único (igual que build.py) y mapa posición → módulo
let code = '', ranges = [];
mods.forEach(m => {
  const t = fs.readFileSync(path.join(JS, m), 'utf8').replace(/\n+$/, '');
  ranges.push({ m, start: code.length, end: code.length + t.length, line0: code.split('\n').length - 1 });
  code += t + '\n';
});
if (mods[mods.length - 1] !== 'core/boot.js') err('core/boot.js debe ser el último módulo');
if (mods[0] !== 'core/util.js') err('core/util.js debe ser el primero');
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

// ---- resultado
warns.forEach(w => console.log('aviso:', w));
errors.forEach(e => console.log('ERROR:', e));
console.log(`\n${mods.length} módulos · ${S.length} sentencias · ${declAt.size} globales · ${reg.A.size} acciones, ${reg.C.size} cambios, ${reg.U.size} entradas, ${reg.IC.size} iconos`);
if (errors.length) { console.log(errors.length + ' error(es)'); process.exit(1); }
console.log('Comprobaciones estáticas correctas');
