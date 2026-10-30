"""Prueba del paquete instalable (dist/app) servido por HTTP: cabecera fija, manifiesto, service worker,
arranque sin conexión, aviso de versión nueva, copia de seguridad desde la app instalada y aviso de «Añadir a inicio».

  python3 tests/deploy.py dist/app
Requiere:  pip install playwright  &&  playwright install chromium
"""
import os, sys, re, shutil, tempfile, threading, functools, http.server
from playwright.sync_api import sync_playwright

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
            b = p.chromium.launch()
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
            # versión nueva publicada: la app abre la copia guardada al momento y avisa
            t = open(idx, encoding='utf-8').read()
            v0 = re.search(r"const APPV\s*=\s*'([^']+)'", t).group(1)
            open(idx, 'w', encoding='utf-8').write(re.sub(r"(const APPV\s*=\s*')[^']+'", r"\g<1>9.9.9'", t, count=1))
            pg.reload()
            pg.wait_for_timeout(2500)
            check('abre al instante con la versión guardada', ev('APPV') == v0, ev('APPV'))
            check('muestra «Nueva versión disponible»', ev("!!document.getElementById('upd')"))
            pg.reload()
            pg.wait_for_timeout(1200)
            check('tras actualizar carga la nueva', ev('APPV') == '9.9.9', ev('APPV'))
            open(idx, 'w', encoding='utf-8').write(t)
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
