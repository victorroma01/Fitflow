"""Prueba del aspecto del inicio de sesión (F-33, T-18): la foto del gimnasio detrás, siempre en oscuro, a varios tamaños, y el
contraste de cada texto contra lo que tiene detrás de verdad (la foto oscurecida), medido como en tests/contrast.py.

  python3 tests/login.py dist/stratafit.html

También mira el paquete (dist/app), si está compilado: la foto es un archivo y el service worker la guarda para abrir sin
conexión. Lo que hace el inicio de sesión (entrar, registrarse, esperas…) lo prueba tests/cloud.py.
"""
import os, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from browser import launch, app_url, context_opts  # noqa: E402
from contrast import measure  # noqa: E402
from fakefb import FakeFirebase  # noqa: E402

INIT = '\n'.join(l for l in open(os.path.join(HERE, 'init.js'), encoding='utf-8').read().split('\n') if not l.startswith('//'))
# (ancho, alto): del móvil más estrecho a una tableta y un ordenador, y móviles tumbados. Según el tamaño, cada texto cae
# sobre una parte distinta de la foto: están los tamaños en los que alguno caía sobre lo más claro (la pared)
SIZES = [(320, 568), (360, 740), (393, 852), (402, 815), (430, 932), (600, 960), (820, 1180), (1440, 900), (852, 393), (932, 430)]
fails, passes = [], []


def check(name, cond, info=''):
    (passes if cond else fails).append(name)
    print(('  ok   ' if cond else '  FALLA'), name, ('' if cond else info))


def wait(pg, expr, timeout=20000):
    for _ in range(int(timeout / 100)):
        try:
            if pg.evaluate(expr):
                return True
        except Exception:
            pass
        pg.wait_for_timeout(100)
    raise AssertionError('no llega: ' + expr)


LOOK = """() => { const q = s => document.querySelector(s), r = e => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
  const i = q('#lgw .lgbg'), cs = e => getComputedStyle(e), card = q('#lgw .lgc');
  return { theme: document.documentElement.dataset.theme || '', scheme: cs(document.documentElement).colorScheme, img: !!i, loaded: !!i && i.complete && i.naturalWidth > 0, natural: i ? [i.naturalWidth, i.naturalHeight] : null,
    rect: i ? r(i) : null, view: [innerWidth, innerHeight], fit: i ? cs(i).objectFit : '', pos: i ? cs(i).objectPosition : '', fixed: i ? cs(i).position : '', events: i ? cs(i).pointerEvents : '',
    alt: i ? i.getAttribute('alt') : null, hidden: i ? i.getAttribute('aria-hidden') : null, card: cs(card).backgroundColor, cardBox: r(card), logo: r(q('#lgw .lgbr .brl')), btn: r(q('#lgw .lgb')),
    over: document.documentElement.scrollWidth - innerWidth, top: i ? document.elementFromPoint(innerWidth / 2, 4) !== i : false }; }"""


def open_login(b, path, w, h, scheme='light', fb=None):
    c = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1, color_scheme=scheme, **context_opts(path))
    c.add_init_script('window.__sfNoSession=1;window.__sfNet=1;')
    c.add_init_script(INIT)
    if fb:
        fb.install(c)
    pg = c.new_page()
    pg.goto(app_url(path))
    wait(pg, 'window.__ffok')
    wait(pg, "(i => !i || (i.complete && i.naturalWidth > 0))(document.querySelector('#lgw .lgbg'))", 10000)
    return c, pg


