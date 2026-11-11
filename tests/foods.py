"""Prueba de los alimentos en línea (Open Food Facts), con el servicio simulado: buscar por nombre (I-22: buscador nuevo primero,
el antiguo de respaldo, un reintento, lo ya buscado no se vuelve a pedir y un mensaje distinto para cada fallo) y el código de
barras escrito a mano. Ninguna petición sale a internet: las contesta la propia prueba.

  python3 tests/foods.py dist/stratafit.html
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


def product(code, name, kcal=None, brands='', **extra):  # extra: otros campos (nutriscore_grade…)
    """Un producto como los da Open Food Facts; sin kcal, no trae valores nutricionales."""
    nut = {} if kcal is None else {'energy-kcal_100g': kcal, 'carbohydrates_100g': 10, 'proteins_100g': 5, 'fat_100g': 2, 'fiber_100g': 1, 'salt_100g': .3}
    return dict({'code': code, 'product_name': name, 'brands': brands, 'nutriments': nut}, **extra)


CORS = {'access-control-allow-origin': '*'}


class FakeOFF:
    """Open Food Facts simulado. plan[tipo] es la cola de respuestas de cada servicio ('new': buscador nuevo; 'old': el antiguo;
    'v3' y 'v2': producto por código): ('json', datos) | ('status', código) | ('fail',) corta la conexión | ('hang',) no contesta."""

    def __init__(self):
        self.plan = {'new': [], 'old': [], 'v3': [], 'v2': []}
        self.calls = []
        self.hung = []

    def kind(self, url):
        return 'new' if '//search.openfoodfacts.org/' in url else 'old' if 'cgi/search.pl' in url else 'v3' if '/api/v3/' in url else 'v2'

    def handle(self, route):
        k = self.kind(route.request.url)
        self.calls.append((k, route.request.url))
        step = self.plan[k].pop(0) if self.plan[k] else ('status', 500)
        if step[0] == 'json':
            route.fulfill(status=200, content_type='application/json', body=json.dumps(step[1]), headers=CORS)
        elif step[0] == 'status':
            route.fulfill(status=step[1], content_type='application/json', body='{}', headers=CORS)
        elif step[0] == 'fail':
            route.abort()
        else:
            # 'hang': se queda sin contestar; la app corta al pasar su tiempo de espera
            self.hung.append(route)

    def release(self):
        """Suelta las peticiones que se quedaron sin contestar."""
        for r in self.hung:
            try:
                r.abort()
            except Exception:
                pass
        self.hung = []

    def reset(self, **plan):
        self.release()
        self.calls = []
        self.plan = {'new': [], 'old': [], 'v3': [], 'v2': []}
        self.plan.update(plan)

    def kinds(self):
        return [c[0] for c in self.calls]


def main(path):
    off = FakeOFF()
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
        c.add_init_script(rd('init.js'))
        c.route('**://*.openfoodfacts.org/**', off.handle)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.clock.install(time=datetime.datetime(2026, 11, 4, 10, 0, 0))
        pg.goto(app_url(path))
        pg.clock.run_for(1500)
        pg.clock.pause_at(datetime.datetime(2026, 11, 4, 10, 0, 10))
        ev = pg.evaluate
        run = lambda ms=400: pg.clock.run_for(ms)
        rs = lambda: ev("(e=>e?e.innerText:'')(document.getElementById('rs'))")
        msg = lambda: ev("(e=>e?e.textContent:'')(document.getElementById('f2sm'))")

        def settle(cond, ms=3000, step=0):
            """Espera (en tiempo real) a que se cumpla `cond`; con step, además avanza el reloj de prueba ese tanto en cada vuelta."""
            for _ in range(ms // 50):
                if ev(cond):
                    return True
                pg.wait_for_timeout(50)
                if step:
                    run(step)
            return bool(ev(cond))

        def search(q):
            """Abre «Buscar» de la comida 0, escribe q y busca."""
            ev("S.tab=1;R();A.openFoodSearch(0)")
            run()
            settle("!!document.getElementById('f2q')")
            ev("document.getElementById('f2q').value=%s;A.searchFoodOnline();0" % json.dumps(q))  # «;0»: sin esperar a que acabe la búsqueda

        done = "!/Buscando|Probando/.test(document.getElementById('rs').innerText)"

        # ───────────────────────────── buscar por nombre ─────────────────────────────
        print('Buscar un alimento por nombre (I-22)')
        off.reset(new=[('json', {'hits': [product('8410000000017', 'Yogur natural', 59, 'Marca Uno'), product('8410000000024', {'main': 'Yaourt', 'es': 'Yogur griego'}, 120, ['Marca Dos', 'Otra']), product('8410000000031', 'Yogur sin datos')]})])
        search('yogur: "natural" (0%)')
        settle(done)
        txt = rs()
        check('pregunta primero al buscador nuevo de Open Food Facts, y con eso basta', off.kinds() == ['new'], str(off.kinds()))
        q = ev("new URL(%s).searchParams.get('q')" % json.dumps(off.calls[0][1]))
        check('sin los signos que el buscador toma por órdenes (dos puntos, comillas, paréntesis…): solo las palabras', q == 'yogur natural 0%', q)
        check('enseña los productos con sus calorías por 100 g y su marca', 'Yogur natural (Marca Uno)' in txt and '59 kcal' in txt and 'Yogur griego (Marca Dos)' in txt and '120 kcal' in txt, txt)
        check('los que no traen valores nutricionales no se enseñan', 'sin datos' not in txt)
        ev("document.querySelector('#rs [data-a=onlineFoodPick]').click()")
        run()
        check('al tocar uno se abre para elegir los gramos', ev("!!document.getElementById('gr')") and 'Yogur natural' in ev("document.querySelector('#sh h3').textContent"))
        ev("A.addFood()")
        run()
        check('y se añade a la comida', ev("Object.values(S.meals).some(d=>(d[0]||[]).some(x=>x.n=='Yogur natural (Marca Uno)'&&x.b[0]==59))"))

        off.reset()
        search('yogur: "natural" (0%)')
        settle(done)
        check('lo ya buscado no se vuelve a pedir', off.kinds() == [] and 'Yogur natural' in rs(), str(off.kinds()))

        off.reset(new=[('status', 503)], old=[('json', {'products': [product('8410000000048', 'Queso fresco', 98, 'Lácteos Sur')]})])
        search('queso')
        settle(done)
        check('si el buscador nuevo falla, pregunta al antiguo', off.kinds() == ['new', 'old'] and 'Queso fresco (Lácteos Sur)' in rs(), str(off.kinds()) + rs())

        off.reset(new=[('json', {'hits': []})], old=[('json', {'products': [product('8410000000055', 'Pan de centeno', 250)]})])
        search('pan centeno')
        settle(done)
        check('y también si no trae nada', off.kinds() == ['new', 'old'] and 'Pan de centeno' in rs(), str(off.kinds()) + rs())

        off.reset(new=[('status', 503), ('json', {'hits': [product('8410000000062', 'Arroz integral', 350)]})], old=[('status', 429)])
        search('arroz')
        settle("/Probando otra vez/.test(document.getElementById('rs').innerText)")
        check('si fallan los dos, lo dice y lo intenta otra vez', 'tarda en responder' in rs(), rs())
        settle(done, step=400)
        check('y el segundo intento trae los resultados, sin que el usuario haga nada', off.kinds() == ['new', 'old', 'new'] and 'Arroz integral' in rs(), str(off.kinds()) + rs())

        off.reset(new=[('status', 503), ('status', 503)], old=[('status', 503)])
        search('lentejas')
        settle(done, step=400)
        check('si sigue saturado, lo explica (no dice «no encontrado») y deja reintentar', 'saturado' in rs() and ev("!!document.querySelector('#rs [data-a=searchFoodOnline]')"), rs())
        off.reset(new=[('json', {'hits': [product('8410000000079', 'Lentejas cocidas', 90)]})])
        ev("document.querySelector('#rs [data-a=searchFoodOnline]').click();0")
        settle(done)
        check('«Reintentar» repite la búsqueda', 'Lentejas cocidas' in rs(), rs())

        off.reset(new=[('hang',), ('hang',)], old=[('hang',)])
        search('garbanzos')
        settle(done, ms=6000, step=2500)
        check('si no contesta a tiempo, dice que tarda demasiado', 'tarda demasiado' in rs(), rs())

        off.reset(new=[('fail',), ('fail',)], old=[('fail',)])
        search('nueces')
        settle(done, step=400)
        check('si la petición no llega, pide comprobar la conexión', 'Comprueba la conexión' in rs(), rs())

        ev("Object.defineProperty(navigator,'onLine',{get:()=>false,configurable:true})")
        off.reset()
        search('almendras')
        settle(done)
        check('sin conexión lo dice al momento, sin esperar', 'No hay conexión' in rs() and off.kinds() == [], rs())
        ev("Object.defineProperty(navigator,'onLine',{get:()=>true,configurable:true})")

        off.reset(new=[('json', {'hits': []})], old=[('json', {'products': []})])
        search('zzzzqq')
        settle(done)
        check('sin resultados en ninguno de los dos: «No hay resultados»', 'No hay resultados para «zzzzqq»' in rs(), rs())

        off.reset(new=[('json', {'hits': [product('1', 'Barrita X'), product('2', 'Barrita Y')]})], old=[('json', {'products': []})])
        search('barrita')
        settle(done)
        check('si los hay pero sin valores nutricionales, lo dice', 'Hay 2 productos' in rs() and 'sin datos nutricionales' in rs(), rs())

        off.reset(new=[('json', {'hits': [product('3', 'Tomate frito', 77)]})])
        ev("S.tab=1;R();A.openFoodSearch(0)")
        run()
        ev("document.getElementById('f2q').value='tomate';A.searchFoodOnline();A.searchFoodOnline();0")
        settle(done)
        check('un toque doble en «Buscar» no lanza dos búsquedas', off.kinds() == ['new'], str(off.kinds()))
        ev("document.getElementById('f2q').value='t';A.searchFoodOnline();0")
        check('con menos de 2 letras no busca', 'al menos 2 letras' in ev("document.getElementById('tt').textContent") and off.kinds() == ['new'])
        ev("A.closeSheet()")

        # ───────────────────────────── código de barras ─────────────────────────────
        print('Buscar un producto por su código de barras')

        def scan(code):
            ev("S.tab=1;R();A.openMealScanner(0)")
            run()
            settle("!!document.getElementById('f2ean')")
            ev("document.getElementById('f2ean').value=%s;A.scannerLookupTyped();0" % json.dumps(code))

        found = "!!document.getElementById('gr') || !/Buscando/.test((document.getElementById('f2sm')||{textContent:''}).textContent)"
        off.reset(v3=[('json', {'product': product('8410000000086', 'Atún al natural', 108, 'Conservas Mar')})])
        scan('8410000000086')
        settle(found)
        check('el código escrito a mano trae el producto', off.kinds() == ['v3'] and ev("!!document.getElementById('gr')") and 'Atún al natural (Conservas Mar)' in ev("document.querySelector('#sh h3').textContent"), str(off.kinds()))
        ev("A.closeSheet()")
        off.reset()
        scan('8410000000086')
        settle(found)
        check('un producto ya escaneado sale sin conexión: no se vuelve a pedir', off.kinds() == [] and ev("!!document.getElementById('gr')"))
        ev("A.closeSheet()")
        off.reset(v3=[('status', 503)], v2=[('json', {'status': 1, 'product': product('8410000000093', 'Galletas de avena', 440)})])
        scan('8410000000093')
        settle(found)
        check('si la primera consulta falla, se hace la segunda', off.kinds() == ['v3', 'v2'] and ev("!!document.getElementById('gr')"), str(off.kinds()))
        ev("A.closeSheet()")
        off.reset(v3=[('status', 503), ('json', {'product': product('8410000000109', 'Leche entera', 63)})], v2=[('status', 503)])
        scan('8410000000109')
        settle(found, step=400)
        check('si fallan las dos, se reintenta una vez sin que el usuario haga nada', off.kinds() == ['v3', 'v2', 'v3'] and ev("!!document.getElementById('gr')"), str(off.kinds()) + msg())
        ev("A.closeSheet()")
        off.reset(v3=[('status', 404)])
        scan('8410000000116')
        settle(found)
        check('un código que no está: lo dice y propone crearlo a mano', 'no está en Open Food Facts' in msg(), msg())
        off.reset(v3=[('json', {'status': 'failure'})], v2=[('json', {'status': 0})])
        ev("document.getElementById('f2ean').value='8410000000123';A.scannerLookupTyped();0")
        settle(found)
        check('también cuando las dos contestan sin producto (sin reintentar)', 'no está en Open Food Facts' in msg() and off.kinds() == ['v3', 'v2'], msg() + str(off.kinds()))
        off.reset(v3=[('json', {'product': product('8410000000130', 'Agua con gas')})])
        ev("document.getElementById('f2ean').value='8410000000130';A.scannerLookupTyped();0")
        settle(found)
        check('un producto sin valores nutricionales: lo dice', 'no tiene información nutricional' in msg(), msg())
        off.reset(v3=[('status', 503), ('status', 503)], v2=[('status', 503), ('status', 503)])
        ev("document.getElementById('f2ean').value='8410000000147';A.scannerLookupTyped();0")
        settle(found, step=400)
        check('si el servicio sigue saturado, lo explica', 'saturado' in msg() and off.kinds() == ['v3', 'v2', 'v3', 'v2'], msg() + str(off.kinds()))
        ev("document.getElementById('f2ean').value='123';A.scannerLookupTyped();0")
        check('un código de menos de 8 cifras no se busca', 'entre 8 y 14 cifras' in msg())
        ev("A.scannerClose()")

        # la cámara contesta tarde (al segundo), con el código escrito a mano ya buscándose; después se cierra la hoja antes de
        # que llegue la respuesta
        print('Una cámara o una respuesta que llegan tarde no pisan nada')
        ev("""window.__md = !!navigator.mediaDevices;
