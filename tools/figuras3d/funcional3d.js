/* ═══ figuras 3D: CrossFit, Hyrox y funcional (lote 7) ═══
   Halterofilia (cargadas, arrancadas, envión, thruster, push press y jerks, con barra y con mancuernas), kettlebell (swings,
   cargadas, arrancada, get-up, windmill y halo), acarreos (granjero, rack, saco al hombro y abrazado, cargadas del saco y de
   la mochila, saco por encima del hombro, pinza con discos), trineo (empuje, arrastre hacia atrás y tirón con cuerda),
   burpees (y devil press, sprawl, por encima de la barra, del cajón y con salto adelante), wall balls, balón medicinal (slam
   y lanzamientos), box jump y saltos laterales, muscle-ups (anillas y barra), trepa de cuerda, pino y flexiones en pino,
   gateos (oso y cangrejo), inchworm, press Svend, battle ropes y volteo de neumático.
   Las mismas reglas que el resto: lo que se apoya toca el suelo o el material con el grosor del dibujo, sin hundirse ni
   flotar; lo que no se mueve no se mueve, y nada atraviesa el cuerpo ni el material. Usa lo de brazos3d.js (F3.blib) y lo de
   core3d.js (F3.clib).
   Define: Fig3D.FAMILIES.oly, .kbell, .carry, .sled, .burpee, .wallBall, .medBall, .boxJump, .sideJump, .muscleUp,
   .ropeClimb, .handstand, .crawl, .inchworm, .svend, .ropes, .tire */
