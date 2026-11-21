# Choques: barra o mancuernas que atraviesan el cuerpo, brazos o piernas que se cruzan entre sí o atraviesan el tronco, y
# partes del cuerpo por debajo del suelo. Cada pieza del cuerpo se aproxima por cápsulas (y el tronco, por una elipse
# en su marco) algo más delgadas que el dibujo, para que solo salga lo que de verdad se ve atravesado.
import os, sys, json
from playwright.sync_api import sync_playwright
names = sys.argv[1].split('|') if len(sys.argv) > 1 and sys.argv[1] else None
JS = r'''
(names) => {
  const L = Fig3D.lib, out = [];
  const segDist = (p, a, b) => { const ab = L.sub(b, a), t = Math.max(0, Math.min(1, L.dot(L.sub(p, a), ab) / (L.dot(ab, ab) || 1))); return L.len(L.sub(p, L.add(a, L.mul(ab, t)))); };
  const samples = (a, b, step = 4) => { const n = Math.max(1, Math.round(L.len(L.sub(b, a)) / step)), r = []; for (let i = 0; i <= n; i++) r.push(L.mix(a, b, i / n)); return r; };
  /* dentro del tronco: en el marco del tórax (y de la pelvis), una elipse algo más pequeña que el cuerpo dibujado */
  const inTrunk = (F, p) => {
    for (const [fr, y0, y1, rx, rz] of [[F.thorax, 8, 92, 30, 17], [F.pelvis, -10, 40, 24, 15]]) {
      const d = L.sub(p, fr.o), x = L.dot(d, fr.x), y = L.dot(d, fr.y), z = L.dot(d, fr.z);
      if (y > y0 && y < y1 && (x / rx) ** 2 + (z / rz) ** 2 < 1) return true;
    }
    return false;
  };
  for (const name of names || Object.keys(EXS)) {
    const ex = EXS[name], found = {};
    const note = (k, t) => { if (!(k in found)) found[k] = t; };
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, q = ex.at(t), { F, J } = Fig3D.pose(q);
      const head = L.at(F.head, [0, 2, 1]);
      const caps = [];
      for (const s of ['L', 'R']) {
        const j = J[s], wrist = L.add(j.fist, L.mul(L.norm(L.sub(j.el, j.fist)), 16));
        caps.push(['muslo' + s, j.hip, j.knee, 13], ['pierna' + s, j.knee, j.ankle, 8], ['brazo' + s, j.sh, j.el, 8], ['antebrazo' + s, j.el, wrist, 6]);
      }
      /* la barra (de lado a lado, sin el tramo de las manos) y las mancuernas */
      const gear = [];
      if (q.barC && q.grip != null) for (const x of [-210, -180, -150, -120, -100, -40, -20, 0, 20, 40, 100, 120, 150, 180, 210]) { if (Math.abs(Math.abs(x) - q.grip) < 16) continue; gear.push(['barra', L.add(q.barC, [x, 0, 0]), 4]); }
      /* la cabeza contra la barra o el material, y los brazos o las piernas dentro del tronco */
      for (const [g, p, r] of gear) {
        if (L.len(L.sub(p, head)) < 13 + r) note('la barra atraviesa la cabeza', t);
        if (inTrunk(F, p)) note('la barra atraviesa el tronco', t);
        for (const [k, a, b, rr] of caps) if (segDist(p, a, b) < rr + r - 2) note('la barra atraviesa ' + k, t);
      }
      for (const [k, a, b, r] of caps) {
        if (/brazo/.test(k)) { for (const p of samples(a, b).slice(2, -2)) if (inTrunk(F, p)) { note(k + ' dentro del tronco', t); break; } }
        if (/muslo|pierna/.test(k)) for (const p of samples(a, b).slice(1, -1)) if (L.len(L.sub(p, head)) < 14 + r) { note(k + ' en la cabeza', t); break; }
        if (/antebrazo|brazo/.test(k)) { if (segDist(head, a, b) < 12 + r - 3) note(k + ' atraviesa la cabeza', t); }
      }
      /* un brazo o una pierna que atraviesa la del otro lado */
      for (const [k1, a1, b1, r1] of caps) for (const [k2, a2, b2, r2] of caps) {
        if (k1 >= k2 || k1.slice(-1) == k2.slice(-1)) continue;
        if (/muslo|pierna/.test(k1) != /muslo|pierna/.test(k2)) continue;
        for (const p of samples(a1, b1, 3)) if (segDist(p, a2, b2) < r1 + r2 - 6) { note(k1 + ' cruza ' + k2, t); break; }
      }
    }
    out.push([name, Object.entries(found).map(([k, t]) => k + ' (t=' + t.toFixed(2) + ')')]);
  }
  return out;
}
'''
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('salida/banco.html')); pg.wait_for_timeout(300)
    r = pg.evaluate(JS, names)
    bad = [x for x in r if x[1]]
    print(len(r), 'ejercicios;', len(bad), 'con choques')
    for n, ps in bad: print(' ', n, '->', '; '.join(ps[:5]))
    if errs: print('ERRORES', errs)
    b.close()
