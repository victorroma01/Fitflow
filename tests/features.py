"""Prueba de las funciones de la 1.24: tipo de día automático, ayudas «?», botones de cada comida, «Mi nutrición» (objetivos a
mano que no se pisan), alimentos por grupos, Perfil y Ajustes, medallas de Logros e «Informar de un fallo».

  python3 tests/features.py dist/stratafit.html
Requiere:  pip install playwright  &&  playwright install chromium   (otro motor: SF_BROWSER=webkit; ver tests/browser.py)
"""
import os, sys, json, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


fails = []


def check(name, cond, info=''):
    if not cond:
        fails.append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def main(path):
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
        c.add_init_script(rd('init.js'))
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.on('dialog', lambda d: d.accept())
        # jueves 29 de octubre de 2026: Día 4 de la rutina (el Día 1 es el lunes)
        pg.clock.install(time=datetime.datetime(2026, 10, 29, 12, 0, 0))
        pg.goto(app_url(path))
        pg.clock.run_for(800)
        pg.evaluate(rd('seed.js'))
        pg.evaluate(rd('extra.js'))

        def reload():
            pg.reload()
            pg.wait_for_load_state('load')
            pg.clock.run_for(800)

        reload()
        ev = pg.evaluate
        run = lambda ms=300: pg.clock.run_for(ms)

        print('Tipo de día (entreno o descanso) según la rutina')
        plan = ev("S.plan.map(d=>d.ex.length>0)")
        check('el plan de prueba tiene días de entreno y de descanso', any(plan) and not all(plan), str(plan))
        # fechas de la semana del 26 de octubre (lunes) al 1 de noviembre
        days = ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']
        tr = [i for i in range(7) if plan[i]]
        rs = [i for i in range(7) if not plan[i]]
        fut = [i for i in range(3, 7)]
        ev("window.__logs=S.logs.slice();S.logs=S.logs.filter(l=>l.d<'2026-10-26'||l.d>'2026-11-01')")
        got = ev("%s.map(k=>dayInfo(k).t)" % json.dumps(days))
        check('hoy y los días que vienen siguen la rutina (Día 1 = lunes)', all(got[i] == ('t' if plan[i] else 'r') for i in fut), str(got))
        past_tr = [i for i in tr if i < 3]
        check('un día de entreno ya pasado sin entreno registrado cuenta como descanso', past_tr and all(got[i] == 'r' for i in past_tr), str(got))
        if past_tr:
            d = days[past_tr[0]]
            ev("S.logs.push({d:%s,n:'Prueba',ex:[],s:1,v:0,m:30})" % json.dumps(d))
            check('con un entreno registrado vuelve a ser día de entreno', ev("dayInfo(%s).t" % json.dumps(d)) == 't')
        past_rs = [i for i in rs if i < 3]
        if past_rs:
            d = days[past_rs[0]]
            ev("S.logs.push({d:%s,n:'Prueba',ex:[],s:1,v:0,m:30})" % json.dumps(d))
            check('entrenar un día de descanso lo convierte en día de entreno', ev("dayInfo(%s).t" % json.dumps(d)) == 't')
        ev("S.logs=window.__logs")
        ev("S.tab=1;R()")
        run()
        check('Nutrición ya no tiene el selector Entreno / Descanso', ev("!document.querySelector('[data-a=dty]')"))
        check('Nutrición dice qué tipo de día es hoy', ev("document.querySelector('.ndt').innerText") == ('Día de entreno' if plan[3] else 'Día de descanso'), ev("document.querySelector('.ndt').innerText"))

        print('Ayudas «?» de las plantillas')
        ev("document.querySelectorAll('details').forEach(d=>d.open=true)")
        n = ev("document.querySelectorAll('[data-a=hlp]').length")
        check('«Aplicar» y «Guardar como plantilla» tienen su «?»', n == 2, str(n))
        ev("document.querySelector('[data-a=hlp][data-v=tpa]').click()")
        run(100)
        t = ev("(document.getElementById('tip')||{}).textContent||''")
        check('el «?» explica para qué sirve', 'plantilla' in t and len(t) > 40, t)
        ev("document.querySelector('[data-a=hlp][data-v=tpa]').click()")
        check('tocar otra vez el «?» la cierra', ev("!document.getElementById('tip')"))
        ev("document.querySelector('[data-a=hlp][data-v=tps]').click()")
        ev("document.querySelector('.hd h1').click()")
        check('tocar fuera la cierra', ev("!document.getElementById('tip')"))

        print('Botones de cada comida')
        nm = ev("S.nu.n")
        for a in ('add', 'sd', 'nfs', 'nsc'):
            k = ev("document.querySelectorAll('.mlb [data-a=%s]').length" % a)
            check('cada comida tiene su botón «%s»' % a, k == nm, '%s de %s' % (k, nm))
        ev("A.nfs(1)")
        run()
        check('«Buscar» abre la búsqueda en internet para esa comida', ev("!!document.getElementById('f2q')&&addState.m==1"))
        ev("A.cl()")
        ev("A.nsc(2)")
        pg.wait_for_timeout(300)
        run()
        check('«Scan» abre el escáner para esa comida', ev("!!document.getElementById('f2ean')&&addState.m==2"))
        ev("A.f2bk()")
        run()
        check('cerrar el escáner vuelve a Nutrición', ev("!document.getElementById('f2ean')&&!document.querySelector('#sh .sp')"))

        print('Mi nutrición: objetivos del plan y a mano')
        ev("Object.assign(S.bio,{w:'80',h:'180',age:'30',sex:'M',act:1});S.nu.dt=3;delete S.nu.man")
        ev("A.nmy()")
        run()
        ev("A.nmr()")
        run()
        k_plan = ev("S.nu.k")
        check('«Recalcular con mis datos» calcula las kcal con el gasto diario', abs(k_plan - ev("Math.round(tdee().td)")) <= 1, '%s / %s' % (k_plan, ev("tdee().td")))
        check('la página dice «Según tu plan»', 'Según tu plan' in ev("document.querySelector('.mnm').innerText"))
        check('el anillo tiene un arco por macro', ev("document.querySelectorAll('.mnk circle').length") == 3)
        ev("A.nmm()")
        run()
        ev("document.getElementById('mnk').value='2500';document.getElementById('mnc0').value='40';document.getElementById('mnp0').value='30';document.getElementById('mnf0').value='20';U.mnp()")
        check('la vista previa avisa si los porcentajes no suman 100', 'suman 90' in ev("document.getElementById('mnv').textContent"))
        ev("A.nms()")
        run()
        check('con porcentajes que no suman 100 no se guarda', ev("S.nu.k") == k_plan and not ev("S.nu.man"))
        ev("A.nmm()")
        run()
        ev("document.getElementById('mnk').value='2500';document.getElementById('mnc0').value='40';document.getElementById('mnp0').value='30';document.getElementById('mnf0').value='30';A.nms()")
        run()
        check('«Ajustar a mano» guarda kcal y macros', ev("[S.nu.k,S.nu.c,S.nu.p,S.nu.f,S.nu.man]") == [2500, 40, 30, 30, 1], str(ev("S.nu")))
        check('la página dice «A mano»', 'A mano' in ev("document.querySelector('.mnm').innerText"))
        ev("const e=document.querySelector('[data-c=mnw]');e.value='85';e.dispatchEvent(new Event('change',{bubbles:true}))")
        run()
        check('cambiar el peso no pisa lo puesto a mano', ev("S.bio.w") == '85' and ev("S.nu.k") == 2500)
        ev("const e=document.querySelector('[data-c=mna]');e.value='3';e.dispatchEvent(new Event('change',{bubbles:true}))")
        run()
        check('cambiar la actividad tampoco', ev("S.bio.act") == 3 and ev("S.nu.k") == 2500)
        ev("const e=document.querySelector('[data-c=mnd]');e.value='2';e.dispatchEvent(new Event('change',{bubbles:true}))")
        run()
        check('elegir otro objetivo vuelve al plan y recalcula', ev("S.nu.dt") == 2 and not ev("S.nu.man") and ev("S.nu.k") != 2500, str(ev("S.nu")))
        ev("const e=document.querySelector('[data-c=mnn]');e.value='3';e.dispatchEvent(new Event('change',{bubbles:true}))")
        run()
        check('comidas al día', ev("S.nu.n") == 5)
        ev("A.cl()")
        ev("S.nu={k:'<img src=x>',c:-5,p:'x',f:200,n:99,dt:'zz',man:0};S.dt={'2026-10-29':'r'};saveState()")
        reload()
        check('al arrancar, unos objetivos dañados quedan válidos', ev("[S.nu.k,S.nu.c,S.nu.p,S.nu.f,S.nu.n,'dt' in S.nu]") == [1942, 50, 20, 30, 3, False], str(ev("S.nu")))
        check('y el tipo de día elegido a mano (1.23) se borra', ev("!('dt' in S)"))

        print('Alimentos por grupos')
        nf = ev("FOODS_SRC.length")
        check('hay al menos 490 alimentos', nf >= 490, str(nf))
        bad = ev("""FOODS_SRC.filter(f=>typeof f.n!='string'||!f.n||f.b.length!=6||f.b.some(v=>!(v>=0))||!(f.g>=0&&f.g<FOOD_GROUPS.length)).map(f=>f.n)""")
        check('todos con nombre, 6 valores válidos y grupo', not bad, str(bad[:5]))
        dup = ev("""(()=>{const s=new Set(),d=[];FOODS_SRC.forEach(f=>{const k=f.n.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');if(s.has(k))d.push(f.n);s.add(k)});return d})()""")
        check('sin nombres repetidos', not dup, str(dup[:5]))
        ev("S.tab=1;R();A.add(0)")
        run()
        ng = ev("document.querySelectorAll('.fgc button').length")
        check('la hoja «Añadir» tiene un botón por grupo y «Todos»', ng >= ev("FOOD_GROUPS.length") + 1, str(ng))
        n_all = ev("document.querySelectorAll('#rs [data-a=pk]').length")
        check('sin buscar se ven todos los alimentos (antes, solo 30)', n_all >= 490, str(n_all))
        ev("A.fgr(1)")
        run(100)
        g1 = ev("[...document.querySelectorAll('#rs [data-a=pk]')].map(e=>FOODS_SRC[+e.dataset.i]&&FOODS_SRC[+e.dataset.i].g)")
        check('un grupo muestra solo sus alimentos', g1 and all(g == 1 for g in g1), str(g1[:5]))
        ev("const i=document.querySelector('[data-u=fs]');i.value='zzzz no existe';i.dispatchEvent(new Event('input',{bubbles:true}))")
        run(100)
        check('sin resultados ofrece buscarlo en internet', ev("!!document.querySelector('#rs [data-a=nfq]')"))
        ev("A.cl()")

        print('Perfil y Ajustes')
        ev("S.tab=3;R()")
        run()
        sums = ev("[...document.querySelectorAll('#app summary.pfs b')].map(b=>b.innerText)")
        check('Datos, Plan y Datos biométricos son desplegables con icono', sums == ['Datos', 'Plan de entrenamiento', 'Datos biométricos'], str(sums))
        check('nombre, email y teléfono van dentro de «Datos»', ev("document.querySelectorAll('details:first-of-type [data-c=pf]').length") == 3)
        check('«Ajustes» es una fila con icono, no un desplegable', ev("!!document.querySelector('#app button.f2lk[data-a=zaj] svg')"))
        brand = ev("document.querySelector('.brand').innerText.replace(/\\s+/g,' ')")
        check('el pie dice STRATAFIT y la versión', brand == 'STRATAFIT V' + ev("APPV"), brand)
        check('fuera del pie, sin el copyright ni el aviso (van en Ajustes, Aviso legal)', ev("!document.querySelector('#app .ver')"))
        ev("const e=document.createElement('input');e.dataset.i='__proto__';e.value='x';C.pf(e)")
        check('un campo de perfil que no existe se ignora', ev("!Object.prototype.hasOwnProperty.call(S.pf,'__proto__')&&({}).x===undefined"))
        ev("A.zaj()")
        run()
        rows = ev("[...document.querySelectorAll('#ajs .sr')].map(b=>b.dataset.a+(b.dataset.v?':'+b.dataset.v:''))")
        want = ['ajp:tema', 'ajp:acento', 'ajp:unidades', 'ajp:sonido', 'zbk', 'rst', 'updChk', 'diag', 'rpo', 'ajp:privacidad', 'ajp:legal']
        check('Ajustes tiene todas sus filas', rows == want, str(rows))
        check('con secciones', ev("[...document.querySelectorAll('#ajs .ph')].map(e=>e.innerText.trim().toLowerCase())") == ['apariencia', 'entreno', 'datos', 'app', 'información'])
        ev("A.ajp(0,{dataset:{v:'tema'}})")
        run()
        ev("document.querySelector('#sh [data-a=zth][data-v=light]').click()")
        run()
        check('cambiar el tema se ve al momento en la página', ev("document.querySelector('#sh [data-a=zth][data-v=light]').classList.contains('on')") and ev("S.theme") == 'light')
        ev("document.querySelector('#sh [data-a=zaj]').click()")
        run()
        check('«←» vuelve a Ajustes', ev("!!document.querySelector('#ajs .sr[data-a=rst]')"))
        ev("A.zbk()")
        run()
        check('la copia de seguridad abierta desde Ajustes tiene «←» a Ajustes', ev("!!document.querySelector('#sh [data-a=zaj]')"))
        ev("A.zaj();A.ajp(0,{dataset:{v:'legal'}})")
        run()
        check('el aviso legal lleva el copyright y el aviso de salud', all(s in ev("document.querySelector('#sh').innerText") for s in ('Rodriguez Mazuelas', 'no sustituyen el consejo')))
        ev("A.cl()")

        print('Medallas de Logros')
        ids = ev("ACHIEVEMENTS.map(x=>x[0])")
        svgs = ev("ACHIEVEMENTS.map(x=>medalSvg(x[0],58,1).replace(/md\\d+/g,''))")
        check('una medalla para cada logro', len(svgs) == len(ids) == 27, str(len(svgs)))
        check('todas distintas', len(set(svgs)) == len(svgs))
        ev("A.f2lg()")
        run()
        n = ev("document.querySelectorAll('#sh .f2ac svg.md').length")
        check('la página de Logros pinta las 27', n == 27, str(n))
        on = ev("document.querySelectorAll('#sh .f2ac.on svg.md:not(.off)').length")
        off = ev("document.querySelectorAll('#sh .f2ac:not(.on) svg.md.off').length")
        check('las conseguidas en color y las que faltan en gris', on + off == 27, '%s + %s' % (on, off))
        check('y una vitrina con las conseguidas', ev("document.querySelectorAll('#sh .mdv svg').length") == on)
        ev("A.cl()")

        print('Informar de un fallo')
        ev("A.zaj();A.rpo()")
        run()
        check('nueve tipos de fallo para elegir', ev("document.querySelectorAll('.rpt button').length") == 9)
        ev("window.__href=null;HTMLAnchorElement.prototype.click=function(){window.__href=this.href}")
        ev("A.rps()")
        run(200)
        check('sin tipo no se envía (y lo dice)', ev("window.__href") is None and 'Elige el tipo' in ev("document.getElementById('tt').innerText"))
        ev("A.rpt(1)")
        check('elegir un tipo lo marca', ev("document.querySelector('.rpt [data-i=\"1\"]').getAttribute('aria-checked')") == 'true')
        ev("document.getElementById('rpx').value='corto'")
        ev("A.rps()")
        run(200)
        check('con un texto muy corto no se envía (y lo dice)', ev("window.__href") is None and 'al menos 10' in ev("document.getElementById('tt').innerText"))
        txt = 'Al guardar el entreno se perdió la serie 3 <img src=x onerror="window.__x=1">'
        ev("document.getElementById('rpx').value=%s;document.getElementById('rpd').checked=false" % json.dumps(txt))
        ev("A.rps()")
        run(200)
        href = ev("window.__href") or ''
        from urllib.parse import urlparse, parse_qs
        q = parse_qs(urlparse(href).query)
        check('abre una incidencia nueva en GitHub', href.startswith('https://github.com/victorroma01/Fitflow/issues/new?'), href[:80])
        check('con el tipo en el título y el texto en el cuerpo', q.get('title', [''])[0].startswith('[Se han perdido datos]') and txt in q.get('body', [''])[0])
        check('sin datos técnicos si se desmarca la casilla', 'Navegador' not in q.get('body', [''])[0])
        ev("document.getElementById('rpd').checked=true;A.rps()")
        run(200)
        q = parse_qs(urlparse(ev("window.__href") or '').query)
        check('con datos técnicos si se deja marcada', 'Navegador' in q.get('body', [''])[0] and len(ev("window.__href")) < 8000)
        check('el texto no se ejecuta en ningún momento', not ev("window.__x"))
        ev("A.cl()")

        check('la CSP no ha bloqueado nada de la app', not ev('window.__csp||[]'), str(ev('window.__csp||[]'))[:200])
        check('sin errores de JS', not errs, '; '.join(errs[:3]))
        b.close()
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN %d comprobaciones' % len(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