(function (G) {
  const F3 = G.Fig3D, L = F3.lib, GR = F3.gear, M = F3.mlib, B = F3.blib, C = F3.clib;
  const { add, sub, mul, dot, cross, len, norm, perp, mix, ease, clamp, at, RAD, LEN, barbell } = L;
  const { has, pose, torso, ZERO, UP, sd, both, shoulder, span, comOf, midFoot, solve, legFront, prof1, SHIN_F } = M;
  const { ROOT_Y, LU, LF, mj, hintL, keys, cycle } = B;
  const { cos, sin, PI, abs, max, min, sqrt, atan2, asin } = Math;
  const DEG = 180 / PI;

  /* ── el ritmo ── */
  /* una curva suave que pasa por los valores de K ([t, valor]) sin pasarse de ellos: donde el valor da la vuelta (o se queda
     igual) se para, y donde sigue en el mismo sentido pasa de largo sin frenar (interpolación cúbica monótona) */
  const spl = (t, K) => {
    const n = K.length;
    if (t <= K[0][0]) return K[0][1];
    if (t >= K[n - 1][0]) return K[n - 1][1];
    let i = 1; while (K[i][0] < t) i++;
    const sl = j => { if (j <= 0 || j >= n - 1) return 0; const a = (K[j][1] - K[j - 1][1]) / (K[j][0] - K[j - 1][0]), b = (K[j + 1][1] - K[j][1]) / (K[j + 1][0] - K[j][0]); return a * b <= 0 ? 0 : 2 * a * b / (a + b); };
    const [x0, y0] = K[i - 1], [x1, y1] = K[i], h = x1 - x0, s = (t - x0) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y0 + (s3 - 2 * s2 + s) * h * sl(i - 1) + (3 * s2 - 2 * s3) * y1 + (s3 - s2) * h * sl(i);
  };
  /* un gesto hecho de tramos: cada uno, la postura a la que llega, lo que tarda (ms) y cuánto cambia la figura (du: lo que
     avanza t). Así t avanza parejo con lo que se ve (y las comprobaciones lo miran a pasos iguales) y el reloj pone el ritmo:
     lento al bajar, explosivo en el tirón. Devuelve la postura en t (cada número por su curva) y el reloj */
  const sequence = (start, segs) => {
    const tot = segs.reduce((a, s) => a + s[2], 0), K = [[0, start]], CL = [];
    let acc = 0;
    for (const [st, ms, du] of segs) { acc += du; K.push([acc / tot, st]); CL.push([acc / tot, ms]); }
    const fields = Object.keys(start), tabs = {};
    for (const [, st] of K) for (const f of fields) if (typeof st[f] != 'number' || isNaN(st[f])) throw new Error('postura sin ' + f);
    for (const f of fields) tabs[f] = K.map(([t, s]) => [t, s[f]]);
    const T = CL.reduce((a, c) => a + c[1], 0);
    return {
      at: t => { const o = {}; for (const f of fields) o[f] = spl(t, tabs[f]); return o; },
      beat: ms => { let x = ms % T, t0 = 0; for (const [t1, d] of CL) { if (x < d) return t0 + (t1 - t0) * x / d; x -= d; t0 = t1; } return 1; },
      keyT: K.map(k => k[0]),
    };
  };

  /* una postura entre dos (cada número, mezclado) */
  const mix2 = (a, b, k) => { const o = {}; for (const f of Object.keys(a)) o[f] = a[f] + (b[f] - a[f]) * k; return o; };

  /* ── de pie, con los dos pies en el suelo ── */
  /* el pie con el talón levantado p grados (de puntillas) sin que se mueva la bola del pie: el tobillo sube y se adelanta a lo
     largo del pie (con la punta girada toe hacia fuera). Lo que va en la postura: x, z, giro, altura del tobillo, inclinación */
  const footUp = (w, z, toe, p = 0) => {
    const r = RAD(p), d = [sin(RAD(toe)), 0, cos(RAD(toe))], ku = 19.8 * (cos(r) - 1) + 25 * sin(r), kd = 19.8 * sin(r) + 25 * (1 - cos(r));
    return [w + d[0] * kd, z + d[2] * kd, toe, ku, p];
  };
  /* la cadera (la raíz) con el tobillo en A: la espinilla ps grados hacia la punta del pie y el muslo pt grados sobre la
     horizontal (como legRoot, con el tobillo donde quede) */
  const legRootA = (A, toe, ps, pt) => {
    const w = A[0], d = [sin(RAD(toe)), 0, cos(RAD(toe))], lat = -(w - 20) / (LEN.thigh + LEN.shin) * max(0, 1 - ps / 15);
    const K = add(A, mul(norm(add(mul(d, sin(RAD(ps))), [lat, cos(RAD(ps)), 0])), LEN.shin));
    const dx = 20 - K[0], vy = min(LEN.thigh * sin(RAD(pt)), sqrt(max(0, LEN.thigh ** 2 - dx * dx)) - .05);
    return [0, K[1] + vy, K[2] - sqrt(max(0, LEN.thigh ** 2 - dx * dx - vy * vy))];
  };
  const legsAt = (w, toe, ps, pt, heel = 0, z = 0) => { const f = footUp(w, z, toe, heel); return legRootA([f[0], LEN.ankle + f[3], f[1]], toe, ps, pt); };
  /* la postura de pie: cada número de la tabla (los dos pies por separado: ancho, adelante, giro, talón y despegue; la raíz, el
     tronco y los hombros). Las rodillas, hacia donde apuntan los pies */
  const BASE = { wL: 26, wR: 26, zL: 0, zR: 0, toeL: 10, toeR: 10, pL: 0, pR: 0, lL: 0, lR: 0, ry: ROOT_Y, rz: 0, tilt: 0, spine: 0, neck: 0, shrug: 0, reach: 0, twist: 0, bend: 0 };
  const qOf = s => {
    const ft = (w, z, toe, p, l) => { const f = footUp(w, z, toe, p); f[3] += l; return f; };
    const kh = toe => [sin(RAD(toe)), 0, cos(RAD(toe))];
    return {
      root: [0, s.ry, s.rz], tilt: s.tilt, spine: s.spine, neck: s.neck, shrug: s.shrug, reach: s.reach, twist: s.twist, bend: s.bend,
      feet: { L: ft(s.wL, s.zL, s.toeL, s.pL, s.lL), R: ft(s.wR, s.zR, s.toeR, s.pR, s.lR) }, knee: { L: kh(s.toeL), R: kh(s.toeR) },
    };
  };
  /* una postura simétrica: los pies (ancho, giro, talón), la espinilla y el muslo (por legRoot) y el resto */
  const legs = (o, extra = {}) => {
    const r = legsAt(o.w, o.toe, o.ps, o.pt, o.heel || 0);
    return { ...BASE, wL: o.w, wR: o.w, toeL: o.toe, toeR: o.toe, pL: o.heel || 0, pR: o.heel || 0, ry: r[1], rz: r[2], ...extra };
  };

  /* ── la barra en el tirón ── */
  /* el frente de la espinilla a la altura y (con la espinilla ps grados hacia delante): lo que no puede pasar la barra */
  const shinFront = (y, ps, toe) => { const hy = y - LEN.ankle, c = cos(RAD(ps)), d = clamp(LEN.shin - hy / c, -8, 92); return hy * Math.tan(RAD(ps)) * cos(RAD(toe)) + prof1(SHIN_F, d) / c; };
  /* la postura del tirón con la barra en (y, z) y la espinilla a ps grados: el hombro, donde los brazos estirados llegan a la
     barra (con las manos a g del centro) quedando ahead por delante de ella; la cadera, donde se cortan el arco que le deja el
     muslo desde la rodilla y el que le deja el tronco (con la columna doblada spine) desde el hombro. Sin buscar: es la
     intersección de dos circunferencias */
  const pullFit = (P, y, z, ps, ahead, spine, shrug = 0, reach = 3) => {
    const d = [sin(RAD(P.toe)), 0, cos(RAD(P.toe))], lat = -(P.w - 20) / (LEN.thigh + LEN.shin) * max(0, 1 - ps / 15);
    const K = add([P.w, LEN.ankle, 0], mul(norm(add(mul(d, sin(RAD(ps))), [lat, cos(RAD(ps)), 0])), LEN.shin)), dx = 20 - K[0], rho = sqrt(LEN.thigh ** 2 - dx * dx);
    const r = sqrt(145 ** 2 - (P.g - 47) ** 2), Sy = y + sqrt(r * r - ahead * ahead), Sz = z + ahead;
    const c = cos(RAD(spine)), s = sin(RAD(spine)), a = [80 + shrug, -2 + reach], v = [45 + a[0] * c - a[1] * s, -2 + a[0] * s + a[1] * c], D = Math.hypot(v[0], v[1]);
    const ey = Sy - K[1], ez = Sz - K[2], dd = Math.hypot(ey, ez), aa = (rho * rho - D * D + dd * dd) / (2 * dd), h = sqrt(max(0, rho * rho - aa * aa));
    const my = K[1] + aa * ey / dd, mz = K[2] + aa * ez / dd, H1 = [my - h * ez / dd, mz + h * ey / dd], H2 = [my + h * ez / dd, mz - h * ey / dd], H = H1[1] < H2[1] ? H1 : H2;
    const tilt = (atan2(Sz - H[1], Sy - H[0]) - atan2(v[1], v[0])) * DEG;
    return { ...BASE, wL: P.w, wR: P.w, toeL: P.toe, toeR: P.toe, ry: H[0], rz: H[1], tilt, spine, neck: -.45 * (tilt + spine), shrug, reach };
  };
  /* la espinilla más adelantada con la que la barra, a la altura y sobre el medio del pie, aún pasa por delante */
  const psMax = (P, y, zb) => { const f = p => shinFront(y, p, P.toe) - (zb - 4.6); return f(-10) > 0 ? -10 : f(30) < 0 ? 30 : solve(f, -10, 30); };

  /* ── lo que hacen los brazos con la barra ── */
  /* colgando, con los brazos estirados: la barra a la altura que llegan con ella en z, por delante de las piernas (y del
     tronco, si está erguido) con su grosor */
  const hangBar = (F, J, q, hz, g, k = 145) => {
    const S = shoulder(F, 'L', q), r = sqrt(max(1, k * k - (g - S[0]) ** 2));
    let z = hz, y = 0;
    for (let i = 0; i < 3; i++) { y = S[1] - sqrt(max(0, r * r - (z - S[2]) ** 2)); z = max(hz, B.frontAt(F, J, y) + 4.4); }
    return [0, S[1] - sqrt(max(0, r * r - (z - S[2]) ** 2)), z];
  };
  /* arriba, con los brazos bloqueados: la barra sobre el medio de los pies */
  const overBar = (F, q, g, k = 146) => {
    const S = mix(shoulder(F, 'L', q), shoulder(F, 'R', q), .5), m = mix(at(F.footL, [0, 0, 14]), at(F.footR, [0, 0, 14]), .5), r = sqrt(k * k - (g - 47) ** 2);
    return [0, S[1] + sqrt(max(0, r * r - (m[2] - S[2]) ** 2)), m[2]];
  };
  /* los pesos de lo que hacen los brazos (colgando, tirón alto, en los hombros, arriba), normalizados */
  const wts = s => { const a = [s.mH, s.mP, s.mR, s.mO].map(v => max(0, v)), k = a.reduce((x, y) => x + y, 0) || 1; return a.map(v => v / k); };
  const EL = [[.3, .1, -1], [1, .75, -.25], [.2, -.3, 1], [.45, 0, -1]];
  /* la muñeca: con la barra en los hombros, doblada hacia atrás (el puño encima, el antebrazo hacia delante); en lo demás,
     siguiendo al antebrazo. Entre medias, mezclado: así no salta */
  const rackHand = (F, s) => norm(sub(at(F.thorax, sd(s, [.4, 1, -.2])), F.thorax.o));
  const wristMix = (q, w) => {
    if (w <= 0) return q;
    w = min(1, 3.5 * w);
    const { F, J } = pose(q), o = {};
    for (const s of ['L', 'R']) o[s] = norm(mix(norm(sub(J[s].fist, J[s].el)), rackHand(F, s), w));
    return { ...q, handDir: o };
  };

  /* la barra (o lo que se lleve delante) fuera del tronco: en el marco del tórax y en el de la pelvis, si queda dentro de su
     sección a esa altura (una elipse, la del dibujo), se adelanta lo justo para pasar por delante con su grosor */
  const clearTrunk = (F, c, r = 4.4) => {
    for (const [fr, top, lo, hi] of [[F.thorax, 160, 56, 160], [F.pelvis, 205, 160, 228]]) {
      const d = sub(c, fr.o), v = top - dot(d, fr.y), z = dot(d, fr.z);
      if (v < lo || v > hi) continue;
      const p = B.prof(L.TRUNK3, v), front = p[3] + p[2] + r;
      if (z < front && z > p[3] - p[2]) c = add(c, mul(fr.z, front - z));
    }
    return c;
  };
  /* la barra olímpica (como barbell), con los discos que se aclaran en la vista de lado para que dejen ver el cuerpo */
  const olyBar = (cam, c, grip) => {
    const X = x => add(c, [x, 0, 0]), out = [];
    let spans = [[-139, 139]];
    [[-grip - 8, -grip + 8], [grip - 8, grip + 8]].forEach(([a, b]) => { spans = spans.flatMap(([u, v]) => b <= u || a >= v ? [[u, v]] : [[u, a], [b, v]].filter(([m, n]) => n - m > 1)); });
    spans.forEach(([u, v]) => {
      const it = L.bar(cam, X(u), X(v), max(1, Math.round((v - u) / 18)), 5.2);
      [[u, 0], [v, it.length - 1]].forEach(([e, i]) => { if (abs(abs(e) - grip) < 9) it[i].hand = e > 0 ? 'L' : 'R'; });
      out.push(...it);
    });
    [-1, 1].forEach(k => {
      out.push(...L.bar(cam, X(k * 141), X(k * 222), 4, 7.6));
      out.push(...GR.sideFade([L.plate(cam, X(k * 140), 6.5, 3.5, true), L.plate(cam, X(k * 151), 49, 12), L.plate(cam, X(k * 163), 49, 9), L.plate(cam, X(k * 171), 7.5, 5, true), L.plate(cam, X(k * 221.5), 3.8, 1, true)]));
    });
    return out;
  };

  /* ════ halterofilia ════ */
  const oly = f => {
    const w = x => has(f, x);
    const db = w('db'), one = w('one'), snatch = w('snatch'), thruster = w('thruster'), cj = w('cj'), pull = w('pull');
    const jerkOnly = w('jerk'), hang = w('hang'), power = w('power'), muscle = w('muscle');
    const cleanLift = w('clean') || cj, splitJ = w('split') || cj, pressJ = w('press'), pushJ = w('push');
    if (db) return olyDb(f);
    /* el agarre: el de la cargada, justo por fuera de las piernas; el de la arrancada, muy abierto. Los pies: al ancho de la
       cadera para tirar y algo más abiertos (y más girados) para recibir */
    const P = snatch ? { w: 27, toe: 11, g: 112 } : { w: 26, toe: 10, g: 58 }, g = P.g, Pc = snatch ? { w: 33, toe: 20 } : { w: 31, toe: 18 };
    const zb = 16.5;
    const rack = (o = {}) => ({ mH: 0, mP: 0, mR: 1, mO: 0, hz: zb, ...o });
    const hangM = (o = {}) => ({ mH: 1, mP: 0, mR: 0, mO: 0, hz: zb, ...o });
    const overM = (o = {}) => ({ mH: 0, mP: 0, mR: 0, mO: 1, hz: zb, ...o });
    /* el tirón: la barra en el suelo (sobre el medio del pie, con las espinillas rozándola), a la altura de las rodillas (las
       espinillas ya verticales) y en mitad de los muslos (las rodillas, otra vez algo adelante: el segundo tirón) */
    const yF = 49, sF = pullFit(P, yF, zb, min(snatch ? 13 : 11, psMax(P, yF, zb)), snatch ? 6 : 9, -3);
    const sFloor = { ...sF, ...hangM() };
    const sKnee = { ...pullFit(P, 114, zb, 0, snatch ? 6 : 9, -3), ...hangM() };
    const sThigh = { ...pullFit(P, snatch ? 158 : 148, zb + 2, 7, 1, -2), ...hangM() };
    /* la extensión: piernas estiradas y de puntillas, el tronco algo echado atrás, los hombros encogidos y los brazos aún
       estirados: la barra pegada a la cadera (en la arrancada, en el pliegue de la cadera) */
    const sExt = legs({ ...P, ps: -2, pt: 90, heel: 30 }, { tilt: -9, spine: -4, neck: 4, shrug: 10, reach: 0, ...hangM({ hz: zb + 4 }) });
    /* el tirón por debajo: los pies despegan un poco y se abren, el cuerpo baja y la barra sigue subiendo pegada (los codos,
       altos y por fuera) */
    const sUnder = legs({ w: (P.w + Pc.w) / 2, toe: (P.toe + Pc.toe) / 2, ps: 10, pt: 70 }, { lL: 6, lR: 6, toeL: (P.toe + Pc.toe) / 2, tilt: -2, spine: -2, neck: 2, shrug: 8, mH: 0, mP: 1, mR: 0, mO: 0, hz: zb });
    /* la recepción: en los hombros (cargada) o arriba con los brazos bloqueados (arrancada); en sentadilla completa o en media */
    const catchLegs = deep => deep ? { ...Pc, ps: snatch ? 40 : 38, pt: snatch ? -10 : -8 } : { ...Pc, ps: 20, pt: 46 };
    const deep = !power && !w('powerless');
    const sCatchR = d => legs(catchLegs(d), { tilt: d ? 17 : 9, spine: d ? 7 : 3, neck: d ? -14 : -6, shrug: 4, reach: 10, ...rack() });
    const sCatchO = d => legs(catchLegs(d), { tilt: d ? 14 : 8, spine: d ? 5 : 2, neck: d ? 6 : 2, shrug: 7, reach: 0, ...overM() });
    /* de pie al terminar (con los pies aún abiertos) y los pies que vuelven, de uno en uno, al ancho del tirón */
    const standR = (o = {}) => legs({ ...Pc, ps: 2, pt: 88 }, { tilt: 1, spine: 0, neck: -2, shrug: 3, reach: 8, ...rack(), ...o });
    const standO = (o = {}) => legs({ ...Pc, ps: 2, pt: 88 }, { tilt: 1, spine: 1, neck: 4, shrug: 7, reach: 0, ...overM(), ...o });
    const standP = (o = {}) => legs({ ...P, ps: 2, pt: 88 }, { tilt: 1, spine: 0, neck: -2, shrug: 3, reach: 8, ...rack(), ...o });
    /* la barra bajada hasta los muslos, de pie, y de ahí al suelo (el tirón al revés) */
    const sHangTop = legs({ ...P, ps: 3, pt: 86 }, { tilt: 4, spine: -2, neck: -2, shrug: 0, reach: 2, ...hangM({ hz: zb + 4 }) });
    const lower = [[sHangTop, 650, 1], [sThigh, 380, .7], [sKnee, 340, .7], [sFloor, 420, .8], [sFloor, 450, .15]];
    /* un paso: el pie side va de donde está a o (ancho, adelante, giro, talón), despegándose a mitad de camino */
    const stepTo = (s, side, o, ms = 200, body = {}) => {
      const k = side, to = {}; for (const [f, v] of Object.entries(o)) to[f + k] = v;
      const mid = { ...s, ...Object.fromEntries(Object.entries(to).map(([f, v]) => [f, (s[f] + v) / 2])), ['l' + k]: 8, ...Object.fromEntries(Object.entries(body).map(([f, v]) => [f, (s[f] + v) / 2])) };
      const end = { ...s, ...to, ['l' + k]: 0, ...body };
      return [[mid, ms * .5, .3], [end, ms * .5, .3]];
    };
    const last = segs => segs[segs.length - 1][0];
    let seq, cam = [-38, 9];
    if (thruster) {
      /* el thruster: sentadilla frontal y, al subir, la barra arriba en el mismo gesto; baja a los hombros otra vez de pie */
      const PT = { w: 31, toe: 18 };
      const top = legs({ ...PT, ps: 2, pt: 88 }, { tilt: 1, spine: 0, neck: -2, shrug: 3, reach: 8, ...rack() });
      const bot = legs({ ...PT, ps: 38, pt: -8 }, { tilt: 17, spine: 7, neck: -14, shrug: 4, reach: 10, ...rack() });
      const mid = legs({ ...PT, ps: 18, pt: 50 }, { tilt: 8, spine: 3, neck: -8, shrug: 4, reach: 9, ...rack() });
      const drive = legs({ ...PT, ps: 2, pt: 90, heel: 10 }, { tilt: 0, spine: 0, neck: -6, shrug: 6, reach: 5, mH: 0, mP: 0, mR: .5, mO: .5, hz: zb });
      const ohS = legs({ ...PT, ps: 2, pt: 88 }, { tilt: 1, spine: 1, neck: 4, shrug: 7, reach: 0, ...overM() });
      seq = sequence(top, [[mid, 700, .6], [bot, 600, .6], [bot, 120, .12], [mid, 420, .6], [drive, 260, .7], [ohS, 260, .6], [ohS, 380, .15], [top, 650, .9], [top, 300, .12]]);
    }
    else {
      /* lo que va del suelo (o de los muslos) a la barra recibida */
      const start = jerkOnly && !cj ? standP() : hang ? sHangTop : sFloor;
      const segs = [];
      if (jerkOnly && !cj) segs.push([standP(), 450, .15]);
      else if (hang) segs.push([sHangTop, 450, .15], [{ ...pullFit(P, snatch ? 168 : 160, zb + 2, 6, 2, -2), ...hangM() }, 520, .6], [sExt, 150, .6]);
      else segs.push([sFloor, 450, .15], [sKnee, 480, 1], [sThigh, 260, .7], [sExt, 140, .6]);
      /* bajar la barra de arriba: por delante de la cara (hasta el pecho) y de ahí a los muslos */
      const fromOver = () => [[legs({ ...P, ps: 3, pt: 86 }, { tilt: 1, spine: 0, neck: -4, shrug: 4, reach: 4, mH: 0, mP: 1, mR: 0, mO: 0, hz: zb }), 520, .8], [sHangTop, 520, .8]];
      if (pull) {
        /* el tirón de cargada: hasta la extensión, con los brazos estirados, y de vuelta */
        segs.push([sExt, 160, .15], [sThigh, 420, .7], [sKnee, 380, .7], [sFloor, 420, .8], [sFloor, 400, .15]);
      }
      else if (muscle) {
        /* sin volver a flexionar las piernas: los codos suben altos y la barra gira hasta arriba con los brazos estirados */
        const hi = legs({ ...P, ps: 2, pt: 89, heel: 10 }, { tilt: -3, spine: -2, neck: -6, shrug: 8, reach: 2, mH: 0, mP: 1, mR: 0, mO: 0, hz: zb });
        const top = legs({ ...P, ps: 2, pt: 88 }, { tilt: 1, spine: 1, neck: 4, shrug: 7, reach: 0, ...overM() });
        segs.push([hi, 300, .8], [top, 340, .8], [top, 420, .15], ...fromOver(), ...lower.slice(1));
      }
      else {
        if (!(jerkOnly && !cj)) {
          const catchS = snatch ? sCatchO(deep) : sCatchR(deep), upS = snatch ? standO() : standR();
          segs.push([sUnder, 130, .6], [catchS, 200, .8], [catchS, 160, .12], [upS, deep ? 900 : 500, deep ? 1 : .6], [upS, 300, .12]);
          segs.push(...stepTo(last(segs), 'L', { w: P.w, toe: P.toe }, 260));
          segs.push(...stepTo(last(segs), 'R', { w: P.w, toe: P.toe }, 260));
        }
        if (jerkOnly || cj) {
          /* el envión: una flexión corta de piernas (el tronco vertical), el empuje de puntillas y la barra arriba: recibida con
             las piernas algo flexionadas (push jerk), en tijera (split jerk) o empujada solo con los brazos (push press) */
          const base = last(segs);
          const dip = { ...base, ...legs({ ...P, ps: 14, pt: 70 }), tilt: 0, spine: 0, neck: -2, shrug: 3, reach: 8 };
          const drive = { ...base, ...legs({ ...P, ps: 0, pt: 90, heel: 22 }), tilt: -1, spine: -1, neck: -6, shrug: 8, reach: 4, mH: 0, mP: 0, mR: .55, mO: .45 };
          const top = { ...legs({ ...P, ps: 2, pt: 88 }), tilt: 1, spine: 1, neck: 4, shrug: 7, reach: 0, ...overM() };
          segs.push([dip, 420, .45], [drive, 150, .5]);
          if (splitJ) {
            /* la tijera: el pie izquierdo adelante y el derecho atrás, de puntillas; la cadera baja entre los dos. Al recuperar,
               primero vuelve el de delante y luego el de atrás */
            const sp = { ...top, toeL: 4, toeR: 12, zL: 70, zR: -122, pR: 48, ry: ROOT_Y - 30, rz: 2, spine: 2, neck: 3 };
            const air = { ...mix2(drive, sp, .5), lL: 9, lR: 9, ry: ROOT_Y + 2, mR: .25, mO: .75 };
            segs.push([air, 110, .45], [sp, 120, .5], [sp, 160, .12]);
            segs.push(...stepTo(sp, 'L', { z: 0, toe: P.toe }, 380, { ry: ROOT_Y - 16, rz: -12 }));
            segs.push(...stepTo(last(segs), 'R', { z: 0, toe: P.toe, p: 0 }, 380, { ry: top.ry, rz: top.rz }));
            segs.push([top, 240, .2]);
          }
          else if (pushJ) {
            /* el push jerk: los pies saltan un poco hacia fuera y recibe la barra arriba en media sentadilla */
            const catchJ = { ...legs({ w: P.w + 4, toe: P.toe + 4, ps: 16, pt: 56 }), tilt: 2, spine: 1, neck: 3, shrug: 7, reach: 0, ...overM() };
            const air = { ...mix2(drive, catchJ, .5), lL: 6, lR: 6, mR: .2, mO: .8 };
            segs.push([air, 90, .35], [catchJ, 130, .45], [catchJ, 140, .12], [{ ...top, wL: P.w + 4, wR: P.w + 4, toeL: P.toe + 4, toeR: P.toe + 4 }, 520, .6]);
            segs.push(...stepTo(last(segs), 'L', { w: P.w, toe: P.toe }, 260), ...stepTo(last(segs), 'R', { w: P.w, toe: P.toe }, 260));
          }
          else segs.push([{ ...top, pL: 0, pR: 0 }, 320, .7]);
          /* baja a los hombros, con las piernas algo flexionadas para amortiguarla */
          segs.push([last(segs), 400, .15], [{ ...dip, ...legs({ ...P, ps: 9, pt: 78 }), tilt: 0, spine: 0, neck: -2, shrug: 3, reach: 8 }, 600, .9], [standP(), 380, .3]);
          if (!cj) segs.push([standP(), 300, .12]);
        }
        if (snatch) segs.push(...fromOver(), ...lower.slice(1));
        else if (!(jerkOnly && !cj)) segs.push([sHangTop, 650, 1], ...lower.slice(1));
      }
      seq = sequence(start, segs);
    }
    const BUMP = thruster || jerkOnly || cj ? 14 : 10;
    return {
      view: 'front', up: 'a', merge: false, cam, side: [-80, 4], beat: seq.beat, keyT: seq.keyT,
      at(t) {
        const s = seq.at(t), q0 = qOf(s), { F, J } = pose({ ...q0, hands: ZERO, elbow: {} }), [wH, wP, wR, wO] = wts(s);
        let c = [0, 0, 0];
        if (wH) c = add(c, mul(hangBar(F, J, q0, s.hz, g), wH));
        if (wP) c = add(c, mul(at(F.thorax, snatch ? [0, 94, 27] : [0, 70, 31]), wP));
        if (wR) c = add(c, mul(at(F.thorax, [0, 100, 18]), wR));
        if (wO) c = add(c, mul(overBar(F, q0, g), wO));
        /* al pasar de los hombros (o del tirón alto) a arriba, la barra rodea la cara por delante; de los hombros a los muslos,
           el pecho. Y nunca dentro del tronco */
        c = clearTrunk(F, add(add(c, mul(F.thorax.z, BUMP * 4 * (wR + wP) * wO + 22 * 4 * wR * wH)), mul(F.thorax.y, 14 * 4 * wP * wR)));
        /* (los codos llegan a su sitio antes que la barra: en la cargada, se meten por delante deprisa) */
        const kR = 1 + 3 * min(1, 4 * wP), el = norm([0, 1, 2].map(i => EL[0][i] * wH + EL[1][i] * wP + EL[2][i] * wR * kR + EL[3][i] * wO));
        const q = { ...q0, barC: c, grip: g, hands: { L: add(c, [g, 0, 0]), R: add(c, [-g, 0, 0]) }, elbow: both(() => el) };
        return wristMix(q, wR);
      },
      gear: (q, F, cam) => olyBar(cam, q.barC, q.grip),
    };
  };
  const olyDb = f => null;

  const stub = () => null;
  Object.assign(F3.FAMILIES, { oly, kbell: stub, carry: stub, sled: stub, burpee: stub, wallBall: stub, medBall: stub, boxJump: stub, sideJump: stub, muscleUp: stub, ropeClimb: stub, handstand: stub, crawl: stub, inchworm: stub, svend: stub, ropes: stub, tire: stub });
  F3.flib = { spl, sequence, footUp, legRootA, legsAt, qOf, legs, BASE };
})(window);
