"""Prueba de las figuras de ejercicio: el modelo haciendo cada ejercicio de la librería, en las miniaturas y, al tocar la
imagen, en la hoja «Cómo se hace»: figura grande que se mueve, músculos en pequeño a la izquierda con sus nombres, y el
texto. Los 551 ejercicios se abren uno a uno; unos cuantos, de cada clase de figura, se miran con detalle.

  python3 tests/figures.py dist/stratafit.html [carpeta_capturas]
"""
import io, os, re, sys, datetime
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts, ENGINE

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


INIT = rd('init.js')
fails = []
# uno de cada clase de figura: de perfil con barra, con mancuernas, en máquina y en polea; de frente y de espaldas; con
# postura intermedia; de cardio, en ciclo (la bici), de un gesto seguido (el remo, el saco) y de un salto tras otro (la comba)
MOVING = ['Press banca', 'Sentadilla', 'Curl con mancuernas', 'Jalón al pecho', 'Remo en polea baja', 'Elevaciones laterales', 'Pájaros en máquina', 'Abducción en máquina', 'Clean & jerk', 'Burpees', 'Bicicleta', 'Remo 1000 m', 'Saco de boxeo', 'Comba']
# con postura intermedia (tres posturas quietas) y que se mantienen (una sola, quieta)
THREE = ['Clean & jerk', 'Burpees', 'Saco de boxeo']
HELD = ['Plancha', 'Pino contra la pared']
# la figura de un ejercicio se reconoce por sus piezas (<use href="#fq…"> de perfil, "#fs…" de frente)
IS_FIGURE = "(el => !!el && !!el.querySelector('use[href^=\"#fq\"],use[href^=\"#fs\"]'))"
# las transformaciones de las capas de la figura grande, tal como están ahora
LAYERS = "[...document.querySelectorAll('#sh svg[data-fig] > g')].map(g => g.getAttribute('transform') || '').join('|')"


