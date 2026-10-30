"""Prueba del paquete instalable (dist/app) servido por HTTP: cabecera fija, manifiesto, service worker,
arranque sin conexión, aviso de versión nueva (con una versión nueva publicada de verdad: otro código con otros nombres
de archivo), código que se carga al usarlo, copia de seguridad desde la app instalada y aviso de «Añadir a inicio».

  python3 tests/deploy.py dist/app
Requiere:  pip install playwright  &&  playwright install chromium
"""
import os, sys, re, json, shutil, tempfile, threading, functools, http.server
from playwright.sync_api import sync_playwright
from browser import launch, app_url, ENGINE

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


def reload(pg, notes):
    """Recarga la página. En WebKit, si la recarga falla con un error interno del motor (pasa con service worker en
    Playwright), se vuelve a abrir la misma dirección y se anota, para que la prueba siga y se vea el resto."""
    try:
        pg.reload()
    except Exception as e:
        if ENGINE != 'webkit' or 'internal error' not in str(e):
            raise
        notes.append('recarga con error interno de WebKit en ' + pg.url[-30:])
        pg.goto(pg.url)


def deploy(orig, dest, ver=None, suffix=''):
    """Publica en `dest` el paquete `orig`; con `ver`, como una compilación nueva: el código con esa versión y cada archivo
    js/ con otro nombre (como hace esbuild cuando cambia el contenido), con todas sus referencias."""
    v0 = json.load(open(os.path.join(orig, 'version.json'), encoding='utf-8'))['version']
    names = {f: (f[:-3] + suffix + '.js' if ver else f) for f in os.listdir(os.path.join(orig, 'js'))}
    def fix(t):
        for a, b in names.items():
            t = t.replace(a, b)
        return t.replace('"%s"' % v0, '"%s"' % ver) if ver else t
    shutil.rmtree(os.path.join(dest, 'js'), ignore_errors=True)
    os.makedirs(os.path.join(dest, 'js'))
    for a, b in names.items():
        open(os.path.join(dest, 'js', b), 'w', encoding='utf-8').write(fix(open(os.path.join(orig, 'js', a), encoding='utf-8').read()))
    for f in ('index.html', 'sw.js'):
        open(os.path.join(dest, f), 'w', encoding='utf-8').write(fix(open(os.path.join(orig, f), encoding='utf-8').read()))
    return v0


