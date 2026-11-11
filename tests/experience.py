"""Prueba de la experiencia de uso (M6) con el motor de Android (Chromium) y con el del iPhone (WebKit, SF_BROWSER=webkit):
personalización (F-31), recorrido de la primera vez (F-36), deslizar para volver (F-37), arrastrar la burbuja de la barra de
pestañas (F-38), «atrás» del sistema, accesos directos del icono y globo del icono (F-39), y las descargas al móvil con la app
instalada (T-06: el análisis en PDF, F-26; la copia de seguridad, F-30, y el evento del pesaje, F-25). Los gestos se hacen con
eventos de puntero táctiles (PointerEvent con pointerType «touch»), los que da el dedo en Android y en iPhone; el reloj es el de
prueba (velocidad del gesto, esperas). Lo que solo se puede ver en un móvil de verdad está en docs/tecnica/pruebas.md.

  python3 tests/experience.py dist/stratafit.html
Requiere:  pip install playwright  &&  playwright install chromium   (otro motor: SF_BROWSER=webkit; ver tests/browser.py)
"""
import os, sys, json, datetime
from playwright.sync_api import sync_playwright
from browser import launch, app_url, context_opts

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def rd(n):
    t = open(os.path.join(HERE, n), encoding='utf-8').read()
    return chr(10).join(l for l in t.split(chr(10)) if not l.startswith('//'))


fails = []


def check(name, cond, info=''):
    if not cond:
        fails.append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


# eventos de puntero táctiles sobre un elemento (como el dedo), y la burbuja de notificaciones y el permiso de avisos simulados
PTR = """window.__pe=(type,el,x,y)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,composed:true,pointerId:5,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,button:0,buttons:type=='pointerup'||type=='pointercancel'?0:1}));
window.__badge=[];navigator.setAppBadge=function(n){window.__badge.push(n);return Promise.resolve()};navigator.clearAppBadge=function(){window.__badge.push(0);return Promise.resolve()};
window.__vib=0;navigator.vibrate=function(){window.__vib++;return true};
window.__nperm='default';window.__nwant='granted';window.__vis='visible';
try{Object.defineProperty(document,'visibilityState',{get:function(){return window.__vis},configurable:true})}catch(e){}
try{if(typeof Notification!='undefined'){Object.defineProperty(Notification,'permission',{get:function(){return window.__nperm},configurable:true});Notification.requestPermission=function(){window.__nperm=window.__nwant;return Promise.resolve(window.__nperm)}}else window.Notification={get permission(){return window.__nperm},requestPermission:function(){window.__nperm=window.__nwant;return Promise.resolve(window.__nperm)}}}catch(e){}"""
# la app instalada (en iPhone, navigator.standalone): guardar un archivo abre «Compartir» (en iPhone, «Guardar en Archivos»)
STANDALONE = """try{Object.defineProperty(navigator,'standalone',{value:true,configurable:true})}catch(e){}
window.__shared=[];window.__abort=0;navigator.canShare=function(d){return !!(d&&d.files&&d.files.length)};
navigator.share=async function(d){const f=d.files[0];window.__shared.push({n:f.name,t:f.type,s:f.size,h:(await f.text()).slice(0,15)});if(window.__abort)throw new DOMException('cancelado','AbortError')};"""
# septiembre y octubre de 2026: entrenos, comidas y peso (para el análisis mensual)
SEED = """(()=>{const pad=n=>String(n).padStart(2,'0');S.logs=[];S.meals={};
 for(const m of [9,10])for(let d=1;d<=28;d++){const k='2026-'+pad(m)+'-'+pad(d);const wd=new Date(k+'T12:00:00').getDay();
  if([1,3,5].includes(wd))S.logs.push({d:k,n:'Fuerza',v:5000,s:18,m:60,q:8});
  S.meals[k]={0:[{n:'Avena',g:100,b:[370,60,13,7,10,0]}],1:[{n:'Pollo y arroz',g:900,b:[160,18,14,3,1,0]}]}}
 S.wl=[{d:'2026-09-01',w:81},{d:'2026-10-27',w:79.5}];S.nu={k:2200,c:45,p:30,f:25,n:3};saveState()})()"""


