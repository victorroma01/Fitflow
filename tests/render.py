"""Prueba del pintado con cambios mínimos (core/morph): cada pantalla queda igual que pintándola de cero, y al volver a
pintar se conservan el foco, lo escrito, el desplazamiento y los propios elementos.

  python3 tests/render.py dist/stratafit.html
"""
import os, sys, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


SEED, EXTRA, INIT = rd('seed.js'), rd('extra.js'), rd('init.js')
fails = []

# valores de los campos de #app (no están en el HTML)
VALS = "[...document.querySelectorAll('#app input,#app select,#app textarea')].map(x=>x.type=='checkbox'||x.type=='radio'?x.checked:x.value).join('|')"
# pinta de cero (sin nada debajo) y guarda el resultado como referencia
FRESH = "(()=>{document.querySelector('#app').innerHTML='';%s;R();window.__ref={h:document.querySelector('#app').innerHTML,v:" + VALS + "}})()"
# ¿#app es igual que la referencia?
SAME = "document.querySelector('#app').innerHTML===window.__ref.h&&" + VALS + "===window.__ref.v"


def check(name, cond, info=''):
    if not cond:
        fails.append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def main(path):
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
        c.add_init_script(INIT)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
        pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
        pg.goto(app_url(path))
        pg.clock.run_for(800)
        ev = pg.evaluate
        ev(SEED)
        ev(EXTRA)
        with pg.expect_navigation():
            ev('location.reload()')
        pg.wait_for_load_state('load')
        pg.clock.run_for(800)

        # reloj parado: el entreno en curso enseña el tiempo transcurrido y no debe cambiar entre una pintada y otra
        pg.clock.pause_at(datetime.datetime(2026, 10, 29, 13, 0, 0))
        # cada pantalla, pintada encima de otra, queda igual que pintada de cero
        screens = [('Workout', 'weightView=0;S.tab=0'), ('Nutrición', 'weightView=0;S.tab=1'), ('Dashboard', 'weightView=0;S.tab=2'),
                   ('Perfil', 'weightView=0;S.tab=3'), ('peso corporal', 'S.tab=2;weightView=1')]
        for i, (name, js) in enumerate(screens):
            ev(FRESH % js)
            for other_name, other in screens:
                if other == js:
                    continue
                ev(other + ';R()')
                ev(js + ';R()')
                if not ev(SAME):
                    check('igual que de cero: %s (pintada sobre %s)' % (name, other_name), False)
                    break
            else:
                check('igual que de cero: %s (pintada sobre las demás)' % name, True)
        # entreno en curso, pintado sobre Workout
        ev("weightView=0;S.tab=0;R();A.go()")
        pg.clock.run_for(300)
        ev(FRESH % '0')
        ev("S.tab=0;W&&(window.__w=W);W=null;R();W=window.__w;R()")
        check('igual que de cero: entreno en curso', ev(SAME))

        # foco y texto escrito: un campo del entreno sigue enfocado y con su valor tras volver a pintar
        ev("(()=>{const i=document.querySelector('#app input[inputmode]')||document.querySelector('#app input');i.focus();window.__el=i})()")
        ev("window.__el.value='12';window.__el.dispatchEvent(new Event('input',{bubbles:true}));R()")
        check('conserva el foco al volver a pintar', ev('document.activeElement===window.__el&&window.__el.isConnected'))
        check('y el elemento es el mismo (no se recrea)', ev("document.querySelector('#app').contains(window.__el)"))
        # desplazamiento: la página sigue donde estaba al volver a pintar (Dashboard, que es larga)
        ev("W=null;weightView=0;S.tab=2;R();window.scrollTo(0,300)")
        ev('R()')
        check('conserva el desplazamiento de la página', ev('Math.round(window.scrollY)') == 300, str(ev('window.scrollY')))
        # imágenes: las que no cambian no se vuelven a crear
        ev("S.tab=0;W=null;R()")
        pg.clock.run_for(200)
        n = ev("(()=>{const im=[...document.querySelectorAll('#app img')];window.__im=im;return im.length})()")
        ev('R()')
        check('las imágenes que no cambian no se recrean', n == 0 or ev("window.__im.every(i=>i.isConnected)"), str(n))
        check('sin errores de JS', not errs, '; '.join(errs[:3]))
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