def contrast(pg):
    """Lo que no llega al contraste AA en lo que hay en pantalla, bajando hasta el final: [texto, contraste, mínimo]."""
    bad = []
    total = pg.evaluate('document.documentElement.scrollHeight')
    h = pg.evaluate('innerHeight')
    for y in range(0, max(1, total - h + 1), max(60, h // 2)):
        pg.evaluate('window.scrollTo(0, %d)' % y)
        for r in measure(pg):
            if r[0] < r[1] - .005:
                bad.append('«%s» %.2f:1 (pide %.1f) %s sobre %s' % (r[2][:22], r[0], r[1], r[4], r[5]))
    pg.evaluate('window.scrollTo(0, 0)')
    return bad


def main(path):
    with sync_playwright() as p:
        b = launch(p)
        errs = []
        print('La foto y el tema')
        c, pg = open_login(b, path, 393, 852)
        pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        k = pg.evaluate(LOOK)
        check('detrás del inicio de sesión va la foto, ya cargada', k['img'] and k['loaded'] and k['natural'] == [720, 1290], str(k))
        check('ocupa toda la pantalla, fija y recortada sin deformarse', k['rect'] == [0, 0] + k['view'] and k['fit'] == 'cover' and k['fixed'] == 'fixed', str([k['rect'], k['view'], k['fit'], k['fixed']]))
        check('alineada a la izquierda: el rótulo de la pared se ve entero', k['pos'].startswith('0%'), k['pos'])
        check('es un adorno: sin texto alternativo, fuera del lector de pantalla y sin recibir toques', k['alt'] == '' and k['hidden'] == 'true' and k['events'] == 'none', str([k['alt'], k['hidden'], k['events']]))
        check('con el móvil en claro, el inicio de sesión sigue en oscuro (también la tarjeta)', k['theme'] == 'dark' and k['scheme'] == 'dark' and k['card'] == 'rgb(23, 23, 27)', str([k['theme'], k['scheme'], k['card']]))
        bar = pg.evaluate("(m => m ? m.content : '')(document.querySelector('meta[name=\"theme-color\"]:not([media])'))")
        check('y la barra del sistema, oscura', bar == '#0b0b0d', bar)
        pg.evaluate("A.loginMode(0,{dataset:{v:'up'}})")
        check('al pasar a «Crear cuenta» la foto es la misma (no se vuelve a cargar)', pg.evaluate("(i => !!i && i.complete && i.naturalWidth == 720)(document.querySelector('#lgw .lgbg'))"))
        c.close()

        print('A cada tamaño')
        for w, h in SIZES:
            # (con el móvil en oscuro se ve igual: basta mirarlo a un tamaño)
            for scheme in ('light', 'dark') if (w, h) == (393, 852) else ('light',):
                c, pg = open_login(b, path, w, h, scheme)
                k = pg.evaluate(LOOK)
                ok = k['loaded'] and k['rect'] == [0, 0, w, h] and k['over'] <= 0 and k['logo'][0] >= 0 and k['logo'][2] <= w and k['cardBox'][0] >= 0 and k['cardBox'][2] <= w and k['btn'][2] <= w
                bad = []
                for mode in ('in', 'up'):
                    pg.evaluate("A.loginMode(0,{dataset:{v:'%s'}})" % mode)
                    bad += contrast(pg)
                check('%d × %d, móvil en %s: la foto cubre la pantalla, nada se sale de ancho y todo el texto se lee (AA), al entrar y al crear cuenta' % (w, h, 'claro' if scheme == 'light' else 'oscuro'),
                      ok and not bad, str({'foto': k['rect'], 'ancho de más': k['over']}) + ' ' + '; '.join(sorted(set(bad))[:4]))
                c.close()

        print('Al entrar')
        fb = FakeFirebase()
        c, pg = open_login(b, path, 393, 852, 'light', fb)
        pg.click('[data-a=loginMode][data-v=up]')
        pg.fill('#lgu', 'Luz_1'); pg.fill('#lgp', 'clave-luz-11'); pg.fill('#lgp2', 'clave-luz-11')
        pg.click('[data-a=loginSubmit]')
        wait(pg, "window.__ffok && !document.getElementById('lgw') && document.querySelector('nav').style.display != 'none'", 30000)
        check('ya dentro, la app va con el tema del móvil (claro): el oscuro era solo del inicio de sesión',
              pg.evaluate("!document.documentElement.dataset.theme && getComputedStyle(document.documentElement).colorScheme == 'light' && !document.querySelector('.lgbg')"),
              str(pg.evaluate("[document.documentElement.dataset.theme, getComputedStyle(document.documentElement).colorScheme]")))
        c.close()
        b.close()

    print('En el paquete')
    app = os.path.join(ROOT, 'dist', 'app')
    if os.path.isfile(os.path.join(app, 'sw.js')):
        photo = os.path.join(app, 'img', 'login', 'fondo.webp')
        check('la foto es un archivo del paquete, de menos de 60 KB', os.path.isfile(photo) and os.path.getsize(photo) < 60000, photo)
        check('y el service worker la guarda para abrir sin conexión', 'img/login/fondo.webp' in open(os.path.join(app, 'sw.js'), encoding='utf-8').read())
    else:
        print('  (sin dist/app: no se mira)')
    check('sin errores de JS', not errs, str(errs[:3]))
    print('\n%d correctas, %d fallos' % (len(passes), len(fails)))
    print('TODO CORRECTO' if not fails else 'HAY FALLOS')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'stratafit.html')))
