#!/usr/bin/env node
/* StrataFit · la huella de todo lo que dibuja el motor de las figuras 3D (src/fig3d), para demostrar que un cambio que no debe
   cambiar ninguna figura (quitar código muerto, ordenar, renombrar) no la cambia. Es al motor lo que tools/same.js al formato.
   De cada ejercicio con figura: sus datos (cámara, momentos quietos…), y en 16 momentos del gesto y con dos cámaras (la suya y
   otra girada 90°), el dibujo completo y el ligero (el de las miniaturas) y la postura (las articulaciones). El motor se carga
   como en tools/figboxes.js, tal cual va en la app. Tarda unos dos minutos.
   Uso:  node tools/figuras3d/huella.js antes.json                       (escribe la huella)
         node tools/figuras3d/huella.js despues.json --compara antes.json  (la escribe y dice qué ejercicios cambian; falla si alguno) */
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const { engine } = require(path.join(__dirname, '..', 'figboxes.js'));
const args = process.argv.slice(2);
const out = args[0], base = args.indexOf('--compara') >= 0 ? args[args.indexOf('--compara') + 1] : '';
if (!out || (args.includes('--compara') && !base)) {
  console.error('Uso: node tools/figuras3d/huella.js salida.json [--compara antes.json]');
  process.exit(2);
}
const { F3, NAMES, make } = engine();
const TS = Array.from({ length: 13 }, (_, i) => i / 12).concat([.137, .555, .873]);
const prints = {};
const all = crypto.createHash('sha256');
for (const n of NAMES) {
  const ex = make(n), h = crypto.createHash('sha256');
  const data = {};
  for (const k of Object.keys(ex).sort())
    if (typeof ex[k] != 'function')
      data[k] = ex[k];
  h.update(JSON.stringify(data));
  for (const cam of [F3.camera(ex.yaw, ex.pitch), F3.camera((ex.yaw || 0) + 90, 10)])
    for (const t of TS) {
      h.update(String(F3.draw(ex, t, cam, 'm', false)));
      h.update(String(F3.draw(ex, t, cam, 'm', true)));
      h.update(JSON.stringify(F3.pose(ex.at(t)).J));
    }
  prints[n] = h.digest('hex').slice(0, 16);
  all.update(n + prints[n]);
}
prints['*'] = all.digest('hex').slice(0, 16);
fs.writeFileSync(out, JSON.stringify(prints, null, 1) + '\n');
console.log(NAMES.length + ' ejercicios · huella ' + prints['*'] + ' (' + out + ')');
if (base) {
  const old = JSON.parse(fs.readFileSync(base, 'utf8'));
  const changed = Object.keys(Object.assign({}, old, prints)).filter(n => n != '*' && old[n] !== prints[n]);
  if (!changed.length) console.log('Igual que ' + base + ': ninguna figura cambia');
  else {
    console.log(changed.length + ' figura(s) distinta(s) de ' + base + ': ' + changed.slice(0, 20).join(' · ') + (changed.length > 20 ? ' …' : ''));
    process.exit(1);
  }
}
