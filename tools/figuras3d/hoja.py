# Hojas de revisión: cada ejercicio del lote en varias vistas y momentos del gesto.
# uso: python3 hoja.py salida.png "Nombre1|Nombre2|..." [cols] [size]
import sys, json, os
from playwright.sync_api import sync_playwright
out, names = sys.argv[1], sys.argv[2].split('|')
cols = json.loads(sys.argv[3]) if len(sys.argv) > 3 else [[0, 'cam'], [.5, 'cam'], [1, 'cam'], [0, 'side'], [1, 'side']]
size = int(sys.argv[4]) if len(sys.argv) > 4 else 200
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': len(cols) * (size + 6) + 6, 'height': 400}, device_scale_factor=1)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'net::' not in m.text else None)
    pg.goto('file://' + os.path.abspath('salida/banco.html'))
    pg.wait_for_timeout(300)
    try:
        pg.evaluate('([n, c, s]) => sheet(n, c, s)', [names, cols, size])
    except Exception as e:
        print('ERROR', str(e)[:600])
    pg.wait_for_timeout(200)
    pg.screenshot(path=out, full_page=True)
    if errs: print('ERRORES', errs[:5])
    b.close()
