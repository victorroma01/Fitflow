# Grosor: el material que se mete en brazos y piernas tal como se dibujan (con los perfiles de fig3d: medio ancho, medio
# fondo y lo que se adelanta el centro, a cada altura del miembro), no con las cápsulas más finas de choques.py. Es lo que
# se ve: la barra que pasa por dentro de la rodilla o del cuádriceps, la kettlebell en el muslo, el disco en el brazo.
# Se perdona lo que va en la mano (el puño lo agarra), las bandas y cintas pisadas junto a los tobillos y lo que se abraza.
# Antes: python3 banco.py (y choques.py, que deja salida/choques.html con la sonda). Uso: python3 grosor.py ["Nombre|Nombre"] [-v]
import os, sys, json
from playwright.sync_api import sync_playwright
VERB = '-v' in sys.argv
args = [x for x in sys.argv[1:] if x != '-v']
names = args[0].split('|') if args and args[0] else None
JS = r'''
([names, VERB]) => {
  const L = Fig3D.lib, out = [], LIMB3 = L.LIMB3, M = 1.5;
  const prof = (tab, v) => { if (v <= tab[0][0]) return tab[0].slice(1); for (let i = 1; i < tab.length; i++) if (v <= tab[i][0]) { const a = tab[i - 1], b = tab[i], k = (v - a[0]) / (b[0] - a[0]); return [1, 2, 3].map(j => a[j] + (b[j] - a[j]) * k); } return tab[tab.length - 1].slice(1); };
  const LIMBS = [['upper', 'brazo', 72.4], ['fore', 'antebrazo', 60], ['thigh', 'muslo', 89], ['shin', 'pierna', 84]];
  /* el miembro en el que una bola (p, r) se mete más de M */
  const inLimb = (F, p, r, legsOnly) => {
    for (const s of ['L', 'R']) for (const [k, name, ln] of LIMBS) {
      if (legsOnly && (k == 'upper' || k == 'fore')) continue;
      const f = F[k + s]; if (!f) continue;
      const v = L.sub(p, f.o), d = -L.dot(v, f.y), tab = LIMB3[k];
      if (d < tab[0][0] || d > ln) continue;
      const [hw, hd, zc] = prof(tab, d), lx = L.dot(v, f.x), lz = L.dot(v, f.z) - zc, a = hw + r - M, b = hd + r - M;
      if (a > 0 && b > 0 && (lx / a) ** 2 + (lz / b) ** 2 < 1) return [name + s, +((1 - Math.sqrt((lx / a) ** 2 + (lz / b) ** 2)) * Math.min(a, b)).toFixed(1)];
    }
    return null;
  };
  const samples = (a, b, step = 3) => { const n = Math.max(1, Math.round(L.len(L.sub(b, a)) / step)), r = []; for (let i = 0; i <= n; i++) r.push(L.mix(a, b, i / n)); return r; };
  for (const name of names || Object.keys(EXS)) {
    const ex = EXS[name], found = {};
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, q = ex.at(t), { F, J } = Fig3D.pose(q);
      GEARLOG.items = []; GEARLOG.on = true;
      let drawn = [];
      try { if (ex.gear) drawn = ex.gear(q, F, Fig3D.camera(...(ex.cam || [-125, 14])), ex); } finally { GEARLOG.on = false; }
      for (const it of drawn) if (it.__log && it.below && it.below.some(k => /^fore/.test(k))) it.__log.forEach(e => { e.hug = true; });
      const fists = ['L', 'R'].map(s => J[s].fist), ankles = ['L', 'R'].map(s => J[s].ankle);
      const near = (p, ps, d) => ps.some(c => L.len(L.sub(p, c)) < d);
      const pts = [];
      for (const it of GEARLOG.items) {
        if (it.hug) continue;
        if (it.k == 'seg') for (const p of samples(it.a, it.b)) pts.push([it.what, p, it.r, it.soft]);
        else if (it.k == 'disc') {
          const ax = L.norm(it.axis), t0 = Math.abs(ax[1]) < .9 ? [0, 1, 0] : [1, 0, 0], u = L.norm(L.cross(ax, t0)), v = L.cross(ax, u);
          pts.push([it.what, it.c, it.w / 2]);
          for (const f of [.5, .95]) for (let j = 0; j < 20; j++) { const a = j / 20 * 2 * Math.PI; pts.push([it.what, L.add(it.c, L.add(L.mul(u, it.R * f * Math.cos(a)), L.mul(v, it.R * f * Math.sin(a)))), it.w / 2]); }
        }
        else if (it.k == 'ball') { pts.push([it.what, it.c, it.R]); }
      }
      /* los brazos (con su grosor: lo menos ancho de su sección, a cada altura) y los puños contra las piernas */
      for (const s of ['L', 'R']) {
        const segs = [['brazo', F['upper' + s], LIMB3.upper, 72.4], ['antebrazo', F['fore' + s], LIMB3.fore, 60]];
        for (const [nm, f, tab, ln] of segs) for (let d = 4; d <= ln; d += 4) {
          const [hw, hd] = prof(tab, d), p = L.add(f.o, L.mul(f.y, -d)), hit = inLimb(F, p, Math.min(hw, hd), true);
          if (hit && /muslo|pierna/.test(hit[0])) { const k = nm + s + ' en ' + hit[0]; if (!(k in found)) found[k] = t.toFixed(2) + (VERB ? ' ' + JSON.stringify([p.map(v => +v.toFixed(0)), hit[1]]) : ''); }
        }
        const hit = inLimb(F, J[s].fist, 7.5, true);
        if (hit && /muslo|pierna/.test(hit[0])) { const k = 'puño' + s + ' en ' + hit[0]; if (!(k in found)) found[k] = t.toFixed(2) + (VERB ? ' ' + JSON.stringify([J[s].fist.map(v => +v.toFixed(0)), hit[1]]) : ''); }
      }
      for (const [g, p, r, soft] of pts) {
        if (near(p, fists, 12 + r)) continue;
        if (soft && near(p, ankles, 22)) continue;
        const hit = inLimb(F, p, r);
        if (hit) { const k = g + ' en ' + hit[0]; if (!(k in found)) found[k] = t.toFixed(2) + (VERB ? ' ' + JSON.stringify([p.map(v => +v.toFixed(0)), r, hit[1]]) : ''); }
      }
    }
    out.push([name, Object.entries(found).map(([k, t]) => k + ' (t=' + t + ')')]);
  }
  return out;
}
'''
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + os.path.abspath('salida/choques.html')); pg.wait_for_timeout(300)
    r = pg.evaluate(JS, [names, VERB])
    bad = [x for x in r if x[1]]
    print(len(r), 'ejercicios;', len(bad), 'con material dentro de brazos o piernas')
    for n, ps in bad: print(' ', n, '->', '; '.join(ps[:5]))
    if errs: print('ERRORES', errs)
    b.close()
