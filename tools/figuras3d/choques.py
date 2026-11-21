# Choques: el material (barras, tubos, cables, cintas, bandas, discos, mancuernas, bancos y máquinas) que atraviesa el
# cuerpo, brazos o piernas que se cruzan entre sí o atraviesan el tronco, y partes del cuerpo por debajo del suelo. Cada
# pieza del cuerpo se aproxima por cápsulas (y el tronco, por una elipse en su marco) algo más delgadas que el dibujo, para
# que solo salga lo que de verdad se ve atravesado. El material se toma de lo que se dibuja: la sonda (sonda.js) apunta la
# forma en 3D de cada pieza. Antes: python3 banco.py. Uso: python3 choques.py ["Nombre|Nombre"]
import os, sys, json
from playwright.sync_api import sync_playwright
VERB = '-v' in sys.argv
args = [x for x in sys.argv[1:] if x != '-v']
names = args[0].split('|') if args and args[0] else None
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
    const note = (k, t, info) => { if (!(k in found)) found[k] = info ? t.toFixed(2) + ' ' + JSON.stringify(info) : t; };
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, q = ex.at(t), { F, J } = Fig3D.pose(q);
      const head = L.at(F.head, [0, 2, 1]);
      const caps = [];
      for (const s of ['L', 'R']) {
        const j = J[s], wrist = j.wr || L.add(j.fist, L.mul(L.norm(L.sub(j.el, j.fist)), 16));
        caps.push(['muslo' + s, j.hip, j.knee, 13], ['pierna' + s, j.knee, j.ankle, 8], ['brazo' + s, j.sh, j.el, 8], ['antebrazo' + s, j.el, wrist, 6]);
      }
      /* el material, tal como se dibuja (la sonda apunta cada pieza): tramos con su grosor, discos y cajas */
      GEARLOG.items = []; GEARLOG.on = true;
      let drawn = [];
      try { if (ex.gear) drawn = ex.gear(q, F, Fig3D.camera(...(ex.cam || [-125, 14]))); } finally { GEARLOG.on = false; }
      /* lo que se pinta detrás de los antebrazos va apretado en el pliegue del codo (abrazado): puede tocar brazos y antebrazos */
      for (const it of drawn) if (it.__log && it.below && it.below.some(k => /^fore/.test(k))) it.__log.forEach(e => { e.hug = true; });
      const fists = ['L', 'R'].map(s => J[s].fist), ankles = ['L', 'R'].map(s => J[s].ankle);
      const near = (p, ps, d) => ps.some(c => L.len(L.sub(p, c)) < d);
      const pts = [];   // [pieza, punto, radio, blando]
      for (const it of GEARLOG.items) {
        if (it.k == 'seg') for (const p of samples(it.a, it.b, 3)) pts.push([it.what, p, it.r, it.soft, it.hug]);
        else if (it.k == 'disc') {
          const ax = L.norm(it.axis), t0 = Math.abs(ax[1]) < .9 ? [0, 1, 0] : [1, 0, 0], u = L.norm(L.cross(ax, t0)), v = L.cross(ax, u);
          pts.push([it.what, it.c, it.w / 2]);
          for (const f of [.5, .92]) for (let i = 0; i < 16; i++) { const a = i / 16 * 2 * Math.PI; pts.push([it.what, L.add(it.c, L.add(L.mul(u, it.R * f * Math.cos(a)), L.mul(v, it.R * f * Math.sin(a)))), it.w / 2]); }
        }
        else if (it.k == 'ball') { pts.push([it.what, it.c, it.R * .85]); for (const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) pts.push([it.what, L.add(it.c, L.mul(d, it.R * .7)), it.R * .3]); }
      }
      for (const [g, p, r, soft, hug] of pts) {
        if (near(p, fists, 11 + r)) continue;
        if (soft && near(p, ankles, 18)) continue;
        if (L.len(L.sub(p, head)) < 13 + r - 1) note(g + ' atraviesa la cabeza', t);
        if (inTrunk(F, p)) note(g + ' atraviesa el tronco', t);
        /* lo que se abraza (el saco) apoya en brazos y antebrazos: solo cuenta contra el resto */
        for (const [k, a, b, rr] of caps) { if (hug && /brazo/.test(k)) continue; const d = segDist(p, a, b); if (d < rr + r - 2) { note(g + ' atraviesa ' + k, t, [p.map(v => +v.toFixed(0)), +r.toFixed(1), +d.toFixed(1), rr + r - 2]); break; } }
      }
      /* el cuerpo dentro de un banco, una caja o una máquina (un poco más que tocarlos) */
      const boxes = GEARLOG.items.filter(i => i.k == 'box');
      if (boxes.length) {
        const body = [];
        for (const [k, a, b] of caps) for (const p of samples(a, b, 4)) if (!near(p, fists, 10) && !near(p, ankles, 12)) body.push([k, p]);
        for (const y of [15, 30, 45, 60, 75]) body.push(['tronco', L.at(F.thorax, [0, y, 0])]);
        for (const y of [0, 15, 30]) body.push(['pelvis', L.at(F.pelvis, [0, y, 0])]);
        body.push(['cabeza', head]);
        for (const bx of boxes) {
          const ux = L.norm(bx.ax[0]), uy = L.norm(bx.ax[1]), uz = L.cross(ux, uy);
          for (const [k, p] of body) {
            const d = L.sub(p, bx.c);
            if (Math.abs(L.dot(d, ux)) < bx.h[0] - 2 && Math.abs(L.dot(d, uy)) < bx.h[1] - 2 && Math.abs(L.dot(d, uz)) < bx.h[2] - 2) { note(k + ' dentro de ' + bx.what, t, [p.map(v => +v.toFixed(0)), [L.dot(d, ux), L.dot(d, uy), L.dot(d, uz)].map(v => +v.toFixed(0)), bx.h]); break; }
          }
        }
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
    out.push([name, Object.entries(found).map(([k, t]) => k + ' (t=' + (typeof t == 'number' ? t.toFixed(2) : t) + ')')]);
  }
  return out;
}
'''
html = open('salida/banco.html').read()
tag = '<script src="../mov3d.js"></script>'
assert tag in html
open('salida/choques.html', 'w').write(html.replace(tag, '<script src="../sonda.js"></script>' + tag))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('salida/choques.html')); pg.wait_for_timeout(300)
    r = pg.evaluate(JS, names)
    if not VERB: r = [[n, [s if ' [' not in s else s[:s.index(' [')] + ')' for s in ps]] for n, ps in r]
    bad = [x for x in r if x[1]]
    print(len(r), 'ejercicios;', len(bad), 'con choques')
    for n, ps in bad: print(' ', n, '->', '; '.join(ps[:5]))
    if errs: print('ERRORES', errs)
    b.close()
