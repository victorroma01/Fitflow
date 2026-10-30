#!/usr/bin/env node
/* StrataFit · formateador de CSS (sin dependencias)
   Una regla por bloque, una declaración por línea y bloques anidados (@media, @keyframes…) sangrados.
   No cambia selectores ni valores: solo saltos de línea, sangría y el «;» final de cada bloque.
   Uso:  node tools/format_css.js            (formatea src/css/*.css)
         node tools/format_css.js --check    (falla si alguno no está formateado)
   La equivalencia se comprueba con canon(): el CSS sin comentarios ni espacios alrededor de { } ; debe ser idéntico. */
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'src', 'css');

// trocea en: comentarios, «{», «}», «;» y texto (respetando cadenas y paréntesis, p. ej. url(data:…;…))
function tokens(s) {
  const out = []; let buf = '', i = 0, depth = 0;
  const flush = () => { if (buf.trim()) out.push({ t: 'x', v: buf.trim().replace(/\s*\n\s*/g, ' ') }); buf = ''; };
  while (i < s.length) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i + 2); const end = e < 0 ? s.length : e + 2; flush(); out.push({ t: 'c', v: s.slice(i, end) }); i = end; continue; }
    if (c === '"' || c === "'") { let j = i + 1; while (j < s.length && s[j] !== c) { if (s[j] === '\\') j++; j++; } buf += s.slice(i, j + 1); i = j + 1; continue; }
    if (c === '(') depth++;
    if (c === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && (c === '{' || c === '}' || c === ';')) { flush(); out.push({ t: c }); i++; continue; }
    buf += c; i++;
  }
  flush();
  return out;
}
// ¿el bloque que empieza en k contiene reglas anidadas? (hay «{» antes de su «}»)
function nested(tk, k) {
  let d = 0;
  for (let j = k; j < tk.length; j++) {
    if (tk[j].t === '{') { if (d === 0 && j > k) return true; d++; }
    else if (tk[j].t === '}') { d--; if (d === 0) return false; }
  }
  return false;
}
function format(src) {
  const tk = tokens(src), lines = []; let ind = 0, pend = null;
  const pad = () => '  '.repeat(ind);
  const stack = [];
  for (let k = 0; k < tk.length; k++) {
    const x = tk[k];
    if (x.t === 'c') { if (pend != null) { lines.push(pad() + pend + ';'); pend = null; } lines.push(...x.v.split('\n').map((l, n) => n ? l : pad() + l)); continue; }
    if (x.t === 'x') { pend = pend == null ? x.v : pend + ' ' + x.v; continue; }
    if (x.t === '{') { lines.push(pad() + (pend || '') + ' {'); pend = null; stack.push(nested(tk, k)); ind++; continue; }
    if (x.t === ';') { if (pend != null) { lines.push(pad() + pend + ';'); pend = null; } continue; }
    if (x.t === '}') { if (pend != null) { lines.push(pad() + pend + ';'); pend = null; } ind = Math.max(0, ind - 1); stack.pop(); lines.push(pad() + '}'); continue; }
  }
  if (pend != null) lines.push(pend + ';');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}
function canon(src) {
  return tokens(src).filter(x => x.t !== 'c').map(x => x.t === 'x' ? x.v.replace(/\s+/g, ' ') : x.t).join('').replace(/;}/g, '}').replace(/;+/g, ';');
}
function comments(src) { return tokens(src).filter(x => x.t === 'c').map(x => x.v.replace(/\s+/g, ' ')); }
module.exports = { format, canon, comments };
if (require.main === module) {
  const check = process.argv.includes('--check');
  let bad = 0;
  for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.css')).sort()) {
    const p = path.join(DIR, f), src = fs.readFileSync(p, 'utf8'), out = format(src);
    if (canon(out) !== canon(src) || JSON.stringify(comments(out)) !== JSON.stringify(comments(src))) { console.error('el formato cambiaría el significado de ' + f + ': no se toca'); bad++; continue; }
    if (out !== src) { if (check) { console.log('sin formatear:', f); bad++; } else fs.writeFileSync(p, out); }
  }
  if (bad) process.exit(1);
  if (!check) console.log('CSS formateado');
}