def main(app):
    log = []
    site = tempfile.mkdtemp(prefix='sf_site_')
    orig = os.path.join(site, 'orig')
    shutil.copytree(os.path.abspath(app), orig)
    shutil.copytree(orig, os.path.join(site, 'fitflow'))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=site))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = 'http://localhost:%d/fitflow/' % srv.server_address[1]
    try:
        with sync_playwright() as p:
            b = launch(p)
            c = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True, color_scheme='dark')
            pg = c.new_page()
            errs = []
            pg.on('framenavigated', lambda f: log.append('navega ' + f.url[-50:]) if f == pg.main_frame else None)
            pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
            pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:200]) if m.type == 'error' else None)
            try:
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
                reload(pg, log)
                pg.wait_for_timeout(1200)
                check('service worker controla la página', ev('!!navigator.serviceWorker.controller'))
                cached = ev("caches.keys().then(k=>Promise.all(k.map(n=>caches.open(n).then(c=>c.keys()).then(r=>r.map(x=>x.url.split('/fitflow/')[1]))))).then(a=>a.flat())")
                code = ['js/' + f for f in os.listdir(os.path.join(orig, 'js'))]
                need = ['index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', ''] + code
                check('precarga completa (también el código js/)', all(n in cached for n in need), str([n for n in need if n not in cached]))
                check('el código va aparte y comprimido', bool(code) and ev("!!document.querySelector('script[type=module][src^=\"js/\"]')") and
                      all(len(s) < 2000 or len(s) / (s.count('\n') + 1) > 1000 for s in (open(os.path.join(orig, f), encoding='utf-8').read() for f in code)))
                # lo poco usado (WOD, CSV, escáner) va en archivos aparte que no se descargan al arrancar
                lazy = [f for f in os.listdir(os.path.join(orig, 'js')) if re.match(r'(wod|csv|foods-online)-', f)]
                loaded = ev("performance.getEntriesByType('resource').map(e=>e.name.split('/').pop())")
                check('lo poco usado va aparte y no se carga al arrancar', len(lazy) == 3 and not any(f in loaded for f in lazy), str(lazy) + ' ' + str(loaded))
                assets = ev("[...new Set([...document.documentElement.outerHTML.matchAll(/(?:src=\"|url\\()((?:img)\\/[^\"')]+)/g)].map(m=>m[1]))]")
                # sin conexión
                c.set_offline(True)
                reload(pg, log)
                pg.wait_for_timeout(1200)
                check('abre sin conexión', ev("document.querySelector('#app').innerText.length>50"))
                pend = ev("(async()=>{const c=await caches.open((await caches.keys())[0]);const out=[];for(const u of %s){if(!(await c.match(u,{ignoreSearch:true})))out.push(u)}return out})()" % repr(assets))
                check('imágenes en caché para usar sin conexión', not pend, str(pend[:5]))
                ev('A.wod()')
                pg.wait_for_timeout(300)
                check('sin conexión también abre lo que se carga al usarlo (WOD)', ev("/AMRAP/.test(document.body.innerText)"))
                c.set_offline(False)
                reload(pg, log)
                pg.wait_for_load_state('load')
                pg.wait_for_timeout(800)
                check('instalación nueva: no enseña novedades', ev("!document.getElementById('upd')"))
                vj = os.path.join(site, 'fitflow', 'version.json')
                vj0 = open(vj, encoding='utf-8').read()
                check('version.json publicado con la versión de la app', json.loads(vj0)['version'] == ev('APPV'))
                # Ajustes → Comprobar actualizaciones, sin versión nueva
                ev("S.tab=3;R();document.querySelectorAll('details').forEach(d=>d.open=true)")
                pg.click('[data-a=updChk]')
                pg.wait_for_timeout(800)
                check('Comprobar actualizaciones: «Tienes la última versión»', ev("/Tienes la última versión/.test(document.body.innerText)"))

                def publish(ver, items, code=True):
                    if code:
                        deploy(orig, os.path.join(site, 'fitflow'), ver, '-' + ver.replace('.', ''))
                    e = {'version': ver, 'date': '2026-12-01', 'sections': [{'title': 'Novedades', 'items': items}]}
                    open(vj, 'w', encoding='utf-8').write(json.dumps(dict(e, history=[e, json.loads(vj0)])))

                # versión nueva publicada: la app abre la copia guardada al momento y avisa con la tarjeta de novedades
                v0 = ev('APPV')
                publish('9.9.9', ['Prueba de novedades'])
                reload(pg, log)
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
                # la versión nueva, con su código de nombres nuevos, abre también sin conexión
                c.set_offline(True)
                reload(pg, log)
                pg.wait_for_load_state('load')
                pg.wait_for_timeout(1200)
                check('la versión nueva abre sin conexión', ev('!!window.__ffok') and ev('APPV') == '9.9.9' and ev("!document.getElementById('ffe')"))
                c.set_offline(False)
                # Comprobar actualizaciones cuando hay una versión nueva en el servidor
                publish('9.9.10', ['Otra mejora'], code=False)
                ev("S.tab=3;R();document.querySelectorAll('details').forEach(d=>d.open=true)")
                pg.click('[data-a=updChk]')
                pg.wait_for_timeout(800)
                check('Comprobar actualizaciones encuentra la versión nueva', ev("document.querySelector('#upd h3')&&document.querySelector('#upd h3').textContent") == 'Versión 9.9.10')
                pg.click('#upd .updx')
                pg.wait_for_timeout(200)
                check('el aviso se puede cerrar', ev("!document.getElementById('upd')"))
                # tras actualizar desde una versión antigua (sin haber visto el aviso): novedades una sola vez
                ev("localStorage.setItem('ffver','1.0.0');localStorage.removeItem('ffseen')")
                reload(pg, log)
                pg.wait_for_load_state('load')
                pg.wait_for_timeout(1500)
                news = ev("(()=>{const k=document.querySelector('#upd.news .updk');return k?{title:k.querySelector('h3').textContent,btn:k.querySelector('.upb').innerText}:null})()")
                check('tras actualizar enseña las novedades de la versión', bool(news) and news['title'].startswith('Versión ') and news['btn'] == 'ENTENDIDO', str(news))
                if news:
                    pg.click('#upd .upb')
                    pg.wait_for_timeout(200)
                reload(pg, log)
                pg.wait_for_load_state('load')
                pg.wait_for_timeout(1500)
                check('y solo una vez', ev("!document.getElementById('upd')"))
                deploy(orig, os.path.join(site, 'fitflow'))
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
            except Exception:
                print('  FALLA excepción; últimas navegaciones y errores:', ' | '.join(log[-8:] + errs[-4:]))
                raise
            b.close()
    finally:
        srv.shutdown()
        shutil.rmtree(site, ignore_errors=True)
    for n in [x for x in log if x.startswith('recarga con error')]:
        print('  AVISO', n)
    print('\n%s' % ('TODO CORRECTO' if not fails else 'FALLAN: ' + ', '.join(fails)))
    sys.exit(1 if fails else 0)


main(sys.argv[1] if len(sys.argv) > 1 else 'dist/app')
