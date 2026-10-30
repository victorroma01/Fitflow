"""Prueba de las fotos de ejercicio: enlaces, búsqueda, ficha de la librería y ficha rápida del entreno.

  python3 tests/photos.py dist/stratafit.html [carpeta_capturas]
"""
import os, sys, datetime
from playwright.sync_api import sync_playwright

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
        b = p.chromium.launch()
        c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True, color_scheme='dark')
        c.add_init_script(INIT)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:200]) if m.type == 'error' else None)
        pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
        pg.goto('file://' + path)
        pg.clock.run_for(800)
        ev = pg.evaluate
        check('arranca', ev('!!window.__ffok'))

        # datos: cada ejercicio enlazado existe y su foto está definida
        miss = ev("Object.keys(EXPK).filter(n=>!exAll().some(e=>e.n==n))")
        check('todos los ejercicios con foto existen en la biblioteca', not miss, str(miss))
        miss = ev("Object.values(EXPK).filter(k=>!EXPH[k])")
        check('cada enlace apunta a una foto', not miss, str(miss))
        check('hay 28 fotos', ev('Object.keys(EXPH).length') == 28, str(ev('Object.keys(EXPH).length')))
        bad = ev("""Promise.all(Object.keys(EXPH).map(k=>new Promise(r=>{const i=new Image();i.onload=()=>r(i.naturalWidth>100?null:k);i.onerror=()=>r(k);i.src='data:image/webp;base64,'+EXPH[k]}))).then(a=>a.filter(Boolean))""")
        check('todas las fotos se decodifican', not bad, str(bad))
        check('Curl con mancuernas existe (nuevo)', ev("exAll().some(e=>e.n=='Curl con mancuernas'&&gk(e)=='Bíceps'&&e.q=='Mancuernas'&&e.p&&e.p[0]=='bi')"))
        check('sin ejercicios repetidos', ev("(()=>{const n=exAll().map(e=>e.n);return n.length==new Set(n).size})()"))

        # búsqueda: nombres de las láminas y sin tildes
        for q, want in [('zancada búlgara', 'Sentadilla búlgara'), ('zancada bulgara', 'Sentadilla búlgara'), ('copa de tríceps', 'Extensión sobre la cabeza'),
                        ('copa de triceps', 'Extensión sobre la cabeza'), ('tras nuca', 'Extensión sobre la cabeza con cuerda'), ('encojimientos', 'Encogimientos con mancuernas'),
                        ('pullover en polea alta', 'Pullover en polea'), ('curl inclinado con mancuernas', 'Curl en banco inclinado'), ('remo con mancuerna', 'Remo mancuerna'),
                        ('press banca con mancuernas', 'Press banca mancuernas'), ('jalon', 'Jalón al pecho'), ('gemelo', 'Gemelo sentado')]:
            ok = ev("(q=>exAll().some(e=>e.n==%s&&exHay(e).includes(q)))(%s)" % (repr(want).replace("'", '"'), repr(q).replace("'", '"')))
            check('buscar «%s» encuentra «%s»' % (q, want), ok)

        # librería: insignia en la lista y foto en la ficha
        ev("A.lib()")
        pg.clock.run_for(300)
        ev("document.querySelector('[data-u=ls]').value='remo mancuerna';U.ls('remo mancuerna')")
        pg.clock.run_for(200)
        check('la fila con foto lleva insignia', ev("!!document.querySelector('#lr .exth .phi')"))
        if shots:
            pg.screenshot(path=os.path.join(shots, 'lista.png'))
        i = ev("exAll().findIndex(e=>e.n=='Remo mancuerna')")
        ev("A.exd(%d)" % i)
        pg.clock.run_for(300)
        ok = ev("(()=>{const f=document.querySelector('#sh .exph img.f');return !!f&&f.complete&&f.naturalWidth>100})()")
        check('la ficha de Remo mancuerna muestra la foto', ok)
        check('la ficha sigue teniendo la anatomía y los músculos', ev("!!document.querySelector('#sh .anb')&&/músculos principales/i.test(document.querySelector('#sh').innerText)"))
        if shots:
            pg.screenshot(path=os.path.join(shots, 'ficha.png'))
        i = ev("exAll().findIndex(e=>e.n=='Press banca')")
        ev("A.exd(%d)" % i)
        pg.clock.run_for(300)
        check('un ejercicio sin foto no lleva cabecera de foto', ev("!document.querySelector('#sh .exph')"))
        ev("A.cl()")

        # entreno: miniatura tocable con insignia y ficha rápida
        d = ev("S.plan.findIndex(d=>d.ex.some(e=>EXPK[e.n]))")
        check('el programa por defecto contiene ejercicios con foto', d >= 0, str(d))
        ev("S.tab=0;S.sel=%d;R()" % max(d, 0))
        ev("A.go()")
        pg.clock.run_for(400)
        check('empieza el entreno', ev('!!W'))
        n = ev("document.querySelectorAll('.xs .th[data-a=exv]').length")
        check('hay miniaturas tocables en el entreno', n > 0, str(n))
        check('las miniaturas sin foto no son tocables', ev("[...document.querySelectorAll('.xs')].every(x=>{const e=S.plan[S.sel].ex[+x.id.slice(2)];const t=x.querySelector('.th');return !t||(!!t.dataset.a)==!!EXPK[e.n]})"))
        if shots:
            ev("document.querySelector('.xs .th[data-a=exv]').scrollIntoView({block:'center'})")
            pg.clock.run_for(300)
            pg.screenshot(path=os.path.join(shots, 'entreno.png'))
        ev("document.querySelector('.xs .th[data-a=exv]').click()")
        pg.clock.run_for(300)
        check('al tocar se abre la ficha con foto', ev("!!document.querySelector('#sh .exph img.f')"))
        check('en el entreno la ficha no ofrece «+ Al día» ni variantes', ev("!document.querySelector('#sh [data-a=lad]')"))
        check('el entreno sigue en marcha', ev('!!W'))
        if shots:
            pg.screenshot(path=os.path.join(shots, 'entreno_ficha.png'))
        ev("A.cl()")
        pg.clock.run_for(200)
        check('se cierra la ficha', ev("!document.querySelector('#sh .exph')"))

        errs = [e for e in errs if 'favicon' not in e]
        check('sin errores de JS', not errs, str(errs[:3]))
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
