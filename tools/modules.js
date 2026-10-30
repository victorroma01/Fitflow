/* StrataFit · módulos en orden de carga: los «import './…';» de src/js/main.js (lo comparten las herramientas).
   allModules() añade los que se cargan al usarlos (los import('…') de src/js/core/lazy.js). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), JS = path.join(ROOT, 'src', 'js');
const modules = () => fs.readFileSync(path.join(JS, 'main.js'), 'utf8').split('\n').map(l => /^import '\.\/([^']+)';$/.exec(l.trim())).filter(Boolean).map(m => m[1]);
const lazyModules = () => [...fs.readFileSync(path.join(JS, 'core', 'lazy.js'), 'utf8').matchAll(/import\('([^']+)'\)/g)].map(m => path.posix.normalize(path.posix.join('core', m[1])));
const allModules = () => modules().concat(lazyModules());
module.exports = { ROOT, JS, modules, lazyModules, allModules };
