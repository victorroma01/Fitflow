"""Prueba del paquete instalable (dist/app) servido por HTTP: cabecera fija, manifiesto, service worker,
arranque sin conexión, aviso de versión nueva, copia de seguridad desde la app instalada y aviso de «Añadir a inicio».

  python3 tests/deploy.py dist/app
Requiere:  pip install playwright  &&  playwright install chromium
"""
import os, sys, re, json, shutil, tempfile, threading, functools, http.server
from playwright.sync_api import sync_playwright
from browser import launch, app_url

fails = []


def check(name, cond, info=''):
    if not cond:
        fails.append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'max-age=600')  # como GitHub Pages: el SW debe saltarse la caché HTTP
        super().end_headers()

    def log_message(self, *a):
        pass


def main(app):
    site = tempfile.mkdtemp(prefix='sf_site_')
    shutil.copytree(os.path.abspath(app), os.path.join(site, 'fitflow'))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=site))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = 'http://localhost:%d/fitflow/' % srv.server_address[1]
    idx = os.path.join(site, 'fitflow', 'index.html')
    try:
        with sync_playwright() as p:
            b = launch(p)
            c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark')
            pg = c.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
            pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:200]) if m.type == 'error' else None)
            pg.goto(url)
            pg.wait_for_timeout(1500)
            ev = pg.evaluate
            check('arranca', ev('!!window.__ffok'))
            check('modo paquete (FFDEP=1)', ev('FFDEP===1&&updatesOn===1'))
            check('un solo manifiesto, el estático', ev("[...document.querySelectorAll('link[rel=manifest]')].map(l=>l.getAttribute('href')).join()") == 'manifest.webmanifest')
            check('un solo icono de inicio, el estático', ev("[...document.querySelectorAll('link[rel=apple-touch-icon]')].map(l=>l.getAttribute('href')).join()") == 'icon-180.png')
            check('metas de app instalable sin duplicar', ev("document.querySelectorAll('meta[name=apple-mobile-web-app-capable]').length") == 1)
            m = ev("fetch('manifest.webmanifest').then(r=>r.json()).then(j=>[j.start_url,j.display,j.icons.length])")
            check('manifiesto válido', m == ['./', 'standalone', 3], str(m))
            ev("navigator.serviceWorker.ready.then(()=>1)")
            pg.reload()
            pg.wait_for_timeout(1200)
            check('service worker controla la página', ev('!!navigator.serviceWorker.controller'))
            cached = ev("caches.keys().then(k=>Promise.all(k.map(n=>caches.open(n).then(c=>c.keys()).then(r=>r.map(x=>x.url.split('/fitflow/')[1]))))).then(a=>a.flat())")
            need = ['index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', '']
            check('precarga completa', all(n in cached for n in need), str(cached))
            assets = ev("[...new Set([...document.documentElement.outerHTML.matchAll(/(?:src=\"|url\\()((?:img)\\/[^\"')]+)/g)].map(m=>m[1]))]")
            # sin conexión
            c.set_offline(True)
            pg.reload()
            pg.wait_for_timeout(1200)
            check('abre sin conexión', ev("document.querySelector('#app').innerText.length>50"))
            pend = ev("(async()=>{const c=await caches.open((await caches.keys())[0]);const out=[];for(const u of %s){if(!(await c.match(u,{ignoreSearch:true})))out.push(u)}return out})()" % repr(assets))
            check('imágenes en caché para usar sin conexión', not pend, str(pend[:5]))
            c.set_offline(False)
            check('instalación nueva: no enseña novedades', ev("!document.getElementById('upd')"))
            vj = os.path.join(site, 'fitflow', 'version.json')
            vj0 = open(vj, encoding='utf-8').read()
            check('version.json publicado con la versión de la app', json.loads(vj0)['version'] == ev('APPV'))
            # Ajustes → Comprobar actualizaciones, sin versión nueva
            ev("S.tab=3;R();document.querySelectorAll('details').forEach(d=>d.open=true)")
            pg.click('[data-a=updChk]')
            pg.wait_for_timeout(800)
            check('Comprobar actualizaciones: «Tienes la última versión»', ev("/Tienes la última versión/.test(document.body.innerText)"))

            def publish(ver, items, index=True):
                if index:
                    open(idx, 'w', encoding='utf-8').write(re.sub(r"(const APPV\s*=\s*')[^']+'", "\\g<1>" + ver + "'", t, count=1))
                e = {'version': ver, 'date': '2026-12-01', 'sections': [{'title': 'Novedades', 'items': items}]}
                open(vj, 'w', encoding='utf-8').write(json.dumps(dict(e, history=[e, json.loads(vj0)])))

            # versión nueva publicada: la app abre la copia guardada al momento y avisa con la tarjeta de novedades
            t = open(idx, encoding='utf-8').read()
            v0 = re.search(r"const APPV\s*=\s*'([^']+)'", t).group(1)
            publish('9.9.9', ['Prueba de novedades'])
            pg.reload()
            pg.wait_for_load_state('load')
            try:
                pg.wait_for_selector('#upd.update .updk', timeout=10000)
            except Exception:
                pass
            print('   (aviso tras %s ms)' % ev("Math.round(performance.now())"))
            check('abre al instante con la versión guardada', ev('APPV') == v0, ev('APPV'))
            check('aparece el aviso de versión nueva', ev("!!document.querySelector('#upd.update .updk')"))
            card = ev("""(()=>{const k=document.querySelector('#upd .updk'),b=k&&k.querySelector('.upb'),cs=x=>getComputedStyle(x);if(!k)return null;
              return {title:k.querySelector('h3').textContent,text:k.innerText,bg:cs(k).backgroundColor,fg:cs(k).color,
                      bbg:cs(b).backgroundColor,a1:getComputedStyle(document.documentElement).getPropertyValue('--a1').trim(),bfg:cs(b).color,up:cs(b).textTransform,label:b.innerText}})()""")
            check('titulado con la versión nueva', bool(card) and card['title'] == 'Versión 9.9.9', str(card and card['title']))
            check('enseña las novedades', bool(card) and 'Prueba de novedades' in card['text'])
            check('tarjeta negra con letra blanca', bool(card) and card['bg'] == 'rgb(0, 0, 0)' and card['fg'] == 'rgb(255, 255, 255)', str(card and (card['bg'], card['fg'])))
            a1 = ev("(()=>{const d=document.createElement('i');d.style.color=getComputedStyle(document.documentElement).getPropertyValue('--a1');document.body.appendChild(d);const c=getComputedStyle(d).color;d.remove();return c})()")
            check('botón Actualizar del color del tema, letra negra y mayúsculas', bool(card) and card['bbg'] == a1 and card['bfg'] == 'rgb(0, 0, 0)' and card['label'] == 'ACTUALIZAR', str(card and (card['bbg'], a1, card['bfg'], card['label'])))
            with pg.expect_navigation():
                pg.click('#upd .upb')
            pg.wait_for_load_state('load')
            pg.wait_for_timeout(1200)
            check('«Actualizar» carga la versión nueva', ev('APPV') == '9.9.9', ev('APPV'))
            check('tras actualizar no repite las novedades ya vistas', ev("!document.getElementById('upd')"))
            # Comprobar actualizaciones cuando hay una versión nueva en el servidor
            publish('9.9.10', ['Otra mejora'], index=False)
            ev("S.tab=3;R();document.querySelectorAll('details').forEach(d=>d.open=true)")
            pg.click('[data-a=updChk]')
            pg.wait_for_timeout(800)
            check('Comprobar actualizaciones encuentra la versión nueva', ev("document.querySelector('#upd h3')&&document.querySelector('#upd h3').textContent") == 'Versión 9.9.10')
            pg.click('#upd .updx')
            pg.wait_for_timeout(200)
            check('el aviso se puede cerrar', ev("!document.getElementById('upd')"))
            # tras actualizar desde una versión antigua (sin haber visto el aviso): novedades una sola vez
            ev("localStorage.setItem('ffver','1.0.0');localStorage.removeItem('ffseen')")
            pg.reload()
            pg.wait_for_load_state('load')
            pg.wait_for_timeout(1500)
            news = ev("(()=>{const k=document.querySelector('#upd.news .updk');return k?{title:k.querySelector('h3').textContent,btn:k.querySelector('.upb').innerText}:null})()")
            check('tras actualizar enseña las novedades de la versión', bool(news) and news['title'].startswith('Versión ') and news['btn'] == 'ENTENDIDO', str(news))
            if news:
                pg.click('#upd .upb')
                pg.wait_for_timeout(200)
            pg.reload()
            pg.wait_for_load_state('load')
            pg.wait_for_timeout(1500)
            check('y solo una vez', ev("!document.getElementById('upd')"))
            open(idx, 'w', encoding='utf-8').write(t)
            open(vj, 'w', encoding='utf-8').write(vj0)
            # app instalada: compartir copia de seguridad
            c2 = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
            c2.add_init_script("Object.defineProperty(navigator,'standalone',{get:()=>true});window.__sh=null;navigator.canShare=()=>true;"
                               "navigator.share=async d=>{if(window.__abort){const e=new Error('x');e.name='AbortError';throw e}window.__sh=[d.files[0].name,d.files[0].size>100,d.files[0].type]}")
            p2 = c2.new_page()
            e2 = []
            p2.on('pageerror', lambda e: e2.append(str(e)[:200]))
            p2.goto(url)
            p2.wait_for_timeout(800)
            p2.evaluate("S.tab=3;saveState();R()")
            p2.wait_for_timeout(200)
            check('instalada: sin aviso de «Añadir a pantalla de inicio»', p2.evaluate("!/Añadir a pantalla de inicio/.test(document.body.innerText)"))
            p2.evaluate("A.zbk()")
            p2.wait_for_timeout(200)
            p2.click('[data-a=bkf]')
            p2.wait_for_timeout(600)
            sh = p2.evaluate("window.__sh")
            check('instalada: comparte la copia como archivo JSON', bool(sh) and sh[0].startswith('stratafit-copia-') and sh[1] and sh[2] == 'application/json', str(sh))
            p2.evaluate("window.__abort=1;window.__sh=null")
            p2.click('[data-a=bkf]')
            p2.wait_for_timeout(600)
            check('instalada: cancelar compartir lo indica', p2.evaluate("/No se guardó la copia/.test(document.body.innerText)"))
            p3 = c.new_page()
            p3.goto(url)
            p3.wait_for_timeout(600)
            p3.evaluate("S.tab=3;saveState();R();document.querySelectorAll('details').forEach(d=>d.open=true)")
            check('en el navegador: aviso de «Añadir a pantalla de inicio»', p3.evaluate("/Añadir a pantalla de inicio/.test(document.body.innerText)"))
            check('sin errores de JS', not errs and not e2, str((errs + e2)[:3]))
            b.close()
    finally:
        srv.shutdown()
        shutil.rmtree(site, ignore_errors=True)
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/app')
