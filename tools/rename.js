#!/usr/bin/env node
/* StrataFit · renombra identificadores globales en todos los módulos sin tocar nada más.
   Usa el servicio de lenguaje de TypeScript: entiende ámbitos (no cambia variables locales con el mismo nombre)
   y propiedades abreviadas ({x} pasa a {x: nuevo}).
   Uso:  node tools/rename.js mapa.txt        (líneas «viejo nuevo»; # comentarios)
   Se niega si un nombre nuevo ya existe en el código o es un global del navegador, para no capturar referencias. */
const fs = require('fs'), path = require('path');
function loadTS() {
  for (const c of [process.env.TS_PATH, 'typescript', path.join(__dirname, '../node_modules/typescript'), '/opt/npm-tools/node_modules/typescript'].filter(Boolean)) { try { return require(c); } catch (e) {} }
  console.error('No se encuentra el paquete "typescript"'); process.exit(2);
}
const ts = loadTS();
const ROOT = path.join(__dirname, '..'), JS = path.join(ROOT, 'src/js');
const mods = fs.readFileSync(path.join(JS, 'modules.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && s[0] !== '#');
const files = {}; mods.forEach(m => { files[path.join(JS, m)] = fs.readFileSync(path.join(JS, m), 'utf8'); });
const pairs = fs.readFileSync(process.argv[2], 'utf8').split('\n').map(l => l.replace(/#.*/, '').trim()).filter(Boolean).map(l => l.split(/\s+/));
const host = {
  getScriptFileNames: () => Object.keys(files), getScriptVersion: () => '1',
  getScriptSnapshot: f => files[f] != null ? ts.ScriptSnapshot.fromString(files[f]) : (fs.existsSync(f) ? ts.ScriptSnapshot.fromString(fs.readFileSync(f, 'utf8')) : undefined),
  getCurrentDirectory: () => ROOT, getCompilationSettings: () => ({ allowJs: true, checkJs: false, noEmit: true, target: ts.ScriptTarget.ES2022, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'] }),
  getDefaultLibFileName: o => ts.getDefaultLibFilePath(o), fileExists: f => files[f] != null || fs.existsSync(f), readFile: f => files[f] != null ? files[f] : fs.readFileSync(f, 'utf8'),
};
const ls = ts.createLanguageService(host, ts.createDocumentRegistry());
const prog = ls.getProgram(), ch = prog.getTypeChecker();
// globales declarados y todos los identificadores escritos en el código
const decl = {}, allIds = new Set();
for (const f of Object.keys(files)) {
  const sf = prog.getSourceFile(f);
  sf.statements.forEach(st => {
    if (ts.isFunctionDeclaration(st) && st.name) decl[st.name.text] = { f, pos: st.name.getStart(sf) };
    if (ts.isVariableStatement(st)) st.declarationList.declarations.forEach(d => { if (ts.isIdentifier(d.name)) decl[d.name.text] = { f, pos: d.name.getStart(sf) }; });
  });
  const v = n => { if (ts.isIdentifier(n)) allIds.add(n.text); ts.forEachChild(n, v); }; v(sf);
}
const globalsJson = path.join(__dirname, 'globals.json');
const browser = new Set(fs.existsSync(globalsJson) ? JSON.parse(fs.readFileSync(globalsJson, 'utf8')) : []);
const reserved = new Set('break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof new return super switch this throw try typeof var void while with yield let static enum await implements package protected interface private public null true false undefined NaN Infinity arguments eval'.split(' '));
const seenNew = new Set(), problems = [];
pairs.forEach(([o, n]) => {
  if (!decl[o]) problems.push('no es un global declarado: ' + o);
  if (!/^[A-Za-z_$][\w$]*$/.test(n || '')) problems.push('nombre no válido: ' + n);
  if (allIds.has(n)) problems.push('«' + n + '» ya existe en el código (para ' + o + ')');
  if (browser.has(n) || reserved.has(n) || n in globalThis) problems.push('«' + n + '» es un global del navegador o palabra reservada (para ' + o + ')');
  if (seenNew.has(n)) problems.push('nombre nuevo repetido: ' + n);
  seenNew.add(n);
});
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const edits = {};
let total = 0;
pairs.forEach(([o, n]) => {
  const d = decl[o];
  const locs = ls.findRenameLocations(d.f, d.pos, false, false, { providePrefixAndSuffixTextForRename: true }) || [];
  if (!locs.length) { console.error('sin ubicaciones para ' + o); process.exit(1); }
  locs.forEach(l => {
    if (files[l.fileName] == null) { console.error('renombre fuera de los módulos: ' + l.fileName); process.exit(1); }
    const old = files[l.fileName].slice(l.textSpan.start, l.textSpan.start + l.textSpan.length);
    if (old !== o) { console.error('ubicación inesperada para ' + o + ': «' + old + '»'); process.exit(1); }
    (edits[l.fileName] = edits[l.fileName] || []).push({ s: l.textSpan.start, e: l.textSpan.start + l.textSpan.length, t: (l.prefixText || '') + n + (l.suffixText || '') });
    total++;
  });
});
for (const f of Object.keys(edits)) {
  let t = files[f];
  const es = edits[f].sort((a, b) => b.s - a.s);
  for (let i = 1; i < es.length; i++) if (es[i].e > es[i - 1].s) { console.error('ediciones solapadas en ' + f); process.exit(1); }
  es.forEach(x => { t = t.slice(0, x.s) + x.t + t.slice(x.e); });
  // la lista «Define:» de la cabecera del módulo
  t = t.replace(/^(\s*Define:)([^\n]*)$/m, (m, a, b) => a + b.replace(/[A-Za-z_$][\w$]*/g, w => { const p = pairs.find(q => q[0] === w); return p ? p[1] : w; }));
  fs.writeFileSync(f, t);
}
console.log('renombrados ' + pairs.length + ' globales en ' + total + ' ubicaciones de ' + Object.keys(edits).length + ' módulos');