def painted(png):
    """Qué hay pintado en una captura: fracción de píxeles rojos (músculo principal), naranjas (secundario) y del gris azulado
    de la silueta (el resto del cuerpo), y cuántos píxeles claros (el material o las manos) hay en el quinto izquierdo y en el derecho. Los
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

        def capture(loc):
            """Captura de un elemento, para mirar lo pintado. En WebKit, Playwright mete y quita una hoja de estilos vacía en
            cada captura (para acompasar las animaciones) y la política de seguridad de la app la rechaza con un aviso en la
            consola: ese aviso, y solo ese, se descarta si llega durante la captura. Lo que la app pinte con estilos en
            línea lo sigue viendo tests/security.py."""
            n = len(errs)
            png = loc.screenshot(caret='initial')
            pg.wait_for_timeout(80)
            errs[n:] = [e for e in errs[n:] if 'Refused to apply a stylesheet' not in e]
            return png

        def frame():
            """Obliga al navegador a pintar un fotograma (con una captura mínima), descartando el mismo aviso que capture."""
            n = len(errs)
            pg.screenshot(clip={'x': 0, 'y': 0, 'width': 8, 'height': 8})
            pg.wait_for_timeout(80)
            errs[n:] = [e for e in errs[n:] if 'Refused to apply a stylesheet' not in e]

        def settled():
            """Espera a que la hoja termine de entrar: sus animaciones van con el reloj de verdad, y una captura a medias sale
            desplazada o medio transparente."""
            for _ in range(60):
                if ev("!document.getAnimations || document.getAnimations().every(a=>a.playState!='running')"):
                    break
                pg.wait_for_timeout(50)
            pg.wait_for_timeout(150)

        check('arranca', ev('!!window.__ffok'))
        ev("S.reduceMotion=0;S.customExercises=[{n:'Mi ejercicio',c:'Culturismo',g:'Propio',t:'Personalizado',p:['ps'],s:['tr'],q:'Otro'}];saveState()")

        # datos: todos los ejercicios de la librería tienen su figura; uno propio, no
        n_lib = ev("exAll().length - S.customExercises.length")
        check('la librería tiene sus 551 ejercicios', n_lib == 551, str(n_lib))
        miss = ev("exAll().filter(e=>!figPose(e.n)).map(e=>e.n)")
        check('todos los ejercicios de la librería tienen figura, y el propio no', miss == ['Mi ejercicio'], str(miss[:8]))
        check('cada postura de la tabla es de un ejercicio que existe', ev("Object.keys(FIG_POSES).every(n=>exAll().some(e=>e.n==n))"))

        # las miniaturas de todos: el modelo, sin piezas que no existan y sin nada fuera de sitio
        bad = ev("""(() => { const bad = []; const box = document.createElement('div');
          exAll().forEach(e => { if (!figPose(e.n)) return; box.innerHTML = String(exPicture(e.n, 64));
            const uses = [...box.querySelectorAll('use')].map(u => u.getAttribute('href'));
            if (!uses.some(h => /^#f[qs]/.test(h))) bad.push(e.n + ': no es la figura');
            else if (/NaN|undefined/.test(box.innerHTML)) bad.push(e.n + ': fuera de sitio');
            else if (uses.some(h => !document.querySelector(h))) bad.push(e.n + ': usa ' + uses.find(h => !document.querySelector(h)));
            else if (!/^-?\\d+ -?\\d+ \\d+ \\d+$/.test(box.querySelector('svg').getAttribute('viewBox'))) bad.push(e.n + ': encuadre'); });
          return bad; })()""")
        check('las 551 miniaturas son la figura del ejercicio, enteras', not bad, str(bad[:6]))
        PIECES = "['fqTX','fqPV','fqUA','fqHD','fqHG','fsB','fsU0','fsT1','fcB','fpBI','frBI','frFDL0','frBDP1','gSm','gSw','gSmF','gSwF','gFl','gPo','gWa']"
        check('las piezas de los modelos están en la página, una sola vez', ev(PIECES + ".every(i=>document.querySelectorAll('[id=\"'+i+'\"]').length==1)"),
              str(ev(PIECES + ".filter(i=>document.querySelectorAll('[id=\"'+i+'\"]').length!=1)")))
        # y ya no están las de antes: la pieza grande con los músculos en reposo (fb…) ni una por vista de frente y de espaldas
        check('una sola silueta para las dos vistas, sin los músculos en reposo', ev("![...document.querySelectorAll('[id^=\"fb\"]')].some(e => /^fb[A-Z]/.test(e.id)) && !document.querySelector('#fsFB,#fsBB')"))
        # más humana: la mano abierta y el puño con su pulgar y sus dedos, y la cabeza con su perfil y su oreja (la silueta y,
        # aparte, sus detalles, sin relleno); de frente, cada mano dibujada bajo el antebrazo y las dos orejas
        check('el maniquí tiene manos, cara y orejas', ev("['fqHA','fqHG','fqHD'].every(i => (g => g.tagName == 'g' && g.querySelectorAll('path').length == 2 && g.querySelectorAll('path')[1].getAttribute('fill') == 'none')(document.getElementById(i))) && document.querySelectorAll('#fsB > path').length == 2 && document.querySelectorAll('#fsF0 > path, #fsF1 > path').length == 4"))

        # la hoja «Cómo se hace» de todos: cada una con su figura grande, entera
        bad = ev("""(async () => { const bad = []; const wait = ms => new Promise(r => setTimeout(r, ms));
          for (const e of exAll()) { if (!figPose(e.n)) continue;
            const old = document.querySelector('#sh .fgs'); if (old) old.remove();
            A.exerciseHowTo(0, { dataset: { n: e.n } });
            let st = null;
            for (let i = 0; i < 100 && !(st = document.querySelector('#sh .fgs')); i++) await wait(10);
            if (!st) { bad.push(e.n + ': sin figura'); continue; }
            const uses = [...st.querySelectorAll('use')].map(u => u.getAttribute('href'));
            const held = !!figPose(e.n).hold;
            if (/NaN|undefined/.test(st.innerHTML)) bad.push(e.n + ': fuera de sitio');
            else if (uses.some(h => !document.querySelector(h))) bad.push(e.n + ': usa ' + uses.find(h => !document.querySelector(h)));
            else if (!!st.querySelector('svg[data-fig]') == held) bad.push(e.n + (held ? ': se mantiene y se mueve' : ': no se mueve'));
            else if (document.querySelector('#sh .hwt').textContent != e.n || document.querySelector('#sh .hwp').innerText.length < 80) bad.push(e.n + ': el nombre o el texto');
            else if (document.querySelector('#sh img')) bad.push(e.n + ': lleva una foto');
            // una barra o un trazo del material, casi negro, no se ve sobre el fondo (la barra del remo en T se veía así)
            else if (st.querySelector('path[fill="none"][stroke="#0a0b10"], path[fill="none"][stroke="#0c0d14"], path[d="M0 0H1"][stroke="#0a0b10"], path[d="M0 0H1"][stroke="#0c0d14"]')) bad.push(e.n + ': un trazo del material casi negro');
            // de perfil, ninguna pieza del cuerpo ni del material se sale del recuadro (se cortaría en el borde); en
            // unidades del dibujo, con el margen de lo que una pieza girada abulta de más en su caja
            else if (figPose(e.n).v == 'S') { let over = 0;
              st.querySelectorAll('svg').forEach(svg => { const box = svg.getBoundingClientRect(), k = svg.viewBox.baseVal.width / box.width;
                svg.querySelectorAll('use').forEach(u => { const r = u.getBoundingClientRect();
                  if (r.width || r.height) over = Math.max(over, (box.left - r.left) * k, (r.right - box.right) * k, (box.top - r.top) * k, (r.bottom - box.bottom) * k); }); });
              if (over > 4) bad.push(e.n + ': se corta ' + Math.round(over) + ' en el borde'); } }
          return bad; })()""")
        check('las 551 hojas llevan la figura grande y entera, el nombre y el texto, y ninguna foto', not bad, str(bad[:6]))
        ev("A.closeSheet()")
        pg.clock.run_for(300)

        # librería: en las listas, la miniatura es el modelo haciendo el ejercicio; la de uno propio, sus músculos
        ev("A.openLibrary()")
        pg.clock.run_for(300)
        for q, n in [('press banca', 'Press banca'), ('sentadilla', 'Sentadilla frontal'), ('jalón', 'Jalón al pecho'), ('elevaciones laterales', 'Elevaciones laterales'), ('burpee', 'Burpees')]:
            pg.fill('#sh input', q)
            pg.clock.run_for(500)
            row = "[...document.querySelectorAll('#sh .exr')].find(r=>r.querySelector('b').textContent==%r)" % n
            check('lista: «%s» lleva su figura' % n, ev(IS_FIGURE + "(" + row + ")"))
        pg.fill('#sh input', 'mi ejercicio')
        pg.clock.run_for(500)
        check('lista: un ejercicio propio sigue con sus músculos', ev("(r=>!!r && !" + IS_FIGURE + "(r) && !!r.querySelector('.exth svg'))([...document.querySelectorAll('#sh .exr')].find(r=>r.querySelector('b').textContent=='Mi ejercicio'))"))
        # las mancuernas: dos hexágonos (la de delante y la de atrás) y ninguna barra
        pg.fill('#sh input', 'curl con mancuernas')
        pg.clock.run_for(500)
        check('lista: un ejercicio con mancuernas lleva mancuernas', ev("(g=>g.querySelectorAll('polygon').length == 3 && g.querySelectorAll('circle').length == 0)([...document.querySelectorAll('#sh .exr')].find(r=>r.querySelector('b').textContent=='Curl con mancuernas').querySelector('.exth svg'))"))
        check('en las listas no queda ninguna insignia de foto', ev("!document.querySelector('.phi')"))
        shot('lista')
        # una lista larga no pinta de golpe todas sus figuras: las primeras filas la llevan y las demás esperan (un hueco del
        # mismo tamaño) a acercarse a lo que se ve o, pase lo que pase, a su tanda
        ROWS = "[...document.querySelectorAll('#sh .exr')]"
        SEEN = ROWS + ".filter(r => { const b = r.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight; })"
        HOLES = "document.querySelectorAll('#sh svg[data-pic]').length"
        open_group = "A.openLibrary();[...document.querySelectorAll('#sh [data-a=libraryGroup]')].find(b => /Espalda/.test(b.textContent)).click()"
        # con el reloj de la página parado, las tandas no corren: lo que se ponga es cosa de quien vigila la página
        pg.clock.pause_at(datetime.datetime.fromtimestamp(ev("Date.now()") / 1000 + 1))
        ev(open_group)
        first = ev("(rows => [rows.length, rows.slice(0, 8).every(r => " + IS_FIGURE + "(r)), " + HOLES + "])(" + ROWS + ")")
        check('lista larga: las primeras filas llevan su figura al abrirla y las que no se ven esperan', first[0] > 40 and first[1] and first[2] > first[0] // 2, str(first))
        # (su tamaño de estilo, no el de su caja en pantalla: mientras la fila entra con su animación, la caja sale con
        # decimales de más o de menos, 47,999996 o 48,000004)
        check('y el hueco ocupa lo mismo que la figura', ev("(h => h.getAttribute('width') == '48' && getComputedStyle(h).width == '48px' && getComputedStyle(h).height == '48px' && Math.abs(h.getBoundingClientRect().width - 48) < .01)(document.querySelector('#sh svg[data-pic]'))"))
        # al deslizarla, cada fila que se acerca a lo que se ve recibe su figura. Depende de que el navegador pinte
        # fotogramas: sin pantalla, WebKit y Firefox no lo hacen a su ritmo, así que ahí solo se anota lo que pasa
        worst = 0
        for y in range(600, 14000, 600):
            ev("document.querySelector('#sh .sp').scrollTop = %d" % y)
            # lo normal es que llegue en el fotograma siguiente; en un equipo cargado se le da hasta segundo y medio
            for _ in range(15 if ENGINE == 'chromium' else 2):
                pg.wait_for_timeout(100)
                bare = ev(SEEN + ".filter(r => !" + IS_FIGURE + "(r)).length")
                if not bare:
                    break
            worst = max(worst, bare)
        left = ev(HOLES)
        if ENGINE == 'chromium':
            check('al deslizarla, cada fila que se ve tiene su figura sin esperar a su tanda, y al llegar abajo no queda ninguna', worst == 0 and left == 0, 'sin figura a la vista: %d; huecos al final: %d' % (worst, left))
        else:
            print('        (informativo, %s) al deslizar con el reloj parado: filas a la vista sin figura, %d como mucho; huecos al final, %d' % (ENGINE, worst, left))
            # ¿y si se le obliga a pintar un fotograma tras cada deslizamiento (una captura)? Dice si quien vigila avisa
            # cuando hay fotogramas, que en un móvil los hay siempre
            ev(open_group)
            forced = 0
            for y in range(600, 14000, 600):
                ev("document.querySelector('#sh .sp').scrollTop = %d" % y)
                frame()
                frame()
                forced = max(forced, ev(SEEN + ".filter(r => !" + IS_FIGURE + "(r)).length"))
            for _ in range(10):
                frame()
                if not ev(HOLES):
                    break
            print('        (informativo, %s) con un fotograma forzado tras cada deslizamiento: filas a la vista sin figura, %d como mucho; huecos al final, %d' % (ENGINE, forced, ev(HOLES)))
            check('al deslizarla, con fotogramas, quien vigila la página pone todas las figuras sin esperar a las tandas', ev(HOLES) == 0, 'huecos al final: %d' % ev(HOLES))
        # y, se deslice o no, las que faltan se ponen solas por tandas: en poco más de un segundo no queda ninguna
        ev(open_group)
        before = ev(HOLES)
        pg.clock.run_for(250)
        some = ev(HOLES)
        pg.clock.run_for(1200)
        check('sin tocar la lista, las figuras que faltan se ponen solas por tandas', before > 40 and 0 < some < before and ev(HOLES) == 0 and ev(ROWS + ".every(r => " + IS_FIGURE + "(r))"), 'huecos: %d, %d, %d' % (before, some, ev(HOLES)))
        pg.clock.resume()
        # al escribir en el buscador la lista se pinta de nuevo: lo que se ve lleva figura sin esperar a nada
        ev("A.openLibrary()")
        pg.fill('#sh input', 'press')
        check('buscador: lo que se ve lleva su figura nada más escribir', ev("(rows => rows.length > 0 && rows.every(r => " + IS_FIGURE + "(r)))(" + SEEN + ")"))
        ev("A.closeSheet()")
        pg.clock.run_for(300)
        # ficha: la figura pequeña junto al nombre abre la hoja; ya no hay foto
        i = ev("exAll().findIndex(e=>e.n=='Elevaciones laterales')")
        ev("A.exerciseDetail(%d)" % i)
        pg.clock.run_for(300)
        for _ in range(30):
            if ev("!!document.querySelector('#sh .anb[data-a=exerciseHowTo]')"):
                break
            pg.wait_for_timeout(100)
        check('ficha: la figura del ejercicio, junto al nombre, se puede tocar', ev(IS_FIGURE + "(document.querySelector('#sh .anb[data-a=exerciseHowTo]'))"))
        check('ficha: el mapa muscular sigue', ev("document.querySelectorAll('#sh .anf svg').length == 2"))
        check('ficha: sin foto', ev("!document.querySelector('#sh .exph') && !document.querySelector('#sh img')"))
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

        # la hoja, con detalle, de un ejercicio de cada clase: figura grande, músculos en pequeño a la izquierda, nombre y
        # texto, en ese orden; y la figura se mueve
        for n in MOVING:
            how(n)
            check('hoja de «%s»: la figura grande' % n, ev("!!document.querySelector('#sh .fgs svg[data-fig]') && " + IS_FIGURE + "(document.querySelector('#sh .fgs'))"))
            check('hoja de «%s»: los músculos en pequeño, de frente y de espaldas' % n, ev("document.querySelectorAll('#sh .hwm .hwf svg').length == 2"))
            check('hoja de «%s»: el nombre y los músculos con su nombre' % n, ev("document.querySelector('#sh .hwm .hwt').textContent == %r && document.querySelectorAll('#sh .hwm .hwl').length >= 1 && /^Principal /.test(document.querySelector('#sh .hwl').textContent)" % n))
            order = ev("""(() => { const y = s => document.querySelector('#sh ' + s).getBoundingClientRect(); const f = y('.fgs'), m = y('.hwf'), t = y('.hwm .hwt'), p = y('.hwp');
              return [f.bottom <= m.top + 1, m.bottom <= p.top + 1, m.right <= t.left + 1, m.left - f.left < 2, f.width > 300 && f.height > 200, m.width < 110]; })()""")
            check('hoja de «%s»: figura arriba, músculos debajo a la izquierda, texto después' % n, all(order), str(order))
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
        # el maniquí: la silueta clara, también la cabeza, y el brazo y la pierna de atrás pintados en un tono más oscuro (no
        # huecos); si el ejercicio trabaja el cuerpo entero, la silueta va en rojo apagado y lo que más trabaja, encima, en
        # rojo y naranja, como en su mapa muscular. Y el suelo, a lo ancho del recuadro
        STAGE = "document.querySelector('#sh .fgs svg')"
        how('Sentadilla')
        check('hoja de «Sentadilla»: la silueta clara, con su cabeza, y el brazo y la pierna de atrás más oscuros', ev("(s => s.querySelector('use[href=\"#fqHD\"]').getAttribute('fill') == 'url(#gSm)' && s.querySelector('use[href=\"#fqTX\"]').getAttribute('fill') == 'url(#gSm)' && [...s.querySelectorAll('use[href=\"#fqTH\"]')].map(u => u.getAttribute('fill')).sort().join() == '#3b4162,url(#gSm)')(" + STAGE + ")"))
        check('hoja de «Sentadilla»: el suelo va a lo ancho del recuadro', ev("(s => { const r = s.querySelector('rect[fill=\"url(#gFl)\"]'), v = s.viewBox.baseVal; return !!r && Math.abs(+r.getAttribute('x') - v.x) <= 1 && Math.abs(+r.getAttribute('width') - v.width) <= 1; })(" + STAGE + ")"))
        how('Burpees')
        check('hoja de «Burpees»: trabaja el cuerpo entero: la silueta en rojo apagado y lo que más trabaja, encima', ev("(s => [...s.querySelectorAll('use[href^=\"#fq\"]')].every(u => ['url(#gSw)', '#4f2a35'].includes(u.getAttribute('fill'))) && !!s.querySelector('use[fill=\"url(#gOr)\"]'))(" + STAGE + ")"))
        check('hoja de «Burpees»: y su mapa muscular, igual', ev("!!document.querySelector('#sh .hwf use[fill=\"url(#gWa)\"]') && !!document.querySelector('#sh .hwf use[fill=\"url(#gOr)\"]')"))
        how('Elevaciones laterales')
        check('hoja de «Elevaciones laterales»: de frente, la silueta con una sola luz para todo el cuerpo', ev("(s => [...s.querySelectorAll('use[href^=\"#fs\"]')].length == 9 && [...s.querySelectorAll('use[href^=\"#fs\"]')].every(u => u.getAttribute('fill') == 'url(#gSmF)'))(" + STAGE + ")"))
        # un ciclo (pedalear, subir peldaños, correr) no para ni vuelve atrás: en dos ciclos y medio no hay dos momentos
        # seguidos iguales, y a mitad de ciclo las piernas han cambiado los papeles
        for n, half in [('Bicicleta', 760), ('Escaladora', 1000), ('Carrera 1 km', 430), ('Assault bike calorías', 680), ('Comba', 460), ('Double unders', 640), ('Comba boxeo', 400)]:
            how(n)
            seen = [ev(LAYERS)]
            for _ in range(24):
                pg.clock.run_for(half * 5 // 24)
                seen.append(ev(LAYERS))
            check('hoja de «%s»: no se detiene en ningún momento del ciclo' % n, all(a != b for a, b in zip(seen, seen[1:])) and 'NaN' not in ''.join(seen))
        # un gesto seguido (remar, el SkiErg, una serie de golpes) va y vuelve sin pararse en los extremos: mirado a pasos
        # iguales, no hay tres momentos seguidos iguales (dos sí puede haberlos, a un lado y otro de la vuelta), pasa por
        # posturas bien distintas y, al cabo de unos gestos enteros, está donde estaba. El reloj de la página se para y solo
        # avanza lo que se le pide: si no, lo que tarda la propia prueba mueve la figura
        def numbers(layers):
            return [float(x) for x in re.findall(r'-?\d+\.?\d*', layers)]

        pg.clock.pause_at(datetime.datetime.fromtimestamp(ev("Date.now()") / 1000 + 1))
        for n, period, steps in [('Remo 1000 m', 2200, 20), ('SkiErg 1000 m', 1900, 20), ('Saco de boxeo', 1920, 16)]:
            how(n)
            seen = [ev(LAYERS)]
            for _ in range(steps):
                pg.clock.run_for(period // steps)
                seen.append(ev(LAYERS))
            still = [i for i in range(len(seen) - 2) if seen[i] == seen[i + 1] == seen[i + 2]]
            check('hoja de «%s»: va y vuelve sin pararse en los extremos' % n, not still and len(set(seen)) >= steps // 2 and 'NaN' not in ''.join(seen), 'parada hacia el paso %s; posturas distintas: %d' % (still[:1], len(set(seen))))
            # se compara tras un número de gestos que sean fotogramas enteros (el reloj de prueba los da cada 16 ms): así el
            # último fotograma cae en el mismo punto del gesto y la figura tiene que estar exactamente igual
            whole = next(k for k in range(1, 17) if k * period % 16 == 0)
            pg.clock.run_for(period * (whole - 1))
            first, last = numbers(seen[0]), numbers(ev(LAYERS))
            far = max([abs(a - b) for a, b in zip(first, last)] or [99]) if len(first) == len(last) else 99
            check('hoja de «%s»: al cabo de %s está donde estaba' % (n, 'un gesto entero' if whole == 1 else '%d gestos enteros' % whole), far <= .2, 'se aparta %.1f' % far)
            # (si una pieza pasa a verse en escorzo, su transformación lleva más números: es otra postura sin más que mirar)
            half = numbers(seen[steps // 2])
            check('hoja de «%s»: y a medio gesto, en otra postura' % n, len(half) != len(first) or max(abs(a - b) for a, b in zip(first, half)) > 20)
        # la comba: la cuerda da una vuelta entera por salto, girando sobre las manos (dos en los dobles)
        ROPE = "[...document.querySelectorAll('#sh svg[data-fig] > g')].map(g => g.getAttribute('transform') || '').filter(t => /^translate\\([^)]*\\) rotate\\([^)]*\\)$/.test(t)).map(t => Math.round(parseFloat(t.split('rotate(')[1])))"
        for n, cycle, turns in [('Comba', 460, 1), ('Double unders', 640, 2)]:
            how(n)
            angles = []
            for _ in range(8 * turns):
                pg.clock.run_for(cycle // (8 * turns))
                angles.append(ev(ROPE))
            turned = [((b[0] - a[0]) % 360) for a, b in zip(angles, angles[1:])] if all(len(a) == 2 for a in angles) else []
            check('hoja de «%s»: la cuerda y su mango giran a la vez, siempre hacia delante, %d vuelta(s) por salto' % (n, turns), len(turned) == 8 * turns - 1 and all(a[0] == a[1] for a in angles) and all(30 <= d <= 60 for d in turned), str(angles[:4]) + ' ' + str(turned))
        pg.clock.resume()
        how('Escaladora')
        steps = "document.querySelector('#sh svg[data-fig] > g').getAttribute('transform')"
        s0 = ev(steps)
        pg.clock.run_for(300)
        check('escaladora: los peldaños se deslizan', ev(steps) != s0 and ev(steps).startswith('translate('), '%s → %s' % (s0, ev(steps)))
        # una postura que se mantiene: una sola figura, quieta
        for n in HELD:
            how(n)
            check('hoja de «%s»: una sola figura, que no se mueve' % n, ev("!document.querySelector('#sh svg[data-fig]') && document.querySelectorAll('#sh .fgs svg').length == 1 && " + IS_FIGURE + "(document.querySelector('#sh .fgs')) && !document.querySelector('#sh .fgs figcaption')"))
        shot('hoja_quieta')
        # un ejercicio propio: sus músculos, como antes
        how('Mi ejercicio')
        check('ejercicio propio: sus músculos, sin figura', ev("!!document.querySelector('#sh .hwa svg') && !document.querySelector('#sh .fgs') && document.querySelector('#sh .hwt').textContent == 'Mi ejercicio'"), str(ev("document.querySelector('#sh .sp').innerHTML.slice(0,200)")))
        ev("A.closeSheet()")
        pg.clock.run_for(300)
        check('al cerrar la hoja no queda ninguna figura moviéndose', ev("!document.querySelector('svg[data-fig]')"))

        # en un móvil estrecho y en una tableta, la hoja no se sale de ancho y la figura no pasa de su alto
        for w, h in [(320, 568), (768, 1024)]:
            pg.set_viewport_size({'width': w, 'height': h})
            for n in ['Press banca', 'Sentadilla', 'Elevaciones laterales', 'Remo en polea baja', 'Burpees', 'Dominadas']:
                how(n)
                box = ev("""(() => { const s = document.querySelector('#sh .sp'), f = document.querySelector('#sh .fgs svg').getBoundingClientRect(), t = document.querySelector('#sh .hwm').getBoundingClientRect();
                  return [s.scrollWidth <= s.clientWidth + 1, f.height <= 341 && f.height > 150, f.right <= s.getBoundingClientRect().right + 1, t.right <= s.getBoundingClientRect().right + 1]; })()""")
                check('a %d px, la hoja de «%s» cabe' % (w, n), all(box), str(box))
            if shots:
                shot('ancho_%d' % w)
            ev("A.closeSheet()")
            pg.clock.run_for(200)
        pg.set_viewport_size({'width': 390, 'height': 844})

        # con «Reducir animaciones»: las posturas quietas, con su rótulo
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
        red, orange, slate, _, _ = painted(capture(pg.locator('#sh .fgs')))
        print('        pintado (rojo, naranja, gris azulado): sentadilla %.4f %.4f %.4f' % (red, orange, slate))
        check('sentadilla: se ven los músculos principales, los secundarios y el resto del cuerpo', red > .009 and orange > .004 and slate > .012, '%.4f %.4f %.4f' % (red, orange, slate))
        how('Elevaciones laterales')
        settled()
        ini = painted(capture(pg.locator('#sh .fgs figure').nth(0)))
        fin = painted(capture(pg.locator('#sh .fgs figure').nth(1)))
        print('        pintado: elevaciones, inicio %s · final %s' % (' '.join('%.4f' % v if isinstance(v, float) else str(v) for v in ini), ' '.join('%.4f' % v if isinstance(v, float) else str(v) for v in fin)))
        check('elevaciones: se ven el deltoides, los secundarios y el cuerpo', fin[0] > .0015 and fin[1] > .002 and fin[2] > .015, str(fin))
        check('elevaciones: al final, las mancuernas están en los extremos; al inicio, no', fin[3] > 12 and fin[4] > 12 and ini[3] < 4 and ini[4] < 4, str([ini, fin]))
        how('Press banca')
        settled()
        red, orange, slate, _, _ = painted(capture(pg.locator('#sh .fgs figure').nth(1)))
        print('        pintado: press banca %.4f %.4f %.4f' % (red, orange, slate))
        check('press banca: se ven el pectoral, los secundarios y el cuerpo', red > .0008 and orange > .0008 and slate > .018, '%.4f %.4f %.4f' % (red, orange, slate))
        # de espaldas: el deltoides posterior, que de frente no se ve
        how('Pájaros en máquina')
        settled()
        red, orange, slate, _, _ = painted(capture(pg.locator('#sh .fgs figure').nth(1)))
        print('        pintado: pájaros en máquina, de espaldas %.4f %.4f %.4f' % (red, orange, slate))
        check('pájaros en máquina: de espaldas se ve el deltoides posterior', red > .0006 and slate > .012, '%.4f %.4f %.4f' % (red, orange, slate))
        # si la postura intermedia solo está para guiar el camino (el paso de una zancada, las rodillas de un peso muerto,
        # la media vuelta de un pedal), se enseñan dos, como siempre
        for n in ['Peso muerto', 'Zancadas', 'Bicicleta', 'Remo 1000 m', 'SkiErg 1000 m']:
            how(n)
            check('reducir animaciones, «%s»: dos posturas, «Inicio» y «Final»' % n, ev("[...document.querySelectorAll('#sh .fgs.two figcaption')].map(x=>x.textContent).join() == 'Inicio,Final' && new Set([...document.querySelectorAll('#sh .fgs.two svg')].map(s=>s.innerHTML)).size == 2"))
        # con postura intermedia: tres posturas; la que se mantiene: una, sin rótulo
        for n in THREE:
            how(n)
            check('reducir animaciones, «%s»: tres posturas, «Inicio», «Paso» y «Final»' % n, ev("[...document.querySelectorAll('#sh .fgs.two figcaption')].map(x=>x.textContent).join() == 'Inicio,Paso,Final' && new Set([...document.querySelectorAll('#sh .fgs.two svg')].map(s=>s.innerHTML)).size == 3"))
            fits = ev("(() => { const s = document.querySelector('#sh .sp'); return s.scrollWidth <= s.clientWidth + 1; })()")
            check('reducir animaciones, «%s»: las tres caben a lo ancho' % n, fits)
        shot('tres')
        # un salto que acaba como empieza (la comba): en el suelo y en el aire, con la cuerda bajo los pies
        for n in ['Comba', 'Double unders', 'Comba boxeo']:
            how(n)
            check('reducir animaciones, «%s»: dos posturas, «Inicio» y «Salto»' % n, ev("[...document.querySelectorAll('#sh .fgs.two figcaption')].map(x=>x.textContent).join() == 'Inicio,Salto' && new Set([...document.querySelectorAll('#sh .fgs.two svg')].map(s=>s.innerHTML)).size == 2"))
        shot('salto')
        how('Plancha')
        check('reducir animaciones: una postura que se mantiene sigue siendo una sola figura', ev("document.querySelectorAll('#sh .fgs svg').length == 1 && !document.querySelector('#sh .fgs figcaption')"))
        ev("A.closeSheet()")
        ev("S.reduceMotion=0;saveState()")
        pg.clock.run_for(200)
        # y en pequeño: el pictograma de la sentadilla, con sus músculos en color
        ev("A.openLibrary()")
        pg.clock.run_for(300)
        pg.fill('#sh input', 'sentadilla')
        pg.clock.run_for(500)
        settled()
        red, orange, _, _, _ = painted(capture(pg.locator('#sh .exr .exth').first))
        print('        pintado: miniatura de la sentadilla %.4f %.4f' % (red, orange))
        check('miniatura de la sentadilla: los músculos en color', red > .01 and orange > .004, '%.4f %.4f' % (red, orange))
        ev("A.closeSheet()")
        pg.clock.run_for(200)

        # entreno: la miniatura es la figura y abre la hoja
        ev("S.tab=0;S.selectedWeekday=0;S.selectedDay=0;R()")
        ev("A.startWorkout()")
        pg.clock.run_for(400)
        sel = "document.querySelector('.xs .th[data-a=exerciseHowTo]')"
        check('entreno: la miniatura es el modelo haciendo el ejercicio', ev(IS_FIGURE + "(" + sel + ")"))
        check('entreno: todas las miniaturas son figuras', ev("[...document.querySelectorAll('.xs .th[data-a=exerciseHowTo]')].every(" + IS_FIGURE + ")"))
        size = ev("(r=>[Math.round(r.width),Math.round(r.height)])(" + sel + ".querySelector('svg').getBoundingClientRect())")
        check('entreno: la miniatura cabe en su recuadro', size == [64, 64], str(size))
        shot('entreno')
        ev(sel + ".click()")
        pg.clock.run_for(300)
        for _ in range(30):
            if ev("!!document.querySelector('#sh .hwp')"):
                break
            pg.wait_for_timeout(100)
        check('entreno: al tocarla se abre la hoja con la figura grande y el texto', ev("!!document.querySelector('#sh .fgs svg') && document.querySelector('#sh .hwp').innerText.length > 80"))
        ev("document.querySelector('#sh [data-a=exerciseDetailByName]').click()")
        pg.clock.run_for(400)
        for _ in range(30):
            if ev("!!document.querySelector('#sh .anf')"):
                break
            pg.wait_for_timeout(100)
        check('entreno: desde la hoja se abre la ficha, sin «+ Al día» ni variantes', ev("!!document.querySelector('#sh .anf') && !document.querySelector('#sh [data-a=libraryAddToDay]')"))
        check('el entreno sigue en marcha', ev('!!W'))
        ev("A.closeSheet()")
        pg.clock.run_for(200)

        errs = [e for e in errs if 'favicon' not in e]
        check('sin errores de JS', not errs, str(errs[:3]))
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
