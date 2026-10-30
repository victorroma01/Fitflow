"""Prueba de inyección de HTML: rellena nombres y notas del usuario con código HTML malicioso y recorre las 33 pantallas
de tests/shots.py. Falla si alguna pantalla llega a ejecutar ese código (un nombre mal escapado).

  python3 tests/security.py dist/stratafit.html
"""
import os, sys, datetime
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shots import SCR  # noqa: E402
from browser import launch, app_url, context_opts  # noqa: E402


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


PAY = '"\'><img src=x onerror="window.__x=(window.__x||[]).concat(window.__scr)"><b>'
MUT = """(P=>{const deep=o=>{if(o&&typeof o=='object')for(const k in o){const v=o[k];if(typeof v=='string'&&['n','nt','x','name','nm'].includes(k))o[k]=v+P;else deep(v)}};
 deep(S.cx);deep(S.cr);deep(S.cp);deep(S.logs);deep(S.plan);
 Object.keys(S.notes||{}).forEach(k=>{S.notes[k]+=P});
 S.pf=S.pf||{};S.pf.n=(S.pf.n||'Yo')+P;
 S.cf=(S.cf||[]).concat([{n:'Galleta'+P,b:[400,60,6,15,2,.5]}]);
 saveState()})(%s)""" % repr(PAY)


def main(path):
    path = os.path.abspath(path)
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, **context_opts(path))
        c.add_init_script(rd('init.js'))
        pg = c.new_page()
        pg.on('dialog', lambda d: d.accept())
        pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
        pg.goto(app_url(path))
        pg.clock.run_for(800)
        pg.evaluate(rd('seed.js'))
        pg.evaluate(rd('extra.js'))
        pg.evaluate(MUT)
        with pg.expect_navigation():
            pg.evaluate('location.reload()')
        pg.wait_for_load_state('load')
        pg.clock.run_for(800)
        bad = []
        for k, js in SCR.items():
            try:
                pg.evaluate("window.__scr=%r;sheet();if(W){W=null}" % k)
                pg.evaluate(js)
                pg.clock.run_for(300)
                pg.wait_for_timeout(100)
            except Exception as e:
                bad.append(k + ': ' + str(e)[:80])
        hit = sorted(set(str(x) for x in pg.evaluate('window.__x||[]')))
        b.close()
    print('  pantallas recorridas:', len(SCR))
    print('  ' + ('ok    ' if not hit else 'FALLA ') + 'ninguna ejecuta HTML inyectado', hit or '')
    if bad:
        print('  FALLA errores al abrir pantallas:', bad[:5])
    ok = not hit and not bad
    print('\n' + ('TODO CORRECTO' if ok else 'FALLAN'))
    sys.exit(0 if ok else 1)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
