/* StrataFit · módulos en orden de carga: los «import './…';» de src/js/main.js (lo comparten las herramientas). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), JS = path.join(ROOT, 'src', 'js');
const modules = () => fs.readFileSync(path.join(JS, 'main.js'), 'utf8').split('\n').map(l => /^import '\.\/([^']+)';$/.exec(l.trim())).filter(Boolean).map(m => m[1]);
module.exports = { ROOT, JS, modules };
