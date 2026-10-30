#!/usr/bin/env node
/* StrataFit · ¿es el mismo programa? Compara dos versiones de código JS ignorando formato:
   mismo árbol sintáctico (sin posiciones ni comillas; «const a,b» cuenta igual que «const a; const b») y mismos comentarios.
   Uso:  node tools/same.js antes.js despues.js
         node tools/same.js --dirs carpeta_antes carpeta_despues   (todos los .js con la misma ruta relativa)
   Opcional: --map renombres.json  ({"viejo":"nuevo"}) para aceptar identificadores renombrados. */
const fs = require('fs'), path = require('path');
function req(n) {
  for (const c of [n, path.join(__dirname, '../node_modules', n), '/opt/npm-tools/node_modules/' + n]) { try { return require(c); } catch (e) {} }
  console.error('falta el paquete ' + n); process.exit(2);
}
const acorn = req('acorn');
let MAP = null;
function norm(node) {
  if (Array.isArray(node)) return node.map(norm);
  if (!node || typeof node !== 'object') return node;
  const o = {};
  for (const k of Object.keys(node)) {
    if (k === 'start' || k === 'end' || k === 'loc' || k === 'range' || k === 'raw') continue;
    o[k] = norm(node[k]);
  }
  if (o.type === 'TemplateElement') o.value = { raw: node.value.raw, cooked: node.value.cooked };
  if (o.type === 'Identifier' && MAP && Object.prototype.hasOwnProperty.call(MAP, o.name)) o.name = MAP[o.name];
  for (const key of ['body', 'consequent']) {
    if (Array.isArray(o[key])) {
      const out = [];
      o[key].forEach(st => {
        if (st && st.type === 'VariableDeclaration' && st.declarations.length > 1) st.declarations.forEach(d => out.push({ type: 'VariableDeclaration', kind: st.kind, declarations: [d] }));
        else out.push(st);
      });
      o[key] = out;
    }
  }
  return o;
}
function parse(code) {
  const comments = [];
  const ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module', onComment: (block, text) => comments.push((block ? 'B:' : 'L:') + text.replace(/\s+/g, ' ').trim()) });
  return { ast: norm(ast), comments: comments.sort() };
}
function diffPath(a, b, p) {
  if (typeof a !== typeof b) return p;
  if (a && typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return p;
    const ks = new Set(Object.keys(a).concat(Object.keys(b)));
    for (const k of ks) { const r = diffPath(a[k], b[k], p + '.' + k); if (r) return r; }
    return null;
  }
  return a === b ? null : p + ' (' + JSON.stringify(a).slice(0, 60) + ' ≠ ' + JSON.stringify(b).slice(0, 60) + ')';
}
function same(fa, fb) {
  const A = parse(fs.readFileSync(fa, 'utf8')), B = parse(fs.readFileSync(fb, 'utf8'));
  const d = diffPath(A.ast, B.ast, '');
  if (d) return 'código distinto en ' + d;
  if (JSON.stringify(A.comments) !== JSON.stringify(B.comments)) {
    const sa = new Set(A.comments), sb = new Set(B.comments);
    return 'comentarios distintos: faltan ' + JSON.stringify(A.comments.filter(c => !sb.has(c)).slice(0, 3)) + ' sobran ' + JSON.stringify(B.comments.filter(c => !sa.has(c)).slice(0, 3));
  }
  return null;
}
const args = process.argv.slice(2);
const mi = args.indexOf('--map');
if (mi >= 0) { MAP = JSON.parse(fs.readFileSync(args[mi + 1], 'utf8')); args.splice(mi, 2); }
let bad = 0, n = 0;
if (args[0] === '--dirs') {
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
  walk(args[1]).forEach(fa => { const rel = path.relative(args[1], fa), fb = path.join(args[2], rel); n++; const r = fs.existsSync(fb) ? same(fa, fb) : 'no existe en la segunda carpeta'; if (r) { bad++; console.log('DISTINTO', rel, '·', r); } });
} else { n = 1; const r = same(args[0], args[1]); if (r) { bad++; console.log('DISTINTO ·', r); } }
console.log(bad ? bad + ' de ' + n + ' archivos distintos' : n + ' archivos equivalentes');
process.exit(bad ? 1 : 0);
