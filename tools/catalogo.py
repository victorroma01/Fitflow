"""StrataFit · imágenes de las tarjetas de la librería. Copia a la app las ilustraciones del paquete del rediseño de la
librería que aprobó el propietario (StrataFit_Catalogo: catalogo.json y assets/ilustraciones):

  python3 tools/catalogo.py ruta/a/la/carpeta/del/paquete

Escribe en src/img/catalog, por cada grupo que nombra src/js/data/catalog.js, <id>.webp: su ilustración (el modelo anatómico
gris con sus músculos en rojo y naranja; el kettlebell, el trineo, el cajón o la air bike), con su tamaño y su transparencia,
en WebP con pérdida de calidad 90. El paquete la trae sin pérdida (732 KB las 14): así pesan seis veces menos (unos 120 KB) y
no se nota (unos 40 dB sobre los píxeles que se ven; las esquinas transparentes, iguales). Son recortes de una composición, no
fotos originales: no se agrandan. Los iconos del paquete (assets/iconos) no se copian: la tarjeta ya no lleva icono (lo quitó
el propietario, V1.0.4.1), y lo que quede en src/img/catalog sin nombrar se avisa y se puede borrar.
Retoques que pidió el propietario (RETOUCH), antes de comprimir: en la de CrossFit se quita la marca «ROGUE» del poste del rack.
Comprueba que el tamaño de cada ilustración es el que dicen catalogo.json y data/catalog.js. El paquete no hace falta en el
repositorio (sus tarjetas y referencias, con texto impreso, son solo para comparar).
Requiere Pillow.
"""
import json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'img', 'catalog')
DATA = os.path.join(ROOT, 'src', 'js', 'data', 'catalog.js')
QUALITY = 90


def sin_marca(im):
    """CrossFit: quita «ROGUE», escrito a lo largo del poste izquierdo del rack (columnas 56 a 67, filas 1 a 54). Cada fila se
    cambia por la del mismo poste 55 filas más abajo, que está limpia: los agujeros del poste van cada 11 filas, así que
    quedan también en su sitio y el poste sigue igual hasta arriba. Las dos primeras y las dos últimas filas se funden con
    lo que hay, para que no se note el corte."""
    px = im.load()
    for y in range(1, 55):
        w = min(1, y / 3, (55 - y) / 3)
        for x in range(56, 68):
            a, b = px[x, y], px[x, y + 55]
            px[x, y] = tuple(round(a[i] * (1 - w) + b[i] * w) for i in range(4))
    return im


RETOUCH = {'crossfit': sin_marca}


def catalog():
    """Lo que nombra data/catalog.js: id → (ancho, alto de su ilustración) («'Pecho': ['chest', 339, 192]»)."""
    rows = re.findall(r"'[^']+': \['([\w-]+)', (\d+), (\d+)", open(DATA, encoding='utf-8').read())
    if not rows:
        sys.exit('no encuentro los grupos en ' + DATA)
    return {k: (int(w), int(h)) for k, w, h in rows}


def main(pack):
    cat = {c['id']: c for c in json.load(open(os.path.join(pack, 'catalogo.json'), encoding='utf-8'))['categories']}
    want = catalog()
    if set(want) != set(cat):
        sys.exit('data/catalog.js y catalogo.json no nombran los mismos grupos: %s' % sorted(set(want) ^ set(cat)))
    os.makedirs(OUT, exist_ok=True)
    size = 0
    for k, (w, h) in want.items():
        art = Image.open(os.path.join(pack, cat[k]['artwork'])).convert('RGBA')
        if k in RETOUCH:
            art = RETOUCH[k](art)
        ref = cat[k]['artworkSize']
        if art.size != (w, h) or art.size != (ref['width'], ref['height']):
            sys.exit('%s: la ilustración mide %s; data/catalog.js dice %s y catalogo.json %s' % (k, art.size, (w, h), ref))
        p = os.path.join(OUT, k + '.webp')
        art.save(p, 'WEBP', quality=QUALITY, alpha_quality=100, method=6)
        size += os.path.getsize(p)
    keep = {k + '.webp' for k in want}
    for f in sorted(os.listdir(OUT)):
        if f not in keep:
            print('  aviso: src/img/catalog/%s no lo usa la app' % f)
    print('src/img/catalog: %d ilustraciones (%.0f KB)' % (len(want), size / 1024))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
