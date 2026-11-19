#!/usr/bin/env node
/* StrataFit · comprobador de tipos (con el paquete typescript, como tools/format.js y tools/check.js; no genera nada)
   El código sigue siendo JavaScript: los tipos van en comentarios JSDoc (@param, @returns, @type) y la forma de los datos, en
   src/types/*.d.ts. Esto pasa el comprobador de TypeScript por todos los módulos de src/js y falla si algo no cuadra: una
   clave de S que no existe, un valor de otro tipo, una función llamada con lo que no es, una propiedad mal escrita.
   Dos niveles (docs/tecnica/tipos.md):
     · básico, en todos los módulos: se comprueba todo lo que tiene tipo, declarado o deducido; lo que no lo tiene (un parámetro
       sin anotar) vale para cualquier cosa;
     · estricto, en los módulos de STRICT (el guardado y la sincronización): además, todo tiene que tener tipo y lo que puede
       ser null o undefined hay que mirarlo antes de usarlo.
   Uso:  node tools/types.js             (falla si hay algún aviso; enseña los 40 primeros)
         node tools/types.js --todo      (los enseña todos)
         node tools/types.js --resumen   (además, cuántos avisos daría el nivel estricto en cada módulo que aún no lo tiene) */
const fs = require('fs'), path = require('path');
function loadTS() {
  const cands = [process.env.TS_PATH, 'typescript', path.join(__dirname, '../node_modules/typescript'), '/opt/npm-tools/node_modules/typescript'].filter(Boolean);
  for (const c of cands) { try { return require(c); } catch (e) {} }
  console.error('No se encuentra el paquete "typescript"'); process.exit(2);
}
const ts = loadTS();
const ROOT = path.join(__dirname, '..'), JS = path.join(ROOT, 'src/js'), TYPES = path.join(ROOT, 'src/types');

/* los módulos con el nivel estricto. Para pasar otro: se añade aquí, se arregla lo que salga y se quita de «por pasar» en
   docs/tecnica/tipos.md (node tools/types.js --resumen dice cuánto le falta a cada uno) */
const STRICT = ['core/store.js', 'core/idb.js', 'core/parts.js', 'core/schema.js', 'cloud/merge.js', 'cloud/docs.js', 'core/state.js', 'cloud/sync.js', 'core/persist.js'];

const BASE = {
  allowJs: true, checkJs: true, noEmit: true, skipLibCheck: true, types: [],
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
  strict: false, noUnusedLocals: true, noImplicitReturns: true, noFallthroughCasesInSwitch: true, allowUnreachableCode: false, allowUnusedLabels: false
};

const walk = (dir, ext, out = []) => {
  for (const f of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
};
const files = walk(JS, '.js').concat(fs.existsSync(TYPES) ? walk(TYPES, '.d.ts') : []);
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const mod = f => path.relative(JS, f).split(path.sep).join('/');

/* el nodo más pequeño del archivo que ocupa justo ese trozo de texto */
const nodeAt = (sf, start, length) => {
  let found = null;
  const visit = n => {
    if (n.getStart(sf) <= start && n.getEnd() >= start + length) {
      if (n.getStart(sf) == start && n.getEnd() == start + length) found = n;
      ts.forEachChild(n, visit);
    }
  };
  visit(sf);
  return found;
};
/* Restar o comparar fechas es JavaScript corriente (da los milisegundos entre las dos), pero TypeScript solo admite números en
   una operación aritmética (TS2362 a la izquierda, TS2363 a la derecha). Cuando lo que hay en ese lado es una fecha, no se
   avisa; con cualquier otra cosa (un texto, un objeto), sí */
const dateArithmetic = (prog, d) => {
  if (d.code != 2362 && d.code != 2363) return false;
  const n = nodeAt(d.file, d.start, d.length);
  return !!n && prog.getTypeChecker().typeToString(prog.getTypeChecker().getTypeAtLocation(n)) == 'Date';
};
/* los avisos del comprobador con unas opciones, solo de los archivos del proyecto: [{ file, line, code, text }] */
const check = (opts, old) => {
  const prog = ts.createProgram(files, opts, undefined, old);
  const out = [];
  for (const d of ts.getPreEmitDiagnostics(prog)) {
    if (!d.file) { out.push({ file: '', line: 0, code: d.code, text: ts.flattenDiagnosticMessageText(d.messageText, ' ') }); continue; }
    if (!d.file.fileName.startsWith(ROOT + path.sep) || d.file.fileName.includes(path.sep + 'node_modules' + path.sep)) continue;
    if (dateArithmetic(prog, d)) continue;
    out.push({ file: d.file.fileName, line: d.file.getLineAndCharacterOfPosition(d.start).line + 1, code: d.code, text: ts.flattenDiagnosticMessageText(d.messageText, '\n').split('\n')[0] });
  }
  return { prog, out };
};

const args = process.argv.slice(2);
const missing = STRICT.filter(m => !fs.existsSync(path.join(JS, m)));
if (missing.length) { console.error('tools/types.js: módulos de STRICT que no existen: ' + missing.join(', ')); process.exit(2); }
const base = check(BASE);
/* (en un catch, el error sigue valiendo por cualquier cosa, como en el nivel básico: se le mira su .code o su .message) */
const strict = check(Object.assign({}, BASE, { strict: true, useUnknownInCatchVariables: false }), base.prog);
const inZone = d => d.file && STRICT.includes(mod(d.file));
/* en la zona estricta valen los avisos del nivel estricto (que incluyen los del básico); fuera, los del básico */
const found = base.out.filter(d => !inZone(d)).concat(strict.out.filter(inZone));
found.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line);

if (args.includes('--resumen')) {
  const by = new Map();
  for (const d of strict.out) if (d.file && d.file.startsWith(JS + path.sep) && !inZone(d)) by.set(mod(d.file), (by.get(mod(d.file)) || 0) + 1);
  const rows = [...by.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  console.log('Avisos que daría el nivel estricto en cada módulo que aún no lo tiene (' + rows.reduce((n, r) => n + r[1], 0) + ' en ' + rows.length + ' módulos; sin avisos, ' + (files.filter(f => f.startsWith(JS + path.sep)).length - rows.length - STRICT.length) + '):');
  for (const [m, n] of rows) console.log(String(n).padStart(6) + '  ' + m);
}
const n = files.filter(f => f.endsWith('.js')).length;
if (!found.length) {
  console.log('Tipos correctos: ' + n + ' módulos (' + STRICT.length + ' con el nivel estricto)');
  process.exit(0);
}
const show = args.includes('--todo') ? found : found.slice(0, 40);
for (const d of show) console.log((d.file ? rel(d.file) + ':' + d.line : 'configuración') + '  TS' + d.code + '  ' + d.text.slice(0, 300));
if (show.length < found.length) console.log('… y ' + (found.length - show.length) + ' más (node tools/types.js --todo)');
console.log('\nFALLA: ' + found.length + ' avisos de tipos en ' + new Set(found.map(d => d.file)).size + ' archivos');
process.exit(1);
