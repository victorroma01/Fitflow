/* ═══ extras/gear ═══
   El material de las figuras de ejercicio: bancos, asientos, poleas, máquinas, barras y aparatos, hechos con las piezas
   fijas de extras/rig (L trazo, P relleno, R almohadilla, C círculo, S placas). Cada función devuelve una lista de piezas
   para el material de una postura (extras/moves). El suelo está en y = 402; las medidas son las de la figura (el muslo
   mide 101; la pierna, 88; el tronco, 114).
   Define: FLOOR_Y, r1, dir, beam, pad, flatBench, bench, box, mat, wall, stackAt, tower, cable, smith, pullBar, dipBars, lever, wheel, ringsAt
*/
/* la altura del suelo */
const FLOOR_Y = 402;
const r1 = n => Math.round(n * 10) / 10;
const dir = a => [Math.sin(a * Math.PI / 180), -Math.cos(a * Math.PI / 180)];
/** Un tramo del armazón por los puntos dados: [x, y, x, y…]. */
export const beam = (pts, w, slot, tone) => ['L', slot || 'm', 'M' + pts.map((n, i) => (i && i % 2 == 0 ? 'L' : i ? ' ' : '') + r1(n)).join(''), w || 5, tone || 0];
/** Una almohadilla centrada en (x, y), de ancho w y alto h, girada a grados. */
export const pad = (x, y, w, h, a, slot) => ['R', slot || 'm', r1(x), r1(y), w, h, a || 0, 1];
/** Banco plano de x0 a x1 con el asiento a la altura top. */
export const flatBench = (x0, x1, top) => [beam([x0 + 26, top + 10, x0 + 26, 398], 5), beam([x1 - 30, top + 10, x1 - 30, 398], 5), beam([x0 + 12, 399.5, x0 + 40, 399.5], 5), beam([x1 - 44, 399.5, x1 - 16, 399.5], 5), pad((x0 + x1) / 2, top + 6, x1 - x0, 12)];
/** Banco regulable bajo un cuerpo con la cadera en (hx, hy) y el tronco inclinado lean grados (−90 tumbado, −55 inclinado,
    −8 sentado): respaldo a lo largo de la espalda, asiento y pie. len es lo que mide el respaldo; con prone, el cuerpo
    va boca abajo y el respaldo queda bajo el pecho. */
