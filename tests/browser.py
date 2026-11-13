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
import os, json, threading, functools, http.server
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


def _with_font(make):
    """browser.new_context que, con SF_FONT, pone esa letra en todas las páginas del contexto."""
    def run(self, *a, **k):
        c = make(self, *a, **k)
        if FONT:
            c.add_init_script(FONT_JS)
        return c
    return run


if not getattr(Page, '_ff_settled', False):
    Page.goto = _settled(Page.goto)
    Page.reload = _settled(Page.reload)
    Browser.new_context = _with_font(Browser.new_context)
    Page._ff_settled = True
