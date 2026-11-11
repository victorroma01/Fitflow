"""StrataFit · logo e iconos (F-40, I-15). Genera, desde las dos fuentes del logo, todo lo que usan la app y el móvil:

  python3 tools/marca.py

Fuentes (src/img/brand/): fuente-claro.png y fuente-oscuro.png, el logo para tema claro y para tema oscuro, cuadrados, sin
esquinas redondeadas ni sombra (el móvil pone las suyas), con su fondo plano hasta el borde. Si llegan versiones mejores (más
grandes o en SVG convertido a PNG), basta con sustituirlas y volver a lanzar esto.

Salen:
  static/icon-180.png, icon-192.png, icon-512.png   icono de la app (pantalla de inicio): el del tema claro (el móvil lo fija
                                                     al instalar la app y no puede cambiar con el tema)
  static/icon-512-maskable.png                       el mismo con margen, para los iconos con forma de Android (zona segura:
                                                     el círculo central del 80 %)
  static/icon-dark-192.png                           el del tema oscuro, para la pestaña del navegador con el tema oscuro
  static/atajo-entreno.png, atajo-comida.png,
         atajo-peso.png                              iconos de los accesos directos (I-15), con los iconos de la propia app
                                                     (core/icons) en blanco sobre el azul del logo
  src/img/brand/logo-claro.webp, logo-oscuro.webp    el logo dentro de la app (core/brand): bienvenida e inicio de sesión
Requiere Pillow y, para los accesos directos, Playwright con Chromium (los de las pruebas).
"""
import os, re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, 'src', 'img', 'brand')
STATIC = os.path.join(ROOT, 'static')
# accesos directos: archivo → icono de core/icons (el de su pestaña o su función)
SHORTCUTS = {'atajo-entreno': 'workout', 'atajo-comida': 'nutri', 'atajo-peso': 'scale'}
# el azul del logo, de claro a oscuro (degradado de los accesos directos)
BLUE = ('#4da3ff', '#1565ff')


def source(name):
    im = Image.open(os.path.join(BRAND, 'fuente-%s.png' % name)).convert('RGB')
    if im.width != im.height:
        raise SystemExit('fuente-%s.png tiene que ser cuadrada (%dx%d)' % (name, im.width, im.height))
    return im


def resized(im, n):
    return im.resize((n, n), Image.LANCZOS)


def maskable(im, n, part=.76):
    """El logo más pequeño (part del lado) sobre su propio fondo: así nada queda fuera del círculo seguro de Android."""
    bg = im.getpixel((2, 2))
    out = Image.new('RGB', (n, n), bg)
    k = round(n * part)
    out.paste(resized(im, k), ((n - k) // 2, (n - k) // 2))
    return out


def icon_paths():
    """Los trazos SVG de los iconos de la app (core/icons): nombre → contenido del <svg>."""
    t = open(os.path.join(ROOT, 'src', 'js', 'core', 'icons.js'), encoding='utf-8').read()
    first = re.search(r"const IC = \{(.*?)\};", t, re.S).group(1)
    out = dict(re.findall(r"(\w+): '([^']+)'", first))
    out.update(re.findall(r"^IC\.(\w+) = '([^']+)';", t, re.M))
    return out


def shortcut_icons():
    from playwright.sync_api import sync_playwright
    paths = icon_paths()
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 192, 'height': 192})
        for f, ic in SHORTCUTS.items():
            pg.set_content('<html><body style="margin:0"><div style="width:192px;height:192px;display:grid;place-items:center;'
                           'background:linear-gradient(135deg,%s,%s)"><svg viewBox="0 0 24 24" width="104" height="104" fill="none" '
                           'stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">%s</svg></div></body></html>'
                           % (BLUE[0], BLUE[1], paths[ic]))
            pg.screenshot(path=os.path.join(STATIC, f + '.png'), clip={'x': 0, 'y': 0, 'width': 192, 'height': 192})
        b.close()


def main():
    light, dark = source('claro'), source('oscuro')
    for n in (180, 192, 512):
        resized(light, n).save(os.path.join(STATIC, 'icon-%d.png' % n), optimize=True)
    maskable(light, 512).save(os.path.join(STATIC, 'icon-512-maskable.png'), optimize=True)
    resized(dark, 192).save(os.path.join(STATIC, 'icon-dark-192.png'), optimize=True)
    for name, im in (('claro', light), ('oscuro', dark)):
        resized(im, 288).save(os.path.join(BRAND, 'logo-%s.webp' % name), quality=88, method=6)
    shortcut_icons()
    for d in (STATIC, BRAND):
        for f in sorted(os.listdir(d)):
            if f.endswith(('.png', '.webp')) and not f.startswith('fuente-'):
                print('  %-28s %6d bytes' % (os.path.relpath(os.path.join(d, f), ROOT), os.path.getsize(os.path.join(d, f))))


if __name__ == '__main__':
    main()