def main(path):
    url = app_url(path)
    with sync_playwright() as p:
        b = launch(p)
        c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
        c.add_init_script(rd('init.js'))
        c.add_init_script(PTR)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:200]) if m.type == 'error' else None)
        # miércoles 4 de noviembre de 2026
        pg.clock.install(time=datetime.datetime(2026, 11, 4, 10, 0, 0))
        pg.goto(url)
        pg.clock.run_for(1500)
        # el reloj de prueba, parado: solo avanza cuando la prueba lo dice (si no, con el ordenador cargado, un «toque corto» podría
        # durar lo que mantener pulsado)
        pg.clock.pause_at(datetime.datetime(2026, 11, 4, 10, 0, 10))
        ev = pg.evaluate
        run = lambda ms=400: pg.clock.run_for(ms)

        def reload(ms=1200):
            pg.reload()
            pg.wait_for_load_state('load')
            run(ms)

        def back():
            """«Atrás» del sistema (botón o gesto de Android, o el del navegador)."""
            ev('history.back()')
            pg.wait_for_timeout(250)
            run(300)
            pg.wait_for_timeout(50)

        def at(sel):
            """El elemento `sel` pasa a ser el del gesto; devuelve su centro."""
            return ev("(e=>{window.__g=e;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})(document.querySelector(%s))" % json.dumps(sel))

        def gesture(sel, dx, dy=0, steps=8, ms=40, end='pointerup', pause=0):
            """Dedo sobre `sel`, se mueve (dx, dy) en `steps` pasos de `ms` ms y se levanta (o se cancela, o nada si end=None)."""
            x0, y0 = at(sel)
            ev("__pe('pointerdown',__g,%f,%f)" % (x0, y0))
            for i in range(1, steps + 1):
                run(ms)
                ev("__pe('pointermove',__g,%f,%f)" % (x0 + dx * i / steps, y0 + dy * i / steps))
            if pause:
                run(pause)
            if end:
                ev("__pe('%s',__g,%f,%f)" % (end, x0 + dx, y0 + dy))
                run(300)
            return x0, y0

        title = lambda: ev("(e=>e?e.textContent:'')(document.querySelector('#ajs .pgt'))")
        a2 = lambda: ev("getComputedStyle(document.documentElement).getPropertyValue('--a2').trim()")
        tab_center = lambda i: ev("(r=>[r.left+r.width/2,r.top+r.height/2])(document.querySelectorAll('nav button')[%d].getBoundingClientRect())" % i)

        # ───────────────────────────── personalización ─────────────────────────────
        print('Personalización (F-31)')
        ev("S.tab=3;R();A.zaj();A.ajp(0,{dataset:{v:'acento'}})")
        run()
        names = ev("[...document.querySelectorAll('#ajs .swg .swb small')].map(s=>s.textContent)")
        check('11 colores de serie (con Rosa, Turquesa, Lima y Grafito) y «Personalizado»', len(names) == 12 and names[-1] == 'Personalizado' and all(n in names for n in ['Morado', 'Rosa', 'Turquesa', 'Lima', 'Grafito']), str(names))
        check('«Personalizado» es el selector de color del sistema', ev("!!document.querySelector('#ajs .swc input[type=color][data-c=acx]')"))
        check('con vista previa: cabecera, botón, chips, barra y burbuja de las pestañas', ev("!!document.querySelector('#ajs .acp .acph .acpb') && !!document.querySelector('#ajs .acp .acpr') && document.querySelectorAll('#ajs .acpn span').length==4"))
        ev("A.zac(7)")
        run()
        check('elegir uno de serie (Rosa) cambia el color de toda la app', ev('S.acc') == 7 and a2() == '#d6337f', a2())
        ev("(i=>{i.value='#00a86b';i.dispatchEvent(new Event('input',{bubbles:true}))})(document.querySelector('#ajs .swc input'))")
        check('mientras se elige un color propio, la app lo enseña sin guardarlo aún', a2() == ev("customAccent('#00a86b')[2]") and ev('S.acc') == 7, a2())
        ev("(i=>{i.value='#00a86b';i.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector('#ajs .swc input'))")
        run()
        check('al cerrar el selector queda guardado, marcado como «Personalizado»', ev('S.acc') == -1 and ev('S.acx') == '#00a86b' and ev("document.querySelector('#ajs .swc').classList.contains('on')"))
        ev("A.zaj()")
        run()
        check('y la fila de Ajustes dice «Personalizado»', 'Personalizado' in ev("document.querySelector('#ajs .sr[data-v=acento]').textContent"))
        res = ev("""['#ffffff','#000000','#ffee00','#0000ff','#7a45ee','#00ff00','#808080','#ff2d55','#3a2f00','#00a86b'].map(h=>{const a=customAccent(h);
          const X=c=>c.length==4?'#'+[...c.slice(1)].map(x=>x+x).join(''):c;
          const L=c=>{const v=[1,3,5].map(i=>parseInt(X(c).slice(i,i+2),16)/255).map(x=>x<=.03928?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]};
          const l=c=>{const v=[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255);return (Math.max(...v)+Math.min(...v))/2};
          const x=L(a[4]),y=L(a[2]);return [h,a[2],a[4],+((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2),+l(a[2]).toFixed(3)]})""")
        bad = [r for r in res if not (r[3] >= 3.2 and .29 <= r[4] <= .63)]
        check('cualquier color propio se lee bien: texto encima con contraste de 3,2 o más, ni muy oscuro ni muy claro', not bad, str(bad))
        check('un color de tono medio se queda tal cual', ev("customAccent('#d6337f')[2]") == '#d6337f')
        check('en un color claro (amarillo), el texto encima es casi negro', ev("customAccent('#ffee00')[4]") != '#fff')
        ev("A.ajp(0,{dataset:{v:'tema'}})")
        run()
        ev("(e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector('#ajs [data-c=rm]'))")
        run()
        check('«Reducir animaciones» quita las animaciones de la app', ev('S.rm') == 1 and ev("document.documentElement.classList.contains('rm')") and ev("getComputedStyle(document.querySelector('#sh .sp')).animationName") == 'none')
        ev("(e=>{e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector('#ajs [data-c=rm]'))")
        run()
        check('y se pueden volver a poner', ev('S.rm') == 0 and not ev("document.documentElement.classList.contains('rm')"))
        ev("A.zaj();A.ajp(0,{dataset:{v:'inicio'}})")
        run()
        opts = ev("[...document.querySelectorAll('#ajs [role=radio]')].map(b=>b.textContent+':'+b.getAttribute('aria-checked'))")
        check('«Al abrir la app»: la última pestaña (lo de siempre) o una fija', opts == ['La última que usaste:true', 'Workout:false', 'Nutrición:false', 'Dashboard:false', 'Perfil:false'], str(opts))
        ev("document.querySelector('#ajs [data-a=zst][data-v=\"2\"]').click()")
        run()
        ev("S.tab=3;saveState()")
        reload()
        check('con Dashboard elegido, la app se abre en Dashboard', ev('S.st0') == 2 and ev('S.tab') == 2)
        ev("A.zaj();A.ajp(0,{dataset:{v:'inicio'}})")
        run()
        ev("document.querySelector('#ajs [data-a=zst][data-v=\"-1\"]').click()")
        run()
        ev("A.cl();S.tab=1;R();saveState()")
        reload()
        check('con «La última», se abre donde se dejó', ev('S.st0') is None and ev('S.tab') == 1)
        ev("S.acc=-1;S.acx='rojo';S.st0=9;S.rm='x';saveState()")
        reload()
        check('al arrancar, un color propio u opciones no válidos (unos datos dañados) se arreglan', ev("S.acx===undefined && S.acc===undefined && S.st0===undefined && S.rm===undefined") and a2() == '#7a45ee', a2())

        # ───────────────────────────── burbuja ─────────────────────────────
        print('Barra de pestañas: la burbuja (F-38)')
        ev("S.tab=0;R()")
        run()
        bub = lambda: ev("(b=>[parseFloat(b.style.getPropertyValue('--bx')),parseFloat(b.style.getPropertyValue('--bw'))])(document.querySelector('nav .nbb'))")
        off = lambda i: ev("(b=>[b.offsetLeft,b.offsetWidth])(document.querySelectorAll('nav button')[%d])" % i)
        check('la burbuja está bajo la pestaña abierta', ev("document.querySelector('nav').classList.contains('nbon')") and bub() == off(0), '%s %s' % (bub(), off(0)))
        check('los botones siguen siendo los cuatro primeros de la barra', ev("document.querySelector('nav button:nth-child(4)').dataset.i") == '3')
        check('la barra es solo de la app: tocar y arrastrar no desplaza la página', ev("getComputedStyle(document.querySelector('nav')).touchAction") == 'none')
        ev("A.tab(2)")
        run()
        check('al cambiar de pestaña, la burbuja va a la nueva', bub() == off(2))
        ev("A.tab(0)")
        run()
        x3, y = tab_center(3)
        v0 = ev('__vib')
        ev("window.__g=document.querySelectorAll('nav button')[3];__pe('pointerdown',__g,%f,%f)" % (x3, y))
        run(150)
        check('un toque corto no coge la burbuja', not ev("document.querySelector('nav').classList.contains('drag')"))
        run(200)
        check('mantener pulsado Perfil coge la burbuja (y en Android vibra)', ev("document.querySelector('nav').classList.contains('drag')") and ev('__vib') > v0)
        x1, _ = tab_center(1)
        hv = []
        for x in [x3 - 40, x3 - 90, x1 + 30, x1]:
            run(30)
            ev("__pe('pointermove',document.querySelector('nav'),%f,%f)" % (x, y))
            hv.append(ev("[...document.querySelectorAll('nav button')].findIndex(b=>b.classList.contains('hv'))"))
        bx = bub()[0]
        check('la burbuja sigue al dedo, y se marca la pestaña que queda debajo', abs(bx - (x1 - ev("document.querySelector('nav').getBoundingClientRect().left") - ev("document.querySelector('nav').clientLeft") - off(1)[1] / 2)) < 1.5 and hv[-1] == 1 and 2 in hv, '%s %s' % (bx, hv))
        check('al pasar por cada pestaña vibra un poco (Android)', ev('__vib') >= v0 + 3, str(ev('__vib') - v0))
        ev("__pe('pointerup',document.querySelector('nav'),%f,%f)" % (x1, y))
        run(400)
        check('al soltarla sobre Nutrición, se abre Nutrición', ev('S.tab') == 1 and not ev("document.querySelector('nav').classList.contains('drag')") and bub() == off(1))
        x0, _ = tab_center(0)
        x2, _ = tab_center(2)
        ev("window.__g=document.querySelectorAll('nav button')[0];__pe('pointerdown',__g,%f,%f)" % (x0, y))
        for x in [x0 + 20, x0 + 60, x2]:
            run(20)
            ev("__pe('pointermove',document.querySelector('nav'),%f,%f)" % (x, y))
        ev("__pe('pointerup',document.querySelector('nav'),%f,%f)" % (x2, y))
        run(400)
        check('deslizar el dedo por la barra (sin esperar) también la lleva: Dashboard', ev('S.tab') == 2)
        ev("window.__g=document.querySelectorAll('nav button')[2];__pe('pointerdown',__g,%f,%f)" % (x2, y))
        run(20)
        ev("__pe('pointermove',__g,%f,%f)" % (x2 + 2, y - 30))
        run(400)
        check('un movimiento hacia arriba no es arrastrar', not ev("document.querySelector('nav').classList.contains('drag')"))
        ev("__pe('pointerup',__g,%f,%f)" % (x2, y - 30))
        run()
        ev("window.__g=document.querySelectorAll('nav button')[2];__pe('pointerdown',__g,%f,%f)" % (x2, y))
        run(350)
        ev("__pe('pointermove',document.querySelector('nav'),%f,%f)" % (x0, y))
        ev("__pe('pointercancel',document.querySelector('nav'),%f,%f)" % (x0, y))
        run(400)
        check('si el sistema cancela el gesto, no cambia de pestaña y la burbuja vuelve', ev('S.tab') == 2 and bub() == off(2))
        ev("document.querySelectorAll('nav button')[3].click()")
        run()
        check('tocar una pestaña sigue funcionando', ev('S.tab') == 3 and bub() == off(3))
        ev("S.tab=0;R();A.go()")
        run()
        check('en el entreno no hay barra ni burbuja', ev("document.querySelector('nav').style.display") == 'none' and not ev("document.querySelector('nav').classList.contains('nbon')"))
        ev("W=null;localStorage.removeItem('ffw');R()")
        run(400)
        check('al salir, vuelve bajo su pestaña', ev("document.querySelector('nav').classList.contains('nbon')") and bub() == off(0))

        # ───────────────────────────── deslizar para volver ─────────────────────────────
        print('Deslizar para volver (F-37)')
        ev("S.tab=3;R();A.zaj();A.ajp(0,{dataset:{v:'tema'}})")
        run()
        blur = "(s=>s.backdropFilter||s.webkitBackdropFilter||'none')(getComputedStyle(document.querySelector('#sh .sp')))"
        glass = ev(blur)
        x0, y0 = gesture('#ajs .pgt', 140, 4, end=None)
        tr = ev("document.querySelector('#sh .sp').style.transform")
        check('la página sigue al dedo', tr == 'translateX(140px)', tr)
        # I-20: nada de negro mientras la página sigue al dedo
        check('mientras sigue al dedo va sin desenfoque de fondo ni transparencia (en iPhone, una capa con desenfoque que se mueve sale en negro)', 'blur' in glass and ev("document.documentElement.classList.contains('sliding')") and ev(blur) == 'none' and ev("getComputedStyle(document.querySelector('#sh .sp')).backgroundColor") == ev("(d=>{d.style.cssText='background:var(--bg)';document.body.appendChild(d);const c=getComputedStyle(d).backgroundColor;d.remove();return c})(document.createElement('div'))"), str([glass, ev(blur)]))
        below = ev("(u=>u?{t:u.querySelector('.pgt').textContent,inert:u.inert,hid:u.getAttribute('aria-hidden'),last:!u.nextElementSibling,first:document.querySelector('#sh .sp')!=u,anim:getComputedStyle(u.querySelector('.cd,.it,.sr')||u).animationName}:null)(document.querySelector('#sh .sp.spu'))")
        check('debajo de la subpágina se ve la página a la que se vuelve (Ajustes), no la pestaña', bool(below) and below['t'] == 'Ajustes' and below['first'] and title() == 'Tema y estilo', str(below))
        check('esa página es solo imagen: no se puede tocar, no la leen los lectores de pantalla y no repite su animación de entrada', bool(below) and below['inert'] and below['hid'] == 'true' and below['anim'] == 'none', str(below))
        ev("__pe('pointerup',__g,%f,%f)" % (x0 + 140, y0 + 4))
        run(300)
        check('soltando pasada la cuarta parte, vuelve: de «Tema y estilo» a Ajustes', title() == 'Ajustes' and ev("document.querySelector('#sh .sp').style.transform") == '', title())
        check('y queda la página de verdad, tal cual se veía debajo (sin animación de entrada ni fundido)', ev("!document.querySelector('#sh .spu') && document.querySelectorAll('#sh .sp').length==1 && !document.documentElement.classList.contains('sliding') && document.querySelector('#sh .sp').classList.contains('still')") and ev("getComputedStyle(document.querySelector('#sh .sp .sr')).animationName") == 'none' and 'blur' in ev(blur))
        ev("document.querySelector('#sh .sp').scrollTop=160")
        y1 = ev("document.querySelector('#sh .sp').scrollTop")
        ev("A.ajp(0,{dataset:{v:'tema'}})")
        run()
        check('una subpágina se abre arriba del todo, con sus animaciones de entrada', ev("document.querySelector('#sh .sp').scrollTop") == 0 and not ev("document.querySelector('#sh .sp').classList.contains('still')"))
        ev("document.querySelector('#sh .sp [aria-label=Volver]').click()")
        run()
        check('al volver con «←», la página de antes queda en el punto en que se dejó', title() == 'Ajustes' and y1 > 0 and ev("document.querySelector('#sh .sp').scrollTop") == y1, str([y1, ev("document.querySelector('#sh .sp').scrollTop")]))
        ev("A.ajp(0,{dataset:{v:'tema'}})")
        run()
        x0, y0 = gesture('#ajs .pgt', 120, 0, end=None)
        check('y deslizando se ve debajo en ese mismo punto', ev("(u=>u?u.scrollTop:-1)(document.querySelector('#sh .sp.spu'))") == y1)
        ev("__pe('pointerup',__g,%f,%f)" % (x0 + 120, y0))
        run(300)
        check('donde queda al soltar', title() == 'Ajustes' and ev("document.querySelector('#sh .sp').scrollTop") == y1)
        ev("document.querySelector('#sh .sp').scrollTop=0;A.ajp(0,{dataset:{v:'tema'}})")
        run()
        gesture('#ajs .pgt', 60, 0, steps=6, ms=60)
        check('un gesto corto y lento no vuelve: la página regresa a su sitio', title() == 'Tema y estilo' and ev("document.querySelector('#sh .sp').style.transform") == '')
        check('y la página de debajo se quita', ev("!document.querySelector('#sh .spu') && !document.documentElement.classList.contains('sliding')"))
        gesture('#ajs .pgt', 50, 0, steps=2, ms=5)
        check('un gesto corto pero rápido sí vuelve', title() == 'Ajustes')
        ev("A.ajp(0,{dataset:{v:'tema'}})")
        run()
        gesture('#ajs .pgt', 70, 0, steps=3, ms=5, pause=300)
        check('si el dedo se para antes de soltar, cuenta lo recorrido (no vuelve)', title() == 'Tema y estilo')
        gesture('#ajs .pgt', 20, -220)
        check('deslizar hacia arriba o abajo es desplazar la página, no volver', title() == 'Tema y estilo')
        gesture('#ajs .pgt', -200, 0)
        check('de derecha a izquierda no hace nada', title() == 'Tema y estilo')
        gesture('#ajs input[data-c=rm]', 220, 0)
        check('no empieza en un campo (casillas, textos…)', title() == 'Tema y estilo')
        ev("document.querySelector('#ajs .pgt').insertAdjacentHTML('afterend','<div id=\"hsx\" style=\"overflow-x:auto;white-space:nowrap\"><span style=\"display:inline-block;width:900px\">fila que se desplaza de lado</span></div>')")
        gesture('#hsx span', 220, 0)
        check('ni en una fila que se desplaza de lado (ese gesto es suyo)', title() == 'Tema y estilo')
        check('las páginas de dentro dejan el gesto de lado para la app', 'pan-y' in ev("getComputedStyle(document.querySelector('#sh .sp')).touchAction"))
        gesture('#ajs .pgt', 220, 0)
        x0, y0 = gesture('#ajs .pgt', 120, 0, end=None)
        check('una página de primer nivel (Ajustes) no lleva otra debajo: se ve su pestaña', title() == 'Ajustes' and ev("!document.querySelector('#sh .spu')"))
        ev("__pe('pointerup',__g,%f,%f)" % (x0 + 120, y0))
        run(300)
        check('y desde Ajustes, otro deslizamiento la cierra', not ev("!!document.querySelector('#sh .sp')") and ev('S.tab') == 3)
        gesture('#app', 220, 0)
        check('en las pestañas principales no hace nada', ev('S.tab') == 3 and ev("document.querySelector('#app').style.left") == '')
        ev("S.tab=1;R();A.add(0)")
        run()
        gesture('#sh .sp', 220, 0)
        check('una ventana de abajo (añadir alimento) se cierra', not ev("!!document.querySelector('#sh .sp')"))
        ev("A.menu()")
        run()
        x0, y0 = gesture('#mn .mti', 120, 0, end=None)
        check('el menú lateral sigue al dedo', ev("document.querySelector('#mn .msd').style.transform") == 'translateX(120px)')
        ev("__pe('pointerup',__g,%f,%f)" % (x0 + 120, y0))
        run(300)
        check('y se cierra', ev("document.getElementById('mn').innerHTML") == '')
        ev("S.tab=0;R();A.zov()")
        run()
        gesture('#app .hero h2', 220, 0)
        check('Overview vuelve al Workout', not ev("!!document.querySelector('#app [data-a=zovb]')") and ev("!!document.querySelector('#app [data-a=zov]')") and ev("document.querySelector('#app').style.left") == '')
        ev("S.tab=2;R();A.zwv()")
        run()
        gesture('#app .hd h1', 220, 0)
        check('Evolución del peso vuelve al Dashboard', ev('weightView') == 0 and ev('S.tab') == 2)
        ev("S.tab=0;R();A.go()")
        run()
        gesture('#app', 220, 0)
        check('durante el entreno no hace nada', ev('!!W'))
        ev("W=null;localStorage.removeItem('ffw');R()")
        ev("S.tab=3;R();A.zaj();confirmDialog('¿Seguro?','Prueba','zno','Vale')")
        run()
        gesture('#dg .dgc', 220, 0)
        check('sobre una ventana de aviso no hace nada', ev("!!document.querySelector('#dg .dgc')") and title() == 'Ajustes')
        ev("document.getElementById('dg').innerHTML='';S.rm=1;R();A.ajp(0,{dataset:{v:'tema'}})")
        run()
        x0, y0 = gesture('#ajs .pgt', 220, 0, end=None)
        ev("__pe('pointerup',__g,%f,%f)" % (x0 + 220, y0))
        run(20)
        check('con «Reducir animaciones», vuelve al momento', title() == 'Ajustes')
        ev("S.rm=0;R();A.cl()")
        run()

        # ───────────────────────────── atrás del sistema ─────────────────────────────
        print('«Atrás» del sistema: botón o gesto de Android (F-39)')
        ev("S.tab=0;R()")
        run()
        check('en Workout, sin nada abierto, «atrás» sale de la app (no hay entrada de más)', not ev("!!(history.state&&history.state.sf)"))
        ev("A.zaj()")
        run()
        check('con una página abierta sí la hay', ev("!!(history.state&&history.state.sf)"))
        ev("A.ajp(0,{dataset:{v:'tema'}})")
        run()
        back()
        check('«atrás» en una subpágina de Ajustes vuelve a Ajustes', title() == 'Ajustes')
        back()
        check('y otra vez, la cierra (sin salir de la app)', not ev("!!document.querySelector('#sh .sp')") and not ev("!!(history.state&&history.state.sf)"))
        ev("A.rst()")
        run()
        back()
        check('una ventana de aviso se cierra sin hacer nada (aquí, «Borrar todos los datos»)', ev("document.getElementById('dg').innerHTML") == '' and ev('S.tour') == 1)
        ev("A.menu()")
        run()
        back()
        check('el menú lateral se cierra', ev("document.getElementById('mn').innerHTML") == '')
        ev("A.tab(2)")
        run()
        back()
        check('en otra pestaña, «atrás» lleva a Workout', ev('S.tab') == 0 and not ev("!!(history.state&&history.state.sf)"))
        ev("A.go()")
        run()
        back()
        check('durante el entreno no sale: lo avisa y el entreno sigue', ev('!!W') and 'El entreno sigue' in ev("document.getElementById('tt').textContent") and ev("!!(history.state&&history.state.sf)"))
        ev("W=null;localStorage.removeItem('ffw');S.tab=0;saveState();R();A.zaj()")
        run()
        reload()
        check('tras recargar con una página abierta (al actualizar, al restaurar una copia…), esa entrada pasa a ser la normal', not ev("!!(history.state&&history.state.sf)") and not ev("!!document.querySelector('#sh .sp')"), str(ev("[JSON.stringify(history.state),backTarget()&&backTarget().k,S.tab]")))
        ev("A.zaj()")
        run()
        back()
        check('y «atrás» sigue cerrando lo que se abre después', not ev("!!document.querySelector('#sh .sp')") and not ev("!!(history.state&&history.state.sf)"))

        # ───────────────────────────── recorrido ─────────────────────────────
        print('Recorrido de la primera vez (F-36)')
        ev("delete S.tour;saveState()")
        reload()
        run(9000)
        check('la primera vez, cuando la app está libre (tras la primera sincronización), sale la bienvenida', ev("!!document.querySelector('#tour.trs')"), ev('syncState().st'))
        texts = ev("[document.querySelector('#tour h3').textContent,document.querySelector('#tour p').textContent,...[...document.querySelectorAll('#tour button')].map(b=>b.textContent)]")
        check('pregunta si se quiere empezar u omitir (textos de la simulación validada)', texts == ['Te damos la bienvenida a StrataFit', '¿Te enseñamos lo principal? Son 5 pasos y menos de un minuto.', 'Empezar el recorrido', 'Omitir'], str(texts))
        ev("document.querySelector('#tour .bk').click()")
        run()
        check('tocar fuera no la cierra', ev("!!document.querySelector('#tour.trs')"))
        back()
        check('«atrás» es «Omitir»: se cierra y queda visto', ev("!document.getElementById('tour') && S.tour===1"))
        reload()
        run(9000)
        check('y no vuelve a salir', not ev("!!document.getElementById('tour')"))
        ev("delete S.tour;S.tab=2;saveState()")
        reload()
        run(9000)
        ev("document.querySelector('#tour [data-a=trs]').click()")
        run()
        check('«Empezar el recorrido» también lo da por visto', ev('S.tour') == 1)
        steps = [(0, 'Tu entreno de hoy', "document.querySelector('#app .cd.hero')"), (0, 'Cambia de pestaña', "document.querySelector('nav')"),
                 (1, 'Anota lo que comes', "document.querySelector('#app .mlb').closest('.cd')"), (2, 'Mira tu progreso', "document.querySelector('#app .wkc')"),
                 (3, 'Tu perfil', "document.querySelector('#app [data-a=f2lg]')")]
        for k, (tb, tt, el) in enumerate(steps):
            run(400)
            o = ev("""(()=>{const t=%s,r=t.getBoundingClientRect(),s=document.querySelector('#tour .trsp').style,p=document.querySelector('#tour .trtp');
              const l=parseFloat(s.left),tp=parseFloat(s.top),w=parseFloat(s.width),h=parseFloat(s.height);
              return {st:document.querySelector('#tour .trst').textContent,t:document.querySelector('#tour .trtp b').textContent,tab:S.tab,
                on:[...document.querySelectorAll('#tour .trdt i')].findIndex(i=>i.classList.contains('on')),
                inside:l<=r.left+.5&&tp<=r.top+.5&&l+w>=r.right-.5&&tp+h>=r.bottom-.5,clear:p.offsetTop+p.offsetHeight<=r.top+1||p.offsetTop>=r.bottom-1,
                seen:r.top>=0&&r.bottom<=innerHeight,next:document.querySelector('#tour [data-a=trn]').textContent,skip:!!document.querySelector('#tour [data-a=trx]'),
                free:![...document.getElementById('app').children].some(e=>getComputedStyle(e).position=='sticky'&&!e.contains(t)&&(q=>q.bottom>r.top+1&&q.top<r.bottom-1)(e.getBoundingClientRect()))}})()""" % el)
            check('paso %d: «%s», en su pestaña, iluminado y con la tarjeta al lado' % (k + 1, tt), o['st'] == 'Paso %d de 5' % (k + 1) and o['t'] == tt and o['tab'] == tb and o['on'] == k and o['inside'] and o['clear'] and o['seen'] and o['free'] and o['skip'] and o['next'] == ('Terminar' if k == 4 else 'Siguiente'), str(o))
            if k == 1:
                check('en el paso de las pestañas se puede probar la barra', int(ev("getComputedStyle(document.querySelector('nav')).zIndex")) > int(ev("getComputedStyle(document.getElementById('tour')).zIndex")))
                ev("document.querySelectorAll('nav button')[2].click()")
                run()
                check('(tocar una pestaña la abre y el recorrido sigue en su paso)', ev('S.tab') == 2 and ev("document.querySelector('#tour .trst').textContent") == 'Paso 2 de 5')
            ev("document.querySelector('#tour [data-a=trn]').click()")
        run()
        texts = ev("[document.querySelector('#tour h3').textContent,document.querySelector('#tour p').textContent,document.querySelector('#tour button').textContent]")
        check('al final, «¡Listo!» con «Empezar a entrenar», sobre Workout', texts[0] == '¡Listo!' and texts[2] == 'Empezar a entrenar' and 'Ya conoces lo principal' in texts[1] and ev('S.tab') == 0, str(texts))
        ev("document.querySelector('#tour [data-a=trd]').click()")
        run()
        check('que cierra el recorrido en Workout', not ev("!!document.getElementById('tour')") and ev('S.tab') == 0 and not ev("document.querySelector('nav').classList.contains('trlv')"))
        pg.set_viewport_size({'width': 320, 'height': 568})
        ev("S.meals[dayKey(new Date())]={0:[{n:'Arroz',g:150,b:[130,28,2.7,.3,0,0]},{n:'Pollo',g:180,b:[165,0,31,3.6,0,0]}]};saveState();S.tab=0;R();A.trgo();A.trn();A.trn()")
        run(400)
        o = ev("""(()=>{const t=document.querySelector('#app .mlb'),r=t.getBoundingClientRect(),s=document.querySelector('#tour .trsp').style,p=document.querySelector('#tour .trtp');
          const l=parseFloat(s.left),tp=parseFloat(s.top),w=parseFloat(s.width),h=parseFloat(s.height);
          return {st:document.querySelector('#tour .trst').textContent,inside:l<=r.left+.5&&tp<=r.top+.5&&l+w>=r.right-.5&&tp+h>=r.bottom-.5,seen:tp>=0&&tp+h<=innerHeight,
            clear:p.offsetTop+p.offsetHeight<=tp+1||p.offsetTop>=tp+h-1,
            free:![...document.getElementById('app').children].some(e=>getComputedStyle(e).position=='sticky'&&!e.contains(t)&&(q=>q.bottom>tp+1&&q.top<tp+h-1)(e.getBoundingClientRect()))}})()""")
        check('en un iPhone pequeño (320 × 568), con comidas, el paso de Nutrición ilumina sus botones y se ve entero, sin taparlo el resumen pegado arriba', o['st'] == 'Paso 3 de 5' and o['inside'] and o['seen'] and o['clear'] and o['free'], str(o))
        ev("A.trx();delete S.meals[dayKey(new Date())];saveState()")
        pg.set_viewport_size({'width': 390, 'height': 844})
        run()
        rest = ev("(()=>{for(let i=0;i<7;i++){S.sl=i;R();if(document.querySelector('#app .cd.hero [data-a=rd]'))return i}return -1})()")
        ev("A.trgo()")
        run()
        check('un día de descanso, el primer paso lo dice', rest < 0 or ev("document.querySelector('#tour .trtp p').textContent").startswith('Hoy toca descansar'))
        ev("A.trx()")
        ev("S.sl=0;R();S.tab=3;R();A.zaj()")
        run()
        check('Ajustes → «Ver el recorrido»', ev("!!document.querySelector('#ajs .sr[data-a=trgo]')"))
        ev("document.querySelector('#ajs .sr[data-a=trgo]').click()")
        run()
        check('lo abre en el primer paso, sin preguntar, y cierra Ajustes', ev("document.querySelector('#tour .trst').textContent") == 'Paso 1 de 5' and not ev("!!document.querySelector('#sh .sp')") and ev('S.tab') == 0)
        ev("document.querySelector('#tour [data-a=trx]').click()")
        run()
        check('«Omitir» vuelve a donde se estaba (Perfil)', not ev("!!document.getElementById('tour')") and ev('S.tab') == 3 and ev('S.tour') == 1)
        ev("delete S.tour;S.tab=0;R();A.go()")
        run()
        ev("tourCheck()")
        run(1500)
        check('no sale durante un entreno', not ev("!!document.getElementById('tour')"))
        ev("W=null;localStorage.removeItem('ffw');R();confirmDialog('¿Seguro?','Prueba','zno','Vale')")
        run(1500)
        check('ni sobre una ventana de aviso', not ev("!!document.getElementById('tour')"))
        ev("document.getElementById('dg').innerHTML=''")
        run(1500)
        check('en cuanto se cierra, sale', ev("!!document.querySelector('#tour.trs')"))
        ev("A.trx()")
        run()

        # ───────────────────────────── accesos directos y globo ─────────────────────────────
        print('Accesos directos del icono y globo del icono (F-39)')
        man = json.load(open(os.path.join(ROOT, 'static', 'manifest.webmanifest'), encoding='utf-8'))
        sc = [(s.get('name'), s.get('url')) for s in man.get('shortcuts', [])]
        check('el manifiesto tiene 3 accesos directos (Entreno de hoy, Nutrición de hoy y Registrar el peso)', sc == [('Entreno de hoy', './?a=entreno'), ('Nutrición de hoy', './?a=comida'), ('Registrar el peso', './?a=peso')], str(sc))
        for a, tb, wv in [('peso', 2, 1), ('comida', 1, 0), ('entreno', 0, 0), ('otra', 0, 0)]:
            ev("S.tab=0;saveState()")
            pg.goto(url + '?a=' + a)
            run(1500)
            check('?a=%s abre %s y deja limpia la dirección' % (a, {'peso': 'Evolución del peso', 'comida': 'Nutrición', 'entreno': 'Workout', 'otra': 'la app (no existe: se ignora)'}[a]), ev('S.tab') == tb and ev('weightView') == wv and ev('location.search') == '', '%s %s %s' % (ev('S.tab'), ev('weightView'), ev('location.search')))
        ev("S.tab=0;R();A.go()")
        run()
        pg.goto(url + '?a=peso')
        run(1500)
        check('con un entreno a medias, un acceso directo abre Workout para seguirlo', ev('S.tab') == 0 and 'ENTRENO EN CURSO' in ev("document.getElementById('app').textContent") and ev('location.search') == '')
        ev("localStorage.removeItem('ffw')")
        pg.goto(url)
        run(1500)
        ev("S.tab=3;R();A.zaj();A.ajp(0,{dataset:{v:'sonido'}})")
        run()
        check('Ajustes → Sonido y avisos: «Globo en el icono de la app» (donde el sistema lo permite)', ev("!!document.querySelector('#ajs input[data-c=bdg]')"))
        ev("__nwant='denied';(e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector('#ajs input[data-c=bdg]'))")
        run()
        check('sin permiso de avisos (iPhone), se queda apagado y lo explica', not ev('S.bdg') and not ev("document.querySelector('#ajs input[data-c=bdg]').checked") and 'permite los avisos' in ev("document.getElementById('tt').textContent"))
        ev("__nperm='default';__nwant='granted';(e=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector('#ajs input[data-c=bdg]'))")
        run()
        check('con permiso, se activa', ev('S.bdg') == 1)
        ev("S.wr={n:1,u:'d',t:Date.now()-5*864e5};S.wl=[{d:'2026-11-01',w:80}];S.rp=[];saveState();__vis='hidden';document.dispatchEvent(new Event('visibilitychange'))")
        run()
        check('al salir de la app, el icono enseña el pesaje de hoy (1)', ev('__badge[__badge.length-1]') == 1, str(ev('__badge')))
        ev("__vis='visible';document.dispatchEvent(new Event('visibilitychange'));S.rp=[{id:'prueba-1',k:'f',a:'Otro',t:'La gráfica no se ve bien',ca:Date.now(),s:1,st:'a',rp:'Arreglado',ra:Date.now(),sn:0}];saveState();__vis='hidden';document.dispatchEvent(new Event('visibilitychange'))")
        run()
        check('y también las respuestas nuevas a tus fallos y sugerencias (2)', ev('__badge[__badge.length-1]') == 2, str(ev('__badge')))
        ev("__vis='visible';document.dispatchEvent(new Event('visibilitychange'));(e=>{e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}))})(document.querySelector('#ajs input[data-c=bdg]'))")
        run()
        check('al apagarlo, el globo se quita', ev('S.bdg') == 0 and ev('__badge[__badge.length-1]') == 0)
        ev("delete S.wr;S.rp=[];A.cl();saveState()")

        # ───────────────────────────── toques de verdad ─────────────────────────────
        if os.environ.get('SF_BROWSER', 'chromium') == 'chromium':
            print('Con toques de verdad, como en Chrome de Android (captura del dedo, touch-action y desplazamiento nativo)')
            cdp = c.new_cdp_session(pg)

            def touch(kind, x=0, y=0):
                cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}]})

            ev("S.tab=0;R()")
            run()
            x3, y = tab_center(3)
            x2, _ = tab_center(2)
            x1, _ = tab_center(1)
            touch('touchStart', x2, y)
            run(40)
            touch('touchEnd')
            pg.wait_for_timeout(150)
            run(300)
            check('un toque en Dashboard lo abre', ev('S.tab') == 2)
            # Chrome no da por toque uno que llega justo detrás de otro (en tiempo real): se espera como lo haría el dedo
            pg.wait_for_timeout(600)
            touch('touchStart', x3, y)
            run(320)
            for i in range(1, 9):
                run(30)
                touch('touchMove', x3 + (x1 - x3) * i / 8, y)
            touch('touchEnd')
            run(400)
            check('mantener pulsado Perfil y arrastrar la burbuja hasta Nutrición la abre', ev('S.tab') == 1)
            ev("S.tab=3;R();A.zaj();A.ajp(0,{dataset:{v:'tema'}})")
            run()
            pg.wait_for_timeout(450)
            tx, ty = at('#ajs .pgt')
            touch('touchStart', tx, ty)
            for i in range(1, 11):
                run(16)
                touch('touchMove', tx + 22 * i, ty + 2)
            touch('touchEnd')
            run(400)
            check('deslizar el dedo de izquierda a derecha vuelve a Ajustes', title() == 'Ajustes')
            ev("A.ajp(0,{dataset:{v:'privacidad'}})")
            run()
            pg.wait_for_timeout(450)
            tx, ty = at('#ajs .srt p')
            touch('touchStart', tx, ty)
            for i in range(1, 11):
                run(16)
                touch('touchMove', tx + 3 * i, ty - 30 * i)
            touch('touchEnd')
            pg.wait_for_timeout(300)
            run(400)
            check('deslizar hacia arriba desplaza la página con normalidad y no vuelve', title() == 'Privacidad' and ev("document.querySelector('#sh .sp').scrollTop") > 50, str(ev("document.querySelector('#sh .sp').scrollTop")))
            ev("A.cl()")
            run()
        else:
            print('(toques de verdad: solo con Chromium, que los simula por CDP; en Safari van los eventos de puntero de arriba)')
        check('sin errores de JS', not errs, str(errs[:3]))
        c.close()

        # ───────────────────────────── descargas con la app instalada ─────────────────────────────
        print('Descargas al móvil con la app instalada (T-06: F-26, F-30 y F-25)')
        c2 = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', **context_opts(path))
        c2.add_init_script(rd('init.js'))
        c2.add_init_script(STANDALONE)
        p2 = c2.new_page()
        errs2 = []
        p2.on('pageerror', lambda e: errs2.append(str(e)[:200]))
        p2.clock.install(time=datetime.datetime(2026, 11, 4, 10, 0, 0))
        p2.goto(url)
        p2.clock.run_for(1500)
        p2.clock.pause_at(datetime.datetime(2026, 11, 4, 10, 0, 10))
        e2 = p2.evaluate
        r2 = lambda ms=400: p2.clock.run_for(ms)
        e2(SEED)

        def shared(js, ms=1500):
            n = e2('__shared.length')
            e2(js)
            for _ in range(ms // 100):
                r2(100)
                p2.wait_for_timeout(20)
                if e2('__shared.length') > n:
                    break
            r2(200)
            return e2('__shared[__shared.length-1]') if e2('__shared.length') > n else None

        check('la app se ve instalada (pantalla de inicio)', e2('navigator.standalone === true'))
        e2("S.tab=3;R();A.zaj();A.zbk()")
        r2()
        f = shared("document.querySelector('[data-a=bkf]').click()")
        check('copia de seguridad: se guarda con «Compartir», siempre con el mismo nombre', bool(f) and f['n'] == 'StrataFit-copia.json' and f['t'] == 'application/json' and f['h'].startswith('{') and 'Copia guardada' in e2("document.getElementById('tt').textContent"), str(f))
        e2("A.cl();A.ana()")
        r2()
        f = shared("document.querySelector('[data-a=anpdf]').click()", 4000)
        check('análisis mensual: el PDF se guarda con «Compartir»', bool(f) and f['n'] == 'StrataFit-analisis-2026-10.pdf' and f['t'] == 'application/pdf' and f['h'].startswith('%PDF-') and f['s'] > 2000, str(f))
        e2("A.cl();S.wr={n:2,u:'w',t:Date.now()};S.tab=2;R();A.zwv()")
        r2()
        f = shared("document.querySelector('[data-a=wrcal]').click()")
        check('recordatorio de pesaje: el evento del calendario se guarda con «Compartir»', bool(f) and f['n'] == 'StrataFit-pesaje.ics' and f['t'] == 'text/calendar' and f['h'].startswith('BEGIN:VCALENDAR'), str(f))
        e2("__abort=1;A.cl();A.zbk()")
        r2()
        pv = e2('S.bkd')
        shared("document.querySelector('[data-a=bkf]').click()")
        check('si se cancela «Compartir», no da error y no cuenta como guardada', 'No se guardó la copia' in e2("document.getElementById('tt').textContent") and e2('S.bkd') == pv)
        check('sin errores de JS', not errs2, str(errs2[:3]))
        c2.close()

        # ───────────────────────────── «atrás» en iPhone ─────────────────────────────
        print('En iPhone y iPad no hay entrada de más en el historial (I-20)')
        c3 = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark', user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1', **context_opts(path))
        c3.add_init_script(rd('init.js'))
        c3.add_init_script(PTR)
        c3.add_init_script(STANDALONE)
        p3 = c3.new_page()
        errs3 = []
        p3.on('pageerror', lambda e: errs3.append(str(e)[:200]))
        p3.clock.install(time=datetime.datetime(2026, 11, 4, 10, 0, 0))
        p3.goto(url)
        p3.clock.run_for(1500)
        p3.clock.pause_at(datetime.datetime(2026, 11, 4, 10, 0, 10))
        e3 = p3.evaluate
        r3 = lambda ms=400: p3.clock.run_for(ms)
        n0 = e3('history.length')
        e3("S.tab=3;R();A.zaj();A.ajp(0,{dataset:{v:'tema'}})")
        r3()
        check('con una página abierta, el historial sigue igual: el gesto «atrás» del iPhone no tiene a dónde volver (y no enseña una pantalla en negro)', e3('history.length') == n0 and not e3("!!(history.state&&history.state.sf)"), str([n0, e3('history.length')]))
        e3("(e=>{window.__g=e;const r=e.getBoundingClientRect();window.__gx=r.left+r.width/2;window.__gy=r.top+r.height/2;__pe('pointerdown',e,__gx,__gy)})(document.querySelector('#ajs .pgt'))")
        for i in range(1, 9):
            r3(40)
            e3("__pe('pointermove',__g,__gx+%d,__gy)" % (25 * i))
        e3("__pe('pointerup',__g,__gx+200,__gy)")
        r3(300)
        check('la página se desliza con el dedo, con el gesto de la app, y vuelve a Ajustes', e3("document.querySelector('#ajs .pgt').textContent") == 'Ajustes' and e3('history.length') == n0)
        e3("A.cl();S.tab=0;R();A.go()")
        r3()
        check('durante el entreno tampoco hay entrada de más: el gesto del iPhone ya no funde la pantalla a negro', e3('!!W') and e3('history.length') == n0 and not e3("!!(history.state&&history.state.sf)"))
        check('sin errores de JS', not errs3, str(errs3[:3]))
        c3.close()
        b.close()
    print('\n%d fallos' % len(fails) if fails else '\nTodo correcto')
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/stratafit.html')
