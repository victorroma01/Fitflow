"""Prueba del guardado por partes (core/persist): formato, paso desde la 1.20, escribir solo lo que cambia, agrupar
guardados, partes dañadas o que faltan, falta de espacio, restaurar y deshacer, borrar todo y la pantalla de error.

  python3 tests/storage.py dist/stratafit.html
Requiere:  pip install playwright  &&  playwright install chromium
"""
import os, sys, json, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


SEED, EXTRA, INIT = rd('seed.js'), rd('extra.js'), rd('init.js')
fails = []

# Utilidades dentro de la página, independientes del código de la app: estado completo leído del almacenamiento
# (núcleo + partes), forma canónica (claves ordenadas) para comparar, y espía de escrituras.
HELPERS = """window.__T={
 keys:p=>{const o=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(p))o.push(k)}return o.sort()},
 stored:()=>{const g=k=>localStorage.getItem(k);const c=JSON.parse(g('ff')||'null');if(!c||!c._parts)return c;delete c._parts;const m={};
   __T.keys('ff:').forEach(k=>{const v=JSON.parse(g(k));if(k.startsWith('ff:meals:'))Object.assign(m,v);else if(c[k.slice(3)]===k)c[k.slice(3)]=v});
   if(c.meals==='ff:meals')c.meals=m;return c},
 can:v=>Array.isArray(v)?'['+v.map(__T.can).join(',')+']':v&&typeof v=='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+__T.can(v[k])).join(',')+'}':JSON.stringify(v),
 spy:()=>{window.__w=[];if(!window.__set0)window.__set0=Store.set;Store.set=(k,v)=>{__w.push(k);return __set0(k,v)};Store.del0=Store.del0||Store.del;Store.del=k=>{__w.push('-'+k);return Store.del0(k)}},
 unspy:()=>{if(window.__set0)Store.set=__set0;if(Store.del0)Store.del=Store.del0}
};0"""


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
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
        pg.on('dialog', lambda d: d.accept())
        pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
        ev = pg.evaluate

        def reload(ms=1500):
            with pg.expect_navigation():
                ev('location.reload()')
            pg.wait_for_load_state('load')
            pg.clock.run_for(ms)
            ev(HELPERS)

        pg.goto(url)
        pg.clock.run_for(800)
        ev(SEED)
        ev(EXTRA)
        # comidas repartidas en varios meses (y un día de otro año) para probar las claves por mes
        ev("""(()=>{const it=n=>({0:[{n,g:100,b:[100,10,10,1,0,0]}]});
              Object.assign(S.meals,{'2026-08-14':it('Avena'),'2026-09-02':it('Arroz'),'2026-09-30':it('Pollo'),'2025-12-31':it('Turrón'),[dayKey(new Date())]:it('Yogur')});saveState()})()""")
        reload()

        # ── formato ──
        core = ev("JSON.parse(localStorage.getItem('ff'))")
        check('el núcleo lleva la marca de guardado por partes', core.get('_parts') == 1)
        check('las colecciones grandes van aparte', core.get('logs') == 'ff:logs' and core.get('hist') == 'ff:hist' and core.get('meals') == 'ff:meals', str({k: core.get(k) for k in ('logs', 'hist', 'meals')}))
        months = ev("[...new Set(Object.keys(S.meals).map(d=>d.slice(0,7)))].sort().map(m=>'ff:meals:'+m)")
        check('una clave de comidas por mes', ev("__T.keys('ff:meals:')") == months, str(ev("__T.keys('ff:')")))
        check('lo guardado es exactamente el estado', ev('__T.can(__T.stored())===__T.can(S)'))
        k1 = ev('Object.keys(S)')
        n1 = ev('S.logs.length')
        reload()
        check('al recargar, el estado es el mismo (y en el mismo orden de claves)', ev('Object.keys(S)') == k1 and ev('S.logs.length') == n1 and ev('__T.can(__T.stored())===__T.can(S)'))

        # ── escribir solo lo que cambia y agrupar los guardados de una acción ──
        ev("__T.spy();S.wt[dayKey(new Date())]=750;saveState();saveState();saveState()")
        check('un cambio de ajustes escribe solo el núcleo, una vez', ev('__w') == ['ff'], str(ev('__w')))
        ev("__w.length=0;S.meals['2026-09-02'][1]=[{n:'Kiwi',g:80,b:[61,15,1,.5,3,0]}];saveState()")
        check('una comida escribe solo su mes', ev('__w') == ['ff:meals:2026-09'], str(ev('__w')))
        ev("__w.length=0;S.logs.push({d:dayKey(new Date()),n:'Extra',v:100,s:3,m:20,q:7});saveState()")
        check('un entreno escribe solo los entrenos', ev('__w') == ['ff:logs'], str(ev('__w')))
        ev("__w.length=0;saveState()")
        check('sin cambios no escribe nada', ev('__w') == [], str(ev('__w')))
        ev("__w.length=0;delete S.meals['2026-08-14'];saveState()")
        check('un mes que se queda sin comidas se borra', ev('__w') == ['-ff:meals:2026-08'] and 'ff:meals:2026-08' not in ev("__T.keys('ff:')"), str(ev('__w')))
        ev("__w.length=0;Store.remote={changed:(k,v)=>__w.push('remoto '+k)};S.meals['2026-09-30'][0][0].g=120;saveState()")
        check('el adaptador remoto recibe la parte cambiada', 'remoto ff:meals:2026-09' in ev('__w'), str(ev('__w')))
        ev("Store.remote=null;__T.unspy()")

        # ── datos de la 1.20: todo el estado en 'ff' ──
        legacy = ev("(()=>{const s=JSON.parse(JSON.stringify(S));s.meals['2024-02-29']={0:[{n:'Antiguo',g:50,b:[100,10,10,1,0,0]}]};return JSON.stringify(s)})()")
        ev("(s=>{localStorage.clear();localStorage.setItem('ff',s)})(%s)" % json.dumps(legacy))
        with pg.expect_navigation():
            ev('location.reload()')
        pg.wait_for_load_state('load')
        pg.clock.run_for(300)
        ev(HELPERS)
        check('lee los datos de la 1.20', ev('savedFormat') == 'whole' and ev('__T.can(S)') == ev('__T.can(%s)' % legacy))
        pg.clock.run_for(1200)
        check('y los pasa a partes al arrancar', ev('savedFormat') == 'parts' and ev("JSON.parse(localStorage.getItem('ff'))._parts") == 1 and ev("__T.keys('ff:meals:')")[0] == 'ff:meals:2024-02')
        check('sin perder nada', ev('__T.can(__T.stored())') == ev('__T.can(%s)' % legacy))
        reload()
        check('y al volver a abrir sigue todo', ev('__T.can(S)') == ev('__T.can(%s)' % legacy) and not ev('stateRecovered'))

        # ── sin espacio para pasar a partes: sigue guardando entero, como la 1.20 ──
        ev("(s=>{localStorage.clear();localStorage.setItem('ff',s)})(%s)" % json.dumps(legacy))
        with pg.expect_navigation():
            ev('location.reload()')
        pg.wait_for_load_state('load')
        pg.clock.run_for(300)
        ev(HELPERS)
        ev("window.__set1=Store.set;Store.set=(k,v)=>{if(k.startsWith('ff:')&&k>'ff:l'){const e=new Error('lleno');e.name='QuotaExceededError';throw e}return __set1(k,v)};0")
        pg.clock.run_for(1200)
        check('si no cabe, sigue guardado entero', ev('savedFormat') == 'whole' and ev('partsFailed') == 1 and ev("__T.keys('ff:')") == [], str(ev("__T.keys('ff:')")))
        ev("S.rest=77;saveState()")
        pg.clock.run_for(100)
        check('y guarda los cambios sin avisar de error', ev("JSON.parse(localStorage.getItem('ff')).rest") == 77 and not ev("/No se ha podido guardar/.test(document.body.innerText)"))
        check('lo registra para el diagnóstico', any(x['w'].startswith('pasar a guardado por partes') for x in ev('errorLog()')))
        ev('A.diag()')
        pg.clock.run_for(200)
        check('el diagnóstico indica el formato', 'Guardado: entero (sin espacio para dividirlo)' in ev("document.querySelector('#diagt').value"))
        ev("Store.set=__set1;sheet()")
        reload()
        check('al volver a abrir lo reintenta', ev('savedFormat') == 'parts' and ev('S.rest') == 77 and ev("JSON.parse(localStorage.getItem('ff')).rest") == 77)

        # ── partes dañadas o que faltan ──
        nlogs = ev('S.logs.length')
        ev("localStorage.setItem('ff:hist','{roto');localStorage.removeItem('ffbad')")
        reload()
        check('con una parte dañada arranca', ev('!!window.__ffok&&stateRecovered==2'))
        check('vacía solo esa parte', ev('Object.keys(S.hist).length') == 0 and ev('S.logs.length') == nlogs)
        bad = ev("JSON.parse(localStorage.getItem('ffbad')||'null')")
        check('y la aparta para poder recuperarla', bool(bad) and bad.get('raw') == '{roto' and bad.get('k') == 'ff:hist', str(bad)[:120])
        check('avisa de que falta una parte', ev("/No se pudo leer una parte de tus datos/.test(document.body.innerText)"))
        ev("document.querySelector('#dg').innerHTML='';S.rest=78;saveState()")
        check('el siguiente guardado la repara', ev("JSON.parse(localStorage.getItem('ff:hist'))") == {})
        ev("localStorage.removeItem('ff:logs')")
        reload()
        check('si falta una parte también avisa', ev('stateRecovered') == 2 and ev('S.logs.length') == 0 and ev("/No se pudo leer una parte/.test(document.body.innerText)"))
        ev("document.querySelector('#dg').innerHTML=''")

        # ── restaurar una copia con un guardado pendiente en la misma acción ──
        ev("for(let i=0;i<5;i++)S.logs.push({d:'2026-10-0'+(i+1),n:'Día '+i,v:1000,s:10,m:40,q:7});S.hist={'Press banca':[{d:'2026-10-01',s:[[5,80,8,0]]}]};saveState()")
        before = ev('__T.can(S)')
        ev("(()=>{const s=JSON.parse(JSON.stringify(S));s.logs=s.logs.slice(0,2);s.meals={'2025-01-01':{0:[{n:'Copia',g:1,b:[1,1,1,1,0,0]}]}};s.rest=31;window.__bk=s})()")
        with pg.expect_navigation():
            ev("S.rest=999;saveState();pendingRestore={s:__bk};restoreBackup()")
        pg.wait_for_load_state('load')
        pg.clock.run_for(1500)
        ev(HELPERS)
        check('restaurar no lo pisa un guardado pendiente', ev('S.rest') == 31 and ev('S.logs.length') == 2, str((ev('S.rest'), ev('S.logs.length'))))
        check('y deja solo los meses de la copia', ev("__T.keys('ff:meals:')") == ['ff:meals:2025-01'], str(ev("__T.keys('ff:meals:')")))
        with pg.expect_navigation():
            ev('A.bkun2()')
        pg.wait_for_load_state('load')
        pg.clock.run_for(1500)
        ev(HELPERS)
        check('deshacer la restauración devuelve los datos anteriores', ev('S.rest') == 999 and ev('(()=>{const s=JSON.parse(JSON.stringify(S));s.rest=%s;return __T.can(s)})()' % json.dumps(json.loads(before)['rest'])) == before)
        ev("document.querySelector('#dg')&&(document.querySelector('#dg').innerHTML='')")

        # ── restaurar sin espacio: se deshace y se sigue guardando con normalidad ──
        before = ev('__T.can(S)')
        ev("window.__set2=Store.set;Store.set=(k,v)=>{if(k=='ff:hist'){const e=new Error('lleno');e.name='QuotaExceededError';throw e}return __set2(k,v)};0")
        ev("(()=>{const s=JSON.parse(JSON.stringify(S));s.hist={'Sentadilla':[{d:'2026-10-02',s:[[5,100,8,0]]}]};s.logs=[];pendingRestore={s};restoreBackup()})()")
        pg.clock.run_for(300)
        check('si la copia no cabe, avisa', ev("/No se pudo restaurar; tus datos siguen como estaban/.test(document.body.innerText)"))
        check('y los datos guardados siguen como estaban', ev('__T.can(__T.stored())') == before)
        ev("Store.set=__set2;S.rest=32;saveState()")
        check('después sigue guardando', ev("JSON.parse(localStorage.getItem('ff')).rest") == 32)

        # ── pantalla de error de arranque ──
        n = ev('S.logs.length')
        ev("window.__ffe('fallo simulado')")
        ev("document.getElementById('ffe2').click()")
        shown = json.loads(ev("document.getElementById('ffe4').value"))
        check('«Ver mis datos» enseña el estado completo', isinstance(shown.get('logs'), list) and len(shown['logs']) == n and '2026-10-29' in shown.get('meals', {}) and '_parts' not in shown, str(shown)[:120])
        with pg.expect_navigation():
            pg.click('#ffe3')
        pg.wait_for_load_state('load')
        pg.clock.run_for(800)
        ev(HELPERS)
        bad = json.loads(ev("JSON.parse(localStorage.getItem('ffbad')).raw"))
        check('«Restablecer» aparta el estado completo antes de borrarlo', len(bad.get('logs', [])) == n and 'Press banca' in bad.get('hist', {}))
        check('y empieza de cero', ev("__T.keys('ff:')") == ['ff:logs'] and ev("localStorage.getItem('ff:logs')") == '[]' and ev('S.logs.length') == 0, str(ev("__T.keys('ff:')")))

        # ── borrar todos los datos ──
        ev(SEED)
        ev("localStorage.setItem('ffw',JSON.stringify({W:{x:[]},t:Date.now()}))")
        ev("A.zrs()")
        pg.wait_for_load_state('load')
        pg.clock.run_for(800)
        ev(HELPERS)
        left = ev("__T.keys('ff')")
        check('«Borrar todo» borra el estado, sus partes y el entreno en curso', 'ffw' not in left and ev("__T.keys('ff:')") == ['ff:logs'] and ev('S.logs.length') == 0 and ev('Object.keys(S.meals).length') == 0 and not ev('S.hist'), str(left))
        check('sin errores de JS', not errs, '; '.join(errs[:3]))
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
