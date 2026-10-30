"""Navegador y dirección de la app para las pruebas.

Motor: variable de entorno SF_BROWSER = chromium (por defecto) | webkit (el motor de Safari, el del iPhone) | firefox.
Dirección: el archivo único, con Chromium, se abre como archivo (file://); el paquete (dist/app, con sw.js al lado) siempre
se sirve por HTTP desde su carpeta, como en GitHub Pages (sus módulos ES no cargan desde file://), y con los demás motores,
o con SF_HTTP=1, también el archivo único (WebKit no guarda datos de páginas abiertas como archivo).
"""
import os, threading, functools, http.server

ENGINE = os.environ.get('SF_BROWSER', 'chromium')
HTTP = os.environ.get('SF_HTTP') == '1' or ENGINE != 'chromium'


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
