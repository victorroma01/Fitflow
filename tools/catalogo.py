"""StrataFit · imágenes de las tarjetas de la librería. Copia a la app las del paquete del rediseño de la librería que aprobó el
propietario (StrataFit_Catalogo: catalogo.json, assets/ilustraciones y assets/iconos):

  python3 tools/catalogo.py ruta/a/la/carpeta/del/paquete

Escribe en src/img/catalog, por cada grupo que nombra src/js/data/catalog.js:
- <id>.webp: su ilustración (el modelo anatómico gris con sus músculos en rojo y naranja; el kettlebell, el trineo, el cajón o
  la air bike), con su tamaño y su transparencia, en WebP con pérdida de calidad 90. El paquete la trae sin pérdida (732 KB las
  14): así pesan seis veces menos (unos 120 KB) y no se nota (unos 40 dB sobre los píxeles que se ven; las esquinas
  transparentes, iguales). Son recortes de una composición, no fotos originales: no se agrandan.
- <id>-icono.webp: su icono rojo, sin pérdida, centrado en un lienzo transparente de su ancho y del alto del más alto
  (ICON_H): con una sola altura en el CSS, todos salen a la misma escala, como en la referencia, y cada uno con su ancho.
Comprueba que el tamaño de cada ilustración es el que dicen catalogo.json y data/catalog.js. El paquete no hace falta en el
repositorio (sus tarjetas y referencias, con texto impreso, son solo para comparar).
Requiere Pillow.
"""
import json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'img', 'catalog')
DATA = os.path.join(ROOT, 'src', 'js', 'data', 'catalog.js')
ICON_H = 54        # el alto del lienzo de los iconos: el del más alto (Gemelos)
QUALITY = 90


def catalog():
    """Lo que nombra data/catalog.js: id → (ancho, alto de su ilustración, ancho de su icono) («'Pecho': ['chest', 339, 192, 53]»)."""
    rows = re.findall(r"'[^']+': \['([\w-]+)', (\d+), (\d+), (\d+)", open(DATA, encoding='utf-8').read())
    if not rows:
        sys.exit('no encuentro los grupos en ' + DATA)
    return {k: (int(w), int(h), int(i)) for k, w, h, i in rows}


def main(pack):
    cat = {c['id']: c for c in json.load(open(os.path.join(pack, 'catalogo.json'), encoding='utf-8'))['categories']}
    want = catalog()
    if set(want) != set(cat):
        sys.exit('data/catalog.js y catalogo.json no nombran los mismos grupos: %s' % sorted(set(want) ^ set(cat)))
    os.makedirs(OUT, exist_ok=True)
    size = 0
    for k, (w, h, iw) in want.items():
        art = Image.open(os.path.join(pack, cat[k]['artwork'])).convert('RGBA')
        ref = cat[k]['artworkSize']
        if art.size != (w, h) or art.size != (ref['width'], ref['height']):
            sys.exit('%s: la ilustración mide %s; data/catalog.js dice %s y catalogo.json %s' % (k, art.size, (w, h), ref))
        p = os.path.join(OUT, k + '.webp')
        art.save(p, 'WEBP', quality=QUALITY, alpha_quality=100, method=6)
        size += os.path.getsize(p)
        ico = Image.open(os.path.join(pack, cat[k]['icon'])).convert('RGBA')
        if ico.height > ICON_H or ico.width != iw:
            sys.exit('%s: el icono mide %s; data/catalog.js dice %d de ancho, y no puede pasar de %d de alto' % (k, ico.size, iw, ICON_H))
        canvas = Image.new('RGBA', (ico.width, ICON_H), (0, 0, 0, 0))
        canvas.alpha_composite(ico, (0, (ICON_H - ico.height) // 2))
        p = os.path.join(OUT, k + '-icono.webp')
        canvas.save(p, 'WEBP', lossless=True, exact=True, quality=100, method=6)
        if Image.open(p).convert('RGBA').tobytes() != canvas.tobytes():
            sys.exit('%s: el icono en WebP no es igual que el PNG' % k)
        size += os.path.getsize(p)
    keep = {k + '.webp' for k in want} | {k + '-icono.webp' for k in want}
    for f in sorted(os.listdir(OUT)):
        if f not in keep:
            print('  aviso: src/img/catalog/%s no lo usa la app' % f)
    print('src/img/catalog: %d ilustraciones y %d iconos (%.0f KB)' % (len(want), len(want), size / 1024))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
