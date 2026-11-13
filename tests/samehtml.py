"""El HTML de cada pantalla en dos compilaciones: para comprobar que un cambio interno (partir una vista, mover un cálculo de
módulo) no cambia nada de lo que se pinta. Más rápido y preciso que comparar capturas: dice el primer carácter distinto.

Abre en las dos las pantallas de tests/shots.py con los mismos datos y la misma fecha, y compara el HTML de la página (sin el
código ni los estilos, y con los estilos puestos por core/dynstyle). No es una prueba de la batería: se usa a mano.
Lo que depende del momento y no del código no se compara: los tiempos y el espacio medidos de Diagnóstico y la clase que
anima la burbuja de la barra de pestañas (se pone en el siguiente fotograma). Así, dos compilaciones iguales dan 0 distintas.

  python3 tests/samehtml.py antes.html despues.html [pantalla,pantalla…]
"""
import os, re, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shots import SCR, SEED, EXTRA, INIT  # noqa: E402
from browser import app_url, context_opts  # noqa: E402

BODY = "(()=>{const c=document.body.cloneNode(true);c.querySelectorAll('script,style').forEach(e=>e.remove());c.querySelectorAll('nav').forEach(n=>n.classList.remove('nbon'));return c.innerHTML})()"
# las líneas de Diagnóstico con medidas del momento
NOISE = re.compile(r'(Tiempo de pintado|Espacio usado): [^\n<]*')


def grab(path, screens):
    out, url = {}, app_url(path)
    with sync_playwright() as p:
        b = p.chromium.launch()
        c = b.new_context(viewport={'width': 390, 'height': 844}, **context_opts(path))
        c.add_init_script(INIT)
        pg = c.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
        for k in screens:
            pg.goto(url)
            pg.evaluate('localStorage.clear()')
            pg.reload()
            pg.clock.set_fixed_time('2026-10-29T12:00:00')
            pg.evaluate(SEED)
            pg.evaluate(EXTRA)
            pg.reload()
            pg.clock.set_fixed_time('2026-10-29T12:00:00')
            try:
                pg.evaluate(SCR[k])
                pg.wait_for_timeout(900 if k in ('edit', 'overview', 'go_open') else 300)
                out[k] = NOISE.sub(r'\1: …', pg.evaluate(BODY))
            except Exception as e:
                out[k] = 'EXC ' + str(e)[:200]
        out['(errores de JS)'] = str(errs)
        b.close()
    return out


def main(a, b, screens):
    x, y = grab(a, screens), grab(b, screens)
    bad = 0
    for k in x:
        if x[k] == y[k]:
            continue
        bad += 1
        i = next((i for i in range(min(len(x[k]), len(y[k]))) if x[k][i] != y[k][i]), min(len(x[k]), len(y[k])))
        print('DISTINTA %s (%d y %d caracteres)\n  antes:   …%s\n  después: …%s' % (k, len(x[k]), len(y[k]), x[k][max(0, i - 120):i + 120], y[k][max(0, i - 120):i + 120]))
    print('%d pantallas comparadas; %d distintas' % (len(x) - 1, bad))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3].split(',') if len(sys.argv) > 3 else list(SCR))
