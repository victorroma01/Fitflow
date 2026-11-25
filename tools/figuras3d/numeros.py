# Comprobaciones numéricas de cada ejercicio del lote: inclinación, ángulos, equilibrio, manos que no llegan, pies en el suelo
import sys, json, os
from playwright.sync_api import sync_playwright
names = sys.argv[1].split('|') if len(sys.argv) > 1 and sys.argv[1] else None
JS = r'''
(names) => {
  const L = Fig3D.lib, out = [];
  const RAD = Math.PI / 180;
  const ang = (a, b, c) => { const u = L.norm(L.sub(a, b)), v = L.norm(L.sub(c, b)); return Math.acos(Math.max(-1, Math.min(1, L.dot(u, v)))) / RAD; };
  for (const name of names || Object.keys(EXS)) {
    const ex = EXS[name], rows = [];
    for (const t of [0, .25, .5, .75, 1]) {
      const q = ex.at(t), { F, J } = Fig3D.pose(q);
      const mf = L.mul(L.add(L.at(F.footL, [0, 0, 14]), L.at(F.footR, [0, 0, 14])), .5);
      const reach = ['L', 'R'].map(s => q.hands && q.hands[s] ? L.len(L.sub(J[s].fist, q.hands[s])) : 0);
      const knee = ang(J.L.hip, J.L.knee, J.L.ankle), hip = ang(J.L.knee, J.L.hip, L.at(F.thorax, [20, 80, 0]));
      const elb = ['L', 'R'].map(s => ang(J[s].sh, J[s].el, J[s].fist));
      const fore = ['L', 'R'].map(s => { const d = L.norm(L.sub(J[s].fist, J[s].el)); return Math.acos(Math.abs(d[1])) / RAD; });
      rows.push({ t, lean: +((q.tilt || 0) + (q.spine || 0)).toFixed(1), knee: +(180 - knee).toFixed(0), hip: +(180 - hip).toFixed(0), elbow: elb.map(v => +v.toFixed(0)), fore: fore.map(v => +v.toFixed(0)),
        bar: q.barC ? +(q.barC[2] - mf[2]).toFixed(1) : null, ankleY: +J.L.ankle[1].toFixed(1), reach: reach.map(v => +v.toFixed(1)), rootY: +q.root[1].toFixed(0) });
    }
    out.push([name, rows]);
  }
  return out;
}
'''
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('salida/banco.html'))
    pg.wait_for_timeout(300)
    res = pg.evaluate(JS, names)
    for name, rows in res:
        print('==', name)
        for r in rows:
            flag = ' ¡MANO!' if max(r['reach']) > 1 else ''
            print(f"  t{r['t']:<4} incl {r['lean']:>5}  rodilla {r['knee']:>4}  cadera {r['hip']:>4}  codo {r['elbow']}  antebr {r['fore']}  barra-mediopie {r['bar']}  tobillo {r['ankleY']}  raiz {r['rootY']}{flag}")
    if errs: print('ERRORES', errs[:3])
    b.close()
