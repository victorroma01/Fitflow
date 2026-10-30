#!/usr/bin/env node
/* StrataFit · formateador de módulos (sin dependencias externas salvo typescript)
   Reimprime cada módulo de src/js con una instrucción por línea y bloques sangrados, conservando comentarios,
   comillas y literales. Divide «const a=…,b=…;» en una declaración por línea.
   Uso:  node tools/format.js            (formatea main.js y todos los módulos que importa)
         node tools/format.js --check    (falla si alguno no está formateado)
         node tools/format.js archivo.js (solo ese)
   Después de formatear, tools/same.js comprueba que el código es equivalente al anterior. */
const fs = require('fs'), path = require('path');
function loadTS() {
  const cands = [process.env.TS_PATH, 'typescript', path.join(__dirname, '../node_modules/typescript'), '/opt/npm-tools/node_modules/typescript'].filter(Boolean);
  for (const c of cands) { try { return require(c); } catch (e) {} }
  console.error('No se encuentra el paquete "typescript"'); process.exit(2);
}
const ts = loadTS();
const ROOT = path.join(__dirname, '..'), JS = path.join(ROOT, 'src/js');

function format(src, name) {
  const sf = ts.createSourceFile(name || 'm.js', src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const tr = ctx => {
    const f = ctx.factory;
    const visit = node => {
      if (ts.isBlock(node)) node.multiLine = true;
      if ((ts.isSourceFile(node) || ts.isBlock(node) || ts.isCaseClause(node) || ts.isDefaultClause(node))) {
        node = ts.visitEachChild(node, visit, ctx);
        const list = node.statements, out = [];
        let changed = false;
        list.forEach(st => {
          if (ts.isVariableStatement(st) && st.declarationList.declarations.length > 1) {
            changed = true;
            st.declarationList.declarations.forEach((d, i) => {
              const ns = f.createVariableStatement(st.modifiers, f.createVariableDeclarationList([d], st.declarationList.flags));
              ts.setTextRange(ns, i === 0 ? { pos: st.pos, end: d.end } : { pos: d.pos, end: d.end });
              if (i === 0) ts.setOriginalNode(ns, st);
              out.push(ns);
            });
          } else out.push(st);
        });
        if (!changed) return node;
        const arr = f.createNodeArray(out);
        if (ts.isSourceFile(node)) return f.updateSourceFile(node, arr);
        if (ts.isBlock(node)) { const b = f.updateBlock(node, arr); b.multiLine = true; return b; }
        if (ts.isCaseClause(node)) return f.updateCaseClause(node, node.expression, arr);
        return f.updateDefaultClause(node, arr);
      }
      return ts.visitEachChild(node, visit, ctx);
    };
    return n => visit(n);
  };
  const res = ts.transform(sf, [tr]);
  const printer = ts.createPrinter({ removeComments: false, newLine: ts.NewLineKind.LineFeed });
  let out = printer.printNode(ts.EmitHint.SourceFile, res.transformed[0], sf);
  res.dispose();
  // sangría de 2 espacios (el impresor usa 4) fuera de las plantillas `…` y de los comentarios /* … */ de varias líneas.
  // Las líneas de un comentario se mueven lo mismo que su primera línea: el impresor las desplaza según la sangría que
  // tenía el comentario, y si no se deshace, un comentario dentro de una función se movería a la derecha en cada pasada
  const lines = out.split('\n'), keep = templateLines(out), shift = new Map();
  const indent = l => /^ */.exec(l)[0].length;
  const to2 = l => l.replace(/^((?:    )+)/, m => '  '.repeat(m.length / 4));
  for (const [a, b] of commentBlocks(out)) {
    const d = indent(lines[a]) - indent(to2(lines[a]));
    for (let l = a + 1; l <= b; l++) {
      keep.add(l);
      shift.set(l, d);
    }
  }
  out = lines.map((l, i) => shift.has(i) ? l.slice(Math.min(shift.get(i), indent(l))) : keep.has(i) ? l : to2(l)).join('\n');
  // plantillas etiquetadas sin espacio entre la etiqueta y la plantilla: html`…` (el impresor pone «html `…`»)
  out = out.replace(/\bhtml `/g, 'html`');
  return out.replace(/\s+$/, '') + '\n';
}
// comentarios /* … */ de varias líneas: [primera línea, última línea] (el texto de las siguientes es libre). Se buscan con el
// analizador, no con el escáner suelto: así un «/*» dentro de una plantilla (accept="image/*") no cuenta
function commentBlocks(code) {
  const sf = ts.createSourceFile('x.js', code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS), out = [], seen = new Set();
  const lineOf = p => sf.getLineAndCharacterOfPosition(p).line;
  const add = (pos, end, kind) => {
    if (kind !== ts.SyntaxKind.MultiLineCommentTrivia || seen.has(pos)) return;
    seen.add(pos);
    if (lineOf(end) > lineOf(pos)) out.push([lineOf(pos), lineOf(end)]);
  };
  const visit = n => { ts.forEachLeadingCommentRange(code, n.pos, add); ts.forEachTrailingCommentRange(code, n.end, add); ts.forEachChild(n, visit); };
  visit(sf);
  ts.forEachLeadingCommentRange(code, sf.endOfFileToken.pos, add);
  return out;
}
// líneas que empiezan dentro del contenido de una plantilla de varias líneas (no se tocan)
function templateLines(code) {
  const sf = ts.createSourceFile('x.js', code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS), set = new Set();
  const lineOf = p => sf.getLineAndCharacterOfPosition(p).line;
  const visit = n => {
    if (n.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral || n.kind === ts.SyntaxKind.TemplateHead || n.kind === ts.SyntaxKind.TemplateMiddle || n.kind === ts.SyntaxKind.TemplateTail) {
      const a = lineOf(n.getStart(sf)), b = lineOf(n.end);
      for (let l = a + 1; l <= b; l++) set.add(l);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return set;
}
module.exports = { format };
if (require.main === module) {
  const args = process.argv.slice(2), check = args.includes('--check');
  let files = args.filter(a => !a.startsWith('--'));
  if (!files.length) files = ['main.js'].concat(require('./modules').allModules()).map(m => path.join(JS, m));
  let bad = 0;
  files.forEach(f => {
    const src = fs.readFileSync(f, 'utf8'), out = format(src, f);
    if (out !== src) { if (check) { bad++; console.log('sin formatear:', path.relative(ROOT, f)); } else fs.writeFileSync(f, out); }
  });
  if (check && bad) process.exit(1);
  if (!check) console.log('formateados', files.length, 'módulos');
}
