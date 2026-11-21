/* ═══ figuras 3D: la sonda del material (solo para choques.py) ═══
   Se carga después de fig3d.js y gear3d.js y antes de las familias: envuelve las piezas del material para que, cuando
   window.GEARLOG.on está activo, cada pieza que se dibuja deje apuntada su forma en 3D (un tramo con su grosor, un disco,
   una caja...). Así choques.py comprueba contra el cuerpo exactamente lo que se pinta: barras, tubos, cables, cintas,
   bandas, discos, mancuernas, bancos y máquinas. No cambia nada de lo que se dibuja. */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib, GR = F3.gear;
  const { add, sub, mul, norm, mix, len, cross } = L;
  const LOG = G.GEARLOG = { on: false, items: [] };
  /* cada pieza apuntada recuerda lo que devolvió el dibujo: así se sabe luego si la familia la pintó detrás de los antebrazos
     (lo que va apretado en el pliegue del codo, como la barra del Zercher) */
  const wrap = (obj, k, f) => {
    const o = obj[k];
    obj[k] = function (...a) {
      const r = o.apply(this, a);
      if (LOG.on) { const es = [].concat(f(...a)); es.forEach(i => LOG.items.push(i)); [].concat(r).forEach(it => { if (it && typeof it == 'object') it.__log = es; }); }
      return r;
    };
  };
  const X = [1, 0, 0], UP = [0, 1, 0];
  const seg = (a, b, r, what) => ({ k: 'seg', a, b, r, what });
  const box = (c, ax, h, what) => ({ k: 'box', c, ax, h, what });
  const disc = (c, axis, R, w, what) => ({ k: 'disc', c, axis, R, w, what });
  /* del motor */
  wrap(L, 'bar', (cam, a, b, n, wdt) => seg(a, b, wdt / 2, 'barra'));
  wrap(L, 'plate', (cam, c, R, w) => disc(c, X, R, w, 'disco'));
  wrap(L, 'box', (cam, c, h) => box(c, [X, UP], h, 'caja'));
  wrap(L, 'barbell', (cam, c, grip) => {
    const P = x => add(c, [x, 0, 0]), out = [seg(P(-139), P(139), 2.6, 'barra')];
    [-1, 1].forEach(k => out.push(seg(P(k * 141), P(k * 222), 3.8, 'barra'), disc(P(k * 151), X, 49, 12, 'disco'), disc(P(k * 163), X, 40, 9, 'disco')));
    return out;
  });
  /* del material */
  wrap(GR, 'tube', (cam, a, b, w) => seg(a, b, w / 2, 'tubo'));
  wrap(GR, 'strap', (cam, pts, w) => pts.slice(1).map((p, i) => ({ ...seg(pts[i], p, w / 2, 'cinta'), soft: true })));
  wrap(GR, 'cableLine', (cam, a, b) => ({ ...seg(a, b, .7, 'cable'), soft: true }));
  wrap(GR, 'bandLoop', (cam, a, b, l0, dir = [0, 0, 1], sep = 3) => [-1, 1].map(k => ({ ...seg(add(a, mul(dir, k * sep)), add(b, mul(dir, k * sep * .45)), 1.4, 'banda'), soft: true })));
  wrap(GR, 'disc', (cam, c, axis, R, w) => disc(c, axis, R, w, 'disco'));
  wrap(GR, 'bandPath', (cam, pts, l0, dir = [0, 0, 1], sep = 3) => [-1, 1].flatMap(k => pts.slice(1).map((p, i) => ({ ...seg(add(pts[i], mul(dir, k * sep)), add(p, mul(dir, k * sep)), 1.4, 'banda'), soft: true }))));
  wrap(GR, 'obox', (cam, c, ax, h) => box(c, ax, h, 'caja'));
  wrap(GR, 'padAB', (cam, a, b, nrm, hw, ht) => { const u = norm(sub(b, a)), n = norm(nrm); return box(mix(a, b, .5), [cross(u, n), n], [hw, ht, len(sub(b, a)) / 2], 'banco'); });
  wrap(GR, 'leg', (cam, top, w = 5) => box([top[0], top[1] / 2, top[2]], [X, UP], [w, top[1] / 2, w], 'pata'));
  wrap(GR, 'dumbbell', (cam, c, axis, hand, o = {}) => {
    const a = norm(axis), hl = o.handle || 15, hw = o.w || 18, R = o.R || 14.5;
    return [-1, 1].map(s => disc(add(c, mul(a, s * (hl + hw / 2))), a, R, hw, 'mancuerna'));
  });
  wrap(GR, 'kettlebell', (cam, B, H, xa, hand, R = 20) => ({ k: 'ball', c: B, R, what: 'kettlebell' }));
  wrap(GR, 'sandbag', (cam, c, ax, hl, r) => { const a = norm(ax); return { ...seg(add(c, mul(a, -hl)), add(c, mul(a, hl)), r * .85, 'saco'), hug: true }; });
  wrap(GR, 'smithFrame', (cam, zr, xr = 128, top = 470) => [seg([xr, 6, zr], [xr, top, zr], 2.3, 'guía'), seg([-xr, 6, zr], [-xr, top, zr], 2.3, 'guía'), seg([xr, top + 6, zr], [-xr, top + 6, zr], 3.5, 'guía')]);
  wrap(GR, 'smithHooks', (cam, c, xr = 128) => [-1, 1].map(k => box([k * xr, c[1], c[2]], [X, UP], [8, 15, 8], 'carro')));
  wrap(GR, 'pulleyTower', (cam, base, h, to, o = {}) => {
    /* (con o.reach, la polea cuelga de un brazo que sale del poste: el cable sale de ahí, y el brazo también cuenta) */
    if (o.reach) {
      const d = norm([o.dir[0], 0, o.dir[2]]), end = add([base[0], h + 12, base[2]], mul(d, o.reach)), p = [end[0], h, end[2]];
      return [box([base[0], 235, base[2]], [X, UP], [9, 235, 9], 'poste'), seg([base[0], h + 12, base[2]], end, 2.5, 'brazo de la polea'), { ...seg(p, to, .7, 'cable'), soft: true }];
    }
    const p = [base[0] + (base[0] < 0 ? 14 : -14), h, base[2]];
    return [box([base[0], 235, base[2]], [X, UP], [9, 235, 9], 'poste'), { ...seg(p, to, .7, 'cable'), soft: true }];
  });
})(window);
