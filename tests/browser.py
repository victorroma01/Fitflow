"""Navegador y dirección de la app para las pruebas.

Motor: variable de entorno SF_BROWSER = chromium (por defecto) | webkit (el motor de Safari, el del iPhone) | firefox.
Letra: SF_FONT="DejaVu Sans" pone esa letra en toda la app. El ancho de los textos cambia de un sistema a otro (San Francisco
en el iPhone, Roboto en Android, DejaVu en los ordenadores de GitHub, que es de las más anchas) y nada debe depender de él:
sirve para repetir aquí lo que falla allí.
Dirección: todo se sirve por HTTP desde su carpeta, como en GitHub Pages: el paquete (dist/app, con sw.js al lado), porque
sus módulos ES no cargan desde file://, y también el archivo único (con file://, WebKit no guarda datos, y Chromium a veces
abre la página recargada con el almacenamiento vacío). SF_HTTP=0 abre el archivo único como archivo, con Chromium.

La app lee de IndexedDB los entrenos, el historial y las comidas antes de pintar nada, y los guarda allí sin esperar
(core/persist, I-04). Por eso, en todas las pruebas, page.goto y page.reload esperan antes a que lo guardado quede escrito
(savesDone) y, después, a que la app termine de arrancar (window.__ffready). En otras páginas no esperan nada.
"""
import os, re, json, threading, functools, http.server
from playwright.sync_api import Page, Browser

ENGINE = os.environ.get('SF_BROWSER', 'chromium')
HTTP = os.environ.get('SF_HTTP', '1') != '0' or ENGINE != 'chromium'
FONT = os.environ.get('SF_FONT', '')
# la letra pedida, puesta con una hoja de estilo creada desde el código (la CSP de la app no deja añadir una etiqueta <style>)
FONT_JS = "addEventListener('DOMContentLoaded',()=>{try{const s=new CSSStyleSheet();s.replaceSync(%s);document.adoptedStyleSheets=[...document.adoptedStyleSheets,s]}catch(e){}})" % json.dumps('*{font-family:"%s" !important}' % FONT)


