# La página de revisión del lote 1: sentadillas, press de banca y press de hombro, con la figura 3D de cada ejercicio.
# Antes: node datos.mjs && python3 banco.py. Deja la página en salida/pagina/index.html
import json, os, html
from playwright.sync_api import sync_playwright

MAP = open('salida/mapa.json').read()
REG = open('salida/regiones.txt').read().strip()
JS = '\n'.join(open(f, encoding='utf-8').read() for f in ('fig3d.js', 'gear3d.js', 'mov3d.js'))
LOTE = json.load(open('salida/lote.json'))
SIDE = (-80, 4)

NOTES = {
    'Sentadilla': 'Barra alta, sobre los trapecios. Baja hasta que la cadera pasa por debajo de la rodilla, con las rodillas hacia las puntas de los pies; la barra no se sale de la vertical del medio del pie.',
    'Sentadilla frontal': 'La barra sobre la parte delantera de los hombros, con los codos altos y hacia delante. El tronco queda casi vertical y la barra, sobre el medio del pie.',
    'Sentadilla en Smith': 'La barra va por las guías. Los pies, algo por delante de la barra; el tronco se inclina lo justo para que la barra no se salga de su recorrido.',
    'Sentadilla con pausa': 'Como la sentadilla, con una parada de casi un segundo abajo.',
    'Sentadilla en caja': 'Pies más abiertos: se sienta atrás hasta tocar la caja con el muslo paralelo y las espinillas casi verticales.',
    'Sentadilla Zercher': 'La barra en el pliegue de los codos, delante del vientre, y las manos juntas a la altura de la barbilla. Tronco erguido.',
    'Sentadilla con barra de seguridad': 'El yugo acolchado sobre los trapecios y las asas hacia delante; los extremos de la barra bajan por delante, con los discos.',
    'Sentadilla con mancuernas': 'Una mancuerna en cada mano, colgando a los lados, con las palmas hacia dentro.',
    'Sentadilla goblet con mancuerna': 'La mancuerna de pie delante del pecho, sujeta por la cabeza de arriba con las dos manos; los codos, hacia abajo.',
    'Sentadilla sumo con mancuerna': 'Pies muy abiertos y puntas hacia fuera; la mancuerna cuelga entre las piernas, cogida por arriba con las dos manos.',
    'Sentadilla con bandas': 'La banda pisada por el medio de los pies y las asas a la altura de los hombros.',
    'Hack squat en Smith': 'En la Smith con los pies bastante adelantados: el tronco, casi vertical, y las rodillas avanzan mucho.',
    'Overhead squat': 'La barra arriba con los brazos estirados y el agarre muy abierto, siempre sobre el medio del pie; el tronco, erguido.',
    'Goblet squat': 'La kettlebell cogida por los dos lados del asa, delante del pecho, con la bola hacia abajo.',
    'Sentadilla goblet con pausa': 'Como la goblet con kettlebell, con una parada abajo.',
    'Sandbag squat': 'El saco apoyado en los pliegues de los codos, contra el pecho, y las manos agarrándolo por arriba.',
    'Sentadilla con salto': 'Desde abajo con los brazos atrás: se estira del todo, despega con los brazos arriba y vuelve a caer en la sentadilla.',
    'TRX sentadilla': 'Agarrado a las asas con los brazos estirados hacia el anclaje: el TRX sostiene y deja bajar con el tronco más erguido.',
    'Press banca': 'Agarre de vez y media el ancho de los hombros. La barra baja hasta tocar la parte baja del pecho con los antebrazos casi verticales y sube hasta quedar sobre los hombros.',
    'Press banca mancuernas': 'Las mancuernas bajan a los lados del pecho, algo más hondo que la barra, con los antebrazos verticales; arriba, casi juntas sobre los hombros.',
    'Press banca en Smith': 'La barra sube y baja en vertical por las guías, sobre el pecho: arriba, los brazos quedan algo hacia los pies.',
    'Press banca agarre neutro mancuernas': 'Las palmas, una frente a otra, y los codos más pegados al cuerpo.',
    'Press en suelo con barra': 'Tumbado en el suelo con las rodillas dobladas: la barra baja hasta que los brazos se apoyan en el suelo, sin llegar al pecho.',
    'Press en suelo con mancuernas': 'En el suelo con mancuernas: abajo, los codos se apoyan en el suelo.',
    'Press banca con pausa': 'Como el press de banca, con una parada con la barra en el pecho.',
    'Press banca agarre ancho': 'Agarre muy abierto: la barra toca algo más arriba en el pecho y los codos se abren más.',
    'Press banca con bandas': 'Una banda en cada extremo de la barra, sujeta al suelo: se estira al subir.',
    'Press banca unilateral con mancuerna': 'Con la mano derecha; la izquierda, abierta sobre el vientre.',
    'Press inclinado mancuernas': 'Banco a unos 38°: las mancuernas bajan a los lados de la parte alta del pecho.',
    'Press inclinado barra': 'Banco a unos 38°: la barra toca la parte alta del pecho, bajo las clavículas, y sube en vertical hasta quedar sobre los hombros.',
    'Press inclinado en Smith': 'Inclinado en la Smith: la barra va en vertical por las guías, sobre la parte alta del pecho.',
    'Press inclinado agarre neutro mancuernas': 'Inclinado, con las palmas una frente a otra.',
    'Press inclinado 30° mancuernas': 'Banco a 30°, algo menos inclinado que en los demás.',
    'Press inclinado unilateral mancuerna': 'Inclinado, con la mano derecha; la izquierda, sobre el vientre.',
    'Press inclinado con pausa': 'Inclinado con barra, con una parada en el pecho.',
    'Press banca declinado': 'Banco declinado unos 18°, con las piernas sujetas en los rodillos; la barra toca la parte baja del pecho.',
    'Press declinado mancuernas': 'Declinado, con mancuernas.',
    'Press declinado en Smith': 'Declinado en la Smith: en vertical por las guías.',
    'Press cerrado': 'Agarre al ancho de los hombros y codos pegados: la barra toca más abajo en el pecho.',
    'Press cerrado mancuernas': 'Las dos mancuernas juntas, apretadas una contra otra sobre el pecho, con los codos pegados.',
    'Press cerrado en Smith': 'Agarre cerrado en la Smith.',
    'Press cerrado con barra Z': 'Agarre cerrado en las curvas de la barra Z.',
    'Press JM': 'Agarre cerrado: la barra baja hacia la barbilla con los codos hacia los pies, a medio camino entre un press cerrado y un press francés.',
    'Press hombro mancuernas': 'Sentado con respaldo: las mancuernas salen a la altura de las orejas, con los antebrazos verticales, y suben hasta estirar los brazos sobre los hombros.',
    'Press militar barra': 'De pie: la barra sale de lo alto del pecho, pasa por delante de la cara con la cabeza un poco atrás y acaba sobre la cabeza.',
    'Press Arnold': 'Empieza con las mancuernas delante de la cara y las palmas hacia uno; al subir, abre los codos y gira las muñecas hasta acabar como en el press normal.',
    'Press hombro máquina': 'Sentado en la máquina: las asas suben por el arco de sus palancas.',
    'Press hombro unilateral': 'De pie, con la mano derecha; el otro brazo, relajado.',
    'Press landmine': 'La barra apoyada en el suelo por delante: la mano sube y avanza por su arco hasta estirar el brazo, con el pie contrario adelantado.',
    'Press militar sentado con barra': 'Como el press militar, sentado y con respaldo.',
    'Press hombro en Smith': 'Sentado en la Smith: la barra sube en vertical por delante de la cara.',
    'Press hombro con kettlebell': 'La kettlebell en la posición de rack, apoyada por fuera del antebrazo; sube hasta arriba con la palma hacia delante.',
    'Press hombro en polea': 'De pie junto a la polea baja, con una mano: el cable sube de la polea al asa.',
    'Press hombro sentado agarre neutro': 'Sentado, con las palmas una frente a otra y los codos más adelantados.',
    'Press hombro con bandas': 'De pie sobre la banda: las asas suben desde los hombros hasta arriba.',
    'Press hombro con pausa': 'Sentado con mancuernas, con una parada abajo.',
    'Landmine press': 'Como el press landmine.',
}
missing = [e['n'] for e in LOTE if e['n'] not in NOTES]
assert not missing, missing

