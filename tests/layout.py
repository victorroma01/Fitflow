"""Tamaños de pantalla (auditoría de la V1.0.3, fases 6 y 7): las 47 pantallas de tests/shots.py, del iPhone SE (320 px de
ancho) a un portátil (1280 px), sin desbordes, sin nada que se salga por un lado y sin textos cortados.

En cada tamaño y cada pantalla, en la ventana que esté encima (la hoja, el aviso, el menú o la pestaña):
  · la página y la ventana no se desplazan en horizontal,
  · nada visible se sale por la izquierda ni por la derecha (salvo dentro de lo que se desplaza a propósito),
  · ningún texto queda cortado sin puntos suspensivos, ni a lo ancho ni a lo alto.
En pantallas grandes, el contenido va en una columna centrada, no estirado de lado a lado.
Y, al arrancar con datos, nada da un salto en la pantalla (layout shift), en Chromium, que es el que lo mide.

  python3 tests/layout.py dist/stratafit.html            (falla si hay algún problema)
  python3 tests/layout.py dist/stratafit.html --lista    (enseña más elementos con problemas; sin ella, los cuatro primeros)
"""
import os, sys, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts, ENGINE

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shots import SCR  # noqa: E402


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


# iPhone SE (1.ª generación) y móviles pequeños, un Android habitual, un iPhone grande, una tableta en vertical y un portátil
# (390 × 844, el tamaño del resto de pruebas, no hace falta repetirlo)
SIZES = [(320, 568, 'iPhone SE'), (360, 740, 'Android'), (430, 932, 'iPhone grande'), (768, 1024, 'tableta'), (1280, 800, 'portátil')]
# la columna de contenido, en pantallas grandes: como mucho este ancho, y centrada
COLUMN = 620
SCAN = """(() => {
  const W = innerWidth, out = [];
  // (lo de dentro de un desplegable cerrado tiene tamaño pero no se pinta: checkVisibility lo sabe)
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility != 'hidden' && s.display != 'none' && (!e.checkVisibility || e.checkVisibility()); };
  const desc = e => (e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className == 'string' && e.className ? '.' + e.className.trim().split(/\\s+/).slice(0, 3).join('.') : '')) + ' «' + (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40) + '»';
  const top = document.querySelector('#dg .dgc') || document.querySelector('#mn .msd') || document.querySelector('#f2w') || document.querySelector('#sh > .sp:not(.spu)') || document.querySelector('#app');
  if (document.documentElement.scrollWidth > W + 1) {
    // quién la ensancha: lo que pasa del borde derecho sin que nada lo recorte, contando las zonas táctiles (::before y ::after)
    const clipped = e => { for (let p = e.parentElement; p && p != document.documentElement; p = p.parentElement) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) return true; } return false; };
    const who = [];
    for (const e of document.querySelectorAll('body *')) {
      if (who.length > 4) break;
      if (!vis(e) || clipped(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.right > W + 1) who.push(desc(e) + ' hasta ' + Math.round(r.right));
      for (const ps of ['::before', '::after']) {
        const s = getComputedStyle(e, ps), rt = parseFloat(s.right);
        if (s.content != 'none' && s.position == 'absolute' && !isNaN(rt) && r.right - rt > W + 1) who.push(desc(e) + ps + ' hasta ' + Math.round(r.right - rt));
      }
    }
    // si no se ve a simple vista: se va ocultando cada hijo, de fuera adentro, hasta dar con el que la ensancha
    if (!who.length) {
      const wide = () => document.documentElement.scrollWidth > W + 1;
      const about = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return desc(e) + ' [' + Math.round(r.left) + ', ' + Math.round(r.right) + '] ' + s.position + ' ' + s.overflowX + (s.transform != 'none' ? ' ' + s.transform.slice(0, 30) : '') + (s.animationName != 'none' ? ' anim ' + s.animationName : '') + ' ancho ' + e.scrollWidth + '/' + e.clientWidth; };
      let node = document.body;
      for (let depth = 0; depth < 14; depth++) {
        let found = null;
        for (const c of node.children) {
          const old = c.style.display;
          c.style.display = 'none';
          const still = wide();
          c.style.display = old;
          if (!still) { found = c; break; }
        }
        if (!found) break;
        who.push(about(found));
        node = found;
      }
      who.splice(0, Math.max(0, who.length - 3));
    }
    out.push(['página más ancha que la pantalla', document.documentElement.scrollWidth + ' > ' + W + ' (body ' + document.body.scrollWidth + ', #app ' + document.querySelector('#app').scrollWidth + ', #sh ' + document.querySelector('#sh').scrollWidth + ') · ' + (who.join(' ⟩ ') || 'no se ve qué elemento')]);
  }
  if (top.scrollWidth > top.clientWidth + 1) out.push(['ventana con desplazamiento horizontal', desc(top) + ' ' + top.scrollWidth + ' > ' + top.clientWidth]);
  // ¿dentro de algo que se desplaza en horizontal a propósito?
  const scrolls = e => { for (let p = e.parentElement; p && p != document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 1) return true; } return false; };
  for (const e of top.querySelectorAll('*')) {
    if (!vis(e) || (e.closest('svg') && e.tagName != 'svg')) continue;
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    if ((r.right > W + 1 || r.left < -1) && !scrolls(e) && s.position != 'fixed' && !e.closest('[aria-hidden=true]'))
      out.push(['se sale por un lado', desc(e) + ' [' + Math.round(r.left) + ', ' + Math.round(r.right) + ']']);
    // texto cortado sin puntos suspensivos (solo en elementos con texto propio)
    const own = [...e.childNodes].some(n => n.nodeType == 3 && n.textContent.trim());
    if (own && e.scrollWidth > e.clientWidth + 1 && /(hidden|clip)/.test(s.overflowX) && s.textOverflow != 'ellipsis')
      out.push(['texto cortado a lo ancho', desc(e) + ' ' + e.scrollWidth + ' > ' + e.clientWidth]);
    if (own && e.scrollHeight > e.clientHeight + 2 && /(hidden|clip)/.test(s.overflowY) && !/\\d/.test(s.webkitLineClamp || '') && e.clientHeight > 0 && e.tagName != 'SELECT' && e.tagName != 'TEXTAREA')
      out.push(['texto cortado a lo alto', desc(e) + ' ' + e.scrollHeight + ' > ' + e.clientHeight]);
  }
  // el ancho de la columna de contenido (la tarjeta más ancha de la pestaña) y dónde queda su centro
  const col = [...document.querySelectorAll('#app .cd')].filter(vis).map(c => c.getBoundingClientRect()).sort((a, b) => b.width - a.width)[0];
  return { out, col: col ? [Math.round(col.width), Math.round(col.left + col.width / 2)] : null };
})()"""
# los saltos de la pantalla (layout shift) que no vienen de un toque, desde que se abre la página
SHIFTS = """(() => { window.__ls = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__ls.push(e.value); }).observe({ type: 'layout-shift', buffered: true }); } catch (e) { window.__ls = null; } })()"""