if (!window.__md) Object.defineProperty(navigator, 'mediaDevices', {value: {}, configurable: true});
window.__trk = {on: 1, stop() { this.on = 0; }};
window.__late = ok => { navigator.mediaDevices.getUserMedia = () => new Promise((y, n) => setTimeout(() => ok ? y({getTracks: () => [window.__trk]}) : n(Object.assign(new Error('sin cámara'), {name: 'NotFoundError'})), 1000)); };
window.__late(0); 0""")
        off.reset(v3=[('hang',)], v2=[('json', {'status': 1, 'product': product('8410000000185', 'Zumo de naranja', 45)})])
        scan('8410000000185')
        run(1200)
        check('si la cámara falla tarde, sigue el mensaje de la búsqueda', 'Buscando 8410000000185' in msg(), msg())
        ev("A.closeSheet()")
        off.release()
        settle("false", ms=600)
        check('si se cierra la hoja antes de la respuesta, el producto que llega después no abre nada', off.kinds() == ['v3', 'v2'] and ev("!document.querySelector('#sh .sp') && !(S.barcodeCache||{})['8410000000185']"), str(off.kinds()))
        ev("window.__late(1); 0")
        off.reset(v3=[('hang',)], v2=[('status', 404)])
        scan('8410000000192')
        run(1200)
        check('si la cámara se abre tarde, se apaga y sigue el mensaje de la búsqueda', 'Buscando 8410000000192' in msg() and ev("window.__trk.on") == 0, msg())
        ev("A.closeSheet(); delete navigator.mediaDevices.getUserMedia; if (!window.__md) delete navigator.mediaDevices; 0")
        off.release()
        settle("false", ms=400)

        # ───────────────────────────── Nutri-Score y «Mis alimentos» ─────────────────────────────
        print('Nutri-Score (F-43) y «Mis alimentos» (F-44)')
        ev("S.myFoods=[];S.barcodeCache={};saveState()")
        off.reset(new=[('json', {'hits': [product('8410000000154', 'Kéfir natural', 64, 'Granja', nutriscore_grade='a'), product('8410000000161', 'Galletas', 470, nutriscore_grade='unknown')]})])
        search('kefir')
        settle(done)
        badges = ev("[...document.querySelectorAll('#rs .it')].map(r=>(r.querySelector('.nsb')||{}).ariaLabel||(r.querySelector('.nsb')&&r.querySelector('.nsb').getAttribute('aria-label'))||'')")
        check('en los resultados, la letra del Nutri-Score de cada producto que la tiene (no en los demás)', badges == ['Nutri-Score A', ''], str(badges))
        check('y lo pide a Open Food Facts', 'nutriscore_grade' in off.calls[0][1])
        ev("document.querySelector('#rs [data-a=onlineFoodPick]').click()")
        run()
        nsr = ev("(e=>e&&[e.getAttribute('aria-label'),[...e.querySelectorAll('i')].map(i=>i.textContent).join(''),e.querySelector('i.on').textContent])(document.querySelector('#sh .nsr'))")
        check('al elegirlo, su Nutri-Score con las cinco letras y la suya destacada', nsr == ['Nutri-Score A', 'ABCDE', 'A'], str(nsr))
        ev("A.addFood()")
        run()
        cf = ev("S.myFoods")
        check('al añadirlo a la comida se guarda en «Mis alimentos», con su Nutri-Score y su código', cf == [{'n': 'Kéfir natural (Granja)', 'b': [64, 10, 5, 2, 1, 0.3], 'ns': 'a', 'ean': '8410000000154'}], str(cf))
        search('kefir')
        settle(done)
        ev("document.querySelector('#rs [data-a=onlineFoodPick]').click()")
        run()
        ev("A.addFood()")
        run()
        check('añadirlo otra vez no lo repite', ev('S.myFoods.length') == 1)
        off.reset(v3=[('json', {'product': product('8410000000178', 'Yogur griego', 120, 'Lácteos', nutriscore_grade='c')})])
        scan('8410000000178')
        settle(found)
        check('al escanear, también su Nutri-Score', ev("(e=>e&&e.querySelector('i.on').textContent)(document.querySelector('#sh .nsr'))") == 'C' and ev("S.barcodeCache['8410000000178'].ns") == 'c')
        ev("A.addFood()")
        run()
        off.reset()
        scan('8410000000178')
        settle(found)
        check('y se recuerda sin conexión', off.kinds() == [] and ev("(e=>e&&e.querySelector('i.on').textContent)(document.querySelector('#sh .nsr'))") == 'C')
        ev("A.closeSheet()")
        ev("S.tab=1;R();A.openAddFood(0)")
        run()
        ev("document.querySelector('.fgc [data-a=foodGroup]:last-child').click()")
        run()
        rows = ev("[...document.querySelectorAll('#rs .it')].map(r=>[r.querySelector('span').textContent,!!r.querySelector('.cfx')])")
        check('«Mis alimentos» enseña los guardados, con su Nutri-Score y su «✕» para borrarlos', rows == [['Kéfir natural (Granja)A', True], ['Yogur griego (Lácteos)C', True]], str(rows))
        meals = ev("JSON.stringify(S.meals)")
        ev("document.querySelector('#rs .it .cfx').click()")
        run()
        check('borrar uno pide confirmación', '¿Borrar de Mis alimentos?' in ev("document.getElementById('dg').innerText") and ev('S.myFoods.length') == 2)
        ev("document.querySelector('#dg [data-v=ownFoodDelete]').click()")
        run()
        check('y lo quita de la lista, sin tocar las comidas en que ya estaba', ev("S.myFoods.map(f=>f.n)") == ['Yogur griego (Lácteos)'] and ev("JSON.stringify(S.meals)") == meals and ev("document.querySelectorAll('#rs .it').length") == 1)
        ev("A.addTab(2)")
        ev("document.getElementById('n0').value='Tortilla de la abuela';document.getElementById('n_k').value='180';A.newFoodSave()")
        run()
        ev("document.querySelector('.fgc [data-a=foodGroup]:last-child').click()")
        run()
        rows = ev("[...document.querySelectorAll('#rs .it')].map(r=>[r.querySelector('span').textContent,!!r.querySelector('.cfx')])")
        check('los creados a mano también están en «Mis alimentos» y se pueden borrar', ev("S.myFoods.length") == 2 and ['Tortilla de la abuela', True] in rows, str(rows))
        ev("S.myFoods.push({n:'Dañado',b:[1,1,1,1,1,1],ns:'z',ean:'abc'});saveState()")
        pg.reload()
        run(1500)
        check('un Nutri-Score o un código no válidos (datos dañados) se quitan al abrir', ev("(f=>!('ns' in f)&&!('ean' in f))(S.myFoods.find(f=>f.n=='Dañado'))"))
        ev("A.closeSheet()")
        check('sin errores de JS', not errs, str(errs[:3]))
        off.release()
        c.close()
        b.close()
    print('\n%d fallos' % len(fails) if fails else '\nTodo correcto')
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