# los encuadres de cada figura (de tres cuartos y de lado), calculados una vez: así la página no tiene que dibujar el gesto
# entero para encuadrar cada tarjeta al abrirse
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.goto('file://' + os.path.abspath('salida/banco.html')); pg.wait_for_timeout(300)
    VB = pg.evaluate('''(side) => { const out = {}, ts = [0, .125, .25, .375, .5, .625, .75, .875, 1];
      for (const [n, ex] of Object.entries(EXS)) out[n] = { cam: fit(boxOf(ex, Fig3D.camera(ex.yaw, ex.pitch), ts)).map(v => +v.toFixed(1)).join(' '), side: fit(boxOf(ex, Fig3D.camera(side[0], side[1]), ts)).map(v => +v.toFixed(1)).join(' ') };
      return out; }''', list(SIDE))
    b.close()

FAMS = [('squat', 'Sentadillas', 'Los pies no se mueven del suelo y el tronco se inclina lo justo para que el peso quede sobre el medio del pie; con barra, la barra baja en vertical.'),
        ('press', 'Press de banca', 'La barra (o las mancuernas) toca el pecho con los antebrazos casi verticales y acaba sobre los hombros. Plano, inclinado, declinado y en el suelo.'),
        ('overhead', 'Press de hombro', 'De la altura de los hombros a estirar los brazos sobre la cabeza, de pie o sentado con respaldo.')]