def main(path, show):
    fails = 0
    total = {}
    with sync_playwright() as p:
        b = launch(p)
        for w, h, name in SIZES:
            c = b.new_context(viewport={'width': w, 'height': h}, has_touch=w < 1000, is_mobile=w < 1000 and ENGINE == 'chromium', color_scheme='dark', **context_opts(path))
            c.add_init_script(rd('init.js'))
            pg = c.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
            pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
            pg.goto(app_url(path))
            pg.clock.run_for(800)
            pg.evaluate(rd('seed.js'))
            pg.evaluate(rd('extra.js'))
            # sin animaciones: cada pantalla se mide ya en su sitio, no mientras entra deslizándose
            pg.evaluate("S.reduceMotion=1;saveState()")
            pg.reload()
            pg.wait_for_load_state('load')
            pg.clock.run_for(800)
            bad = {}
            column = None
            for k, js in SCR.items():
                try:
                    # cada pantalla, sin lo que dejó abierto la anterior
                    pg.evaluate("document.querySelector('#dg').innerHTML='';sheet();if(W){W=null};S.planBackup=null;overviewMode=0;weightView=0;localStorage.removeItem('ffw')")
                    pg.evaluate(js)
                    pg.clock.run_for(400)
                    pg.wait_for_timeout(120)
                    r = pg.evaluate(SCAN)
                    if k == 'dash':
                        column = r['col']
                    for kind, d in r['out']:
                        bad.setdefault(kind, []).append((k, d))
                except Exception as e:
                    bad.setdefault('no se abre', []).append((k, str(e).split(chr(10))[0][:100]))
            wide = w >= 700
            # en pantallas grandes, una columna centrada; en un móvil, a lo ancho de la pantalla
            col_ok = bool(column) and (column[0] <= COLUMN and abs(column[1] - w / 2) <= 2 if wide else column[0] >= w - 40)
            n = sum(len(v) for v in bad.values())
            ok = not n and not errs and col_ok
            print(('  ok   ' if ok else '  FALLA'), '%d × %d (%s): %d pantallas%s' % (w, h, name, len(SCR), '' if ok else ' · ' + ' · '.join('%d %s' % (len(v), kind) for kind, v in bad.items())),
                  '' if col_ok else '· columna de contenido %s' % column, '' if not errs else '· errores de JS: %s' % errs[:2])
            if not ok:
                fails += 1
                for kind, v in bad.items():
                    for k, d in v[:12 if show else 4]:
                        print('         ', kind, '·', k, '·', d)
            for kind, v in bad.items():
                total[kind] = total.get(kind, 0) + len(v)
            c.close()
        # al arrancar con datos, nada salta de sitio (se mide con el reloj de verdad; solo Chromium lo mide)
        if ENGINE == 'chromium':
            c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
            c.add_init_script(rd('init.js'))
            c.add_init_script(SHIFTS)
            pg = c.new_page()
            pg.goto(app_url(path))
            pg.wait_for_timeout(500)
            pg.evaluate(rd('seed.js'))
            pg.evaluate(rd('extra.js'))
            pg.reload()
            pg.wait_for_timeout(1500)
            ls = pg.evaluate('window.__ls')
            ok = ls is not None and sum(ls) < .01
            print(('  ok   ' if ok else '  FALLA'), 'al arrancar con datos, nada da un salto en la pantalla (layout shift: %s)' % ('sin medida' if ls is None else round(sum(ls), 4)))
            fails += 0 if ok else 1
            c.close()
        b.close()
    print('\n  %d tamaños × %d pantallas · problemas: %s' % (len(SIZES), len(SCR), ', '.join('%d %s' % (v, k) for k, v in total.items()) or 'ninguno'))
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN %d' % fails))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html', '--lista' in sys.argv)
