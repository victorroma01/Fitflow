"""Prueba de las fotos de ejercicio: enlaces, búsqueda, ficha de la librería y ficha rápida del entreno.

  python3 tests/photos.py dist/stratafit.html [carpeta_capturas]
"""
import os, sys, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


INIT = rd('init.js')
fails = []


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
        check('arranca', ev('!!window.__ffok'))

        # datos: cada ejercicio enlazado existe y su foto está definida
        miss = ev("Object.keys(EX_PHOTO_KEY).filter(n=>!exAll().some(e=>e.n==n))")
        check('todos los ejercicios con foto existen en la biblioteca', not miss, str(miss))
        miss = ev("Object.values(EX_PHOTO_KEY).filter(k=>!EX_PHOTOS[k])")
        check('cada enlace apunta a una foto', not miss, str(miss))
        check('hay 28 fotos', ev('Object.keys(EX_PHOTOS).length') == 28, str(ev('Object.keys(EX_PHOTOS).length')))
        bad = ev("""Promise.all(Object.keys(EX_PHOTOS).map(k=>new Promise(r=>{const i=new Image();i.onload=()=>r(i.naturalWidth>100?null:k);i.onerror=()=>r(k);i.src=EX_PHOTOS[k]}))).then(a=>a.filter(Boolean))""")
        check('todas las fotos se decodifican', not bad, str(bad))
        check('Curl con mancuernas existe (nuevo)', ev("exAll().some(e=>e.n=='Curl con mancuernas'&&groupOf(e)=='Bíceps'&&e.q=='Mancuernas'&&e.p&&e.p[0]=='bi')"))
        check('sin ejercicios repetidos', ev("(()=>{const n=exAll().map(e=>e.n);return n.length==new Set(n).size})()"))

        # búsqueda: nombres de las láminas y sin tildes
        for q, want in [('zancada búlgara', 'Sentadilla búlgara'), ('zancada bulgara', 'Sentadilla búlgara'), ('copa de tríceps', 'Extensión sobre la cabeza'),
                        ('copa de triceps', 'Extensión sobre la cabeza'), ('tras nuca', 'Extensión sobre la cabeza con cuerda'), ('encojimientos', 'Encogimientos con mancuernas'),
                        ('pullover en polea alta', 'Pullover en polea'), ('curl inclinado con mancuernas', 'Curl en banco inclinado'), ('remo con mancuerna', 'Remo mancuerna'),
                        ('press banca con mancuernas', 'Press banca mancuernas'), ('jalon', 'Jalón al pecho'), ('gemelo', 'Gemelo sentado')]:
            ok = ev("(q=>exAll().some(e=>e.n==%s&&exSearchText(e).includes(q)))(%s)" % (repr(want).replace("'", '"'), repr(q).replace("'", '"')))
            check('buscar «%s» encuentra «%s»' % (q, want), ok)

        # librería: insignia en la lista y foto en la ficha
        ev("A.openLibrary()")
        pg.clock.run_for(300)
        ev("document.querySelector('[data-u=librarySearch]').value='remo mancuerna';U.librarySearch('remo mancuerna')")
        pg.clock.run_for(200)
        check('la fila con foto lleva insignia', ev("!!document.querySelector('#lr .exth .phi')"))
        if shots:
            pg.screenshot(path=os.path.join(shots, 'lista.png'))
        i = ev("exAll().findIndex(e=>e.n=='Remo mancuerna')")
        ev("A.exerciseDetail(%d)" % i)
        pg.clock.run_for(300)
        ok = ev("(()=>{const f=document.querySelector('#sh .exph img.f');return !!f&&f.complete&&f.naturalWidth>100})()")
        check('la ficha de Remo mancuerna muestra la foto', ok)
        check('la ficha sigue teniendo la anatomía y los músculos', ev("!!document.querySelector('#sh .anb')&&/músculos principales/i.test(document.querySelector('#sh').innerText)"), repr(ev("[!!document.querySelector('#sh .anb'), document.querySelector('#sh').innerText.slice(0, 300)]")))
        if shots:
            pg.screenshot(path=os.path.join(shots, 'ficha.png'))
        i = ev("exAll().findIndex(e=>e.n=='Press banca')")
        ev("A.exerciseDetail(%d)" % i)
        pg.clock.run_for(300)
        check('un ejercicio sin foto no lleva cabecera de foto', ev("!document.querySelector('#sh .exph')"))
        ev("A.closeSheet()")

        # entreno: toda miniatura se toca y abre cómo se hace el ejercicio (F-14), con la foto si la hay y la ficha
        d = ev("S.plan.findIndex(d=>d.ex.some(e=>EX_PHOTO_KEY[e.n]))")
        check('el programa por defecto contiene ejercicios con foto', d >= 0, str(d))
        ev("S.tab=0;S.selectedWeekday=%d;S.selectedDay=%d;R()" % (max(d, 0), max(d, 0)))
        ev("A.startWorkout()")
        pg.clock.run_for(400)
        check('empieza el entreno', ev('!!W'))
        check('todas las miniaturas del entreno se pueden tocar', ev("[...document.querySelectorAll('.xs .th')].every(t=>t.dataset.a=='exerciseHowTo')"))
        sel = "document.querySelector('.xs .th[data-a=exerciseHowTo][data-n=\"'+S.plan[S.selectedDay].ex.find(e=>EX_PHOTO_KEY[e.n]).n+'\"]')"
        if shots:
            ev(sel + ".scrollIntoView({block:'center'})")
            pg.clock.run_for(300)
            pg.screenshot(path=os.path.join(shots, 'entreno.png'))
        ev(sel + ".click()")
        pg.clock.run_for(300)
        for _ in range(20):
            if ev("!!document.querySelector('#sh .hwp')"):
                break
            pg.wait_for_timeout(100)
        check('al tocar se abre cómo se hace, con la foto', ev("!!document.querySelector('#sh .exph img.f') && document.querySelector('#sh .hwp').innerText.length > 80"))
        if shots:
            pg.screenshot(path=os.path.join(shots, 'entreno_como.png'))
        ev("document.querySelector('#sh [data-a=exerciseDetailByName]').click()")
        pg.clock.run_for(300)
        check('desde ahí se abre la ficha, sin «+ Al día» ni variantes', ev("!!document.querySelector('#sh .exph img.f') && !document.querySelector('#sh [data-a=libraryAddToDay]')"))
        check('el entreno sigue en marcha', ev('!!W'))
        if shots:
            pg.screenshot(path=os.path.join(shots, 'entreno_ficha.png'))
        ev("A.closeSheet()")
        pg.clock.run_for(200)
        check('se cierra la ficha', ev("!document.querySelector('#sh .exph')"))

        errs = [e for e in errs if 'favicon' not in e]
        check('sin errores de JS', not errs, str(errs[:3]))
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
