"""Prueba de humo de una compilación: arranca, recorre las pestañas y los flujos principales y falla ante cualquier error de JS.

  python3 tests/smoke.py dist/stratafit.html         (también vale dist/app/index.html)
Requiere:  pip install playwright  &&  playwright install chromium
"""
import os, sys, json, datetime
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


SEED, EXTRA, INIT = rd('seed.js'), rd('extra.js'), rd('init.js')
fails, passes = [], []


def check(name, cond, info=''):
    (passes if cond else fails).append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def main(path):
    path = os.path.abspath(path)
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        c = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True, is_mobile=True, color_scheme='dark')
        c.add_init_script(INIT)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:200]) if m.type == 'error' else None)
        pg.on('dialog', lambda d: d.accept())
        pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
        pg.goto('file://' + path)
        pg.clock.run_for(800)
        ev = pg.evaluate
        check('arranca (window.__ffok)', ev('!!window.__ffok'))
        check('sin pantalla de error de arranque', ev("!document.getElementById('ffe')"))
        ev(SEED)
        ev(EXTRA)
        ev('location.reload()')
        pg.clock.run_for(800)

        # pestañas
        for i, nm in enumerate(['Workout', 'Nutrición', 'Dashboard', 'Perfil']):
            pg.click('nav button:nth-child(%d)' % (i + 1))
            pg.clock.run_for(200)
            n = ev("document.querySelector('#app').innerText.length")
            check('pestaña ' + nm, n > 40, str(n))

        # entreno: empezar, completar series, terminar
        ev('S.tab=0;R()')
        n0 = ev('S.logs.length')
        ev('A.go()')
        pg.clock.run_for(300)
        check('empieza el entreno (W)', ev('!!W'))
        for _ in range(3):
            if ev("!!document.querySelector('.ck:not(.on)')"):
                ev("document.querySelector('.ck:not(.on)').click()")
                pg.clock.run_for(200)
        check('se completan series', ev('W.x.flat().filter(s=>s.ok).length') >= 1)
        # añadir un ejercicio desde la librería con el entreno en marcha (antes rompía la sesión)
        nx = ev('W.x.length')
        ev('A.lib();libState.q="remo";document.querySelector("#lr").innerHTML=libBody()')
        pg.clock.run_for(200)
        ev("document.querySelector('#lr [data-a=lad]').click()")
        pg.clock.run_for(200)
        check('añadir ejercicio en pleno entreno añade sus series', ev('W.x.length') == nx + 1 and ev('W.x.length==S.plan[S.sel].ex.length'))
        ev('sheet()')
        pg.clock.run_for(200)
        check('la sesión se sigue pintando', ev("document.querySelectorAll('.xs').length") == nx + 1)
        ev('A.end()')
        pg.clock.run_for(200)
        check('diálogo de guardar', ev("!!document.querySelector('#dg .dgc')"))
        ev("document.querySelector('#dg [data-v=zend]').click()")
        pg.clock.run_for(400)
        check('entreno guardado en el registro', ev('S.logs.length') == n0 + 1, str(ev('S.logs.length')))
        check('W liberado', ev('W===null||W===undefined||!W'))

        # nutrición: añadir alimento
        ev('S.tab=1;R()')
        k = ev("dayKey(new Date(Date.now()+nutriDayOffset*864e5))")
        m0 = ev("((S.meals[%s]||{})[0]||[]).length" % json.dumps(k))
        ev('A.add(0)')
        pg.clock.run_for(300)
        ev('A.pk(0)')
        pg.clock.run_for(200)
        ev('A.fa()')
        pg.clock.run_for(300)
        check('alimento añadido', ev("((S.meals[%s]||{})[0]||[]).length" % json.dumps(k)) == m0 + 1)

        # hojas y pantallas auxiliares: no deben lanzar error
        for name, js in [('librería', 'A.lib()'), ('programas', 'A.pg()'), ('crear programa', 'A.cpn()'), ('calendario', 'A.cl2()'), ('registros', 'A.lg()'),
                         ('menú', 'A.menu()'), ('copia de seguridad', 'A.zbk()'), ('WOD', 'A.wod()'), ('cardio', 'A.cardio()'), ('medidas', 'A.f2ms()'),
                         ('logros', 'A.f2lg()'), ('exportar CSV', 'A.f2ex()'), ('peso corporal', 'A.zwv()'), ('mis workouts', 'A.cr()')]:
            try:
                ev(js)
                pg.clock.run_for(300)
                n = ev("document.querySelector('#sh').innerText.length+document.querySelector('#app').innerText.length")
                check('abre ' + name, n > 40, str(n))
            except Exception as e:
                check('abre ' + name, False, str(e)[:120])
            ev("A.cl&&A.cl();sheet()")

        # calendario de la tarjeta del Dashboard: cambiar de mes (antes daba error)
        ev('weightView=0;S.tab=2;R()')
        pg.clock.run_for(200)
        m1 = ev("document.querySelector('[data-a=cm]').parentElement.innerText")
        ev("document.querySelector('[data-a=cm][data-i=\"1\"]').click()")
        pg.clock.run_for(200)
        check('las flechas del calendario del Dashboard cambian de mes', ev("document.querySelector('[data-a=cm]').parentElement.innerText") != m1)
        ev("document.querySelector('[data-a=cm][data-i=\"-1\"]').click()")
        pg.clock.run_for(200)

        # persistencia
        ev('saveState()')
        before = ev("JSON.parse(localStorage.getItem('ff')).logs.length")
        ev('location.reload()')
        pg.clock.run_for(800)
        check('persistencia tras recargar', ev('S.logs.length') == before, '%s vs %s' % (ev('S.logs.length'), before))
        check('sin errores de JS durante la prueba', not errs, '; '.join(errs[:3]))
        b.close()
    print('\n%d correctas, %d fallos' % (len(passes), len(fails)))
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1])
