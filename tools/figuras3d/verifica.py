# Comprobación de todo el lote: lo que no cuadra, ejercicio por ejercicio
import os, json
from playwright.sync_api import sync_playwright
JS = r'''
() => {
  const L = Fig3D.lib, RAD = Math.PI / 180, out = [];
  const ang = (a, b, c) => { const u = L.norm(L.sub(a, b)), v = L.norm(L.sub(c, b)); return Math.acos(Math.max(-1, Math.min(1, L.dot(u, v)))) / RAD; };
  for (const [name, ex] of Object.entries(EXS)) {
    const probs = [];
    let maxReach = 0, minY = 1e9, asym = 0, minFloor = 1e9;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, q = ex.at(t), { F, J } = Fig3D.pose(q);
      const flat = JSON.stringify(q);
      if (flat.includes('null') && /NaN|Infinity/.test(flat)) probs.push('NaN t=' + t);
      for (const s of ['L', 'R']) {
        if (q.hands && q.hands[s]) maxReach = Math.max(maxReach, L.len(L.sub(J[s].fist, q.hands[s])));
        for (const k of ['hip', 'knee', 'ankle', 'sh', 'el', 'fist']) minY = Math.min(minY, J[s][k][1]);
      }
      // los pies: en el suelo (salvo el salto y el declinado, que los tiene en los rodillos)
      const fy = Math.min(J.L.ankle[1], J.R.ankle[1]);
      minFloor = Math.min(minFloor, fy);
      // simetría (si los dos brazos hacen lo mismo)
      const one = /unilateral|kettlebell|polea|landmine/i.test(name);
      if (!one) asym = Math.max(asym, Math.abs(J.L.el[0] + J.R.el[0]) + Math.abs(J.L.el[1] - J.R.el[1]) + Math.abs(J.L.el[2] - J.R.el[2]));
      // codos imposibles
      for (const s of ['L', 'R']) { const e = ang(J[s].sh, J[s].el, J[s].fist), k = ang(J[s].hip, J[s].knee, J[s].ankle); if (e < 8) probs.push(`codo ${s} cerrado ${e.toFixed(0)}° t=${t.toFixed(2)}`); if (k < 30) probs.push(`rodilla ${s} ${k.toFixed(0)}° t=${t.toFixed(2)}`); }
    }
    if (maxReach > 1.5) probs.push('la mano no llega: ' + maxReach.toFixed(1));
    if (minY < -1) probs.push('algo bajo el suelo: ' + minY.toFixed(1));
    if (!/salto|declinad/i.test(name) && Math.abs(minFloor - 20) > .6) probs.push('tobillo fuera del suelo: ' + minFloor.toFixed(1));
    if (asym > 1) probs.push('asimetría ' + asym.toFixed(1));
    out.push([name, [...new Set(probs)].slice(0, 6)]);
  }
  return out;
}
'''
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('salida/banco.html')); pg.wait_for_timeout(300)
    r = pg.evaluate(JS)
    bad = [x for x in r if x[1]]
    print(len(r), 'ejercicios;', len(bad), 'con avisos')
    for n, ps in bad: print(' ', n, '->', '; '.join(ps))
    if errs: print('ERRORES', errs)
    b.close()
