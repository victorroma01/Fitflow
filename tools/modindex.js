#!/usr/bin/env node
/* StrataFit · mapa de módulos (docs/tecnica/modulos.md), hecho a partir de la cabecera de cada módulo de src/js:
   qué hace, qué declara y cuántas acciones registra. Así el mapa nunca se queda viejo: tools/format.js mantiene la línea
   «Define:» de cada cabecera y este script copia las cabeceras al mapa.
   Uso:  node tools/modindex.js          (escribe docs/tecnica/modulos.md)
         node tools/modindex.js --check  (falla si el mapa no está al día) */
const fs = require('fs'), path = require('path');
const { ROOT, JS, modules, lazyModules } = require('./modules');
const OUT = path.join(ROOT, 'docs', 'tecnica', 'modulos.md');
const AREAS = {
  core: 'Núcleo: estado, guardado, pintado, eventos, avisos y piezas comunes',
  data: 'Datos fijos: ejercicios, programas, alimentos, fotos y novedades',
  workout: 'Workout: día, entreno en curso, descansos, series, discos y descarga',
  routines: 'Workouts personalizados',
  programs: 'Programas: crear, guiado, niveles, compartir e importar',
  library: 'Librería de ejercicios: buscar, filtrar, elegir y sustituir',
  nutrition: 'Nutrición: comidas, alimentos, objetivos, plantillas y agua',
  dashboard: 'Dashboard: progreso, historial, calendario y peso',
  extras: 'Funciones extra: logros, medidas, cardio, WOD, resumen y exportar',
  profile: 'Perfil y Ajustes',
  system: 'Sistema: copias de seguridad, diagnóstico, actualizaciones, archivos e informe de fallos',
  cloud: 'Nube: Firebase por su API REST (sesión, cuentas y Firestore) y la sincronización sin conexión',
  account: 'Cuenta: inicio de sesión y registro, la cuenta en Ajustes y Administración'
};
const lazy = new Set(lazyModules());
const cell = s => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
function header(m) {
  const t = fs.readFileSync(path.join(JS, m), 'utf8');
  const c = /^\/\*([\s\S]*?)\*\//.exec(t);
  if (!c) return { desc: '', define: [], acts: 0 };
  const lines = c[1].split('\n');
  const first = lines[0].replace(/^\s*═+\s*[\w/.-]+\s*═+\s*/, '').trim();
  const rest = lines.slice(1).map(l => l.trim());
  const di = rest.findIndex(l => l.startsWith('Define:'));
  const desc = [first].concat(di < 0 ? rest : rest.slice(0, di)).filter(Boolean).join(' ');
  const def = di < 0 ? '' : rest[di].slice('Define:'.length);
  const acts = +((/acciones\/registros:\s*(\d+)/.exec(def) || [])[1] || 0);
  const names = def.split('·')[0].split(',').map(s => s.trim()).filter(s => s && s !== '—');
  return { desc, define: names, acts };
}
function build() {
  const mods = modules().concat([...lazy]);
  const byArea = {};
  mods.forEach(m => (byArea[m.split('/')[0]] = byArea[m.split('/')[0]] || []).push(m));
  let out = '# Mapa de módulos\n\n' +
    'Qué hace cada módulo de `src/js`, qué declara y cuántas acciones registra (`A` / `C` / `U`). Se genera con\n' +
    '`node tools/modindex.js` a partir de la cabecera de cada módulo: no se edita a mano (`tests/run.sh` comprueba que está al día).\n\n' +
    'Los módulos se cargan en el orden de los `import` de `src/js/main.js`. Los marcados «al usarlo» se descargan la primera vez\n' +
    'que hacen falta (`core/lazy`). ' + mods.length + ' módulos en total.\n';
  for (const a of Object.keys(byArea).sort((x, y) => (Object.keys(AREAS).indexOf(x) + 99) % 99 - (Object.keys(AREAS).indexOf(y) + 99) % 99)) {
    out += '\n## ' + a + '\n\n' + (AREAS[a] ? AREAS[a] + '.\n\n' : '') + '| Módulo | Qué hace | Declara | Acciones |\n| --- | --- | --- | --- |\n';
    for (const m of byArea[a]) {
      const h = header(m);
      out += '| `' + m.replace(/\.js$/, '') + '`' + (lazy.has(m) ? ' (al usarlo)' : '') + ' | ' + cell(h.desc) + ' | ' +
        (h.define.length ? h.define.map(n => '`' + n + '`').join(', ') : '—') + ' | ' + (h.acts || '—') + ' |\n';
    }
  }
  return out;
}
if (require.main === module) {
  const md = build();
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== md) { console.log('docs/tecnica/modulos.md no está al día: node tools/modindex.js'); process.exit(1); }
    console.log('Mapa de módulos al día');
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, md);
    console.log('docs/tecnica/modulos.md escrito');
  }
}
module.exports = { build };
