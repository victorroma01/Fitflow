"""Prueba de las figuras de ejercicio: el modelo 3D haciendo cada ejercicio de la librería, en las miniaturas (una imagen que
se dibuja una vez y se guarda en el móvil) y, al tocar la imagen, en la hoja «Cómo se hace»: figura grande que se mueve con
el gesto (o sus posturas quietas, con «Reducir animaciones»), músculos en pequeño a la izquierda con sus nombres, y el
texto. Las 527 miniaturas se dibujan todas; unas cuantas hojas, de cada clase de gesto, se miran con detalle. El motor por
dentro (todos los ejercicios en todo el gesto) lo prueba tests/fig3d.test.mjs, sin navegador.

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
# la huella de las figuras (data/figstamp) y la versión de la app, como están en el código
FIG_STAMP = re.search(r"^export const FIG_STAMP = '(\w+)';$", rd('../src/js/data/figstamp.js'), re.M).group(1)
APPV = re.search(r"^export const APPV = '([\d.]+)';$", rd('../src/js/core/util.js'), re.M).group(1)
fails = []
# uno de cada clase de gesto: de ida y vuelta con barra, con mancuernas, en máquina y en polea; de frente y de espaldas; una
# secuencia (clean & jerk, burpee); un ciclo (la bici, el remo, la carrera, la comba); los golpes al saco; el agua; y una
# postura que se mantiene (la plancha)
MOVING = ['Press banca', 'Sentadilla', 'Curl con mancuernas', 'Jalón al pecho', 'Remo en polea baja', 'Elevaciones laterales', 'Pájaros en máquina',
          'Abducción en máquina', 'Clean & jerk', 'Burpees', 'Bicicleta', 'Remo 1000 m', 'Carrera 1 km', 'Comba', 'Saco de boxeo', 'Natación', 'Plancha']
# la figura de una miniatura es una imagen (<img>, la que se dibujó) y su sitio mientras tanto, un hueco (svg[data-pic])
IS_PICTURE = "(el => !!el && !!el.querySelector('img') && !el.querySelector('svg[data-pic]'))"
HOLES = "document.querySelectorAll('svg[data-pic]').length"
# la figura grande: puesta (data-on) y dibujada
STAGE = "document.querySelector('#sh .figure-stage svg[data-f3]')"
DRAWN = "(s => !!s && s.hasAttribute('data-on') && s.children.length > 40 && s.getAttribute('viewBox') != '0 0 400 300')(" + STAGE + ")"


def painted(png):
    """Qué hay pintado en una captura: fracción de píxeles rojos (músculo principal), naranjas (secundario) y del gris azulado
    del cuerpo, y cuántos píxeles claros (el material) hay en el quinto izquierdo y en el derecho. Los umbrales de las
    comprobaciones son menos de la mitad de lo medido en Chromium (queda en el registro), para que el suavizado de otro motor
    no las haga fallar; si no se pinta la figura, todo sale a cero."""
    a = np.asarray(Image.open(io.BytesIO(png)).convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    n = r.size
    red = ((r > 150) & (g < 90) & (b < 100) & (r - g > 80)).sum() / n
    orange = ((r > 180) & (g > 100) & (g < 200) & (b < 110) & (r - b > 90)).sum() / n
    slate = ((b > r + 10) & (b > g + 4) & (r > 30) & (r < 130) & (b < 190)).sum() / n
    light = (r > 140) & (g > 145) & (b > 160) & (abs(r - b) < 60)
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

        def settle(cond, rounds=80):
            """Hasta que se cumpla cond: lo que tarda de verdad (descargar el motor, pasar el dibujo a imagen, IndexedDB) va con el
            reloj de verdad, y los respiros entre miniatura y miniatura y los fotogramas, con el de la prueba: se dejan correr los
            dos."""
            for _ in range(rounds):
                if ev(cond):
                    return True
                pg.clock.run_for(100)
                pg.wait_for_timeout(30)
            return bool(ev(cond))

        def how(n):
            """Abre la hoja «Cómo se hace» de un ejercicio, como al tocar su imagen, y espera a su figura."""
            ev("A.exerciseHowTo(0,{dataset:{n:%r}})" % n)
            pg.clock.run_for(300)
            settle("!!document.querySelector('#sh .howto-text') && (!!document.querySelector('#sh .figure-stage.on, #sh .figure-stage svg.on') || !document.querySelector('#sh .figure-stage'))")

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

        def settled():
            """Espera a que la hoja termine de entrar (y la figura, de aparecer): sus animaciones van con el reloj de verdad, y
            una captura a medias sale desplazada o medio transparente."""
            for _ in range(60):
                if ev("!document.getAnimations || document.getAnimations().every(a=>a.playState!='running')"):
                    break
                pg.clock.run_for(50)
                pg.wait_for_timeout(50)
            pg.wait_for_timeout(150)

        def frames(n, ms, steps):
            """La figura grande en steps momentos, cada ms de reloj."""
            out = [ev(STAGE + ".innerHTML.length + ':' + " + STAGE + ".innerHTML.slice(2000, 2400)")]
            for _ in range(steps):
                pg.clock.run_for(ms)
                out.append(ev(STAGE + ".innerHTML.length + ':' + " + STAGE + ".innerHTML.slice(2000, 2400)"))
            return out

        check('arranca', ev('!!window.__ffok'))
        ev("S.reduceMotion=0;S.customExercises=[{n:'Mi ejercicio',c:'Culturismo',g:'Propio',t:'Personalizado',p:['ps'],s:['tr'],q:'Otro'}];saveState()")

        # datos: todos los ejercicios de la librería tienen su figura; uno propio, no
        n_lib = ev("exAll().length - S.customExercises.length")
        check('la librería tiene sus 527 ejercicios', n_lib == 527, str(n_lib))
        miss = ev("exAll().filter(e=>!exHasFigure(e.n)).map(e=>e.n)")
        check('todos los ejercicios de la librería tienen figura, y el propio no', miss == ['Mi ejercicio'], str(miss[:8]))
        check('cada figura de la tabla es de un ejercicio que existe', ev("Object.keys(FIG_POSES).every(n=>exAll().some(e=>e.n==n))"))
        check('el motor no se descarga al abrir la app', not ev("!!document.getElementById('g3Ne0')"))

        # las 527 miniaturas, dibujadas: cada una es una imagen de su tamaño (WebP en Chromium; PNG donde no hay WebP)
        bad = ev("""(async () => { const f = await loadFigures(); const bad = [];
          for (const e of exAll()) { if (!exHasFigure(e.n)) continue;
            try { const o = await f.thumb(e.n, 96);
              const img = new Image(); img.src = URL.createObjectURL(o.blob); await img.decode();
              if (!/^image\\/(webp|png)$/.test(o.blob.type) || o.blob.size < 1200 || img.naturalWidth != 96 || img.naturalHeight != 96 || !o.keep) bad.push(e.n + ': ' + o.blob.type + ' ' + o.blob.size + ' ' + img.naturalWidth);
              URL.revokeObjectURL(img.src); }
            catch (err) { bad.push(e.n + ': ' + err); } }
          return bad; })()""")
        check('las 527 miniaturas se dibujan, cada una como imagen de su tamaño', not bad, str(bad[:6]))
        check('los degradados del motor están en la página, una sola vez', ev("['g3Ne0','g3Rd0','g3Or0'].every(i=>document.querySelectorAll('[id=\"'+i+'\"]').length==1)"))

        # librería: en las listas, la miniatura es el modelo haciendo el ejercicio; la de uno propio, sus músculos
        ev("A.openLibrary()")
        pg.clock.run_for(300)
        ROW = "[...document.querySelectorAll('#sh .item-split')].find(r=>r.querySelector('b').textContent==%r)"
        for q, n in [('press banca', 'Press banca'), ('sentadilla', 'Sentadilla frontal'), ('jalón', 'Jalón al pecho'), ('elevaciones laterales', 'Elevaciones laterales'), ('burpee', 'Burpees')]:
            pg.fill('#sh input', q)
            pg.clock.run_for(500)
            check('lista: «%s» lleva su figura' % n, settle(IS_PICTURE + "(" + ROW % n + ")"))
        size = ev("(i => [i.naturalWidth, Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)])((" + ROW % 'Burpees' + ").querySelector('.exercise-thumb img'))")
        check('lista: la imagen ocupa su recuadro de 48 px y tiene la resolución de la pantalla (72 × 2)', size == [144, 48, 48], str(size))
        pg.fill('#sh input', 'mi ejercicio')
        pg.clock.run_for(500)
        check('lista: un ejercicio propio sigue con sus músculos', ev("(r=>!!r && !r.querySelector('img') && !!r.querySelector('.exercise-thumb svg use'))(" + ROW % 'Mi ejercicio' + ")"))
        check('en las listas no queda ninguna insignia de foto', ev("!document.querySelector('.phi')"))
        shot('lista')
        # una lista larga: las primeras filas piden su figura al abrirla y las demás esperan en un hueco del mismo tamaño; luego,
        # con la lista abierta, se ponen todas (primero las que se ven)
        ROWS = "[...document.querySelectorAll('#sh .item-split')]"
        open_group = "A.openLibrary();[...document.querySelectorAll('#sh [data-a=libraryGroup]')].find(b => /Espalda/.test(b.textContent)).click()"
        ev(open_group)
        first = ev("(rows => [rows.length, " + HOLES + "])(" + ROWS + ")")
        check('lista larga: al abrirla, las filas sin figura aún llevan su hueco', first[0] > 40 and first[1] > 30, str(first))
        check('y el hueco ocupa lo mismo que la figura', ev("(h => h.getAttribute('width') == '48' && getComputedStyle(h).width == '48px' && getComputedStyle(h).height == '48px')(document.querySelector('#sh svg[data-pic]'))"))
        check('con la lista abierta, todas sus filas acaban con su figura', settle(HOLES + " == 0", 400) and ev(ROWS + ".every(r => " + IS_PICTURE + "(r))"), 'huecos: %d' % ev(HOLES))
        # al volver a abrirla, ya están todas: ni un hueco
        ev(open_group)
        check('al volver a abrirla, todas las figuras están al momento', ev(HOLES) == 0 and ev(ROWS + ".every(r => " + IS_PICTURE + "(r))"), 'huecos: %d' % ev(HOLES))
        ev("A.closeSheet()")
        pg.clock.run_for(300)
        # guardadas en el móvil: tras recargar, la lista las tiene sin dibujar nada (sin el motor)
        saved = ev("""new Promise(r => { const q = indexedDB.open('fffig'); q.onsuccess = () => { const st = q.result.transaction('mini').objectStore('mini'), k = st.getAllKeys(), v = st.getAll();
          v.onsuccess = () => { const rows = v.result.filter(x => x && x.d), stamp = v.result.find(x => typeof x == 'string');
            r([rows.length, rows.every(x => /^image\\/(webp|png)$/.test(x.t) && x.d instanceof ArrayBuffer && x.d.byteLength > 1000), stamp, k.result.includes('Dominadas')]); q.result.close(); }; }; q.onerror = () => r([0, false]); })""")
        check('las miniaturas dibujadas quedan guardadas en el móvil, con la huella de las figuras y su tamaño', saved[0] >= 60 and saved[1] and saved[2] == FIG_STAMP + ' 144' and saved[3], str(saved))
        pg.reload()
        pg.clock.run_for(800)
        ev(open_group)
        check('tras recargar, la lista las tiene todas, de lo guardado', settle(HOLES + " == 0", 60) and ev(ROWS + ".every(r => " + IS_PICTURE + "(r))"), 'huecos: %d' % ev(HOLES))
        check('y sin descargar el motor', not ev("!!document.getElementById('g3Ne0')"))
        ev("A.closeSheet()")
        pg.clock.run_for(300)
        # si lo guardado es de otras figuras (otra huella), se tira y se dibujan otra vez; con la misma huella valen aunque
        # la app sea otra versión (la huella no lleva la versión)
        ev("""new Promise(r => { const q = indexedDB.open('fffig'); q.onsuccess = () => { const tx = q.result.transaction('mini', 'readwrite'); tx.objectStore('mini').put('otras 144', '\\0de');
          tx.oncomplete = () => { q.result.close(); r(1); }; }; })""")
        pg.reload()
        pg.clock.run_for(800)
        ev(open_group)
        pg.clock.run_for(200)
        again = ev("""new Promise(r => { const q = indexedDB.open('fffig'); q.onsuccess = () => { const st = q.result.transaction('mini').objectStore('mini'), k = st.getAllKeys(), v = st.get('\\0de');
          v.onsuccess = () => { r([k.result.length, v.result]); q.result.close(); }; }; })""")
        check('lo guardado de otras figuras (otra huella) se tira', again[0] < saved[0] and again[1] == FIG_STAMP + ' 144', str(again))
        check('y se dibujan otra vez, con el motor', settle(HOLES + " == 0", 400) and ev("!!document.getElementById('g3Ne0')") and ev(ROWS + ".every(r => " + IS_PICTURE + "(r))"), 'huecos: %d' % ev(HOLES))
        check('la huella de las figuras no lleva la versión de la app', APPV not in FIG_STAMP and re.fullmatch(r'[0-9a-f]{20}', FIG_STAMP) is not None, FIG_STAMP)
        ev("A.closeSheet()")
        pg.clock.run_for(300)
        # ficha: la figura pequeña junto al nombre abre la hoja; no hay foto
        i = ev("exAll().findIndex(e=>e.n=='Elevaciones laterales')")
        ev("A.exerciseDetail(%d)" % i)
        pg.clock.run_for(300)
        check('ficha: la figura del ejercicio, junto al nombre, se puede tocar', settle(IS_PICTURE + "(document.querySelector('#sh .anatomy-box[data-a=exerciseHowTo]'))"))
        check('ficha: el mapa muscular sigue', ev("document.querySelectorAll('#sh .anatomy-full svg').length == 2"))
        check('ficha: sin foto', ev("!document.querySelector('#sh .exph')"))
        shot('ficha')
        ev("document.querySelector('#sh .anatomy-box[data-a=exerciseHowTo]').click()")
        pg.clock.run_for(300)
        check('ficha: al tocarla se abre la hoja con la figura, con la vuelta a la ficha', settle(DRAWN) and ev("!!document.querySelector('#sh [data-a=exerciseDetail]')"))
        ev("A.closeSheet()")
        pg.clock.run_for(200)

        # la hoja, con detalle, de un ejercicio de cada clase: figura grande, músculos en pequeño a la izquierda, nombre y
        # texto, en ese orden; y la figura se mueve
        for n in MOVING:
            how(n)
            check('hoja de «%s»: la figura grande, dibujada' % n, ev(DRAWN))
            check('hoja de «%s»: sin números rotos ni fotos' % n, not ev("/NaN|undefined|Infinity/.test(document.querySelector('#sh .figure-stage').innerHTML)") and not ev("!!document.querySelector('#sh img')"))
            check('hoja de «%s»: los músculos en pequeño, de frente y de espaldas' % n, ev("document.querySelectorAll('#sh .howto-head .howto-maps svg').length == 2"))
            check('hoja de «%s»: el nombre y los músculos con su nombre' % n, ev("document.querySelector('#sh .howto-head .howto-title').textContent == %r && document.querySelectorAll('#sh .howto-head .howto-muscles').length >= 1 && /^Principal /.test(document.querySelector('#sh .howto-head .howto-muscles').textContent) && document.querySelector('#sh .howto-text').innerText.length > 80" % n))
            order = ev("""(() => { const y = s => document.querySelector('#sh ' + s).getBoundingClientRect(); const f = y('.figure-stage'), m = y('.howto-maps'), t = y('.howto-head .howto-title'), p = y('.howto-text');
              return [f.bottom <= m.top + 1, m.bottom <= p.top + 1, m.right <= t.left + 1, m.left - f.left < 2, f.width > 300 && f.height > 200, m.width < 110, Math.abs(f.width / f.height - 4 / 3) < .02]; })()""")
            check('hoja de «%s»: figura arriba (4:3), músculos debajo a la izquierda, texto después' % n, all(order), str(order))
            fits = ev("(() => { const s = document.querySelector('#sh .sheet'); return s.scrollWidth <= s.clientWidth + 1; })()")
            check('hoja de «%s»: no se sale de ancho' % n, fits)
            # se mueve, y sigue en su sitio tras varios gestos
            seen = frames(n, 350, 3)
            check('hoja de «%s»: la figura se mueve' % n, len(set(seen)) >= 3, str([s[:20] for s in seen]))
            pg.clock.run_for(8000)
            check('hoja de «%s»: y sigue dibujada tras varios gestos' % n, ev(DRAWN) and not ev("/NaN|undefined/.test(" + STAGE + ".innerHTML)"))
            if n in ('Press banca', 'Clean & jerk', 'Natación'):
                shot('hoja_' + n.split()[0].lower())
        # un ciclo (pedalear, correr, saltar a la comba) no para en ningún momento
        for n, cycle in [('Bicicleta', 1400), ('Carrera 1 km', 1260), ('Comba', 1150)]:
            how(n)
            seen = frames(n, cycle // 24, 30)
            check('hoja de «%s»: no se detiene en ningún momento del ciclo' % n, all(a != b for a, b in zip(seen, seen[1:])), str([i for i, (a, b) in enumerate(zip(seen, seen[1:])) if a == b][:5]))
        # solo se dibuja mientras se ve: con la figura fuera de la vista, no cambia
        how('Sentadilla')
        ev("document.querySelector('#sh .sheet').scrollTop = 4000")
        pg.clock.run_for(200)
        pg.wait_for_timeout(200)
        pg.clock.run_for(200)
        hidden = ev("document.querySelector('#sh .sheet').scrollHeight > document.querySelector('#sh .sheet').clientHeight + 200")
        if hidden:
            a = ev(STAGE + ".innerHTML")
            pg.clock.run_for(900)
            check('fuera de la vista, la figura no se dibuja', ev(STAGE + ".innerHTML") == a)
        ev("A.closeSheet()")
        pg.clock.run_for(300)
        check('al cerrar la hoja no queda ninguna figura grande', ev("!document.querySelector('svg[data-f3]')"))
        # un ejercicio propio: sus músculos, como antes
        how('Mi ejercicio')
        check('ejercicio propio: sus músculos, sin figura', ev("!!document.querySelector('#sh .howto-anatomy svg') && !document.querySelector('#sh .figure-stage') && document.querySelector('#sh .howto-title').textContent == 'Mi ejercicio'"))
        ev("A.closeSheet()")
        pg.clock.run_for(300)

        # en un móvil estrecho y en una tableta, la hoja no se sale de ancho y la figura no pasa de su alto
        for w, h in [(320, 568), (768, 1024)]:
            pg.set_viewport_size({'width': w, 'height': h})
            for n in ['Press banca', 'Sentadilla', 'Elevaciones laterales', 'Remo en polea baja', 'Burpees', 'Dominadas']:
                how(n)
                box = ev("""(() => { const s = document.querySelector('#sh .sheet'), f = document.querySelector('#sh .figure-stage').getBoundingClientRect(), t = document.querySelector('#sh .howto-head').getBoundingClientRect();
                  return [s.scrollWidth <= s.clientWidth + 1, f.height <= 341 && f.height > 150, f.right <= s.getBoundingClientRect().right + 1, t.right <= s.getBoundingClientRect().right + 1]; })()""")
                check('a %d px, la hoja de «%s» cabe' % (w, n), all(box), str(box))
            if shots:
                shot('ancho_%d' % w)
            ev("A.closeSheet()")
            pg.clock.run_for(200)
        pg.set_viewport_size({'width': 390, 'height': 844})

        # con «Reducir animaciones»: las posturas quietas
        ev("S.reduceMotion=1;saveState()")
        how('Sentadilla')
        check('reducir animaciones: dos posturas quietas, «Inicio» y «Final»', ev("!document.querySelector('#sh svg[data-f3]') && [...document.querySelectorAll('#sh .figure-stage.two figcaption')].map(x=>x.textContent).join() == 'Inicio,Final'"))
        t0 = ev("document.querySelector('#sh .figure-stage').innerHTML")
        pg.clock.run_for(1500)
        check('reducir animaciones: no se mueve', ev("document.querySelector('#sh .figure-stage').innerHTML") == t0)
        two = ev("[...document.querySelectorAll('#sh .figure-stage.two svg')].map(s=>s.innerHTML.length + ':' + s.innerHTML.slice(2000, 2300))")
        check('reducir animaciones: las dos posturas son distintas', len(two) == 2 and two[0] != two[1])
        check('reducir animaciones: cada postura dice cuál es', ev("[...document.querySelectorAll('#sh .figure-stage svg')].map(s=>s.getAttribute('aria-label')).join() == 'Postura de inicio,Postura final'"))
        shot('quieta')
        # lo pintado de verdad (también en Safari y Firefox): los músculos que trabajan en rojo y naranja, el resto del
        # cuerpo en su gris azulado; y, de frente, los brazos abiertos del todo, con las mancuernas en los extremos
        settled()
        red, orange, slate, _, _ = painted(capture(pg.locator('#sh .figure-stage')))
        print('        pintado (rojo, naranja, gris azulado): sentadilla %.4f %.4f %.4f' % (red, orange, slate))
        check('sentadilla: se ven los músculos principales, los secundarios y el resto del cuerpo', red > .003 and orange > .0025 and slate > .02, '%.4f %.4f %.4f' % (red, orange, slate))
        how('Press banca')
        settled()
        red, orange, slate, _, _ = painted(capture(pg.locator('#sh .figure-stage figure').nth(1)))
        print('        pintado: press banca %.4f %.4f %.4f' % (red, orange, slate))
        check('press banca: se ven el pectoral, los secundarios y el cuerpo', red > .0005 and orange > .001 and slate > .02, '%.4f %.4f %.4f' % (red, orange, slate))
        # un gesto con su propio reloj: sus posturas más distintas, sin rótulo; una postura que se mantiene: una sola
        for n, k in [('Curl alterno mancuernas', 3), ('Clean & jerk', 2), ('Burpees', 3), ('Plancha', 1)]:
            how(n)
            got = ev("[document.querySelectorAll('#sh .figure-stage svg').length, document.querySelectorAll('#sh .figure-stage figcaption').length, new Set([...document.querySelectorAll('#sh .figure-stage svg')].map(s=>s.innerHTML.length)).size]")
            check('reducir animaciones, «%s»: %d postura(s) distinta(s), sin rótulo' % (n, k), got == [k, 0, k], str(got))
            fits = ev("(() => { const s = document.querySelector('#sh .sheet'); return s.scrollWidth <= s.clientWidth + 1; })()")
            check('reducir animaciones, «%s»: caben a lo ancho' % n, fits)
        shot('tres')
        ev("A.closeSheet()")
        ev("S.reduceMotion=0;saveState()")
        pg.clock.run_for(200)
        # y en pequeño: la miniatura de la sentadilla, con sus músculos en color
        ev("A.openLibrary()")
        pg.clock.run_for(300)
        pg.fill('#sh input', 'sentadilla')
        pg.clock.run_for(500)
        settle(IS_PICTURE + "(document.querySelector('#sh .item-split .exercise-thumb'))")
        settled()
        red, orange, slate, _, _ = painted(capture(pg.locator('#sh .item-split .exercise-thumb').first))
        print('        pintado: miniatura de la sentadilla %.4f %.4f %.4f' % (red, orange, slate))
        check('miniatura de la sentadilla: los músculos en color y el cuerpo, claro', red > .0005 and orange > .0015 and slate > .02, '%.4f %.4f %.4f' % (red, orange, slate))
        ev("A.closeSheet()")
        pg.clock.run_for(200)

        # entreno: la miniatura es la figura y abre la hoja
        ev("S.tab=0;S.selectedWeekday=0;S.selectedDay=0;R()")
        ev("A.startWorkout()")
        pg.clock.run_for(400)
        sel = "document.querySelector('.exercise .thumb[data-a=exerciseHowTo]')"
        check('entreno: la miniatura es el modelo haciendo el ejercicio', settle(IS_PICTURE + "(" + sel + ")"))
        check('entreno: todas las miniaturas son figuras', settle("[...document.querySelectorAll('.exercise .thumb[data-a=exerciseHowTo]')].every(" + IS_PICTURE + ")"))
        size = ev("(r=>[Math.round(r.width),Math.round(r.height)])(" + sel + ".querySelector('img').getBoundingClientRect())")
        check('entreno: la miniatura cabe en su recuadro', size == [64, 64], str(size))
        shot('entreno')
        ev(sel + ".click()")
        pg.clock.run_for(300)
        check('entreno: al tocarla se abre la hoja con la figura grande y el texto', settle(DRAWN) and ev("document.querySelector('#sh .howto-text').innerText.length > 80"))
        ev("document.querySelector('#sh [data-a=exerciseDetailByName]').click()")
        pg.clock.run_for(400)
        settle("!!document.querySelector('#sh .anatomy-full')")
        check('entreno: desde la hoja se abre la ficha, sin «+ Al día» ni variantes', ev("!!document.querySelector('#sh .anatomy-full') && !document.querySelector('#sh [data-a=libraryAddToDay]')"))
        check('el entreno sigue en marcha', ev('!!W'))
        ev("A.closeSheet()")
        pg.clock.run_for(200)

        check('nada choca con la política de seguridad', not ev("window.__csp || []"), str(ev("window.__csp || []")))
        errs = [e for e in errs if 'favicon' not in e]
        check('sin errores de JS', not errs, str(errs[:3]))
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