e = html.escape
def card(i, x):
    n = x['n']
    return (f'<article class="card" id="c{i}" data-ex="{e(n)}"><div class="media" tabindex="0" role="button" aria-label="{e(n)}: ver en grande">'
            f'<svg class="stage" viewBox="{VB[n]["cam"]}" role="img" aria-label="{e(n)}"><g></g></svg></div>'
            f'<div class="cbody"><h3>{e(n)}</h3><p class="note">{e(NOTES[n])}</p>'
            f'<div class="mini" role="group" aria-label="{e(n)}: vista"><button type="button" data-v="cam" aria-pressed="true">3/4</button><button type="button" data-v="side" aria-pressed="false">Lado</button></div></div></article>')
sections, i = '', 0
for key, title, lede in FAMS:
    xs = [x for x in LOTE if x['w'].split(' ')[0] == key]
    cards = ''
    for x in xs:
        cards += card(i, x); i += 1
    sections += f'<section class="fam"><div class="fhead"><h2>{title} <span>{len(xs)}</span></h2><p>{lede}</p></div><div class="grid">{cards}</div></section>'

HTML = r'''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Figuras 3D · lote 1</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
/* VOICE: una mesa de revisión: cada ejercicio del lote moviéndose, para comprobarlo uno a uno.
   IDEA: la hoja de modelo de un animador: muchas figuras pequeñas, y la que se mira, en grande.
   PICTURE: las figuras en 3D en vivo, con el mismo dibujo de músculos que la app.
   COLOUR and TYPE: el negro de la app, el gris azulado del maniquí para el texto secundario y su azul para los mandos; Inter.
   LAYOUT: dos columnas en el móvil (una figura tocada ocupa todo el ancho), más en pantallas anchas; arriba, la vista para todas. */
:root{color-scheme:dark;--bg:#050608;--panel:#0f1117;--line:#1f2331;--ink:#f4f4f6;--soft:#a3abc9;--accent:#1565ff;--warm:#ffb347;--red:#ff5a52}
:root[data-theme=light],:root[data-theme=dark]{color-scheme:dark}
*{box-sizing:border-box;min-width:0}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 Inter,-apple-system,"Segoe UI",system-ui,sans-serif;overflow-x:clip}
.band{padding:clamp(24px,4vw,56px) max(4vw,16px) 12px;max-width:1240px;margin:0 auto}
.pr{color:var(--soft);font-size:14px;margin:0 0 10px}
h1{font-size:clamp(30px,6.4vw,48px);line-height:1.05;letter-spacing:-.02em;margin:0 0 14px;text-wrap:balance;font-weight:700}
.lede{color:var(--soft);font-size:17px;max-width:66ch;margin:0 0 14px}
.lede b{color:var(--ink);font-weight:600}
.key{display:flex;gap:8px 18px;flex-wrap:wrap;color:var(--soft);font-size:14px;margin:0 0 18px}
.key i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-right:7px;vertical-align:-1px}
.bar{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line)}
.bar .in{max-width:1240px;margin:0 auto;padding:10px max(4vw,16px);display:flex;gap:10px 16px;align-items:center;flex-wrap:wrap}
.bar .lbl{color:var(--soft);font-size:14px}
.seg{display:inline-flex;background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:4px;gap:2px}
.seg button{appearance:none;border:0;background:none;color:var(--soft);font:600 15px/1 Inter,system-ui,sans-serif;min-height:40px;padding:0 15px;border-radius:999px;cursor:pointer}
.seg button[aria-pressed=true]{background:var(--accent);color:#fff}
.seg button:focus-visible,.mini button:focus-visible,.media:focus-visible,a:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.fam{max-width:1240px;margin:0 auto;padding:clamp(22px,3vw,36px) max(4vw,16px) 6px}
.fhead h2{font-size:clamp(22px,4vw,28px);letter-spacing:-.01em;margin:0 0 4px}
.fhead h2 span{color:var(--soft);font-weight:500}
.fhead p{color:var(--soft);font-size:15px;max-width:70ch;margin:0 0 14px}
.grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(min(100%,160px),1fr));grid-auto-flow:dense}
.card{background:var(--panel);border:1px solid var(--line);border-radius:20px;overflow:hidden;display:flex;flex-direction:column}
.media{cursor:zoom-in;background:radial-gradient(120% 90% at 50% 0,#262a3e,#0c0d12 78%)}
.stage{display:block;width:100%;aspect-ratio:1}
.cbody{padding:10px 12px 12px;display:flex;flex-direction:column;gap:8px;flex:1}
h3{font-size:14px;line-height:1.3;font-weight:600;margin:0;text-wrap:balance}
.note{display:none;color:var(--soft);font-size:15px;line-height:1.45;margin:0}
.mini{display:inline-flex;align-self:flex-start;margin-top:auto;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:3px}
.mini button{appearance:none;border:0;background:none;color:var(--soft);font:600 13px/1 Inter,system-ui,sans-serif;min-height:34px;min-width:44px;padding:0 12px;border-radius:999px;cursor:pointer}
.mini button[aria-pressed=true]{background:var(--line);color:var(--ink)}
.card.big{grid-column:1/-1;flex-direction:row;flex-wrap:wrap}
.card.big .media{flex:1 1 360px;cursor:zoom-out}
.card.big .cbody{flex:1 1 260px;padding:18px}
.card.big h3{font-size:19px}
.card.big .note{display:block}
.stage.lado .pl{opacity:.16}
.found{max-width:1240px;margin:0 auto;padding:clamp(26px,4vw,44px) max(4vw,16px) 8px}
.found h2{font-size:clamp(22px,4vw,28px);margin:0 0 10px}
.found ul{margin:0;padding-left:20px;color:var(--soft);max-width:72ch}
.found li{margin:0 0 10px}
.found b{color:var(--ink);font-weight:600}
footer{color:var(--soft);font-size:14px;max-width:1240px;margin:0 auto;padding:22px max(4vw,16px) 40px}
@media (prefers-reduced-motion: reduce){*{scroll-behavior:auto}}
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs id="defs3"></defs></svg>
<header class="band">
<p class="pr">StrataFit · figuras de ejercicio · lote 1 de la revisión</p>
<h1>Sentadillas y presses, en 3D</h1>
<p class="lede">Los <b>57 ejercicios</b> de las familias de sentadilla, press de banca y press de hombro, con la figura nueva moviéndose. Toca una figura para verla en grande con lo que hace; <b>Lado</b> la gira de perfil para comprobar la postura (los discos se aclaran para que se vea el cuerpo). Todavía no está en la app: se integrará cuando estén todos los lotes.</p>
<p class="key"><span><i style="background:#e0263a"></i>Músculos principales</span><span><i style="background:#f59a2c"></i>Secundarios</span><span>los de la librería de la app</span></p>
</header>
<div class="bar"><div class="in"><span class="lbl">Todas:</span><div class="seg" role="group" aria-label="Vista de todas las figuras"><button type="button" data-m="cam" aria-pressed="true">3/4</button><button type="button" data-m="side" aria-pressed="false">Lado</button></div></div></div>
''' + sections + r'''
<section class="found">
<h2>Lo que he visto al revisarlo</h2>
<ul>
<li><b>Músculos de la librería que no cuadran.</b> Las figuras pintan los músculos que la app tiene para cada ejercicio, y en algunos están mal: <b>TRX sentadilla</b> y <b>Landmine press</b> llevan dorsal y pectoral como principales (los comparten con su línea de la librería, «Empuje y tracción funcional», junto con remos y fondos); <b>Goblet squat</b>, <b>Sentadilla goblet con pausa</b>, <b>Sandbag squat</b> y <b>Overhead squat</b> llevan «cuerpo entero», y por eso salen todos en rojo. Es un fallo de datos que ya está en la app de ahora; no lo he tocado.</li>
<li><b>Lo que es una aproximación.</b> En la sentadilla frontal, la mano rodea la barra con la muñeca doblada hacia atrás (no se dibujan los dedos abiertos bajo la barra). La barra del landmine está algo más corta que una real para que quepa en la tarjeta, y las cintas del TRX y lo alto de la Smith y de la polea se salen del encuadre.</li>
<li><b>Las variantes que la app junta y aquí se distinguen:</b> las de pausa (se paran abajo), el agarre ancho, el agarre neutro, el banco a 30°, el Arnold, el JM y el hack en la Smith.</li>
</ul>
</section>
<footer>Las figuras se dibujan en vivo: solo se mueven las que están a la vista. Si el sistema pide menos movimiento, se quedan quietas a mitad del gesto.</footer>
<script>window.FIG_MAP = ''' + MAP + r'''; window.FIG_REG = ''' + REG + r'''; window.LOTE = ''' + json.dumps(LOTE, ensure_ascii=False) + r''';</script>
<script>
''' + JS + r'''
</script>
<script>
{
  document.getElementById('defs3').innerHTML = Fig3D.DEFS;
  const VB = ''' + json.dumps(VB, ensure_ascii=False) + r''', SIDE = ''' + json.dumps(list(SIDE)) + r''';
  const EXS = {};
  for (const e of LOTE) EXS[e.n] = Fig3D.make(e.n, e.w, e.p, e.s);
  const cards = [...document.querySelectorAll('.card')];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seg = [...document.querySelectorAll('.seg button')];
  const paint = (c, t) => { c.last = t; c.g.innerHTML = Fig3D.draw(c.ex, t, c.cam, c.id); };
  const setView = (c, v) => {
    c.view = v;
    c.cam = v == 'side' ? Fig3D.camera(SIDE[0], SIDE[1]) : Fig3D.camera(c.ex.yaw, c.ex.pitch);
    c.svg.setAttribute('viewBox', VB[c.dataset.ex][v]);
    c.svg.classList.toggle('lado', v == 'side');
    for (const b of c.querySelectorAll('.mini button')) b.setAttribute('aria-pressed', String(b.dataset.v == v));
    paint(c, still ? .5 : c.last >= 0 ? c.last : 0);
  };
  for (const c of cards) {
    c.ex = EXS[c.dataset.ex]; c.svg = c.querySelector('svg.stage'); c.g = c.svg.querySelector('g'); c.last = -1;
    for (const b of c.querySelectorAll('.mini button')) b.addEventListener('click', () => setView(c, b.dataset.v));
    const media = c.querySelector('.media');
    const big = () => { c.classList.toggle('big'); media.setAttribute('aria-label', c.dataset.ex + (c.classList.contains('big') ? ': ver en pequeño' : ': ver en grande')); };
    media.addEventListener('click', big);
    media.addEventListener('keydown', e => { if (e.key == 'Enter' || e.key == ' ') { e.preventDefault(); big(); } });
  }
  for (const b of seg) b.addEventListener('click', () => { for (const x of seg) x.setAttribute('aria-pressed', String(x == b)); for (const c of cards) setView(c, b.dataset.m); });
  /* cada figura empieza en un momento distinto del gesto: así no se mueven todas a la vez */
  const lag = new Map(cards.map((c, i) => [c, (i * 977) % 5200]));
  /* la figura en grande, a 30 fotogramas por segundo; las pequeñas, por turnos (dos por fotograma, como mucho 15 por segundo
     cada una): cada fotograma de una figura es mucho dibujo, y con muchas a la vista el móvil se atascaría */
  let t0 = 0, turn = 0;
  const step = (c, now) => { const t = Fig3D.beat(now - t0 + lag.get(c), c.ex.up, false, c.ex.pause); if (t !== c.last) paint(c, t); c.at = now; };
  const tick = now => {
    t0 = t0 || now;
    const vis = cards.filter(c => c.inView);
    for (const c of vis) if (!c.view) setView(c, 'cam');
    if (!still && vis.length) {
      const small = [];
      for (const c of vis) { if (c.classList.contains('big')) { if (now - (c.at || 0) >= 30) step(c, now); } else small.push(c); }
      let done = 0;
      for (let k = 0; k < small.length && done < 2; k++) {
        const c = small[(turn + k) % small.length];
        if (now - (c.at || 0) < 64) continue;
        step(c, now); done++;
      }
      turn = small.length ? (turn + max1(done)) % small.length : 0;
    }
    requestAnimationFrame(tick);
  };
  const max1 = n => Math.max(1, n);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { for (const e of es) e.target.inView = e.isIntersecting; }, { rootMargin: '40px 0px' }) : null;
  for (const c of cards) { if (io) io.observe(c); else c.inView = true; }
  requestAnimationFrame(tick);
}
</script>
</body>
</html>
'''
os.makedirs('salida/pagina', exist_ok=True)
open('salida/pagina/index.html', 'w', encoding='utf-8').write(HTML)
print('salida/pagina/index.html', len(HTML) // 1024, 'KB')
