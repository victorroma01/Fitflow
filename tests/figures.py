"""Prueba de las figuras de ejercicio (muestra de la V1.1): el modelo haciendo el ejercicio en las miniaturas y, al tocar la
imagen, la hoja nueva: figura grande que se mueve, músculos en pequeño a la izquierda con sus nombres, y el texto.

  python3 tests/figures.py dist/stratafit.html [carpeta_capturas]
"""
import io, os, sys, datetime
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


INIT = rd('init.js')
fails = []
SAMPLE = ['Press banca', 'Sentadilla', 'Curl bíceps barra', 'Elevaciones laterales']
# tres variantes suyas: la misma postura con otro material (mancuernas) u otro apoyo de la barra (por delante)
VARIANTS = ['Press banca mancuernas', 'Sentadilla frontal', 'Curl con mancuernas']
# la figura de un ejercicio se reconoce por sus piezas (<use href="#fs…"> en pequeño, "#fb…" en grande)
IS_FIGURE = "(el => !!el && !!el.querySelector('use[href^=\"#fs\"],use[href^=\"#fb\"]'))"
# las transformaciones de las capas de la figura grande, tal como están ahora
LAYERS = "[...document.querySelectorAll('#sh svg[data-fig] > g')].map(g => g.getAttribute('transform') || '').join('|')"


