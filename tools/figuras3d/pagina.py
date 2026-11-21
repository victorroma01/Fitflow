# La página de revisión de un lote (el que diga salida/lote.txt), con la figura 3D de cada ejercicio; los textos, en textos.py.
# Antes: node datos.mjs && python3 banco.py. Deja la página en salida/pagina/index.html
import json, os, html
from playwright.sync_api import sync_playwright

MAP = open('salida/mapa.json').read()
REG = open('salida/regiones.txt').read().strip()
JS = '\n'.join(open(f, encoding='utf-8').read() for f in ('fig3d.js', 'gear3d.js', 'mov3d.js', 'tiron3d.js', 'piernas3d.js', 'brazos3d.js'))
LOTE = json.load(open('salida/lote.json'))
SIDE = (-80, 4)

from textos import LOTES
LOTE_N = int(open('salida/lote.txt').read().strip())
TX = LOTES[LOTE_N]
NOTES = TX['notes']
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

FAMS = TX['fams']
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
<title>''' + TX['title'] + r'''</title>
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
''' + TX['head'] + r'''<p class="key"><span><i style="background:#e0263a"></i>Músculos principales</span><span><i style="background:#f59a2c"></i>Secundarios</span><span>los de la librería de la app</span></p>
</header>
<div class="bar"><div class="in"><span class="lbl">Todas:</span><div class="seg" role="group" aria-label="Vista de todas las figuras"><button type="button" data-m="cam" aria-pressed="true">3/4</button><button type="button" data-m="side" aria-pressed="false">Lado</button></div></div></div>
''' + sections + r'''
''' + TX['found'] + r'''
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
  /* en pequeño, sin el rayado de los músculos (no se distingue y es casi un tercio del dibujo); en grande, con todo */
  const paint = (c, t) => { c.last = t; c.g.innerHTML = Fig3D.draw(c.ex, t, c.cam, c.id, !c.classList.contains('big')); };
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
    const big = () => { c.classList.toggle('big'); if (c.last >= 0) paint(c, c.last); media.setAttribute('aria-label', c.dataset.ex + (c.classList.contains('big') ? ': ver en pequeño' : ': ver en grande')); };
    media.addEventListener('click', big);
    media.addEventListener('keydown', e => { if (e.key == 'Enter' || e.key == ' ') { e.preventDefault(); big(); } });
  }
  for (const b of seg) b.addEventListener('click', () => { for (const x of seg) x.setAttribute('aria-pressed', String(x == b)); for (const c of cards) setView(c, b.dataset.m); });
  /* cada figura empieza en un momento distinto del gesto: así no se mueven todas a la vez */
  const lag = new Map(cards.map((c, i) => [c, (i * 977) % 5200]));
  /* cuánto se puede dibujar en cada fotograma sin que la pantalla se atasque: algo menos de la mitad de lo que dura un
     fotograma (en una pantalla de 120 Hz, menos que en una de 60), y lo demás, para que el navegador lo pinte. En ese tiempo
     se dibujan primero la figura en grande (hasta 60 veces por segundo) y luego las pequeñas, la que lleva más rato sin
     moverse antes (hasta 30 veces por segundo cada una): un móvil rápido las mueve todas con fluidez y uno lento, por turnos */
  let t0 = 0, last = 0, frame = 16.7;
  const clock = (c, ms) => c.ex.beat ? c.ex.beat(ms) : Fig3D.beat(ms, c.ex.up, false, c.ex.pause, c.ex.rest);
  const step = (c, now) => { const t = clock(c, now - t0 + lag.get(c)); if (t !== c.last) paint(c, t); c.at = now; };
  const tick = now => {
    t0 = t0 || now;
    if (last) frame = frame * .9 + Math.min(50, now - last) * .1;
    last = now;
    const vis = cards.filter(c => c.inView);
    for (const c of vis) if (!c.view) setView(c, 'cam');
    if (!still && vis.length) {
      const budget = Math.max(4, Math.min(9, frame * .45)), start = performance.now();
      const due = vis.filter(c => now - (c.at || 0) >= (c.classList.contains('big') ? 15 : 31))
        .sort((a, b) => (b.classList.contains('big') - a.classList.contains('big')) || (a.at || 0) - (b.at || 0));
      for (const c of due) { step(c, now); if (performance.now() - start > budget) break; }
    }
    requestAnimationFrame(tick);
  };
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
