# Fijos: lo que no puede moverse durante el gesto (las guías de la Smith, los postes de las poleas, las patas de los bancos
# y las cajas apoyadas en el suelo: tarimas, plataformas, chasis). Se dibuja cada ejercicio en varios momentos y se compara
# dónde está cada una de esas piezas. Antes: python3 banco.py y choques.py (salida/choques.html, con la sonda).
# Uso: python3 fijos.py ["Nombre|Nombre"]
import os, sys
from playwright.sync_api import sync_playwright
names = sys.argv[1].split('|') if len(sys.argv) > 1 and sys.argv[1] else None
JS = r'''
(names) => {
  const out = [];
  const r1 = v => Math.round(v * 2) / 2;
  for (const name of names || Object.keys(EXS)) {
    const ex = EXS[name], sigs = [];
    for (const t of [0, .25, .5, .75, 1]) {
      const q = ex.at(t), { F } = Fig3D.pose(q);
      GEARLOG.items = []; GEARLOG.on = true;
      try { if (ex.gear) ex.gear(q, F, Fig3D.camera(...(ex.cam || [-125, 14])), ex); } finally { GEARLOG.on = false; }
      const keep = GEARLOG.items.filter(it => it.what == 'guía' || it.what == 'poste' || it.what == 'pata' || (it.k == 'box' && it.ax && it.ax[1] && Math.abs(it.ax[1][1] - 1) < 1e-6 && it.c[1] - it.h[1] < 8));
      sigs.push(keep.map(it => it.what + ':' + (it.k == 'seg' ? [...it.a, ...it.b] : [...it.c, ...it.h]).map(r1).join(',')).sort());
    }
    const moved = new Set();
    for (const s of sigs.slice(1)) { for (const x of s) if (!sigs[0].includes(x)) moved.add(x.split(':')[0]); for (const x of sigs[0]) if (!s.includes(x)) moved.add(x.split(':')[0]); }
    out.push([name, [...moved]]);
  }
  return out;
}
'''
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('salida/choques.html')); pg.wait_for_timeout(300)
    r = pg.evaluate(JS, names)
    bad = [x for x in r if x[1]]
    print(len(r), 'ejercicios;', len(bad), 'con piezas fijas que se mueven')
    for n, ps in bad: print(' ', n, '->', ', '.join(ps))
    if errs: print('ERRORES', errs)
    b.close()