def painted(png):
    """Qué hay pintado en una captura: fracción de píxeles rojos (músculo principal), naranjas (secundario) y del gris azulado
    de los músculos en reposo, y cuántos píxeles claros (el material) hay en el quinto izquierdo y en el derecho. Los
    umbrales de las comprobaciones son menos de la mitad de lo medido en Chromium (queda en el registro), para que el
    suavizado de otro motor no las haga fallar; si no se pinta la figura, todo sale a cero."""
    a = np.asarray(Image.open(io.BytesIO(png)).convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    n = r.size
    red = ((r > 190) & (g < 120) & (b < 130)).sum() / n
    orange = ((r > 215) & (g > 130) & (g < 215) & (b < 120)).sum() / n
    slate = ((r > 62) & (r < 112) & (g > 68) & (g < 120) & (b > 95) & (b < 150) & (b - r > 18)).sum() / n
    light = (abs(r - 154) < 28) & (abs(g - 161) < 28) & (abs(b - 186) < 28)
    w = a.shape[1]
    return red, orange, slate, int(light[:, :w // 5].sum()), int(light[:, -(w // 5):].sum())


def check(name, cond, info=''):
    if not cond:
        fails.append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def main(path, shots=None):
    path = os.path.abspath(path)
    if shots:
        os.makedirs(shots, exist_ok=True)
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
        c.add_init_script(INIT)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:200]) if m.type == 'error' else None)
        pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
        pg.goto(app_url(path))
        pg.clock.run_for(800)
        ev = pg.evaluate

        def shot(name):
            if shots:
                pg.screenshot(path=os.path.join(shots, name + '.png'))

        def how(n):
            """Abre la hoja «Cómo se hace» de un ejercicio, como al tocar su imagen."""
            ev("A.exerciseHowTo(0,{dataset:{n:%r}})" % n)
            pg.clock.run_for(300)
            for _ in range(30):
                if ev("!!document.querySelector('#sh .hwp')"):
                    return
                pg.wait_for_timeout(100)

        # (las capturas de las comprobaciones de lo pintado van con caret='initial': para esconder el cursor de texto, Playwright
        # mete una hoja de estilos en la página, y la política de seguridad de la app la rechaza con un aviso en WebKit)
        def settled():
            """Espera a que la hoja termine de entrar: sus animaciones van con el reloj de verdad, y una captura a medias sale
            desplazada o medio transparente."""
            for _ in range(60):
                if ev("!document.getAnimations || document.getAnimations().every(a=>a.playState!='running')"):
                    break
                pg.wait_for_timeout(50)
            pg.wait_for_timeout(150)

        check('arranca', ev('!!window.__ffok'))
        ev("S.reduceMotion=0;saveState()")

        # datos: los cuatro ejercicios de la muestra y sus tres variantes existen y tienen postura
        check('los ejercicios de la muestra tienen postura', sorted(ev('Object.keys(FIG_POSES)')) == sorted(SAMPLE + VARIANTS), str(ev('Object.keys(FIG_POSES)')))
        miss = ev("Object.keys(FIG_POSES).filter(n=>!exAll().some(e=>e.n==n))")
        check('todos los ejercicios con postura existen en la biblioteca', not miss, str(miss))
        # las piezas de los dos modelos están definidas una vez, y todo lo que una figura usa existe
        check('las piezas del modelo están en la página', ev("['fbT','fsT','fbUA','fqHG','fbB','fbA0','fbA1','fcB','frBI','frDL0','gSm'].every(i=>!!document.getElementById(i))"))

        # librería: en las listas, la miniatura es el modelo haciendo el ejercicio; los demás siguen con el mapa muscular
        ev("A.openLibrary()")
        pg.clock.run_for(300)
        for q, n in [('press banca', 'Press banca'), ('press banca', 'Press banca mancuernas'), ('sentadilla', 'Sentadilla'), ('sentadilla', 'Sentadilla frontal'), ('curl bíceps', 'Curl bíceps barra'),
                     ('curl con mancuernas', 'Curl con mancuernas'), ('elevaciones laterales', 'Elevaciones laterales')]:
            pg.fill('#sh input', q)
            pg.clock.run_for(500)
            row = "[...document.querySelectorAll('#sh .exr')].find(r=>r.querySelector('b').textContent==%r)" % n
            check('lista: «%s» lleva su figura' % n, ev(IS_FIGURE + "(" + row + ")"))
            broken = ev("(r=>[...r.querySelectorAll('use')].map(u=>u.getAttribute('href')).filter(h=>!document.querySelector(h)))(" + row + ")")
            check('lista: «%s» no usa piezas que no existen' % n, not broken, str(broken))
        check('lista: los demás siguen con sus músculos', ev("(r=>!!r && !" + IS_FIGURE + "(r) && !!r.querySelector('.exth svg'))([...document.querySelectorAll('#sh .exr')].find(r=>r.querySelector('b').textContent!='Elevaciones laterales'))"))
        # las mancuernas de las variantes: dos hexágonos (la de delante y la de atrás) y ninguna barra
        pg.fill('#sh input', 'curl con mancuernas')
        pg.clock.run_for(500)
        check('lista: la variante con mancuernas lleva mancuernas', ev("(g=>g.querySelectorAll('polygon').length == 3 && g.querySelectorAll('circle').length == 0)([...document.querySelectorAll('#sh .exr')].find(r=>r.querySelector('b').textContent=='Curl con mancuernas').querySelector('.exth svg'))"))
        shot('lista')

        # ficha: la figura pequeña junto al nombre abre la hoja
        i = ev("exAll().findIndex(e=>e.n=='Press banca')")
        ev("A.exerciseDetail(%d)" % i)
        pg.clock.run_for(300)
        for _ in range(30):
            if ev("!!document.querySelector('#sh .anb[data-a=exerciseHowTo]')"):
                break
            pg.wait_for_timeout(100)
        check('ficha: la figura del ejercicio, junto al nombre, se puede tocar', ev(IS_FIGURE + "(document.querySelector('#sh .anb[data-a=exerciseHowTo]'))"))
        check('ficha: el mapa muscular sigue', ev("document.querySelectorAll('#sh .anf svg').length == 2"))
        shot('ficha')
        ev("document.querySelector('#sh .anb[data-a=exerciseHowTo]').click()")
        pg.clock.run_for(300)
        for _ in range(30):
            if ev("!!document.querySelector('#sh .hwp')"):
                break
            pg.wait_for_timeout(100)
        check('ficha: al tocarla se abre la hoja, con la vuelta a la ficha', ev("!!document.querySelector('#sh svg[data-fig]') && !!document.querySelector('#sh [data-a=exerciseDetail]')"))
        ev("A.closeSheet()")
        pg.clock.run_for(200)

        # la hoja de cada ejercicio de la muestra: figura grande, músculos en pequeño a la izquierda, nombre y texto, en ese orden
        # (la última es «Elevaciones laterales», que en la app tiene foto)
        for n in VARIANTS + SAMPLE:
            how(n)
            check('hoja de «%s»: la figura grande' % n, ev("!!document.querySelector('#sh .fgs svg[data-fig]') && " + IS_FIGURE + "(document.querySelector('#sh .fgs'))"))
            check('hoja de «%s»: los músculos en pequeño, de frente y de espaldas' % n, ev("document.querySelectorAll('#sh .hwm .hwf svg').length == 2"))
            check('hoja de «%s»: el nombre y los músculos con su nombre' % n, ev("document.querySelector('#sh .hwm .hwt').textContent == %r && document.querySelectorAll('#sh .hwm .hwl').length == 2 && /^Principal /.test(document.querySelector('#sh .hwl').textContent)" % n))
            order = ev("""(() => { const y = s => document.querySelector('#sh ' + s).getBoundingClientRect(); const f = y('.fgs'), m = y('.hwf'), t = y('.hwm .hwt'), p = y('.hwp');
              return [f.bottom <= m.top + 1, m.bottom <= p.top + 1, m.right <= t.left + 1, m.left - f.left < 2, f.width > 300 && f.height > 200, m.width < 110]; })()""")
            check('hoja de «%s»: figura arriba, músculos debajo a la izquierda, texto después' % n, all(order), str(order))
            check('hoja de «%s»: el texto de cómo se hace' % n, ev("document.querySelector('#sh .hwp').innerText.length > 80"))
            broken = ev("[...document.querySelectorAll('#sh use')].map(u=>u.getAttribute('href')).filter(h=>!document.querySelector(h))")
            check('hoja de «%s»: no usa piezas que no existen' % n, not broken, str(broken[:4]))
            fits = ev("(() => { const s = document.querySelector('#sh .sp'); return s.scrollWidth <= s.clientWidth + 1; })()")
            check('hoja de «%s»: no se sale de ancho' % n, fits)
            # se mueve: del inicio al final y vuelta
            t0 = ev(LAYERS)
            pg.clock.run_for(700)
            t1 = ev(LAYERS)
            check('hoja de «%s»: la figura se mueve' % n, t0 != t1 and 'NaN' not in t1, t1[:120])
            pg.clock.run_for(8000)
            check('hoja de «%s»: y sigue en su sitio tras varios ciclos' % n, 'NaN' not in ev(LAYERS) and ev("document.querySelectorAll('#sh svg[data-fig] > g').length") >= 3)
            shot('hoja_' + n.split()[0].lower())
        # las imágenes realistas: un ejercicio con figura ya no enseña su foto, ni en la hoja, ni en la lista, ni en la ficha
        check('«Elevaciones laterales» tiene foto en la app', ev("!!EX_PHOTO_KEY['Elevaciones laterales']"))
        check('con figura, la foto realista no sale en la hoja', ev("!document.querySelector('#sh .exph') && !document.querySelector('#sh img')"))
        ev("A.closeSheet()")
        pg.clock.run_for(300)
        check('al cerrar la hoja no queda ninguna figura', ev("!document.querySelector('svg[data-fig]')"))
        ev("A.openLibrary()")
        pg.clock.run_for(300)
        pg.fill('#sh input', 'elevaciones laterales')
        pg.clock.run_for(500)
        row = "[...document.querySelectorAll('#sh .exr')].find(r=>r.querySelector('b').textContent=='Elevaciones laterales')"
        check('con figura, la miniatura no lleva la insignia de foto', ev("!" + row + ".querySelector('.phi')"))
        ev("A.exerciseDetail(%d)" % ev("exAll().findIndex(e=>e.n=='Elevaciones laterales')"))
        pg.clock.run_for(300)
        for _ in range(30):
            if ev("!!document.querySelector('#sh .anb')"):
                break
            pg.wait_for_timeout(100)
        check('con figura, la ficha no lleva la foto y su figura abre la hoja', ev("!document.querySelector('#sh .exph') && " + IS_FIGURE + "(document.querySelector('#sh .anb[data-a=exerciseHowTo]'))"))
        shot('ficha_sin_foto')
        ev("A.closeSheet()")
        pg.clock.run_for(200)

        # en un móvil estrecho y en una tableta, la hoja no se sale de ancho y la figura no pasa de su alto
        for w, h in [(320, 568), (768, 1024)]:
            pg.set_viewport_size({'width': w, 'height': h})
            for n in SAMPLE:
                how(n)
                box = ev("""(() => { const s = document.querySelector('#sh .sp'), f = document.querySelector('#sh .fgs svg').getBoundingClientRect(), t = document.querySelector('#sh .hwm').getBoundingClientRect();
                  return [s.scrollWidth <= s.clientWidth + 1, f.height <= 341 && f.height > 150, f.right <= s.getBoundingClientRect().right + 1, t.right <= s.getBoundingClientRect().right + 1]; })()""")
                check('a %d px, la hoja de «%s» cabe' % (w, n), all(box), str(box))
            if shots:
                shot('ancho_%d' % w)
            ev("A.closeSheet()")
            pg.clock.run_for(200)
        pg.set_viewport_size({'width': 390, 'height': 844})

        # un ejercicio aún sin postura: como antes (con foto, la foto y los músculos en pequeño; sin foto, sus músculos)
        how('Hip thrust')
        check('sin postura y con foto: la foto arriba y los músculos en pequeño', ev("!!document.querySelector('#sh .exph img.f') && !document.querySelector('#sh .fgs') && document.querySelectorAll('#sh .hwm .hwf svg').length == 2"))
        how('Press militar')
        check('sin postura ni foto: sus músculos, como antes', ev("!!document.querySelector('#sh .hwa svg') && !document.querySelector('#sh .fgs') && !document.querySelector('#sh .hwm') && document.querySelector('#sh .hwt').textContent == 'Press militar'"), str(ev("document.querySelector('#sh .sp').innerHTML.slice(0,200)")))
        ev("A.closeSheet()")
        pg.clock.run_for(200)

        # con «Reducir animaciones»: las dos posturas quietas, con su rótulo
        ev("S.reduceMotion=1;saveState()")
        how('Sentadilla')
        check('reducir animaciones: dos posturas quietas, «Inicio» y «Final»', ev("!document.querySelector('#sh svg[data-fig]') && [...document.querySelectorAll('#sh .fgs.two figcaption')].map(x=>x.textContent).join() == 'Inicio,Final' && document.querySelectorAll('#sh .fgs.two svg').length == 2"))
        t0 = ev("document.querySelector('#sh .fgs').innerHTML")
        pg.clock.run_for(1500)
        check('reducir animaciones: no se mueve', ev("document.querySelector('#sh .fgs').innerHTML") == t0)
        two = ev("[...document.querySelectorAll('#sh .fgs.two svg')].map(s=>[...s.querySelectorAll(':scope > g')].map(g=>g.getAttribute('transform')).join('|'))")
        check('reducir animaciones: las dos posturas son distintas', len(two) == 2 and two[0] != two[1])
        shot('quieta')
        # lo pintado de verdad (también en Safari y Firefox): los músculos que trabajan en rojo y naranja, el resto del
        # cuerpo en su gris azulado; y, de frente, los brazos abiertos del todo, con las mancuernas en los extremos
        settled()
        red, orange, slate, _, _ = painted(pg.locator('#sh .fgs').screenshot(caret='initial'))
        print('        pintado (rojo, naranja, gris azulado): sentadilla %.4f %.4f %.4f' % (red, orange, slate))
        check('sentadilla: se ven los músculos principales, los secundarios y el resto del cuerpo', red > .009 and orange > .004 and slate > .012, '%.4f %.4f %.4f' % (red, orange, slate))
        how('Elevaciones laterales')
        settled()
        ini = painted(pg.locator('#sh .fgs figure').nth(0).screenshot(caret='initial'))
        fin = painted(pg.locator('#sh .fgs figure').nth(1).screenshot(caret='initial'))
        print('        pintado: elevaciones, inicio %s · final %s' % (' '.join('%.4f' % v if isinstance(v, float) else str(v) for v in ini), ' '.join('%.4f' % v if isinstance(v, float) else str(v) for v in fin)))
        check('elevaciones: se ven el deltoides, los secundarios y el cuerpo', fin[0] > .0015 and fin[1] > .002 and fin[2] > .015, str(fin))
        check('elevaciones: al final, las mancuernas están en los extremos; al inicio, no', fin[3] > 12 and fin[4] > 12 and ini[3] < 4 and ini[4] < 4, str([ini, fin]))
        how('Press banca')
        settled()
        red, orange, slate, _, _ = painted(pg.locator('#sh .fgs figure').nth(1).screenshot(caret='initial'))
        print('        pintado: press banca %.4f %.4f %.4f' % (red, orange, slate))
        check('press banca: se ven el pectoral, los secundarios y el cuerpo', red > .0008 and orange > .0008 and slate > .018, '%.4f %.4f %.4f' % (red, orange, slate))
        ev("A.closeSheet()")
        ev("S.reduceMotion=0;saveState()")
        pg.clock.run_for(200)
        # y en pequeño: el pictograma de la sentadilla, con sus músculos en color
        ev("A.openLibrary()")
        pg.clock.run_for(300)
        pg.fill('#sh input', 'sentadilla')
        pg.clock.run_for(500)
        settled()
        red, orange, _, _, _ = painted(pg.locator('#sh .exr .exth').first.screenshot(caret='initial'))
        print('        pintado: miniatura de la sentadilla %.4f %.4f' % (red, orange))
        check('miniatura de la sentadilla: los músculos en color', red > .01 and orange > .004, '%.4f %.4f' % (red, orange))
        ev("A.closeSheet()")
        pg.clock.run_for(200)

        # entreno: la miniatura es la figura y abre la hoja
        d = ev("S.plan.findIndex(d=>d.ex.some(e=>FIG_POSES[e.n]))")
        check('el programa por defecto tiene un ejercicio de la muestra', d >= 0, str(d))
        ev("S.tab=0;S.selectedWeekday=%d;S.selectedDay=%d;R()" % (max(d, 0), max(d, 0)))
        ev("A.startWorkout()")
        pg.clock.run_for(400)
        sel = "document.querySelector('.xs .th[data-a=exerciseHowTo][data-n=\"'+S.plan[S.selectedDay].ex.find(e=>FIG_POSES[e.n]).n+'\"]')"
        check('entreno: la miniatura es el modelo haciendo el ejercicio', ev(IS_FIGURE + "(" + sel + ")"))
        size = ev("(r=>[Math.round(r.width),Math.round(r.height)])(" + sel + ".querySelector('svg').getBoundingClientRect())")
        check('entreno: la miniatura cabe en su recuadro', size == [64, 64], str(size))
        shot('entreno')
        ev(sel + ".click()")
        pg.clock.run_for(300)
        for _ in range(30):
            if ev("!!document.querySelector('#sh .hwp')"):
                break
            pg.wait_for_timeout(100)
        check('entreno: al tocarla se abre la hoja con la figura grande', ev("!!document.querySelector('#sh .fgs svg[data-fig]')"))
        check('el entreno sigue en marcha', ev('!!W'))
        ev("A.closeSheet()")
        pg.clock.run_for(200)

        errs = [e for e in errs if 'favicon' not in e]
        check('sin errores de JS', not errs, str(errs[:3]))
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