def launch(p, sound=False):
    """Abre el navegador elegido. sound=True permite sonar sin gesto del usuario (solo hace falta y existe en Chromium)."""
    args = ['--autoplay-policy=no-user-gesture-required'] if sound and ENGINE == 'chromium' else []
    return getattr(p, ENGINE).launch(args=args)


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def app_url(path):
    """Dirección para abrir el archivo `path`: file:// o, si toca, un servidor HTTP local de su carpeta (vive lo que la prueba)."""
    path = os.path.abspath(path)
    if not HTTP and not is_package(path):
        return 'file://' + path
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(_Quiet, directory=os.path.dirname(path)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return 'http://127.0.0.1:%d/%s' % (srv.server_address[1], os.path.basename(path))


def is_package(path):
    """¿Es el index.html del paquete (con su sw.js al lado)?"""
    return os.path.exists(os.path.join(os.path.dirname(os.path.abspath(path)), 'sw.js'))


def context_opts(path):
    """Opciones del contexto: por HTTP, el archivo único va sin service worker (no hay sw.js a su lado)."""
    if HTTP and not is_package(path):
        return {'service_workers': 'block'}
    return {}


def _quiet(page, expr):
    """Evalúa expr en la página si se puede (si la página no es la app, o está cambiando, no pasa nada)."""
    try:
        return page.evaluate(expr)
    except Exception:
        return None


def _settled(nav):
    """page.goto / page.reload que antes esperan a lo pendiente de guardar y después a que la app arranque."""
    def run(self, *a, **k):
        _quiet(self, 'window.savesDone ? savesDone() : null')
        r = nav(self, *a, **k)
        _quiet(self, 'window.__ffready || null')
        return r
    return run


# Firefox (Gecko) da '' al leer innerText de #sh, la capa de las hojas y páginas: mide 0 de alto y su contenido va con posición
# fija. Las páginas de dentro (.sp) sí lo dan. Como las pruebas leen «lo que se ve en la hoja» con #sh, en Firefox se lee de sus
# hijos. La app no usa innerText: es solo cómo miran las pruebas.
GECKO_TEXT_JS = """(() => { const d = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText');
  Object.defineProperty(HTMLElement.prototype, 'innerText', { configurable: true, set(v) { d.set.call(this, v); },
    get() { const t = d.get.call(this); return t || this.id != 'sh' ? t : [...this.children].map(c => d.get.call(c)).filter(Boolean).join('\\n'); } }); })()"""


# reCAPTCHA Enterprise de prueba. Con App Check configurado (cloud/config), la app carga reCAPTCHA de Google antes de hablar con
# Firebase: en las pruebas no se sale a internet, y lo contesta esto. Hace lo que el de verdad pide a la CSP de la app (build.py):
# trae su código de gstatic, pone su sello (sin estilo propio: la CSP de la app no admite estilos en línea) con su marco dentro
# y avisa a su servidor. Deja en window.__rc con qué clave y acción se le pidió el último token.
RECAPTCHA = re.compile(r'^https://(www\.google\.com|recaptcha\.google\.com|www\.gstatic\.com)/recaptcha/')
RECAPTCHA_JS = """(function(){var loaded=null;
window.grecaptcha={enterprise:{
 ready:function(f){loaded=loaded||new Promise(function(res){var s=document.createElement('script');s.src='https://www.gstatic.com/recaptcha/releases/prueba/recaptcha__es.js';s.onload=s.onerror=res;document.head.appendChild(s)});loaded.then(f)},
 execute:function(key,o){window.__rc=[key,o&&o.action];
  if(!document.querySelector('.grecaptcha-badge')){var d=document.createElement('div');d.className='grecaptcha-badge';var fr=document.createElement('iframe');fr.src='https://www.google.com/recaptcha/enterprise/anchor?k='+encodeURIComponent(key);fr.width=256;fr.height=60;d.appendChild(fr);document.body.appendChild(d)}
  var tok=function(){return 'rc-tok'};
  return fetch('https://www.google.com/recaptcha/enterprise/clr?k='+encodeURIComponent(key),{method:'POST',body:'x'}).then(tok,tok)}}};
})();"""


def _recaptcha(route):
    """Contesta a reCAPTCHA de prueba: su script, el código que trae de gstatic, su marco y sus avisos."""
    u = route.request.url
    if '/enterprise.js' in u:
        return route.fulfill(content_type='application/javascript', body=RECAPTCHA_JS)
    if u.endswith('.js'):
        return route.fulfill(content_type='application/javascript', body='/* reCAPTCHA de prueba */')
    if '/anchor' in u:
        return route.fulfill(content_type='text/html', body='<!doctype html><title>reCAPTCHA de prueba</title>')
    return route.fulfill(content_type='text/plain', body='ok', headers={'access-control-allow-origin': '*'})


def _with_setup(make):
    """browser.new_context que prepara cada página del contexto: con SF_FONT, pone esa letra; en Firefox, lee bien el texto de las
    hojas; y reCAPTCHA, siempre el de prueba."""
    def run(self, *a, **k):
        c = make(self, *a, **k)
        if FONT:
            c.add_init_script(FONT_JS)
        if ENGINE == 'firefox':
            c.add_init_script(GECKO_TEXT_JS)
        c.route(RECAPTCHA, _recaptcha)
        return c
    return run


def _page_text(self, selector, **k):
    """page.inner_text en Firefox: Playwright lo lee en un contexto aparte, donde no vale el arreglo de GECKO_TEXT_JS (y el texto
    de #sh sale vacío o a medias). Se lee en la página, esperando a que el elemento exista como hace Playwright."""
    for _ in range(50):
        r = self.evaluate("s => { const e = document.querySelector(s); return e ? [e.innerText] : null; }", selector)
        if r:
            return r[0]
        self.wait_for_timeout(100)
    raise AssertionError('no existe ' + selector)


if not getattr(Page, '_ff_settled', False):
    Page.goto = _settled(Page.goto)
    Page.reload = _settled(Page.reload)
    Browser.new_context = _with_setup(Browser.new_context)
    if ENGINE == 'firefox':
        Page.inner_text = _page_text
    Page._ff_settled = True