export const bench = (hx, hy, lean, len, prone) => {
  const u = dir(lean);
  /* hacia dónde mira el pecho */
  const chest = [-u[1], u[0]];
  const L = len || (lean < -75 ? 215 : 150);
  /* el respaldo va 30 por detrás de la línea cadera-hombro (boca abajo, por delante); tumbado, llega hasta bajo la cadera */
  const from = lean < -75 ? -24 : prone ? 22 : 8;
  const side = prone ? -1 : 1;
  const c = [hx + u[0] * (from + L / 2) - chest[0] * 30 * side, hy + u[1] * (from + L / 2) - chest[1] * 30 * side];
  const out = [];
  if (lean < -75) {
    const a = [c[0] - u[0] * (L / 2 - 30), c[1] - u[1] * (L / 2 - 30) + 6];
    const b = [c[0] + u[0] * (L / 2 - 30), c[1] + u[1] * (L / 2 - 30) + 6];
    out.push(beam([a[0], a[1], a[0], 398], 5), beam([b[0], b[1], b[0], 398], 5), beam([a[0] - 14, 399.5, a[0] + 14, 399.5], 5), beam([b[0] - 14, 399.5, b[0] + 14, 399.5], 5));
  }
  else {
    /* sentado o inclinado: asiento bajo los glúteos, una columna y la base */
    const sy = hy + 33;
    if (prone)
      out.push(beam([c[0], c[1], c[0], 398], 6), beam([c[0] - 34, 399.5, c[0] + 34, 399.5], 5));
    else
      out.push(beam([hx + 14, sy + 4, hx + 14, 398], 6), beam([hx - 22, 399.5, hx + 52, 399.5], 5), beam([c[0] - u[0] * (L / 2 - 14), c[1] - u[1] * (L / 2 - 14), hx + 10, sy + 6], 5), pad(hx + 20, sy, 62, 11));
  }
  out.push(pad(c[0], c[1], 12, L, lean));
  return out;
};
/** Cajón, escalón o tarima macizo, de x0 a x1 y de la altura top al suelo. */
export const box = (x0, x1, top, slot) => ['P', slot || 'm', 'M' + r1(x0) + ' ' + r1(top) + 'H' + r1(x1) + 'V' + FLOOR_Y + 'H' + r1(x0) + 'Z', 6];
/** Esterilla en el suelo. */
export const mat = (x0, x1) => ['R', 'b', (x0 + x1) / 2, FLOOR_Y - 2.5, x1 - x0, 5, 0, 6];
/** Pared en x, desde la altura top hasta el suelo. */
export const wall = (x, top) => ['P', 'b', 'M' + r1(x) + ' ' + r1(top || 0) + 'H' + r1(x + 14) + 'V' + FLOOR_Y + 'H' + r1(x) + 'Z', 6];
/** Placas de pesas con su guía, apoyadas en el suelo en x. */
export const stackAt = (x, top) => [['S', 'b', r1(x - 13), r1(top || 300), 26, FLOOR_Y - (top || 300) - 4]];
/** Torre de polea en x con la polea a la altura y (y, si out, desplazada hacia la figura): columna, base, placas y polea. */
export const tower = (x, y, out) => {
  const px = x + (out || 0);
  const parts = [beam([x, 26, x, 398], 7, 'b'), beam([x - 20, 399.5, x + 20, 399.5], 5, 'b')].concat(stackAt(x - (out > 0 ? 20 : -20), 250));
  if (out)
    parts.push(beam([x, y, px, y], 4, 'b'));
  parts.push(['C', 'b', r1(px), r1(y), 6.5, 5], ['C', 'b', r1(px), r1(y), 2, 2]);
  return parts;
};
/** El cable de una polea en (x, y) hasta el puño de delante (o hasta to), con su remate: h asa, r cuerda, b barra, s tobillera. */
export const cable = (x, y, end, to, slot) => ['link', slot || 'b', [r1(x), r1(y)], to || 'g', 1.3, 3, end || 'h'];
/** Máquina Smith: las guías por las que corre la barra, en x. */
export const smith = x => [beam([x, 30, x, 398], 4, 'b', 3), beam([x - 46, 30, x - 46, 398], 6, 'b'), beam([x - 46, 30, x + 6, 30], 5, 'b'), beam([x - 62, 399.5, x + 22, 399.5], 5, 'b')];
/** Barra de dominadas a la altura y, vista de punta, con su soporte: un poste a out por detrás (46 si no se dice) y un
    brazo que llega hasta ella. Colgado de ella, el poste va bien atrás, que no parezca que el cuerpo baja pegado a él. */
export const pullBar = (x, y, out) => {
  const p = x - (out || 46);
  return [beam([p, y - 12, p, 398], 6, 'b'), beam([p, y - 12, x - 6, y - 12, x, y], 5, 'b'), beam([p - 16, 399.5, p + 16, 399.5], 5, 'b'), ['C', 'f', r1(x), r1(y), 3.6, 2]];
};
/** Paralelas a la altura y, centradas en x. */
export const dipBars = (x, y) => [beam([x - 30, y, x + 34, y], 5, 'b', 3), beam([x - 24, y, x - 24, 398], 5, 'b'), beam([x + 28, y, x + 28, 398], 5, 'b'), beam([x - 40, 399.5, x + 44, 399.5], 5, 'b')];
/** La palanca de una máquina, del eje (x, y) a to ('g' el puño, o un punto de una pieza), con su remate. */
export const lever = (x, y, to, end, slot, w) => ['link', slot || 'm', [r1(x), r1(y)], to || 'g', w || 4.5, 0, end || ''];
/** Una rueda (polea, volante, rueda abdominal) en (x, y). */
export const wheel = (x, y, r, slot, tone) => ['C', slot || 'm', r1(x), r1(y), r, tone == null ? 5 : tone];
/** Anillas o correas que cuelgan de (x, y) hasta los puños. */
export const ringsAt = (x, y) => [['link', 'b', [x, y], 'G', 1.6, 3, ''], ['link', 'f', [x, y], 'g', 1.6, 3, 'b']];
