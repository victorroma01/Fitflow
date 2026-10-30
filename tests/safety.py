"""Prueba de la protección de datos y del diagnóstico: registro de errores, informe en Perfil, datos dañados al arrancar,
aviso cuando no se puede guardar, copias automáticas diarias y la pantalla de error de arranque.

  python3 tests/safety.py dist/stratafit.html
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


def check(name, cond, info=''):
    if not cond:
        fails.append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def main(path):
    url = app_url(path)
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
        c.add_init_script(INIT)
        pg = c.new_page()
        pg.on('dialog', lambda d: d.accept())
        pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
        pg.goto(url)
        pg.clock.run_for(800)
        ev = pg.evaluate
        ev(SEED)
        ev(EXTRA)
        with pg.expect_navigation():
            ev('location.reload()')
        pg.wait_for_load_state('load')
        pg.clock.run_for(800)
        check('arranca con datos', ev('!!window.__ffok&&S.logs.length>10'))

        # registro de errores
        ev("clearErrorLog();logError('prueba',new Error('fallo de prueba'))")
        e = ev('errorLog()')
        check('logError guarda lugar, mensaje y versión', len(e) == 1 and e[0]['w'] == 'prueba' and 'fallo de prueba' in e[0]['m'] and e[0]['v'] == ev('APPV'), str(e))
        ev("const s=document.createElement('script');s.textContent=\"throw new Error('boom global')\";document.body.appendChild(s);s.remove()")
        check('captura errores no controlados', any('boom global' in x['m'] for x in ev('errorLog()')))
        ev("(()=>{Promise.reject(new Error('promesa rota'));return 1})()")
        pg.clock.run_for(50)
        pg.wait_for_timeout(50)
        check('captura promesas rechazadas', any('promesa rota' in x['m'] for x in ev('errorLog()')))
        ev("for(let i=0;i<40;i++)logError('lote',new Error('e'+i))")
        check('guarda como mucho 30 errores', len(ev('errorLog()')) == 30)

        # Perfil → Diagnóstico
        ev('S.tab=3;R();document.querySelectorAll("details").forEach(d=>d.open=true)')
        check('Perfil muestra el botón de diagnóstico con el número de errores', ev("/Diagnóstico · 30 errores registrados/.test(document.body.innerText)"))
        ev('A.diag()')
        pg.clock.run_for(200)
        t = ev("document.querySelector('#diagt').value")
        check('el informe incluye versión, navegador y errores', ('StrataFit ' + ev('APPV')) in t and 'Navegador:' in t and 'e39' in t, t[:200])
        ev("document.querySelector('[data-a=diagClear]').click()")
        pg.clock.run_for(200)
        check('«Borrar errores» vacía el registro', ev('errorLog().length') == 0)
        ev('sheet()')

        # no se puede guardar (almacenamiento lleno)
        ev("window.__set=Store.set;Store.set=(k,v)=>{if(k==Store.K.app||k.startsWith(Store.K.app+':')){const e=new Error('lleno');e.name='QuotaExceededError';throw e}return window.__set(k,v)};0")
        ev('S.rest+=5;saveState()')
        pg.clock.run_for(100)
        check('si no puede guardar, avisa', ev("/No se ha podido guardar/.test(document.body.innerText)"))
        check('y lo registra', any(x['w'] == 'guardar ff' and 'QuotaExceededError' in x['m'] for x in ev('errorLog()')))
        ev('saveState()')
        pg.clock.run_for(3000)
        ev('saveState()')
        pg.clock.run_for(100)
        check('no repite el aviso en menos de un minuto', not ev("/No se ha podido guardar/.test(document.body.innerText)"))
        ev('Store.set=window.__set;saveState()')

        # copias automáticas
        pg.clock.run_for(5000)
        pg.wait_for_timeout(300)
        l = ev('snapList()')
        check('hace la copia automática del día', len(l) == 1 and l[0]['d'] == ev('dayKey(new Date())') and l[0]['n'] == ev('S.logs.length'), str([(x['d'], x['n']) for x in l]))
        ev("snapTx('readwrite',st=>{let q;for(let i=1;i<=9;i++)q=st.put({d:'2026-09-0'+i,t:Date.parse('2026-09-0'+i),v:'1.0',n:i,data:buildBackup()});return q}).then(()=>snapTx('readwrite',st=>st.delete(dayKey(new Date()))))")
        pg.wait_for_timeout(300)
        ev('takeSnapshot()')
        pg.wait_for_timeout(300)
        l = ev('snapList()')
        check('guarda solo las 7 últimas', len(l) == 7 and l[0]['d'] == ev('dayKey(new Date())') and l[-1]['d'] == '2026-09-04', str([x['d'] for x in l]))
        ev('A.zbk()')
        pg.wait_for_timeout(300)
        n = ev("document.querySelectorAll('#snapl [data-a=snapr]').length")
        check('la hoja de copia lista las copias automáticas', n == 7, str(n))
        ev("document.querySelector('#snapl [data-a=snapr]').click()")
        pg.wait_for_timeout(300)
        check('«Restaurar» pide confirmación con el resumen de la copia', ev("!!document.querySelector('#dg .dgc')&&/Restaurar/.test(document.querySelector('#dg').innerText)"))
        ev("document.querySelector('#dg').innerHTML='';sheet()")

        # datos dañados al arrancar (el núcleo 'ff'; los entrenos y comidas, guardados aparte, se conservan)
        nlogs = ev('S.logs.length')
        ev("Store.set(Store.K.app,'{esto no es json')")
        pg.reload()
        pg.wait_for_load_state('load')
        pg.clock.run_for(1500)
        check('con datos dañados la app arranca igualmente', ev('!!window.__ffok'))
        check('y conserva los entrenos guardados aparte', ev('S.logs.length') == nlogs, '%s vs %s' % (ev('S.logs.length'), nlogs))
        bad = ev("JSON.parse(localStorage.getItem('ffbad')||'null')")
        check('aparta los datos dañados antes de empezar de cero', bool(bad) and bad['raw'] == '{esto no es json', str(bad)[:80])
        check('avisa al usuario', ev("/No se pudieron leer tus datos/.test(document.body.innerText)"))
        ev("document.querySelector('#dg').innerHTML='';A.diag()")
        pg.clock.run_for(200)
        check('Diagnóstico ofrece descargar los datos apartados', ev("!!document.querySelector('[data-a=diagBad]')"))
        ev('sheet()')

        # pantalla de error de arranque: «Restablecer» aparta los datos antes de borrarlos
        ev("localStorage.removeItem('ffbad');localStorage.setItem('ff',JSON.stringify({logs:[{d:'2026-01-01',n:'x',v:1,s:1,m:1}]}));window.__ffe('fallo simulado')")
        check('la pantalla de error de arranque aparece', ev("!!document.getElementById('ffe')"))
        check('y registra el fallo', any(x['w'] == 'arranque' for x in ev('errorLog()')))
        with pg.expect_navigation():
            pg.click('#ffe3')
        pg.wait_for_load_state('load')
        pg.clock.run_for(800)
        bad = ev("JSON.parse(localStorage.getItem('ffbad')||'null')")
        check('«Restablecer» guarda una copia de los datos antes de borrarlos', bool(bad) and '2026-01-01' in bad['raw'])
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
