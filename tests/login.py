"""Prueba del aspecto del inicio de sesión (F-33, T-18): la foto del gimnasio detrás, siempre en oscuro, a varios tamaños, y el
contraste de cada texto contra lo que tiene detrás de verdad (la foto oscurecida), medido como en tests/contrast.py. También las
dos casillas de crear la cuenta (sin marcar, con su texto a un toque) y la pantalla de la aceptación de una cuenta que no
tiene aceptadas las condiciones, y los textos legales abiertos sin sesión.

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
  const i = q('#lgw .login-photo'), cs = e => getComputedStyle(e), card = q('#lgw .login-card');
  return { theme: document.documentElement.dataset.theme || '', scheme: cs(document.documentElement).colorScheme, img: !!i, loaded: !!i && i.complete && i.naturalWidth > 0, natural: i ? [i.naturalWidth, i.naturalHeight] : null,
    rect: i ? r(i) : null, view: [innerWidth, innerHeight], fit: i ? cs(i).objectFit : '', pos: i ? cs(i).objectPosition : '', fixed: i ? cs(i).position : '', events: i ? cs(i).pointerEvents : '',
    alt: i ? i.getAttribute('alt') : null, hidden: i ? i.getAttribute('aria-hidden') : null, card: cs(card).backgroundColor, cardBox: r(card), logo: r(q('#lgw .login-brand .brand-logo')), btn: r(q('#lgw .login-submit')),
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
    wait(pg, "(i => !i || (i.complete && i.naturalWidth > 0))(document.querySelector('#lgw .login-photo'))", 10000)
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
        check('y la barra del sistema, negra', bar == '#000000', bar)
        # (compartía clase con el botón «Privacidad» y recibía su relleno: se dibujaba a 92 × 100 dentro de su marco de 120 × 120)
        lg = pg.evaluate("(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), s.paddingLeft, s.paddingTop, e.naturalWidth == e.naturalHeight]; })(document.querySelector('#lgw .login-brand .brand-logo'))")
        check('el logo llena su marco: 120 × 120, sin relleno y sin deformarse', lg == [120, 120, '0px', '0px', True], str(lg))
        # debajo de la tarjeta, poco texto: al entrar, cómo recuperar la contraseña; al crear cuenta, nada (lo que se guarda lo
        # cuenta Privacidad). Con App Check, además, una línea con reCAPTCHA, sin nombrar las condiciones de Google (desde abril
        # de 2026 sus preguntas frecuentes piden quitarlas)
        notes = "[...document.querySelectorAll('#lgw .login-note')].map(p => p.textContent.trim())"
        rc = ['Protegido por reCAPTCHA.'] if pg.evaluate('appCheckOn()') else []
        check('al entrar, debajo de la tarjeta: cómo recuperar la contraseña' + (' y «Protegido por reCAPTCHA.»' if rc else ''),
              pg.evaluate(notes) == ['¿Has olvidado la contraseña? Pídele al administrador una temporal.'] + rc, str(pg.evaluate(notes)))
        pg.evaluate("A.loginMode(0,{dataset:{v:'up'}})")
        check('al pasar a «Crear cuenta» la foto es la misma (no se vuelve a cargar)', pg.evaluate("(i => !!i && i.complete && i.naturalWidth == 720)(document.querySelector('#lgw .login-photo'))"))
        check('al crear cuenta no hay nota' + (', solo la línea de reCAPTCHA' if rc else ''), pg.evaluate(notes) == rc, str(pg.evaluate(notes)))
        links = "[...document.querySelectorAll('#lgw .login-links button.login-link[data-a=openLegal]')].map(b => b.dataset.v + ':' + b.textContent.trim()).join()"
        check('y Privacidad y Aviso legal siguen a mano, en las dos', pg.evaluate(links) == 'privacy:Privacidad,terms:Aviso legal', pg.evaluate(links))
        pg.evaluate("A.loginMode(0,{dataset:{v:'in'}})")
        check('también al entrar', pg.evaluate(links) == 'privacy:Privacidad,terms:Aviso legal', pg.evaluate(links))
        pg.evaluate("A.loginMode(0,{dataset:{v:'up'}})")
        # las dos casillas de crear la cuenta: sin marcar, pequeñas, cada una con su texto (lo que lee un lector de pantalla) y con
        # el texto legal a un toque, sin que tocarlo marque la casilla
        boxes = pg.evaluate("""[...document.querySelectorAll('#lgw .consent-check')].map(l => { const i = l.querySelector('input'), s = getComputedStyle(l), r = i.getBoundingClientRect();
          return { id: i.id, type: i.type, on: i.checked, label: i.labels.length == 1 && i.labels[0] === l, text: l.textContent.replace(/\\s+/g, ' ').trim(), size: parseFloat(s.fontSize), box: Math.round(r.width) }; })""")
        check('al crear cuenta, dos casillas sin marcar: las condiciones (con la edad) y el consentimiento para los datos de salud',
              [x['id'] for x in boxes] == ['lgc1', 'lgc2'] and all(x['type'] == 'checkbox' and not x['on'] and x['label'] for x in boxes)
              and boxes[0]['text'] == 'Tengo 16 años o más y acepto las Condiciones de uso.' and boxes[1]['text'].startswith('Consiento expresamente que StrataFit trate los datos relativos a mi salud')
              and 'Puedo retirar mi consentimiento en cualquier momento desde Privacidad' in boxes[1]['text'], str(boxes))
        check('pequeñas: letra de menos de 14 px y casilla de 18', all(x['size'] < 14 and x['box'] == 18 for x in boxes), str([(x['size'], x['box']) for x in boxes]))
        check('al entrar no hay casillas', pg.evaluate("(A.loginMode(0,{dataset:{v:'in'}}), !document.querySelector('#lgw .consent-check'))"))
        pg.evaluate("A.loginMode(0,{dataset:{v:'up'}})")
        pg.click('#lgw .consent-check [data-a=openLegal][data-v=terms]')
        wait(pg, "!!document.querySelector('#lgl .page-title')", 10000)
        check('el enlace de la casilla abre las Condiciones de uso, sin sesión, y no marca la casilla',
              pg.inner_text('#lgl .page-title') == 'Aviso legal y condiciones de uso' and not pg.is_checked('#lgc1'), pg.inner_text('#lgl .page-title'))
        pg.click('#sh [aria-label=Volver]')
        pg.locator('#lgw .consent-check').first.click(position={'x': 30, 'y': 8})
        check('tocar el texto de la casilla la marca', pg.is_checked('#lgc1') and not pg.is_checked('#lgc2'))
        pg.fill('#lgu', 'Luz_0')
        pg.evaluate("A.loginToggleEye()")
        check('y sigue marcada al volver a pintarse el formulario (como lo escrito)', pg.is_checked('#lgc1') and pg.input_value('#lgu') == 'Luz_0')
        pg.click('#lgw .login-links [data-a=openLegal][data-v=privacy]')
        wait(pg, "!!document.querySelector('#lgl .page-title')", 10000)
        seen = pg.evaluate("document.querySelector('#sh').textContent")
        code = pg.evaluate("document.querySelector('#sh').innerHTML")
        check('Privacidad, sin sesión: la política entera, con su resumen y sin «Tus datos»',
              pg.inner_text('#lgl .page-title') == 'Política de privacidad de StrataFit' and pg.evaluate("document.querySelectorAll('#lgl .legal-card').length") == 6
              and pg.evaluate("document.querySelectorAll('#lgl section').length") == 20 and pg.evaluate("!document.querySelector('#lgl [data-a=consentWithdrawAsk]') && !document.querySelector('#lgl [data-a=openDeleteAccount]')"))
        check('cuenta para qué se usa reCAPTCHA, sin remitir a las condiciones de Google',
              'reCAPTCHA Enterprise' in seen and 'como encargado del tratamiento' in seen and 'policies.google.com' not in code and 'Condiciones del servicio' not in seen, seen[-200:])
        check('sin datos pendientes a la vista (corchetes de los borradores)', '[' not in seen and ']' not in seen)
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
                    k2 = pg.evaluate(LOOK)
                    ok = ok and k2['over'] <= 0 and k2['cardBox'][2] <= w
                check('%d × %d, móvil en %s: la foto cubre la pantalla, nada se sale de ancho y todo el texto se lee (AA), al entrar y al crear cuenta' % (w, h, 'claro' if scheme == 'light' else 'oscuro'),
                      ok and not bad, str({'foto': k['rect'], 'ancho de más': k['over']}) + ' ' + '; '.join(sorted(set(bad))[:4]))
                c.close()

        print('La pantalla de la aceptación')
        for w, h in [(320, 568), (393, 852), (932, 430)]:
            # una sesión sin nada aceptado, como la de una cuenta anterior a la V1.0.4 (el Firebase de mentira no la conoce: la
            # pantalla se queda, que es lo que pasa sin conexión)
            c, pg = open_login(b, path, w, h, 'light', FakeFirebase())
            pg.evaluate("localStorage.setItem('ffacct', JSON.stringify({uid:'prueba',u:'Prueba',it:'x.e30.x',rt:'x',exp:4102444800000}));localStorage.setItem('ffown','prueba')")
            pg.reload()
            wait(pg, "window.__ffok && !!document.getElementById('lgc1')")
            k = pg.evaluate(LOOK)
            g = pg.evaluate("""({ app: !!document.querySelector('#app .page-head'), nav: document.querySelector('nav').style.display, boxes: [...document.querySelectorAll('#lgw .consent-check input')].map(i => i.checked),
              user: document.querySelector('#lgw .login-card').textContent.includes('Prueba'), acts: [...document.querySelectorAll('#lgw .login-links button')].map(b => b.dataset.a + (b.dataset.v ? ':' + b.dataset.v : '')).join() })""")
            bad = contrast(pg)
            check('%d × %d: en lugar de la app, las dos casillas sin marcar, de qué cuenta es y lo que se puede hacer sin aceptar; nada se sale y todo se lee (AA)' % (w, h),
                  not g['app'] and g['nav'] == 'none' and g['boxes'] == [False, False] and g['user'] and g['acts'] == 'backupDownload,resetAllAsk,openDeleteAccount,signOut,openLegal:privacy,openLegal:terms'
                  and k['theme'] == 'dark' and k['over'] <= 0 and k['cardBox'][0] >= 0 and k['cardBox'][2] <= w and k['btn'][2] <= w and not bad, str(g) + ' ' + '; '.join(sorted(set(bad))[:4]))
            if (w, h) == (393, 852):
                pg.click('[data-a=consentAccept]')
                check('sin marcar las casillas no se entra: dice cuál falta', '16 años' in pg.inner_text('#lge') and pg.evaluate("!!document.getElementById('lgc1')"), pg.inner_text('#lge'))
                pg.evaluate("document.getElementById('lgc1').click()")
                pg.click('[data-a=consentAccept]')
                check('con una sola, tampoco', 'consentimiento' in pg.inner_text('#lge') and pg.evaluate("!account.cs"), pg.inner_text('#lge'))
                pg.evaluate("document.getElementById('lgc2').click()")
                with pg.expect_navigation(timeout=20000):
                    pg.click('[data-a=consentAccept]')
                wait(pg, "window.__ffok && !document.getElementById('lgw') && document.querySelector('nav').style.display != 'none'", 30000)
                cs = pg.evaluate("account.cs")
                check('con las dos se entra en la app, y queda anotado qué versión se aceptó y cuándo',
                      cs['t']['v'] == '1.0' and cs['h']['v'] == '1.0' and cs['h']['st'] == 1 and abs(cs['t']['at'] - pg.evaluate('Date.now()')) < 60000 and cs['t']['at'] == cs['h']['at'], str(cs))
                pg.reload()
                wait(pg, 'window.__ffok')
                check('y al abrir de nuevo ya no se pide', pg.evaluate("!document.getElementById('lgw') && document.querySelector('nav').style.display != 'none'"))
            c.close()

        print('Al entrar')
        fb = FakeFirebase()
        c, pg = open_login(b, path, 393, 852, 'light', fb)
        pg.click('[data-a=loginMode][data-v=up]')
        pg.fill('#lgu', 'Luz_1'); pg.fill('#lgp', 'clave-luz-11'); pg.fill('#lgp2', 'clave-luz-11')
        pg.evaluate("document.getElementById('lgc1').click();document.getElementById('lgc2').click()")
        pg.click('[data-a=loginSubmit]')
        wait(pg, "window.__ffok && !document.getElementById('lgw') && document.querySelector('nav').style.display != 'none'", 30000)
        check('ya dentro, la app va con el tema del móvil (claro): el oscuro era solo del inicio de sesión',
              pg.evaluate("!document.documentElement.dataset.theme && getComputedStyle(document.documentElement).colorScheme == 'light' && !document.querySelector('.login-photo')"),
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
